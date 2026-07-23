# Implementation Tasks — #804 Competition List (ChD) Daily Cause List

## Module scaffolding
- [ ] Create `libs/list-types/competition-list-chd-daily-cause-list/` by copying the RCJ module structure
- [ ] Write `package.json` (`@hmcts/competition-list-chd-daily-cause-list`, `.`/`./config` exports, `build:nunjucks` + `build:schemas` steps)
- [ ] Write `tsconfig.json` (extends root)
- [ ] Add `"@hmcts/competition-list-chd-daily-cause-list"` to root `tsconfig.json` paths
- [ ] Write `src/config.ts` (`moduleRoot`, `schemaPath`)
- [ ] Write `src/models/types.ts` (`CompetitionHearing`, `CompetitionHearingList`)

## Validation
- [ ] Write `src/schemas/competition-list-chd-daily-cause-list.json` (draft-07 array; required fields; HTML-tag + time patterns)
- [ ] Write `src/validation/json-validator.ts` (`validateCompetitionListChdDailyCauseList`)
- [ ] Write `src/validation/json-validator.test.ts` (real schema; one test per required field; optional field; HTML + time rejection)

## Conversion
- [ ] Write `src/conversion/competition-list-chd-daily-cause-list-config.ts` (dedicated config + `registerConverterByName`)
- [ ] Write `src/conversion/competition-list-chd-daily-cause-list-config.test.ts`

## Rendering
- [ ] Write `src/rendering/renderer.ts` (`renderCompetitionListChd`)
- [ ] Write `src/rendering/renderer.test.ts`
- [ ] Write `src/locales/en.ts` and `src/locales/cy.ts` (same key structure; Welsh placeholders)

## PDF
- [ ] Write `src/pdf/pdf-generator.ts` (`generateCompetitionListChdDailyCauseListPdf`, `listTypeName: string`)
- [ ] Write `src/pdf/pdf-template.njk`
- [ ] Write `src/pdf/pdf-generator.test.ts`

## Exports
- [ ] Write `src/index.ts` (top-of-file side-effect converter import + all exports)

## Web page
- [ ] Create `apps/web/src/pages/(list-types)/competition-list-chd-daily-cause-list/index.ts` (GET + listTypeName guard)
- [ ] Create `index.njk` (7 columns in order, modelled on RCJ template)
- [ ] Create `index.test.ts` (controller unit tests)
- [ ] Create `competition-list-chd-daily-cause-list.njk.test.ts` (template tests + Welsh + key parity)

## Registration / reference data
- [ ] Add `ListTypeData` entry to `libs/list-types/common/src/list-type-data.ts`
- [ ] Add `list_types` upsert row to `apps/postgres/prisma/scripts/001_insert_missing_list_types.sql`
- [ ] Add sub-jurisdiction link to `apps/postgres/prisma/scripts/003_upsert_sub_jurisdictions_and_list_type_links.sql`
- [ ] Add/confirm "Business and Property Courts Rolls Building" location in `libs/location/src/location-data.ts` (region 11, sub-jurisdiction 1) — pending Clarification #1
- [ ] Register PDF generator in `libs/publication/src/processing/service.ts` (import + wrapper + `PDF_GENERATOR_REGISTRY` entry)
- [ ] Add side-effect import to `apps/web/src/pages/(admin)/non-strategic-upload/index.ts` (and any other converter-resolving upload entry point)
- [ ] Add name to `BASE_LIST_TYPES` in `e2e-tests/utils/seed-list-types.ts`

## E2E
- [ ] Write one Playwright viewing-journey test (`@nightly`) with table assertions, Welsh toggle, inline Axe scan, PDF/Excel download links

## Verification
- [ ] `yarn db:generate` (if needed) and confirm seed scripts apply cleanly
- [ ] `yarn lint:fix` and `yarn test` pass; CI guard test in `libs/list-types/common` passes
- [ ] Visual comparison of rendered page against the staging reference URL
- [ ] Resolve all Clarifications in `plan.md` §6 before / during implementation
