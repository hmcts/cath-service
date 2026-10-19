# Tasks: #624 Crime Portal OIDC Federated Identity

One PR. `crime-oidc-config` is read from the app vault (`cath-<env>`) and must be populated in aat, demo and perftest before merge.

## Implementation Tasks

### Before starting
- [x] Resolve Clarifications 1 and 6 in plan.md (`count`; app vault, one PR)

### Managed identity
- [x] Create `azurerm_user_assigned_identity.app_cp_mi` (`cath-cp-<env>-mi` in `managed-identities-<env>-rg`) directly, with no Crime Portal vault

### App role (manual, after apply)
- [ ] Ask an Entra admin to assign `cath-cp-<env>-mi` the `api.publisher.user` app role on the CaTH API enterprise app, per environment (see plan.md decision 4)

### Federated credentials
- [x] Create `infrastructure/tf-crime-connection-mi.tf`: locals, `data.azurerm_key_vault_secret.crime_oidc_config` (app vault), `azurerm_federated_identity_credential.cath_crime_federated_connection`
- [x] Use `count = length(local.crime_oidc_json_config.connections)`
- [x] Wrap `name`, `issuer` and `subject` in `sensitive()`, and wrap `issuer`/`subject` in `trimspace()`
- [x] No `try()` fallback around `jsondecode`

### Manual step: populate secrets (before merge)
- [ ] Get final issuer/subject values from CP (correct service account for `cp-court-list-publishing-service`, PRP decision)
- [ ] Set `crime-oidc-config` in `cath-aat`
- [ ] Set `crime-oidc-config` in `cath-demo` and `cath-perftest` (`{"connections": []}` unless CP supplies values)
- [ ] Check each secret parses (`az keyvault secret show ... --query value -o tsv | jq .`) and names are unique
- [ ] After apply, send `cath-cp-<env>-mi` client IDs, the HMCTS tenant ID and CaTH API app ID to the CP team
- [ ] Correct the ticket's MI-provisioning, secret-location and auth-direction text

## Testing Tasks
- [x] `terraform fmt -check -recursive` in `infrastructure/` (CI: `job.terraform-fmt.yml`)
- [x] `terraform init -backend=false && terraform validate` locally (Terraform 1.15.8; local 1.5.7 fails the `>= 1.14.0` constraint)
- [ ] Review the CI plan: aat plan comment on the PR, and demo/perftest plans in the Actions logs (`stage.infrastructure.yml`). Expect `cath-cp-<env>-mi` and one federated credential per connection, no changes to existing resources
- [ ] aat plan: 3 federated credentials to add, name/issuer/subject shown as `(sensitive value)`; demo/perftest: 0 to add
- [ ] After apply: `az identity show -n cath-cp-aat-mi -g managed-identities-aat-rg`; check the role assignment on the CaTH API enterprise app
- [ ] After apply: `az identity federated-credential list --identity-name cath-cp-aat-mi -g managed-identities-aat-rg`, check names and exact issuer/subject (no whitespace)
- [ ] Manual end-to-end check with CP in their STE/SIT: token exchange succeeds, the decoded token has `roles: ["api.publisher.user"]` and the CaTH API audience, and `POST /cath/publication` through the aat CFT APIM returns non-401
