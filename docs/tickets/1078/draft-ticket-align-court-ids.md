# Draft ticket: Align seeded court IDs with legacy CaTH

Status: **draft, not raised**. Described in the #1078 report as sibling S4 (§7.2). Follows the technical-task template. It comes from the #1078 spike report, Q1 and §1.7.

---

## 1. Goal
**System/Component:** Reference data seed (`libs/location`, `apps/postgres`), and two web pages that hard-code a court ID.

**Objective:** Renumber the 27 courts in `libs/location/src/location-data.ts` to their legacy CaTH (PIP) `P&I ID`s before go-live. The deploy seed and the legacy data would then agree on every court's ID.

## 2. Technical Context
- On every deploy, the seed (`apps/postgres/prisma/generate-seed-sql.ts`) writes the 27 seeded courts onto their IDs and parks any other row that uses one of their names as `__realign_<id>` (`:65-73`, `:94-96`).
- A legacy **staging** export (2026-11-17, 367 courts, IDs 1–389) compared with the seed (`docs/tickets/1078/legacy-court-mapping.md`) shows:
  - only Single Justice Procedure has the same ID in both (9);
  - 22 seeded courts exist in legacy under another ID;
  - 19 seeded IDs belong to a different court in legacy.
- If legacy courts are ever loaded with their IDs as they are, the next deploy renames most of them, and legacy publications show under the wrong court.
- CaTH is not live yet, so renumbering now is a seed change plus a lower-environment clean-up. After go-live it would be a data migration.

See the #1078 report: §1.7, Q1 and §6.2.

## 3. Scope of Work
* [ ] **Confirm the mapping against legacy production.** Export reference data from legacy CaTH production and re-run the comparison. Staging IDs may differ, because admins chose IDs separately in each environment. Record the result in `legacy-court-mapping.md`.
* [ ] **Decide the 3 courts with no legacy match:** Oxford Combined, Newcastle Combined and East London Tribunal Service (see Implementation Details). Rolls Building is confirmed as legacy 111.
* [ ] **Renumber `locationId`** for each seeded court in `location-data.ts`, using the confirmed mapping.
* [ ] **Replace the hard-coded SJP link.** `locationId=9` in `apps/web/src/pages/(verified)/account-home/index.njk:22` and `apps/web/src/pages/(public)/view-option/index.ts:42` should use a named constant or a lookup by name. SJP keeps 9 in the current mapping, but nothing should rely on that.
* [ ] **Check the synthetic SNL references.** The seed writes `SNL:(id + 100)` (`generate-seed-sql.ts:106`), so renumbering changes them. Decide whether real legacy provenance references should replace them in the same change.
* [ ] **Update tests and fixtures** that rely on seeded IDs: E2E tests, `e2e-tests/fixtures`, `libs/test-support`, and unit tests that assert on a seeded court's ID.
* [ ] **Move the existing rows in a one-off migration.** Once #1078's ticket 1 adds the fail-loudly guard (b), the seed no longer parks old rows, so editing `location-data.ts` alone would fail the deploy on `location_name_key` (for example, STG row 4 still holds "Royal Courts of Justice" when the seed inserts it at 109). A Prisma migration, which runs before the seed (`apps/postgres/start.sh`), wraps itself in `BEGIN`/`COMMIT` and (1) raises if any target ID is held by a row that is not one of the seeded courts being moved; (2) deletes the moving courts' `seedref_<old id>` references, because the foreign key would otherwise carry them along and the chained moves would leave them on the wrong court (seeded 7 → 147 and 24 → 7 would put (SNL, "107") on 147 while the seed inserts it for 7, which #1078 ticket 1's reference check rejects); the seed recreates them at the new IDs; (3) moves each court in two phases, first to `-<old id>`, then to `<new id>`, so no two rows hold one ID at once. `location_reference`, `location_region`, `location_sub_jurisdiction` and `location_metadata` follow through `ON UPDATE CASCADE`. `artefact.location_id` (`libs/postgres-prisma/prisma/schema/base.prisma:14`) and `subscription.search_value` for location subscriptions (`subscription.prisma:5`) are strings with no foreign key, so the migration moves them explicitly through the same two phases (the subscription unique key would otherwise merge or reject two courts' subscriptions mid-move). If it fails, mark it with `prisma migrate resolve --rolled-back` before retrying. This works whether or not ticket 1 has shipped. Local: `yarn db:drop` and re-seed also works.
* [ ] **Update CLAUDE.md item 7** ("`location-data.ts` … single source of truth") to say that seeded court IDs must match legacy `P&I ID`s.

## 4. Implementation Details
* **Service:** cath-service (`libs/location`, `apps/postgres`, `apps/web`).
* **Dependency:** the Q1 decision in the #1078 report (tech lead).
  - Can merge before or after #1078's ticket 1, because the migration moves the rows itself. If it merges after, update ticket 1's freeze test to the new ID set in the same PR.
* **Mapping (staging export; to be confirmed against production):**

| Seeded ID | Court | Legacy ID |
|---|---|---|
| 1 | Oxford Combined Court Centre | **no exact match** (nearest: 99 Oxford Magistrates' Court) |
| 2 | Birmingham Civil and Family Justice Centre | 16 |
| 3 | Manchester Civil Justice Centre | 29 |
| 4 | Royal Courts of Justice | 109 |
| 5 | Cardiff Civil and Family Justice Centre | 199 |
| 6 | Leeds Combined Court Centre | 267 |
| 7 | Bristol Civil and Family Justice Centre | 147 |
| 8 | Liverpool Civil and Family Court | 175 |
| 9 | Single Justice Procedure | 9 (unchanged) |
| 10 | Newcastle Combined Court Centre | **no exact match** (35 or 232?) |
| 11 | Birmingham Crown Court | 316 |
| 12 | Birmingham Magistrates' Court | 345 |
| 13 | First-tier Tribunal (Special Educational Needs and Disability) | 157 |
| 14 | Criminal Injuries Compensation Tribunal | 119 |
| 15 | East London Tribunal Service | **no exact match** (nearest: 247 East London Family Court) |
| 16 | Asylum Support Tribunal | 98 |
| 17 | Midlands Social Security and Child Support Tribunal | 102 |
| 18 | South East Social Security and Child Support Tribunal | 103 |
| 19 | Wales and South West Social Security and Child Support Tribunal | 104 |
| 20 | Scotland Social Security and Child Support Tribunal | 105 |
| 21 | North East Social Security and Child Support Tribunal | 106 |
| 22 | North West Social Security and Child Support Tribunal | 107 |
| 23 | London Social Security and Child Support Tribunal | 108 |
| 24 | Liverpool Social Security and Child Support Tribunal | 7 |
| 25 | Primary Health Tribunal | 71 |
| 26 | Business and Property Division Rolls Building | 111 (same court, confirmed against GOV.UK; legacy name "Business and Property Courts Rolls Building") |
| 27 | First-tier Tribunal (Property Chamber) - Residential Property Division | 84 |

* **Impacted Areas:** the deploy seed and `yarn db:seed`; STG reference data; E2E fixtures; the account-home and view-option pages.

## 5. Definition of Done (Technical)
* [ ] Every seeded court's `locationId` equals its legacy production `P&I ID`, or is a recorded decision for the unmatched ones.
* [ ] No code depends on a hard-coded seeded court ID.
* [ ] The migration and seed run twice on a fresh database and on a copy of STG data, with and without #1078 ticket 1's guard (b) and reference check, with no `__realign_` rows created and no reference clash raised. Each moved court has exactly one `seedref_<new id>` reference, and no court holds another court's old synthetic SNL reference.
* [ ] Unit and E2E tests pass; unit coverage >80% on changed business logic.
* [ ] CLAUDE.md item 7 and `legacy-court-mapping.md` updated.

## 6. Security & Risks
* **Production IDs may differ from staging.** The mapping must come from a legacy production export. Don't share the raw export (it holds court contact emails and phone numbers) or commit it.
* **STG data is disrupted** by the first deploy unless the clean-up is planned.
* **Wrong mapping:** a mismatched court would show another court's lists. The mapping needs a second reviewer.
* **The 3 unmatched courts** may be made up for the seed. If they're kept, they must not take an ID that a legacy court uses.
