# #1106: 'Traffic Virtual Courts List' to be created in CaTH

## Implementation Tasks

- [ ] Confirm `defaultSensitivity` with the Crime Service Manager (`Public` vs `Classified`) before writing the entry — see plan §7.1
- [ ] Confirm Poole Magistrates' Court exists on STG and carries `subJurisdictionId: 7`; if it comes from `location-data.ts`, add it with `subJurisdictions: [7]`
- [ ] Add the `TRAFFIC_VIRTUAL_COURTS_LIST` entry to `libs/list-types/common/src/list-type-data.ts`, adjacent to the other Crime/Magistrates entries
- [ ] Run `yarn db:seed` and verify in `yarn db:studio`: both friendly names, `is_non_strategic = false`, `url = ''`, `deleted_at IS NULL`, one `list_types_sub_jurisdictions` row for sub-jurisdiction 7
- [ ] Run `yarn db:seed` a second time to prove idempotency (no error, no duplicate)
- [ ] Run `tsx apps/postgres/prisma/generate-seed-sql.ts` and check the emitted SQL: new row present, `i''w` escaped, new name inside the soft-delete `NOT IN (...)` list
- [ ] Add `libs/list-types/common/src/list-type-data.test.ts` asserting the new entry's names, `isNonStrategic: false`, `subJurisdictionIds: [7]`, omitted `urlPath`, and uniqueness of all `name` values
- [ ] Extend `apps/postgres/prisma/generate-seed-sql.test.ts` with a synthetic fixture entry that omits `urlPath`, asserting the emitted `url` is an empty string (do not assert on the real list type name — the suite uses synthetic fixtures)
- [ ] Confirm or add the `libs/admin-pages/src/manual-upload/validation.test.ts` case where a `.json` upload for a list type with no validator package returns the "No JSON schema available for …" message instead of throwing
- [ ] Confirm the existing `apps/web/src/pages/(admin)/manual-upload/index.test.ts` assertions already cover option rendering and `listTypeSensitivityMap`; note this in the PR rather than duplicating them
- [ ] Add the single dropdown-option assertion to `e2e-tests/tests/admin/manual-upload.spec.ts` and state in the PR that the spec is `test.describe.skip`, so it does not run in CI
- [ ] Run `yarn test`, `yarn lint:fix` and `yarn format` from the root; confirm the `libs/list-types/common` validator guard test still passes
- [ ] Manual verification locally: `/manual-upload` option placement and sensitivity pre-fill, full PDF upload journey, `/summary-of-publications` in English and Welsh, `.json` rejection, Courtel checkbox, `/subscription-configure-list`
- [ ] Add a release note requiring a System Admin to tick the Courtel checkbox on each environment post-deploy (AC3 is not satisfied by code), and give Courtel advance notice before enabling
- [ ] Post-deploy on STG: confirm the seed SQL applied with no P2002 errors, the option appears in both dropdowns, and a test publication produces a `SUCCESS` row in `third_party_push_log`
