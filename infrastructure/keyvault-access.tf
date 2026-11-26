# APIM's managed identity reads the backend client secret from our vault.
resource "azurerm_key_vault_access_policy" "apim" {
  count        = local.deploy_apim ? 1 : 0
  key_vault_id = module.key_vault.key_vault_id
  tenant_id    = var.tenant_id
  object_id    = data.azurerm_api_management.cft[0].identity[0].principal_id

  secret_permissions = ["Get"]
}

# CFT Jenkins (jenkins-cftptl-intsvc-mi) reads secrets from our vault, as in
# hmcts/pip-shared-infrastructures tf-kv-access.tf.
resource "azurerm_key_vault_access_policy" "cft_jenkins" {
  key_vault_id = module.key_vault.key_vault_id
  tenant_id    = var.tenant_id
  object_id    = "ca6d5085-485a-417d-8480-c3cefa29df31"

  secret_permissions = ["Get"]
}
