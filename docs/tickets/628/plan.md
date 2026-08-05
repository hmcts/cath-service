# Technical Plan — #628 MI Report Download (System Admin Dashboard)

**Issue:** #628
**Route:** `/mi-report`
**Page:** `apps/web/src/pages/(system-admin)/mi-report/`
**Logic libs:** `libs/system-admin-pages` (queries, service, validation), `libs/excel-generation` (workbook builder)

This plan supersedes the earlier `@spec` comment on the issue where the two conflict. The
`@spec` comment is largely accurate and is treated as the baseline; every point below marked
**REVERSES SPEC** or **NEW** is a verified correction that wins.

---

## 1. Technical Approach

### 1.1 Divergences from the legacy pip-frontend implementation (read this first)

A working legacy implementation of this page already exists and was fetched and read. The issue's
ACs are **not** a faithful port of it. These are the material divergences; each one is a real
behaviour change, not a refactor.

| # | Area | Legacy pip behaviour (verified) | This issue's AC | Decision |
|---|---|---|---|---|
| 1 | **Page markup** | `src/main/views/system-admin/download-mi-report.njk` uses two `govukSelect` dropdowns (`reportDuration`, `reportType`), an `h1`, a `<p>`, a submit button. **No validation, no error summary, no error states at all.** | Two `govukRadios` groups with per-item hint text plus a GOV.UK error summary and inline errors | **Follow the AC.** GDS treats `select` as a last resort (`.claude/rules/design.md`); radios are correct for ≤5 options. Migration value is limited to locale content and the option vocabulary. |
| 2 | **Reporting period scope** | Period applies to **Publications only**. Legacy `DownloadMiReportService.ts`: `generateUserAccountsMiData`, `generateAllSubscriptionsMiData`, `generateLocationSubscriptionsMiData` take **no** duration argument and label their file `from_beginning`. Only `generatePublicationMiData` takes `reportDuration`. Backend queries confirm: `UserRepository.getAccountDataForMi()` is `FROM PiUser` with no date filter; `SubscriptionRepository.getAllSubsDataForMiV2()` / `getLocationSubsDataForMiV2()` have no date filter (the latter filters only `searchType='LOCATION_ID'`); only `ArtefactRepository.getMiDataWithPublicationReceivedDate` filters `lastReceivedDate >= :date`. The legacy en copy says so verbatim: *"Report duration applies only to the Publications report. All other reports will include data from the beginning."* | AC3/AC5 apply the period to **all four** reports | **Implement the AC as written** (period applies to all four), but this is a deliberate behaviour change that makes the new files non-comparable with the existing hand-produced workbook. **Top open question (CQ1).** The toggle is one `where` clause per query, so reversing it is cheap. |
| 3 | **Duration options** | Five options: 7, 14, 21, 30 and **"From beginning"** (value `null`) | Four options: 7, 14, 21, 30 | **Follow the AC.** Do not add an all-time option — an unbounded export is built fully in memory (see 1.4). |
| 4 | **Option value casing** | SCREAMING_SNAKE: `USER_ACCOUNTS`, `PUBLICATIONS`, `LOCATION_SUBSCRIPTIONS`, `ALL_SUBSCRIPTIONS`, `ALL_DATA` | Not specified; AC5's filename implies kebab-case | **Use kebab-case slugs** (`user-accounts`, …) as the wire value. AC5's `mi-report-all-data-30days-…` filename then needs no transformation, and the slug can be interpolated into `Content-Disposition` safely because it is allow-listed. Divergence noted (CQ5). |
| 5 | **File format** | Single-report downloads were **CSV** (`text/csv`, `.csv`, with a UTF-8 BOM). Only `ALL_DATA` was `.xlsx` — and it still sent `Content-Type: text/csv` with an `.xlsx` filename (a bug). Filename: `{type}_report_{last_N_days\|from_beginning}_{YYYY_MM_DD}_{HHMMSSmmm}.csv` | `.xlsx` for **all** report types; filename `mi-report-{type}-{days}days-{YYYY-MM-DD}.xlsx` | **Follow the AC.** It is strictly better and fixes the legacy content-type bug. Anything consuming the legacy CSV filename/format breaks (CQ6). |
| 6 | **All Data tab order** | Publications, User Accounts, All Subscriptions, Location Subscriptions | User Accounts, Publications, Location Subscriptions, All Subscriptions | **Follow the AC order.** Tab positions move for anyone with an existing macro or pivot (CQ6). |
| 7 | **Empty result sets** | Headers derived dynamically from `Object.keys(data[0])`, so an empty set produced a sheet with **no header row**; the CSV path wrote the literal string `"No data found"` | Not specified | **Explicit column definitions, headers always present, zero data rows.** Do not port `"No data found"`. |
| 8 | **`noMatch` filter on Publications** | `getMiDataWithPublicationReceivedDate` has **no** noMatch or location filter — it returns *all* artefacts received in the window. The legacy NoMatch queries (`findAllNoMatchArtefacts`, `countNoMatchArtefacts`, matching `location_id LIKE '%NoMatch%'`) belong to a **different feature** (NoMatch alerting), not the MI report. | Technical Notes say `artefact (where noMatch = true)` | **REVERSES SPEC.** The prior `@spec` comment specified `noMatch: true`. Implement **without** the `noMatch` filter — all publications received in the window. The issue's note is almost certainly a misreading of the legacy code, and filtering on it would blank `court_id`/`court_name` on nearly every row, contradicting AC4's stated intent ("Publications with court and list type data"). One-line toggle, flagged as CQ2. |
| 9 | **`channel` column** | `channel` was a **real persisted column** on `Subscription` and had **two** values, not one. `getAllSubsDataForMiV2()` selects `(id, channel, searchType, userId, locationName, createdDate)`; `getLocationSubsDataForMiV2()` selects `(s.id, s.searchValue, s.channel, s.userId, s.locationName, s.createdDate)`. The enum (`pip-data-models` `Channel.java`) is `EMAIL("EMAIL")` and `API_COURTEL("API")`. Legacy also carried a denormalised `locationName` on `Subscription`. | AC4 lists `channel` | **PARTIALLY REVERSES SPEC.** The spec asserted "EMAIL is the only channel that ever existed" — that is wrong for the legacy data. In *this* repo there genuinely is no `channel` column (verified `subscription.prisma`), and API delivery is modelled separately as `ThirdPartySubscription` (`third-party-user.prisma`) with **no** link to `Subscription`. Emitting the constant `"EMAIL"` is a defensible stopgap for cath-service's current model, but it is **lossy**: third-party/API subscriptions will be silently absent from both subscription sheets. Flagged as CQ3. |
| 10 | **Column parity** | Verified from the JPA projection constructors: `AccountMiData(userId, provenanceUserId, userProvenance, roles, createdDate, lastSignedInDate)`; `PublicationMiData(artefactId, displayFrom, displayTo, language, provenance, sensitivity, sourceArtefactId, supersededCount, type, contentDate, locationId, listType)` — **12** fields; `LocationSubscriptionMiData(id, searchValue, channel, userId, locationName, createdDate)`; `AllSubscriptionMiData(id, channel, searchType, userId, locationName, createdDate)` | AC4 Publications lists **13** columns | User Accounts and both subscription sheets match legacy exactly (`locationName` → `court_name`). Publications adds `court_name` — **new in AC4**; `court_id` maps to legacy `locationId`. Note legacy `roles` was genuinely a collection; cath-service `User.role` is singular. Flagged as CQ8. |
| 11 | **Welsh** | `src/main/resources/locales/cy/download-mi-report.json` is **byte-identical English** — the legacy service never translated this page | AC6 requires Welsh | There is **no Welsh source to migrate**. Genuine translation is required; every string must be marked `[WELSH TRANSLATION REQUIRED: "..."]` until a translator supplies copy. Flagged as CQ7. |

### 1.2 Settled points (do not re-litigate)

These were verified and are correct as stated in the `@spec` comment:

- `exceljs@4.4.0` is **already** a dependency of `libs/excel-generation` (`libs/excel-generation/package.json`). The issue's Technical Note that it "needs adding to `libs/system-admin-pages/package.json`" is **wrong**. Put the workbook builder in `libs/excel-generation`; add `"@hmcts/excel-generation": "workspace:*"` to `libs/system-admin-pages/package.json`.
- Reuse the shared style constants from `libs/excel-generation/src/excel/excel-styles.ts` — `HEADER_FONT`, `HEADER_FILL`, `HEADER_ALIGNMENT`, `DATA_FONT`, `DATA_ALIGNMENT`, `CELL_BORDER`. Do not redeclare them.
- Mirror `libs/excel-generation/src/excel/sjp-press-list-excel-generator.ts`: `new ExcelJS.Workbook()` → `addWorksheet` → `worksheet.columns = [{ header, key, width }]` → style header row via `headerRow.eachCell` → `addRow(rowData)` + style → `Buffer.from(await workbook.xlsx.writeBuffer())`.
- Headers go in `libs/excel-generation/src/excel/excel-headers.ts` alongside `SJP_PUBLIC_LIST_HEADERS` / `SJP_PRESS_LIST_HEADERS`.
- `User.role` is a single `String @db.VarChar(20)` (`base.prisma:55`), not an array.
- `Subscription` has **no FK to Location**. `searchValue` holds the location id as a `String`; `Location.locationId` is an `Int`. `Artefact.locationId` is a `String` with no `Location` relation either. Court names must be resolved with a batched `prisma.location.findMany({ where: { locationId: { in: ids } } })` → `Map`. **A Prisma `include` is not possible.**
- `Artefact.listType` **is** a real relation (`base.prisma:29`) → `select: { listType: { select: { name: true } } }`. Never select or emit `listTypeId` (CLAUDE.md pitfall #15).
- `Location` has `deletedAt DateTime?` and `welshName String @unique` (`location.prisma:69-83`).
- `requireRole` (`libs/auth/src/middleware/authorise.ts`) does **not** render `errors/403` — it redirects unauthorised roles to their own dashboard and role-less users to `/sign-in` with `session.returnTo`. AC1's "redirects to 403" does not match existing behaviour. **Do not fork `requireRole` for one page** (CQ4).
- `auditLogMiddleware` (`libs/system-admin-pages/src/audit-log/middleware.ts`) wraps `res.send` and logs `"success"` for POSTs by `SYSTEM_ADMIN`, and logs `"validation_error"` on any `res.render` carrying truthy `errors`. It is registered in `apps/web/src/app.ts:190-191` **before** the page router. `req.auditMetadata` is a declared Express `Request` augmentation with `{ shouldLog?, action?, entityInfo? }`. The download is therefore audit-logged with no controller change beyond setting `req.auditMetadata` **before** `res.send`.
- `AuditLogAction` lives at `libs/system-admin-pages/src/audit-log/logger.ts:3`. Members are alphabetical: `DOWNLOAD_MI_REPORT` sorts after `DELETE_USER` and before `MANUAL_UPLOAD`.
- Dashboard tile change is exactly one appended entry in the `tiles[]` array of **both** `apps/web/src/pages/(system-admin)/system-admin-dashboard/en.ts` (currently **10** tiles) and `cy.ts`. `index.njk` loops `{% for tile in tiles %}` rendering `a.admin-tile`.
- Dashboard E2E drift is real: `e2e-tests/tests/system-admin/system-admin-dashboard.spec.ts` is `test.describe.skip(...)`, asserts `toHaveCount(9)` in three places, lists only 8 entries in `tileData`, and one href is wrong (`/user-management` — the actual `en.ts` href is `/find-users`). Fix counts to **11** and correct the href rather than adding to the drift.
- `(system-admin)` is a route group contributing no URL segment, so `apps/web/src/pages/(system-admin)/mi-report/` yields exactly `/mi-report`. **No `app.ts` registration.**
- `res.locals.locale` is set by `localeMiddleware` (`libs/web-core/src/middleware/i18n/locale-middleware.ts`); `renderInterceptorMiddleware` auto-selects between `en`/`cy` render options and merges `res.locals`, so `res.render(view, { en, cy, t, ... })` is the correct call shape.
- Validation convention: `libs/system-admin-pages/src/delete-court/validation.ts` returns `{ href }` only; the controller attaches locale-specific `text`. Follow this.
- In-repo radio-page reference: `apps/web/src/pages/(system-admin)/reference-data/index-radios.njk` (`govukRadios` with `items: radioItems`, `errorMessage: radioError`, `govukErrorSummary` gated on `{% if errors %}`). Controller reference `apps/web/src/pages/(system-admin)/reference-data/index.ts` builds items from content in **both** GET and POST.
- Streamed download reference: `apps/web/src/pages/(system-admin)/reference-data-download/index.ts` — `GET: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN]), getHandler]`, `setHeader` Content-Type + Content-Disposition, `res.send`.
- Template test helpers `createTestEnvironment`, `render`, `assertNoErrors`, `assertErrorSummary` are exported from `@hmcts/test-support` (`libs/test-support/src/nunjucks-test-helper.ts`).

### 1.3 500 handling — use `next(error)`, not `res.render("errors/500", { en, cy, locale })`

`libs/web-core/src/views/errors/500.njk` expects `t.title`, `t.heading`, `t.tryAgain`, `t.contactLink`,
`t.contactSuffix`, sourced from `libs/web-core/src/views/errors/en.ts` `en.error500` / `cy.ts`.

The in-repo convention for a page rendering it directly is
`res.status(500).render("errors/500", { en, cy, locale })` — see
`apps/web/src/pages/(list-types)/sjp-press-list/index.ts:86`. **That pattern is buggy**: it passes the
*page's* `en`/`cy`, which have no `error500` keys, so the template renders blank headings.

**Decision:** the `mi-report` POST catch block calls `next(error)` and lets the global `errorHandler`
(`libs/web-core/src/middleware/govuk-frontend/error-handler.ts`) handle it — that handler passes the
correct `en.error500` / `cy.error500` / `t`, logs the stack, and honours `NODE_ENV` for detail leakage.
This also guarantees no truncated attachment is sent, because headers are only set on the success path
immediately before `res.send`.

### 1.4 Memory and scale

The workbook is built fully in memory and sent with `res.send`, not piped. At a 30-day window this is
small. This is precisely why the period selector is mandatory and capped at 30 days, and why the legacy
"From beginning" option is not being ported. If row counts later exceed ~100k, revisit with
`workbook.xlsx.write(res)` streaming — out of scope (YAGNI).

### 1.5 No database schema changes

**No new or modified `.prisma` files, no migration.** Every AC4 column either maps to an existing field
or is derived in the service layer:

| AC4 column | Source |
|---|---|
| `user_id`, `provenance_user_id`, `user_provenance`, `created_date`, `last_signed_in_date` | `User.userId` / `userProvenanceId` / `userProvenance` / `createdDate` / `lastSignedInDate` |
| `roles` | `User.role` (singular → plural header, for parity with the existing manual workbook) |
| `artefact_id`, `display_from`, `display_to`, `language`, `provenance`, `sensitivity`, `source_artefact_id`, `superseded_count`, `type`, `content_date` | `Artefact.*` direct |
| `court_id` | `Artefact.locationId` |
| `list_type` | `Artefact.listType.name` via the relation |
| `id` (subscriptions) | `Subscription.subscriptionId` |
| `search_value`, `search_type`, `user_id` | `Subscription.*` direct |
| `created_date` (subscriptions) | `Subscription.dateAdded` |
| `court_name` (all three sheets) | Derived — batched `Location` lookup keyed by the id string |
| `channel` | Derived — constant `DEFAULT_SUBSCRIPTION_CHANNEL = "EMAIL"` (no column exists; see CQ3) |

### 1.6 Period filter fields

| Report | Date field | Rationale |
|---|---|---|
| User Accounts | `User.createdDate` | Accounts created in the window |
| Publications | `Artefact.lastReceivedDate` | Ingest date. `contentDate` is the hearing date, not an ingest date — matches legacy `getMiDataWithPublicationReceivedDate` |
| Location Subscriptions | `Subscription.dateAdded` | |
| All Subscriptions | `Subscription.dateAdded` | |

Cutoff is computed **once** per request (`new Date(Date.now() - days * 86_400_000)`) and passed to every
query, so a multi-sheet workbook is internally consistent. Inclusive (`gte`), not truncated to midnight.

---

## 2. Implementation Details

### 2.1 TEMPLATE SOURCE (verbatim)

> migrate from pip-frontend src/main/views/system-admin/download-mi-report.njk — BUT the legacy template uses two `govukSelect` dropdowns, whereas this issue's mockups and ACs specify two `govukRadios` groups with per-item hint text and GOV.UK error-summary validation. The legacy template also has no validation states at all. Migration value here is therefore limited to the locale content and the field/option value vocabulary, not the markup. Follow the issue's radio-based design (GDS guidance: `select` is a last resort — .claude/rules/design.md), using the in-repo radio-page reference `apps/web/src/pages/(system-admin)/reference-data/index-radios.njk`. Run the migrate-pip-pages skill to pull the legacy source for reference, then adapt to radios.

Legacy locale files for content reference: `src/main/resources/locales/{en,cy}/download-mi-report.json`
(the `cy` file is untranslated English — see CQ7).

### 2.2 Files to create

| Path | Purpose |
|---|---|
| `apps/web/src/pages/(system-admin)/mi-report/index.ts` | Controller — `GET`/`POST`, both `RequestHandler[]` wrapped in `requireRole` |
| `apps/web/src/pages/(system-admin)/mi-report/index.njk` | Two `govukRadios` + `govukButton` + `govukErrorSummary` + `govukBackLink` |
| `apps/web/src/pages/(system-admin)/mi-report/en.ts` | English content (co-located — page-specific, per CLAUDE.md) |
| `apps/web/src/pages/(system-admin)/mi-report/cy.ts` | Welsh content, identical key set |
| `apps/web/src/pages/(system-admin)/mi-report/index.test.ts` | Controller unit tests |
| `apps/web/src/pages/(system-admin)/mi-report/index.njk.test.ts` | Template tests (Cheerio) |
| `libs/system-admin-pages/src/mi-report/validation.ts` | `validateMiReportSelection()` |
| `libs/system-admin-pages/src/mi-report/validation.test.ts` | |
| `libs/system-admin-pages/src/mi-report/queries.ts` | Prisma reads + `resolveCourtNames` |
| `libs/system-admin-pages/src/mi-report/queries.test.ts` | Prisma mocked |
| `libs/system-admin-pages/src/mi-report/service.ts` | `buildMiReport()` — orchestrates queries → rows → buffer + filename |
| `libs/system-admin-pages/src/mi-report/service.test.ts` | |
| `libs/excel-generation/src/excel/mi-report-excel-generator.ts` | `generateMiReportExcel(sheets)` → `Buffer` |
| `libs/excel-generation/src/excel/mi-report-excel-generator.test.ts` | |
| `e2e-tests/tests/system-admin/mi-report.spec.ts` | One journey test |

### 2.3 Files to modify

| Path | Change |
|---|---|
| `apps/web/src/pages/(system-admin)/system-admin-dashboard/en.ts` | Append tile `{ title: "Download MI Report", description: "Download management information reports for user accounts, publications and subscriptions", href: "/mi-report" }` (10 → 11) |
| `apps/web/src/pages/(system-admin)/system-admin-dashboard/cy.ts` | Append the Welsh equivalent with the same `href` — index/href parity is asserted by test |
| `libs/system-admin-pages/src/audit-log/logger.ts` | Add `DOWNLOAD_MI_REPORT = "Download MI report"` to `AuditLogAction`, alphabetically after `DELETE_USER` |
| `libs/system-admin-pages/src/index.ts` | Export `buildMiReport`, `validateMiReportSelection`, the `MiReportType` / `ReportingPeriodDays` types, `MI_REPORT_TYPES`, `REPORTING_PERIOD_DAYS`. Follow the existing aliasing convention for `ErrorItem` name clashes (`type ErrorItem as MiReportErrorItem`) |
| `libs/excel-generation/src/index.ts` | Export `generateMiReportExcel` and the `MiReportSheet` type |
| `libs/excel-generation/src/excel/excel-headers.ts` | Add `MI_REPORT_HEADERS` |
| `libs/system-admin-pages/package.json` | Add `"@hmcts/excel-generation": "workspace:*"` to `dependencies` |
| `e2e-tests/tests/system-admin/system-admin-dashboard.spec.ts` | Fix the three `toHaveCount(9)` → `toHaveCount(11)`; correct `/user-management` → `/find-users`; add the missing tiles including the new one so `tileData` matches `en.ts` |

No change to `apps/web/src/app.ts`, `apps/web/vite.config.ts`, root `tsconfig.json` (both libs already
registered), or any `.prisma` file.

### 2.4 Controller — `apps/web/src/pages/(system-admin)/mi-report/index.ts`

Module order per CLAUDE.md §8: top-level consts → exported functions → helpers → types last.

```
GET  : RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN]), getHandler]
POST : RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN]), postHandler]
```

`getHandler`
- `const locale = res.locals.locale || "en"`; `const t = locale === "cy" ? cy : en`
- `res.render("mi-report/index", { en, cy, t, periodItems, reportTypeItems, periodError: undefined, reportTypeError: undefined, errors: undefined })`
- `periodItems` / `reportTypeItems` are built by a single shared `buildRadioItems(t, selected)` helper used by **both** GET and POST so the two cannot drift (the `reference-data` controller duplicates this — do not copy that duplication)

`postHandler`
- Read `reportingPeriod` and `reportType` off `req.body` as `unknown`
- `const errors = validateMiReportSelection({ reportingPeriod, reportType })` — returns `Array<{ href, field }>`
- If `errors.length > 0`: attach locale `text` from `t`, re-render the **same** template at HTTP 200 with `errors`, `periodError`, `reportTypeError`, and radio items rebuilt marking only the *valid* submitted value `checked`. Never echo an invalid value into markup.
- Otherwise, inside `try`:
  - `req.auditMetadata = { action: AuditLogAction.DOWNLOAD_MI_REPORT, entityInfo: \`${reportType} / ${reportingPeriod} days\` }` — **set before `res.send`**, because `auditLogMiddleware` reads it inside its `res.send` wrapper
  - `const { buffer, filename } = await buildMiReport(reportType, Number(reportingPeriod))`
  - `res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")`
  - `res.setHeader("Content-Disposition", \`attachment; filename="${filename}"\`)`
  - `res.send(buffer)`
- `catch (error) { next(error) }` — see §1.3. `postHandler` therefore takes `(req, res, next)`.

The validation path is audit-logged automatically as `"validation_error"` by the same middleware's
`res.render` wrapper — nothing extra needed.

### 2.5 Service — `libs/system-admin-pages/src/mi-report/service.ts`

Top-level consts:

```
MI_REPORT_TYPES = ["user-accounts", "publications", "location-subscriptions", "all-subscriptions", "all-data"]
REPORTING_PERIOD_DAYS = [7, 14, 21, 30]
DEFAULT_SUBSCRIPTION_CHANNEL = "EMAIL"
MS_PER_DAY = 86_400_000
```

`buildMiReport(reportType, days)`:
1. `const cutoff = new Date(Date.now() - days * MS_PER_DAY)` — computed **once**, passed to every query.
2. Dispatch through a `Partial<Record<MiReportType, (cutoff: Date) => Promise<MiReportSheet>>>` registry — a named-key lookup, not a `switch` (mirrors `PDF_GENERATOR_REGISTRY` in `libs/publication/src/processing/service.ts`).
3. `all-data` awaits all four sheet builders with `Promise.all` and returns them in the fixed AC5 order: User Accounts, Publications, Location Subscriptions, All Subscriptions.
4. `generateMiReportExcel(sheets)` → `Buffer`.
5. `filename = \`mi-report-${reportType}-${days}days-${toIsoDate(new Date())}.xlsx\`` where `toIsoDate(d) = d.toISOString().split("T")[0]` — same as `reference-data-download`. `reportType` is already an allow-listed kebab slug, so no user-controlled text reaches the header.

All values are **pre-stringified in the service**; the generator makes no formatting decisions. Date
formatting helpers live here: `formatDateTime` → `YYYY-MM-DD HH:mm:ss`, `formatDate` → `YYYY-MM-DD`
(used for `content_date`, which is `@db.Date`). No Excel date types — the file must open identically
regardless of the reader's locale or the process timezone.

`MiReportSheet` type, at the bottom of the file:
`{ name: string; columns: Array<{ header: string; key: string; width: number }>; rows: Array<Record<string, string>> }`

### 2.6 Queries — `libs/system-admin-pages/src/mi-report/queries.ts`

All Prisma, parameterised, `select`-narrowed, and `orderBy`-ordered so downloads are diff-able.
`SEARCH_TYPE_LOCATION_ID = "LOCATION_ID"` as a named constant (matches `libs/subscriptions/src/repository/queries.ts`).

- **User Accounts** — `where: { createdDate: { gte: cutoff } }`, `orderBy: { createdDate: "desc" }`, `select: { userId, userProvenanceId, userProvenance, role, createdDate, lastSignedInDate }`
- **Publications** — `where: { lastReceivedDate: { gte: cutoff } }` (**no `noMatch` filter** — see §1.1 #8), `orderBy: { lastReceivedDate: "desc" }`, `select: { artefactId, displayFrom, displayTo, language, provenance, sensitivity, sourceArtefactId, supersededCount, type, contentDate, locationId, listType: { select: { name: true } } }`. `listTypeId` is never selected or emitted.
- **Location Subscriptions** — `where: { searchType: SEARCH_TYPE_LOCATION_ID, dateAdded: { gte: cutoff } }`, `orderBy: { dateAdded: "desc" }`, `select: { subscriptionId, searchValue, userId, dateAdded }`
- **All Subscriptions** — `where: { dateAdded: { gte: cutoff } }`, `orderBy: { dateAdded: "desc" }`, `select: { subscriptionId, searchType, searchValue, userId, dateAdded }`

**`resolveCourtNames(locationIdStrings: string[]): Promise<Map<string, string>>`** — one helper, used by
all three sheets that need `court_name`:
- de-duplicate, `Number.parseInt` each, drop `NaN`
- if the parsed array is empty, return an empty `Map` **without touching the database**
- `prisma.location.findMany({ where: { locationId: { in: ids } }, select: { locationId: true, name: true } })`
- key the returned `Map` by the **original string** form so callers do not re-parse
- **do not filter on `deletedAt`** — a historic subscription to a since-deleted court still needs its name in an MI report
- unresolvable ids yield `""`, never `"undefined"`

This is a fixed **two queries per sheet** (rows, then names). It must never become a per-row lookup.
For All Subscriptions, only `LOCATION_ID` rows are resolved; `CASE_NAME` / `CASE_NUMBER` rows emit `""`.

Court names come from `Location.name` (English) in all locales. `Location.welshName` exists but a
language-dependent data column would make downloaded files non-comparable — an MI extract is an
analysis artefact, not user-facing content.

### 2.7 Excel generator — `libs/excel-generation/src/excel/mi-report-excel-generator.ts`

`generateMiReportExcel(sheets: MiReportSheet[]): Promise<Buffer>`
- `new ExcelJS.Workbook()`; `addWorksheet(sheet.name)` per spec, in array order
- `worksheet.columns = sheet.columns`
- header row via `headerRow.eachCell`: `HEADER_FONT`, `HEADER_FILL`, `HEADER_ALIGNMENT`, `CELL_BORDER`
- data rows via `addRow(rowData)` then `row.eachCell`: `DATA_FONT`, `DATA_ALIGNMENT`, `CELL_BORDER`
- `return Buffer.from(await workbook.xlsx.writeBuffer())`

Sheet names are internal constants only — never derived from input. Excel's hard limits (≤31 chars, none
of `: \ / ? * [ ]`) are asserted by test. Headers live in `MI_REPORT_HEADERS` in `excel-headers.ts`.

### 2.8 Workbook content (never translated)

Sheet names and column headers are machine-readable identifiers consumed downstream, so they stay
English regardless of `?lng`.

| Sheet name | Headers (in order) |
|---|---|
| User Accounts | `user_id`, `provenance_user_id`, `user_provenance`, `roles`, `created_date`, `last_signed_in_date` |
| Publications | `artefact_id`, `display_from`, `display_to`, `language`, `provenance`, `sensitivity`, `source_artefact_id`, `superseded_count`, `type`, `content_date`, `court_id`, `court_name`, `list_type` |
| Location Subscriptions | `id`, `search_value`, `channel`, `user_id`, `court_name`, `created_date` |
| All Subscriptions | `id`, `channel`, `search_type`, `user_id`, `court_name`, `created_date` |

### 2.9 Validation — `libs/system-admin-pages/src/mi-report/validation.ts`

`validateMiReportSelection(input): Array<{ href: string; field: "reportingPeriod" | "reportType" }>`.
Per the `delete-court/validation.ts` convention the validator returns **field identity only**; the
controller attaches locale-specific `text`, keeping all user-facing copy in `en.ts`/`cy.ts`.

| Field | Rule | `href` |
|---|---|---|
| `reportingPeriod` | Present, a string, non-empty after trim, and one of `"7"`, `"14"`, `"21"`, `"30"` (string allow-list, compared before any numeric coercion) | `#reportingPeriod` |
| `reportType` | Present, a string, non-empty after trim, and one of the five `MI_REPORT_TYPES` slugs | `#reportType` |

- Errors are returned in **field order** (period first) so the summary order matches visual page order (WCAG 2.4.3).
- Missing, out-of-range and garbage values all produce the same generic "Select a…" message. A tampered POST is not a user mistake needing bespoke guidance, and a distinct message would confirm probing.
- Allow-list, never deny-list.
- Because only the five known slugs pass, no user-controlled text can reach `Content-Disposition` — this closes header injection and path traversal in the filename.
- No client-side validation. The server is the only enforcement point (progressive enhancement).

### 2.10 Template — `index.njk`

Extends `layouts/base-template.njk`, uses `{% block page_content %}` and `{% block backLink %}`
(matching `reference-data/index-radios.njk`).

- One `<h1 class="govuk-heading-l">` — the page title. **Not** an `isPageHeading` legend: the page carries two questions, so `isPageHeading: true` would be wrong.
- Two `govukRadios`, each with its own `fieldset.legend` (`govuk-fieldset__legend--m`) and `hint`, `items: periodItems` / `reportTypeItems`, `errorMessage: periodError` / `reportTypeError`.
- Report-type items carry per-item `hint: { text: ... }` — giving each input its own `aria-describedby` rather than a loose `<p>`.
- `govukErrorSummary` first inside the content column, gated on `{% if errors %}`, `titleText: t.errorSummaryTitle`. The macro provides `role="alert"` and takes focus on load. Summary hrefs point at the **first radio input** of each group so activating the link moves focus into the group.
- `govukButton({ text: t.downloadButton })` — "Download report", not "Continue"; it performs an action rather than advancing a journey.
- `<form method="post" novalidate>`.
- Page `<title>` prefixed `"Error: "` when `errors` is set.
- No JavaScript. Zero JS required for the whole feature.

Report-type labels use the Title Case from the issue and the existing manual workbook so admins can map
the old file to the new one — a deliberate, justified exception to GDS sentence case because the labels
name a known artefact.

### 2.11 Navigation and state

- Entry is the dashboard tile; no other route links to `/mi-report`.
- `govukBackLink` → `/system-admin-dashboard`, rendered in every state including the error state.
- After download there is **no redirect** — the response is an attachment, so the browser stays on `/mi-report` with the form populated and the admin can pull several reports in a row (same non-navigating behaviour as `reference-data-download`).
- After validation failure, re-render in place at the same URL, HTTP 200, valid selections preserved.
- **No session state whatsoever.** Selection lives entirely in the POST body, so there is no stale-state bug class and no cleanup.

---

## 3. Error Handling & Edge Cases

| Case | Behaviour |
|---|---|
| Either field missing | HTTP 200 re-render, error summary + inline errors, other valid selection preserved |
| `reportingPeriod` outside the allow-list (`"0"`, `"31"`, `"7.5"`, `"-7"`, `"seven"`) | Same generic error. **Never reaches Prisma.** |
| `reportType` outside the allow-list | Same generic error. Never reaches Prisma, never reaches the filename |
| Duplicate form fields → `req.body.reportType` is an **array** | Fails the allow-list (not a string) and is rejected. **Do not take `[0]`** |
| Empty result set | Valid `.xlsx` with the header row present and zero data rows. Not an error, not a redirect, not the legacy `"No data found"` literal |
| Location id unparseable (`Number.parseInt` → `NaN`) | Omitted from the `in` clause; `court_name` is `""`. `NaN` is never passed to Prisma |
| Location id parses but has no row | `court_name` is `""`, never `"undefined"` |
| Soft-deleted location (`deletedAt != null`) | **Included** — the name is still resolved. Historic rows need labels |
| `CASE_NAME` / `CASE_NUMBER` rows in All Subscriptions | `court_name` is `""` — only `LOCATION_ID` rows have a resolvable court |
| No resolvable ids at all for a sheet | `resolveCourtNames` returns an empty `Map` without issuing a query |
| Nullable fields (`lastSignedInDate`, `sourceArtefactId`) | `""`, never the string `"null"` or `"undefined"` |
| Excel sheet-name limits | Sheet names are internal constants, ≤31 chars, free of `: \ / ? * [ ]`; asserted by test. Never derived from input |
| Prisma query or ExcelJS build throws | `next(error)` → global `errorHandler` renders `errors/500` at HTTP 500 with the correct `error500` content. Headers are only set immediately before `res.send`, so **no truncated or corrupt attachment is ever emitted** |
| Unauthorised role | `requireRole` redirects to that role's dashboard — no data queried, nothing rendered |
| Unauthenticated | `redirectUnauthenticated` → `/sign-in` with `session.returnTo = "/mi-report"` |
| Timezone | All date cells are pre-formatted strings built from explicit component extraction, so output is process-timezone-independent |

No error surface exposes a SQL fragment, stack trace (outside non-production), or table name.

---

## 4. Acceptance Criteria Mapping

| AC | How satisfied | How verified | Conflict |
|---|---|---|---|
| **AC1** — tile visible only to `SYSTEM_ADMIN`; direct `/mi-report` without the role "redirects to 403" | `/system-admin-dashboard` is already `requireRole([SYSTEM_ADMIN])`-gated, so no other role ever renders the tile. `GET`/`POST /mi-report` are both `requireRole([USER_ROLES.SYSTEM_ADMIN])` arrays | Controller test asserts `GET[0]`/`POST[0]` are the `requireRole` middleware; E2E covers the admin path | **CONFLICTS with existing behaviour.** `requireRole` redirects unauthorised roles to their own dashboard and role-less users to `/sign-in` — it does **not** render `errors/403`. Access *is* denied and no data is queried, but the response is a redirect, not a 403. Not forking `requireRole` for one page. See **CQ4** |
| **AC2** — new "Download MI Report" tile with the given description | One appended entry in `system-admin-dashboard/en.ts` and `cy.ts` `tiles[]` | Dashboard template test asserts one `a.admin-tile` per `en.tiles` entry including `href="/mi-report"`; en/cy length and per-index `href` parity test; E2E asserts the tile is visible | — |
| **AC3** — period 7/14/21/30, five report types, both required | Two `govukRadios` groups; `validateMiReportSelection` allow-lists both | Template tests assert 4 + 5 inputs with the exact values; validation tests cover all 20 valid combinations and every invalid class; E2E submits empty and asserts both summary messages | **Diverges from legacy semantics**: the legacy report applied the duration to Publications only and offered a fifth "From beginning" option. Implementing the AC as written. See **CQ1** |
| **AC4** — the four column sets | Explicit column definitions in `service.ts`; `MI_REPORT_HEADERS` in `excel-headers.ts` | Service tests assert exact headers and order per sheet; generator test re-reads the buffer through ExcelJS | **Three deviations from the data model / legacy:** `channel` has no column and is emitted as the constant `"EMAIL"` (legacy had `EMAIL` *and* `API_COURTEL`; third-party subscriptions are silently absent) — **CQ3**; `roles` is plural in the header but sourced from the singular `User.role` — **CQ8**; `court_name` on Publications is **new** versus the 12-field legacy `PublicationMiData` — **CQ8**. Also, the issue's `noMatch = true` filter is **not** implemented — **CQ2** |
| **AC5** — `.xlsx` streamed, `mi-report-{type}-{days}days-{YYYY-MM-DD}.xlsx`, All Data = 4 named tabs, single types = 1 tab | `buildMiReport` returns `{ buffer, filename }`; controller sets the spreadsheetml Content-Type and `attachment` Content-Disposition and `res.send`s | Controller test asserts the header regex; service tests assert filename construction and the four-sheet order; generator test asserts one worksheet per spec in order; E2E captures the download and asserts the filename | **Format/naming/tab-order all change versus legacy** (legacy: CSV for single reports, different filename grammar, different tab order). Following the AC. Downstream consumers of the legacy artefact will break — **CQ6** |
| **AC6** — Welsh via `?lng=cy` | Co-located `cy.ts` with an identical key set; `t` selected from `res.locals.locale`; workbook headers stay English by design | Template test renders with `cy` and asserts translated legends/hints/button; locale-key parity test; E2E switches to Welsh mid-journey | **No Welsh source exists to migrate** — the legacy `cy/download-mi-report.json` is byte-identical English. All strings ship as `[WELSH TRANSLATION REQUIRED: "..."]` pending a translator — **CQ7** |

---

## 5. Test Scenarios

### 5.1 Controller unit tests — `apps/web/src/pages/(system-admin)/mi-report/index.test.ts`

Vitest, AAA pattern per `.claude/rules/testing.md`. `@hmcts/system-admin-pages` mocked.

- GET renders `mi-report/index` with `en`, `cy`, `t`, both radio-item collections, and `errors` undefined
- GET with `res.locals.locale = "cy"` passes the Welsh object as `t`
- POST with no fields re-renders with two errors, period-first, and does not call `buildMiReport`
- POST with only a period re-renders with one error and keeps that period `checked`
- POST with an out-of-allow-list `reportingPeriod` re-renders and never calls `buildMiReport`
- POST with an out-of-allow-list `reportType` behaves likewise
- POST with an array-valued field is rejected without calling `buildMiReport`
- POST with valid input calls `buildMiReport` with the numeric period and the slug
- POST with valid input sets the spreadsheetml `Content-Type` and a `Content-Disposition` matching `/^attachment; filename="mi-report-[a-z-]+-(7|14|21|30)days-\d{4}-\d{2}-\d{2}\.xlsx"$/`, then sends the buffer
- POST sets `req.auditMetadata.action` to `AuditLogAction.DOWNLOAD_MI_REPORT` **before** `res.send`
- POST calls `next(error)` when `buildMiReport` rejects, and sets **no** response headers and sends nothing
- `GET`/`POST` are exported as arrays whose first element is the `requireRole` middleware

Handler-under-test is `GET[GET.length - 1]` / `POST[POST.length - 1]`, per the middleware-array pattern.

### 5.2 Template tests — `index.njk.test.ts`

Per `.claude/rules/testing.md`: `createTestEnvironment` (never `nunjucks.configure()`), Cheerio structural
assertions only, `toHaveLength`, **no AAA comments**, layered fixture builders, both-ways conditional
assertions.

- Renders exactly one `h1` containing the English title
- Renders exactly two `fieldset` elements with the period and report-type legends
- Renders 4 period radio inputs with values `7`, `14`, `21`, `30`
- Renders 5 report-type radio inputs with the five expected slug values
- Renders a hint element for every report-type radio
- No radio has `checked` on first render
- `assertNoErrors($)` when `errors` is undefined
- `assertErrorSummary($, [...])` with both messages, and summary `href`s `#reportingPeriod` / `#reportType`, when `errors` is supplied
- Applies `govuk-form-group--error` only to the group that has an error (assert present **and** absent)
- Preserves the previously-selected period as `checked` in the error state
- Renders Welsh legends, hints and button text when rendered with the `cy` object
- `expect(Object.keys(en).sort()).toEqual(Object.keys(cy).sort())`
- Renders the back link with `href="/system-admin-dashboard"`
- Prefixes the page title with `"Error: "` when `errors` is set

### 5.3 Validation tests — `libs/system-admin-pages/src/mi-report/validation.test.ts`

- Empty array for each of the 20 valid period × type combinations
- Two errors when both fields are absent / empty strings / whitespace only
- One period error for each invalid period (`"0"`, `"31"`, `"7.5"`, `"-7"`, `"seven"`)
- One type error for an unknown slug, and for the legacy SCREAMING_SNAKE form (`"ALL_DATA"`) — proving the wire vocabulary is the kebab slug
- Errors returned in field order regardless of input key order
- Rejects an array value for either field
- Rejects a non-string (number, object) for either field

### 5.4 Query tests — `libs/system-admin-pages/src/mi-report/queries.test.ts` (Prisma mocked)

- User Accounts filters `createdDate >= cutoff` and selects only the six needed fields
- Publications filters `lastReceivedDate >= cutoff` and **passes no `noMatch` key** (locks in the §1.1 #8 decision)
- Publications selects the `listType` name relation and **never** selects `listTypeId`
- Location Subscriptions filters `searchType: "LOCATION_ID"` and `dateAdded >= cutoff`
- All Subscriptions filters on `dateAdded` only, with no `searchType` constraint
- `resolveCourtNames` de-duplicates ids and issues exactly one `location.findMany`
- `resolveCourtNames` skips the database for empty or all-unparseable input
- `resolveCourtNames` does **not** pass `deletedAt` in the `where` clause
- `resolveCourtNames` omits unparseable values rather than passing `NaN`
- Every query passes an explicit deterministic `orderBy`

### 5.5 Service tests — `libs/system-admin-pages/src/mi-report/service.test.ts`

- Each single report type produces exactly one sheet with the AC4 headers in the documented order
- `all-data` produces four sheets named and ordered "User Accounts", "Publications", "Location Subscriptions", "All Subscriptions"
- `all-data` passes **one shared cutoff** to all four queries
- Cutoff equals now minus `days × 86 400 000` ms
- Null `lastSignedInDate` → `""`, not `"null"`
- Null `sourceArtefactId` → `""`
- `role` is emitted under the `roles` header
- `channel` is `DEFAULT_SUBSCRIPTION_CHANNEL` for every subscription row
- All Subscriptions emits `""` for `court_name` on `CASE_NAME`/`CASE_NUMBER` rows and a resolved name on `LOCATION_ID` rows
- Unresolvable location id → `""`, never `"undefined"`
- Dates render as fixed `YYYY-MM-DD` / `YYYY-MM-DD HH:mm:ss` strings independent of process timezone
- Filename built from slug, day count and today's ISO date
- Empty result set yields a sheet with headers and zero rows

### 5.6 Excel generator tests — `libs/excel-generation/src/excel/mi-report-excel-generator.test.ts`

- Returns a `Buffer` that re-reads through `ExcelJS` without error
- Creates one worksheet per sheet spec, in order, with the given names
- Writes the header row and applies `HEADER_FONT` / `HEADER_FILL`
- Writes one data row per row spec, cells in column order
- Produces a valid workbook for a spec with headers and zero rows
- Every sheet name is ≤31 chars and free of `: \ / ? * [ ]`

### 5.7 Dashboard tests

- `system-admin-dashboard/index.njk.test.ts` renders one `a.admin-tile` per `en.tiles` entry, including the new one with `href="/mi-report"`
- `en.tiles` and `cy.tiles` have equal length and matching `href` at every index

### 5.8 E2E — `e2e-tests/tests/system-admin/mi-report.spec.ts`

**One journey test** per the minimise-tests rule, covering validation, Welsh, accessibility, keyboard and
the download in a single flow:

Sign in via SSO as system admin → assert the "Download MI Report" tile is visible on the dashboard →
click through to `/mi-report` → submit empty and assert both summary errors → `axeCheck` on the error
state → switch to Welsh and assert the translated legend → switch back → select "30 days" and "All Data"
by keyboard → `axeCheck` on the populated state → submit and capture the download → assert the filename
matches `mi-report-all-data-30days-<today>.xlsx` and the payload is a non-empty `.xlsx`.

Selectors in priority order: `getByRole`, then `getByLabel`, then `getByText`.
`axeCheck` with `["wcag2a","wcag2aa","wcag21a","wcag21aa","wcag22aa"]`, asserting `violations` is `[]`.

**Deliberately not in E2E** (unit-tested instead): every period × type combination, workbook internals,
per-field validation permutations.

---

## 6. CLARIFICATIONS NEEDED

Ranked most important first. **CQ1 and CQ2 change what data lands in the file** — they are worth
resolving before merge.

**CQ1 — Does the reporting period apply to all four reports, or Publications only?** *(highest impact)*
The legacy report applied it to **Publications only**; the other three sheets were unconditionally
"from beginning", and the legacy page said so in its own copy: *"Report duration applies only to the
Publications report. All other reports will include data from the beginning."* This is confirmed in the
legacy service and in all three backend repositories. AC3/AC5 apply the period to all four. This plan
implements the AC as written, but that is a **deliberate behaviour change** and it makes the new
workbook non-comparable with the existing hand-produced one (which AC/CQ9 implies matters). If the answer
is "Publications only", the change is one `where` clause per query.

**CQ2 — Should the Publications sheet filter on `noMatch = true`?**
The issue's Technical Notes say `artefact (where noMatch = true)`. The legacy MI query
(`getMiDataWithPublicationReceivedDate`) has **no such filter** — it returns all artefacts received in
the window. The legacy NoMatch queries (`LIKE '%NoMatch%'`) belong to the NoMatch alerting feature, not
the MI report. In cath-service `Artefact.noMatch` is a real Boolean set by
`libs/api/src/blob-ingestion/repository/service.ts` as `!validation.locationExists`, so filtering on it
would restrict the sheet to publications whose court could **not** be matched — blanking `court_id` and
`court_name` on nearly every row and contradicting AC4's stated intent. **This plan reverses the earlier
`@spec` comment and implements without the filter.** Confirm. One-line toggle either way.

**CQ3 — `channel`: what should it contain, and are third-party subscriptions in scope?**
`channel` is in AC4 but there is **no `channel` column** on `Subscription` in this repo. It *did* exist in
the legacy schema with **two** values — `EMAIL` and `API_COURTEL` (`pip-data-models` `Channel.java`) —
so the earlier claim that "EMAIL is the only channel that ever existed" is wrong for the legacy data. In
cath-service, API/third-party delivery is modelled separately as `ThirdPartySubscription`
(`third-party-user.prisma`), which has **no link to `Subscription`**. Emitting the constant `"EMAIL"` is
a lossy but defensible stopgap: **third-party/API subscriptions will be silently absent from both
subscription sheets.** Confirm that is acceptable, or raise a separate story to either add a real
`channel` column or union `ThirdPartySubscription` into these sheets.

**CQ4 — AC1 says "redirects to 403"; the service redirects to the caller's dashboard.**
The shared `requireRole` (`libs/auth/src/middleware/authorise.ts`) redirects unauthorised roles to their
own dashboard and role-less users to `/sign-in` with `returnTo`. It does not render `errors/403`, and it
is used by every other system-admin page. Access is genuinely denied and no data is queried, but the
response shape does not match AC1. Confirm the existing behaviour is acceptable, or raise a separate
story to change `requireRole` service-wide — it should **not** be forked for one page.

**CQ5 — Option value casing: kebab-case slugs or the legacy SCREAMING_SNAKE?**
Legacy wire values were `USER_ACCOUNTS`, `PUBLICATIONS`, `LOCATION_SUBSCRIPTIONS`, `ALL_SUBSCRIPTIONS`,
`ALL_DATA`. This plan uses kebab-case (`user-accounts`, …) because AC5's filename requires it and it
needs no transformation. Confirm nothing external posts the legacy values to this endpoint.

**CQ6 — `.xlsx`-for-all, the new filename grammar and the new tab order will break existing consumers.**
Legacy: single reports were **CSV** (`text/csv`, `.csv`, UTF-8 BOM), only `ALL_DATA` was `.xlsx`, the
filename was `{type}_report_{last_N_days|from_beginning}_{YYYY_MM_DD}_{HHMMSSmmm}.csv`, and the All Data
tab order was Publications, User Accounts, All Subscriptions, Location Subscriptions. The ACs specify
`.xlsx` for everything, `mi-report-{type}-{days}days-{YYYY-MM-DD}.xlsx`, and tab order User Accounts,
Publications, Location Subscriptions, All Subscriptions. Following the ACs (they are strictly better and
fix a legacy content-type bug), but any macro, pivot or script keyed on the old filename, format or tab
position will break. Confirm no such consumer exists, or plan a migration note.

**CQ7 — Welsh translation is genuinely required; there is no source to migrate.**
The legacy `cy/download-mi-report.json` is **byte-identical English** — the page was never translated.
All Welsh strings will ship as `[WELSH TRANSLATION REQUIRED: "..."]`. Who supplies the copy, and is
shipping the placeholders acceptable in the interim?

**CQ8 — Column parity with the existing manual workbook.**
Verified against the legacy JPA projections: User Accounts and both subscription sheets match AC4 exactly
(legacy `locationName` → `court_name`). Two gaps: (a) legacy `PublicationMiData` has **12** fields;
AC4 lists **13**, adding `court_name` — new; (b) legacy `roles` was genuinely a collection, whereas
cath-service `User.role` is a single `String`, so the plural header carries one value per row. Has the
hand-produced workbook been diffed column-for-column against AC4? Should `roles` be renamed `role`, or
kept plural for backwards compatibility?

**CQ9 — PII and retention.** The workbook contains `user_id`, `provenance_user_id`, `user_provenance` and
subscription search values. Are there handling, retention or logging constraints on the downloaded
artefact beyond the audit-log entry? Should the audit entry record the row count?

**CQ10 — Should `system-admin-dashboard.spec.ts` be un-skipped?**
It is `test.describe.skip(...)` and already stale: three `toHaveCount(9)` assertions against 10 actual
tiles, only 8 entries in `tileData`, and one wrong href (`/user-management` vs the actual `/find-users`).
This plan fixes the counts to 11 and corrects the href. Should the suite be un-skipped as part of this
work, or is it skipped deliberately pending SSO test credentials?
