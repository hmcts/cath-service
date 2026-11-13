# Technical Plan: #1190 Family Daily Cause List PDF missing legal advisor, and court house address has extra line breaks

TEMPLATE SOURCE: n/a — bug fix to existing templates

## 1. Technical Approach

Two template-only fixes. The data is already correct, so no TypeScript, renderer, schema or locale changes are needed.

- `renderCauseListData` -> `processParties()` (`libs/list-types/daily-cause-list-common/src/rendering/renderer.ts:116-151`) already sets `applicant`, `applicantRepresentative`, `respondent` and `respondentRepresentative` on every case, and the web page and the PDF both use it. The PDF template never prints the two representative fields.
- Both locales already have `legalAdvisor` (`en.ts`: "Legal Advisor", `cy.ts`: "Cynrychiolydd Cyfreithiol"). The PDF generator passes the locale object as `t` (through `generateDailyCauseListPdf` with the en/cy locale loaders), so `t.legalAdvisor` works in the PDF as it is.

Decisions:

1. **Party cells in the PDF**: copy the web page markup exactly (`family-daily-cause-list.njk:161-170`), including the `{% if case.applicant %}` / `{% if case.respondent %}` guard, so the web page and the PDF print the same text: `<party>, Legal Advisor: <representative>`. Do not copy the civil-and-family PDF format (`<br><em>Legal Advisor: …</em>`). The ticket asks for the two family outputs to match each other (see Clarifications).
2. **Court house address**, both templates: build an `addressParts` list of the non-empty `line[]` entries, then `town`, `county` and `postCode`. Then print it once, putting `<br>` between parts with `{% if not loop.last %}<br>{% endif %}`. This is the same loop the venue header address already uses (web `:34-38`, PDF `:13-17`). Build the list with the existing Nunjucks push idiom (`{% set addressParts = (addressParts.push(x), addressParts) %}`, already used in `apps/web/src/pages/(list-types)/sjp-public-list/sjp-public-list.njk:143`).
   - Do **not** use `addressParts | join("<br>") | safe`. That would turn off autoescaping for data that comes from the publication JSON (XSS risk). The loop keeps every part escaped.
3. Keep the existing `{% if courtHouse.courtHouseAddress %}` guard as it is (it decides whether the court house name `h2` shows). Only print the address `<p>` / `<div class="address">` when `addressParts | length`, so an address object with every part empty does not produce an empty element.

## 2. Implementation Details

### Files to change

| File | Change |
|---|---|
| `apps/web/src/pages/(list-types)/family-daily-cause-list/family-daily-cause-list.njk` (lines 77-90) | Replace the separate `<p class="govuk-body">` per part with one `<p class="govuk-body">` holding the `addressParts` joined by `<br>`. The `<h2>` and wrapper `div.govuk-!-margin-bottom-6` stay. |
| `libs/list-types/family-daily-cause-list/src/pdf/pdf-template.njk` (lines 38-43) | Same `addressParts` approach inside `<div class="address">`, so there is never a trailing `<br>`. |
| `libs/list-types/family-daily-cause-list/src/pdf/pdf-template.njk` (lines 99-100) | Replace `<td>{{ case.applicant }}</td>` / `<td>{{ case.respondent }}</td>` with the guarded party + `, {{ t.legalAdvisor }}: {{ case.xRepresentative }}` markup copied from the web template. |
| `libs/list-types/family-daily-cause-list/src/pdf/pdf-template.njk.test.ts` | Add a case/sitting/session builder chain (the file has only `buildCourtHouse` now), a `COLUMN` constant, and tests for party cells and the trailing `<br>`. |
| `apps/web/src/pages/(list-types)/family-daily-cause-list/family-daily-cause-list.njk.test.ts` | Rewrite the five "Court house address" tests (lines 252-321). They currently assert **one `<p>` per address part**, which is the bug, so they will fail after the fix. Assert one `<p>` instead, with parts split on `<br>`. |

Placement follows CLAUDE.md. The web page template stays in `apps/web` (pages live in apps). The PDF template and its test stay in the `libs/list-types/family-daily-cause-list` feature module. No new modules, no new files.

### API endpoints
None.

### Database schema changes
None.

### Locale changes
None. `legalAdvisor` already exists in both `en.ts` and `cy.ts`, and the locale-key parity test already passes.

## 3. Error Handling & Edge Cases

| Case | Expected behaviour |
|---|---|
| Representative on the applicant only (or the respondent only) | That cell shows `<party>, Legal Advisor: <rep>`. The other cell shows only the party name. |
| No representative on either party | Each cell shows only the party name. No `, Legal Advisor:` text appears anywhere. |
| Several representatives for one party | `processParties()` already joins them with `, `. They print as one string after the label, the same as on the web page. |
| Representative present but party name empty | Matches the web page: the cell is empty, because the representative only prints inside the `if case.applicant` guard. This existing web behaviour is now copied to the PDF. See Clarifications. |
| Welsh locale | Label comes from `cy.legalAdvisor`. The address does not change by locale. |
| `postCode` missing | The address ends at the last non-empty part (county, town or line), with no trailing `<br>`. |
| `county` and `postCode` missing, or only `line[]` present | Same as above. The current PDF also leaves a trailing `<br>` after `town` or after the last line in these cases, not only after `county`. The parts-list fix covers all of them. |
| Empty strings inside `line[]` | Skipped (current behaviour, kept). |
| Address object present but every part empty | The `h2` court house name still shows, as now. No empty address `<p>` / `div.address` is printed. |
| `courtHouseAddress` missing entirely | No `h2` and no address block (current behaviour, kept on both web and PDF). |
| Address or party values containing HTML characters | Still autoescaped. No `| safe` is added. |

## 4. Acceptance Criteria Mapping

| AC | How it is satisfied | How it is verified |
|---|---|---|
| PDF shows `Legal Advisor: <name>` after the applicant/respondent when the representative is set | PDF party cells copied from the web template | `pdf-template.njk.test.ts`: applicant cell text equals `John Green, ${en.legalAdvisor}: Family Solicitors Ltd`, and the same for the respondent |
| PDF shows only the party name when there is no representative | `{% if case.xRepresentative %}` guard | Test: cell text equals `John Green` and does not contain `en.legalAdvisor` |
| Welsh PDF uses the Welsh `legalAdvisor` label | `t` is the `cy` locale when locale=cy | Test that renders with `cy`: cell contains `cy.legalAdvisor` and not `en.legalAdvisor` |
| Web court house address shows as one block, no gap between lines | One `<p class="govuk-body">` with `<br>` separators | Web `.njk.test.ts`: `block.find("p.govuk-body")` `toHaveLength(1)`, and splitting on `<br>` gives the expected parts in order |
| Empty address parts skipped on web and PDF, no stray trailing `<br>` | `addressParts` built only from non-empty values, `<br>` only between parts | Both test files: `block.find("br")` `toHaveLength(parts.length - 1)` with `postCode` missing and with empty `line[]` entries |
| Template tests updated | As above | `yarn test` in both workspaces passes |

## 5. Test Scenarios

Each scenario is one user journey. Each lives in the matching `*.njk.test.ts` and uses structural Cheerio assertions, layered builders, `COLUMN` constants and no AAA comments (testing.md).

1. **Public user views the Family Daily Cause List web page and reads a court house address** (web `.njk.test.ts`)
   - Full address (two lines, town, county, postcode): one `p.govuk-body` under the court house block, five parts in order, four `<br>`.
   - Partial address (no county, empty `line[]` entries, no postcode): only the non-empty parts, `<br>` count = parts − 1, so no trailing break.
   - Error paths: `courtHouseAddress` missing, so no block and no `h2` (existing test kept). Address object with all parts empty, so the `h2` shows and no address `<p>`.
   - The header-address test stays unchanged and shows the two address styles now match.
2. **English subscriber opens the emailed PDF and reads the applicant/respondent columns** (`pdf-template.njk.test.ts`)
   - Both parties have representatives: both cells read `<party>, Legal Advisor: <rep>`.
   - Representative on one side only: that side has the label, the other side is the party name only.
   - No representatives: party names only, and no `Legal Advisor` text in the table.
   - Error path: representative set but party name empty, so the cell is empty (same as the web page).
3. **English subscriber reads the court house address in the PDF** (`pdf-template.njk.test.ts`)
   - Postcode missing: the address ends at county with no trailing `<br>` (`find("br")` count = parts − 1).
   - Only `line[]` present: no trailing `<br>` after the last line.
   - Existing tests (full address, town+county only, empty lines skipped, no address) stay and must still pass.
4. **Welsh subscriber opens the Welsh PDF** (`pdf-template.njk.test.ts`)
   - Render with `cy`: the party cell with a representative reads `<party>, ${cy.legalAdvisor}: <rep>`, and `en.legalAdvisor` does not appear.

No new E2E test. This is a fix to existing templates, not a new page or journey (CLAUDE.md E2E guidance), and there is no family-daily-cause-list-specific E2E spec to extend. A manual check of the rendered web page and of one generated PDF is listed in tasks.md.

## CLARIFICATIONS RESOLVED (2026-11-10)

1. **PDF party format:** follow the ticket. Print `<party>, Legal Advisor: <rep>` on one line, copied from the family web page (`family-daily-cause-list.njk:161-170`). The `<br><em>` variant in the civil-and-family PDF template (`:105-113`) is not a reference for this ticket, because the reporter has not seen it in generated PDFs.
2. **Representative without a party name:** this is intended. Hide the representative when `applicant` / `respondent` is empty, as the web page does.
3. **Welsh label:** keep the existing `cy.legalAdvisor` value, "Cynrychiolydd Cyfreithiol". It is accepted as equivalent to "Legal Advisor", so `cy.ts` does not change. The Welsh PDF test asserts `<party>, ${cy.legalAdvisor}: <rep>`.
4. **Sibling templates:** out of scope for #1190 and fixed under a follow-up ticket. That ticket covers the one-`<p>`-per-line court house address in `civil-daily-cause-list.njk:71-84` and `civil-and-family-daily-cause-list.njk:74-87` (web), and the trailing `<br>` in `civil-and-family-daily-cause-list/src/pdf/pdf-template.njk:41-45`.
