# #620: Create APIM Testing-Support API for cath-service

**State:** OPEN
**Assignees:** KianKwa
**Author:** junaidiqbalmoj
**Labels:** type:story
**Created:** 2026-05-14T12:03:06Z
**Updated:** 2026-11-02T09:45:24Z

## Description

## Overview

Register a second cath API in Azure API Management (APIM) for third-party testing support. This follows the pattern of [pip-publication-services](https://github.com/hmcts/pip-publication-services/tree/master/infrastructure/resources/testing-support), but publishes through the **CNP/CFT APIM instance (`cft-api-mgmt-<env>`) that cath already uses**, not the SDS instance (`sds-api-mgmt-<env>`) that pip uses.

The testing-support API is a **mock third party**. Its operations validate the caller's Entra ID token and return a fixed `200` from APIM without calling any backend. It gives non-production environments a destination to:
- test third-party OAuth configuration ("Test connection", #829)
- receive new, updated and deleted publication pushes

It is deployed to **non-production environments only** (aat/stg, demo, perftest/test) and must never be deployed to prod.

This story is additive. It reuses the CFT APIM setup that already exists in cath (`infrastructure/apim.tf`, `apim-operation.tf`, `apim-logger.tf`, `data.tf`, `env-config.tf`) and the `cath-jwt-validation` policy fragment introduced in #619.

---

## Background

pip-publication-services has a separate testing-support API alongside its main API in **SDS** APIM:
- Separate APIM path (`pip/publication-services-testing-support`)
- Its own swagger spec and a passthrough API-level policy
- Four operation policies (`thirdPartyHealthCheck`, `thirdPartyNewPublication`, `thirdPartyUpdatePublication`, `thirdPartyDeletePublication`). Each one validates the JWT and returns `return-response` 200 with a description, e.g. "Successful health check."
- `deploy_apim_testing_support` limited to stg/test/demo

cath must provide the same mock API using the **CNP/CFT** setup already in this repo:

| | pip-publication-services (SDS) | cath-service (CNP/CFT — use this) |
|---|---|---|
| APIM instance | `sds-api-mgmt-${local.env}` | `local.apim_name` = `cft-api-mgmt-<apim_suffix>` |
| Resource group | `ss-${local.env}-network-rg` | `local.apim_rg` = `cft-${var.env}-network-rg` |
| Provider | default | `azurerm.cftapps` on every APIM resource and module |
| Product | data lookup `pip-product-${env}` | `module.apim_product[0].product_id` (existing `cath` product) |
| JWT validation | inline `validate-jwt` with `{TENANT_ID}`/`{CLIENT_ID}` via `replace()` | `<include-fragment fragment-id="cath-jwt-validation" />` (from #619) |
| Client ID / tenant | `app-pip-id`, `data.azurerm_client_config.current` | `cath-service-api-client-id`, `app-tenant-id` (existing KV data sources) |
| Logger | `sds-api-mgmt-${env}-logger` | `azurerm_api_management_logger.apim` (existing) |
| Env gating | `local.env` in stg/test/demo | new `local.deploy_apim_testing_support`, keyed on `var.env` |
| File naming | `tf-apim-*.tf` | `apim-*.tf` |

---

## Terraform Changes

No new APIM instance, product, data sources, Key Vault access or logger. Reuse:
- `data.azurerm_api_management.cft`
- `module.apim_product`
- `azurerm_api_management_logger.apim`
- `local.apim_name` / `apim_rg` / `deploy_apim`
- `azurerm_api_management_policy_fragment.jwt_validation` (#619)

### `infrastructure/env-config.tf`: add the testing-support gate

```hcl
locals {
  # Mock third party for non-production only. An explicit allowlist, so adding prod
  # (or any other environment) to env_config never deploys it by accident.
  deploy_apim_testing_support = local.deploy_apim && contains(["aat", "demo", "perftest"], var.env)
}
```

### `infrastructure/apim-testing-support.tf` (new)

```hcl
module "apim_api_testing_support" {
  count  = local.deploy_apim_testing_support ? 1 : 0
  source = "git::https://github.com/hmcts/cnp-module-api-mgmt-api?ref=master"

  providers = {
    azurerm = azurerm.cftapps
  }

  api_mgmt_name = local.apim_name
  api_mgmt_rg   = local.apim_rg
  name          = "cath-testing-support-api"
  display_name  = "CaTH Testing Support API"
  path          = "cath/testing-support"
  revision      = "1"
  protocols     = ["https"]
  # Required by the module. Every operation returns from APIM, so the backend is never called.
  service_url = "https://cath-api.${var.env}.platform.hmcts.net"
  product_id  = module.apim_product[0].product_id

  content_format = "openapi+json"
  swagger_url    = file("${path.module}/resources/testing-support/swagger/api-swagger.json")

  subscription_required = false
}

module "apim_api_testing_support_policy" {
  count  = local.deploy_apim_testing_support ? 1 : 0
  source = "git::https://github.com/hmcts/cnp-module-api-mgmt-api-policy?ref=master"

  providers = {
    azurerm = azurerm.cftapps
  }

  api_mgmt_name          = local.apim_name
  api_mgmt_rg            = local.apim_rg
  api_name               = module.apim_api_testing_support[0].name
  api_policy_xml_content = file("${path.module}/resources/testing-support/api-policy/api-policy.xml")
}

# Separate directory: apim-operation.tf applies every file in resources/operation-policies/
# to cath-api, and a file that is not one of its operationIds fails the apply.
locals {
  apim_testing_support_operation_policies = local.deploy_apim_testing_support ? {
    for file in fileset(path.module, "resources/testing-support/operation-policies/*.xml") :
    trimsuffix(basename(file), ".xml") => file("${path.module}/${file}")
  } : {}
}

resource "azurerm_api_management_api_operation_policy" "apim_testing_support_operation_policy" {
  for_each = local.apim_testing_support_operation_policies
  provider = azurerm.cftapps

  api_name            = module.apim_api_testing_support[0].name
  api_management_name = local.apim_name
  resource_group_name = local.apim_rg
  operation_id        = each.key
  xml_content         = each.value

  depends_on = [azurerm_api_management_policy_fragment.jwt_validation]
}

resource "azurerm_api_management_api_diagnostic" "testing_support" {
  count    = local.deploy_apim_testing_support ? 1 : 0
  provider = azurerm.cftapps

  identifier               = "applicationinsights"
  api_name                 = module.apim_api_testing_support[0].name
  api_management_name      = local.apim_name
  resource_group_name      = local.apim_rg
  api_management_logger_id = azurerm_api_management_logger.apim[0].id

  sampling_percentage       = 25.0
  always_log_errors         = true
  log_client_ip             = true
  verbosity                 = "verbose"
  http_correlation_protocol = "W3C"
}
```

`path` must not clash with the existing `cath` API or the #619 OTP API.

---

## New Resources

```
infrastructure/resources/testing-support/
├── api-policy/
│   └── api-policy.xml                       # Passthrough: <base /> in each section
├── swagger/
│   └── api-swagger.json                     # OpenAPI spec for the four operations below
└── operation-policies/
    ├── thirdPartyHealthCheck.xml            # GET    /third-party                  → 200 "Successful health check."
    ├── thirdPartyNewPublication.xml         # POST   /third-party                  → 200 "New publication request was received successfully."
    ├── thirdPartyUpdatePublication.xml      # PUT    /third-party/{publicationId}  → 200 "Updated publication request was received successfully."
    └── thirdPartyDeletePublication.xml      # DELETE /third-party/{publicationId}  → 200 "Deleted publication request was received successfully."
```

Each operation policy:
- starts with `<include-fragment fragment-id="cath-jwt-validation" />`, which returns 401 for a missing or invalid token
- ends with `<return-response>`: status 200, `Content-Type: application/json`, body `{"response code": 200, "description": "..."}`

The policies have no placeholders, so they are read with `file()`; no `replace()` / `templatefile()` is needed. Copy the `return-response` blocks from the pip-publication-services files and replace pip's inline `validate-jwt` with the fragment.

The token audience is `cath-service-api-client-id`. A third-party OAuth configuration used to call this mock (e.g. in #829) must request a token for that audience (scope `api://<client-id>/.default`) from the cath tenant.

---

## Deployment Environments

| cath env (`var.env`) | CFT APIM | Existing `cath-api` / OTP API (`deploy_apim`) | Testing-support API (`deploy_apim_testing_support`) |
|---|---|---|---|
| aat | `cft-api-mgmt-stg` | ✅ | ✅ |
| demo | `cft-api-mgmt-demo` | ✅ | ✅ |
| perftest | `cft-api-mgmt-test` | ✅ | ✅ |
| ithc | — | ❌ | ❌ |
| prod (future) | — | — | ❌ never |

---

## Acceptance Criteria

- [ ] All testing-support APIM resources use the existing CNP/CFT instance: `local.apim_name`, `local.apim_rg`, `provider = azurerm.cftapps`. Nothing references `sds-api-mgmt`, `ss-<env>-network-rg`, `data_client_id` or `local.env`
- [ ] The existing product, logger and Key Vault data sources are reused, not duplicated
- [ ] `local.deploy_apim_testing_support` is added and is true only for aat, demo and perftest. It is an explicit allowlist, so a future prod entry in `env_config` stays false
- [ ] `cnp-module-api-mgmt-api` registers `cath-testing-support-api` at `cath/testing-support` under the existing `cath` product
- [ ] A passthrough API-level policy is applied
- [ ] Operation policies for all four operations are applied from `resources/testing-support/operation-policies/` and use the `cath-jwt-validation` fragment from #619
- [ ] The existing `cath-api` and the #619 OTP API are unchanged. `terraform plan` for aat shows only the new testing-support resources
- [ ] Diagnostics use `azurerm_api_management_logger.apim`
- [ ] In stg, `GET /cath/testing-support/third-party` with a valid token returns 200 "Successful health check."
- [ ] Each operation returns `401` without a token or with an invalid one
- [ ] `terraform plan` for ithc shows no testing-support resources

## Dependencies

- #619: the `cath-jwt-validation` policy fragment and the CFT APIM OTP API pattern
- Used by #829 (Test connection) as the mock destination in non-production environments

## References

- [pip-publication-services testing-support resources](https://github.com/hmcts/pip-publication-services/tree/master/infrastructure/resources/testing-support) (SDS: reference for operations and mock responses only)
- [pip-publication-services tf-apim-api.tf](https://github.com/hmcts/pip-publication-services/blob/master/infrastructure/tf-apim-api.tf)
- Existing cath CFT APIM: `infrastructure/apim.tf`, `apim-operation.tf`, `apim-logger.tf`, `data.tf`, `env-config.tf`
- [cnp-module-api-mgmt-api](https://github.com/hmcts/cnp-module-api-mgmt-api)
- [cnp-module-api-mgmt-api-policy](https://github.com/hmcts/cnp-module-api-mgmt-api-policy)

## Comments

No comments on this issue.
