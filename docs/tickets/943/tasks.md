# Tasks: #943 — Excel download for the First-tier Tribunal hearing lists

## Implementation Tasks

### 0. Before coding
- [x] Post CLARIFICATIONS 1–5 (plan.md §5) on issue #943 and record the answers. Clarification 1
  (JSON fallback) confirmed not applicable — resolved without posting, see plan.md §5. Clarifications
  2–5 still outstanding.
- [x] Create `feature/943-ftt-excel` from `feature/941-rolls-building-excel` (`f1521ded`). Do not reuse `origin/feature/943-ftt-excel-download`: it has an obsolete docs commit and is not in the stack's history
- [x] Run `yarn install` and `yarn db:generate`, then check the stack builds and tests pass before changing anything

### 1. Per-lib reformatters (5 libs)
For each of `wpafcc-weekly-hearing-list`, `ftt-tax-chamber-weekly-hearing-list`, `ftt-lands-registration-tribunal-weekly-hearing-list`, `send-daily-hearing-list` and `ftt-rpt-weekly-hearing-list`:
- [x] Add `"exceljs": "4.4.0"` to `devDependencies` in `package.json`
- [x] Create `src/excel/excel-reformatter.ts`:
  - `{ worksheetIndex: 0, fields: <CONFIG>.fields, headers: t.tableHeaders, formatRow }`
  - `formatRow` formats `date` with `formatDdMmYyyyDate(row.date, locale)`, except SEND, which uses identity
- [x] Export it from `src/index.ts`:
  - `reformatWpafccWeeklyHearingListExcel`
  - `reformatFttTaxChamberWeeklyHearingListExcel`
  - `reformatFttLrtWeeklyHearingListExcel`
  - `reformatSendDailyHearingListExcel`
  - `reformatFttRptWeeklyHearingListExcel`
- [x] Create `src/excel/excel-reformatter.test.ts` (real ExcelJS, AAA, no mocks of `@hmcts/list-types-common`; import the converter config so it registers):
  - [x] English headings equal `en.tableHeaders` in PDF order, in bold
  - [x] Welsh headings equal `cy.tableHeaders`
  - [x] Rows equal the real renderer's `hearings` for `convertExcelForListTypeName(...)` output, for en and cy; `rowCount` matches
  - [x] Long date: `15 January 2026` (en) and `15 Ionawr 2026` (cy). Not for SEND
  - [x] Times are not normalised (`10.30am` stays)
  - [x] Only the first sheet is output, under its uploaded name. The extra sheet and the "Internal notes" column are dropped
  - [x] WPAFCC only: an empty Additional information gives `""`
- [x] `yarn install` once all 5 `package.json` files are changed

### 2. Publication registry
- [x] `libs/publication/src/processing/service.ts`:
  - [x] Add the 5 reformatters to the existing lib imports
  - [x] Add `fttRptUploadedExcelGenerator = createUploadedExcelGenerator(reformatFttRptWeeklyHearingListExcel)` next to the other shared generators
  - [x] Add 10 `EXCEL_GENERATOR_REGISTRY` entries with no JSON fallback: WPAFCC, Tax, LRT and SEND, each with its own `createUploadedExcelGenerator(...)`, plus the 6 `FTT_RPT_*` names pointing at the shared RPT generator
- [x] `libs/publication/src/processing/service.test.ts`:
  - [x] Add the reformatter to the 5 existing `vi.mock` blocks
  - [x] Names derived from `listTypeData` by the 5 `urlPath`s equal the 10 case names (sort a copy, `[...x].sort()`)
  - [x] `listTypeHasExcel` is true for each derived name
  - [x] With `uploadedExcel`, the right reformatter gets `(buffer, locale)`, `saveExcelToStorage` stores the result, and `deleteBlob` is not called. All 6 RPT names use the RPT reformatter
  - [x] Without `uploadedExcel`, the stale xlsx is deleted and no reformatter is called
  - [x] When the reformatter rejects, the stale xlsx is deleted, and the PDF and notifications still go ahead without `excelPath`
  - [x] `processPublication` with an FTT upload passes `excelPath` to notifications
  - [x] Fixtures use `listTypeId: 999`. No new `as any` where a typed fixture works

### 3. E2E (one journey)
- [x] `e2e-tests/tests/admin/non-strategic-upload.spec.ts`:
  - [x] Rename the `@nightly` Excel test to include First-tier Tribunal
  - [x] Look up `FTT_RPT_LONDON_WEEKLY_HEARING_LIST` with `getListTypeByName` and add it to the seeded guard
  - [x] Add STEP 8: a Welsh RPT London upload (sheet "RPT London", extra "Internal notes" column, date `15/01/2026`). Use `downloadReformattedWorksheet` and assert the RPT `cy` headings, `15 Ionawr 2026` with the other values unchanged, and that "Internal notes" is absent. Then call `expectPdfAndExcelLinksInEmail`
  - [x] Push the artefact ID to `artefactIds` for cleanup
  - [x] Leave the suite inside `test.describe.skip` (SSO), as #940–#941 do

### 4. Quality checks
- [x] `yarn lint:fix`
- [x] Typecheck the 6 changed workspaces (`tsc --noEmit`)
- [x] `yarn test`. Coverage above 80% for each changed workspace, and the new `excel-reformatter.ts` files at 100%
- [x] No numeric `listTypeId` in code or comments. `.js` relative imports. Comments explain why

### 5. Branch hygiene
- [ ] Commit only when asked. Message: `feat(943): send an Excel download for First-tier Tribunal hearing lists` — left for user
- [ ] Open the PR against `feature/941-rolls-building-excel` and note that it merges after #1122, #1129 and #1133 — left for user
- [ ] When the stack changes, merge it into this branch (do not rebase) — left for user

### 6. Lower-environment check (after the stack is deployed) — manual, left for user
- [ ] Upload one English and one Welsh workbook for WPAFCC, Tax, LRT, SEND and one RPT region, each with a hidden sheet, a note, a formula in an unmapped column and an extra column
- [ ] Each email has PDF and Excel links. The xlsx matches the PDF table row for row on every field, including the long-form date (see §7)
- [ ] Hidden or extra content is absent
- [ ] SEND's Excel is not downloadable without access
- [ ] Republishing one of them as JSON through `POST /publication` removes the xlsx, and the email is PDF-only
- [ ] `GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION_PDF_EXCEL` is set in the environment

### 7. Post-release fix: date column formatted to match the PDF (plan.md §5, Clarification 4 — RESOLVED)
An earlier follow-up kept the uploaded date unchanged (`16/12/2024`) in WPAFCC, Tax, LRT and RPT.
The PO has since confirmed the date must be formatted to match the PDF, so that change was reverted.

- [x] WPAFCC, Tax, LRT and RPT `excel-reformatter.ts`: `formatRow` restored to
  `(row) => ({ ...row, date: formatDdMmYyyyDate(row.date, locale) })`
- [x] Per-lib `excel-reformatter.test.ts` (all 4): restored the long-date `it.each`
  (`15 January 2026` / `15 Ionawr 2026`) and full-row PDF parity, including the date
- [x] `e2e-tests/tests/admin/non-strategic-upload.spec.ts` STEP 8: expected RPT London date restored
  to `"15 Ionawr 2026"`
- [x] Reran the 4 reformatter test suites and Biome on the changed files

### 8. Post-release fix: real Welsh table headings for WPAFCC, Tax Chamber and LRT (plan.md §5, Clarification 3 — RESOLVED)
The PO supplied real Welsh `tableHeaders` for all 3 libs in the same conversation as the date fix
(§7). Only `tableHeaders` was in scope — the rest of each `cy.ts` (page title, important-information
text, search label) is untouched and still English/placeholder for WPAFCC and Tax Chamber.

- [x] `wpafcc-weekly-hearing-list/src/locales/cy.ts`: replaced all 8 `[WELSH TRANSLATION REQUIRED: …]`
  `tableHeaders` placeholders with the supplied translations (`additionalInformation` was already
  translated and unchanged, confirming the field order mapping)
- [x] `ftt-tax-chamber-weekly-hearing-list/src/locales/cy.ts`: replaced all 7 English `tableHeaders`
  copies with the supplied translations
- [x] `ftt-lands-registration-tribunal-weekly-hearing-list/src/locales/cy.ts`: replaced all 6 English
  `tableHeaders` copies with the supplied translations
- [x] No test changes needed: `excel-reformatter.test.ts` and the `.njk.test.ts` template tests for
  all 3 libs derive expected headings from `cy.tableHeaders` itself, not hardcoded strings, so they
  picked up the real translations automatically. Reran all 3 lib test suites plus the 3 `.njk.test.ts`
  files to confirm
- [x] Confirmed this also changes the Welsh **PDF** for these 3 list types, since the PDF template
  reads the same `t.tableHeaders` object. Accepted as correct, not a side effect to avoid
- [ ] Other English/placeholder content in WPAFCC and Tax Chamber `cy.ts` (page title, important
  info, search label) is still open — raise separately if needed
