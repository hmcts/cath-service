# Code Review: Issue #1078

Fourth pass. The third review is preserved as `docs/tickets/1078/review-previous-3.md`.

Reviewed at `4d3d4c8c` on `feature/1078-court-maintenance-spike`. The branch diff from `origin/master` adds only `docs/tickets/1078/*` (7 files). There is no code change. I checked `report.md` (584 lines) against the description ACs and spec §3 in `ticket.md`, plus `plan.md`, `tasks.md`, `legacy-court-mapping.md` and `draft-ticket-align-court-ids.md`. I also checked the raised GitHub issues #1531, #1532, #1533, #1535 and #1536 (`gh issue view`), and re-read the cited source in this worktree.

## Summary

Since the third review, six commits recorded the developer's answers to Q1–Q12 (report.md:379-393), linked the raised issues (report.md:583, tasks.md:31-35) and closed #1536 after Q9.

The third review's High 1 is resolved, though not in the way it proposed. The way-B legacy load and every `vibe-653` dependency were removed at the developer's request (report.md:581). Instead, a staging-export comparison was added (`legacy-court-mapping.md:41-69`, report.md:146), along with a renumbering ticket (#1533, `draft-ticket-align-court-ids.md`). The SJP claim was corrected: legacy staging has SJP at 9, which matches seeded 9 (`legacy-court-mapping.md:51`, `location-data.ts:67-68`). The export is deliberately not committed (`draft-ticket-align-court-ids.md:148`), so I could not check it.

The main problem now is that **the answers were added as a list but not worked into the report**. tasks.md:27 says to "fold the answers into the report when they arrive". This has not happened. The recommendation box, §4.1, §5, §6.1, both ticket bodies and the risk table still describe the design as it was before the answers. In several places they contradict the answers. GitHub issues #1531 and #1532 have the same problem: an answers addendum is appended below an unchanged body.

Two answers also create new design problems the report does not address:

- The Q3 start value (about 1389) makes ticket 1's interim CSV guard reject the CSV E2E band.
- The Q2 "fail the deploy" rule has no mechanism that works with a seed that re-runs on every deploy.

The spike still meets all three description ACs. Of the seven spec §3 criteria, five are met and two are partly met.

## 🚨 CRITICAL Issues

None. No acceptance criterion is unmet, and no security or accessibility defect is introduced (there is no code).

## ⚠️ HIGH PRIORITY Issues

1. **[~] The `location_id` allocation AC: the report now states two different starts, and the proof covers the one no longer chosen**
   - **Where:** box (report.md:20), §4.1 (:216-256), Q3 text (:401), risks (:432-433), ticket 1 summary, scope and scenarios (:457, :461-462, :469, :476-480). All of these say 100000. The Q3 answer (:382) says "highest legacy production P&I ID plus a margin, not 100000", for example 1389.
   - **Impact:** A reader who stops at the box or §4.1 builds the wrong migration. The disjointness table (:226-232) proves "everything is below 100000". The new start sits *below* three of those bands, so the table no longer proves the chosen design. The band test at :469 ("99999 below the sequence start") will fail by design.
   - **Fix:**
     - Rewrite §4.1 around `<start>` = highest legacy prod ID + margin. Show the new disjointness argument: start > max(seeded/legacy IDs), and start + expected UI volume < 9001.
     - State that on STG the `GREATEST(...)` will actually start near 100000, because MAX sits in the 9xxxx band. So the configured start and the live sequence value differ per environment.
     - Update the box, Q3, the two risk rows and ticket 1 to match.
     - Add #1533 (the legacy prod export) to ticket 1's "Depends on" (:449), because the start value waits on it.

2. **Ticket 1's interim CSV guard, combined with the Q3 start, breaks the CSV E2E suite in ticket 1, not S2**
   - **Where:** report.md:238, :467, :479. `e2e-tests/utils/location-csv.ts:11-12` creates *new* courts at 80000–89999 through the real upload journey (`e2e-tests/tests/system-admin/reference-data-upload.spec.ts`). With a start of 1389, those IDs are unused IDs "at or above the sequence start", so the guard rejects them. The report puts the `location-csv.ts` change in S2 (:531). Ticket 1 will break CI first.
   - **Also ambiguous:** "the sequence start" could mean the configured constant (1389) or the live sequence value (about 100000 on STG). The two behave very differently on STG.
   - **Fix:**
     - Define the guard's threshold exactly, either as a named constant shared with the migration and band test, or as a read of the sequence.
     - Move the `location-csv.ts` change (create courts through test-support, then upload as an update) into ticket 1's scope.
     - Add a scenario that the existing CSV E2E spec still passes.
     - Mirror this in #1531.

3. **The answers to Q1–Q12 are recorded but not folded into the report, tasks or GitHub issues**
   - **Ticket 1 (report.md:455-484, #1531):**
     - Q2 says ticket 1 changes `generate-seed-sql.ts:111` (:381), but "Out of scope: … changing the seed's reference clause (Q2)" (:473).
     - Guard b was answered "yes" (:380), but scope still says "If the tech lead chooses" (:470).
     - The Q9 freeze for regions, jurisdictions and sub-jurisdictions (:389) is not in scope or scenarios.
     - The size is still "2 d" (:449, :484) despite three added items.
   - **Ticket 2 (report.md:486-523, #1532):**
     - The body says "Size: 4.5–6 d" (:523). The table says 7.5–9 d (:450).
     - It still says "seven pages" (:488), although Q6 adds a page and Q5 adds a publish step.
     - It still says "select or radios per Q11" (:495), but Q11 answered radios (:387).
     - It still says "'Add another' only if Q6 says so" (:495), but Q6 answered yes (:385).
     - The reference step is not marked skippable, although Q7 says it is (:386).
     - The draft state has no scope bullet or scenario.
   - **§5 parity table:** rule 9 is still "Step 5, all three fields" (:349) although Q7 drops it. Rule 15 is still "Dropped deliberately" (:355) although Q6 brings it back. The reconciliation (:363) needs re-counting.
   - **Totals:** the box says 6.5–8 d (:28). The table says 9.5–11 d (:451).
   - **Stale status text:**
     - §6.1 is still headed "ready to send (none sent)" (:377), and Q1–Q12 (:397-423) are still phrased as open questions.
     - S4 is still proposed (:537-539) although #1536 is closed.
     - The §8 checklist says "Retained for bulk" (:552).
     - The last line says "Needs a person: sending Q1–Q12" (:584).
     - §8 :577 and :579 describe Q1 options B, D and E that :581 then says were removed.
   - **Impact:** The build tickets are the spike's output, and each one contradicts itself. A developer picking up #1531 or #1532 cannot tell which half is authoritative.
   - **Fix:** Rewrite ticket 1, ticket 2, §5, the box and §6.1 so the answers are the body, not an addendum. Turn §6.1 into "Decisions" with the answer and its consequence per question. Remove or mark S4 as closed. Prune the §8 change log to the current state. Then copy the revised bodies over #1531 and #1532.

4. **Q2 "a clash fails the deploy" (and guard b) has no mechanism that works on a re-running seed, and its blast radius is not stated**
   - **Where:** report.md:381, :264. The seed re-inserts its own `seedref_<id>` rows on every deploy (`generate-seed-sql.ts:105`, `:111`). A plain `INSERT` without `ON CONFLICT` would fail on the second deploy of every environment. The guarded `DO UPDATE … WHERE` variant tested in §4.2 (:272) skips silently. It does not fail.
   - **Blast radius:** the seed is one transaction (`generate-seed-sql.ts:63` `COMMIT`, applied by `apps/postgres/start.sh:105`), covering list types too. Any raised error rolls back all reference data and fails the postgres deploy pod on every deploy until someone edits `location-data.ts`. The previous review's Suggestion 8 raised the same gap, and it is still open.
   - **Fix:**
     - In ticket 1, specify a pre-check that raises only on a real clash, for example a `DO $$ … RAISE EXCEPTION … $$` block. It should check for an `(SNL, id+100)` row whose `location_id` differs from the seeded ID, and for guard b a name owned by a row at or above `<start>`. Keep `ON CONFLICT … DO UPDATE … WHERE location_id = EXCLUDED.location_id` for the normal re-run.
     - Add scenarios for "seed twice, no error" and "deliberate clash, deploy fails with a message naming the court".
     - Add a one-line runbook note on how to recover.

5. **[~] Spec AC "Follow-on tickets are raised" is still only partly met**
   - **Where:** ticket.md:210-214. Tickets are raised: #1531, #1532, #1533, #1534, #1535, #1537, and #1536 (now closed) (tasks.md:31-35, report.md:583).
   - **What is missing:**
     - Spec sections 4–13 are not attached (tasks.md:34 is unchecked). The issue bodies list spec sections by reference, but #1078's spec has no section for the draft state, the publish step or "add another".
     - Because of High 3, neither build ticket is reliably "sized to be individually shippable".
   - **Fix:** Resolve High 3, then attach the spec sections and add the Q5/Q6/Q7 additions as an explicit delta to the spec in #1532.

6. **The Q5 draft state is a cross-cutting change with no design, security or test detail**
   - **Where:** report.md:384, :450. The report says only "a draft flag, a publish step, and hiding drafts from the public A–Z and subscription search".
   - **Code impact:**
     - The `location` table is read in `libs/location/src/repository/queries.ts` (5 call sites), `libs/system-admin-pages/src/jurisdiction-management/queries.ts`, `mi-report/court-name-resolver.ts`, the CSV download and the validation (`.location.find*` grep).
     - Publications are matched to locations by numeric ID. #1532's addendum mentions "publication routing", but report.md:384 does not.
     - With Q7, a draft may have no provenance reference, so upstream lists cannot match it anyway. A manual upload to a draft court is not addressed.
   - **Impact:** If even one reader is missed, the draft court leaks to the public (A–Z, `/api/locations`, subscriptions) or a publication is accepted for a court the public cannot see. The publish step also needs `requireRole([USER_ROLES.SYSTEM_ADMIN])`, an audit action (`AuditLogAction` has none, `libs/system-admin-pages/src/audit-log/logger.ts:3-26`), Welsh content and an E2E journey.
   - **Fix:**
     - In #1532 (or a separate ticket, since it is about 2 d of the 7.5–9 d), list every location reader and say whether it filters drafts.
     - Decide whether publications for a draft court are rejected or held.
     - Add `PUBLISH_COURT` to the audit actions.
     - Add scenarios: a draft is not in the A–Z in English and Welsh; a draft is not subscribable; publish is refused without `SYSTEM_ADMIN`; a published court appears.

## 💡 SUGGESTIONS

1. **Q4's bulk-edit half is unanswered, but :393 says "All of Q1–Q12 are answered".** The Q4 answer (:383) covers only how courts are added. Decision 3 step 4 (:287) depends on how often bulk edits happen. Either record that step 4 stays open, or get the answer.
2. **Q3 and #1533 are coupled.** If #1533 renumbers the seeded courts to legacy IDs, the freeze test "exactly IDs 1–27" (:263, :468, :478, box :23) becomes wrong. `draft-ticket-align-court-ids.md:105` notes the ordering. Phrase the freeze test as "exactly these 27 IDs" (a list), so it survives the renumber.
3. **Freeze test location** is still "`generate-seed-sql.test.ts` (or beside `libs/location/src/location-data.ts`)" (:263). Pick `libs/location`, and put the Q9 region/jurisdiction freeze there too.
4. **Ticket 1 needs a CLAUDE.md item 7 task.** CLAUDE.md still says adding to `location-data.ts` "is all you need". A developer who follows it will hit the new freeze test. §4.2 says to document it (:260), but ticket 1's scope (:459-471) has no task for it. #1533 covers only the ID part (`draft-ticket-align-court-ids.md:100`).
5. **S2 asks for "a bilingual message"** (:529) on summary pages that hard-code `locale = "en"` (`apps/web/src/pages/(system-admin)/reference-data-upload-summary/index.ts:45`, `:111`; `reference-data-upload-confirmation/index.ts:9`). Either scope the locale fix into S2 or say "English".
6. **Add two CSV-route defects to S2:**
   - The summary page logs the full parsed file, including court emails and phone numbers (`reference-data-upload-summary/index.ts:71`, `console.log("Parsed data:" …)`). That is a logging-hygiene issue.
   - Rules 20 and 21 build `html` from user-supplied names (`libs/system-admin-pages/src/reference-data-upload/validation/validation.ts:245`, `:276`). That is a self-XSS sink.
7. **"Same file-based apply as `start.sh:104-105`"** (:303). Deploy uses `prisma db execute --file` (`apps/postgres/start.sh:105`), not `psql`. Reword to "equivalent".
8. **Stale line refs in the draft ticket.** `draft-ticket-align-court-ids.md:82` cites `generate-seed-sql.ts:65-73`, `:94-96`. The realign function is at `:72-76` and the location upsert at `:93-97`.
9. **CSRF posture** for the new POST pages is still not stated for ticket 2. Say which existing mechanism applies, or that `sameSite` is the only control.
10. **Q11 content design.** The answer (:387) says hint texts need checking by content design before build. Add that as an explicit pre-build task in #1532, and ask design to confirm the multi-field steps 1, 2 and 5 against one-thing-per-page.
11. **`plan.md` is pre-answers** (100000 at plan.md:142-148, :216). Add a one-line banner pointing to report §6.1, so the two do not look like competing sources.
12. **Ticket 2 E2E with Q6 and Q7.** Have the main journey skip the reference step once and use "add another" once, so both new branches are covered without adding tests.

## ✅ Positive Feedback

- Every Q1–Q12 answer comes with its consequence and the issue it lands in (report.md:380-391). That is the right raw material. It just needs moving into the body.
- Replacing way B with a court-by-court staging comparison (`legacy-court-mapping.md:41-69`) is more useful than the third review's proposal. It found that 19 seeded IDs belong to a different legacy court. It also handles the data carefully: the raw export is not committed because it holds contact details (`draft-ticket-align-court-ids.md:148`).
- #1533 is a well-formed technical ticket. It has a scope, removes the hard-coded SJP ID (`account-home/index.njk:22`, `view-option/index.ts:42`), includes an STG clean-up plan and a second-reviewer rule.
- The third review's citation fixes landed: the partly translated legacy pages (:139) and the spec §3 quote (:289). Q4 now asks about bulk edits (:405).
- The Q9 decision (freeze instead of new sequences) is simpler (YAGNI) and is recorded with its accepted residual risk (:389).
- Security is consistent in every proposal: `requireRole([USER_ROLES.SYSTEM_ADMIN])` on every page (:491), role refusal as its own E2E journey (:519), server-side rejection of tampered IDs and vocabularies (:506), and a create-only transaction with no `deleteMany` (:464).
- Code citations I re-checked are exact:
  - `location.prisma:70-74`, `:93`
  - `generate-seed-sql.ts:72-76`, `:93-97`, `:99-112`, `:80`
  - `validation.ts` has exactly 21 `errors.push` calls, all with `href: "#file"`
  - `upload-repository.ts:20-22`, `:53`, `:73`, `:79`, `:104`
  - `reference-data-upload-summary/index.ts:45`, `:108`, `:111`, `:125`, `:132`
  - `session.ts:28`, `:33`
  - `queries.ts:264-270` (hard delete)
  - `test-support/.../locations.ts:56`, `:136`, `:155`
  - `csv-parser.ts:76`
  - `start.sh:95`, `:104-105`

## Test Coverage Assessment

**Statement coverage per changed workspace:** N/A. No code workspaces changed (docs-only spike), so `yarn test:coverage` was not run.

**Proposed test strategy for the follow-up tickets:**

- **Unit (ticket 1):** The service, P2002 mapping, atomicity and interim-guard scenarios (report.md:476-482) follow `.claude/rules/testing.md`. Gaps:
  - the band test must be rewritten for the Q3 start (High 1);
  - a test for the Q2/guard-b pre-check raising only on a real clash (High 4);
  - the Q9 region/jurisdiction freeze test;
  - "existing CSV E2E still passes" (High 2).
- **Unit and template (ticket 2):** `index.test.ts` and `index.njk.test.ts` per page, with en/cy key parity (:491, :508). These match the rules. Missing: radios rendering (Q11), the skippable reference step (Q7), "add another" with within-submission duplicates (Q6), and draft/publish (Q5).
- **E2E:** One journey per user journey, with validation, Welsh, axe and keyboard inline (:509-518), and unauthorised access as a separate journey (:519). This matches `e2e-tests` conventions. Missing: a publish-a-draft journey, and the assertion that a draft is hidden from the public A–Z in both languages (High 6).
- **Accessibility:** axe on the error state and on check answers, plus a keyboard confirm (:512, :516), is adequate. Add axe on the "add another" page and the publish page.

## Acceptance Criteria Verification

Description ACs (ticket.md:20-22):

- [x] Various options for adding new court locations through the System Admin portal, without needing to use a csv file, are investigated
  - Options A–F are in the matrix (report.md:154-161), with a subsection each (:169-210), database experiments (:298-331) and legacy CaTH (:136-146).
- [x] An investigative report with the pros and cons of the various options is provided
  - Pros, cons, effort and c1–c5 for each option (report.md:154-161).
- [x] The best solution is highlighted in the investigative report
  - Option C in the highlighted box (report.md:13-29) and §4 (:214).

Spec §3 "Spike deliverable criteria" (ticket.md:167-214):

- [x] Options are investigated and documented: "a written report exists at `docs/tickets/1078/report.md` covering at minimum Options A–F below, each with pros, cons, effort estimate in dev-days, and the risks it carries against the five hard constraints in section 2"
  - report.md:154-161. F is "Not estimable", with the reason at :208.
- [x] A single option is recommended: "exactly one option is named as the recommendation, with the reasoning stated, and the rejected options each carry a one-line reason for rejection"
  - report.md:13-29, :214; one-line rejections at :291-296.
- [~] The `location_id` allocation question is answered: "states which of the three allocation strategies … is chosen, and demonstrates that the chosen strategy cannot collide with `generateLocationsSql()` or the `provenance_location_id = locationId + 100` values emitted by `generateLocationReferencesSql()`"
  - The sequence is chosen (report.md:216-222). The proof (:224-234) and experiment (:324-331) are for a start of 100000. The Q3 answer changes the start to legacy max + margin (:382), and the report has not re-shown disjointness for that value. See High 1.
- [x] The deploy-seed interaction is resolved: "states how a UI-created court is protected from being renamed to `__realign_<id>` by a later addition to `location-data.ts`, and whether `location-data.ts` should be frozen as the source of truth for locations once the UI exists"
  - The freeze and CI test (report.md:258-266) were confirmed with guard b (:380). The mechanism for guard b still needs specifying (High 4), but the protection and the freeze decision are both stated.
- [x] Validation parity with the CSV route is confirmed: "maps every existing CSV validation rule to either a form-level equivalent, a schema-level constraint, or an explicit decision to drop it"
  - All 21 rules are mapped and reconciled (report.md:335-371), matching the 21 `errors.push` in `validation.ts`. Rows 9 and 15 need updating for Q7 and Q6 (High 3).
- [x] The CSV route's future is decided: "states whether the CSV route is retained alongside the new journey, deprecated, or restricted to update-only"
  - Restricted to update-only (report.md:281-289), confirmed by Q10 (:390), with S2 raised as #1535.
- [~] Follow-on tickets are raised: "implementation tickets exist for the recommended option, sized to be individually shippable, and this specification's sections 4–13 are attached to them"
  - Raised as #1531–#1537 (tasks.md:31-35, report.md:583). Spec sections 4–13 are not attached (tasks.md:34). Both build-ticket bodies contradict their own answer addenda on scope and size (report.md:449-523, High 3).

Tally: 8 of 10 met, 2 partly met (allocation proof, follow-on tickets), 0 unmet.

## Next Steps

- [ ] High 1: rewrite §4.1, the box, Q3, the risks and ticket 1 around the Q3 start. Re-state the disjointness proof. Add #1533 as a dependency of ticket 1.
- [ ] High 2: define the interim guard's threshold exactly, and move the `location-csv.ts` change into ticket 1.
- [ ] High 3: fold every answer into the body. That covers ticket 1 (Q2 in scope, guard b, Q9 freeze, size), ticket 2 (radios, add another, skippable reference, draft, page count, size), §5 rows 9 and 15, the box total, §6.1 as decisions, and removing S4. Prune §8.
- [ ] High 4: specify the seed pre-check that fails only on a real clash. Add scenarios and a recovery note.
- [ ] High 6: list every location reader and its draft behaviour, and decide how publications for a draft court are handled. Add the publish audit action and scenarios.
- [ ] High 5 (human): copy the revised bodies to #1531 and #1532, and attach spec §4–13 plus the Q5/Q6/Q7 delta (tasks.md:34).
- [ ] Suggestions 1–12 where cheap. Suggestion 4 (the CLAUDE.md task) and Suggestion 6 (the PII logging) matter most.
- [ ] Human: tech lead and PO sign-off, then close #1078 (tasks.md:36).

## Overall Assessment: NEEDS CHANGES

The investigation is complete and accurate against the code. The three description ACs are met, and the third review's legacy-ID concern is resolved by the mapping and #1533. But the deliverable has not caught up with its own decisions. The answers to Q1–Q12 sit in a list, and the report, both build tickets and the GitHub issues still describe the earlier design in many places, so they contradict themselves. Two answers (the Q3 start and the Q2 fail-the-deploy rule) also open design gaps that ticket 1 must close before it is buildable. This is a documentation rework, not a change of recommendation.
