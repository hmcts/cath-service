# Tasks: #620 Create APIM Testing-Support API for cath-service

Infrastructure only, one PR. Token validation is inline in each operation policy using the same `validate-azure-ad-token` as `cath-api` (`resources/api-policy/api-policy.xml`), without its `api.publisher.user` role claim. There is no shared policy fragment and no dependency on #619.

## Implementation Tasks

### Before starting
- [x] Decide token validation approach (user decision: no `cath-jwt-validation` fragment; validate directly in each operation policy with the same `validate-azure-ad-token` as `cath-api`, no role check)

### Gate
- [x] In `infrastructure/env-config.tf`, add `deploy_apim_testing_support = local.deploy_apim && contains(["aat", "demo", "perftest"], var.env)` inside the existing `locals` block, after `apim_rg`, with a one-line "why" comment

### Resources
- [x] Create `infrastructure/resources/testing-support/api-policy/api-policy.xml` (passthrough, `<base />` in each of the four sections)
- [x] Create `infrastructure/resources/testing-support/swagger/api-swagger.json`: OpenAPI 3.0.3, no `servers` block, four operations with operationIds `thirdPartyHealthCheck`, `thirdPartyNewPublication`, `thirdPartyUpdatePublication`, `thirdPartyDeletePublication`, `bearerAuth` security scheme, `publicationId` uuid path parameter, responses 200 and 401 only
- [x] Create the four files in `infrastructure/resources/testing-support/operation-policies/`, named exactly after the operationIds: `validate-azure-ad-token` (same attributes as `cath-api`'s policy, audience `${client_id}`, tenant `${tenant_id}`, 401, no `required-claims`), `<cors>` with the operation's method, `return-response` 200 JSON with the description from pip, then `<base />` (as in pip)

### Terraform
- [x] Create `infrastructure/apim-testing-support.tf` with `module.apim_api_testing_support` (`cath-testing-support-api`, path `cath/testing-support`, `ref=master`, `azurerm.cftapps`, `service_url` as in `apim.tf`, `swagger_url = file(...)`)
- [x] Add `module.apim_api_testing_support_policy` using `file()` on the passthrough API policy
- [x] Add the operation-policy local (`fileset` on `resources/testing-support/operation-policies/*.xml`, gated to `{}`, rendered with `templatefile()` using `data.azurerm_key_vault_secret.apim_tenant_id[0]` / `apim_client_id[0]`) and `azurerm_api_management_api_operation_policy.apim_testing_support_operation_policy`
- [x] Add `azurerm_api_management_api_diagnostic.testing_support` using `azurerm_api_management_logger.apim[0].id`, 25% sampling, no body or header logging
- [x] Confirm the only existing file modified is `env-config.tf`; `apim.tf`, `apim-operation.tf` and `resources/api-policy/api-policy.xml` stay as they are
- [x] Remove the `cath-jwt-validation` fragment (`apim-policy-fragment.tf`, `resources/policy-fragments/`) and the operation-policy `depends_on` on it

### Follow-up outside this PR
- [ ] Update #620's issue text: operation policies validate inline with `validate-azure-ad-token` (same as `cath-api`, no role claim) and are rendered with `templatefile()`, not the `cath-jwt-validation` fragment from #619, and #619 is no longer a dependency (left for the human: GitHub issues are not edited by the implementation run)
- [ ] Tell the owner of #619 that no shared `cath-jwt-validation` fragment will exist, so its OTP API needs its own token validation (left for the human)

## Testing Tasks
- [x] `terraform fmt -check -recursive` in `infrastructure/` (passed, no file needs formatting; re-run after the fragment removal)
- [x] `terraform init -backend=false && terraform validate` (run on local 1.13.3, not 1.15.8, in a temp copy of `infrastructure/` with the `required_version` and backend block removed from the copy only; valid, 0 errors, 5 "Reference to undefined provider" warnings, 3 from the existing `apim.tf` modules; CI on 1.15.8 remains the authoritative run)
- [x] Check the swagger is valid JSON and all XML files are well formed; confirm the four swagger operationIds match the four XML filenames exactly (`xmllint --noout` OK on the 5 XML files, operationIds equal the 4 filenames)
- [x] Confirm the operation XMLs render through `templatefile()` without error (rendered with dummy ids in a standalone terraform config: no `${` left, `tenant-id` attribute and audience set, C# `@{ }` blocks intact)
- [x] Confirm the `local ? {...[0]...} : {}` pattern is safe when the gate is off (the unselected branch's `[0]` is not evaluated)
- [x] Confirm the `validate-azure-ad-token` element in each of the four operation XMLs has attributes identical to `cath-api`'s (`api-policy.xml`) and no `required-claims`; `cors`, `return-response` and `<base />` match pip's files
- [x] Confirm `validate-jwt`, `openid-config` and `<issuer` no longer appear under `infrastructure/resources/testing-support` (no matches)
- [x] `grep` the new `.tf` for `sds-api-mgmt`, `ss-`, `data_client_id`, `local.env` (no matches); `grep` `infrastructure/` for `fragment` (no matches)
- [x] `terraform console`: gate is true for `aat`, `demo`, `perftest` and false for `ithc` and `prod` (verified earlier against the unchanged `env-config.tf` line)
- [ ] Review the CI plan: aat PR comment, and demo/perftest plans in the Actions logs. Expect additions only (API, API policy, 4 operation policies, diagnostic) and no changes to `cath-api`, its API policy, the product or the logger (post-deploy / CI only)
- [ ] After apply in aat: `GET /cath/testing-support/third-party` with a valid token (audience `cath-service-api-client-id`) returns 200 "Successful health check." (post-deploy / CI only)
- [ ] After apply in aat: POST, PUT and DELETE return 200 with the expected descriptions (post-deploy / CI only)
- [ ] After apply in aat: all four operations return 401 with no token, with an invalid token, and with a validly signed token for a different audience (post-deploy / CI only)
- [ ] After apply in aat: `cath-api` `POST /cath/publication` and `GET /cath/` still behave as before (no routing change from the nested path) (post-deploy / CI only)
- [ ] Manual `terraform plan` with `env=ithc` (if state access allows) shows no testing-support resources (post-deploy / CI only; needs Azure credentials and state; the gate itself is verified false for ithc)
