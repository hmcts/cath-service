# Implementation Tasks — #805 Financial List (ChD/KB) Daily Cause List

## Module scaffold (mirror `companies-winding-up-chd-daily-cause-list`, reuse `@hmcts/chd-kb-common`)
- [x] Create `libs/list-types/financial-list-chd-kb-daily-cause-list/` with `package.json` (deps: `@hmcts/chd-kb-common`, `@hmcts/list-types-common`, `@hmcts/pdf-generation`, `@hmcts/postgres-prisma`, `exceljs`, `luxon`, `nunjucks`; `build:nunjucks` script)
- [x] Add `tsconfig.json` and `README.md`
- [x] Add `src/config.ts` (`moduleRoot`, `assets`)

## Conversion, rendering, PDF, locales
- [x] `src/conversion/financial-list-chd-kb-daily-cause-list-config.ts` — reuse `CHD_KB_EXCEL_CONFIG`; `registerConverterByName("FINANCIAL_LIST_CHD_KB_DAILY_CAUSE_LIST", converter)`
- [x] `src/conversion/…-config.test.ts` — assert field order/length, minRows, missing-column/empty-cell rejection
- [x] `src/rendering/renderer.ts` — `renderFinancialListChdKbDailyCauseList` wrapping `renderChdKbHearingList` with local `pageTitle`
- [x] `src/rendering/renderer.test.ts`
- [x] `src/locales/en.ts` + `src/locales/cy.ts` — pageTitle, venue/address, table headers, search labels, cautions, `provenanceLabels` (Welsh markers where unknown)
- [x] `src/pdf/pdf-template.njk`, `src/pdf/pdf-generator.ts` (`generateFinancialListChdKbDailyCauseListPdf`), `src/pdf/pdf-generator.test.ts`
- [x] `src/index.ts` — side-effect import of conversion config; re-export `validateChdKbListType as validateFinancialListChdKbDailyCauseList`, `ChdKb*` types aliased, email-summary helpers, local locales + renderer + pdf

## Page controller (`apps/web/src/pages/(list-types)/financial-list-chd-kb-daily-cause-list/`)
- [x] `index.ts` — `createSimpleListTypeHandler` with `SUPPORTED_LIST_TYPE` guard on `listTypeName`
- [x] `financial-list-chd-kb-daily-cause-list.njk` — GOV.UK table, 7 columns in required order, search, details, back-to-top
- [x] `financial-list-chd-kb-daily-cause-list.njk.test.ts` — structural (Cheerio) + Welsh + locale-key parity
- [x] `index.test.ts` — GET guard + render tests

## Reference data
- [x] Add `FINANCIAL_LIST_CHD_KB_DAILY_CAUSE_LIST` entry to `libs/list-types/common/src/list-type-data.ts` (`urlPath`, `isNonStrategic: true`, `defaultSensitivity: "Public"`, `subJurisdictionIds: [10]` — pending confirmation)

## Registration
- [x] `libs/publication/src/processing/service.ts` — import generator + type; add to `PDF_GENERATOR_REGISTRY`
- [x] `libs/publication/package.json` — add module dependency
- [x] `apps/web/src/app.ts` — import `moduleRoot`, add to `modulePaths` (also `apps/web/package.json` dependency)
- [x] root `tsconfig.json` — add `@hmcts/financial-list-chd-kb-daily-cause-list` + `/config` paths

## Verify
- [x] `yarn db:generate` / seed picks up new list type
- [x] `yarn lint:fix` and `yarn test` pass (incl. `libs/list-types/common` guard + validator-dispatch tests)
- [~] Manual: Excel upload → convert → validate → publish → render EN/CY → PDF + Excel download — automated unit/template tests cover convert, validate, render (EN/CY) and PDF; end-to-end manual upload not run in this environment
