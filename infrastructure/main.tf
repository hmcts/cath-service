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

# Storage account only. Kept separate from the shared group purely because
# moving an existing storage account between resource groups is a ForceNew
# change in the azurerm provider, which would destroy cathsaaat and every blob
# in it. Consolidating this into azurerm_resource_group.shared requires an
# out-of-band `az resource move` first, then a no-op apply - see #978.
# The address stays `rg` to match existing state and avoid a state move.
resource "azurerm_resource_group" "rg" {
  name     = "${var.product}-${var.env}-${var.component}"
  location = var.location
  tags     = var.common_tags
}
