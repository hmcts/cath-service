# Plan: #438 — Add PCOL Daily Cause List (flat-file list type)

## Summary of investigation

This is **purely a seed / reference-data change**. It does NOT follow the JSON-schema
/ validator / converter / PDF-generator checklist in `CLAUDE.md` (that path only applies
to structured JSON list types). PCOL is a flat-file (PDF/manual document) list, so there is
no schema, no `validate*` wrapper, no Excel converter, no PDF generator, and no dedicated
rendering page.

Key facts confirmed from the codebase:

- **List types are defined as data**, not code, in
  `libs/list-types/common/src/list-type-data.ts` (the `listTypeData: ListTypeData[]` array).
  This array is the single source of truth consumed by the seeders.
- **Local / STG seeding** reads `listTypeData` and upserts rows via
  `libs/location/src/seed-list-types.ts` and `apps/postgres/prisma/seed.ts`
  (`prisma.listType.upsert` keyed on the unique `name` column, plus
  `listTypeSubJurisdiction` links). Seeding is **skipped when `ENVIRONMENT === "prod"`
  and when `CI === "true"`.**
- **Production seeding** is done by idempotent SQL scripts in
  `apps/postgres/prisma/scripts/`:
  - `001_insert_missing_list_types.sql` — upserts each `list_types` row (keyed on `name`).
  - `003_upsert_sub_jurisdictions_and_list_type_links.sql` — links list types to
    sub-jurisdictions in `list_types_sub_jurisdictions` (joins on `list_types.name`, not id).
  Because these scripts must be updated separately for prod, the TS `listTypeData` change
  alone is not sufficient — the SQL scripts must mirror it.
- **Jurisdiction linkage is data-driven.** "Civil Court" is `subJurisdictionId = 1`
  (see `libs/location/src/location-data.ts` and script 003). The list-type → sub-jurisdiction
  link is what puts the list under the Civil jurisdiction in the manual upload form.
- **Friendly names (English + Welsh) live in reference/seed data**, not locale files —
  they are columns on `list_types` (`friendly_name`, `welsh_friendly_name`,
  `shortened_friendly_name`).
- **Manual upload form list** is populated by `findStrategicListTypes()`
  (`isNonStrategic = false`, `deletedAt IS NULL`) in
  `apps/web/src/pages/(admin)/manual-upload/index.ts`. The dropdown label uses
  `shortenedFriendlyName || friendlyName || name`. So setting
  `shortenedFriendlyName = "PCOL Daily Cause List"` and `isNonStrategic = false`
  makes it appear with the correct label automatically. No controller/template change needed.
- **Flat-file vs JSON is decided per-artefact at upload time**, not on the list type.
  `artefact.isFlatFile` (set during upload/ingestion based on file type — non-JSON = flat file)
  drives everything: `summary-of-publications/index.njk` links flat files to
  `/hearing-lists/{locationId}/{id}`, and `getFlatFileForDisplay` guards on
  `artefact.isFlatFile`. The list type itself needs no `isFlatFile` flag and no dedicated
  view page, so `url` (urlPath) is left empty for PCOL.
- **`isNonStrategic` behaviour**: strategic lists (`false`) appear in the standard manual
  upload form (`/manual-upload`); non-strategic (`true`) appear in the separate
  `/non-strategic-upload` (Excel) journey. PCOL is strategic, so it belongs in the standard
  manual upload form — matching AC.

Reference pattern: `CIVIL_DAILY_CAUSE_LIST` (strategic, Civil, Public) is the closest sibling.
Note that its `urlPath` exists only because it has a JSON-rendered page; PCOL, being flat-file
only, omits `urlPath`.

## 1. Technical Approach

Add one new list-type record to the three places that define list-type reference data,
keeping the TypeScript seed data and the two production SQL scripts in sync. No new module,
no schema migration, no validator, no page, no locale files.

Architecture decisions / considerations:
- Use the stable string `name` (`PCOL_DAILY_CAUSE_LIST`) as the key everywhere. Never rely on
  the autoincrement numeric `id` (per CLAUDE.md — ids differ across environments).
- Link to Civil via `subJurisdictionId = 1`, matching the existing Civil Court sibling lists.
- Leave `urlPath`/`url` empty so the publication is served through the generic flat-file route
  (`/hearing-lists/{locationId}/{id}`) rather than a non-existent rendering page.
- Keep the change minimal (YAGNI/KISS): no new tests beyond the reference-data assertion the
  existing seed test already exercises via its own mock (adding to real `listTypeData` does not
  break `apps/postgres/prisma/seed.test.ts`, which counts against its local `mockListTypeData`).

## 2. Implementation Details

### 2.1 `libs/list-types/common/src/list-type-data.ts`
Add a new `ListTypeData` entry to the `listTypeData` array (place it near the other Civil
entries for readability):

```typescript
{
  name: "PCOL_DAILY_CAUSE_LIST",
  englishFriendlyName: "Possession Claim Online Daily Cause List",
  welshFriendlyName: "Rhestr Achosion Dyddiol Hawliadau Meddiant Ar-lein",
  provenance: "CFT_IDAM",            // see CLARIFICATIONS — matches sibling Civil lists
  isNonStrategic: false,
  defaultSensitivity: "Public",
  shortenedFriendlyName: "PCOL Daily Cause List",
  subJurisdictionIds: [1]            // Civil Court
  // urlPath intentionally omitted — flat-file list, no dedicated rendering page
}
```
- Omitting `urlPath` makes the seeder write `url = ""` (see `seed-list-types.ts` line 43),
  which is what we want for a flat-file list.

### 2.2 `apps/postgres/prisma/scripts/001_insert_missing_list_types.sql`
Add one row to the `VALUES` list (before the closing `)` / `ON CONFLICT` block). Column order
is `(name, friendly_name, welsh_friendly_name, shortened_friendly_name, url, default_sensitivity, allowed_provenance, is_non_strategic, updated_at)`:

```sql
  ('PCOL_DAILY_CAUSE_LIST', 'Possession Claim Online Daily Cause List', 'Rhestr Achosion Dyddiol Hawliadau Meddiant Ar-lein', 'PCOL Daily Cause List', '', 'Public', 'CFT_IDAM', false, NOW()),
```
- `url` is empty string (flat-file, no rendering page).
- Ensure correct comma placement: the current last row (UT_ADMINISTRATIVE_APPEALS_CHAMBER…)
  has no trailing comma before `ON CONFLICT`; add the new row with a comma after the previous
  final row, and no trailing comma on the new last row.

### 2.3 `apps/postgres/prisma/scripts/003_upsert_sub_jurisdictions_and_list_type_links.sql`
Add the list-type → sub-jurisdiction link inside the `FROM (VALUES …)` mapping list
(joins on `list_types.name`), near the other Civil (1) entries:

```sql
  -- PCOL_DAILY_CAUSE_LIST → Civil Court (1)
  ('PCOL_DAILY_CAUSE_LIST',                                               1),
```
- Watch comma placement: the current final mapping row
  (`UT_ADMINISTRATIVE_APPEALS_CHAMBER_DAILY_HEARING_LIST`, 26) has no trailing comma before
  `) AS mapping(...)`. Add a comma after it and leave the new last row without one, or insert
  the PCOL row earlier in the list so trailing-comma rules are preserved.
- No new sub-jurisdiction is needed (Civil Court id 1 already exists).

### 2.4 (Conditional) `e2e-tests/utils/seed-list-types.ts`
Only if an E2E journey needs to select PCOL in the manual upload form. The `BASE_LIST_TYPES`
array there is a curated subset, not the full list. Add PCOL **only if** an E2E test is
written for it (see §5). Otherwise leave untouched (YAGNI).

### Files explicitly NOT changed
- No Prisma schema file / migration (columns already exist).
- No `libs/list-types/pcol-*` module, no `schemas/*.json`, no `validation/json-validator.ts`.
- No `PDF_GENERATOR_REGISTRY` / `registerConverterByName` entry.
- No page under `apps/web/src/pages/(list-types)/`.
- No locale (`en.ts`/`cy.ts`) files — friendly names live in reference data.

## 3. Error Handling & Edge Cases
- **Idempotency**: Both SQL scripts use `ON CONFLICT` (list types `DO UPDATE`, links
  `DO NOTHING`) and the TS seeder uses `upsert` keyed on `name`, so re-running is safe.
- **Comma/syntax errors** in the SQL `VALUES` blocks are the main risk — verify the diff and,
  ideally, run the scripts against a local DB (`yarn db:migrate:dev` / manual psql) to confirm.
- **Missing sub-jurisdiction**: Civil Court (1) already exists; the TS seeder throws if a
  list type resolves to zero sub-jurisdictions, so the `[1]` link is required.
- **Numeric id independence**: everything keys on `name` — safe across local/STG/prod.
- **Sensitivity casing**: the manual-upload controller upper-cases `defaultSensitivity`
  for the client-side map; storing `"Public"` (matching every other Public list) is correct.
- **Flat file vs JSON at upload**: because `isFlatFile` is per-artefact, a user could in theory
  upload a `.json` for PCOL; there is no PCOL schema, so JSON schema validation is skipped
  (validator only runs for `.json` files that match a registered schema). This is acceptable and
  matches the "no schema validation" AC; the expected use is PDF/flat-file.

## 4. Acceptance Criteria Mapping

| AC | How satisfied | Verification |
|----|---------------|--------------|
| PCOL list created & linked to Civil jurisdiction; shown as "PCOL Daily Cause List" in manual upload form | New `listTypeData` entry + SQL rows with `subJurisdictionIds: [1]` (Civil Court) and `shortenedFriendlyName: "PCOL Daily Cause List"`; `findStrategicListTypes()` surfaces it and the dropdown uses `shortenedFriendlyName` | After `yarn db:generate` + reseed, load `/manual-upload` and confirm "PCOL Daily Cause List" appears in the list-type dropdown |
| List is strategic (`isNonStrategic = false`) | `isNonStrategic: false` in TS + `is_non_strategic false` in script 001 | Confirm it appears in `/manual-upload` (strategic form), NOT in `/non-strategic-upload` |
| Default sensitivity Public | `defaultSensitivity: "Public"` / `'Public'` | Selecting the list type pre-fills sensitivity via `listTypeSensitivityMap`; verify in form |
| Uploaded as flat file, no JSON schema / style guide | No schema/validator/converter/page added; `url` empty so flat-file route used | Upload a PDF under PCOL and confirm it publishes and is viewable at `/hearing-lists/{locationId}/{id}` without schema errors |

## 5. Open Questions — CLARIFICATIONS NEEDED

1. **`allowedProvenance` value.** The ticket says "Restricted provenances: None", but the
   data model requires a value and every sibling Civil list uses `CFT_IDAM`. Options:
   `CFT_IDAM` (consistent with Civil siblings) vs `MANUAL_UPLOAD` (the provenance actually used
   by manual uploads — see `libs/api/src/blob-ingestion/validation.ts`). The plan assumes
   `CFT_IDAM` for consistency. **Please confirm the intended `allowedProvenance`.**
2. **Welsh translation sign-off.** "Rhestr Achosion Dyddiol Hawliadau Meddiant Ar-lein" comes
   from the ticket/pip-frontend. Confirm it is the approved Welsh string (no
   `[WELSH TRANSLATION REQUIRED]` placeholder needed).
3. **E2E coverage expectation.** Is a dedicated E2E test required for this list type, or is the
   existing manual-upload E2E coverage sufficient? Adding PCOL to
   `e2e-tests/utils/seed-list-types.ts` is only needed if a PCOL-specific journey is written.
4. **Prod rollout mechanism.** Confirm the `apps/postgres/prisma/scripts/00x_*.sql` scripts are
   the correct/only path for prod (seeding is skipped when `ENVIRONMENT === "prod"`), and that
   they are executed as part of the release for this change.
