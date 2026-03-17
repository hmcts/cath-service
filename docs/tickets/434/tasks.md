# Implementation Tasks: #434

## Shared Changes

- [ ] Add IDs 24, 25, 26 to `libs/list-types/common/src/mock-list-types.ts`
- [ ] Add path aliases for all three modules to root `tsconfig.json`
- [ ] Register all three modules in `apps/web/src/app.ts`

## Module: send-daily-hearing-list (ID: 24)

- [ ] Create `libs/list-types/send-daily-hearing-list/package.json`
- [ ] Create `libs/list-types/send-daily-hearing-list/tsconfig.json`
- [ ] Create `src/models/types.ts` — `SendDailyHearing` interface + list type
- [ ] Create `src/schemas/send-daily-hearing-list.json` — JSON Schema (fields: time, caseReferenceNumber, respondent, hearingType, venue, timeEstimate)
- [ ] Create `src/conversion/send-config.ts` — Excel converter config, `registerConverter(24, ...)`
- [ ] Create `src/rendering/renderer.ts` — `renderSendDailyData()` function
- [ ] Create `src/rendering/renderer.test.ts`
- [ ] Create `src/email-summary/summary-builder.ts` — `extractCaseSummary()` (time, caseReferenceNumber, venue)
- [ ] Create `src/email-summary/summary-builder.test.ts`
- [ ] Create `src/pdf/pdf-generator.ts`
- [ ] Create `src/pdf/pdf-generator.test.ts`
- [ ] Create `src/pdf/pdf-template.njk`
- [ ] Create `src/pages/en.ts` — full page content including 5-paragraph important information text
- [ ] Create `src/pages/cy.ts`
- [ ] Create `src/pages/index.ts` — GET controller
- [ ] Create `src/pages/index.test.ts`
- [ ] Create `src/pages/send-daily-hearing-list.njk`
- [ ] Create `src/config.ts`
- [ ] Create `src/config.test.ts`
- [ ] Create `src/index.ts`

## Module: cic-weekly-hearing-list (ID: 25)

- [ ] Create `libs/list-types/cic-weekly-hearing-list/package.json`
- [ ] Create `libs/list-types/cic-weekly-hearing-list/tsconfig.json`
- [ ] Create `src/models/types.ts` — `CicWeeklyHearing` interface + list type
- [ ] Create `src/schemas/cic-weekly-hearing-list.json` — JSON Schema (fields: date, hearingTime, caseReferenceNumber, caseName, venuePlatform, judges, members, additionalInformation)
- [ ] Create `src/conversion/cic-config.ts` — Excel converter config, `registerConverter(25, ...)`
- [ ] Create `src/rendering/renderer.ts` — `renderCicWeeklyData()` function
- [ ] Create `src/rendering/renderer.test.ts`
- [ ] Create `src/email-summary/summary-builder.ts` — `extractCaseSummary()` (hearingTime, caseReferenceNumber, venuePlatform)
- [ ] Create `src/email-summary/summary-builder.test.ts`
- [ ] Create `src/pdf/pdf-generator.ts`
- [ ] Create `src/pdf/pdf-generator.test.ts`
- [ ] Create `src/pdf/pdf-template.njk`
- [ ] Create `src/pages/en.ts` — including multi-paragraph important info with restricted reporting orders section
- [ ] Create `src/pages/cy.ts`
- [ ] Create `src/pages/index.ts` — GET controller
- [ ] Create `src/pages/index.test.ts`
- [ ] Create `src/pages/cic-weekly-hearing-list.njk`
- [ ] Create `src/config.ts`
- [ ] Create `src/config.test.ts`
- [ ] Create `src/index.ts`

## Module: ast-daily-hearing-list (ID: 26)

- [ ] Create `libs/list-types/ast-daily-hearing-list/package.json`
- [ ] Create `libs/list-types/ast-daily-hearing-list/tsconfig.json`
- [ ] Create `src/models/types.ts` — `AstDailyHearing` interface + list type
- [ ] Create `src/schemas/ast-daily-hearing-list.json` — JSON Schema (fields: appellant, appealReferenceNumber, caseType, hearingType, hearingTime, additionalInformation)
- [ ] Create `src/conversion/ast-config.ts` — Excel converter config, `registerConverter(26, ...)`
- [ ] Create `src/rendering/renderer.ts` — `renderAstDailyData()` function
- [ ] Create `src/rendering/renderer.test.ts`
- [ ] Create `src/email-summary/summary-builder.ts` — `extractCaseSummary()` (appellant, appealReferenceNumber, hearingTime)
- [ ] Create `src/email-summary/summary-builder.test.ts`
- [ ] Create `src/pdf/pdf-generator.ts`
- [ ] Create `src/pdf/pdf-generator.test.ts`
- [ ] Create `src/pdf/pdf-template.njk`
- [ ] Create `src/pages/en.ts` — including fixed venue address and important info text
- [ ] Create `src/pages/cy.ts`
- [ ] Create `src/pages/index.ts` — GET controller
- [ ] Create `src/pages/index.test.ts`
- [ ] Create `src/pages/ast-daily-hearing-list.njk` — includes fixed venue address display
- [ ] Create `src/config.ts`
- [ ] Create `src/config.test.ts`
- [ ] Create `src/index.ts`
