# #352: Implementation Tasks

## Implementation Tasks

### 1. Database Schema
- [ ] Add `ArtefactArchive` model to `apps/postgres/prisma/schema.prisma`
- [ ] Run `yarn db:migrate:dev` to create and apply the migration
- [ ] Run `yarn db:generate` to regenerate the Prisma client
- [ ] Verify `artefact_archive` table exists in Prisma Studio

### 2. Publication Queries (`libs/publication/src/repository/queries.ts`)
- [ ] Add `getExpiredArtefacts(cutoff: Date): Promise<Artefact[]>` — fetches artefacts where `displayTo < cutoff`
- [ ] Add `archiveArtefactMetadata(artefact: Artefact): Promise<void>` — writes one row to `artefact_archive`

### 3. Publication File Storage (`libs/publication/src/file-storage/file-retrieval.ts`)
- [ ] Add `deleteArtefactFile(artefactId: string): Promise<boolean>` — finds and deletes the file for the given artefact, returns `false` if not found

### 4. Publication Exports (`libs/publication/src/index.ts`)
- [ ] Export `getExpiredArtefacts` from `./repository/queries.js`
- [ ] Export `archiveArtefactMetadata` from `./repository/queries.js`
- [ ] Export `deleteArtefactFile` from `./file-storage/file-retrieval.js`

### 5. API Ingestion Queries (`libs/api/src/blob-ingestion/repository/queries.ts`)
- [ ] Add `deleteExpiredIngestionLogs(cutoff: Date): Promise<number>` — deletes `ingestion_log` rows where `timestamp < cutoff`, returns deleted count

### 6. API Exports (`libs/api/src/index.ts`)
- [ ] Export `deleteExpiredIngestionLogs` from `./blob-ingestion/repository/queries.js`

### 7. Notification Queries (`libs/notifications/src/notification/notification-queries.ts`)
- [ ] Add `deleteExpiredNotificationAuditLogs(cutoff: Date): Promise<number>` — deletes `notification_audit_log` rows where `createdAt < cutoff`, returns deleted count

### 8. Notification Exports (`libs/notifications/src/index.ts`)
- [ ] Export `deleteExpiredNotificationAuditLogs` from `./notification/notification-queries.js`

### 9. Cron Script: Delete Audit Logs (`apps/crons/src/delete-audit-logs.ts`)
- [ ] Create `apps/crons/src/delete-audit-logs.ts` with a default async export
- [ ] Compute cutoff as `new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)`
- [ ] Call `deleteExpiredIngestionLogs(cutoff)` and `deleteExpiredNotificationAuditLogs(cutoff)`
- [ ] Log `"No audit logs older than 90 days found"` when both counts are 0
- [ ] Log `"Deleted {n} ingestion log(s) and {m} notification audit log(s) older than 90 days"` otherwise

### 10. Cron Script: Archive Expired Artefacts (`apps/crons/src/archive-expired-artefacts.ts`)
- [ ] Create `apps/crons/src/archive-expired-artefacts.ts` with a default async export
- [ ] Compute cutoff as `new Date()`
- [ ] Call `getExpiredArtefacts(cutoff)` and return early logging `"No expired artefacts found, nothing to archive"` when empty
- [ ] Log `"Archiving {n} artefact(s) with display_to before {cutoff.toISOString()}"` before the loop
- [ ] For each artefact: call `archiveArtefactMetadata`, then `deleteArtefactFile` (log warning if returns `false`), then `deleteArtefacts`
- [ ] Log `"Archived {n} artefact(s) successfully"` after the loop

### 11. Unit Tests
- [ ] Write unit tests for `getExpiredArtefacts` in `libs/publication/src/repository/queries.test.ts`
- [ ] Write unit tests for `archiveArtefactMetadata` in `libs/publication/src/repository/queries.test.ts`
- [ ] Write unit tests for `deleteArtefactFile` in `libs/publication/src/file-storage/file-retrieval.test.ts`
- [ ] Write unit tests for `deleteExpiredIngestionLogs` in `libs/api/src/blob-ingestion/repository/queries.test.ts`
- [ ] Write unit tests for `deleteExpiredNotificationAuditLogs` in `libs/notifications/src/notification/notification-queries.test.ts`
- [ ] Write unit tests for `delete-audit-logs.ts` covering: logs deleted counts, logs zero message, propagates errors
- [ ] Write unit tests for `archive-expired-artefacts.ts` covering: no expired artefacts, archives all fields, logs warning for missing file, still deletes artefact row when file is missing, propagates errors

### 12. Verification
- [ ] Run `yarn lint:fix` and resolve any issues
- [ ] Run `yarn test` and confirm all tests pass
- [ ] Verify `.js` extensions on all relative imports in new files
