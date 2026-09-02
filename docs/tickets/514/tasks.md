# Implementation Tasks: #514 — Magistrates Adult Court List (Crime Portal / Libra)

## Implementation Tasks

- [x] Scaffold `libs/list-types/magistrates-adult-court-list/` package (package.json, tsconfig.json, src/config.ts)
- [x] Author `src/schemas/magistrates-adult-court-list.json` (Draft-07, required fields: Defendant Name, Case Number, Offence Code, Offence Title; HTML-injection rejection patterns)
- [x] Create `src/validation/json-validator.ts` wrapping `validateJson` from `@hmcts/publication`
- [x] Create `src/rendering/renderer.ts` — groups by Block Start, formats dates/times (Europe/London), flattens all 10 display fields
- [x] Create `src/locales/en.ts` — all field labels, list titles, reporting restrictions guidance
- [x] Create `src/locales/cy.ts` — Welsh equivalents (use translations from issue; resolve gaps for Date of Birth, Address, Age, Offence Code, Offence Title, Offence Summary from pip-frontend Welsh locale)
- [x] Create `src/pdf/pdf-template.njk` — inline-styled standalone PDF template showing all 10 fields grouped by Block Start
- [x] Create `src/pdf/pdf-generator.ts` — `generateMagistratesAdultCourtListPdf` using shared `generatePdfFromHtml` + `savePdfToStorage`
- [x] Create `src/email-summary/summary-builder.ts` — `extractCaseSummary` returning Defendant Name, Informant, Case Number, Offence Title per case
- [x] Create `src/index.ts` barrel (export validator, renderer, locales, PDF generator, email summary extractor/formatter, types)
- [x] Add list type seed entries to `libs/location/src/list-type-data.ts` (id 57: MAGISTRATES_ADULT_COURT_LIST_DAILY, id 58: MAGISTRATES_ADULT_COURT_LIST_FUTURE, provenance CRIME_IDAM, subJurisdictionIds [7])
- [x] Create `apps/web/src/pages/(list-types)/magistrates-adult-court-list-daily/index.ts` controller using `createListTypeHandler` + `createCauseListRender`
- [x] Create `apps/web/src/pages/(list-types)/magistrates-adult-court-list-daily/index.njk` template
- [x] Create `apps/web/src/pages/(list-types)/magistrates-adult-court-list-future/index.ts` controller
- [x] Create `apps/web/src/pages/(list-types)/magistrates-adult-court-list-future/index.njk` template
- [x] Register in `apps/web/src/app.ts`: add import `magistratesAdultCourtListModuleRoot` and add to `modulePaths`
- [x] Register in `apps/web/package.json`: add `@hmcts/magistrates-adult-court-list` workspace dependency
- [x] Register in `libs/publication/src/processing/service.ts`: import `generateMagistratesAdultCourtListPdf`, add `MAGISTRATES_ADULT_COURT_LIST_DAILY` and `MAGISTRATES_ADULT_COURT_LIST_FUTURE` to `PDF_GENERATOR_REGISTRY`
- [x] Register in `libs/publication/package.json`: add `@hmcts/magistrates-adult-court-list` workspace dependency
- [x] Register in `libs/notifications/src/notification/notification-service.ts`: import summary extractor/formatter, add both list type keys to `EMAIL_BUILDER_REGISTRY`
- [x] Register in `libs/notifications/package.json`: add `@hmcts/magistrates-adult-court-list` workspace dependency
- [x] Register in root `tsconfig.json`: add `"@hmcts/magistrates-adult-court-list"` path mapping
- [x] Write unit tests: `src/validation/json-validator.test.ts` (valid payload passes, missing required fields fails, HTML injection rejected)
- [x] Write unit tests: `src/rendering/renderer.test.ts` (groups by Block Start, correct date formatting, all 10 fields present)
- [x] Write unit tests: `src/email-summary/summary-builder.test.ts` (returns exactly Defendant Name, Informant, Case Number, Offence Title per case)
- [x] Write unit tests: `apps/web/src/pages/(list-types)/magistrates-adult-court-list-daily/index.test.ts`
- [x] Write unit tests: `apps/web/src/pages/(list-types)/magistrates-adult-court-list-future/index.test.ts`
- [x] Run `yarn test` from root and verify all tests pass
