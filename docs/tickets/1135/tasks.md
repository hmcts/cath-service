# Implementation Tasks — Issue #1135

Ordered. Workstream A (tasks 1–9) satisfies the acceptance criterion; do it first.
Workstream B (tasks 10–18) makes coverage confirmable by a human.

## Pre-work

- [ ] Resolve clarification Q1 (`DO UPDATE` vs `DO NOTHING`) — blocks task 5
- [ ] Resolve clarification Q3 (RCJ `caseDetails` as case name) — blocks task 3
- [ ] Resolve clarification Q4 (`PCOL_` / `MENTAL_HEALTH_TRIBUNAL_` field names) — blocks task 3
- [ ] Dump current `list_search_config` from STG and fold any disagreements into the derived values (Q5)

## Workstream A — close the coverage gap

- [ ] 1. Write a throwaway derivation script in `/tmp` that, per `listTypeData` entry, resolves the package via `convertListTypeNameToKebabCase` + `PACKAGE_ALIASES` and reports candidate field names from the JSON schema (strategic) or `ExcelConverterConfig.fields[].fieldName` (non-strategic)
- [ ] 2. Create `libs/list-types/common/src/list-search-config-data.ts` with the `ListSearchConfigData` interface and an empty array; zero imports
- [ ] 3. Populate all 77 entries from the reviewed derivation output; keyed on `listTypeName` only, no numeric ids or id references in comments; `""` where there is no field of that kind; watch the casing variants (`CaseNumber`, `caseno`, `caseUrn`)
- [ ] 4. Add the `./list-search-config-data` subpath to `libs/list-types/common/package.json` exports
- [ ] 5. Add `generateListSearchConfigSql` to `apps/postgres/prisma/generate-seed-sql.ts`, importing from the subpath; place it after `generateListTypesSql` and before `generateSoftDeleteReconciliationSql`
- [ ] 6. Add `@hmcts/list-types-common` to `libs/list-search-config/package.json` dependencies
- [ ] 7. Create `libs/list-search-config/src/data/seed-list-search-config.ts` exporting `seedListSearchConfig()`; resolve id by name, Prisma `upsert`, `console.warn` and skip on unknown name; export from `libs/list-search-config/src/index.ts`
- [ ] 8. Call `seedListSearchConfig()` from `apps/postgres/prisma/seed.ts` after `seedLocationData()`
- [ ] 9. Add the CI guard test `libs/list-types/common/src/list-search-config-data.test.ts` — real imports, 1:1 name parity both directions, no duplicates, field-name format and ≤100 length; failure messages name the offending list types

## Workstream B — make coverage confirmable

- [ ] 10. Free the `index.*` names: rename `(system-admin)/list-search-config/index.njk` → `edit.njk`, `index.njk.test.ts` → `edit.njk.test.ts` (update its `TEMPLATE` const), `index.test.ts` → `[listTypeId].test.ts`; point both `res.render` calls in `[listTypeId].ts` at `list-search-config/edit`
- [ ] 11. Add `findActiveListTypes` and `findAllConfigs` to `libs/list-search-config/src/repository/queries.ts`
- [ ] 12. Add `ConfigStatus`, `ListTypeCoverage` and `getConfigCoverage()` to `libs/list-search-config/src/repository/service.ts`; join in memory by `listTypeId`, derive status with a pure function, fall back to `name` when `friendlyName` is null
- [ ] 13. Add the index-page content keys to `(system-admin)/list-search-config/en.ts` and `cy.ts`, keeping key parity
- [ ] 14. Create `(system-admin)/list-search-config/index.ts` — `GET: [requireRole([USER_ROLES.SYSTEM_ADMIN]), getHandler]`, locale from `req.query.lng`, rows sorted by displayed name, counts passed to the view
- [ ] 15. Create `(system-admin)/list-search-config/index.njk` — `govukBackLink`, single `h1`, `govukInsetText` summary, `govuk-table` with hidden `<caption>`, five `th[scope="col"]`, `th[scope="row"]` list type cell, visually hidden action header, `govukTag` with status as text, "Not set" for blanks, visually hidden per-row link suffix; no inline styles, no custom CSS, no JS
- [ ] 16. Add the "List search configuration" tile to the `tiles` arrays in `system-admin-dashboard/en.ts` and `cy.ts` (`href: "/list-search-config"`)
- [ ] 17. Retarget the continue link in `(system-admin)/list-search-config-success/` to `/list-search-config`
- [ ] 18. Edit page improvements in `[listTypeId].ts`: show the list type friendly name as a `govuk-caption-l` before the `h1` (Welsh name when `lng=cy`, falling back to `name`); replace `res.status(400).send(...)` with `errors/common`; add a `404` for a numeric id with no active list type; add a `govukBackLink` to `/list-search-config`; translate the length and pattern validation messages via locale keys (add `errorCaseNumberTooLong` / `errorCaseNameTooLong`), keeping the cross-field error unlinked

## Tests

- [ ] 19. `apps/postgres/prisma/generate-seed-sql.test.ts` — one statement per entry, name subquery with no numeric literal, `ON CONFLICT (list_type_id) DO UPDATE`, correct ordering, apostrophe escaped, single `BEGIN;`/`COMMIT;`, both-blank entry still emits a row
- [ ] 20. `libs/list-search-config/src/data/seed-list-search-config.test.ts` — upserts per entry resolving id by name, warns and skips on unknown name without throwing, repeat run produces no duplicates
- [ ] 21. `libs/list-search-config/src/repository/service.test.ts` additions — `CONFIGURED` / `NOT_SEARCHABLE` / `MISSING` derivation, soft-deleted list types excluded, a row for every active list type when the config table is empty, exactly two Prisma calls regardless of list type count
- [ ] 22. `(system-admin)/list-search-config/index.test.ts` — renders with `rows`/counts, alphabetical sort, Welsh content and `welshFriendlyName` when `lng=cy`, `changeUrl` built from an arbitrary fixture id such as `999`, handler taken as `GET[GET.length - 1]`, status→tag/action mapping
- [ ] 23. `(system-admin)/list-search-config/index.njk.test.ts` — Cheerio structural assertions per plan §5, including unique accessible link names, tag text as readable text, Welsh render, `en`/`cy` key parity and the empty-rows case
- [ ] 24. `(system-admin)/list-search-config/[listTypeId].test.ts` additions — friendly name passed through, `400` renders `errors/common`, `404` for unknown active list type, translated validation copy under `lng=cy`, existing redirect and re-render behaviour unchanged
- [ ] 25. `libs/publication/src/artefact-search-extractor.test.ts` additions — PascalCase `CaseNumber` extracts from a Crown-shaped payload, both-blank config writes nothing and does not throw, existing null-config no-op retained
- [ ] 26. `e2e-tests/tests/list-search-config.spec.ts` — one `@nightly` journey test with validation, Welsh, keyboard and Axe checks inline; optionally a second for the non-System-Admin refusal journey

## Verification

- [ ] 27. `yarn lint:fix && yarn test` from the root — all green
- [ ] 28. `yarn db:drop && yarn db:migrate:dev && yarn db:seed`, then confirm `SELECT COUNT(*) FROM list_search_config;` equals `listSearchConfigData.length`
- [ ] 29. Generate the seed SQL and apply it twice against a seeded database — second run succeeds with no unique violation and no duplicate rows
- [ ] 30. Confirm `/list-search-config/1` still resolves to the edit page and `/list-search-config` to the new index page
- [ ] 31. Publish a fixture for one non-strategic list type (e.g. an `FTT_RPT_*`) and confirm `artefact_search` rows appear
- [ ] 32. Check the index page with `?lng=cy` and run an accessibility pass on it
- [ ] 33. Raise follow-up tickets for the out-of-scope defects (dead `list_types` JSON field name columns; `COURT_OF_APPEAL_CIVIL_DIVISION_DAILY_CAUSE_LIST` converter name mismatch)
