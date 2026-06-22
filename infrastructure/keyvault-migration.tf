# One-shot migration of application secrets from the legacy SDS key vault
# (cath-ss-kv-<env>) into the new CNP key vault (cath-<env>).
#
# Once the app helm charts have been switched to reference the new KV and the
# old KV is decommissioned this file (and the legacy access grant) should be
# removed.

data "azurerm_key_vault" "old_kv" {
  name                = "${var.product}-ss-kv-${var.env}"
  resource_group_name = "${var.product}-ss-kv-${var.env}-rg"
}

resource "azurerm_key_vault_access_policy" "old_kv_ci_read" {
  key_vault_id = data.azurerm_key_vault.old_kv.id
  tenant_id    = var.tenant_id
  object_id    = var.ci_service_principal_object_id

  secret_permissions = ["Get", "List"]
}

locals {
  migrated_secrets = [
    "session-secret",
    "govuk-notify-api-key",
    "sso-client-id",
    "sso-client-secret",
    "sso-issuer-url",
    "sso-sg-system-admin",
    "sso-sg-admin-ctsc",
    "sso-sg-admin-local",
    "cft-idam-client-secret",
    "auto-pip-stg-courtel-api",
    "courtel-certificate",
    "b2c-tenant-id",
    "auto-pip-stg-pip-account-management-stg-id",
    "auto-pip-stg-pip-account-management-stg-pwd",
    "b2c-ad-url",
    "app-tenant-id",
    "app-pip-data-management-id",
    "app-pip-data-management-scope",
    "xhibit-s3-access-key",
    "xhibit-s3-access-key-secret",
  ]
}

data "azurerm_key_vault_secret" "old" {
  for_each     = toset(local.migrated_secrets)
  name         = each.key
  key_vault_id = data.azurerm_key_vault.old_kv.id

  depends_on = [azurerm_key_vault_access_policy.old_kv_ci_read]
}

resource "azurerm_key_vault_secret" "migrated" {
  for_each     = toset(local.migrated_secrets)
  name         = each.key
  value        = data.azurerm_key_vault_secret.old[each.key].value
  key_vault_id = data.azurerm_key_vault.key_vault.id
}
