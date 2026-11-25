# Code Review: Issue #896

Sending an email for account deletion (media accounts deleted by the inactive accounts cron).

Scope: the uncommitted working-tree changes on `feature/896-media-account-deletion-email`, which is stacked on `feature/351-inactive-accounts-cron` (PR #1588). #351 code is only discussed where #896 depends on it.

## Summary

The change adds one GOV.UK Notify email, `sendMediaAccountDeletionEmail`, and sends it in the `media-deletion` step of the #351 cron, before `archiveAndDeleteUser`. Files changed:

- `libs/govuk-notify/src/template-ids.ts`: new `GOVUK_NOTIFY_TEMPLATE_ID_MEDIA_ACCOUNT_DELETION` (re-exported via `export *` in `index.ts:3`).
- `libs/inactive-accounts/src/inactive-accounts/date-boundaries.ts`: new `verificationEmailDate`.
- `libs/inactive-accounts/src/inactive-accounts/notifications.ts`: new `createMediaAccountLink` setting, new send function, and `SIGN_IN_DATE_FORMAT` renamed to `EMAIL_DATE_FORMAT`.
- `libs/inactive-accounts/src/inactive-accounts/service.ts`: the `media-deletion` handler now sends the email and then deletes.
- Tests for each of the above.

The implementation is small, follows the plan exactly, and fits #351's existing patterns. I checked these points against the code:

- **The date matches the selection day.** `findMediaUsersForVerification` (`queries.ts:16`) matches users whose `GREATEST(lastVerifiedDate, startDate)` falls in `[runDay - N, runDay - N + 1)` UTC (`date-boundaries.ts:6-8`, `17-24`). `verificationEmailDate` (`date-boundaries.ts:27-30`) returns the UTC day start of `max(lastVerifiedDate, startDate) + N`. That is the same run day. The floor branch is also correct, because `startDate` is always UTC midnight (`settings.ts:47`). There is no off-by-one. The `>` vs `>=` choice at line 28 makes no difference when the two dates are equal.
- **No timezone issue.** Both the query and the formatter use UTC (`notifications.ts:12`). The flux schedule is `1 8 ...` (`docs/tickets/351/flux-config.md:108,121`), so the UTC day and the UK day are always the same when the email is sent.
- **Settings names and types are correct.** `getInactivitySettings()` exposes `mediaVerificationEmailDays: number` (`settings.ts:2,55`) and `startDate: Date` (`settings.ts:57-59`).
- **Rate limiting.** `sendNotifyEmail` always calls `validateEmailRateLimit(..., "STANDARD")` (`libs/govuk-notify/src/notify-client.ts:29-31`). The bucket is per recipient (`libs/email-rate-limit/src/email-rate-limit.ts:17`) with 10 tokens per 30 minutes. Each user gets at most one deletion email per run. The verification step (exact day N=350) and the deletion step (on or before 365) select different users unless the thresholds are misconfigured. So the limiter cannot block deletion emails across a batch. It can only trip if one address already received many other CaTH emails in the same 30 minutes, and that case is handled as a normal failure.
- **No PII in logs.** `notifications.ts` has no `console.*` calls. Failures are logged only by `runStep` as `{ step, userId, ...describeError(error) }` (`service.ts:86`). `describeError` replaces the rate-limit message, which contains the masked address, with a fixed string (`service.ts:104-106`). For Notify errors it keeps only `status` and Notify's `errors[].message` (`libs/govuk-notify/src/notify-error.ts:11-17`), and Notify does not echo the recipient in those messages. Tests confirm this (`service.test.ts:302-345`).
- **Duplicate emails are possible.** If Notify accepts the email and then `archiveAndDeleteUser` throws a non-P2025 error (`libs/account/src/user-archive/service.ts:20-28`), the user row stays. The next run selects the user again (`onOrBeforeCondition`) and sends the email again. See suggestion 1.

Automated checks I ran:

- `tsc --noEmit` passes for both workspaces, including test files with root `noUncheckedIndexedAccess`.
- `biome check` is clean on both `src` directories.
- `inactive-accounts` tests pass: 89/89.
- `govuk-notify` tests pass: 22/22.
- `apps/crons/src/inactive-verification.test.ts` passes: 7/7.

N/A for this change: there are no pages, Nunjucks templates, SCSS, client JS, Welsh content (the AC says none is required), Prisma schema or migrations. Accessibility, GOV.UK Design System, progressive enhancement, responsive design and E2E categories do not apply. The email body lives in GOV.UK Notify, not in this repository.

## 🚨 CRITICAL Issues

None.

## ⚠️ HIGH PRIORITY Issues

1. ✅ **Resolved with option (a):** `isInvalidEmailAddressError` lets an invalid-address 400 proceed to deletion with a warning; all other failures still block. Non-prod uses a Notify test key, so the team-key concern does not apply. **A permanent Notify rejection blocks that account's deletion forever and keeps the job failing on every run.** (`service.ts:48-52`, `service.ts:84-87`, `apps/crons/src/inactive-verification.ts:10-13`)
   - **What happens:** If `sendMediaAccountDeletionEmail` throws, `archiveAndDelete` is never called and the user is counted `failed`. Because `findMediaUsersForDeletion` uses on-or-before matching (`queries.ts:37`), the same user is selected on every later run. Notify rejects synchronously with a 400 in these cases:
     - `ValidationError` for a malformed `email_address` (Notify does not validate a well-formed but bouncing address up front; that shows up later as an async `permanent-failure`, so it does not block)
     - `BadRequestError` "Can't send to this recipient using a team-only API key" if a non-prod key is a team key
     - `BadRequestError` "Missing personalisation" if template `b08a6094...` does not use exactly `full-name`, `date` and `link-to-service`
     For a malformed address, retrying can never succeed.
   - **Impact:**
     - The account and its personal data are kept past the 365-day retention point with no end date. That defeats the purpose of the deletion and is a storage-limitation (UK GDPR) concern.
     - `inactiveVerification` throws on any `failed > 0`, so the job is red on every daily run. That trains operators to ignore it and hides new failures.
     - There is no runbook for how someone should clear such a user. The log has only the `userId`, which is correct for PII, but someone still has to act on it.
   - **On the merits:** Blocking deletion on a *transient* failure (5xx, network, 429, `EMAIL_RATE_LIMITED`, Redis) is the right call. Deletion cannot be undone and the address is lost afterwards, so a retry next run keeps the AC. Blocking on a *permanent, recipient-specific* rejection gains nothing: the user can never be emailed. Blanket "delete on any 400" would be wrong too, because a template or key misconfiguration would then silently delete every media user without any email. The current loud failure is the right behaviour for that case.
   - **Recommendation:** Choose one of these:
     - (a) Treat only a Notify 400 `ValidationError` whose message refers to `email_address` as "proceed with deletion and log `{ step, userId, status, message }`". Keep everything else blocking. Add one service test per branch.
     - (b) Keep the current behaviour but record it as an accepted risk in `plan.md`, with a written procedure. For example, a System Admin deletes the account from the web app once the `userId` keeps showing in `failed` logs.

   Also confirm the Notify key type the cron uses in AAT/STG. With a team key, every media deletion outside the guest list will be blocked.

2. **Acceptance criterion 3 (email content) cannot be verified from the code** (see AC section). The code sends the right three values: `full-name`, `date` and `link-to-service` (`notifications.ts:62-67`). But the wording, the "Kind regards," sign-off, the link text, and whether template `b08a6094-edc4-4d76-beca-f8937b63e879` really uses those three keys are all held in Notify. Two pieces of evidence are missing:
   - confirmation against the Notify template (plan clarifications 1 and 2)
   - the manual AAT send check, which is still unticked in `tasks.md`

   **Recommendation:** Before merging, have someone with Notify access confirm the template body and placeholders. Then do the AAT check: seed a user with a back-dated `lastVerifiedDate`, run the cron, and check the received email.

## 💡 SUGGESTIONS

1. **Repeat "your account has been deleted" emails when the delete keeps failing** (`service.ts:50-51`, `libs/account/src/user-archive/service.ts:20-28`).
   - **What happens:** Notify accepts the email, then `archiveAndDeleteUserRecord` throws a non-P2025 error (DB/FK/connection). The account is not deleted and is emailed again on the next run. The runs cover every calendar day (flux 00/01 schedules), so a persistent DB fault means a daily false "deleted" email to the same person.
   - **Timeout case:** A Notify timeout after Notify has accepted the email has the same effect. The `reference` field is not an idempotency key.
   - The plan accepts this as rare (plan section 3, "Duplicate emails"), and I agree it is preferable to deleting without notice.
   - **Approach:** If you want a cheap guard, the `step=media-deletion` failure count already shows the problem in logs. Document in the runbook that repeated `media-deletion` failures with a Prisma code mean users are being re-emailed. No code change is needed unless this happens in practice.

2. **Email says "deleted, create a new account" while the B2C account still exists.** With `MOCK_AZURE_B2C: "true"` on the crons chart (`apps/crons/helm/values.yaml:15-16`, commit `315c993a`, tracked in #1587), the CaTH row is deleted but the Azure B2C identity is kept. A user who follows `link-to-service` and applies again may hit an existing-identity conflict when their new media account is approved.
   - **Approach:** Make sure the release of #896's email lines up with #1587 (B2C deletion turned on). Otherwise, note in the #1587 release checklist that deletion emails sent before then refer to accounts whose B2C identity still exists.

3. **The cross-check test only covers the non-floored branch** (`date-boundaries.test.ts:197-206`).
   - The test checks `verificationEmailDate` against `exactDayCondition` directly. It does not go through `buildFlooredDateFilter`, and it does not cover a user last verified before `startDate`. In that case selection depends on the `{ lastVerifiedDate: { lt: startDate } }` branch being included because `startDate` falls inside the condition.
   - It also uses `condition.gte as Date`.
   - **Approach:** Add a second case with `lastVerifiedDate < startDate` that asserts `isWithinCondition`-equivalent behaviour on `startDate`. Or assert `expect(condition.gte).toEqual(<UTC day start of lastVerifiedDate>)`, which removes the `as` cast and makes failures easier to read.

4. **Production link host.** `createMediaAccountLink` defaults to `${CATH_SERVICE_URL}/create-media-account` (`notifications.ts:25`), and `CATH_SERVICE_URL` is `https://cath.{{ env }}.platform.hmcts.net` in both charts. The AC's link is `https://www.court-tribunal-hearings.service.gov.uk/create-media-account`. There is no prod deployment yet, and this is the same pattern as the three #351 links. When prod is introduced, make sure `CATH_SERVICE_URL` (or `CREATE_MEDIA_ACCOUNT_LINK`) points at the public GOV.UK domain.

5. **Minor (pre-existing, #351):** `libs/inactive-accounts/package.json` has no `vitest` dev dependency, so `yarn vitest run --coverage` in that workspace fails with "Couldn't find a script named vitest". Coverage had to be run with `../../node_modules/.bin/vitest`. `yarn test` from the root is unaffected. This is not caused by #896, but worth fixing on #351.

## ✅ Positive Feedback

- **Ordering is correct and tested.** The email is sent before the delete, because the address is gone afterwards. `service.test.ts:282-300` checks the order with `mock.invocationCallOrder` across two users, which proves the sends and deletes alternate per user rather than all emails going out first.
- **The date is correct for CaTH.** It uses the configurable `mediaVerificationEmailDays` and the go-live floor, rather than PIP's hard-coded `+350`. The helper is a small pure function next to the logic it mirrors, reusing `utcDayStart`.
- **The scope is right.** Only `PI_AAD` + `VERIFIED` deletions get the email. Admin and IDAM deletions do not, and a test proves it (`service.test.ts:361-373`).
- **PII handling is well tested.** The tests use the real `validateEmailRateLimit` to produce the rate-limit error and assert that no `@` appears anywhere in the logged calls (`service.test.ts:325-345`).
- **CLAUDE.md rules are followed.**
  - Comments explain why, not what: `service.ts:47`, `notifications.ts:57`, `date-boundaries.ts:26`.
  - No function is exported only for tests: `verificationEmailDate` is used by `service.ts`.
  - Module ordering is kept: consts, then exports, then private helpers, then interfaces.
  - No `try/catch` was added; it relies on `runStep`.
  - Relative imports use `.js` extensions.
  - Test fixtures use string names and no numeric IDs.
- **Settings stay consistent.** `getNotificationSettings` still works with all overrides set and no `CATH_SERVICE_URL`. `createMediaAccountLink` follows the same default-plus-override pattern as the other links.

## Test Coverage Assessment

- **Unit tests:** Good.
  - `date-boundaries.test.ts:147-207` (5 tests): own date, floored date, time of day dropped, configured days, cross-check with `exactDayCondition`.
  - `notifications.test.ts:124-156`: exact payload including template ID, kebab-case keys, `"05 March 2026"` format, reference, the `"user"` fallback for `null` and `""`, and that errors are passed on. Also `getNotificationSettings` default and override for `createMediaAccountLink` (`notifications.test.ts:56,77`).
  - `service.test.ts:281-391` (6 tests): order, failure blocks deletion and the step carries on, rate-limit failure with no address logged, `false` counted as skipped, no email from other steps, date worked out from settings.
  - All tests follow AAA and the assertions are specific. The gap is suggestion 3.
- **E2E:** None. This is justified: it is a cron-only Notify email with no page or user journey, and #351 adds no cron E2E either. The manual AAT check in `tasks.md` stands in for it and is still outstanding.
- **Accessibility:** N/A. No rendered UI.
- **Statement coverage per changed workspace:**

| Workspace | Statements | Branches | Notes |
|---|---|---|---|
| `@hmcts/inactive-accounts` | **100%** (117/117) | 98.46% (64/65) | Uncovered branch at `service.ts:109` is a #351 Prisma-message fallback, not #896 code |
| `@hmcts/govuk-notify` | **100%** (25/25) | 100% (19/19) | `template-ids.ts` holds only constant exports. The v8 report counts no statements in it, so it does not lower the figure. All measured statements are covered |

Both workspaces are at or above the 80% threshold.

## Acceptance Criteria Verification

- [x] **"An email notification is generated on GovNotify and sent out immediately to the owners of every CaTH account that is deleted following the annual verification process."**
  - `service.ts:44-53` sends `sendMediaAccountDeletionEmail` for every user in the `media-deletion` step, straight before `archiveAndDelete`. A failed send blocks that deletion (`service.ts:84-87`), so no account in this step is deleted without the email being accepted by Notify.
  - The step selects `PI_AAD` + `VERIFIED` users by `lastVerifiedDate` (`queries.ts:35-40`, `79-81`), which is the annual verification population.
  - Notify call: `notifications.ts:58-70`.
  - Tests: `service.test.ts:282-300`, `302-323`, `361-373`; `notifications.test.ts:127-139`.
- [x] **"No Welsh translation required"**
  - English-only template and no locale files added. `notifications.ts:58-70` sends a single template with no language branch.
- [~] **"Email content should read as follows: Dear full_name, / As part of our annual account verification process, a re-verification email was sent to you on (date). / ... your account has now been deleted. / ... create a new account ... [Create a Court and Tribunal Hearings account] (https://www.court-tribunal-hearings.service.gov.uk/create-media-account#) / Kind regards,"**
  - Met in code:
    - full name: `notifications.ts:63` (`firstName || "user"`)
    - (date): `date-boundaries.ts:27-30` and `notifications.ts:65`, as a `dd MMMM yyyy` UTC date matching the reminder send day (`date-boundaries.test.ts:197-206`, `service.test.ts:375-391`)
    - create-account link: `notifications.ts:25,66`, pointing at the existing `apps/web/src/pages/(public)/create-media-account`
  - Missing: the wording itself is in Notify template `b08a6094-edc4-4d76-beca-f8937b63e879` (`libs/govuk-notify/src/template-ids.ts:18`). There is no evidence in the repo that the template exists in the cron's Notify service, that it matches the AC copy, or that it uses `((full-name))`, `((date))` and `((link-to-service))`. The manual AAT check in `docs/tickets/896/tasks.md` is unticked.
- [x] **Ticket comment: "Check if inactive account management is in the code before this ticket is implemented."**
  - Checked and recorded in `docs/tickets/896/plan.md` (dependency note at the top). The branch is stacked on #351 / PR #1588, and #896 uses the `media-deletion` step and `lastVerifiedDate` from it (`service.ts:44-53`, `queries.ts:38`).

## Next Steps

- [ ] Resolve HIGH 1: either let a deletion go ahead after a recipient-specific Notify `ValidationError` (with tests), or record the accepted risk and the manual clean-up procedure in `plan.md`.
- [ ] Confirm the Notify API key type the cron uses in AAT/STG. A team key will block media deletions.
- [ ] Resolve HIGH 2: confirm in Notify that template `b08a6094...` matches the AC copy and uses `full-name`, `date` and `link-to-service`. Then do the manual AAT check from `tasks.md`.
- [ ] Optional: add the floored-branch cross-check test (suggestion 3).
- [ ] Line up the release with #1587 (suggestion 2). Check the prod `CATH_SERVICE_URL` when prod is introduced (suggestion 4).
- [ ] Do not merge before PR #1588.

## Overall Assessment

**NEEDS CHANGES**

The code is correct, small and well tested: 100% statements in both workspaces, the date logic verified against the query, and no PII in logs. Two things stop approval:

- One acceptance criterion is only partly evidenced, because the email copy lives in Notify and has not been confirmed.
- The "failed email blocks deletion" behaviour needs either a narrow exception for permanently invalid addresses or a documented, accepted operational procedure.

Neither needs more than a small change or a confirmation.
