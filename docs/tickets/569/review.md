# Code Review: Issue #569 – Add Azure Blob Storage to cath-service infrastructure Terraform

## Summary

The implementation covers all five files required by the ticket: `infrastructure/storage.tf` (new), `infrastructure/variables.tf` (modified), `apps/api/helm/values.yaml` (modified), `apps/web/helm/values.yaml` (modified), and `helm/cath-service/values.template.yaml` (modified). The core Terraform structure is correct and follows existing patterns in the codebase. There are no security or data-loss issues. However, there are several verifiability gaps around unconfirmed module output names, one meaningful functional concern about the `cath-crons` app being excluded, and a questionable decision to add storage secrets to the web app without evidence it needs them.

---

## CRITICAL Issues

None.

---

## HIGH PRIORITY Issues

### 1. `cnp-module-storage-account@4.x` output names are unverified — plan cannot succeed if they are wrong

**File:** `infrastructure/storage.tf`, lines 30 and 36

The KV secret values reference `module.sa.storageaccount_primary_connection_string` and `module.sa.storageaccount_name`. These names are taken directly from the plan document but have not been verified against the `4.x` branch of `cnp-module-storage-account`. If the actual output names differ (e.g., `primary_connection_string`, `storage_account_name`, or similar), `terraform plan` will fail with an "output not found" error and the deployment pipeline will break.

Required action before merge: check the `4.x` branch README or `outputs.tf` at `https://github.com/hmcts/cnp-module-storage-account/tree/4.x` and confirm both output names exactly.

### 2. `cnp-module-storage-account@4.x` input variable names `containers` and `role_assignments` are unverified

**File:** `infrastructure/storage.tf`, lines 14–25

The module is called with `containers` and `role_assignments` as input variable names. These names are assumed from the `pip-shared-infrastructures` reference pattern but have not been verified against the `4.x` module's `variables.tf`. If the module uses different names (e.g., `blob_containers`, `rbac_role_assignments`) the plan will fail. Both names must be confirmed from the module source before merge.

### 3. `cath-crons` app excluded from storage env vars without justification

**File:** `apps/crons/helm/values.yaml` — not modified

The crons app processes the same file-related workloads referenced in the ticket ("generated PDFs, media application ID proof images"). Its `values.yaml` already pulls secrets from `cath-ss-kv` via the existing pattern. If any cron job reads or writes to blob storage, it will fail at runtime with a missing env var rather than a configuration error. Either the crons app should receive `AZURE_STORAGE_CONNECTION_STRING` and `AZURE_STORAGE_ACCOUNT_NAME`, or there should be an explicit record of why it does not need them. The ticket and plan both leave this unresolved.

### 4. Storage secrets added to `cath-web` without confirmed requirement

**File:** `apps/web/helm/values.yaml`, lines 67–70

The web app receives `AZURE_STORAGE_CONNECTION_STRING` and `AZURE_STORAGE_ACCOUNT_NAME`. The plan document (section 2, note on `apps/web/helm/values.yaml`) explicitly flags this as uncertain: "add to web if needed." Adding KV secret mounts that the app does not consume is not harmless — any secret fetch failure (e.g., secret does not exist yet in a new environment) will prevent the pod from starting. This should be removed unless there is confirmed application code in the web app that reads from blob storage.

---

## SUGGESTIONS

### 1. `depends_on` on the KV secret resources may be needed

**File:** `infrastructure/storage.tf`, lines 28–38

The two `azurerm_key_vault_secret` resources reference `module.sa` (implicitly dependent) and `module.application_key_vault.key_vault_id` (implicitly dependent via the KV module). Terraform's implicit dependency graph should handle this correctly because both module outputs are referenced directly. However, the existing pattern in `keyvault-third-party.tf` (line 27) adds an explicit `depends_on = [module.third_party_key_vault]` as a defensive measure. Adding the same to both KV secret resources (`depends_on = [module.sa, module.application_key_vault]`) would make the dependency chain explicit and avoid any edge-case ordering issue during first-time apply.

### 2. `sa_access_tier = "Cool"` default may be wrong for artefacts written frequently

**File:** `infrastructure/variables.tf`, line 103

Cool tier has a minimum storage duration of 30 days and higher per-operation costs. If the `artefact` or `files` containers are written to and deleted frequently (e.g., temporary upload staging), Hot tier would be more appropriate and cheaper. This is a cost/correctness consideration to verify with the application team before the first production deployment.

### 3. Storage account name uses interpolation without validation

**File:** `infrastructure/storage.tf`, line 5

`storage_account_name = "cathsa${var.env}"` is correct for all known env values (stg=9, prod=10, ithc=10, demo=10, test=10 chars — all within the 3–24 char Azure limit). However, there is no Terraform `validation` block on `var.env` to enforce the constraint. If a new environment with a long name is introduced (e.g., a 15-character env string), the storage account name would silently exceed 24 chars. A validation block on the computed name, or a comment noting the constraint, would prevent future breakage.

### 4. `MANAGED_IDENTITY_CLIENT_ID` is injected into `cath-web` in `values.template.yaml` but the web app uses `aadIdentityName: cath` for workload identity

**File:** `helm/cath-service/values.template.yaml`, line 24

The web app's base `values.yaml` sets `aadIdentityName: cath` which is how the HMCTS Helm chart wires up the pod-managed-identity binding. `MANAGED_IDENTITY_CLIENT_ID` as a plain env var is a separate concept — it allows code using the Azure SDK to explicitly pick the client ID when `DefaultAzureCredential` is used. If the web app does not use the Azure SDK directly for blob access (i.e., it proxies through the API), then `MANAGED_IDENTITY_CLIENT_ID` in the web section is unnecessary. This should be removed if the web app does not interact with Azure services directly.

---

## Positive Feedback

- The `data "azurerm_user_assigned_identity" "app_mi"` data source is correctly reused from `keyvault.tf` — no duplicate data source, no circular dependency.
- All three container `access_type` values are correctly set to `"private"`. No public container access is present.
- The KV secret names (`storageaccount-connection-string`, `storageaccount-name`) exactly match the Helm values `name:` entries, so there is no key mismatch between Terraform and Helm.
- The `module.application_key_vault.key_vault_id` reference for the KV secrets is consistent with all other KV secrets in the codebase (`appinsights.tf`, `redis.tf`, `postgres.tf`).
- Storage account name `cathsa${env}` is well-formed — all five known env values produce valid Azure names (lowercase alphanumeric, 9–10 chars).
- The four new variables in `variables.tf` have sensible defaults that match the pip reference pattern and include descriptions.
- Template substitution syntax `"${MANAGED_IDENTITY_CLIENT_ID}"` is consistent with the existing `${TEAM_NAME}`, `${WEB_IMAGE}`, etc. in the same file.
- The `ref=4.x` branch pin matches the pip-shared-infrastructures reference pattern as specified in the ticket.

---

## Acceptance Criteria Verification

| Criterion | Status | Notes |
|-----------|--------|-------|
| `infrastructure/storage.tf` created using `cnp-module-storage-account@4.x` | PASS | File exists, correct source ref |
| Storage account named `cathsa${env}` | PASS | Line 5 of storage.tf |
| 3 private containers: `artefact`, `files`, `publications` | PASS | Lines 14–18 of storage.tf, all `access_type = "private"` |
| `cath-${env}-mi` granted `Storage Blob Data Contributor` | PASS — UNVERIFIED | `role_assignments` block present with correct role name; depends on unconfirmed module variable name |
| KV secrets `storageaccount-connection-string` and `storageaccount-name` created | PASS — UNVERIFIED | Resources present; depends on unconfirmed module output names |
| Helm values updated to inject storage env vars from KV | PASS (API), QUESTIONABLE (web) | API: confirmed; web: added without confirmed requirement; crons: not added |
| `MANAGED_IDENTITY_CLIENT_ID` injected in stg/prod template values files | PASS | Added to both `cath-web` and `cath-api` sections in `values.template.yaml` |
| `terraform plan` produces no errors | UNVERIFIABLE | Cannot verify without `terraform init` and confirmed module outputs |

---

## Overall Assessment

NEEDS CHANGES

The two HIGH PRIORITY items regarding unverified module output and input variable names are blockers — if either name is wrong, the apply will fail in the deployment pipeline. These must be confirmed from the `cnp-module-storage-account@4.x` source before merge. The crons exclusion and the speculative web app secrets should also be resolved one way or the other with a clear rationale recorded in the PR. Everything else is solid and follows existing codebase patterns correctly.
