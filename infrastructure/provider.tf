# CFTAPPS subscription, where the CFT APIM instances live.
provider "azurerm" {
  alias           = "cftapps"
  subscription_id = var.aks_subscription_id
  features {}
}
