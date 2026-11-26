# #1658: Implementation Tasks

## Implementation Tasks

### Setup
- [x] Check out `feature/1355-non-strategic-upload-error-locations` (PR #1651), pull it up to date, and branch from it. Don't use the stale local `fix/1190-…` checkout. Rebase onto master once #1651 merges.

### Config changes: set `required: false` on every field except `date` / `time` / `hearingTime` (see plan.md Section 2 table)
- [x] `libs/list-types/common/src/conversion/rcj-field-configs.ts`: `RCJ_EXCEL_CONFIG` and `RCJ_EXCEL_CONFIG_SIMPLE_TIME` (venue, judge, caseNumber, caseDetails, hearingType). This also covers RCJ standard, Admin Court, London Admin and the CoA Civil daily-hearings tab.
- [x] `court-of-appeal-civil-daily-cause-list/…-config.ts`: `FUTURE_JUDGMENTS_CONFIG` (venue, judge, caseNumber, caseDetails, hearingType). `date` and `time` stay required.
- [x] `interim-applications-daily-cause-list/…-config.ts`: hearings config (judge, venue, type, caseNumber, caseName, additionalInformation) and `OPEN_JUSTICE_CONFIG` (nameToBeDisplayed, email). Update the "seven required fields" comment.
- [x] `ast-daily-hearing-list/…/ast-config.ts`
- [x] `sscs-daily-hearing-list/…/sscs-config.ts`
- [x] `ftt-rpt-weekly-hearing-list/…/ftt-rpt-config.ts`
- [x] `siac-poac-paac-weekly-hearing-list/…/siac-poac-paac-config.ts`
- [x] `utiac-jr-daily-hearing-list/…/utiac-jr-config.ts` (regional and London)
- [x] `care-standards-tribunal-weekly-hearing-list/…/cst-config.ts`
- [x] `pht-weekly-hearing-list/…/pht-config.ts`
- [x] `cic-weekly-hearing-list/…/cic-config.ts` (keep the `venue/platform` fieldName unchanged)
- [x] `ftt-lands-registration-tribunal-weekly-hearing-list/…/ftt-lrt-config.ts`
- [x] `ftt-tax-chamber-weekly-hearing-list/…/ftt-tax-config.ts`
- [x] `grc-weekly-hearing-list/…/grc-config.ts`
- [x] `send-daily-hearing-list/…/send-config.ts` (`timeEstimate` becomes optional; `time` stays required)
- [x] `upper-tribunal-administrative-appeals-chamber-daily-hearing-list/…/utaac-config.ts`
- [x] `upper-tribunal-lands-chamber-daily-hearing-list/…/utlc-config.ts`
- [x] `upper-tribunal-tax-and-chancery-chamber-daily-hearing-list/…/utcc-config.ts`
- [x] `utiac-statutory-appeal-daily-hearing-list/…/utiac-sa-config.ts`
- [x] `wpafcc-weekly-hearing-list/…/wpafcc-config.ts`
- [x] Reword the `readCellValue` comment in `excel-to-json.ts` about error values being "caught by required-field validation", so it no longer suggests that happens for every column. Comment only, no logic change.

### Tests (one per behaviour; see plan.md Section 5)
- [x] Scenario 1: add `should require a value only for date and time fields in every non-strategic converter` to `non-strategic-list-registry.test.ts`. It iterates `listTypeData.filter((l) => l.isNonStrategic)`, asserts each has a converter, and checks every field in `converter.sheets ?? [{ config: converter.config }]`. Add side-effect imports for all 23 non-strategic list-type packages.
- [x] Scenario 2: replace `should reject empty required fields` in the registry test with a CST test where blank, whitespace-only and formula-error (`#REF!`) optional cells convert to `""`.
- [x] Scenario 3: add a registry test (CST) where a blank Date rejects with `/Missing required field 'Date'/`.
- [x] Scenario 4: add an IA config test where an open-justice row with a blank Email converts with `email: ""`, so the email-format validator is not run on blanks.
- [x] Scenario 5: in IA `rendering/renderer.test.ts`, assert the exact "Important information" paragraph for an open-justice entry with a blank email, and for one with a blank name.
- [x] Remove the per-config required-flag tests that the shared test now covers: admin court, RCJ standard, London Admin, CoA Civil (both tabs), SSCS, UTAAC, UTLC, UTCC, UTIAC JR (regional and London), BPD (`should require only the time field`). In IA, rename "map the two open-justice fields as required" and keep only the field-name assertion.
- [x] Confirm the existing missing-column, HTML-rejection, invalid date/time and malformed-email tests still pass without changes.

### Verification
- [x] `yarn test` from the repo root (covers `@hmcts/list-types-common` and every touched list-type package). All list-type packages pass. The only failures are 30 tests in `@hmcts/web` (`app.test.ts`, `session-timeout.test.ts`), and those fail the same way on the base branch with these changes stashed.
- [x] `yarn lint`
- [ ] (Not done: Postgres/Redis not reachable from the dev shell) Manual check: upload the ticket's AST example (blank Additional information) through non-strategic upload locally. It should publish and `additionalInformation` should be stored as `""`. With Hearing time blank, it should still be rejected.
