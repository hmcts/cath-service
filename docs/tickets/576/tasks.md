# Tasks: #576 Publication upload smoke test

## Implementation Tasks

- [x] 1. Resolve the CLARIFICATIONS in `plan.md`, at least items 1 (endpoint path), 5 (workflow wiring), 6 (which environments) and 7 (STG side effects)
- [x] 2. Create `e2e-tests/fixtures/civil-and-family-daily-cause-list-smoke.json` by copying `VALID_DATA` from `libs/list-types/civil-and-family-daily-cause-list/src/validation/json-validator.test.ts`. Check it once locally with `validateCivilFamilyCauseList()` (throwaway `tsx` one-liner, not committed)
- [x] 3. Create `e2e-tests/tests/smoke/publication-upload.spec.ts`:
  - [x] `beforeAll` guard that fails if `CATH_SERVICE_API_URL` is unset
  - [x] `beforeEach`: `createTestLocation` with a unique `name`/`welshName` (`SMOKE_TEST_LOCATION_{ts}_{rand}`)
  - [x] Test: `getApiAuthToken()`, then POST with `x-*` headers (MANUAL_UPLOAD, `x-court-id` = locationId, today, CIVIL_AND_FAMILY_DAILY_CAUSE_LIST, ENGLISH, LIST, PUBLIC, display from now / to now+1d) and the fixture body
  - [x] Assert status 201 (with the response text in the failure message), `artefactId` truthy, `locationId` and `listType` match
  - [x] `afterEach`: `deleteTestArtefact(artefactId)` if set, otherwise `deleteTestArtefacts({ locationId })`, then `deleteTestLocations([locationId])`. Each in its own try/catch with logging
  - [x] No `@nightly` tag
- [x] 4. Add `e2e-tests/playwright.smoke.config.ts` (`testDir: ./tests/smoke`, no globalSetup/globalTeardown/webServer, `retries: 0`, `workers: 1`, 30s timeout, CI reporters line/github/junit). Add a `"test:smoke": "playwright test --config playwright.smoke.config.ts"` script to `e2e-tests/package.json`. Add `testIgnore: ["smoke/**"]` to `e2e-tests/playwright.config.ts` so the spec is excluded from `test:e2e` and the nightly `test:e2e:all`
- [ ] 5. Verify locally: run `yarn dev`, export `CATH_SERVICE_API_URL`, `AZURE_TENANT_ID`, `CATH_SERVICE_API_CLIENT_ID` and `CATH_SERVICE_API_CLIENT_SECRET`, then `yarn workspace e2e-tests run test:smoke`. Temporarily break the fixture to confirm the spec fails with the 400 message and that teardown still removes the location
  - Not done: no local API running and no API client credentials available to this session. Done instead: fixture checked against `validateCivilFamilyCauseList()` (valid; invalid with `venue` removed), `--list` under both configs, and the `CATH_SERVICE_API_URL` guard fails fast when unset
- [x] 6. Update `.github/workflows/job.smoke-test.yml`:
  - [x] Add a `run-publication-smoke` boolean input (default `false`)
  - [x] Add `permissions: { contents: read, id-token: write }` to the job
  - [x] After the health checks, add steps gated on the input: `actions/checkout@v7`, `azure/login@v3` (OIDC), load `app-tenant` / `cath-service-api-client-id` / `cath-service-api-client-secret` from `cath-bootstrap-aat` (mask the secret), `actions/setup-node@v6` with `.nvmrc`, `corepack enable`, install deps (`yarn workspaces focus e2e-tests`, or `yarn install --immutable`)
  - [x] Set `CATH_SERVICE_API_URL` from `jq -r '.api'` on the decoded URLs, failing if it is empty
  - [x] Run `yarn workspace e2e-tests run test:smoke`
  - [x] Upload `e2e-tests/test-results/` on failure. Move the "Smoke test summary" step to the end
  - Install: used `yarn install --immutable` (decision on Clarification 10)
- [x] 7. Update `.github/workflows/stage.smoke-test.yml` to accept and forward `run-publication-smoke` and add `secrets: inherit` to the job call. Update the `smoke-test-stage` callers in `workflow.preview.yml` and `workflow.main.yml` with `run-publication-smoke: true` and `secrets: inherit`. Leave demo, ithc and perftest unchanged unless Clarification 6 says otherwise
- [x] 8. Document the required secrets as a comment in `job.smoke-test.yml` and in the PR description: repo secrets `AZURE_CLIENT_ID` and `AZURE_TENANT_ID` (OIDC), plus Key Vault `cath-bootstrap-aat` secrets `app-tenant`, `cath-service-api-client-id` and `cath-service-api-client-secret`
- [ ] 9. Run `yarn lint:fix` and push. Confirm the preview pipeline's Smoke Test job runs the spec, passes, and leaves no `SMOKE_TEST_LOCATION_*` rows behind (check via `GET /test-support/locations`)
  - Biome is clean on the changed files. Not pushed; needs a CI run on the preview pipeline
