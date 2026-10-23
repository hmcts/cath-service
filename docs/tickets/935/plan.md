# Technical Plan: #935 Excel download for the Upper Tribunal hearing lists

## 1. Technical Approach

### Strategy

This follows the Excel download pattern already used for Magistrates (#871 / `1b3acadaf`, #970 / `6b05658b1`) and Civil and Family (`854792395`, `f3319ec29`):

1. Each list-type lib exports a `generate<X>Excel(options)` function. It builds an ExcelJS workbook from the converted JSON and saves it as `<artefactId>.xlsx` in the `PUBLICATIONS` blob container using `saveExcelToStorage`.
2. The function is added to `EXCEL_GENERATOR_REGISTRY` in `libs/publication/src/processing/service.ts`, keyed by `listTypeName`.
3. Nothing else needs to change for emails or downloads, because both already work from that blob:
   - `processPublication` → `generatePublicationExcel` → sets `excelPath` when a generator exists and succeeds.
   - `libs/notifications/src/notification/notification-service.ts#buildEmailDataWithFiles` always tries to download `<artefactId>.xlsx`. If it finds it, `getSubscriptionTemplateId` picks `GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION_PDF_EXCEL`, and `govnotify-client.ts` sets `excel_link_to_file` / `excel_link_text`. This covers location, case and list-type subscriptions.
   - `GET /api/flat-file/:artefactId/download?format=excel` (`libs/public-pages/src/flat-file/flat-file-service.ts#getExcelForDownload`) already serves the blob, with display-window and access checks.
   - The PDF+Excel Notify template env var is already set in `apps/web/helm/values.yaml` and `apps/api/helm/values.yaml`.

### List types in scope (by `listTypeName`, never the numeric id)

| Ticket name | `listTypeName`(s) | Lib | Existing PDF generator |
|---|---|---|---|
| UT (Tax and Chancery Chamber) | `UT_TAX_AND_CHANCERY_CHAMBER_DAILY_HEARING_LIST` | `upper-tribunal-tax-and-chancery-chamber-daily-hearing-list` | `generateUtccDailyHearingListPdf` |
| UT (Lands Chamber) | `UT_LANDS_CHAMBER_DAILY_HEARING_LIST` | `upper-tribunal-lands-chamber-daily-hearing-list` | `generateUtlcDailyHearingListPdf` |
| UT (Administrative Appeals Chamber) | `UT_ADMINISTRATIVE_APPEALS_CHAMBER_DAILY_HEARING_LIST` | `upper-tribunal-administrative-appeals-chamber-daily-hearing-list` | `generateUtaacDailyHearingListPdf` |
| UTIAC Statutory Appeal | `UTIAC_STATUTORY_APPEAL_DAILY_HEARING_LIST` | `utiac-statutory-appeal-daily-hearing-list` | `generateUtiacStatutoryAppealDailyHearingListPdf` |
| UTIAC Judicial Review (London) | `UTIAC_JR_LONDON_DAILY_HEARING_LIST` | `utiac-jr-daily-hearing-list` | `generateUtiacJrLondonDailyHearingListPdf` |
| UTIAC Judicial Review (regional) | `UTIAC_JR_LEEDS_DAILY_HEARING_LIST`, `UTIAC_JR_MANCHESTER_DAILY_HEARING_LIST`, `UTIAC_JR_BIRMINGHAM_DAILY_HEARING_LIST`, `UTIAC_JR_CARDIFF_DAILY_HEARING_LIST` | `utiac-jr-daily-hearing-list` | `generateUtiacJrLeedsDailyHearingListPdf` / `createUtiacJrDailyHearingListPdfGenerator(...)` |

The ticket lists five lists, but "Judicial Review" is really five list types (London plus four regional ones). London has a different column set. All nine get registry entries.

### Key architecture decision: regenerate from JSON, don't store the original upload

AC2 says "the uploaded excel file will be re-used". Findings:

- All nine list types are non-strategic and uploaded as Excel. Each has an `ExcelConverterConfig` registered with `registerConverterByName` (`src/conversion/*-config.ts`).
- The original upload is **deliberately thrown away** after conversion: `apps/web/src/pages/(admin)/non-strategic-upload-summary/index.ts` has the comment "original Excel is not stored (no value after conversion)". Only the converted JSON goes to blob storage.
- The same page also accepts `.json` uploads for these list types, and those have no Excel to re-use.
- No earlier Excel ticket re-used an original upload. They all generated a fresh workbook from JSON.
- For every UT list, the uploaded Excel columns, the JSON fields and the PDF table columns are the same set **in the same order**. For example, UTCC is Time, Case Reference Number, Case Name, Judge(s), Member(s), Hearing Type, Venue, Additional Information in the converter, the model and `pdf-template.njk`.

**Decision:** create a fresh workbook from the validated JSON, with one row per hearing and columns in the same order as the upload template. This meets AC2's intent (the downloaded file mirrors the uploaded spreadsheet) and AC3 (every PDF table field is present). It also:

- works for JSON uploads, not just Excel ones;
- never passes admin-supplied spreadsheet content (formulas, hidden sheets, external links, extra columns) through to the public; every cell goes through `sanitiseCellValue` (CSV/formula injection guard);
- keeps the same data and format pipeline as the PDF, so the two files can't drift apart;
- doesn't change the upload controller in `apps/`.

Storing the original upload is still possible if the PO insists (see Clarifications). It would mean writing `uploadData.file` to `PUBLICATIONS/<artefactId>.xlsx` in the upload summary controller and skipping the generator for Excel-sourced uploads. I don't recommend it, for the reasons above.

### DRY: one shared flat-list helper

The earlier generators each repeat about 40 lines of workbook, header, rows, autofit and save code. All nine UT lists are flat arrays (one row per hearing, no nesting), so add one small helper to `@hmcts/list-types-common`, next to the existing `excel-utilities.ts`:

```ts
generateFlatListExcel<T>({ artefactId, worksheetName, columns: { header: string; value: (row: T) => string | undefined }[], rows: T[] })
  => Promise<{ success: boolean; excelPath?: string; error?: string }>
```

The helper:
- truncates the sheet name to 31 characters (ExcelJS limit);
- makes the header row bold;
- runs each cell through `sanitiseCellValue(value ?? "")`;
- calls `autoFitColumns` and then `saveExcelToStorage`;
- catches errors and returns `{ success: false, error }`.

It lives in `list-types-common` rather than `upper-tribunal-common` because the UTIAC libs don't depend on `upper-tribunal-common`, while all five libs already depend on `list-types-common`, which already has `exceljs`. The per-lib wrappers don't need an `exceljs` dependency.

### Column headers: reuse the existing `tableHeaders` locale keys

The PDF headers already come from `t.tableHeaders` (and `londonTableHeaders` / `londonTableHeadersCy` for JR London) in each lib's `locales/en.ts` / `cy.ts`. The Excel generators use the same keys. There is no new `excelColumns` block (unlike the Magistrates tickets), so English and Welsh keys stay in sync automatically and PDF and Excel headers can't diverge.

## 2. Implementation Details

**TEMPLATE SOURCE: n/a**

No page templates, no API endpoints and no database schema changes. There are no migrations and no `list-type-data.ts` changes.

### New files

| File | Purpose |
|---|---|
| `libs/list-types/common/src/excel/flat-list-excel-generator.ts` | `generateFlatListExcel` shared helper |
| `libs/list-types/common/src/excel/flat-list-excel-generator.test.ts` | Real ExcelJS round-trip; `@hmcts/azure-blob` mocked |
| `libs/list-types/upper-tribunal-tax-and-chancery-chamber-daily-hearing-list/src/excel/excel-generator.ts` | `generateUtccDailyHearingListExcel` |
| `libs/list-types/upper-tribunal-tax-and-chancery-chamber-daily-hearing-list/src/excel/excel-generator.test.ts` | |
| `libs/list-types/upper-tribunal-lands-chamber-daily-hearing-list/src/excel/excel-generator.ts` | `generateUtlcDailyHearingListExcel` |
| `libs/list-types/upper-tribunal-lands-chamber-daily-hearing-list/src/excel/excel-generator.test.ts` | |
| `libs/list-types/upper-tribunal-administrative-appeals-chamber-daily-hearing-list/src/excel/excel-generator.ts` | `generateUtaacDailyHearingListExcel` |
| `libs/list-types/upper-tribunal-administrative-appeals-chamber-daily-hearing-list/src/excel/excel-generator.test.ts` | |
| `libs/list-types/utiac-statutory-appeal-daily-hearing-list/src/excel/excel-generator.ts` | `generateUtiacStatutoryAppealDailyHearingListExcel` |
| `libs/list-types/utiac-statutory-appeal-daily-hearing-list/src/excel/excel-generator.test.ts` | |
| `libs/list-types/utiac-jr-daily-hearing-list/src/excel/excel-generator.ts` | `generateUtiacJrDailyHearingListExcel` (regional: Leeds, Manchester, Birmingham, Cardiff) |
| `libs/list-types/utiac-jr-daily-hearing-list/src/excel/excel-generator-london.ts` | `generateUtiacJrLondonDailyHearingListExcel` (matches the existing `pdf-generator-london.ts` split) |
| `libs/list-types/utiac-jr-daily-hearing-list/src/excel/excel-generator.test.ts`, `excel-generator-london.test.ts` | |

### Column order per list (same as the converter and PDF; headers from `t.tableHeaders`)

| List | Columns |
|---|---|
| UTCC | time, caseReferenceNumber, caseName, judges, members, hearingType, venue, additionalInformation |
| UTLC | time, caseReferenceNumber, caseName, judges, members, hearingType, venue, modeOfHearing, additionalInformation |
| UTAAC | time, appellant, caseReferenceNumber, judges, members, modeOfHearing, venue, additionalInformation |
| UTIAC SA | hearingTime, appellant, representative, appealReferenceNumber, judges, hearingType, location, additionalInformation |
| UTIAC JR regional | venue, judges, hearingTime, caseReferenceNumber, caseTitle, hearingType, additionalInformation |
| UTIAC JR London | hearingTime, caseTitle, representative, caseReferenceNumber, judges, hearingType, location, additionalInformation |

### Wrapper shape (example: UTCC)

```ts
import { generateFlatListExcel } from "@hmcts/list-types-common";
import { cy } from "../locales/cy.js";
import { en } from "../locales/en.js";
import type { UtccHearing, UtccHearingList } from "../models/types.js";
import { renderUtccDailyHearingListData } from "../rendering/renderer.js";

const WORKSHEET_NAME = "UT Tax and Chancery Chamber";

export async function generateUtccDailyHearingListExcel(options: ExcelGenerationOptions) {
  const t = options.locale === "cy" ? cy : en;
  const { hearings } = renderUtccDailyHearingListData(options.jsonData, { locale, contentDate, lastReceivedDate: new Date().toISOString(), listTitle: t.pageTitle });
  return generateFlatListExcel<UtccHearing>({ artefactId, worksheetName: WORKSHEET_NAME, rows: hearings, columns: [
    { header: t.tableHeaders.time, value: (h) => h.time }, /* ... */
  ]});
}

interface ExcelGenerationOptions { artefactId: string; locationId: string; contentDate: Date; locale: string; listTypeName: string; jsonData: UtccHearingList; }
```

Rows go through the existing renderer so the Excel uses exactly the same data as the PDF (the rule from #675: renderers are the single source of transformed data).

### Modified files

| File | Change |
|---|---|
| `libs/list-types/common/src/index.ts` | Export `generateFlatListExcel` |
| `libs/list-types/*/src/index.ts` (5 UT libs) | Export the new `generate*Excel` function(s) |
| `libs/publication/src/processing/service.ts` | Import the new generators; add 9 `EXCEL_GENERATOR_REGISTRY` entries keyed by `listTypeName` (the 4 regional JR names share `generateUtiacJrDailyHearingListExcel`) |
| `libs/publication/src/processing/service.test.ts` | Add `generate*Excel: vi.fn()` to the 5 existing UT `vi.mock` blocks; extend `listTypeHasExcel` with an `it.each` over the 9 UT names; add a `processPublication` test showing a UT list sets `excelPath` and that an Excel failure still leaves `pdfPath` set and notifications sent |

No changes to `libs/notifications`, `libs/public-pages`, helm values or `apps/`.

## 3. Error Handling & Edge Cases

- **Generator throws or fails:** `generateFlatListExcel` catches the error and returns `{ success: false, error }`. `generatePublicationExcel` logs a warning (artefact id only, no personal data) and returns `{}`. The PDF is still generated and the email goes out as PDF-only, as today.
- **No blob found at email time:** `buildEmailDataWithFiles` already falls back to the PDF-only template.
- **Excel or PDF of 2MB or more:** existing behaviour; `filesUnder2MB` is false and the no-links template is used. Real UT daily lists are far below this.
- **Missing or undefined cell value:** the helper coerces `value ?? ""` before `sanitiseCellValue`. Without this, `sanitiseCellValue(undefined)` throws when it reads `value[0]`.
- **Formula/CSV injection:** every cell goes through `sanitiseCellValue` (prefixes `=`, `+`, `-`, `@` with `'`).
- **Empty hearings array:** converters require `minRows: 1`, but a JSON upload could be empty if the schema allows it. The helper then writes a header-only sheet. Tests cover this.
- **Re-upload (`isUpdate`):** `createArtefact` returns the same `artefactId`, so `<artefactId>.xlsx` is overwritten and never left stale.
- **Welsh-language publication (`locale === "cy"`):** headers come from `cy.tableHeaders`. Several UTIAC JR Welsh headers are still `[WELSH TRANSLATION REQUIRED: ...]` placeholders (`utiac-jr-daily-hearing-list/src/locales/cy.ts`), and those would appear in the Welsh Excel exactly as they already do in the Welsh PDF. See Clarifications.
- **Worksheet name:** keep each constant within 31 characters. The helper also truncates as a safeguard.
- **Access control and expiry:** downloads go through the existing `getExcelForDownload` guard (display window and `canAccessPublicationData`). UT lists default to `Public` sensitivity.

## 4. Acceptance Criteria Mapping

| AC | How it is met | How it is verified |
|---|---|---|
| Excel and PDF files are available for all UT hearing lists | The 9 UT `listTypeName`s are added to `EXCEL_GENERATOR_REGISTRY`, so `processPublication` writes `<artefactId>.xlsx` next to the PDF. `/api/flat-file/:id/download?format=excel` serves it | `service.test.ts`: `listTypeHasExcel` returns true for all 9 names; `processPublication` sets `excelPath` for a UT list. Manual check: non-strategic upload of each UT list on local/STG, then download `?format=excel` |
| The uploaded Excel is re-used | The generated workbook has the same columns, in the same order, as the upload template for each list, built from the JSON converted from that upload (see the decision in section 1) | Per-lib tests assert the header row matches the converter's field order. **Needs PO confirmation (Clarification 1)** |
| All PDF data fields are in the Excel | Columns come from the same `tableHeaders` keys and renderer output as `pdf-template.njk` | Per-lib tests load the saved buffer with ExcelJS and assert headers equal the `tableHeaders` values (en and cy) and each row's cells equal the fixture hearing fields |
| Email shows links for both file types | No code change needed: `buildEmailDataWithFiles` finds the blob, picks `GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION_PDF_EXCEL` and sets `excel_link_to_file` | Existing notification tests cover template choice. Manual check: subscribe a verified user to a UT venue on STG, upload, and confirm the email has both "Download PDF" and "Download Excel version" links |

## 5. CLARIFICATIONS NEEDED

1. **"Re-use the uploaded Excel" versus "all PDF fields in the Excel".** Today the original upload is discarded after conversion (`non-strategic-upload-summary/index.ts`), and these lists can also be uploaded as JSON, where there is no Excel to re-use. The plan generates a clean workbook from the converted JSON with the same columns and order as the upload template. Is that acceptable? Or must the file be the byte-for-byte original upload? That option would mean storing untrusted admin files for public download, would do nothing for JSON uploads, and would keep any extra columns, formulas or formatting.
2. **Header/metadata fields.** The PDF also shows the list title, "List for" date, "Last updated" date/time, the important-information text, data source and caution notes. Earlier Excel tickets only included the hearing table. Should the UT Excel include any of this (for example a title row or a metadata sheet), or is the hearing table enough to meet "all data fields"?
3. **Judicial Review scope.** The ticket says "UTIAC - Judicial Review: Daily hearing list" (singular). The service has five JR list types (London, Leeds, Manchester, Birmingham, Cardiff). The plan covers all five. Please confirm.
4. **Welsh placeholders.** Several UTIAC JR `cy.tableHeaders` values are `[WELSH TRANSLATION REQUIRED: ...]`. They already show in the Welsh PDF and would show in the Welsh Excel too. Are real translations available, or can this ship as-is?
5. **On-page download links.** The ACs only mention emails. UT list pages don't currently show a download link, and earlier Excel tickets didn't add one. Confirm that no "Download Excel" link is needed on the list pages for this ticket.
