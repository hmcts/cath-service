# Code Review: Issue #940

## Summary

The change adds an Excel download for the 10 RCJ hearing lists that do not already have one. It copies the legacy `pip-data-management` PUB-3302 behaviour: the workbook the admin uploaded on the non-strategic upload route is reloaded with ExcelJS and reformatted in place. Known header cells get the localised, bold PDF table headings, and known data cells get the same formatted values the PDF shows. The result is saved as `${artefactId}.xlsx`. The existing notification path then picks the PDF+Excel Notify template because that blob exists. `CIVIL_DAILY_CAUSE_LIST` and `FAMILY_DAILY_CAUSE_LIST` already had generated Excel (`libs/publication/src/processing/service.ts:392-393`), so all 12 lists in the ticket are covered. The change also fixes a separate bug: the Court of Appeal (Civil Division) converter was registered under the wrong name, so uploads for that list could never convert.

The design is clean. It has one shared reformatter (`libs/list-types/common/src/excel/uploaded-workbook-reformatter.ts`) and a thin config in each list-type lib. It reuses the converter's `FieldConfig`, sheet resolution, `readCellValue` and row formatters, so the Excel is built from the same fields as the PDF. Registry keys use `listTypeName`, never `listTypeId`. Lint and `tsc --noEmit` pass on every changed package, all unit tests pass, and statement coverage is above 90% in every changed workspace.

The main problem is that "re-use the uploaded file" also re-uses everything in it that the PDF filtered out. Hidden sheets, hidden columns, cell notes, workbook author metadata and live formulas all go to every subscriber, and for PUBLIC lists the file is downloadable through the flat-file endpoint. I reproduced this with a throwaway ExcelJS test; details are under CRITICAL. A second correctness defect also matters: rich-text, hyperlink and formula cells in known columns are overwritten with `"[object Object]"`.

Verification gaps:
- The new `@nightly` E2E is inside a `describe.skip` block (`e2e-tests/tests/admin/non-strategic-upload.spec.ts:73-74`). It cannot run until the SSO specs are re-enabled.
- The manual check on a lower environment (`tasks.md`, last item) is still pending and cannot be done from this workspace.

So the email and download behaviour is proven by unit tests at each step, not by an end-to-end run.

## 🚨 CRITICAL Issues

1. **Workbook content that never appears in the PDF is shared with subscribers and, for PUBLIC lists, the public**
   - **Where:** `libs/list-types/common/src/excel/uploaded-workbook-reformatter.ts:9-26`. The whole workbook is loaded and written back. Only mapped cells in header row 1 and the data rows are rewritten.
   - **Evidence (reproduced in a throwaway vitest, since deleted):** an upload with a hidden column 8, a hidden sheet `Private`, a cell note `"Defendant is vulnerable - do not publish"` on A2, and `creator`/`lastModifiedBy` set to staff names comes out with all of them intact. Output: `H hidden true`, `note "Defendant is vulnerable - do not publish"`, `sheets [['S','visible'],['Private','hidden']]`, `creator Jane Clerk John Admin`. Unknown columns such as "Internal notes" are also kept, by design.
   - **Impact:** this is a data protection issue. The PDF works as an allow-list of 7 or 8 fields; the Excel does not. Court staff often keep internal notes, hidden working sheets or hidden columns in these workbooks. The file is attached to every subscription email (`libs/notifications/src/notification/notification-service.ts:513`) and served by `GET /api/flat-file/:artefactId/download?format=excel` (`libs/public-pages/src/flat-file/flat-file-service.ts:93-97`), which applies normal publication access, so PUBLIC lists are open to anyone. Legacy behaving the same way is not a justification for publishing hidden data.
   - **Solution:** sanitise the workbook in `reformatUploadedWorkbook` before writing:
     - Remove worksheets whose `state !== "visible"`.
     - Remove hidden rows and columns (or at least un-hide them, so nothing is hidden from the reader).
     - Clear every cell's `note`.
     - Reset workbook properties (`creator`, `lastModifiedBy`, `company`, `manager`, `title`, `subject`, `keywords`, `description`).
     - Get a recorded product or DPO decision on whether unknown columns and unmapped sheets should be published at all. The safer default is to drop them, which still meets "re-use the uploaded file" because layout, sheet names, order and styling of the known data are kept.
     - Add a test for each of the above.

## ⚠️ HIGH PRIORITY Issues

1. **Live formulas in unmapped columns or sheets are passed on to subscribers (formula injection)**
   - **Where:** `uploaded-workbook-reformatter.ts:58-71` rewrites only mapped cells. Every other cell is kept with its `{ formula, result }`. Reproduced: `=HYPERLINK("http://evil.example","click")` in an unmapped column survives into the output unchanged.
   - **Impact:** a malicious or careless upload can give recipients `HYPERLINK`, `WEBSERVICE` or DDE-style formulas. Every other generator in the repo defends against this with `sanitiseCellValue` (`libs/list-types/common/src/excel/excel-utilities.ts:11`).
   - **Process issue:** `plan.md` Clarification 3 is marked "Resolved (default applied)", meaning nobody actually answered it. `tasks.md` line 3 nevertheless ticks "Confirm the CLARIFICATIONS".
   - **Recommendation:** replace every formula cell in the output workbook with its cached `result` as a plain value, or drop it. If unknown columns are kept, store them as text. Get Clarification 3 actually answered and record it.

2. **Rich-text, hyperlink and formula cells in known columns are overwritten with `"[object Object]"`**
   - **Where:** `libs/list-types/common/src/conversion/excel-to-json.ts:24-27` (`readCellValue` calls `String()` on ExcelJS object values), used by `uploaded-workbook-reformatter.ts:63`.
   - **Evidence (reproduced):** a Case Details cell with rich text and an Additional Information cell with a formula come out as `"[object Object]"` in both the conversion JSON and the reformatted Excel.
   - **Impact:** rich text appears as soon as a clerk bolds part of a cell, so this will happen with real uploads. The PDF already had this bug, but the Excel is worse: it replaces a cell that was readable in the upload with garbage.
   - **Recommendation:** make `readCellValue` handle `richText` (join the `.text` parts), `{ text, hyperlink }` (use `text`), `{ formula, result }` (use `result`) and error values. This fixes the PDF and the Excel together. Add tests in `excel-to-json.test.ts` and `uploaded-workbook-reformatter.test.ts`.

3. **AC 3 is only partly met: PDF header data is not in the Excel**
   - The Excel carries all PDF table columns, formatted the same way. It does not carry the header-level data the PDF shows: court or location, "List for" date, "Last updated" date and time, and data source (`libs/list-types/rcj-standard-daily-cause-list/src/pdf/pdf-template.njk:17-25`, and the footer `dataSource`).
   - `plan.md` says this is "Out of scope (confirmed)", but the ticket has no comments and the confirmation is not recorded anywhere I can see.
   - **Recommendation:** record the product owner's sign-off on the ticket, or add these values, for example in a small summary block or a document property.

4. **No executed end-to-end evidence yet**
   - The `@nightly` journey (`e2e-tests/tests/admin/non-strategic-upload.spec.ts:283`) is inside `test.describe.skip` (`:73-74`). The manual check on a lower environment is also pending (`tasks.md`, last item).
   - Unit tests cover each step: the page passes `uploadedExcel`, `processPublication` sets `excelPath`, and the notification code picks the template because the blob exists. Nothing has yet shown that a real upload produces a Notify email with two working links, or that Notify accepts the reformatted file.
   - **Recommendation:** complete and record the manual check (one upload per lib, English and Welsh, plus the JSON-republish case) before merge or release.

## 💡 SUGGESTIONS

1. **Stale `.xlsx` is not removed on every republish route.** The delete only runs inside `if (jsonData)` (`libs/publication/src/processing/service.ts:651`). Flat-file ingestion has no `jsonData`, and blob ingestion with `no_match` skips `processPublication` (`libs/api/src/blob-ingestion/repository/service.ts:111`). Both can leave an upload-derived xlsx attached to a reused `artefactId`. These are unlikely routes for RCJ lists, but worth closing or documenting.
2. **Race on quick re-uploads.** `processPublication` is fire-and-forget (`apps/web/src/pages/(admin)/non-strategic-upload-summary/index.ts:169`). Two confirms close together on the same `artefactId` can finish out of order, so the older reformatted file overwrites the newer one. The PDF already has the same race; consider a per-artefact guard, or compare `lastReceivedDate` before saving.
3. **Header mapping in conversion is positional and skips blank header cells.** `excel-to-json.ts:71` uses `headers.push(...)` inside `eachCell`, which skips empty cells, so a blank header column shifts every later column in the PDF data. The reformatter maps by `colNumber`, so in that case the PDF and Excel disagree. Use `headers[colNumber - 1] = ...`.
4. **DRY the sheet locator types.** `ReformatSheetConfig` (`uploaded-workbook-reformatter.ts:86-92`) and `SheetConfig` (`multi-sheet-converter.ts`) both repeat `worksheetName`/`worksheetIndex`. They could extend the new `WorksheetLocator` (`multi-sheet-converter.ts:496`).
5. **Module ordering (CLAUDE.md §8).** `rcjStandardUploadedExcelGenerator` (`service.ts:381`) sits mid-file, and `createUploadedExcelGenerator` (`service.ts:735`) is at the very bottom even though it runs while the module loads at line 381. It works because function declarations are hoisted, but it goes against "order of use". Move the factory next to the Excel registry.
6. **E2E hygiene** (`non-strategic-upload.spec.ts:283-366`):
   - The `finally` block does not delete the artefact (`deleteTestArtefacts`).
   - It uses `as { id: number }` and `artefact?.artefactId as string` instead of narrowing.
   - It has a fixed `page.waitForTimeout(1000)`.
   - Welsh is only checked on the success panel. A Welsh upload asserting Welsh headings in the Excel would cover the locale path end to end.
7. **Tautological test.** "should register all 10 RCJ list types" (`libs/publication/src/processing/service.test.ts:1890`) asserts the length of the test's own constant. Only the `listTypeHasExcel` loop is meaningful; drop the length check.
8. **Welsh link text in Notify.** `excel_link_text = "Download Excel version"` is hard-coded English (`libs/notifications/src/govnotify/govnotify-client.ts:89`). It is out of scope here, but should be raised as a follow-up for Welsh subscribers.
9. **Excel usability.** Consider freezing the header row (`worksheet.views = [{ state: "frozen", ySplit: 1 }]`). It helps keyboard and screen-magnifier users scanning long lists, and does not change the uploaded layout.
10. **Small behaviour change in `formatFutureJudgment`** (`court-of-appeal-civil-daily-cause-list/src/rendering/renderer.ts:36-41`). It now spreads every input property instead of picking the 8 fields. That is harmless for the PDF today, but the template data now depends on whatever extra keys the JSON carries.

## ✅ Positive Feedback

- **Good architecture:** one generic `reformatUploadedWorkbook` plus three per-lib configs of about 15 lines each. Everything is keyed by `listTypeName`, and test fixtures use `listTypeId: 999` (`service.test.ts:1982`).
- **Real reuse, not copies:**
  - `findFieldForHeader` and `readCellValue` are extracted from `getField`, with conversion behaviour unchanged.
  - `resolveWorksheet` is extracted from `createMultiSheetConverter`.
  - `normaliseHearing` and `formatFutureJudgment` are pulled out of the renderers.
  - `LONDON_ADMIN_SHEETS` and `COURT_OF_APPEAL_CIVIL_SHEETS` are shared by the converter and the reformatter.

  The Excel cannot drift from the fields the PDF was built from.
- **Avoids legacy defects:** headers are mapped by field name, not position, so there is no `IndexOutOfBounds` and reordered columns get the right heading. Empty or unrecognised sheets are skipped without aborting later sheets. The `Set` stops a sheet that two configs resolve to from being reformatted twice (`uploaded-workbook-reformatter.ts:15-23`).
- **Stale-file handling:** the stale-xlsx delete on the JSON route and on failure is well reasoned, and the comment at `service.ts:739` explains why.
- **Careful style handling:** `cell.style` is replaced rather than mutated, which avoids ExcelJS shared-style bleed (`uploaded-workbook-reformatter.ts:81-82`). There is a test for untouched styling, column widths and sheet names.
- **Bug fixed:** the CoA Civil converter name fix includes positive and negative registration tests.
- **Reformatter tests:** they use real ExcelJS round trips with no mocks of the reformatter, and cover en/cy headings, case and whitespace tolerance, reordered and extra columns, name and index fallback, empty sheets, typed cells, formula-like strings written as text, and invalid buffers.
- **Failure handling:** an Excel failure never blocks the PDF or notifications, and this is tested (`service.test.ts`, "should still generate the PDF and notify without an Excel…").
- **Clean checks:** lint and typecheck are clean, there is no new `any` in production code, and comments explain why.

## Test Coverage Assessment

- **Unit tests:** strong. All suites pass: common 290, rcj-standard 49, London Admin 54, CoA Civil 74, publication 423 and web 3,969 tests. The tests follow AAA, are realistic and use real workbooks. Missing: rich-text, hyperlink and formula cell values; hidden sheets, rows and columns, notes and metadata; formulas in unmapped columns. These match the CRITICAL and HIGH issues above.
- **E2E tests:** one `@nightly` journey was added. It covers upload, Axe on the summary and success pages, a Welsh check on the success page, the Excel download with header, time and extra-column assertions, and two Notify document links. It is not executable today because of `describe.skip` (`non-strategic-upload.spec.ts:73-74`) and also needs `GOVUK_NOTIFY_API_KEY`.
- **Accessibility tests:** there are no UI changes. Axe checks are inline in the E2E but skipped with it. Accessibility of the Excel (bold header row) is reasonable; see the freeze-pane suggestion.

**Statement coverage per changed workspace** (`npx vitest run --coverage` in each workspace):

| Workspace | Statements |
|---|---|
| apps/web | 95.57% |
| libs/publication | 95.01% |
| libs/list-types/common | 92.2% |
| libs/list-types/rcj-standard-daily-cause-list | 95.23% |
| libs/list-types/london-administrative-court-daily-cause-list | 90.47% |
| libs/list-types/court-of-appeal-civil-daily-cause-list | 94.44% |

All are above 80%.

## Acceptance Criteria Verification

- [x] **Excel and PDF downloadable files are made available as downloadable options for all RCJ hearing lists above**
  - All 10 lists without Excel are registered: `libs/publication/src/processing/service.ts:415-424`.
  - Civil and Family Daily Cause Lists already had Excel: `service.ts:392-393`.
  - PDFs were already registered: `service.ts:194-204`.
  - The CoA Civil upload is fixed: `court-of-appeal-civil-daily-cause-list-config.ts:83`.
  - Tests: `service.test.ts:1890-1907`.
  - Download: `flat-file-service.ts:85-108`.
  - Caveats: Excel is only produced for lists published through the non-strategic Excel upload (API JSON stays PDF-only, matching legacy). There is no executed E2E or manual check yet.
- [x] **The uploaded excel file will be re-used in providing the excel file for download**
  - `apps/web/src/pages/(admin)/non-strategic-upload-summary/index.ts:138,176` passes the upload through.
  - `service.ts:735-753` uses it.
  - `uploaded-workbook-reformatter.ts:9-26` reloads the uploaded buffer and modifies it in place.
  - Tested at `non-strategic-upload-summary/index.test.ts:625` and `uploaded-workbook-reformatter.test.ts:208-229`.
  - See CRITICAL 1 for how much of it is re-used.
- [~] **All the data fields available in the current downloadable PDF file should also be available on the excel downloadable file**
  - Met: all table columns are present, with PDF formatting and localised headings, including the CoA future-judgment Date. Evidence: `rcj-standard-daily-cause-list/src/excel/excel-reformatter.ts:9-16`, `court-of-appeal-civil-daily-cause-list/src/excel/excel-reformatter.ts:12-18`, `london-administrative-court-daily-cause-list/src/excel/excel-reformatter.ts:9-18`, and the per-lib tests.
  - **Missing:** the PDF header data (location, "List for" date, last updated date and time, data source). It is claimed to be out of scope but no sign-off is recorded. Rich-text or formula values also come out as `"[object Object]"` (HIGH 2).
- [x] **Links to download both file types are displayed in the email notifications**
  - `processPublication` passes `excelPath` to notifications: `service.ts:689-702`, tested at `service.test.ts:1975`.
  - The notification code finds the blob at `notification-service.ts:513` and picks the PDF+Excel template at `template-config.ts:38`.
  - The two links are set in `govnotify-client.ts:88-89`.
  - The E2E asserts two Notify links (`non-strategic-upload.spec.ts:353-358`) but has not run (skipped). This rests on unit tests at each step only.

**Tally:** 3 met, 1 partial, 0 unmet, out of 4.

## Next Steps

- [ ] Sanitise the reformatted workbook: drop hidden sheets, hidden rows and columns, cell notes and workbook properties. Decide, and record, whether unknown columns and sheets are published (CRITICAL 1).
- [ ] Replace formula cells in the output with cached values, and get Clarification 3 actually answered (HIGH 1).
- [ ] Make `readCellValue` handle rich text, hyperlinks, formulas and errors, with tests (HIGH 2).
- [ ] Record product owner sign-off on excluding the PDF header data, or add it (HIGH 3).
- [ ] Run and record the manual check on a lower environment from `tasks.md` (HIGH 4).
- [ ] Optionally address the suggestions, especially 1 (stale xlsx on other routes) and 3 (positional header bug).
- [ ] Re-run `yarn lint:fix`, typecheck and `yarn test`, then request a re-review.

## Overall Assessment

**NEEDS CHANGES**

The implementation is well structured, well tested and matches the plan, and coverage is high. It cannot ship as is: reusing the uploaded workbook currently publishes hidden sheets, hidden columns, cell notes and author metadata that the PDF never exposed, to subscribers and, for PUBLIC lists, to anyone. The fix is contained (a sanitising pass in `reformatUploadedWorkbook` plus tests). Together with the formula and rich-text handling, it should be a small follow-up rather than a redesign.
