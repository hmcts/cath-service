# Tasks — Issue #940: CSV download for RCJ hearing lists

Work top to bottom. Section 1 is a prerequisite: nothing downstream is testable end to end until the
blob container defect is fixed.

## 1. Fix the blob container defect (blocking prerequisite)

- [ ] Pass `CONTAINER.PUBLICATIONS` to `downloadBlob` in `apps/web/src/pages/(list-types)/sjp-download-shared.ts:18`
- [ ] Pass `CONTAINER.PUBLICATIONS` to both `getBlobProperties` calls in `sjp-download-shared.ts:34`
- [ ] Pass `CONTAINER.PUBLICATIONS` to both `getBlobProperties` calls in `apps/web/src/pages/(list-types)/sjp-press-list/index.ts:58`
- [ ] Update the existing SJP download unit tests to assert the **container argument**, not just the blob key
- [ ] Manually verify an existing SJP PDF/Excel download works locally against a seeded artefact

## 2. Shared CSV utility (`libs/list-types/common`)

- [ ] Add `"papaparse": "5.5.4"` and `"@types/papaparse": "5.5.2"` to `libs/list-types/common/package.json` (match the pins in `libs/system-admin-pages/package.json:37,43`)
- [ ] Create `libs/list-types/common/src/csv/csv-writer.ts` — `toCsvBuffer(headers, rows)`: map every cell through `sanitiseCellValue`, call `Papa.unparse`, prefix the UTF-8 BOM, return a `Buffer`
- [ ] Create `libs/list-types/common/src/csv/csv-storage.ts` — `saveCsvToStorage(artefactId, buffer)` uploading `${artefactId}.csv` to `CONTAINER.PUBLICATIONS`, mirroring `src/excel/excel-utilities.ts:40`
- [ ] Create `libs/list-types/common/src/csv/sectioned-hearing-rows.ts` — `buildSectionedHearingRows(sections, options)` over `StandardHearing`, with `includeSection` and `includeDate` options
- [ ] Add a `downloads` block to `libs/list-types/common/src/locales/en.ts` (`heading`, `pdfLink`, `csvLink`, `toDevice`)
- [ ] Add the matching `downloads` block to `libs/list-types/common/src/locales/cy.ts` using `[WELSH TRANSLATION REQUIRED: '...']` placeholders
- [ ] Export `toCsvBuffer`, `saveCsvToStorage`, `buildSectionedHearingRows`, `downloadsEn`, `downloadsCy` from `libs/list-types/common/src/index.ts`
- [ ] Confirm no import of `@hmcts/publication` was introduced into `libs/list-types/common` (would be circular)

## 3. Family A generator — RCJ standard (8 list types)

- [ ] Add a `csvHeaders` block (`listName`) to `libs/list-types/rcj-standard-daily-cause-list/src/locales/en.ts`
- [ ] Add the matching `csvHeaders` block to `.../locales/cy.ts` with Welsh placeholders
- [ ] Create `libs/list-types/rcj-standard-daily-cause-list/src/csv/csv-generator.ts` — `generateRcjStandardDailyCauseListCsv`, calling `renderStandardDailyCauseList` with the same arguments as `src/pdf/pdf-generator.ts` and resolving `listTitle` from the **same `LIST_TITLE_MAP`** (`pdf-generator.ts:25`)
- [ ] Resolve `provenanceLabel` from `PROVENANCE_LABELS` for the Data source column
- [ ] Build rows via `buildSectionedHearingRows` (no section, no date) and save via `saveCsvToStorage`
- [ ] Export the generator from `libs/list-types/rcj-standard-daily-cause-list/src/index.ts`

## 4. Family B generator — London Administrative Court

- [ ] Add `csvHeaders` (`listName`, `section`) to `libs/list-types/london-administrative-court-daily-cause-list/src/locales/en.ts` and `cy.ts`
- [ ] Create `.../src/csv/csv-generator.ts` — emit `mainHearings` then `planningCourt` with `includeSection: true`, reusing the existing `t.mainHearingsTitle` / `t.planningCourtTitle` keys (`locales/en.ts:17-18`)
- [ ] Export from `.../src/index.ts`

## 5. Family C generator — Court of Appeal Civil

- [ ] Add `csvHeaders` (`listName`, `section`, `date`) to `libs/list-types/court-of-appeal-civil-daily-cause-list/src/locales/en.ts` and `cy.ts`
- [ ] Create `.../src/csv/csv-generator.ts` — emit `dailyHearings` then `futureJudgments` with `includeSection: true, includeDate: true`, reusing `t.dailyHearingsTitle` / `t.futureJudgmentsTitle` (`locales/en.ts:22-23`)
- [ ] Leave the Date cell empty for daily-hearing rows
- [ ] Export from `.../src/index.ts`

## 6. Family D generators — Civil and Family cause lists

- [ ] Create `libs/list-types/daily-cause-list-common/src/rendering/duration-formatting.ts` — `formatDuration(durationAsHours, durationAsMinutes, t)`, extracted from `libs/list-types/civil-daily-cause-list/src/pdf/pdf-template.njk:66-87`
- [ ] Add the duration unit strings (`hour`, `hours`, `minute`, `minutes`) to the civil and family `locales/en.ts` and `cy.ts`
- [ ] Set `sitting.durationText` in `libs/list-types/daily-cause-list-common/src/rendering/renderer.ts` beside the existing `sitting.duration*` assignments
- [ ] Replace the inline `{% set %}` duration block with `{{ sitting.durationText }}` in `libs/list-types/civil-daily-cause-list/src/pdf/pdf-template.njk`
- [ ] Do the same in `libs/list-types/family-daily-cause-list/src/pdf/pdf-template.njk`
- [ ] Add `csvHeaders` (`listName`, `courtHouse`, `courtHouseAddress`, `courtRoom`, `judiciary`, `reportingRestriction`) to the civil and family `locales/en.ts` and `cy.ts`
- [ ] Create `libs/list-types/daily-cause-list-common/src/csv/csv-generator.ts` — `generateCauseListCsv(options, importEn, importCy, columnSet)`, `await`ing the async renderer and flattening the tree to one row per case with parent context repeated per row
- [ ] Create `libs/list-types/civil-daily-cause-list/src/csv/csv-generator.ts` — thin wrapper matching `src/pdf/pdf-generator.ts`: resolve `provenanceLabel`, delegate with `__dirname`, locale importers and the civil column set (`t.caseId`, no applicant/respondent)
- [ ] Create `libs/list-types/family-daily-cause-list/src/csv/csv-generator.ts` — same, with the family column set (`t.caseRef`, plus `t.applicant` and `t.respondent`)
- [ ] Append the case's `formattedReportingRestriction` as a trailing column (empty when none)
- [ ] Reproduce the PDF's `caseName` + ` [caseSequenceIndicator]` composition exactly
- [ ] Export both generators from their libs' `src/index.ts`

## 7. Publication pipeline (`libs/publication`)

- [ ] Add `interface GenerateCsvParams` to `libs/publication/src/processing/service.ts` — copy `GenerateExcelParams` (lines 338–346) and **add `provenance`**
- [ ] Add `CSV_GENERATOR_REGISTRY: Partial<Record<string, CsvGenerator>>` keyed by `listTypeName`, with all 12 entries; reuse one `rcjStandardCsvGenerator` for the 8 family-A names (pattern: `rcjStandardGenerator`, line 90)
- [ ] Add `listTypeHasCsv(listTypeName)` mirroring `listTypeHasExcel` (line 386)
- [ ] Add `generatePublicationCsv(params)` mirroring `generatePublicationExcel` (line 390): `{}` for unknown type, `{ hasCsv: true }` on success, `console.warn`/`console.error` + `{}` on failure — never throw
- [ ] Call `generatePublicationCsv` in `processPublication` (line 586) after the Excel call, setting `result.csvPath = \`${artefactId}.csv\`` for logging only
- [ ] Confirm nothing was threaded into `sendPublicationNotificationsForArtefact` (not needed — see plan §1.6)
- [ ] Confirm `sendThirdPartyPublications` is unchanged (CSV out of scope for third parties)
- [ ] Verify no numeric `listTypeId` is used anywhere in the new code

## 8. Download routes and page download section

- [ ] Rename `apps/web/src/pages/(list-types)/sjp-download-shared.ts` to `list-download-shared.ts` and update the SJP importers
- [ ] Extend `ALLOWED_TYPES` to `new Set(["pdf", "xlsx", "csv"])`
- [ ] Add a `${artefactId}.csv` probe to `getAvailableFiles`
- [ ] Add `buildDownloadSection(artefactId, prefix, locale)` returning `{ heading, links: [{ href, text }] }`, resolving copy from `downloadsEn`/`downloadsCy` and sizes from the existing `formatFileSize`
- [ ] Verify `getContentType` already returns `text/csv` for `.csv` (`libs/publication/src/file-storage/content-type.ts`) — no change expected
- [ ] Create `libs/web-core/src/views/components/list-downloads.njk` — heading plus `govuk-link` anchors; renders nothing when `downloads.links` is empty
- [ ] Make `render` in `createMultiListGuardAndRender` async (`apps/web/src/pages/(list-types)/list-type-handler.ts:267`) and `await buildDownloadSection`, adding `downloads` to the render model
- [ ] Add `downloads` to `createCauseListRender` (`list-type-handler.ts:225`, already async)
- [ ] Verify `createSimpleListTypeHandler` (:107) and `createListTypeHandler` (:30) still work with the now-async render
- [ ] Include the partial in all 8 `apps/web/src/pages/(list-types)/rcj-standard-daily-cause-list/*.njk` templates
- [ ] Include the partial in `london-administrative-court-daily-cause-list/index.njk`
- [ ] Include the partial in `court-of-appeal-civil-daily-cause-list/index.njk`
- [ ] Include the partial in `civil-daily-cause-list/index.njk` and `family-daily-cause-list/index.njk`
- [ ] Create `rcj-standard-daily-cause-list/download.ts` exporting `GET` plus `ROUTES` listing all 8 URLs each suffixed `/download` (a `ROUTES` export replaces the derived path — `libs/simple-router/dist/simple-router.js:84-89`)
- [ ] Create `london-administrative-court-daily-cause-list/download.ts` with `ROUTES = ["/london-administrative-court-daily-cause-list/download"]`
- [ ] Create `court-of-appeal-civil-daily-cause-list/download.ts` with `ROUTES = ["/court-of-appeal-civil-division-daily-cause-list/download"]`
- [ ] Create `civil-daily-cause-list/download.ts` (derived path, no `ROUTES` needed)
- [ ] Create `family-daily-cause-list/download.ts` (derived path, no `ROUTES` needed)
- [ ] Confirm all 12 download URLs resolve locally and that a bad `artefactId` returns 400

## 9. Email notifications

- [ ] Add `csvBuffer?` to `EmailTemplateData` (`libs/notifications/src/notification/notification-service.ts:349-354`)
- [ ] Probe `downloadBlob(\`${artefactId}.csv\`, CONTAINER.PUBLICATIONS)` in `buildEmailDataWithFiles` (:457-489)
- [ ] Compute `hasCsv` and `csvUnder2MB` against `MAX_PDF_SIZE_BYTES` (:116) and fold `csvUnder2MB` into `filesUnder2MB`
- [ ] Return `csvBuffer` only when it is under 2MB
- [ ] Pass `csvBuffer` to `sendEmail` in `processUserNotification` (:378) and `processListTypeUserNotification` (:601)
- [ ] Add `csvBuffer?` to `SendEmailParams` (`libs/notifications/src/govnotify/govnotify-client.ts:32-38`)
- [ ] Add the `csvBuffer` `prepareUpload` block after the `excelBuffer` block (:83-90), setting `csv_link_to_file` and `csv_link_text`
- [ ] Add `hasCsv` to `getSubscriptionTemplateId` (`libs/notifications/src/govnotify/template-config.ts:15`) with a `hasPdf && hasCsv` branch
- [ ] Add `GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION_PDF_CSV` with a fallback chain to `..._SUBSCRIPTION_PDF_EXCEL` then `..._NON_SJP_PDF` — degrade, do not throw
- [ ] Leave `PublicationEvent.excelPath` (`libs/notifications/src/notification/validation.ts:21`) alone; do not add a `csvPath` twin (it would be equally dead)

## 10. Config and helm

- [ ] Add `GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION_PDF_CSV=` to `apps/web/.env.example` near lines 55–59
- [ ] Add the key to `apps/web/helm/values.yaml` beside `..._SUBSCRIPTION_PDF_EXCEL` (lines 23–27)
- [ ] Add the key to `apps/web/helm/values.dev.yaml`
- [ ] Add the key to `apps/api/helm/values.yaml` beside the existing Notify IDs (lines 10–12)
- [ ] Do **not** create `apps/api/helm/values.dev.yaml` — it does not exist and is not needed
- [ ] Raise the GOV.UK Notify request for the new PDF+CSV template (see CLARIFICATIONS #3)

## 11. Unit tests

- [ ] `libs/list-types/common/src/csv/csv-writer.test.ts` — BOM, quoting/escaping round-trip via `Papa.parse`, formula-injection prefixing for `=`/`+`/`-`/`@`, header-only output for empty rows
- [ ] `libs/list-types/common/src/csv/csv-storage.test.ts` — asserts key **and** `CONTAINER.PUBLICATIONS`
- [ ] `libs/list-types/common/src/csv/sectioned-hearing-rows.test.ts` — section/date columns per options, fixed column order
- [ ] `libs/list-types/rcj-standard-daily-cause-list/src/csv/csv-generator.test.ts` — exact header row (en + cy), exact cells for a populated hearing, header-only for an empty list
- [ ] `libs/list-types/london-administrative-court-daily-cause-list/src/csv/csv-generator.test.ts` — both sections emitted with correct labels
- [ ] `libs/list-types/court-of-appeal-civil-daily-cause-list/src/csv/csv-generator.test.ts` — date populated for future judgments, empty for daily hearings
- [ ] `libs/list-types/daily-cause-list-common/src/csv/csv-generator.test.ts` — tree flattening, parent context repeated per row, reporting restriction column
- [ ] `libs/list-types/daily-cause-list-common/src/rendering/duration-formatting.test.ts` — hours only, minutes only, both, zero, singular vs plural
- [ ] `libs/publication/src/processing/service.test.ts` — `CSV_GENERATOR_REGISTRY` key set equals the 12 names; `generatePublicationCsv` swallows and logs; `processPublication` succeeds when the CSV generator throws
- [ ] `libs/notifications/src/notification/notification-service.test.ts` — csv present / absent / oversize
- [ ] `libs/notifications/src/govnotify/govnotify-client.test.ts` — `csv_link_to_file` and `csv_link_text` set only when the buffer exists
- [ ] `libs/notifications/src/govnotify/template-config.test.ts` — every branch and every fallback of `getSubscriptionTemplateId`
- [ ] `apps/web/src/pages/(list-types)/list-download-shared.test.ts` — `csv` accepted, unknown type 400, non-UUID 400, `text/csv` content type, `Content-Disposition` filename, container argument asserted, `buildDownloadSection` omits absent files and returns an empty list when nothing exists
- [ ] Use `listTypeId: 999` with a real `listTypeName` in every new artefact fixture
- [ ] Add locale key-parity assertions (`Object.keys(en).sort()` vs `cy`) for every edited locale pair, including nested `csvHeaders` and `downloads`

## 12. Template tests

- [ ] `libs/web-core/src/views/components/list-downloads.njk.test.ts` — two links render two anchors with expected `href`/text; empty list renders no heading and no anchor
- [ ] Extend all 8 `rcj-standard-daily-cause-list/*.njk.test.ts` — download section present when populated, absent when empty, Welsh copy when rendered with `cy`
- [ ] Extend the london-admin, COA civil, civil and family `*.njk.test.ts` files the same way
- [ ] Add regression assertions to the civil and family PDF template tests that `sitting.durationText` renders and duration output is unchanged after the extraction
- [ ] Use `createTestEnvironment`/`render` from `@hmcts/test-support` with Cheerio structural assertions and `toHaveLength`; no raw-HTML matching, no AAA comments

## 13. Field-parity guard test (AC2 protection)

- [ ] Create `libs/list-types/common/src/csv/field-parity.test.ts`
- [ ] Export a column-map constant from each family's CSV generator so the test can read it
- [ ] For each family, read the PDF `.njk` source, extract data expressions rendered in table cells via a regex over `{{ ... }}`, and assert each appears in that family's CSV column map
- [ ] Add a curated `EXCLUDED_FIELDS` set for deliberate omissions (static narrative copy, layout artefacts, the unrendered representative fields), each with a one-line reason
- [ ] Verify the test fails when a field is added to a PDF template but not to the CSV

## 14. E2E test

- [ ] Create `e2e-tests/tests/rcj-list-downloads.spec.ts`, tagged `@nightly`, as **one** journey test
- [ ] Cover: navigate to a seeded RCJ list, assert both PDF and CSV links, run `AxeBuilder` inline, switch to Welsh and assert the translated download heading, keyboard-navigate to and activate the CSV link, assert the downloaded filename and non-empty content, and assert `400` for a non-UUID `artefactId`
- [ ] Do not add separate specs per list type, per validation, per language or per accessibility check

## 15. Final checks

- [ ] `yarn lint:fix` and `yarn format` from the root
- [ ] `yarn test` from the root
- [ ] `yarn test:e2e` from the root
- [ ] Verify every relative import in new files carries a `.js` extension
- [ ] Verify no `types.ts` or generic `utils.ts` file was created
- [ ] Verify no numeric `listTypeId` appears in new code, comments or JSDoc
- [ ] Confirm no Prisma schema or migration change was made
- [ ] Manually verify a Welsh CSV opens in Excel with correct diacritics
