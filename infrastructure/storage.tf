# People only get blob data access in prod by activating it through PIM. The key
# vault product group is the SC-cleared prod team, so it doubles as the PIM group.
data "azuread_group" "storage_pim" {
  count            = local.is_prod ? 1 : 0
  display_name     = local.key_vault_product_group_name
  security_enabled = true
}

module "sa" {
  # Last 5.x commit before it moved to azurerm ~> 5.0 (2026-10-07).
  source = "git::https://github.com/hmcts/cnp-module-storage-account?ref=07f5c426c5135e210bad7dcc5041e3d60ca07a2c"

  env                      = var.env
  storage_account_name     = "cathsa${var.env}"
  resource_group_name      = local.storage_uses_legacy_rg ? azurerm_resource_group.rg[0].name : azurerm_resource_group.shared.name
  location                 = var.location
  account_kind             = var.sa_account_kind
  account_tier             = var.sa_account_tier
  account_replication_type = var.sa_account_replication_type
  access_tier              = var.sa_access_tier
  common_tags              = local.common_tags
  default_action           = "Allow"

  containers = [
    { name = "artefact", access_type = "private" },
    { name = "files", access_type = "private" },
    { name = "publications", access_type = "private" },
  ]

  managed_identity_object_id = module.key_vault.managed_identity_objectid[0]
  role_assignments           = ["Storage Blob Data Contributor"]

  # Eligibility runs for duration_days (module default 365) from the first apply
  # and is not renewed automatically: replace module.sa.time_static.pim_start to
  # renew it before it lapses.
  pim_roles = local.is_prod ? {
    "Storage Blob Data Reader" = { principal_id = data.azuread_group.storage_pim[0].object_id }
    "Storage Blob Delegator"   = { principal_id = data.azuread_group.storage_pim[0].object_id }
  } : {}
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
