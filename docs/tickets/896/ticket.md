# #896: Sending an email for account deletion

**State:** OPEN
**Assignees:** None
**Author:** OgechiOkelu
**Labels:** None
**Created:** 2026-07-28T13:45:49Z
**Updated:** 2026-08-05T14:31:22Z

## Description

**PROBLEM STATEMENT**

During the annual verification process, CaTH account holders are sent an email to re-verify their accounts. Where a CaTH account is not verified within the allocated verification time, the account is deleted. However, the account holder is not informed that their CaTH account has been deleted. This ticket is raised to implement the generation and sending of an email notification to the owners of every CaTH account that is deleted following the annual verification process.

 

**AS A** service
**I WANT** to send an email notification to the owners of every CaTH account that is deleted following the annual verification process.
**SO THAT** these users are aware that their accounts have been deleted

 


**ACCEPTANCE CRITERIA**
- An email notification is generated on GovNotify and sent out immediately to the owners of every CaTH account that is deleted following the annual verification process.
- No Welsh translation required
- Email content should read as follows:

Dear full_name,

As part of our annual account verification process, a re-verification email was sent to you on (date).

As the re-verification process was not completed within the required timeframe, your account has now been deleted.

If you wish to continue accessing the Court and Tribunal Hearings Verified Space, you will need to create a new account. You can do so by following the link below:

[Create a Court and Tribunal Hearings account]  [Court and tribunal hearings - Create a Court and tribunal hearings account - Court and Tribunal Hearings - GOV.UK](https://www.court-tribunal-hearings.service.gov.uk/create-media-account#)

 

Kind regards,

## Comments

### Comment by OgechiOkelu on 2026-08-05T13:34:00Z

@spec 

### Comment by hmctsclaudecode on 2026-08-05T13:40:26Z

# Technical Specification — Issue #896: Sending an email for account deletion

## 1. User Story

**As a** service (CaTH)
**I want to** send an email notification to the owner of every CaTH media account that is deleted as a result of the annual account verification process
**So that** those users know their account no longer exists and can create a new one if they still need access to the Verified Space

## 2. Background

CaTH media (Verified) accounts are subject to an annual re-verification cycle. A re-verification email is sent to the account holder; if they do not complete re-verification inside the allowed window, the account is deleted. Today deletion is silent — the user finds out only when they next try to sign in and fail.

### Current state in this codebase (verified, not assumed)

| Capability | Status | Location |
|---|---|---|
| GOV.UK Notify email sending for account lifecycle events | **Exists** | `libs/notification/src/govuk-notify-service.ts` — `sendMediaNewAccountEmail`, `sendMediaDuplicateAccountEmail`, `sendMediaRejectionEmail` |
| Notify error extraction helper | **Exists** | `extractNotifyError` in the same file |
| Hard delete of a user + their subscriptions and notification audit logs | **Exists** | `deleteUserById` in `libs/system-admin-pages/src/user-management/queries.ts` (transactional) |
| Manual (system admin) user deletion journey | **Exists** | `apps/web/src/pages/(system-admin)/delete-user-confirm/[userId]/index.ts`, audited via `AuditLogAction.DELETE_USER` |
| Cron runner harness | **Exists** | `apps/crons` — `SCRIPT_NAME` env var selects `apps/crons/src/<name>.ts` default export |
| **Annual verification: re-verification email** | **Does not exist** | No code path sends one; no template ID configured |
| **Annual verification: deletion of unverified accounts** | **Does not exist** | No cron script, no scheduled job |
| **A record of when the re-verification email was sent** | **Does not exist** | `User` model (`libs/postgres-prisma/prisma/schema/base.prisma:48`) has only `createdDate` and `lastSignedInDate` |

### Consequence for scope

The email content requires the date the re-verification email was sent ("a re-verification email was sent to you on (date)"). That date is **not persisted anywhere today**, and the process that would send it does not exist. This ticket therefore delivers:

1. The Notify send function and its content/personalisation contract (the substance of the AC).
2. The `user.verification_email_sent_date` column needed to populate the date, plus the reusable service that reads name/email/date **before** the row is deleted.
3. Wiring into the deletion routine, behind the assumption that the verification job (upstream ticket) calls it.

The verification job itself, its schedule, and the re-verification email are **out of scope** and must be tracked separately — see §14.

Reference: `CLAUDE.md` (module structure, naming, Welsh policy), `.claude/rules/design.md` (GDS content standards), `.claude/rules/testing.md` (AAA test pattern).

## 3. Acceptance Criteria

* **Scenario:** Account deleted after failed re-verification — email sent
    * **Given** a Verified media account holder was sent a re-verification email on 1 June 2026
    * **And** they did not complete re-verification within the required timeframe
    * **When** the annual verification process deletes their account
    * **Then** a GOV.UK Notify email is generated and sent immediately to the email address held on the account
    * **And** the email is addressed to the account holder's full name
    * **And** the email states the re-verification email was sent on 1 June 2026
    * **And** the email contains a link to create a new Court and Tribunal Hearings account

* **Scenario:** Personalisation captured before the row is deleted
    * **Given** the deletion routine hard-deletes the `user` row
    * **When** the deletion email is prepared
    * **Then** the full name, email address and re-verification send date are read from the record **before** deletion occurs
    * **And** no email is attempted with an empty recipient address

* **Scenario:** Notify failure does not roll back or block deletion
    * **Given** GOV.UK Notify returns an error (rate limit, 4xx, network timeout)
    * **When** the deletion email send fails for one user
    * **Then** the deletion is not reverted
    * **And** the failure is logged with the Notify status and message and the affected user id
    * **And** processing continues for the remaining users in the batch

* **Scenario:** Multiple deletions in one run
    * **Given** 250 accounts are deleted in a single verification run
    * **When** the process completes
    * **Then** exactly 250 emails are requested (one per deleted account)
    * **And** the run returns a count of sent and failed sends

* **Scenario:** Manual system-admin deletion is unaffected
    * **Given** a system admin deletes a user via `/delete-user-confirm/{userId}`
    * **When** the deletion completes
    * **Then** no account-deletion email is sent (this email is specific to the annual verification process)

* **Scenario:** Missing name data
    * **Given** a deleted account has `firstName` and `surname` both null
    * **When** the email is generated
    * **Then** the greeting falls back to a neutral salutation rather than sending "Dear null"

* **Scenario:** No Welsh version
    * **Given** the AC states no Welsh translation is required
    * **When** the email is sent
    * **Then** a single English template is used regardless of the user's previous language preference

## 4. User Journey Flow

There is no interactive UI in this ticket. The journey is system-initiated.

```
┌──────────────────────────────────────────────────────────────────────┐
│ ANNUAL VERIFICATION CYCLE (upstream — not in this ticket)            │
└──────────────────────────────────────────────────────────────────────┘

  [cron] verification job runs
        │
        ├─► selects Verified accounts due for re-verification
        │
        ├─► sends re-verification email (OUT OF SCOPE)
        │   └─► stamps user.verification_email_sent_date = now()   ◄── THIS TICKET adds the column
        │
        │        ... allowed window elapses ...
        │
        ├─► selects accounts where window expired and not re-verified
        │
        │   ┌──────────────────────────────────────────────────────┐
        │   │ FOR EACH expiring account  (THIS TICKET)             │
        │   ├──────────────────────────────────────────────────────┤
        │   │ 1. read { email, firstName, surname,                 │
        │   │           verificationEmailSentDate }                │
        │   │ 2. deleteUserById(userId)          ← existing tx     │
        │   │ 3. sendAccountDeletionEmail({...}) ← NEW             │
        │   │    ├─ success → log + count sent                     │
        │   │    └─ failure → log Notify status/message, count     │
        │   │                 failed, CONTINUE                     │
        │   └──────────────────────────────────────────────────────┘
        │
        └─► job logs summary: { deleted, sent, failed }

┌──────────────────────────────────────────────────────────────────────┐
│ USER SIDE                                                            │
└──────────────────────────────────────────────────────────────────────┘

  User receives "your account has been deleted" email
        │
        ├─► reads it, takes no action ──────────────► end
        │
        └─► clicks "Create a Court and Tribunal Hearings account"
                  │
                  └─► GET /create-media-account  (existing page)
                        └─► submits application
                              └─► existing admin approval journey
                                    └─► new account created
```

**Ordering decision: delete first, then email.** The alternative (email first, then delete) risks telling a user their account is gone when the transactional delete subsequently fails. Deleting first means a Notify outage produces an uninformed user — recoverable by a reconciliation report — whereas the reverse produces a factually wrong email, which is worse. The personalisation snapshot is taken before the delete so the data is still available.

## 5. Low Fidelity Wireframe

The only user-facing artefact is the email. This is a Notify template, not a page.

```
╔══════════════════════════════════════════════════════════════════════╗
║  From:    Court and Tribunal Hearings <notify@…gov.uk>               ║
║  To:      ((email address — Notify recipient))                       ║
║  Subject: Your Court and Tribunal Hearings account has been deleted  ║
╠══════════════════════════════════════════════════════════════════════╣
║                                                                      ║
║  Dear ((full_name)),                                                 ║
║                                                                      ║
║  As part of our annual account verification process, a               ║
║  re-verification email was sent to you on                            ║
║  ((verification_email_date)).                                        ║
║                                                                      ║
║  As the re-verification process was not completed within the         ║
║  required timeframe, your account has now been deleted.              ║
║                                                                      ║
║  If you wish to continue accessing the Court and Tribunal            ║
║  Hearings Verified Space, you will need to create a new              ║
║  account. You can do so by following the link below:                 ║
║                                                                      ║
║  Create a Court and Tribunal Hearings account                        ║
║  ──────────────────────────────────────────────                      ║
║  ((create_account_link))                                             ║
║                                                                      ║
║  Kind regards,                                                       ║
║                                                                      ║
║  Court and Tribunal Hearings                                         ║
║                                                                      ║
╚══════════════════════════════════════════════════════════════════════╝

((…)) = GOV.UK Notify personalisation placeholder
```

Notify markdown for the link block (Notify renders bare URLs as links; do not attempt HTML anchors):

```
[Create a Court and Tribunal Hearings account](((create_account_link)))
```

If the Notify editor's link syntax with a personalised URL proves brittle in the target Notify service, fall back to a literal URL on its own line preceded by the link text — Notify auto-links bare URLs, and this is what the existing `sendMediaNewAccountEmail` template does with `forgot password process link`.

## 6. Page Specifications

No new web page. The specification below covers the modules, data and configuration changes.

### 6.1 New Notify send function — `libs/notification`

Add to `libs/notification/src/govuk-notify-service.ts`, following the existing function shape exactly (module-level env consts, explicit guard clauses, `notifyClient.sendEmail`, `reference` string):

```typescript
const TEMPLATE_ID_ACCOUNT_DELETED = process.env.GOVUK_NOTIFY_TEMPLATE_ID_ACCOUNT_DELETED;
const MEDIA_CREATE_ACCOUNT_LINK = process.env.MEDIA_CREATE_ACCOUNT_LINK;

interface AccountDeletionEmailData {
  email: string;
  fullName: string;
  verificationEmailDate: Date;
}

export async function sendAccountDeletionEmail(data: AccountDeletionEmailData): Promise<void> {
  // guards: GOVUK_NOTIFY_API_KEY, TEMPLATE_ID_ACCOUNT_DELETED, MEDIA_CREATE_ACCOUNT_LINK
  // personalisation: full_name, verification_email_date, create_account_link
  // reference: `account-deleted-${Date.now()}`
}
```

Export it from `libs/notification/src/index.ts` alongside the existing three send functions.

**Personalisation contract** (keys must match the Notify template exactly; use snake_case as `sendMediaNewAccountEmail` does — the space-separated keys used by the older templates are a legacy inconsistency, do not copy them):

| Key | Type | Source | Example |
|---|---|---|---|
| `full_name` | string | `firstName + " " + surname`, trimmed; fallback per §9 | `Jane Smith` |
| `verification_email_date` | string | `user.verificationEmailSentDate` formatted `D MMMM YYYY` | `1 June 2026` |
| `create_account_link` | string | `MEDIA_CREATE_ACCOUNT_LINK` env var | `https://www.court-tribunal-hearings.service.gov.uk/create-media-account` |

### 6.2 Date formatting

`formatPublicationDate` in `libs/notifications/src/govnotify/template-config.ts` already produces the required `D MMMM YYYY` shape but is not exported from that package's public API and lives in the *subscriptions* notification lib (`@hmcts/notifications`, plural) — a different package from `@hmcts/notification` (singular). Do not add a cross-package dependency for one helper.

Add a small local formatter in `libs/notification/src/verification-date-formatting.ts`:

```typescript
export function formatVerificationEmailDate(date: Date): string { /* "1 June 2026" */ }
```

It is not exported from `index.ts` (per CLAUDE.md: do not export functions purely to test them) — it is covered through `sendAccountDeletionEmail` tests. If a second consumer appears, promote it then.

### 6.3 Schema change — record when the re-verification email was sent

`libs/postgres-prisma/prisma/schema/base.prisma`, `model User`:

```prisma
verificationEmailSentDate DateTime? @map("verification_email_sent_date")
```

Nullable, because every existing row predates the field. Run `yarn db:migrate:dev` to generate the migration, then `yarn db:generate`.

The upstream verification job stamps this when it sends the re-verification email. This ticket only reads it.

### 6.4 Deletion-with-notification service

Put the orchestration in `libs/account`, which owns account lifecycle logic, rather than in `libs/system-admin-pages` (that lib is the admin UI's backing logic and pulling a Notify dependency into it would be a layering regression).

New file `libs/account/src/verification/deletion-notification-service.ts`:

```typescript
export interface DeletedAccountNotificationResult {
  attempted: number;
  sent: number;
  failed: number;
  errors: string[];
}

// Reads personalisation, deletes, then emails. Never throws for a single-user
// Notify failure; aggregates into the result.
export async function deleteAccountsAndNotify(userIds: string[]): Promise<DeletedAccountNotificationResult>;
```

Implementation notes:

- Fetch the users up front in one query (`userId`, `email`, `firstName`, `surname`, `verificationEmailSentDate`).
- Reuse the existing transactional `deleteUserById` — do not write a second delete path. `libs/account` will need `@hmcts/system-admin-pages` as a dependency for this, which is the wrong direction; **preferred alternative:** move `deleteUserById` into `libs/account/src/repository/query.ts` and re-export it from `@hmcts/system-admin-pages` for the existing admin caller. That keeps the delete primitive with the account domain and avoids a circular-ish dependency. Confirm during implementation that no other consumer breaks (`deleteUserById` currently has exactly one non-test caller).
- Send sequentially or in small chunks (see §6.6), collecting `{status, message}` from `extractNotifyError` on failure.
- Wrap each user's work so one failure cannot abort the batch (`Promise.allSettled` over chunks, matching the aggregation approach in `libs/notifications/src/notification/notification-service.ts`).

Export from `libs/account/src/index.ts`.

### 6.5 Call site

The annual verification job does not exist. Deliver this ticket's integration point as a cron script skeleton so the function is reachable and testable end to end:

`apps/crons/src/delete-unverified-accounts.ts` — default-exported async function that selects accounts whose verification window has expired and calls `deleteAccountsAndNotify`. The selection predicate is owned by the upstream verification ticket; until it lands, gate the script so it is a no-op unless explicitly enabled, and log the count it *would* have processed. Do not add a Flux schedule in this ticket.

`apps/crons` will need `GOVUK_NOTIFY_API_KEY` (Key Vault secret `govuk-notify-api-key`), `GOVUK_NOTIFY_TEMPLATE_ID_ACCOUNT_DELETED` and `MEDIA_CREATE_ACCOUNT_LINK` added to `apps/crons/helm/values.yaml`.

### 6.6 Rate limiting

GOV.UK Notify enforces a per-service sends-per-minute limit. An annual run could delete a large cohort in one pass and burst well past it. Send in chunks with a short pause between chunks (the codebase has no shared throttle helper; a simple chunked loop is sufficient and honest about what it does). `libs/notifications/src/govnotify/govnotify-client.ts` already implements `retryWithBackoff` with `NOTIFICATION_RETRY_ATTEMPTS`/`NOTIFICATION_RETRY_DELAY_MS` — mirror that pattern rather than inventing a new one, or lift it if a second consumer justifies it.

### 6.7 Configuration to add

| Variable | Purpose | Where |
|---|---|---|
| `GOVUK_NOTIFY_TEMPLATE_ID_ACCOUNT_DELETED` | Notify template id | `apps/crons/helm/values.yaml`, `apps/web/helm/values.yaml`, `apps/web/helm/values.dev.yaml`, `apps/web/config/default.json`, `apps/web/config/custom-environment-variables.json` |
| `MEDIA_CREATE_ACCOUNT_LINK` | Absolute URL to `/create-media-account` | same |

`MEDIA_CREATE_ACCOUNT_LINK` is a separate variable rather than `${CATH_SERVICE_URL}/create-media-account` because on STG `CATH_SERVICE_URL` points at `cath-web.<env>.platform.hmcts.net`, and the AC's link is the public production URL. Following the existing `MEDIA_PASSWORD_RESET_LINK` / `MEDIA_SIGN_IN_LINK` precedent keeps environment-specific link targets explicit.

## 7. Content

English only. Per the AC, no Welsh version is required for this email.

### 7.1 Notify template — subject

```
Your Court and Tribunal Hearings account has been deleted
```

The issue does not specify a subject line. This one is factual, front-loads the outcome, and reads correctly in an inbox list, per the GDS content principle of putting the most important information first. **Confirm with the content designer before the Notify template is created** — see §14.

### 7.2 Notify template — body

```
Dear ((full_name)),

As part of our annual account verification process, a re-verification email was sent to you on ((verification_email_date)).

As the re-verification process was not completed within the required timeframe, your account has now been deleted.

If you wish to continue accessing the Court and Tribunal Hearings Verified Space, you will need to create a new account. You can do so by following the link below:

[Create a Court and Tribunal Hearings account](((create_account_link)))

Kind regards,

Court and Tribunal Hearings
```

The body is the issue's copy verbatim, with the raw GOV.UK URL from the issue replaced by the `create_account_link` placeholder so each environment links to its own service. The issue's copy ends at "Kind regards," with no signer; a service sign-off has been added because an unsigned email reads as truncated.

The URL in the issue ends with a `#` fragment (`…/create-media-account#`). Drop it — it serves no purpose and looks like a copy-paste artefact.

### 7.3 Welsh

Not required by the AC. Note that this is an exception to the project-wide rule in `CLAUDE.md` ("Don't skip Welsh translations — required for all user-facing text") and to the Welsh Language Scheme obligations that generally apply to HMCTS correspondence. The exemption is a product decision recorded on the ticket, not a technical one. If it is later reversed, the change is: a second Notify template plus a stored language preference on the account — which does not currently exist on `User`, so reversing this is not free. Flagged in §14.

If a Welsh version is subsequently required, the body would be:

[WELSH TRANSLATION REQUIRED: "Dear full_name, As part of our annual account verification process, a re-verification email was sent to you on (date). As the re-verification process was not completed within the required timeframe, your account has now been deleted. If you wish to continue accessing the Court and Tribunal Hearings Verified Space, you will need to create a new account. You can do so by following the link below: Create a Court and Tribunal Hearings account. Kind regards, Court and Tribunal Hearings"]

## 8. URL

No new routes. Relevant paths:

| Path | Role | Status |
|---|---|---|
| `/create-media-account` | Destination of the email's link (`apps/web/src/pages/(public)/create-media-account/`) | Exists |
| `apps/crons` `SCRIPT_NAME=delete-unverified-accounts` | Cron entry point for the deletion run | New skeleton (§6.5) |
| `/delete-user-confirm/{userId}` | Manual admin deletion — **must not** send this email | Exists, unchanged |

## 9. Validation

Server-side only; there is no user input.

| Rule | Behaviour on breach |
|---|---|
| `GOVUK_NOTIFY_API_KEY` set | Throw at send time with a clear message (matches existing functions) |
| `GOVUK_NOTIFY_TEMPLATE_ID_ACCOUNT_DELETED` set | Throw with a clear message |
| `MEDIA_CREATE_ACCOUNT_LINK` set | Throw with a clear message |
| `email` non-empty | Skip the send, count as failed with reason `No email address`; do not call Notify with an empty recipient |
| `firstName`/`surname` both null or blank | Use fallback greeting name (below) |
| `verificationEmailSentDate` null | Skip the send, count as failed with reason `No verification email date`. Do **not** substitute today's date or the account creation date — the email makes a factual claim about when a message was sent, and guessing it is worse than not sending |
| `verificationEmailSentDate` in the future | Treat as data corruption: skip, log, count as failed |

Name construction mirrors `buildUserName` in `libs/notifications/src/notification/notification-service.ts`: join non-empty `firstName` and `surname` with a space; if the result is empty, fall back. That existing helper falls back to `"User"`, which reads poorly as "Dear User" in formal correspondence — use `"Sir or Madam"` here so the greeting is `Dear Sir or Madam`. Do not reuse `buildUserName` across package boundaries for this.

## 10. Error Messages

No user-facing error messages — the user never sees a screen in this flow. All messages are operator-facing logs. Follow the existing style in `approve.ts` (`console.error` with the extracted Notify status and message).

| Condition | Log |
|---|---|
| Notify send failed for one user | `console.error("Failed to send account deletion email", { userId, status, message })` using `extractNotifyError` |
| Missing email address | `console.error("Skipped account deletion email: no email address", { userId })` |
| Missing verification email date | `console.error("Skipped account deletion email: no verification email date", { userId })` |
| Missing configuration | Thrown `Error`, aborting the run: `"GOV Notify account deletion template ID not configured"` |
| Run summary | `console.log("Account deletion notifications", { attempted, sent, failed })` |

Do not log the email address or the user's name — `CLAUDE.md` security requirements prohibit sensitive data in logs. `userId` is sufficient to trace a failure.

## 11. Navigation

- The email's only link goes to `/create-media-account` on the public service.
- No redirects, no back links, no in-service navigation changes.
- The deleted user's session, if one exists, is not explicitly invalidated by this ticket. Their next sign-in fails at the identity provider or at role resolution because the `user` row is gone. If an active session is found to survive deletion and grant Verified access, that is a separate defect — raise it rather than patching it here.

## 12. Accessibility

WCAG 2.2 AA applies to the email content as correspondence, though most success criteria concern rendered pages.

- **Plain English, short sentences** — the supplied copy already is; do not add jargon.
- **Descriptive link text** — "Create a Court and Tribunal Hearings account" describes its destination out of context, satisfying 2.4.4 Link Purpose. Do not use "click here" or a bare URL as the link text.
- **No colour-only meaning** — Notify templates are plain text/markdown, so this is satisfied by construction.
- **No images, so no alt text needed.**
- **Logical reading order** — greeting, context, outcome, next step, sign-off. Preserved.
- **Screen reader**: Notify emails render as semantic plain text; avoid tables and avoid all-caps.
- **Do not rely on the email alone** to convey account status — a user who misses it should still find a comprehensible failure when signing in. Worth confirming the sign-in failure message is not misleading for a deleted account.

## 13. Test Scenarios

Unit tests (Vitest, co-located, AAA pattern, `NotifyClient` mocked as in `libs/notification/src/govuk-notify-service.test.ts`):

* `sendAccountDeletionEmail` calls Notify with the configured template id, the account's email address, and personalisation containing `full_name`, `verification_email_date` and `create_account_link`.
* `sendAccountDeletionEmail` throws when the Notify API key is not configured.
* `sendAccountDeletionEmail` throws when the account-deleted template id is not configured.
* `sendAccountDeletionEmail` throws when the create-account link is not configured.
* The verification email date is formatted as `D MMMM YYYY` (assert a single-digit day, a double-digit day, and a January/December boundary date to catch month-index errors).
* Full name is built from first name and surname; surname-only and first-name-only cases produce no leading or trailing space.
* Both name parts null produces the `Dear Sir or Madam` fallback greeting rather than "null".
* `deleteAccountsAndNotify` reads personalisation before deletion and still sends correctly after the row is gone (assert the query is issued before the delete).
* `deleteAccountsAndNotify` returns `sent: n, failed: 0` when all sends succeed.
* `deleteAccountsAndNotify` continues processing remaining users when one Notify send rejects, and reports `failed: 1` with the Notify status and message in `errors`.
* `deleteAccountsAndNotify` does not revert the deletion when the email send fails.
* An account with no email address is skipped and counted as failed, and Notify is never called for it.
* An account with a null `verificationEmailSentDate` is skipped and counted as failed, and no date is fabricated.
* Logged failure output contains the user id and contains neither the email address nor the name.
* Locale/language preference has no effect — one template is used in all cases (guards the no-Welsh decision).

Integration/regression:

* The existing system-admin manual deletion journey (`/delete-user-confirm/{userId}`) completes without sending an account-deletion email.
* Moving `deleteUserById` into `libs/account` (if taken, per §6.4) leaves the admin journey's behaviour and its `AuditLogAction.DELETE_USER` audit entry unchanged.
* Prisma migration applies cleanly and `verification_email_sent_date` is nullable on existing rows.

E2E (Playwright): none warranted. There is no user journey to drive — no page renders and the send is asynchronous and server-initiated. Adding an E2E test here would only assert that a mocked Notify client was called, which the unit tests already do, and would contradict the "one test per user journey" rule in `CLAUDE.md`. If the upstream verification job later exposes a test-support endpoint (as `libs/test-support/src/routes/test-support/notifications.ts` does for subscription notifications), an API-level assertion on send records becomes worthwhile then.

## 14. Assumptions & Open Questions

**Blocking dependencies**

* **The annual verification process does not exist in this codebase.** No re-verification email is sent, and no job deletes unverified accounts. This ticket cannot deliver a working end-to-end behaviour on its own. Which ticket delivers the verification job and the re-verification email, and is it ahead of or behind this one? If behind, this ticket ships a dormant function plus a no-op cron skeleton, and the AC ("sent out immediately to the owners of every CaTH account that is deleted") cannot be demonstrated on STG until that lands.
* **The re-verification send date is not stored.** This spec adds `user.verification_email_sent_date`, but only the upstream job can populate it. Confirm the upstream ticket will stamp it, otherwise the column stays null and every send is skipped by the §9 rule.
* **A GOV.UK Notify template must be created** in the CaTH Notify service, and its id supplied per environment. The personalisation keys in §6.1 must match the template exactly or Notify rejects the send with a 400. Who creates it, and can we get STG and prod ids?

**Content questions**

* **Subject line is not specified in the issue.** §7.1 proposes one. Needs content-designer sign-off.
* **Sign-off is not specified** — the issue's copy ends at "Kind regards," with nothing after it. §7.2 adds "Court and Tribunal Hearings". Confirm.
* **The link URL in the issue is the production public URL with a trailing `#`.** Assumed to be a copy-paste artefact and dropped, and assumed to be environment-specific via `MEDIA_CREATE_ACCOUNT_LINK`. Confirm STG should link to the STG service rather than production.
* **"Verified Space"** is used in the copy. Confirm this is the current user-facing term for the signed-in media area; the codebase uses the role name `VERIFIED` and the route group `(verified)`, but that is not necessarily the public label.

**Design decisions to confirm**

* **Delete-then-email ordering** (§4). The alternative risks a factually incorrect email. Confirm the product is comfortable that a Notify outage means some users are deleted without notification, and whether a reconciliation/retry report is wanted.
* **No Welsh** (§7.3). Accepted as stated in the AC, but it conflicts with the project rule in `CLAUDE.md` and with general Welsh Language Scheme expectations for HMCTS correspondence. Has this been cleared? Reversing it later requires a stored language preference on `User`, which does not exist.
* **`deleteUserById` relocation** (§6.4) to keep `libs/account` from depending on `libs/system-admin-pages`. Reasonable but touches an existing admin path; flag if reviewers would rather accept the dependency and defer the move.
* **This email is scoped to verification-driven deletion only.** Manual system-admin deletions stay silent. Confirm that is intended — an admin deleting an account without notifying the holder is arguably the same user need, but it is not what this ticket asks for.

**Operational**

* **Notify rate limits.** An annual cycle could delete a large cohort at once. Chunked sending is specified (§6.6), but the expected cohort size is unknown. What is the realistic upper bound per run?
* **Retention.** Once the row is hard-deleted there is no record that the email was sent, since `notification_audit_log` is keyed to subscriptions and is itself deleted with the user. Is an audit trail required for deletion notifications? If so, it needs a separate table or an `audit_log` entry written before deletion — not currently in scope.
* **Idempotency.** If the job is re-run or a pod restarts mid-batch, already-deleted users are gone from the query, so duplicate emails are unlikely by construction. Worth confirming the upstream job's selection query is re-run-safe rather than assuming it.


### Comment by OgechiOkelu on 2026-08-05T14:31:21Z

@plan 
