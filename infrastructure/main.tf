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

# Single resource group for everything this terraform manages: key vaults,
# application insights and the storage account. Postgres and redis create their
# own resource groups inside their modules.
resource "azurerm_resource_group" "shared" {
  name     = "${var.product}-${var.env}"
  location = var.location
  tags     = var.common_tags
}
