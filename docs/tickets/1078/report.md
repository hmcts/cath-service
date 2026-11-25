# Spike report: #1078 Court Maintenance

Options for adding a new court location through the System Admin portal without a CSV file.

| | |
|---|---|
| Issue | #1078 (spike) |
| Plan | `docs/tickets/1078/plan.md` |
| Spec | `/spec` comment on #1078, mirrored in `docs/tickets/1078/ticket.md` (sections 4 to 13) |
| Code verified against | `origin/master` `5014f714` (2026-11-13). Every path cited below is unchanged at `65eb3d72` (the plan's baseline) and at `682ec4b4` (master on 2026-11-20) |
| Experiments | Run on 2026-11-13 against two throwaway databases (`spike_1078_s1`, `spike_1078_s2`) created inside the local docker `cath-postgres` container (localhost:5433), migrated with `prisma migrate deploy`, and dropped afterwards. The developer's own `postgres` database was not touched. No repository file was changed |

> ## Recommendation: keep the CSV for bulk work, add single-page forms for one court
>
> Decided by the developer on 2026-11-25. This replaces the earlier recommendation of Option C
> (one question per page) and its `location_id` sequence. The earlier analysis is kept where it
> still explains a decision.
>
> 1. **Keep the CSV upload for adding and updating courts in bulk** (Option A). It is sometimes used
>    to add more than 100 courts at once, which no form can replace. Admins keep choosing the
>    `LOCATION_ID`s, unique and incrementing by 1.
> 2. **Add an "Add a court or tribunal" form** (Option B): one page where the admin enters the
>    location ID, names, contact details, regions, sub-jurisdictions and an optional provenance
>    reference. It only creates: an ID or name already in use is a field error, never an overwrite.
> 3. **Add an "Update a court or tribunal" form**: find a court, then change its details on one
>    page. The location ID cannot be changed.
> 4. **No sequence.** Every writer supplies the ID, as today, so the CSV and the forms cannot clash
>    with a sequence (§4.1).
> 5. **Protect courts that are not in `location-data.ts` from the deploy seed** by freezing that file
>    and making the seed fail the deploy rather than rename a court or move a provenance reference
>    (Q1, Q2, Q9). This applies to courts added by CSV as much as to courts added by the forms.
> 6. **Make the CSV summary say which rows add a court and which overwrite one.** Today a row that
>    reuses an existing ID silently overwrites that court, names included (§4.3).
>
> Estimated at 7.5 to 10 dev-days across four build tickets (§7). Options C, D, E and F are
> rejected, each with a one-line reason in §4.4. The tickets are described in §7 only; none is
> raised from the spike.

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

The core `location` row is the only reference-data entity a System Admin cannot create, rename or re-contact without a file. That is the main finding: the add and update forms complete a pattern the portal already uses. It can reuse:
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
| P4 | Not mentioned | Test-support provenance IDs default to the location ID | Affects the forms' reference uniqueness check; E2E should use prefixed provenance IDs, as `location-csv.ts:50` does |
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

So no form for adding or updating one court has ever existed. It is new in both systems, and the new service ported the old CSV design almost one-for-one.

**Seeded and legacy court IDs differ.** A legacy staging reference-data export (2026-11-17; 367 courts, P&I IDs 1–389, none at or above 100000) was compared with the 27 seeded courts in Appendix A. Only Single Justice Procedure has the same ID in both (9). 22 exist in legacy under a different ID (for example Royal Courts of Justice is 109 in legacy and 4 here), 3 have no legacy match, Rolls Building is legacy 111, and 19 seeded IDs belong to a different court in legacy (legacy 7 is Liverpool Social Security and Child Support Tribunal; seeded 7 is Bristol Civil and Family Justice Centre). If legacy courts are ever brought into this service with their IDs, the deploy seed would rename most of them (c3). Renumbering the seeded courts to their legacy IDs before go-live avoids that; it is follow-on S4 (§7.2, Q1).

---

## 2. Options matrix

Effort is in dev-days including tests. Constraint scoring: ✗ = unsolved or worse, ~ = partly handled, ✓ = handled. Verdicts are as decided on 2026-11-25 (§6.1).

| # | Option | Pros | Cons | Effort | c1 | c2 | c3 | c4 | c5 | Verdict |
|---|---|---|---|---|---|---|---|---|---|---|
| A | Keep CSV round-trip | Live and tested; the only practical route for 100+ courts at once | A reused ID silently overwrites a court; stale file reverts others' work; all 21 errors point at `#file` (WCAG 3.3.1/3.3.3); audit records a file name; provenance clash is a 500 | 0 now; 1–1.5 for ticket 4 | ~† | ~ | ✓* | ✓* | ~‡ | **Kept for bulk add and update**, with ticket 4 |
| B | Single page per task: add a court, update a court | Same shape as `add-region`; one page per court; field-linked errors; create-only add | Breaks one-thing-per-page (two checkbox fieldsets, an optional reference group); no check answers before a write to unique columns | 2–3 (add) + 2.5–3.5 (update) + ticket 1 | ✓† | ✓ | ✓* | ✓* | ✓ | **Recommended for one court** |
| C | One question per page → check answers → confirmation | Standard GOV.UK pattern; review gate before writing | Eight pages for one court; session state and deep-link guards; needed a sequence that conflicts with admin-chosen CSV IDs | 8–9.5 | ✓ | ✓ | ✓* | ✓* | ✓ | Rejected on 2026-11-25 (previously recommended) |
| D | Developer edits `location-data.ts` | One source of truth; reviewed; no new code | Developer, pull request and release per court; cannot set email, contact or real provenance IDs | 0 UI | ✓ | ✓ | ✓ | ~ | ✓ | Rejected; file frozen (Q1) |
| E | Paste CSV into a textarea | About half a day | Keeps every CSV defect; harder and less accessible than upload | 0.5 | ✗ | ~ | ✗ | ✗ | ✗ | Rejected |
| F | Upstream sync | Removes manual work | Another team's contract that doesn't exist; reconciliation policy without soft delete; no Welsh names upstream | Not estimable | ? | ✗ | ? | ? | ? | Separate discovery spike (S3) |

\* With Decision 2. Without a `locationData` freeze, any court outside `locationData`, whether it came from the CSV or a form, is exposed to c3 and c4 (§4.5).

† The admin chooses the ID in both routes (Decision 1). The add form rejects an ID already in use. The CSV accepts it and overwrites that court. It scores ~ because ticket 4 shows each overwrite on the summary page before anything is written; without ticket 4 it would be ✗.

‡ Uploading only the rows being changed avoids c5; re-uploading a stale full download still reverts other admins' edits (§4.3).

---

## 3. The options in detail

### 3.1 A: keep the CSV round-trip
It works, has E2E coverage (`e2e-tests/utils/location-csv.ts`), and is the only practical way to add more than 100 courts at once (2026-11-25). Its defects:
- `upsertLocations()` upserts by `LOCATION_ID` (`upload-repository.ts:53-70`), and the duplicate-name checks skip the row's own ID (`validation.ts:186`, `:206`). So a row that reuses an existing ID is not an error: it overwrites that court, including its names, contact details, regions, sub-jurisdictions and references. Nothing tells the admin which rows are new.
- A full-download workflow rewrites every court in the file (c5), so two admins working from different downloads revert each other.
- All 21 errors link to `#file`.
- A provenance clash with the database isn't validated and becomes a 500 (`reference-data-upload-summary/index.ts:125`).
- The audit entry records `File: …, Records: n`, not which court changed (`:132-136`).

**Verdict:** kept for adding and updating courts in bulk. Ticket 4 fixes the silent overwrite, the 500 and two smaller defects (§4.3).

### 3.2 B: single-page forms (recommended for one court)
Two forms, each on one page, on top of ticket 1's service:
- **Add a court or tribunal:** location ID, English and Welsh names, email, contact number, regions, sub-jurisdictions and an optional provenance reference, then a success page.
- **Update a court or tribunal:** find the court, then the same fields pre-filled, with the location ID shown but not editable, then a success page.

Costs and trade-offs:
- About 2–3 d for add and 2.5–3.5 d for update, plus ticket 1.
- It breaks one-thing-per-page: two checkbox fieldsets and an optional reference group on one page. `add-region` and `location-jurisdiction-manage` already do this in the same portal, so it is consistent with what admins use today.
- There is no check-answers page. Because the add form only creates, a mistake is fixed with the update form rather than by overwriting another court.
- Errors are shown in an error summary and next to each field, and the form keeps the admin's answers.

**Verdict:** recommended for adding or updating one court (2026-11-25).

### 3.3 C: one question per page
Eight pages for one court (name, contact details, regions, sub-jurisdictions, reference, "add another", check answers, success). It is the GOV.UK default, but with bulk work going through the CSV, the forms only need to be quick for one court. It also relied on a `location_id` sequence, which cannot sit next to admin-chosen CSV IDs (§4.1).

**Verdict:** rejected on 2026-11-25. It was the recommendation before then.

### 3.4 D: developer edits `location-data.ts`
This is how the 27 seeded courts got there: one reviewed source of truth that reaches every environment. But every new court needs a developer, a pull request and a release. It can only set the names, regions, sub-jurisdictions, caution messages and one synthetic SNL `id + 100` reference. It cannot set email, contact number or real provenance IDs (`generate-seed-sql.ts:93-112`).

**Verdict:** rejected. Under Q1, `location-data.ts` is frozen at the 27 seeded courts.

### 3.5 E: paste CSV into a textarea
It reuses `parseCsv()` and `validateLocationData()` and takes half a day. It keeps every CSV defect, and typing CSV by hand is harder and less accessible than uploading a file.

**Verdict:** rejected.

### 3.6 F: upstream sync
There is no upstream contract, and the owning team sits outside CaTH. It needs a reconciliation policy even though locations have no soft delete. Unique Welsh names (c2) are unlikely upstream. Any sync would reuse ticket 1's create and update service.

**Verdict:** separate discovery spike (S3).

---

## 4. The recommendation: CSV for bulk work, single-page forms for one court

### 4.1 Decision 1: the admin chooses `location_id` in every route; no sequence

The CSV keeps admin-chosen IDs (2026-11-25), so the forms do the same. The developer chose this over the form working out the next ID.

| Strategy | Analysis | Verdict |
|---|---|---|
| Sequence (the earlier Decision 1) | Explicit-ID writers never advance a sequence, so a CSV-chosen ID breaks the next form-created court on `location_pkey` when the sequence reaches it (reproduced, §4.5 scenario 2 step 7). Keeping it would need the CSV to stop creating courts, which is the opposite of what is wanted | **Dropped** |
| Form works out `MAX + 1` | Works with the CSV convention, but on STG returns about 100000 because the E2E ranges fill 80000–99999 (§1.5) | Not chosen |
| **Admin enters the ID on the add form** | Same rule as the CSV. The form only creates, so an ID already in use is rejected rather than overwritten | **Chosen** |

**Rules for the ID field on the add form:**
- Required; a whole number from 1 to 2147483647 (the column is a Postgres `integer`, `location.prisma:70`).
- Not already used by a court. Checked on submit and enforced again by the primary key: a P2002 on `location_pkey` inside the create transaction becomes a field error on `#locationId`, not a 500.
- The hint shows the highest ID in use (`MAX(location_id)`), so the admin can follow the "+1" convention without downloading the CSV. On STG the E2E data puts this in the 9xxxx range, so it isn't a useful hint there (Q13).

**No schema change.** `locationId` stays `Int @id` with no default. There is no migration, no interim CSV guard and no change to the CSV E2E tests.

**Where an admin-chosen ID can still go wrong:**
- **CSV, existing ID:** the row overwrites that court. Ticket 4 shows this on the summary page before anything is written (§4.3).
- **STG, IDs 9001–9010:** E2E global setup upserts its fixture courts by ID (`e2e-tests/utils/seed-location-data.ts` → `libs/test-support/src/routes/test-support/seed-locations.ts:32-41`), so a real court given one of those IDs is overwritten on the next E2E run. The 80000–99999 ranges only use unused IDs and are safe. Production has none of these. Accepted (Q13): real court IDs will not reach 9001.
- **Legacy courts loaded later:** if admins add courts in an environment before legacy courts are loaded with their own IDs, the IDs can clash. Load legacy courts before the forms are used in production, and pick new IDs above the highest legacy ID.

### 4.2 Decision 2: protect courts that are not in `location-data.ts` from the deploy seed

This applies to every court the seed doesn't own, whether it came from the CSV, the add form or a legacy load.

1. **Freeze `locationData` (Q1, Q9).** Keep the 27 courts and the current regions, jurisdictions and sub-jurisdictions, and add no more. Update CLAUDE.md item 7, which today tells developers to add locations to `location-data.ts`, to say that courts and the reference data under them are now added through the admin pages or the reference data CSV, and are environment-local. This is the only measure that removes c3.
2. **Reject an existing `(provenance, provenance location ID)` pair** on the add and update forms, on submit and again in the transaction. The seeded "101"–"127" references exist in every environment, so an ordinary uniqueness lookup covers them.
3. **Guards that can actually fail.** A test asserting that the realign list comes only from `locationData` would always pass, because `generateRealignSql()` and `generateLocationReferencesSql()` only ever read `locationData` (`generate-seed-sql.ts:46-51`, `:99-112`). The collision is between a new `locationData` entry and a row in some environment's database, and a unit test cannot see that row. So the guards are:
   - (a) **Freeze test (required, Q1 and Q9).** A test in `apps/postgres/prisma/generate-seed-sql.test.ts` asserting the exact set of court IDs (1–27 today) and the exact sets of region, jurisdiction and sub-jurisdiction IDs. Its failure message tells the developer to add the entry through the admin pages instead. Assert the set as it stands, not a hard-coded 1–27, so the test is updated in the same PR if S4 renumbers the seeded courts.
   - (b) **Fail loudly (required, Q1).** The location realign only renames rows whose `location_id` is one of `locationData`'s own IDs. Any other row with a colliding name is left alone, so the insert fails the deploy on `location_name_key` instead of quietly parking that court as `__realign_<id>`. This also stops the seed parking the old seeded rows when S4 renumbers them, so S4 moves its own rows (§7.2).

   The existing test at `:84-100` checks the shape of the realign but not where its values come from.
4. **Stop the seed re-pointing references, and fail the deploy on a clash (Q2).** The seed re-inserts its own `seedref_<id>` rows on every deploy (`generate-seed-sql.ts:105`), so a plain `INSERT` with no `ON CONFLICT` would fail every deploy, not just a clash. Instead, before the reference insert, the generated SQL runs a `DO` block that raises an exception if any of the seed's `(provenance, provenance_location_id)` pairs already belongs to a different `location_id`. The insert then uses the guarded clause below, which is a no-op for the seed's own rows. The seed runs as one transaction (`BEGIN` at `generate-seed-sql.ts:20`, `COMMIT` at `:63`, applied by `start.sh:105`), so the exception rolls the whole seed back and the postgres deploy pod fails. That is the intended effect: the deploy stays red until a person moves or removes the reference through the update form (ticket 3) or the CSV, and no data is changed silently. Until ticket 3 ships, the usual fix is to revert the `location-data.ts` change that caused the clash. Both clauses the spike tested are below; on their own, each skips the clash silently, which is why the `DO` block is needed:

| Reference clause | Non-seed court's (SNL,"128") | Seeded court 28's SNL ref | Non-seed court's name |
|---|---|---|---|
| Current `DO UPDATE SET location_id = EXCLUDED.location_id` | **Moved to 28** | Takes over the other court's row | Parked |
| Guarded `DO UPDATE … WHERE location_reference.location_id = EXCLUDED.location_id` | Stays on 100000 | **None, silently** | Parked |
| `DO NOTHING` | Stays on 100000 | **None, silently** | Parked |

Either clause stops the takeover, but neither stops the name parking or reports the clash. Guard (b) and the `DO` block make both hazards fail the deploy; the Q1 freeze stops them arising in the first place.

Two side effects seen during the experiment:
- After the takeover, the moved reference is a child of location 28, so deleting court 28 cascades and deletes the other court's former reference (`location.prisma:91`).
- The seed sets `name` and `welsh_name` on every deploy (`ON CONFLICT (location_id) DO UPDATE SET name, welsh_name`, `generate-seed-sql.ts:93-97`), so renaming one of the 27 seeded courts through any route, CSV or form, is reverted on the next deploy. Their email and contact number are not touched. Accepted (Q14): the forms and the CSV do not stop it.

### 4.3 Decision 3: keep the CSV for bulk add and update, and close its gaps

The CSV route keeps both creating and updating courts. Ticket 4 changes:
1. **Show new and overwritten courts on the summary page.** For each row, show whether it adds a court or overwrites an existing one, with the existing court's current name for an overwrite, and the totals ("12 new courts, 3 existing courts will be overwritten"). This is the safety net for hand-chosen IDs: a mistyped ID that hits an existing court is visible before anything is written. The lookup is one `findMany({ where: { locationId: { in: ids } }, select: { locationId: true, name: true } })`.
2. **Tell admins to upload only the rows they are adding or changing**, on the upload page. A stale full download re-uploaded reverts other admins' changes (c5).
3. **Validate provenance references against the database**, so a clash is a row-numbered error rather than a 500 (`reference-data-upload-summary/index.ts:125`).
4. **Fix two existing defects:** `reference-data-upload-summary/index.ts:71` logs the whole parsed file, including court emails and phone numbers; and `validation.ts:245` and `:276` put user-supplied region and sub-jurisdiction names into the error `html` without escaping them.

The CSV route stays English-only from the summary page onwards (§1.1). Making it bilingual is out of scope.

### 4.4 Why not the others, in one line each
- **A on its own:** there is still no way to add or fix one court without a file, which is what this issue asks for.
- **B on its own:** a form cannot add more than 100 courts at once.
- **C:** eight pages per court is more than one court needs once bulk work goes through the CSV, and its sequence clashes with admin-chosen CSV IDs.
- **D:** every new court needs a developer, a pull request and a release, the burden this issue exists to remove.
- **E:** removes the file but keeps every CSV defect, and is harder to use than uploading.
- **F:** depends on an upstream contract and a Welsh-name source that don't exist; it is a separate spike.

### 4.5 Evidence: the experiments

Scenario 1 is the evidence for Decision 2. Scenario 2 tested the sequence that was dropped on 2026-11-25; its step 7 is why it was dropped (§4.1). In both scenarios, the court at 100000 stands for any court the seed doesn't own, whichever route created it.

**Method.**
- Two throwaway databases in the local docker `cath-postgres` (localhost:5433), migrated with `prisma migrate deploy` via `apps/postgres/prisma.config.ts`.
- Seed SQL from the real `generateSeedSql()`, called by a harness in `/tmp/spike-1078/` that adds the throwaway entry in memory. `location-data.ts` was never edited.
- Applied with `psql -v ON_ERROR_STOP=1`, a file-based apply equivalent to the deploy's `prisma db execute --file` (`start.sh:105`).
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

`validateLocationData()` (`libs/system-admin-pages/src/reference-data-upload/validation/validation.ts`) pushes 21 errors. Every one is an English template literal with `href: "#file"`. The parser has four extra checks (`csv-parser.ts:45-80`: parse error, missing headers, `LOCATION_ID` required, `LOCATION_ID` integer). The add form keeps the two `LOCATION_ID` checks as `#locationId` errors and adds "not already used" (§4.1). The update form doesn't edit the ID.

The column below applies to both forms unless it says otherwise. The CSV keeps all 21 rules unchanged, plus ticket 4's database check on provenance references.

| # | CSV rule | Line | Group | Add and update forms |
|---|---|---|---|---|
| 1 | `LOCATION_NAME` required | 17 | Required | `#name` |
| 2 | `LOCATION_NAME` HTML tags | 22 | HTML | Same regex, `#name` |
| 3 | `WELSH_LOCATION_NAME` required | 29 | Required | `#welshName` |
| 4 | `WELSH_LOCATION_NAME` HTML tags | 34 | HTML | `#welshName` |
| 5 | `EMAIL` HTML tags | 41 | HTML | `#email` (+ format check, spec §9.1) |
| 6 | `CONTACT_NO` HTML tags | 48 | HTML | `#contactNo` (+ character set, spec §9.1) |
| 7 | `SUB_JURISDICTION_NAME` required | 55 | Required | At least one checkbox, fieldset error |
| 8 | `REGION_NAME` required | 62 | Required | At least one checkbox, fieldset error |
| 9 | Provenance triple required | 69 | Required | The reference is **optional** (Q7), but one that is started needs all three fields. The add form's success page says that upstream lists cannot be matched until a reference is added |
| 10 | `PROVENANCE` required | 77 | Required | `#provenance`, when a reference is started |
| 11 | `PROVENANCE` not in allowed set | 82 | Closed vocabulary | Radios make it impossible; still checked on the server |
| 12 | `PROVENANCE_LOCATION_ID` required | 89 | Required | `#provenanceLocationId`, when a reference is started |
| 13 | `PROVENANCE_LOCATION_TYPE` required | 96 | Required | `#provenanceLocationType`, when a reference is started |
| 14 | `PROVENANCE_LOCATION_TYPE` not in allowed set | 101 | Closed vocabulary | Radios make it impossible; still checked on the server |
| 15 | Duplicate (provenance, ID) within the file | 136 | In-file duplicate | Update form: a new reference is checked against the court's existing references |
| 16 | Name used by several IDs within the file | 151 | In-file duplicate | **Dropped deliberately** (one court per submission) |
| 17 | Welsh name used by several IDs within the file | 163 | In-file duplicate | **Dropped deliberately** |
| 18 | Name already in the DB at another ID (case-insensitive) | 192 | DB duplicate | Checked on submit; P2002 on `name` in the transaction → `#name` |
| 19 | Welsh name already in the DB at another ID | 212 | DB duplicate | Checked on submit; P2002 on `welsh_name` → `#welshName` |
| 20 | Sub-jurisdiction not found | 244 | Not found | Checkboxes come from the table; the server rejects unknown IDs |
| 21 | Region not found | 275 | Not found | Same |

**Reconciliation:** required 8 (rules 1, 3, 7, 8, 9, 10, 12, 13) + HTML 4 (2, 4, 5, 6) + closed vocabulary 2 (11, 14) + in-file duplicates 3 (15, 16, 17) + DB duplicates 2 (18, 19) + not found 2 (20, 21) = **21**. 19 have an equivalent (rule 9 now applies only to a reference that is started, Q7); 2 are dropped on purpose (16, 17); none is dropped silently.

Spec §9.5 has 19 rows because it folds rules 9, 10, 12 and 13 into one row and adds the parser's `LOCATION_ID` rule. It describes the same rules.

What the forms add:
- A database check on (provenance, provenanceLocationId). In the CSV route a clash is a 500 until ticket 4.
- "Location ID already used" on the add form.
- Bilingual, field-anchored errors.

Caveat: the case-insensitive checks are in the application, while the database unique index is case-sensitive. Two concurrent case-variant names could both pass. This is the same gap the existing journeys have, and the risk is low.

---

## 6. Open questions and risks

### 6.1 Questions and answers

Q1–Q12 were posted on #1078 on 2026-11-17. The developer's answers are below and are folded into §4 and §7; the questions as posted follow for the record. The change of direction on 2026-11-25 overrides some of them, as listed first.

**Change of direction (developer, 2026-11-25):**
- **The CSV upload stays for adding courts, not just editing them.** Sometimes more than 100 courts are added at once, which can't be done one at a time. Admins give each row a `LOCATION_ID`, making sure it is unique and increments by 1. This replaces the Q10 answer (update-only CSV) and answers the open bulk-edit half of Q4.
- **A single-page "Add a court or tribunal" form** for when only one court is needed, so the admin doesn't have to upload a CSV. **The admin enters the location ID** on the form. This replaces Option C and the Q3 answer (a sequence starting above the highest legacy ID).
- **A single-page "Update a court or tribunal" form** to change one court's details. This replaces S1 and makes it a build ticket (Q8).
- **Still apply:** Q1 and Q9 (freeze `location-data.ts`), Q2 (the seed fails the deploy on a reference clash), Q5 (no draft state), Q7 (the admin supplies the Welsh name; the reference is optional), Q11 (radios for provenance and type; keep the hub tiles; content design checks the hints), Q12 (System Admin only). Q6 (several references) is met by adding one on the add form and more on the update form.

**New questions (2026-11-25), both answered:**

> **Q13 (tech lead).** Should the add form reject IDs from 9000 upwards? On STG, E2E global setup upserts its fixture courts at 9001–9010 by ID (§4.1), so a real court given one of those IDs would be overwritten on the next E2E run.
>
> **Answer (developer, 2026-11-25): no rule and no hint text.** Real court IDs will not reach 9001.

> **Q14 (PO).** Should the update form allow renaming the 27 seeded courts? The deploy seed sets their English and Welsh names on every deploy (§4.2), so a rename lasts only until the next release. The CSV has the same problem today.
>
> **Answer (developer, 2026-11-25): do not make them read-only.** Every field stays editable for every court. A rename of a seeded court is reverted on the next deploy, and that is accepted.

**Answers to Q1–Q12:**

**Answers (developer, 2026-11-17 and 2026-11-18):**
- **Q1:** freeze `location-data.ts` at the 27 courts: **yes**. Fail-loudly guard (b): **yes**. Renumber the seeded courts to their legacy IDs first (S4): **yes for now**, may change.
- **Q2:** the deploy seed must **never overwrite an existing provenance reference**. A clash **fails the deploy**, and only a person changes or removes a reference, through the update form (ticket 3) or the CSV. Ticket 1 changes `generate-seed-sql.ts:111` as described in §4.2 item 4.
- **Q3 (superseded 2026-11-25: no sequence; the admin enters the ID, §4.1):** start the sequence at the **highest legacy CaTH production P&I ID + 1**, not 100000. The value comes from the legacy production export (S4); if production matches staging (highest 389), the start is 390. Every legacy load ends with the same `setval` as the migration, with the sequence's current next value added to the `GREATEST` (§4.1), so no margin is needed (§4.1). The E2E bands now sit above the start on STG and locally; §4.1 explains why that is safe, and why ticket 1's CSV guard uses the sequence's live value.
- **Q4 (superseded 2026-11-25: the CSV is also used to add 100+ courts at once; single-page forms for one court):** courts are added **one at a time**. The one-question-per-page journey stands. How often existing courts are edited in bulk is **still open**, and Decision 3 step 4 (whether to remove the CSV upload completely) depends on it.
- **Q5:** first answered as "starts as a draft". **Changed on 2026-11-18: no draft state.** A draft state would have to filter shared location readers that list pages, notifications and admin uploads also use, and needs a persistent publish route, for about 2 days. A new court is public as soon as it is confirmed.
- **Q6 ("add another" page superseded 2026-11-25: one reference on the add form, more on the update form):** **several** provenance references per new court. After the first, an "Add another reference?" step lets the admin add more (for example SNL and Common Platform), as the CSV route allows. This adds a page and the within-submission duplicate check (§5, rule 15) to ticket 2, about 1 day.
- **Q7:** the **System Admin** supplies the Welsh name. Provenance references are **usually not known** when a court is created, so the reference step is **optional**: the admin can skip it and add references later through the update form (ticket 3). Until a court has a reference, lists from upstream systems cannot be matched to it, so the add form's success page says so.
- **Q8:** amend a court is **in scope**: now the update form, ticket 3 (2026-11-25).
- **Q9:** extend the Q1 freeze to **regions, jurisdictions and sub-jurisdictions** in `location-data.ts`: a CI test fails if one is added there, so new ones only come from the admin pages. This removes the seed clash (`generate-seed-sql.ts:80`, `ON CONFLICT (region_id) DO UPDATE SET name`) without new sequences, and goes in ticket 1. A separate ticket for sequences on these tables is not needed; the remaining concurrent-create race is accepted.
- **Q10 (superseded 2026-11-25):** the CSV route becomes **update-only** (S2). The CSV now keeps creating courts (§4.3).
- **Q11:** **radio buttons** (not a select) for provenance and type; **keep the tiles** on the `/reference-data` hub; the spec's hint texts **need checking by content design** before build.
- **Q12:** **System Admin only**, matching legacy (`isPermittedSystemAdmin`) and this service (`requireRole([USER_ROLES.SYSTEM_ADMIN])`).

Q1–Q12 are answered; the 2026-11-25 decision above overrides Q3, Q4, Q8 and Q10 and the Option C parts of Q6. Q13 and Q14 are answered above. The questions as posted:

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
| A CSV row reuses an existing `LOCATION_ID` by mistake | That court is silently overwritten: names, contact details, mappings and references | Medium: files of 100+ rows with hand-chosen IDs | Ticket 4: the summary page shows each overwrite with the current court name before anything is written | Tech lead |
| A stale full download is re-uploaded | Other admins' changes are reverted (c5) | Medium | Ticket 4: upload page tells admins to upload only the rows they are adding or changing | PO |
| An admin gives a real court an ID in 9001–9010 on STG | Overwritten by E2E global setup | Very low: real IDs will not reach 9001 (Q13) | Accepted | Tech lead |
| A `locationData` name collides with a court the seed doesn't own | Court permanently parked as `__realign_<id>` (reproduced) | Low once frozen | Q1 freeze, enforced by the freeze test; guard (b) makes any collision fail the deploy instead (§4.2) | Tech lead |
| A `locationData` `id + 100` equals another court's SNL ID | Reference silently moved; publications go to the wrong court (reproduced) | Low once frozen | Q1; the Q2 `DO` block fails the deploy instead (§4.2); the forms' reference check | Tech lead |
| A seed clash fails the deploy | The postgres deploy pod stays red until a person fixes the reference or name | Low | Intended (Q1, Q2): loud failure instead of silent data change. The error names the clashing row | Tech lead |
| A seeded court is renamed through the CSV or the update form | The rename is reverted on the next deploy | Medium | Accepted (Q14); the names stay editable | PO |
| Legacy courts loaded after admins have added courts | A legacy ID equals an admin-chosen ID; the load fails or overwrites | Low; no production deployment yet | Load legacy courts before the forms are used in production; admins choose IDs above the highest legacy ID | Tech lead |
| Two sources of truth diverge | Court on STG but not locally | Medium | Update CLAUDE.md item 7 (§4.2) | Tech lead |
| Seeded court IDs differ from legacy CaTH IDs | If legacy courts are later loaded with their IDs, the seed renames them and their lists show under the wrong court | Medium, only if legacy data is migrated | Renumber the seeded courts before go-live (S4; Appendix A, re-checked against legacy production) | Tech lead |
| Concurrent case-variant names | Two courts differing only in case | Low | Accept, or add a `lower(name)` unique index in ticket 1 | Tech lead |
| F later proves the strategic answer | The forms become a fallback | Low | Any sync reuses ticket 1's service | PO |

---

## 7. Proposed follow-on tickets

These tickets are **described here only**. Apart from S3 (#1537), none is raised from the spike: whoever plans the build raises them from this section after sign-off, and attaches spec §4–13 by reference at that point. Where the spec and this report differ (single-page forms, an admin-entered ID, no sequence, radios not selects, an optional reference, no draft state), this report wins.

### 7.1 Build tickets

| # | Title | Size | Depends on |
|---|---|---|---|
| 1 | Court maintenance: service and seed guards | 2 d | — |
| 2 | Add a court or tribunal form | 2–3 d | 1 |
| 3 | Update a court or tribunal form | 2.5–3.5 d | 1 |
| 4 | Reference data CSV: show new and overwritten courts, and fix its defects | 1–1.5 d | — |
| | **Total** | **7.5–10 d** | |

Tickets 2 and 3 can be built in parallel once ticket 1 has merged. Ticket 4 is independent.

#### Ticket 1: Court maintenance: service and seed guards

**Summary.** Add the `court-maintenance` service that creates or updates one court in one transaction, and make the deploy seed fail rather than change a court it doesn't own. No schema change. Spike: #1078, report §4.

**Scope**
- `libs/system-admin-pages/src/court-maintenance/service.ts`: `validateCourt()`, `createCourt()`, `updateCourt()`, returning field error keys (for example `{ field: "locationId", key: "locationIdInUse" }`).
- `queries.ts`:
  - case-insensitive name lookups that exclude the court's own ID;
  - an ID-in-use lookup and `findHighestLocationId()` for the add form's hint;
  - a create transaction: `location` with the admin's ID, `location_region`, `location_sub_jurisdiction`, and zero or one `location_reference`;
  - an update transaction: update `location`; replace its regions and sub-jurisdictions by reusing `updateLocationJurisdictions()` (`jurisdiction-management/queries.ts:179`); remove the references the admin ticked and add at most one new one. It does not delete and re-create every reference, as `upsertLocations()` does.
- P2002 mapping by `meta.target`: `location_pkey` → `locationId`; `name`, `welsh_name` and (provenance, provenance_location_id) → field errors.
- `AuditLogAction.ADD_COURT = "Add court"` and `UPDATE_COURT = "Update court"` in `logger.ts`. Export the service from `libs/system-admin-pages/src/index.ts`.
- Freeze test (§4.2 guard a): the exact sets of court, region, jurisdiction and sub-jurisdiction IDs in `locationData` (Q1, Q9), failing with a message that points to the admin pages.
- Fail-loudly realign (§4.2 guard b, Q1): the location realign only renames rows whose `location_id` is one of `locationData`'s own IDs.
- Reference clash (§4.2 item 4, Q2): change `generate-seed-sql.ts:111` to the guarded `DO UPDATE … WHERE location_reference.location_id = EXCLUDED.location_id`, preceded by a `DO` block that raises an exception naming the clashing `(provenance, provenance_location_id)` if it belongs to a different location.
- Update CLAUDE.md item 7: courts, regions, jurisdictions and sub-jurisdictions are now added through the admin pages or the reference data CSV; `location-data.ts` is frozen. Change only the location half: item 7 also covers `list-type-data.ts`, which stays the source of truth for list types.

**Out of scope:** pages; renumbering the seeded courts (S4).

**Scenarios**
- *A non-seed court survives a deploy.* Given a court added by CSV or form, with mappings and references, when the seed runs twice, nothing about it changes.
- *Seed file frozen.* Adding a court, region, jurisdiction or sub-jurisdiction to `locationData` fails CI.
- *Name clash fails the deploy.* Given a non-seed court named like a new `locationData` entry, the generated seed fails on `location_name_key` and the court keeps its name.
- *Reference clash fails the deploy.* Given a non-seed court holding (SNL, "128"), a seed that would insert (SNL, "128") for another court raises an exception, the transaction rolls back and the reference is unchanged. A seed with no clash runs twice without error.
- *ID in use.* `createCourt()` with an existing ID returns a `locationId` field error and writes nothing, including when the clash only shows up as a P2002 in the transaction.
- *Atomicity.* If a reference insert fails, no rows remain.
- *Update keeps other data.* `updateCourt()` changes only the fields given, and leaves the court's metadata and unticked references alone.

**Spec:** §2, §6.2, §6.5, §6.6, §9.3, §9.4, §13.2, §13.6. **Size:** 2 d.

#### Ticket 2: Add a court or tribunal form

**Summary.** A single-page form in `apps/web/src/pages/(system-admin)/` to add one court without a CSV, on top of ticket 1's service. A new court is public as soon as it is saved.

**Scope**
- **Pages:** `add-court/` (the form) and `add-court-success/`. Each has `index.ts` (`GET`/`POST` `RequestHandler[]` behind `requireRole([USER_ROLES.SYSTEM_ADMIN])`), `index.njk`, `en.ts`, `cy.ts`, `index.test.ts` and `index.njk.test.ts`.
- **Fields, in order:**
  - location ID (`#locationId`, `inputmode="numeric"`), with a hint showing the highest ID in use;
  - English and Welsh names;
  - email and contact number, both optional;
  - regions as checkboxes, from `listRegions()`;
  - sub-jurisdictions as checkboxes grouped by jurisdiction, from `listJurisdictionsWithSubJurisdictions()`;
  - an optional provenance reference in a fieldset marked "(optional)": provenance and type as **radios** (Q11; values from `LOCATION_REFERENCE_PROVENANCES` and `LOCATION_REFERENCE_TYPES`), and the provenance location ID.
- **Validation:** §5 and §4.1. Trim and collapse whitespace; `HTML_TAG_REGEX` on the four text fields; empty email and contact number stored as null; a single ticked box posts a string and must be turned into an array; unknown region, sub-jurisdiction, provenance or type values are rejected. On error, re-render with the error summary and field errors, keeping every answer.
- **On success:** call `createCourt()`, set `req.auditMetadata = { shouldLog: true, action: AuditLogAction.ADD_COURT, entityInfo: "Name: …, Location ID: …" }` as `add-region` does, store `addCourtSuccess` in the session and redirect to the success page (POST-redirect-GET).
- **Success page:** a panel with the court name and ID, and inset text if no reference was added, saying lists from upstream systems cannot be matched to the court until one is added through the update form (Q7). With no `addCourtSuccess` in the session it redirects to `/reference-data`. Clears `addCourtSuccess`.
- **Session:** `addCourtSuccess` in `apps/web/src/session.ts`. The form itself keeps no session state.
- **CSRF:** the app registers no CSRF token middleware; POSTs rely on the session cookie's `SameSite=Lax` (`libs/web-core/src/middleware/session-stores/redis-store.ts:21`), as for the existing admin pages.
- **Hub entry:** an "Add a court or tribunal" tile in `reference-data/en.ts` and `cy.ts` `options` (Q11 keeps the tiles).
- **Content:** the field hints go to content design before build (Q11).
- **E2E:** one Playwright journey in `e2e-tests/tests/`, with a prefixed name and an unused ID from the CSV E2E range (80000–89999), found the way `location-csv.ts` does, so teardown removes it.

**Scenarios**
- *ID in use.* An existing ID gives "Location ID … is already used by <court name>", linked to `#locationId`; the other answers are kept.
- *Duplicate names.* A duplicate in any case links to `#name` / `#welshName`.
- *Markup.* `<script>` in a text field gives a field error.
- *Nothing ticked.* No region or sub-jurisdiction gives a fieldset error.
- *Half a reference.* A provenance with no ID gives errors on the missing fields; a fully empty reference is accepted.
- *Duplicate reference.* (SNL,"104") links to `#provenanceLocationId`; nothing is written.
- *Tampered POST.* An unknown region ID, or a provenance or type outside the vocabulary, is rejected on the server.
- *Welsh.* With `?lng=cy` everything is Welsh, and the `en`/`cy` keys match.
- *A System Admin adds a court (@nightly).* Dashboard → `/reference-data` → add form. On the way: submit empty and check the summary links; enter an ID in use; switch to Welsh on an error; run axe on the error state; fill the form with the keyboard; save. Then the panel shows the ID, the court is in the public A–Z in English and Welsh, and `ADD_COURT` is in `/audit-log-list`.
- *Unauthorised user refused (@nightly).* Without `SYSTEM_ADMIN`, `GET` and `POST` are refused and nothing is written.
- *Resubmission.* Refreshing the success page doesn't add the court again.

**Spec:** §5.1–5.4, §6.3, §9.1–9.4, §10, §11 (as single-page fields, not steps). **Size:** 2–3 d. **Depends on:** ticket 1.

#### Ticket 3: Update a court or tribunal form

**Summary.** Find one court and change its details on a single page, without a CSV, using ticket 1's service.

**Scope**
- **Pages:** `update-court-search/`, `update-court/` and `update-court-success/`, with the same files per page as ticket 2.
- **Search:** the location autocomplete, as `location-jurisdiction-search/index.ts` does (`getLocationWithDetails()`); stores `updateCourt = { locationId }` in the session. `update-court/` redirects to the search page without it.
- **Form:** the add form's fields, pre-filled, except:
  - the location ID is shown as text, not an input;
  - clearing email or contact number removes it;
  - existing references are listed with a "Remove" checkbox each, followed by one optional new reference (Q6: add more by saving again).
- **On success:** call `updateCourt()`; audit `UPDATE_COURT` with `entityInfo: "Name: …, Location ID: …"`; redirect to the success page, which clears `updateCourt`.
- **Overlap:** `location-jurisdiction-manage` already edits a court's regions and sub-jurisdictions. Leave it in place; the update form reuses its query. Removing it is a separate decision.
- **Hub entry:** an "Update a court or tribunal" tile.
- **E2E:** one Playwright journey, with a court created through test-support's generated-ID path.

**Scenarios**
- *Change details.* Changing the names and contact number updates the court and keeps its regions, sub-jurisdictions, references and metadata.
- *Duplicate name.* Another court's name links to `#name`; the court's own name is allowed.
- *Remove and add a reference.* Ticking "Remove" deletes only that reference. A new reference that belongs to another court links to `#provenanceLocationId`.
- *Court deleted meanwhile.* The form shows "Court not found" and links back to the search.
- *Deep link.* With no `updateCourt` session, `update-court/` redirects to the search page.
- *Welsh.* With `?lng=cy` everything is Welsh, and the `en`/`cy` keys match.
- *A System Admin updates a court (@nightly).* Search, change the contact number, remove a reference, add a reference, check validation and Welsh on the way, run axe, save; then the change shows on the court and `UPDATE_COURT` is in `/audit-log-list`.
- *Unauthorised user refused (@nightly).*

**Size:** 2.5–3.5 d. **Depends on:** ticket 1.

#### Ticket 4: Reference data CSV: show new and overwritten courts, and fix its defects

**Summary.** Keep the CSV for bulk add and update, and make an accidental overwrite visible before anything is written (§4.3).

**Scope**
- `reference-data-upload-summary`: for each row, show "New court" or "Overwrites <current name>", with totals above the table. One `findMany` for the file's IDs.
- `reference-data-upload`: guidance to upload only the rows being added or changed.
- `validateLocationData()`: reject a (provenance, provenance location ID) that belongs to a different court in the database, with a row-numbered error.
- Stop `reference-data-upload-summary/index.ts:71` logging the parsed file; escape user-supplied names in the `html` errors at `validation.ts:245` and `:276`.

**Scenarios**
- A file with two new IDs and one existing ID shows "2 new courts, 1 existing court will be overwritten", naming the existing court.
- A reference held by another court is a row-numbered validation error, not a 500.
- A region name containing markup is shown as text in the error.
- The summary's logs contain no court emails or phone numbers.

**Size:** 1–1.5 d. **Depends on:** nothing.

### 7.2 Sibling tickets

**S3: Discovery spike: syncing courts from an upstream source.** Already raised as #1537 and kept open, because it is research rather than build work. Can SNL, Common Platform or another source supply names, Welsh names, references and closures? Who owns the contract? What reconciliation policy is needed without soft delete? Output: a report like this one. Time-boxed to 3 d.

**S4: Align seeded court IDs with legacy CaTH (Q1).** Get the legacy CaTH **production** reference-data export, re-check Appendix A against it, and renumber the seeded courts in `location-data.ts` to their legacy IDs before go-live, with a reviewed mapping for the three courts with no exact match. The same export gives the highest legacy ID, above which admins choose new court IDs (§4.1). Must land before any legacy load. The mapping must be final and reviewed before the migration merges: Prisma checksums applied migrations, so a later correction needs a second migration.
- **Also in scope.** Replace the hard-coded SJP `locationId=9` in `apps/web/src/pages/(verified)/account-home/index.njk:22` and `apps/web/src/pages/(public)/view-option/index.ts:42` with a constant or a lookup by name. Decide whether real legacy provenance references replace the synthetic `SNL:(id + 100)` ones (`generate-seed-sql.ts:106`). Update E2E fixtures, `libs/test-support` and unit tests that assert on a seeded court's ID. Update CLAUDE.md item 7 to say seeded court IDs must match legacy P&I IDs. If ticket 1 has merged, update its freeze test to the new ID set in the same PR.
- **Done when** every seeded court's `locationId` equals its legacy production P&I ID, or there is a recorded decision for each of the three unmatched courts (which must not take an ID a legacy court uses). No code depends on a hard-coded seeded ID. The migration and seed run twice on a fresh database and on an STG copy, with and without ticket 1's guards, leaving no `__realign_` rows and exactly one `seedref_<new id>` per moved court. Those runs include a seeded court whose SNL reference has a cuid ID (step 2), an orphan artefact or subscription at a target ID (step 1), and a check that the chained artefacts and subscriptions for courts 7 and 24 end up on the right courts. The mapping needs a second reviewer, and the raw legacy export holds court contact details, so it must not be committed.
- **It moves its own rows.** Once ticket 1's guard (b) is in, the seed no longer parks old rows, so a deploy that only edits `location-data.ts` would fail on `location_name_key` (for example, STG row 4 still holds "Royal Courts of Justice" when the seed inserts it at 109). S4 therefore ships a one-off Prisma migration, which runs before the seed (`apps/postgres/start.sh:95`, then `:104-105`), wrapped in its own `BEGIN`/`COMMIT`:
  1. **Pre-check.** Raise an exception if any target ID is held by a `location` row that is not itself one of the seeded courts being moved, or by a non-moving `artefact.location_id` or `subscription.search_value` (where `search_type = 'LOCATION_ID'`, `libs/subscriptions/src/repository/queries.ts:89`). Those two columns have no foreign key, so a deleted court's rows can stay behind at a target ID: phase 2 would attach orphan artefacts to the moved court, or fail on the subscription unique key. Optionally also check that each moving row has its expected seeded name. Write the check as one `DO $$ … RAISE … $$` block with a header comment explaining the failure, following `20261007120000_rename_list_types_to_shared_model/migration.sql`.
  2. **Delete the moving courts' synthetic seed references**, matching by value as well as by ID: `WHERE provenance = 'SNL' AND provenance_location_id = (location_id + 100)::text AND location_id IN (<moving old ids>)`, plus `location_reference_id = 'seedref_<old id>'`. Matching by ID alone misses a seeded court that has been through a CSV upload, which re-creates its references with cuid IDs (`upload-repository.ts:104-118`) that the seed then keeps. `seedmeta_<id>` needs the same care if a moving court ever gets seed metadata (today only SJP has it, and SJP keeps 9). Otherwise the foreign key carries each one to the new ID, and the chained moves leave it on the wrong court: seeded 7 moves to 147 and seeded 24 moves to 7, so `seedref_7`'s (SNL, "107") would end up on 147 while the seed inserts (SNL, "107") for location 7, which ticket 1's Q2 check rejects (and today's seed clause would silently move to the wrong court). The seed recreates every `seedref_<new id>` on the next run.
  3. **Move in two phases through a negative offset**: first every moving court to `-<old id>`, then to `<new id>`, so no two rows hold one ID at once. `location_reference`, `location_region`, `location_sub_jurisdiction` and `location_metadata` follow through their foreign keys' `ON UPDATE CASCADE`. `artefact.location_id` (`libs/postgres-prisma/prisma/schema/base.prisma:14`) and `subscription.search_value` for location subscriptions (`subscription.prisma:5`) are strings with no foreign key, so the migration moves them explicitly through the same two phases. This matters for `subscription`, whose unique key on (user, search type, search value) would otherwise merge or reject two courts' subscriptions mid-move.

  If the migration fails, the transaction rolls back and the deploy stops. On a deployed environment `start.sh:80-91` marks the unfinished migration as rolled back and the next pod start retries it, so a failing pre-check fails every postgres pod start until the data is fixed: delete or renumber the STG court that holds the target ID, then redeploy. Locally, run `prisma migrate resolve --rolled-back` (or `yarn db:drop`) before retrying. After it runs, the seed finds every court at its new ID, parks nothing and raises nothing, with or without ticket 1, so S4 can ship before or after it. Guard (b) and the Q2 check stay as the safety net.

Dropped on 2026-11-25:
- **S1 (amend a court)** is now build ticket 3.
- **S2 (update-only CSV)** is replaced by ticket 4: the CSV keeps creating courts.
- **The `location_id` sequence and its interim CSV guard** (the earlier ticket 1) are no longer needed (§4.1).

---

## 8. Review against the plan's checklist (scenario 3)

| Check (plan §5.2) | Where | Result |
|---|---|---|
| Six options with pros, cons and effort | §2, §3 | Yes (F "not estimable") |
| Exactly one recommendation | Top box, §4 | CSV for bulk work plus single-page add and update forms (2026-11-25; Option C before then) |
| Decisions 1–3 with evidence | §4.1–4.3, §4.5 | Yes; both experiments ran on a database |
| ID strategy, incl. E2E bands | §4.1 | Admin-chosen in every route; sequence dropped; 9001–9010 risk accepted (Q13) |
| 21 parity rules reconciled | §5 | 8+4+2+3+2+2 = 21, with line numbers |
| CSV route's future stated | §4.3 | Kept for bulk add and update; ticket 4 |
| Questions assigned to owners | §6 | Q1–Q14 each have an owner |
| Follow-on tickets listed | §7 | 4 build + 2 sibling, described in full; none raised from the spike |
| One-line rejection for each option not chosen | §4.4 | Yes |
| Every option scored against the five constraints | §2 | Columns c1–c5 |

Gaps closed during review:
- added constraint columns to the matrix;
- added P1–P9;
- added the CSV-minted-ID collision to Decision 1, Decision 3, the risks and S2;
- added the Q2 variant evidence;
- corrected the c5 wording and the C estimate.

Revised after the first review, which raised three high-priority issues:
- **STG not measured:** added the STG query as a ticket 1 prerequisite and to Q3. The migration now ends with `setval(GREATEST(100000, MAX + 1))` instead of a bare `RESTART` (§4.1, ticket 1, §6.2).
- **Seed test could not fail:** replaced the "realign comes only from `locationData`" test, which always passes, with a freeze test on IDs 1–27. Added an optional fail-loudly realign guard for the tech lead to decide on under Q1 (§4.2, ticket 1, Q1, §6.2).
- **CSV gap before S2:** added an interim guard to ticket 1 that rejects CSV `LOCATION_ID`s at or above the sequence start (§4.1, ticket 1, S2, §6.2, recommendation box).

Revised after the second review: the interim guard as first written rejected *every* ID at or above the start, including UI-created courts, which would break re-uploading a full download. It now rejects only IDs in that range that do not already exist, and ticket 1 gains a scenario showing that existing UI courts still update (§4.1, ticket 1, risks, recommendation box).

Revised on 2026-11-17, after discussion with the developer:
- **Tickets 2–5 merged** into one journey ticket (ticket 2), because the pages cannot ship usefully apart (§7.1).
- **Decision 3 rewritten as a phased plan:** journey, then S2, then S1, then decide whether to remove the CSV completely, using Q4 (§4.3).
- **Legacy CaTH (PIP) section added** (§1.7). It records that no add-a-court page ever existed.

Revised after the third review: Q1 option B now requires a reviewed legacy-to-seeded court mapping, an upsert rather than a replace of `location`, and a `setval(GREATEST(...))` at the end of the load (22 of the 27 seeded courts have a different legacy ID). Q4 now also asks about bulk edits. Three citations were corrected: §6 not §4, the partly-translated legacy pages, and the spec §3 wording.

Revised on 2026-11-17 with a legacy staging export: added Q1 options D (renumber the seeded courts to legacy IDs) and E (stop the seed writing courts); corrected the SJP claim (legacy data has SJP at 9, not 0); recorded the 27-court comparison in Appendix A.

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

Revised on 2026-11-25 at the developer's request:
- **The CSV upload stays for adding and updating courts in bulk** (sometimes more than 100 at once), with admin-chosen IDs. Decision 3 and S2 (update-only CSV) are replaced by ticket 4, which shows new and overwritten courts on the summary page and fixes the CSV's defects.
- **Option B replaces Option C:** single-page add and update forms. The admin enters the location ID on the add form.
- **The `location_id` sequence is dropped** (Decision 1, the old ticket 1's migration and interim CSV guard), because a sequence cannot sit next to admin-chosen CSV IDs (§4.5 scenario 2 step 7).
- **Decision 2 (freeze and seed guards) is kept**, and now covers courts from the CSV as well as the forms.
- **S1 (amend a court) becomes build ticket 3.** Tickets are now 1 (service and seed guards), 2 (add form), 3 (update form) and 4 (CSV), at 7.5–10 d.
- **Q13 and Q14 added and answered:** no rule for the E2E fixture IDs 9001–9010 on STG, because real court IDs will not reach them; seeded courts stay fully editable on the update form, and a rename being reverted on deploy is accepted.

Needs a person: tech lead and PO sign-off on this report, then raising the §7 tickets with spec §4–13 attached, then closing #1078.

---

## Appendix A: Seeded courts vs legacy CaTH court IDs

Source: legacy CaTH reference data export (`referenceData.csv`, 367 courts, 686 rows, P&I IDs 1–389; none at or above 100000). Environment: **old CaTH staging** (confirmed by the developer, 2026-11-17). Old CaTH admins chose IDs per environment, so re-check against an old CaTH production export before renumbering anything. Matched on English name, then Welsh name, ignoring case and punctuation. Generated 2026-11-17 for the #1078 report (§1.7, Q1).

| Seeded ID | Seeded name | Legacy P&I ID | Legacy court currently at the seeded ID |
|---|---|---|---|
| 1 | Oxford Combined Court Centre | **no exact match** — nearest: 99 Oxford Magistrates' Court (different court?) | Test Location |
| 2 | Birmingham Civil and Family Justice Centre | 16 | Test Location Other |
| 3 | Manchester Civil Justice Centre | 29 | Test Location Other 2 |
| 4 | Royal Courts of Justice | 109 | Unknown Location |
| 5 | Cardiff Civil and Family Justice Centre | 199 | — |
| 6 | Leeds Combined Court Centre | 267 | — |
| 7 | Bristol Civil and Family Justice Centre | 147 | Liverpool Social Security and Child Support Tribunal |
| 8 | Liverpool Civil and Family Court | 175 | — |
| 9 | Single Justice Procedure | 9 | Single Justice Procedure |
| 10 | Newcastle Combined Court Centre | **no exact match** — nearest: 35 Newcastle Civil & Family Courts and Tribunal Centre, or 232 Newcastle upon Tyne Crown Court and Magistrates' Court | — |
| 11 | Birmingham Crown Court | 316 | — |
| 12 | Birmingham Magistrates' Court | 345 | — |
| 13 | First-tier Tribunal (Special Educational Needs and Disability) | 157 | Slough County Court and Family Court |
| 14 | Criminal Injuries Compensation Tribunal | 119 | High Wycombe Magistrates' Court and County Court |
| 15 | East London Tribunal Service | **no exact match** — nearest: 247 East London Family Court (different court?) | Milton Keynes Magistrates' Court and Family Court |
| 16 | Asylum Support Tribunal | 98 | Birmingham Civil and Family Justice Centre |
| 17 | Midlands Social Security and Child Support Tribunal | 102 | Coventry Magistrates' Court |
| 18 | South East Social Security and Child Support Tribunal | 103 | Nottingham Justice Centre |
| 19 | Wales and South West Social Security and Child Support Tribunal | 104 | Bradford Tribunal Hearing Centre |
| 20 | Scotland Social Security and Child Support Tribunal | 105 | — |
| 21 | North East Social Security and Child Support Tribunal | 106 | Leeds Magistrates Court and Family Court |
| 22 | North West Social Security and Child Support Tribunal | 107 | Glasgow Tribunals Centre |
| 23 | London Social Security and Child Support Tribunal | 108 | Alloa Sheriff Court |
| 24 | Liverpool Social Security and Child Support Tribunal | 7 | Belfast Laganside Court |
| 25 | Primary Health Tribunal | 71 | Hatton Cross Tribunal Hearing Centre |
| 26 | Business and Property Division Rolls Building | 111 — **same court, confirmed** by the developer against its GOV.UK court page (2026-11-17); English and Welsh names differ ("Division"/"Adran" here, "Courts"/"Llysoedd" in old CaTH). GOV.UK shows "Business and Property Courts Rolls Building", matching legacy; renaming the seed is not being pursued for now | Harmondsworth Tribunal Hearing Centre |
| 27 | First-tier Tribunal (Property Chamber) - Residential Property Division | 84 | Manchester Tribunal Hearing Centre |
