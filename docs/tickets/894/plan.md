# Plan: #894 — 'Deleted accounts' to be added to the MI Report

## 0. Current state (verified in this repo, not assumed)

Everything in this section was checked against the working tree at `master` (`1b912d2`).

| Claim | Verified? | Detail |
|---|---|---|
| No MI report code exists | Yes | Zero matches for `mi-report`, `miReport`, `deleted_account`, `DeletedAccount` across `libs/`, `apps/`, `e2e-tests/`. No `apps/web/src/pages/(system-admin)/mi-report/` directory. |
| #628 is open and unimplemented | Yes | Its requirement `REQ-0345` exists only in `requirements/migrations/012_reconcile_board_2026_08_04.sql` (status `approved`), with no implementation. |
| `User` has no soft-delete column | Yes | `libs/postgres-prisma/prisma/schema/base.prisma` — `userId`, `email`, `firstName?`, `surname?`, `userProvenance`, `userProvenanceId` (`@unique`), `role`, `createdDate`, `lastSignedInDate?`, plus `subscriptions` / `subscriptionListTypes`. No `deletedAt`. |
| `deleteUserById` is a hard delete | Yes | `libs/system-admin-pages/src/user-management/queries.ts:107`. Inside `prisma.$transaction`: `notificationAuditLog.deleteMany` → `subscription.deleteMany` → `user.delete`. Signature is `deleteUserById(userId: string): Promise<void>` — no reason parameter. |
| Only one deletion call site | Yes | `apps/web/src/pages/(system-admin)/delete-user-confirm/[userId]/index.ts:105`. It is the only production caller. |
| The annual verification job does not exist | Yes | `apps/crons/src/` contains only `index.ts` (a `SCRIPT_NAME`-driven dynamic loader) and `example.ts`. No verification or deletion job. |
| `exceljs` already lives in one lib | Yes | `libs/excel-generation/package.json` pins `exceljs@4.4.0`. `src/excel/` holds `excel-headers.ts`, `excel-styles.ts`, `sjp-press-list-excel-generator.ts`, `sjp-public-list-excel-generator.ts` (+ tests). |
| Streaming download reference pattern | Yes | `apps/web/src/pages/(system-admin)/reference-data-download/index.ts` — `export const GET: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN]), getHandler]`, sets `Content-Type` + `Content-Disposition`, `res.send(content)`. |
| Prisma schemas are centralised | Yes | `libs/postgres-prisma/prisma/schema/`: `audit-log`, `base`, `list-search-config`, `location`, `notification`, `subscription`, `third-party-push-log`, `third-party-user`. |
| Migrations live in `apps/postgres` | Yes | `apps/postgres/prisma.config.ts` sets `schema` to `libs/postgres-prisma/prisma/schema` and `migrations.path` to `apps/postgres/prisma/migrations` (44 entries, latest `20260714112456_add_list_type_json_fields`). |

### Corrections to the @SPEC comment on the issue

The spec comment is broadly sound and is used as input, but four of its claims are wrong or
misleading against the repo as it stands. **Do not implement these as written.**

1. **`requireRole` does not return `403`.** `libs/auth/src/middleware/authorise.ts:12` **redirects**
   on role mismatch: `SYSTEM_ADMIN` → `/system-admin-dashboard`, internal admins → `/admin-dashboard`,
   and anything else (including `VERIFIED`) → `/sign-in` after stashing `req.session.returnTo`.
   Unauthenticated requests go through `redirectUnauthenticated`. The spec's access-control AC
   ("I receive a 403") and its E2E assertion are both wrong. Assert a **redirect to `/sign-in`**
   for a `VERIFIED` user, matching every other system-admin page in the repo.

2. **The Prisma schema contains no `enum` today.** `grep '^enum' libs/postgres-prisma/prisma/schema/*.prisma`
   returns nothing; `Subscription.searchType` is a `String @db.VarChar(50)` despite
   `.claude/rules/backend.md` §6 recommending enums. Introducing `AccountDeletionReason` as a real
   Prisma enum follows the written rule but is the first enum in the schema, so the generated
   migration will emit a `CREATE TYPE`. That is fine, just be aware it is new ground here.

3. **`apps/web` does not depend on `@hmcts/excel-generation` or `@hmcts/postgres-prisma`.**
   Checked `apps/web/package.json` — neither is listed. So the controller cannot import the
   generator or the generated enum directly without adding new dependencies to `apps/web`.
   Avoid that: `@hmcts/system-admin-pages` already depends on `@hmcts/postgres-prisma`, and adding
   `@hmcts/excel-generation` to it creates no cycle (`excel-generation` depends only on
   `@hmcts/azure-blob` and `@hmcts/list-types-common`). **The service in `system-admin-pages` must
   return the finished `Buffer`, and re-export the reason enum.** The controller imports one thing
   from one package and stays a thin composition layer, per CLAUDE.md.

4. **`formatTimestamp` in `libs/system-admin-pages/src/audit-log/service.ts:24` is module-private**
   and includes a time component (`dd/MM/yyyy HH:mm:ss`). It is not exported and cannot be reused.
   `libs/web-core`'s `formatDate` takes a `{day, month, year}` object and returns a long-form
   `en-GB` date, which is not what a spreadsheet column wants either. Write a small local
   `dd/MM/yyyy` formatter in the generator file. Do not create a `date-formatting.ts` utility for it.

Two further spec claims that are **correct** and worth keeping:

* `auditLogMiddleware` (`libs/system-admin-pages/src/audit-log/middleware.ts`) wraps `res.send` and
  logs `"success"` for any `POST` by a `SYSTEM_ADMIN` outside `/audit-log`. An `.xlsx` download via
  `res.send(buffer)` therefore **will** be audit-logged automatically with a path-derived action
  `MI_REPORT`. No work needed; it is desirable that user-data downloads are traceable.
* `audit_log` cannot substitute for the new table. Its `details` column is free text
  (`User: {email}`) with no queryable user ID, and it is only written for manual System Admin
  deletions. Confirmed by reading `logger.ts` and the `delete-user-confirm` controller.

---

## 1. Technical Approach

### 1.1 The core problem: deletions currently leave no trace

`deleteUserById` hard-deletes the `user` row. Once it commits, the CaTH ID is gone. There is no
soft-delete column, no deletion table, and the `audit_log` entry does not record the user ID in a
queryable field. **This ticket therefore cannot be delivered as a query over existing data.** It
requires a new record written at deletion time.

That fact drives the whole sequencing decision below.

### 1.2 Split the work: Phase 1 ships now, Phase 2 waits on #628

**Phase 1 — Persistence. Deliverable immediately. No dependency on #628.**

* New `deleted_account` table + `AccountDeletionReason` enum.
* `deleteUserById` takes a required `reason` and writes the record inside the existing transaction.
* The single call site passes `SYSTEM_ADMIN`.

**Phase 2 — Report generation and the UI option. Blocked on #628.**

* Queries, service, workbook generator.
* One extra radio on `/mi-report`, plus the `all-data` tab.

**Ship Phase 1 first, and do not wait for #628.** The argument is simple and not negotiable on
technical grounds: every account deleted before the table exists is **permanently unreportable**.
There is no backfill. If #628 slips by a sprint and any account is deleted in that window, the
deleted-accounts report has a silent hole in it that nobody can ever repair, and the hole will not
be visible in the report — it will just show a lower number. Phase 1 is small (one schema file, one
migration, one function signature change, one call site) and carries no user-facing risk, so there
is no reason to hold it behind the reporting UI.

Phase 1 is also the contract the future annual verification job must write to. `reason` is a
**required** parameter with no default, so that job physically cannot be written without declaring
which process deleted the account — which is exactly the distinction the report reports on.

### 1.3 Architecture decisions

**A separate append-only table, not a `deletedAt` column on `user`.**
Soft-deleting `user` would force a `deletedAt: null` predicate into every read path
(`libs/system-admin-pages/src/user-management/queries.ts`, `libs/account/src/repository/`,
subscriptions, the auth middleware) — a large, easy-to-get-wrong change where a single missed
predicate leaks deleted accounts back into the product. It would also collide with
`userProvenanceId @unique` if someone re-registers with the same Azure B2C object ID. A dedicated
table leaves all existing read paths untouched. This also matches the direction the repo has
already taken: migration `20260702000000_remove_soft_delete_and_admin_audit_log` deliberately
*removed* `deleted_at` columns from `jurisdiction`, `region` and `sub_jurisdiction` in favour of
hard deletes plus an audit record. Adding a `deletedAt` to `user` would reverse a decision this
codebase made two months ago.

**Data minimisation: CaTH ID only, no email, no name, no `userProvenanceId`.**
The account has been deleted. Retaining direct identifiers would partly defeat the deletion. The
AC asks for counts and CaTH IDs, so we keep the internal UUID (meaningless outside CaTH) and
non-identifying attributes. This is a deliberate constraint, and it is a question for the PM to
confirm rather than for us to relax unilaterally — see CLARIFICATIONS NEEDED §12.

**No foreign key to `user`.** The `user` row is deleted in the same transaction, so a relation
would be dangling on commit.

**`userId @unique`** so a re-run of the future deletion job cannot double-count an account. Use
`create` (not `upsert`) inside the transaction — a duplicate is a genuine bug and should surface,
not be silently swallowed.

**Excel generation belongs in `libs/excel-generation`.** It already owns `exceljs@4.4.0` and the
shared style constants. #628's technical notes propose adding `exceljs` to
`libs/system-admin-pages/package.json`; that would put a second copy of the same dependency in the
monorepo. Put the generator in `excel-generation` and have `system-admin-pages` depend on it.

**The controller stays thin.** It validates, calls one service function that returns a `Buffer`,
sets two headers, and sends. No Prisma, no `exceljs`, no business logic — per CLAUDE.md
("Don't put business logic in apps/").

### 1.4 What "active accounts prior to deletion" can and cannot be

`REQ-0409` asks for the active count *prior to deletion*. No historic snapshot of the user table
exists, and none can be reconstructed. The only available computation is:

```
activeAfterDeletion    = prisma.user.count()
deletedInPeriod        = annualVerification + systemAdmin
activePriorToDeletion  = activeAfterDeletion + deletedInPeriod   // derived, not measured
```

This is exact **only if no accounts were created inside the reporting period**. Accounts created
during the window inflate it. A truly measured figure requires the annual verification job to
record the active count at the instant it runs — and that job does not exist. State this limitation
plainly in the plan and get a decision from the PM (CLARIFICATIONS NEEDED §2) rather than shipping a
number labelled as measured when it is derived. If a measured figure is required, the snapshot
belongs in the verification job's own ticket, not here.

---

## 2. Implementation Details

**TEMPLATE SOURCE: n/a**

This ticket adds one radio option to a page created by #628. There is no new rendered page and no
pip-frontend migration.

### 2.1 Phase 1 — Persistence

#### `libs/postgres-prisma/prisma/schema/deleted-account.prisma` (new)

One file per domain, per CLAUDE.md.

```prisma
enum AccountDeletionReason {
  ANNUAL_VERIFICATION
  SYSTEM_ADMIN
}

model DeletedAccount {
  id               String                @id @default(uuid()) @db.Uuid
  userId           String                @unique @map("user_id") @db.Uuid
  userProvenance   String                @map("user_provenance") @db.VarChar(20)
  role             String                @db.VarChar(20)
  createdDate      DateTime              @map("created_date")
  lastSignedInDate DateTime?             @map("last_signed_in_date")
  deletedDate      DateTime              @default(now()) @map("deleted_date")
  deletionReason   AccountDeletionReason @map("deletion_reason")

  @@index([deletedDate])
  @@index([deletionReason])
  @@map("deleted_account")
}
```

Table singular snake_case, fields camelCase in code / snake_case in DB — matches the existing
schema files. `@@index([deletedDate])` because every report query filters `deletedDate >= cutoff`.

Then `yarn db:generate` and `yarn db:migrate:dev` to produce
`apps/postgres/prisma/migrations/{timestamp}_add_deleted_account/migration.sql`. Do not hand-write
the SQL — let Prisma generate it (this is a schema migration, unrelated to the
`generate-seed-sql.ts` reference-data path, which is not touched by this ticket).

#### `libs/system-admin-pages/src/user-management/queries.ts` — extend `deleteUserById`

```typescript
export async function deleteUserById(userId: string, reason: AccountDeletionReason): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const user = await tx.user.findUniqueOrThrow({
      where: { userId },
      select: { userProvenance: true, role: true, createdDate: true, lastSignedInDate: true }
    });

    await tx.deletedAccount.create({ data: { userId, ...user, deletionReason: reason } });

    // existing cascade, unchanged: notificationAuditLog -> subscription -> user
  });
}
```

`reason` is required. The record is written **inside** the existing transaction so the invariant
"a user row disappearing always produces a deletion record" holds atomically. Note the explicit
`select` — do not fetch `email`, `firstName`, `surname` or `userProvenanceId`, so they cannot
accidentally reach the new row.

`findUniqueOrThrow` changes behaviour for a nonexistent user from "throw on `user.delete`" to
"throw on the read". Either way the controller's existing `try/catch` renders `errors/500`, and the
controller already checks `getUserById` returns non-null before calling. No user-visible change.

#### `apps/web/src/pages/(system-admin)/delete-user-confirm/[userId]/index.ts` — pass the reason

`await deleteUserById(userId, AccountDeletionReason.SYSTEM_ADMIN);`

The enum must be reachable from `@hmcts/system-admin-pages` (see correction 3 above) — re-export it
from that lib's `index.ts`. Do not add `@hmcts/postgres-prisma` to `apps/web/package.json`.
The existing `req.auditMetadata` block is unchanged.

### 2.2 Phase 2 — Report generation

#### `libs/system-admin-pages/src/mi-report/deleted-accounts-queries.ts` (new)

```typescript
export async function findDeletedAccountsSince(cutoff: Date): Promise<DeletedAccountRow[]>
export async function countDeletedAccountsSince(cutoff: Date): Promise<Record<AccountDeletionReason, number>>
export async function countActiveAccounts(): Promise<number>
```

* `findDeletedAccountsSince` — `findMany({ where: { deletedDate: { gte: cutoff } }, orderBy: { deletedDate: "desc" }, select: {...} })`. Explicit `select`, filtering and ordering in the database.
* `countDeletedAccountsSince` — `groupBy({ by: ["deletionReason"], where: { deletedDate: { gte: cutoff } }, _count: true })`, normalised so both reasons are always present with a `0` default. Without normalisation the Summary sheet would omit a row when a reason has no records.
* `countActiveAccounts` — `prisma.user.count()`. See CLARIFICATIONS NEEDED §6 on whether this should filter `role: "VERIFIED"`.

Types colocated in this file. No `types.ts`.

#### `libs/system-admin-pages/src/mi-report/deleted-accounts-service.ts` (new)

```typescript
export async function generateDeletedAccountsReport(days: number): Promise<Buffer>
```

Computes `cutoff`, runs the three queries with `Promise.all`, derives the summary figures per §1.4,
and delegates to `generateDeletedAccountsExcel` from `@hmcts/excel-generation`. Returns the finished
`Buffer` so the controller needs no `exceljs` dependency.

Also export the composed report shape and a `buildDeletedAccountsReport(days)` that stops short of
the workbook, so the `all-data` path can reuse the data without a nested workbook.

#### `libs/excel-generation/src/excel/deleted-accounts-excel-generator.ts` (new)

```typescript
export function addDeletedAccountsSheets(workbook: ExcelJS.Workbook, report: DeletedAccountsReport): void
export async function generateDeletedAccountsExcel(report: DeletedAccountsReport): Promise<Buffer>
```

Splitting sheet-building from buffer-writing lets the `all-data` report add these sheets to the
shared workbook with no intermediate file. Reuse `HEADER_FONT`, `HEADER_FILL`, `HEADER_ALIGNMENT`,
`DATA_FONT`, `DATA_ALIGNMENT`, `CELL_BORDER` from `excel-styles.ts` and follow the column/row
styling loop already used in `sjp-public-list-excel-generator.ts`.

Dates as `dd/MM/yyyy` strings via a local formatter (correction 4). Null `lastSignedInDate`
renders as an empty cell — no placeholder text, so the column stays sortable in Excel.

Headers as constants in `excel-headers.ts` alongside `SJP_*_HEADERS`. English only
(CLARIFICATIONS NEEDED §9). Sheet names `Summary` and `Deleted Accounts`. Reason display values:
`ANNUAL_VERIFICATION` → `Annual verification`, `SYSTEM_ADMIN` → `System Admin`. Freeze the header
row on each sheet.

#### `apps/web/src/pages/(system-admin)/mi-report/index.ts` (created by #628 — extended here)

* Add `deleted-accounts` to the `reportType` allow-list.
* Route it to `generateDeletedAccountsReport(days)`.
* Stream, matching `reference-data-download`:

```typescript
res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
res.setHeader("Content-Disposition", `attachment; filename="mi-report-deleted-accounts-${days}days-${today}.xlsx"`);
res.send(buffer);
```

Build the whole buffer **before** setting any header, so a mid-generation failure can still render
`errors/500` rather than emitting a truncated file.

#### Content

`en.ts`: label `Deleted accounts`, hint `Accounts deleted following the annual verification process`.
`cy.ts`: `[WELSH TRANSLATION REQUIRED: 'Deleted accounts']` and
`[WELSH TRANSLATION REQUIRED: 'Accounts deleted following the annual verification process']` —
matching the placeholder format already used in `apps/web/src/pages/(system-admin)/edit-list-type/cy.ts`.
The template test asserts `en`/`cy` key parity.

### 2.3 Files changed

| File | Phase | Change |
|---|---|---|
| `libs/postgres-prisma/prisma/schema/deleted-account.prisma` | 1 | New — `DeletedAccount` model + `AccountDeletionReason` enum |
| `apps/postgres/prisma/migrations/{ts}_add_deleted_account/migration.sql` | 1 | New — generated by `yarn db:migrate:dev` |
| `libs/system-admin-pages/src/user-management/queries.ts` | 1 | `deleteUserById(userId, reason)`; writes `deleted_account` in-transaction |
| `libs/system-admin-pages/src/user-management/queries.test.ts` | 1 | Extend the two existing `deleteUserById` tests (the `mockTx` object gains `deletedAccount.create` and `user.findUniqueOrThrow`); add rollback, null `lastSignedInDate`, and no-PII cases |
| `libs/system-admin-pages/src/index.ts` | 1 | Re-export `AccountDeletionReason` |
| `apps/web/src/pages/(system-admin)/delete-user-confirm/[userId]/index.ts` | 1 | Pass `AccountDeletionReason.SYSTEM_ADMIN` |
| `apps/web/src/pages/(system-admin)/delete-user-confirm/[userId]/index.test.ts` | 1 | Update the `toHaveBeenCalledWith("user123")` assertion at line 146 to include the reason |
| `libs/system-admin-pages/src/mi-report/deleted-accounts-queries.ts` (+`.test.ts`) | 2 | New |
| `libs/system-admin-pages/src/mi-report/deleted-accounts-service.ts` (+`.test.ts`) | 2 | New |
| `libs/system-admin-pages/src/index.ts` | 2 | Export the service and queries |
| `libs/system-admin-pages/package.json` | 2 | Add `@hmcts/excel-generation": "workspace:*"` |
| `libs/excel-generation/src/excel/deleted-accounts-excel-generator.ts` (+`.test.ts`) | 2 | New |
| `libs/excel-generation/src/excel/excel-headers.ts` | 2 | Add `DELETED_ACCOUNTS_HEADERS`, `DELETED_ACCOUNTS_SUMMARY_LABELS` |
| `libs/excel-generation/src/index.ts` | 2 | Export the new generator functions |
| `apps/web/src/pages/(system-admin)/mi-report/index.ts` | 2 | Accept `deleted-accounts`; add the tab to `all-data` |
| `apps/web/src/pages/(system-admin)/mi-report/en.ts` / `cy.ts` | 2 | New radio label + hint |
| `apps/web/src/pages/(system-admin)/mi-report/index.test.ts` | 2 | Extend for the new report type |
| `apps/web/src/pages/(system-admin)/mi-report/index.njk.test.ts` | 2 | Assert the new radio renders in both locales |
| `e2e-tests/tests/system-admin/mi-report.spec.ts` | 2 | Extend the #628 journey |

No new lib. `@hmcts/system-admin-pages` and `@hmcts/excel-generation` both already exist and are
registered in the root `tsconfig.json` (lines 28 and 90), so there are no `tsconfig.json`,
`vite.config.ts` or `app.ts` registration changes. Pages are auto-discovered.

---

## 3. Error Handling & Edge Cases

### Validation (Phase 2, server-side only, `novalidate` on the form)

| Field | Rule | Failure message |
|---|---|---|
| `reportingPeriod` | Required; must be exactly one of `7`, `14`, `21`, `30` | `Select a reporting period` |
| `reportType` | Required; must be in the allow-list including `deleted-accounts` | `Select a report type` |

Welsh: `[WELSH TRANSLATION REQUIRED: 'Select a reporting period']` /
`[WELSH TRANSLATION REQUIRED: 'Select a report type']`. Summary title `There is a problem` / `Mae problem`.

**An unrecognised `reportType` must be a validation error, not a default.** Falling through to a
default report would silently hand a System Admin the wrong data with a filename that says
otherwise. Falling through to a 500 would be an unhelpful response to a bad form post. Treat any
value outside the allow-list as absent and re-render with `Select a report type`, preserving the
reporting period selection. Same for `reportingPeriod`.

No user-supplied value reaches a query. `days` is an integer taken from the allow-list and used
only for `cutoff = new Date(Date.now() - days * 86_400_000)`; the Prisma `where` receives only that
`Date`.

### Edge cases

| Case | Required behaviour |
|---|---|
| **Zero deletions in the period** | A **valid report**, not an error and not an empty response. `Summary` fully populated showing `0`; `Deleted Accounts` sheet contains the header row only. A PM needs `0` as a reportable figure — "no deletions this month" is the answer, not a failure. |
| **Null `lastSignedInDate`** | `User.lastSignedInDate` is nullable and a user who never signed in has `null`. The record must store `null`, not fail or coerce to a date. The sheet renders an empty cell, no placeholder, so the column stays sortable/filterable. |
| **Deletion transaction fails after the record insert** | Everything rolls back — no orphan `deleted_account` row for a user that still exists. Covered by a test that makes `user.delete` reject and asserts the whole transaction rejects. |
| **Deleting a nonexistent user** | `findUniqueOrThrow` rejects, transaction rolls back, nothing written. The controller already guards with `getUserById` first and renders `errors/500` on throw. |
| **Duplicate deletion record** | `userId @unique` + `create` → the insert fails loudly. A repeated deletion of the same CaTH ID is a bug (the `user` row cannot exist twice), and double-counting would corrupt the report. Do not `upsert`. |
| **Deletions outside the period** | Excluded by `deletedDate >= cutoff` at the database level, not in application code. |
| **Boundary of the reporting window** | `gte` on the cutoff — a deletion exactly at the boundary is included. Pick one and test it; do not leave it to chance. |
| **Non-`SYSTEM_ADMIN` request** | `requireRole` **redirects** (`VERIFIED` → `/sign-in`); it does not send `403`. No report is generated. See correction 1. |
| **Database unavailable / generator throws** | Log with context and render `errors/500`. Build the full buffer before setting any response header so no partial file is sent. |
| **Accounts created inside the reporting period** | Inflate the derived `Active accounts prior to deletion`. Not fixable here — see §1.4 and CLARIFICATIONS NEEDED §2. |
| **Pre-Phase-1 deletions** | Permanently absent from every report. No backfill exists. The report will show a smaller number with no indication anything is missing. This is the reason Phase 1 ships first. |

---

## 4. Acceptance Criteria Mapping

Issue-body ACs first, then the `REQ-0409` variant (see CLARIFICATIONS NEEDED §1 — this plan
satisfies both readings).

| # | Acceptance criterion | How it is satisfied | How it is verified |
|---|---|---|---|
| AC1 | `Deleted accounts` appears as an option in the report type control on the `Download MI Report` page | New item added to the existing `reportType` `govukRadios` group in `apps/web/src/pages/(system-admin)/mi-report/`, with label + hint in `en.ts`/`cy.ts` | `index.njk.test.ts` — the group renders six items and the new one is present with its hint associated; rendered again with `cy` for the Welsh label; `en`/`cy` key parity assertion. E2E journey asserts the option is selectable |
| AC2 | Backend changes support generating the report | `deleted_account` table + write path (Phase 1); `deleted-accounts-queries.ts`, `deleted-accounts-service.ts`, `deleted-accounts-excel-generator.ts` (Phase 2) | Co-located unit tests for each: queries filter/order at the DB level, service derives the summary and runs queries concurrently, generator produces the expected sheets and cells |
| AC3 | The report contains the total number of deleted CaTH accounts and their CaTH IDs for the selected duration | `Summary` sheet: `Deleted accounts (total)` plus the per-reason split. `Deleted Accounts` sheet: one row per account keyed on CaTH ID | Generator test asserts one data row per account plus a header row, and that the CaTH ID column is populated; service test asserts the totals |
| AC4 | Report scoped to the selected report duration | `deletedDate >= cutoff` computed from the allow-listed day count | Query test asserts the `where` clause and that out-of-period records are excluded; boundary test on `gte` |
| AC5 | Implementation is dependent on #628 | Work split into Phase 1 (independent) and Phase 2 (blocked). Phase 2 touches only files #628 creates | Phase 2 tasks are gated in `tasks.md`; Phase 1 has no #628 touchpoints |
| REQ-0409a | Total number of active accounts prior to deletion | `Active accounts prior to deletion` = `countActiveAccounts() + deletions in period`. **Derived, not measured** | Service test asserts the arithmetic; the limitation is escalated in CLARIFICATIONS NEEDED §2 rather than hidden |
| REQ-0409b | Number of deleted accounts from the annual verification process | `Deleted accounts (annual verification)`, from the `deletionReason` group-by, always present with a `0` default | Service and generator tests, including the reason split and the zero-default case |
| REQ-0409c | The difference between both | `Active accounts after deletion` = `countActiveAccounts()`, sitting below the two figures on the `Summary` sheet | Generator test asserts all labelled measures and their values |
| — | Welsh support | New label and hint added to `cy.ts` as `[WELSH TRANSLATION REQUIRED: '...']` placeholders | Template test renders with `cy`; `en`/`cy` key parity; E2E visits `?lng=cy` and runs axe |
| — | Access control | `requireRole([USER_ROLES.SYSTEM_ADMIN])` as the first element of the exported `RequestHandler[]` on both `GET` and `POST` | Controller test asserts the guard is present; E2E asserts a `VERIFIED` user is **redirected to `/sign-in`** (not `403` — correction 1) |
| — | A deletion writes a durable record | `deleteUserById` inserts into `deleted_account` inside the existing transaction, with `reason` required | `queries.test.ts` — record contents, no PII fields, null `lastSignedInDate`, rollback on failure; `delete-user-confirm` test asserts `SYSTEM_ADMIN` is passed |
| — | WCAG 2.2 AA | Standard `govukRadios` item; hint via the macro's item `hint` so `aria-describedby` is wired automatically; error state via the fieldset's `errorMessage`; no new heading level; no JS dependency | Axe scan inline in the E2E journey, in both locales and in the error state; keyboard navigation of the radio group in the same test |

---

## 5. Notes for whoever picks this up

* **The annual verification deletion job does not exist, and the issue names the wrong dependency
  for it.** `apps/crons/src/` contains `index.ts` (a `SCRIPT_NAME`-driven dynamic loader) and
  `example.ts`. Nothing else. The job that actually deletes non-re-verified accounts is
  **[#351 — CaTH Cron Trigger - Automated Inactive Accounts](https://github.com/hmcts/cath-service/issues/351)**
  (OPEN), which specifies that media users unverified for 350 days get a verification email and
  those still unverified at 365 days are deleted along with their subscriptions. **#894 therefore
  has two dependencies and the issue body only names #628** (the download page). See
  CLARIFICATIONS NEEDED §11.

  This ticket defines the contract #351 must write to: call
  `deleteUserById(userId, AccountDeletionReason.ANNUAL_VERIFICATION)` inside its deletion
  transaction. Until #351 lands, every row in `deleted_account` will have reason `SYSTEM_ADMIN` and
  the `Deleted accounts (annual verification)` figure will legitimately read `0`. That is correct
  behaviour, not a bug — but the PM should know the headline number is zero on delivery.
* **Related, not-yet-built:** #895 (verification requirement in account-creation T&Cs) and #896
  (email notification on deletion). Neither blocks this work.
* Run `yarn db:generate` after adding the schema file, and `yarn lint:fix` before committing.
  Commands run from the repo root.

---

## CLARIFICATIONS NEEDED

1. **Which acceptance criteria are authoritative — the issue body or the requirements database?**
   The issue body asks for *"the total number of all deleted CaTH accounts and their CaTH IDs"*.
   `REQ-0409` for the same issue asks for *"the total number of active accounts prior to the
   deletion, the number of deleted accounts from the annual verification process and the difference
   between both"*. These are different reports. This plan builds **both** — a `Summary` sheet with
   the aggregate figures and a `Deleted Accounts` sheet with per-account CaTH IDs. Is that correct,
   or do you want only one of them? If only the aggregates are needed, we drop the second sheet and
   retain even less data.

2. **Is a *derived* "active accounts prior to deletion" figure acceptable for the analytical report,
   or do you need a *measured* one?** No historic snapshot of the user table exists, so the only
   available figure is `current active count + deletions in the period`. That is exact only if no
   accounts were created during the reporting window; any accounts created in the window will
   inflate it. A measured figure requires the annual verification job to record the active count at
   the moment it runs, which means adding it to that job's ticket. Which do you want?

3. **Please confirm the workbook layout against the mock-up.** `Deleted accounts MI Report
   Mock-up.docx` is a GitHub attachment that cannot be opened from CI, so the sheet names
   (`Summary`, `Deleted Accounts`), the column order (CaTH ID, User provenance, Role, Created date,
   Last signed in date, Deleted date, Deletion reason) and the summary row labels are all inferred
   from the ACs. Can you confirm them, or paste the tables into a comment on the issue?

4. **The issue says "drop down", but #628 builds report type as a set of radio buttons.** The GOV.UK
   Design System treats `select` as a last resort. Adding a sixth radio is consistent with the page
   #628 is building and better for accessibility. Is a radio option acceptable? If you specifically
   want a drop-down, that is a change to #628's page design, not an added option here, and should be
   raised on #628.

5. **Should manual System Admin deletions be included in the report?** The AC scopes it to the
   annual verification process, but that job does not exist yet, so **manual deletion is the only
   deletion path today**. If we exclude manual deletions, the report reads `0` for the foreseeable
   future and the "active accounts prior to deletion" figure is wrong. This plan records both and
   reports them as separate lines, so the annual-verification figure is available in isolation. Is
   that what you want, or should manual deletions be excluded entirely?

6. **Does "active accounts" mean all user rows, or only `VERIFIED` accounts?** `prisma.user.count()`
   counts everything, including System Admin and internal admin accounts. If the analytical report
   means media/public accounts only, the count filters on `role: "VERIFIED"` and the Summary label
   should say so. Which is it?

7. **What is the retention period for deletion records?** The `deleted_account` table grows without
   bound. At annual-verification scale that is negligible, but if a retention policy applies to
   records of deleted accounts we need it specified — and note that purging rows removes the ability
   to report on those periods for good.

8. **Should the deleted-accounts data also appear as a tab in the "All Data" report?** #628 specifies
   four tabs. Adding a fifth is the consistent behaviour, but it changes the shape of a file that may
   already have downstream consumers who parse it. Confirm, or keep the deleted-accounts report
   standalone.

9. **Are English-only column headers in the `.xlsx` acceptable?** #628 already specifies English
   snake_case column names for the other tabs, and the workbook is a data artefact for analysts
   rather than a citizen-facing page. Only the web page would be bilingual. Confirm no Welsh-language
   workbook is required.

10. **Does a 7/14/21/30-day reporting window make sense for an annual event?** #628 builds the
    period selector as fixed 7/14/21/30-day windows. Annual verification runs once a year, so for
    roughly 335 days a year *every* one of those windows returns zero annual-verification deletions
    and the PM has no way to reach the run that matters. Options: (a) accept it and rely on
    downloading in the weeks after each run, (b) ask #628 to add a wider option or a custom
    from/to date range, or (c) have this report ignore the period and always return all runs. This
    needs deciding before Phase 2 — it may be a change request against #628 rather than this ticket.

11. **Should #351 be added to this issue's dependency list?** The issue names only #628, but #628 is
    the download page. The job that actually deletes non-re-verified accounts is
    [#351](https://github.com/hmcts/cath-service/issues/351) (Automated Inactive Accounts cron), and
    it is the ticket that must call
    `deleteUserById(userId, AccountDeletionReason.ANNUAL_VERIFICATION)`. Please confirm we can raise
    that contract on #351, and add #351 to #894's dependencies. Without it the annual-verification
    figure stays `0` indefinitely.

12. **Confirm the deletion record must exclude email, name and provenance ID — CaTH ID only.** For
    data minimisation this plan retains only the internal CaTH UUID plus non-identifying attributes
    (provenance, role, dates, reason). If the analytical report needs to correlate deleted accounts
    with anything outside CaTH, that changes the data-protection position and needs a decision from
    the information-governance owner, not just a code change. Is CaTH-ID-only sufficient?
