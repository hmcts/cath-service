# #625: Tasks

## Implementation Tasks

- [x] `infrastructure/state.tf`: add `time = { source = "hashicorp/time", version = "~> 0.13" }` to `required_providers`. Check the constraint against the version that `terraform init` installs.
- [x] `infrastructure/main.tf`: add `resource "time_rotating" "secret_expiry" { rotation_days = 180 }` and `locals { secret_expiry = timeadd(time_rotating.secret_expiry.rfc3339, "8760h") }`, with a short comment explaining why it does not use `timestamp()` and how renewal works.
- [x] `infrastructure/redis.tf`: on `redis_host`, `redis_port`, `redis_access_key` and `redis_url`, add `expiration_date = local.secret_expiry`, `tags = merge(local.common_tags, { source = "Redis" })` and `depends_on = [module.redis]`. Do not change `name`, `value` or `key_vault_id`.
- [x] T1: run `terraform fmt -check -recursive` and `terraform init -backend=false && terraform validate` in `infrastructure/`.
- [ ] Open the PR. In the body, list which ACs were already met (1, 2, 3, 4, 10) and explain why `timestamp()` was not used.
- [ ] T2: review the PR plan comment for aat, demo, perftest and prod. Each must show `1 to add` (`time_rotating.secret_expiry` only), `4 to change` (`azurerm_key_vault_secret.redis_*`: `expiration_date` and `tags`) and `0 to destroy`, with no `-/+` and no other resources. Note in the PR that ithc is parked (#1067) and was not planned.
- [ ] After merge, confirm the master Infrastructure stage applied successfully for all four environments.
- [ ] T3: on the next infra PR (or a re-run of the preview plan), confirm these resources show `No changes`.
- [ ] T4: for each of `cath-aat`, `cath-demo`, `cath-perftest` and `cath-prod`, run `az keyvault secret list --vault-name cath-<env> --query "[?starts_with(name,'redis-')].{n:name,exp:attributes.expires,t:tags}"` (read-only). Confirm all four secrets have `expires` about 365 days ahead and `source: Redis`.
- [ ] T5: confirm the AAT smoke tests passed after the apply, and that signing in on AAT works and the session survives a page refresh.
- [ ] Post a comment on #625 with the plan and metadata results, and tick ACs 5 to 9. Link the expiry-check follow-up, #1353.
