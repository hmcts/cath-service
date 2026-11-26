# #1482 Follow-up ticket drafts (T15 to T19)

> Revised 2026-11-24 for the SDS API approach. The earlier drafts (blob private endpoint, hub route to PIP Postgres, DNS zone grant, PIP-side SQL grants, `libs/pip-migration`) have been dropped.

Ready-to-paste GitHub issue drafts. **None of these have been raised.** Fill in the `TBC:` items from `write-up.md` section 7 before raising.

---

## T15: Entra: app role for reading PIP data through the SDS APIs

**Title:** Entra: add `<role name>` app role to the CaTH AI API app registration and assign it per environment

### Context
Spike #1482: CaTH calls the SDS API endpoints with a client-credentials token from the existing CaTH AI API app registration. SDS authorises calls with a new app role in the token's `roles` claim.

### Scope
- Add the app role `TBC: name agreed with SDS` (`allowedMemberTypes: ["Application"]`) to the CaTH AI API app registration.
- Assign it to the CaTH AI API service principal through Graph (`appRoleAssignments`), once per env: aat, demo, perftest, prod. This is done by an Entra admin, not Terraform, the same as #624.
- Record the role ID and the assignment per env in `write-up.md`.
- `TBC: if SDS validates its own audience, the role goes on SDS's app registration instead, and the CaTH SP is assigned to it.`

### Acceptance criteria
- [ ] A client-credentials token from each env's `cath-<env>` secrets has `roles` containing the new role.
- [ ] `api.publisher.user` and the existing APIM flow are unchanged.
- [ ] Security has signed off on reusing the app registration for PROD.

---

## T16: Application: `libs/pip-api-client`

**Title:** Add a `@hmcts/pip-api-client` lib for calling the SDS Data and Account Management APIs

### Context
Spike #1482 proved the token and call path with a throwaway crons script. This ticket builds the real client.

### Scope
- New lib `libs/pip-api-client`:
  - a token client: `client_credentials` with `AZURE_TENANT_ID`, `CATH_SERVICE_API_CLIENT_ID`, `CATH_SERVICE_API_CLIENT_SECRET` and `CATH_SERVICE_API_CLIENT_SCOPE`, an in-memory cache, and refresh 60 seconds before expiry;
  - typed functions for the SDS endpoints (`TBC: endpoint list and contracts`);
  - paging, a concurrency cap, `429` (`Retry-After`) and `5xx` backoff, and request timeouts;
  - logging of status, counts and timings only. Never tokens or bodies.
- `PIP_API_URL` through `config/custom-environment-variables.json` on the consuming app.
- Helm `keyVaults` mounts (`app-tenant-id`, `cath-service-api-client-id`, `-secret`, `-scope`) on the consuming workload only.
- Unit tests with mocked `fetch`.

### Acceptance criteria
- [ ] The dashboard or migration workload reads data through the lib in aat.
- [ ] No Postgres or Blob connection to PIP anywhere in the code.
- [ ] Over 80% coverage on the lib.

---

## T17: Flux: `PIP_API_URL` per environment and an off-peak CronJob

**Title:** cnp-flux-config: set `PIP_API_URL` per env for CaTH, and add an off-peak migration CronJob if needed

### Scope
- Set `PIP_API_URL` for aat, demo, perftest and prod (`TBC: SDS base URLs`).
- If bulk migration reads are needed, add a CronJob HelmRelease using the crons chart, scheduled in the window agreed with SDS (`TBC: window`).

### Acceptance criteria
- [ ] Each env's pod has the correct `PIP_API_URL`.
- [ ] Any CronJob runs only in the agreed window.

---

## T18: Network path to the SDS endpoints (only if they are private)

**Title:** Platform Ops: network path from CFT AKS to the SDS API endpoints

> Raise this only if SDS confirms the endpoints are private or IP-restricted (clarification 3). If they are public through Front Door or APIM, close this draft.

### Scope
- A route or private endpoint, and DNS resolution, from CFT AKS (`cath` namespace) to the SDS API endpoints, non-prod first and then PROD (with CR/CAB).

### Acceptance criteria
- [ ] `curl` from a `cath` pod reaches `PIP_API_URL` and gets `401` without a token, in each env.

---

## T19: Governance: DPIA update and PROD access approval

**Title:** DPIA update for CaTH reading PIP account-management personal data through the SDS APIs

### Scope
- Update the DPIA for CaTH reading PIP Data Management and Account Management data (emails, names) through the SDS APIs.
- Record the PROD access approval.

### Acceptance criteria
- [ ] Security and IG have signed off before any PROD read.
