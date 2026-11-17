# Review: #1078 Spike, Court Maintenance (third pass)

Reviewed: `docs/tickets/1078/report.md` (568 lines, edited 2026-11-17 08:41). I checked it against `ticket.md` (the description ACs and the `/spec` comment §3), `plan.md`, `tasks.md` and both earlier reviews (`review-previous.md`, `review-previous-2.md`). I also read the source on branch `vibe-1383` at `828aa742`, the legacy `hmcts/pip-frontend` and `hmcts/pip-data-management` repos on GitHub, and `origin/vibe-653`. `git diff` is empty, so this reviews the spike deliverable only.

`report.md` is untracked. To check the ticket merge exactly, I compared it with the 558-line version the second review read, which was recovered from the local editor history (`~/.claude/file-history/.../2bf51b4c80e38c4d@v1`, 2026-11-16 08:32). Every line reference to "the old ticket N" below comes from that diff.

## Summary

The three edits made since the second review are sound:

- **CSV interim guard (the second review's High 1): resolved.** The guard now rejects only unused IDs at or above the sequence start. The rule reads the same in all five places: the box (report.md:26), §4.1 (:238), ticket 1's scope (:459), its scenarios (:471-472) and the §6.2 risk row (:423). A new scenario proves that a full download can be re-uploaded (:472). `validateLocationData()` is already `async` (`validation.ts:7`), so the extra `findMany` fits.
- **The tickets 2–5 merge lost nothing.** Every scope bullet, scenario and spec reference from the old tickets 2–5 is in the new ticket 2 (report.md:478-515). The size adds up (1–1.5 + 1–1.5 + 1 + 1.5–2 = 4.5–6 d, total 6.5–8 d). S1 (:519), S2 (:525), tasks.md:32 and §8 (:546) are all updated. There are no stale "five tickets", "ticket 5" or "tickets 1–5" references. The merge also resolves old Suggestion 11 (conventions and a Welsh scenario).
- **Decision 3 as a phased plan (report.md:281-289)** agrees with S1, S2, Q8 and Q10. There are two problems. It misquotes spec §3 (:289). Its last step depends on how often bulk *edits* happen, but Q4 only asks how often courts are *added* (:397).

The new §1.7 is useful and most of its citations are exact (table below). Two are wrong. "§4" should be §6 of the migration plan, and "bilingual" overstates the legacy pages. The bigger problem is Q1's recommendation of way B (report.md:386-389). The Q1 table and its load-order advice only consider legacy IDs at or above 100000. They do not consider legacy IDs and names that overlap the 27 seeded courts:

- Legacy SJP is location **0**, named "Single Justice Procedure" (`pip-data-management` `V1.1__Sjp_court_load.sql`, `V1.2__Sjp_court_load.sql`). Here, seeded location **9** has the same name (`location-data.ts:67-68`).
- The migration attaches legacy artefacts, subscriptions and metadata by numeric `location_id` (`pip-to-cath-migration.sql:196`, `:363`, `:417`).

So "keep legacy IDs" and "`location-data.ts` stays frozen at 27 with no exceptions" (:389) cannot both hold unless the seeded IDs 1–27 match legacy. The "load before ticket 1's migration" advice is also impractical for prod. That is new High 1.

The three description ACs are met. Six of the seven spec §3 criteria are met. "Follow-on tickets are raised" is still partly met, because raising them needs a human (tasks.md:31-35).

## Citations checked

New or changed since the second review:

| # | Report cite | Result |
|---|---|---|
| 1 | `pip-frontend` `src/main/routes/routes.ts:844-875`: four routes behind `isPermittedSystemAdmin` (report.md:139) | **Exact.** `:844` opens `GET /reference-data-upload` and `:875` closes `GET /manual-reference-data-download` |
| 2 | Legacy summary and confirmation pages "were bilingual" (report.md:139) | **Overstated.** `locales/cy/reference-data-upload-summary.json` and `-confirmation.json` exist and translate the titles and headers. `actionName` "Change", `fileKey` "File", `confirmButton` "Confirm", `panelTitle` "Success" and `panelBodyMessage` "Your file has been uploaded" are still English. Say "had Welsh locale files, only partly translated" |
| 3 | `LocationController.java:105-113`, `POST /locations/upload` (report.md:140) | **Exact.** `@PostMapping("/upload")` at `:105`, method ends at `:113`. Class mapping `/locations` is at `:40` |
| 4 | `LocationService.uploadLocations()` `:159-192`; "an existing ID was overwritten, including its references, and nothing was deleted" (report.md:140) | **Exact.** Method `:159-193` (the closing brace is at `:193`). The Javadoc at `:153-155` says exactly this |
| 5 | `Location.java:37-39`, `@Id Integer locationId` with no generator (report.md:140) | **Exact.** No `@GeneratedValue` anywhere in the file |
| 6 | `:317-350` duplicate names (DB and in-file); `:301-315` HTML tags (report.md:141) | **Exact.** `checkLocationNameDuplication()` runs `:317-353` and `validateLocationName()` runs `:301-315`. The duplicate check is case-sensitive (`equals`), which the report does not claim either way |
| 7 | Regions and jurisdictions are free-text `text[]` (report.md:141, :386) | **Exact.** `Location.java:35`, `:45-62`, `:73-83`. Note that there are also `jurisdiction_type`, `welsh_region`, `welsh_jurisdiction` and `welsh_jurisdiction_type` arrays (Suggestion 5) |
| 8 | "No create journey has ever existed" (report.md:144) | **Accurate for users.** `LocationService.createLocation()` (`:195-204`) exists, but only `TestingSupportController` calls it, which is the same as today's test-support route |
| 9 | "No seed … that renamed rows on deploy" (report.md:142) | **Accurate.** Legacy loaded SJP once through Flyway (`V1.1`/`V1.2__Sjp_court_load.sql`, `ON CONFLICT DO NOTHING`). There was no deploy-time realign |
| 10 | `legacy-data-migration.md` "last changed 2026-10-29" (report.md:146) | **Author date only.** `c7e2ceac` was authored on 2026-10-29 but committed on 2026-11-16 |
| 11 | §3.4: "`location-data.ts` is maintained by hand here" (report.md:146) | **Exact quote**, at `legacy-data-migration.md:155` |
| 12 | "Lists `location-data.ts` matching the legacy locations as a prerequisite with no ticket (§4)" (report.md:146) | **Wrong section.** §4 is "Schema and supporting changes" (`:167-171`). The row is in §6 "What's left", under "Before any run, dry runs included" (`:204`) |
| 13 | `pip-to-cath-migration.sql:196`, `:363`, `:417`: unknown-location rejections for subscriptions, metadata and artefacts (report.md:146) | **Exact.** Also described in the plan at `legacy-data-migration.md:164` |
| 14 | "The migration does not migrate `location`" (report.md:146) | **Accurate.** It is in §3.4's "Not migrated" list (`:155`), and `IMPORT FOREIGN SCHEMA … LIMIT TO (location_metadata, list_search_config, artefact, artefact_search)` (`pip-to-cath-migration.sql:89-91`) does not import `location` |
| 15 | Way B: "the existing `postgres_fdw` link" (report.md:386) | **Accurate.** `CREATE EXTENSION postgres_fdw` and two foreign servers (`pip-to-cath-migration.sql:72-91`). Way B must add `location` and `location_reference` to the `LIMIT TO` list |
| 16 | Way B "can be rehearsed with the migration's `test/run.sh`" (report.md:389) | **Accurate.** `legacy-data-migration.md:173-189`. The fixtures would need a legacy `location` with arrays (`test/legacy-publication.sql:4` has only `location_id, name` today) |
| 17 | Way A "loses email and contact numbers (already an open item)" (report.md:385) | **Exact.** `legacy-data-migration.md:223` |
| 18 | `download-service.ts:6-8`, `findMany` with no filter (report.md:238) | **Exact** |
| 19 | Spec §3: "The spec allows any of the three outcomes: retained, deprecated or removed" (report.md:289) | **Misquoted.** ticket.md:207-208 says "retained alongside the new journey, deprecated, or restricted to update-only". "Removed" is not one of the spec's outcomes. See Suggestion 3 |

Carried over and unchanged (rows 9-11 in the second review): `reference-data-upload/index.ts:41-81` (report.md:44, the handler is `:35-91`); `apps/api/src/routes/locations.ts:1-2` (report.md:91, the web autocomplete is `libs/location/src/routes/locations.ts`); "every one is an English template literal with `href: \"#file\"`" (report.md:337, rules 20 and 21 also set `html`).

## 🚨 CRITICAL Issues

None. No AC is unmet, and no wrong citation undermines a conclusion.

## ⚠️ HIGH PRIORITY Issues

1. **Way B's "keep legacy IDs" ignores overlap with the 27 seeded courts, and its load-order advice cannot be followed in prod** (report.md:146, :381-389, :430)
   - **Problem:**
     - **(a) IDs and names collide with the seed.** The seeded IDs 1–27 and the SNL references "101"–"127" were made up for this service. Legacy P&I IDs are also small integers. Legacy SJP is location 0 and is called "Single Justice Procedure" (`pip-data-management` `V1.1__Sjp_court_load.sql`, renamed in `V1.2`). Here that name belongs to seeded location 9 (`location-data.ts:67-68`). If way B copies legacy `location` with its IDs:
       - a legacy court whose ID is between 1 and 27 either clashes on `location_pkey` or, after the next deploy, is renamed by `ON CONFLICT (location_id) DO UPDATE SET name` (c3);
       - a legacy court whose name matches a seeded court clashes on `location_name_key` or is parked as `__realign_<id>` (c3);
       - real legacy SNL references can clash with "101"–"127" and be re-pointed (c4; the migration plan already lists "Real location references in place of the synthetic seeded ones" at `legacy-data-migration.md:236`);
       - because artefacts attach by numeric ID (`pip-to-cath-migration.sql:417`), a legacy court-1 publication would appear under "Oxford Combined Court Centre".

       So "lets `location-data.ts` stay frozen at 27 with no exceptions" (:389) only holds if the 27 seeded courts already *are* the legacy courts at the same IDs. Nobody has checked that.
     - **(b) "Replaced in full".** The migration replaces every table except users in full (`legacy-data-migration.md:82`; `DELETE FROM public.…` at `pip-to-cath-migration.sql:463-470`) and is designed to be re-run. If `location` were handled the same way, it would delete the seeded and UI-created courts and cascade to their mappings and references. Way B must merge `location`, not replace it.
     - **(c) Load order.** The advice "load legacy courts before ticket 1's migration, so the `GREATEST(...)` starts the sequence above them" (:389) assumes the legacy load comes first. In practice ticket 1's migration runs at deploy in every environment. On prod, which does not exist yet, it runs when the environment is created, before any cutover migration. The `GREATEST` only runs once.
   - **Impact:** Q1 asks the tech lead and the `vibe-653` owner to choose B on the strength of this table. The risk row (:430) carries the same gap. A wrong choice here misroutes legacy publications or breaks the deploy seed.
   - **Fix:**
     - Add a check to Q1, next to the "highest legacy P&I ID" check: do legacy IDs 0–27 and their names match `locationData` 1–27? If they do not, B has to either replace the 27 seeded courts with the legacy ones (so "frozen at 27" becomes "frozen, and the 27 removed or re-keyed") or remap IDs, which breaks the "keep legacy IDs" rule the migration depends on.
     - State that B upserts `location` and does not delete it.
     - Replace the load-order advice with: "after loading `location`, the migration script runs the same `SELECT setval('location_location_id_seq', GREATEST(100000, (SELECT COALESCE(MAX(location_id), 0) + 1 FROM location)), false)` as ticket 1's migration", so order no longer matters. Because `MAX` includes any UI-created courts, the next `nextval` cannot collide. A legacy ID that equals an existing UI court's ID must still be rejected by the load.
     - Mirror this in the §6.2 row (:430).

2. **[~] Spec AC "Follow-on tickets are raised" is only partly met** (ticket.md:210-214)
   - **Problem:** Tickets 1 and 2 and S1–S4 are drafted in full (report.md:437-531), with spec sections listed per ticket. None has been raised and nothing is attached (tasks.md:31-35).
   - **Impact:** None on the report's quality. The AC applies "when the spike is closed", and raising the tickets needs a human with Q1 and Q3 answered.
   - **Action:** Human-owned. This is not a defect in the report.

## 💡 SUGGESTIONS

New since the second review:

1. **Fix the two §1.7 citations** (report.md:139, :146). Change "(§4)" to "(§6, 'Before any run')" (`legacy-data-migration.md:204`). Replace "were bilingual" with "had Welsh locale files, but buttons and panel text were still English" (row 2). Optionally say "authored 2026-10-29, committed 2026-11-16".
2. **Mention legacy SJP location 0** in §1.7. It is the concrete case behind High 1(a), and it shows that legacy *did* load a court by migration once (Flyway `V1.1`), which is a precedent for way B.
3. **Correct the spec quote in Decision 3** (report.md:289). Spec §3 offers "retained alongside the new journey, deprecated, or restricted to update-only". Say that the decision is "restricted to update-only (S2), with deprecation decided after S1". That is one of the spec's outcomes, and it is what the AC needs.
4. **Make Decision 3's last step answerable, and keep the summaries in step with it:**
   - Q4 (:397) asks how often courts are *added*. Step 4 (:287) needs to know how often *bulk amendments* happen. Add that to Q4 or Q8.
   - Cite Q10 at step 2 (:285).
   - The box (:25) and §8 (:544) still read "keep the CSV route for bulk edits". Add "removal decided after S1 (Q4)" so a reader who stops at the box sees the phased plan.
5. **Spell out way B's mapping work** (:386). There are six legacy arrays (`region`, `jurisdiction`, `jurisdiction_type` and their `welsh_*` versions, `Location.java:45-83`). Sub-jurisdictions here correspond to `jurisdiction_type`, not `jurisdiction`. B also needs `location` and `location_reference` added to `LIMIT TO` (`pip-to-cath-migration.sql:90`), and fixtures with arrays in `test/legacy-publication.sql`.
6. **Ticket 2 dependencies and PR plan** (:442, :480, :515):
   - Add Q7 (Welsh name and provenance availability, which decides whether step 1 or step 5 blocks) and Q12 (role) to "Depends on".
   - Pages are auto-discovered, so each page is reachable by URL as soon as its PR merges, before the hub entry exists. `requireRole` keeps that to System Admins, which is acceptable, but say so in the "several PRs behind the hub entry" sentence.

Carried over from the second review, still open:

7. (old 1) The freeze test location is still "`generate-seed-sql.test.ts` (or beside `libs/location/src/location-data.ts`)" (report.md:263, :460). Put it in `libs/location`.
8. (old 2) Guard (b)'s blast radius (the seed rolls back as one transaction and the postgres pod fails on every deploy) is still not stated in Q1 (:381).
9. (old 3) The `setval` variant has still not been run (:256).
10. (old 4) "the same file-based apply as `start.sh:104-105`" (:303). Deploy uses `prisma db execute`, not `psql`.
11. (old 5, partly resolved) Ticket 1 no longer says "bilingual" (:459). S2 still asks for "a bilingual message" (:521) on a summary page that hard-codes `locale = "en"` (:54). Scope the locale fix into S2, or say "English".
12. (old 6) The three imprecise citations listed under the table above (report.md:44, :91, :337).
13. (old 7) The self-XSS sink in rules 20 and 21 (`validation.ts:245`, `:276`, rendered `| safe`) is not in S2's scope (:521-525).
14. (old 8) Ticket 1 still has no "update CLAUDE.md item 7" task (:452-463). CLAUDE.md item 7 still says adding to `location-data.ts` "is all you need", so the new freeze test will fail CI for a developer who follows it.
15. (old 9) The ID-reuse argument for the sequence (hard delete plus FK-less artefacts and subscriptions) has not been added to Decision 1 (:218-222).
16. (old 10) The seed also re-adds mappings (`generate-seed-sql.ts:114-128`). report.md:279 mentions only renames.
17. (old 12) CSRF posture (no token, `sameSite: "lax"`) is still not stated for ticket 2.
18. (old 13) Q11 (:413) still does not ask design to confirm the multi-field steps 1, 2 and 5.
19. (old 14) `Number.parseInt` leniency (`csv-parser.ts:76`) and row logging (`reference-data-upload-summary/index.ts:71`) are still not in S2. The interim guard should compare against the parsed value.

## ✅ Positive Feedback

- The interim guard fix does exactly what the second review asked, uses the same lookup S2 needs, and adds the scenario that proves it (report.md:472). The wording is identical in all five places.
- The ticket merge is faithful. Every old scope item, scenario and spec reference is kept. The "Common to every page" bullet (:483) removes the repetition that caused old Suggestion 11. The reason for shipping as one ticket (:480) is stated, and the sums are right.
- §1.7 is a valuable discovery. It finds a live conflict between this spike's Q1 freeze and the `vibe-653` migration plan before either ships, records it as a risk with "High" likelihood (:430), and adds a task to agree it with the owner (tasks.md:33). Most of its legacy citations are exact to the line.
- The phased Decision 3 is more honest than "keep it forever": it ties removal to S1 and to evidence instead of deciding now.
- §8 (:561-567) records what changed and why, so the change history can be audited even though the file is untracked.

## Changes since previous review

| Prior issue (review-previous-2.md) | Status | Evidence |
|---|---|---|
| High 1: interim CSV guard blocks updates to existing UI courts | **Resolved** | "Unused IDs only" in the box (:26), §4.1 (:238), ticket 1 scope (:459), scenarios (:471-472) and risk row (:423) |
| High 2: [~] follow-on tickets not raised | **Open (human-owned)** | tasks.md:31-35 |
| Suggestion 1: freeze test location | Open | report.md:263, :460 |
| Suggestion 2: guard (b) blast radius | Open | Q1 (:381) unchanged on this point |
| Suggestion 3: run the `setval` variant | Open | report.md:256 |
| Suggestion 4: "same file-based apply" wording | Open | report.md:303 |
| Suggestion 5: interim guard message locale | Partly resolved | Ticket 1 (:459) no longer says "bilingual". S2 (:521) still does |
| Suggestion 6: three imprecise citations | Open | report.md:44, :91, :337 |
| Suggestion 7: XSS sink in S2 | Open | S2 (:521-525) |
| Suggestion 8: CLAUDE.md item 7 task in ticket 1 | Open | Ticket 1 scope (:452-463) |
| Suggestion 9: ID-reuse argument | Open | §4.1 (:218-222) |
| Suggestion 10: seed re-adds mappings | Open | report.md:279 |
| Suggestion 11: restate conventions; ticket 4 Welsh scenario | **Resolved by the merge** | "Common to every page" (:483); Welsh scenario covers every page (:500) |
| Suggestion 12: CSRF posture | Open | Not mentioned |
| Suggestion 13: design confirms multi-field steps | Open | Q11 (:413) |
| Suggestion 14: parser and logging weaknesses in S2 | Open | S2 (:521-525) |

## Test Coverage Assessment

N/A: this is a spike and there are no code changes. `git diff` is empty, and the only artefacts are the untracked docs in `docs/tickets/1078/`, so `yarn test:coverage` was not run.

The test design is in the ticket scenarios. Ticket 1 (report.md:467-474) now covers both sides of the interim guard. Ticket 2 (:493-513) keeps all of plan §5.3 scenarios 4, 5 and 8, with one E2E journey per user journey, validation, Welsh, axe and keyboard checks inline, and AuthZ refusal as its own journey, as `.claude/rules/testing.md` and `e2e-testing.md` require. No scenario was lost in the merge. Two gaps remain:

- the freeze test's home (Suggestion 7);
- nothing would test a way-B legacy load against the seeded 1–27 (High 1).

## Acceptance Criteria Verification

Description ACs (ticket.md:20-22):

- [x] Various options for adding new court locations through the System Admin portal, without needing to use a csv file, are investigated
  - Options A–F are in the matrix (report.md:154-161), each has its own subsection (:167-210), two database experiments back them up (:298-331), and the legacy system is now covered too (:136-146).
- [x] An investigative report with the pros and cons of the various options is provided
  - Pros, cons and effort for every option (report.md:154-161), with detail at :169-210.
- [x] The best solution is highlighted in the investigative report
  - Option C is in the highlighted box (report.md:13-29), with its decisions at :214-289.

Spec §3 "Spike deliverable criteria" (ticket.md:167-214):

- [x] Options are investigated and documented: "a written report exists at `docs/tickets/1078/report.md` covering at minimum Options A–F below, each with pros, cons, effort estimate in dev-days, and the risks it carries against the five hard constraints in section 2"
  - report.md:154-161 has columns for pros, cons, effort and c1–c5. F's effort is "Not estimable", and the reason is given at :208.
- [x] A single option is recommended: "exactly one option is named as the recommendation, with the reasoning stated, and the rejected options each carry a one-line reason for rejection"
  - report.md:13-29 and :214. One-line rejections are at :291-296.
- [x] The `location_id` allocation question is answered: "states which of the three allocation strategies … is chosen, and demonstrates that the chosen strategy cannot collide with `generateLocationsSql()` or the `provenance_location_id = locationId + 100` values emitted by `generateLocationReferencesSql()`"
  - The sequence starting at 100000 is chosen (report.md:216-222). The proof is at :224-234 and was run in scenario 2 (:324-331), with the `GREATEST` safeguard at :246-256.
- [x] The deploy-seed interaction is resolved: "states how a UI-created court is protected from being renamed to `__realign_<id>` by a later addition to `location-data.ts`, and whether `location-data.ts` should be frozen as the source of truth for locations once the UI exists"
  - Freeze plus CI test, with optional guard (b) (report.md:258-266, Q1 :381). The `vibe-653` conflict is raised for agreement (:146, :430). High 1 is about how way B works, not about this protection.
- [x] Validation parity with the CSV route is confirmed: "maps every existing CSV validation rule to either a form-level equivalent, a schema-level constraint, or an explicit decision to drop it"
  - All 21 rules are mapped and reconciled (report.md:335-371).
- [x] The CSV route's future is decided: "states whether the CSV route is retained alongside the new journey, deprecated, or restricted to update-only"
  - Restricted to update-only (S2) and retained until S1, with deprecation decided afterwards on evidence (report.md:281-289, :521-525). The spec quote at :289 needs correcting (Suggestion 3), but the decision is stated.
- [~] Follow-on tickets are raised: "implementation tickets exist for the recommended option, sized to be individually shippable, and this specification's sections 4–13 are attached to them"
  - Drafted and sized, with spec sections cited per ticket (report.md:437-531): ticket 1 at :476, ticket 2 at :515. Not yet raised or attached, which needs a human (tasks.md:31-35). See High 2.

Tally: 9 of 10 met, 1 partly met (follow-on tickets raised, human-owned), 0 unmet.

## Next Steps

- [ ] High 1: add the "legacy IDs 0–27 and names compared with `locationData`" check to Q1, state that way B upserts `location`, replace the load-order advice with a `setval` at the end of the legacy load, and mirror this in the §6.2 row (report.md:381-389, :430).
- [ ] Suggestions 1–6: fix the §1.7 section reference and the "bilingual" claim, mention SJP location 0, correct the spec quote at :289, extend Q4 to bulk amendments, spell out way B's array mapping, and add Q7 and Q12 to ticket 2.
- [ ] Suggestions 7–19 where cheap. Suggestion 14 (the CLAUDE.md item 7 task) matters most, because the freeze test will otherwise fail CI for developers who follow CLAUDE.md.
- [ ] Human: send Q1–Q12 (tasks.md:27-28), and agree Q1 with the `vibe-653` owner (tasks.md:33).
- [ ] Human: raise tickets 1 and 2 and S1–S4 with spec §4–13 attached (tasks.md:31-35).
- [ ] Human: get tech lead and PO sign-off, then close #1078 (tasks.md:36).

## Overall Assessment

**NEEDS CHANGES** (minor). The second review's high-priority issue is resolved cleanly. The ticket merge lost nothing, and Decision 3 is consistent with the rest of the report. The remaining change is to Q1's legacy-court advice. Way B is the right direction, but the table must say that keeping legacy IDs collides with the 27 seeded courts (legacy SJP 0 against seeded 9 is a concrete case), and that the sequence should be bumped by the load script rather than by load order. The partial AC is a human step and not a defect in the report.
