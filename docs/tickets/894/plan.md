# Plan: #894 — `user_archive` table and the 'Deleted accounts' MI Report option

## 0. Decisions (resolved — legacy-confirmed)

The clarifications in §5 were resolved by investigating the incumbent
`pip-account-management` / `pip-frontend` / `pip-data-models` (which own
`pi_user_archived` and its MI report) and by two product decisions:

- **Column naming**: follow the reference (`provenance_user_id`, `roles`,
  `user_provenance`), matching legacy `pi_user_archived`. Not aligned to CaTH's `user`.
- **`roles`**: a single role value per row (legacy stores one `@Enumerated` enum name,
  not a CSV). `VARCHAR(255)` kept for parity.
- **Report columns — match legacy anonymised set**: `user_id`, `provenance_user_id`,
  `user_provenance`, `roles`, `last_signed_in_date`, `deleted_date`. **No `email`** in
  the download — the legacy MI query deliberately omits it ("anonymized deleted account
  data for MI reporting"). `deleted_date` is the report header for the `archived_date`
  value, matching legacy `DeletedAccountMiData`.
- **Period filter — follow the #894 AC**: filter `archivedDate >= cutoff` via #628's
  existing `resolveCutoff`; `all` ("From the beginning") returns everything. Diverges
  from legacy (which dumped the whole table) because the AC explicitly requires the filter.
- **`all-data`**: gains a "Deleted Accounts" tab (legacy `ALL_DATA` includes it).
- **CaTH ID** = `user_id` (UUID).
- **`email` in the table**: retained per the reference schema (nullable) but never in
  the report. Retention/purge of archive rows is a follow-up (legacy has a config-driven
  `deleteArchivedAccounts` purge job), out of scope here.

## 1. Technical Approach

This story has **two independent workstreams**. They share no code paths and can be
merged separately.

**Workstream A — the `user_archive` table (shippable now, blocked by nothing).**
Add a new Prisma model `UserArchive` in its own domain schema file, generate a
migration, and regenerate the client. The table follows the incumbent
`pi_user_archived` column set exactly (per the issue body, which supersedes the
earlier `deleted_account` spec). `user_id` is the PK and is deliberately **not** a
foreign key to `user` — the archive row must outlive the deleted user. This
workstream touches only `@hmcts/postgres-prisma` and the migrations directory.

**Workstream B — the 'Deleted accounts' MI Report option (depends on A and on #628).**
#628 has already landed on this branch, so the MI Report page, controller, service,
validation, Excel generator and templates all exist. Adding this report type is a
small, uniform extension of the existing pattern:

- a new `buildDeletedAccountsSheet(cutoff?)` query that reads `prisma.userArchive`
  filtered on `archivedDate`,
- registering `deleted-accounts` in the service's `SHEET_BUILDERS`,
- adding `deleted-accounts` to the validation allow-list and the `MiReportType` union,
- adding the option to the existing `govukSelect` via `reportTypeOptions` in
  `en.ts` / `cy.ts`.

No new page, no new Excel generator function — the sheet is just another
`MiReportSheet` fed into the existing `generateMiReportExcel(sheets)`.

**Population is out of scope.** Writing rows into `user_archive` is delivered by
#351 (the automated inactive-account cron). Therefore `deleteUserById` is **not
modified**, there is no `AccountDeletionReason` enum, and there is no write path in
this story. Until #351 lands the table stays empty, so the report will legitimately
return **zero rows** — this is a valid (empty) sheet, not an error, and is an
explicit acceptance criterion.

## 2. Implementation Details

### TEMPLATE SOURCE decision

**n/a.** There is no new rendered page. The 'Deleted accounts' option is a new
`<option>` inside the existing `govukSelect` for `reportType` (already driven by
`reportTypeOptions`), and the report output is a backend-only Excel sheet. No
template is created or adapted; no migrate-pip-pages fetch/adapt/verify steps apply.

### A. New schema file — `libs/postgres-prisma/prisma/schema/user-archive.prisma`

Exact model from the ticket:

```prisma
model UserArchive {
  userId            String    @id @map("user_id") @db.Uuid
  userProvenance    String?   @map("user_provenance") @db.VarChar(255)
  provenanceUserId  String?   @map("provenance_user_id") @db.VarChar(255)
  email             String?   @db.VarChar(255)
  roles             String?   @db.VarChar(255)
  lastSignedInDate  DateTime? @map("last_signed_in_date")
  archivedDate      DateTime  @default(now()) @map("archived_date")

  @@index([archivedDate])
  @@map("user_archive")
}
```

- One file per domain, per CLAUDE.md. Do not add this to `base.prisma`.
- No `@relation` to `User`; `user_id` is a plain UUID PK, not a FK.
- `@@index([archivedDate])` because the report predicate filters on `archived_date`.
- All columns except the PK nullable, matching the reference, so a batch archive
  write can never fail on incomplete source data.
- No change to the `User` model in `base.prisma`.

### B. Migration + client generation

- Run `yarn db:migrate:dev` to generate a migration folder under
  `apps/postgres/prisma/migrations/` (naming convention `YYYYMMDDHHMMSS_add_user_archive`),
  containing `migration.sql` that creates `user_archive` plus the `archived_date`
  index.
- Run `yarn db:generate` so `@hmcts/postgres-prisma` exposes `prisma.userArchive`
  and the `UserArchive` model type.
- Do not hand-write the `migration.sql`; let Prisma generate it and review it.

### C. Query + headers — `libs/system-admin-pages/src/mi-report/queries.ts`

Add a `DELETED_ACCOUNTS_HEADERS` constant and a `buildDeletedAccountsSheet(cutoff?)`
following the existing `buildUserAccountsSheet` pattern exactly:

```typescript
const DELETED_ACCOUNTS_HEADERS = [
  "user_id",            // the CaTH ID — required by AC
  "provenance_user_id",
  "user_provenance",
  "roles",
  "last_signed_in_date",
  "deleted_date"        // header for the archived_date value (legacy DeletedAccountMiData)
];

export async function buildDeletedAccountsSheet(cutoff?: Date): Promise<MiReportSheet> {
  const accounts = await prisma.userArchive.findMany({
    where: cutoff ? { archivedDate: { gte: cutoff } } : undefined,
    orderBy: { archivedDate: "desc" }
  });

  const rows = accounts.map((account) => ({
    user_id: account.userId,
    provenance_user_id: account.provenanceUserId ?? "",
    user_provenance: account.userProvenance ?? "",
    roles: account.roles ?? "",
    last_signed_in_date: formatDate(account.lastSignedInDate),
    deleted_date: formatDate(account.archivedDate)
  }));

  return { name: "Deleted Accounts", headers: DELETED_ACCOUNTS_HEADERS, rows };
}
```

- Reuse the existing `formatDate` helper for the nullable `last_signed_in_date` and
  `archived_date`.
- **Column set (decided): match the legacy anonymised MI report** —
  `user_id, provenance_user_id, user_provenance, roles, last_signed_in_date, deleted_date`.
  **No `email`** (legacy deliberately omits it). `user_id` is the CaTH ID required by the AC.
- The "total number" AC is satisfied by the row count of the sheet (each archived
  account = one row). No separate summary cell.

### D. Service registration — `libs/system-admin-pages/src/mi-report/service.ts`

- Import `buildDeletedAccountsSheet` and add to `SHEET_BUILDERS`:

```typescript
const SHEET_BUILDERS: Record<Exclude<MiReportType, "all-data">, (cutoff?: Date) => Promise<MiReportSheet>> = {
  "user-accounts": buildUserAccountsSheet,
  publications: buildPublicationsSheet,
  "location-subscriptions": buildLocationSubscriptionsSheet,
  "all-subscriptions": buildAllSubscriptionsSheet,
  "deleted-accounts": buildDeletedAccountsSheet
};
```

- **`all-data` (decided): add the tab.** Add `buildDeletedAccountsSheet(cutoff)` to the
  `Promise.all` in `buildAllDataSheets` so the combined workbook gains a "Deleted
  Accounts" tab — consistent with `all-data` meaning "all of the above" and with legacy
  `ALL_DATA`. `buildDeletedAccountsSheet` takes no court resolver, so it slots in
  without touching the resolver wiring.

### E. Validation + type — `libs/system-admin-pages/src/mi-report/validation.ts`

- Add `"deleted-accounts"` to the `MI_REPORT_TYPES` tuple. Because `MiReportType`
  is derived from that tuple, the union updates automatically and the `SHEET_BUILDERS`
  `Record` type will require the new key (compile-time safety).

```typescript
export const MI_REPORT_TYPES = [
  "user-accounts",
  "publications",
  "location-subscriptions",
  "all-subscriptions",
  "deleted-accounts",
  "all-data"
] as const;
```

### F. Content — `apps/web/src/pages/(system-admin)/mi-report/en.ts` and `cy.ts`

Add one entry to `reportTypeOptions` in both files, mirroring keys exactly. Place it
before the `all-data` entry to match the ordering above.

English:
```typescript
{ value: "deleted-accounts", text: "Deleted accounts", description: "Accounts deleted following the annual verification process" }
```

Welsh (placeholders, to be translated):
```typescript
{ value: "deleted-accounts", text: "[TRANSLATE: Deleted accounts]", description: "[TRANSLATE: Accounts deleted following the annual verification process]" }
```

- No other content keys change. The existing `reportTypeError` message already
  covers an invalid/blank report type.

### G. Controller — `apps/web/src/pages/(system-admin)/mi-report/index.ts`

**Verify no change needed.** The controller builds `reportTypeItems` generically from
`t.reportTypeOptions`, validates via `validateMiReportSelection`, and streams the
buffer from `buildMiReport`. A new allow-listed option flows through untouched. Only
change if verification shows a hardcoded list somewhere (none expected).

### Files changed

| File | Change | Workstream |
|---|---|---|
| `libs/postgres-prisma/prisma/schema/user-archive.prisma` | New — `UserArchive` model | A |
| `apps/postgres/prisma/migrations/<ts>_add_user_archive/migration.sql` | New — generated migration | A |
| `libs/system-admin-pages/src/mi-report/queries.ts` | Add `DELETED_ACCOUNTS_HEADERS` + `buildDeletedAccountsSheet` | B |
| `libs/system-admin-pages/src/mi-report/service.ts` | Register in `SHEET_BUILDERS`; add to `buildAllDataSheets` (flagged) | B |
| `libs/system-admin-pages/src/mi-report/validation.ts` | Add `deleted-accounts` to `MI_REPORT_TYPES` | B |
| `apps/web/src/pages/(system-admin)/mi-report/en.ts` | Add `reportTypeOptions` entry | B |
| `apps/web/src/pages/(system-admin)/mi-report/cy.ts` | Add `reportTypeOptions` entry (Welsh placeholders) | B |
| `libs/system-admin-pages/src/mi-report/queries.test.ts` | New/extended — `buildDeletedAccountsSheet` tests | B |
| `libs/system-admin-pages/src/mi-report/service.test.ts` | Extend — `deleted-accounts` and `all-data` tab | B |
| `apps/web/src/pages/(system-admin)/mi-report/index.njk.test.ts` | Extend — new option rendered | B |
| `apps/web/src/pages/(system-admin)/mi-report/index.test.ts` | Extend — new report type accepted | B |
| `e2e-tests/tests/*mi-report*.spec.ts` | Extend existing journey to select new option | B |

## 3. Error Handling & Edge Cases

- **Empty result is valid, not an error.** With `user_archive` empty (expected until
  #351 lands), `findMany` returns `[]`, `rows` is `[]`, and the sheet is a valid
  workbook with headers and no data rows. No branch throws on empty. This directly
  satisfies the "returns an empty result (not an error)" AC.
- **Unrecognised `reportType` is rejected, not defaulted.** `validateMiReportSelection`
  enforces the allow-list; anything not in `MI_REPORT_TYPES` produces the
  `reportTypeError` and re-renders the form. `buildMiReport` is only reached with a
  valid, typed value, so `SHEET_BUILDERS[reportType]` can never be `undefined`.
- **Reporting-window mismatch (annual event vs 7/14/21/30-day windows).** The
  verification/deletion process is annual, but the fixed day-windows are much shorter,
  so a naive short window could show zero deletions even after #351 runs. The existing
  `all` ("From the beginning") period option mitigates this — an operator can always
  retrieve every archived account. Flagged in CLARIFICATIONS as a possible need for a
  longer/12-month window.
- **Nullable date formatting.** `last_signed_in_date` is nullable and `archived_date`
  is non-null in the model but read defensively; both go through `formatDate`, which
  returns `""` for null/undefined and ISO otherwise. No `Invalid Date` strings.
- **Nullable text columns.** `provenance_user_id`, `user_provenance`, `roles` are
  nullable; each is coalesced to `""` in the row mapping so the sheet never contains
  `null`.

## 4. Acceptance Criteria Mapping

| AC | How satisfied | Verification |
|---|---|---|
| `user_archive` table exists with the given columns, via a Prisma migration | New `user-archive.prisma` + generated migration | Migration applies cleanly (`yarn db:migrate:dev`); inspect `migration.sql` |
| `UserArchive` model available from `@hmcts/postgres-prisma`, in the generated client | `yarn db:generate`; model re-exported by the package | Type-check compiles referencing `prisma.userArchive` and `UserArchive` |
| 'Deleted accounts' option added to the 'Select report type' drop down | New `reportTypeOptions` entry in `en.ts`/`cy.ts`; rendered by existing `govukSelect` | `index.njk.test.ts` asserts the `<option value="deleted-accounts">` is present |
| Backend changes support generating the report | `buildDeletedAccountsSheet` + `SHEET_BUILDERS` registration + validation allow-list | `service.test.ts` asserts a sheet is produced for `deleted-accounts` |
| Report contains total number of deleted accounts and their CaTH IDs for the selected duration | `user_id` column = CaTH ID; one row per archived account = the total | `queries.test.ts` asserts rows map `userId` and honour the cutoff |
| Reads from `user_archive`, filtered on `archived_date` against the duration | `findMany({ where: { archivedDate: { gte: cutoff } } })`; cutoff resolved by existing `resolveCutoff` | `queries.test.ts` asserts the `where` filter and `all` = no filter |
| Empty result (not error) when no deletions in the duration | Empty `rows`, valid empty sheet | `queries.test.ts` asserts `[]` input → sheet with headers, no rows, no throw |
| Dependent on #628 | #628 already landed on this branch; extension only | N/A — verified present |

## 5. Clarifications — RESOLVED

Resolved by investigating the incumbent `pip-account-management` / `pip-frontend` /
`pip-data-models` and by product decision. (The issue body already settled: table name,
no `deleteUserById` change, population out of scope.)

1. **Column naming — reference names.** Follow `pi_user_archived`
   (`provenance_user_id`, `roles` VARCHAR(255), `user_provenance` VARCHAR(255)) for
   incumbent parity, not CaTH's `user`. ✅
2. **`roles` content — single value.** Legacy stores one `@Enumerated(EnumType.STRING)`
   enum name (e.g. `INTERNAL_ADMIN_CTSC`), not a CSV. VARCHAR(255) kept for parity. ✅
3. **PII retention.** `email` is retained in the table (nullable). Legacy has a
   config-driven purge job (`deleteArchivedAccounts`, `archivedAccountDeletionDays`).
   A CaTH retention/purge policy is a **follow-up**, not built here. ✅ (noted)
4. **Email in the report — excluded.** Match the legacy anonymised set; the download
   never contains `email`. Columns: `user_id, provenance_user_id, user_provenance,
   roles, last_signed_in_date, deleted_date`. ✅
5. **CaTH ID = `user_id`** (UUID). ✅
6. **`all-data` gains the Deleted Accounts tab** — legacy `ALL_DATA` includes it. ✅
7. **Reporting period — filter by `archived_date`** per the AC, via #628's
   `resolveCutoff`; `all` returns everything and covers the annual-event case.
   (Legacy dumped the whole table; the AC overrides that.) ✅

### Still open (follow-ups, do not block this story)

- **Manual deletions.** The AC says "all deleted accounts", but #351 (like legacy) only
  archives automated inactive deletions; manual `deleteUserById` deletions are not
  archived and are out of scope here. If manual deletions must appear, that is a
  separate change to the manual delete path.
- **#351 as a formal dependency.** Recommend recording #351 as a dependency — the report
  reads zero rows until #351 populates the table.
