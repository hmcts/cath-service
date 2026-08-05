# #628: MI Report Download - System Admin Dashboard

**State:** OPEN
**Assignees:** None
**Author:** junaidiqbalmoj
**Labels:** None
**Created:** 2026-05-15T08:08:32Z
**Updated:** 2026-08-05T09:17:09Z

## Description

## User Story

**As a** System Administrator
**I want to** download MI Reports from the System Admin Dashboard
**So that** I can analyse user accounts, publications, and subscriptions for a selected time period

---

## Background & Context

The MI Report currently exists as a manually generated Excel file with 4 tabs:
- **User Accounts** — user account data including provenance and roles
- **Publications** — NoMatch publications with court and list type data
- **Location Subscriptions** — subscriptions by location with court names
- **All Subscriptions** — all subscriptions including search type

This story automates that process, allowing System Admins to self-serve the report from the dashboard.

---

## Acceptance Criteria

### AC1 — Access Control
- The "Download MI Report" tile is visible only to users with `SYSTEM_ADMIN` role
- Non-admin users cannot see or access the tile
- Navigating directly to `/mi-report` without the role redirects to 403

### AC2 — New Dashboard Tile
- A new tile labelled **"Download MI Report"** appears on the System Admin Dashboard
- Description: *"Download management information reports for user accounts, publications and subscriptions"*

### AC3 — Report Selection Page
- User can select a **reporting period**: 7, 14, 21, or 30 days
- User can select a **report type**:
  - User Accounts
  - Publications
  - Location Subscriptions
  - All Subscriptions
  - All Data
- Both fields are required — validation errors shown if either is missing

### AC4 — Report Content

| Report Type | Columns |
|---|---|
| User Accounts | user_id, provenance_user_id, user_provenance, roles, created_date, last_signed_in_date |
| Publications | artefact_id, display_from, display_to, language, provenance, sensitivity, source_artefact_id, superseded_count, type, content_date, court_id, court_name, list_type |
| Location Subscriptions | id, search_value, channel, user_id, court_name, created_date |
| All Subscriptions | id, channel, search_type, user_id, court_name, created_date |

### AC5 — Download
- Clicking "Download report" generates and streams an Excel (`.xlsx`) file
- File naming: `mi-report-{type}-{days}days-{YYYY-MM-DD}.xlsx`
  - e.g. `mi-report-all-data-30days-2026-05-15.xlsx`
- **All Data** produces a single workbook with 4 named tabs matching the existing MI Report format
- Each individual report type produces a single-tab workbook

### AC6 — Welsh Language
- All page content is available in Welsh via `?lng=cy`

---

## Mockups

### System Admin Dashboard (updated)
```
┌──────────────────────────────────────────────────────────────────┐
│  System Admin Dashboard                                          │
│                                                                  │
│  ┌────────────────────────┐  ┌────────────────────────┐         │
│  │ Upload Reference Data  │  │ Delete Court           │         │
│  │ Upload CSV location    │  │ Delete court from      │         │
│  │ reference data         │  │ reference data         │         │
│  └────────────────────────┘  └────────────────────────┘         │
│  ...                                                             │
│  ┌────────────────────────┐                                      │
│  │ Download MI Report  ◄──┼── NEW TILE                          │
│  │ Download management    │                                      │
│  │ information reports    │                                      │
│  └────────────────────────┘                                      │
└──────────────────────────────────────────────────────────────────┘
```

### MI Report Selection Page (`/mi-report`)
```
┌──────────────────────────────────────────────────────────────────┐
│  < Back                                                          │
│                                                                  │
│  Download MI Report                                              │
│  ══════════════════                                              │
│                                                                  │
│  Reporting period                                                │
│  How many days of data do you want to include?                   │
│                                                                  │
│  ○  7 days                                                       │
│  ○  14 days                                                      │
│  ○  21 days                                                      │
│  ○  30 days                                                      │
│                                                                  │
│  Report type                                                     │
│  Select the data you want to download                            │
│                                                                  │
│  ○  User Accounts                                                │
│     User account data including provenance and roles             │
│  ○  Publications                                                 │
│     NoMatch publications with court and list type data           │
│  ○  Location Subscriptions                                       │
│     Subscriptions by location with court names                   │
│  ○  All Subscriptions                                            │
│     All subscriptions including search type                      │
│  ○  All Data                                                     │
│     All of the above in a single file with multiple tabs         │
│                                                                  │
│  [ Download report ]                                             │
└──────────────────────────────────────────────────────────────────┘
```

### Validation error state
```
┌──────────────────────────────────────────────────────────────────┐
│  There is a problem                                              │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ • Select a reporting period                                │  │
│  │ • Select a report type                                     │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  Reporting period                                                │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ Error: Select a reporting period                        │    │
│  └─────────────────────────────────────────────────────────┘    │
│  ○  7 days                                                       │
│  ...                                                             │
└──────────────────────────────────────────────────────────────────┘
```

---

## Technical Notes

- New page at `/mi-report` in `libs/system-admin-pages`
- Data sourced directly from Prisma — `user`, `artefact` (where `noMatch = true`), `subscription` tables
- Period filter applied via `createdDate`/`dateAdded`/`lastReceivedDate >= cutoff`
- Location subscriptions join with `location` table for `court_name`
- File format: `.xlsx` (requires `exceljs` — not currently installed, needs adding to `libs/system-admin-pages/package.json`)
- "All Data" = single workbook with 4 sheets
- File streamed directly — no intermediate storage
- Welsh translations required

## Comments
### Comment by OgechiOkelu on 2026-08-05T09:05:44Z

@spec 

---

### Comment by hmctsclaudecode on 2026-08-05T09:15:56Z

# MI Report Download — System Admin Dashboard

**Issue:** #628
**Target lib:** `libs/system-admin-pages`
**Target page:** `apps/web/src/pages/(system-admin)/mi-report/`

---

## 1. User Story

**As a** System Administrator
**I want to** download MI (Management Information) Reports from the System Admin Dashboard
**So that** I can analyse user accounts, publications, and subscriptions for a selected reporting period without asking an engineer to run a manual query

---

## 2. Background

The MI Report is currently produced by hand as an Excel workbook with four tabs — User Accounts, Publications, Location Subscriptions, All Subscriptions. Producing it needs a developer with production database access, which makes it slow, unrepeatable, and an unnecessary access-privilege risk. This story moves it onto the System Admin Dashboard as a self-service download.

### Existing patterns this feature reuses

| Concern | Existing reference | Notes |
|---|---|---|
| Dashboard tile | `apps/web/src/pages/(system-admin)/system-admin-dashboard/en.ts` — `tiles[]` array rendered by `index.njk` into `.admin-tile` links | Adding one entry to `en.ts` **and** `cy.ts` is the whole change |
| Streamed file download | `apps/web/src/pages/(system-admin)/reference-data-download/index.ts` | `requireRole` → generate → `setHeader` → `send`. Same shape, different content type |
| Radio-group question page | `apps/web/src/pages/(verified)/subscription-add-list-language/index.njk` | `govukRadios` + `govukErrorSummary` + co-located `en.ts`/`cy.ts` |
| Two-radio-group page | `apps/web/src/pages/(system-admin)/reference-data/index.ts` | Locale via `res.locals.locale`, radio items built from content |
| Excel generation | `libs/excel-generation/src/excel/sjp-press-list-excel-generator.ts` | `ExcelJS.Workbook` → `workbook.xlsx.writeBuffer()` → `Buffer.from(buffer)` |
| Excel styling | `libs/excel-generation/src/excel/excel-styles.ts` | `HEADER_FONT`, `HEADER_FILL`, `CELL_BORDER`, `DATA_FONT`, `DATA_ALIGNMENT` — reuse, do not re-declare |
| Prisma report query | `libs/system-admin-pages/src/reference-data-upload/services/download-service.ts` | `generateReferenceDataCsv()` — direct Prisma read, shaped into rows |

### Correction to the issue's Technical Notes

The issue states *"requires `exceljs` — not currently installed, needs adding to `libs/system-admin-pages/package.json`"*. **This is wrong.** `exceljs@4.4.0` is already a dependency of `libs/excel-generation`, which also owns the shared cell-style constants. Do **not** add a second `exceljs` dependency to `libs/system-admin-pages` — that duplicates a dependency (CLAUDE.md pitfall #6) and forks the styling. Instead:

- Put the workbook builder in `libs/excel-generation/src/excel/mi-report-excel-generator.ts` and export it from `libs/excel-generation/src/index.ts`.
- Put the Prisma queries and row shaping in `libs/system-admin-pages/src/mi-report/`.
- Add `"@hmcts/excel-generation": "workspace:*"` to `libs/system-admin-pages/package.json` dependencies.

### Schema gaps — column names in AC4 do not all exist

AC4 lists columns that have no backing field. These must be derived, not selected. Verified against `libs/postgres-prisma/prisma/schema/`:

| AC4 column | Reality | Resolution |
|---|---|---|
| `channel` (both subscription reports) | **No `channel` column on `Subscription`.** Fields are `subscriptionId`, `userId`, `searchType`, `searchValue`, `caseName`, `caseNumber`, `dateAdded` | Emit the constant `"EMAIL"` from a named constant `DEFAULT_SUBSCRIPTION_CHANNEL`. Every subscription today notifies by email via GOV.UK Notify (`libs/notifications`); there is no second channel. See Open Question OQ1 |
| `roles` (User Accounts) | `User.role` is a single `String`, not an array | Map `role` → the `roles` header. One value per row |
| `created_date` (subscriptions) | Column is `dateAdded` | Map `dateAdded` → `created_date` header |
| `id` (subscriptions) | Column is `subscriptionId` | Map `subscriptionId` → `id` header |
| `court_name` (Location Subscriptions) | `Subscription` has **no FK to `Location`** — `searchValue` holds the location ID as a *string* | Fetch distinct `searchValue`s, `Number.parseInt`, batch-load via `prisma.location.findMany({ where: { locationId: { in } } })`, build a `Map<number, string>`. **No Prisma `include` is possible.** |
| `court_name` (All Subscriptions) | Only `LOCATION_ID` rows have a resolvable court | Resolve for `LOCATION_ID` rows; emit `""` for `CASE_NAME`/`CASE_NUMBER` rows |
| `court_name` (Publications) | `Artefact.locationId` is a `String`; `Location.locationId` is an `Int`, no relation defined | Same `Map` lookup approach as above |
| `list_type` (Publications) | `Artefact.listType` **is** a real relation | `include: { listType: { select: { name: true } } }` — use `listType.name`, never `listTypeId` (CLAUDE.md pitfall #15) |
| `court_id` (Publications) | `Artefact.locationId` | Map `locationId` → `court_id` header |

### Period filter fields

| Report | Date field filtered | Rationale |
|---|---|---|
| User Accounts | `User.createdDate` | Accounts created in the window |
| Publications | `Artefact.lastReceivedDate` | Publications received in the window; `contentDate` is the hearing date, not an ingest date |
| Location Subscriptions | `Subscription.dateAdded` | |
| All Subscriptions | `Subscription.dateAdded` | |

---

## 3. Acceptance Criteria

* **Scenario:** System admin sees the new dashboard tile
    * **Given** I am signed in with the `SYSTEM_ADMIN` role
    * **When** I load `/system-admin-dashboard`
    * **Then** a tile titled "Download MI Report" with the description "Download management information reports for user accounts, publications and subscriptions" is shown, linking to `/mi-report`

* **Scenario:** Non-admin cannot see the tile
    * **Given** I am signed in as an `INTERNAL_ADMIN_CTSC` or verified user
    * **When** I load any dashboard
    * **Then** no "Download MI Report" tile is shown, because `/system-admin-dashboard` itself is gated by `requireRole([SYSTEM_ADMIN])`

* **Scenario:** Non-admin navigating directly to `/mi-report` is denied
    * **Given** I am signed in as `INTERNAL_ADMIN_CTSC`
    * **When** I navigate directly to `/mi-report`
    * **Then** `requireRole([USER_ROLES.SYSTEM_ADMIN])` redirects me to `/admin-dashboard` and no report data is queried
    * **Note:** AC1 in the issue says "redirects to 403". The existing `requireRole` in `libs/auth/src/middleware/authorise.ts` **redirects to the caller's own dashboard**, it does not render `errors/403`. Do not fork `requireRole` for this one page — consistency across all 40+ system-admin pages wins. Unauthenticated users go through `redirectUnauthenticated` to `/sign-in` with `returnTo` set. See Open Question OQ2

* **Scenario:** Selection page renders both question groups
    * **Given** I am a system admin on `/mi-report`
    * **When** the page loads
    * **Then** I see a "Reporting period" radio group with 7 / 14 / 21 / 30 days, and a "Report type" radio group with the five options (User Accounts, Publications, Location Subscriptions, All Subscriptions, All Data), each with hint text, and a "Download report" button. No option is pre-selected

* **Scenario:** Both fields missing
    * **Given** I am on `/mi-report`
    * **When** I submit without selecting either field
    * **Then** the page re-renders at HTTP 200 with an error summary titled "There is a problem" listing "Select a reporting period" (linking `#reportingPeriod`) then "Select a report type" (linking `#reportType`), with inline `govuk-error-message` on both fieldsets and `govuk-form-group--error` applied

* **Scenario:** One field missing
    * **Given** I select "30 days" but no report type
    * **When** I submit
    * **Then** only "Select a report type" appears in the summary, and my "30 days" choice remains checked

* **Scenario:** Tampered value rejected
    * **Given** a POST body of `reportingPeriod=9999&reportType=payroll`
    * **When** it is submitted
    * **Then** validation rejects both against the allow-lists and re-renders with the same generic error messages — the request never reaches Prisma

* **Scenario:** Single-report download
    * **Given** I select "14 days" and "Location Subscriptions"
    * **When** I click "Download report"
    * **Then** I receive a one-sheet `.xlsx` named `mi-report-location-subscriptions-14days-2026-08-05.xlsx` with header row `id, search_value, channel, user_id, court_name, created_date` and one row per `LOCATION_ID` subscription with `dateAdded >= cutoff`

* **Scenario:** All Data download
    * **Given** I select "30 days" and "All Data"
    * **When** I click "Download report"
    * **Then** I receive `mi-report-all-data-30days-2026-08-05.xlsx` containing exactly four sheets, in order and named: "User Accounts", "Publications", "Location Subscriptions", "All Subscriptions"

* **Scenario:** Empty result set still downloads
    * **Given** no users were created in the last 7 days
    * **When** I download the User Accounts report for 7 days
    * **Then** I receive a valid `.xlsx` with the header row present and zero data rows — not an error page

* **Scenario:** Welsh
    * **Given** I load `/mi-report?lng=cy`
    * **When** the page renders
    * **Then** all labels, hints, legends, button text and validation messages are Welsh, and submitting with `?lng=cy` still returns an English-headered workbook (data headers are machine-readable field names, not UI copy)

* **Scenario:** Download is audit logged
    * **Given** I download any report
    * **When** the POST completes
    * **Then** an `audit_log` row records the action with my user ID, email, role and provenance, plus the selected period and report type in `details`

---

## 4. User Journey Flow

```
┌──────────────────────────┐
│  /sign-in (SSO)          │
└────────────┬─────────────┘
             │ role = SYSTEM_ADMIN
             ▼
┌──────────────────────────────────────┐
│  /system-admin-dashboard             │
│  … tiles …                           │
│  [Download MI Report]  ◄── NEW       │
└────────────┬─────────────────────────┘
             │ click tile
             ▼
┌──────────────────────────────────────┐
│  GET /mi-report                      │
│  requireRole([SYSTEM_ADMIN])         │
│  Two radio groups, no defaults       │
└────────────┬─────────────────────────┘
             │ POST /mi-report
             ▼
     ┌───────────────────┐
     │ validate both     │
     │ against allowlist │
     └────┬─────────┬────┘
     fail │         │ pass
          ▼         ▼
┌──────────────┐  ┌────────────────────────────────┐
│ re-render    │  │ query Prisma (period cutoff)   │
│ 200 + errors │  │ resolve court names via Map    │
│ keep choices │  │ build ExcelJS workbook         │
└──────────────┘  │ 1 sheet, or 4 for "All Data"   │
                  └───────────────┬────────────────┘
                                  ▼
                  ┌────────────────────────────────┐
                  │ res.setHeader Content-Type     │
                  │   …spreadsheetml.sheet         │
                  │ res.setHeader Content-Disp.    │
                  │   attachment; filename="…"     │
                  │ res.send(buffer)               │
                  │ audit log written              │
                  └───────────────┬────────────────┘
                                  ▼
                  Browser saves file. Page does not
                  navigate — admin stays on /mi-report
                  and can immediately request another.
```

Failure branch: if a query or workbook build throws, the handler logs and renders `errors/500` at HTTP 500. It must not send a truncated/corrupt attachment.

---

## 5. Low Fidelity Wireframe

### System Admin Dashboard (one tile added)

```
┌────────────────────────────────────────────────────────────────────┐
│  GOV.UK  Court and tribunal hearings                               │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  System Admin Dashboard                                            │
│                                                                    │
│  ┌──────────────────────────┐  ┌──────────────────────────┐        │
│  │ Reference Data           │  │ Delete Court             │        │
│  │ Upload CSV data, manage  │  │ Delete court from        │        │
│  │ jurisdiction and …       │  │ reference data           │        │
│  └──────────────────────────┘  └──────────────────────────┘        │
│  ┌──────────────────────────┐  ┌──────────────────────────┐        │
│  │ … existing tiles …       │  │ … existing tiles …       │        │
│  └──────────────────────────┘  └──────────────────────────┘        │
│  ┌──────────────────────────┐                                      │
│  │ Download MI Report    ◄──┼───── NEW (appended, last tile)       │
│  │ Download management      │                                      │
│  │ information reports for  │                                      │
│  │ user accounts, …         │                                      │
│  └──────────────────────────┘                                      │
└────────────────────────────────────────────────────────────────────┘
```

### `/mi-report` — initial state

```
┌────────────────────────────────────────────────────────────────────┐
│  ‹ Back                                                            │
│                                                                    │
│  Download MI Report                                     (h1, xl)   │
│                                                                    │
│  Reporting period                                (legend, medium)  │
│  How many days of data do you want to include?           (hint)    │
│                                                                    │
│   ( )  7 days                                                      │
│   ( )  14 days                                                     │
│   ( )  21 days                                                     │
│   ( )  30 days                                                     │
│                                                                    │
│  Report type                                     (legend, medium)  │
│  Select the data you want to download                    (hint)    │
│                                                                    │
│   ( )  User Accounts                                               │
│        User account data including provenance and roles            │
│   ( )  Publications                                                │
│        Publications with court and list type data                  │
│   ( )  Location Subscriptions                                      │
│        Subscriptions by location with court names                  │
│   ( )  All Subscriptions                                           │
│        All subscriptions including search type                     │
│   ( )  All Data                                                    │
│        All of the above in a single file with multiple tabs        │
│                                                                    │
│  ┌────────────────────┐                                            │
│  │  Download report   │                                            │
│  └────────────────────┘                                            │
└────────────────────────────────────────────────────────────────────┘
```

### `/mi-report` — validation error state (both missing)

```
┌────────────────────────────────────────────────────────────────────┐
│  ‹ Back                                                            │
│                                                                    │
│  ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓  │
│  ┃ There is a problem                                          ┃  │
│  ┃                                                             ┃  │
│  ┃  • Select a reporting period          → #reportingPeriod    ┃  │
│  ┃  • Select a report type               → #reportType         ┃  │
│  ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛  │
│                                                                    │
│  Download MI Report                                                │
│                                                                    │
│ ┃ Reporting period                                                 │
│ ┃ How many days of data do you want to include?                    │
│ ┃ ✖ Error: Select a reporting period                               │
│ ┃  ( )  7 days                                                     │
│ ┃  ( )  14 days                                                    │
│ ┃  ( )  21 days                                                    │
│ ┃  ( )  30 days                                                    │
│  ▲ 5px red left border (govuk-form-group--error)                   │
│                                                                    │
│ ┃ Report type                                                      │
│ ┃ Select the data you want to download                             │
│ ┃ ✖ Error: Select a report type                                    │
│ ┃  ( )  User Accounts …                                            │
│                                                                    │
│  ┌────────────────────┐                                            │
│  │  Download report   │                                            │
│  └────────────────────┘                                            │
└────────────────────────────────────────────────────────────────────┘
```

---

## 6. Page Specifications

### 6.1 Files to create

```
apps/web/src/pages/(system-admin)/mi-report/
├── index.ts             # GET + POST, both wrapped in requireRole
├── index.njk            # two govukRadios + govukButton
├── en.ts                # English content
├── cy.ts                # Welsh content
├── index.test.ts        # controller unit tests
└── index.njk.test.ts    # template render tests (Cheerio)

libs/system-admin-pages/src/mi-report/
├── queries.ts           # Prisma reads, one per report type
├── queries.test.ts
├── service.ts           # buildMiReport(): orchestrates queries → rows → buffer
├── service.test.ts
├── validation.ts        # validateMiReportSelection()
└── validation.test.ts

libs/excel-generation/src/excel/
├── mi-report-excel-generator.ts       # generateMiReportExcel(sheets) → Buffer
├── mi-report-excel-generator.test.ts
└── excel-headers.ts                   # EXTEND with MI_REPORT_HEADERS

e2e-tests/tests/system-admin/
└── mi-report.spec.ts    # one journey test
```

### 6.2 Files to modify

| File | Change |
|---|---|
| `apps/web/src/pages/(system-admin)/system-admin-dashboard/en.ts` | Append tile `{ title: "Download MI Report", description: "…", href: "/mi-report" }` |
| `apps/web/src/pages/(system-admin)/system-admin-dashboard/cy.ts` | Append the Welsh equivalent — **key parity is asserted by a test** |
| `libs/system-admin-pages/src/index.ts` | Export `buildMiReport`, `validateMiReportSelection`, the `MiReportType`/`ReportingPeriodDays` types, and the option constants |
| `libs/excel-generation/src/index.ts` | Export `generateMiReportExcel` |
| `libs/system-admin-pages/package.json` | Add `"@hmcts/excel-generation": "workspace:*"` |
| `libs/system-admin-pages/src/audit-log/logger.ts` | Add `DOWNLOAD_MI_REPORT = "Download MI report"` to `AuditLogAction` |
| `e2e-tests/tests/system-admin/system-admin-dashboard.spec.ts` | Tile count assertions `toHaveCount(9)` → `toHaveCount(N+1)`; add the new tile to `tileData` |

> The dashboard E2E spec is currently `test.describe.skip(...)` and its `tileData` list is already stale (it lists 8 tiles against a `toHaveCount(9)`, and `en.ts` actually has 10). Fix the counts to match `en.ts` rather than adding to the existing drift.

### 6.3 Controller — `apps/web/src/pages/(system-admin)/mi-report/index.ts`

Module order per CLAUDE.md: top-level consts → exported functions → helpers → types at the bottom.

```
GET  = [requireRole([USER_ROLES.SYSTEM_ADMIN]), getHandler]
POST = [requireRole([USER_ROLES.SYSTEM_ADMIN]), postHandler]
```

`getHandler`
- `const locale = res.locals.locale || "en"` (matches `reference-data`, `audit-log-list`)
- `const t = locale === "cy" ? cy : en`
- `res.render("mi-report/index", { en, cy, t, periodItems, reportTypeItems, errors: undefined })`
- `periodItems` / `reportTypeItems` built from `t` by a shared `buildRadioItems(t, selected)` helper so GET and POST cannot drift

`postHandler`
- Read `reportingPeriod` and `reportType` from `req.body` as `string | undefined`
- `const errors = validateMiReportSelection({ reportingPeriod, reportType })`
- If `errors.length > 0`: re-render the same template at 200 with `errors`, `periodError`, `reportTypeError`, and radio items rebuilt with the submitted (valid) values marked `checked` — never echo an invalid value back into a `value` attribute
- Otherwise:
  - `const { buffer, filename } = await buildMiReport(reportType, Number(reportingPeriod))`
  - `res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")`
  - `res.setHeader("Content-Disposition", \`attachment; filename="${filename}"\`)`
  - `res.send(buffer)`
- Wrap the generation branch in `try/catch`; on error `console.error` then `res.status(500).render("errors/500", { en, cy, locale })`

Because the existing `auditLogMiddleware` wraps `res.send` and logs `"success"` for POSTs by a `SYSTEM_ADMIN`, the download is audit logged with **no controller change needed**. Set `req.auditMetadata = { action: AuditLogAction.DOWNLOAD_MI_REPORT, entityInfo: \`${reportType} / ${reportingPeriod} days\` }` before `res.send` so the log entry names the report rather than the path-derived `MI_REPORT`. Note the same middleware logs `"validation_error"` on any `res.render` carrying `errors` — the validation path is therefore logged too, which is correct and needs nothing extra.

### 6.4 Service — `libs/system-admin-pages/src/mi-report/service.ts`

```
MI_REPORT_TYPES        = ["user-accounts","publications","location-subscriptions","all-subscriptions","all-data"]
REPORTING_PERIOD_DAYS  = [7, 14, 21, 30]
DEFAULT_SUBSCRIPTION_CHANNEL = "EMAIL"
```

`buildMiReport(reportType, days)` →
1. `const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000)` — computed once and passed to every query so a multi-sheet workbook is internally consistent.
2. Dispatch through a `Partial<Record<MiReportType, () => Promise<SheetSpec>>>` registry — a named-key lookup, not a `switch`, matching the `PDF_GENERATOR_REGISTRY` pattern.
3. `all-data` awaits all four sheet builders (`Promise.all`) and returns them in the fixed order.
4. `generateMiReportExcel(sheets)` → `Buffer`.
5. Filename: `mi-report-${reportType}-${days}days-${toIsoDate(new Date())}.xlsx`, where `toIsoDate` is `d.toISOString().split("T")[0]` — identical to `reference-data-download`. `reportType` is already the kebab-case slug, so no extra transformation and no user-controlled text ever reaches the header.

`SheetSpec` (type, at the bottom of the file): `{ name: string; columns: Array<{ header: string; key: string; width: number }>; rows: Array<Record<string, string>> }`. Every value is pre-stringified in the service so the generator does no formatting decisions.

### 6.5 Queries — `libs/system-admin-pages/src/mi-report/queries.ts`

All queries are Prisma, parameterised, `select`-narrowed (never `select: *`), and ordered deterministically so downloads are diff-able.

**User Accounts**
```
prisma.user.findMany({
  where: { createdDate: { gte: cutoff } },
  orderBy: { createdDate: "desc" },
  select: { userId, userProvenanceId, userProvenance, role, createdDate, lastSignedInDate }
})
```
Header ↔ field: `user_id`←`userId`, `provenance_user_id`←`userProvenanceId`, `user_provenance`←`userProvenance`, `roles`←`role`, `created_date`←`createdDate`, `last_signed_in_date`←`lastSignedInDate` (`""` when null).

**Publications**
```
prisma.artefact.findMany({
  where: { noMatch: true, lastReceivedDate: { gte: cutoff } },
  orderBy: { lastReceivedDate: "desc" },
  select: { artefactId, displayFrom, displayTo, language, provenance, sensitivity,
            sourceArtefactId, supersededCount, type, contentDate, locationId,
            listType: { select: { name: true } } }
})
```
`court_name` resolved via the location `Map`; `list_type`←`listType.name`. **`listTypeId` is never selected or emitted** (CLAUDE.md pitfall #15).

> `noMatch: true` is taken verbatim from the issue's Technical Notes. It means the report covers only publications whose court could not be matched to a known location — which also means `court_name` will legitimately be blank for most rows. That is a narrow definition for a report titled "Publications". See Open Question OQ3.

**Location Subscriptions**
```
prisma.subscription.findMany({
  where: { searchType: "LOCATION_ID", dateAdded: { gte: cutoff } },
  orderBy: { dateAdded: "desc" },
  select: { subscriptionId, searchValue, userId, dateAdded }
})
```

**All Subscriptions**
```
prisma.subscription.findMany({
  where: { dateAdded: { gte: cutoff } },
  orderBy: { dateAdded: "desc" },
  select: { subscriptionId, searchType, searchValue, userId, dateAdded }
})
```

**Court name resolution** — one helper, `resolveCourtNames(locationIdStrings: string[]): Promise<Map<string, string>>`:
- `Number.parseInt` each unique id, drop `NaN`
- if the resulting array is empty, return an empty `Map` **without** hitting the database
- `prisma.location.findMany({ where: { locationId: { in: ids } }, select: { locationId: true, name: true } })`
- key the `Map` by the original string form so callers do not re-parse
- Deleted courts (`deletedAt != null`) are **included** — a historic subscription to a since-deleted court still needs its name in an MI report. Do not filter on `deletedAt`.
- Unresolvable ids yield `""`, never `"undefined"`

This is a fixed two-query-per-sheet pattern (rows, then names). It must not become a per-row lookup.

`SEARCH_TYPE_LOCATION_ID = "LOCATION_ID"` is a named constant, matching `libs/subscriptions/src/repository/queries.ts`.

### 6.6 Excel generator — `libs/excel-generation/src/excel/mi-report-excel-generator.ts`

`generateMiReportExcel(sheets: SheetSpec[]): Promise<Buffer>`
- `new ExcelJS.Workbook()`; `addWorksheet(sheet.name)` per spec, in array order
- `worksheet.columns = sheet.columns`
- Header row: `HEADER_FONT`, `HEADER_FILL`, `HEADER_ALIGNMENT`, `CELL_BORDER`
- Data rows: `DATA_FONT`, `DATA_ALIGNMENT`, `CELL_BORDER`
- `Buffer.from(await workbook.xlsx.writeBuffer())`
- Sheet names are internal constants ≤ 31 chars with no `: \ / ? * [ ]` — Excel's hard limits. Never derived from user input.
- Headers live in `MI_REPORT_HEADERS` in `excel-headers.ts` alongside the existing SJP header maps.

Date cells are written as `YYYY-MM-DD HH:mm:ss` strings (`date-only` for `contentDate`, which is `@db.Date`) so the file opens identically regardless of the reader's locale. A shared `formatDateTime`/`formatDate` pair in `service.ts` does this; no Excel date types.

### 6.7 Performance and memory

The workbook is built fully in memory and sent with `res.send`, not piped. At a 30-day window this is comfortably small; a full-history export would not be, which is exactly why the period selector is mandatory and capped at 30 days. Do **not** add an "all time" option. If row counts later grow past ~100k, revisit with `workbook.xlsx.write(res)` streaming — out of scope now (YAGNI).

---

## 7. Content

### 7.1 `apps/web/src/pages/(system-admin)/mi-report/en.ts`

```typescript
export const en = {
  title: "Download MI Report",
  heading: "Download MI Report",
  back: "Back",
  backHref: "/system-admin-dashboard",

  reportingPeriodLegend: "Reporting period",
  reportingPeriodHint: "How many days of data do you want to include?",
  period7: "7 days",
  period14: "14 days",
  period21: "21 days",
  period30: "30 days",

  reportTypeLegend: "Report type",
  reportTypeHint: "Select the data you want to download",
  userAccounts: "User Accounts",
  userAccountsHint: "User account data including provenance and roles",
  publications: "Publications",
  publicationsHint: "Publications with court and list type data",
  locationSubscriptions: "Location Subscriptions",
  locationSubscriptionsHint: "Subscriptions by location with court names",
  allSubscriptions: "All Subscriptions",
  allSubscriptionsHint: "All subscriptions including search type",
  allData: "All Data",
  allDataHint: "All of the above in a single file with multiple tabs",

  downloadButton: "Download report",

  errorSummaryTitle: "There is a problem",
  reportingPeriodRequired: "Select a reporting period",
  reportTypeRequired: "Select a report type"
};
```

### 7.2 `apps/web/src/pages/(system-admin)/mi-report/cy.ts`

Identical key set — parity is asserted by test.

```typescript
export const cy = {
  title: [WELSH TRANSLATION REQUIRED: "Download MI Report"],
  heading: [WELSH TRANSLATION REQUIRED: "Download MI Report"],
  back: Yn ôl,
  backHref: "/system-admin-dashboard",

  reportingPeriodLegend: [WELSH TRANSLATION REQUIRED: "Reporting period"],
  reportingPeriodHint: [WELSH TRANSLATION REQUIRED: "How many days of data do you want to include?"],
  period7: [WELSH TRANSLATION REQUIRED: "7 days"],
  period14: [WELSH TRANSLATION REQUIRED: "14 days"],
  period21: [WELSH TRANSLATION REQUIRED: "21 days"],
  period30: [WELSH TRANSLATION REQUIRED: "30 days"],

  reportTypeLegend: [WELSH TRANSLATION REQUIRED: "Report type"],
  reportTypeHint: [WELSH TRANSLATION REQUIRED: "Select the data you want to download"],
  userAccounts: [WELSH TRANSLATION REQUIRED: "User Accounts"],
  userAccountsHint: [WELSH TRANSLATION REQUIRED: "User account data including provenance and roles"],
  publications: [WELSH TRANSLATION REQUIRED: "Publications"],
  publicationsHint: [WELSH TRANSLATION REQUIRED: "Publications with court and list type data"],
  locationSubscriptions: [WELSH TRANSLATION REQUIRED: "Location Subscriptions"],
  locationSubscriptionsHint: [WELSH TRANSLATION REQUIRED: "Subscriptions by location with court names"],
  allSubscriptions: [WELSH TRANSLATION REQUIRED: "All Subscriptions"],
  allSubscriptionsHint: [WELSH TRANSLATION REQUIRED: "All subscriptions including search type"],
  allData: [WELSH TRANSLATION REQUIRED: "All Data"],
  allDataHint: [WELSH TRANSLATION REQUIRED: "All of the above in a single file with multiple tabs"],

  downloadButton: [WELSH TRANSLATION REQUIRED: "Download report"],

  errorSummaryTitle: Mae problem,
  reportingPeriodRequired: [WELSH TRANSLATION REQUIRED: "Select a reporting period"],
  reportTypeRequired: [WELSH TRANSLATION REQUIRED: "Select a report type"]
};
```

### 7.3 Dashboard tile content

`system-admin-dashboard/en.ts` — append:
```typescript
{
  title: "Download MI Report",
  description: "Download management information reports for user accounts, publications and subscriptions",
  href: "/mi-report"
}
```

`system-admin-dashboard/cy.ts` — append:
```typescript
{
  title: [WELSH TRANSLATION REQUIRED: "Download MI Report"],
  description: [WELSH TRANSLATION REQUIRED: "Download management information reports for user accounts, publications and subscriptions"],
  href: "/mi-report"
}
```

### 7.4 Workbook content (never translated)

Sheet names and column headers are machine-readable identifiers consumed by downstream analysis, so they stay in English regardless of `?lng`.

| Sheet name | Headers (in order) |
|---|---|
| User Accounts | `user_id`, `provenance_user_id`, `user_provenance`, `roles`, `created_date`, `last_signed_in_date` |
| Publications | `artefact_id`, `display_from`, `display_to`, `language`, `provenance`, `sensitivity`, `source_artefact_id`, `superseded_count`, `type`, `content_date`, `court_id`, `court_name`, `list_type` |
| Location Subscriptions | `id`, `search_value`, `channel`, `user_id`, `court_name`, `created_date` |
| All Subscriptions | `id`, `channel`, `search_type`, `user_id`, `court_name`, `created_date` |

Content-design notes:
- Button reads "Download report", not "Continue" — it performs the action rather than advancing a journey (GDS button guidance).
- Report-type labels use the Title Case from the issue and the existing manual workbook so admins can map old file to new. This is a deliberate exception to GDS sentence case, justified by them naming a known artefact.
- No help text beyond the hints already specified in the issue.

---

## 8. URL

| Method | Path | Auth | Response |
|---|---|---|---|
| `GET` | `/mi-report` | `requireRole([SYSTEM_ADMIN])` | 200 HTML selection page |
| `POST` | `/mi-report` | `requireRole([SYSTEM_ADMIN])` | 200 `.xlsx` attachment, or 200 HTML with errors, or 500 `errors/500` |

Routing: pages under `apps/web/src/pages/(system-admin)/` are auto-discovered. `(system-admin)` is a route group, so it contributes no URL segment — the directory `mi-report/` yields exactly `/mi-report`. No registration in `app.ts` is needed.

`?lng=cy` is handled by `localeMiddleware` and read from `res.locals.locale`.

Filename pattern: `mi-report-{type}-{days}days-{YYYY-MM-DD}.xlsx`

| Selection | Filename (on 2026-08-05) |
|---|---|
| User Accounts, 7 | `mi-report-user-accounts-7days-2026-08-05.xlsx` |
| Publications, 14 | `mi-report-publications-14days-2026-08-05.xlsx` |
| Location Subscriptions, 21 | `mi-report-location-subscriptions-21days-2026-08-05.xlsx` |
| All Subscriptions, 30 | `mi-report-all-subscriptions-30days-2026-08-05.xlsx` |
| All Data, 30 | `mi-report-all-data-30days-2026-08-05.xlsx` |

---

## 9. Validation

`validateMiReportSelection(input): ErrorItem[]` in `libs/system-admin-pages/src/mi-report/validation.ts`, returning `Array<{ href: string; field: "reportingPeriod" | "reportType" }>`. Following the `delete-court/validation.ts` convention, the validator returns field identity only; the controller attaches locale-specific `text`. This keeps all user-facing copy in `en.ts`/`cy.ts` and out of the lib.

| Field | Rule | Error key | `href` |
|---|---|---|---|
| `reportingPeriod` | Present, non-empty after trim | `reportingPeriodRequired` | `#reportingPeriod` |
| `reportingPeriod` | Must be one of `"7"`, `"14"`, `"21"`, `"30"` (string allow-list, no coercion before checking) | `reportingPeriodRequired` | `#reportingPeriod` |
| `reportType` | Present, non-empty after trim | `reportTypeRequired` | `#reportType` |
| `reportType` | Must be one of the five slugs in `MI_REPORT_TYPES` | `reportTypeRequired` | `#reportType` |

Rules:
- Errors are returned in field order — reporting period first, report type second — so the summary order always matches the visual page order (WCAG 2.4.3 Focus Order).
- An out-of-range or garbage value produces the same generic "Select a…" message as a missing one. A tampered POST is not a user mistake needing bespoke guidance, and a distinct message would confirm probing.
- Allow-list, never deny-list. Values are compared as strings and only `Number()`-converted after passing.
- `reportType` flows into the filename. Because only the five known slugs can pass, no user-controlled text can reach the `Content-Disposition` header — this closes header-injection and path-traversal in the filename.
- If `req.body` gives an array (duplicate form fields), it fails the allow-list and is rejected. Do not take `[0]`.
- No client-side validation. The server is the only enforcement point (progressive enhancement).

---

## 10. Error Messages

### Validation (HTTP 200, page re-rendered)

| Condition | Summary link text | Inline message | Target |
|---|---|---|---|
| No reporting period | "Select a reporting period" | "Error: Select a reporting period" | `#reportingPeriod` |
| No report type | "Select a report type" | "Error: Select a report type" | `#reportType` |
| Both missing | Both, period first | Both | Both |
| Invalid period value | "Select a reporting period" | same | `#reportingPeriod` |
| Invalid report type value | "Select a report type" | same | `#reportType` |

Summary title: "There is a problem". Page `<title>` is prefixed "Error: " when `errors` is set, matching `subscription-add-list-language/index.njk`.

Welsh equivalents: `[WELSH TRANSLATION REQUIRED: "Select a reporting period"]`, `[WELSH TRANSLATION REQUIRED: "Select a report type"]`, `Mae problem`, `[WELSH TRANSLATION REQUIRED: "Error"]`.

### System errors

| Condition | Behaviour |
|---|---|
| Prisma query throws | `console.error` with context; `res.status(500).render("errors/500", { en, cy, locale })` |
| ExcelJS build throws | Same |
| Unauthorised role | `requireRole` redirects to that role's dashboard (no message rendered) |
| Unauthenticated | `redirectUnauthenticated` → `/sign-in`, `session.returnTo` set to `/mi-report` |

No error page ever exposes a SQL fragment, stack trace or table name. Zero matching rows is **not** an error — an empty-but-valid workbook is returned.

---

## 11. Navigation

- **Entry:** the "Download MI Report" tile on `/system-admin-dashboard`. No other route links here.
- **Back link:** `govukBackLink` in the `backLink` block, `href="/system-admin-dashboard"`, text from `t.back`. Rendered on every state including the error state.
- **After download:** no redirect. The response is an attachment, so the browser stays on `/mi-report` with the form still populated, letting an admin pull several reports in a row. This is the same non-navigating behaviour as `reference-data-download`.
- **After validation failure:** re-render in place, same URL, HTTP 200, previously-valid selections preserved. No redirect, no session round-trip — nothing needs to survive a redirect.
- **Language toggle:** the service-navigation toggle appends `?lng=cy`/`?lng=en`; `localeMiddleware` also persists to session and cookie. The `<form>` posts to the current URL so the language choice survives submission.
- **No session state.** Selection lives entirely in the POST body. Nothing is written to `req.session`, so there is no stale-state class of bug and no cleanup.

---

## 12. Accessibility

Target: **WCAG 2.2 AA**.

### Structure
- One `<h1>` — "Download MI Report" — matching the page `<title>`.
- Two `govukRadios` groups, each in its own `<fieldset>` with a `<legend>` (`govuk-fieldset__legend--m`). The h1 is a standalone heading, **not** an `isPageHeading` legend, because the page carries two questions — `isPageHeading: true` is only correct for a single-question page.
- Each fieldset's hint is wired via `aria-describedby` on the fieldset (handled by the GOV.UK macro when `hint` is passed).
- Radio hint text uses each item's `hint` property, giving each input its own `aria-describedby` — not a loose `<p>`.

### Errors
- `govukErrorSummary` is the first element inside the content column, with `titleText` "There is a problem". The macro renders `role="alert"` and takes focus on load.
- Summary items are anchors to `#reportingPeriod` / `#reportType` — the **first radio input** of each group, so activating the link moves focus into the group.
- Inline errors use `govuk-error-message` with a `govuk-visually-hidden` "Error:" prefix, and are added to the fieldset's `aria-describedby`.
- `govuk-form-group--error` supplies the 5px red left border, so the error is signalled by position and text as well as colour (WCAG 1.4.1).
- Error state returns HTTP 200 with the page re-rendered — never a redirect that would lose the announcement.

### Keyboard and pointer
- Tab reaches: skip link → header/nav → back link → reporting-period group → report-type group → "Download report". Arrow keys move within a radio group; Space selects. Standard GOV.UK behaviour, no custom JS.
- Focus indicators are the GOV.UK yellow default — never suppressed.
- Radio targets are 40×40px with GOV.UK label padding, meeting 2.5.8 Target Size (Minimum) of 24×24.

### Screen readers
- No option is pre-checked, so nothing is silently submitted on behalf of a user who skipped a group.
- The download is a normal form POST returning an attachment. There is no `aria-live` progress announcement — none is needed, and a fake one would be worse. If generation ever becomes slow enough to need feedback, that is a separate story.
- `novalidate` on the form, so all messaging is the server's consistent GOV.UK copy rather than inconsistent browser bubbles.

### Progressive enhancement
Zero JavaScript required. The page is a plain form; the download is a plain POST response. It works with JS disabled, on old browsers, and through assistive tech unchanged.

### Testing
- `axeCheck(page).analyze()` inline in the E2E journey, on both the initial and the error state, asserting `violations` is `[]`.
- Keyboard-only traversal of both groups and submission via keyboard, inside the same journey test.

---

## 13. Test Scenarios

### Controller unit tests — `apps/web/src/pages/(system-admin)/mi-report/index.test.ts`
* GET renders `mi-report/index` with `en`, `cy`, `t` and both radio-item collections, and with `errors` undefined
* GET with `res.locals.locale = "cy"` passes the Welsh object as `t`
* POST with no fields re-renders with two errors, ordered reporting-period-first, and does not call `buildMiReport`
* POST with only a reporting period re-renders with one error and keeps that period marked `checked`
* POST with an out-of-allow-list `reportingPeriod` re-renders with errors and never calls `buildMiReport`
* POST with an out-of-allow-list `reportType` behaves likewise
* POST with valid input calls `buildMiReport` with the parsed numeric period and the report-type slug
* POST with valid input sets the spreadsheetml `Content-Type`, an `attachment` `Content-Disposition` matching `/^attachment; filename="mi-report-[a-z-]+-(7|14|21|30)days-\d{4}-\d{2}-\d{2}\.xlsx"$/`, and sends the buffer
* POST sets `req.auditMetadata.action` to `DOWNLOAD_MI_REPORT` before sending
* POST renders `errors/500` at status 500 when `buildMiReport` rejects, and sends no partial attachment
* Both GET and POST are exported as arrays whose first element is the `requireRole` middleware

### Template tests — `index.njk.test.ts`
* Renders one `<h1>` containing the English title
* Renders exactly two `fieldset` elements with the reporting-period and report-type legends
* Renders 4 reporting-period radio inputs with values `7`, `14`, `21`, `30`
* Renders 5 report-type radio inputs with the five expected slug values
* Renders a hint for every report-type radio
* No radio is `checked` on first render
* Renders no error summary when `errors` is undefined (`assertNoErrors`)
* Renders an error summary containing both messages, with `href` values `#reportingPeriod` and `#reportType`, when `errors` is supplied (`assertErrorSummary`)
* Applies `govuk-form-group--error` to only the fieldset that has an error
* Preserves the previously-selected reporting period as `checked` in the error state
* Renders Welsh legends, hints and button text when rendered with `cy`
* `Object.keys(en).sort()` equals `Object.keys(cy).sort()`
* Renders the back link pointing at `/system-admin-dashboard`
* Prefixes the page title with "Error: " when `errors` is set

### Validation tests — `libs/system-admin-pages/src/mi-report/validation.test.ts`
* Returns an empty array for each of the 20 valid period × type combinations
* Returns two errors when both fields are absent
* Returns two errors when both fields are empty strings
* Returns two errors when both fields are whitespace only
* Returns one period error for each invalid period value (`"0"`, `"31"`, `"7.5"`, `"-7"`, `"seven"`)
* Returns one type error for an unknown slug
* Returns errors in field order regardless of input key order
* Rejects an array value for either field

### Query tests — `libs/system-admin-pages/src/mi-report/queries.test.ts` (Prisma mocked)
* User Accounts query filters `createdDate >= cutoff` and selects only the six needed fields
* Publications query filters both `noMatch: true` and `lastReceivedDate >= cutoff`
* Publications query includes the `listType` name relation and never selects `listTypeId`
* Location Subscriptions query filters `searchType: "LOCATION_ID"` and `dateAdded >= cutoff`
* All Subscriptions query filters on `dateAdded` only, with no `searchType` constraint
* `resolveCourtNames` de-duplicates ids and issues exactly one `location.findMany`
* `resolveCourtNames` skips the database entirely for an empty or all-unparseable input
* `resolveCourtNames` includes soft-deleted courts (does not filter on `deletedAt`)
* `resolveCourtNames` omits unparseable `searchValue`s rather than passing `NaN` to Prisma

### Service tests — `libs/system-admin-pages/src/mi-report/service.test.ts`
* Each single report type produces one sheet with the exact AC4 headers in the documented order
* `all-data` produces four sheets named and ordered "User Accounts", "Publications", "Location Subscriptions", "All Subscriptions"
* `all-data` passes one shared cutoff to all four queries
* Cutoff is computed as now minus days × 86 400 000 ms
* Null `lastSignedInDate` becomes an empty string, not `"null"`
* Null `sourceArtefactId` becomes an empty string
* `role` is emitted under the `roles` header
* `channel` is emitted as the `DEFAULT_SUBSCRIPTION_CHANNEL` constant for every subscription row
* All Subscriptions emits a blank `court_name` for `CASE_NAME` and `CASE_NUMBER` rows and a resolved name for `LOCATION_ID` rows
* An unresolvable location id yields an empty `court_name`, never `"undefined"`
* Dates render as fixed `YYYY-MM-DD` / `YYYY-MM-DD HH:mm:ss` strings independent of process timezone
* Filename is built from the report slug, day count and today's ISO date
* An empty result set yields a sheet with headers and zero rows

### Excel generator tests — `libs/excel-generation/src/excel/mi-report-excel-generator.test.ts`
* Returns a `Buffer` that re-reads through `ExcelJS` without error
* Creates one worksheet per sheet spec, in order, with the given names
* Writes the header row and applies `HEADER_FONT`/`HEADER_FILL`
* Writes one data row per row spec, with cells in column order
* Produces a valid workbook for a spec with headers and zero rows
* Every sheet name is ≤ 31 characters and free of Excel-forbidden characters

### Dashboard tests
* `system-admin-dashboard/index.njk.test.ts` renders one `a.admin-tile` per entry in `en.tiles`, including the new one with `href="/mi-report"`
* English and Welsh tile arrays have equal length and matching `href` values at every index

### E2E — `e2e-tests/tests/system-admin/mi-report.spec.ts`
One journey test, per the minimum-tests rule — it covers validation, Welsh, accessibility, keyboard and the download in a single flow:
* Sign in via SSO as system admin → assert the "Download MI Report" tile is visible on the dashboard → click through to `/mi-report` → submit empty and assert both summary errors → run `axeCheck` on the error state → switch to Welsh and assert the translated legend → switch back → select "30 days" and "All Data" by keyboard → run `axeCheck` on the populated state → submit and capture the download → assert the filename matches `mi-report-all-data-30days-<today>.xlsx` and the payload is a non-empty `.xlsx`

Not covered by E2E (covered by unit tests instead): every period × type combination, workbook internals, per-field validation permutations.

---

## 14. Assumptions & Open Questions

### Assumptions
* **A1** — `exceljs` is **already** available via `libs/excel-generation`. The issue's claim that it needs installing is incorrect; the workbook builder goes in that lib and reuses its shared style constants.
* **A2** — `channel` is emitted as the constant `"EMAIL"` because no `channel` column exists on `Subscription` and GOV.UK Notify email is the only delivery mechanism in `libs/notifications`. Kept as a named constant so it becomes a real column with a one-line change.
* **A3** — `roles` (plural, per AC4) maps to the singular `User.role` column. Emitted as a single value per row, header name unchanged for compatibility with the existing manual workbook.
* **A4** — Court names come from `Location.name` (English) for all locales. `Location.welshName` exists, but an MI extract is an analysis artefact, not user-facing content; a language-dependent data column would make files non-comparable.
* **A5** — Soft-deleted courts (`Location.deletedAt != null`) are included in name resolution, because historic rows still need labels.
* **A6** — The period cutoff is inclusive (`gte`) at exact-time minus N days, not calendar-day-truncated to midnight. Consistent across all four sheets.
* **A7** — Workbook headers and sheet names stay English in Welsh mode. Welsh applies to the UI only.
* **A8** — The tile is appended last on the dashboard, keeping existing tile positions stable for admins who navigate by muscle memory.
* **A9** — Downloads are audit logged automatically by the existing `auditLogMiddleware` `res.send` interception; only a new `AuditLogAction` member and `req.auditMetadata` are added.
* **A10** — No rate limiting or concurrency guard. A single-replica-per-admin, hand-driven download at ≤ 30 days of data does not warrant one (YAGNI). Revisit if row volumes grow.
* **A11** — Data is read live from the primary database via Prisma. No read replica, cache or intermediate blob storage.

### Open Questions
* **OQ1 — `channel` semantics.** The column is in AC4 but not in the schema. Confirm `"EMAIL"` as the constant, or specify where a real channel value should come from. If third-party/API delivery (`third_party_subscription`) should be represented, that is a schema change and a separate story.
* **OQ2 — 403 versus redirect.** AC1 says direct navigation without the role "redirects to 403". The shared `requireRole` redirects to the caller's own dashboard instead, and is used by every other system-admin page. This spec follows the existing behaviour. Confirm that is acceptable, or raise a separate story to change `requireRole` service-wide — it should not be forked for one page.
* **OQ3 — `noMatch: true` on Publications.** The Technical Notes restrict the Publications sheet to unmatched publications, which means `court_name` and `court_id` will usually be blank — odd for a report whose stated purpose is "publications with court and list type data". Confirm whether the intent is genuinely NoMatch-only (an exception report) or all publications in the period.
* **OQ4 — Users with no activity.** Is the User Accounts sheet meant to be accounts *created* in the window (as specified) or all accounts with *any* activity in it (i.e. `lastSignedInDate` in range)? The former is implemented; the latter is a plausible reading of "analyse user accounts for a selected time period".
* **OQ5 — PII and retention.** The workbook contains `user_id`, `provenance_user_id` and subscription values. Are there handling, retention or logging constraints on the downloaded artefact beyond the audit-log entry? Should the audit entry record the row count?
* **OQ6 — Column parity with the manual report.** Has the existing hand-produced workbook been diffed column-for-column against AC4? Any silent divergence will break whatever downstream spreadsheet or dashboard consumes it today.
* **OQ7 — Existing dashboard E2E drift.** `system-admin-dashboard.spec.ts` is `.skip`ped and its assertions are already stale (8 listed tiles, `toHaveCount(9)`, 10 actual). This spec fixes the counts, but should the suite be un-skipped as part of this work, or is it skipped deliberately pending SSO test credentials?


---

### Comment by OgechiOkelu on 2026-08-05T09:17:09Z

@plan 
