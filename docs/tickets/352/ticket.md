# #352: CaTH Cron Trigger - Manage Expired Artefacts and Audit Logs

**State:** OPEN
**Assignees:** None
**Author:** junaidiqbalmoj
**Labels:** None
**Created:** 2026-02-12T13:36:47Z
**Updated:** 2026-02-20T11:49:49Z

## Description

I want the system to automatically manage expired artefacts and audit logs, so that the application remains efficient and complies with data retention policies.

**Description:** The system should periodically perform the following actions:

**Delete Audit Logs:** Remove audit logs that exceed the maximum retention period of 90 days to ensure compliance with data retention policies.

**Archive Expired Artefacts:** Identify and archive artefacts that are outdated based on their display_to date. The archiving process should:

- Remove the artefact's data from the blob store.
- Save the artefact's metadata in an archive repository for future reference.
- Delete the artefact from the main repository.

Acceptance Criteria:
The system deletes all audit logs older than 90 days and logs a confirmation message.
The system identifies artefacts with a display_to date earlier than the current date and archives them.

The archiving process includes:

- Deleting the artefact's data from the blob store.
- Saving the artefact's metadata in the archive repository.
- Removing the artefact from the main repository.
- The system logs the number of artefacts archived and the date used for the search.

## Comments

### Comment by OgechiOkelu on 2026-02-20T11:44:53Z
@SPEC new-feature.md

### Comment by hmctsclaudecode on 2026-02-20T11:49:03Z

## 1. User Story

**As a** system administrator
**I want** the application to automatically purge expired audit logs and archive outdated artefacts on a scheduled basis
**So that** the system remains compliant with data retention policies, storage is kept manageable, and sensitive data does not linger beyond its intended lifespan

---

## 2. Background

CaTH (Court and Tribunal Hearings) ingests publication artefacts (court lists) from upstream systems. Each artefact has a `display_to` date indicating when it expires. Over time, expired artefacts accumulate in both the database and the blob store (local file storage), consuming storage unnecessarily.

Separately, two audit log tables record system activity:
- `ingestion_log` — records each ingestion attempt, linked to an artefact
- `notification_audit_log` — records each notification sent to subscribers

Both tables grow indefinitely without a retention policy applied.

This issue introduces two new cron scripts to the existing `apps/crons` runner:

1. **`delete-audit-logs`** — deletes `ingestion_log` and `notification_audit_log` rows older than 90 days.
2. **`archive-expired-artefacts`** — identifies artefacts whose `display_to` date is in the past, saves their metadata to a new `artefact_archive` table, removes their files from the blob store, and removes them from the `artefact` table.

The cron runner in `apps/crons/src/index.ts` uses the `SCRIPT_NAME` environment variable to dynamically import and execute a named script. Both scripts will follow the existing pattern established by `apps/crons/src/example.ts`.

Kubernetes `CronJob` resources (configured via Flux, with schedule defined outside the Helm chart) will trigger each script independently.

---

## 3. Acceptance Criteria

* **Scenario:** Audit log deletion runs successfully
    * **Given** the `delete-audit-logs` cron job is triggered
    * **When** the script executes
    * **Then** all `ingestion_log` rows with a `timestamp` older than 90 days are deleted, all `notification_audit_log` rows with a `created_at` older than 90 days are deleted, and the total count of deleted rows is logged to stdout

* **Scenario:** No audit logs to delete
    * **Given** the `delete-audit-logs` cron job is triggered
    * **When** there are no rows older than 90 days in either audit log table
    * **Then** the script completes successfully and logs that 0 rows were deleted

* **Scenario:** Expired artefacts are archived
    * **Given** the `archive-expired-artefacts` cron job is triggered
    * **When** artefacts exist with a `display_to` date earlier than the current date
    * **Then** for each expired artefact:
        * Its metadata is saved to the `artefact_archive` table
        * Its file is deleted from the blob store (`storage/temp/uploads/`)
        * It is deleted from the `artefact` table
    * **And** the script logs the number of artefacts archived and the cutoff date used

* **Scenario:** No expired artefacts
    * **Given** the `archive-expired-artefacts` cron job is triggered
    * **When** no artefacts have a `display_to` date in the past
    * **Then** the script completes successfully and logs that 0 artefacts were archived

* **Scenario:** Blob store file is missing during archival
    * **Given** an expired artefact exists in the database
    * **When** no corresponding file is found in the blob store
    * **Then** the script logs a warning for that artefact, skips the file deletion step, and still saves metadata to the archive and deletes the artefact from the main table

* **Scenario:** Script fails due to database error
    * **Given** either cron script is triggered
    * **When** a database error occurs
    * **Then** the script logs the error and exits with a non-zero exit code so Kubernetes marks the job as failed

---

## 4. User Journey Flow

This is a fully automated, system-initiated process with no user interaction.

### Audit Log Deletion Flow

```
Kubernetes CronJob triggers (SCRIPT_NAME=delete-audit-logs)
    │
    ▼
apps/crons/src/index.ts loads delete-audit-logs.ts
    │
    ▼
Calculate cutoff date (now - 90 days)
    │
    ├──► Delete ingestion_log rows where timestamp < cutoff
    │        └── Count deleted rows
    │
    ├──► Delete notification_audit_log rows where created_at < cutoff
    │        └── Count deleted rows
    │
    ▼
Log total deleted counts and exit 0
```

### Archive Expired Artefacts Flow

```
Kubernetes CronJob triggers (SCRIPT_NAME=archive-expired-artefacts)
    │
    ▼
apps/crons/src/index.ts loads archive-expired-artefacts.ts
    │
    ▼
Calculate cutoff date (now)
    │
    ▼
Query artefact table: SELECT WHERE display_to < cutoff
    │
    ├─── [No expired artefacts] ──► Log "0 artefacts archived", exit 0
    │
    ├─── [Expired artefacts found]
    │         │
    │         ▼
    │     For each artefact:
    │         │
    │         ├──► Save metadata to artefact_archive table
    │         │
    │         ├──► Delete file from blob store
    │         │    (log warning if file not found, continue)
    │         │
    │         └──► Delete artefact from artefact table
    │
    ▼
Log count archived and cutoff date, exit 0
```

---

## 5. Script Specifications

### `apps/crons/src/delete-audit-logs.ts`

- Exports a default async function
- Computes cutoff as `new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)`
- Calls `deleteExpiredIngestionLogs(cutoff)` from the publication/ingestion module
- Calls `deleteExpiredNotificationAuditLogs(cutoff)` from the notifications module
- Logs: `Deleted {n} ingestion log(s) and {m} notification audit log(s) older than 90 days`

### `apps/crons/src/archive-expired-artefacts.ts`

- Exports a default async function
- Computes cutoff as `new Date()` (current timestamp at execution)
- Calls `getExpiredArtefacts(cutoff)` to fetch all artefacts with `displayTo < cutoff`
- Logs: `Archiving {n} artefact(s) with display_to before {cutoff.toISOString()}`
- For each expired artefact:
  1. Calls `archiveArtefactMetadata(artefact)` — writes to `artefact_archive`
  2. Calls `deleteArtefactFile(artefact.artefactId)` — removes file from blob store; logs warning if absent
  3. Calls `deleteArtefacts([artefact.artefactId])` — removes from `artefact` table
- Logs: `Archived {n} artefact(s) successfully`

### New Prisma model: `artefact_archive`

```prisma
model ArtefactArchive {
  artefactId       String   @id @map("artefact_id") @db.Uuid
  locationId       String   @map("location_id")
  listTypeId       Int      @map("list_type_id")
  contentDate      DateTime @map("content_date") @db.Date
  sensitivity      String
  language         String
  displayFrom      DateTime @map("display_from")
  displayTo        DateTime @map("display_to")
  lastReceivedDate DateTime @map("last_received_date")
  isFlatFile       Boolean  @map("is_flat_file")
  provenance       String
  noMatch          Boolean  @map("no_match")
  supersededCount  Int      @map("superseded_count")
  archivedAt       DateTime @default(now()) @map("archived_at")

  @@map("artefact_archive")
}
```

---

## 6. Logging Output

| Event | Log message |
|---|---|
| Audit log deletion complete | `Deleted {n} ingestion log(s) and {m} notification audit log(s) older than 90 days` |
| Archival started | `Archiving {n} artefact(s) with display_to before {cutoffISOString}` |
| File not found warning | `Warning: no file found in blob store for artefact {artefactId}, skipping file deletion` |
| Archival complete | `Archived {n} artefact(s) successfully` |
| Nothing to archive | `No expired artefacts found, nothing to archive` |
| Nothing to delete | `No audit logs older than 90 days found` |
| Fatal error | `Error: {message}` (to stderr, exit code 1) |

---

## 7. Assumptions & Open Questions

* Both `ingestion_log` and `notification_audit_log` are subject to the 90-day retention policy.
* Blob store is local filesystem at `storage/temp/uploads/{artefactId}.{ext}`.
* `deleteArtefactFile` must scan directory for files starting with `{artefactId}` to find the correct extension.
* `artefact_archive` table lives in the same schema as `artefact`.
* Both Kubernetes CronJobs should use `concurrencyPolicy: Forbid`.
* `ingestion_log` rows have `ON DELETE SET NULL` for `artefact_id` — handled independently by 90-day retention.

### Comment by OgechiOkelu on 2026-02-20T11:49:49Z
@plan
