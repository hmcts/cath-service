# #569: Add Azure Blob Storage to cath-service infrastructure Terraform

**State:** OPEN
**Assignees:** junaidiqbalmoj
**Author:** junaidiqbalmoj
**Labels:** none
**Created:** 2026-05-12T11:00:17Z
**Updated:** 2026-06-18T13:06:05Z

## Description

## User Story

As a platform engineer, I want Azure Blob Storage provisioned for the cath-service so that application files (publication JSON, generated PDFs, media application ID proof images) can be stored in durable cloud storage rather than the local pod filesystem.

## Background

Currently all file storage in cath-service writes to the local filesystem (`storage/temp/uploads`, `storage/temp/files`). Files are lost on every Kubernetes pod restart or redeployment. Azure Blob Storage is the correct durable store for these files.

Both `pip-data-management` and `pip-account-management` use a shared storage account provisioned in [`pip-shared-infrastructures`](https://github.com/hmcts/pip-shared-infrastructures) via `cnp-module-storage-account@4.x`. cath-service needs its own equivalent.

## Infrastructure Changes Required

### 1. New `infrastructure/storage.tf`

Create using `cnp-module-storage-account@4.x` with:

- **Storage account name**: `cathsa${env}` → e.g. `cathsastg`, `cathsaprod`, `cathsaithc`, `cathsademo`, `cathsatest`
- **3 private blob containers**: `artefact`, `files`, `publications`
- **Managed identity access**: reference the existing `cath-${var.env}-mi` (created by `cnp-module-key-vault` when `create_managed_identity = true`) via a `data "azurerm_user_assigned_identity"` lookup in `managed-identities-${var.env}-rg`. Grant it `Storage Blob Data Contributor` role.
- **No separate managed identity is needed** — the existing KV module MI is reused (same pattern as pip-shared-infrastructures)
- Standard settings: StorageV2, Standard tier, RAGRS replication, Cool access tier

### 2. Update `infrastructure/variables.tf`

Add storage account configuration variables (with defaults matching pip pattern):
- `sa_account_tier` — default `"Standard"`
- `sa_account_kind` — default `"StorageV2"`
- `sa_account_replication_type` — default `"RAGRS"`
- `sa_access_tier` — default `"Cool"`

### 3. Add Key Vault secrets

Add `azurerm_key_vault_secret` resources to store:
- `storageaccount-connection-string` → `module.sa.storageaccount_primary_connection_string`
- `storageaccount-name` → `module.sa.storageaccount_name`

### 4. Update Helm values

Update `apps/*/helm/values.yaml` (stg/prod) to inject from Key Vault:
- `storageaccount-name` → alias `AZURE_STORAGE_ACCOUNT_NAME`
- `storageaccount-connection-string` → alias `AZURE_STORAGE_CONNECTION_STRING`

Add `MANAGED_IDENTITY_CLIENT_ID` as a direct environment variable in `values.stg.template.yaml` / `values.prod.template.yaml` (same pip pattern — not from Key Vault, injected directly as the MI client ID for the environment).

## Reference

- `pip-shared-infrastructures/tf-sa-main.tf` — storage account module call
- `pip-shared-infrastructures/main.tf` — `data "azurerm_user_assigned_identity" "app_mi"` pattern
- `pip-shared-infrastructures/tf-kv-secrets.tf` — Key Vault secrets
- `pip-data-management/charts/pip-data-management/values.yaml` — Helm values pattern

## Acceptance Criteria

- [ ] `infrastructure/storage.tf` created using `cnp-module-storage-account@4.x`
- [ ] Storage account named `cathsa${env}` (e.g. `cathsastg`, `cathsaprod`)
- [ ] 3 private containers provisioned: `artefact`, `files`, `publications`
- [ ] Existing `cath-${env}-mi` managed identity granted `Storage Blob Data Contributor` role on the storage account
- [ ] Key Vault secrets `storageaccount-connection-string` and `storageaccount-name` created
- [ ] Helm values updated to inject storage env vars from Key Vault
- [ ] `MANAGED_IDENTITY_CLIENT_ID` injected in stg/prod template values files
- [ ] `terraform plan` produces no errors

## Comments

No comments on this issue.
