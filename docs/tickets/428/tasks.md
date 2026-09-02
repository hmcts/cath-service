# Implementation Tasks: Issue #428

Tasks are ordered by dependency. Complete each group before moving to the next.

---

## Group 1: List Type Registry

- [x] Add 10 new entries (IDs 28–37) to `libs/location/src/list-type-data.ts` — SIAC, POAC, PAAC, FTT Tax, FTT LRT, and 5 FTT RPT variants, following the existing `ListTypeData` interface (name, englishFriendlyName, welshFriendlyName, shortenedFriendlyName, urlPath, provenance, isNonStrategic, defaultSensitivity, subJurisdictionIds)

---

## Group 2: Root Configuration

- [x] Add 4 path entries to root `tsconfig.json` (`@hmcts/siac-poac-paac-weekly-hearing-list`, `@hmcts/ftt-tax-chamber-weekly-hearing-list`, `@hmcts/ftt-lands-registration-tribunal-weekly-hearing-list`, `@hmcts/ftt-rpt-weekly-hearing-list`) pointing to their respective `src/` directories

---

## Group 3: SIAC / POAC / PAAC module (`libs/list-types/siac-poac-paac-weekly-hearing-list/`)

- [x] Create `package.json` — name `@hmcts/siac-poac-paac-weekly-hearing-list`, scripts matching CST (build includes `build:nunjucks` and `build:schemas`), same deps as CST
- [x] Create `tsconfig.json` extending `../../../tsconfig.json` with `resolveJsonModule: true`
- [x] Create `src/config.ts` — exports `moduleRoot`, `assets`, `schemaPath`
- [x] Create `src/models/types.ts` — `SiacPoacPaacHearing` (7 fields: `date`, `time`, `appellant`, `caseReferenceNumber`, `hearingType`, `courtroom`, `additionalInformation`) and `SiacPoacPaacHearingList`
- [x] Create `src/schemas/siac-poac-paac-weekly-hearing-list.json` — JSON Schema draft-07, all 7 fields required, `date` uses dd/MM/yyyy pattern, remaining fields use no-HTML regex
- [x] Create `src/conversion/siac-poac-paac-config.ts` — `SIAC_POAC_PAAC_EXCEL_CONFIG` with 7 fields; call `registerConverter(28, converter)`, `registerConverterByName("SIAC_WEEKLY_HEARING_LIST", converter)`; `registerConverter(29, converter)`, `registerConverterByName("POAC_WEEKLY_HEARING_LIST", converter)`; `registerConverter(30, converter)`, `registerConverterByName("PAAC_WEEKLY_HEARING_LIST", converter)`
- [x] Create `src/locales/en.ts` — shared table headers, search labels, common page copy; plus three named exports for the important-information accordion text (`siacImportantInformation`, `poacImportantInformation`, `paacImportantInformation`) and page titles (`siacPageTitle`, `poacPageTitle`, `paacPageTitle`)
- [x] Create `src/locales/cy.ts` — mirrors `en.ts` structure with English text as placeholders
- [x] Create `src/rendering/renderer.ts` — `renderSiacPoacPaacData(list, options)` returning `RenderedData` (header + hearings with formatted dates)
- [x] Create `src/rendering/renderer.test.ts` — tests for date formatting, multiple hearings, Welsh locale, empty list
- [x] Create `src/email-summary/summary-builder.ts` — `extractCaseSummary` returning `[Date, Time, Case Reference Number]` per hearing
- [x] Create `src/email-summary/summary-builder.test.ts`
- [x] Create `src/pdf/pdf-generator.ts` — `generateSiacPoacPaacWeeklyHearingListPdf(options)` with `courtName` parameter; follows CST PDF generator pattern
- [x] Create `src/pdf/pdf-generator.test.ts`
- [x] Create `src/pdf/pdf-template.njk` — 7-column PDF table (Date, Time, Appellant, Case Reference Number, Hearing Type, Courtroom, Additional information)
- [x] Create `src/index.ts` — registers converter on module load (imports `./conversion/siac-poac-paac-config.js`); exports locales, model types, renderer, PDF generator, email summary
- [x] Create `src/config.test.ts` — verify `moduleRoot` is an absolute path to an existing directory; `assets` ends with trailing slash and is a subdirectory of `moduleRoot`

---

## Group 4: FTT Tax Chamber module (`libs/list-types/ftt-tax-chamber-weekly-hearing-list/`)

- [x] Create `package.json`
- [x] Create `tsconfig.json`
- [x] Create `src/config.ts`
- [x] Create `src/models/types.ts` — `FttTaxChamberHearing` (7 fields: `date`, `hearingTime`, `caseName`, `caseReferenceNumber`, `judges`, `members`, `venuePlatform`) and `FttTaxChamberHearingList`
- [x] Create `src/schemas/ftt-tax-chamber-weekly-hearing-list.json`
- [x] Create `src/conversion/ftt-tax-config.ts` — `registerConverter(31, converter)`, `registerConverterByName("FTT_TAX_CHAMBER_WEEKLY_HEARING_LIST", converter)`
- [x] Create `src/locales/en.ts` — multi-paragraph important-information text (5 paragraphs + external link as per ticket); table headers for 7 columns; `taxappeals@justice.gov.uk` contact email in accordion
- [x] Create `src/locales/cy.ts` — English placeholders
- [x] Create `src/rendering/renderer.ts`
- [x] Create `src/rendering/renderer.test.ts`
- [x] Create `src/email-summary/summary-builder.ts` — `[Date, Hearing Time, Case Reference Number]`
- [x] Create `src/email-summary/summary-builder.test.ts`
- [x] Create `src/pdf/pdf-generator.ts`
- [x] Create `src/pdf/pdf-generator.test.ts`
- [x] Create `src/pdf/pdf-template.njk`
- [x] Create `src/index.ts`
- [x] Create `src/config.test.ts`

---

## Group 5: FTT Lands Registration Tribunal module (`libs/list-types/ftt-lands-registration-tribunal-weekly-hearing-list/`)

- [x] Create `package.json`
- [x] Create `tsconfig.json`
- [x] Create `src/config.ts`
- [x] Create `src/models/types.ts` — `FttLrtHearing` (6 fields: `date`, `hearingTime`, `caseName`, `caseReferenceNumber`, `judge`, `venuePlatform`) and `FttLrtHearingList`
- [x] Create `src/schemas/ftt-lands-registration-tribunal-weekly-hearing-list.json`
- [x] Create `src/conversion/ftt-lrt-config.ts` — `registerConverter(32, converter)`, `registerConverterByName("FTT_LANDS_REGISTRATION_TRIBUNAL_WEEKLY_HEARING_LIST", converter)`
- [x] Create `src/locales/en.ts` — important-information text contains `[insert office email]` placeholder; table headers for 6 columns
- [x] Create `src/locales/cy.ts` — English placeholders
- [x] Create `src/rendering/renderer.ts`
- [x] Create `src/rendering/renderer.test.ts`
- [x] Create `src/email-summary/summary-builder.ts` — `[Date, Hearing Time, Case Reference Number]`
- [x] Create `src/email-summary/summary-builder.test.ts`
- [x] Create `src/pdf/pdf-generator.ts`
- [x] Create `src/pdf/pdf-generator.test.ts`
- [x] Create `src/pdf/pdf-template.njk`
- [x] Create `src/index.ts`
- [x] Create `src/config.test.ts`

---

## Group 6: FTT RPT module (`libs/list-types/ftt-rpt-weekly-hearing-list/`)

- [x] Create `package.json`
- [x] Create `tsconfig.json`
- [x] Create `src/config.ts`
- [x] Create `src/models/types.ts` — `FttRptHearing` (9 fields: `date`, `time`, `venue`, `caseType`, `caseReferenceNumber`, `judges`, `members`, `hearingMethod`, `additionalInformation`) and `FttRptHearingList`
- [x] Create `src/schemas/ftt-rpt-weekly-hearing-list.json`
- [x] Create `src/conversion/ftt-rpt-config.ts` — single `FTT_RPT_EXCEL_CONFIG`; 5x `registerConverter` (IDs 33–37) and 5x `registerConverterByName` calls for Eastern, London, Midlands, Northern, Southern
- [x] Create `src/locales/en.ts` — important-information text (with `[insert office email]` placeholder); table headers for 9 columns; named page title exports per region (`rptEasternPageTitle` etc.)
- [x] Create `src/locales/cy.ts` — English placeholders
- [x] Create `src/rendering/renderer.ts`
- [x] Create `src/rendering/renderer.test.ts`
- [x] Create `src/email-summary/summary-builder.ts` — `[Date, Time, Case Reference Number]`
- [x] Create `src/email-summary/summary-builder.test.ts`
- [x] Create `src/pdf/pdf-generator.ts` — accepts `courtName` (region-specific full name)
- [x] Create `src/pdf/pdf-generator.test.ts`
- [x] Create `src/pdf/pdf-template.njk`
- [x] Create `src/index.ts`
- [x] Create `src/config.test.ts`

---

## Group 7: Application wiring (`apps/web/src/app.ts`)

- [x] Import `moduleRoot` from `@hmcts/siac-poac-paac-weekly-hearing-list/config` and add to `modulePaths`
- [x] Import `moduleRoot` from `@hmcts/ftt-tax-chamber-weekly-hearing-list/config` and add to `modulePaths`
- [x] Import `moduleRoot` from `@hmcts/ftt-lands-registration-tribunal-weekly-hearing-list/config` and add to `modulePaths`
- [x] Import `moduleRoot` from `@hmcts/ftt-rpt-weekly-hearing-list/config` and add to `modulePaths`

---

## Group 8: Page controllers and templates — SIAC / POAC / PAAC

All three pages in `apps/web/src/pages/(list-types)/` follow the CST controller pattern exactly (read artefact → read JSON file → validate → render, with 400/404/500 error handling).

- [x] Create `siac-weekly-hearing-list/index.ts` — imports from `@hmcts/siac-poac-paac-weekly-hearing-list`; renders `siac-weekly-hearing-list` template; passes `siacImportantInformation` to locale
- [x] Create `siac-weekly-hearing-list/index.test.ts`
- [x] Create `siac-weekly-hearing-list/siac-weekly-hearing-list.njk` — extends `layouts/base-template.njk`; 7-column hearings table; govuk-details accordion for important information
- [x] Create `poac-weekly-hearing-list/index.ts`
- [x] Create `poac-weekly-hearing-list/index.test.ts`
- [x] Create `poac-weekly-hearing-list/poac-weekly-hearing-list.njk`
- [x] Create `paac-weekly-hearing-list/index.ts`
- [x] Create `paac-weekly-hearing-list/index.test.ts`
- [x] Create `paac-weekly-hearing-list/paac-weekly-hearing-list.njk`

---

## Group 9: Page controller and template — FTT Tax Chamber

- [x] Create `ftt-tax-chamber-weekly-hearing-list/index.ts` — courtName `"First-tier Tribunal (Tax Chamber)"`
- [x] Create `ftt-tax-chamber-weekly-hearing-list/index.test.ts`
- [x] Create `ftt-tax-chamber-weekly-hearing-list/ftt-tax-chamber-weekly-hearing-list.njk` — 7-column table; multi-paragraph accordion

---

## Group 10: Page controller and template — FTT LRT

- [x] Create `ftt-lands-registration-tribunal-weekly-hearing-list/index.ts` — courtName `"First-tier Tribunal (Lands Registration Tribunal)"`
- [x] Create `ftt-lands-registration-tribunal-weekly-hearing-list/index.test.ts`
- [x] Create `ftt-lands-registration-tribunal-weekly-hearing-list/ftt-lands-registration-tribunal-weekly-hearing-list.njk` — 6-column table

---

## Group 11: Page controllers and templates — FTT RPT (5 regions)

- [x] Create `ftt-rpt-eastern-weekly-hearing-list/index.ts` — courtName uses full regional name; imports from `@hmcts/ftt-rpt-weekly-hearing-list`
- [x] Create `ftt-rpt-eastern-weekly-hearing-list/index.test.ts`
- [x] Create `ftt-rpt-eastern-weekly-hearing-list/ftt-rpt-eastern-weekly-hearing-list.njk` — 9-column table
- [x] Create `ftt-rpt-london-weekly-hearing-list/index.ts`
- [x] Create `ftt-rpt-london-weekly-hearing-list/index.test.ts`
- [x] Create `ftt-rpt-london-weekly-hearing-list/ftt-rpt-london-weekly-hearing-list.njk`
- [x] Create `ftt-rpt-midlands-weekly-hearing-list/index.ts`
- [x] Create `ftt-rpt-midlands-weekly-hearing-list/index.test.ts`
- [x] Create `ftt-rpt-midlands-weekly-hearing-list/ftt-rpt-midlands-weekly-hearing-list.njk`
- [x] Create `ftt-rpt-northern-weekly-hearing-list/index.ts`
- [x] Create `ftt-rpt-northern-weekly-hearing-list/index.test.ts`
- [x] Create `ftt-rpt-northern-weekly-hearing-list/ftt-rpt-northern-weekly-hearing-list.njk`
- [x] Create `ftt-rpt-southern-weekly-hearing-list/index.ts`
- [x] Create `ftt-rpt-southern-weekly-hearing-list/index.test.ts`
- [x] Create `ftt-rpt-southern-weekly-hearing-list/ftt-rpt-southern-weekly-hearing-list.njk`

---

## Group 12: Verification

- [ ] Run `yarn test` from the root — all new unit tests must pass
- [ ] Run `yarn build` from the root — confirm all 4 new packages compile without TypeScript errors
- [ ] Start `yarn dev` and verify each of the 10 new URL paths returns a rendered page (requires a seeded artefact)
- [ ] Verify Welsh locale (`?lng=cy`) renders on each of the 10 pages without missing keys
- [ ] Confirm `yarn db:migrate:dev` applies cleanly (no schema changes needed — list types are seeded data, not Prisma models)
