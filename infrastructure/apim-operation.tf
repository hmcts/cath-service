# File names must match an imported operationId, otherwise the apply fails.
locals {
  apim_operation_policies = local.deploy_apim ? {
    for file in fileset(path.module, "resources/operation-policies/*.xml") :
    trimsuffix(basename(file), ".xml") => file("${path.module}/${file}")
  } : {}
}

resource "azurerm_api_management_api_operation_policy" "apim_operation_policy" {
  for_each = local.apim_operation_policies
  provider = azurerm.cftapps

  api_name            = module.apim_api[0].name
  api_management_name = local.apim_name
  resource_group_name = local.apim_rg
  operation_id        = each.key
  xml_content         = each.value
}
