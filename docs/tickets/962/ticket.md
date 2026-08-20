# #962: Implement Rate Limiting for Email Notifications

**State:** OPEN
**Assignees:** None
**Author:** OgechiOkelu
**Labels:** None
**Created:** 2026-08-20T13:43:35Z
**Updated:** 2026-08-20T14:21:35Z

## Description

**PROBLEM STATEMENT**
To prevent the abuse of email notifications and ensure fair usage, a rate limit needs to be set and enforced on the number of emails that can be sent to a CaTH user within a specific time frame. Implementation of this functionality was attempted in https://github.com/hmcts/cath-service/issues/358 but the values implemented differ from those currently established in OG CaTH and should not be used. This ticket is raised to implement the correct vales. Email template grouping can be found in https://github.com/hmcts/pip-publication-services/blob/master/src/main/java/uk/gov/hmcts/reform/pip/publication/services/notify/Templates.java 


**AS A** Service
**I WANT** to enforce a rate limit on the number of emails sent to a user within a specific time frame
**SO THAT** the system can prevent abuse and ensure fair usage of email notifications.


**ACCEPTANCE CRITERIA**
- The system should track email sending limits using a unique key for each user and email type. 
- The rate limit configuration should be customisable based on the email type and user.
- Implementation should follow the same implementation as the one in pip-publication-services project. 
- For email template in the standard group, only 10 emails per 30 minutes should be allowed
- For email template in the high capacity groups, only 200 emails per 30 minute should be allowed
- If the rate limit is exceeded:
1.   The system should throw a 'TooManyEmailsException' for critical operations.
2. The system should log an error message for non-critical operations
3. The email address in error messages should be masked for security.


<img width="487" height="201" alt="Image" src="https://github.com/user-attachments/assets/b0329d53-d22d-41df-8f3e-0e2bb5ad73ce" />

## Comments

### Comment by OgechiOkelu on 2026-08-20T14:10:16Z

@spec

### Comment by hmctsclaudecode on 2026-08-20T14:18:29Z

# Technical Specification — Issue #962: Implement Rate Limiting for Email Notifications

## 1. User Story

**As a** CaTH service
**I want to** enforce a rate limit on the number of emails sent to a single recipient within a fixed time window, differentiated by email template group
**So that** the service prevents abuse of GOV.UK Notify, protects users from email flooding, and stays within fair-usage limits — using the same limits already established in OG CaTH (`pip-publication-services`)

## 2. Background

### Why this ticket exists

Rate limiting was previously attempted in issue #358, but the limit values implemented there do not match the values live in OG CaTH. This ticket re-implements the feature with the correct values and the correct template grouping.

### Reference implementation (OG CaTH)

`pip-publication-services` implements this with three collaborating pieces:

| OG CaTH artefact | Responsibility |
| --- | --- |
| `Templates` enum (`notify/Templates.java`) | Each Notify template constant carries an `EmailLimit` value, so grouping is a property of the template, not of the call site |
| `EmailLimit` enum | Two groups only: `STANDARD` and `HIGH` |
| `RateLimitService` | A Bucket4j token bucket per `email + EmailLimit` key, held in an in-process `ConcurrentHashMap`. `isValid(email, template)` calls `bucket.tryConsume(1)` |
| `TooManyEmailsException` | Thrown when a bucket is exhausted on a path where the caller must be told the send did not happen |
| `EmailHelper.maskEmail` | Masks the local part of the address before it reaches any log or exception message |

Bucket4j is configured with `Bandwidth.classic(capacity, Refill.intervally(capacity, Duration.ofMinutes(30)))` — the bucket is refilled to full capacity **once** every 30 minutes rather than trickling. Functionally this is a fixed 30-minute window with `capacity` permits, and this specification reproduces that behaviour rather than a smooth leaky bucket.

### Current state of this codebase

There is **no** email rate limiting anywhere today. Two libraries send email through GOV.UK Notify:

| Library | Entry points | Trigger | Volume per event |
| --- | --- | --- | --- |
| `@hmcts/notifications` (`libs/notifications/src/govnotify/govnotify-client.ts` → `sendEmail`) | `sendLocationAndCaseSubscriptionNotifications`, `sendListTypePublicationNotifications` | Publication processing (`libs/publication/src/processing/service.ts`), invoked from `apps/web` manual/non-strategic upload and from `libs/api/src/blob-ingestion` | Fan-out: one email per matching subscriber, `Promise.allSettled` over the whole subscriber set |
| `@hmcts/notification` (`libs/notification/src/govuk-notify-service.ts`) | `sendMediaRejectionEmail`, `sendMediaNewAccountEmail`, `sendMediaDuplicateAccountEmail` | CTSC admin actions on `/media-applications/:id/approve` and `/media-applications/:id/reject` | One email per admin action |

The two libraries have confusingly similar names (`notification` vs `notifications`) and neither depends on the other. Rate limiting must apply to both, so it goes in a new shared library rather than in either one.

### Existing behaviour worth preserving

* `libs/publication/src/processing/service.ts` already redacts whole email addresses out of aggregated notification error logs with a regex (`[REDACTED_EMAIL]`). The new masking helper is complementary: it masks at the point the message is *created*, so it also covers the exception path and any log line that bypasses that aggregation.
* Subscription sends already write a `notification_audit_log` row per recipient with statuses `Pending` / `Sent` / `Failed` / `Skipped`, and a `skipNotification` helper exists for the "no email address" case. Rate-limited subscription sends reuse this path.

### Related links

* OG CaTH template grouping: <https://github.com/hmcts/pip-publication-services/blob/master/src/main/java/uk/gov/hmcts/reform/pip/publication/services/notify/Templates.java>
* Previous incorrect attempt: <https://github.com/hmcts/cath-service/issues/358>

## 3. Acceptance Criteria

* **Scenario:** Standard-group email inside the limit
    * **Given** the recipient `user@example.com` has been sent 9 emails from `STANDARD`-group templates in the last 30 minutes
    * **When** a 10th `STANDARD`-group email is requested for that recipient
    * **Then** the email is sent, the bucket for `user@example.com:STANDARD` drops to 0 permits, and no error is raised

* **Scenario:** Standard-group email exceeds the limit on a critical operation
    * **Given** the recipient `applicant@example.com` has already consumed all 10 permits for the `STANDARD` group within the current 30-minute window
    * **When** a CTSC admin confirms rejection of that recipient's media application, which sends a `MEDIA_REJECTION` email
    * **Then** `assertEmailWithinRateLimit` throws `TooManyEmailsError`, the message reads `Rate limit exceeded for email a********@example.com in group STANDARD`, no call is made to GOV.UK Notify, and the admin is shown the "problem with the service" page

* **Scenario:** High-capacity-group email exceeds the limit on a non-critical operation
    * **Given** a subscriber `subscriber@example.com` has already received 200 subscription emails within the current 30-minute window
    * **When** a further publication is processed that matches one of their subscriptions
    * **Then** no email is sent to that subscriber, an error is logged containing only the masked address, the `notification_audit_log` row for that subscriber is written with status `Skipped` and `error_message` `Email rate limit exceeded`, the aggregated `NotificationResult.skipped` count is incremented, and **every other** subscriber in the same batch is still processed

* **Scenario:** Groups are tracked independently
    * **Given** the recipient `user@example.com` has exhausted all 10 permits for the `STANDARD` group
    * **When** a `HIGH`-group subscription email is requested for the same recipient
    * **Then** the email is sent, because the key `user@example.com:HIGH` has its own bucket with 200 permits

* **Scenario:** Window resets
    * **Given** the recipient `user@example.com` exhausted the `STANDARD` bucket 31 minutes ago
    * **When** a `STANDARD`-group email is requested
    * **Then** the bucket is refilled to its full configured capacity, the email is sent, and 9 permits remain

* **Scenario:** Limits are configurable without a code change
    * **Given** `EMAIL_RATE_LIMIT_STANDARD_CAPACITY` is set to `3` and `EMAIL_RATE_LIMIT_WINDOW_MINUTES` to `5`
    * **When** the service starts and 4 `STANDARD`-group emails are requested for one recipient inside 5 minutes
    * **Then** the first 3 are permitted and the 4th is rejected

* **Scenario:** Recipient address is case- and whitespace-insensitive
    * **Given** 10 `STANDARD`-group emails have been sent to `User@Example.com`
    * **When** an email is requested for ` user@example.com `
    * **Then** it is rejected, because the key is normalised by trimming and lower-casing before lookup

* **Scenario:** Unknown email type fails safe
    * **Given** a caller passes an email type that has no entry in the template group map
    * **When** the rate limit is checked
    * **Then** the `STANDARD` group is applied (the more restrictive of the two) and a warning is logged naming the unmapped type

* **Scenario:** Masking never leaks the local part
    * **Given** any recipient address
    * **When** it appears in a `TooManyEmailsError` message or in any rate-limit log line
    * **Then** only the first character of the local part is visible, every remaining local-part character is replaced with `*`, and the domain is unchanged

## 4. User Journey Flow

This is a service-layer control with no new pages. Two flows are affected.

### Flow A — Non-critical: subscription publication emails (fan-out, must not abort)

```
Admin uploads publication          Blob ingestion (apps/api)
(apps/web manual-upload-summary)            |
             |                              |
             +--------------+---------------+
                            v
              processPublication()  libs/publication
                            |
                            v
     sendLocationAndCaseSubscriptionNotifications()
     sendListTypePublicationNotifications()
                            |
             Promise.allSettled over N subscribers
                            |
              +-------------+--------------+
              v                            v
    per subscriber:                 per subscriber:
    isEmailWithinRateLimit          isEmailWithinRateLimit
    (email, HIGH) -> true           (email, HIGH) -> false
              |                            |
              v                            v
    sendEmail() -> Notify          console.error with masked
              |                    address; NO Notify call
              v                            |
    audit status = Sent                    v
                                  audit status = Skipped
                                  error_message = "Email rate
                                  limit exceeded"
                                           |
              +-------------+--------------+
                            v
              aggregateResults() -> { sent, failed, skipped }
                            |
                            v
     Admin sees the normal upload-success confirmation.
     Rate-limited recipients are visible only in logs and
     in notification_audit_log.
```

### Flow B — Critical: media account emails (single recipient, admin must be told)

```
CTSC admin on /media-applications/:id/reject
                    |
            POST confirm = "yes"
                    |
                    v
        rejectApplication(id)   <-- application state IS updated
                    |
                    v
        sendMediaRejectionEmail(...)
                    |
        assertEmailWithinRateLimit(email, MEDIA_REJECTION)
                    |
        +-----------+-----------------------+
        v                                   v
   within limit                       limit exceeded
        |                                   |
        v                                   v
   Notify sendEmail                  throw TooManyEmailsError
        |                                   |
        v                                   v
   redirect to                       caught by the existing
   /media-applications/              try/catch around the send:
   :id/rejected                      console.error with masked
                                     address, then render
                                     errors/common with the
                                     "email not sent" message
                                     (HTTP 429)
```

**Note on Flow B ordering:** `rejectApplication` / `approveApplication` runs *before* the email in the current controllers, and the email is already wrapped in its own `try/catch` so that a Notify failure does not roll the decision back. That ordering is retained — a rate-limited email must not silently reverse an admin decision. What changes is that the admin now sees an explicit failure page instead of a silent `console.error` followed by a success redirect.

## 5. Low Fidelity Wireframe

Only one screen changes: the page a CTSC admin lands on when a critical media-account email is blocked by the rate limit. It reuses the existing `errors/common.njk` template from `@hmcts/web-core` — no new template is created.

```
+--------------------------------------------------------------------+
| [GOV.UK crown]  GOV.UK                                             |
+--------------------------------------------------------------------+
| Court and tribunal hearings                          English | Cymraeg
+--------------------------------------------------------------------+
| [ BETA ] This is a new service - your feedback will help us improve|
+--------------------------------------------------------------------+
|                                                                    |
|  We could not send the email                                       |  <- h1, govuk-heading-l
|                                                                    |
|  Too many emails have been sent to this address recently.           |  <- govuk-body
|  The application decision has been saved. Try sending the           |
|  email again in 30 minutes.                                         |
|                                                                    |
|  If the problem continues, contact us to report it.                 |  <- govuk-body + link
|                                                                    |
+--------------------------------------------------------------------+
| Footer: Accessibility statement | Cookies | Privacy | Terms        |
+--------------------------------------------------------------------+
```

### Rendering contract

```
res.status(429).render("errors/common", {
  errorTitle:   t.emailRateLimit.title,
  errorMessage: t.emailRateLimit.message
});
```

`errors/common.njk` already renders `errorTitle` into both `<title>` and the `<h1>`, `errorMessage` into the first paragraph, and appends the contact-us paragraph from the shared `t` object. No markup change is required.

### Sequence diagram — bucket lifecycle for one recipient

```
 permits
   10 |*----------------------------------  refill to full capacity
      |  \                                        ^
      |   \                                       |
    5 |    \____                                  |
      |         \___                              |
    0 |             \_______________X-------------+
      +--------------------------------------------------> time
      0 min                       exhausted    30 min

      X = every request here is rejected until the window rolls over.
          STANDARD capacity = 10, HIGH capacity = 200,
          window = 30 minutes, refilled in one step (not trickled).
```

## 6. Page Specifications

There is no new page. This section specifies the module, its public API, and every integration point.

### 6.1 New library: `libs/email-rate-limit` (`@hmcts/email-rate-limit`)

A new library is required because both `@hmcts/notification` and `@hmcts/notifications` must use it, neither currently depends on the other, and creating a dependency between two libraries with near-identical names would be actively confusing. The library has no dependency on Prisma, Redis, Express, or Notify — it is pure logic plus configuration, which keeps it trivially testable.

```
libs/email-rate-limit/
├── package.json
├── tsconfig.json
└── src/
    ├── config.ts                     # moduleRoot only (no assets, no routes)
    ├── index.ts                      # public exports
    ├── email-limit-group.ts          # EMAIL_LIMIT_GROUP + capacity config
    ├── email-limit-group.test.ts
    ├── email-type.ts                 # EMAIL_TYPE -> group map
    ├── email-type.test.ts
    ├── mask-email.ts                 # maskEmail
    ├── mask-email.test.ts
    ├── too-many-emails-error.ts      # TooManyEmailsError
    ├── rate-limit-service.ts         # bucket store + the two public checks
    └── rate-limit-service.test.ts
```

`package.json` follows the standard module shape from `CLAUDE.md`, with `"test": "vitest run"` and no runtime dependencies.

### 6.2 Limit groups and configuration — `email-limit-group.ts`

```typescript
const DEFAULT_STANDARD_CAPACITY = 10;
const DEFAULT_HIGH_CAPACITY = 200;
const DEFAULT_WINDOW_MINUTES = 30;

export const EMAIL_LIMIT_GROUP = {
  STANDARD: "STANDARD",
  HIGH: "HIGH"
} as const;

export type EmailLimitGroup = (typeof EMAIL_LIMIT_GROUP)[keyof typeof EMAIL_LIMIT_GROUP];

export function getWindowMs(): number { /* minutes -> ms */ }

export function getCapacity(group: EmailLimitGroup): number { /* per-group capacity */ }
```

Configuration is read from environment variables with the OG CaTH values as defaults, so an unconfigured environment behaves correctly:

| Variable | Default | Meaning |
| --- | --- | --- |
| `EMAIL_RATE_LIMIT_STANDARD_CAPACITY` | `10` | Permits per window for the `STANDARD` group |
| `EMAIL_RATE_LIMIT_HIGH_CAPACITY` | `200` | Permits per window for the `HIGH` group |
| `EMAIL_RATE_LIMIT_WINDOW_MINUTES` | `30` | Window length, shared by both groups |
| `EMAIL_RATE_LIMIT_ENABLED` | `true` | Set to `false` to disable enforcement (E2E fixtures, local debugging) |

Parsing rules: `Number.parseInt(value, 10)`; if the result is `NaN` or `< 1`, fall back to the default and log a warning once at module load. Values are read **at each call** rather than captured at module load, so that tests can override them with `vi.stubEnv` without module-cache gymnastics — the parse is trivially cheap.

Defaults live in `apps/web/config/default.json` and `apps/api` only if the config-package route is chosen; see §14 for why environment variables are used directly instead.

### 6.3 Email types and their groups — `email-type.ts`

Grouping is keyed on a **stable string email-type name**, never on the GOV.UK Notify template UUID. Notify template IDs come from per-environment environment variables (`GOVUK_NOTIFY_TEMPLATE_ID_*`), differ between local, STG and production, and are secrets — keying on them would reproduce exactly the class of environment-divergence bug that the `listTypeName` rule in `CLAUDE.md` exists to prevent.

```typescript
export const EMAIL_TYPE = {
  SUBSCRIPTION_NO_LINKS: "SUBSCRIPTION_NO_LINKS",
  SUBSCRIPTION_NON_SJP_PDF: "SUBSCRIPTION_NON_SJP_PDF",
  SUBSCRIPTION_PDF_EXCEL: "SUBSCRIPTION_PDF_EXCEL",
  SUBSCRIPTION_SJP_EXCEL_ONLY: "SUBSCRIPTION_SJP_EXCEL_ONLY",
  MEDIA_NEW_ACCOUNT: "MEDIA_NEW_ACCOUNT",
  MEDIA_DUPLICATE_ACCOUNT: "MEDIA_DUPLICATE_ACCOUNT",
  MEDIA_REJECTION: "MEDIA_REJECTION"
} as const;

export type EmailType = (typeof EMAIL_TYPE)[keyof typeof EMAIL_TYPE];

const EMAIL_TYPE_GROUPS: Record<EmailType, EmailLimitGroup> = {
  SUBSCRIPTION_NO_LINKS: EMAIL_LIMIT_GROUP.HIGH,
  SUBSCRIPTION_NON_SJP_PDF: EMAIL_LIMIT_GROUP.HIGH,
  SUBSCRIPTION_PDF_EXCEL: EMAIL_LIMIT_GROUP.HIGH,
  SUBSCRIPTION_SJP_EXCEL_ONLY: EMAIL_LIMIT_GROUP.HIGH,
  MEDIA_NEW_ACCOUNT: EMAIL_LIMIT_GROUP.STANDARD,
  MEDIA_DUPLICATE_ACCOUNT: EMAIL_LIMIT_GROUP.STANDARD,
  MEDIA_REJECTION: EMAIL_LIMIT_GROUP.STANDARD
};

export function getEmailLimitGroup(emailType: string): EmailLimitGroup;
```

**Grouping rationale.** In OG CaTH, `HIGH` is applied to the subscription templates because a single publication fans out to every matching subscriber, and a user subscribed to many locations or list types legitimately receives far more than 10 emails in half an hour. All account-lifecycle templates are `STANDARD`, because a legitimate flow produces one email per deliberate human action. The four subscription templates above are exactly the set returned by `getSubscriptionTemplateId` in `libs/notifications/src/govnotify/template-config.ts`.

`getEmailLimitGroup` returns `STANDARD` for any unrecognised type and logs a warning naming the type — failing to the more restrictive group so a mapping oversight cannot silently create an unlimited path.

### 6.4 Masking — `mask-email.ts`

```typescript
export function maskEmail(email: string): string;
```

Reproduces OG CaTH `EmailHelper.maskEmail`: every character of the local part except the first is replaced with `*`; the `@` and domain are untouched.

| Input | Output |
| --- | --- |
| `test@example.com` | `t***@example.com` |
| `a@b.com` | `a@b.com` |
| `subscriber.one+tag@justice.gov.uk` | `s*****************@justice.gov.uk` |
| `""` | `""` |
| `not-an-email` | `n***********` (no `@`: mask everything after the first character) |

Implemented with an explicit index-based build rather than a lookbehind regex — the regex form is harder to read and Node's lookbehind support is not the constraint here, clarity is.

### 6.5 Error type — `too-many-emails-error.ts`

```typescript
export class TooManyEmailsError extends Error {
  readonly emailLimitGroup: EmailLimitGroup;

  constructor(maskedEmail: string, group: EmailLimitGroup) {
    super(`Rate limit exceeded for email ${maskedEmail} in group ${group}`);
    this.name = "TooManyEmailsError";
    this.emailLimitGroup = group;
  }
}
```

Named `TooManyEmailsError`, not `TooManyEmailsException`: `Error` is the TypeScript/JavaScript convention and `Exception` is a Java-ism. It is the direct counterpart of OG CaTH's `TooManyEmailsException`. See §14 if the ticket wording is intended to be binding on the identifier.

The constructor takes an **already-masked** address. Passing the raw address is impossible to do accidentally at the type level, so the call site in `rate-limit-service.ts` is the only place that masks, and the raw address never enters the error object or its stack message.

### 6.6 The limiter — `rate-limit-service.ts`

```typescript
const MAX_TRACKED_BUCKETS = 100_000;

interface Bucket {
  permits: number;
  windowEndsAt: number;
}

const buckets = new Map<string, Bucket>();

export function isEmailWithinRateLimit(email: string, emailType: string): boolean;

export function assertEmailWithinRateLimit(email: string, emailType: string): void;

export function resetRateLimits(): void;   // test-support only
```

**Behaviour of `isEmailWithinRateLimit`:**

1. If `EMAIL_RATE_LIMIT_ENABLED` is `false`, return `true` immediately without touching the store.
2. Resolve `group = getEmailLimitGroup(emailType)`.
3. Build the key `` `${email.trim().toLowerCase()}:${group}` ``. Normalising the address prevents `User@Example.com` and `user@example.com` from getting separate allowances.
4. Look up the bucket. If it is missing, or `Date.now() >= bucket.windowEndsAt`, create/reset it to `{ permits: getCapacity(group), windowEndsAt: Date.now() + getWindowMs() }`. This is the `Refill.intervally` semantic — a single refill to full capacity at the window boundary, not a per-permit trickle.
5. If `permits > 0`, decrement and return `true`. Otherwise return `false` **without** extending `windowEndsAt` — a blocked attempt must not push the reset further out, or a hot loop would keep a recipient locked out indefinitely.
6. Before inserting a new bucket, if `buckets.size >= MAX_TRACKED_BUCKETS`, sweep every entry whose `windowEndsAt` has already passed. Bucket4j's cache in OG CaTH is unbounded; a bounded sweep costs nothing in the normal case (the map only exceeds the threshold under a genuinely large recipient set) and removes an unbounded-memory-growth vector reachable by anyone who can trigger sends to arbitrary addresses.

**Behaviour of `assertEmailWithinRateLimit`:** calls `isEmailWithinRateLimit`; on `false`, throws `new TooManyEmailsError(maskEmail(email), group)`. It consumes a permit on success exactly like the boolean form — the two functions differ only in how failure is reported, so a caller must never call both for the same send.

**`resetRateLimits`** clears the store. It exists solely so unit tests and E2E fixtures start from a known state; it is exported from `index.ts` and its doc comment states that it must not be called from application code.

### 6.7 Integration — non-critical path (`@hmcts/notifications`)

The check goes in `libs/notifications/src/notification/notification-service.ts`, not inside `sendEmail`, because only the service layer knows the audit-log row that has to be updated and can classify the outcome as `Skipped` rather than `Failed`.

`SendEmailParams` in `govnotify-client.ts` gains no new field; instead `buildEmailDataWithFiles` — which already selects the template — also returns the `emailType` that corresponds to the template it chose:

```typescript
interface EmailTemplateData {
  templateParameters: TemplateParameters;
  templateId?: string;
  emailType: EmailType;      // new
  pdfBuffer?: Buffer;
  excelBuffer?: Buffer;
}
```

`getSubscriptionTemplateId` is refactored to return `{ templateId, emailType }` so the template choice and its group label cannot drift apart. All four of its return branches are covered by the `SUBSCRIPTION_*` types in §6.3.

Two call sites then gate the send:

* `processUserNotification` (location and case subscriptions). The check goes **after** `createNotificationAuditLog` and immediately before `sendEmail`, so a blocked send still leaves an audit trail:

  ```typescript
  if (!isEmailWithinRateLimit(subscription.user.email, emailData.emailType)) {
    console.error(
      `[notification-service] Email rate limit exceeded for ${maskEmail(subscription.user.email)} (${emailData.emailType})`
    );
    await updateNotificationStatus(notification.notificationId, "Skipped", undefined, "Email rate limit exceeded");
    return { status: "skipped", error: `User ${subscription.userId}: Email rate limit exceeded` };
  }
  ```

* `processListTypeUserNotification` (list-type subscriptions). Same check, but this path writes no audit row today, so it returns `{ status: "skipped", error: ... }` only. Its error string must not contain the raw address — `aggregateResults` collects these into `NotificationResult.errors`, which `libs/publication/src/processing/service.ts` logs.

Because the existing return type already includes `"skipped"` and `aggregateResults` increments by status name, `NotificationResult.skipped` picks up rate-limited recipients with no change to the aggregation code. The publication-processing summary log therefore shows rate limiting as a non-zero `skipped` count.

### 6.8 Integration — critical path (`@hmcts/notification`)

Each of the three functions in `libs/notification/src/govuk-notify-service.ts` gains an `assertEmailWithinRateLimit` call after its configuration guards and before `new NotifyClient(...)`:

| Function | Email type |
| --- | --- |
| `sendMediaRejectionEmail` | `EMAIL_TYPE.MEDIA_REJECTION` |
| `sendMediaNewAccountEmail` | `EMAIL_TYPE.MEDIA_NEW_ACCOUNT` |
| `sendMediaDuplicateAccountEmail` | `EMAIL_TYPE.MEDIA_DUPLICATE_ACCOUNT` |

The controllers `apps/web/src/pages/(admin)/media-applications/[id]/reject.ts` and `.../approve.ts` already wrap the send in `try/catch`. That `catch` is extended to distinguish the two failure kinds:

```typescript
} catch (error) {
  if (error instanceof TooManyEmailsError) {
    console.error(`Rejection email blocked by rate limit: ${error.message}`);
    return res.status(429).render("errors/common", {
      errorTitle: lang.errorMessages.emailRateLimitTitle,
      errorMessage: lang.errorMessages.emailRateLimitMessage
    });
  }
  const { status, message } = extractNotifyError(error);
  console.error(`Failed to send rejection email: ${status} ${message}`);
}
```

`error.message` is safe to log directly because the address inside it is already masked. Existing Notify failures keep their current silent-log-then-redirect behaviour; only the rate-limit branch surfaces to the admin, because a rate limit is a condition the admin can act on (wait and retry) whereas a transient Notify 500 is not.

### 6.9 Wiring and registration

* Add `"@hmcts/email-rate-limit": ["libs/email-rate-limit/src"]` to `paths` in the root `tsconfig.json`.
* Add `"@hmcts/email-rate-limit": "workspace:*"` to the `dependencies` of `libs/notification/package.json` and `libs/notifications/package.json`.
* No entry in `apps/web/src/app.ts` `modulePaths` and no `vite.config.ts` change: the library ships no templates and no assets.
* No `apps/api/src/app.ts` change: it is reached transitively through `@hmcts/publication` → `@hmcts/notifications`.
* No Prisma schema change and no migration. The existing `notification_audit_log.status` column is a free-form `String`, so `Skipped` needs no schema work.

## 7. Content

The only user-facing content is the message shown to a CTSC admin when a critical media-account email is blocked. Nothing is shown to public users or subscribers: a rate-limited subscription email is invisible to the recipient by definition, and the uploading admin sees the existing upload-success page.

Content is added to the co-located locale files for the two affected admin pages, following the default co-location pattern. The keys are added to `reject-en.ts` / `reject-cy.ts` and `approve-en.ts` / `approve-cy.ts` under the existing `errorMessages` object, keeping structural parity between the English and Welsh files.

### English — `apps/web/src/pages/(admin)/media-applications/[id]/reject-en.ts`

```typescript
export const en = {
  // ...existing keys...
  errorMessages: {
    // ...existing keys...
    emailRateLimitTitle: "We could not send the email",
    emailRateLimitMessage:
      "Too many emails have been sent to this address recently. The application decision has been saved. Try sending the email again in 30 minutes."
  }
};
```

### Welsh — `apps/web/src/pages/(admin)/media-applications/[id]/reject-cy.ts`

```typescript
export const cy = {
  // ...existing keys...
  errorMessages: {
    // ...existing keys...
    emailRateLimitTitle: [WELSH TRANSLATION REQUIRED: "We could not send the email"],
    emailRateLimitMessage: [WELSH TRANSLATION REQUIRED: "Too many emails have been sent to this address recently. The application decision has been saved. Try sending the email again in 30 minutes."]
  }
};
```

### English — `approve-en.ts`

```typescript
    emailRateLimitTitle: "We could not send the email",
    emailRateLimitMessage:
      "Too many emails have been sent to this address recently. The account has been approved. Try sending the email again in 30 minutes."
```

### Welsh — `approve-cy.ts`

```typescript
    emailRateLimitTitle: [WELSH TRANSLATION REQUIRED: "We could not send the email"],
    emailRateLimitMessage: [WELSH TRANSLATION REQUIRED: "Too many emails have been sent to this address recently. The account has been approved. Try sending the email again in 30 minutes."]
```

### Content decisions

* **"We could not send the email"** — states what failed, in plain English, sentence case, no jargon. It deliberately avoids "rate limit", which is implementation vocabulary the reader has no reason to know.
* **"The application decision has been saved"** / **"The account has been approved"** — the single most important fact for the admin, because the state change already committed before the email attempt. Without it the admin's reasonable assumption is that the whole action failed, and they would retry the decision itself.
* **"Try sending the email again in 30 minutes"** — a concrete recovery action with a concrete wait. The 30 minutes is the default window; if `EMAIL_RATE_LIMIT_WINDOW_MINUTES` is ever changed away from 30 in a deployed environment, this copy becomes wrong. Flagged in §14.
* The wording does **not** include the recipient's email address, masked or otherwise. The admin already knows which application they are working on, and putting a partially-masked address on screen adds nothing while looking like a defect.
* The contact-us paragraph is supplied by `errors/common.njk` from the shared `t` object and needs no new content.

### Log message content (not user-facing, but specified for consistency)

| Site | Format |
| --- | --- |
| `rate-limit-service.ts` unknown type | `[email-rate-limit] Unknown email type "<type>", defaulting to STANDARD group` |
| `notification-service.ts` non-critical block | `[notification-service] Email rate limit exceeded for <masked> (<emailType>)` |
| `reject.ts` / `approve.ts` critical block | `<Rejection\|Approval> email blocked by rate limit: Rate limit exceeded for email <masked> in group STANDARD` |
| Invalid config value | `[email-rate-limit] Invalid <VAR_NAME> "<value>", using default <n>` |

Every one of these contains a masked address or no address at all. No log line built by this feature may interpolate a raw recipient address.

## 8. URL

**No new routes and no new pages.** The limiter is a library called from service code.

### Existing routes whose observable behaviour changes

| Route | Method | Change |
| --- | --- | --- |
| `/media-applications/:id/reject` | `POST` | Can now respond `429` with `errors/common` instead of `302` to `/media-applications/:id/rejected` when the rejection email is rate-limited |
| `/media-applications/:id/approve` | `POST` | Can now respond `429` with `errors/common` instead of redirecting to the approved confirmation when the account email is rate-limited |
| `/manual-upload-summary` | `POST` | No response change. Rate-limited subscribers are counted in the `skipped` total that `processPublication` returns and logs |
| `/non-strategic-upload-summary` | `POST` | As above |
| Blob-ingestion API routes served by `apps/api` (`libs/api/src/blob-ingestion`) | `POST` | No response change; publication processing is fire-and-forget, so rate limiting is visible only in logs and `notification_audit_log` |

### Rate-limit key format (internal, not a URL)

```
<normalised-email>:<EMAIL_LIMIT_GROUP>

user@example.com:STANDARD
user@example.com:HIGH
```

This mirrors the OG CaTH key (`email + emailLimit`) and satisfying the acceptance criterion that limits are tracked "using a unique key for each user and email type" — the group is the email-type dimension, exactly as in the reference implementation, so a user's account-email allowance is never consumed by their subscription traffic.

## 9. Validation

### Input validation — `isEmailWithinRateLimit` / `assertEmailWithinRateLimit`

| Input | Rule | Behaviour when violated |
| --- | --- | --- |
| `email` | Non-empty string after trimming | Return `false` (and `assert*` throws). An empty recipient can never produce a valid send, so failing closed is correct and no bucket entry is created for the empty key |
| `email` | Normalised by `.trim().toLowerCase()` before key construction | N/A — normalisation always applied |
| `email` | Not validated as a well-formed address | By design. Address format is Notify's and the account service's concern; the limiter must not silently permit a send just because it dislikes the address shape |
| `emailType` | Must be a key of `EMAIL_TYPE` | Falls back to the `STANDARD` group and logs a warning; the check still runs |

The callers already guarantee a non-null address before reaching the limiter — `processUserNotification` goes through `validateUserEmail`, and `processListTypeUserNotification` returns `skipped` when `subscriber.user.email` is falsy — so the empty-string rule is defence in depth rather than the primary guard.

### Configuration validation — at read time

| Variable | Rule | Behaviour when violated |
| --- | --- | --- |
| `EMAIL_RATE_LIMIT_STANDARD_CAPACITY` | Integer `>= 1` | Use `10`, log once |
| `EMAIL_RATE_LIMIT_HIGH_CAPACITY` | Integer `>= 1` | Use `200`, log once |
| `EMAIL_RATE_LIMIT_WINDOW_MINUTES` | Integer `>= 1` | Use `30`, log once |
| `EMAIL_RATE_LIMIT_ENABLED` | Exact string `"false"` disables; anything else enables | Enabled. Only an explicit `"false"` turns enforcement off, so a typo cannot accidentally remove the control |

A capacity of `0` is rejected rather than honoured as "block everything", because the far more likely cause is an unset variable expanding to an empty string in a Helm template than a deliberate intent to block all email.

### Invariants the implementation must hold

* A rejected attempt never mutates `windowEndsAt`.
* Exactly one permit is consumed per successful check, and none per rejected check.
* `STANDARD` and `HIGH` buckets for the same recipient are wholly independent.
* No function in this library performs I/O, so no call site needs to `await` it and no call site can be blocked by a store outage.

## 10. Error Messages

### User-facing (CTSC admin only)

| Condition | HTTP | Title (`h1`) | Body |
| --- | --- | --- | --- |
| Rejection email blocked | `429` | We could not send the email | Too many emails have been sent to this address recently. The application decision has been saved. Try sending the email again in 30 minutes. |
| Approval email blocked | `429` | We could not send the email | Too many emails have been sent to this address recently. The account has been approved. Try sending the email again in 30 minutes. |

Welsh equivalents are the `[TRANSLATE: ...]` markers in §7. Both render through `errors/common.njk`, which appends the shared "contact us to report it" paragraph.

`429` is used rather than `500` because the condition is a throttle, not a fault, and it is not permanent. It is not surfaced as a validation error on the originating form: the decision has already been committed, so re-rendering the form with an error summary would invite the admin to submit the decision a second time.

### Exception message (developer-facing)

```
Rate limit exceeded for email a********@example.com in group STANDARD
```

Constructed once, in `TooManyEmailsError`, from an address masked by the caller. The group name is included so that a log reader can tell immediately whether a 10-per-30-minutes or a 200-per-30-minutes threshold was hit, which is the difference between "expected for a chatty account flow" and "something is very wrong".

### Audit-log values

| Column | Value |
| --- | --- |
| `notification_audit_log.status` | `Skipped` |
| `notification_audit_log.error_message` | `Email rate limit exceeded` |

The `error_message` is a fixed string with no address in it — the row is already joined to the user by `user_id`, so repeating the address in a free-text column would only spread personal data into a field nothing queries.

### What is deliberately *not* produced

* No email to the recipient telling them they have been rate-limited — that would defeat the purpose.
* No error on the public-facing upload confirmation. A publication that reaches 200 emails to one subscriber in 30 minutes is a subscriber-side condition, not an upload failure.
* No new alerting rule in this ticket. The `skipped` count and the `[notification-service]` error lines are the raw material for one; see §14.

## 11. Navigation

### Critical path — media application decisions

| From | Event | To |
| --- | --- | --- |
| `POST /media-applications/:id/reject` (`confirm=yes`) | Email sent | `302` → `/media-applications/:id/rejected` (unchanged) |
| `POST /media-applications/:id/reject` (`confirm=yes`) | `TooManyEmailsError` | `429` render `errors/common` — **no redirect**, the URL stays on the POST target |
| `POST /media-applications/:id/reject` (`confirm=yes`) | Other Notify failure | `302` → `/media-applications/:id/rejected` (unchanged — logged only) |
| `POST /media-applications/:id/approve` | `TooManyEmailsError` | `429` render `errors/common` |

The rate-limit page is a dead end by design: it offers the contact-us link supplied by `errors/common.njk` and the browser back button, and no "try again" button. A retry button would either re-run `rejectApplication` on an already-rejected application or need a new email-only resend endpoint, neither of which is in scope. The admin's recovery route is the existing application list.

No back link is added, because `errors/common.njk` does not render one and the page is reached from a POST rather than from a step in a linear journey.

### Non-critical path — subscription notifications

Navigation is entirely unchanged. `processPublication` is invoked without being awaited by the upload controllers, so the admin reaches `/manual-upload-summary`'s confirmation regardless of how many subscribers were rate-limited.

### No navigation for subscribers

Rate-limited subscribers are not redirected, notified, or shown anything — they are not in a browser session at the time. There is no "you have reached your email limit" page and no entry point to one.

## 12. Accessibility

The one changed screen reuses `errors/common.njk` from `@hmcts/web-core`, which is already used for existing error states, so it inherits the layout's compliant structure. The requirements below are what an implementer must not break.

### Requirements

| Area | Requirement |
| --- | --- |
| Page title | `<title>` is set from `errorTitle` via `{% set title = errorTitle or t.defaultTitle %}`, so the tab title matches the `h1` — a screen-reader user hears "We could not send the email" on load, not a generic "Error" |
| Heading structure | Exactly one `h1` (`govuk-heading-l`); no heading levels skipped; no `h2` introduced |
| Not an error summary | This is a whole-page error state, not a form validation failure, so it must **not** use `govukErrorSummary`. An error summary implies focusable form fields to link to, and there are none on this page |
| Focus | Rendered as a fresh document response, so focus starts at the top of the page naturally. No JavaScript focus management is added |
| Colour and contrast | Body text uses the default `govuk-body` on white (well above 4.5:1). Status is conveyed by the heading text alone — no colour-only signalling, no red styling of the message |
| Links | The contact-us link uses `govuk-link` with descriptive text from the shared `t` object, not "click here" |
| Keyboard | Only interactive elements are the header language toggle, the skip link, the contact-us link and the footer links, all inherited from `layouts/base-template.njk` and all reachable in logical tab order |
| Skip link | Inherited from the base layout; must remain the first focusable element |
| Language | The page renders in the admin's current locale, so `<html lang>` is `en` or `cy` correctly. Welsh copy comes from the `[TRANSLATE: ...]` markers in §7 |
| Reading level | Three short sentences, plain English, no "rate limit", no "throttle", no "exception". Aim: reading age 9 |
| Motor | No time limit on the page and no auto-refresh. The 30-minute wait is stated as text; nothing on screen counts down or expires |
| Status code | `429` is sent with a full HTML page, so assistive technology receives normal document semantics rather than a bare status |

### Testing

* Axe-core scan of the rendered `429` page inline within the media-application E2E journey (see §13), asserting zero violations.
* Nunjucks template test is **not** added for `errors/common.njk` — it is pre-existing shared markup with existing coverage, and this ticket only passes new values into it.
* Locale-key parity assertion (`Object.keys(en).sort()` equals `Object.keys(cy).sort()`) on the changed `reject-*`/`approve-*` content files, so the new Welsh keys cannot be forgotten.

### WCAG 2.2 AA criteria specifically relied on

`1.3.1` Info and Relationships, `2.4.2` Page Titled, `2.4.4` Link Purpose, `2.4.6` Headings and Labels, `1.4.3` Contrast, `1.4.1` Use of Colour, `3.1.2` Language of Parts, `2.1.1` Keyboard.

## 13. Test Scenarios

Time-dependent scenarios use `vi.useFakeTimers()` / `vi.setSystemTime()`; the limiter reads `Date.now()` only, so no clock is injected. Every unit test calls `resetRateLimits()` in `beforeEach` alongside `vi.clearAllMocks()`.

### `libs/email-rate-limit/src/mask-email.test.ts`

* Masks every local-part character except the first, leaving the domain intact
* Leaves a single-character local part unchanged
* Handles a local part containing dots and a `+` tag
* Returns an empty string for an empty input
* Masks everything after the first character when the input contains no `@`
* Produces a mask length equal to the original local-part length, so the output cannot be used to infer a shorter address

### `libs/email-rate-limit/src/email-limit-group.test.ts`

* Returns 10 for `STANDARD` and 200 for `HIGH` when no environment variables are set
* Returns the configured capacity when `EMAIL_RATE_LIMIT_STANDARD_CAPACITY` / `..._HIGH_CAPACITY` are set to valid integers
* Falls back to the default and logs a warning when a capacity is non-numeric, zero, or negative
* Converts `EMAIL_RATE_LIMIT_WINDOW_MINUTES` to the correct millisecond value
* Falls back to a 30-minute window when the window variable is invalid

### `libs/email-rate-limit/src/email-type.test.ts`

* Maps each of the four `SUBSCRIPTION_*` types to the `HIGH` group
* Maps each of the three media account types to the `STANDARD` group
* Returns `STANDARD` and logs a warning for an unmapped type string
* Asserts every key of `EMAIL_TYPE` has an entry in the group map, so adding a type without a group fails the build's test run rather than silently defaulting

### `libs/email-rate-limit/src/rate-limit-service.test.ts`

* Permits exactly 10 `STANDARD`-group sends to one recipient and rejects the 11th
* Permits exactly 200 `HIGH`-group sends to one recipient and rejects the 201st
* Tracks `STANDARD` and `HIGH` independently for the same recipient — exhausting one leaves the other at full capacity
* Tracks two different recipients independently
* Treats `User@Example.com`, `user@example.com` and `  user@example.com  ` as the same key
* Refills to full capacity once the window has elapsed, and permits a send immediately after
* Does not refill at 29 minutes when the window is 30
* Does not extend the window when an attempt is rejected — after exhausting the bucket, repeated rejected attempts across 29 minutes still allow a send at 31 minutes
* Returns `true` without consuming a permit when `EMAIL_RATE_LIMIT_ENABLED` is `"false"`
* Enforces the limit when `EMAIL_RATE_LIMIT_ENABLED` is unset, `"true"`, or a typo such as `"FALSE "`
* Returns `false` for an empty or whitespace-only address
* `assertEmailWithinRateLimit` returns without throwing while permits remain
* `assertEmailWithinRateLimit` throws `TooManyEmailsError` when the bucket is exhausted, with `name` set to `TooManyEmailsError` and `emailLimitGroup` set to the resolved group
* The thrown message contains the masked address and the group name, and does **not** contain the raw local part
* `assertEmailWithinRateLimit` consumes a permit on success, so mixing it with `isEmailWithinRateLimit` for one recipient decrements once per call
* Sweeps expired buckets once the tracked-bucket ceiling is reached, while leaving live buckets and their remaining permits untouched
* `resetRateLimits` clears all buckets so a previously exhausted recipient is permitted again

### `libs/notifications/src/notification/notification-service.test.ts` (extended)

* Sends the email and records status `Sent` when the subscriber is within the `HIGH` limit
* Skips the send, makes no `sendEmail` call, and updates the audit row to `Skipped` with `Email rate limit exceeded` when the subscriber is over the limit
* Increments `NotificationResult.skipped` — not `failed` — for a rate-limited subscriber
* Continues to send to the remaining subscribers when one subscriber in a batch is rate-limited
* Logs the masked address only, asserting the raw address never appears in any `console.error` argument
* Applies the limit in `processListTypeUserNotification` as well as `processUserNotification`
* Passes the `emailType` derived from the selected template, so an SJP Excel-only send is checked against the `HIGH` group

### `libs/notifications/src/govnotify/template-config.test.ts` (extended)

* `getSubscriptionTemplateId` returns an `emailType` alongside the template ID for each of its four branches
* Each returned `emailType` resolves to the `HIGH` group

### `libs/notification/src/govuk-notify-service.test.ts` (extended)

* `sendMediaRejectionEmail` sends normally while within the `STANDARD` limit
* `sendMediaRejectionEmail` throws `TooManyEmailsError` and never constructs a `NotifyClient` once the limit is exceeded
* Same pair of assertions for `sendMediaNewAccountEmail` and `sendMediaDuplicateAccountEmail`
* The rate-limit check runs after the missing-configuration guards, so an unconfigured template ID still throws its own configuration error rather than consuming a permit

### `apps/web/src/pages/(admin)/media-applications/[id]/reject.test.ts` (extended)

* Redirects to the rejected confirmation when the email succeeds
* Renders `errors/common` with status `429` and the rate-limit title and message when the send throws `TooManyEmailsError`
* Renders the Welsh copy when the request locale is `cy`
* Still calls `rejectApplication` before the blocked email attempt, proving the decision is persisted
* Keeps the existing behaviour — log and redirect — for a non-rate-limit Notify error
* Equivalent scenarios for `approve.test.ts`

### Locale parity

* Keys of `en` and `cy` match for `reject-*` and `approve-*` content files

### E2E — `e2e-tests/tests/` (one journey test, tagged `@nightly`)

* A single journey covering: a CTSC admin signs in, opens a media application, rejects it, and the confirmation is reached; then with the `STANDARD` capacity fixture reduced so the limit is already exhausted, a second application rejection surfaces the "We could not send the email" page. Within the same test, assert the `429` page's `h1`, run an inline Axe-core scan expecting zero violations, switch to Welsh and assert the translated heading, and tab to the contact-us link to confirm keyboard reachability. No separate tests for the accessibility check, the Welsh check, or the validation copy.

### Not tested

* GOV.UK Notify's own per-service sending limits — out of our control and not what this ticket implements.
* Cross-pod aggregate behaviour — the limiter is per-process by design (§14), so an assertion about a global count across replicas would encode a guarantee the implementation does not make.

## 14. Assumptions & Open Questions

### Assumptions made

* **The image attached to the issue confirms the two groups and their values.** This spec is built on the AC text — `STANDARD` = 10 per 30 minutes, `HIGH` = 200 per 30 minutes — which matches OG CaTH's `EmailLimit.STANDARD` / `EmailLimit.HIGH` and its `Refill.intervally(capacity, Duration.ofMinutes(30))` bandwidth. If the image shows a third group or a different window, §6.2 changes but nothing else does.
* **The `HIGH` group covers the subscription templates; everything else is `STANDARD`.** In OG CaTH, `EmailLimit` is a field on each `Templates` constant, and the high-capacity constants are the subscription/publication ones. `Templates.java` could not be fetched during spec writing (network access was declined), so the mapping in §6.3 was derived from the templates that exist *in this codebase* plus that rationale. **An implementer must open `Templates.java` and confirm the group for each of the seven types in §6.3 before merging.** The mapping is a single object literal, so a correction is a one-line change per type.
* **The limiter is per-process, not distributed.** OG CaTH holds buckets in an in-process `ConcurrentHashMap`, and the AC asks for "the same implementation". Consequence: with *n* replicas the worst-case effective allowance is *n* × capacity. `apps/web` runs under an HPA and `apps/api` also processes publications, so this is a real divergence from the nominal figures, not a theoretical one. It is accepted here because (a) it matches the reference implementation, (b) the control's purpose is preventing floods rather than exact accounting, and (c) a shared store adds an I/O dependency and a failure mode to every send.
* **Redis is deliberately not used.** `@hmcts/redis` exists and `apps/web` has a Redis connection, but `apps/api` has no `config/` directory, so `config.get("redis.url")` inside `@hmcts/redis` would throw there — and `apps/api` is on the publication-notification path. Making the limiter Redis-backed therefore means either adding a config directory to `apps/api` or reading `REDIS_URL` directly, plus deciding what happens when Redis is unavailable mid-batch. Out of scope; see the deferred item below.
* **`TooManyEmailsError`, not `TooManyEmailsException`.** The AC names `TooManyEmailsException`; this spec uses the `Error` suffix per JavaScript convention. Assumed to be a description of the OG CaTH counterpart rather than a required identifier.
* **Media account emails are the "critical operations" and subscription emails are the "non-critical operations".** The AC distinguishes the two but does not enumerate them. Assignment is by whether a human is waiting on the result of a single send.
* **`errors/common.njk` with a `429` is an acceptable admin-facing surface.** No bespoke page is created.
* **No new database table.** Counters are in memory; `notification_audit_log` already records outcomes.
* **The 30-minute wait is safe to hardcode in user-facing copy** as long as `EMAIL_RATE_LIMIT_WINDOW_MINUTES` stays at its default in deployed environments.

### Open questions

1. **Does `Templates.java` group any non-subscription template as `HIGH`?** Specifically, are OTP/sign-in or system-admin notification templates high-capacity in OG CaTH? CaTH has no equivalents today, but the answer determines the rule an implementer applies when the next template is added.
2. **Are the OG CaTH values 10/200 per 30 minutes per *recipient*, or per recipient *and* template?** OG CaTH keys on `email + EmailLimit` (the group), which this spec reproduces. Confirm the ticket's "unique key for each user and email type" means the group and not the individual template — per-template keying would multiply a user's effective subscription allowance by four.
3. **Should a blocked *approval* email leave the account approved?** This spec keeps the current ordering, so yes. If product would rather the whole action fail atomically, the state change has to move after the email and the controllers need a transaction — a materially larger change.
4. **Is `429` the right status for the admin page, or should it be `503`?** `429` is semantically accurate; confirm no HMCTS gateway or WAF in front of the service treats a `429` from the origin specially.
5. **Should rate-limited subscription sends be retried later?** Currently they are dropped and the recipient never receives that publication notification. A retry queue is a separate piece of work; confirm dropping is acceptable.
6. **What should the AC's "customisable based on the email type and user" mean for the *user* dimension?** This spec is customisable per email type (via group) and per user (each recipient has independent buckets), but has no per-user *override* — no way to give a specific account a larger allowance. If per-account overrides are wanted, that needs a data model and an admin UI, neither of which is in this ticket.
7. **Is there a monitoring requirement?** Application Insights is wired into both apps. Confirm whether a dashboard or alert on rate-limit blocks is expected in this ticket or a follow-up.

### Deferred / follow-up work

* Redis-backed distributed limiter, so the limit is the stated figure regardless of replica count. Requires resolving the `apps/api` config problem, choosing a fail-open or fail-closed policy for Redis outages, and a Lua `INCR`+`EXPIRE` script for atomicity.
* Alerting on sustained rate-limit blocks, which would indicate either abuse or a notification-loop defect.
* Surfacing `Skipped` counts with their reasons in the system-admin notification views, so support can answer "why did this user not get their email" without reading logs.

### Risks

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Group mapping guessed wrong for a subscription template | A legitimate high-volume subscriber silently stops receiving publication emails after 10 in 30 minutes | Verify against `Templates.java` before merge (see assumptions); mapping is one object literal |
| Per-pod counting under HPA | Effective limit is a multiple of the nominal figure | Accepted, matches OG CaTH; documented; Redis path deferred |
| A future email send added without a rate-limit call | Silent gap in the control | The type-completeness assertion in `email-type.test.ts` catches a missing *group*, but not a missing *call site*. Code review is the only guard; consider routing all Notify calls through one function in a follow-up |
| Rate limiting during a genuine large publication fan-out | Subscribers with many subscriptions lose notifications | 200 per 30 minutes is the OG CaTH-proven figure; monitor `skipped` counts after release |

### Comment by OgechiOkelu on 2026-08-20T14:21:35Z

@plan
