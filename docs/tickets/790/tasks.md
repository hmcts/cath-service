# Implementation Tasks: #790 — Magistrates Public Adult Court List (Daily & Future)

## Implementation Tasks

- [x] Create `libs/list-types/magistrates-public-adult-court-list/package.json`
- [x] Create `libs/list-types/magistrates-public-adult-court-list/tsconfig.json`
- [x] Create `libs/list-types/magistrates-public-adult-court-list/src/config.ts`
- [x] Create `libs/list-types/magistrates-public-adult-court-list/src/schemas/magistrates-public-adult-court-list.json` (port from pip-data-management / existing magistrates-public-list schema)
- [x] Create `libs/list-types/magistrates-public-adult-court-list/src/locales/en.ts` (title Daily/Future, Listing Time, Defendant Name, Case Number, Sitting at, Session start, reporting restrictions text)
- [x] Create `libs/list-types/magistrates-public-adult-court-list/src/locales/cy.ts` (Welsh translations from ticket)
- [x] Create `libs/list-types/magistrates-public-adult-court-list/src/rendering/renderer.ts` (list manipulation: flatten JSON hierarchy, format listing time, derive defendant name, surface case number)
- [x] Create `libs/list-types/magistrates-public-adult-court-list/src/rendering/renderer.test.ts`
- [x] Create `libs/list-types/magistrates-public-adult-court-list/src/pdf/pdf-generator.ts`
- [x] Create `libs/list-types/magistrates-public-adult-court-list/src/pdf/pdf-template.njk` (header, reporting restrictions, Sitting at / Session start grouped tables with Listing Time / Defendant Name / Case Number columns)
- [x] Create `libs/list-types/magistrates-public-adult-court-list/src/pdf/pdf-generator.test.ts`
- [x] Create `libs/list-types/magistrates-public-adult-court-list/src/email-summary/summary-builder.ts` (Defendant Name + Case Number only)
- [x] Create `libs/list-types/magistrates-public-adult-court-list/src/email-summary/summary-builder.test.ts`
- [x] Create `libs/list-types/magistrates-public-adult-court-list/src/index.ts` (export renderer, PDF generator, email summary, locales)
- [x] Register two new list types in `libs/location/src/list-type-data.ts` (ids 57 and 58: `MAGISTRATES_PUBLIC_ADULT_COURT_LIST_DAILY` and `MAGISTRATES_PUBLIC_ADULT_COURT_LIST_FUTURE`)
- [x] Register PDF generators in `libs/publication/src/processing/service.ts` (import and add both names to `PDF_GENERATOR_REGISTRY`)
- [x] Register email builders in `libs/notifications/src/notification/notification-service.ts` (import and add both names to `EMAIL_BUILDER_REGISTRY`)
- [x] Add path alias in root `tsconfig.json` for `@hmcts/magistrates-public-adult-court-list`
- [x] Register `moduleRoot` in `apps/web/src/app.ts` and add to `modulePaths`
- [x] Create `apps/web/src/pages/(list-types)/magistrates-public-adult-court-list-daily/index.ts`
- [x] Create `apps/web/src/pages/(list-types)/magistrates-public-adult-court-list-daily/magistrates-public-adult-court-list-daily.njk`
- [x] Create `apps/web/src/pages/(list-types)/magistrates-public-adult-court-list-future/index.ts`
- [x] Create `apps/web/src/pages/(list-types)/magistrates-public-adult-court-list-future/magistrates-public-adult-court-list-future.njk`
- [x] Run `yarn test` to confirm all tests pass
- [x] Run `yarn lint:fix` to confirm no linting errors
