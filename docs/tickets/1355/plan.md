# #1355: Add error location messages for non-strategic upload — Technical Plan

TEMPLATE SOURCE: n/a

This ticket changes how Excel validation errors are collected and displayed on the existing non-strategic upload page. It adds no new page and migrates no list-type view.

## 1. Technical Approach

### What happens today

- `POST /non-strategic-upload` (`apps/web/src/pages/(admin)/non-strategic-upload/index.ts`) calls `convertExcelForListTypeName()` from `@hmcts/list-types-common` to validate the workbook. If it throws, the controller puts `error.message` into a single `{ text, href: "#file" }` error and redirects back to the page (PRG through the session).
- The conversion stops at the first error. `convertExcelToJson()` (`libs/list-types/common/src/conversion/excel-to-json.ts`) throws on the first bad row (`Error in row 3: Missing required field 'Judge' in row 3`), and `createMultiSheetConverter()` (`multi-sheet-converter.ts`) stops at the first failing tab. The message never names the tab. For the BPD Rolls Building list (16 tabs that all share the same 7-column config), the admin is told the row but not which of the 16 tabs it is on, and is only told about one error per upload attempt.
- Corrupt or unreadable files show the raw ExcelJS error message.

### Reference implementation in PIP (PUB-3356)

The reference is [hmcts/pip-data-management#955](https://github.com/hmcts/pip-data-management/pull/955) and [hmcts/pip-frontend#1756](https://github.com/hmcts/pip-frontend/pull/1756). Both were open, not merged, on 2026-11-20. They supersede the PUB-3335 prototype PRs named in the ticket (#952 and #1746, both closed).

- **Backend (`ValidationErrorFormattingHelper.formatErrors`).** It collects every JSON-schema error for a non-strategic upload. `validateBody(..., formatErrors=true)` is only called from `nonStrategicUploadPublication`, so manual JSON upload is unchanged. Each error path becomes a location:
  - `/sheet/rowIndex/field` gives `Sheet 'Appeal List' - Row 2 of 'Time' column` (for example, a time that doesn't match the pattern).
  - `/sheet/rowIndex` gives `Sheet 'Business List' - Row 1`. A missing required field produces this form: JSON schema reports `required` on the row, so no column is named.
  - `/rowIndex/field` and `/rowIndex` give `Row 1 of 'Time' column` and `Row 3` for single-sheet lists.
  - An error with no location (such as a missing sheet) shows its detail text on its own.
  - The errors are sorted, joined with `" | "`, and sent back as `uiError: true`.
- "Row N" is `index + 1` in the converted data, so the header is not counted and the first data row is Row 1.
- The schema message is dropped (location only). There is no cap on the number of errors. Strings are built in English only. The sort is a plain string sort (`Collections.sort`), so "Row 10" sorts before "Row 2".
- Sheet and column labels come from the internal JSON keys, converted from camelCase to Title Case and put in single quotes (`formatInternalFieldNameForDisplay`). They are not the real tab and header names.
- **Frontend (`ManualUploadSummaryController`, `manual-upload-summary.njk`).** It splits the message on `" | "` and renders one `govukErrorSummary` item per location, each linking to `#`, on the summary page after the upload is submitted. Anything else, including a file that cannot be converted, falls back to the generic message.

### How it maps onto cath-service

cath-service has no separate data-management API. Validation runs in-process in the Excel converter, so the same idea is applied at the converter layer:

1. **Collect, don't fail fast.** `convertExcelToJson()` validates every data row and field. It records a structured issue for each failure (row, column, reason) and throws one `ExcelValidationError` that carries all of them.
2. **Tag the tab.** `createMultiSheetConverter()` converts every resolved tab, catches each tab's `ExcelValidationError`, adds the tab name the user sees (`worksheet.name`) to its issues, and carries on. When all tabs are done it throws one combined `ExcelValidationError`, ordered by the configured tab order, then row, then column.
3. **Keep it backwards compatible.** `ExcelValidationError.message` stays the text of the first issue in today's format (`Error in row N: ...`). Every caller and test that only reads `.message` keeps working. The structured `issues` array is the new contract.
4. **Format in the presentation layer.** A new helper in `@hmcts/admin-pages` turns issues into `ValidationError[]` for the GOV.UK error summary. As in PIP, the location wording is English only and every error is listed (no cap).
5. **Change the controller as little as possible.** The non-strategic upload controller checks `isExcelValidationError(error)`. If it is one, it stores the formatted list and a single inline file message in the session. If the workbook cannot be read at all (ExcelJS load failure), it shows a friendly "file could not be read" message and logs the raw error. Any other error keeps today's behaviour.

### Why the manual upload process is unaffected (AC2)

- Manual upload (`apps/web/src/pages/(admin)/manual-upload/`, `libs/admin-pages/src/manual-upload/validation.ts`) validates JSON with `validateListTypeJson()`. It never calls the Excel converters. None of its files change.
- The only shared file touched is the session type declaration in `libs/admin-pages/src/manual-upload/model.ts`, which already holds the `nonStrategicUpload*` keys. We add one optional non-strategic key there. No manual-upload behaviour changes.

### Scope note: other non-strategic list types

The change sits in the shared converter, so every Excel non-strategic list type gets located errors (confirmed in refinement). Single-tab lists show row and column; multi-tab lists (BPD Rolls Building, Court of Appeal Civil, Interim Applications, London Administrative Court) also show the tab. PIP (PUB-3356) also covers every non-strategic upload, so this matches it. No list-type config files need to change.

## 2. Implementation Details

### Files to create

| File | Purpose |
|---|---|
| `libs/list-types/common/src/conversion/excel-validation-error.ts` | `ExcelValidationIssue` interface, `ExcelValidationError extends Error` (`issues: ExcelValidationIssue[]`), and the `isExcelValidationError()` type guard |
| `libs/list-types/common/src/conversion/excel-validation-error.test.ts` | Unit tests |
| `libs/admin-pages/src/non-strategic-upload/excel-error-messages.ts` | `formatExcelValidationErrors(issues)` returns `ValidationError[]`, one per issue, with English location wording |
| `libs/admin-pages/src/non-strategic-upload/excel-error-messages.test.ts` | Unit tests |

```ts
// excel-validation-error.ts (shape only)
export interface ExcelValidationIssue {
  sheetName?: string;     // set by the multi-sheet converter; absent for single-sheet lists
  rowNumber?: number;     // 1-based data row (header not counted), as in PIP; absent for sheet-level issues
  columnHeader?: string;  // FieldConfig.header, e.g. "Time"; absent for sheet/row-level issues
  reason: string;         // e.g. "Missing required value", "Invalid time format '25pm'. Expected format: ..."
  message: string;        // original full message in today's format, used for Error.message back-compat
}
```

### Files to change

| File | Change |
|---|---|
| `libs/list-types/common/src/conversion/excel-to-json.ts` | (a) Set the issue's `rowNumber` to the row's 1-based position among the collected data rows (`i + 1`), matching PIP. The legacy `message` text keeps today's `i + 2` wording, so existing callers and tests are unaffected. (b) If headers are missing, record one sheet-level issue (`Missing columns: Time, Venue`) and skip row validation for that tab, because otherwise every row would report the same missing columns. (c) `parseRow` collects issues for every field and does not throw on the first. A missing required value gives reason `Missing required value`. A validator failure gives reason = the validator's message with the redundant ` in row N` removed (decision 5). (d) Blank rows are handled as today (decision 10): ExcelJS still skips truly empty rows, and a row whose cells only evaluate to empty is checked like any other row. (e) If there are any issues, throw `ExcelValidationError`. Its `message` is the first issue's legacy text. The `minRows` check and "no worksheet" stay plain `Error`s. (f) Wrap the ExcelJS `load()` call so a corrupt or non-xlsx file throws a dedicated `ExcelFileReadError`, keeping the original error as `cause`. |
| `libs/list-types/common/src/conversion/multi-sheet-converter.ts` | In `createMultiSheetConverter`, wrap each `convertSheetToJson` call. On `ExcelValidationError`, set `sheetName = worksheet.name` on its issues, collect them and continue. After the loop, throw one combined `ExcelValidationError` if any tab failed. Any other error is rethrown at once. "No recognised worksheet tabs" stays a plain `Error`. **Missing tabs, as in PIP:** a configured sheet that `resolveWorksheet` cannot find no longer gets `[]`. Its `dataKey` is left out of the result, so the list type's schema decides whether that matters (step below). `ExcelValidationError` carries `partialData`, the converted object with every row in its original position (rows with errors are included with whatever fields parsed), so the schema check can still run when there are cell errors. |
| `libs/list-types/common/src/validation/json-validator.ts` | Add a structured `issues` array to `ValidationResult`: AJV's `instancePath`, `keyword`, `params` and `message` for each error. `errors: string[]` is unchanged, so manual upload and every existing caller behave exactly as before |
| `libs/list-types/common/src/conversion/non-strategic-excel-validation.ts` (new) | `validateNonStrategicExcel(listTypeName, buffer)` follows PIP's convert-then-validate order. (1) Run `convertExcelForListTypeName`. On `ExcelValidationError`, keep its issues and use `partialData`. (2) Run the list type's `validate*` schema validator (the same package lookup `validateListTypeJson` uses). If the list type has no schema, skip this step. (3) Turn each schema error into an `ExcelValidationIssue` using PIP's path rules: `/sheet/i/field` gives tab, row and column; `/sheet/i` gives tab and row; `/i/field` and `/i` work the same for single-sheet lists; a root `required` error gives a tab-level `Sheet is missing from the file` issue for the named key. JSON keys are mapped back to the tab name and column header through `SheetConfig`/`FieldConfig`, falling back to PIP's Title Case. (4) Drop schema issues for a location the converter already reported. (5) If there are any issues, throw one `ExcelValidationError`. Otherwise return the data |
| `libs/list-types/business-and-property-division-rolls-building-daily-cause-list/src/conversion/business-and-property-division-rolls-building-daily-cause-list-config.ts` | No option change. The schema already lists all 16 tab keys as `required`, so a missing tab is reported by the schema check. Update the comment above `BUSINESS_AND_PROPERTY_SHEETS`, which says a missing tab yields an empty section. `minRows: 0` stays: a tab must be present, but it may hold only the header row |
| `libs/list-types/common/src/conversion/excel-validation-error.ts` | Also holds `ExcelFileReadError` and `isExcelFileReadError()` |
| `libs/list-types/common/src/index.ts` | Export `ExcelValidationError`, `type ExcelValidationIssue`, `isExcelValidationError`, `ExcelFileReadError`, `isExcelFileReadError` |
| `libs/admin-pages/src/index.ts` | Export `formatExcelValidationErrors` |
| `libs/admin-pages/src/manual-upload/model.ts` | Add `nonStrategicUploadFileError?: string` to `SessionData` (type only) |
| `apps/web/src/pages/(admin)/non-strategic-upload/index.ts` | Call `validateNonStrategicExcel` instead of `convertExcelForListTypeName`. In its `catch`: if `isExcelValidationError(error)`, set `nonStrategicUploadErrors` to the formatted list and `nonStrategicUploadFileError` to the inline summary. If `isExcelFileReadError(error)`, log the cause and set a single `fileUnreadable` error. Otherwise keep the current behaviour. In GET, read `nonStrategicUploadFileError`, delete it, and pass it as `fileError` |
| `apps/web/src/pages/(admin)/non-strategic-upload/index.njk` | The inline file error uses `fileError` when it is set, otherwise `getError(errors, "#file")`. This avoids the `getError` macro joining every `#file` error into one long inline message |
| `apps/web/src/pages/(admin)/non-strategic-upload/en.ts` / `cy.ts` | Add `fileErrorSummary`, `fileErrorSummarySingle` and `fileUnreadable` (below). `cy.ts` gets the same keys with `[WELSH TRANSLATION REQUIRED: '...']` placeholders to keep key parity. The page renders English only, as today |

The controller change in `apps/` is unavoidable because the page already lives there. All logic stays in `libs/`. The controller only branches and assigns to the session.

### Display format

The location wording copies PIP's `ValidationErrorFormattingHelper` (single quotes, `Sheet 'X' - Row N of 'Y' column`), with the reason appended (decision 1). Location wording is English only and built in the formatter, as in PIP (decision 4):

| Issue kind | English |
|---|---|
| Multi-tab cell | `Sheet 'Appeal List' - Row 5 of 'Time' column: Invalid time format '25pm'. Expected format: h:mma (e.g., 9:30am) or ha (e.g., 2pm)` |
| Multi-tab missing value | `Sheet 'Appeal List' - Row 5 of 'Venue' column: Missing required value` |
| Single-tab cell | `Row 5 of 'Judge' column: Missing required value` |
| Tab-level (headers) | `Sheet 'Patents Court': Missing columns: Time, Venue` |
| Row-level (schema error on a whole row) | `Sheet 'Appeal List' - Row 7: <schema message>` |
| Missing tab (BPD) | `Sheet 'Patents Court': Sheet is missing from the file` |
| Inline under file input | `The file contains 73 errors. Check the list of errors at the top of the page.` |
| Unreadable file | `The selected file could not be read. Check it is a valid Excel (.xlsx) file and upload it again.` |

For a missing required value, PIP can only say `Sheet 'X' - Row N`, because JSON schema reports `required` against the row. cath-service validates cell by cell, so it names the column as well. That is more precise and still in PIP's format. For a missing tab, PIP shows the schema's error text with no location. cath-service uses its tab-level format, so the admin is told which tab to add.

Content added to `en.ts` (placeholders in `cy.ts`):

```ts
fileErrorSummary: "The file contains {count} errors. Check the list of errors at the top of the page.",
fileErrorSummarySingle: "The file contains 1 error. Check the list of errors at the top of the page.",
fileUnreadable: "The selected file could not be read. Check it is a valid Excel (.xlsx) file and upload it again."
```

All errors are listed; there is no cap (decision 3, matching PIP).

Ordering: configured tab order (for BPD this is the `SECTIONS` order, the same order as the tabs in the template), then row number (numeric), then the column order in `FieldConfig`. This is deterministic and follows the workbook. It avoids PIP's string sort, which puts "Row 10" before "Row 2".

The sheet label is the real tab name (`worksheet.name`), not PIP's Title-Cased internal key. Every summary item links to `#file`, as the existing file errors do (PIP links to `#`).

### API / DB

No API endpoints and no Prisma schema changes.

## 3. Error Handling & Edge Cases

| Scenario | Behaviour |
|---|---|
| Errors across many tabs and rows | All collected and all listed (no cap), in tab, then row, then column order. The inline message gives the total |
| Very large number of errors | Every error is stored in the Redis session and listed, as in PIP. Accepted for now; revisit if it proves a problem |
| Blank rows between data rows | Row numbers count data rows only (PIP behaviour). Normally data row N is Excel row N+1; each truly empty row above it (skipped by ExcelJS) widens that gap by one. Accepted as matching PIP |
| Fully blank rows, or rows whose cells only evaluate to empty (whitespace, formula returning `""`) | Unchanged from today (decision 10). Truly empty rows are skipped and reading continues. Unlike PIP, a blank row does not end the tab |
| Tab missing required headers | One tab-level issue listing the missing columns; that tab's rows are not validated |
| Unknown/extra headers (e.g. "Internal notes") | Still ignored, as today; no issue |
| Empty tab, or tab with header only (BPD `minRows: 0`) | No issue, as today. The tab is present, so the requirement is met |
| Expected tab absent from workbook (BPD) | The key is left out, the schema's `required` fails, and there is one tab-level issue per missing tab (`Sheet 'X': Sheet is missing from the file`), listed alongside any cell errors. Same as PIP (decision 9) |
| Expected tab absent (other multi-sheet lists) | Decided by the schema, as in PIP. Court of Appeal Civil (`dailyHearings`, `futureJudgments`), Interim Applications (`hearingList`, `openJusticeStatementDetails`) and London Administrative Court (`mainHearings`, `planningCourt`) all require every tab key, so a missing tab is reported the same way as for BPD. This changes behaviour: today these lists accept the file and show an empty section. A file with a missing tab is never published, so no renderer sees an absent key |
| List type with no JSON schema | The schema step is skipped; only the converter's issues are reported |
| Converter and schema report the same location | Reported once (the converter's issue, which carries the cell reason) |
| Schema error the converter does not check (e.g. a schema `pattern` or `enum`) | Reported with a PIP-style location, and AJV's message as the reason |
| Tab name truncated to 31 characters in the workbook | Still counts as present, because `findWorksheetByName` already matches the truncated name |
| Unrecognised extra or misspelt tab (e.g. "Notes", "Apeal List") | Ignored, as today. Out of scope (decision 7) |
| Workbook matches no expected tab | Plain `Error` with today's "no recognised worksheet tabs" message, shown as a single error |
| Positional-fallback multi-sheet lists | `sheetName` is the actual tab name the user sees (`worksheet.name`), not the configured name |
| Tab name truncated to 31 characters | `worksheet.name` (truncated) is shown, because that is what the user sees in Excel |
| Single-sheet lists | Issues have no `sheetName`; the location starts at "Row" |
| `minRows` not met (lists with `minRows >= 1`) | Plain `Error`, as today |
| Corrupt or non-xlsx file (ExcelJS load fails) | `ExcelFileReadError`; one friendly `fileUnreadable` error. The raw library error is logged, not shown (decision 6) |
| Cell values in messages | Rendered through the `text:` property of `govukErrorSummary`/error message (auto-escaped). Not logged; at most the issue count is logged |
| Summary page re-conversion (`non-strategic-upload-summary`) | Unchanged. The file was already validated on the upload page, so an error here falls back to today's generic handling |
| Existing callers reading `error.message` | Still get the first error in today's format, so existing unit tests across list-type libs keep passing |

## 4. Acceptance Criteria Mapping

| AC | How it is satisfied | Verified by |
|---|---|---|
| When an error occurs during non-strategic upload, error locations are returned instead of the generic message | The converter collects structured issues with tab, row and column. The controller turns them into located error summary items | Unit tests on `excel-to-json`, `multi-sheet-converter`, the BPD config, the `formatExcelValidationErrors` formatter and the controller; template test; E2E journey step with a multi-tab BPD workbook |
| No change to the manual upload process | No manual-upload controller, template, content or validation file changes. Only a type-only optional session key is added. Manual upload validates JSON through `validateListTypeJson`, which is unchanged. The only change beneath it is the additive `issues` field on `createJsonValidator`'s result; `errors` is identical | Existing `manual-upload` unit, template and E2E tests pass unchanged. Reviewer check that the diff has no `manual-upload/` page or `validation.ts` changes |

## 5. Test Scenarios

Unit and integration (co-located, AAA):

1. **Converter collects all errors in a tab**: several bad rows and fields give one `ExcelValidationError` with every issue, 1-based data-row numbers (first data row = 1), column headers and reasons. `.message` equals today's first-error text. A corrupt buffer throws `ExcelFileReadError`.
2. **Converter tab-level and row-level issues**: missing headers give one tab issue and no row issues; extra headers are ignored; blank-row handling is unchanged (existing tests still pass).
3. **Multi-sheet aggregation**: errors in two tabs are combined in tab order and tagged with `worksheet.name`; a valid workbook still converts; non-validation errors and "no recognised tabs" are rethrown unchanged.
4. **BPD Rolls Building config**: a workbook with errors in "Appeal List" and "Insolvency & Companies Court" reports both tabs by name. A workbook missing two tabs reports a missing-tab issue for each, together with any cell errors. A workbook with every tab present but some holding only the header row converts successfully.
4a. **Schema check (`non-strategic-excel-validation.test.ts`)**: run against the real BPD schema with no mocks. Missing tabs are reported through `required`. Converter and schema issues are combined and duplicates dropped. A schema-only error gets a PIP-style location. A list type with no schema reports only the converter's issues. A valid workbook returns its data.
5. **Formatter**: produces the location formats for multi-tab, single-tab, tab-level and row-level issues; lists every issue (no cap); orders rows numerically (Row 2 before Row 10).
6. **Upload controller**: an `ExcelValidationError` sets the formatted session errors and `nonStrategicUploadFileError` (singular and plural text) and redirects. An `ExcelFileReadError` sets the single `fileUnreadable` error and does not expose the raw message. A plain `Error` keeps today's single error. GET passes `fileError` and clears it.
7. **Template**: the error summary lists each located item, and the inline file error shows `fileError` instead of the joined list.

E2E (one journey, in the existing `e2e-tests/tests/admin/non-strategic-upload.spec.ts`):

8. **Non-strategic upload journey with located errors**: add a step to the existing journey test (do not add a new test). The admin uploads a BPD Rolls Building workbook with errors in two tabs (a missing required value, and a bad time). The step checks that the error summary shows each `Sheet '...' - Row N of '...' column` item and the inline file message, runs the axe check on the error state, then uploads a valid file and the journey continues to summary and success. The existing manual-upload E2E journey runs unchanged as the AC2 regression check.

## Decisions (resolved 2026-11-20)

1. **Reason and location**: show both (`... column: Missing required value`). PIP shows location only. To be revisited later.
2. **Row number**: follow PIP. "Row N" is the 1-based data row; the header is not counted.
3. **Error cap**: none. PIP lists every error.
4. **Welsh**: English only, as in PIP (strings built server-side, no translation). `cy.ts` keeps key parity with placeholders.
5. **" in row N" in validator messages**: removed when building the reason. The validator signature is not refactored. PIP has no equivalent because it drops the message.
6. **Corrupt or unreadable files**: in scope. Show a friendly "could not be read" message. PIP just falls back to its generic error.
7. **Unrecognised tabs**: out of scope; behaviour unchanged.
8. **Scope**: applies to all Excel non-strategic list types.
9. **Missing tabs**: follow PIP. Convert, then check the result against the list type's schema at upload. The converter leaves out the key for a missing tab, and the schema's `required` list decides whether that is an error. BPD's schema requires all 16 tabs. There is no separate converter option. Confirmed against PIP: `ExcelConversionService.getMultiSheetData` only adds keys for tabs that exist in the workbook, and all four PIP multi-tab schemas (BPD, Court of Appeal Civil, Interim Applications Chancery, London Administrative Court) require every tab. In PIP, the `shouldFailWhenMissingSheet` integration test in pip-data-management#955 expects a missing sheet to fail validation.
10. **Blank rows**: keep today's behaviour. PIP stops reading a tab at the first fully blank row and silently ignores the rows below it. cath-service keeps skipping blank rows and reading on, with no new blank-row error.

## CLARIFICATIONS NEEDED

1. Revisit whether the reason text stays in the error items (decision 1), once the admins have tried it.
2. Existing test workbooks for multi-sheet lists (unit fixtures and E2E files) that leave out tabs their schema requires will start failing. Each needs the full set of tabs as part of this ticket (see tasks.md).
3. The schema check now runs at upload for every Excel non-strategic list that has a schema. A list whose schema is stricter than its converter will start rejecting files it accepts today. That matches PIP and the confirmed scope (decision 8), but it can surface schema bugs. The existing E2E and unit fixtures for each list type will catch these.
