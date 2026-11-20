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
> regions, sub-jurisdictions, provenance references with "add another", check answers, confirmation) in
> `apps/web/src/pages/(system-admin)/`, backed by a new `court-maintenance` service in
> `libs/system-admin-pages` that writes one court in one transaction. It depends on three decisions:
>
> 1. **Allocate `location_id` from a Postgres sequence that starts one above the highest legacy
>    CaTH production court ID** (not `MAX + 1`, not autoincrement from 1). Any load of legacy courts
>    ends by moving the sequence above the highest loaded ID (Q3, §4.1).
> 2. **Protect UI-created courts from the deploy seed** by freezing `location-data.ts` (courts,
>    regions, jurisdictions and sub-jurisdictions), enforcing that with a CI test, and making the
>    seed fail the deploy rather than park a court or re-point a provenance reference (Q1, Q2, Q9).
> 3. **Keep the CSV route for bulk edits and make it update-only** in a follow-on ticket, so it can
>    no longer mint primary keys. Until then, ticket 1 rejects unused CSV IDs that the sequence could still hand out.
>
> Estimated at 8 to 9.5 dev-days across two build tickets, including "add another" references
> (Q6) (§7). Options A, B, D, E and F are rejected, each with a one-line
> reason in §4.4. The follow-on tickets are described in §7 only; none is raised from the spike.

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

E2E runs against STG and against a fresh per-PR preview database (`.github/workflows/workflow.preview.yml:83-89`; one database per release, `helm/cath-service/values.preview.template.yaml:197-202`). On STG, `MAX(location_id)` sits in the 9xxxx band. On the scratch database with these bands populated, `MAX + 1` returned **100000** (§4.5).

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
| P8 | C effort 5–8 d | Plan's own ticket sizes sum to 6.5–8 d | Report used 6.5–8 d; after Q6 and the CSV E2E change it is 8–9.5 d (§7.1) |
| P9 | `"location_location_id_seq"` | Prisma emits it unquoted | Equivalent |

### 1.7 Legacy CaTH (PIP) had no add-a-court page either

The old service (`hmcts/pip-frontend` and `hmcts/pip-data-management`, read on GitHub) also added courts only by CSV round-trip:
- **Journey.** `/manual-reference-data-download`, then `/reference-data-upload`, then `/reference-data-upload-summary`, then `/reference-data-upload-confirmation`. All four sit behind `isPermittedSystemAdmin` (`pip-frontend` `src/main/routes/routes.ts:844-875`). The summary and confirmation pages had Welsh locale files, though some strings in them ("Change", "File", "Confirm", "Your file has been uploaded") were still English. Today's pages hard-code English throughout (§1.1, P7).
- **Write.** `POST /locations/upload` (`pip-data-management` `LocationController.java:105-113`) runs `LocationService.uploadLocations()` (`:159-192`). The `P&I ID` column is the primary key (`Location.java:37-39`, `@Id Integer locationId` with no generator), so the admin chose the ID there too. An existing ID was overwritten, including its references, and nothing was deleted.
- **Validation.** Duplicate English or Welsh names, against the database and within the file (`:317-350`), and HTML tags in names (`:301-315`). Regions and jurisdictions were free-text `text[]` columns, so there was no "not found" check.
- **No seed.** There was no `location-data.ts` equivalent that renamed rows on deploy, so constraints c3 and c4 are new in this service.

So no create journey has ever existed. Option C is new in both systems, and the new service ported the old CSV design almost one-for-one.

**Seeded and legacy court IDs differ.** A legacy staging reference-data export (2026-11-17; 367 courts, P&I IDs 1–389, none at or above 100000) was compared with the 27 seeded courts in `docs/tickets/1078/legacy-court-mapping.md`. Only Single Justice Procedure has the same ID in both (9). 22 exist in legacy under a different ID (for example Royal Courts of Justice is 109 in legacy and 4 here), 3 have no legacy match, Rolls Building is legacy 111, and 19 seeded IDs belong to a different court in legacy (legacy 7 is Liverpool Social Security and Child Support Tribunal; seeded 7 is Bristol Civil and Family Justice Centre). If legacy courts are ever brought into this service with their IDs, the deploy seed would rename most of them (c3). Renumbering the seeded courts to their legacy IDs before go-live avoids that; it is follow-on S4 (§7.2, Q1).

---

## 2. Options matrix

Effort is in dev-days including tests. Constraint scoring: ✗ = unsolved or worse, ~ = partly handled, ✓ = handled.

| # | Option | Pros | Cons | Effort | c1 | c2 | c3 | c4 | c5 | Verdict |
|---|---|---|---|---|---|---|---|---|---|---|
| A | Keep CSV round-trip | No cost; live and tested; good for bulk | Admin invents the PK; stale file reverts others' work; all 21 errors point at `#file` (WCAG 3.3.1/3.3.3); audit records a file name; provenance clash is a 500 | 0 | ✗ | ~ | ✗ | ✗ | ✗ | Rejected |
| B | Single page, about nine inputs | Cheapest real journey; same shape as `add-region` | Breaks one-thing-per-page with two multi-select fieldsets and two closed vocabularies; no check answers before a write to unique columns; hard error recovery | 2–3 + ticket 1 | ✓ | ✓ | ✓* | ✓* | ✓ | Fallback; shares C's service |
| C | One question per page → check answers → confirmation | Standard GOV.UK pattern; field-linked errors; review gate; reuses building blocks; per-court create-only write; extends to amend | Eight pages to build, translate and test; session state and deep-link guard; slower for bulk | 8–9.5 (incl. "add another", Q6) | ✓ | ✓ | ✓* | ✓* | ✓ | **Recommended** |
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

**Verdict:** fallback only. Q4 says courts are added one at a time, so it is not needed.

### 3.3 C: one question per page (recommended)
The pages are `add-court-name`, `add-court-contact-details`, `add-court-regions`, `add-court-sub-jurisdictions`, `add-court-provenance-reference` (optional, Q7), `add-court-add-another-reference` (Q6), `add-court-check-answers` and `add-court-success`. The spec (§4.3, §5, §6) has seven; the answers to Q6 and Q7 add the eighth. A court is public as soon as it is confirmed (no draft state, §6.1 Q5).
- Each page validates its own fields, with errors linked to the field.
- Check answers re-validates uniqueness and does one create-only transaction.
- It is bilingual from the start, and each piece has a precedent in the same directory (§1.2).

It costs more than B: eight pages, a session namespace and deep-link guards.

**Verdict:** recommended (§4).

### 3.4 D: developer edits `location-data.ts`
This is how the 27 seeded courts got there: one reviewed source of truth that reaches every environment. But every new court needs a developer, a pull request and a release. It can only set the names, regions, sub-jurisdictions, caution messages and one synthetic SNL `id + 100` reference. It cannot set email, contact number or real provenance IDs (`generate-seed-sql.ts:93-112`).

**Verdict:** rejected as the primary route. Under Q1, `location-data.ts` is frozen at the 27 seeded courts.

### 3.5 E: paste CSV into a textarea
It reuses `parseCsv()` and `validateLocationData()` and takes half a day. It keeps the invented PK, the whole-file rewrite, the `#file` anchors and the 500 on a provenance clash. Typing CSV by hand is harder and less accessible than uploading a file.

**Verdict:** rejected.

### 3.6 F: upstream sync
There is no upstream contract, and the owning team sits outside CaTH. It needs a reconciliation policy even though locations have no soft delete. Unique Welsh names (c2) are unlikely upstream. Any sync still needs a per-court create path and an ID strategy, which is what C builds.

**Verdict:** separate discovery spike (S3).

---

## 4. The recommendation: Option C and three supporting decisions

### 4.1 Decision 1: allocate `location_id` from a sequence starting one above the highest legacy ID

| Strategy | Analysis | Verdict |
|---|---|---|
| `MAX + 1` (existing precedent) | Returns **28** on a fresh local DB, the next `locationData` ID, so the next deploy renames the UI court (c3). Returns **100000** on STG-like data, next to random test-support IDs. Races without a lock; `LOCK TABLE` serialises writes but gives the same IDs | Rejected for location. The precedent only works for regions and jurisdictions because they have no test bands, and it already carries the seed hazard there (Q9) |
| `@default(autoincrement())` from 1 | Hands out `locationData` IDs; the first UI court is renamed on the next deploy | Rejected |
| Sequence START 100000 | Disjoint from every E2E band, but leaves a gap of about 99,600 unused IDs above legacy CaTH's highest court, for no benefit in production (Q3) | Rejected after Q3 |
| **Sequence START highest legacy production P&I ID + 1** | Never hands out an ID that a legacy court holds. `nextval` is atomic. Explicit-ID writers bypass the default and never advance it | **Chosen** (Q3), with a regression test |

**Why + 1, and why no margin.** A Postgres sequence's start value is the first ID it hands out, so starting *at* the highest legacy ID would give the first UI court the same ID as that legacy court. Old CaTH may still add courts until cutover. Rather than guess a margin to absorb them, every load of legacy courts ends with the same `setval` as the migration (below), so the sequence always restarts above whatever was loaded. This holds as long as legacy courts are loaded before any court is created through the UI in that environment. There is no production deployment yet (CLAUDE.md, item 7), so in production the order is: load legacy courts, then open the journey.

**The start value.** Legacy staging's highest P&I ID is 389 (`legacy-court-mapping.md`), which would give a start of **390**. Old CaTH admins chose IDs per environment, so ticket 1 takes the value from the legacy **production** export (S4) and records it in the migration.

**Disjointness proof.** The sequence's live value is `GREATEST(start, MAX(location_id) + 1)` in every environment, so it only hands out IDs above every row that existed when the migration (or a legacy load) ran.

| Writer | IDs | Below the start? |
|---|---|---|
| `generateLocationsSql()` / `seedLocationData()` | 1–27 | Yes (frozen, §4.2) |
| Legacy courts | 1 to the highest legacy ID | Yes, by definition of the start |
| `generateLocationReferencesSql()` | provenance "101"–"127" (a different column) | Not applicable |
| E2E fixtures | 9001–9010 | No, see below |
| CSV E2E | 80000–89999 | No, see below |
| test-support POST | `randomInt(90000, 100000)` (upper bound exclusive) | No, see below |

The `+100` values live in `location_reference.provenance_location_id`, not `location_id`, so they matter to Decision 2 rather than here.

**The E2E bands sit above the start.** They only exist where E2E runs: STG, per-PR preview databases and local databases. On STG they are already in the table when the migration runs, so `MAX + 1` puts the live value at about 100000 and the sequence starts there, as it would have under the old proposal. A preview database is new for each PR, so the migration runs before any E2E data exists and the sequence starts at the legacy value, below the bands. In production there are no test bands, so the sequence starts at the legacy value. Locally, a freshly seeded database starts the sequence at the legacy start, below the bands. It would only reach 9001 after about 8,600 UI-created courts, so in practice the bands cannot collide. Ticket 1's regression test asserts that `max(locationData id)` is below the start, and that the start is above the highest legacy production ID.

**The CSV route** accepts any integer. An admin-chosen ID above the sequence's live value makes the next `nextval` fail on `location_pkey` when the sequence reaches it (reproduced). One retry only gets past a single occupied ID. So ticket 1 adds an interim guard: the CSV route rejects any `LOCATION_ID` **at or above the sequence's live value** (read with `SELECT last_value, is_called FROM location_location_id_seq`; the next ID is `last_value` if `is_called` is false, otherwise `last_value + 1`, and Prisma returns `last_value` as a `BigInt`) **that does not already exist in `location`**, from the same release that adds the sequence. The guard uses the live value, not the configured start: IDs below the live value are never handed out again, so they cannot collide. On STG the live value is about 100000, so the CSV E2E tests' 80000–89999 IDs would pass, but on a per-PR preview database it is about 390, so the guard would reject them on every PR. Ticket 1 therefore changes `e2e-tests/utils/location-csv.ts` to create its courts through test-support first and use the CSV only to update them, in the same PR as the guard. Existing IDs must still be accepted: the download exports every location (`download-service.ts:6-8`, `findMany` with no filter), and until S1 ships the CSV route is the only way to amend a UI-created court. The check is one `findMany({ where: { locationId: { in: idsAtOrAboveLiveValue } } })`, the same lookup S2 needs. Decision 3 (S2) then makes the CSV route fully update-only. Confirm still maps a `location_pkey` P2002 to one retry, then an error, as a last line of defence.

**Migration for ticket 1.** Prisma 7.8 generated the first three lines from the modified schema on the scratch database. The last statement is added by hand. It starts the sequence at the legacy start, or one above the highest existing ID if an environment already holds a higher one (STG), so no environment needs measuring first:

```sql
-- AlterTable
CREATE SEQUENCE location_location_id_seq;
ALTER TABLE "location" ALTER COLUMN "location_id" SET DEFAULT nextval('location_location_id_seq');
ALTER SEQUENCE location_location_id_seq OWNED BY "location"."location_id";
SELECT setval('location_location_id_seq', GREATEST(<legacy start>, (SELECT COALESCE(MAX(location_id), 0) + 1 FROM location)), false);
```

Any later load of legacy courts ends with the same `setval`, with the sequence's current next value added to the `GREATEST`. Courts are hard-deleted, so `MAX + 1` alone could move the sequence backwards and re-issue a deleted court's ID. The spike ran the migration with a bare `RESTART WITH 100000` as its last line. After it was applied, `prisma migrate diff --from-config-datasource --to-schema <modified schema>` was empty, so there was no drift. A `setval` changes only the sequence's value, not its definition, so it should not add drift either, but ticket 1 must re-run `migrate diff` to confirm. The start value does not change the experiments in §4.5: they show how a sequence behaves next to explicit-ID writers, which is the same at 390 or 100000. Do not `setval` from the deploy seed.

### 4.2 Decision 2: protect UI-created courts from the deploy seed

1. **Freeze `locationData` (Q1, Q9).** Keep the 27 courts and the current regions, jurisdictions and sub-jurisdictions, and add no more. Update CLAUDE.md item 7, which today tells developers to add locations to `location-data.ts`, to say that courts and the reference data under them are now added through the admin pages and are environment-local. This is the only measure that removes c3.
2. **Reject an existing `(SNL, id)` pair at step 5 and again at confirm.** The seeded "101"–"127" references exist in every environment, so an ordinary uniqueness lookup covers them.
3. **Guards that can actually fail.** A test asserting that the realign list comes only from `locationData` would always pass, because `generateRealignSql()` and `generateLocationReferencesSql()` only ever read `locationData` (`generate-seed-sql.ts:46-51`, `:99-112`). The collision is between a new `locationData` entry and a row in some environment's database, and a unit test cannot see that row. So the guards are:
   - (a) **Freeze test (required, Q1 and Q9).** A test in `apps/postgres/prisma/generate-seed-sql.test.ts` (or beside `libs/location/src/location-data.ts`) asserting the exact set of court IDs (1–27 today) and the exact sets of region, jurisdiction and sub-jurisdiction IDs. Its failure message tells the developer to add the entry through the admin pages instead. Assert the set as it stands, not a hard-coded 1–27, so the test is updated in the same PR if S4 renumbers the seeded courts. Keep the band assertion as well: every `location_id` in the generated SQL is below the sequence start.
   - (b) **Fail loudly (required, Q1).** The location realign only renames rows whose `location_id` is one of `locationData`'s own IDs. Any other row with a colliding name (a UI or legacy court) is left alone, so the insert fails the deploy on `location_name_key` instead of quietly parking that court as `__realign_<id>`. This also stops the seed parking the old seeded rows when S4 renumbers them, so S4 moves its own rows (§7.2).

   The existing test at `:84-100` checks the shape of the realign but not where its values come from.
4. **Stop the seed re-pointing references, and fail the deploy on a clash (Q2).** The seed re-inserts its own `seedref_<id>` rows on every deploy (`generate-seed-sql.ts:105`), so a plain `INSERT` with no `ON CONFLICT` would fail every deploy, not just a clash. Instead, before the reference insert, the generated SQL runs a `DO` block that raises an exception if any of the seed's `(provenance, provenance_location_id)` pairs already belongs to a different `location_id`. The insert then uses the guarded clause below, which is a no-op for the seed's own rows. The seed runs as one transaction (`BEGIN` at `generate-seed-sql.ts:20`, `COMMIT` at `:63`, applied by `start.sh:105`), so the exception rolls the whole seed back and the postgres deploy pod fails. That is the intended effect: the deploy stays red until a person moves or removes the reference through amend a court (S1) or the CSV (S2), and no data is changed silently. Both clauses the spike tested are below; on their own, each skips the clash silently, which is why the `DO` block is needed:

| Reference clause | UI court's (SNL,"128") | Seeded court 28's SNL ref | UI court's name |
|---|---|---|---|
| Current `DO UPDATE SET location_id = EXCLUDED.location_id` | **Moved to 28** | Takes over the UI row | Parked |
| Guarded `DO UPDATE … WHERE location_reference.location_id = EXCLUDED.location_id` | Stays on 100000 | **None, silently** | Parked |
| `DO NOTHING` | Stays on 100000 | **None, silently** | Parked |

Either clause stops the takeover, but neither stops the name parking or reports the clash. Guard (b) and the `DO` block make both hazards fail the deploy; the Q1 freeze stops them arising in the first place.

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
| 9 | Provenance triple required | 69 | Required | Step 5 is **optional** (Q7): the admin can skip it, but a reference that is started needs all three fields. Check answers and the success page say that upstream lists cannot be matched until a reference is added |
| 10 | `PROVENANCE` required | 77 | Required | Step 5, `#provenance` |
| 11 | `PROVENANCE` not in allowed set | 82 | Closed vocabulary | Impossible via the UI; still checked on the server |
| 12 | `PROVENANCE_LOCATION_ID` required | 89 | Required | Step 5, `#provenanceLocationId` |
| 13 | `PROVENANCE_LOCATION_TYPE` required | 96 | Required | Step 5, `#provenanceLocationType` |
| 14 | `PROVENANCE_LOCATION_TYPE` not in allowed set | 101 | Closed vocabulary | Impossible via the UI; still checked on the server |
| 15 | Duplicate (provenance, ID) within the file | 136 | In-file duplicate | Within-submission check across the references added on the "Add another reference?" loop (Q6), `#provenanceLocationId` |
| 16 | Name used by several IDs within the file | 151 | In-file duplicate | **Dropped deliberately** (one court per submission) |
| 17 | Welsh name used by several IDs within the file | 163 | In-file duplicate | **Dropped deliberately** |
| 18 | Name already in the DB at another ID (case-insensitive) | 192 | DB duplicate | Step 1 check, re-run at confirm, P2002 on `name` → `#name` |
| 19 | Welsh name already in the DB at another ID | 212 | DB duplicate | Step 1 check, re-run at confirm, P2002 on `welsh_name` → `#welshName` |
| 20 | Sub-jurisdiction not found | 244 | Not found | Impossible via the UI (checkboxes come from the table); server rejects unknown IDs |
| 21 | Region not found | 275 | Not found | Impossible via the UI; server rejects unknown IDs |

**Reconciliation:** required 8 (rules 1, 3, 7, 8, 9, 10, 12, 13) + HTML 4 (2, 4, 5, 6) + closed vocabulary 2 (11, 14) + in-file duplicates 3 (15, 16, 17) + DB duplicates 2 (18, 19) + not found 2 (20, 21) = **21**. 19 have an equivalent (rule 9 now applies only to a reference that is started, Q7); 2 are dropped on purpose (16, 17); none is dropped silently.

Spec §9.5 has 19 rows because it folds rules 9, 10, 12 and 13 into one row and adds the parser's `LOCATION_ID` rule. It describes the same rules.

What C adds:
- A database check on (provenance, provenanceLocationId). In the CSV route a clash is a 500 (`reference-data-upload-summary/index.ts:125`).
- Bilingual, field-anchored errors.

Caveat: the case-insensitive checks are in the application, while the database unique index is case-sensitive. Two concurrent case-variant names could both pass. This is the same gap the existing journeys have, and the risk is low.

---

## 6. Open questions and risks

### 6.1 Questions and answers

Q1–Q12 were posted on #1078 on 2026-11-17. The developer's answers are below and are folded into §4 and §7; the questions as posted follow for the record.

**Answers (developer, 2026-11-17 and 2026-11-18):**
- **Q1:** freeze `location-data.ts` at the 27 courts: **yes**. Fail-loudly guard (b): **yes**. Renumber the seeded courts to their legacy IDs first (S4): **yes for now**, may change.
- **Q2:** the deploy seed must **never overwrite an existing provenance reference**. A clash **fails the deploy**, and only a person changes or removes a reference, through amend a court (S1) or the update-only CSV (S2). Ticket 1 changes `generate-seed-sql.ts:111` as described in §4.2 item 4.
- **Q3:** start the sequence at the **highest legacy CaTH production P&I ID + 1**, not 100000. The value comes from the legacy production export (S4); if production matches staging (highest 389), the start is 390. Every legacy load ends with the same `setval` as the migration, with the sequence's current next value added to the `GREATEST` (§4.1), so no margin is needed (§4.1). The E2E bands now sit above the start on STG and locally; §4.1 explains why that is safe, and why ticket 1's CSV guard uses the sequence's live value.
- **Q4:** courts are added **one at a time**. The one-question-per-page journey stands.
- **Q5:** first answered as "starts as a draft". **Changed on 2026-11-18: no draft state.** A draft state would have to filter shared location readers that list pages, notifications and admin uploads also use, and needs a persistent publish route, for about 2 days. A new court is public as soon as it is confirmed.
- **Q6:** **several** provenance references per new court. After the first, an "Add another reference?" step lets the admin add more (for example SNL and Common Platform), as the CSV route allows. This adds a page and the within-submission duplicate check (§5, rule 15) to ticket 2, about 1 day.
- **Q7:** the **System Admin** supplies the Welsh name. Provenance references are **usually not known** when a court is created, so the reference step is **optional**: the admin can skip it and add references later through amend a court (S1). Until a court has a reference, lists from upstream systems cannot be matched to it, so check answers and the success page say so.
- **Q8:** amend a court is **in scope** (S1).
- **Q9:** extend the Q1 freeze to **regions, jurisdictions and sub-jurisdictions** in `location-data.ts`: a CI test fails if one is added there, so new ones only come from the admin pages. This removes the seed clash (`generate-seed-sql.ts:80`, `ON CONFLICT (region_id) DO UPDATE SET name`) without new sequences, and goes in ticket 1. A separate ticket for sequences on these tables is not needed; the remaining concurrent-create race is accepted.
- **Q10:** the CSV route becomes **update-only** (S2).
- **Q11:** **radio buttons** (not a select) for provenance and type; **keep the tiles** on the `/reference-data` hub; the spec's hint texts **need checking by content design** before build.
- **Q12:** **System Admin only**, matching legacy (`isPermittedSystemAdmin`) and this service (`requireRole([USER_ROLES.SYSTEM_ADMIN])`).

All of Q1–Q12 are answered. The questions as posted:

**Tech lead (blocking the recommendation)**

> **Q1. Should `location-data.ts` be frozen for new courts once the UI ships?** CLAUDE.md calls it the single source of truth for locations, and a UI that creates courts makes a second source. The #1078 spike reproduced on a scratch database that a later `locationData` entry with a UI court's name renames the UI court to `__realign_<id>` on the next deploy, permanently, and can take its SNL reference (report §4.5). Proposal: keep the 27 seeded courts, add no new courts there, document the split in CLAUDE.md, and treat UI courts as environment-local. Agree, or another approach? To enforce it, a CI test would fail if `locationData` gains a 28th court. Optionally, the seed could also skip renaming rows at or above the sequence start, so that a collision fails the deploy loudly instead of quietly parking the UI court. Do you want that second guard? Related: the 27 seeded courts use different IDs from legacy CaTH for 26 of them (report §1.7). Should they be renumbered to their legacy IDs before go-live (follow-on S4, §7.2), so that the freeze starts from IDs that match legacy?

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
| A `locationData` name collides with a UI court | Court permanently parked as `__realign_<id>` (reproduced) | Low once frozen | Q1 freeze, enforced by the freeze test; guard (b) makes any collision fail the deploy instead (§4.2) | Tech lead |
| A `locationData` `id + 100` equals a UI court's SNL ID | Reference silently moved; publications go to the wrong court (reproduced) | Low once frozen | Q1; Q2 `DO` block fails the deploy instead (§4.2); step 5 check | Tech lead |
| A seed clash fails the deploy | The postgres deploy pod stays red until a person fixes the reference or name | Low | Intended (Q1, Q2): loud failure instead of silent data change. The error names the clashing row | Tech lead |
| CSV E2E tests rejected by the interim guard on per-PR preview databases | Every PR's E2E fails | High if not handled | Ticket 1 moves `location-csv.ts` to create courts through test-support (§4.1) | Tech lead |
| CSV mints an ID the sequence has not reached | Next UI create fails on `location_pkey` when the sequence reaches it (reproduced) | Low | Interim CSV guard in ticket 1 (rejects unused IDs at or above the sequence's live value; existing courts still update); S2 makes CSV update-only; confirm retries once, then errors | Tech lead / PO |
| Legacy courts loaded after UI courts exist | A legacy ID equals a UI court's ID; the load fails on `location_pkey` | Low; no production deployment yet | Load legacy courts before the journey is opened in that environment; every load ends with the `setval` (§4.1) | Tech lead |
| Legacy production export differs from staging | Wrong start value | Medium | Ticket 1 takes the start from the production export (S4), not staging | Tech lead |
| Two sources of truth diverge | Court on STG but not locally | Medium | Update CLAUDE.md item 7 (§4.2) | Tech lead |
| Bulk volume higher than assumed | Feature unused | Low (Q4: one at a time) | B fallback | PO |
| F later proves the strategic answer | C becomes interim | Low | C is a prerequisite for any sync | PO |
| Seeded court IDs differ from legacy CaTH IDs | If legacy courts are later loaded with their IDs, the seed renames them and their lists show under the wrong court | Medium, only if legacy data is migrated | Renumber the seeded courts before go-live (S4; `legacy-court-mapping.md`, re-checked against legacy production) | Tech lead |
| Concurrent case-variant names | Two courts differing only in case | Low | Accept, or add a `lower(name)` unique index in ticket 1 | Tech lead |

---

## 7. Proposed follow-on tickets

These tickets are **described here only**. Apart from S3 (#1537), none is raised from the spike: whoever plans the build raises them from this section after sign-off, and attaches spec §4–13 by reference at that point.

### 7.1 Build tickets for Option C

| # | Title | Size | Depends on |
|---|---|---|---|
| 1 | Court maintenance: location ID sequence, service and seed guards | 2.5 d | S4's legacy production export (the start value) |
| 2 | Add a court or tribunal journey: eight pages, hub entry and E2E, including "add another" references (Q6) | 5.5–7 d | 1 |
| | **Total** | **8–9.5 d** | |

"Spec §n" below means the `/spec` comment on #1078. Where the spec and this report differ (radios not selects, an optional reference step, "add another", no draft state), this report's answers to Q1–Q12 win.

#### Ticket 1: Court maintenance: location ID sequence, service and seed guards

**Summary.** Give `location.location_id` a sequence starting one above the highest legacy CaTH production court ID, add the `court-maintenance` service that creates one court in one transaction, and make the deploy seed fail rather than change UI or legacy data. Spike: #1078, report §4.

**Scope**
- `location.prisma`: `locationId Int @id @default(autoincrement()) @map("location_id")`.
- Migration `apps/postgres/prisma/migrations/<ts>_add_location_id_sequence/migration.sql` via `yarn db:migrate:dev`, ending with `SELECT setval('location_location_id_seq', GREATEST(<legacy start>, (SELECT COALESCE(MAX(location_id), 0) + 1 FROM location)), false);`, where `<legacy start>` is the highest P&I ID in the legacy production export + 1 (§4.1, Q3). Re-run `migrate diff` and confirm it is still empty. No `setval` in the seed.
- `libs/system-admin-pages/src/court-maintenance/service.ts`: `validateCourtNames()`, `validateProvenanceReference()`, `createCourt()`, returning field error keys (for example `{ field: "name", key: "nameDuplicate" }`).
- `queries.ts`: case-insensitive lookups; one `prisma.$transaction` that creates `location` (no ID), `location_region`, `location_sub_jurisdiction` and zero or more `location_reference` rows. Create only, no `deleteMany`.
- P2002 mapping by `meta.target`: name, welsh_name and (provenance, provenance_location_id) become field errors; `location_pkey` gets one retry, then an error.
- `AuditLogAction.ADD_COURT = "Add court"` in `logger.ts`. Export the service from `libs/system-admin-pages/src/index.ts`.
- Interim CSV guard: `validateLocationData()` (`libs/system-admin-pages/src/reference-data-upload/validation/validation.ts:7`) rejects any `LOCATION_ID` at or above the sequence's **live** value (`SELECT last_value, is_called FROM location_location_id_seq`) that does not already exist in `location`, with a message pointing to "Add a court or tribunal". Existing courts, including UI-created ones, must still update, so a full download can be re-uploaded (§4.1). S2 later replaces this with the full update-only rule.
- `e2e-tests/utils/location-csv.ts`: create each test court through test-support's generated-ID path, which retries on a clash (`libs/test-support/src/routes/test-support/locations.ts:103-113`), not its explicit-`locationId` path, which is an upsert (`:55`) and would let parallel workers overwrite each other's courts. Create each court first, then use the CSV only to update it, so the CSV E2E suite passes the guard on per-PR preview databases, where the live value is about 390 (§4.1).
- Freeze test (§4.2 guard a): the exact sets of court, region, jurisdiction and sub-jurisdiction IDs in `locationData` (Q1, Q9), failing with a message that points to the admin pages.
- `generate-seed-sql.test.ts`: every `location_id` in the generated SQL is below the sequence start, and the start is above the highest legacy production ID.
- Fail-loudly realign (§4.2 guard b, Q1): the location realign only renames rows whose `location_id` is one of `locationData`'s own IDs.
- Reference clash (§4.2 item 4, Q2): change `generate-seed-sql.ts:111` to the guarded `DO UPDATE … WHERE location_reference.location_id = EXCLUDED.location_id`, preceded by a `DO` block that raises an exception naming the clashing `(provenance, provenance_location_id)` if it belongs to a different location.
- Update CLAUDE.md item 7: courts, regions, jurisdictions and sub-jurisdictions are now added through the admin pages; `location-data.ts` is frozen.
- Existing explicit-ID writers (seed, test-support, `upsertLocations()`) still compile and pass.

**Out of scope:** pages; renumbering the seeded courts (S4).

**Scenarios**
- *UI court survives a deploy (build scenario 6).* Given a UI-created court with mappings and references, when the seed runs twice, then nothing about it changes.
- *Bands.* Every seeded ID is below the start; the start is above the highest legacy ID.
- *Seed file frozen.* Adding a court, region, jurisdiction or sub-jurisdiction to `locationData` fails CI.
- *Name clash fails the deploy.* Given a UI court named like a new `locationData` entry, the generated seed fails on `location_name_key` and the UI court keeps its name.
- *Reference clash fails the deploy.* Given a UI court holding (SNL, "128"), a seed that would insert (SNL, "128") for another court raises an exception, the transaction rolls back and the UI reference is unchanged. A seed with no clash runs twice without error.
- *CSV cannot mint sequence IDs.* A CSV row with an unused `LOCATION_ID` at or above the live value is rejected at validation, and nothing is written. A row with an unused ID below the live value is accepted. The CSV E2E suite passes on a fresh preview database.
- *CSV can still update UI courts.* Given a UI-created court, a CSV row with its `LOCATION_ID` is accepted and updates it. Re-uploading an unedited full download succeeds.
- *Duplicate caught at confirm (build scenario 7).* A P2002 becomes a field error; nothing is written; no audit metadata is set; the session is kept.
- *Atomicity.* If a reference insert fails, no rows remain.

**Spec:** §2, §6.2, §6.5, §6.6, §9.3, §9.4, §13.2, §13.6. **Size:** 2.5 d.

#### Ticket 2: Add a court or tribunal journey

**Summary.** The "Add a court or tribunal" journey in `apps/web/src/pages/(system-admin)/`, on top of ticket 1's service. A new court is public as soon as it is confirmed. It ships as one ticket because the pages are not usable apart. It can still be reviewed as several PRs behind the hub entry, which is added last.

**Scope**
- **Common to every page:** `index.ts` (`GET`/`POST` `RequestHandler[]` behind `requireRole([USER_ROLES.SYSTEM_ADMIN])`), `index.njk`, `en.ts`, `cy.ts`, `index.test.ts` and `index.njk.test.ts`. Every step after the first redirects to step 1 when the `addCourt` session is missing. `?change=true` returns to check answers.
- **Session:** `addCourt` and `addCourtSuccess` in `apps/web/src/session.ts`.
- **`add-court-name/` and `add-court-contact-details/`:** trim and collapse whitespace; `HTML_TAG_REGEX` on all four fields; empty email and contact number stored as null.
- **`add-court-regions/` and `add-court-sub-jurisdictions/`:** from `listRegions()` and, grouped, `listJurisdictionsWithSubJurisdictions()`. A single tick posts a string and must be coerced to an array. Unknown IDs are rejected.
- **`add-court-provenance-reference/` (optional, Q7):** provenance and type as **radios** (Q11; values from `LOCATION_REFERENCE_PROVENANCES` and `LOCATION_REFERENCE_TYPES`), and the provenance ID. A "Skip this step" link goes straight to check answers. A started reference needs all three fields. Database uniqueness check on (provenance, provenanceLocationId).
- **`add-court-add-another-reference/` (Q6):** "Add another reference?" yes/no radios, listing the references added so far with Remove links. Yes returns to the reference step. Within-submission duplicate check (§5, rule 15).
- **`add-court-check-answers/`:** summary list with Change links. With no reference, an inset says lists from upstream systems cannot be matched to the court until one is added (Q7). The `POST` re-validates and calls `createCourt()`, then sets `req.auditMetadata = { shouldLog: true, action: AuditLogAction.ADD_COURT, entityInfo: "Name: …, Location ID: …" }`, as `add-region` does.
- **`add-court-success/`:** panel with the court name and ID, and the no-reference warning if it applies. Clears `addCourt`.
- **Hub entry (last):** a fifth "Add a court or tribunal" tile in `reference-data/en.ts` and `cy.ts` `options` (Q11 keeps the tiles).
- **Content:** the spec's hint texts go to content design before build (Q11).
- **E2E:** two Playwright journeys in `e2e-tests/tests/`, with prefixed names and provenance IDs so teardown removes them.

**Scenarios**
- *Deep link (build scenario 8).* With no session, any step after step 1 redirects to step 1.
- *Duplicate names.* A duplicate in any case links to `#name` / `#welshName`, and the other answers are kept.
- *Markup.* `<script>` gives a field error.
- *Empty selection.* Nothing ticked on regions or sub-jurisdictions gives a fieldset error, and the admin cannot proceed.
- *Tampered POST.* An unknown region ID, or a provenance or type outside the vocabulary, is rejected on the server.
- *Duplicate reference.* (SNL,"104") links to `#provenanceLocationId`; nothing is written. The same reference twice in one submission is rejected on the "add another" page.
- *Skipped reference.* Skipping the reference step reaches check answers with the no-reference inset, and the court is created with no `location_reference` rows.
- *Welsh.* With `?lng=cy` everything is Welsh, and the `en`/`cy` keys match.
- *A System Admin adds a court (build scenario 4, @nightly).* Dashboard → `/reference-data` → step 1. On the way:
  - submit empty, then a duplicate name, and check the summary links;
  - switch to Welsh on an error;
  - run axe on step 1's error state and on check answers;
  - skip contact details;
  - submit regions with nothing ticked;
  - add two references using "Add another";
  - follow a Change link back;
  - confirm with the keyboard.

  Then the panel shows the ID, the court is in the public A–Z in English and Welsh, and `ADD_COURT` is in `/audit-log-list`. Teardown removes the court.
- *Unauthorised user refused (build scenario 5, @nightly).* Without `SYSTEM_ADMIN`, `GET` step 1 and `POST` check answers are refused, and nothing is written.
- *Resubmission (build scenario 8).* After success, a re-POST of check answers redirects to step 1 and writes nothing. The success page with no data redirects to `/reference-data`.
- *Concurrent duplicate.* A P2002 at confirm renders on check answers with a link to the step, not a 500.

**Spec:** §3 (Option C criteria), §4.3, §4.4, §5.1–5.9, §6.3, §6.4, §6.6, §7.1–7.8, §9.1–9.4, §10.1–10.6, §11, §12, §13.3–13.5. **Size:** 5.5–7 d (4.5–6 d for the journey, about 1 d for "add another"). **Depends on:** ticket 1.

### 7.2 Sibling tickets

**S1: Amend a court.** Change a court's names, contact details and references without a CSV, reusing C's pages in change mode and its service (Q8). Must handle the seeded courts, whose renames are reverted on every deploy: block renaming them. Also the route by which a person resolves a seed reference clash (Q2). Depends on tickets 1 and 2. Roughly 3–4 d.

**S2: Make the reference-data CSV upload update-only (Q10).** Replaces ticket 1's interim guard. `validateLocationData()` rejects an unknown `LOCATION_ID` with a bilingual message pointing to "Add a court or tribunal". Why: an admin-chosen ID the sequence has not reached breaks a later UI create (§4.5).
- Scenarios: an unknown ID is rejected with a row-numbered error; updates to existing courts still work.
- Also add a database check on (provenance, provenanceLocationId), so a clash is a validation error rather than a 500.
- Depends on ticket 2. About 1 d.

**S3: Discovery spike: syncing courts from an upstream source.** Already raised as #1537 and kept open, because it is research rather than build work. Can SNL, Common Platform or another source supply names, Welsh names, references and closures? Who owns the contract? What reconciliation policy is needed without soft delete? Output: a report like this one. Time-boxed to 3 d.

**S4: Align seeded court IDs with legacy CaTH (Q1).** Get the legacy CaTH **production** reference-data export, re-check `legacy-court-mapping.md` against it, and renumber the seeded courts in `location-data.ts` to their legacy IDs before go-live, with a reviewed mapping for the three courts with no exact match. The same export supplies ticket 1's sequence start (Q3). Must land before any legacy load, and before ticket 1's migration reaches production.
- **Also in scope.** Replace the hard-coded SJP `locationId=9` in `apps/web/src/pages/(verified)/account-home/index.njk:22` and `apps/web/src/pages/(public)/view-option/index.ts:42` with a constant or a lookup by name. Decide whether real legacy provenance references replace the synthetic `SNL:(id + 100)` ones (`generate-seed-sql.ts:106`). Update E2E fixtures, `libs/test-support` and unit tests that assert on a seeded court's ID. Update CLAUDE.md item 7 to say seeded court IDs must match legacy P&I IDs. If ticket 1 has merged, update its freeze test to the new ID set in the same PR.
- **Done when** every seeded court's `locationId` equals its legacy production P&I ID, or there is a recorded decision for each of the three unmatched courts (which must not take an ID a legacy court uses). No code depends on a hard-coded seeded ID. The migration and seed run twice on a fresh database and on an STG copy, with and without ticket 1's guards, leaving no `__realign_` rows and exactly one `seedref_<new id>` per moved court. The mapping needs a second reviewer, and the raw legacy export holds court contact details, so it must not be committed.
- **It moves its own rows.** Once ticket 1's guard (b) is in, the seed no longer parks old rows, so a deploy that only edits `location-data.ts` would fail on `location_name_key` (for example, STG row 4 still holds "Royal Courts of Justice" when the seed inserts it at 109). S4 therefore ships a one-off Prisma migration, which runs before the seed (`apps/postgres/start.sh:95`, then `:104-105`), wrapped in its own `BEGIN`/`COMMIT`:
  1. **Pre-check.** Raise an exception if any target ID is held by a row that is not itself one of the seeded courts being moved.
  2. **Delete the moving courts' synthetic seed references** (`location_reference_id = 'seedref_<old id>'`). Otherwise the foreign key carries each one to the new ID, and the chained moves leave it on the wrong court: seeded 7 moves to 147 and seeded 24 moves to 7, so `seedref_7`'s (SNL, "107") would end up on 147 while the seed inserts (SNL, "107") for location 7, which ticket 1's Q2 check rejects (and today's seed clause would silently move to the wrong court). The seed recreates every `seedref_<new id>` on the next run.
  3. **Move in two phases through a negative offset**: first every moving court to `-<old id>`, then to `<new id>`, so no two rows hold one ID at once. `location_reference`, `location_region`, `location_sub_jurisdiction` and `location_metadata` follow through their foreign keys' `ON UPDATE CASCADE`. `artefact.location_id` (`libs/postgres-prisma/prisma/schema/base.prisma:14`) and `subscription.search_value` for location subscriptions (`subscription.prisma:5`) are strings with no foreign key, so the migration moves them explicitly through the same two phases. This matters for `subscription`, whose unique key on (user, search type, search value) would otherwise merge or reject two courts' subscriptions mid-move.

  If the migration fails, the transaction rolls back and the deploy stops; mark it with `prisma migrate resolve --rolled-back` before retrying. After it runs, the seed finds every court at its new ID, parks nothing and raises nothing, with or without ticket 1, so S4 can ship before or after it. Guard (b) and the Q2 check stay as the safety net.

A ticket to give regions, jurisdictions and sub-jurisdictions their own sequences was considered and dropped after Q9: the freeze removes the seed clash, and the concurrent-create race is accepted.

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
| Follow-on tickets listed | §7 | 2 build + 4 sibling, described in full; none raised from the spike |
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

Revised on 2026-11-18 at the developer's request:
- **Follow-on tickets are described in §7 only, not raised.** GitHub issue numbers were removed throughout. The legacy-ID renumbering is now sibling S4; the earlier S4 (sequences for regions and jurisdictions) was dropped after Q9.
- **Q3 settled as highest legacy production ID + 1**, with the same `setval` at the end of every legacy load instead of a margin (§4.1). The interim CSV guard now uses the sequence's live value, so ticket 1 also moves the CSV E2E tests to create courts through test-support.
- **The answers to Q1, Q2, Q5–Q7, Q9 and Q11 are folded into §4.2, §5 and both build tickets**: guard (b) is required; the seed's reference clash fails the deploy through a `DO` block; the freeze covers regions and jurisdictions; the reference step is optional; "add another" is specified; radios replace selects.

Revised again on 2026-11-18 after the fifth review, at the developer's request:
- **No draft state.** The Q5 answer is changed: a new court is public on confirm. The draft column, publish step and draft scenarios are removed.
- **The CSV E2E change moved from S2 into ticket 1**, because per-PR preview databases start the sequence at about 390 and the interim guard would reject the tests' 80000–89999 courts.
- **S4 moves its own rows** in a one-off migration, so guard (b) does not fail its deploy.
- The legacy-load `setval` includes the sequence's current value. The size is 8–9.5 d everywhere.

Revised after the sixth review: S4's migration now pre-checks the target IDs, deletes the moving courts' synthetic seed references so the chained moves cannot leave one on the wrong court, and moves courts, publications and subscriptions in two phases through a negative offset. Ticket 1's CSV E2E change uses test-support's generated-ID path. The Q3 answer and the recommendation box were brought in line with §4.1 and §7.

Needs a person: tech lead and PO sign-off on this report, then raising the §7 tickets with spec §4–13 attached, then closing #1078. If Q4 changes, revisit §2 and §4.
