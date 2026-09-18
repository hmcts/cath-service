# Implementation Tasks — Issue #659

## Implementation Tasks

### Pre-work (resolve blockers)
- [x] Q1 RESOLVED — use ChD/KB column set: Judge, Time, Venue, Type, Case Number, Case Name, Additional Information
- [x] Q2 RESOLVED — leave `CIRCUIT_COMMERCIAL_COURT_DAILY_CAUSE_LIST` in place (removal is a follow-up ticket)
- [x] Q3 (section order) — implement literal AC order for now; Q5 (venue Welsh name) — use "Adran Busnes ac Eiddo - Adeilad Rolls"; Q4 missing Welsh strings — use `[WELSH TRANSLATION REQUIRED: ...]` markers where not supplied

### Reference data
- [x] Rename `locationId: 26` `name` to "Business and Property Division Rolls Building" in `libs/location/src/location-data.ts:188`
- [x] Update `welshName` on `locationId: 26` (pending Q5) → "Adran Busnes ac Eiddo - Adeilad Rolls"
- [x] Add `BUSINESS_AND_PROPERTY_DIVISION_ROLLS_BUILDING_DAILY_CAUSE_LIST` entry to `libs/list-types/common/src/list-type-data.ts` (isNonStrategic: true, Public, CFT_IDAM, subJurisdictionIds: [10])
- [x] Add `INTERIM_APPLICATIONS_DAILY_CAUSE_LIST` entry to `list-type-data.ts` (same flags)
- [x] Delete `BUSINESS_AND_PROPERTY_DAILY_CAUSE_LIST` from `list-type-data.ts` (soft-delete auto)
- [x] Delete `COMPANIES_WINDING_UP_CHD_DAILY_CAUSE_LIST` from `list-type-data.ts`
- [x] Delete `FINANCIAL_LIST_CHD_KB_DAILY_CAUSE_LIST` from `list-type-data.ts`
- [x] Run `yarn db:generate` and verify seed generation

### Common lib additions
- [x] Add `validateEmailFormat` to `libs/list-types/common/src/conversion/validators.ts` (+ test)
- [x] Add ChD/KB field config to `rcj-field-configs.ts` if Q1 = ChD/KB set (`CHD_KB_EXCEL_CONFIG_SIMPLE_TIME` + test)

### Package A — business-and-property-division-rolls-building-daily-cause-list
- [x] Scaffold package (package.json with build/build:nunjucks/build:schemas, tsconfig.json)
- [x] Register in root `tsconfig.json` paths
- [x] Create `src/sections.ts` — `SECTIONS` single source of truth (16 entries, key + en + cy)
- [x] Create `src/config.ts` (moduleRoot, assets, schemaPath)
- [x] Create `src/models/types.ts` — data type derived from `SECTIONS`
- [x] Create `src/conversion/*-config.ts` — `createMultiSheetConverter` over `SECTIONS`; `registerConverterByName` + test
- [x] Create `src/schemas/*.json` — one array property per section key
- [x] Create `src/validation/json-validator.ts` — `validateBusinessAndPropertyDivisionRollsBuildingDailyCauseList`
- [x] Create `src/validation/json-validator.test.ts` — one `it` per required field per section (CI guard)
- [x] Create `src/rendering/renderer.ts` — loop `SECTIONS`, `normaliseHearings` + test
- [x] Create `src/locales/en.ts` + `cy.ts` — pageTitle, 16 labels, open-justice wording, "No hearings scheduled for this day"
- [x] Create `src/pdf/pdf-generator.ts` + `pdf-template.njk` (loops SECTIONS) + test
- [x] Create `src/email-summary/summary-builder.ts` (copy London Admin)
- [x] Create `src/index.ts` — side-effect converter import + locale/business/validate* exports

### Package B — interim-applications-daily-cause-list
> CONSOLIDATED: the newly-scaffolded duplicate was deleted and the existing
> `interim-applications-chd-daily-cause-list` package was renamed/repurposed instead (drop "chd"
> everywhere; list-type name → `INTERIM_APPLICATIONS_DAILY_CAUSE_LIST`; old CHD entry removed so the
> deploy seed soft-deletes it for MI). Content updated to ticket wording; paragraph 3 added; SCD
> caution notes kept. Uses the existing `openJusticeStatementDetails` config-tab mechanism (name +
> email), not a new `JUDGE_DETAILS_CONFIG`.
- [x] Delete duplicate package + page + wiring
- [x] Rename existing CHD lib package (folder, npm name, symbols, config/schema filenames)
- [x] Rename web page dir + njk/tests; update guard/logPrefix/ROUTES/render name to `INTERIM_APPLICATIONS_DAILY_CAUSE_LIST`
- [x] Re-point publication PDF registry, notifications email registry, app.ts modulePaths, upload side-effects, tsconfig paths, 3× package.json deps
- [x] Update content: title, open-justice para 1 (no comma), add para 3, empty message "for this day"; keep SCD notes; en/cy parity
- [x] Add `thirdParagraph` to renderer + web njk + pdf njk; update renderer/pdf/page/njk tests
- [x] Remove old `INTERIM_APPLICATIONS_CHD_DAILY_CAUSE_LIST` entry from `list-type-data.ts` (soft-delete auto on deploy)

### Web pages
- [x] Create `apps/web/src/pages/(list-types)/business-and-property-division-rolls-building-daily-cause-list/index.ts` (createSimpleListTypeHandler, guard on listTypeName)
- [x] Create its `.njk` template (loops SECTIONS, empty-section message)
- [x] Create `index.test.ts` + `*.njk.test.ts` (structural + Welsh + locale-key parity)
- [x] Create `apps/web/src/pages/(list-types)/interim-applications-daily-cause-list/index.ts`
- [x] Create its `.njk` template (judge details interpolation)
- [x] Create `index.test.ts` + `*.njk.test.ts`

### Registration
- [x] Add both packages to `apps/web/package.json` dependencies (`workspace:*`)
- [x] Add both packages to `apps/api/package.json` dependencies — N/A: API resolves list types transitively via `@hmcts/publication` (matches existing London Admin pattern; London Admin is not in api package.json either). Added instead to `@hmcts/publication` and `@hmcts/notifications` package.json.
- [x] Add both `moduleRoot` imports to `apps/web/src/app.ts` and to `modulePaths`
- [x] Add both side-effect imports to `apps/web/src/pages/(admin)/non-strategic-upload/index.ts` (and `non-strategic-upload-summary/index.ts`)
- [x] Add both entries to `PDF_GENERATOR_REGISTRY` in `libs/publication/src/processing/service.ts` (+ imports)
- [x] Add both entries to `EMAIL_BUILDER_REGISTRY` in `libs/notifications/src/notification/notification-service.ts` (+ imports)

### Verification
- [x] Produce fixture workbooks (16-tab and 2-tab) for converter/E2E tests (Q8) — generated programmatically in the converter tests (`*-config.test.ts`) using ExcelJS; E2E seeds JSON directly
- [x] `yarn lint:fix` and `yarn test` pass across affected workspaces (only pre-existing `server.test.ts` EADDRINUSE flake — passes once port 8080 is free)
- [x] Add/adjust one E2E journey covering venue landing → list selection → rendered multi-section list (inline Welsh + accessibility) — `e2e-tests/tests/business-and-property-division-rolls-building-daily-cause-list.spec.ts` (`@nightly`)
- [ ] Release checklist (ops/business, not code): post-deploy caution message (Q4), `/list-search-config` entries (Q10), MI mapping (Q6)
