# #352: CaTH Cron Trigger - Manage Expired Artefacts and Audit Logs

**State:** OPEN
**Assignees:** 
**Author:** junaidiqbalmoj
**Labels:** type:story, epic:public-journey
**Created:** 2026-02-12T13:36:47Z
**Updated:** 2026-11-19T14:22:42Z

## Description

I want the system to automatically manage expired artefacts and audit logs, so that the application remains efficient and complies with data retention policies.

**Description:** The system should periodically perform the following actions:

**Delete Audit Logs:** Remove audit logs that exceed the maximum retention period of 90 days to ensure compliance with data retention policies.

**Archive Expired Artefacts:** Identify and archive artefacts that are outdated based on their display_to date. The archiving process should:

- Remove the artefact's data from the blob store.
- Save the artefact's metadata in an archive repository for future reference.
- Delete the artefact from the main repository.

**Acceptance Criteria:**

1. The system deletes all audit logs older than 90 days and logs a confirmation message, including the number of rows deleted.
2. The system identifies artefacts with a `display_to` earlier than the current time and archives them.
3. The archiving process includes:
   - Deleting the artefact's data from the blob store: the payload in the `artefact` container, and any generated PDF/Excel files (`<artefactId>.pdf` / `<artefactId>.xlsx`) in the `publications` container.
   - Saving the artefact's metadata in the archive table.
   - Removing the artefact from the `artefact` table.
4. The system logs the number of artefacts archived and the date used for the search.
5. Artefacts with a null `display_to` are never archived.
6. If archiving one artefact fails, the run logs the error and continues with the rest. The job then exits non-zero so that the failure shows up in the CronJob status.
7. Archiving expired artefacts does **not** send a deletion notification to legacy third parties (e.g. Courtel).
8. The `expired-artefacts` run also deletes `artefact_archive` rows whose `archived_date` is 3 months old or older, and logs the number of rows deleted.

**Technical Notes:**

- Implement two scripts, `apps/crons/src/clear-audit.ts` and `apps/crons/src/expired-artefacts.ts`, run through the existing crons entrypoint (`SCRIPT_NAME` → `default()` export). Each script is a thin wrapper; the logic lives in libs (CLAUDE.md: no business logic in apps).
- **Audit logs:** add a `deleteMany` on `audit_log.timestamp < now - 90 days` to `libs/system-admin-pages/src/audit-log/repository.ts`. `timestamp` is already indexed. Keep the 90 days as a named constant.
- **Archive table does not exist yet.** Add `libs/postgres-prisma/prisma/schema/artefact-archive.prisma` → table `artefact_archive` (singular snake_case, mirrors the existing `user_archive`). Suggested columns: artefact metadata (`artefact_id`, `type`, `location_id`, list type **name** (not `list_type_id`, which differs per environment), `content_date`, `sensitivity`, `language`, `display_from`, `display_to`, `is_flat_file`, `provenance`, `source_artefact_id`, `superseded_count`, `last_received_date`) plus `archived_date` (default now, indexed). No foreign key to `artefact`, because the row is deleted.
- **Reuse the existing deletion logic** in `@hmcts/publication` (`deleteArtefacts` / `deleteDerivedFiles` in `libs/publication/src/repository/queries.ts`), which already handles both blob containers and the legacy extension-suffixed blob names. One caveat: `deleteArtefacts` fires blob deletions without awaiting them and swallows errors, which is fine for the admin UI but not for a cron that must report what it deleted and then disconnect. Add an awaited variant for archiving, or change it to await.
- Order per artefact: write the archive row and delete the artefact row in one `prisma.$transaction`, then delete the blobs. If a blob delete fails afterwards, the only harm is an orphaned blob that can be cleaned up later. Doing it the other way round, a failure leaves an artefact in the DB that points at blobs that no longer exist. A 404 from the blob store counts as success.
- Related rows: `artefact_search` cascades on delete and `ingestion_log.artefact_id` is set to null, so no extra cleanup is needed.
- The crons package currently has no DB/blob dependencies. #1272 (PR #1306) adds `@hmcts/postgres-prisma`, `@hmcts/publication`, the storage account Key Vault secrets in `apps/crons/helm/values.yaml`, and a `close-connections.ts` helper (`prisma.$disconnect()`). Build on that rather than duplicating it, and coordinate merge order.
- The crons chart renders **one** CronJob per release. The two jobs below therefore need two HelmReleases in **cnp-flux-config** (`apps/cath`), each overriding `SCRIPT_NAME` and `schedule`. The schedule in `apps/crons/helm/values.yaml` is only a placeholder.

| Cron Name | Script Name | Schedule (Cron Expression) | Human Description |
|---|---|---|---|
| clear-audit-cron | `clear-audit` | `0 1 * * *` | 1:00 AM daily |
| expired-artefacts-cron | `expired-artefacts` | `0 1 * * *` | 1:00 AM daily |

**Decisions (resolved open questions):**

- **Third-party deletion push:** not sent for expired artefacts. Do not call `sendThirdPartyDeletion`, and the cron does not need the Courtel secrets for this job.
- **Archive retention:** 3 months, measured on `archived_date`. The purge runs inside the `expired-artefacts` job, so no third cron is needed. Use calendar months in UTC, clamped to the last valid day of the month (e.g. 31 May minus 3 months = 28/29 Feb, not 3 March), and `lte` so that a row exactly 3 months old is purged. #918 takes the same approach.
- **Audit logging:** the jobs do not write `audit_log` rows. Run history goes to stdout → Application Insights and the CronJob status.


## Comments

### Comment by junaidiqbalmoj on 2026-05-21T11:40:40Z
As part of this ticket, once implementation of cron trigger is finished, we need to configure it in the `cnp-flux-config` repo (`apps/cath`) and test it to make sure it is working. CaTH is deployed on CNP, not SDS, so `sds-flux-config` is not used.

| Cron Name | Script Name | Schedule (Cron Expression) | Human Description |
|---|---|---|---|
| clear-audit-cron | `clear-audit` | `0 1 * * *` | 1:00 AM daily |
| expired-artefacts-cron | `expired-artefacts` | `0 1 * * *` | 1:00 AM daily |

