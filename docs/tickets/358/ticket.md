# #358: Implement Rate Limiting for Email Notifications

**State:** OPEN
**Assignees:** Daniel Alao
**Author:** junaidiqbalmoj
**Labels:** _(none)_
**Created:** 2026-02-12T15:27:08Z
**Updated:** 2026-03-30T10:06:32Z

## Description

I want to enforce a rate limit on the number of emails sent to a user within a specific time frame, So that the system can prevent abuse and ensure fair usage of email notifications.

1. The system should track email sending limits using a unique key for each user and email type.
2. If the rate limit is exceeded:
   - The system should throw a TooManyEmailsException for critical operations.
   - The system should log an error message for non-critical operations
3. The email address in error messages should be masked for security.
4. The rate limit configuration should be customisable based on the email type and user.

## Comments

### Comment by OgechiOkelu on 2026-02-23T13:18:23Z
@SPEC new-feature.md

---

### Comment by hmctsclaudecode on 2026-02-23T13:22:29Z

## 1. User Story
**As a** system administrator
**I want to** enforce configurable rate limits on emails sent to each user per email type
**So that** the system prevents abuse, protects GOV.UK Notify API quotas, and ensures fair usage of email notifications

---

## 2. Background

The CATH service sends email notifications via the GOV.UK Notify API from the `libs/notifications` module. Currently, `notification-service.ts` sends emails to all active subscribers for a publication event without any cap on how many emails a single user can receive within a time window.

As the service scales, a misbehaving publication pipeline or a data anomaly could trigger hundreds of emails to the same address in a short period. GOV.UK Notify enforces its own API-level rate limits, but the service has no application-level gate. This feature adds an application-level rate limiter that:

- Tracks email counts per user + email type using the existing `notification_audit_log` table (extended with an `email_type` column) as the source of truth.
- Throws `TooManyEmailsException` for critical email types (e.g. media approval/rejection) where exceeding the limit should halt processing.
- Logs an error and skips sending for non-critical email types (e.g. subscription notifications) where missing one notification is acceptable.
- Masks email addresses in all rate-limit error messages.
- Allows per-type limits to be configured via environment variables.

Existing patterns relied upon:
- Retry/backoff in `libs/notifications/src/govnotify/govnotify-client.ts`
- Notification audit logging in `libs/notifications/src/notification/notification-queries.ts`
- Error aggregation in `libs/notifications/src/notification/notification-service.ts`

---

## 3. Acceptance Criteria

* **Scenario:** Rate limit not yet reached – email is sent normally
    * **Given** a user has received fewer emails of a given type than the configured limit within the active time window
    * **When** the notification service attempts to send another email of that type
    * **Then** the email is sent successfully and the audit log is updated as `Sent`

* **Scenario:** Rate limit exceeded on a non-critical email type
    * **Given** a user has reached the configured limit for `SUBSCRIPTION` emails in the current time window
    * **When** the notification service attempts to send another subscription email to that user
    * **Then** the email is not sent, the audit log entry is set to `Skipped`, and an error is logged containing the masked email address and a message indicating the rate limit was exceeded

* **Scenario:** Rate limit exceeded on a critical email type
    * **Given** a user has reached the configured limit for `MEDIA_APPROVAL` or `MEDIA_REJECTION` emails in the current time window
    * **When** the notification service attempts to send another email of that type
    * **Then** a `TooManyEmailsException` is thrown with the masked email address and the email is not sent

* **Scenario:** Rate limit key is unique per user and email type
    * **Given** user A has reached the limit for `SUBSCRIPTION` emails
    * **When** user B sends their first `SUBSCRIPTION` email, or user A sends a `MEDIA_APPROVAL` email
    * **Then** neither of those sends is blocked, only user A's `SUBSCRIPTION` emails are rate-limited

* **Scenario:** Rate limit window resets after the configured period
    * **Given** a user has reached the limit within window W
    * **When** window W expires and a new window begins
    * **Then** the user can receive emails again up to the configured limit

* **Scenario:** Email address is masked in all rate-limit error messages
    * **Given** rate limiting produces an error message
    * **When** the error is logged or thrown
    * **Then** the email address appears as `u***@domain.com` (first character of local part, `***`, then `@domain`)

* **Scenario:** Rate limits are configurable per email type
    * **Given** environment variables `RATE_LIMIT_SUBSCRIPTION_MAX`, `RATE_LIMIT_SUBSCRIPTION_WINDOW_MS`, etc. are set
    * **When** the application starts
    * **Then** the rate limiter uses those values instead of the defaults

---

## 4. User Journey Flow

This is a service-layer feature with no browser user journey. The flow describes internal processing:

```
Publication event received
         │
         ▼
notification-service.ts: processUserNotification()
         │
         ▼
  checkEmailRateLimit(userId, emailType)
         │
    ┌────┴────────────────────────────┐
    │ Count emails in audit log       │
    │ WHERE userId = ?                │
    │   AND email_type = ?            │
    │   AND created_at >= windowStart │
    └────────────┬────────────────────┘
                 │
         ┌───────┴────────┐
         │ count < limit  │  count >= limit
         │                │
         ▼                ▼
    Allow send     Is email type critical?
                       │
              ┌────────┴────────┐
              │ Yes             │ No
              ▼                 ▼
    Throw               Log error (masked email)
    TooManyEmailsException    + skip (return "skipped")
              │
              ▼
    Caller handles exception
    (propagates as failed result)
         │
         ▼ (allowed path)
  sendEmail() via govnotify-client
         │
         ▼
  Update audit log: Sent / Failed
```

---

## 6. Page Specifications

### Module: `libs/notifications`

#### New file: `src/rate-limiting/too-many-emails-exception.ts`

- Exports a `TooManyEmailsException` class extending `Error`
- Constructor accepts `maskedEmail: string` and `emailType: string`
- Sets `this.name = "TooManyEmailsException"`
- Message format: `"Rate limit exceeded for ${emailType} emails to ${maskedEmail}"`

#### New file: `src/rate-limiting/email-rate-limiter.ts`

**Configuration interface:**

```
RateLimitConfig {
  maxEmails:  number   // maximum emails per window
  windowMs:   number   // window duration in milliseconds
  isCritical: boolean  // true = throw; false = log and skip
}
```

**Environment variable defaults:**

| Email Type        | Env var (max)                   | Default | Env var (window ms)                  | Default       | Critical |
|-------------------|---------------------------------|---------|--------------------------------------|---------------|----------|
| `SUBSCRIPTION`    | `RATE_LIMIT_SUBSCRIPTION_MAX`   | `100`   | `RATE_LIMIT_SUBSCRIPTION_WINDOW_MS`  | `3600000` (1h)| No       |
| `MEDIA_APPROVAL`  | `RATE_LIMIT_MEDIA_APPROVAL_MAX` | `5`     | `RATE_LIMIT_MEDIA_APPROVAL_WINDOW_MS`| `86400000` (24h)| Yes    |
| `MEDIA_REJECTION` | `RATE_LIMIT_MEDIA_REJECTION_MAX`| `5`     | `RATE_LIMIT_MEDIA_REJECTION_WINDOW_MS`| `86400000` (24h)| Yes   |

#### Modified file: `src/notification/notification-service.ts`

- In `processUserNotification`, before sending, call `checkEmailRateLimit(subscription.userId, "SUBSCRIPTION")`
- Wrap in try/catch; if a rate-limit error is caught, log and return `{ status: "skipped", error: ... }`

#### Modified schema: `libs/notifications/prisma/schema.prisma`

Add `emailType` field to `NotificationAuditLog`:
```
emailType  String   @default("SUBSCRIPTION") @map("email_type")
```
Add index:
```
@@index([userId, emailType, createdAt])
```

#### Modified file: `src/notification/notification-queries.ts`

- Update `createNotificationAuditLog` to persist `emailType` (defaults to `"SUBSCRIPTION"`)
- Add new query function `countEmailsSentInWindow(userId: string, emailType: string, windowStart: Date): Promise<number>`

---

## 10. Error Messages

| Error | Type | Message format |
|-------|------|---------------|
| Critical rate limit exceeded | `TooManyEmailsException` | `Rate limit exceeded for MEDIA_APPROVAL emails to t***@example.com` |
| Non-critical rate limit exceeded | Plain `Error` caught and logged | `Rate limit exceeded: SUBSCRIPTION emails to t***@example.com (userId: abc-123). Limit: 100 per 3600000ms` |
| Missing `userId` argument | Plain `Error` | `userId is required for rate limit check` |

---

## 13. Test Scenarios

Unit tests for `email-rate-limiter.ts`:
- Does not throw when email count is below limit
- Throws `TooManyEmailsException` when count equals limit for a critical email type
- Throws a plain `Error` for non-critical email type at limit
- Uses correct window start time
- Counts only records matching both `userId` and `emailType`
- Reads limit/window values from environment variables
- Falls back to defaults when env vars absent or invalid
- `maskEmail` returns `u***@example.com` for standard address
- `maskEmail` returns `***@***` when `@` is absent
- `maskEmail` returns `***@***` when local part is empty

---

## 14. Assumptions & Open Questions

- **Open question:** Should rate limiting apply to `libs/notification` (media emails)? Currently no DB dependency in that module.
- **Open question:** Default limit of 100 subscription emails/hour — if a location has >100 active subscribers, the 101st gets skipped. Needs validation.
- **Open question:** Should `TooManyEmailsException` be tracked via Application Insights, or is console logging sufficient?

---

### Comment by OgechiOkelu on 2026-02-23T13:25:17Z
@plan

---

### Comment by hmctsclaudecode on 2026-02-23T13:31:48Z

## Technical Plan - Clarifications Needed

Before implementation can begin, the following questions need answers:

**1. Should rate limiting apply to `libs/notification` (media emails)?**
Three options:
- Option A: Rate limiting for media emails is out of scope — only `SUBSCRIPTION` emails rate-limited now.
- Option B: Add `@hmcts/postgres` dependency to `libs/notification` to use audit log counter.
- Option C: Move media email sending into `libs/notifications` flow.

**2. Default limit validation**
100 subscription emails/hour — if a location has >100 active subscribers, the 101st subscriber is skipped. Should the default be higher?

**3. Application Insights integration**
Should rate-limit breaches be tracked via Application Insights `trackException`, or is console logging sufficient?
