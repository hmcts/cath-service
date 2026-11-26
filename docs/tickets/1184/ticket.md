# #1184: Excel downloads: use consistent date format (d MMMM yyyy) across all list types

**State:** OPEN
**Assignees:** HarveyMoj
**Author:** junaidiqbalmoj
**Labels:** 
**Created:** 2026-10-20T15:00:56Z
**Updated:** 2026-11-09T13:08:16Z

## Description

## Problem

Dates in downloadable list-type Excel files are formatted inconsistently. Depending on the list type, the same kind of value comes out as `13/01/2025`, `13 January 2025`, `Monday 13 January 2025`, or whatever text was in the source JSON/upload.

All dates in Excel downloads should use one format: **`d MMMM yyyy`**, e.g. `20 October 2026`. When the Excel is generated in Welsh, the month should be in Welsh, e.g. `20 Hydref 2026`.

## Current state (audit)

All Excel date values are currently written as text cells. No generator writes real Excel date cells or sets `numFmt`. No workbook has a date in a title or header row. Dates only appear in data columns.

| List type(s) | Column(s) | Current format | Formatted at |
|---|---|---|---|
| `CROWN_ADVANCED_PDDA_LIST` | Fixed for | `13/01/2025` | `libs/list-types/crown-advanced-pdda-list/src/date-formatting.ts` (`formatShortDate`) |
| `MAGISTRATES_STANDARD_LIST` | Date of birth, plea date, conviction date, adjourned date (`dd/MM/yyyy - {adjournedText}`) | `13/01/2025` | `libs/list-types/magistrates-standard-list/src/rendering/renderer.ts` (`formatDateFromIso`) |
| `SJP_PRESS_LIST`, `SJP_DELTA_PRESS_LIST` | Date of birth (`dd/MM/yyyy (age)`) | `13/01/1990 (35)`. **No change in this ticket:** already matches PIP for well-formed DOBs; writing the DOB exactly as sent is #1366 | `libs/excel-generation/src/excel/sjp-press-list-excel-generator.ts` (`formatDateOfBirth`) |
| `MAGISTRATES_ADULT_COURT_LIST_DAILY`, `MAGISTRATES_ADULT_COURT_LIST_FUTURE` | Date of birth | Raw passthrough of `def_dob`, e.g. `01/01/1990` | `libs/list-types/magistrates-adult-court-list/src/rendering/renderer.ts` |
| `CROWN_FIRM_PDDA_LIST` | Sitting date | `Monday 13 January 2025` (includes weekday). **No change:** the weekday is kept to match PIP (open question 1) | `libs/list-types/crown-firm-list/src/rendering/renderer.ts` (`formatSittingDate`) |
| Uploaded-workbook reformatters: RCJ standard lists (x8), `LONDON_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST`, `COURT_OF_APPEAL_CIVIL_DAILY_CAUSE_LIST`, SSCS lists | Any uploaded cell that is a real Excel date | `15/01/2025` (text cells are kept as typed) | `libs/list-types/common/src/conversion/excel-to-json.ts` (`formatDateValue`) via `uploaded-workbook-reformatter.ts` |
| `COURT_OF_APPEAL_CIVIL_DAILY_CAUSE_LIST` | "Notice for future judgments" → Date | Already `20 February 2025` ✅ | `formatDdMmYyyyDate` |

Lists with no date columns in the Excel (no change expected): `CROWN_DAILY_PDDA_LIST`, `MAGISTRATES_PUBLIC_LIST`, `MAGISTRATES_PUBLIC_ADULT_COURT_LIST_*`, `CIVIL_DAILY_CAUSE_LIST`, `FAMILY_DAILY_CAUSE_LIST`, `CIVIL_AND_FAMILY_DAILY_CAUSE_LIST`, `SJP_PUBLIC_LIST`, `SJP_DELTA_PUBLIC_LIST`, all UT / UTIAC daily hearing lists.

## Consistency with PIP (`hmcts/pip-data-management`)

CaTH is replacing PIP, so these Excel downloads should match what PIP users already get, unless we decide on purpose to improve on it. In PIP, Excel generation lives in `service/filegeneration/*FileConverter.java`. Every value is written as a text cell, which CaTH does too. Checked against PIP `master` @ `7fe83c3`.

**PIP is not consistent either.** Its shared default is `dd MMMM yyyy` ([`DateHelper.DATE_FORMAT`](https://github.com/hmcts/pip-data-management/blob/7fe83c364a903abd654147c556b8af288a5ccd50/src/main/java/uk/gov/hmcts/reform/pip/data/management/service/helpers/DateHelper.java)), but individual Excel columns don't all use it:

| List type | Column | PIP Excel format | CaTH today | Matches PIP? |
|---|---|---|---|---|
| Non-strategic weekly lists (CST, PHT, GRC, WPAFCC, SIAC, POAC, PAAC, FTT Tax, FTT LR, RPT…) | `date` column of the uploaded workbook | `d MMMM yyyy`, e.g. `20 October 2026`. Converted from `dd/MM/yyyy` by [`NonStrategicFieldFormattingHelper.formatDateField`](https://github.com/hmcts/pip-data-management/blob/7fe83c364a903abd654147c556b8af288a5ccd50/src/main/java/uk/gov/hmcts/reform/pip/data/management/service/helpers/NonStrategicFieldFormattingHelper.java), always English | Now in CaTH's `EXCEL_GENERATOR_REGISTRY`; the `date` column already goes through `formatDdMmYyyyDate`, giving `d MMMM yyyy` | Yes. **This is the PIP precedent for the requested format** |
| `CROWN_FIRM_PDDA_LIST` | Sitting date | `EEEE dd MMMM yyyy`, e.g. `Monday 05 January 2026` ([`CrownPddaListHelper.formatSittingDate`](https://github.com/hmcts/pip-data-management/blob/7fe83c364a903abd654147c556b8af288a5ccd50/src/main/java/uk/gov/hmcts/reform/pip/data/management/service/helpers/CrownPddaListHelper.java)) | `Monday 5 January 2026` | Almost: PIP zero-pads the day |
| `CROWN_ADVANCED_PDDA_LIST` | Fixed for | Raw `FixedDate` passed through (`dd/MM/yyyy`) ([`CrownAdvancePddaListHelper`](https://github.com/hmcts/pip-data-management/blob/7fe83c364a903abd654147c556b8af288a5ccd50/src/main/java/uk/gov/hmcts/reform/pip/data/management/service/helpers/CrownAdvancePddaListHelper.java)) | `dd/MM/yyyy` | Yes |
| `MAGISTRATES_STANDARD_LIST` | DOB, plea date, conviction date, adjourned date | `dd/MM/yyyy` ([`MagistratesStandardListHelper`](https://github.com/hmcts/pip-data-management/blob/7fe83c364a903abd654147c556b8af288a5ccd50/src/main/java/uk/gov/hmcts/reform/pip/data/management/service/helpers/MagistratesStandardListHelper.java), local `DATE_FORMAT = "dd/MM/yyyy"`) | `dd/MM/yyyy` | Yes |
| `SJP_PRESS_LIST` / `SJP_DELTA_PRESS_LIST` | Date of birth | Raw `dateOfBirth` from JSON plus ` (age)` ([`SjpPressListFileConverter.getAccusedDob`](https://github.com/hmcts/pip-data-management/blob/7fe83c364a903abd654147c556b8af288a5ccd50/src/main/java/uk/gov/hmcts/reform/pip/data/management/service/filegeneration/SjpPressListFileConverter.java)) | `dd/MM/yyyy (age)` | Effectively yes |
| `MAGISTRATES_ADULT_COURT_LIST_*` | Date of birth | Raw `def_dob` passed through ([`MagistratesAdultCourtListHelper`](https://github.com/hmcts/pip-data-management/blob/7fe83c364a903abd654147c556b8af288a5ccd50/src/main/java/uk/gov/hmcts/reform/pip/data/management/service/helpers/MagistratesAdultCourtListHelper.java)) | Raw passthrough | Yes |
| Uploaded-workbook lists | Real Excel date cells | `dd/MM/yyyy` ([`ExcelConversionService.formatNumericCell`](https://github.com/hmcts/pip-data-management/blob/7fe83c364a903abd654147c556b8af288a5ccd50/src/main/java/uk/gov/hmcts/reform/pip/data/management/service/ExcelConversionService.java)) unless a list-specific formatter applies | `dd/MM/yyyy` | Yes |

Other PIP behaviour to keep in mind:
- **Welsh:** every PIP Excel date formatter uses `Locale.UK` or `Locale.ENGLISH`, so PIP Excel files always have **English** month and day names, even when the download is Welsh. CaTH's Crown Firm and COA Civil formatters currently output Welsh month names.
- **Day padding:** `DateHelper` uses `dd` (`05 October 2026`). The non-strategic formatter, which is the closest match to this ticket, uses `d` (`5 October 2026`).

**Recommendation:** use PIP's `NonStrategicFieldFormattingHelper.formatDateField` behaviour as the standard for every Excel date column: `d MMMM yyyy`, so `20 October 2026` and `5 October 2026`. This keeps us consistent with the only PIP Excel path that already reformats dates for display, and meets this ticket's goal. It is a deliberate change from PIP for Crown Advance, Magistrates Standard, SJP Press and Magistrates Adult, where PIP keeps `dd/MM/yyyy`. Product should sign this off so that differences reported by PIP users are expected rather than treated as regressions.

## Acceptance criteria

- [ ] Every date written to a list-type Excel download uses `d MMMM yyyy` (e.g. `20 October 2026`). There is no zero-padded day, no `dd/MM/yyyy`, and no ISO. **Exceptions:** `CROWN_FIRM_PDDA_LIST` keeps the weekday on its sitting date (e.g. `Monday 5 January 2026`), matching PIP's Excel and the list's PDF and HTML. `SJP_PRESS_LIST` and `SJP_DELTA_PRESS_LIST` are not changed by this ticket: the date of birth stays `dd/MM/yyyy (age)` (e.g. `01/01/1990 (35)`), which already matches PIP's Excel. Unreadable, impossible or missing DOBs are handled in #1366. In uploaded workbooks, free-text columns (e.g. Additional Information) are written as uploaded, including any cell Excel stored as a date.
- [ ] Welsh month names in Welsh Excel output, **or** English-only to match PIP (see open question 4). The decision is applied to all list types.
- [ ] Applies to all list types in the table above, both JSON-generated and uploaded-workbook-reformatted Excel files.
- [ ] Dates that can't be parsed are written unchanged. A download must never fail because of a bad date.
- [ ] Unit tests for each affected generator are updated to assert the new format, including a Welsh case.

## Implementation notes

- Reuse the existing shared helpers in `@hmcts/list-types-common` (`libs/list-types/common/src/rendering/date-formatting.ts`): `formatDisplayDate(date, locale)` and `formatDdMmYyyyDate(ddMMyyyy, locale)` already produce `d MMMM yyyy` with Welsh support. Replace the local `dd/MM/yyyy` helpers rather than adding new ones.
- **Change Excel output only.** In `excel-to-json.ts`, `formatDateValue` is also used to convert uploads to JSON and validate them (e.g. COA Civil validates `dd/MM/yyyy`). Change the date format in the reformatter output path, not in the shared JSON conversion, or upload validation will break.
- **Watch for time zones.** The current helpers mix UTC (`getUTCDate`) and local time (`getDate`). Date-of-birth and date-only values should not move by a day near midnight or across BST changes.
- **Check PDF and HTML impact.** Some of these renderers also feed the PDF and HTML views (e.g. `magistrates-standard-list`, `crown-advanced-pdda-list`). Agree whether those should change too, or scope the change to Excel only.

## Open questions

1. Should `CROWN_FIRM_PDDA_LIST` drop the weekday (`Monday 13 January 2025` → `13 January 2025`), or is the weekday a deliberate part of that list? **Answered (9 November 2026, Junaid):** keep the weekday, matching PIP.
2. Should date of birth also use the long format (`1 January 1990`), or stay short for readability? The SJP press list adds ` (age)` after the date. **Answered (9 November 2026):** SJP press dates of birth are written as sent, matching PIP; other dates of birth use the long format. **Updated (12 November 2026):** SJP press is not changed by this ticket, because master already matches PIP for well-formed DOBs. Writing the DOB as sent is #1366.
3. Should uploaded *text* cells that look like `dd/MM/yyyy` also be converted, or only real Excel date cells?
4. Welsh Excel downloads: use Welsh month names (current CaTH behaviour for Crown Firm and COA Civil), or English month names to match PIP?
5. Zero-padded day (`05 October 2026`, PIP `DateHelper` / Crown Firm) or unpadded (`5 October 2026`, PIP non-strategic lists)? Recommendation: unpadded.




## Comments

### Comment by junaidiqbalmoj on 2026-10-22T09:24:05Z
@spec enhancement

### Comment by hmctsclaudecode on 2026-10-22T09:31:36Z
# Technical Specification: Excel downloads — consistent date format (`d MMMM yyyy`)

**Issue:** #1184
**Type:** Enhancement
**Date:** 22 October 2026

## 1. Current State

Every date written into a list-type Excel download is written as a **text cell**. No generator writes a real Excel date cell and none sets `numFmt`. Dates appear only in data columns — never in a workbook title or header row. The format of those text cells differs per list type because each list type formats its dates in its own helper, so the same kind of value (a date of birth, a sitting date) renders four different ways depending on which list you download.

### Where each format comes from

| List type(s) | Column(s) | Current output | Formatted at |
|---|---|---|---|
| `CROWN_ADVANCED_PDDA_LIST` | Fixed for | `13/01/2025` | `libs/list-types/crown-advanced-pdda-list/src/date-formatting.ts:3` (`formatShortDate`, Luxon `dd/MM/yyyy`) |
| `MAGISTRATES_STANDARD_LIST` | Date of birth, plea date, conviction date, adjourned date (`dd/MM/yyyy - {t.adjournedText}`) | `13/01/2025` | `libs/list-types/magistrates-standard-list/src/rendering/renderer.ts:276` (`formatDateFromIso`, hand-rolled `getUTC*`) |
| `SJP_PRESS_LIST`, `SJP_DELTA_PRESS_LIST` | Date of birth | `13/01/1990 (35)` | `libs/excel-generation/src/excel/sjp-press-list-excel-generator.ts:71` (`formatDateOfBirth`, hand-rolled local-time `getDate`) |
| `MAGISTRATES_ADULT_COURT_LIST_DAILY`, `MAGISTRATES_ADULT_COURT_LIST_FUTURE` | Date of birth | Raw passthrough of `def_dob`, e.g. `01/01/1990` | `libs/list-types/magistrates-adult-court-list/src/rendering/renderer.ts:182` |
| `CROWN_FIRM_PDDA_LIST` | Date (sitting date) | `Monday 5 January 2026` | `libs/list-types/crown-firm-list/src/rendering/renderer.ts:62` (`formatSittingDate`) |
| RCJ standard lists (×8), `LONDON_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST`, `COURT_OF_APPEAL_CIVIL_DAILY_CAUSE_LIST`, SSCS lists (×7) | Any uploaded cell that is a real Excel date | `15/01/2025` (text cells pass through as typed) | `libs/list-types/common/src/conversion/excel-to-json.ts:146` (`formatDateValue`), reached from `uploaded-workbook-reformatter.ts:92` via `readCellValue` |
| `COURT_OF_APPEAL_CIVIL_DAILY_CAUSE_LIST` | "Notice for future judgments" → Date | `20 February 2025` ✅ already correct | `formatDdMmYyyyDate` via `formatFutureJudgment` |

### Limitations

1. **No single owner of the format.** Five separate private helpers each re-implement date formatting, three of them by hand with `padStart`. `@hmcts/list-types-common` already exports `formatDisplayDate` and `formatDdMmYyyyDate`, which produce exactly the target format with Welsh support, but only COA Civil uses them.
2. **Time-zone handling is inconsistent and latently wrong.** `magistrates-standard-list` reads `getUTCDate()`; `sjp-press-list-excel-generator` reads `getDate()`; `excel-to-json.ts` `formatDateValue` mixes both (`getUTCFullYear()` for the Excel-time-epoch check, then `getDate()`/`getMonth()` for the output). A date-only value can therefore shift by a day depending on which helper formats it.
3. **Three of the five helpers are not locale-aware at all**, so a Welsh download gets English-style numeric dates while the rest of the same workbook is Welsh.
4. **Shared renderers couple Excel to PDF and HTML.** `magistrates-standard-list`, `crown-advanced-pdda-list`, `crown-firm-list` and `magistrates-adult-court-list` all format dates inside `src/rendering/renderer.ts`, which is consumed by the Excel generator, the PDF generator *and* the web page controller. There is no Excel-only seam today.
5. **The uploaded-workbook path cannot be changed in isolation at its current choke point.** `formatDateValue` in `excel-to-json.ts` serves both the reformatter (display) and upload→JSON conversion (validated against `dd/MM/yyyy`, e.g. `validators.ts` for COA Civil). Changing it would break upload validation.

### Lists with no date column (no change expected)

`CROWN_DAILY_PDDA_LIST`, `MAGISTRATES_PUBLIC_LIST`, `MAGISTRATES_PUBLIC_ADULT_COURT_LIST_DAILY`, `MAGISTRATES_PUBLIC_ADULT_COURT_LIST_FUTURE`, `CIVIL_DAILY_CAUSE_LIST`, `FAMILY_DAILY_CAUSE_LIST`, `CIVIL_AND_FAMILY_DAILY_CAUSE_LIST`, `SJP_PUBLIC_LIST`, `SJP_DELTA_PUBLIC_LIST`, all UT and UTIAC daily hearing lists, and the MI report (`mi-report-excel-generator.ts` has no date column).

## 2. Proposed Improvement

**I want to** format every date in every list-type Excel download as `d MMMM yyyy` (`20 October 2026`, `5 October 2026`) from one shared, locale-aware, time-zone-safe helper in `@hmcts/list-types-common`, and delete the five per-list-type date helpers that currently disagree

**So that**
- a journalist or legal professional downloading two different list types reads dates the same way in both, and does not have to work out whether `01/02/2025` means 1 February or 2 January;
- Welsh downloads carry Welsh month names throughout, instead of a Welsh workbook with English-ordered numeric dates;
- date formatting is maintained in one file rather than five, so the next list type inherits the correct format with no new code;
- the UTC/local-time mix that can shift a date of birth by a day is removed.

### Decisions taken on the issue's open questions

These are the recommendations this spec implements. They need product sign-off before merge because four of them are deliberate divergences from PIP, and PIP users will notice.

| # | Question | Decision | Rationale |
|---|---|---|---|
| 1 | Does `CROWN_FIRM_PDDA_LIST` drop the weekday? | **Keep the weekday.** Output stays `Monday 5 January 2026`; only the date portion is governed by this change (it is already unpadded and correct) | The value is a day *grouping label* for a multi-day list, not a data field — the weekday is how a user scanning a firm list finds "next Tuesday". PIP keeps it too (`EEEE dd MMMM yyyy`). We remain unpadded where PIP pads |
| 2 | Does date of birth use the long format? | **Yes.** `1 January 1990`, and `1 January 1990 (35)` for SJP press lists | The AC says *every* date. Carving out DOB re-creates the inconsistency the ticket exists to remove, and `13/01/1990` is exactly the ambiguous case long format solves |
| 3 | Convert uploaded *text* cells that look like `dd/MM/yyyy`? | **Yes, but only on a strict whole-cell match** of `^\d{1,2}/\d{1,2}/\d{4}$` after trimming. Anything else (ranges, `TBC 15/01/2025`, partial dates) is written through untouched | Date-only-vs-real-date-cell is an artefact of how the court typed the spreadsheet, invisible to the user and inconsistent within a single upload. A strict full-string match has no realistic false positive; a loose or substring match would mangle free text |
| 4 | Welsh or English month names in Welsh downloads? | **Welsh.** `20 Hydref 2026` | A Welsh-language download containing English months is a Welsh Language Scheme problem, and CaTH already produces Welsh months for Crown Firm and COA Civil — reverting those to English to match PIP would be a regression for Welsh users. Deliberate divergence from PIP, which uses `Locale.UK` everywhere |
| 5 | Zero-padded day? | **Unpadded** (`5 October 2026`) | Per the ticket's own recommendation, and it matches PIP's `NonStrategicFieldFormattingHelper.formatDateField` — the only PIP Excel path that already reformats dates for display |

### Scope decision: PDF and HTML change too

Four of the affected list types format dates inside a `rendering/renderer.ts` shared by the Excel generator, the PDF generator and the web page controller. **This spec changes the renderer**, so the PDF and HTML views pick up `d MMMM yyyy` as well.

The alternative — threading an "Excel format" flag through `RenderOptions`, or re-parsing the already-formatted string inside the Excel generator — was rejected: it adds a branch to four renderers to *preserve* an inconsistency, and leaves a publication whose PDF says `13/01/2025` next to a workbook saying `13 January 2025`. One format per publication across all three surfaces is the simpler and more defensible outcome.

**Out of scope:** `formatDateValue` in `excel-to-json.ts` (the upload→JSON conversion and validation path) is left exactly as it is. The Excel-to-JSON output must keep producing `dd/MM/yyyy` or COA Civil upload validation breaks.

## 3. Modification Details

### Visual Changes

No layout, column, header or styling change. Cell *contents* change only, and every date cell stays a text cell with no `numFmt` — Excel must not reinterpret these as real dates, because several sources are unparseable free text that has to survive untouched.

Column widths are unchanged. `d MMMM yyyy` is wider than `dd/MM/yyyy` (up to 17 characters vs 10), and the affected columns are either already auto-fitted (`autoFitColumns`) or carry an explicit width taken from the uploaded workbook. The widest realistic value, `30 September 2026 (35)` at 22 characters, fits the SJP press list's existing `width: 25` for the DOB column.

**`MAGISTRATES_STANDARD_LIST` — offence block (English)**

```
BEFORE                                          AFTER
+------------+------------+------------------+  +------------+-----------------+----------------------+
| Plea       | Plea date  | Adjourned from   |  | Plea       | Plea date       | Adjourned from       |
+------------+------------+------------------+  +------------+-----------------+----------------------+
| Guilty     | 13/01/2025 | 06/01/2025 - ... |  | Guilty     | 13 January 2025 | 6 January 2025 - ... |
| Not guilty | 02/12/2024 |                  |  | Not guilty | 2 December 2024 |                      |
+------------+------------+------------------+  +------------+-----------------+----------------------+
```

**`SJP_PRESS_LIST` — date of birth column (Welsh download)**

```
BEFORE                           AFTER
+---------------------------+    +---------------------------+
| Dyddiad geni              |    | Dyddiad geni              |
+---------------------------+    +---------------------------+
| 13/01/1990 (35)           |    | 13 Ionawr 1990 (35)       |
| 01/10/1972 (54)           |    | 1 Hydref 1972 (54)        |
+---------------------------+    +---------------------------+
```

**RCJ standard list — uploaded workbook, real Excel date cell in a "Date" column**

```
BEFORE                                      AFTER
+------------+--------+-----------------+   +-------------------+--------+-----------------+
| Date       | Time   | Case number     |   | Date              | Time   | Case number     |
+------------+--------+-----------------+   +-------------------+--------+-----------------+
| 15/01/2025 | 10:30am| CO/1234/2025    |   | 15 January 2025   | 10:30am| CO/1234/2025    |
| 15/01/2025 | 2pm    | CO/5678/2025    |   | 15 January 2025   | 2pm    | CO/5678/2025    |
| w/c 15/01/2025 to 17/01/2025 (text)   |   | w/c 15/01/2025 to 17/01/2025 (unchanged)  |
+---------------------------------------+   +-------------------------------------------+
```

Time cells are unaffected: the Excel-time-epoch branch (`1899` sentinel year) still routes time-only `Date` values to `formatExcelTime`.

**`CROWN_FIRM_PDDA_LIST` — unchanged by decision 1**

```
BEFORE                        AFTER
+----------------------+      +----------------------+
| Date                 |      | Date                 |
+----------------------+      +----------------------+
| Monday 5 January 2026|      | Monday 5 January 2026|
+----------------------+      +----------------------+
```

No new or changed `en.ts` / `cy.ts` locale copy is introduced by this change. Welsh month names come from ICU locale data via `Intl`/Luxon (already proven in `libs/list-types/common/src/rendering/date-formatting.test.ts`, which asserts `15 Ionawr 2026`), not from locale files — so there is nothing to translate here.

### Functional Changes

#### 3.1 Shared helpers — `libs/list-types/common/src/rendering/date-formatting.ts`

Add one helper and harden one existing helper. Nothing else in this file changes.

**New — `formatIsoDisplayDate(isoDateTime, locale)`.** Takes an ISO date or datetime string and returns `d MMMM yyyy` in English or Welsh. Parsed and formatted in **UTC** so a date-only value (`1990-01-01`, or `1990-01-01T00:00:00Z`) can never roll back a day. Unparseable input is returned verbatim.

```typescript
export function formatIsoDisplayDate(isoDateTime: string, locale: string): string {
  const dt = DateTime.fromISO(isoDateTime, { zone: "utc" });
  if (!dt.isValid) return isoDateTime;
  return dt.setLocale(locale === "cy" ? "cy" : "en-GB").toFormat("d MMMM yyyy");
}
```

This replaces the four private ISO-to-short-date helpers. It intentionally does *not* take a time zone: these are date-only values, and applying a zone conversion to them is what causes the off-by-one-day bug the issue flags. Datetime values that genuinely need a zone (publication timestamps) already go through `formatLastUpdatedDateTime`, which is unchanged.

**Hardened — `formatDdMmYyyyDate(ddMMyyyyDate, locale)`.** Today it does `split("/")` unconditionally, so any non-`dd/MM/yyyy` input produces `Invalid Date` in the cell. Guard it so it is idempotent and lossless:

```typescript
const DD_MM_YYYY_PATTERN = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;

export function formatDdMmYyyyDate(ddMMyyyyDate: string, locale: string): string {
  const match = DD_MM_YYYY_PATTERN.exec(ddMMyyyyDate.trim());
  if (!match) return ddMMyyyyDate;

  const [, day, month, year] = match;
  const dt = DateTime.utc(Number(year), Number(month), Number(day));
  if (!dt.isValid) return ddMMyyyyDate;

  return dt.setLocale(locale === "cy" ? "cy" : "en-GB").toFormat("d MMMM yyyy");
}
```

Two reasons this guard is load-bearing, not defensive padding:
- It delivers the "dates that can't be parsed are written unchanged" acceptance criterion for the one column already using this helper.
- It makes the function **idempotent**, which §3.6 depends on: COA Civil's future-judgments "Date" column is read by the reformatter *and then* passed through `formatFutureJudgment`. Once the reformatter pre-formats a real date cell to `20 February 2025`, `formatFutureJudgment` calls this helper on that value and must return it untouched. Without the guard it would become `Invalid Date`. Note the switch from `new Date(y, m, d)` (local) to `DateTime.utc` here as well, for the same off-by-one reason.

Export `formatIsoDisplayDate` from `libs/list-types/common/src/index.ts` alongside the existing date helpers.

#### 3.2 `MAGISTRATES_STANDARD_LIST`

`libs/list-types/magistrates-standard-list/src/rendering/renderer.ts`

- Delete the private `formatDateFromIso` (line 276) and its hand-rolled `getUTC*` + `padStart` body.
- Replace its three call sites with `formatIsoDisplayDate(..., locale)`:
  - `dob` (line 182, inside `buildIndividualPartyInfo`)
  - `pleaDate`, `convictionDate`, `adjournedDate` (lines 221–223, inside `processOffences`)
- `buildIndividualPartyInfo(details, _locale)` and `processOffences(party, _locale)` both already receive `locale` as an unused `_locale` parameter. Use it and drop the underscore prefix.
- Leave `formatDate` and `formatDateAndTime` alone — they already produce `d MMMM yyyy` for the header.

The `adjournedDate` composition `${offence.adjournedDate} - ${t.adjournedText}` is unchanged in both `excel/excel-generator.ts:126` and `pdf/pdf-template.njk:155`; only the date half changes, giving `6 January 2025 - {t.adjournedText}`.

Surfaces affected: Excel, PDF, and `apps/web/src/pages/(list-types)/magistrates-standard-list/`.

#### 3.3 `CROWN_ADVANCED_PDDA_LIST`

- **Delete** `libs/list-types/crown-advanced-pdda-list/src/date-formatting.ts` entirely. It exists only to produce `dd/MM/yyyy`.
- `src/rendering/renderer.ts:116` — `fixedFor: formatShortDate(fixedDate)` → `formatIsoDisplayDate(fixedDate ?? "", locale)`. The renderer already has `locale` in its options.
- `src/email-summary/summary-builder.ts:11` — the "Fixed for" field in the subscription email also used `formatShortDate`. Switch it to `formatIsoDisplayDate` so the email and the download agree. If the summary builder has no `locale` in scope, pass `"en"` explicitly to preserve current behaviour rather than inventing a locale, and note it for a follow-up.

Keeping the local helper alive for the email only would re-introduce the exact split this ticket removes, within a single publication.

Surfaces affected: Excel, PDF, web page, subscription email.

#### 3.4 `MAGISTRATES_ADULT_COURT_LIST_DAILY` / `_FUTURE`

`libs/list-types/magistrates-adult-court-list/src/rendering/renderer.ts:182`

`def_dob` is a raw string from the upstream JSON, in practice `dd/MM/yyyy` (e.g. `01/01/1990`). It is currently passed through with no parsing at all:

```typescript
dateOfBirth: c.def_dob ?? "",
```

becomes

```typescript
dateOfBirth: formatDdMmYyyyDate(c.def_dob ?? "", locale),
```

The hardened `formatDdMmYyyyDate` returns the input verbatim when it is not a `dd/MM/yyyy` date, which preserves today's passthrough for anything the upstream system sends in another shape. Confirm `locale` is threaded into the function that builds the case row — `renderMagistratesAdultCourtList` already receives it in its options.

#### 3.5 `SJP_PRESS_LIST` / `SJP_DELTA_PRESS_LIST`

`libs/excel-generation/src/excel/sjp-press-list-excel-generator.ts:71`

Replace the hand-rolled `formatDateOfBirth` body. `generateSjpPressListExcel` already takes `locale: "en" | "cy"`, so thread it in:

```typescript
function formatDateOfBirth(dob: Date | null, age: number | null, locale: string): string {
  if (!dob) return "";
  const formatted = formatDisplayDate(dob, locale);
  return age !== null ? `${formatted} (${age})` : formatted;
}
```

`formatDisplayDate` is already exported from `@hmcts/list-types-common`, which `@hmcts/excel-generation` already depends on — no new dependency.

**Time-zone note.** `dob` here is a `Date` built by `parseDateOfBirth` in `libs/list-types/common/src/sjp/json-parser.ts:144` using `new Date(year, month, day)` — i.e. **local** midnight. `formatDisplayDate` formats with no explicit `timeZone`, i.e. also local. Keep it that way: the construction and the formatting share a basis, so the value cannot shift. Do **not** "fix" this by passing `timeZone: "UTC"` to `formatDisplayDate` — in any non-UTC container that would move every DOB back a day. If this ever needs to become zone-independent, the correct fix is upstream in `parseDateOfBirth` (build with `Date.UTC`), which is a separate change with its own test surface.

#### 3.6 Uploaded-workbook reformatters (RCJ ×8, London Administrative Court, COA Civil, SSCS ×7)

This is the only structural change. The reformatter currently reads every cell with `readCellValue` (`uploaded-workbook-reformatter.ts:92`), which routes `Date` values to `formatDateValue` in `excel-to-json.ts` — the function shared with the upload→JSON validation path and therefore **not** safe to change.

Add a display-only read path in the reformatter instead, leaving `readCellValue` and `formatDateValue` untouched.

**`libs/list-types/common/src/excel/uploaded-workbook-reformatter.ts`**

1. Thread a locale through: `reformatUploadedWorkbook(buffer, sheets, locale)`. All four call sites already have `locale` in hand (`rcj-standard-daily-cause-list`, `london-administrative-court-daily-cause-list`, `court-of-appeal-civil-daily-cause-list`, `sscs-daily-hearing-list` reformatters).
2. In `formatDataRow`, read data cells with a new local `readDisplayCellValue(cellValue, locale)` instead of `readCellValue`. Header cells keep using `readCellValue` — no workbook has a date in a header row.

```typescript
const EXCEL_TIME_EPOCH_YEAR = 1899;

function readDisplayCellValue(value: unknown, locale: string): string {
  if (value instanceof Date && !Number.isNaN(value.getTime()) && value.getUTCFullYear() !== EXCEL_TIME_EPOCH_YEAR) {
    return formatDisplayDate(value, locale);
  }
  return formatDdMmYyyyDate(readCellValue(value), locale);
}
```

Three behaviours fall out of this, matching decisions 3 and the "never fail on a bad date" criterion:

- **Real Excel date cells** → `15 January 2025`. The `1899` guard keeps time-only cells (which ExcelJS also returns as `Date`) on the existing `formatExcelTime` path inside `readCellValue`, so `10:30am` and `2pm` are unaffected. An invalid `Date` falls through to `readCellValue`, which stringifies it as today.
- **Text cells that are exactly a `dd/MM/yyyy` date** → converted by the hardened `formatDdMmYyyyDate`, per decision 3.
- **Everything else** → returned byte-for-byte as today, because `formatDdMmYyyyDate` now returns non-matching input unchanged. Free text such as `w/c 15/01/2025 to 17/01/2025`, `TBC`, case numbers like `CO/1234/2025` (four digits then four digits — no match, the pattern requires `1-2 / 1-2 / 4`), rich text, formulas, hyperlinks and `#REF!` errors are all untouched.

`EXCEL_TIME_EPOCH_YEAR` is currently a private const in `excel-to-json.ts`. Rather than duplicate the literal, export it from `excel-to-json.ts` and import it in the reformatter, keeping the comment explaining the 1899 sentinel at its single definition.

**Caller updates** — each passes `locale` through to `reformatUploadedWorkbook`:

| File | Change |
|---|---|
| `libs/list-types/rcj-standard-daily-cause-list/src/excel/excel-reformatter.ts:9` | add `locale` third argument |
| `libs/list-types/london-administrative-court-daily-cause-list/src/excel/excel-reformatter.ts:9` | add `locale` third argument |
| `libs/list-types/court-of-appeal-civil-daily-cause-list/src/excel/excel-reformatter.ts:20` | add `locale` third argument |
| `libs/list-types/sscs-daily-hearing-list/src/excel/excel-reformatter.ts:10` | add `locale` third argument |

**COA Civil double-formatting.** The future-judgments sheet routes rows through `formatFutureJudgment(row, locale)` (`court-of-appeal-civil-daily-cause-list/src/rendering/renderer.ts:37`), which calls `formatDdMmYyyyDate` on the `date` field. After this change that field arrives already formatted when the upload used a real date cell. The idempotency guard in §3.1 makes the second call a no-op, so both a real date cell and a `15/01/2025` text cell converge on `15 January 2025`. `formatFutureJudgment` itself needs no change — but it must have a test proving the no-op, because the correctness of the COA Civil column now rests on it.

#### 3.7 `CROWN_FIRM_PDDA_LIST` — no code change

`formatSittingDate` (`libs/list-types/crown-firm-list/src/rendering/renderer.ts:62`) already emits an unpadded `d MMMM yyyy` with a localised weekday prefix, and the value is used as the day-grouping key across Excel, PDF and HTML. Per decision 1 it stays as is. It is listed here so the audit table in the issue can be closed off rather than left looking unaddressed.

#### 3.8 Explicitly not changed

| File | Why |
|---|---|
| `libs/list-types/common/src/conversion/excel-to-json.ts` — `formatDateValue` | Shared with upload→JSON conversion and validation (`validators.ts` checks `dd/MM/yyyy` for COA Civil). Changing it breaks uploads |
| `libs/list-types/common/src/rendering/date-formatting.ts` — `formatDisplayDate`, `formatLastUpdatedDateTime`, `formatHHMMTime`, `normalizeTime` | Already correct, or not date-formatting |
| `libs/web-core/src/utils/date-utils.ts` | Produces padded `05 Ionawr 2025` but is not reachable from any Excel generator. Out of scope — flag as a separate inconsistency |
| `libs/excel-generation/src/excel/mi-report-excel-generator.ts`, `sjp-public-list-excel-generator.ts` | No date columns |
| Lists with no date column (§1) | Nothing to change |

## 4. Acceptance Criteria

### Format

* [ ] Every date written to a list-type Excel download renders as `d MMMM yyyy` — e.g. `20 October 2026`, `5 October 2026`. No zero-padded day, no `dd/MM/yyyy`, no ISO string.
* [ ] `CROWN_FIRM_PDDA_LIST` keeps its weekday prefix (`Monday 5 January 2026`) and its date portion is unpadded.
* [ ] Dates of birth use the long format: `1 January 1990`, and `1 January 1990 (35)` on SJP press lists.
* [ ] Date cells remain **text** cells. No generator sets `numFmt` or writes a real Excel date value.

### Coverage

* [ ] JSON-generated lists updated: `CROWN_ADVANCED_PDDA_LIST`, `MAGISTRATES_STANDARD_LIST`, `SJP_PRESS_LIST`, `SJP_DELTA_PRESS_LIST`, `MAGISTRATES_ADULT_COURT_LIST_DAILY`, `MAGISTRATES_ADULT_COURT_LIST_FUTURE`.
* [ ] Uploaded-workbook lists updated: all 8 RCJ standard lists, `LONDON_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST`, `COURT_OF_APPEAL_CIVIL_DAILY_CAUSE_LIST`, all 7 SSCS daily hearing lists.
* [ ] An uploaded cell that is a real Excel date is converted; a text cell whose entire trimmed value is `d/M/yyyy` is converted; every other text cell is byte-for-byte unchanged.
* [ ] `COURT_OF_APPEAL_CIVIL_DAILY_CAUSE_LIST` "Notice for future judgments" → Date still reads `20 February 2025`, from both a real date cell and a `20/02/2025` text cell.

### Welsh

* [ ] A Welsh Excel download shows Welsh month names in every date column — `20 Hydref 2026`, `13 Ionawr 1990`.
* [ ] The decision is applied uniformly: no list type produces English months in a Welsh download or vice versa.

### Robustness

* [ ] An unparseable date value is written unchanged. Excel generation never throws, and the download never fails, because of a bad date. No cell contains the string `Invalid Date` or `NaN`.
* [ ] Time-only cells in uploaded workbooks still render as times (`10:30am`, `2pm`), not dates.
* [ ] A date-only value does not shift by a day: a DOB of `1990-01-01` renders as `1 January 1990` regardless of container time zone, and a sitting date of `2025-07-15` renders as `15 July 2025` during BST.
* [ ] An empty or absent date field still renders as an empty cell, not `""`-as-text artefacts or `1 January 1970`.

### Code quality

* [ ] `libs/list-types/crown-advanced-pdda-list/src/date-formatting.ts` is deleted, and `formatDateFromIso` / `formatDateOfBirth` are removed from their renderers.
* [ ] No `dd/MM/yyyy` date formatting remains in any Excel, PDF or HTML render path. (`formatDateValue` in `excel-to-json.ts` is the one permitted exception — it serves upload validation.)
* [ ] Date formatting for display goes through `@hmcts/list-types-common` only; no new per-list-type date helper is added.
* [ ] `formatDdMmYyyyDate` is idempotent — calling it on its own output returns that output unchanged.
* [ ] `yarn lint` and `yarn test` pass from the repo root.

### Upload path unaffected

* [ ] Uploading a workbook for every affected list type still succeeds, and `formatDateValue`'s `dd/MM/yyyy` output into JSON is unchanged.
* [ ] COA Civil's `dd/MM/yyyy` upload validation still rejects a malformed date with the same error as before.

### Sign-off

* [ ] Product has signed off the five decisions in §2, specifically the four deliberate divergences from PIP (Crown Advance, Magistrates Standard, SJP Press, Magistrates Adult now long-format where PIP keeps `dd/MM/yyyy`; Welsh months where PIP is English-only), so that differences reported by PIP users are expected rather than treated as regressions.
* [ ] Product has accepted that PDF and HTML views change alongside Excel for the four list types with shared renderers (§2), and that the Crown Advance subscription email changes too.

## 5. Impact on Existing Users

No re-training and no user-facing announcement on the service itself. Dates become longer and unambiguous; nothing moves, nothing is renamed, no journey changes. `13 January 2025` needs no explanation to someone who was reading `13/01/2025`.

Three groups do need handling:

**Users migrating from PIP.** This is the real risk. Four list types that match PIP exactly today will stop matching:

| List type | PIP today | CaTH after this change |
|---|---|---|
| `CROWN_ADVANCED_PDDA_LIST` — Fixed for | `13/01/2025` | `13 January 2025` |
| `MAGISTRATES_STANDARD_LIST` — DOB, plea, conviction, adjourned | `13/01/2025` | `13 January 2025` |
| `SJP_PRESS_LIST` / `SJP_DELTA_PRESS_LIST` — DOB | `13/01/1990 (35)` | `13 January 1990 (35)` |
| `MAGISTRATES_ADULT_COURT_LIST_*` — DOB | `01/01/1990` | `1 January 1990` |
| Uploaded-workbook lists — real date cells | `15/01/2025` | `15 January 2025` |
| Welsh downloads, all list types | English months | Welsh months |

A PIP user comparing the two side by side will see a difference and may report it as a defect. Mitigation: product sign-off recorded against §2 before merge, and the service desk briefed that the long format is intended. No announcement to the public is proposed — the change is an improvement in legibility, not a loss of information.

**Downstream consumers parsing our Excel.** Anyone who scripts against these downloads — a press agency pulling SJP press lists, a chambers importing an RCJ list — and parses the DOB or date column with a `dd/MM/yyyy` parser will break. Dates have always been text cells, so nobody can have been reading them as Excel dates, but a text parse is plausible. We do not publish these as a machine-readable interface and there is no versioned contract, so this is accepted rather than mitigated; the JSON API and the upload format are unchanged, which is where any integration should be pointed.

**Welsh-language users.** A strict improvement. Welsh downloads currently mix Welsh headings with numeric dates in English ordering; they will now read as Welsh throughout.

**Already-published artefacts.** Excel files are generated at publication time and stored in blob storage (`{artefactId}.xlsx`), so existing downloads keep their old format until the artefact is republished. There is no backfill in scope — the two formats will coexist for as long as current artefacts stay live, which for daily lists is one day and for future/advance lists is up to their content date. If product wants the estate consistent immediately, that is a separate regeneration task and should be raised as its own ticket.

**Accessibility.** A small gain. `13 January 2025` is read correctly by screen readers, whereas `13/01/2025` is announced inconsistently (as "thirteen slash one slash twenty twenty-five" or as a fraction depending on the reader) in the HTML views that change alongside Excel.

## 6. Test Scenarios

Vitest, co-located, Arrange-Act-Assert. Existing Excel generator tests read the generated buffer back with ExcelJS and assert on cell values — extend those rather than adding new files. No new E2E test: this changes the contents of a generated file, which Playwright does not usefully assert on, and the download journeys are already covered.

### 6.1 Shared helpers — `libs/list-types/common/src/rendering/date-formatting.test.ts`

New format, both locales, and the lossless fallbacks:

* `formatIsoDisplayDate("2026-10-20", "en")` → `"20 October 2026"`
* `formatIsoDisplayDate("2026-10-05", "en")` → `"5 October 2026"` (unpadded — decision 5)
* `formatIsoDisplayDate("2026-10-20", "cy")` → `"20 Hydref 2026"`
* `formatIsoDisplayDate("2026-10-20T23:30:00Z", "en")` → `"20 October 2026"` (a late-evening UTC timestamp does not roll to the 21st)
* `formatIsoDisplayDate("2025-07-15", "en")` → `"15 July 2025"` (date-only value inside BST does not roll to the 14th)
* `formatIsoDisplayDate("not a date", "en")` → `"not a date"` returned unchanged
* `formatIsoDisplayDate("", "en")` → `""`
* `formatDdMmYyyyDate("20/10/2026", "en")` → `"20 October 2026"`; `("5/10/2026", "en")` → `"5 October 2026"` (single-digit day accepted)
* `formatDdMmYyyyDate("20/10/2026", "cy")` → `"20 Hydref 2026"`
* **Idempotency:** `formatDdMmYyyyDate(formatDdMmYyyyDate("20/02/2025", "en"), "en")` → `"20 February 2025"`
* `formatDdMmYyyyDate("w/c 15/01/2025 to 17/01/2025", "en")` → returned unchanged (no substring match)
* `formatDdMmYyyyDate("CO/1234/2025", "en")` → returned unchanged (four-digit "day" does not match)
* `formatDdMmYyyyDate("31/02/2025", "en")` → returned unchanged (`DateTime.utc` invalid; must not become `3 March 2025`)
* `formatDdMmYyyyDate("TBC", "en")` and `("", "en")` → returned unchanged

### 6.2 Uploaded-workbook reformatter — `libs/list-types/common/src/excel/uploaded-workbook-reformatter.test.ts`

Build an in-memory workbook, reformat, read the output back:

* A cell holding a real JS `Date` in a data row → `"15 January 2025"` in the output
* Same workbook reformatted with `locale: "cy"` → `"15 Ionawr 2025"`
* A time-only cell (`Date` at the 1899 epoch, e.g. `1899-12-30T10:30:00Z`) → still `"10:30am"`, **not** a date
* A time-only cell on the hour → still `"2pm"`
* A text cell `"15/01/2025"` → `"15 January 2025"`
* A text cell `"w/c 15/01/2025 to 17/01/2025"` → unchanged
* A text cell `"CO/1234/2025"` (case number) → unchanged
* An invalid `Date` (`new Date("nonsense")`) → the sheet still generates and the cell is not `"Invalid Date"`-as-a-date; reformatting does not throw
* A header row containing a value that looks like a date → header still comes from `sheet.headers`, unchanged by this work
* Rich-text, formula and hyperlink cells → unchanged (regression guard on the `readCellValue` delegation)

### 6.3 Per-list-type Excel generators

Extend each existing test file with the new expected value and a Welsh case.

| Test file | Assertions to add |
|---|---|
| `libs/list-types/magistrates-standard-list/src/excel/excel-generator.test.ts` | DOB, plea date and conviction date cells read `13 January 2025`; adjourned cell reads `6 January 2025 - {t.adjournedText}`; Welsh run gives `13 Ionawr 2025`; a party with no DOB gives an empty cell |
| `libs/list-types/crown-advanced-pdda-list/src/excel/excel-generator.test.ts` | "Fixed for" reads `13 January 2025`; Welsh gives `13 Ionawr 2025`; absent `FixedDate` gives an empty cell |
| `libs/excel-generation/src/excel/sjp-press-list-excel-generator.test.ts` | DOB reads `13 January 1990 (35)`; with `age: null` reads `13 January 1990`; with `dateOfBirth: null` reads `""`; Welsh gives `13 Ionawr 1990 (35)` |
| `libs/list-types/magistrates-adult-court-list/src/excel/excel-generator.test.ts` | `def_dob: "01/01/1990"` reads `1 January 1990`; Welsh gives `1 Ionawr 1990`; `def_dob: "unknown"` passes through unchanged; absent `def_dob` gives an empty cell. Cover both `_DAILY` and `_FUTURE` |
| `libs/list-types/rcj-standard-daily-cause-list/src/excel/excel-reformatter.test.ts` | Date column from a real date cell reads `15 January 2025`; Welsh run gives Welsh month |
| `libs/list-types/london-administrative-court-daily-cause-list/src/excel/excel-reformatter.test.ts` | As above, across both configured sheets |
| `libs/list-types/sscs-daily-hearing-list/src/excel/excel-reformatter.test.ts` | As above (`formatRow` is the identity function here, so this proves the change works with no list-specific formatter) |
| `libs/list-types/court-of-appeal-civil-daily-cause-list/src/excel/excel-reformatter.test.ts` | Future-judgments Date reads `20 February 2025` from a **real date cell** *and* from the text cell `20/02/2025` — the double-formatting guard. Existing `toContain("Chwefror")` assertion still passes |
| `libs/list-types/crown-firm-list/src/excel/excel-generator.test.ts` | Unchanged — add nothing. Existing `Monday 5 January 2026` assertion must still pass, proving decision 1 held |

### 6.4 Renderer tests (PDF and HTML surfaces)

The four shared renderers change, so their own tests and the PDF/page tests that assert date strings need updating in step:

* `libs/list-types/magistrates-standard-list/src/rendering/renderer.ts` tests — `dob`, `pleaDate`, `convictionDate`, `adjournedDate` now long format; assert the Welsh path too
* `libs/list-types/crown-advanced-pdda-list/src/rendering/renderer.ts` tests — `fixedFor` now long format
* `libs/list-types/crown-advanced-pdda-list/src/email-summary/summary-builder.test.ts` — "Fixed for" now long format
* `libs/list-types/magistrates-adult-court-list/src/rendering/renderer.ts` tests — `dateOfBirth` now long format
* Corresponding `pdf/pdf-generator.test.ts` files for the above
* `apps/web/src/pages/(list-types)/magistrates-standard-list/` controller and `.njk` tests if they assert date strings

### 6.5 Regression — upload path must be untouched

* `libs/list-types/common/src/conversion/excel-to-json.test.ts` — **every existing assertion passes with no edit.** A real date cell still converts to `15/01/2025` in the JSON. If any assertion here needs changing, the change has leaked into the validation path and is wrong.
* `libs/list-types/common/src/conversion/validators.test.ts` — unchanged; COA Civil `dd/MM/yyyy` validation still rejects malformed dates with the same message.
* Upload a real workbook for one RCJ list, COA Civil and one SSCS list on a local environment: upload succeeds, the stored JSON holds `dd/MM/yyyy`, and the generated Excel holds `d MMMM yyyy`. Confirms the two paths have genuinely diverged.

### 6.6 Manual verification

Per affected list type, on a local environment with a seeded publication:

1. Publish, download the Excel, confirm every date column reads `d MMMM yyyy` and open it in Excel to confirm the cells are text (left-aligned, no auto-reformatting on open).
2. Re-download with `?lng=cy` and confirm Welsh month names.
3. Open the PDF and the HTML view for the four shared-renderer list types and confirm they agree with the Excel.
4. Publish a payload with a deliberately malformed date (`"dateOfBirth": "not-a-date"`) and confirm the download still generates with the value passed through.


### Comment by HarveyMoj on 2026-11-06T16:36:18Z
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



