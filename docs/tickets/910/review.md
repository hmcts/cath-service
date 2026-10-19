# Code Review: Issue #910

## Summary

This is a re-review. All three HIGH items from the previous review were looked at again. I checked each claimed fix myself rather than taking it on trust.

**Previous HIGH 1 (wrong exclusion reason for about 30 registry list types): resolved, by a different route than the one suggested.**

- The author did not correct the comment. Instead, all 31 regional and court variants can now be published as JSON, so no exclusion is needed.
- The 31 new `PACKAGE_ALIASES` entries are at `libs/list-types/common/src/validation/list-type-validator.ts:41-71`.
- I checked every alias key against `libs/list-types/common/src/list-type-data.ts`. Each one matches a seeded `name` after kebab-casing.
- I checked every target package. Each ships `src/schemas/*.json` and exports exactly one `validate*` function. The `export *` re-exports bring in no second `validate*` that `Object.keys(...).find(...)` could pick by mistake (`list-type-validator.ts:107`).
- Every target is already a dependency of `@hmcts/publication` (`libs/publication/package.json:22-66`), so it resolves in the same way as the existing aliases.
- **The case table now covers every registry entry, with no exclusions.**
  - I diffed the keys programmatically: all 67 `EMAIL_BUILDER_REGISTRY` keys and all 71 `PDF_GENERATOR_REGISTRY` keys have a row in `EMAIL_LINK_CASES`.
  - The four SJP types are the extra rows on top of the 67.
  - The exclusion comment is gone.
- **The `pdfAndExcel` / `pdfOnly` split for the new rows is correct.** I traced each one to `EXCEL_GENERATOR_REGISTRY` (`libs/publication/src/processing/service.ts:393-472`).
  - SSCS uses `createUploadedExcelGenerator(..., generateFromJson)`, so it gets an Excel from JSON.
  - RCJ standard and London Administrative Court have no JSON fallback, so they get a PDF only.
  - The four regional administrative-court types and SIAC/POAC/PAAC, FTT RPT and UT are not in the Excel registry, so they get a PDF only.
- **This is a deliberate production behaviour change and needs product sign-off.** It is not a defect. See Suggestion 1.

**Previous HIGH 2 (e2e not run): mostly resolved.**

- I re-ran `tests/api/subscription-notifications.spec.ts` myself against the running local stack, using the real Notify key: **76 passed in 2.8m**.
  - That includes all 24 `@nightly` cases, all 31 new variant rows, and the Excel-only case.
  - None were skipped, so the Notify read-back really ran.
- I did not re-run the full suite. The reported local run was 104 passed, 0 failed, 30 skipped. I confirmed the 30 skips are hard-coded `.skip` calls already present before this branch.
- **What remains is the CI PR gate** (HIGH 1). Untagged tests in this spec have gone from 1 at `HEAD` to 52. CI runs against a deployed environment with 4 workers, 2 retries and a 15-minute job cap. None of that has been measured.

**Previous HIGH 3 (Notify template UUIDs): resolved for the environments that exist.**

- The author verified all four template ids through the Notify API with the local key. I did not read `.env`.
- The id values match across `apps/api/helm/values.yaml:10-15`, `apps/api/helm/values.dev.yaml:20-25` and `apps/web/helm/values.yaml:39-44`.
- The `SUBSCRIPTION`, `PDF_ONLY` and `PDF_EXCEL` ids were already deployed at `HEAD`, and template ids are unique to a Notify service. So the deployed key almost certainly points at the same service that holds `e03108e1-…`.
- CLAUDE.md says there is currently no prod deployment. The first CI e2e run will prove the AAT/preview case. I have downgraded this to a suggestion.

**New: the `test-support` locations fix is sound, but belongs in its own commit** (Suggestion 2).

- I reviewed `libs/test-support/src/routes/test-support/locations.ts:46-134`. It now does create-with-retry on P2002 for generated ids, and keeps upsert for explicit ids.
- Its tests (`locations.test.ts:220-263`) cover the retry, retry exhaustion and non-P2002 paths. `locations.ts` has 100% statement and branch coverage.
- The same applies to the `userProvenanceId: e2e-${randomUUID()}` parallel-collision fix in `e2e-tests/utils/notification-helpers.ts:40`, which this round's summary did not mention.

**No other production code has changed since the last review.** The 2 MB predicate, template routing and dead-flag removal are as previously approved.

There are no UI changes, so WCAG and GOV.UK component checks do not apply.

**Automated checks I ran in this review:**

- Unit tests and coverage in all 33 changed library workspaces: all green.
- `tsc --noEmit` on `libs/list-types/common` and `libs/test-support`: clean.
- `apps/web/helm/values.yaml.test.ts`: 7 tests passed.
- Biome on the changed e2e, validator and test-support files: one warning, the unused `WEB_BASE_URL` at `e2e-tests/utils/test-support-api.ts:4`. It is already present at `HEAD`.

## 🚨 CRITICAL Issues

None.

## ⚠️ HIGH PRIORITY Issues

1. **The PR-gate runtime in CI is unmeasured, and the gate has grown sharply (AC "`yarn test:e2e` passes" is only partly met)**
   - **Where:**
     - `e2e-tests/tests/api/subscription-notifications.spec.ts:233-264` (the loop) and `e2e-tests/utils/list-type-email-cases.ts:31-110` (48 untagged rows).
     - `e2e-tests/playwright.config.ts:30-31` (CI uses `retries: 2` and `workers: 4`).
     - `.github/workflows/job.e2e-test.yml:21` (`timeout-minutes: 15`).
   - **Problem:** At `HEAD` this spec had 1 untagged test. It now has 52 (`playwright test --list`: 76 total, 24 `@nightly`). 48 of them wait for a Puppeteer PDF and a Notify send before they finish.
     - Locally the whole suite took 2.1m with 7 workers, against a warm local stack.
     - CI is different in three ways that bear directly on this change:
       - It runs against freshly deployed pods, with Puppeteer cold starts. The ticket estimates 40-60s for a cold start.
       - It uses 4 workers.
       - It retries each failure twice, inside the same 15-minute job, which also covers dependency install and the Playwright browser install.
     - This deployed environment will also be the first to run these 52 tests, and the first to receive the three new helm template ids.
   - **Impact:** If the job hits the 15-minute cap, every PR's e2e gate fails or flakes. The ticket asks for exactly this check: "If total runtime proves unacceptable, split".
   - **Solution:**
     - Let the first CI run on the PR finish and record how long the e2e step takes.
     - If it is close to the cap, add `nightly()` to all but one row per generator family. The helper already exists (`list-type-email-cases.ts:157-159`), and the variant rows already use it.
     - Record the measured time in `tasks.md:48`.

## 💡 SUGGESTIONS

1. **Say in the PR that JSON publishing for the 31 variants is a production behaviour change, and get product sign-off.**
   - These list types now accept JSON through `POST /publication` (`libs/api/src/blob-ingestion/validation.ts:115`) and through admin manual upload (`libs/admin-pages/src/manual-upload/validation.ts:67`). Before this change, both rejected them with "No JSON schema available".
   - Three behaviours are worth stating explicitly, because a JSON upload does not behave the same as the existing Excel route:
     - **Different email for the same list type.** RCJ standard and London Administrative Court subscribers get a PDF-only email (`NON_SJP_PDF`) for a JSON publication. They get a PDF plus Excel email for an Excel upload. The uploaded-Excel generators have no JSON fallback (`service.ts:393-401`, `:418`).
     - **The JSON schemas are looser than the Excel converters.**
       - The converters require at least one row (`minRows: 1`, for example `libs/list-types/sscs-daily-hearing-list/src/conversion/sscs-config.ts:60`). The schemas have no `minItems`. `POST /publication` still rejects `[]` (`blob-ingestion/validation.ts:141-148`), but admin manual upload does not.
       - `validateTimeFormat` enforces hours 1-12 (`libs/list-types/common/src/conversion/validators.ts:25-27`). The RCJ schema pattern `^\d{1,2}([:.]\d{2})?[ap]m\s*$` accepts `99am`.
       - The HTML-tag restriction is carried over correctly. Every string field has the `<[^>]+>` negative-lookahead pattern.
   - None of these is a defect in #910, but the sign-off should cover them.
2. **Commit the locations fix and `userProvenanceId` separately from #910**, as intended.
   - The locations fix is correct.
     - Previously, an upsert on a random id in 90000-99998 could silently rename another test's location, or a seeded one.
     - Now a clash retries with a new id, up to 5 times (`locations.ts:95-105`).
   - Two small points if you touch it again:
     - `isUniqueConstraintViolation` (`:132-134`) treats any P2002 as an id clash. `name` and `welsh_name` are also `@unique` (`libs/postgres-prisma/prisma/schema/location.prisma`), so a duplicate name burns 5 pointless retries before returning 500. Checking `error.meta?.target` for `location_id`, or using `Prisma.PrismaClientKnownRequestError`, would make the intent exact.
     - The retry test adds one more `as any` (`locations.test.ts:226`). The file already had six, so this is in keeping with it, but `as never` would be better.
   - `userProvenanceId` (`notification-helpers.ts:38-40`) is a genuine fix for parallel workers. It is also outside the ticket's scope.
3. **Unit coverage of the new aliases is a sample, not the full set.** `list-type-validator.test.ts` checks 8 of the 31 new aliases (one per package, plus the three UT types). The e2e table covers all 31, and every one passed in my run, so they are proven to resolve. A cheaper and permanent guard would be a unit test that iterates `listTypeData` and asserts each name resolves to a package exporting a `validate*` function. Any list type that should reject JSON would go in an explicit allow-list. That would catch a typo in a future alias without needing Notify. Do not export `PACKAGE_ALIASES` to do this.
4. **`PACKAGE_ALIASES` now has 46 entries hand-maintained apart from `list-type-data.ts`.** A `schemaPackage` field on each `listTypeData` entry would keep "which schema does this type use" next to the type's definition, which is already the single source of truth. This is out of scope for #910 and worth a follow-up ticket.
5. **The ticket docs still contradict the code (carried over, now further out of date):**
   - `docs/tickets/910/plan.md:222` and `:239` still call `SJP_EXCEL_ONLY` "unreachable end to end".
   - `plan.md:187` and `tasks.md:34` say "13 + 58" rows. The table now has 20 `pdfAndExcel` and 51 `pdfOnly` rows: SSCS moved into `pdfAndExcel`, and 23 rows are `@nightly`.
   - `tasks.md:8` still says "accept unit-only coverage for `SJP_EXCEL_ONLY`".
   - `tasks.md:40` still says the oversize case asserts "`.pdf` and `.xlsx` stored". The code asserts `.pdf` is absent (`subscription-notifications.spec.ts:333`).
   - `tasks.md:47-48` still records "43 + 1 nightly" and "full `yarn test:e2e` suite not run". There is no task line for the PACKAGE_ALIASES work.
6. **The gate constants still have no sync pointer (partly done).** `PDF_PAYLOAD_GATE_BYTES` now has a comment naming `MAX_PDF_PAYLOAD_KB` (`list-type-email-cases.ts:9-10`). Neither it nor `NOTIFY_ATTACHMENT_LIMIT_BYTES` (`:8`) points to the code it mirrors: `libs/publication/src/processing/payload-limits.ts`, `apps/api/helm/values.yaml:17` and `libs/notifications/src/govnotify/template-config.ts:11`.
7. **The oversize test still has no payload precondition** (`subscription-notifications.spec.ts:323`), unlike the Excel-only test (`:293-294`). This is carried over.
8. **Out-of-scope test additions (carried over).** These are unrelated to #910:
   - The untracked `src/conversion/*-config.test.ts` files in `ftt-tax-chamber`, `grc`, `pht`, `utiac-statutory-appeal` and `wpafcc`.
   - The extra renderer and locale tests in several `pdf-generator.test.ts` files.
9. **Small test hygiene items (carried over):**
   - New `as any` at `libs/notifications/src/notification/notification-service.test.ts:400` in the boundary tests.
   - `importOriginal` awaited twice (`:35-37`).
   - The constant asserted twice: `notification-service.test.ts:412` and `template-config.test.ts:116`.
10. **Dead plumbing (carried over):**
    - `ProcessPublicationResult.pdfSizeBytes` (`service.ts:672`) is only read by a unit test.
    - `event.excelPath` is never read on the notification path.
    - `listTypeHasExcel` is exported from `@hmcts/publication` (`libs/publication/src/index.ts:19`) and has no consumer.
11. **Generated blobs are never cleaned up** (`subscription-notifications.spec.ts:154-169`). There are now about 95 files per full run, including a 3.1 MB Excel. This is carried over.
12. **Non-null assertion on `process.env.CFT_VALID_TEST_ACCOUNT!`** (`subscription-notifications.spec.ts:126`, `:172`). Carried over.
13. **Confirm the production Notify service once a prod pipeline exists.** Today's evidence: the ids exist in the local key's service, and three of the six were already deployed. Add a check when prod Key Vault wiring is introduced.

## ✅ Positive Feedback

- **HIGH 1 was fixed at the root.** The author did not just reword the exclusion comment; they removed the gap.
  - All 71 list types now have a real Notify read-back, and I confirmed this by diffing the keys.
  - Each variant row is honest about what it generates, and the comment at `list-type-email-cases.ts:56` explains why RCJ and London Administrative Court get no Excel from JSON.
- **The PR-gate split is principled.** Every package keeps one row in the gate, and only variants that differ just in name go to `@nightly` (`list-type-email-cases.ts:23-25`).
- **The fixtures are exact copies of each package's `VALID_DATA`.** I spot-checked RCJ and SSCS. Each copy is proven twice: by the package's validator test, and by a 201 from the real API.
- **The locations fix has a narrow, well-explained scope.**
  - Explicit ids keep their reset-the-fixture upsert behaviour.
  - Generated ids can no longer overwrite another location.
  - The comments explain *why* (`locations.ts:46`, `:94`), not what.
  - Module ordering follows CLAUDE.md: constants, exports, then helpers in order of use.
- **No numeric `listTypeId` comparisons were introduced.** Every new routing key is a `listTypeName` string. `validateListTypeJson` still takes an id, but only to look up the name in a list it is given, which existing code already did.
- The earlier positive findings still stand: the single 2 MB predicate, buffers withheld on `NO_LINKS`, exact distinct-link counting, hard failures instead of soft guards, and generation proven before links are counted.

## Test Coverage Assessment

- **Unit tests:** I re-ran all 33 changed library workspaces in this review, and all pass. For example:
  - notifications: 92 tests
  - publication: 489 tests
  - list-types-common: 351 tests, up from 343 thanks to the 8 new alias cases
  - test-support: 210 tests
- **E2E tests:** I ran `subscription-notifications.spec.ts` myself against the running local stack with real Notify: **76/76 passed (2.8m)**.
  - All four template branches are exercised against real email bodies:
    - PDF+Excel: 20 rows.
    - PDF-only (`NON_SJP_PDF`): 51 rows.
    - Excel-only: `:287-312`.
    - `NO_LINKS`: flat file at `:266-285` and oversize at `:314-337`.
  - The full suite (104 passed, 0 failed, 30 skipped) was reported from this session. I did not re-run it. The CI gate has not been run (HIGH 1).
  - Having one case per list type departs from CLAUDE.md's minimal-journey rule. The ticket asks for it, and each package row exercises a distinct generator and template pair, so it is justified.
- **Accessibility tests:** Not applicable. There are no UI or template changes.
- **Statement coverage per changed workspace.** Every figure was re-measured in this review, none carried over, using `npx vitest run --coverage --coverage.reporter=text-summary --coverage.include='src/**' --coverage.exclude='**/*.test.ts'` in each workspace:
  - libs/notifications: 90.62%
  - libs/publication: 95.36%
  - libs/list-types/common: 93.89%
  - libs/test-support: 88.37% (`locations.ts` alone: 100% statements and branches)
  - libs/list-types/care-standards-tribunal-weekly-hearing-list: 84.21%
  - libs/list-types/civil-and-family-daily-cause-list: 95.65%
  - libs/list-types/cop-daily-cause-list: 92.15%
  - libs/list-types/court-of-appeal-civil-daily-cause-list: 94.44%
  - libs/list-types/crown-advanced-pdda-list: 90.75%
  - libs/list-types/crown-daily-list: 92.40%
  - libs/list-types/crown-firm-list: 92.92%
  - libs/list-types/daily-cause-list-common: 92.59%
  - libs/list-types/et-daily-list: 95.12%
  - libs/list-types/et-fortnightly-list: 94.33%
  - libs/list-types/ftt-lands-registration-tribunal-weekly-hearing-list: 82.14%
  - libs/list-types/ftt-rpt-weekly-hearing-list: 82.22%
  - libs/list-types/ftt-tax-chamber-weekly-hearing-list: 100%
  - libs/list-types/grc-weekly-hearing-list: 100%
  - libs/list-types/iac-daily-list: 92.92%
  - libs/list-types/magistrates-public-adult-court-list: 92.75%
  - libs/list-types/magistrates-public-list: 96.42%
  - libs/list-types/pht-weekly-hearing-list: 83.87%
  - libs/list-types/rcj-standard-daily-cause-list: 95.23%
  - libs/list-types/siac-poac-paac-weekly-hearing-list: 80.64% (just above the threshold)
  - libs/list-types/sjp-press-list: 85.71%
  - libs/list-types/sjp-public-list: 86.66%
  - libs/list-types/sscs-daily-hearing-list: 100%
  - libs/list-types/upper-tribunal-administrative-appeals-chamber-daily-hearing-list: 100%
  - libs/list-types/upper-tribunal-lands-chamber-daily-hearing-list: 100%
  - libs/list-types/upper-tribunal-tax-and-chancery-chamber-daily-hearing-list: 100%
  - libs/list-types/utiac-jr-daily-hearing-list: 90.58%
  - libs/list-types/utiac-statutory-appeal-daily-hearing-list: 100%
  - libs/list-types/wpafcc-weekly-hearing-list: 100%
  - e2e-tests and apps/* (helm and `.env.example` only): no unit coverage to measure. The helm values test passes.

  No workspace is below 80%.

## Acceptance Criteria Verification

- [x] `assertEmailDownloadLinks(govNotifyId, expectedLinkCount)` exists in `notification-helpers.ts`, with `GOVUK_NOTIFY_DOCUMENT_LINK_PATTERN` relocated there.
  - Evidence: `e2e-tests/utils/notification-helpers.ts:17`, `:107-114`.
  - The spec-local copy in `e2e-tests/tests/admin/non-strategic-upload.spec.ts` is removed, and that spec calls the helper at `:154`.
- [x] The notification test is data-driven over a table of list-type cases, and adding a list type needs one table row plus a payload builder.
  - Evidence: the table at `e2e-tests/utils/list-type-email-cases.ts:31-110`, the row builders at `:134-140`, and the loop at `e2e-tests/tests/api/subscription-notifications.spec.ts:233-264`.
  - The 31 new rows were added in exactly that way: one row each, plus one fixture per new package.
- [x] All four template branches in the table above are covered with their expected link counts.
  - PDF+Excel, 2 links: `list-type-email-cases.ts:33-54`.
  - NON_SJP_PDF, 1 link: `:57-109`.
  - SJP_EXCEL_ONLY, 1 link: `subscription-notifications.spec.ts:287-312`.
  - NO_LINKS, 0 links: `:266-285` and `:314-337`.
  - All ran green against real Notify in my run (76/76).
- [x] Every list type in `EMAIL_BUILDER_REGISTRY` has a case, or a documented reason it is excluded.
  - All 67 registry keys have a row. I diffed them programmatically against `libs/notifications/src/notification/notification-service.ts:139-345`.
  - There are no exclusions, made possible by the aliases at `libs/list-types/common/src/validation/list-type-validator.ts:41-71`.
- [x] The four soft `if (process.env.GOVUK_NOTIFY_API_KEY && ...)` guards are converted to `test.skip(...)`.
  - Evidence: `subscription-notifications.spec.ts:188`, `:237`, `:267`, `:288`, `:315`.
  - `grep "GOVUK_NOTIFY_API_KEY &&" e2e-tests` returns nothing.
- [x] `playwright.config.ts` forwards all six `GOVUK_NOTIFY_TEMPLATE_ID_*` vars, and `apps/web/.env.example` documents all six.
  - Evidence: `e2e-tests/playwright.config.ts:10-24`, `:62` and `apps/web/.env.example:67-72`.
- [x] The over-2 MB case asserts the file **was** generated and stored in blob storage while the email contains zero document links.
  - Evidence: `subscription-notifications.spec.ts:328-335`. The stored Excel is over 2 MB, and there are 0 links.
  - A PDF over 2 MB still being stored is covered at unit level in `libs/list-types/common/src/pdf/pdf-utilities.test.ts`, because the 256 KB payload gate stops such a PDF being produced from JSON.
- [x] A case pins the 2 MB boundary, and the storage and notification comparisons agree on it.
  - Evidence: `libs/notifications/src/notification/notification-service.test.ts:409-471` and `libs/notifications/src/govnotify/template-config.test.ts:113-133`.
  - The storage comparison is deleted (`libs/list-types/common/src/pdf/pdf-utilities.ts:29-38`).
- [x] `MAX_PDF_SIZE_BYTES` is defined once and imported, not duplicated.
  - Replaced by `MAX_NOTIFY_ATTACHMENT_SIZE_BYTES` at `libs/notifications/src/govnotify/template-config.ts:11`, used through `isWithinNotifyAttachmentLimit` at `notification-service.ts:514`.
  - `grep MAX_PDF_SIZE_BYTES` over `libs` and `apps` returns nothing outside `dist/`.
  - The e2e copy at `list-type-email-cases.ts:8` cannot import it (Suggestion 6).
- [x] `exceedsMaxSize` / `pdfExceedsMaxSize` is either consumed by the notification decision or removed.
  - Removed: `pdf-utilities.ts`, and `service.ts:101-112` and `:670-676`.
  - `grep exceedsMaxSize` over `libs` and `apps` returns nothing outside `dist/`.
- [x] Test data is cleaned up via the existing `afterEach` accumulator.
  - Evidence: `subscription-notifications.spec.ts:154-169`. Every test pushes to it through `subscribeTestAccount` (`:171-179`) and `testData.publicationIds.push`.
  - Teardown after my run deleted 100 records.
- [~] `yarn test:e2e` passes.
  - Done:
    - The changed spec passed 76/76 in my own run. That includes every PR-gate row it adds.
    - The reported full local run was 104 passed, 0 failed. The 30 skips are hard-coded `.skip` calls already present before this branch.
  - Missing: no run in the actual PR gate (HIGH 1).
  - **Why this is partial rather than met:** the AC is about the gate that blocks merges. CI differs from the local run in ways this change is sensitive to:
    - It runs against deployed pods with Puppeteer cold starts.
    - It uses 4 workers against 7 locally.
    - It retries failures twice inside a 15-minute job cap.
    - It is the first time a deployed environment receives the new template ids.

    Untagged tests in this spec went from 1 to 52, and nothing yet shows the gate stays within its cap.

**AC count:** 11 met, 1 partial, 0 unmet, out of 12.

## Next Steps

- [ ] Address critical issues (none)
- [ ] Fix high priority items:
  - Let the first CI run finish and record the e2e job duration against the 15-minute cap.
  - Move further variant rows to `nightly()` if it is close.
- [ ] Consider suggestions, especially:
  - Product sign-off on JSON publishing for the 31 variants, stated in the PR with the three behaviour differences.
  - Committing the locations and `userProvenanceId` fixes separately.
  - Bringing `plan.md` and `tasks.md` in line with the code.
  - A `listTypeData` to package resolution guard test.
- [ ] Re-run tests after fixes

## Overall Assessment

**NEEDS CHANGES**

This is close to approval. All three HIGH items from the previous review are resolved:

- **Registry exclusions:** fixed at the root. All 71 list types now have a real Notify read-back.
- **E2E run:** the spec is green. I re-ran it myself: 76/76 against real Notify.
- **Template UUIDs:** verified, with residual production risk only.

The new `PACKAGE_ALIASES` entries are correct, and the `pdfAndExcel` / `pdfOnly` expectations match the generator registry. The separate locations fix is sound. Every changed workspace is above 80% statement coverage.

The one thing left is the AC "`yarn test:e2e` passes" in CI. This change moves 51 Puppeteer- and Notify-bound tests into the PR gate, and that has not been measured against CI's 4-worker, 15-minute limit. A single green CI run with recorded timing would clear this to APPROVED.

The JSON-publishing change for the 31 variants is deliberate and not a defect. It still needs product sign-off, recorded in the PR. This verdict is advisory.
