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

# Key vaults and application insights.
resource "azurerm_resource_group" "shared" {
  name     = "${var.product}-${var.env}"
  location = var.location
  tags     = var.common_tags
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
  tags     = var.common_tags
}

# Adding the count above changes the address from `rg` to `rg[0]`. aat's group
# already exists in state under the unindexed address, so re-home it rather than
# let terraform destroy and recreate it.
moved {
  from = azurerm_resource_group.rg
  to   = azurerm_resource_group.rg[0]
}
