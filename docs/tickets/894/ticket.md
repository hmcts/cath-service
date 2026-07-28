# #894: ‘Deleted accounts’ to be added to the MI Report

**State:** OPEN
**Assignees:** None
**Author:** OgechiOkelu
**Labels:** None
**Created:** 2026-07-28T13:38:50Z
**Updated:** 2026-07-28T13:49:09Z

## Description

**PROBLEM STATEMENT**

Following the annual verification process of CaTH accounts, accounts that are not re-verified by CaTH users are deleted. Currently, the System Admin dashboard supports the download of the MI Report. However, there is a need for additional options to generate a report on the number of deleted accounts.

 
 

**AS A** Product Manager

**I WANT** to generate a report on the number of deleted accounts

**SO THAT** I can include the data in the analytical report

 

**ACCEPTANCE CRITERIA**
- In the ‘Download MI Report’ tab, another option titled ‘Deleted accounts’ is included in the ‘Select report type’ drop down options.
- Backend changes are implemented to support the generation of the ‘Deleted accounts’ report.
- The 'Deleted accounts' report should contain the total number of active accounts prior to the deletion, the number of deleted accounts from the annual verification process and the difference between both for the selected report duration. 
- The implementation of this requirement is dependent on https://github.com/hmcts/cath-service/issues/628 

[Deleted accounts MI Report Mock-up.docx](https://github.com/user-attachments/files/30464146/Deleted.accounts.MI.Report.Mock-up.docx)


## Comments

### Comment by OgechiOkelu on 2026-07-28T13:39:37Z

@spec 

### Comment by hmctsclaudecode on 2026-07-28T13:47:47Z

# Technical Specification — Issue #894: 'Deleted accounts' to be added to the MI Report

## 1. User Story

**As a** Product Manager
**I want to** generate a report on the number of deleted accounts
**So that** I can include the data in the analytical report

## 2. Background

Following the annual verification process of CaTH accounts, accounts that are not re-verified by their owners are deleted. The System Admin dashboard needs to expose a downloadable Management Information (MI) report covering those deletions so the volumes can be reported on.

### Current state of the codebase (verified)

Three facts materially shape this specification:

1. **There is no MI Report page in the repository.** A search across `apps/web/src/pages` and `libs/system-admin-pages/src/pages` finds no `mi-report` route, no "Download MI Report" tab, and no "Select report type" dropdown. The System Admin dashboard (`apps/web/src/pages/(system-admin)/system-admin-dashboard/en.ts`) lists 10 tiles; none of them is an MI report. The acceptance criteria are written as though the tab already exists — it does not. This specification therefore covers **both** the MI Report download page and the 'Deleted accounts' report type, so the ticket is deliverable on its own.

2. **User deletion is a hard delete with no history.** `deleteUserById` in `libs/system-admin-pages/src/user-management/queries.ts` runs `prisma.user.delete`, removing the row entirely. The `User` model in `libs/postgres-prisma/prisma/schema/base.prisma` has no `deletedAt`, no `lastVerifiedDate`, and no deletion-history relation. Once an account is deleted there is no record of it having existed, so **the report cannot be derived from the current schema** — no query can recover "how many accounts existed before the deletion run".

3. **The audit log is not a viable data source.** `AuditLog` (`libs/postgres-prisma/prisma/schema/audit-log.prisma`) records `DELETE_USER` entries, but only for *manual* deletions performed by a System Admin through the UI, attributed to that admin's `userId`. The automated annual verification job has no System Admin actor, and the audit log holds no "active account count prior to deletion" figure. Counting `DELETE_USER` rows would conflate manual admin deletions with verification-driven deletions and would still leave two of the three required figures unobtainable.

The consequence: this ticket requires a **new persistence structure** that the annual verification process writes to. That structure is specified in §6.

### Dependency

* **Blocked by** [#628](https://github.com/hmcts/cath-service/issues/628) — the annual verification process. #628 owns the job that deletes non-re-verified accounts. This ticket's report is meaningless until that job exists and populates the run record specified in §6.2. The schema and the write call in §6.2 are the integration contract between the two tickets.
* The mock-up (`Deleted accounts MI Report Mock-up.docx`) is attached to the issue but is not retrievable from this environment. Column ordering, header labels and file format below are derived from the acceptance criteria and existing repository conventions; they must be reconciled against the mock-up before implementation starts (see §14).

### Existing patterns this work follows

| Concern | Reference implementation |
|---|---|
| CSV generation and download | `libs/system-admin-pages/src/reference-data-upload/services/download-service.ts` + `apps/web/src/pages/(system-admin)/reference-data-download/index.ts` (Papa Parse `unparse`, `Content-Disposition: attachment`) |
| Date-range filter form with validation | `apps/web/src/pages/(system-admin)/audit-log-list/` (`govukDateInput`, day/month/year parsing, error summary) |
| System Admin route protection | `requireRole([USER_ROLES.SYSTEM_ADMIN])` exported from `@hmcts/auth` |
| Repository → service → page controller layering | `libs/system-admin-pages/src/audit-log/{repository,service}.ts` |
| Auditing a System Admin action | `req.auditMetadata` consumed by `auditLogMiddleware()` |

## 3. Acceptance Criteria

* **Scenario:** System Admin opens the MI report download page
    * **Given** I am signed in as a System Admin
    * **When** I select "Download MI Report" from the System Admin dashboard
    * **Then** I see a "Select report type" dropdown containing a "Deleted accounts" option, and inputs for a report start date and report end date

* **Scenario:** 'Deleted accounts' appears in the report type dropdown
    * **Given** I am on the "Download MI Report" page
    * **When** I open the "Select report type" dropdown
    * **Then** "Deleted accounts" is listed as a selectable option

* **Scenario:** System Admin downloads a Deleted accounts report
    * **Given** I am on the "Download MI Report" page
    * **And** two annual verification deletion runs completed within the selected date range
    * **When** I select "Deleted accounts", enter a valid start and end date, and select "Download report"
    * **Then** a CSV file downloads named `deleted-accounts-YYYY-MM-DD.csv`
    * **And** it contains one row per verification run within the range, each showing the run date, the total active accounts prior to deletion, the number of accounts deleted, and the difference between the two
    * **And** it contains a totals row summing the deleted-account counts across the range

* **Scenario:** Date range contains no verification runs
    * **Given** no annual verification run completed between 1 January 2026 and 31 January 2026
    * **When** I request a Deleted accounts report for that range
    * **Then** a CSV downloads containing only the header row and a totals row of zero
    * **And** no error is shown

* **Scenario:** No report type selected
    * **Given** I am on the "Download MI Report" page
    * **When** I select "Download report" without choosing a report type
    * **Then** the page re-renders with an error summary titled "There is a problem" containing "Select a report type"
    * **And** the dropdown shows an inline error message
    * **And** any dates I already entered are retained

* **Scenario:** Incomplete date entered
    * **Given** I have selected "Deleted accounts"
    * **When** I enter a start date with a day and month but no year
    * **Then** the page re-renders with the error "Report start date must include a year"
    * **And** the error summary link moves focus to the start date day field

* **Scenario:** End date precedes start date
    * **Given** I have selected "Deleted accounts"
    * **When** I enter a start date of 1 March 2026 and an end date of 1 February 2026
    * **Then** the page re-renders with the error "Report end date must be the same as or after the report start date"

* **Scenario:** Non-System-Admin access is refused
    * **Given** I am signed in as a verified media user
    * **When** I navigate to `/mi-report`
    * **Then** I am refused access by the existing role guard and do not see the page

* **Scenario:** Welsh language support
    * **Given** I am on the "Download MI Report" page
    * **When** I switch the language to Welsh
    * **Then** the page heading, dropdown label, all report type option labels, date labels, hint text, button text and every error message are shown in Welsh

* **Scenario:** Download is audited
    * **Given** I am a System Admin
    * **When** I successfully download a Deleted accounts report
    * **Then** an audit log entry is recorded with the action `DOWNLOAD_MI_REPORT` and details naming the report type and the date range

## 4. User Journey Flow

```
┌──────────────────────────┐
│ System Admin Dashboard   │
│ /system-admin-dashboard  │
│  [Download MI Report]    │  ← new tile added by this ticket
└───────────┬──────────────┘
            │ selects tile
            ▼
┌────────────────────────────────────────────┐
│ Download MI Report          GET /mi-report │
│  • Select report type (dropdown)           │
│  • Report start date (day/month/year)      │
│  • Report end date   (day/month/year)      │
│  • [Download report]                       │
└───────────┬────────────────────────────────┘
            │ POST /mi-report
            ▼
     ┌──────────────────┐
     │ Validate input   │
     └───┬──────────┬───┘
    invalid         valid
         │            │
         ▼            ▼
┌──────────────┐  ┌───────────────────────────────┐
│ Re-render    │  │ Query account_verification_run │
│ with error   │  │ rows in range                  │
│ summary +    │  └───────────────┬────────────────┘
│ retained     │                  │
│ input        │                  ▼
└──────────────┘  ┌────────────────────────────────┐
                  │ Build CSV (Papa.unparse)       │
                  │ Write audit log entry          │
                  │ Stream as file attachment      │
                  └───────────────┬────────────────┘
                                  │
                                  ▼
                  ┌────────────────────────────────┐
                  │ Browser downloads              │
                  │ deleted-accounts-YYYY-MM-DD.csv│
                  │ (page stays on /mi-report)     │
                  └────────────────────────────────┘
```

Data production flow (owned by #628, consumed here):

```
Annual verification job (#628)
   │
   ├─ counts active accounts before deletion  ──┐
   ├─ deletes accounts not re-verified          │
   ├─ counts accounts deleted                   ├─► recordVerificationRun()
   └─ on completion                           ──┘        │
                                                         ▼
                                          account_verification_run row
                                                         │
                                                         ▼
                                             Deleted accounts MI report
```

## 5. Low Fidelity Wireframe

### `/mi-report` — initial state

```
┌───────────────────────────────────────────────────────────────────────┐
│ GOV.UK  Court and tribunal hearings                     Cymraeg       │
├───────────────────────────────────────────────────────────────────────┤
│ ‹ Back                                                                │
│                                                                       │
│ Download MI Report                                                    │
│ ══════════════════                                                    │
│                                                                       │
│ Select report type                                                    │
│ ┌─────────────────────────────────────────────┐                       │
│ │ Select a report type                     ▼  │                       │
│ ├─────────────────────────────────────────────┤                       │
│ │ Select a report type                        │                       │
│ │ Deleted accounts                            │  ← added by this      │
│ └─────────────────────────────────────────────┘     ticket            │
│                                                                       │
│ Report start date                                                     │
│ For example, 1 4 2026                                                 │
│  Day     Month    Year                                                │
│ ┌────┐  ┌────┐  ┌──────┐                                              │
│ │    │  │    │  │      │                                              │
│ └────┘  └────┘  └──────┘                                              │
│                                                                       │
│ Report end date                                                       │
│ For example, 31 3 2027                                                │
│  Day     Month    Year                                                │
│ ┌────┐  ┌────┐  ┌──────┐                                              │
│ │    │  │    │  │      │                                              │
│ └────┘  └────┘  └──────┘                                              │
│                                                                       │
│ ┌──────────────────┐                                                  │
│ │ Download report  │                                                  │
│ └──────────────────┘                                                  │
│                                                                       │
├───────────────────────────────────────────────────────────────────────┤
│ Footer                                                                │
└───────────────────────────────────────────────────────────────────────┘
```

### `/mi-report` — validation error state

```
┌───────────────────────────────────────────────────────────────────────┐
│ ‹ Back                                                                │
│ ┌───────────────────────────────────────────────────────────────────┐ │
│ │ ▌ There is a problem                                              │ │
│ │ ▌  • Select a report type                                         │ │
│ │ ▌  • Report start date must include a year                        │ │
│ └───────────────────────────────────────────────────────────────────┘ │
│                                                                       │
│ Download MI Report                                                    │
│ ══════════════════                                                    │
│                                                                       │
│ Select report type                                                    │
│ ▌ Error: Select a report type                                         │
│ ▌┌─────────────────────────────────────────────┐                      │
│ ▌│ Select a report type                     ▼  │                      │
│ ▌└─────────────────────────────────────────────┘                      │
│                                                                       │
│ Report start date                                                     │
│ For example, 1 4 2026                                                 │
│ ▌ Error: Report start date must include a year                        │
│ ▌ Day     Month    Year                                               │
│ ▌┌────┐  ┌────┐  ┌──────┐                                             │
│ ▌│ 1  │  │ 4  │  │      │   ← entered values retained                 │
│ ▌└────┘  └────┘  └──────┘                                             │
└───────────────────────────────────────────────────────────────────────┘
```

### Downloaded CSV — shape

```
REPORT_DATE,ACTIVE_ACCOUNTS_BEFORE_DELETION,ACCOUNTS_DELETED,DIFFERENCE
01/04/2026,15230,412,14818
01/04/2027,14990,378,14612
Total,,790,
```

## 6. Page Specifications

### 6.1 Overview of changes

| Layer | File | Change |
|---|---|---|
| Schema | `libs/postgres-prisma/prisma/schema/account-verification.prisma` | New file, new `AccountVerificationRun` model |
| Migration | `apps/postgres/prisma/migrations/<timestamp>_add_account_verification_run/` | New migration creating `account_verification_run` |
| Repository | `libs/system-admin-pages/src/mi-report/deleted-accounts-repository.ts` | New — range query + run recording |
| Service | `libs/system-admin-pages/src/mi-report/deleted-accounts-report.ts` | New — CSV generation |
| Report registry | `libs/system-admin-pages/src/mi-report/report-types.ts` | New — report type constants and dispatch |
| Validation | `libs/system-admin-pages/src/mi-report/validation.ts` | New — report type and date-range rules |
| Exports | `libs/system-admin-pages/src/index.ts` | Export the above |
| Audit action | `libs/system-admin-pages/src/audit-log/logger.ts` | Add `DOWNLOAD_MI_REPORT` to `AuditLogAction` |
| Page | `apps/web/src/pages/(system-admin)/mi-report/{index.ts,index.njk,en.ts,cy.ts}` | New page |
| Dashboard | `apps/web/src/pages/(system-admin)/system-admin-dashboard/{en.ts,cy.ts}` | Add "Download MI Report" tile |

### 6.2 Database schema

New schema file — reference data lives in `libs/postgres-prisma/prisma/schema/`, one file per domain, per the project conventions.

```prisma
// libs/postgres-prisma/prisma/schema/account-verification.prisma

model AccountVerificationRun {
  id                     String   @id @default(uuid()) @db.Uuid
  runDate                DateTime @map("run_date") @db.Date
  activeAccountsBefore   Int      @map("active_accounts_before")
  accountsDeleted        Int      @map("accounts_deleted")
  createdAt              DateTime @default(now()) @map("created_at")

  @@index([runDate])
  @@map("account_verification_run")
}
```

Design notes:

* `runDate` is a `@db.Date`, not a timestamp — the report is reported by day and the range filter is inclusive of whole days. This avoids the timezone-boundary handling that `audit-log/repository.ts` needs for its timestamp filter.
* `activeAccountsBefore` and `accountsDeleted` are **stored, not derived**. The "before" count cannot be recomputed after the fact because deletion is destructive. Storing the count at run time is the only correct option.
* The third required figure — the difference — is **not stored**. It is `activeAccountsBefore - accountsDeleted`, computed in the service. Storing a derivable value invites drift.
* No `activeAccountsAfter` column for the same reason.
* `runDate` is deliberately **not** unique. A verification run could legitimately be re-executed, or split across a day boundary; a unique constraint would turn an operational retry into a crash inside #628's job.

### 6.3 Repository

```typescript
// libs/system-admin-pages/src/mi-report/deleted-accounts-repository.ts
import { prisma } from "@hmcts/postgres-prisma";

export async function findVerificationRunsInRange(from: Date, to: Date): Promise<AccountVerificationRun[]>
export async function recordVerificationRun(data: RecordVerificationRunInput): Promise<void>
```

* `findVerificationRunsInRange` filters `runDate: { gte: from, lte: to }`, ordered `runDate: "asc"`. Both bounds inclusive.
* `recordVerificationRun` is the write side, called by the #628 job. It is specified here because the schema is introduced here; the *caller* belongs to #628.
* Types (`AccountVerificationRun`, `RecordVerificationRunInput`) are colocated in this file — the project forbids `types.ts` files.

### 6.4 Report service

```typescript
// libs/system-admin-pages/src/mi-report/deleted-accounts-report.ts
export async function generateDeletedAccountsCsv(from: Date, to: Date): Promise<string>
```

Behaviour:

1. Fetch runs in range via the repository.
2. Map each run to a CSV row, computing `DIFFERENCE = activeAccountsBefore - accountsDeleted`.
3. Format `REPORT_DATE` as `dd/mm/yyyy`, matching the display convention already used by `formatTimestamp` in `libs/system-admin-pages/src/audit-log/service.ts`.
4. Append a `Total` row summing `ACCOUNTS_DELETED`. `ACTIVE_ACCOUNTS_BEFORE_DELETION` and `DIFFERENCE` are left blank on the totals row — summing point-in-time snapshots across runs produces a number with no meaning, and a blank cell is safer than a misleading one.
5. Serialise with `Papa.unparse(rows, { header: true })`, matching `generateReferenceDataCsv`. `papaparse` `5.5.4` is already a dependency of `@hmcts/system-admin-pages`; no new dependency is needed.
6. An empty range yields the header row plus a `Total` row of `0`. This is not an error state.

Functions are plain exported functions, not a class — no shared state.

### 6.5 Report type registry

```typescript
// libs/system-admin-pages/src/mi-report/report-types.ts
export const MI_REPORT_TYPES = {
  DELETED_ACCOUNTS: "deleted-accounts"
} as const;
```

A registry mapping report type → `{ generate, filenamePrefix }` keeps the page controller free of per-report branching, so the next MI report type is an entry rather than an `if`. The key is the **stable string slug**, never a numeric ID — the same reasoning that governs `listTypeName` across this codebase.

### 6.6 Page controller — `apps/web/src/pages/(system-admin)/mi-report/index.ts`

```typescript
export const GET: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN]), getHandler];
export const POST: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN]), postHandler];
```

`getHandler`:
* Resolves locale from `res.locals.locale`, selects `cy` or `en`.
* Renders `mi-report/index` with `{ en, cy, t, reportTypeItems, data: {}, errors: undefined }`.
* `reportTypeItems` is built from `t.reportTypes`, so option labels are translated.

`postHandler`:
* Reads `reportType`, `fromDay/fromMonth/fromYear`, `toDay/toMonth/toYear` from `req.body`.
* Calls `validateMiReportRequest`. On any error: re-renders `mi-report/index` with `errors`, per-field `errorMessage` objects, and `data` echoing the submitted values so nothing the user typed is lost. Returns HTTP 200 with the form — not a redirect — so the error summary is present on first paint and focusable.
* On success: sets `req.auditMetadata = { shouldLog: true, action: AuditLogAction.DOWNLOAD_MI_REPORT, entityInfo: ... }` **before** sending the response. `auditLogMiddleware` wraps `res.send`, so the metadata must be assigned first or the entry is logged without context.
* Sets `Content-Type: text/csv`, `Content-Disposition: attachment; filename="deleted-accounts-<yyyy-mm-dd>.csv"`, then `res.send(csv)`.
* Wraps generation in `try/catch`; on failure logs server-side and renders `errors/500`. The catch must not leak database detail into the response.

### 6.7 Template — `index.njk`

* Extends `layouts/base-template.njk`; content in `{% block page_content %}`.
* `{% block backLink %}` links to `/system-admin-dashboard`.
* Imports `govukSelect`, `govukDateInput`, `govukButton`, `govukErrorSummary`.
* Error summary rendered inside `{% if errorList %}` at the top of the content column, before the `h1`, per the GOV.UK validation pattern.
* Single `<form method="post" novalidate>` — `novalidate` so GOV.UK error handling owns validation rather than the browser.
* Layout is `govuk-grid-column-two-thirds`.
* All visible strings come from `t.*`. No hardcoded English in the template.

### 6.8 Dashboard tile

Appended to the `tiles` array in `system-admin-dashboard/en.ts` and `cy.ts`:

```
title: "Download MI Report"
description: "Download management information reports"
href: "/mi-report"
```

Note the existing `system-admin-dashboard.spec.ts` E2E test asserts an exact tile count of 9 while the page renders 10, and the suite is `test.describe.skip`-ed. Adding an 11th tile does not make this worse, but the count assertion should be corrected rather than propagated (see §14).

## 7. Content

### English — `apps/web/src/pages/(system-admin)/mi-report/en.ts`

```typescript
export const en = {
  title: "Download MI Report",
  reportTypeLabel: "Select report type",
  reportTypePlaceholder: "Select a report type",
  reportTypes: {
    deletedAccounts: "Deleted accounts"
  },
  fromDateLegend: "Report start date",
  fromDateHint: "For example, 1 4 2026",
  toDateLegend: "Report end date",
  toDateHint: "For example, 31 3 2027",
  dayLabel: "Day",
  monthLabel: "Month",
  yearLabel: "Year",
  downloadButton: "Download report",
  backLink: "Back",
  errorSummaryTitle: "There is a problem",
  errors: {
    reportTypeRequired: "Select a report type",
    fromDateRequired: "Enter a report start date",
    fromDateIncompleteDay: "Report start date must include a day",
    fromDateIncompleteMonth: "Report start date must include a month",
    fromDateIncompleteYear: "Report start date must include a year",
    fromDateInvalid: "Report start date must be a real date",
    toDateRequired: "Enter a report end date",
    toDateIncompleteDay: "Report end date must include a day",
    toDateIncompleteMonth: "Report end date must include a month",
    toDateIncompleteYear: "Report end date must include a year",
    toDateInvalid: "Report end date must be a real date",
    toDateBeforeFromDate: "Report end date must be the same as or after the report start date",
    fromDateInFuture: "Report start date must be today or in the past",
    generationFailed: "There was a problem generating the report. Try again later."
  }
};
```

### Welsh — `apps/web/src/pages/(system-admin)/mi-report/cy.ts`

```typescript
export const cy = {
  title: [WELSH TRANSLATION REQUIRED: "Download MI Report"],
  reportTypeLabel: [WELSH TRANSLATION REQUIRED: "Select report type"],
  reportTypePlaceholder: [WELSH TRANSLATION REQUIRED: "Select a report type"],
  reportTypes: {
    deletedAccounts: [WELSH TRANSLATION REQUIRED: "Deleted accounts"]
  },
  fromDateLegend: [WELSH TRANSLATION REQUIRED: "Report start date"],
  fromDateHint: [WELSH TRANSLATION REQUIRED: "For example, 1 4 2026"],
  toDateLegend: [WELSH TRANSLATION REQUIRED: "Report end date"],
  toDateHint: [WELSH TRANSLATION REQUIRED: "For example, 31 3 2027"],
  dayLabel: [WELSH TRANSLATION REQUIRED: "Day"],
  monthLabel: [WELSH TRANSLATION REQUIRED: "Month"],
  yearLabel: [WELSH TRANSLATION REQUIRED: "Year"],
  downloadButton: [WELSH TRANSLATION REQUIRED: "Download report"],
  backLink: Yn ôl,
  errorSummaryTitle: Mae problem,
  errors: {
    reportTypeRequired: [WELSH TRANSLATION REQUIRED: "Select a report type"],
    fromDateRequired: [WELSH TRANSLATION REQUIRED: "Enter a report start date"],
    fromDateIncompleteDay: [WELSH TRANSLATION REQUIRED: "Report start date must include a day"],
    fromDateIncompleteMonth: [WELSH TRANSLATION REQUIRED: "Report start date must include a month"],
    fromDateIncompleteYear: [WELSH TRANSLATION REQUIRED: "Report start date must include a year"],
    fromDateInvalid: [WELSH TRANSLATION REQUIRED: "Report start date must be a real date"],
    toDateRequired: [WELSH TRANSLATION REQUIRED: "Enter a report end date"],
    toDateIncompleteDay: [WELSH TRANSLATION REQUIRED: "Report end date must include a day"],
    toDateIncompleteMonth: [WELSH TRANSLATION REQUIRED: "Report end date must include a month"],
    toDateIncompleteYear: [WELSH TRANSLATION REQUIRED: "Report end date must include a year"],
    toDateInvalid: [WELSH TRANSLATION REQUIRED: "Report end date must be a real date"],
    toDateBeforeFromDate: [WELSH TRANSLATION REQUIRED: "Report end date must be the same as or after the report start date"],
    fromDateInFuture: [WELSH TRANSLATION REQUIRED: "Report start date must be today or in the past"],
    generationFailed: [WELSH TRANSLATION REQUIRED: "There was a problem generating the report. Try again later."]
  }
};
```

### Dashboard tile content

* English: title `"Download MI Report"`, description `"Download management information reports"`
* Welsh: title `[WELSH TRANSLATION REQUIRED: "Download MI Report"]`, description `[WELSH TRANSLATION REQUIRED: "Download management information reports"]`

### CSV column headers

CSV headers are machine-facing data-extract identifiers, not UI copy. They stay in English and uppercase in both locales, matching the established `generateReferenceDataCsv` convention (`LOCATION_ID`, `WELSH_LOCATION_NAME`).

| Header | Meaning |
|---|---|
| `REPORT_DATE` | Date the verification run completed, `dd/mm/yyyy` |
| `ACTIVE_ACCOUNTS_BEFORE_DELETION` | Active accounts immediately before that run's deletions |
| `ACCOUNTS_DELETED` | Accounts deleted by that run |
| `DIFFERENCE` | `ACTIVE_ACCOUNTS_BEFORE_DELETION` − `ACCOUNTS_DELETED` |

The final row has `REPORT_DATE` = `Total` and only `ACCOUNTS_DELETED` populated.

Locale key parity between `en.ts` and `cy.ts` is asserted by test (§13).

## 8. URL

| Method | Path | Purpose | Auth |
|---|---|---|---|
| `GET` | `/mi-report` | Render the download form | `SYSTEM_ADMIN` |
| `POST` | `/mi-report` | Validate; stream CSV or re-render with errors | `SYSTEM_ADMIN` |

* Both handlers live in `apps/web/src/pages/(system-admin)/mi-report/index.ts`. The `(system-admin)` route group adds no URL prefix, so the path is `/mi-report`.
* Pages under `apps/web/src/pages` are auto-discovered by `createSimpleRouter` in `apps/web/src/app.ts`. No manual route registration.
* `POST` rather than a `GET` download link: the request carries a report type and two dates, and the response is a generated file. A `GET` with query parameters would put the filter in the browser history and encourage the report being re-run by refresh. The existing `GET /reference-data-download` takes no parameters, so it is not a precedent here.
* Welsh is reached via `?lng=cy`, consistent with every other page.
* No new API route in `apps/api`. The report is a System Admin UI download, not a machine-consumed endpoint. Adding an API surface would be speculative.

## 9. Validation

Implemented in `libs/system-admin-pages/src/mi-report/validation.ts` as pure functions returning `ValidationError[]`, mirroring `user-management/validation.ts`.

### Report type

| Rule | Condition | Error key |
|---|---|---|
| Required | `reportType` absent or empty | `reportTypeRequired` |
| Known value | `reportType` not a value in `MI_REPORT_TYPES` | `reportTypeRequired` |

An unknown value is treated as "not selected" rather than surfacing a distinct message. The only way to submit one is tampering with the form, and a bespoke error message would be user-hostile noise for a case no real user reaches. Critically, the value must be checked against the registry **before** dispatch — never used to index a lookup unguarded.

### Report start date and report end date

Both are required. Each is validated independently before the cross-field rule runs.

| Rule | Condition | Error key |
|---|---|---|
| Required | all three parts empty | `fromDateRequired` / `toDateRequired` |
| Day present | day empty, others populated | `fromDateIncompleteDay` / `toDateIncompleteDay` |
| Month present | month empty, others populated | `fromDateIncompleteMonth` / `toDateIncompleteMonth` |
| Year present | year empty, others populated | `fromDateIncompleteYear` / `toDateIncompleteYear` |
| Numeric and real | any part non-numeric, or the combination is not a real calendar date (e.g. 31/02/2026) | `fromDateInvalid` / `toDateInvalid` |
| Four-digit year | year is not exactly 4 digits | `fromDateInvalid` / `toDateInvalid` |
| Not in the future | start date is after today | `fromDateInFuture` |
| Ordering | end date is before start date | `toDateBeforeFromDate` |

Implementation notes:

* Reuse `parseDate({ day, month, year })` from `@hmcts/web-core` (`libs/web-core/src/utils/date-utils.ts`). It builds the date with `Date.UTC` and rejects rollover (`31/02` becomes `03/03` in a naive `new Date`, and `parseDate` already catches that). Do not hand-roll date parsing.
* Multiple errors are reported together in one pass, so a user with two mistakes sees both.
* The cross-field ordering check runs only when both dates parse; otherwise it would emit a confusing third error on top of two parse failures.
* An end date in the future is allowed and simply returns no runs beyond today — it is not an error, and rejecting it would be a gratuitous obstacle for someone typing a financial-year end.
* Range size is unbounded. `account_verification_run` gains roughly one row per year, so there is no volume risk to guard against and a cap would be invented complexity.
* Query parameters reach Prisma as typed `Date` objects through Prisma's parameterised queries. No string interpolation into SQL anywhere in this feature.

## 10. Error Messages

### Field validation

| Field | Trigger | Message |
|---|---|---|
| Report type | Not selected | Select a report type |
| Report start date | All parts empty | Enter a report start date |
| Report start date | Day missing | Report start date must include a day |
| Report start date | Month missing | Report start date must include a month |
| Report start date | Year missing | Report start date must include a year |
| Report start date | Not a real date | Report start date must be a real date |
| Report start date | After today | Report start date must be today or in the past |
| Report end date | All parts empty | Enter a report end date |
| Report end date | Day missing | Report end date must include a day |
| Report end date | Month missing | Report end date must include a month |
| Report end date | Year missing | Report end date must include a year |
| Report end date | Not a real date | Report end date must be a real date |
| Report end date | Before start date | Report end date must be the same as or after the report start date |

### Error summary

* Title: **There is a problem**
* Order matches field order on the page: report type, then start date, then end date.
* `href` targets: `#reportType`, `#fromDate-day`, `#toDate-day` — the summary link moves focus to the first input of the offending group, per the GOV.UK date input guidance.

### Page-level errors

| Situation | Response |
|---|---|
| CSV generation throws | Render `errors/500`; log server-side with the report type and range; do not surface database detail |
| Non-System-Admin user | Handled by the existing `requireRole` guard — no bespoke message |
| Unknown report type submitted | Treated as "not selected"; see §9 |

Empty result sets are **not** errors. A range with no verification runs returns a valid CSV with a zero totals row. Blocking the download would mean a Product Manager could not tell "nothing happened" apart from "the report is broken".

## 11. Navigation

| From | Trigger | To |
|---|---|---|
| System Admin dashboard | "Download MI Report" tile | `GET /mi-report` |
| `/mi-report` | Back link | `/system-admin-dashboard` |
| `/mi-report` | "Download report", valid | File download; page remains on `/mi-report` |
| `/mi-report` | "Download report", invalid | Re-render `/mi-report` with error summary, HTTP 200 |
| `/mi-report` | Language toggle | `/mi-report?lng=cy` |

* There is no confirmation or success page. A file download is its own confirmation, and the GOV.UK confirmation-page pattern is for completed transactions that change state — this one does not.
* The current language is preserved on redirects using the `?lng=cy` convention already used by `delete-user-confirm/[userId]/index.ts`.
* Because validation failures re-render rather than redirect, the browser back button does not resurrect a stale error state.

## 12. Accessibility

Target: **WCAG 2.2 AA**, as mandated for all pages in this service.

### Structure and semantics

* Page `<title>` mirrors the `h1`: "Download MI Report". On validation failure it is prefixed with "Error: " so screen reader users hear the failure before the page name.
* One `<h1 class="govuk-heading-l">`; no heading levels skipped.
* Each date group is a `govukDateInput`, which renders a `<fieldset>` with a `<legend>` — this is what associates the three loose inputs with "Report start date" for assistive technology. Do not replace it with bare labelled inputs.
* `govukSelect` associates its `<label>` with the `<select>` via `for`/`id`.
* Date inputs carry `inputmode="numeric"` and `autocomplete` is omitted — these are report parameters, not the user's own data, so browser autofill would be wrong.

### Errors

* `govukErrorSummary` renders with `role="alert"` and receives focus on page load, so the failure is announced immediately.
* Summary entries are links to the offending control; for date groups they target the day input.
* Inline `govukErrorMessage` includes a visually hidden "Error:" prefix and is wired to the input via `aria-describedby`, so the message is read as part of the field rather than as orphaned text.
* Errors are conveyed by text, not by the red border alone — colour is never the sole carrier of meaning.

### Keyboard and focus

* Tab order follows visual order: back link → report type select → start day/month/year → end day/month/year → download button.
* The select is operable with arrow keys and type-ahead; no custom dropdown widget.
* Visible focus indicators come from GOV.UK Frontend defaults and must not be overridden.
* No time limits, no auto-dismissing messages.

### Contrast and target size

* Only GOV.UK Frontend components and colours — 4.5:1 body text and 3:1 for interactive boundaries are met by the design system.
* The download button meets the 44×44px target guidance at default GOV.UK sizing.
* No custom CSS is introduced by this ticket.

### Progressive enhancement

The page is a plain HTML `<form method="post">` with a `<select>` and text inputs. It works fully with JavaScript disabled — validation is server-side and the download is a normal form response. No client-side JavaScript is added.

### Downloaded file

The CSV is served with `Content-Type: text/csv` and an explicit filename including the generation date, so the file is identifiable once saved. WCAG applies to the page, not the CSV, but a header row is still required for the file to be navigable in a screen reader inside a spreadsheet application.

## 13. Test Scenarios

### Unit — validation (`libs/system-admin-pages/src/mi-report/validation.test.ts`)

* Returns no errors when a known report type and a valid, correctly ordered date range are supplied
* Returns a report-type-required error when the report type is absent, empty, or not a value in the registry
* Returns a required error for each date when all three of its parts are empty
* Returns the specific incomplete-part error when exactly one of day, month or year is missing, for each part and each date
* Returns an invalid-date error for a non-numeric part, a two-digit year, and an impossible calendar date such as 31 February
* Returns an ordering error when the end date precedes the start date, and none when the dates are equal
* Returns a future-date error when the start date is after today, and none when the end date is in the future
* Accumulates multiple independent errors from a single submission rather than stopping at the first
* Suppresses the ordering error when either date failed to parse

### Unit — repository (`deleted-accounts-repository.test.ts`, `prisma` mocked)

* Queries with an inclusive `gte`/`lte` `runDate` filter ordered ascending
* Returns runs falling exactly on the range boundaries
* Returns an empty array when no runs fall in the range
* `recordVerificationRun` writes the supplied before-count and deleted-count

### Unit — report service (`deleted-accounts-report.test.ts`, repository mocked)

* Emits the four expected headers in the documented order
* Emits one row per verification run, in ascending date order
* Computes `DIFFERENCE` as before-count minus deleted-count
* Formats `REPORT_DATE` as `dd/mm/yyyy`
* Appends a totals row summing `ACCOUNTS_DELETED` and leaving the snapshot columns blank
* Returns header plus a zero totals row when the range contains no runs
* Handles a run where zero accounts were deleted without producing a blank or `NaN` cell
* Propagates a repository failure rather than returning a partial CSV

### Unit — page controller (`apps/web/src/pages/(system-admin)/mi-report/index.test.ts`)

* `GET` renders `mi-report/index` with `en`, `cy` and `t`
* `GET` renders Welsh content when the locale is `cy`
* `GET` builds the report type dropdown items from the active locale, so Welsh users see Welsh option labels
* `POST` with valid input sets `Content-Type: text/csv` and a `Content-Disposition` filename matching `deleted-accounts-YYYY-MM-DD.csv`, and sends the generated CSV
* `POST` with valid input sets `req.auditMetadata` with the `DOWNLOAD_MI_REPORT` action before the response is sent
* `POST` with no report type re-renders with an error summary and does not call the report service
* `POST` with an invalid date re-renders with the field error and echoes back the submitted values
* `POST` with an unknown report type re-renders rather than dispatching
* `POST` renders `errors/500` and logs when generation throws
* Both `GET` and `POST` are guarded by `requireRole([USER_ROLES.SYSTEM_ADMIN])`

### Template (`index.njk.test.ts`, using `@hmcts/test-support`)

* Renders the `h1` with the page title
* Renders a `<select>` whose options include a placeholder and "Deleted accounts"
* Renders two date fieldsets, each with its legend, hint, and three inputs
* Renders no error summary when no errors are passed
* Renders an error summary listing each message, with hrefs targeting `#reportType`, `#fromDate-day` and `#toDate-day`
* Renders inline error messages against the correct form groups
* Retains previously submitted values in the date inputs and the select on the error re-render
* Renders Welsh headings, labels and option text when passed the `cy` locale
* Asserts `Object.keys(en).sort()` equals `Object.keys(cy).sort()`, including the nested `errors` and `reportTypes` objects

### E2E (`e2e-tests/tests/system-admin/mi-report.spec.ts`) — one journey test

A single `@nightly` test covering the whole journey, with validation, Welsh and accessibility checks inline rather than as separate tests:

* Sign in as System Admin, land on the dashboard, follow the "Download MI Report" tile
* Run an Axe scan on the form page and assert no violations
* Submit with nothing selected; assert the error summary and inline errors appear
* Run an Axe scan on the error state and assert no violations
* Switch to Welsh; assert the heading, dropdown label and the "Deleted accounts" option render in Welsh
* Return to English, select "Deleted accounts", enter a valid range covering a seeded verification run
* Tab to and activate the download button by keyboard
* Assert the download event fires with a filename matching `deleted-accounts-*.csv`, and that the payload contains the expected header row and the seeded run's figures

Test data: seed an `account_verification_run` row through the existing `libs/test-support` route pattern so the assertion has known figures; clean it up in teardown via the established test-prefix mechanism.

### Migration

* Applying the migration on a database with existing data creates `account_verification_run` without touching the `user` table
* `yarn db:generate` produces a client exposing `prisma.accountVerificationRun`

## 14. Assumptions & Open Questions

### Blocking — resolve before implementation

1. **#628 must define who writes the run record.** This ticket specifies the `account_verification_run` table and a `recordVerificationRun` function; the annual verification job in #628 must call it, inside the same transaction as the deletions, capturing the active-account count *before* any row is removed. If #628 ships without that call, the table stays empty and this report returns zeroes forever. This is the single hard integration point and needs explicit agreement across both tickets.

2. **The mock-up has not been read.** `Deleted accounts MI Report Mock-up.docx` could not be retrieved in this environment. Column order, header wording, date format and — most importantly — **file format** are inferred from the acceptance criteria and repository convention. If the mock-up shows an Excel workbook rather than CSV, §6.4 changes to use `exceljs` (already a dependency of `@hmcts/excel-generation`) and the download content type changes accordingly. Confirm before starting.

3. **The "Download MI Report" tab does not exist.** The acceptance criteria assume it does. This specification creates it. If another in-flight ticket also creates an MI Report page, the two will collide on `/mi-report` and on the dashboard tile — check before implementation and, if so, reduce this ticket's scope to adding the dropdown option plus the backend from §6.2–6.5.

### Assumptions made

4. **CSV, not Excel.** Chosen because it is the format the only comparable download in the codebase uses (`reference-data-download`), it needs no new dependency, and MI data is consumed analytically. Subject to item 2.

5. **"Report duration" means a start and end date.** The acceptance criteria say "for the selected report duration" without specifying the control. Two date inputs are specified as the most flexible reading. A dropdown of preset periods (financial year, last 12 months) would be a smaller interaction — worth confirming with the Product Manager, since it is a materially different page.

6. **One CSV row per verification run.** The criteria describe three figures "for the selected report duration", which could mean a single aggregated row. Per-run rows are specified because they are strictly more informative, aggregate trivially, and are the only shape that stays meaningful when a range spans several annual runs. The totals row satisfies the aggregate reading.

7. **The totals row omits the snapshot columns.** Summing "active accounts before deletion" across two annual runs produces a number that means nothing. Blank cells are specified rather than a misleading total. Confirm this against the mock-up.

8. **"Total number of active accounts prior to the deletion" counts all accounts, not just media accounts.** The `user` table holds `VERIFIED`, `SYSTEM_ADMIN`, `INTERNAL_ADMIN_CTSC` and `INTERNAL_ADMIN_LOCAL` roles. Annual verification applies to media accounts. If the Product Manager wants the figure scoped to verified media accounts only, that scoping belongs in #628's counting logic, not in this report — the report reads whatever number the job stored. **This needs deciding in #628**, because it determines the meaning of every figure in the report.

9. **The report is not scoped by provenance.** No filtering by `userProvenance` is specified. If media accounts across B2C and PI_AAD provenances need separating, the table needs additional columns and #628 needs to count per provenance.

### Non-blocking, flag for follow-up

10. **Historical data cannot be backfilled.** Verification runs that happened before this table exists left no trace, because deletion is destructive. The report will only ever cover runs from deployment onwards. If the Product Manager expects prior-year figures, they must come from outside the system.

11. **Manual deletions are excluded.** Accounts a System Admin deletes through `/manage-user` are not verification-driven and will not appear. The acceptance criteria say "deleted accounts from the annual verification process", so this is correct as specified — but it means the report is not a complete picture of account deletion. Worth stating explicitly to the Product Manager so the analytical report is not mislabelled.

12. **The dashboard E2E tile-count assertion is already wrong.** `e2e-tests/tests/system-admin/system-admin-dashboard.spec.ts` asserts 9 tiles against a page rendering 10, and is `test.describe.skip`-ed so the drift is invisible. Adding an 11th tile makes it wronger. Fix the assertion — ideally derive it from the content file rather than hardcoding a number — as part of this ticket.

13. **No API endpoint.** Deliberately omitted per YAGNI. If the analytical report is ever automated, an authenticated `apps/api` route can be added then.

14. **Retention of the run records.** `account_verification_run` holds aggregate counts, no personal data, so it falls outside data-subject deletion obligations and can be retained indefinitely. Confirm with the information governance owner if MI retention is formally bounded.


### Comment by OgechiOkelu on 2026-07-28T13:49:09Z

@plan
