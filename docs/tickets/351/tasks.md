# #351 Tasks

Branch `feature/351-inactive-accounts-cron` stays on `origin/master`. #351 goes in before #918. #918 (PR #1578) is rebased onto this work later and adds only the purge function and script.

## Implementation Tasks

### `user_archive` module (`libs/account/src/user-archive/`), using #918's file names and export path
- [x] `query.ts`: add `findUserForArchive(userId)`. Add `archiveAndDeleteUserRecord(user)`, which runs one `$transaction` doing `userArchive.create` (ticket mapping), then `subscription.deleteMany`, then `subscriptionListType.deleteMany`, then `user.delete`.
- [x] `service.ts`: add `archiveAndDeleteUser(userId, deleteB2cUser): Promise<boolean>`. Return `false` if the user is missing. For `PI_AAD` users, call `deleteB2cUser(userProvenanceId)`, log any error (`userId` and message only) and continue. Then run the transaction. If it fails with `P2025`, return `false`. Rethrow other errors.
- [x] `libs/account/package.json`: add `"./user-archive": { "production": "./dist/user-archive/service.js", "default": "./src/user-archive/service.ts" }`.
- [x] Root `tsconfig.json`: add `"@hmcts/account/user-archive": ["libs/account/src/user-archive/service"]`.

### Last verified date
- [x] `base.prisma` `model User`: add `lastVerifiedDate DateTime @default(now()) @map("last_verified_date")`.
- [x] Run `yarn db:migrate:dev --create-only` to create `<ts>_add_user_last_verified_date`. Add `UPDATE "user" SET "last_verified_date" = COALESCE("last_signed_in_date", "created_date");` to it, apply it, then run `yarn db:generate`.
- [x] `libs/account/src/repository/query.ts`: in `createUser`, set `lastVerifiedDate: signedInAt` when `signedInAt` is given. Add `updateLastVerifiedDate(userProvenanceId)`.

### Media verification route (web)
- [x] `libs/auth/src/config/b2c-config.ts`: add `policyMediaVerification`, read from `B2C_POLICY_MEDIA_VERIFICATION` with default `B2C_1_SignInMediaVerification`.
- [x] `apps/web/src/pages/(auth)/media-verification/index.ts`: a GET redirect to B2C authorise with the verification policy and the existing `/login/return` redirect URI. Set `session.b2cProvider = "media_verification"` and `session.returnTo = "/account-home?verified=true"`. Return 503 when B2C is not configured.
- [x] `apps/web/src/pages/(auth)/login/return/index.ts`: in `exchangeCodeForTokens`, accept `media_verification`. After `createOrUpdateUser`, call `updateLastVerifiedDate` for `VERIFIED` users. When `returnTo` already has a query string, append `&lng=cy` rather than `?lng=cy`.
- [x] `apps/web/src/pages/(verified)/account-home`: show a `govukNotificationBanner` when `verified=true`. Add `bannerText` to `en.ts` ("Your account has been verified.") and `cy.ts` ("Mae eich cyfrif wedi cael ei ddilysu.").
- [x] `apps/web/config/custom-environment-variables.json`: map `B2C_POLICY_MEDIA_VERIFICATION`. The default needs no Helm value.

### System Admin delete
- [x] `libs/system-admin-pages/src/user-management/queries.ts`: `deleteUserById` calls `archiveAndDeleteUser(userId, async (id) => deleteB2cUser(await getGraphApiAccessToken(), id))` and throws "User not found" when it returns `false`.

### Azure B2C (`libs/auth`)
- [x] `src/graph-api/client.ts`: harden `getGraphApiAccessToken` so the thrown message holds only the HTTP status and the token endpoint's `error` code, not the response body.
- [x] `src/graph-api/client.ts`: add `deleteB2cUser(accessToken, b2cUserId)`. It sends `DELETE /users/{id}`, treats 404 as success, short-circuits under `MOCK_AZURE_B2C`, and wraps errors, logging the status and code only.
- [x] Export `deleteB2cUser` from `src/index.ts`. Add a `"./graph-api"` subpath export to `package.json` and a `@hmcts/auth/graph-api` path to the root `tsconfig.json`.

### GOV.UK Notify
- [x] `libs/govuk-notify/src/template-ids.ts`: add `GOVUK_NOTIFY_TEMPLATE_ID_MEDIA_ACCOUNT_VERIFICATION` (`1dea6b4b-48b6-4eb1-8b86-7031de5502d9`), `GOVUK_NOTIFY_TEMPLATE_ID_INACTIVE_CFT_SIGN_IN` (`cca7ea18-4e6f-406f-b4d3-9e017cb53ee9`) and `GOVUK_NOTIFY_TEMPLATE_ID_INACTIVE_CRIME_SIGN_IN` (`710a1ea4-226d-4e94-a8f7-5a102bb31612`).

### New lib `libs/inactive-accounts` (`@hmcts/inactive-accounts`)
- [x] Create `package.json` (ESM, `vitest run`, dependencies `@hmcts/account`, `@hmcts/auth`, `@hmcts/govuk-notify`, `@hmcts/postgres-prisma`) and `tsconfig.json`. Add the root `tsconfig.json` path.
- [x] `settings.ts`: write `getInactivitySettings()` with the eight threshold environment variables and PIP's defaults (350/365/90/90/118/132/180/208). Keep AAD and SSO admin values separate. Accept positive integers only, otherwise throw. Also read the required `INACTIVE_ACCOUNTS_START_DATE`: a strict `YYYY-MM-DD` that is a real calendar date, parsed to UTC midnight. Throw if it is missing or invalid.
- [x] `date-boundaries.ts`: write UTC-midnight ranges for exact-day and on-or-before matching (the same as PIP's `CAST(... AS DATE)` comparisons). Add `buildFlooredDateFilter(column, condition, startDate)`, which returns `(col matches T AND col >= S) OR (col < S)`. Include the second branch only when `S` itself matches `T`. A `NULL` column never matches.
- [x] `queries.ts`: the five PIP queries, each built with `buildFlooredDateFilter` (the go-live floor). These are (media notify `=` on `lastVerifiedDate`; media delete `<=`; admin delete with `PI_AAD` non-`VERIFIED` or `SSO` on `lastSignedInDate`; IDAM notify `=`; IDAM delete `<=`). Each uses keyset batches of 100 and selects minimal columns, including `email`, `firstName` and `lastVerifiedDate` for media deletion, which #896 will need.
- [x] `notifications.ts`: `sendMediaVerificationEmail` (`full_name` from `firstName` or "user", `verification_page_link`). `sendIdamSignInNotificationEmail` (template by provenance; `full_name` from first name and surname or "user"; `last_signed_in_date` formatted `dd MMMM yyyy` in UTC; both `cft_sign_in_link` and `crime_sign_in_link`). Links come from `MEDIA_VERIFICATION_PAGE_LINK`, `CFT_SIGN_IN_LINK` and `CRIME_SIGN_IN_LINK`, each defaulting from `CATH_SERVICE_URL`. Reference `inactive-<step>-<userId>`.
- [x] `service.ts`: `processInactiveAccounts()` loads `getInactivitySettings()` before doing any work, then runs PIP's five steps in order. Catch and count failures for each user and continue. The Graph deleter gets its token lazily, once per run. Add a one-line #896 comment in the media deletion step where the deletion email will go. Return the summary of counts.
- [x] `src/index.ts`: export `processInactiveAccounts`.

### No secrets in logs
- [x] In the cron, `inactive-accounts` and `archiveAndDeleteUser`, never log config, `process.env`, connection strings, tokens or raw error objects. Log Notify errors through `extractNotifyError` (status and message), Graph errors as status, code and message, and Prisma errors as code and message. Add user IDs and counts only.
- [x] Note in the PR that `getPropertiesVolumeSecrets` (cloud-native-platform 2.3.0) was checked and only logs paths and error text, never secret values. (Verified locally against 2.3.0 `dist/properties-volume/*.js`; text to paste into the PR description when it is opened.)

### Cron (`apps/crons`)
- [x] `src/inactive-verification.ts`: the default export runs `processInactiveAccounts`, logs counts only, and throws if there were any failures. In `finally`, call `prisma.$disconnect()` and `closeRedisClient()`.
- [x] `package.json`: add `@hmcts/account`, `@hmcts/postgres-prisma`, `@hmcts/inactive-accounts` and `@hmcts/redis`.
- [x] `config/custom-environment-variables.json`: add `redis.url ← REDIS_URL`. `config/development.json`: add `redis://localhost:6380`.
- [x] `helm/values.yaml`: add `CATH_SERVICE_URL` (same as web) and these keyVault secrets: `govuk-notify-api-key`/`GOVUK_NOTIFY_API_KEY`, `managed-redis-url`/`REDIS_URL`, `b2c-tenant-id`/`AZURE_B2C_TENANT_ID`, `b2c-<ENV>-graph-client-id`/`B2C_GRAPH_CLIENT_ID` and `b2c-<ENV>-graph-client-secret`/`B2C_GRAPH_CLIENT_SECRET`. Keep `SCRIPT_NAME: example`.

### Test support and E2E housekeeping
- [x] `libs/test-support/src/test-data-cleanup.ts`: add a `userArchives` step that matches on email or `provenanceUserId` starting with the prefix. Update `CleanupDetails` to match.
- [x] Remove the "empty until #351" comment in `e2e-tests/tests/system-admin/mi-report.spec.ts`.

### Deployment
- [x] Draft `docs/tickets/351/flux-config.md` for hmcts/cnp-flux-config, following #49220 (drafted in flux-config.md; PR to cnp-flux-config pending). Cover:
  - the `cath-inactive-verification-cron` HelmRelease with `SCRIPT_NAME: inactive-verification`, `releaseNameOverride` and `job.backoffLimit: 0`
  - `INACTIVE_ACCOUNTS_START_DATE` per environment, set in the `<env>/00.yaml` and `01.yaml` patches with the same value for both clusters. Use the placeholders `<AAT_GO_LIVE_YYYY-MM-DD>`, `<DEMO_GO_LIVE_YYYY-MM-DD>`, `<PERFTEST_GO_LIVE_YYYY-MM-DD>` and `<PROD_GO_LIVE_YYYY-MM-DD>`, and note that the job fails without it
  - image-repo and image-policy, plus the automation kustomization
  - base kustomization resources for aat, demo, perftest and prod
  - the `00.yaml` (`1 8 1-31/2 * *`) and `01.yaml` (`1 8 2-30/2 * *`) patches
  - the merge order and the conflict note

  Do not open the PR.
- [ ] (Not done: manual post-deploy check on aat; needs the cath-service and cnp-flux-config PRs merged and cluster access.) After deploying to aat, run `kubectl -n cath get cronjob cath-inactive-verification-cron` on both clusters to check each cluster's schedule. Run a manual job once and check the logs contain counts only. Expect that a second manual run on the same day re-sends that day's reminders.

### Quality
- [x] Run `yarn lint:fix`, `yarn test` and the type-check from the root. Everything must be clean. (Lint clean apart from one pre-existing web-core warning; `yarn test` 71/72 with only the known `apps/web/src/app.test.ts` hook-timeout flake, which passes on its own; `tsc --noEmit` clean for every changed workspace.)

## Testing Tasks

- [x] `libs/account/src/user-archive/query.test.ts`: maps the columns, then deletes in order on the same transaction. If the archive insert rejects, nothing is deleted (AC3).
- [x] `libs/account/src/user-archive/service.test.ts`:
  - B2C is deleted only for `PI_AAD` (`it.each` over provenances), before the transaction
  - a B2C error is logged with no PII and the archive and delete still happen
  - a missing user and `P2025` both return `false`
  - other errors are rethrown
- [x] `libs/account/src/repository/query.test.ts`: `updateLastVerifiedDate`, and `createUser` setting `lastVerifiedDate`.
- [x] `libs/system-admin-pages/src/user-management/queries.test.ts`: replace the existing `deleteUserById` tests. It delegates with a deleter that gets a token and calls `deleteB2cUser`, and throws "User not found" on `false`.
- [x] `libs/auth/src/graph-api/client.test.ts`: `deleteB2cUser` sends a DELETE, treats 404 as success, wraps other errors, and makes no call under `MOCK_AZURE_B2C`. When the token request fails, the error message holds the status and `error` code only, not the body.
- [x] `libs/auth/src/config/b2c-config.test.ts`: the `policyMediaVerification` default and override.
- [x] `libs/inactive-accounts/.../settings.test.ts`: PIP defaults (separate AAD and SSO), overrides, invalid thresholds throwing, `INACTIVE_ACCOUNTS_START_DATE` **missing** throws, `INACTIVE_ACCOUNTS_START_DATE` **invalid** (wrong format, impossible date) throws, and a valid value parses to UTC midnight.
- [x] `libs/inactive-accounts/.../date-boundaries.test.ts`: UTC midnights for exact-day and on-or-before, around midnight and in a non-UTC `TZ`. `buildFlooredDateFilter` with the **floor applied** (the start date matches `T`, so the `col < S` branch is present). `buildFlooredDateFilter` with the **floor not applied** (the start date is after `T`, or go-live is more than N days back, so the result matches PIP's unfloored set).
- [x] `libs/inactive-accounts/.../queries.test.ts`: all five PIP conditions (column, `=` versus `<=`, threshold per provenance, `it.each`), each floored with the configured start date, plus keyset pagination.
- [x] `libs/inactive-accounts/.../notifications.test.ts`:
  - media personalisation and the "user" fallback
  - CFT and Crime (`it.each`): template, `full_name`, `last_signed_in_date` as "05 March 2026", both links, link overrides
  - throws when the key or URL is missing
- [x] `libs/inactive-accounts/.../service.test.ts`:
  - five steps in PIP order
  - every deletion goes through `archiveAndDeleteUser` (AC1), with no email for deletions
  - Graph token fetched once, or not at all
  - failures for one user are counted and processing continues; `false` is counted as skipped
  - batches read until empty
- [x] `apps/crons/src/inactive-verification.test.ts`: logs counts with no PII; disconnects Prisma and Redis; throws on failures; passes on errors and still disconnects.
- [x] `apps/crons/src/inactive-verification.test.ts` secret leak test: run with mocked `GOVUK_NOTIFY_API_KEY`, `REDIS_URL`, `B2C_GRAPH_CLIENT_SECRET`, `DATABASE_URL` and Graph token values, and with Notify, Graph and Prisma errors that carry them. Cover the success and failure paths. Assert that no `console.log`, `console.warn` or `console.error` argument contains any of them.
- [x] `apps/crons/helm/values.yaml.test.ts`: the new secret aliases and `CATH_SERVICE_URL` are present.
- [x] `apps/web/src/pages/(auth)/media-verification/index.test.ts`: the redirect URL (policy, redirect URI, locale), the session values, and 503 when B2C is not configured.
- [x] `apps/web/src/pages/(auth)/login/return/index.test.ts`: the `media_verification` provider uses the verification policy, calls `updateLastVerifiedDate` for `VERIFIED` users, and redirects to `/account-home?verified=true` (or `&lng=cy`). The `cath` provider does not update.
- [x] `apps/web/src/pages/(verified)/account-home`: controller test, plus `index.njk.test.ts` for the banner showing or hiding, in English and Welsh, and locale-key parity.
- [x] `libs/test-support/src/routes/test-support/cleanup.test.ts`: prefixed `user_archive` rows are deleted.
- [x] E2E `system-admin/user-management.spec.ts`: extend the delete journey to download the "Deleted accounts" report and assert the deleted `testUserId` row using `exceljs` (AC2).
- [x] E2E `verified-user/account-home.spec.ts`: extend the journey with `/account-home?verified=true`, checking the banner in English and Welsh plus an axe check.
- [x] E2E `sign-in.spec.ts`: assert that `GET /media-verification` returns 302 to B2C with `p=B2C_1_SignInMediaVerification`.
