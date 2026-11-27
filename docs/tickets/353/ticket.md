# #353: CaTH Cron Trigger - Automate Media Application Reporting and Cleanup

**State:** OPEN
**Assignees:** alao-daniel
**Author:** junaidiqbalmoj
**Labels:** type:story
**Created:** 2026-02-12T13:44:40Z
**Updated:** 2026-10-19T08:49:11Z

## Description

I want the system to automatically process media applications for reporting and cleanup, so that the reporting process is streamlined and outdated applications are removed.

**Description:** The system should periodically perform the following actions:

1. Generate Media Application Reports: Retrieve media applications and generate a CSV report for approved and rejected applications. The report should be sent via email to the appropriate team.
2. Delete Processed Applications: Remove media applications that have been approved or rejected to maintain a clean and efficient database.

**Acceptance Criteria:**

1. The system retrieves a list of media applications and checks if the list is not empty.
2. If applications exist:
     A CSV report is generated with the application data.
     The report is sent via email to the specified team using the appropriate email template.
3. The system deletes all media applications with a status of APPROVED or REJECTED.
4. A log entry is created confirming the deletion of approved and rejected applications.

## Comments

### Comment by OgechiOkelu on 2026-02-20T12:25:54Z
@SPEC new-feature.md

### Comment by hmctsclaudecode on 2026-02-20T12:29:25Z
## 1. User Story
**As a** court admin team member
**I want** the system to automatically generate a CSV report of processed media applications, email it to the team, and remove those applications from the database
**So that** reporting is streamlined, no manual effort is required, and the database remains clean of outdated records

---

## 2. Background

The cath-service manages media applications submitted by journalists and media organisations requesting access to court hearings. Admin staff review applications and mark them as `APPROVED` or `REJECTED`. Currently there is no automated mechanism to:

- Report on processed applications
- Remove them from the database once processed

The system has an established cron infrastructure at `apps/crons/` that dynamically loads scripts via the `SCRIPT_NAME` environment variable. This feature adds a new cron script (`media-application-report`) following the existing pattern used by `apps/crons/src/example.ts`.

CSV generation will use the existing `papaparse` library (already used in `libs/system-admin-pages/src/reference-data-upload/services/download-service.ts`). Email delivery will use the GOV.UK Notify integration (already established in `libs/notifications/src/govnotify/govnotify-client.ts`), with a new template created specifically for media application reports.

---

## 3. Acceptance Criteria

* **Scenario:** Applications exist with APPROVED or REJECTED status
    * **Given** there are one or more media applications with a status of `APPROVED` or `REJECTED` in the database
    * **When** the cron job executes
    * **Then** a CSV report is generated containing all such applications, the report is sent via email to the configured recipient address using the GOV.UK Notify media application report template, all `APPROVED` and `REJECTED` applications are deleted from the database, and a log entry is written confirming the count of deleted records

* **Scenario:** No processed applications exist
    * **Given** there are no media applications with a status of `APPROVED` or `REJECTED` in the database
    * **When** the cron job executes
    * **Then** no CSV is generated, no email is sent, no deletions occur, and the job exits cleanly with a log entry confirming zero records found

* **Scenario:** Email delivery fails
    * **Given** GOV.UK Notify is unreachable or returns an error
    * **When** the cron job attempts to send the report email
    * **Then** the error is logged, no applications are deleted, and the job exits with a non-zero exit code to allow the platform to detect the failure and retry

* **Scenario:** Database deletion succeeds
    * **Given** a CSV report has been generated and the email has been sent successfully
    * **When** the deletion query runs
    * **Then** all records with status `APPROVED` or `REJECTED` are removed and the deletion count is logged (e.g. `Deleted 12 processed media applications`)

---

## 4. User Journey Flow

This is a backend cron job with no user-facing interface. The flow is entirely automated:

```
[Cron Trigger (SCRIPT_NAME=media-application-report)]
        |
        v
[Query DB: SELECT media_applications WHERE status IN (APPROVED, REJECTED)]
        |
        +-- No records found --> [Log: "No processed applications to report"] --> [Exit 0]
        |
        v
[Generate CSV with papaparse (columns: ID, Name, Email, Employer, Status, Applied Date)]
        |
        v
[Send email via GOV.UK Notify (template: media-application-report)]
        |
        +-- Email fails --> [Log error] --> [Exit 1 (no deletion performed)]
        |
        v
[DELETE FROM media_application WHERE status IN (APPROVED, REJECTED)]
        |
        v
[Log: "Deleted N processed media applications"]
        |
        v
[Exit 0]
```

---

## 5. Low Fidelity Wireframe

No user-facing UI exists for this feature. The output is an email received by the admin team.

**Email received by team (GOV.UK Notify):**

```
From: Court and Tribunal Hearings Service <no-reply@notifications.service.gov.uk>
To: [configured recipient email]
Subject: Media Application Report - [Date]

Media Application Report

This is an automated report of processed media applications.

Report date: 20 February 2026
Applications included: 14

[Link to download CSV report - expires in 6 months]

--
This email was sent by the Court and Tribunal Hearings Service.
Do not reply to this email.
```

**CSV file structure:**

```
Application ID,Applicant Name,Email Address,Employer,Status,Applied Date
550e8400-e29b-41d4-a716-446655440000,Jane Smith,jane@bbc.co.uk,BBC News,APPROVED,2026-02-10
550e8400-e29b-41d4-a716-446655440001,John Doe,john@itv.com,ITV,REJECTED,2026-02-11
```

---

## 6. Page Specifications

This feature has no user-facing pages. The specification covers the cron script and its supporting modules.

### New file: `apps/crons/src/media-application-report.ts`

The cron script must:

1. Call `getProcessedApplications()` to retrieve all `APPROVED` and `REJECTED` records
2. If the list is empty, log and exit cleanly
3. Generate a CSV string using `papaparse` (`Papa.unparse()`) with columns:
   - `Application ID` → `id`
   - `Applicant Name` → `name`
   - `Email Address` → `email`
   - `Employer` → `employer`
   - `Status` → `status`
   - `Applied Date` → `appliedDate` (formatted as ISO date string `YYYY-MM-DD`)
4. Send the CSV to the configured recipient using GOV.UK Notify via `sendMediaApplicationReport()` (new function in `libs/notifications`)
5. Only if email succeeds: call `deleteProcessedApplications()` and log the count
6. Export a `default` function (required by `apps/crons/src/index.ts`)

### New queries in `libs/admin-pages/src/media-application/queries.ts`

**`getProcessedApplications()`** — fetches all `APPROVED` and `REJECTED` records:
```
SELECT id, name, email, employer, status, applied_date
FROM media_application
WHERE status IN ('APPROVED', 'REJECTED')
ORDER BY applied_date ASC
```

**`deleteProcessedApplications()`** — deletes all `APPROVED` and `REJECTED` records and returns the count:
```
DELETE FROM media_application WHERE status IN ('APPROVED', 'REJECTED')
Returns: { count: number }
```

### New email function in `libs/notifications`

A new function `sendMediaApplicationReport()` must be added that:
- Accepts the CSV string and report metadata (date, count)
- Uploads the CSV to GOV.UK Notify using `prepareUpload()` to generate a secure download link
- Calls the GOV.UK Notify API with template `GOVUK_NOTIFY_TEMPLATE_ID_MEDIA_APPLICATION_REPORT`
- Returns success/failure result

### Helm chart (`apps/crons/helm/`)

A new cron schedule entry must be added for the media application report job, configured to run on the appropriate schedule (to be determined by the platform team). The `SCRIPT_NAME` environment variable must be set to `media-application-report`.

---

## 7. Content

### Email template (GOV.UK Notify — to be created in the Notify dashboard)

**Template name:** `media-application-report`

**Subject:** `Media Application Report - ((report_date))`

**Body:**
```
Media Application Report

This is an automated report of processed (approved and rejected) media applications.

Report date: ((report_date))
Applications included: ((application_count))

Download the CSV report:
((link_to_file))

This link will expire after 6 months.

The applications included in this report have been removed from the system.

--
This is an automated message from the Court and Tribunal Hearings Service.
Do not reply to this email.
```

**Template parameters:**

| Parameter | Description | Example |
|-----------|-------------|---------|
| `report_date` | Formatted date of report generation | `20 February 2026` |
| `application_count` | Number of applications included | `14` |
| `link_to_file` | GOV.UK Notify secure download link for the CSV | _(generated by prepareUpload)_ |

### Log messages (structured console output)

| Event | Log message |
|-------|-------------|
| No records found | `[media-application-report] No processed applications found. Skipping report.` |
| Report email sent | `[media-application-report] Report email sent for N applications.` |
| Email failure | `[media-application-report] Failed to send report email: <error>` |
| Deletion complete | `[media-application-report] Deleted N processed media applications.` |

### CSV column headers

| Column header | Source field |
|---------------|-------------|
| `Application ID` | `id` |
| `Applicant Name` | `name` |
| `Email Address` | `email` |
| `Employer` | `employer` |
| `Status` | `status` |
| `Applied Date` | `appliedDate` (formatted `YYYY-MM-DD`) |

---

## 8. URL

No user-facing URL. This feature is triggered by the Kubernetes cron scheduler.

**Cron execution path (internal):**
```
apps/crons/src/index.ts  →  SCRIPT_NAME=media-application-report  →  apps/crons/src/media-application-report.ts
```

**New environment variables required:**

| Variable | Description |
|----------|-------------|
| `GOVUK_NOTIFY_TEMPLATE_ID_MEDIA_APPLICATION_REPORT` | GOV.UK Notify template ID for the report email |
| `MEDIA_APPLICATION_REPORT_RECIPIENT_EMAIL` | Email address of the team receiving the report |

**Existing environment variables used:**

| Variable | Description |
|----------|-------------|
| `GOVUK_NOTIFY_API_KEY` | GOV.UK Notify API key (already used by `libs/notifications`) |

---

## 9. Validation

No user input is involved. Validation rules apply to the script's environment and data:

| Rule | Behaviour on failure |
|------|----------------------|
| `GOVUK_NOTIFY_API_KEY` must be set | Throw `Error` and exit with code 1 |
| `GOVUK_NOTIFY_TEMPLATE_ID_MEDIA_APPLICATION_REPORT` must be set | Throw `Error` and exit with code 1 |
| `MEDIA_APPLICATION_REPORT_RECIPIENT_EMAIL` must be set | Throw `Error` and exit with code 1 |
| Recipient email must be a valid email format | Throw `Error` and exit with code 1 |
| CSV upload to GOV.UK Notify must succeed before deletion proceeds | On failure, log error and exit with code 1 without deleting |

---

## 10. Error Messages

| Scenario | Log output |
|----------|-----------|
| Missing `GOVUK_NOTIFY_API_KEY` | `GOVUK_NOTIFY_API_KEY environment variable is not set` |
| Missing `GOVUK_NOTIFY_TEMPLATE_ID_MEDIA_APPLICATION_REPORT` | `GOVUK_NOTIFY_TEMPLATE_ID_MEDIA_APPLICATION_REPORT environment variable is not set` |
| Missing `MEDIA_APPLICATION_REPORT_RECIPIENT_EMAIL` | `MEDIA_APPLICATION_REPORT_RECIPIENT_EMAIL environment variable is not set` |
| GOV.UK Notify API error | `[media-application-report] Failed to send report email: GOV.UK Notify error: <details>` |
| Database query failure | `[media-application-report] Failed to retrieve processed applications: <details>` |
| Database deletion failure | `[media-application-report] Failed to delete processed applications: <details>` |

All errors must propagate to `apps/crons/src/index.ts` which catches and logs them with `console.error("Cron job failed:", error)` and exits with code 1, allowing the platform to detect failure and alert.

---

## 11. Navigation

Not applicable — no user-facing navigation. The cron job is fully automated and does not redirect or link to any pages within the service.

---

## 12. Accessibility

Not applicable — this feature has no user-facing interface.

The email output uses a plain-text GOV.UK Notify template, which is inherently accessible. Recipients can download the CSV file and open it in any spreadsheet or assistive technology of their choice.

---

## 13. Test Scenarios

(High-level scenario descriptions only — do not include actual test code)

**Unit tests for `getProcessedApplications()` (new query):**
* Should return all applications with status APPROVED
* Should return all applications with status REJECTED
* Should return an empty array when no processed applications exist
* Should return applications ordered by applied date ascending

**Unit tests for `deleteProcessedApplications()` (new query):**
* Should delete all APPROVED and REJECTED applications and return the correct count
* Should return a count of zero when no processed applications exist
* Should not delete PENDING applications

**Unit tests for `media-application-report` cron script:**
* Should exit cleanly and log a message when no processed applications are found
* Should generate a CSV with the correct columns and data when applications exist
* Should call the email service with the correct recipient, template ID, and parameters
* Should delete processed applications only after email is sent successfully
* Should not delete applications if email sending fails
* Should log the deletion count after successful deletion
* Should throw and exit with code 1 when `GOVUK_NOTIFY_TEMPLATE_ID_MEDIA_APPLICATION_REPORT` is not set
* Should throw and exit with code 1 when `MEDIA_APPLICATION_REPORT_RECIPIENT_EMAIL` is not set

**Unit tests for `sendMediaApplicationReport()` (new email function):**
* Should upload the CSV file and send the email with correct template parameters
* Should return a failure result when GOV.UK Notify returns an error
* Should include the report date formatted as "DD Month YYYY"
* Should include the correct application count in the template parameters

**E2E / integration tests:**
* The cron job, when run with `SCRIPT_NAME=media-application-report`, should complete the full flow: retrieve applications, send email, delete records, and log confirmation

---

## 14. Assumptions & Open Questions

* **Cron schedule:** The frequency of the cron run (daily, weekly, etc.) is not specified in the issue. The platform team must configure the Kubernetes CronJob schedule in the Helm chart.
* **Recipient email:** A single recipient email address (`MEDIA_APPLICATION_REPORT_RECIPIENT_EMAIL`) is assumed. If multiple recipients are required, the implementation should send one email per recipient (GOV.UK Notify does not support CC/BCC).
* **Deletion timing:** The spec assumes deletion only occurs after a successful email send. If the email fails, no data is lost. This is the safest approach but means processed applications persist until the next successful run.
* **Report scope:** The issue states the report covers "approved and rejected" applications. `PENDING` applications are explicitly excluded from both the report and the deletion step.
* **No decision date field:** The `media_application` table does not have a separate decision date column — only `applied_date` is available. The CSV will include `applied_date` only. If a decision date is needed for the report, a new database migration will be required (not in scope for this issue).
* **GOV.UK Notify file upload:** GOV.UK Notify's `prepareUpload()` is the standard approach for attaching files to emails. The generated download link expires after 6 months by default. If the team needs a longer retention period, an alternative storage approach (e.g., Azure Blob Storage with a pre-signed URL) should be considered.
* **Idempotency:** If the cron runs but the deletion fails (e.g., a transient database error), the same records will be included in the next report email. This is acceptable as it prevents data loss but should be noted for operations monitoring.
* **GOV.UK Notify template:** A new template must be created in the GOV.UK Notify dashboard before this feature is deployed. The template ID must be set in the environment configuration for each deployment environment (dev, staging, production).
* **File upload size limit:** GOV.UK Notify's file upload API has a 2 MB file size limit. If the number of processed applications is very large, the CSV may exceed this limit. This is unlikely in normal operation but should be noted as a risk.


### Comment by OgechiOkelu on 2026-02-20T12:35:40Z
@plan 

### Comment by hmctsclaudecode on 2026-02-20T12:43:21Z
## Technical Plan: Clarifying Questions

I've created the technical plan at `docs/tickets/353/plan.md` on branch `feature/353-media-application-cron-report`. Before implementation can proceed, the following needs confirmation:

**1. Cron schedule frequency**
The ticket does not specify how often this job should run (daily, weekly, etc.). What schedule should be set in the Kubernetes CronJob configuration?

**2. Key vault vs plain environment variables**
The two new environment variables (`GOVUK_NOTIFY_TEMPLATE_ID_MEDIA_APPLICATION_REPORT` and `MEDIA_APPLICATION_REPORT_RECIPIENT_EMAIL`) contain environment-specific values. Should these be stored as key vault secrets (following the pattern of `govuk-notify-api-key`), or as plain helm values?

**3. GOV.UK Notify template creation**
The GOV.UK Notify template (`media-application-report`) must be created manually in the Notify dashboard before this is deployed. Has this template already been created? If so, please share the template ID for each environment (dev, staging, production).

**4. Recipient email address**
A single recipient email address is assumed (`MEDIA_APPLICATION_REPORT_RECIPIENT_EMAIL`). Please confirm the email address(es) for each environment, and whether a single address is sufficient.

### Comment by junaidiqbalmoj on 2026-05-21T11:41:02Z
As part of this ticket, once implementation of cron trigger is finished, we need to configure it using sds-flux-config repo and test it to make sure it is working.
| Cron Name | Script Name | Schedule (Cron Expression) | Human Description |
|---|---|---|---|
| media-reporting-cron | `media-reporting` | `0 0 * * 1` | Midnight every Monday |

