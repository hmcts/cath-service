# SC-cleared group for PIM access to production data, per the
# cnp-module-storage-account README.
data "azuread_group" "sc_group" {
  display_name     = "DTS CaTH Prod"
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

  containers = concat(
    [
      { name = "artefact", access_type = "private" },
      { name = "files", access_type = "private" },
      { name = "publications", access_type = "private" },
    ],
    local.ui_baseline ? [{ name = "ui-baseline", access_type = "private" }] : [],
  )

  managed_identity_object_id = module.key_vault.managed_identity_objectid[0]
  role_assignments           = ["Storage Blob Data Contributor"]

  # Eligibility lasts duration_days (module default 365) from time_static.pim_start,
  # which is fixed at the first apply. It is not renewed: once it lapses, every prod
  # plan tries to recreate both assignments with the old start date. Renew by
  # replacing module.sa.time_static.pim_start (all fields are ForceNew), which needs
  # a one-off -replace run outside the normal pipeline.
  pim_roles = var.env != "prod" ? {} : {
    "Storage Blob Delegator" = {
      principal_id = data.azuread_group.sc_group.object_id
    }

    "Storage Blob Data Reader" = {
      principal_id = data.azuread_group.sc_group.object_id
    }
  }
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
