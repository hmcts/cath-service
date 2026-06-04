# Implementation Tasks — #673: CSV for Magistrates Hearing Lists

## Pre-requisites
- [ ] Confirm PDF scope (clarification question #1 in plan.md) — does this ticket also build the PDF generator for both list types?
- [ ] Obtain sample magistrates publication JSON payloads to confirm field paths for all 26 Standard List columns
- [ ] Confirm `MAGISTRATES_STANDARD_LIST` id value (no conflict with in-flight migrations)

## 1. Reference data
- [ ] Add `MAGISTRATES_STANDARD_LIST` entry to `libs/location/src/list-type-data.ts`
- [ ] Create DB migration to seed the new `list_type` row

## 2. CSV utility (shared)
- [ ] Create `libs/list-types/common/src/csv/csv-utilities.ts` with `buildCsv`, `saveCsvToStorage`, `createCsvErrorResult`
- [ ] Write unit tests in `csv-utilities.test.ts` covering: comma/quote/newline escaping, CRLF line endings, UTF-8 BOM presence, empty input

## 3. Magistrates list-type module — scaffold
- [ ] Create `libs/list-types/magistrates-list/package.json`, `tsconfig.json`, `src/index.ts`, `src/config.ts`
- [ ] Register `@hmcts/magistrates-list` path alias in root `tsconfig.json`
- [ ] Register workspace in root `package.json` and `turbo.json`

## 4. Data types and renderers
- [ ] Define `MagistratesPublicListRow` and `MagistratesStandardListRow` types in `src/models/types.ts`
- [ ] Implement `magistrates-public-list-renderer.ts` — parses publication JSON → `MagistratesPublicListRow[]` (one per case)
- [ ] Implement `magistrates-standard-list-renderer.ts` — parses publication JSON → `MagistratesStandardListRow[]` (one per offence; case fields repeated)
- [ ] Write unit tests for both renderers (multi-offence case, zero-offence case, missing optional fields → empty string)

## 5. CSV generators
- [ ] Implement `src/csv/csv-generator.ts` exporting `generateMagistratesPublicListCsv` and `generateMagistratesStandardListCsv`
  - Each calls the renderer, maps rows to `string[][]` using the column order from plan §5, calls `buildCsv` + `saveCsvToStorage`
- [ ] Write unit tests: correct column count/order, one row per offence for Standard List, empty list produces header-only CSV

## 6. PDF generators (if in scope — confirm clarification #1)
- [ ] Implement `src/pdf/pdf-generator.ts` exporting `generateMagistratesPublicListPdf` and `generateMagistratesStandardListPdf`
  - Reuses the same renderer types as the CSV generators (column parity)
- [ ] Create Nunjucks templates for each list type
- [ ] Write unit tests for PDF generators

## 7. Publication pipeline wiring
- [ ] Add `CSV_GENERATOR_REGISTRY` to `libs/publication/src/processing/service.ts` with entries for both magistrates list types
- [ ] Add `generatePublicationCsv()` function (mirrors `generatePublicationPdf`; errors are caught/logged, never thrown)
- [ ] Register both list types in `PDF_GENERATOR_REGISTRY` (if PDF is in scope)
- [ ] Call `generatePublicationCsv` in `processPublication` after the PDF step; capture `csvPath`
- [ ] Pass `csvPath` as optional param into `sendPublicationNotificationsForArtefact`

## 8. CSV download route
- [ ] Create `libs/public-pages/src/routes/csv/[artefactId]/download.ts`
  - UUID validation → 400
  - Artefact auth check → 403
  - File lookup → 404 / 410
  - Response: `text/csv; charset=utf-8`, `Content-Disposition: attachment`, `Cache-Control: private, no-store`
- [ ] Register the new route in the API app router
- [ ] Write unit tests for all error branches and happy path

## 9. Email notification changes
- [ ] Add `GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION_PDF_CSV` env var to `template-config.ts`
- [ ] Extend `getSubscriptionTemplateIdForListType` to select the PDF+CSV template when both files exist
- [ ] Add `link_to_csv_file?: unknown` to `TemplateParameters`
- [ ] Update `sendPublicationNotificationsForArtefact` to accept optional `csvFilePath` and upload the CSV buffer via `prepareUpload` (≤ 2MB; failures are logged, email still sends)
- [ ] Coordinate GOV.UK Notify template changes (add `((link_to_csv_file))` to both English and Welsh templates)

## 10. List view page — download links
- [ ] Add "Download as a CSV" link to the magistrates list view pages pointing to `/api/csv/{artefactId}/download`
- [ ] Add Welsh translations for download link text
- [ ] Ensure the download block meets WCAG 2.2 AA (descriptive link text, keyboard accessible)

## 11. Testing
- [ ] Run `yarn test` across affected workspaces; fix any failures
- [ ] Write E2E test (`@nightly`): publish a magistrates list → view list page → download CSV → assert columns/headers; include Welsh link text check and inline Axe accessibility scan
- [ ] Run `yarn lint:fix` to fix any Biome warnings
