module "application_key_vault" {
  source = "git::https://github.com/hmcts/cnp-module-key-vault?ref=master"

  name                    = "${var.product}-ss-kv-${var.env}"
  product                 = var.product
  env                     = var.env
  object_id               = var.ci_service_principal_object_id
  tenant_id               = var.tenant_id
  resource_group_name     = azurerm_resource_group.ss_kv_rg.name
  product_group_name      = var.product_group_name
  common_tags             = var.common_tags
  create_managed_identity = true
}

# The legacy cath-{env} KV exists for stg/test/ithc (not demo).
# The app MI needs get/list access so pods can mount secrets from it.
locals {
  legacy_kv_rg = {
    stg  = "cath-stg"
    test = "cath-bootstrap-test-rg"
    ithc = "cath-bootstrap-ithc-rg"
  }
  legacy_kv_exists = contains(keys(local.legacy_kv_rg), var.env)
}

data "azurerm_user_assigned_identity" "app_mi" {
  name                = "${var.product}-${var.env}-mi"
  resource_group_name = "managed-identities-${var.env}-rg"

  depends_on = [module.application_key_vault]
}

data "azurerm_key_vault" "legacy_kv" {
  count               = local.legacy_kv_exists ? 1 : 0
  name                = "${var.product}-${var.env}"
  resource_group_name = local.legacy_kv_rg[var.env]
}

resource "azurerm_key_vault_access_policy" "legacy_kv_app_mi" {
  count        = local.legacy_kv_exists ? 1 : 0
  key_vault_id = data.azurerm_key_vault.legacy_kv[0].id
  tenant_id    = var.tenant_id
  object_id    = data.azurerm_user_assigned_identity.app_mi.principal_id

  secret_permissions = ["Get", "List"]
}

# Grant the GitHub Actions OIDC app registration Get/List access to the application KV
# so the app server can load secrets via DefaultAzureCredential during E2E tests
resource "azurerm_key_vault_access_policy" "application_kv_e2e_oidc_sp" {
  key_vault_id = module.application_key_vault.key_vault_id
  tenant_id    = var.tenant_id
  object_id    = var.e2e_oidc_object_id

  secret_permissions = ["Get", "List"]
}
