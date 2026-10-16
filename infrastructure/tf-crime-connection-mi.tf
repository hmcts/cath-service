# Crime Portal's AKS workloads exchange their service account tokens for
# cath-cp-<env>-mi tokens. Issuer/subject pairs come from Crime Portal via the
# crime-oidc-config secret in the bootstrap vault rather than the Crime Portal
# vault, so the plan-time read does not depend on a vault this same apply
# creates. The secret must exist in every planned environment before merge.
#
# Deliberately no try() around jsondecode: a silent fallback to no connections
# would destroy every credential. Keep "connections" append-only - with count,
# removing an entry re-indexes and recreates every later credential.
locals {
  mi_resource_group_name = "managed-identities-${var.env}-rg"
  crime_oidc_json_config = jsondecode(data.azurerm_key_vault_secret.crime_oidc_config.value)
}

# The module output, not data.azurerm_key_vault.bootstrap_key_vault: that data
# source's depends_on would defer this read whenever the vault module has a
# pending change, leaving count unknown and failing the plan.
data "azurerm_key_vault_secret" "crime_oidc_config" {
  name         = "crime-oidc-config"
  key_vault_id = module.bootstrap_key_vault.key_vault_id
}

data "azurerm_user_assigned_identity" "app_cp_mi" {
  name                = "cath-cp-${var.env}-mi"
  resource_group_name = local.mi_resource_group_name

  depends_on = [module.kv_cp]
}

# Federation needs an exact string match, and Crime Portal's config has had
# trailing spaces, hence trimspace().
resource "azurerm_federated_identity_credential" "cath_crime_federated_connection" {
  count = length(local.crime_oidc_json_config.connections)

  name                = sensitive("cath-${var.env}-crime-federated-credential-${local.crime_oidc_json_config.connections[count.index].name}")
  resource_group_name = local.mi_resource_group_name
  audience            = ["api://AzureADTokenExchange"]
  issuer              = sensitive(trimspace(local.crime_oidc_json_config.connections[count.index].issuer))
  parent_id           = data.azurerm_user_assigned_identity.app_cp_mi.id
  subject             = sensitive(trimspace(local.crime_oidc_json_config.connections[count.index].subject))
}
