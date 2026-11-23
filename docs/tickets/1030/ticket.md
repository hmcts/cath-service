# #1030: Refactoring of end to end tests

**State:** OPEN
**Assignees:** ashwini-mv
**Author:** junaidiqbalmoj
**Labels:** 
**Created:** 2026-09-11T15:07:17Z
**Updated:** 2026-11-05T09:38:35Z

## Description

## Summary

Refactor the Playwright E2E suite so that every test **creates the data it needs, runs against that data only, and has it cleaned up afterwards**. No test may read, modify or depend on existing courts, publications, subscriptions or reference data in the target environment.

Example: a subscription test must not upload a publication to an existing court. It should:

1. create its own test court (random location ID and a prefixed name),
2. create its own subscriber and subscribe them to that court,
3. upload a publication to that court through the publication API,
4. run the journey and assertions against that court, subscriber and publication,
5. leave the data for prefix-based cleanup in global teardown.

This is the model [`hmcts/pip-frontend`](https://github.com/hmcts/pip-frontend/tree/master/src/test/end-to-end) already uses. Until this is done we can't safely run E2E against a long-lived shared environment such as aat. That run is currently disabled (`workflow.main.yml` `e2e-stage` is `if: false`; #1004 was reverted by #1006), and it blocks #561.

## Reference: how pip-frontend does it

`src/test/end-to-end/shared/testingSupportApi.ts` and `shared/random-data.ts`:

| Concern | pip-frontend approach |
|---|---|
| Run isolation | One `TEST_SUITE_PREFIX` per run. Every created name or email starts with it. |
| Courts | `createLocation(randomData.getRandomLocationId(), TEST_SUITE_PREFIX + randomString())` is called **inside each scenario**. The location ID is random (10000-99999) and never fixed. |
| Users | `createTestUserAccount(firstName, surname, randomData.getRandomEmailAddress())` is called inside each scenario, so each test has its own subscriber. |
| Subscriptions | `createSubscription(locationId, locationName, userId)` is created by API for setup, or through the UI when the subscription is what's being tested. |
| Publications | `uploadPublication(sensitivity, locationId, contentDate, displayFrom, displayTo, language, mockFile, listType)` sends a `POST /publication` to the real ingestion endpoint with the standard `x-*` headers and a JSON mock from `shared/mocks/`. `uploadFlatFile(...)` does the same for flat files. |
| Cleanup | `functional.conf.ts` → `teardownAll()` → `clearTestData()`, which deletes publications, subscriptions, locations, accounts, media applications and third-party users **by prefix**. |
| Shared fixtures | Only the SSO admin accounts. Nothing else exists before the run. |

Example: `tests/verified/email-subscriptions-test.ts` creates its user, location and an `ET_DAILY_LIST` publication, logs in as that user, then subscribes, verifies and unsubscribes, all against data it owns.

## Current state in cath-service

Some of the groundwork is already in place: the test-support API (`libs/test-support/src/routes/test-support/`), the run prefix (`e2e-tests/utils/test-prefix.ts`), `createUniqueTestLocation()` (`e2e-tests/utils/dynamic-test-data.ts`) and prefix cleanup (`global-teardown.ts` → `/test-support/cleanup`). Today 15 of 44 specs create their own court. The problems below remain.

### 1. Global setup seeds fixed-ID locations, including a real court

`global-setup.ts` → `seedLocationData()` upserts the 10 rows in `e2e-tests/fixtures/test-reference-data.csv`, with **fixed IDs 9001-9010 and `9`**. It then seeds four artefacts against location `9`.

- Location `9` is the real **Single Justice Procedure** court (`libs/location/src/location-data.ts`). The upsert renames it to `E2E_<ts>_Test SJP Court`.
- Teardown deletes every location whose name starts with the prefix, together with its artefacts and `LOCATION_ID` subscriptions (`cleanup.ts`). On a shared environment, **one E2E run deletes the real SJP court and everything published or subscribed to it**.
- Fixed IDs collide between concurrent runs against the same database, so two runs overwrite each other's courts.

### 2. Global setup mutates reference data

`seedAllReferenceData()` upserts jurisdictions, sub-jurisdictions and regions. `regions.ts` also **deletes regions** that share a name with a seeded one but have a different ID, along with their `location_region` links. Reference data belongs to the deploy seed (`apps/postgres/prisma/generate-seed-sql.ts`). E2E must only read it.

### 3. Specs hard-code shared data

| Spec | Dependency |
|---|---|
| `publication-authorisation.spec.ts` | `locationId=9` (15 references), plus the artefacts seeded globally against it |
| `verified-user/account-home.spec.ts` | `/summary-of-publications?locationId=9` |
| `summary-of-publications.spec.ts` | Globally seeded data (2 references) |
| `api/blob-ingestion.spec.ts`, `api/flat-file-ingestion.spec.ts` | `court_id: "9001"` |
| `system-admin/reference-data-upload.spec.ts` | Uploads CSVs reusing IDs `9001…`, which overwrite the global fixtures other specs read |
| `admin/non-strategic-upload.spec.ts` | `selectOption('select[name="listType"]', "9")`, a **numeric `listTypeId`**, which breaks across environments (see CLAUDE.md → *List Type Implementation*) |

### 4. Shared verified-user account across parallel tests

`CFT_VALID_TEST_ACCOUNT` is a single IDAM user that the verified-user specs share (`email-subscriptions`, `bulk-unsubscribe`, `sjp-public-list`, `account-home`, `subscription-notifications`). The suite also runs with `fullyParallel: true` and 4 CI workers. Tests that add or remove subscriptions for the same user at the same time can see each other's rows. This probably explains the intermittent `bulk-unsubscribe.spec.ts` failure ("checkbox expected checked, received unchecked"; seen on the PR #1111 preview run).

### 5. Publications are inserted directly, not uploaded

Most specs create publications with `createTestArtefact()`, which writes rows straight to the database through test-support. That skips the real ingestion path: validation, search extraction, notification triggering and PDF/Excel generation. pip-frontend uploads through the real `POST /publication`. A few cath-service specs already do this (`api/blob-ingestion*.spec.ts`).

## Proposed approach

### Test data rules (apply to every spec)

- [ ] Each test creates its own court with `createUniqueTestLocation()`. Change it to generate a **random location ID** (pip-frontend uses 10000-99999; pick a range that can't clash with `location-data.ts`) instead of letting the API assign or reuse one.
- [ ] Each test that needs a subscriber creates its own user with a prefixed email (`generateTestEmail()`), and creates subscriptions for that user only.
- [ ] Each test uploads its own publication to its own court, and looks list types up **by name** (`getListTypeByName()`), never by numeric ID.
- [ ] No spec references a fixed location ID, location name, list type ID or artefact it didn't create. The only exception is a deliberately non-existent ID used for a 404 test (e.g. `locationId=999999999`).
- [ ] Specs stay parallel-safe: nothing is shared between tests apart from the SSO admin accounts and read-only reference data.

### Helpers (`e2e-tests/utils/`)

- [ ] Add `uploadTestPublication({ locationId, listTypeName, sensitivity, language, contentDate, displayFrom, displayTo, fixture })`. It posts to the real `POST /v1/publication` with an authenticated token and returns the `artefactId`. JSON payloads go in `e2e-tests/fixtures/publications/` (one per list type, like pip-frontend's `shared/mocks/`). Keep `createTestArtefact()` only for cases where the ingestion pipeline is deliberately out of scope, and document why at each call site.
- [ ] Add `createTestSubscriber({ locations, listTypes })`, which creates a prefixed user plus subscriptions and returns `{ userId, email, subscriptionIds }`.
- [ ] Optionally add a Playwright fixture (`test.extend`) that provides `testCourt` / `testSubscriber` per test, so specs don't repeat the setup code.

### Global setup and teardown

- [ ] Remove `seedLocationData()` and `fixtures/test-reference-data.csv`, together with the SJP artefacts seeded against location `9`.
- [ ] Remove `seedAllReferenceData()` from global setup. Read jurisdictions, sub-jurisdictions and regions from what the deploy seed created, and fail fast with a clear message if they're missing.
- [ ] Keep the test-prefix list types only if a test needs a list type that doesn't exist in `list-type-data.ts`. Otherwise use the real list types by name.
- [ ] Global setup should do nothing except generate the prefix and wait for health.
- [ ] Teardown keeps cleaning up by prefix. Also delete prefixed artefacts by `artefactId`/location, and blob or flat-file objects uploaded by the run, so failed runs don't leave files behind.
- [ ] Cleanup must only ever match on the run prefix. Add a test-support unit test proving it can't delete a location, user or subscription whose name or email lacks the prefix.

### Spec migration

Migrate every spec in section 3. Also review the specs that use `CFT_VALID_TEST_ACCOUNT` (section 4) and check that each one only asserts on subscriptions it created, or create a dedicated user where the login provider allows it. Specs that only render static pages (cookies, landing page, 400 page, etc.) need no data changes.

### Shared accounts

The SSO (system admin, CTSC admin, local admin, no-roles), CFT IDAM and Crime IDAM accounts live in external identity providers and stay fixed, as they are in pip-frontend. Tests may log in as them but must not rely on any state stored against them, such as existing subscriptions or audit entries, unless the test created that state itself.

## Acceptance criteria

- [ ] No spec or helper references location `9`, `9001-9010` or any other fixed location ID, apart from deliberate non-existent-ID tests.
- [ ] No spec selects or filters list types by numeric ID.
- [ ] Global setup doesn't create, update or delete locations, jurisdictions, sub-jurisdictions or regions.
- [ ] Running the suite against an environment whose data matches the deploy seed leaves that data **unchanged** afterwards. Verify by diffing `location`, `artefact`, `subscription`, `region`, `jurisdiction` and `sub_jurisdiction` row counts and IDs before and after a run on aat.
- [ ] Two suite runs started at the same time against the same environment both pass.
- [ ] The suite passes 3 consecutive times on preview with `workers: 4`, with no retries needed for `bulk-unsubscribe`, `email-subscriptions` or `publication-authorisation`.
- [ ] Publications in subscription and notification journeys are created through `POST /v1/publication`.
- [ ] `.claude/rules/e2e-testing.md` documents the "create your own court, subscriber and publication" rule and the new helpers.

## Out of scope

- Re-enabling the E2E stage on master. This is tracked by #561; this story unblocks it.
- Creating SSO, CFT IDAM or Crime IDAM accounts at runtime.

## Notes

- This story touches about 20 specs. Consider one PR for the helpers and global setup changes, then follow-up PRs grouped by area (`admin/`, `system-admin/`, `verified-user/`, `api/`). Keep the old seeding until the last spec stops using it.
- Separate issue found while investigating: the E2E job log prints the SSO, CFT IDAM and Crime IDAM test-account passwords and the GOV.UK Notify API key in plain text (the `env:` block of the publish-results step). They should be passed as masked secrets and rotated. Raise this separately.


## Comments

No comments on this issue.
