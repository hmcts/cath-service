# CATH Key Vault
# Creates a dedicated key vault for CATH service secrets (postgres, redis, app-insights)
# The managed identity (cath-{env}-mi) is created by pip-shared-infrastructures

module "key_vault" {
  source = "git@github.com:hmcts/cnp-module-key-vault?ref=master"

  name                    = "${var.product}-${var.env}"
  product                 = var.product
  env                     = var.env
  object_id               = var.jenkins_object_id
  resource_group_name     = azurerm_resource_group.rg.name
  product_group_name      = var.product_group_name
  common_tags             = var.common_tags
  create_managed_identity = false

  managed_identity_object_ids = [data.azurerm_user_assigned_identity.cath_mi.principal_id]
}

data "azurerm_user_assigned_identity" "cath_mi" {
  name                = "${var.product}-${var.env}-mi"
  resource_group_name = "managed-identities-${var.env}-rg"
}

# Reference to PIP shared Key Vault (for Terraform to write secrets that PIP services also need)
data "azurerm_key_vault" "pip_ss_kv" {
  name                = "pip-ss-kv-${var.env}"
  resource_group_name = "pip-ss-${var.env}-rg"
}
