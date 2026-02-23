# Implementation Tasks: #358 - Implement Rate Limiting for Email Notifications

## Implementation Tasks

- [ ] Add `emailType` field to `NotificationAuditLog` in `libs/notifications/prisma/schema.prisma` with `@default("SUBSCRIPTION") @map("email_type")` and add `@@index([userId, emailType, createdAt])`
- [ ] Run `yarn db:migrate:dev` to generate and apply the migration for the `email_type` column
- [ ] Run `yarn db:generate` to regenerate the Prisma client
- [ ] Add `countEmailsSentInWindow(userId, emailType, windowStart)` query function to `libs/notifications/src/notification/notification-queries.ts`
- [ ] Update `CreateNotificationData` interface and `createNotificationAuditLog` in `notification-queries.ts` to support optional `emailType` field (defaulting to `"SUBSCRIPTION"`)
- [ ] Create `libs/notifications/src/rate-limiting/too-many-emails-exception.ts` exporting `TooManyEmailsException` extending `Error`
- [ ] Create `libs/notifications/src/rate-limiting/email-rate-limiter.ts` exporting `maskEmail`, `getRateLimitConfig`, and `checkEmailRateLimit` with env-var-backed defaults
- [ ] Integrate `checkEmailRateLimit` into `processUserNotification` in `libs/notifications/src/notification/notification-service.ts`, after email validation and before the "Pending" audit log entry is created
- [ ] Write unit tests for `too-many-emails-exception.ts`
- [ ] Write unit tests for `email-rate-limiter.ts` covering: `maskEmail` edge cases, `getRateLimitConfig` for all three email types and unknown types, `checkEmailRateLimit` with missing `userId`, count below limit, non-critical limit exceeded, critical limit exceeded, and env-var overrides
- [ ] Write unit tests for updated `notification-queries.ts` covering `countEmailsSentInWindow` and the `emailType` field in `createNotificationAuditLog`
- [ ] Update unit tests for `notification-service.ts` to cover the three rate-limit outcomes: allowed, non-critical skipped, critical failed
- [ ] Run `yarn test` to verify all tests pass
- [ ] Run `yarn lint:fix` to ensure no linting issues
