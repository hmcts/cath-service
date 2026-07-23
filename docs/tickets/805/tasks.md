# Implementation Tasks: Financial List (ChD/KB) Daily Cause List (#805)

## Module scaffolding
- [ ] Create `libs/list-types/financial-list-chd-kb-daily-cause-list/` with `package.json`, `tsconfig.json`, `README.md`
- [ ] Add `@hmcts/financial-list-chd-kb-daily-cause-list` path to root `tsconfig.json`
- [ ] Create `src/config.ts` (`moduleRoot`, `schemaPath`)
- [ ] Create `src/models/types.ts` (`FinancialListHearing`, `FinancialListHearingList`)

## Schema & validation
- [ ] Create `src/schemas/financial-list-chd-kb-daily-cause-list.json` (draft-07, seven required fields in order, no-HTML + time patterns)
- [ ] Create `src/validation/json-validator.ts` (`validateFinancialListChdKbDailyCauseList` via `createJsonValidator`)
- [ ] Export validator from `src/index.ts`
- [ ] Create `src/validation/json-validator.test.ts` (real schema, one `it` per required field)

## Excel conversion
- [ ] Create `src/conversion/financial-list-chd-kb-daily-cause-list-config.ts` (Excel config + `registerConverterByName`)
- [ ] Create `src/conversion/...-config.test.ts`

## Rendering
- [ ] Create `src/rendering/renderer.ts` + `renderer.test.ts`
- [ ] Create `src/locales/en.ts` and `src/locales/cy.ts` (key-for-key parity)

## PDF & Excel downloads
- [ ] Create `src/pdf/pdf-template.njk`, `pdf-generator.ts`, `pdf-generator.test.ts`
- [ ] Register generator in `PDF_GENERATOR_REGISTRY` (by name)
- [ ] Add/decide Excel generator and register in `EXCEL_GENERATOR_REGISTRY` (pending open question 4)
- [ ] Add module dependency to `libs/publication/package.json`

## Page controller
- [ ] Create `apps/web/src/pages/(list-types)/financial-list-chd-kb-daily-cause-list/index.ts`
- [ ] Create `financial-list-chd-kb-daily-cause-list.njk` (seven-column GOV.UK table, search, footer)
- [ ] Create `index.test.ts` and `financial-list-chd-kb-daily-cause-list.njk.test.ts`

## Reference data & registration
- [ ] Add entry to `libs/list-types/common/src/list-type-data.ts`
- [ ] Insert row in `apps/postgres/prisma/scripts/001_insert_missing_list_types.sql`
- [ ] Link sub-jurisdiction in `apps/postgres/prisma/scripts/003_upsert_sub_jurisdictions_and_list_type_links.sql`
- [ ] Register `moduleRoot` in `apps/web/src/app.ts` (and assets in `vite.config.ts` if any)

## Verification
- [ ] Confirm `libs/list-types/common/src/validation/guard.test.ts` passes
- [ ] Add E2E `@nightly` public-view journey (table, Welsh, axe, download links)
- [ ] Run `yarn lint:fix`, `yarn test`
