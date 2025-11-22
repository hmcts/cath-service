# VIBE-221: Technical Implementation Plan

## Overview
This plan outlines the technical approach for implementing the subscription fulfilment email notification system. The implementation follows HMCTS monorepo standards and integrates Gov.Notify for email delivery.

## Architecture Decisions

### 1. Module Structure
Create a new module `@hmcts/notification` under `libs/` following the standard structure:
```
libs/notification/
├── package.json
├── tsconfig.json
└── src/
    ├── config.ts                    # Module configuration
    ├── index.ts                     # Public API exports
    ├── notification/
    │   ├── notification-service.ts  # Core business logic
    │   ├── notification-service.test.ts
    │   ├── notification-queries.ts  # Database operations
    │   ├── notification-queries.test.ts
    │   └── email-validation.ts      # Email validation logic
    └── govnotify/
        ├── govnotify-client.ts      # Gov.Notify integration
        └── govnotify-client.test.ts
```

### 2. Database Schema Changes
Add two new tables to `apps/postgres/prisma/schema.prisma`:
- `subscription` table (for future subscription management)
- `notification` table (audit log)

The notification table will have a unique constraint on `(artefact_id, user_id)` to enforce deduplication at the database level.

### 3. Integration Point
The notification service will be integrated into the publication flow at:
- **File:** `libs/admin-pages/src/pages/manual-upload-summary/index.ts`
- **Location:** After `createArtefact()` succeeds (line 93-104)
- **Approach:** Synchronous call with error handling to prevent blocking publication

### 4. Gov.Notify Integration
Use the official `notifications-node-client` package for Gov.Notify integration:
- Centralized client configuration
- Template-based email sending
- Built-in retry and error handling
- API key management via environment variables

### 5. Error Handling Strategy
Implement defensive error handling to ensure publication is never blocked by notification failures:
1. Wrap notification call in try-catch
2. Log all errors for monitoring
3. Continue publication flow even if notifications fail
4. Individual notification failures don't block others

## Implementation Phases

### Phase 1: Database Schema & Migrations
**Files to modify:**
- `apps/postgres/prisma/schema.prisma`

**Tasks:**
1. Add `Subscription` model with fields: subscriptionId, userId, locationId, dateAdded
2. Add `Notification` model with fields: notificationId, subscriptionId, userId, artefactId, status, errorMessage, createdAt, sentAt
3. Add unique constraint on Notification(artefactId, userId)
4. Add indexes on Notification(artefactId), Notification(userId)
5. Run migration: `yarn db:migrate:dev`
6. Verify schema generation: `yarn db:generate`

**Validation:**
- Prisma generates TypeScript types correctly
- Unique constraint prevents duplicate records
- Indexes improve query performance

### Phase 2: Notification Module Setup
**Files to create:**
- `libs/notification/package.json`
- `libs/notification/tsconfig.json`
- `libs/notification/src/config.ts`
- `libs/notification/src/index.ts`

**Tasks:**
1. Create module directory structure
2. Configure package.json with dependencies (notifications-node-client)
3. Set up TypeScript configuration extending root tsconfig
4. Create config.ts for module exports (if needed)
5. Create index.ts for public API
6. Register module in root `tsconfig.json` paths

**Validation:**
- Module builds without errors: `yarn workspace @hmcts/notification run build`
- TypeScript resolves @hmcts/notification imports
- Dependencies install correctly

### Phase 3: Gov.Notify Client Integration
**Files to create:**
- `libs/notification/src/govnotify/govnotify-client.ts`
- `libs/notification/src/govnotify/govnotify-client.test.ts`

**Tasks:**
1. Create Gov.Notify client wrapper with configuration from environment
2. Implement `sendEmail()` function with template parameter mapping
3. Add error handling and logging
4. Implement single retry logic for network failures
5. Write unit tests with mocked Gov.Notify client

**API Design:**
```typescript
export async function sendEmail(params: EmailParams): Promise<SendResult> {
  // params: { email, templateId, personalisation }
  // returns: { success: boolean, messageId?: string, error?: string }
}
```

**Validation:**
- Unit tests pass with mocked client
- Error scenarios handled correctly
- Retry logic works as expected

### Phase 4: Database Queries
**Files to create:**
- `libs/notification/src/notification/notification-queries.ts`
- `libs/notification/src/notification/notification-queries.test.ts`

**Tasks:**
1. Implement `getActiveSubscriptionsByLocation(locationId)` query
2. Implement `createNotificationRecord(data)` mutation
3. Implement `updateNotificationStatus(notificationId, status, sentAt?, error?)` mutation
4. Write unit tests using Vitest and mocked Prisma client

**API Design:**
```typescript
export async function getActiveSubscriptionsByLocation(
  locationId: string
): Promise<Subscription[]>

export async function createNotificationRecord(data: {
  subscriptionId: string;
  userId: string;
  artefactId: string;
  status: string;
}): Promise<string>

export async function updateNotificationStatus(
  notificationId: string,
  status: string,
  sentAt?: Date,
  errorMessage?: string
): Promise<void>
```

**Validation:**
- Queries return expected data structure
- Unique constraint violation handled gracefully
- Unit tests pass

### Phase 5: Email Validation
**Files to create:**
- `libs/notification/src/notification/email-validation.ts`
- `libs/notification/src/notification/email-validation.test.ts`

**Tasks:**
1. Implement RFC2822 email validation regex
2. Create `validateEmail(email)` function
3. Write comprehensive unit tests covering edge cases

**API Design:**
```typescript
export function validateEmail(email: string): boolean
```

**Validation:**
- Valid emails return true
- Invalid emails return false
- Edge cases handled (empty, special chars, etc.)

### Phase 6: Notification Service Core Logic
**Files to create:**
- `libs/notification/src/notification/notification-service.ts`
- `libs/notification/src/notification/notification-service.test.ts`

**Tasks:**
1. Implement `sendPublicationNotifications(artefactId, locationId, metadata)` main function
2. Orchestrate subscription retrieval, email validation, sending, and audit logging
3. Handle partial failures gracefully
4. Implement deduplication check
5. Write comprehensive unit tests

**API Design:**
```typescript
export async function sendPublicationNotifications(params: {
  artefactId: string;
  locationId: string;
  listTypeName: string;
  contentDate: Date;
}): Promise<NotificationResult>

interface NotificationResult {
  totalSubscriptions: number;
  sent: number;
  failed: number;
  skipped: number;
  errors: string[];
}
```

**Business Logic Flow:**
1. Retrieve active subscriptions for locationId
2. For each subscription:
   a. Validate email address
   b. Check if already notified (via createNotificationRecord)
   c. Send email via Gov.Notify
   d. Update notification status
   e. Handle errors and continue
3. Return summary result

**Validation:**
- All edge cases covered in tests
- Partial failures handled correctly
- Deduplication works via DB constraint

### Phase 7: Integration with Publication Flow
**Files to modify:**
- `libs/admin-pages/src/pages/manual-upload-summary/index.ts`
- `libs/admin-pages/package.json` (add @hmcts/notification dependency)

**Tasks:**
1. Import notification service
2. Add call to `sendPublicationNotifications()` after successful `createArtefact()`
3. Wrap in try-catch to prevent blocking publication
4. Log notification results
5. Update tests to mock notification service

**Integration Code:**
```typescript
// After line 104 in postHandler
const artefactId = await createArtefact({...});

// Send notifications (non-blocking)
try {
  const notificationResult = await sendPublicationNotifications({
    artefactId,
    locationId: uploadData.locationId,
    listTypeName: listTypeName || 'Hearing List',
    contentDate: contentDate,
  });

  console.log('Notifications sent:', notificationResult);
} catch (error) {
  console.error('Notification service error:', error);
  // Continue with publication flow
}

await saveUploadedFile(artefactId, uploadData.fileName, uploadData.file);
```

**Validation:**
- Publication flow continues even if notifications fail
- Notifications sent when subscriptions exist
- Errors logged but don't crash application

### Phase 8: Environment Configuration
**Files to modify:**
- `.env.example` (document required variables)
- Configuration documentation

**Tasks:**
1. Document required environment variables
2. Add Gov.Notify API key configuration
3. Add template ID configuration
4. Add service URL configuration
5. Update deployment documentation

**Required Variables:**
```bash
GOV_NOTIFY_API_KEY=<your-api-key>
GOV_NOTIFY_TEMPLATE_ID=<your-template-id>
CATH_SERVICE_URL=https://www.court-tribunal-hearings.service.gov.uk
```

**Validation:**
- All required variables documented
- Application fails gracefully if variables missing

### Phase 9: Testing & Quality Assurance

#### Unit Tests
- All service functions have unit tests
- Gov.Notify client mocked
- Prisma client mocked
- Edge cases covered
- Target: >80% coverage

#### Integration Tests
- End-to-end flow from publication to notification
- Database operations tested
- Multiple subscriptions handled correctly
- Partial failure scenarios tested

#### Manual Testing Checklist
1. Publish hearing list with active subscriptions
2. Verify emails received via Gov.Notify
3. Check notification audit log in database
4. Test with invalid email addresses
5. Test with duplicate publications (deduplication)
6. Test with no subscriptions
7. Test Gov.Notify API failures (mock)
8. Verify email content matches template

**Validation:**
- All tests pass
- Email content correct
- Audit log accurate
- Error handling works

### Phase 10: Documentation
**Files to create/modify:**
- `libs/notification/README.md`
- Update main project documentation

**Tasks:**
1. Document notification service API
2. Document Gov.Notify setup process
3. Document environment configuration
4. Document error handling and monitoring
5. Document database schema
6. Add troubleshooting guide

**Validation:**
- Documentation clear and complete
- Setup instructions work for new developers

## Technical Specifications

### Gov.Notify Template Setup
The following template must be created in Gov.Notify console:

**Subject:** New hearing list published for ((location_name))

**Body:**
```
Note this email contains Special Category Data as defined by the Data Protection Act 2018, formerly known as Sensitive Personal Data, and should be handled appropriately.

This email contains information intended to assist the accurate reporting of court proceedings. It is vital you ensure that you safeguard the Special Category Data included and abide by reporting restrictions (for example on victims and children). HMCTS will stop sending the data if there is concern about how it will be used.

---

Your subscription to get updates about ((location_name)) has been triggered based on a ((hearing_list_name)) being published for ((publication_date)).

Manage your subscriptions, view lists and additional case information within the Court and tribunal hearings service: ((manage_link))
```

**Template Variables:**
- `location_name`
- `hearing_list_name`
- `publication_date`
- `manage_link`

### Dependencies to Add

**Root package.json:**
```json
{
  "dependencies": {
    "notifications-node-client": "^8.0.0"
  }
}
```

**libs/notification/package.json:**
```json
{
  "dependencies": {
    "@hmcts/postgres": "workspace:*",
    "@hmcts/location": "workspace:*",
    "notifications-node-client": "8.0.0"
  },
  "peerDependencies": {
    "express": "^5.1.0"
  }
}
```

**libs/admin-pages/package.json (add):**
```json
{
  "dependencies": {
    "@hmcts/notification": "workspace:*"
  }
}
```

### Error Codes & Logging

**Status Values:**
- `sent` - Successfully sent via Gov.Notify
- `failed` - Failed after retry
- `skipped` - Invalid email or duplicate

**Log Levels:**
- INFO: Successful notifications, summary results
- WARN: Retries, skipped notifications, missing subscriptions
- ERROR: Failed notifications after retry, service errors

**Log Format:**
```typescript
{
  level: 'info',
  message: 'Notification sent successfully',
  artefactId: 'uuid',
  userId: 'user-123',
  locationId: 'location-456',
  status: 'sent',
  notificationId: 'uuid'
}
```

## Testing Strategy

### Unit Test Coverage
- `notification-service.ts`: All functions, error paths
- `notification-queries.ts`: All database operations
- `govnotify-client.ts`: Send email, retry logic, errors
- `email-validation.ts`: Valid/invalid email patterns

### Integration Test Scenarios
1. Happy path: Publication → subscriptions → emails sent
2. No subscriptions: Publication → no emails
3. Invalid emails: Skip invalid, send valid
4. Gov.Notify failure: Retry → log failure
5. Duplicate prevention: Unique constraint works
6. Partial failure: Some succeed, some fail

### Manual Test Plan
1. Set up Gov.Notify test API key
2. Create test subscriptions in database
3. Perform manual upload
4. Verify emails received
5. Check audit log entries
6. Test error scenarios

## Rollout Plan

### Pre-Deployment Checklist
- [ ] All unit tests passing
- [ ] Integration tests passing
- [ ] Gov.Notify template created in console
- [ ] API key configured in environment
- [ ] Database migrations applied
- [ ] Documentation complete
- [ ] Code review completed
- [ ] Security review completed

### Deployment Steps
1. Apply database migrations: `yarn db:migrate`
2. Generate Prisma client: `yarn db:generate`
3. Build notification module: `yarn workspace @hmcts/notification run build`
4. Build admin-pages module: `yarn workspace @hmcts/admin-pages run build`
5. Set environment variables
6. Deploy application
7. Verify health checks pass
8. Monitor logs for errors

### Post-Deployment Validation
1. Perform test publication
2. Verify notification sent
3. Check audit log
4. Monitor error logs
5. Verify email delivery

### Rollback Plan
If issues occur:
1. Comment out notification service call in manual-upload-summary
2. Redeploy without notification functionality
3. Publication flow continues normally
4. Debug and fix issues
5. Redeploy with fix

## Performance Considerations

### Expected Load
- Assume average 10 subscriptions per location
- Assume 100 publications per day
- Total: ~1000 notifications per day
- Peak: ~50 notifications per hour

### Gov.Notify Limits
- Rate limit: 3000 requests per minute (live keys)
- Our expected load: Well within limits
- No need for rate limiting in MVP

### Database Performance
- Indexes on artefactId, userId for fast lookups
- Unique constraint prevents duplicate writes
- Expected query time: <100ms for subscription retrieval

### Response Time
- Gov.Notify API typically responds in 200-500ms
- Expected notification processing: 500ms-2s per publication
- Acceptable impact on publication flow

### Optimization Opportunities (Future)
- Batch email sending if Gov.Notify supports it
- Async queue processing (Redis/Bull)
- Caching subscription data
- Parallel email sending (Promise.all)

## Security Considerations

### Secrets Management
- API key stored in environment variables
- Never log API keys or email addresses
- Rotate keys regularly per HMCTS policy

### Data Protection
- Email addresses validated before use
- No sensitive data in email content
- Audit log encrypted at rest in PostgreSQL
- Comply with GDPR data retention policies

### Input Validation
- Validate all artefactId and locationId inputs
- Sanitize email addresses
- Validate template parameters

### Rate Limiting
- Respect Gov.Notify rate limits
- Monitor usage to stay within quotas
- Implement alerts if approaching limits

## Monitoring & Observability

### Metrics to Track
- Total notifications sent per day/hour
- Success rate percentage
- Failure rate by reason
- Average Gov.Notify API response time
- Subscription count by location

### Alerting
- Alert on: >10% failure rate
- Alert on: Gov.Notify API errors
- Alert on: Database connection failures
- Alert on: Missing configuration

### Logging Requirements
- Log all notification attempts (INFO level)
- Log all failures (ERROR level)
- Log retry attempts (WARN level)
- Include correlation IDs for tracing

### Dashboards
- Notification success rate over time
- Failure reasons breakdown
- Processing time distribution
- Subscription growth

## Risk Mitigation

### Risk: Gov.Notify API unavailable
**Mitigation:**
- Single retry on failures
- Log failures for manual follow-up
- Don't block publication flow

### Risk: High volume of subscriptions
**Mitigation:**
- Monitor performance
- Add async processing in future if needed
- Current synchronous approach sufficient for MVP

### Risk: Database constraint violations
**Mitigation:**
- Handle unique constraint errors gracefully
- Log as INFO, not ERROR
- Continue processing other notifications

### Risk: Email delivery failures
**Mitigation:**
- Gov.Notify handles delivery retries
- We retry API call once
- Audit log tracks all attempts

### Risk: Configuration errors
**Mitigation:**
- Validate environment variables on startup
- Fail gracefully with clear error messages
- Document all required configuration

## Open Questions & Decisions Needed

1. **Gov.Notify Template:** Needs to be created in Gov.Notify console - who will do this?
2. **User model:** Where is user email stored? Assuming it's accessible via userId
3. **Bilingual templates:** EN-only for MVP or EN/CY required?
4. **Service URL:** Confirm production URL for email links
5. **Monitoring:** What monitoring/alerting tools are in place?
6. **Subscription UI:** Out of scope, but when will it be built? Need to add test subscriptions manually for now

## Success Criteria

Implementation is considered successful when:
1. All unit tests pass (>80% coverage)
2. Integration tests pass
3. Email notifications sent successfully on publication
4. Audit log captures all notification attempts
5. Error handling prevents publication blocking
6. Documentation complete
7. Code review approved
8. Security review approved
9. Manual testing completed successfully
10. Deployed to production without issues
