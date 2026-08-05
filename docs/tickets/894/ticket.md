# #894: ‘Deleted accounts’ to be added to the MI Report

**State:** OPEN
**Assignees:** 
**Author:** OgechiOkelu
**Labels:** 
**Created:** 2026-07-28T13:38:50Z
**Updated:** 2026-08-05T11:34:34Z

## Description

**PROBLEM STATEMENT**

Following the annual verification process of CaTH accounts, accounts that are not re-verified by CaTH users are deleted. Currently, the System Admin dashboard supports the download of the MI Report. However, there is a need for additional options to generate a report on the number of deleted accounts.

 
 

**AS A** Product Manager

**I WANT** to generate a report on the number of deleted accounts

**SO THAT** I can include the data in the analytical report

 

**ACCEPTANCE CRITERIA**
- In the ‘Download MI Report’ tab, another option titled ‘Deleted accounts’ is included in the ‘Select report type’ drop down options.
Backend changes are implemented to support the generation of the ‘Deleted accounts’ report.
The 'Deleted accounts' report should contain the total number of all deleted CaTH accounts and their CaTH IDs for the selected report duration.
- The implementation of this requirement is dependent on https://github.com/hmcts/cath-service/issues/628 
[Deleted accounts MI Report Mock-up.docx](https://github.com/user-attachments/files/30464146/Deleted.accounts.MI.Report.Mock-up.docx)


## Comments

### Comment by OgechiOkelu on 2026-08-05T11:25:57Z

@SPEC

---

### Comment by hmctsclaudecode on 2026-08-05T11:33:34Z

# Technical Specification — Issue #894: 'Deleted accounts' to be added to the MI Report

## 1. User Story

**As a** Product Manager
**I want to** generate a report on the number of deleted accounts
**So that** I can include the data in the analytical report

## 2. Background

Following the annual verification process of CaTH accounts, accounts that are not re-verified by their owners are deleted. The System Admin Dashboard supports downloading an MI Report, and this ticket adds a further report type covering deleted accounts.

### Dependency: issue #628 (MI Report Download)

This work is **blocked by** [#628](https://github.com/hmcts/cath-service/issues/628), which is not yet implemented. There is currently no `/mi-report` page, no report-type selector, and no MI report generation code anywhere in the repository (verified: no matches for `mi-report`, `miReport`, or `Download MI Report` outside the requirements database).

Issue #628 (`REQ-0345`, status `approved`) specifies:

* A `Download MI Report` tile on the System Admin Dashboard, `SYSTEM_ADMIN`-only.
* A page at `/mi-report` with a **reporting period** selector (7 / 14 / 21 / 30 days) and a **report type** selector (User Accounts, Publications, Location Subscriptions, All Subscriptions, All Data).
* `.xlsx` generation via `exceljs`, streamed directly with no intermediate storage.
* File naming `mi-report-{type}-{days}days-{YYYY-MM-DD}.xlsx`.
* Welsh support via `?lng=cy`.

This specification is written as a **delta on top of #628** and assumes those foundations exist. Where #628's shape is assumed, it is called out explicitly.

### The blocking data problem

**Deleted accounts leave no trace in the database today.** `deleteUserById` in `libs/system-admin-pages/src/user-management/queries.ts` performs a hard delete inside a transaction:

```typescript
await tx.notificationAuditLog.deleteMany({ where: { subscriptionId: { in: subscriptionIds } } });
await tx.subscription.deleteMany({ where: { userId } });
await tx.user.delete({ where: { userId } });
```

The `User` model in `libs/postgres-prisma/prisma/schema/base.prisma` has no `deletedAt` column. Once a row is gone, its CaTH ID is unrecoverable — the `audit_log` table records a free-text `details` string (`User: {email}`) for the `Delete user` action, but not the user ID in a queryable column, and it is only written for System Admin manual deletions.

**Therefore this ticket cannot be delivered by adding a query over existing data. It requires a new persistence record written at deletion time.** That new table is the substance of the backend work below.

### Related, not-yet-built work

* [#895](https://github.com/hmcts/cath-service/issues/895) — verification requirement added to account creation T&Cs.
* [#896](https://github.com/hmcts/cath-service/issues/896) — email notification on account deletion.
* The **annual verification deletion job itself does not exist**. `apps/crons` contains only `example.ts`. This spec defines the deletion-record contract that the future job must write to, and delivers the report over whatever records exist.

## 3. Acceptance Criteria

* **Scenario:** Deleted accounts appears as a report type option
    * **Given** I am signed in as a `SYSTEM_ADMIN` and I am on `/mi-report`
    * **When** the page renders
    * **Then** a `Deleted accounts` option appears in the report type list, with the hint `Accounts deleted following the annual verification process`

* **Scenario:** Download a Deleted accounts report with data
    * **Given** three accounts were deleted by the annual verification process 5 days ago
    * **And** I have selected reporting period `7 days` and report type `Deleted accounts`
    * **When** I select `Download report`
    * **Then** an `.xlsx` file named `mi-report-deleted-accounts-7days-{YYYY-MM-DD}.xlsx` downloads
    * **And** the workbook contains a `Summary` sheet and a `Deleted Accounts` sheet
    * **And** the `Deleted Accounts` sheet contains one row per deleted account with its CaTH ID

* **Scenario:** Summary figures are correct
    * **Given** 3 accounts were deleted by annual verification inside the reporting period and 250 accounts remain active
    * **When** I download the `Deleted accounts` report
    * **Then** the `Summary` sheet reports `Deleted accounts (annual verification)` as `3`
    * **And** `Active accounts prior to deletion` as `253`
    * **And** `Active accounts after deletion` as `250`

* **Scenario:** Deletions outside the reporting period are excluded
    * **Given** one account was deleted 3 days ago and another 40 days ago
    * **When** I download the `Deleted accounts` report for a `7 days` period
    * **Then** only the account deleted 3 days ago appears, and the deleted count is `1`

* **Scenario:** Manual System Admin deletions are counted separately
    * **Given** 2 accounts were deleted by annual verification and 1 was deleted manually by a System Admin inside the reporting period
    * **When** I download the `Deleted accounts` report
    * **Then** `Deleted accounts (annual verification)` is `2`
    * **And** `Deleted accounts (System Admin)` is `1`
    * **And** all 3 rows appear on the `Deleted Accounts` sheet with a `Deletion reason` column distinguishing them

* **Scenario:** No deletions in the period
    * **Given** no accounts were deleted in the last 7 days
    * **When** I download the `Deleted accounts` report for a `7 days` period
    * **Then** the workbook downloads successfully with a populated `Summary` sheet showing `0` deletions
    * **And** the `Deleted Accounts` sheet contains only the header row

* **Scenario:** Deleted accounts included in All Data
    * **Given** I select report type `All Data`
    * **When** I download the report
    * **Then** the workbook contains a `Deleted Accounts` tab in addition to the four tabs defined by #628

* **Scenario:** Report type is required
    * **Given** I am on `/mi-report` and have selected a reporting period but no report type
    * **When** I select `Download report`
    * **Then** the page re-renders with an error summary containing `Select a report type`
    * **And** my reporting period selection is preserved

* **Scenario:** Welsh language
    * **Given** I visit `/mi-report?lng=cy`
    * **When** the page renders
    * **Then** the `Deleted accounts` option label and hint appear in Welsh

* **Scenario:** Access control
    * **Given** I am signed in as a `VERIFIED` user
    * **When** I request `POST /mi-report` with `reportType=deleted-accounts`
    * **Then** I receive a `403` and no report is generated

* **Scenario:** A deletion writes a durable record
    * **Given** a System Admin deletes a user through `/delete-user-confirm/{userId}`
    * **When** the deletion transaction commits
    * **Then** a `deleted_account` row exists containing that user's CaTH ID, role, provenance, created date, last signed-in date, deletion date and reason `SYSTEM_ADMIN`
    * **And** the row contains no email address, name or provenance ID

## 4. User Journey Flow

```
System Admin Dashboard
        │
        │ selects "Download MI Report" tile
        ▼
GET /mi-report  ──────────────────────────────┐
        │                                     │
        │ selects "30 days"                   │ validation fails
        │ selects "Deleted accounts"          │ (missing selection)
        │ selects "Download report"           │
        ▼                                     │
POST /mi-report                               │
        │                                     │
        ├── invalid ──────────────────────────┘
        │   (re-render with error summary,
        │    preserving selections)
        │
        └── valid
            │
            ▼
        countActiveAccounts()
        findDeletedAccountsSince(cutoff)
            │
            ▼
        generateDeletedAccountsWorkbook()
            │
            ▼
        stream .xlsx  ─── stays on /mi-report,
                          browser handles download
```

Data-flow for the record that makes the report possible:

```
┌──────────────────────────────┐      ┌──────────────────────────────┐
│ Annual verification cron     │      │ System Admin manual delete   │
│ (future — issue #896 sibling)│      │ /delete-user-confirm/{id}    │
└──────────────┬───────────────┘      └──────────────┬───────────────┘
               │                                     │
               │  reason: ANNUAL_VERIFICATION         │ reason: SYSTEM_ADMIN
               └──────────────┬──────────────────────┘
                              ▼
                 deleteUserById(userId, reason)
                 ── single Prisma transaction ──
                   1. INSERT deleted_account
                   2. DELETE notification_audit_log
                   3. DELETE subscription
                   4. DELETE user
                              │
                              ▼
                     deleted_account table
                              │
                              ▼
                  MI Report "Deleted accounts"
```

## 5. Low Fidelity Wireframe

### `/mi-report` — report type list with the new option

```
┌────────────────────────────────────────────────────────────────────┐
│  GOV.UK  Court and Tribunal Hearings                               │
├────────────────────────────────────────────────────────────────────┤
│  < Back                                                            │
│                                                                    │
│  Download MI Report                                                │
│  ═══════════════════                                               │
│                                                                    │
│  Reporting period                                                  │
│  How many days of data do you want to include?                     │
│                                                                    │
│   ( ) 7 days                                                       │
│   ( ) 14 days                                                      │
│   ( ) 21 days                                                      │
│   (o) 30 days                                                      │
│                                                                    │
│  Report type                                                       │
│  Select the data you want to download                              │
│                                                                    │
│   ( ) User Accounts                                                │
│       User account data including provenance and roles             │
│   ( ) Publications                                                 │
│       NoMatch publications with court and list type data           │
│   ( ) Location Subscriptions                                       │
│       Subscriptions by location with court names                   │
│   ( ) All Subscriptions                                            │
│       All subscriptions including search type                      │
│   (o) Deleted accounts                          ◄── NEW OPTION     │
│       Accounts deleted following the annual verification process   │
│   ( ) All Data                                                     │
│       All of the above in a single file with multiple tabs         │
│                                                                    │
│  ┌──────────────────┐                                              │
│  │ Download report  │                                              │
│  └──────────────────┘                                              │
└────────────────────────────────────────────────────────────────────┘
```

### Validation error state

```
┌────────────────────────────────────────────────────────────────────┐
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ There is a problem                                           │  │
│  │                                                              │  │
│  │  • Select a report type                                      │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                    │
│  Download MI Report                                                │
│  ═══════════════════                                               │
│  ...                                                               │
│  Report type                                                       │
│  Select the data you want to download                              │
│  │                                                                 │
│  │ Error: Select a report type                                     │
│  │  ( ) User Accounts                                              │
│  │  ...                                                            │
└────────────────────────────────────────────────────────────────────┘
```

### Downloaded workbook — `Summary` sheet

```
mi-report-deleted-accounts-30days-2026-08-05.xlsx
┌────────────────────────────────────────────────────┬───────────┐
│ Measure                                            │ Value     │
├────────────────────────────────────────────────────┼───────────┤
│ Reporting period (days)                            │ 30        │
│ Period start                                       │ 06/07/2026│
│ Period end                                         │ 05/08/2026│
│ Active accounts prior to deletion                  │ 253       │
│ Deleted accounts (annual verification)             │ 3         │
│ Deleted accounts (System Admin)                    │ 1         │
│ Deleted accounts (total)                           │ 4         │
│ Active accounts after deletion                     │ 249       │
└────────────────────────────────────────────────────┴───────────┘
 [ Summary ] [ Deleted Accounts ]
```

### Downloaded workbook — `Deleted Accounts` sheet

```
┌──────────────────────────┬───────────────┬────────┬─────────────┬─────────────────────┬──────────────┬──────────────────────┐
│ CaTH ID                  │ User provenance│ Role   │ Created date│ Last signed in date │ Deleted date │ Deletion reason      │
├──────────────────────────┼───────────────┼────────┼─────────────┼─────────────────────┼──────────────┼──────────────────────┤
│ 8f14e45f-ceea-467a-...   │ B2C_IDAM      │VERIFIED│ 12/03/2025  │ 04/07/2025          │ 21/07/2026   │ Annual verification  │
│ 3c59dc04-8e88-4650-...   │ B2C_IDAM      │VERIFIED│ 09/01/2025  │                     │ 21/07/2026   │ Annual verification  │
│ b6d767d2-f8ed-5d98-...   │ SSO           │VERIFIED│ 27/05/2025  │ 11/06/2026          │ 30/07/2026   │ System Admin         │
└──────────────────────────┴───────────────┴────────┴─────────────┴─────────────────────┴──────────────┴──────────────────────┘
```

Blank cell where `Last signed in date` is null — no placeholder text, so the column remains sortable and filterable in Excel.

## 6. Page Specifications

No new page is created. The change is one additional radio item on the existing `/mi-report` page from #628, plus new backend generation and persistence.

### 6.1 Database — new `DeletedAccount` model

`libs/postgres-prisma/prisma/schema/deleted-account.prisma` (new file, one schema per domain per the repo convention):

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

Design decisions:

* **Separate append-only table, not a `deletedAt` column on `user`.** Soft-deleting `user` would require every existing query in `libs/account`, `libs/system-admin-pages/src/user-management/queries.ts`, `libs/subscriptions` and the auth middleware to add `deletedAt: null`, and would collide with the `userProvenanceId @unique` constraint if a user re-registers with the same Azure B2C object ID. A dedicated table keeps the read paths untouched.
* **No email, name, or `userProvenanceId`.** The account has been deleted; retaining direct identifiers would defeat the deletion. The AC asks only for CaTH IDs and counts, so only the CaTH ID (`user_id`, a UUID with no external meaning) and non-identifying attributes are retained. This is a deliberate constraint, not an omission — see §14.
* **`userId` is `@unique`** so a re-run of the deletion job cannot double-count an account. Insert uses `create` inside the deletion transaction; a duplicate is a genuine error and should surface.
* **No FK to `user`** — the `user` row is deleted in the same transaction, so a relation would be immediately dangling.
* **`deletionReason` as a Prisma enum**, not a string, per the backend rules ("Don't use string literals for fields that should be enums").

New Prisma migration under `apps/postgres/prisma/migrations/20260805000000_add_deleted_account/`.

### 6.2 Write path — record the deletion

`libs/system-admin-pages/src/user-management/queries.ts` — extend `deleteUserById` to take a reason and write the record inside the existing transaction:

```typescript
export async function deleteUserById(userId: string, reason: AccountDeletionReason): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const user = await tx.user.findUniqueOrThrow({
      where: { userId },
      select: { userProvenance: true, role: true, createdDate: true, lastSignedInDate: true }
    });

    await tx.deletedAccount.create({
      data: { userId, ...user, deletionReason: reason }
    });

    // existing cascade: notification audit logs -> subscriptions -> user
  });
}
```

`reason` is a required parameter — there is no default. This forces every future caller (including the annual verification job) to state which process deleted the account, which is what the report distinguishes on.

Caller update: `apps/web/src/pages/(system-admin)/delete-user-confirm/[userId]/index.ts` passes `AccountDeletionReason.SYSTEM_ADMIN`. Its existing `req.auditMetadata` audit-log entry is unchanged.

### 6.3 Read path — query and service

`libs/system-admin-pages/src/mi-report/deleted-accounts-queries.ts` (new):

```typescript
export async function findDeletedAccountsSince(cutoff: Date): Promise<DeletedAccountRow[]>
export async function countDeletedAccountsSince(cutoff: Date): Promise<Record<AccountDeletionReason, number>>
export async function countActiveAccounts(): Promise<number>
```

* `findDeletedAccountsSince` — `prisma.deletedAccount.findMany({ where: { deletedDate: { gte: cutoff } }, orderBy: { deletedDate: "desc" }, select: {...} })`. Explicit `select`, no `include`, filtering and ordering at the database level per the backend rules.
* `countDeletedAccountsSince` — `prisma.deletedAccount.groupBy({ by: ["deletionReason"], where: { deletedDate: { gte: cutoff } }, _count: true })`, normalised to a record with `0` defaults so both reasons always appear on the Summary sheet.
* `countActiveAccounts` — `prisma.user.count()`.

`libs/system-admin-pages/src/mi-report/deleted-accounts-service.ts` (new) composes the three into a `DeletedAccountsReport` and derives the summary figures:

```
activeAfterDeletion  = countActiveAccounts()
deletedInPeriod      = annualVerification + systemAdmin
activePriorToDeletion = activeAfterDeletion + deletedInPeriod
```

`Active accounts prior to deletion` is **derived, not snapshotted**. It is exact when no accounts were created inside the reporting period; accounts created during the period inflate it. Recording a true point-in-time snapshot would require the annual verification job (not yet built) to write a run-level record. See §14 — this is the main open question on this ticket.

The three queries run concurrently via `Promise.all`.

### 6.4 Workbook generation

`libs/excel-generation/src/excel/deleted-accounts-excel-generator.ts` (new) — this lib already owns `exceljs` at pinned `4.4.0` and exports `generateSjpPublicListExcel` / `generateSjpPressListExcel`, so the MI report generators belong here rather than adding a second `exceljs` dependency to `libs/system-admin-pages` as #628's technical notes suggested.

```typescript
export function addDeletedAccountsSheets(workbook: ExcelJS.Workbook, report: DeletedAccountsReport): void
export async function generateDeletedAccountsExcel(report: DeletedAccountsReport): Promise<Buffer>
```

Splitting the sheet-building from the buffer-writing lets `All Data` call `addDeletedAccountsSheets` on the shared workbook without producing an intermediate file. Header and cell styling reuse the existing `HEADER_FONT`, `HEADER_FILL`, `HEADER_ALIGNMENT`, `DATA_FONT`, `DATA_ALIGNMENT` and `CELL_BORDER` constants from `libs/excel-generation/src/excel/excel-styles.ts`.

Column headers are constants in `libs/excel-generation/src/excel/excel-headers.ts` alongside the existing `SJP_*_HEADERS`. Headers stay **English only** — the workbook is a data artefact consumed by analysts, matching the column naming already specified in #628 (`user_id`, `provenance_user_id`, …). Only the web page is bilingual. Flagged in §14.

Dates render as `dd/MM/yyyy` strings, consistent with `formatTimestamp` in `libs/system-admin-pages/src/audit-log/service.ts`.

### 6.5 Controller changes

`apps/web/src/pages/(system-admin)/mi-report/index.ts` (created by #628):

* Add `deleted-accounts` to the accepted `reportType` values.
* `POST` branch delegates to the service, then the generator, then streams:

```typescript
res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
res.setHeader("Content-Disposition", `attachment; filename="mi-report-deleted-accounts-${days}days-${today}.xlsx"`);
res.send(buffer);
```

This matches the streaming pattern in `apps/web/src/pages/(system-admin)/reference-data-download/index.ts`. Guarded by `requireRole([USER_ROLES.SYSTEM_ADMIN])` as the first element of the exported `RequestHandler[]`.

No business logic in the controller — it validates, calls the service, and streams.

### 6.6 Files changed

| File | Change |
|---|---|
| `libs/postgres-prisma/prisma/schema/deleted-account.prisma` | New — `DeletedAccount` model, `AccountDeletionReason` enum |
| `apps/postgres/prisma/migrations/20260805000000_add_deleted_account/migration.sql` | New — generated via `yarn db:migrate:dev` |
| `libs/system-admin-pages/src/user-management/queries.ts` | `deleteUserById` takes `reason`, writes `deleted_account` in-transaction |
| `libs/system-admin-pages/src/user-management/queries.test.ts` | Cover the new record write and transaction rollback |
| `libs/system-admin-pages/src/mi-report/deleted-accounts-queries.ts` | New |
| `libs/system-admin-pages/src/mi-report/deleted-accounts-queries.test.ts` | New |
| `libs/system-admin-pages/src/mi-report/deleted-accounts-service.ts` | New |
| `libs/system-admin-pages/src/mi-report/deleted-accounts-service.test.ts` | New |
| `libs/system-admin-pages/src/index.ts` | Export the new service, queries and types |
| `libs/excel-generation/src/excel/deleted-accounts-excel-generator.ts` | New |
| `libs/excel-generation/src/excel/deleted-accounts-excel-generator.test.ts` | New |
| `libs/excel-generation/src/excel/excel-headers.ts` | Add `DELETED_ACCOUNTS_HEADERS`, `DELETED_ACCOUNTS_SUMMARY_LABELS` |
| `libs/excel-generation/src/index.ts` | Export the new generator functions |
| `apps/web/src/pages/(system-admin)/delete-user-confirm/[userId]/index.ts` | Pass `SYSTEM_ADMIN` reason |
| `apps/web/src/pages/(system-admin)/mi-report/index.ts` | Accept and handle `deleted-accounts`; add the tab to `All Data` |
| `apps/web/src/pages/(system-admin)/mi-report/en.ts` | New radio label + hint |
| `apps/web/src/pages/(system-admin)/mi-report/cy.ts` | Welsh label + hint |
| `apps/web/src/pages/(system-admin)/mi-report/index.test.ts` | Extend for the new report type |
| `apps/web/src/pages/(system-admin)/mi-report/index.njk.test.ts` | Assert the new radio renders in both locales |
| `e2e-tests/tests/system-admin/mi-report.spec.ts` | Extend the #628 journey to cover the new option |

No new lib is created — `@hmcts/system-admin-pages` and `@hmcts/excel-generation` both already exist and are registered, so there are no `tsconfig.json`, `vite.config.ts` or `app.ts` registration changes.

## 7. Content

### English — appended to `apps/web/src/pages/(system-admin)/mi-report/en.ts`

```typescript
reportTypes: {
  // ...existing entries from #628
  deletedAccounts: {
    label: "Deleted accounts",
    hint: "Accounts deleted following the annual verification process"
  }
}
```

### Welsh — appended to `apps/web/src/pages/(system-admin)/mi-report/cy.ts`

```typescript
reportTypes: {
  // ...existing entries from #628
  deletedAccounts: {
    label: "[TRANSLATE: \"Deleted accounts\"]",
    hint: "[TRANSLATE: \"Accounts deleted following the annual verification process\"]"
  }
}
```

The `cy` object must mirror `en` exactly; the template test asserts key parity with `expect(Object.keys(en.reportTypes).sort()).toEqual(Object.keys(cy.reportTypes).sort())`.

### Workbook content — English only

`libs/excel-generation/src/excel/excel-headers.ts`:

```typescript
export const DELETED_ACCOUNTS_HEADERS = {
  cathId: "CaTH ID",
  userProvenance: "User provenance",
  role: "Role",
  createdDate: "Created date",
  lastSignedInDate: "Last signed in date",
  deletedDate: "Deleted date",
  deletionReason: "Deletion reason"
};

export const DELETED_ACCOUNTS_SUMMARY_LABELS = {
  reportingPeriod: "Reporting period (days)",
  periodStart: "Period start",
  periodEnd: "Period end",
  activePriorToDeletion: "Active accounts prior to deletion",
  deletedAnnualVerification: "Deleted accounts (annual verification)",
  deletedSystemAdmin: "Deleted accounts (System Admin)",
  deletedTotal: "Deleted accounts (total)",
  activeAfterDeletion: "Active accounts after deletion"
};
```

Deletion reason display values: `ANNUAL_VERIFICATION` → `Annual verification`, `SYSTEM_ADMIN` → `System Admin`.

Sheet names: `Summary`, `Deleted Accounts`.

## 8. URL

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/mi-report` | Report selection page (existing, from #628) |
| `GET` | `/mi-report?lng=cy` | Welsh |
| `POST` | `/mi-report` | Generate and stream the report; `reportType=deleted-accounts` is the new accepted value |

No new route or page directory. `reportType` uses the kebab-case value `deleted-accounts` to match the `{type}` segment in #628's filename convention, giving `mi-report-deleted-accounts-30days-2026-08-05.xlsx`.

## 9. Validation

Server-side only, in the `POST` handler. `novalidate` on the form.

| Field | Rule |
|---|---|
| `reportingPeriod` | Required. Must be one of `7`, `14`, `21`, `30`. Any other value is treated as absent. |
| `reportType` | Required. Must be one of `user-accounts`, `publications`, `location-subscriptions`, `all-subscriptions`, `deleted-accounts`, `all-data`. Any other value is treated as absent. |

The allow-list on `reportType` is what makes the new value valid — an unrecognised value must not fall through to a default report or a 500. Both fields are validated on every submission, and on failure the page re-renders with both the error summary and the user's existing selections preserved.

No user-supplied value reaches a query. `days` is parsed to an integer from the allow-list and used only to compute `cutoff = new Date(Date.now() - days * 86_400_000)`; the Prisma `where` clause takes only that `Date`.

## 10. Error Messages

| Condition | Error summary / inline message |
|---|---|
| No reporting period selected | `Select a reporting period` |
| No report type selected | `Select a report type` |

Welsh:

| Condition | Message |
|---|---|
| No reporting period selected | `[WELSH TRANSLATION REQUIRED: "Select a reporting period"]` |
| No report type selected | `[WELSH TRANSLATION REQUIRED: "Select a report type"]` |

Error summary title: `There is a problem` / `Mae problem`.

Error summary items link to the first radio in the relevant group (`#reportingPeriod`, `#reportType`).

Failures that are not user error:

| Condition | Behaviour |
|---|---|
| Database unavailable during generation | Log with context, render `errors/500`. Do not send a partial file — build the whole buffer before setting any response header. |
| Workbook generation throws | Same as above. |
| Non-`SYSTEM_ADMIN` request | `requireRole` returns `403`; no report generated, nothing logged as a download. |

The empty-result case is **not** an error: zero deletions in the period produces a valid workbook with a populated `Summary` sheet and a header-only `Deleted Accounts` sheet. A Product Manager needs `0` as a reportable figure.

## 11. Navigation

* Entry: `Download MI Report` tile on `/system-admin-dashboard` (added by #628).
* Back link on `/mi-report` returns to `/system-admin-dashboard`, preserving `?lng=cy`.
* `POST /mi-report` returns a file attachment, not a redirect or render. The browser stays on `/mi-report`, so the user can immediately download a second report with different options — no confirmation page, matching the existing `reference-data-download` behaviour.
* Because the response is a download and not a state change, the standard post-redirect-get rule does not apply.
* `auditLogMiddleware` intercepts `res.send` on `POST` requests for `SYSTEM_ADMIN` users and will write an audit entry with the path-derived action `MI_REPORT`. This is existing behaviour from #628 and is desirable — downloads of user data should be traceable. Not a change in this ticket.

## 12. Accessibility

WCAG 2.2 AA. The new option is a standard `govukRadios` item, so it inherits the component's compliance; the requirements below are what must be verified rather than newly built.

* **Radio group semantics** — the new item is added to the existing `reportType` `govukRadios` call inside a `fieldset` whose `legend` is `Report type`. Do not introduce a second control or a `select`. Per the design rules, `select` is a last resort and radios are correct for a small single-choice set.
* **Hint association** — the hint text is passed via the macro's item `hint` property so `exceljs`-bound content is irrelevant and `aria-describedby` wires the hint to the input automatically.
* **Error state** — on validation failure the fieldset receives `errorMessage`, rendering the visually hidden `Error:` prefix and setting `aria-describedby` to include the error. The error summary is placed before the `h1`, receives focus on render, and each item links to the first radio in the group.
* **Heading hierarchy** — `h1` `Download MI Report`, fieldset legends as the section headings. No new heading level, no skipped level.
* **Page title matches `h1`.**
* **Keyboard** — arrow keys move within the radio group, `Tab` moves between groups and to the button, `Enter` submits. Adding a sixth radio changes tab order not at all; the group remains a single tab stop.
* **Target size** — untouched; GOV.UK radio labels exceed 44×44px.
* **Colour** — the error state is conveyed by the red bar, the `Error:` text prefix and the summary, not colour alone.
* **No JavaScript dependency** — the form is a native `POST` and the download is a normal HTTP response. Works fully with JS disabled.
* **Screen reader announcement** — verify the new option announces as `Deleted accounts, Accounts deleted following the annual verification process, radio button, 5 of 6`.
* **Downloaded file** — set a descriptive `Content-Disposition` filename (done) and give the header row on each sheet bold styling plus a frozen top row so the data is navigable with assistive technology in Excel.

Axe checks run inline within the E2E journey test, in both English and Welsh, in the default and error states.

## 13. Test Scenarios

### Unit — `deleteUserById` write path
* Deleting a user inserts a `deleted_account` row with the correct CaTH ID, provenance, role, created date, last signed-in date and the reason passed by the caller.
* The inserted row contains no email, name or provenance ID.
* A user with a null `lastSignedInDate` produces a record with a null `lastSignedInDate` rather than failing.
* When the `user` delete fails, the transaction rolls back and no `deleted_account` row remains.
* Deleting a user that does not exist rejects and writes nothing.
* The `SYSTEM_ADMIN` reason is recorded when called from the `delete-user-confirm` controller.

### Unit — queries
* `findDeletedAccountsSince` returns only records with `deletedDate >= cutoff`, ordered most-recent first.
* `findDeletedAccountsSince` returns an empty array when nothing matches.
* `countDeletedAccountsSince` returns a zero for a reason with no records, so both reasons always appear.
* `countActiveAccounts` returns the `user` row count.

### Unit — service
* Summary figures: `activePriorToDeletion` equals `activeAfterDeletion` plus total deletions in the period.
* Deletions are split correctly between the annual-verification and System Admin counts.
* Period start and end are computed from the selected day count.
* All three queries are issued concurrently.
* A period with zero deletions produces a report with zero counts and an empty row array, not a thrown error.

### Unit — workbook generator
* The workbook contains exactly two sheets named `Summary` and `Deleted Accounts`.
* The `Deleted Accounts` sheet has one row per deleted account plus a header row.
* Header cells carry the shared header font, fill and border styling.
* Dates render as `dd/MM/yyyy`; a null `lastSignedInDate` renders as an empty cell.
* `ANNUAL_VERIFICATION` renders as `Annual verification` and `SYSTEM_ADMIN` as `System Admin`.
* The `Summary` sheet contains all eight labelled measures with the expected values.
* Zero deleted accounts produces a header-only data sheet and a valid buffer.
* `addDeletedAccountsSheets` adds its sheets to a pre-existing workbook without disturbing sheets already present — the `All Data` path.

### Unit — controller
* `GET` renders the page with `en`, `cy` and the resolved `t`, including the new report-type entry.
* `POST` with `reportType=deleted-accounts` and a valid period sets `Content-Type` to the xlsx media type, sets `Content-Disposition` with the expected filename, and sends a buffer.
* `POST` with a missing report type re-renders with `Select a report type` and preserves the reporting period.
* `POST` with an unrecognised `reportType` value is rejected as a validation error, not silently defaulted.
* `POST` with `reportType=all-data` includes the deleted-accounts sheets in the workbook.
* A thrown service error renders `errors/500` and sends no partial file.
* `GET` and `POST` are both guarded by `requireRole([USER_ROLES.SYSTEM_ADMIN])`.

### Template — `index.njk.test.ts`
* The `reportType` radio group renders six items, and the sixth is `Deleted accounts`.
* The new item's hint text renders and is associated with its input.
* Rendering with the `cy` locale shows the Welsh label and hint.
* `en` and `cy` `reportTypes` key sets are identical.
* With errors present, the fieldset renders an error message and the error summary lists it; with no errors, neither is present.

### E2E — extend the #628 journey, `@nightly`
One journey test, not one per assertion:
* Sign in as System Admin → dashboard → `Download MI Report` tile.
* Submit with no report type selected; assert the `Select a report type` error summary appears and the period selection survived.
* Run an axe scan in the error state.
* Switch to Welsh, assert the Welsh `Deleted accounts` label renders, run an axe scan.
* Switch back to English, select `30 days` and `Deleted accounts`, navigate the radio group by keyboard, and submit with `Enter`.
* Assert the download event fires with a filename matching `mi-report-deleted-accounts-30days-\d{4}-\d{2}-\d{2}\.xlsx`.
* Assert a `VERIFIED` user requesting `/mi-report` receives a 403.

## 14. Assumptions & Open Questions

### Blocking

* **#628 must land first.** There is no `/mi-report` page, no report-type selector and no MI report generation code in the repository. This ticket is a delta and cannot start until #628 is merged. If #628 slips, the only part of this work that can proceed independently is §6.1 and §6.2 — the `deleted_account` table and the write path — which is worth doing early because **every account deleted before that table exists is permanently unreportable**. Recommend splitting the persistence change out and shipping it ahead of the reporting UI.

* **The acceptance criteria conflict between two sources.** The GitHub issue body states the report should contain *"the total number of all deleted CaTH accounts and their CaTH IDs for the selected report duration"*. The requirements database entry for the same issue (`REQ-0409`) states it should contain *"the total number of active accounts prior to the deletion, the number of deleted accounts from the annual verification process and the difference between both"*. This spec delivers **both** — a `Summary` sheet with the three aggregate figures and a `Deleted Accounts` sheet with per-account CaTH IDs — which satisfies either reading. Confirm with the Product Manager that the row-level CaTH IDs are wanted; if only aggregates are needed, the second sheet can be dropped and the retained data reduced further.

* **`Active accounts prior to deletion` is derived, not measured.** With no historic snapshot, the figure is computed as `current active count + deletions in the period`. That is exact only if no accounts were created during the reporting period; accounts created in the window inflate it. Getting a true point-in-time figure requires the annual verification job to record the active count at the moment it runs. Since that job does not exist yet, the cleanest fix is to specify the snapshot as part of the job's ticket. **Question for Product: is a derived figure acceptable for the analytical report, or is a measured pre-deletion count required?**

### Design decisions taken, open to challenge

* **The mock-up attachment was not readable.** `Deleted accounts MI Report Mock-up.docx` is a GitHub user-content attachment that cannot be fetched from this environment. The workbook layout in §5 is inferred from the acceptance criteria and the existing MI Report tab structure described in #628. **Verify the sheet names, column order and summary labels against the mock-up before implementing.**

* **The issue says "drop down"; this spec specifies a radio option.** #628 implements report type as a `govukRadios` group, and the GOV.UK design rules treat `select` as a last resort. Adding a sixth radio is consistent with the built page and better for accessibility. Flagging in case the Product Manager specifically wants a `select` — that would be a change to #628's page, not just an added option.

* **Deleted-account records deliberately exclude email, name and `userProvenanceId`.** Retaining direct identifiers for accounts that have been deleted would undermine the deletion. Only the CaTH ID (an internal UUID) and non-identifying attributes are kept. If the analytical report needs to correlate deleted accounts with anything external, that requirement changes the data-protection position and needs a decision from the information-governance owner rather than a code change.

* **No retention limit on `deleted_account` rows.** The table grows without bound. At the scale of an annual verification cycle this is negligible, but if a retention period applies to deletion records it needs specifying — and note that purging rows removes the ability to report on those periods.

* **Manual System Admin deletions are recorded and reported separately.** The AC scopes the report to annual verification, but the manual deletion path is the only deletion path that exists today, and excluding it would make `Active accounts prior to deletion` wrong. Both reasons are recorded and the summary reports them separately, so the annual-verification figure is available in isolation.

* **Workbook headers are English only.** The `.xlsx` is a data artefact for analysts, and #628 already specifies English snake_case column names for the other tabs. Only the web page is bilingual. Confirm no Welsh-language workbook is required.

* **The `All Data` report gains a fifth tab.** #628 specifies four tabs. Adding `Deleted Accounts` to `All Data` is the consistent behaviour but changes the shape of a file that may already have downstream consumers. Confirm this is wanted rather than keeping the deleted-accounts report standalone.

* **`countActiveAccounts` counts all `user` rows regardless of role**, so System Admin and internal admin accounts are included. Whether "active CaTH accounts" in the analytical report means only `VERIFIED` media accounts needs confirming — if so, the count filters on `role: "VERIFIED"` and the summary label should say so.


---

### Comment by OgechiOkelu on 2026-08-05T11:34:34Z

@plan 

