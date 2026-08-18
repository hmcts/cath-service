# Tasks — Issue #943: Excel download for First-tier Tribunal hearing lists

## Implementation Tasks

### Shared builder
- [ ] Create `libs/list-types/common/src/excel/non-strategic-excel-generator.ts` with `generateNonStrategicExcel({ artefactId, sheetName, columns, rows, errorLabel })`
- [ ] Sanitise the worksheet name: strip `* ? : / \ [ ]`, then truncate to 31 characters (ExcelJS throws on those characters — the FTT RPT titles contain a colon)
- [ ] Coerce every cell with `String(value ?? "")` before `sanitiseCellValue` (it throws a `TypeError` on `undefined`)
- [ ] Bold header row, `autoFitColumns`, persist via `saveExcelToStorage`; never throw — return `{ success: false, error }`
- [ ] Export `generateNonStrategicExcel` from `libs/list-types/common/src/index.ts`
- [ ] Write `non-strategic-excel-generator.test.ts` (header order, row mapping, undefined cells, formula prefix, sheet-name sanitising/truncation, zero rows, blob path, upload rejection)

### Content
- [ ] Add `excelSheetName` to `en.ts` and `cy.ts` in `wpafcc-weekly-hearing-list`, `ftt-tax-chamber-weekly-hearing-list`, `ftt-lands-registration-tribunal-weekly-hearing-list`, `send-daily-hearing-list` (see plan §2.3 for values; `cy` holds the English string until translations arrive — the `[WELSH TRANSLATION REQUIRED: …]` marker cannot be used as a worksheet name)

### Per-package generators
- [ ] `libs/list-types/wpafcc-weekly-hearing-list/src/excel/excel-generator.ts` — export `generateWpafccWeeklyHearingListExcel`; columns from `WPAFCC_EXCEL_CONFIG.fields` + `t.tableHeaders`; rows from `renderWpafccWeeklyHearingListData`
- [ ] `libs/list-types/ftt-tax-chamber-weekly-hearing-list/src/excel/excel-generator.ts` — `FTT_TAX_EXCEL_CONFIG`, `renderFttTaxChamberData`
- [ ] `libs/list-types/send-daily-hearing-list/src/excel/excel-generator.ts` — `SEND_EXCEL_CONFIG`, `renderSendDailyHearingListData` (its `RenderOptions` has no `courtName`)
- [ ] `libs/list-types/ftt-lands-registration-tribunal-weekly-hearing-list/src/excel/excel-generator.ts` — `FTT_LRT_EXCEL_CONFIG`, `renderFttLrtData`
- [ ] `libs/list-types/ftt-rpt-weekly-hearing-list/src/excel/excel-generator.ts` — `FTT_RPT_EXCEL_CONFIG`, `renderFttRptData`, accepts a `sheetName` argument for the six regions
- [ ] Export each generator from its package `index.ts`
- [ ] Write `excel-generator.test.ts` per package (en/cy headers, `dd/MM/yyyy` date parity, column parity guard against `*_EXCEL_CONFIG.fields`, `tableHeaders` locale-key parity; RPT: region sheet name)

### Registry wiring
- [ ] Add the `fttRptExcelGenerator(sheetName)` helper to `libs/publication/src/processing/service.ts` (next to `sscsGeneratorForListType`)
- [ ] Add the 10 entries to `EXCEL_GENERATOR_REGISTRY` (4 single names + 6 RPT regions) and extend the existing `@hmcts/*` import lines — no new package dependencies
- [ ] Extend `libs/publication/src/processing/service.test.ts`: `listTypeHasExcel` true for all 10 names; `processPublication` sets `excelPath`; PDF + notifications survive an Excel failure

### Notifications
- [ ] Extend the existing template-selection tests: FTT publication with both files <2MB → `GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION_PDF_EXCEL`; 3MB Excel → no-links template
- [ ] Confirm (no code change) that `buildEmailDataWithFiles` picks up `<artefactId>.xlsx` for these list types

### E2E
- [ ] Extend `e2e-tests/tests/api/subscription-notifications.spec.ts` — publish one representative FTT list, `waitForFileGeneration(artefactId, [".pdf", ".xlsx"])`, assert both files non-empty and two download links in the email
- [ ] Extend the FTT journey in `e2e-tests/tests/admin/non-strategic-upload.spec.ts` to assert the `.xlsx` appears alongside the `.pdf`

### Verify
- [ ] `yarn lint:fix` and `yarn test` from the repo root
- [ ] `yarn test:e2e` for the affected specs
- [ ] Manually open one generated workbook and diff its columns against the same list's PDF table

### Blocked on clarification (do not implement without answers — plan §7)
- [ ] Q1 — confirm "re-use the uploaded excel" means re-use its column definition, not the original bytes
- [ ] Q2 — confirm no on-page download journey is expected for FTT lists
- [ ] Q3 — confirm PDF header/footer metadata is not required in the workbook
- [ ] Q4/Q5 — obtain Welsh `excelSheetName` values; decide whether the pre-existing `cy.tableHeaders` gap is fixed here or in its own ticket
