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

  # Sizing - see local.sizing in infrastructure/env-config.tf.
  redis_version = "6"
  sku_name      = local.sizing.redis_sku_name
  family        = local.sizing.redis_family
  capacity      = local.sizing.redis_capacity
}

resource "azurerm_key_vault_secret" "redis_host" {
  name            = "redis-host"
  value           = module.redis.host_name
  key_vault_id    = module.key_vault.key_vault_id
  expiration_date = local.secret_expiry
  tags            = merge(local.common_tags, { source = "Redis" })

  depends_on = [module.redis]
}

resource "azurerm_key_vault_secret" "redis_port" {
  name            = "redis-port"
  value           = tostring(module.redis.redis_port)
  key_vault_id    = module.key_vault.key_vault_id
  expiration_date = local.secret_expiry
  tags            = merge(local.common_tags, { source = "Redis" })

  depends_on = [module.redis]
}

resource "azurerm_key_vault_secret" "redis_access_key" {
  name            = "redis-access-key"
  value           = module.redis.access_key
  key_vault_id    = module.key_vault.key_vault_id
  expiration_date = local.secret_expiry
  tags            = merge(local.common_tags, { source = "Redis" })

  depends_on = [module.redis]
}

resource "azurerm_key_vault_secret" "redis_url" {
  name            = "redis-url"
  value           = "rediss://:${module.redis.access_key}@${module.redis.host_name}:${module.redis.redis_port}"
  key_vault_id    = module.key_vault.key_vault_id
  expiration_date = local.secret_expiry
  tags            = merge(local.common_tags, { source = "Redis" })

  depends_on = [module.redis]
}

# Azure Managed Redis, replacing the Azure Cache for Redis above (#697). Both run
# side by side until the apps are switched to managed-redis-url, so rolling back
# is a mapping revert rather than a rebuild.

# Unlike cnp-module-redis, the Managed Redis module never looks the subnet up, so
# every environment resolves it here. azurerm.core_infra falls back to
# var.subscription where core_infra_subscription_id is null (aat, demo, prod),
# which is where those vnets live.
data "azurerm_subnet" "managed_redis_private_endpoint" {
  provider = azurerm.core_infra

  name                 = "core-infra-subnet-2-${var.env}"
  resource_group_name  = "core-infra-${var.env}"
  virtual_network_name = "core-infra-vnet-${var.env}"
}

module "managed_redis" {
  source = "git::https://github.com/hmcts/terraform-module-azure-managed-redis?ref=main"

  product                      = var.product
  component                    = var.component
  name                         = "${var.product}-managed-redis-${var.env}"
  env                          = var.env
  location                     = var.location
  existing_resource_group_name = azurerm_resource_group.shared.name
  common_tags                  = local.common_tags

  # Sizing - see local.sizing in infrastructure/env-config.tf.
  sku_name                  = local.sizing.managed_redis_sku_name
  high_availability_enabled = local.sizing.managed_redis_high_availability

  public_network_access   = "Disabled"
  create_private_endpoint = true
  subnet_id               = data.azurerm_subnet.managed_redis_private_endpoint.id
  private_dns_zone_ids    = [local.managed_redis_private_dns_zone_id]

  # Both clients use a single-endpoint createClient and send only single-key
  # commands, which EnterpriseCluster serves without MOVED redirects. The module
  # default, OSSCluster, would need a cluster-aware client. Changing the policy
  # recreates the database, so it is fixed here.
  clustering_policy = "EnterpriseCluster"
  client_protocol   = "Encrypted"

  # Every key the apps write has a TTL (sessions, rate-limit buckets, pending
  # subscriptions, manual uploads). This is the module default, set explicitly
  # so a change to the default on ?ref=main can't alter it.
  eviction_policy = "VolatileLRU"

  # Keys stay on until the apps authenticate as cath-<env>-mi; the Data Owner
  # assignment is in place now so that path can be proven before any app change.
  access_keys_authentication_enabled = true
  redis_access_policy_assignments = {
    "Data Owner" = {
      cath = { object_id = module.key_vault.managed_identity_objectid[0] }
    }
  }
}

# urlencode because, unlike the cnp-module-redis key, nothing guarantees the
# Managed Redis key is free of URL-reserved characters.
resource "azurerm_key_vault_secret" "managed_redis_url" {
  name            = "managed-redis-url"
  value           = "rediss://:${urlencode(module.managed_redis.primary_access_key)}@${module.managed_redis.hostname}:${module.managed_redis.port}"
  key_vault_id    = module.key_vault.key_vault_id
  expiration_date = local.secret_expiry
  tags            = merge(local.common_tags, { source = "Redis" })

  depends_on = [module.managed_redis]
}

# No credentials: with REDIS_MI=true the apps authenticate as cath-<env>-mi
# through the Data Owner assignment above, so this URL carries only the host.
resource "azurerm_key_vault_secret" "managed_redis_entra_url" {
  name            = "managed-redis-entra-url"
  value           = "rediss://${module.managed_redis.hostname}:${module.managed_redis.port}"
  key_vault_id    = module.key_vault.key_vault_id
  expiration_date = local.secret_expiry
  tags            = merge(local.common_tags, { source = "Redis" })

  depends_on = [module.managed_redis]
}
