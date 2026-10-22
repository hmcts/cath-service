# Tasks: #910 Verify GOV.UK Notify email download links end to end

## Implementation Tasks

### Resolve clarifications first
- [x] (plan default applied, not confirmed by user) Confirm the boundary semantics: `<=` (recommended) or `<` (plan CLARIFICATIONS #1)
- [x] (verified against the Notify API with the local key; production key still to confirm) Get the Notify template UUIDs for `SJP_EXCEL_ONLY`, `NO_LINKS` and `NON_SJP_PDF` (#3)
- [x] (plan default applied, not confirmed by user) Agree the PR-gate runtime budget (#4) and accept unit-only coverage for the exact-2 MB boundary (#2). `SJP_EXCEL_ONLY` turned out to be reachable and now has an e2e case (#5)

### Production: 2 MB rule (defects A-D)
- [x] Add `MAX_NOTIFY_ATTACHMENT_SIZE_BYTES` and `isWithinNotifyAttachmentLimit(file: Buffer)` to `libs/notifications/src/govnotify/template-config.ts`
- [x] Replace the local constant (`notification-service.ts:122`) and the `<` checks (`:515-521`) with the shared predicate, for both PDF and Excel
- [x] Remove `MAX_PDF_SIZE_BYTES` and `exceedsMaxSize` from `libs/list-types/common/src/pdf/pdf-utilities.ts`, and the re-export from `libs/list-types/common/src/index.ts`
- [x] Remove `exceedsMaxSize` from `GeneratePdfResult`/`PdfResult` and the pass-through at `:477`, and `pdfExceedsMaxSize` at `:625`/`:679`, in `libs/publication/src/processing/service.ts`
- [x] Update the 32 test files that reference `exceedsMaxSize`. Delete the flag-only "exactly 2MB / exceeds" generator tests (RCJ standard, civil-and-family) and the constant tests in `pdf-utilities.test.ts`
- [x] Add boundary unit tests to `notification-service.test.ts` for PDF and Excel at `MAX` and `MAX + 1`, checking which buffers reach `sendEmail` and the chosen template id
- [x] Add a `notification-service.test.ts` case for SJP with a null PDF blob and an Excel buffer, asserting the `SJP_EXCEL_ONLY` template
- [x] Add predicate tests (`MAX - 1`, `MAX`, `MAX + 1`) to `template-config.test.ts`
- [x] Run `yarn test` and `yarn lint:fix`; confirm `grep -r exceedsMaxSize libs --include=*.ts` returns nothing outside `dist/`

### Configuration
- [x] `e2e-tests/playwright.config.ts`: build a `NOTIFY_TEMPLATE_ENV_VARS` array of all six subscription template vars and use it in both the CI and local `command` strings
- [x] `apps/web/.env.example`: document `..._SUBSCRIPTION`, `..._SUBSCRIPTION_PDF_ONLY`, `..._SUBSCRIPTION_PDF_EXCEL`, `..._SJP_EXCEL_ONLY`, `..._NO_LINKS`, `..._NON_SJP_PDF`
- [x] Add the three missing template ids to `apps/api/helm/values.yaml`, `apps/api/helm/values.dev.yaml` and `apps/web/helm/values.yaml`

### E2E helpers
- [x] Move `GOVUK_NOTIFY_DOCUMENT_LINK_PATTERN` into `e2e-tests/utils/notification-helpers.ts`, extended to match `/d/<service-id>/<document-id>`
- [x] Add `assertEmailDownloadLinks(govNotifyId, expectedLinkCount)`: fetch via `getGovNotifyEmail`, count distinct matches with a fresh global regex (`matchAll`), assert `toHaveLength`, return the email
- [x] Add an `extension` parameter to `checkFlatFileExists` in `e2e-tests/utils/test-support-api.ts`; delete the broken `listFlatFiles`, `FlatFileListItem` and `FlatFileListResponse`
- [x] Replace the spec-local `waitForPdfGeneration`/`waitForFileGeneration` with one `waitForStoredFiles(artefactId, extensions)` that polls `checkFlatFileExists` per extension

### E2E data-driven cases
- [x] Create `e2e-tests/fixtures/list-types/<package>.json`: one fully hydrated payload per distinct schema, copied from each package's `json-validator.test.ts` `VALID_DATA` (subject to CLARIFICATIONS #7)
- [x] Create `e2e-tests/utils/list-type-email-cases.ts` with the `EmailLinkCase` interface, payload builders that patch `contentDate`/venue name, and the `EMAIL_LINK_CASES` table: 20 PDF+Excel rows (2 links) and 51 PDF-only rows (1 link), as listed in the plan
- [x] Derive `expectedLinkCount` from `expectedFiles` instead of hand-typing it; support an optional `nightly` flag for the runtime fallback split
- [x] In the spec, load friendly names once from `GET /test-support/list-types` and match on exact `name`
- [x] In the spec, loop over `EMAIL_LINK_CASES`. Each test gets a unique location, user and subscription, `test.setTimeout(120_000)` and `test.skip(!GOVUK_NOTIFY_API_KEY)`, and asserts: 201; notification for this `subscriptionId` is `Sent` with `govNotifyId`; expected files stored (and `.xlsx` absent where not expected); link count; recipient; friendly name, location and date in the body; status regex
- [x] Add a flat-file `NO_LINKS` case (multipart `POST /publication`): no `.pdf`/`.xlsx` stored, 0 links
- [x] Replace `createLargeCivilFamilyCauseListPayload` with a high-entropy oversize builder; calibrate locally to about 2.5-3 MB
- [x] Add the oversize case (`test.setTimeout(180_000)`): hard `sizeBytes > 2 MB` precondition, `.pdf` and `.xlsx` stored, 0 links. Remove the old size-branching assertion
- [x] Remove the old SJP public/press, large-file and C&F email blocks. Keep the multi-subscriber part (with `test.skip` and hard asserts) and the `@nightly` no-subscriptions test
- [x] Make sure every test pushes its ids to the existing `testData` accumulator used by `afterEach`
- [x] Add the Excel-only case: a payload just over the 256 KB PDF gate, `.xlsx` at most 2 MB, no `.pdf`, 1 link (`buildExcelOnlyCivilAndFamilyPayload`)
- [x] Add `PACKAGE_ALIASES` for the 31 regional and court variants so they accept JSON, with unit tests, fixtures and table rows; tag all but one row per package `@nightly`
- [ ] Get product sign-off for JSON publishing of the 31 variants and note the differences from the Excel upload path in the PR (plan section 6)

### Separate commit (not #910 scope)
- [x] `POST /test-support/locations`: create with a generated id and retry only on a `location_id` clash, instead of upserting a random id

### Verification
- [x] Run the spec locally with `GOVUK_NOTIFY_API_KEY` and all six template ids set; confirm the distinct link counts against real email bodies (CLARIFICATIONS #8)
- [x] Run the spec locally without the API key; confirm the Notify tests report as skipped, not passed
- [x] `yarn test:e2e` passes locally: changed spec 76/76 including nightly; full suite 104 passed, 0 failed, 30 skipped by pre-existing `.skip` blocks
- [x] `yarn lint` passes (2 pre-existing warnings in `@hmcts/web` and `@hmcts/web-core`). `yarn test`: 68 of 69 workspaces pass; `@hmcts/web` had 2 timeouts under full-parallel load (`app.test.ts`, `remove-list-search-results/index.test.ts`) and passes 3957/3957 when run alone. `apps/web/src` is not changed by this branch
- [ ] (needs CI) Record the PR-gate duration from the first CI run (52 untagged tests in the spec; 2.8 minutes locally with 7 workers, CI uses 4). If it is over budget, tag more rows `nightly`
