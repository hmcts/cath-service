# Tasks — #698: Add/Update provenance for all lists

## Blocking gate

- [x] Obtain sign-off on `PHT_WEEKLY_HEARING_LIST` `MANUAL_UPLOAD` → `CFT_IDAM` (widens access to
      CFT publishers). Sign-off GRANTED — PHT provenance is now `["CFT_IDAM"]` and passes parity
      normally; `ALLOWED_DIVERGENCES` in the parity test is empty.

## Shared provenance module (`@hmcts/list-types-common`)

- [x] Create `libs/list-types/common/src/user-provenance.ts` with `USER_PROVENANCES`
      (`CRIME_IDAM`, `PI_AAD`, `CFT_IDAM`, `SSO`), `PUBLISHER_PROVENANCES`
      (`CFT_IDAM`, `PI_AAD`, `CRIME_IDAM`), `formatProvenance` (validate + join),
      `parseProvenance` (split + trim + drop empties).
- [x] Export the module from `libs/list-types/common/src/index.ts`.
- [x] Add a `"./user-provenance"` export subpath to `libs/list-types/common/package.json`
      (mirror the existing `"./list-type-data"` subpath so seed paths avoid the barrel).
- [x] Add `libs/list-types/common/src/user-provenance.test.ts` (trim, empty-drop, invalid-throws,
      valid round-trip).

## Data type change + fixes

- [x] Change `ListTypeData.provenance` to `string[]` in `list-type-data.ts`.
- [x] Convert all 77 `provenance:` entries to array literals.
- [x] Add `PI_AAD` to the 4 magistrates adult-court lists → `["CRIME_IDAM", "PI_AAD"]`.
- [x] Apply PHT fix `["CFT_IDAM"]` (signed off).

## Seed paths

- [x] `apps/postgres/prisma/generate-seed-sql.ts`: use
      `formatProvenance(lt.provenance)`; import from `@hmcts/list-types-common/user-provenance`.
- [x] `libs/location/src/seed-list-types.ts`: use
      `formatProvenance(listType.provenance)`; subpath import.

## Authorisation

- [x] `libs/publication/src/authorisation/service.ts`: replace `.split(",")` with
      `parseProvenance(listType.provenance)`; subpath import.
- [x] Extend `libs/publication/src/authorisation/service.test.ts` with a spaced legacy row
      (`"CRIME_IDAM, PI_AAD"`) proving trim fixes matching; confirm unchanged cases still pass.

## System Admin queries + validation

- [x] `libs/system-admin-pages/src/list-type/queries.ts` (3 sites): replace
      `.allowedProvenance.join(",")` with `formatProvenance(data.allowedProvenance)`.
- [x] `libs/system-admin-pages/src/list-type/validation.ts`: replace private `PROVENANCE_OPTIONS`
      with imported `PUBLISHER_PROVENANCES`.

## System Admin controllers + templates

- [x] `add-list-type/index.ts`: build provenance options from `PUBLISHER_PROVENANCES` (remove
      the two hardcoded `checkedProvenance` literals); pass the option list to the template.
- [x] `edit-list-type/index.ts`: replace `.split(",")` with `parseProvenance(...)`; build
      provenance options from `PUBLISHER_PROVENANCES` (remove `checkedProvenance` literals).
- [x] `add-list-type/index.njk` & `edit-list-type/index.njk`: iterate the passed
      `provenanceOptions` list to build checkbox `items` instead of hardcoding the three values.
- [x] Update add/edit controller tests for the constant-driven checkboxes.
- [x] Also routed `apps/web/src/pages/(list-types)/sjp-press-list/require-verified-with-provenance.ts`
      through `parseProvenance` (found via grep; not in the original plan table).

## Schema migration (VARCHAR widen)

- [x] `libs/postgres-prisma/prisma/schema/location.prisma`: `@db.VarChar(50)` →
      `@db.VarChar(255)`.
- [x] Create `apps/postgres/prisma/migrations/20260922000000_widen_allowed_provenance/migration.sql`
      with `ALTER TABLE "list_types" ALTER COLUMN "allowed_provenance" TYPE VARCHAR(255);`.
- [x] `yarn db:generate` run; client refreshed.

## Parity test

- [x] Create `libs/list-types/common/src/list-type-data.parity.test.ts` reading
      `docs/tickets/698/reference-list-types.json`.
- [x] Add `NAME_ALIASES` (19 ours→shared divergences).
- [x] Add `KNOWN_GAPS` (22 real gaps + 3 deprecated-superseded: `CARE_STANDARDS_LIST`,
      `PRIMARY_HEALTH_LIST`, `CIC_DAILY_HEARING_LIST`) and assert none appear in `listTypeData`.
- [x] Add `ALLOWED_DIVERGENCES` (empty — PHT signed off).
- [x] Assert every `listTypeData` entry's provenances match the reference (post-alias) or a
      recorded divergence.

## Verification

- [x] `yarn lint:fix` and `yarn format`.
- [x] `yarn test` (parity, provenance module, authorisation, system-admin controllers) — all pass.
- [x] Grep confirms no stray `.join(",")` / `.split(",")` on provenance outside the module.
- [ ] Manual: seed locally, edit a multi-provenance list type in System Admin, confirm both
      values round-trip. (Not executed in this session — no local DB; covered by unit tests
      for parse/format round-trip and controller/query tests.)
