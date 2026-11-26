# #1366: SJP press list date of birth is sometimes wrong, swapped or missing

## 1. Technical Approach

The fault is in one function, `parseDateOfBirth` in `libs/list-types/common/src/sjp/json-parser.ts`. It turns the `dateOfBirth` string into a `Date`, and the web page, PDF and Excel all format that `Date`. The fix has two parts:

1. **Strict parsing.** Rewrite `parseDateOfBirth` so it only accepts formats it can read without guessing, checks that the date exists, and returns `null` for anything else. It must never return a different date from the one sent.
2. **Show the value as sent where PIP did.** `SjpCasePress` already holds the original string as `rawDateOfBirth` (done on `feature/1366-sjp-press-dob`, commit 363650a2).
   - **Excel and PDF** print `rawDateOfBirth` exactly as sent, plus ` (age)`, or `(age)` alone when there is no DOB. PIP does this for both (`pip-data-management` `SjpPressListFileConverter.getAccusedDob` and `templates/sjpPressList.html`). The Excel already does it. The PDF switches to the same shared formatter.
   - **Web page** shows the parsed date (`1 January 1990`) when `dateOfBirth` is set, otherwise `rawDateOfBirth` as sent. PIP's web page was the only output that parsed the date, and it showed "Invalid DateTime" for anything it couldn't read. Falling back to the value as sent is a safer version of the same behaviour.

### What original CaTH (PIP) does

Checked in `hmcts/pip-frontend`, `hmcts/pip-data-management` and `hmcts/pip-publication-services`:

- **Web** (`pip-frontend` `SjpPressListService.ts:139`): `DateTime.fromISO(dob.split('/').reverse().join('-')).toFormat('d MMMM yyyy')`. It assumes `dd/MM/yyyy`, and ISO works only by accident. A dash format or an impossible date shows "Invalid DateTime".
- **PDF and Excel** (`pip-data-management` `SjpPressListFileConverter.java:258` and `:280-290`, `sjpPressList.html:153`): they never parse the date. They print the value as sent plus the age.
- **Test data:** every SJP press fixture in all three repos uses `dd/MM/yyyy` (`01/01/1801`, `01/01/1800`, `01/01/1980`). None uses dashes.
- **Schema:** PIP's `single_justice_procedure_press.json` has the same `01-01-1901` example and no format constraint. Ours copied it, so the example is documentation, not evidence of the feed format.

Conclusion: the live feed almost certainly sends `dd/MM/yyyy`. A dash format would have shown "Invalid DateTime" on every PIP press list web page. Problems 1 and 2 in the ticket probably don't happen with live data today. The main value of this ticket is that values the parser can't read are no longer lost or changed.

### Already done on `feature/1366-sjp-press-dob` (363650a2)

- `SjpCasePress.rawDateOfBirth: string | null` added in `libs/list-types/common/src/sjp/sjp-service.ts` and set in `transformHearingToCase` (`json-parser.ts`).
- The SJP press Excel (`libs/excel-generation/src/excel/sjp-press-list-excel-generator.ts`) writes `rawDateOfBirth` as sent, plus ` (age)`, or `(age)` alone when there is no DOB, and passes the cell through `sanitiseCellValue`.
- Excel tests cover the value as sent, Welsh locale, no age, an unreadable value (`unknown`), an impossible date (`31/02/1990`), a value starting with a formula character, and no DOB.
- `json-parser.test.ts` and `sjp-service.test.ts` fixtures include `rawDateOfBirth`.

All remaining work builds on that branch. No change to the type is needed, so the web page, PDF and Excel stay compatible.

### Key decisions

- **No new dependency.** The ticket suggests Luxon, but `@hmcts/list-types-common` doesn't declare `luxon` in its `package.json` (it's only resolved through hoisting from `rendering/date-formatting.ts`). Use the same approach as `validateDateFormat` in `libs/list-types/common/src/conversion/excel-to-json.ts`: an anchored regex for each accepted format, then build `new Date(year, month - 1, day)` and confirm day, month and year match. This is about 20 lines, needs no dependency and is easy to test. If the team prefers Luxon, add `luxon` to the package's `dependencies` at the version the other list-type libs use; the behaviour and tests stay the same.
- **Local midnight for every format.** Today ISO strings go through `new Date("1990-01-13")`, which is UTC midnight, while `dd/MM/yyyy` builds local midnight. Building every result with `new Date(y, m - 1, d)` means the web page's `date` filter can't move the day back in a timezone behind UTC.
- **Day-first for dashes, kept as a defensive extra.** The PIP evidence says the feed sends `dd/MM/yyyy`, so `d-M-yyyy` should never appear in practice. It is still read day first, using one regex, because the schema example uses that format and reading it month first is the bug in the ticket. It only affects the web page, because the PDF and Excel print the value as sent.
- **`determineListType` is unchanged.** It only checks whether `dateOfBirth` is present, so a list with an unreadable DOB is still a press list.
- **The PDF prints the value as sent, as PIP did.** This removes the PDF's own `toLocaleDateString` formatting (`01 January 1990`, always English). The web and PDF formats no longer differ, and Welsh PDFs no longer get English month names. The web page keeps `1 January 1990`.
- **One shared formatter for the PDF and Excel.** Move `formatDateOfBirth(rawDateOfBirth, age)` out of `sjp-press-list-excel-generator.ts` into `@hmcts/list-types-common` (`libs/list-types/common/src/sjp/`) as `formatAccusedDateOfBirth`. Export it and use it in both places. Both packages already depend on `@hmcts/list-types-common`.

## 2. Implementation Details

TEMPLATE SOURCE: n/a

This bug fix changes an existing parser and the web, PDF and Excel outputs that already use it. No page is added and no wireframe applies.

### Files

| File | Change |
|---|---|
| `libs/list-types/common/src/sjp/json-parser.ts` | Rewrite `parseDateOfBirth` (strict formats plus round-trip check, `null` otherwise). `rawDateOfBirth` is already set; trim it so leading or trailing whitespace isn't shown. |
| `libs/list-types/common/src/sjp/json-parser.test.ts` | Table-driven test with one row per row of the ticket table, plus the extra edge cases below. |
| `apps/web/src/pages/(list-types)/sjp-press-list/sjp-press-list.njk` (line 205) | Show the formatted `dateOfBirth` when it's set, otherwise `rawDateOfBirth`, then the age suffix. Switch the cell from `html:` to `text:` so a raw value is escaped. Nothing in the cell needs HTML. |
| `apps/web/src/pages/(list-types)/sjp-press-list/sjp-press-list.njk.test.ts` | Add `rawDateOfBirth` to the `buildCase` fixture type. Add cases for an unreadable value shown as sent, and for a value containing markup being escaped. |
| `libs/list-types/common/src/sjp/accused-date-of-birth.ts` (plus `index.ts` export) | New `formatAccusedDateOfBirth(rawDateOfBirth, age)`, moved from the Excel generator. It returns the value as sent with a ` (age)` suffix, or `(age)` alone when there's no DOB. Co-located test. |
| `libs/list-types/sjp-press-list/src/pdf/pdf-generator.ts` | Delete the local `formatDateOfBirth` and set `formattedDob: formatAccusedDateOfBirth(c.rawDateOfBirth, c.age)`. |
| `libs/list-types/sjp-press-list/src/pdf/pdf-generator.test.ts` | Change the existing expectations from the `15 March 1985 (40)` style to the value as sent. Add cases for an unreadable DOB (`unknown (35)`) and for `(age)` alone. Update fixtures to include `rawDateOfBirth`. |
| `libs/excel-generation/src/excel/sjp-press-list-excel-generator.ts` | Replace the local `formatDateOfBirth` with the shared helper. Behaviour is unchanged and the existing Excel tests stay as they are. |
| `apps/web/src/pages/(list-types)/sjp-press-list/index.test.ts` | Update the mocked `SjpCasePress` fixture to include `rawDateOfBirth` if type checking needs it. |

The web template change touches `apps/web`, because that's where the existing SJP press page lives. No business logic moves there; the template only chooses between two fields that are already provided.

### Parser behaviour

Accepted inputs, after `trim()`:

| Pattern | Format | Example |
|---|---|---|
| `^(\d{1,2})/(\d{1,2})/(\d{4})$` | `d/M/yyyy`, which also covers `dd/MM/yyyy` | `13/01/1990`, `1/2/1990` |
| `^(\d{4})-(\d{2})-(\d{2})$` | ISO `yyyy-MM-dd` | `1990-01-13` |
| `^(\d{1,2})-(\d{1,2})-(\d{4})$` | `d-M-yyyy`, read day first (safety net) | `01-02-1990` gives 1 February 1990 |

After matching, build `new Date(year, month - 1, day)` and return it only if `getFullYear()`, `getMonth()` and `getDate()` equal the input. Anything else returns `null`, including ISO date-times, 2-digit years and free text. The original string is still available as `rawDateOfBirth`.

Sketch:

```ts
const DOB_FORMATS: Array<{ pattern: RegExp; order: "dmy" | "ymd" }> = [
  { pattern: /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/, order: "dmy" },
  { pattern: /^(\d{4})-(\d{2})-(\d{2})$/, order: "ymd" },
  { pattern: /^(\d{1,2})-(\d{1,2})-(\d{4})$/, order: "dmy" }
];
```

### API / database

- No API endpoint changes.
- No Prisma schema changes.
- No JSON schema change in this ticket. Adding a `pattern` to `dateOfBirth` in `libs/list-types/sjp-press-list/src/schemas/sjp-press-list.json` (and the delta schema) waits on open question 2. It would reject uploads, so it needs a decision first.

## 3. Error Handling and Edge Cases

| Input | `dateOfBirth` | `rawDateOfBirth` | Web | PDF and Excel |
|---|---|---|---|---|
| Missing or `""` | `null` | `null` | `(age)` or empty | `(age)` or empty |
| Whitespace only `"  "` | `null` | `null` after trim | Empty | Age only |
| `" 13/01/1990 "` | 13 Jan 1990 | `13/01/1990` | `13 January 1990` | `13/01/1990` |
| `31/02/1990`, `29/02/1991`, `00/01/1990`, `13/13/1990` | `null` | as sent | As sent | As sent |
| `29/02/1992` (leap year) | 29 Feb 1992 | as sent | `29 February 1992` | As sent |
| `1990-01-13T00:00:00Z` (ISO date-time) | `null` (not an accepted format) | as sent | As sent | As sent |
| `01/02/90` (2-digit year) | `null` | as sent | As sent | As sent |
| `unknown` | `null` | `unknown` | `unknown` | `unknown` |
| Value containing `<` or `&` | `null` | as sent | Escaped text (`text:` in the summary list) | PDF: Nunjucks autoescape. Excel: text cell |
| Value starting with `=`, `+`, `-`, `@` | `null` | as sent | Shown as is | PDF: as is. Excel: prefixed with `'` by `sanitiseCellValue` (open question 3) |

- `parseDateOfBirth` must not throw. Remove the `try/catch`, since regex matching and `new Date(y, m, d)` can't throw.
- Age is kept separate from the DOB. A DOB that can't be read still gets ` (age)` on every output, the same as a parsed one.
- Future dates and implausibly old dates are not rejected. The parser checks that a date exists, not whether it's likely, and the list shows what the feed sent.
- The web DOB filter, sorting and pagination don't use DOB, so they're unaffected.

## 4. Acceptance Criteria Mapping

| AC | How it is satisfied | Verified by |
|---|---|---|
| `dd/MM/yyyy`, `d/M/yyyy` and ISO `yyyy-MM-dd` parsed correctly | First two patterns in `DOB_FORMATS`, built as local midnight | `json-parser.test.ts` table rows `13/01/1990`, `1/2/1990`, `1990-01-13` |
| `dd-MM-yyyy` read day first (kept as a safety net; PIP evidence says the feed uses `dd/MM/yyyy`) | Third pattern, `dmy` order | Table rows `01-01-1901`, `01-02-1990` (1 Feb), `13-01-1990` (13 Jan) |
| An impossible date isn't turned into a different date | Round-trip day/month/year check returns `null` | Table rows `31/02/1990`, plus `29/02/1991` and `13/13/1990` |
| A DOB that can't be read is shown as sent on web, PDF and Excel | The web template falls back to `rawDateOfBirth`. The PDF and Excel always print it through the shared formatter (Excel done in 363650a2) | `sjp-press-list.njk.test.ts`, `pdf-generator.test.ts`, `sjp-press-list-excel-generator.test.ts` (done) |
| Parser tests cover each table row; web, PDF and Excel tests cover the unreadable value | One `it.each` table in `json-parser.test.ts`; one unreadable-value test per output | As above |

## 5. Test Scenarios

Unit tests (Vitest, co-located, AAA):

1. **Parser: date of birth formats (table-driven).** One `it.each` in `json-parser.test.ts` runs `extractPressCases` on each input and asserts `dateOfBirth` (as y/m/d or `null`) and `rawDateOfBirth`. Rows: every row of the ticket table (`13/01/1990`, `1990-01-13`, `01-01-1901`, `01-02-1990`, `13-01-1990`, `31/02/1990`, `unknown`), plus `1/2/1990`, `29/02/1992`, `29/02/1991`, `1990-01-13T00:00:00Z`, `01/02/90`, `" 13/01/1990 "`, `""` and a missing field.
2. **Parser: list type unaffected.** A press list whose first accused has DOB `unknown` is still `determineListType` = `press`.
3. **Web page: DOB shown as sent when unreadable.** In `sjp-press-list.njk.test.ts`, a case with `dateOfBirth: null` and `rawDateOfBirth: "unknown"`, `age: 35` renders `unknown (35)` in the DOB row. Existing tests still show a parsed date as `15 March 1985 (40)` and an empty cell when both are null.
4. **Web page: raw DOB is escaped.** `rawDateOfBirth: "<b>x</b>"` renders as text, not markup.
5. **Shared formatter.** The `formatAccusedDateOfBirth` tests move with the function and cover: value plus age, value without age, `(age)` alone, and both missing.
6. **PDF: DOB as sent.** In `pdf-generator.test.ts`, a DOB that parses still comes out as sent (`15/03/1985 (40)`), and an unreadable one comes out as `unknown (35)`.
7. **Excel: DOB as sent.** Done in 363650a2, covering unreadable, impossible, formula-prefixed, no age and no DOB. These tests must still pass after the switch to the shared helper.

E2E (Playwright, one journey): the existing `e2e-tests/tests/sjp-press-list.spec.ts` journey uses ISO DOBs. Extend that journey rather than adding a new spec: give one seeded accused a `dd/MM/yyyy` DOB and one an unreadable DOB, then assert both show correctly on the page. Check the existing journey's assertions still pass.

## 6. CLARIFICATIONS NEEDED

1. ~~**What format does the real SJP feed send for `dateOfBirth`?**~~ **Answered from PIP** (see "What original CaTH (PIP) does"): almost certainly `dd/MM/yyyy`. The day-first dash pattern stays as a cheap defensive extra, and the ticket is low urgency. Only a real payload or the feed owner can confirm it for certain. A quick check with them is worthwhile, but it doesn't block implementation.
2. **Should the schema define a format for `dateOfBirth`?** This is open question 2 in the ticket. A `pattern` would reject bad values at upload, for both `SJP_PRESS_LIST` and `SJP_DELTA_PRESS_LIST`. It's left out of this plan because it changes what uploads succeed, which could reject live feeds. If the feed owner confirms `dd/MM/yyyy` (question 1), a `dd/MM/yyyy` pattern becomes a reasonable follow-up.
3. **Should the Excel DOB keep `sanitiseCellValue`?** This comes from the ticket comment. With it, a value starting with `=`, `+`, `-` or `@` gets a visible `'` prefix. PIP writes the cell as plain text, and ExcelJS strings are already text cells. Keeping it is the safe default; removing it would match PIP exactly.
4. **Should the web page show Welsh month names on Welsh lists?** Printing the value as sent in the PDF, as PIP did, removes the PDF format mismatch. The web page still shows `1 January 1990` in English on Welsh lists, as PIP's web page did.
5. **Should the web page show `(age)` alone when there's no DOB?** The PDF and Excel now do, matching PIP's PDF and Excel. The web page shows nothing when the DOB is missing, even if an age is present.
6. **Should Luxon be used instead of the regex check?** If so, `luxon` needs adding to `@hmcts/list-types-common`'s `dependencies`. It's imported there today but not declared.

### Decisions on the clarifications (2026-11-23)

2. Schema format: out of scope, raised as a separate ticket.
3. Keep `sanitiseCellValue` on the Excel DOB, for consistency with every other CaTH Excel generator.
4. Web page keeps English month names; Welsh month names raised as a separate ticket.
5. Revised after PR review (2026-11-24): with no DOB but an age, every output shows `(age)` alone, matching PIP on the web page (`single-justice-procedure-press.njk`, `age > 0`), the PDF (`sjpPressList.html`) and the Excel (`SjpPressListFileConverter.getAccusedDob`). `formatAccusedDateOfBirth(null, 35)` returns `(35)`. With neither, the cell is empty.
6. Regex check kept; no Luxon dependency.
