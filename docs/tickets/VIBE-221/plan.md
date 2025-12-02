# VIBE-221: Technical Plan - Subscription Fulfilment (Email Notifications)

## Technical Approach

### Architecture Overview
Create a notification system that triggers automatically when a hearing list is published. The system will:
- Query subscriptions for the published location
- Deduplicate notifications per user/publication
- Send emails via Gov.Notify
- Log all notification attempts with detailed status tracking

### Key Design Decisions

**Module Structure:**
- Create `@hmcts/notifications` library in `libs/notifications/`
- Follow functional programming pattern (no classes unless shared state required)
- Separate concerns: service layer, data access layer, Gov.Notify integration

**Database Strategy:**
- Add two new tables via Prisma: `subscription` and `notification_audit_log`
- Use snake_case for all database fields (Prisma `@map` for TypeScript camelCase)
- Add indexes on frequently queried fields (location_id, user_id, publication_id)

**Deduplication Strategy:**
- Database-level unique constraint on `(user_id, publication_id)` in notification_audit_log
- Check for existing notification before sending (query before insert)
- Handle unique constraint violations gracefully

**Error Handling:**
- Retry Gov.Notify failures once with exponential backoff
- Log all failures with detailed error messages
- Continue processing remaining users if one fails (partial success pattern)

**Integration Points:**
- Gov.Notify API client for email sending
- Event trigger from hearing list publication (integrated with existing publication flow)

## Implementation Details

### File Structure
```
libs/notifications/
├── package.json
├── tsconfig.json
├── prisma/
│   └── schema.prisma              # Subscription and audit log models
└── src/
    ├── config.ts                   # Module exports (prismaSchemas)
    ├── index.ts                    # Business logic exports
    ├── notification/
    │   ├── notification-service.ts           # Core notification logic
    │   ├── notification-queries.ts           # Audit log database queries
    │   ├── subscription-queries.ts           # Subscription queries
    │   └── validation.ts                     # Email validation
    └── govnotify/
        ├── govnotify-client.ts               # Gov.Notify integration
        └── template-config.ts                # Template configuration
```

### Database Schema

#### Subscription Table
```prisma
model Subscription {
  subscriptionId String   @id @default(cuid()) @map("subscription_id")
  userId         String   @map("user_id")
  locationId     String   @map("location_id")
  dateAdded      DateTime @default(now()) @map("date_added")

  notificationAuditLogs NotificationAuditLog[]

  @@index([locationId])
  @@index([userId])
  @@map("subscription")
}
```

#### Notification Audit Log Table
```prisma
model NotificationAuditLog {
  notificationId  String    @id @default(cuid()) @map("notification_id")
  subscriptionId  String    @map("subscription_id")
  userId          String    @map("user_id")
  publicationId   String    @map("publication_id")
  status          String    @default("Pending") // "Sent", "Failed", "Skipped", "Duplicate filtered"
  errorMessage    String?   @map("error_message")
  createdAt       DateTime  @default(now()) @map("created_at")
  sentAt          DateTime? @map("sent_at")

  subscription    Subscription @relation(fields: [subscriptionId], references: [subscriptionId])

  @@unique([userId, publicationId])
  @@index([publicationId])
  @@index([status])
  @@map("notification_audit_log")
}
```

### Core Components

#### 1. Notification Service (`notification-service.ts`)
Main orchestrator that:
- Accepts publication event (location_id, publication_id, hearing_list_name, publication_date, location_name)
- Retrieves active subscriptions for the location
- Deduplicates notifications (check existing audit logs)
- Sends emails via Gov.Notify client
- Logs all results to audit table
- Handles partial success scenarios

**Key functions:**
```typescript
export async function sendPublicationNotifications(event: PublicationEvent): Promise<NotificationResult>
async function processUserNotification(subscription: Subscription, event: PublicationEvent): Promise<UserNotificationResult>
```

#### 2. Subscription Queries (`subscription-queries.ts`)
Database access for subscriptions:
```typescript
export async function findActiveSubscriptionsByLocation(locationId: string): Promise<Subscription[]>
```

#### 3. Notification Queries (`notification-queries.ts`)
Database access for audit logs:
```typescript
export async function createNotificationAuditLog(data: CreateNotificationData): Promise<NotificationAuditLog>
export async function updateNotificationStatus(notificationId: string, status: string, sentAt?: Date, errorMessage?: string): Promise<void>
export async function findExistingNotification(userId: string, publicationId: string): Promise<NotificationAuditLog | null>
```

#### 4. Gov.Notify Client (`govnotify-client.ts`)
Integration with Gov.Notify API:
```typescript
export async function sendEmail(params: SendEmailParams): Promise<SendEmailResult>
async function retryWithBackoff<T>(fn: () => Promise<T>, retries: number): Promise<T>
```

**Required environment variables:**
- `GOVUK_NOTIFY_API_KEY`
- `GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION`
- `GOVUK_NOTIFY_BASE_URL` (optional, defaults to production)
- `CATH_SERVICE_URL` (for manage subscriptions link)

#### 5. Validation (`validation.ts`)
Email format validation:
```typescript
export function isValidEmail(email: string): boolean
export function validateNotificationData(data: NotificationData): ValidationResult
```

### Gov.Notify Template Parameters
The template must support these dynamic parameters:
- `user_name` - User's full name from user profile
- `hearing_list_name` - Name of the published hearing list
- `publication_date` - Publication date (formatted as "DD MMMM YYYY")
- `location_name` - Court/tribunal venue name
- `manage_link` - URL to CaTH service (https://www.court-tribunal-hearings.service.gov.uk/)

### Gov.Notify Email Template Structure

Following the specification exactly:

**Subject Line:**
```
New hearing list published: ((hearing_list_name))
```

**Email Body:**

**Section 1 - Opening Notice:**
```
Note this email contains Special Category Data as defined by the Data Protection Act 2018,
formerly known as Sensitive Personal Data, and should be handled appropriately.

This email contains information intended to assist the accurate reporting of court proceedings.
It is vital you ensure that you safeguard the Special Category Data included and abide by reporting
restrictions (for example on victims and children). HMCTS will stop sending the data if there is
concern about how it will be used.
```

**Section 2 - Notification Message:**
```
Your subscription to get updates about the below has been triggered based on a
[Hearing List name] being published for the [date].
```

**Section 3 - Service Link:**
```
Manage your subscriptions, view lists and additional case information
within the Court and tribunal hearings service.
```
Link URL: https://www.court-tribunal-hearings.service.gov.uk/

### API Integration Points

**Trigger Point:**
The notification service will be called from the hearing list publication flow. The publication service should import and call:
```typescript
import { sendPublicationNotifications } from "@hmcts/notifications";

// After successful publication
await sendPublicationNotifications({
  publicationId: publication.id,
  locationId: publication.locationId,
  hearingListName: publication.listName,
  publicationDate: publication.publishedAt,
  locationName: publication.location.name
});
```

### Error Handling & Edge Cases

#### Error Scenarios

1. **Gov.Notify Send Failure**
   - Retry once with 1 second delay
   - If second attempt fails, log as "Failed" with error message
   - Continue processing other users

2. **Invalid User Data**
   - Missing user ID: Log as "Skipped", include error message
   - Missing email: Log as "Skipped - No email address"
   - Invalid email format: Log as "Skipped - Invalid email format"

3. **Duplicate Notifications**
   - Check audit log before processing
   - If notification exists, log as "Duplicate filtered", skip sending
   - Database unique constraint as fallback

4. **Database Write Failures**
   - Retry audit log write once
   - If fails, log error but don't block other notifications
   - Consider eventual consistency for audit logs

5. **Partial Success**
   - Track individual success/failure per user
   - Return summary with counts: sent, failed, skipped, duplicates
   - All individual results logged to audit table

6. **Network Timeout**
   - Set reasonable timeout for Gov.Notify API (e.g., 10 seconds)
   - Treat timeout as failure, follow retry logic
   - Log timeout errors distinctly

7. **Invalid Template**
   - Validate template ID in configuration
   - Fail fast if template ID missing or invalid
   - Log configuration error

8. **API Endpoint Unreachable**
   - Not applicable for MVP (email only)
   - Future feature for API notifications

9. **Blob or DB Write Failure**
   - Retry once
   - Log failure if retry unsuccessful
   - Continue processing other notifications

#### Validation Requirements

**Pre-send validation:**
- Publication event data (all required fields present)
- User has email address in profile
- Email address passes RFC2822 format validation
- Gov.Notify template ID exists in config
- Gov.Notify API key is configured

**Runtime validation:**
- Subscription is active (status check not in original spec but good practice)
- Location ID matches publication
- No existing notification for user + publication

### Deduplication Implementation

**Primary Strategy:**
1. Query notification_audit_log for existing record with userId + publicationId
2. If exists, skip and log as "Duplicate filtered"
3. If not exists, create audit log entry with status "Pending"
4. Send email
5. Update audit log entry with result

**Fallback Strategy:**
- Database unique constraint on (user_id, publication_id)
- Catch constraint violation errors
- Log as "Duplicate filtered" if constraint violation occurs

**Concurrent Request Handling:**
- Database constraint handles race conditions
- First request wins, subsequent requests get constraint violation
- All attempts logged appropriately

## Acceptance Criteria Mapping

### AC1: Trigger on Publication
**Implementation:**
- Export `sendPublicationNotifications` function from notifications service
- Called from hearing list publication flow after successful publish
- Accepts publication event with all required data

**Verification:**
- Integration test: Call notification service after publication
- Check audit log entries created
- Verify emails sent to subscribed users

### AC2: Retrieve Active Subscriptions
**Implementation:**
- `findActiveSubscriptionsByLocation` query with location_id filter
- Returns all matching subscriptions

**Verification:**
- Unit test: Query with known location_id
- Verify only subscriptions for that location returned
- Test with no subscriptions (empty result)

### AC3: One Email Per User Per Publication
**Implementation:**
- `findExistingNotification` check before processing
- Unique constraint on (user_id, publication_id)
- Skip if notification already exists

**Verification:**
- Integration test: Trigger notification twice for same publication
- Verify only one email sent per user
- Check audit log shows "Duplicate filtered" for second attempt

### AC4: Validate Subscription Details
**Implementation:**
- `isValidEmail` function with RFC2822 regex
- Check user has email address in profile
- Validate before calling Gov.Notify

**Verification:**
- Unit test: Validate various email formats
- Test invalid emails are skipped and logged
- Test missing email addresses are skipped

### AC5: Error Handling
**Implementation:**
- Try-catch blocks around Gov.Notify calls
- Retry logic with exponential backoff
- Detailed error logging in audit table
- Skip invalid users, continue processing others

**Verification:**
- Integration test: Mock Gov.Notify failures
- Verify retry attempts logged
- Verify partial success (some sent, some failed)
- Test invalid user IDs skipped

### AC6: Deduplication
**Implementation:**
- Database unique constraint
- Pre-send duplicate check
- Concurrent request handling via constraint

**Verification:**
- Integration test: Concurrent triggers for same publication
- Verify exactly one notification per user
- Check audit log for duplicate filter entries

### AC7: Gov.Notify Integration
**Implementation:**
- `govnotify-client.ts` using official Gov.Notify Node.js client
- Template with required parameters per specification
- Error handling and retry logic

**Verification:**
- Integration test with Gov.Notify sandbox
- Verify email format matches specification exactly
- Verify all template parameters populated correctly
- Test Gov.Notify API failures handled

### AC8: Email Content Only (No Attachments)
**Implementation:**
- Only text-based email via Gov.Notify template
- No attachment handling in this iteration

**Verification:**
- Manual test: Receive email, verify no attachments
- Verify template contains only text sections per spec

## Testing Strategy

### Unit Tests
- `notification-service.test.ts` - Core business logic
- `validation.test.ts` - Email validation
- `govnotify-client.test.ts` - Gov.Notify integration (mocked)
- `subscription-queries.test.ts` - Database queries (mocked)
- `notification-queries.test.ts` - Audit log queries (mocked)

### Integration Tests
- End-to-end notification flow with test database
- Gov.Notify sandbox integration
- Deduplication scenarios
- Error handling and retry logic
- Partial success scenarios

### E2E Tests (from specification)
- **TS1**: Trigger notification on publication - Email trigger raised, all subscribed users receive notification
- **TS2**: Multiple triggers same publication - One email per user (deduplicated)
- **TS7**: Gov.Notify fails once - Retry once; success logged
- **TS8**: Gov.Notify fails persistently - Logged as "Failed to send"
- **TS9**: Partial success - Success/failure logged per user
- **TS10**: Audit log - Query audit endpoint shows all sends with timestamps and statuses

### Manual Testing
- Receive actual email from Gov.Notify
- Verify email content matches specification exactly (all three sections)
- Test manage subscriptions link works
- Verify accessibility of email template
- Verify Special Category Data notice is prominent

## Configuration Requirements

### Environment Variables
```bash
# Gov.Notify Configuration
GOVUK_NOTIFY_API_KEY=your-api-key-here
GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION=your-template-id-here
GOVUK_NOTIFY_BASE_URL=https://api.notifications.service.gov.uk  # Optional

# CaTH Service URL
CATH_SERVICE_URL=https://www.court-tribunal-hearings.service.gov.uk

# Retry Configuration (optional, defaults)
NOTIFICATION_RETRY_ATTEMPTS=1
NOTIFICATION_RETRY_DELAY_MS=1000

# Timeout Configuration (optional, defaults)
GOVUK_NOTIFY_TIMEOUT_MS=10000
```

### Gov.Notify Template Setup
Template must be created in Gov.Notify dashboard with:
- Template name: "CaTH Hearing List Publication Notification"
- Template type: Email
- Personalisation fields: user_name, hearing_list_name, publication_date, location_name, manage_link
- Content structure per specification (exact format):
  1. GOV.UK banner
  2. Special Category Data notice (exact wording from spec)
  3. Notification message section
  4. Service link section

## Performance Considerations

### Batch Processing
- Process subscriptions concurrently using `Promise.allSettled()`
- Publication doesn't wait for notifications (fire-and-forget pattern)
- Individual failures don't affect batch

### Database Optimization
- Index on `locationId` for subscription lookups
- Index on `(userId, publicationId)` for deduplication
- Index on `status` for audit queries

### Gov.Notify Rate Limits
- Standard tier: 3000 emails per minute
- No artificial throttling needed for MVP
- Future: Add rate limiting if subscription volume exceeds limits

## Security & Compliance

### Data Protection
- **Special Category Data**: Warning included in email template (exact wording per specification)
- **GDPR Compliance**: Audit log for data processing transparency
- **DPA 2018 Compliance**: Email notice about handling sensitive personal data
- **Email security**: All connections via HTTPS
- **No PII in logs**: User IDs only, no email addresses in console logs

### Access Control
- Gov.Notify API key stored in Azure Key Vault
- Database access via Prisma with connection pooling
- Audit log read-only for non-admin users

### Data Retention
- Audit logs retained per HMCTS policy
- Subscription data managed by separate subscription module

## Open Questions

### CLARIFICATIONS NEEDED

1. **User Profile Integration:**
   - Where is user email address stored? (Assume user table with email field?)
   - Where is user name stored for template personalization?
   - Do we need to fetch user data from a separate service or is it in the database?
   - What is the user table structure?

2. **Gov.Notify Configuration:**
   - What is the Gov.Notify template ID? (Needs to be created first)
   - Is the Gov.Notify API key available in all environments (dev, staging, prod)?
   - Should we use Gov.Notify sandbox for testing?
   - Who creates templates in Gov.Notify dashboard?
   - What are the approval processes?

3. **Bilingual Support:**
   - Are bilingual templates required? (Spec says "confirm if bilingual EN/CY required")
   - If yes, do we need separate Gov.Notify templates for English and Welsh?
   - How do we determine user's language preference?

4. **Trigger Integration:**
   - Where exactly in the codebase is the hearing list publication flow?
   - Is it synchronous or should we use a message queue? (Spec asks for confirmation)
   - Should notification sending be async (background job) or block the publication?
   - Recommendation: Synchronous fire-and-forget (don't block publication)

5. **Deduplication Implementation:**
   - Should we use database flag or in-memory cache? (Spec asks for confirmation)
   - Recommendation: Use database unique constraint for reliability and simplicity

6. **Retry Policy:**
   - Confirm number of retries (spec suggests "retry once")
   - Confirm retry interval (recommendation: 1 second, then exponential backoff)
   - Should failed notifications be queued for later retry?
   - Recommendation: Retry once immediately, then mark as failed

7. **Location Data:**
   - Is location name stored in a separate table?
   - Do we need to join with location/venue table to get location_name?
   - What is the structure of the location/venue table?

8. **Publication Data:**
   - What is the structure of the publication/hearing list data?
   - Where is publication_date stored and what format?
   - Where is hearing_list_name stored?

9. **Testing in Sandbox:**
   - Can we use Gov.Notify sandbox/test mode for automated tests?
   - Are there test email addresses we should use?

10. **Performance Considerations:**
    - What is the expected number of subscriptions per location?
    - Should we batch email sends if there are many subscribers?
    - Should we implement rate limiting for Gov.Notify API calls?

11. **Monitoring & Alerting:**
    - Should we expose metrics for notification success/failure rates?
    - Should we alert on high failure rates?
    - Is there a monitoring dashboard we should integrate with?

12. **Service URL:**
    - Confirm production URL: https://www.court-tribunal-hearings.service.gov.uk/
    - Is there a specific page for managing subscriptions?

## Scope Note

This ticket only covers basic email notifications and does NOT include:
- PDF attachments
- Email summaries
- API endpoint notifications
- User preference management (notification frequency, etc.)

These features will be implemented in later iterations per the specification.
