locals {
  bootstrap_prefix = "${var.product}-bootstrap-${var.env}"

  # Pre-existing bootstrap resource groups and KVs created outside of Terraform state.
  # Used to import them into state on first run. Remove once all envs have been applied successfully.
  existing_bootstrap_rg_ids = {
    demo = "/subscriptions/c68a4bed-4c3d-4956-af51-4ae164c1957c/resourceGroups/cath-bootstrap-demo-rg"
    test = "/subscriptions/3eec5bde-7feb-4566-bfb6-805df6e10b90/resourceGroups/cath-bootstrap-test-rg"
    ithc = "/subscriptions/ba71a911-e0d6-4776-a1a6-079af1df7139/resourceGroups/cath-bootstrap-ithc-rg"
  }

  existing_bootstrap_kv_ids = {
    demo = "/subscriptions/c68a4bed-4c3d-4956-af51-4ae164c1957c/resourceGroups/cath-bootstrap-demo-rg/providers/Microsoft.KeyVault/vaults/cath-bootstrap-demo-kv"
    test = "/subscriptions/3eec5bde-7feb-4566-bfb6-805df6e10b90/resourceGroups/cath-bootstrap-test-rg/providers/Microsoft.KeyVault/vaults/cath-bootstrap-test-kv"
    ithc = "/subscriptions/ba71a911-e0d6-4776-a1a6-079af1df7139/resourceGroups/cath-bootstrap-ithc-rg/providers/Microsoft.KeyVault/vaults/cath-bootstrap-ithc-kv"
  }

  # Pre-existing Redis caches created outside of Terraform state.
  # Used to import them into state on first run. Remove once all envs have been applied successfully.
  existing_redis_ids = {
    demo = "/subscriptions/c68a4bed-4c3d-4956-af51-4ae164c1957c/resourceGroups/cath-cache-demo/providers/Microsoft.Cache/Redis/cath-cath-demo"
    test = "/subscriptions/3eec5bde-7feb-4566-bfb6-805df6e10b90/resourceGroups/cath-cache-test/providers/Microsoft.Cache/Redis/cath-cath-test"
    ithc = "/subscriptions/ba71a911-e0d6-4776-a1a6-079af1df7139/resourceGroups/cath-cache-ithc/providers/Microsoft.Cache/Redis/cath-cath-ithc"
    stg  = "/subscriptions/74dacd4f-a248-45bb-a2f0-af700dc4cf68/resourceGroups/cath-cache-stg/providers/Microsoft.Cache/Redis/cath-cath-stg"
  }

}

import {
  for_each = contains(keys(local.existing_bootstrap_rg_ids), var.env) ? toset([local.existing_bootstrap_rg_ids[var.env]]) : toset([])
  to       = azurerm_resource_group.bootstrap_rg
  id       = each.value
}

import {
  for_each = contains(keys(local.existing_bootstrap_kv_ids), var.env) ? toset([local.existing_bootstrap_kv_ids[var.env]]) : toset([])
  to       = module.key_vault_bootstrap.azurerm_key_vault.kv
  id       = each.value
}

import {
  for_each = contains(keys(local.existing_redis_ids), var.env) ? toset([local.existing_redis_ids[var.env]]) : toset([])
  to       = module.redis.azurerm_redis_cache.redis
  id       = each.value
}

resource "azurerm_resource_group" "rg" {
  name     = "${var.product}-${var.env}"
  location = var.location
  tags     = var.common_tags
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
