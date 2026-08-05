# Tasks — Issue #896: Sending an email for account deletion

## Blockers to resolve first
- [ ] Confirm sequencing with #351 (annual verification job) and that it will call `notifyDeletedAccountHolders`
- [ ] Confirm #351 will stamp `user.verification_email_sent_date` when it sends the re-verification email
- [ ] Confirm whether #894's "deleted accounts" archive table changes the snapshot source (hard delete vs archive)
- [ ] Obtain the GOV.UK Notify template (STG + prod ids) with personalisation keys `full_name`, `verification_email_date`, `create_account_link`
- [ ] Get content sign-off on the subject line and the "Court and Tribunal Hearings" sign-off

## Implementation Tasks

### Schema
- [ ] Add `verificationEmailSentDate DateTime? @map("verification_email_sent_date")` to `model User` in `libs/postgres-prisma/prisma/schema/base.prisma`
- [ ] Run `yarn db:migrate:dev` to generate the migration, then `yarn db:generate`

### Notification lib
- [ ] Add `formatVerificationEmailDate` in `libs/notification/src/verification-date-formatting.ts` (not exported from `index.ts`)
- [ ] Add `TEMPLATE_ID_ACCOUNT_DELETED` and `MEDIA_CREATE_ACCOUNT_LINK` module consts to `libs/notification/src/govuk-notify-service.ts`
- [ ] Add `sendAccountDeletionEmail` with the three configuration guards and the snake_case personalisation contract
- [ ] Add `libs/notification/src/account-deletion-notifier.ts` with `DeletedAccountSnapshot`, `DeletedAccountNotificationResult` and `notifyDeletedAccountHolders`
- [ ] Implement per-snapshot validation (missing email, missing/future verification date) — skip, count `failed`, log `userId` only
- [ ] Implement chunked `Promise.allSettled` batching with `extractNotifyError` aggregation; never throw for a single-user failure
- [ ] Export `sendAccountDeletionEmail`, `notifyDeletedAccountHolders` and both interfaces from `libs/notification/src/index.ts`

### Account lib
- [ ] Add `findAccountDeletionSnapshots(userIds)` to `libs/account/src/repository/query.ts` selecting only `userId`, `email`, `firstName`, `surname`, `verificationEmailSentDate`

### Configuration
- [ ] Add `GOVUK_NOTIFY_TEMPLATE_ID_ACCOUNT_DELETED` and `MEDIA_CREATE_ACCOUNT_LINK` to `apps/web/helm/values.yaml`, `apps/web/helm/values.dev.yaml`, `apps/web/config/default.json`, `apps/web/config/custom-environment-variables.json`
- [ ] Add both env vars plus the `govuk-notify-api-key` → `GOVUK_NOTIFY_API_KEY` key vault secret to `apps/crons/helm/values.yaml`
- [ ] Add `@hmcts/notification`, `@hmcts/account`, `@hmcts/postgres-prisma` workspace deps to `apps/crons/package.json`

### Tests
- [ ] Extend `libs/notification/src/govuk-notify-service.test.ts` — template id, recipient, personalisation, three config-guard throws
- [ ] Test date formatting: single-digit day, double-digit day, 1 January, 31 December
- [ ] Test name building: both parts, first-only, surname-only (no stray spaces), neither → `Dear Sir or Madam`
- [ ] Add `libs/notification/src/account-deletion-notifier.test.ts` — all-succeed, one-rejects-rest-continue, no email, null date, future date, empty array, batch larger than chunk size
- [ ] Assert failure logs contain `userId` and contain neither the email address nor the name
- [ ] Assert one template id is used regardless of any locale hint (guards the no-Welsh decision)
- [ ] Add a test for `findAccountDeletionSnapshots` in `libs/account/src/repository/query.test.ts`
- [ ] Regression: assert `/delete-user-confirm/{userId}` sends no deletion email

### Wire-up
- [ ] Wire `notifyDeletedAccountHolders` into #351's deletion job (snapshot → delete → notify), OR apply the §5.2 fallback cron skeleton if #351 is deferred

### Verify
- [ ] `yarn lint:fix` and `yarn test` clean from the repo root
- [ ] Send a Notify preview and click the create-account link through to `/create-media-account`
