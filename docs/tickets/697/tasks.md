# #697: Migrate from Azure Cache for Redis to Azure Managed Redis - Tasks

This follows the HMCTS cutover pattern: a new secret, then a mapping switch, so rollback is a revert. No environment has real users yet, so each stage is one PR applied everywhere. The exception is the stage 4 aat soak. Local development (docker `redis:8-alpine` on `redis://localhost:6380`, no auth, `REDIS_MI` unset so `redis.managedIdentity` defaults to `false`) and nightly CI do not change at any stage.

## Implementation Tasks

### Before starting
- [x] Prerequisite (Clarification 1, granted 2026-11-17 15:35 UTC): raise a DTSPO request to grant `cath-service-prod` (`2e5a6bb5-9090-4710-ab3d-ff5cf383a2b6`) Private DNS Zone Contributor on `privatelink.redis.azure.net` (`core-infra-intsvc-rg`, `DTS-CFTPTL-INTSVC`). Once it's granted, confirm it with `az role assignment list --include-inherited --assignee 2e5a6bb5-9090-4710-ab3d-ff5cf383a2b6 --scope /subscriptions/1baf5470-1c3e-40d3-a6f7-74bfbce4b348/resourceGroups/core-infra-intsvc-rg/providers/Microsoft.Network/privateDnsZones/privatelink.redis.azure.net`. Don't merge stage 1 until it shows up. Non-prod (`cath-service`) already has it at resource-group level.
- [x] Clarification 3: prod `usedmemory` measured on 2026-11-17 (peak about 97 MB on P1). Prod is set to `Balanced_B3` with HA and non-prod to `Balanced_B0` without HA, matching the current set-up (decided 2026-11-17). Details are in plan.md.

### Stage 1: deploy Managed Redis everywhere (PR 1, Terraform)
- [x] `infrastructure/env-config.tf`: add `managed_redis_sku_name` and `managed_redis_high_availability` to `default_sizing` (`Balanced_B0`/`false`) and `sizing_overrides.prod` (`Balanced_B3`/`true`). Add the `managed_redis_private_dns_zone_id` local.
- [x] `infrastructure/redis.tf`: add `data "azurerm_subnet" "managed_redis_private_endpoint"`, with no count and `provider = azurerm.core_infra`.
- [x] `infrastructure/redis.tf`: add `module "managed_redis"` (`?ref=main`, no count) with:
  - keys on, `clustering_policy = "EnterpriseCluster"`, `client_protocol = "Encrypted"`
  - `redis_access_policy_assignments = { "Data Owner" = { cath = { object_id = module.key_vault.managed_identity_objectid[0] } } }`
  - SKU and HA from `local.sizing`
  - private endpoint, public access disabled
  - the shared resource group, and the name `${var.product}-managed-redis-${var.env}`
- [x] `infrastructure/redis.tf`: add the secret `managed-redis-url` (`rediss://:${urlencode(primary_access_key)}@${hostname}:${port}`) with `expiration_date = local.secret_expiry`, `tags = merge(local.common_tags, { source = "Redis" })` and `depends_on = [module.managed_redis]`. Leave `module "redis"` and the four `redis-*` secrets untouched.
- [x] Run `terraform fmt` and `terraform validate`.
- [ ] Scenario 1: check the plans for every environment show creates only: the instance, the private endpoint, the access-policy assignment and `managed-redis-url`. There must be no change to `module.redis` or any `redis-*` secret. After apply, every leg is green. If prod fails on its own, fix it with a follow-up PR, or with a PlatOps grant and a re-run.
- [ ] Scenario 2: in aat, demo and perftest, prove Entra ID and key auth without the app. Use `az redisenterprise test-connection --auth entra` and `--auth access-key` from inside the network, or a debug pod as `cath-<env>-mi` (`PING`, `SET`/`GET`, a single-key `EVAL` over TLS on 10000). There is no prod check because there is no prod access.

### Stage 2: switch to Managed Redis with keys (PR 2, cath-service)
- [ ] In `apps/web/helm/values.yaml:62-63`, `apps/api/helm/values.yaml:19-20` and `helm/cath-service/values.preview.template.yaml:82-83`, change `redis-url` to `managed-redis-url`, keeping `alias: REDIS_URL`. Check that `apps/web/helm/values.yaml.test.ts` passes.
- [ ] Scenario 3 on the PR preview, which mounts `managed-redis-url` from `cath-aat`: run E2E, then check App Insights shows `*.redis.azure.net:10000` and no `MOVED`/`CROSSSLOT`.
- [ ] After merge, the release restarts aat. Repeat scenario 3 on aat, including 0 `SocketClosedUnexpectedlyError` over 25 idle minutes.
- [ ] Scenario 4: rollback rehearsal on aat. Deploy a revert of the mapping with a manual Flux deploy, confirm the app works on the old instance, then restore it.
- [ ] After the next promoted prod release (or a manual Flux deploy), confirm the PROD smoke test and app health are green.

### Stage 3: remove the old Azure Cache for Redis (PR 3, Terraform)
- [ ] Confirm `/health` `X-Git-Sha` shows the stage 2 release in aat, demo, perftest and prod. Ask open PRs to rebase, because their previews mount from `cath-aat`.
- [ ] `infrastructure/redis.tf`: remove `module "redis"`, `data.azurerm_subnet.redis_private_endpoint` and the `redis_url`, `redis_host`, `redis_port` and `redis_access_key` secrets.
- [ ] `infrastructure/env-config.tf`: remove the `redis_sku_name`/`redis_family`/`redis_capacity` keys, and `redis_subnet_override` if nothing else uses it. Update the comments.
- [ ] Scenario 5: check the plans destroy only the legacy cache, its private endpoint, resource group `cath-cache-<env>` and those four secrets, with nothing changed on `module.managed_redis`. After apply, E2E on aat passes.

### Stage 4: switch to managed identity (our own design)

**Terraform (PR 4)**
- [ ] `infrastructure/redis.tf`: add the secret `managed-redis-entra-url` (`rediss://${hostname}:${port}`) with the same expiry, tags and `depends_on`. The plan shows one create per environment.

**PR A: client change, released everywhere (PR 5, cath-service)**
- [ ] `libs/redis/package.json`: add `"@redis/entraid": "5.12.1"` and `"@azure/identity": "4.10.0"` to `dependencies`, then run `yarn install`.
- [ ] `apps/{web,api}/config/custom-environment-variables.json`: under `redis`, add `"managedIdentity": { "__name": "REDIS_MI", "__format": "boolean" }`. In `apps/{web,api}/config/default.json`, add `"managedIdentity": false` under `redis`.
- [ ] `libs/redis/src/redis-client.ts`: add `createRedisClient(url, managedIdentity)`.
  - It always sets `pingInterval` and the error listener.
  - When `managedIdentity` is `true`, it requires `rediss:` (failing fast with an error naming `REDIS_MI` otherwise), ignores the URL's username and password, and attaches a process-wide `@redis/entraid` `createForDefaultAzureCredential` provider. The provider is created lazily, with `DefaultAzureCredential({ managedIdentityClientId: process.env.MANAGED_IDENTITY_CLIENT_ID })`, `REDIS_SCOPE_DEFAULT`, `expirationRefreshRatio: 0.8`, and an `onReAuthenticationError` that logs without the token.
  - `getRedisClient()` uses it, passing `config.get<boolean>("redis.managedIdentity")`. When `false`, behaviour is exactly as today. Reword the keep-alive comment and export the factory from `libs/redis/src/index.ts`.
- [ ] `apps/web/src/app.ts`: replace the local `getRedisClient`, the `redis` import and `REDIS_PING_INTERVAL_MS` with `createRedisClient(process.env.REDIS_URL ?? config.get("redis.url"), config.get<boolean>("redis.managedIdentity"))` plus `connect()`. Import `@hmcts/redis` dynamically after `getPropertiesVolumeSecrets()`, as for `@hmcts/auth`, because it loads `config` at module top. Pass the flag from `app.ts`'s own `config`. Add `"@hmcts/redis": "workspace:*"` to `apps/web/package.json`.
- [ ] Scenario 6: AAA unit tests.
  - In `libs/redis/src/index.test.ts`, cover:
    - `false` and unset (default `false`) pass the URL through with no provider
    - `true` strips credentials and attaches a provider with the scope and client id, created only once
    - `true` with `redis://` fails fast with a clear error
    - `getRedisClient()` passes `redis.managedIdentity` through
    - `REDIS_MI` values `"true"`, `"false"` and unset give `config.get("redis.managedIdentity")` values of `true`, `false` and `false`

    Keep the `pingInterval: 300_000` assertions.
  - In `apps/web/src/app.test.ts`, mock `createRedisClient` and assert it is called with `REDIS_URL` and the flag, and connected.
- [ ] `docs/ARCHITECTURE.md`: update the Redis section to cover Managed Redis, EnterpriseCluster, DB 0, `REDIS_MI=true` through `cath-<env>-mi`, TLS on 10000, and local `redis://localhost:6380` with no auth.
- [ ] Run `yarn test` and `yarn lint:fix`, and confirm `yarn dev` works against docker Redis with no Azure login. After merge, confirm nightly CI and aat E2E are green and that every environment runs PR A (`/health` `X-Git-Sha`).

**PR B: aat only (PR 6, cnp-flux-config)**
- [ ] Add `REDIS_MI: "true"` (quoted) under `spec.values.nodejs.environment` in `apps/cath/cath-web/aat.yaml` and `apps/cath/cath-api/aat.yaml`. After Flux redeploys aat, repeat scenario 3 on aat and check there is no `NOAUTH`/`WRONGPASS`.
- [ ] Scenario 7: soak aat for 1-2 days past the token's `exp` claim with no sustained Redis errors. Any `onReAuthenticationError` must recover. Rehearse the rollback by reverting the override: the same image goes back to key auth. Then reapply it.

**PR C: every environment (PR 7, cath-service; then PR 8, cnp-flux-config)**
- [ ] In the three values files, map `managed-redis-entra-url` to `REDIS_URL`. Add `REDIS_MI: "true"` to `nodejs.environment` in web and api, and to `cath-web`/`cath-api` in the preview template. Check `values.yaml.test.ts` passes.
- [ ] Scenario 3 on the PR preview and on aat after the release. After the prod release, the PROD smoke test and app health are green.
- [ ] PR 8: remove the aat `REDIS_MI` override from `cnp-flux-config`.

### Stage 5: turn off keys (PR 9, Terraform)
- [ ] Confirm `/health` `X-Git-Sha` shows PR C in every environment, and ask open PRs to rebase.
- [ ] `infrastructure/redis.tf`: set `access_keys_authentication_enabled = false` and remove `azurerm_key_vault_secret.managed_redis_url`.
- [ ] Scenario 8, a mandatory plan check in every environment including prod: `module.managed_redis.azurerm_managed_redis.redis` must show `~ update in-place`, changing only `access_keys_authentication_enabled` from true to false, plus the `managed-redis-url` destroy. Never apply on `-/+` or `must be replaced`.
- [ ] After apply, App Insights shows a short reconnect burst that recovers, E2E on aat and the PROD smoke test pass, and `az redisenterprise database show` reports keys disabled in non-prod.
