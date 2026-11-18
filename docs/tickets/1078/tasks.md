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
- [x] Decision 1: write the ID-allocation comparison (`MAX + 1`, autoincrement from 1, sequence at 100000) with the disjointness proof, including the E2E bands
- [x] Decision 2: write up the deploy-seed protection: freeze `locationData` for new courts, add the regression guard in `generate-seed-sql.test.ts`, and present the reference re-point options
- [x] Decision 3: write up the future of the CSV route: keep it for bulk work and propose an update-only follow-on
- [x] Map all 21 CSV validation rules to a form equivalent, a case the UI makes impossible, or a deliberate drop, and reconcile the total to 21 (plan §3, item 10)

### Report
- [x] Write `docs/tickets/1078/report.md` with the sections in plan §2.1, highlighting Option C as the single recommendation and giving a one-line rejection for each of A, B, D, E and F
- [x] Scenario 3: review the report against the checklist in plan §5.2 and close any gaps (see report §8)
- [x] Raise the blocking questions Q1–Q5 with the tech lead and PO: posted on #1078 (2026-11-17); fold the answers into the report when they arrive
- [x] Raise the build-blocking questions Q6–Q12: posted on #1078 (2026-11-17)

### Follow-on tickets
- [x] Raise build ticket 1: raised as #1531
- [x] Raise build ticket 2, the "Add a court or tribunal" journey: raised as #1532
- [ ] Map every legacy `location_id` to one of the 27 seeded courts or to "new" (staging comparison in `legacy-court-mapping.md`; re-check against a legacy production export), and have it reviewed before the legacy courts are loaded (report Q1, needs a human)
- [ ] Attach spec sections 4–13 by reference to every build ticket (drafted in report.md, needs a human)
- [x] Raise sibling tickets: S1 #1534, S2 #1535, S3 #1537, S4 #1536 (closed after Q9); plus "Align seeded court IDs with legacy CaTH" #1533
- [ ] Get `report.md` signed off by the tech lead and PO, then close #1078 (needs a human)
