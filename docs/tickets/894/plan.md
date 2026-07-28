# Technical Plan — Issue #894: 'Deleted accounts' to be added to the MI Report

## 1. Summary

Add a **'Deleted accounts'** report type to the MI Report download, reporting three figures per
annual-verification deletion run: active accounts before deletion, accounts deleted, and the
difference.

The work splits into two independent parts:

| Part | Scope | Blocked? |
|---|---|---|
| **A — Persistence** | New `account_verification_run` table + repository + report generator | **No.** Deliverable now. |
| **B — UI wiring** | Add the option to the `/mi-report` "Select report type" control | **Yes** — `/mi-report` does not exist; owned by #628. |

Part A is the substance of this ticket and should be built first. Part B is a handful of lines
once #628 lands.

---

## 2. Verified state of the codebase

These four facts were confirmed against `master` (`d9320ea`) and materially change the approach.

### 2.1 There is no MI Report page

No `mi-report` route exists anywhere. `apps/web/src/pages/(system-admin)/` contains 78 page
directories; none is `mi-report`. `apps/web/src/pages/(system-admin)/system-admin-dashboard/en.ts`
lists **10** tiles, none of them an MI report. Grep for `mi report|mi-report|miReport` across
`apps`, `libs` and `e2e-tests` returns nothing.

The AC is written as though the "Download MI Report" tab already exists. It does not. #628
("MI Report Download - System Admin Dashboard", **OPEN**, no branch, no PR) owns creating it.

### 2.2 #628's design conflicts with this ticket's AC

This is the most important finding and needs a product decision before Part B is built.

| Concern | This ticket (#894) AC | #628 AC |
|---|---|---|
| Report type control | "**drop down** options" | **Radio buttons** (User Accounts / Publications / Location Subscriptions / All Subscriptions / All Data) |
| Period control | "the selected report **duration**" (unspecified) | **Radios**: 7 / 14 / 21 / 30 days |
| File format | Unspecified | **`.xlsx`** via `exceljs`, `mi-report-{type}-{days}days-{YYYY-MM-DD}.xlsx` |
| Data source | Deletion-run counts | Live `user` / `artefact` / `subscription` queries |

Two consequences:

1. **The control type must be reconciled.** #628 builds radios; #894 asks for a dropdown. With
   6 report types a `govukRadios` set is the better GDS choice anyway (the Design System says to
   use `select` only as a last resort). Recommendation: **follow #628 and use radios**, and treat
   the AC's word "drop down" as loose phrasing. Needs PM sign-off — see §7 Q1.

2. **A 7–30 day window will almost always return zero rows.** Annual verification runs once per
   year. Under #628's period model, a 'Deleted accounts' report is empty for ~335 days of the
   year. This is not a bug in either ticket — it is a genuine incompatibility between an
   annual event and a monthly-max window. Either #628's period options gain a longer range
   (12 months / financial year / all time) when 'Deleted accounts' is selected, or the report is
   always "all runs to date". See §7 Q2.

### 2.3 Account deletion is destructive — the report cannot be derived from current data

`libs/postgres-prisma/prisma/schema/base.prisma:48` — the `User` model:

```prisma
model User {
  userId           String    @id @default(uuid()) @map("user_id") @db.Uuid
  email            String    @db.VarChar(255)
  userProvenance   String    @map("user_provenance")
  userProvenanceId String    @unique @map("user_provenance_id")
  role             String    @db.VarChar(20)
  createdDate      DateTime  @default(now()) @map("created_date")
  lastSignedInDate DateTime? @map("last_signed_in_date")
  ...
}
```

No `deletedAt`, no `lastVerifiedDate`, no deletion-history relation.
`deleteUserById` (`libs/system-admin-pages/src/user-management/queries.ts:107`) calls
`prisma.user.delete` — a hard delete. Once an account is gone there is **no** trace it existed.

Therefore **no query over the current schema can produce any of the three required figures.**
Not the deleted count, and certainly not "active accounts prior to the deletion". A new
persistence structure is unavoidable. That is Part A.

### 2.4 The audit log is not a usable source

`AuditLog` (`libs/postgres-prisma/prisma/schema/audit-log.prisma`) records
`AuditLogAction.DELETE_USER = "Delete user"`, but:

* only for **manual** System Admin deletions via `/delete-user-confirm/[userId]`, attributed to
  the acting admin's `userId`;
* the automated verification job has no System Admin actor;
* it holds no "active accounts before deletion" figure at all.

Counting `DELETE_USER` rows would conflate manual deletions with verification deletions and still
leave two of three figures unobtainable.

### 2.5 The real data-producing dependency is #351, not #628

The issue names #628 as the blocker. #628 is the **download page** — correct for Part B. But the
job that actually deletes non-re-verified accounts is
**[#351 — CaTH Cron Trigger - Automated Inactive Accounts](https://github.com/hmcts/cath-service/issues/351)** (OPEN):

> Media users who have not verified their account for 350 days receive a verification email.
> Media users who remain unverified for 365 days are automatically deleted.

**#351 is the ticket that must call `recordVerificationRun()`.** Related siblings: #895 (T&Cs
wording), #896 (deletion notification email). None of them currently exist in code.

So this ticket has two dependencies, and the issue only names one. Flagged in §7 Q3.

### 2.6 Patterns to follow

| Concern | Reference |
|---|---|
| CSV generation + download | `libs/system-admin-pages/src/reference-data-upload/services/download-service.ts` (Papa `unparse`) + `apps/web/src/pages/(system-admin)/reference-data-download/index.ts` |
| Excel generation | `libs/excel-generation/` (`exceljs` `4.4.0`) |
| Date-range parse/validate | `apps/web/src/pages/(system-admin)/audit-log-list/index.ts`; `parseDate` at `libs/web-core/src/utils/date-utils.ts:25` |
| Role guard | `requireRole([USER_ROLES.SYSTEM_ADMIN])` from `@hmcts/auth` |
| Repository → service → controller | `libs/system-admin-pages/src/audit-log/{repository,service}.ts` |
| Auditing an admin action | `req.auditMetadata` consumed by `auditLogMiddleware()` |

Note: `exceljs` is **not** currently a dependency of `@hmcts/system-admin-pages`
(deps are `papaparse 5.5.4` + workspace packages). #628 already owns adding it.

---

## 3. Technical approach

### 3.1 Architecture decision — store the aggregate, derive the difference

A single row per verification run holding two stored counts:

```
Verification job (#351)
   │
   ├─ 1. count active media accounts            ──┐
   ├─ 2. delete accounts unverified for 365 days   │  same transaction
   ├─ 3. count how many were deleted               ├─► recordVerificationRun()
   └─ 4. commit                                 ──┘        │
                                                           ▼
                                            account_verification_run row
                                                           │
                                                           ▼
                                              'Deleted accounts' MI report
```

* `activeAccountsBefore` and `accountsDeleted` are **stored**. Neither is recomputable after the
  fact, because deletion is destructive.
* The **difference is not stored** — it is `activeAccountsBefore - accountsDeleted`, computed in
  the service. Storing a derivable value invites drift.
* No `activeAccountsAfter` column, for the same reason.

**Rejected alternative — one row per deleted account.** More flexible, and would also serve #896's
email notifications. Rejected on YAGNI: the AC needs only three aggregate numbers, and per-account
rows would retain personal data (email, provenance ID) about accounts that were deliberately
deleted — a data-protection liability created for no stated requirement.

### 3.2 Layering

Part A lives entirely in `libs/system-admin-pages/src/mi-report/`, with no `apps/` code, so it is
testable and mergeable before #628 exists.

---

## 4. Implementation details

### 4.1 File-by-file

| # | Layer | File | Change |
|---|---|---|---|
| 1 | Schema | `libs/postgres-prisma/prisma/schema/account-verification.prisma` | **New** — `AccountVerificationRun` model |
| 2 | Migration | `apps/postgres/prisma/migrations/<ts>_add_account_verification_run/` | **New** — generated by `yarn db:migrate:dev` |
| 3 | Repository | `libs/system-admin-pages/src/mi-report/deleted-accounts-repository.ts` | **New** — range query + run recording |
| 4 | Service | `libs/system-admin-pages/src/mi-report/deleted-accounts-report.ts` | **New** — build report rows |
| 5 | Registry | `libs/system-admin-pages/src/mi-report/report-types.ts` | **New** — report type slug constants |
| 6 | Exports | `libs/system-admin-pages/src/index.ts` | Export 3–5 |
| 7 | Audit | `libs/system-admin-pages/src/audit-log/logger.ts` | Add `DOWNLOAD_MI_REPORT = "Download MI report"` |
| 8 | Page *(Part B)* | `apps/web/src/pages/(system-admin)/mi-report/{index.ts,index.njk,en.ts,cy.ts}` | Extend #628's page with the new option |
| 9 | E2E | `e2e-tests/tests/system-admin/mi-report.spec.ts` | Extend #628's journey test |

Items 1–7 are **not blocked**. Items 8–9 are.

### 4.2 Schema — `account-verification.prisma`

Per the project convention, all schemas live in `libs/postgres-prisma/prisma/schema/`, one file
per domain. Tables singular snake_case via `@@map`; fields camelCase with `@map`.

```prisma
// libs/postgres-prisma/prisma/schema/account-verification.prisma

model AccountVerificationRun {
  id                   String   @id @default(uuid()) @db.Uuid
  runDate              DateTime @map("run_date") @db.Date
  activeAccountsBefore Int      @map("active_accounts_before")
  accountsDeleted      Int      @map("accounts_deleted")
  createdAt            DateTime @default(now()) @map("created_at")

  @@index([runDate])
  @@map("account_verification_run")
}
```

Design notes:

* `runDate` is `@db.Date`, not a timestamp. The report is reported by day and the range filter is
  inclusive of whole days; a date column avoids the timezone-boundary handling that
  `audit-log/repository.ts` needs for its timestamp filter.
* `runDate` is deliberately **not** `@unique`. A run could legitimately be re-executed after a
  partial failure, or straddle midnight. A unique constraint would turn an operational retry into
  a crash inside #351's job.
* No FK to `user` — the referenced accounts no longer exist by the time the row is written.
* Aggregate counts only, no personal data. See §7 Q7 on retention.

Run `yarn db:migrate:dev` then `yarn db:generate`. No seed data — this table is transactional, not
reference data, so `list-type-data.ts` / `location-data.ts` are not involved.

### 4.3 Repository — `deleted-accounts-repository.ts`

```typescript
import { prisma } from "@hmcts/postgres-prisma";

export async function findVerificationRunsInRange(from: Date, to: Date): Promise<VerificationRun[]> {
  return prisma.accountVerificationRun.findMany({
    where: { runDate: { gte: from, lte: to } },
    orderBy: { runDate: "asc" }
  });
}

export async function recordVerificationRun(input: RecordVerificationRunInput): Promise<void> { ... }

export interface VerificationRun { ... }
export interface RecordVerificationRunInput {
  runDate: Date;
  activeAccountsBefore: number;
  accountsDeleted: number;
}
```

* Both range bounds inclusive.
* `recordVerificationRun` is the **write side, called by #351**. It is specified and shipped here
  because the schema is introduced here; the caller belongs to #351. This function is the
  integration contract between the two tickets.
* Types are colocated in this file — the project forbids `types.ts` files. Interfaces go at the
  bottom per the module-ordering convention.
* Prisma parameterises everything; no string interpolation into SQL.

### 4.4 Service — `deleted-accounts-report.ts`

```typescript
export async function buildDeletedAccountsReport(from: Date, to: Date): Promise<DeletedAccountsRow[]>
```

Returns **structured rows, not a serialised string.** This is the key decision that decouples
Part A from #628: whether the download is CSV or `.xlsx` is #628's concern, and returning rows
means Part A does not need to know. If the report were to serialise its own CSV, this ticket would
be betting on a format #628 has already decided against.

Behaviour:

1. Fetch runs in range via the repository.
2. Map each run to a row, computing `difference = activeAccountsBefore - accountsDeleted`.
3. Format `reportDate` as `dd/mm/yyyy`, matching `formatTimestamp` in
   `libs/system-admin-pages/src/audit-log/service.ts`.
4. Append a totals row summing `accountsDeleted`.
   `activeAccountsBefore` and `difference` are **blank** on the totals row — summing point-in-time
   snapshots across separate annual runs produces a number with no meaning, and a blank cell is
   safer than a misleading one. Confirm against the mock-up (§7 Q4).
5. An empty range yields just the totals row of `0`. **This is not an error state** — a PM must be
   able to tell "nothing happened" apart from "the report is broken".

Column headers are machine-facing extract identifiers and stay English/uppercase in both locales,
matching `generateReferenceDataCsv` (`LOCATION_ID`, `WELSH_LOCATION_NAME`):

| Header | Meaning |
|---|---|
| `REPORT_DATE` | Date the verification run completed, `dd/mm/yyyy` |
| `ACTIVE_ACCOUNTS_BEFORE_DELETION` | Active accounts immediately before that run's deletions |
| `ACCOUNTS_DELETED` | Accounts deleted by that run |
| `DIFFERENCE` | `ACTIVE_ACCOUNTS_BEFORE_DELETION` − `ACCOUNTS_DELETED` |

Shape:

```
REPORT_DATE,ACTIVE_ACCOUNTS_BEFORE_DELETION,ACCOUNTS_DELETED,DIFFERENCE
01/04/2026,15230,412,14818
01/04/2027,14990,378,14612
Total,,790,
```

Plain exported functions, no class — no shared state.

### 4.5 Report type registry — `report-types.ts`

```typescript
export const MI_REPORT_TYPES = {
  DELETED_ACCOUNTS: "deleted-accounts"
} as const;
```

Keyed on a **stable string slug**, never a numeric ID — the same reasoning that governs
`listTypeName` throughout this codebase. #628 will own the full registry; this ticket adds one
entry. The submitted value must be validated against the registry **before** dispatch, never used
to index a lookup unguarded.

### 4.6 Audit action

Add to the `AuditLogAction` enum (`libs/system-admin-pages/src/audit-log/logger.ts:3`), keeping
alphabetical order and the existing human-readable value style:

```typescript
DOWNLOAD_MI_REPORT = "Download MI report",
```

If #628 adds the same member, keep theirs and drop this — a duplicate enum member is a compile
error.

### 4.7 Part B — UI wiring (blocked on #628)

Once `/mi-report` exists, this ticket contributes only:

1. A `deletedAccounts` entry in the report-type items array in `en.ts` **and** `cy.ts`
   (`"Deleted accounts"` / `[WELSH TRANSLATION REQUIRED: 'Deleted accounts']`).
2. A registry entry dispatching `MI_REPORT_TYPES.DELETED_ACCOUNTS` to
   `buildDeletedAccountsReport`, plus its sheet/filename.
3. `req.auditMetadata` set with `AuditLogAction.DOWNLOAD_MI_REPORT` **before** the response is
   sent — `auditLogMiddleware` wraps `res.send`, so metadata assigned afterwards is lost.

No new template, no new route, no new dashboard tile — all of that is #628's. **Do not create a
second `/mi-report` page**; the two tickets would collide on the route and on the dashboard tile.

---

## 5. Error handling & edge cases

| Case | Handling |
|---|---|
| No runs in range | Valid report: header + zero totals row. Not an error. |
| Range boundaries | `gte`/`lte` — a run exactly on `from` or `to` is included. |
| Run with `accountsDeleted = 0` | Renders `0`, never blank or `NaN`. |
| `accountsDeleted > activeAccountsBefore` | Data defect in #351, not this report's to fix. Render the negative difference honestly rather than clamping — silently hiding it would mask the upstream bug. |
| Duplicate `runDate` rows | Both rendered as separate rows; `runDate` is intentionally non-unique. |
| Unknown report type submitted | Validated against `MI_REPORT_TYPES` before dispatch; treated as "not selected". Only reachable by tampering. |
| Repository throws | Propagate — do **not** return a partial report. The controller (#628's) renders `errors/500`, logs server-side, and leaks no database detail. |
| Non-System-Admin access | Existing `requireRole` guard on #628's page. No bespoke message. |
| Historical runs | **Cannot be backfilled.** Deletion is destructive; pre-deployment runs left no trace. The report covers runs from deployment onwards only. See §7 Q6. |
| Manual admin deletions | Excluded by design. The AC says "from the annual verification process". This means the report is *not* a complete picture of account deletion — see §7 Q5. |

### Validation (Part B, follows #628's shape)

If #628 ships date-range inputs, validation goes in
`libs/system-admin-pages/src/mi-report/validation.ts` as pure functions returning
`ValidationError[]`, mirroring `user-management/validation.ts`:

* Report type required and present in `MI_REPORT_TYPES`.
* Each date: required; specific incomplete-part errors for missing day / month / year; invalid for
  non-numeric, non-4-digit year, or an impossible calendar date (31 February).
* Cross-field: end date not before start date. Suppressed when either date failed to parse —
  otherwise the user gets a confusing third error stacked on two parse failures.
* Reuse `parseDate` from `@hmcts/web-core` (`libs/web-core/src/utils/date-utils.ts:25`). It builds
  with `Date.UTC` and rejects rollover. Do not hand-roll date parsing.
* Accumulate all errors in one pass so a user with two mistakes sees both.
* Range size unbounded — this table gains roughly one row per year, so a cap would be invented
  complexity.

If #628 ships fixed-period radios instead, this validation is unnecessary and only §7 Q2 matters.

---

## 6. Acceptance criteria mapping

| AC | Satisfied by | Verification | Blocked? |
|---|---|---|---|
| 'Deleted accounts' option in 'Select report type' | §4.7 items 1–2 | Template test asserts the option renders in `en` and `cy`; E2E selects it | **Yes — #628** |
| Backend supports generating the report | §4.2–4.5 | Unit tests on repository + service | No |
| Report contains active-before, deleted, and difference for the selected duration | §4.4 columns; `difference` computed | Service unit tests assert all four columns, per-run rows, and totals | No *(for the numbers to be non-zero, #351 must call `recordVerificationRun`)* |
| Dependent on #628 | Acknowledged; Part A/B split so Part A ships independently | — | Partially |

**Honest limitation:** with Part A merged and #351 not yet shipped, the report is structurally
correct and returns zero rows. It becomes meaningful only when #351 populates the table. That is
the nature of the stated dependency, not a defect in this plan.

---

## 7. CLARIFICATIONS NEEDED

### Blocking

**Q1 — Dropdown or radios?** This ticket's AC says "'Select report type' **drop down**". #628
specifies **radio buttons**. The GOV.UK Design System says to use `select` only as a last resort,
and with 6 options radios are the better choice. Confirm we follow #628's radios and treat "drop
down" as loose phrasing — otherwise #628 needs reworking.

**Q2 — What is "the selected report duration" for an annual event?** #628 offers 7 / 14 / 21 /
30 days. Annual verification runs **once a year**, so a 'Deleted accounts' report over any of those
windows is empty for roughly 335 days out of 365. Options:
&nbsp;&nbsp;(a) add a longer period option (12 months / financial year / all time);
&nbsp;&nbsp;(b) give 'Deleted accounts' a start/end date range instead of the fixed periods;
&nbsp;&nbsp;(c) always return all runs to date and ignore the period.
This is a product decision and it changes #628's page. **(a) or (b) is recommended; (c) contradicts
the AC's "for the selected report duration".**

**Q3 — Who writes the run record?** The issue names #628 as the dependency, but #628 is only the
download page. The job that deletes non-re-verified accounts is
**[#351](https://github.com/hmcts/cath-service/issues/351)**. #351 must call
`recordVerificationRun()` **inside the same transaction as the deletions**, capturing the
active-account count *before* any row is removed. If #351 ships without that call, this report
returns zeroes forever. Needs explicit agreement on #351 and its dependency list updating.

**Q4 — The mock-up has not been read.** `Deleted accounts MI Report Mock-up.docx` could not be
retrieved in this environment. Column order, header wording, date format, whether a totals row is
wanted, and whether the totals row's snapshot columns are blank are all inferred from the AC and
repository convention. Please confirm — or paste the mock-up's table into a comment.

**Q5 — Which accounts does "total number of active accounts" count?** The `user` table holds
`VERIFIED`, `SYSTEM_ADMIN`, `INTERNAL_ADMIN_CTSC` and `INTERNAL_ADMIN_LOCAL` roles. Annual
verification applies to **media** accounts. If the PM wants the figure scoped to verified media
accounts only, that scoping belongs in **#351's counting logic**, not in this report — the report
renders whatever number the job stored. This decides the meaning of every figure in the report, so
it must be settled on #351.

### Non-blocking, for the record

**Q6 — No historical backfill is possible.** Because deletion is a hard delete with no audit
trail, verification runs that happened before this table exists left no recoverable trace. The
report will only ever cover runs from deployment onwards. If the analytical report needs prior-year
figures, they must come from outside the system.

**Q7 — Manual deletions are excluded.** Accounts a System Admin deletes via `/manage-user` are not
verification-driven and will not appear. Correct per the AC's wording, but it means this report is
not a complete picture of account deletion — worth stating so the analytical report is not
mislabelled.

**Q8 — Provenance is not broken out.** No split by `userProvenance` (B2C vs PI_AAD). If that split
is needed, the table needs extra columns and #351 needs to count per provenance. Say so now if so;
it is cheap to add before the migration exists and expensive after.

**Q9 — Retention.** `account_verification_run` holds aggregate counts and no personal data, so it
sits outside data-subject deletion obligations and can be retained indefinitely. Confirm with the
information-governance owner if MI retention is formally bounded.

**Q10 — Pre-existing E2E defect.** `e2e-tests/tests/system-admin/system-admin-dashboard.spec.ts`
asserts `toHaveCount(9)` in three places against a page rendering **10** tiles, and the suite is
`test.describe.skip`-ed so the drift is invisible. #628 adds an 11th tile. Recommend #628 fixes the
assertion — ideally deriving the count from the content file rather than hardcoding it — rather
than propagating it.

---

## 8. Testing

### Unit — repository (`deleted-accounts-repository.test.ts`, `prisma` mocked)
* Queries with inclusive `gte`/`lte` `runDate`, ordered `asc`
* Returns runs falling exactly on both range boundaries
* Returns an empty array when no runs fall in the range
* `recordVerificationRun` persists the supplied before-count and deleted-count

### Unit — service (`deleted-accounts-report.test.ts`, repository mocked)
* Emits the four columns in the documented order
* One row per run, ascending by date
* `difference` = before − deleted
* `reportDate` formatted `dd/mm/yyyy`
* Totals row sums `accountsDeleted`, leaves snapshot columns blank
* Empty range → totals row of `0`, no throw
* A run with `accountsDeleted = 0` renders `0`, not blank or `NaN`
* Propagates a repository failure rather than returning partial rows

### Migration
* Applies cleanly on a database with existing data, without touching `user`
* `yarn db:generate` exposes `prisma.accountVerificationRun`

### Part B (blocked on #628)
* Template test: the "Deleted accounts" option renders, in `en` and in `cy`
* Locale parity: `expect(Object.keys(en).sort()).toEqual(Object.keys(cy).sort())`, including
  nested objects
* Controller test: selecting `deleted-accounts` dispatches to `buildDeletedAccountsReport`, sets
  `req.auditMetadata` with `DOWNLOAD_MI_REPORT` before responding, and renders `errors/500` on
  generation failure
* **Extend #628's single E2E journey test** — do not add a new spec file. Per the project's
  minimise-test-count rule, add to that one journey: select 'Deleted accounts', download, assert
  the filename and the seeded run's figures, with the Axe and Welsh checks already inline.

All tests use Vitest, co-located, Arrange-Act-Assert.

---

## 9. Recommended sequencing

1. **Now (unblocked):** schema + migration + repository + service + audit enum + unit tests. Merge
   independently of #628.
2. **Answer Q1–Q5**, especially Q2 (period model) and Q3 (#351 writes the record).
3. **On #351:** add the `recordVerificationRun()` call inside the deletion transaction.
4. **On #628 landing:** add the report-type option, locale strings, registry dispatch and audit
   metadata; extend the existing E2E journey.
