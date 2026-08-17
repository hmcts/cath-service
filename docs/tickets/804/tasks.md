# Implementation Tasks: #804 Competition List (ChD) Daily Cause List

## Setup / scaffolding
- [x] Create `libs/list-types/competition-list-chd-daily-cause-list/` by cloning `companies-winding-up-chd-daily-cause-list` structure
- [x] Add `package.json` (`@hmcts/competition-list-chd-daily-cause-list`, `.` + `./config` exports, `build` + `build:nunjucks` scripts, deps on `@hmcts/chd-kb-common`, `@hmcts/list-types-common`, `@hmcts/pdf-generation`, `@hmcts/publication`)
- [x] Add `tsconfig.json` (extend root, outDir/rootDir/declaration)
- [x] Register module paths in root `tsconfig.json` (`@hmcts/competition-list-chd-daily-cause-list` + `/config`)

## Module source (delegating to @hmcts/chd-kb-common)
- [x] `src/config.ts` — `moduleRoot`, `assets`
- [x] `src/conversion/competition-list-chd-daily-cause-list-config.ts` — `createConverter(CHD_KB_EXCEL_CONFIG)` + `registerConverterByName("COMPETITION_LIST_CHD_DAILY_CAUSE_LIST", converter)`
- [x] `src/conversion/…-config.test.ts` — field order + conversion tests
- [x] `src/rendering/renderer.ts` — `renderCompetitionListChdDailyCauseList` delegating to `renderChdKbHearingList`
- [x] `src/rendering/renderer.test.ts`
- [x] `src/pdf/pdf-generator.ts` — `generateCompetitionListChdDailyCauseListPdf`
- [x] `src/pdf/pdf-generator.test.ts`
- [x] `src/pdf/pdf-template.njk` — migrated PDF template
- [x] `src/index.ts` — side-effect converter import; re-export hearing types, `validateCompetitionListChdDailyCauseList`, email-summary helpers, locales, renderer, pdf
- [x] `src/locales/en.ts` — page content (migrated copy from pip-frontend reference)
- [x] `src/locales/cy.ts` — Welsh mirror (migrated Welsh from pip-frontend cy locale)

## Rendered page (apps/web)
- [x] TEMPLATE SOURCE: migrate `.njk` view + locale content from pip-frontend `competition-list-chd-daily-cause-list` (fetched via gh api, migrated per skill)
- [x] `apps/web/src/pages/(list-types)/competition-list-chd-daily-cause-list/index.ts` — `createSimpleListTypeHandler` with `listTypeName` guard
- [x] `.../competition-list-chd-daily-cause-list.njk` — migrated template
- [x] `.../index.test.ts` — controller tests (GET renders; guard rejects wrong `listTypeName` with 400 + `errors/common`)
- [x] `.../competition-list-chd-daily-cause-list.njk.test.ts` — template tests (7 headers in order, row-per-hearing, Welsh headings, en/cy key parity)

## Reference data (TypeScript single source of truth — no SQL)
- [x] Add `COMPETITION_LIST_CHD_DAILY_CAUSE_LIST` entry to `libs/list-types/common/src/list-type-data.ts`
- [x] Verify Rolls Building location (already in region 11, subJurisdictions [10]) links to the chosen sub-jurisdiction (10); no edit needed to `libs/location/src/location-data.ts`

## Registration touch-points
- [x] `libs/publication/src/processing/service.ts` — import + register PDF generator under `COMPETITION_LIST_CHD_DAILY_CAUSE_LIST`
- [x] `apps/web/src/pages/(admin)/non-strategic-upload/index.ts` — add side-effect import of the module
- [x] `apps/web/src/pages/(admin)/non-strategic-upload-summary/index.ts` — add side-effect import of the module
- [x] `apps/web/src/app.ts` — import `moduleRoot` and add to `modulePaths`
- [x] `libs/notifications/src/notification/notification-service.ts` — wire email summary builder (parity with companies-winding-up)
- [ ] `e2e-tests/utils/seed-list-types.ts` — add to `BASE_LIST_TYPES` (deferred with the E2E test)

## Tests
- [x] Converter config test (registration under name; field-level behaviour covered by chd-kb-common)
- [x] Renderer test (maps hearings, formats header, empty list, Welsh title, PM time)
- [x] PDF generation test
- [x] Controller test + template test (above)

## Verification
- [~] `yarn db:seed` locally and confirm the list type appears under Business and Property Courts Rolls Building — not run in this environment (no DB); reference-data entry added to the TypeScript single source of truth
- [~] Upload a sample Excel via non-strategic route; confirm conversion, storage, render, and PDF — deferred to a running environment; converter registration + PDF generator wiring verified by unit tests
- [x] `yarn lint:fix`, `yarn test`, `yarn build` all pass
- [~] Resolve CLARIFICATIONS NEEDED items with product before finalising copy/Welsh/sub-jurisdiction/provenance — see final summary; defaults follow the companies-winding-up sibling and pip-frontend source
