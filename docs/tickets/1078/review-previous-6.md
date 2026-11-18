# Code Review: Issue #1078

This is the sixth pass. The fifth review is kept as `docs/tickets/1078/review-previous-5.md`.

I reviewed the uncommitted edits to `report.md` (609 lines), `tasks.md` and `draft-ticket-align-court-ids.md`. I re-checked the new text against the source in this worktree:

- `.github/workflows/workflow.preview.yml`
- `helm/cath-service/values.preview.template.yaml`
- `e2e-tests/utils/location-csv.ts` and `e2e-tests/tests/system-admin/reference-data-upload.spec.ts`
- `libs/test-support/src/routes/test-support/locations.ts`
- `libs/postgres-prisma/prisma/schema/{location,base,subscription}.prisma`
- the foreign keys in `apps/postgres/prisma/migrations`
- `apps/postgres/start.sh` and `apps/postgres/prisma/generate-seed-sql.ts`
- `legacy-court-mapping.md`

Agreed scope:

- Follow-on tickets are described in §7 only. They are not raised, except S3 (#1537).
- "No draft state" (the changed Q5 answer) is an accepted decision. I have not raised its absence.
- I judged the spec §3 follow-on criterion on whether §7 can be raised as written.

## Summary

The revision fixes what review 5 asked for:

- **Previous High 1 is resolved.** The `location-csv.ts` change is now in ticket 1 (report.md:474), with a scenario (:490), a risk row (:436) and corrected text in §1.5 (:122) and §4.1 (:244, :246). Per-PR preview databases are described correctly:
  - PR E2E runs on the preview deployment (`workflow.preview.yml:83-89`).
  - Each release gets its own database (`values.preview.template.yaml:39`, `:197-202`).
- **Previous High 2 is resolved for name clashes.** S4 now moves its own rows in a one-off migration (report.md:552; `draft-ticket-align-court-ids.md:30`). The mechanics I checked are right:
  - All four child tables use `ON UPDATE CASCADE`. These are `location_region` and `location_sub_jurisdiction` (`migrations/20251117172706_add_location_reference_data_tables/migration.sql:84`, `:90`), `location_metadata` (`20260126174218_add_location_metadata/migration.sql:19`) and `location_reference` (`20260520113517_add_location_reference/migration.sql:19`).
  - `artefact.location_id` is a `String` with no relation (`base.prisma:14`).
  - `subscription.search_value` is a `String` (`subscription.prisma:5`), and its old FK to `location` was dropped (`20260119151000_refactor_subscription_and_add_artefact_search/migration.sql:2`, `:14`).
  - `migrate deploy` runs before the seed (`start.sh:95`, then `:104-105`).
- **Previous High 3 is resolved by removing the draft state.** No `isDraft`, `publishCourt`, `PUBLISH_COURT` or draft scenario is left. The only "draft" text left is the Q5 record (:388, :411), the "no draft state" notes (:190, :460, :499) and the change log (:604).
- **Sizes agree everywhere.** Ticket 1 is 2.5 d (:456, :495). Ticket 2 is 5.5–7 d (:457, :538). The total is 8–9.5 d (:29, :135, :160, :458).
- **The other review 5 fixes are in.** The legacy-load `setval` now includes the current value (:258). The live-value formula and the `BigInt` note are added (:246). P8, §3.2 and §3.4 are updated (:135, :187, :202).

One new design problem would mislead the build. S4's migration moves the seeded courts, and their `seedref_<old>` references move with them. After S4, the seed inserts `(SNL, new id + 100)`. For two courts, that pair is still held by another court's moved reference. Ticket 1's Q2 `DO` block then fails the deploy. So "this works in either order relative to ticket 1" (report.md:552) is wrong. It holds only if S4 deploys first.

All three description ACs are met. Of the seven spec §3 criteria, six are met and one is partly met (follow-on tickets).

## 🚨 CRITICAL Issues

None. No acceptance criterion is unmet. The spike changes no code, so it adds no security or accessibility defect.

## ⚠️ HIGH PRIORITY Issues

1. **S4's row-move migration leaves the old seed references behind. With ticket 1's Q2 `DO` block in place, S4's deploy fails.** (New.)
   - **Where:** report.md:552 ("This works in either order relative to ticket 1"); `draft-ticket-align-court-ids.md:30` ("This works whether or not ticket 1 has shipped"), `:36`, `:74` (the DoD tests guard (b) only).
   - **Evidence:**
     - The seed writes `('seedref_<id>', id, 'SNL', String(id + 100), …)` (`generate-seed-sql.ts:105-106`).
     - Ticket 1's `DO` block raises if any of the seed's pairs "belongs to a different location" (report.md:269, :478).
     - The migration's `UPDATE location SET location_id = …` cascades to `location_reference` (`20260520113517_add_location_reference/migration.sql:19`). So each moved court keeps its old `seedref_<old>` row and its old `(SNL, old + 100)` value.
     - In the mapping, seeded 24 (Liverpool SSCS) moves to 7, and seeded 7 (Bristol) moves to 147 (`draft-ticket-align-court-ids.md:47`, `:64`). After the migration, `seedref_7`, which holds `(SNL, "107")`, sits on 147. The new seed inserts `(SNL, "107")` for location 7. The `DO` block sees that pair on 147 and raises.
     - The same thing happens with 2 moving to 16 and 16 moving to 98 (`:43`, `:56`): `(SNL, "116")` sits on 98.
   - **Impact:**
     - If ticket 1 ships first, S4's first STG deploy is red. That is the outcome High 2 in review 5 was meant to remove.
     - If S4 ships first, the current clause (`generate-seed-sql.ts:111`) silently moves `(SNL, "107")` from Bristol to Liverpool SSCS. On STG, lists ingested with SNL 107 then show under a different court.
     - Either way, every moved court keeps a stale extra reference. For example, Royal Courts of Justice keeps "104" as well as its new "209".
   - **Fix:**
     - In the S4 migration, after the location moves, delete the moved courts' `seedref_<old>` rows. The seed then re-creates them at `new + 100`. Alternatively, rewrite their ID and value using the same offset.
     - Correct report.md:552 and `draft-ticket-align-court-ids.md:30` and `:36` to say this.
     - Extend the DoD (`draft-ticket-align-court-ids.md:74`) to "with and without ticket 1's guard (b) and Q2 `DO` block".
     - Link the decision at `draft-ticket-align-court-ids.md:28` (replace the synthetic references?) to this step.

2. **[~] Spec AC "Follow-on tickets are raised": §7 cannot yet be raised exactly as written.**
   - **Where:** report.md:448-554. I judged this on the agreed scope (described, not raised).
   - **What is missing:** §7 describes every ticket, with sizes, dependencies and consistent labels. S4 and ticket 1 together would still break the STG deploy if raised as written (High 1).
   - **Fix:** Resolve High 1. Nothing else is needed for this criterion.

## 💡 SUGGESTIONS

New in this pass:

1. **Use test-support's generated-ID path in `location-csv.ts`.** Ticket 1 (report.md:474) does not say how the test courts get their IDs. If you pass an explicit `locationId`, test-support does an **upsert**, which resets an existing row (`libs/test-support/src/routes/test-support/locations.ts:55`, `:88-100`). Parallel workers that pick the same random 80000–89999 ID would then overwrite each other's courts. The generated path creates the row and retries on a clash (`:103-113`). Use that path, read back the returned `locationId`, and drop the 80000–89999 band from §1.5 (:118) and the §4.1 table (:239).
2. **Apply the S4 ordering to the string columns too.** The migration "updates `artefact.location_id` and `subscription.search_value` explicitly" (:552), but the "ordering or temporary offset" wording only covers `location`. The mapping has chains (24 to 7 while 7 goes to 147; 2 to 16 while 16 goes to 98). Running one `UPDATE … WHERE location_id = '24'` after another would merge two courts' artefacts.
   - Use one `UPDATE … FROM (VALUES …)` per table, or the same offset.
   - `subscription` has a unique key on `(user_id, search_type, search_value)` (`20260119151000_…/migration.sql:34`), so use the offset there.
   - Filter on `search_type = 'LOCATION_ID'`.
3. **Make the S4 migration safe on STG.**
   - Use a negative offset (`location_id = -location_id`), so the parked IDs cannot touch the E2E bands.
   - Pre-check that no row outside the 27 courts already holds a target legacy ID. STG CSV uploads can choose any ID. Raise a clear error if one does.
   - Note that a failed Prisma migration blocks later deploys until someone runs `prisma migrate resolve`.
   - Note that the migration is immutable, so the mapping must be final (from the production export) before it merges.
4. **Q3's answer still quotes the old load formula.** report.md:386 says every legacy load ends with `setval(GREATEST(<start>, MAX(location_id) + 1))`, but :258 now adds the current value. Align :386, and point :227 and the risk at :438 to :258.
5. **The page list in the recommendation box misses "add another".** Report.md:15-16 names seven pages, and §3.3 and ticket 2 have eight (:190, :507). Also, at :190, only Q6 adds a page. Q7 only makes step 5 optional.
6. **Stale text in the S4 draft ticket.** `draft-ticket-align-court-ids.md:19` ("a seed change plus a lower-environment clean-up") and `:80` ("STG data is disrupted by the first deploy unless the clean-up is planned") predate the migration. Reword both.

Carried over from review 5, still open:

7. **Q4's bulk-edit half is still unanswered.** Report.md:397 says all of Q1–Q12 are answered. The Q4 answer (:387) covers only how courts are added. Decision 3 step 4 (:289) and §8 (:567) depend on the bulk-edit answer. Record step 4 as open.
8. **The start value must cover S4's unmatched courts.** If S4 gives Oxford Combined, Newcastle Combined or East London Tribunal Service an ID above the legacy maximum (`draft-ticket-align-court-ids.md:82`), the band test fails (report.md:476, :486). Define the start as `max(legacy prod max, max seeded ID) + 1`, and say where the test reads it from.
9. **Pick one place for the freeze test.** It still says "(or beside `libs/location/src/location-data.ts`)" (:265).
10. **CLAUDE.md item 7 also covers `list-type-data.ts`** (CLAUDE.md:795-797). The ticket 1 bullet (:479) should keep the list-type half and change only the location half.
11. **S2's "bilingual message"** (:544) would sit on pages that hard-code `locale = "en"` (:56). Either scope the locale fix into S2, or say "English".
12. **Add two CSV defects to S2.**
    - The full parsed file, including court emails and phone numbers, is logged (`reference-data-upload-summary/index.ts:71`).
    - User-supplied names are put into error `html` without escaping (`validation.ts:245`, `:276`).
13. **"The same file-based apply as `start.sh:104-105`"** (:305). Deploy uses `prisma db execute --file` (`start.sh:105`), not `psql`. Say "equivalent".
14. **Stale line references in the draft ticket.** `draft-ticket-align-court-ids.md:13` cites `:65-73` and `:94-96`. They are now `generate-seed-sql.ts:72-76` (realign) and `:93-97` (location upsert).
15. **State the CSRF posture** for the new POSTs. The report has no mention of CSRF.
16. **Recovery note for a red seed** (:269). S1 does not exist when ticket 1 ships. Say that the usual fix is to revert the offending `location-data.ts` change, and that the CSV can still move a reference.
17. **Ask design about the multi-field steps.** Besides the hint texts (:511), ask design to confirm that the steps with several fields (names, contact details, the three-field reference) are acceptable under one-thing-per-page.
18. **`plan.md` still presents "sequence starting at 100000" as chosen** (plan.md:142, :148, :216) and has no pointer to the newer decision. Add a one-line note pointing to report §4.1 and §6.1.

## ✅ Positive Feedback

- The High 1 fix is complete and correct.
  - The guard, the `location-csv.ts` change, the scenario and the risk row all agree (:246, :474, :490, :436).
  - The report explains why preview and STG differ: the migration runs on an empty table on a new preview database, but after the E2E bands on STG (:244).
  - Only one spec uses `buildLocationCsv` (`reference-data-upload.spec.ts:115`, `:119`, `:123`, `:129`, `:1802`, `:1880`, `:1985`), so the change has a clear boundary.
- Moving the S4 rows in a migration is the right shape. It runs before the seed, uses the existing `ON UPDATE CASCADE` keys, and names the two string columns that have no FK. The example (STG row 4 still holding "Royal Courts of Justice") is correct against `generate-seed-sql.ts:72-76` and the mapping.
- Dropping the draft state removed text cleanly. The Q5 answer records why (:388). Ticket 2's summary and scenarios read consistently without it (:499, :533).
- The `setval` now includes the current value, with the reason given (hard deletes can move it backwards, :258). The live-value formula and `BigInt` note are exact (:246).
- Labels are consistent: S1–S4 and tickets 1–2 throughout; "2 build + 4 sibling" (:569); no GitHub issue numbers except S3 (#1537, :450, :549; `tasks.md:33`).
- Security is unchanged and sound. Every page sits behind `requireRole([USER_ROLES.SYSTEM_ADMIN])` (:502). Writes are create-only (:470). Tampered IDs are rejected on the server (:519). There is an unauthorised-user journey (:534) and an `ADD_COURT` audit action (:472, :508).

## Test Coverage Assessment

**Statement coverage per changed workspace:** N/A. No code workspaces changed (docs-only spike), so `yarn test:coverage` was not run.

**Proposed strategy for the follow-on tickets:**

- **Unit (ticket 1):** Strong on the risky paths:
  - the seed run twice (:485), bands (:486) and the freeze (:487);
  - name and reference clashes failing, plus a no-clash re-run (:488-489);
  - the CSV guard both ways, plus the preview-database E2E (:490-491);
  - P2002 mapping (:492) and atomicity (:493).
  - Gaps: the live-value read with `is_called` false and true, and a seed run against S4-renumbered data with the `DO` block (High 1).
- **Unit (S4):** The DoD runs the migration and seed twice, on a fresh database and on an STG copy (`draft-ticket-align-court-ids.md:74`). Add the `DO` block case (High 1), a chain-move check on `artefact` and `subscription` (Suggestion 2), and a check that no `seedref` row is left on a moved court.
- **Unit and template (ticket 2):** Each page has `index.test.ts` and `index.njk.test.ts` with en/cy key parity (:502, :522), following `.claude/rules/testing.md`. There are tests for the skipped reference (:521), "add another" duplicates (:520), tampered POSTs (:519), deep links and resubmission (:515, :535).
- **E2E:** One main journey with validation, Welsh, axe and keyboard steps inline (:523-533), and unauthorised access as its own journey (:534). This matches the `e2e-tests` conventions. The main journey never skips the reference step. Skipping it once in a second run, or replacing one "add another", would cover the optional branch end to end.
- **Accessibility:** axe on step 1's error state and on check answers, plus a keyboard confirm (:526, :531), is adequate. Add axe on the "add another" page (summary list with Remove links) and the success panel.

## Acceptance Criteria Verification

Description ACs (ticket.md:20-22):

- [x] Various options for adding new court locations through the System Admin portal, without needing to use a csv file, are investigated
  - Options A–F in the matrix (report.md:156-163), each in detail (:171-212), database experiments (:300-333), legacy CaTH (:138-148).
- [x] An investigative report with the pros and cons of the various options is provided
  - Pros, cons, effort and c1–c5 per option (report.md:156-163).
- [x] The best solution is highlighted in the investigative report
  - Option C in the highlighted box (report.md:13-31) and §4 (:216).

Spec §3 "Spike deliverable criteria" (ticket.md:167-214):

- [x] Options are investigated and documented: "a written report exists at `docs/tickets/1078/report.md` covering at minimum Options A–F below, each with pros, cons, effort estimate in dev-days, and the risks it carries against the five hard constraints in section 2"
  - report.md:156-163. F is "Not estimable", with the reason at :210.
- [x] A single option is recommended: "exactly one option is named as the recommendation, with the reasoning stated, and the rejected options each carry a one-line reason for rejection"
  - report.md:13-31 and :216. One-line rejections are at :293-298.
- [x] The `location_id` allocation question is answered: "states which of the three allocation strategies (application-side `MAX(location_id) + 1`; a new Postgres sequence seeded above the `locationData` range; a reserved high-ID band such as `>= 100000` for UI-created courts) is chosen, and demonstrates that the chosen strategy cannot collide with `generateLocationsSql()` or the `provenance_location_id = locationId + 100` values emitted by `generateLocationReferencesSql()`"
  - A sequence starting at the legacy start is chosen (report.md:220-225). The disjointness proof is at :231-244, and the `+100` values are shown to be in a different column (:237, :242). The migration SQL is at :250-255. The behaviour was proven on a database (:326-333), and :258 explains why the start value does not change that result.
- [x] The deploy-seed interaction is resolved: "states how a UI-created court is protected from being renamed to `__realign_<id>` by a later addition to `location-data.ts`, and whether `location-data.ts` should be frozen as the source of truth for locations once the UI exists"
  - Freeze, a CI test, and the fail-loudly realign (report.md:262-266). The reference `DO` block is at :269. The decisions are recorded (Q1, Q9 at :384, :392).
- [x] Validation parity with the CSV route is confirmed: "maps every existing CSV validation rule to either a form-level equivalent, a schema-level constraint, or an explicit decision to drop it"
  - All 21 rules are mapped and reconciled (report.md:341-365).
- [x] The CSV route's future is decided: "states whether the CSV route is retained alongside the new journey, deprecated, or restricted to update-only"
  - Restricted to update-only (report.md:283-291), confirmed by Q10 (:393), with S2 (:544-547).
- [~] Follow-on tickets are raised: "implementation tickets exist for the recommended option, sized to be individually shippable, and this specification's sections 4–13 are attached to them"
  - Judged on the agreed scope: described in §7 and raised after sign-off (report.md:450; tasks.md:35). Every ticket is described with a size and dependencies (report.md:454-554), and sizes and labels agree.
  - Missing: S4's migration and ticket 1's `DO` block conflict, so S4's deploy fails if ticket 1 ships first. This contradicts "works in either order" (report.md:552; `draft-ticket-align-court-ids.md:30`). See High 1.

Tally: 9 of 10 met, 1 partly met (follow-on tickets), 0 unmet.

## Next Steps

- [ ] High 1: have S4's migration remove or rewrite the moved courts' `seedref_<old>` rows. Correct report.md:552 and `draft-ticket-align-court-ids.md:30`, `:36`. Extend the DoD at `:74` to cover the `DO` block.
- [ ] High 2: this is resolved once High 1 is.
- [ ] Suggestions 1–3 (test-support ID path, the string-column chain, S4 pre-checks) are cheap and protect the build. Then Suggestion 8 (start value versus unmatched courts) and Suggestion 4 (Q3 formula).
- [ ] The remaining suggestions, where they are cheap.
- [ ] Human: tech lead and PO sign-off, then raise the §7 tickets with spec §4–13, then close #1078 (tasks.md:35).

## Overall Assessment: NEEDS CHANGES

The three remaining highs from review 5 are dealt with:

- The CSV E2E change is in ticket 1, and preview databases are described correctly.
- S4 moves its own rows through a migration, and the FK and string-column facts behind it are correct.
- The draft state is gone without leftovers.

Sizes, page counts and labels agree. One new gap remains. S4's migration moves the old seed references along with the courts, so ticket 1's Q2 `DO` block fails S4's deploy for two courts. That breaks the "either order" claim. The fix is a short addition to S4's migration and DoD. It does not change the recommendation.
