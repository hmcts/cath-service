# Implementation Tasks – #569: Add Azure Blob Storage to cath-service infrastructure Terraform

## Implementation Tasks

- [x] Create `infrastructure/storage.tf` with `cnp-module-storage-account@4.x` module call, 3 private containers, role assignment for app MI, and 2 KV secret resources
- [x] Add storage account variables to `infrastructure/variables.tf` (`sa_account_tier`, `sa_account_kind`, `sa_account_replication_type`, `sa_access_tier`)
- [x] Add `storageaccount-connection-string` and `storageaccount-name` KV secret entries to `apps/api/helm/values.yaml`
- [x] Add `storageaccount-connection-string` and `storageaccount-name` KV secret entries to `apps/web/helm/values.yaml`
- [x] Add `MANAGED_IDENTITY_CLIENT_ID` direct env var to `helm/cath-service/values.template.yaml` under `cath-api` (and `cath-web` if applicable)
