# Tasks — #806 Intellectual Property List (ChD) daily cause list

## Implementation Tasks

### Content source
- [ ] Run the `migrate-pip-pages` skill for `intellectual-property-list-chd-daily-cause-list` to obtain the legacy `.njk` and `en`/`cy` content
- [ ] Reconcile the migrated markup against `apps/web/src/pages/(list-types)/companies-winding-up-chd-daily-cause-list/companies-winding-up-chd-daily-cause-list.njk` (same 7-column shape); prefer the in-repo GOV.UK component usage

### New package `libs/list-types/intellectual-property-list-chd-daily-cause-list`
- [ ] Create `package.json` (name `@hmcts/intellectual-property-list-chd-daily-cause-list`, deps mirroring `companies-winding-up-chd-daily-cause-list` including `@hmcts/chd-kb-common`)
- [ ] Create `tsconfig.json` (copy from the precedent)
- [ ] Create `src/config.ts` (`moduleRoot`, `assets`)
- [ ] Create `src/locales/en.ts` from the migrated pip content
- [ ] Create `src/locales/cy.ts` (reuse `tableHeaders`/boilerplate from the precedent; placeholder any unavailable Welsh per CLAUDE.md)
- [ ] Create `src/conversion/intellectual-property-list-chd-daily-cause-list-config.ts` reusing `CHD_KB_EXCEL_CONFIG` and calling `registerConverterByName("INTELLECTUAL_PROPERTY_LIST_CHD_DAILY_CAUSE_LIST", ...)`
- [ ] Create `src/rendering/renderer.ts` wrapping `renderChdKbHearingList` with `t.pageTitle`
- [ ] Create `src/pdf/pdf-template.njk` (copy precedent, adapt the important-information block)
- [ ] Create `src/pdf/pdf-generator.ts` exporting `generateIntellectualPropertyListChdDailyCauseListPdf`
- [ ] Create `src/index.ts` with the side-effect converter import and the `@hmcts/chd-kb-common` re-exports (including `validateChdKbListType as validateIntellectualPropertyListChdDailyCauseList`)
- [ ] Confirm no `src/schemas/` or `src/validation/` directory is created (schema lives in `chd-kb-common`)

### Reference data
- [ ] Add the `INTELLECTUAL_PROPERTY_LIST_CHD_DAILY_CAUSE_LIST` entry to `libs/list-types/common/src/list-type-data.ts` with `urlPath: "intellectual-property-list-chd-daily-cause-list"`, `isNonStrategic: true`, `provenance: "CFT_IDAM"`, `defaultSensitivity: "Public"`, `subJurisdictionIds: [10]`
- [ ] Verify no change is needed to `libs/location/src/location-data.ts` (location 26 already has region 11 + subJurisdiction 10)
- [ ] Do not write any `.sql` seed file

### Registration
- [ ] Add both `@hmcts/intellectual-property-list-chd-daily-cause-list` paths to root `tsconfig.json`
- [ ] Add `workspace:*` dep to `apps/web/package.json`, `libs/publication/package.json`, `libs/notifications/package.json`
- [ ] Add `moduleRoot` import and `modulePaths` entry in `apps/web/src/app.ts`
- [ ] Add side-effect import in `apps/web/src/pages/(admin)/non-strategic-upload/index.ts`
- [ ] Add side-effect import in `apps/web/src/pages/(admin)/non-strategic-upload-summary/index.ts`
- [ ] Register the PDF generator by name in `PDF_GENERATOR_REGISTRY` (`libs/publication/src/processing/service.ts`)
- [ ] Register the email summary extractor/formatter in `libs/notifications/src/notification/notification-service.ts`
- [ ] Run `yarn install` so the workspace links resolve

### Web page
- [ ] Create `apps/web/src/pages/(list-types)/intellectual-property-list-chd-daily-cause-list/index.ts` using `createSimpleListTypeHandler`, guarding on `artefact.listTypeName`
- [ ] Create `intellectual-property-list-chd-daily-cause-list.njk`

### Housekeeping
- [ ] Change the `title` in `libs/list-types/chd-kb-common/src/schemas/chd-kb-common.json` to a shape-describing title now that two list types share it

### Tests
- [ ] `src/conversion/...-config.test.ts` — converter registered under the correct name; 7 fields in the ticket's order
- [ ] `src/rendering/renderer.test.ts` — `en` and `cy` list titles; hearings passed through
- [ ] `src/pdf/pdf-generator.test.ts` — success, storage, and error paths
- [ ] `apps/web/.../index.test.ts` — renders supported list type; 400 on mismatch (fixture `listTypeId: 999`); locale selection
- [ ] `apps/web/.../*.njk.test.ts` — Cheerio structural assertions, empty-list branch, Welsh render, `en`/`cy` key parity
- [ ] Add a fixture using the ticket's exact JSON payload and assert `validateChdKbListType` accepts it
- [ ] Extend the existing non-strategic upload E2E journey (upload → publish → view → axe → Welsh → PDF download) rather than adding a new spec

### Verification
- [ ] `yarn lint:fix` and `yarn format`
- [ ] `yarn test` from the repo root
- [ ] `yarn db:seed` locally and confirm the list type appears for "Business and Property Courts Rolls Building" in the non-strategic upload journey
- [ ] Manually upload the Excel template, publish, and compare the rendered page against the pip-frontend staging reference
- [ ] Resolve Q1 (Excel download) before closing the ticket — it is the one AC not met by the current pipeline
