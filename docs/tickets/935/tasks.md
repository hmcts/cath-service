# Implementation Tasks — Issue #935

## Shared CSV utilities
- [ ] Add `"papaparse": "5.5.4"` and `"@types/papaparse": "5.5.2"` to `libs/list-types/common/package.json` (same pins as `libs/system-admin-pages`)
- [ ] Create `libs/list-types/common/src/csv/csv-utilities.ts` with `MAX_CSV_SIZE_BYTES`, `CsvColumn`, `CsvGenerationResult`, `buildCsvBuffer`, `saveCsvToStorage`, `createCsvErrorResult` — reuse the existing `sanitiseCellValue`, add a UTF-8 BOM, write `<artefactId>.csv` as `text/csv` to `CONTAINER.PUBLICATIONS`
- [ ] Export the CSV utilities from `libs/list-types/common/src/index.ts`
- [ ] Write `libs/list-types/common/src/csv/csv-utilities.test.ts` (column order, header-only when empty, quoting, formula-injection guard, BOM, null handling, size limit, error result)

## Shared UT CSV generator factory
- [ ] Create `libs/list-types/upper-tribunal-common/src/csv-generator.ts` exporting `createUtDailyHearingListCsvGenerator` (reuses each list type's renderer + `loadTranslations`; accepts `columns`, optional `courtName`, optional `resolveHeaders`/`resolveListTitle`)
- [ ] Export it from `libs/list-types/upper-tribunal-common/src/index.ts`
- [ ] Write `libs/list-types/upper-tribunal-common/src/csv-generator.test.ts`

## Per-list-type CSV generators (column arrays mirroring each PDF `<thead>`)
- [ ] `upper-tribunal-tax-and-chancery-chamber-daily-hearing-list` — `src/csv/csv-generator.ts` (8 columns), export from `index.ts`, add test
- [ ] `upper-tribunal-lands-chamber-daily-hearing-list` — `src/csv/csv-generator.ts` (9 columns incl. `modeOfHearing`), export from `index.ts`, add test
- [ ] `upper-tribunal-administrative-appeals-chamber-daily-hearing-list` — `src/csv/csv-generator.ts` (8 columns), export from `index.ts`, add test
- [ ] `utiac-statutory-appeal-daily-hearing-list` — `src/csv/csv-generator.ts` (8 columns, pass `courtName`), export from `index.ts`, add test
- [ ] `utiac-jr-daily-hearing-list` — `src/csv/csv-generator.ts` regional 7-column shape, export from `index.ts`, add test
- [ ] `utiac-jr-daily-hearing-list` — `src/csv/csv-generator-london.ts` 8-column shape with `londonTableHeaders`/`londonTableHeadersCy`, export from `index.ts`, add test

## Publication pipeline
- [ ] Add `CSV_GENERATOR_REGISTRY`, `listTypeHasCsv` and `generatePublicationCsv` to `libs/publication/src/processing/service.ts`, mirroring the Excel block
- [ ] Register all nine UT `listTypeName` values (four regional JR names share one generator; London its own)
- [ ] Add the CSV step to `processPublication` after the Excel step, keyed on `pdfResult.listTypeName`; add `csvPath?` to `ProcessPublicationResult`; log and swallow all CSV failures
- [ ] Extend `libs/publication/src/processing/service.test.ts` (per-name generation, unregistered no-op, failure isolation, `listTypeId: 999` ID-independence fixture)

## Email notifications
- [ ] Add `csvBuffer?: Buffer` to `SendEmailParams` and set `csv_link_to_file` / `csv_link_text` via `prepareUpload` in `libs/notifications/src/govnotify/govnotify-client.ts`
- [ ] Add `hasCsv` and the `GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION_PDF_CSV` branch to `getSubscriptionTemplateId`, warning and falling back to the PDF-only template when the variable is unset
- [ ] Download `<artefactId>.csv` from `CONTAINER.PUBLICATIONS` in `buildEmailDataWithFiles`, apply the same 2MB filter, add `csvBuffer` to `EmailTemplateData`
- [ ] Pass `csvBuffer` to `sendEmail` in both `processUserNotification` and `processListTypeUserNotification`
- [ ] Add `GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION_PDF_CSV` to `apps/web/.env.example`, `apps/web/helm/values.yaml`, `apps/web/helm/values.dev.yaml`, `apps/api/helm/values.yaml`
- [ ] Extend notification tests: new template selection, regression on all existing branches, unset-env fallback, CSV attached under 2MB / omitted at or above, missing CSV still sends, both subscriber paths

## Page downloads
- [ ] Create `apps/web/src/pages/(list-types)/list-download-shared.ts` with `handleListBlobDownload`, `getAvailableDownloadFiles` and `formatFileSize` — container-explicit (`CONTAINER.PUBLICATIONS`), allow-list `pdf`/`csv`, UUID validation, parallel blob probes
- [ ] Re-point `sjp-download-shared.ts` at the shared `formatFileSize` (no behaviour change to SJP)
- [ ] Add shared `downloadLinks` content to `libs/list-types/common/src/locales/en.ts` and `cy.ts` (Welsh placeholders), export from `index.ts`, and expose as `downloadLinks` on each UT lib's locale objects
- [ ] Create `libs/web-core/src/views/components/list-download-links.njk` (renders nothing when `downloadFiles` is empty)
- [ ] Add `download.ts` to each of the five UT page directories under `apps/web/src/pages/(list-types)/`
- [ ] Include the partial in all six UT `.njk` templates, after "Last updated" and above "Important information"
- [ ] Pass `downloadFiles` and `downloadLinks` from all five UT controllers via `getAvailableDownloadFiles`
- [ ] Remove the dead `pdfDownloadUrl` from the UTCC, UTLC and UTAAC controllers
- [ ] Add download-route tests (content types, 400 on bad `artefactId`, 400 on `type` outside the allow-list incl. traversal, 404 on missing blob, reads from `publications`)
- [ ] Add template tests for the partial and the six templates (links present/absent, position, Welsh, `en`/`cy` key parity)

## End-to-end and verification
- [ ] Add one `@nightly` Playwright journey: publish a UT fixture, assert both download links with sizes, download the CSV and compare its header row to the on-page table headers, check Welsh, run axe inline, verify keyboard access
- [ ] Run `yarn lint:fix`, `yarn test` and `yarn test:e2e` from the repo root
- [ ] Post the §6 clarifications on the issue and confirm the Notify PDF+CSV template ID before release
