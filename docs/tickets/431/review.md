# Code Review: Issue #431 — SSCS Tribunal Non-Strategic Publishing

## Summary

This commit adds two changes on top of the previously reviewed SSCS daily hearing list implementation:

1. `apps/web/src/server.ts` — wraps `seedLocationData()` in a `try/catch` so that a seeding failure no longer crashes the server on startup.
2. `libs/subscriptions/src/repository/service.test.ts` — removes the unused `getLocationById` import from the mock import line.

The core SSCS module (`libs/list-types/sscs-daily-hearing-list/`) and the associated data files (`location-data.ts`, `list-type-data.ts`, `validation.ts`) are **unchanged** from the previous review. All three HIGH PRIORITY issues identified in the previous review remain unresolved.

---

## CRITICAL Issues

None.

---

## HIGH PRIORITY Issues

All three HIGH PRIORITY issues from the previous review are **still present and unaddressed** in this commit.

### 1. Welsh localisation gap for `importantInformationByListType`

**File:** `libs/list-types/sscs-daily-hearing-list/src/pages/cy.ts` (missing content)
**File:** `libs/list-types/sscs-daily-hearing-list/src/pages/index.ts` — line 102

```typescript
// index.ts line 102 — hardcoded `en` regardless of locale
const importantInformationText = getImportantInformationText(listTypeName, en);
```

`cy.ts` contains no `importantInformationByListType` map. The controller always resolves the important information text from the English-only map in `en.ts`, meaning Welsh-language users (`?lng=cy`) see English text in the important information section while the rest of the page is in Welsh. This violates the bilingual requirement for GOV.UK services.

**Impact:** Welsh-speaking users receive English content for a section that contains contact email addresses and procedural instructions — a meaningful content gap, not a cosmetic one.

**Required fix:** Either add a Welsh-language `importantInformationByListType` map to `cy.ts` and pass the active locale's translation object to `getImportantInformationText`, or — if the content is policy-mandated to be English-only — remove the unused `_t` parameter from the function signature and add an explicit code comment documenting the English-only policy decision.

---

### 2. Unused `_t` parameter in `getImportantInformationText`

**File:** `libs/list-types/sscs-daily-hearing-list/src/pages/index.ts` — line 25

```typescript
function getImportantInformationText(listTypeName: string | undefined, _t: typeof en): string {
```

The `_t` parameter is never referenced in the function body. Its presence implies a locale-aware lookup was intended but never completed. The underscore prefix suppresses the linter warning but does not resolve the underlying dead code — CLAUDE.md explicitly notes that the underscore convention is for positional parameters, not a way to retain unused module-level state.

**Impact:** Misleading function API. Any developer reading this signature will assume locale-switching is handled inside the function; it is not.

**Required fix:** If issue 1 above is resolved by adding Welsh content, wire `_t` correctly. If the English-only policy is accepted, remove the `_t` parameter entirely and update the call site at line 102 to `getImportantInformationText(listTypeName)`.

---

### 3. Email address capitalisation typo for SSCS North East

**File:** `libs/list-types/sscs-daily-hearing-list/src/pages/en.ts` — line 14

```typescript
SSCS_NORTH_EAST_DAILY_HEARING_LIST: `${OPEN_JUSTICE_PREAMBLE}\n${OBSERVER_INSTRUCTIONS("sscsa-leeds@Justice.gov.uk")}\n${OBSERVE_LINK}`,
```

The domain part of this email address is `@Justice.gov.uk` with a capital `J`. Every other email address in the same map uses `@justice.gov.uk` in lowercase. This is a public-facing string presented to court observers as the contact address.

**Impact:** Visually inconsistent content on a public-facing page. Users who copy the address manually may be uncertain whether the capitalisation is intentional. Although email is case-insensitive in delivery, this is a content error that should be corrected.

**Required fix:** Change `sscsa-leeds@Justice.gov.uk` to `sscsa-leeds@justice.gov.uk`.

---

## SUGGESTIONS

The following issues were raised as suggestions in the previous review. None have been addressed, and they remain valid. They are listed here for completeness but do not block deployment.

### 1. `_ALPHANUMERIC_REGEX` dead constant in `validation.ts`

**File:** `libs/system-admin-pages/src/user-management/validation.ts` — line 1

```typescript
const _ALPHANUMERIC_REGEX = /^[a-zA-Z0-9]+$/;
```

This commit changed `ALPHANUMERIC_REGEX` to `_ALPHANUMERIC_REGEX` (adding an underscore prefix) rather than deleting it. This is not a resolution — it silences the linter while leaving dead code in place. Per the YAGNI principle in CLAUDE.md, this constant should be deleted.

---

### 2. `JSON.parse` not wrapped in a try/catch

**File:** `libs/list-types/sscs-daily-hearing-list/src/pages/index.ts` — line 74

```typescript
const jsonData: SscsDailyHearingList = JSON.parse(jsonContent);
```

A malformed JSON file will throw a `SyntaxError` that falls through to the outer `catch` block, producing a 500 response. This masks a data problem as a server error. Consistent with the previous suggestion: wrap in a dedicated try/catch returning a 400 response.

---

### 3. Inline `<style>` block in the page template

**File:** `libs/list-types/sscs-daily-hearing-list/src/pages/sscs-daily-hearing-list.njk` — lines 3–10

The `.back-to-top { margin-top: 40px; }` rule should be replaced with the GOV.UK utility class `govuk-!-margin-top-8` (which maps to 40px), removing the inline `<style>` block entirely. Inline styles in the `<head>` can conflict with stricter CSP policies.

---

### 4. Search input not inside a `<form>` element

**File:** `libs/list-types/sscs-daily-hearing-list/src/pages/sscs-daily-hearing-list.njk` — lines 45–51

The search `<input>` is not wrapped in a `<form>`. Without JavaScript the field is non-functional, which fails the progressive enhancement requirement in CLAUDE.md. The redundant `aria-label` attribute (duplicating the already-linked `<label>`) should also be removed.

---

### 5. Page template does not handle an empty hearings list

**File:** `libs/list-types/sscs-daily-hearing-list/src/pages/sscs-daily-hearing-list.njk` — lines 68–84

The table renders unconditionally. When `hearings` is empty, users see a table header with no rows. The PDF template (`pdf-template.njk` line 25) handles this with an `{% if hearings.length > 0 %}` guard and a "No hearings scheduled." message. The web template should behave consistently.

---

### 6. No E2E test for the SSCS daily hearing list page

There is no `sscs-daily-hearing-list.spec.ts` equivalent of the E2E tests present for other list types. The new page has no automated accessibility (axe-core) or Welsh-language journey testing in the E2E suite.

---

### 7. `provenance` field not tested in PDF generator tests

**File:** `libs/list-types/sscs-daily-hearing-list/src/pdf/pdf-generator.test.ts`

No test case sets `provenance: "MANUAL_UPLOAD"` and asserts the correct provenance label in the PDF output. The `provenanceLabel` path is untested.

---

## Positive Feedback

- The `server.ts` change correctly wraps `seedLocationData()` in a `try/catch` with a `console.error` log and allows the server to continue starting up. This is a clear, minimal fix that matches the intent of the previous commit message and does not over-engineer the error handling.
- The removal of the unused `getLocationById` import in `service.test.ts` is a correct and clean tidy-up. The mock factory still declares `getLocationById: vi.fn()` for completeness, which is appropriate.
- The `app.test.ts` counter update from 20 to 21 `createSimpleRouter` calls correctly reflects the new module registration and keeps the test accurate.

---

## Test Coverage Assessment

- **Unit tests:** Unchanged from the previous review — 41 tests across 6 test files, all passing. No new tests were added or removed in this commit.
- **E2E tests:** Still absent for the SSCS daily hearing list page.
- **Accessibility tests:** Still absent for the new page.
- **Coverage percentage:** Not available from static analysis. Business logic paths in the controller remain well covered by unit tests.

---

## Acceptance Criteria Verification

No `ticket.md` or `plan.md` are present in `docs/tickets/431/`. Verification is based on the task checklist.

- [x] Add new regions to `location-data.ts` — 4 new regions added (IDs 7–10)
- [x] Add 8 SSCS tribunal locations to `location-data.ts` — location IDs 13–20 with correct regions and sub-jurisdictions
- [x] Add 8 SSCS list types to `list-type-data.ts` — IDs 28–35, all with `urlPath: "sscs-daily-hearing-list"` and `subJurisdictionIds: [8]`
- [x] Create `sscs-daily-hearing-list` library structure — correct structure following monorepo conventions
- [x] Create JSON validation schema — present with HTML-tag blocking pattern on all fields
- [x] Create TypeScript model types — `SscsDailyHearing` interface and `SscsDailyHearingList` type alias
- [x] Create Excel converter config and register converters — converters registered by both ID and name
- [x] Create renderer — `renderSscsDailyHearingListData` implemented correctly
- [x] Create email summary builder — `extractCaseSummary` implemented
- [x] Create PDF generator and template — `generateSscsDailyHearingListPdf` and `pdf-template.njk` present
- [x] Create English and Welsh translations — both `en.ts` and `cy.ts` complete
- [x] Create page controller — `GET` handler with correct error handling
- [x] Create Nunjucks page template — `sscs-daily-hearing-list.njk` present, extends `base-template.njk`, uses `page_content` block
- [x] Create `config.ts` and `index.ts` — correct exports
- [x] Create `package.json` and `tsconfig.json` — present and correct
- [x] Register module in root `tsconfig.json` — path aliases added for both `.` and `./config`
- [x] Register module in `apps/web/src/app.ts` — module root and page routes registered
- [x] Unit tests for renderer, email summary builder, Excel converter config, page controller, and PDF generator — all present and passing
- [ ] Important information content is locale-aware — Welsh users still receive English content (HIGH PRIORITY issue 1 unresolved)
- [ ] E2E test coverage — no E2E test created for the SSCS daily hearing list page

---

## Next Steps

- [ ] Resolve the Welsh localisation gap: add `importantInformationByListType` to `cy.ts` and pass the active translation object to `getImportantInformationText`, OR remove `_t` and document English-only policy — this resolves HIGH PRIORITY issues 1 and 2 together
- [ ] Fix the email capitalisation typo: change `sscsa-leeds@Justice.gov.uk` to `sscsa-leeds@justice.gov.uk` in `libs/list-types/sscs-daily-hearing-list/src/pages/en.ts` line 14
- [ ] Delete the `_ALPHANUMERIC_REGEX` constant from `libs/system-admin-pages/src/user-management/validation.ts` line 1
- [ ] Replace the inline `<style>` block in `sscs-daily-hearing-list.njk` with the `govuk-!-margin-top-8` utility class
- [ ] Wrap the search input in a `<form>` with a submit button for progressive enhancement
- [ ] Add a no-hearings message to the web template consistent with the PDF template
- [ ] Add an E2E test covering the SSCS daily hearing list journey including validation, Welsh content, and accessibility checks

---

## Overall Assessment

**NEEDS CHANGES**

This commit addresses two peripheral issues (server startup resilience and an unused test import) but does not resolve any of the three HIGH PRIORITY issues flagged in the previous review cycle. The Welsh localisation gap and the unused `_t` parameter are the same code in the same state as before. The email capitalisation typo is the same character-for-character error. None of these are complex changes — the email fix is a single character, and the `_t` fix is a one-line deletion with a matching call-site update. The Welsh content decision requires either adding a `cy.ts` map (consistent with the effort already invested in the Welsh translation) or a documented policy decision. This implementation should not be merged until at minimum the two HIGH PRIORITY issues that have concrete, unambiguous fixes are applied: the email capitalisation correction and the removal or correct wiring of the `_t` parameter.
