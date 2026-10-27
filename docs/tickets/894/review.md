# Code Review: Issue #894

## Summary

This change delivers two independent workstreams for issue #894:

- **Workstream A** — the `user_archive` table: a new Prisma model
  (`libs/postgres-prisma/prisma/schema/user-archive.prisma`) and a generated migration
  (`apps/postgres/prisma/migrations/20260925110634_add_user_archive/migration.sql`).
- **Workstream B** — the 'Deleted accounts' MI Report option: a new
  `buildDeletedAccountsSheet` query, registration in `SHEET_BUILDERS` and
  `buildAllDataSheets`, the `deleted-accounts` validation allow-list entry, and the
  drop-down option in `en.ts` / `cy.ts`.

The implementation follows the plan precisely. It reuses the existing #628 MI Report
machinery rather than inventing new code paths, keeps `deleteUserById` untouched (per
the stated scope), and correctly implements the resolved decisions from `plan.md` §0/§5
(anonymised column set with no `email`, `deleted_date` header for `archived_date`,
cutoff-vs-no-filter period behaviour, and the all-data 5th tab). Type safety is clean —
no `any`, and the `MiReportType` union is extended at its single source of truth so the
`SHEET_BUILDERS` record is compile-time-exhaustive. Test coverage on the changed
mi-report files is strong.

The only substantive follow-up is the intentional Welsh `[TRANSLATE: ...]`
placeholder, which must be replaced before go-live but is not a blocker for this story.

Counts: 0 Critical, 0 High Priority, 3 Suggestions.

## 🚨 CRITICAL Issues

None.

## ⚠️ HIGH PRIORITY Issues

None.

All changed workspaces that contain hand-written source under review meet the 80%
statement threshold (see Test Coverage Assessment). All 8 acceptance criteria are met.

## 💡 SUGGESTIONS

1. **Welsh translation placeholders** —
   `apps/web/src/pages/(system-admin)/mi-report/cy.ts:26-30` ship
   `text: "[TRANSLATE: Deleted accounts]"` and a `[TRANSLATE: ...]` description. This
   is a deliberate, documented follow-up (`plan.md` §F), and every other CaTH option in
   the same file is properly translated, so the placeholder is visually obvious in a
   Welsh session. Track a follow-up to supply the real translation before go-live. Not
   a blocker for this story.

2. **`deleted_date` header naming may confuse operators** —
   `libs/system-admin-pages/src/mi-report/queries.ts:29` maps `archived_date` to a
   `deleted_date` column header. This is the correct, deliberate choice for parity with
   the legacy `DeletedAccountMiData` MI report, but the divergence between the DB column
   (`archived_date`) and the report header (`deleted_date`) is worth a one-line code
   comment so a future maintainer does not "fix" the apparent mismatch. Minor.

3. **`roles` column semantics are latent** — `buildDeletedAccountsSheet` maps
   `account.roles` verbatim (`queries.ts` mapping). The plan resolved this as a single
   role value in a `VARCHAR(255)` column for incumbent parity, but nothing is written to
   the table yet (#351). No action needed now; just be aware the report output shape is
   only exercised against synthetic test rows until #351 lands.

## ✅ Positive Feedback

- **Query is safe and efficient.**
  `libs/system-admin-pages/src/mi-report/queries.ts:152-168` uses a parameterised
  Prisma `findMany` with a single `where: { archivedDate: { gte: cutoff } }` predicate
  and `orderBy: { archivedDate: "desc" }`. The `@@index([archivedDate])` in the schema
  (`user-archive.prisma:10`) directly backs both the range filter and the ordering. No
  raw SQL, no N+1 — it is a single query with no per-row follow-ups, unlike the
  court-name-resolved subscription sheets.

- **Empty-table case is genuinely an empty sheet, not an error.** With `findMany`
  returning `[]`, `rows` is `[]`, and `generateMiReportExcel`
  (`libs/excel-generation/src/excel/mi-report-excel-generator.ts:6-38`) still writes the
  header row and simply skips the `for (const row ...)` loop. No branch throws on empty.
  This is asserted directly at `queries.test.ts` ("should return a valid header-only
  sheet with zero rows when the table is empty").

- **No fall-through / default-crash risk.** `validateMiReportSelection`
  (`validation.ts:12-27`) rejects any `reportType` not in `MI_REPORT_TYPES` before
  `buildMiReport` is reached, and `buildMiReport` (`service.ts:22-31`) branches
  `all-data` explicitly and otherwise indexes `SHEET_BUILDERS[reportType]`, whose
  `Record<Exclude<MiReportType, "all-data">, ...>` type is exhaustive by construction.
  An unrecognised value cannot reach `SHEET_BUILDERS[reportType]` as `undefined`.

- **Migration SQL matches the Prisma schema exactly** — `migration.sql:2-15` creates
  `user_id UUID NOT NULL` PK, all other columns nullable, `archived_date TIMESTAMP(3)
  NOT NULL DEFAULT CURRENT_TIMESTAMP`, and the `user_archive_archived_date_idx` index.
  Column types, nullability, PK and index all line up with `user-archive.prisma`. No FK
  to `user` (correct — the archive row must outlive the user).

- **Model is exported and in the generated client** —
  `libs/postgres-prisma/src/index.ts:28` re-exports everything from the generated
  client, and `generated/prisma/index.d.ts` contains `Model UserArchive` and
  `prisma.userArchive`. AC2 verified against the actual generated artefact.

- **Access control inherited, not bypassed.** The new option flows through the existing
  controller (`apps/web/src/pages/(system-admin)/mi-report/index.ts:65-66`), whose `GET`
  and `POST` are both `[requireRole([USER_ROLES.SYSTEM_ADMIN]), handler]`. No new route
  or handler was added, so the SYSTEM_ADMIN guard applies unchanged.

- **Tests assert the resolved decisions, not just happy paths.** `queries.test.ts`
  proves: no-email (`expect(sheet.headers).not.toContain("email")` plus an
  `email: "should-not-appear@example.com"` row whose email is absent from the mapped
  output), `deleted_date` mapping from `archivedDate`, cutoff filter shape,
  `where: undefined` for no-filter, empty-table header-only sheet, and null-coalescing.
  `service.test.ts` proves the single-sheet `deleted-accounts` report and the five-sheet
  all-data workbook order. `index.njk.test.ts` asserts the option renders in English and
  Welsh and checks en/cy `reportTypeOptions` key parity. Tests are AAA-structured and do
  not over-mock the unit under test.

## Test Coverage Assessment

Coverage was measured per changed workspace (`yarn test --coverage`).

| Workspace | Statement Coverage | Notes |
|---|---|---|
| `libs/system-admin-pages` | **93.33%** (1233/1321) overall; **100%** for the `src/mi-report` directory (queries.ts 100%, validation.ts 100%, service.ts covered) | Above threshold. The changed mi-report files are fully covered. |
| `apps/web` | **100%** for the mi-report page controller (25/25 statements, scoped run) | Full-suite run hit one unrelated timeout in `remove-list-search-results/index.test.ts` (not touched by this change), which suppressed the aggregate summary; the scoped mi-report run is clean at 100%. |
| `libs/postgres-prisma` | 16.88% aggregate (dominated by generated Prisma runtime) | Schema-only change; no hand-written executable source added. Aggregate % is not meaningful here — the change is the `.prisma` model + generated client, verified present in `generated/prisma/index.d.ts`. Not flagged. |

No changed workspace with hand-written source-under-review falls below 80%.

## Acceptance Criteria Verification

- [x] A `user_archive` table exists with the columns above, created via a Prisma migration in `libs/postgres-prisma/prisma/schema/`.
  — `libs/postgres-prisma/prisma/schema/user-archive.prisma:1-12` and generated migration `apps/postgres/prisma/migrations/20260925110634_add_user_archive/migration.sql:2-15`.
- [x] The `UserArchive` Prisma model is available from `@hmcts/postgres-prisma` and covered by the generated client.
  — Re-exported via `libs/postgres-prisma/src/index.ts:28`; present in `libs/postgres-prisma/generated/prisma/index.d.ts:147,150,534`.
- [x] In the 'Download MI Report' tab, another option titled 'Deleted accounts' is included in the 'Select report type' drop down options.
  — `apps/web/src/pages/(system-admin)/mi-report/en.ts:26`; rendering asserted in `apps/web/src/pages/(system-admin)/mi-report/index.njk.test.ts:39-45`.
- [x] Backend changes are implemented to support the generation of the 'Deleted accounts' report.
  — `libs/system-admin-pages/src/mi-report/queries.ts:152-168` (`buildDeletedAccountsSheet`) and `service.ts:19` (`SHEET_BUILDERS` registration); asserted in `service.test.ts` ("should build a single-sheet report for deleted-accounts").
- [x] The 'Deleted accounts' report should contain the total number of all deleted CaTH accounts and their CaTH IDs for the selected report duration.
  — `user_id` (the CaTH ID) is the first header and mapped per row in `queries.ts:29,159`; one row per archived account = the total. Asserted in `queries.test.ts` ("should map archive rows to the anonymised headers with user_id and deleted_date").
- [x] The report reads from `user_archive`, filtered on `archived_date` against the selected duration.
  — `prisma.userArchive.findMany({ where: cutoff ? { archivedDate: { gte: cutoff } } : undefined ... })` at `queries.ts:153-156`; asserted both ways in `queries.test.ts` (cutoff-applied and `where: undefined`).
- [x] The report returns an empty result (not an error) when no accounts were deleted in the selected duration — expected while #351 is outstanding and the table is still empty.
  — Empty `rows` produces a valid header-only sheet (`mi-report-excel-generator.ts:26` skips the empty loop); asserted in `queries.test.ts` ("should return a valid header-only sheet with zero rows when the table is empty").
- [x] The implementation of this requirement is dependent on #628.
  — #628 has already landed on this branch; the existing MI Report controller, service, validation, and Excel generator are present and extended rather than recreated (`apps/web/src/pages/(system-admin)/mi-report/index.ts`, `libs/system-admin-pages/src/mi-report/service.ts`).

## Next Steps

- [ ] Replace the Welsh `[TRANSLATE: ...]` placeholders in `cy.ts:26-30` with real
      translations before go-live (follow-up, non-blocking for this story).
- [ ] (Optional) Add a one-line comment at `queries.ts:29` explaining the deliberate
      `archived_date` → `deleted_date` header mapping for legacy parity.
- [ ] Note the pre-existing, unrelated flaky/timeout in
      `apps/web/src/pages/(admin)/remove-list-search-results/index.test.ts` — not caused
      by this change, but it does break the full `apps/web` coverage aggregate.
- [ ] Track #351 as the dependency that populates `user_archive`; until then the report
      legitimately returns zero rows (expected).

## Overall Assessment

**APPROVED.**

All 8 acceptance criteria are fully met with file/test citations, the mi-report changed
files are at 100% statement coverage, and no changed workspace with hand-written
source-under-review is below 80%. The implementation is faithful to the plan, type-safe,
secure (SYSTEM_ADMIN-guarded, parameterised, indexed query), and correctly treats an
empty table as a valid empty sheet. The only outstanding item is the intentional Welsh
translation placeholder, which is a documented follow-up rather than a defect.
