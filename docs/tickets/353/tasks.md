# Tasks: #353 Automate media application reporting and cleanup

## Implementation Tasks

### Lib scaffolding (`libs/media-reporting`)
- [x] Create `libs/media-reporting/package.json` (`@hmcts/media-reporting`, `type: module`, `.` export only with production/default conditions, standard scripts). Dependencies: `@hmcts/postgres-prisma`, `@hmcts/notification`, `papaparse` `5.5.4`. Dev dependencies: `@types/papaparse` `5.5.2`, `@types/node`, `typescript`, `vitest`
- [x] Create `libs/media-reporting/tsconfig.json` (standard lib config, excludes tests, references postgres-prisma and notification) -- composite, no project references: `@hmcts/notification` is not composite and no other lib uses references; resolution is via root paths, same as `libs/admin-pages`
- [x] Add `"@hmcts/media-reporting": ["libs/media-reporting/src"]` to root `tsconfig.json` paths
- [x] Run `yarn install`

### Queries
- [x] `libs/media-reporting/src/media-application-report/queries.ts`: `getProcessedApplications()` (status in APPROVED/REJECTED, select id/name/email/employer/status/appliedDate, `appliedDate` asc) and `deleteApplicationsByIds(ids)` (returns `count`)
- [x] `queries.test.ts` (AAA, mock `@hmcts/postgres-prisma`): checks the where/select/orderBy arguments, the empty result, that `deleteMany` is called with `id: { in: ids }`, the returned count, and a zero count

### CSV
- [x] `report-csv.ts`: `buildMediaApplicationReportCsv(applications)` with PIP's headers minus Status date (`Full name, Email, Employer, Request date, Status`), `dd-MM-yyyy HH:mm:ss` dates in Europe/London, and `Papa.unparse(..., { escapeFormulae: true })`
- [x] `report-csv.test.ts`: header order, row mapping, a BST date, commas/quotes/newlines quoted, and `=`/`+`/`-`/`@` values escaped

### Email (`libs/notification`)
- [x] `libs/notification/src/media-application-report-email.ts`: `sendMediaApplicationReportEmail({ csvBuffer, reportDate, applicationCount })`
  - Getters that read env when called and throw `<VAR> environment variable is not set`
  - Recipient email format check
  - 2 MB size guard
  - `prepareUpload` with `.csv` filename, `confirmEmailBeforeDownload: false` and `retentionPeriod: "78 weeks"` (as PIP)
  - Personalisation `link_to_file` and `env_name` (PIP template `c59c90a3-…`); `env_name` from `ENV_NAME` with a display map (prod→Production, aat→AAT, demo→Demo, perftest→Perftest, else raw, Local when unset)
  - Notify errors wrapped as `GOV.UK Notify error: ...` via `extractNotifyError`, then thrown
- [x] Export it from `libs/notification/src/index.ts`
- [x] `media-application-report-email.test.ts` (mock `notifications-node-client`): correct template ID, recipient and personalisation; env display-name mapping; upload options; each missing env var; invalid recipient; oversized buffer; Notify error rethrown with the prefix

### Orchestration
- [x] `report-service.ts`: `runMediaApplicationReport(now = new Date())`. Read, return early if empty, build CSV, send email, delete by the reported IDs, log counts with the `[media-reporting]` prefix, wrap read/delete errors, warn when the deleted count is not the same as the reported count
- [x] `libs/media-reporting/src/index.ts`: export `runMediaApplicationReport`
- [x] `report-service.test.ts` (mock queries, CSV and `@hmcts/notification`):
  - empty list: log only, no email, no delete
  - happy path: email called with the buffer and count, then delete called with the reported IDs, deletion log written
  - delete runs after the email (call order)
  - email throws: error logged, rethrown, delete not called
  - read throws: wrapped error
  - delete throws: wrapped error
  - count mismatch: warning

### Cron app wiring (`apps/crons`)
- [x] `apps/crons/src/media-reporting.ts`: default export that awaits `runMediaApplicationReport()`
- [x] `apps/crons/src/media-reporting.test.ts`: delegates to the lib, and passes errors through unchanged
- [x] Add `"@hmcts/media-reporting": "workspace:*"` to `apps/crons/package.json`. Add a project reference to `apps/crons/tsconfig.json`
- [x] `apps/crons/helm/values.yaml`: add KV secrets `govuk-notify-api-key` -> `GOVUK_NOTIFY_API_KEY` and `pip-team-email` -> `MEDIA_APPLICATION_REPORT_RECIPIENT_EMAIL`. Add env values `GOVUK_NOTIFY_TEMPLATE_ID_MEDIA_APPLICATION_REPORT: c59c90a3-1806-4649-b4b5-b6bce8f8f72c` and `ENV_NAME: "{{ .Values.global.environment }}"` (check it renders with `helm template`)
- [ ] Local smoke test: run `SCRIPT_NAME=media-reporting yarn workspace @hmcts/crons dev` against a seeded local DB with a Notify test key. Confirm the email arrives, the CSV opens, APPROVED/REJECTED rows are gone and PENDING rows remain
- [x] Check that `docker build --target crons` succeeds and the image resolves `@hmcts/media-reporting` from `dist/` (production condition)

### Quality gates
- [x] `yarn lint:fix`, `yarn test` and the TypeScript build pass from the repo root
- [x] Coverage for the new lib and email function is above 80%

### Manual prerequisites (before deploying to AAT)
- [ ] Resolve the remaining CLARIFICATIONS NEEDED items in `plan.md` (recipient value, template check)
- [ ] Check PIP's template `c59c90a3-…` in the Notify dashboard (same service as CaTH's key; personalisation `link_to_file`, `env_name`)
- [ ] Add `pip-team-email` to every `cath-<env>` key vault (value from the matching `pip-ss-kv-<env>` if the same team). Confirm `govuk-notify-api-key` exists in each (present in `cath-aat`). Do this **before** the chart change deploys, or the existing `cath-crons` job fails to mount secrets too
- [ ] Confirm the non-prod Notify key can send to the recipient (team or guest list)

### cnp-flux-config (separate repo and PR, after the cath-service image is published)
- [ ] Add `apps/cath/cath-media-reporting-cron/cath-media-reporting-cron.yaml`, a HelmRelease based on `cath-crons/cath-crons.yaml`: `releaseName`/`releaseNameOverride` `cath-media-reporting-cron`, image policy `flux-system:cath-crons`, `SCRIPT_NAME: media-reporting`, `schedule: "0 0 * * 1"`
- [ ] Add per-cluster schedule patches `apps/cath/cath-media-reporting-cron/<env>/00.yaml` (`0 0 * JAN,MAR,MAY,JUL,SEP,NOV MON`) and `<env>/01.yaml` (`0 0 * FEB,APR,JUN,AUG,OCT,DEC MON`) for aat, demo and perftest
- [ ] Add the HelmRelease resource to `apps/cath/{aat,demo,perftest}/base/kustomization.yaml`
- [ ] Add `patches:` entries to `apps/cath/<env>/00/kustomization.yaml` and `apps/cath/<env>/01/kustomization.yaml` for aat, demo and perftest
- [ ] After reconciliation in AAT, trigger the job manually (`kubectl create job --from=cronjob/cath-media-reporting-cron ...`) on the active cluster. Check the logs, the email and CSV, and the DB state. Confirm only one cluster has an active schedule for the current month
