# VIBE-221: Subscription Fulfilment Email Notifications - Technical Specification

## Overview
Implement automated email notification system that sends GOV.UK Notify-based emails to subscribed verified users when new hearing lists are published for their subscribed venues.

## User Story
**As a** System
**I want to** send out email notifications to users who are subscribed to receive publication notifications from CaTH
**So that** they can be informed whenever a new list they subscribed to is published

## Pre-conditions
- User has approved and verified CaTH account
- User has active subscriptions to one or more venues
- Subscriptions table exists linking user IDs to court/tribunal venues
- New hearing list publication event occurs for venue with active subscribers

## Technical Requirements

### 1. Event-Driven Notification Trigger
- **Event Source**: Hearing list publication in CaTH
- **Trigger Mechanism**: Async message queue (recommended) or event emitter
- **Target Service**: Notification Service module
- **Deduplication**: Ensure only one email per user per publication

### 2. Subscription Data Retrieval
Query subscriptions table:
```sql
SELECT user_id, email
FROM subscription
WHERE location_id = :publication_location_id
  AND status = 'active'
  AND channel = 'email'
```

### 3. GOV.UK Notify Integration
- Service: GOV.UK Notify API
- Authentication: API key from environment variables
- Template: Pre-configured Notify template
- Dynamic parameters:
  - `{user_name}` - User's display name
  - `{hearing_list_name}` - Name of published list
  - `{publication_date}` - Date of publication
  - `{location_name}` - Venue/court name
  - `{manage_link}` - Link to CaTH service

### 4. Email Content Requirements

#### Section 1: Data Protection Notice
```
Note this email contains Special Category Data as defined by the Data Protection Act 2018,
formerly known as Sensitive Personal Data, and should be handled appropriately.

This email contains information intended to assist the accurate reporting of court proceedings.
It is vital you ensure that you safeguard the Special Category Data included and abide by reporting
restrictions (for example on victims and children). HMCTS will stop sending the data if there is
concern about how it will be used.
```

#### Section 2: Notification Message
```
Your subscription to get updates about the below has been triggered based on a
[Hearing List name] being published for the [date].
```

#### Section 3: Service Link
```
Manage your subscriptions, view lists and additional case information
within the Court and tribunal hearings service.
```
Link: https://www.court-tribunal-hearings.service.gov.uk/

### 5. Validation Requirements
- **Email Format**: RFC2822 compliant regex validation
- **Email Existence**: Verify email exists in user profile
- **Template ID**: Validate GOV.UK Notify template ID exists
- **Deduplication**: Check for duplicate `user_id` + `publication_id` combination

### 6. Error Handling

| Scenario | Behavior | Action |
|----------|----------|--------|
| GOV.UK Notify send fails | Network/template issue | Retry once → log error → status "Failed" |
| Invalid user ID | Missing/invalid user record | Log error, skip notification |
| Invalid email | Malformed/inactive email | Mark "Invalid channel" |
| Duplicate triggers | Multiple publication triggers | Deduplicate by publication_id + user_id |
| Partial success | Some sends fail | Log per-user success/failure |

### 7. Notification Audit Log

Track all notification attempts in database:

| Field | Type | Description |
|-------|------|-------------|
| notification_id | UUID | Unique notification event ID |
| subscription_id | UUID | Link to subscription |
| user_id | String | User identifier |
| publication_id | String | Published hearing list ID |
| status | Enum | "Sent", "Failed", "Skipped", "Duplicate" |
| error_message | String | Error reason if applicable |
| created_at | DateTime | Notification created timestamp |
| sent_at | DateTime | Successfully sent timestamp |
| notify_id | String | GOV.UK Notify reference ID |

## Architecture

### Module Structure
```
libs/subscription-notifications/
├── src/
│   ├── services/
│   │   ├── notification-service.ts      # Core notification logic
│   │   ├── gov-notify-client.ts         # GOV.UK Notify API client
│   │   └── deduplication-service.ts     # Duplicate detection
│   ├── repositories/
│   │   ├── subscription-repository.ts   # Query subscriptions
│   │   └── audit-repository.ts          # Audit log persistence
│   ├── events/
│   │   └── publication-event-handler.ts # Handle publication events
│   ├── validators/
│   │   └── email-validator.ts           # Email validation
│   └── config.ts                        # Module exports
├── prisma/
│   └── schema.prisma                    # Audit log schema
├── package.json
└── tsconfig.json
```

### Database Schema

#### notification_audit Table
```prisma
model NotificationAudit {
  id              String   @id @default(cuid())
  subscriptionId  String   @map("subscription_id")
  userId          String   @map("user_id")
  publicationId   String   @map("publication_id")
  status          NotificationStatus
  errorMessage    String?  @map("error_message")
  notifyId        String?  @map("notify_id")
  createdAt       DateTime @default(now()) @map("created_at")
  sentAt          DateTime? @map("sent_at")

  @@map("notification_audit")
  @@index([publicationId, userId])
  @@index([subscriptionId])
}

enum NotificationStatus {
  SENT
  FAILED
  SKIPPED
  DUPLICATE
}
```

### Event Flow
```
1. Hearing List Published
   ↓
2. Publication Event Emitted
   ↓
3. Event Handler Triggered
   ↓
4. Query Active Subscriptions (location_id match)
   ↓
5. For Each Subscriber:
   a. Check for duplicates
   b. Validate email
   c. Send GOV.UK Notify email
   d. Log audit record
   ↓
6. Return summary (sent/failed counts)
```

## Implementation Tasks

### Task 1: Create Notification Module
- Set up libs/subscription-notifications package
- Configure package.json with dependencies
- Add TypeScript configuration
- Create Prisma schema for audit log

### Task 2: Implement GOV.UK Notify Client
- Create gov-notify-client.ts service
- Configure API key from environment
- Implement sendEmail method
- Handle Notify API responses
- Parse Notify error codes

### Task 3: Build Notification Service
- Create notification-service.ts
- Implement getSubscribersForPublication(publicationId, locationId)
- Implement sendNotifications(subscribers, publication)
- Email validation logic
- Retry logic for failed sends
- Audit logging

### Task 4: Implement Deduplication Service
- Create deduplication-service.ts
- Check existing audit records for publication_id + user_id
- Cache recent sends (optional in-memory cache)
- Mark duplicate attempts in audit log

### Task 5: Build Event Handler
- Create publication-event-handler.ts
- Listen for publication events (message queue or direct)
- Extract publication metadata
- Trigger notification service
- Handle async processing

### Task 6: Create Repositories
- subscription-repository.ts: Query active subscriptions
- audit-repository.ts: CRUD for notification_audit
- Use Prisma client for type-safe DB access

### Task 7: GOV.UK Notify Template Setup
- Create template in GOV.UK Notify dashboard
- Configure template ID in environment
- Add personalisation fields:
  - user_name
  - hearing_list_name
  - publication_date
  - location_name
  - manage_link

### Task 8: Environment Configuration
- Add GOVUK_NOTIFY_API_KEY to .env
- Add GOVUK_NOTIFY_TEMPLATE_ID to .env
- Add CATH_SERVICE_URL for manage link

### Task 9: Testing
- Unit tests for notification-service
- Unit tests for deduplication-service
- Unit tests for email-validator
- Integration tests for GOV.UK Notify client (mocked)
- Integration tests for event handler
- E2E tests:
  - Publish list → verify email sent
  - Multiple subscriptions → all receive emails
  - Duplicate trigger → only one email
  - Invalid email → logged and skipped
  - Notify failure → retry and log

### Task 10: Monitoring & Observability
- Add logging for all notification attempts
- Track success/failure rates
- Alert on high failure rates
- Dashboard for notification metrics

## API Endpoints (for testing/admin)

### POST /api/notifications/send (internal)
Manually trigger notification for publication
```json
{
  "publicationId": "pub_123",
  "locationId": "loc_456"
}
```

### GET /api/notifications/audit
Query audit log
```
?publicationId=pub_123
?userId=user_456
?status=FAILED
?startDate=2025-01-01
?endDate=2025-01-31
```

## Test Scenarios

| ID | Scenario | Expected Result |
|----|----------|----------------|
| TS1 | Publish new hearing list | Email sent to all subscribed users |
| TS2 | Multiple triggers same publication | Only one email per user |
| TS3 | GOV.UK Notify fails once | Retry succeeds, status "SENT" |
| TS4 | GOV.UK Notify fails twice | Status "FAILED", error logged |
| TS5 | Invalid email format | Status "SKIPPED", validation error |
| TS6 | User has no email | Status "SKIPPED", missing channel |
| TS7 | Partial success | Some "SENT", some "FAILED" |
| TS8 | Query audit log | Returns all attempts with status |
| TS9 | No active subscriptions | No emails sent, logged |
| TS10 | Concurrent publications | All processed independently |

## Security & Compliance

### GDPR & DPA 2018
- Email content includes data protection notice
- Special Category Data handling
- User consent recorded in subscriptions
- Audit trail for all notifications

### Data Protection
- Email addresses encrypted in database
- Notify API key stored in secure vault
- Audit logs retained per data retention policy
- No PII in logs

### Accessibility
- GOV.UK Notify templates meet accessibility standards
- Plain text version provided automatically
- No reliance on HTML formatting

## Risks & Questions
1. Async vs sync processing - recommend async message queue
2. Deduplication strategy - DB flag vs in-memory cache
3. Retry policy - how many retries, what interval?
4. Bilingual templates - EN/CY required?
5. Rate limiting - GOV.UK Notify rate limits?
6. Batch processing - send in batches or one-by-one?

## Out of Scope (Future Iterations)
- PDF attachments
- Email summaries
- SMS notifications
- API push notifications
- Digest emails (daily/weekly summaries)
- User preference for notification timing

## Dependencies
- GOV.UK Notify account and API key
- Existing subscription module and database schema
- Publication event system
- User management module (for email retrieval)

## Definition of Done
- [ ] Notification service module created
- [ ] GOV.UK Notify integration working
- [ ] Email sent when list published
- [ ] Deduplication prevents duplicate emails
- [ ] Email validation implemented
- [ ] Retry logic for failed sends
- [ ] Audit log records all attempts
- [ ] Error handling for all scenarios
- [ ] Unit tests >80% coverage
- [ ] Integration tests pass
- [ ] E2E tests pass
- [ ] GOV.UK Notify template configured
- [ ] Environment variables documented
- [ ] Monitoring/alerting configured
- [ ] Code review approved
