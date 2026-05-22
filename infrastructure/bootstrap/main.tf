locals {
  prefix = "${var.product}-bootstrap-${var.env}"

  # IDs of pre-existing bootstrap KVs that were created outside of Terraform state
  # Used to import them into state on first run. Remove once all envs have been applied successfully.
  existing_bootstrap_kv_ids = {
    demo = "/subscriptions/c68a4bed-4c3d-4956-af51-4ae164c1957c/resourceGroups/cath-bootstrap-demo-rg/providers/Microsoft.KeyVault/vaults/cath-bootstrap-demo-kv"
    test = "/subscriptions/3eec5bde-7feb-4566-bfb6-805df6e10b90/resourceGroups/cath-bootstrap-test-rg/providers/Microsoft.KeyVault/vaults/cath-bootstrap-test-kv"
    ithc = "/subscriptions/ba71a911-e0d6-4776-a1a6-079af1df7139/resourceGroups/cath-bootstrap-ithc-rg/providers/Microsoft.KeyVault/vaults/cath-bootstrap-ithc-kv"
  }
}

import {
  for_each = var.env != "stg" ? toset([local.existing_bootstrap_kv_ids[var.env]]) : toset([])
  to       = module.key_vault_bootstrap.azurerm_key_vault.kv
  id       = each.value
}

provider "azurerm" {
  features {}
  subscription_id = var.subscription
}

resource "azurerm_resource_group" "rg" {
  name     = "${local.prefix}-rg"
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
  resource_group_name     = azurerm_resource_group.rg.name
  product_group_name      = var.active_directory_group
  common_tags             = var.common_tags
  create_managed_identity = false
}
