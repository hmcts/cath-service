# Tasks — #358: Email Rate Limiting

## Implementation Checklist

- [x] **1. Add `emailType` to schema and create migration**
  - In `libs/notifications/prisma/schema.prisma`, add `emailType String @default("SUBSCRIPTION") @map("email_type")` to `NotificationAuditLog`
  - Add `@@index([userId, emailType, createdAt])` to `NotificationAuditLog`
  - Run `yarn db:migrate:dev` to generate and apply the migration

- [x] **2. Regenerate Prisma client**
  - Run `yarn db:generate`

- [x] **3. Create `too-many-emails-exception.ts`**
  - Path: `libs/notifications/src/rate-limiting/too-many-emails-exception.ts`
  - Class `TooManyEmailsException extends Error`
  - Constructor: `(maskedEmail: string, emailType: string)`
  - Sets `this.name = "TooManyEmailsException"` and message `"Rate limit exceeded for ${emailType} emails to ${maskedEmail}"`

- [x] **4. Create `email-rate-limiter.ts`**
  - Path: `libs/notifications/src/rate-limiting/email-rate-limiter.ts`
  - Export `maskEmail(email: string): string`
  - Export `checkEmailRateLimit(userId: string, email: string, emailType: string): Promise<void>`
  - Read `RateLimitConfig` from env vars at call time with defaults (see plan)
  - Throw `TooManyEmailsException` for critical types; plain `Error` for non-critical types when limit is reached

- [x] **5. Update `notification-queries.ts`**
  - Add `emailType?: string` to `CreateNotificationData` (defaults to `"SUBSCRIPTION"` in the query)
  - Persist `emailType` in `createNotificationAuditLog`
  - Add `countEmailsSentInWindow(userId: string, emailType: string, windowStart: Date): Promise<number>`

- [x] **6. Update `notification-service.ts`**
  - In `processUserNotification`, after `validateUserEmail` and before `createNotificationAuditLog`, call `checkEmailRateLimit`
  - Wrap the call in a dedicated try/catch: re-throw `TooManyEmailsException` (outer catch handles it as `failed`); return `{ status: "skipped", error: ... }` for plain `Error`

- [x] **7. Unit tests for `too-many-emails-exception.ts`**
  - `instanceof Error` is true
  - `name` is `"TooManyEmailsException"`
  - Message matches expected format

- [x] **8. Unit tests for `email-rate-limiter.ts`**
  - Does not throw when count is below limit
  - Throws `TooManyEmailsException` at limit for a critical type
  - Throws plain `Error` at limit for a non-critical type
  - Window start is derived correctly from `windowMs`
  - Counts are scoped per `userId` + `emailType`
  - Reads limit and window from env vars; falls back to defaults when absent or invalid
  - `maskEmail`: standard address, empty local part, missing `@`

- [x] **9. Unit tests for updated `notification-queries.ts`**
  - `createNotificationAuditLog` persists `emailType`
  - `countEmailsSentInWindow` calls Prisma with correct `userId`, `emailType`, and `createdAt` filter

- [x] **10. Unit tests for updated `notification-service.ts`**
  - Rate limit not exceeded: email is sent, result is `sent`
  - Rate limit exceeded (non-critical plain `Error`): result is `skipped`, `sendEmail` not called
  - Rate limit exceeded (`TooManyEmailsException`): result is `failed`, `sendEmail` not called

- [x] **11. Verify**
  - Run `yarn lint:fix` — no errors
  - Run `yarn test` — all tests pass
