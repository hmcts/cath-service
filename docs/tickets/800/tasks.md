# Implementation Tasks — #800 Business list (ChD) daily cause list

## Library module (`libs/list-types/business-list-chd-daily-cause-list/`)
- [ ] Scaffold the module: `package.json` (name `@hmcts/business-list-chd-daily-cause-list`, copy scripts incl. `build:schemas`/`build:nunjucks` from rcj-standard) and `tsconfig.json`
- [ ] Add `"@hmcts/business-list-chd-daily-cause-list"` (and `/config`) to root `tsconfig.json` `paths`
- [ ] `src/config.ts` — export `moduleRoot` and `schemaPath`
- [ ] `src/models/types.ts` — `BusinessListChdHearing`, `BusinessListChdHearingList`
- [ ] `src/schemas/business-list-chd-daily-cause-list.json` — root array; required `[judge, time, venue, type, caseNumber, caseName]`; `additionalInformation` optional; fields in AC order; reuse no-HTML + RCJ time patterns
- [ ] `src/validation/json-validator.ts` — `validateBusinessListChdDailyCauseList()` via `createJsonValidator(schemaPath)`
- [ ] `src/validation/json-validator.test.ts` — real schema, valid fixture + one `it` per required field + optional-field + invalid-time cases
- [ ] `src/conversion/business-list-chd-daily-cause-list-config.ts` — bespoke 7-field `BUSINESS_LIST_CHD_EXCEL_CONFIG` + `registerConverterByName("BUSINESS_LIST_CHD_DAILY_CAUSE_LIST", ...)`
- [ ] `src/conversion/*-config.test.ts` — field order, required flags, `minRows`, time validator accept/reject
- [ ] `src/rendering/renderer.ts` — `renderBusinessListChd()` building header + hearings in order
- [ ] `src/rendering/renderer.test.ts`
- [ ] `src/pdf/pdf-generator.ts` + `pdf-template.njk` — `generateBusinessListChdDailyCauseListPdf()` accepting `listTypeName: string`
- [ ] `src/pdf/pdf-generator.test.ts`
- [ ] `src/locales/en.ts` and `src/locales/cy.ts` — identical keys; Welsh via `[WELSH TRANSLATION REQUIRED: "..."]`
- [ ] `src/index.ts` — side-effect import of converter config + public exports

## Web page (`apps/web/src/pages/(list-types)/business-list-chd-daily-cause-list/`)
- [ ] `index.ts` — `ROUTES`, `createSimpleListTypeHandler`, `listTypeName` guard, render
- [ ] `business-list-chd-daily-cause-list.njk` — 7-column `govuk-table` matching staging style guide
- [ ] `index.test.ts` — render EN/CY, 400 wrong list type, 404 missing artefact/JSON, 400 schema fail
- [ ] `business-list-chd-daily-cause-list.njk.test.ts` — 7 headers in order, rows, cell mapping, Welsh, key parity

## Registration & wiring
- [ ] `libs/publication/src/processing/service.ts` — import generator + add `BUSINESS_LIST_CHD_DAILY_CAUSE_LIST` to `PDF_GENERATOR_REGISTRY`
- [ ] `libs/publication/package.json` — add `@hmcts/business-list-chd-daily-cause-list` dependency
- [ ] Confirm no `apps/web/src/app.ts` change needed (page auto-discovered; PDF template self-resolved)
- [ ] `e2e-tests/utils/seed-list-types.ts` — add `BUSINESS_LIST_CHD_DAILY_CAUSE_LIST` to `BASE_LIST_TYPES`

## Reference data (pending clarifications 1 & 2)
- [ ] Ensure "Business and Property Courts Rolls Building" location exists and is linked to Civil jurisdiction / Royal Courts of Justice Group region

## E2E & verification
- [ ] `e2e-tests/tests/business-list-chd-daily-cause-list.spec.ts` — one journey: upload → view → Welsh → axe-core → PDF + Excel downloads
- [ ] Run `yarn db:generate` if any schema/client interaction requires it (no migration expected)
- [ ] `yarn lint:fix`, `yarn test`, `yarn test:e2e` all pass
- [ ] Verify CI guard test in `libs/list-types/common` passes (schema has `validate*` export)
