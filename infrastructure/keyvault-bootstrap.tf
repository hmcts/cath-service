# Bootstrap key vault: test-account credentials for E2E runs, both in the pipeline
# and locally. Kept separate from the application vault (cath-<env>) so test
# credentials are never mounted into running pods - only the E2E workflow and
# developers read from here.
#
# Not to be confused with the SDS-era cath-bootstrap-aat-kv in
# cath-bootstrap-aat-rg, which this replaces.
#
# product_group_name is deliberately unset. The module would grant that group
# List/Set/Delete/Recover but NOT Get, which is right for an application vault
# that is only ever written to - but wrong here, because developers need to read
# the test credentials to run E2E locally. Azure allows one access policy per
# object id, so passing the group here and adding a second policy for it would
# collide. Instead the group's policy is declared explicitly below.
module "bootstrap_key_vault" {
  source = "git::https://github.com/hmcts/cnp-module-key-vault?ref=master"

  name                = "${var.product}-bootstrap-${var.env}"
  product             = var.product
  env                 = var.env
  object_id           = var.ci_service_principal_object_id
  tenant_id           = var.tenant_id
  resource_group_name = azurerm_resource_group.shared.name

  common_tags             = var.common_tags
  create_managed_identity = false
}

data "azurerm_key_vault" "bootstrap_key_vault" {
  name                = module.bootstrap_key_vault.key_vault_name
  resource_group_name = azurerm_resource_group.shared.name
  depends_on          = [module.bootstrap_key_vault]
}

# Full secret access for the team, so members can add the test credentials and
# read them back when running E2E locally.
#
# The object id is given directly rather than looked up with a data
# "azuread_group" source: this root module declares only the azurerm provider,
# and adding azuread just to resolve one static group id is not worth the
# dependency. Value verified with `az ad group show --group "DTS PIP Non-Prod"`.
resource "azurerm_key_vault_access_policy" "bootstrap_kv_pip_nonprod" {
  key_vault_id = data.azurerm_key_vault.bootstrap_key_vault.id
  tenant_id    = var.tenant_id
  object_id    = var.pip_nonprod_group_object_id

  secret_permissions = ["Get", "List", "Set", "Delete", "Recover"]
}

# The GitHub Actions OIDC app registration, so job.e2e-test.yml can fetch the
# test credentials with `az keyvault secret show`.
resource "azurerm_key_vault_access_policy" "bootstrap_kv_e2e_oidc_sp" {
  key_vault_id = data.azurerm_key_vault.bootstrap_key_vault.id
  tenant_id    = var.tenant_id
  object_id    = var.e2e_oidc_object_id

  secret_permissions = ["Get", "List"]
}
