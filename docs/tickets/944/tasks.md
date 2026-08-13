# Tasks: #944 Create additional file format (Excel) for the remaining Tribunal hearing lists

## Implementation Tasks

### Shared builder in `@hmcts/list-types-common`

- [ ] Create `libs/list-types/common/src/excel/tabular-list-excel.ts` exporting `buildTabularListExcel({ artefactId, sheetName, metadataRows, columnHeaders, rows })` returning `{ success, excelPath?, error? }`, plus `buildListMetadataRows(...)` and the `TabularListExcelResult` type
- [ ] Add a module-private `toSafeSheetName` that strips `* ? : / \ [ ]`, trims leading/trailing apostrophes, falls back to `"List"` when empty and truncates to 31 characters (ExcelJS throws on illegal characters — `node_modules/exceljs/lib/doc/worksheet.js:155-161`)
- [ ] Wire the builder to the existing helpers: `sanitiseCellValue` on every data cell, `autoFitColumns`, then `saveExcelToStorage(artefactId, Buffer.from(await workbook.xlsx.writeBuffer()))`; wrap the whole body in `try/catch` and never throw
- [ ] Omit the data-source metadata row when the resolved value is empty, matching `{% if dataSource %}` in the PDF templates
- [ ] Export the new module from `libs/list-types/common/src/index.ts` alongside the existing `./excel/excel-utilities.js` export at line 30
- [ ] Add `libs/list-types/common/src/excel/tabular-list-excel.test.ts` — mock `@hmcts/azure-blob` `uploadBlob`, read the captured buffer back with ExcelJS, and assert metadata rows, the blank spacer row, the bold header row, row/cell values, formula-injection sanitisation, the empty-rows case, sheet-name sanitising/truncation, and the `{ success: false }` path

### Locale keys

- [ ] Add `excelSheetName` to `en.ts` and `cy.ts` in `pht-weekly-hearing-list`, `care-standards-tribunal-weekly-hearing-list`, `grc-weekly-hearing-list`, `cic-weekly-hearing-list` and `ast-daily-hearing-list`, using the English values and the shipped `welshFriendlyName`-derived Welsh values in plan.md §2.5 (all ≤ 31 characters, no illegal characters)
- [ ] Add `siacExcelSheetName`, `poacExcelSheetName` and `paacExcelSheetName` to `siac-poac-paac-weekly-hearing-list` `en.ts` and `cy.ts` (Welsh uses `[WELSH TRANSLATION REQUIRED: '...']` placeholders — see Clarification 4)
- [ ] Replace the `[WELSH TRANSLATION REQUIRED: ...]` placeholder at `libs/list-types/grc-weekly-hearing-list/src/locales/cy.ts:4` with the Welsh already shipped at `libs/list-types/common/src/list-type-data.ts:492` (see Clarification 3)
- [ ] Add or extend a co-located locale test per package asserting `Object.keys(en).sort()` equals `Object.keys(cy).sort()` and that every non-placeholder sheet-name value is ≤ 31 characters and free of `* ? : / \ [ ]` — five packages have no locale test today; only `siac-poac-paac-weekly-hearing-list/src/locales/locales.test.ts` exists

### Per-package Excel wrappers

- [ ] `libs/list-types/pht-weekly-hearing-list/src/excel/excel-generator.ts` — `generatePhtWeeklyHearingListExcel`, `renderPhtData`, columns `date, caseName, hearingLength, hearingType, venue, additionalInformation`, weekly metadata row
- [ ] `libs/list-types/care-standards-tribunal-weekly-hearing-list/src/excel/excel-generator.ts` — `generateCareStandardsTribunalWeeklyHearingListExcel`, `renderCareStandardsTribunalData` (pass the required `courtName: "Care Standards Tribunal"`), same six columns as PHT
- [ ] `libs/list-types/grc-weekly-hearing-list/src/excel/excel-generator.ts` — `generateGrcWeeklyHearingListExcel`, `renderGrcWeeklyHearingListData` (pass the required `courtName: "General Regulatory Chamber"`), columns `date, hearingTime, caseReferenceNumber, caseName, judges, members, modeOfHearing, venue, additionalInformation`
- [ ] `libs/list-types/cic-weekly-hearing-list/src/excel/excel-generator.ts` — `generateCicWeeklyHearingListExcel`, `renderCicWeeklyHearingListData` (note: not `renderCicData`), columns `date, hearingTime, caseReferenceNumber, caseName, venuePlatform, judges, members, additionalInformation`
- [ ] `libs/list-types/ast-daily-hearing-list/src/excel/excel-generator.ts` — `generateAstDailyHearingListExcel`, `renderAstDailyHearingListData`, columns `appellant, appealReferenceNumber, caseType, hearingType, hearingTime, additionalInformation`, and the `listForDate` metadata row (AST has no `listForWeekCommencing` key and no `date` column)
- [ ] `libs/list-types/siac-poac-paac-weekly-hearing-list/src/excel/excel-generator.ts` — `generateSiacPoacPaacWeeklyHearingListExcel(options & { listTypeName })` with a string-keyed `LIST_TYPE_CONFIG` for title/sheet name/court name, `renderSiacPoacPaacData`, columns `date, time, appellant, caseReferenceNumber, hearingType, courtroom, additionalInformation`, returning `{ success: false, error }` for an unknown name
- [ ] In every wrapper: type `COLUMNS` as `readonly (keyof typeof en.tableHeaders)[]`, read cells as `String(value ?? "")`, set `lastReceivedDate: new Date().toISOString()`, and resolve the data source as `t.provenanceLabels[provenance] ?? provenance` — do **not** import `@hmcts/publication` (circular)
- [ ] Add `export * from "./excel/excel-generator.js";` to each of the six `src/index.ts` files
- [ ] Add a co-located `excel/excel-generator.test.ts` per package — partially mock `@hmcts/list-types-common` with `importOriginal`, spy on `buildTabularListExcel`, and assert the exact `metadataRows`, `columnHeaders` (order matching the PDF template `<th>` order) and `rows` arrays for English and Welsh, empty-hearings, missing optional fields, and (CIC) the `venue/platform` to `venuePlatform` rename

### Publication service wiring

- [ ] Add `provenance?: string` to `GenerateExcelParams` at `libs/publication/src/processing/service.ts:338-346`
- [ ] Forward `provenance` in the `generatePublicationExcel` call at `libs/publication/src/processing/service.ts:635-643` (already destructured at line 593)
- [ ] Add the six `generate…Excel` names to the existing per-package import statements at the top of `libs/publication/src/processing/service.ts`
- [ ] Add a module-level `siacPoacPaacExcelGenerator` const forwarding `p.listTypeName`, mirroring `rcjStandardGenerator` / `adminCourtGenerator` at lines 90-94
- [ ] Add the eight `EXCEL_GENERATOR_REGISTRY` entries at `libs/publication/src/processing/service.ts:361` keyed by `listTypeName` — `PHT_WEEKLY_HEARING_LIST`, `CARE_STANDARDS_TRIBUNAL_WEEKLY_HEARING_LIST`, `GRC_WEEKLY_HEARING_LIST`, `CIC_WEEKLY_HEARING_LIST`, `AST_DAILY_HEARING_LIST`, `SIAC_WEEKLY_HEARING_LIST`, `POAC_WEEKLY_HEARING_LIST`, `PAAC_WEEKLY_HEARING_LIST` (no numeric `listTypeId` anywhere)
- [ ] Extend the `generatePublicationExcel` describe block at `libs/publication/src/processing/service.test.ts:1584` — all eight names resolve to a generator, `listTypeHasExcel` is `true` for all eight and `false` for an unregistered name, `provenance` is forwarded, and `excelPath` is set to `<artefactId>.xlsx`; use arbitrary `listTypeId` values in fixtures to prove ID-independence

### Verification

- [ ] Confirm no notification-layer change is needed: `buildEmailDataWithFiles` already downloads `<artefactId>.xlsx` unconditionally (`libs/notifications/src/notification/notification-service.ts:466`) and `getSubscriptionTemplateId` already returns the PDF+Excel template (`libs/notifications/src/govnotify/template-config.ts:37-42`), covered by the existing test at `libs/notifications/src/govnotify/template-config.test.ts:72`
- [ ] Extend `e2e-tests/tests/api/subscription-notifications.spec.ts` with two `@nightly` journeys following the existing pattern at line 537 — one weekly list (GRC) and one daily list (AST) — using `waitForFileGeneration(artefactId, [".pdf", ".xlsx"])` and asserting both document links appear in the email
- [ ] Manually open one generated workbook per list type in Excel and LibreOffice: no repair prompt, correct tab name, metadata rows present, `dd/MM/yyyy` dates not re-interpreted, Welsh variant correct
- [ ] Run `yarn lint:fix`, `yarn test` and `yarn test:e2e` from the repo root and fix all Biome and TypeScript issues
- [ ] Raise the follow-ups recorded in plan.md Clarifications that are out of scope here — the SIAC/POAC/PAAC Welsh locale debt, the non-SJP Excel-only template gap, and the `PROVENANCE_LABELS` vs `provenanceLabelsEn` divergence for `SNL` and `CP_CATH`
