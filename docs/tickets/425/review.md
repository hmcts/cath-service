# Code Review: Issue #425 - UT Non-Strategic Publishing (UTCC, UTLC, UTAAC)

## Summary

Three new non-strategic list type modules have been implemented for Upper Tribunal Tax and Chancery Chamber (UTCC), Upper Tribunal Lands Chamber (UTLC), and Upper Tribunal Administrative Appeals Chamber (UTAAC). The implementation covers validation schemas, PDF templates, email summary builders, style guide pages, and all integration points. The structure follows the existing Care Standards Tribunal pattern closely.

The overall quality is acceptable. Most acceptance criteria are met. However, there are critical discrepancies between the plan/schema and the converter configs regarding which fields are required — these create a runtime mismatch that will allow invalid Excel files to pass converter validation while being rejected by JSON schema validation. There are also several code quality issues that need addressing.

---

## CRITICAL Issues

### 1. Converter configs mark `judges`, `members`, `hearingType`, and `venue` as optional, but schemas mark them as required

**Files:**
- `libs/list-types/upper-tribunal-tax-and-chancery-chamber-daily-hearing-list/src/conversion/utcc-config.ts` lines 26–46
- `libs/list-types/upper-tribunal-lands-chamber-daily-hearing-list/src/conversion/utlc-config.ts` lines 26–56
- `libs/list-types/upper-tribunal-administrative-appeals-chamber-daily-hearing-list/src/conversion/utaac-config.ts` lines 32–44

**Problem:** The JSON schemas for all three list types declare `judges`, `members`, `hearingType` (UTCC/UTLC), and `venue` as required fields. The converter configs mark all of these as `required: false`. This means an Excel file missing a required column will pass the Excel converter stage but fail JSON schema validation downstream. The plan explicitly states members is required and hearingType/venue are required for UTCC and UTLC.

For UTAAC specifically: `appellant` is `required: false` in the converter but is in the schema's `required` array. Similarly `modeOfHearing` is `required: false` in the converter but required in the schema.

**Impact:** Uploads that are missing required columns will succeed the Excel conversion step, produce partial JSON, then fail at the schema validation stage inside the page controller (or silently during processing), with no meaningful error message to the uploader.

**Solution:** Align `required: true` in each converter config field to match the JSON schema's `required` array:
- UTCC: Set `required: true` for `judges`, `members`, `hearingType`, `venue`
- UTLC: Set `required: true` for `judges`, `members`, `hearingType`, `venue`, `modeOfHearing`
- UTAAC: Set `required: true` for `appellant`, `judges`, `members`, `modeOfHearing`, `venue`

### 2. Email summary omits the `Date` field required by the ticket

**Files:**
- `libs/list-types/upper-tribunal-tax-and-chancery-chamber-daily-hearing-list/src/email-summary/summary-builder.ts` line 7
- `libs/list-types/upper-tribunal-lands-chamber-daily-hearing-list/src/email-summary/summary-builder.ts`
- `libs/list-types/upper-tribunal-administrative-appeals-chamber-daily-hearing-list/src/email-summary/summary-builder.ts`

**Problem:** The ticket acceptance criterion explicitly states: "The fields to be published for the email summary for all the lists are the Date, Time and Case Reference Number." All three `extractCaseSummary` functions only emit `Time` and `Case Reference Number`. The `Date` label is absent from every email summary.

The plan acknowledges this problem (open question 2) but the chosen resolution is option (b): omit Date and rely on the GOV.Notify template parameter. If the GOV.Notify template does not inject a date at the top of each case row in the email body, this will be non-compliant with the acceptance criterion.

**Impact:** Subscribers receive email notifications that do not match the specified format. This is a direct acceptance criterion failure.

**Solution:** Confirm with the team which approach is acceptable. If the GOV.Notify template already includes the publication date prominently at the top level of the email, document that as the deliberate decision and update the acceptance criterion. If not, the `SummaryExtractor` interface needs extending or a factory pattern is required. This must be resolved before go-live.

---

## HIGH PRIORITY Issues

### 3. Inline `<style>` block in all three page templates

**Files:**
- `libs/list-types/upper-tribunal-tax-and-chancery-chamber-daily-hearing-list/src/pages/upper-tribunal-tax-and-chancery-chamber-daily-hearing-list.njk` lines 3–10
- `libs/list-types/upper-tribunal-lands-chamber-daily-hearing-list/src/pages/upper-tribunal-lands-chamber-daily-hearing-list.njk` lines 3–10
- `libs/list-types/upper-tribunal-administrative-appeals-chamber-daily-hearing-list/src/pages/upper-tribunal-administrative-appeals-chamber-daily-hearing-list.njk` lines 3–10

**Problem:** All three templates override `{% block head %}` to inject an inline `<style>` block with a single `.back-to-top { margin-top: 40px; }` rule. The frontend rules explicitly prohibit inline styles. There is an `assets/css` path available for module-level styles, or a GOV.UK utility class (`govuk-!-margin-top-4` or similar) would suffice.

**Impact:** Violates the established CSS and GOV.UK standards pattern. Will be flagged by any CSP (Content Security Policy) header that disallows `unsafe-inline`. Also sets a bad precedent for future contributors.

**Solution:** Replace the inline style with a GOV.UK utility class directly on the element, e.g., `class="govuk-!-margin-top-6"` on the back-to-top `<div>`. Remove the `{% block head %}` override entirely.

### 4. `any` type usage in `non-strategic-upload/index.ts`

**File:** `libs/admin-pages/src/pages/non-strategic-upload/index.ts` lines 40–69

**Problem:** Multiple functions use `any` for parameters that can and should be typed:
- `hasValue(val: any)` — should be `unknown`
- `parseDateInput(body: any, ...)` — should use the Express `Request["body"]` type or a defined interface
- `transformDateFields(body: any)` — same issue
- `saveSession(session: any)` — should use the express-session `Session` type
- `selectOption(options: any[], ...)` — should use the typed option shape

**Impact:** Defeats TypeScript's purpose. Runtime errors from unexpected inputs will not be caught at compile time.

**Note:** This file is not exclusively introduced by this PR (it predates it) but was modified in this branch (side-effect imports were added at the top). The `any` usage should be addressed while the file is being touched.

**Solution:** Replace `any` with proper types. For `body`, define an interface matching the form fields. For `session`, import the session type. For the options array, define an `{ value: string; text: string }` interface.

### 5. `console.error` used directly instead of a structured logger

**Files:**
- All three `pages/index.ts` controllers (UTCC, UTLC, UTAAC), e.g., `libs/list-types/upper-tribunal-tax-and-chancery-chamber-daily-hearing-list/src/pages/index.ts` lines 53, 66, 96

**Problem:** `console.error` is used for all error logging. Production services should use the shared structured logger so that errors appear in log aggregation with consistent format, log level, and correlation IDs. The existing codebase uses a logger from `@hmcts/web-core` or similar.

**Impact:** Errors in production will be difficult to correlate and search. Stack traces from `console.error` can also unintentionally expose internal paths when the process runs in verbose mode.

**Solution:** Replace `console.error` with the project's standard logger import. Check how other page controllers handle logging (e.g., the CST module).

### 6. UTAAC schema marks `appellant` as required but the `UtaacHearing` TypeScript interface does not reflect this

**File:** `libs/list-types/upper-tribunal-administrative-appeals-chamber-daily-hearing-list/src/models/types.ts`

**Problem:** The `UtaacHearing` interface has `appellant: string` (required), but the UTAAC converter config sets `appellant` as `required: false`. If `appellant` is genuinely required in the schema (as the schema states), the converter must also enforce this. If it is optional (as the converter implies), the TypeScript interface must mark it as `appellant?: string` and the schema must remove it from the `required` array.

The spec says UTAAC fields include "Appellant" but does not explicitly state whether it is always present. The schema and converter are contradictory and need to be reconciled with the business.

**Impact:** Silent data corruption — missing appellant data passes the converter but may fail schema validation or render empty cells.

### 7. `models/types.ts` files violate the naming convention

**Files:**
- `libs/list-types/upper-tribunal-tax-and-chancery-chamber-daily-hearing-list/src/models/types.ts`
- `libs/list-types/upper-tribunal-lands-chamber-daily-hearing-list/src/models/types.ts`
- `libs/list-types/upper-tribunal-administrative-appeals-chamber-daily-hearing-list/src/models/types.ts`

**Problem:** `CLAUDE.md` explicitly states: "Don't create types.ts files — Colocate types with the appropriate code." These files each contain only the hearing interface and list type alias, which should be defined in the file where they are first used — the converter config or the renderer.

**Impact:** Minor violation of project conventions but signals disregard for the stated guidelines.

**Solution:** Move `UtccHearing` / `UtccHearingList` (and equivalents) to the relevant source file (e.g., `rendering/renderer.ts` or the conversion config), remove the `models/` directory, and update all imports.

---

## SUGGESTIONS

### 8. The renderer is a trivial pass-through and adds no value

**Files:**
- `libs/list-types/upper-tribunal-tax-and-chancery-chamber-daily-hearing-list/src/rendering/renderer.ts` lines 26–45

The `renderUtccDailyHearingListData` function maps hearing fields to an identical object (field for field, no transformation) and formats two date strings. The date formatting is the only real work done. All three renderers are identical in structure. This could reasonably be a shared utility in `@hmcts/list-types-common` that accepts a hearing list as `unknown[]`, a date formatter call, and options, rather than being replicated three times.

This is acceptable for now given the pattern follows CST, but worth flagging for future refactor.

### 9. The page controller reads from the local filesystem (`storage/temp/uploads`)

**Files:** All three `pages/index.ts` controllers, e.g., `libs/list-types/upper-tribunal-tax-and-chancery-chamber-daily-hearing-list/src/pages/index.ts` lines 14–17

The `TEMP_UPLOAD_DIR` is resolved relative to `__dirname` with five levels of `..`. This is fragile — it assumes the module is always at a fixed depth in the monorepo. If the module is built and run from `dist/`, the path will be wrong. This is the same pattern as CST so it is consistent, but it introduces a deployment constraint worth documenting.

### 10. UTAAC `appellant` field is missing from the TypeScript type's required fields vs the plan

The plan states UTAAC fields are: "Time, Appellant, Case Reference Number, Case Name, Judge(s), Member(s), Mode of Hearing, Venue and Additional Information." The type has `appellant: string` (required), which is correct for the TypeScript interface. The converter has `required: false`. One of these is wrong. See issue 6 above for the resolution path.

### 11. PDF generator hardcodes `listTitle` in English

**File:** `libs/list-types/upper-tribunal-tax-and-chancery-chamber-daily-hearing-list/src/pdf/pdf-generator.ts` line 31

The title `"Upper Tribunal Tax and Chancery Chamber Daily Hearing list"` is hardcoded in the PDF generator. When a Welsh PDF is requested (locale `cy`), the Welsh page title from `cy.ts` should be used. The `loadTranslations` helper is called and `t` is passed to the template, but `listTitle` in `renderedData.header` will always be the English string.

---

## Positive Feedback

- The three modules follow the established CST pattern consistently, making the implementation predictable and easy to review.
- JSON schemas correctly use `minItems: 1` and the no-HTML pattern, matching the plan exactly.
- Location data additions (region 7 "National", sub-jurisdictions 10/11/12, virtual locations 13/14/15) are correct and well-structured.
- List type data entries (IDs 28/29/30) have the correct `shortenedFriendlyName` for upload form display and `isNonStrategic: true`.
- Integration into `PDF_GENERATOR_REGISTRY` and `EMAIL_BUILDER_REGISTRY` in the notification service and processing service is complete and correct.
- UTAAC PDF template correctly includes `@page { size: A4 landscape; }` for the 9-column layout.
- All `target="_blank"` links include `rel="noopener noreferrer"`, which is correct.
- Welsh `cy.ts` files use `[TRANSLATE: ...]` markers consistently and maintain structural parity with `en.ts`.
- The `observeLinkUrl` is correctly masked to `https://www.gov.uk/guidance/observe-a-court-or-tribunal-hearing` in all three list types.
- The `ListSearchConfig` seed entries are correct: UTCC and UTLC use `caseReference`, UTAAC uses `caseReferenceNumber`.
- Unit tests cover the primary success and failure paths for each controller, including Welsh locale selection.
- Tests follow the Arrange-Act-Assert pattern.
- App registration in `apps/web/src/app.ts` is correct and complete.

---

## Test Coverage Assessment

**Unit tests:** Good coverage for controllers (5–6 scenarios each), renderers (7+ scenarios), and email summary builders. The tests are well-structured and realistic. Missing: no tests for the converter configs themselves — there are no tests asserting that required fields are enforced at the Excel conversion stage. Given that the required flags are wrong (issue 1), this gap allowed the bug to go undetected.

**E2E tests:** No E2E tests were added specifically for the three new list type style guide pages (UTCC, UTLC, UTAAC viewer). The existing non-strategic upload E2E test is skipped (`test.describe.skip`). There are no journey tests covering a user uploading a UT-format Excel file and viewing the resulting style guide page, nor any accessibility checks on the new pages.

**Accessibility tests:** Not tested. The new templates have not been included in any automated axe-core tests.

---

## Acceptance Criteria Verification

- [x] Validation schemas are created for each list type — JSON schemas exist and are structurally correct
- [~] Error handling in validation — schema validation returns 400, but the Excel converter does not enforce required fields (issue 1)
- [x] Valid publications are saved via the current method — existing pipeline unchanged, new types registered
- [x] List types classified with Public sensitivity, isNonStrategic: true
- [x] New PDF template for each list — correct columns, UTAAC landscape
- [x] Unified email summary format — Date/Time/Case Reference Number pattern; **Date field is missing** (issue 2)
- [~] Email summary fields are Date, Time, Case Reference Number — Time and Case Reference Number present; Date absent (issue 2)
- [x] New style guide created for each list — Nunjucks templates present with GOV.UK table component
- [x] List manipulation (search) — client-side search input present in all three templates
- [x] Full list names displayed correctly — `englishFriendlyName` matches the ticket specification
- [x] Upload form short names — `shortenedFriendlyName` present and correct
- [x] Region National for UTCC and UTLC — region 7 added, virtual locations assigned
- [x] Region London for UTAAC — UTAAC virtual location uses regionId 1
- [x] Opening statements displayed — content present in en.ts and rendered in govuk-details component
- [x] "Observe" link masked correctly — `https://www.gov.uk/guidance/observe-a-court-or-tribunal-hearing` used in all three

---

## Next Steps

- [ ] Fix critical issue 1: Align `required` flags in all three converter configs to match JSON schema required arrays
- [ ] Resolve critical issue 2: Confirm with stakeholders whether the GOV.Notify template covers the Date field, or implement the factory approach to pass `contentDate` into `extractCaseSummary`
- [ ] Fix issue 3: Replace inline `<style>` blocks with GOV.UK utility classes
- [ ] Fix issue 4: Remove `any` types from `non-strategic-upload/index.ts`
- [ ] Fix issue 5: Replace `console.error` with the project's structured logger in all three page controllers
- [ ] Resolve issue 6: Clarify whether `appellant` is required or optional in UTAAC and align schema, converter, and TypeScript type accordingly
- [ ] Fix issue 7: Remove `models/types.ts` files and colocate types with their usage
- [ ] Add E2E tests for the three new style guide page journeys
- [ ] Fix issue 11: Use the locale-selected page title in PDF generator (pass `t.pageTitle` rather than hardcoded English)

---

## Overall Assessment

**NEEDS CHANGES** — The critical required-field mismatch between converter configs and JSON schemas (issue 1) and the missing Date label in email summaries (issue 2) must be resolved before deployment. The remaining high priority items (inline styles, `any` types, direct console logging) should also be fixed in this PR.
