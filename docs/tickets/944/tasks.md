# Implementation Tasks — Issue #944

CSV download for the eight tribunal hearing lists. Ordered so each block is independently
committable and testable. See `plan.md` for detail and for the seven open questions.

## Shared CSV foundation (`libs/list-types/common`)

- [ ] Create `libs/list-types/common/src/csv/csv-utilities.ts` with `toCsvBuffer(rows)` (unconditional `"` quoting, `""` escaping, `\r\n` joins, leading UTF-8 BOM) and `saveCsvToStorage(artefactId, buffer)` writing `<artefactId>.csv` to `CONTAINER.PUBLICATIONS` with content type `text/csv; charset=utf-8`
- [ ] Create `libs/list-types/common/src/csv/non-strategic-csv-generator.ts` exporting `createNonStrategicCsvGenerator({ en, cy, columns, render })`; select locale, call the shared renderer, emit one header row from `t.tableHeaders` then one row per hearing, coerce nullish values to `""`, pass every cell through the existing `sanitiseCellValue`, and return `{ success: false, error }` rather than throwing
- [ ] Export both modules from `libs/list-types/common/src/index.ts`
- [ ] Add `csv-utilities.test.ts` — quoting, `""` escaping, embedded comma/newline, CRLF, BOM, blob key/container/content type
- [ ] Add `non-strategic-csv-generator.test.ts` — header + row shape, Welsh headings, missing field → empty cell, empty hearings → header only, `=` prefixed with `'`, upload failure returns `{ success: false }`

## Per-package CSV generators (six files)

- [ ] `libs/list-types/pht-weekly-hearing-list/src/csv/csv-generator.ts` — columns: `date`, `caseName`, `hearingLength`, `hearingType`, `venue`, `additionalInformation`; export from `src/index.ts`
- [ ] `libs/list-types/care-standards-tribunal-weekly-hearing-list/src/csv/csv-generator.ts` — same six columns; export from `src/index.ts`
- [ ] `libs/list-types/siac-poac-paac-weekly-hearing-list/src/csv/csv-generator.ts` — columns: `date`, `time`, `appellant`, `caseReferenceNumber`, `hearingType`, `courtroom`, `additionalInformation`; one generator serving all three list types; export from `src/index.ts`
- [ ] `libs/list-types/grc-weekly-hearing-list/src/csv/csv-generator.ts` — columns: `date`, `hearingTime`, `caseReferenceNumber`, `caseName`, `judges`, `members`, `modeOfHearing`, `venue`, `additionalInformation`; export from `src/index.ts`
- [ ] `libs/list-types/cic-weekly-hearing-list/src/csv/csv-generator.ts` — columns: `date`, `hearingTime`, `caseReferenceNumber`, `caseName`, `venuePlatform`, `judges`, `members`, `additionalInformation` (use the renderer's normalised `venuePlatform`, not the raw `venue/platform` key); export from `src/index.ts`
- [ ] `libs/list-types/ast-daily-hearing-list/src/csv/csv-generator.ts` — columns: `appellant`, `appealReferenceNumber`, `caseType`, `hearingType`, `hearingTime`, `additionalInformation`; export from `src/index.ts`
- [ ] Add a `csv-generator.test.ts` beside each of the six — assert the exact column set and order, and that values match the package's renderer output

## Publication orchestration (`libs/publication`)

- [ ] In `libs/publication/src/processing/service.ts` add `GenerateCsvParams`, `CsvGenerationResult`, `CsvGeneratorResult`, `CsvGenerator` and `CSV_GENERATOR_REGISTRY` keyed on the eight `listTypeName` strings (never `listTypeId`)
- [ ] Add `listTypeHasCsv(listTypeName)` and `generatePublicationCsv(params)` mirroring `listTypeHasExcel` / `generatePublicationExcel`, swallowing every error and returning `{}`
- [ ] Add `csvPath?: string` to `ProcessPublicationResult` and set it in `processPublication` immediately after the Excel step, inside the existing `if (jsonData)` block
- [ ] Export `listTypeHasCsv` from `libs/publication/src/index.ts`
- [ ] Extend `service.test.ts` — `listTypeHasCsv` true for all eight and false for a control list type; `csvPath` set on success and omitted on failure while the PDF path and notifications still proceed

## Email notifications (`libs/notifications`)

- [ ] Add `csvBuffer?: Buffer` to `EmailTemplateData` and to `SendEmailParams`
- [ ] In `buildEmailDataWithFiles`, fetch the PDF, `.xlsx` and `.csv` blobs in one `Promise.all`, apply the existing `MAX_PDF_SIZE_BYTES` ceiling to the CSV, fold `csvUnder2MB` into `filesUnder2MB`, and pass `hasCsv` to `getSubscriptionTemplateId`
- [ ] Thread `csvBuffer` through both `sendEmail` call sites in `notification-service.ts`
- [ ] In `govnotify-client.ts` set `csv_link_to_file` via `prepareUpload(csvBuffer, { confirmEmailBeforeDownload: false, retentionPeriod: "1 week" })` and `csv_link_text: "Download CSV version"`
- [ ] In `template-config.ts` add `GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION_PDF_CSV`, add `hasCsv` to `getSubscriptionTemplateId`, include `!hasCsv` in the no-links guard, and add the PDF+CSV branch without changing any existing branch
- [ ] Add `GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION_PDF_CSV` to `apps/web/helm/values.yaml`, `apps/api/helm/values.yaml` and `apps/web/.env.example` (value from the Notify template — blocked on Q2)
- [ ] Extend `template-config.test.ts`, `notification-service.test.ts` and `govnotify-client.test.ts` per the plan's test table, including the 2MB boundary and the CSV-blob-absent path

## Download route (`libs/public-pages`)

- [ ] Add `getGeneratedFileForDownload(artefactId, format, user)` to `flat-file/flat-file-service.ts` handling `pdf` / `csv` / `excel` from `CONTAINER.PUBLICATIONS` with the existing guard sequence (not found → display window → `canAccessPublicationData` → blob fetch)
- [ ] Refactor `getExcelForDownload` to delegate to it, keeping its existing tests green unchanged
- [ ] Create `libs/public-pages/src/routes/api/publication-file/[artefactId]/download.ts` — validate the UUID, accept `?format=pdf|csv` defaulting to `pdf`, map `ACCESS_DENIED`→403 / `NOT_FOUND`,`FILE_NOT_FOUND`→404 / `EXPIRED`→410, serve as `attachment` with `Cache-Control: private, max-age=0, no-cache, no-store, must-revalidate` on every response path
- [ ] Add `flat-file-service.test.ts` cases for `getGeneratedFileForDownload` and a new `download.test.ts` for the route (200 both formats, 400, 403, 404, 410)

## Page download block (pending Q3)

- [ ] Move `formatFileSize` from `apps/web/src/pages/(list-types)/sjp-download-shared.ts` to `libs/publication/src/file-storage/file-size.ts`, export from `@hmcts/publication`, and import it in both call sites
- [ ] Create `libs/list-types/common/src/views/partials/list-download-options.njk` rendering an `h2` and a `govuk-list` of download links with sizes, plus the CSV hint; render nothing when `downloadOptions` is empty
- [ ] Add `moduleRoot` for `libs/list-types/common` to `modulePaths` in `apps/web/src/app.ts` if not already present
- [ ] Add `buildDownloadOptions(artefact, t)` to `apps/web/src/pages/(list-types)/list-type-handler.ts` — return `[]` immediately unless `listTypeHasCsv(artefact.listTypeName)`, probe both blobs in one `Promise.all` against `CONTAINER.PUBLICATIONS`, build `/api/publication-file/<id>/download?format=…` URLs, and return `[]` on any storage error
- [ ] Pass `downloadOptions` from `createWeeklyHearingListRender` and from the SIAC/POAC/PAAC render function
- [ ] Include the partial in the six templates (pht, care-standards, grc, cic, ast page templates and the shared siac-poac-paac view) after the `lastUpdated` paragraph and before the "Important information" details
- [ ] Add `downloadHeading`, `downloadPdfLinkText`, `downloadCsvLinkText`, `downloadCsvHint` to `en.ts` and `cy.ts` in all six packages, Welsh using the `[WELSH TRANSLATION REQUIRED: "…"]` placeholder
- [ ] Add an en/cy key-parity assertion in any of the six packages that lacks one
- [ ] Extend `list-type-handler.test.ts` for `buildDownloadOptions` and add download-block assertions to the existing `*.njk.test.ts` files (both formats present, absent when empty, Welsh text)

## End-to-end and verification

- [ ] Add one `@nightly` journey at `e2e-tests/tests/tribunal-list-csv-download.spec.ts` — publish a GRC list, assert both download links with sizes, download the CSV and match its first data row to the page's first table row, switch to Welsh, inline axe scan, keyboard-activate the CSV link
- [ ] Run `yarn lint:fix`, `yarn test` and `yarn test:e2e` from the repo root and fix any failures

## Follow-ups (raise separately — see Q5)

- [ ] Track: `libs/public-pages/src/routes/pdf/[artefactId]/download.ts` reads PDFs from the local filesystem while they are written to blob storage, and performs no `canAccessPublicationData` check
- [ ] Track: `sjp-download-shared.ts` calls `downloadBlob` / `getBlobProperties` with no container, defaulting to `CONTAINER.ARTEFACT` while the files live in `CONTAINER.PUBLICATIONS`
- [ ] Track: three Upper Tribunal page controllers set a dead `pdfDownloadUrl: "/api/pdf/<id>/download"` that no template uses and no route serves
