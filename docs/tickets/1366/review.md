# Code Review: Issue #1366

## Summary

Reviewed commit 363650a2 and the uncommitted working-tree changes together against `origin/master` (merge base 65eb3d72), including the untracked `libs/list-types/common/src/sjp/accused-date-of-birth.ts` and its test.

The change fixes the SJP press list date of birth in three places:

- **Parser** (`libs/list-types/common/src/sjp/json-parser.ts:3-7, 139-165`). `parseDateOfBirth` now accepts only `d/M/yyyy`, ISO `yyyy-MM-dd` and day-first `d-M-yyyy`. It builds the date at local midnight and returns it only if day, month and year round-trip. Otherwise it returns `null`. The original value is trimmed and kept as `rawDateOfBirth` (`json-parser.ts:185, 193`, `sjp-service.ts:34`).
- **PDF and Excel** print `rawDateOfBirth` as sent, through one shared formatter `formatAccusedDateOfBirth` (`accused-date-of-birth.ts:3-7`). The Excel cell still goes through `sanitiseCellValue` (`sjp-press-list-excel-generator.ts:46`).
- **Web page** shows the parsed date through the `date` filter, falls back to the raw value, and now renders the cell with `text:` instead of `html:` (`sjp-press-list.njk:196, 206`).

The implementation is small, correct and well tested. It follows every decision recorded in plan.md (no DOB means an empty cell on every output, `sanitiseCellValue` kept, no Luxon, schema format and Welsh month names split out to #1642 and #1643). All tasks in tasks.md are done. Unit tests pass in every changed workspace (404, 23, 29 and 154 tests). `biome check` on the changed files and `tsc --noEmit` in the three changed libs are clean. Statement coverage is above 80% everywhere.

I found no critical or high-priority issues. The suggestions below are about test quality and small inconsistencies between outputs.

## 🚨 CRITICAL Issues

None.

## ⚠️ HIGH PRIORITY Issues

None.

## 💡 SUGGESTIONS

1. **The PDF test's mock reimplements the formatter, so its `expected` column tests the mock** (`libs/list-types/sjp-press-list/src/pdf/pdf-generator.test.ts:8`, `:102-141`)
   - **Problem:** `formatAccusedDateOfBirth` is mocked as `vi.fn((raw, age) => raw ? [raw, age === null ? null : \`(${age})\`].filter(Boolean).join(" ") : "")`. That is a second copy of the logic. The `expect(renderCall.cases[0].formattedDob).toBe(expected)` assertion at `:141` only checks that the mock agrees with itself. If the real helper changed (for example, back to `(age)` alone), this test would still pass. The useful assertion is `toHaveBeenCalledWith(rawDateOfBirth, age)` at `:140`. It proves the PDF passes the raw value and not the parsed `Date`, and the real formatter is already tested in `accused-date-of-birth.test.ts`.
   - **Approach:** Make the mock return a sentinel, e.g. `vi.fn().mockReturnValue("FORMATTED_DOB")`. Then assert that it was called with `(rawDateOfBirth, age)` and that `formattedDob` is `"FORMATTED_DOB"`. That leaves fewer table rows, since the formatting cases already live in the common package. The other option is to stop mocking this one pure function by spreading `vi.importActual` for it.

2. **The "local midnight for every format" test can't fail in a UTC environment** (`libs/list-types/common/src/sjp/json-parser.test.ts:590-600`)
   - **Problem:** The test only covers the ISO input and asserts `getHours() === 0`. Under the old code `new Date("1990-01-13")` was UTC midnight, which is also local midnight when the test runner's TZ is UTC (CI and the devcontainer). So the test doesn't guard against the regression it names. The title also says "every format", but it checks one.
   - **Approach:** Set `process.env.TZ = "America/New_York"` inside the test, and restore it afterwards (Node picks up a runtime TZ change). Or assert `pressCase.dateOfBirth?.getTime()` equals `new Date(1990, 0, 13).getTime()`. Either way, run it for one input of each of the three formats with `it.each`.

3. **An age of 0 is shown on the PDF and Excel but not on the web page** (`apps/web/src/pages/(list-types)/sjp-press-list/sjp-press-list.njk:206`)
   - **Problem:** The web template uses `if case.age`, which is falsy for `0`. The shared formatter uses `age !== null`, and `accused-date-of-birth.test.ts:37-43` deliberately keeps `(0)`. So an accused aged 0 gets `01/01/2025 (0)` in the PDF and Excel but `1 January 2025` on the page. This was already true before the change, and an age of 0 is unlikely on an SJP list, but the two outputs now disagree on purpose in one place and by accident in the other.
   - **Approach:** Use `if case.age is not none` (Nunjucks `none` matches both `null` and `undefined`). Add a template test for `age: 0`, or record the decision.

4. **An ISO DOB now looks different on the web page from the PDF and Excel** (`libs/list-types/common/src/sjp/accused-date-of-birth.ts:3-7`)
   - **Problem:** Not a bug: it follows plan.md and matches PIP. But for an ISO input such as `1985-05-15`, the web page shows `15 May 1985 (40)`, while the PDF and Excel now show `1985-05-15 (40)`. Before, the Excel normalised it to `15/05/1985` and the PDF to `15 May 1985`. That works against the aim of #1184 (a consistent date format in Excel). The PIP evidence suggests the live feed sends `dd/MM/yyyy`, so live impact should be nil, but the e2e fixture still has two ISO DOBs (`e2e-tests/tests/sjp-press-list.spec.ts:19, 22`).
   - **Approach:** No code change needed if the team accepts "as sent". Mention it in the PR description so reviewers of #1184 know. It also makes the `dateOfBirth` schema-format ticket (#1642) more useful.

5. **The Welsh e2e path doesn't check the date of birth** (`e2e-tests/tests/sjp-press-list.spec.ts:208-220`)
   - **Problem:** The DOB assertions (`:165-169`) only run on the English page. The Welsh page uses the same template, so the risk is low. But `.claude/rules/e2e-testing.md` asks for Welsh checks inside the journey, and the unreadable raw value is the kind of thing worth checking in both languages.
   - **Approach:** Add `await expect(caseSummary("Alice Brown")).toContainText("unknown (29)")` to the Welsh test. Or better, follow the rule and fold the Welsh check into the main journey.

6. **The e2e comment states the feed format as fact** (`e2e-tests/tests/sjp-press-list.spec.ts:20`)
   - The comment says "dd/MM/yyyy is the format the live feed sends", but plan.md only says "almost certainly", based on PIP fixtures. Something like "the format PIP's fixtures use, and almost certainly the live feed" keeps the comment from overstating what's known.

7. **Years 0000-0099 return `null` rather than parsing** (`libs/list-types/common/src/sjp/json-parser.ts:159-160`)
   - `new Date(50, 0, 1)` maps to 1950, so the round-trip check rejects `01/01/0050`, and the web page shows it as sent. That's the safe outcome and well within "never return a different date". No change needed; this is noted so nobody is surprised later.

8. **The e2e test locates cases by CSS class** (`e2e-tests/tests/sjp-press-list.spec.ts:165`)
   - `page.locator(".govuk-summary-list").filter({ hasText: name })` is reasonable, because summary lists have no implicit ARIA role that Playwright can target. Scoping the DOB check with `getByRole("term", { name: dobHeader })` plus its sibling `definition` would make the test less tied to markup.

## ✅ Positive Feedback

- **The parser is correct and strict.** The anchored regexes (`json-parser.ts:3-7`) don't overlap: ISO needs a 4-digit first group, so it never collides with `d-M-yyyy`. `\d` without the `u` flag matches ASCII digits only. The round-trip check (`:160`) rejects rollovers such as 31/02, 29/02/1991, day 00 and month 13. Building every result with `new Date(y, m - 1, d)` removes the old UTC-midnight drift for ISO input when the server's TZ is behind UTC. There's no `try/catch` because nothing in it can throw.
- **The raw value is normalised before use.** `normaliseRawDateOfBirth` (`:139-142`) trims the value and maps empty or whitespace-only values to `null`. `parseDateOfBirth` gets the trimmed value, so `" 13/01/1990 "` parses, and every output prints the trimmed value.
- **XSS defence in depth.** The web DOB cell moved from `html:` to `text:` (`sjp-press-list.njk:206`), and a template test proves `<b>x</b>` renders as text (`sjp-press-list.njk.test.ts:537-543`). The PDF Nunjucks environment has `autoescape: true` (`libs/list-types/common/src/pdf/pdf-utilities.ts:24`). The schema already rejects tag-like values at upload (`sjp-press-list.json:213`).
- **Formula injection is handled.** The Excel DOB cell still goes through `sanitiseCellValue` (`sjp-press-list-excel-generator.ts:46`), with a test for `=1+1` (`sjp-press-list-excel-generator.test.ts:176-185`). This follows decision 3.
- **No DOB leaks onto public lists.** `extractPublicCases` (`json-parser.ts:264-273`) and `getSjpPublicCases` (`sjp-service.ts:157-167`) map fields one by one, so the new `rawDateOfBirth` can't reach a public list.
- **Other consumers are unaffected.** `determineListType` still only checks presence, and a test proves an unreadable DOB is still a press list (`json-parser.test.ts:84-87`). Web filtering and pagination don't use DOB. The web `date` filter (`libs/web-core/src/middleware/govuk-frontend/filters/date.ts`) gets the same `Date` it did before.
- **One shared, specific helper.** `formatAccusedDateOfBirth` lives in a specifically named file, is exported once from `@hmcts/list-types-common` for its two real consumers, and replaces two separate formatters. Its comments explain why, not what, as CLAUDE.md asks.
- **Tests are good quality.** The parser's `it.each` table (`json-parser.test.ts:557-588`) covers every ticket row plus the plan's extra edge cases, in AAA style. The Excel tests cover as sent, Welsh, no age, unreadable, impossible, formula-prefixed and missing DOB.

## Test Coverage Assessment

- **Unit tests:** Strong. The parser has an 18-row table covering every row of the ticket table plus `1/2/1990`, leap and non-leap 29 February, `00/01`, `13/13`, an ISO date-time, a 2-digit year, padded, whitespace-only, empty and missing values. The formatter has 6 cases, including age 0. Web template tests cover a parsed date, an unreadable value with age, escaping, and an empty value. The PDF test checks the wiring but its value assertions only check the mock (suggestion 1). The Excel tests cover 7 DOB scenarios. All pass.
- **E2E tests:** The existing `@nightly` journey was extended rather than duplicated, as `.claude/rules/e2e-testing.md` asks. It seeds one `dd/MM/yyyy` DOB and one unreadable DOB, and asserts the ISO, `dd/MM/yyyy` and unreadable cases on the page (`sjp-press-list.spec.ts:18-24, 164-169`). I assessed it by reading only, because it couldn't be run locally. The name filter `hasText: "Jane Doe"` matches the rendered `Mr Jane Doe`, and nothing else in the spec depended on the replaced `1990-08-22` or `1995-12-05` values. The Welsh path doesn't check the DOB (suggestion 5).
- **Accessibility tests:** The extended journey still runs Axe after the new assertions (`sjp-press-list.spec.ts:171-173`), as does the Welsh test. The markup change from `html:` to `text:` doesn't change the DOM structure.
- **Statement coverage per changed workspace** (`npx vitest run --coverage --coverage.reporter=text-summary` from each workspace):

| Workspace | Statements | Notes |
|---|---|---|
| `libs/list-types/common` | 95.06% (617/649) | |
| `libs/excel-generation` | 100% (91/91) | |
| `libs/list-types/sjp-press-list` | 93.1% (27/29) | Functions 60%, which is unrelated to this change |
| `apps/web` | 90.7% (205/226) | Scoped to `src/pages/(list-types)/sjp-press-list` only |

  Every workspace is above the 80% threshold.

## Acceptance Criteria Verification

- [x] **`dd/MM/yyyy`, `d/M/yyyy` and ISO `yyyy-MM-dd` dates of birth are parsed correctly.** Patterns are at `libs/list-types/common/src/sjp/json-parser.ts:4-5`, with local-midnight construction and the round-trip check at `:157-161`. Tested at `json-parser.test.ts:559-561`.
- [x] **`dd-MM-yyyy` dates of birth are read day-first (e.g. `01-02-1990` is 1 February 1990), if open question 1 confirms that's the real format.** The day-first pattern is at `json-parser.ts:6`. Tested at `json-parser.test.ts:562-564` (`01-01-1901`, `01-02-1990` gives 1 February, `13-01-1990` gives 13 January). Decision: plan.md answered open question 1 from PIP evidence (the feed is almost certainly `dd/MM/yyyy`) and kept the day-first pattern as a defensive extra. Since the PDF and Excel now print as sent, it only affects the web page.
- [x] **A date that doesn't exist (e.g. `31/02/1990`) is not turned into a different date.** The round-trip check is at `json-parser.ts:160-161`. Tested at `json-parser.test.ts:567-570` (`31/02/1990`, `29/02/1991`, `00/01/1990`, `13/13/1990` all give `null`). The PDF and Excel print the impossible value as sent (`sjp-press-list-excel-generator.test.ts:165-174`).
- [x] **A date of birth that can't be read is shown as it was sent, not as an empty cell, on the web page, PDF and Excel.** Web: `apps/web/src/pages/(list-types)/sjp-press-list/sjp-press-list.njk:196, 206`. PDF: `libs/list-types/sjp-press-list/src/pdf/pdf-generator.ts:43`. Excel: `libs/excel-generation/src/excel/sjp-press-list-excel-generator.ts:46`, all through `accused-date-of-birth.ts:3-7` for the PDF and Excel. Decision 5 in plan.md: when there is no DOB at all, the cell is empty on every output (the age is not shown alone). That is a deliberate departure from PIP, and it doesn't conflict with this AC, which is about values that are sent but can't be read.
- [x] **Unit tests in `json-parser.test.ts` cover each row of the table above. The web page, PDF and Excel tests cover the unreadable-value case.** Parser table at `json-parser.test.ts:557-588` (every ticket row: `13/01/1990`, `1990-01-13`, `01-01-1901`, `01-02-1990`, `13-01-1990`, `31/02/1990`, `unknown`). Web: `sjp-press-list.njk.test.ts:531-535`. PDF: `pdf-generator.test.ts:105, 140` (proves the raw value is passed; see suggestion 1 on the value assertion). Excel: `sjp-press-list-excel-generator.test.ts:154-163`.

Tally: 5 met, 0 partial, 0 not met.

## Next Steps

- [ ] Address critical issues (none)
- [ ] Fix high priority items (none)
- [ ] Consider suggestions: especially 1 (PDF mock), 2 (TZ-sensitive midnight test) and 3 (age 0 on the web page)
- [ ] Re-run tests after fixes, and run the extended `sjp-press-list.spec.ts` in CI, since it couldn't be run locally

## Overall Assessment

**APPROVED**

The fix is correct, minimal and matches the ticket and the decisions in plan.md. Coverage is above 80% in every changed workspace, all acceptance criteria are met, and the security posture of the DOB cell has improved (`text:` rendering on the web page, formula sanitising kept in the Excel). The suggestions are optional improvements to test strength and consistency between outputs.
