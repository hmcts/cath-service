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
