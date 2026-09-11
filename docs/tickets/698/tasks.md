# Tasks — #698: Add/Update provenance for all lists

## 0. Before writing code

- [ ] Get sign-off on changing `PHT_WEEKLY_HEARING_LIST` from `MANUAL_UPLOAD` to `CFT_IDAM`. State the consequence: CFT publishers gain the ability to publish PHT lists, and PHT artefacts can be `Classified` because the uploading admin chooses sensitivity (`defaultSensitivity: null` only pre-selects a radio). Do not start §4 until answered.
- [ ] Ask in the same conversation whether `PHT_WEEKLY_HEARING_LIST`'s `defaultSensitivity: null` is intentional. Do not change it in this ticket either way — record the answer in the ticket.
- [ ] Post a comment on #698 correcting the #1029 dependency claim: `apps/web/src/pages/(auth)/login/return/index.ts:216` already sets `provenance: "PI_AAD"` for B2C media users, so this ticket takes effect on merge. Ask the comment author to confirm there was no other intent.
- [ ] Post a comment on #1029 asking it to consume `USER_PROVENANCES` from `@hmcts/list-types-common/user-provenance` rather than declaring its own constant, to avoid a conflict.
- [ ] Confirm with the schema owner that widening `list_types.allowed_provenance` from `VARCHAR(50)` to `VARCHAR(255)` in this ticket is acceptable, and that a real `text[]` column / join table is deferred to a follow-up.
- [ ] Raise a separate cleanup ticket to delete the two dead pages: `apps/web/src/pages/(system-admin)/configure-list-type-enter-details/` and `apps/web/src/pages/(system-admin)/view-list-types/` (both controllers are `res.redirect(301, "/manage-list-types")`; both `.njk` files and their `.njk.test.ts` files are unreachable). Link it from #698 so the reviewer knows why `CFT_IDAM` still appears in `.njk` files after this lands.
- [ ] Create the branch off `master`.

## 1. Shared provenance module

- [ ] Create `libs/list-types/common/src/user-provenance.ts` with **no imports at all** (it is loaded by the postgres deploy image, where `nunjucks`/`exceljs`/`ajv` are not installed).
- [ ] Export `export const USER_PROVENANCES = ["CFT_IDAM", "PI_AAD", "CRIME_IDAM"] as const;` — this order matches `libs/system-admin-pages/src/list-type/validation.ts:2` and the live checkbox order, so the UI is unchanged.
- [ ] Export `export type UserProvenance = (typeof USER_PROVENANCES)[number];`.
- [ ] Export `export const PROVENANCE_DELIMITER = ",";`.
- [ ] Export `export const ALLOWED_PROVENANCE_MAX_LENGTH = 255;`.
- [ ] Export `isUserProvenance(value: string): value is UserProvenance`.
- [ ] Export `formatProvenance(provenances: readonly string[]): string` — de-duplicates preserving declaration order, joins on `PROVENANCE_DELIMITER`, throws on an empty array.
- [ ] Export `parseProvenance(value: string | null | undefined): string[]` — splits on `PROVENANCE_DELIMITER`, trims each part, drops empty strings, returns `[]` for `null`/`undefined`/`""`.
- [ ] Export `assertValidProvenances(listTypeName: string, provenances: readonly string[]): void` — throws with the list type name and offending value on: empty array, any value not in `USER_PROVENANCES`, duplicates, formatted length > `ALLOWED_PROVENANCE_MAX_LENGTH`.
- [ ] Order the module per `CLAUDE.md`: top-level consts first, then exported functions, then any interfaces/types at the bottom.
- [ ] Add a `"./user-provenance"` entry to `exports` in `libs/list-types/common/package.json`, copying the shape of the existing `"./list-type-data"` entry (`production` → `./dist/user-provenance.js`, `default` → `./src/user-provenance.ts`).
- [ ] Re-export the module from `libs/list-types/common/src/index.ts` so barrel consumers do not need the subpath.
- [ ] Write `libs/list-types/common/src/user-provenance.test.ts` (AAA, `describe` per function): `formatProvenance` single/multiple/duplicate/empty-throws; `parseProvenance` on `"CFT_IDAM"`, `"CRIME_IDAM,PI_AAD"`, `"CRIME_IDAM, PI_AAD"` (asserting the trim), `""`, `null`, `undefined`; `isUserProvenance` true/false incl. `"MANUAL_UPLOAD"` → false; `assertValidProvenances` throwing for each of the four reasons and not throwing for a valid pair.

## 2. `list-type-data.ts` conversion

- [ ] In `libs/list-types/common/src/list-type-data.ts`, add `import type { UserProvenance } from "./user-provenance.js";`.
- [ ] Change line 5 of the `ListTypeData` interface from `provenance: string;` to `provenance: UserProvenance[];`.
- [ ] Convert all 77 entries to arrays. Expect: 61 × `["CFT_IDAM"]`, 8 × `["CRIME_IDAM"]`, 5 × `["PI_AAD"]`, plus the two below and PHT.
- [ ] Convert the two entries that already hold `"CRIME_IDAM,PI_AAD"` to `["CRIME_IDAM", "PI_AAD"]`: `MAGISTRATES_PUBLIC_LIST` (~line 38) and `MAGISTRATES_STANDARD_LIST` (~line 659).
- [ ] Verify no string-form `provenance:` values remain in the file (search for `provenance: "`).

## 3. Data fix — add `PI_AAD` to the four magistrates adult court lists

- [ ] `MAGISTRATES_ADULT_COURT_LIST_DAILY`: `["CRIME_IDAM"]` → `["CRIME_IDAM", "PI_AAD"]`.
- [ ] `MAGISTRATES_ADULT_COURT_LIST_FUTURE`: `["CRIME_IDAM"]` → `["CRIME_IDAM", "PI_AAD"]`.
- [ ] `MAGISTRATES_PUBLIC_ADULT_COURT_LIST_DAILY`: `["CRIME_IDAM"]` → `["CRIME_IDAM", "PI_AAD"]`.
- [ ] `MAGISTRATES_PUBLIC_ADULT_COURT_LIST_FUTURE`: `["CRIME_IDAM"]` → `["CRIME_IDAM", "PI_AAD"]`.

## 4. Data fix — `PHT_WEEKLY_HEARING_LIST` (only after §0 sign-off)

- [ ] Change `PHT_WEEKLY_HEARING_LIST` (~lines 698-708) from `provenance: "MANUAL_UPLOAD"` to `provenance: ["CFT_IDAM"]`.
- [ ] Confirm `MANUAL_UPLOAD` no longer appears anywhere in `libs/list-types/common/src/list-type-data.ts`.
- [ ] If sign-off is refused, instead convert it to `provenance: ["MANUAL_UPLOAD"]`, add `"MANUAL_UPLOAD"` to `USER_PROVENANCES` with a comment explaining it is CaTH-specific, and add a reason-annotated entry to `ALLOWED_PROVENANCE_DIVERGENCES` in §7 — and flag on the PR that this leaves PHT unpublishable by any real login path.

## 5. Seed write boundaries

- [ ] In `libs/location/src/seed-list-types.ts`, import `formatProvenance` and `assertValidProvenances` from `@hmcts/list-types-common/user-provenance` (subpath, not the barrel — see the file's header comment at lines 1-3).
- [ ] Call `assertValidProvenances(listType.name, listType.provenance)` inside the existing per-entry loop, before the write.
- [ ] Change `allowedProvenance: listType.provenance` to `allowedProvenance: formatProvenance(listType.provenance)` at line 48 (create) and line 57 (update).
- [ ] In `apps/postgres/prisma/generate-seed-sql.ts`, import the same two functions from `@hmcts/list-types-common/user-provenance`.
- [ ] In `generateListTypesSql`, call `assertValidProvenances(lt.name, lt.provenance)` per entry before emitting the row.
- [ ] Change `${sqlStr(lt.provenance)}` to `${sqlStr(formatProvenance(lt.provenance))}` at line 133.
- [ ] Verify no other file reads `ListTypeData.provenance` (search for `.provenance` across `libs/location`, `apps/postgres` and `libs/list-types`). Do **not** change `libs/test-support/src/routes/test-support/list-types.ts:78` — that `listType.provenance` is an untyped element of `req.body.listTypes`, not a `ListTypeData`.
- [ ] Run `yarn workspace @hmcts/postgres build` (or the equivalent tsc) and confirm the generator still runs standalone: `node_modules/.bin/tsx apps/postgres/prisma/generate-seed-sql.ts > /tmp/seed.sql`, then inspect `/tmp/seed.sql` for `'CRIME_IDAM,PI_AAD'` on the magistrates rows and `'CFT_IDAM'` on the PHT row.
- [ ] Sanity-check the failure path: temporarily introduce a bad provenance value, confirm the generator throws and `/tmp/seed.sql` is not usable, then revert.

## 6. Authorisation read boundary

- [ ] Add `@hmcts/list-types-common` to `libs/publication/package.json` dependencies if not already present, and confirm no circular dependency (`list-types-common` must not depend on `@hmcts/publication`). If a cycle exists, import via the `/user-provenance` subpath and re-check.
- [ ] In `libs/publication/src/authorisation/service.ts` line 34, replace `listType.provenance.split(",")` with `parseProvenance(listType.provenance)`.
- [ ] Leave the `ListType` interface field as `provenance: string` — it holds the raw DB column value, and renaming it to `provenances: string[]` would churn ~40 unrelated `(list-types)` page tests for no behavioural gain.
- [ ] Leave `libs/publication/src/authorisation/middleware.ts:90-94` unchanged (it constructs the same interface from the same DB column).
- [ ] Add a case to `libs/publication/src/authorisation/service.test.ts`: a DB value of `"CRIME_IDAM, PI_AAD"` (with a space) grants access to a `PI_AAD` user.
- [ ] Add a case: a DB value of `"CRIME_IDAM"` denies a `PI_AAD` user (guard against over-permissive parsing).

## 7. Parity test and reference fixture

- [ ] `git mv docs/tickets/698/reference-list-types.json libs/list-types/common/src/reference/pip-data-models-list-types.json`.
- [ ] Add `libs/list-types/common/src/reference/README.md` recording: upstream source `hmcts/pip-data-models` → `src/main/java/uk/gov/hmcts/reform/pip/model/publication/ListType.java`, the date/commit it was taken from, that provenance is the second constructor argument (`List.of(...)` of `UserProvenances`), that `@Deprecated` maps to `"deprecated": true`, and that it is refreshed by hand. Do not write a fetch/parse script.
- [ ] Create `libs/list-types/common/src/reference/parity.test.ts`. Read the fixture with `readFileSync(new URL("./pip-data-models-list-types.json", import.meta.url), "utf8")` + `JSON.parse` — `resolveJsonModule` is not enabled in the root `tsconfig.json`, so `import` will not compile.
- [ ] Add `const NAME_ALIASES: Record<string, string>` with the 19 ours→shared-model pairs from the ticket's table A, with a comment noting renames are out of scope for #698.
- [ ] Add `const ALLOWED_PROVENANCE_DIVERGENCES: Record<string, { provenances: string[]; reason: string }> = {};` — expected to stay empty once §3 and §4 land.
- [ ] Add `const CATH_ONLY: string[] = [];` — verified empty: with the 19 aliases applied, all 77 of ours map to a reference name (58 exact + 19 aliased).
- [ ] Add `const EXPECTED_ABSENT: string[]` with the **25** reference names absent from ours. This is the ticket's 24 **plus** `TECHNOLOGY_AND_CONSTRUCTION_COURT_DAILY_CAUSE_LIST` (which the ticket's table B omits). Annotate `CARE_STANDARDS_LIST`, `PRIMARY_HEALTH_LIST` and `CIC_DAILY_HEARING_LIST` as deprecated upstream and superseded by `CARE_STANDARDS_TRIBUNAL_WEEKLY_HEARING_LIST`, `PHT_WEEKLY_HEARING_LIST` and `CIC_WEEKLY_HEARING_LIST` respectively. Annotate `CROWN_WARNED_PDDA_LIST` as contested with #957.
- [ ] Test: fixture entry count is 102 (assert the number so a re-parse that loses entries fails).
- [ ] Test: for every `listTypeData` entry, resolve the reference name via `NAME_ALIASES` and assert provenances match order-insensitively, unless the name is in `ALLOWED_PROVENANCE_DIVERGENCES`, in which case assert ours equals the recorded divergence.
- [ ] Test: every key of `NAME_ALIASES` and `ALLOWED_PROVENANCE_DIVERGENCES` corresponds to a real `listTypeData` entry (stale keys fail).
- [ ] Test: every alias target exists in the reference fixture.
- [ ] Test: `listTypeData` entries with no reference match after aliasing equal `CATH_ONLY`.
- [ ] Test: reference names with no `listTypeData` match after aliasing equal `EXPECTED_ABSENT`.
- [ ] Test: `assertValidProvenances(entry.name, entry.provenance)` does not throw for any of the 77 entries — this is the CI half of AC 4.
- [ ] Test: explicitly name the four `MAGISTRATES_*_ADULT_COURT_LIST_*` types and assert each contains both `CRIME_IDAM` and `PI_AAD` (AC 3, readable at a glance in CI output).

## 8. System Admin — de-duplicate the provenance option list

- [ ] In `libs/system-admin-pages/src/list-type/validation.ts`, delete `const PROVENANCE_OPTIONS` (line 2) and change `validateProvenance` (lines 66-86) to use `isUserProvenance`. Keep both error messages byte-identical ("Select at least one allowed provenance", "Select valid provenance options") so no new Welsh copy is needed.
- [ ] In `libs/system-admin-pages/src/list-type/queries.ts`, replace `data.allowedProvenance.join(",")` with `formatProvenance(data.allowedProvenance)` at all three sites: line 119 (revive soft-deleted row), line 142 (`createListType`), line 170 (`updateListType`).
- [ ] Add an exported `buildProvenanceItems(selected: readonly string[])` to `libs/system-admin-pages/src/list-type/` returning the GOV.UK checkbox `items` array `[{ value, text, checked }]` derived from `USER_PROVENANCES`. Export it from `libs/system-admin-pages/src/index.ts`.
- [ ] Add an exported `normaliseCheckboxValues(value: unknown): string[]` to the same area, replicating the existing array-or-string-or-absent behaviour exactly. Export it.
- [ ] Write co-located tests for both helpers (`buildProvenanceItems` marks only the selected values checked and returns one item per `USER_PROVENANCES` entry in order; `normaliseCheckboxValues` handles array, single string, `undefined`).
- [ ] In `apps/web/src/pages/(system-admin)/add-list-type/index.ts`: replace the `checkedProvenance` literal at line 18 and the block at lines 80-84 with `provenanceItems: buildProvenanceItems(...)`, and replace the normalisation at lines 27-32 with `normaliseCheckboxValues(req.body.allowedProvenance)`.
- [ ] In `apps/web/src/pages/(system-admin)/edit-list-type/index.ts`: same replacements for the `checkedProvenance` blocks at lines 47-51 and 125-129 and the normalisation at lines 72-77.
- [ ] In `apps/web/src/pages/(system-admin)/edit-list-type/index.ts` line 39, replace `existingListType.allowedProvenance.split(",")` with `parseProvenance(existingListType.allowedProvenance)`.
- [ ] In `apps/web/src/pages/(system-admin)/add-list-type/index.njk` lines 100-106, replace the three hardcoded `items:` entries with `items: provenanceItems`.
- [ ] In `apps/web/src/pages/(system-admin)/edit-list-type/index.njk` lines 100-106, do the same.
- [ ] Leave `apps/web/src/pages/(system-admin)/configure-list-type-preview/index.njk:128` (`data.allowedProvenance | join(", ")`) alone — display formatting, not the storage delimiter.
- [ ] Leave the dead templates alone: `configure-list-type-enter-details/index.njk` and `view-list-types/index.njk` (and their `.njk.test.ts` files).

## 9. Database migration

- [ ] In `libs/postgres-prisma/prisma/schema/location.prisma`, change the `ListType.allowedProvenance` attribute from `@db.VarChar(50)` to `@db.VarChar(255)`.
- [ ] Create `apps/postgres/prisma/migrations/<timestamp>_widen_allowed_provenance/migration.sql` containing `ALTER TABLE "list_types" ALTER COLUMN "allowed_provenance" TYPE VARCHAR(255);`. Use a timestamp after `20260818000000_remove_location_soft_delete`.
- [ ] Run `yarn db:generate`.
- [ ] Run `yarn db:migrate:dev` locally and confirm it applies cleanly with no unintended drift in the generated migration.
- [ ] Confirm the migration is additive and forward/backward compatible with the currently-deployed application code (widening a `varchar` in Postgres is a catalog-only change).

## 10. Update existing tests

- [ ] `libs/location/src/seed-list-types.test.ts` — convert `mockListTypeData` `provenance` values at lines 28 and 38 to arrays; keep the `@hmcts/list-types-common/list-type-data` mock at lines 44-46; leave `@hmcts/list-types-common/user-provenance` unmocked so the real `formatProvenance` runs; assert `allowedProvenance` is the joined string in the Prisma call args.
- [ ] `apps/postgres/prisma/generate-seed-sql.test.ts` — convert `provenance` at lines 41 and 52 to arrays; add a two-provenance fixture and assert the emitted SQL contains `'CRIME_IDAM,PI_AAD'`.
- [ ] `apps/postgres/prisma/generate-seed-sql.test.ts` — add a test that an invalid provenance value causes the generator to throw.
- [ ] `apps/web/src/pages/(system-admin)/add-list-type/index.test.ts` — replace the `checkedProvenance` assertion at line 49 with the `provenanceItems` shape; keep the single-string case at lines 142-153.
- [ ] `apps/web/src/pages/(system-admin)/edit-list-type/index.test.ts` — update the `checkedProvenance` assertions to `provenanceItems`; keep the mock DB row's `allowedProvenance: "CFT_IDAM"` as a string (line 22); add a case where the DB row is `"CRIME_IDAM, PI_AAD"` (with a space) and both values come back selected.
- [ ] `libs/system-admin-pages/src/list-type/validation.test.ts` (and `queries.test.ts` if it asserts the joined string) — confirm they still pass unmodified; adjust only if the refactor changed a call signature.
- [ ] Optionally tidy `apps/web/src/pages/(system-admin)/configure-list-type-preview/index.njk.test.ts:21` from `["MANUAL_UPLOAD", "SJP"]` to `["CFT_IDAM", "PI_AAD"]` for consistency — display-only data, so not required.
- [ ] Confirm the ~40 `apps/web/src/pages/(list-types)/*/index.test.ts` files that mock `resolveListType` with `{ id, provenance: "CFT_IDAM", isNonStrategic: false }` are untouched and still pass — that is the AC 8 regression check.

## 11. E2E

- [ ] Do **not** add a new spec file. Extend `e2e-tests/tests/system-admin/manage-list-types.spec.ts`.
- [ ] In the existing add journey (starts line 13), change the single `await page.getByLabel("CFT_IDAM").check();` at line 55 to also check `PI_AAD`, and assert the preview page's allowed-provenance summary row shows both.
- [ ] In the existing edit journey (starts line 102), assert the previously-saved provenances come back checked when the edit form loads, and that changing the selection persists.
- [ ] Keep both tests `@nightly`-tagged and do not split validation, Welsh or accessibility into separate tests.
- [ ] Leave `e2e-tests/tests/system-admin/configure-list-type.spec.ts` (the 2-line stub) alone.

## 12. Verify and finish

- [ ] Add `@hmcts/list-types-common` as a dependency of any package that newly imports it (`libs/publication`, and `libs/system-admin-pages` if it did not already depend on it); use pinned versions per `CLAUDE.md`.
- [ ] Confirm every new relative import carries a `.js` extension.
- [ ] `yarn lint:fix` and `yarn format`.
- [ ] `yarn test` from the repo root — all workspaces green.
- [ ] `yarn db:drop && yarn db:migrate:dev && yarn db:seed`, then query `select name, allowed_provenance from list_types where name like 'MAGISTRATES%' or name = 'PHT_WEEKLY_HEARING_LIST';` and confirm the values.
- [ ] `yarn test:e2e:all` (or at least the system-admin project) against the freshly seeded DB.
- [ ] Update `docs/tickets/698/plan.md` §5 with the answers received in §0, so the decisions are recorded on the ticket rather than only in chat.
- [ ] Open the PR describing: the type change, the two data fixes, the new shared module, the widened column, the parity test, and the correction that #1029 is not a blocker.
