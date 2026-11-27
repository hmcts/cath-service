# #1355: Add error location messages for non-strategic upload — Tasks

## Implementation Tasks

### Converter: collect located errors (`@hmcts/list-types-common`)
- [x] Create `libs/list-types/common/src/conversion/excel-validation-error.ts` with the `ExcelValidationIssue` interface (`sheetName?`, `rowNumber?`, `columnHeader?`, `reason`, `message`), `ExcelValidationError extends Error` (`issues`), `ExcelFileReadError` (original error as `cause`), and the `isExcelValidationError()` / `isExcelFileReadError()` type guards. `message` is the first issue's legacy text.
- [x] Update `convertExcelToJson()` in `libs/list-types/common/src/conversion/excel-to-json.ts` so each issue's `rowNumber` is the 1-based data-row index (`i + 1`, header not counted), as in PIP. Keep the legacy `message` wording (`i + 2`) unchanged.
- [x] Wrap the ExcelJS `load()` call so a corrupt or non-xlsx file throws `ExcelFileReadError`.
- [x] Update `convertExcelToJson()` so missing headers give one sheet-level issue (`Missing columns: ...`) and the rows of that tab are not validated.
- [x] Update `parseRow`/`getField` to collect an issue for every failing field without stopping at the first. A missing required value gets reason `Missing required value`. A validator failure gets the validator message with ` in row N` removed. Blank-row handling stays as today.
- [x] Throw a single `ExcelValidationError` when any issues exist. Keep the `minRows` check and "no worksheet" as plain `Error`s.
- [x] Update `createMultiSheetConverter()` in `multi-sheet-converter.ts` to convert every resolved tab, tag each `ExcelValidationError` issue with `worksheet.name`, carry on to the next tab, then throw one combined `ExcelValidationError` ordered by tab, then row, then column. Rethrow other errors at once. Keep "no recognised worksheet tabs" as a plain `Error`.
- [x] In `createMultiSheetConverter()`, leave out the `dataKey` of a tab that cannot be found (no more `[]`). Add `partialData` to `ExcelValidationError`, keeping every row in its original position.
- [x] Add a structured `issues` array (`instancePath`, `keyword`, `params`, `message`) to `ValidationResult` in `libs/list-types/common/src/validation/json-validator.ts`. Leave `errors: string[]` unchanged.
- [x] Create `libs/list-types/common/src/conversion/non-strategic-excel-validation.ts` with `validateNonStrategicExcel(listTypeName, buffer)`. It converts, then runs the list type's schema validator (skipped when there is no schema), maps schema errors to issues using PIP's path rules (root `required` gives `Sheet is missing from the file`), maps JSON keys back to tab and column names through `SheetConfig`/`FieldConfig`, drops duplicate locations, and throws one `ExcelValidationError`. Export it from `index.ts`.
- [x] Update the comment above `BUSINESS_AND_PROPERTY_SHEETS` in the BPD config, which says a missing tab yields an empty section. Leave the converter options unchanged.
- [x] Find the test workbooks for multi-sheet lists (unit fixtures, `e2e-tests` upload files) that leave out tabs their schema requires, and give them the full set of tabs.
- [x] Export `ExcelValidationError`, `type ExcelValidationIssue`, `isExcelValidationError`, `ExcelFileReadError` and `isExcelFileReadError` from `libs/list-types/common/src/index.ts`.

### Formatting (`@hmcts/admin-pages`)
- [x] Create `libs/admin-pages/src/non-strategic-upload/excel-error-messages.ts` with `formatExcelValidationErrors(issues)`. It returns `ValidationError[]`, one per issue, with English location wording plus the reason, each linking to `href: "#file"`. It handles the multi-tab cell, single-tab cell, tab-level and row-level formats, lists every issue (no cap), and orders by tab, then numeric row, then column.
- [x] Export the formatter from `libs/admin-pages/src/index.ts`.
- [x] Add `nonStrategicUploadFileError?: string` to `SessionData` in `libs/admin-pages/src/manual-upload/model.ts` (type only, no manual-upload behaviour change).

### Non-strategic upload page (`apps/web`)
- [x] Add `fileErrorSummary`, `fileErrorSummarySingle` and `fileUnreadable` to `apps/web/src/pages/(admin)/non-strategic-upload/en.ts`, with matching `[WELSH TRANSLATION REQUIRED: '...']` placeholders in `cy.ts` for key parity (English only, as in PIP).
- [x] In POST in `index.ts`, call `validateNonStrategicExcel` instead of `convertExcelForListTypeName`. In its `catch`: when `isExcelValidationError(error)`, store the formatted errors in `nonStrategicUploadErrors` and the singular or plural inline text in `nonStrategicUploadFileError`. When `isExcelFileReadError(error)`, log the cause and store a single `fileUnreadable` error. Otherwise keep today's single-message behaviour. Log only the issue count, never cell values.
- [x] In GET, read and delete `nonStrategicUploadFileError` and pass it to the template as `fileError`.
- [x] Update `index.njk` so the inline file error uses `fileError` when set, otherwise `getError(errors, "#file")`.

### Unit and integration tests (AAA, co-located)
- [x] `excel-validation-error.test.ts`: both type guards return true and false correctly; `message`, `issues` and `cause` are kept.
- [x] `excel-to-json.test.ts` (scenarios 1 and 2): all row and field errors are collected; data-row numbering (first data row = 1); a corrupt buffer throws `ExcelFileReadError`; a tab-level issue for missing headers with no row issues; extra headers ignored; `.message` matches the legacy first-error text; existing tests still pass.
- [x] `multi-sheet-converter.test.ts` (scenario 3): errors from two tabs are combined in tab order and tagged with the tab name; the actual tab name is used under positional fallback; a valid workbook still converts; "no recognised tabs" and non-validation errors are rethrown unchanged; a missing tab's key is left out of the result; `partialData` keeps row positions.
- [x] `non-strategic-excel-validation.test.ts` (scenario 4a): real BPD schema, no mocks. Missing tabs are reported through `required`; converter and schema issues are combined without duplicates; a schema-only error gets a PIP-style location; a list type with no schema reports only converter issues; a valid workbook returns its data.
- [x] `json-validator.test.ts`: the structured `issues` are returned and `errors` is unchanged.
- [x] `business-and-property-division-rolls-building-daily-cause-list-config.test.ts` (scenario 4): a workbook with errors in "Appeal List" and "Insolvency & Companies Court" reports both tabs by name; a workbook missing two tabs reports both, together with cell errors; a workbook with every tab present but some holding only the header row converts.
- [x] `excel-error-messages.test.ts` (scenario 5): each location format, every issue listed (no cap), numeric row order (Row 2 before Row 10).
- [x] `non-strategic-upload/index.test.ts` (scenario 6): an `ExcelValidationError` sets the formatted session errors and the singular or plural file error and redirects; an `ExcelFileReadError` sets `fileUnreadable` without exposing the raw message; a plain `Error` keeps the single message; GET passes `fileError` and clears it.
- [x] `non-strategic-upload/index.njk.test.ts` (scenario 7): the error summary lists each located item; the inline file error shows `fileError`; en/cy key parity includes the new keys.
- [ ] Run the existing list-type converter tests and the `manual-upload` unit and template tests, and confirm they pass unchanged (AC2).

### E2E
- [x] Add a located-errors step to the existing journey test in `e2e-tests/tests/admin/non-strategic-upload.spec.ts` (scenario 8; no new test). It uploads a BPD Rolls Building workbook with errors in two tabs (a missing required value, and a bad time), checks the `Sheet '...' - Row N of '...' column: ...` summary items and the inline message, runs the axe check on the error state, then uploads a valid file and continues the journey.
- [ ] Confirm the existing manual-upload E2E journey passes unchanged (AC2 regression check).

### Wrap-up
- [ ] Run `yarn lint:fix` and `yarn test` from the repo root.
- [x] Check the diff contains no changes under `apps/web/src/pages/(admin)/manual-upload*/` or `libs/admin-pages/src/manual-upload/validation.ts`.
- [ ] Revisit whether the reason text stays in the error items (open item in `plan.md`).
