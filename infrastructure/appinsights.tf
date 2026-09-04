# Declared directly rather than via terraform-module-application-insights.
#
# That module unconditionally creates a daily-data-cap alert wired to the shared
# CFT Slack action group in DTS-CFTPTL-INTSVC (subscription 1baf5470). Our CI
# service principal has no Microsoft.Insights/actionGroups/read on that
# subscription, so every apply failed with LinkedAuthorizationFailed (403) and
# the alert has never existed in CNP. The module offers no flag to skip it -
# alert_limit_reached only swaps the alert for a scheduled query rule that
# targets the same action group, and adds an `az login --identity` provisioner
# that cannot work on a GitHub runner.
#
# Everything else the module provided is reproduced below. Alerting is to be
# restored under a follow-up ticket, once the service principal has been granted
# read access to the action group.
#
# Workspace: the module resolved this via terraform-module-log-analytics-workspace-id,
# which maps env "aat" to hmcts-nonprod in this same subscription.
data "azurerm_log_analytics_workspace" "shared" {
  name                = "hmcts-nonprod"
  resource_group_name = "oms-automation"
}

# The resource already exists in state under the module address, and the Azure
# name is unchanged, so re-home it rather than let terraform destroy and recreate
# it (which would fail on the name still being in use).
moved {
  from = module.application_insights.azurerm_application_insights.this
  to   = azurerm_application_insights.shared
}

resource "azurerm_application_insights" "shared" {
  name                = "${var.product}-appinsights-${var.env}"
  location            = var.location
  resource_group_name = azurerm_resource_group.shared.name

  # Module defaults, preserved so this is a like-for-like replacement.
  application_type     = "web"
  daily_data_cap_in_gb = 50
  workspace_id         = data.azurerm_log_analytics_workspace.shared.id

  sampling_percentage = 100

  tags = var.common_tags
}

resource "azurerm_key_vault_secret" "app_insights_connection_string" {
  name         = "app-insights-connection-string"
  value        = azurerm_application_insights.shared.connection_string
  key_vault_id = data.azurerm_key_vault.key_vault.id
}

resource "azurerm_role_assignment" "app_insights_reader_e2e_oidc_sp" {
  scope                = azurerm_application_insights.shared.id
  role_definition_name = "Monitoring Reader"
  principal_id         = var.e2e_oidc_object_id
}

resource "azurerm_application_insights_standard_web_test" "web_availability" {
  name                    = "${var.product}-web-availability-${var.env}"
  resource_group_name     = azurerm_resource_group.shared.name
  location                = var.location
  application_insights_id = azurerm_application_insights.shared.id

  geo_locations = [
    "emea-nl-ams-azr",
    "emea-ru-msa-edge",
    "emea-se-sto-edge",
    "emea-gb-db3-azr",
    "emea-fr-pra-edge"
  ]

  request {
    url = "https://cath-web.${var.env}.platform.hmcts.net/health/liveness"
  }

  tags = var.common_tags
}
