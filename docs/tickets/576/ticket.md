# #576: Implement publication upload smoke test for POST /v1/publication endpoint

**State:** OPEN
**Assignees:** alao-daniel
**Author:** junaidiqbalmoj
**Labels:** type:story
**Created:** 2026-05-12T11:42:21Z
**Updated:** 2026-10-22T14:31:59Z

## Description

## User Story

As a developer, I want a smoke test that uploads a real publication to `POST /v1/publication` on every PR build and STG deployment so that we have fast, automated confirmation that the most critical API functionality is working end-to-end in the deployed environment.

## Background

The current smoke test (`job.smoke-test.yml`) only performs HTTP health checks (`curl` to `/`) confirming the web and API services are reachable. It does not verify that any business functionality works.

The most critical end-to-end path in cath-service is publication ingestion: a caller authenticates via OAuth, POSTs a hearing list JSON to the API, and the system validates, persists, and processes the publication. If this is broken, the entire service is non-functional.

**The smoke test is already triggered in CI** in both `workflow.preview.yml` (PR builds) and `workflow.main.yml` (STG deployment) — no workflow trigger changes are needed. Only the contents of `job.smoke-test.yml` need extending with the actual smoke test step.

## Changes Required

### 1. New smoke test spec: `e2e-tests/tests/smoke/publication-upload.spec.ts`

A Playwright API test (no browser, uses `request` fixture) with the following flow:

**Setup:**
- Create a test location via the test support API (`createTestLocation`) with a unique name (e.g. `smoke-test-location-{timestamp}`)

**Test — `POST /v1/publication` with valid OAuth token:**
- Obtain an OAuth bearer token using `client_credentials` grant (using existing `api-auth-helpers.ts` pattern)
- POST to `{API_URL}/v1/publication` with:
  ```json
  {
    "court_id": "{test_location_id}",
    "provenance": "MANUAL_UPLOAD",
    "content_date": "{today}",
    "list_type": "CIVIL_AND_FAMILY_DAILY_CAUSE_LIST",
    "sensitivity": "PUBLIC",
    "language": "ENGLISH",
    "display_from": "{now}",
    "display_to": "{now + 1 day}",
    "hearing_list": { ... }
  }
  ```
  Header: `Authorization: Bearer {token}`
- Assert: HTTP 201
- Assert: response body contains `artefact_id`

**Teardown:**
- Delete the artefact via test support API (`deleteTestArtefact`)
- Delete the test location via test support API (`deleteTestLocations`)

The test must **not** be tagged `@nightly` — it must run on every pipeline (PR and STG).

### 2. Fixture file: `e2e-tests/fixtures/civil-and-family-daily-cause-list-smoke.json`

A minimal valid `CIVIL_AND_FAMILY_DAILY_CAUSE_LIST` JSON payload used exclusively by the smoke test. Must be small (fast to POST) and must pass `validateCivilFamilyCauseList()` validation. Equivalent to pip's `src/smokeTest/resources/civilDailyCauseList.json`.

### 3. Update `job.smoke-test.yml`

Add a step after the existing health checks to run the smoke test spec against the deployed API URL:

```yaml
- name: Checkout code
  uses: actions/checkout@v4

- name: Setup Node.js
  uses: actions/setup-node@v4
  with:
    node-version: '22'

- name: Install dependencies
  run: yarn install --frozen-lockfile
  working-directory: e2e-tests

- name: Install Playwright
  run: yarn playwright install chromium
  working-directory: e2e-tests

- name: Run publication upload smoke test
  run: yarn playwright test tests/smoke/publication-upload.spec.ts
  working-directory: e2e-tests
  env:
    CATH_SERVICE_API_URL: <api url decoded from inputs.urls>
    CLIENT_ID: ${{ secrets.AZURE_CLIENT_ID }}
    CLIENT_SECRET: ${{ secrets.AZURE_CLIENT_SECRET }}
    TENANT_ID: ${{ secrets.AZURE_TENANT_ID }}
    CATH_API_AZ_API: ${{ secrets.CATH_API_AZ_API }}
```

## Acceptance Criteria

- [ ] `e2e-tests/tests/smoke/publication-upload.spec.ts` created
- [ ] Smoke test creates a uniquely named test location before the test and cleans it up after
- [ ] Smoke test obtains a real OAuth `client_credentials` token and POSTs to `POST /v1/publication`
- [ ] Smoke test asserts HTTP 201 and `artefact_id` present in response body
- [ ] If the POST returns anything other than HTTP 201, the smoke test fails and the CI pipeline fails
- [ ] `job.smoke-test.yml` runs the smoke test step after the existing health checks
- [ ] Smoke test runs on PR build (`workflow.preview.yml` → `stage.smoke-test.yml` → `job.smoke-test.yml`)
- [ ] Smoke test runs after STG deployment (`workflow.main.yml` → `stage.smoke-test.yml` → `job.smoke-test.yml`)
- [ ] Test does **not** require `@nightly` tag
- [ ] `civil-and-family-daily-cause-list-smoke.json` fixture passes `validateCivilFamilyCauseList()` validation
- [ ] Required secrets documented: `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET`, `AZURE_TENANT_ID`, `CATH_API_AZ_API`

## References

- `e2e-tests/utils/test-support-api.ts` — `createTestLocation`, `deleteTestLocations`, `deleteTestArtefact`
- `e2e-tests/utils/api-auth-helpers.ts` — OAuth token acquisition
- `libs/api/src/routes/v1/publication.ts` — endpoint being smoke tested
- `libs/api/src/blob-ingestion/repository/model.ts` — `BlobIngestionRequest` interface
- `.github/workflows/job.smoke-test.yml` — where the new step is added
- `.github/workflows/workflow.preview.yml` — PR smoke test trigger (already wired)
- `.github/workflows/workflow.main.yml` — STG smoke test trigger (already wired)


## Comments

No comments on this issue.
