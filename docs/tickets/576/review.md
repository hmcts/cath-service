# Code Review: Issue #576

## Summary

This is a re-review after the "Fixes Applied (post-review)" changes. The implementation adds an API-only Playwright smoke spec (`e2e-tests/tests/smoke/publication-upload.spec.ts`). It creates a `SMOKE_TEST_LOCATION_*` location through test-support, gets a `client_credentials` token, POSTs a minimal `CIVIL_AND_FAMILY_DAILY_CAUSE_LIST` to `/v1/publication` with `x-*` headers, asserts 201 / `artefactId` / `locationId` / `listType`, and then deletes the artefact and the location. It runs through its own `playwright.smoke.config.ts`, and the main config excludes it with `testIgnore: ["smoke/**"]`. `job.smoke-test.yml` runs it behind the opt-in `run-publication-smoke` input. Only `workflow.preview.yml` and `workflow.main.yml` turn that input on, and both pass `secrets: inherit` through `stage.smoke-test.yml`.

I judged the code against the ticket as amended by plan.md section 6: `artefactId` instead of `artefact_id`, `x-*` headers with the bare payload, Key Vault/OIDC credentials instead of `AZURE_CLIENT_SECRET` / `CATH_API_AZ_API`, smoke-job-only via `testIgnore`, and the opt-in set only on preview and main.

Scope: no `libs/*` or `apps/*` source changed. `git diff --name-only` has no such paths and the untracked files are all under `e2e-tests/` and `docs/`. Accessibility, the GOV.UK Design System, Welsh content and DB query performance do not apply, because there are no pages, templates or queries.

Automated checks run in this review:
- `yarn biome check` on the 5 changed e2e files: `Checked 5 files ... No fixes applied.`
- All 4 changed workflow files parse with the `yaml` package (`job.smoke-test.yml`, `stage.smoke-test.yml`, `workflow.main.yml`, `workflow.preview.yml`).
- `playwright test --config playwright.smoke.config.ts --list` lists 1 test (`publication-upload.spec.ts:49`). The default config lists 0 tests under `smoke/`.

### Verification of the claimed fixes

1. **Secret handling in `job.smoke-test.yml`: resolved, no regressions found.**
   - Order is now checkout (`:119`), setup-node (`:123`), corepack (`:129`), `yarn install --immutable` (`:134-136`), then `azure/login` (`:138-144`), then the smoke step (`:147-169`). Dependency install scripts run before any az session or credential exists.
   - Nothing writes to `$GITHUB_ENV` in the job. A grep finds only the comment at `:146`. The credentials are plain shell variables that are `export`ed at `:168` right before `yarn workspace e2e-tests run test:smoke` (`:169`). Exported variables are inherited by `yarn` → `playwright` → the worker process. `api-auth-helpers.ts:26-28` reads `AZURE_TENANT_ID`, `CATH_SERVICE_API_CLIENT_ID` and `CATH_SERVICE_API_CLIENT_SECRET`. `test-support-api.ts:3` reads `CATH_SERVICE_API_URL` and the spec reads it at `:9`. The names match.
   - Failure propagation: `set -euo pipefail` (`:151`), and each `VAR=$(fetch …)` is a bare assignment (`:163,165,166`), so a failed `az` call exits the step. The bug from the previous review, where a failed fetch inside `echo` arguments was swallowed, is gone.
   - Masking order: the client secret is fetched, then masked (`:164`), and nothing prints it before that. `az … -o tsv` errors go to stderr and do not contain the value. Tenant and client IDs are not masked. They are identifiers, not secrets, the same as in `job.e2e-test.yml`.
   - `URLS_JSON='${{ steps.urls.outputs.urls }}'` (`:153`) uses the same expression and quoting as the three existing steps (`:45,59,90`). The `urls` step always runs first, and `set -u` is safe because `URLS_JSON` is always assigned. Empty `.api` fails with `::error::` (`:155-158`).
   - Removed "Set API URL" / "Load credentials" steps: nothing dangling. No other step references `env.CATH_SERVICE_API_URL` or the credential variables, and the step-level env they used to feed is now built inside the smoke step.
   - `steps.publication-smoke.outcome` (`:173`) still matches `id: publication-smoke` (`:148`). When the input is false the step is skipped, `outcome` is `skipped`, and the upload does not run. That is correct.
   - The summary step (`:179-187`) has no `always()`, so the "Publication upload smoke test passed" line only prints after a successful run. That is accurate.
2. **Cleanup-guard comment: resolved.** `publication-upload.spec.ts:40` explains why the `locationId === undefined` early return must stay.
3. **Promotion comment: resolved.** `workflow.main.yml:92-94` now says that promotion depends on Entra ID, the `cath-bootstrap-aat` Key Vault and test-support on aat through the smoke stage. `promote-stage` still gates on `smoke-test-stage` (`:117-118`).

## 🚨 CRITICAL Issues

None. No acceptance criterion is `- [ ]`.

## ⚠️ HIGH PRIORITY Issues

1. **Three ACs can only be proven by a CI run (`- [~]`: AC3, AC7, AC8)**
   - **Missing:** pending CI run. Nobody has run the spec yet against a deployed API with the real Key Vault API client (`tasks.md:27`, Task 9 open). The local run and negative check (`tasks.md:15-16`, Task 5) were not done either. So these are unproven: that the real token works with the deployed API, that the preview pipeline runs the step, and that it runs against aat on master.
   - **Recommendation:** push, confirm that the Preview → Smoke Test job runs "Publication upload smoke test" and passes, then check `GET /test-support/locations` for leftover `SMOKE_TEST_LOCATION_*` rows. After merge, confirm the same on the master run against aat. Optionally, do the Task 5 negative check once on a throwaway branch (remove `venue` from the fixture) to show that the 400 body appears in the log and that teardown still runs.

## 💡 SUGGESTIONS

These are carried forward from the previous review. I checked each one again and none has been addressed.

1. **Put the publication smoke in its own job** (`job.smoke-test.yml:30-32`, and the eight `if: inputs.run-publication-smoke` guards at `:120,124,130,135,139,149`, plus `:173,185`)
   - `id-token: write` currently applies to every smoke run, including demo, ithc and perftest, which never use it. A `publication-smoke` job with `needs: smoke-test`, `if: inputs.run-publication-smoke` and its own `permissions` would limit the permission to where it is needed and remove the repeated guards.

2. **The failure artifact holds almost nothing, and JUnit is never published** (`job.smoke-test.yml:171-177`, `playwright.smoke.config.ts:11`)
   - An API-only spec writes little more than `.last-run.json` / `error-context.md` to `e2e-tests/test-results/`. The JUnit reporter writes `e2e-tests/junit-results.xml`, which nothing uploads. Either add it to the upload `path` or drop the `junit` reporter. The `line`/`github` reporters and the response text in the assertion message (`spec:71`) already put the reason in the log. Do not turn on `trace` for this config. Traces record the `Authorization: Bearer` header.

3. **Add `timeout-minutes` to the smoke job** (`job.smoke-test.yml:26-32`)
   - A full monorepo `yarn install --immutable` (`:136`) is now on the critical path of every preview and master run, with the default 360-minute timeout. `job.e2e-test.yml:21` uses `timeout-minutes: 15`.

4. **Spec state and typing** (`e2e-tests/tests/smoke/publication-upload.spec.ts:15-16, 19, 46, 73, 86`)
   - `locationId as number` (`:46`) is an `as` assertion even though the guard at `:41` has already narrowed the value. Capture it once with `const id = locationId;` after the guard and pass `id` to both cleanups and to `runCleanup` for logging, instead of reading module state at `:86`.
   - `JSON.parse(responseText)` (`:73`) is untyped (`any`). Annotate it, e.g. `const body: { artefactId?: string; locationId?: string; listType?: string } = …`.
   - `test.describe.configure({ mode: "serial" })` (`:19`) does nothing with one test and `workers: 1`. It can be removed.

5. **Orphaned data** (spec teardown, plan Clarification 7)
   - Blobs and generated PDFs stay in aat storage, which the plan accepted. If the job is cancelled, `afterEach` does not run, and global teardown does not sweep `SMOKE_TEST_LOCATION_*`. Consider adding the `SMOKE_TEST_` prefix to an existing prefix-cleanup route later.

6. **The `locationId` assertion only proves the echo** (`spec:77`)
   - For `MANUAL_UPLOAD`, `libs/api/src/blob-ingestion/validation.ts:80-82` ignores the result of `getLocationById`. So `body.locationId === String(locationId)` only shows the API echoes the header. Treat creating the location as a check that test-support is reachable and as setup for downstream processing, not as part of the publication check.

7. **Update the ticket text and the PR description** (`docs/tickets/576/ticket.md`)
   - AC4: `artefact_id` → `artefactId`.
   - AC11 and the section 3 YAML: replace `AZURE_CLIENT_SECRET` / `CATH_API_AZ_API` / `CLIENT_ID`… with the repo secrets `AZURE_CLIENT_ID` and `AZURE_TENANT_ID` (OIDC), plus the `cath-bootstrap-aat` secrets `app-tenant`, `cath-service-api-client-id` and `cath-service-api-client-secret`.
   - Background: "no workflow trigger changes are needed / only `job.smoke-test.yml`" is wrong, because `stage.smoke-test.yml`, `workflow.preview.yml` and `workflow.main.yml` all changed.
   - Section 1: `x-*` headers with the bare payload, not a JSON envelope with `hearing_list`.
   - Section 3: Node from `.nvmrc` (24.17.0), `yarn install --immutable` from the repo root, no Playwright browser install, and `actions/*` v6/v7.
   - The endpoint lives at `apps/api/src/routes/v1/publication.ts`, not `libs/api/...`.
   - Put the required-secrets note in the PR description (Task 8).

### Previous findings now resolved

- Previous HIGH #2 (secret in `$GITHUB_ENV` during `yarn install`, plus the failed `az` fetch being swallowed): resolved (`job.smoke-test.yml:133-169`).
- Previous Suggestion 5 (explain the `locationId` guard): resolved (`spec:40`).
- Previous Suggestion 7 (stale promotion-gating comment): resolved (`workflow.main.yml:92-94`).

## ✅ Positive Feedback

- The secret fix follows the recommended shape exactly. Install runs before login, credentials stay in one step's shell and never touch `$GITHUB_ENV`, the step fails fast under `set -euo pipefail`, and the secret is masked before any output. This is now stricter than `job.e2e-test.yml`.
- The comments added at `job.smoke-test.yml:133` and `:146` explain *why* the ordering and scoping matter, so a later refactor is less likely to undo them.
- The separate smoke config skips heavy `globalSetup` seeding and `webServer`, with `retries: 0` and `workers: 1`. That suits a deterministic gate.
- The fail-fast `CATH_SERVICE_API_URL` guard (`spec:21-25`) stops the silent fallback to localhost in `test-support-api.ts:3`.
- The failure message includes the response body (`spec:71`). As established in the previous review, error bodies do not contain the token.
- Cleanup is defensive: each delete runs in its own try/catch, there is a fallback delete by location, and a guard stops the empty-filter delete-all.
- The opt-in input defaults to `false` (`job.smoke-test.yml:15-19`, `stage.smoke-test.yml:24-28`), so demo, ithc and perftest keep their curl-only behaviour.

## Test Coverage Assessment

| Area | Status |
|---|---|
| Unit tests | n/a, no workspace source changed (no `libs/` or `apps/` paths in `git diff --name-only` or untracked files) |
| Statement coverage per changed workspace | n/a, no workspace source changed. The only workspace touched is `e2e-tests` (test spec, Playwright configs, fixture, `package.json` script) |
| E2E | 1 smoke journey (`tests/smoke/publication-upload.spec.ts:49`). It shows up under the smoke config and is excluded from `test:e2e` / `test:e2e:all` by `playwright.config.ts:10-11`. The same upload is also covered in E2E by `summary-of-publications.spec.ts` (plan Clarification 9) |
| Accessibility | n/a, API-only, no pages |
| Not yet run | Local run, the negative check (Task 5) and the CI run (Task 9) |

## Acceptance Criteria Verification

- [x] `e2e-tests/tests/smoke/publication-upload.spec.ts` created: `e2e-tests/tests/smoke/publication-upload.spec.ts:1-88`
- [x] Smoke test creates a uniquely named test location before the test and cleans it up after: `publication-upload.spec.ts:27-37` (`SMOKE_TEST_LOCATION_${Date.now()}_${random}`), `:39-47` (artefact delete, then location delete, in `afterEach`, which runs on failure)
- [~] Smoke test obtains a real OAuth `client_credentials` token and POSTs to `POST /v1/publication`: `publication-upload.spec.ts:50` (`getApiAuthToken()`, `utils/api-auth-helpers.ts:39-44` `grant_type: client_credentials`), `:54-68` (POST to `${API_BASE_URL}/v1/publication`), credentials from `job.smoke-test.yml:160-168`. **Missing:** pending CI run, to prove the Key Vault API client gets a token the deployed API accepts
- [x] Smoke test asserts HTTP 201 and `artefact_id` present in response body (amended to `artefactId` per plan decision 2): `publication-upload.spec.ts:71` (201), `:76` (`artefactId` truthy). The ticket text should be updated (Suggestion 7)
- [x] If the POST returns anything other than HTTP 201, the smoke test fails and the CI pipeline fails: `publication-upload.spec.ts:71`; `playwright.smoke.config.ts:8` (`retries: 0`); `job.smoke-test.yml:151,169` (`set -euo pipefail`, so a non-zero Playwright exit fails the step and the job); `stage.smoke-test.yml:39-46`; downstream gates `workflow.preview.yml:84`, `workflow.main.yml:95,118`
- [x] `job.smoke-test.yml` runs the smoke test step after the existing health checks: `.github/workflows/job.smoke-test.yml:147-169`, after `Health check - API` (`:88-117`)
- [~] Smoke test runs on PR build (`workflow.preview.yml` → `stage.smoke-test.yml` → `job.smoke-test.yml`): `workflow.preview.yml:78-79`, `stage.smoke-test.yml:24-28,45-46`, `job.smoke-test.yml:15-19`. **Missing:** pending CI run on this PR's preview pipeline
- [~] Smoke test runs after STG deployment (`workflow.main.yml` → `stage.smoke-test.yml` → `job.smoke-test.yml`): `workflow.main.yml:74-84` (`needs: [deploy-stage]`, `run-publication-smoke: true`, `secrets: inherit`). **Missing:** pending CI run on master against aat
- [x] Test does **not** require `@nightly` tag: `publication-upload.spec.ts:49` (no tag); `e2e-tests/package.json` `test:smoke` has no `--grep`/`--grep-invert`
- [x] `civil-and-family-daily-cause-list-smoke.json` fixture passes `validateCivilFamilyCauseList()` validation: `e2e-tests/fixtures/civil-and-family-daily-cause-list-smoke.json:1-36`. The fixture has not changed since the previous review, where the real validator returned `isValid: true, errors: []`
- [x] Required secrets documented (amended per plan decision 4 to the OIDC repo secrets plus Key Vault secrets): `.github/workflows/job.smoke-test.yml:21-23`, `docs/tickets/576/plan.md` section 6 "Required secrets". The ticket's list (`AZURE_CLIENT_SECRET`, `CATH_API_AZ_API`) and the PR description still need updating (Suggestion 7)

Tally: 8 `[x]`, 3 `[~]`, 0 `[ ]`.

## Next Steps

- [ ] Push, then confirm the Preview Smoke Test job runs and passes the publication smoke and leaves no `SMOKE_TEST_LOCATION_*` rows behind (HIGH 1: AC3, AC7)
- [ ] After merge, confirm the master/aat Smoke Test job passes (HIGH 1: AC8)
- [ ] Optional: Task 5 negative check (broken fixture → 400 in log, teardown still runs)
- [ ] Consider Suggestions 1-4 (separate job, artifact/JUnit, `timeout-minutes`, spec typing and state)
- [ ] Update ticket #576 text and the PR description with the amended contract and secrets (Suggestion 7)

## Overall Assessment

**NEEDS CHANGES**

The post-review fixes are correct and introduce no regressions. Secrets no longer touch `$GITHUB_ENV` or the install step. Fetch failures now fail the step. The exported variables reach the Playwright process under the names the helpers read. The removed steps left nothing dangling, and the artifact step's `steps.publication-smoke.outcome` reference is still valid. Lint and YAML parsing are clean. The only blocker left is procedural: three ACs (real token, PR run, STG run) can only be proven by a CI run that has not happened yet. Once the preview and master runs pass, this can be approved without code changes. The suggestions are optional.
