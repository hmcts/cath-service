# Tasks: #935 Excel download for the Upper Tribunal hearing lists

## Implementation Tasks

### Shared helper
- [x] Add `libs/list-types/common/src/excel/flat-list-excel-generator.ts` with `generateFlatListExcel<T>({ artefactId, worksheetName, columns, rows })`. It should: create the workbook, truncate the sheet name to 31 chars, make the header row bold, run each cell through `sanitiseCellValue(value ?? "")`, call `autoFitColumns` and then `saveExcelToStorage`, and catch errors into `{ success: false, error }`
- [x] Export `generateFlatListExcel` from `libs/list-types/common/src/index.ts`
- [x] Add `flat-list-excel-generator.test.ts` (mock `@hmcts/azure-blob` `uploadBlob`, read the buffer back with ExcelJS). Cover: bold header row, row values, formula-injection prefix, undefined value becomes `""`, header-only sheet for empty rows, long sheet name truncated, `uploadBlob` called with `<artefactId>.xlsx` and `CONTAINER.PUBLICATIONS`, and upload failure returns `success: false`

### Per-list Excel generators (headers from existing `t.tableHeaders`, rows from the existing renderer, column order matching the converter/PDF)
- [x] `libs/list-types/upper-tribunal-tax-and-chancery-chamber-daily-hearing-list/src/excel/excel-generator.ts`: `generateUtccDailyHearingListExcel`, plus test
- [x] `libs/list-types/upper-tribunal-lands-chamber-daily-hearing-list/src/excel/excel-generator.ts`: `generateUtlcDailyHearingListExcel` (include `modeOfHearing`), plus test
- [x] `libs/list-types/upper-tribunal-administrative-appeals-chamber-daily-hearing-list/src/excel/excel-generator.ts`: `generateUtaacDailyHearingListExcel`, plus test
- [x] `libs/list-types/utiac-statutory-appeal-daily-hearing-list/src/excel/excel-generator.ts`: `generateUtiacStatutoryAppealDailyHearingListExcel`, plus test
- [x] `libs/list-types/utiac-jr-daily-hearing-list/src/excel/excel-generator.ts`: `generateUtiacJrDailyHearingListExcel` (regional column set), plus test
- [x] `libs/list-types/utiac-jr-daily-hearing-list/src/excel/excel-generator-london.ts`: `generateUtiacJrLondonDailyHearingListExcel` (`londonTableHeaders` / `londonTableHeadersCy`), plus test
- [x] Each test: English headers equal `en.tableHeaders` values in PDF order; Welsh headers equal `cy.tableHeaders` when `locale: "cy"`; one row per hearing with the correct cell values; `jsonData` fixtures with `listTypeId`-independent data
- [x] Export each new function from its lib's `src/index.ts`

### Registration
- [x] In `libs/publication/src/processing/service.ts`, import the new generators and add `EXCEL_GENERATOR_REGISTRY` entries keyed by name: `UT_TAX_AND_CHANCERY_CHAMBER_DAILY_HEARING_LIST`, `UT_LANDS_CHAMBER_DAILY_HEARING_LIST`, `UT_ADMINISTRATIVE_APPEALS_CHAMBER_DAILY_HEARING_LIST`, `UTIAC_STATUTORY_APPEAL_DAILY_HEARING_LIST`, `UTIAC_JR_LONDON_DAILY_HEARING_LIST`, `UTIAC_JR_LEEDS_DAILY_HEARING_LIST`, `UTIAC_JR_MANCHESTER_DAILY_HEARING_LIST`, `UTIAC_JR_BIRMINGHAM_DAILY_HEARING_LIST`, `UTIAC_JR_CARDIFF_DAILY_HEARING_LIST`
- [x] In `libs/publication/src/processing/service.test.ts`, add `generate*Excel: vi.fn()` to the 5 UT `vi.mock` factories
- [x] Add an `it.each` over the 9 UT names asserting `listTypeHasExcel(name) === true`
- [x] Add a `processPublication` test showing a UT list type sets `excelPath` to `<artefactId>.xlsx` and passes it to notifications
- [x] Add a `processPublication` test showing a UT Excel generator that rejects still returns `pdfPath` and still sends notifications

### Verification
- [x] `yarn test` passes for `@hmcts/list-types-common`, the 5 UT libs and `@hmcts/publication`
- [x] `yarn lint:fix` is clean and `tsc` builds with no errors
- [ ] Manual check (local/STG): do a non-strategic Excel upload for each UT list, then confirm `<artefactId>.xlsx` exists in the `publications` container and `/api/flat-file/<id>/download?format=excel` returns the workbook with correct columns
  - Partial (local only): `generatePublicationExcel` run for all 9 names against local Azurite; each `<artefactId>.xlsx` was written to `publications` with the correct sheet name, headers and sanitised cells. Not done: the non-strategic upload UI flow and the `/api/flat-file/.../download?format=excel` endpoint, and STG
- [ ] Manual check: a subscribed verified user receives an email with both the PDF and Excel download links for a UT list
  - Not done: needs GOV.UK Notify and a subscribed verified user on STG
- [ ] Resolve the CLARIFICATIONS NEEDED in `plan.md` (especially 1 and 2) before merging
  - Not done: needs a PO decision. Implemented with the plan's defaults
