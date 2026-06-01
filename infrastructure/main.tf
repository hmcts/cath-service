locals {
  bootstrap_prefix = "${var.product}-bootstrap-${var.env}"

  # Pre-existing cath-{env} resource groups created by earlier pipeline runs.
  # These were not in state after the one-shot cleanup, so we import them here.
  existing_rg_ids = {
    demo = "/subscriptions/c68a4bed-4c3d-4956-af51-4ae164c1957c/resourceGroups/cath-demo"
    stg  = "/subscriptions/74dacd4f-a248-45bb-a2f0-af700dc4cf68/resourceGroups/cath-stg"
  }

  # Pre-existing KV secrets for demo that exist in Azure but are missing from state.
  # Version IDs are stable - once imported into state they won't be re-imported.
  existing_kv_secret_ids_demo = {
    postgres_host                 = "https://cath-ss-kv-demo.vault.azure.net/secrets/postgres-host/0d469fb342634daa95aba9c305c726ac"
    postgres_user                 = "https://cath-ss-kv-demo.vault.azure.net/secrets/postgres-user/5899f3907153416aa8f709feb5b80567"
    postgres_password             = "https://cath-ss-kv-demo.vault.azure.net/secrets/postgres-password/97576e9d5c5d4fbb97d94ec9d668084e"
    postgres_port                 = "https://cath-ss-kv-demo.vault.azure.net/secrets/postgres-port/feedaf71a09248d2a6e7e74838934621"
    postgres_url                  = "https://cath-ss-kv-demo.vault.azure.net/secrets/postgres-url/aa83da99b82f4d06a74cfced2757d986"
    redis_host                    = "https://cath-ss-kv-demo.vault.azure.net/secrets/redis-host/080d05a7cbf34d6984eeea03aae4d268"
    redis_port                    = "https://cath-ss-kv-demo.vault.azure.net/secrets/redis-port/b9b7c573f48d4606b92735d44a4067ac"
    redis_access_key              = "https://cath-ss-kv-demo.vault.azure.net/secrets/redis-access-key/98f79519d92b428b891b50a4209f06b1"
    redis_url                     = "https://cath-ss-kv-demo.vault.azure.net/secrets/redis-url/c69754054f6d4be5bdb436fe8bdf153e"
    app_insights_connection_string = "https://cath-ss-kv-demo.vault.azure.net/secrets/app-insights-connection-string/9410bb473e2644d3bc47779422b7a560"
  }

  # Pre-existing KV access policies for demo that exist in Azure but are missing from state.
  existing_kv_access_policy_ids_demo = {
    developer                                  = "/subscriptions/c68a4bed-4c3d-4956-af51-4ae164c1957c/resourceGroups/cath-ss-kv-demo-rg/providers/Microsoft.KeyVault/vaults/cath-ss-kv-demo/objectId/b2a1773c-a5ae-48b5-b5fa-95b0e05eee05"
    creator                                    = "/subscriptions/c68a4bed-4c3d-4956-af51-4ae164c1957c/resourceGroups/cath-ss-kv-demo-rg/providers/Microsoft.KeyVault/vaults/cath-ss-kv-demo/objectId/69aa7255-12ea-45a3-af45-e9d249cddfe0"
    implicit_managed_identity                  = "/subscriptions/c68a4bed-4c3d-4956-af51-4ae164c1957c/resourceGroups/cath-ss-kv-demo-rg/providers/Microsoft.KeyVault/vaults/cath-ss-kv-demo/objectId/2661c8d0-2f43-43e7-9566-a2134d4c181c"
    product_team                               = "/subscriptions/c68a4bed-4c3d-4956-af51-4ae164c1957c/resourceGroups/cath-ss-kv-demo-rg/providers/Microsoft.KeyVault/vaults/cath-ss-kv-demo/objectId/7bde62e7-b39f-487c-95c9-b4c794fdbb96"
  }

  # Pre-existing KV diagnostic setting for demo.
  existing_kv_diag_setting_ids = {
    demo = "/subscriptions/c68a4bed-4c3d-4956-af51-4ae164c1957c/resourceGroups/cath-ss-kv-demo-rg/providers/Microsoft.KeyVault/vaults/cath-ss-kv-demo|cath-ss-kv-demo"
    stg  = "/subscriptions/74dacd4f-a248-45bb-a2f0-af700dc4cf68/resourceGroups/cath-ss-kv-stg-rg/providers/Microsoft.KeyVault/vaults/cath-ss-kv-stg|cath-ss-kv-stg"
  }

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
    demo = "/subscriptions/c68a4bed-4c3d-4956-af51-4ae164c1957c/resourceGroups/cath-cache-demo/providers/Microsoft.Cache/redis/cath-cath-demo"
    test = "/subscriptions/3eec5bde-7feb-4566-bfb6-805df6e10b90/resourceGroups/cath-cache-test/providers/Microsoft.Cache/redis/cath-cath-test"
    ithc = "/subscriptions/ba71a911-e0d6-4776-a1a6-079af1df7139/resourceGroups/cath-cache-ithc/providers/Microsoft.Cache/redis/cath-cath-ithc"
    stg  = "/subscriptions/74dacd4f-a248-45bb-a2f0-af700dc4cf68/resourceGroups/cath-cache-stg/providers/Microsoft.Cache/redis/cath-cath-stg"
  }

  # Pre-existing cath-ss-kv-{env}-rg resource groups created by earlier pipeline runs.
  # These were not in state after the one-shot cleanup, so we import them here.
  existing_ss_kv_rg_ids = {
    demo = "/subscriptions/c68a4bed-4c3d-4956-af51-4ae164c1957c/resourceGroups/cath-ss-kv-demo-rg"
    test = "/subscriptions/3eec5bde-7feb-4566-bfb6-805df6e10b90/resourceGroups/cath-ss-kv-test-rg"
    ithc = "/subscriptions/ba71a911-e0d6-4776-a1a6-079af1df7139/resourceGroups/cath-ss-kv-ithc-rg"
    stg  = "/subscriptions/74dacd4f-a248-45bb-a2f0-af700dc4cf68/resourceGroups/cath-ss-kv-stg-rg"
  }

  # Pre-existing cath-ss-kv-{env} key vaults created by earlier pipeline runs.
  # Only envs where the KV already exists in Azure. test/ithc will be created fresh by Terraform.
  existing_ss_kv_ids = {
    demo = "/subscriptions/c68a4bed-4c3d-4956-af51-4ae164c1957c/resourceGroups/cath-ss-kv-demo-rg/providers/Microsoft.KeyVault/vaults/cath-ss-kv-demo"
    stg  = "/subscriptions/74dacd4f-a248-45bb-a2f0-af700dc4cf68/resourceGroups/cath-ss-kv-stg-rg/providers/Microsoft.KeyVault/vaults/cath-ss-kv-stg"
  }

  # Pre-existing managed identities for cath-ss-kv-{env} created by earlier pipeline runs.
  # Only envs where the KV/MI already exists in Azure. test/ithc will be created fresh by Terraform.
  existing_ss_kv_mi_ids = {
    demo = "/subscriptions/c68a4bed-4c3d-4956-af51-4ae164c1957c/resourceGroups/managed-identities-demo-rg/providers/Microsoft.ManagedIdentity/userAssignedIdentities/cath-demo-mi"
    stg  = "/subscriptions/74dacd4f-a248-45bb-a2f0-af700dc4cf68/resourceGroups/managed-identities-stg-rg/providers/Microsoft.ManagedIdentity/userAssignedIdentities/cath-stg-mi"
  }

}

import {
  for_each = contains(keys(local.existing_rg_ids), var.env) ? toset([local.existing_rg_ids[var.env]]) : toset([])
  to       = azurerm_resource_group.rg
  id       = each.value
}

import {
  for_each = var.env == "demo" ? toset([local.existing_kv_secret_ids_demo.postgres_host]) : toset([])
  to       = azurerm_key_vault_secret.postgres_host
  id       = each.value
}

import {
  for_each = var.env == "demo" ? toset([local.existing_kv_secret_ids_demo.postgres_user]) : toset([])
  to       = azurerm_key_vault_secret.postgres_user
  id       = each.value
}

import {
  for_each = var.env == "demo" ? toset([local.existing_kv_secret_ids_demo.postgres_password]) : toset([])
  to       = azurerm_key_vault_secret.postgres_password
  id       = each.value
}

import {
  for_each = var.env == "demo" ? toset([local.existing_kv_secret_ids_demo.postgres_port]) : toset([])
  to       = azurerm_key_vault_secret.postgres_port
  id       = each.value
}

import {
  for_each = var.env == "demo" ? toset([local.existing_kv_secret_ids_demo.postgres_url]) : toset([])
  to       = azurerm_key_vault_secret.postgres_url
  id       = each.value
}

import {
  for_each = var.env == "demo" ? toset([local.existing_kv_secret_ids_demo.redis_host]) : toset([])
  to       = azurerm_key_vault_secret.redis_host
  id       = each.value
}

import {
  for_each = var.env == "demo" ? toset([local.existing_kv_secret_ids_demo.redis_port]) : toset([])
  to       = azurerm_key_vault_secret.redis_port
  id       = each.value
}

import {
  for_each = var.env == "demo" ? toset([local.existing_kv_secret_ids_demo.redis_access_key]) : toset([])
  to       = azurerm_key_vault_secret.redis_access_key
  id       = each.value
}

import {
  for_each = var.env == "demo" ? toset([local.existing_kv_secret_ids_demo.redis_url]) : toset([])
  to       = azurerm_key_vault_secret.redis_url
  id       = each.value
}

import {
  for_each = var.env == "demo" ? toset([local.existing_kv_secret_ids_demo.app_insights_connection_string]) : toset([])
  to       = azurerm_key_vault_secret.app_insights_connection_string
  id       = each.value
}

import {
  for_each = var.env == "demo" ? toset([local.existing_kv_access_policy_ids_demo.developer]) : toset([])
  to       = module.application_key_vault.azurerm_key_vault_access_policy.developer[0]
  id       = each.value
}

import {
  for_each = var.env == "demo" ? toset([local.existing_kv_access_policy_ids_demo.creator]) : toset([])
  to       = module.application_key_vault.azurerm_key_vault_access_policy.creator_access_policy
  id       = each.value
}

import {
  for_each = var.env == "demo" ? toset([local.existing_kv_access_policy_ids_demo.implicit_managed_identity]) : toset([])
  to       = module.application_key_vault.azurerm_key_vault_access_policy.implicit_managed_identity_access_policy[0]
  id       = each.value
}

import {
  for_each = var.env == "demo" ? toset([local.existing_kv_access_policy_ids_demo.product_team]) : toset([])
  to       = module.application_key_vault.azurerm_key_vault_access_policy.product_team_access_policy
  id       = each.value
}

import {
  for_each = contains(keys(local.existing_kv_diag_setting_ids), var.env) ? toset([local.existing_kv_diag_setting_ids[var.env]]) : toset([])
  to       = module.application_key_vault.azurerm_monitor_diagnostic_setting.kv-ds
  id       = each.value
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

import {
  for_each = contains(keys(local.existing_ss_kv_rg_ids), var.env) ? toset([local.existing_ss_kv_rg_ids[var.env]]) : toset([])
  to       = azurerm_resource_group.ss_kv_rg
  id       = each.value
}

import {
  for_each = contains(keys(local.existing_ss_kv_ids), var.env) ? toset([local.existing_ss_kv_ids[var.env]]) : toset([])
  to       = module.application_key_vault.azurerm_key_vault.kv
  id       = each.value
}

import {
  for_each = contains(keys(local.existing_ss_kv_mi_ids), var.env) ? toset([local.existing_ss_kv_mi_ids[var.env]]) : toset([])
  to       = module.application_key_vault.azurerm_user_assigned_identity.managed_identity[0]
  id       = each.value
}

resource "azurerm_resource_group" "rg" {
  name     = "${var.product}-${var.env}"
  location = var.location
  tags     = var.common_tags
}

resource "azurerm_resource_group" "ss_kv_rg" {
  name     = "${var.product}-ss-kv-${var.env}-rg"
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
