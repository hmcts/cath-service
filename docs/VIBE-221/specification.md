# VIBE-221: Backend - Subscription Fulfilment (Email notifications)

## Executive Summary

This specification outlines the implementation of an event-driven email notification system that automatically informs subscribed users when new hearing lists are published. The system integrates with GOV.UK Notify to send compliant, accessible email notifications containing Special Category Data as defined by the Data Protection Act 2018.

## Business Requirements

### Functional Requirements

1. **Trigger-Based Notifications**: When a hearing list is published (artefact created/updated), the system must identify and notify all subscribed users for that venue/location.

2. **GOV.UK Notify Integration**: All email notifications must be sent through the GOV.UK Notify service, ensuring government-standard email delivery with proper tracking and reporting.

3. **Data Protection Compliance**: Email content must include mandatory notices about Special Category Data handling and reporting restrictions, complying with DPA 2018 requirements.

4. **Deduplication**: Users with multiple subscriptions to the same venue should receive only one notification per publication event.

5. **Audit Trail**: All notification attempts (successful and failed) must be logged with sufficient detail for compliance and debugging purposes.

6. **Error Handling**: The system must gracefully handle failures (network issues, invalid email addresses, API rate limits) with appropriate retry mechanisms.

### Non-Functional Requirements

1. **Performance**: Notifications should be sent asynchronously to avoid blocking the publication workflow.

2. **Scalability**: The system must handle bulk notifications for popular venues with hundreds of subscribers.

3. **Reliability**: Transient failures (network timeouts, temporary API unavailability) should trigger automatic retries with exponential backoff.

4. **Security**: API keys and sensitive configuration must be managed through secure mechanisms (Azure Key Vault).

5. **Observability**: Comprehensive logging and metrics for monitoring notification delivery rates, failures, and performance.

6. **Maintainability**: Clear separation of concerns between business logic, data access, and external integrations.

## Technical Architecture

### System Components

```
Publication Event → Event Handler → Notification Service → GOV.UK Notify
                         ↓                    ↓
                   Subscription Query    Audit Logging
                         ↓
                   Email Preparation
                   (Deduplication)
```

### Component Responsibilities

#### 1. Event Handler (Trigger)
- **Location**: `apps/crons/src/send-publication-notifications.ts`
- **Purpose**: Entry point triggered by Kubernetes CronJob after publication
- **Responsibilities**:
  - Receive publication event details (artefact ID, location ID, list type)
  - Coordinate the notification workflow
  - Handle top-level error recovery

#### 2. Notification Service
- **Location**: `libs/notification/src/notification/service.ts`
- **Purpose**: Core business logic for notification processing
- **Responsibilities**:
  - Retrieve subscriptions for the published location
  - Deduplicate recipients (one email per user)
  - Prepare email content with personalisation data
  - Coordinate with GOV.UK Notify client
  - Record audit logs for each notification attempt
  - Handle batch processing for large subscriber lists

#### 3. Subscription Queries
- **Location**: `libs/notification/src/subscription/queries.ts`
- **Purpose**: Database access layer for subscription data
- **Responsibilities**:
  - Query subscriptions by location/venue
  - Retrieve user email addresses and preferences
  - Support efficient bulk queries with proper indexing

#### 4. GOV.UK Notify Client
- **Location**: `libs/notification/src/notify/client.ts`
- **Purpose**: Wrapper around notifications-node-client SDK
- **Responsibilities**:
  - Initialize and configure GOV.UK Notify client
  - Send individual email notifications
  - Handle API errors and rate limiting
  - Provide retry logic for transient failures

#### 5. Audit Repository
- **Location**: `libs/notification/src/audit/queries.ts`
- **Purpose**: Persistence layer for notification audit trail
- **Responsibilities**:
  - Create audit records for each notification attempt
  - Record success/failure status with details
  - Support querying audit history for compliance

### Database Schema

The system requires two new database tables:

#### Subscription Table
```prisma
model Subscription {
  subscriptionId   String   @id @default(uuid()) @map("subscription_id") @db.Uuid
  userId           String   @map("user_id")
  locationId       String   @map("location_id")
  listTypeId       Int?     @map("list_type_id")  // null = all list types
  createdAt        DateTime @default(now()) @map("created_at")
  updatedAt        DateTime @updatedAt @map("updated_at")

  @@unique([userId, locationId, listTypeId])
  @@index([locationId])
  @@index([userId])
  @@map("subscription")
}
```

**Key Design Decisions**:
- `listTypeId` is nullable to support "all list types" subscriptions
- Unique constraint prevents duplicate subscriptions
- Index on `locationId` for efficient query when publishing
- Index on `userId` for user management operations

#### NotificationAudit Table
```prisma
model NotificationAudit {
  auditId          String   @id @default(uuid()) @map("audit_id") @db.Uuid
  artefactId       String   @map("artefact_id") @db.Uuid
  subscriptionId   String   @map("subscription_id") @db.Uuid
  recipientEmail   String   @map("recipient_email")
  notifyReference  String?  @map("notify_reference")
  status           String   // 'sent', 'failed', 'pending'
  errorMessage     String?  @map("error_message")
  attemptCount     Int      @default(1) @map("attempt_count")
  sentAt           DateTime @default(now()) @map("sent_at")

  @@index([artefactId])
  @@index([subscriptionId])
  @@index([status])
  @@map("notification_audit")
}
```

**Key Design Decisions**:
- Records every notification attempt for full audit trail
- `notifyReference` stores GOV.UK Notify's tracking ID
- `attemptCount` tracks retries for reliability analysis
- Indexes support querying by artefact, subscription, or status
- Stores email address directly for audit purposes (even if subscription deleted)

### Email Template Design

Based on the provided mockups, the GOV.UK Notify template requires the following personalisation fields:

#### Template Personalisation Fields

```typescript
interface EmailPersonalisation {
  // Publication details
  content_date: string;        // e.g., "25th September 2025"
  list_type: string;           // e.g., "Civil and Family Daily Hearing List"

  // Subscription context (optional fields)
  case_num?: string;           // Case number if subscription is case-specific
  case_urn?: string;           // Unique reference number if available
  locations?: string;          // Location name(s)

  // Management links
  manage_subscription_url: string;  // URL to subscription management page
}
```

#### Template Content Structure

1. **Data Protection Notice** (static, from template):
   - Special Category Data warning per DPA 2018
   - Handling requirements
   - Reporting restrictions notice
   - HMCTS data usage policies

2. **Notification Body** (dynamic):
   - Trigger explanation: "Your subscription has been triggered..."
   - Publication details: List type and date
   - Context: Case numbers/URNs (if applicable)
   - Location information

3. **Call to Action**:
   - Link to manage subscriptions and view lists
   - Link text: "Manage your subscriptions, view lists and additional case information"

### Integration Points

#### 1. Publication Workflow Integration

The notification trigger must be integrated into the publication workflow:

**Option A: Database Trigger** (Recommended)
- Use PostgreSQL trigger on `artefact` table
- Trigger fires after INSERT or UPDATE
- Writes event to a queue table for async processing
- Cron job polls queue and processes events

**Option B: Application-Level Hook**
- Modify `createArtefact` function in `libs/publication/src/repository/queries.ts`
- Call notification service after successful artefact creation
- Requires careful error handling to avoid blocking publication

**Recommendation**: Option A provides better decoupling and reliability. Publication workflow remains unaffected by notification failures.

#### 2. GOV.UK Notify Configuration

**Required Configuration**:
- API Key: Stored in Azure Key Vault
- Template ID: Created in GOV.UK Notify dashboard
- Base URL: Production vs. test environment

**Environment Variables**:
```bash
NOTIFY_API_KEY=<secret-key-from-azure-keyvault>
NOTIFY_TEMPLATE_ID=<template-uuid>
NOTIFY_BASE_URL=https://api.notifications.service.gov.uk
```

#### 3. Subscription Management (Future)

While this ticket focuses on notification delivery, the subscription data must be populated. This requires:

- User interface for managing subscriptions (separate ticket)
- API endpoints for CRUD operations on subscriptions
- Integration with authentication/authorization

For initial implementation, subscriptions can be seeded via database scripts for testing.

## Security Considerations

### 1. Data Protection

**Special Category Data Handling**:
- Email contains case information (Special Category Data per DPA 2018)
- Recipients must be warned about data sensitivity
- Email content must not be stored beyond necessary retention period
- Audit logs must comply with GDPR data retention policies

**Implementation**:
- Include mandatory data protection notice in all emails
- Configure GOV.UK Notify to not retain email content longer than necessary
- Implement audit log retention policies (recommend 12 months)

### 2. API Key Management

**Requirements**:
- Never commit API keys to version control
- Use Azure Key Vault for production secrets
- Support local development with `.env` files (gitignored)
- Rotate keys periodically

**Implementation**:
```typescript
// libs/notification/src/notify/config.ts
import config from 'config';

export function getNotifyConfig() {
  const apiKey = config.get<string>('notify.apiKey');
  const templateId = config.get<string>('notify.templateId');

  if (!apiKey || !templateId) {
    throw new Error('GOV.UK Notify configuration is incomplete');
  }

  return { apiKey, templateId };
}
```

### 3. Rate Limiting

GOV.UK Notify enforces rate limits:
- Free tier: 1,000 emails per day
- Standard rate: 250,000 emails per day
- API rate limit: 3,000 requests per minute

**Implementation Strategy**:
- Batch notifications in groups
- Implement exponential backoff for 429 responses
- Queue excess notifications for later processing
- Monitor daily usage through GOV.UK Notify dashboard

### 4. Input Validation

**Email Address Validation**:
- Validate format before sending
- Handle bounced emails gracefully
- Consider email verification workflow (future enhancement)

**Personalisation Data Validation**:
- Sanitize all dynamic content
- Escape special characters
- Prevent injection attacks through template fields

## Error Handling Strategy

### Error Categories

#### 1. Transient Errors (Retry)
- Network timeouts
- API rate limiting (429)
- Temporary API unavailability (503)

**Handling**: Exponential backoff retry (max 3 attempts)

#### 2. Permanent Errors (No Retry)
- Invalid email address format
- Invalid API key (401)
- Template not found (404)

**Handling**: Log error, mark as failed in audit, alert administrators

#### 3. Validation Errors
- Missing required personalisation fields
- Invalid template data

**Handling**: Log error with full context, skip notification, alert for investigation

### Retry Logic

```typescript
interface RetryConfig {
  maxAttempts: number;      // 3
  initialDelay: number;     // 1000ms
  maxDelay: number;         // 10000ms
  backoffMultiplier: number; // 2
}
```

## Monitoring and Observability

### Key Metrics

1. **Notification Volume**:
   - Total notifications sent per hour/day
   - Notifications per list type
   - Notifications per location

2. **Success Rates**:
   - Successful deliveries vs. failures
   - Retry success rate
   - Permanent failure rate

3. **Performance**:
   - Time from publication to notification sent
   - API response times
   - Processing time for bulk notifications

4. **Errors**:
   - Count by error type
   - Rate limiting occurrences
   - Invalid email addresses

### Logging Standards

All logs must follow HMCTS standards:

```typescript
// Successful notification
logger.info('Notification sent', {
  artefactId,
  subscriptionId,
  recipientEmail: maskEmail(email),
  notifyReference,
  listType,
  location
});

// Failed notification
logger.error('Notification failed', {
  artefactId,
  subscriptionId,
  recipientEmail: maskEmail(email),
  error: error.message,
  attemptCount,
  errorCode: error.code
});
```

**Privacy Note**: Email addresses should be partially masked in logs (e.g., `j***@example.com`).

## Testing Strategy

### Unit Tests

1. **Service Layer**:
   - Subscription querying and deduplication
   - Email personalisation generation
   - Error handling and retry logic

2. **GOV.UK Notify Client**:
   - Mock API responses
   - Rate limiting handling
   - Error scenarios

3. **Audit Repository**:
   - Record creation
   - Query operations

### Integration Tests

1. **End-to-End Workflow**:
   - Publication → Notification flow
   - Database transactions
   - GOV.UK Notify integration (using test API)

2. **Error Recovery**:
   - Network failures
   - Invalid data handling
   - Transaction rollbacks

### E2E Tests (Playwright)

1. **Subscription Management** (future):
   - Create/update/delete subscriptions
   - Verify notification preferences

2. **Email Verification** (future):
   - Test email delivery in staging environment
   - Verify template rendering

## Performance Considerations

### Scalability Requirements

**Expected Load**:
- Average: 100-500 notifications per publication
- Peak: 2,000 notifications (popular venues)
- Daily volume: 10,000-50,000 notifications

**Optimization Strategies**:

1. **Batch Processing**:
   - Process subscriptions in batches of 100
   - Parallel processing where safe
   - Connection pooling for database queries

2. **Database Optimization**:
   - Proper indexing on subscription queries
   - Use of prepared statements
   - Connection pooling (Prisma default)

3. **Asynchronous Processing**:
   - Notifications sent via background job
   - Non-blocking publication workflow
   - Queue-based architecture for high volume

### Database Query Optimization

Critical query: Find all subscriptions for a location

```sql
-- Optimized query with proper indexes
SELECT DISTINCT s.user_id, s.subscription_id, u.email
FROM subscription s
JOIN user u ON s.user_id = u.id
WHERE s.location_id = $1
  AND (s.list_type_id = $2 OR s.list_type_id IS NULL)
  AND u.email_verified = true
  AND u.is_active = true
ORDER BY u.email;
```

**Index Requirements**:
- Composite index: `(location_id, list_type_id)`
- Index on `user.email_verified`
- Index on `user.is_active`

## Implementation Phases

### Phase 1: Foundation (Priority: High)
- Database schema (Subscription and NotificationAudit tables)
- Prisma models and migrations
- Basic notification service structure
- GOV.UK Notify client wrapper

### Phase 2: Core Functionality (Priority: High)
- Subscription queries with deduplication
- Email personalisation logic
- Audit logging
- Error handling and retry logic

### Phase 3: Integration (Priority: High)
- Cron job trigger
- Integration with publication workflow
- Configuration management
- Environment setup (dev/staging/prod)

### Phase 4: Monitoring & Testing (Priority: Medium)
- Comprehensive unit tests
- Integration tests
- Logging and metrics
- Performance testing

### Phase 5: Documentation & Deployment (Priority: Medium)
- GOV.UK Notify template creation guide
- Configuration documentation
- Deployment runbook
- Monitoring dashboard setup

## Dependencies

### External Services
- **GOV.UK Notify**: Email delivery service
  - SDK: `notifications-node-client` (npm package)
  - Documentation: https://docs.notifications.service.gov.uk/node.html

### Internal Dependencies
- `@hmcts/postgres`: Database access via Prisma
- `@hmcts/cloud-native-platform`: Configuration and secrets management
- `@hmcts/location`: Location/venue data
- `@hmcts/list-types-common`: List type definitions
- `@hmcts/publication`: Artefact models

### Configuration Dependencies
- Azure Key Vault: API key storage
- Kubernetes CronJob: Scheduled trigger
- PostgreSQL: Data persistence

## Risks and Mitigations

### Risk 1: GOV.UK Notify Rate Limiting
**Impact**: High volume of notifications could hit API rate limits
**Probability**: Medium
**Mitigation**:
- Implement request throttling
- Queue excess notifications
- Monitor usage proactively
- Upgrade GOV.UK Notify plan if needed

### Risk 2: Email Deliverability
**Impact**: Notifications not reaching users due to spam filters
**Probability**: Low (GOV.UK Notify has good reputation)
**Mitigation**:
- Use GOV.UK Notify's established infrastructure
- Follow email best practices in template design
- Monitor bounce rates
- Implement email verification (future enhancement)

### Risk 3: Data Protection Compliance
**Impact**: Mishandling Special Category Data could result in regulatory issues
**Probability**: Low (with proper implementation)
**Mitigation**:
- Mandatory data protection notices in all emails
- Audit trail for compliance
- Regular security reviews
- Staff training on data handling

### Risk 4: Publication Workflow Coupling
**Impact**: Notification failures could block publications
**Probability**: Low (with async design)
**Mitigation**:
- Asynchronous processing via cron job
- Separate failure domains
- Robust error handling
- Circuit breaker pattern if needed

### Risk 5: Subscription Data Quality
**Impact**: Invalid email addresses or orphaned subscriptions
**Probability**: Medium
**Mitigation**:
- Email address validation
- Regular data cleanup
- Email verification workflow (future)
- Unsubscribe mechanism

## Open Questions

1. **User Model**: Does a user table exist with email addresses? If not, how are user emails stored?
   - **Answer Needed**: Review existing auth/account modules

2. **Subscription UI**: Is there a separate ticket for subscription management UI?
   - **Answer Needed**: Check backlog for related tickets

3. **Email Verification**: Should emails be verified before sending notifications?
   - **Recommendation**: Start without verification, add in future iteration

4. **Notification Frequency**: Should there be rate limiting per user (e.g., max 1 email per hour)?
   - **Recommendation**: Not initially, but monitor for user complaints

5. **Language Preferences**: Should emails respect user's language preference (English/Welsh)?
   - **Recommendation**: Yes, use separate GOV.UK Notify templates for Welsh

6. **Unsubscribe Mechanism**: How should users opt out of notifications?
   - **Answer Needed**: Part of subscription management UI (separate ticket)

## Success Criteria

### Technical Success
- [ ] All subscribed users receive notification within 5 minutes of publication
- [ ] Email delivery success rate > 95%
- [ ] Zero publication workflow disruptions due to notification failures
- [ ] All notification attempts logged in audit table
- [ ] System handles 2,000+ concurrent notifications without errors

### Business Success
- [ ] Users report receiving timely notifications
- [ ] Data protection notices clearly visible in emails
- [ ] Audit trail sufficient for compliance requirements
- [ ] Bounce rate < 5%
- [ ] User satisfaction with notification content and timing

### Compliance Success
- [ ] All Special Category Data warnings present
- [ ] Audit logs retained per GDPR requirements
- [ ] API keys securely managed (no plaintext exposure)
- [ ] Security review passed
- [ ] Accessibility requirements met (email content)

## Appendix

### A. Email Template Mockup Analysis

Based on the provided mockups:

**Header**:
- GOV.UK branding (blue bar with crown)
- Consistent with government email standards

**Data Protection Notice**:
- Prominent placement at top of email
- Clear warning about Special Category Data
- Handling instructions
- Reporting restrictions
- HMCTS data usage policy reference

**Notification Body**:
- Clear trigger explanation
- Publication details (list type, date)
- Contextual information (case numbers, locations)
- Personalisation based on subscription type

**Call to Action**:
- Link to manage subscriptions
- Link to view lists
- Link to additional case information

**Footer**:
- Sender identification: "Court and tribunal hearings service"
- Reply-to address: `PublicationsInformation@justice.gov.uk`
- Standard government email footer

### B. GOV.UK Notify Template Syntax

GOV.UK Notify uses double parentheses for personalisation:

```
Your subscription has been triggered based on a ((list_type))
being published for the date ((content_date)).

((case_num))* with case number or ID)) ((case_num))
((case_urn))* with unique reference number)) ((case_urn))
((locations??*)) ((locations))
```

Conditional fields (optional personalisation) are supported, allowing template to adapt based on available data.

### C. Related JIRA Tickets

- **VIBE-220**: Frontend - Subscription Management UI
- **VIBE-222**: Email Verification Flow
- **VIBE-223**: Subscription Analytics Dashboard
- **VIBE-224**: Notification Preferences Enhancement

### D. References

- [GOV.UK Notify Documentation](https://docs.notifications.service.gov.uk/)
- [GOV.UK Design System](https://design-system.service.gov.uk/)
- [Data Protection Act 2018](https://www.legislation.gov.uk/ukpga/2018/12/contents)
- [HMCTS Design Principles](https://hmcts-design.herokuapp.com/)
- [Prisma Best Practices](https://www.prisma.io/docs/guides/performance-and-optimization)
