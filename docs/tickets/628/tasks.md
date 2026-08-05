# Tasks — #628 MI Report Download (System Admin Dashboard)

See `plan.md`. Ordered so each step is executable and testable on its own.

## Implementation Tasks

### Setup

- [ ] Add `"@hmcts/excel-generation": "workspace:*"` to `dependencies` in `libs/system-admin-pages/package.json` and run `yarn install` (do NOT add a second `exceljs` — `exceljs@4.4.0` is already a dependency of `libs/excel-generation`)
- [ ] Add `DOWNLOAD_MI_REPORT = "Download MI report"` to the `AuditLogAction` enum in `libs/system-admin-pages/src/audit-log/logger.ts`, alphabetically after `DELETE_USER` and before `MANUAL_UPLOAD`
- [ ] Run the migrate-pip-pages skill to pull `src/main/views/system-admin/download-mi-report.njk` and `src/main/resources/locales/{en,cy}/download-mi-report.json` from pip-frontend for content reference only (the legacy markup is two `govukSelect` dropdowns and is NOT being ported — see plan §2.1)

### Validation (lib)

- [ ] Create `libs/system-admin-pages/src/mi-report/validation.ts` — `validateMiReportSelection(input)` returning `Array<{ href, field }>`, period-first ordering, string allow-lists for both fields, rejecting non-strings and arrays; `{ href }`-only convention per `delete-court/validation.ts`
- [ ] Create `libs/system-admin-pages/src/mi-report/validation.test.ts` per plan §5.3 (all 20 valid combinations; missing/empty/whitespace; invalid period values; unknown slug; legacy SCREAMING_SNAKE rejected; field ordering; array and non-string rejection)

### Queries (lib)

- [ ] Create `libs/system-admin-pages/src/mi-report/queries.ts` — four `select`-narrowed, `orderBy`-ordered Prisma reads plus `resolveCourtNames`; `SEARCH_TYPE_LOCATION_ID` const; Publications uses `listType: { select: { name: true } }` and **no `noMatch` filter** and never selects `listTypeId`; `resolveCourtNames` de-duplicates, drops `NaN`, skips the DB when empty, does not filter `deletedAt`, and keys the `Map` by the original string
- [ ] Create `libs/system-admin-pages/src/mi-report/queries.test.ts` per plan §5.4 (Prisma mocked)

### Service (lib)

- [ ] Create `libs/system-admin-pages/src/mi-report/service.ts` — top-level consts (`MI_REPORT_TYPES`, `REPORTING_PERIOD_DAYS`, `DEFAULT_SUBSCRIPTION_CHANNEL`, `MS_PER_DAY`), `buildMiReport(reportType, days)` returning `{ buffer, filename }`, single shared cutoff, named-key sheet-builder registry (not a `switch`), `all-data` via `Promise.all` in AC5 tab order, `formatDate`/`formatDateTime` helpers, `MiReportSheet` type at the bottom
- [ ] Create `libs/system-admin-pages/src/mi-report/service.test.ts` per plan §5.5

### Excel generator (lib)

- [ ] Add `MI_REPORT_HEADERS` to `libs/excel-generation/src/excel/excel-headers.ts` (all four sheets' column headers, plan §2.8)
- [ ] Create `libs/excel-generation/src/excel/mi-report-excel-generator.ts` — `generateMiReportExcel(sheets)`, reusing `HEADER_FONT`/`HEADER_FILL`/`HEADER_ALIGNMENT`/`DATA_FONT`/`DATA_ALIGNMENT`/`CELL_BORDER` from `excel-styles.ts` (do not redeclare), mirroring `sjp-press-list-excel-generator.ts`
- [ ] Create `libs/excel-generation/src/excel/mi-report-excel-generator.test.ts` per plan §5.6 (including the ≤31-char / forbidden-character sheet-name assertion)

### Lib exports

- [ ] Export `generateMiReportExcel` and the `MiReportSheet` type from `libs/excel-generation/src/index.ts`
- [ ] Export `buildMiReport`, `validateMiReportSelection`, `MI_REPORT_TYPES`, `REPORTING_PERIOD_DAYS` and the `MiReportType` / `ReportingPeriodDays` types from `libs/system-admin-pages/src/index.ts`, aliasing any `ErrorItem` clash (`type ErrorItem as MiReportErrorItem`) per the existing convention in that file

### Page (apps/web)

- [ ] Create `apps/web/src/pages/(system-admin)/mi-report/en.ts` — title, back, legends, hints, four period labels, five report-type labels + hints, `downloadButton`, `errorSummaryTitle`, `reportingPeriodRequired`, `reportTypeRequired`
- [ ] Create `apps/web/src/pages/(system-admin)/mi-report/cy.ts` — identical key set, every string as `[WELSH TRANSLATION REQUIRED: "..."]` except `back` ("Yn ôl") and `errorSummaryTitle` ("Mae problem")
- [ ] Create `apps/web/src/pages/(system-admin)/mi-report/index.njk` — extends `layouts/base-template.njk`, `{% block backLink %}` + `{% block page_content %}`, `govukErrorSummary` gated on `{% if errors %}`, single `h1`, two `govukRadios` with `govuk-fieldset__legend--m` legends and per-item hints on report types, `govukButton` "Download report", `<form method="post" novalidate>`, `"Error: "` title prefix when `errors` is set (reference `reference-data/index-radios.njk`)
- [ ] Create `apps/web/src/pages/(system-admin)/mi-report/index.ts` — `GET`/`POST` as `RequestHandler[]` behind `requireRole([USER_ROLES.SYSTEM_ADMIN])`; one shared `buildRadioItems(t, selected)` helper used by both handlers; POST validates, re-renders at 200 with errors preserving valid selections, else sets `req.auditMetadata` **before** `res.send`, sets the spreadsheetml Content-Type and `attachment` Content-Disposition, sends the buffer; `catch (error) { next(error) }` (do NOT copy the buggy `res.render("errors/500", { en, cy, locale })` pattern from `sjp-press-list`)
- [ ] Create `apps/web/src/pages/(system-admin)/mi-report/index.test.ts` per plan §5.1
- [ ] Create `apps/web/src/pages/(system-admin)/mi-report/index.njk.test.ts` per plan §5.2 (Cheerio, `createTestEnvironment`, no AAA comments, locale-key parity)

### Dashboard tile

- [ ] Append the "Download MI Report" tile (`href: "/mi-report"`) to `tiles[]` in `apps/web/src/pages/(system-admin)/system-admin-dashboard/en.ts` (10 → 11)
- [ ] Append the Welsh equivalent with the same `href` to `apps/web/src/pages/(system-admin)/system-admin-dashboard/cy.ts`
- [ ] Add/extend `apps/web/src/pages/(system-admin)/system-admin-dashboard/index.njk.test.ts` — one `a.admin-tile` per `en.tiles` entry including `href="/mi-report"`, plus en/cy length and per-index `href` parity

### E2E

- [ ] Fix the stale `e2e-tests/tests/system-admin/system-admin-dashboard.spec.ts` — three `toHaveCount(9)` → `toHaveCount(11)`, correct `/user-management` → `/find-users`, and complete `tileData` so all 11 tiles from `en.ts` are listed
- [ ] Create `e2e-tests/tests/system-admin/mi-report.spec.ts` — ONE journey test per plan §5.8 (tile visible → `/mi-report` → empty submit + both errors → axe on error state → Welsh → back to English → keyboard-select "30 days" + "All Data" → axe → submit → assert downloaded filename and non-empty `.xlsx`)

### Verify

- [ ] `yarn lint:fix` from the repo root
- [ ] `yarn test` from the repo root — all unit and template tests green
- [ ] `yarn build` from the repo root
- [ ] Manually check `/mi-report` and `/mi-report?lng=cy`, download one single-type report and the All Data report, and confirm an `audit_log` row is written with action `DOWNLOAD_MI_REPORT`
