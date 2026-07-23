# Implementation Tasks — #807 IPEC (ChD) Daily Cause List

## Package scaffold
- [ ] Create `libs/list-types/ipec-daily-cause-list/` with `package.json` (`@hmcts/ipec-daily-cause-list`, build:nunjucks + build:schemas scripts) and `tsconfig.json` (copy RCJ package)
- [ ] Add path aliases `@hmcts/ipec-daily-cause-list` and `/config` to root `tsconfig.json`
- [ ] Create `src/config.ts` (`moduleRoot`, `schemaPath`)

## Schema & validation
- [ ] Create `src/schemas/ipec-daily-cause-list.json` (draft-07, array of 7-field objects; required: judge, time, venue, type, caseNumber, caseName; time pattern; no-HTML pattern)
- [ ] Create `src/validation/json-validator.ts` (`validateIpecDailyCauseList` via `createJsonValidator`)
- [ ] Create `src/validation/json-validator.test.ts` (issue example as valid fixture; one test per required field; optional additionalInformation; invalid time)

## Model, conversion, rendering
- [ ] Create `src/models/types.ts` (`IpecHearing`, `IpecHearingList`)
- [ ] Create `src/conversion/ipec-daily-cause-list-config.ts` (dedicated `ExcelConverterConfig` in column order; `registerConverterByName("IPEC_DAILY_CAUSE_LIST", ...)`)
- [ ] Create `src/conversion/ipec-daily-cause-list-config.test.ts`
- [ ] Create `src/rendering/renderer.ts` (`renderIpecDailyCauseList`) + `renderer.test.ts`

## Locales
- [ ] Create `src/locales/en.ts` (page title, table headers, important-info, search labels, data-source labels)
- [ ] Create `src/locales/cy.ts` (identical keys; `[WELSH TRANSLATION REQUIRED: "..."]` markers)

## PDF
- [ ] Create `src/pdf/pdf-generator.ts` (`generateIpecDailyCauseListPdf`) + `pdf-template.njk` + `pdf-generator.test.ts`
- [ ] Export everything from `src/index.ts` (side-effect import of conversion config; validator export is mandatory)

## Wiring
- [ ] Add `listTypeData` entry in `libs/list-types/common/src/list-type-data.ts` (name, friendly names, `urlPath: intellectual-property-and-enterprise-court-daily-cause-list`, `isNonStrategic: true`, `defaultSensitivity: Public`, `subJurisdictionIds: [1]`)
- [ ] Register PDF generator in `libs/publication/src/processing/service.ts` `PDF_GENERATOR_REGISTRY` + import + add dep in `libs/publication/package.json`

## Web page (style guide)
- [ ] Create `apps/web/src/pages/(list-types)/ipec-daily-cause-list/index.ts` (GET via `createSimpleListTypeHandler`, ROUTES)
- [ ] Create `apps/web/src/pages/(list-types)/ipec-daily-cause-list/ipec-daily-cause-list.njk` (header, important info, search, 7-column table)
- [ ] Create `index.test.ts` (guard match/mismatch; `listTypeId: 999` fixture)
- [ ] Create `ipec-daily-cause-list.njk.test.ts` (structure, column order, Welsh, en/cy key parity)

## Verification
- [ ] `yarn db:generate` / re-seed locally to confirm the list type appears under Business and Property Courts Rolls Building
- [ ] Add E2E journey test in `e2e-tests/` (`@nightly`: view → Welsh → Axe → PDF + Excel download)
- [ ] `yarn lint:fix`, `yarn test` green; CI guard test passes (schema has validator export)
- [ ] Resolve open questions in `plan.md` (list-type name string, subJurisdictionIds, headers, court address, Welsh, sensitivity, time format)
