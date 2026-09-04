terraform {
  backend "azurerm" {}

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 4.57"
    }
    # Used to resolve the product team's AD group to an object id in bootstrap.tf.
    # cnp-module-key-vault already pulls this in transitively; declaring it here makes
    # the dependency explicit now that root-level configuration uses it directly.
    azuread = {
      source  = "hashicorp/azuread"
      version = "~> 3.0"
    }
  }

  required_version = ">= 1.14.0"
}
