resource "azurerm_resource_group" "rg" {
  name     = "${var.product}-${var.env}"
  location = var.location
  tags     = var.common_tags
}

resource "azurerm_resource_group" "ss_kv_rg" {
  name     = "cath-ss-${var.env}-rg"
  location = var.location
  tags     = var.common_tags
}

resource "azurerm_resource_group" "postgres_rg" {
  name     = "flexible-cath-${var.env}-rg"
  location = var.location
  tags     = var.common_tags
}

resource "azurerm_resource_group" "redis_rg" {
  name     = "cath-cache-${var.env}"
  location = var.location
  tags     = var.common_tags
}
