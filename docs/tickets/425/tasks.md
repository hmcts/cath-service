# Implementation Tasks: Issue #425

## Implementation Tasks

### Module: upper-tribunal-tax-and-chancery-chamber-daily-hearing-list (UTCC, ID 28)

- [x] Create `libs/list-types/upper-tribunal-tax-and-chancery-chamber-daily-hearing-list/package.json`
- [x] Create `libs/list-types/upper-tribunal-tax-and-chancery-chamber-daily-hearing-list/tsconfig.json`
- [x] Create `libs/list-types/upper-tribunal-tax-and-chancery-chamber-daily-hearing-list/src/config.ts` (exports `moduleRoot`, `pageRoutes` with prefix `/upper-tribunal-tax-and-chancery-chamber-daily-hearing-list`, `assets`)
- [x] Create `libs/list-types/upper-tribunal-tax-and-chancery-chamber-daily-hearing-list/src/config.test.ts`
- [x] Create `libs/list-types/upper-tribunal-tax-and-chancery-chamber-daily-hearing-list/src/models/types.ts` (`UtccHearing`, `UtccHearingList`)
- [x] Create `libs/list-types/upper-tribunal-tax-and-chancery-chamber-daily-hearing-list/src/schemas/upper-tribunal-tax-and-chancery-chamber-daily-hearing-list.json`
- [x] Create `libs/list-types/upper-tribunal-tax-and-chancery-chamber-daily-hearing-list/src/conversion/utcc-config.ts` (registers converter for ID 28 and name `UT_TAX_AND_CHANCERY_CHAMBER_DAILY_HEARING_LIST`)
- [x] Create `libs/list-types/upper-tribunal-tax-and-chancery-chamber-daily-hearing-list/src/rendering/renderer.ts`
- [x] Create `libs/list-types/upper-tribunal-tax-and-chancery-chamber-daily-hearing-list/src/rendering/renderer.test.ts`
- [x] Create `libs/list-types/upper-tribunal-tax-and-chancery-chamber-daily-hearing-list/src/email-summary/summary-builder.ts` (extracts Date, Time, Case Reference Number)
- [x] Create `libs/list-types/upper-tribunal-tax-and-chancery-chamber-daily-hearing-list/src/email-summary/summary-builder.test.ts`
- [x] Create `libs/list-types/upper-tribunal-tax-and-chancery-chamber-daily-hearing-list/src/pdf/pdf-generator.ts`
- [x] Create `libs/list-types/upper-tribunal-tax-and-chancery-chamber-daily-hearing-list/src/pdf/pdf-generator.test.ts`
- [x] Create `libs/list-types/upper-tribunal-tax-and-chancery-chamber-daily-hearing-list/src/pdf/pdf-template.njk` (8 columns: Time, Case Reference, Case Name, Judge(s), Member(s), Hearing Type, Venue, Additional Information)
- [x] Create `libs/list-types/upper-tribunal-tax-and-chancery-chamber-daily-hearing-list/src/pages/en.ts` (includes UTCC opening statement with uttc@justice.gov.uk and "Observe" link)
- [x] Create `libs/list-types/upper-tribunal-tax-and-chancery-chamber-daily-hearing-list/src/pages/cy.ts` (Welsh with `[TRANSLATE: ...]` markers)
- [x] Create `libs/list-types/upper-tribunal-tax-and-chancery-chamber-daily-hearing-list/src/pages/index.ts` (GET controller)
- [x] Create `libs/list-types/upper-tribunal-tax-and-chancery-chamber-daily-hearing-list/src/pages/index.test.ts`
- [x] Create `libs/list-types/upper-tribunal-tax-and-chancery-chamber-daily-hearing-list/src/pages/upper-tribunal-tax-and-chancery-chamber-daily-hearing-list.njk`
- [x] Create `libs/list-types/upper-tribunal-tax-and-chancery-chamber-daily-hearing-list/src/index.ts`

### Module: upper-tribunal-lands-chamber-daily-hearing-list (UTLC, ID 29)

- [x] Create `libs/list-types/upper-tribunal-lands-chamber-daily-hearing-list/package.json`
- [x] Create `libs/list-types/upper-tribunal-lands-chamber-daily-hearing-list/tsconfig.json`
- [x] Create `libs/list-types/upper-tribunal-lands-chamber-daily-hearing-list/src/config.ts` (exports `moduleRoot`, `pageRoutes` with prefix `/upper-tribunal-lands-chamber-daily-hearing-list`, `assets`)
- [x] Create `libs/list-types/upper-tribunal-lands-chamber-daily-hearing-list/src/config.test.ts`
- [x] Create `libs/list-types/upper-tribunal-lands-chamber-daily-hearing-list/src/models/types.ts` (`UtlcHearing`, `UtlcHearingList` — includes `modeOfHearing`)
- [x] Create `libs/list-types/upper-tribunal-lands-chamber-daily-hearing-list/src/schemas/upper-tribunal-lands-chamber-daily-hearing-list.json`
- [x] Create `libs/list-types/upper-tribunal-lands-chamber-daily-hearing-list/src/conversion/utlc-config.ts` (registers converter for ID 29 and name `UT_LANDS_CHAMBER_DAILY_HEARING_LIST`)
- [x] Create `libs/list-types/upper-tribunal-lands-chamber-daily-hearing-list/src/rendering/renderer.ts`
- [x] Create `libs/list-types/upper-tribunal-lands-chamber-daily-hearing-list/src/rendering/renderer.test.ts`
- [x] Create `libs/list-types/upper-tribunal-lands-chamber-daily-hearing-list/src/email-summary/summary-builder.ts` (extracts Date, Time, Case Reference Number)
- [x] Create `libs/list-types/upper-tribunal-lands-chamber-daily-hearing-list/src/email-summary/summary-builder.test.ts`
- [x] Create `libs/list-types/upper-tribunal-lands-chamber-daily-hearing-list/src/pdf/pdf-generator.ts`
- [x] Create `libs/list-types/upper-tribunal-lands-chamber-daily-hearing-list/src/pdf/pdf-generator.test.ts`
- [x] Create `libs/list-types/upper-tribunal-lands-chamber-daily-hearing-list/src/pdf/pdf-template.njk` (9 columns: Time, Case Reference, Case Name, Judge(s), Member(s), Hearing Type, Venue, Mode of Hearing, Additional Information)
- [x] Create `libs/list-types/upper-tribunal-lands-chamber-daily-hearing-list/src/pages/en.ts` (includes UTLC opening statement with Lands@justice.gov.uk and "Observe" link)
- [x] Create `libs/list-types/upper-tribunal-lands-chamber-daily-hearing-list/src/pages/cy.ts` (Welsh with `[TRANSLATE: ...]` markers)
- [x] Create `libs/list-types/upper-tribunal-lands-chamber-daily-hearing-list/src/pages/index.ts` (GET controller)
- [x] Create `libs/list-types/upper-tribunal-lands-chamber-daily-hearing-list/src/pages/index.test.ts`
- [x] Create `libs/list-types/upper-tribunal-lands-chamber-daily-hearing-list/src/pages/upper-tribunal-lands-chamber-daily-hearing-list.njk`
- [x] Create `libs/list-types/upper-tribunal-lands-chamber-daily-hearing-list/src/index.ts`

### Module: upper-tribunal-administrative-appeals-chamber-daily-hearing-list (UTAAC, ID 30)

- [x] Create `libs/list-types/upper-tribunal-administrative-appeals-chamber-daily-hearing-list/package.json`
- [x] Create `libs/list-types/upper-tribunal-administrative-appeals-chamber-daily-hearing-list/tsconfig.json`
- [x] Create `libs/list-types/upper-tribunal-administrative-appeals-chamber-daily-hearing-list/src/config.ts` (exports `moduleRoot`, `pageRoutes` with prefix `/upper-tribunal-administrative-appeals-chamber-daily-hearing-list`, `assets`)
- [x] Create `libs/list-types/upper-tribunal-administrative-appeals-chamber-daily-hearing-list/src/config.test.ts`
- [x] Create `libs/list-types/upper-tribunal-administrative-appeals-chamber-daily-hearing-list/src/models/types.ts` (`UtaacHearing`, `UtaacHearingList` — includes `appellant`, `caseReferenceNumber`, `modeOfHearing`)
- [x] Create `libs/list-types/upper-tribunal-administrative-appeals-chamber-daily-hearing-list/src/schemas/upper-tribunal-administrative-appeals-chamber-daily-hearing-list.json`
- [x] Create `libs/list-types/upper-tribunal-administrative-appeals-chamber-daily-hearing-list/src/conversion/utaac-config.ts` (registers converter for ID 30 and name `UT_ADMINISTRATIVE_APPEALS_CHAMBER_DAILY_HEARING_LIST`)
- [x] Create `libs/list-types/upper-tribunal-administrative-appeals-chamber-daily-hearing-list/src/rendering/renderer.ts`
- [x] Create `libs/list-types/upper-tribunal-administrative-appeals-chamber-daily-hearing-list/src/rendering/renderer.test.ts`
- [x] Create `libs/list-types/upper-tribunal-administrative-appeals-chamber-daily-hearing-list/src/email-summary/summary-builder.ts` (extracts Date, Time, Case Reference Number using `caseReferenceNumber` field)
- [x] Create `libs/list-types/upper-tribunal-administrative-appeals-chamber-daily-hearing-list/src/email-summary/summary-builder.test.ts`
- [x] Create `libs/list-types/upper-tribunal-administrative-appeals-chamber-daily-hearing-list/src/pdf/pdf-generator.ts`
- [x] Create `libs/list-types/upper-tribunal-administrative-appeals-chamber-daily-hearing-list/src/pdf/pdf-generator.test.ts`
- [x] Create `libs/list-types/upper-tribunal-administrative-appeals-chamber-daily-hearing-list/src/pdf/pdf-template.njk` (9 columns: Time, Appellant, Case Reference Number, Case Name, Judge(s), Member(s), Mode of Hearing, Venue, Additional Information; landscape orientation)
- [x] Create `libs/list-types/upper-tribunal-administrative-appeals-chamber-daily-hearing-list/src/pages/en.ts` (includes UTAAC multi-paragraph opening statement with England/Wales and Scotland sections, adminappeals@justice.gov.uk, UTAACMailbox@justice.gov.uk)
- [x] Create `libs/list-types/upper-tribunal-administrative-appeals-chamber-daily-hearing-list/src/pages/cy.ts` (Welsh with `[TRANSLATE: ...]` markers)
- [x] Create `libs/list-types/upper-tribunal-administrative-appeals-chamber-daily-hearing-list/src/pages/index.ts` (GET controller)
- [x] Create `libs/list-types/upper-tribunal-administrative-appeals-chamber-daily-hearing-list/src/pages/index.test.ts`
- [x] Create `libs/list-types/upper-tribunal-administrative-appeals-chamber-daily-hearing-list/src/pages/upper-tribunal-administrative-appeals-chamber-daily-hearing-list.njk`
- [x] Create `libs/list-types/upper-tribunal-administrative-appeals-chamber-daily-hearing-list/src/index.ts`

### Shared Integration Points

- [x] Add `regionId: 7, name: "National"` to `regions` in `libs/location/src/location-data.ts`
- [x] Add sub-jurisdictions 10, 11, 12 (UT Tax and Chancery Chamber, UT Lands Chamber, UT Administrative Appeals Chamber) to `subJurisdictions` in `libs/location/src/location-data.ts`
- [x] Add virtual locations 13, 14, 15 for the three UT chambers to `locations` in `libs/location/src/location-data.ts`
- [x] Append list type entries for IDs 28, 29, 30 to `libs/location/src/list-type-data.ts` (including `shortenedFriendlyName` for upload form labels)
- [x] Add three path mappings to root `tsconfig.json` (`@hmcts/upper-tribunal-tax-and-chancery-chamber-daily-hearing-list`, `@hmcts/upper-tribunal-lands-chamber-daily-hearing-list`, `@hmcts/upper-tribunal-administrative-appeals-chamber-daily-hearing-list`)
- [x] Import and register the three module roots in `modulePaths` and router calls in `apps/web/src/app.ts`
- [x] Add three entries to `PDF_GENERATOR_REGISTRY` in `libs/publication/src/processing/service.ts`
- [x] Add three entries to `EMAIL_BUILDER_REGISTRY` in `libs/notifications/src/notification/notification-service.ts`
- [x] Insert `ListSearchConfig` rows for IDs 28, 29, 30 (via seed script — added to `apps/postgres/prisma/seed.ts`)
