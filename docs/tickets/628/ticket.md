# #628: MI Report Download - System Admin Dashboard

**State:** OPEN
**Assignees:** alao-daniel
**Author:** junaidiqbalmoj
**Labels:** (none)
**Created:** 2026-05-15T08:08:32Z
**Updated:** 2026-08-18T16:03:15Z

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

### Comment by hmctsclaudecode on 2026-08-05T09:15:56Z

*(Detailed spec — MI Report Download. Key points captured below; full spec in the issue thread.)*

- **Target lib:** `libs/system-admin-pages`. **Target page:** `apps/web/src/pages/(system-admin)/mi-report/`.
- **exceljs is already available** via `libs/excel-generation` (pins `exceljs@4.4.0`). Do NOT add a second dependency. Put the workbook builder in `libs/excel-generation/src/excel/mi-report-excel-generator.ts`; put Prisma queries + row shaping in `libs/system-admin-pages/src/mi-report/`. Add `"@hmcts/excel-generation": "workspace:*"` to `libs/system-admin-pages/package.json`.
- **Schema gaps:** `channel` has no column on `Subscription` → emit constant `DEFAULT_SUBSCRIPTION_CHANNEL = "EMAIL"`. `roles` maps to single `User.role`. `created_date`←`dateAdded`, `id`←`subscriptionId`. `court_name` resolved via `Map` from `searchValue`/`locationId` string → `Location.name` (no FK, no `include`). `list_type`←`listType.name` (never `listTypeId`). `court_id`←`locationId`.
- **Period filter fields:** User Accounts `createdDate`; Publications `lastReceivedDate`; both subscriptions `dateAdded`.
- **Existing patterns to reuse:** dashboard tile (`system-admin-dashboard/en.ts` `tiles[]`); streamed download (`reference-data-download/index.ts`); radio-group page (`subscription-add-list-language`, `reference-data`); Excel generation/styling (`libs/excel-generation` — `excel-styles.ts`); Prisma report query (`reference-data-upload/services/download-service.ts`).
- **Access:** `requireRole([USER_ROLES.SYSTEM_ADMIN])` — redirects to caller's dashboard, does NOT render `errors/403`. Do not fork it for one page.
- **Audit:** existing `auditLogMiddleware` wraps `res.send`; add `AuditLogAction.DOWNLOAD_MI_REPORT` and set `req.auditMetadata` before send.
- **Service:** `buildMiReport(reportType, days)` with a shared cutoff, a `Partial<Record<MiReportType, ...>>` registry (not a switch), `all-data` = 4 sheets via `Promise.all`. Filename `mi-report-{type}-{days}days-{YYYY-MM-DD}.xlsx`.
- **Validation:** `validateMiReportSelection` — string allow-lists (`"7"|"14"|"21"|"30"`, five slugs), field-order errors, reject array values, generic messages for tampered input. Filename safe because only known slugs pass.
- **Workbook headers/sheet names stay English** in Welsh mode (machine-readable). UI is fully translated.
- Files to create/modify, full test scenarios (controller, template, validation, queries, service, generator, dashboard, one E2E journey) enumerated in the spec.

### Comment by OgechiOkelu on 2026-08-05T09:17:09Z
@plan

### Comment by hmctsclaudecode on 2026-08-05T09:33:48Z

## Planning complete — clarifications needed

Plan pushed to `feature/628-mi-report-download`. **Important context:** this page already exists in the legacy service (`pip-frontend` `download-mi-report.njk`, `DownloadMiReportService.ts`, plus MI queries in `pip-data-management`, `pip-account-management`, `pip-subscription-management`). ACs verified against that implementation. Questions ranked by impact:

- **CQ1 — Does the reporting period apply to all four reports, or Publications only?** (highest impact) Legacy applied it to **Publications only**; other three sheets were unconditionally "from beginning". AC3/AC5 apply the period to all four — a deliberate behaviour change making the new workbook non-comparable with the manual one. If "Publications only", it is one `where` clause per query.
- **CQ2 — Should the Publications sheet filter on `noMatch = true`?** Legacy MI query had **no such filter**. In cath-service `Artefact.noMatch = !validation.locationExists`, so filtering blanks `court_id`/`court_name` on nearly every row, contradicting AC4. Plan reverses the earlier `@spec` and implements **without** the filter. Confirm.
- **CQ3 — `channel`: what should it contain, and are third-party subscriptions in scope?** No `channel` column exists. Legacy had `EMAIL` and `API_COURTEL`. API delivery is modelled separately as `ThirdPartySubscription` (no link to `Subscription`). Emitting `"EMAIL"` is lossy — third-party subs silently absent. Acceptable, or separate story?
- **CQ4 — AC1 says "redirects to 403"; middleware redirects to caller's dashboard.** Confirm existing behaviour is fine — should not be forked for one page.
- **CQ5 — Option value casing.** Legacy wire values were `USER_ACCOUNTS` etc. Plan uses kebab-case (needed by filename). Confirm nothing external posts legacy values.
- **CQ6 — `.xlsx`-for-all, new filename grammar and new tab order will break existing consumers.** Legacy single reports were CSV; only ALL_DATA was `.xlsx`. Different filename and tab order. Following ACs (strictly better). Confirm no consumer keyed on old format.
- **CQ7 — Welsh translation genuinely required; no source to migrate.** Legacy `cy` file was byte-identical English. All Welsh ships as `[WELSH TRANSLATION REQUIRED: "..."]`. Who supplies copy; are placeholders acceptable?
- **CQ8 — Column parity with manual workbook.** User Accounts + both subscription sheets match AC4. Publications: legacy has 12 fields, AC4 lists 13 (adds `court_name`). `roles` plural vs single `User.role`. Rename to `role` or keep plural?
- **CQ9 — PII and retention.** Workbook contains `user_id`, `provenance_user_id`, subscription search values. Any handling/retention/logging constraints beyond audit-log? Record row count?
- **CQ10 — Should `system-admin-dashboard.spec.ts` be un-skipped?** It is `.skip`ped and stale (`toHaveCount(9)` vs 10 actual, 8 `tileData` entries, wrong href). Plan fixes counts to 11 and corrects href. Un-skip now, or skipped pending SSO test creds?

Also: the ExcelJS Technical Note is already satisfied (`libs/excel-generation` pins `exceljs@4.4.0`). **No schema change or migration needed** — every AC4 column maps to an existing field.
