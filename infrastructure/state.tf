terraform {
  backend "azurerm" {
    resource_group_name  = "jenkins-state-stg"
    storage_account_name = "sdsstatestg"
    container_name       = "tfstate-stg"
    key                  = "cath-service/stg/terraform.tfstate"
  }

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 4.57"
    }
  }

  required_version = ">= 1.14.0"
}
