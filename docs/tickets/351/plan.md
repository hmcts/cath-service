# #351: Inactive accounts cron and archiving deleted users to `user_archive`: technical plan

TEMPLATE SOURCE: n/a (cron, emails are GOV.UK Notify templates by ID)
TEMPLATE SOURCE (media verification route and account-home banner): migrate from pip-frontend src/main/authentication/authenticationHandler.ts + routes.ts /media-verification. That is the `/media-verification` and `/media-verification/return` routes and `mediaVerificationHandling`. They are redirect handlers with no view of their own. The only visible output is the "verified" notification banner on account home: pip-frontend `src/main/views/account-home.njk` (`showVerifiedBanner`), `src/main/controllers/AccountHomeController.ts` and locale `account-home.json` `bannerText`.

## 1. Technical approach

### Summary

This ticket ports PIP's inactive-account behaviour (`hmcts/pip-account-management` `InactiveAccountManagementService` and `UserRepository`) to CaTH as closely as possible.

1. **The shared archive-and-delete function.** A new module `libs/account/src/user-archive/` exports `archiveAndDeleteUser`. It is the CaTH version of PIP's `AccountService.archiveAccount`. If the provenance is `PI_AAD`, it deletes the user from Azure B2C; on error it logs and carries on. It then writes the `user_archive` row and deletes the subscriptions and the user in one transaction. Both the cron and the System Admin "delete user" page use it.
2. **The cron logic.** A new lib `@hmcts/inactive-accounts` exports `processInactiveAccounts()`. It runs PIP's five steps in PIP's order with PIP's date-only queries. Each environment's go-live date, `INACTIVE_ACCOUNTS_START_DATE`, acts as a floor on every user's activity date, so accounts that are already overdue at go-live get the full reminder and deletion cycle instead of being deleted on the first run.
3. **The cron script.** `apps/crons/src/inactive-verification.ts` calls `processInactiveAccounts()`, logs counts only, and always disconnects Prisma and Redis.
4. **Media verification.** We add a `user.last_verified_date` column, a `/media-verification` route in the web app, and handling for it in `/login/return`. Without these, the media steps would run against a date that never changes when the user acts.

### Ordering with #918

#351 is implemented before #918. `feature/351-inactive-accounts-cron` stays on `origin/master`. #351 creates the `user-archive` module, its export and its paths. #1578 (#918) is then rebased onto this branch and adds only the purge function and script.

To keep that rebase clean, #351 uses exactly the same layout as `origin/feature/918-purge-user-archive`:

| Item | #351 creates | #918 adds later |
|---|---|---|
| `libs/account/src/user-archive/query.ts` | `findUserForArchive`, `archiveAndDeleteUserRecord` | `deleteUserArchivesArchivedOnOrBefore` |
| `libs/account/src/user-archive/service.ts` | `archiveAndDeleteUser` | `purgeExpiredUserArchives`, `subtractUtcMonthsClamped`, `PurgeResult` |
| `libs/account/src/user-archive/service.test.ts` | `describe("archiveAndDeleteUser")` | `describe("purgeExpiredUserArchives")`. On rebase, add it as a second top-level `describe` and merge the `vi.mock("@hmcts/postgres-prisma")` factories. |
| `libs/account/package.json` `exports["./user-archive"]` | `{ production: ./dist/user-archive/service.js, default: ./src/user-archive/service.ts }`, the same entry as #918 | nothing |
| root `tsconfig.json` | `"@hmcts/account/user-archive": ["libs/account/src/user-archive/service"]`, the same line as #918 | nothing |
| `apps/crons/package.json` | `@hmcts/account`, `@hmcts/postgres-prisma` (plus `@hmcts/inactive-accounts`, `@hmcts/redis`) | nothing |

**Notes for #918:** PIP purges archived accounts with `account.archived.deletion-days: 90`, a date-only `<=` against `archived_date`. #918 uses 3 calendar months. This is just to note; #918 is not changed here.

### PIP behaviour being ported

**Thresholds.** These are PIP's `verification:` defaults. In CaTH they are environment variables with the same defaults.

| Env var | PIP property | Default |
|---|---|---|
| `MEDIA_ACCOUNT_VERIFICATION_EMAIL_DAYS` | `media-account-verification-email-days` | 350 |
| `MEDIA_ACCOUNT_DELETION_DAYS` | `media-account-deletion-days` | 365 |
| `AAD_ADMIN_ACCOUNT_DELETION_DAYS` | `aad-admin-account-deletion-days` | 90 |
| `SSO_ADMIN_ACCOUNT_DELETION_DAYS` | `sso-admin-account-deletion-days` | 90 |
| `CFT_IDAM_ACCOUNT_SIGN_IN_NOTIFICATION_DAYS` | `cft-idam-account-sign-in-notification-days` | 118 |
| `CFT_IDAM_ACCOUNT_DELETION_DAYS` | `cft-idam-account-deletion-days` | 132 |
| `CRIME_IDAM_ACCOUNT_SIGN_IN_NOTIFICATION_DAYS` | `crime-idam-account-sign-in-notification-days` | 180 |
| `CRIME_IDAM_ACCOUNT_DELETION_DAYS` | `crime-idam-account-deletion-days` | 208 |

The AAD admin and SSO admin thresholds are separate settings, as in PIP. Each value must be a positive integer, or the run fails before it does anything (exit 1). PIP has no rule that a notification threshold must be less than its deletion threshold, so we don't add one.

There is also one required setting that PIP does not have:

| Env var | Default | Rule |
|---|---|---|
| `INACTIVE_ACCOUNTS_START_DATE` | **none, required** | A UTC ISO date (`YYYY-MM-DD`), set in each environment's flux HelmRelease to that environment's go-live date. If it is missing, does not match `YYYY-MM-DD`, or is not a real calendar date (for example `2026-02-30`), the run throws before any query or email and exits 1. A future date is accepted: nothing matches until the floor has passed. |

All nine settings are read and validated together by `getInactivitySettings()` in `settings.ts`.

**Queries.** These are PIP's native SQL. All are date-only comparisons, and a `NULL` date never matches.

| Step | PIP condition |
|---|---|
| Media notify | `user_provenance='PI_AAD' AND roles='VERIFIED' AND CAST(last_verified_date AS DATE) = CURRENT_DATE - media-verification-email-days` |
| Media delete | same, with `<= CURRENT_DATE - media-deletion-days` |
| Admin delete | `(user_provenance='PI_AAD' AND roles <> 'VERIFIED' AND CAST(last_signed_in_date AS DATE) <= CURRENT_DATE - aadDays) OR (user_provenance='SSO' AND CAST(last_signed_in_date AS DATE) <= CURRENT_DATE - ssoDays)` |
| IDAM notify | `(user_provenance='CFT_IDAM' AND CAST(last_signed_in_date AS DATE) = CURRENT_DATE - 118) OR (user_provenance='CRIME_IDAM' AND … = CURRENT_DATE - 180)` |
| IDAM delete | same pattern, `<=` 132 for CFT and `<=` 208 for Crime |

CaTH runs these as Prisma typed `where` clauses using UTC day boundaries, not raw SQL. With `d(n)` meaning UTC midnight of `today − n days`:
- `CAST(col AS DATE) = CURRENT_DATE − n` becomes `col >= d(n) AND col < d(n−1)`
- `CAST(col AS DATE) <= CURRENT_DATE − n` becomes `col < d(n−1)`

These are the same as PIP's conditions, because Prisma stores `timestamp(3)` as UTC and Azure Postgres runs in UTC. They stay parameterised, type-checked and easy to unit test. A `NULL` column fails both comparisons, as in PIP. One consequence is that an admin with a `NULL` `last_signed_in_date` is never deleted. In practice, CaTH creates SSO users when they sign in, so their date is always set.

The queries only cover the provenances `PI_AAD`, `SSO`, `CFT_IDAM` and `CRIME_IDAM`.

### Go-live floor (`INACTIVE_ACCOUNTS_START_DATE`)

Deleting the first-run backlog without a reminder is not acceptable. To prevent it, each query compares an **effective date** instead of the raw column:

`effective = GREATEST(CAST(col AS DATE), S)`

Here `S` is `INACTIVE_ACCOUNTS_START_DATE`, and `col` is `last_verified_date` for media and `last_signed_in_date` for admin and IDAM.
- Exact-day reminders match when `effective = CURRENT_DATE − N`.
- Deletions match when `effective <= CURRENT_DATE − N`.

**Prisma form.** `S` is a constant, so the `GREATEST` splits into two branches. Write `T` for the condition (the exact-day range `[d(n), d(n−1))`, or on-or-before `< d(n−1)`):

```
( col matches T  AND  col >= S )        -- user's own date is the effective date
OR
( S matches T    AND  col <  S )        -- the floor is the effective date
```

"S matches T" is evaluated in TypeScript. If it is true, the second branch is added as `{ col: { lt: S } }`. If it is false, the branch is left out. `buildFlooredDateFilter(column, condition, startDate)` in `date-boundaries.ts` builds the `OR`, and all five queries use it. A `NULL` `col` fails both `>= S` and `< S`, so users with no date still never match, as in PIP.

**Result at go-live.** Every account that is already overdue is treated as last active on `S`:

| Group | Reminder | Deletion |
|---|---|---|
| Media | `S + 350` days | `S + 365` days |
| CFT IDAM | `S + 118` days | `S + 132` days |
| Crime IDAM | `S + 180` days | `S + 208` days |
| Admins | none | `S + 90` days |

Users active after `S` follow their own dates.

**The floor wears off on its own.** Once `today − S` is more than a query's threshold, `S` can no longer match an exact-day `T` (that day is after `S`), and the on-or-before branch only adds rows that the first branch already covers. So once go-live is more than 365 days back, the longest threshold, **behaviour is exactly PIP's**. The variable can then stay set with no effect.

**Steps.** These run in PIP's `InactiveAccountManagementService` order:
1. `sendMediaUsersForVerification`: media notify query, then the verification email.
2. `notifyIdamUsersToSignIn`: IDAM notify query, then the sign-in email.
3. `findAndNotifyMediaAccountsForDeletion`: media delete query, then `archiveAndDeleteUser`. PIP also sends a media deletion email here (template `INACTIVE_MEDIA_USER_DELETION_EMAIL` `b08a6094-edc4-4d76-beca-f8937b63e879`, personalisation `full-name`, `date` (the date of the re-verification email), `link-to-service`). **That email is #896's scope and is not implemented here.** The seam: the step goes through the selected users one at a time, and the query already selects `email`, `firstName` and `lastVerifiedDate`. #896 only needs to add `await sendMediaAccountDeletionEmail(user)` before `archiveAndDeleteUser` in this step, with one comment marking the spot.
4. `findAdminAccountsForDeletion`: admin delete query, then `archiveAndDeleteUser`. No email.
5. `findIdamAccountsForDeletion`: IDAM delete query, then `archiveAndDeleteUser`. No email.

**Reminders use exact-day matching, as in PIP. There is no reminder marker column.** The flux schedules are `1 8 1-31/2 * *` on cluster 00 and `1 8 2-30/2 * *` on cluster 01. Together they cover every calendar day exactly once: on the 31st and the 1st, cluster 00 runs both days, and on 28 or 29 February one cluster runs. That matches PIP's single daily run.

**Accepted PIP behaviour:** if a run is missed (a cluster is out, or the Job fails before a step), the reminders due that day are not sent. Deletion uses `<=`, so it catches up on the next run.

To avoid duplicate emails on the same day, the Job must not retry automatically. The HMCTS `job` chart defaults to `backoffLimit: 6` with `restartPolicy: OnFailure`. A run that exits 1 because one user failed would then re-run up to six times and re-send every reminder for that day. The flux HelmRelease for this cron sets `job.backoffLimit: 0`. The failure is still reported, and the next scheduled run picks up any outstanding deletions.

### Emails (exact `pip-publication-services` personalisation)

| Template | Constant (`libs/govuk-notify/src/template-ids.ts`) | Personalisation |
|---|---|---|
| `1dea6b4b-48b6-4eb1-8b86-7031de5502d9` | `GOVUK_NOTIFY_TEMPLATE_ID_MEDIA_ACCOUNT_VERIFICATION` | `full_name`, `verification_page_link` |
| `cca7ea18-4e6f-406f-b4d3-9e017cb53ee9` | `GOVUK_NOTIFY_TEMPLATE_ID_INACTIVE_CFT_SIGN_IN` | `full_name`, `last_signed_in_date`, `cft_sign_in_link`, `crime_sign_in_link` |
| `710a1ea4-226d-4e94-a8f7-5a102bb31612` | `GOVUK_NOTIFY_TEMPLATE_ID_INACTIVE_CRIME_SIGN_IN` | `full_name`, `last_signed_in_date`, `cft_sign_in_link`, `crime_sign_in_link` |

Both IDAM emails carry both links, as in PIP. The template is chosen by provenance.

- **`last_signed_in_date`:** PIP formats this with `DateTimeHelper.localDateTimeToDateString`, which is `DateTimeFormatter.ofPattern("dd MMMM yyyy")`, for example "05 March 2026". CaTH uses `Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "long", year: "numeric", timeZone: "UTC" })`, which gives the same output.
- **IDAM `full_name`:** `firstName + " " + surname` from the `user` table, the same as PIP's `forenames + " " + surname`. Both are populated from the IDAM token on every sign-in (`cft-login/return`, `crime-login/return`). If both are empty, we send "user", PIP's `GENERIC_USER_NAME`. This avoids PIP's literal "null null".
- **Media `full_name`:** PIP looks up the Azure `givenName` by email and falls back to "user". **CaTH uses `user.firstName` from the database, falling back to "user", with no Graph call.**
  - Why: `approveApplication` (`libs/admin-pages/src/media-application/service.ts`) takes `givenName` from `splitName(application.name)` and uses it for the B2C user (`createMediaUser` or `updateMediaUser`) and for the CaTH row (`createLocalMediaUser` or `updateLocalMediaUser`). So for every media account approved in CaTH, `user.firstName` already equals the B2C `givenName`.
  - The only rows with an empty `firstName` are `PI_AAD` users created by `createOrUpdateUser` at B2C sign-in without a CaTH approval (for example, migrated users). They get "user", the same as PIP's fallback.
  - This saves one Graph read per email, and the existing `findUserByEmail` would need changing to return `givenName` anyway.

**Links.** Each is an environment variable on the cron. The defaults are built from `CATH_SERVICE_URL`, which is set in `apps/crons/helm/values.yaml` with the same value as web.

| Env var | Default | PIP equivalent |
|---|---|---|
| `MEDIA_VERIFICATION_PAGE_LINK` | `${CATH_SERVICE_URL}/media-verification` | `<frontend>/media-verification?p=B2C_1_SignInMediaVerification` |
| `CFT_SIGN_IN_LINK` | `${CATH_SERVICE_URL}/cft-login` | `<frontend>/cft-login` |
| `CRIME_SIGN_IN_LINK` | `${CATH_SERVICE_URL}/crime-login` | `<frontend>/crime-login` |

CaTH already has `/cft-login` and `/crime-login` (`apps/web/src/pages/(auth)/cft-login`, `crime-login`). In CaTH, `/media-verification` chooses the B2C policy on the server, so the link needs no `?p=` parameter.

Each email gets the reference `inactive-<step>-<userId>`. Emails are sent with `sendNotifyEmail`, which applies the per-recipient Redis rate limit through `@hmcts/email-rate-limit`.

### Last verified date (media)

PIP stores `last_verified_date` on `pi_user`. It is set when the account is created (`lastVerifiedDate = lastSignedInDate = createdDate = now`) and updated **only** by the frontend `/media-verification` flow. That flow uses the B2C policy `B2C_1_SignInMediaVerification`, and `mediaVerificationHandling` calls `updateMediaAccountVerification(oid)` and then redirects to `/account-home?verified=true`. An ordinary media sign-in updates only `last_signed_in_date`.

CaTH has neither the column nor the route. Both are part of #351 (decided):

**(a) Schema.** In `model User` (`libs/postgres-prisma/prisma/schema/base.prisma`) add:

```
lastVerifiedDate DateTime @default(now()) @map("last_verified_date")
```

Generate the migration with `yarn db:migrate:dev --create-only`, then add the backfill by hand:

```sql
ALTER TABLE "user" ADD COLUMN "last_verified_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
UPDATE "user" SET "last_verified_date" = COALESCE("last_signed_in_date", "created_date");
```

The backfill is accurate history. The go-live floor, not the backfill, is what protects the first-run backlog. The column is NOT NULL with a default, so every insert path sets it on creation, as PIP does for all users. `createUser` in `libs/account/src/repository/query.ts` also passes `lastVerifiedDate: signedInAt` when `signedInAt` is given, so the three dates line up as in PIP. The backfill covers all rows. Only the media steps read the column. `user_archive` is unchanged, because the ticket's mapping does not include this column.

**(b) Route.** Add `apps/web/src/pages/(auth)/media-verification/index.ts` (GET). It works like `b2c-login`, with these differences:
- It sets `session.b2cProvider = "media_verification"`.
- It forces `session.returnTo = "/account-home?verified=true"`.
- It authorises with `p = b2cConfig.policyMediaVerification`. This is a new config value, `B2C_POLICY_MEDIA_VERIFICATION`, defaulting to `B2C_1_SignInMediaVerification`. Add it to `getB2cConfig` in `libs/auth/src/config/b2c-config.ts`.

**Confirmed:** `B2C_1_SignInMediaVerification` exists in every environment's B2C tenant and works with the `/login/return` reply URL. The name stays configurable through `B2C_POLICY_MEDIA_VERIFICATION`.

The return goes through the existing `/login/return`. CaTH's B2C config already registers `${BASE_URL}/login/return` as the redirect URI, so reusing it avoids registering a new reply URL on every environment's app registration. PIP used a separate `/media-verification/return`. In `login/return/index.ts`:
- `exchangeCodeForTokens` accepts `media_verification` and maps it to the verification policy.
- After `createOrUpdateUser`, when the provider is `media_verification` and the role is `VERIFIED`, it calls a new `updateLastVerifiedDate(userProvenanceId)` in `libs/account/src/repository/query.ts`. That is CaTH's `updateMediaAccountVerification`.
- It then logs the user in and redirects as usual.
- Fix the Welsh redirect so it appends `&lng=cy` when `returnTo` already has a query string. Today it builds `${returnTo}?lng=cy`.

**(c) Banner.** `apps/web/src/pages/(verified)/account-home` shows a `govukNotificationBanner` when `req.query.verified === "true"`. Add `bannerText` to `en.ts` ("Your account has been verified.") and `cy.ts` ("Mae eich cyfrif wedi cael ei ddilysu."), both taken from pip-frontend's locales.

The route is required. Without it, `last_verified_date` would never move after the backfill, and media users could not reset their clock.

### Architecture decisions

| Decision | Choice | Why |
|---|---|---|
| Where the cron logic lives | New lib `libs/inactive-accounts` (`@hmcts/inactive-accounts`) | `@hmcts/auth` already depends on `@hmcts/account`, so `libs/account` cannot import auth's Graph client without a cycle. `apps/crons` stays composition-only. |
| B2C delete in the shared function | `archiveAndDeleteUser(userId, deleteB2cUser)`. The caller passes in a `(b2cUserId) => Promise<void>` function, and the parameter is required | Avoids the account→auth cycle. Because the parameter is required, the type system stops any caller leaving out the B2C step. |
| B2C delete failure | Log `userId` and the error message, then still archive and delete (PIP `deleteAzureUser`) | Follows PIP exactly. A Graph 404 counts as success. |
| B2C call placement | Read the user, then call B2C, then run the database transaction | Prisma interactive transactions time out after 5 seconds by default. Keeping the HTTP call outside the transaction avoids holding a database transaction open. Only the database writes need to be atomic. |
| Graph client import | New `@hmcts/auth/graph-api` subpath export pointing at `src/graph-api/client.ts`, plus a new `deleteB2cUser(accessToken, b2cUserId)` | The `@hmcts/auth` root index pulls in passport and openid-client/passport, which are peer dependencies that crons does not have. |
| Manual System Admin delete | `deleteUserById` calls `archiveAndDeleteUser(userId, b2cDeleter)`. The deleter calls `getGraphApiAccessToken` lazily, only for `PI_AAD` users. A manual delete therefore archives **and** removes the B2C account (confirmed) | This matches PIP's `deleteAccount`, which removes the Azure account. PIP does not archive on manual delete, but this ticket requires archiving for both paths. The web pod already has the Graph secrets. The Graph app registration has `User.ReadWrite.All` (confirmed). |
| Graph token in the cron | Requested lazily, once per run, inside the deleter passed to `archiveAndDeleteUser` | No Graph call when there are no `PI_AAD` deletions. A token lasts about 60 minutes. |

### Failure handling and performance

- **Failures for one user.** Notify errors, archive transaction errors and unexpected errors are caught around each user, counted per step, and logged with the internal `userId` and the error message (never the email or name). Processing then moves on to the next user. After all five steps, the script logs the counts. If any step had a failure it throws, so the Job exits 1. With `backoffLimit: 0` (see "Steps") there is no automatic retry and so no duplicate emails.
  - This is stricter than PIP, whose `forEach` loops stop the step at the first exception. Following PIP here would let one bad address block every deletion after it.
- **Run-level failures** exit 1 straight away: invalid thresholds, a missing or invalid `INACTIVE_ACCOUNTS_START_DATE`, missing `GOVUK_NOTIFY_API_KEY` or `CATH_SERVICE_URL`, or the database being unreachable. A Graph token failure is caught inside `archiveAndDeleteUser`, the same as any other B2C error: it is logged, and the archive and delete go ahead.
- **Batching.** Each query reads pages of 100 using keyset pagination (`userId > cursor`, ordered by `userId`) and selects only the columns needed. Users are processed one at a time. Daily volume is small. Because of the go-live floor, there is no first-run deletion spike. Processing one at a time also keeps within the Notify (3,000 per minute) and Graph limits.
- **No new index.** `user_provenance` and `role` are already indexed, and the table is small.
- **Redis.** `sendNotifyEmail` uses Redis for rate limiting. The cron calls `closeRedisClient()` in `finally`, because otherwise the Redis `pingInterval` keeps the pod alive. Redis connects lazily, so a run with no emails never opens it.

## 2. Implementation details

### Files

```
libs/account/
├── package.json                       + "./user-archive" export (identical to #918)
└── src/
    ├── repository/query.ts            + updateLastVerifiedDate(userProvenanceId); createUser passes lastVerifiedDate: signedInAt
    ├── repository/query.test.ts       + tests
    └── user-archive/                  NEW
        ├── query.ts                   findUserForArchive(userId); archiveAndDeleteUserRecord(user) – the $transaction
        ├── query.test.ts
        ├── service.ts                 archiveAndDeleteUser(userId, deleteB2cUser): Promise<boolean>
        └── service.test.ts
tsconfig.json                          + "@hmcts/account/user-archive", "@hmcts/auth/graph-api", "@hmcts/inactive-accounts"

libs/auth/
├── package.json                       + "./graph-api" export
└── src/
    ├── graph-api/client.ts            + deleteB2cUser(accessToken, b2cUserId)
    ├── graph-api/client.test.ts
    ├── config/b2c-config.ts           + policyMediaVerification (B2C_POLICY_MEDIA_VERIFICATION, default B2C_1_SignInMediaVerification)
    └── index.ts                       + export deleteB2cUser

libs/govuk-notify/src/template-ids.ts  + 3 constants (above)

libs/inactive-accounts/                NEW @hmcts/inactive-accounts
├── package.json                       deps: @hmcts/account, @hmcts/auth, @hmcts/govuk-notify, @hmcts/postgres-prisma
├── tsconfig.json
└── src/
    ├── index.ts                       export { processInactiveAccounts }
    └── inactive-accounts/
        ├── settings.ts                getInactivitySettings(): eight thresholds and INACTIVE_ACCOUNTS_START_DATE, validated
        ├── date-boundaries.ts         utcDayStart(daysAgo), exact-day and on-or-before ranges, buildFlooredDateFilter(column, condition, startDate)
        ├── queries.ts                 findMediaUsersForVerification, findIdamUsersForSignInNotification,
        │                              findMediaUsersForDeletion, findAdminUsersForDeletion, findIdamUsersForDeletion (keyset batches)
        ├── notifications.ts           sendMediaVerificationEmail, sendIdamSignInNotificationEmail
        ├── service.ts                 processInactiveAccounts(): Promise<InactiveAccountsSummary> (5 steps)
        └── *.test.ts

libs/system-admin-pages/src/user-management/queries.ts
  deleteUserById(userId) → archiveAndDeleteUser(userId, lazy Graph deleter); throws "User not found" when it returns false

libs/postgres-prisma/prisma/schema/base.prisma   + lastVerifiedDate
apps/postgres/prisma/migrations/<ts>_add_user_last_verified_date/migration.sql   (add column + backfill)

apps/web/src/pages/(auth)/media-verification/index.ts, index.test.ts   NEW
apps/web/src/pages/(auth)/login/return/index.ts, index.test.ts         media_verification provider
apps/web/src/pages/(verified)/account-home/{index.ts,index.njk,en.ts,cy.ts} + tests   verified banner
apps/web/config/custom-environment-variables.json, apps/web/helm/values.yaml   + B2C_POLICY_MEDIA_VERIFICATION (optional; default used)

apps/crons/
├── package.json                       + @hmcts/account, @hmcts/postgres-prisma, @hmcts/inactive-accounts, @hmcts/redis
├── src/inactive-verification.ts       default export
├── src/inactive-verification.test.ts
├── config/custom-environment-variables.json   + "redis": { "url": "REDIS_URL" }
├── config/development.json                    + "redis": { "url": "redis://localhost:6380" }
├── helm/values.yaml                   + CATH_SERVICE_URL; + keyVault secrets (below); SCRIPT_NAME stays "example"
└── helm/values.yaml.test.ts           NEW (#918 later adds its SCRIPT_NAME cases to the same file)

libs/test-support/src/test-data-cleanup.ts     + "userArchives" step
e2e-tests/tests/system-admin/user-management.spec.ts, mi-report.spec.ts, verified-user/account-home.spec.ts, sign-in.spec.ts
docs/tickets/351/flux-config.md                draft of the cnp-flux-config PR
```

### `archiveAndDeleteUser(userId, deleteB2cUser)` (`user-archive/service.ts`)

1. `findUserForArchive(userId)` selects `userId`, `userProvenance`, `userProvenanceId`, `email`, `role` and `lastSignedInDate`. If there is no row, return `false`.
2. If `userProvenance === "PI_AAD"`, call `await deleteB2cUser(userProvenanceId)`. If it throws, log `{ userId, message }` and continue.
3. `archiveAndDeleteUserRecord(user)` runs one `prisma.$transaction(async (tx) => …)`:
   - `tx.userArchive.create`, mapping `userId`, `userProvenance`, `provenanceUserId ← userProvenanceId`, `email`, `roles ← role` and `lastSignedInDate`. `archivedDate` takes the database default.
   - `tx.subscription.deleteMany({ where: { userId } })`. Notification audit logs cascade, under migration `20260428092331`.
   - `tx.subscriptionListType.deleteMany({ where: { userId } })`
   - `tx.user.delete({ where: { userId } })`
4. If the transaction fails with Prisma `P2025` (the user was deleted by someone else in the meantime), the archive insert rolls back and the function returns `false`. Any other error is rethrown. Otherwise it returns `true`.

### API endpoints

None. There is one new page route, `GET /media-verification`, which redirects only.

### Key Vault secrets for `apps/crons/helm/values.yaml` (`keyVaults.cath.secrets`)

The chart has `app-insights-connection-string` and `postgres-url` today. In production, `getPropertiesVolumeSecrets` reads aliases from the chart values inside the image, so the new secrets must go in this file. Copy the names from `apps/web/helm/values.yaml`, keeping the `<ENV>` placeholders:

| Secret | Alias | Used for |
|---|---|---|
| `govuk-notify-api-key` | `GOVUK_NOTIFY_API_KEY` | emails |
| `managed-redis-url` | `REDIS_URL` | the Notify rate limiter |
| `b2c-tenant-id` | `AZURE_B2C_TENANT_ID` | Graph token |
| `b2c-<ENV>-graph-client-id` | `B2C_GRAPH_CLIENT_ID` | Graph token |
| `b2c-<ENV>-graph-client-secret` | `B2C_GRAPH_CLIENT_SECRET` | Graph token |

Every `cath-crons` release will see these secrets. This has been accepted.

Environment value to add: `CATH_SERVICE_URL: https://cath.{{ .Values.global.environment }}.platform.hmcts.net`, the same as web. The threshold and link variables are not added to the chart, so their code defaults apply. Flux can override them. `INACTIVE_ACCOUNTS_START_DATE` has no default and goes only in the flux HelmRelease.

### Secrets must never appear in logs

This is a requirement for the new code, both the cron and `archiveAndDeleteUser`. Never log:
- config objects, `process.env`, or connection strings (`DATABASE_URL`, `REDIS_URL`)
- tokens
- raw error objects

Log only the error `message` or code, plus user IDs and counts. Specifically:

| Source | What to log | Why |
|---|---|---|
| Notify errors | `extractNotifyError(error)` from `@hmcts/govuk-notify` (status and Notify's message) | The raw axios error object carries `config.headers.Authorization`, a bearer JWT signed with the API key. |
| Graph errors | `statusCode`, `code` and `message`, as the existing client already does | Never log the error body or the request. |
| Graph token errors | Change `getGraphApiAccessToken` so the thrown message holds only the HTTP status and the token endpoint's `error` code (for example `invalid_client`) | Today the message includes the whole response body. That body does not hold the client secret, but under this rule only the code should be logged. This is a small hardening that also benefits web. |
| Prisma errors | Prisma `code` (for example `P2025`) and `message` | Prisma messages do not include the connection string, but the client options must never be logged. |

**`getPropertiesVolumeSecrets` checked** (`@hmcts-cft/cloud-native-platform` 2.3.0, `dist/properties-volume/properties.js` and `azure-vault.js`). It never prints secret values. Its only `console.warn` calls print file paths, vault names and caught error text, for example "Failed to read /mnt/secrets/cath/…". Nothing to change.

A unit test feeds the cron mocked secret values (Notify key, Redis URL, Graph client secret, DB URL, a Graph token) through every success and failure path. It then asserts that none of those values appear in any captured `console.log`, `console.warn` or `console.error` call.

## 3. Error handling and edge cases

| Case | Behaviour |
|---|---|
| Archive insert fails | The transaction rolls back, so the user and subscriptions remain. The cron counts a failure. System Admin gets the existing 500 page. |
| B2C delete fails (including a Graph token failure) | Logged with `userId` and the message, then archive and delete go ahead (PIP). Possible result: a B2C account with no CaTH user. If that user signs in through B2C, `createOrUpdateUser` creates a new `VERIFIED` row. This is PIP's behaviour, and the B2C failure is in the logs. |
| B2C returns 404 | Treated as success, with no error logged. |
| `MOCK_AZURE_B2C=true` | `deleteB2cUser` makes no call. |
| User deleted by someone else before the transaction | `P2025` causes a rollback, the function returns `false`, and the cron counts the user as skipped. `deleteUserById` throws "User not found", which keeps today's error. |
| Notify fails for one user | Counted as a failure, and processing moves on to the next user. Under exact-day matching, that reminder is not retried. |
| Exact-day reminder missed (no run that day) | Accepted PIP behaviour. Deletion still happens later through `<=`. |
| Job fails | `backoffLimit: 0` means no automatic retry, so no duplicate emails. A manual `kubectl create job` on the same day **will** re-send that day's reminders. The aat test steps say to expect this, and it should not be done in prod. |
| `NULL` `last_signed_in_date` for an admin or IDAM user | Never matches, as in PIP. |
| Empty names | `full_name` becomes "user". |
| Invalid threshold environment variable | Exit 1 before doing anything. |
| `INACTIVE_ACCOUNTS_START_DATE` missing or invalid | Exit 1 before any query or email. |
| User already overdue at go-live (activity date before `S`) | Treated as last active on `S`. They get the reminder at `S + N` and are deleted at the deletion threshold after `S`. Nobody is deleted on the first run. |
| User active after go-live | Their own date applies. The floor has no effect for them. |
| Go-live more than 365 days ago | The floor has no effect, and behaviour is exactly PIP's. |
| `INACTIVE_ACCOUNTS_START_DATE` in the future | Nothing matches until the floor has passed. This is accepted, so the value can be set before go-live. |
| No candidates | Zero counts and exit 0. No Graph or Redis connection is opened. |
| Media verification with a non-`VERIFIED` `PI_AAD` user | `lastVerifiedDate` is not updated, matching PIP's `verifiedRoles` check. The normal sign-in still completes. |
| Media verification B2C error or cancel | Uses the existing `/login/return` error handling (redirects to `/sign-in?error=…`, and handles the forgot-password code AADB2C90118). |
| Logging | Counts, plus `userId` and the error message or code on failure only. No emails, names, secrets, tokens, env/config or raw error objects (see "Secrets must never appear in logs"). |

## 4. Acceptance criteria mapping

| Requirement | How it is met | How it is verified |
|---|---|---|
| Media 350 days unverified get the verification email | Step 1: exact day on `last_verified_date`, template `1dea6b4b…`, `full_name` and `verification_page_link` | queries, notifications and service unit tests; aat run |
| Media 365 days are deleted, including from B2C | Step 3: `<=` query, then `archiveAndDeleteUser`, which deletes from B2C for `PI_AAD` | queries and service tests, user-archive service test; check B2C on aat |
| AAD and SSO admins at 90 days are deleted, with no email | Step 4, with the separate AAD and SSO thresholds | queries and service tests |
| CFT 118 days notified, 132 days deleted | Steps 2 and 5 | queries, notifications and service tests |
| Crime 180 days notified, 208 days deleted | Steps 2 and 5 | same |
| Subscriptions removed | Both `deleteMany` calls run in the transaction, and audit logs cascade | user-archive query test |
| Thresholds configurable | Eight environment variables with PIP's defaults | settings test |
| No backlog deleted without a reminder at go-live | `INACTIVE_ACCOUNTS_START_DATE` floor in all five queries; required, fail fast | date-boundaries, queries and settings tests (floor applied, not applied, missing, invalid) |
| No secrets in logs | Logging rules, `extractNotifyError`, Graph token message hardening | inactive-verification secret-leak test, Graph client test |
| Archive and delete in one transaction | `archiveAndDeleteUserRecord` | user-archive query test |
| Column mapping | Step 3 mapping | user-archive query test |
| One shared function for both paths | Both call `archiveAndDeleteUser`, and the deleter parameter is required | system-admin queries test and service test |
| **AC: every cron-deleted account has a `user_archive` row** | Steps 3 to 5 delete only through `archiveAndDeleteUser` | service test; on aat, compare the logged counts with the "Deleted accounts" report |
| **AC: every System Admin-deleted account has a `user_archive` row** | `deleteUserById` calls `archiveAndDeleteUser` | unit test; E2E: the deleted user appears in the "Deleted accounts" xlsx |
| **AC: archive insert fails, so the user is not deleted** | Transaction rollback | user-archive query test |
| Media verification resets the clock | `/media-verification`, then `/login/return`, then `updateLastVerifiedDate` | controller tests; E2E redirect assertion plus banner |
| Logs contain counts only, one run per day | Script logging; flux 00/01 schedules; `backoffLimit: 0` | inactive-verification test; aat `kubectl get cronjob` on both clusters |

## 5. Test scenarios

Unit tests follow `.claude/rules/testing.md`: Arrange-Act-Assert, `vi.mock`, and `vi.clearAllMocks()` in `beforeEach`.

**`libs/account/src/user-archive/query.test.ts`**
1. `archiveAndDeleteUserRecord` creates the archive row with the mapped columns, then deletes subscriptions, subscription list types and the user, in that order, all on the same `tx`.
2. If `userArchive.create` rejects, the error propagates and no delete is called (AC3).

**`libs/account/src/user-archive/service.test.ts`**
3. For a `PI_AAD` user, calls `deleteB2cUser` with `userProvenanceId` before the transaction and returns `true`. For `CFT_IDAM`, `CRIME_IDAM` and `SSO`, never calls it (`it.each`).
4. If `deleteB2cUser` rejects, it logs (with no email in the log) and still archives and deletes.
5. Returns `false` with no B2C call and no transaction when the user does not exist. Returns `false` when the transaction rejects with `P2025`. Rethrows other errors.

**`libs/account/src/repository/query.test.ts`**
6. `updateLastVerifiedDate` updates by `userProvenanceId`. `createUser` with `signedInAt` also sets `lastVerifiedDate`.

**`libs/system-admin-pages/src/user-management/queries.test.ts`** (replaces the two current `deleteUserById` tests)
7. Calls `archiveAndDeleteUser` with the user ID and a deleter. Calling the deleter gets a token and calls `deleteB2cUser`.
8. Throws "User not found" when the result is `false`.

**`libs/auth/src/graph-api/client.test.ts`**
9. `deleteB2cUser` sends `DELETE /users/{id}`, resolves on 404, throws a wrapped error on any other error, and makes no call when `MOCK_AZURE_B2C` is set. When the token request fails, `getGraphApiAccessToken` throws a message with only the status and the `error` code, not the response body.

**`libs/auth/src/config/b2c-config.test.ts`**
10. `policyMediaVerification` defaults to `B2C_1_SignInMediaVerification` and can be overridden.

**`libs/inactive-accounts/.../settings.test.ts`**
11. Returns PIP's defaults (including separate AAD and SSO values), applies overrides, and throws on non-numeric, zero or negative values.
11a. Throws when `INACTIVE_ACCOUNTS_START_DATE` is missing.
11b. Throws when it is invalid: the wrong format (`19/11/2026`, `2026-11-19T00:00`) or not a real date (`2026-02-30`). Parses a valid value to UTC midnight.

**`date-boundaries.test.ts`**
12. Exact-day and on-or-before ranges are UTC midnights, checked just before and just after midnight, and in a non-UTC `TZ`.
12a. `buildFlooredDateFilter` with the floor applied: when the start date falls in or before `T`, the result includes the `{ col: { lt: S } }` branch. Example: start date 10 days ago and N = 5 for on-or-before.
12b. `buildFlooredDateFilter` with the floor not applied: when the start date is after `T`, only the `col matches T AND col >= S` branch is returned. When go-live is more than N days back, the matching set is the same as PIP's unfloored condition.

**`queries.test.ts`**
13. Each of the five queries builds PIP's condition: provenance and role filters, the right column (`lastVerifiedDate` or `lastSignedInDate`), exact-day versus `<=`, and the right threshold for each provenance (`it.each`). Each one goes through `buildFlooredDateFilter` with the configured start date, and each uses keyset pagination.

**`notifications.test.ts`**
14. The media email sends `full_name` (`firstName`, or "user") and `verification_page_link`.
15. The CFT and Crime emails (`it.each`) choose the template by provenance and send `full_name` (first name and surname, or "user"), `last_signed_in_date` formatted `dd MMMM yyyy` (for example "05 March 2026"), and both sign-in links. The link environment variables override the defaults.
16. Throws when `GOVUK_NOTIFY_API_KEY` or `CATH_SERVICE_URL` is missing.

**`service.test.ts`** (processInactiveAccounts)
17. Runs the five steps in PIP order. Notify steps send one email per candidate. Deletion steps call `archiveAndDeleteUser` for every candidate (AC1). No email is sent for admin or IDAM deletions.
18. The deleter gets the Graph token once per run, and not at all when there are no `PI_AAD` deletions.
19. A Notify failure or an `archiveAndDeleteUser` failure for one user is counted, and the next user is still processed. A `false` result is counted as skipped.
20. Reads further batches until a page comes back empty.

**`apps/crons/src/inactive-verification.test.ts`**
21. Logs counts only, with no email in any log call, and disconnects Prisma and Redis.
21a. Secret leak test: set mocked values for `GOVUK_NOTIFY_API_KEY`, `REDIS_URL`, `B2C_GRAPH_CLIENT_SECRET` and `DATABASE_URL`, plus a Graph token. Make the mocked Notify, Graph and Prisma errors carry those values in their bodies or config. Run the success path and the failure path. Assert that no captured `console.log`, `console.warn` or `console.error` argument contains any of the values.
22. Throws after logging when there are failures, and still disconnects.
23. Passes on an error from `processInactiveAccounts` and still disconnects.

**`apps/crons/helm/values.yaml.test.ts`**
24. The chart keyVaults include the five new aliases, and `CATH_SERVICE_URL` is set.

**`apps/web/src/pages/(auth)/media-verification/index.test.ts`**
25. Redirects to the B2C authorise URL with `p=B2C_1_SignInMediaVerification`, the `/login/return` redirect URI, and the locale. Sets `b2cProvider = "media_verification"` and `returnTo = "/account-home?verified=true"`. Returns 503 when B2C is not configured.

**`apps/web/src/pages/(auth)/login/return/index.test.ts`**
26. With the `media_verification` provider, exchanges the code using the verification policy, calls `updateLastVerifiedDate` for `VERIFIED` users, and redirects to `/account-home?verified=true`, or `…&lng=cy` for Welsh. With the `cath` provider, does not call `updateLastVerifiedDate`.

**`apps/web/src/pages/(verified)/account-home`** (controller test and `index.njk.test.ts`)
27. The banner renders only when `verified=true`, in English and Welsh. The `en` and `cy` locale keys match.

**`libs/test-support/src/routes/test-support/cleanup.test.ts`**
28. `cleanupByPrefix` deletes `user_archive` rows whose email or `provenanceUserId` starts with the prefix.

**E2E** (extend existing journeys; no new spec files)
29. `system-admin/user-management.spec.ts`, in "system admin can search, filter, view, and delete users @nightly": after the deletion, download the "Deleted accounts" MI report (all periods), parse it with `exceljs`, and assert there is a row with `testUserId` (AC2). Also remove the "empty until #351" comment in `mi-report.spec.ts`.
30. `verified-user/account-home.spec.ts`: in the existing journey, open `/account-home?verified=true` and assert the banner. Switch to Welsh and assert the Welsh text. Run an axe check.
31. `sign-in.spec.ts`: next to the existing B2C redirect check, assert that `GET /media-verification` returns 302 to B2C with `p=B2C_1_SignInMediaVerification`. This checks only the redirect, without depending on a B2C round trip.

There is no E2E for the cron. Its date-driven selection cannot be set up end to end. It is covered by unit tests and a manual aat run.

## 6. Deployment (cnp-flux-config)

Draft the PR into `docs/tickets/351/flux-config.md`. **Do not open it.** Follow hmcts/cnp-flux-config#49220:
- `apps/cath/cath-inactive-verification-cron/cath-inactive-verification-cron.yaml`: HelmRelease using chart `cath-crons` from `hmctsprod-oci`. `job.releaseNameOverride: cath-inactive-verification-cron`, `job.environment.SCRIPT_NAME: inactive-verification`, `job.backoffLimit: 0`, `job.environment.INACTIVE_ACCOUNTS_START_DATE` set per environment through the `<env>/00.yaml` and `01.yaml` patches (placeholders `<AAT_GO_LIVE_YYYY-MM-DD>`, `<DEMO_GO_LIVE_YYYY-MM-DD>`, `<PERFTEST_GO_LIVE_YYYY-MM-DD>` and `<PROD_GO_LIVE_YYYY-MM-DD>`; both clusters in an environment get the same value), and the image with `# {"$imagepolicy": "flux-system:cath-inactive-verification-cron"}`. No schedule.
- `image-repo.yaml` and `image-policy.yaml`, registered in `apps/cath/automation/kustomization.yaml`.
- A resource line in `apps/cath/<env>/base/kustomization.yaml` for aat, demo, perftest and prod.
- `apps/cath/cath-inactive-verification-cron/<env>/00.yaml` with `"1 8 1-31/2 * *"` and `01.yaml` with `"1 8 2-30/2 * *"`, patched from `apps/cath/<env>/00|01/kustomization.yaml`. Merge into the existing `patches:` lists from #48436 and #49220.
- Merge order: the cath-service PR first, then wait for the `cath-crons` image tag that contains `inactive-verification`, then the flux PR.

## Decisions

1. **The media verification route is in #351.** It covers `/media-verification`, the `media_verification` handling in `/login/return`, `last_verified_date` and the account-home banner.
2. **`B2C_1_SignInMediaVerification` is confirmed** in every environment and works with the `/login/return` reply URL. The name stays configurable through `B2C_POLICY_MEDIA_VERIFICATION`.
3. **The Graph app registration has `User.ReadWrite.All`** (confirmed).
4. **Deleting the first-run backlog without a reminder is not acceptable.** The required `INACTIVE_ACCOUNTS_START_DATE` floor is applied in all five queries and fails fast if missing or invalid. The `last_verified_date` backfill stays as `COALESCE(last_signed_in_date, created_date)`.
5. **The queries cover only `PI_AAD`, `SSO`, `CFT_IDAM` and `CRIME_IDAM`.** There will be no users with any other provenance.
6. **Secrets on every `cath-crons` release are accepted.** Secrets must never appear in logs. This is enforced by the logging rules and a unit test.
7. **A System Admin delete of a `PI_AAD` user also deletes the B2C account** (confirmed).

## CLARIFICATIONS NEEDED

None.
