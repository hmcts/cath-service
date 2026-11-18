provider "azurerm" {
  features {
  }
  subscription_id = var.subscription
}

provider "azurerm" {
  alias           = "postgres_network"
  subscription_id = var.aks_subscription_id
  features {}
}

# The subscription holding each environment's core-infra vnet, which hosts the
# Redis private endpoints. ithc and perftest are in a different subscription
# (DCD-CNP-QA) from aat and demo (DCD-CNP-DEV) and prod (DCD-CNP-PROD), so they
# set core_infra_subscription_id explicitly; the others leave it null and fall
# back to var.subscription. Since #1065 ithc and perftest also apply from
# DCD-CNP-QA, so the override now matches their var.subscription, but it is
# kept so the lookup doesn't depend on where an environment applies from. The
# Managed Redis subnet lookup reads this alias in every environment.
provider "azurerm" {
  alias           = "core_infra"
  subscription_id = local.core_infra_subscription_id != null ? local.core_infra_subscription_id : var.subscription
  features {}
}

# The platform Log Analytics workspace sits in one subscription per tier
# (hmcts-nonprod or hmcts-prod), which is not the application subscription for
# perftest.
provider "azurerm" {
  alias           = "log_analytics"
  subscription_id = local.log_analytics_subscription_id
  features {}
}

# Key vaults and application insights.
resource "azurerm_resource_group" "shared" {
  name     = "${var.product}-${var.env}"
  location = var.location
  tags     = local.common_tags
}

# Storage account for aat only. Kept separate from the shared group purely
# because moving an existing storage account between resource groups is a
# ForceNew change in the azurerm provider, which would destroy cathsaaat and
# every blob in it. Consolidating aat into azurerm_resource_group.shared
# requires an out-of-band `az resource move` first, then a no-op apply - see
# #978.
#
# Environments provisioned after that decision put their storage account
# straight into the shared group, so this group is not created for them - see
# local.storage_uses_legacy_rg in env-config.tf.
resource "azurerm_resource_group" "rg" {
  count = local.storage_uses_legacy_rg ? 1 : 0

  name     = "${var.product}-${var.env}-${var.component}"
  location = var.location
  tags     = local.common_tags
}

# Adding the count above changes the address from `rg` to `rg[0]`. aat's group
# already exists in state under the unindexed address, so re-home it rather than
# let terraform destroy and recreate it.
moved {
  from = azurerm_resource_group.rg
  to   = azurerm_resource_group.rg[0]
}

# Expiry for Terraform-managed Key Vault secrets. Not timeadd(timestamp(), ...),
# which changes on every plan. The base time is fixed in state and rotates every
# 180 days; the first apply on or after day 180 pushes every expiry out to the
# new base + 365 days, so any apply in months 6-12 renews it before it lapses.
resource "time_rotating" "secret_expiry" {
  rotation_days = 180
}

locals {
  secret_expiry = timeadd(time_rotating.secret_expiry.rfc3339, "8760h")
}
