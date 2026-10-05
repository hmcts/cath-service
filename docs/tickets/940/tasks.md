# Tasks: #940 — Excel download for RCJ hearing lists (legacy PUB-3302 behaviour)

## Implementation Tasks

- [x] Confirm the CLARIFICATIONS NEEDED in `plan.md` (sheet resolution, E2E while SSO is disabled, sanitising rewritten cells)
- [x] Fix the CoA Civil converter key to `COURT_OF_APPEAL_CIVIL_DAILY_CAUSE_LIST` in `libs/list-types/court-of-appeal-civil-daily-cause-list/src/conversion/court-of-appeal-civil-daily-cause-list-config.ts`, add a `hasConverterForListTypeName` test, and rename the entry in `e2e-tests/utils/seed-list-types.ts`
- [x] Extract and export `findFieldForHeader` and `readCellValue` from `libs/list-types/common/src/conversion/excel-to-json.ts`, used by `getField` (behaviour unchanged, tests updated)
- [x] Extract and export `resolveWorksheet` from `libs/list-types/common/src/conversion/multi-sheet-converter.ts`, used by `createMultiSheetConverter` (tests updated)
- [x] Add an exported `normaliseHearing` in `libs/list-types/common/src/rendering/hearing-normalisation.ts`, and make `normaliseHearings` map over it (tests updated)
- [x] Create `libs/list-types/common/src/excel/uploaded-workbook-reformatter.ts` (`reformatUploadedWorkbook`: field-based header mapping, localised bold headers, formatted values, skip empty sheets, keep unknown columns and sheets) and export it with `ReformatSheetConfig` and the helpers from `src/index.ts`
- [x] Create `uploaded-workbook-reformatter.test.ts` with real ExcelJS round-trips (en/cy headers, value formatting, header matching, multi-sheet by name and index, unknown sheet kept, empty sheet skipped, extra columns kept, reordered columns, styling and sheet names kept, as-is writes of leading =+-@, invalid buffer)
- [x] rcj-standard: create `src/excel/excel-reformatter.ts` (`reformatRcjStandardDailyCauseListExcel`, first sheet, `RCJ_EXCEL_CONFIG.fields`, `t.common.tableHeaders`, `normaliseHearing`), export it, and add a test
- [x] London Admin: export `LONDON_ADMIN_SHEETS` from the converter config, create `src/excel/excel-reformatter.ts` (`reformatLondonAdministrativeCourtDailyCauseListExcel`, both sheets), export it, and add a test
- [x] CoA Civil: export `COURT_OF_APPEAL_CIVIL_SHEETS`, extract `formatFutureJudgment` in `src/rendering/renderer.ts`, create `src/excel/excel-reformatter.ts` (`reformatCourtOfAppealCivilDailyCauseListExcel`, Date on future judgments only), export it, and add a test
- [x] `libs/publication/src/processing/service.ts`: add `uploadedExcel?: Buffer` to `GenerateExcelParams` and `ProcessPublicationParams` and pass it through, add `createUploadedExcelGenerator` (save the reformatted file; `deleteBlob` the stale xlsx when there is no buffer or on failure), and register the 10 RCJ names
- [x] Extend `libs/publication/src/processing/service.test.ts` (10 names with and without a buffer, delete on failure, `processPublication` pass-through, non-RCJ non-strategic list not given Excel; `listTypeId: 999`)
- [x] `apps/web/src/pages/(admin)/non-strategic-upload-summary/index.ts`: pass `uploadedExcel: uploadData.file` from the converter-success branch into `processPublication`, fix the outdated comment, and update `index.test.ts`
- [x] Add a `@nightly` journey "RCJ Excel upload sends reformatted Excel and PDF links in email" inside the `Non-Strategic Upload` describe in `e2e-tests/tests/admin/non-strategic-upload.spec.ts` (runs once SSO specs are re-enabled)
- [x] Run `yarn lint:fix`, typecheck and `yarn test` from the repo root
- [ ] (Pending: needs a deployed lower environment, not possible from this workspace) Manual check on a lower environment: upload one Excel per lib (rcj-standard, London Admin, CoA Civil) in English and Welsh, confirm the email has PDF and Excel links and the Excel has localised bold headers, formatted values and the uploaded layout; then republish one via API JSON and confirm the old xlsx is removed and the email is PDF-only
