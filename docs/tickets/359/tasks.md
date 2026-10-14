# #359: Create Azure API Management (APIM) Infrastructure - Tasks

## Implementation Tasks

### Pre-implementation gates
- [ ] Get PlatOps confirmation of the instance and RG per env: `cft-api-mgmt-stg` / `cft-aat-network-rg` (aat), `cft-api-mgmt-demo` / `cft-demo-network-rg` (demo), `cft-api-mgmt-test` / `cft-perftest-network-rg` (perftest). This overrides the ticket's `cft-<apim_env>-network-rg`.
- [ ] Get confirmation that the `AZURE_CREDENTIALS_CFT_PREVIEW` service principal has API Management Service Contributor (or equivalent) on all three instances
- [ ] Agree answers to Clarifications Q1-Q4, the spec import mode (Q6) and the rate limit value (Q14)
- [ ] Check that `app-tenant-id` and `cath-service-api-client-id` exist in `cath-aat`, `cath-demo` and `cath-perftest`

### Terraform
- [x] `infrastructure/env-config.tf`: add `apim_suffix` to every `env_config` entry (`stg`, `demo`, `null` for ithc, `test`). Add the `apim_suffix`, `deploy_apim`, `apim_name`, `apim_rg` and `apim_operations` (path => method => APIM operationId) locals to the existing `locals` block.
- [x] `infrastructure/apim.tf`: add the `azurerm.cftapps` provider alias on `var.aks_subscription_id`
- [x] `infrastructure/apim.tf`: add count-gated `data "azurerm_key_vault_secret"` for `app-tenant-id` and `cath-service-api-client-id` against `module.key_vault.key_vault_id`
- [x] `infrastructure/apim.tf`: add the `openapi_spec` / `apim_openapi` locals (yamldecode `../docs/api/openapi.yaml`, keep only `apim_operations` with their APIM operationIds, drop `servers`, jsonencode)
- [x] `infrastructure/apim.tf`: add `module "apim_product"` (`cnp-module-api-mgmt-product`, `name = "cath"`, `approval_required = false`, `subscription_required = false`, `providers = { azurerm = azurerm.cftapps }`, count-gated)
- [x] `infrastructure/apim.tf`: add `module "apim_api"` (`cath-api`, `CaTH API`, path `cath`, `revision = "1"`, https only, `service_url = https://cath-api.${var.env}.platform.hmcts.net`, `content_format = "openapi+json"`, `swagger_url = local.apim_openapi`, `subscription_required = false`, count-gated)
- [x] `infrastructure/apim.tf`: add `module "apim_api_policy"` with `templatefile()` of the policy XML (tenant_id, key_vault_uri), count-gated; grant the APIM managed identity `Get` on the cath key vault
- [x] `infrastructure/apim.tf`: add a precondition or `check` that the filtered spec has at least one path
- [x] Use `git::https://...?ref=master` module sources (Q12: no tags upstream; tracking master, matching hmcts/fact-data-api)
- [x] `infrastructure/resources/product-policy/product-policy.xml`: `rate-limit-by-key` (600/min) keyed on the token's `azp`/`appid`, passed to the product module as `product_policy`
- [x] `infrastructure/resources/api-policy/api-policy.xml`: PIP token-swap design (per HLD). `validate-azure-ad-token` on the supplier token (audience, `roles` contains `api.publisher.user`), then a cached client-credentials token for `cath-service-api-client-id` replaces Authorization (client ID, secret and scope are all read from the cath key vault at runtime, not templated into the XML); backend 401/403 clears the cache and returns 502; 401 uses APIM's default `Access denied due to invalid OAuth information` body
- [x] `infrastructure/apim-logger.tf`: add a dedicated `azurerm_application_insights` `cath-apim-appinsights-<env>` and `azurerm_api_management_logger` `cath-apim-appinsights-logger` pointing at it (provider `azurerm.cftapps`, count-gated), replacing `cath-appinsights-logger`
- [x] `infrastructure/apim-logger.tf`: add `azurerm_api_management_api_diagnostic` matching pip-data-management (`identifier = "applicationinsights"`, sampling 100, `verbose`, `log_client_ip`, `always_log_errors`, W3C, PIP header lists, `body_bytes = 8192`); never log Authorization, body bytes 0 in prod
- [x] Run `terraform fmt -recursive infrastructure` and `terraform validate` locally

### Spec and workflows
- [x] `docs/api/openapi.yaml`: add the `https://cft-api-mgmt.{environment}.platform.hmcts.net/cath` server entry after the `cath-api` entry (enum aat, demo, perftest)
- [x] `docs/api/openapi.yaml`: add the APIM 401 example to `/v1/publication`, note that a missing role returns 401 via APIM, and update `info.description` / the cath-api server description to name the gateway as the preferred entry point
- [x] Run `yarn openapi:json /tmp/openapi.json` to confirm the spec still converts
- [x] `.github/workflows/workflow.main.yml`: add `docs/api/openapi\.yaml` to the `detect-infra-changes` paths regex
- [x] `.github/workflows/workflow.preview.yml`: add `docs/api/openapi\.yaml` to the `detect-infra-changes` paths regex

### PR verification
- [ ] Check the PR plans for aat, demo and perftest: only `module.apim_*[0]`, `azurerm_api_management_logger.cath[0]` and `azurerm_api_management_api_diagnostic.cath[0]` are added, with no changes to existing resources
- [x] Confirm the plan shows no APIM resources when `env_config` resolves `apim_suffix = null` (ithc / unknown env), for example with a local `terraform plan -var env=ithc` against a scratch backend, or by reasoning from the count gates if a scratch plan is not possible

### Post-merge verification (aat)
- [ ] Confirm the master apply succeeds for aat, demo and perftest
- [ ] `az apim api show` in DCD-CFTAPPS-STG: `cath-api` exists in `cft-api-mgmt-stg`, linked to product `cath`, `serviceUrl = https://cath-api.aat.platform.hmcts.net`, with only the `createPublication` (`POST /publication`) and `healthCheck` (`GET /`) operations
- [ ] `GET /cath/` via APIM returns the welcome response with a valid token, and 401 without one
- [ ] Curl `POST /cath/publication` via APIM with a valid `api.publisher.user` token. The response matches a direct call to `cath-api.aat`.
- [ ] Curl with no token and with a tampered token. Expect 401 with the APIM JSON body, and no backend dependency or request in App Insights.
- [ ] Curl with a valid token that has no role. Expect 401 from APIM.
- [ ] KQL in `cath-appinsights-aat`: APIM requests are present, configured headers are logged, and there is no `Authorization` dimension
- [ ] After `publish-openapi` runs, confirm that `servers` in the published `cath-service.json` includes the gateway URL
