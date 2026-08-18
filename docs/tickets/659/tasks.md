# Tasks — Issue #659

## Implementation Tasks

### Reference data

- [ ] Rename `locationId: 26` in `libs/location/src/location-data.ts:187-193` to "Business and Property Division Rolls Building" (keep `locationId`, `regions: [11]`, `subJurisdictions: [10]`); update `welshName` per CQ-1
- [ ] Add `BUSINESS_AND_PROPERTY_DIVISION_ROLLS_BUILDING_DAILY_CAUSE_LIST` to `libs/list-types/common/src/list-type-data.ts` (`isNonStrategic: true`, `urlPath: "business-and-property-division-rolls-building-daily-cause-list"`, `welshFriendlyName: "Rhestr Achosion Dyddiol Adran Busnes ac Eiddo - Adeilad Rolls"`, `subJurisdictionIds: [10]`)
- [ ] Add `INTERIM_APPLICATIONS_DAILY_CAUSE_LIST` to `list-type-data.ts` (`isNonStrategic: true`, `urlPath: "interim-applications-daily-cause-list"`, `subJurisdictionIds: [10]`)
- [ ] Update `libs/location/src/location-data.test.ts` for the renamed venue
- [ ] Update / add `libs/list-types/common/src/list-type-data.test.ts` assertions: both new entries present, `urlPath` matches page directory, `isNonStrategic: true`

### Shared common-lib changes

- [ ] Add `CHD_KB_EXCEL_CONFIG_OPTIONAL` (same fields, `minRows: 0`) to `libs/list-types/chd-kb-common/src/conversion/chd-kb-excel-config.ts` and export from that package's `src/index.ts`
- [ ] Add `validateEmailFormat(value, rowNumber)` to `libs/list-types/common/src/conversion/validators.ts` and export from `libs/list-types/common/src/index.ts`
- [ ] Add unit tests for `validateEmailFormat` in `libs/list-types/common/src/conversion/validators.test.ts`
- [ ] Prefix per-sheet conversion errors with the worksheet name in `libs/list-types/common/src/conversion/multi-sheet-converter.ts:66-69` (try/catch rethrow)
- [ ] Create `libs/list-types/common/src/conversion/multi-sheet-converter.test.ts` covering: all sheets populated, missing sheet → `[]`, sheet resolved by name not index, worksheet-name-prefixed error, no-worksheet workbook throws

### Package: business-and-property-division-rolls-building-daily-cause-list

- [ ] Scaffold `libs/list-types/business-and-property-division-rolls-building-daily-cause-list/` (`package.json` with `build`/`build:nunjucks`/`build:schemas`, `tsconfig.json`, `src/config.ts` exporting `moduleRoot` + `schemaPath`, `src/index.ts`) mirroring `libs/list-types/london-administrative-court-daily-cause-list/`
- [ ] Create `src/sections.ts` — 16 `{ dataKey, worksheetName, localeKey, anchorId }` entries in the issue's order
- [ ] Add `src/sections.test.ts` — order preserved, 16 entries, unique `dataKey`/`anchorId`
- [ ] Create `src/models/types.ts` — `RollsBuildingData` (16 arrays of `ChdKbHearing`), `RollsBuildingSection`
- [ ] Create `src/conversion/business-and-property-division-rolls-building-daily-cause-list-config.ts` — `SheetConfig[]` from `SECTIONS` using `CHD_KB_EXCEL_CONFIG_OPTIONAL`, `createMultiSheetConverter`, `registerConverterByName`
- [ ] Add `src/conversion/...-config.test.ts` — 16-tab workbook populates every key, empty tab → `[]`, missing tab → `[]`, invalid time rejected with worksheet-prefixed message, HTML in a cell rejected
- [ ] Create `src/schemas/business-and-property-division-rolls-building-daily-cause-list.json` — root object, all 16 keys required, shared `$defs/hearing` with no-HTML and time patterns
- [ ] Create `src/validation/json-validator.ts` exporting `validateBusinessAndPropertyDivisionRollsBuildingDailyCauseList` via `createJsonValidator(schemaPath)`; export from `src/index.ts`
- [ ] Add `src/validation/json-validator.test.ts` — real schema, hydrated `VALID_DATA`, one assertion per required field per section (`describe.each(SECTIONS)` / `it.each(REQUIRED_FIELDS)`), deep clone with `JSON.parse(JSON.stringify(...))`
- [ ] Create `src/locales/en.ts` — page title, FaCT strings, address (`Rolls Building` / `Fetter Lane, London` / `EC4A 1NL`), 7 table headers, 16 section headings, `noHearingsMessage: "No hearings scheduled for this day"`, 4:30pm paragraph, Remote Hearings copy, `contactDetails: { role, email }[]` (5 entries), listing-office line, Remote Judgments copy, `provenanceLabels`
- [ ] Create `src/locales/cy.ts` — Welsh strings supplied in the issue verbatim; remainder marked `[WELSH TRANSLATION REQUIRED: ...]`
- [ ] Add `src/locales/locales.test.ts` — en/cy key parity including nested `sectionHeadings` and `tableHeaders`
- [ ] Create `src/rendering/renderer.ts` — returns `{ header, sections: [{ id, heading, hearings }] }` built from `SECTIONS` with `?? []`
- [ ] Add `src/rendering/renderer.test.ts` — 16 sections in order, empty sections retained, Welsh headings, header date/time formatting
- [ ] Create `src/pdf/pdf-generator.ts` + `src/pdf/pdf-template.njk` (all 16 sections, empty-section message, open-justice wording)
- [ ] Add `src/pdf/pdf-generator.test.ts` — generates with populated and empty sections, returns an error result rather than throwing on failure
- [ ] Create `src/email-summary/summary-builder.ts` — `extractCaseSummary` / `formatCaseSummaryForEmail` across all 16 sections
- [ ] Add `src/email-summary/summary-builder.test.ts`

### Package: interim-applications-daily-cause-list

- [ ] Scaffold `libs/list-types/interim-applications-daily-cause-list/` with the same layout
- [ ] Create `src/models/types.ts` — `{ hearings: ChdKbHearing[]; judgeDetails: { judgeName, judgeEmail }[] }`
- [ ] Create `src/conversion/interim-applications-daily-cause-list-config.ts` — 2 `SheetConfig`s (hearings via `CHD_KB_EXCEL_CONFIG_OPTIONAL`; local `JUDGE_DETAILS_CONFIG` with `minRows: 0` and `validateEmailFormat`), `registerConverterByName`
- [ ] Add `src/conversion/...-config.test.ts` — both tabs convert, blank judge tab → `[]`, invalid judge email rejected, extra judge rows ignored
- [ ] Create `src/schemas/interim-applications-daily-cause-list.json` — `required: ["hearings", "judgeDetails"]`, `judgeDetails` `maxItems: 1` with email + no-HTML patterns
- [ ] Create `src/validation/json-validator.ts` exporting `validateInterimApplicationsDailyCauseList`; export from `src/index.ts`
- [ ] Add `src/validation/json-validator.test.ts` — one `it` per required field at every nesting level
- [ ] Create `src/locales/en.ts` and `src/locales/cy.ts` — judge contact intro with `{judgeName}` / `{judgeEmail}` tokens, no-judge fallback, 2-hour-limit paragraph, "will not additionally appear in their individual list" paragraph (Welsh supplied in the issue)
- [ ] Add `src/locales/locales.test.ts` — en/cy key parity
- [ ] Create `src/rendering/renderer.ts` — interpolate judge name/email, fall back to the placeholder-free copy when `judgeDetails` is empty
- [ ] Add `src/rendering/renderer.test.ts` — interpolated output, fallback contains no `[name, email address]`
- [ ] Create `src/pdf/pdf-generator.ts` + `src/pdf/pdf-template.njk` and `src/pdf/pdf-generator.test.ts`
- [ ] Create `src/email-summary/summary-builder.ts` and its test

### Web pages

- [ ] Create `apps/web/src/pages/(list-types)/business-and-property-division-rolls-building-daily-cause-list/index.ts` — `ROUTES`, `createJsonValidator(schemaPath)`, `createSimpleListTypeHandler` with a `guardArtefact` on `artefact.listTypeName`
- [ ] Create the page `.njk` — `h1#top`, FaCT + address, `{% call govukDetails %}` open-justice block with 5 `mailto:` anchors, search input `#case-search-input`, jump-link list, `{% for section in sections %}` with `h2 id` + `aria-labelledby` table or empty-message `<p>`, data source, back-to-top
- [ ] Add `index.test.ts` — 400 missing artefactId, 404 missing artefact, 400 wrong `listTypeName`, 400 invalid JSON, successful render passes 16 sections
- [ ] Add `...njk.test.ts` (Cheerio) — 16 `h2` in order, jump links map 1:1 to heading ids, populated section renders a table with a unique accessible name, empty section renders the message and no table, all 5 contact emails present, Welsh render
- [ ] Create `apps/web/src/pages/(list-types)/interim-applications-daily-cause-list/index.ts` and its `.njk`
- [ ] Add `index.test.ts` and `...njk.test.ts` for Interim Applications, including an XSS fixture asserting `judgeName` is escaped and the `mailto:` href is encoded

### Registration

- [ ] Add both packages (and their `/config` subpaths) to `paths` in the root `tsconfig.json`
- [ ] Add both as `workspace:*` dependencies in `apps/web/package.json`, `libs/publication/package.json`, `libs/notifications/package.json`
- [ ] Add both `moduleRoot`s to `modulePaths` in `apps/web/src/app.ts:118-162`
- [ ] Add side-effect converter imports for both packages to `apps/web/src/pages/(admin)/non-strategic-upload/index.ts` and `non-strategic-upload-summary/index.ts`
- [ ] Add the missing `@hmcts/london-administrative-court-daily-cause-list` side-effect import to `non-strategic-upload/index.ts` so its pre-flight Excel validation runs
- [ ] Register both PDF generators in `PDF_GENERATOR_REGISTRY` (`libs/publication/src/processing/service.ts:148+`), keyed on list-type name
- [ ] Register both `{ extract, format }` summary entries in `libs/notifications/src/notification/notification-service.ts:190+`, keyed on list-type name
- [ ] Run `yarn install`, `yarn build`, `yarn lint:fix`

### Removals

- [ ] Delete `BUSINESS_AND_PROPERTY_DAILY_CAUSE_LIST` (`list-type-data.ts:751`) from `listTypeData`
- [ ] Delete `COMPANIES_WINDING_UP_CHD_DAILY_CAUSE_LIST` (`:791`) from `listTypeData`, keeping its package, page, converter, PDF and notification registrations for historic artefacts
- [ ] Delete `FINANCIAL_LIST_CHD_KB_DAILY_CAUSE_LIST` (`:802`) from `listTypeData`, keeping its package and registrations
- [ ] Resolve CQ-4 and, if confirmed in scope, delete `CIRCUIT_COMMERCIAL_COURT_DAILY_CAUSE_LIST` (`:761`)
- [ ] Verify `apps/postgres/prisma/generate-seed-sql.test.ts` covers soft-delete of the removed names (`deleted_at = NOW()`, not `DELETE`) and add cases if not
- [ ] Verify `libs/location/src/seed-list-types.test.ts` covers the same for the local seed path

### Cross-cutting tests

- [ ] Add regression assertions to `apps/web/src/pages/(public)/summary-of-publications/index.test.ts` — header composed with the renamed venue, only the 2 new list types listed for location 26, alphabetical ordering
- [ ] Add regression assertions to the `summary-of-publications` template test — FaCT anchor text/href and trailing text, caution message rendered below the FaCT link
- [ ] Add an E2E admin journey spec (`e2e-tests/tests/`) — upload the 16-tab workbook, both list types visible in the non-strategic dropdown, publish, view the venue page, view the list, inline Axe scan, `?lng=cy` check
- [ ] Add an E2E Interim Applications journey covering the 2-tab upload, judge wording, Axe scan and Welsh
- [ ] Commit fixture workbooks for both templates under `e2e-tests/fixtures/`
- [ ] Run `yarn test` and `yarn test:e2e`

### Post-deploy (operational, not code)

- [ ] Record the English and Welsh caution message copy for a system admin to enter via `/location-metadata-manage` for location 26 (CQ-2)
- [ ] Record the `/list-search-config` entries required for both new list types (`caseNumber` / `caseName`) (CQ-10)
