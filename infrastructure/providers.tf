terraform {
  backend "azurerm" {}

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 4.57"
    }
  }

  required_version = ">= 1.14.0"
}

provider "azurerm" {
  features {}
  subscription_id = var.subscription
}

provider "azurerm" {
  alias           = "postgres_network"
  subscription_id = var.aks_subscription_id
  features {}
}
