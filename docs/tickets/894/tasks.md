# Tasks: #894 — 'Deleted accounts' to be added to the MI Report

**Blocking relationship:** Phase 2 cannot start until [#628](https://github.com/hmcts/cath-service/issues/628)
(MI Report Download) is merged — there is no `/mi-report` page, report-type selector or MI report
generation code in the repo today. **Phase 1 is not blocked and should ship immediately**: deletions
are hard deletes, so every account deleted before the `deleted_account` table exists is permanently
unreportable with no possible backfill.

Answer CLARIFICATIONS NEEDED §1, §2, §5, §6, §10 and §11 in `plan.md` before starting Phase 2 — they
change the report's contents. Only §12 affects Phase 1.

**#628 is not the only dependency.** The job that actually deletes non-re-verified accounts is
[#351](https://github.com/hmcts/cath-service/issues/351) (Automated Inactive Accounts cron), which
the issue body does not name. Phase 1 defines the contract #351 must call; until #351 ships, the
`Deleted accounts (annual verification)` figure legitimately reads `0`. See plan §5 and §11.

## Phase 1 — Persistence (unblocked)

- [ ] Create a branch off `master`.
- [ ] Confirm CLARIFICATIONS §12 (CaTH ID only, no email/name/provenance ID) with the PM — it determines the table's columns.
- [ ] Raise the `deleteUserById(userId, AccountDeletionReason.ANNUAL_VERIFICATION)` contract on [#351](https://github.com/hmcts/cath-service/issues/351) so the verification cron writes the record when it lands.
- [ ] Add `libs/postgres-prisma/prisma/schema/deleted-account.prisma` with the `AccountDeletionReason` enum and the `DeletedAccount` model (`@@map("deleted_account")`, `userId @unique`, `@@index([deletedDate])`, `@@index([deletionReason])`).
- [ ] Run `yarn db:generate` from the repo root.
- [ ] Run `yarn db:migrate:dev` to generate `apps/postgres/prisma/migrations/{ts}_add_deleted_account/migration.sql`. Do not hand-write the SQL.
- [ ] Review the generated migration — it will contain the schema's first `CREATE TYPE` (no Prisma enum exists in this repo yet).
- [ ] Change `deleteUserById` in `libs/system-admin-pages/src/user-management/queries.ts` to `deleteUserById(userId: string, reason: AccountDeletionReason)`. No default value.
- [ ] Inside the existing `prisma.$transaction`, before the deletes: `tx.user.findUniqueOrThrow` with an explicit `select` of `userProvenance`, `role`, `createdDate`, `lastSignedInDate` only, then `tx.deletedAccount.create`.
- [ ] Re-export `AccountDeletionReason` from `libs/system-admin-pages/src/index.ts` so `apps/web` does not need a `@hmcts/postgres-prisma` dependency.
- [ ] Update `apps/web/src/pages/(system-admin)/delete-user-confirm/[userId]/index.ts:105` to pass `AccountDeletionReason.SYSTEM_ADMIN`.
- [ ] Extend `libs/system-admin-pages/src/user-management/queries.test.ts` — add `deletedAccount.create` and `user.findUniqueOrThrow` to the two existing `mockTx` objects and assert the record is written with the passed reason.
- [ ] Add test: the inserted record contains no `email`, `firstName`, `surname` or `userProvenanceId`.
- [ ] Add test: a user with a null `lastSignedInDate` produces a record with `null`, not a failure.
- [ ] Add test: when `user.delete` rejects, the transaction rejects and no record is committed.
- [ ] Add test: deleting a nonexistent user rejects via `findUniqueOrThrow` and writes nothing.
- [ ] Update the `expect(deleteUserById).toHaveBeenCalledWith("user123")` assertion at `apps/web/src/pages/(system-admin)/delete-user-confirm/[userId]/index.test.ts:146` to include the reason.
- [ ] Run `yarn test` and `yarn lint:fix` from the repo root.
- [ ] Manually verify: delete a user through `/delete-user-confirm/{userId}`, then confirm one `deleted_account` row exists with reason `SYSTEM_ADMIN` and no PII (`yarn db:studio`).

## Phase 2 — Report generation and UI (blocked on #628)

- [ ] Confirm #628 is merged and read the shape it actually shipped — page path, `reportType` values, radio macro call, `all-data` workbook assembly, filename helper. The plan assumes #628's spec, not its implementation.
- [ ] Confirm CLARIFICATIONS §1 (aggregates vs per-account rows), §2 (derived vs measured prior count), §3 (workbook layout vs the .docx mock-up), §5 (include manual deletions), §6 (all users vs `VERIFIED` only), §8 (fifth `All Data` tab), §9 (English-only headers).
- [ ] Add `"@hmcts/excel-generation": "workspace:*"` to `libs/system-admin-pages/package.json` and install.
- [ ] Create `libs/system-admin-pages/src/mi-report/deleted-accounts-queries.ts` with `findDeletedAccountsSince`, `countDeletedAccountsSince` (group-by normalised to `0` defaults for both reasons) and `countActiveAccounts`. Explicit `select`, filtering and ordering in the database. Types colocated.
- [ ] Create `deleted-accounts-queries.test.ts` — `where`/`orderBy` clauses, out-of-period exclusion, `gte` boundary, empty result, zero-default for a reason with no records.
- [ ] Create `libs/system-admin-pages/src/mi-report/deleted-accounts-service.ts` exporting `buildDeletedAccountsReport(days)` and `generateDeletedAccountsReport(days): Promise<Buffer>`. Three queries via `Promise.all`.
- [ ] Create `deleted-accounts-service.test.ts` — summary arithmetic, reason split, period start/end, concurrent queries, zero-deletion period returns a report rather than throwing.
- [ ] Add `DELETED_ACCOUNTS_HEADERS` and `DELETED_ACCOUNTS_SUMMARY_LABELS` to `libs/excel-generation/src/excel/excel-headers.ts`.
- [ ] Create `libs/excel-generation/src/excel/deleted-accounts-excel-generator.ts` with `addDeletedAccountsSheets` and `generateDeletedAccountsExcel`. Reuse the style constants from `excel-styles.ts`; follow the loop in `sjp-public-list-excel-generator.ts`. Local `dd/MM/yyyy` formatter (the audit-log one is module-private and includes a time).
- [ ] Freeze the header row on each sheet.
- [ ] Create `deleted-accounts-excel-generator.test.ts` — two sheets named `Summary` and `Deleted Accounts`; one data row per account plus a header; header styling; `dd/MM/yyyy` dates; empty cell for a null `lastSignedInDate`; reason display values; all summary measures; zero accounts produces a header-only sheet and a valid buffer; `addDeletedAccountsSheets` leaves pre-existing sheets untouched.
- [ ] Export the generator functions from `libs/excel-generation/src/index.ts` and the service/queries from `libs/system-admin-pages/src/index.ts`.
- [ ] Add `deleted-accounts` to the `reportType` allow-list in `apps/web/src/pages/(system-admin)/mi-report/index.ts` and route it to the service. Build the whole buffer before setting any response header.
- [ ] Add the deleted-accounts sheets to the `all-data` workbook via `addDeletedAccountsSheets` (subject to §8).
- [ ] Add the label and hint to `mi-report/en.ts`; add `[WELSH TRANSLATION REQUIRED: '...']` placeholders to `mi-report/cy.ts`.
- [ ] Extend `mi-report/index.test.ts` — `POST` with `deleted-accounts` sets the xlsx `Content-Type`, the expected `Content-Disposition` filename and sends a buffer; an unrecognised `reportType` is a validation error, not a default and not a 500; a missing report type re-renders with `Select a report type` and preserves the period; `all-data` includes the new sheets; a thrown service error renders `errors/500` with no partial file; both `GET` and `POST` are guarded by `requireRole([USER_ROLES.SYSTEM_ADMIN])`.
- [ ] Extend `mi-report/index.njk.test.ts` — six radio items with `Deleted accounts` present, hint associated with its input, Welsh label when rendered with `cy`, `en`/`cy` key parity, error state present and absent.
- [ ] Extend `e2e-tests/tests/system-admin/mi-report.spec.ts` as **one** `@nightly` journey: dashboard tile → submit with no report type and assert the error summary and preserved period → axe scan in the error state → switch to Welsh and assert the label, axe scan → back to English, keyboard-navigate the radio group, select `30 days` + `Deleted accounts`, submit with `Enter` → assert the download filename matches `mi-report-deleted-accounts-30days-\d{4}-\d{2}-\d{2}\.xlsx` → assert a `VERIFIED` user requesting `/mi-report` is **redirected to `/sign-in`** (`requireRole` redirects; it does not return 403).
- [ ] Run `yarn test`, `yarn lint:fix` and `yarn test:e2e:all` from the repo root.
