# Implementation Tasks — #798 Interim Applications List (ChD) Daily Cause List

Follow the standard non-strategic list-type structure. All hearing pieces
(config/type/renderer/email-summary) are defined locally, sourcing shared
utilities from `@hmcts/list-types-common`; add the two-tab converter, object-root
schema/validator, open-justice renderer, PDF, locales.

## Implementation Tasks

- [x] Scaffold lib `libs/list-types/interim-applications-chd-daily-cause-list/` (standard non-strategic list-type package.json + tsconfig)
- [x] Register lib in root `tsconfig.json` `paths`
- [x] Add `src/config.ts` (moduleRoot, assets, schemaPath → this lib's own object-root schema)
- [x] Add `src/models/types.ts` (`InterimApplicationsChdData { hearingList: InterimApplicationHearing[]; openJusticeStatementDetails: OpenJusticeStatementDetail[] }`, `InterimApplicationHearing`, `OpenJusticeStatementDetail`)
- [x] Port JSON schema verbatim from the pip-data-management upstream schema (`application.yaml` → `schemas/non-strategic/interim_applications_chancery_division_daily_cause_list.json`) into `src/schemas/interim-applications-chd-daily-cause-list.json`. Object root; all seven `hearingList` fields required incl. `additionalInformation`; `openJusticeStatementDetails` required array, no `minItems`.
- [x] Add validator `src/validation/json-validator.ts` (`validateInterimApplicationsChdDailyCauseList` via `createJsonValidator(schemaPath)` against this lib's own object-root schema)
- [x] Write validator tests `src/validation/json-validator.test.ts` (one `it` per required field: all seven `hearingList` fields + both `openJusticeStatementDetails` fields; deep-clone fixture)
- [x] Write converter `src/conversion/interim-applications-chd-daily-cause-list-config.ts` (local `INTERIM_APPLICATIONS_CHD_HEARINGS_CONFIG` for Tab 1; new `OPEN_JUSTICE_CONFIG` for Tab 2; `createMultiSheetConverter`; `registerConverterByName`)
- [x] Write converter tests (two-tab workbook → object with both arrays; malformed time, HTML tags, empty/missing Tab 2)
- [x] Add locale files `src/locales/en.ts` and `src/locales/cy.ts` (page title, table headers, important-info static + editable template, search labels, provenanceLabels)
- [x] Write renderer `src/rendering/renderer.ts` (render `data.hearingList` via `formatDisplayDate`/`formatLastUpdatedDateTime`; build `importantInfo` editable paragraph from `openJusticeStatementDetails[0]`, static fallback when empty)
- [x] Write renderer tests `src/rendering/renderer.test.ts` (editable paragraph reflects Tab 2 name/email; empty Tab 2 → static-only fallback)
- [x] Add PDF generator `src/pdf/pdf-generator.ts` + `pdf-template.njk` + test (standard non-strategic PDF generator; template also renders the Important-information block)
- [x] Wire `src/index.ts` (side-effect converter import; export `InterimApplicationHearing`, `extractCaseSummary`/`formatCaseSummaryForEmail`/`SPECIAL_CATEGORY_DATA_WARNING`, validator, renderer, pdf, locales, types)
- [x] Migrate page template from pip-frontend source into `apps/web/src/pages/(list-types)/interim-applications-chd-daily-cause-list/` (run migrate-pip-pages skill)
- [x] Add page controller `index.ts` (`createSimpleListTypeHandler`, `validate = validateInterimApplicationsChdDailyCauseList`, `guardArtefact` on listTypeName; export `GET` only — route auto-discovered)
- [x] Add page controller test `index.test.ts` and template test `*.njk.test.ts` (structure + Welsh + locale-key parity + importantInfo block)
- [x] Add list-type entry to `libs/list-types/common/src/list-type-data.ts` (`INTERIM_APPLICATIONS_CHD_DAILY_CAUSE_LIST`, `shortenedFriendlyName`, `subJurisdictionIds: [10]`, `isNonStrategic: true`) — no `location-data.ts` change (location 26 already exists)
- [x] Register PDF generator in `libs/publication/src/processing/service.ts` `PDF_GENERATOR_REGISTRY`
- [x] Register email builder in `libs/notifications/src/notification/notification-service.ts` `EMAIL_BUILDER_REGISTRY` (import `extractCaseSummary`/`formatCaseSummaryForEmail` from the new lib)
- [x] Add workspace dep to `libs/publication/package.json`, `apps/web/package.json`, and `libs/notifications/package.json`
- [x] Add side-effect converter import to BOTH `apps/web/src/pages/(admin)/non-strategic-upload/index.ts` and `.../non-strategic-upload-summary/index.ts`
- [x] Add `moduleRoot` to `apps/web/src/app.ts` `modulePaths`
- [x] Confirm CI guard passes (`libs/list-types/common/src/validation/guard.test.ts`)
- [~] Run `yarn db:generate` / seed locally; verify list type selectable on non-strategic upload under location 26 — `yarn db:generate` run OK; list-type entry added to `list-type-data.ts` (auto-seeds via generated SQL) and web app composes/builds. Live seed + manual UI selectability check not performed here (needs a running Postgres/Redis); the entry uses `subJurisdictionIds: [10]`, location 26.
- [~] Add E2E happy-path journey (upload → publish → view → PDF/Excel download) with inline Welsh + accessibility checks — NOT added. The existing non-strategic upload journey spec is `.skip`ped and SSO-gated, and the `test-support/artefacts` API does not upload a JSON blob, so a view-render E2E cannot be seeded with current infrastructure. Full journey coverage is provided by unit + template tests. Left for a follow-up once E2E blob seeding exists.
- [~] `yarn lint:fix`, `yarn test`, `yarn test:e2e` — `yarn lint:fix` and `yarn test` (all 70 workspaces / 3799 web tests) pass. `yarn test:e2e` not run (no new E2E added; the suite targets a running/deployed environment).
- [x] Resolve open CLARIFICATIONS (sheet names/headers, static wording, Welsh translations) before merge
- [x] Delete `docs/tickets/798/reference-schema.json` once the schema is ported and validated (temporary implementation reference only)
