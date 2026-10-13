# Publishes apps/api through the platform-owned CFT APIM instance. Suppliers only
# talk to APIM; APIM calls the backend with its own token. The CI service
# principal needs API Management Service Contributor on each instance.

# Inline import so only exposed operations are included, with the operationIds
# APIM uses (they name the files in resources/operation-policies/). servers is
# emptied so it cannot override service_url.
locals {
  openapi_spec = yamldecode(file("${path.module}/../docs/api/openapi.yaml"))

  apim_openapi_paths = {
    for path, methods in local.apim_operations : path => {
      for method, operation_id in methods :
      method => merge(local.openapi_spec.paths[path][method], { operationId = operation_id })
    }
  }

  apim_openapi = jsonencode(merge(local.openapi_spec, {
    servers = []
    paths   = local.apim_openapi_paths
  }))
}

module "apim_product" {
  count  = local.deploy_apim ? 1 : 0
  source = "git::https://github.com/hmcts/cnp-module-api-mgmt-product?ref=master"

  providers = {
    azurerm = azurerm.cftapps
  }

  api_mgmt_name = local.apim_name
  api_mgmt_rg   = local.apim_rg
  name          = "cath"

  # Callers authenticate with an Entra ID token, not subscription keys.
  subscription_required = false
  approval_required     = false

  product_policy = templatefile("${path.module}/resources/product-policy/product-policy.xml", {})
}

module "apim_api" {
  count  = local.deploy_apim ? 1 : 0
  source = "git::https://github.com/hmcts/cnp-module-api-mgmt-api?ref=master"

  providers = {
    azurerm = azurerm.cftapps
  }

  api_mgmt_name = local.apim_name
  api_mgmt_rg   = local.apim_rg
  name          = "cath-api"
  display_name  = "CaTH API"
  path          = "cath"
  revision      = "1"
  protocols     = ["https"]
  service_url   = "https://cath-api.${var.env}.platform.hmcts.net"
  product_id    = module.apim_product[0].product_id

  # swagger_url accepts inline content as well as a URL.
  content_format = "openapi+json"
  swagger_url    = local.apim_openapi

  subscription_required = false
}

module "apim_api_policy" {
  count  = local.deploy_apim ? 1 : 0
  source = "git::https://github.com/hmcts/cnp-module-api-mgmt-api-policy?ref=master"

  providers = {
    azurerm = azurerm.cftapps
  }

  api_mgmt_name = local.apim_name
  api_mgmt_rg   = local.apim_rg
  api_name      = module.apim_api[0].name

  api_policy_xml_content = templatefile("${path.module}/resources/api-policy/api-policy.xml", {
    tenant_id     = data.azurerm_key_vault_secret.apim_tenant_id[0].value
    client_id     = data.azurerm_key_vault_secret.apim_client_id[0].value
    key_vault_uri = data.azurerm_key_vault.key_vault.vault_uri
  })

  depends_on = [azurerm_key_vault_access_policy.apim]
}
