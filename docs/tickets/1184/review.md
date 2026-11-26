# Code Review: Issue #1184

Excel downloads: use consistent date format (`d MMMM yyyy`) across all list types.

**Scope reviewed:** the uncommitted changes under `libs/` on `master`: 18 modified files, plus 4 untracked `libs/list-types/*/src/excel/excel-generator-with-renderer.test.ts` files (Crown Advance, Crown Firm, Magistrates Adult, Magistrates Standard). `docs/tickets/1184/` is also untracked and belongs in the #1184 commit.

**Not part of #1184. Don't commit these with this ticket:**
- `.devcontainer/devcontainer.json`
- `docker-compose.yml`
- `docs/demo/`
- `docs/tickets/1224/`
- `6e7e86fd-627b-4e2e-950a-bf0bebf86c25.xlsx` (PIP sample, repo root)

This review replaces the previous round. What changed since then, and what I checked myself:

| Claimed change | Verified |
|---|---|
| HIGH 1 fixed: the SJP press DOB cell goes through `sanitiseCellValue` | Yes. `libs/excel-generation/src/excel/sjp-press-list-excel-generator.ts:1` imports it from `@hmcts/list-types-common` (an existing dependency), and `:46` wraps `formatDateOfBirth(...)`. The helper prefixes `'` when the first character is `=`, `+`, `-` or `@` (`libs/list-types/common/src/excel/excel-utilities.ts:5,12-17`) |
| New `=1+1` test | Yes. `sjp-press-list-excel-generator.test.ts:176-185` asserts `'=1+1 (35)`. It runs the real parser and the real helper, nothing mocked |
| PIP parity is kept for normal values | Yes. A DOB starts with a digit and the age-only value starts with `(`, so neither is changed. The existing tests at `:123-174` and `:187-196` still pass unchanged |
| Logged as task 25 | Yes, `tasks.md:30` |
| Previous suggestions not addressed | Confirmed. `tasks.md:5,15-16`, `plan.md:98-113,155-161,211,260-263`, `ticket.md:43-47,75-77` and the test tidy-ups are as they were. They are carried forward below |

I also re-checked the claim from the previous round that every other generator in this change sanitises its cells. Crown Advance doesn't call `sanitiseCellValue` itself (`crown-advanced-pdda-list/src/excel/excel-generator.ts:38`), but `createSingleSheetExcelBuffer` applies it to every cell (`excel-utilities.ts:45`). So every date cell this ticket touches is now sanitised.

## Summary

| List type | Excel change | Where |
|---|---|---|
| Shared | `formatDdMmYyyyDate` hardened: anchored `d/M/yyyy` pattern, Luxon validity check in UTC, and anything else returned unchanged | `libs/list-types/common/src/rendering/date-formatting.ts:3,65-74` |
| Magistrates Standard | DOB, plea, conviction and adjourned dates. The renderer's `formatDateFromIso` returns non-existent dates as sent | `libs/list-types/magistrates-standard-list/src/excel/excel-generator.ts:78,108,125-127`; `src/rendering/renderer.ts:278-279` |
| Crown Advance | Fixed for | `libs/list-types/crown-advanced-pdda-list/src/excel/excel-generator.ts:38` |
| Magistrates Adult (daily and future) | `def_dob`. The schema now requires `^\d{2}/\d{2}/\d{4}$`, as PIP's does | `libs/list-types/magistrates-adult-court-list/src/excel/excel-generator.ts:66`; `src/schemas/magistrates-adult-court-list.json:108-112` |
| SJP Press / Delta Press | DOB written as sent, with ` (age)` (AC1 exception), now sanitised | `libs/excel-generation/src/excel/sjp-press-list-excel-generator.ts:46,71-77`; `libs/list-types/common/src/sjp/json-parser.ts:182`; `sjp-service.ts:34` |
| Crown Firm | No source change; the weekday is kept (AC1 exception) | `libs/list-types/crown-firm-list/src/excel/excel-generator.ts` (as on master) |

**Checks I ran:**
- Biome is clean on all 22 changed `libs/` files (`npx biome check`).
- `tsc --noEmit` is clean in the six changed workspaces and in `libs/list-types/sjp-press-list`.
- All tests pass in the six changed workspaces (776 tests).
- Downstream: `libs/list-types/sjp-press-list` passes (26 tests).

The fix is the one-line change asked for, with a matching test. Nothing blocks this ticket now. What's left is paperwork (stale wording in `tasks.md` and `plan.md`, unanswered open questions on the issue) and small test tidy-ups.

## 🚨 CRITICAL Issues

None. I found no security, accessibility, type-safety or data-loss defects, and every acceptance criterion is met.

## ⚠️ HIGH PRIORITY Issues

None. Last round's HIGH 1 is fixed and tested (see the table above).

## 💡 SUGGESTIONS

1. **Bring `tasks.md` and `plan.md` in line with the revised decision 7.** Carried over.
   - `tasks.md:5` item (7) still says SJP is "accepted as is", that unreadable values "become an empty cell", and that "follow-up #1366 is not needed". This contradicts task 24 (`tasks.md:29`) and `plan.md:15`.
   - Tasks 10 and 11 (`tasks.md:15-16`) still describe formatting with `formatDisplayDate`. Mark them superseded by task 24.
   - In `plan.md`, mark these as superseded, the way 2.2 to 2.4 are:
     - section 2.5 (`plan.md:155-161`)
     - the section 3 row "SJP DOB that cannot be parsed → Empty cell" (`plan.md:211`)
     - S5 (`plan.md:260-263`)
     - section 2.1's `formatIsoDisplayDate` paragraph (`plan.md:98-113`)
   - Someone reading the plan later can't tell which SJP behaviour is the real one without this.

2. **Keep #1366 open, but correct its scope.** Carried over; the issue is still open.
   - It is still needed. The PDF (`sjp-press-list/src/pdf/pdf-generator.ts:26-28`) and the HTML (`sjp-press-list.njk:205`) still depend on `parseDateOfBirth`. That means dashed dates are read month-first, `31/02/1990` rolls over, and unreadable values are dropped.
   - Its "Where it shows" section still lists the Excel. That is no longer true. Remove that line and link to decision 7.
   - Note that one SJP publication now shows three versions of the same DOB: `01/01/1990 (35)` in the Excel, `01 January 1990 (35)` in the PDF, and the `date` filter's format in the HTML. With age only, the Excel shows `(35)` but the PDF shows nothing. This is accepted under decision 7 to match PIP. Writing it down means nobody reports it as a regression later.

3. **Type the `buildSingleAccusedJson` parameter** (`libs/excel-generation/src/excel/sjp-press-list-excel-generator.test.ts:290,321`). Carried over.
   - `Record<string, unknown>` plus `as SjpJson` means a misspelt field (`dateofBirth`) still typechecks, and the test then passes for the wrong reason. The new `=1+1` test (`:177`) uses the same builder.
   - `SjpParty` is already exported (`json-parser.ts:26`, re-exported by `export *` at `common/src/index.ts:85`). Type the parameter as `NonNullable<SjpParty["individualDetails"]>` and drop the cast.

4. **Fix the broken PIP links in the issue** (`ticket.md:43-47`). Carried over.
   - The `CrownPddaListHelper.java`, `CrownAdvancePddaListHelper.java`, `MagistratesStandardListHelper.java` and `MagistratesAdultCourtListHelper.java` links point at `service/helpers/`. The files are in `service/helpers/listmanipulation/`.
   - `DateHelper.java` and `NonStrategicFieldFormattingHelper.java` resolve correctly.

5. **Answer open questions 3 to 5 on the issue** (`ticket.md:75-77`), the way 1 and 2 are answered. Carried over.
   - AC2 says "see open question 4", but the Welsh-month decision is recorded only in `plan.md` section 1.
   - While editing the issue, also annotate:
     - the uploaded-workbook audit row (`ticket.md:29`): "No change: these lists have no date column; free-text cells are written as uploaded (AC1 exception)"
     - the SJP row of the PIP comparison table (`ticket.md:46`), which now matches PIP exactly, not just "effectively"

6. **Carried-over test suggestions.** None of these was picked up this round:
   - Add `["an empty string", ""]` to the invalid `def_dob` table (`magistrates-adult-court-list/src/validation/json-validator.test.ts:142-147`).
   - Remove `as any` from `crown-advanced-pdda-list/src/excel/excel-generator-with-renderer.test.ts:73` by typing `JSON_DATA` as `CrownAdvanceListData`. CLAUDE.md asks for no `any` without a reason.
   - In `readColumn`, assert the header was found before indexing (`indexOf` returns `-1` for a renamed header). It is copied into all four with-renderer files, e.g. `magistrates-standard-list/src/excel/excel-generator-with-renderer.test.ts:139-145`. Consider sharing it through `@hmcts/test-support`.
   - Cover `MAGISTRATES_ADULT_COURT_LIST_FUTURE` with an `it.each` over both list type names (`magistrates-adult-court-list/src/excel/excel-generator-with-renderer.test.ts:49`).
   - Add a COA Civil test with a real Excel date cell, not only a `20/02/2025` text cell (`court-of-appeal-civil-daily-cause-list/src/excel/excel-reformatter.test.ts`).
   - Use AAA markers consistently. The new SJP tests (`sjp-press-list-excel-generator.test.ts:133-196`) don't have them, while other tests in the same change do, e.g. `magistrates-adult-court-list/src/excel/excel-generator.test.ts:118-155`.

7. **Raise a separate ticket for the rest of the SJP press Excel.** Not part of #1184.
   - The name, address, case URN, offence and prosecutor cells (`sjp-press-list-excel-generator.ts:44-48,55-56`) still go into the sheet unsanitised. This predates this change.
   - In the same ticket, consider adding tab and carriage return to `CSV_INJECTION_CHARS` (`excel-utilities.ts:5`), as OWASP recommends. It is shared by every generator, so it shouldn't be changed under this ticket.

## ✅ Positive Feedback

- **The fix is exactly the right size.** One import, one wrapper call, one test. Sanitising after `formatDateOfBirth`, not before, means the check runs on the first character of the finished cell, which is the character Excel looks at.
- **The SJP change still matches PIP exactly.** `formatDateOfBirth` (`sjp-press-list-excel-generator.ts:72-77`) mirrors `getAccusedDob` branch for branch, and the comment at `:71` says why the value is written as sent.
- **It closes AC4 for SJP without touching shared behaviour.** The raw value is carried next to the parsed `Date`, not used in its place, so the PDF, HTML, filters and `determineListType` are unaffected. `rawDateOfBirth` is required on `SjpCasePress`, and the public projection (`sjp-service.ts`) lists its fields explicitly, so the raw DOB can't reach the public list.
- **The SJP tests cover every case that matters,** all through real JSON and the real parser: normal DOB (`:123`), Welsh (`:133`), no age (`:143`), unreadable (`:154`), impossible `31/02/1990` (`:165`), formula injection (`:176`), age only (`:187`), neither (`:244`).
- **The rest of the change still holds up:**
  - The hardened `formatDdMmYyyyDate` never loses data and is safe to call twice (`date-formatting.test.ts:150-181`).
  - Each Excel generator formats at its own edge, and the shared renderers stay untouched.
  - The with-renderer tests check each column by its locale header in both languages.
  - The Magistrates Adult schema rule is identical to PIP's.
- **CLAUDE.md conventions are followed:** `.js` relative imports, module constants at the top, no `types.ts` or `utils.ts`, nothing exported only for tests, `listTypeName` throughout, and `excel-to-json.ts` and the upload validators untouched.

## Test Coverage Assessment

- **Unit tests: good.**
  - Every changed generator has English, Welsh and unparseable-value cases.
  - SJP adds impossible-date, age-only and formula-injection cases.
  - Four list types also run the real renderer into the generator.
  - Gaps: only the small carried-over items in Suggestion 6.
- **E2E tests: none added.** This is acceptable. The change is to text inside a generated `.xlsx`, and `e2e-tests/tests/sjp-press-list.spec.ts` checks only the HTML page, which doesn't change. A manual publish and download is recorded in `tasks.md:21`.
- **Accessibility tests: not applicable.** There are no page, template, style or locale-copy changes.
- **Statement coverage per changed workspace.** I ran `npx vitest run --coverage` in each workspace, not a root `yarn test:coverage`.
  - `libs/excel-generation`: 100% (23 tests)
  - `libs/list-types/common`: 94.63% (381 tests)
  - `libs/list-types/crown-advanced-pdda-list`: 94.65% (111 tests)
  - `libs/list-types/crown-firm-list`: 97.34% (97 tests)
  - `libs/list-types/magistrates-adult-court-list`: 95.57% (81 tests)
  - `libs/list-types/magistrates-standard-list`: 98.07% (83 tests)

  All six are above 80%.
- **Failing tests: none.**
- **Branch coverage notes:**
  - Crown Advance (79.31%) and Crown Firm (77.47%) are slightly under 80% on branches. The uncovered branches are in existing renderer and PDF code, not in lines this change touches.
  - The one uncovered branch in `excel-generation` (96.87%) predates this change: `prosecutor ?? ""`, line 48.
- **Not run:** root `yarn lint` and `yarn test` across all workspaces.

## Acceptance Criteria Verification

These are the criteria from the "Acceptance criteria" section of the #1184 description (`ticket.md:58-62`), quoted word for word.

- [x] **"Every date written to a list-type Excel download uses `d MMMM yyyy` (e.g. `20 October 2026`). There is no zero-padded day, no `dd/MM/yyyy`, and no ISO. Exceptions: `CROWN_FIRM_PDDA_LIST` keeps the weekday on its sitting date (e.g. `Monday 5 January 2026`), matching PIP's Excel and the list's PDF and HTML. `SJP_PRESS_LIST` and `SJP_DELTA_PRESS_LIST` write the date of birth exactly as sent in the JSON, followed by ` (age)` (e.g. `01/01/1990 (35)`), matching PIP's Excel. In uploaded workbooks, free-text columns (e.g. Additional Information) are written as uploaded, including any cell Excel stored as a date."**
  - Format string: `common/src/rendering/date-formatting.ts:73`
  - Magistrates Standard:
    - code: `magistrates-standard-list/src/excel/excel-generator.ts:78,108,125-127`
    - test: `excel-generator-with-renderer.test.ts:83-98`
  - Crown Advance:
    - code: `crown-advanced-pdda-list/src/excel/excel-generator.ts:38`
    - test: `excel-generator-with-renderer.test.ts:55-61`
  - Magistrates Adult:
    - code: `magistrates-adult-court-list/src/excel/excel-generator.ts:66`
    - test: `excel-generator-with-renderer.test.ts:27-33`
  - Crown Firm exception: `crown-firm-list/src/excel/excel-generator-with-renderer.test.ts:49-55`
  - SJP exception:
    - code: `excel-generation/src/excel/sjp-press-list-excel-generator.ts:46,71-77`
    - tests: `sjp-press-list-excel-generator.test.ts:123-131,143-196`
  - Uploaded date columns already produce `d MMMM yyyy`:
    - weekly lists: `pht-weekly-hearing-list/src/excel/excel-reformatter.ts:15`
    - COA Civil: `court-of-appeal-civil-daily-cause-list/src/rendering/renderer.ts:40`
  - Free-text exception: pinned by `common/src/excel/uploaded-workbook-reformatter.test.ts:181-191`
- [x] **"Welsh month names in Welsh Excel output, **or** English-only to match PIP (see open question 4). The decision is applied to all list types."**
  - Welsh was chosen. Tests:
    - `magistrates-standard-list/src/excel/excel-generator-with-renderer.test.ts:100-115`
    - `crown-advanced-pdda-list/src/excel/excel-generator-with-renderer.test.ts:63-69`
    - `magistrates-adult-court-list/src/excel/excel-generator-with-renderer.test.ts:35-41`
    - `crown-firm-list/src/excel/excel-generator-with-renderer.test.ts:57-63`
    - `common/src/rendering/date-formatting.test.ts:155-158`
  - SJP has no month in its DOB cell (written as sent). The Welsh run is checked at `sjp-press-list-excel-generator.test.ts:133-141`.
  - The decision isn't recorded against open question 4 on the issue (Suggestion 5).
- [x] **"Applies to all list types in the table above, both JSON-generated and uploaded-workbook-reformatted Excel files."**
  - Every JSON row of the audit table is handled (files under AC1).
  - Both Magistrates Adult list types and both SJP press lists use the changed generators (`libs/publication/src/processing/service.ts:274-275,464-465,493-499`).
  - Uploaded workbooks:
    - The only uploaded date columns (the weekly lists and the COA Civil future judgments) already produce `d MMMM yyyy`.
    - RCJ, London Administrative Court and SSCS have no date column, so they fall under AC1's free-text exception.
- [x] **"Dates that can't be parsed are written unchanged. A download must never fail because of a bad date."**
  - Shared helper: `common/src/rendering/date-formatting.test.ts:171-181`
  - Magistrates Standard: `excel-generator.test.ts:231-240`, `excel-generator-with-renderer.test.ts:118-136`, `rendering/renderer.test.ts:343-360`
  - Crown Advance: `excel-generator.test.ts:144-154`
  - Magistrates Adult: `excel-generator.test.ts:142-155`
  - SJP:
    - unreadable DOB: `sjp-press-list-excel-generator.test.ts:154-163` (`not a date (35)`)
    - impossible DOB: `:165-174` (`31/02/1990 (35)`)
    - code: `sjp-press-list-excel-generator.ts:72-77`
  - The only change made to a value is the `'` prefix on a formula-like value (`:176-185`). That is the agreed injection guard, not a reformat, and it applies to every cell in every generator.
- [x] **"Unit tests for each affected generator are updated to assert the new format, including a Welsh case."**
  - Magistrates Standard: `excel-generator.test.ts:180-240`, `excel-generator-with-renderer.test.ts:83-115`
  - Crown Advance: `excel-generator.test.ts:127,135-154`, `excel-generator-with-renderer.test.ts:55-69`
  - Magistrates Adult: `excel-generator.test.ts:118-155`, `excel-generator-with-renderer.test.ts:27-41`
  - SJP (as sent, with a Welsh run): `sjp-press-list-excel-generator.test.ts:123-196`
  - Crown Firm (format unchanged, Welsh asserted): `excel-generator-with-renderer.test.ts:49-63`

**Tally: 5 met, 0 partial, 0 unmet, out of 5.**

## Next Steps

- [ ] Suggestion 1: update `tasks.md:5`, tasks 10 and 11, and `plan.md` 2.1, 2.5, section 3 (line 211) and S5 for the revised decision 7.
- [ ] Suggestion 2: edit #1366 to drop the Excel and note the three different DOB formats. Keep it open for the PDF and HTML.
- [ ] Suggestions 4 and 5: fix the PIP `listmanipulation/` links, answer open questions 3 to 5, and annotate audit rows 29 and 46 on the issue.
- [ ] Suggestions 3 and 6: small test tidy-ups.
- [ ] Suggestion 7: raise a separate ticket for the other unsanitised SJP press cells and the tab and carriage-return characters.
- [ ] Commit `docs/tickets/1184/` with the code.
- [ ] Keep `.devcontainer/devcontainer.json`, `docker-compose.yml`, `docs/demo/`, `docs/tickets/1224/` and `6e7e86fd-627b-4e2e-950a-bf0bebf86c25.xlsx` out of the #1184 commit.
- [ ] Run `yarn lint` and `yarn test` from the repo root before committing.

## Overall Assessment

**APPROVED**

- **The acceptance criteria are all met,** with code and test evidence for each one.
- **Last round's only blocker is fixed.** The SJP DOB cell goes through `sanitiseCellValue`, and an `=1+1` test proves it. PIP parity for real values is unchanged.
- **Checks are clean.** Statement coverage is above 94% in every changed workspace, there are no failing tests, and Biome and typecheck are clean.
- **What's left is not blocking.** It is paperwork in `tasks.md`, `plan.md` and the issues, plus small test tidy-ups. I'd still fix Suggestion 1 before merging, so the ticket docs don't contradict the code.
