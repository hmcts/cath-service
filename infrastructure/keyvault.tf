# Key Vault configuration
# References the existing shared PIP Key Vault (borrowed from pip-shared-infrastructures)

data "azurerm_key_vault" "key_vault" {
  name                = "${var.key_vault_product}-${var.env}"
  resource_group_name = "${var.key_vault_product}-${var.env}"
}
