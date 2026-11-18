# #697: Migrate from Azure Cache for Redis to Azure Managed Redis - Technical Plan

## 1. Technical Approach

### Summary

CaTH runs one Redis per environment, created by `cnp-module-redis` in `infrastructure/redis.tf`. It is Azure Cache for Redis: Basic C0 outside prod and Premium P1 in prod (`local.sizing` in `infrastructure/env-config.tf`). Clients authenticate with an access key that is embedded in the `redis-url` Key Vault secret, and `apps/web/helm/values.yaml`, `apps/api/helm/values.yaml` and the preview template map that secret to `REDIS_URL`.

The plan follows the **HMCTS cutover pattern**: add a **new** Key Vault secret, then switch the mapping to it. It does not rewrite the value of `redis-url`.

- The CNP guide (step 3, `migrating-to-managed-redis.html.md.erb:78`) says: "create the redis connection string as a new Keyvault secret resource … if rollback is needed, you can point back to your preexisting secret".
- The PlatOps skill's anti-patterns reject "reusing the same Key Vault secret name … for the new instance before cutover — breaks rollback".

So every cutover is a change to the secret mapping, and every rollback is reverting that change. The previous secret is always still in place.

None of aat, demo, perftest or prod has real users yet, prod included, so each stage is a single PR applied everywhere. The one exception is the stage 4 aat token-refresh soak, because a refresh bug only shows up after the token lifetime.

| Stage | PR(s) | What changes | Restart | Check that guards against bugs |
|---|---|---|---|---|
| **1. Deploy Managed Redis everywhere** | 1 Terraform | New instance in every environment: keys on, EnterpriseCluster, "Data Owner" for `cath-<env>-mi`. New secret `managed-redis-url` (with the key, urlencoded). Existing `redis-*` secrets untouched | None | Plan shows creates only. Entra ID and key auth proven against the aat, demo and perftest instances |
| **2. Switch to Managed Redis with keys** | 1 cath-service | Key Vault mapping `redis-url` → `managed-redis-url` (`alias: REDIS_URL`) in web, api and preview values | The release | The PR's own preview runs against aat's instance. E2E on aat after release. PROD smoke test after the prod release |
| **3. Remove the old Azure Cache for Redis** | 1 Terraform | Remove cnp-module-redis, its subnet data source, the old sizing keys and the `redis-url`, `redis-host`, `redis-port` and `redis-access-key` secrets | None | Plan destroys only the legacy resources and the four old secrets |
| **4. Switch to managed identity** | Terraform + A, B, C | Terraform: `managed-redis-entra-url` (no key). A: `createRedisClient` takes a `redis.managedIdentity` flag (`REDIS_MI`). B: `REDIS_MI: "true"` for aat only. C: everywhere, mapping to `managed-redis-entra-url` | Per release / Flux | aat soak for 1-2 days past the token's `exp` |
| **5. Turn off keys** | 1 Terraform | `access_keys_authentication_enabled = false`, and delete `managed-redis-url` | None (clients reconnect) | Mandatory: plan shows `~ update in-place`, never `-/+` |

**Deviations from the PlatOps skill, and why they are acceptable:**
- **No staged rollout.** The skill wants "one Flux PR per environment" with an sbox-to-prod soak. CaTH has no users or suppliers on any environment yet.
- **The mapping change is in this repo.** CaTH's Key Vault secret lists live in its own chart values. I re-checked: `cnp-flux-config/apps/cath/` has no `redis` or `keyVaults` entries. The aat and prod HelmReleases only override `environment:` values.

**Checked against the CNP guide's "Fine-grained Migration steps" and "Gotchas" (live page, last reviewed 2026-06-04). Deliberate differences from its module example:**
- **No `for_each` sandbox/aat guard.** The module goes to every environment in stage 1, for the no-users reason above. This also avoids the guide's step 5 warning that removing the guard later shifts state.
- **`source = "git::https://…?ref=main"`, not `git@github.com:…`.** Every other CaTH module uses `git::https`, and the GitHub Actions runners have no SSH key for GitHub.
- **Connection string `rediss://:<key>@host:port`, not the guide's `redis://ignore:<key>@host:port?tls=true`.** node-redis turns on TLS from the `rediss:` scheme and ignores a `?tls=true` query, so the guide's form would connect without TLS and fail. The key is `urlencode`d, which also covers the guide's `%3D` padding gotcha.
- **A new secret, not a changed value on the existing one.** The guide contradicts itself here. Quick start step 3 says to create the connection string as a new Key Vault secret so you can roll back, while fine-grained step 3 says to change only the value of the existing secret. This plan follows quick start and the PlatOps skill's anti-pattern list.
- **No persistence.** The guide's example sets `persistence_rdb_backup_frequency = "6h"`. CaTH has none today and holds only cache and session data, and the skill says to omit persistence for cache-only workloads.
- **The existing resource group (`existing_resource_group_name`), not the module's default of its own resource group.**
- **A new unguarded subnet data source.** The guide reuses `data.azurerm_subnet.redis_private_endpoint`, but CaTH's version is count-guarded for the ithc/perftest override only, so it can't serve every environment.
- **The clustering gotcha doesn't apply.** The guide describes two shards, needing `redis-cli -c` or getting `MOVED` redirects. That's the module's default OSSCluster behaviour. With `clustering_policy = "EnterpriseCluster"` a proxy routes to the right shard, so CaTH's non-cluster clients and `redis-cli` without `-c` work.
- **Other examples worth reading:** the guide's `hmcts/darts-shared-infrastructure#380` and `cnp-plum-recipes-service/infrastructure/main.tf:155-174`, alongside PCS #51.

**Once real users or suppliers are on prod** (suppliers onboarding via APIM, #1161), any stage not yet done in prod needs a staged rollout again: aat first, then a prod window.

No pages, API endpoints or Prisma schema changes are needed.

### Local development and CI are unchanged in every stage

- Local development keeps docker `redis:8-alpine` (`docker-compose.yml:20-33`, host port `6380`) on `redis://localhost:6380`, with no password, no TLS and no auth.
  - The URL comes from `apps/web/config/default.json:6-7`, `apps/api/config/default.json:2-3` and `apps/web/.env.example:25`.
  - `scripts/dev-nodocker.sh` and `libs/auth/docker-compose.yml:19-27` work the same way.
- Nightly CI uses a `redis:8-alpine` service on `redis://localhost:6379` (`.github/workflows/nightly.yml:36-59`).
- `redis.managedIdentity` defaults to `false` in `apps/{web,api}/config/default.json`, and `REDIS_MI` is unset in all of these, so the stage 4 client keeps today's behaviour. No Azure login and no new environment variables are needed.

### Sources

- **CNP guide.** Workspace copy: `platops/hmcts.github.io/source/cloud-native-platform/guides/caching/migrating-to-managed-redis.html.md.erb`. I also fetched the live page (`/guides/caching/migrating-to-managed-redis.html`, last reviewed 4 June 2026).
  - Line 78: use a new Key Vault secret so rollback can point back at the existing one.
  - Lines 94 and 137-142: Entra ID / RBAC is the module default and keys are opt-in.
  - Lines 125 and 174: Premium P1 maps to "start with `Balanced_B3`".
  - Lines 284-285: two shards, and a connection to a single shard gets `MOVED`.
  - Lines 287-288: database 0 only.
- **PlatOps skill** `hmcts/platops-agent-skills/.github/skills/azure-managed-redis-migration` (SKILL.md v1.0.0, 2026-06-02; `references/sku-mapping.md`; `references/flux-example.md`).
  - Side-by-side instance, new secret name, mapping switch, rollback by revert.
  - Wire the SKU per environment, reusing the team's existing style.
  - Default to `Balanced`: `Balanced_B0` for dev and sbox. The table maps `Premium P1` (6 GB) to `Balanced_B1` and `Premium P2` to `Balanced_B3`.
  - Size against `az monitor metrics list --metric usedmemory,...` (step 2).
  - Omit persistence for cache-only workloads.
  - Reserve `OSSCluster` for clustered Premium P5 (4 or more shards).
  - It suggests moving to Entra ID "in a follow-up".
- **Module source** (`hmcts/terraform-module-azure-managed-redis`, `main`, no tags).
  - `inputs-optional.tf` defaults: `access_keys_authentication_enabled = false`, `clustering_policy = "OSSCluster"`, `eviction_policy = "VolatileLRU"`, `high_availability_enabled = true`.
  - `inputs-optional.tf:186`: `redis_access_policy_assignments` supports "Data Owner" only, and `{ object_id = ... }` assigns an existing principal.
  - `outputs.tf`: `hostname`, `port`, and `primary_access_key` (null once keys are off).
- **Microsoft, `learn.microsoft.com/en-us/azure/redis/entra-for-authentication`** (fetched).
  - Entra ID works over TLS only.
  - Clients must refresh the token and re-AUTH before it expires.
  - Disabling access keys "terminates all existing client connections, regardless of whether they use access keys or Microsoft Entra ID authentication".
- **azurerm `azurerm_managed_redis`.** `access_keys_authentication_enabled` is not listed as ForceNew, but the docs warn that "most properties" may replace the cluster. Stage 5 therefore has a mandatory plan check.
- **`@redis/entraid` 5.12.1.** Its peer dependency is `@redis/client ^5.12.1`, which matches `redis` 5.12.1. The 6.x releases need `@redis/client` 6.
  - Use `EntraIdCredentialsProviderFactory.createForDefaultAzureCredential({ credential, scopes: REDIS_SCOPE_DEFAULT, tokenManagerConfig, onReAuthenticationError })`, with `REDIS_SCOPE_DEFAULT = "https://redis.azure.com/.default"`.
  - It sends the token's `oid` as the AUTH username, refreshes early, and re-AUTHs every connection.
  - Its limits are no re-AUTH on RESP2 pub/sub, and unsafe hand-built `MULTI`/`EXEC`. CaTH uses neither.
- **chart-library** `library/templates/v2/_secretproviderclass.tpl:34`. A Key Vault secret `name` only gets `<ENV>` substitution, not `tpl`, so a mapping cannot vary by environment inside one values file.
- **`az redisenterprise test-connection`** (redisenterprise extension). It takes `--auth access-key|entra` and `--host`.

### Prior art in HMCTS

- **Workspace clones.** 15 clones already use `terraform-module-azure-managed-redis`. All of them set `access_keys_authentication_enabled = true`, none uses `redis_access_policy_assignments`, and most use `EnterpriseCluster`. Examples:
  - `apps/xui/rpx-xui-webapp/infrastructure/main.tf:59,62`
  - `apps/sptribs/sptribs-frontend/infrastructure/main.tf:61-62`
  - `apps/et/et-shared-infrastructure/managed-redis.tf:25,31`
  - `apps/civil/civil-citizen-ui/infrastructure/redis.tf:38,47`
  - `apps/xui/rpx-xui-icp-api/infrastructure/main.tf:165-190`
- **Pattern for stages 1 and 2: `hmcts/pcs-shared-infrastructure#51`** (merged 2026-11-05). It runs side by side with EnterpriseCluster, keys on, and a new `azure-managed-redis-connection-string` secret (`rediss://:${urlencode(key)}@host:port`). The mapping switch was `cnp-flux-config#48856`. The skill's own Flux example is `cnp-flux-config#45044`.
- **Warning: `hmcts/sscs-submit-your-appeal#2260`** ("managed redis with cluster on demo") was reverted the next day by #2261.
- **No Entra ID precedent.** No workspace repo uses Entra ID against Managed Redis, and neither the HMCTS guide nor the skill gives client-side Entra guidance. They only say it can follow after cutover. **Stage 4 is CaTH's own design.**

### Key decisions

1. **Cutover is a new secret plus a mapping switch.** It follows the CNP guide and the skill, as described above. `redis-url` and the other `redis-*` secrets stay untouched until stage 3, so stage 2 can be rolled back by reverting one PR.
2. **Clustering: `EnterpriseCluster`.** The HMCTS docs do not decide this. The precedent is PCS #51 and most of the 15 clones, and the skill reserves `OSSCluster` for large clustered Premium P5 caches.
   - Both CaTH clients use a single-endpoint `createClient` (`libs/redis/src/redis-client.ts:14`, `apps/web/src/app.ts:259`), so `OSSCluster` would return `MOVED` for about half the keys.
   - EnterpriseCluster only needs multi-key commands to stay in one slot, and CaTH sends none:
     - `libs/redis/src/token-bucket.ts:6-45` is one `EVAL` on `KEYS[1]`.
     - The `connect-redis` 9 store (`libs/web-core/src/middleware/session-stores/redis-store.ts:6-12`) only uses single-key commands, and nothing calls `store.all/clear/length/ids`.
     - `pending-subscriptions-store.ts` and `manual-upload/storage.ts` use single-key commands.
     - There is no `MULTI`, pub/sub, `MGET`/`MSET`, `KEYS` or `SCAN`.
   - `createCluster` was rejected. It would mean rewriting both clients, and `connect-redis` takes a single client. The policy is set once, because changing it recreates the database.
3. **Sizing, per environment, via `local.sizing` in `env-config.tf`.** The skill mandates per-environment wiring "reusing the team's existing style", and this is CaTH's existing mechanism. No tfvars are introduced.
   - **Decided 2026-11-17: match the current environment set-up.** Today every environment (`cath-aat`, `cath-demo`, `cath-perftest`, `cath-ithc`) is Basic C0 with no replica, and `cath-prod` is Premium P1 with 1 replica and no zones. That's `default_sizing` and `sizing_overrides.prod` in `env-config.tf:65-76`.
   - **Non-prod: `Balanced_B0` (0.5 GB), `high_availability_enabled = false`.** It replaces Basic C0 (250 MB, no replica) like for like. Microsoft says to "only disable high availability for dev/test scenarios".
   - **Prod: `Balanced_B3` (3 GB), HA on (the module default).** This is the CNP guide's own mapping for P1 ("start with `Balanced_B3`", line 174). HA keeps Premium's replica. In zone-enabled regions, Managed Redis also spreads HA nodes across zones by default, which today's `cath-prod` doesn't do.
     - It's about 30 times the measured prod peak (Clarification 3), so there's room for upload drafts of up to 10 MB each and future suppliers.
     - `Balanced_B5` (6 GB) would be the exact memory match, but wasn't chosen. Microsoft limits scaling down, so starting on B3 is easier to grow from than reducing from B5.
     - The PlatOps skill's table (P1 → B1) conflicts with the guide, and its "B0 6 GB" note is wrong. Microsoft gives the Balanced sizes as B0 0.5 GB, B1 1 GB, B3 3 GB and B5 6 GB (learn.microsoft.com/en-us/azure/redis/overview).
   - **Persistence: omitted in every environment.** Prod has none today, and the skill says to omit it for cache-only workloads.
4. **Identity: reuse `cath-<env>-mi`.**
   - `cath-web` and `cath-api` run as `aadIdentityName: cath` (`apps/web/helm/values.yaml:8`, `apps/api/helm/values.yaml:4`).
   - The Flux service accounts carry its client id (`cnp-flux-config/apps/cath/serviceaccount/{aat,demo,perftest,prod}.yaml`), and previews reuse `serviceaccount/aat.yaml`.
   - In Terraform it is `module.key_vault.managed_identity_objectid[0]` (`infrastructure/keyvault.tf:17`). It is the same principal as the blob role and the third-party vault policy (`storage.tf:29`, `keyvault-third-party.tf:21`).
   - The stage 4 credential is `new DefaultAzureCredential({ managedIdentityClientId: process.env.MANAGED_IDENTITY_CLIENT_ID })`, as in `libs/azure-blob/src/blob-client.ts:29-31`.
5. **`REDIS_MI` is an explicit boolean, set through CaTH's existing config pattern.**
   - `apps/web/config/custom-environment-variables.json` and `apps/api/config/custom-environment-variables.json` already map `redis.url` to `REDIS_URL`. Both gain `"managedIdentity": { "__name": "REDIS_MI", "__format": "boolean" }` under `redis`, and both `config/default.json` files gain `"managedIdentity": false` under `redis`, so local and CI need no setting. `config` is 4.4.2 in both apps, and it supports `__format` (`node_modules/config/lib/util.js:1329-1334`).
   - `REDIS_MI` is a plain Helm `environment:` value, quoted as `REDIS_MI: "true"` because environment values are strings and `__format: boolean` parses them. It is not a Key Vault secret.
   - `true`: the client attaches the `@redis/entraid` provider, requires `rediss:` (Entra ID needs TLS), and **ignores any username or password in the URL**. That is what lets PR B switch aat alone (decision 6).
   - `false` or unset: exactly today's behaviour, using the key in the URL.
6. **Stage 4 per-environment switch.**
   - Secret mappings cannot vary per environment in one values file (chart-library `_secretproviderclass.tpl:34`). A Flux override would have to restate the whole `keyVaults` array, because Helm replaces arrays.
   - So **PR B is a one-line Flux override for aat only**: `REDIS_MI: "true"` under `environment:` in `cnp-flux-config/apps/cath/cath-web/aat.yaml` and `cath-api/aat.yaml`. Both files already override `environment:`, and environment values are a map, so they merge.
   - The aat pods keep mounting `managed-redis-url`, and the client ignores its key and authenticates with the managed identity.
   - **PR C** is the cath-service chart change. It moves web, api and preview to `managed-redis-entra-url`, adds `REDIS_MI: "true"` for every environment, and removes the aat Flux override.
   - This departs from the coordinator's "PR B switches the aat mapping" in mechanism only. It is still aat alone, and the rollback is still a revert. See Clarification 2.
7. **One client factory.** `apps/web/src/app.ts:254-263` duplicates `libs/redis/src/redis-client.ts`. Both move to `createRedisClient(url)` in `@hmcts/redis`, which owns `pingInterval`, the error listener and the optional provider. `@hmcts/redis` is CaTH's own package, and the change is approved.
8. **Keep-alive (PR #1402) is kept.** `pingInterval: 300_000` stays. Only the comments that name "Azure Cache for Redis" are reworded.
9. **Key Vault hygiene (PR #1354) carries over.** `managed-redis-url` and `managed-redis-entra-url` get `expiration_date = local.secret_expiry`, `tags = merge(local.common_tags, { source = "Redis" })` and `depends_on = [module.managed_redis]`, the same as the four existing secrets. Those four are untouched until stage 3 deletes them (Q3: nothing outside the repo reads `redis-access-key`).
10. **Restarts come from releases.** Q4: the next release restarts the pods, or a manual Flux deploy for testing. The apps read Key Vault once at startup (`getPropertiesVolumeSecrets`), so a mapping change takes effect when the release that carries it rolls out.

### Stage 1: deploy Managed Redis everywhere (one Terraform PR)

- **What the PR adds.** `module "managed_redis"`, with no count, so it applies to aat, demo, perftest and prod:
  - `access_keys_authentication_enabled = true`
  - `clustering_policy = "EnterpriseCluster"`
  - `redis_access_policy_assignments = { "Data Owner" = { cath = { object_id = module.key_vault.managed_identity_objectid[0] } } }`
  - SKU and HA from `local.sizing`
  - a private endpoint, with public access disabled

  It also adds the secret `managed-redis-url` = `rediss://:${urlencode(module.managed_redis.primary_access_key)}@${module.managed_redis.hostname}:${module.managed_redis.port}`.
- **Plan check.** In every environment the plan shows only creates: the instance, the private endpoint, the access-policy assignment and `managed-redis-url`. It must show **no change to `module.redis` or to any existing `redis-*` secret**, and nothing destroyed.
- **Prod-only failure risk.** Prod applies as a different principal (`cath-service-prod`, `AZURE_CREDENTIALS_CFT_PROD`). Two things could fail in prod alone, and only at apply time: the DNS zone join (`privatelink.redis.azure.net`, subscription `1baf5470-…`) and the access-policy creation.
  - The legs run in parallel with fail-fast off (`workflow.main.yml:47-52`), so aat, demo and perftest still apply.
  - A failed prod leg still fails the infrastructure stage, which blocks the AAT app deploy on later master runs until it is fixed.
  - The DNS join is a confirmed gap, not just a risk: `cath-service-prod` has no grant on `privatelink.redis.azure.net`. The DTSPO grant is a prerequisite for merging stage 1 (Clarification 1).
- **Prove both auth methods without the app, in aat, demo and perftest.** Use either of these:
  - `az redisenterprise test-connection --auth entra` and `--auth access-key`, run from inside the network. Public access is disabled. Entra ID tests the caller's own token, so the caller needs "Data Owner".
  - A debug pod under the `cath` service account, running as `cath-<env>-mi`. Get a token for `https://redis.azure.com/.default` through workload identity, then run `redis-cli --tls -p 10000 --user <mi object id> --pass <token>` with `PING`, `SET`/`GET` and a single-key `EVAL`.
- **Prod.** There is no prod access, so there is no debug pod or `test-connection` there. Prod is verified by the PROD smoke test and app health after each release. The real Entra ID proof is the stage 4 aat soak.
- **Rollback.** Revert the PR. Only the new resources are destroyed.

### Stage 2: switch to Managed Redis with keys (one cath-service PR)

- **What the PR changes.** In `apps/web/helm/values.yaml:62-63`, `apps/api/helm/values.yaml:19-20` and `helm/cath-service/values.preview.template.yaml:82-83`, `- name: redis-url` becomes `- name: managed-redis-url`, keeping `alias: REDIS_URL`. `apps/web/helm/values.yaml.test.ts` still passes, because web and preview change together.
- **Before merge.** The PR's own preview mounts `managed-redis-url` from `cath-aat`, so it already runs against aat's Managed Redis.
- **Restart.** The release does it. aat moves on merge, through the CI deploy and Flux. Prod moves at the next promoted release, or a manual Flux deploy for testing.
- **Checks.** E2E on aat after the release. App Insights shows the `*.redis.azure.net:10000` dependency and no `MOVED`/`CROSSSLOT`. The PROD smoke test passes after the prod release.
- **Data.** Whatever is in the old instance stays behind. There are no users, so nothing needs keeping.
- **Rollback.** Revert the PR. The old `redis-url` secret and instance are still there.

### Stage 3: remove the old Azure Cache for Redis (one Terraform PR)

- **Before you start.** The stage 2 release must be running in every environment (`/health` `X-Git-Sha`). Any running release that still maps `redis-url` would fail to mount its secrets once the secret is deleted. Open PRs must be rebased too, because their previews mount from `cath-aat`.
- **What the PR removes.**
  - `module "redis"` (cnp-module-redis) and `data.azurerm_subnet.redis_private_endpoint`
  - `redis_subnet_override`, if nothing else uses it
  - the `redis_sku_name`/`redis_family`/`redis_capacity` sizing keys
  - `azurerm_key_vault_secret.redis_url`, `redis_host`, `redis_port` and `redis_access_key`
- **Plan check.** It destroys only the legacy cache, its private endpoint, resource group `cath-cache-<env>` and those four secrets. Nothing on `module.managed_redis` changes.
- **Rollback.** From here there is no way back to the old instance. Stages 4 and 5 roll back within Managed Redis.

### Stage 4: switch to managed identity (our own design)

- **Terraform (its own PR, or folded into PR A's timeframe).** Add `managed-redis-entra-url` = `rediss://${module.managed_redis.hostname}:${module.managed_redis.port}`, with the same expiry and tags.
- **PR A: client change, released everywhere.**
  - `createRedisClient(url)` in `@hmcts/redis`, used by `getRedisClient()` and the `apps/web/src/app.ts` session client.
  - Pinned `@redis/entraid` 5.12.1 and `@azure/identity` 4.10.0.
  - It does nothing until `REDIS_MI` is `"true"`.
  - Before PR B, confirm it is running everywhere (`/health` `X-Git-Sha`).
- **PR B: aat only (`cnp-flux-config`).** Add `REDIS_MI: "true"` to `apps/cath/cath-web/aat.yaml` and `apps/cath/cath-api/aat.yaml`.
  - Flux redeploys aat. The client drops the key from `managed-redis-url` and authenticates as `cath-aat-mi`.
  - Soak for 1-2 days past the token's `exp` claim. This is the one staged step, because a refresh bug only shows after the token lifetime.
  - Rollback: revert the Flux PR.
- **PR C: every environment (cath-service).**
  - Change the mapping in web, api and preview values to `managed-redis-entra-url` (still `alias: REDIS_URL`).
  - Add `REDIS_MI: "true"` under `nodejs.environment` in `apps/web/helm/values.yaml` and `apps/api/helm/values.yaml`, and under `cath-web` and `cath-api` in the preview template.
  - Remove the aat Flux override.
  - The release restarts each environment. Rollback: revert the PR.

### Stage 5: turn off keys (one Terraform PR)

- **Before you start.** PR C must be running in every environment, and open PRs must be rebased, because nothing may still mount `managed-redis-url`.
- **What the PR changes.** Set `access_keys_authentication_enabled = false` and delete `azurerm_key_vault_secret.managed_redis_url`.
- **Reconnect blip.** Microsoft's documentation says this drops every connection, Entra ID included. node-redis reconnects and re-AUTHs by itself, so no restart is needed.
- **Mandatory plan check, every environment including prod.** `module.managed_redis.azurerm_managed_redis.redis` must show `~ update in-place`, changing only `default_database.access_keys_authentication_enabled` from true to false, plus the `managed-redis-url` destroy.
  - **Never apply on `-/+` or `must be replaced`.** A replace loses all data and the hostname. Escalate to PlatOps instead.
- **Rollback.** Revert the PR. Keys come back on, with the same blip.

### Environments and scope

- **ithc** is parked (#1067) and not in master's apply list. It gets the end state on its first apply.
- **A broken prod apply in any stage.** The escape hatch is to revert `"prod"` out of the apply list (`workflow.main.yml:47-52`).
- **Out of scope:** managed identity for Azure Blob Storage in deployed environments. This is tracked in **hmcts/cath-service#1510**.

## 2. Implementation Details

TEMPLATE SOURCE: n/a

No pages, API endpoints or Prisma schema changes are needed.

### Redis usages found (audit)

| Where | What | Stage affected |
|---|---|---|
| `infrastructure/redis.tf:5-12` | `data.azurerm_subnet.redis_private_endpoint` (ithc/perftest override only) | 3 (removed). The new module needs `subnet_id` everywhere |
| `infrastructure/redis.tf:14-36` | `module "redis"` (cnp-module-redis, `redis_version = "6"`) | 3 (removed) |
| `infrastructure/redis.tf:38-76` | Secrets `redis-host`, `redis-port`, `redis-access-key`, `redis-url` (`:70` = `rediss://:${access_key}@${host_name}:${redis_port}`, not urlencoded) | Untouched until 3 (deleted) |
| `infrastructure/env-config.tf:74-90` | `default_sizing` / `sizing_overrides` (C0, prod P1) | 1 (Managed Redis keys), 3 (old keys removed) |
| `infrastructure/env-config.tf:102-103`, `main.tf:22-26` | `core_infra_subscription_id`, `azurerm.core_infra` provider | 1 (reused for the new subnet lookup) |
| `infrastructure/keyvault.tf:17` | `create_managed_identity = true` → `cath-<env>-mi` | 1 ("Data Owner" principal) |
| `apps/web/src/app.ts:71,78-79,115-117,247-257` | Session client `createClient({ url: process.env.REDIS_URL ?? config.get("redis.url"), pingInterval })`, awaited at startup, shared via `app.locals.redisClient` | 4 (`createRedisClient`) |
| `libs/redis/src/redis-client.ts:4-5,14` | `getRedisClient()` singleton, connected lazily (api, admin uploads, rate limit) | 4 |
| `libs/redis/src/token-bucket.ts:6-45` | Single-key `EVAL` | None (safe under EnterpriseCluster) |
| `libs/email-rate-limit/src/email-rate-limit.ts:15` (via `libs/govuk-notify/src/notify-client.ts:30,38`) | Token bucket per email address | None |
| `libs/web-core/src/middleware/session-stores/redis-store.ts:6-12` | `connect-redis` 9, prefix `sess:` | None |
| `libs/subscriptions/src/pending-subscriptions-store.ts:20-61` | `SET EX`/`GET`/`DEL` | None |
| `libs/admin-pages/src/manual-upload/storage.ts:21-49` | `SETEX`/`GET` of the base64 file | None (large values count towards memory) |
| `apps/web/helm/values.yaml:62-63`, `apps/api/helm/values.yaml:19-20` | KV `redis-url` → `REDIS_URL` | 2 (`managed-redis-url`), 4 (`managed-redis-entra-url`, `REDIS_MI`) |
| `helm/cath-service/values.preview.template.yaml:38,82-83,205-217` | Bitnami subchart and `REDIS_URL` env, but KV `redis-url` (cath-aat) wins. Only web restates `keyVaults`; preview api inherits `apps/api/helm/values.yaml` | 2 and 4, kept in parity by `values.yaml.test.ts` |
| `cnp-flux-config/apps/cath/cath-{web,api}/aat.yaml` | Only `environment:` overrides; no Redis or `keyVaults` | 4 PR B (temporary `REDIS_MI`) |
| `apps/{web,api}/config/default.json`, `custom-environment-variables.json`, `apps/web/.env.example:25`, `docker-compose.yml:20-33`, `libs/auth/docker-compose.yml:19-27`, `scripts/dev-nodocker.sh`, `.github/workflows/nightly.yml:36-59` | Plain `redis://localhost`, no auth, no `REDIS_MI` | 4 PR A (`redis.managedIdentity` mapping and `false` default only) |
| `apps/crons/helm/values.yaml` | No Redis | None |

No URL has a `/<n>` path and no client sets a `database` option, so nothing selects a non-zero database. Port 10000 comes from the module's `port` output, and TLS from `rediss:`.

### Stage 1: Terraform

- **`infrastructure/env-config.tf`.** Add `managed_redis_sku_name` and `managed_redis_high_availability` to `default_sizing` (`"Balanced_B0"`, `false`) and to `sizing_overrides.prod` (`"Balanced_B3"`, `true`). Add a `managed_redis_private_dns_zone_id` local.
  - The zone ID is `/subscriptions/1baf5470-1c3e-40d3-a6f7-74bfbce4b348/resourceGroups/core-infra-intsvc-rg/providers/Microsoft.Network/privateDnsZones/privatelink.redis.azure.net`.
  - That zone is linked to `core-infra-vnet-{aat,demo,perftest,prod,ithc}-internal` (`platops/azure-private-dns/environments/privatelink/azure-managed-redis.yml`).
- **`infrastructure/redis.tf`.** Leave `module "redis"`, its data source and the four `redis-*` secrets untouched. Then add:
  - `data "azurerm_subnet" "managed_redis_private_endpoint"`: no count, `provider = azurerm.core_infra`, `core-infra-subnet-2-${var.env}`.
  - `module "managed_redis"`:
    - `source = "git::https://github.com/hmcts/terraform-module-azure-managed-redis?ref=main"`
    - `product`, `component`, `env`, `location`, `common_tags = local.common_tags`
    - `name = "${var.product}-managed-redis-${var.env}"`, `existing_resource_group_name = azurerm_resource_group.shared.name`
    - `sku_name = local.sizing.managed_redis_sku_name`, `high_availability_enabled = local.sizing.managed_redis_high_availability`
    - `public_network_access = "Disabled"`, `create_private_endpoint = true`, `subnet_id`, `private_dns_zone_ids`
    - `clustering_policy = "EnterpriseCluster"`, `client_protocol = "Encrypted"`, `access_keys_authentication_enabled = true`
    - `redis_access_policy_assignments` as above
  - `azurerm_key_vault_secret.managed_redis_url` (`managed-redis-url`), with the URL-encoded key, expiry, tags and `depends_on = [module.managed_redis]`.

### Stage 2: chart values (cath-service)

- `apps/web/helm/values.yaml`, `apps/api/helm/values.yaml` and `helm/cath-service/values.preview.template.yaml`: change `redis-url` to `managed-redis-url`, keeping `alias: REDIS_URL`.

### Stage 3: Terraform

- Make the removals listed in section 1.

### Stage 4: Terraform, application, Flux, chart values

**Terraform**
- Add `azurerm_key_vault_secret.managed_redis_entra_url` (`managed-redis-entra-url`) = `rediss://${hostname}:${port}`, with the same expiry, tags and `depends_on`.

**PR A (application)**
- **`libs/redis/package.json`.** Add pinned `dependencies` `"@redis/entraid": "5.12.1"` and `"@azure/identity": "4.10.0"`.
- **`libs/redis/src/redis-client.ts`.**
  - Keep `REDIS_PING_INTERVAL_MS = 300_000`, rewording its comment (#1033).
  - Add `export function createRedisClient(url: string, managedIdentity: boolean): RedisClientType`. The flag is passed in rather than read inside, for the session-client reason below.
    - When `managedIdentity` is `true`, it requires `new URL(url).protocol === "rediss:"` and otherwise throws a clear error naming `REDIS_MI` and the scheme. It removes `username` and `password` from the URL and returns `createClient({ url: credentiallessUrl, pingInterval, credentialsProvider: getEntraIdProvider() })`.
    - When it is `false`, it returns `createClient({ url, pingInterval })`, which is today's behaviour.
    - In both cases it attaches the `error` listener.
  - `getEntraIdProvider()` is module-private. It is created lazily, once per process, by calling `EntraIdCredentialsProviderFactory.createForDefaultAzureCredential` with:
    - `credential: new DefaultAzureCredential({ managedIdentityClientId: process.env.MANAGED_IDENTITY_CLIENT_ID })`
    - `scopes: REDIS_SCOPE_DEFAULT`
    - `tokenManagerConfig: { expirationRefreshRatio: 0.8 }`
    - `onReAuthenticationError`, which logs the message and never the token
  - `getRedisClient()` uses `createRedisClient(config.get("redis.url"), config.get<boolean>("redis.managedIdentity"))`.
  - Export `createRedisClient` from `libs/redis/src/index.ts`.
- **`apps/web/src/app.ts`.** Replace the local `getRedisClient`, the `redis` import and `REDIS_PING_INTERVAL_MS` (`:71,78-79,254-263`) with `createRedisClient(process.env.REDIS_URL ?? config.get("redis.url"), config.get<boolean>("redis.managedIdentity"))`, followed by `await client.connect()`. Add `"@hmcts/redis": "workspace:*"` to `apps/web/package.json`.
  - **The session client cannot rely on `@hmcts/redis` reading `config` itself.** `app.ts` loads `config` with a dynamic import after `getPropertiesVolumeSecrets()` (`:83-84`). Its comment at `:86-88` explains why: a static import of a module that loads `config` caches it before the Key Vault values are set. `libs/redis/src/redis-client.ts` imports `config` at the top, so `app.ts` must import `@hmcts/redis` dynamically after `getPropertiesVolumeSecrets()`, as it already does for `@hmcts/auth` (`:89`), and pass the flag from its own `config` instance. While implementing, check that no static import in `app.ts` already pulls in `@hmcts/redis`.
- **`apps/{web,api}/config/custom-environment-variables.json`.** Under `redis`, add `"managedIdentity": { "__name": "REDIS_MI", "__format": "boolean" }` next to `"url": "REDIS_URL"`.
- **`apps/{web,api}/config/default.json`.** Under `redis`, add `"managedIdentity": false`.
- **Tests.**
  - `libs/redis/src/index.test.ts`: AAA tests, with `redis`, `@redis/entraid` and `@azure/identity` mocked.
    - `managedIdentity: false`: keyed `rediss://` and `redis://localhost:6380` URLs are passed through unchanged, with `pingInterval` and no provider.
    - `managedIdentity: true`: `rediss://:key@host:10000` becomes `rediss://host:10000`, with the provider built using `REDIS_SCOPE_DEFAULT` and `MANAGED_IDENTITY_CLIENT_ID` and created once across two clients.
    - `managedIdentity: true` with a `redis://` URL fails fast with an error naming `REDIS_MI` and the scheme, and creates no client.
    - `getRedisClient()`, with `config.get` mocked, passes `redis.managedIdentity` through for `true`, `false` and the default (`false`, as when `REDIS_MI` is unset).
    - The `config` mapping itself: with `REDIS_MI` set to `"true"`, `"false"` and unset, `config.get("redis.managedIdentity")` returns `true`, `false` and `false` (default) against the real `custom-environment-variables.json` and `default.json`.
    - The existing `pingInterval: 300_000` assertions are kept.
  - `apps/web/src/app.test.ts`: mock `createRedisClient`, and assert it is called with `REDIS_URL` and the `redis.managedIdentity` value, and connected before the session middleware.
- **Docs.** In the Redis section of `docs/ARCHITECTURE.md` (line 175), describe Azure Managed Redis, EnterpriseCluster, DB 0, `REDIS_MI=true` through `cath-<env>-mi`, TLS on 10000, and local `redis://localhost:6380` with no auth.

**PR B (`cnp-flux-config`).** Add `REDIS_MI: "true"` under `spec.values.nodejs.environment` in `apps/cath/cath-web/aat.yaml` and `apps/cath/cath-api/aat.yaml`.

**PR C (cath-service).**
- Map `managed-redis-entra-url` to `REDIS_URL` in the three values files.
- Add `REDIS_MI: "true"` to `nodejs.environment` in web and api, and to `cath-web.nodejs.environment` and `cath-api.nodejs.environment` in the preview template.
- Then a follow-up `cnp-flux-config` PR removes the aat override.

### Stage 5: Terraform

- Set `access_keys_authentication_enabled = false` and remove `azurerm_key_vault_secret.managed_redis_url`.

No stage changes `state.tf` (azurerm `~> 4.57` satisfies `>= 4.0.0`, and the module's `vault.tf` is `count = 0`), workflows or identities.

## 3. Error Handling & Edge Cases

- **Prod-only failure in stage 1.** The DNS join or the access-policy creation fails for `cath-service-prod`. The other environments still apply, but the red prod leg blocks the AAT app deploy until it is fixed (Clarification 1).
- **Wrong clustering policy.** OSSCluster gives `MOVED` for about half the keys, as in the SSCS revert. The stage 2 preview and aat E2E would catch it. Fixing it recreates the database, so it is settled in stage 1.
- **Key with reserved URL characters.** `urlencode` in Terraform, and node-redis decodes the URL password.
- **Secret missing at mount time.** If a release maps a secret that does not exist, its pods fail to start while the old ReplicaSet keeps serving. That is why stage 2 follows stage 1's apply, and stages 3 and 5 only delete a secret once no running release or open preview mounts it.
- **The Entra ID check fails in a non-prod environment after stage 1.** The likely cause is a missing or unpropagated assignment (`WRONGPASS`/`NOPERM`), or testing as the wrong identity. Do not start stage 4 until aat, demo and perftest pass. Prod relies on smoke and health checks, because there is no prod access.
- **Token acquisition fails (stage 4).** Possible causes are workload identity not being injected, the wrong client id, or an Entra outage.
  - web: `connect()` rejects and the rollout stalls, with old pods still serving.
  - api: the first email fails.
  - Log only the error message. Never log tokens or URLs that contain credentials.
- **A token refresh fails mid-life (stage 4).** The provider retries and calls `onReAuthenticationError`. If the token then expires, the proxy drops the connection and node-redis reconnects with a fresh token. Only the aat soak past `exp` shows this.
- **`REDIS_MI=true` with a non-TLS URL.** The client fails fast at startup with a clear message, because Entra ID needs TLS.
- **`REDIS_MI` set to something other than `true`/`false`.** `__format: boolean` decides how it parses. The unit test pins `"true"`, `"false"` and unset, and the chart and Flux always use the quoted `"true"`.
- **`REDIS_MI=true` set before PR A is running.** The old image ignores it and keeps using the key, so it fails safe. The check is `/health` `X-Git-Sha` before PR B.
- **Disabling keys plans as a replace (stage 5).** Only `~ update in-place` is acceptable. If it shows `-/+`, stop and escalate.
- **Transactions and pub/sub during re-AUTH.** Neither is used. Do not add raw `MULTI`/`EXEC` through `sendCommand`.
- **Memory pressure.** The eviction policy is `VolatileLRU`, and every CaTH key has a TTL. Prod on B3 is 3 GB, about 30 times the measured peak (Clarification 3). Re-check `usedmemory` once suppliers onboard (#1161).
- **Idle disconnects.** The ping stays (PR #1402). Check `SocketClosedUnexpectedlyError` after each switch.
- **Once prod has real users or suppliers** (#1161), any stage not yet done in prod needs aat first and then a prod window. The stage 2 release would then sign users out and lose pending subscriptions and upload drafts.

## 4. Acceptance Criteria Mapping

The ticket has no formal acceptance criteria. I derived these from the ticket, the CNP guide, the PlatOps skill, Microsoft's Entra ID guidance and the agreed stages.

| # | Derived AC | Stage | How it is satisfied | How it is verified |
|---|---|---|---|---|
| 1 | No Redis client selects a non-zero database | 1 | Audit in section 2 | Grep in the PR description (`createClient`, `database`, `SELECT`, `redis.*/[0-9]`) |
| 2 | Each of aat, demo, perftest and prod has a Terraform-managed Azure Managed Redis (private endpoint only, TLS, EnterpriseCluster, keys on, "Data Owner" for `cath-<env>-mi`, per-environment SKU, no persistence) and a new `managed-redis-url`, with existing secrets untouched | 1 | `module "managed_redis"` and the new secret | Plan shows creates only. `az redisenterprise database show` |
| 3 | Entra ID and key auth both work against the live non-prod instances before any app change | 1 | "Data Owner" assignment, keys on | `test-connection` or a debug pod in aat, demo and perftest |
| 4 | Every environment runs on Managed Redis with a key, via a mapping switch that can be reverted | 2 | `managed-redis-url` mapping | Preview and aat E2E, App Insights `*.redis.azure.net:10000`, PROD smoke test |
| 5 | Azure Cache for Redis and its four secrets are removed, and nothing else is destroyed | 3 | Removal PR | Plan destroys only the legacy resources and the four secrets |
| 6 | web and api authenticate as `cath-<env>-mi` with no secret credential, and survive token refresh | 4 | `createRedisClient` with `REDIS_MI=true`, then the `managed-redis-entra-url` mapping | Unit tests. No `NOAUTH`/`WRONGPASS`. aat soak past `exp`. PROD smoke test |
| 7 | Access keys are disabled and `managed-redis-url` is gone, in place only | 5 | `access_keys_authentication_enabled = false` | Mandatory in-place plan check. `accessKeysAuthentication: Disabled` |
| 8 | Local development and nightly CI are unchanged | All | `redis.managedIdentity` defaults to `false` in `config/default.json`, which keeps today's behaviour | Unit tests. `yarn dev` against docker Redis. Nightly CI green |
| 9 | New Redis secrets follow #625 / PR #1354 (expiry, tags, `depends_on`) | 1, 4 | Same attributes as the existing secrets | Plan shows `expiration_date` and `source = "Redis"` on the new secrets |
| 10 | Keep-alive still prevents idle disconnects (#1033 / PR #1402) | All | `pingInterval` kept | Unit test. 0 `SocketClosedUnexpectedlyError` over 25 idle minutes on aat after each switch |
| 11 | Sign-in session, pending subscriptions, admin upload summary and email rate limiting work on Managed Redis | 2, 4, 5 | Single-key commands under EnterpriseCluster | E2E on aat after each switch |

## 5. Test Scenarios

1. **Provisioning is non-destructive (stage 1).** Plans in every environment create only the instance, the private endpoint, the access-policy assignment and `managed-redis-url`. Nothing changes on `module.redis` or any `redis-*` secret. After apply, every leg is green, or a prod-only failure is handled as in section 3.
2. **Both auth methods are proven without the app (stage 1, aat, demo and perftest).** Run `test-connection --auth entra` and `--auth access-key`, or a debug pod as `cath-<env>-mi` doing `PING`, `SET`/`GET` and a single-key `EVAL` over TLS on 10000. There is no prod access, so prod relies on scenario 3's smoke test.
3. **Signed-in user journey after each switch (stage 2, stage 4 PRs B and C, stage 5).** This uses the existing E2E suite on the PR preview and on aat:
   - a verified user signs in and stays signed in across pods
   - they add location and case subscriptions, sign out and back in, then restore and confirm them
   - an admin uploads a file, reaches the summary page and submits it
   - an api email runs the token-bucket `EVAL`

   App Insights shows `*.redis.azure.net:10000`, and no `MOVED`, `CROSSSLOT`, `NOAUTH` or `WRONGPASS`. After 25 idle minutes there are 0 `SocketClosedUnexpectedlyError` (the PR #1402 check). After the prod release, the PROD smoke test and app health are green.
4. **Stage 2 rollback rehearsal (aat).** Revert the mapping PR on a branch and deploy it to aat with a manual Flux deploy. The app runs on the old instance through `redis-url`. Then restore it. Skip this if stage 3 has already merged.
5. **Old instance removed (stage 3).** Confirm `X-Git-Sha` shows the stage 2 release everywhere and open PRs are rebased. The plans destroy only the legacy cache, its private endpoint, its resource group and the four old secrets. After apply, E2E on aat passes.
6. **The client honours `REDIS_MI` (unit, stage 4 PR A).**
   - `false` and unset (default `false`): the URL is passed through and there is no provider.
   - `true`: credentials are stripped, the provider has the right scope and client id, and it is created once.
   - `true` with `redis://` fails fast with a clear error.
   - `config.get("redis.managedIdentity")` parses `REDIS_MI` values `"true"`, `"false"` and unset as `true`, `false` and `false`.
   - `pingInterval` is always set, and the web session client comes from `createRedisClient(REDIS_URL)`.
   - Local `yarn dev` still works against docker Redis without an Azure login.
7. **Token-refresh soak and rollback (stage 4 PR B, aat).**
   - aat runs with `REDIS_MI=true` for 1-2 days past the token's `exp`, with no sustained Redis errors, and any `onReAuthenticationError` recovers.
   - A token failure on rollout shows as new pods crash-looping while old pods serve.
   - Rehearse the rollback: revert the Flux override, and aat goes back to key auth on the same image. Then reapply it.
8. **Keys disabled (stage 5, every environment).** Confirm `X-Git-Sha` shows PR C everywhere and open PRs are rebased.
   - Mandatory: the plans show only an in-place update of `access_keys_authentication_enabled` and the `managed-redis-url` destroy.
   - After apply, App Insights shows a short reconnect burst that recovers. E2E on aat and the PROD smoke test pass, and `az redisenterprise database show` (non-prod) reports keys disabled.

## 6. Open Questions

### CLARIFICATIONS NEEDED

1. **Prod DNS-zone grant (stage 1 prerequisite, raised with PlatOps).** Checked on 2026-11-17 with `az role assignment list --include-inherited --include-groups`:
   - **Non-prod is fine.** The non-prod Terraform principal is `cath-service` (`69aa7255-…`), confirmed as the caller in the aat activity log. It has Private DNS Zone Contributor on all of `core-infra-intsvc-rg`, so it already covers `privatelink.redis.azure.net`.
   - **Prod is missing.** `cath-service-prod` (`2e5a6bb5-9090-4710-ab3d-ff5cf383a2b6`) has Private DNS Zone Contributor only on the single zone `privatelink.redis.cache.windows.net`. That was a manual grant on 2026-10-29 for #1096's "missing grant 2". It has nothing on `privatelink.redis.azure.net`.
   - **Access-policy assignment is fine.** `cath-service-prod` is Contributor on the prod subscription, which covers `azurerm_managed_redis_access_policy_assignment`. That's a Microsoft.Cache write, not an RBAC role assignment.
   - **Action.** Before stage 1 merges, a DTSPO request asks for Private DNS Zone Contributor for `cath-service-prod` on `privatelink.redis.azure.net`. Then re-run the check. Without the grant, the prod leg fails at apply, because a plan doesn't check the join, and that blocks AAT deploys (`workflow.main.yml:47-52`).
2. **Stage 4 PR B mechanism.** Is it acceptable to switch aat alone with a one-line `REDIS_MI: "true"` Flux override, where the client ignores the key in `managed-redis-url` when `REDIS_MI` is true?
   - The alternative is to switch aat's mapping to `managed-redis-entra-url` in Flux. That means restating the full web and api `keyVaults` arrays in `cnp-flux-config`, because Helm replaces arrays and chart-library only substitutes `<ENV>` in secret names. That copy would then drift from `apps/*/helm/values.yaml`.
   - Note that the CI-deployed umbrella release in aat does not read the Flux override. It stays on key auth until PR C, which is harmless because it uses the same instance.
3. **Prod SKU, now measured.** Metrics run on 2026-11-17 with `az monitor metrics list`, Maximum per day for 2026-11-03 to 2026-11-17:
   - `cath-prod` (Premium P1, 6 GB): `usedmemory` peaked at about 97 MB, and `connectedclients` peaked at 8.
   - `cath-aat`: `usedmemory` peaked at about 1.4 MB.
   - Even prod's peak is mostly Redis's own overhead, because there are no users yet. Premium P1 is far oversized for this.
   - **Decision (2026-11-17):** `Balanced_B3` with HA in prod and `Balanced_B0` without HA elsewhere, matching the current set-up and the guide's P1 mapping (see Key decisions 3). Usage alone would allow B1, but the team chose to match the current set-up.
   - The PlatOps skill's table describing B0 as "6 GB" contradicts its own naming note, so take Microsoft's sizes from the [Managed Redis pricing page](https://azure.microsoft.com/pricing/details/managed-redis/) instead.
   - Re-check `usedmemory` on the new instance once suppliers onboard (#1161), and scale up if needed. Confirm on the pricing or scaling docs that scaling within the Balanced tier happens in place before relying on that.
