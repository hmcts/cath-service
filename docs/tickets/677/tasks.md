# Implementation Tasks: #677 Excel – CFT Hearing Lists

## Implementation Tasks

- [ ] Add `saveExcelToStorage()` to `libs/list-types/common/src/excel/excel-utilities.ts` and export from `libs/list-types/common/src/index.ts`
- [ ] Add `.xlsx` MIME type to `CONTENT_TYPE_MAP` in `libs/publication/src/file-storage/content-type.ts`
- [ ] Create `libs/list-types/civil-and-family-daily-cause-list/src/excel/excel-generator.ts` with `generateCauseListExcel()` including formula-injection sanitisation; export from `index.ts`
- [ ] Create `libs/list-types/civil-daily-cause-list/src/excel/excel-generator.ts` with `generateCivilDailyCauseListExcel()`; export from `index.ts`
- [ ] Create `libs/list-types/family-daily-cause-list/src/excel/excel-generator.ts` with `generateFamilyDailyCauseListExcel()`; export from `index.ts`
- [ ] Add `EXCEL_GENERATOR_REGISTRY` and `generatePublicationExcel()` to `libs/publication/src/processing/service.ts`; call it inside `processPublication()` after PDF generation; pass `xlsxFilePath` through to `sendPublicationNotificationsForArtefact`
- [ ] Add `findFileByArtefactIdAndExtension()` to `libs/publication/src/file-storage/file-retrieval.ts` to look up a file by artefactId + specific extension
- [ ] Update `getFileForDownload()` in `libs/public-pages/src/flat-file/flat-file-service.ts` to accept an optional `format` param (`"pdf" | "xlsx"`) and use the new extension-specific lookup
- [ ] Update `getFlatFileForDisplay()` to check whether an `.xlsx` file exists for the artefact and return `hasXlsx: boolean`
- [ ] Update download endpoint `libs/public-pages/src/routes/api/flat-file/[artefactId]/download.ts` to read `?format=xlsx` query param; set `Content-Disposition: attachment` for Excel
- [ ] Add new content keys (`downloadHeading`, `downloadPdfLinkText`, `downloadExcelLinkText`) to `apps/web/src/pages/(public)/hearing-lists/en.ts` and `cy.ts`
- [ ] Update `apps/web/src/pages/(public)/hearing-lists/[locationId]/[artefactId]/index.ts` to pass `xlsxDownloadUrl`, `hasXlsx`, and new content keys to the template
- [ ] Update `apps/web/src/pages/(public)/hearing-lists/[locationId]/[artefactId]/index.njk` to render two download links (`<a>` elements) beneath the PDF viewer
- [ ] Add `xlsxFilePath` to `PublicationEvent` and `ListTypePublicationEvent` in `libs/notifications/src/notification/notification-service.ts`; add `excel_download_link` + `display_excel` personalisation in `buildEmailTemplateData`
- [ ] Add `display_excel` and `excel_download_link` fields to `TemplateParameters` in `libs/notifications/src/govnotify/template-config.ts`
- [ ] Write unit tests for each Excel generator (happy path, formula-injection sanitisation, empty data)
- [ ] Write unit tests for `saveExcelToStorage`, `findFileByArtefactIdAndExtension`, updated `getFileForDownload`, updated `getFlatFileForDisplay`
- [ ] Write unit test for updated download endpoint (pdf default, xlsx param, invalid format fallback)
- [ ] Write unit test for updated hearing list page controller (`hasXlsx: true` and `hasXlsx: false` branches)
- [ ] Write E2E test: full journey — hearing list page shows both download links; Excel link returns 200 with correct MIME type; Welsh translation of download heading/links passes
