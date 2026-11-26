# Tasks: #944 — Excel download for the remaining Tribunal hearing lists

## Implementation Tasks

### 0. Before coding
- [x] Clarifications settled against legacy PR #939 (no JSON fallback, table fields only, Welsh gaps in a separate ticket, long-form text dates); see plan.md §1 "Resolved decisions"
- [x] Confirm the branch `feature-944-tribunals-hearing-list` is at `f1521ded` (#941); keep it current by merging, not rebasing
- [x] Run `yarn install` and `yarn db:generate`, then check that lint, typecheck and `yarn test` pass on the base

### 1. Per-lib reformatters (pht, care-standards, siac-poac-paac, grc, cic, ast)
- [x] Add `"exceljs": "4.4.0"` to `devDependencies` in each of the six `package.json` files; run `yarn install`
- [x] Create `src/excel/excel-reformatter.ts` in each lib over `reformatUploadedWorkbook` with `worksheetIndex: 0` and the lib's converter `fields`:
  - [x] PHT `reformatPhtWeeklyHearingListExcel`: `t.tableHeaders`, long-form `date` via `formatDdMmYyyyDate(row.date, locale)`
  - [x] CST `reformatCareStandardsTribunalWeeklyHearingListExcel`: same as PHT
  - [x] SIAC/POAC/PAAC `reformatSiacPoacPaacWeeklyHearingListExcel`: same pattern, one function for all three list types
  - [x] GRC `reformatGrcWeeklyHearingListExcel`: same pattern
  - [x] CIC `reformatCicWeeklyHearingListExcel`: headers `{ ...t.tableHeaders, "venue/platform": t.tableHeaders.venuePlatform }`, long-form `date`
  - [x] AST `reformatAstDailyHearingListExcel`: `t.tableHeaders`, identity `formatRow`
- [x] Export each reformatter from its lib's `src/index.ts`
- [x] Create `src/excel/excel-reformatter.test.ts` in each lib (real ExcelJS, AAA, no mocks):
  - [x] English and Welsh bold headings equal `en` / `cy` `tableHeaders` in PDF order
  - [x] data rows equal the renderer output for `convertExcelForListTypeName(...)`, in `en` and `cy` (covers the Welsh long-form date)
  - [x] an extra "Internal notes" column and a second sheet are dropped; the uploaded sheet name is kept
  - [x] CIC: the Welsh venue heading is "Lleoliad/Platfform", not the uploaded "Venue/platform"
  - [x] GRC: empty optional `members` / `additionalInformation` give `""`
  - [x] AST: values, including `hearingTime`, are unchanged
  - [x] SIAC: the fixture converts for `SIAC_`, `POAC_` and `PAAC_WEEKLY_HEARING_LIST`

### 2. Publication registry (`libs/publication/src/processing/service.ts`)
- [x] Import the six reformatters
- [x] Add `siacPoacPaacUploadedExcelGenerator` next to `rcjStandardUploadedExcelGenerator`
- [x] Register the 8 `listTypeName`s in `EXCEL_GENERATOR_REGISTRY` with `createUploadedExcelGenerator(...)`, no JSON fallback
- [x] `service.test.ts`:
  - [x] add the reformatter export to the six existing `vi.mock` blocks
  - [x] the list types found by the six `urlPath`s are exactly the 8 expected names (non-mutating sort), and `listTypeHasExcel` is true for each
  - [x] with `uploadedExcel`: reformatted and saved, `excelPath` passed to notifications
  - [x] without it: stale xlsx deleted, reformatter not called, email PDF-only
  - [x] reformatter throws: stale xlsx deleted, PDF and notifications still go out, log has `artefactId` and message only
  - [x] fixtures use `listTypeId: 999`

### 3. E2E (`e2e-tests/tests/admin/non-strategic-upload.spec.ts`)
- [x] Extend and rename the existing `@nightly` Excel journey to include Tribunal lists:
  - [x] English GRC upload: English headings, long-form date, "Internal notes" dropped, two Notify links
  - [x] Welsh CIC upload: Welsh headings including "Lleoliad/Platfform", Welsh long-form date, two Notify links
  - [x] clean up artefacts, notifications, subscriptions and users in `finally`
- [x] Keep the suite inside `test.describe.skip` until the SSO specs are re-enabled

### 3b. Welsh content (GRC, SIAC/POAC/PAAC)
- [x] Copy legacy Welsh into `grc-weekly-hearing-list/src/locales/cy.ts` (page title, important information, table headings)
- [x] Copy legacy Welsh into `siac-poac-paac-weekly-hearing-list/src/locales/cy.ts` (all content except the search label)
- [x] SIAC locale tests: key parity, and no untranslated or placeholder table headings
- [x] Keep the SIAC/POAC/PAAC court-name keys as they were (English in both locales; never displayed). The PDF generator now reads the court name from the locale by `listTypeName` instead of `service.ts` hard-coding it
- [x] SIAC/POAC/PAAC PDF title from the locale by `listTypeName`, so the Welsh PDF gets the Welsh title; one generator in `service.ts` for all three
- [x] Welsh text keeps straight apostrophes for now (e.g. "Enw'r achos"); legacy uses curly ’, to switch once confirmed
- [x] PHT, CST, CIC, AST and GRC PDF titles from the locale `pageTitle` (were hard-coded English), with en/cy title tests
- [x] PDF data source label from the locale `provenanceLabels` in all six libs, as legacy does, with en/cy tests
- [x] E2E Welsh CIC heading uses "Enw'r achos" to match the locale
- [x] Times in GRC, SIAC/POAC/PAAC and AST: "." → ":" with `normalizeTime` in the renderers (PDF and web) and Excel reformatters, as legacy does, with renderer and Excel tests

### 4. Verify
- [x] Run `yarn lint:fix`, a typecheck and `yarn test` from the root; statement coverage above 80% in the six libs and `publication`
- [ ] Lower-environment check once #1122, #1129 and #941 are deployed:
  - [ ] upload one English and one Welsh workbook per lib (SIAC once per list type) with a hidden sheet, an extra column, a note and a formula
  - [ ] confirm the email has both links
  - [ ] confirm the xlsx has none of the hidden or extra content and matches the PDF row for row, including dates
