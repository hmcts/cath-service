# #1030 Tasks (revised scope)

## Implementation Tasks

### Helpers
- [x] `libs/test-support/src/routes/test-support/list-types.ts`: exact name match for `?name=`; update `list-types.test.ts` (Scenario 7)
- [x] `libs/test-support/src/routes/test-support/locations.ts`: accept optional `locationReferences` (provenance, provenanceLocationId, provenanceLocationType); unit test (D2)
- [x] `e2e-tests/utils/test-support-api.ts` + `dynamic-test-data.ts`: pass `locationReferences` through `createTestLocation()` / `createUniqueTestLocation()` (D2)
- [x] `e2e-tests/utils/`: add `uploadTestPublication()` (POST `/publication`, `getApiAuthToken`, list type by name, own `locationId`, env API base URL); replace the 5 inline publish helpers
- [x] `e2e-tests/utils/`: add `buildLocationCsv(rows, overrides?)` (prefixed names, random unused IDs 80000–89999, unique SNL provenance IDs) (D3)

### Specs that use or upload to existing courts
- [x] `publication-authorisation.spec.ts`: own court per test/describe with own PUBLIC (Crown daily/firm), PRIVATE (Civil daily) and CLASSIFIED (Civil and Family) uploads; remove every `locationId=9` (D1, Scenario 1)
- [x] `api/blob-ingestion.spec.ts`: own court for `MANUAL_UPLOAD`; SNL case uses own court's SNL reference and asserts the resolved ID; env API base URL instead of `localhost:3001` (D2, Scenario 2)
- [x] `api/flat-file-ingestion.spec.ts`: same (D2, Scenario 2)
- [x] `api/pdda-html-s3-upload.spec.ts`: own court instead of `"1"` (D2, Scenario 2)
- [x] `system-admin/reference-data-upload.spec.ts`: every CSV from `buildLocationCsv()`; stop reading `fixtures/test-reference-data.csv`; line 1757 asserts the generated ID (D3)
- [x] `system-admin/blob-explorer.spec.ts`: own court + own uploaded publication; open own row by name and own artefact by ID; remove both `if (count > 0)` guards; don't click "Re-submit subscription" (D4, Scenario 6)

### Numeric list type IDs
- [x] `admin/manual-upload.spec.ts`: select list type by label instead of `"1"`, `"6"`, `"7"`, `"8"` (D5, Scenario 3)
- [x] `admin/non-strategic-upload.spec.ts`: select list type by label instead of `"9"` at lines 381, 426, 455, 805, 838; the court is already test-created (D5, D6, Scenario 3)

### Publications via ingestion
- [x] `e2e-tests/fixtures/list-types/civil-daily-cause-list.json`: minimal valid payload with a placeholder case number/name (D7)
- [x] `verified-user/email-subscriptions.spec.ts`: upload via `uploadTestPublication()` with a prefixed case number/name instead of `createTestArtefact`; read the `list_search_config` field names before uploading (D7)
- [x] `libs/test-support/src/routes/test-support/artefacts.ts`: remove the `list_search_config` upsert (lines 55-67); update `artefacts.test.ts` (D7)
- [x] Add a read-only test-support check for a list type's search config, used by the fail-fast above (D7)
- [x] D7 revised 2026-11-10: `POST /test-support/list-search-config` (create-if-missing, never overwrites) + unit tests; `global-setup.ts` calls `ensureListSearchConfig()` for `CIVIL_DAILY_CAUSE_LIST`

### Global setup: location 9 (D8)
- [x] `e2e-tests/fixtures/test-reference-data.csv`: remove the `9` (Test SJP Court) row
- [x] `e2e-tests/utils/seed-location-data.ts`: remove `seedSjpArtefacts()` and its call
- [x] `e2e-tests/utils/verify-seed-data.ts`: remove the location-9 artefact check (line 85)
- [x] Grep that no spec reads the seeded SJP artefacts after D1

### Test-created verified users (D10)
- [x] Web test-support `POST /test-support/login` (userId → real session with role and provenance), mounted only under the existing test-support gate; unit tests for the session shape and for not being registered when the gate is off
- [x] `e2e-tests/utils/`: `loginAsTestUser(page, user)`
- [x] Migrate to a test-created user + `loginAsTestUser`: `verified-user/email-subscriptions`, `bulk-unsubscribe`, `account-home`, `sjp-public-list`, `publication-authorisation` (`CFT_IDAM`-provenance user) (Scenario 4)
- [x] Confirm that a Notify rejection for a prefixed address (team key) doesn't break subscribe or unsubscribe journeys
- [x] `cft-idam/cft-idam.spec.ts` keeps logging in with `CFT_VALID_TEST_ACCOUNT` (the only spec that logs in with it)

### Specs that check the notified email (D11)
- [x] `e2e-tests/utils/`: `createNotificationSubscriber()` (email `CFT_VALID_TEST_ACCOUNT`, prefixed `userProvenanceId`)
- [x] `/test-support/cleanup`: also delete users with a prefixed `userProvenanceId`, plus their subscriptions; unit test
- [x] Migrate `api/subscription-notifications`, `api/blob-ingestion-notifications`, and the email-checking parts of `admin/manual-upload` and `admin/non-strategic-upload`; assert `email_address` against `CFT_VALID_TEST_ACCOUNT`; remove the manual cleanup in `manual-upload`

### Real reference data and list types (D9)
- [x] `manage-list-types.spec.ts`: add uses `prefixName("LIST_<testId>")`; edit and delete create a prefixed list type in `beforeEach` and act on that row only (Scenario 5)
- [x] `reference-data-management.spec.ts`: create uses a prefixed name; modify and delete act on a test-created prefixed jurisdiction; location-jurisdiction tests use an own court and drop the early `return` (Scenario 5)
- [x] `reference-data-upload.spec.ts`: `prefixName(...)` for the Add Jurisdiction, Sub-Jurisdiction and Region journeys
- [x] `/test-support/cleanup`: delete prefixed sub-jurisdictions, then jurisdictions, then regions after locations; `cleanup.test.ts` proves unprefixed rows are untouched

### Docs and verification
- [ ] `.claude/rules/e2e-testing.md`: "create your own user, court, subscription and publication; read-only use of real courts (location 9 only for the SJP entry points); list types by name or label" rule, plus `uploadTestPublication` and `buildLocationCsv`
- [x] ~~Environment prerequisite (D7): set `CIVIL_DAILY_CAUSE_LIST` search config by hand on preview and aat~~ replaced by global setup (D7 revised)
- [x] Skip tests blocked by app/environment issues with `test.fixme` + issue annotation (#1395 items 1–7; SJP download → #1383); remove each skip once its item is fixed
- [ ] Tell the developer D7 changed (tests now create the search config when missing)
- [x] Grep `e2e-tests/tests` for `locationId: "9"`, `x-court-id": "1"`, `9001`, numeric `listType` `selectOption`: none left (apart from `account-home` / `view-option` reading location 9)
- [ ] `yarn lint:fix`, `yarn test`, `yarn test:e2e`
- [ ] 3 consecutive preview passes with `workers: 4`
