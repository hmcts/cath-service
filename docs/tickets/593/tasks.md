# Implementation Tasks

## Prerequisites / clarifications
- [x] Resolve the `et-fortnightly-press-list` kebab vs `et-fortnightly-list` package-name mismatch (add `PACKAGE_ALIASES` entry) — see plan §5.1
- [x] Confirm ET lists are JSON-only (no Excel converter needed) — plan §5.2
- [x] Confirm Open Justice item 4 venue-contact format and empty-state copy — plan §5.3, §5.7
- [x] Obtain verbatim CY Open Justice `openJustice1`–`openJustice6` strings from pip-frontend cy locales — plan §5.5
- [x] Confirm `listTypeData` provenance / sensitivity / subJurisdictionIds and whether prod seed SQL rows are needed — plan §5.6

## Lib: @hmcts/et-daily-list
- [x] Scaffold `libs/list-types/et-daily-list/` (package.json, tsconfig.json — copy reference)
- [x] Copy `et_daily_list.json` verbatim into `src/schemas/et-daily-list.json`
- [x] `src/config.ts` (moduleRoot, assets, schemaPath)
- [x] `src/models/types.ts` re-export CauseListData & friends from `@hmcts/daily-cause-list-common`
- [x] `src/rendering/renderer.ts` re-export `renderCauseListData` (+ `renderer.test.ts`)
- [x] `src/validation/json-validator.ts` → `validateEtDailyList` using `validateJson(..., schema, "1.0")`
- [x] `src/validation/json-validator.test.ts` — one `it` per required field at every depth (incl. partyRole enum) after reading the copied schema
- [x] `src/locales/en.ts` and `src/locales/cy.ts` (title from listLookup.json, 7 tableHeaders, openJustice1–6, errors, duration keys)
- [x] `src/pdf/pdf-generator.ts` → `generateEtDailyListPdf` (mirror reference) + `pdf-template.njk` (7-column ET layout) + `pdf-generator.test.ts`
- [x] `src/index.ts` exports (types, renderer, pdf, locales, `validateEtDailyList`)

## Lib: @hmcts/et-fortnightly-list
- [x] Scaffold `libs/list-types/et-fortnightly-list/`
- [x] Copy `et_fortnightly_press_list.json` verbatim into `src/schemas/et-fortnightly-press-list.json`
- [x] `src/config.ts`
- [x] `src/models/types.ts` (re-export shared types)
- [x] `src/rendering/renderer.ts` (+ test)
- [x] `src/validation/json-validator.ts` → `validateEtFortnightlyPressList` (+ test — cover representative partyRole enum)
- [x] `src/locales/en.ts` / `cy.ts` (fortnightly title from listLookup.json, `rep`/`noRep` keys)
- [x] `src/pdf/pdf-generator.ts` → `generateEtFortnightlyPressListPdf` + `pdf-template.njk` (renders representative parties) + test
- [x] `src/index.ts` exports

## Page controllers (apps/web)
- [x] `apps/web/src/pages/(list-types)/et-daily-list/index.ts` + `et-daily-list.njk` + `index.test.ts`
- [x] `apps/web/src/pages/(list-types)/et-fortnightly-list/index.ts` + `et-fortnightly-list.njk` + `index.test.ts`
- [x] Ensure templates: venue name/address, content date, last updated, 7-column table, Open Justice details, case search input, data source footer

## Registration
- [x] Add 4 path aliases to root `tsconfig.json`
- [x] Add both packages as `workspace:*` deps in `apps/web/package.json`
- [x] Import both `moduleRoot`s and add to `modulePaths` in `apps/web/src/app.ts`
- [x] Add `ET_DAILY_LIST` and `ET_FORTNIGHTLY_PRESS_LIST` entries to `PDF_GENERATOR_REGISTRY` in `libs/publication/src/processing/service.ts` (import generators + types)
- [x] Add two entries to `libs/list-types/common/src/list-type-data.ts` + update `list-type-data.test.ts`
- [x] Add `PACKAGE_ALIASES` entry for fortnightly kebab mismatch in `list-type-validator.ts`

## Verify
- [x] `yarn db:generate` (if catalogue/seed touched) and `yarn install` for new workspaces
- [x] `yarn lint:fix` and `yarn build`
- [x] `yarn test` passes workspace-wide (both validator tests, pdf tests, controller tests, guard test, list-type-data test)
- [ ] Manual check: `GET /et-daily-list?artefactId=` and `/et-fortnightly-list?artefactId=` in EN and `?lng=cy`
- [ ] Optional: E2E journey test per list type (happy path + accessibility inline)
