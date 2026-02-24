# Key Vault configuration
# References the existing shared PIP Key Vault

data "azurerm_key_vault" "key_vault" {
  name                = "${var.product}-${var.env}"
  resource_group_name = data.azurerm_resource_group.shared.name
}
