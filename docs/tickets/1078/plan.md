# Technical Plan: #1078 Spike, Court Maintenance

> **This is a spike.** The deliverable is an investigative report at `docs/tickets/1078/report.md`
> and a set of follow-on build tickets. **No production code lands under #1078.** There are no pages,
> no migration, no service and no content files. Anything below that describes the recommended
> option is there so it can be lifted into build tickets. Throwaway experiments against a local
> database are in scope (§5.1). They are evidence for the report, and they are not committed.

Ticket format is `full`. Wireframes, per-page content, validation tables, error messages,
accessibility notes and the detailed build-level test matrix are in the `/spec` comment on #1078
(sections 5 to 13). This plan refers to them and does not copy them.

---

## 1. Technical Approach

### 1.1 Strategy

The work has two parts.

- **(a) Investigation and report.** Confirm how courts are added today, list the realistic
  alternatives, score each one against the hard constraints in §1.3, settle the three decisions that
  any recommendation depends on (ID allocation, deploy-seed protection, the future of the CSV route),
  and write `report.md` with an options matrix and one highlighted recommendation.
- **(b) Recommended option, specified.** Give Option C enough shape that build tickets can be raised
  without repeating the analysis (§2.4). It is sized here and not built.

### 1.2 The problem

Today a System Admin can add a court only through a CSV round-trip:

1. `GET /reference-data-download` exports the estate.
2. The admin edits the file in a spreadsheet and makes up the `LOCATION_ID`.
3. `POST /reference-data-upload` takes the file.
4. `GET` and `POST /reference-data-upload-summary` preview the rows and then write them with
   `upsertLocations()`.

Every neighbouring piece of reference data already has a non-CSV journey in
`apps/web/src/pages/(system-admin)/`:

- regions: `add-region`, `region-data-*`
- jurisdictions and sub-jurisdictions: `add-jurisdiction`, `add-sub-jurisdiction`,
  `jurisdiction-data-*`
- location to jurisdiction/region mapping: `location-jurisdiction-*`
- location metadata: `location-metadata-*`
- deleting a court: `delete-court*`

The core `location` row is the only one without such a journey. That gap is the main finding: the
work fills in a pattern that already exists rather than inventing a new one.

### 1.3 Hard constraints, re-verified against the code on 2026-11-13 (origin/master `65eb3d72`)

1. **`Location.locationId Int @id`, with no default and no sequence**
   (`libs/postgres-prisma/prisma/schema/location.prisma`). Every writer has to supply the ID.
2. **`name` and `welshName` are both `@unique` and NOT NULL.** `email` and `contactNo` are nullable.
   A court cannot exist without an authoritative, unique Welsh name.
3. **The deploy seed realigns names first.** `apps/postgres/prisma/generate-seed-sql.ts`
   (`generateSeedSql()`, run by `apps/postgres/start.sh`) emits
   `generateRealignSql("location", "location_id", …)`. This parks any row whose `name` or
   `welsh_name` matches a `locationData` entry as `__realign_<id>`, and only then runs
   `INSERT … ON CONFLICT (location_id) DO UPDATE SET name, welsh_name`. Locations have no
   reconciliation pass, so a row whose ID is outside `locationData` is never touched **unless its
   name collides** with a later `locationData` addition. In that case it stays parked.
4. **The seed takes over provenance references.** `generateLocationReferencesSql()` inserts
   `('seedref_<id>', id, 'SNL', String(id + 100), type)` with
   `ON CONFLICT (provenance, provenance_location_id) DO UPDATE SET location_id = EXCLUDED.location_id`.
   If a UI-created court holds `(SNL, "128")` and a later `locationData` entry gets ID 28, the next
   deploy silently **moves that reference to location 28**. The local seed (`seedLocationData()` in
   `libs/location/src/seed-data.ts`) uses `locationReference.create` instead and would fail with
   P2002 in the same case. The synthetic `id + 100` values could also clash with real SNL venue IDs.
5. **`upsertLocations()` rewrites every row in the uploaded file**
   (`libs/system-admin-pages/src/reference-data-upload/repository/upload-repository.ts`). For each
   row it runs `deleteMany` and then re-creates `location_sub_jurisdiction`, `location_region` and
   `location_reference`. Because the documented workflow starts from a full download, a stale file
   reverts other admins' edits, and a blank column wipes existing mappings.

### 1.4 What changed since the prior plan (September 2026)

Each claim in `feature/1078-court-maintenance-spike-plan` was re-checked. These are the corrections:

| Prior claim | Current code | Effect on the plan |
|---|---|---|
| "Prisma sequence migration … in `libs/postgres-prisma/`" | Migrations live in `apps/postgres/prisma/migrations/`. `apps/postgres/prisma.config.ts` points the schema at `libs/postgres-prisma/prisma/schema` and the migrations at its own `prisma/migrations` | The build ticket's migration path is corrected in §2.5 |
| ID allocation framed as a choice between three new strategies | **The existing create journeys already use application-side `MAX + 1`.** `createJurisdictionRecord()` (`libs/system-admin-pages/src/jurisdiction-management/queries.ts`) does this for jurisdiction and region with no lock, and for sub-jurisdiction under `LOCK TABLE … IN EXCLUSIVE MODE`. `createRegion()` in `reference-data-upload/repository/region-repository.ts` does the same | The report must explain why location should not follow this precedent (§2.3, Decision 1). It must also flag that regions and jurisdictions already carry the seed-collision hazard (§6, Q9) |
| "~99,973 IDs of headroom" above the seeded band | **E2E tests own 80000–99999.** `libs/test-support/src/routes/test-support/locations.ts` uses `randomInt(90000, 100000)`, and `e2e-tests/utils/location-csv.ts` uses 80000–89999. Fixture 9001 is also required (`e2e-tests/utils/verify-seed-data.ts`). On STG, `MAX(location_id)` is therefore already in the 9xxxx test band | Strengthens the case against `MAX + 1`. A sequence starting at 100000 is still disjoint but sits right next to the test band, so the proof must include these ranges (§2.3) |
| `+100` provenance values described as "a second collision surface" | The seed's `ON CONFLICT … DO UPDATE SET location_id` **re-points** a matching reference rather than just colliding (constraint 4) | Raised from a uniqueness check to a deploy-seed protection decision |
| `upsertLocations()` is "whole-estate" | It writes every row **in the file**, merged per ID by `mergeByLocationId()`. That is the whole estate only because the workflow starts from a full download | Wording corrected |
| "`SystemAdminSession` extended with an `addCourt` namespace in `session-types.ts`" | There is no `SystemAdminSession`. Session keys are added to the `express-session` `SessionData` augmentation in `apps/web/src/session.ts` (for example `regionSuccess`, `uploadData`). `libs/system-admin-pages/src/session-types.ts` only holds the `LocationMetadataSession` and `JurisdictionDataSession` interfaces | The build ticket adds `addCourt` and `addCourtSuccess` to `apps/web/src/session.ts` |
| Spec §4.2: `locationData` holds "~1–50" courts | It holds exactly IDs 1–27 (`libs/location/src/location-data.ts`, now 485 lines). The prior plan's figure of 27 was right and the spec's figure is stale | No change |
| Not covered | The CSV route never checks `(provenance, provenanceLocationId)` against the database, and `upsertLocations()` is called with no `try/catch` in `reference-data-upload-summary/index.ts`. A clash therefore surfaces as a 500. CSV error strings are English-only template literals | Adds two rows to the parity mapping (§3.6) |
| Not covered | `location.deleted_at` was dropped in `20260818000000_remove_location_soft_delete`, and courts are now hard-deleted | Confirms that locations have no soft-delete or reconciliation story at all, which matters for Option F |

These prior claims still hold: 21 `ValidationError` pushes in `validation.ts`, all with
`href: "#file"`; `AuditLogAction` has no `ADD_COURT`; there is no cache over
`libs/location/src/repository/*`; `getLocationWithDetails()` exists; `LOCATION_REFERENCE_PROVENANCES`
and `LOCATION_REFERENCE_TYPES` are unchanged; the `/reference-data` hub is a four-entry radio list in
`reference-data/en.ts` and `cy.ts`.

### 1.5 The central architectural tension

CLAUDE.md names `libs/location/src/location-data.ts` as the single source of truth for locations. A
UI write path creates a second source of truth for the same table, and constraints 3 and 4 make
drift between the two destructive rather than just untidy. This needs a tech-lead decision (§6, Q1).
The recommended position is:

- freeze `location-data.ts` for **new** courts once the UI ships, and keep it for the seeded 27;
- document the split in CLAUDE.md;
- treat UI-created courts as data local to each environment.

---

## 2. Implementation Details

TEMPLATE SOURCE: n/a

### 2.1 Spike deliverable

One file, `docs/tickets/1078/report.md`, with these sections:

1. Current state, the five constraints (§1.3) with file references, and the asymmetry finding.
2. Options matrix (§2.2).
3. A short subsection per option, ending in a one-line verdict.
4. The recommendation, clearly highlighted, with the three decisions (§2.3) and the evidence from the
   experiments in §5.1.
5. Validation parity mapping (§3.6), reconciled to 21 rules.
6. Open questions and risks, each with an owner.
7. Proposed follow-on tickets, sized and in order (§2.5).

### 2.2 Options matrix

| # | Option | Pros | Cons | Effort | Verdict |
|---|---|---|---|---|---|
| A | Keep the CSV round-trip | No cost; live and tested; good for bulk | Fails the premise of the issue. The admin makes up the primary key (c1). The file rewrite reverts other admins' work (c5). All 21 errors point at `#file` (WCAG 3.3.1 and 3.3.3). The audit records a filename, not a court | 0 d | Rejected |
| B | Single "Add a court" page with about nine inputs | Cheapest real journey; same shape as `add-region` | Breaks one-thing-per-page with two multi-select fieldsets and two closed vocabularies. No check-answers step before a write to a unique column. Hard to recover from errors on a long page | 2–3 d | Fallback. Shares C's service layer |
| C | One question per page: names → contact → regions → sub-jurisdictions → provenance → check answers → confirmation | The standard GOV.UK pattern for this many inputs. Every error links to a real field. Check-answers acts as a review gate. Reuses tested building blocks. A per-court write cannot revert other courts. Extends to an "amend court" journey | Seven pages to build, translate and test. Needs session state and a deep-link guard. Slower than CSV for bulk work | 5–8 d | **Recommended** |
| D | A developer edits `location-data.ts` and the deploy seed propagates it | One source of truth; reviewed and reproducible | Needs a developer, a pull request and a release for every court, which is the burden this issue exists to remove | 0 d UI | Rejected as the primary route. Record it as the current documented mechanism |
| E | Paste CSV into a textarea and reuse `parseCsv()` | About half a day | Meets the wording of the ticket but not its intent, and keeps every CSV defect. Hand-typed CSV is harder to use and less accessible than a file picker | 0.5 d | Rejected |
| F | Sync automatically from upstream SNL or Common Platform | Removes manual maintenance | Depends on another team and an upstream contract that nobody has established. Needs a reconciliation policy, and locations no longer have soft-delete. Welsh names are unlikely to be available upstream | Not estimable | Separate discovery spike. C is a prerequisite either way |

### 2.3 Recommendation: Option C, with three supporting decisions

**Decision 1: allocate `location_id` from a Postgres sequence starting at 100000.**

> Superseded: the report starts the sequence at the highest legacy production ID + 1, not 100000 (report §4.1 and Q3). The 100000 figures below are the plan as written.

| Strategy | Analysis | Verdict |
|---|---|---|
| Application-side `MAX + 1`, as `createJurisdictionRecord()` and `createRegion()` already do | On STG, `MAX(location_id)` sits in the E2E band 90000–99999, so new IDs would land on top of IDs that `randomInt(90000, 100000)` hands out at random. Without a lock it races between pods. With a table lock, as sub-jurisdiction uses, it serialises writes but still lands next to test data. When run locally it produces 28, which is the next `locationData` ID | Rejected for location. The precedent holds for regions only because those bands are not shared with test fixtures, and it is already fragile there (§6, Q9) |
| `@default(autoincrement())` from 1 | Hands out 1, 2, … and collides with `locationData` 1–27. The seed's `ON CONFLICT (location_id) DO UPDATE` would then rename the UI court | Rejected |
| **Sequence `START WITH 100000`** | Disjoint from `locationData` (1–27), the `SNL` provenance IDs (101–127), fixture 9001, CSV E2E IDs (80000–89999) and API E2E IDs (90000–99999). `nextval` is atomic, so there is no race. The seed's explicit IDs bypass the default and never advance the sequence | **Chosen.** Requires a regression test that asserts the bands stay disjoint (§5.3) |

**Decision 2: protect courts from the deploy seed.**

- Freeze `locationData` for new courts (§6, Q1). This removes both the name-realign hazard (c3) and
  the reference takeover (c4).
- In the build, the UI must reject an `(SNL, id)` pair that already exists. This is already covered
  by a database uniqueness check, because the seeded references exist in every deployed environment.
- Add a regression guard in `apps/postgres/prisma/generate-seed-sql.test.ts` asserting that the
  realign `WHERE` clause and the reference rows come only from `locationData`.
- Raise with the tech lead whether `generateLocationReferencesSql()` should stop re-pointing on
  conflict, by adding `WHERE location_reference.location_id = EXCLUDED.location_id` or switching to
  `DO NOTHING` (§6, Q2).

**Decision 3: keep the CSV route for bulk work, and restrict it to update-only in a follow-on
ticket.** It would reject a `LOCATION_ID` that does not already exist, so the CSV route can no
longer mint primary keys.

### 2.4 Recommended option: shape for the build tickets

Pages go in `apps/web/src/pages/(system-admin)/`, following the flat `add-*` naming of `add-region`
and `add-sub-jurisdiction`. Each page has `index.ts` (`GET` and `POST` as `RequestHandler[]` behind
`requireRole([USER_ROLES.SYSTEM_ADMIN])`), `index.njk`, co-located `en.ts` and `cy.ts`,
`index.test.ts`, and `index.njk.test.ts`. The pages are:

```
add-court-name/                  English + Welsh name
add-court-contact-details/       email + contact number (optional)
add-court-regions/               region checkboxes (at least one)
add-court-sub-jurisdictions/     grouped sub-jurisdiction checkboxes (at least one)
add-court-provenance-reference/  provenance, provenance location ID, type
add-court-check-answers/         summary list with Change links; POST performs the write
add-court-success/               panel with the court name and allocated ID
```

Business logic goes in `libs/system-admin-pages/src/court-maintenance/`:

- `service.ts`, providing `validateCourtNames()`, `validateProvenanceReference()` and
  `createCourt()`. Each returns field-anchored errors as stable keys (for example
  `{ field: "name", key: "nameDuplicate" }`), and the controller resolves them from `en` or `cy`.
  This deliberately departs from `createJurisdictionData()`, which hardcodes English error text in
  the service (for example `"Select a jurisdiction"`).
- `queries.ts`, holding the uniqueness lookups (case-insensitive, `mode: "insensitive"`) and a single
  `prisma.$transaction` that creates `location` with no `locationId` passed, then
  `location_region`, `location_sub_jurisdiction` and `location_reference`. Rows are created only;
  there is no `deleteMany`.
- Co-located `*.test.ts` files.

Other changes:

- `AuditLogAction.ADD_COURT = "Add court"` in `libs/system-admin-pages/src/audit-log/logger.ts`.
  The check-answers `POST` sets
  `req.auditMetadata = { shouldLog: true, action, entityInfo: "Name: …, Location ID: …" }`, matching
  `add-region`.
- Session keys `addCourt` (answers in progress) and `addCourtSuccess` in the `SessionData`
  augmentation in `apps/web/src/session.ts`.
- A fifth radio entry on `/reference-data` in `en.ts` and `cy.ts`.
- Export the new service functions from `libs/system-admin-pages/src/index.ts`.
- No new API routes. `GET /api/locations` is unchanged, and because there is no cache, no
  invalidation is needed.

### 2.5 Schema change for the build (not #1078)

- Prisma: `locationId Int @id @default(autoincrement()) @map("location_id")`.
- Migration `apps/postgres/prisma/migrations/<ts>_add_location_id_sequence/migration.sql`, generated
  by `yarn db:migrate:dev`, plus a hand-added line:

  ```sql
  ALTER SEQUENCE "location_location_id_seq" RESTART WITH 100000;
  ```

  Confirm that `prisma migrate diff` stays clean afterwards. Do not call `setval` from the seed.

### 2.6 Follow-on tickets to propose

| Ticket | Contents | Size |
|---|---|---|
| 1 | Sequence migration, `court-maintenance` service and transaction, `ADD_COURT`, and the seed regression tests | 2 d |
| 2 | Steps 1–2 and the hub radio entry | 1–1.5 d |
| 3 | Steps 3–4 (checkboxes) | 1–1.5 d |
| 4 | Step 5 (provenance) | 1 d |
| 5 | Check answers, success page, and the E2E journeys | 1.5–2 d |
| Sibling | "Amend court" journey | Separate ticket |
| Sibling | Make the CSV route update-only | Separate ticket |
| Sibling | Option F discovery spike | Separate ticket |
| Sibling | Allocation hazard for regions, jurisdictions and sub-jurisdictions (§6, Q9) | Separate ticket |

---

## 3. Error Handling and Edge Cases

These are what the report must show Option C handles. They become acceptance criteria on the build
tickets.

1. **Name uniqueness.** Case-insensitive checks on `name` and `welshName` at step 1, with errors
   linked to `#name` and `#welshName`.
2. **Provenance uniqueness.** `@@unique([provenance, provenanceLocationId])` is checked at step 5,
   with the error linked to `#provenanceLocationId`. This also covers the seeded `(SNL, 101–127)`
   references and the E2E references.
3. **Concurrent admins.** Both uniqueness checks run again at confirm. A `P2002` raised inside the
   transaction is mapped, using its `meta.target`, to the matching field error and rendered on
   check-answers with a link back to the step to change. It must not become a 500, and nothing is
   written.
4. **Bad input.** `HTML_TAG_REGEX` rejection on all four free-text fields. Trim, and collapse runs of
   internal whitespace. Empty `email` and `contactNo` are stored as `null`, not `""`.
5. **Empty selections.** No region or no sub-jurisdiction gives a fieldset-level error. A single
   ticked checkbox posts as a string, which must be coerced to an array.
6. **Tampered POST.** A provenance or type outside the constant arrays, or region and
   sub-jurisdiction IDs that do not exist, are rejected on the server even though the UI cannot
   offer them.
7. **Journey state.**
   - Opening steps 2–7 with no `session.addCourt` redirects to step 1.
   - `?change=true` sends both the back link and Continue to check-answers.
   - The session is cleared on success, so pressing back and re-submitting cannot create a duplicate.
   - Opening the success page with no success data redirects to `/reference-data`.
8. **Authorisation.** `requireRole` guards both `GET` and `POST` on every page.
9. **Atomicity.** A single transaction means that a failure leaves no orphaned junction or reference
   rows.
10. **Validation parity with the CSV route.** All 21 CSV rules must be mapped, and the total
   reconciled:

| Group | Count | Mapping |
|---|---|---|
| Required fields: name, Welsh name, sub-jurisdiction, region, the provenance triple, provenance, provenance location ID, provenance type | 8 | Field-level required errors on steps 1, 3, 4 and 5 |
| HTML tags: name, Welsh name, email, contact number | 4 | Same regex, with errors linked to the field |
| Closed vocabulary: provenance, provenance type | 2 | Cannot happen through the UI (radios or select). Still guarded on the server |
| Duplicates within the file: provenance pair, name, Welsh name | 3 | **Dropped.** There is no file. Record this explicitly in the report |
| Name or Welsh name already in the database | 2 | Edge cases 1 and 3 |
| Sub-jurisdiction or region not found | 2 | Cannot happen through the UI (options come from the database). Still guarded on the server |

Two improvements that the CSV route does not have:

- a database uniqueness check on `(provenance, provenanceLocationId)`, which in the CSV route
  currently surfaces as a 500;
- bilingual error text.

---

## 4. Acceptance Criteria Mapping

| AC | Satisfied by | Verified by |
|---|---|---|
| Various non-CSV options for adding courts through the System Admin portal are investigated | Options A–F in `report.md` §2–3, each scored against the five constraints, plus the experiments in §5.1 | Reviewer confirms six genuinely different options, each with constraint scoring and evidence |
| An investigative report with pros and cons is provided | `report.md` with the matrix (§2.2): pros, cons, effort and constraint risk for every option | Reviewer confirms every option has at least one pro, one con and an estimate (F is marked "not estimable") |
| The best solution is highlighted | Option C, clearly highlighted, with Decisions 1–3 and a one-line rejection for each of A, B, D, E and F | Reviewer confirms exactly one recommendation, the three decisions, the disjointness proof including the E2E bands, and the parity mapping reconciled to 21 |

The spec's further spike criteria (ID strategy, seed interaction, parity, the future of the CSV
route, follow-on tickets) are covered by §2.3, §3 and §2.6. The criteria for the Option C build
belong to the build tickets.

---

## 5. Test Scenarios

The spike ships no code, so its scenarios are review checks and throwaway experiments. The build
scenarios are written down here so they can be carried into the build tickets, with one per user
journey as `.claude/rules/testing.md` and `e2e-testing.md` require. Detailed unit and template cases
are in the spec, §13.2–13.4.

### 5.1 Spike: evidence experiments (local database, not committed)

1. **Seed collision reproduction.** Insert a court at ID 100000 with references `(SNL, "128")` and
   `(COMMON_PLATFORM, "X1")`. Add a throwaway `locationData` entry with ID 28 that uses the court's
   name. Run `generateSeedSql()` and apply it. Confirm that:
   - the court is parked as `__realign_100000`;
   - the `SNL/128` reference moved to location 28;
   - the court's other data survives.

   This is the evidence for constraints 3 and 4 and for Decision 2.
2. **Sequence proof.** On a scratch database, apply the illustrative sequence DDL and run the seed
   twice. Confirm that:
   - the seeded IDs 1–27 stay intact;
   - `nextval` returns 100000 or more;
   - the test-support location `POST` still allocates in 90000–99999 without a clash.

### 5.2 Spike: report review journey

3. A reviewer reads `report.md` from start to finish and confirms:
   - six options, each with pros, cons and effort;
   - exactly one recommendation;
   - Decisions 1–3 with the evidence from §5.1;
   - 21 parity rules reconciled;
   - the future of the CSV route stated;
   - questions assigned to owners;
   - follow-on tickets listed.

### 5.3 Build: scenarios to carry into the build tickets

4. **E2E: a System Admin adds a court (`@nightly`).** Dashboard → `/reference-data` → step 1. On the
   way through:
   - submit empty, then a duplicate name, and check the error summary links;
   - switch to Welsh on an error state;
   - run axe on step 1's error state and on check-answers;
   - skip the contact details;
   - submit regions with nothing ticked;
   - follow a Change link back from check-answers;
   - confirm using the keyboard.

   Then confirm that the success panel shows the ID, that the court appears in the public A–Z list in
   English and Welsh, and that an `ADD_COURT` entry appears in `/audit-log-list`. Teardown removes
   the court by its name prefix.
5. **E2E: an unauthorised user is refused (`@nightly`).** A user without `SYSTEM_ADMIN` is refused
   on step 1 `GET` and on the check-answers `POST`, and nothing is written.
6. **Integration: a UI-created court survives a deploy.** In `generate-seed-sql.test.ts` (or against
   a database), apply the seed twice with a court at ID 100000 or above present. Its name, mappings
   and references are unchanged. Also assert that the `locationData` maximum ID, the
   `locationData` maximum + 100, and the test-support maximum (99999) are all below the sequence
   start.
7. **Unit: a duplicate is caught at confirm.** The service maps `P2002` on `name`, `welsh_name` or
   `(provenance, provenance_location_id)` to a field error. No audit metadata is set and the session
   is kept. This is an error path the acceptance criteria do not name.
8. **Unit: deep link and resubmission.** A later step with no session redirects to step 1. The
   success page with no data redirects to `/reference-data`. A resubmitted check-answers `POST`
   after success redirects to step 1 and writes nothing. These are error paths the acceptance
   criteria do not name.

---

## 6. CLARIFICATIONS NEEDED

### Blocking the recommendation

1. **Is `location-data.ts` frozen for new courts once the UI ships?** *(tech lead)* It is the source
   of truth according to CLAUDE.md, and constraints 3 and 4 make drift destructive. The
   recommendation is to freeze it for new courts, keep the 27, document the split, and treat
   UI-created courts as local to each environment.
2. **Should the seed stop re-pointing provenance references on conflict?** *(tech lead)* This is new
   since the prior plan. `ON CONFLICT (provenance, provenance_location_id) DO UPDATE SET location_id`
   silently moves a UI court's reference. The options are `DO NOTHING`, a guarded
   `DO UPDATE … WHERE`, or relying on Q1 alone. Also, are the synthetic `id + 100` SNL values safe
   against real SNL venue IDs?
3. **ID strategy: a sequence starting at 100000, or something else?** *(tech lead)* The existing
   journeys use `MAX + 1`. That is unsafe for location because E2E tests fill 80000–99999 on STG.
   Confirm 100000, or pick a larger start (for example 1,000,000) to leave room for the test bands
   to grow.
4. **How often are courts added?** *(PO)* The recommendation assumes single figures per month. If it
   is dozens per week, B or the CSV route wins.
5. **Is a new court visible to the public immediately, or does it need a draft state?** *(PO)* A
   draft state needs a schema column and a publish step, which changes the estimate.

### Blocking the build, not the spike

6. **One provenance reference at creation, or "add another"?** *(PO)* The CSV route supports several.
7. **Who supplies the unique Welsh name, and are provenance location IDs available at creation?**
   *(PO / content)* If either arrives later, step 1 blocks, or step 5 has to become optional and the
   shape of the transaction changes.
8. **Is an "amend court" journey in scope?** *(PO)* Nothing outside the CSV route can amend `name`,
   `welshName`, `email`, `contactNo` or references. Note also that renaming a **seeded** court is
   reverted on every deploy by `ON CONFLICT (location_id) DO UPDATE SET name`.
9. **Should the regions, jurisdictions and sub-jurisdictions allocation hazard be fixed separately?**
   *(tech lead)* `MAX + 1` on those tables hands out IDs that the next `locationData` addition can
   claim, and the seed then renames the UI-created row through `ON CONFLICT (…_id) DO UPDATE`. This
   is outside #1078 but is the same class of defect.
10. **Should the CSV route become update-only?** *(tech lead / PO)*
11. **Select or radios for provenance and type, given four options each?** *(design)* Also, are the
    spec's hint texts backed by research?
12. **Is `SYSTEM_ADMIN` the only role?** *(PO)*
