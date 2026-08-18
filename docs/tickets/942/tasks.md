# Implementation Tasks — Issue #942

## Locale content
- [ ] Add `excelSheetName: "SSCS Daily Hearing List"` to `libs/list-types/sscs-daily-hearing-list/src/locales/en.ts`
- [ ] Add `excelSheetName` placeholder to `libs/list-types/sscs-daily-hearing-list/src/locales/cy.ts` (must be ≤31 chars once translated)

## Excel generator
- [ ] Add `"exceljs": "4.4.0"` to `dependencies` in `libs/list-types/sscs-daily-hearing-list/package.json`
- [ ] Create `libs/list-types/sscs-daily-hearing-list/src/excel/excel-generator.ts` exporting `generateSscsDailyHearingListExcel`
- [ ] Build the header row from `t.tableHeaders` in the PDF column order (`venue`, `appealReferenceNumber`, `hearingType`, `appellant`, `courtroom`, `hearingTime`, `tribunal`, `respondent`, `additionalInformation`); set `font = { bold: true }`
- [ ] Freeze the header row: `worksheet.views = [{ state: "frozen", ySplit: 1 }]`
- [ ] Add one row per hearing, coercing each value with `?? ""` **before** `sanitiseCellValue` (`additionalInformation` is optional and `sanitiseCellValue` throws on non-strings)
- [ ] Guard non-array `jsonData`; wrap the body in `try/catch` and return `{ success: false, error }` — never throw
- [ ] Call `autoFitColumns` then `saveExcelToStorage(artefactId, buffer)` and return `{ success: true, excelPath }`
- [ ] Export the generator from `libs/list-types/sscs-daily-hearing-list/src/index.ts`

## Registry wiring
- [ ] Import `generateSscsDailyHearingListExcel` in `libs/publication/src/processing/service.ts` and add a shared `sscsExcelGenerator` constant
- [ ] Register all 7 SSCS list type names in `EXCEL_GENERATOR_REGISTRY` (Midlands, South East, Wales and South West, Scotland, North East, North West, London)
- [ ] Add `generateSscsDailyHearingListExcel: vi.fn()` to the existing `@hmcts/sscs-daily-hearing-list` `vi.mock` factory in `libs/publication/src/processing/service.test.ts` (the file fails entirely without this)

## Tests
- [ ] Create `libs/list-types/sscs-daily-hearing-list/src/excel/excel-generator.test.ts` covering: English header row in PDF order, one row per hearing, Welsh headings for `cy`, `undefined` `additionalInformation`, empty hearings array, formula-injection prefix, frozen header row, `saveExcelToStorage` call and returned `excelPath`, storage rejection, non-array `jsonData`
- [ ] Extend `libs/publication/src/processing/service.test.ts`: `hasExcel: true` for each of the 7 SSCS names; `{}` plus warning on generator failure; `processPublication` sets and forwards `excelPath`; publication and notifications still succeed when Excel generation fails; existing SJP/magistrates behaviour unchanged
- [ ] Add a reference-data parity test: every SSCS name in `EXCEL_GENERATOR_REGISTRY` has a `listTypeData` entry and a registered converter, and vice versa
- [ ] Extend `libs/notifications` template-selection tests if not already covered: PDF+Excel template when both files <2MB; no-links template when the Excel is ≥2MB
- [ ] Add one `@nightly` E2E journey test: admin upload → publish → view list → Welsh check → Axe scan → `?format=excel` download returns 200 with the xlsx content type

## Verification
- [ ] `yarn lint:fix` and `yarn test` pass from the repo root
- [ ] STG: confirm both `{artefactId}.pdf` and `{artefactId}.xlsx` appear in the `publications` container via `/blob-explorer`
- [ ] STG: confirm a test subscriber's email shows both download links and both resolve
- [ ] Open the `.xlsx` in Excel, LibreOffice and Google Sheets; compare row-for-row against the PDF for the same artefact (AC3 evidence)
- [ ] Confirm `GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION_PDF_EXCEL` is set in every environment before release

## Blocked on clarification
- [ ] Liverpool list type — only if Open Question 1 confirms it is distinct: add to `list-type-data.ts`, `sscs-config.ts` converter registration, `importantInformationByListType`, `SSCS_FRIENDLY_NAMES`, `PDF_GENERATOR_REGISTRY` and `EXCEL_GENERATOR_REGISTRY`
- [ ] In-page download link — only if Open Question 3 asks for it: pass `artefactId` into the SSCS render context and link to `/api/flat-file/{artefactId}/download?format=excel`
