# Issue #673: Implementation Tasks

## Database

> **Not implemented — alternative approach taken.** The plan required an `excel_path` DB column so the download link would only appear for artefacts that have a blob. Instead, Excel availability is determined at runtime via `listTypeHasExcel(artefact.listTypeName)` (a registry membership check), and the blob key is derived as `${artefactId}.xlsx` — the same pattern used for PDFs, which also have no DB column. This means the Excel download link is shown for all artefacts of a supported list type, including older ones published before this feature deployed. Clicking the link for a pre-feature artefact returns a FILE_NOT_FOUND error from `getExcelForDownload`. This is an accepted trade-off given that all list types will eventually support Excel.

- [ ] ~~Add `excelPath String? @map("excel_path") @db.VarChar(500)` to the `Artefact` model in `libs/postgres-prisma/prisma/schema/base.prisma`~~ — not implemented, see note above
- [ ] ~~Run `yarn db:migrate:dev` to create the migration file~~ — not implemented
- [ ] ~~Run `yarn db:generate` to regenerate the Prisma client~~ — not required (schema unchanged)

## Publication lib — model and queries

- [ ] ~~Add `excelPath?: string | null` to the `Artefact` interface in `libs/publication/src/repository/model.ts`~~ — not implemented, see Database note
- [ ] ~~Add `excelPath?: string | null` to the `ArtefactWithListType` type in `libs/publication/src/repository/model.ts`~~ — not implemented
- [ ] ~~Add `excelPath: true` to the `getArtefactById` select in `libs/publication/src/repository/queries.ts`~~ — not implemented
- [ ] ~~Add `updateArtefactExcelPath(artefactId: string, excelPath: string): Promise<void>` to `libs/publication/src/repository/queries.ts`~~ — not implemented
- [x] Extend `deleteArtefacts` in `libs/publication/src/repository/queries.ts` to delete `${artefactId}.xlsx` from `CONTAINER.PUBLICATIONS` (with 404 suppression matching the existing PDF deletion pattern)
- [ ] ~~Export `updateArtefactExcelPath` from `libs/publication/src/index.ts`~~ — not implemented; `listTypeHasExcel` exported instead

## Publication lib — content type

- [x] Add `".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"` to `libs/publication/src/file-storage/content-type.ts`

## Common list-types lib — shared Excel utility

- [x] Create `libs/list-types/common/src/excel/excel-utilities.ts` with `sanitiseCellValue(value: string): string` and `saveExcelToStorage(artefactId: string, buffer: Buffer): Promise<{ excelPath: string }>` (uploads to `CONTAINER.PUBLICATIONS` as `${artefactId}.xlsx`)
- [x] Export `sanitiseCellValue` and `saveExcelToStorage` from `libs/list-types/common/src/index.ts`
- [x] Write unit tests for `sanitiseCellValue` in `libs/list-types/common/src/excel/excel-utilities.test.ts`

## Magistrates Public List — locale additions

- [x] Add `excelColumns` object with column header strings to `libs/list-types/magistrates-public-list/src/locales/en.ts` (columns: Court House, Court Room, Sitting at, URN, Name, Hearing Type, Prosecuting Authority, Offence Details, Reporting Restrictions)
- [x] Add matching `excelColumns` object to `libs/list-types/magistrates-public-list/src/locales/cy.ts`

## Magistrates Public List — Excel generator

- [x] Add `exceljs: "4.4.0"` and `@hmcts/list-types-common: "workspace:*"` to `libs/list-types/magistrates-public-list/package.json` dependencies
- [x] Create `libs/list-types/magistrates-public-list/src/excel/excel-generator.ts` with `generateMagistratesPublicListExcel(options)` that renders via `renderMagistratesPublicListData`, writes one row per case/application, sanitises cell values, and saves via `saveExcelToStorage`
- [x] Export `generateMagistratesPublicListExcel` from `libs/list-types/magistrates-public-list/src/index.ts`
- [x] Write unit tests in `libs/list-types/magistrates-public-list/src/excel/excel-generator.test.ts` covering: header row contains all expected column names, one row per case, offence details cell content, reporting restrictions cell content, CSV injection sanitisation

## Magistrates Standard List — locale additions

- [x] Add `excelColumns` object with column header strings to `libs/list-types/magistrates-standard-list/src/locales/en.ts` (columns: Court House, LJA, Court Room, Sitting at, Name, Application Particulars, DOB, Age, Address, Prosecuting Authority Name, Attendance Method, Reference, Application Type, ASN, Hearing Type, Panel, Reporting Restrictions, Offence Code, Offence Title, Offence Details, Legislation, Max Penalty, Plea, Date of Plea, Convicted on, Adjourned from)
- [x] Add matching `excelColumns` object to `libs/list-types/magistrates-standard-list/src/locales/cy.ts`

## Magistrates Standard List — Excel generator

- [x] Add `exceljs: "4.4.0"` and `@hmcts/list-types-common: "workspace:*"` to `libs/list-types/magistrates-standard-list/package.json` dependencies
- [x] Create `libs/list-types/magistrates-standard-list/src/excel/excel-generator.ts` with `generateMagistratesStandardListExcel(options)` that renders via `renderMagistratesStandardListData`, flattens to one row per offence (repeating defendant-level fields), handles hearings with zero offences (one row with empty offence columns), sanitises cell values, and saves via `saveExcelToStorage`
- [x] Export `generateMagistratesStandardListExcel` from `libs/list-types/magistrates-standard-list/src/index.ts`
- [x] Write unit tests in `libs/list-types/magistrates-standard-list/src/excel/excel-generator.test.ts` covering: header row contains all expected column names, one row per offence with defendant fields repeated, hearing with no offences produces one row, CSV injection sanitisation

## Publication processing pipeline

- [x] Import `generateMagistratesPublicListExcel` and `generateMagistratesStandardListExcel` in `libs/publication/src/processing/service.ts`
- [x] Add `GenerateExcelParams` and `ExcelGenerationResult` interfaces in `libs/publication/src/processing/service.ts`
- [x] Add `EXCEL_GENERATOR_REGISTRY` in `libs/publication/src/processing/service.ts` with entries for `MAGISTRATES_PUBLIC_LIST` and `MAGISTRATES_STANDARD_LIST`
- [x] Add `generatePublicationExcel(params)` function in `libs/publication/src/processing/service.ts` (mirrors `generatePublicationPdf`; non-fatal on error)
- [x] Add `excelPath?` to `ProcessPublicationResult` interface in `libs/publication/src/processing/service.ts`
- [x] Call `generatePublicationExcel` in `processPublication` after PDF generation; derive `excelPath` as `${artefactId}.xlsx` when `hasExcel` is true (no DB write — see Database note above)
- [x] Pass `excelPath: result.excelPath` to `sendPublicationNotificationsForArtefact` in `processPublication`
- [x] Add unit tests in `libs/publication/src/processing/service.test.ts` covering: Excel generator called for `MAGISTRATES_PUBLIC_LIST`, Excel generator called for `MAGISTRATES_STANDARD_LIST`, `excelPath` derived from `artefactId` when Excel generation succeeds, Excel generation failure does not prevent PDF path from being returned

## Download route

- [x] Add `getExcelForDownload(artefactId: string)` to `libs/public-pages/src/flat-file/flat-file-service.ts` — looks up the artefact for display-window validation, then downloads `${artefactId}.xlsx` from `CONTAINER.PUBLICATIONS` directly (no `excelPath` DB column — see Database note above), returns buffer with xlsx content type
- [x] Extend `libs/public-pages/src/routes/api/flat-file/[artefactId]/download.ts` to read `?format` query param, validate against allow-list `["pdf", "excel"]` (default `"pdf"`), and delegate to `getExcelForDownload` when `format=excel`
- [x] Add unit tests in `libs/public-pages/src/routes/api/flat-file/[artefactId]/download.test.ts` covering: `format=excel` calls `getExcelForDownload`, missing `excelPath` returns 404, invalid `format` value defaults to pdf behaviour
- [x] Add unit tests in `libs/public-pages/src/flat-file/flat-file-service.test.ts` covering `getExcelForDownload` success and `FILE_NOT_FOUND` case

## Rendered list pages — Excel download link

Note: magistrates lists are rendered via `createListTypeHandler` / `createCauseListRender` in `apps/web/src/pages/(list-types)/list-type-handler.ts`. The download link belongs on the rendered list page templates, not the flat-file viewer.

- [x] Update `createCauseListRender` in `apps/web/src/pages/(list-types)/list-type-handler.ts` to derive `excelDownloadUrl` via `listTypeHasExcel(artefact.listTypeName)` (not `artefact.excelPath` — see Database note above) and pass `/api/flat-file/${artefact.artefactId}/download?format=excel` to the template when true
- [x] Add `downloadSection`, `downloadAsPdf`, `downloadAsSpreadsheet` keys to `libs/list-types/magistrates-public-list/src/locales/en.ts`
- [x] Add matching Welsh keys to `libs/list-types/magistrates-public-list/src/locales/cy.ts`
- [x] Add `downloadSection`, `downloadAsPdf`, `downloadAsSpreadsheet` keys to `libs/list-types/magistrates-standard-list/src/locales/en.ts`
- [x] Add matching Welsh keys to `libs/list-types/magistrates-standard-list/src/locales/cy.ts`
- [x] Update `apps/web/src/pages/(list-types)/magistrates-public-list/index.njk` to render a "Download this list" section (h2) with PDF link always present and Excel link conditionally shown when `excelDownloadUrl` is set
- [x] Update `apps/web/src/pages/(list-types)/magistrates-standard-list/index.njk` similarly
- [x] Update unit tests in `apps/web/src/pages/(list-types)/magistrates-public-list/index.test.ts` to cover: Excel link shown when `listTypeHasExcel` returns true, Excel link absent when `listTypeHasExcel` returns false
- [x] Update unit tests in `apps/web/src/pages/(list-types)/magistrates-standard-list/index.test.ts` similarly

## Notifications

- [x] Add `excelDownloadUrl?: string` to `TemplateParameters` in `libs/notifications/src/govnotify/template-config.ts`
- [x] Extend `PublicationEvent` in `libs/notifications/src/notification/validation.ts` (or wherever it is defined) to include `excelPath?: string`
- [x] Extend `ListTypePublicationEvent` in `libs/notifications/src/notification/notification-service.ts` to include `excelPath?: string`
- [x] Populate `excelDownloadUrl` in `buildEmailTemplateData` when the event has an `excelPath`, constructing the URL as `/api/flat-file/${event.publicationId}/download?format=excel`
- [x] Add a code comment in `govnotify-client.ts` noting the GOV.UK Notify template must be updated to include `((excelDownloadUrl))` before the personalisation field is effective

## Root tsconfig (if needed)

- [x] Confirm no new `@hmcts/*` path aliases are needed — both libs already exist in the workspace; no additions required
