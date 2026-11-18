# Spike report: #1078 Court Maintenance

Options for adding a new court location through the System Admin portal without a CSV file.

| | |
|---|---|
| Issue | #1078 (spike) |
| Plan | `docs/tickets/1078/plan.md` |
| Spec | `/spec` comment on #1078, mirrored in `docs/tickets/1078/ticket.md` (sections 4 to 13) |
| Code verified against | `828aa742` (branch `vibe-1383`, contains `origin/master` `5014f714`). `git diff 65eb3d72 HEAD` over every path cited below is empty, so the plan's baseline and the code read here are the same for this purpose |
| Experiments | Run on 2026-11-13 against two throwaway databases (`spike_1078_s1`, `spike_1078_s2`) created inside the local docker `cath-postgres` container (localhost:5433), migrated with `prisma migrate deploy`, and dropped afterwards. The developer's own `postgres` database was not touched. No repository file was changed |

> ## Recommendation: Option C
>
> Build a **one-question-per-page "Add a court or tribunal" journey** (names, contact details,
> regions, sub-jurisdictions, provenance reference, check answers, confirmation) in
> `apps/web/src/pages/(system-admin)/`, backed by a new `court-maintenance` service in
> `libs/system-admin-pages` that writes one court in one transaction. It depends on three decisions:
>
> 1. **Allocate `location_id` from a Postgres sequence that starts at 100000** (not `MAX + 1`,
>    not autoincrement from 1).
> 2. **Protect UI-created courts from the deploy seed** by freezing `location-data.ts` for new
>    courts, enforcing that with a CI test that the seed file holds only courts 1–27, and asking the tech lead to stop the seed re-pointing
>    provenance references.
> 3. **Keep the CSV route for bulk edits and make it update-only** in a follow-on ticket, so it can
>    no longer mint primary keys. Until then, ticket 1 rejects CSV IDs at or above the sequence start that do not already exist.
>
> Estimated at 6.5 to 8 dev-days across two build tickets (§7). Options A, B, D, E and F are
> rejected, each with a one-line reason in §4.4.

---

## 1. Current state

### 1.1 How a court is added today: the CSV round-trip

There is no "add a court" page. A new `location` row reaches a deployed environment by one of two routes: a developer edits `locationData` (Option D), or a System Admin uses this CSV round-trip:

| Step | Route | What happens | Evidence |
|---|---|---|---|
| 1 | `GET /reference-data` | Hub. Four options; "Upload Reference Data" links to the upload page | `apps/web/src/pages/(system-admin)/reference-data/en.ts:4-29` |
| 2 | `GET /reference-data-download` | Exports **every** location, ordered by ID, with regions, sub-jurisdictions and references | `.../reference-data-download/index.ts:5-11`; `libs/system-admin-pages/src/reference-data-upload/services/download-service.ts:4-10` (`findMany`, no `where`) |
| 3 | (spreadsheet) | The admin adds a row and **makes up the `LOCATION_ID`** | `libs/system-admin-pages/src/reference-data-upload/parsers/csv-parser.ts:71-80` only checks present and integer |
| 4 | `POST /reference-data-upload` | Checks a `.csv` arrived, stores the buffer in `session.uploadData` | `.../reference-data-upload/index.ts:41-81` |
| 5 | `GET /reference-data-upload-summary` | Parses and previews; does **not** validate | `.../reference-data-upload-summary/index.ts:44-83` |
| 6 | `POST /reference-data-upload-summary` | Re-parses, runs `validateLocationData()` (21 rules, §5), calls `upsertLocations()` with **no try/catch**, sets `REFERENCE_DATA_UPLOAD` audit metadata (file name and row count) | `.../reference-data-upload-summary/index.ts:108`, `:125`, `:132-136` |
| 7 | `GET /reference-data-upload-confirmation` | Confirmation | `.../reference-data-upload-confirmation/index.ts:8-16` |

`upsertLocations()` (`libs/system-admin-pages/src/reference-data-upload/repository/upload-repository.ts:20-122`) merges rows by ID (`mergeByLocationId()`, `:5-18`), then inside one `prisma.$transaction` (`:22`), for **every row in the file**:
- upserts `location`, overwriting `name`, `welshName`, `email` and `contactNo` (`:53-70`);
- `deleteMany`s and re-creates `location_sub_jurisdiction` and `location_region` (`:73-102`);
- `deleteMany`s and re-creates `location_reference` (`:104-119`).

The summary and confirmation pages hard-code `locale = "en"` (`reference-data-upload-summary/index.ts:45`, `:111`; `reference-data-upload-confirmation/index.ts:9`). So from step 5 onwards the CSV route is English-only, not just its error strings.

### 1.2 The asymmetry: every neighbouring table already has a non-CSV journey

All of these are in `apps/web/src/pages/(system-admin)/`, behind `requireRole([USER_ROLES.SYSTEM_ADMIN])`:

| Reference data | Non-CSV journey | Writes through |
|---|---|---|
| Region | `add-region` (+success); `region-data`, `region-data-create`, `-list`, `-modify`, `-update`, `-delete` (+success) | `createRegion()` (`add-region/index.ts:43`); `createJurisdictionData()` (`region-data-create/index.ts:29`) |
| Jurisdiction, sub-jurisdiction | `add-jurisdiction`, `add-sub-jurisdiction` (+success); `jurisdiction-data`, `-create`, `-list`, `-modify`, `-update`, `-delete` (+success) | `createJurisdiction()`, `createSubJurisdiction()`, `createJurisdictionData()` |
| Location to region / sub-jurisdiction mapping | `location-jurisdiction-search`, `-manage`, `-update`, `-delete` (+success) | `updateLocationJurisdictions()` (`libs/system-admin-pages/src/jurisdiction-management/queries.ts:179`) |
| Location metadata | `location-metadata-search`, `-manage`, `-delete-confirmation`, `-success` | `libs/location/src/repository/location-metadata-*.ts` |
| Delete a court | `delete-court`, `-confirm`, `-success`, `-publications*`, `-subscriptions*` | `deleteLocation()` (`libs/location/src/repository/queries.ts:264-270`, hard delete) |
| **Location (the court itself)** | **None** | Only `upsertLocations()` (CSV) and the seeds |

The core `location` row is the only reference-data entity a System Admin cannot create, rename or re-contact without a file. That is the main finding: Option C completes a pattern the portal already uses. It can reuse:
- `listJurisdictionsWithSubJurisdictions()` and `listRegions()` (`jurisdiction-management/queries.ts:48`, `:59`) for the checkboxes;
- the session guard in `location-jurisdiction-manage/index.ts:12` and `location-jurisdiction-update/index.ts:20`;
- the audit pattern in `add-region/index.ts:52-56`.

### 1.3 The five hard constraints, verified

| # | Constraint | Evidence | Experiment |
|---|---|---|---|
| c1 | `Location.locationId Int @id`, **no default, no sequence**; every writer supplies the ID | `libs/postgres-prisma/prisma/schema/location.prisma:70` | Yes: on a freshly migrated DB `column_default` is empty and no `location%` sequence exists |
| c2 | `name`, `welshName` `@unique` NOT NULL; `email`, `contactNo` nullable | `location.prisma:71-74` | Yes (P2002 on `location_name_key`, §4.5) |
| c3 | **Deploy seed parks colliding names**: `generateRealignSql("location", …)` renames any row whose name/welsh_name matches `locationData` to `__realign_<id>`, then `INSERT … ON CONFLICT (location_id) DO UPDATE SET name, welsh_name`. No reconciliation pass, so rows outside `locationData` survive unless their name collides, and then they stay parked | `apps/postgres/prisma/generate-seed-sql.ts:46-51`, `:72-76`, `:93-97`; run by `apps/postgres/start.sh:104-105` after `migrate deploy` (`:95`) | Yes, scenario 1 |
| c4 | **Deploy seed takes over references**: `('seedref_<id>', id, 'SNL', String(id + 100), type)` with `ON CONFLICT (provenance, provenance_location_id) DO UPDATE SET location_id = EXCLUDED.location_id` | `generate-seed-sql.ts:99-112` (`+100` at `:106`, re-point at `:111`) | Yes, scenario 1 |
| c5 | **`upsertLocations()` rewrites every row in the file** (names, email, contact overwritten; three child tables deleted and re-created). Starting from a full download, a stale file reverts other admins' edits | `upload-repository.ts:53-119` | Static |

Correction to the plan's c5 wording: "a blank column wipes mappings" is true only for `EMAIL` and `CONTACT_NO` (`upload-repository.ts:67-68`). A blank region, sub-jurisdiction or provenance column is rejected by validation (`validation.ts:53-72`). Mappings are lost through **stale** values, not blank ones.

Related facts that matter to the options:
- `location_reference` is unique on `(provenance, provenanceLocationId)` (`location.prisma:93`). Its `cuid()` default is Prisma-only (`:85`).
- The closed vocabularies live in `libs/location/src/repository/location-reference-model.ts:1` (provenances) and `:4` (types).
- `AuditLogAction` has no court-creation member (`libs/system-admin-pages/src/audit-log/logger.ts:3-26`).
- `location.deleted_at` was dropped (`apps/postgres/prisma/migrations/20260818000000_remove_location_soft_delete/migration.sql`). Courts are hard-deleted, so there is no soft-delete or reconciliation story.
- There is no cache in `libs/location/src/repository/*`. `GET /api/locations` reads the database directly (`apps/api/src/routes/locations.ts:1-2`), so a new court is visible immediately.
- `locationData` holds IDs 1–27 (`libs/location/src/location-data.ts`, 485 lines), so the seeded SNL references are "101"–"127" (confirmed on the scratch database).
- Migrations live in `apps/postgres/prisma/migrations/`. `apps/postgres/prisma.config.ts:14-18` points the schema at `libs/postgres-prisma/prisma/schema`.
- Session keys go in the `SessionData` augmentation in `apps/web/src/session.ts:4-35` (`uploadData` at `:28`, `regionSuccess` at `:33`).

### 1.4 The existing allocation precedent: `MAX + 1`

| Writer | Table | Locking | Evidence |
|---|---|---|---|
| `createJurisdictionRecord()` "Jurisdiction" | jurisdiction | None | `jurisdiction-management/queries.ts:79-81` |
| `createJurisdictionRecord()` "Sub-Jurisdiction" | sub_jurisdiction | `LOCK TABLE … IN EXCLUSIVE MODE` | `jurisdiction-management/queries.ts:86-99` |
| `createJurisdictionRecord()` "Region" | region | None | `jurisdiction-management/queries.ts:104-107` |
| `createRegion()` | region | None | `reference-data-upload/repository/region-repository.ts:42-53` |
| `createJurisdiction()` | jurisdiction | None | `reference-data-upload/repository/jurisdiction-repository.ts:42-53` |
| `createSubJurisdiction()` | sub_jurisdiction | `LOCK TABLE` | `reference-data-upload/repository/sub-jurisdiction-repository.ts:71-81` |

There are two implementations per table. The `add-*` pages use the `reference-data-upload/repository` functions; the `*-data-create` pages use `createJurisdictionData()` → `createJurisdictionRecord()`.

### 1.5 Location IDs in use outside `locationData`

| Band | Owner | Evidence |
|---|---|---|
| 1–27 | `locationData` | `libs/location/src/location-data.ts` |
| SNL "101"–"127" | seed `id + 100` | `generate-seed-sql.ts:106`; `libs/location/src/seed-data.ts:215` |
| 9001–9010 (no 9009), SNL "9001"–"9010" | E2E fixtures via global setup | `e2e-tests/fixtures/test-reference-data.csv:2-10`; `e2e-tests/utils/seed-location-data.ts:14`; `e2e-tests/utils/verify-seed-data.ts:63` |
| 80000–89999 | CSV E2E | `e2e-tests/utils/location-csv.ts:11-12` |
| 90000–99999 | test-support POST `randomInt(90000, 100000)`, retried on clash | `libs/test-support/src/routes/test-support/locations.ts:104-113`, `:154-156` |
| provenance "90000"–"99999" | test-support default `provenanceLocationId = String(locationId)` | `libs/test-support/src/routes/test-support/locations.ts:136` |

E2E runs against STG, so `MAX(location_id)` there sits in the 9xxxx band. On the scratch database with these bands populated, `MAX + 1` returned **100000** (§4.5).

### 1.6 Where the code disagrees with the plan

| # | Plan says | Code says | Effect |
|---|---|---|---|
| P1 | Local seed fails with P2002 on `locationReference.create` (§1.3 c4) | That create (`seed-data.ts:207-218`) runs only on a fully empty DB (`:19-33`). Otherwise the upsert branch (`:43-97`) runs, writes no references or junctions, and fails on `location.name` at `:79` (reproduced) | Same conclusion, different cause. Also, on an existing local DB new `locationData` entries get no mappings from `yarn db:seed`. That deserves a small separate fix |
| P2 | "Fixture 9001" (§1.4) | Band 9001–9010 with SNL refs "9001"–"9010" | Proof widened; decision unchanged |
| P3 | Hub is "a four-entry radio list" | Four entries rendered as **tiles** by default (`reference-data/index.ts:6`, `:11`); radios only on the POST error path (`:34`) | Ticket 2 adds a fifth `options` entry; design should confirm (Q11) |
| P4 | Not mentioned | Test-support provenance IDs default to the location ID | Affects the step 5 uniqueness check; E2E should use prefixed provenance IDs, as `location-csv.ts:50` does |
| P5 | Precedent is `createJurisdictionRecord()` and `createRegion()` | Also `createJurisdiction()` and `createSubJurisdiction()`; two implementations | Strengthens Q9 |
| P6 | "Blank column wipes mappings" | Only email and contact number are wiped | c5 corrected |
| P7 | CSV error strings English-only | Whole summary and confirmation step is English-only | Widens C's bilingual gain |
| P8 | C effort 5–8 d | Plan's own ticket sizes sum to 6.5–8 d | Report uses 6.5–8 d |
| P9 | `"location_location_id_seq"` | Prisma emits it unquoted | Equivalent |

### 1.7 Legacy CaTH (PIP) had no add-a-court page either

The old service (`hmcts/pip-frontend` and `hmcts/pip-data-management`, read on GitHub) also added courts only by CSV round-trip:
- **Journey.** `/manual-reference-data-download`, then `/reference-data-upload`, then `/reference-data-upload-summary`, then `/reference-data-upload-confirmation`. All four sit behind `isPermittedSystemAdmin` (`pip-frontend` `src/main/routes/routes.ts:844-875`). The summary and confirmation pages had Welsh locale files, though some strings in them ("Change", "File", "Confirm", "Your file has been uploaded") were still English. Today's pages hard-code English throughout (§1.1, P7).
- **Write.** `POST /locations/upload` (`pip-data-management` `LocationController.java:105-113`) runs `LocationService.uploadLocations()` (`:159-192`). The `P&I ID` column is the primary key (`Location.java:37-39`, `@Id Integer locationId` with no generator), so the admin chose the ID there too. An existing ID was overwritten, including its references, and nothing was deleted.
- **Validation.** Duplicate English or Welsh names, against the database and within the file (`:317-350`), and HTML tags in names (`:301-315`). Regions and jurisdictions were free-text `text[]` columns, so there was no "not found" check.
- **No seed.** There was no `location-data.ts` equivalent that renamed rows on deploy, so constraints c3 and c4 are new in this service.

So no create journey has ever existed. Option C is new in both systems, and the new service ported the old CSV design almost one-for-one.

**Seeded and legacy court IDs differ.** A legacy staging reference-data export (2026-11-17; 367 courts, P&I IDs 1–389, none at or above 100000) was compared with the 27 seeded courts in `docs/tickets/1078/legacy-court-mapping.md`. Only Single Justice Procedure has the same ID in both (9). 22 exist in legacy under a different ID (for example Royal Courts of Justice is 109 in legacy and 4 here), 3 have no legacy match, Rolls Building is legacy 111, and 19 seeded IDs belong to a different court in legacy (legacy 7 is Liverpool Social Security and Child Support Tribunal; seeded 7 is Bristol Civil and Family Justice Centre). If legacy courts are ever brought into this service with their IDs, the deploy seed would rename most of them (c3). Renumbering the seeded courts to their legacy IDs before go-live avoids that; it is drafted as a separate ticket (`docs/tickets/1078/draft-ticket-align-court-ids.md`, Q1).

---

## 2. Options matrix

Effort is in dev-days including tests. Constraint scoring: ✗ = unsolved or worse, ~ = partly handled, ✓ = handled.

| # | Option | Pros | Cons | Effort | c1 | c2 | c3 | c4 | c5 | Verdict |
|---|---|---|---|---|---|---|---|---|---|---|
| A | Keep CSV round-trip | No cost; live and tested; good for bulk | Admin invents the PK; stale file reverts others' work; all 21 errors point at `#file` (WCAG 3.3.1/3.3.3); audit records a file name; provenance clash is a 500 | 0 | ✗ | ~ | ✗ | ✗ | ✗ | Rejected |
| B | Single page, about nine inputs | Cheapest real journey; same shape as `add-region` | Breaks one-thing-per-page with two multi-select fieldsets and two closed vocabularies; no check answers before a write to unique columns; hard error recovery | 2–3 + ticket 1 | ✓ | ✓ | ✓* | ✓* | ✓ | Fallback; shares C's service |
| C | One question per page → check answers → confirmation | Standard GOV.UK pattern; field-linked errors; review gate; reuses building blocks; per-court create-only write; extends to amend | Seven pages to build, translate and test; session state and deep-link guard; slower for bulk | 6.5–8 | ✓ | ✓ | ✓* | ✓* | ✓ | **Recommended** |
| D | Developer edits `location-data.ts` | One source of truth; reviewed; no new code | Developer, pull request and release per court; cannot set email, contact or real provenance IDs | 0 UI | ✓ | ✓ | ✓ | ~ | ✓ | Rejected as primary; documented current mechanism |
| E | Paste CSV into a textarea | About half a day | Meets the wording, not the intent; keeps every CSV defect; harder and less accessible than upload | 0.5 | ✗ | ~ | ✗ | ✗ | ✗ | Rejected |
| F | Upstream sync | Removes manual work | Another team's contract that doesn't exist; reconciliation policy without soft delete; no Welsh names upstream | Not estimable | ? | ✗ | ? | ? | ? | Separate discovery spike; C is a prerequisite |

\* With Decision 2. Without a `locationData` freeze, any writer outside `locationData` is exposed to c3 and c4 (§4.5).

---

## 3. The options in detail

### 3.1 A: keep the CSV round-trip
It works and has E2E coverage (`e2e-tests/utils/location-csv.ts`), and it is right for bulk change. As the way to add one court it fails every constraint:
- The admin picks the primary key unaided (c1), possibly one `locationData` will claim later (c3, c4) or one inside an E2E band.
- A full-download workflow rewrites every court in the file (c5), so two admins working from different downloads revert each other.
- All 21 errors link to `#file`.
- A provenance clash with the database isn't validated and becomes a 500 (`reference-data-upload-summary/index.ts:125`).
- The audit entry records `File: …, Records: n`, not which court changed (`:132-136`).

**Verdict:** rejected for adding a court; kept for bulk updates (Decision 3).

### 3.2 B: single "Add a court" page
All fields on one page, on top of C's service, sequence and audit action. It costs 2–3 d over ticket 1, but:
- it breaks one-thing-per-page with two large checkbox fieldsets and two closed vocabularies;
- with no check answers, the admin first sees the whole court after it has been written to two unique columns, and fixing a mistake needs an amend journey that doesn't exist (Q8);
- error recovery on a nine-field page is harder for screen-reader and keyboard users.

**Verdict:** fallback if Q4 shows high bulk volume.

### 3.3 C: one question per page (recommended)
The pages are `add-court-name`, `add-court-contact-details`, `add-court-regions`, `add-court-sub-jurisdictions`, `add-court-provenance-reference`, `add-court-check-answers` and `add-court-success` (spec §4.3, §5, §6).
- Each page validates its own fields, with errors linked to the field.
- Check answers re-validates uniqueness and does one create-only transaction.
- It is bilingual from the start, and each piece has a precedent in the same directory (§1.2).

It costs more than B: seven pages, a session namespace and deep-link guards.

**Verdict:** recommended (§4).

### 3.4 D: developer edits `location-data.ts`
This is how the 27 seeded courts got there: one reviewed source of truth that reaches every environment. But every new court needs a developer, a pull request and a release. It can only set the names, regions, sub-jurisdictions, caution messages and one synthetic SNL `id + 100` reference. It cannot set email, contact number or real provenance IDs (`generate-seed-sql.ts:93-112`).

**Verdict:** rejected as the primary route; it stays the documented mechanism for the 27 until Q1 is answered.

### 3.5 E: paste CSV into a textarea
It reuses `parseCsv()` and `validateLocationData()` and takes half a day. It keeps the invented PK, the whole-file rewrite, the `#file` anchors and the 500 on a provenance clash. Typing CSV by hand is harder and less accessible than uploading a file.

**Verdict:** rejected.

### 3.6 F: upstream sync
There is no upstream contract, and the owning team sits outside CaTH. It needs a reconciliation policy even though locations have no soft delete. Unique Welsh names (c2) are unlikely upstream. Any sync still needs a per-court create path and an ID strategy, which is what C builds.

**Verdict:** separate discovery spike (S3).

---

## 4. The recommendation: Option C and three supporting decisions

### 4.1 Decision 1: allocate `location_id` from a sequence starting at 100000

| Strategy | Analysis | Verdict |
|---|---|---|
| `MAX + 1` (existing precedent) | Returns **28** on a fresh local DB, the next `locationData` ID, so the next deploy renames the UI court (c3). Returns **100000** on STG-like data, next to random test-support IDs. Races without a lock; `LOCK TABLE` serialises writes but gives the same IDs | Rejected for location. The precedent only works for regions and jurisdictions because they have no test bands, and it already carries the seed hazard there (Q9) |
| `@default(autoincrement())` from 1 | Hands out `locationData` IDs; the first UI court is renamed on the next deploy | Rejected |
| **Sequence START 100000** | Disjoint from every band (below). `nextval` is atomic. Explicit-ID writers bypass the default and never advance it | **Chosen**, with a regression test |

**Disjointness proof.** The sequence only hands out IDs ≥ 100000.

| Writer | IDs | Highest | < 100000 |
|---|---|---|---|
| `generateLocationsSql()` / `seedLocationData()` | 1–27 | 27 | Yes |
| `generateLocationReferencesSql()` | provenance "101"–"127" (a different column) | 127 | Yes |
| E2E fixtures | 9001–9010 | 9010 | Yes |
| CSV E2E | 80000–89999 | 89999 | Yes |
| test-support POST | `randomInt(90000, 100000)` (upper bound exclusive) | 99999 | Yes |

The `+100` values live in `location_reference.provenance_location_id`, not `location_id`, so they matter to Decision 2 rather than here.

The margin above the test band is one ID. Q3 asks whether to start at 1,000,000 instead. Ticket 1's regression test must assert that `max(locationData id)`, `max + 100` and 99999 are all below the start.

The remaining risk is the **CSV route**, which accepts any integer. An admin-chosen 100201 makes the next `nextval` fail on `location_pkey` (reproduced). One retry only gets past a single occupied ID. So ticket 1 adds an interim guard: the CSV route rejects any `LOCATION_ID` at or above the sequence start **that does not already exist in `location`**, from the same release that adds the sequence. Existing IDs in that range must still be accepted: the download exports every location (`download-service.ts:6-8`, `findMany` with no filter), and until S1 ships the CSV route is the only way to amend a UI-created court. Rejecting them would break the download-edit-upload round-trip as soon as the first UI court exists, and would make the interim guard stricter than S2's final rule. The check is one `findMany({ where: { locationId: { in: idsAtOrAboveStart } } })`, the same lookup S2 needs. Decision 3 (S2) then makes the CSV route fully update-only. Confirm still maps a `location_pkey` P2002 to one retry, then an error, as a last line of defence.

**STG has not been measured.** The disjointness proof above covers every writer in the code. It does not prove that STG holds no row at or above 100000: admins have been able to upload CSVs with any integer ID (`csv-parser.ts:76`), and test-support upserts any explicit `locationId` (`libs/test-support/src/routes/test-support/locations.ts:56`). Before ticket 1 merges, run this on STG and record the result in the ticket (Q3):

```sql
SELECT max(location_id), count(*) FILTER (WHERE location_id >= 100000) FROM location;
```

**Migration for ticket 1.** Prisma 7.8 generated the first three lines from the modified schema on the scratch database. The last statement is added by hand. It starts the sequence at 100000, or one above the highest existing ID if an environment already holds a higher one, so the migration is safe even if the STG check is missed:

```sql
-- AlterTable
CREATE SEQUENCE location_location_id_seq;
ALTER TABLE "location" ALTER COLUMN "location_id" SET DEFAULT nextval('location_location_id_seq');
ALTER SEQUENCE location_location_id_seq OWNED BY "location"."location_id";
SELECT setval('location_location_id_seq', GREATEST(100000, (SELECT COALESCE(MAX(location_id), 0) + 1 FROM location)), false);
```

The spike ran the migration with a bare `RESTART WITH 100000` as its last line. After it was applied, `prisma migrate diff --from-config-datasource --to-schema <modified schema>` was empty, so there was no drift. A `setval` changes only the sequence's value, not its definition, so it should not add drift either, but ticket 1 must re-run `migrate diff` to confirm. The `setval` belongs in the migration only: do not `setval` from the seed.

### 4.2 Decision 2: protect UI-created courts from the deploy seed

1. **Freeze `locationData` for new courts (Q1).** Keep the 27, add no more, document in CLAUDE.md that UI courts are environment-local data. This is the only measure that removes c3.
2. **Reject an existing `(SNL, id)` pair at step 5 and again at confirm.** The seeded "101"–"127" references exist in every environment, so an ordinary uniqueness lookup covers them.
3. **Guards that can actually fail.** A test asserting that the realign list comes only from `locationData` would always pass, because `generateRealignSql()` and `generateLocationReferencesSql()` only ever read `locationData` (`generate-seed-sql.ts:46-51`, `:99-112`). The collision is between a new `locationData` entry and a row in some environment's database, and a unit test cannot see that row. So the guards are:
   - (a) **Freeze test (required).** A test in `apps/postgres/prisma/generate-seed-sql.test.ts` (or beside `libs/location/src/location-data.ts`) asserting that `locationData.locations` holds exactly IDs 1–27. Its failure message tells the developer to add the court through the UI instead. This turns the Q1 freeze into a CI check. Keep the band assertion as well: no `location_id` at or above the sequence start appears in the generated SQL.
   - (b) **Fail loudly (optional, tech lead to decide under Q1 and Q2).** The location realign skips rows with `location_id` at or above the sequence start. A colliding `locationData` name would then fail the deploy on `location_name_key` instead of quietly parking the UI court as `__realign_<id>`.

   The existing test at `:84-100` checks the shape of the realign but not where its values come from.
4. **Ask the tech lead whether the seed should stop re-pointing references (Q2).** Both alternatives were tested:

| Reference clause | UI court's (SNL,"128") | Seeded court 28's SNL ref | UI court's name |
|---|---|---|---|
| Current `DO UPDATE SET location_id = EXCLUDED.location_id` | **Moved to 28** | Takes over the UI row | Parked |
| Guarded `DO UPDATE … WHERE location_reference.location_id = EXCLUDED.location_id` | Stays on 100000 | **None, silently** | Parked |
| `DO NOTHING` | Stays on 100000 | **None, silently** | Parked |

Either change stops the takeover, but neither stops the name parking. Q2 is defence in depth; Q1 is the fix.

Two side effects seen during the experiment:
- After the takeover, the moved reference is a child of location 28, so deleting court 28 cascades and deletes the UI court's former reference (`location.prisma:91`).
- Renaming one of the 27 seeded courts through any UI is reverted on every deploy (relevant to Q8).

### 4.3 Decision 3: phase the CSV route out of adding courts, then decide whether to remove it
The aim is that no admin ever types a court ID again. The CSV route is reduced in steps, and removing it completely is decided at the end instead of now:

1. **Ticket 1 and ticket 2 (the journey).** New courts come from the UI and the sequence. Ticket 1's interim guard stops the CSV creating IDs in the sequence range (§4.1).
2. **S2: the CSV becomes update-only.** `validateLocationData()` rejects any `LOCATION_ID` that doesn't already exist, pointing the admin to "Add a court or tribunal". The CSV can no longer create courts.
3. **S1: amend a court through the UI.** Until this ships, the CSV is the only way to change an existing court's names, contact details or references, so it cannot be removed before then.
4. **Decide whether to remove the CSV upload completely.** Use the Q4 answer on bulk edits. If bulk edits are rare, remove `/reference-data-upload` and its download. If they are common, keep the update-only CSV for bulk edits.

Removing the route at step 1 would leave no way to amend a court or make bulk edits. The spec asks the report to say whether the CSV route is "retained alongside the new journey, deprecated, or restricted to update-only" (spec §3). This plan restricts it to update-only (step 2) and leaves deprecation to step 4.

### 4.4 Why not the others, in one line each
- **A:** the admin still invents the primary key, and a stale file silently reverts other courts.
- **B:** a nine-field page with two checkbox fieldsets and no check answers before a write to unique columns; kept only as a fallback.
- **D:** every new court needs a developer, a pull request and a release, the burden this issue exists to remove.
- **E:** removes the file but keeps every CSV defect, and is harder to use than uploading.
- **F:** depends on an upstream contract and a Welsh-name source that don't exist; it is a separate spike and would need C anyway.

### 4.5 Evidence: the experiments

**Method.**
- Two throwaway databases in the local docker `cath-postgres` (localhost:5433), migrated with `prisma migrate deploy` via `apps/postgres/prisma.config.ts`.
- Seed SQL from the real `generateSeedSql()`, called by a harness in `/tmp/spike-1078/` that adds the throwaway entry in memory. `location-data.ts` was never edited.
- Applied with `psql -v ON_ERROR_STOP=1`, the same file-based apply as `start.sh:104-105`.
- Both databases dropped afterwards. No code changes.

**Scenario 1, reproduced.**
- Setup: seeded, then inserted a court at 100000 ("Spike Newport Court" / "Llys Spike Casnewydd", email, contact number, region 1, sub-jurisdiction 2, references (SNL,"128") and (COMMON_PLATFORM,"X1"), a metadata row).
- Then applied the seed with a throwaway entry `{ locationId: 28, name: "Spike Newport Court", … }`. It exited 0 with no warning.

| | Before | After |
|---|---|---|
| 100000 name / Welsh name | Spike Newport Court / Llys Spike Casnewydd | **`__realign_100000` / `__realign_w_100000`** |
| Location 28 | absent | Spike Newport Court, email and contact NULL |
| (SNL,"128") | on 100000 (row `ui_ref_snl`) | **on 28** (same row ID; no `seedref_28` row) |
| (COMMON_PLATFORM,"X1") | on 100000 | on 100000 |
| 100000's email, contact, region, sub-jurisdiction, metadata | present | **survived** |
| Courts 1–27 | intact | intact |

- Re-running the seed left 100000 parked.
- The Q2 variant results are in §4.2.
- With no `locationData` addition, 100000 survived two seed runs unchanged (build scenario 6's expected result).
- Through the local `seedLocationData()` path, the same collision failed with P2002 `location_name_key` at `libs/location/src/seed-data.ts:79` (P1).

**Scenario 2, proven.**
1. Seeded, then applied the Prisma DDL plus `RESTART WITH 100000`. `migrate diff` was empty.
2. Seeded twice: 1–27 intact, nothing parked, `last_value` 100000 with `is_called` false.
3. `MAX + 1` = **28**.
4. Inserted the E2E bands with explicit IDs: fixtures 9001–9010 with SNL refs; CSV IDs 80000, 85123, 89999; about 260 random IDs in 90000–99999 including both bounds, with refs defaulting to the ID. The sequence did not move. `MAX + 1` = **100000**.
5. Two concurrent sessions × 100 inserts with no ID: IDs 100000–100199, all distinct, no errors.
6. Seeded twice more: 1–27 intact, nothing parked, nothing re-pointed, no non-UI row ≥ 100000. The next UI insert got 100200.
7. A CSV-style explicit 100201, then a UI insert: **`duplicate key value violates unique constraint "location_pkey"`**. A retry got 100202.

---

## 5. Validation parity: the 21 CSV rules

`validateLocationData()` (`libs/system-admin-pages/src/reference-data-upload/validation/validation.ts`) pushes 21 errors. Every one is an English template literal with `href: "#file"`. The parser's four extra checks (`csv-parser.ts:45-80`: parse error, missing headers, `LOCATION_ID` required, `LOCATION_ID` integer) are not among the 21, and all four disappear in C.

| # | CSV rule | Line | Group | Option C |
|---|---|---|---|---|
| 1 | `LOCATION_NAME` required | 17 | Required | Step 1, `#name` |
| 2 | `LOCATION_NAME` HTML tags | 22 | HTML | Step 1, same regex, `#name` |
| 3 | `WELSH_LOCATION_NAME` required | 29 | Required | Step 1, `#welshName` |
| 4 | `WELSH_LOCATION_NAME` HTML tags | 34 | HTML | Step 1, `#welshName` |
| 5 | `EMAIL` HTML tags | 41 | HTML | Step 2, `#email` (+ format check, spec §9.1) |
| 6 | `CONTACT_NO` HTML tags | 48 | HTML | Step 2, `#contactNo` (+ character set, spec §9.1) |
| 7 | `SUB_JURISDICTION_NAME` required | 55 | Required | Step 4, at least one checkbox, fieldset error |
| 8 | `REGION_NAME` required | 62 | Required | Step 3, at least one checkbox, fieldset error |
| 9 | Provenance triple required | 69 | Required | Step 5, all three fields |
| 10 | `PROVENANCE` required | 77 | Required | Step 5, `#provenance` |
| 11 | `PROVENANCE` not in allowed set | 82 | Closed vocabulary | Impossible via the UI; still checked on the server |
| 12 | `PROVENANCE_LOCATION_ID` required | 89 | Required | Step 5, `#provenanceLocationId` |
| 13 | `PROVENANCE_LOCATION_TYPE` required | 96 | Required | Step 5, `#provenanceLocationType` |
| 14 | `PROVENANCE_LOCATION_TYPE` not in allowed set | 101 | Closed vocabulary | Impossible via the UI; still checked on the server |
| 15 | Duplicate (provenance, ID) within the file | 136 | In-file duplicate | **Dropped deliberately** (no file); returns as a within-submission check if Q6 allows several references |
| 16 | Name used by several IDs within the file | 151 | In-file duplicate | **Dropped deliberately** (one court per submission) |
| 17 | Welsh name used by several IDs within the file | 163 | In-file duplicate | **Dropped deliberately** |
| 18 | Name already in the DB at another ID (case-insensitive) | 192 | DB duplicate | Step 1 check, re-run at confirm, P2002 on `name` → `#name` |
| 19 | Welsh name already in the DB at another ID | 212 | DB duplicate | Step 1 check, re-run at confirm, P2002 on `welsh_name` → `#welshName` |
| 20 | Sub-jurisdiction not found | 244 | Not found | Impossible via the UI (checkboxes come from the table); server rejects unknown IDs |
| 21 | Region not found | 275 | Not found | Impossible via the UI; server rejects unknown IDs |

**Reconciliation:** required 8 (rules 1, 3, 7, 8, 9, 10, 12, 13) + HTML 4 (2, 4, 5, 6) + closed vocabulary 2 (11, 14) + in-file duplicates 3 (15, 16, 17) + DB duplicates 2 (18, 19) + not found 2 (20, 21) = **21**. 18 have an equivalent; 3 are dropped on purpose; none is dropped silently.

Spec §9.5 has 19 rows because it folds rules 9, 10, 12 and 13 into one row and adds the parser's `LOCATION_ID` rule. It describes the same rules.

What C adds:
- A database check on (provenance, provenanceLocationId). In the CSV route a clash is a 500 (`reference-data-upload-summary/index.ts:125`).
- Bilingual, field-anchored errors.

Caveat: the case-insensitive checks are in the application, while the database unique index is case-sensitive. Two concurrent case-variant names could both pass. This is the same gap the existing journeys have, and the risk is low.

---

## 6. Open questions and risks

### 6.1 Questions, ready to send (none sent)

**Answers so far (developer, 2026-11-17):**
- **Q1:** freeze `location-data.ts` at the 27 courts: **yes**. Fail-loudly guard (b): **yes**. Renumber to legacy IDs first (#1533): **yes for now**, may change.
- **Q2:** the deploy seed must **never overwrite an existing provenance reference**. A clash **fails the deploy** (same approach as Q1 guard b), and only a person changes or removes a reference, through amend a court (#1534) or the update-only CSV (#1535). Ticket 1 (#1531) changes `generate-seed-sql.ts:111` accordingly.
- **Q3:** start the sequence at the **highest legacy CaTH production P&I ID plus a margin**, not 100000. The exact value waits for the legacy production export (#1533); if production matches staging (highest 389), a margin of 1000 gives a start of 1389. The migration still ends with `setval(GREATEST(<start>, MAX(location_id) + 1))`. Consequences for ticket 1 (#1531): the start is now **below** the E2E bands on STG (9001–9010, 80000–89999, 90000–99999), so the band test changes from "bands are below the start" to "the start is above the highest legacy ID and below 9001"; the sequence would only reach 9001 after about 7,600 UI-created courts. Old CaTH may still add courts until cutover, which the margin is there to absorb.
- **Q4:** courts are added **one at a time**. The one-question-per-page journey stands.
- **Q5:** a new court **starts as a draft**. This adds a draft flag, a publish step, and hiding drafts from the public A–Z and subscription search to ticket 2 (#1532), about 2 days.
- **Q6:** **several** provenance references per new court. After the first, an "Add another reference?" step lets the admin add more (for example SNL and Common Platform), as the CSV route allows. This adds a page and the within-submission duplicate check (report §5, rule 15) to ticket 2 (#1532), about 1 day.
- **Q7:** the **System Admin** supplies the Welsh name. Provenance references are **usually not known** when a court is created, so the reference step is **optional**: the admin can skip it and add references later through amend a court (#1534). Until a court has a reference, lists from upstream systems cannot be matched to it, so check answers and the success page should say so, and the draft state (Q5) gives time to add one before publishing. Ticket 2 (#1532): the reference step becomes skippable, and the "at least one reference" rule (§5, rule 9) is dropped.
- **Q11:** **radio buttons** (not a select) for provenance and type; **keep the tiles** on the `/reference-data` hub; the spec's hint texts **need checking by content design** before build.
- **Q8:** amend a court is **in scope** (#1534).
- **Q9:** extend the Q1 freeze to **regions, jurisdictions and sub-jurisdictions** in `location-data.ts`: a CI test fails if one is added there, so new ones only come from the admin pages. This removes the seed clash (`generate-seed-sql.ts:80`, `ON CONFLICT (region_id) DO UPDATE SET name`) without new sequences. It goes in ticket 1 (#1531). #1536 (sequences for these tables) was closed as not planned on 2026-11-18; the remaining concurrent-create race is accepted.
- **Q10:** the CSV route becomes **update-only** (#1535).
- **Q12:** **System Admin only**, matching legacy (`isPermittedSystemAdmin`) and this service (`requireRole([USER_ROLES.SYSTEM_ADMIN])`).

All of Q1–Q12 are answered.

**Tech lead (blocking the recommendation)**

> **Q1. Should `location-data.ts` be frozen for new courts once the UI ships?** CLAUDE.md calls it the single source of truth for locations, and a UI that creates courts makes a second source. The #1078 spike reproduced on a scratch database that a later `locationData` entry with a UI court's name renames the UI court to `__realign_<id>` on the next deploy, permanently, and can take its SNL reference (report §4.5). Proposal: keep the 27 seeded courts, add no new courts there, document the split in CLAUDE.md, and treat UI courts as environment-local. Agree, or another approach? To enforce it, a CI test would fail if `locationData` gains a 28th court. Optionally, the seed could also skip renaming rows at or above the sequence start, so that a collision fails the deploy loudly instead of quietly parking the UI court. Do you want that second guard? Related: the 27 seeded courts use different IDs from legacy CaTH for 26 of them (report §1.7). Should they be renumbered to their legacy IDs before go-live (draft ticket `draft-ticket-align-court-ids.md`), so that the freeze starts from IDs that match legacy?

> **Q2. Should the deploy seed stop re-pointing provenance references on conflict?** `generate-seed-sql.ts:111` (`ON CONFLICT (provenance, provenance_location_id) DO UPDATE SET location_id = EXCLUDED.location_id`) silently moves a UI court's (SNL,"128") to seeded location 28. The spike tested `DO NOTHING` and a guarded `DO UPDATE … WHERE location_reference.location_id = EXCLUDED.location_id`. Both keep the UI reference, but the seeded court silently gets none, and neither stops the name parking. Options: (a) one of those clauses, or (b) rely on Q1 alone. Also: are the synthetic `id + 100` SNL values (101–127) safe against real SNL venue IDs?

> **Q3. Is a sequence starting at 100000 right for `location_id`, or should it start higher?** `MAX + 1` returns 28 locally (the next `locationData` ID) and 100000 on STG-like data, because E2E tests fill 80000–99999. 100000 is disjoint from every current band, but the margin is one ID. Confirm 100000, or choose 1,000,000? A regression test will assert the bands either way. Nobody has yet checked whether STG already holds an ID at or above 100000: CSV uploads and test-support both accept any explicit ID. Could someone with STG access run `SELECT max(location_id), count(*) FILTER (WHERE location_id >= 100000) FROM location;`? If STG holds a higher ID, the migration starts one above it, but we should know before choosing the start.

**PO (blocking the recommendation)**

> **Q4. How often are courts added, and how many at a time? And how often are existing courts edited in bulk?** The seven-page journey assumes single figures per month. If it is dozens per week, or usually batches, a single page or the CSV route fits better. The bulk-edit answer decides step 4 of Decision 3: whether the update-only CSV is kept or removed.

> **Q5. Should a new court be public immediately, or start as a draft?** Without a draft state it appears in the public A–Z and subscription search on confirm. A draft state needs a column and a publish step, roughly 2 more days.

**Blocking the build**

> **Q6 (PO).** One provenance reference at creation, or "add another"? The CSV route allows several. "Add another" adds a page and about 1 day.

> **Q7 (PO / content).** Who supplies the unique Welsh name, and are provenance IDs known when the court is created? If either usually arrives later, step 1 blocks the journey, or step 5 must become optional.

> **Q8 (PO).** Is an "amend court" journey in scope? Outside the CSV route nothing can change a court's names, contact details or references. Renaming one of the 27 seeded courts through any UI is reverted on every deploy.

> **Q9 (tech lead).** Should the `MAX + 1` hazard for regions, jurisdictions and sub-jurisdictions be fixed separately? `createRegion()`, `createJurisdiction()`, `createSubJurisdiction()` and `createJurisdictionRecord()` hand out the next ID, which the next `locationData` entry can claim; the seed's `ON CONFLICT (…_id) DO UPDATE SET name` then renames the UI row.

> **Q10 (tech lead / PO).** Should the CSV route become update-only, rejecting unknown `LOCATION_ID`s? The spike showed an admin-chosen ID inside the sequence range breaks the next UI-created court.

> **Q11 (design).** Select or radios for provenance and type (four options each)? The spec shows `govukSelect`; GOV.UK prefers radios for short lists. The `/reference-data` hub renders tiles, not the spec's radios: keep tiles? Are the spec's hint texts backed by research?

> **Q12 (PO).** Is `SYSTEM_ADMIN` the only role that may add a court?

### 6.2 Risks

| Risk | Impact | Likelihood | Mitigation | Owner |
|---|---|---|---|---|
| A `locationData` name collides with a UI court | Court permanently parked as `__realign_<id>` (reproduced) | Medium, grows with every `locationData` edit | Q1 freeze, enforced by the IDs 1–27 freeze test; optionally the realign skips UI IDs (§4.2) | Tech lead |
| A `locationData` `id + 100` equals a UI court's SNL ID | Reference silently moved; publications go to the wrong court (reproduced) | Low–medium | Q1; Q2; step 5 check | Tech lead |
| CSV mints an ID inside the sequence range | Next UI create fails on `location_pkey` (reproduced) | Low | Interim CSV guard in ticket 1 (rejects unused IDs at or above the start; existing courts still update); S2 makes CSV update-only; confirm retries once, then errors | Tech lead / PO |
| STG already holds an ID at or above 100000 | First UI create fails on `location_pkey` | Unknown, not measured | STG query before ticket 1 merges; migration starts at `GREATEST(100000, MAX + 1)` | Tech lead |
| Test bands grow past 99999 | Collides with UI courts on STG | Low | Q3; regression test | Tech lead |
| Two sources of truth diverge | Court on STG but not locally | Medium | Document in CLAUDE.md | Tech lead |
| Welsh name or provenance ID unavailable at creation | Journey cannot be completed | Medium | Q7 before build | PO / content |
| Bulk volume higher than assumed | Feature unused | Low–medium | Q4; B fallback | PO |
| F later proves the strategic answer | C becomes interim | Low | C is a prerequisite for any sync | PO |
| Seeded court IDs differ from legacy CaTH IDs | If legacy courts are later loaded with their IDs, the seed renames them and their lists show under the wrong court | Medium, only if legacy data is migrated | Renumber the seeded courts before go-live (draft ticket; `legacy-court-mapping.md`, re-checked against legacy production) | Tech lead |
| Concurrent case-variant names | Two courts differing only in case | Low | Accept, or add a `lower(name)` unique index in ticket 1 | Tech lead |

---

## 7. Proposed follow-on tickets

### 7.1 Build tickets for Option C

| # | Title | Size | Depends on |
|---|---|---|---|
| 1 (#1531) | Court maintenance: location ID sequence, service and seed guards | 2 d | Q1, Q3 |
| 2 (#1532) | Add a court or tribunal journey: seven pages, hub entry and E2E, plus a draft state (Q5) and "add another" references (Q6) | 7.5–9 d | 1, Q6, Q11 |
| | **Total** | **9.5–11 d** (including the Q5 draft state and Q6 "add another") | |

"Spec §n" below means the `/spec` comment on #1078, attached by reference.

#### Ticket 1: Court maintenance: location ID sequence, service and seed guards

**Summary.** Give `location.location_id` a sequence starting at 100000, and add the `court-maintenance` service that creates one court in one transaction. Spike: #1078, report §4.

**Scope**
- `location.prisma`: `locationId Int @id @default(autoincrement()) @map("location_id")`.
- **Prerequisite:** run `SELECT max(location_id), count(*) FILTER (WHERE location_id >= 100000) FROM location;` on STG and record the result here (§4.1, Q3).
- Migration `apps/postgres/prisma/migrations/<ts>_add_location_id_sequence/migration.sql` via `yarn db:migrate:dev`, ending with `SELECT setval('location_location_id_seq', GREATEST(100000, (SELECT COALESCE(MAX(location_id), 0) + 1 FROM location)), false);` (or the Q3 start) rather than a bare `RESTART`. Re-run `migrate diff` and confirm it is still empty. No `setval` in the seed.
- `libs/system-admin-pages/src/court-maintenance/service.ts`: `validateCourtNames()`, `validateProvenanceReference()`, `createCourt()`, returning field error keys (for example `{ field: "name", key: "nameDuplicate" }`).
- `queries.ts`: case-insensitive lookups; one `prisma.$transaction` that creates `location` (no ID), `location_region`, `location_sub_jurisdiction` and `location_reference`. Create only, no `deleteMany`.
- P2002 mapping by `meta.target`: name, welsh_name and (provenance, provenance_location_id) become field errors; `location_pkey` gets one retry, then an error.
- `AuditLogAction.ADD_COURT = "Add court"` in `logger.ts`. Export the service from `libs/system-admin-pages/src/index.ts`.
- Interim CSV guard: `validateLocationData()` (`libs/system-admin-pages/src/reference-data-upload/validation/validation.ts:7`) rejects any `LOCATION_ID` at or above the sequence start that does not already exist in `location` (one `findMany` on those IDs), with a message pointing to "Add a court or tribunal". Existing courts in that range, including UI-created ones, must still update, so a full download can be re-uploaded (§4.1). S2 later replaces this with the full update-only rule.
- Freeze test: `locationData.locations` holds exactly IDs 1–27, failing with a message that points to the UI (§4.2 guard a).
- `generate-seed-sql.test.ts`: `max(locationData id)`, `max + 100` and 99999 are below the sequence start.
- If the tech lead chooses §4.2 guard b under Q1 or Q2: the location realign skips rows at or above the sequence start.
- Existing explicit-ID writers (seed, test-support, `upsertLocations()`) still compile and pass.

**Out of scope:** pages; changing the seed's reference clause (Q2).

**Scenarios**
- *UI court survives a deploy (build scenario 6).* Given a court ≥ 100000 with mappings and references, when the seed runs twice, then nothing about it changes.
- *Bands stay disjoint.* The band assertions hold.
- *Seed file frozen.* Adding a 28th entry to `locationData` fails CI.
- *CSV cannot mint sequence IDs.* A CSV row with an unused `LOCATION_ID` 100201 is rejected at validation, and nothing is written.
- *CSV can still update UI courts.* Given a UI-created court 100000, a CSV row with `LOCATION_ID` 100000 is accepted and updates it. Re-uploading an unedited full download succeeds.
- *Duplicate caught at confirm (build scenario 7).* A P2002 becomes a field error; nothing is written; no audit metadata is set; the session is kept.
- *Atomicity.* If the reference insert fails, no rows remain.

**Spec:** §2, §6.2, §6.5, §6.6, §9.3, §9.4, §13.2, §13.6. **Size:** 2 d.

#### Ticket 2: Add a court or tribunal journey

**Summary.** The seven-page "Add a court or tribunal" journey in `apps/web/src/pages/(system-admin)/`, on top of ticket 1's service. It ships as one ticket because the pages are not usable apart. Without check answers, the hub entry would lead into a journey that cannot save. It can still be reviewed as several PRs behind the hub entry, which is added last.

**Scope**
- **Common to every page:** `index.ts` (`GET`/`POST` `RequestHandler[]` behind `requireRole([USER_ROLES.SYSTEM_ADMIN])`), `index.njk`, `en.ts`, `cy.ts`, `index.test.ts` and `index.njk.test.ts`. Every step after the first redirects to step 1 when the `addCourt` session is missing. `?change=true` returns to check answers.
- **Session:** `addCourt` and `addCourtSuccess` in `apps/web/src/session.ts`.
- **`add-court-name/` and `add-court-contact-details/`:** trim and collapse whitespace; `HTML_TAG_REGEX` on all four fields; empty email and contact number stored as null.
- **`add-court-regions/` and `add-court-sub-jurisdictions/`:** from `listRegions()` and, grouped, `listJurisdictionsWithSubJurisdictions()`. A single tick posts a string and must be coerced to an array. Unknown IDs are rejected.
- **`add-court-provenance-reference/`:** provenance, ID and type (select or radios per Q11; values from `LOCATION_REFERENCE_PROVENANCES` and `LOCATION_REFERENCE_TYPES`). Database uniqueness check on (provenance, provenanceLocationId). "Add another" only if Q6 says so.
- **`add-court-check-answers/`:** summary list with Change links. The `POST` re-validates and calls `createCourt()`, then sets `req.auditMetadata = { shouldLog: true, action: AuditLogAction.ADD_COURT, entityInfo: "Name: …, Location ID: …" }`, as `add-region` does.
- **`add-court-success/`:** panel with the court name and ID; clears `addCourt`.
- **Hub entry (last):** a fifth "Add a court or tribunal" entry in `reference-data/en.ts` and `cy.ts` `options` (the hub renders tiles).
- **E2E:** two Playwright journeys in `e2e-tests/tests/`, with prefixed names and provenance IDs so teardown removes them.

**Scenarios**
- *Deep link (build scenario 8).* With no session, any step after step 1 redirects to step 1.
- *Duplicate names.* A duplicate in any case links to `#name` / `#welshName`, and the other answers are kept.
- *Markup.* `<script>` gives a field error.
- *Empty selection.* Nothing ticked on regions or sub-jurisdictions gives a fieldset error, and the admin cannot proceed.
- *Tampered POST.* An unknown region ID, or a provenance or type outside the vocabulary, is rejected on the server.
- *Duplicate reference.* (SNL,"104") links to `#provenanceLocationId`; nothing is written.
- *Welsh.* With `?lng=cy` everything is Welsh, and the `en`/`cy` keys match.
- *A System Admin adds a court (build scenario 4, @nightly).* Dashboard → `/reference-data` → step 1. On the way:
  - submit empty, then a duplicate name, and check the summary links;
  - switch to Welsh on an error;
  - run axe on step 1's error state and on check answers;
  - skip contact details;
  - submit regions with nothing ticked;
  - follow a Change link back;
  - confirm with the keyboard.

  Then the panel shows the ID, the court is in the public A–Z in English and Welsh, and `ADD_COURT` is in `/audit-log-list`. Teardown removes the court.
- *Unauthorised user refused (build scenario 5, @nightly).* Without `SYSTEM_ADMIN`, `GET` step 1 and `POST` check answers are refused, and nothing is written.
- *Resubmission (build scenario 8).* After success, a re-POST redirects to step 1 and writes nothing. The success page with no data redirects to `/reference-data`.
- *Concurrent duplicate.* A P2002 at confirm renders on check answers with a link to the step, not a 500.

**Spec:** §3 (Option C criteria), §4.3, §4.4, §5.1–5.9, §6.3, §6.4, §6.6, §7.1–7.8, §9.1–9.4, §10.1–10.6, §11, §12, §13.3–13.5. **Size:** 4.5–6 d. **Depends on:** ticket 1, Q6, Q11.

### 7.2 Sibling tickets

**S1: Amend a court.** Change a court's names, contact details and references without a CSV, reusing C's pages in change mode and its service. Must handle the 27 seeded courts, whose renames are reverted on every deploy: block renaming them, or resolve Q1 first. Depends on tickets 1 and 2, and Q8. Roughly 3–4 d.

**S2: Make the reference-data CSV upload update-only.** Replaces ticket 1's interim guard. `validateLocationData()` rejects an unknown `LOCATION_ID` with a bilingual message pointing to "Add a court or tribunal". Why: an admin-chosen ID inside the sequence range breaks the next UI create (report §4.5).
- Scenarios: an unknown ID is rejected with a row-numbered error; updates to existing courts still work.
- `e2e-tests/utils/location-csv.ts` must create its courts through test-support first.
- Also add a database check on (provenance, provenanceLocationId), so a clash is a validation error rather than a 500.
- Depends on ticket 2 and Q10. About 1 d.

**S3: Discovery spike: syncing courts from an upstream source.** Can SNL, Common Platform or another source supply names, Welsh names, references and closures? Who owns the contract? What reconciliation policy is needed without soft delete? Output: a report like this one. Time-boxed to 3 d.

**S4: Fix `MAX + 1` allocation for regions, jurisdictions and sub-jurisdictions.** `createRegion()`, `createJurisdiction()`, `createSubJurisdiction()` and `createJurisdictionRecord()` hand out IDs the next `locationData` entry can claim; the seed then renames the UI row (`generate-seed-sql.ts:78-91`). Apply ticket 1's sequence approach to all three tables and merge the two implementations.
- Scenarios: a UI region survives a deploy that adds a `locationData` region; concurrent creates get distinct IDs.
- Depends on Q9. About 2 d.

---

## 8. Review against the plan's checklist (scenario 3)

| Check (plan §5.2) | Where | Result |
|---|---|---|
| Six options with pros, cons and effort | §2, §3 | Yes (F "not estimable") |
| Exactly one recommendation | Top box, §4 | Option C |
| Decisions 1–3 with evidence | §4.1–4.3, §4.5 | Yes; both experiments ran on a database |
| Disjointness proof incl. E2E bands | §4.1 | Yes, incl. 9001–9010 |
| 21 parity rules reconciled | §5 | 8+4+2+3+2+2 = 21, with line numbers |
| CSV route's future stated | §4.3 | Retained for bulk; update-only (S2) |
| Questions assigned to owners | §6 | Q1–Q12 each have an owner |
| Follow-on tickets listed | §7 | 2 build + 4 sibling, with draft bodies |
| One-line rejection for A, B, D, E, F | §4.4 | Yes |
| Every option scored against the five constraints | §2 | Columns c1–c5 |

Gaps closed during review:
- added constraint columns to the matrix;
- added P1–P9;
- added the CSV-minted-ID collision to Decision 1, Decision 3, the risks and S2;
- added the Q2 variant evidence;
- corrected the c5 wording and the C estimate.

Revised after the review in `review.md`, which raised three high-priority issues:
- **STG not measured:** added the STG query as a ticket 1 prerequisite and to Q3. The migration now ends with `setval(GREATEST(100000, MAX + 1))` instead of a bare `RESTART` (§4.1, ticket 1, §6.2).
- **Seed test could not fail:** replaced the "realign comes only from `locationData`" test, which always passes, with a freeze test on IDs 1–27. Added an optional fail-loudly realign guard for the tech lead to decide on under Q1 (§4.2, ticket 1, Q1, §6.2).
- **CSV gap before S2:** added an interim guard to ticket 1 that rejects CSV `LOCATION_ID`s at or above the sequence start (§4.1, ticket 1, S2, §6.2, recommendation box).

Revised after the second review: the interim guard as first written rejected *every* ID at or above the start, including UI-created courts, which would break re-uploading a full download. It now rejects only IDs in that range that do not already exist, and ticket 1 gains a scenario showing that existing UI courts still update (§4.1, ticket 1, risks, recommendation box).

Revised on 2026-11-17, after discussion with the developer:
- **Tickets 2–5 merged** into one journey ticket (ticket 2), because the pages cannot ship usefully apart (§7.1).
- **Decision 3 rewritten as a phased plan:** journey, then S2, then S1, then decide whether to remove the CSV completely, using Q4 (§4.3).
- **Legacy CaTH (PIP) section added** (§1.7). It records that no add-a-court page ever existed.

Revised after the third review: Q1 option B now requires a reviewed legacy-to-seeded court mapping, an upsert rather than a replace of `location`, and a `setval(GREATEST(...))` at the end of the load (22 of the 27 seeded courts have a different legacy ID). Q4 now also asks about bulk edits. Three citations were corrected: §6 not §4, the partly-translated legacy pages, and the spec §3 wording.

Revised on 2026-11-17 with a legacy staging export: added Q1 options D (renumber the seeded courts to legacy IDs) and E (stop the seed writing courts); corrected the SJP claim (legacy data has SJP at 9, not 0); recorded the 27-court comparison in `legacy-court-mapping.md`.

Revised on 2026-11-17 at the developer's request: removed every dependency on the `vibe-653` branch, which is a different piece of work. Q1's loading options (A–E), the migration-conflict paragraph and its risk row are gone. The legacy ID comparison and the renumbering draft stay, as a standalone pre-go-live question in Q1.

Raised on 2026-11-17: Q1–Q12 posted on #1078; ticket 1 is #1531, ticket 2 is #1532, S1 #1534, S2 #1535, S3 #1537, S4 #1536 (closed, not planned, after Q9), and "Align seeded court IDs with legacy CaTH" is #1533.

Needs a person: sending Q1–Q12, raising and attaching the tickets, and tech lead and PO sign-off before #1078 is closed. If Q4 or Q5 changes the answer, revisit §2 and §4.