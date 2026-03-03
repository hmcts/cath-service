# Implementation Tasks — Issue #428

## Registry and shared infrastructure

- [ ] Add 10 entries (IDs 24-33) to `libs/list-types/common/src/mock-list-types.ts` following the existing pattern (`isNonStrategic: true`, `provenance: "MANUAL_UPLOAD"`, `urlPath` matching the module prefix)
- [ ] Add 10 path entries to the root `tsconfig.json` `paths` object (one per new module package name)

---

## Module: `@hmcts/siac-weekly-hearing-list` (ID 24)

- [ ] Create directory `libs/list-types/siac-weekly-hearing-list/src/` with subdirectories: `conversion/`, `email-summary/`, `models/`, `pages/`, `pdf/`, `rendering/`, `schemas/`
- [ ] Create `libs/list-types/siac-weekly-hearing-list/package.json` (name `@hmcts/siac-weekly-hearing-list`, includes `build:nunjucks` and `build:schemas` scripts)
- [ ] Create `libs/list-types/siac-weekly-hearing-list/tsconfig.json` (extends `../../../tsconfig.json`, `resolveJsonModule: true`)
- [ ] Create `libs/list-types/siac-weekly-hearing-list/src/config.ts` (exports `moduleRoot`, `pageRoutes` with prefix `/siac-weekly-hearing-list`, `assets`)
- [ ] Create `libs/list-types/siac-weekly-hearing-list/src/models/types.ts` (`SiacWeeklyHearing` interface with 7 fields, `SiacWeeklyHearingList` type)
- [ ] Create `libs/list-types/siac-weekly-hearing-list/src/schemas/siac-weekly-hearing-list.json` (draft-07 array schema, all 7 fields required, date pattern, no-HTML pattern for others)
- [ ] Create `libs/list-types/siac-weekly-hearing-list/src/conversion/siac-config.ts` (SIAC_EXCEL_CONFIG with 7 fields, `registerConverter(24, ...)`)
- [ ] Create `libs/list-types/siac-weekly-hearing-list/src/email-summary/summary-builder.ts` (returns Date, Time, Case Reference Number only)
- [ ] Create `libs/list-types/siac-weekly-hearing-list/src/rendering/renderer.ts` (`renderSiacData` function, formats date field, passes other fields through)
- [ ] Create `libs/list-types/siac-weekly-hearing-list/src/pdf/pdf-generator.ts` (`generateSiacWeeklyHearingListPdf`)
- [ ] Create `libs/list-types/siac-weekly-hearing-list/src/pdf/pdf-template.njk` (standalone HTML, 7-column table, important information section with SIAC-specific content)
- [ ] Create `libs/list-types/siac-weekly-hearing-list/src/pages/en.ts` (SIAC English content, including multi-paragraph `importantInformationBody` array, correct link URL `what-to-expect-coming-to-a-court-or-tribunal`)
- [ ] Create `libs/list-types/siac-weekly-hearing-list/src/pages/cy.ts` (stub Welsh content mirroring `en.ts` structure)
- [ ] Create `libs/list-types/siac-weekly-hearing-list/src/pages/index.ts` (GET handler, schema validation, `renderSiacData` call, renders `siac-weekly-hearing-list` template)
- [ ] Create `libs/list-types/siac-weekly-hearing-list/src/pages/siac-weekly-hearing-list.njk` (extends `layouts/base-template.njk`, 7-column govuk-table, details accordion, search input)
- [ ] Create `libs/list-types/siac-weekly-hearing-list/src/pages/index.test.ts` (controller unit tests: success, missing artefactId, artefact not found, file not found, validation failure, server error, Welsh locale)
- [ ] Create `libs/list-types/siac-weekly-hearing-list/src/index.ts` (imports `./conversion/siac-config.js`, re-exports from all layers)

---

## Module: `@hmcts/poac-weekly-hearing-list` (ID 25)

- [ ] Create full module directory structure under `libs/list-types/poac-weekly-hearing-list/`
- [ ] Create `package.json` (name `@hmcts/poac-weekly-hearing-list`)
- [ ] Create `tsconfig.json`
- [ ] Create `src/config.ts` (prefix `/poac-weekly-hearing-list`)
- [ ] Create `src/models/types.ts` (`PoacWeeklyHearing` interface, same 7 fields as SIAC)
- [ ] Create `src/schemas/poac-weekly-hearing-list.json` (same structure as SIAC schema, title updated)
- [ ] Create `src/conversion/poac-config.ts` (POAC_EXCEL_CONFIG, `registerConverter(25, ...)`)
- [ ] Create `src/email-summary/summary-builder.ts` (Date, Time, Case Reference Number)
- [ ] Create `src/rendering/renderer.ts` (`renderPoacData`)
- [ ] Create `src/pdf/pdf-generator.ts` (`generatePoacWeeklyHearingListPdf`)
- [ ] Create `src/pdf/pdf-template.njk` (POAC display name in title, same 7-column structure)
- [ ] Create `src/pages/en.ts` (POAC English content, same important information body as SIAC)
- [ ] Create `src/pages/cy.ts` (stub Welsh)
- [ ] Create `src/pages/index.ts` (renders `poac-weekly-hearing-list` template)
- [ ] Create `src/pages/poac-weekly-hearing-list.njk`
- [ ] Create `src/pages/index.test.ts`
- [ ] Create `src/index.ts`

---

## Module: `@hmcts/paac-weekly-hearing-list` (ID 26)

- [ ] Create full module directory structure under `libs/list-types/paac-weekly-hearing-list/`
- [ ] Create `package.json` (name `@hmcts/paac-weekly-hearing-list`)
- [ ] Create `tsconfig.json`
- [ ] Create `src/config.ts` (prefix `/paac-weekly-hearing-list`)
- [ ] Create `src/models/types.ts` (`PaacWeeklyHearing` interface, same 7 fields as SIAC)
- [ ] Create `src/schemas/paac-weekly-hearing-list.json`
- [ ] Create `src/conversion/paac-config.ts` (PAAC_EXCEL_CONFIG, `registerConverter(26, ...)`)
- [ ] Create `src/email-summary/summary-builder.ts`
- [ ] Create `src/rendering/renderer.ts` (`renderPaacData`)
- [ ] Create `src/pdf/pdf-generator.ts` (`generatePaacWeeklyHearingListPdf`)
- [ ] Create `src/pdf/pdf-template.njk`
- [ ] Create `src/pages/en.ts` (PAAC English content, same important information body as SIAC/POAC)
- [ ] Create `src/pages/cy.ts` (stub Welsh)
- [ ] Create `src/pages/index.ts` (renders `paac-weekly-hearing-list` template)
- [ ] Create `src/pages/paac-weekly-hearing-list.njk`
- [ ] Create `src/pages/index.test.ts`
- [ ] Create `src/index.ts`

---

## Module: `@hmcts/ftt-tax-chamber-weekly-hearing-list` (ID 27)

- [ ] Create full module directory structure under `libs/list-types/ftt-tax-chamber-weekly-hearing-list/`
- [ ] Create `package.json` (name `@hmcts/ftt-tax-chamber-weekly-hearing-list`)
- [ ] Create `tsconfig.json`
- [ ] Create `src/config.ts` (prefix `/ftt-tax-chamber-weekly-hearing-list`)
- [ ] Create `src/models/types.ts` (`FttTaxChamberWeeklyHearing` interface: `date`, `hearingTime`, `caseName`, `caseReferenceNumber`, `judges`, `members: string | null`, `venuePlatform`)
- [ ] Create `src/schemas/ftt-tax-chamber-weekly-hearing-list.json` (`members` absent from `required`, type `["string", "null"]`)
- [ ] Create `src/conversion/ftt-tax-config.ts` (7 fields, `members` with `required: false`, `registerConverter(27, ...)`)
- [ ] Create `src/email-summary/summary-builder.ts` (returns Date, Hearing Time, Case Reference Number)
- [ ] Create `src/rendering/renderer.ts` (`renderFttTaxChamberData`, passes optional `members` through)
- [ ] Create `src/pdf/pdf-generator.ts` (`generateFttTaxChamberWeeklyHearingListPdf`)
- [ ] Create `src/pdf/pdf-template.njk` (7-column table, member column uses conditional display, FTT Tax important information content)
- [ ] Create `src/pages/en.ts` (FTT Tax English content, multi-paragraph `importantInformationBody` with email instruction and `taxappeals@justice.gov.uk`, observation link)
- [ ] Create `src/pages/cy.ts` (stub Welsh)
- [ ] Create `src/pages/index.ts` (renders `ftt-tax-chamber-weekly-hearing-list` template)
- [ ] Create `src/pages/ftt-tax-chamber-weekly-hearing-list.njk` (conditional render for `members` column)
- [ ] Create `src/pages/index.test.ts`
- [ ] Create `src/index.ts`

---

## Module: `@hmcts/ftt-lands-registration-tribunal-weekly-hearing-list` (ID 28)

- [ ] Create full module directory structure under `libs/list-types/ftt-lands-registration-tribunal-weekly-hearing-list/`
- [ ] Create `package.json` (name `@hmcts/ftt-lands-registration-tribunal-weekly-hearing-list`)
- [ ] Create `tsconfig.json`
- [ ] Create `src/config.ts` (prefix `/ftt-lands-registration-tribunal-weekly-hearing-list`)
- [ ] Create `src/models/types.ts` (`FttLandsRegistrationTribunalWeeklyHearing` interface: `date`, `hearingTime`, `caseName`, `caseReferenceNumber`, `judge` (singular), `venuePlatform`)
- [ ] Create `src/schemas/ftt-lands-registration-tribunal-weekly-hearing-list.json` (6 required fields, `judge` singular)
- [ ] Create `src/conversion/ftt-lrt-config.ts` (6 fields, `registerConverter(28, ...)`)
- [ ] Create `src/email-summary/summary-builder.ts` (returns Date, Hearing Time, Case Reference Number)
- [ ] Create `src/rendering/renderer.ts` (`renderFttLandsRegistrationTribunalData`)
- [ ] Create `src/pdf/pdf-generator.ts` (`generateFttLandsRegistrationTribunalWeeklyHearingListPdf`)
- [ ] Create `src/pdf/pdf-template.njk` (6-column table, FTT LRT important information content with `[insert office email]` placeholder and observation link; add HTML comment noting the placeholder)
- [ ] Create `src/pages/en.ts` (FTT LRT English content; add `// TODO: replace [insert office email]` comment above the placeholder string)
- [ ] Create `src/pages/cy.ts` (stub Welsh)
- [ ] Create `src/pages/index.ts` (renders `ftt-lands-registration-tribunal-weekly-hearing-list` template)
- [ ] Create `src/pages/ftt-lands-registration-tribunal-weekly-hearing-list.njk`
- [ ] Create `src/pages/index.test.ts`
- [ ] Create `src/index.ts`

---

## Module: `@hmcts/ftt-rpt-eastern-weekly-hearing-list` (ID 29)

- [ ] Create full module directory structure under `libs/list-types/ftt-rpt-eastern-weekly-hearing-list/`
- [ ] Create `package.json` (name `@hmcts/ftt-rpt-eastern-weekly-hearing-list`)
- [ ] Create `tsconfig.json`
- [ ] Create `src/config.ts` (prefix `/ftt-rpt-eastern-weekly-hearing-list`)
- [ ] Create `src/models/types.ts` (`FttRptEasternWeeklyHearing` interface: `date`, `time`, `venue`, `caseType`, `caseReferenceNumber`, `judges`, `members: string | null`, `hearingMethod`, `additionalInformation: string | null`)
- [ ] Create `src/schemas/ftt-rpt-eastern-weekly-hearing-list.json` (`members` and `additionalInformation` absent from `required`, type `["string", "null"]`)
- [ ] Create `src/conversion/ftt-rpt-eastern-config.ts` (`members` and `additionalInformation` with `required: false`, `registerConverter(29, ...)`)
- [ ] Create `src/email-summary/summary-builder.ts` (returns Date, Time, Case Reference Number)
- [ ] Create `src/rendering/renderer.ts` (`renderFttRptEasternData`)
- [ ] Create `src/pdf/pdf-generator.ts` (`generateFttRptEasternWeeklyHearingListPdf`)
- [ ] Create `src/pdf/pdf-template.njk` (9-column table with conditional display for `members` and `additionalInformation`, FTT RPT important information content with `[insert office email]` placeholder)
- [ ] Create `src/pages/en.ts` (FTT RPT Eastern English content; `// TODO: replace [insert office email]` comment)
- [ ] Create `src/pages/cy.ts` (stub Welsh)
- [ ] Create `src/pages/index.ts` (renders `ftt-rpt-eastern-weekly-hearing-list` template)
- [ ] Create `src/pages/ftt-rpt-eastern-weekly-hearing-list.njk` (conditional render for `members` and `additionalInformation` cells)
- [ ] Create `src/pages/index.test.ts`
- [ ] Create `src/index.ts`

---

## Module: `@hmcts/ftt-rpt-london-weekly-hearing-list` (ID 30)

- [ ] Create full module directory structure under `libs/list-types/ftt-rpt-london-weekly-hearing-list/`
- [ ] Create `package.json` (name `@hmcts/ftt-rpt-london-weekly-hearing-list`)
- [ ] Create `tsconfig.json`
- [ ] Create `src/config.ts` (prefix `/ftt-rpt-london-weekly-hearing-list`)
- [ ] Create `src/models/types.ts` (`FttRptLondonWeeklyHearing` interface, same 9-field shape as Eastern)
- [ ] Create `src/schemas/ftt-rpt-london-weekly-hearing-list.json`
- [ ] Create `src/conversion/ftt-rpt-london-config.ts` (`registerConverter(30, ...)`)
- [ ] Create `src/email-summary/summary-builder.ts`
- [ ] Create `src/rendering/renderer.ts` (`renderFttRptLondonData`)
- [ ] Create `src/pdf/pdf-generator.ts` (`generateFttRptLondonWeeklyHearingListPdf`)
- [ ] Create `src/pdf/pdf-template.njk`
- [ ] Create `src/pages/en.ts`
- [ ] Create `src/pages/cy.ts` (stub Welsh)
- [ ] Create `src/pages/index.ts` (renders `ftt-rpt-london-weekly-hearing-list` template)
- [ ] Create `src/pages/ftt-rpt-london-weekly-hearing-list.njk`
- [ ] Create `src/pages/index.test.ts`
- [ ] Create `src/index.ts`

---

## Module: `@hmcts/ftt-rpt-midlands-weekly-hearing-list` (ID 31)

- [ ] Create full module directory structure under `libs/list-types/ftt-rpt-midlands-weekly-hearing-list/`
- [ ] Create `package.json` (name `@hmcts/ftt-rpt-midlands-weekly-hearing-list`)
- [ ] Create `tsconfig.json`
- [ ] Create `src/config.ts` (prefix `/ftt-rpt-midlands-weekly-hearing-list`)
- [ ] Create `src/models/types.ts` (`FttRptMidlandsWeeklyHearing` interface)
- [ ] Create `src/schemas/ftt-rpt-midlands-weekly-hearing-list.json`
- [ ] Create `src/conversion/ftt-rpt-midlands-config.ts` (`registerConverter(31, ...)`)
- [ ] Create `src/email-summary/summary-builder.ts`
- [ ] Create `src/rendering/renderer.ts` (`renderFttRptMidlandsData`)
- [ ] Create `src/pdf/pdf-generator.ts` (`generateFttRptMidlandsWeeklyHearingListPdf`)
- [ ] Create `src/pdf/pdf-template.njk`
- [ ] Create `src/pages/en.ts`
- [ ] Create `src/pages/cy.ts` (stub Welsh)
- [ ] Create `src/pages/index.ts` (renders `ftt-rpt-midlands-weekly-hearing-list` template)
- [ ] Create `src/pages/ftt-rpt-midlands-weekly-hearing-list.njk`
- [ ] Create `src/pages/index.test.ts`
- [ ] Create `src/index.ts`

---

## Module: `@hmcts/ftt-rpt-northern-weekly-hearing-list` (ID 32)

- [ ] Create full module directory structure under `libs/list-types/ftt-rpt-northern-weekly-hearing-list/`
- [ ] Create `package.json` (name `@hmcts/ftt-rpt-northern-weekly-hearing-list`)
- [ ] Create `tsconfig.json`
- [ ] Create `src/config.ts` (prefix `/ftt-rpt-northern-weekly-hearing-list`)
- [ ] Create `src/models/types.ts` (`FttRptNorthernWeeklyHearing` interface)
- [ ] Create `src/schemas/ftt-rpt-northern-weekly-hearing-list.json`
- [ ] Create `src/conversion/ftt-rpt-northern-config.ts` (`registerConverter(32, ...)`)
- [ ] Create `src/email-summary/summary-builder.ts`
- [ ] Create `src/rendering/renderer.ts` (`renderFttRptNorthernData`)
- [ ] Create `src/pdf/pdf-generator.ts` (`generateFttRptNorthernWeeklyHearingListPdf`)
- [ ] Create `src/pdf/pdf-template.njk`
- [ ] Create `src/pages/en.ts`
- [ ] Create `src/pages/cy.ts` (stub Welsh)
- [ ] Create `src/pages/index.ts` (renders `ftt-rpt-northern-weekly-hearing-list` template)
- [ ] Create `src/pages/ftt-rpt-northern-weekly-hearing-list.njk`
- [ ] Create `src/pages/index.test.ts`
- [ ] Create `src/index.ts`

---

## Module: `@hmcts/ftt-rpt-southern-weekly-hearing-list` (ID 33)

- [ ] Create full module directory structure under `libs/list-types/ftt-rpt-southern-weekly-hearing-list/`
- [ ] Create `package.json` (name `@hmcts/ftt-rpt-southern-weekly-hearing-list`)
- [ ] Create `tsconfig.json`
- [ ] Create `src/config.ts` (prefix `/ftt-rpt-southern-weekly-hearing-list`)
- [ ] Create `src/models/types.ts` (`FttRptSouthernWeeklyHearing` interface)
- [ ] Create `src/schemas/ftt-rpt-southern-weekly-hearing-list.json`
- [ ] Create `src/conversion/ftt-rpt-southern-config.ts` (`registerConverter(33, ...)`)
- [ ] Create `src/email-summary/summary-builder.ts`
- [ ] Create `src/rendering/renderer.ts` (`renderFttRptSouthernData`)
- [ ] Create `src/pdf/pdf-generator.ts` (`generateFttRptSouthernWeeklyHearingListPdf`)
- [ ] Create `src/pdf/pdf-template.njk`
- [ ] Create `src/pages/en.ts`
- [ ] Create `src/pages/cy.ts` (stub Welsh)
- [ ] Create `src/pages/index.ts` (renders `ftt-rpt-southern-weekly-hearing-list` template)
- [ ] Create `src/pages/ftt-rpt-southern-weekly-hearing-list.njk`
- [ ] Create `src/pages/index.test.ts`
- [ ] Create `src/index.ts`

---

## Application registration

- [ ] Add 10 import statements to `apps/web/src/app.ts` (one `moduleRoot` + `pageRoutes` import per module)
- [ ] Add 10 `moduleRoot` variables to the `modulePaths` array in `apps/web/src/app.ts`
- [ ] Add 10 `app.use(await createSimpleRouter(...))` calls in the "Register list type routes" block in `apps/web/src/app.ts`

---

## Verification

- [ ] Run `yarn lint:fix` from the repo root and resolve any Biome warnings across all new modules
- [ ] Run `yarn test` from the repo root and confirm all new `index.test.ts` controller tests pass
- [ ] Run `yarn build` (or `tsc --noEmit`) and confirm no TypeScript compilation errors
- [ ] Manually verify each list type URL path resolves in the running app with a test artefact ID
- [ ] Confirm the `?lng=cy` query parameter renders the stub Welsh content without errors
- [ ] Confirm optional fields (`members`, `additionalInformation`) render correctly when absent (blank cell) and when present
