# Implementation Tasks: COP Daily Cause List (#591)

## Lib scaffold
- [x] Create `libs/list-types/cop-daily-cause-list/` by cloning `civil-and-family-daily-cause-list`
- [x] Write `package.json` (`@hmcts/cop-daily-cause-list`, build/build:nunjucks/build:pdf-templates scripts, exports `.` + `./config`, deps)
- [x] Write `tsconfig.json` (extends root)
- [x] Write `src/config.ts` (moduleRoot, assets, schemaPath)

## Schema & validation
- [x] Copy `cop_daily_cause_list.json` verbatim into `src/schemas/cop-daily-cause-list.json`
- [x] Write `src/validation/json-validator.ts` (`validateCopDailyCauseList`)
- [x] Write `src/validation/json-validator.test.ts` — one `it` per required field at all 11 nesting levels + HTML-tag rejection, real schema, deep-clone fixture

## Models & rendering
- [x] Write `src/models/types.ts` (re-export `CauseListData` etc. from common; verify no COP divergence)
- [x] Write `src/rendering/renderer.ts` (re-export `renderCauseListData`)
- [x] Write `src/rendering/renderer.test.ts`

## Locales
- [x] Write `src/locales/en.ts` (all ticket keys + shared-handler keys)
- [x] Write `src/locales/cy.ts` (key-parity with en; canonical Welsh + `[WELSH TRANSLATION REQUIRED]` markers)

## Email summary
- [x] Write `src/email-summary/summary-builder.ts` (`extractCaseSummary` — 4 COP fields, ungrouped)
- [x] Write `src/email-summary/summary-builder.test.ts` (multiple cases, empty list)

## PDF
- [x] Write `src/pdf/pdf-generator.ts` (`generateCopDailyCauseListPdf`)
- [x] Write `src/pdf/pdf-template.njk`
- [x] Write `src/pdf/pdf-generator.test.ts` (data source, SCD warning, locale, save failure)

## Barrel
- [x] Write `src/index.ts` — MUST export `validateCopDailyCauseList` (CI guard)

## Web controller
- [x] Create `apps/web/src/pages/(list-types)/cop-daily-cause-list/index.ts` (`createListTypeHandler` + `createCauseListRender`)
- [x] Create `cop-daily-cause-list.njk` (8-column table, accordion, Open Justice, search, SCD warning, data source)
- [x] Create `index.test.ts` (400/404/403/400-invalid branches)
- [x] Create `cop-daily-cause-list.njk.test.ts` (8 headers, accordion, Welsh, SCD both ways, key parity)

## Registration
- [x] Add `@hmcts/cop-daily-cause-list` path to root `tsconfig.json`
- [x] Register `moduleRoot` in `apps/web/src/app.ts` modulePaths
- [x] Add `@hmcts/cop-daily-cause-list` dependency to `apps/web/package.json`
- [x] Add PDF generator entry `COP_DAILY_CAUSE_LIST` to `PDF_GENERATOR_REGISTRY` in `libs/publication/src/processing/service.ts`
- [ ] (Only if confirmed) register Excel converter via `registerConverterByName("COP_DAILY_CAUSE_LIST", ...)` — N/A: COP has no Excel export (schema is JSON-only, matching civil-and-family reference)

## E2E & verification
- [x] Write E2E journey test (`@nightly`) — load, table/headings, Welsh, axe-core, data source, Open Justice
- [x] Run `yarn install` (workspace link), `yarn lint:fix`, `yarn test` across workspace
- [x] Confirm CI guard test in `libs/list-types/common` passes
