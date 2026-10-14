# Code Review: Issue #935

Excel download for the Upper Tribunal hearing lists (uncommitted changes on `feature/935-ut-excel-downloads`).

## Summary

The change adds one shared helper, `generateFlatListExcel`, to `@hmcts/list-types-common`. Six thin per-list wrappers in the five UT list-type libs call it, and nine new `EXCEL_GENERATOR_REGISTRY` entries in `libs/publication/src/processing/service.ts` are keyed by `listTypeName`. No changes were needed to notifications, download endpoints, helm or `apps/`. The existing pipeline picks up `<artefactId>.xlsx` from the `publications` container. I traced this through the code and the user confirmed it with local end-to-end testing.

The code is small, consistent and type-safe. It follows CLAUDE.md conventions: `listTypeName` not `listTypeId`, `.js` imports, consts at the top and interfaces at the bottom, and no `any` in source. It is well tested: every new source file has 100% statement coverage. Every Excel column set matches its PDF template and converter config in content and order.

The open problems are about requirements, not code. Two acceptance criteria rely on interpretations that the PO has not yet confirmed (plan.md Clarifications 1 and 2, still unchecked in tasks.md):
- AC2: the original upload is not re-used; a fresh workbook is generated instead.
- AC3: the PDF's header and footer metadata is not in the Excel.

Verification performed:
- `vitest run --coverage` in all 7 changed workspaces: all pass (930 tests).
- `biome check` on all changed source dirs: clean (148 files, no issues).
- `tsc --noEmit` in all 7 workspaces: no errors.
- Column order checked by hand against every `pdf-template*.njk` and `*-config.ts` converter.

## 🚨 CRITICAL Issues

None.

## ⚠️ HIGH PRIORITY Issues

1. **AC2 is only partially met: the uploaded Excel is not re-used** (PO decision outstanding)
   - **Where**: `libs/list-types/common/src/excel/flat-list-excel-generator.ts:6-27` builds a new workbook from the converted JSON. `docs/tickets/935/tasks.md` (last item) shows "Resolve the CLARIFICATIONS NEEDED" as not done.
   - **Impact**: The AC says "The uploaded excel file will be re-used". The implementation produces a workbook with the same columns, in the same order, as the upload template, but it is not the uploaded file. The reasoning in plan.md section 1 is sound: the original is deliberately discarded, JSON uploads have no Excel, and passing admin files through to the public is a security risk. But it is still a reinterpretation of the AC that nobody has signed off.
   - **Recommendation**: Get explicit PO sign-off on Clarification 1 and record it in the ticket before merging. No code change is needed if the PO accepts it. If the PO insists on the original file, the change belongs in the non-strategic upload summary controller, not in this lib code.

2. **AC3 is only partially met: PDF metadata fields are not in the Excel** (PO decision outstanding)
   - **Where**: For example, `libs/list-types/upper-tribunal-tax-and-chancery-chamber-daily-hearing-list/src/pdf/pdf-template.njk:11-16` and `:59-66` render the list title, "List for" date, "Last updated" date/time, the data source (provenance) and caution notes. The Excel wrappers (e.g. `.../src/excel/excel-generator.ts:11-16`) call the renderer but throw away `header` and use only `hearings`.
   - **Impact**: The AC says "All the data fields available in the current downloadable PDF file". Every hearing-table field is present. The hearing date, last-updated timestamp and data source are not, and those are arguably data rather than boilerplate. Without the list date in the file, a downloaded spreadsheet doesn't say which day it covers (the filename is just `<artefactId>.xlsx`). This matches earlier Excel tickets (Magistrates, Civil and Family), but Clarification 2 is still open.
   - **Recommendation**: Get the PO decision on Clarification 2. If metadata is needed, add an optional `metadataRows` (or title/date rows above the header) to `generateFlatListExcel` and pass `header.listTitle` / `header.listForDate` / `header.lastUpdatedDate` from the renderer output that the wrappers already compute. That would be a single change in one place.

## 💡 SUGGESTIONS

1. **The registry mapping for each list type isn't tested, so a London/regional mix-up would go unnoticed.** `libs/publication/src/processing/service.test.ts:1714-1730` only asserts `listTypeHasExcel(name) === true`, and the only `processPublication` cases (`:1344`, `:1375`) cover UTCC and JR London. If `UTIAC_JR_LEEDS_DAILY_HEARING_LIST` were wired to the London generator, which has a different column set, all tests would still pass. Add an `it.each` over `[listTypeName, expectedGeneratorMock]` that calls `generatePublicationExcel` and asserts the right mock was called.

2. **The renderer runs outside the helper's try/catch.** In every wrapper (e.g. `upper-tribunal-tax-and-chancery-chamber-daily-hearing-list/src/excel/excel-generator.ts:11`) the render call comes before `generateFlatListExcel`. If it throws (malformed `jsonData`), the wrapper rejects instead of returning `{ success: false }`. `generatePublicationExcel` (`libs/publication/src/processing/service.ts:457-460`) catches the rejection, so nothing breaks, and the test at `service.test.ts:1375` proves it. Still, the wrapper's `Promise<FlatListExcelResult>` contract is inconsistent. Optional: wrap the body in try/catch, or accept the current behaviour knowingly.

3. **Re-uploads can leave a stale Excel attached to the email** (pre-existing, cross-cutting). `buildEmailDataWithFiles` (`libs/notifications/src/notification/notification-service.ts:513`) always downloads `<artefactId>.xlsx`. The `excelPath` passed from `processPublication` is never read by notifications; it is only declared in `libs/notifications/src/notification/validation.ts:21`. On an `isUpdate` re-upload where Excel generation fails, the previous version's workbook would be emailed and downloadable alongside the new PDF. This affects every Excel list type, not only UT, and is unlikely in practice. Worth a follow-up ticket: either honour `excelPath` in notifications, or delete the stale blob when generation fails.

4. **Formula-injection guard is incomplete** (pre-existing). `sanitiseCellValue` (`libs/list-types/common/src/excel/excel-utilities.ts:5`) covers `= + - @` but not a leading tab (`\t`) or carriage return (`\r`), which OWASP also lists. Risk is low because ExcelJS writes string cells, not formulas, and the converters already reject HTML. It only matters if a user re-saves the file as CSV. Consider adding both characters in a separate change.

5. **Exported types that nothing uses** (YAGNI). `FlatListExcelColumn` and `FlatListExcelOptions` are exported from `libs/list-types/common/src/index.ts:32-33`, but nothing outside the helper file imports them; only `FlatListExcelResult` is used. Drop the two unused exports, or keep them deliberately as the helper's public API.

6. **Duplicated test helpers.** `loadWorksheet()` and `rowValues()` appear word-for-word in 7 test files (e.g. `flat-list-excel-generator.test.ts:22-35`, `upper-tribunal-tax-and-chancery-chamber-daily-hearing-list/src/excel/excel-generator.test.ts:46-59`). Consider moving them into `@hmcts/test-support` (e.g. `readUploadedWorksheet`).

7. **Minor test style.**
   - `expect(worksheet.name.length).toBeLessThanOrEqual(31)` (e.g. UTCC test `:138`) is redundant next to the exact `toBe("...")` check on the line above.
   - New `service.test.ts` cases use `as any` for `prisma.listType.findUnique` (`:1347`, `:1379`). This matches 40+ existing uses in the file, so it is consistent, but it is still an `any`.

8. **Undeclared test dependencies** (consistent with earlier Excel libs). The UT libs' tests import `exceljs` and mock `@hmcts/azure-blob`, but neither is in their `package.json`; they resolve through hoisting. Civil, Family and Magistrates do the same, so this is not a regression. Declaring them as `devDependencies` would make turbo's dependency graph accurate.

9. **No E2E test.** `e2e-tests/tests/api/subscription-notifications.spec.ts:537` has a nightly SJP "PDF and Excel with both download links in email" test. A matching `@nightly` journey for one UT list (e.g. UTCC) would guard the end-to-end path that was only checked manually. The Magistrates and Civil and Family Excel tickets didn't add one either, so this is optional.

10. **Welsh placeholders will appear in Welsh-language Excel files.** UTIAC JR and UTIAC SA `cy.ts` table headers are still `[WELSH TRANSLATION REQUIRED: ...]` (e.g. `libs/list-types/utiac-jr-daily-hearing-list/src/locales/cy.ts:17-23,43-48`, `libs/list-types/utiac-statutory-appeal-daily-hearing-list/src/locales/cy.ts:21-24`). This is the same as the existing Welsh PDF and is tracked as Clarification 4, so it is not blocking.

## ✅ Positive Feedback

- **Good DRY decision.** One 27-line helper replaces what would have been nine copies of about 40 lines each. Placing it in `list-types-common` rather than `upper-tribunal-common` is correct, because the UTIAC libs don't depend on the latter.
- **One source of truth for headers and data.** Headers come from the same `t.tableHeaders` / `londonTableHeaders(Cy)` keys as the PDF, and rows come from the same renderer. The PDF and Excel can't drift apart, and the Welsh headers stay in step with the English ones automatically.
- **Column order is right everywhere.** I checked each wrapper against its `pdf-template*.njk` and converter config:
  - UTCC: 8 columns
  - UTLC: 9 columns, including `modeOfHearing` in position 8
  - UTAAC: 8 columns
  - UTIAC SA: 8 columns
  - JR regional: 7 columns
  - JR London: 8 columns
- **Correct registry keys.** All nine `listTypeName` entries are present (`libs/publication/src/processing/service.ts:401-410`). The four regional JR names correctly share the regional generator, and London uses its own. No numeric IDs appear anywhere, and test fixtures use `listTypeId: 999`.
- **Defensive helper.**
  - `value ?? ""` before `sanitiseCellValue` avoids the `undefined[0]` crash.
  - Sheet names are truncated to 31 characters, and every constant is already within that limit (the longest is "UTIAC Judicial Review London", 28 characters).
  - Errors are returned as `{ success: false, error }` with no personal data. The caller logs only `artefactId` and the error message.
- **Excel failure doesn't affect the PDF or the emails.** This is proven by `service.test.ts:1375-1406`.
- **Good tests.** They follow AAA, read the real ExcelJS buffer back rather than asserting on mocks, test English and Welsh headers, and check exact cell values per row.
- **Accurate documentation.** tasks.md honestly records which manual checks are only partly done.

## Test Coverage Assessment

- **Unit tests**: All pass.
  - `@hmcts/list-types-common`: 266 tests
  - UTCC: 52
  - UTLC: 51
  - UTAAC: 50
  - UTIAC SA: 29
  - UTIAC JR: 75
  - `@hmcts/publication`: 407

  Every new source file (`flat-list-excel-generator.ts` and the six `excel-generator*.ts`) has 100% statement coverage; they are hidden by the reporter's skip-full setting. The only gap is the per-name registry mapping (Suggestion 1).
- **E2E tests**: None added. There is a precedent for an Excel email E2E (SJP) but none for the most recent Excel tickets. The user's manual local end-to-end test (email with PDF and Excel links, every UT mock file converted and validated) partly covers this. Optional (Suggestion 9).
- **Accessibility tests**: N/A. There are no pages, templates or UI changes. The output is a downloadable `.xlsx` and the existing email templates.
- **Statement coverage per changed workspace**:
  - `libs/list-types/common`: 88.52%
  - `libs/list-types/upper-tribunal-tax-and-chancery-chamber-daily-hearing-list`: 100%
  - `libs/list-types/upper-tribunal-lands-chamber-daily-hearing-list`: 100%
  - `libs/list-types/upper-tribunal-administrative-appeals-chamber-daily-hearing-list`: 100%
  - `libs/list-types/utiac-statutory-appeal-daily-hearing-list`: 82.69%. Above 80%. The gap is the existing `conversion/utiac-sa-config.ts` (30%) and `pdf/pdf-generator.ts` (86.66%), not new code.
  - `libs/list-types/utiac-jr-daily-hearing-list`: 92.72%
  - `libs/publication`: 93.39% (`processing/service.ts`: 88.26%)
- **Lint**: `biome check` on all changed source dirs is clean.
- **Typecheck**: `tsc --noEmit` is clean in all seven workspaces.

## Acceptance Criteria Verification

- [x] **Excel and PDF downloadable files are made available as downloadable options for all the Upper Tribunal hearing lists**
  - Excel generators are registered by `listTypeName` for all 9 UT list types at `libs/publication/src/processing/service.ts:401-410`, next to the existing PDF registry entries at `service.ts:304-342`.
  - `processPublication` sets `excelPath` at `service.ts:682-694`.
  - The existing endpoint serves the blob with display-window and access checks: `libs/public-pages/src/flat-file/flat-file-service.ts:81-108`.
  - Tests: `service.test.ts:1714-1730` and `:1344-1373`.
- [~] **The uploaded excel file will be re-used in providing the excel file for download**
  - Done: the generated workbook mirrors the upload template's columns and order. Compare `upper-tribunal-tax-and-chancery-chamber-daily-hearing-list/src/excel/excel-generator.ts:22-31` with `src/conversion/utcc-config.ts:6-49`, and the same for the other four libs. Content comes from the JSON converted from that upload.
  - Missing: the actual uploaded file is not re-used (`libs/list-types/common/src/excel/flat-list-excel-generator.ts:8-21` creates a new workbook). The PO has not confirmed this interpretation (plan.md Clarification 1; tasks.md last item unchecked).
- [~] **All the data fields available in the current downloadable PDF file should also be available on the excel downloadable file**
  - Done: every hearing-table column of every PDF template is present in the same order. Compare `.../upper-tribunal-tax-and-chancery-chamber-daily-hearing-list/src/pdf/pdf-template.njk:28-48` with `.../src/excel/excel-generator.ts:22-31`. The same holds for:
    - UTLC: `pdf-template.njk:28-50` vs `excel-generator.ts:22-32`
    - UTAAC: `:41-61` vs `:22-31`
    - UTIAC SA: `:30-50` vs `:24-31`
    - JR regional: `pdf-template.njk:29-47` vs `excel-generator.ts:24-30`
    - JR London: `pdf-template-london.njk:29-49` vs `excel-generator-london.ts:26-33`

    Tests assert headers and per-row values, e.g. `upper-tribunal-tax-and-chancery-chamber-daily-hearing-list/src/excel/excel-generator.test.ts:75-129`.
  - Missing: the PDF header and footer data is not in the Excel: list title, "List for" date, "Last updated" date/time, and data source (`pdf-template.njk:11-16,59-66`). PO decision pending (plan.md Clarification 2).
- [x] **Links to download both file types are displayed in the email notifications**
  - `libs/notifications/src/notification/notification-service.ts:513-534` downloads `<artefactId>.xlsx` regardless of how the email was triggered and selects the PDF+Excel template.
  - `libs/notifications/src/govnotify/govnotify-client.ts:83-89` sets `excel_link_to_file` / `excel_link_text`.
  - This covers location and case subscriptions (`service.ts:542-552`) and list-type subscriptions (`service.ts:565-577`). The list-type path does not pass `excelPath`, but it doesn't need to, because the blob is downloaded unconditionally.
  - The user manually tested this locally: the email contained both PDF and Excel links.

## Next Steps

- [ ] Get PO sign-off on plan.md Clarification 1 (generated workbook instead of the original upload) and record it on the ticket.
- [ ] Get the PO decision on Clarification 2 (list date / last updated / data source in the Excel). If required, extend `generateFlatListExcel` with metadata rows.
- [ ] Confirm Clarification 3 (all 5 JR list types in scope; implemented) and Clarification 4 (Welsh placeholders).
- [ ] (Recommended) Add a per-name registry mapping test (Suggestion 1).
- [ ] (Optional) Follow-up ticket for the stale-Excel risk on re-upload (Suggestion 3) and the `\t`/`\r` guard (Suggestion 4).
- [ ] (Optional) Nightly E2E for one UT list's PDF+Excel email.
- [ ] Complete the STG manual check in tasks.md (upload, then `/api/flat-file/<id>/download?format=excel`, then the email).

## Overall Assessment

**NEEDS CHANGES** (advisory)

The code is ready to merge: it is correct, consistent, fully covered, and passes lint and typecheck. The verdict comes from the rules, because two ACs are partially met. In both cases the work is blocked on a PO decision rather than on a defect. If the PO accepts the plan's defaults for Clarifications 1 and 2, this becomes APPROVED with no code changes; Suggestion 1 is still recommended.
