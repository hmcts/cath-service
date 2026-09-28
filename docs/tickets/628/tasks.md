# Implementation Tasks

## Excel generation (libs/excel-generation)
- [x] Add `src/excel/mi-report-excel-generator.ts` — `generateMiReportExcel(sheets)` using shared `excel-styles.ts`
- [x] Export `generateMiReportExcel` from `libs/excel-generation/src/index.ts`
- [x] Add `src/excel/mi-report-excel-generator.test.ts`

## Data & business logic (libs/system-admin-pages/src/mi-report)
- [x] Add `"@hmcts/excel-generation": "workspace:*"` to `libs/system-admin-pages/package.json`
- [x] Create `queries.ts` — per-report Prisma reads taking optional `cutoff?: Date`, applying the period `where` only when supplied (`createdDate` / `lastReceivedDate` / `dateAdded`); `list_type` via `listType.name`
- [x] Create `court-name-resolver.ts` — single `Location.findMany` → `Map<string, name>` (includes soft-deleted; unresolvable → "")
- [x] Create `validation.ts` — `validateMiReportSelection` with string allow-lists (`"7"|"14"|"21"|"30"|"all"`; five report slugs), array rejection, field-ordered generic errors
- [x] Create `service.ts` — `buildMiReport(reportType, period)`: cutoff `undefined` when `period === "all"`, registry (not switch), `all-data` via `Promise.all`, filename builder (period token `{days}days` or `from-beginning`), returns `{ buffer, filename }`
- [x] Add `DOWNLOAD_MI_REPORT` to `AuditLogAction` in `audit-log/logger.ts`
- [x] Export `buildMiReport`, `validateMiReportSelection`, `MiReportType` from `src/index.ts`
- [x] Add `queries.test.ts`, `validation.test.ts`, `service.test.ts`

## Page (apps/web/src/pages/(system-admin)/mi-report)
- [x] Create `en.ts` and `cy.ts` (Welsh implemented in English per decision; key parity holds)
- [x] Create `index.njk` — back link, error summary, two radio fieldsets (period: 7/14/21/30 days + "From the beginning"; report type), download button
- [x] Create `index.ts` — `GET` render; `POST` validate → stream `.xlsx` or re-render errors; set `req.auditMetadata` (DOWNLOAD_MI_REPORT) before send; both guarded by `requireRole([SYSTEM_ADMIN])`
- [x] Add `index.test.ts` (controller: guard, validation re-render, stream headers)
- [x] Add `index.njk.test.ts` (both fieldsets, Welsh render, en/cy key parity)

## Dashboard tile (AC2)
- [x] Append "Download MI Report" tile (`href: "/mi-report"`) to `system-admin-dashboard/en.ts` and `cy.ts`
- [x] Update dashboard template test to assert 11 tiles + new href

## E2E & verification
- [x] Fix `system-admin-dashboard.spec.ts` stale counts (→ 11) and hrefs (leave `.skip` per CQ10 unless creds available)
- [x] Add one E2E journey: select period + report type → download; include inline Welsh + accessibility checks
- [x] Run `yarn lint:fix`, `yarn test`, `yarn test:e2e`
