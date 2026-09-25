# Plan: #628 — MI Report Download (System Admin Dashboard)

## 1. Technical Approach

Add a new self-serve MI Report download to the System Admin Dashboard. A System
Admin picks a reporting period (7/14/21/30 days, or "From the beginning") and a
report type (four individual reports + "All Data"), then downloads an `.xlsx`
workbook streamed directly from the request — no intermediate storage. A
windowed period applies its date cutoff to all four report types; "From the
beginning" applies no cutoff and includes all data (resolves CQ1).

Architecture decisions:

- **Page lives in `apps/web`, logic lives in `libs`.** Controller + template +
  co-located `en.ts`/`cy.ts` go in `apps/web/src/pages/(system-admin)/mi-report/`.
  Prisma queries, row shaping, validation and the `buildMiReport` orchestration
  service go in `libs/system-admin-pages/src/mi-report/`. The ExcelJS workbook
  builder goes in `libs/excel-generation` (reuse the shared styles), matching the
  existing separation where excel rendering is owned by that lib.
- **No new dependency.** `exceljs@4.4.0` is already pinned in
  `libs/excel-generation`. `libs/system-admin-pages` gains
  `"@hmcts/excel-generation": "workspace:*"` and calls the new builder — it does
  NOT import `exceljs` directly. (The ticket's Technical Note claiming exceljs
  "not currently installed" is stale — verified against
  `libs/excel-generation/package.json`.)
- **No schema change.** Every AC4 column maps to an existing Prisma field
  (mapping table in §2). Verified against
  `libs/postgres-prisma/prisma/schema/{base,subscription,location}.prisma`.
- **`listTypeName` never `listTypeId`.** Publications `list_type` comes from the
  `listType.name` relation; court resolution uses `Location.name`.
- **Access control is the existing `requireRole([USER_ROLES.SYSTEM_ADMIN])`.**
  It is NOT forked. It redirects unauthorised roles to their own dashboard and
  unauthenticated users to sign-in (see CQ4 / §3).
- **Audit via the existing middleware.** `auditLogMiddleware()` (registered in
  `apps/web/src/app.ts`) wraps `res.send`/`res.redirect` and auto-logs POST for
  SYSTEM_ADMIN users. The controller sets `req.auditMetadata` (action +
  entityInfo) before streaming so the entry names the report correctly.
- **Bilingual UI, English data.** All page copy is translated; workbook headers,
  sheet names and the filename stay English so the artefact is machine-readable
  and comparable regardless of UI locale.

Report generation flow (single POST):

```
POST /mi-report
  → requireRole([SYSTEM_ADMIN])
  → validateMiReportSelection(req.body)         // allow-lists; reject arrays/tampered
       ├─ invalid → re-render GET page with GOV.UK error summary (field order)
       └─ valid   → buildMiReport(reportType, period)
                       ├─ cutoff = period === "all" ? undefined : now - days
                       ├─ registry[reportType](cutoff) → rows (Promise.all for all-data)
                       ├─ resolve court names via Map<string, Location.name>
                       └─ generateMiReportExcel(sheets) → Buffer
                    → set req.auditMetadata (DOWNLOAD_MI_REPORT + details)
                    → set Content-Type + Content-Disposition
                    → res.send(buffer)           // middleware logs on send
```

## 2. Implementation Details

### Files to create

**`libs/excel-generation/`**
- `src/excel/mi-report-excel-generator.ts` — `generateMiReportExcel(sheets:
  MiReportSheet[]): Promise<Buffer>`. Builds one worksheet per sheet definition
  (`{ name, headers, rows }`), applies the shared `excel-styles.ts`
  header/data/border styling, returns a Buffer. A single-report call passes one
  sheet; "All Data" passes four.
- `src/excel/mi-report-excel-generator.test.ts`
- Export `generateMiReportExcel` from `src/index.ts`.

**`libs/system-admin-pages/src/mi-report/`**
- `queries.ts` — Prisma reads (one function per report type). Each takes an
  optional `cutoff?: Date` and applies the period `where` clause only when a
  cutoff is supplied (omitted entirely for "From the beginning"); selects only
  needed fields.
- `service.ts` — `buildMiReport(reportType, period)`: derives the shared cutoff
  (`undefined` when `period === "all"`), a
  `Partial<Record<MiReportType, (cutoff?: Date) => Promise<MiReportSheet>>>`
  registry (not a `switch`), `all-data` composes the four sheets via
  `Promise.all`; builds the filename
  `mi-report-{type}-{period-token}-{YYYY-MM-DD}.xlsx` where the period token is
  `{days}days` (e.g. `30days`) or `from-beginning`; delegates rendering to
  `generateMiReportExcel`. Returns `{ buffer, filename }`.
- `court-name-resolver.ts` — builds a `Map<string, string>` from a single
  `Location.findMany` keyed by `locationId` (as string) → `name`, used to resolve
  Publications `court_name` (from `locationId`) and location-subscription
  `court_name` (from `searchValue`). Unresolvable → `""`.
- `validation.ts` — `validateMiReportSelection(body)`: string allow-lists
  (`"7"|"14"|"21"|"30"|"all"`; five report slugs), rejects array values and
  unknown strings, returns field-ordered errors (period first, then type) with
  generic messages. Because only known slugs pass, the filename is always safe.
- `queries.test.ts`, `service.test.ts`, `validation.test.ts`.
- Add exports (`buildMiReport`, `validateMiReportSelection`, `MiReportType`) to
  `libs/system-admin-pages/src/index.ts`.

**`apps/web/src/pages/(system-admin)/mi-report/`**
- `index.ts` — `GET` renders the selection page; `POST` validates → streams or
  re-renders with errors; sets `req.auditMetadata`. Both guarded by
  `requireRole([USER_ROLES.SYSTEM_ADMIN])`.
- `index.njk` — GOV.UK page: back link, error summary, two `govukRadios`
  fieldsets (period, report type with hint descriptions), "Download report"
  button. Extends `layouts/base-template.njk`, uses `page_content` block.
- `en.ts`, `cy.ts` — co-located page content (Welsh as placeholders, see CQ7).
- `index.test.ts`, `index.njk.test.ts`.

### Files to modify

- `apps/web/src/pages/(system-admin)/system-admin-dashboard/en.ts` and `cy.ts` —
  append the "Download MI Report" tile (`href: "/mi-report"`). (AC2)
- `libs/system-admin-pages/src/audit-log/logger.ts` — add
  `DOWNLOAD_MI_REPORT = "Download MI report"` to `AuditLogAction`.
- `libs/system-admin-pages/package.json` — add
  `"@hmcts/excel-generation": "workspace:*"`.
- `libs/excel-generation/src/index.ts` — export the new generator.
- `e2e-tests/tests/system-admin/system-admin-dashboard.spec.ts` — fix stale
  counts to 11 and correct the `href`s (see CQ10 for un-skip decision).

### Template source (verbatim)

> Migrate from pip-frontend `download-mi-report` (legacy `download-mi-report.njk`
> / `DownloadMiReportService.ts` in pip-frontend).

Implementation runs the migrate-pip-pages skill itself; fetch/adapt/verify steps
are not reproduced in this plan.

### API endpoints

- `GET /mi-report` — render the selection page (SYSTEM_ADMIN only).
- `POST /mi-report` — validate selection; on success stream the `.xlsx`
  (`Content-Type:
  application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`,
  `Content-Disposition: attachment;
  filename="mi-report-{type}-{days}days|from-beginning-{YYYY-MM-DD}.xlsx"`);
  on failure re-render with errors.

### Schema change: NONE required — AC4 column mapping

| Report | AC4 column | Source field | Notes |
|---|---|---|---|
| User Accounts | user_id | `User.userId` | |
| | provenance_user_id | `User.userProvenanceId` | |
| | user_provenance | `User.userProvenance` | |
| | roles | `User.role` | single value; header stays `roles` (CQ8) |
| | created_date | `User.createdDate` | period filter field |
| | last_signed_in_date | `User.lastSignedInDate` | nullable |
| Publications | artefact_id | `Artefact.artefactId` | |
| | display_from | `Artefact.displayFrom` | |
| | display_to | `Artefact.displayTo` | |
| | language | `Artefact.language` | |
| | provenance | `Artefact.provenance` | |
| | sensitivity | `Artefact.sensitivity` | |
| | source_artefact_id | `Artefact.sourceArtefactId` | nullable |
| | superseded_count | `Artefact.supersededCount` | |
| | type | `Artefact.type` | |
| | content_date | `Artefact.contentDate` | |
| | court_id | `Artefact.locationId` | |
| | court_name | `Location.name` (Map from `locationId`) | no FK/`include` |
| | list_type | `Artefact.listType.name` | never `listTypeId` |
| | (filter) | `Artefact.lastReceivedDate` | period filter field |
| Location Subscriptions | id | `Subscription.subscriptionId` | |
| | search_value | `Subscription.searchValue` | |
| | channel | const `DEFAULT_SUBSCRIPTION_CHANNEL = "EMAIL"` | no column (CQ3) |
| | user_id | `Subscription.userId` | |
| | court_name | `Location.name` (Map from `searchValue`) | LOCATION_ID subs |
| | created_date | `Subscription.dateAdded` | period filter field |
| All Subscriptions | id | `Subscription.subscriptionId` | |
| | channel | const `"EMAIL"` | no column (CQ3) |
| | search_type | `Subscription.searchType` | |
| | user_id | `Subscription.userId` | |
| | court_name | `Location.name` (Map, LOCATION_ID only) | else `""` |
| | created_date | `Subscription.dateAdded` | period filter field |

Every column maps to a live field — confirmed no migration is needed.

## 3. Error Handling & Edge Cases

- **Empty result sets** — a query returning zero rows produces a valid workbook
  with a header-only sheet. Do not 404 or error; an empty period is legitimate.
- **Tampered / malformed POST values** — `validateMiReportSelection` uses strict
  string allow-lists, rejects arrays (`period[]=7`) and unknown strings, and
  returns generic field-ordered errors. Because only known slugs reach
  `buildMiReport`, the filename and sheet routing can never be injected.
- **Prisma / ExcelJS failures** — `buildMiReport` throws; the controller lets it
  propagate to the global error handler (renders the standard problem page). No
  partial/truncated file is streamed because headers are only set immediately
  before `res.send(buffer)`, after the buffer is fully built.
- **Court-name resolution** — unresolvable `locationId`/`searchValue`, or a
  soft-deleted location (`Location.deletedAt` set), resolves to `""`. The
  resolver Map includes soft-deleted rows so historic artefacts still show a
  name where one exists; rows never disappear because a court was deleted.
- **Unauthorised (wrong role)** — `requireRole` redirects to the caller's own
  dashboard (SYSTEM_ADMIN → `/system-admin-dashboard`, other admins →
  `/admin-dashboard`). No `errors/403` render (see CQ4).
- **Unauthenticated** — `requireRole` stores `returnTo` and redirects to
  `/sign-in`.
- **Audit on failure** — the middleware auto-logs validation re-renders
  (`res.render` with `errors`) and successful sends; a thrown error short-circuits
  before `res.send`, so no misleading "success" entry is written.

## 4. Acceptance Criteria Mapping

- **AC1 — Access control.** `GET`/`POST /mi-report` guarded by
  `requireRole([USER_ROLES.SYSTEM_ADMIN])`; tile only rendered on the
  SYSTEM_ADMIN dashboard. *Verify:* controller unit test asserts the guard is the
  first handler; E2E asserts a non-admin is redirected away (note CQ4 — redirect,
  not a 403 page).
- **AC2 — Dashboard tile.** New tile appended to `system-admin-dashboard`
  `en.ts`/`cy.ts` with the exact label and description, `href: "/mi-report"`.
  *Verify:* dashboard template test asserts 11 tiles and the new href.
- **AC3 — Selection page.** Two required `govukRadios` groups (period 7/14/21/30
  days + "From the beginning"; five report types) with server-side validation.
  *Verify:* template test asserts both fieldsets/all five period options render;
  validation test covers missing-period, missing-type, both-missing (field
  order), and accepts `"all"`.
- **AC4 — Report content.** Column mapping table in §2; `queries.ts` selects
  exactly those fields; `list_type` via `listType.name`; `court_name` via
  resolver Map. *Verify:* queries + service unit tests assert header order and row
  shape per report; generator test asserts sheet columns.
- **AC5 — Download.** `buildMiReport` returns `{ buffer, filename }`; controller
  streams `.xlsx` with the
  `mi-report-{type}-{days}days|from-beginning-{YYYY-MM-DD}.xlsx` filename; "All
  Data" = one workbook with four named sheets, each single report = one sheet.
  *Verify:* service test asserts filename grammar for both a windowed period and
  "From the beginning", and sheet count (1 vs 4); controller test asserts headers
  + `res.send(buffer)`.
- **AC6 — Welsh.** Co-located `cy.ts` mirrors `en.ts`; controller selects `t` by
  `res.locals.locale`; workbook stays English by design. *Verify:* template test
  renders with `cy` and asserts translated headings; key-parity test
  (`Object.keys(en).sort() === Object.keys(cy).sort()`).

## 5. CLARIFICATIONS NEEDED

Each carries the plan's chosen default (implement the ACs as written unless the
product owner says otherwise) plus the impact of the alternative.

- **CQ1 — Does the reporting period apply to all four reports, or Publications
  only? — RESOLVED.** The reporting-period group gains a fifth option, **"From
  the beginning"**, alongside 7/14/21/30 days. A windowed period applies its
  cutoff to **all four** report types (User Accounts `createdDate`, Publications
  `lastReceivedDate`, both subscriptions `dateAdded`); **"From the beginning"**
  applies no cutoff and returns all data — reproducing the legacy "from
  beginning" behaviour when the admin wants a workbook comparable with the manual
  report. The choice is explicit and per-download, so no all-four-vs-Publications
  compromise is baked in.
- **CQ2 — Should Publications filter on `noMatch = true`?** **Default: NO filter**
  (reverses the earlier `@spec`). In cath-service `noMatch = !locationExists`, so
  filtering blanks `court_id`/`court_name` on nearly every row, contradicting AC4.
  *Alternative:* keep the filter → near-empty court columns, fewer rows.
- **CQ3 — `channel` contents; are third-party subscriptions in scope?**
  **Default: emit constant `"EMAIL"`**; third-party (`ThirdPartySubscription`,
  no link to `Subscription`) is **out of scope**. *Alternative:* model API
  delivery (`API_COURTEL`) → separate story/join; current output silently omits
  third-party subs (lossy but acceptable for MI).
- **CQ4 — AC1 says "redirects to 403"; middleware redirects to the caller's
  dashboard.** **Default: keep existing `requireRole` behaviour** (dashboard
  redirect, no `errors/403`). Do not fork it for one page. *Alternative:* a
  bespoke 403 render diverges from every other system-admin page.
- **CQ5 — Option value casing.** **Default: kebab-case slugs**
  (`user-accounts`, `all-data`, …) — required for the filename. *Alternative:*
  legacy `USER_ACCOUNTS` wire values; only needed if an external caller posts to
  `/mi-report` (none known).
- **CQ6 — `.xlsx`-for-all + new filename grammar + new tab order break existing
  consumers.** **Default: follow ACs** (all reports `.xlsx`, new filename, AC4 tab
  order) — strictly better than legacy CSV-per-report. *Alternative:* preserve
  legacy CSV/`.xlsx` split and filenames if a downstream consumer is keyed on the
  old format (none identified — confirm).
- **CQ7 — Welsh copy.** **Default: ship `[WELSH TRANSLATION REQUIRED: "..."]`
  placeholders** (legacy `cy` was byte-identical English, nothing to migrate).
  *Alternative:* real translations — needs a Welsh content source/owner. Confirm
  placeholders are acceptable to merge.
- **CQ8 — Column parity with the manual workbook.** **Default: match AC4** —
  Publications includes `court_name` (13 fields vs legacy 12); User Accounts
  header stays `roles` (plural) though it maps to single `User.role`.
  *Alternative:* rename to `role` — safer semantically but breaks parity with the
  manual sheet's header. Confirm header spelling.
- **CQ9 — PII & retention.** Workbook contains `user_id`, `provenance_user_id`
  and subscription search values. **Default: audit-log the download only**
  (action + report type + period; no row-level data logged). *Alternative:*
  additional retention/handling controls or recording row counts — confirm
  whether row count in the audit `details` is wanted and whether any
  retention/DLP constraint applies beyond the audit entry.
- **CQ10 — Un-skip `system-admin-dashboard.spec.ts`?** **Default: fix the counts
  (→ 11 tiles) and href but leave the suite `.skip`ped** pending SSO test
  credentials (it depends on `SSO_TEST_SYSTEM_ADMIN_*`). *Alternative:* un-skip
  now — only viable once creds exist in CI, otherwise it fails the pipeline.
