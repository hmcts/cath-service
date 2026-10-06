# Implementation Tasks: #942

## Implementation Tasks

### 0. Agree before coding
- [ ] Agree with the #1122 owner that the reformatter hardening is done once, in #942 commit 1. Decide whether to cherry-pick commit 1 into #1122 (preferred), or merge #942 straight after #1122 with no release in between
- [ ] Record the answer to CLARIFICATION 1 (drop unknown columns and sheets) on the issue. The default applies if there is no answer
- [x] User decisions recorded in plan.md: A (JSON-generated Excel fallback for SSCS is required) and B (Liverpool out of scope pending investigation; 7 SSCS list types)

### Commit 1: harden the shared reformatter and cell reading (applies to all lists)
- [x] `libs/list-types/common/src/conversion/excel-to-json.ts`:
  - [x] `readCellValue` handles `richText`, `{ text, hyperlink }` (including rich-text `text`), `{ formula | sharedFormula, result }`, `{ error }` and other objects (gives `""`)
  - [x] Read header row cells with `headers[colNumber - 1] = readCellValue(cell.value)`
- [x] `excel-to-json.test.ts`, one AAA test each for:
  - [x] rich text
  - [x] hyperlink (plain and rich)
  - [x] formula result
  - [x] shared formula
  - [x] error value giving `""`
  - [x] a required field with an error value fails the upload
  - [x] a rich-text header is recognised
  - [x] a blank header column does not shift later fields
- [x] `libs/list-types/common/src/excel/uploaded-workbook-reformatter.ts`, rewrite as an allow-list copy into a new `Workbook`:
  - [x] Copy only resolved and recognised sheets, keeping the name and the config order. Create them visible
  - [x] Copy only mapped columns, packed in uploaded order, with widths and row heights
  - [x] Clone cell styles. Make header cells bold with localised headings
  - [x] Write every value through `sanitiseCellValue`
  - [x] Freeze the header row
  - [x] Never copy `hidden`, `note`, formulas, merges, validations, conditional formats, images, `headerFooter`, defined names or workbook properties
  - [x] Throw when no sheet was output
  - [x] Make `ReformatSheetConfig` extend `WorksheetLocator`
- [x] `uploaded-workbook-reformatter.test.ts`, new tests:
  - [x] a hidden extra sheet is dropped
  - [x] a hidden first data sheet is output and visible
  - [x] hidden rows and columns are unhidden, and hidden rows are still present
  - [x] notes are cleared
  - [x] `creator`, `lastModifiedBy`, `company`, `manager`, `title`, `subject`, `keywords` and `description` from the upload are absent
  - [x] unknown columns and unmapped sheets are dropped
  - [x] no formula or `sharedFormula` cells remain, and `=HYPERLINK` in an unmapped column is gone
  - [x] a mapped formula shows its cached result
  - [x] a mapped rich-text cell is readable
  - [x] `headerFooter` and defined names are absent
  - [x] the header row is frozen
  - [x] the output throws when no sheet is recognised
- [x] Update the existing #940 tests to the new behaviour:
  - [x] `uploaded-workbook-reformatter.test.ts:112`, `:151`, `:166`, `:179`, `:208`, `:231`
  - [x] `libs/list-types/rcj-standard-daily-cause-list/src/excel/excel-reformatter.test.ts:30`
  - [x] the London Admin and CoA Civil reformatter tests, wherever they assert unmapped content
- [x] `libs/publication/src/processing/service.ts`:
  - [x] Move `createUploadedExcelGenerator` (`:735-753`) above `EXCEL_GENERATOR_REGISTRY`
  - [x] In `processPublication`, when there is no `jsonData` and `isUpdate` is true, delete `${artefactId}.xlsx` from `CONTAINER.PUBLICATIONS`. Log a failure and do not throw
- [x] `service.test.ts`: the flat-file republish deletes the stale xlsx, and a failed delete is logged without throwing

### Commit 2: SSCS
- [x] Add `"exceljs": "4.4.0"` to `devDependencies` in `libs/list-types/sscs-daily-hearing-list/package.json`, then run `yarn install`
- [x] Create `libs/list-types/sscs-daily-hearing-list/src/excel/excel-reformatter.ts` with `reformatSscsDailyHearingListExcel(buffer, locale)`. It uses `worksheetIndex: 0`, `SSCS_EXCEL_CONFIG.fields`, `t.tableHeaders` and an identity `formatRow`
- [x] Export it from `libs/list-types/sscs-daily-hearing-list/src/index.ts`
- [x] Create `excel-reformatter.test.ts`, with real ExcelJS round trips and no mocks:
  - [x] English and Welsh headings, in bold
  - [x] the uploaded sheet name is kept
  - [x] values equal `convertExcelForListTypeName("SSCS_LONDON_DAILY_HEARING_LIST", upload)` for the same upload, with an equal row count
  - [x] an empty Additional Information gives `""`
  - [x] an extra "Internal notes" column is dropped
  - [x] reordered columns get the right headings
- [x] `libs/publication/src/processing/service.ts`:
  - [x] Import `reformatSscsDailyHearingListExcel`
  - [x] Add `sscsUploadedExcelGenerator`
  - [x] Register the 7 SSCS `listTypeName` keys
- [x] `service.test.ts`:
  - [x] Add `reformatSscsDailyHearingListExcel: vi.fn()` to the `@hmcts/sscs-daily-hearing-list` mock (`:14-19`)
  - [x] For every `listTypeData` entry with `urlPath === "sscs-daily-hearing-list"`, `listTypeHasExcel` is true
  - [x] With `uploadedExcel`, the SSCS generator saves the reformatted buffer and `processPublication` passes `excelPath`
  - [x] Without it, the stale xlsx is deleted and the email is PDF-only
  - [x] A reformat failure deletes the stale xlsx, and the PDF and notifications still go out
  - [x] Use `listTypeId: 999` in fixtures
- [x] SSCS JSON fallback (decision A):
  - [x] Add `excelWorksheetName` to `src/locales/en.ts` ("SSCS Daily Hearing List") and `cy.ts` ("Rhestr Gwrandawiadau Dyddiol")
  - [x] Move `exceljs` from `devDependencies` to `dependencies` (now used at runtime), then run `yarn install`
  - [x] Create `src/excel/excel-generator.ts` with `generateSscsDailyHearingListExcel({ artefactId, locale, jsonData })`: one sheet, bold frozen header from `t.tableHeaders` in PDF order, one row per hearing through `sanitiseCellValue`, `autoFitColumns`, `saveExcelToStorage`, errors returned as `success: false`
  - [x] Export it from `src/index.ts`
  - [x] `excel-generator.test.ts` (real ExcelJS, `@hmcts/azure-blob` mocked): en and cy headings and sheet names, bold frozen header, values in PDF order, values equal to `convertExcelToJson` output for the same upload, header-only sheet for an empty list, `= + - @` neutralised, save failures returned, both sheet names are 31 characters or fewer with none of `* ? : \ / [ ]`
  - [x] `service.ts`: give `createUploadedExcelGenerator` an optional JSON fallback, delete the stale xlsx on any non-success result, and register `sscsExcelGenerator` (reformatter + JSON fallback) for the 7 SSCS names. RCJ, London Admin and CoA Civil pass no fallback
  - [x] `service.test.ts`: SSCS with upload uses the reformatter and not the JSON generator; SSCS without upload calls the JSON generator for every SSCS name, saves the Excel and passes `excelPath` to notifications; a failed or rejected JSON generation deletes the stale xlsx, does not throw and notifies PDF-only; an RCJ list without upload is unchanged (stale xlsx deleted, JSON generator not called, PDF-only)
- [x] `e2e-tests/tests/admin/non-strategic-upload.spec.ts`: add an SSCS upload to the existing `@nightly` Excel journey. Cover the English and Welsh headings in the downloaded xlsx, the dropped unknown column, and the 2 Notify links. Note that the suite is `describe.skip` until the SSO specs are re-enabled

### Verify, merge and push
- [x] Run `yarn lint:fix`, a typecheck and `yarn test` from the root. Coverage must be above 80% in `libs/list-types/common`, `sscs-daily-hearing-list` and `publication`
- [x] Merge `origin/master` into `feature/940-rcj-excel-download`, resolve the #966 conflicts and push (`9af34cda`)
- [x] Merge `feature/940-rcj-excel-download` into `feature/942-sscs-excel-download` and resolve the `readCellValue` conflict (`2c5db823`)
- [x] Run `yarn install` and `yarn db:generate`, then re-run lint, typecheck and tests
- [x] Push with `git push --force-with-lease`, replacing the old docs-only commit `0c511850` (one-off; later pushes are plain)
- [ ] After #1122 merges: merge `origin/master` into #942, re-run lint, typecheck and tests, then merge #942. Or merge only #942 and close #1122 (see plan "Exposure window")
- [ ] Lower environment check:
  - [ ] Upload one English and one Welsh SSCS Excel with a hidden sheet, a hidden column, a note, a formula and an extra column
  - [ ] Confirm the xlsx in `/blob-explorer` and the email links contain none of these, and that the xlsx matches the PDF row by row
  - [ ] Republish the same SSCS list as JSON and confirm the xlsx is replaced by one generated from the JSON (en and cy headings, sheet name)
  - [ ] Republish an RCJ list as JSON and confirm its xlsx is removed
