# Implementation Tasks — #808 Insolvency & Companies Court (ChD) Daily Cause List

## Resolve blockers first
- [ ] Confirm field-name contract with staging reference: `type`/`caseName` (issue) vs `hearingType`/`caseDetails` (RCJ standard) — see plan §5.1
- [ ] Confirm accepted `time` formats before locking the regex
- [ ] Confirm canonical location name for "Business and Property Courts (Rolls Building)" and that no existing location applies
- [ ] Confirm scope: Excel download = original flat file? subscriptions/email-summary in scope? sensitivity Public?

## New lib package `libs/list-types/insolvency-and-companies-court-chd-daily-cause-list/`
- [ ] Create `package.json` (name `@hmcts/insolvency-and-companies-court-chd-daily-cause-list`, exports `.` and `./config`, standard scripts) and `tsconfig.json`
- [ ] Create `src/config.ts` (moduleRoot, assets, schemaPath)
- [ ] Create `src/models/types.ts` — `InsolvencyCompaniesCourtHearing` with issue field names/order
- [ ] Create `src/schemas/insolvency-and-companies-court-chd-daily-cause-list.json` — draft-07 array; required = all except `additionalInformation`; anti-HTML patterns; time pattern
- [ ] Create `src/conversion/…-config.ts` — dedicated Excel config (NOT `RCJ_EXCEL_CONFIG`); `registerConverterByName("INSOLVENCY_AND_COMPANIES_COURT_CHD_DAILY_CAUSE_LIST", …)`
- [ ] Create `src/validation/json-validator.ts` — `validateInsolvencyAndCompaniesCourtChdDailyCauseList`
- [ ] Create `src/validation/json-validator.test.ts` — one `it` per required field, real schema, no mocks
- [ ] Create `src/rendering/renderer.ts` — mirror `renderAdminCourt`
- [ ] Create `src/pdf/pdf-generator.ts` + `pdf-template.njk` — mirror admin court generator, `listTypeName` string
- [ ] Create `src/locales/en.ts` and `src/locales/cy.ts` — identical key structure; use verified Welsh, mark missing with `[WELSH TRANSLATION REQUIRED: …]`
- [ ] Create `src/email-summary/summary-builder.ts` (only if subscriptions in scope)
- [ ] Create `src/index.ts` — side-effect import of converter config; export locales, model, renderer, pdf, validator

## Central registration
- [ ] Root `tsconfig.json` — add `@hmcts/insolvency-and-companies-court-chd-daily-cause-list` path alias
- [ ] `apps/web/package.json` — add `workspace:*` dependency
- [ ] `apps/web/src/app.ts` — import `moduleRoot` and add to `modulePaths`
- [ ] `apps/web/vite.config.ts` — add assets only if the lib ships assets
- [ ] `libs/list-types/common/src/list-type-data.ts` — add `ListTypeData` entry (isNonStrategic, urlPath, Public, subJurisdictionIds [1])
- [ ] `libs/publication/src/processing/service.ts` — import generator + add `PDF_GENERATOR_REGISTRY` entry
- [ ] `apps/postgres/prisma/scripts/001_insert_missing_list_types.sql` — add INSERT row
- [ ] `apps/postgres/prisma/scripts/003_upsert_sub_jurisdictions_and_list_type_links.sql` — link to sub_jurisdiction 1 (Civil)
- [ ] `libs/location/src/location-data.ts` — add "Business and Property Courts (Rolls Building)" location (regions [11], subJurisdictions [1])

## Rendered page `apps/web/src/pages/(list-types)/insolvency-and-companies-court-chd-daily-cause-list/`
- [ ] `index.ts` — single-list handler (`createSimpleListTypeHandler` + inline `guardArtefact`), `ROUTES`, `SUPPORTED_LIST_TYPE`
- [ ] `insolvency-and-companies-court-chd-daily-cause-list.njk` — GOV.UK table 7 columns in order; important-info; downloads; back-to-top
- [ ] `index.test.ts` — controller tests (200/400/404/403)
- [ ] `insolvency-and-companies-court-chd-daily-cause-list.njk.test.ts` — template + Welsh + key-parity tests

## Verify
- [ ] `yarn db:generate` / migrations apply cleanly
- [ ] Guard test passes (`libs/list-types/common/src/validation/guard.test.ts`)
- [ ] `yarn lint:fix`, `yarn test`, and template/PDF/converter tests green
- [ ] E2E `@nightly` journey: publish → render → Welsh → axe → download PDF + Excel
