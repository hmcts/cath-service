# Tasks: #1096 PROD: provision cath-service infrastructure with Terraform (CNP)

Legend: **[IN-REPO]**, **[OUT-OF-BAND: PlatOps]**, **[OUT-OF-BAND: Dev]** (az run by hand), **[COORDINATION]**

## Implementation Tasks

- [x] 1. **[OUT-OF-BAND: PlatOps / Repo admin]** AC1: the PROD Terraform credential is a repo secret. **Already done in #1095.** One principal `cath-service-prod`, secret `AZURE_CREDENTIALS_CFT_PROD`, verified by run 40354863343 (2026-10-26).

### Pre-flight (must pass before any Terraform merge)

- [x] 2. (PR #1288, 2026-10-29) **[IN-REPO]** Add `.github/workflows/one-shot.preflight-prod-infra.yml`. Use the `one-shot.verify-prod-credentials.yml` style: `workflow_dispatch` only, `permissions: contents: read`, `azure/login@v3` with `AZURE_CREDENTIALS_CFT_PROD`, `set -euo pipefail`, read-only, a PASS/FAIL line per check, and "run once from master, then delete". **Recommended over a hand run.** It checks what the *PROD principal* can see and do (Graph, RBAC, subnets), which a developer's own login cannot prove. It also leaves the evidence in the run log. Steps, with `SUB_ID=$(az account show -s DCD-CNP-PROD --query id -o tsv)`:
  - **Key vault names (global):**
    ```sh
    for n in cath-prod cath-bootstrap-prod cath-tp-prod; do
      az rest --method post \
        --uri "https://management.azure.com/subscriptions/${SUB_ID}/providers/Microsoft.KeyVault/checkNameAvailability?api-version=2023-07-01" \
        --body "{\"name\":\"${n}\",\"type\":\"Microsoft.KeyVault/vaults\"}" \
        --query "{name:'${n}', available:nameAvailable, reason:reason, message:message}" -o table
    done
    ```
  - **Soft-deleted vaults visible to the principal:** `az keyvault list-deleted --subscription <S> --resource-type vault --query "[?starts_with(name,'cath-')].{name:name, deleted:properties.deletionDate, purge:properties.scheduledPurgeDate, protected:properties.purgeProtectionEnabled}" -o table`, for S in DCD-CNP-PROD and DCD-CFTAPPS-PROD.
  - **Storage account name:** `az storage account check-name --name cathsaprod --query "{available:nameAvailable, reason:reason}" -o table`
  - **Postgres and Redis global names:**
    - `az rest --method post --uri "https://management.azure.com/subscriptions/${SUB_ID}/providers/Microsoft.DBforPostgreSQL/checkNameAvailability?api-version=2022-12-01" --body '{"name":"cath-prod","type":"Microsoft.DBforPostgreSQL/flexibleServers"}'`
    - `az rest --method post --uri "https://management.azure.com/subscriptions/${SUB_ID}/providers/Microsoft.Cache/CheckNameAvailability?api-version=2023-08-01" --body '{"name":"cath-prod","type":"Microsoft.Cache/Redis"}'`
  - **Resource groups:**
    - `az group exists -n <rg> --subscription DCD-CNP-PROD` must be `false` for `cath-prod`, `cath-data-prod` and `cath-cache-prod`, and `true` for `managed-identities-prod-rg`.
    - `az identity show -g managed-identities-prod-rg -n cath-prod-mi` and `-n cath-cp-prod-mi` must return not found.
  - **Subnets:**
    - `az network vnet subnet show -g cft-prod-network-rg --vnet-name cft-prod-vnet -n postgres-expanded --subscription DCD-CFTAPPS-PROD --query "{id:id, delegation:delegations[0].serviceName}"`
    - `az network vnet subnet show -g core-infra-prod --vnet-name core-infra-vnet-prod -n core-infra-subnet-2-prod --subscription DCD-CNP-PROD --query id`. If this fails, try the other PROD subscriptions and record where it lives. That decides `core_infra_subscription_id`.
  - **Log Analytics:** `az monitor log-analytics workspace show -g oms-automation -n hmcts-prod --subscription DCD-CNP-PROD --query id`
  - **Private DNS zone rights:** for `privatelink.redis.cache.windows.net` and `private.postgres.database.azure.com` in `core-infra-intsvc-rg` / DTS-CFTPTL-INTSVC, run:
    - `az network private-dns zone show` (read)
    - `az role assignment list --assignee <clientId> --scope <zoneId> --include-inherited --query "[].roleDefinitionName" -o tsv` (expect Private DNS Zone Contributor or equivalent)
  - **Role-assignment write:** `az role assignment list --assignee <clientId> --all --subscription DCD-CNP-PROD --query "[].roleDefinitionName" -o tsv`. Check it for `Owner`, `User Access Administrator` or `Role Based Access Control Administrator`. Contributor alone fails the storage module's role assignment.
  - **Graph lookups:**
    - `az ad group show --group "<name>" --query id -o tsv` for `DTS Platform Operations PostgreSQL Admin Access SC`, `DTS Production DB Reporting`, `DTS CFT Developers`, `DTS JIT Access cath DB Reader SC` (informational) and the PROD product group from task 6
    - `az ad sp list --display-name jenkins-cftptl-intsvc-mi --query "[].id" -o tsv`
  - **State blob absent:** `az storage blob exists --account-name mgmtstatestoreprod --account-key <masked key> --container-name mgmtstatestorecontainerprod --name cath-service/prod/terraform.tfstate`. Mask the key and never print it.
  Run `actionlint`, open a PR and merge it. `workflow_dispatch` only appears once the file is on master.
- [ ] 3. **[OUT-OF-BAND: Dev]** Dispatch the pre-flight from master (Test Scenario 1). Record the run URL and results on #1096.
- [x] 4. (Done 2026-10-27: "Manage deleted key vaults" for DTS-SHAREDSERVICES-PROD is empty. The only PROD bootstrap job ever run was a failed Terraform Plan on PR run 26164571286, so nothing was created. Main runs 20–22 May show no Bootstrap PROD job.) **[OUT-OF-BAND: Dev / anyone with SDS PROD read]** Clarification 12. The PROD principal cannot see DTS-SHAREDSERVICES-PROD, so run there by hand: `az keyvault list-deleted --subscription DTS-SHAREDSERVICES-PROD --resource-type vault --query "[?starts_with(name,'cath-')]" -o table` and `az keyvault list --subscription DTS-SHAREDSERVICES-PROD --query "[?starts_with(name,'cath-')].name"`. **If any target name is held anywhere: stop.** Raise wait-vs-rename with the user, as for ITHC (#1067). Do not delete or purge anything.

### Agreements and grants

- [ ] 5. (PR A uses Postgres GP_Standard_D2s_v3 / 64 GiB for aat and prod per the user, other environments unchanged; Redis Standard C1 and geo-redundant backup on still need sign-off before PR B) **[COORDINATION]** Get sizing signed off (plan 2.1 table, Clarification 2): Redis Standard C1, Postgres D2ds_v4, automatic ZoneRedundant HA, 35-day retention, **geo-redundant backup on (irreversible)**, no immutable-vault enrolment.
- [ ] 6. (PR A has the placeholder `TODO-1096-PROD-KEY-VAULT-GROUP` in `env-config.tf`) **[COORDINATION]** Agree the PROD key vault product group with Platform Operations (Clarification 1). Record its exact display name.
- [ ] 7. **[COORDINATION]** Settle Clarifications 4, 5, 6, 7, 8, 9, 10 and 11. AC6 wording (5) is updated on the issue by the author.
- [ ] 8. **[OUT-OF-BAND: PlatOps]** From the pre-flight results, request the missing grants on DTSPO-35946 (plan 3.5):
  - (a) Role Based Access Control Administrator on DCD-CNP-PROD, with a condition limited to Storage Blob Data Contributor
  - (b) Private DNS Zone Contributor (or join) on `privatelink.redis.cache.windows.net` and `private.postgres.database.azure.com` (`core-infra-intsvc-rg`, DTS-CFTPTL-INTSVC)
  - (c) Graph group read, only if task 3 showed it failing

  Re-run the pre-flight once granted. Update `docs/GITHUB_SECRETS_SETUP.md` "AZURE_CREDENTIALS_CFT_PROD scopes" with the new grants.

### PR A: Terraform and pipeline, PROD plan-only

- [x] 9. (PR A) **[IN-REPO]** `infrastructure/env-config.tf`:
  - add the `prod` entry and `crime_federation_enabled` on every entry
  - add `is_prod`, `key_vault_product_group_name` (the group from task 6), `grant_e2e_access`, `platform_domain`, `crime_federation_enabled`
  - add `default_sizing`, `sizing_overrides.prod` and `sizing` (task 5 values)
  - set `log_analytics_subscription_id` from the module
  - rewrite the "Sizing is NOT here" paragraph and the nonprod-only comments
- [x] 10. (PR A) **[IN-REPO]** Terraform resource files (plan 2.2–2.6):
  - `appinsights.tf`: `module "log_analytics_workspace"`, data source from the module outputs, web test URL via `platform_domain`, e2e role assignment `count` plus `moved`
  - `keyvault.tf`: product group local, e2e policy `count` plus `moved`
  - `keyvault-third-party.tf`: product group local
  - `keyvault-bootstrap.tf`: `product_group_name` local in place of the object id, e2e policy `count` plus `moved`, comment rewritten
  - `variables.tf`: delete `pip_nonprod_group_object_id`
  - `redis.tf` and `postgres.tf`: `local.sizing.*`, plus `geo_redundant_backups`
  - `tf-crime-connection-mi.tf`: gated data source and `crime_oidc_connections` local
  - `apim.tf`: `service_url` via `platform_domain`
- [x] 11. (PR A) **[IN-REPO]** `.github/workflows/stage.infrastructure.yml` (plan 2.7):
  - add `prod` to the five `fromJson` lookups
  - per-leg `matrix.environment == 'prod' && secrets.AZURE_CREDENTIALS_CFT_PROD || secrets.AZURE_CREDENTIALS_CFT_PREVIEW` in `state-store-init` `creds` and in the `terraform` job's `secrets`
  - `post-plan-to-pr` for `aat || prod`
  - update the comments
- [x] 12. (PR A) **[IN-REPO]** `.github/workflows/workflow.preview.yml`: `environments: '["aat","demo","perftest","prod"]'`, comment updated. **Do not touch `workflow.main.yml` in PR A.** Run `terraform fmt -recursive infrastructure` and `actionlint`. Open PR A.
- [ ] 13. **[COORDINATION]** Test Scenario 2. Review PR A's checks:
  - aat, demo and perftest show **No changes**. Any create or destroy there blocks the merge.
  - prod plan: creates only.
  - Grep the prod plan log for `1c4f0704|hmcts-nonprod|9c37fa4a|9a5a8d6f|DTS PIP Non-Prod`; expect no hits.
  - SKUs match task 5.
  - No `apim_*`, `azurerm_federated_identity_credential` or `e2e` resources.

  A second reviewer approves the "Terraform Plan for `prod`" comment (AC5, first half).
- [ ] 14. **[IN-REPO]** Merge PR A.
- [ ] 15. **[COORDINATION]** Test Scenario 3. Confirm the master run for PR A planned aat, demo and perftest with exit code 0 and ran no prod leg.

### PR B: first PROD apply

- [ ] 16. **[IN-REPO]** PR B: `workflow.main.yml` `environments: '["aat","demo","perftest","prod"]'`, comment updated. Precondition: tasks 3, 4, 8 and 13 are green. Agree up front that **reverting PR B is the rollback** if the apply fails and can't be fixed forward the same day (plan 3.6).
- [ ] 17. **[COORDINATION]** Test Scenarios 4 and 7. Merge PR B. Watch `State Store prod` and `Terraform prod` through to `Apply complete!` and confirm the AAT deploy still proceeds. If the apply fails:
  - read the error against plan 3.1–3.5
  - fix forward, or revert PR B
  - never delete a partially created PROD key vault

  For a stuck lease, use the plan 3.3 command only after confirming no run is active. Link the run on #1096 (AC5, second half).
- [ ] 18. **[OUT-OF-BAND: Dev]** Test Scenario 5. Run the AC3, AC4 and AC6 verification commands from plan Section 4. Post the output on #1096: `az resource list` for `cath-prod`, `cath-data-prod` and `cath-cache-prod`, plus `az identity show` for `cath-prod-mi`.

### Close-out

- [ ] 19. **[IN-REPO]** Delete `one-shot.preflight-prod-infra.yml`. This PR touches `.github/workflows/`, so its master run re-plans every environment, which gives AC7's second run.
- [ ] 20. **[COORDINATION]** Test Scenario 6. On that master run, confirm `Terraform prod` reports `No changes.` (plan-exitcode 0). If it does not, investigate per plan 3.7 and fix in code before closing.
- [ ] 21. **[COORDINATION]** Hand-offs, as comments on the issues:
  - #1097: seed secrets into `cath-prod`, including `crime-oidc-config`, then flip `crime_federation_enabled` for prod
  - #1161: APIM `apim_suffix = "prod"` and `body_bytes = 0`
  - #1099: deploy, using `cath-prod-mi` / `aadIdentityName: cath`
  - the PROD DNS ticket: hostname, per Clarification 6
  - follow-ups for Clarifications 4, 8 and 9
