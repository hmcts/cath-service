# Technical Plan — #358: Email Rate Limiting

## 1. Scope Decision

**In scope:** `SUBSCRIPTION` emails only, routed through `libs/notifications`.

**Out of scope (this ticket):** `MEDIA_APPROVAL` and `MEDIA_REJECTION` emails. Those are sent by `libs/notification` (singular), which has no database dependency. Adding rate limiting there would require either introducing `@hmcts/postgres` into that module or restructuring the send path — a separate architectural decision. `TooManyEmailsException` and the `isCritical` config flag are still implemented now so the infrastructure is ready when that work is scoped.

---

## 2. Architecture

### New files

```
libs/notifications/src/rate-limiting/
├── too-many-emails-exception.ts   # Custom error class
└── email-rate-limiter.ts          # checkEmailRateLimit(), maskEmail()
```

### Modified files

| File | Change |
|---|---|
| `libs/notifications/prisma/schema.prisma` | Add `emailType` field + compound index to `NotificationAuditLog` |
| `libs/notifications/src/notification/notification-queries.ts` | Add `emailType` to `CreateNotificationData`; update `createNotificationAuditLog`; add `countEmailsSentInWindow` |
| `libs/notifications/src/notification/notification-service.ts` | Call `checkEmailRateLimit` inside `processUserNotification` before audit log creation |

---

## 3. Schema Change and Migration

Add to `NotificationAuditLog` in `libs/notifications/prisma/schema.prisma`:

```prisma
emailType  String   @default("SUBSCRIPTION") @map("email_type")

@@index([userId, emailType, createdAt])
```

The `@default("SUBSCRIPTION")` ensures existing rows are unaffected by the migration. The compound index covers the `countEmailsSentInWindow` query which filters on all three columns.

After editing the schema, run:

```bash
yarn db:migrate:dev   # creates and applies the migration
yarn db:generate      # regenerates Prisma client
```

---

## 4. Integration into `processUserNotification`

Current flow in `notification-service.ts`:

```
validateUserEmail → createNotificationAuditLog → sendEmail → updateNotificationStatus
```

Updated flow:

```
validateUserEmail → checkEmailRateLimit → createNotificationAuditLog → sendEmail → updateNotificationStatus
```

The rate limit check is placed after `validateUserEmail` (so we skip users with no email before doing a DB count) and before `createNotificationAuditLog` (so no audit record is created for sends that are blocked).

**Error handling:**

- `checkEmailRateLimit` for a non-critical type (`SUBSCRIPTION`) throws a plain `Error` when the limit is exceeded. `processUserNotification` wraps the call in a dedicated try/catch and returns `{ status: "skipped", error: ... }`.
- `checkEmailRateLimit` for a critical type throws `TooManyEmailsException`. Because this is not caught by the dedicated rate-limit try/catch (which only catches non-`TooManyEmailsException` errors), it propagates to the outer catch block and is returned as `{ status: "failed", error: ... }`.
- Any other unexpected error from `checkEmailRateLimit` is treated the same as any other unexpected error — caught by the outer try/catch and returned as `{ status: "failed" }`.

Concretely, in `processUserNotification`:

```typescript
try {
  await checkEmailRateLimit(subscription.userId, subscription.user.email!, "SUBSCRIPTION");
} catch (error) {
  if (error instanceof TooManyEmailsException) throw error;  // re-throw; outer catch handles as failed
  const errorMessage = error instanceof Error ? error.message : String(error);
  return { status: "skipped", error: `User ${subscription.userId}: ${errorMessage}` };
}
```

---

## 5. Environment Variable Configuration

`email-rate-limiter.ts` reads config at call time (not module load) so tests can override `process.env` without module re-loading:

| Email type | Max env var | Default | Window env var | Default |
|---|---|---|---|---|
| `SUBSCRIPTION` | `RATE_LIMIT_SUBSCRIPTION_MAX` | `100` | `RATE_LIMIT_SUBSCRIPTION_WINDOW_MS` | `3600000` (1 h) |
| `MEDIA_APPROVAL` | `RATE_LIMIT_MEDIA_APPROVAL_MAX` | `5` | `RATE_LIMIT_MEDIA_APPROVAL_WINDOW_MS` | `86400000` (24 h) |
| `MEDIA_REJECTION` | `RATE_LIMIT_MEDIA_REJECTION_MAX` | `5` | `RATE_LIMIT_MEDIA_REJECTION_WINDOW_MS` | `86400000` (24 h) |

Invalid or missing env var values fall back to the defaults. The `isCritical` flag is hardcoded per type (only `SUBSCRIPTION` is non-critical) and is not env-configurable.

---

## 6. `maskEmail` Behaviour

| Input | Output |
|---|---|
| `test@example.com` | `t***@example.com` |
| `a@b.com` | `a***@b.com` |
| `@domain.com` (empty local part) | `***@***` |
| `nodomain` (no `@`) | `***@***` |

Implementation: split on `@`; if the split does not produce exactly two non-empty parts, return `***@***`; otherwise return `localPart[0] + "***@" + domain`.

---

## 7. Test Approach

All tests are unit tests co-located with their source files using Vitest.

**`too-many-emails-exception.test.ts`**
- Constructor sets `name`, `message`, and preserves `maskedEmail`/`emailType` args.
- `instanceof Error` is true.

**`email-rate-limiter.test.ts`**
- Mock `countEmailsSentInWindow` via `vi.mock`.
- Does not throw when count is below limit.
- Throws `TooManyEmailsException` when count equals limit for a critical type.
- Throws plain `Error` when count equals limit for a non-critical type.
- Window start is calculated correctly from `windowMs`.
- Counts are scoped per `userId` + `emailType` (separate users / types are independent).
- Reads limit and window from env vars; falls back to defaults when absent or `NaN`.
- `maskEmail` covers standard address, empty local part, and missing `@`.

**`notification-queries.test.ts`** (additions only)
- `createNotificationAuditLog` persists `emailType` field.
- `countEmailsSentInWindow` queries with correct `userId`, `emailType`, and `createdAt` filter.

**`notification-service.test.ts`** (additions only)
- Rate limit not exceeded: email sent, result is `sent`.
- Rate limit exceeded (non-critical): `checkEmailRateLimit` throws plain `Error`; result is `skipped`; `sendEmail` not called.
- Rate limit exceeded (critical): `checkEmailRateLimit` throws `TooManyEmailsException`; result is `failed`; `sendEmail` not called.
