# Technical Plan — Issue #896: Sending an email for account deletion

## 0. Summary of scope

Deliver the generation and immediate sending of a GOV.UK Notify email to the holder of every CaTH
media account deleted by the annual re-verification process.

**What this ticket delivers:**

1. `sendAccountDeletionEmail` in `libs/notification` — the Notify send with its personalisation contract.
2. `notifyDeletedAccountHolders` in `libs/notification` — batch orchestration over already-captured
   snapshots, chunked, one failure never aborts the batch.
3. A snapshot query in `libs/account` that reads name / email / re-verification date **before** the
   account row disappears.
4. `user.verification_email_sent_date` — the column the email's date sentence needs.
5. Configuration (`GOVUK_NOTIFY_TEMPLATE_ID_ACCOUNT_DELETED`, `MEDIA_CREATE_ACCOUNT_LINK`).

**What this ticket does NOT deliver** (owned elsewhere — see §6):

- The annual verification job itself, the re-verification email, and the 350/365-day thresholds —
  **issue #351**.
- Archiving deleted accounts for MI reporting — **issue #894** (which itself depends on #628).
- Purging archived deleted accounts after 3 months — **issue #918**.

---

## 1. Technical Approach

### 1.1 Verified current state

Every claim below was checked against the tree, not assumed.

| Capability | Status | Location |
|---|---|---|
| Notify sends for account lifecycle events | Exists | `libs/notification/src/govuk-notify-service.ts` — `sendMediaRejectionEmail`, `sendMediaNewAccountEmail`, `sendMediaDuplicateAccountEmail` |
| Notify error extraction | Exists | `extractNotifyError`, same file |
| Notify unit-test harness (env vars set pre-import, `NotifyClient` class-mocked, dynamic `await import`) | Exists | `libs/notification/src/govuk-notify-service.test.ts` |
| Transactional hard delete of user + subscriptions + notification audit logs | Exists | `deleteUserById` — `libs/system-admin-pages/src/user-management/queries.ts:107` |
| Manual system-admin delete journey | Exists | `apps/web/src/pages/(system-admin)/delete-user-confirm/[userId]/index.ts:105` |
| Cron harness (`SCRIPT_NAME` selects `apps/crons/src/<name>.ts` default export) | Exists | `apps/crons/src/index.ts` |
| Annual verification job / re-verification email | **Does not exist** | no code path; no template id configured |
| Any record of when a re-verification email was sent | **Does not exist** | `model User` (`libs/postgres-prisma/prisma/schema/base.prisma:48`) has only `createdDate` and `lastSignedInDate` |
| "Deleted accounts" archive table | **Does not exist** | required by #894 / #918 |
| `D MMMM YYYY` date formatter | Exists but wrong package | `formatPublicationDate` — `libs/notifications/src/govnotify/template-config.ts:61` (`@hmcts/notifications`, plural — a different package from `@hmcts/notification`, singular) |
| Chunked-retry precedent | Exists | `retryWithBackoff` — `libs/notifications/src/govnotify/govnotify-client.ts:117` |

### 1.2 Architecture decisions

**D1 — `libs/notification` stays free of Prisma; it receives snapshots, it does not query.**

The orchestrator takes an array of plain snapshot objects, so `libs/notification` never gains a
`@hmcts/postgres-prisma` dependency and never becomes coupled to the deletion path. The caller owns
"read, then delete, then notify".

**D2 — Do not relocate `deleteUserById`, and do not call it from `libs/notification`.**

The obvious-looking design (`deleteAccountsAndNotify(userIds)` living in `libs/account` and calling
`deleteUserById`) forces either `libs/account` → `libs/system-admin-pages` (wrong direction: that lib
is the admin UI's backing logic) or a relocation of `deleteUserById` that touches a working admin
journey and its `AuditLogAction.DELETE_USER` audit entry. Neither is needed. Splitting at the
snapshot boundary removes the dependency question entirely and leaves the admin path untouched.

**D3 — Snapshot before delete; send after delete.**

Personalisation is read while the row still exists. The send happens after the delete has committed,
because emailing first risks telling a user their account is gone when the transactional delete then
fails — a factually wrong email is worse than a missing one. A Notify outage therefore produces
silently-deleted users; §5 covers detection.

**D4 — The email is scoped to verification-driven deletion only.**

Manual system-admin deletion via `/delete-user-confirm/{userId}` stays silent. The email's copy
("As the re-verification process was not completed…") is factually false for an admin-initiated
delete, so this must not be wired into `deleteUserById`. Confirmation requested — §6.

**D5 — Add `verification_email_sent_date`; never fabricate the date.**

The email asserts a fact: "a re-verification email was sent to you on (date)". If the column is null
the send is skipped and logged, not guessed. Deriving it from the deletion date minus the threshold
(#351: 350-day email, 365-day delete) would be a fabrication that survives into user correspondence.

**D6 — No dormant cron script.**

The spec comment on the issue proposes shipping `apps/crons/src/delete-unverified-accounts.ts` as a
gated no-op. That is dead code whose selection predicate belongs to #351, and it duplicates the job
#351 will create. Default plan: ship the notifier and wire it into #351's job. Fallback if #351 is
not landing in this or the next sprint: §4.6.

---

## 2. Implementation Details

**TEMPLATE SOURCE: n/a** — no rendered page or list-type view. The only user-facing artefact is a
GOV.UK Notify template, authored in the Notify service, not a `.njk` file.

### 2.1 `libs/notification/src/govuk-notify-service.ts`

Follow the existing function shape exactly: module-level env consts at the top, explicit guard
clauses throwing configuration errors, `new NotifyClient(...)`, `reference` string.

```typescript
const TEMPLATE_ID_ACCOUNT_DELETED = process.env.GOVUK_NOTIFY_TEMPLATE_ID_ACCOUNT_DELETED;
const MEDIA_CREATE_ACCOUNT_LINK = process.env.MEDIA_CREATE_ACCOUNT_LINK;

interface AccountDeletionEmailData {
  email: string;
  fullName: string;
  verificationEmailSentDate: Date;
}

export async function sendAccountDeletionEmail(data: AccountDeletionEmailData): Promise<void>;
```

Guards, in order: `GOVUK_NOTIFY_API_KEY`, `TEMPLATE_ID_ACCOUNT_DELETED`
(`"GOV Notify account deletion template ID not configured"`), `MEDIA_CREATE_ACCOUNT_LINK`
(`"MEDIA_CREATE_ACCOUNT_LINK environment variable is not configured"`).
`reference: \`account-deleted-${Date.now()}\``.

**Personalisation contract** — keys must match the Notify template character-for-character or Notify
rejects with a 400. Use `snake_case`, as `sendMediaNewAccountEmail` does for `full_name`. Do not copy
the space-separated (`"forgot password process link"`) or title-case (`"Full name"`) keys from the
older functions; those are legacy inconsistencies.

| Key | Source | Example |
|---|---|---|
| `full_name` | `firstName` + `surname` joined, trimmed; fallback per §3 | `Jane Smith` |
| `verification_email_date` | `verificationEmailSentDate` formatted `D MMMM YYYY` | `1 June 2026` |
| `create_account_link` | `MEDIA_CREATE_ACCOUNT_LINK` | `https://www.court-tribunal-hearings.service.gov.uk/create-media-account` |

### 2.2 `libs/notification/src/account-deletion-notifier.ts`

```typescript
export interface DeletedAccountSnapshot {
  userId: string;
  email: string | null;
  firstName: string | null;
  surname: string | null;
  verificationEmailSentDate: Date | null;
}

export interface DeletedAccountNotificationResult {
  attempted: number;
  sent: number;
  failed: number;
  errors: string[];
}

export async function notifyDeletedAccountHolders(
  snapshots: DeletedAccountSnapshot[]
): Promise<DeletedAccountNotificationResult>;
```

Behaviour:

- Validate each snapshot per §3. Invalid ones are skipped, counted in `failed`, logged, and Notify is
  never called for them.
- Process in chunks of `ACCOUNT_DELETION_EMAIL_CHUNK_SIZE` (default 25) with `Promise.allSettled` per
  chunk and a short pause between chunks, so one rejection cannot abort the batch and a large annual
  cohort does not burst past Notify's per-service sends-per-minute limit.
- On rejection, run `extractNotifyError` and push `` `${userId}: ${status} ${message}` `` into `errors`.
- Never throw for a per-user failure. Configuration errors (§2.1 guards) do throw — they affect every
  user and the run should stop rather than silently mark hundreds as failed.
- Log a run summary.

Mirror `retryWithBackoff` (`libs/notifications/src/govnotify/govnotify-client.ts:117`) if retries are
wanted; do not invent a second retry idiom. Do not lift it across the package boundary for one caller.

### 2.3 `libs/notification/src/verification-date-formatting.ts`

```typescript
export function formatVerificationEmailDate(date: Date): string; // "1 June 2026"
```

Duplicating ~8 lines of `formatPublicationDate` is the right call here: it lives in
`@hmcts/notifications` (plural — the *subscriptions* lib), is not in that package's public API, and
adding a cross-package dependency for one helper is worse than the duplication. Not exported from
`index.ts` — per CLAUDE.md, functions are not exported purely to be testable; it is covered through
`sendAccountDeletionEmail`.

### 2.4 `libs/notification/src/index.ts`

Add `sendAccountDeletionEmail`, `notifyDeletedAccountHolders`, and the two interfaces to the existing
export block. The package's `exports` map already exposes only `"."` → `index.ts`; no `package.json`
change needed.

### 2.5 Schema — `libs/postgres-prisma/prisma/schema/base.prisma`, `model User`

```prisma
verificationEmailSentDate DateTime? @map("verification_email_sent_date")
```

Nullable — every existing row predates the field. Then `yarn db:migrate:dev` (generates a migration
under `apps/postgres/prisma/migrations/`) and `yarn db:generate`.

This ticket only **reads** the column. #351's job must **stamp** it when it sends the re-verification
email — see §6.

### 2.6 `libs/account/src/repository/query.ts`

```typescript
export async function findAccountDeletionSnapshots(userIds: string[]): Promise<DeletedAccountSnapshot[]>;
```

One `findMany` selecting exactly `userId`, `email`, `firstName`, `surname`,
`verificationEmailSentDate`. No new package export entry needed — `@hmcts/account/repository/query`
is already in the `exports` map and in root `tsconfig.json` paths.

Note `libs/account` must not import `DeletedAccountSnapshot` from `@hmcts/notification` (that would
add a dependency for a type alone); declare the returned shape locally and let structural typing
match at the call site.

### 2.7 Configuration

| Variable | Purpose | Files |
|---|---|---|
| `GOVUK_NOTIFY_TEMPLATE_ID_ACCOUNT_DELETED` | Notify template id | `apps/crons/helm/values.yaml`, `apps/web/helm/values.yaml`, `apps/web/helm/values.dev.yaml`, `apps/web/config/default.json`, `apps/web/config/custom-environment-variables.json` |
| `MEDIA_CREATE_ACCOUNT_LINK` | Absolute URL of `/create-media-account` | same |

`apps/crons/helm/values.yaml` currently has only `app-insights-connection-string` and `postgres-url`
in its `keyVaults.cath.secrets`; it needs `govuk-notify-api-key` → `GOVUK_NOTIFY_API_KEY` added, plus
the two env vars above. `apps/crons/package.json` needs `@hmcts/notification`, `@hmcts/account` and
`@hmcts/postgres-prisma` as workspace dependencies.

`MEDIA_CREATE_ACCOUNT_LINK` is a discrete variable rather than `${CATH_SERVICE_URL}/create-media-account`
because on STG `CATH_SERVICE_URL` resolves to `cath-web.staging.platform.hmcts.net` while the AC's
link is the public production URL. This follows the existing `MEDIA_PASSWORD_RESET_LINK` /
`MEDIA_SIGN_IN_LINK` precedent, where STG values point at the legacy public host.

### 2.8 API endpoints / pages

None. No new route, no page, no template, no Welsh locale file.

---

## 3. Error Handling & Edge Cases

No user input exists in this flow, so all validation is server-side and all messages are
operator-facing.

| Condition | Behaviour |
|---|---|
| `GOVUK_NOTIFY_API_KEY` missing | Throw, abort run — matches existing send functions |
| `GOVUK_NOTIFY_TEMPLATE_ID_ACCOUNT_DELETED` missing | Throw, abort run |
| `MEDIA_CREATE_ACCOUNT_LINK` missing | Throw, abort run |
| `email` null or blank | Skip, count `failed`, reason `No email address`. Never call Notify with an empty recipient |
| `verificationEmailSentDate` null | Skip, count `failed`, reason `No verification email date`. Do **not** substitute today's date or `createdDate` (D5) |
| `verificationEmailSentDate` in the future | Data corruption — skip, log, count `failed` |
| `firstName` and `surname` both null/blank | Greeting falls back to `Sir or Madam` → "Dear Sir or Madam" |
| Only one name part present | Join non-empty parts; no leading or trailing space |
| Notify rejects one send (4xx / rate limit / timeout) | Log `{ userId, status, message }` via `extractNotifyError`, count `failed`, continue the batch, do **not** revert the deletion |
| Large cohort | Chunked sending (§2.2) |
| Empty `snapshots` array | Return `{ attempted: 0, sent: 0, failed: 0, errors: [] }`; no Notify client constructed |

Name construction mirrors `buildUserName`
(`libs/notifications/src/notification/notification-service.ts:512`) but with a different fallback:
that helper falls back to `"User"`, and "Dear User" reads badly in formal correspondence about
account deletion. Do not import it across the package boundary.

**Logging.** `CLAUDE.md` prohibits sensitive data in logs, so log `userId` only — never the email
address or the name. `userId` is enough to trace a failure.

| Event | Log |
|---|---|
| Send failed | `console.error("Failed to send account deletion email", { userId, status, message })` |
| No email address | `console.error("Skipped account deletion email: no email address", { userId })` |
| No / invalid verification date | `console.error("Skipped account deletion email: no verification email date", { userId })` |
| Run summary | `console.log("Account deletion notifications", { attempted, sent, failed })` |

---

## 4. Content

English only. The AC states no Welsh translation is required.

This is an explicit, product-owned exception to the CLAUDE.md rule "Don't skip Welsh translations —
required for all user-facing text", and to the Welsh Language Scheme expectations that generally
apply to HMCTS correspondence. Reversing it later is not free: it needs a second Notify template
**and** a stored language preference on `User`, which does not exist. Note that #895 — the sibling
ticket adding the verification clause to the account-creation T&Cs — *does* supply Welsh copy, so the
user is told about this process bilingually and then told of its outcome in English only. Flagged in §6.

### 4.1 Subject

```
Your Court and Tribunal Hearings account has been deleted
```

Not specified in the issue. This front-loads the outcome and reads correctly in an inbox list, per
the GDS principle of putting the most important information first. Needs content-designer sign-off (§6).

### 4.2 Body (Notify template)

```
Dear ((full_name)),

As part of our annual account verification process, a re-verification email was sent to you on ((verification_email_date)).

As the re-verification process was not completed within the required timeframe, your account has now been deleted.

If you wish to continue accessing the Court and Tribunal Hearings Verified Space, you will need to create a new account. You can do so by following the link below:

[Create a Court and Tribunal Hearings account](((create_account_link)))

Kind regards,

Court and Tribunal Hearings
```

- The body is the issue's copy verbatim, with the hardcoded production URL replaced by
  `create_account_link` so each environment links to its own service.
- The issue's URL ends in a bare `#` fragment; dropped as a copy-paste artefact.
- The issue's copy ends at "Kind regards," with no signer. A service sign-off is added because an
  unsigned email reads as truncated. Confirm (§6).
- Notify's markdown link with a personalised URL is the preferred form. If it proves brittle in the
  target Notify service, fall back to descriptive link text on one line and the bare URL on the
  next — Notify auto-links bare URLs, which is what the existing new-account template does with
  `forgot password process link`.
- Link text is descriptive out of context, satisfying WCAG 2.2 AA 2.4.4 Link Purpose. Do not use
  "click here" or a bare URL as the link text. Notify templates are plain markdown, so there are no
  images, no colour-only meaning, and no tables to worry about.

---

## 5. Acceptance Criteria Mapping

| AC | How it is satisfied | How it is verified |
|---|---|---|
| Email generated on GovNotify and sent **immediately** to the owner of every account deleted by the annual verification process | `notifyDeletedAccountHolders` runs inline at the end of the deletion run (not queued or batched to a later job), one `sendEmail` per deleted account | Unit: 250-snapshot batch issues exactly 250 sends. End-to-end demonstrable only once #351's job exists (§6) |
| Sent to the **owner** of the account | Recipient is the snapshot's `email`, captured before deletion | Unit: `sendEmail` called with the snapshot address; skipped-and-counted when blank |
| Addressed to `full_name` | `full_name` personalisation from `firstName` + `surname` | Unit: both parts, first-only, surname-only, neither (fallback) |
| States the date the re-verification email was sent | `verification_email_date` from `user.verification_email_sent_date`, formatted `D MMMM YYYY` | Unit: single-digit day, double-digit day, January and December (month-index off-by-one) |
| Contains a link to create a new account | `create_account_link` from `MEDIA_CREATE_ACCOUNT_LINK`; template renders it under descriptive link text | Unit: personalisation asserted. Manual: send a Notify preview and click through to `/create-media-account` |
| **No Welsh translation required** | One English template; no locale branching anywhere in the send path | Unit: a snapshot carrying any locale hint uses the same template id |
| Every deleted account is notified | Chunked `Promise.allSettled`; one failure never aborts the batch; result reports `attempted` / `sent` / `failed` | Unit: one rejection among many yields `failed: 1` and the rest still sent |

**Residual gap, stated plainly:** the AC's end-to-end behaviour cannot be demonstrated on STG from
this ticket alone, because nothing in the codebase yet deletes accounts for failed re-verification.
This ticket makes the email correct and reachable; #351 makes it fire.

### 5.1 Test scenarios

Vitest, co-located, AAA pattern, `NotifyClient` mocked exactly as
`libs/notification/src/govuk-notify-service.test.ts` already does (env vars set before the dynamic
`await import`, class mock over `notifications-node-client`).

`sendAccountDeletionEmail`:

- Calls Notify with the configured template id, the account's email, and personalisation containing
  `full_name`, `verification_email_date`, `create_account_link`.
- Throws when the API key is not configured.
- Throws when the account-deleted template id is not configured.
- Throws when the create-account link is not configured.
- Date formats as `D MMMM YYYY` for a single-digit day, a double-digit day, 1 January and 31 December.
- Name: both parts; first-name only; surname only (no stray spaces); neither → `Sir or Madam`.

`notifyDeletedAccountHolders`:

- All sends succeed → `{ attempted: n, sent: n, failed: 0, errors: [] }`.
- One send rejects → remaining users still processed, `failed: 1`, `errors` carries the Notify status
  and message, and the function does not throw.
- Snapshot with no email → skipped, counted `failed`, Notify never called for it.
- Snapshot with null `verificationEmailSentDate` → skipped, counted `failed`, no date fabricated.
- Snapshot with a future `verificationEmailSentDate` → skipped, counted `failed`.
- Empty array → zeroed result, no Notify client constructed.
- A batch larger than the chunk size is sent in chunks and every snapshot is still attempted.
- Failure logs contain `userId` and contain neither the email address nor the name.
- One template id is used regardless of any locale hint (guards the no-Welsh decision).

`findAccountDeletionSnapshots`:

- Selects only the five needed fields for the given ids (`prisma` mocked per `.claude/rules/testing.md`).

Regression:

- `/delete-user-confirm/{userId}` still completes and sends **no** deletion email — assert the
  notifier is not imported or called on that path.
- Prisma migration applies cleanly; `verification_email_sent_date` is nullable for existing rows.

**E2E (Playwright): none.** There is no journey to drive — no page renders, and the send is
server-initiated. An E2E test here would only assert that a mocked Notify client was called, which
the unit tests already do, and would violate the "one test per user journey" rule in CLAUDE.md. If
#351 later exposes a test-support endpoint (as
`libs/test-support/src/routes/test-support/notifications.ts` does for subscription notifications), an
API-level assertion becomes worthwhile then.

### 5.2 Fallback if #351 is not imminent

Only if #351 is deferred beyond the next sprint: add `apps/crons/src/delete-unverified-accounts.ts`
(default-exported async function, run via `SCRIPT_NAME=delete-unverified-accounts`) that selects
expired accounts, snapshots, deletes, then notifies. Do **not** add a Flux schedule in this ticket.
This is a fallback, not the plan — see D6.

---

## 6. CLARIFICATIONS NEEDED

### Blocking

1. **#351 owns the annual verification job — is it landing before or after this ticket?**
   Issue #351 ("CaTH Cron Trigger - Automated Inactive Accounts") already specifies the whole cycle:
   media accounts unverified for 350 days get a re-verification email (Notify template
   `1dea6b4b-48b6-4eb1-8b86-7031de5502d9`, personalisation `full_name`, `verification_page_link`) and
   are deleted at 365 days. Nothing in that flow exists in code yet. If #351 lands after this ticket,
   #896 ships a correct-but-unreachable send function and the AC cannot be demonstrated on STG.
   **Ask:** confirm sequencing, and confirm #351's job will call `notifyDeletedAccountHolders` rather
   than growing its own send.

2. **#351 must stamp `verification_email_sent_date`.** This plan adds the column (§2.5) and reads it,
   but only #351's job can populate it. If it does not, every send is skipped by the §3 rule and the
   feature is inert. **Ask:** confirm #351 will write it when it sends the re-verification email.
   Note #351 is threshold-driven (350/365 days), so it may not currently plan to store a send date at
   all — that needs to be added to its scope.

3. **#894 and #918 imply deleted accounts are archived, not hard-deleted — which model wins?**
   #894 requires an MI report listing "the total number of all deleted CaTH accounts and their CaTH
   IDs", and #918 requires a cron to "remove these accounts from the 'deleted accounts' table after 3
   months". Both presuppose a deleted-accounts archive table that does not exist, while the only
   delete primitive in the codebase (`deleteUserById`) is a hard delete. If an archive lands, the
   personalisation snapshot should arguably come from the archive row rather than an in-memory
   snapshot, and the ordering in D3 changes. **Ask:** does the archive table belong to #894, and
   should #896 be built against it or against hard delete? This plan assumes hard delete plus an
   in-memory snapshot, which works either way but may become a redundant read.

4. **A GOV.UK Notify template must be created** in the CaTH Notify service, with the §2.1
   personalisation keys matching exactly — a mismatch is a 400 on every send. **Ask:** who creates it,
   and can we get the STG and production template ids?

### Content

5. **Subject line is not in the issue.** §4.1 proposes
   "Your Court and Tribunal Hearings account has been deleted". Needs content-designer sign-off.

6. **Sign-off is not in the issue** — the copy ends at "Kind regards," with nothing after it. §4.2
   adds "Court and Tribunal Hearings". Confirm.

7. **Should STG link to STG or to production?** The issue's link is the public production URL. This
   plan makes it environment-configurable (`MEDIA_CREATE_ACCOUNT_LINK`). Confirm STG should point at
   the STG service.

8. **"Verified Space"** — confirm this is the current public-facing term. The codebase uses the role
   `VERIFIED` and the route group `(verified)`, neither of which is necessarily the user-facing label.

### Design decisions to confirm

9. **No Welsh (§4).** Accepted as stated, but it conflicts with the project-wide CLAUDE.md rule, and
   sibling ticket #895 supplies Welsh copy for the T&Cs describing this very process — so users are
   warned bilingually and notified in English only. Has the exemption been cleared with the Welsh
   language lead? Reversing it later requires a language preference on `User`, which does not exist.

10. **Delete-then-email ordering (D3).** Confirm product accepts that a Notify outage means some
    users are deleted without notification, and say whether a reconciliation or retry report is wanted
    (see also #12).

11. **Manual admin deletions stay silent (D4).** An admin deleting an account without telling the
    holder is arguably the same user need, but it is not what this ticket asks for and the copy would
    be false. Confirm.

12. **Retention / audit trail.** Once the row is hard-deleted there is no record that the email was
    sent — `notification_audit_log` is keyed to subscriptions and is deleted along with the user. Is
    an audit trail of deletion notifications required? If so it needs an `audit_log` entry written
    before deletion, or the #894 archive table. Not currently in scope.

### Operational

13. **Expected cohort size per annual run?** Chunked sending is specified (§2.2) but the chunk size
    and pause should be set against a realistic upper bound and the Notify service's sends-per-minute
    limit. What is the expected volume?

14. **Is the deletion selection query re-run safe?** If the job is re-run or a pod restarts mid-batch,
    already-deleted users are gone from the query so duplicate emails are unlikely by construction —
    but that is #351's query to guarantee, not an assumption to inherit.
