# Code Review: Issue #941

## Summary

#941 adds an Excel download for the two Rolls Building lists, `BUSINESS_AND_PROPERTY_DIVISION_ROLLS_BUILDING_DAILY_CAUSE_LIST` and `INTERIM_APPLICATIONS_DAILY_CAUSE_LIST`. It reuses #942's allow-list reformatter (`reformatUploadedWorkbook`), so the upload is copied into a new workbook with only the PDF's table columns. The change is small and does what plan.md §5 decided:

- `ReformatSheetConfig` gets `matchByNameOnly`, which is passed to `resolveWorksheet` (`libs/list-types/common/src/excel/uploaded-workbook-reformatter.ts:22,103-104`). This closes #942 review HIGH 4 for Business and Property.
- Each lib gets a new `excel/excel-reformatter.ts`, exported from its `index.ts`.
- Two `EXCEL_GENERATOR_REGISTRY` entries are added, keyed on `listTypeName`, with no JSON fallback (`libs/publication/src/processing/service.ts:471-474`).
- The B&P converter now builds its sheet locators from an exported `BUSINESS_AND_PROPERTY_SHEETS`. The converter and the reformatter share it, so they cannot drift (`.../conversion/business-and-property-division-rolls-building-daily-cause-list-config.ts:37-44`).
- Unit tests use real ExcelJS. The skipped `@nightly` E2E journey is extended.

What I checked:
- **Columns:** I compared the Excel output against both `pdf-template.njk` files and both renderers. The 7 columns, the headings (`t.tableHeaders`, en and cy) and the value formatting match. B&P uses `normaliseHearing` in both the Excel and the renderer (`rendering/renderer.ts:37`). Interim has no formatting in either (`rendering/renderer.ts:53`).
- **Sheet matching:** `matchByNameOnly` is the same in the B&P reformatter and its converter. The Interim converter does not use the option, and neither does its reformatter.
- **Other lists:** No other reformatter caller sets the new flag (RCJ, London Admin, CoA Civil, SSCS), so their behaviour is unchanged.
- **Checks:** Biome is clean, `tsc --noEmit` passes for all 4 workspaces, and all tests pass.

## 🚨 CRITICAL Issues

None.

Data protection: what the Excel can contain is limited by the allow-list copy. That is a sheet resolved by the converter's own rules, header row 1, and only the mapped columns' values, read with the same `readCellValue` the converter uses and written through `sanitiseCellValue` (`uploaded-workbook-reformatter.ts:74-80`). The Interim "Open Justice Statement Details" tab, extra tabs, hidden tabs, unmapped columns, notes, metadata and formulas are not copied, and tests cover this. Formula/CSV injection is handled by `sanitiseCellValue`. The failure path logs only `artefactId` and the error message (`service.ts:504`). The only error the reformatter throws is the fixed string "No recognised worksheet to reformat", so no cell content reaches the logs.

## ⚠️ HIGH PRIORITY Issues

None introduced by #941.

Inherited and still open in #942. They apply to these two lists as well, but #942 is the right place to fix them. plan.md §3 records this decision:
1. Duplicate mapped headers. The converter keeps the last such column, because `rowData[header]` overwrites in `excel-to-json.ts` around line 107. The reformatter keeps the first (`uploaded-workbook-reformatter.ts:48`). So the Excel could show a different column from the PDF (#942 review HIGH 5).
2. Republish when the blob delete or the list type lookup fails: a stale xlsx can survive (#942 review HIGH 3).

## 💡 SUGGESTIONS

1. **Test for a case the converter rejects.** `.../business-and-property-division-rolls-building-daily-cause-list/src/excel/excel-reformatter.test.ts:170-182` ("should write an empty additional information cell as an empty string"). `STANDARD_CONFIG` marks `additionalInformation` as `required: true` (`conversion/...-config.ts:21-25`). That upload would be rejected at upload time, so it can never reach the reformatter. The test passes, but it suggests that empty additional information is a supported case. Either drop it, or replace it with a test that uses a real `formatRow` effect, such as `"9.45am"` becoming `"9:45am"`.
2. **One source for the name-only option.** `true` is hard-coded in `excel/excel-reformatter.ts:15` and again in `conversion/...-config.ts:44`. Export one constant (for example `BUSINESS_AND_PROPERTY_CONVERTER_OPTIONS = { matchByNameOnly: true } as const`) and use it in both places. Then the two cannot drift, which is exactly the bug this ticket fixed in the shared code.
3. **Share the Interim sheet locator in the same way.** `interim-applications-daily-cause-list/src/excel/excel-reformatter.ts:11` hard-codes `"Hearing List"` / `0`, a copy of the converter at `conversion/interim-applications-daily-cause-list-config.ts:55`. Exporting the hearing `SheetConfig` would follow the B&P pattern.
4. **Interim positional fallback is untested.** The Interim converter accepts a hearings tab that is not named "Hearing List" by falling back to index 0, and the reformatter does the same. No test covers this (for example, a single "Sheet1" tab). A short parity test would lock it in.
5. **Interim email links are not checked in E2E.** STEP 7 (`e2e-tests/tests/admin/non-strategic-upload.spec.ts:528-549`) checks the workbook but does not call `expectPdfAndExcelLinksInEmail(interimArtefactId)`. STEP 6 does (line 526). Only unit tests cover AC4 for Interim.
6. **Small test-code points.**
   - `service.test.ts:2242` calls `ROLLS_BUILDING_LIST_TYPES.sort()`, which mutates a shared `const`. Use `[...x].sort()` or `toSorted()`.
   - The three new `{ name: listTypeName } as any` casts (`service.test.ts:2268,2286,2308`) follow the 49 that were already in the file. `as Awaited<ReturnType<typeof prisma.listType.findUnique>>` would avoid `any`.
   - The E2E `getWorksheet(...) as ExcelJSPkg.Worksheet` casts (lines 521, 539) could use the existing `downloadReformattedWorksheet` helper instead, which throws if the sheet is missing.
7. **Inherited display gaps, worth a #942 follow-up.**
   - `copyWorksheet` clones each source cell's `style`, including `numFmt` and font colour (`uploaded-workbook-reformatter.ts:76`). A mapped column formatted `;;;` or in white text would show in the PDF but look empty in the Excel.
   - Blank source rows keep their row numbers (`target.getRow(rowNumber)`, line 68), so the Excel can have gaps that the PDF does not.
   - Neither leaks data, but both affect whether "the Excel matches the PDF".

## ✅ Positive Feedback

- The plan was checked against the real merged code (#966). It corrected the spec's wrong `listTypeName`s and paths, and it found the `matchByNameOnly` gap before any code was written. That gap would otherwise have let an unnamed "Notes" tab with section headers be published.
- The shared-code change is as small as it can be, and it is backward compatible: the flag is optional and defaults to the old behaviour. Tests cover both settings and the "no tab matches" case (`uploaded-workbook-reformatter.test.ts:244-286`).
- The parity tests compare the reformatter output with the converter's real output: `convertExcelForListTypeName` plus `normaliseHearings` for B&P (`excel-reformatter.test.ts:135-153`), and the converter's `hearingList` for Interim. This is the right way to prove AC3.
- Interim asserts that the time is not reformatted (`10.30am` stays as uploaded). That matches the renderer, rather than reusing the B&P normaliser.
- The registry test finds the list types by `urlPath` in `listTypeData`. So a misspelt registry key would fail the test rather than fail silently. Fixtures use `listTypeId: 999`.
- The failure path is covered end to end: the stale xlsx is deleted, the PDF and the PDF-only notification still go out, and the logged payload has no cell content.
- CLAUDE.md conventions are followed: `.js` imports, listTypeName only, comments that explain why, and no new exports made only for tests. `BUSINESS_AND_PROPERTY_SHEETS` is used by production code in two modules.

## Test Coverage Assessment

- **Unit tests:** Good. All use AAA, real ExcelJS round trips, and no mocks of `@hmcts/list-types-common`. They cover English and Welsh bold headings, tab allow-listing (extra, hidden and open-justice tabs dropped), the dropped unmapped column, a kept header-only tab, row parity with the converter, rejection when no tab matches, and the publication registry, success, no-upload and failure paths. Gaps: suggestions 1 and 4.
- **E2E tests:** The `@nightly` journey is extended with a B&P English upload (tab names, headings, normalised time, dropped tab and column, two Notify links) and an Interim Welsh upload. It is still inside `test.describe.skip` (`non-strategic-upload.spec.ts:236-237`) until SSO is re-enabled. This was a planned decision (#940 and #942 did the same), but it means nothing has been verified end to end yet. The lower-environment check in tasks.md §6 is the real gate.
- **Accessibility tests:** Not applicable. No pages, templates or routes were added or changed. The download goes through the existing email and the `/api/flat-file/:artefactId/download?format=excel` endpoint.
- **Statement coverage** (`yarn workspace <name> test --coverage`):
  - `@hmcts/list-types-common`: **93.91%** (`uploaded-workbook-reformatter.ts` 100% statements, 95.83% branches)
  - `@hmcts/business-and-property-division-rolls-building-daily-cause-list`: **97.4%** (`excel/excel-reformatter.ts` 100% statements and branches)
  - `@hmcts/interim-applications-daily-cause-list`: **96.22%** (`excel/excel-reformatter.ts` 100% statements and branches)
  - `@hmcts/publication`: **95.68%** (`processing/service.ts` 93.65%)
  - All are above 80%. Branch coverage in the two list-type libs (75% and 66.66%) is low, but the gaps are in older code: `pdf-generator.ts` error branches and `summary-builder.ts`.

## Acceptance Criteria Verification

- [x] **Excel and PDF downloadable files are made available as downloadable options for all Rolls Building hearing lists above.** Met. Both list types are registered at `libs/publication/src/processing/service.ts:471-474`, and the PDFs were already registered. The xlsx is served by the existing flat-file endpoint (`libs/public-pages/src/flat-file/flat-file-service.ts:96-106`). Covered by `service.test.ts:2245-2262`. The ticket spec's web download journey was superseded in plan.md §1.
- [x] **The uploaded excel file will be re-used in providing the excel file for download.** Met as decided (a cleaned copy, not the raw file). The upload buffer is passed as `uploadedExcel` (`apps/web/src/pages/(admin)/non-strategic-upload-summary/index.ts:137,175`) to `createUploadedExcelGenerator` (`service.ts:401-402`). That reloads it and copies the resolved section tabs with their uploaded names, column widths, row heights and cell styles (`uploaded-workbook-reformatter.ts:21-34,56-82`). Tab names and order are tested at B&P `excel-reformatter.test.ts:99-108`.
- [x] **All the data fields available in the current downloadable PDF file should also be available on the excel downloadable file.** Met as decided (table fields only, and the Interim open-justice tab is excluded). The 7 fields come from the converter's own `FieldConfig`s (B&P `excel/excel-reformatter.ts:16`, Interim `excel/excel-reformatter.ts:11`). The headings come from the same `t.tableHeaders` as `pdf-template.njk:45-51` (B&P) and `pdf-template.njk:36-42` (Interim). Values use the PDF's formatting. Parity is tested at B&P `excel-reformatter.test.ts:135-153` and Interim `excel-reformatter.test.ts:82-96`.
- [x] **Links to download both file types are displayed in the email notifications.** Met. `processPublication` sets `excelPath` and passes it to notifications (`service.ts:747,762`, tested at `service.test.ts:2264-2282`). The notification side probes `${artefactId}.xlsx` (`libs/notifications/src/notification/notification-service.ts:513`) and picks the PDF+Excel template (`libs/notifications/src/govnotify/template-config.ts:39-42`). The E2E check is at `non-strategic-upload.spec.ts:526` (B&P only, and the suite is skipped).

Tally: 4 met, 0 partial, 0 not met.

## Next Steps

- [ ] Optional: replace or remove the unreachable empty-additional-information test (Suggestion 1)
- [ ] Optional: use one constant for B&P `matchByNameOnly`, and export the Interim hearing sheet locator (Suggestions 2 and 3)
- [ ] Optional: add an Interim positional-fallback parity test and an Interim email-link assertion in E2E (Suggestions 4 and 5)
- [ ] Record the resolved decisions (plan.md §5) on issue #941 (tasks.md §0, not done by design)
- [ ] Tell the #942 owner that `matchByNameOnly` support has landed in #941 (closes #942 review HIGH 4), and follow up on inherited HIGH 3 and HIGH 5
- [ ] After #1122 and #1129 are deployed, run the lower-environment check in tasks.md §6 (hidden tab, extra tab, note, formula, extra column; both links in the email; xlsx matches the PDF row for row; a JSON republish removes the xlsx)
- [ ] Merge only after #1122 and #1129

## Overall Assessment

**APPROVED** (advisory). No critical or high-priority issues were introduced. All four acceptance criteria are met under the plan.md §5 decisions, and coverage is above 80% in every changed workspace. The remaining items are small test-quality and maintainability suggestions, plus #942 items that still need fixing there.
