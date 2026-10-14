data "azurerm_api_management" "cft" {
  count               = local.deploy_apim ? 1 : 0
  provider            = azurerm.cftapps
  name                = local.apim_name
  resource_group_name = local.apim_rg
}

data "azurerm_key_vault_secret" "apim_tenant_id" {
  count        = local.deploy_apim ? 1 : 0
  name         = "app-tenant-id"
  key_vault_id = module.key_vault.key_vault_id
}
