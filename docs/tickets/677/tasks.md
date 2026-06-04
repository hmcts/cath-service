# Issue #677 — Implementation Tasks

## Implementation Tasks

### 1. CSV Generation

- [ ] Add `papaparse` (5.5.3) to `dependencies` and `@types/papaparse` to `devDependencies` in `libs/list-types/civil-and-family-daily-cause-list/package.json`
- [ ] Create `libs/list-types/common/src/csv/csv-utilities.ts` with `saveCsvToStorage(artefactId: string, csvContent: string): Promise<CsvGenerationResult>` helper — writes `{artefactId}.csv` to `TEMP_STORAGE_BASE`, mirrors `savePdfToStorage` structure; export `CsvGenerationResult` interface
- [ ] Export `saveCsvToStorage` and `CsvGenerationResult` from `libs/list-types/common/src/index.ts`
- [ ] Create `libs/list-types/civil-and-family-daily-cause-list/src/csv/csv-generator.ts` exporting `generateCauseListCsv(options: CsvGenerationOptions): Promise<CsvGenerationResult>` — reuses `renderCauseListData()`, flattens `courtLists → courtHouse → courtRoom → session → sittings → hearing → case` hierarchy to one row per case, uses `Papa.unparse()` with UTF-8 BOM prepended
- [ ] Export `generateCauseListCsv` from `libs/list-types/civil-and-family-daily-cause-list/src/index.ts`
- [ ] Write unit tests for `csv-generator.ts`: column count and header names match spec, one row per case with correct flattening, UTF-8 BOM present, fields with commas/quotes are correctly escaped by papaparse
- [ ] Write unit tests for `csv-utilities.ts`: file is written to correct path, success result contains csvPath, error result returned on write failure

### 2. File Retrieval Extension

- [ ] Extend `findFileByArtefactId(artefactId: string, extension?: string)` in `libs/publication/src/file-storage/file-retrieval.ts` — when `extension` is provided, match only files where `file.startsWith(artefactId) && file.endsWith(extension)`; default behaviour (first match) preserved when omitted
- [ ] Update `getFileBuffer(artefactId: string, extension?: string)` and `getFileExtension(artefactId: string, extension?: string)` to accept and forward the optional extension parameter
- [ ] Update `getFileForDownload(artefactId: string, format?: "pdf" | "csv")` in `libs/public-pages/src/flat-file/flat-file-service.ts` to map `format` to an extension string and pass it to `getFileBuffer` and `getFileExtension`
- [ ] Write unit tests for extended file retrieval: PDF lookup returns `.pdf` file, CSV lookup returns `.csv` file, default (no extension) returns first match, path-traversal containment check still applies for extension-qualified lookup

### 3. Download Route

- [ ] Extend `libs/public-pages/src/routes/flat-file/[artefactId]/download.ts` to read optional `?format=pdf|csv` query parameter — validate against allowlist `["pdf", "csv"]`, return 400 on invalid value, default to `"pdf"` when absent; pass validated format to `getFileForDownload`
- [ ] Write unit tests for download route format parameter: missing format defaults to pdf, `?format=csv` calls `getFileForDownload` with `"csv"`, unrecognised format returns 400, existing error cases (NOT_FOUND, EXPIRED, etc.) unaffected

### 4. Publication Orchestration

- [ ] Import `generateCauseListCsv` from `@hmcts/civil-and-family-daily-cause-list` in `libs/publication/src/processing/service.ts`
- [ ] Add `CsvGenerator` type and `CSV_GENERATOR_REGISTRY` (keyed by list type name) with `CIVIL_AND_FAMILY_DAILY_CAUSE_LIST` entry
- [ ] Add `generatePublicationCsv(params: GeneratePdfParams): Promise<{ csvPath?: string }>` — same error-handling shape as `generatePublicationPdf`; logs warning on failure, never throws
- [ ] Add `csvPath?: string` to `ProcessPublicationResult` interface
- [ ] Call `generatePublicationCsv` in `processPublication` after `generatePublicationPdf`; assign result to `result.csvPath`
- [ ] Add `csvFilePath?: string` to `SendNotificationsParams` and thread it through to `sendPublicationNotificationsForArtefact`
- [ ] Write unit tests for `service.ts` changes: CSV generator called for `CIVIL_AND_FAMILY_DAILY_CAUSE_LIST`, CSV path set on result, CSV failure does not prevent PDF result or notifications, `csvFilePath` forwarded to notification call

### 5. Publication Viewer UI

- [ ] Resolve open question (plan.md §2) on which page hosts the CSV link — civil-and-family rendered page or hearing-lists flat-file viewer — before starting this task
- [ ] Add `hasCsvDownload` boolean and `csvDownloadUrl` string to the view-model in the relevant controller; determine CSV presence by calling `findFileByArtefactId(artefactId, ".csv")` (or equivalent service method)
- [ ] Update the Nunjucks template to render a "Download as CSV" link alongside the existing PDF download link when `hasCsvDownload` is true; use visually hidden text to distinguish format (`<span class="govuk-visually-hidden"> (CSV)</span>`) for screen readers
- [ ] Add `downloadCsvLinkText` translation key to English and Welsh translation files (`en.ts` and `cy.ts`) for the relevant page; update `downloadLinkText` (or add `downloadPdfLinkText`) to disambiguate when both links are present
- [ ] Write unit tests for the controller: `hasCsvDownload` is true when CSV file exists, false when absent; correct `csvDownloadUrl` passed to template
- [ ] Verify accessible link text passes axe-core check (visually hidden format description, no duplicate link text)

### 6. Email Notifications

- [ ] Add `csvFilePath?: string` to the `PublicationEvent` interface in `libs/notifications/src/notification/validation.ts`
- [ ] In `buildEmailTemplateData` (notification-service.ts), when `event.csvFilePath` is present, read the CSV file, check size against `MAX_PDF_SIZE_BYTES`, and prepare upload via `prepareUpload` from the Notify client
- [ ] Add `link_to_csv_file` personalisation field to `TemplateParameters` interface in `libs/notifications/src/govnotify/template-config.ts` (optional field)
- [ ] Add `link_to_csv_file` to `buildEnhancedTemplateParameters` when CSV buffer is provided; add a new `GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION_PDF_CSV` env var (or extend existing template selection logic) to select a template that includes the CSV field
- [ ] Write unit tests for notification service: `link_to_csv_file` included in template parameters when CSV path provided and file under size limit, field omitted when CSV absent or over size limit, existing PDF-only and no-PDF paths unaffected
- [ ] [OPERATIONAL] Update GOV.UK Notify template(s) in the Notify dashboard to render `link_to_csv_file` personalisation field before deploying notification code changes

### 7. E2E Test

- [ ] Add CSV download journey to the existing CFT hearing list E2E spec (or create `e2e-tests/tests/cft-csv-download.spec.ts`): seed a `CIVIL_AND_FAMILY_DAILY_CAUSE_LIST` publication, navigate to the viewer page, assert the "Download as CSV" link is visible, follow the link, assert `Content-Type: text/csv`, assert response body begins with UTF-8 BOM and contains expected column headers; include accessibility check inline with `AxeBuilder`
