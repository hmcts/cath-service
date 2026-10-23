# Technical Plan: #576 Publication upload smoke test for the publication endpoint

## 1. Technical Approach

Add one Playwright API-only spec (uses the `request` fixture, no browser) that runs against the deployed API after the existing curl health checks in `job.smoke-test.yml`. It runs with its own Playwright config so it skips the E2E global setup/teardown and the local `webServer`.

The flow:
1. `beforeEach`: create a uniquely named location via `createTestLocation` (test-support API)
2. Test: get a `client_credentials` token via `getApiAuthToken()`, POST a minimal CIVIL_AND_FAMILY_DAILY_CAUSE_LIST payload, assert 201 and `artefactId`
3. `afterEach`: delete the artefact (if one was created) and then the location, even when the test fails

### Ticket assumptions checked against the code

The ticket is stale in several places that change the design. Each one below was checked against the code.

| Area | Ticket says | Code actually does |
|---|---|---|
| Request contract | JSON envelope with `court_id`, `provenance`, ..., `hearing_list` | All metadata goes in `x-*` **headers** (`libs/api/src/blob-ingestion/publication-headers.ts`). The body is the bare payload, with no `hearing_list` wrapper (`validation.ts` `validateBlobRequest`). Required headers: `x-provenance`, `x-court-id` (or `x-location-id`), `x-content-date`, `x-language`, `x-type`, plus `x-list-type` when `x-type=LIST`. Optional: `x-sensitivity` (default PUBLIC), `x-display-from`, `x-display-to` (ISO datetimes, must contain `T`), `x-source-artefact-id`. |
| Response | 201 with `artefact_id` | 201 with the camelCase `ArtefactResponse` (`artefactId`, `locationId`, `listType`, ...). `tests/api/blob-ingestion.spec.ts` checks that `artefact_id` is **absent**. |
| Endpoint file | `libs/api/src/routes/v1/publication.ts` | The route is `apps/api/src/routes/v1/publication.ts`. `apps/api/src/routes/publication.ts` re-exports it at `POST /publication`, and the code comments say `/v1` is kept only until the gateway path is settled. `libs/api` is the package `@hmcts/blob-ingestion`. |
| Auth | Valid OAuth token | `authenticateApi()` (`libs/api/src/middleware/oauth-middleware.ts`) needs role `api.publisher.user` and returns 401/403 otherwise. The existing E2E API client already has this role (non-nightly `summary-of-publications.spec.ts` gets 201 from it). |
| Env var names | `CLIENT_ID`, `CLIENT_SECRET`, `TENANT_ID`, `CATH_API_AZ_API` | `getApiAuthToken()` (`e2e-tests/utils/api-auth-helpers.ts`) reads `AZURE_TENANT_ID`, `CATH_SERVICE_API_CLIENT_ID`, `CATH_SERVICE_API_CLIENT_SECRET`, with scope `${clientId}/.default`. `CATH_API_AZ_API` is not used anywhere in the code. The API URL comes from `CATH_SERVICE_API_URL` (`test-support-api.ts`; falls back to `API_URL`, then localhost). |
| Secrets | `secrets.AZURE_CLIENT_ID/SECRET/TENANT_ID` | `secrets.AZURE_CLIENT_ID` / `AZURE_TENANT_ID` belong to the **CI OIDC identity** used by `azure/login`. They are not the API client. `job.e2e-test.yml` logs in with OIDC (`id-token: write`) and reads `app-tenant`, `cath-service-api-client-id` and `cath-service-api-client-secret` from Key Vault `cath-bootstrap-aat`. No `AZURE_CLIENT_SECRET` secret is used. |
| "Only `job.smoke-test.yml` changes" | No workflow wiring changes needed | **Wrong.** `stage.smoke-test.yml` calls `job.smoke-test.yml` without `secrets: inherit`. `workflow.preview.yml` and `workflow.main.yml` call `stage.smoke-test.yml` without `secrets:` either. Secrets therefore never reach the smoke job today, and three files need `secrets: inherit` added. |
| Smoke stage callers | Preview + main | `stage.smoke-test.yml` is **also** called by `workflow.demo.yml`, `workflow.ithc.yml` and `workflow.perftest.yml`. Demo deploys with `ENABLE_TEST_SUPPORT=false` (`job.helm-deploy.yml`), so `createTestLocation` would 404 there. For ithc and perftest it is unclear whether the aat Key Vault API client is valid. |
| Node / install | `node-version: '22'`, `yarn install --frozen-lockfile` in `e2e-tests` | `.nvmrc` = `24.17.0`. `packageManager` = `yarn@4.17.0` (Berry, `nodeLinker: node-modules`). `--frozen-lockfile` is the Yarn 1 flag; the e2e job uses `corepack enable` + `yarn install --immutable` from the **repo root**, then `yarn workspace e2e-tests ...`. The `hmcts-cft` scope registry is on Azure Artifacts. |
| Checkout | Add a checkout step | `job.smoke-test.yml` does **not** check out today (curl only). A checkout step is needed. The e2e job uses `actions/checkout@v7`, `actions/setup-node@v6` and `azure/login@v3`; use the same versions. |
| Playwright install | `playwright install chromium` | Not needed. The `request` fixture uses no browser. Skipping it saves time. |
| Runner | n/a | `runs-on.group: inputs.runner-group`: `azure-nonprod` for preview, `azure-prod` for main/aat. The e2e job already reaches Key Vault and the deployed API from both. |
| URLs | "api url decoded from inputs.urls" | `inputs.urls` is base64 JSON such as `{"web":"https://...","api":"https://...","postgres":...}`. The job already decodes it into `steps.urls.outputs.urls`, and `jq -r '.api'` extracts the API URL. |
| Test-support API availability | Assumed | Mounted when `NODE_ENV !== "production"` or `ENABLE_TEST_SUPPORT === "true"` (`apps/api/src/app.ts`). Helm deploy sets it `true` for preview, aat, ithc and perftest, and `false` for demo. The test-support routes have no auth. |
| Fixture validation | `validateCivilFamilyCauseList()` | Confirmed: exported from `libs/list-types/civil-and-family-daily-cause-list/src/validation/json-validator.ts` (re-exported from `index.ts`). The schema root is `object` with `document`, `venue` and `courtLists` required. The full nested required-field tree is mirrored by `VALID_DATA` in `json-validator.test.ts`, which can be reused as-is. No JSON fixture exists in `e2e-tests/fixtures/` today. The API runs this same validator at request time (`validateListTypeJson` → dynamic import → `validate*`), so a 201 proves the fixture is valid. |
| List type name | `CIVIL_AND_FAMILY_DAILY_CAUSE_LIST` | Confirmed in `libs/list-types/common/src/list-type-data.ts`. It is seeded on every environment by the postgres deploy pod. |
| Playwright config | n/a | `testDir: ./tests`, so `tests/smoke/` **would** be picked up by the normal E2E run. `globalSetup` waits for `/test-support/health`, then seeds reference data, list types and locations and verifies them. That is heavy, and wrong for a smoke check. `webServer` starts a local dev server unless `CATH_SERVICE_WEB_URL` is set. `retries: 2` in CI. `@nightly` is excluded via `--grep-invert` in `test:e2e` (via `run-with-credentials.js`, which requires **every** E2E secret, so the smoke job must not use it). |

### Key design decisions

- **Endpoint:** POST to `/v1/publication`, as the ticket asks. It is the same handler as `/publication`. See Clarification 1.
- **Separate config:** add `e2e-tests/playwright.smoke.config.ts` with `testDir: ./tests/smoke`, no `globalSetup`, `globalTeardown` or `webServer`, `retries: 0`, `workers: 1`, and `line`/`github`/`junit` reporters. Add `testIgnore: ["smoke/**"]` to the main `playwright.config.ts`. `test:e2e` (PR E2E) and `test:e2e:all` (nightly) both call `playwright test` without `--config`, so this keeps the spec out of both. Add a `test:smoke` script to `e2e-tests/package.json`.
- **Opt-in input:** add a `run-publication-smoke` boolean input (default `false`) to `stage.smoke-test.yml` and `job.smoke-test.yml`. Set it to `true` only from `workflow.preview.yml` and `workflow.main.yml`. Demo, ithc and perftest keep curl-only smoke tests.
- **Credentials:** use the same OIDC + Key Vault pattern as `job.e2e-test.yml`, fetching only the 3 secrets needed (`app-tenant`, `cath-service-api-client-id`, `cath-service-api-client-secret`). Add `permissions: { contents: read, id-token: write }` to the smoke job.
- **Install:** `corepack enable` + `yarn workspaces focus e2e-tests` (built into Yarn 4) to avoid installing the whole monorepo. If the registry auth or lockfile check makes this awkward, fall back to `yarn install --immutable` like the e2e job.
- **`x-court-id`:** use the `locationId` returned by `createTestLocation`. It is a random id between 90000 and 99999 (see the Edge Cases section). MANUAL_UPLOAD never gets the `NoMatch` prefix, so the full `processPublication` path runs (PDF, Excel, notifications, third-party push).

## 2. Implementation Details

TEMPLATE SOURCE: n/a

No pages, templates or Welsh content. This is CI and test code only. No DB schema changes. No changes to `libs/` or `apps/`.

### File structure

```
e2e-tests/
├── playwright.config.ts                                   # MODIFY: testIgnore ["smoke/**"]
├── playwright.smoke.config.ts                             # NEW
├── package.json                                           # MODIFY: "test:smoke" script
├── fixtures/
│   └── civil-and-family-daily-cause-list-smoke.json      # NEW (copy of VALID_DATA from json-validator.test.ts)
└── tests/
    └── smoke/
        └── publication-upload.spec.ts                     # NEW

.github/workflows/
├── job.smoke-test.yml        # MODIFY: input, permissions, checkout/node/install, KV creds, run spec
├── stage.smoke-test.yml      # MODIFY: forward input + secrets: inherit
├── workflow.preview.yml      # MODIFY: smoke-test-stage: run-publication-smoke: true, secrets: inherit
└── workflow.main.yml         # MODIFY: smoke-test-stage: run-publication-smoke: true, secrets: inherit
```

### API call

```
POST {CATH_SERVICE_API_URL}/v1/publication
Authorization: Bearer {token}
Content-Type: application/json
x-provenance: MANUAL_UPLOAD
x-court-id: {locationId}
x-content-date: {today YYYY-MM-DD}
x-list-type: CIVIL_AND_FAMILY_DAILY_CAUSE_LIST
x-language: ENGLISH
x-type: LIST
x-sensitivity: PUBLIC
x-display-from: {now ISO}
x-display-to: {now + 1 day ISO}

<body: fixture JSON>
```

Assertions:
- `response.status()` is 201. On failure, include `await response.text()` in the assertion message so the 400 schema message or the 401/403 shows up in CI logs.
- `body.artefactId` is truthy.
- `body.locationId` equals `String(locationId)`.
- `body.listType` equals `"CIVIL_AND_FAMILY_DAILY_CAUSE_LIST"`.

### Spec outline

- Constants at the top: `API_BASE_URL = process.env.CATH_SERVICE_API_URL`, `ENDPOINT`, `LIST_TYPE`.
- The fixture is loaded with `fs.readFileSync` + `JSON.parse`, using a path relative to `import.meta.url`.
- Fail fast in `beforeAll` if `CATH_SERVICE_API_URL` is unset. Without this, `test-support-api.ts` silently defaults to localhost.
- `test.describe.configure({ mode: "serial" })` (single test, but makes intent clear).
- Module-scoped `let locationId: number | undefined; let artefactId: string | undefined;`, reset in `beforeEach`.

### Workflow step outline (job.smoke-test.yml, after "Health check - API", all `if: inputs.run-publication-smoke`)

1. `actions/checkout@v7`
2. `azure/login@v3` (OIDC, `secrets.AZURE_CLIENT_ID`, `secrets.AZURE_TENANT_ID`, `allow-no-subscriptions: true`)
3. Load the 3 Key Vault secrets into `$GITHUB_ENV`, using `::add-mask::` for the client secret
4. `actions/setup-node@v6` with `node-version-file: '.nvmrc'`
5. `corepack enable`, then install (see the Install decision above)
6. `CATH_SERVICE_API_URL=$(jq -r '.api' <<< urls)`, and fail if it is empty
7. `yarn workspace e2e-tests run test:smoke`
8. Upload `e2e-tests/test-results/` on failure (optional, 7-day retention)

Move the "Smoke test summary" step to after the new step. Also note that the existing health-check steps use `exit 0` on success, which is fine because each one is a separate step.

## 3. Error Handling & Edge Cases

- **Teardown on failure:** cleanup lives in `afterEach`, which Playwright runs even when assertions fail. Each cleanup call is wrapped in its own try/catch and failures are logged. A cleanup error must not hide the real test failure, but it should still be visible in logs.
- **Artefact id absent:** only call `deleteTestArtefact` if `artefactId` was captured. Fallback: if the POST returned non-201 or had no body, call `deleteTestArtefacts({ locationId: String(locationId) })` to remove anything created under the unique location before deleting the location.
- **Location creation fails:** `beforeEach` throws and the test fails (test-support is unavailable or the DB is down). That is a genuine smoke failure. Skip location delete when `locationId` is undefined.
- **Token failure:** `getApiAuthToken()` throws with a clear message when env vars are missing or Entra ID rejects the request. Let it fail the test. Do not fall back to an unauthenticated request. A 401/403 from the API should show the response body.
- **Unique naming:** `name: SMOKE_TEST_LOCATION_${Date.now()}_${random}` and `welshName: SMOKE_TEST_LOCATION_CY_${...}`. Both columns are `@unique`. Do not use the `E2E_` prefix, which belongs to E2E global teardown.
- **Location id collision:** the test-support POST generates `90000 + random(9000) + Date.now() % 1000` and **upserts**. A collision would overwrite an existing test location. The risk is small but not zero (see Clarification 5). Accepted: every other E2E spec and pip's legacy `SmokeTest.java` use a random id too, so the spec relies on the route's random id and a unique `smoke-test-location-{timestamp}` name.
- **Async processing after the 201:** `processPublication` is fire-and-forget (PDF, Excel, notifications, Courtel third-party push). Deleting the artefact straight away can leave API log noise if PDF generation is still running. Accept that noise, or poll `GET /test-support/artefacts/:id` before deleting. Recommendation: accept the noise and keep the test fast.
- **Timeouts:** per-test timeout 30s. Token request and POST should take under 5s on a warm pod. The health checks before this already retry for up to 100s, so the pod is warm by the time the spec runs. `retries: 0`: a smoke failure should be deterministic, and every retry creates new data anyway.
- **Missing API URL:** the workflow step fails before Playwright runs, and the spec's `beforeAll` guard covers local runs.

## 4. Acceptance Criteria Mapping

| AC | How it is met |
|---|---|
| Spec created at `e2e-tests/tests/smoke/publication-upload.spec.ts` | New file (Task 3) |
| Uniquely named location created before and cleaned up after | `beforeEach` / `afterEach` with timestamp+random name (Task 3) |
| Real OAuth `client_credentials` token, POST to the endpoint | `getApiAuthToken()` + `request.post` to `/v1/publication` (Task 3) |
| Asserts HTTP 201 and `artefact_id` | **Amended:** asserts 201 and `artefactId`. The current API returns camelCase and no longer returns `artefact_id` (Clarification 2) |
| Non-201 fails the test and the pipeline | `expect(status).toBe(201)` fails the spec, the step exits non-zero and the job fails. On main, promote and E2E stages are gated on smoke (Tasks 3, 6) |
| `job.smoke-test.yml` runs the spec after health checks | New steps after "Health check - API" (Task 6) |
| Runs on PR build | `workflow.preview.yml` passes `run-publication-smoke: true` + `secrets: inherit` (Task 7) |
| Runs after STG deployment | `workflow.main.yml` passes the same (Task 7) |
| Not tagged `@nightly` | No tag. The separate config does not grep-invert anyway (Task 3) |
| Fixture passes `validateCivilFamilyCauseList()` | The fixture is a copy of the validator test's `VALID_DATA`. Checked locally once with a throwaway `tsx` call, and checked on every run because the API runs the same validator and would return 400 (Task 2) |
| Secrets documented | **Amended:** document the actual inputs in the plan/PR and as a comment in `job.smoke-test.yml`: repo secrets `AZURE_CLIENT_ID` + `AZURE_TENANT_ID` (OIDC), plus Key Vault `cath-bootstrap-aat` secrets `app-tenant`, `cath-service-api-client-id`, `cath-service-api-client-secret` (Task 8) |

## 5. Test Scenarios

There is one journey, which is the smoke spec itself:

| # | Scenario | Task |
|---|---|---|
| 1 | Create a unique location, get a token, POST a valid civil and family cause list with `x-*` headers, assert 201 with `artefactId`, `locationId` and `listType`, then delete the artefact and location in teardown | Task 3 (spec), verified by Tasks 5 and 9 |

Verification (not separate tests):
- Local run against `yarn dev`, with credentials exported (Task 5)
- Negative check, done manually and not committed: temporarily break the fixture (remove `venue`) to confirm the spec fails with the API's 400 message in output and that teardown still removes the location (Task 5)
- CI run on this PR's preview build (Task 9)

## 6. CLARIFICATIONS NEEDED

**Decisions (final):** 2: assert `artefactId`. 3: `x-*` headers with the bare payload. 4: reuse the e2e Key Vault/OIDC pattern; `CATH_API_AZ_API` is not needed. 5: add `secrets: inherit` and `id-token: write`. 6: preview and main only, opt-in via `run-publication-smoke`. 10: full `yarn install --immutable`.

**Required secrets:** repo secrets `AZURE_CLIENT_ID` and `AZURE_TENANT_ID` (the CI OIDC identity used by `azure/login`), and Key Vault `cath-bootstrap-aat` secrets `app-tenant`, `cath-service-api-client-id` and `cath-service-api-client-secret` (an API client with the `api.publisher.user` role). `AZURE_CLIENT_SECRET` and `CATH_API_AZ_API` are not used.

1. ~~**`/v1/publication` vs `/publication`**~~ **RESOLVED:** use `/v1/publication`, as the ticket asks.
2. **Response field:** the ticket asks for `artefact_id`, but the API deliberately returns `artefactId`, and the nightly spec asserts `artefact_id` is absent. Confirm the AC should be amended to `artefactId`.
3. **Request shape:** the ticket's JSON envelope (`court_id`, `hearing_list`, ...) is obsolete. The plan uses `x-*` headers with the bare payload. Confirm.
4. **Secrets/env names:** the ticket's `CLIENT_ID`/`CLIENT_SECRET`/`TENANT_ID`/`CATH_API_AZ_API` mapping does not match the code. `secrets.AZURE_CLIENT_ID` is the CI OIDC identity, not the API client. The plan reuses the e2e job's Key Vault pattern. Confirm that is acceptable, and that `CATH_API_AZ_API` is not needed. The helper uses `${clientId}/.default`, and the `CATH_SERVICE_API_CLIENT_SCOPE` Key Vault entry is loaded by `run-with-credentials.js` but never read.
5. **Workflow wiring:** the ticket says no trigger or wiring changes are needed, but secrets are not passed to the smoke stage today. `secrets: inherit` must be added in `stage.smoke-test.yml`, `workflow.preview.yml` and `workflow.main.yml`, plus `id-token: write` on the smoke job. OK to make those changes?
6. **Other smoke callers:** demo (test-support disabled), ithc and perftest also use `stage.smoke-test.yml`. The plan makes the publication smoke opt-in and enables it only for preview and main. Should ithc/perftest also run it? If so, which Key Vault and API client do they use?
7. ~~**Side effects on aat (STG)**~~ **RESOLVED: accept (option a).** Existing E2E specs already upload CIVIL_AND_FAMILY_DAILY_CAUSE_LIST to deployed environments, for example `summary-of-publications.spec.ts` and `api/subscription-notifications.spec.ts`. They clean up only with `deleteTestArtefact(s)` or prefix cleanup, and both of those delete DB rows only. No test-support route deletes blobs. The smoke test behaves the same.
8. ~~**Location id upsert collision**~~ **RESOLVED: keep the existing pattern.** Other specs call `createTestLocation` without an id and rely on the random 90000+ id. pip-data-management's `SmokeTest.java` also used a random id (`10_000 + new Random().nextInt()`) with a name prefix of `SmokeTestLocation-`, and deleted publications and the location by name in `@AfterAll`. Don't pass an explicit id. Note that `createUniqueTestLocation` needs the global-setup prefix file, so it can't be used under the smoke config.
9. ~~**Smoke spec in the normal E2E run**~~ **RESOLVED: smoke job only.** The normal E2E run already covers this upload: the untagged tests in `summary-of-publications.spec.ts` call `uploadPublicationViaApi`, which POSTs CIVIL_AND_FAMILY_DAILY_CAUSE_LIST and asserts 201 and `artefactId`. E2E also runs after smoke against the same deployment, so a second run adds no coverage, just another orphaned artefact and more flake surface. `testIgnore: ["smoke/**"]` keeps it out of `test:e2e` and the nightly `test:e2e:all`. It runs in the Smoke Test job on preview and main, and locally via `yarn workspace e2e-tests run test:smoke`.
10. **Install strategy:** `yarn workspaces focus e2e-tests` vs full `yarn install --immutable`, which the e2e job uses. Focus is faster, but it is unproven in this repo's CI with the private `hmcts-cft` registry. Confirm which to use, or allow falling back to the full install.
11. **Nightly spec drift (out of scope, FYI):** `tests/api/blob-ingestion.spec.ts` posts `{ cases: [] }` for CIVIL_AND_FAMILY_DAILY_CAUSE_LIST and expects 201, but the API schema-validates the body and that payload is missing `document`, `venue` and `courtLists`. Either the nightly test is broken or it is not running. A separate ticket may be worth raising.
