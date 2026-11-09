# Plan: #1184 Excel downloads use one date format (`d MMMM yyyy`)

## 0. What was actually built (updated 9 November 2026, read this first)

Product answered the clarifications in section 7 after this plan was written. Their answers change the approach: **only the Excel changes**, and the PDF and HTML keep their current dates. Where this section disagrees with the rest of the plan, this section is right. Sections that no longer apply are marked *superseded*.

| # | Decision |
|---|---|
| 1 | The differences from PIP are accepted |
| 2 | Excel only. The shared renderers, and so the PDF and HTML, are unchanged |
| 3 | No time-zone change. Magistrates Standard timestamps are still read in UTC (hearings never fall in the affected hour) |
| 4 | The Crown Advance subscription email keeps `dd/MM/yyyy` |
| 5 | Crown Firm keeps the weekday in the Excel (`Monday 5 January 2026`), matching PIP, which writes the same `EEEE dd MMMM yyyy` sitting date into its Excel as into the PDF and HTML (`CrownPddaListHelper.formatSittingDate`, `CrownFirmPddaListFileConverter.getExcelRows`). Reversed on 9 November 2026 and confirmed by Junaid (ticket author) by phone; it was "drop the weekday, in the Excel only" |
| 6 | Free-text uploaded cells, including any that Excel stored as a date, are written as they are |
| 7 | SJP press DOB is written to the Excel as sent, followed by ` (age)`, or just `(age)` when there is no DOB. This matches PIP (`SjpPressListFileConverter.getAccusedDob`, and a PIP-generated Excel showing `01/01/1800 (50)`). Values the parser can't read, or would roll over (`31/02/1990`), are therefore never lost or changed in the Excel. Decided on 9 November 2026; it was "format as `d MMMM yyyy`, accept the parser's edge cases" |
| 8 | Magistrates Adult `def_dob` is `dd/MM/yyyy` only, as PIP's schema requires. CaTH's schema gets the same pattern |

**How it works now.** Each list type's `excel/excel-generator.ts` takes the date its renderer already produces and converts it with a shared helper from `libs/list-types/common/src/rendering/date-formatting.ts`:

| List type | Excel generator converts | With |
|---|---|---|
| Magistrates Standard | DOB, plea, conviction and adjourned dates (renderer gives `dd/MM/yyyy`) | `formatDdMmYyyyDate` |
| Crown Advance | Fixed for (renderer gives `dd/MM/yyyy`) | `formatDdMmYyyyDate` |
| Magistrates Adult | `def_dob` (renderer passes it through raw; the schema now requires `dd/MM/yyyy`) | `formatDdMmYyyyDate` |
| SJP Press | Nothing: the parser now also returns the raw `rawDateOfBirth` string, which the Excel writes as sent with ` (age)` | none |

- `formatDdMmYyyyDate` is hardened as in section 2.1: anything that isn't a whole, valid `d/M/yyyy` date comes back unchanged.
- Crown Firm is unchanged: its Excel writes the renderer's `day` heading (`Monday 5 January 2026`, Welsh weekday and month in Welsh publications), as PIP does. No `formatIsoDisplayDate` helper is added.
- **One exception to Excel only:** the Magistrates Standard renderer's `formatDateFromIso` now returns its input when the date doesn't exist (`2025-13-01T00:00:00Z`, `2025-02-31T00:00:00Z`). The schema only checks the shape of plea, conviction and adjourned dates, so these can arrive. Valid dates come out exactly as before; only this bad data changes in the PDF and HTML (it used to show `NaN/NaN/NaN` or a wrong date).
- **How AC1 and AC4 fit together:** real dates always come out as `d MMMM yyyy`. A value that isn't a real date (e.g. `31/02/2026`, `TBC`) is written as it was sent, as AC4 requires.
- **Tests:** each changed generator's `excel-generator.test.ts` checks the formatting with the real helpers. A new `excel-generator-with-renderer.test.ts` per list type runs the real renderer into the generator and checks each date's column.

## 1. Technical Approach

### What we are doing

Every date in a list-type Excel download should read like `20 October 2026` (unpadded day, full month name, four-digit year). A Welsh publication should get Welsh month names, e.g. `20 Hydref 2026`.

The code already has a shared helper for this in `@hmcts/list-types-common`. Most list types already use it. Four JSON-driven list types do not. The plan is:

1. Make the shared helpers in `libs/list-types/common/src/rendering/date-formatting.ts` safe: bad input comes back unchanged, and dates never move by a day.
2. Add one shared helper for ISO date strings (`1990-01-13`, `2025-01-10T00:00:00Z`).
3. Point the four list types that still produce `dd/MM/yyyy` (or raw text) at the shared helpers, and delete their private date code.

### How the code is wired (read this first)

- **The Excel is built once, at publication time.** `processPublication` in `libs/publication/src/processing/service.ts` calls the generator in `EXCEL_GENERATOR_REGISTRY`, and the file is stored as `{artefactId}.xlsx`. The language comes from the publication, not the person downloading it: `locale = language === "WELSH" ? "cy" : "en"` (`libs/api/src/blob-ingestion/repository/service.ts:171`, and the same line in both admin upload summary pages). Bilingual publications get English. Adding `?lng=cy` to a download URL serves the same file.
- **JSON list types** (Magistrates Standard, Crown Advance, Magistrates Adult) use a `rendering/renderer.ts`. The Excel generator, the PDF generator and the web page all call that same renderer, so dates are formatted in one place for all three outputs.
- **SJP press lists** have their own Excel generator in `libs/excel-generation`. The HTML page formats the date separately, with a Nunjucks `date` filter.
- **Uploaded-workbook list types** (RCJ, admin courts, COA Civil, SSCS, the weekly tribunal lists and others) copy the uploaded spreadsheet through `reformatUploadedWorkbook`. Each list type's `formatRow` callback controls any formatting.

### Key decisions

| Topic | Decision | Why |
|---|---|---|
| Format | `d MMMM yyyy`, unpadded day (open question 5) | Matches the ticket, PIP's non-strategic lists, and what CaTH's weekly lists already produce |
| Welsh | Welsh month names in Welsh publications (open question 4) | CaTH already does this for Crown Firm, COA Civil and 9 weekly-list reformatters (16 list types). Switching to English would be a regression |
| Date of birth | Long format too (open question 2): `1 January 1990`, `1 January 1990 (35)` on SJP | The acceptance criteria say *every* date |
| Crown Firm weekday | Kept in the Excel, PDF and HTML (decision 5, matching PIP) | Product decision |
| Uploaded text cells (open question 3) | No change | Every uploaded column that is a date is already validated as `dd/MM/yyyy` at upload and converted to the long format. Free-text columns are left as typed so the Excel keeps matching the PDF (see section 2.6) |
| PDF and HTML | **Superseded:** unchanged (decision 2). Dates are converted in each Excel generator instead | Product decision |
| Time zone | **Superseded:** unchanged, timestamps are still read in UTC (decision 3) | Hearings never fall in the hour where UTC and London dates differ |
| Crown Advance subscription email | Not changed (see Clarifications) | The ticket is about Excel downloads. The email is a separate output that people may already rely on |

No database, API, locale-file or template changes are needed. Welsh month names come from the ICU data built into Node (`Intl`/Luxon). I checked this in the container: Luxon `cy` gives `Ionawr ... Rhagfyr` for all 12 months.

## 2. Implementation Details

TEMPLATE SOURCE: n/a

### 2.1 Shared helpers: `libs/list-types/common/src/rendering/date-formatting.ts`

**Harden `formatDdMmYyyyDate(value, locale)`.** Today it calls `split("/")` and `new Date(y, m - 1, d)` without any checks, which causes three problems:
- Anything that is not `dd/MM/yyyy` (including `""`) produces the text `Invalid Date`.
- `31/02/2025` rolls over silently to `3 March 2025`.
- If you call it a second time on its own output, you get `Invalid Date`.

New behaviour:

```typescript
const DAY_MONTH_YEAR_PATTERN = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;

export function formatDdMmYyyyDate(ddMMyyyyDate: string, locale: string): string {
  const match = DAY_MONTH_YEAR_PATTERN.exec(ddMMyyyyDate.trim());
  if (!match) return ddMMyyyyDate;

  const [, day, month, year] = match;
  const date = DateTime.fromObject({ year: Number(year), month: Number(month), day: Number(day) }, { zone: "utc" });
  if (!date.isValid) return ddMMyyyyDate;

  return date.setLocale(locale === "cy" ? "cy" : "en-GB").toFormat("d MMMM yyyy");
}
```

- Use a new constant name. `DD_MM_YYYY_PATTERN` already exists in `conversion/validators.ts` and is stricter (two digits only), because it is used for upload validation. Do not touch that one.
- Existing callers (9 weekly-list reformatters and their 9 renderers, COA Civil `formatFutureJudgment`, Magistrates Public Adult `printdate`) all pass validated `dd/MM/yyyy`, so their output does not change. The only difference is that bad input now comes back unchanged instead of becoming `Invalid Date`.

**Add `formatIsoDisplayDate(isoDate, locale)`** for ISO date and datetime strings:

```typescript
export function formatIsoDisplayDate(isoDate: string, locale: string): string {
  const date = DateTime.fromISO(isoDate, { zone: "Europe/London" });
  if (!date.isValid) return isoDate;
  return date.setLocale(locale === "cy" ? "cy" : "en-GB").toFormat("d MMMM yyyy");
}
```

- A date-only string such as `1990-01-13` is read as midnight London time on that day, so it always gives `13 January 1990`, whatever time zone the container runs in.
- A UTC timestamp such as `2025-07-09T23:00:00Z` (midnight on 10 July, BST) gives `10 July 2025`.
- `""` and junk are returned unchanged, because `fromISO` reports them as invalid.
- Checked in the container: `"2026-10-20"`/cy gives `20 Hydref 2026`, `"2026-10-05"`/en gives `5 October 2026`, `"2025-07-09T23:00:00Z"` gives `10 July 2025`, and `"not a date"` gives `not a date`.

Export `formatIsoDisplayDate` from `libs/list-types/common/src/index.ts` (line 83, next to the existing date exports).

`formatDisplayDate`, `formatLastUpdatedDateTime`, `formatHHMMTime` and `normalizeTime` stay as they are.

### 2.2 `MAGISTRATES_STANDARD_LIST`: `libs/list-types/magistrates-standard-list/src/rendering/renderer.ts`

*Superseded by section 0: the renderer is not changed; the Excel generator does the formatting.*

- Delete the private `formatDateFromIso` (line 276). It formats with `getUTC*` and `padStart`, and turns bad input into `NaN/NaN/NaN`.
- `buildIndividualPartyInfo(details, _locale)` (line 179): rename `_locale` to `locale` and set `dob: details.dateOfBirth ? formatIsoDisplayDate(details.dateOfBirth, locale) : ""`.
- `processOffences(party, _locale)` (line 215): rename the parameter the same way and use `formatIsoDisplayDate(..., locale)` for `pleaDate`, `convictionDate` and `adjournedDate` (lines 221 to 223).
- Import `formatIsoDisplayDate` from `@hmcts/list-types-common`. The package already depends on it.
- The Excel generator (`excel/excel-generator.ts:126`), PDF template (`pdf/pdf-template.njk:155`) and web template build the adjourned cell as `{date} - {t.adjournedText}`, which still works and gives `6 January 2025 - ...`.

The schema (`schemas/magistrates-standard-list.json`) matters here. `dateOfBirth` is date-only (`1901-01-01`). `pleaDate`, `convictionDate` and `adjournedDate` must be full UTC timestamps (`^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$`).

Outputs affected: Excel, PDF, and the web page `apps/web/src/pages/(list-types)/magistrates-standard-list/`.

### 2.3 `CROWN_ADVANCED_PDDA_LIST`: `libs/list-types/crown-advanced-pdda-list/src/rendering/renderer.ts`

*Superseded by section 0: the renderer is not changed; the Excel generator does the formatting.*

- `processCase` (line 109) does not receive `locale` today. Add a `locale` parameter, pass `options.locale` from both call sites (lines 45 and 58), and set `fixedFor: formatIsoDisplayDate(fixedDate ?? "", locale)`. `FixedDate` is `"format": "date"` in the schema.
- **Fix the sort (lines 65 to 71). The tech spec does not mention this.** It currently sorts each category by turning `fixedFor` back into a date with `split("/").reverse().join("-")`. Once `fixedFor` reads `13 January 2025`, that stops working:
  - English happens to work only because V8's `Date` parser accepts `13 January 2025`.
  - Welsh breaks: `new Date("13 Ionawr 2025")` is `NaN`, so the sort order becomes unpredictable.

  Sort on the raw `FixedDate` instead. Collect `{ sortKey, row }` pairs in `categoryMap`, where `sortKey` is `DateTime.fromISO(fixedDate).toMillis()`, or `0` when the date is missing or invalid (rows with no date still go first, as today). Sort by `sortKey`, then map to rows. `CrownAdvanceCaseRow` in `models/types.ts` stays the same.
- Leave the local `formatLongDate` (header date range) alone. It is not part of this ticket.
- Leave `src/date-formatting.ts` and `src/email-summary/summary-builder.ts` alone for now. The email still shows `dd/MM/yyyy` (see Clarifications). If product wants the email changed too: switch `summary-builder.ts:11` to `formatIsoDisplayDate(fixedDate ?? "", "en")` (the email labels are English-only), delete `src/date-formatting.ts`, and update `summary-builder.test.ts` lines 51, 359 and 366.

Outputs affected: Excel, PDF, and the web page `crown-advance-list`.

### 2.4 `MAGISTRATES_ADULT_COURT_LIST_DAILY` / `_FUTURE`: `libs/list-types/magistrates-adult-court-list/src/rendering/renderer.ts`

*Superseded by section 0: the renderer is not changed; the Excel generator does the formatting.*

- Line 182: change `dateOfBirth: c.def_dob ?? ""` to `dateOfBirth: formatDdMmYyyyDate(c.def_dob ?? "", locale)`. `transformCase` already receives `locale`.
- The schema does not constrain `def_dob` at all, and the only fixture uses `01/01/1990`. Thanks to the hardened helper, anything that is not `d/M/yyyy` passes through unchanged, as it does today.

Outputs affected: Excel, PDF, and the web page `magistrates-adult-court-list`.

### 2.5 `SJP_PRESS_LIST` / `SJP_DELTA_PRESS_LIST`: `libs/excel-generation/src/excel/sjp-press-list-excel-generator.ts`

- Line 46: pass `locale` in, as `formatDateOfBirth(sjpCase.dateOfBirth, sjpCase.age, locale)`. `generateSjpPressListExcel` already takes `locale`.
- Line 71: replace the hand-written `padStart` body with `formatDisplayDate(dob, locale)`, and keep the ` (age)` suffix.
- `dob` is a `Date` built by `parseDateOfBirth` in `libs/list-types/common/src/sjp/json-parser.ts:134`. Do not change that parser in this ticket. It also feeds the HTML page.

Output affected: Excel only. The SJP press HTML page uses its own `date` filter and does not change.

### 2.6 Uploaded-workbook list types: no code change

The ticket and tech spec propose a new display-only read path inside `uploaded-workbook-reformatter.ts`, plus a `locale` argument on `reformatUploadedWorkbook` for four callers. After checking the code, I am not doing this:

- **The date columns are already compliant.** Only 10 uploaded configs (17 list types) have a date column: the `date` field of CST, CIC, PHT, GRC, WPAFCC, FTT Tax, FTT LR, FTT RPT (covers 6 list types) and SIAC/POAC/PAAC (covers 3), plus the COA Civil future-judgments `Date`. Every one is validated as `dd/MM/yyyy` at upload (`validateDateFormat(DD_MM_YYYY_PATTERN, ...)`), and the upload is converted and validated *before* the reformatter runs (`non-strategic-upload-summary/index.ts:135`). Each reformatter's `formatRow` already calls `formatDdMmYyyyDate(row.date, locale)`, so the Excel already says `2 January 2025` / `2 Ionawr 2025`. `pht-weekly-hearing-list/src/excel/excel-reformatter.test.ts:105-106` already tests this.
- **RCJ ×8, London Administrative Court, the four regional admin courts, SSCS ×7, SEND, AST, Interim Applications and BPD Rolls Building have no date column.** Their fields are Venue, Judge, Time, Case Number, Case Details, Hearing Type, Additional Information (or similar). The spec's "RCJ Date column" before/after diagram does not match any real config.
- **The only gap left** is a free-text cell (for example Additional Information) that Excel stored as a real date. `readCellValue` turns it into `15/01/2025`, and it shows that way in the JSON, the PDF and the HTML too. If the Excel reformatted it on its own, the Excel would disagree with the PDF, which every reformatter comment says it must not do. This is listed in Clarifications.

The hardened `formatDdMmYyyyDate` does help this path: any unexpected value in a validated date column would now come out unchanged rather than as `Invalid Date`.

`formatDateValue` / `readCellValue` in `libs/list-types/common/src/conversion/excel-to-json.ts` are **not changed**. They feed upload validation and the JSON output.

### 2.7 `CROWN_FIRM_PDDA_LIST`: no change

`formatSittingDate` (`libs/list-types/crown-firm-list/src/rendering/renderer.ts:62`) already gives `Monday 5 January 2026`, unpadded, with Welsh weekday and month names. Decision 1 keeps the weekday.

### 2.8 Files touched

*Superseded by section 0: see section 0 for how each list type is handled. The renderer files listed here were not changed, and `formatIsoDisplayDate` was not added.*

| File | Change |
|---|---|
| `libs/list-types/common/src/rendering/date-formatting.ts` | Harden `formatDdMmYyyyDate`; add `formatIsoDisplayDate` |
| `libs/list-types/common/src/rendering/date-formatting.test.ts` | New cases |
| `libs/list-types/common/src/index.ts` | Export `formatIsoDisplayDate` |
| `libs/list-types/magistrates-standard-list/src/rendering/renderer.ts` (+ `.test.ts`) | Use shared helper with locale; delete `formatDateFromIso` |
| `libs/list-types/crown-advanced-pdda-list/src/rendering/renderer.ts` (+ `.test.ts`) | Use shared helper with locale; sort on raw `FixedDate` |
| `libs/list-types/magistrates-adult-court-list/src/rendering/renderer.ts` (+ `.test.ts`) | Format `def_dob` |
| `libs/excel-generation/src/excel/sjp-press-list-excel-generator.ts` (+ `.test.ts`) | Locale-aware long DOB |
| `excel/excel-generator.test.ts` in the three list types above | Update fixture strings only (see section 5) |

No `apps/` source changes. No `.njk` changes.

## 3. Error Handling & Edge Cases

*Partly superseded by section 0: timestamps are read in UTC, not Europe/London (decision 3), and Crown Advance sorting is unchanged because its renderer is unchanged. The other rows still hold.*

| Case | Behaviour | Where |
|---|---|---|
| Unparseable date (`"not-a-date"`, `"TBC"`) | Written unchanged. No throw, no `Invalid Date`, no `NaN/NaN/NaN` | Both shared helpers return their input |
| Empty or missing date | Empty cell | Renderers already guard with `? ... : ""`; both helpers return `""` for `""` |
| Impossible date `31/02/2025` | Written unchanged (today it becomes `3 March 2025`) | `DateTime.fromObject` validity check |
| Calling `formatDdMmYyyyDate` on its own output | Output unchanged | Pattern does not match `20 February 2025` |
| Text that only contains a date (`w/c 15/01/2025 to 17/01/2025`, `CO/1234/2025`) | Unchanged | Anchored pattern `^...$`, day and month are 1 to 2 digits |
| Date-only value in BST or near midnight (`2025-07-15`, `1990-01-01`) | Same calendar day in any container time zone | `fromISO` with `zone: "Europe/London"` reads it as London midnight on that date |
| UTC timestamp at BST midnight (`2025-07-09T23:00:00Z`) | `10 July 2025` (London calendar date) | Today's code shows `09/07/2025`. This changes the day on purpose; see Clarifications |
| Welsh | `20 Hydref 2026`; Welsh Crown Advance rows still sort by date | Locale passed through; sort uses raw ISO |
| Bilingual publication | English, same as today | Locale selection unchanged |
| SJP DOB that cannot be parsed | Empty cell (today's behaviour) | `parseDateOfBirth` returns `null`, so the raw value is already lost before the generator sees it. See Clarifications |
| SJP DOB from the ISO branch (`new Date("1990-01-01")` is UTC midnight) formatted in local time | Correct in UTC and Europe/London containers (the dev container is UTC). Would shift one day only if a container ran west of UTC | Same risk as today; not changed |
| Wider cells | No layout change. Magistrates and Crown Advance use `autoFitColumns`; SJP DOB width 25 fits `30 September 2026 (35)` (22 characters) | n/a |
| Cell type | Stays a text cell. No `numFmt` | Generators still write strings |

Existing artefacts keep their old Excel until they are republished. There is no backfill.

## 4. Acceptance Criteria Mapping

*Partly superseded by section 0: the formatting now happens in each Excel generator. Crown Firm is unchanged and keeps the weekday. See section 0 for how AC1 and AC4 fit together.*

| Acceptance criterion | How it is met | How to check |
|---|---|---|
| Every Excel date uses `d MMMM yyyy`; no padding, no `dd/MM/yyyy`, no ISO | Sections 2.2 to 2.5 move the last four list types to the shared helpers. Section 2.6 shows uploaded lists already comply. Crown Firm already complies | Unit tests (section 5). `grep -rn "padStart\|dd/MM" libs/list-types/*/src libs/excel-generation/src --include=*.ts` shows no date formatting left in render paths, apart from `excel-to-json.ts`, `conversion/` validators, and the Crown Advance email helper if it is kept |
| Welsh months, or English to match PIP, applied everywhere | Welsh chosen. All changed call sites pass the publication locale | A `cy` test case in every affected test file |
| Covers JSON and uploaded-workbook Excel | JSON: sections 2.2 to 2.5. Uploaded: already compliant (section 2.6), with existing tests as evidence | Existing weekly-list reformatter tests stay green |
| Unparseable dates written unchanged; download never fails | Helpers return input; nothing throws | Junk-input unit tests for both helpers and each renderer. SJP gap noted in Clarifications |
| Unit tests updated for each affected generator, including a Welsh case | Renderer tests (which hold the actual dates) plus the SJP Excel test. The generator tests that mock the renderer get updated fixtures | `yarn test` from the repo root |

## 5. Test Scenarios

*Superseded by section 0: the date tests are in each list type's `excel/` folder, not `renderer.test.ts`.*

All tests are Vitest, next to the source files, Arrange-Act-Assert. Important: `excel-generator.test.ts` and `pdf-generator.test.ts` in Magistrates Standard, Crown Advance and Magistrates Adult all `vi.mock("../rendering/renderer.js")`. They cannot see a date-format change, so the real assertions go in `renderer.test.ts`. The generator test fixtures (e.g. `dob: "01/01/1980"`, `fixedFor: "13/01/2025"`) are updated to the new format only so they show realistic output.

No new E2E test. This changes the contents of a generated file, not a user journey, and no existing E2E spec checks these date strings (`e2e-tests/tests/sjp-press-list.spec.ts` checks the HTML page, which does not change).

**S1. Shared helper behaviour** (`libs/list-types/common/src/rendering/date-formatting.test.ts`)
- `formatIsoDisplayDate`: `2026-10-20` gives `20 October 2026` (en) and `20 Hydref 2026` (cy). `2026-10-05` gives `5 October 2026`. `2025-07-15` gives `15 July 2025`. `2025-07-09T23:00:00Z` gives `10 July 2025`. `2025-01-10T00:00:00.000Z` gives `10 January 2025`. `not a date` and `""` come back unchanged.
- `formatDdMmYyyyDate`: existing four tests still pass. `5/10/2026` gives `5 October 2026`. `20/10/2026`/cy gives `20 Hydref 2026`. Calling it on `20 February 2025` returns the same text. `31/02/2025`, `w/c 15/01/2025 to 17/01/2025`, `CO/1234/2025`, `TBC` and `""` come back unchanged.

**S2. Magistrates Standard publication, English and Welsh** (`magistrates-standard-list/src/rendering/renderer.test.ts`)
- Update `pleaDate` at line 339 (`10/01/2025` becomes `10 January 2025`) and any other date expectations.
- DOB `1990-05-15` gives `15 May 1990`.
- Welsh run gives Welsh month names for DOB and plea date.
- An adjourned timestamp at BST midnight gives the London date.
- An individual with no DOB gives `""`. Junk in a date field passes through. An organisation party still gives `""`.

**S3. Crown Advance publication, English and Welsh, with ordering** (`crown-advanced-pdda-list/src/rendering/renderer.test.ts`)
- Update line 116 (`22/11/2025` becomes `22 November 2025`).
- Welsh run gives `22 Tachwedd 2025`.
- **Ordering:** two fixtures in one category with `FixedDate` `2025-12-02` and `2025-11-22`, given in that order, come out November first, in both `en` and `cy`.
- No `FixedDate` gives `""` and the row sorts first. An invalid `FixedDate` passes through unchanged and does not throw.

**S4. Magistrates Adult publication, daily and future** (`magistrates-adult-court-list/src/rendering/renderer.test.ts`)
- Update line 183 (`01/01/1990` becomes `1 January 1990`).
- Welsh gives `1 Ionawr 1990`. `def_dob: "unknown"` comes back unchanged. No `def_dob` gives `""` (line 241 still passes).
- The same renderer serves `_DAILY` and `_FUTURE`, so one set of tests covers both.

**S5. SJP press publication, English and Welsh** (`libs/excel-generation/src/excel/sjp-press-list-excel-generator.test.ts`)
- Rename and update the test at line 123: `01/01/1990 (35)` becomes `1 January 1990 (35)`.
- Welsh gives `1 Ionawr 1990 (35)`. Age `null` gives `1 January 1990`. No DOB gives an empty cell.
- An unparseable DOB string does not throw; the cell is empty (documents today's behaviour).

**S6. Uploaded workbooks: regression only, no edits expected**
- `pht-weekly-hearing-list/src/excel/excel-reformatter.test.ts` (and the other weekly-list reformatter tests) and `court-of-appeal-civil-daily-cause-list/src/excel/excel-reformatter.test.ts:65,80` still pass with `2 January 2025` / `2 Ionawr 2025` / `20 February 2025` / `Chwefror`.
- `libs/list-types/common/src/excel/uploaded-workbook-reformatter.test.ts:191` still expects `15/01/2025` for a real date cell in a free-text column, with an identity `formatRow`. This test documents decision 3. Change it only if product overrules that decision.
- `libs/list-types/common/src/conversion/excel-to-json.test.ts` and `validators.test.ts` pass **without edits**. If they need editing, the change has leaked into upload validation.

**S7. Crown Firm unchanged**
- `crown-firm-list/src/excel/excel-generator.test.ts:158` still expects `Monday 13 January 2025`.

**S8. Full quality gate**
- `yarn lint` and `yarn test` from the repo root.
- Manual check: publish one WELSH-language and one ENGLISH-language artefact of Magistrates Standard, Crown Advance, Magistrates Adult and SJP Press locally. Download each `.xlsx` and confirm the dates are long-format text cells in the right language and that the PDF and HTML show the same date. Publish one payload with a junk date and confirm the Excel is still produced.

## 6. Where the ticket and tech spec are wrong about the code

1. **"Non-strategic weekly lists are not in CaTH's `EXCEL_GENERATOR_REGISTRY` yet": false.** CST, CIC, PHT, GRC, WPAFCC, FTT Tax, FTT LR, SIAC/POAC/PAAC, RPT ×5, FTT RPT Market Rents, AST and SEND are all registered (`libs/publication/src/processing/service.ts:458-546`). The ones with a date column already output `d MMMM yyyy` with Welsh months through `formatDdMmYyyyDate`.
2. **The uploaded-workbook audit row is wrong.** RCJ ×8, London Admin and SSCS have no date column. The spec's "RCJ Date column" diagram is invented. The only uploaded date columns are already compliant (section 2.6).
3. **"All four call sites already have `locale`" / thread `locale` through `reformatUploadedWorkbook`.** There are 19 callers, not 4. All of them already receive `locale` and format dates in `formatRow`, so no new parameter is needed. The spec's `readDisplayCellValue` would also pre-format the date column of 9 weekly-list reformatters (16 list types), not just COA Civil, before their `formatRow` formats it again.
4. **"These are date-only values" (Magistrates Standard).** Only `dateOfBirth` is date-only. `pleaDate`, `convictionDate` and `adjournedDate` are full UTC timestamps under the schema. Formatting them in UTC (the spec's `zone: "utc"`) shows the day before for a BST-midnight timestamp.
5. **Crown Advance sort missing from the spec.** `renderer.ts:65-71` sorts by turning the formatted `fixedFor` back into a date. Changing the format breaks Welsh ordering (`new Date("13 Ionawr 2025")` is `NaN`). English only survives by luck of V8's date parser.
6. **"The renderer already has `locale` in its options" (Crown Advance).** True for `renderCrownAdvanceListData`, but `processCase`, which sets `fixedFor`, has no `locale` parameter. It must be added.
7. **SJP "construction and formatting share a local basis".** Only true for the `dd/MM/yyyy` branch of `parseDateOfBirth`. The ISO branch (`new Date("1990-01-01")`) creates UTC midnight. The schema example is `01-01-1901` (dashes), which V8 reads US-style as month-day, so `13-01-1990` becomes `null` and the DOB is dropped. That is an existing parser issue, outside this ticket.
8. **"Extend each existing Excel generator test to assert the new value."** The Magistrates Standard, Crown Advance and Magistrates Adult Excel (and PDF) tests mock the renderer, so they cannot observe the change. Assertions belong in `renderer.test.ts`.
9. **"Re-download with `?lng=cy`" (manual verification).** The Excel is generated once per publication in the publication's language and stored as `{artefactId}.xlsx`. The `lng` query parameter does not regenerate it. To test Welsh, publish a WELSH-language artefact.
10. **"`formatDdMmYyyyDate` already produces `d MMMM yyyy`" (implementation notes).** True for valid input, but today it returns `Invalid Date` for anything else and silently rolls over impossible dates (`31/02/2025` becomes `3 March 2025`).

Claims I checked and found correct: the line numbers for `formatDateFromIso` (276), its call sites (182, 221 to 223), `formatShortDate`, `summary-builder.ts:11`, Magistrates Adult `def_dob` (182), SJP `formatDateOfBirth` (71), Crown Firm `formatSittingDate` (62), `excel-to-json.ts` `formatDateValue` (146) and the 1899 time-epoch branch, `uploaded-workbook-reformatter.ts:92`, and COA Civil validating `dd/MM/yyyy`.

## 7. CLARIFICATIONS NEEDED (answered, see section 0)

1. **Product sign-off on the PIP differences.** Magistrates Standard, Crown Advance, SJP Press and Magistrates Adult will switch from `dd/MM/yyyy` (what PIP shows) to `d MMMM yyyy`, and Welsh publications will use Welsh months (PIP is English-only). Confirm this is intended so PIP users' reports are not treated as regressions.
2. **PDF and HTML change too** for Magistrates Standard, Crown Advance and Magistrates Adult, because they share one renderer. Is that acceptable? The alternative is an Excel-only flag in three renderers, which would leave two formats inside one publication.
3. **Plea, conviction and adjourned timestamps:** use the London calendar date (this plan) or the UTC date (today's behaviour, and the tech spec's)? They differ only for timestamps between 23:00 and 00:00 UTC during BST. Which does the upstream system send for "midnight"?
4. **Crown Advance subscription email "Fixed for":** keep `dd/MM/yyyy` (this plan, because the ticket is about Excel) or switch to the long format so it matches the download (a one-line change plus three test lines, and `src/date-formatting.ts` can then be deleted)?
5. **Crown Firm weekday:** confirm `Monday 5 January 2026` stays (no change).
6. **Real Excel date cells in free-text uploaded columns** (e.g. Additional Information): leave as `15/01/2025` so the Excel matches the PDF and JSON (this plan), or convert them in all outputs? Converting only in the Excel would make it disagree with the PDF.
7. **SJP unparseable DOB:** today it becomes an empty cell because `parseDateOfBirth` throws the raw value away. Keeping the raw text means changing the shared SJP parser, which also affects the HTML page. Accept the empty cell for this ticket, or raise a follow-up? Related: confirm the real upstream SJP DOB format. The schema example is `01-01-1901`, which the parser misreads.
8. **`def_dob` format for Magistrates Adult:** confirm upstream sends `dd/MM/yyyy`. Anything else will pass through unchanged.
9. **Existing published artefacts** keep their old Excel until republished. Is a regeneration/backfill wanted? If so, it should be a separate ticket.
