# Code Review: Issue #1078

Fifth pass. The fourth review is preserved as `docs/tickets/1078/review-previous-4.md`.

I reviewed the committed branch diff (docs only, `docs/tickets/1078/*`) plus the uncommitted edits to `report.md` (603 lines), `tasks.md` and `draft-ticket-align-court-ids.md`. I re-checked the cited source in this worktree, including `generate-seed-sql.ts`, `start.sh`, `libs/location/src/repository/queries.ts`, `apps/api/src/routes/locations.ts`, `validation.ts`, `location-csv.ts`, the test-support locations route, CLAUDE.md item 7, and the preview Helm values and workflows.

Scope agreed with the developer: follow-on tickets are described in report §7 only, not raised. I judged the "follow-on tickets" criterion on whether §7 can be raised as written.

## Summary

This revision is a real improvement. The answers to Q1–Q12 are now worked into the body of the report, not just listed:

- Q3 is settled. The start is the highest legacy production ID + 1, with `setval(GREATEST(...), false)` (report.md:218-258).
- Guard (b) and the Q2 `DO` block are specified, with scenarios (report.md:264-269, :475-476, :486-487).
- The Q9 freeze is in ticket 1 (report.md:473), and so is the CLAUDE.md task (report.md:477).
- Ticket 2 has eight pages, radios, an optional reference step, "add another" and a draft state (report.md:500-538).
- Sizes agree everywhere (9.5–11 d: box :29, matrix :160, table :455-457, ticket 2 :538).
- S1–S4 labels are consistent. No GitHub issue numbers are left in `report.md`, `tasks.md` or the draft ticket.
- `100000` now appears only in the §4.5 experiments, the as-posted Q3, the §8 change log, the §4.2 experiment table and lines where it is still factually right (the test-support bound, STG's live value).

The Postgres reasoning is correct:

- `setval(seq, v, false)` makes the next `nextval` return `v`.
- `GREATEST(start, COALESCE(MAX, 0) + 1)` covers empty, seeded and STG databases.
- `SELECT last_value, is_called FROM location_location_id_seq` is a valid read of a sequence.
- A `DO $$ … RAISE EXCEPTION … $$` block inside the single `BEGIN`/`COMMIT` (`generate-seed-sql.ts:20`, `:63`) aborts the whole seed. `prisma db execute` then exits non-zero, and `start.sh:2` (`set -e`) fails the pod.

Three design problems remain, and each would mislead the build if the tickets were raised as written:

1. Ticket 1's interim CSV guard breaks the CSV E2E suite on every PR's preview environment. The report assumes E2E runs only on STG, but PR E2E runs on a fresh per-PR database.
2. Ticket 1's guard (b) makes S4's renumbering deploy fail on STG, unless S4 lands first. The report only orders S4 before production.
3. The draft-state reader list filters shared functions (`getLocationById`, `getAllLocations`). Those functions are also used by publication rendering and the admin manual-upload and remove-list pages. And nothing lets an admin publish a draft after leaving the success page.

All three description ACs are met. Of the seven spec §3 criteria, six are met and one is partly met.

## 🚨 CRITICAL Issues

None. No acceptance criterion is unmet. There is no code, so no security or accessibility defect is introduced.

## ⚠️ HIGH PRIORITY Issues

1. **Ticket 1's interim CSV guard will break the CSV E2E suite on every PR preview and on fresh local databases** (previous High 2, not resolved)
   - **Where:** report.md:122 ("E2E runs against STG"), :244 ("They only exist on STG and locally, where E2E runs"), :246, :472, :488. The `location-csv.ts` change is still in S2 (:546).
   - **Evidence:**
     - PR E2E runs against the preview deployment (`.github/workflows/workflow.preview.yml:83-89`).
     - Each preview gets its own new database (`helm/cath-service/values.preview.template.yaml:39`, `:197-202`: `databases: - name: "{{ .Release.Name }}"` on `cath-preview`).
     - On a new database the migration runs when only IDs 1–27 exist, so the live value is the legacy start (about 390).
     - The CSV spec then uploads *new* courts at 80000–89999 (`e2e-tests/utils/location-csv.ts:11-12`, used at `e2e-tests/tests/system-admin/reference-data-upload.spec.ts:115`, `:1802`, `:1880`). Those IDs are unused and above the live value, so the guard rejects them.
     - The fixture load is not affected, because it goes through test-support, not `validateLocationData()` (`e2e-tests/utils/seed-location-data.ts:37`).
   - **Impact:** The live-value threshold only helps on STG (main-branch E2E, `workflow.main.yml:74`, `:89-99`). Ticket 1's own PR, and every PR after it, fails the CSV spec. The scenario at :488 ("as the CSV E2E tests use on STG") hides this.
   - **Fix:**
     - Move the `location-csv.ts` change into ticket 1's scope: create the courts through test-support first, then upload the CSV as an update. Leave S2 to reference it.
     - Add a ticket 1 scenario: "the reference-data upload E2E spec passes on a new preview database".
     - Correct :122 and :244 to say PR E2E runs on a new per-PR preview database, where the live value is the legacy start.

2. **Guard (b) in ticket 1 makes S4's renumbering deploy fail on STG, but the order is not stated**
   - **Where:**
     - report.md:266 and :475 define guard (b): the realign only renames rows whose `location_id` is one of `locationData`'s IDs.
     - report.md:455 makes ticket 1 depend only on "S4's legacy production export", not on S4 landing.
     - report.md:552 says S4 must land "before ticket 1's migration reaches production".
     - `draft-ticket-align-court-ids.md:30` expects old STG rows to be "parked as `__realign_<id>`". `:36` only asks S4 to merge before the freeze test. `:74` requires the seed to run cleanly on a copy of STG data.
   - **Evidence:** Today the realign parks *any* row with a matching name (`generate-seed-sql.ts:72-76`). After S4, Royal Courts of Justice moves from 4 to 109 (`draft-ticket-align-court-ids.md:44`). Old row 4 still holds the name, and 4 is not in the new `locationData`. Under guard (b) row 4 is not parked, so `INSERT … (109, 'Royal Courts of Justice')` fails on `location_name_key`. The same happens for most of the 24 moved courts.
   - **Impact:** If ticket 1 reaches STG before S4, S4's first STG deploy is red, and its STG clean-up plan and Definition of Done are wrong. This is a deliberate outcome of guard (b), but neither document says so.
   - **Fix:** Choose one, and write the same rule in report.md:455, :552 and `draft-ticket-align-court-ids.md:30`, `:36`, `:74`:
     - (a) S4 merges and deploys to STG before ticket 1. Add S4 itself to ticket 1's "Depends on".
     - (b) S4's STG plan removes or remaps the old rows *before* the deploy, because guard (b) will not park them.

3. **The draft state (Q5) filters shared readers that also serve publication rendering and admin pages, and a draft can only be published from the success page** (previous High 6, partly resolved)
   - **Where:** report.md:507-508, :521, :533.
   - **Shared readers:** Ticket 2 says `getLocationById()`, `getLocationsByIds()` and `getAllLocations()` filter `isDraft: false`. These are not only public readers:
     - `getLocationById` is used by every list renderer, for example `libs/list-types/crown-daily-list/src/rendering/renderer.ts:19` and `daily-cause-list-common/src/rendering/renderer.ts:159`. Those renderers fall back to the upstream venue name.
     - It is also used by the flat-file view (`libs/public-pages/src/flat-file/flat-file-service.ts:40`, which shows "Unknown"), by notifications (`libs/publication/src/processing/service.ts:636-640`, which returns early with "Location not found"), and by `libs/publication/src/repository/queries.ts:271`.
     - Admin pages use them too: `(admin)/manual-upload/index.ts:58`, `:78`, `manual-upload-summary/index.ts:13`, `:167` and `remove-list-search/index.ts:49`.
     - Filtering these functions means an admin cannot upload or remove a list for a draft court. Lists rendered while the court is a draft keep the wrong court name. That contradicts "accepted and stored, and shows once the court is published" (:508). The "admin readers still see drafts" list (:508) misses all the `(admin)` pages.
     - Blob ingestion is not affected: it accepts an unknown ID (`libs/api/src/blob-ingestion/validation.ts:68-83`).
   - **No way to publish later:** "Publish court" exists only on the success page (:507), and `addCourtSuccess` is cleared after one view (:535). Q7 (:390) expects the admin to come back later to add a reference and then publish. Neither ticket 2 nor S1 (:542) has a route to find or publish an existing draft. CSV upserts do not touch `isDraft`. So an abandoned draft can never be published without a database edit.
   - **Fix:**
     - Filter drafts at the public and subscriber entry points. These are the A–Z and search via `getAllLocations`/`searchLocationsByName` (used by `apps/api/src/routes/locations.ts:12`, `:17`), `(public)/courts-tribunals-list`, `(public)/search`, `(public)/summary-of-publications`, `(verified)/location-name-search`, and `libs/subscriptions/src/validation/validation.ts:5`, `:11`. Alternatively, add an explicit `{ includeDrafts }` option. Then list every remaining caller with its intended behaviour.
     - Add a publish-a-draft route: a "Draft courts" list, or publish inside S1's amend journey. Add a scenario for it.

4. **[~] Spec AC "Follow-on tickets are raised": §7 cannot yet be raised as written**
   - **Where:** report.md:447-554. Judged on the agreed scope (described, not raised).
   - **What is missing:** §7 describes every ticket, with sizes and dependencies, and is consistent on labels and totals. But ticket 1, ticket 2 and S4 each contain a defect that would break CI or STG, or ship an unusable feature, if raised as written. These are High 1, 2 and 3.
   - **Fix:** Resolve Highs 1–3. No other change is needed for this criterion.

## 💡 SUGGESTIONS

1. **Q4's bulk-edit half is still unanswered.** report.md:397 says "All of Q1–Q12 are answered", but the Q4 answer (:387) covers only how courts are added. Decision 3 step 4 (:289) depends on the bulk-edit answer, and §8 still says "Retained for bulk" (:567). Record step 4 as open.
2. **Re-estimate ticket 1.** It is still 2 d (:455, :493), but it now also carries the `isDraft` column, `publishCourt()`, `PUBLISH_COURT`, the Q9 freeze, guard (b), the `DO` block, the CLAUDE.md update and (High 1) the `location-csv.ts` change. 3 d looks closer. Adjust the 9.5–11 d total to match.
3. **Spell out the live value.** At :246 and :472, add: next = `is_called ? last_value + 1 : last_value`. Note that `$queryRaw` returns `last_value` as a `BigInt`.
4. **A legacy-load `setval` can move the sequence backwards.** Courts are hard-deleted (`queries.ts:264-270`). If the highest UI courts are deleted, `GREATEST(start, MAX + 1)` (:227, :258) re-issues their IDs. Use `GREATEST(start, MAX + 1, <current next value>)` for every load after the migration.
5. **Define the start so it covers S4's unmatched courts.** If S4 gives Oxford Combined, Newcastle Combined or East London Tribunal Service an ID above the legacy maximum (`draft-ticket-align-court-ids.md:82`: "must not take an ID that a legacy court uses"), the band test (:474, :484) fails. Define the start as `max(legacy prod max, max seeded ID) + 1`. Say where the test reads it from: a shared constant, or a parse of the migration.
6. **Freeze test location** is still "(or beside `libs/location/src/location-data.ts`)" (:265). Pick `libs/location`.
7. **CLAUDE.md item 7 also covers `list-type-data.ts`** (CLAUDE.md:795-797). The ticket 1 bullet (:477) should keep the list-type half and change only the location half.
8. **Stale text:**
   - P8 says "Report uses 6.5–8 d" (:135).
   - D "stays the documented mechanism … until Q1 is answered" (:202).
   - B is the "fallback if Q4 shows high bulk volume" (:187), but Q4 is answered.
9. **S2's "bilingual message"** (:544) is on pages that hard-code `locale = "en"` (:56; `reference-data-upload-summary/index.ts:45`, `:111`). Either scope the locale fix into S2, or say "English".
10. **Add two CSV defects to S2:**
    - the full parsed file, including court emails and phone numbers, is logged (`reference-data-upload-summary/index.ts:71`);
    - user-supplied names are interpolated into error `html` (`validation.ts:245`, `:276`).
11. **"The same file-based apply as `start.sh:104-105`"** (:305). Deploy uses `prisma db execute --file` (`start.sh:105`), not `psql`. Say "equivalent".
12. **Stale line references in the draft ticket.** `draft-ticket-align-court-ids.md:13` cites `generate-seed-sql.ts:65-73`, `:94-96`. They are now `:72-76` (realign) and `:93-97` (location upsert).
13. **CSRF posture** for the new POSTs (each step, check answers, publish) is still not stated (no "csrf" in the report). Name the mechanism, or say that `sameSite` is the only control.
14. **Recovery note for a red seed** (:269). When ticket 1 ships, S1 does not exist. The quickest recovery is usually to revert the offending `location-data.ts` change. Say so, and add that the CSV can still move a reference.
15. **One-thing-per-page check.** :510 sends the hint texts to content design. Also ask design to confirm that the multi-field steps (names, contact details, the three-field reference) are acceptable.
16. **`plan.md` still says "sequence starting at 100000" is chosen** (plan.md:142, :148, :216), with no banner. Add a one-line note pointing to report §4.1 and §6.1.

## ✅ Positive Feedback

- The answers are now the body of the report. §6.1 leads with decisions (:383-395) and keeps the posted questions as a record (:397-427). That clears up the "which half is authoritative" problem.
- The Q3 design is sound and well argued. The report explains why there is no margin (:227), why the live value differs per environment (:244), and why the guard uses the live value and not the configured start (:246). The migration SQL (:250-256) is correct Postgres.
- The Q2 mechanism explains why a plain `INSERT` would fail on every deploy (:269), and pairs a raising `DO` block with the guarded clause. The "seed twice, no error" scenario (:487) is there.
- Guard (b) is better than the posted option. Limiting the realign to `locationData`'s own IDs also protects legacy courts below the start, not just UI courts.
- The draft-state section now names the readers and makes a publication decision (:508). It needs moving to the right layer (High 3), but the level of detail is right.
- §5 is updated for Q6 and Q7, and the reconciliation still adds up (:351, :357, :365; `validation.ts` has 21 `errors.push`).
- Security stays consistent: `requireRole([USER_ROLES.SYSTEM_ADMIN])` on every page and on publish (:500, :508), an unauthorised-user journey covering publish (:534), server-side rejection of tampered IDs (:518), create-only writes (:469), and audit actions for add and publish (:471, :506, :533).
- Citations I re-checked are exact:
  - `generate-seed-sql.ts:20`, `:46-51`, `:63`, `:72-76`, `:80`, `:93-97`, `:99-112`, `:105`, `:106`, `:111`
  - `start.sh:95`, `:104-105`
  - `validation.ts:7`
  - `download-service.ts:6-8`
  - `location-csv.ts:11-12`
  - test-support `locations.ts:104-113`, `:136`, `:154-156`
  - `apps/api/src/routes/locations.ts:1-2`
  - the four reader names in `libs/location/src/repository/queries.ts:51`, `:86`, `:106`, `:121`
  - CLAUDE.md "no prod deployment" (under item 7)

## Test Coverage Assessment

**Statement coverage per changed workspace:** N/A. No code workspaces changed (docs-only spike), so `yarn test:coverage` was not run.

**Proposed test strategy for the follow-on tickets:**

- **Unit (ticket 1):** Good coverage of the risky paths. It covers the deploy-survival scenario run twice (:483), the bands (:484), the freeze (:485), name and reference clashes failing the deploy, with a no-clash re-run (:486-487), the CSV guard both ways (:488-489), P2002 mapping (:490) and atomicity (:491). Gaps:
  - the CSV E2E spec on a new preview database (High 1);
  - a seed run against S4-renumbered data under guard (b) (High 2);
  - the live-value read when `is_called` is false versus true (Suggestion 3).
- **Unit and template (ticket 2):** `index.test.ts` and `index.njk.test.ts` per page, with en/cy key parity (:500, :522), follow `.claude/rules/testing.md`. Skipped reference (:520), "add another" duplicates (:519) and "draft hidden" (:521) are covered. Missing: a test per reader caller showing whether it filters drafts, and publishing an existing draft after leaving the success page (High 3).
- **E2E:** One main journey with validation, Welsh, axe and keyboard inline (:523-533), and unauthorised access as its own journey including publish (:534). This matches the `e2e-tests` conventions. The main journey uses "add another" but never skips the reference step. Skipping once would cover the optional branch end to end at no extra cost.
- **Accessibility:** axe on step 1's error state and on check answers, plus a keyboard confirm (:526, :531), is adequate. Add axe on the "add another" page (summary list with Remove links) and on the success page with the publish button.

## Acceptance Criteria Verification

Description ACs (ticket.md:20-22):

- [x] Various options for adding new court locations through the System Admin portal, without needing to use a csv file, are investigated
  - Options A–F in the matrix (report.md:156-163), a subsection each (:171-212), database experiments (:300-333), legacy CaTH (:138-148).
- [x] An investigative report with the pros and cons of the various options is provided
  - Pros, cons, effort and c1–c5 per option (report.md:156-163).
- [x] The best solution is highlighted in the investigative report
  - Option C in the highlighted box (report.md:13-31) and §4 (:216).

Spec §3 "Spike deliverable criteria" (ticket.md:167-214):

- [x] Options are investigated and documented: "a written report exists at `docs/tickets/1078/report.md` covering at minimum Options A–F below, each with pros, cons, effort estimate in dev-days, and the risks it carries against the five hard constraints in section 2"
  - report.md:156-163. F is "Not estimable", with the reason at :210.
- [x] A single option is recommended: "exactly one option is named as the recommendation, with the reasoning stated, and the rejected options each carry a one-line reason for rejection"
  - report.md:13-31, :216; one-line rejections at :293-298.
- [x] The `location_id` allocation question is answered: "states which of the three allocation strategies … is chosen, and demonstrates that the chosen strategy cannot collide with `generateLocationsSql()` or the `provenance_location_id = locationId + 100` values emitted by `generateLocationReferencesSql()`"
  - Sequence chosen at the legacy start (report.md:218-225). Disjointness is argued from `GREATEST(start, MAX + 1)` (:231-244), with the `+100` values in a different column (:237, :242). The migration SQL is at :250-256. The sequence behaviour was proven on a database (:326-333), and the start value does not change that result (:258).
- [x] The deploy-seed interaction is resolved: "states how a UI-created court is protected from being renamed to `__realign_<id>` by a later addition to `location-data.ts`, and whether `location-data.ts` should be frozen as the source of truth for locations once the UI exists"
  - Freeze plus CI test plus fail-loudly realign (report.md:262-266). Reference clash `DO` block (:269). Decision recorded (Q1, Q9 at :384, :392).
- [x] Validation parity with the CSV route is confirmed: "maps every existing CSV validation rule to either a form-level equivalent, a schema-level constraint, or an explicit decision to drop it"
  - All 21 rules are mapped and reconciled, including Q6 and Q7 (report.md:341-365). This matches the 21 `errors.push` in `validation.ts`.
- [x] The CSV route's future is decided: "states whether the CSV route is retained alongside the new journey, deprecated, or restricted to update-only"
  - Restricted to update-only (report.md:283-291), confirmed by Q10 (:393), with S2 (:544-548).
- [~] Follow-on tickets are raised: "implementation tickets exist for the recommended option, sized to be individually shippable, and this specification's sections 4–13 are attached to them"
  - Judged on the agreed scope (described in §7, raised after sign-off; report.md:449, tasks.md:35). Every ticket is described with size and dependencies (report.md:453-554).
  - Missing: three defects in the ticket bodies would break PR E2E (ticket 1, High 1), break S4's STG deploy (ticket 1 and S4, High 2), or leave drafts unpublishable and admin list pages broken (ticket 2, High 3).

Tally: 9 of 10 met, 1 partly met (follow-on tickets), 0 unmet.

## Next Steps

- [ ] High 1: move the `location-csv.ts` test-support-then-update change into ticket 1, add the new-preview-database scenario, and correct report.md:122 and :244.
- [ ] High 2: state the S4 versus ticket 1 order (S4 first, or a pre-deploy STG clean-up) in report.md:455, :552 and `draft-ticket-align-court-ids.md:30`, `:36`, `:74`.
- [ ] High 3: move draft filtering to the public and subscriber entry points (or add `includeDrafts`), list every caller of the shared readers, and add a publish-an-existing-draft route and scenario.
- [ ] High 4: falls out of Highs 1–3.
- [ ] Suggestions 1–16 where cheap. Suggestions 2 (ticket 1 size), 4 (`setval` going backwards) and 5 (start value versus S4's unmatched courts) matter most.
- [ ] Human: tech lead and PO sign-off, then raise the §7 tickets with spec §4–13, then close #1078 (tasks.md:35).

## Overall Assessment: NEEDS CHANGES

The report has caught up with its decisions. The answers are in the body, Q3 and Q2 have correct Postgres mechanisms, sizes and labels agree, and the stale `100000` and issue-number references are gone. Previous Highs 1, 3 and 4 are resolved. Three design gaps remain in the ticket bodies: the CSV guard on per-PR preview databases, guard (b) against S4's renumbering, and the draft state's reader layer and publish-later route. Each would cause a red build or an unusable feature if raised as written. These are targeted edits to §4.1, §7 and the draft ticket, not a change of recommendation.
