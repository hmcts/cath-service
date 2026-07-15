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
  default_action           = "Allow"

  containers = [
    { name = "artefact", access_type = "private" },
    { name = "files", access_type = "private" },
    { name = "publications", access_type = "private" },
  ]

  managed_identity_object_id = module.key_vault.managed_identity_objectid[0]
  role_assignments           = ["Storage Blob Data Contributor"]
}

resource "azurerm_key_vault_secret" "storageaccount_connection_string" {
  name         = "storageaccount-connection-string"
  value        = module.sa.storageaccount_primary_connection_string
  key_vault_id = module.key_vault.key_vault_id
}

resource "azurerm_key_vault_secret" "storageaccount_name" {
  name         = "storageaccount-name"
  value        = module.sa.storageaccount_name
  key_vault_id = module.key_vault.key_vault_id
}
