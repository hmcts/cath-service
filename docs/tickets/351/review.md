# Code Review: Issue #351

Inactive accounts cron (`inactive-verification`) and archiving deleted users to `user_archive`.

Branch `feature/351-inactive-accounts-cron` (uncommitted working tree on top of `origin/master`).

## Summary

This is a faithful port of PIP's `InactiveAccountManagementService`, `UserRepository` and `AccountService.archiveAccount`. It also adds the agreed `INACTIVE_ACCOUNTS_START_DATE` floor. I checked every point below against the code, not against the plan or the implementer's summary:

- **Date matching.** Reminders match on the exact day and deletions match on or before the day, using UTC day ranges. `[d(n), d(n-1))` and `< d(n-1)` are the same as PIP's `CAST(col AS DATE) = / <= CURRENT_DATE - n`.
- **Admin definition.** An admin is a `PI_AAD` user with a role other than `VERIFIED`, or any `SSO` user.
- **B2C delete.** It runs before the database transaction. A failure is logged and the archive and delete carry on. A 404 counts as success.
- **Notify personalisation.** The keys match the ticket's Decisions exactly.
- **Go-live floor.** It is correct. The branch that compares against the start date (`col < S`) is only added when `S` itself meets the condition, so a `NULL` date never matches either branch. Once go-live is more than 365 days in the past, the filter gives the same results as PIP's.
- **Shared delete function.** One `archiveAndDeleteUser` is used by both the cron and the System Admin delete. The `user_archive` insert and the user and subscription deletes run in one transaction.

The lint check, `tsc --noEmit` and all unit tests pass in every changed workspace. Statement coverage is at least 87.9% in each one.

There are no critical issues. Two high-priority items remain:
1. A partly masked recipient email can still reach the cron logs.
2. The handling for "user deleted at the same time by someone else" catches the wrong Prisma error code.

## 🚨 CRITICAL Issues

None.

## ⚠️ HIGH PRIORITY Issues

1. **Partly masked recipient email can be logged by the cron (Decision 6 / CLAUDE.md "No sensitive data in logs")**: `libs/inactive-accounts/src/inactive-accounts/service.ts:80`, `:102`, and `libs/email-rate-limit/src/email-rate-limit.ts:22`
   - **Problem.** `sendNotifyEmail` calls `validateEmailRateLimit`. When the limit is exceeded, that function throws `Rate limit has been exceeded. Email failed to be sent to j*********@example.com`. This error has no Prisma `code` and no `response`, so `describeError` passes it to `extractNotifyError`, which returns `error.message` unchanged. `runStep` then logs it with `console.error`.
   - **Impact.**
     - This is not a secret, so the rule "secrets must never appear in logs" is not broken.
     - It does break CLAUDE.md "No sensitive data in logs" and the ticket's aat check ("logs contain counts only, no emails").
     - The first letter plus the full domain is still personal data under UK GDPR. It sits on the same log line as the `userId`, so it can be linked to a person.
     - The chance is low (the limit is 10 emails per recipient per 30 minutes), but the leak is real. The secret-leak test in `apps/crons/src/inactive-verification.test.ts` mocks `sendNotifyEmail`, so it cannot catch this.
   - **Solution.** Map rate-limit errors to a fixed code in `describeError`. For example, check for `message.startsWith("Rate limit has been exceeded")` and return `{ code: "EMAIL_RATE_LIMITED", message: "Rate limit exceeded" }`. A better fix is a typed `EmailRateLimitError` exported from `@hmcts/email-rate-limit`, checked with `instanceof`. Add a case to the secret-leak test that lets the real `validateEmailRateLimit` throw, with `tryConsumeToken` mocked to return false. Assert that neither the email nor its domain appears in the output.

2. **The "deleted at the same time" path catches the wrong Prisma error, so concurrent deletes fail instead of being skipped**: `libs/account/src/user-archive/service.ts:24` and `libs/account/src/user-archive/query.ts:19-31`
   - **Problem.**
     - The transaction inserts into `user_archive` first. `user_archive.user_id` is the primary key (`user-archive.prisma:2`).
     - Suppose the cron and a System Admin delete the same user at the same moment. The second transaction's `userArchive.create` waits on the first transaction's uncommitted row, then fails with **P2002** (unique constraint), not P2025.
     - The same happens if the first transaction has already committed: the archive row exists, so the insert fails with P2002 before `tx.user.delete` can raise P2025.
     - So the P2025 branch documented in plan.md (§3, "User deleted by someone else before the transaction") can effectively never run. The unit test at `service.test.ts:114` tests a path the database will not produce.
   - **Impact.** The second caller gets an error it should not. The cron counts a failure and exits 1. The System Admin sees the 500 page instead of "User not found". Atomicity is still safe because the transaction rolls back. The chance is low, but the documented contract is wrong.
   - **Recommendation.** Either:
     - (a) run `tx.user.delete` **before** `tx.userArchive.create` inside the same transaction. The `user` row lock then serialises concurrent callers, the second one gets P2025, and atomicity is unchanged; or
     - (b) treat a P2002 on `user_archive` as "already archived" and return `false`.

     Option (a) is the simpler fix. The archive data comes from the `user` row already read by `findUserForArchive`, so the delete order does not matter. Update `query.test.ts` so it asserts the new order, and keep the test proving nothing is deleted when the archive insert fails (AC3).

## 💡 SUGGESTIONS

1. **The `VERIFIED` role check in `/login/return` can never be false**: `apps/web/src/pages/(auth)/login/return/index.ts:84-88,102`
   - **Problem.** `createOrUpdateUser` is always called with `role: "VERIFIED"`, and `updateUser` (`libs/account/src/repository/query.ts:51`) overwrites the stored role. So `dbUser.role === "VERIFIED"` is always true by the time it is checked. The PIP `verifiedRoles` behaviour and the plan's edge case ("non-`VERIFIED` `PI_AAD` user, `lastVerifiedDate` not updated") are not actually reproduced.
   - **Note.** The root cause is the existing role overwrite. Any legacy `PI_AAD` admin who signs in through B2C is demoted to `VERIFIED`. That is out of scope here, but the dead guard should be either removed or made real by reading the role before the upsert. Raise a ticket for the role overwrite.
2. **A failure in `updateLastVerifiedDate` blocks sign-in**: `apps/web/src/pages/(auth)/login/return/index.ts:103,139`
   - **Problem.** The user has already authenticated. If the timestamp update fails, the error falls through to the outer `catch`, which logs the raw error object and redirects to `/sign-in?error=auth_failed`.
   - **Approach.** Handle it like `createOrUpdateUser`: catch the error, call `trackException` with the `userId` only, and continue the sign-in.
   - **Note.** The existing `console.error("B2C callback error:", error)` logs a raw object. The token-exchange error text includes the response body (line 187). Both are older code, but the same "no raw errors" rule applies.
3. **Duplicated OAuth helpers (DRY)**: `apps/web/src/pages/(auth)/media-verification/index.ts:35-43` copies `generateState` and `generateNonce` from `b2c-login/index.ts:39-52`. Move them into `@hmcts/auth`, for example a `b2c-authorize-url.ts`, and have both routes build the authorise URL from it.
4. **Type safety**
   - `libs/account/src/user-archive/service.ts:24`: `(error as { code?: string }).code` throws a `TypeError` if a non-object is thrown (`throw undefined`). Use a type guard: `typeof error === "object" && error !== null && "code" in error`.
   - `settings.ts:18` uses an `as InactivityThresholds` assertion. This is acceptable given the `satisfies` const, but a typed reducer would avoid it.
5. **Data minimisation (YAGNI)**: `libs/inactive-accounts/src/inactive-accounts/queries.ts:38`
   - **Problem.** `findMediaUsersForDeletion` selects `email`, `firstName` and `lastVerifiedDate`, which are not used until #896.
   - **Approach.** Select only `userId` now and let #896 add the extra columns. If you keep them for #896, say why in the PR.
6. **Redis error handler logs the raw error object**: `libs/redis/src/redis-client.ts:15`
   - **Problem.** This code now also runs in the cron. node-redis errors do not normally include the URL or password, but logging `err.message` would follow the "no raw error objects" rule completely.
7. **The E2E `/media-verification` check depends on B2C being configured**: `e2e-tests/tests/sign-in.spec.ts:124-129`
   - **Problem.** Preview has `B2C_CLIENT_ID`, but a local run without B2C config gets a 503 and fails. Consider skipping when B2C is not configured, as other B2C-dependent checks do.
8. **The media verification link has no `?p=` parameter.** The ticket lists `/media-verification?p=B2C_1_SignInMediaVerification`. The implementation sends `/media-verification` (`notifications.ts:21`) and chooses the policy on the server. This works the same way and is explained in plan.md. Mention it in the PR so nobody "fixes" it later.
9. **Banner type.** The banner uses the default "Important" type, which matches pip-frontend, and adds a proper Welsh title ("Pwysig"). GOV.UK guidance prefers `type: "success"` (role `alert`, title "Success") to confirm the outcome of the user's own action. This is worth confirming with design. It is not required.
10. **#918 rebase.** File names, the `./user-archive` export entry and the `tsconfig.json` path line match `origin/feature/918-purge-user-archive` exactly. Those hunks will rebase cleanly. Expect add/add conflicts in these files, and list them in the PR:
    - `libs/account/src/user-archive/query.ts`, `service.ts` and `service.test.ts`: keep both sets of functions. Merge the `vi.mock("@hmcts/postgres-prisma")` factories. Keep consts at the top and types at the bottom.
    - `apps/crons/helm/values.yaml.test.ts`: the `describe` names differ. Keep both, and keep #918's umbrella `SCRIPT_NAME` tests.
    - `apps/crons/package.json` dependency list and `yarn.lock`: take this branch's list, then run `yarn install`.

    None of these are hard to resolve.
11. **Indexes.** `last_signed_in_date` and `last_verified_date` have no index, so each query filters on provenance or role and then scans by date. This is fine at CaTH's table size. Revisit if `user` grows large.

## ✅ Positive Feedback

- **Behaviour matches PIP.** The UTC day-range translation is exact and documented in one place (`date-boundaries.ts:5-13`). It is tested just before and just after midnight, and in a non-UTC time zone.
- **The floor is correct and wears off on its own.** `buildFlooredDateFilter` (`date-boundaries.ts:17-24`) splits `GREATEST` into two branches and only adds the second when it can match. This keeps a `NULL` date excluded and gives exactly PIP's results once go-live is old enough.
- **Fails fast on bad config.** All nine settings, plus the Notify key and service URL, are checked before any query (`service.ts:18-19`). The start-date check rejects impossible dates such as `2026-02-30` and `2025-02-29`.
- **Failures are isolated per user.** One failure is counted and the run moves on (`service.ts:65-87`). The script exits 1 at the end (`apps/crons/src/inactive-verification.ts:10-13`). Prisma and Redis are always disconnected through `Promise.allSettled` (`:15`), so the pod exits.
- **No dependency cycle.** The B2C deleter is passed into `archiveAndDeleteUser`, so `@hmcts/account` does not import `@hmcts/auth`. The `@hmcts/auth/graph-api` subpath keeps passport and openid-client out of the crons image.
- **The Graph token is fetched lazily.** It is requested at most once per run (`service.ts:56-62`) and never when no `PI_AAD` user is deleted. It is requested outside the 5-second Prisma interactive transaction.
- **Logging hardening.**
  - `getGraphApiAccessToken` now includes only the HTTP status and the OAuth `error` code in its error (`client.ts:107-108,284-291`).
  - `deleteB2cUser` logs only `statusCode`, `code` and `message`.
  - `describeError` removes Prisma's query echo.
  - The crons entry point logs `error.message` only (`apps/crons/src/index.ts:42`).
  - The secret-leak test feeds real-looking secrets through the Notify, Graph, Prisma and token-failure paths.
- **Migration.** Adding the column as `NOT NULL DEFAULT CURRENT_TIMESTAMP` is a metadata-only change on PG11+ because `CURRENT_TIMESTAMP` is stable. It is followed by a single `UPDATE` backfill. The column follows the naming rule (`@map("last_verified_date")`, snake_case).
- **Accessibility.** `govukNotificationBanner` is used with a localised `titleText`, so `role="region"` and `aria-labelledby` come from the component. The banner is placed before the `h1`. It is tested in English and Welsh, with locale-key parity, in `index.njk.test.ts`, and has an inline axe check in E2E.
- **E2E follows the minimal-test rule.** The three changes extend existing journeys and add no new tests. The user-management journey now proves AC2 by parsing the "Deleted accounts" xlsx.
- **The flux draft matches #49220.** It has the HelmRelease, image-repo and image-policy with the automation entry, base resources for aat, demo, perftest and prod, and the 00/01 patches `1 8 1-31/2 * *` and `1 8 2-30/2 * *`. It also sets `job.backoffLimit: 0` and includes the merge-order and conflict notes.

## Test Coverage Assessment

- **Unit tests.** They are thorough and follow the AAA pattern.
  - Boundary days: exact-day versus on-or-before, either side of midnight, non-UTC time zone.
  - Floor: applied, not applied, and go-live more than N days back.
  - Threshold and start-date validation: missing, wrong format, impossible date.
  - Personalisation for both IDAM templates (`it.each`).
  - Graph token fetched once or not at all.
  - Per-user failures counted, and batches read until one comes back empty.
  - The `user_archive` mapping and order, and AC3 rollback.
  - Gaps: the rate-limit masked-email path (HIGH 1), and the real concurrent-delete error code (HIGH 2). The P2025 test mocks a path the database does not produce.
- **E2E tests.**
  - AC2 is covered in the System Admin delete journey.
  - The banner is covered in English and Welsh, with axe.
  - The `/media-verification` redirect is covered. Only the first redirect is checked, deliberately.
  - There is no cron E2E. That is reasonable, because the date-based selection cannot be set up end to end. The manual aat run is still outstanding (`tasks.md`).
- **Accessibility tests.** There is an inline axe scan on the banner state. It uses `disableRules(["region"])`, which matches the existing page checks.

**Statement coverage per changed workspace** (`vitest run --coverage`):

| Workspace | Statements | Branches | Status |
|---|---|---|---|
| `@hmcts/inactive-accounts` | 100% (110/110) | 98.24% | OK |
| `@hmcts/account` | 100% (48/48) | 100% | OK |
| `@hmcts/auth` | 96.33% (394/409) | 95.14% | OK |
| `@hmcts/govuk-notify` | 100% (25/25) | 100% | OK |
| `@hmcts/system-admin-pages` | 93.41% (1248/1336) | 84.48% | OK |
| `@hmcts/crons` | 87.87% (29/33) | 75% | OK |
| `@hmcts/test-support` | 98.66% (737/747) | 97.18% | OK |
| `@hmcts/web` | 95.61% (5252/5493) | 82.07% | OK. 387/387 files passed. The known `app.test.ts` flake did not appear in this run. |

Every changed workspace is above 80%.

## Acceptance Criteria Verification

**Description**
- [x] Media users unverified for 350 days receive the verification email (template `1dea6b4b…`, `full_name`, `verification_page_link`): `libs/inactive-accounts/src/inactive-accounts/queries.ts:14-19`, `notifications.ts:27-38`, `libs/govuk-notify/src/template-ids.ts:15`
- [x] Media users unverified for 365 days are deleted: `queries.ts:35-40`, `service.ts:42-47`
- [x] The media user's Azure B2C account is removed: `libs/account/src/user-archive/service.ts:12-18`, `libs/auth/src/graph-api/client.ts:119-140`, `libs/inactive-accounts/src/inactive-accounts/service.ts:56-62`
- [x] AAD and SSO admin accounts inactive for 90 days are deleted with no email: `queries.ts:42-58`, `service.ts:49`
- [x] CFT 118 days → sign-in notification (template `cca7ea18…`), 132 days → deleted: `queries.ts:21-33,60-69`, `notifications.ts:40-53`, `template-ids.ts:16`
- [x] Crime 180 days → sign-in notification (template `710a1ea4…`), 208 days → deleted: `queries.ts:25,64`, `notifications.ts:43`, `template-ids.ts:17`
- [x] All subscriptions for the user are removed: `libs/account/src/user-archive/query.ts:29-30`; notification audit logs cascade (migration `20260428092331`)
- [x] Thresholds are configurable without code changes: `libs/inactive-accounts/src/inactive-accounts/settings.ts:1-10,23-34`

**Archive deleted accounts**
- [x] Automated deletions write a `user_archive` row, then delete the user and its subscriptions: `query.ts:17-33`, `service.ts:22,42-51`
- [x] The archive insert and the delete run in the same transaction: `libs/account/src/user-archive/query.ts:18`
- [x] `deleteUserById` writes a `user_archive` row inside a transaction before the user is deleted: `libs/system-admin-pages/src/user-management/queries.ts:108-113`
- [x] One shared archive-and-delete function is used by both paths: `libs/account/src/user-archive/service.ts:6`, used at `inactive-accounts/service.ts:22` and `system-admin-pages/.../queries.ts:109`
- [x] Column mapping (`user_id`, `user_provenance`, `provenance_user_id ← user_provenance_id`, `email`, `roles ← role`, `last_signed_in_date`, `archived_date` default): `query.ts:19-28`, `libs/postgres-prisma/prisma/schema/user-archive.prisma:8`

**Additional acceptance criteria**
- [x] Every account deleted by the inactivity cron has a matching `user_archive` row: `inactive-accounts/service.ts:22,46,49,51` (all three deletion steps go only through `archiveAndDeleteUser`)
- [x] Every account deleted by a System Admin has a matching `user_archive` row: `system-admin-pages/.../queries.ts:109`; E2E `e2e-tests/tests/system-admin/user-management.spec.ts:182-196`
- [x] If the archive insert fails, the user is not deleted: `query.ts:18-32` (the create runs first in the transaction); test `query.test.ts:86-97`

**Decisions (19 Nov 2026)**
- [x] 1. The `last_verified_date` column is set on creation and backfilled as `COALESCE(last_signed_in_date, created_date)`. Only `/media-verification` updates it (policy `B2C_1_SignInMediaVerification`, redirect to `/account-home?verified=true`):
  - schema and migration: `base.prisma:57`, `apps/postgres/prisma/migrations/20261119135042_add_user_last_verified_date/migration.sql:2,5`
  - set on creation: `libs/account/src/repository/query.ts:23`
  - update function: `query.ts:58-63`
  - only caller: `apps/web/src/pages/(auth)/login/return/index.ts:102-104`
  - route: `apps/web/src/pages/(auth)/media-verification/index.ts:5,17-22`
- [x] 2. The verification policy works through the `/login/return` reply URL: `media-verification/index.ts:24`, `login/return/index.ts:160-161`, `libs/auth/src/config/b2c-config.ts:53`
- [x] 3. Graph `User.ReadWrite.All` is used for the B2C delete. The permission is environmental; the code path is `client.ts:119-140` (`DELETE /users/{id}`)
- [x] 4. The required `INACTIVE_ACCOUNTS_START_DATE` floor uses `GREATEST(user date, start date)` and fails fast if missing or invalid: `settings.ts:36-54`, `date-boundaries.ts:17-24`, `queries.ts:80,84,87-89`, `inactive-accounts/service.ts:18`
- [x] 5. Only `PI_AAD`, `SSO`, `CFT_IDAM` and `CRIME_IDAM` are handled: `queries.ts:7-12`
- [~] 6. The Notify, Redis and B2C Graph secrets are added to the crons chart, and secrets never appear in logs.
  - Done: the secrets are mounted (`apps/crons/helm/values.yaml:22-31`, test `values.yaml.test.ts:18-26`). No secrets, tokens or connection strings are logged (`inactive-accounts/service.ts:89-104`, `client.ts:107-108,137`, `apps/crons/src/index.ts:42`, secret-leak test `inactive-verification.test.ts:126-302`).
  - Missing: the rate-limit error message (`libs/email-rate-limit/src/email-rate-limit.ts:22`) can put a partly masked recipient email in the cron logs (HIGH 1).
- [x] 7. A System Admin delete also removes the B2C account for `PI_AAD` users, through the shared function: `system-admin-pages/.../queries.ts:109`, `user-archive/service.ts:12-18`

**PIP behaviour carried over**
- [x] Reminders use exact-day `=` and deletions use `<=`, as date-only UTC comparisons: `date-boundaries.ts:6-13,26-29`
- [x] AAD and SSO admins have separate deletion thresholds, and all defaults are 350/365/90/90/118/132/180/208: `settings.ts:2-9`, `queries.ts:48,52`
- [x] An admin is `PI_AAD` with a role other than `VERIFIED`, or any `SSO` user: `queries.ts:44-54`
- [x] Delete order: B2C first for `PI_AAD`; on failure, log and still archive and delete; a 404 counts as success; then the transaction: `user-archive/service.ts:12-21`, `client.ts:133-136`
- [x] Email personalisation (media: `full_name`, `verification_page_link`; CFT and Crime: `full_name`, `last_signed_in_date`, `cft_sign_in_link`, `crime_sign_in_link`): `notifications.ts:32-35,45-50`
- [x] Sign-in links for `/media-verification`, `/cft-login` and `/crime-login`: `notifications.ts:21-23`. The `?p=` is chosen on the server instead (Suggestion 8).
- [x] PIP's media deletion email is left out (it belongs to #896), and the place to add it is marked: `inactive-accounts/service.ts:45`

**Deployment**
- [x] The cnp-flux-config layout (per-cluster 00/01 schedules, `backoffLimit: 0`, image repo, policy and automation, envs aat, demo, perftest and prod) is drafted, and the PR is intentionally not opened: `docs/tickets/351/flux-config.md:55-170`. It was checked against hmcts/cnp-flux-config#49220.

**Tally: 31 met, 1 partial (Decision 6), 0 unmet, out of 32.**

## Next Steps

- [ ] Address critical issues (none)
- [ ] Fix high priority items: stop the masked email reaching the logs (HIGH 1); fix the concurrent-delete handling (HIGH 2)
- [ ] Consider suggestions, especially 1 (dead role guard) and 2 (sign-in blocked by the verified-date update)
- [ ] Re-run tests after fixes: `yarn lint:fix`, `yarn test`, and `tsc --noEmit` for changed workspaces
- [ ] After merge: open the cnp-flux-config PR from `flux-config.md` with real go-live dates. Wait for the image tag. Run the aat checks on both clusters (schedule, and logs contain counts only). Confirm that the `b2c-<ENV>-…` secret names resolve in the `job` chart, as they do for web.

## Overall Assessment

**NEEDS CHANGES**

The implementation is well built, faithful to PIP, and well tested. Both fixes are small. Decision 6 is only partly met because a partly masked email can reach the logs. The concurrent-delete path catches P2025 when the database raises P2002. Once both are fixed, I'd expect this to be approved.
