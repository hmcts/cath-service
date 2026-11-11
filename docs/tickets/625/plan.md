# #625: Redis KV secret hygiene (expiry, tags) - Technical Plan

## 1. Technical Approach

### What is left to do

The ticket was written against an older `infrastructure/redis.tf`. Checked against current `master` (`342bede8`), most of it has already been done:

- **Already met, do not re-implement:** AC1 (prod family `P`), AC2 (memory reservations), AC3/AC4 (per-environment SKU) and AC10 (secret names). Details are in section 4.
- **Remaining:** add `expiration_date` and `tags` (`source = "Redis"`) to the four `azurerm_key_vault_secret` resources in `infrastructure/redis.tf`, add `depends_on = [module.redis]`, add a stable `local.secret_expiry`, and confirm `terraform plan` is clean in every environment that can be deployed today.

This is a Terraform-only change. It adds no pages, no API endpoints and no database changes.

### Expiry mechanism (decision)

The ticket suggests `timeadd(timestamp(), "8760h")`. That would not work: `timestamp()` is evaluated again on every plan, so all four secrets would show an update (and get a new Key Vault version) on every run. AC9 could never pass.

**Chosen approach: a `time_rotating` resource from the `hashicorp/time` provider, with the expiry worked out from its fixed base timestamp.**

```hcl
resource "time_rotating" "secret_expiry" {
  rotation_days = 180
}

locals {
  secret_expiry = timeadd(time_rotating.secret_expiry.rfc3339, "8760h") # base + 365 days
}
```

Why this approach:

- **Stable plans.** `time_rotating.rfc3339` is set once, when the resource is created, and stays in state. Plans show no change until the rotation date passes.
- **Expiry renews itself with a long safety margin.** Once 180 days have passed, the next plan drops the `time_rotating` from state and recreates it. That gives a new base time and pushes `expiration_date` out to 365 days from that point. This means any routine apply in months 6 to 12 renews the expiry before it lapses. One apply anywhere in that 6-month window is enough. A fixed date gives no such window: someone has to remember to edit it.
- **No new provider download.** `hashicorp/time` is already a transitive dependency: `cnp-module-storage-account` (pinned in `storage.tf`) uses `time_static.pim_start`. `terraform init` in CI already installs it. The repo does not commit a `.terraform.lock.hcl` (none exists under `infrastructure/`), so there is no lock file to update. We still declare it in `state.tf` `required_providers`, because the root module now uses it directly.
- **Reusable.** No other secret in `infrastructure/*.tf` sets `expiration_date` yet, and no shared expiry local exists (#622 has not landed). Naming the local `secret_expiry` and defining it once in `main.tf` lets the postgres/storage/app-insights secrets use it later without a second mechanism.
- **Not the `time_static` trap.** `storage.tf` documents that `module.sa.time_static.pim_start` never renews and needs a manual `-replace`. `time_rotating` avoids that trap by design.

What it does **not** guarantee: renewal needs an apply. Master applies Terraform only when `infrastructure/`, `.github/workflows/` or `docs/api/openapi.yaml` change (`detect-infra-changes` in `workflow.main.yml`). Historically that happens many times a month (about 290 commits touched those paths in the last six months), so a 6-month window is generous. It is still not enforced: rotation happens on the **first apply on or after day 180**, not on day 180 itself. Nothing in `nightly.yml` or `watchdog.yml` runs Terraform. The previous secret version keeps its own expiry (base + 365) and stays valid. A scheduled expiry check is a separate follow-up ticket (see section 6, decision 2).

### Other decisions

- **Tags:** `merge(local.common_tags, { source = "Redis" })`. This uses `local.common_tags`, not `var.common_tags` as the ticket shows, because `env-config.tf` requires it. Without it, perftest would get a policy-rejected `environment` value.
- **`depends_on = [module.redis]`:** include it. The dependency is already implied by the `module.redis.*` references, so it changes neither the graph nor the plan. It is cheap and matches AC7 literally.
- **`content_type = ""`:** omit it. `""` is the provider default, so setting it does nothing and only adds noise.
- **Names and `key_vault_id` stay exactly as they are.** These are the only ForceNew attributes. `expiration_date` and `tags` update in place. Because `value` does not change, azurerm calls `UpdateSecret` on the current version; it calls `SetSecret` (a new version) only when `value` changes.

## 2. Implementation Details

TEMPLATE SOURCE: n/a

### `infrastructure/state.tf`

Add to `required_providers`:

```hcl
time = {
  source  = "hashicorp/time"
  version = "~> 0.13"
}
```

Check the installed version in the CI `terraform init` output (or a local `init -backend=false`) and adjust the constraint to the current minor if needed. `cnp-module-storage-account` sets no constraint, so there is nothing to conflict with.

### `infrastructure/main.tf`

Append, with a short comment explaining why it is not `timestamp()` and how renewal works:

```hcl
# Expiry for Terraform-managed Key Vault secrets. Not timeadd(timestamp(), ...),
# which changes on every plan. The base time is fixed in state and rotates every
# 180 days; the next apply after rotation pushes every expiry out to base + 365
# days, so any apply in months 6-12 renews it before it lapses.
resource "time_rotating" "secret_expiry" {
  rotation_days = 180
}

locals {
  secret_expiry = timeadd(time_rotating.secret_expiry.rfc3339, "8760h")
}
```

### `infrastructure/redis.tf`

Apply the same change to each of `redis_host`, `redis_port`, `redis_access_key` and `redis_url`. `name`, `value` and `key_vault_id` stay as they are:

```hcl
resource "azurerm_key_vault_secret" "redis_url" {
  name            = "redis-url"
  value           = "rediss://:${module.redis.access_key}@${module.redis.host_name}:${module.redis.redis_port}"
  key_vault_id    = module.key_vault.key_vault_id
  expiration_date = local.secret_expiry
  tags            = merge(local.common_tags, { source = "Redis" })

  depends_on = [module.redis]
}
```

No changes to `variables.tf`, tfvars, `env-config.tf`, Helm charts or app code.

## 3. Error Handling & Edge Cases

- **Perpetual diff:** avoided by `time_rotating`. The second plan after apply must show `No changes` (test scenario T3). If it does not, something non-deterministic has crept in. Fix that before merging.
- **Expiry lapse:** treat an expired `redis-url` as an outage risk. The Secrets Store CSI driver may fail to mount or refresh it, and web/api pods would then fail to start or lose `REDIS_URL` (sessions). Guard: the 180/365 rotation gives a 6-month renewal window. The expiry date is visible in `az keyvault secret show` metadata. A scheduled nightly expiry check is raised as a separate follow-up ticket (section 6, decision 2).
- **No new secret versions:** metadata-only updates (`expiration_date`, `tags`) modify the current version in place (`UpdateSecret` in azurerm's `resourceKeyVaultSecretUpdate`). The version id stays the same, so the CSI driver has nothing new to pick up. Check after apply that the version id is unchanged. A new version only appears if the Redis access key or host changes, as today.
- **First apply shape:** `time_rotating.secret_expiry` is created (it lives only in state, nothing is created in Azure) and the 4 secrets update in place. Expected plan per environment: `1 to add, 4 to change, 0 to destroy`, and the only "add" is `time_rotating.secret_expiry`. Any `azurerm_*` create or destroy, or a `-/+` on a secret, means a ForceNew attribute changed. Stop.
- **Rotation day plans:** after 180 days, a plan shows `time_rotating.secret_expiry` recreated and 4 secret updates. That is expected and is not drift.
- **ithc absent:** ithc is parked until about 2026-12-23 (Key Vault purge protection, #1067) and is not in the `environments` list. AC9 is checked for aat, demo, perftest and prod only. When ithc is re-added, its secrets are created with expiry and tags from the start.
- **Prod apply path:** prod is applied from master together with aat/demo/perftest (`workflow.main.yml`), and each leg is independent. The PR preview plan (`workflow.preview.yml`) covers all four environments, so the prod plan is reviewed before merge.
- **Provider/lock:** no lock file is committed, so no lock update is needed. If CI ever moves to `-lockfile=readonly`, the `time` entry must be in the lock file.
- **Write permission:** in-place updates need `Set` on secrets in `cath-<env>`, which the pipeline principal already has (it created these secrets).

## 4. Acceptance Criteria Mapping

| AC | Status | How satisfied | Verify |
|---|---|---|---|
| 1. family `P` in prod, not hardcoded `C` | Already met | `local.sizing` in `env-config.tf`: default `C`, prod override `P` | Read `env-config.tf`; prod PR plan shows no change to `module.redis` |
| 2. maxmemory_* 642 prod / 200 non-prod | Already met | `cnp-module-redis` defaults all three to 642 (prod Premium). azurerm sends none of them for Basic (non-prod) | Prod plan shows no change to `redis_configuration` |
| 3. `redis_sku` variable | Met another way | Per-environment SKU in `local.sizing`. A variable would mean two places setting the SKU. Non-prod stays Basic for cost | n/a |
| 4. `prod.tfvars` Premium | Met another way | `sizing_overrides.prod.redis_sku_name = "Premium"` | n/a |
| 5. `expiration_date = local.secret_expiry` | This ticket | All four secrets in `redis.tf` | Plan shows `+ expiration_date`; after apply, `az keyvault secret show --vault-name cath-<env> -n redis-url --query attributes.expires` is not null and about 365 days out |
| 6. tags `source: Redis` | This ticket | `merge(local.common_tags, { source = "Redis" })` | `az keyvault secret list --vault-name cath-<env> --query "[?starts_with(name,'redis-')].{n:name,exp:attributes.expires,t:tags}"` |
| 7. `depends_on = [module.redis]` | This ticket | Added to all four (no effect on the graph) | Code review |
| 8. `local.secret_expiry` in `main.tf` | This ticket | `time_rotating` + local in `main.tf` | Code review |
| 9. clean `terraform plan` | This ticket | Only in-place updates, plus one state-only `time_rotating` create | PR plan per environment (aat, demo, perftest, prod): `1 to add, 4 to change, 0 to destroy`. A re-plan after apply shows `No changes` |
| 10. no breaking change to names | Already met / preserved | Names untouched. `redis-url` still mounted as `REDIS_URL` by both charts | Plan has no secret replace. App health check |

## 5. Test Scenarios

- **T1:** `terraform fmt -check -recursive` and `terraform validate` (`init -backend=false`) pass in `infrastructure/`.
- **T2:** The PR plan for each of aat, demo, perftest and prod shows exactly `time_rotating.secret_expiry` created plus 4 in-place updates on `azurerm_key_vault_secret.redis_*` (`expiration_date`, `tags`), with no other resource changes.
- **T3:** After the master apply, the next plan for any environment shows `No changes` for these resources (no perpetual diff).
- **T4:** Post-apply metadata check in `cath-aat`, `cath-demo`, `cath-perftest` and `cath-prod`: all four `redis-*` secrets have `expires` about 365 days ahead and `source: Redis` plus the common tags.
- **T5:** App health after apply: AAT smoke tests pass, and a sign-in on AAT (Redis-backed session) works and survives a page refresh.

## 6. Decisions (clarifications resolved 2026-11-05)

1. **Expiry duration and rotation:** 365-day expiry with 180-day rotation, accepted. The first apply sets each secret's expiry to day 365. The first apply on or after day 180 moves the expiry on the **same current version** out to a new 365 days. No second version is created; the expiry is extended in place, so there is never a gap. Rotation needs an apply; it is not exactly on day 180.
2. **Renewal safety net:** out of scope here. Follow-up ticket #1353 covers a scheduled check in `nightly.yml` (OIDC login already present) that lists `redis-*` secret metadata in each `cath-<env>` vault and alerts if any expires within a threshold (e.g. 60 days). Prod access for that principal still needs resolving: the E2E OIDC principal gets vault access only in non-prod (`grant_e2e_access = !local.is_prod`).
3. **`depends_on`:** keep it. It has no runtime effect, and it satisfies AC7 literally.
4. **Unused secrets:** expire and tag all four (`redis-url`, `redis-host`, `redis-port`, `redis-access-key`) as the ticket says. If `redis-host`, `redis-port` and `redis-access-key` end up unused, clean them up in the future. No ticket is raised now.
5. **Other secrets / #622:** #622 (dedicated APIM Key Vault) defines the same `local.secret_expiry` using `timestamp()`. Whichever lands second should reuse the `time_rotating` local from this ticket. The postgres, storage and app-insights secrets are not in scope.
