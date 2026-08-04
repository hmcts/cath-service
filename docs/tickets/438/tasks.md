# Tasks: #438 — Add PCOL Daily Cause List (flat-file list type)

## Implementation Tasks
- [x] Confirm `allowedProvenance` value with stakeholders (CFT_IDAM vs MANUAL_UPLOAD) — RESOLVED: CFT_IDAM (matches all Civil sibling list types)
- [x] Add `PCOL_DAILY_CAUSE_LIST` entry to `listTypeData` in `libs/list-types/common/src/list-type-data.ts` (name, English + Welsh friendly names, shortened name "PCOL Daily Cause List", `isNonStrategic: false`, `defaultSensitivity: "Public"`, `subJurisdictionIds: [1]`, no `urlPath`)
- [x] Add matching row to `apps/postgres/prisma/scripts/001_insert_missing_list_types.sql` (url empty, `is_non_strategic false`, watch comma/`ON CONFLICT` placement)
- [x] Add Civil Court (1) link to `apps/postgres/prisma/scripts/003_upsert_sub_jurisdictions_and_list_type_links.sql` (watch trailing-comma placement)
- [x] Run `yarn db:generate` and reseed local DB — `db:generate` not required (no Prisma schema change; `list_types` columns already exist). Seed reads updated `listTypeData` automatically on next run.
- [ ] Verify in `/manual-upload`: "PCOL Daily Cause List" appears in the dropdown, is strategic (not in `/non-strategic-upload`), and pre-fills Public sensitivity — manual QA step, requires running local DB + web app
- [ ] Upload a test PDF under PCOL and confirm it publishes and views via `/hearing-lists/{locationId}/{id}` with no schema validation errors — manual QA step
- [x] Run `yarn lint:fix` and `yarn test` for affected workspaces — lint clean; `@hmcts/list-types-common`, `@hmcts/location`, `@hmcts/postgres` tests pass
- [ ] (Only if a PCOL E2E journey is required) add PCOL to `e2e-tests/utils/seed-list-types.ts` BASE_LIST_TYPES and write the journey test — SKIPPED: existing manual-upload E2E coverage is sufficient; no PCOL-specific journey required
