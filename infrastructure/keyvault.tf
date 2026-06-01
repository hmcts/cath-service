module "key_vault" {
  source = "git::https://github.com/hmcts/cnp-module-key-vault?ref=master"

  product                 = var.product
  env                     = var.env
  object_id               = var.ci_service_principal_object_id
  tenant_id               = var.tenant_id
  resource_group_name     = azurerm_resource_group.rg.name
  product_group_name      = var.product_group_name
  common_tags             = var.common_tags
  create_managed_identity = true
}

module "application_key_vault" {
  source = "git::https://github.com/hmcts/cnp-module-key-vault?ref=master"

  name                    = "${var.product}-kv-${var.env}"
  product                 = var.product
  env                     = var.env
  object_id               = var.ci_service_principal_object_id
  tenant_id               = var.tenant_id
  resource_group_name     = azurerm_resource_group.app_kv_rg.name
  product_group_name      = var.product_group_name
  common_tags             = var.common_tags
  create_managed_identity = true
}
