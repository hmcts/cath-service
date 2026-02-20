# Implementation Tasks

## Dependencies and Module Setup

- [ ] Add `exceljs` as a dependency to the new `libs/mi-report/package.json` (pin to a specific version, e.g. `4.4.0`)
- [ ] Create `libs/mi-report/package.json` following the CLAUDE.md module pattern (name `@hmcts/mi-report`, type `module`, exports `.` and `./config`, scripts: build, dev, test, lint)
- [ ] Create `libs/mi-report/tsconfig.json` extending root `tsconfig.json` with `outDir: ./dist`, `rootDir: ./src`
- [ ] Register `@hmcts/mi-report` in root `tsconfig.json` paths: `"@hmcts/mi-report": ["libs/mi-report/src"]`
- [ ] Add `@hmcts/mi-report` as a workspace dependency in `apps/crons/package.json`
- [ ] Add `@hmcts/mi-report` as a workspace dependency in `libs/api/package.json`

## `libs/mi-report` — Core Module Files

- [ ] Create `libs/mi-report/src/config.ts` — exports `apiRoutes` pointing to `src/routes` directory (no page routes for this module)
- [ ] Create `libs/mi-report/src/report-queries.ts` — four exported async functions: `fetchPublicationRows`, `fetchUserAccountRows`, `fetchLocationSubscriptionRows`, `fetchAllSubscriptionRows`; Publication query uses OR filter (`lastReceivedDate >= now-31d OR displayTo < now()`); Location name resolved via two-query approach with `parseInt(artefact.locationId, 10)` lookup into a `Map`; both subscription queries include `location` relation; hardcode `channel: 'EMAIL'` and `searchType: 'LOCATION_ID'` in subscription row mapping; define return-type interfaces inline (no separate types file)
- [ ] Create `libs/mi-report/src/report-queries.test.ts` — unit tests mocking `@hmcts/postgres` prisma client; test Publication query applies correct date filter; test location name resolution including NaN `locationId` edge case; test subscription rows contain hardcoded `channel` and `searchType` values
- [ ] Create `libs/mi-report/src/generate-xlsx.ts` — exports `generateXlsx(data: ReportData): Promise<Buffer>` using `exceljs`; creates workbook with four worksheets (Publication, User Accounts, Location Subscriptions, All Subscriptions); each sheet has bold header row and data rows; returns `Buffer.from(await workbook.xlsx.writeBuffer())`
- [ ] Create `libs/mi-report/src/generate-xlsx.test.ts` — unit tests for `generateXlsx`; verify returned value is a `Buffer`; verify workbook has four sheets with correct names; verify header rows match expected column specs; verify data rows populate correctly; verify empty input arrays produce sheets with headers only
- [ ] Create `libs/mi-report/src/report-service.ts` — exports `generateAndSendMiReport(): Promise<void>`; validates `GOVUK_NOTIFY_TEMPLATE_ID_MI_REPORT` and `MI_REPORT_RECIPIENT_EMAIL` env vars at entry; fetches all four data sets in parallel with `Promise.all`; calls `generateXlsx`; calls `sendEmailWithFile` from `@hmcts/notifications`; throws on failure; logs success with notification ID
- [ ] Create `libs/mi-report/src/report-service.test.ts` — unit tests mocking `report-queries.js`, `generate-xlsx.js`, and `@hmcts/notifications`; test successful path logs notification ID; test throws when env vars are missing; test throws when `sendEmailWithFile` returns `success: false`; test error from any query propagates correctly
- [ ] Create `libs/mi-report/src/index.ts` — exports `generateAndSendMiReport` from `report-service.js`

## `libs/notifications` — File Attachment Extension

- [ ] Add `sendEmailWithFile` function to `libs/notifications/src/govnotify/govnotify-client.ts` — accepts `{ emailAddress, templateId, fileBuffer, filename }`; uses `notifyClient.prepareUpload(fileBuffer, { filename, confirmEmailBeforeDownload: false, retentionPeriod: '1 week' })`; sends email with `personalisation: { link_to_file: uploadedFile }`; returns `SendEmailResult`; template ID passed as parameter (not read from `getTemplateId()` to avoid coupling to the subscription template)
- [ ] Export `sendEmailWithFile` and its `SendEmailWithFileParams` interface from `libs/notifications/src/index.ts`
- [ ] Add unit tests for `sendEmailWithFile` to the existing or new test file for `govnotify-client.ts` — test successful file send returns notification ID; test Notify API error returns `{ success: false, error }` without throwing

## API Route

- [ ] Create `libs/api/src/routes/v1/mi/report.ts` — exports `GET = [authenticateApi(), handler]`; handler calls `generateAndSendMiReport()`; returns `200 { success: true }` on success; returns `500 { success: false }` with `console.error` on caught error
- [ ] Create `libs/api/src/routes/v1/mi/report.test.ts` — unit tests mocking `@hmcts/mi-report` and `oauth-middleware.js`; test 200 response on success; test 500 response when `generateAndSendMiReport` throws

## Cron Script

- [ ] Create `apps/crons/src/mi-report.ts` — exports `default async function miReport()`; calls `generateAndSendMiReport()` from `@hmcts/mi-report`; logs start and completion; on error, logs the error and calls `process.exit(1)`

## Environment Variables and Configuration

- [ ] Add `GOVUK_NOTIFY_TEMPLATE_ID_MI_REPORT` to `apps/crons/helm/values.yaml` under `job.keyVaults.cath.secrets`
- [ ] Add `MI_REPORT_RECIPIENT_EMAIL` to `apps/crons/helm/values.yaml` under `job.keyVaults.cath.secrets`
- [ ] Update `apps/crons/helm/values.yaml` `SCRIPT_NAME` to `mi-report` (or document that it must be set per-deployment in flux overrides)
