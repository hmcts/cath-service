# Bootstrap key vault.
#
# This holds credentials that are not produced by this terraform — test accounts,
# third-party API keys, bot tokens — so they survive a teardown of the application
# vault and are not rotated by an apply. The distinction from module.key_vault in
# keyvault.tf is lifecycle: that one holds generated values (postgres passwords,
# connection strings), this one holds values a human or another system put there.
#
# The vault and its resource group already exist in Azure, created by this repo's
# terraform before the CNP migration (their tags still say builtFrom
# hmcts/cath-service). VIBE-465 deleted the old bootstrap.tf, which removed them
# from the configuration but not from Azure, leaving them unmanaged: still there,
# still holding secrets, but with no access policies and nothing to reconcile them.
#
# So this re-adopts them via import blocks rather than declaring them fresh —
# terraform would otherwise plan to create a vault whose name is already taken, and
# the apply would fail on the name conflict.

resource "azurerm_resource_group" "bootstrap" {
  name     = "${var.product}-bootstrap-${var.env}-rg"
  location = var.location
  tags     = var.common_tags
}

resource "azurerm_key_vault" "bootstrap" {
  name                = "${var.product}-bootstrap-${var.env}-kv"
  location            = var.location
  resource_group_name = azurerm_resource_group.bootstrap.name
  tenant_id           = var.tenant_id

  # Matches the live resource, so the import below plans no changes. These were all
  # set by cnp-module-key-vault when it originally created this vault, and were read
  # back off the live resource to confirm. Note Azure reports
  # softDeleteRetentionInDays as null when it is the 90-day default, so null there and
  # 90 here agree.
  sku_name                        = "standard"
  soft_delete_retention_days      = 90
  purge_protection_enabled        = true
  enabled_for_disk_encryption     = true
  enabled_for_deployment          = true
  enabled_for_template_deployment = true
  public_network_access_enabled   = true

  tags = var.common_tags
}

# Adopt the existing resources instead of creating new ones. Both are safe to leave
# in place permanently: an import block for a resource already in state is a no-op.
import {
  to = azurerm_resource_group.bootstrap
  id = "/subscriptions/${var.subscription}/resourceGroups/${var.product}-bootstrap-${var.env}-rg"
}

import {
  to = azurerm_key_vault.bootstrap
  id = "/subscriptions/${var.subscription}/resourceGroups/${var.product}-bootstrap-${var.env}-rg/providers/Microsoft.KeyVault/vaults/${var.product}-bootstrap-${var.env}-kv"
}

# Read access for the CI service principal, so workflows can fetch credentials from
# here with `az keyvault secret show`. Nothing currently has any access to this
# vault: the CNP migration dropped the policies along with the configuration, which
# is why an e2e or watchdog workflow reading from it gets a 403.
#
# ci_service_principal_object_id is derived from the CI credentials at plan time by
# the terraform-deploy action, so this follows the service principal rather than
# pinning an object id that would silently go stale if the credentials changed.
resource "azurerm_key_vault_access_policy" "bootstrap_kv_ci_sp" {
  key_vault_id = azurerm_key_vault.bootstrap.id
  tenant_id    = var.tenant_id
  object_id    = var.ci_service_principal_object_id

  # Read-only on purpose. Secrets here are placed deliberately by a human or another
  # system; CI has no reason to write them, and Set would let a bad apply overwrite a
  # credential this terraform cannot regenerate.
  secret_permissions = ["Get", "List"]
}

# Read access for the app managed identity, so pods can mount secrets from here the
# same way they do from the application vault. The identity is created by
# module.key_vault in keyvault.tf (create_managed_identity = true), so this reads its
# object id from there rather than looking the identity up by name.
resource "azurerm_key_vault_access_policy" "bootstrap_kv_app_mi" {
  key_vault_id = azurerm_key_vault.bootstrap.id
  tenant_id    = var.tenant_id
  # The module's output is a splat over a counted resource, so it is a list even
  # though create_managed_identity means there is exactly one.
  object_id = one(module.key_vault.managed_identity_objectid)

  secret_permissions = ["Get", "List"]
}

# Write access for the team, so a human can put a credential in here without an
# apply — which is the point of this vault. Same group keyvault.tf passes as
# product_group_name, resolved here because a group name cannot be used as an
# object id directly.
data "azuread_group" "product_team" {
  display_name = "DTS PIP Non-Prod"
}

resource "azurerm_key_vault_access_policy" "bootstrap_kv_team" {
  key_vault_id = azurerm_key_vault.bootstrap.id
  tenant_id    = var.tenant_id
  object_id    = data.azuread_group.product_team.object_id

  # Purge is deliberately absent: purge protection is on, so a purge cannot succeed
  # anyway, and granting it implies a capability that does not exist here.
  secret_permissions = ["Get", "List", "Set", "Delete", "Recover"]
}
