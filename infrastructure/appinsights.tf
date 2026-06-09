# Application Insights configuration

module "application_insights" {
  source = "git::https://github.com/hmcts/terraform-module-application-insights?ref=4.x"

  env     = var.env
  product = var.product
  name    = "cath-${var.env}-appinsights"

  resource_group_name = azurerm_resource_group.ss_kv_rg.name

  common_tags = var.common_tags
}

# Store App Insights connection string in Key Vault
resource "azurerm_key_vault_secret" "app_insights_connection_string" {
  name         = "app-insights-connection-string"
  value        = module.application_insights.connection_string
  key_vault_id = module.application_key_vault.key_vault_id
}
