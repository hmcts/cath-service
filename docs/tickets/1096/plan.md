# Technical Plan: #1096 PROD: provision cath-service infrastructure with Terraform (CNP)

## 1. Technical Approach

Add `prod` as a fifth environment to the existing Terraform root module and pipeline. Do not fork the module. `infrastructure/` stays a pure function of `var.env`. The places where PROD really differs from non-prod go into `env-config.tf`, behind one `is_prod` local and a small sizing override map.

The ITHC precedent (#1058, #1065, #1068, #1067) shows the first apply of a new environment fails on things a plan cannot see: key vault and storage names held elsewhere, missing resource groups, and cross-subscription references. Here the first apply is PROD and the failing leg would block AAT deploys (see 3.6). So the work is ordered as:

1. **Pre-flight (read-only).** Check names, resource groups, subnets, DNS-zone rights, Graph lookups and role-assignment rights. Fix any missing grants before writing code that depends on them.
2. **PR A: Terraform and pipeline support, PROD plan-only.**
   - Terraform changes.
   - `prod` added to the `stage.infrastructure.yml` lookups, with the per-leg credential.
   - `prod` added to `workflow.preview.yml` only.

   PR A's checks plan PROD, and must also plan aat, demo and perftest with **no changes** apart from the Postgres SKU moving to the module default and the version moving from 16 to 18 (both in place). That proves the refactor is a no-op for them. Merging PR A applies nothing to PROD.
3. **PR B: enable the apply.** A one-word change that adds `prod` to `workflow.main.yml`. Merging it runs the first PROD apply from master. If the apply fails in a way that can't be fixed forward quickly, reverting PR B unblocks AAT straight away.
4. **Verify, then prove a no-op second run.**

### What I verified in the repo (not assumed)

- **State store and tags.** `terraform-deploy` (cnp-githubactions-library@main) builds the state key `cath-service/prod/terraform.tfstate` in container `mgmtstatestorecontainerprod` of `mgmtstatestoreprod`. It already maps `prod` to the tag `environment = "production"`. **So `environment_tag` stays `null` for prod.** No override is needed for the tagging policy.
- **Postgres HA is not new.** `terraform-module-postgresql-flexible` turns on `ZoneRedundant` HA automatically for `prod` (and already for `aat` and `perftest`) through `high_availability_environments`. Backup retention defaults to 35 days, which is the maximum. `geo_redundant_backups` defaults to `false`. It is **ForceNew** (create-time only), so it must be decided before the first apply.
- **Postgres prod behaviour.** For `prod` the module also uses the SC groups: admin `DTS Platform Operations PostgreSQL Admin Access SC`, reader `DTS JIT Access cath DB Reader SC`. It looks up `DTS Production DB Reporting`. All of these are Graph lookups at plan time.
- **Key vault developer access.** `cnp-module-key-vault` drops the `DTS CFT Developers` read policy when `is_prod`. Its own diagnostic setting resolves `hmcts-prod` through `terraform-module-log-analytics-workspace-id`.
- **Resource groups.** Resources land in **four** resource groups, not one:

  | Resource group | Contents |
  |---|---|
  | `cath-prod` | key vaults, App Insights, `cathsaprod`, web test |
  | `cath-data-prod` | Postgres (created by the Postgres module) |
  | `cath-cache-prod` | Redis and its private endpoint (created by the Redis module) |
  | `managed-identities-prod-rg` | `cath-prod-mi` (the `cath` workload identity) and `cath-cp-prod-mi` |

  AC6's single `az resource list -g cath-prod` cannot show Postgres, Redis or the MI (see Clarification 5).
- **First PROD plan fails as written.** `tf-crime-connection-mi.tf` reads `crime-oidc-config` from `cath-prod` and uses it in `count`. On a first plan the vault does not exist yet, so the data source is deferred, `count` is unknown, and the plan fails with `Invalid count argument`. This needs an explicit per-environment switch (2.1).
- **The Postgres permission script silently no-ops on GitHub runners.** `null_resource.set-user-permissions-additionaldbs` runs `az login --identity` and `psql` against the private FQDN. On the perftest first apply (run 35854994597) it logged `Identity not found` and `could not translate host name`, yet the resource reported "Creation complete". So in PROD the JIT reader group will not actually be granted in the database. This already happens in every environment, so it is not a blocker for this ticket, but PlatOps should know (Clarification 9).

### Credentials and subscriptions (from #1095, run 40354863343)

The single principal `cath-service-prod` uses `AZURE_CREDENTIALS_CFT_PROD`. Its default subscription is DCD-CFTAPPS-PROD. Both `state-store-init` and `terraform-deploy` run `az account set` to DCD-CNP-PROD before they touch the state store, so nothing depends on that default.

| Terraform target | Subscription | Covered by the granted roles? |
|---|---|---|
| `cath-prod`, `cath-data-prod`, `cath-cache-prod`, key vaults, storage, App Insights | DCD-CNP-PROD | Yes: Contributor on the subscription (including creating resource groups) |
| `managed-identities-prod-rg` (MIs, federated credentials) | DCD-CNP-PROD | Yes: Contributor, plus Managed Identity Contributor |
| Postgres delegated subnet `cft-prod-vnet/postgres-expanded` (`postgres_network` provider) | DCD-CFTAPPS-PROD | Yes, but **only** that subnet, hence `subnet_suffix = "expanded"` |
| Redis private endpoint subnet `core-infra-vnet-prod/core-infra-subnet-2-prod` | Expected DCD-CNP-PROD (the CNP pattern: aat's is in DCD-CNP-DEV and the module finds it with the default provider) | Yes **if** it is in DCD-CNP-PROD. `core_infra_subscription_id = null`. Pre-flight confirms this |
| `hmcts-prod` Log Analytics workspace (`oms-automation`) | DCD-CNP-PROD (`8999dec3-…`) | Yes |
| `privatelink.redis.cache.windows.net` and `private.postgres.database.azure.com` (hardcoded in the Redis and Postgres modules) | DTS-CFTPTL-INTSVC (`1baf5470-…`), `core-infra-intsvc-rg` | **Probably not.** #1095 only showed Private DNS Zone Contributor on `platform.hmcts.net`. Both resources need `Microsoft.Network/privateDnsZones/join/action` on these zones. **Likely missing grant** |
| `azurerm_role_assignment` in the storage module (`Storage Blob Data Contributor` for `cath-prod-mi` on `cathsaprod`) | DCD-CNP-PROD | **No.** Contributor excludes `Microsoft.Authorization/roleAssignments/write`. **Missing grant** |
| `azuread_group` and `azuread_service_principal` lookups (Postgres module, key vault module) | Graph | **Unverified.** #1095 proved self-read only. Group lookups need Group.Read.All or Directory.Read.All |
| APIM `cft-api-mgmt-prod` | DCD-CFTAPPS-PROD | Granted, but not used: `apim_suffix = null` until #1161 |

## 2. Implementation Details

TEMPLATE SOURCE: n/a

No application code, database schema, Prisma, Helm or UI changes. Only Terraform under `infrastructure/` and three workflow files.

### File structure

```
.github/workflows/
├── one-shot.preflight-prod-infra.yml   # NEW, temporary, read-only; delete after use
├── stage.infrastructure.yml            # EDIT (PR A)
├── workflow.preview.yml                # EDIT (PR A)
└── workflow.main.yml                   # EDIT (PR B)
infrastructure/
├── env-config.tf                       # EDIT
├── appinsights.tf                      # EDIT
├── apim.tf                             # EDIT (hostname local only; still gated off for prod)
├── keyvault.tf                         # EDIT
├── keyvault-bootstrap.tf               # EDIT
├── keyvault-third-party.tf             # EDIT
├── postgres.tf                         # EDIT
├── redis.tf                            # EDIT
├── tf-crime-connection-mi.tf           # EDIT
└── variables.tf                        # EDIT (remove pip_nonprod_group_object_id)
```

### 2.1 `infrastructure/env-config.tf`

- Add a `prod` entry. Add `crime_federation_enabled` to **every** entry. All entries must have the same attributes, or type unification fails.

  ```hcl
  aat      = { subnet_suffix = "expanded", core_infra_subscription_id = null, environment_tag = null, apim_suffix = "stg",  crime_federation_enabled = true }
  demo     = { subnet_suffix = null,       core_infra_subscription_id = null, environment_tag = null, apim_suffix = "demo", crime_federation_enabled = true }
  ithc     = { subnet_suffix = null,       core_infra_subscription_id = "7a4e3bd5-…", environment_tag = null, apim_suffix = null, crime_federation_enabled = true }
  perftest = { subnet_suffix = null,       core_infra_subscription_id = "7a4e3bd5-…", environment_tag = "testing", apim_suffix = "test", crime_federation_enabled = true }
  # PROD: the only subnet cath-service-prod can join is postgres-expanded (#1095).
  # core-infra-vnet-prod is in DCD-CNP-PROD, so the module does its own lookup.
  # The terraform-deploy library already tags prod "production". APIM waits for #1161.
  # Crime Portal federation waits until crime-oidc-config is seeded in cath-prod.
  prod     = { subnet_suffix = "expanded", core_infra_subscription_id = null, environment_tag = null, apim_suffix = null,  crime_federation_enabled = false }
  ```

- Add the prod/non-prod split. These are binary prod-or-not facts, the same pattern the CNP modules use internally. They are not per-environment variance, so they are not map keys.

  ```hcl
  is_prod = var.env == "prod"

  # Write access on all three vaults. cnp-module-key-vault cannot create a vault
  # with no product-team policy (it fails on an empty object_id), so "no human
  # access" is not an option. PROD needs a named PROD group (Clarification 1).
  key_vault_product_group_name = local.is_prod ? "<PROD GROUP - Clarification 1>" : "DTS PIP Non-Prod"

  # The E2E/CI GitHub OIDC app registration is a non-prod identity. It gets
  # no access to anything in PROD.
  grant_e2e_access = !local.is_prod

  # CNP PROD hostnames carry no environment label (cath-web.platform.hmcts.net).
  platform_domain = local.is_prod ? "platform.hmcts.net" : "${var.env}.platform.hmcts.net"

  crime_federation_enabled = try(local.env_config[var.env].crime_federation_enabled, false)
  ```

- Sizing. Replace the "Sizing is NOT here on purpose" paragraph. Its premise no longer holds, because PROD Redis now differs. Postgres passes no sizing inputs at all, so every environment takes the module defaults. Redis uses one default plus a PROD override:

  ```hcl
  default_sizing = {
    redis_sku_name = "Basic"
    redis_family   = "C"
    redis_capacity = 0
  }
  sizing_overrides = {
    prod = {
      redis_sku_name = "Premium"
      redis_family   = "P"
      redis_capacity = 1
    }
  }
  sizing = merge(local.default_sizing, try(local.sizing_overrides[var.env], {}))
  ```

  PROD sizing (signed off, task 5):

  | Setting | PROD value | Why |
  |---|---|---|
  | Redis | **Premium P1**, single zone (`availability_zones` left at the module default, `null`) | Replication and SLA. Non-prod stays on Basic C0 for cost. Zones are create-time only: adding them later recreates the cache |
  | Postgres version | **18** (every environment, matches `docker-compose.yml`) | Set in `postgres.tf`; the module has no default. aat, demo and perftest upgrade in place from 16 on the master apply after PR A merges: Azure stops the server, takes an implicit backup, runs pg_upgrade, and disables then re-enables HA. Downtime on each, and it can't be reverted (only point-in-time restore to a new server). **Never lower it**: azurerm forces replacement on a version decrease |
  | Postgres SKU | **GP_Standard_D2s_v3** (module default, every environment) | No input. demo, perftest and ithc move from D2ds_v4, in place with a short restart |
  | Postgres HA | **ZoneRedundant** (module automatic for `prod`) | No input. Don't set `high_availability`; the module says not to |
  | Backup retention | **35 days** (module default, the maximum) | No input |
  | Geo-redundant backup | **false** (module default) | No input. Cannot be changed after the server is created |
  | Storage | 65536 MB (module default) with `auto_grow_enabled = true` | `storage_mb` is in the module's `ignore_changes`, so it grows without drift |
  | Immutable backup vault enrolment (`service_criticality >= 4`) | **Not enabled** (default 1) | Enabling it creates role assignments and needs access to `cnp-backup-vault`: more grants |

  Relying on the Postgres module defaults means a change upstream reaches every environment, PROD included, on the next master run. The module is on a branch ref (`DTSPO-30107-additional-postgres-admins`), not a commit, so review its changes before they land.

- Log Analytics. Remove `log_analytics_subscription_id = "1c4f0704-…"` and drive it from the module in 2.2:

  ```hcl
  log_analytics_subscription_id = module.log_analytics_workspace.subscription_id
  ```

  Update the comments that say every environment maps to `hmcts-nonprod`.

### 2.2 `infrastructure/appinsights.tf` and `infrastructure/main.tf`: Log Analytics from the platform mapping

Use the same mapping module that `cnp-module-key-vault` already uses for its diagnostics. It covers `prod` → `hmcts-prod` in `8999dec3-…`, and gives the same values as today for aat, demo, ithc and perftest:

```hcl
module "log_analytics_workspace" {
  source      = "git::https://github.com/hmcts/terraform-module-log-analytics-workspace-id.git?ref=master"
  environment = var.env
}

data "azurerm_log_analytics_workspace" "shared" {
  provider            = azurerm.log_analytics
  name                = module.log_analytics_workspace.name
  resource_group_name = module.log_analytics_workspace.resource_group_name
}
```

The `azurerm.log_analytics` provider in `main.tf` keeps `subscription_id = local.log_analytics_subscription_id`. That is valid because the module's outputs are pure locals and are known at plan time. Keep the data source rather than using `module.….workspace_id` directly: a wrong workspace or missing read then fails at plan, not apply. The fallback, if module-driven provider config is rejected in review, is a two-entry `local` map (`prod` and everything else) with the same two values.

Other changes in `appinsights.tf`:
- Web test URL becomes `https://cath-web.${local.platform_domain}/health/liveness`.
- `azurerm_role_assignment.app_insights_reader_e2e_oidc_sp` gets `count = local.grant_e2e_access ? 1 : 0`, plus:

  ```hcl
  moved {
    from = azurerm_role_assignment.app_insights_reader_e2e_oidc_sp
    to   = azurerm_role_assignment.app_insights_reader_e2e_oidc_sp[0]
  }
  ```

  This also avoids the PROD principal's missing `roleAssignments/write` for this one resource.

### 2.3 Key vaults

- `keyvault.tf` and `keyvault-third-party.tf`: `product_group_name = local.key_vault_product_group_name`.
- `keyvault-bootstrap.tf`: replace `product_group_object_id = var.pip_nonprod_group_object_id` with `product_group_name = local.key_vault_product_group_name`. The module resolves the same object id (`9c37fa4a-…`) for non-prod, so there is no diff on the access policy. **PR A's aat, demo and perftest plans must show this.** Update the long comment, which explains why object id was used. Name works for the same reason: the module owns the single policy either way.
- `variables.tf`: delete `pip_nonprod_group_object_id`.
- `keyvault.tf` `e2e_oidc_sp` and `keyvault-bootstrap.tf` `bootstrap_kv_e2e_oidc_sp`: `count = local.grant_e2e_access ? 1 : 0`, references updated to `[0]`, and a `moved` block for each.
- `keyvault-access.tf`: no change. `apim` is already gated by `deploy_apim`. `cft_jenkins` (`jenkins-cftptl-intsvc-mi`) is the PTL Jenkins identity, which serves PROD in CNP, so it is not a non-prod pointer (Clarification 11).

### 2.4 `infrastructure/redis.tf` and `infrastructure/postgres.tf`

- Redis: `sku_name = local.sizing.redis_sku_name`, `family = local.sizing.redis_family`, `capacity = local.sizing.redis_capacity`.
- Postgres: remove `pgsql_sku` and `pgsql_storage_mb`, and pass no `geo_redundant_backups`, so every environment takes the module defaults. Fix the comment that says aat is the only expanded-subnet environment.

- Storage (`storage.tf`, added 2026-11-03): in prod only, `pim_roles` makes `DTS CaTH Prod` (the SC-cleared prod team, looked up as `data.azuread_group.sc_group` following the module README example) **eligible** for Storage Blob Data Reader and Storage Blob Delegator on `cathsaprod` through PIM, so nobody has standing blob data access. Non-prod gets no PIM. `azuread` is added to `required_providers` in `state.tf` for the group lookup. The PROD principal's unconditioned User Access Administrator on DCD-CNP-PROD covers creating the eligible assignments. **Eligibility lasts 365 days from the first apply and is not renewed automatically**: replace `module.sa.time_static.pim_start` before it lapses. Activation rules (approval, MFA, maximum duration) come from the PIM role settings on the subscription, not this code.

### 2.5 `infrastructure/tf-crime-connection-mi.tf`

Gate the read and the credentials on the explicit switch. Keep the existing "no try()" rule: the switch is explicit per environment, not a silent fallback.

```hcl
data "azurerm_key_vault_secret" "crime_oidc_config" {
  count        = local.crime_federation_enabled ? 1 : 0
  name         = "crime-oidc-config"
  key_vault_id = module.key_vault.key_vault_id
}

locals {
  crime_oidc_connections = local.crime_federation_enabled ? jsondecode(data.azurerm_key_vault_secret.crime_oidc_config[0].value).connections : []
}
```

`count = length(local.crime_oidc_connections)` keeps the same indices, so there is no diff in non-prod. `azurerm_user_assigned_identity.app_cp_mi` stays ungated, so `cath-cp-prod-mi` exists for #1097 and the Crime Portal PROD follow-up. Update the header comment: "must exist in every environment where `crime_federation_enabled` is true."

### 2.6 `infrastructure/apim.tf`

`service_url = "https://cath-api.${local.platform_domain}"`. This is a no-op for non-prod, and still gated off for prod. It saves #1161 one change. Leave `body_bytes` (`apim-logger.tf`) to #1161. It is unreachable while `apim_suffix = null`.

### 2.7 `.github/workflows/stage.infrastructure.yml` (PR A)

- `state-store-init`:
  - `creds: ${{ matrix.environment == 'prod' && secrets.AZURE_CREDENTIALS_CFT_PROD || secrets.AZURE_CREDENTIALS_CFT_PREVIEW }}`
  - `SUBSCRIPTION` lookup: add `"prod":"DCD-CNP-PROD"`
  - `STORAGE_ACCOUNT_POSTFIX` lookup: add `"prod":"prod"`
- `terraform`:
  - add `"prod":"DCD-CNP-PROD"` to `subscription`, `"prod":"DCD-CFTAPPS-PROD"` to `aks-subscription`, and `"prod":"prod"` to `storage-account`
  - `secrets: AZURE_CREDENTIALS: ${{ matrix.environment == 'prod' && secrets.AZURE_CREDENTIALS_CFT_PROD || secrets.AZURE_CREDENTIALS_CFT_PREVIEW }}`. The `matrix` context is permitted in `jobs.<id>.secrets`.
  - `post-plan-to-pr: ${{ matrix.environment == 'aat' || matrix.environment == 'prod' }}`. AC5 needs the PROD plan reviewed, so it gets its own comment. Values the plan marks sensitive are redacted.
- Update the comments: the state-store-per-subscription note (add `mgmtstatestoreprod` in DCD-CNP-PROD), and why PROD uses a different credential.
- `job.terraform.yml`: no change.

### 2.8 Callers

- `workflow.preview.yml` (PR A): `environments: '["aat","demo","perftest","prod"]'`. Update the comment.
- `workflow.main.yml` (PR B): `environments: '["aat","demo","perftest","prod"]'`. Change "Every non-prod environment is applied from master" to cover prod.

### Decision: PR runs plan PROD (recommended: yes)

- **For:** it is the only way to review a PROD plan before master applies it (AC5). It is also what the repo already does for every other environment.
- **Exposure doesn't change.** `AZURE_CREDENTIALS_CFT_PROD` is a repository secret. Any same-repo PR can already read it by editing a workflow, because `pull_request` runs use the PR's workflow files. Adding PROD to the plan list grants nothing new. The real risk is that a PR plan runs arbitrary code with PROD credentials (for example, an `external` data source). That risk exists today. The fix is a GitHub Environment `prod` holding the secret with a `master`-only deployment branch policy. That would also block PR plans, unless a second, read-only PROD principal is used for plans. **Raise it as a follow-up. Do not do it in this ticket** (Clarification 4).
- PR plans also run `state-store-init` with the PROD credential, which is an idempotent container create. Acceptable.

### Decision: gate the first apply (recommended: PR A / PR B split, no manual approval)

The epic rules out manual approvals for deploys. A GitHub-environment approval on the first apply would need the secret moved into an environment, and then every master run would need approving. The PR A / PR B split gates the first apply on a reviewed plan and a green pre-flight. It keeps the pipeline unattended, and it gives a one-word revert if the apply breaks master (3.6).

### Every non-prod hardcode in `infrastructure/` and how it is handled

| Location | Hardcode | Handling |
|---|---|---|
| `env-config.tf` `log_analytics_subscription_id` | `1c4f0704-…` (DCD-CNP-DEV) | Module-driven (2.2) |
| `appinsights.tf` data source | `hmcts-nonprod` | Module-driven (2.2) |
| `keyvault.tf`, `keyvault-third-party.tf` | `product_group_name = "DTS PIP Non-Prod"` | `local.key_vault_product_group_name` (the ticket only mentioned the bootstrap vault) |
| `keyvault-bootstrap.tf`, `variables.tf` | `pip_nonprod_group_object_id = 9c37fa4a-…` | Replaced by the name local. Variable deleted |
| `keyvault.tf`, `keyvault-bootstrap.tf`, `appinsights.tf` | `e2e_oidc_object_id = 9a5a8d6f-…` (non-prod GitHub OIDC app): KV Get/List, Monitoring Reader | Gated off for prod, with `moved` blocks |
| `appinsights.tf` web test | `cath-web.${var.env}.platform.hmcts.net` | `local.platform_domain` (Clarification 6) |
| `apim.tf` `service_url` | `cath-api.${var.env}.platform.hmcts.net` | `local.platform_domain`. Gated off for prod anyway |
| `apim-logger.tf` | `body_bytes = 8192` (personal data) | Unreachable for prod (`apim_suffix = null`). #1161 |
| `redis.tf` | `sku_name = "Basic"`, `capacity = 0` | `local.sizing` |
| `postgres.tf` | SKU and storage literals, no geo-redundant backup | Removed; module defaults |
| `postgres.tf` and `env-config.tf` comments | "aat is the only expanded subnet" | Comment updated; prod uses `expanded` |
| `tf-crime-connection-mi.tf` | Unconditional read of `crime-oidc-config` | `crime_federation_enabled` |
| Redis and Postgres modules (not editable) | Private DNS zones in `1baf5470-…` (DTS-CFTPTL-INTSVC) | Shared CFT zones used by PROD too. Correct, but needs the DNS-zone join grant (missing grant 2) |
| Postgres module (not editable) | `kv_subscription` default DCD-CNP-DEV | Only used by `set-schema-ownership` and `set-db-report-privileges`, both off. No action |
| Key vault module (not editable) | `developers_group = "DTS CFT Developers"` | Lookup only. The module creates no developer policy in prod |
| `keyvault-access.tf` | `ca6d5085-…` `jenkins-cftptl-intsvc-mi` | PTL (prod-capable) identity, so kept (Clarification 11) |
| `variables.tf` | `sa_account_replication_type = "RAGRS"`, `default_action = "Allow"` in `storage.tf` | Not a non-prod pointer. RAGRS is suitable for prod. Public network access is a separate question (Clarification 8) |
| `main.tf` | `storage_uses_legacy_rg = var.env == "aat"` | prod is born in `cath-prod`. No action |

## 3. Error Handling & Edge Cases

### 3.1 Soft-deleted or taken names (the #1067 lesson)

Vault names are global. Purge protection is forced on by `cnp-module-key-vault`, and deleting a vault costs its name for 90 days. Pre-flight checks `cath-prod`, `cath-bootstrap-prod`, `cath-tp-prod`, `cathsaprod`, and also the Postgres and Redis names `cath-prod`, all before any code merges.

**Specific risk:** an SDS-era `bootstrap-prod` job against **DTS-SHAREDSERVICES-PROD** existed on master from 20 to 22 May 2026 (`62230a0c`, removed in `eccc9d72`). It may have created, then deleted, `cath-bootstrap-prod` there. The PROD principal cannot see that subscription. The global `checkNameAvailability` call is the check it can make. A human with SDS PROD read must run `list-deleted` there.

**If a name is held:** do not apply. The choice is the same as ITHC: wait for the purge date, or rename (which ripples into the Helm `keyVaults` keys and `THIRD_PARTY_KEY_VAULT`). Never delete a partially created PROD vault "to retry cleanly".

### 3.2 Partial first apply

`terraform apply` records what it created, so a failed first apply leaves a valid partial state. Fix the cause and let the next master run continue. Expected failure points, in order of likelihood:

1. `roleAssignments/write` on `cathsaprod` (missing grant 1)
2. DNS zone join for the Redis private endpoint or Postgres (missing grant 2)
3. A name conflict (3.1)

The Redis create takes about 25 minutes and the whole apply about 30 (perftest precedent). A Standard Redis and an HA Postgres may take longer. That is well within job limits.

### 3.3 State lock

PR plans and master applies take a lease on `cath-service/prod/terraform.tfstate`. A cancelled run can leave the lease held. A PR plan that overlaps a master apply makes one of them fail with "state blob is already locked". Break the lease only after confirming no run is active:

```sh
az account set --subscription DCD-CNP-PROD
KEY=$(az storage account keys list -g mgmt-state-store-prod -n mgmtstatestoreprod --query '[0].value' -o tsv)
az storage blob lease break --account-name mgmtstatestoreprod --account-key "$KEY" \
  --container-name mgmtstatestorecontainerprod --blob-name cath-service/prod/terraform.tfstate
```

### 3.4 Cross-subscription and Graph lookups

| Lookup | Fails at | Symptom | Mitigation |
|---|---|---|---|
| `cft-prod-vnet/postgres-expanded` (`postgres_network`) | plan | `Subnet … not found` / 403 | Pre-flight `az network vnet subnet show` |
| `core-infra-vnet-prod/core-infra-subnet-2-prod` (Redis module, default provider) | plan | `Subnet … was not found` | Pre-flight. If it is in another subscription, set `core_infra_subscription_id` for prod, as ithc does |
| `hmcts-prod` workspace | plan | `workspaces hmcts-prod … not found` | Same subscription; Log Analytics Contributor granted |
| Postgres and Redis private DNS zones (`1baf5470-…`) | **apply** | `LinkedAuthorizationFailed` on `privateDnsZones/join/action` | Missing grant 2, requested before PR B |
| `azuread_group` (SC admin group, `DTS Production DB Reporting`, `DTS CFT Developers`, PROD product group) and `azuread_service_principal` (`jenkins-cftptl-intsvc-mi`, self) | plan | `Authorization_RequestDenied` / `group not found` | Pre-flight `az ad group show` / `az ad sp list` run **as the PROD principal** |

### 3.5 Missing grants

Request these in one PlatOps follow-up on DTSPO-35946, before PR B:

1. **Role assignment write.** `Role Based Access Control Administrator` on DCD-CNP-PROD (or on the `cath-prod` resource group, after the first apply creates it). Use an ABAC condition limiting it to `Storage Blob Data Contributor`. Without it, the storage module's role assignment fails (403). This is certain from the Contributor role definition.
2. **Private DNS zone join** (Private DNS Zone Contributor, or a custom role with `read` and `join/action`) on `privatelink.redis.cache.windows.net` and `private.postgres.database.azure.com` in `core-infra-intsvc-rg` / DTS-CFTPTL-INTSVC. Likely missing: #1095 listed only `platform.hmcts.net`. Confirm in pre-flight with an inherited role-assignment query before asking.
3. **Graph group read.** Only if the pre-flight `az ad group show` fails.

### 3.6 A failing PROD leg blocks AAT

`workflow.main.yml` `deploy-stage` requires `infrastructure-stage` to be `success` or `skipped`. `save-infra-success` only records the SHA on success, so every later master run retries the failing PROD leg. A broken PROD apply therefore stops AAT deploys until it is fixed. Mitigation: pre-flight and missing grants come before PR B, and **reverting PR B is the agreed rollback**. That is the same move as parking ithc in #1068.

### 3.7 Plan drift on the second run

Known non-drifting cases:
- `storage_mb`, `zone` and `standby_availability_zone` are ignored by the Postgres module.
- The `null_resource` triggers are content hashes.
- Tags are constant per environment.

If the second run shows changes:
- Read the diff before adding any `ignore_changes`.
- Likely candidates are Azure-normalised values: Redis `redis_configuration`, App Insights `sampling_percentage`, and the storage soft-delete retention the storage module enforces only in prod.
- A real drift is fixed in code, not suppressed.

### 3.8 Non-prod regressions from the refactor

The `moved` blocks (2.2, 2.3), the bootstrap switch from object id to name, the crime data-source `count`, and the module-driven Log Analytics lookup must all plan **"No changes"** for aat, demo and perftest in PR A. The only expected updates are the Postgres `sku_name` moving to the module default, `GP_Standard_D2s_v3`, and `version` 16 → 18, both in place. Run Azure's upgrade validation checks on each server before merging. Any create or destroy for those environments blocks the merge.

### 3.9 Detect-changes gating

`workflow.preview.yml` detects only `infrastructure/` and `docs/api/openapi.yaml`, so PR B (workflows only) produces no PR plan. Reviewers rely on PR A's plan, plus the PROD plan on any infrastructure PR merged between A and B. Both are fine, because PROD is in the preview list from PR A onward.

## 4. Acceptance Criteria Mapping

| AC | How | Who | Verification |
|---|---|---|---|
| 1. PROD Terraform credential available as a repo secret | **Done in #1095.** One principal `cath-service-prod`, `AZURE_CREDENTIALS_CFT_PROD` | Repo admin / PlatOps (done) | Run 40354863343 of `one-shot.verify-prod-credentials.yml`; `docs/GITHUB_SECRETS_SETUP.md` register |
| 2. `stage.infrastructure.yml` supports prod (subscription, AKS subscription, state store, credential) | 2.7 | Dev (PR A) | PR A checks show `State Store prod` green, then `Terraform prod` plan green. The step summary shows `Subscription: DCD-CNP-PROD`. The init log shows `mgmtstatestoreprod/mgmtstatestorecontainerprod` |
| 3. PROD Log Analytics workspace and PROD access group used; nothing PROD points at non-prod | 2.1–2.6 and the hardcode table | Dev; PlatOps names the group (Clarification 1) | The PR A prod plan contains no `1c4f0704`, `hmcts-nonprod`, `9c37fa4a`, `9a5a8d6f` or `DTS PIP Non-Prod`. After apply: `az monitor app-insights component show -g cath-prod -a cath-appinsights-prod --query workspaceResourceId -o tsv` ends with `/hmcts-prod`. `az keyvault show -n cath-prod --query "properties.accessPolicies[].objectId" -o tsv` (same for `cath-bootstrap-prod` and `cath-tp-prod`) lists only the CI SP, the PROD group, `cath-prod-mi` (app vault) and `jenkins-cftptl-intsvc-mi` |
| 4. PROD sizing agreed and applied | 2.1 sizing table, signed off | Dev proposes; service owner / PlatOps sign off (Clarification 2) | `az redis show -g cath-cache-prod -n cath-prod --query sku` returns Premium/P/1. `az postgres flexible-server show -g cath-data-prod -n cath-prod --query "{sku:sku.name, ha:highAvailability.mode, retention:backup.backupRetentionDays, geo:backup.geoRedundantBackup}"` returns GP_Standard_D2s_v3 / ZoneRedundant / 35 / Disabled, and `--query version` returns 18 |
| 5. Plan reviewed, apply succeeds from master | PR A posts the PROD plan to the PR. PR B merge applies | Dev and a reviewer (PR A); merge of PR B | PR A comment "Terraform Plan for `prod`" with an approving review. Master run after PR B: the `Terraform prod` log shows `Apply complete!`, and the run URL is linked on #1096 |
| 6. `az resource list` shows Postgres, Redis, `cathsaprod`, App Insights, three vaults, `cath` MI | Created by the existing modules, across four resource groups (Section 1) | Dev | `for g in cath-prod cath-data-prod cath-cache-prod; do az resource list -g $g --subscription DCD-CNP-PROD -o table; done` and `az identity show -g managed-identities-prod-rg -n cath-prod-mi --subscription DCD-CNP-PROD -o table`. **AC wording needs amending (Clarification 5)** |
| 7. A second master run plans no changes for prod | 3.7 | Dev | The next master run that touches `infrastructure/` or `.github/workflows/` (the PR deleting the pre-flight one-shot does this). The `Terraform prod` leg has `plan-exitcode` 0, `No changes.`, and no apply step |

## 5. Test Scenarios

There is no application code, so these are operational journeys. Each has a task in `tasks.md`.

1. **Pre-flight journey (task 2–4).** Dispatch `one-shot.preflight-prod-infra.yml` on master.
   - Every name is available, or the holder is identified.
   - `cath-prod`, `cath-data-prod` and `cath-cache-prod` do not exist. `managed-identities-prod-rg` exists. `cath-prod-mi` and `cath-cp-prod-mi` do not exist.
   - Both subnets resolve.
   - All Graph lookups succeed.
   - The role and DNS-zone checks show which grants are missing.
2. **PR plan journey (task 13).** PR A's checks:
   - aat, demo and perftest plan **No changes**, apart from the in-place Postgres `sku_name` update to `GP_Standard_D2s_v3` and `version` 16 → 18.
   - prod plans only creates (no updates or destroys), with no non-prod identifiers (AC3 grep), the expected SKUs (AC4) and no APIM or crime-federation resources.
   - The PR gets a "Terraform Plan for `prod`" comment.
3. **Master no-op journey (task 15).** Merging PR A runs aat, demo and perftest with no apply (exit code 0) and does not run prod.
4. **First apply journey (task 17).** Merging PR B runs `State Store prod` and `Terraform prod` with `Apply complete!`. The AAT deploy proceeds.
5. **Post-apply verification journey (task 18).** The AC3, AC4 and AC6 commands all return the expected values.
6. **Second no-op run journey (task 20).** The next qualifying master run plans `No changes.` for prod.
7. **Rollback journey (task 17, conditional).** If the first apply fails and can't be fixed forward the same day, revert PR B. The next master run has no prod leg and AAT deploys again. The partial PROD state is kept for the fix-forward.

## CLARIFICATIONS NEEDED

1. **PROD key vault product group.** Which Entra group gets write access (List/Set/Delete/Recover) on `cath-prod`, `cath-tp-prod` and `cath-bootstrap-prod`? It replaces `DTS PIP Non-Prod`. "No human access" is not possible with `cnp-module-key-vault`: it fails on an empty object id, and the CI principal can't be reused because of the one-policy-per-object rule. Agree the group with Platform Operations (likely an SC/JIT group). It must be a security-enabled group that the PROD principal can read in Graph.
2. **Sizing sign-off.** *Answered 2026-11-03:* Postgres runs version 18 and takes the module defaults in every environment (GP_Standard_D2s_v3, 64 GiB, automatic ZoneRedundant HA in prod, 35-day retention, **no geo-redundant backup**, no immutable backup vault enrolment). Redis is Basic C0 everywhere except prod, which is **Premium P1** in a single zone.
3. **Missing grants.** Confirm with PlatOps: (a) role assignment write in DCD-CNP-PROD for `Storage Blob Data Contributor`; (b) DNS-zone join on the Redis and Postgres private-link zones in DTS-CFTPTL-INTSVC; (c) Graph group read, if the pre-flight shows it is missing. Alternative to (a): PlatOps assign the storage role by hand and PROD sets `role_assignments = []`. Not recommended, because it diverges from non-prod.
4. **PR plans with the PROD credential.** Accept the recommendation (PR runs plan PROD, no new exposure)? Raise the GitHub Environment / read-only plan principal hardening as a follow-up story?
5. **AC6 wording.** Amend it to list `cath-prod`, `cath-data-prod`, `cath-cache-prod` and `managed-identities-prod-rg`, because the CNP Redis and Postgres modules create their own resource groups and the `cath` identity (`cath-prod-mi`) lives in the shared MI group. Or should Postgres and Redis be forced into `cath-prod` via `resource_group_name`? That diverges from every non-prod environment and is not recommended.
6. **PROD hostname.** Confirm with the PROD DNS ticket that PROD hosts are `cath-web.platform.hmcts.net` / `cath-api.platform.hmcts.net`. This matches the `platform.hmcts.net` DNS grant from #1095. The web test URL and #1161's `service_url` depend on it.
7. **CI/E2E identity in PROD.** Confirm the non-prod GitHub OIDC app (`9a5a8d6f-…`) gets nothing in PROD: no E2E vault reads, and no Monitoring Reader for watchdog. If PROD monitoring by watchdog is wanted later, it needs a PROD identity under its own ticket.
8. **Storage public network access.** `storage.tf` sets `default_action = "Allow"` for every environment. Accept this for PROD now, or raise a follow-up for private endpoints/firewall?
9. **Postgres JIT access in PROD.** The module's permission script cannot reach the private server from a GitHub runner and silently does nothing (perftest run 35854994597). So `DTS JIT Access cath DB Reader SC` will not be granted in the PROD database. Does that group exist? Should PlatOps run the grant, or should `enable_read_only_group_access = false` be set for prod to make the gap explicit?
10. **Crime Portal federation in PROD.** OK to ship with `crime_federation_enabled = false` for prod, and flip it in a follow-up once Common Platform PROD issuer/subject values are seeded as `crime-oidc-config` in `cath-prod` (#1097 / #624 PROD)?
11. **CFT Jenkins access.** Keep `jenkins-cftptl-intsvc-mi` Get on `cath-prod`? It mirrors pip-shared-infrastructures, but nothing in this repo's pipeline uses Jenkins.
12. **SDS-era names.** Can someone with read on DTS-SHAREDSERVICES-PROD run `az keyvault list-deleted` there, given the May 2026 `bootstrap-prod` job? If any target name is held there, do we wait or rename (as with ITHC)?
