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
  service_url   = "https://cath-api.${var.env}.platform.hmcts.net"
  product_id    = module.apim_product[0].product_id

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
# Rendered with templatefile(): never use C# $"..." interpolation in these files.
locals {
  apim_testing_support_operation_policies = local.deploy_apim_testing_support ? {
    for file in fileset(path.module, "resources/testing-support/operation-policies/*.xml") :
    trimsuffix(basename(file), ".xml") => templatefile("${path.module}/${file}", {
      tenant_id = data.azurerm_key_vault_secret.apim_tenant_id[0].value
      client_id = data.azurerm_key_vault_secret.apim_client_id[0].value
    })
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
