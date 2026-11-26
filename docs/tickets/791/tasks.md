# Tasks — #791 Style Guide: IAC Daily List

## Blocking pre-work (port from pip repos)
- [x] Port `iac_daily_list.json` schema, `iac-daily-list.njk` template, `IacDailyListService.ts` field logic, and `en/cy/iac-daily-list.json` strings from the pip repos (record exact field names, required arrays at every nesting level, columns and grouping)
- [x] Confirm whether both list types share one JSON structure (one schema) or need two — one shared schema/lib/validator
- [x] Resolve open questions in plan §5 (allowedProvenance, defaultSensitivity, email summary needed?, Welsh typo, ordering scope) — see final report open questions

## Implementation Tasks
- [x] Create lib `libs/list-types/iac-daily-list/` with `package.json` (build + build:nunjucks + build:schemas) and `tsconfig.json`
- [x] Add `src/config.ts` (moduleRoot, assets, schemaPath)
- [x] Add `src/models/types.ts` (IacDailyList / IacHearing — fields from pip port)
- [x] Add `src/schemas/iac-daily-list.json` (ported)
- [x] Add `src/validation/json-validator.ts` (`validateIacDailyList` via `createJsonValidator`)
- [x] Add `src/validation/json-validator.test.ts` (one `it` per required field, every nesting level, deep-clone isolation)
- [x] Add `src/rendering/renderer.ts` + `renderer.test.ts` (`renderIacDailyList` → `{ header, hearings }`)
- [x] Add `src/locales/en.ts` and `src/locales/cy.ts` (keyed `IAC_DAILY_LIST`, `IAC_DAILY_LIST_ADDITIONAL_CASES`, `common`; Welsh placeholders where missing)
- [x] Add `src/pdf/pdf-generator.ts` + `pdf-template.njk` + `pdf-generator.test.ts` (`generateIacDailyListPdf`, title chosen by `listTypeName`)
- [ ] (If required) Add `src/email-summary/summary-builder.ts` + test (`extractCaseSummary`, `formatCaseSummaryForEmail`) — deferred, out of scope (see open questions)
- [x] Add `src/index.ts` exporting types, renderer, validator (`validate*` — required for CI guard), locales, pdf, (email summary)
- [x] Register `@hmcts/iac-daily-list` and `@hmcts/iac-daily-list/config` in root `tsconfig.json` paths

## Seed catalogue
- [x] Add `IAC_DAILY_LIST` and `IAC_DAILY_LIST_ADDITIONAL_CASES` to `libs/list-types/common/src/list-type-data.ts` (subJurisdictionIds `[6]`, `isNonStrategic:false`, allowedProvenance + defaultSensitivity per §5, Welsh double-space normalised)
- [x] Extend `libs/list-types/common/src/list-type-data.test.ts` with the two entries (unique name/url, friendly names, subJurisdictionIds)

## Web pages
- [x] Create `apps/web/src/pages/(list-types)/iac-daily-list/index.ts` (`ROUTES` for both URLs, `createMultiListGuardAndRender` + `createSimpleListTypeHandler`)
- [x] Add `iac-daily-list.njk` and `iac-daily-list-additional-cases.njk` templates (GOV.UK Table/Details, data source, back-to-top, caution notes)
- [x] Add `index.test.ts` (missing/unknown/blob/invalid/403/500; fixtures use arbitrary `listTypeId: 999`, routing driven by `listTypeName`)
- [x] Add `.njk.test.ts` for both templates (structure + Welsh + en/cy key parity)

## Pipeline registration
- [x] Register both names in `PDF_GENERATOR_REGISTRY` (`libs/publication/src/processing/service.ts`) and add `@hmcts/iac-daily-list` to `libs/publication/package.json`
- [ ] (If email summary in scope) Register both names in `EMAIL_BUILDER_REGISTRY` (`libs/notifications/...`) and add the workspace dep — deferred (see open questions)

## Ordering (AC2)
- [x] Expose stable list-type `name` on mapped publications and add `IAC_ORDER` tie-break in `apps/web/src/pages/(public)/summary-of-publications/index.ts`
- [x] Add test proving Daily-List-before-Additional-Cases in both publish orders and both locales

## App wiring
- [x] Add `moduleRoot as iacDailyListModuleRoot` from `@hmcts/iac-daily-list/config` to `modulePaths` in `apps/web/src/app.ts`
- [x] Add vite asset entry only if the lib ships frontend assets — lib ships no frontend assets, no vite entry needed

## Verification
- [x] `yarn db:generate` not needed (no new Prisma schema); run seed locally to confirm entries upsert
- [x] Run guard test (`libs/list-types/common`), lib tests, controller tests, summary-of-publications test
- [ ] Add `@nightly` E2E: upload a seeded IAC publication, view from venue, assert content + ordering + inline Axe + Welsh toggle — deferred (requires artefact seeding infrastructure; see final report)
- [x] `yarn lint:fix` and `yarn test`
