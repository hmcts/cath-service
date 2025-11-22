# VIBE-221: Backend - Subscription Fulfilment (Email notifications)

## Overview
Implement a trigger-based mechanism to automatically send email notifications to subscribed users when new hearing lists are published in CaTH.

## Problem Statement
Verified users in CaTH can subscribe to receive email notifications about newly published hearing lists. This functionality requires a trigger-based mechanism in the CaTH backend to automatically send email notifications to subscribed users through Gov.Notify when a hearing list relevant to their subscriptions is published.

## User Story
**As a** System
**I want to** send out email notifications to users who are subscribed to receive publication notifications from CaTH
**So that** they can be informed whenever a new list they subscribed to is published

## Pre-Conditions
- User has an approved and verified CaTH account
- User has subscribed to receive notifications for one or more specific venues
- A valid Subscriptions table exists linking user IDs to court or tribunal venues
- A new hearing list publication event occurs for a venue with active subscribers

## Technical Requirements

### Architecture Overview
The notification system will be implemented as a new module `@hmcts/notification` following the HMCTS monorepo standards. The system will be triggered synchronously from the publication flow (manual-upload-summary POST handler) to ensure immediate delivery of notifications.

### Trigger Flow
1. **Event source:** Hearing list publication via `createArtefact()` in manual-upload-summary
2. **Trigger action:** Call notification service synchronously after successful artefact creation
3. **Notification Service:**
   - Retrieves active subscriptions from database
   - Validates email addresses
   - Deduplicates notifications (one per user per publication)
   - Sends notifications via Gov.Notify
   - Writes audit log entries to track status and errors

### Data Model

#### Subscriptions Table
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `subscription_id` | UUID | Yes | Unique identifier for each subscription |
| `user_id` | String | Yes | ID of the verified user |
| `location_id` | String | Yes | Linked venue ID |
| `date_added` | DateTime | Yes | Subscription creation date |

**Prisma Schema:**
```prisma
model Subscription {
  subscriptionId String   @id @default(uuid()) @map("subscription_id") @db.Uuid
  userId         String   @map("user_id")
  locationId     String   @map("location_id")
  dateAdded      DateTime @default(now()) @map("date_added")

  notifications  Notification[]

  @@map("subscription")
}
```

#### Notification Audit Log Table
| Field | Type | Description |
|-------|------|-------------|
| `notification_id` | UUID | Unique ID for notification event |
| `subscription_id` | UUID | Link to Subscriptions table |
| `user_id` | String | User identifier |
| `artefact_id` | UUID | Identifier of published hearing list |
| `status` | String | "sent", "failed", "skipped" |
| `error_message` | String | Error reason if applicable |
| `created_at` | DateTime | Notification created timestamp |
| `sent_at` | DateTime | When message successfully sent |

**Prisma Schema:**
```prisma
model Notification {
  notificationId String    @id @default(uuid()) @map("notification_id") @db.Uuid
  subscriptionId String    @map("subscription_id") @db.Uuid
  userId         String    @map("user_id")
  artefactId     String    @map("artefact_id") @db.Uuid
  status         String
  errorMessage   String?   @map("error_message")
  createdAt      DateTime  @default(now()) @map("created_at")
  sentAt         DateTime? @map("sent_at")

  subscription   Subscription @relation(fields: [subscriptionId], references: [subscriptionId])

  @@unique([artefactId, userId])
  @@index([artefactId])
  @@index([userId])
  @@map("notification")
}
```

### Gov.Notify Integration

#### Email Template Structure (Mandatory for MVP)

1. **Header:** GOV.UK banner (provided by Gov.Notify)

2. **Section 1 - Opening notice:**
   ```
   Note this email contains Special Category Data as defined by the Data Protection Act 2018,
   formerly known as Sensitive Personal Data, and should be handled appropriately.

   This email contains information intended to assist the accurate reporting of court proceedings.
   It is vital you ensure that you safeguard the Special Category Data included and abide by reporting
   restrictions (for example on victims and children). HMCTS will stop sending the data if there is
   concern about how it will be used.
   ```

3. **Section 2 - Notification message:**
   ```
   Your subscription to get updates about ((location_name)) has been triggered based on a
   ((hearing_list_name)) being published for ((publication_date)).
   ```

4. **Section 3 - Service link:**
   ```
   Manage your subscriptions, view lists and additional case information
   within the Court and tribunal hearings service.
   ```
   Link URL: ((manage_link))

#### Template Parameters
- `((location_name))` - Court/tribunal venue name
- `((hearing_list_name))` - List type friendly name
- `((publication_date))` - Content date formatted as "DD Month YYYY"
- `((manage_link))` - Link to CaTH service (from environment config)

#### Configuration
- **API Key:** Environment variable `GOV_NOTIFY_API_KEY`
- **Template ID:** Environment variable `GOV_NOTIFY_TEMPLATE_ID`
- **Service URL:** Environment variable `CATH_SERVICE_URL`

### Business Logic

#### Subscription Retrieval
```typescript
// Query active subscriptions by location_id
async function getActiveSubscriptionsByLocation(locationId: string): Promise<Subscription[]>
```

#### Email Validation
- Format validation using RFC2822 regex pattern
- Verify email exists in user profile/session
- Skip invalid emails and log as "skipped"

#### Deduplication Strategy
- Use database unique constraint on `(artefact_id, user_id)` in notification table
- Prevents duplicate notifications for same publication to same user
- Failures due to constraint violation should be logged but not error out

#### Error Handling

| Scenario | System Behaviour |
|----------|------------------|
| Gov.Notify send fails | Retry once → log error → mark status as "failed" |
| Invalid user ID | Log error, mark as "skipped" |
| Invalid email | Mark record "skipped" with reason |
| Duplicate constraint violation | Log info message, continue processing |
| DB write failure | Retry write once, then log error |
| Partial success | Log per-user success/failure, return summary |

#### Retry Logic
- Single retry on Gov.Notify API failures (network, 5xx errors)
- No retry on client errors (4xx)
- Exponential backoff: 1 second delay before retry

## Validation Rules

### Pre-Send Validation
1. Email format must be valid (RFC2822)
2. User must exist (basic validation)
3. Subscription must be active
4. Not already notified (checked via DB constraint)

### Template Validation
1. All required parameters must be provided
2. Template ID must exist in Gov.Notify configuration
3. Service URL must be configured

## Acceptance Criteria

1. When a new hearing list is published (artefact created), the notification service is triggered
2. All active subscriptions for the publication's location are retrieved
3. Only one email notification is sent to each user per publication (enforced by DB constraint)
4. Email addresses are validated before sending
5. Gov.Notify is used to send email notifications following HMCTS standards
6. All notification attempts are logged in the audit table with:
   - Success/failure status
   - Timestamps
   - Error messages for failures
7. Errors are handled gracefully:
   - Invalid emails are skipped
   - Network failures trigger one retry
   - Partial failures don't block other notifications
8. The system continues processing remaining subscriptions even if some fail

## Accessibility & Compliance

- **Emails:** Follow GOV.UK Notify branding and layout guidelines
- **Data security:** All notifications comply with GDPR and DPA 2018
- **Storage:** Audit data stored in encrypted PostgreSQL database
- **Accessibility:** Text-only version provided by Gov.Notify
- **Logging:** All sends and failures recorded for HMCTS technical admin review

## Test Scenarios

| ID | Scenario | Steps | Expected Result |
|----|----------|-------|-----------------|
| TS1 | Trigger notification on publication | Publish new hearing list via manual upload | Notification service called, all subscribed users receive email |
| TS2 | Multiple users same location | Location has 3 active subscriptions | All 3 users receive notification |
| TS3 | Deduplication | Process same artefact twice | DB constraint prevents duplicate notification |
| TS4 | Invalid email address | Subscription has malformed email | Notification skipped, logged with reason |
| TS5 | Gov.Notify fails once | Temporary network issue | Retry once, success logged |
| TS6 | Gov.Notify fails persistently | Second attempt fails | Logged as "failed" |
| TS7 | Partial success | Mix of valid/invalid emails | Valid sent, invalid skipped, all logged |
| TS8 | Audit log verification | Query notification table | Shows all attempts with correct statuses |
| TS9 | No subscriptions | Location has no active subscriptions | No notifications sent, no errors |
| TS10 | Email content validation | Inspect received email | Contains all required sections and parameters |

## Out of Scope (Future Iterations)

This ticket does NOT include:
- PDF attachments
- Email summaries
- Subscription management UI
- Webhook/API endpoint notifications
- Bilingual email templates (EN/CY) - single English template for MVP
- User preference for notification frequency
- Batch notification processing
- Async queue-based processing

## Dependencies

### New Package: notifications-client
- **Package:** `notifications-node-client` (Gov.Notify official Node.js client)
- **Version:** Latest stable (check npm)
- **Installation:** Add to root package.json dependencies

### Environment Variables
```bash
# Gov.Notify Configuration
GOV_NOTIFY_API_KEY=<api-key-from-gov-notify>
GOV_NOTIFY_TEMPLATE_ID=<template-id-from-gov-notify>

# Service Configuration
CATH_SERVICE_URL=https://www.court-tribunal-hearings.service.gov.uk
```

## Implementation Notes

### Integration Point
The notification service will be called from `libs/admin-pages/src/pages/manual-upload-summary/index.ts` after successful `createArtefact()` call (line 93-104).

### Synchronous vs Asynchronous
For MVP, the implementation will be **synchronous** to keep it simple. The notification service will be called directly after artefact creation. If this causes performance issues, it can be moved to an async queue in a future iteration.

### Database Location
Schemas will be added to `apps/postgres/prisma/schema.prisma` since the existing artefact table is there.

### Error Handling Strategy
Notification failures should NOT block the publication process. If notifications fail, the artefact should still be created successfully and errors logged for later review.

## Security Considerations

1. **API Key Storage:** Gov.Notify API key must be stored in environment variables, never in code
2. **Email Validation:** All email addresses must be validated before sending
3. **User Data:** No sensitive user data should be included in email content
4. **Audit Logging:** All notification attempts must be logged for compliance
5. **Rate Limiting:** Gov.Notify has rate limits - ensure we stay within them (3000/min for live keys)

## Monitoring & Observability

### Logging Requirements
- Log level INFO: Successful notifications
- Log level WARN: Retries, skipped notifications
- Log level ERROR: Failed notifications after retry
- Include: artefactId, userId, locationId, status in all logs

### Metrics to Track
- Total notifications sent per hour/day
- Success rate percentage
- Average processing time
- Gov.Notify API response times
- Failure reasons breakdown

## Risks & Clarifications Needed

- **RESOLVED:** Deduplication approach - Use DB unique constraint
- **RESOLVED:** Trigger sync vs async - Synchronous for MVP
- **PENDING:** Gov.Notify template ID - Need to be created in Gov.Notify console
- **PENDING:** User model structure - Need to confirm email field location
- **PENDING:** Bilingual requirement - Assuming EN-only for MVP
- **PENDING:** Retry policy - Proposing single retry, needs confirmation
- **PENDING:** Service URL for email links - Assuming production URL, needs confirmation
