# Tasks — Issue #945: Excel download for Administrative Court hearing lists

## Implementation Tasks

- [ ] Add `"exceljs": "4.4.0"` to `dependencies` in `libs/list-types/administrative-court-daily-cause-list/package.json` and run `yarn install`
- [ ] Add `excelSheetName: "Hearings"` to `common` in `libs/list-types/administrative-court-daily-cause-list/src/locales/en.ts`
- [ ] Add `excelSheetName: "Gwrandawiadau"` to `common` in `libs/list-types/administrative-court-daily-cause-list/src/locales/cy.ts` (must be a real translation — ExcelJS rejects `[` `]` in sheet names and caps them at 31 chars, so no placeholder)
- [ ] Create `libs/list-types/administrative-court-daily-cause-list/src/excel/excel-generator.ts` exporting `generateAdministrativeCourtDailyCauseListExcel`, following `libs/list-types/magistrates-standard-list/src/excel/excel-generator.ts`
  - [ ] Import locales directly (`en.js` / `cy.js`) — do **not** use `loadTranslations`
  - [ ] Guard unknown `listTypeName`: return `{ success: false, error }` without calling `saveExcelToStorage`
  - [ ] Build header metadata via the existing `renderAdminCourt(...)` with `listTitle: court.pageTitle`
  - [ ] Sheet 1 (`t.common.excelSheetName`): bold header row from `t.common.tableHeaders` in PDF column order, `views = [{ state: "frozen", ySplit: 1 }]`, one row per hearing, every cell `sanitiseCellValue(String(v ?? ""))`, then `autoFitColumns`
  - [ ] Sheet 2 (`t.common.importantInfoTitle`): list title, FaCT line, "List for", "Last updated … at …", important-information heading and text, judgments heading and text, "Data source" (omitted when `provenance` is absent, label from `t.common.provenanceLabels`), both caution paragraphs
  - [ ] `saveExcelToStorage(artefactId, Buffer.from(await workbook.xlsx.writeBuffer()))`
  - [ ] Wrap in `try/catch` returning `{ success: false, error: "Failed to generate Administrative Court Excel: …" }`
- [ ] Add `export * from "./excel/excel-generator.js";` to `libs/list-types/administrative-court-daily-cause-list/src/index.ts`
- [ ] Add `provenance?: string;` to `GenerateExcelParams` in `libs/publication/src/processing/service.ts`
- [ ] Pass `provenance` into the `generatePublicationExcel({ … })` call inside `processPublication`
- [ ] Register the generator in `EXCEL_GENERATOR_REGISTRY` under all four stable names: `BIRMINGHAM_`, `LEEDS_`, `BRISTOL_CARDIFF_`, `MANCHESTER_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST` (never key on `listTypeId`)
- [ ] Write `libs/list-types/administrative-court-daily-cause-list/src/excel/excel-generator.test.ts` — mock only `@hmcts/list-types-common`, capture the buffer passed to `saveExcelToStorage` and re-parse it with real ExcelJS; cover all cases listed in plan.md §4
- [ ] Extend `libs/publication/src/processing/service.test.ts` — `listTypeHasExcel` for all four names, `hasExcel: true` per name, `excelPath` forwarded to notifications, `provenance` passthrough, generator failure leaves PDF and notifications intact; fixtures use `listTypeId: 999`
- [ ] Add a locale key-parity assertion for `en.common` vs `cy.common`
- [ ] Extend the existing non-strategic upload E2E journey (Birmingham upload → confirm → success → public page, with Welsh toggle and inline Axe scan) — do not add a new spec file
- [ ] Run `yarn lint:fix`, `yarn test`, `yarn test:e2e` from the repo root and fix all failures
- [ ] Confirm `GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION_PDF_EXCEL` is set in the target environment before deploy — `getSubscriptionTemplateId` now throws for these lists if it is unset
- [ ] Manual staging check: publish one list per court in English and Welsh; confirm both email links, that the workbook opens in Excel and LibreOffice, correct language throughout, and a usable `.xlsx` filename. Record the result on the ticket
