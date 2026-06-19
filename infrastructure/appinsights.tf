module "application_insights" {
  source = "git::https://github.com/hmcts/terraform-module-application-insights?ref=4.x"

  env     = var.env
  product = var.product
  name    = "${var.product}-${var.component}-appinsights"

  resource_group_name = azurerm_resource_group.rg.name

  common_tags = var.common_tags

  # SP lacks actionGroups/read on the PTL subscription; activity log alert returns 403.
  # alert_limit_reached=true switches to a scheduled query alert that does not need it.
  alert_limit_reached = true
}

resource "azurerm_key_vault_secret" "app_insights_connection_string" {
  name         = "app-insights-connection-string"
  value        = module.application_insights.connection_string
  key_vault_id = data.azurerm_key_vault.key_vault.id
}
