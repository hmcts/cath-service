# VIBE-221: Subscription Fulfilment Email Notifications - Implementation Plan

## Summary
Implement an event-driven email notification system using GOV.UK Notify to automatically inform subscribed users when new hearing lists are published for their subscribed venues. The system includes deduplication, validation, retry logic, and comprehensive audit logging.

## Implementation Approach

### Phase 1: Module & Database Setup (1 hour)
1. Create `libs/subscription-notifications` module structure
2. Configure package.json with dependencies:
   - notifications-node-client (GOV.UK Notify SDK)
   - @prisma/client
3. Create Prisma schema for notification_audit table
4. Run migrations to create database tables
5. Register module in root tsconfig.json

### Phase 2: GOV.UK Notify Integration (1.5 hours)
1. Install and configure notifications-node-client
2. Create `gov-notify-client.ts`:
   - Initialize NotifyClient with API key
   - Implement sendEmail method
   - Handle Notify API responses
   - Parse error codes and statuses
   - Extract Notify reference IDs
3. Add environment variables:
   - GOVUK_NOTIFY_API_KEY
   - GOVUK_NOTIFY_TEMPLATE_ID
   - CATH_SERVICE_URL
4. Create GOV.UK Notify template in dashboard with personalisation fields

### Phase 3: Core Notification Service (2 hours)
1. Create `notification-service.ts`:
   - getSubscribersForPublication(publicationId, locationId)
   - validateEmail(email)
   - sendNotifications(subscribers, publication)
   - handleSendResult(result, audit)
   - Retry logic for failures (1 retry)
2. Create `email-validator.ts`:
   - RFC2822 regex validation
   - Check email format
3. Implement error handling for all scenarios
4. Add comprehensive logging

### Phase 4: Deduplication Service (1 hour)
1. Create `deduplication-service.ts`:
   - isDuplicate(publicationId, userId)
   - markAsSent(publicationId, userId)
   - Query notification_audit for existing records
2. Optional: Add in-memory cache for recent sends (Redis or Map)
3. Handle race conditions with DB unique constraints

### Phase 5: Repositories (1 hour)
1. Create `subscription-repository.ts`:
   - findActiveByLocation(locationId)
   - Returns user_id, email, subscription_id
2. Create `audit-repository.ts`:
   - create(audit)
   - update(id, status)
   - findByPublication(publicationId)
   - findByUser(userId)
   - findByStatus(status)

### Phase 6: Event Handler (1.5 hours)
1. Create `publication-event-handler.ts`:
   - Listen for publication events (async message queue or event emitter)
   - Extract publication metadata
   - Call notification service
   - Handle async processing
   - Log summary results
2. Integrate with existing publication module
3. Configure event routing

### Phase 7: Admin API Endpoints (1 hour)
1. Create API routes for testing and monitoring:
   - POST /api/notifications/send - Manual trigger
   - GET /api/notifications/audit - Query audit log
2. Add pagination for audit queries
3. Add filtering by status, date range, publication
4. Secure endpoints (admin only)

### Phase 8: Testing (3 hours)
1. Unit tests (1.5 hours):
   - notification-service.test.ts
   - deduplication-service.test.ts
   - email-validator.test.ts
   - gov-notify-client.test.ts (mocked)
2. Integration tests (1 hour):
   - Event handler with mocked Notify
   - Repository tests with test database
   - End-to-end notification flow
3. E2E tests (30 mins):
   - Publish list → verify email sent
   - Multiple subscriptions → all receive
   - Duplicate trigger → deduplication works

### Phase 9: Monitoring & Observability (1 hour)
1. Add structured logging for all operations
2. Track metrics:
   - Emails sent per publication
   - Success rate
   - Failure rate
   - Retry rate
3. Set up alerts for high failure rates
4. Create dashboard for notification metrics

### Phase 10: Documentation & Deployment (30 mins)
1. Update README with notification system docs
2. Document environment variables
3. Document GOV.UK Notify template setup
4. Create runbook for troubleshooting
5. Deploy to development environment

## Technical Decisions

### Async vs Sync Processing
**Decision**: Use async message queue (recommended)
**Rationale**:
- Decouples publication from notification
- Better scalability for many subscribers
- Allows retry without blocking publication
- Can process notifications in parallel

### Deduplication Strategy
**Decision**: Database-based with optional in-memory cache
**Rationale**:
- DB provides persistence across restarts
- Unique index on (publication_id, user_id) prevents duplicates
- In-memory cache for performance optimization
- Handles distributed systems

### Retry Policy
**Decision**: Retry once, 5 second delay
**Rationale**:
- Most transient failures resolve quickly
- Prevents excessive load on GOV.UK Notify
- Failures logged for manual review
- Can adjust based on monitoring

### GOV.UK Notify Template
**Decision**: Single English template (MVP), Welsh in future iteration
**Rationale**:
- Simplifies initial implementation
- Can add bilingual support later
- User language preference not yet in system

### Batch Processing
**Decision**: Process subscribers one-by-one with parallel processing
**Rationale**:
- Easier error handling per user
- Can use Promise.allSettled for parallelism
- GOV.UK Notify handles rate limiting
- Better visibility into individual failures

## Database Schema

### notification_audit Table
```prisma
model NotificationAudit {
  id              String             @id @default(cuid())
  subscriptionId  String             @map("subscription_id")
  userId          String             @map("user_id")
  publicationId   String             @map("publication_id")
  status          NotificationStatus
  errorMessage    String?            @map("error_message")
  notifyId        String?            @map("notify_id")
  createdAt       DateTime           @default(now()) @map("created_at")
  sentAt          DateTime?          @map("sent_at")

  @@map("notification_audit")
  @@unique([publicationId, userId], name: "unique_publication_user")
  @@index([publicationId])
  @@index([userId])
  @@index([status])
}

enum NotificationStatus {
  SENT
  FAILED
  SKIPPED
  DUPLICATE
}
```

## File Changes

### New Files
- `libs/subscription-notifications/package.json`
- `libs/subscription-notifications/tsconfig.json`
- `libs/subscription-notifications/src/config.ts`
- `libs/subscription-notifications/src/index.ts`
- `libs/subscription-notifications/src/services/notification-service.ts`
- `libs/subscription-notifications/src/services/gov-notify-client.ts`
- `libs/subscription-notifications/src/services/deduplication-service.ts`
- `libs/subscription-notifications/src/repositories/subscription-repository.ts`
- `libs/subscription-notifications/src/repositories/audit-repository.ts`
- `libs/subscription-notifications/src/events/publication-event-handler.ts`
- `libs/subscription-notifications/src/validators/email-validator.ts`
- `libs/subscription-notifications/prisma/schema.prisma`
- `libs/subscription-notifications/src/notification-service.test.ts`
- `libs/subscription-notifications/src/deduplication-service.test.ts`
- `libs/subscription-notifications/src/email-validator.test.ts`
- `apps/api/src/routes/notifications.ts`

### Modified Files
- `apps/api/src/app.ts` - Register notification routes
- `tsconfig.json` - Add subscription-notifications path alias
- `apps/postgres/src/schema-discovery.ts` - Add notification schema path
- Existing publication module - Emit events on publish

## Environment Variables

```env
# GOV.UK Notify
GOVUK_NOTIFY_API_KEY=your_api_key_here
GOVUK_NOTIFY_TEMPLATE_ID=template_uuid_here

# CaTH Service
CATH_SERVICE_URL=https://www.court-tribunal-hearings.service.gov.uk/

# Optional: Redis for deduplication cache
REDIS_URL=redis://localhost:6379
```

## GOV.UK Notify Template

### Template Setup
1. Log in to GOV.UK Notify dashboard
2. Create new email template
3. Add personalisation fields:
   - `((user_name))`
   - `((hearing_list_name))`
   - `((publication_date))`
   - `((location_name))`
   - `((manage_link))`
4. Copy template ID to environment variable

### Template Content
```
Subject: New hearing list published: ((hearing_list_name))

Dear ((user_name)),

Note this email contains Special Category Data as defined by the Data Protection Act 2018,
formerly known as Sensitive Personal Data, and should be handled appropriately.

This email contains information intended to assist the accurate reporting of court proceedings.
It is vital you ensure that you safeguard the Special Category Data included and abide by reporting
restrictions (for example on victims and children). HMCTS will stop sending the data if there is
concern about how it will be used.

---

Your subscription to get updates about the below has been triggered based on a
((hearing_list_name)) being published for the ((publication_date)).

[Manage your subscriptions, view lists and additional case information](((manage_link)))
within the Court and tribunal hearings service.

---

This is an automated message. Please do not reply to this email.
```

## Testing Strategy

### Unit Tests
```typescript
describe('NotificationService', () => {
  test('sends email to all subscribers', async () => {});
  test('validates email format', async () => {});
  test('retries on failure', async () => {});
  test('logs audit record', async () => {});
  test('handles empty subscriber list', async () => {});
});

describe('DeduplicationService', () => {
  test('detects duplicate publication+user', async () => {});
  test('allows same user for different publications', async () => {});
  test('handles race conditions', async () => {});
});

describe('EmailValidator', () => {
  test('validates correct email format', () => {});
  test('rejects invalid formats', () => {});
});
```

### Integration Tests
```typescript
describe('Notification Flow', () => {
  test('full flow from event to email sent', async () => {
    // Publish list → trigger event → verify audit log
  });

  test('handles GOV.UK Notify failures', async () => {
    // Mock Notify failure → verify retry → verify audit log
  });

  test('deduplicates multiple triggers', async () => {
    // Trigger twice → verify only one email
  });
});
```

### E2E Tests
- Publish hearing list in test environment
- Verify email received (test email account)
- Check audit log entry
- Verify no duplicate emails

## Error Handling Matrix

| Error Type | Detection | Retry | Logging | Status |
|------------|-----------|-------|---------|--------|
| Invalid email | Validation | No | Warning | SKIPPED |
| Notify API failure | HTTP error | Yes (1x) | Error | FAILED |
| Missing user | DB query | No | Warning | SKIPPED |
| Duplicate trigger | DB check | No | Info | DUPLICATE |
| Rate limit | HTTP 429 | Yes (1x) | Warning | FAILED |
| Network timeout | HTTP timeout | Yes (1x) | Error | FAILED |

## Monitoring & Alerts

### Metrics to Track
- Total notifications sent (counter)
- Success rate (percentage)
- Failure rate (percentage)
- Average send time (histogram)
- Retry rate (percentage)
- Deduplication rate (percentage)

### Alerts
- Failure rate > 10% over 5 minutes
- No notifications sent in 24 hours (when publications exist)
- GOV.UK Notify API errors
- Database connection failures

### Dashboard
- Real-time notification status
- Historical trends (sent/failed)
- Top error messages
- Per-publication breakdown
- Per-venue breakdown

## Rollout Plan

### Development
1. Deploy module with feature flag OFF
2. Manual testing with test publications
3. Verify audit logging

### Staging
1. Enable feature flag
2. Full E2E testing
3. Load testing with many subscribers
4. Verify GOV.UK Notify integration

### Production
1. Gradual rollout (10% → 50% → 100%)
2. Monitor metrics closely
3. Ready to rollback if issues
4. Verify real emails sent

## Troubleshooting Guide

### No emails sent
1. Check feature flag enabled
2. Verify GOV.UK Notify API key
3. Check publication events emitted
4. Query audit log for attempts
5. Check subscription records exist

### Emails not received
1. Check audit log status (SENT vs FAILED)
2. Verify email address correct
3. Check spam folder
4. Query GOV.UK Notify dashboard
5. Verify template ID correct

### Duplicate emails
1. Check deduplication service
2. Query audit log for duplicates
3. Verify unique constraint on DB
4. Check event handler not triggering twice

## Future Enhancements (Out of Scope)
- PDF attachments of hearing lists
- Email digest summaries
- SMS notifications
- API push notifications
- User preference for notification timing
- Bilingual (EN/CY) templates
- Notification preferences (immediate, daily, weekly)
- Unsubscribe link in emails
