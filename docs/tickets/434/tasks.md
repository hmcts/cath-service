# Implementation Checklist: Issue #434 — SEND, CIC, and AST Hearing Lists

Complete tasks in order. Each section depends on the previous.

---

## 1. Location Data

- [x] Open `libs/location/src/location-data.ts`
- [x] Add region `{ regionId: 7, name: "National", welshName: "Cenedlaethol" }` to `regions` array
- [x] Add sub-jurisdiction `{ subJurisdictionId: 10, name: "Special Educational Needs and Disability", welshName: "Anghenion Addysgol Arbennig ac Anabledd", jurisdictionId: 4 }` to `subJurisdictions` array
- [x] Add sub-jurisdiction `{ subJurisdictionId: 11, name: "Criminal Injuries Compensation", welshName: "Iawndal am Anafiadau Troseddol", jurisdictionId: 4 }`
- [x] Add sub-jurisdiction `{ subJurisdictionId: 12, name: "Asylum Support", welshName: "Cymorth Lloches", jurisdictionId: 4 }`
- [x] Add virtual location `{ locationId: 13, name: "First-tier Tribunal (Special Educational Needs and Disability)", welshName: "Tribiwnlys Haen Gyntaf (Anghenion Addysgol Arbennig ac Anabledd)", regions: [7], subJurisdictions: [10] }` to `locations` array
- [x] Add virtual location `{ locationId: 14, name: "Criminal Injuries Compensation Tribunal", welshName: "Tribiwnlys Iawndal am Anafiadau Troseddol", regions: [7], subJurisdictions: [11] }`
- [x] Add virtual location `{ locationId: 15, name: "East London Tribunal Service", welshName: "Gwasanaeth Tribiwnlys Dwyrain Llundain", regions: [1], subJurisdictions: [12] }`

---

## 2. List Type Data

- [x] Open `libs/location/src/list-type-data.ts`
- [x] Append entry with `id: 28`, `name: "SEND_DAILY_HEARING_LIST"`, `englishFriendlyName: "First-tier Tribunal (Special Educational Needs and Disability) Daily Hearing List"`, `defaultSensitivity: "Private"`, `shortenedFriendlyName: "SEND Daily Hearing List"`, `subJurisdictionIds: [18]`
- [x] Append entry with `id: 29`, `name: "CIC_WEEKLY_HEARING_LIST"`, `englishFriendlyName: "Criminal Injuries Compensation Weekly Hearing List"`, `defaultSensitivity: "Public"`, `shortenedFriendlyName: "CIC Weekly Hearing List"`, `subJurisdictionIds: [14]`
- [x] Append entry with `id: 30`, `name: "AST_DAILY_HEARING_LIST"`, `englishFriendlyName: "Asylum Support Tribunal Daily Hearing List"`, `defaultSensitivity: "Public"`, `shortenedFriendlyName: "AST Daily Hearing List"`, `subJurisdictionIds: [13]`

---

## 3. Root Config

- [x] Open root `tsconfig.json` and add path aliases for `@hmcts/send-daily-hearing-list`, `@hmcts/send-daily-hearing-list/config`, `@hmcts/cic-weekly-hearing-list`, `@hmcts/cic-weekly-hearing-list/config`, `@hmcts/ast-daily-hearing-list`, `@hmcts/ast-daily-hearing-list/config`
- [x] Open `apps/web/package.json` and add `"@hmcts/send-daily-hearing-list": "workspace:*"`, `"@hmcts/cic-weekly-hearing-list": "workspace:*"`, `"@hmcts/ast-daily-hearing-list": "workspace:*"` to `dependencies`

---

## 4. Module: `send-daily-hearing-list`

- [x] Create directory `libs/list-types/send-daily-hearing-list/src/`
- [x] Create `libs/list-types/send-daily-hearing-list/package.json`
- [x] Create `libs/list-types/send-daily-hearing-list/tsconfig.json`
- [x] Create `src/config.ts` — exports `moduleRoot`, `assets`, `schemaPath`
- [x] Create `src/models/types.ts` — `SendDailyHearing` interface (fields: time, caseReferenceNumber, respondent, hearingType, venue, timeEstimate) and `SendDailyHearingList` type
- [x] Create `src/schemas/send-daily-hearing-list.json` — JSON Schema with time pattern and no-HTML-tags patterns for other fields
- [x] Create `src/conversion/send-config.ts` — `SEND_EXCEL_CONFIG`, register with `registerConverter(28, ...)` and `registerConverterByName("SEND_DAILY_HEARING_LIST", ...)`
- [x] Check whether a time format validator already exists in `@hmcts/list-types-common`; add one if missing
- [x] Create `src/rendering/renderer.ts` — `renderSendDailyHearingListData` (daily list, no contentDate; returns header with lastUpdated + hearings array)
- [x] Create `src/email-summary/summary-builder.ts` — `extractCaseSummary` mapping time, caseReferenceNumber, venue; re-export `formatCaseSummaryForEmail`
- [x] Create `src/pdf/pdf-generator.ts` — `generateSendDailyHearingListPdf`
- [x] Create `src/pdf/pdf-template.njk` — table columns: Time, Case reference number, Respondent, Hearing type, Venue, Time estimate; important information section renders five SEND paragraphs from locale
- [x] Create `src/locales/en.ts` — all English strings including `importantInformationParagraphs` array (5 items), link to `https://www.gov.uk/guidance/observe-a-court-or-tribunal-hearing`
- [x] Create `src/locales/cy.ts` — Welsh translations for all keys
- [x] Create `src/index.ts` — side-effect import of `./conversion/send-config.js`; re-export types, renderer, pdf generator, email summary builder
- [x] Write unit tests for renderer, email summary builder, converter config, and schema path

---

## 5. Module: `cic-weekly-hearing-list`

- [x] Create directory `libs/list-types/cic-weekly-hearing-list/src/`
- [x] Create `package.json`, `tsconfig.json`
- [x] Create `src/config.ts` — exports `moduleRoot`, `assets`, `schemaPath`
- [x] Create `src/models/types.ts` — `CicWeeklyHearing` interface with field `"venue/platform": string` (bracket-notation key); `CicWeeklyHearingList` type
- [x] Create `src/schemas/cic-weekly-hearing-list.json` — JSON Schema with required field name `"venue/platform"` (literal slash); date pattern; time pattern for hearingTime
- [x] Create `src/conversion/cic-config.ts` — `CIC_EXCEL_CONFIG` with Excel header `"Venue/platform"` mapping to `fieldName: "venue/platform"`; register with `registerConverter(29, ...)` and `registerConverterByName("CIC_WEEKLY_HEARING_LIST", ...)`
- [x] Create `src/rendering/renderer.ts` — CIC is weekly: include `weekCommencingDate` in header; format `date` field with `formatDdMmYyyyDate`; access `hearing["venue/platform"]` in the map
- [x] Create `src/email-summary/summary-builder.ts` — `extractCaseSummary` mapping hearingTime, caseReferenceNumber, `hearing["venue/platform"]`
- [x] Create `src/pdf/pdf-generator.ts` — `generateCicWeeklyHearingListPdf`; pass `contentDate` to renderer
- [x] Create `src/pdf/pdf-template.njk` — table columns: Date, Hearing time, Case reference number, Case name, Venue/platform, Judge(s), Member(s), Additional information
- [x] Create `src/locales/en.ts` — includes `importantInformationParagraphs` (3 items), `restrictedReportingOrdersTitle`, `restrictedReportingOrdersText`, link
- [x] Create `src/locales/cy.ts` — Welsh translations
- [x] Create `src/index.ts`
- [x] Write unit tests

---

## 6. Module: `ast-daily-hearing-list`

- [x] Create directory `libs/list-types/ast-daily-hearing-list/src/`
- [x] Create `package.json`, `tsconfig.json`
- [x] Create `src/config.ts` — exports `moduleRoot`, `assets`, `schemaPath`
- [x] Create `src/models/types.ts` — `AstDailyHearing` interface (fields: appellant, appealReferenceNumber, caseType, hearingType, hearingTime, additionalInformation); `AstDailyHearingList` type
- [x] Create `src/schemas/ast-daily-hearing-list.json` — JSON Schema with time pattern for hearingTime
- [x] Create `src/conversion/ast-config.ts` — register with `registerConverter(30, ...)` and `registerConverterByName("AST_DAILY_HEARING_LIST", ...)`
- [x] Create `src/rendering/renderer.ts` — daily list, no contentDate
- [x] Create `src/email-summary/summary-builder.ts` — `extractCaseSummary` mapping appellant, appealReferenceNumber, hearingTime
- [x] Create `src/pdf/pdf-generator.ts` — `generateAstDailyHearingListPdf`
- [x] Create `src/pdf/pdf-template.njk` — display fixed venue address from locale; table columns: Appellant, Appeal reference number, Case type, Hearing type, Hearing time, Additional information
- [x] Create `src/locales/en.ts` — includes `venueAddress` string, `importantInformationParagraphs` (2 items), link
- [x] Create `src/locales/cy.ts` — Welsh translations including translated `venueAddress`
- [x] Create `src/index.ts`
- [x] Write unit tests

---

## 7. Page Controllers and Templates

### SEND

- [x] Create `apps/web/src/pages/(list-types)/send-daily-hearing-list/index.ts` — GET handler: reads artefactId, validates, calls `renderSendDailyHearingListData`, renders template; returns 400/404/500 on error
- [x] Create `apps/web/src/pages/(list-types)/send-daily-hearing-list/send-daily-hearing-list.njk` — extends `layouts/base-template.njk`; important information in `<details>` with paragraphs loop; search input; hearings table; data source; back to top
- [x] Write controller unit tests

### CIC

- [x] Create `apps/web/src/pages/(list-types)/cic-weekly-hearing-list/index.ts` — passes `contentDate: artefact.contentDate` to renderer for week commencing header
- [x] Create `apps/web/src/pages/(list-types)/cic-weekly-hearing-list/cic-weekly-hearing-list.njk` — important information section includes paragraphs loop plus restricted reporting orders subsection; table with `hearing.venuePlatform` cell
- [x] Write controller unit tests

### AST

- [x] Create `apps/web/src/pages/(list-types)/ast-daily-hearing-list/index.ts`
- [x] Create `apps/web/src/pages/(list-types)/ast-daily-hearing-list/ast-daily-hearing-list.njk` — renders `t.venueAddress` as a static address block; important information paragraphs loop; hearings table
- [x] Write controller unit tests

---

## 8. Registration in Shared Services

- [x] Open `libs/publication/src/processing/service.ts` — add imports for all three new pdf generators; add `SEND_DAILY_HEARING_LIST`, `CIC_WEEKLY_HEARING_LIST`, `AST_DAILY_HEARING_LIST` entries to `PDF_GENERATOR_REGISTRY`
- [x] Open `libs/notifications/src/notification/notification-service.ts` — add imports for all three new `extractCaseSummary`/`formatCaseSummaryForEmail` functions; add three entries to `EMAIL_BUILDER_REGISTRY`
- [x] Open `apps/web/src/app.ts` — add three `moduleRoot` imports; add to `modulePaths` array
- [x] Open `apps/web/src/pages/(admin)/non-strategic-upload/index.ts` — add three side-effect imports to register converters

---

## 9. Verification

- [x] Run `yarn test` from root — all new unit tests pass, no regressions (167 test files, 1709 tests passing)
- [x] Run `yarn lint:fix` — no Biome lint violations
- [ ] Start `yarn dev` — confirm all three list pages render at `/send-daily-hearing-list?artefactId=...`, `/cic-weekly-hearing-list?artefactId=...`, `/ast-daily-hearing-list?artefactId=...`
- [ ] Confirm all three list types appear in the non-strategic upload form dropdown
- [ ] Upload a valid Excel file for each list type; confirm converter accepts it and JSON output matches the schema
- [ ] Upload an invalid Excel file for each type; confirm validation error message is shown
- [ ] Verify Welsh translations render correctly by appending `?lng=cy` to each page URL
- [ ] Verify the fixed AST venue address appears on the page and in the PDF
- [ ] Verify SEND page sensitivity defaults to Private in the upload form
- [ ] Verify PDF generation produces a downloadable file for each list type
- [ ] Verify email summary fields are correct for each list type by checking notification audit logs after upload
