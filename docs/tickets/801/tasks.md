# #801 — Chancery Appeals (ChD) Daily Cause List

## Implementation Tasks

### Library scaffolding — `libs/list-types/chancery-appeals-chd-daily-cause-list/`
- [ ] Create the module directory and copy `package.json` from `rcj-standard-daily-cause-list`, renaming to `@hmcts/chancery-appeals-chd-daily-cause-list` (keep `build`/`build:nunjucks`/`build:schemas`, `dev`, `test`, `lint`, `format` scripts and deps: `@hmcts/list-types-common`, `@hmcts/pdf-generation`, `@hmcts/postgres-prisma`, `exceljs`, `luxon`, `nunjucks`).
- [ ] Create `tsconfig.json` extending `../../../tsconfig.json` (outDir `dist`, rootDir `src`, exclude tests + `src/assets`).
- [ ] Create `src/config.ts` exporting `moduleRoot`, `assets`, and `schemaPath` (points at `schemas/chancery-appeals-chd-daily-cause-list.json`).

### Model + schema + validator
- [ ] Create `src/models/types.ts` with `ChanceryAppealsChdHearing` (judge, time, venue, type, caseNumber, caseName, additionalInformation) and `ChanceryAppealsChdHearingList = ChanceryAppealsChdHearing[]`.
- [ ] Create `src/schemas/chancery-appeals-chd-daily-cause-list.json` (root array; item required = all fields except `additionalInformation`; time pattern `^\d{1,2}([:.]\d{2})?[ap]m\s*$`; no-HTML pattern on every free-text field; `title`/`examples` per field, in #801 order).
- [ ] Create `src/validation/json-validator.ts` exporting `validateChanceryAppealsChdDailyCauseList` via `createJsonValidator(schemaPath)`.
- [ ] Create `src/validation/json-validator.test.ts` — real-schema tests: one `it` per required field (deep-clone valid fixture, delete field, assert invalid) plus a valid-data case.

### Excel converter (bespoke config)
- [ ] Create `src/conversion/chancery-appeals-chd-daily-cause-list-config.ts` with a bespoke `ExcelConverterConfig` (columns Judge, Time, Venue, Type, Case Number, Case Name, Additional Information; `validateTimeFormatSimple` for time; `validateNoHtmlTags` for free text; `minRows: 1`) and `registerConverterByName("CHANCERY_APPEALS_CHD_DAILY_CAUSE_LIST", createConverter(config))`.
- [ ] Add a converter test asserting correct field mapping/order and required-column enforcement (once Excel header wording is confirmed — §5 open question 5).

### Rendering
- [ ] Create `src/rendering/renderer.ts` (`renderChanceryAppealsChd(list, { locale, listTitle, contentDate, lastReceivedDate })` returning `{ header, hearings }` via `normaliseHearings`, `formatDisplayDate`, `formatLastUpdatedDateTime`).
- [ ] Create `src/rendering/renderer.test.ts` (header fields, hearing normalisation, Welsh locale).

### Locales
- [ ] Create `src/locales/en.ts` and `src/locales/cy.ts` (page title, table column headings, "no hearings" message, important-information copy, provenance labels). Mark unknown Welsh as `[WELSH TRANSLATION REQUIRED: "..."]`.

### PDF
- [ ] Create `src/pdf/pdf-template.njk` (single table, #801 column order, `PDF_BASE_STYLES`).
- [ ] Create `src/pdf/pdf-generator.ts` (`generateChanceryAppealsChdDailyCauseListPdf(options)` extending `BasePdfGenerationOptions<ChanceryAppealsChdHearingList>` with `contentDate` + `listTypeName`; `LIST_TITLE_MAP`).
- [ ] Create `src/pdf/pdf-generator.test.ts` (happy path + error result).

### Email summary
- [ ] Create `src/email-summary/summary-builder.ts` (`extractCaseSummary` → Time / Case number / Case name; re-export `formatCaseSummaryForEmail`, `SPECIAL_CATEGORY_DATA_WARNING`).

### Module index
- [ ] Create `src/index.ts`: `import "./conversion/chancery-appeals-chd-daily-cause-list-config.js"` (side-effect); export types, renderer, pdf-generator, email-summary, locales as `chanceryAppealsChdDailyCauseListEn/Cy`, and `validateChanceryAppealsChdDailyCauseList`.

### Page controller — `apps/web/src/pages/(list-types)/chancery-appeals-chd-daily-cause-list/`
- [ ] Create `index.ts` using `createSimpleListTypeHandler<ChanceryAppealsChdHearingList>` (SUPPORTED_LIST_TYPE guard on `artefact.listTypeName`; `validate` from `@hmcts/chancery-appeals-chd-daily-cause-list/config`; render via `renderChanceryAppealsChd` + `resolveDataSource`; optional `ROUTES`).
- [ ] Create `chancery-appeals-chd-daily-cause-list.njk` (extends `layouts/base-template.njk`; single table Judge/Time/Venue/Type/Case Number/Case Name/Additional Information; `govukDetails` important-info box; table-search input; back-to-top).
- [ ] Create `index.test.ts` (success, missing artefactId → 400, not found → 404, wrong list type → 400, missing JSON → 404, validation fail → 400, server error → 500, Welsh locale).
- [ ] Create `chancery-appeals-chd-daily-cause-list.njk.test.ts` (Cheerio: heading, column count/order, conditional additionalInformation, no-hearings message, Welsh headings, en/cy key parity).

### Registration touch-points
- [ ] `tsconfig.json` (root): add `@hmcts/chancery-appeals-chd-daily-cause-list` and `/config` path mappings.
- [ ] `libs/list-types/common/src/list-type-data.ts`: add the `ListTypeData` entry (name, english/welsh friendly names, provenance `CFT_IDAM`, urlPath, `isNonStrategic: true`, `defaultSensitivity: "Public"`, `subJurisdictionIds`).
- [ ] `apps/postgres/prisma/scripts/001_insert_missing_list_types.sql`: add the idempotent list-type row.
- [ ] `apps/postgres/prisma/scripts/003_upsert_sub_jurisdictions_and_list_type_links.sql`: add the `(CHANCERY_APPEALS_CHD_DAILY_CAUSE_LIST, <subJurisdictionId>)` junction mapping.
- [ ] `libs/publication/src/processing/service.ts`: import the PDF generator + type and add the `CHANCERY_APPEALS_CHD_DAILY_CAUSE_LIST` entry to `PDF_GENERATOR_REGISTRY`.
- [ ] `apps/web/src/app.ts`: import `moduleRoot as chanceryAppealsChdModuleRoot` from `@hmcts/chancery-appeals-chd-daily-cause-list/config` and add it to `modulePaths`.

### Verification
- [ ] Run `yarn lint:fix` and `yarn format`.
- [ ] Run `yarn test` (includes the CI guard test in `libs/list-types/common/src/validation/guard.test.ts` and the new validator/renderer/pdf/controller/template tests).
- [ ] Confirm Welsh renders with `?lng=cy`.
- [ ] Manually compare the page against the staging style-guide URL.
- [ ] Resolve the open questions in `plan.md` §5 before finalising seed data and copy.
