# Per-environment variance for this root module.
#
# Everything else under infrastructure/ is already a pure function of var.env
# (resource group, key vaults, postgres, redis, storage, app insights), so this
# map deliberately carries only the settings that genuinely differ between
# environments.
#
# Redis sizing is a default plus per-environment overrides rather than a key in
# env_config: every environment runs the same Redis except prod.
locals {
  env_config = {
    # The expanded postgresql subnet exists because the original subnet in the
    # stg vnet is full - a stg-specific fact. In prod, postgres-expanded is the
    # only subnet the PROD principal can join (#1095). The demo, ithc and
    # perftest vnets have their own subnets, so they take the module default.
    # null (rather than "") means "argument not set", so the module's own
    # default applies.
    # core_infra_subscription_id is non-null only where the core-infra vnet is NOT
    # in var.subscription. aat and demo leave it null so cnp-module-redis keeps
    # doing its own lookup, exactly as today - their vnets are in DCD-CNP-DEV.
    # Every entry carries the same attributes, including the explicit nulls: a map
    # of objects with differing attribute sets fails type unification.
    # environment_tag overrides only the `environment` TAG, never var.env, so
    # resource names are unaffected. The HMCTS tagging policy denies any value
    # outside allowedEnvironmentNames in
    # hmcts/azure-policy/policies/tagging/policy.json - currently sandbox,
    # development, testing, demo, ITHC, staging, production, preview. "demo" and
    # "ITHC" are on that list so those environments need no override; "perftest"
    # is not, and every taggable resource in it was rejected with
    # RequestDisallowedByPolicy until this mapped it to "testing".
    # The terraform-deploy library already tags prod "production", so prod needs
    # no override either.
    # apim_suffix uses CFT names (aat is stg, perftest is test); null means no APIM.
    # Prod APIM waits for #1161.
    # crime_federation_enabled reads crime-oidc-config from the app vault - see
    # tf-crime-connection-mi.tf. The secret must exist in the vault before this is true.
    # ui_baseline adds the storage for tools/ui-baseline (recorded pip baselines and check
    # results). Only the environment testers run parity checks against has it.
    aat      = { subnet_suffix = "expanded", core_infra_subscription_id = null, environment_tag = null, apim_suffix = "stg", crime_federation_enabled = true, ui_baseline = false }
    demo     = { subnet_suffix = null, core_infra_subscription_id = null, environment_tag = null, apim_suffix = "demo", crime_federation_enabled = true, ui_baseline = false }
    ithc     = { subnet_suffix = null, core_infra_subscription_id = "7a4e3bd5-ae3a-4d0c-b441-2188fee3ff1c", environment_tag = null, apim_suffix = null, crime_federation_enabled = true, ui_baseline = false }
    perftest = { subnet_suffix = null, core_infra_subscription_id = "7a4e3bd5-ae3a-4d0c-b441-2188fee3ff1c", environment_tag = "testing", apim_suffix = "test", crime_federation_enabled = true, ui_baseline = true }
    prod     = { subnet_suffix = "expanded", core_infra_subscription_id = null, environment_tag = null, apim_suffix = null, crime_federation_enabled = true, ui_baseline = false }
  }

  # Prod-or-not facts, the same split the CNP modules make internally. Not keys
  # in env_config, because they are not per-environment variance.
  is_prod = var.env == "prod"

  # Write access on all three vaults. cnp-module-key-vault cannot create a vault
  # without a product-team policy, so prod needs a named PROD group. The module
  # looks it up with security_enabled = true, so it must be a security group.
  key_vault_product_group_name = local.is_prod ? "DTS CaTH Prod" : "DTS PIP Non-Prod"

  # The E2E/CI GitHub OIDC app registration is a non-prod identity, so it gets
  # nothing in prod.
  grant_e2e_access = !local.is_prod

  # CNP prod hostnames carry no environment label.
  platform_domain = local.is_prod ? "platform.hmcts.net" : "${var.env}.platform.hmcts.net"

  crime_federation_enabled = try(local.env_config[var.env].crime_federation_enabled, false)

  # Redis only: Postgres sizing is left to terraform-module-postgresql-flexible's
  # defaults in every environment (#1096 task 5). Non-prod stays on Basic for
  # cost; prod needs Premium's replication and SLA.
  default_sizing = {
    redis_sku_name = "Basic"
    redis_family   = "C"
    redis_capacity = 0
  }
  sizing_overrides = {
    prod = {
      redis_sku_name = "Premium"
      redis_family   = "P"
      redis_capacity = 1
    }
  }
  sizing = merge(local.default_sizing, try(local.sizing_overrides[var.env], {}))

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

  # The subscription holding the platform Log Analytics workspace for this
  # environment: hmcts-nonprod for every non-prod environment, hmcts-prod for
  # prod. It does not move when the application resources do - see
  # appinsights.tf.
  log_analytics_subscription_id = module.log_analytics_workspace.subscription_id

  # The resource group uses our env name (cft-aat-network-rg), not the APIM suffix.
  apim_suffix = try(local.env_config[var.env].apim_suffix, null)
  deploy_apim = local.apim_suffix != null
  apim_name   = "cft-api-mgmt-${coalesce(local.apim_suffix, var.env)}"
  apim_rg     = "cft-${var.env}-network-rg"

  # Explicit allowlist, so adding prod (or any other environment) to env_config
  # never deploys the mock third party by accident.
  deploy_apim_testing_support = local.deploy_apim && contains(["aat", "demo", "perftest"], var.env)

  # Use local.common_tags everywhere instead of var.common_tags. Identical to
  # var.common_tags unless the environment needs a tag override, so aat, demo and
  # ithc see no diff.
  environment_tag = try(local.env_config[var.env].environment_tag, null)
  common_tags = local.environment_tag == null ? var.common_tags : merge(
    var.common_tags, { environment = local.environment_tag }
  )

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

  ui_baseline = try(local.env_config[var.env].ui_baseline, false)
}
