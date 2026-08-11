# Implementation Tasks

## Implementation Tasks
- [x] Field-name blocker + `additionalInformation` required question resolved — DECIDED: reuse `@hmcts/chd-kb-common` verbatim (issue's exact keys, `additionalInformation` required)
- [x] Scaffold new lib `libs/list-types/insolvency-and-companies-court-chd-daily-cause-list/` (package.json, tsconfig.json) modelled on `companies-winding-up-chd-daily-cause-list`
- [x] Add `src/config.ts` (moduleRoot, assets)
- [x] Add `src/conversion/insolvency-and-companies-court-chd-daily-cause-list-config.ts` reusing `CHD_KB_EXCEL_CONFIG` and registering the converter by name
- [x] Add converter config test
- [x] Add `src/locales/en.ts` and `src/locales/cy.ts` (pageTitle, venue/address, important-information, table headers, caution text) with identical key sets; migrate wording from the pip-frontend staging reference
- [x] Add `src/rendering/renderer.ts` (delegates to `renderChdKbHearingList`) + renderer test
- [x] Add `src/pdf/pdf-generator.ts` + `src/pdf/pdf-template.njk` (7-column) + pdf generator test
- [x] Add `src/index.ts`: side-effect converter import; re-export types, `validate*` (delegating to `validateChdKbListType`), email-summary functions, locales, pdf generator, renderer
- [x] Add list-type entry to `libs/list-types/common/src/list-type-data.ts` (`subJurisdictionIds: [10]`, non-strategic, Public)
- [x] Run `yarn db:generate` (done); `yarn db:migrate:dev` is a no-op (reference-data only, no schema change) and `yarn db:seed` deferred — local dev DB (port 5433) not running in this environment
- [x] Register package paths in root `tsconfig.json` (`.` and `/config`)
- [x] Register `moduleRoot` in `apps/web/src/app.ts` modulePaths
- [x] Add side-effect converter import in BOTH `apps/web/src/pages/(admin)/non-strategic-upload/index.ts` and `.../non-strategic-upload-summary/index.ts` (mirrors sibling PRs #929/#931)
- [x] Register PDF generator in `PDF_GENERATOR_REGISTRY` (`libs/publication/src/processing/service.ts`) + add lib to `libs/publication/package.json`
- [x] Register email-summary extractor in `libs/notifications/src/notification/notification-service.ts` + dep (subscriptions IN SCOPE — decided; mirror PRs #929/#931)
- [x] Create web page `apps/web/src/pages/(list-types)/insolvency-and-companies-court-chd-daily-cause-list/index.ts` with name-keyed guard
- [x] Create `index.njk` (7-column table, search, important-info details, data source, back-to-top)
- [x] Add controller test `index.test.ts` (GET happy path, missing artefactId, wrong list type)
- [x] Add template test `index.njk.test.ts` (header order, row cells, Welsh headings, EN/CY key parity)
- [x] Run `yarn lint:fix`, `yarn test`, `yarn test:e2e`; verify `?lng=cy`, PDF and flat-file downloads — lint clean; new lib (9), notifications (77), publication (388), web page (23) tests pass; app boots (only Redis/DB infra unavailable locally, unrelated to #808)
