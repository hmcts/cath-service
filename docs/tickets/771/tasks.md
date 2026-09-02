# #771: Magistrates Standard List - Implementation Tasks

## Implementation Tasks

### Scaffold the library

- [ ] Create directory `libs/list-types/magistrates-standard-list/src/`
- [ ] Create `libs/list-types/magistrates-standard-list/package.json` (copy from `civil-and-family-daily-cause-list`, update name and remove unneeded deps like `@hmcts/daily-cause-list-common`)
- [ ] Create `libs/list-types/magistrates-standard-list/tsconfig.json` (copy from `civil-and-family-daily-cause-list`)

### JSON Schema and validation

- [ ] Obtain the canonical `magistrates_standard_list.json` schema from pip-data-management
- [ ] Create `libs/list-types/magistrates-standard-list/src/schemas/magistrates-standard-list.json`
- [ ] Create `libs/list-types/magistrates-standard-list/src/validation/json-validator.ts` with `validateMagistratesStandardList()`
- [ ] Create `libs/list-types/magistrates-standard-list/src/validation/json-validator.test.ts` with valid and invalid fixture tests

### TypeScript types

- [ ] Create `libs/list-types/magistrates-standard-list/src/models/types.ts` with interfaces for `MagistratesStandardListData`, `MagistratesCourtList`, `MagistratesCourtHouse`, `MagistratesCourtRoom`, `MagistratesSitting`, `MagistratesHearing`, `MagistratesDefendant`, and `RenderOptions` — confirming field names against the actual JSON schema

### Renderer

- [ ] Create `libs/list-types/magistrates-standard-list/src/rendering/renderer.ts` with `renderMagistratesStandardListData()` that:
  - Looks up the location name via `getLocationById` and picks Welsh name if `locale === "cy"`
  - Formats `contentDate` and `lastUpdated` timestamps in the correct locale
  - Annotates each defendant with a `formattedReportingRestriction` string (joined from `reportingRestrictionDetail` array)
  - Returns `{ header, listData }` (no `openJustice` object — magistrates uses the restriction section instead)
- [ ] Create `libs/list-types/magistrates-standard-list/src/rendering/renderer.test.ts` covering: header formatting, Welsh locale, empty court list, defendant with reporting restriction, defendant without reporting restriction

### Locale files (lib-level)

- [ ] Create `libs/list-types/magistrates-standard-list/src/locales/en.ts` with `errorTitle`, `errorMessage`, `error403Title`, `error403Message`
- [ ] Create `libs/list-types/magistrates-standard-list/src/locales/cy.ts` with Welsh equivalents

### PDF generator

- [ ] Create `libs/list-types/magistrates-standard-list/src/pdf/pdf-template.njk` as a self-contained HTML template matching the HTML view layout, including the static reporting restriction section and the defendant hearings table
- [ ] Create `libs/list-types/magistrates-standard-list/src/pdf/pdf-generator.ts` with `generateMagistratesStandardListPdf()` following the same pattern as `generateCauseListPdf` in `civil-and-family-daily-cause-list`
- [ ] Create `libs/list-types/magistrates-standard-list/src/pdf/pdf-generator.test.ts` covering: successful generation, Welsh locale, PDF generation failure, renderer error, missing provenance

### Config and index

- [ ] Create `libs/list-types/magistrates-standard-list/src/config.ts` exporting `moduleRoot`, `assets`, `schemaPath`
- [ ] Create `libs/list-types/magistrates-standard-list/src/config.test.ts` verifying `moduleRoot` and `assets` paths
- [ ] Create `libs/list-types/magistrates-standard-list/src/index.ts` exporting `validateMagistratesStandardList`, `renderMagistratesStandardListData`, `generateMagistratesStandardListPdf`, locale exports (`magistratesStandardListEn`, `magistratesStandardListCy`), and all types
- [ ] Create `libs/list-types/magistrates-standard-list/src/index.test.ts` verifying all expected exports are present

### Page controller and template

- [ ] Create `apps/web/src/pages/(list-types)/magistrates-standard-list/en.ts` with all content keys from the ticket (title, listDate, lastUpdated, publishedAt, venueAddress, openJusticeTitle, dataSource, column headers, reporting restriction keys, noHearings, linkToTop, plus errorTitle/errorMessage)
- [ ] Create `apps/web/src/pages/(list-types)/magistrates-standard-list/cy.ts` with all Welsh content keys
- [ ] Create `apps/web/src/pages/(list-types)/magistrates-standard-list/magistrates-standard-list.njk` extending `layouts/base-template.njk`, including: venue header, reporting restriction section, Open Justice collapsible, case search input, court room accordion with defendant table, empty state message, back to top, data source attribution
- [ ] Create `apps/web/src/pages/(list-types)/magistrates-standard-list/index.ts` using `createListTypeHandler` with `validateMagistratesStandardList`, `renderMagistratesStandardListData`, `checkAccess: true`
- [ ] Create `apps/web/src/pages/(list-types)/magistrates-standard-list/index.test.ts` covering: missing artefactId (400), artefact not found (404), JSON blob not found (404), validation failure (400), access denied (403), successful render in English, successful render in Welsh, locale defaulting to English, 500 on unexpected error

### Register the module

- [ ] Add path alias to root `tsconfig.json`: `"@hmcts/magistrates-standard-list": ["libs/list-types/magistrates-standard-list/src"]`
- [ ] Add dependency to `apps/web/package.json`: `"@hmcts/magistrates-standard-list": "workspace:*"`
- [ ] Add `moduleRoot` import and entry to `modulePaths` array in `apps/web/src/app.ts`
- [ ] Add list type entry to `libs/location/src/list-type-data.ts` with the correct ID and `CRIME_IDAM` provenance
- [ ] Add dependency `@hmcts/magistrates-standard-list` to `libs/publication/package.json`
- [ ] Add `MAGISTRATES_STANDARD_LIST` entry to `PDF_GENERATOR_REGISTRY` in `libs/publication/src/processing/service.ts`

### Verify

- [ ] Run `yarn test` from the repo root and confirm all tests pass
- [ ] Verify the page renders at `GET /magistrates-standard-list?artefactId=<id>` with a valid fixture
- [ ] Verify Welsh content at `GET /magistrates-standard-list?artefactId=<id>&lng=cy`
- [ ] Verify 400 is returned when `artefactId` is absent
