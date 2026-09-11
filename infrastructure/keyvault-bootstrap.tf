# Bootstrap key vault: test-account credentials for E2E runs, both in the pipeline
# and locally. Kept separate from the application vault (cath-<env>) so test
# credentials are never mounted into running pods - only the E2E workflow and
# developers read from here.
#
# Not to be confused with the SDS-era cath-bootstrap-aat-kv in
# cath-bootstrap-aat-rg, which this replaces.
#
# product_group_object_id is used rather than product_group_name. The module always
# creates its product_team_access_policy - the count is gated on
# enable_rbac_authorization, not on whether a group was supplied - so leaving both
# unset produces object_id = "" and the plan fails with:
#
#   Error: expected "object_id" to be a valid UUID, got
#
# Supplying the id here means the module owns that single policy, which avoids the
# one-policy-per-object-id collision that a separate explicit policy would cause.
# It grants the group List/Set/Delete/Recover on secrets - enough to add and rotate
# the test credentials.
#
# Note it does NOT grant Get: the module reserves that for developers_group, which
# defaults to DTS CFT Developers and gets Get/List. Since Azure permits one policy
# per object id, the same group cannot hold both, so reading a secret value back by
# hand is done as a member of DTS CFT Developers. The E2E workflow reads via the
# OIDC service principal policy below, so pipeline runs are unaffected.
module "bootstrap_key_vault" {
  source = "git::https://github.com/hmcts/cnp-module-key-vault?ref=DTSPO-31965/remove-jenkins-ptl-access"

  name                    = "${var.product}-bootstrap-${var.env}"
  product                 = var.product
  env                     = var.env
  object_id               = var.ci_service_principal_object_id
  tenant_id               = var.tenant_id
  resource_group_name     = azurerm_resource_group.shared.name
  product_group_object_id = var.pip_nonprod_group_object_id

  common_tags             = var.common_tags
  create_managed_identity = false
}

data "azurerm_key_vault" "bootstrap_key_vault" {
  name                = module.bootstrap_key_vault.key_vault_name
  resource_group_name = azurerm_resource_group.shared.name
  depends_on          = [module.bootstrap_key_vault]
}

# The GitHub Actions OIDC app registration, so job.e2e-test.yml can fetch the
# test credentials with `az keyvault secret show`.
resource "azurerm_key_vault_access_policy" "bootstrap_kv_e2e_oidc_sp" {
  key_vault_id = data.azurerm_key_vault.bootstrap_key_vault.id
  tenant_id    = var.tenant_id
  object_id    = var.e2e_oidc_object_id

  secret_permissions = ["Get", "List"]
}
