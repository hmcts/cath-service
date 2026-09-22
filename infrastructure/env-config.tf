# Per-environment variance for this root module.
#
# Everything else under infrastructure/ is already a pure function of var.env
# (resource group, key vaults, postgres, redis, storage, app insights), so this
# map deliberately carries only the settings that genuinely differ between
# environments.
#
# Sizing is NOT here on purpose: aat, demo, ithc and perftest all run the same
# Postgres SKU/storage and the same Redis SKU/capacity, so lifting those into a
# map would be four copies of one value pretending to be configuration. Add a
# key here only when an environment actually needs to differ.
locals {
  env_config = {
    # The expanded postgresql subnet exists because the original subnet in the
    # stg vnet is full - a stg-specific fact. The demo, ithc and perftest vnets
    # have their own subnets, so they take the module default. null (rather than
    # "") means "argument not set", so the module's own default applies.
    # core_infra_subscription_id is non-null only where the core-infra vnet is NOT
    # in var.subscription. aat and demo leave it null so cnp-module-redis keeps
    # doing its own lookup, exactly as today - their vnets are in DCD-CNP-DEV.
    # Every entry carries the same attributes, including the explicit nulls: a map
    # of objects with differing attribute sets fails type unification.
    aat      = { subnet_suffix = "expanded", core_infra_subscription_id = null }
    demo     = { subnet_suffix = null, core_infra_subscription_id = null }
    ithc     = { subnet_suffix = null, core_infra_subscription_id = "7a4e3bd5-ae3a-4d0c-b441-2188fee3ff1c" }
    perftest = { subnet_suffix = null, core_infra_subscription_id = "7a4e3bd5-ae3a-4d0c-b441-2188fee3ff1c" }
  }

  # Unknown environments fall back to the module defaults rather than failing on
  # a missing map key.
  postgres_subnet_suffix = try(local.env_config[var.env].subnet_suffix, null)

  # cnp-module-redis looks up core-infra-vnet-<env> with the DEFAULT provider,
  # i.e. var.subscription. That is where aat's and demo's core-infra vnets live,
  # but ithc's and perftest's are in a different subscription, so the lookup
  # inside the module fails with "Subnet ... was not found". When this is set we
  # resolve the subnet ourselves against that subscription and hand the module an
  # explicit id, which makes it skip its own lookup entirely.
  core_infra_subscription_id = try(local.env_config[var.env].core_infra_subscription_id, null)
  redis_subnet_override      = local.core_infra_subscription_id != null

  # aat's storage account predates the consolidation in #978. Changing
  # resource_group_name on an existing azurerm_storage_account is ForceNew, which
  # would destroy cathsaaat and every blob in it, so aat keeps its legacy group
  # until the out-of-band `az resource move` in #978 lands. Environments created
  # after that decision are born in the shared group - the target state - so they
  # never need migrating.
  #
  # Not a key in env_config on purpose: this is a statement about one legacy
  # resource, not per-environment configuration, and putting it in the map would
  # imply a new environment might want to opt in.
  storage_uses_legacy_rg = var.env == "aat"
}
