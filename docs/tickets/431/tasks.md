# Implementation Tasks: #431 — SSCS Tribunal Non-Strategic Publishing

## Implementation Tasks

### Setup & Data

- [ ] Confirm list type IDs (24–31) and region IDs (7–10) are correct next available values
- [ ] Add 4 new regions (Scotland, North East, North West, South West) to `libs/location/src/location-data.ts`
- [ ] Add 8 new SSCS tribunal locations to `libs/location/src/location-data.ts` with correct region and subJurisdiction links
- [ ] Add 8 new list type entries to `libs/list-types/common/src/mock-list-types.ts` (IDs 24–31, `isNonStrategic: true`, `provenance: "MANUAL_UPLOAD"`)

### Shared SSCS Library (`libs/list-types/sscs-common/`)

- [ ] Create `libs/list-types/sscs-common/` directory structure (`package.json`, `tsconfig.json`, `src/`)
- [ ] Create `src/models/types.ts` with `SscsHearing` and `SscsHearingList` types
- [ ] Create `src/schemas/sscs-hearing.json` with 9 required fields and HTML injection prevention patterns
- [ ] Create `src/rendering/renderer.ts` with `renderSscsData()` function
- [ ] Create `src/rendering/renderer.test.ts` unit tests
- [ ] Create `src/email-summary/summary-builder.ts` with `extractCaseSummary()` returning hearingTime, hearingType, appealReferenceNumber
- [ ] Create `src/email-summary/summary-builder.test.ts` unit tests
- [ ] Create `src/index.ts` exporting all shared logic
- [ ] Add `@hmcts/sscs-common` path alias to root `tsconfig.json`

### SSCS Midlands Module (`libs/list-types/sscs-midlands-daily-hearing-list/`)

- [ ] Create module directory structure with `package.json`, `tsconfig.json`
- [ ] Create `src/config.ts` with `pageRoutes` (prefix: `/sscs-midlands-daily-hearing-list`) and `assets`
- [ ] Create `src/conversion/sscs-midlands-config.ts` registering converter for list type ID 24
- [ ] Create `src/pdf/pdf-generator.ts` and `src/pdf/pdf-template.njk`
- [ ] Create `src/pages/en.ts` (English content: pageTitle, importantInformationText with ascbirmingham@justice.gov.uk)
- [ ] Create `src/pages/cy.ts` (Welsh content)
- [ ] Create `src/pages/index.ts` GET controller
- [ ] Create `src/pages/index.test.ts` unit tests
- [ ] Create `src/pages/sscs-midlands-daily-hearing-list.njk` template
- [ ] Create `src/index.ts`
- [ ] Add path alias to root `tsconfig.json`

### SSCS South East Module (`libs/list-types/sscs-south-east-daily-hearing-list/`)

- [ ] Create module directory structure with `package.json`, `tsconfig.json`
- [ ] Create `src/config.ts` with `pageRoutes` (prefix: `/sscs-south-east-daily-hearing-list`) and `assets`
- [ ] Create `src/conversion/sscs-south-east-config.ts` registering converter for list type ID 25
- [ ] Create `src/pdf/pdf-generator.ts` and `src/pdf/pdf-template.njk`
- [ ] Create `src/pages/en.ts` (English content with sscs_bradford@justice.gov.uk)
- [ ] Create `src/pages/cy.ts` (Welsh content)
- [ ] Create `src/pages/index.ts` GET controller
- [ ] Create `src/pages/index.test.ts` unit tests
- [ ] Create `src/pages/sscs-south-east-daily-hearing-list.njk` template
- [ ] Create `src/index.ts`
- [ ] Add path alias to root `tsconfig.json`

### SSCS Wales and South West Module (`libs/list-types/sscs-wales-south-west-daily-hearing-list/`)

- [ ] Create module directory structure with `package.json`, `tsconfig.json`
- [ ] Create `src/config.ts` with `pageRoutes` (prefix: `/sscs-wales-south-west-daily-hearing-list`) and `assets`
- [ ] Create `src/conversion/sscs-wales-south-west-config.ts` registering converter for list type ID 26
- [ ] Create `src/pdf/pdf-generator.ts` and `src/pdf/pdf-template.njk`
- [ ] Create `src/pages/en.ts` (English content with sscsa-cardiff@justice.gov.uk)
- [ ] Create `src/pages/cy.ts` (Welsh content)
- [ ] Create `src/pages/index.ts` GET controller
- [ ] Create `src/pages/index.test.ts` unit tests
- [ ] Create `src/pages/sscs-wales-south-west-daily-hearing-list.njk` template
- [ ] Create `src/index.ts`
- [ ] Add path alias to root `tsconfig.json`

### SSCS Scotland Module (`libs/list-types/sscs-scotland-daily-hearing-list/`)

- [ ] Create module directory structure with `package.json`, `tsconfig.json`
- [ ] Create `src/config.ts` with `pageRoutes` (prefix: `/sscs-scotland-daily-hearing-list`) and `assets`
- [ ] Create `src/conversion/sscs-scotland-config.ts` registering converter for list type ID 27
- [ ] Create `src/pdf/pdf-generator.ts` and `src/pdf/pdf-template.njk`
- [ ] Create `src/pages/en.ts` (English content with sscsa-glasgow@justice.gov.uk)
- [ ] Create `src/pages/cy.ts` (Welsh content)
- [ ] Create `src/pages/index.ts` GET controller
- [ ] Create `src/pages/index.test.ts` unit tests
- [ ] Create `src/pages/sscs-scotland-daily-hearing-list.njk` template
- [ ] Create `src/index.ts`
- [ ] Add path alias to root `tsconfig.json`

### SSCS North East Module (`libs/list-types/sscs-north-east-daily-hearing-list/`)

- [ ] Create module directory structure with `package.json`, `tsconfig.json`
- [ ] Create `src/config.ts` with `pageRoutes` (prefix: `/sscs-north-east-daily-hearing-list`) and `assets`
- [ ] Create `src/conversion/sscs-north-east-config.ts` registering converter for list type ID 28
- [ ] Create `src/pdf/pdf-generator.ts` and `src/pdf/pdf-template.njk`
- [ ] Create `src/pages/en.ts` (English content with sscsa-leeds@Justice.gov.uk)
- [ ] Create `src/pages/cy.ts` (Welsh content)
- [ ] Create `src/pages/index.ts` GET controller
- [ ] Create `src/pages/index.test.ts` unit tests
- [ ] Create `src/pages/sscs-north-east-daily-hearing-list.njk` template
- [ ] Create `src/index.ts`
- [ ] Add path alias to root `tsconfig.json`

### SSCS North West Module (`libs/list-types/sscs-north-west-daily-hearing-list/`)

- [ ] Create module directory structure with `package.json`, `tsconfig.json`
- [ ] Create `src/config.ts` with `pageRoutes` (prefix: `/sscs-north-west-daily-hearing-list`) and `assets`
- [ ] Create `src/conversion/sscs-north-west-config.ts` registering converter for list type ID 29
- [ ] Create `src/pdf/pdf-generator.ts` and `src/pdf/pdf-template.njk`
- [ ] Create `src/pages/en.ts` (English content with sscsa-liverpool@justice.gov.uk)
- [ ] Create `src/pages/cy.ts` (Welsh content)
- [ ] Create `src/pages/index.ts` GET controller
- [ ] Create `src/pages/index.test.ts` unit tests
- [ ] Create `src/pages/sscs-north-west-daily-hearing-list.njk` template
- [ ] Create `src/index.ts`
- [ ] Add path alias to root `tsconfig.json`

### SSCS London Module (`libs/list-types/sscs-london-daily-hearing-list/`)

- [ ] Create module directory structure with `package.json`, `tsconfig.json`
- [ ] Create `src/config.ts` with `pageRoutes` (prefix: `/sscs-london-daily-hearing-list`) and `assets`
- [ ] Create `src/conversion/sscs-london-config.ts` registering converter for list type ID 30
- [ ] Create `src/pdf/pdf-generator.ts` and `src/pdf/pdf-template.njk`
- [ ] Create `src/pages/en.ts` (English content with sscsa-sutton@justice.gov.uk)
- [ ] Create `src/pages/cy.ts` (Welsh content)
- [ ] Create `src/pages/index.ts` GET controller
- [ ] Create `src/pages/index.test.ts` unit tests
- [ ] Create `src/pages/sscs-london-daily-hearing-list.njk` template
- [ ] Create `src/index.ts`
- [ ] Add path alias to root `tsconfig.json`

### SSCS Liverpool Module (`libs/list-types/sscs-liverpool-daily-hearing-list/`)

- [ ] Create module directory structure with `package.json`, `tsconfig.json`
- [ ] Create `src/config.ts` with `pageRoutes` (prefix: `/sscs-liverpool-daily-hearing-list`) and `assets`
- [ ] Create `src/conversion/sscs-liverpool-config.ts` registering converter for list type ID 31
- [ ] Create `src/pdf/pdf-generator.ts` and `src/pdf/pdf-template.njk`
- [ ] Create `src/pages/en.ts` (English content with sscsa-liverpool@justice.gov.uk — confirm if same as North West)
- [ ] Create `src/pages/cy.ts` (Welsh content — translation needed for page title)
- [ ] Create `src/pages/index.ts` GET controller
- [ ] Create `src/pages/index.test.ts` unit tests
- [ ] Create `src/pages/sscs-liverpool-daily-hearing-list.njk` template
- [ ] Create `src/index.ts`
- [ ] Add path alias to root `tsconfig.json`

### App Registration

- [ ] Register all 8 modules in `apps/web/src/app.ts` (import pageRoutes from each module's `/config` export, add to router)

### E2E Tests

- [ ] Write E2E test in `e2e-tests/` covering full SSCS list journey (English + Welsh + accessibility + accordion + search) — tagged `@nightly`

### Final Checks

- [ ] Run `yarn lint:fix` and fix any Biome warnings across all new files
- [ ] Run `yarn test` and confirm all unit tests pass
- [ ] Verify Welsh translations are complete (no `[WELSH TRANSLATION REQUIRED]` placeholders remain unless confirmed acceptable)
