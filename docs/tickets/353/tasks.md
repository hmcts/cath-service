# Implementation Tasks: #353 - Automate Media Application Reporting and Cleanup

## Implementation Tasks

- [ ] Add `ProcessedApplicationSummary` interface to `libs/admin-pages/src/media-application/model.ts`

- [ ] Add `getProcessedApplications()` to `libs/admin-pages/src/media-application/queries.ts` — queries APPROVED and REJECTED records, selects `id`, `name`, `email`, `employer`, `status`, `appliedDate`, orders by `appliedDate` ascending

- [ ] Add `deleteProcessedApplications()` to `libs/admin-pages/src/media-application/queries.ts` — deletes all APPROVED and REJECTED records and returns the count from `BatchPayload`

- [ ] Export `getProcessedApplications`, `deleteProcessedApplications`, and `ProcessedApplicationSummary` from `libs/admin-pages/src/index.ts`

- [ ] Create `libs/notifications/src/media-application-report/media-application-report-service.ts` — implement `sendMediaApplicationReport({ csvBuffer, reportDate, applicationCount, recipientEmail })` that reads `GOVUK_NOTIFY_API_KEY` and `GOVUK_NOTIFY_TEMPLATE_ID_MEDIA_APPLICATION_REPORT` (throwing if absent), calls `prepareUpload()`, and sends the email with `report_date`, `application_count`, `link_to_file` personalisation

- [ ] Export `sendMediaApplicationReport` from `libs/notifications/src/index.ts`

- [ ] Add `papaparse` (`5.5.3`) and `@types/papaparse` (`5.5.2`) to `apps/crons/package.json` devDependencies/dependencies; add `@hmcts/admin-pages` and `@hmcts/notifications` as workspace dependencies

- [ ] Add `libs/admin-pages` and `libs/notifications` references to `apps/crons/tsconfig.json`

- [ ] Create `apps/crons/src/media-application-report.ts` with:
  - `formatReportDate(date: Date): string` (module-private, formats as "DD Month YYYY")
  - Default export async function that: fetches processed applications, returns early if empty, builds CSV rows with `appliedDate` as `YYYY-MM-DD`, calls `Papa.unparse()`, creates `Buffer.from(csvString, "utf-8")`, reads and validates `MEDIA_APPLICATION_REPORT_RECIPIENT_EMAIL`, calls `sendMediaApplicationReport()`, logs send confirmation, calls `deleteProcessedApplications()`, logs deletion count

- [ ] Update `apps/crons/helm/values.yaml` — set `SCRIPT_NAME` to `media-application-report` and add `govuk-notify-api-key`, `govuk-notify-template-id-media-application-report`, and `media-application-report-recipient-email` to key vault secrets (confirm with platform team)

- [ ] Write unit tests in `libs/admin-pages/src/media-application/queries.test.ts` for `getProcessedApplications` and `deleteProcessedApplications` covering: returns APPROVED records, returns REJECTED records, returns empty array when none exist, orders by appliedDate ascending, deletes correct records and returns count, returns zero count when nothing to delete, does not delete PENDING records

- [ ] Write unit tests in `libs/notifications/src/media-application-report/media-application-report-service.test.ts` covering: sends email with correct template parameters (report_date, application_count, link_to_file), throws when `GOVUK_NOTIFY_API_KEY` is absent, throws when `GOVUK_NOTIFY_TEMPLATE_ID_MEDIA_APPLICATION_REPORT` is absent, returns failure result when Notify API errors

- [ ] Write unit tests in `apps/crons/src/media-application-report.test.ts` covering: logs and returns early when no processed applications found, generates CSV with correct column headers and data, calls sendMediaApplicationReport with correct arguments, calls deleteProcessedApplications only after successful email send, does not call deleteProcessedApplications when email send throws, logs deletion count after successful deletion, formats report date as "DD Month YYYY", throws when `MEDIA_APPLICATION_REPORT_RECIPIENT_EMAIL` is not set

- [ ] Run `yarn lint:fix` from the repository root and resolve any Biome warnings
