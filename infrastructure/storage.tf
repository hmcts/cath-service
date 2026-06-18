module "sa" {
  source = "git::https://github.com/hmcts/cnp-module-storage-account?ref=4.x"

  env                      = var.env
  storage_account_name     = "cathsa${var.env}"
  resource_group_name      = azurerm_resource_group.rg.name
  location                 = var.location
  account_kind             = var.sa_account_kind
  account_tier             = var.sa_account_tier
  account_replication_type = var.sa_account_replication_type
  access_tier              = var.sa_access_tier
  common_tags              = var.common_tags

  containers = [
    { name = "artefact", access_type = "private" },
    { name = "files", access_type = "private" },
    { name = "publications", access_type = "private" },
  ]

  role_assignments = [
    {
      role_definition_name = "Storage Blob Data Contributor"
      principal_id         = data.azurerm_user_assigned_identity.app_mi.principal_id
    },
  ]
}

resource "azurerm_key_vault_secret" "storageaccount_connection_string" {
  name         = "storageaccount-connection-string"
  value        = module.sa.storageaccount_primary_connection_string
  key_vault_id = module.application_key_vault.key_vault_id
}

resource "azurerm_key_vault_secret" "storageaccount_name" {
  name         = "storageaccount-name"
  value        = module.sa.storageaccount_name
  key_vault_id = module.application_key_vault.key_vault_id
}

resource "azurerm_key_vault_secret" "bootstrap_storageaccount_connection_string" {
  name         = "storageaccount-connection-string"
  value        = module.sa.storageaccount_primary_connection_string
  key_vault_id = module.key_vault_bootstrap.key_vault_id
}

resource "azurerm_key_vault_secret" "bootstrap_shared_storageaccount_name" {
  name         = "shared-storageaccount-name"
  value        = module.sa.storageaccount_name
  key_vault_id = module.key_vault_bootstrap.key_vault_id
}
