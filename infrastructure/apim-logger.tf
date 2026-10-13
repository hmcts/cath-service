# Name must not collide with the platform's cft-api-mgmt-<suffix>-logger.
resource "azurerm_api_management_logger" "cath" {
  count    = local.deploy_apim ? 1 : 0
  provider = azurerm.cftapps

  name                = "cath-appinsights-logger"
  api_management_name = local.apim_name
  resource_group_name = local.apim_rg
  resource_id         = azurerm_application_insights.shared.id

  application_insights {
    connection_string = azurerm_application_insights.shared.connection_string
  }
}

# Header lists follow pip-data-management. Never add Authorization.
resource "azurerm_api_management_api_diagnostic" "cath" {
  count    = local.deploy_apim ? 1 : 0
  provider = azurerm.cftapps

  identifier               = "applicationinsights"
  api_name                 = module.apim_api[0].name
  api_management_name      = local.apim_name
  resource_group_name      = local.apim_rg
  api_management_logger_id = azurerm_api_management_logger.cath[0].id

  sampling_percentage       = 25.0
  always_log_errors         = true
  log_client_ip             = true
  verbosity                 = "verbose"
  http_correlation_protocol = "W3C"

  # Payloads contain personal data: set body_bytes to 0 for prod.
  frontend_request {
    body_bytes = 8192
    headers_to_log = [
      "content-type",
      "accept",
      "origin",
      "x-provenance",
      "x-source-artefact-id",
      "x-type",
      "x-sensitivity",
      "x-language",
      "x-display-from",
      "x-display-to",
      "x-list-type",
      "x-court-id",
      "x-content-date",
    ]
  }

  frontend_response {
    body_bytes = 8192
    headers_to_log = [
      "content-type",
      "content-length",
      "origin",
    ]
  }

  backend_request {
    body_bytes = 8192
    headers_to_log = [
      "content-type",
      "accept",
      "origin",
    ]
  }

  backend_response {
    body_bytes = 8192
    headers_to_log = [
      "content-type",
      "content-length",
      "origin",
    ]
  }
}
