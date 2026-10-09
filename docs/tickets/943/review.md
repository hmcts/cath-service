# Code Review: Issue #943

## Summary

#943 adds an Excel download for the 10 First-tier Tribunal list types in 5 libs: WPAFCC, Tax Chamber, Land Registration, SEND and the 6 RPT names. It reuses the stack's `reformatUploadedWorkbook` and `createUploadedExcelGenerator`. The change is small:

- 5 thin reformatters, at `libs/list-types/<lib>/src/excel/excel-reformatter.ts`. Each is a `{ worksheetIndex: 0, fields: <CONFIG>.fields, headers: t.tableHeaders, formatRow }` config. Four of them format `date` with `formatDdMmYyyyDate(row.date, locale)`. SEND passes rows through unchanged.
- 10 `EXCEL_GENERATOR_REGISTRY` entries, keyed by `listTypeName` (`libs/publication/src/processing/service.ts:491-500`). The 6 RPT names share one generator (`:433`). There is no JSON fallback.
- Per-lib tests, a `service.test.ts` block and one extra step in the skipped `@nightly` E2E journey.

The work matches the scope in plan.md §2. No pages, schema, notifications or shared code changed.

**What I checked, and how:**

- **Converter vs reformatter, sheet and headers.** All 5 converters use `createConverter`, so they call `convertExcelToJson`, which reads `workbook.worksheets[0]` (`libs/list-types/common/src/conversion/excel-to-json.ts:90`). The reformatter's `resolveWorksheet` with `worksheetIndex: 0` and no name picks `workbook.worksheets[0]` too (`multi-sheet-converter.ts:107`). Both sides match headers with the same `findFieldForHeader` and `readCellValue` on row 1. The summary page converts the same buffer it passes as `uploadedExcel` (`apps/web/src/pages/(admin)/non-strategic-upload-summary/index.ts:135-137`). So the reformatter never sees a tab or row the converter rejected.
- **Renderer and PDF template vs reformatter.** I read every `rendering/renderer.ts` and `pdf/pdf-template.njk`:
  - Column sets and template order match each config's `fields`.
  - Only `date` is transformed, by `formatDdMmYyyyDate(hearing.date, locale)`. SEND transforms nothing (`renderer.ts:32`).
  - No template sorts, filters or pipes the values.
  - `generateFttSiacWeeklyHearingListPdf` and `generateListPdf` pass `options.locale` straight to the renderer (`libs/list-types/common/src/pdf/pdf-utilities.ts:94-100,145-150`).
- **Throwaway script.** I ran a `tsx` script in `/tmp` (deleted afterwards) against the real code:
  - A real Excel `Date` cell gives `15 Ionawr 2026` in both the converter-plus-renderer output and the Excel.
  - A truly empty WPAFCC Additional information cell gives `""` on both sides.
  - A hidden first sheet is used by both sides. This is consistent, and the plan documents it.
  - `=1+1` in a mapped column is written as the text `'=1+1`.
  - A blank spacer row is kept (inherited, see below).
  - **Reordered upload columns are not put back into PDF order** (HIGH 1).
- **SEND (Private).** `getExcelForDownload` applies `isWithinDisplayWindow` and `canAccessPublicationData` with the artefact's own sensitivity (`libs/public-pages/src/flat-file/flat-file-service.ts:79-106`). That is the same check as the PDF and flat-file routes, so the endpoint does not leak SEND data. Notify links are a pre-existing, separate concern (Suggestion 4).
- **Failure path.** If the reformatter throws, `createUploadedExcelGenerator` catches it, deletes `<id>.xlsx` (`service.ts:418-427`) and returns `success: false`. `generatePublicationExcel` then logs `artefactId` and the message only (`service.ts:521-523`). The PDF and both notification calls still run. Both notification paths probe `${artefactId}.xlsx` through `buildEmailDataWithFiles` (`libs/notifications/src/notification/notification-service.ts:513,644-653`), so a deleted xlsx gives the PDF-only template.

## 🚨 CRITICAL Issues

None.

## ⚠️ HIGH PRIORITY Issues

1. **Excel column order follows the upload, not the PDF, so AC3 parity breaks for any upload with reordered columns**
   - **Where:** `mapColumnsToFields` pushes columns in the order the header cells appear in the source sheet (`libs/list-types/common/src/excel/uploaded-workbook-reformatter.ts:43-54`). The converter is order-independent: it looks fields up by header (`excel-to-json.ts:196-198`). The PDF template always prints the fixed `t.tableHeaders` order (for example `ftt-rpt-weekly-hearing-list/src/pdf/pdf-template.njk:31-39`).
   - **Evidence (throwaway script):** an RPT upload with `Time, Date, Venue, …` converts fine. The PDF row is `["15 January 2026", "10.30am", …]`. The Excel header row is `["Time", "Date", "Venue", …]` and its data row is `["10.30am", "15 January 2026", …]`.
   - **Why this is #943's problem:**
     - #943's plan says the output is "mapped in PDF order with the PDF's `t.tableHeaders`" (plan.md:248, and the "same order" column at plan.md:62-68).
     - The ticket spec AC says "in the same left-to-right order" as the PDF table.
     - #940–#942 explicitly chose to keep the upload's column order. #943's plan states the opposite, and nothing tests it. Every per-lib fixture uses the converter's own column order (for example `ftt-rpt-weekly-hearing-list/src/excel/excel-reformatter.test.ts:13-24`), so the parity tests cannot catch it.
   - **Impact:** FTT clerks' templates are hand-maintained. Tax and LRT validate headers case-insensitively but accept any order. A clerk who swaps two columns gets a PDF and an Excel with different layouts. The values are still under the right headings, so no data is wrong, but "row for row like the PDF" does not hold.
   - **Recommendation:** pick one of these and record the choice in plan.md:
     - (a) Sort `columns` by each field's index in `sheet.fields` before copying. This is a one-line change in the shared reformatter. Widths and styles still come from the source column. Check that RCJ, SSCS and Rolls Building accept the change.
     - (b) Keep the upload order as the series decision and correct plan.md:62-72,248.

     Either way, add a per-lib parity test with a reordered upload (for example `Time` before `Date`).

2. **None of the product decisions has sign-off, and one is visible to Welsh users**
   - **Where:** `tasks.md:276`: "Post CLARIFICATIONS 1–5 … proceeding on defaults; not posted".
   - **Why it matters for #943 specifically:**
     - **Clarification 1 (JSON).** The ticket spec has a scenario that requires Excel for a JSON `FTT_RPT_LONDON` publication. The implementation deliberately does not do this. The no-upload test locks that in (`libs/publication/src/processing/service.test.ts:2448-2459`). UAT that follows the spec will log it as a defect.
     - **Clarification 3 (Welsh headings).** A Welsh WPAFCC Excel has 7 of its 8 headings as `[WELSH TRANSLATION REQUIRED: 'Date']` and so on. I confirmed this in the script. Tax and LRT Welsh headings are English (`ftt-tax-chamber-weekly-hearing-list/src/locales/cy.ts:22-30`, `ftt-lands-registration-tribunal-weekly-hearing-list/src/locales/cy.ts:18-25`). This matches the Welsh PDF, so it is not a regression. But an Excel file is easier to forward and reuse, so placeholder text in it is more visible.
     - **Clarification 2 (Market Rents)** and **Clarification 4 (long-date text)** also have no sign-off.
   - **Recommendation:** post Clarifications 1–5 on issue #943 before merging and record the answers in plan.md §5. If Clarification 1 comes back "yes", that adds 5 JSON generators. Raise a separate Welsh-translation ticket for the WPAFCC, Tax and LRT `cy.tableHeaders` so the gap is tracked rather than hidden.

**Inherited from earlier reviews, not new. They also apply to FTT:**

- #942 HIGH 5: duplicate mapped headers. With two exact `Judge(s)` columns in RPT, the PDF shows the last one and the Excel shows the first. Headers that differ only in case behave the same on both sides: the script showed `Panel` and `panel` both giving `P1`.
- #942 HIGH 3: a stale xlsx survives if `deleteBlob` (`service.ts:425`) or the PDF list-type lookup throws on a republish.
- #942 Suggestion 1: blank spacer rows are kept. The script showed `rowCount` 4 with an empty row 3, while the conversion has 2 rows.
- #942 Suggestion 2: `fill` and `numFmt` are copied from the upload.
- #940 HIGH 4 / #942 HIGH 6: nothing has run end to end. STEP 8 is inside `test.describe.skip` (`e2e-tests/tests/admin/non-strategic-upload.spec.ts:270-271`), and the lower-environment check (`tasks.md:336-342`) is still open.

## 💡 SUGGESTIONS

1. **The Tax and LRT "Welsh headings" tests cannot fail on a locale bug.** In both libs `cy.tableHeaders` equals `en.tableHeaders`. So `should write the Welsh headings for the cy locale` (for example `ftt-tax-chamber-weekly-hearing-list/src/excel/excel-reformatter.test.ts:81-90`) would pass even if the reformatter always used `en`. The long-date test does prove that `locale` reaches `formatRow`. Either say in the test name that the headings are not yet translated, or add a header check that compares against `cy` by object identity. Without this, nothing catches a regression in heading selection until the translations land.
2. **Derive `FIELD_ORDER` from the PDF template rather than copying it.** Each test hard-codes the column order (for example `ftt-rpt-weekly-hearing-list/src/excel/excel-reformatter.test.ts:12`). Instead, render `pdf-template.njk` with `createTestEnvironment` and read the `<th>` texts. Then a template change, such as a new column, fails the Excel test automatically, which is the "caught by the parity test" guarantee the spec wanted.
3. **Optional DRY.** Four reformatters are the same apart from the config and locale imports. A small `createLongDateReformatter(config, en, cy)` in `@hmcts/list-types-common` would remove about 40 lines. This is optional: the current files are easy to read, and the duplication follows the SSCS and RCJ pattern.
4. **SEND (Private) and Notify bearer links (pre-existing, follow-up).** `prepareUpload` uses `confirmEmailBeforeDownload: false` for both files (`libs/notifications/src/govnotify/govnotify-client.ts:73-76,84-87`). Anyone a SEND email is forwarded to can download the data. This was already true for the PDF, and #943 adds a second, more reusable copy. Consider `confirmEmailBeforeDownload: true` for Private and Classified artefacts in a separate ticket.
5. **Spy cleanup in `service.test.ts`.** `consoleWarnSpy.mockRestore()` runs after the assertions (`service.test.ts:2478-2505`). If an assertion fails, the spy leaks into later tests. Use `afterEach(() => vi.restoreAllMocks())` or `try/finally`.
6. **Test-type checking.** Every lib `tsconfig.json` excludes `*.test.ts` and vitest does not typecheck, so the tuple typing in `FTT_CASES` (`service.test.ts:2349`) is never checked. This is not a #943 defect, but worth knowing when relying on "no `as any`".

## ✅ Positive Feedback

- Everything is keyed on `listTypeName`. Fixtures use `listTypeId: 999`, and no numeric IDs appear in code or comments.
- The registry test derives the 10 names from `listTypeData` by `urlPath` and compares a sorted copy against the case list (`service.test.ts:2424-2427`). A missing RPT region, or a new FTT name added to the data without registration, fails the test. This is not tautological.
- The per-lib parity tests use the real converter and the real renderer as the oracle, with no mocks of `@hmcts/list-types-common`. They cover en and cy, the long Welsh date (`15 Ionawr 2026`), times left as uploaded (`10.30am`), `rowCount`, dropping the extra sheet and the extra column, and WPAFCC's reachable empty optional field. This is a real improvement on #941's unreachable empty-field test.
- The failure path is tested through `processPublication`: the stale xlsx is deleted, the PDF is still generated, the warning is logged with `artefactId` and the message only, and notifications get `excelPath: undefined`.
- The plan corrected the spec where the spec was wrong about the code: `dd/MM/yyyy` vs the long date, "LANDS" vs "LAND", and no `shortSheetName` keys needed.
- The RPT reformatter is shared correctly. Nothing region-specific is in the table, and one generator instance serves all 6 names.
- `exceljs` is a pinned devDependency (`4.4.0`) that matches the rest of the repo. Imports use `.js`. Biome is clean on the changed files, and `tsc --noEmit` passes in all 6 workspaces.

## Test Coverage Assessment

- **Unit tests:** good. They test real behaviour (see Positive Feedback). Gaps: reordered columns (HIGH 1), Tax and LRT heading locale (Suggestion 1), and no rich-text or formula cell in a mapped column at the FTT level. The shared reformatter tests cover that last mechanism.
- **E2E tests:** one Welsh RPT London step (`non-strategic-upload.spec.ts:586-609`) checks the `cy` headings, `15 Ionawr 2026`, that the extra column is dropped, and that both email links are present. The whole suite is `test.describe.skip`, so it gives no executed evidence (inherited).
- **Accessibility:** no pages changed. The workbook has one table per sheet, bold headings in row 1 and a frozen header (inherited). Spacer rows are inherited (#942 Suggestion 1).

**Statement coverage per changed workspace** (`npx vitest run --coverage` in each workspace; every new `excel-reformatter.ts` is at 100%):

| Workspace | Statements | Tests |
|---|---|---|
| `@hmcts/wpafcc-weekly-hearing-list` | 95.23% | 34 passed |
| `@hmcts/ftt-tax-chamber-weekly-hearing-list` | 100% | 38 passed |
| `@hmcts/ftt-lands-registration-tribunal-weekly-hearing-list` | 100% | 37 passed |
| `@hmcts/send-daily-hearing-list` | 100% | 33 passed |
| `@hmcts/ftt-rpt-weekly-hearing-list` | 100% | 48 passed |
| `@hmcts/publication` | 95.9% | 538 passed |

All workspaces are above 80%.

## Acceptance Criteria Verification

- [x] **Excel and PDF downloadable files are made available as downloadable options for all the First Tier Tribunal hearing lists above**
  - Met under the Excel-uploads-only decision. All 10 names are in `EXCEL_GENERATOR_REGISTRY` (`libs/publication/src/processing/service.ts:491-500`), and the PDFs were already registered (`service.ts:199,271-316`). The Excel is served by `getExcelForDownload` (`libs/public-pages/src/flat-file/flat-file-service.ts:79-106`).
  - Tests: `service.test.ts:2424-2446`.
  - JSON publications are PDF-only by design. The sign-off is outstanding (HIGH 2).
- [x] **The uploaded excel file will be re-used in providing the excel file for download**
  - Met as decided: a cleaned copy of the upload, not the raw file. `uploadedExcel` (`non-strategic-upload-summary/index.ts:137,175`) goes to `createUploadedExcelGenerator` (`service.ts:407-430`), which calls the per-lib reformatter (for example `ftt-rpt-weekly-hearing-list/src/excel/excel-reformatter.ts:6-18`).
  - The uploaded sheet name is kept and the extra sheet and column are dropped (`excel-reformatter.test.ts:133-145` in each lib).
- [~] **All the data fields available in the current downloadable PDF file should also be available on the excel downloadable file**
  - **Done:** every PDF table column is a converter field, with the PDF's `t.tableHeaders` and the PDF's value formatting. That means the long localised date for 4 libs and raw values for SEND (`excel-reformatter.ts:10-17`). Parity is tested against the real renderer for en and cy (`excel-reformatter.test.ts:103-115`). Table fields only is the series decision.
  - **Missing:** column order matches the PDF only when the upload already uses PDF order (HIGH 1).
- [x] **Links to download both file types are displayed in the email notifications**
  - `processPublication` passes `excelPath` (`service.ts:754`; test at `service.test.ts:2461-2476`). `buildEmailDataWithFiles` probes `${artefactId}.xlsx` for both subscription paths (`notification-service.ts:513,644-653`) and picks the PDF+Excel template.
  - The E2E check is `expectPdfAndExcelLinksInEmail(fttRptArtefactId)` (`non-strategic-upload.spec.ts:609`), which is skipped.

**Tally:** 3 met, 1 partial, 0 unmet, out of 4.

## Next Steps

- [ ] Fix HIGH 1: order the output columns by field order, or record the upload-order decision and correct plan.md. Either way, add a reordered-column parity test.
- [ ] Fix HIGH 2: post Clarifications 1–5 on #943 and record the answers. Raise the Welsh `tableHeaders` ticket for WPAFCC, Tax and LRT.
- [ ] Optional: Suggestions 1, 2 and 5 (test quality), and 4 (Notify follow-up for Private lists).
- [ ] Inherited: follow up #942 HIGH 3 and HIGH 5 in the stack. Run the lower-environment check in `tasks.md:336-342`, including "SEND's Excel is not downloadable without access".
- [ ] Re-run `yarn lint:fix`, typecheck and `yarn test`, then request a re-review. Merge after #1122, #1129 and #1133.

## Overall Assessment

**NEEDS CHANGES** (advisory).

The implementation is small, correct for uploads in PDF column order, and well tested against the real converter and renderer. Coverage is above 95% in every changed workspace. There are no critical issues. The verdict comes from AC3 being only partly met: a reordered upload gives an Excel whose columns differ from the PDF, which contradicts #943's own plan and is untested. The product decisions also still need sign-off. Both are quick to resolve.
