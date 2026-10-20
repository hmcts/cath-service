# Tasks: #894 — `user_archive` table and 'Deleted accounts' MI Report option

## Implementation Tasks

Ordered by dependency. The table (schema/migration) ships independently and comes first.

- [x] Create `libs/postgres-prisma/prisma/schema/user-archive.prisma` with the `UserArchive` model exactly as specified in the ticket (UUID PK, nullable columns, `@@index([archivedDate])`, `@@map("user_archive")`, no `@relation` to `User`).
- [x] Run `yarn db:migrate:dev` to generate the `add_user_archive` migration under `apps/postgres/prisma/migrations/`; review the generated `migration.sql`.
- [x] Run `yarn db:generate` and confirm `prisma.userArchive` and the `UserArchive` type are available from `@hmcts/postgres-prisma`.
- [x] Add `DELETED_ACCOUNTS_HEADERS` (`user_id, provenance_user_id, user_provenance, roles, last_signed_in_date, deleted_date` — no email) and `buildDeletedAccountsSheet(cutoff?)` to `libs/system-admin-pages/src/mi-report/queries.ts`, querying `prisma.userArchive` filtered on `archivedDate` and ordered `desc`, mapping `archivedDate` → `deleted_date`, reusing `formatDate`.
- [x] Register `"deleted-accounts": buildDeletedAccountsSheet` in `SHEET_BUILDERS` and add it to `buildAllDataSheets` in `libs/system-admin-pages/src/mi-report/service.ts` (all-data gains the Deleted Accounts tab).
- [x] Add `"deleted-accounts"` to `MI_REPORT_TYPES` in `libs/system-admin-pages/src/mi-report/validation.ts` (updates the `MiReportType` union automatically).
- [x] Add the `reportTypeOptions` entry to `apps/web/src/pages/(system-admin)/mi-report/en.ts` (text "Deleted accounts", description "Accounts deleted following the annual verification process").
- [x] Add the mirrored `reportTypeOptions` entry to `apps/web/src/pages/(system-admin)/mi-report/cy.ts` with `[TRANSLATE: ...]` placeholders.
- [x] Verify `apps/web/src/pages/(system-admin)/mi-report/index.ts` needs no change beyond the validation allow-list (it builds options generically).
- [x] Add unit tests for `buildDeletedAccountsSheet` (cutoff filter, `all` = no filter, empty result → valid empty sheet, `user_id` mapping, nullable date formatting) in `libs/system-admin-pages/src/mi-report/queries.test.ts`.
- [x] Extend `libs/system-admin-pages/src/mi-report/service.test.ts` to cover `deleted-accounts` producing a sheet and the `all-data` workbook gaining the tab.
- [x] Extend `apps/web/src/pages/(system-admin)/mi-report/index.njk.test.ts` to assert the `deleted-accounts` `<option>` renders, and check `en`/`cy` `reportTypeOptions` key parity.
- [x] Extend `apps/web/src/pages/(system-admin)/mi-report/index.test.ts` to assert `deleted-accounts` is accepted by validation and streams an XLSX.
- [x] Extend the existing MI Report e2e journey (`e2e-tests/tests/`) to select 'Deleted accounts' and download, with inline accessibility and Welsh checks.
- [x] Run `yarn lint:fix`, type-check, and `yarn test`; confirm all pass.
