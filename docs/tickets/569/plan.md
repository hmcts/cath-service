# Technical Plan: #569 – Add Azure Blob Storage to cath-service infrastructure Terraform

## 1. Technical Approach

Provision Azure Blob Storage for cath-service by:
1. Creating `infrastructure/storage.tf` using `cnp-module-storage-account@4.x` — the same pattern used by `pip-shared-infrastructures`
2. Adding storage-related variables to `infrastructure/variables.tf`
3. Writing Key Vault secrets (connection string + account name) into the existing application KV
4. Updating the API and web Helm `values.yaml` to mount those secrets as environment variables
5. Adding `MANAGED_IDENTITY_CLIENT_ID` as a direct env var in the stg/prod Helm template

The existing `data "azurerm_user_assigned_identity" "app_mi"` in `keyvault.tf` already looks up `cath-${var.env}-mi` from `managed-identities-${var.env}-rg`. This can be referenced directly — no new data source or managed identity is needed.

## 2. Implementation Details

### Files to create

**`infrastructure/storage.tf`**

```hcl
module "sa" {
  source = "git::https://github.com/hmcts/cnp-module-storage-account?ref=4.x"

  env                     = var.env
  storage_account_name    = "cathsa${var.env}"
  resource_group_name     = azurerm_resource_group.rg.name
  location                = var.location
  account_kind            = var.sa_account_kind
  account_tier            = var.sa_account_tier
  account_replication_type = var.sa_account_replication_type
  access_tier             = var.sa_access_tier
  common_tags             = var.common_tags

  # 3 private blob containers
  containers = [
    { name = "artefact", access_type = "private" },
    { name = "files",    access_type = "private" },
    { name = "publications", access_type = "private" },
  ]

  # Grant existing app managed identity Storage Blob Data Contributor
  role_assignments = [
    {
      role_definition_name = "Storage Blob Data Contributor"
      principal_id         = data.azurerm_user_assigned_identity.app_mi.principal_id
    }
  ]
}

resource "azurerm_key_vault_secret" "storageaccount_connection_string" {
  name         = "storageaccount-connection-string"
  value        = module.sa.storageaccount_primary_connection_string
  key_vault_id = module.application_key_vault.key_vault_id
}

resource "azurerm_key_vault_secret" "storageaccount_name" {
  name         = "storageaccount-name"
  value        = module.sa.storageaccount_name
  key_vault_id = module.application_key_vault.key_vault_id
}
```

### Files to modify

**`infrastructure/variables.tf`** — append 4 SA variables:

```hcl
variable "sa_account_tier" {
  description = "Storage account tier"
  type        = string
  default     = "Standard"
}

variable "sa_account_kind" {
  description = "Storage account kind"
  type        = string
  default     = "StorageV2"
}

variable "sa_account_replication_type" {
  description = "Storage account replication type"
  type        = string
  default     = "RAGRS"
}

variable "sa_access_tier" {
  description = "Storage account access tier"
  type        = string
  default     = "Cool"
}
```

**`apps/api/helm/values.yaml`** — add storage KV secrets under `keyVaults.cath-ss-kv.secrets`:

```yaml
- name: storageaccount-connection-string
  alias: AZURE_STORAGE_CONNECTION_STRING
- name: storageaccount-name
  alias: AZURE_STORAGE_ACCOUNT_NAME
```

**`apps/web/helm/values.yaml`** — same additions (if the web app reads blobs directly; omit if only the API does — the ticket says "application files" broadly, so add to API at minimum; add to web if needed).

**`helm/cath-service/values.template.yaml`** (stg/prod template) — add `MANAGED_IDENTITY_CLIENT_ID` as a direct environment variable under the `cath-api` section (and `cath-web` if applicable):

```yaml
cath-api:
  nodejs:
    environment:
      MANAGED_IDENTITY_CLIENT_ID: "${MANAGED_IDENTITY_CLIENT_ID}"
```

## 3. Key Technical Decisions

- **Storage account name** `cathsa${env}` satisfies Azure's 3–24 char, lowercase alphanumeric constraint for all envs (`cathsastg`, `cathsaprod`, `cathsaithc`, `cathsademo`, `cathsatest`).
- **`data "azurerm_user_assigned_identity" "app_mi"`** is already declared in `keyvault.tf` with `depends_on = [module.application_key_vault]`. The `storage.tf` module call uses `data.azurerm_user_assigned_identity.app_mi.principal_id` directly — no circular dependency since keyvault is a prerequisite.
- **KV secrets** go into `module.application_key_vault` (the `cath-ss-kv-${env}` vault) which is already mounted by the app pods.
- **`cnp-module-storage-account` version pin**: use `?ref=4.x` matching pip-shared-infrastructures.

## 4. Acceptance Criteria Mapping

| Criterion | How satisfied |
|-----------|--------------|
| `infrastructure/storage.tf` created using `cnp-module-storage-account@4.x` | New file with `module "sa"` |
| Storage account named `cathsa${env}` | `storage_account_name = "cathsa${var.env}"` |
| 3 private containers: `artefact`, `files`, `publications` | `containers` list in module |
| `cath-${env}-mi` granted `Storage Blob Data Contributor` | `role_assignments` block using existing `app_mi` data source |
| KV secrets `storageaccount-connection-string` and `storageaccount-name` | Two `azurerm_key_vault_secret` resources |
| Helm values updated to inject storage env vars from KV | Added to `apps/api/helm/values.yaml` (and web if applicable) |
| `MANAGED_IDENTITY_CLIENT_ID` injected in stg/prod template | Added to `helm/cath-service/values.template.yaml` |
| `terraform plan` produces no errors | Verified by correct module refs and existing data sources |

## 5. Open Questions / Clarifications Needed

- **Does the web app need `AZURE_STORAGE_*` env vars?** The ticket mentions "generated PDFs, media application ID proof images" which could be read by either app. If web only serves pre-generated content from the API, only the API needs the vars. Added to both apps conservatively.
- **`cnp-module-storage-account` exact container API**: the module's `containers` variable name and `role_assignments` schema should be verified against the `4.x` branch README before applying — the exact variable names may differ slightly from the pattern shown above.
- **`MANAGED_IDENTITY_CLIENT_ID` value**: this is the client ID of `cath-${env}-mi`. The ticket implies it should be the environment-specific value injected at deploy time via the template substitution variable `${MANAGED_IDENTITY_CLIENT_ID}`.
