# #896: Implementation Tasks

## Implementation Tasks

- [x] Create the #896 branch from `feature/351-inactive-accounts-cron` (pull latest first); open the PR with that as its base.
- [~] Get answers to the clarifications in `plan.md`, especially the template ID (1) and failure semantics (3). (deferred: implemented with plan defaults, still open for the PO)
- [x] `libs/govuk-notify/src/template-ids.ts`: add `GOVUK_NOTIFY_TEMPLATE_ID_MEDIA_ACCOUNT_DELETION = "b08a6094-edc4-4d76-beca-f8937b63e879"`. Make sure it is exported from `@hmcts/govuk-notify`.
- [x] `date-boundaries.ts`: add `verificationEmailDate(lastVerifiedDate, verificationEmailDays, startDate)`. It returns the UTC day of `max(lastVerifiedDate, startDate)` plus `verificationEmailDays`.
- [x] `date-boundaries.test.ts`: tests for plan 5.1 (own date, floored to start date, time of day dropped, configured days used).
- [x] `notifications.ts`: add `createMediaAccountLink` to `NotificationSettings` and `getNotificationSettings`. The default is `${serviceUrl()}/create-media-account`, with an optional `CREATE_MEDIA_ACCOUNT_LINK` override.
- [x] `notifications.ts`: rename `SIGN_IN_DATE_FORMAT` to `EMAIL_DATE_FORMAT`.
- [x] `notifications.ts`: add `sendMediaAccountDeletionEmail(settings, user: MediaUserForDeletion, reVerificationEmailDate: Date)`. Personalisation is `full-name` (`firstName || "user"`), `date` (formatted) and `link-to-service`. The reference is `inactive-media-deletion-${userId}`. Do not log anything.
- [x] `notifications.test.ts`: tests for plan 5.2 (payload, "user" fallback, rejects on error).
- [x] `notifications.test.ts`: tests for plan 5.3. Update the existing `getNotificationSettings` and `SETTINGS` fixtures for `createMediaAccountLink`, and cover the default and override.
- [x] `service.ts`: in the `media-deletion` step, replace the `#896` comment and `archiveAndDelete` with a handler. It awaits `sendMediaAccountDeletionEmail(notificationSettings, user, verificationEmailDate(user.lastVerifiedDate, settings.mediaVerificationEmailDays, settings.startDate))`, then returns `archiveAndDelete(user)`. Do not add a `try/catch`.
- [x] `service.test.ts`: add `sendMediaAccountDeletionEmail` to the `./notifications.js` mock, and default it to resolved in `beforeEach`.
- [x] `service.test.ts`: test for plan 5.4 (email sent before deletion, checked with `invocationCallOrder`).
- [x] `service.test.ts`: test for plan 5.5. On email failure the deletion is skipped and the user is counted failed. The next user is still processed. The log has no email address, for both a Notify error and an `EMAIL_RATE_LIMITED` error.
- [x] `service.test.ts`: test for plan 5.6 (`archiveAndDeleteUser` returns false after the email, so the user is counted skipped).
- [x] `service.test.ts`: test for plan 5.7 (no deletion email for admin or IDAM deletions).
- [x] `service.test.ts`: test for plan 5.8 (the date passed is worked out from the settings' start date and verification days).
- [x] Check `apps/crons/src/inactive-verification.test.ts` still passes. Change it only if it fixes the notifications mock shape.
- [x] Run `yarn lint:fix`, `yarn test` (from the root) and the type check for `@hmcts/inactive-accounts` and `@hmcts/govuk-notify`.
- [ ] Manual check on AAT once #351 is deployed: seed a `PI_AAD` `VERIFIED` user with a back-dated `lastVerifiedDate` and your own address, and trigger the cron. Check the email wording, the date and the link, and that the account is deleted.
