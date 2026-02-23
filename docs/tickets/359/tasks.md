# Implementation Tasks: #359 - Azure API Management (APIM) Infrastructure

## Prerequisites

- [ ] Confirm Terraform state backend details with infrastructure team (storage account name, container, resource group) — blocking
- [ ] Confirm whether to use `cnp-module-api-mgmt-product` or custom modules — blocking
- [ ] Confirm production rate limit thresholds
- [ ] Confirm whether `cath-web` needs APIM secrets added to its Helm values
- [ ] Confirm VNet integration requirements (None / External / Internal) per environment

## OpenAPI Spec Generation (prerequisite for `apim-api-import`)

- [ ] Add `swagger-jsdoc` to `apps/api` package dependencies
- [ ] Create OpenAPI spec configuration covering existing routes (`GET /api/users`, `POST /api/users`, `GET /api/users/:id`)
- [ ] Expose spec at `GET /api-spec/openapi.json` on the `apps/api` Express app
- [ ] Verify spec is accessible at `https://cath-api.dev.platform.hmcts.net/api-spec/openapi.json` after deployment

## Terraform Directory Structure

- [ ] Create `terraform/` directory at the monorepo root
- [ ] Create `terraform/versions.tf` pinning `azurerm` provider version and minimum Terraform version
- [ ] Create `terraform/backend.tf` with `azurerm` backend block (values populated at init time)
- [ ] Create `terraform/variables.tf` with all root-level variable declarations and validation rules
- [ ] Create `terraform/outputs.tf` with root-level output definitions
- [ ] Create `terraform/environments/` directory
- [ ] Create `terraform/policies/` directory
- [ ] Create `terraform/modules/` directory

## Module: `apim-instance`

- [ ] Create `terraform/modules/apim-instance/variables.tf` with input variables and validation for `environment`, `sku_name`, and `virtual_network_type`
- [ ] Create `terraform/modules/apim-instance/main.tf` with `azurerm_api_management`, `azurerm_api_management_product`, and `azurerm_api_management_product_policy` resources
- [ ] Create `terraform/modules/apim-instance/outputs.tf` exporting `apim_id`, `apim_gateway_url`, `apim_name`, and `product_id`
- [ ] Verify resource naming follows `cath-apim-{env}` convention
- [ ] Verify all resources have `tags` applied including `environment`, `product`, and `builtFrom`

## Module: `apim-loggers`

- [ ] Create `terraform/modules/apim-loggers/variables.tf` with input variables including `sampling_percentage` defaulting to `100`
- [ ] Create `terraform/modules/apim-loggers/main.tf` with `azurerm_api_management_logger` and `azurerm_monitor_diagnostic_setting` resources
- [ ] Verify diagnostic setting includes `GatewayLogs`, `WebSocketConnectionLogs`, and `AllMetrics` categories
- [ ] Mark `app_insights_instrumentation_key` variable as `sensitive = true`

## Module: `apim-api-import`

- [ ] Create `terraform/modules/apim-api-import/variables.tf` with input variables
- [ ] Create `terraform/modules/apim-api-import/main.tf` with `azurerm_api_management_api` and `azurerm_api_management_product_api` resources
- [ ] Create `terraform/modules/apim-api-import/outputs.tf` exporting `api_id` and `api_name`
- [ ] Set default `content_format` to `openapi+json-link`
- [ ] Set default `service_url` pattern to `https://cath-api.{env}.platform.hmcts.net`

## Module: `apim-operations`

- [ ] Create `terraform/modules/apim-operations/variables.tf` with `operations` variable as a list of objects defaulting to `[]`
- [ ] Create `terraform/modules/apim-operations/main.tf` with `azurerm_api_management_api_policy` for API-level policy and `azurerm_api_management_api_operation_policy` for per-operation policies

## Policy XML Files

- [ ] Create `terraform/policies/api-level.xml` with inbound correlation header and rate-limit include
- [ ] Create `terraform/policies/rate-limit.xml` with placeholder threshold (confirm production value before prod apply)
- [ ] Create `terraform/policies/jwt-validation.xml` with Azure AD JWT validation — tenant ID and client ID must be parameterised, not hardcoded
- [ ] Validate all XML files parse correctly with `xmllint --noout`

## Root `main.tf`

- [ ] Create `terraform/main.tf` wiring all four modules in dependency order
- [ ] Add `data "azurerm_key_vault"` source for the `cath` Key Vault
- [ ] Add `data "azurerm_key_vault_secret"` source for `app-insights-connection-string` (passed to `apim-loggers`)
- [ ] Add `azurerm_key_vault_secret` resource for `apim-gateway-url` output
- [ ] Add `azurerm_key_vault_secret` resource for `apim-resource-id` output
- [ ] Document the APIM subscription key limitation in a comment (not a Terraform-native output)

## Environment tfvars

- [ ] Create `terraform/environments/dev.tfvars` with `Developer_1` SKU and dev-specific values
- [ ] Create `terraform/environments/staging.tfvars` with `Developer_1` SKU and staging-specific values
- [ ] Create `terraform/environments/prod.tfvars` with `Standard_1` SKU and production-specific values
- [ ] Set `sampling_percentage = 10` in `prod.tfvars`

## Helm Values Update

- [ ] Add `apim-gateway-url` and `apim-resource-id` to the `cath` Key Vault secrets list in `apps/api/helm/values.yaml`
- [ ] If confirmed, add APIM secrets to `apps/web/helm/values.yaml`

## CI/CD Pipeline

- [ ] Create `.github/workflows/terraform.yml` triggered on pull requests touching `terraform/**`
- [ ] Add `terraform init -backend=false` step for syntax validation without requiring Azure credentials
- [ ] Add `terraform validate` step
- [ ] Add `terraform fmt -check -recursive` step
- [ ] Add `xmllint` loop to validate all files in `terraform/policies/*.xml`
- [ ] Document in a README comment that `terraform plan` and `terraform apply` run in the HMCTS Jenkins/Azure DevOps pipeline, not GitHub Actions

## Idempotency Verification

- [ ] Apply Terraform against the dev environment
- [ ] Run `terraform plan` a second time with no input changes and verify the plan output shows zero additions, modifications, or deletions
