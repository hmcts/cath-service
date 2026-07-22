# Implementation Tasks — #807

## Module scaffold
- [ ] Create `libs/list-types/intellectual-property-enterprise-court-daily-cause-list/` (copy structure from `rcj-standard-daily-cause-list`)
- [ ] Write `package.json` (`@hmcts/intellectual-property-enterprise-court-daily-cause-list`, `.` + `./config` exports, build:nunjucks + build:schemas)
- [ ] Write `tsconfig.json`, `README.md`
- [ ] Write `src/config.ts` (moduleRoot + schemaPath)

## Data model & schema
- [ ] `src/models/types.ts` — `IpecHearing`, `IpecHearingList` (judge, time, venue, type, caseNumber, caseName, additionalInformation)
- [ ] `src/schemas/intellectual-property-enterprise-court-daily-cause-list.json` — array root; required judge/time/venue/type/caseNumber/caseName; additionalInformation optional; no-HTML + simple-time patterns; properties in AC order

## Validation (CI guard mandatory)
- [ ] `src/validation/json-validator.ts` — `validateIpecDailyCauseList`
- [ ] `src/validation/json-validator.test.ts` — valid fixture + one `it` per required field + invalid-time + HTML-injection (real schema, no mocks)
- [ ] Explicit `validate*` re-export in `src/index.ts`

## Conversion
- [ ] `src/conversion/...-config.ts` — bespoke `IPEC_EXCEL_CONFIG` (7 columns in order, `minRows: 1`) + `registerConverterByName("INTELLECTUAL_PROPERTY_ENTERPRISE_COURT_DAILY_CAUSE_LIST", converter)`
- [ ] `src/conversion/...-config.test.ts`

## Rendering
- [ ] `src/rendering/renderer.ts` — `renderIpecDailyCauseList` (header + normalised hearings)
- [ ] `src/rendering/renderer.test.ts`

## PDF
- [ ] `src/pdf/pdf-generator.ts` — `generateIpecDailyCauseListPdf` (listTypeName + LIST_TITLE_MAP)
- [ ] `src/pdf/pdf-template.njk` — 7 columns in AC order
- [ ] `src/pdf/pdf-generator.test.ts`

## Locales & email summary
- [ ] `src/locales/en.ts` and `src/locales/cy.ts` (key parity; Welsh placeholders where needed)
- [ ] `src/email-summary/summary-builder.ts` + test
- [ ] `src/index.ts` — side-effect import of conversion config; export types/locales/renderer/pdf/validator

## Web page
- [ ] `apps/web/src/pages/(list-types)/intellectual-property-enterprise-court-daily-cause-list/index.ts` (createSimpleListTypeHandler + guard)
- [ ] `...njk` template (single table, header, important-info details, case search, downloads, back-to-top)
- [ ] `index.test.ts`
- [ ] `...njk.test.ts` (Cheerio: column order, conditional Additional Information, Welsh, en/cy key parity)

## Registration
- [ ] `libs/list-types/common/src/list-type-data.ts` — add entry
- [ ] `libs/publication/src/processing/service.ts` — add `PDF_GENERATOR_REGISTRY` entry + import
- [ ] `libs/publication/package.json` — add workspace dependency
- [ ] root `tsconfig.json` — add package + `/config` path aliases
- [ ] `apps/web/package.json` — add workspace dependency
- [ ] `apps/web/src/app.ts` — import moduleRoot, add to `modulePaths`
- [ ] `e2e-tests/utils/seed-list-types.ts` — add seed entry (same name/url/flags)

## Jurisdiction/region (pending Q2)
- [ ] Wire Civil (jurisdictionId 1) sub-jurisdiction to RCJ Group (regionId 11) / Rolls Building location in `libs/location/src/location-data.ts` (new or existing sub-jurisdiction id)

## Verify
- [ ] `yarn lint:fix` && `yarn format`
- [ ] `yarn test` (module + publication + web + common guard test pass)
- [ ] Add E2E happy-path journey (public view + Welsh + inline Axe + PDF download)
- [ ] Manual: upload Excel template, confirm publish, view page, download PDF & Excel
</content>
