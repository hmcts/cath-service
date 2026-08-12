# Tasks — Issue #941

## Implementation Tasks

- [ ] Confirm blocking clarifications (a), (b) and (c) in `docs/tickets/941/plan.md` §6 before writing code — the answer to (b) determines whether a new Notify template and env var are needed, and (c) determines whether the file is CSV or `.xlsx` at all
- [ ] Add an explicit empty-value guard to `sanitiseCellValue` in `libs/list-types/common/src/excel/excel-utilities.ts`
- [ ] Add a `sanitiseCellValue("")` case to `libs/list-types/common/src/excel/excel-utilities.test.ts`
- [ ] Create `libs/list-types/common/src/csv/csv-utilities.ts` with `toCsv(rows: string[][]): string` (RFC 4180, `\r\n` separators, quote fields containing `,` `"` `\r` `\n`, double internal quotes, every field through `sanitiseCellValue`)
- [ ] Add `saveCsvToStorage(artefactId: string, content: string): Promise<{ csvPath: string }>` to `libs/list-types/common/src/csv/csv-utilities.ts` — prepend UTF-8 BOM, `uploadBlob(\`${artefactId}.csv\`, buffer, "text/csv", CONTAINER.PUBLICATIONS)`
- [ ] Export `toCsv` and `saveCsvToStorage` from `libs/list-types/common/src/index.ts`
- [ ] Create `libs/list-types/common/src/csv/csv-utilities.test.ts` — serialisation, quoting/escaping, formula-injection prefixing per char, empty field, and `saveCsvToStorage` upload args including the BOM bytes
- [ ] Create `libs/list-types/chd-kb-common/src/locales/en.ts` exporting `en.csvColumns` with the 7 column names
- [ ] Create `libs/list-types/chd-kb-common/src/locales/cy.ts` exporting `cy.csvColumns`, values copied verbatim from `libs/list-types/companies-winding-up-chd-daily-cause-list/src/locales/cy.ts` `tableHeaders`
- [ ] Create `libs/list-types/chd-kb-common/src/csv/csv-generator.ts` with `CSV_COLUMN_ORDER` const and `generateChdKbCsv(options)` — locale selection, non-array guard, header row and data rows both driven off `CSV_COLUMN_ORDER`, `toCsv` → `saveCsvToStorage`, never throws
- [ ] Create `libs/list-types/chd-kb-common/src/csv/rolls-building-list-types.ts` exporting `ROLLS_BUILDING_LIST_TYPE_NAMES` containing only `COMPANIES_WINDING_UP_CHD_DAILY_CAUSE_LIST`
- [ ] Export `generateChdKbCsv` and `ROLLS_BUILDING_LIST_TYPE_NAMES` from `libs/list-types/chd-kb-common/src/index.ts`
- [ ] Create `libs/list-types/chd-kb-common/src/csv/csv-generator.test.ts` — English headers, Welsh headers, row order and field mapping, empty array, non-array `jsonData`, upload rejection, locale-key parity
- [ ] Create `libs/list-types/chd-kb-common/src/csv/csv-column-parity.test.ts` — parse `t.tableHeaders.*` keys from the `<thead>` of `libs/list-types/companies-winding-up-chd-daily-cause-list/src/pdf/pdf-template.njk` and assert they equal `CSV_COLUMN_ORDER`
- [ ] Add `"@hmcts/chd-kb-common": "workspace:*"` to `libs/publication/package.json` dependencies
- [ ] Add `CSV_GENERATOR_REGISTRY`, `GenerateCsvParams`, `CsvGenerationResult`, `CsvGenerator` and `generatePublicationCsv` to `libs/publication/src/processing/service.ts`, mirroring `generatePublicationExcel`
- [ ] Call `generatePublicationCsv` in `processPublication` after the `excelResult.hasExcel` block in `libs/publication/src/processing/service.ts` — do not add `csvPath` to `ProcessPublicationResult`
- [ ] Add `generatePublicationCsv` and `processPublication` CSV cases to `libs/publication/src/processing/service.test.ts`
- [ ] Rename `hasExcel` to `hasSecondaryFile` in `getSubscriptionTemplateId` in `libs/notifications/src/govnotify/template-config.ts`, keeping branch logic and env vars identical
- [ ] Add the `hasSecondaryFile` regression matrix to `libs/notifications/src/govnotify/template-config.test.ts`
- [ ] Replace `excelBuffer?: Buffer` with `secondaryFile?: { buffer: Buffer; linkText: string }` in `SendEmailParams` and set `excel_link_to_file` / `excel_link_text` from it in `libs/notifications/src/govnotify/govnotify-client.ts`
- [ ] Update the two `excelBuffer` tests in `libs/notifications/src/govnotify/govnotify-client.test.ts` to `secondaryFile` and assert the caller-supplied `linkText`
- [ ] Add `EXCEL_LINK_TEXT` and `CSV_LINK_TEXT` consts and change `EmailTemplateData.excelBuffer` to `secondaryFile` in `libs/notifications/src/notification/notification-service.ts`
- [ ] Parallelise the PDF, `.xlsx` and new `.csv` `downloadBlob` calls with `Promise.all` in `buildEmailDataWithFiles` in `libs/notifications/src/notification/notification-service.ts`
- [ ] Resolve the secondary file in `buildEmailDataWithFiles` — `.xlsx` precedence with a warning log when both exist, `secondaryUnder2MB` folded into `filesUnder2MB`, `secondaryFile` returned
- [ ] Update both `sendEmail` call sites in `libs/notifications/src/notification/notification-service.ts` from `excelBuffer` to `secondaryFile`
- [ ] Add CSV pickup, link text, `.xlsx` precedence warning, >2 MB fallback and SJP/magistrates regression cases to `libs/notifications/src/notification/notification-service.test.ts`
- [ ] Run `yarn lint:fix` and `yarn test` from the repo root and fix all failures
