data "azurerm_client_config" "current" {}

module "third_party_key_vault" {
  source = "git::https://github.com/hmcts/cnp-module-key-vault?ref=master"

  name                    = "${var.product}-ss-tp-kv-${var.env}"
  product                 = var.product
  env                     = var.env
  object_id               = var.ci_service_principal_object_id
  tenant_id               = var.tenant_id
  resource_group_name     = azurerm_resource_group.ss_kv_rg.name
  product_group_name      = var.product_group_name
  common_tags             = var.common_tags
  create_managed_identity = false
}

resource "azurerm_key_vault_access_policy" "third_party_kv_app_mi" {
  key_vault_id = module.third_party_key_vault.key_vault_id

  tenant_id = data.azurerm_client_config.current.tenant_id
  object_id = data.azurerm_user_assigned_identity.app_mi.principal_id

  certificate_permissions = []
  key_permissions         = []
  secret_permissions      = ["Get", "List", "Set", "Delete"]

  depends_on = [module.third_party_key_vault]
}
