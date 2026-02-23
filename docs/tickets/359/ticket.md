# #359: Create Azure API Management (APIM) Infrastructure

**State:** OPEN
**Assignees:** None
**Author:** junaidiqbalmoj
**Labels:** None
**Created:** 2026-02-12T15:59:45Z
**Updated:** 2026-02-23T13:55:01Z

## Description

This user story provides a reusable approach to implement Azure API Management (APIM) infrastructure. It outlines the steps to create and configure APIM resources, including defining API policies, operations, and integrating API specifications. The implementation leverages Terraform modules to ensure modularity and scalability.

**Module to Create the APIM Instance**

- Use a Terraform module that provisions an Azure API Management instance. This module should include configurations for SKU, virtual network integration, and diagnostic settings
- The module can be custom-built or sourced from the Terraform Registry (e.g., azurerm_api_management resource in the azurerm provider).

**Module to Configure Loggers for Diagnostics and Monitoring**

- Use a module that configures loggers for Azure APIM. This module should integrate with Azure Monitor or Application Insights for diagnostics.
- Example: Use the azurerm_monitor_diagnostic_setting resource to configure diagnostic settings for APIM.

**Module to Define API Operations and Apply Policies**

- Use a module that defines API operations and applies policies. Policies should be defined in XML files (e.g., rate limiting, security rules) and applied to APIs or operations.
- Example: Use the azurerm_api_management_api_operation resource to define operations and the azurerm_api_management_api_policy resource to apply policies.

**Module to Import API Specifications**

- Use a module that imports API specifications (e.g., Swagger or OpenAPI files) into APIM. This module should handle the creation of APIs based on the specifications.
- Example: Use the azurerm_api_management_api resource to import Swagger or OpenAPI files.

## Comments

### Comment by OgechiOkelu on 2026-02-23T13:36:05Z
@SPEC new-feature.md

### Comment by hmctsclaudecode on 2026-02-23T13:40:41Z
## 1. User Story
**As a** platform engineer
**I want to** provision Azure API Management (APIM) infrastructure using reusable Terraform modules
**So that** the CaTH service APIs are centrally managed, secured, monitored, and consistently governed across all environments

## 2. Background

The CaTH service exposes two backend APIs:
- `cath-api` running on port 3001, accessible at `cath-api.{environment}.platform.hmcts.net`
- Future route expansion anticipated as additional libs expose API routes

Currently these APIs are exposed directly via Kubernetes ingress without a management plane. This means there is no centralised:
- Rate limiting or throttling
- API key or OAuth policy enforcement
- API versioning
- Diagnostics aggregation at the gateway level
- Developer portal or OpenAPI spec publishing

This story provisions Azure API Management as the gateway layer using Terraform modules, following HMCTS platform standards. The implementation uses four discrete modules:

1. **APIM instance** – provisions the Azure API Management service itself
2. **Loggers** – configures Application Insights and Azure Monitor diagnostic settings
3. **API operations and policies** – defines operations and applies XML policy files
4. **API specification import** – imports OpenAPI/Swagger specs to create API definitions

References:
- [HMCTS CNP Terraform module standards](https://github.com/hmcts/cnp-module-api-mgmt-product)
- Existing Helm values: `apps/api/helm/values.yaml`, `apps/web/helm/values.yaml`
- Azure Key Vault: `cath` and `pip-ss-kv-stg`
- AAD identity: `cath`

## 3. Acceptance Criteria

* **Scenario:** APIM instance is provisioned per environment
    * **Given** Terraform is applied for a target environment (dev, staging, prod)
    * **When** the `apim-instance` module completes successfully
    * **Then** an Azure API Management resource exists in the correct resource group with the correct SKU, virtual network integration, and tags

* **Scenario:** Diagnostic settings are configured for APIM
    * **Given** the APIM instance has been provisioned
    * **When** the `apim-loggers` module is applied
    * **Then** Application Insights and Azure Monitor diagnostic settings are connected to the APIM instance and logs appear in the configured workspace

* **Scenario:** API operations and policies are applied
    * **Given** an APIM instance and imported API definition exist
    * **When** the `apim-operations` module is applied with policy XML files
    * **Then** the defined operations exist on the APIM API and the policies (e.g. rate limiting, JWT validation) are attached to the correct scope (API or operation level)

* **Scenario:** OpenAPI specification is imported into APIM
    * **Given** an OpenAPI 3.0 or Swagger 2.0 spec file exists for the cath-api service
    * **When** the `apim-api-import` module is applied
    * **Then** the API is visible in APIM with all operations, correct base URL pointing to `cath-api.{environment}.platform.hmcts.net`, and the product subscription is linked

* **Scenario:** APIM secrets are stored in Azure Key Vault
    * **Given** the APIM instance has been provisioned
    * **When** Terraform outputs are processed
    * **Then** the APIM gateway URL, subscription key, and resource ID are stored in the `cath` Key Vault for downstream application consumption

* **Scenario:** Module is idempotent
    * **Given** Terraform state exists for a previously applied APIM configuration
    * **When** Terraform plan is executed with no changes to inputs
    * **Then** the plan shows zero resource additions, modifications, or deletions

## 4. Infrastructure Provisioning Flow

```
1. Provision APIM Instance
   └── Create azurerm_api_management resource
       ├── Configure SKU (Developer for non-prod, Standard/Premium for prod)
       ├── Attach virtual network (internal or external mode)
       ├── Set publisher email and name
       └── Apply resource tags (environment, product, builtFrom)

2. Configure Loggers (depends on step 1)
   ├── Create azurerm_api_management_logger linked to Application Insights
   └── Create azurerm_monitor_diagnostic_setting
       ├── Log category: GatewayLogs
       ├── Log category: WebSocketConnectionLogs
       └── Metric category: AllMetrics → Log Analytics Workspace

3. Import API Specification (depends on step 1)
   ├── Create azurerm_api_management_api
   │   ├── content_format: "openapi+json-link" or "swagger-link-json"
   │   ├── content_value: URL or file path of spec
   │   └── service_url: https://cath-api.{env}.platform.hmcts.net
   └── Link to azurerm_api_management_product

4. Define Operations and Apply Policies (depends on step 3)
   ├── Create azurerm_api_management_api_operation (per operation)
   └── Create azurerm_api_management_api_policy
       └── xml_content: loaded from policies/ directory

5. Store outputs in Key Vault
   └── Write gateway URL, subscription key, resource ID
       to azurerm_key_vault_secret in cath Key Vault
```

## 5. Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                        Azure Subscription                        │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                   Resource Group: cath-{env}             │    │
│  │                                                         │    │
│  │  ┌────────────────────────────────────┐                 │    │
│  │  │   Azure API Management (APIM)      │                 │    │
│  │  │   cath-apim-{env}                  │                 │    │
│  │  │                                    │                 │    │
│  │  │  ┌──────────┐  ┌────────────────┐  │                 │    │
│  │  │  │  Product │  │   API Logger   │  │                 │    │
│  │  │  │  cath    │  │  (App Insights)│  │                 │    │
│  │  │  └──────────┘  └───────┬────────┘  │                 │    │
│  │  │       │                │           │                 │    │
│  │  │  ┌────▼───────────┐    │           │                 │    │
│  │  │  │  API: cath-api │    │           │                 │    │
│  │  │  │  (OpenAPI spec)│    │           │                 │    │
│  │  │  │                │    │           │                 │    │
│  │  │  │  Operations:   │    │           │                 │    │
│  │  │  │  GET /cases    │    │           │                 │    │
│  │  │  │  POST /case    │    │           │                 │    │
│  │  │  │  ...           │    │           │                 │    │
│  │  │  │                │    │           │                 │    │
│  │  │  │  Policies:     │    │           │                 │    │
│  │  │  │  rate-limit    │    │           │                 │    │
│  │  │  │  jwt-validate  │    │           │                 │    │
│  │  │  └────────┬───────┘    │           │                 │    │
│  │  └───────────┼────────────┼───────────┘                 │    │
│  │              │            │                             │    │
│  │   ┌──────────▼────┐  ┌────▼────────────────────┐        │    │
│  │   │  AKS Cluster  │  │  Azure Monitor /        │        │    │
│  │   │               │  │  Log Analytics Workspace│        │    │
│  │   │  cath-api     │  │  + Application Insights │        │    │
│  │   │  :3001        │  └─────────────────────────┘        │    │
│  │   └───────────────┘                                     │    │
│  │                                                         │    │
│  │   ┌───────────────────────────────┐                     │    │
│  │   │  Azure Key Vault: cath        │                     │    │
│  │   │  apim-gateway-url             │                     │    │
│  │   │  apim-subscription-key        │                     │    │
│  │   │  apim-resource-id             │                     │    │
│  │   └───────────────────────────────┘                     │    │
│  └─────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────┘
```

## 6. Module Specifications

### Module 1: `apim-instance`

**Input Variables**: resource_group_name, location, environment, publisher_email, publisher_name, sku_name, virtual_network_type, virtual_network_subnet_id, tags

**Outputs**: apim_id, apim_gateway_url, apim_name

**Resources Created**: azurerm_api_management, azurerm_api_management_product (named `cath`), azurerm_api_management_product_policy

### Module 2: `apim-loggers`

**Input Variables**: apim_name, resource_group_name, app_insights_instrumentation_key, app_insights_id, log_analytics_workspace_id, sampling_percentage

**Resources Created**: azurerm_api_management_logger, azurerm_monitor_diagnostic_setting (GatewayLogs, WebSocketConnectionLogs, AllMetrics)

### Module 3: `apim-api-import`

**Input Variables**: apim_name, resource_group_name, api_name, api_display_name, api_path, service_url, content_format, content_value, product_id, api_version, subscription_required

**Resources Created**: azurerm_api_management_api, azurerm_api_management_product_api

### Module 4: `apim-operations`

**Input Variables**: apim_name, resource_group_name, api_name, api_policy_xml_path, operations (list)

**Resources Created**: azurerm_api_management_api_operation, azurerm_api_management_api_policy, azurerm_api_management_api_operation_policy

## 7. Policy Files Structure

```
terraform/
├── modules/
│   ├── apim-instance/
│   ├── apim-loggers/
│   ├── apim-api-import/
│   └── apim-operations/
├── environments/
│   ├── dev.tfvars
│   ├── staging.tfvars
│   └── prod.tfvars
├── policies/
│   ├── api-level.xml
│   ├── rate-limit.xml
│   └── jwt-validation.xml
└── main.tf
```

## 14. Assumptions & Open Questions

* Should APIM be provisioned in an existing HMCTS shared Terraform repository, or added as a new `terraform/` directory within this monorepo?
* Is there a preference for using the [HMCTS cnp-module-api-mgmt-product](https://github.com/hmcts/cnp-module-api-mgmt-product) existing Terraform module, or building custom modules from scratch?
* Does the `cath-web` frontend need to call the backend via APIM, or only external consumers?
* What is the required rate limit threshold for production traffic?
* Should the APIM developer portal be enabled?
* Terraform state backend configuration - confirm with infrastructure team.

### Comment by OgechiOkelu on 2026-02-23T13:55:00Z
@plan
