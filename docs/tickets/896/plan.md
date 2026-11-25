# #896: Sending an email for account deletion — Technical Plan

TEMPLATE SOURCE: n/a (no rendered page — this ticket only sends a GOV.UK Notify email)

> **DEPENDENCY: built on top of #351 (PR #1588, branch `feature/351-inactive-accounts-cron`, OPEN).**
> Inactive account management is **not on `master`**: `libs/inactive-accounts` on master holds only stale `dist`/`node_modules`/`.turbo` output, with no source. Everything this ticket changes (`libs/inactive-accounts`, the `media-deletion` step, `lastVerifiedDate`, `GOVUK_NOTIFY_TEMPLATE_ID_MEDIA_ACCOUNT_VERIFICATION`) is added by #351.
> **Base branch: `feature/351-inactive-accounts-cron`.** Branch #896 from it and open the PR against it. Do not merge #896 before #1588.
> Not `feature/918-purge-user-archive` (PR #1578): #896 uses nothing #918 adds (the `user_archive` purge), and #918 is missing #351's `5ca3da3c` (the `INACTIVE_ACCOUNTS_START_DATE` go-live default), which the "(date)" calculation depends on. Keeping #896 directly on #351 lets it merge independently of #918.

## 1. Technical Approach

The #351 cron already deletes media accounts in its `media-deletion` step, and marks the spot for this ticket:

```ts
// libs/inactive-accounts/src/inactive-accounts/service.ts (on #351)
const mediaDeletions = await runStep(
  "media-deletion",
  (after) => findMediaUsersForDeletion(settings, runDate, after),
  // #896: send the media account deletion email here, before archiveAndDelete
  archiveAndDelete
);
```

This ticket adds one Notify email, `sendMediaAccountDeletionEmail`, to `notifications.ts`, next to `sendMediaVerificationEmail`. The step's handler then becomes "send the email, then `archiveAndDeleteUser`". This is the same as PIP's `InactiveAccountManagementService.findAndNotifyMediaAccountsForDeletion`, which calls `publicationService.sendMediaAccountDeletionEmail(...)` and then `accountService.archiveAccount(...)` for each user.

**Which accounts get the email: media (`PI_AAD` + `VERIFIED`) deletions only.** The ticket says accounts deleted "following the annual verification process". In #351 that is only the `media-deletion` step: `findMediaUsersForDeletion` selects `userProvenance = PI_AAD`, `role = VERIFIED`, `lastVerifiedDate` on or before 365 days ago, and those users were sent the 350-day re-verification email. The `admin-deletion` (AAD/SSO admins, 90 days since last sign-in) and `idam-deletion` (CFT/Crime IDAM, 132/208 days since last sign-in) steps delete for inactivity. They never send a re-verification email, so the "(date)" in the email copy would mean nothing for them. They do not get this email, which is also how PIP works. This matches the AC, so it is not listed as an open question.

**Data needed is already selected.** `findMediaUsersForDeletion` returns `MediaUserForDeletion` (`userId`, `email`, `firstName`, `lastVerifiedDate`), and the #351 plan added `lastVerifiedDate` for this purpose. No query or schema change is needed.

### Email content

| Item | Decision |
|---|---|
| Template | Reuse PIP's `INACTIVE_MEDIA_USER_DELETION_EMAIL` `b08a6094-edc4-4d76-beca-f8937b63e879`, added to `libs/govuk-notify/src/template-ids.ts` as `GOVUK_NOTIFY_TEMPLATE_ID_MEDIA_ACCOUNT_DELETION`. CaTH already sends PIP's templates from the shared Notify service (for example `1dea6b4b…` media verification). The template must be confirmed: see clarifications 1 and 2. |
| Personalisation keys | Use PIP's template keys exactly: `full-name`, `date`, `link-to-service` (from `MediaAccountDeletionEmailGenerator`). They are kebab-case, unlike the snake_case `full_name` of the other inactive-account templates. Notify needs keys that match the template, so we do not rename them. The AC's "Dear full_name" is placeholder copy. |
| `full-name` | `user.firstName \|\| GENERIC_USER_NAME` ("user"). This is the same rule as `sendMediaVerificationEmail`: the media user's `firstName` is the B2C `givenName` (see the #351 plan), and PIP also sends the Azure `givenName` with fallback "user". `surname` is not selected and is not needed. |
| `date` | The date the re-verification email was sent (see below), formatted with the existing `en-GB` / `day: "2-digit"` / `month: "long"` / `year: "numeric"` / `timeZone: "UTC"` formatter, for example "05 March 2026". This is the same as PIP's `dd MMMM yyyy`. Rename `SIGN_IN_DATE_FORMAT` to `EMAIL_DATE_FORMAT`, because it is now used for more than the sign-in date. |
| `link-to-service` | `${CATH_SERVICE_URL}/create-media-account`, which is the existing page `apps/web/src/pages/(public)/create-media-account`. It is added to `NotificationSettings` as `createMediaAccountLink`, with an optional `CREATE_MEDIA_ACCOUNT_LINK` override, the same way as the three existing links. This keeps `getNotificationSettings` consistent: with all overrides set, `CATH_SERVICE_URL` is still not required. No Helm change, because `CATH_SERVICE_URL` is already set on the cron by #351. Do not copy the `#` from the URL in the ticket. |
| `reference` | `inactive-media-deletion-${userId}`, following the `inactive-<step>-<userId>` pattern. |
| Welsh | **None.** The AC says no Welsh translation is needed, and the template is English only. There is no page, so there are no `en.ts`/`cy.ts` files. |

### Computing "(date)": the re-verification email date

PIP uses `lastVerifiedDate.plusDays(350)`, with 350 hard-coded. That is wrong for CaTH, for two reasons:

1. **The threshold can be changed.** CaTH reads `MEDIA_ACCOUNT_VERIFICATION_EMAIL_DAYS` (default 350) through `getInactivitySettings()`, so we use `settings.mediaVerificationEmailDays`.
2. **The go-live date sets a minimum.** `findMediaUsersForVerification` matches on the floored date `GREATEST(lastVerifiedDate, startDate)` (`buildFlooredDateFilter` + `exactDayCondition`). A user last verified before `INACTIVE_ACCOUNTS_START_DATE` was sent the email on `startDate + 350`, not on `lastVerifiedDate + 350`. PIP's formula would give a date before the cron existed.

So the date is the UTC day of `max(lastVerifiedDate, startDate)`, plus `mediaVerificationEmailDays` days. This is the same day on which `exactDayCondition(mediaVerificationEmailDays, runDate)` matched the user. Add one exported pure function to `date-boundaries.ts` (reusing `MS_PER_DAY` and the UTC day-start logic):

```ts
export function verificationEmailDate(lastVerifiedDate: Date, verificationEmailDays: number, startDate: Date): Date
```

`service.ts` calls it and passes the `Date` to `sendMediaAccountDeletionEmail(notificationSettings, user, reVerificationEmailDate)`, which formats it. `notifications.ts` does not depend on inactivity settings.

**Known limitation (accepted, flagged in clarification 4).** CaTH does not store when a re-verification email was actually sent. The date is worked out again from current data, so it is wrong if:
- `MEDIA_ACCOUNT_VERIFICATION_EMAIL_DAYS` or `INACTIVE_ACCOUNTS_START_DATE` changed between the reminder and the deletion, or
- the cron missed that day (exact-day matching means no reminder was sent at all), or
- the email failed.

PIP has the same limitation. Fixing it would need a new `verification_email_sent_at` column, which is out of scope (YAGNI).

## 2. Implementation Details

All paths are relative to the repo root, on a branch stacked on `feature/351-inactive-accounts-cron`.

| File | Change |
|---|---|
| `libs/govuk-notify/src/template-ids.ts` | Add `GOVUK_NOTIFY_TEMPLATE_ID_MEDIA_ACCOUNT_DELETION = "b08a6094-edc4-4d76-beca-f8937b63e879"` (export it from `index.ts` if the constants are not re-exported with `*`). |
| `libs/inactive-accounts/src/inactive-accounts/date-boundaries.ts` | Add `verificationEmailDate(...)`. |
| `libs/inactive-accounts/src/inactive-accounts/notifications.ts` | Add `createMediaAccountLink` to `NotificationSettings` and `getNotificationSettings`. Add `sendMediaAccountDeletionEmail(settings, user: MediaUserForDeletion, reVerificationEmailDate: Date)`. Rename `SIGN_IN_DATE_FORMAT` to `EMAIL_DATE_FORMAT`. |
| `libs/inactive-accounts/src/inactive-accounts/service.ts` | Replace the `#896` comment and `archiveAndDelete` handler in the `media-deletion` step with a handler that sends the email, then calls `archiveAndDelete(user)`. Remove the `#896` comment. |
| `*.test.ts` alongside each of the above | See section 5. |

- **No Prisma schema or migration changes.** `lastVerifiedDate`, `email` and `firstName` are already selected by #351.
- No `apps/web` changes, no Nunjucks templates, no locale files.
- No new environment variables are required in Helm. `CREATE_MEDIA_ACCOUNT_LINK` is an optional override only.
- `sendNotifyEmail` (not `sendNotifyEmailWithRetry`) with the default `STANDARD` rate limit, as for the other two inactive-account emails. PIP also uses `EmailLimit.STANDARD` for this template.

## 3. Error Handling & Edge Cases

**Order: email first, then delete.** After `archiveAndDeleteUser` the `user` row (and B2C account) is gone, so the email must be sent before it.

**Email failure: recommend skipping the deletion this run.** If `sendMediaAccountDeletionEmail` throws (Notify 4xx/5xx, `EMAIL_RATE_LIMITED`, Redis error), the error propagates out of the handler. `archiveAndDeleteUser` is not called, `runStep` counts the user as `failed` and logs `{ step, userId, ...describeError(error) }`, and the job exits 1. The account is picked up again on the next run, because `findMediaUsersForDeletion` uses on-or-before (`onOrBeforeCondition`).
- Why: the AC requires an email for every deleted account. Deletion cannot be undone, and after it we no longer have the address to send to, so deleting without the email breaks the AC with no way to recover.
- **This differs from PIP**: PIP's `PublicationService.sendMediaAccountDeletionEmail` catches `WebClientException`, logs it, and deletes anyway.
- **Exception, an invalid address (decided after review):** if Notify rejects the send with 400 `ValidationError` and every error message starts with `email_address`, retrying can never succeed. Keeping the account would hold its personal data past retention and fail the job every run. The handler catches only that case (`isInvalidEmailAddressError` in `@hmcts/govuk-notify`), logs a warning `{ step, userId, status, message }` with no address, and deletes the account. Every other failure still blocks the deletion: other 400s (missing personalisation, team-only key), 403, 5xx, network errors, `EMAIL_RATE_LIMITED` and Redis errors. A blanket "delete on any 4xx", as PIP does, would let a template or key misconfiguration delete every media user without an email.
- Non-prod environments use a Notify test key ("pretends to send messages"). It validates addresses and personalisation like a live key, but has no team guest-list restriction, so the team-only 400 cannot block deletions there.

**Rate limit.** Each user gets at most one email per run from this step. The verification email went out about 15 days earlier, so with `STANDARD` capacity (10 per 30 minutes per recipient) the limit only trips if the same address got other CaTH emails at the same moment. In that case it is a normal failure and is retried next run, as above.

**Account already gone or concurrently deleted.** `archiveAndDeleteUser` returns `false` (counted `skipped`) if the user vanished between the batch query and the call. For example, a system admin deleted it, or the record was already archived (P2025). With email-first ordering, that user has already been emailed.
- The window is one user's Notify call, milliseconds long. Cron runs alternate days between clusters and `concurrencyPolicy: Forbid` + `backoffLimit: 0` stop parallel cron runs, so the only race is with a manual admin deletion.
- The email is still true in substance: the account is deleted.
- Accept and document this. Do not add a pre-check: `archiveAndDeleteUser` already looks the user up, and a second lookup would not close the race.

**User re-verifies during the run.** The same millisecond window applies, and PIP has the same race. Accept it.

**Missing `firstName`.** Send "user", as the verification email does.

**Logging.** Never log email addresses, names or personalisation. Errors go only through `runStep`'s `describeError`, which drops raw Notify errors (they carry the API key) and the masked email in rate-limit messages. Do not add new `console.*` calls in `notifications.ts`.

**Duplicate emails.** A user is deleted at most once. If the email succeeds but the deletion fails (DB error), the next run sends the email again before trying the deletion again. That is rare and acceptable, and is better than deleting without notice.

## 4. Acceptance Criteria Mapping

| AC | How it is met | Verified by |
|---|---|---|
| Email generated on GOV.UK Notify and sent immediately to owners of every account deleted following annual verification | `sendMediaAccountDeletionEmail` is called for every user in the `media-deletion` step, straight before `archiveAndDeleteUser`. A send failure blocks that deletion, except an address Notify rejects as invalid (it can never be emailed), which is deleted with a warning. | service tests 5.4–5.7, notifications tests 5.2–5.3 |
| No Welsh translation required | English-only Notify template; no locale files | n/a |
| Email content (Dear full_name / re-verification email sent on (date) / create-account link) | Template `b08a6094…` with `full-name`, `date` (worked out as in section 1, formatted "dd MMMM yyyy"), `link-to-service` = `<service>/create-media-account`. The wording itself is in the Notify template. | notifications tests 5.2–5.3, date tests 5.1; template body checked in Notify (clarification 2) |
| Ticket comment: "check if inactive account management is in the code" | Checked: it is not on `master`; it is in PR #1588 (#351). This ticket is stacked on it. | dependency note at top |

## 5. Test Scenarios

Unit tests only, Vitest, AAA comments, co-located with the code.

**No E2E test.**
- This runs from a cron job (`apps/crons`), not the web app. There is no page or user journey.
- E2E would need the job to run against seeded users with back-dated `lastVerifiedDate`, and a real Notify delivery that Playwright cannot check.
- #351 adds no E2E for its cron emails either. Unit tests at the service and notification level give full coverage.

**5.1 `date-boundaries.test.ts`: `verificationEmailDate`**
- Returns `lastVerifiedDate` UTC day + `verificationEmailDays` when `lastVerifiedDate` is on or after `startDate`.
- Returns `startDate` + `verificationEmailDays` when `lastVerifiedDate` is before `startDate`.
- Drops the time of day: a `lastVerifiedDate` of 23:59 UTC gives the same day as 00:00 UTC.
- Uses the configured days (for example 10), not a hard-coded 350.

**5.2 `notifications.test.ts`: `sendMediaAccountDeletionEmail`**
- Calls `sendNotifyEmail` with `GOVUK_NOTIFY_TEMPLATE_ID_MEDIA_ACCOUNT_DELETION`, `emailAddress: user.email`, personalisation `{ "full-name": firstName, date: "05 March 2026", "link-to-service": settings.createMediaAccountLink }`, and `reference: "inactive-media-deletion-<userId>"`.
- Sends "user" as `full-name` when `firstName` is null or empty.
- Passes on errors from `sendNotifyEmail` (rejects).

**5.3 `notifications.test.ts`: `getNotificationSettings`**
- Update the existing tests: `createMediaAccountLink` defaults to `${CATH_SERVICE_URL}/create-media-account` (with trailing slash removed).
- `CREATE_MEDIA_ACCOUNT_LINK` overrides it, and with all overrides set `CATH_SERVICE_URL` is still not required.

**5.4 `service.test.ts`: media-deletion sends the email before deleting**
- For each media deletion user, `sendMediaAccountDeletionEmail` is called with `(NOTIFICATION_SETTINGS, user, expectedDate)` before `archiveAndDeleteUser`. Check the order with `mock.invocationCallOrder`.
- `mediaDeletions.succeeded` is incremented.

**5.5 `service.test.ts`: email failure skips that deletion**
- When `sendMediaAccountDeletionEmail` rejects for one user, `archiveAndDeleteUser` is not called for that user, `mediaDeletions.failed` is 1, and the next user is still emailed and deleted.
- The logged error contains no email address. Cover both a Notify-shaped error and a rate-limit error (`code: EMAIL_RATE_LIMITED`).

**5.6 `service.test.ts`: already-deleted user**
- When `archiveAndDeleteUser` returns `false` after the email is sent, the user is counted `skipped` and the step carries on.

**5.7 `service.test.ts`: no deletion email from other steps**
- `sendMediaAccountDeletionEmail` is never called for users from `findAdminUsersForDeletion` or `findIdamUsersForDeletion`.

**5.8 `service.test.ts`: date passed is worked out from settings**
- With `startDate` after the user's `lastVerifiedDate`, the date passed is `startDate + mediaVerificationEmailDays`. This proves the service uses `verificationEmailDate` with the settings.

## CLARIFICATIONS NEEDED

1. **Template ID.** Confirm that CaTH should reuse PIP's `INACTIVE_MEDIA_USER_DELETION_EMAIL` template `b08a6094-edc4-4d76-beca-f8937b63e879` in the shared Notify service, or say whether a new CaTH template is wanted. Someone with Notify access must confirm the ID exists in the service whose API key the cron uses. If a new template is created, its ID and personalisation keys replace those in this plan, and the CaTH convention would be snake_case (`full_name`, `date`, `link_to_service`).
2. **Template wording.** Check that the Notify template body matches the AC copy word for word, including the "Court and Tribunal Hearings Verified Space" wording and the "Kind regards," sign-off, which has no name after it in the ticket. Check it uses `((full-name))`, `((date))` and `((link-to-service))`. The wording lives in Notify, not in code.
3. ~~**Failure semantics.**~~ Resolved: a failed email blocks the deletion, except for an address Notify rejects as invalid, which is deleted with a warning (see section 3). Original question: this plan recommends that a failed email blocks that account's deletion until a later run succeeds. That is stricter than PIP, which logs the error and deletes anyway. Please confirm. The trade-off: a permanently bad address keeps the account and fails the job every run until someone handles it by hand.
4. **Accuracy of "(date)".** The date is worked out again from `lastVerifiedDate`, the current verification threshold and the go-live date. It is not a stored send date. It is wrong if those settings changed in between or the reminder run was missed. Is that acceptable (PIP has the same limitation), or is a stored `verification_email_sent_at` wanted? That would need a schema change and is out of scope here.
5. ~~**Delivery order with #351.**~~ Resolved: stacked PR with base `feature/351-inactive-accounts-cron` (not #918).
