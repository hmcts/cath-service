# #352: CaTH Cron Trigger - Manage Expired Artefacts and Audit Logs

**State:** OPEN
**Assignees:** junaidiqbalmoj
**Author:** junaidiqbalmoj
**Labels:** type:story, epic:public-journey
**Created:** 2026-02-12T13:36:47Z
**Updated:** 2026-11-19T16:52:41Z

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


---

## How to test (developers)

Both crons can be tested locally against Postgres and the **Azurite** blob emulator. Nothing touches real Azure storage. The repo `.env` points `AZURE_STORAGE_CONNECTION_STRING` at Azurite (`devstoreaccount1` at `127.0.0.1:10000`).

### 1. Set up
```bash
git checkout feature/352-expired-artefacts-audit-cron
yarn install
yarn dev:up        # Postgres, Redis and Azurite (cath-azurite, port 10000)
yarn db:migrate    # applies the artefact_archive migration and regenerates the Prisma client
```
- Use `yarn db:migrate` (`migrate deploy`), not `db:migrate:dev`. If your local database has migrations from another branch, `migrate dev` treats that as drift and asks to reset.
- If a run fails with `Cannot read properties of undefined (reading 'create')`, the Prisma client is stale: run `yarn db:migrate` again.

The crons `dev` script does **not** load `.env`, so pass the Azurite connection string yourself. Every run below uses it:
```bash
AZ=$(grep '^AZURE_STORAGE_CONNECTION_STRING=' .env | cut -d= -f2- | sed 's/^"//;s/"$//')
```

Two start-up warnings are expected locally and can be ignored:
- `Failed to retrieve secret auto-pip-<ENV>-courtel-api` (and other `<ENV>` names): the `<ENV>` placeholder is only replaced when the chart is deployed. This is secret loading only. The cron does **not** call Courtel or any other third party.
- `Mount point /mnt/secrets does not exist`.

### 2. Expired artefacts: a real upload with its blobs
1. Run `yarn dev`, sign in as an admin and manually upload a publication. Use a list type that also generates a PDF and an Excel file.
2. Find its ID:
   ```bash
   docker exec cath-postgres psql -U hmcts -d postgres -c \
     "select artefact_id, display_from, display_to, last_received_date from artefact order by last_received_date desc limit 3;"
   ```
3. Check that its blobs exist in Azurite. Use Azure Storage Explorer: Local & Attached → Emulator. Look for `artefact/<id>`, `publications/<id>.pdf` and `publications/<id>.xlsx`.
   - The `az` CLI does not work against this Azurite. Version 2.83 sends a newer API version and fails with `InvalidHeaderValue`.
4. Make it expire. **The cron selects on `display_to`, not `last_received_date`:** changing the received date has no effect.
   ```bash
   ID=<artefact_id>
   docker exec cath-postgres psql -U hmcts -d postgres -c \
     "update artefact set display_to = now() - interval '1 hour' where artefact_id = '$ID';"
   ```
5. Run the cron:
   ```bash
   AZURE_STORAGE_CONNECTION_STRING="$AZ" SCRIPT_NAME=expired-artefacts yarn workspace @hmcts/crons dev; echo "exit=$?"
   ```
   It archives **every** expired artefact in your local database, not only this one. Expected output:
   ```
   [ExpiredArtefacts] Archived 1 artefacts with display_to before <now>
   [ExpiredArtefacts] Deleted 0 artefact_archive rows archived on or before <now - 3 months>
   exit=0
   ```
6. Check the results (AC 2, 3 and 4):
   ```bash
   docker exec cath-postgres psql -U hmcts -d postgres \
     -c "select count(*) from artefact where artefact_id='$ID';" \
     -c "select artefact_id, list_type_name, display_to, archived_date from artefact_archive where artefact_id='$ID';"
   ```
   - The artefact is gone from `artefact` (count `0`).
   - It has one row in `artefact_archive` with its metadata and the list type **name**.
   - In Storage Explorer, `artefact/<id>`, `publications/<id>.pdf` and `publications/<id>.xlsx` are gone.
   - The publication no longer appears on the court's summary of publications page.

### 3. Expired artefacts: edge cases
- **Null `display_to` (AC 5):** `update artefact set display_to = null where artefact_id = '<id>';`, then run step 2.5. Expected: that artefact is not archived.
- **Blob store unreachable (AC 6):**
  1. Run `docker stop cath-azurite`.
  2. Expire a second artefact, then run step 2.5.
  3. Expected: the database step still succeeds, a line `Artefact <id> failed at the blob stage: …` is printed, the run carries on with the rest, and it ends with `exit=1`.
  4. Run `docker start cath-azurite` afterwards.
- **Run without the connection string:** if you leave `AZURE_STORAGE_CONNECTION_STRING` off step 2.5, the result is the same as the unreachable case. The artefact is archived, the blob stage fails, the blobs remain, and it exits 1.
- **No third-party push (AC 7):** the run never logs a third-party or Courtel call. The only Courtel-related output is the secret-loading warning above.
- **Archive retention (AC 8):**
  1. `update artefact_archive set archived_date = now() - interval '4 months' where artefact_id = '<id>';`
  2. Run step 2.5.
  3. Expected: `Deleted 1 artefact_archive rows …`, and the row is gone.

### 4. Audit log purge
```bash
docker exec cath-postgres psql -U hmcts -d postgres -c "INSERT INTO audit_log (id, timestamp, action, user_id, user_email, user_role, user_provenance) VALUES ('qa352-old', now() - interval '91 days', 'QA352_TEST', 'qa', 'qa352@test.local', 'SYSTEM_ADMIN', 'SSO'), ('qa352-new', now() - interval '89 days', 'QA352_TEST', 'qa', 'qa352@test.local', 'SYSTEM_ADMIN', 'SSO');"

SCRIPT_NAME=clear-audit yarn workspace @hmcts/crons dev; echo "exit=$?"

docker exec cath-postgres psql -U hmcts -d postgres -tAc "select id from audit_log where id like 'qa352-%';"
```
Expected (AC 1):
- `[ClearAudit] Deleted 1 audit log rows with timestamp before <now - 90 days>` and `exit=0`. The count includes any other local audit rows older than 90 days.
- Only `qa352-new` remains.

### 5. Clean up
```bash
docker exec cath-postgres psql -U hmcts -d postgres -c "delete from audit_log where id like 'qa352-%';" -c "delete from artefact_archive where artefact_id = '<id>';"
```

### 6. On aat (after the cnp-flux-config HelmReleases are merged)
- `kubectl -n cath get cronjob` lists the `clear-audit` and `expired-artefacts` jobs with schedule `0 1 * * *`.
- Trigger each one manually, for example `kubectl -n cath create job --from=cronjob/<release> qa-run`. Check that the pod completes and its logs show the counts and the search or cutoff date.
- For expired artefacts, check on aat that the deleted publication's blobs are gone from both containers in the aat storage account.

**Note:** the two crons were run locally on 19 Nov 2026:
- `expired-artefacts`: one uploaded publication was archived and all three of its blobs were removed from Azurite.
- `clear-audit`: the 91-day-old row was deleted and the 89-day-old row was kept.


## Comments

### Comment by junaidiqbalmoj on 2026-05-21T11:40:40Z
As part of this ticket, once implementation of cron trigger is finished, we need to configure it in the `cnp-flux-config` repo (`apps/cath`) and test it to make sure it is working. CaTH is deployed on CNP, not SDS, so `sds-flux-config` is not used.

| Cron Name | Script Name | Schedule (Cron Expression) | Human Description |
|---|---|---|---|
| clear-audit-cron | `clear-audit` | `0 1 * * *` | 1:00 AM daily |
| expired-artefacts-cron | `expired-artefacts` | `0 1 * * *` | 1:00 AM daily |

