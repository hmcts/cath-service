# Implementation Tasks — Interim Applications List (ChD) Daily Cause List (#798)

## Lib scaffolding
- [ ] Create `libs/list-types/interim-applications-chd-daily-cause-list/` with `package.json`, `tsconfig.json`, `README.md` (copy from london-administrative-court-daily-cause-list)
- [ ] Add `src/config.ts` (moduleRoot, assets, schemaPath) + `config.test.ts`
- [ ] Add `src/models/types.ts` (`InterimApplicationsChdData`, `InterimHearing`, `OpenJusticeStatement`)

## Conversion
- [ ] Add Tab 1 + Tab 2 `ExcelConverterConfig`s and `createMultiSheetConverter` wiring in `src/conversion/interim-applications-chd-daily-cause-list-config.ts`
- [ ] Register with `registerConverterByName("INTERIM_APPLICATIONS_CHD_DAILY_CAUSE_LIST", ...)`
- [ ] Add converter unit tests (valid workbook, missing field, bad time, HTML, empty Tab 2)

## Schema & validation
- [ ] Add `src/schemas/interim-applications-chd-daily-cause-list.json` (draft-07, hearingList + openJusticeStatementDetails)
- [ ] Add `src/validation/json-validator.ts` (`validateInterimApplicationsChdDailyCauseList`)
- [ ] Add `src/validation/json-validator.test.ts` (one `it` per required field, every nesting level)

## Rendering & content
- [ ] Add `src/rendering/renderer.ts` (`renderInterimApplicationsChd`) + tests (per-upload editability, empty open-justice fallback)
- [ ] Add `src/locales/en.ts` and `src/locales/cy.ts` (mirror keys; mark Welsh as required)

## PDF
- [ ] Add `src/pdf/pdf-generator.ts` (`generateInterimApplicationsChdPdf`), `pdf-template.njk`, and test

## Barrel
- [ ] Add `src/index.ts`: side-effect import of conversion config + re-export locales, models, renderer, pdf-generator, validator

## Page controller
- [ ] Create `apps/web/src/pages/(list-types)/interim-applications-chd-daily-cause-list/` (`index.ts` via `createSimpleListTypeHandler`)
- [ ] Add `index.njk` (h1, FaCT link, location lines, Important information Details, case search, hearings table, downloads, back-to-top)
- [ ] Add `index.test.ts` (render + 400 guard) and `index.njk.test.ts` (structure, Welsh, key parity)

## Registrations
- [ ] Add entry to `libs/list-types/common/src/list-type-data.ts`
- [ ] Add import + `PDF_GENERATOR_REGISTRY` entry in `libs/publication/src/processing/service.ts`
- [ ] Add path alias in root `tsconfig.json`
- [ ] Add `moduleRoot` import + `modulePaths` entry in `apps/web/src/app.ts`
- [ ] Add package dependency in `apps/web/package.json`
- [ ] Update `libs/location/src/location-data.ts` for Business & Property Courts (Rolls Building) / region 11 (pending clarification)

## Verification
- [ ] `yarn db:generate` / seeding check for the new list type
- [ ] Add E2E journey spec (`@nightly`) with inline Axe + PDF/Excel download checks
- [ ] Run `yarn lint:fix`, `yarn test`, and the CI guard test
