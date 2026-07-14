# Implementation Tasks — Issue #815

## Phase 1: Add validator wrappers + tests for the 13 schema-only packages

- [x] Read each of the 13 schema JSON files to identify required fields before writing fixtures
- [x] Create `src/validation/json-validator.ts` for `administrative-court-daily-cause-list`
- [x] Create `src/validation/json-validator.test.ts` for `administrative-court-daily-cause-list`
- [x] Add validate export to `src/index.ts` for `administrative-court-daily-cause-list`
- [x] Create `src/validation/json-validator.ts` for `ast-daily-hearing-list`
- [x] Create `src/validation/json-validator.test.ts` for `ast-daily-hearing-list`
- [x] Add validate export to `src/index.ts` for `ast-daily-hearing-list`
- [x] Create `src/validation/json-validator.ts` for `care-standards-tribunal-weekly-hearing-list`
- [x] Create `src/validation/json-validator.test.ts` for `care-standards-tribunal-weekly-hearing-list`
- [x] Add validate export to `src/index.ts` for `care-standards-tribunal-weekly-hearing-list`
- [x] Create `src/validation/json-validator.ts` for `cic-weekly-hearing-list`
- [x] Create `src/validation/json-validator.test.ts` for `cic-weekly-hearing-list`
- [x] Add validate export to `src/index.ts` for `cic-weekly-hearing-list`
- [x] Create `src/validation/json-validator.ts` for `court-of-appeal-civil-daily-cause-list`
- [x] Create `src/validation/json-validator.test.ts` for `court-of-appeal-civil-daily-cause-list`
- [x] Add validate export to `src/index.ts` for `court-of-appeal-civil-daily-cause-list`
- [x] Create `src/validation/json-validator.ts` for `ftt-lands-registration-tribunal-weekly-hearing-list`
- [x] Create `src/validation/json-validator.test.ts` for `ftt-lands-registration-tribunal-weekly-hearing-list`
- [x] Add validate export to `src/index.ts` for `ftt-lands-registration-tribunal-weekly-hearing-list`
- [x] Create `src/validation/json-validator.ts` for `ftt-rpt-weekly-hearing-list`
- [x] Create `src/validation/json-validator.test.ts` for `ftt-rpt-weekly-hearing-list`
- [x] Add validate export to `src/index.ts` for `ftt-rpt-weekly-hearing-list`
- [x] Create `src/validation/json-validator.ts` for `ftt-tax-chamber-weekly-hearing-list`
- [x] Create `src/validation/json-validator.test.ts` for `ftt-tax-chamber-weekly-hearing-list`
- [x] Add validate export to `src/index.ts` for `ftt-tax-chamber-weekly-hearing-list`
- [x] Create `src/validation/json-validator.ts` for `london-administrative-court-daily-cause-list`
- [x] Create `src/validation/json-validator.test.ts` for `london-administrative-court-daily-cause-list`
- [x] Add validate export to `src/index.ts` for `london-administrative-court-daily-cause-list`
- [x] Create `src/validation/json-validator.ts` for `rcj-standard-daily-cause-list`
- [x] Create `src/validation/json-validator.test.ts` for `rcj-standard-daily-cause-list`
- [x] Add validate export to `src/index.ts` for `rcj-standard-daily-cause-list`
- [x] Create `src/validation/json-validator.ts` for `send-daily-hearing-list`
- [x] Create `src/validation/json-validator.test.ts` for `send-daily-hearing-list`
- [x] Add validate export to `src/index.ts` for `send-daily-hearing-list`
- [x] Create `src/validation/json-validator.ts` for `siac-poac-paac-weekly-hearing-list`
- [x] Create `src/validation/json-validator.test.ts` for `siac-poac-paac-weekly-hearing-list`
- [x] Add validate export to `src/index.ts` for `siac-poac-paac-weekly-hearing-list`
- [x] Create `src/validation/json-validator.ts` for `sscs-daily-hearing-list`
- [x] Create `src/validation/json-validator.test.ts` for `sscs-daily-hearing-list`
- [x] Add validate export to `src/index.ts` for `sscs-daily-hearing-list`

## Phase 2: Replace mocked tests in the 3 UT packages

- [x] Rewrite `json-validator.test.ts` for `upper-tribunal-lands-chamber-daily-hearing-list` (drop vi.mock, real fixtures)
- [x] Rewrite `json-validator.test.ts` for `upper-tribunal-administrative-appeals-chamber-daily-hearing-list` (drop vi.mock, real fixtures)
- [x] Rewrite `json-validator.test.ts` for `upper-tribunal-tax-and-chancery-chamber-daily-hearing-list` (drop vi.mock, real fixtures)

## Phase 3: Add CI guard test

- [x] Create `libs/list-types/common/src/validation/guard.test.ts` — asserts every package with a schema exports a validate* function

## Phase 4: Verify

- [x] Run `yarn test` from the root and confirm all new/updated tests pass
- [x] Confirm no regressions in existing tests
