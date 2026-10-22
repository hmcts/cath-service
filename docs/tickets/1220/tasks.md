# Tasks — #1220 (Spike)

Timebox: 2 days, expires 2026-11-07. If the investigation tasks are not finished by then, stop, write
up what is known, and land the guard test on its own — it has standalone value.

## Implementation Tasks

### Code review (the acceptance criteria)
- [ ] Read the 16 files in `plan.md` §2.1 and confirm or correct findings F1–F10
- [ ] Confirm F6 (`__realign_<id>` orphaning) by tracing `generateRealignSql` against `generateSubJurisdictionsSql`
- [ ] Confirm F9 (no location filter on the list-type send path) and decide with the service owner whether it is in scope here or a separate ticket
- [ ] Write the answer to each of the 7 questions in the spike spec, with file:line evidence

### STG verification
- [ ] Obtain STG database access (blocked on clarification 3)
- [ ] Run the four queries from the spike spec: unsubscribable courts; uncovered sub-jurisdictions; `__realign_*` rows and ids > 30; affected subscribed users
- [ ] Record results in the report table, labelling anything unverified as unverified

### CI guard test (the one committed artefact)
- [ ] Resolve clarification 1 — is sub-jurisdiction 12 missing a list type by mistake or by design
- [ ] Add `libs/location/src/sub-jurisdiction-coverage.test.ts`: real `listTypeData` × real `locationData`, no mocks, AAA comments per `.claude/rules/testing.md`
- [ ] Assert no dangling sub-jurisdiction reference from `listTypeData`
- [ ] Assert every sub-jurisdiction is referenced by ≥1 list type, with an explicit allow-list carrying a stated reason per entry
- [ ] Assert every seeded location resolves to ≥1 list type
- [ ] Comment the test with this ticket number and its intended final home in `@hmcts/list-types-common`
- [ ] Run `yarn test` and `yarn lint:fix` from the repo root

### Single-source feasibility proof
- [ ] Prove the import direction compiles: a throwaway `libs/list-types/common/src/sub-jurisdiction-data.ts` imported by `location-data.ts`, checked with `tsc`, confirming no package cycle
- [ ] Confirm the new subpath export stays free of nunjucks/exceljs transitive imports (required by the focused postgres deploy image)
- [ ] Sketch the `generate-seed-sql.ts` two-table subquery and confirm it preserves atomic `INSERT … ON CONFLICT`

### Report and follow-ups
- [ ] Write the Go/No-Go recommendation, naming the chosen option and what is rejected and why
- [ ] Estimate each option in section 6 of the spike spec in story points
- [ ] Record the Q5 (notification fallback) decision with the service owner
- [ ] Raise follow-up tickets: re-key + single-source taxonomy (Option 2); data-entry validation (Option 3); notification fallback (Option 4, if agreed); F9 over-send defect; F10 cleanups (`deletedAt` filter, N+1, controller duplication)
- [ ] Post the completed report as a comment on #1220 and fill section 6 of the spike spec
