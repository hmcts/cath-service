# Implementation Tasks — #803 Companies Winding Up (ChD) Daily Cause List

## Module scaffolding
- [ ] Create `libs/list-types/companies-winding-up-chd-daily-cause-list/` with `package.json` (`@hmcts/companies-winding-up-chd-daily-cause-list`, `.` + `./config` exports) and `tsconfig.json`, mirroring the court-of-appeal-civil module
- [ ] Add `src/config.ts` (moduleRoot, assets, schemaPath)
- [ ] Register `@hmcts/companies-winding-up-chd-daily-cause-list` path in root `tsconfig.json`

## Model & schema
- [ ] Add `src/models/types.ts` (`CompaniesWindingUpHearing`, `CompaniesWindingUpData`)
- [ ] Add `src/schemas/companies-winding-up-chd-daily-cause-list.json` (array; required judge, time, venue, type, caseNumber, caseName; additionalInformation optional; issue field order; no-HTML + time patterns)

## Validation
- [ ] Add `src/validation/json-validator.ts` (`validateCompaniesWindingUpChdDailyCauseList`)
- [ ] Add `src/validation/json-validator.test.ts` — one `it` per required field, valid fixture, optional-field omitted, invalid time, HTML rejected (real schema, deep clone)

## Excel conversion
- [ ] Add `src/conversion/companies-winding-up-chd-daily-cause-list-config.ts` (config in issue order + `registerConverterByName`)
- [ ] Add `src/conversion/...-config.test.ts` — valid sheet → exact JSON shape/order; missing column; empty cell; invalid time; optional field; converter registered by name

## Rendering & PDF
- [ ] Add `src/rendering/renderer.ts` (`renderCompaniesWindingUpChd`) + `renderer.test.ts`
- [ ] Add `src/pdf/pdf-generator.ts`, `src/pdf/pdf-template.njk`, `src/pdf/pdf-generator.test.ts`

## Locales & exports
- [ ] Add `src/locales/en.ts` and `src/locales/cy.ts` (identical keys; Welsh markers where untranslated; content from reference style guide)
- [ ] Add `src/index.ts` (exports + side-effect conversion import)

## Web page
- [ ] Add `apps/web/src/pages/(list-types)/companies-winding-up-chd-daily-cause-list/index.ts` (`createSimpleListTypeHandler`, guard on `listTypeName`)
- [ ] Add `companies-winding-up-chd-daily-cause-list.njk` (header, address, list/updated lines, important-info details, search input, 7-column table, download links, back-to-top)
- [ ] Add `index.test.ts` (renders for matching artefact; 400 for wrong `listTypeName`; `listTypeId: 999` fixture)
- [ ] Add `companies-winding-up-chd-daily-cause-list.njk.test.ts` (7 headers in order, row renders 7 cells, Welsh headings, en/cy key parity, details block)

## Registration
- [ ] Add `ListTypeData` entry in `libs/list-types/common/src/list-type-data.ts` (+ update `list-type-data.test.ts` if needed)
- [ ] Add PDF generator to `PDF_GENERATOR_REGISTRY` in `libs/publication/src/processing/service.ts`
- [ ] Add list-type row to `apps/postgres/prisma/scripts/001_insert_missing_list_types.sql`
- [ ] Add sub-jurisdiction mapping (Civil Court, 1) to `003_upsert_sub_jurisdictions_and_list_type_links.sql`
- [ ] Verify app wiring (`apps/web/src/app.ts` modulePaths / vite assets) against the court-of-appeal-civil sibling

## E2E & verification
- [ ] Add one E2E journey (`@nightly`): open page → heading + table → case search → Welsh toggle → inline Axe → PDF/Excel download links
- [ ] Run `yarn lint:fix`, `yarn test`, `yarn db:generate` and confirm the list-type guard test passes
</content>
