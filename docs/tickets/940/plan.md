# Plan: #940 — Additional file format (Excel) for Download version of RCJ hearing lists

## 1. Technical Approach

### Goal
When an RCJ hearing list is published through the **non-strategic Excel upload**, the subscription email must carry both a PDF and an Excel download link. The Excel is the **uploaded workbook, reformatted in place**, matching legacy `hmcts/pip-data-management` PR #921 (PUB-3302, `NonStrategicListFileConverter.convertToExcel`):
- Header cells are replaced with the localised (en/cy) PDF table headings and made bold.
- Data cells for known fields are replaced with the same formatted value the PDF shows (for example, time `10.30` becomes `10:30`, and the CoA Civil future-judgment date is formatted for the locale).
- Everything else is kept as uploaded: sheet names, column order, unknown columns, other cells and styling.

RCJ lists published as JSON through the API produce **no Excel** and stay PDF-only, as in legacy. Out of scope (confirmed): `CIVIL_DAILY_CAUSE_LIST` and `FAMILY_DAILY_CAUSE_LIST` (they already have generated Excel), and the PDF header and "Important information" text. File naming stays `${artefactId}.xlsx`.

### How Excel reaches the email today (verified in code)
- `EXCEL_GENERATOR_REGISTRY` in `libs/publication/src/processing/service.ts` (~371) is keyed by `listTypeName`. `processPublication` (~654) calls `generatePublicationExcel` (~409). On success it sets `result.excelPath = ${artefactId}.xlsx`.
- The blob `${artefactId}.xlsx` in `CONTAINER.PUBLICATIONS` is written by `saveExcelToStorage` (`libs/list-types/common/src/excel/excel-utilities.ts:38`).
- `buildEmailDataWithFiles` (`libs/notifications/src/notification/notification-service.ts` ~504) checks whether that blob exists and then selects `GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION_PDF_EXCEL` (`libs/notifications/src/govnotify/template-config.ts:16`). `govnotify-client.ts` (~72–90) sets `pdf_link_to_file` and `excel_link_to_file`.
- Verified users can already download the blob through `GET /api/flat-file/:artefactId/download?format=excel` (`libs/public-pages/src/routes/api/flat-file/[artefactId]/download.ts`), which enforces access and the display window. Deleting the artefact removes the xlsx (`libs/publication/src/repository/queries.ts:189`).

No notification, Notify template, route or DB changes are needed.

### Why the upload is lost today
`apps/web/src/pages/(admin)/non-strategic-upload-summary/index.ts` converts the uploaded `.xlsx` (`uploadData.file`, held in Redis by `libs/admin-pages/src/manual-upload/storage.ts`) to JSON and stores only the JSON. The code comment says "original Excel is not stored". The buffer has to be passed on to the Excel generation step.

### Scope: 10 lists, 3 libs

| Ticket list | `listTypeName` | Lib | Sheets (as resolved by the existing converter) |
|---|---|---|---|
| Civil Courts at the RCJ | `CIVIL_COURTS_RCJ_DAILY_CAUSE_LIST` | `libs/list-types/rcj-standard-daily-cause-list` | first sheet |
| County Court at Central London Civil | `COUNTY_COURT_LONDON_CIVIL_DAILY_CAUSE_LIST` | rcj-standard | first sheet |
| Court of Appeal (Criminal Division) | `COURT_OF_APPEAL_CRIMINAL_DAILY_CAUSE_LIST` | rcj-standard | first sheet |
| Family Division of the High Court | `FAMILY_DIVISION_HIGH_COURT_DAILY_CAUSE_LIST` | rcj-standard | first sheet |
| King's Bench Division | `KINGS_BENCH_DIVISION_DAILY_CAUSE_LIST` | rcj-standard | first sheet |
| King's Bench Masters | `KINGS_BENCH_MASTERS_DAILY_CAUSE_LIST` | rcj-standard | first sheet |
| Senior Courts Costs Office | `SENIOR_COURTS_COSTS_OFFICE_DAILY_CAUSE_LIST` | rcj-standard | first sheet |
| Mayor & City Civil | `MAYOR_CITY_CIVIL_DAILY_CAUSE_LIST` | rcj-standard | first sheet |
| London Administrative Court | `LONDON_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST` | `libs/list-types/london-administrative-court-daily-cause-list` | "Main hearings" (or index 0), "Planning Court" (or index 1) |
| Court of Appeal (Civil Division) | `COURT_OF_APPEAL_CIVIL_DAILY_CAUSE_LIST` | `libs/list-types/court-of-appeal-civil-daily-cause-list` | "Daily hearings" (or index 0), "Notice for future judgments" (or index 1) |

### Architecture decisions
- **Library:** `exceljs` (4.4.0), already used by `@hmcts/list-types-common` for conversion and generation. `xlsx`/SheetJS is not used.
- **One shared reformatter in `@hmcts/list-types-common`:** new `libs/list-types/common/src/excel/uploaded-workbook-reformatter.ts`, exporting `reformatUploadedWorkbook(buffer, sheets)`. Per-list knowledge is supplied as thin config from each list-type lib.
- **Reuse instead of duplicating:**
  - **Header to field mapping:** legacy uses an UPPER_UNDERSCORE to lowerCamel normalisation. Cath does not; its Excel to JSON conversion matches each header case-insensitively and trimmed against an explicit `FieldConfig { header, fieldName }` list (`getField` in `libs/list-types/common/src/conversion/excel-to-json.ts:144`). Extract that match into an exported `findFieldForHeader(fields, header)` and use it in both `getField` and the reformatter. The field lists are the existing converter configs (`RCJ_EXCEL_CONFIG`, `RCJ_EXCEL_CONFIG_SIMPLE_TIME`, `FUTURE_JUDGMENTS_CONFIG`), so the Excel recognises exactly the columns the PDF was built from.
  - **Reading cells:** extract `formatDateValue` plus `String(...).trim()` from `excel-to-json.ts` into an exported `readCellValue(value)`. Raw values are then read exactly as the conversion read them.
  - **Sheet resolution:** extract `workbook.getWorksheet(name) || workbook.worksheets[index]` from `createMultiSheetConverter` (`multi-sheet-converter.ts`) into an exported `resolveWorksheet(workbook, { worksheetName, worksheetIndex })`. Export each lib's sheet list (`LONDON_ADMIN_SHEETS`, `COURT_OF_APPEAL_CIVIL_SHEETS`) from its converter config, and use it in both the converter and the reformat config. The Excel always reformats the same sheet that fed the PDF.
  - **Value formatting:** split the existing renderers into row-level helpers and reuse them:
    - `normaliseHearing(row)` in `libs/list-types/common/src/rendering/hearing-normalisation.ts`. `normaliseHearings` becomes `hearings.map(normaliseHearing)`.
    - `formatFutureJudgment(row, locale)` in `court-of-appeal-civil-daily-cause-list/src/rendering/renderer.ts`. `renderFutureJudgments` becomes a map over it.
  - **Localised headers:** the existing `tableHeaders` locale objects (`rcj-standard` `t.common.tableHeaders`, London Admin and CoA Civil `t.tableHeaders`). Their keys are exactly the converter `fieldName`s (`venue`, `judge`, `time`, `caseNumber`, `caseDetails`, `hearingType`, `additionalInformation`, `date`). No new locale strings are needed.
- **Map headers by field name, not by position.** Legacy writes localised headers by column position and throws `IndexOutOfBounds` when a sheet has more columns than headers. Here each header cell is mapped through `findFieldForHeader` and replaced with `headers[fieldName]`. Unknown or extra columns keep their uploaded header and values. A reordered column still gets the right heading.
- **Legacy defects not copied:**
  - An empty sheet (no rows, or an empty header row) is **skipped**. Legacy `return`s, which aborts the remaining sheets.
  - Extra columns beyond the known headers are left as uploaded instead of throwing.
  - A sheet with no mapping (any sheet the converter does not resolve) is left unchanged.
- **Pass the buffer through `processPublication`.** Add `uploadedExcel?: Buffer` to `ProcessPublicationParams` and `GenerateExcelParams`. Only the non-strategic summary page sets it, and only on the converter-success branch. API ingestion and manual (strategic) upload stay as they are.
- **The registry is the allow-list.** Only the 10 RCJ `listTypeName` keys get the uploaded-excel generator. Other non-strategic lists (SSCS, CST, AST, etc.) are unchanged.
- **Stale xlsx deletion is needed and kept.** `createArtefact` (`libs/publication/src/repository/queries.ts:38–66`) reuses the existing `artefactId` when `locationId`, `listTypeId`, `contentDate` and `language` match. An RCJ list uploaded as Excel and later republished as JSON through the API therefore keeps the same `artefactId`. Without a delete, the old upload-derived `${artefactId}.xlsx` would be attached to the new email and stay downloadable. The RCJ generator therefore calls `deleteBlob(${artefactId}.xlsx, CONTAINER.PUBLICATIONS)` in two cases (`deleteBlob` already tolerates 404):
  - no `uploadedExcel` was supplied (the JSON route)
  - reformatting or saving failed (so a failed re-upload does not link the previous file)
- **Court of Appeal (Civil Division) converter name fix:** rename the `registerConverterByName` key in `court-of-appeal-civil-daily-cause-list-config.ts:82` from `COURT_OF_APPEAL_CIVIL_DIVISION_DAILY_CAUSE_LIST` to `COURT_OF_APPEAL_CIVIL_DAILY_CAUSE_LIST`, and align `e2e-tests/utils/seed-list-types.ts:86`. Without it, CoA Civil uploads are never converted on real environments, so there is no PDF and no Excel.

## 2. Implementation Details

TEMPLATE SOURCE: n/a

No new pages, templates, locale strings, API endpoints or Prisma or migration changes. No change to `list-type-data.ts`, `PDF_GENERATOR_REGISTRY`, the notification code or API ingestion.

### Reformat algorithm (`reformatUploadedWorkbook`)
```
load buffer with ExcelJS
for each sheet config:
  ws = resolveWorksheet(workbook, config)
  if !ws or ws.actualRowCount === 0 or header row has no values: continue   // skip, not return
  fieldByCol = for each header cell: findFieldForHeader(config.fields, readCellValue(cell.value))
  for each row > 1 (ws.eachRow):
    raw       = { [field]: readCellValue(cell.value) } for mapped columns
    formatted = config.formatRow(raw)
    for each mapped column: cell.value = formatted[field] ?? ""   // as-is, see Clarifications 3
  for each mapped header cell: cell.value = config.headers[field]; cell.font = { ...cell.font, bold: true }
  // unmapped columns and cells, other sheets, sheet names, styling: untouched
return Buffer.from(await workbook.xlsx.writeBuffer())
```
Types at the bottom of the file: `ReformatSheetConfig { worksheetName?: string; worksheetIndex: number; fields: FieldConfig[]; headers: Record<string, string>; formatRow: (row: Record<string, string>) => Record<string, string> }`.

### Per-list config (mirrors the PDF tables)

| List(s) | Sheet (converter resolution) | `fields` | `headers` | `formatRow` |
|---|---|---|---|---|
| 8 rcj-standard | index 0 (same as `convertExcelToJson`) | `STANDARD_EXCEL_CONFIG.fields` (`RCJ_EXCEL_CONFIG`) | `t.common.tableHeaders` | `normaliseHearing` (time normalised, additional info defaulted) |
| London Admin | "Main hearings" / idx 0 | `STANDARD_CONFIG.fields` (`RCJ_EXCEL_CONFIG_SIMPLE_TIME`) | `t.tableHeaders` | `normaliseHearing` |
| London Admin | "Planning Court" / idx 1 | same | `t.tableHeaders` | `normaliseHearing` |
| CoA Civil | "Daily hearings" / idx 0 | `DAILY_HEARINGS_CONFIG.fields` | `t.tableHeaders` | `normaliseHearing` |
| CoA Civil | "Notice for future judgments" / idx 1 | `FUTURE_JUDGMENTS_CONFIG.fields` (includes Date) | `t.tableHeaders` (includes `date`) | `(r) => formatFutureJudgment(r, locale)` |

`t` is `cy` when `locale === "cy"` (derived from `uploadData.language === "WELSH"`), otherwise `en`.

### A. `libs/list-types/common/`
- **EDIT** `src/conversion/excel-to-json.ts`: export `findFieldForHeader(fields, header)` and `readCellValue(value)`, extracted from `getField`/`formatDateValue`. `convertExcelToJson` behaviour is unchanged.
- **EDIT** `src/conversion/multi-sheet-converter.ts`: export `resolveWorksheet(workbook, { worksheetName, worksheetIndex })` and use it in `createMultiSheetConverter`.
- **EDIT** `src/rendering/hearing-normalisation.ts`: add an exported `normaliseHearing`, and make `normaliseHearings` map over it.
- **NEW** `src/excel/uploaded-workbook-reformatter.ts`: `reformatUploadedWorkbook` as above.
- **EDIT** `src/index.ts`: export `reformatUploadedWorkbook`, `ReformatSheetConfig`, `findFieldForHeader`, `readCellValue`, `resolveWorksheet` and `normaliseHearing`.
- **NEW** `src/excel/uploaded-workbook-reformatter.test.ts`: build real ExcelJS workbooks in the test, run the reformatter, then reload the output and assert:
  - Header replacement with en and with cy headers, and header cells are bold.
  - Value formatting: `10.30` becomes `10:30`, and an empty Additional Information stays `""`.
  - Case-insensitive and whitespace-tolerant header matching (`" venue "`).
  - Multi-sheet: by name, by index fallback, and an unknown extra sheet left byte-for-byte equivalent (same values and name).
  - An empty sheet is skipped and the next sheet is still processed.
  - Extra unknown columns: the header and values are kept as uploaded, with no throw.
  - Reordered columns get the correct localised headers.
  - Untouched cell styling and sheet names are kept.
  - Rewritten values with a leading `=`, `+`, `-` or `@` are written as-is as text (not formulas, no apostrophe).
  - Invalid buffer: rejects.
- **EDIT** the existing tests for `excel-to-json`, `multi-sheet-converter` and `hearing-normalisation` to cover the extracted helpers. Existing assertions must still pass.

### B. `libs/list-types/rcj-standard-daily-cause-list/`
- **NEW** `src/excel/excel-reformatter.ts`: `reformatRcjStandardDailyCauseListExcel(buffer, locale)`. It calls `reformatUploadedWorkbook(buffer, [{ worksheetIndex: 0, fields: STANDARD_EXCEL_CONFIG.fields, headers: t.common.tableHeaders, formatRow: normaliseHearing }])`.
- **EDIT** `src/index.ts`: export it.
- **NEW** `src/excel/excel-reformatter.test.ts`: real workbook in, en and cy headers out, formatted time. Mock nothing in `@hmcts/list-types-common` (real reformatter).

### C. `libs/list-types/london-administrative-court-daily-cause-list/`
- **EDIT** `src/conversion/london-administrative-court-daily-cause-list-config.ts`: export `LONDON_ADMIN_SHEETS` (the existing array) and pass it to `createMultiSheetConverter`.
- **NEW** `src/excel/excel-reformatter.ts`: `reformatLondonAdministrativeCourtDailyCauseListExcel(buffer, locale)`. It maps `LONDON_ADMIN_SHEETS` to `ReformatSheetConfig` (`fields: s.config.fields`, `headers: t.tableHeaders`, `formatRow: normaliseHearing`).
- **EDIT** `src/index.ts`: export it. **NEW** test: both sheets are reformatted, and a workbook with only "Main hearings" works.

### D. `libs/list-types/court-of-appeal-civil-daily-cause-list/`
- **EDIT** `src/conversion/court-of-appeal-civil-daily-cause-list-config.ts`:
  - Rename the registration key to `COURT_OF_APPEAL_CIVIL_DAILY_CAUSE_LIST`.
  - Export `COURT_OF_APPEAL_CIVIL_SHEETS` and use it in `convertCivilAppealExcel`.
- **EDIT** `src/conversion/court-of-appeal-civil-daily-cause-list-config.test.ts`: assert that `hasConverterForListTypeName("COURT_OF_APPEAL_CIVIL_DAILY_CAUSE_LIST")` is true.
- **EDIT** `src/rendering/renderer.ts`: extract and export `formatFutureJudgment(judgment, locale)`, and make `renderFutureJudgments` map over it. The renderer tests are unchanged.
- **NEW** `src/excel/excel-reformatter.ts`: `reformatCourtOfAppealCivilDailyCauseListExcel(buffer, locale)`.
  - Daily sheet: `normaliseHearing`.
  - Future judgments sheet: `formatFutureJudgment(r, locale)`.
- **EDIT** `src/index.ts`: export it. **NEW** test:
  - The Date column is present and formatted on sheet 2 only, in en and cy.
  - The daily sheet has no Date heading.

### E. `libs/publication/src/processing/service.ts`
- Imports: add the three `reformat*Excel` functions to the existing lib imports (lines 9, 26, 42). Add `saveExcelToStorage` from `@hmcts/list-types-common`, and `deleteBlob` and `CONTAINER` from `@hmcts/azure-blob` (both are existing deps; no cycle).
- `GenerateExcelParams` and `ProcessPublicationParams`: add `uploadedExcel?: Buffer`. Pass it from `processPublication` into `generatePublicationExcel`.
- Add a factory next to the other generator consts:
  ```ts
  function createUploadedExcelGenerator(reformat: (buffer: Buffer, locale: string) => Promise<Buffer>): ExcelGenerator {
    return async ({ artefactId, locale, uploadedExcel }) => {
      if (!uploadedExcel) {
        await deleteBlob(`${artefactId}.xlsx`, CONTAINER.PUBLICATIONS);
        return { success: false };
      }
      try {
        const { excelPath } = await saveExcelToStorage(artefactId, await reformat(uploadedExcel, locale));
        return { success: true, excelPath };
      } catch (error) {
        await deleteBlob(`${artefactId}.xlsx`, CONTAINER.PUBLICATIONS);
        return { success: false, error: error instanceof Error ? error.message : String(error) };
      }
    };
  }
  ```
- In `EXCEL_GENERATOR_REGISTRY`:
  - Map the 8 rcj-standard names to one `rcjStandardUploadedExcelGenerator = createUploadedExcelGenerator(reformatRcjStandardDailyCauseListExcel)`.
  - Map `LONDON_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST` and `COURT_OF_APPEAL_CIVIL_DAILY_CAUSE_LIST` to their own generators.
- An error thrown by `deleteBlob` propagates to the existing catch in `generatePublicationExcel` (~429). It is logged there, and the PDF and notifications continue.

### F. `libs/publication/src/processing/service.test.ts`
- Mock the three `reformat*Excel` functions, `saveExcelToStorage` (`vi.mock("@hmcts/list-types-common")`) and `deleteBlob`. Fixtures use `listTypeId: 999`.
- Tests:
  - `it.each` over the 10 names with `uploadedExcel`: the reformatter is called with `(buffer, locale)`, the result is saved, and the outcome is `{ hasExcel: true }`.
  - The same names **without** `uploadedExcel`: `deleteBlob("<id>.xlsx", PUBLICATIONS)` is called and the result is `{}`.
  - The reformatter throws: `deleteBlob` is called, a warning is logged, and the result is `{}`. The PDF and notifications still run in `processPublication`.
  - `processPublication` passes `uploadedExcel` through and sets `excelPath`.
  - A non-RCJ non-strategic name (for example `SSCS_LONDON_DAILY_HEARING_LIST`) with `uploadedExcel` stores no Excel.

### G. `apps/web/src/pages/(admin)/non-strategic-upload-summary/index.ts` (composition only)
- In the `hasConverterForListTypeName` success branch, set `uploadedExcel = uploadData.file`, and pass `uploadedExcel` into the existing `processPublication({...})` call. It stays `undefined` in the JSON branch.
- Replace the comment "original Excel is not stored" with an accurate one.
- `index.test.ts`: assert that `processPublication` receives `uploadedExcel: uploadData.file` for an Excel upload, and `undefined` for a JSON upload.

### H. `e2e-tests/utils/seed-list-types.ts`
- Rename the CoA Civil entry to `COURT_OF_APPEAL_CIVIL_DAILY_CAUSE_LIST`.

### I. E2E: one `@nightly` journey
**Constraint:** every admin UI spec, including `e2e-tests/tests/admin/non-strategic-upload.spec.ts` and the CST upload block in `summary-of-publications.spec.ts`, is `describe.skip`. They were disabled in `087ded39c` ("disable all SSO tests until redirect URL is not configured"). There is no non-UI route for non-strategic uploads, so the upload route **cannot run in CI today**.

Plan:
1. Add the test "RCJ Excel upload sends reformatted Excel and PDF links in email @nightly" **inside** the existing `Non-Strategic Upload` describe in `e2e-tests/tests/admin/non-strategic-upload.spec.ts`, so it runs when SSO tests are re-enabled. The test:
   - Builds an in-memory KB Division workbook with ExcelJS, with time `10.30` and an extra "Notes" column.
   - Uploads it as a system admin for a location that has a subscriber, then confirms.
   - Runs an Axe check on the summary and success pages, plus a Welsh check on the success page.
   - Polls for `.pdf` and `.xlsx`, then downloads `/api/flat-file/:artefactId/download?format=excel`.
   - Asserts the localised headers (`Venue … Additional Information`), the formatted time `10:30`, the "Notes" column kept as uploaded, and two document links in the Notify email.
2. Coverage while SSO is disabled, through the closest viable routes:
   - Unit tests A to G, which use real ExcelJS round-trips in the reformatter tests.
   - The `processPublication` pass-through test, which shares one code path with the upload page.
   - The manual check on a lower environment in `tasks.md`.

## 3. Error Handling & Edge Cases

| Case | Behaviour |
|---|---|
| RCJ list published via API JSON | No `uploadedExcel`, so any old `${artefactId}.xlsx` is deleted and no Excel is produced. The email uses the PDF-only template (legacy behaviour). |
| Excel upload, then JSON republish (same `artefactId` via `createArtefact`) | The old xlsx is deleted, so the stale file is never linked or downloadable. |
| Re-upload of the same list | Reformatted and overwritten (`uploadBlob`), so the email links the latest upload. |
| Reformat or save fails | `deleteBlob` runs, the error is logged with `artefactId` only, and `excelPath` is unset. The PDF and email still go out (PDF-only). |
| `deleteBlob` itself fails | Propagates to `generatePublicationExcel`'s catch, is logged, and the PDF and notifications continue. |
| Empty sheet, or a header row with no values | Skipped. Other sheets are still processed (fixes legacy's early `return`). |
| More columns than known headers, or unknown headers | Left as uploaded. Headers are mapped by field name, so there is no positional overflow (fixes legacy's `IndexOutOfBounds`). |
| Sheet not resolved by the config (extra sheets, or a second sheet missing) | Left unchanged, or simply absent. No error. |
| Reordered columns | Each column gets its correct localised header (legacy's positional write would mislabel them). |
| Excel date or time typed cells | Read through the same `readCellValue` as conversion (Date becomes `dd/MM/yyyy`), so the Excel equals what the PDF was built from. Rewritten cells become text cells. |
| Formula or CSV injection | Rewritten cells are written as plain string values (never formulas), unescaped as in legacy. Cells that are not touched (unknown columns, unmapped sheets) are kept as uploaded, including any formulas. Uploads come only from authenticated internal admins, and only `.xlsx` is accepted, so there are no macros. See Clarifications 3. |
| Notify 2MB limit | Uploads are capped at 2MB by `libs/admin-pages/src/manual-upload/validation.ts:30`. A reformatted file of about 2MB or more falls back to `GOVUK_NOTIFY_TEMPLATE_ID_NO_LINKS` (existing logic). |
| Upload expired from Redis before confirm | Existing 404. Nothing is published. |
| Welsh | Headers come from `cy.ts` when `language === "WELSH"`. No new strings. The Notify link text (`"Download Excel version"`) is hard-coded English in `govnotify-client.ts:89` for all list types and is out of scope. |
| Access control | Unchanged. The download endpoint enforces sensitivity, display window and UUID format. Notify links are kept for 1 week, the same as the PDF. |

## 4. Acceptance Criteria Mapping

| AC | How satisfied | Verification |
|---|---|---|
| Excel and PDF downloadable for all RCJ lists above | The PDF is already registered for all 10. Excel: 10 `EXCEL_GENERATOR_REGISTRY` entries keyed by `listTypeName`, fed by the uploaded workbook. The CoA Civil upload is fixed by the converter rename. Civil/Family are out of scope (they already have Excel). API JSON stays PDF-only, matching legacy. | `service.test.ts` `it.each` over 10 names. The E2E journey (when SSO is enabled). Manual upload of one list per lib. |
| The uploaded excel file is re-used | It is literally the uploaded workbook, loaded and modified in place. Sheet names, column order, unknown columns and styling are kept. | Reformatter tests (untouched cells, sheets and styling kept). E2E checks that the extra "Notes" column is kept. |
| All PDF data fields are in the Excel | The fields come from the same converter `FieldConfig` that built the PDF JSON, with values formatted by the same row helpers as the PDF renderer (`normaliseHearing`, `formatFutureJudgment`), and headers taken from the same `tableHeaders` locale keys as each `pdf-template.njk`. PDF header and important-info text are excluded (confirmed). | Per-lib reformatter tests (en/cy headers, formatted time, CoA Date). E2E header and value assertions. |
| Links to both file types in the email | The xlsx blob exists, so `GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION_PDF_EXCEL` is used with `pdf_link_to_file` and `excel_link_to_file`. No notification change. | Existing `template-config` tests. E2E checks two Notify document links. |

## 5. CLARIFICATIONS NEEDED

**Resolved (default applied)** — implementation started without answers, so these defaults were applied:
1. Multi-sheet lookup reuses cath's upload converter sheet names with position fallback ("Main hearings"/"Planning Court", "Daily hearings"/"Notice for future judgments"), not legacy's names.
2. The E2E journey is added to the existing (skipped) `non-strategic-upload.spec.ts`. Unit tests are the primary verification and a manual lower-environment check is listed in `tasks.md`. SSO is not re-enabled in this ticket.
3. Rewritten cells are written as-is (legacy behaviour), as plain text values. No leading-apostrophe escaping via `sanitiseCellValue`.

Original questions:

1. **Sheet names for the multi-sheet lists.** Legacy looks up "London administrative court"/"Planning court" and "Hearing list"/"Future judgments" by exact name. Cath's upload converters use "Main hearings"/"Planning Court" and "Daily hearings"/"Notice for future judgments", falling back to sheet position. This plan reuses cath's converter resolution, so the Excel reformats exactly the sheets that produced the PDF. A strict legacy-name lookup would leave cath-format uploads unformatted. Please confirm.
2. **E2E coverage while SSO tests are disabled.** The upload-route journey can be written now but stays skipped with the rest of the admin specs (`087ded39c`). Is unit tests plus a manual lower-environment check acceptable until the SSO redirect is configured? Or should this ticket also unblock SSO for the nightly run?
3. **Sanitising rewritten cells.** Existing generators prefix values that start with `=`, `+`, `-` or `@` with `'`. In a text cell that apostrophe is visible, for example "- remote" becomes "'- remote". Legacy did not do this. Should the reformatter sanitise rewritten cells (consistent with cath's generators), or write the formatted value as-is (consistent with legacy)? Either way, the cell is written as a text value, not a formula.
