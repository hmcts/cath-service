# #1482 Tasks

> Revised 2026-11-24 for the SDS API approach. The earlier direct Postgres and Blob tasks have been dropped.

## Implementation Tasks

### Discovery (blocks everything else)
- [ ] T1: Ask SDS about clarifications 1 to 5: endpoints and contracts, the audience and role name they will validate, public or private endpoints, rate limits and pagination, env-name mapping. Record the answers in `write-up.md`
- [ ] T2: Ask about clarifications 6 to 8: who the Entra admin is for app role creation and assignment, client secret expiry and rotation, whether security accepts reusing the CaTH AI API app registration
- [ ] T3: Ask Platform Ops about clarifications 9 and 10: Job-creation rights in `cath` on cft-aat, and network routing only if the SDS endpoints are private
- [ ] T4: Ask security and IG about clarification 11 (DPIA)

### Non-prod PoC (AAT to SDS staging)
- [ ] T5: Add the new app role (name agreed in T1) to the CaTH AI API app registration and have the Entra admin assign it in aat. Request a token with the `cath-aat` secrets and confirm `aud` and `roles` (scenario 1)
- [ ] T6: From a throwaway pod in `cath` on cft-aat, `nslookup` and `curl` `PIP_API_URL` without a token and expect `401` (scenario 2)
- [x] T7: On the spike branch, rewrite `apps/crons/src/pip-connectivity-check.ts` and its test to get a token and call one SDS endpoint (scenario 8). Remove `pg`, `@types/pg`, `@azure/storage-blob` and `@azure/identity` from `apps/crons/package.json`. Add `pipApi.url` to `config/custom-environment-variables.json`, and add the `app-tenant-id` and `cath-service-api-client-*` mounts to `apps/crons/helm/values.yaml`. Do not merge to master
- [ ] T8: Run the `pip-connectivity-check` Job in AAT. Capture the logs and exit code (scenario 3)
- [ ] T9: Run the negative checks: no token, token without the role, wrong secret, missing URL (scenarios 4 to 7)
- [ ] T10: With SDS, check their metrics during T8 (scenario 9)

### Write-up and agreement
- [ ] T11: Update `write-up.md` with the SDS answers, the final auth design (audience and role), the network path, and PoC evidence from T5 to T10
- [ ] T12: Document the PROD path: `cath-prod` secrets, PROD app role assignment, network path, DPIA, #1095 dependency
- [ ] T13: Hold a review with Platform Ops, security and SDS. Record the approvals in `write-up.md`
- [ ] T14: Delete the PoC Job and probe pod. Close the spike PR without merging the crons script. Remove the aat role assignment if it won't carry forward

### Part 2: Migration area and PIP connection check (merged to master)
- [x] T20: Export `requestAccessToken`, `sendOutboundRequest`, `discardBody` and their types from `@hmcts/third-party-user`
- [x] T21: Create `libs/pip-api-client` (package.json, tsconfig, root tsconfig path) with `allowed-hosts.ts`, `url-validation.ts`, `connection-check.ts` and unit tests
- [x] T22: Add the "Migration" tile to `system-admin-dashboard` en/cy and update its tests
- [x] T23: Add the `/migration` hub page (controller, template, en/cy, unit and template tests)
- [x] T24: Add the `/migration-connection-check` page (controller with validation, result mapping and audit metadata, template, en/cy, unit and template tests)
- [x] T25: Helm: `PIP_API_ALLOWED_HOSTS` and the four secret mounts in `apps/web/helm/values.yaml`; preview value in `values.preview.template.yaml`; add `@hmcts/pip-api-client` to `apps/web/package.json`
- [x] T26: E2E: no new spec (ticket owner's decision). Only the Migration tile is added to `system-admin-dashboard.spec.ts`, whose tile count would otherwise fail
- [x] T27: Remove the crons PoC (`pip-connectivity-check*.ts`, the `pipApi.url` mapping, the crons secret mounts)
- [ ] T28: In aat, test `https://pip-data-management.staging.platform.hmcts.net/locations/111` from the page and record the result in `write-up.md`

### Follow-up tickets to raise
- [ ] T15: Entra: create the app role on the CaTH AI API app registration and assign it in aat, demo, perftest and prod (draft in follow-up-tickets.md)
- [ ] T16: Application: `libs/pip-api-client` with a token client (in-memory cache, refresh before expiry), a typed client for the SDS endpoints, paging, a concurrency cap, `429`/`5xx` backoff, and Helm env and secret mounts on the consuming workload only (draft in follow-up-tickets.md)
- [ ] T17: Flux (`cnp-flux-config`): `PIP_API_URL` per env, plus an off-peak CronJob HelmRelease for bulk migration reads if needed (draft in follow-up-tickets.md)
- [ ] T18: Network (only if the SDS endpoints are private): route or private endpoint and DNS from CFT AKS to SDS (draft in follow-up-tickets.md)
- [ ] T19: Governance: DPIA update and PROD access approval for reading PIP personal data through the API (draft in follow-up-tickets.md)
