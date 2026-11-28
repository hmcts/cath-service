# #918: CaTH Cron Trigger - Remove 'deleted accounts' from database after 3 months

**State:** OPEN
**Assignees:** junaidiqbalmoj
**Author:** OgechiOkelu
**Labels:** 
**Created:** 2026-08-05T11:31:35Z
**Updated:** 2026-11-19T10:31:43Z

## Description

**PROBLEM STATEMENT**

#894 added the `user_archive` table and the 'Deleted accounts' MI report option. #351 will populate `user_archive` whenever an account is deleted (by the inactivity cron or by a System Admin). Without a retention rule these rows stay in the database indefinitely. We need a scheduled job that permanently removes archived accounts once they have been archived for 3 months or longer.

**AS A** Product Manager

**I WANT** to keep deleted accounts for 3 months only

**SO THAT** they do not stay in the database indefinitely.

---

**CURRENT STATE (verified against `master`, Nov 2026)**

- Table: `user_archive` (Prisma model `UserArchive`, `libs/postgres-prisma/prisma/schema/user-archive.prisma`). Retention is measured from `archived_date`, which is already indexed.
- The table is read only by the 'Deleted accounts' MI report (`buildDeletedAccountsSheet` in `libs/system-admin-pages/src/mi-report/queries.ts`). MI report periods are 7, 14, 21, 30 days or "all", so a 3-month retention does not truncate any fixed-period report.
- The table is written by #351 (open). This ticket does not depend on #351 being merged. The job is safe to run against an empty table.
- Cron runner: `apps/crons` runs the default export of `./${SCRIPT_NAME}.js`. Today the only script is the placeholder `example`.
- Deployment: CNP. `cnp-flux-config/apps/cath/cath-crons/cath-crons.yaml` is one HelmRelease (`SCRIPT_NAME=example`, every 5 minutes). Each real cron needs its own HelmRelease with its own `SCRIPT_NAME` and schedule.

---

**SCOPE**

1. A business-logic function, in a lib and not in `apps/crons`, that hard-deletes every `user_archive` row where `archived_date` is 3 calendar months or more before the current time, and returns the number of rows deleted.
2. A cron script in `apps/crons/src/` (kebab-case, e.g. `purge-user-archive.ts`) whose default export calls that function and logs the count.
3. Deployment:
   - Add a dedicated HelmRelease for the new cron in `cnp-flux-config/apps/cath` with `SCRIPT_NAME` set to the new script and schedule `0 2 * * *`. Do not wait for #356.
   - Make sure the preview/stg values in `helm/cath-service/` do not run this job every 5 minutes.

**Rules**
- Retention period: 3 calendar months (fixed constant, not configurable), inclusive. A row archived at exactly `now − 3 months` is deleted. Compute the cutoff in UTC and clamp month-end dates (e.g. 31 May − 3 months = 28/29 Feb, not 3 March).
- Schedule: once a day at `0 2 * * *` UTC.
- Only `user_archive` is touched. The `user` table, subscriptions and audit logs are out of scope.
- Logs must not contain PII. Log the deleted-row count and the cutoff date only, never emails or user IDs.
- If the job fails, it exits non-zero (existing `apps/crons` behaviour) so the Kubernetes job is marked failed.

**Out of scope**
- Writing rows to `user_archive` (#351).
- Purging any other table (#356 covers the other crons).
- Any UI change.

---

**ACCEPTANCE CRITERIA**

1. **Given** a `user_archive` row archived 3 months or more ago, **when** the job runs, **then** that row is deleted.
2. **Given** a `user_archive` row archived less than 3 months ago, **when** the job runs, **then** that row is kept.
3. **Given** a row archived at exactly the 3-month boundary, **when** the job runs, **then** it is deleted.
4. **Given** the job runs on a date whose day does not exist 3 months earlier (e.g. 31 May), **when** the cutoff is computed, **then** it is clamped to the last day of that month and no row younger than 3 months is deleted.
5. **Given** there are no eligible rows (including an empty table), **when** the job runs, **then** it completes successfully and deletes nothing.
6. **Given** the job completes, **then** it logs the number of rows deleted and the cutoff date, with no emails or user IDs.
7. **Given** the database call fails, **when** the job runs, **then** the process exits with a non-zero code and the error is logged.
8. **Given** the job is deployed, **then** it runs once a day on aat, demo, perftest and prod (CNP, via `cnp-flux-config`, the same environments as `cath-crons`; not stg) using its own `SCRIPT_NAME`. The existing `example` cron is not affected.
9. **Given** the 'Deleted accounts' MI report is downloaded after a purge, **then** purged accounts no longer appear, and accounts archived within the last 3 months still do.

---

**DECISIONS**
- The 3-month retention period is a fixed constant in code, not configurable.
- Schedule: `0 2 * * *` UTC (daily at 02:00).
- Ships as its own HelmRelease in `cnp-flux-config/apps/cath` now. It does not wait for the multi-cron infrastructure in #356.
- Flux environments: aat, demo, perftest and prod (the same as `cath-crons`). Not stg.


---

**HOW TO TEST LOCALLY (QA)**

You can test the purge job on your own machine without deploying it. You run the same script the scheduled job runs, against your local database.

The only thing you cannot test locally is the 02:00 daily schedule itself. Check that on aat after deployment (see "After deployment" below).

**Before you start**
- You have the `cath-service` repo checked out on the branch for this ticket.
- Docker is running.
- You have run `yarn install`.

**Step 1 – Start the local database**
```bash
yarn dev:up
```
Wait until it finishes. This starts Postgres and prepares the tables.

**Step 2 – Add 3 test accounts to the deleted accounts table**
Copy and paste this whole block into your terminal:
```bash
docker exec -i cath-postgres psql -U hmcts -d postgres <<'SQL'
INSERT INTO user_archive (user_id, user_provenance, email, roles, archived_date) VALUES
  (gen_random_uuid(), 'PI_AAD', 'qa-old@test.local',    'VERIFIED', now() - interval '4 months'),
  (gen_random_uuid(), 'PI_AAD', 'qa-edge@test.local',   'VERIFIED', now() - interval '3 months' - interval '1 minute'),
  (gen_random_uuid(), 'PI_AAD', 'qa-recent@test.local', 'VERIFIED', now() - interval '2 months');
SELECT email, archived_date FROM user_archive WHERE email LIKE 'qa-%' ORDER BY archived_date;
SQL
```
You should see 3 rows:

| Email | Deleted | Expected after the job runs |
|---|---|---|
| `qa-old@test.local` | 4 months ago | **Removed** |
| `qa-edge@test.local` | just over 3 months ago | **Removed** |
| `qa-recent@test.local` | 2 months ago | **Kept** |

**Step 3 – Run the job**
```bash
SCRIPT_NAME=purge-user-archive yarn workspace @hmcts/crons dev; echo "Exit code: $?"
```
Expected output:
- A line like `Purged 2 user_archive row(s) archived on or before 2026-08-19T...Z`. The number can be higher than 2 if your local database already has other old deleted accounts. That is fine, as long as it is at least 2.
- `Exit code: 0`
- No email addresses or user IDs anywhere in the output

If you see a Key Vault or Azure error before the job runs, run `az login` and try again.

**Step 4 – Check the result**
```bash
docker exec cath-postgres psql -U hmcts -d postgres -c "SELECT email, archived_date FROM user_archive WHERE email LIKE 'qa-%';"
```
Expected: only `qa-recent@test.local` is left.

**Step 5 – Run the job again**
Repeat Step 3. Expected: `Purged 0 user_archive row(s) ...` and `Exit code: 0`. Running it again when there is nothing left to remove must not fail.

**Step 6 – Check the job fails cleanly when the database is down**
```bash
DATABASE_URL=postgresql://nobody@localhost:1/none SCRIPT_NAME=purge-user-archive yarn workspace @hmcts/crons dev; echo "Exit code: $?"
```
Expected: a line starting with `Cron job failed:` and `Exit code: 1`.

**Step 7 (optional) – Check the MI report**
1. Run `yarn dev` and sign in as a System Admin.
2. Go to **Download MI Report**, choose **Deleted accounts** and the **All** period, and download it.
3. Expected: `qa-recent@test.local` is in the report. `qa-old@test.local` and `qa-edge@test.local` are not.

**Clean up**
```bash
docker exec cath-postgres psql -U hmcts -d postgres -c "DELETE FROM user_archive WHERE email LIKE 'qa-%';"
```

**After deployment (aat)**
- The new scheduled job exists and is set to run at `0 2 * * *`.
- The existing `cath-crons` job still runs every 5 minutes and is unchanged.
- To avoid waiting until 02:00, ask a developer to trigger the job manually, then repeat Steps 2 to 4 against the aat database.


## Comments

No comments on this issue.
