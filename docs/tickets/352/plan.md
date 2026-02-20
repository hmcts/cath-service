# #352: CaTH Cron Trigger - Manage Expired Artefacts and Audit Logs

## Technical Approach

Two new cron scripts are added to `apps/crons/src/`, each following the pattern established by `apps/crons/src/example.ts` (default async export, loaded dynamically via `SCRIPT_NAME` env var).

The work touches four existing modules to add the supporting query functions, then creates the two script files:

1. **`libs/publication`** — new `getExpiredArtefacts`, `archiveArtefactMetadata` queries; new `deleteArtefactFile` in file-retrieval; a new `ArtefactArchive` Prisma model in `libs/publication/prisma/`
2. **`libs/api`** — new `deleteExpiredIngestionLogs` query
3. **`libs/notifications`** — new `deleteExpiredNotificationAuditLogs` query
4. **`apps/crons/src/`** — two new scripts: `delete-audit-logs.ts` and `archive-expired-artefacts.ts`

### Architecture Decisions

- **No new module**: Both scripts are short orchestration files. All database and file operations belong in the existing library modules that already own those concerns.
- **`artefact_archive` schema placement**: The `ArtefactArchive` model mirrors the `Artefact` model structure. Since `Artefact` lives in the `apps/postgres` combined schema today, the new model belongs alongside it. However, the query functions that write to it belong in `libs/publication` because publication owns artefact lifecycle.
- **Per-artefact processing**: The archive script processes each artefact individually in a loop rather than in a single batch transaction. This allows partial success with per-item warnings (missing blob files) while still completing the rest, matching the acceptance criteria.
- **`deleteMany` with count return**: Both deletion queries use Prisma's `deleteMany` which returns `{ count: number }`, giving exact row counts for logging without an extra `count` query.
- **File deletion is best-effort**: If `deleteArtefactFile` finds no file, it returns `false` and the caller logs a warning. The archive record is still written and the database row is still deleted.

## Implementation Details

### File Structure

```
apps/postgres/prisma/schema.prisma            # Add ArtefactArchive model
apps/crons/src/
├── delete-audit-logs.ts                      # New cron script
├── delete-audit-logs.test.ts                 # Unit tests
├── archive-expired-artefacts.ts              # New cron script
└── archive-expired-artefacts.test.ts         # Unit tests

libs/publication/src/
├── index.ts                                  # Add new exports
├── repository/
│   └── queries.ts                            # Add getExpiredArtefacts, archiveArtefactMetadata
└── file-storage/
    └── file-retrieval.ts                     # Add deleteArtefactFile

libs/api/src/
├── index.ts                                  # Add deleteExpiredIngestionLogs export
└── blob-ingestion/repository/
    └── queries.ts                            # Add deleteExpiredIngestionLogs

libs/notifications/src/
├── index.ts                                  # Add deleteExpiredNotificationAuditLogs export
└── notification/
    └── notification-queries.ts               # Add deleteExpiredNotificationAuditLogs
```

### Database Schema Changes

**New model in `apps/postgres/prisma/schema.prisma`:**

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

No relations are needed on this model. It is an append-only archive table with no FK constraints, so records can persist independently of any artefact or ingestion log lifecycle.

### New Query Functions

#### `libs/publication/src/repository/queries.ts`

```typescript
export async function getExpiredArtefacts(cutoff: Date): Promise<Artefact[]>
// Prisma: artefact.findMany({ where: { displayTo: { lt: cutoff } } })
// Returns all Artefact objects with displayTo strictly before cutoff.

export async function archiveArtefactMetadata(artefact: Artefact): Promise<void>
// Prisma: artefactArchive.create({ data: { ...all fields from artefact, archivedAt omitted (default) } })
// Writes one row to artefact_archive. artefactId is the PK so duplicate calls will throw — callers must not double-archive.
```

#### `libs/publication/src/file-storage/file-retrieval.ts`

```typescript
export async function deleteArtefactFile(artefactId: string): Promise<boolean>
// Scans STORAGE_BASE for a file starting with artefactId (reusing same directory logic as findFileByArtefactId).
// Deletes the file using fs.unlink if found. Returns true if deleted, false if not found.
// Applies the same path-traversal containment check as findFileByArtefactId before unlinking.
```

#### `libs/api/src/blob-ingestion/repository/queries.ts`

```typescript
export async function deleteExpiredIngestionLogs(cutoff: Date): Promise<number>
// Prisma: ingestionLog.deleteMany({ where: { timestamp: { lt: cutoff } } })
// Returns the count of deleted rows.
```

#### `libs/notifications/src/notification/notification-queries.ts`

```typescript
export async function deleteExpiredNotificationAuditLogs(cutoff: Date): Promise<number>
// Prisma: notificationAuditLog.deleteMany({ where: { createdAt: { lt: cutoff } } })
// Returns the count of deleted rows.
```

### Cron Scripts

#### `apps/crons/src/delete-audit-logs.ts`

```typescript
const RETENTION_DAYS = 90;

export const deleteAuditLogs = async () => {
  const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);
  const ingestionCount = await deleteExpiredIngestionLogs(cutoff);
  const notificationCount = await deleteExpiredNotificationAuditLogs(cutoff);

  if (ingestionCount === 0 && notificationCount === 0) {
    console.log("No audit logs older than 90 days found");
  } else {
    console.log(`Deleted ${ingestionCount} ingestion log(s) and ${notificationCount} notification audit log(s) older than 90 days`);
  }
};

export default deleteAuditLogs;
```

#### `apps/crons/src/archive-expired-artefacts.ts`

```typescript
export const archiveExpiredArtefacts = async () => {
  const cutoff = new Date();
  const expiredArtefacts = await getExpiredArtefacts(cutoff);

  if (expiredArtefacts.length === 0) {
    console.log("No expired artefacts found, nothing to archive");
    return;
  }

  console.log(`Archiving ${expiredArtefacts.length} artefact(s) with display_to before ${cutoff.toISOString()}`);

  for (const artefact of expiredArtefacts) {
    await archiveArtefactMetadata(artefact);

    const fileDeleted = await deleteArtefactFile(artefact.artefactId);
    if (!fileDeleted) {
      console.warn(`Warning: no file found in blob store for artefact ${artefact.artefactId}, skipping file deletion`);
    }

    await deleteArtefacts([artefact.artefactId]);
  }

  console.log(`Archived ${expiredArtefacts.length} artefact(s) successfully`);
};

export default archiveExpiredArtefacts;
```

Note: The `apps/crons/src/index.ts` entry point wraps script execution in a try/catch and calls `process.exit(1)` on uncaught errors, satisfying the "exit with non-zero code on database error" acceptance criterion without any extra handling in the scripts themselves.

### Exports to Add

**`libs/publication/src/index.ts`** — add:
```typescript
export { deleteArtefactFile } from "./file-storage/file-retrieval.js";
export { archiveArtefactMetadata, getExpiredArtefacts } from "./repository/queries.js";
```

**`libs/api/src/index.ts`** — add:
```typescript
export { deleteExpiredIngestionLogs } from "./blob-ingestion/repository/queries.js";
```

**`libs/notifications/src/index.ts`** — add:
```typescript
export { deleteExpiredNotificationAuditLogs } from "./notification/notification-queries.js";
```

## Error Handling & Edge Cases

### Missing blob file
The acceptance criteria explicitly requires that a missing file is treated as a warning, not a fatal error. `deleteArtefactFile` returns `false` when no file is found. The archive script logs the warning and proceeds to archive the metadata and delete the database row. This means the archive remains consistent even if files were already manually removed or never written.

### Database error during archival loop
If `archiveArtefactMetadata`, `deleteArtefactFile`, or `deleteArtefacts` throws inside the loop, the unhandled rejection propagates up to `apps/crons/src/index.ts`, which catches it, logs to stderr, and calls `process.exit(1)`. This marks the Kubernetes job as failed. Partially processed artefacts in a previous loop iteration will already be archived and deleted — there is no rollback. This is an acceptable trade-off given the low volume expected and the fact that the next cron run will re-process any artefact that was not deleted from `artefact`.

### Duplicate archive entries
`artefact_archive.artefact_id` is a primary key. If the script runs twice before the first run completes (prevented by `concurrencyPolicy: Forbid`) or if an artefact was partially archived in a previous failed run, a second `archiveArtefactMetadata` call will throw a unique constraint violation. The Kubernetes job will fail, which is the correct outcome — it surfaces the inconsistency for investigation.

### Empty tables
Both scripts handle the zero-row case by logging the appropriate "nothing to do" message and exiting cleanly (exit 0).

### `ingestion_log` FK to `artefact`
`ingestion_log.artefact_id` uses `ON DELETE SET NULL`. When `deleteArtefacts` removes an artefact row, Postgres will null out the FK in any related ingestion log rows automatically. The `delete-audit-logs` cron operates on `timestamp` independently and will clean up those nulled rows when they age past 90 days.

### Large volumes
The archive script processes artefacts in a sequential loop. For very large backlogs this could be slow, but correctness is prioritised over throughput for this initial implementation. Batch processing can be added if needed.

## Acceptance Criteria Mapping

### AC: Audit log deletion runs successfully
**Implementation**: `delete-audit-logs.ts` calls `deleteExpiredIngestionLogs(cutoff)` and `deleteExpiredNotificationAuditLogs(cutoff)`, then logs the combined result message.

### AC: No audit logs to delete
**Implementation**: Both `deleteMany` calls return `count: 0`. The script logs "No audit logs older than 90 days found" and exits 0.

### AC: Expired artefacts are archived
**Implementation**: `archive-expired-artefacts.ts` fetches expired artefacts, writes each to `artefact_archive`, attempts file deletion, and removes the database row. Logs count and cutoff date.

### AC: No expired artefacts
**Implementation**: `getExpiredArtefacts` returns `[]`, the script logs "No expired artefacts found, nothing to archive" and returns early with exit 0.

### AC: Blob store file is missing during archival
**Implementation**: `deleteArtefactFile` returns `false` when no file is found. The script logs the per-artefact warning and continues with metadata archive and database deletion.

### AC: Script fails due to database error
**Implementation**: Unhandled errors from Prisma propagate to the `main()` catch in `apps/crons/src/index.ts`, which logs to stderr and calls `process.exit(1)`, causing Kubernetes to mark the job failed.

## Open Questions

### CLARIFICATIONS NEEDED

1. **Prisma schema location for `ArtefactArchive`**: The `Artefact` model currently lives in `apps/postgres/prisma/schema.prisma` (the combined schema). The plan adds `ArtefactArchive` there too. Should it instead live in a separate `libs/publication/prisma/schema.prisma` alongside the business logic? This affects the `schema-discovery.ts` registration in `apps/postgres`.

2. **Sequential vs batched archival**: The current plan archives artefacts one-by-one in a loop. For a large initial backlog (many months of expired artefacts), this could be slow. Should the first run process all records, or should a maximum batch size be introduced to cap execution time per run?

3. **`ingestion_log` rows linked to expired artefacts**: When an artefact is archived and deleted, its linked `ingestion_log` rows get `artefact_id` set to NULL (via `ON DELETE SET NULL`). Those rows remain until the 90-day audit log cron deletes them. Is this acceptable, or should linked ingestion logs be deleted immediately when their artefact is archived?

4. **`notification_audit_log` retention vs artefact link**: `notification_audit_log` stores a `publication_id` (UUID) that corresponds to `artefact_id`. There is no FK constraint on this field. When an artefact is archived, its notification audit logs will persist until the 90-day cron removes them. Is this the intended behaviour?

5. **Transactional archival**: Each artefact's archive-then-delete is not wrapped in a database transaction. If `archiveArtefactMetadata` succeeds but `deleteArtefacts` fails, the artefact row remains and the archive row exists. On the next run, `archiveArtefactMetadata` will throw a PK conflict. Should a `prisma.$transaction` wrap both operations to prevent this inconsistency?
