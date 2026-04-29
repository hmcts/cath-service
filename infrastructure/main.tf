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

resource "azurerm_resource_group" "rg" {
  name     = "${var.product}-${var.env}"
  location = var.location
  tags     = var.common_tags
}
