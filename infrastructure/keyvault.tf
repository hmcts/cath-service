module "key_vault" {
  source = "git::https://github.com/hmcts/cnp-module-key-vault?ref=master"

  product             = var.product
  env                 = var.env
  tenant_id           = var.tenant_id
  object_id           = var.ci_service_principal_object_id
  resource_group_name = azurerm_resource_group.shared.name

  product_group_name      = "DTS CFT Developers"
  common_tags             = var.common_tags
  create_managed_identity = true
}

data "azurerm_key_vault" "key_vault" {
  name                = module.key_vault.key_vault_name
  resource_group_name = azurerm_resource_group.shared.name
  depends_on          = [module.key_vault]
}
