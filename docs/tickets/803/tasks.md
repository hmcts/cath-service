## Implementation Tasks

### Module scaffolding: `libs/list-types/companies-winding-up-chd-daily-cause-list/`
- [x] Create `package.json` (name `@hmcts/companies-winding-up-chd-daily-cause-list`, modelled on `court-of-appeal-civil-daily-cause-list/package.json`)
- [x] Create `tsconfig.json` (standard shape per `@CLAUDE.md`)
- [x] Create `src/config.ts` (`moduleRoot`, `assets`, `schemaPath`)
- [x] Create `src/models/types.ts` (`CompaniesWindingUpHearing`, `CompaniesWindingUpHearingList`)
- [x] Create `src/schemas/companies-winding-up-chd-daily-cause-list.json` (draft-07, root `type: "array"`, required `judge, time, venue, type, caseNumber, caseName`, optional `additionalInformation`, no-HTML pattern on text fields, time pattern on `time`)
- [x] Create `src/validation/json-validator.ts` (`validateCompaniesWindingUpChdDailyCauseList` via `createJsonValidator`)
- [x] Create `src/validation/json-validator.test.ts` (one `it` per required field, real schema, no mocks, valid fixture, optional field, invalid time, HTML rejection)
- [x] Create `src/conversion/companies-winding-up-chd-daily-cause-list-config.ts` (`ExcelConverterConfig` with 7 fields in issue order, `registerConverterByName("COMPANIES_WINDING_UP_CHD_DAILY_CAUSE_LIST", ...)`)
- [x] Create `src/conversion/companies-winding-up-chd-daily-cause-list-config.test.ts` (valid sheet round-trips to exact JSON shape/order, missing column, empty required cell, invalid time, optional field handling, converter registered under correct name)
- [x] Create `src/rendering/renderer.ts` (header: title/list date/last-updated; flat hearings passthrough, no daily/future split)
- [x] Create `src/rendering/renderer.test.ts`
- [x] Create `src/pdf/pdf-generator.ts` (`generateCompaniesWindingUpChdDailyCauseListPdf`, using `BasePdfGenerationOptions`, `configureNunjucks`, `createPdfErrorResult`, `loadTranslations`, `PDF_BASE_STYLES`, `savePdfToStorage`)
- [x] Create `src/pdf/pdf-generator.test.ts` (HTML generation, saved PDF result, correct list title mapping, empty list handling)
- [x] Create `src/pdf/pdf-template.njk` (modelled on `court-of-appeal-civil-daily-cause-list` PDF template, single flat hearings table)
- [x] Create `src/email-summary/summary-builder.ts` (`extractCaseSummary`, re-export `formatCaseSummaryForEmail`/`SPECIAL_CATEGORY_DATA_WARNING`)
- [x] Create `src/email-summary/summary-builder.test.ts`
- [x] Create `src/locales/en.ts` (page title, court address, important-information text, table headers — copy CONFIRMED, taken verbatim from `pip-frontend/src/main/resources/locales/en/companies-winding-up-chd-daily-cause-list.json`; use lower-case "Case number"/"Case name" table headers per that source)
- [x] Create `src/locales/cy.ts` (Welsh equivalents — copy CONFIRMED, taken verbatim from `pip-frontend/src/main/resources/locales/cy/companies-winding-up-chd-daily-cause-list.json`; no `[WELSH TRANSLATION REQUIRED]` markers needed for these fields)
- [x] Create `src/index.ts` (business-logic exports only: validator, pdf generator, email-summary, renderer, types; side-effect import of conversion config)

### Page: `apps/web/src/pages/(list-types)/companies-winding-up-chd-daily-cause-list/`
- [x] Create `index.ts` (`GET` via `createSimpleListTypeHandler`, `guardArtefact` checks `listTypeName === "COMPANIES_WINDING_UP_CHD_DAILY_CAUSE_LIST"`, `ROUTES = ["/companies-winding-up-chd-daily-cause-list"]`)
- [x] Create `companies-winding-up-chd-daily-cause-list.njk` (extends `layouts/base-template.njk`, `govukDetails` for important information, `#case-search-input` + `.hearings-table` for table-search wiring, 7 `<th scope="col">` headers in issue order, data-source line, back-to-top anchor — **no Excel download link**; PDF-only download, per CONFIRMED decision not to implement downloadable Excel for this list type)
- [x] Create `index.test.ts` (renders for matching artefact; 400/common error for non-matching `listTypeName`; fixture uses `listTypeId: 999`)
- [x] Create `companies-winding-up-chd-daily-cause-list.njk.test.ts` (7 column headers in order; row renders all 7 cells; Welsh headings; `en`/`cy` key parity; important-information block present)

### Reference data (single sources of truth — no hand-written SQL)
- [x] Add `ListTypeData` entry to `libs/list-types/common/src/list-type-data.ts` (`name: "COMPANIES_WINDING_UP_CHD_DAILY_CAUSE_LIST"`, `urlPath: "companies-winding-up-chd-daily-cause-list"`, `isNonStrategic: true`, `defaultSensitivity: "Public"`, `provenance: "CFT_IDAM"`, `subJurisdictionIds: [10]` — **High Court, CONFIRMED, not Civil Court [1]**)
- [x] Add new `Location` entry to `libs/location/src/location-data.ts` (`locationId: 26`, name "Business and Property Courts Rolls Building", `welshName: "Llysoedd Busnes ac Eiddo - Adeilad Rolls"` — CONFIRMED, `regions: [11]`, `subJurisdictions: [10]` — **High Court, CONFIRMED**)
- [x] Run `yarn db:generate` and `yarn db:seed` locally to verify the new location/list-type appear correctly — verified directly against the local Postgres DB: `ListType.name = "COMPANIES_WINDING_UP_CHD_DAILY_CAUSE_LIST"` seeded with `subJurisdictions: [{ subJurisdictionId: 10 }]`; `Location.locationId = 26` seeded with `locationRegions: [{ regionId: 11 }]`, `locationSubJurisdictions: [{ subJurisdictionId: 10 }]`. See "Open issues/risks" in final report re: a pre-existing local-seed-script gap discovered during this verification (junction tables not fully synced on repeated non-empty-DB seeds), corrected directly in the local DB for this entry.

### Registration touch-points (existing files to edit)
- [x] `libs/publication/src/processing/service.ts` — add import + `PDF_GENERATOR_REGISTRY` entry keyed by `COMPANIES_WINDING_UP_CHD_DAILY_CAUSE_LIST`
- [x] `libs/notifications/src/notification/notification-service.ts` — add import + `EMAIL_BUILDER_REGISTRY` entry keyed by `COMPANIES_WINDING_UP_CHD_DAILY_CAUSE_LIST`
- [x] `apps/web/src/pages/(admin)/non-strategic-upload/index.ts` — add side-effect import `import "@hmcts/companies-winding-up-chd-daily-cause-list";`
- [x] `apps/web/src/pages/(admin)/non-strategic-upload-summary/index.ts` — add same side-effect import
- [x] `apps/web/src/app.ts` — import `moduleRoot` from `@hmcts/companies-winding-up-chd-daily-cause-list/config` and add to `modulePaths` array passed to `configureGovuk`
- [x] Root `tsconfig.json` — add `"@hmcts/companies-winding-up-chd-daily-cause-list": ["libs/list-types/companies-winding-up-chd-daily-cause-list/src"]` to `compilerOptions.paths`
- [x] `apps/web/vite.build.ts` — only if the module ships an `assets/` directory with actual CSS/JS files (confirm not needed; skip if so) — confirmed no `assets/` directory exists on disk in this module; skipped as instructed.

### Verification
- [x] Run `yarn lint:fix` and `yarn format` across new/edited files — both ran clean across all 66 packages once the new workspace package was registered via `yarn install`; one incidental unrelated auto-fix (`libs/public-pages/src/flat-file/flat-file-service.ts`, unused-import removal) was deliberately reverted to keep the diff scoped to this ticket. See "Open issues/risks" in final report.
- [x] Run `yarn test` and confirm `libs/list-types/common/src/validation/guard.test.ts` passes (validator export present) — confirmed passing (`✓ src/validation/guard.test.ts (1 test)`) as part of the `@hmcts/list-types-common` suite (16 files / 243 tests passed). Full repo `yarn test` run: 357/357 test files and 3696/3699 tests passed for `@hmcts/web` (3 pre-existing skips, unrelated). An initial `EADDRINUSE :::8080` failure in `src/server.test.ts` was traced to a stray leftover `tsx`/`node` process from an earlier session (confirmed via `lsof -i :8080`), not a code regression; killing that process and re-running produced a clean pass. New module's own suite: 5/5 files, 43/43 tests passed.
- [ ] Manually upload a sample `.xlsx` via `/non-strategic-upload`, confirm JSON conversion, PDF generation, and page render match the issue's example JSON and reference style guide — **not performed**: no browser/interactive environment available in this session. Covered indirectly by automated conversion/PDF/render unit tests (all passing); flagged as an open manual-QA item in the final report.
- [ ] Manually verify Welsh rendering (`?lng=cy`) — translations are CONFIRMED (sourced from pip-frontend), no longer blocked — **not performed manually** for the same reason (no browser available); covered indirectly by the `.njk.test.ts` Welsh-heading/key-parity assertions (all passing). Flagged as an open manual-QA item in the final report.
- [x] Confirm no Excel-download UI/route is present for this list type (explicitly out of scope per CONFIRMED decision) — verified via direct search of both `companies-winding-up-chd-daily-cause-list.njk` and `index.ts` for `download`/`.xlsx`/`excel` (case-insensitive): zero matches. PDF-only download, as required.
