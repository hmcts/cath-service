locals {
  bootstrap_prefix = "${var.product}-bootstrap-${var.env}"
}

resource "azurerm_resource_group" "bootstrap_rg" {
  name     = "${local.bootstrap_prefix}-rg"
  location = var.location
  tags     = var.common_tags
}

module "key_vault_bootstrap" {
  source = "git::https://github.com/hmcts/cnp-module-key-vault?ref=master"

  name                    = "${var.product}-bootstrap-${var.env}-kv"
  product                 = var.product
  env                     = var.env
  object_id               = var.ci_service_principal_object_id
  tenant_id               = var.tenant_id
  resource_group_name     = azurerm_resource_group.bootstrap_rg.name
  product_group_name      = var.active_directory_group
  common_tags             = var.common_tags
  create_managed_identity = false
}

# Grant the app managed identity Get/List access to the bootstrap KV
# so pods can read bootstrap secrets (e.g. e2e test credentials)
resource "azurerm_key_vault_access_policy" "bootstrap_kv_app_mi" {
  key_vault_id = module.key_vault_bootstrap.key_vault_id
  tenant_id    = var.tenant_id
  object_id    = data.azurerm_user_assigned_identity.app_mi.principal_id

  secret_permissions = ["Get", "List"]
}

# Grant the GitHub Actions OIDC app registration Get/List access to the bootstrap KV
# so e2e test workflows (which authenticate via AZURE_CLIENT_ID OIDC) can fetch test credentials
resource "azurerm_key_vault_access_policy" "bootstrap_kv_e2e_oidc_sp" {
  key_vault_id = module.key_vault_bootstrap.key_vault_id
  tenant_id    = var.tenant_id
  object_id    = var.e2e_oidc_object_id

  secret_permissions = ["Get", "List"]
}
