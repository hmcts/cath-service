# Crime Portal vault. Its managed identity (cath-cp-<env>-mi) is the identity
# Crime Portal's AKS workloads federate into to call CaTH through APIM - see
# tf-crime-connection-mi.tf.
module "kv_cp" {
  source = "git::https://github.com/hmcts/cnp-module-key-vault?ref=DTSPO-31965/remove-jenkins-ptl-access"

  name                = "${var.product}-cp-${var.env}"
  product             = "${var.product}-cp"
  env                 = var.env
  object_id           = var.ci_service_principal_object_id
  tenant_id           = var.tenant_id
  resource_group_name = azurerm_resource_group.shared.name

  # Write access - see the note in infrastructure/keyvault.tf.
  product_group_name = "DTS PIP Non-Prod"

  common_tags             = local.common_tags
  create_managed_identity = true
}

# APIM's api-policy.xml requires the api.publisher.user role, so Crime Portal's
# token needs it too. Gated like the APIM data sources it reads.
data "azuread_service_principal" "cath_api" {
  count     = local.deploy_apim ? 1 : 0
  client_id = data.azurerm_key_vault_secret.apim_client_id[0].value
}

resource "azuread_app_role_assignment" "cp_mi_publisher" {
  count               = local.deploy_apim ? 1 : 0
  app_role_id         = data.azuread_service_principal.cath_api[0].app_role_ids["api.publisher.user"]
  principal_object_id = module.kv_cp.managed_identity_objectid[0]
  resource_object_id  = data.azuread_service_principal.cath_api[0].object_id
}
