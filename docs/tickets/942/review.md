# Code Review: Issue #942

## Summary

#942 adds an Excel download for the 7 SSCS Daily Hearing List types. It reuses #940's uploaded-workbook reformatter: `reformatSscsDailyHearingListExcel` (`libs/list-types/sscs-daily-hearing-list/src/excel/excel-reformatter.ts:6-11`) is a thin config over `SSCS_EXCEL_CONFIG.fields` and `t.tableHeaders`, and it is registered by `listTypeName` for all 7 SSCS names (`libs/publication/src/processing/service.ts:407,451-457`). The existing notification path then picks the PDF+Excel Notify template because `{artefactId}.xlsx` exists.

The change also does what #940's review asked for in the shared code:
- `reformatUploadedWorkbook` (`libs/list-types/common/src/excel/uploaded-workbook-reformatter.ts:10-42`) now copies an allow-list into a fresh `Workbook` instead of editing the upload in place.
- `readCellValue` (`libs/list-types/common/src/conversion/excel-to-json.ts:24-48`) flattens rich text, hyperlinks, formulas and error values.
- The conversion header row is read by column (`excel-to-json.ts:91-94`).
- The flat-file republish route now deletes a stale xlsx (`service.ts:725-728,771-780`).

**Leak verification.** I checked this myself rather than relying on the unit tests. A throwaway vitest (deleted afterwards) ran the real `reformatSscsDailyHearingListExcel` on a workbook that had:
- a hidden `Private` sheet
- a hidden mapped column and a hidden unmapped column
- a hidden row
- a cell note
- all 8 workbook properties set
- a live `=HYPERLINK("http://evil.example",…)` in an unmapped column
- an "Internal notes" column
- a rich-text Appellant cell and a formula in Additional Information
- `headerFooter`, a defined name, a data validation and a conditional format

I unzipped the output and searched the raw XML of every part. There were **no** matches for any `SECRET_*` marker, `evil.example`, `HYPERLINK`, `<f>`, `hidden="1"`, `state="hidden"`, `<comment`, `dataValidation`, `conditionalFormatting` or `definedName`. The output has one visible sheet. `docProps/core.xml` contains only ExcelJS defaults (`creator`/`lastModifiedBy` = `Unknown`, everything else empty). Rich text came out as `"A Smith"` and the formula as its cached `"Interpreter"`. The data rows match `convertExcelForListTypeName` exactly, and the header row is frozen. **#940's CRITICAL 1 and HIGH 1 and 2 are fixed.**

The same test found two divergences, both covered below:
- A duplicated header column: the PDF uses the last column and the Excel uses the first.
- Time-formatted cells still come out as `30/12/1899` (an existing issue, and fixed separately on master).

Lint passed. All 4 changed unit-test workspaces pass (common 316, sscs 68, rcj-standard 49, publication 443 tests). Statement coverage is above 92% in each.

The verdict is held back by 4 things:
- Two ACs are only partly met (Liverpool and JSON-only publications; PDF header data).
- A stale xlsx can still reach subscribers when a blob delete or the list-type lookup fails.
- The branch now conflicts with `origin/master` (#966 landed after the plan was written and added its own cell normaliser).
- Nothing has been run end to end.

## 🚨 CRITICAL Issues

None. The data-exposure defect inherited from #940 is fixed, and I confirmed this by examining the generated file. No acceptance criterion is entirely unmet.

## ⚠️ HIGH PRIORITY Issues

1. **AC1 only partly met: Liverpool is not confirmed, and JSON-only SSCS publications get no Excel**
   - **What is done:** 7 SSCS names are registered (`service.ts:451-457`). A test checks every `listTypeData` entry with `urlPath === "sscs-daily-hearing-list"` (`service.test.ts:2034`).
   - **What is missing:**
     - The ticket names 8 lists. "Liverpool … Daily Hearing List" is assumed to publish under North West, based on the location's region (`libs/location/src/location-data.ts:174`). That is plan Clarification 3's default and has not been confirmed.
     - SSCS lists published as JSON (the non-strategic JSON branch, `POST /publication`, or a manual JSON upload) are deliberately PDF-only. `createUploadedExcelGenerator` returns `{ success: false }` when there is no `uploadedExcel` (`service.ts:391-394`).
     - `tasks.md:5-7` ("Agree before coding" and "Record answers to CLARIFICATIONS 1 and 2 on the issue") are still unticked.
   - **Impact:** "all SSCS hearing lists above" is not literally met. A UAT tester who publishes via the API, or looks for a Liverpool list type, will report a defect.
   - **Recommendation:** post the Clarification 1, 2, 3 and 5 decisions on issue #942 and get PO sign-off. Ask for the issue text to be corrected from 8 lists to 7. If the PO rejects the JSON gap, add plan option B (a JSON-generated fallback).

2. **AC3 only partly met: PDF header data is not in the Excel**
   - **What is done:** all 9 table columns, with the PDF's headings (`t.tableHeaders`, the same object `pdf-template.njk` uses) and the PDF's values. The test at `excel-reformatter.test.ts:88` asserts equality with the conversion output.
   - **What is missing:** the list title, "List for" date, "Last updated", the important-information block and the data source. The PDF shows these and the Excel does not. Plan Clarification 5 defaults to "table fields only", but no sign-off is recorded. #940's HIGH 3 raised the same question and it is still open.
   - **Recommendation:** record one PO decision covering both tickets. If header data is required, put it somewhere that does not break the single-table layout (for example a second "About this list" sheet), not in merged rows above the header.

3. **A stale xlsx from an earlier publication can still be emailed and downloaded**
   - **Where:**
     - `service.ts:392` and `service.ts:400`: the `deleteBlob` calls inside `createUploadedExcelGenerator` are not guarded. If the delete throws, `generatePublicationExcel`'s catch only logs it (`service.ts:484-486`), and the old file stays.
     - `service.ts:514-516`: if `prisma.listType.findUnique` throws, `generatePublicationPdf` returns `{}`. `listTypeName` becomes `""` (`service.ts:713`), no Excel generator runs, and nothing is deleted.
   - **Why it matters:** notifications do not use the `excelPath` that `processPublication` passes them (`service.ts:738`). `buildEmailDataWithFiles` always downloads `${artefactId}.xlsx` (`libs/notifications/src/notification/notification-service.ts:513`), and so does the public download (`libs/public-pages/src/flat-file/flat-file-service.ts:97`).
   - **Impact:** on a republish where either failure happens, subscribers get the *previous* upload's Excel next to the *new* PDF. For SSCS, the previous version may contain a hearing or appellant that was removed on purpose. The chance is low (it needs a blob or DB failure), but the effect is publishing superseded personal data.
   - **Recommendation (choose one; the first is the more robust):**
     - Have `buildEmailDataWithFiles` attach the Excel only when `excelPath` was passed in. That is a small `libs/notifications` change, and it makes a failed delete harmless for email.
     - Or, in `processPublication`, call the guarded `deleteStaleExcel` whenever `isUpdate && !excelResult.hasExcel`, and use the same helper inside `createUploadedExcelGenerator` instead of bare `deleteBlob`.
     - Add tests for "delete throws in the generator" and "PDF list-type lookup throws on republish".

4. **The branch now conflicts with `origin/master`, which has a second implementation of the cell-reading fix**
   - **Evidence:** `git merge-tree --write-tree origin/master HEAD` reports `CONFLICT` in:
     - `libs/list-types/common/src/conversion/excel-to-json.ts`
     - `libs/list-types/common/src/conversion/multi-sheet-converter.ts`
     - `libs/list-types/common/src/conversion/multi-sheet-converter.test.ts`
     - `libs/publication/src/processing/service.ts`

     That is before #942's own working-tree edits to two of those files are added. The cause is `a4a9ef4d` (#966, Business and Property Rolls Building), which landed after the plan. `plan.md:111` ("no textual conflicts") is out of date.
   - **What #966 changed:**
     - `excel-to-json.ts` gained a separate `normalizeCellValue`, which handles `richText`, `text`, `result` and `hyperlink`.
     - `formatExcelTime` turns 1899-12-30 time cells into `"10:30am"`.
     - `multi-sheet-converter.ts` gained a `matchByNameOnly` option that changes worksheet resolution inside the loop #940 refactored into `resolveWorksheet`.
   - **Impact:**
     - Two cell normalisers with different semantics. For `{ error }`, #942 returns `""` so required-field validation fails, while master returns the object. For a hyperlink with no text, master returns the URL.
     - If the reformatter's `resolveWorksheet` ignores `matchByNameOnly`, any list that uses both features would pick a different sheet for the Excel than for the PDF.
     - After the merge, SSCS and RCJ hearing times change (`30/12/1899` becomes `10:30am`) in both the PDF and the Excel, so the expectations in the new tests need checking.
   - **Recommendation:** when rebasing, merge the two into one exported `readCellValue`. Keep #942's error and empty-result semantics and master's time formatting, and delete `normalizeCellValue`. Make `resolveWorksheet` take the same options as the converter. Add a `readCellValue` test for a 1899-12-30 time. Update `plan.md` §1 "Rebase conflicts" and re-run the full suite.

5. **Duplicate header columns: the PDF shows one column, the Excel shows another**
   - **Where:**
     - `uploaded-workbook-reformatter.ts:48` keeps the *first* column for a field.
     - `excel-to-json.ts:97-101` keys `rowData` by header text, so for an exact duplicate the *last* column overwrites the earlier ones.
     - The existing test `uploaded-workbook-reformatter.test.ts:160` ("should copy only the first column when a header is repeated") locks the divergence in.
   - **Evidence (throwaway test):** headers `…Appellant…` plus a second `Appellant` in column J. The converted JSON (and so the PDF) gives `appellant = "SECOND_APPELLANT_COL"`, and the Excel gives `"First Appellant"`.
   - **Impact:** this breaks the "Excel matches the PDF row for row" guarantee that AC3 relies on. If one of the duplicates is a working copy (for example full names beside initials), the Excel can publish data the PDF did not.
   - **Recommendation:** reject duplicate mapped headers at upload with a clear validation error in `validateHeaders` (`excel-to-json.ts:147`). That is the simplest option, and the admin learns about it at upload time. Failing that, make both sides pick the same column. Update the test at `:160`.

6. **Nothing has been run end to end**
   - The new SSCS steps (`e2e-tests/tests/admin/non-strategic-upload.spec.ts:429-456`) are inside `test.describe.skip` (`:187-188`). The lower-environment check is still open (`tasks.md:84-87`).
   - **Impact:** nothing yet shows that a real SSCS upload produces a Notify email with two working links, or that the deployed `GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION_PDF_EXCEL` template renders both. Ticket §13.10 calls the template config the highest-risk deployment step: if it is unset, `getSubscriptionTemplateId` throws as soon as the xlsx appears.
   - **Recommendation:** before release, do the manual check in `tasks.md:84-87`: English and Welsh uploads with a hidden sheet, a note, a formula and an extra column, then a JSON republish. Confirm the template ID is set in every environment.

## 💡 SUGGESTIONS

1. **Blank source rows become blank spacer rows.** `copyWorksheet` writes to `target.getRow(rowNumber)` (`uploaded-workbook-reformatter.ts:67`), which keeps the source row number. `eachRow` skips empty rows, but a gap in the upload stays a gap in the output, while the conversion and PDF have no gap. Ticket §12.1 asks for "no blank spacer rows" so screen readers can move through the range. Use a running target row index instead.
2. **Copied styles can carry meaning and leftover formats.** `structuredClone(row.getCell(sourceColumn).style)` (`:76`) copies fills and font colours. Clerks often use red fill to mean "check" or "do not publish", and that meaning leaks into the output. It also copies `numFmt`: the throwaway test left `hh:mm` on a string cell. Every value is now a string, so consider copying only `font`, `alignment` and `border`, or at least dropping `fill` and `numFmt`.
3. **Use one guarded delete helper.** `deleteStaleExcel` (`service.ts:771`) logs and swallows errors, but the two `deleteBlob` calls in `createUploadedExcelGenerator` (`:392,:400`) do not. Using one helper in all three places is DRY and fixes half of HIGH 3.
4. **Split the work into two commits as planned** (`plan.md:93-97`): `fix(940): harden uploaded-workbook reformatter and cell reading`, then `feat(942): SSCS Excel download`. The fix commit can then be cherry-picked into #1122 so RCJ is never released with the leak.
5. **E2E tidy-ups** (`non-strategic-upload.spec.ts`):
   - `as { id: number } | null` casts on `getListTypeByName` (`:402-403`). Type the helper's return instead.
   - The Welsh SSCS step (`:445-456`) does not assert the email links or the dropped "Internal notes" column.
   - Axe runs only on the KB upload. That is acceptable because it is the same page, but say so in the step comment.
6. **Welsh link text in Notify.** `pdf_link_text` and `excel_link_text` are hard-coded English (`libs/notifications/src/govnotify/govnotify-client.ts:79,89`). Raise the follow-up ticket now (plan Clarification 6) so UAT does not report it as a #942 regression.
7. **Worth a test:** an SSCS-level case that uses a rich-text or formula cell and asserts equality with `convertExcelForListTypeName`. The shared reformatter tests cover the mechanism, but the SSCS test (`excel-reformatter.test.ts:88`) uses plain strings only.
8. **Memory.** Each publication holds the upload and output workbooks in memory and clones every mapped cell's style. That is fine for daily lists, which are small and processed in the background, but worth remembering if the reformatter is applied to large weekly lists.

## ✅ Positive Feedback

- **The redesign is right.** Copying an allow-list into a new workbook, instead of stripping things out of the upload, is the correct call. It is also why the leak check came back empty for content nobody listed explicitly: header/footer, defined names, validations and conditional formats. The comment at `uploaded-workbook-reformatter.ts:15-16` explains *why*.
- **Every written value goes through `sanitiseCellValue`** (`:78`), and the formula-injection guard is tested (`uploaded-workbook-reformatter.test.ts:207`).
- **`readCellValue` is thorough and well tested.** It handles rich text, plain and rich hyperlinks, formula and shared-formula results, a missing result, errors and unknown objects. An error in a required column now fails the upload instead of publishing `#REF!` (`excel-to-json.test.ts:321`). This also fixes `[object Object]` in the PDF and on-screen list for every Excel-converted list type.
- **The blank-header shift is fixed** by reading headers by column, with a test (`excel-to-json.test.ts:349`).
- **The SSCS config is minimal and stays in step with the PDF:** one call, reusing `SSCS_EXCEL_CONFIG.fields` and `t.tableHeaders`. It adds no new locale strings and no second data source.
- **CLAUDE.md conventions are followed:**
  - keyed by `listTypeName` throughout
  - `listTypeId: 999` in fixtures (`service.test.ts:2058,2075,2094,2114`)
  - the factory moved above its first use (`service.ts:386`)
  - `ReformatSheetConfig` extends `WorksheetLocator`, and the types sit at the bottom of the file
  - `.js` imports, no `any` in production code
  - logs contain only `artefactId` and the error message
- **The SSCS test proves coverage:** the parity test derives the SSCS names from `listTypeData` (`service.test.ts:2015`), so a future eighth SSCS list type fails the test until it is registered.
- **Error paths are tested:** a reformat failure still sends the PDF and notifications (`service.test.ts:2088`), and a failed stale delete logs without throwing (`service.test.ts:2141`).
- **The RCJ behaviour change is deliberate and tested:** unknown columns are now dropped (`rcj-standard-daily-cause-list/src/excel/excel-reformatter.test.ts:30-47`). The E2E cleanup now deletes artefacts, and the fixed `waitForTimeout` is gone.

## Test Coverage Assessment

- **Unit tests:** strong. The SSCS reformatter has 7 real-ExcelJS round-trip tests with no mocks (`excel-reformatter.test.ts:51-140`). The shared reformatter has 29 tests, including one per #940 finding. The conversion has 15 new typed-cell tests. Publication has 20 new tests: 7 `listTypeHasExcel`, 7 reformat-and-save, processPublication with and without an upload, failure, and 3 flat-file stale-delete tests. All follow AAA.
  - **Gaps:** a delete failure inside `createUploadedExcelGenerator`; a list-type lookup failure on republish (HIGH 3); duplicate headers checked against the conversion (HIGH 5); blank intermediate rows.
- **E2E tests:** the existing `@nightly` journey is extended with English and Welsh SSCS uploads. It asserts the localised headings, the dropped unknown column and 2 Notify links. It is still inside `test.describe.skip` (`non-strategic-upload.spec.ts:187-188`) and needs `GOVUK_NOTIFY_API_KEY`, so it does not run.
- **Accessibility tests:** there is no UI change. Axe runs inline on the summary and success pages in the (skipped) journey. The workbook has a bold, frozen header row (`uploaded-workbook-reformatter.ts:63`, tested at `uploaded-workbook-reformatter.test.ts:368`), which meets ticket §12.1 apart from suggestion 1 (spacer rows).

**Statement coverage per changed workspace** (`turbo test -- --coverage`). No "Coverage summary" block was printed, so these figures are the "All files" statements % from each workspace:

| Workspace | Statements | Notes |
|---|---|---|
| libs/list-types/common | 92.5% | `excel-to-json.ts` 97.87%, `src/excel` 95.65% |
| libs/list-types/sscs-daily-hearing-list | 100% | `excel-reformatter.ts` 100% |
| libs/list-types/rcj-standard-daily-cause-list | 95.23% | test-only change |
| libs/publication | 95.07% | `processing/service.ts` 92.51% |
| e2e-tests | n/a | not measured; suite skipped |

All are above 80%.

The `apps/web/src/app.test.ts` beforeEach timeout reported under full parallel load is in an untouched file and passes in isolation. I treat it as flaky.

## Acceptance Criteria Verification

- [~] **Excel and PDF downloadable files are made available as downloadable options for all SSCS hearing lists above**
  - Done:
    - PDFs were already registered (`service.ts:226-232`). Excel is now registered for all 7 SSCS names (`service.ts:407,451-457`), with a parity test against `listTypeData` (`service.test.ts:2015,2034`).
    - Reformat and save is tested per list type (`service.test.ts:2042`).
    - Downloads go through the existing `?format=excel` endpoint (`flat-file-service.ts:97`).
  - Missing:
    - Liverpool is treated as North West and not confirmed by the PO (`plan.md:291`).
    - SSCS publications made via JSON or the API get no Excel (`service.ts:391-394`).
    - The clarifications are not recorded on the issue (`tasks.md:5-7`). No end-to-end run.
- [x] **The uploaded excel file will be re-used in providing the excel file for download**
  - The uploaded buffer is reloaded and its mapped content copied (`uploaded-workbook-reformatter.ts:10-42`). The sheet name, column order, widths, row heights and cell styles are kept (`uploaded-workbook-reformatter.ts:56-81`; tests `uploaded-workbook-reformatter.test.ts:328`, `excel-reformatter.test.ts:77`).
  - This is judged against the agreed default that unknown columns and sheets are dropped.
- [~] **All the data fields available in the current downloadable PDF file should also be available on the excel downloadable file**
  - Done:
    - All 9 PDF table fields, with the same headings (`excel-reformatter.ts:10`, `t.tableHeaders`) and the same values as the conversion behind the PDF (`excel-reformatter.test.ts:88`).
    - Welsh headings are covered (`excel-reformatter.test.ts:65`).
  - Missing:
    - The PDF header data (list title, "List for" date, last updated, important information, data source) is not in the Excel, and there is no recorded sign-off.
    - With duplicate header columns, the Excel shows different data from the PDF (HIGH 5).
- [x] **Links to download both file types are displayed in the email notifications**
  - `processPublication` passes `excelPath` (`service.ts:723,738`; test `service.test.ts:2053`).
  - Notifications find `${artefactId}.xlsx` (`notification-service.ts:513`) and select the PDF+Excel template (`libs/notifications/src/govnotify/template-config.ts:16-30`), which sets both links (`govnotify-client.ts:78-89`).
  - The E2E asserts 2 Notify links (`non-strategic-upload.spec.ts:443`) but is skipped, so the evidence is unit-level only (HIGH 6).

**Tally:** 2 met, 2 partial, 0 unmet, out of 4.

## Next Steps

- [ ] Address critical issues (none)
- [ ] Fix high priority items:
  - [ ] Record PO decisions on Liverpool, the JSON-only gap and PDF header data on issue #942 (HIGH 1, 2)
  - [ ] Stop a stale xlsx reaching subscribers: gate the email on `excelPath`, or guard every delete and delete on every non-Excel republish (HIGH 3)
  - [ ] Rebase on `origin/master`, merge `normalizeCellValue` into `readCellValue`, align `resolveWorksheet` with `matchByNameOnly`, and update `plan.md` (HIGH 4)
  - [ ] Reject duplicate mapped headers at upload, or align the column choice (HIGH 5)
  - [ ] Run the lower-environment check and confirm `GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION_PDF_EXCEL` in every environment (HIGH 6)
- [ ] Consider suggestions (especially 1 spacer rows, 2 style filtering, 4 two-commit split)
- [ ] Re-run tests after fixes (`yarn lint:fix`, typecheck, `yarn test`, coverage)

## Overall Assessment

**NEEDS CHANGES**

The core of #942 is sound. The SSCS wiring is minimal and correct, and the shared reformatter rewrite fixes the data-exposure and formula issues from #940: an adversarial workbook produced a clean file. Test quality and coverage are high.

It is not ready to merge yet. Two ACs are only partly met, and their defaults have never been confirmed with the PO. A stale xlsx can still reach subscribers when a delete or lookup fails. The branch now conflicts with master, which has a competing cell normaliser that must be merged with this one. Duplicate headers make the Excel differ from the PDF. Nothing has been run end to end.

None of this needs a redesign. The code changes are small, and the rest is decisions and verification.
