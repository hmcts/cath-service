# Code Review: Issue #808

Insolvency & Companies Court (ChD) Daily Cause List — a new non-strategic RCJ/ChD 7-column list type that reuses `@hmcts/chd-kb-common` verbatim and is modelled on the sibling `companies-winding-up-chd-daily-cause-list`.

## Summary

This is a clean, disciplined clone of the `companies-winding-up-chd-daily-cause-list` sibling. The field contract matches the issue's exact JSON keys (`judge, time, venue, type, caseNumber, caseName, additionalInformation`), all schema/types/validator/converter-config/renderer/email-summary machinery is delegated to `@hmcts/chd-kb-common` (DRY), and every wiring point (tsconfig paths, app.ts module discovery, both non-strategic-upload side-effect imports, PDF registry, email-builder registry, list-type-data) is present and keyed by the stable `listTypeName` string — no numeric `listTypeId` anywhere in the logic.

All tests pass: new lib 9/9, web page 23/23, notifications 77/77, publication 388/388. No `[WELSH TRANSLATION REQUIRED]` markers remain. Biome lint clean, `tsc --noEmit` clean. Build artefacts (`dist/`, `coverage/`, `.turbo/`, `node_modules/`) are correctly gitignored and will not be committed.

- CRITICAL: 0
- HIGH PRIORITY: 0
- SUGGESTIONS: 3

## 🚨 CRITICAL Issues

None.

## ⚠️ HIGH PRIORITY Issues

None.

## 💡 SUGGESTIONS

1. **Locale key-parity test is shallow at the nested level.**
   `insolvency-and-companies-court-chd-daily-cause-list.njk.test.ts:109-115` asserts top-level key parity and `tableHeaders` key parity between EN/CY, which is good. It does not recurse into `provenanceLabels`. Those come from `@hmcts/list-types-common` (`provenanceLabelsEn`/`provenanceLabelsCy`) so parity is guaranteed upstream — this is advisory only, but a single recursive deep-key comparison would future-proof the page if list-specific nested objects are ever added.

2. **`validate` indirection in the controller is redundant.**
   `apps/web/src/pages/(list-types)/insolvency-and-companies-court-chd-daily-cause-list/index.ts:1,10,17` imports `validateChdKbListType` directly and aliases it to a local `const validate`. The lib already re-exports the same function as `validateInsolvencyAndCompaniesCourtChdDailyCauseList` (`libs/.../src/index.ts:18`). This mirrors the sibling exactly, so it is consistent, but importing the already-namespaced re-export from the lib would keep the controller's dependency surface to the one package it represents. Cosmetic.

3. **`role="table"` on a native `<table>` is redundant.**
   `insolvency-and-companies-court-chd-daily-cause-list.njk:42` adds `role="table"` to a real `<table>` element. Native semantics already provide this and the explicit role is unnecessary (harmless). The `aria-label` is useful and correctly retained. This matches the sibling, so no change is required for consistency; noting for awareness.

## ✅ Positive Feedback

- **Correct reuse strategy.** Schema, types, validator, converter config, renderer core and email-summary all delegate to `@hmcts/chd-kb-common` (`src/index.ts:6-19`, `renderer.ts:26`, `conversion/...-config.ts`). Zero duplicated schema, zero field-mapping divergence from the issue's contract.
- **`listTypeName`-driven throughout.** Guard uses `artefact.listTypeName === "INSOLVENCY_AND_COMPANIES_COURT_CHD_DAILY_CAUSE_LIST"` (`index.ts:20`); converter registered `registerConverterByName(...)`; PDF and email registries keyed by the string name; test fixtures use `listTypeId: 999` (`index.test.ts:71,190,224`) to prove ID-independence. Fully compliant with CLAUDE.md List Type rules.
- **Both side-effect imports present.** The converter is registered in BOTH `non-strategic-upload/index.ts:10` AND `non-strategic-upload-summary/index.ts:10`, matching the sibling-PR fix convention.
- **Security.** The `html:` block in `govukDetails` (`njk:23-29`) concatenates only trusted static locale strings; all user/artefact-derived values (`hearing.*`, `header.*`, `dataSource`) use auto-escaped `{{ }}`. The upload converter runs `validateNoHtmlTags` on every field and `validateTimeFormatSimple` on time (`chd-kb-excel-config.ts:5-16`), so HTML injection is rejected at ingest. No sensitive data logged; Prisma access is parameterised via the shared handler.
- **Accessibility.** Semantic `<table>` with `<th scope="col">` for all 7 columns, visually-hidden `<label for>` correctly associated with `#case-search-input`, `aria-label` on both search input and table, single `h1#top` with logical `h2` for search, and a keyboard-reachable back-to-top link. The search is progressive enhancement over the server-rendered table (`apps/web/src/assets/js/table-search.ts`) — the full table renders and works without JS.
- **Welsh completeness.** EN and CY locale files have identical key sets, all three important-information sections translated, no placeholder markers. `list-type-data.ts` has a real `welshFriendlyName`.
- **Strong test coverage.** Template test asserts header order, per-column cell placement, multi-row rendering, empty-state (no table + message), Welsh headings/cells, and that caution notes are PDF-only. Controller test covers happy path, missing artefactId (400), not found (404), wrong list type (400), invalid JSON (400) and Welsh locale.

## Test Coverage Assessment

| Workspace | Tests | Statement Coverage | Notes |
|---|---|---|---|
| `@hmcts/insolvency-and-companies-court-chd-daily-cause-list` | 9 passed | 90.9% | `index.ts` reports 0% (side-effect/re-export barrel — no executable logic to instrument); `pdf-generator.ts` 86.66%. Above 80% overall. ✅ |
| `@hmcts/web` (new list-type page) | 23 passed | route-group file not itemised | v8 `(list-types)` parenthesized route-group quirk — the controller does not appear as its own line and `list-type-handler.ts` shows 32.95%, but `index.test.ts` (6 cases) and `.njk.test.ts` (17 cases) all pass and exercise the controller. Verified by test pass, not the number. ✅ |
| `@hmcts/notifications` | 77 passed | n/a (registry entry) | Email-builder registration verified by full suite pass. ✅ |
| `@hmcts/publication` | 388 passed | n/a (registry entry) | PDF-generator registration verified by full suite pass. ✅ |

No workspace is below 80% on its own instrumentable statements. The two 0%/low readings are known v8 instrumentation artefacts (re-export barrel and parenthesized route group), not missing tests.

## Acceptance Criteria Verification

- [x] **The Insolvency & Companies Court (ChD) daily cause list is created under the Business and Property Courts Rolls Building in CaTH and is linked to the 'Civil' jurisdiction and 'Royal Courts of Justice Group' region** — `list-type-data.ts:801-811` registers the type with `subJurisdictionIds: [10]`; `location-data.ts:187-193` maps location 26 "Business and Property Courts Rolls Building" to `regions: [11]` (Royal Courts of Justice Group, `location-data.ts:256`) and `subJurisdictions: [10]`, where subJurisdiction 10 = "High Court" → `jurisdictionId: 1` = "Civil" (`location-data.ts:348-351,272-273`).
- [x] **The following data fields are created in the listed order in the validation schema (Judge, Time, Venue, Type, Case Number, Case Name and Additional Information)** — `chd-kb-common` schema `required`/`properties` order is exactly `judge, time, venue, type, caseNumber, caseName, additionalInformation`; `CHD_KB_EXCEL_CONFIG` fields in the same order (`chd-kb-excel-config.ts:5-16`). Header-order asserted in `...njk.test.ts:189-201`.
- [x] **The list is published through the Excel upload route; uploaded as an Excel template and converted to JSON** — converter registered by name (`conversion/...-config.ts`), wired via side-effect imports in `non-strategic-upload/index.ts:10` and `non-strategic-upload-summary/index.ts:10`; registration asserted in `conversion/...-config.test.ts:11-13`.
- [x] **The validation schema and style guide is created** — validator re-exported as `validateInsolvencyAndCompaniesCourtChdDailyCauseList` (`src/index.ts:18`) resolving via the dynamic dispatcher by package name; style guide implemented in `insolvency-and-companies-court-chd-daily-cause-list.njk` and locale files, covered by `...njk.test.ts`.
- [x] **A PDF and Excel downloadable version of the hearing list is created** — PDF generator `generateInsolvencyAndCompaniesCourtChdDailyCauseListPdf` (`pdf/pdf-generator.ts:24`) registered in `PDF_GENERATOR_REGISTRY` (`libs/publication/src/processing/service.ts:193-194`), tested in `pdf/pdf-generator.test.ts`. The uploaded Excel flat file is retained/served by the existing publication download route (no new code needed for the flat file).
- [x] **The style guide should follow the structure in the pip-frontend reference** — page migrated from the reference: venue/address block, three important-information sub-sections (heading1/line1..heading3/line3, `njk:23-29`), search box, 7-column table, data source, back-to-top. Structure asserted across `...njk.test.ts:118-269`.
- [x] **The JSON file should follow the specified format** — types (`ChdKbHearing`) and schema use `judge/time/venue/type/caseNumber/caseName/additionalInformation` exactly; renderer preserves these keys (`renderer.test.ts:31-38`); controller renders them (`...njk.test.ts:203-226`).

All 7 acceptance criteria fully met.

## Next Steps

- [ ] (Optional) Consider the three cosmetic suggestions above — none block merge.
- [ ] Confirm the outstanding clarifications recorded in `plan.md` §5 with the ticket author before/at merge: accepted time formats (am/pm-only via `validateTimeFormatSimple`), canonical court/location, and sensitivity (`Public`). Current implementation makes reasonable, sibling-consistent assumptions.
- [ ] Manual verification on a running environment: upload a valid `.xlsx`, view page with `?lng=cy`, download PDF and original Excel.

## Overall Assessment

**APPROVED**

The implementation is a faithful, well-tested clone of the established ChD sibling. All acceptance criteria are met with file-level evidence, security and accessibility are sound, Welsh is complete, no numeric `listTypeId` coupling exists, and all wiring is present in both upload pages and both registries. All changed workspaces pass their suites and meet the coverage bar (accounting for the documented v8 barrel/route-group artefacts). The three suggestions are cosmetic and consistent with the sibling, so they are non-blocking.
