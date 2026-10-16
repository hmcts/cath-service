# Tasks: #624 Crime Portal OIDC Federated Identity

One PR. `crime-oidc-config` is read from the bootstrap vault (`cath-bootstrap-<env>`) and must be populated in aat, demo and perftest before merge.

## Implementation Tasks

### Before starting
- [x] Resolve Clarifications 1 and 6 in plan.md (`count`; bootstrap vault, one PR)
- [ ] Confirm the CI principal's Entra permission for the app role assignment and `api.publisher.user` member types (Clarifications 3 and 7)
- [ ] Confirm no live or soft-deleted `cath-cp-*` vault exists (`az keyvault list-deleted`, `az keyvault show -n cath-cp-<env>`)
- [x] Record the `hashicorp/azuread` version resolved in the latest master `terraform init` log (v3.10.0, run 38719495336)

### Crime Portal vault, managed identity and app role
- [x] Create `infrastructure/keyvault-crime-portal.tf` with `module "kv_cp"` (`name = "${var.product}-cp-${var.env}"`, `product = "${var.product}-cp"`, `create_managed_identity = true`, same source/ref and access settings as `keyvault-third-party.tf`)
- [x] Add `data "azuread_service_principal" "cath_api"` (by `client_id` from `data.azurerm_key_vault_secret.apim_client_id[0]`), gated on `local.deploy_apim`
- [x] Add `azuread_app_role_assignment "cp_mi_publisher"` (`api.publisher.user`, principal `module.kv_cp.managed_identity_objectid[0]`), gated on `local.deploy_apim`
- [x] Add `azuread` to `required_providers` in `infrastructure/state.tf`, pinned `~> 3.10`

### Federated credentials
- [x] Create `infrastructure/tf-crime-connection-mi.tf`: locals, `data.azurerm_key_vault_secret.crime_oidc_config` (bootstrap vault), `data.azurerm_user_assigned_identity.app_cp_mi` (`depends_on = [module.kv_cp]`), `azurerm_federated_identity_credential.cath_crime_federated_connection`
- [x] Use `count = length(local.crime_oidc_json_config.connections)`
- [x] Wrap `name`, `issuer` and `subject` in `sensitive()`, and wrap `issuer`/`subject` in `trimspace()`
- [x] No `try()` fallback around `jsondecode`

### Manual step: populate secrets (before merge)
- [ ] Get final issuer/subject values from CP (correct service account for `cp-court-list-publishing-service`, PRP decision)
- [ ] Set `crime-oidc-config` in `cath-bootstrap-aat`
- [ ] Set `crime-oidc-config` in `cath-bootstrap-demo` and `cath-bootstrap-perftest` (`{"connections": []}` unless CP supplies values)
- [ ] Check each secret parses (`az keyvault secret show ... --query value -o tsv | jq .`) and names are unique
- [ ] After apply, send `cath-cp-<env>-mi` client IDs, the HMCTS tenant ID and CaTH API app ID to the CP team
- [ ] Correct the ticket's MI-provisioning, secret-location and auth-direction text

## Testing Tasks
- [x] `terraform fmt -check -recursive` in `infrastructure/` (CI: `job.terraform-fmt.yml`)
- [x] `terraform init -backend=false && terraform validate` locally (Terraform 1.15.8; local 1.5.7 fails the `>= 1.14.0` constraint)
- [ ] Review the CI plan: aat plan comment on the PR, and demo/perftest plans in the Actions logs (`stage.infrastructure.yml`). Expect vault `cath-cp-<env>`, `cath-cp-<env>-mi`, access policies, 1 app role assignment, no changes to existing resources
- [ ] aat plan: 3 federated credentials to add, name/issuer/subject shown as `(sensitive value)`; demo/perftest: 0 to add
- [ ] After apply: `az identity show -n cath-cp-aat-mi -g managed-identities-aat-rg`; check the role assignment on the CaTH API enterprise app
- [ ] After apply: `az identity federated-credential list --identity-name cath-cp-aat-mi -g managed-identities-aat-rg`, check names and exact issuer/subject (no whitespace)
- [ ] Manual end-to-end check with CP in their STE/SIT: token exchange succeeds, the decoded token has `roles: ["api.publisher.user"]` and the CaTH API audience, and `POST /cath/publication` through the aat CFT APIM returns non-401
