# Resolved here rather than inside cnp-module-redis, which looks the same subnet
# up with the default provider and so cannot see it for ithc and perftest. Doing
# it as a data source means a wrong vnet, subnet or missing permission fails at
# plan time; passing a hand-built resource id would only fail at apply.
data "azurerm_subnet" "redis_private_endpoint" {
  provider = azurerm.core_infra
  count    = local.redis_subnet_override ? 1 : 0

  name                 = "core-infra-subnet-2-${var.env}"
  resource_group_name  = "core-infra-${var.env}"
  virtual_network_name = "core-infra-vnet-${var.env}"
}

module "redis" {
  source = "git::https://github.com/hmcts/cnp-module-redis?ref=master"

  product       = var.product
  name          = "${var.product}-${var.env}"
  location      = var.location
  env           = var.env
  common_tags   = local.common_tags
  business_area = "cft"

  private_endpoint_enabled      = true
  public_network_access_enabled = false

  # Empty for aat and demo, so the module falls back to its own lookup and their
  # behaviour is unchanged.
  private_endpoint_subnet = local.redis_subnet_override ? data.azurerm_subnet.redis_private_endpoint[0].id : ""

  redis_version = "6"
  sku_name      = "Basic"
  family        = "C"
  capacity      = 0
}

resource "azurerm_key_vault_secret" "redis_host" {
  name         = "redis-host"
  value        = module.redis.host_name
  key_vault_id = module.key_vault.key_vault_id
}

resource "azurerm_key_vault_secret" "redis_port" {
  name         = "redis-port"
  value        = tostring(module.redis.redis_port)
  key_vault_id = module.key_vault.key_vault_id
}

resource "azurerm_key_vault_secret" "redis_access_key" {
  name         = "redis-access-key"
  value        = module.redis.access_key
  key_vault_id = module.key_vault.key_vault_id
}

resource "azurerm_key_vault_secret" "redis_url" {
  name         = "redis-url"
  value        = "rediss://:${module.redis.access_key}@${module.redis.host_name}:${module.redis.redis_port}"
  key_vault_id = module.key_vault.key_vault_id
}
