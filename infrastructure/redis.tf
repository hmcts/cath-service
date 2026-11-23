# Azure Managed Redis (#697), which replaced Azure Cache for Redis.

# The Managed Redis module never looks the subnet up, so
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

# urlencode because nothing guarantees the Managed Redis key is free of
# URL-reserved characters.
resource "azurerm_key_vault_secret" "managed_redis_url" {
  name            = "managed-redis-url"
  value           = "rediss://:${urlencode(module.managed_redis.primary_access_key)}@${module.managed_redis.hostname}:${module.managed_redis.port}"
  key_vault_id    = module.key_vault.key_vault_id
  expiration_date = local.secret_expiry
  tags            = merge(local.common_tags, { source = "Redis" })

  depends_on = [module.managed_redis]
}
