# Implementation Tasks — #675: Excel - Magistrates Hearing Lists (Part 2)

## Prerequisites
- [ ] Confirm Part 1 (Magistrates list-type module) is merged and identify the module path and renderer API
- [ ] Confirm JSON field mappings for LJA, Informant, Block Start, Listing Time, Offence Code, Age
- [ ] Confirm GOV.UK Notify template update plan (cross-team dependency for email AC)

## Core Excel Infrastructure

- [ ] Add `saveExcelToStorage()` to `libs/list-types/common/src/excel/excel-writer.ts` using exceljs — writes `{artefactId}.xlsx` to `storage/temp/uploads/`, returns `ExcelGenerationResult`
- [ ] Export `saveExcelToStorage` and `ExcelGenerationResult` from `libs/list-types/common/src/index.ts`

## Magistrates Excel Generators

- [ ] Create `libs/list-types/magistrates-adult-court-list/src/excel/excel-generator.ts` — `generateMagistratesAdultCourtListExcel()` for the 12-column private lists (DAILY + FUTURE)
- [ ] Create `libs/list-types/magistrates-adult-court-list/src/excel/excel-generator-public.ts` — `generateMagistratesPublicAdultCourtListExcel()` for the 8-column public lists (DAILY + FUTURE)
- [ ] Export both generators from the module's `src/index.ts`
- [ ] Write unit tests for both generators verifying correct column headers, row count, and no crash on empty payload

## File Storage Changes

- [ ] Add `.xlsx` MIME type to `CONTENT_TYPE_MAP` in `libs/publication/src/file-storage/content-type.ts`
- [ ] Add `findFileByArtefactIdAndExtension(artefactId, extension)` to `libs/publication/src/file-storage/file-retrieval.ts` — targeted lookup for `{artefactId}{ext}`
- [ ] Update tests in `file-retrieval.test.ts` for the new function

## Publication Processing

- [ ] Add `EXCEL_GENERATOR_REGISTRY` to `libs/publication/src/processing/service.ts` with all four Magistrates list type names
- [ ] Add `generatePublicationExcel()` function (mirrors `generatePublicationPdf()`)
- [ ] Update `processPublication()` to call `generatePublicationExcel()` when `jsonData` present and thread `excelFilePath` into notifications
- [ ] Update `ProcessPublicationResult` and `SendNotificationsParams` interfaces to include optional `excelFilePath`
- [ ] Update `service.test.ts`

## Download Route

- [ ] Update `libs/public-pages/src/flat-file/flat-file-service.ts`: add `format` param to `getFileForDownload()`, add `getExcelAvailability()` helper
- [ ] Update `libs/public-pages/src/routes/api/flat-file/[artefactId]/download.ts`: read `?format` query param (allow-list `["pdf", "xlsx"]`, default `"pdf"`), pass to `getFileForDownload()`
- [ ] Update `download.test.ts` for new `?format` behaviour (valid xlsx, invalid format falls back, xlsx not found returns 404)

## Hearing List Page

- [ ] Add new content keys to `apps/web/src/pages/(public)/hearing-lists/en.ts`: `downloadHeading`, `downloadExcelLinkText`, `excelFileLabel`, `excelNotAvailable`
- [ ] Add matching Welsh keys to `apps/web/src/pages/(public)/hearing-lists/cy.ts` (translations required)
- [ ] Update `apps/web/src/pages/(public)/hearing-lists/[locationId]/[artefactId]/index.ts`: call `getExcelAvailability()`, build both download URLs, pass `hasExcel` + `excelDownloadUrl` to template
- [ ] Update `index.njk` template: render dual download block (`hasExcel` conditional), accessible link text with file type
- [ ] Update controller unit tests

## Email Notifications

- [ ] Add `excelFilePath` to `PublicationEvent` and `ListTypePublicationEvent` in `libs/notifications/src/notification/notification-service.ts`
- [ ] Update `buildEmailDataWithPdf()` / `buildEmailTemplateData()` to prepare Excel buffer when `excelFilePath` provided
- [ ] Add `GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION_PDF_EXCEL` env var and new template selector to `libs/notifications/src/govnotify/template-config.ts`
- [ ] Update `libs/notifications/src/govnotify/govnotify-client.ts` to pass second `prepareUpload` for Excel (`link_to_file_excel` personalisation key)
- [ ] Update notification service tests

## E2E Test

- [ ] Add `@nightly` E2E test to `e2e-tests/` covering: verified user opens published Magistrates daily list → sees both download links → inline Welsh check → Axe accessibility scan
