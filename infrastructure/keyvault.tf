locals {
  # Access policies manually restored on cath-kv-stg and cath-stg after erroneous destroy.
  # Import them into state so Terraform does not try to re-create them.
  # Remove once stg has been applied successfully.
  stg_kv_access_policy_ids = var.env == "stg" ? toset([
    "/subscriptions/74dacd4f-a248-45bb-a2f0-af700dc4cf68/resourceGroups/cath-stg/providers/Microsoft.KeyVault/vaults/cath-stg/objectId/69aa7255-12ea-45a3-af45-e9d249cddfe0"
  ]) : toset([])

  stg_app_kv_access_policy_ids = var.env == "stg" ? toset([
    "/subscriptions/74dacd4f-a248-45bb-a2f0-af700dc4cf68/resourceGroups/cath-stg/providers/Microsoft.KeyVault/vaults/cath-kv-stg/objectId/69aa7255-12ea-45a3-af45-e9d249cddfe0"
  ]) : toset([])
}

import {
  for_each = local.stg_kv_access_policy_ids
  to       = module.key_vault.azurerm_key_vault_access_policy.creator_access_policy
  id       = each.value
}

import {
  for_each = local.stg_app_kv_access_policy_ids
  to       = module.application_key_vault.azurerm_key_vault_access_policy.creator_access_policy
  id       = each.value
}

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
  resource_group_name     = azurerm_resource_group.rg.name
  product_group_name      = var.product_group_name
  common_tags             = var.common_tags
  create_managed_identity = true
}
