# Technical Plan: #353 - Automate Media Application Reporting and Cleanup

## Overview

Add a new cron script that retrieves all APPROVED and REJECTED media applications, generates a CSV report, emails it to the admin team via GOV.UK Notify with a secure download link, then deletes the processed records. The script follows the existing `apps/crons` pattern where `SCRIPT_NAME=media-application-report` causes `index.ts` to dynamically import `media-application-report.ts`.

---

## Technical Approach

The implementation touches three layers:

1. **Data layer** (`libs/admin-pages`) — two new query functions added to the existing `queries.ts`
2. **Notification layer** (`libs/notifications`) — a new self-contained module directory with its own template config, isolated from the existing subscription template config
3. **Cron script** (`apps/crons`) — the orchestrator that wires the above together with CSV generation via `papaparse`

The new notification function lives in its own directory (`libs/notifications/src/media-application-report/`) rather than in `govnotify/`, because it needs a different template ID env var and uses `prepareUpload()` rather than plain email. Reusing `getTemplateId()` from `template-config.ts` would be wrong — that function reads `GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION`.

Deletion is unconditional once the email send succeeds. If send fails, the error propagates out of the cron default export, and `apps/crons/src/index.ts` catches it and calls `process.exit(1)`.

---

## Files to Create or Modify

### 1. `libs/admin-pages/src/media-application/queries.ts` — MODIFY

Add two functions after the existing `getPendingCount()`:

**`getProcessedApplications()`**
- Queries `prisma.mediaApplication.findMany` where status is `APPROVED` or `REJECTED`
- Selects: `id`, `name`, `email`, `employer`, `status`, `appliedDate`
- Orders by `appliedDate` ascending (oldest first, consistent with report expectations)
- Returns a typed array; define the return type inline as a new exported interface `ProcessedApplicationSummary` in `model.ts`

**`deleteProcessedApplications()`**
- Calls `prisma.mediaApplication.deleteMany` where status is `APPROVED` or `REJECTED`
- Returns `count` from the Prisma `BatchPayload` result
- Does not log — the cron script is responsible for logging the count

### 2. `libs/admin-pages/src/media-application/model.ts` — MODIFY

Add a new exported interface `ProcessedApplicationSummary` with fields:
- `id: string`
- `name: string`
- `email: string`
- `employer: string`
- `status: ApplicationStatus`
- `appliedDate: Date`

### 3. `libs/admin-pages/src/index.ts` — MODIFY

Currently contains only a comment. Export the two new query functions and the new type so the cron can import from `@hmcts/admin-pages`:

```typescript
export { getProcessedApplications, deleteProcessedApplications } from "./media-application/queries.js";
export type { ProcessedApplicationSummary } from "./media-application/model.js";
```

### 4. `libs/notifications/src/media-application-report/media-application-report-service.ts` — CREATE

New file containing `sendMediaApplicationReport()`.

**Responsibilities:**
- Accept `csvBuffer: Buffer`, `reportDate: string`, `applicationCount: number`, `recipientEmail: string`
- Read `GOVUK_NOTIFY_TEMPLATE_ID_MEDIA_APPLICATION_REPORT` and `GOVUK_NOTIFY_API_KEY` env vars, throwing if either is absent
- Create a `NotifyClient` instance with the API key
- Call `notifyClient.prepareUpload(csvBuffer, { confirmEmailBeforeDownload: false })` to get the `link_to_file` object
- Call `notifyClient.sendEmail(templateId, recipientEmail, { personalisation: { report_date, application_count, link_to_file } })`
- Return `SendEmailResult` (reuse the existing interface from `govnotify-client.ts`)

Reading env vars inside the function (not at module load time) keeps the pattern testable and consistent with how `getApiKey()` and `getTemplateId()` work in `template-config.ts`.

**Why not reuse `sendEmail()` from `govnotify-client.ts`?**
The existing `sendEmail()` uses `getTemplateId()` (hardcoded to the subscription template) and does not support `prepareUpload()`. Wrapping it would require invasive changes and add coupling. A standalone function is simpler.

### 5. `libs/notifications/src/index.ts` — MODIFY

Add export:

```typescript
export { sendMediaApplicationReport } from "./media-application-report/media-application-report-service.js";
```

### 6. `apps/crons/src/media-application-report.ts` — CREATE

The cron script. Exports a `default` async function as required by `apps/crons/src/index.ts`.

**Logic:**

```
1. Call getProcessedApplications()
2. If empty → log "[media-application-report] No processed applications found. Skipping report." → return
3. Map applications to CSV rows (appliedDate formatted as YYYY-MM-DD)
4. Call Papa.unparse(rows, { header: true }) with column headers matching the spec
5. Create Buffer.from(csvString, "utf-8")
6. Call formatReportDate(new Date()) → "DD Month YYYY" string
7. Read MEDIA_APPLICATION_REPORT_RECIPIENT_EMAIL env var; throw if absent
8. Call sendMediaApplicationReport({ csvBuffer, reportDate, applicationCount, recipientEmail })
9. Log "[media-application-report] Report email sent for N applications."
10. Call deleteProcessedApplications()
11. Log "[media-application-report] Deleted N processed media applications."
```

**`formatReportDate(date: Date): string`** — module-private function. Format: `"20 February 2026"`. Reuse the same month-name array pattern from `template-config.ts`. Do not import from `template-config.ts` to avoid coupling.

**Error propagation:** No try/catch in the default export. Errors thrown by `sendMediaApplicationReport()` or `deleteProcessedApplications()` propagate to `apps/crons/src/index.ts`'s `.catch()`, which logs and exits with code 1.

**CSV column order** (matches ticket spec):
| Column header | Source field | Notes |
|---|---|---|
| `Application ID` | `id` | |
| `Applicant Name` | `name` | |
| `Email Address` | `email` | |
| `Employer` | `employer` | |
| `Status` | `status` | |
| `Applied Date` | `appliedDate` | `toISOString().split("T")[0]` → `YYYY-MM-DD` |

### 7. `apps/crons/package.json` — MODIFY

Add to `dependencies`:
```json
"@hmcts/admin-pages": "workspace:*",
"@hmcts/notifications": "workspace:*",
"papaparse": "5.5.3"
```

Add to `devDependencies`:
```json
"@types/papaparse": "5.5.2"
```

### 8. `apps/crons/tsconfig.json` — MODIFY

Add references:
```json
{ "path": "../../libs/admin-pages" },
{ "path": "../../libs/notifications" }
```

### 9. `apps/crons/helm/values.yaml` — MODIFY

Add new environment variables and key vault secrets:

```yaml
job:
  environment:
    SCRIPT_NAME: 'media-application-report'
  keyVaults:
    cath:
      secrets:
        - app-insights-connection-string
        - dynatrace-url
        - govuk-notify-api-key
        - govuk-notify-template-id-media-application-report
        - media-application-report-recipient-email
```

`GOVUK_NOTIFY_API_KEY` is already used by `libs/notifications` but is not currently in the crons helm config — it must be added. Whether these go in key vault or as plain environment variables is a platform team decision (see open questions).

---

## Error Handling and Edge Cases

| Scenario | Behaviour |
|---|---|
| No APPROVED/REJECTED applications | Log and return early — no email, no deletion |
| `GOVUK_NOTIFY_API_KEY` not set | Throw `Error` inside `sendMediaApplicationReport()` — propagates to exit(1) |
| `GOVUK_NOTIFY_TEMPLATE_ID_MEDIA_APPLICATION_REPORT` not set | Throw `Error` inside `sendMediaApplicationReport()` — propagates to exit(1) |
| `MEDIA_APPLICATION_REPORT_RECIPIENT_EMAIL` not set | Throw `Error` in cron script — propagates to exit(1) |
| GOV.UK Notify `sendEmail` fails | Throw — no deletion performed, exits with code 1 |
| `deleteProcessedApplications()` fails | Throw — exits with code 1; same records appear in next run (idempotent by design) |

---

## Acceptance Criteria Mapping

| Acceptance criterion | Implementation |
|---|---|
| Retrieve list and check if not empty | `getProcessedApplications()` + early return on empty |
| Generate CSV with application data | `Papa.unparse()` with mapped rows |
| Send report via email using appropriate template | `sendMediaApplicationReport()` with `GOVUK_NOTIFY_TEMPLATE_ID_MEDIA_APPLICATION_REPORT` |
| Delete APPROVED and REJECTED applications | `deleteProcessedApplications()` called only after successful send |
| Log entry confirming deletion count | `console.log("[media-application-report] Deleted N processed media applications.")` |

---

## Open Questions

1. **Cron schedule frequency** — the ticket states this is unspecified. The platform team must set the Kubernetes CronJob `schedule` in the Helm chart. The current `values.yaml` placeholder `"0 0/10 * * *"` must be updated.

2. **Key vault vs plain env vars** — `GOVUK_NOTIFY_TEMPLATE_ID_MEDIA_APPLICATION_REPORT` and `MEDIA_APPLICATION_REPORT_RECIPIENT_EMAIL` should go in key vault (they are secrets/config values that differ per environment). Confirm with platform team.

3. **GOV.UK Notify template creation** — the template must be created in the Notify dashboard before deployment. This is a manual step outside this codebase.

4. **File upload size limit** — GOV.UK Notify imposes a 2 MB limit on `prepareUpload()`. If the number of processed applications becomes very large this could fail. No mitigation is needed now (YAGNI), but worth noting for future.
