# Code Review: Issue #697 (Stage 1)

Scope: stage 1 only (PR 1, Terraform). Stages 2-5 depend on stage 1 being applied and on the pending PlatOps DNS grant, so their absence is intentional.

Changed files (`git diff --name-only`): `infrastructure/env-config.tf`, `infrastructure/main.tf`, `infrastructure/redis.tf`. `docs/tickets/697/` is untracked.

Reviewed against `hmcts/terraform-module-azure-managed-redis` at `main` (`7d4373a5`, 2026-10-09): `inputs-required.tf`, `inputs-optional.tf`, `main.tf`, `outputs.tf`, `vault.tf`, `authentication.tf`, `interpolated-defaults.tf`, `resource-group.tf`, `init.tf`, plus the azurerm `managed_redis` resource docs.

## Summary

The stage 1 change is small and correct. It adds one Azure Managed Redis per environment (`module "managed_redis"`), the private-endpoint subnet lookup it needs, two sizing keys, the shared DNS zone id, and one new secret, `managed-redis-url`. Every input name and type matches the module. Every output it reads (`primary_access_key`, `hostname`, `port`) exists. The legacy `module "redis"` and the four `redis-*` secrets are byte-identical: `git diff origin/master -- infrastructure/redis.tf` has no removed lines.

The only thing between this PR and merge is external. `cath-service-prod` still has no role on `privatelink.redis.azure.net`. I re-checked on 2026-11-17 and `az role assignment list --include-inherited` returned nothing. Without that grant the prod apply leg will fail.

Verification run in the worktree:

| Check | Result |
|---|---|
| `terraform fmt -check -recursive infrastructure` | Pass (exit 0) |
| `terraform -chdir=infrastructure init -backend=false` | Pass. Resolves azurerm 4.81.0, and pulls `hashicorp/vault` 5.13.0 implicitly for the module's `vault.tf` |
| `terraform -chdir=infrastructure validate` | Pass. The only warnings are the existing "Reference to undefined provider" ones from the APIM modules (`apim-testing-support.tf:6` and similar), not this change |
| `infrastructure/.terraform.lock.hcl` | Not tracked by git, deleted after init |
| `terraform plan` / `apply` | Not run, by instruction |

## 🚨 CRITICAL Issues

None.

## ⚠️ HIGH PRIORITY Issues

1. **Merge blocker: the prod DNS-zone grant is still missing** (`infrastructure/env-config.tf:105-112`, used at `infrastructure/redis.tf:112`)
   - **Problem**: the module's private endpoint adds a `private_dns_zone_group` on `privatelink.redis.azure.net` in DTS-CFTPTL-INTSVC. `cath-service-prod` (`2e5a6bb5-…`) has no role on that zone. I re-ran the query on 2026-11-17 and it returned no assignments. Non-prod (`cath-service`) already has the role at resource-group level.
   - **Impact**: a plan can't detect this, so the PR's prod plan will look clean. On merge, the prod leg would create the Managed Redis instance and then fail on the private endpoint's zone-group join. That leaves the endpoint failed or tainted, and `managed-redis-url` is never written in prod. The failed leg fails the infrastructure stage, and `workflow.main.yml:60-66` (`deploy-stage`) then blocks the AAT deploy for that run. The same happens on every later master run that touches `infrastructure/` or `.github/workflows/`, until the grant lands and prod is re-applied.
   - **Fix**: no code change. Do not merge until the DTSPO grant exists and the `az role assignment list … --scope …/privatelink.redis.azure.net` check in `tasks.md` ("Before starting") lists Private DNS Zone Contributor. If the grant has to wait, the documented escape hatch is to drop `"prod"` from `workflow.main.yml:57` for this merge only. That has a cost: the next prod apply then includes the stage 1 resources unreviewed alongside whatever comes next.

## 💡 SUGGESTIONS

1. **The edited comment is still wrong about perftest's subscription** (`infrastructure/main.tf:13-17`, and the existing `infrastructure/env-config.tf:96-101` that it echoes)
   - **Benefit**: accurate comments in the file this PR touches. `core_infra_subscription_id` for perftest is `7a4e3bd5-…`, which is DCD-CNP-QA. perftest has applied into DCD-CNP-QA since #1065 (`stage.infrastructure.yml`), so for perftest the alias resolves to the same subscription as `var.subscription`. Only ithc, which applies into DCD-CNP-DEV with its vnet in DCD-CNP-QA, really needs the override. The new `redis.tf:82-85` comment is accurate. The `main.tf` line this PR rewrote still says the vnet is "in a different subscription for ithc and perftest".
   - **Approach**: reword `main.tf:13-14` to something like "is in a different subscription from var.subscription for ithc; for every other environment, including perftest since #1065, it is the same one". Leave the `env_config` values alone, because they're harmless and removing them is a stage 3 concern.

2. **Pin the module and make the eviction policy explicit** (`infrastructure/redis.tf:95`, `infrastructure/redis.tf:94-129`)
   - **Benefit**: stage 5's mandatory "in-place update only" plan check, and the plan's memory reasoning (`plan.md` section 3: "eviction policy is `VolatileLRU`"), both rely on module behaviour staying the same between now and then. `?ref=main` lets a module change land in all four environments on any infra apply. The module default for `clustering_policy` is already one we override for exactly this kind of reason.
   - **Approach**: pin to `?ref=7d4373a54e370e09bbbbd86d4c82c9b169ec88e4`, following the precedent at `infrastructure/storage.tf:10`. Set `eviction_policy = "VolatileLRU"` explicitly. The neighbouring `cnp-module-redis?ref=master` shows that unpinned is also accepted in this repo, so this is a judgement call, not a defect.

3. **Plan line references have drifted** (`docs/tickets/697/plan.md:224-225`)
   - **Benefit**: the stage 3 implementer will be able to find the code.
   - **Approach**: `env-config.tf:141-153` should be `env-config.tf:74-90`. `env-config.tf:159-166` should be `:102-103`. `main.tf:216-224` should be `main.tf:18-22`. `apps/web/src/app.ts:254-263` is now around `:252`.

## ✅ Positive Feedback

- **Matches the real module.**
  - Every argument exists with the right type: `product`, `component`, `name`, `env`, `location`, `existing_resource_group_name`, `common_tags`, `sku_name`, `high_availability_enabled` (bool), `public_network_access`, `create_private_endpoint`, `subnet_id`, `private_dns_zone_ids` (list), `clustering_policy`, `client_protocol`, `access_keys_authentication_enabled`, and `redis_access_policy_assignments` (`map(map(object({object_id, display_name})))`). The validation blocks accept the chosen values.
  - The outputs used are `primary_access_key` (sensitive), `hostname` and `port`.
- **No new identity is created.** `authentication.tf` sets `create = principal_details.object_id == null`, so with `object_id` given, `azurerm_user_assigned_identity.redis_acl_mi` gets no instance. The assignment goes to `module.key_vault.managed_identity_objectid[0]` (`redis.tf:126`), which is `azurerm_user_assigned_identity.managed_identity[*].principal_id`, the object id of `cath-<env>-mi`. That is the same principal used at `storage.tf:29` and `keyvault-third-party.tf:21`. The inner key `cath` is static, so `for_each` is known at plan time.
- **No module resource group.** `resource-group.tf` uses `count = var.existing_resource_group_name == null ? 1 : 0`, so passing `azurerm_resource_group.shared.name` (`redis.tf:102`) creates no `-rg`. Location comes from `var.location` (`uksouth`).
- **Private endpoint wiring is correct.**
  - `create_private_endpoint = true` gives one `azurerm_private_endpoint` with `subresource_names = ["redisEnterprise"]`.
  - The non-empty `private_dns_zone_ids` produces the `private_dns_zone_group`.
  - The zone `privatelink.redis.azure.net` in `core-infra-intsvc-rg` / `1baf5470-…` is DTS-CFTPTL-INTSVC. It's the same subscription and resource group that `cnp-module-redis` hard-codes for the classic zone, and the same zone used by PCS, ET, civil-citizen-ui and cnp-plum-recipes-service.
  - The module's input description mentions `privatelink.redisenterprise.cache.azure.net`. That is the older Redis Enterprise zone, and every HMCTS consumer uses the one chosen here.
- **The subnet resolves in every environment in the apply list.** `cnp-module-redis` looks up exactly `core-infra-subnet-2-<env>` / `core-infra-vnet-<env>` / `core-infra-<env>` with the default provider, and it already does so successfully in aat, demo and prod, where `redis_subnet_override` is false. I confirmed each of the four subnets exists with `az network vnet subnet show`:
  - aat and demo are in DCD-CNP-DEV `1c4f0704-…`, the same as `var.subscription`.
  - perftest is in DCD-CNP-QA `7a4e3bd5-…`, which `core_infra_subscription_id` points at.
  - prod is in DCD-CNP-Prod `8999dec3-…`, the same as `var.subscription`. Its private endpoint network policies are `Disabled`.

  No environment fails the unguarded lookup. ithc is parked, and the override covers it anyway.
- **The vault provider is fine.** `vault.tf` has `count = var.enable_vault_secret ? 1 : 0`, and that defaults to `false`. `init.tf` declares only azurerm, so Terraform infers `hashicorp/vault` and init installs it, but it is never configured. PCS, ET, civil-citizen-ui and plum consume the module the same way with no `provider "vault"`.
- **Security posture.**
  - `public_network_access = "Disabled"` (`redis.tf:109`) with a private endpoint.
  - TLS via `client_protocol = "Encrypted"` (`:119`) and the `rediss://` scheme (`:135`).
  - The key is `urlencode`d and only ever written to Key Vault. `output.tf` exposes nothing, and the module output is marked `sensitive`.
  - Data Owner goes only to `cath-<env>-mi`.
- **Follows the #1354 secret attributes.** `expiration_date = local.secret_expiry`, `tags = merge(local.common_tags, { source = "Redis" })` and `depends_on = [module.managed_redis]` (`redis.tf:137-140`) match the four neighbouring secrets exactly. `depends_on` on the whole module also means the secret isn't written until the private endpoint exists.
- **Tags will pass policy.** `local.common_tags` carries the terraform-deploy action's mapping (`aat` to `staging`, `prod` to `production`), plus the perftest override to `testing`. All three are in HMCTSTagging's `allowedEnvironmentNames`.
- **Sizing goes through `local.sizing`** (`env-config.tf:74-90`), CaTH's existing mechanism, with no new tfvars. The B3/HA prod choice avoids the awkward Managed Redis scale-down.
- **ForceNew settings are chosen up front and commented.** Per the azurerm docs:
  - `name`, `resource_group_name`, `location` and `high_availability_enabled` force a new instance.
  - `clustering_policy` forces database recreation.
  - `sku_name` downgrades can force recreation.

  Each is fixed at create time and commented where a reader would need it (`env-config.tf:72-73`, `redis.tf:114-117`). EnterpriseCluster is justified by the single-endpoint clients (`apps/web/src/app.ts:252`, `libs/redis/src/redis-client.ts:14`).
- **The comments explain why, not what**, and match the house style of the surrounding Terraform. The `git::https` source matches every other module in the root.

## Test Coverage Assessment

- **Unit tests**: N/A, Terraform-only change. No TypeScript changed.
- **E2E tests**: N/A, Terraform-only change. Nothing user-facing changed. The first E2E checkpoint is stage 2 (plan scenario 3).
- **Accessibility tests**: N/A, Terraform-only change.
- **Statement coverage per changed workspace**: N/A. `git diff --name-only` lists only `infrastructure/*.tf`, so no `apps/*` or `libs/*` workspace changed. `yarn test:coverage` was not run, by instruction.
- **Static checks**: `terraform fmt -check` and `terraform validate` pass. The infrastructure equivalent of tests is plan scenarios 1 and 2, which are post-merge (see Next Steps).
- **GOV.UK Design System, WCAG 2.2 AA, TypeScript types, progressive enhancement**: N/A, Terraform-only change.

## Acceptance Criteria Verification

These are the derived criteria from `plan.md` section 4.

- [x] **1. No Redis client selects a non-zero database.** Both clients call `createClient` with only `url` and `pingInterval` (`apps/web/src/app.ts:252`, `libs/redis/src/redis-client.ts:14`). A grep of `apps`, `libs`, `helm`, `docker-compose.yml` and `.github` finds no `database:` option on a Redis client and no `redis[s]://…/<n>` URL. Put the grep in the PR description, as the plan says.
- [~] **2. Each of aat, demo, perftest and prod has a Terraform-managed Azure Managed Redis**, configured as follows, plus a new `managed-redis-url`, with the existing secrets untouched:
  - private endpoint only
  - TLS
  - EnterpriseCluster
  - keys on
  - "Data Owner" for `cath-<env>-mi`
  - per-environment SKU
  - no persistence

  In code: `infrastructure/redis.tf:94-141` and `infrastructure/env-config.tf:78-79,86-87,112`. Persistence is the module default `null`. `redis.tf:1-76` is unchanged. It is proven only by the plan check and `az redisenterprise database show` after apply, and prod also depends on the DNS grant (HIGH 1).
- [~] **3. Entra ID and key auth both work against the live non-prod instances before any app change.** In code: `access_keys_authentication_enabled = true` and the Data Owner assignment (`infrastructure/redis.tf:123-128`). It is proven only after apply, with `test-connection` or a debug pod in aat, demo and perftest.
- [ ] **4. Every environment runs on Managed Redis with a key, via a revertible mapping switch.** Out of scope for this PR (stage 2).
- [ ] **5. Azure Cache for Redis and its four secrets are removed, and nothing else is destroyed.** Out of scope for this PR (stage 3).
- [ ] **6. web and api authenticate as `cath-<env>-mi` with no secret credential, and survive token refresh.** Out of scope for this PR (stage 4).
- [ ] **7. Access keys are disabled and `managed-redis-url` is gone, in place only.** Out of scope for this PR (stage 5).
- [~] **8. Local development and nightly CI are unchanged.** Stage 1's share is met: the diff touches only `infrastructure/`, with no change to `apps/*/config`, `docker-compose.yml` or `.github/workflows/nightly.yml`. The `redis.managedIdentity` default is stage 4 work, and nightly CI being green is confirmed after merge.
- [x] **9. New Redis secrets follow #625 / PR #1354 (expiry, tags, `depends_on`).** The stage 1 secret does: `infrastructure/redis.tf:137-140`. `managed-redis-entra-url` is stage 4. The plan should show `expiration_date` and `source = "Redis"`.
- [~] **10. Keep-alive still prevents idle disconnects.** Stage 1 doesn't touch it: `pingInterval` is still set at `apps/web/src/app.ts:252` and `libs/redis/src/redis-client.ts:14`. The 25-minute idle check first applies at the stage 2 switch.
- [ ] **11. Sign-in session, pending subscriptions, admin upload summary and email rate limiting work on Managed Redis.** Out of scope for this PR (stages 2, 4 and 5).

Tally: 2 met, 4 partial, 0 unmet in stage 1 scope, 5 out of scope.

## Next Steps

- [ ] Before merge: confirm the DTSPO grant of Private DNS Zone Contributor for `cath-service-prod` on `privatelink.redis.azure.net` with the `az role assignment list --include-inherited --assignee 2e5a6bb5-… --scope …/privatelink.redis.azure.net` check (HIGH 1). It was still empty on 2026-11-17.
- [ ] Optional before merge: correct the `main.tf:13-14` comment (Suggestion 1). Consider pinning the module SHA and setting `eviction_policy` explicitly (Suggestion 2).
- [ ] On the PR (scenario 1): read the aat and prod plans posted to the PR, and the demo and perftest plans in the Actions logs. Each should show exactly these creates per environment, with no changes to `module.redis` or any `redis-*` secret and no destroy or replace:
  - `data.azurerm_subnet.managed_redis_private_endpoint` (read)
  - `module.managed_redis.azurerm_managed_redis.redis`
  - `module.managed_redis.azurerm_private_endpoint.redis_pe[0]`
  - `module.managed_redis.azurerm_managed_redis_access_policy_assignment.redis_access_policy_assignments["data-owner/cath"]`
  - `azurerm_key_vault_secret.managed_redis_url`

  Also confirm there is no `azurerm_user_assigned_identity`, `azurerm_resource_group` or `vault_generic_secret` in the module (AC 2, 9).
- [ ] After apply: check every leg is green. Check `az redisenterprise database show` in non-prod reports EnterpriseCluster, Encrypted, keys enabled, and no persistence. Check the hostname resolves to a private IP from inside the vnet (AC 2).
- [ ] After apply (scenario 2): prove Entra ID and key auth in aat, demo and perftest with `az redisenterprise test-connection --auth entra` / `--auth access-key`, or a debug pod as `cath-<env>-mi`. Run `PING`, `SET`/`GET` and a single-key `EVAL` over TLS on 10000 (AC 3).
- [ ] After merge: confirm nightly CI is green (AC 8 stage 1 share).
- [ ] Only then start stage 2.

## Overall Assessment

**APPROVED**. The verdict covers stage 1's code only, and merging is gated on the external prod DNS grant in HIGH 1. The Terraform is correct against the real module, keeps everything existing unchanged, uses a private endpoint over TLS, keeps the key in Key Vault only, and follows the repo's conventions. The only stage-1 risk is the external grant, and the code can't fix that.
