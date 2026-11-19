# #351: CaTH Cron Trigger - Automated Inactive Accounts and archive deleted users to user_archive

**State:** OPEN
**Assignees:** junaidiqbalmoj
**Author:** junaidiqbalmoj
**Labels:** type:story
**Created:** 2026-02-12T13:26:10Z
**Updated:** 2026-11-19T15:33:41Z

## Description

I want the system to automatically identify inactive user accounts, notify users before action is taken, and delete accounts that exceed inactivity thresholds,

so that the platform remains secure, compliant, and free of stale or unused accounts.

A scheduled (cron-triggered) background service evaluates user activity and verification status against configurable inactivity thresholds. Based on account type and inactivity duration, the system performs one of the following actions:

- Sends verification reminders to media users
- Notifies IDAM users to sign in before deletion
- Deletes inactive media, admin, or IDAM accounts.
- Remove all subscriptions related to the users.

All thresholds are configurable via application properties to support policy changes without code updates.

**Media accounts**

- Media users who have not verified their account for 350 days receive a verification email.
Email template Id: 1dea6b4b-48b6-4eb1-8b86-7031de5502d9
Personalisation list:
full_name
verification_page_link

- Media users who remain unverified for 365 days are automatically deleted.
- The user account on Azure B2C will also need to be removed.

**Admin accounts**

- AAD and SSO admin accounts inactive for 90 days are deleted. No notification email will be sent in this case.

**IDAM accounts**

- CFT users inactive for:
118 days → receive a sign-in notification
132 days → are deleted
Email template Id: cca7ea18-4e6f-406f-b4d3-9e017cb53ee9
Personalisation list:
full name
last_signed_in_date
cft_sign_in_link


- Crime users inactive for:
180 days → receive a sign-in notification
208 days → are deleted
Email template Id: 710a1ea4-226d-4e94-a8f7-5a102bb31612
Personalisation list:
full name
last_signed_in_date
crime_sign_in_link

---

## Archive deleted accounts to `user_archive` (instead of a plain hard delete)

The `user_archive` table and the "Deleted accounts" MI report were delivered by #894. That story left populating the table to this ticket. Without this section, the report stays empty.

**Automated deletions (this cron)**
- When an account passes its inactivity threshold (media 365 days unverified, AAD/SSO admin 90 days, CFT 132 days, Crime 208 days), write a row to `user_archive` and then delete the user from the `user` table, along with its subscriptions.
- The archive insert and the delete must run in the **same transaction**, so a user is never deleted without an archive row, and never archived without being deleted.

**Manual deletions by a System Admin**
- `deleteUserById` (`libs/system-admin-pages/src/user-management/queries.ts`) must also write a `user_archive` row inside its existing transaction before `tx.user.delete`. Otherwise, accounts deleted by hand are missing from the "Deleted accounts" report.
- Implement this as one shared archive-and-delete function that both paths use, so the two paths can't drift apart.

**Column mapping (`user` → `user_archive`)**

| `user_archive` | Source |
|---|---|
| `user_id` | `user.user_id` |
| `user_provenance` | `user.user_provenance` |
| `provenance_user_id` | `user.user_provenance_id` |
| `email` | `user.email` |
| `roles` | `user.role` |
| `last_signed_in_date` | `user.last_signed_in_date` |
| `archived_date` | time of deletion (DB default `now()`) |

**Retention**
- Archived rows are purged after 3 months by #918 (hmcts/cath-service#1578). This ticket only writes the rows.

**Additional acceptance criteria**
- Every account deleted by the inactivity cron has a matching `user_archive` row.
- Every account deleted by a System Admin has a matching `user_archive` row.
- If the archive insert fails, the user is not deleted (the transaction rolls back).

---

## Current state (checked against `master`, 19 Nov 2026)

| Area | State |
|---|---|
| `user_archive` table and "Deleted accounts" MI report | Done in #894. `UserArchive` model in `libs/postgres-prisma/prisma/schema/user-archive.prisma`. |
| 3-month purge of `user_archive` | In progress in #918 (PR #1578). **Not merged.** It will be rebased onto this ticket's branch. This ticket creates the `libs/account/src/user-archive/` module, and #918 adds only the purge to it. |
| Writing to `user_archive` | **Not done.** Nothing writes to it yet. `deleteUserById` still hard-deletes without archiving. |
| Cron runner | `apps/crons` runs the default export of `./${SCRIPT_NAME}.js`. Each cron is one script file, e.g. `apps/crons/src/inactive-verification.ts`. Business logic belongs in a lib, not in `apps/crons`. |
| User data | The `user` table has `user_provenance` (`PI_AAD`, `SSO`, `CFT_IDAM`, `CRIME_IDAM`), `role` (`VERIFIED`, `SYSTEM_ADMIN`, `INTERNAL_ADMIN_CTSC`, `INTERNAL_ADMIN_LOCAL`), `created_date` and `last_signed_in_date`. **There is no "last verified" column** (see open questions). |
| Azure B2C | `libs/auth/src/graph-api/client.ts` can create, find and update media users, but **cannot delete them yet**. A delete function is needed for media account deletion. |
| GOV.UK Notify | Template IDs live as constants in `libs/govuk-notify/src/template-ids.ts`. Add the three template IDs above there. |
| Related | #896 (deletion email to the account holder) is a separate ticket. #1032 (replace `B2C_IDAM` with `PI_AAD`) is open. |

---

## Deployment (CNP, not SDS)

CaTH now deploys through **CNP**. The cron is configured in **`hmcts/cnp-flux-config`**, not `sds-flux-config`. Follow the same layout as hmcts/cnp-flux-config#49220 (the #918 purge cron) and hmcts/cnp-flux-config#48436 (media reporting cron).

| Cron name | Script name | Schedule | Environments |
|---|---|---|---|
| `cath-inactive-verification-cron` | `inactive-verification` | 08:01 UTC daily | aat, demo, perftest, prod |

Files to add in `cnp-flux-config`:
- `apps/cath/cath-inactive-verification-cron/cath-inactive-verification-cron.yaml`: a HelmRelease using the `cath-crons` chart and image, with `SCRIPT_NAME: inactive-verification` and `releaseNameOverride: cath-inactive-verification-cron`. Leave the schedule out of this file; it is set per cluster.
- `apps/cath/cath-inactive-verification-cron/image-repo.yaml` and `image-policy.yaml`: register both in `apps/cath/automation/kustomization.yaml`.
- Add the HelmRelease as a resource in `apps/cath/<env>/base/kustomization.yaml`.
- Per-cluster schedules, `apps/cath/cath-inactive-verification-cron/<env>/00.yaml` and `01.yaml`, each patched in from `apps/cath/<env>/00/kustomization.yaml` and `/01/kustomization.yaml`:
  - cluster `00`: `1 8 1-31/2 * *` (odd days)
  - cluster `01`: `1 8 2-30/2 * *` (even days)

**Why per-cluster schedules:** each environment has two AKS clusters, `00` and `01`, and both deploy everything in `base`. The cath-crons chart sets `disableActiveClusterCheck: true`, so a single schedule would run in both clusters. That would send every reminder email twice. Splitting the days between the clusters gives one run a day.

**Merge order:** merge the cath-service PR first. Wait until a `cath-crons` image containing `inactive-verification` has been built and image automation has updated the tag. Then merge the `cnp-flux-config` PR. Otherwise the job fails because the script is not in the image yet.

**Conflict note:** #48436 and #49220 also add `patches:` blocks to the same `00`/`01` kustomization files. Rebase and merge the entries into one list.

**Testing on aat after deployment:**
- In each cluster, `kubectl -n cath get cronjob cath-inactive-verification-cron` shows that cluster's schedule.
- Trigger a run manually with `kubectl -n cath create job --from=cronjob/cath-inactive-verification-cron test-run`. Check that the logs contain counts only, no emails.

---

## Decisions (agreed 19 Nov 2026)

The implementation follows `hmcts/pip-account-management` (`InactiveAccountManagementService`, `UserRepository`, `AccountService.archiveAccount`) and `hmcts/pip-publication-services` (email personalisation).

1. **Media "last verified":** add a `user.last_verified_date` column. It is set when an account is created and backfilled for existing rows as `COALESCE(last_signed_in_date, created_date)`. Only a new **`/media-verification`** sign-in route updates it, as in PIP. That route uses B2C policy `B2C_1_SignInMediaVerification` and redirects to `/account-home?verified=true`. The route is **in scope for this ticket**.
2. **B2C verification user flow:** `B2C_1_SignInMediaVerification` exists in every environment and works with the `/login/return` reply URL. Confirmed.
3. **Graph permission:** the B2C Graph app registration has `User.ReadWrite.All`, which deleting B2C users needs. Confirmed.
4. **No deletion without warning on the first run:** a required `INACTIVE_ACCOUNTS_START_DATE`, the go-live date for each environment, is used as a floor.
   - A user's activity date is treated as no earlier than this date. This applies to `last_verified_date` for media users and `last_signed_in_date` for everyone else.
   - Accounts that are already overdue therefore get the normal reminder and deletion periods counted from go-live.
   - Once go-live is further back than the longest threshold, the floor has no effect and behaviour is exactly PIP's.
   - The job will not run if the date is missing or invalid.
5. **Provenances:** only `PI_AAD`, `SSO`, `CFT_IDAM` and `CRIME_IDAM` are handled. There are no `B2C_IDAM` users.
6. **Secrets:** the Notify, Redis and B2C Graph secrets are added to the crons chart and are available to every `cath-crons` release. **Secrets must never appear in logs.** Logs contain counts, user IDs and error codes or messages only.
7. **Manual deletion by a System Admin also removes the B2C account** for `PI_AAD` users, as PIP's `deleteAccount` does. Both paths use the same archive-and-delete function.
8. **B2C deletion by the cron is switched off until release day.** The crons chart sets `MOCK_AZURE_B2C: "true"`, so the cron archives and deletes inactive `PI_AAD` users in CaTH but leaves their Azure B2C accounts. System Admin deletes (item 7) are not affected. Turning it on is tracked in #1587.

**PIP behaviour carried over:**
- **Reminders** are sent only on the exact day the threshold is reached (`=`). **Deletions** cover everyone on or past it (`<=`). Date-only comparisons are in UTC.
- **Thresholds** are configurable, and AAD and SSO admins have separate settings:
  - media: 350-day reminder, 365-day deletion
  - AAD admin: 90-day deletion
  - SSO admin: 90-day deletion
  - CFT: 118-day reminder, 132-day deletion
  - Crime: 180-day reminder, 208-day deletion
- **Admin accounts** are `PI_AAD` with a role other than `VERIFIED`, or any `SSO` user.
- **When deleting:**
  - delete the B2C account for `PI_AAD` users first;
  - if that fails, log the error and still archive and delete the user (a "not found" response counts as success);
  - then write the `user_archive` row and delete the subscriptions and the user in one transaction.
- **Email personalisation:**
  - media verification email: `full_name`, `verification_page_link`
  - CFT and Crime emails: `full_name`, `last_signed_in_date`, `cft_sign_in_link`, `crime_sign_in_link`
- **Sign-in links:** `/media-verification?p=B2C_1_SignInMediaVerification`, `/cft-login`, `/crime-login`.
- **Not in this ticket:** PIP's media deletion email (template `b08a6094-edc4-4d76-beca-f8937b63e879`). That is #896.

**Delivery order:** this ticket is implemented **before #918**. It creates the `libs/account/src/user-archive/` module. #918 (PR #1578) will then be rebased onto this branch and add only the 3-month purge.




---

## How to test (developers)

Most of this ticket can be tested locally. Only the B2C verification sign-in and the deployed CronJob need aat.

### 1. Set up
```bash
git checkout feature/351-inactive-accounts-cron
yarn install
yarn dev:up              # Postgres (5433) + Redis (6380), migrations (incl. last_verified_date), seed data
```
You need a **GOV.UK Notify test API key** for the CaTH service: Notify → API integration → key type **Test**. Notify accepts emails sent with it and shows them in the dashboard, but never delivers them. Without one, the run still checks deletions, but the 3 emails are reported as `failed` and it exits 1.

### 2. Seed users on each threshold
Each threshold gets a user exactly on it and, where useful, one just inside it. All dates are relative to now:
```bash
docker exec -i cath-postgres psql -U hmcts -d postgres <<'SQL'
INSERT INTO "user" (user_id, email, first_name, surname, user_provenance, user_provenance_id, role, created_date, last_signed_in_date, last_verified_date) VALUES
  (gen_random_uuid(), 'qa351-media-350@test.local', 'Mia',  'Remind', 'PI_AAD',     'qa351-m350',  'VERIFIED',            now() - interval '400 days', now() - interval '1 day',   now() - interval '350 days'),
  (gen_random_uuid(), 'qa351-media-349@test.local', 'Max',  'Keep',   'PI_AAD',     'qa351-m349',  'VERIFIED',            now() - interval '400 days', now() - interval '1 day',   now() - interval '349 days'),
  (gen_random_uuid(), 'qa351-media-365@test.local', 'Mel',  'Delete', 'PI_AAD',     'qa351-m365',  'VERIFIED',            now() - interval '400 days', now() - interval '1 day',   now() - interval '365 days'),
  (gen_random_uuid(), 'qa351-media-364@test.local', 'Moe',  'Keep',   'PI_AAD',     'qa351-m364',  'VERIFIED',            now() - interval '400 days', now() - interval '1 day',   now() - interval '364 days'),
  (gen_random_uuid(), 'qa351-aad-90@test.local',    'Ada',  'Delete', 'PI_AAD',     'qa351-a90',   'SYSTEM_ADMIN',        now() - interval '400 days', now() - interval '90 days', now()),
  (gen_random_uuid(), 'qa351-aad-89@test.local',    'Abe',  'Keep',   'PI_AAD',     'qa351-a89',   'SYSTEM_ADMIN',        now() - interval '400 days', now() - interval '89 days', now()),
  (gen_random_uuid(), 'qa351-sso-90@test.local',    'Sam',  'Delete', 'SSO',        'qa351-s90',   'INTERNAL_ADMIN_CTSC', now() - interval '400 days', now() - interval '90 days', now()),
  (gen_random_uuid(), 'qa351-sso-never@test.local', 'Sid',  'Keep',   'SSO',        'qa351-snull', 'INTERNAL_ADMIN_CTSC', now() - interval '400 days', NULL,                     now()),
  (gen_random_uuid(), 'qa351-cft-118@test.local',   'Cara', 'Remind', 'CFT_IDAM',   'qa351-c118',  'VERIFIED',            now() - interval '400 days', now() - interval '118 days', now()),
  (gen_random_uuid(), 'qa351-cft-132@test.local',   'Cal',  'Delete', 'CFT_IDAM',   'qa351-c132',  'VERIFIED',            now() - interval '400 days', now() - interval '132 days', now()),
  (gen_random_uuid(), 'qa351-cft-131@test.local',   'Cy',   'Keep',   'CFT_IDAM',   'qa351-c131',  'VERIFIED',            now() - interval '400 days', now() - interval '131 days', now()),
  (gen_random_uuid(), 'qa351-crime-180@test.local', 'Kim',  'Remind', 'CRIME_IDAM', 'qa351-k180',  'VERIFIED',            now() - interval '400 days', now() - interval '180 days', now()),
  (gen_random_uuid(), 'qa351-crime-208@test.local', 'Kit',  'Delete', 'CRIME_IDAM', 'qa351-k208',  'VERIFIED',            now() - interval '400 days', now() - interval '208 days', now());
INSERT INTO subscription (subscription_id, user_id, search_type, search_value)
  SELECT gen_random_uuid(), user_id, 'LOCATION_ID', '1' FROM "user" WHERE email = 'qa351-cft-132@test.local';
SQL
```

| User | Inactive for | Expected |
|---|---|---|
| `qa351-media-350` | 350 days unverified | media verification email |
| `qa351-media-349` | 349 days unverified | nothing |
| `qa351-media-365` | 365 days unverified | archived and deleted |
| `qa351-media-364` | 364 days unverified | nothing |
| `qa351-aad-90` (PI_AAD admin) | 90 days | archived and deleted |
| `qa351-aad-89` | 89 days | nothing |
| `qa351-sso-90` | 90 days | archived and deleted |
| `qa351-sso-never` | never signed in | nothing |
| `qa351-cft-118` | 118 days | CFT sign-in email |
| `qa351-cft-132` (has a subscription) | 132 days | archived and deleted, subscription removed |
| `qa351-cft-131` | 131 days | nothing |
| `qa351-crime-180` | 180 days | Crime sign-in email |
| `qa351-crime-208` | 208 days | archived and deleted |

### 3. Run the cron
```bash
INACTIVE_ACCOUNTS_START_DATE=2020-01-01 \
GOVUK_NOTIFY_API_KEY=<notify-test-key> \
CATH_SERVICE_URL=https://localhost:8080 \
MOCK_AZURE_B2C=true \
SCRIPT_NAME=inactive-verification yarn workspace @hmcts/crons dev; echo "exit=$?"
```
- `INACTIVE_ACCOUNTS_START_DATE` is required. A date in the past means the normal rules apply.
- `CATH_SERVICE_URL` is required. The email links are built from it.
- `MOCK_AZURE_B2C=true` skips B2C deletion. The deployed cron sets it too, until #1587.
- Two start-up warnings are expected locally and can be ignored: `Failed to retrieve secret b2c-<ENV>-…` (the `<ENV>` placeholder is only substituted when the chart is deployed) and `Mount point /mnt/secrets does not exist`.

Expected output, counting only the `qa351` users:
```
Inactive accounts mediaVerificationEmails: succeeded=1 skipped=0 failed=0
Inactive accounts idamSignInEmails: succeeded=2 skipped=0 failed=0
Inactive accounts mediaDeletions: succeeded=1 skipped=0 failed=0
Inactive accounts adminDeletions: succeeded=2 skipped=0 failed=0
Inactive accounts idamDeletions: succeeded=2 skipped=0 failed=0
exit=0
```

### 4. Check the results
```bash
docker exec cath-postgres psql -U hmcts -d postgres \
  -c "SELECT email FROM \"user\" WHERE email LIKE 'qa351-%' ORDER BY 1;" \
  -c "SELECT email, roles, user_provenance FROM user_archive WHERE email LIKE 'qa351-%' ORDER BY 1;" \
  -c "SELECT count(*) AS orphan_subs FROM subscription s LEFT JOIN \"user\" u USING (user_id) WHERE u.user_id IS NULL;"
```
- **Users table:** 7 `qa351` users remain. These are the 3 who were emailed and the 4 marked "nothing".
- **`user_archive`:** 6 rows, one for each deleted user.
- **Subscriptions:** `orphan_subs = 0`.
- **Notify dashboard:** 3 emails.
  - **Media verification email:** `full_name` is "Mia" and `verification_page_link` is `https://localhost:8080/media-verification`.
  - **CFT and Crime emails:** `full_name` is the first name and surname, `last_signed_in_date` is shown like "24 July 2026", and both `cft_sign_in_link` and `crime_sign_in_link` are present.
- **Logs:** no email addresses, keys or connection strings. Pipe the output through `grep -E '@|key|secret|postgresql://'`; it should print nothing.

### 5. Go-live floor
Clean up (step 8), re-seed (step 2), then run step 3 with `INACTIVE_ACCOUNTS_START_DATE` set to the date 118 days ago (`date -u -v-118d +%F` on macOS, `date -u -d '118 days ago' +%F` on Linux).
**Expected:** only `qa351-cft-118` is emailed and only `qa351-aad-90` is deleted. Accounts that were already overdue are treated as last active on the go-live date, so nobody is deleted without warning.

### 6. Fail fast
Run step 3 once without `INACTIVE_ACCOUNTS_START_DATE`, then again with `INACTIVE_ACCOUNTS_START_DATE=2026-13-45`. Keep the other variables.
**Expected:** `Cron job failed: INACTIVE_ACCOUNTS_START_DATE …` and `exit=1`, with no changes to the database.

### 7. Web changes
- **System Admin delete:**
  1. Run `yarn dev` and sign in as a System Admin.
  2. Open **User management** and delete a test user.
  3. Check there is a matching `user_archive` row.
  4. Check the user appears in the **Deleted accounts** MI report.

  E2E: `yarn test:e2e e2e-tests/tests/system-admin/user-management.spec.ts` (tagged `@nightly`).
- **Media verification link:** `curl -sk -o /dev/null -w '%{redirect_url}\n' https://localhost:8080/media-verification` should redirect to B2C with `p=B2C_1_SignInMediaVerification`.
- **Verified banner:** this needs a real B2C sign-in. Locally it is covered by the E2E specs `e2e-tests/tests/verified-user/account-home.spec.ts` and `e2e-tests/tests/sign-in.spec.ts`; test it end to end on aat.

### 8. Clean up
```bash
docker exec cath-postgres psql -U hmcts -d postgres -c "DELETE FROM \"user\" WHERE email LIKE 'qa351-%';" -c "DELETE FROM user_archive WHERE email LIKE 'qa351-%';"
```
`yarn db:drop` resets the whole local database. Run it from the repo root, not from a `prisma` folder, and follow it with `yarn db:seed`. You don't need it for this ticket.

### 9. On aat (after the cnp-flux-config PR is merged)
1. `kubectl -n cath get cronjob cath-inactive-verification-cron` on cluster `00` shows `1 8 1-31/2 * *`, and on cluster `01` shows `1 8 2-30/2 * *`.
2. Trigger a run manually with `kubectl -n cath create job --from=cronjob/cath-inactive-verification-cron qa-run`. The job should complete, and the logs should contain only the five summary lines.
3. As a media test user, open `/media-verification` and sign in through B2C. Expected: you land on account home with the verified banner (check the Welsh version too), and the user's `last_verified_date` is today.
4. Delete a `PI_AAD` test user as a System Admin. Expected: their B2C account is also removed. The cron itself does not remove B2C accounts until #1587.

**Notes:**
- Running the cron twice on the same day sends that day's reminders again. PIP behaves the same way. The Flux release sets `backoffLimit: 0` so that a failed run is never retried automatically.
- `INACTIVE_ACCOUNTS_START_DATE` must be set to each environment's go-live date in the Flux release before it is deployed. The draft is in `docs/tickets/351/flux-config.md`.


## Comments

### Comment by junaidiqbalmoj on 2026-05-21T11:40:22Z
As part of this ticket, once implementation of cron trigger is finished, we need to configure it using the **cnp-flux-config** repo (CaTH has moved from SDS to CNP) and test it to make sure it is working. See the "Deployment (CNP, not SDS)" section in the description for the file layout.

| Cron Name | Script Name | Schedule (Cron Expression) | Human Description |
|---|---|---|---|
| cath-inactive-verification-cron | `inactive-verification` | `1 8 1-31/2 * *` (cluster 00), `1 8 2-30/2 * *` (cluster 01) | 8:01 AM daily |

