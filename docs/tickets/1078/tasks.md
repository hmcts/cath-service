# Tasks: #1078 Spike, Court Maintenance

This is a spike, so no production code is written. Experiments run against a local database only and
are not committed.

## Implementation Tasks

### Investigation
- [x] Trace the CSV route end to end (download → upload → summary → `upsertLocations()`) and record that there is no "add a court" page, alongside the existing non-CSV journeys for regions, jurisdictions, mappings, metadata and court deletion
- [x] Record the five constraints with file references (plan §1.3): no default on `locationId`; unique and NOT NULL names; realign parking; seed takeover of `(SNL, id+100)` references; `upsertLocations()` rewriting every row in the file
- [x] Record the existing `MAX + 1` allocation precedent (`createJurisdictionRecord()`, `createRegion()`) and the E2E ID bands (9001, 80000–89999, 90000–99999)
- [x] Assess Options A–F with pros, cons, effort and constraint risk (plan §2.2)

### Evidence experiments (plan §5.1)
- [x] Scenario 1: reproduce on a local database a UI-style court at ID 100000 being parked as `__realign_100000`, and its `SNL/128` reference being moved to location 28, by a throwaway `locationData` entry; then discard the change (run 2026-11-13 on a throwaway database inside the local docker `cath-postgres`, then dropped)
- [x] Scenario 2: on a scratch database, prove that a sequence starting at 100000 is disjoint from the seeded IDs, the `+100` references and the test-support allocation across two seed runs; then discard (run 2026-11-13 on a second throwaway database, then dropped)

### Decisions
- [x] Decision 1: write the ID-allocation comparison (`MAX + 1`, autoincrement from 1, sequence at 100000, then after Q3 a sequence starting one above the highest legacy production ID) with the disjointness proof, including the E2E bands
- [x] Decision 2: write up the deploy-seed protection: freeze `locationData` for new courts, add the regression guard in `generate-seed-sql.test.ts`, and present the reference re-point options
- [x] Decision 3: write up the future of the CSV route: keep it for bulk work and propose an update-only follow-on
- [x] Map all 21 CSV validation rules to a form equivalent, a case the UI makes impossible, or a deliberate drop, and reconcile the total to 21 (plan §3, item 10)

### Report
- [x] Write `docs/tickets/1078/report.md` with the sections in plan §2.1, highlighting Option C as the single recommendation and giving a one-line rejection for each of A, B, D, E and F
- [x] Scenario 3: review the report against the checklist in plan §5.2 and close any gaps (see report §8)
- [x] Raise the blocking questions Q1–Q5 with the tech lead and PO: posted on #1078 (2026-11-17); fold the answers into the report when they arrive
- [x] Raise the build-blocking questions Q6–Q12: posted on #1078 (2026-11-17)

### Follow-on tickets
- [x] Describe build ticket 1 (sequence, service and seed guards) in report §7.1
- [x] Describe build ticket 2 (the "Add a court or tribunal" journey, with "add another"; no draft state, after the Q5 answer was changed) in report §7.1
- [x] Describe sibling tickets S1 (amend a court), S2 (update-only CSV), S3 (upstream sync spike) and S4 (align seeded court IDs with legacy CaTH) in report §7.2. Tickets are described only, not raised from the spike, except S3, which stays open as #1537
- [x] Fold the answers to Q1–Q12 into the report (§4.1, §4.2, §5, §6, §7), including Q3's start of highest legacy production ID + 1
- [x] Rework the report after the developer's decision of 2026-11-25: keep the CSV for bulk add and update with admin-chosen IDs; single-page add and update forms (Option B) with an admin-entered ID; drop the sequence; tickets 1–4 in §7.1; Q13 and Q14 added
- [x] Record answers to Q13 (no rule for E2E fixture IDs 9001–9010; real IDs will not reach them) and Q14 (seeded courts stay editable on the update form)
- [ ] Get `report.md` signed off by the tech lead and PO, then close #1078 (needs a human). Raising the §7 tickets, with spec §4–13 attached and the legacy production export for S4, is build planning after sign-off, not part of the spike
