# Code Review: Issue #1078

This is the seventh pass. It cites `draft-ticket-align-court-ids.md`, which has since been folded into report.md §7.2 (S4) and deleted.

I reviewed the uncommitted edits to `report.md` (616 lines), `tasks.md` and `draft-ticket-align-court-ids.md`. I checked the new S4 migration text against the source in this worktree:

- `apps/postgres/start.sh` and `apps/postgres/prisma/generate-seed-sql.ts`
- `libs/postgres-prisma/prisma/schema/{location,base,subscription}.prisma`
- the migrations in `apps/postgres/prisma/migrations`
- `libs/system-admin-pages/src/reference-data-upload/repository/upload-repository.ts`
- `libs/location/src/location-data.ts` and `libs/subscriptions/src/repository/queries.ts`
- `e2e-tests/` and `libs/test-support/src/routes/test-support/locations.ts`

Agreed scope:

- Follow-on tickets are described in §7 only. They are not raised, except S3 (#1537).
- "No draft state" (the changed Q5 answer) is settled. I have not raised its absence.
- I judged the spec §3 follow-on criterion on whether §7 can be raised as written.

## Summary

Both highs from review 6 are resolved.

- **Previous High 1 (seed references left behind) is resolved.** S4's migration now deletes the moving courts' `seedref_<old id>` rows before it moves them (report.md:554; `draft-ticket-align-court-ids.md:30`). I traced it against the seed:
  - The chains are exactly 24 to 7 to 147 and 2 to 16 to 98 (`draft-ticket-align-court-ids.md:42`, `:47`, `:56`, `:64`). No other target is a seeded ID.
  - After the delete, the seed inserts `seedref_<new id>` with `(SNL, new + 100)` (`generate-seed-sql.ts:105-106`). No new pair equals a kept pair. The kept pairs belong to SJP (`"109"`) and to any unmatched court that keeps its ID (`"101"`, `"110"`, `"115"`). No target ID is 1, 9, 10 or 15. So ticket 1's `DO` block finds no clash, and today's clause at `:111` moves nothing.
  - There is no clash on the `seedref_<id>` key either. Every seedref at a target ID belongs to a moving court, so it has been deleted.
  - The DoD now checks for no clash and for exactly one seedref per moved court (`draft-ticket-align-court-ids.md:74`).
- **Previous High 2 (follow-on criterion partly met) is resolved.** With High 1 fixed, §7 can be raised as written.

I checked the rest of the migration end to end:

- **Pre-check with chained moves.** The pre-check allows a target held by another moving seeded court (report.md:553), and the moves go through negative IDs. So 24 can take 7 while 7 moves to 147. That is correct.
- **Negative offset and the location key.** `location_id` is a plain `INTEGER` primary key with no check constraint (`location.prisma:70`), so negative values are allowed. Phase 1 cannot clash because no negative IDs exist. Phase 2 cannot clash because the pre-check has cleared every target, and every moving row is negative at that point. Postgres checks a non-deferrable primary key row by row, which is why the two phases are needed.
- **Child tables.** All four child tables cascade (`location_region` and `location_sub_jurisdiction` in `20251117172706_…/migration.sql:84`, `:90`; `location_metadata` in `20260126174218_…/migration.sql:19`; `location_reference` in `20260520113517_…/migration.sql:19`). `location_metadata` is unique on `location_id`, and the seed's insert there is `ON CONFLICT (location_id) DO NOTHING` (`generate-seed-sql.ts:142`). Only SJP has seed metadata (`location-data.ts:72`), and SJP does not move.
- **String columns.** The only columns outside `location.prisma` that hold a location ID are `artefact.location_id` (`base.prisma:14`) and `subscription.search_value` (`subscription.prisma:5`). The subscription unique key (`subscription.prisma:13`) is safe in phase 1, because no `'-<n>'` values exist. "NoMatch" artefacts hold a provenance ID with a prefix (`libs/publication/src/no-match-location.ts:1-4`), so an exact `IN (…)` match on the old IDs leaves them alone.
- **Ordering.** `migrate deploy` runs before the seed (`start.sh:95`, then `:104-105`). With either ticket 1's guard (b) or today's realign (`generate-seed-sql.ts:72-76`), the seed then finds each court already at its new ID. Ticket 1's sequence start is unaffected: on a preview database the seed writes IDs of 345 or less, below a start of about 390.
- **`BEGIN`/`COMMIT` in a Prisma migration.** Postgres accepts explicit transaction commands in a migration script. No migration in this repo uses them, though. The repo's pattern for a migration that must fail loudly is one `DO` block that raises (`20261007120000_rename_list_types_to_shared_model/migration.sql:11-17`). See Suggestion 3.

Nothing new would mislead the build or sign-off. I found one gap in the migration's delete step (Suggestion 1). It applies only to environments where someone has uploaded a seeded court through the CSV. The DoD's STG-copy run would catch it. So it is a suggestion, not a high.

All ten acceptance criteria are met.

## 🚨 CRITICAL Issues

None. No acceptance criterion is unmet. The spike changes no code, so it adds no security or accessibility defect.

## ⚠️ HIGH PRIORITY Issues

None.

## 💡 SUGGESTIONS

New in this pass:

1. **Delete the synthetic references by value, not only by ID.** Step 2 deletes rows where `location_reference_id = 'seedref_<old id>'` (report.md:554; `draft-ticket-align-court-ids.md:30`). That misses one case:
   - A CSV upload of a seeded court deletes its references and re-creates them without an ID (`upload-repository.ts:104-118`). Prisma then gives each a `cuid()` ID (`location.prisma:85`).
   - On the next deploy, the seed's `ON CONFLICT (provenance, provenance_location_id) DO UPDATE` (`generate-seed-sql.ts:111`) updates that row and keeps its cuid ID. `seedref_<id>` never comes back.
   - If that court is 7 or 16, its `(SNL, "107")` or `(SNL, "116")` row survives step 2 and moves to 147 or 98. That is the review 6 problem again: ticket 1's `DO` block fails the deploy, or today's clause silently moves the reference.
   - No E2E test re-uploads a seeded court (nothing in `e2e-tests/` uses the download), so this needs a person to have done it on STG. The DoD run on an STG copy (`:74`) would catch it.
   - **Fix:** delete `WHERE provenance = 'SNL' AND provenance_location_id = (location_id + 100)::text AND location_id IN (<moving old ids>)`. You can keep the ID match as well. Add a line saying `seedmeta_<id>` needs the same care if a moving court ever gets seed metadata (today only SJP has it, and SJP keeps 9).
2. **`start.sh` already rolls back a failed migration.** The text says "mark it with `prisma migrate resolve --rolled-back` before retrying" (report.md:557; `draft-ticket-align-court-ids.md:30`). On a deployed environment, `start.sh:80-91` sets `rolled_back_at` on any unfinished migration when no runner holds Prisma's lock. The next pod start then retries it. So:
   - deployed: a failing pre-check fails every postgres pod start until someone fixes the data. Nobody needs to run `migrate resolve`.
   - local: `migrate resolve` (or `yarn db:drop`) is still needed.
   - Say this, and say what a person does when the pre-check fires on STG: delete or renumber the STG court that holds the target ID, then redeploy.
3. **Follow the repo's pattern for a migration that fails loudly.** The pre-check needs procedural code, so it needs a `DO` block anyway. `20261007120000_rename_list_types_to_shared_model/migration.sql:11-17` is the precedent: one `DO $$ … RAISE …` block and a header comment that explains the failure. The explicit `BEGIN`/`COMMIT` should work, but nothing in the repo uses it. Either drop it or keep it, and let the DoD's fresh-database and STG-copy runs (`draft-ticket-align-court-ids.md:74`) confirm that a failure rolls back every step.
4. **Widen the pre-check to the string columns.** The pre-check only looks at `location` (report.md:553). `artefact.location_id` and `subscription.search_value` have no foreign key, so rows for a deleted court can stay behind with a target ID.
   - Phase 2 would attach orphan artefacts to the moved court.
   - It would fail on the subscription unique key if one user had subscribed to both the orphan and the moving court.
   - Raise if any non-moving `artefact` or `LOCATION_ID` subscription row already holds a target ID.
   - Name the filter value `search_type = 'LOCATION_ID'` (`libs/subscriptions/src/repository/queries.ts:89`) rather than "location subscriptions".
   - Optionally, also check that each moving row has its expected seeded name.
5. **Say that the mapping is final before the migration merges.** This is still open from review 6, Suggestion 3. Prisma stores a checksum for each applied migration, so the mapping cannot be edited afterwards. A correction would need a second migration. Add "the mapping comes from the production export and is reviewed before the migration merges" to S4 (report.md:551) and the draft's Scope (`:24`, `:30`).

Carried over from review 6, still open:

6. **Page count wording.** The recommendation box now includes "add another" (report.md:16), but :190 still says "the answers to Q6 and Q7 add the eighth". Only Q6 adds a page. Q7 makes step 5 optional.
7. **Stale text in the S4 draft.** `draft-ticket-align-court-ids.md:19` ("a seed change plus a lower-environment clean-up") and `:80` ("STG data is disrupted … unless the clean-up is planned") predate the migration.
8. **Stale line references in the draft.** `draft-ticket-align-court-ids.md:13` cites `:65-73` and `:94-96`. They are now `generate-seed-sql.ts:72-76` (realign) and `:93-97` (location upsert).
9. **Q4's bulk-edit half is still unanswered.** Report.md:397 says all of Q1–Q12 are answered. The Q4 answer (:387) only covers how courts are added. Decision 3 step 4 (:289) depends on the bulk-edit answer. Record it as open.
10. **The start value must cover S4's unmatched courts.** If S4 gives Oxford Combined, Newcastle Combined or East London Tribunal Service an ID above the legacy maximum (`draft-ticket-align-court-ids.md:82`), ticket 1's band test (report.md:476, :486) fails. Define the start as `max(legacy production max, max seeded ID) + 1`.
11. **Pick one place for the freeze test** (report.md:265, "or beside `libs/location/src/location-data.ts`").
12. **CLAUDE.md item 7 also covers `list-type-data.ts`** (`CLAUDE.md`, "7. `list-type-data.ts` and `location-data.ts` are the single sources of truth"). Ticket 1 (:479) and the draft (`:31`) should change only the location half.
13. **S2's "bilingual message"** (report.md:544) would appear on pages that hard-code `locale = "en"` (:56). Either put the locale fix in S2's scope, or say "English".
14. **Add two CSV defects to S2.** `reference-data-upload-summary/index.ts:71` logs the whole parsed file, including court emails and phone numbers. `validation.ts:245` and `:276` put user-supplied names into error `html` without escaping them.
15. **"The same file-based apply as `start.sh:104-105`"** (report.md:305). Deploy uses `prisma db execute --file` (`start.sh:105`), not `psql`. Say "equivalent".
16. **State the CSRF posture** for the new POSTs. The report does not mention CSRF.
17. **Recovery note for a red seed** (report.md:269). S1 and S2 do not exist when ticket 1 ships. Say that the usual fix is to revert the `location-data.ts` change.
18. **Ask design about the steps with several fields** (names, contact details, the three-field reference). Today the question to design only covers hint texts (:511).
19. **`plan.md` still presents "sequence starting at 100000" as chosen** (plan.md:142, :148, :216). Add a one-line pointer to report §4.1 and §6.1.

## ✅ Positive Feedback

- The S4 migration is now sound in the cases that matter:
  - the delete step removes the review 6 clash;
  - the negative offset makes the chained moves safe on the location key and the subscription key;
  - the pre-check stops the migration taking an ID from a court that is not part of the move.
- The report and the draft describe the migration in the same way (report.md:552-557; `draft-ticket-align-court-ids.md:30`). Both name the chain that caused the review 6 high.
- The DoD now tests the right things (`draft-ticket-align-court-ids.md:74`): with and without ticket 1's guards, on a fresh database and an STG copy, with exactly one seedref per moved court.
- Ticket 1's `location-csv.ts` change now uses test-support's generated-ID path and gives the reason (report.md:474; `locations.ts:55`, `:103-113`). That removes the risk of parallel workers overwriting each other's courts.
- The Q3 answer and §4.1 now give the same `setval` rule (report.md:258, :386).
- The ordering claims are consistent. S4 can ship before or after ticket 1 on lower environments (:557), but must land before ticket 1 reaches production and before any legacy load (:551).
- Security is unchanged and sound. Every page sits behind `requireRole([USER_ROLES.SYSTEM_ADMIN])` (:502). Writes are create-only (:470). Tampered POSTs are rejected on the server (:519). There is an unauthorised-user journey (:534) and an `ADD_COURT` audit action (:472, :508).

## Test Coverage Assessment (statement coverage: N/A)

**Statement coverage per changed workspace:** N/A. No code workspaces changed (docs-only spike), so `yarn test:coverage` was not run.

**Proposed strategy for the follow-on tickets:**

- **Ticket 1 (unit):** covers the risky paths:
  - the seed run twice (report.md:485), the bands (:486) and the freeze (:487);
  - name and reference clashes failing, plus a re-run with no clash (:488-489);
  - the CSV guard both ways, plus the preview-database E2E (:490-491);
  - P2002 mapping (:492) and atomicity (:493).
  - Gap: the live-value read with `is_called` both false and true.
- **S4:** the DoD runs the migration and seed twice, with and without ticket 1's guards, on a fresh database and an STG copy (`draft-ticket-align-court-ids.md:74`). Add:
  - a seeded court whose SNL reference has a cuid ID (Suggestion 1);
  - an orphan artefact or subscription at a target ID (Suggestion 4);
  - a check that the chained artefacts and subscriptions for 7 and 24 end up on the right courts.
- **Ticket 2 (unit and template):** each page has `index.test.ts` and `index.njk.test.ts` with en/cy key parity (:502, :522), as `.claude/rules/testing.md` requires. There are tests for the skipped reference (:521), "add another" duplicates (:520), tampered POSTs (:519), deep links and resubmission (:515, :535).
- **E2E:** one main journey with validation, Welsh, axe and keyboard checks inline (:523-533), and the unauthorised user as its own journey (:534). This follows the `e2e-tests` conventions. The main journey never skips the reference step. A second run that skips it would cover the optional branch end to end.
- **Accessibility:** axe on step 1's error state and on check answers, plus a keyboard confirm (:526, :531). Also run axe on the "add another" page (a summary list with Remove links) and the success panel.

## Acceptance Criteria Verification

Description ACs (ticket.md:20-22):

- [x] Various options for adding new court locations through the System Admin portal, without needing to use a csv file, are investigated
  - Options A–F in the matrix (report.md:156-163), each in detail (:171-212), database experiments (:300-333), and legacy CaTH (:138-148).
- [x] An investigative report with the pros and cons of the various options is provided
  - Pros, cons, effort and c1–c5 for each option (report.md:156-163).
- [x] The best solution is highlighted in the investigative report
  - Option C in the highlighted box (report.md:13-31) and in §4 (:216).

Spec §3 "Spike deliverable criteria" (ticket.md:167-214):

- [x] Options are investigated and documented: "a written report exists at `docs/tickets/1078/report.md` covering at minimum Options A–F below, each with pros, cons, effort estimate in dev-days, and the risks it carries against the five hard constraints in section 2"
  - report.md:156-163. F is "Not estimable", with the reason at :210.
- [x] A single option is recommended: "exactly one option is named as the recommendation, with the reasoning stated, and the rejected options each carry a one-line reason for rejection"
  - report.md:13-31 and :216. The one-line rejections are at :293-298.
- [x] The `location_id` allocation question is answered: "states which of the three allocation strategies (application-side `MAX(location_id) + 1`; a new Postgres sequence seeded above the `locationData` range; a reserved high-ID band such as `>= 100000` for UI-created courts) is chosen, and demonstrates that the chosen strategy cannot collide with `generateLocationsSql()` or the `provenance_location_id = locationId + 100` values emitted by `generateLocationReferencesSql()`"
  - A sequence starting at the legacy start is chosen (report.md:220-225). The disjointness proof is at :231-244, and the `+100` values are shown to be in a different column (:237, :242). The migration SQL is at :250-255. It was proven on a database (:326-333), and :258 explains why the start value does not change that result.
- [x] The deploy-seed interaction is resolved: "states how a UI-created court is protected from being renamed to `__realign_<id>` by a later addition to `location-data.ts`, and whether `location-data.ts` should be frozen as the source of truth for locations once the UI exists"
  - The freeze, a CI test, and the fail-loudly realign (report.md:262-266). The reference `DO` block is at :269. The decisions are recorded as Q1 and Q9 (:384, :392).
- [x] Validation parity with the CSV route is confirmed: "maps every existing CSV validation rule to either a form-level equivalent, a schema-level constraint, or an explicit decision to drop it"
  - All 21 rules are mapped and reconciled (report.md:341-365).
- [x] The CSV route's future is decided: "states whether the CSV route is retained alongside the new journey, deprecated, or restricted to update-only"
  - Restricted to update-only (report.md:283-291), confirmed by Q10 (:393), with S2 (:544-547).
- [x] Follow-on tickets are raised: "implementation tickets exist for the recommended option, sized to be individually shippable, and this specification's sections 4–13 are attached to them"
  - Judged on the agreed scope: the tickets are described in §7 and raised after sign-off (report.md:450; tasks.md:35). Every ticket has a size and dependencies (report.md:454-557). Sizes and labels agree (:29, :160, :456-458, :538).
  - The S4 and ticket 1 conflict from review 6 is fixed (:554; `draft-ticket-align-court-ids.md:30`, `:74`). The tickets can be raised as written. Suggestions 1–5 would tighten S4 but do not block it.

Tally: 10 of 10 met, 0 partly met, 0 unmet.

## Next Steps

- [ ] Suggestions 1–4 (delete synthetic references by value, the `start.sh` rollback note, the `DO`-block pattern, a wider pre-check). Each is a sentence or two in report.md:553-557 and `draft-ticket-align-court-ids.md:30`.
- [ ] Suggestions 5, 7, 8 and 10. These are cheap and keep the S4 draft accurate.
- [ ] The remaining suggestions, where they are cheap.
- [ ] Human: tech lead and PO sign-off, then raise the §7 tickets with spec §4–13, then close #1078 (tasks.md:35).

## Overall Assessment: APPROVED

Both highs from review 6 are resolved. The moving courts' `seedref_<old id>` rows are deleted before the move. So ticket 1's `DO` block and today's seed clause both find a clean state, and S4 can ship before or after ticket 1. I traced the pre-check, the two-phase negative offset, the cascades, the string columns and the deploy order against the source. They are sound for the chained moves in the mapping. The one gap left (synthetic references with cuid IDs after a CSV upload) is narrow, and the DoD's STG-copy run would catch it. It is a suggestion. Every acceptance criterion is met.
