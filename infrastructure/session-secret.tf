# Signs the web app's session cookies (SESSION_SECRET). Generated here, as PIP
# does for its session-key, so no environment needs a hand-seeded value. No
# keepers: a new value signs every user out, so it only changes if this
# resource is replaced.
resource "random_password" "session_secret" {
  length  = 64
  special = false
}

# aat, demo and perftest had a hand-seeded session-secret before this existed.
# Delete it (soft-delete) before the first apply; the provider then recovers the
# soft-deleted secret and writes this value over it.
resource "azurerm_key_vault_secret" "session_secret" {
  name            = "session-secret"
  value           = random_password.session_secret.result
  key_vault_id    = module.key_vault.key_vault_id
  expiration_date = local.secret_expiry
  tags            = merge(local.common_tags, { source = "Terraform" })
}
