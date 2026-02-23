# Technical Plan: #359 - Azure API Management (APIM) Infrastructure

## 1. Technical Approach

Provision Azure API Management as a gateway layer in front of the existing `cath-api` Kubernetes service using four discrete Terraform modules housed in a new `terraform/` directory within this monorepo. Modules are composed from a root `main.tf` and driven by per-environment `tfvars` files. Flux GitOps deployments remain unchanged; APIM outputs are written to the `cath` Key Vault so the API pod can consume them as existing secrets.

## 2. Architecture Decisions

- **Location**: New `terraform/` directory in this monorepo root. Infrastructure lives alongside the application code it governs. This keeps state and versioning co-located with the service.
- **Modules**: Custom modules using the `azurerm` provider rather than `cnp-module-api-mgmt-product` — see open questions below.
- **State backend**: Azure Storage Account with remote state and state locking. Container and storage account details require confirmation from the infrastructure team before implementation begins.
- **APIM SKU**: `Developer` for dev and staging (no SLA, sufficient for non-prod); `Standard` for production. `Premium` is available if VNet injection is required in prod — confirm with infra team.
- **Service URL**: `https://cath-api.{env}.platform.hmcts.net` — the existing AKS ingress hostname already configured in `apps/api/helm/values.yaml`.
- **OpenAPI spec**: The `apim-api-import` module requires an OpenAPI 3.0 or Swagger 2.0 specification. No spec file currently exists in the repo. Generating this is a blocking prerequisite (see section 6).

## 3. File Structure

```
terraform/
├── backend.tf                        # Remote state configuration
├── main.tf                           # Root module - wires all four modules
├── variables.tf                      # Root-level variable declarations
├── outputs.tf                        # Root-level outputs
├── versions.tf                       # Provider and Terraform version pins
├── environments/
│   ├── dev.tfvars
│   ├── staging.tfvars
│   └── prod.tfvars
├── policies/
│   ├── api-level.xml                 # Applied at the API scope (all operations)
│   ├── rate-limit.xml                # Rate limiting policy fragment
│   └── jwt-validation.xml            # JWT validation policy fragment
└── modules/
    ├── apim-instance/
    │   ├── main.tf
    │   ├── variables.tf
    │   └── outputs.tf
    ├── apim-loggers/
    │   ├── main.tf
    │   └── variables.tf
    ├── apim-api-import/
    │   ├── main.tf
    │   ├── variables.tf
    │   └── outputs.tf
    └── apim-operations/
        ├── main.tf
        └── variables.tf
```

## 4. Module Specifications

### Module 1: `apim-instance`

Provisions the APIM service, a product named `cath`, and a product-level policy.

**Resources**:
- `azurerm_api_management` — the APIM instance
- `azurerm_api_management_product` — product named `cath` with subscription required
- `azurerm_api_management_product_policy` — product-level base policy

**Key variables** (with validation):
```hcl
variable "environment" {
  type = string
  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "environment must be dev, staging, or prod"
  }
}

variable "sku_name" {
  type = string
  validation {
    condition     = contains(["Developer_1", "Standard_1", "Premium_1"], var.sku_name)
    error_message = "sku_name must be Developer_1, Standard_1, or Premium_1"
  }
}

variable "virtual_network_type" {
  type    = string
  default = "None"
  validation {
    condition     = contains(["None", "External", "Internal"], var.virtual_network_type)
    error_message = "virtual_network_type must be None, External, or Internal"
  }
}
```

**Outputs**: `apim_id`, `apim_gateway_url`, `apim_name`, `product_id`

**Naming**: `cath-apim-{env}` following the HMCTS `{product}-{component}-{env}` standard.

**Tags** applied to all resources:
```hcl
locals {
  tags = {
    environment = var.environment
    product     = "cath"
    builtFrom   = "https://github.com/hmcts/cath-service"
  }
}
```

### Module 2: `apim-loggers`

Connects APIM to Application Insights and Azure Monitor. Depends on `apim-instance`.

**Resources**:
- `azurerm_api_management_logger` — links APIM to the Application Insights instance
- `azurerm_monitor_diagnostic_setting` — routes APIM logs to Log Analytics Workspace
  - Log categories: `GatewayLogs`, `WebSocketConnectionLogs`
  - Metric category: `AllMetrics`

**Key variables**:
```hcl
variable "apim_name"                          { type = string }
variable "resource_group_name"                { type = string }
variable "app_insights_instrumentation_key"   { type = string; sensitive = true }
variable "app_insights_id"                    { type = string }
variable "log_analytics_workspace_id"         { type = string }
variable "sampling_percentage"                { type = number; default = 100 }
```

The `app_insights_instrumentation_key` is fetched from the `cath` Key Vault via a `data "azurerm_key_vault_secret"` data source in root `main.tf` and passed in — it is never hardcoded in tfvars.

### Module 3: `apim-api-import`

Imports an OpenAPI/Swagger spec to create the API definition and links it to the product. Depends on `apim-instance`.

**Resources**:
- `azurerm_api_management_api` — creates the API from the spec file
- `azurerm_api_management_product_api` — links the API to the `cath` product

**Key variables**:
```hcl
variable "apim_name"            { type = string }
variable "resource_group_name"  { type = string }
variable "api_name"             { type = string; default = "cath-api" }
variable "api_display_name"     { type = string; default = "CaTH API" }
variable "api_path"             { type = string; default = "cath" }
variable "service_url"          { type = string }  # https://cath-api.{env}.platform.hmcts.net
variable "content_format"       { type = string; default = "openapi+json-link" }
variable "content_value"        { type = string }  # URL or local path to spec file
variable "product_id"           { type = string }
variable "api_version"          { type = string; default = "v1" }
variable "subscription_required" { type = bool; default = true }
```

**Prerequisite**: `content_value` must point to a valid OpenAPI 3.0 spec. This file does not exist yet — see section 6.

**Outputs**: `api_id`, `api_name`

### Module 4: `apim-operations`

Applies XML policy files at the API scope and optionally at individual operation scope. Depends on `apim-api-import`.

**Resources**:
- `azurerm_api_management_api_policy` — applies `api-level.xml` to all operations on the API
- `azurerm_api_management_api_operation_policy` — per-operation policy overrides (optional, driven by `operations` variable)

**Key variables**:
```hcl
variable "apim_name"            { type = string }
variable "resource_group_name"  { type = string }
variable "api_name"             { type = string }
variable "api_policy_xml_path"  { type = string }  # path to api-level.xml
variable "operations" {
  type = list(object({
    operation_id    = string
    policy_xml_path = string
  }))
  default = []
}
```

## 5. Root `main.tf` Structure

```hcl
# terraform/main.tf

terraform {
  backend "azurerm" {
    # Values populated at init time via -backend-config flags
    # or environment-specific backend config files
  }
}

provider "azurerm" {
  features {}
}

data "azurerm_key_vault" "cath" {
  name                = "cath-${var.environment}"
  resource_group_name = var.resource_group_name
}

data "azurerm_key_vault_secret" "app_insights_key" {
  name         = "app-insights-connection-string"
  key_vault_id = data.azurerm_key_vault.cath.id
}

module "apim_instance" {
  source              = "./modules/apim-instance"
  resource_group_name = var.resource_group_name
  location            = var.location
  environment         = var.environment
  publisher_email     = var.publisher_email
  publisher_name      = var.publisher_name
  sku_name            = var.sku_name
  virtual_network_type = var.virtual_network_type
  tags                = local.tags
}

module "apim_loggers" {
  source                              = "./modules/apim-loggers"
  apim_name                           = module.apim_instance.apim_name
  resource_group_name                 = var.resource_group_name
  app_insights_instrumentation_key    = data.azurerm_key_vault_secret.app_insights_key.value
  app_insights_id                     = var.app_insights_id
  log_analytics_workspace_id          = var.log_analytics_workspace_id
  sampling_percentage                 = var.sampling_percentage
}

module "apim_api_import" {
  source              = "./modules/apim-api-import"
  apim_name           = module.apim_instance.apim_name
  resource_group_name = var.resource_group_name
  service_url         = "https://cath-api.${var.environment}.platform.hmcts.net"
  content_format      = var.api_content_format
  content_value       = var.api_content_value
  product_id          = module.apim_instance.product_id
}

module "apim_operations" {
  source              = "./modules/apim-operations"
  apim_name           = module.apim_instance.apim_name
  resource_group_name = var.resource_group_name
  api_name            = module.apim_api_import.api_name
  api_policy_xml_path = "${path.module}/policies/api-level.xml"
  operations          = var.operations
}

# Write APIM outputs to Key Vault
resource "azurerm_key_vault_secret" "apim_gateway_url" {
  name         = "apim-gateway-url"
  value        = module.apim_instance.apim_gateway_url
  key_vault_id = data.azurerm_key_vault.cath.id
}

resource "azurerm_key_vault_secret" "apim_resource_id" {
  name         = "apim-resource-id"
  value        = module.apim_instance.apim_id
  key_vault_id = data.azurerm_key_vault.cath.id
}
```

The APIM subscription key cannot be sourced directly from Terraform state as it is managed by APIM itself; it must be retrieved post-provisioning via the Azure CLI or APIM management API and written to Key Vault separately, or via a `null_resource` with a local-exec provisioner. This is a known limitation to document.

## 6. Environment tfvars

### `dev.tfvars`
```hcl
environment          = "dev"
location             = "UK South"
sku_name             = "Developer_1"
virtual_network_type = "None"
publisher_email      = "platformengineering@hmcts.net"
publisher_name       = "HMCTS CaTH"
sampling_percentage  = 100
api_content_format   = "openapi+json-link"
api_content_value    = "https://cath-api.dev.platform.hmcts.net/api-spec/openapi.json"
```

### `staging.tfvars`
```hcl
environment          = "staging"
location             = "UK South"
sku_name             = "Developer_1"
virtual_network_type = "None"
publisher_email      = "platformengineering@hmcts.net"
publisher_name       = "HMCTS CaTH"
sampling_percentage  = 100
api_content_format   = "openapi+json-link"
api_content_value    = "https://cath-api.staging.platform.hmcts.net/api-spec/openapi.json"
```

### `prod.tfvars`
```hcl
environment          = "prod"
location             = "UK South"
sku_name             = "Standard_1"
virtual_network_type = "None"
publisher_email      = "platformengineering@hmcts.net"
publisher_name       = "HMCTS CaTH"
sampling_percentage  = 10
api_content_format   = "openapi+json-link"
api_content_value    = "https://cath-api.prod.platform.hmcts.net/api-spec/openapi.json"
```

## 7. Policy XML Files

### `policies/api-level.xml`
Baseline policy applied to all operations: sets correlation headers, enables Application Insights tracing, and applies rate limiting.

```xml
<policies>
  <inbound>
    <base />
    <set-header name="X-Correlation-Id" exists-action="skip">
      <value>@(context.RequestId.ToString())</value>
    </set-header>
    <include-fragment fragment-id="rate-limit" />
  </inbound>
  <backend>
    <base />
  </backend>
  <outbound>
    <base />
  </outbound>
  <on-error>
    <base />
  </on-error>
</policies>
```

### `policies/rate-limit.xml`
Rate limit thresholds are placeholders; production values require confirmation (see open questions).

```xml
<rate-limit-by-key calls="100" renewal-period="60"
  counter-key="@(context.Subscription.Id)" />
```

### `policies/jwt-validation.xml`
JWT validation against Azure AD. Tenant ID is read from environment variable at apply time.

```xml
<validate-jwt header-name="Authorization" failed-validation-httpcode="401"
  failed-validation-error-message="Unauthorized">
  <openid-config url="https://login.microsoftonline.com/{tenant-id}/v2.0/.well-known/openid-configuration" />
  <required-claims>
    <claim name="aud">
      <value>{client-id}</value>
    </claim>
  </required-claims>
</validate-jwt>
```

Tenant ID and client ID values must be passed in from Key Vault secrets at apply time, not hardcoded in XML.

## 8. Helm Values Update — `apps/api/helm/values.yaml`

Once APIM is provisioned and secrets are in Key Vault, add the following secrets to `apps/api/helm/values.yaml` so the API pod can consume the gateway URL:

```yaml
keyVaults:
  cath:
    secrets:
      - redis-access-key
      - app-insights-connection-string
      - dynatrace-url
      - apim-gateway-url      # add
      - apim-resource-id      # add
```

The `apim-subscription-key` secret (if needed by the API pod) follows the same pattern once the retrieval mechanism for it is confirmed.

## 9. OpenAPI Spec Prerequisite

The `apim-api-import` module requires a machine-readable OpenAPI 3.0 specification served by `apps/api`. No spec file or generation tooling currently exists in the repo. This must be resolved before the import module can be applied.

**Recommended approach**: Add `swagger-jsdoc` and `swagger-ui-express` (or `@asteasolutions/zod-to-openapi` if schemas are Zod-based) to `apps/api`. Expose the spec at `GET /api-spec/openapi.json`. The tfvars `api_content_value` fields reference this endpoint directly.

This is a prerequisite task that should be tracked and completed before applying the `apim-api-import` module. The remaining three modules (`apim-instance`, `apim-loggers`, `apim-operations`) can be provisioned independently and the import module applied in a follow-up once the spec is available.

## 10. CI/CD Pipeline Steps

Add a new GitHub Actions workflow file `.github/workflows/terraform.yml` that runs on pull requests touching `terraform/**`:

```yaml
jobs:
  terraform-validate:
    steps:
      - uses: hashicorp/setup-terraform@v3
      - run: terraform init -backend=false
        working-directory: terraform
      - run: terraform validate
        working-directory: terraform
      - run: terraform fmt -check -recursive
        working-directory: terraform

  policy-xml-validate:
    steps:
      - run: |
          for f in terraform/policies/*.xml; do
            xmllint --noout "$f" || exit 1
          done
```

Full `terraform plan` and `terraform apply` steps should run in the HMCTS Jenkins/Azure DevOps pipeline where Azure credentials are available, not in GitHub Actions.

## 11. Acceptance Criteria Mapping

| AC | How it is satisfied |
|----|---------------------|
| APIM instance provisioned per environment | `apim-instance` module; one `tfvars` per environment; `environment` variable validated to `dev/staging/prod` |
| Correct SKU, VNet, tags | `sku_name` and `virtual_network_type` variables set per env in tfvars; `tags` local applied to all resources |
| Diagnostic settings configured | `apim-loggers` module creates `azurerm_api_management_logger` and `azurerm_monitor_diagnostic_setting` with GatewayLogs, WebSocketConnectionLogs, AllMetrics |
| API operations and policies applied | `apim-operations` module applies `api-level.xml` at API scope; per-operation policies via `operations` variable |
| OpenAPI spec imported | `apim-api-import` module; blocked until spec generation prerequisite is complete |
| APIM secrets in Key Vault | `azurerm_key_vault_secret` resources in root `main.tf` for gateway URL and resource ID |
| Idempotency | All resources defined declaratively; no `null_resource` side-effects except subscription key retrieval; `terraform plan` on unchanged state produces zero diff |

## 12. Clarifications Needed

- **Terraform state backend**: Confirm the Azure Storage Account name, container name, and resource group with the infrastructure team before writing `backend.tf`. This is a blocking prerequisite.
- **HMCTS cnp-module-api-mgmt-product vs custom modules**: The ticket references the existing HMCTS module. Using it would reduce code but may constrain configurability. Custom modules give full control and avoid an external dependency. Confirm the preference before starting module authorship.
- **cath-web APIM consumption**: Does the web frontend call the API directly via its AKS ingress URL, or should it route through the APIM gateway? If the latter, `apps/web/helm/values.yaml` also needs APIM secrets added.
- **Production rate limit thresholds**: The `rate-limit.xml` placeholder of 100 calls per 60 seconds is arbitrary. Confirm the required production threshold and whether different limits apply to authenticated vs unauthenticated callers.
- **APIM developer portal**: Should the developer portal be enabled and published? It significantly increases provisioning time and cost for the Developer SKU. Currently omitted.
- **OpenAPI spec generation**: Must be resolved and merged before the `apim-api-import` module can be applied. The current `apps/api` routes are `GET /api/users`, `POST /api/users`, and `GET /api/users/:id` — these will form the initial spec.
- **APIM subscription key secret**: The subscription key is not a Terraform-native output from `azurerm_api_management`. Confirm whether the API pod needs to present a subscription key to APIM on inbound calls, and if so, confirm the preferred mechanism for retrieving and storing it in Key Vault post-apply.
- **Virtual network integration**: All tfvars default `virtual_network_type` to `None`. If the AKS cluster runs in a private VNet, APIM may need `Internal` or `External` mode with a subnet. Confirm the network topology with the infrastructure team.
