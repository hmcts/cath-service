# Code Review: Issue #429 — Non-Strategic Hearing Lists (GRC, WPAFCC, UTIAC)

## Summary

Five new list type modules have been added (GRC Weekly, WPAFCC Weekly, UTIAC SA Daily, UTIAC JR London Daily, UTIAC JR Leeds Daily) following the established non-strategic list pattern. The structure, converter registration, rendering, PDF generation, email summary, and page controllers are all correct. The implementation is broadly in good shape with a handful of content accuracy and test coverage issues that need fixing before merge.

---

## CRITICAL Issues

None. No security vulnerabilities, broken type safety, or data integrity problems were found.

---

## HIGH PRIORITY Issues

All high priority issues identified during review have been fixed:

### 1. ~~`englishFriendlyName` for WPAFCC is wrong~~ — FIXED

**File:** `libs/location/src/list-type-data.ts`, ID 29  
Corrected from `"War Pensions and Armed Forces Compensation Chamber Weekly Hearing List"` to `"First-tier Tribunal (War Pensions and Armed Forces Compensation) Weekly Hearing List"`.

### 2. ~~`englishFriendlyName` for UTIAC SA has an extra dash~~ — FIXED

**File:** `libs/location/src/list-type-data.ts`, ID 30  
Corrected from `"...Chamber - Statutory Appeal..."` to `"...Chamber Statutory Appeal..."` (spurious dash removed).

### 3. ~~WPAFCC opening statement exceeds the specified text~~ — VERIFIED CORRECT

**File:** `libs/list-types/wpafcc-weekly-hearing-list/src/locales/en.ts`  
The full opening statement text (including the subject line format and "appropriate arrangements will be made" clause) is present verbatim in the primary source — the issue body on GitHub. The bot-generated spec comment truncated it. Implementation matches the ticket spec correctly.

### 4. ~~Missing test cases in four controller test files~~ — FIXED

All missing tests have been added. Each controller now has 7 tests matching the GRC reference:

| Controller | Tests before | Tests after |
|---|---|---|
| WPAFCC | 4 | 7 (added: file-not-found 404, validation-failure 400, Welsh locale) |
| UTIAC SA | 5 | 7 (added: file-not-found 404, validation-failure 400) |
| UTIAC JR London | 5 | 7 (added: file-not-found 404, validation-failure 400) |
| UTIAC JR Leeds | 5 | 7 (added: file-not-found 404, validation-failure 400) |

Total test count increased from 1714 to 1723. All 169 test files pass.

---

---

## SUGGESTIONS

All suggestions have been addressed:

### 1. ~~Inline `<style>` block in all five Nunjucks templates~~ — FIXED

`.back-to-top { margin-top: 40px; }` moved to `apps/web/src/assets/css/back-to-top.scss`, which is already imported globally in `web.scss`. The `{% block head %}` inline style removed from all five templates (GRC, WPAFCC, UTIAC SA, UTIAC JR London, UTIAC JR Leeds).

### 2. ~~`@hmcts/publication` missing from explicit dependencies~~ — FIXED

`"@hmcts/publication": "workspace:*"` added to the `dependencies` section of all five new `package.json` files (GRC, WPAFCC, UTIAC SA, UTIAC JR London, UTIAC JR Leeds).

### 3. ~~Welsh locale test absent from WPAFCC controller~~ — FIXED

Welsh locale test was added to `apps/web/src/pages/(list-types)/wpafcc-weekly-hearing-list/index.test.ts` as part of the HIGH PRIORITY #4 fix above.

---

## Positive Feedback

- All five converters correctly call both `registerConverter(id, converter)` and `registerConverterByName("NAME", converter)` as required.
- The weekly vs daily renderer distinction is correctly implemented: GRC/WPAFCC use `contentDate` and expose `weekCommencingDate`; UTIAC daily modules use `displayFrom` and expose `listForDate`. The page controllers correctly pass `artefact.displayFrom` to the daily renderers.
- `validateNoHtmlTags` is applied to every free-text field across all five converters with no omissions.
- `validateTimeFormatSimple` is correctly applied to `hearingTime` in all five converters. `validateDateFormat(DD_MM_YYYY_PATTERN, ...)` is correctly applied only to the `date` fields in GRC and WPAFCC.
- `minRows: 1` is set on all five converter configs.
- JSON schemas are Draft 7, include `minItems: 1`, and apply the no-HTML-tag pattern to all string fields.
- UTIAC SA `extractCaseSummary` correctly accepts `displayFrom: string` as a second parameter so the date from `artefact.displayFrom` is included in email summaries, matching the spec.
- All opening statements match the spec exactly for GRC, UTIAC SA, UTIAC JR London, and UTIAC JR Leeds.
- List type IDs are 28–32 as specified in the plan (not 24–28 from the stale ticket comment).
- All entries in `list-type-data.ts` have `isNonStrategic: true`, `provenance: "MANUAL_UPLOAD"`, and `defaultSensitivity: "Public"`.
- Welsh placeholders follow the `"[WELSH TRANSLATION REQUIRED: '...']"` format throughout. The confirmed UTIAC SA Welsh page title is correctly applied.
- All templates extend `layouts/base-template.njk`, use `{% block page_content %}`, have `id="top"` on the `<h1>`, `scope="col"` on all `<th>` elements, `aria-label` on the table, and `govuk-visually-hidden` on the search label.
- All external links use `target="_blank" rel="noopener noreferrer"`.
- All relative imports use `.js` extensions.
- No `any` types in lib source files.
- Tests follow the Arrange-Act-Assert pattern consistently.
- Module registration in `apps/web/src/app.ts` and path aliases in `tsconfig.json` are complete and correct.

---

## Test Coverage Assessment

**Lib unit tests:** Good. Renderer, summary-builder, and PDF generator tests exist for all five modules. AAA pattern used throughout. The renderer tests cover happy path, multiple hearings, and empty list. PDF generator tests cover success, large file, and failure.

**Page controller tests:** All five controllers now have full coverage (7 tests each). All previously missing file-not-found (404), validation-failure (400), and Welsh locale test cases have been added. Total: 35 controller tests across 5 modules.

**E2E tests:** None added, which is appropriate — the `@nightly` tag pattern is used for E2E tests and this feature would require environment setup with actual artefact data.

---

## Acceptance Criteria Verification

| Acceptance Criterion | Status |
|---|---|
| Validation schemas created for each list type | PASS |
| Error handling on validation schema | PASS |
| Valid publications saved via current method | PASS — both `registerConverter` and `registerConverterByName` called |
| List types classified with user groups | PASS — `defaultSensitivity: "Public"` |
| New PDF templates created | PASS |
| Unified email summary format (Date, Time, Reference) | PASS |
| Style guides (HTML pages) for each list | PASS |
| List manipulation for style guides | PASS |
| GRC weekly display name | PASS |
| WPAFCC weekly display name (front-end page) | PASS — `en.pageTitle` correct |
| WPAFCC weekly `englishFriendlyName` in list-type-data | PASS — FIXED |
| UTIAC SA daily display name (front-end page) | PASS |
| UTIAC SA `englishFriendlyName` in list-type-data | PASS — FIXED |
| UTIAC JR London/Leeds display names | PASS |
| Opening statements match spec for GRC, UTIAC SA, UTIAC JR | PASS |
| Opening statement for WPAFCC | PASS — matches ticket body verbatim |
| Fields per list type match spec | PASS |
| Observe a hearing link text and URL | PASS |

---

## Overall Assessment

**APPROVED**

All issues identified during review have been resolved: the two `englishFriendlyName` corrections in `list-type-data.ts` have been applied, the WPAFCC opening statement was verified correct against the primary ticket source, and the missing controller test cases (file-not-found 404, validation-failure 400, Welsh locale) have been added to all four affected controllers. All 169 test files pass with 1723 tests total. The implementation is ready to merge.
