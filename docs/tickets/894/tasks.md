# Tasks — Issue #894: 'Deleted accounts' MI Report

## Part A — Persistence and report generation (NOT blocked, do this now)

- [ ] Create `libs/postgres-prisma/prisma/schema/account-verification.prisma` with the `AccountVerificationRun` model (`@@map("account_verification_run")`, `runDate` as `@db.Date`, non-unique, indexed)
- [ ] Run `yarn db:migrate:dev` to generate the migration, then `yarn db:generate`
- [ ] Create `libs/system-admin-pages/src/mi-report/deleted-accounts-repository.ts` with `findVerificationRunsInRange(from, to)` (inclusive `gte`/`lte`, `orderBy runDate asc`) and `recordVerificationRun(input)`; colocate the interfaces at the bottom of the file
- [ ] Write `deleted-accounts-repository.test.ts` — boundary inclusion, empty range, ordering, write path (mock `@hmcts/postgres-prisma`)
- [ ] Create `libs/system-admin-pages/src/mi-report/deleted-accounts-report.ts` with `buildDeletedAccountsReport(from, to)` returning structured rows (not a serialised string), computing `difference` and appending a totals row
- [ ] Write `deleted-accounts-report.test.ts` — column order, per-run rows, difference arithmetic, `dd/mm/yyyy` formatting, totals row, empty range, zero-deleted run, error propagation
- [ ] Create `libs/system-admin-pages/src/mi-report/report-types.ts` with `MI_REPORT_TYPES.DELETED_ACCOUNTS = "deleted-accounts"`
- [ ] Add `DOWNLOAD_MI_REPORT = "Download MI report"` to the `AuditLogAction` enum in `libs/system-admin-pages/src/audit-log/logger.ts` (alphabetical order; skip if #628 already added it)
- [ ] Export the new modules from `libs/system-admin-pages/src/index.ts`
- [ ] Run `yarn lint:fix`, `yarn test`, and `yarn db:migrate` against a clean database

## Clarifications — resolve before Part B

- [ ] Q1: Confirm radios (per #628) vs dropdown (per this AC)
- [ ] Q2: Decide the period model — #628's 7/14/21/30-day windows are empty ~335 days a year for an annual event
- [ ] Q3: Agree on #351 that the verification job calls `recordVerificationRun()` inside the deletion transaction, and update #894's dependency list to include #351
- [ ] Q4: Obtain the mock-up contents (column order, headers, date format, totals row treatment)
- [ ] Q5: Confirm on #351 whether the "active accounts" count is all accounts or verified media accounts only
- [ ] Q8: Confirm whether a per-`userProvenance` breakdown is needed (cheap now, expensive after the migration ships)

## Part B — UI wiring (BLOCKED on #628 creating `/mi-report`)

- [ ] Add the `deletedAccounts` report-type entry to `apps/web/src/pages/(system-admin)/mi-report/en.ts` and `cy.ts` (Welsh placeholder `[WELSH TRANSLATION REQUIRED: 'Deleted accounts']`)
- [ ] Add the registry dispatch from `MI_REPORT_TYPES.DELETED_ACCOUNTS` to `buildDeletedAccountsReport`, including filename/sheet name
- [ ] Set `req.auditMetadata` with `AuditLogAction.DOWNLOAD_MI_REPORT` **before** sending the response
- [ ] Add validation of the submitted report type against `MI_REPORT_TYPES` before dispatch
- [ ] Template test: the "Deleted accounts" option renders in `en` and `cy`; assert `en`/`cy` key parity
- [ ] Controller test: dispatch, audit metadata ordering, and `errors/500` on generation failure
- [ ] Extend #628's existing E2E journey test with the 'Deleted accounts' download — do NOT add a new spec file
- [ ] Do NOT create a second `/mi-report` page or dashboard tile — both belong to #628
