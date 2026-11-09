# #1030: Refactoring of end to end tests — Technical Plan (revised scope)

## Scope (agreed 2026-11-06)

- **Global setup stays as it is.** It seeds application-level data (reference data, list types, fixture locations) for more than just the E2E suite. It is not removed or changed in this ticket.
- **List types:** tests use the existing list types and resolve them by **name**, never by numeric ID.
- **Must be dynamic and prefixed (`E2E_<ts>_`) in every test:** users, locations, subscriptions and publications. Global teardown already cleans these up by prefix (`/test-support/cleanup`), so no new cleanup machinery is needed.
- **Location 9 (SJP) and other real courts:** tests may **read** them (e.g. check that `/summary-of-publications?locationId=9` renders or that a link points to it). They must **never upload a publication or create a subscription against them**, because pages such as `/summary-of-publications?locationId=9` assert explicitly on what is published there.

TEMPLATE SOURCE: n/a

## Decisions log (reviewed with the developer, 2026-11-06)

| # | Item | Decision |
|---|---|---|
| D1 | `publication-authorisation.spec.ts` | **Agreed:** use its own court. Location 9 is only legitimate for the SJP entry points hard-coded in the product (`account-home/index.njk:22` tile, `view-option/index.ts:42` redirect), and those specs (`account-home`, `view-option`) stay read-only on 9. |
| D2 | `api/blob-ingestion`, `api/flat-file-ingestion`, `api/pdda-html-s3-upload` | **Agreed:** `MANUAL_UPLOAD` cases use an own court as `x-court-id`. SNL resolution cases use **option A**: test-support `POST /locations` accepts `locationReferences`, the test creates its own court with an SNL reference and asserts the resolved `locationId` equals its own court. |
| D3 | `system-admin/reference-data-upload.spec.ts` | **Agreed:** build every CSV at runtime (prefixed names, random unused IDs in 80000–89999, unique SNL provenance IDs); stop reading `fixtures/test-reference-data.csv`. Prefixing of the Add Jurisdiction/Sub-Jurisdiction/Region names and the cleanup extension are **deferred to clarification 2**. |
| D4 | `system-admin/blob-explorer.spec.ts` | **Agreed:** own court plus own uploaded publication; open own row and own artefact; remove the `if (count > 0)` guards; never click "Re-submit subscription". |
| D5 | `admin/manual-upload.spec.ts`, `admin/non-strategic-upload.spec.ts` | **Agreed:** keep using the seeded list types, but select by option **label** instead of the numeric `list_type.id` (which is autoincrement and differs per environment). |
| D6 | `admin/non-strategic-upload.spec.ts` | **Confirmed:** it already uses its own court (`beforeAll` → `createUniqueTestLocation()` at line 332; every upload/subscription uses `testLocationId`). The `"9"` is the **list type** option value, at 5 lines: 381, 426, 455, 805, 838. Only those 5 lines change (label selection, per D5). |
| D7 | `verified-user/email-subscriptions.spec.ts` | **Agreed (option A):** upload a real `CIVIL_DAILY_CAUSE_LIST` JSON payload with the prefixed case number/name through `uploadTestPublication()` instead of `createTestArtefact()`. Before uploading, check through test-support that the list type has a `list_search_config`, and fail fast with a clear message if not. Ingestion only extracts case search data when that config exists (`libs/publication/src/artefact-search-extractor.ts:143-160`). The config is an environment prerequisite set once through the "Configure list type" UI; the test never writes it. Also remove the `list_search_config` upsert from test-support `createTestArtefact` (`artefacts.ts:55-67`), which today silently writes a config for a real list type that teardown never removes. Add the missing `civil-daily-cause-list.json` fixture to `e2e-tests/fixtures/list-types/`. |
| D9 | `system-admin/manage-list-types.spec.ts`, `system-admin/reference-data-management.spec.ts`, reference-data rows in `reference-data-upload.spec.ts` (was clarification 2) | **Agreed:** fix in this ticket. Each test creates its own prefixed row and edits or deletes only that row; real jurisdictions, sub-jurisdictions, regions and list types are read-only. **manage-list-types:** the add test uses `prefixName("LIST_<testId>")` instead of `TEST_LIST_${Date.now()}` (line 47; `TEST_%` rows are never cleaned and are exempt from the deploy seed's soft-delete). Edit and delete tests create a prefixed list type in `beforeEach` via `createOrGetListType()` and open that row's Manage link, not `.first()`. Cleanup already deletes prefixed list types (`cleanup.ts:84-87`). **reference-data-management:** create uses `prefixName(...)` instead of "E2E Test Jurisdiction". Modify and delete (lines 127, 154) create a prefixed jurisdiction in `beforeEach` via `POST /test-support/jurisdictions` and act only on its row; a rename keeps the prefix. Location-jurisdiction update and delete (lines 198-252) create an own court, search for and select it, and drop the early `return`. **Cleanup:** `/test-support/cleanup` also deletes prefixed sub-jurisdictions, then jurisdictions, then regions, after locations (check cascade on the link tables), with a `cleanup.test.ts` case proving unprefixed rows are untouched. **reference-data-upload:** Add Jurisdiction, Sub-Jurisdiction and Region journeys (lines 139-813) use `prefixName(...)` instead of `Date.now()` names. |
| D10 | Verified-user login (was clarification 3) | **Agreed:** the CFT account is used to **log in** only by `cft-idam/cft-idam.spec.ts` (testing CFT login). Its email address is also used as the notification recipient (D11). Every other spec that needs a logged-in verified user creates its own prefixed user (`createTestUser()` with `generateTestEmail()`, role `VERIFIED`, a provenance chosen by the test) and logs in through a new test-only `POST /test-support/login` on the **web** app. That endpoint starts a real session with the same user shape the login callbacks produce. It's mounted only where test-support already is (`apps/web/src/app.ts:224`: `NODE_ENV !== "production"` or `ENABLE_TEST_SUPPORT=true`), with a unit test proving it isn't registered otherwise. E2E helper: `loginAsTestUser(page, user)`. Applies to `verified-user/email-subscriptions`, `bulk-unsubscribe`, `account-home`, `sjp-public-list` and `publication-authorisation` (which creates its own `CFT_IDAM`-provenance user to test provenance filtering). These specs then need no serial mode. If a journey happens to trigger an email to a prefixed address, the team key rejects it; that's acceptable because these specs don't check emails. Implementation must confirm that a rejected send doesn't break the journey. |
| D11 | Specs that **check the notified email** (team Notify key on staging and test) | **Agreed, limited to specs that assert on a delivered email:** `api/subscription-notifications` (line 127), `api/blob-ingestion-notifications` (line 119), plus the email-checking parts of `admin/manual-upload` (lines 373-374) and `admin/non-strategic-upload` (line 545). The team key only delivers to allowlisted addresses, and no dedicated test mailbox is planned, so these specs keep using the **CFT account's email address** (`CFT_VALID_TEST_ACCOUNT`) as the recipient. No login is involved. Add helper `createNotificationSubscriber()`: a test user with email `CFT_VALID_TEST_ACCOUNT` and a **prefixed `userProvenanceId`** (`prefixName("notify-<testId>")`), so each test still owns its user. `user.email` isn't unique (`base.prisma:49,61`), and emails are looked up by the test's own publication or notification ID (`notification-helpers.ts:73-116`), so sharing the address is parallel-safe. `/test-support/cleanup` also deletes users whose `userProvenanceId` starts with the prefix, with their subscriptions (unit test). This removes the manual cleanup in `manual-upload.spec.ts:362,434`. Specs that subscribe users but don't check the email use ordinary prefixed users. |
| D8 | Location 9 in global setup (was clarification 1) | **Agreed:** global seeding stays, but location 9 isn't test data. Remove the `9` row from `e2e-tests/fixtures/test-reference-data.csv`. Today `seedLocationData()` prefixes every row's name, `/test-support/seed-locations` upserts by ID and overwrites the name, and `/test-support/cleanup` deletes every location whose name starts with the prefix. So each run renames the real SJP court and then deletes it along with its artefacts. Also remove `seedSjpArtefacts()` (`seed-location-data.ts:53`), which publishes 4 test artefacts to the real court, and its check in `verify-seed-data.ts:85`. Once `publication-authorisation` moves to its own court (D1), no spec needs those artefacts; check during implementation that nothing else reads them. 9001–9010 keep their prefix, so teardown still removes them. |

## 1. What is already compliant

Verified spec by spec (44 specs):

| Area | Specs | Status |
|---|---|---|
| Own location via `createUniqueTestLocation()` (random ID 90000–99999, prefixed name) | summary-of-publications, courts-tribunals-list, search, flat-file-viewing, sjp-press-list, remove-publication, manual-upload, non-strategic-upload, subscription-notifications, blob-ingestion-notifications, bulk-unsubscribe, email-subscriptions, sjp-public-list, publication-authorisation (keyboard-nav test only) | Compliant |
| Own prefixed court via `createTestLocation` + `prefixName` | system-admin/delete-court | Compliant |
| Prefixed users (`generateTestEmail` / `prefixName`) | delete-court, user-management, media-application-management, third-party-user-management, manual-upload, non-strategic-upload, notification specs | Compliant |
| Publications uploaded to own court via `POST /publication` | summary-of-publications, sjp-press-list, sjp-public-list, subscription-notifications, blob-ingestion-notifications | Compliant |
| No test data needed (static pages, login, dashboards, validation-only) | 400-error-page, admin-dashboard, cookie-*, create-media-account, crime-idam, cft-idam, landing-page, language-toggle, page-structure, sign-in, sso, view-option, audit-log-viewer, configure-list-type, location-metadata, mi-report, system-admin-dashboard | No change |
| Reads location 9 only | verified-user/account-home (SJP link href + navigation) | Allowed under the scope above |

## 2. Remaining violations (what this ticket must change)

| # | Spec | Problem | Fix |
|---|---|---|---|
| 1 | `publication-authorisation.spec.ts` (D1) | Uploads a CLASSIFIED Civil and Family artefact to **location 9** (line 122). Its tests open `/summary-of-publications?locationId=9` directly and assert on the four publications global setup seeds there (Crown daily/firm PUBLIC, Civil PRIVATE, Civil and Family CLASSIFIED). It never uses the SJP tile or `view-option` redirect. | Each test (or describe) creates its own court and uploads its own PUBLIC / PRIVATE / CLASSIFIED publications with the same list types and provenances, then navigates to `/summary-of-publications?locationId=<own>`. Remove every `locationId=9`. |
| 2 | `api/blob-ingestion.spec.ts` (D2) | `MANUAL_UPLOAD` with `x-court-id: "1"` (real court) at line 11, asserted at line 82. SNL case at line 135 uses `9001`, resolved through the globally seeded `location_reference`. Hard-codes `http://localhost:3001` (line 4). | `beforeAll`: create an own court (with an SNL `locationReference`). `MANUAL_UPLOAD` headers use `String(court.locationId)`; SNL case posts the court's SNL source ID and asserts `body.locationId === String(court.locationId)`. Use the env API base URL. |
| 3 | `api/flat-file-ingestion.spec.ts` (D2) | Same as #2 (lines 10, 97, 123). | Same as #2. |
| 4 | `api/pdda-html-s3-upload.spec.ts` (D2) | `x-court-id: "1"` (lines 11, 102). The artefact isn't persisted but HTML files go to S3 under court 1. | Use an own court. S3 objects remain uncleaned (accepted gap). |
| 5 | `admin/manual-upload.spec.ts` (D5) | `selectOption('select[name="listType"]', "1" / "6" / "7" / "8")`. Option values are `listType.id` (`apps/web/src/pages/(admin)/manual-upload/index.ts:16`), an autoincrement that differs per environment. | `selectOption('select[name="listType"]', { label: "<friendly name>" })` using the seeded list types. |
| 6 | `admin/non-strategic-upload.spec.ts` (D5, D6) | `selectOption(..., "9")` ×5 (lines 381, 426, 455, 805, 838). The court is already test-created. | Same as #5. |
| 7 | `verified-user/email-subscriptions.spec.ts` (D7) | The case-subscription publication is inserted with `createTestArtefact` (lines 36-48) instead of being uploaded, and the `caseNumber`/`caseName` inputs make test-support upsert a `list_search_config` for the real `CIVIL_DAILY_CAUSE_LIST`. | Upload via `uploadTestPublication()` to the test's own court, with a prefixed case in the payload; fail fast if the list type has no search config. |
| 7a | `e2e-tests/fixtures/test-reference-data.csv`, `e2e-tests/utils/seed-location-data.ts`, `e2e-tests/utils/verify-seed-data.ts` (D8) | Row `9` makes global setup rename the real SJP court with the run prefix, so teardown deletes it. `seedSjpArtefacts()` publishes test artefacts to the real court. | Drop the `9` row, `seedSjpArtefacts()` and its verification check. |
| 8 | `system-admin/reference-data-upload.spec.ts` (D3) | `validCsvContent` is the global fixture `test-reference-data.csv` (IDs 9001–9010 **and 9**, unprefixed names). Four tests confirm the upload (lines 1976, 1990, 2005, 2013), and `upsertLocations()` then renames those rows and replaces their sub-jurisdiction, region and location-reference links. This **renames the real SJP court 9 to "Test SJP Court"** and strips the prefix from the seeded 9001–9010, so teardown no longer deletes them. | Add `buildLocationCsv(rows, overrides?)`: names `prefixName("Ref Upload Court <testId>-<n>")`, IDs random in 80000–89999 (separate from `createUniqueTestLocation`'s 90000–99999) and checked unused through test-support, existing sub-jurisdiction/region names, SNL provenance ID unique per row. Use it for every CSV, including the validation-only ones (lines 116, 121, 1814, 1909); line 1757 asserts the generated ID. |
| 9 | `system-admin/blob-explorer.spec.ts` (D4) | Clicks `.first()` location and `.first()` artefact, i.e. real data, inside `if (count > 0)` guards (around lines 51 and 77), so it can pass without testing anything. | `beforeAll`: create an own court and upload a JSON publication with `uploadTestPublication()`. Open the court's row by name and the artefact by its `artefactId`. Remove both guards. Assert "Re-submit subscription" is visible but never click it (it sends notifications). |

### Also flagged: tests that modify existing (non-test) data

These are outside the four dynamic entity types, but they change shared data on a long-lived environment:

| # | Spec | Problem | Recommended fix |
|---|---|---|---|
| 10 | `system-admin/reference-data-management.spec.ts` | Renames ("Updated E2E Name") and **deletes the first jurisdiction in the list**, which is real reference data. Creates the unprefixed "E2E Test Jurisdiction". | Create a prefixed jurisdiction in the test, then modify and delete only that row. |
| 11 | `system-admin/manage-list-types.spec.ts` | Edit and delete tests act on the **first list type in the table**, i.e. a real list type. The create test uses an unprefixed `TEST_LIST_*` name that teardown never removes. | Create a prefixed list type in the test and edit/delete only that one. |

### Helper issue

| # | Where | Problem | Fix |
|---|---|---|---|
| 14 | `libs/test-support/src/routes/test-support/locations.ts` (D2) | `buildLocationCreateData()` creates only region and sub-jurisdiction links, so a test can't own a `location_reference` for SNL resolution. | Accept optional `locationReferences: [{ provenance, provenanceLocationId, provenanceLocationType }]`; pass it through `createTestLocation()` / `createUniqueTestLocation()`. Default the SNL source ID to `String(locationId)`. Rows cascade-delete with the location, so cleanup is unchanged. Add a unit test. |
| 12 | `libs/test-support/src/routes/test-support/list-types.ts:19` | `getListTypeByName()` uses `contains` + `findFirst`, so `"CIVIL_DAILY_CAUSE_LIST"` can return the globally seeded `E2E_<ts>_CIVIL_DAILY_CAUSE_LIST`, or another run's copy, instead of the real list type. | Exact match on `name`. Update `list-types.test.ts`. |
| 13 | 5 specs | Near-identical inline `POST /publication` helpers (summary-of-publications, sjp-press-list, sjp-public-list, subscription-notifications, blob-ingestion-notifications). Fixes #1–#4 and #7 would add more. | Add one `uploadTestPublication({ locationId, listTypeName, sensitivity, language, payload })` in `e2e-tests/utils/` and use it everywhere. |

### Shared CFT verified-user account (superseded by D10 and D11)

`CFT_VALID_TEST_ACCOUNT` is a single external IDAM user, used by 12 specs under `fullyParallel: true`: 8 log in with it, and 4 only use its email address as a notification recipient. The serial-mode approach below is **replaced** by D10 (test-created users and test-only login) and D11 (CFT account's email as the notification recipient, with prefixed users). The specs already subscribe only to their own courts. But `bulk-unsubscribe` and `email-subscriptions` operate on that user's subscription dashboard, which shows every row created by parallel tests. That is the likely source of the intermittent `bulk-unsubscribe` failure. The user can't be made dynamic (it lives in IDAM), so:

- every assertion and checkbox selection must be scoped to the test's own court names, not `.first()` or counts; and
- the specs that log in as this user should run serially (a dedicated Playwright project, or `test.describe.configure({ mode: "serial" })`).

## 3. Error handling & edge cases

- A test that fails midway leaves its prefixed data behind. Teardown removes it by prefix, so no per-test cleanup is required beyond what exists.
- The random location ID can collide with another run's location. The `POST /test-support/locations` endpoint already retries on a clash.
- A non-existent location ID (for 404 / no-match tests) must be random and not present in the DB, not a fixed small number.

## 4. Acceptance criteria mapping (revised)

| AC | How it's met |
|---|---|
| No spec uploads to or subscribes against a location it didn't create | Fixes #1–#4, #8, #9; grep check for `locationId: "9"`, `x-court-id": "1"`, `9001` in `e2e-tests/tests` |
| No spec selects or filters list types by numeric ID | Fixes #5, #6, #12 |
| Users, locations, subscriptions and publications are created per test with the prefix | Section 1 plus the fixes above |
| Publications in subscription and notification journeys use `POST /publication` | Fix #7, #13 |
| Suite is parallel-safe | Shared CFT account handling (section 2) |
| Rule documented | `.claude/rules/e2e-testing.md` section |

Global-setup ACs from the original ticket (no location/reference-data seeding) are **out of scope** by agreement.

## 5. Test scenarios

One journey per spec stays as it is; the changes are to data setup. Verification:

1. `publication-authorisation`: on an own court with PUBLIC, PRIVATE and CLASSIFIED uploads, an unauthenticated user sees PUBLIC only and is denied CLASSIFIED; Welsh check stays inline.
2. `api/*-ingestion`: publish to an own court returns 201 and the artefact's `locationId` matches; the no-match case uses a random unused ID.
3. `manual-upload` / `non-strategic-upload`: upload journeys pass with list types resolved by name.
4. `email-subscriptions` / `bulk-unsubscribe`: pass 3× consecutively on preview with `workers: 4` and no retries.
5. `reference-data-management` / `manage-list-types`: create, modify and delete a prefixed row; real rows are untouched.
6. `blob-explorer`: the test's own court and publication appear and open.
7. `test-support` unit test: `GET /list-types?name=X` returns only an exact match.

## CLARIFICATIONS NEEDED

1. ~~Global seeding and location 9.~~ **Resolved: see D8.**
2. Should items #10 and #11 (reference-data-management and manage-list-types changing real rows) be fixed in this ticket? **Also decide here (carried over from D3):** the Add Jurisdiction/Sub-Jurisdiction/Region flows in `reference-data-upload.spec.ts` (lines 139–813) name rows with `Date.now()`, not the run prefix, so every run leaves new reference-data rows behind. Fixing this needs `prefixName(...)` in those flows plus `/test-support/cleanup` deleting prefixed jurisdictions, sub-jurisdictions and regions.
3. ~~Shared CFT account.~~ **Resolved: see D10 and D11.**

## Status at end of 2026-11-06 (resume here)

Implementation done, uncommitted on `vibe-1030-Refactoring-of-end-to-end-tests`. Last full local E2E run: 258 passed / 26 failed, none caused by this branch (3 product a11y bug, 18 environment, 5 pre-existing).

Open decisions:
1. Accordion/label a11y template fix (`civil-and-family-daily-cause-list.njk:65,91,106`, `crown-daily-cause-list.njk:83,114`, same pattern in `civil-daily-cause-list.njk`, `magistrates-adult-court-list.njk`): this ticket or separate? Blocks 3 `publication-authorisation` tests.
2. `test.setTimeout` for the non-strategic-upload email test (~8 uploads × up to 60 s Notify wait).
3. Approve adding the "test data ownership" section to `.claude/rules/e2e-testing.md`.
4. After push: 3 preview passes with `workers: 4`; `CIVIL_DAILY_CAUSE_LIST` search config on preview and aat.
5. Then `/qk-review 1030`.
