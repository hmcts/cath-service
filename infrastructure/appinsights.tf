module "application_insights" {
  source = "git::https://github.com/hmcts/terraform-module-application-insights?ref=4.x"

  env     = var.env
  product = var.product

  # The module appends -${var.env} to this, so this yields cath-appinsights-aat.
  name = "${var.product}-appinsights"

  resource_group_name = azurerm_resource_group.shared.name

  common_tags = var.common_tags
}

resource "azurerm_key_vault_secret" "app_insights_connection_string" {
  name         = "app-insights-connection-string"
  value        = module.application_insights.connection_string
  key_vault_id = data.azurerm_key_vault.key_vault.id
}
