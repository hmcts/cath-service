module "key_vault" {
  source = "git::https://github.com/hmcts/cnp-module-key-vault?ref=master"

  product             = var.product
  env                 = var.env
  tenant_id           = var.tenant_id
  object_id           = var.ci_service_principal_object_id
  resource_group_name = azurerm_resource_group.shared.name

  # Write access, so members can create the secrets the apps mount from this vault.
  # Must not be "DTS CFT Developers": the module also grants that group read-only
  # access via its developers_group default, and Azure allows one access policy per
  # object id, so passing the same group here is silently overridden.
  product_group_name = "DTS PIP Non-Prod"

  common_tags             = var.common_tags
  create_managed_identity = true
}

data "azurerm_key_vault" "key_vault" {
  name                = module.key_vault.key_vault_name
  resource_group_name = azurerm_resource_group.shared.name
  depends_on          = [module.key_vault]
}

resource "azurerm_key_vault_access_policy" "e2e_oidc_sp" {
  key_vault_id = data.azurerm_key_vault.key_vault.id
  tenant_id    = var.tenant_id
  object_id    = var.e2e_oidc_object_id

  secret_permissions = ["Get", "List"]
}
