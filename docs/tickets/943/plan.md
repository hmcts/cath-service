# Plan: #943 — Excel download for the First-tier Tribunal hearing lists

## 1. Technical Approach

### Goal
When an in-scope First-tier Tribunal (FTT) list is published through the non-strategic Excel upload, the subscription email carries a PDF link and an Excel link. The Excel is built from the uploaded workbook. The same file is served by the existing `GET /api/flat-file/:artefactId/download?format=excel`.

### Scope, checked against the code
All five libs are unchanged by the #940–#941 stack, so these were read from the working tree. Names are from `libs/list-types/common/src/list-type-data.ts`.

| Ticket name | Real `listTypeName` | `list-type-data.ts` | Lib | Converter |
|---|---|---|---|---|
| FTT (War Pensions and Armed Forces Compensation) Weekly | `WPAFCC_WEEKLY_HEARING_LIST` | :501 | `libs/list-types/wpafcc-weekly-hearing-list` | `WPAFCC_EXCEL_CONFIG` (`src/conversion/wpafcc-config.ts`) |
| FTT (Tax Chamber) Weekly | `FTT_TAX_CHAMBER_WEEKLY_HEARING_LIST` | :369 | `libs/list-types/ftt-tax-chamber-weekly-hearing-list` | `FTT_TAX_EXCEL_CONFIG` (`src/conversion/ftt-tax-config.ts`) |
| FTT (Special Educational Needs and Disability) Daily | `SEND_DAILY_HEARING_LIST` | :457 | `libs/list-types/send-daily-hearing-list` | `SEND_EXCEL_CONFIG` (`src/conversion/send-config.ts`) |
| FTT (Land Registration Tribunal) Weekly | `FTT_LANDS_REGISTRATION_TRIBUNAL_WEEKLY_HEARING_LIST` ("LANDS", not "LAND") | :380 | `libs/list-types/ftt-lands-registration-tribunal-weekly-hearing-list` | `FTT_LRT_EXCEL_CONFIG` (`src/conversion/ftt-lrt-config.ts`) |
| FTT (Property Chamber) Residential Property Weekly, all regions | `FTT_RPT_EASTERN_WEEKLY_HEARING_LIST`, `FTT_RPT_LONDON_WEEKLY_HEARING_LIST`, `FTT_RPT_MIDLANDS_WEEKLY_HEARING_LIST`, `FTT_RPT_NORTHERN_WEEKLY_HEARING_LIST`, `FTT_RPT_SOUTHERN_WEEKLY_HEARING_LIST`, `FTT_RPT_MARKET_RENTS_WEEKLY_HEARING_LIST` | :391–446 | `libs/list-types/ftt-rpt-weekly-hearing-list` | `FTT_RPT_EXCEL_CONFIG`, one converter registered under all 6 names |

That is 10 names across 5 libs, matching the spec. All 10 have `isNonStrategic: true` and `urlPath` values that equal the lib folder names. All are `defaultSensitivity: "Public"` except SEND, which is `"Private"`. All 10 are already in `PDF_GENERATOR_REGISTRY` (`libs/publication/src/processing/service.ts`, stack lines 191 and 263–308). None is in `EXCEL_GENERATOR_REGISTRY`.

- **Market Rents is included by default.** It is not a region, but it shares `urlPath: "ftt-rpt-weekly-hearing-list"`, the converter and the PDF generator with the 5 regions, and its friendly name is "First-tier Tribunal (Residential Property Tribunal): Market Rents Weekly Hearing List". See Clarification 2.
- **The ticket's naming is not the code's.** The ticket says "Property Chamber - Residential Property", but every RPT list is named "First-tier Tribunal (Residential Property Tribunal): … Weekly Hearing List".

**Not in scope (similar names):**
- Upper Tribunal lists: `UT_LANDS_CHAMBER_DAILY_HEARING_LIST`, `UT_TAX_AND_CHANCERY_CHAMBER_DAILY_HEARING_LIST`.
- FTT chambers the ticket does not list: `CARE_STANDARDS_TRIBUNAL_WEEKLY_HEARING_LIST`, `PHT_WEEKLY_HEARING_LIST`, `MENTAL_HEALTH_TRIBUNAL_HEARING_LIST`, `CIC_WEEKLY_HEARING_LIST`, `GRC_WEEKLY_HEARING_LIST`, `AST_DAILY_HEARING_LIST`, `IAC_DAILY_LIST`. SSCS was #942.

### Dependency and base branch
- #943 is the fourth ticket in the stack. The infrastructure it reuses is not on master:
  - #940 (PR #1122): `uploadedExcel` passed from `non-strategic-upload-summary` through `processPublication` into `generatePublicationExcel`, and `createUploadedExcelGenerator`.
  - #942 (PR #1129): the allow-list `reformatUploadedWorkbook`, the fixed `readCellValue`, guarded stale-xlsx deletes.
  - #941 (PR #1133): `matchByNameOnly` on `ReformatSheetConfig`.
- **Base:** `feature/941-rolls-building-excel` (`f1521ded`).
- **Branch name:** `origin/feature/943-ftt-excel-download` already exists. It has one obsolete docs commit (`9a4aa775`, the spec's JSON-regeneration plan), is based on old master, and is not in the stack's history. Do not reuse it. Create **`feature/943-ftt-excel`** from `feature/941-rolls-building-excel`, which is how #941 handled the same problem. Reusing the old name would need a `--force-with-lease` push and the owner's OK.
- **Keep current by merging, not rebasing:** merge `feature/941-rolls-building-excel` into `feature/943-ftt-excel` when the stack moves. After the stack lands, merge `origin/master`.
- **Merge order:** #1122, then #1129, then #1133, then #943. If the team merges only the stack's tip, #943 follows it.

### Where this plan departs from the ticket spec
| Spec says | This plan | Why |
|---|---|---|
| Build a new workbook from the artefact JSON (`generateNonStrategicExcel` in common plus 5 per-lib generators) | Reformat the uploaded workbook with the shared `reformatUploadedWorkbook` | AC2 says the uploaded file is re-used. This is the mechanism #940–#941 settled on. The allow-list copy already answers the spec's objection to the raw upload: hidden sheets, notes, formulas and metadata are never copied (#942 review leak check) |
| Excel also for JSON published through `POST /publication` (spec AC scenario 2) | No Excel for JSON by default. Any stale xlsx is deleted and the email is PDF-only | Series default. #942 added a JSON fallback for SSCS only because the user asked. The spec's "roughly half arrive as JSON" has no evidence in the code. See Clarification 1 — confirmed by the PO: these lists are upload-only, never published as JSON. |
| Row 2 holds "`dd/MM/yyyy` date formatting produced by the renderer" | Dates are written as the PDF prints them: `15 January 2026` (en) or `15 Ionawr 2026` (cy) | The spec is wrong about the PDF. Four renderers call `formatDdMmYyyyDate(hearing.date, locale)` (`libs/list-types/common/src/rendering/date-formatting.ts:62`), which returns a long, localised date |
| New `shortSheetName` locale keys in 5 libs, plus Welsh translations | None | The reformatter keeps the uploaded sheet name. It never names a sheet, so no new content is needed |
| `fttRptExcelGenerator("Eastern region")` and so on, one per region | One `reformatFttRptWeeklyHearingListExcel` registered under all 6 names | The 6 RPT names share the converter, the table and the table formatting. The region only changes the title, the important-information email and the Market Rents extra paragraph, all outside the table |
| Fix the English `cy.tableHeaders` in Tax and LRT | Not here. The Excel uses the same `cy.tableHeaders` as the PDF | Changing them changes the Welsh PDF too. See Clarification 3 |
| E2E in `subscription-notifications.spec.ts` via the API | One step added to the existing `@nightly` Excel upload journey | That is where #940–#941 test this. With no JSON fallback, the API route produces no Excel |

These parts of the spec are accurate and are kept:
- The column table in spec §6.4: order and fields match every `pdf-template.njk`.
- No changes to `libs/notifications`, Helm or env vars: `buildEmailDataWithFiles` probes `${artefactId}.xlsx` (stack `notification-service.ts:513`), and `getSubscriptionTemplateId` picks `GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION_PDF_EXCEL` when both files exist and are under 2MB (stack `template-config.ts:39-42`).
- Explicit per-name registration, never "every non-strategic list".

### Decided defaults carried from the series
FTT gives no reason to change any of these:
- **Reformat the upload.** Use the shared reformatter: not the raw bytes and not a JSON-regenerated workbook. Unknown columns and sheets are dropped.
- **Excel uploads only.** JSON publications stay PDF-only (Clarification 1).
- **Table fields only.** Not included: the list title, "List for week commencing", "Last updated", important information, the RPT regional email, the Market Rents extra paragraph, the data source and the caution notes.
- **No changes** to `apps/web`, `libs/notifications` or `libs/public-pages`. The summary page already passes `uploadedExcel` for any non-strategic list with a registered converter (stack `apps/web/src/pages/(admin)/non-strategic-upload-summary/index.ts:127-137,175`). `listTypeHasExcel` is not used by any page, so registering these names adds no on-page link.

### Field parity: converter vs PDF table vs PDF formatting
| List | Converter fields, in order (`fieldName`) | PDF columns (`pdf-template.njk`, `t.tableHeaders.*`) | PDF value formatting (renderer) | `formatRow` |
|---|---|---|---|---|
| WPAFCC | date, hearingTime, caseReferenceNumber, caseName, panel, modeOfHearing, venue, additionalInformation (optional; the rest are required) | same 8, same order | `date` → `formatDdMmYyyyDate(date, locale)`. Everything else is raw (`rendering/renderer.ts:26-35`) | format `date` |
| Tax Chamber | date, hearingTime, caseName, caseReferenceNumber, judges, members, venuePlatform (all required) | same 7, same order | `date` long form, the rest raw (`renderer.ts:26-34`). The PDF goes through the shared `generateFttSiacWeeklyHearingListPdf`, which renders the lib's own template | format `date` |
| Land Registration | date, hearingTime, caseName, caseReferenceNumber, judge, venuePlatform (all required) | same 6, same order | `date` long form, the rest raw | format `date` |
| SEND | time, caseReferenceNumber, respondent, hearingType, venue, timeEstimate (all required) | same 6, same order | none: `hearingList.map((h) => ({ ...h }))` (`renderer.ts:32`) | identity |
| RPT (6 names) | date, time, venue, caseType, caseReferenceNumber, judges, members, hearingMethod, additionalInformation (all required) | same 9, same order | `date` long form, the rest raw (`renderer.ts:26-36`) | format `date` |

- Every PDF table column is covered by a converter field, and there are no extra converter fields. So dropping unmapped columns removes only content the PDF never showed.
- Times are never normalised by these PDFs. That differs from RCJ and B&P (`normaliseHearing`). An uploaded `10.30am` stays `10.30am`. A real Excel time cell is read as `10:30am` by `readCellValue` on both sides.
- Upload header text differs from the PDF headings in places, for example Tax "Hearing Time" vs "Hearing time" and RPT "Case Type" vs "Case type". Matching is case-insensitive (`findFieldForHeader`), and the output headings are always `t.tableHeaders[field]`, so the Excel uses the PDF's headings.
- **Sheet:** all 5 converters use `createConverter`, which reads `workbook.worksheets[0]` (`convertExcelToJson`). So every config is `{ worksheetIndex: 0 }`, the same as SSCS. `matchByNameOnly` is not used.

### Quirks, and whether the shared code handles them
1. **Date formatting needs the locale, but `formatRow` has no locale argument.** This is handled by a closure in each per-lib reformatter: `formatRow: (row) => ({ ...row, date: formatDdMmYyyyDate(row.date, locale) })`. No change to `ReformatSheetConfig`.
   - Why not call the renderer from `formatRow`: the renderers take the whole list plus `contentDate`, `lastReceivedDate` and `listTitle`, which are only used for the header.
   - The parity tests use the real renderer as the oracle, so the inline date formatting cannot drift from the PDF without a test failing.
2. **`formatDdMmYyyyDate("")` returns `"Invalid Date"`.** This cannot happen. `date` is required with a `dd/MM/yyyy` validator in all 4 dated converters. The summary page re-converts the same buffer before `processPublication` (stack `index.ts:135`), so any row the reformatter copies has already passed validation. No guard is added (YAGNI). A test pins the long-date output.
3. **Dates become text in the Excel.** `15 January 2026` is a string, so it does not sort as a date in a spreadsheet. This matches the PDF (AC3 and the series' "PDF-formatted values"). Clarification 4 asks whether the PO prefers the uploaded `dd/MM/yyyy`.
4. **WPAFCC `additionalInformation` is optional.** An empty cell gives `""` in both outputs. Unlike #941 review suggestion 1, this case is reachable, so it gets a test.
5. **Welsh headings are placeholders or English in 3 libs.** WPAFCC `cy.tableHeaders` holds `[WELSH TRANSLATION REQUIRED: '…']` for 7 of 8 keys. Tax and LRT `cy.tableHeaders` are English. The Welsh Excel shows the same as the Welsh PDF. A header value starting with `[` is not a formula character, so `sanitiseCellValue` leaves it alone. SEND and RPT have real Welsh. Clarification 3.
6. **RPT regions.** One reformatter fits all 6 names, because nothing region-specific is in the table. A wrong or missing registry key would fail silently, so the service test derives the 6 names from `listTypeData` by `urlPath`.
7. **SEND is `Private` by default.** No change is needed. The flat-file Excel endpoint applies `canAccessPublicationData` (stack `flat-file-service.ts:92`), and the email follows the existing subscription access rules. The Excel holds exactly the PDF's fields.
8. **Inherited, not fixed here.** These are #942 review items that are still open:
   - **HIGH 5, duplicate mapped headers.** Example: an RPT upload with two "Judge(s)" columns. The PDF shows the last one (`rowData[header]` overwrites) and the Excel shows the first.
   - **HIGH 3, stale xlsx on a failed delete or list-type lookup.**
   - **Suggestion 1, blank spacer rows.**
   - **Suggestion 2, copied `fill` and `numFmt`.** Example: a date cell with an upload `numFmt` now holds a text value. That is harmless for text, but a red "check" fill would be copied.

   None is specific to FTT. They belong in #942.

**Conclusion: the shared reformatter needs no change for these lists.** #943 is per-lib config, registry entries and tests.

## 2. Implementation Details

TEMPLATE SOURCE: n/a (no new rendered page — this ticket adds an Excel download file to existing First-tier Tribunal list types and their email notifications)

No new pages, templates, routes, API endpoints, Prisma schema, migrations or `list-type-data.ts` entries. No changes to `apps/web`, `libs/notifications`, `libs/public-pages` or `libs/list-types/common`.

### File structure
```
libs/list-types/wpafcc-weekly-hearing-list/
├── package.json                        CHANGED  devDependencies: "exceljs": "4.4.0" (test fixtures)
└── src/
    ├── index.ts                        CHANGED  export the reformatter
    └── excel/
        ├── excel-reformatter.ts        NEW
        └── excel-reformatter.test.ts   NEW
libs/list-types/ftt-tax-chamber-weekly-hearing-list/                    (same 4 changes)
libs/list-types/ftt-lands-registration-tribunal-weekly-hearing-list/    (same 4 changes)
libs/list-types/send-daily-hearing-list/                                (same 4 changes)
libs/list-types/ftt-rpt-weekly-hearing-list/                            (same 4 changes)

libs/publication/src/processing/
├── service.ts                          CHANGED  5 imports, 10 registry entries
└── service.test.ts                     CHANGED

e2e-tests/tests/admin/non-strategic-upload.spec.ts   CHANGED  one FTT step in the existing @nightly Excel journey
```
The reformatter only imports from `@hmcts/list-types-common`, so `exceljs` is needed for tests only, as a devDependency (as in `rcj-standard-daily-cause-list`). Run `yarn install` after editing the five `package.json` files.

### A. Per-lib reformatters
Each reformatter is a thin config over the lib's own converter fields and `t.tableHeaders`. This is the same pattern as `libs/list-types/sscs-daily-hearing-list/src/excel/excel-reformatter.ts` on the stack.

```ts
// libs/list-types/ftt-rpt-weekly-hearing-list/src/excel/excel-reformatter.ts
import { formatDdMmYyyyDate, reformatUploadedWorkbook } from "@hmcts/list-types-common";
import { FTT_RPT_EXCEL_CONFIG } from "../conversion/ftt-rpt-config.js";
import { cy } from "../locales/cy.js";
import { en } from "../locales/en.js";

export async function reformatFttRptWeeklyHearingListExcel(buffer: Buffer, locale: string): Promise<Buffer> {
  const t = locale === "cy" ? cy : en;

  // The PDF prints the hearing date in long form and every other value as uploaded
  return reformatUploadedWorkbook(buffer, [
    {
      worksheetIndex: 0,
      fields: FTT_RPT_EXCEL_CONFIG.fields,
      headers: t.tableHeaders,
      formatRow: (row) => ({ ...row, date: formatDdMmYyyyDate(row.date, locale) })
    }
  ]);
}
```

| Lib | Function (exported from `src/index.ts`) | Fields | `formatRow` |
|---|---|---|---|
| wpafcc | `reformatWpafccWeeklyHearingListExcel` | `WPAFCC_EXCEL_CONFIG.fields` | long date |
| ftt-tax | `reformatFttTaxChamberWeeklyHearingListExcel` | `FTT_TAX_EXCEL_CONFIG.fields` | long date |
| ftt-lrt | `reformatFttLrtWeeklyHearingListExcel` (matches `generateFttLrtWeeklyHearingListPdf`) | `FTT_LRT_EXCEL_CONFIG.fields` | long date |
| send | `reformatSendDailyHearingListExcel` | `SEND_EXCEL_CONFIG.fields` | identity, with a comment that the PDF prints values as uploaded |
| ftt-rpt | `reformatFttRptWeeklyHearingListExcel` | `FTT_RPT_EXCEL_CONFIG.fields` | long date |

- Export line: `export { reformatXExcel } from "./excel/excel-reformatter.js";`.
- No locale changes.
- No circular-dependency change. Tax, LRT, SEND and RPT already import from `@hmcts/publication` (`PROVENANCE_LABELS`, `ValidationResult`), and `@hmcts/publication` already imports their PDF generators.

### B. Per-lib tests (`excel-reformatter.test.ts`)
Use real ExcelJS round trips and the AAA pattern. Do not mock `@hmcts/list-types-common`. Import `../conversion/<x>-config.js` so the converter is registered. The fixture has:
- a first sheet with a non-default name (for example "RPT London"), the uploaded header text from the converter plus an "Internal notes" column, and 2 hearing rows (dates `15/01/2026` and `16/01/2026`, one time `10.30am`)
- a second sheet, "Notes", that repeats the headers

Tests per lib:
- The English headings equal `FIELD_ORDER.map((f) => en.tableHeaders[f])` and are bold.
- The Welsh headings equal the same for `cy`.
- **Parity (AC3).** The data rows equal `renderX(convertExcelForListTypeName(NAME, upload), renderOptions).hearings` mapped by `FIELD_ORDER`, for `en` and for `cy`, and `rowCount` is 3. The real renderer is the oracle.
- The date is `15 January 2026` for en and `15 Ionawr 2026` for cy (not for SEND). The time stays `10.30am`.
- The output has one sheet. It keeps the uploaded name ("RPT London"), so "Notes" is dropped, and it has no "Internal notes" column.
- WPAFCC only: an empty Additional information cell gives `""`.
- RPT: run the parity test with `FTT_RPT_LONDON_WEEKLY_HEARING_LIST` as `NAME`. The converter is the same object for all 6 names, so one name is enough. The registry side is covered in §D.

### C. `libs/publication/src/processing/service.ts`
- Add each reformatter to the lib's existing import (5 imports).
- Add a shared generator for RPT, next to `rcjStandardUploadedExcelGenerator` and `sscsExcelGenerator`:
  ```ts
  const fttRptUploadedExcelGenerator = createUploadedExcelGenerator(reformatFttRptWeeklyHearingListExcel);
  ```
- Add to `EXCEL_GENERATOR_REGISTRY` (no JSON fallback):
  ```ts
  WPAFCC_WEEKLY_HEARING_LIST: createUploadedExcelGenerator(reformatWpafccWeeklyHearingListExcel),
  FTT_TAX_CHAMBER_WEEKLY_HEARING_LIST: createUploadedExcelGenerator(reformatFttTaxChamberWeeklyHearingListExcel),
  FTT_LANDS_REGISTRATION_TRIBUNAL_WEEKLY_HEARING_LIST: createUploadedExcelGenerator(reformatFttLrtWeeklyHearingListExcel),
  SEND_DAILY_HEARING_LIST: createUploadedExcelGenerator(reformatSendDailyHearingListExcel),
  FTT_RPT_EASTERN_WEEKLY_HEARING_LIST: fttRptUploadedExcelGenerator,
  FTT_RPT_LONDON_WEEKLY_HEARING_LIST: fttRptUploadedExcelGenerator,
  FTT_RPT_MIDLANDS_WEEKLY_HEARING_LIST: fttRptUploadedExcelGenerator,
  FTT_RPT_NORTHERN_WEEKLY_HEARING_LIST: fttRptUploadedExcelGenerator,
  FTT_RPT_SOUTHERN_WEEKLY_HEARING_LIST: fttRptUploadedExcelGenerator,
  FTT_RPT_MARKET_RENTS_WEEKLY_HEARING_LIST: fttRptUploadedExcelGenerator
  ```
- Nothing else changes. These are inherited from the stack: the stale-xlsx delete when there is no upload or the reformat fails (`createUploadedExcelGenerator`), the flat-file republish delete (`deleteStaleExcel`), and `excelPath` passed to notifications.

### D. `libs/publication/src/processing/service.test.ts`
- Add the reformatter to the 5 existing `vi.mock` blocks (`@hmcts/wpafcc-weekly-hearing-list`, `@hmcts/ftt-tax-chamber-weekly-hearing-list`, `@hmcts/ftt-lands-registration-tribunal-weekly-hearing-list`, `@hmcts/ftt-rpt-weekly-hearing-list`, `@hmcts/send-daily-hearing-list`). Each mock must still provide every export `service.ts` imports.
- New `describe("uploaded Excel for First-tier Tribunal lists")`. Fixtures use `listTypeId: 999`:
  - `FTT_LIST_TYPES` = names from `listTypeData` whose `urlPath` is one of the 5 lib paths. Assert `[...FTT_LIST_TYPES].sort()` equals the 10 case names, using a copy rather than an in-place sort (#941 review suggestion 6). This catches both a wrong key and a new FTT name that was not registered.
  - `it.each(FTT_LIST_TYPES)`: `listTypeHasExcel(name)` is true.
  - `it.each(cases)`: with `uploadedExcel`, the expected reformatter is called with `(buffer, "cy")`, `saveExcelToStorage` stores the result, and `deleteBlob` is not called. The 6 RPT cases all expect `reformatFttRptWeeklyHearingListExcel`.
  - Without `uploadedExcel`: `deleteBlob("<id>.xlsx", PUBLICATIONS)` is called, no reformatter is called, and the result is not an Excel.
  - The reformatter rejects: the stale xlsx is deleted, and in `processPublication` the PDF and notifications still go ahead with no `excelPath`.
  - `processPublication` with an upload for one FTT name passes `excelPath: "<id>.xlsx"` to notifications.
- Avoid new `as any` casts where a typed fixture works (#941 review suggestion 6).

### E. E2E: `e2e-tests/tests/admin/non-strategic-upload.spec.ts`
- Extend the existing `@nightly` test rather than adding one (one journey). Rename it to "RCJ, SSCS, Rolls Building and First-tier Tribunal Excel uploads send reformatted Excel and PDF links in email @nightly".
- **STEP 8:** upload a **Welsh** `FTT_RPT_LONDON_WEEKLY_HEARING_LIST` workbook. It has one sheet "RPT London" with the RPT upload headers plus "Internal notes", and one row dated `15/01/2026`. Then:
  - download `?format=excel` with `downloadReformattedWorksheet` (no `as Worksheet` cast)
  - assert the RPT `cy` headings, a row with `15 Ionawr 2026` and every other value unchanged, and that "Internal notes" is absent
  - call `expectPdfAndExcelLinksInEmail` (#941 review suggestion 5)
- Add `getListTypeByName` for the RPT list and include it in the "not seeded" guard.
- Why one RPT step: it covers the shared multi-name generator, real Welsh headings, the locale-dependent date and both links. The other 4 libs are covered by unit tests.
- It stays inside `test.describe.skip` until the SSO specs are re-enabled, like #940–#941. The lower-environment check in tasks.md is the real gate.

### API endpoints / Database
None.

## 3. Error Handling & Edge Cases

| Case | Behaviour |
|---|---|
| Upload fails conversion (missing header, bad date, missing required value) | Rejected on the upload page by the existing converter. Nothing is published |
| Extra columns (for example "Internal notes") | Dropped. They were never in the PDF |
| Extra sheets, hidden sheets, notes, metadata, formulas, header/footer text, defined names | Not copied (#942 allow-list). The first sheet is copied even if hidden, because the PDF used it |
| Hidden rows or hidden mapped columns | Copied and unhidden, because the PDF includes them |
| Rich text, hyperlinks, formula results, Excel date or time cells in mapped columns | Read by the shared `readCellValue`, the same as the PDF data |
| Values starting with `= + - @` | Written through `sanitiseCellValue` |
| Date column | Written as the PDF prints it (`15 January 2026` / `15 Ionawr 2026`), as text |
| WPAFCC empty Additional information | `""` |
| Welsh publication | `cy.tableHeaders`, which are placeholders in WPAFCC and English in Tax and LRT (the same as the PDF), plus Welsh month names. The sheet name stays as uploaded. Notify link text is English (`govnotify-client.ts:79,89`), existing behaviour and an existing follow-up |
| No mapped header on the first sheet | Not possible after conversion. If it happened, the reformatter throws "No recognised worksheet to reformat", the stale xlsx is deleted, and the PDF and PDF-only email still go out |
| JSON publication through `POST /publication` (accepts any `x-list-type`) | No `uploadedExcel`: any stale xlsx is deleted and the email is PDF-only (default, Clarification 1) |
| Republish by Excel with the same `artefactId` | The xlsx is overwritten |
| Republish as JSON or a flat file | The stale xlsx is deleted (stack behaviour) |
| Duplicate mapped header, failed delete, blank spacer rows, copied fills | Inherited from #942 (HIGH 5, HIGH 3, suggestions 1 and 2). Not duplicated here |
| SEND (Private) | Existing access checks on the flat-file endpoint and on subscriptions. No change |
| Excel 2MB or larger | The no-links Notify template (existing). Unlikely: the upload is capped at 2MB and the output is a subset of it |
| Artefacts published before release | No Excel. Republishing creates one (Clarification 5) |
| Logging | `artefactId` and the error message only |

## 4. Acceptance Criteria Mapping

| AC | How it is met | Verification |
|---|---|---|
| Excel and PDF downloadable files for all the FTT lists above | PDFs are already registered. 10 `EXCEL_GENERATOR_REGISTRY` entries are added, keyed on the real `listTypeName`s. Delivery is by email and `/api/flat-file/:artefactId/download?format=excel`. Excel uploads only (Clarification 1) | `service.test.ts`: the `listTypeData`-derived name set equals the 10 cases, and `listTypeHasExcel` is true for each. E2E STEP 8 (skipped until SSO). Lower-environment check |
| The uploaded Excel is re-used | `uploadedExcel` (#940) is reloaded by `reformatUploadedWorkbook`. The first sheet's name, column order, row order, widths, heights and cell styles are kept | Per-lib tests: the uploaded sheet name is kept and extra content is dropped. E2E sheet-name assertion |
| All data fields in the PDF are in the Excel | Every PDF table column is a converter field, mapped in PDF order with the PDF's `t.tableHeaders`. Values use the PDF's formatting (long localised date, everything else raw). Table fields only (series default) | Per-lib parity tests against the real renderer output, en and cy. UAT comparison with the PDF |
| Links to both files in the email | No change. The xlsx exists, so `GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION_PDF_EXCEL` is used with both link personalisations | `service.test.ts`: `excelPath` is passed to notifications. Existing `template-config` tests. E2E `expectPdfAndExcelLinksInEmail`. Lower-environment check |

## 5. CLARIFICATIONS NEEDED

1. **JSON publications: Excel or not? — RESOLVED, not applicable.** Confirmed by the PO: these FTT
   list types are non-strategic and admin-uploaded as `.xlsx` only; none are published as JSON
   through `POST /publication`. The spec's "roughly half arrive as JSON via the API" claim (ticket.md
   §14) was an unverified assumption Claude introduced while drafting the technical spec, not
   something from the original issue. No JSON fallback is needed; the upload-only implementation
   stands.
2. **Is Market Rents in scope?** The default is yes. "Residential Property … (for all regions)" literally means the 5 regions, but `FTT_RPT_MARKET_RENTS_WEEKLY_HEARING_LIST` is the same RPT list type family and lib. Leaving it out would make it the only RPT list without an Excel.
3. **Welsh table headings in WPAFCC, Tax and LRT.** These are `[WELSH TRANSLATION REQUIRED: …]` placeholders (WPAFCC) or English (Tax, LRT), so the Welsh PDF and the Welsh Excel show them. The default is to leave them, since fixing them changes the PDF too. Should this be a separate ticket, or folded in? Approved Welsh for `date`, `caseReferenceNumber`, `judges`, `members`, `venue` and `time` already exists in RPT and SEND.
4. **Dates as PDF text or as uploaded?** The default writes `15 January 2026` to match the PDF (AC3), but it is text and does not sort as a date. The alternative is the uploaded `dd/MM/yyyy` (identity `formatRow`). That is just as sortable as text, but it differs from the PDF.
5. **No backfill.** Only publications processed after release get an Excel. Please confirm that is acceptable.

Carried from the series, and not re-asked unless the PO says otherwise:
- table fields only
- a cleaned copy of the upload, with unknown columns and sheets dropped
- download through the email and the existing flat-file endpoint only (no on-page journey)
- Welsh Notify link text as a separate cross-list ticket
- third-party fulfilment stays PDF-only
