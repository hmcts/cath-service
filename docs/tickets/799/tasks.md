# Tasks: Admiralty Court (KB) Daily Cause List (#799)

## Reference data

- [ ] Add the `ADMIRALTY_COURT_KB_DAILY_CAUSE_LIST` entry to `libs/list-types/common/src/list-type-data.ts` (`isNonStrategic: true`, `urlPath: "admiralty-court-kb-daily-cause-list"`, `subJurisdictionIds: [10]`, `defaultSensitivity: "Public"`, `provenance: "CFT_IDAM"`)
- [ ] Confirm no `libs/location/src/location-data.ts` change is needed (location 26 already maps to region 11 and sub-jurisdiction 10)

## New package `libs/list-types/admiralty-court-kb-daily-cause-list`

- [ ] Scaffold the package by copying `libs/list-types/companies-winding-up-chd-daily-cause-list` (`package.json` incl. the `build:nunjucks` step, `tsconfig.json`, `src/config.ts`)
- [ ] Migrate content: run the `migrate-pip-pages` skill against pip-frontend `admiralty-court-kb-daily-cause-list` (view + `en`/`cy` locale JSON)
- [ ] Write `src/locales/en.ts` and `src/locales/cy.ts` from the migrated content, with `importantInformationHeading1..3` / `importantInformationLine1..3`; use `Lleoliad` for the Welsh venue header
- [ ] Add `src/conversion/admiralty-court-kb-daily-cause-list-config.ts` — reuse `CHD_KB_EXCEL_CONFIG`, `registerConverterByName("ADMIRALTY_COURT_KB_DAILY_CAUSE_LIST", …)`
- [ ] Add `src/rendering/renderer.ts` delegating to `renderChdKbHearingList` with `t.pageTitle`
- [ ] Add `src/pdf/pdf-generator.ts` and `src/pdf/pdf-template.njk` (three important-information sections)
- [ ] Add `src/index.ts` — register-on-import, re-export `validateChdKbListType as validateAdmiraltyCourtKbDailyCauseList`, the email-summary pair, `AdmiraltyCourtKbHearing`/`…HearingList` type aliases, locales, renderer, PDF generator

## Registration

- [ ] Root `tsconfig.json` — add `@hmcts/admiralty-court-kb-daily-cause-list` and `/config` paths
- [ ] `apps/web/package.json` — add the workspace dependency
- [ ] `apps/web/src/app.ts` — import `moduleRoot` from `/config` and add it to `modulePaths`
- [ ] `apps/web/src/pages/(admin)/non-strategic-upload/index.ts` — add the bare converter-registration import
- [ ] `apps/web/src/pages/(admin)/non-strategic-upload-summary/index.ts` — add the bare converter-registration import
- [ ] `libs/publication/package.json` + `src/processing/service.ts` — add the `PDF_GENERATOR_REGISTRY` entry keyed by name
- [ ] `libs/notifications/package.json` + `src/notification/notification-service.ts` — add the summary extractor/formatter registry entry
- [ ] `yarn install` to link the new workspace package

## Public page

- [ ] Create `apps/web/src/pages/(list-types)/admiralty-court-kb-daily-cause-list/index.ts` using `createSimpleListTypeHandler` with a `listTypeName` guard
- [ ] Create `admiralty-court-kb-daily-cause-list.njk` from the migrated pip-frontend markup, adapted to `layouts/base-template.njk` / `govukDetails` / `t.tableHeaders.*`

## Tests

- [ ] `src/conversion/admiralty-court-kb-daily-cause-list-config.test.ts` — field names, order, required flags, converter registered under the correct name
- [ ] `src/rendering/renderer.test.ts` — header from `en`/`cy` `pageTitle`, date formatting, hearings unmutated
- [ ] `src/pdf/pdf-generator.test.ts` — success and failure paths
- [ ] `apps/web/.../index.test.ts` — 400 missing `artefactId`, 400 wrong `listTypeName` (fixture `listTypeId: 999`), happy-path render args
- [ ] `apps/web/.../admiralty-court-kb-daily-cause-list.njk.test.ts` — 7 headers in order, row/cell order, three information sections, no-hearings message, Welsh render, `en`/`cy` key parity

## Verify

- [ ] `yarn db:seed` then confirm the list type appears under Business and Property Courts Rolls Building and in the admin upload dropdown
- [ ] Upload a 7-column `.xlsx` via `/non-strategic-upload`, publish, and confirm the page renders in English and Welsh (`?lng=cy`) and the PDF downloads
- [ ] `yarn lint:fix`, `yarn test`, `yarn build`
- [ ] Resolve the open questions in `plan.md` — in particular #2 (Excel download) before closing the ticket
