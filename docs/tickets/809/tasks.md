# Tasks — #809 Revenue List (ChD) daily cause list

## Pre-flight
- [ ] Confirm Q1 ("Venue Type" = two columns `Venue` + `Type`) — the whole reuse approach depends on it
- [ ] Confirm Q2 (list type name `REVENUE_CHD_DAILY_CAUSE_LIST` and slug `revenue-chd-daily-cause-list`)
- [ ] Confirm Q4 (whether a user-facing PDF download link is in scope)
- [ ] Run the `migrate-pip-pages` skill against the pip-frontend Revenue List (ChD) daily cause list view to obtain the authoritative `pageTitle` and "Important information" copy in English and Welsh (Q7)

## New package `libs/list-types/revenue-chd-daily-cause-list/`
- [ ] Create `package.json` (`@hmcts/revenue-chd-daily-cause-list`), copying the sibling's deps, `exports` map and `build` / `build:nunjucks` scripts
- [ ] Create `tsconfig.json` extending `../../../tsconfig.json`
- [ ] Create `src/config.ts` exporting `moduleRoot` and `assets`
- [ ] Create `src/locales/en.ts` — copy the sibling's keys verbatim, swapping `pageTitle` and the important-information block
- [ ] Create `src/locales/cy.ts` — copy the sibling's Welsh verbatim, swapping `pageTitle` and the important-information block
- [ ] Create `src/conversion/revenue-chd-daily-cause-list-config.ts` — `registerConverterByName("REVENUE_CHD_DAILY_CAUSE_LIST", createConverter(CHD_KB_EXCEL_CONFIG))`
- [ ] Create `src/rendering/renderer.ts` — `renderRevenueChdDailyCauseList` delegating to `renderChdKbHearingList` with `t.pageTitle` as `listTitle`
- [ ] Create `src/pdf/pdf-template.njk` (copy of the sibling's, with the Revenue important-information block)
- [ ] Create `src/pdf/pdf-generator.ts` — `generateRevenueChdDailyCauseListPdf`, saving `<artefactId>.pdf` via `savePdfToStorage`
- [ ] Create `src/index.ts` — side-effect converter import, type aliases, `validateChdKbListType as validateRevenueChdDailyCauseList`, email-summary re-exports, locale exports, renderer and PDF re-exports
- [ ] Do **not** create `src/schemas/` or a local validator

## New page `apps/web/src/pages/(list-types)/revenue-chd-daily-cause-list/`
- [ ] Create `index.ts` — `createSimpleListTypeHandler` with a `guardArtefact` on `listTypeName`
- [ ] Create `revenue-chd-daily-cause-list.njk` — adapt the migrated pip-frontend view against the sibling's layout (heading, FaCT link, venue block, dates, details, search, seven-column table, empty state, data source, back to top)

## Registrations
- [ ] Add the `REVENUE_CHD_DAILY_CAUSE_LIST` entry to `libs/list-types/common/src/list-type-data.ts` (no hand-written `.sql`)
- [ ] Add the PDF generator to `PDF_GENERATOR_REGISTRY` in `libs/publication/src/processing/service.ts` (nothing in `EXCEL_GENERATOR_REGISTRY`)
- [ ] Add the email builder to `EMAIL_BUILDER_REGISTRY` in `libs/notifications/src/notification/notification-service.ts`
- [ ] Add the side-effect converter import to `apps/web/src/pages/(admin)/non-strategic-upload/index.ts`
- [ ] Add the side-effect converter import to `apps/web/src/pages/(admin)/non-strategic-upload-summary/index.ts`
- [ ] Add `moduleRoot` to `modulePaths` in `apps/web/src/app.ts`
- [ ] Add the workspace dependency to `apps/web/package.json`, `libs/publication/package.json` and `libs/notifications/package.json`
- [ ] Add both `paths` entries to the root `tsconfig.json`
- [ ] Leave `libs/location/src/location-data.ts` unchanged (locationId 26 already exists)

## Tests
- [ ] `src/conversion/revenue-chd-daily-cause-list-config.test.ts` — registration by name, key order, and the five rejection cases
- [ ] `src/rendering/renderer.test.ts` — English and Welsh list title, date formatting, pass-through including `[]`
- [ ] `src/pdf/pdf-generator.test.ts` — success path uploads `<artefactId>.pdf`; failure returns a failure result without throwing
- [ ] `src/locales/locales.test.ts` — recursive en/cy key parity
- [ ] Validator test covering the fully populated fixture plus one `it` per required field removed (real schema, deep clone, no mocks)
- [ ] `apps/web/.../index.test.ts` — render, Welsh, wrong list type (400, `listTypeId: 999`), missing artefactId, missing artefact, missing blob, invalid JSON, unexpected error
- [ ] `apps/web/.../revenue-chd-daily-cause-list.njk.test.ts` — Cheerio structural assertions per the plan
- [ ] Registry tests — PDF registry, email registry, and `listTypeData` entry shape
- [ ] One `@nightly` E2E journey spec in `e2e-tests/` covering publish → view → validate → Welsh → axe

## Verification
- [ ] `yarn db:seed` locally and confirm the list type appears for Business and Property Courts Rolls Building on `/non-strategic-upload`
- [ ] Upload a valid seven-column `.xlsx` and view the page in English and Welsh
- [ ] Confirm the guard test in `libs/list-types/common/src/validation/guard.test.ts` still passes
- [ ] `yarn lint:fix`, `yarn test`, `yarn test:e2e` from the repo root
