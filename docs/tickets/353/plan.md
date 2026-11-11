# Technical Plan: #353 Automate media application reporting and cleanup

TEMPLATE SOURCE: n/a

## 1. Technical Approach

### Strategy

Add a new cron script, `media-reporting`, to the existing `apps/crons` runner. Per the final ticket comment, the names are fixed:

| Item | Value |
|---|---|
| Cron (HelmRelease) name | `media-reporting-cron` (released in CaTH flux as `cath-media-reporting-cron`) |
| `SCRIPT_NAME` / script file | `media-reporting` -> `apps/crons/src/media-reporting.ts` |
| Schedule | `0 0 * * 1` (midnight UTC every Monday) |

The spec's `media-application-report` name is replaced by `media-reporting` everywhere (file name, `SCRIPT_NAME`, log prefix `[media-reporting]`).

The flow on each run:

1. Read all `media_application` rows with status `APPROVED` or `REJECTED`.
2. If there are none, log and return (exit 0). No email, no delete.
3. Build a CSV with papaparse.
4. Upload the CSV through Notify `prepareUpload` and send one email to the configured team address.
5. Only if the send succeeds, delete exactly the rows that were in the report (`deleteMany({ where: { id: { in: ids } } })`) and log the count.
6. Any failure throws. `apps/crons/src/index.ts` already logs `Cron job failed:` and exits 1.

### Architecture

```
apps/crons/src/index.ts  (loads key vault secrets, then dynamic import)
        |
        v
apps/crons/src/media-reporting.ts   (thin: default export calls the lib)
        |
        v
@hmcts/media-reporting  (libs/media-reporting)
   report-service.ts  -> queries.ts  -> @hmcts/postgres-prisma
                      -> report-csv.ts (papaparse)
                      -> @hmcts/notification.sendMediaApplicationReportEmail
```

### Key considerations

- **Business logic goes in a lib, not in `apps/crons`.** The cron script just calls `runMediaApplicationReport()`, as CLAUDE.md requires (apps are composition only).
- **New small lib instead of adding to `@hmcts/admin-pages`.** The spec puts the queries in `libs/admin-pages/src/media-application/queries.ts`. I am not doing that, for these reasons:
  - The crons image installs only the crons workspace graph (`yarn workspaces focus @hmcts/crons --production`, plain `toolchain` stage with no Chromium).
  - `@hmcts/admin-pages` depends on publication, system-admin-pages, list types and, through them, `@hmcts/pdf-generation`/puppeteer.
  - Its index also loads `service.ts`, which imports `@hmcts/auth`, `@hmcts/account` and `@hmcts/azure-blob` when the module is loaded.
  - A dedicated `@hmcts/media-reporting` lib depends only on `@hmcts/postgres-prisma`, `@hmcts/notification` and `papaparse`. That keeps the cron image small and avoids side effects from config that runs on import.
  - The cost is one small duplicate: a local `PROCESSED_STATUSES = ["APPROVED", "REJECTED"]` constant.
- **Email goes through `@hmcts/notification` (singular), not `@hmcts/notifications`.** `@hmcts/notification` already holds the media application emails (rejection, new account, duplicate account) and depends only on `notifications-node-client`. `@hmcts/notifications` has about 40 workspace dependencies, including every list type and the PDF generator, and its `sendEmail` swallows errors into `{ success: false }`. Retry is not needed here: if the run fails, nothing is deleted and next Monday's run includes the same rows. So the new function follows the existing `sendMedia*Email` pattern and **throws** on failure. This is a deliberate change from the earlier "add `csvBuffer` to `sendEmail`" idea. If reviewers want the shared retry wrapper, the fallback is to add an optional `csvBuffer` to `SendEmailParams` in `libs/notifications/src/govnotify/govnotify-client.ts`. That pulls the heavy dependency graph into the crons image.
- **Delete by reported IDs, not by status.** If an admin approves a pending application between the read and the delete, a status-based `deleteMany` would remove a row that was never reported. Deleting `id IN (reportedIds)` closes that gap and still meets AC3 ("deletes all APPROVED/REJECTED", meaning all those that existed at read time).
- **No blob cleanup needed.** `libs/admin-pages/src/media-application/service.ts` already deletes the proof-of-id blob on approve and reject.
- **Env vars are read after secrets load.** `index.ts` calls `getPropertiesVolumeSecrets` before `import("./media-reporting.js")`, so constants that `@hmcts/notification` reads when its module loads (`GOVUK_NOTIFY_API_KEY`) are populated in time. The new template ID and recipient are still read through getter functions when called, so tests can set them per case.
- **Fixing PIP's behaviour.** Legacy PIP swallows the email failure and deletes anyway, so data is lost. The ticket asks for no deletion on email failure, and this design does that.
- **CSV injection.** Applicant name and employer are free text supplied by the public. Use `Papa.unparse(rows, { escapeFormulae: true })` so values starting with `=`, `+`, `-` or `@` are neutralised before the CSV is opened in Excel.
- **PII.** The CSV contains names and emails. Never log row contents, only counts. Upload options follow PIP (`confirmEmailBeforeDownload: false`, 78 weeks). The link only goes to the team mailbox.
- **Aligned with legacy PIP.** Where PIP already made a decision, CaTH reuses it: the Notify template, secret name, retention, CSV columns, `env_name` and per-cluster schedules. See "Decisions taken from legacy PIP" below.

### Decisions taken from legacy PIP

| Question | PIP evidence | Decision for CaTH |
|---|---|---|
| Notify service and template | CaTH already sends with PIP template IDs: `GOVUK_NOTIFY_TEMPLATE_ID_SYSTEM_ADMIN` `b3c0a60f-…` = PIP `SYSTEM_ADMIN_UPDATE_EMAIL`, and `values.dev.yaml` uses PIP `MEDIA_NEW_ACCOUNT_SETUP` `689c0183-…`. Template IDs only work with an API key from the same service, so CaTH's `govuk-notify-api-key` is on PIP's Notify service | Reuse PIP's `MEDIA_APPLICATION_REPORTING_EMAIL` template `c59c90a3-1806-4649-b4b5-b6bce8f8f72c`. No new template needed. Personalisation is what that template expects: `link_to_file`, `env_name` |
| Recipient secret | `pip-team-email` → `PI_TEAM_EMAIL`, in `pip-ss-kv-<env>`, seeded from the bootstrap vault (`pip-shared-infrastructures/tf-kv-secrets-bootstrap.tf`) | Same secret name `pip-team-email` in each `cath-<env>` vault, mounted as `MEDIA_APPLICATION_REPORT_RECIPIENT_EMAIL`. `cath-aat` does not have it yet (checked) |
| Link retention | `fileRetentionWeeks: 78`, `prepareUpload(csv, false, 78)` | `retentionPeriod: "78 weeks"`, `confirmEmailBeforeDownload: false` |
| CSV columns | `Full name, Email, Employer, Request date, Status, Status date`, dates `dd-MM-yyyy HH:mm:ss` | Same columns minus `Status date` (CaTH has no such column): `Full name, Email, Employer, Request date, Status`. `Request date` from `appliedDate`, `dd-MM-yyyy HH:mm:ss` in Europe/London |
| `env_name` | Chart sets `ENV_NAME: "{{ .Values.global.environment }}"`; `Environments.convertEnvironmentName` maps `prod`→Production, `stg`→Staging, `test`→Test, `demo`→Demo, unknown → raw value | Add `ENV_NAME: "{{ .Values.global.environment }}"` to `apps/crons/helm/values.yaml`; small display map (`prod`→Production, `aat`→AAT, `demo`→Demo, `perftest`→Perftest, else raw) |
| Double run across clusters | Chart has `disableActiveClusterCheck: true`; every cron has `<cron>/<env>/00.yaml` and `01.yaml` patches with non-overlapping schedules. Media reporting: 00 odd months, 01 even months, Mondays | Same per-cluster patches in cnp-flux-config for aat, demo and perftest (all have `00`/`01` folders) |
| Report scope | `findAll()` reports PENDING too; only APPROVED/REJECTED deleted | Same: all applications reported, PENDING kept. If only PENDING exist, the email is still sent and nothing is deleted |
| Code location | Split across 3 services (cron-trigger → account-management → publication-services) | Not applicable to CaTH. Single cron, `libs/media-reporting` + `@hmcts/notification` (reasons above) |

### Legacy PIP comparison (for reference)

| Aspect | PIP (`sds-flux-config apps/pip/account-management-media-reporting-cron`) | CaTH (this plan) |
|---|---|---|
| Trigger | `pip-cron-trigger` image, `TRIGGER_TYPE=MEDIA_APPLICATION_REPORTING`, HTTP POST to account-management `/media-application/reporting` | `cath-crons` image, `SCRIPT_NAME=media-reporting`, direct DB access |
| Data read | `findAll()`: every application, including PENDING | Every application, including PENDING (matches PIP; agreed change from the ticket's "approved and rejected" wording). Only APPROVED/REJECTED are deleted |
| CSV columns | Full name, Email, Employer, Request date, Status, Status date | Full name, Email, Employer, Request date, Status (no status-date column exists) |
| Upload retention | `prepareUpload` 78 weeks | 78 weeks |
| Template ID / recipient | Template `c59c90a3-…` hardcoded in `Templates.java`; recipient from KV `pip-team-email` -> `PI_TEAM_EMAIL` | Same template ID as a plain helm env value; recipient from KV `pip-team-email` |
| Email failure | Swallowed, deletion still runs | Throws, no deletion, exit 1 |
| Deletion | `deleteAllInBatch` by status | `deleteMany` by reported IDs |
| Double-run avoidance | `disableActiveClusterCheck: true` plus per-cluster schedule patches: 00 = `0 0 * JAN,MAR,MAY,JUL,SEP,NOV MON`, 01 = `0 0 * FEB,APR,JUN,AUG,OCT,DEC MON` | Same per-cluster patch approach (recommended; see clarifications) |

## 2. Implementation Details

### API endpoints

None.

### Database schema changes

None. This uses the existing `MediaApplication` model (`libs/postgres-prisma/prisma/schema/base.prisma`). There is no status-date column, so the CSV uses `appliedDate` only. Adding a decision date is out of scope.

### File structure

```
libs/media-reporting/                                  NEW lib @hmcts/media-reporting
├── package.json                                       deps: @hmcts/postgres-prisma, @hmcts/notification, papaparse 5.5.4; dev: @types/papaparse 5.5.2
├── tsconfig.json                                      standard lib tsconfig (references postgres-prisma, notification)
└── src/
    ├── index.ts                                       export { runMediaApplicationReport }
    └── media-application-report/
        ├── queries.ts                                 getProcessedApplications, deleteApplicationsByIds
        ├── queries.test.ts
        ├── report-csv.ts                              buildMediaApplicationReportCsv
        ├── report-csv.test.ts
        ├── report-service.ts                          runMediaApplicationReport (orchestration)
        └── report-service.test.ts

libs/notification/src/
├── media-application-report-email.ts                  NEW sendMediaApplicationReportEmail
├── media-application-report-email.test.ts             NEW
└── index.ts                                           export the new function

apps/crons/
├── src/media-reporting.ts                             NEW default export -> runMediaApplicationReport()
├── src/media-reporting.test.ts                        NEW
├── package.json                                       add "@hmcts/media-reporting": "workspace:*"
├── tsconfig.json                                      add reference ../../libs/media-reporting
└── helm/values.yaml                                   add KV secrets + template ID env

tsconfig.json (root)                                   add path "@hmcts/media-reporting": ["libs/media-reporting/src"]
```

The lib has no pages, assets or routes, so `config.ts` and a `./config` export are not needed (YAGNI). `package.json` exports only `.`.

### Module details

**`queries.ts`**

```ts
const PROCESSED_STATUSES = ["APPROVED", "REJECTED"];

export async function getProcessedApplications(): Promise<ProcessedApplication[]>
// prisma.mediaApplication.findMany({
//   where: { status: { in: PROCESSED_STATUSES } },
//   select: { id, name, email, employer, status, appliedDate },
//   orderBy: { appliedDate: "asc" }
// })

export async function deleteApplicationsByIds(ids: string[]): Promise<number>
// prisma.mediaApplication.deleteMany({ where: { id: { in: ids } } }) -> result.count

interface ProcessedApplication { id; name; email; employer; status; appliedDate: Date }
```

The deleted count is the number of rows actually removed. If it differs from `ids.length`, log a warning, because rows may have been removed concurrently. Do not throw.

**`report-csv.ts`**

`buildMediaApplicationReportCsv(applications: ProcessedApplication[]): string`

- Maps each row to PIP's headers minus `Status date`: `Full name`, `Email`, `Employer`, `Request date`, `Status`.
- `Request date` comes from `appliedDate`, formatted `dd-MM-yyyy HH:mm:ss` (PIP's format) in `Europe/London` via `Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", ... })`. Plain `toISOString()` would be UTC and shift times during BST.
- `Papa.unparse(rows, { escapeFormulae: true })`.

**`report-service.ts`**

`runMediaApplicationReport(now = new Date()): Promise<void>`

1. `getProcessedApplications()`. On failure, rethrow as `Failed to retrieve processed applications: <msg>`.
2. If the result is empty, log `[media-reporting] No processed applications found. Skipping report.` and return.
3. Build the CSV and convert it to a `Buffer` (`Buffer.from(csv, "utf8")`).
4. Call `sendMediaApplicationReportEmail({ csvBuffer, reportDate: now, applicationCount })`. On failure, log `[media-reporting] Failed to send report email: <msg>` and rethrow.
5. Log `[media-reporting] Report email sent for N applications.`
6. `deleteApplicationsByIds(ids)`. On failure, rethrow as `Failed to delete processed applications: <msg>`.
7. Log `[media-reporting] Deleted N processed media applications.`

The service throws; it never calls `process.exit`. `apps/crons/src/index.ts` owns exit codes.

**`libs/notification/src/media-application-report-email.ts`**

`sendMediaApplicationReportEmail({ csvBuffer, reportDate, applicationCount }): Promise<void>`

- Reads `GOVUK_NOTIFY_API_KEY`, `GOVUK_NOTIFY_TEMPLATE_ID_MEDIA_APPLICATION_REPORT` and `MEDIA_APPLICATION_REPORT_RECIPIENT_EMAIL` from `process.env` when called, in small getters. Throws `<VAR> environment variable is not set` when one is missing. Throws `MEDIA_APPLICATION_REPORT_RECIPIENT_EMAIL is not a valid email address` if a basic email regex fails.
- `link_to_file = NotifyClient.prepareUpload(csvBuffer, { filename: "media-application-report-<YYYY-MM-DD>.csv", confirmEmailBeforeDownload: false, retentionPeriod: "78 weeks" })`, matching PIP. The `filename` must end in `.csv` so Notify serves it as a CSV and not as a `.txt` download.
- If `csvBuffer.length` exceeds 2 MB (Notify's limit), throw `Media application report CSV exceeds the 2MB GOV.UK Notify limit` before calling Notify.
- `notifyClient.sendEmail(templateId, recipient, { personalisation: { link_to_file, env_name }, reference: "media-application-report-<timestamp>" })`. These are the two fields PIP's template `c59c90a3-…` uses.
- `env_name` is `process.env.ENV_NAME` mapped to a display name (`prod`→Production, `aat`→AAT, `demo`→Demo, `perftest`→Perftest, otherwise the raw value; `Local` when unset), mirroring PIP's `convertEnvironmentName`. `reportDate` and `applicationCount` are only used for the log line and reference.
- Wraps errors with the existing `extractNotifyError` into `GOV.UK Notify error: <message>` and throws.

**`apps/crons/src/media-reporting.ts`**

```ts
import { runMediaApplicationReport } from "@hmcts/media-reporting";

export default async function mediaReporting() {
  await runMediaApplicationReport();
}
```

**`apps/crons/helm/values.yaml`**

Leave the default `SCRIPT_NAME: 'example'`. Flux overrides it per release.

- Under `keyVaults.cath.secrets` add:
  - `govuk-notify-api-key` -> `GOVUK_NOTIFY_API_KEY`
  - `pip-team-email` -> `MEDIA_APPLICATION_REPORT_RECIPIENT_EMAIL` (same secret name as PIP)
- Under `environment` add:
  - `GOVUK_NOTIFY_TEMPLATE_ID_MEDIA_APPLICATION_REPORT: c59c90a3-1806-4649-b4b5-b6bce8f8f72c` (PIP's template; CaTH precedent puts template IDs as plain values, same in every environment)
  - `ENV_NAME: "{{ .Values.global.environment }}"` (as PIP's chart does). Check with `helm template` that the job chart renders it through `tpl`; if not, set `ENV_NAME` per environment in the flux patches instead.
- Side effect: every release of the shared crons chart (including the existing `cath-crons` example job) will now mount these two secrets. That is harmless, but both secrets must exist in every `cath-<env>` key vault **before** the chart is deployed, or pods fail to mount the CSI volume.

### cnp-flux-config changes (separate repo, separate PR; not implemented here)

1. `apps/cath/cath-media-reporting-cron/cath-media-reporting-cron.yaml`: HelmRelease copied from `cath-crons/cath-crons.yaml`.
   - `releaseName` and `releaseNameOverride` set to `cath-media-reporting-cron`.
   - Same `cath-crons` chart from `hmctsprod-oci`.
   - Image reuses `# {"$imagepolicy": "flux-system:cath-crons"}`.
   - `job.environment.SCRIPT_NAME: media-reporting`.
   - `job.schedule: "0 0 * * 1"` as the base value.
2. Per-cluster schedule patches, the same layout as PIP (`<cron>/<env>/00.yaml`, `01.yaml`), for each of `aat`, `demo`, `perftest`:
   - `apps/cath/cath-media-reporting-cron/<env>/00.yaml`: `0 0 * JAN,MAR,MAY,JUL,SEP,NOV MON`
   - `apps/cath/cath-media-reporting-cron/<env>/01.yaml`: `0 0 * FEB,APR,JUN,AUG,OCT,DEC MON`

   Together these give "every Monday" with only one cluster running each week. Each patch is a HelmRelease stub (`metadata.name: cath-media-reporting-cron`, `spec.values.job.schedule`), like PIP's.
3. Add `../../cath-media-reporting-cron/cath-media-reporting-cron.yaml` to `apps/cath/{aat,demo,perftest}/base/kustomization.yaml`. The resource path follows the existing `cath-crons` entry.
4. Add `patches: - path: ../../cath-media-reporting-cron/<env>/00.yaml` to `apps/cath/<env>/00/kustomization.yaml`, and the `01.yaml` equivalent to `apps/cath/<env>/01/kustomization.yaml`. Those files currently contain only `- ../base`.

### Manual prerequisites

- No new Notify template: reuse PIP's `c59c90a3-…`. Check it in the Notify dashboard once to confirm its personalisation is only `link_to_file` and `env_name`.
- Add `pip-team-email` to every `cath-<env>` key vault (secrets are not managed in Terraform). The value can be copied from the matching `pip-ss-kv-<env>` vault if the same team should receive it. `govuk-notify-api-key` already exists in `cath-aat` (checked).
- Before any non-prod run, confirm that the Notify API key used in AAT, demo and perftest is a team or test key, or that the recipient is on the Notify guest list. Otherwise the send fails with a 400 error.

## 3. Error Handling & Edge Cases

| Case | Behaviour |
|---|---|
| No APPROVED/REJECTED rows | Log "No processed applications found. Skipping report.", no email, no delete, exit 0 |
| Missing `GOVUK_NOTIFY_API_KEY`, template ID or recipient | Throw `<VAR> environment variable is not set` before any Notify call; nothing deleted; exit 1 |
| Recipient fails email-format check | Throw; nothing deleted; exit 1 |
| DB read fails | Throw `Failed to retrieve processed applications: ...`; exit 1 |
| CSV over 2 MB | Throw before calling Notify; nothing deleted; exit 1. Unlikely given weekly runs; an alert from the job failing is enough |
| Notify upload or send error (4xx/5xx/network) | Log `[media-reporting] Failed to send report email: GOV.UK Notify error: ...`, rethrow, nothing deleted, exit 1. Next Monday's run includes these rows again |
| Delete fails after a successful email | Throw `Failed to delete processed applications: ...`; exit 1. Next run reports the same rows again (duplicate report, but no data loss; this is documented in the spec) |
| Application approved or rejected between read and delete | Not in the report, so not deleted (delete is by ID); it goes in next week's report |
| Deleted count differs from reported count | Warning logged; not a failure |
| Job fires on both clusters | Prevented by the alternating-month schedule patches. Without them, both clusters could email the same data before either deletes |
| Free-text fields with commas, quotes, newlines | papaparse quotes them |
| Free-text fields starting with `=`, `+`, `-`, `@` | `escapeFormulae: true` prefixes them so spreadsheet formulas do not run |
| `concurrencyPolicy: Forbid` | Already set in the chart, so a slow run cannot overlap the next one |
| Logging | Counts only; never names, emails or row data |

## 4. Acceptance Criteria Mapping

| # | Criterion | How satisfied | Verification |
|---|---|---|---|
| 1 | Retrieves media applications and checks the list is not empty | `getProcessedApplications()` then an empty-list early return in `runMediaApplicationReport` | `queries.test.ts` (where clause, select, asc order); `report-service.test.ts` "should log and return without emailing or deleting when no processed applications exist" |
| 2a | If applications exist, a CSV is generated | `buildMediaApplicationReportCsv` | `report-csv.test.ts`: PIP header row and order, `dd-MM-yyyy HH:mm:ss` in Europe/London (including a BST case), quoting, formula escaping |
| 2b | Report emailed to the team using the template | `sendMediaApplicationReportEmail` with `prepareUpload` and `sendEmail` | `media-application-report-email.test.ts` (mocked `NotifyClient`): template ID `c59c90a3-…`, recipient, personalisation `link_to_file`/`env_name`, env display-name mapping, filename/78-week retention options, missing-env and invalid-email errors, Notify error wrapping. Manual: email received in AAT and the CSV opens |
| 3 | Deletes all APPROVED/REJECTED applications | `deleteApplicationsByIds(reportedIds)` after a successful send | `queries.test.ts` (`deleteMany` with `id in`, returns count); `report-service.test.ts` asserts delete is called with the reported IDs, after the email, and **not** called when the email throws. Manual: query `media_application` in AAT after the run; only PENDING rows remain |
| 4 | Log entry confirms deletion | `[media-reporting] Deleted N processed media applications.` | `report-service.test.ts` asserts the `console.log` call. Manual: check pod logs / App Insights traces for the AAT job |
| Spec | Email failure gives exit 1 and no deletion | Service rethrows; `index.ts` exits 1 | `report-service.test.ts`; existing `apps/crons/src/index.test.ts` covers the exit path |
| Spec | Cron runs as `media-reporting` every Monday 00:00 | `apps/crons/src/media-reporting.ts`; flux HelmRelease plus patches | `media-reporting.test.ts` (default export delegates). Manual: `kubectl create job --from=cronjob/cath-media-reporting-cron ...` in AAT (from flux, as the ticket comment requires) |

No Playwright E2E test: there is no UI, and the crons app is not part of the E2E harness. End-to-end verification is the manual AAT run above.

## 5. CLARIFICATIONS NEEDED

Most of the original questions are answered by legacy PIP (see "Decisions taken from legacy PIP"). Still open:

1. **Recipient value per environment.** The secret name is settled (`pip-team-email`), but someone has to put a value in each `cath-<env>` vault. Should it be the same mailbox as PIP's `pip-team-email` in the matching `pip-ss-kv-<env>`? Should non-prod use a test mailbox instead?
2. **Confirm PIP's template is reusable.** The evidence (CaTH already sends with PIP template IDs) says CaTH's Notify key is on PIP's service. Check once in the Notify dashboard that `c59c90a3-…` exists there and only needs `link_to_file` and `env_name`. If the team wants a CaTH-specific email, create a new template instead and swap the ID.
3. *(Minor)* **CSV columns.** The plan uses PIP's columns minus `Status date`. Confirm the team doesn't need a decision date (that would need a migration, out of scope).
4. *(Minor)* **Library placement.** Confirm the new `@hmcts/media-reporting` lib and the email function in `@hmcts/notification`, instead of the spec's `libs/admin-pages` queries and `libs/notifications` function. The reason is to keep puppeteer and list-type dependencies out of the crons image.
