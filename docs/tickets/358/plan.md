# Technical Plan: #358 - Implement Rate Limiting for Email Notifications

## 1. Overview

Add application-level rate limiting to `libs/notifications` to prevent a single user from receiving an excessive number of emails of a given type within a configured time window. The implementation uses the existing `notification_audit_log` table as the counter store, extended with an `email_type` column. No new infrastructure dependency (Redis, separate counter table) is introduced.

---

## 2. Architecture Decisions

### Why the existing `notification_audit_log` table?

The audit log is already the source of truth for every email sent. Counting rows in that table for a given `userId` and `emailType` within a time window is an exact, durable count with no risk of the counter diverging from reality. Adding a Redis cache or a separate counter table would introduce a new dependency and a new failure mode (counter out of sync with actual sends). Using the audit log keeps the system simple and coherent.

The trade-off is that the count query hits the database on every `processUserNotification` call. At the expected scale (publication events triggering hundreds of subscriber notifications), this is acceptable. The composite index `[userId, emailType, createdAt]` ensures the query is a fast index scan.

### Why a fixed/tumbling window?

A fixed window (e.g. "count rows in the last hour") is straightforward to implement with a single `COUNT` query using `createdAt >= windowStart`. A sliding window would require more complex logic or a dedicated data structure. The simpler approach is appropriate here: the spec calls for preventing abuse, not precise fairness accounting.

### Why an `email_type` column rather than a separate table?

The column makes every audit row self-describing. It enables the rate-limit count query with a single index and means no join is needed. It also makes future reporting (e.g. "how many SUBSCRIPTION emails were sent this week?") trivial.

### Critical vs non-critical distinction

`SUBSCRIPTION` emails are non-critical: a subscriber missing one publication alert is a minor inconvenience. The service should log and skip rather than halt. `MEDIA_APPROVAL` and `MEDIA_REJECTION` emails are critical: sending the wrong number could have legal or operational consequences. Throwing `TooManyEmailsException` for critical types surfaces the problem immediately to the caller so it can be handled explicitly.

---

## 3. Implementation Details

### 3.1 Schema change

**File: `libs/notifications/prisma/schema.prisma`**

Add `emailType` field to `NotificationAuditLog` and a composite index:

```prisma
model NotificationAuditLog {
  notificationId String    @id @default(uuid()) @map("notification_id") @db.Uuid
  subscriptionId String    @map("subscription_id") @db.Uuid
  userId         String    @map("user_id") @db.Uuid
  publicationId  String    @map("publication_id") @db.Uuid
  govNotifyId    String?   @map("gov_notify_id")
  status         String    @default("Pending")
  emailType      String    @default("SUBSCRIPTION") @map("email_type")
  errorMessage   String?   @map("error_message")
  createdAt      DateTime  @default(now()) @map("created_at")
  sentAt         DateTime? @map("sent_at")

  subscription Subscription @relation(fields: [subscriptionId], references: [subscriptionId])

  @@index([publicationId])
  @@index([status])
  @@index([govNotifyId])
  @@index([userId, emailType, createdAt])
  @@map("notification_audit_log")
}
```

The `@default("SUBSCRIPTION")` means all existing rows and any row that omits `emailType` remain valid without a data migration.

After editing the schema, run:
```bash
yarn db:migrate:dev   # generates and applies the migration
yarn db:generate      # regenerates the Prisma client
```

---

### 3.2 New file: `libs/notifications/src/rate-limiting/too-many-emails-exception.ts`

A typed exception class for critical rate-limit breaches. A class is used here (not a plain function) because it must extend `Error` to be distinguishable from generic errors in catch blocks.

```typescript
export class TooManyEmailsException extends Error {
  constructor(maskedEmail: string, emailType: string) {
    super(`Rate limit exceeded for ${emailType} emails to ${maskedEmail}`);
    this.name = "TooManyEmailsException";
  }
}
```

---

### 3.3 New file: `libs/notifications/src/rate-limiting/email-rate-limiter.ts`

This file owns the rate-limit configuration lookup, the email masking utility, and the `checkEmailRateLimit` function.

**Constants (read once at module load, matching the pattern in `govnotify-client.ts`):**

```
RATE_LIMIT_SUBSCRIPTION_MAX       (default: 100)
RATE_LIMIT_SUBSCRIPTION_WINDOW_MS (default: 3600000)
RATE_LIMIT_MEDIA_APPROVAL_MAX       (default: 5)
RATE_LIMIT_MEDIA_APPROVAL_WINDOW_MS (default: 86400000)
RATE_LIMIT_MEDIA_REJECTION_MAX       (default: 5)
RATE_LIMIT_MEDIA_REJECTION_WINDOW_MS (default: 86400000)
```

**`RateLimitConfig` type:**

```typescript
type RateLimitConfig = {
  maxEmails: number;
  windowMs: number;
  isCritical: boolean;
};
```

**`maskEmail(email: string): string`**

Masks the local part of an email address, exposing only the first character, to protect PII in logs and error messages. Format: `u***@domain.com`. If the local part is a single character, the result is `u***@domain.com`. If the email is malformed (no `@`), the entire string is masked as `***`.

```typescript
export function maskEmail(email: string): string {
  const atIndex = email.indexOf("@");
  if (atIndex <= 0) return "***";
  return `${email[0]}***${email.slice(atIndex)}`;
}
```

**`getRateLimitConfig(emailType: string): RateLimitConfig`**

Returns config for a given email type using the env-var constants. Falls through to `SUBSCRIPTION` defaults for unrecognised types to avoid hard failures if a new type is introduced before config is wired.

**`checkEmailRateLimit(userId: string, emailType: string, emailAddress?: string): Promise<void>`**

1. Validates `userId` is present; throws a plain `Error` if not.
2. Calls `getRateLimitConfig(emailType)`.
3. Computes `windowStart = new Date(Date.now() - config.windowMs)`.
4. Calls `countEmailsSentInWindow(userId, emailType, windowStart)` (from `notification-queries.ts`).
5. If `count >= config.maxEmails`:
   - If `config.isCritical`: throws `TooManyEmailsException(maskedEmail, emailType)`.
   - Otherwise: throws a plain `Error` with message: `Rate limit exceeded: ${emailType} emails to ${masked} (userId: ${userId}). Limit: ${config.maxEmails} per ${config.windowMs}ms`.
6. Resolves with `undefined` if under the limit (caller proceeds normally).

The function accepts an optional `emailAddress` purely for inclusion in the error message. It is masked before use. If omitted, the masked portion of the error message is omitted or replaced with a placeholder.

---

### 3.4 Modified file: `libs/notifications/src/notification/notification-queries.ts`

**Changes:**

1. Add optional `emailType?: string` to `CreateNotificationData`.
2. Update `createNotificationAuditLog` to persist `emailType` (defaulting to `"SUBSCRIPTION"` if absent).
3. Add `countEmailsSentInWindow`:

```typescript
export async function countEmailsSentInWindow(
  userId: string,
  emailType: string,
  windowStart: Date
): Promise<number> {
  return prisma.notificationAuditLog.count({
    where: {
      userId,
      emailType,
      createdAt: { gte: windowStart }
    }
  });
}
```

The query uses the `@@index([userId, emailType, createdAt])` index added in the schema change for efficient execution.

---

### 3.5 Modified file: `libs/notifications/src/notification/notification-service.ts`

**Changes to `processUserNotification`:**

Call `checkEmailRateLimit` after email validation but before creating the "Pending" audit log entry, so that rate-limited sends do not create dangling `Pending` records.

```
1. Validate email present and well-formed  →  skip (existing logic)
2. checkEmailRateLimit(userId, "SUBSCRIPTION", email)
     - If non-critical Error thrown: catch, create Skipped audit log, return { status: "skipped" }
     - If TooManyEmailsException thrown: let it propagate (caller records as failed)
3. Create "Pending" audit log entry
4. Build template parameters and sendEmail
5. Update audit log: Sent or Failed
```

The `emailType` value passed to `createNotificationAuditLog` from this path will be `"SUBSCRIPTION"`.

---

## 4. Rate Limit Configuration Reference

| Email Type       | Env var (max)                       | Default | Env var (window ms)                    | Default (ms)        | Critical |
|------------------|-------------------------------------|---------|----------------------------------------|---------------------|----------|
| `SUBSCRIPTION`   | `RATE_LIMIT_SUBSCRIPTION_MAX`       | `100`   | `RATE_LIMIT_SUBSCRIPTION_WINDOW_MS`    | `3600000` (1h)      | No       |
| `MEDIA_APPROVAL` | `RATE_LIMIT_MEDIA_APPROVAL_MAX`     | `5`     | `RATE_LIMIT_MEDIA_APPROVAL_WINDOW_MS`  | `86400000` (24h)    | Yes      |
| `MEDIA_REJECTION`| `RATE_LIMIT_MEDIA_REJECTION_MAX`    | `5`     | `RATE_LIMIT_MEDIA_REJECTION_WINDOW_MS` | `86400000` (24h)    | Yes      |

These variables should be documented in the service's environment variable reference and set in the Helm chart / Kubernetes deployment config per environment.

---

## 5. Error Handling

| Condition | Type thrown | Message format | Caller behaviour |
|-----------|-------------|----------------|-----------------|
| `userId` missing | Plain `Error` | `userId is required for rate limit check` | Propagates as `failed` result |
| Non-critical limit exceeded | Plain `Error` | `Rate limit exceeded: SUBSCRIPTION emails to t***@example.com (userId: abc-123). Limit: 100 per 3600000ms` | Caught in `processUserNotification`, audit log set to `Skipped`, result `skipped` |
| Critical limit exceeded | `TooManyEmailsException` | `Rate limit exceeded for MEDIA_APPROVAL emails to t***@example.com` | Propagates out of `processUserNotification`, recorded as `failed` in `NotificationResult` |

`maskEmail` is called on any email address before it is included in an error message or log statement. This applies inside `email-rate-limiter.ts` only; the rest of the codebase does not need to mask emails specifically for rate-limit messages.

---

## 6. File Structure After Implementation

```
libs/notifications/src/
├── govnotify/
│   ├── govnotify-client.ts       (unchanged)
│   └── template-config.ts        (unchanged)
├── notification/
│   ├── notification-queries.ts   (modified: emailType field, countEmailsSentInWindow)
│   ├── notification-service.ts   (modified: checkEmailRateLimit integration)
│   ├── subscription-queries.ts   (unchanged)
│   └── validation.ts             (unchanged)
└── rate-limiting/
    ├── email-rate-limiter.ts     (new)
    └── too-many-emails-exception.ts (new)
```

---

## 7. Testing Approach

### Unit tests for `too-many-emails-exception.ts`
- Exception is instance of `Error`
- `name` property is `"TooManyEmailsException"`
- Message matches expected format with masked email and email type

### Unit tests for `email-rate-limiter.ts`

Mock `countEmailsSentInWindow` from `notification-queries.ts`.

Scenarios to cover:
- `maskEmail`: valid email, single-char local part, no `@`, empty string
- `getRateLimitConfig`: each of the three types, an unknown type
- `checkEmailRateLimit`: missing `userId` throws plain Error
- `checkEmailRateLimit`: count below limit resolves without error
- `checkEmailRateLimit`: count at limit, non-critical type, throws plain Error with correct message
- `checkEmailRateLimit`: count at limit, critical type, throws `TooManyEmailsException`
- `checkEmailRateLimit`: env vars override defaults (set env vars before calling)

### Unit tests for updated `notification-queries.ts`
- `countEmailsSentInWindow`: verify Prisma `count` is called with correct `where` clause (mock `prisma`)
- `createNotificationAuditLog`: verify `emailType` is passed through to `prisma.notificationAuditLog.create`

### Unit tests for updated `notification-service.ts`
- Rate limit not reached: email is sent, result is `sent`
- Non-critical rate limit exceeded: `processUserNotification` returns `skipped`, audit log created with `Skipped` status
- Critical rate limit exceeded: exception propagates, result recorded as `failed`

---

## 8. Clarifications Needed

**Should `checkEmailRateLimit` be applied to `libs/notification` (media emails)?**

The `libs/notification` module (`sendMediaApprovalEmail`, `sendMediaRejectionEmail` in `govuk-notify-service.ts`) has no database dependency and no audit log. Adding rate limiting there would require either pulling in `@hmcts/postgres` (introducing a new dependency to that module) or implementing a separate in-memory approach (which does not survive restarts and diverges from the audit log pattern). The spec marks `MEDIA_APPROVAL` and `MEDIA_REJECTION` as critical types, implying they should be rate-limited, but these types are currently sent via `libs/notification` not `libs/notifications`. This needs a decision before implementation: either migrate media emails into the `libs/notifications` audit-log flow, or accept that media emails are not rate-limited in this iteration.

**Default limit validation**

The defaults of 100 SUBSCRIPTION emails per hour and 5 MEDIA_APPROVAL/REJECTION per 24 hours have not been validated against actual usage volumes. If a publication event triggers more than 100 subscribers at a single location, the 101st subscriber in alphabetical order will be skipped in that hour. This should be reviewed against production subscriber counts before these values are finalised.

**Application Insights integration**

The spec asks whether rate-limit events should be tracked via `trackException`. This is not in scope for this ticket but should be confirmed: if Application Insights is already wired into the service, routing `TooManyEmailsException` instances through it would give operational visibility at no extra effort.

**Admin override mechanism**

Explicitly out of scope per the open questions in the spec. No bypass mechanism will be implemented.
