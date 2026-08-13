# Tasks — #814 Technology and Construction Court (KB) Daily Cause List

## Implementation Tasks

### Content migration (do this first — everything else depends on the copy)
- [ ] Run the `migrate-pip-pages` skill for pip-frontend `technology-and-construction-court-kb-daily-cause-list` (view: `src/main/views/style-guide/`, locales: `src/main/resources/locales/{en,cy}/`)
- [ ] Create `libs/list-types/technology-and-construction-court-kb-daily-cause-list/src/locales/en.ts` — sibling keys plus `importantInformationHeading2` / `importantInformationLine2`
- [ ] Create the matching `cy.ts` with the real Welsh from pip-frontend (no `[TRANSLATE: ...]` placeholders — the copy exists)
- [ ] Verify `Object.keys(en).sort() === Object.keys(cy).sort()`, including nested `tableHeaders`

### New lib package
- [ ] Create `libs/list-types/technology-and-construction-court-kb-daily-cause-list/package.json` (copy sibling's, change only `name`; keep `build:nunjucks`)
- [ ] Create `tsconfig.json` (copy sibling's verbatim)
- [ ] Create `src/config.ts` (`moduleRoot`, `assets`)
- [ ] Create `src/conversion/technology-and-construction-court-kb-daily-cause-list-config.ts` — re-export `CHD_KB_EXCEL_CONFIG`, `registerConverterByName("TECHNOLOGY_AND_CONSTRUCTION_COURT_KB_DAILY_CAUSE_LIST", ...)`
- [ ] Create `src/rendering/renderer.ts` — wrap `renderChdKbHearingList`, inject `t.pageTitle` as `listTitle`
- [ ] Create `src/pdf/pdf-generator.ts` — copy sibling's, rename export to `generateTechnologyAndConstructionCourtKbDailyCauseListPdf`
- [ ] Create `src/pdf/pdf-template.njk` — copy sibling's, add the second important-information heading/paragraph pair
- [ ] Create `src/index.ts` — side-effect converter import + re-exports (`validateChdKbListType` aliased, hearing types aliased, email-summary builders, locales, pdf, renderer)
- [ ] Confirm no `src/schemas/` and no `src/validation/` directory is created (schema lives in `chd-kb-common`)

### New page
- [ ] Create `apps/web/src/pages/(list-types)/technology-and-construction-court-kb-daily-cause-list/index.ts` using `createSimpleListTypeHandler` with the `listTypeName` guard
- [ ] Create `technology-and-construction-court-kb-daily-cause-list.njk` — copy the sibling template, change only the `govukDetails` html to render both heading/line pairs

### Registration
- [ ] Add the `listTypeData` entry in `libs/list-types/common/src/list-type-data.ts` (`subJurisdictionIds: [10]`, `isNonStrategic: true`, `defaultSensitivity: "Public"`, `provenance: "CFT_IDAM"`, real `welshFriendlyName`)
- [ ] Add the `PDF_GENERATOR_REGISTRY` entry + import in `libs/publication/src/processing/service.ts`
- [ ] Add the `EMAIL_BUILDER_REGISTRY` entry + import in `libs/notifications/src/notification/notification-service.ts`
- [ ] Add the side-effect import to `apps/web/src/pages/(admin)/non-strategic-upload/index.ts`
- [ ] Add the side-effect import to `apps/web/src/pages/(admin)/non-strategic-upload-summary/index.ts`
- [ ] Register `moduleRoot` in `apps/web/src/app.ts` `modulePaths`
- [ ] Add both path aliases (package + `/config`) to the root `tsconfig.json`
- [ ] Add `"workspace:*"` dependency to `apps/web/package.json`, `libs/publication/package.json`, `libs/notifications/package.json`
- [ ] Confirm no change needed to `apps/web/vite.config.ts`, `libs/location/src/location-data.ts`, or any Prisma schema

### Shared-package tidy-up
- [ ] Change `"title"` in `libs/list-types/chd-kb-common/src/schemas/chd-kb-common.json` to a list-type-neutral name (e.g. "CHD/KB Rolls Building Daily Cause List")

### Tests
- [ ] `src/conversion/*.test.ts` — converter resolves for the new `listTypeName`
- [ ] `src/rendering/renderer.test.ts` — English/Welsh title, date formatting, hearings passed through unmutated
- [ ] `src/pdf/pdf-generator.test.ts` — success path, `generatePdfFromHtml` failure, renderer throw
- [ ] Locale parity test (`en` vs `cy` keys, including `tableHeaders`)
- [ ] `apps/web/.../index.test.ts` — render path, wrong list type → 400 (fixture uses `listTypeId: 999`), 400/403/404/500 paths, Welsh locale, data-source label
- [ ] `apps/web/.../*.njk.test.ts` — h1, address, **both** important-information pairs, seven ordered `th[scope="col"]`, per-hearing rows, empty state, search input + label + table class contract, Welsh render, data source, back-to-top
- [ ] Registry integration tests — PDF registry, email registry, `validateListTypeJson` alias resolution, `listTypeData` entry shape and `urlPath` match

### Verify
- [ ] `yarn db:seed` then confirm the list type row exists and location 26 links to sub-jurisdiction 10
- [ ] `yarn lint:fix` and `yarn format`
- [ ] `yarn test` passes from the repo root (including the `chd-kb-common` guard test)
- [ ] Manual: upload a 7-column `.xlsx` at `/non-strategic-upload` for Business and Property Courts Rolls Building, publish, then check the page in English and Welsh and `GET /pdf/:artefactId/download`

### Before merge
- [ ] Get a product answer on Q1 (visible on-page "Download PDF" link — yes or no)
