# Notification Integration Plan for List Type Subscriptions

## Overview

Extend the existing notification system to support list type subscriptions. When a publication is received, users subscribed to that list type should receive email notifications based on their language preferences.

## Current Notification Architecture

**Trigger Point:** `libs/api/src/blob-ingestion/repository/service.ts` (line 98-119)
- Calls `triggerPublicationNotifications()` after artefact creation
- Passes: `locationId`, `artefactId`, `publicationId`

**Notification Service:** `libs/notifications/src/notification-service.ts`
- Queries location, case number, and case name subscriptions
- Groups subscriptions by userId
- Builds personalized template parameters
- Sends via GOV.UK Notify

**Template:** Single GOV.UK Notify template (`GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION`)
- Conditionally displays location info (`display_locations`)
- Conditionally displays case info (`display_case`)

## Changes Required

### 1. Update Notification Trigger

**File:** `libs/api/src/blob-ingestion/repository/service.ts`

Add `listTypeId` to notification trigger:

```typescript
// Current (line 111):
triggerPublicationNotifications(
  artefact.locationId,
  artefact.artefactId,
  artefact.publicationId
);

// New:
triggerPublicationNotifications(
  artefact.locationId,
  artefact.artefactId,
  artefact.publicationId,
  artefact.listTypeId,  // Add this
  artefact.language     // Add this
);
```

### 2. Add List Type Subscription Query

**File:** `libs/subscription-list-types/src/subscription-list-type/queries.ts`

Create new query function:

```typescript
/**
 * Find active subscriptions for a specific list type and language
 * @param listTypeId - The list type ID from the publication
 * @param language - The publication language (e.g., "ENGLISH", "WELSH")
 * @returns Array of subscriptions with user information
 */
export async function findActiveSubscriptionsByListType(
  listTypeId: number,
  language: string
): Promise<SubscriptionListTypeWithUser[]> {
  return prisma.subscriptionListType.findMany({
    where: {
      listTypeId,
      OR: [
        { language }, // Exact match
        { language: "BOTH" } // Users who want both languages
      ],
      user: {
        isActive: true, // Only active users
        email: { not: null } // Must have email
      }
    },
    include: {
      user: {
        select: {
          userId: true,
          email: true,
          forenames: true,
          surname: true
        }
      }
    }
  });
}
```

### 3. Update Notification Service Signature

**File:** `libs/notifications/src/notification-service.ts`

Update function signatures:

```typescript
// Line 26 - Update function signature:
export async function sendPublicationNotifications(
  locationId: number,
  artefactId: string,
  publicationId: string,
  listTypeId: number,      // Add
  language: string          // Add
): Promise<NotificationResult>

// Line 35 - Update PublicationEvent interface:
interface PublicationEvent {
  artefactId: string;
  publicationId: string;
  locationId: number;
  listTypeId: number;       // Add
  language: string;          // Add
}
```

### 4. Query List Type Subscriptions

**File:** `libs/notifications/src/notification-service.ts`

Add list type subscription query after existing queries (around line 45):

```typescript
// After location subscriptions query:
const locationSubscriptions = await findActiveSubscriptionsByLocation(locationId);

// Add this:
const listTypeSubscriptions = await findActiveSubscriptionsByListType(
  listTypeId,
  language
);
```

### 5. Combine Subscriptions

**File:** `libs/notifications/src/notification-service.ts`

Update the subscription combining logic (around line 55):

```typescript
// Current:
const allSubscriptions = [
  ...locationSubscriptions,
  ...caseSubscriptions
];

// New:
const allSubscriptions = [
  ...locationSubscriptions,
  ...caseSubscriptions,
  ...listTypeSubscriptions.map(sub => ({
    subscriptionId: sub.listTypeSubscriptionId,
    userId: sub.userId,
    searchType: 'LIST_TYPE' as const,
    searchValue: sub.listTypeId.toString(),
    user: sub.user
  }))
];
```

### 6. Update Template Parameters (Optional)

**File:** `libs/notifications/src/notification-service.ts`

If needed, add list type language info to template parameters:

```typescript
// In buildTemplateParameters function (line 108):
const hasListTypeSubscription = userSubscriptions.some(
  sub => sub.searchType === 'LIST_TYPE'
);

// Add to template params if needed:
{
  // ... existing params
  display_list_type_language: hasListTypeSubscription ? "yes" : "",
  list_type_language: language // Publication language
}
```

**Note:** This may not be needed if the existing template already displays list type info appropriately.

### 7. Update Notification Audit Log

**Option A - Minimal Change (Recommended):**
Store list type subscription ID in existing `subscriptionId` field.

**Option B - Schema Extension:**
Add optional `listTypeSubscriptionId` field:

```prisma
// libs/notifications/prisma/schema.prisma
model NotificationAuditLog {
  notificationId           String    @id @default(uuid())
  subscriptionId           String?   @map("subscription_id") @db.Uuid  // Make optional
  listTypeSubscriptionId   String?   @map("list_type_subscription_id") @db.Uuid  // Add
  userId                   String    @map("user_id") @db.Uuid
  publicationId            String    @map("publication_id") @db.Uuid
  govNotifyId              String?   @map("gov_notify_id")
  status                   String    @default("Pending")
  errorMessage             String?   @map("error_message")
  createdAt                DateTime  @default(now())
  sentAt                   DateTime? @map("sent_at")

  @@map("notification_audit_log")
}
```

## Implementation Steps

### Step 1: Update Subscription Module
1. Add `findActiveSubscriptionsByListType()` query function
2. Add unit tests for query with language filtering

### Step 2: Update Notification Service
1. Update function signatures to accept `listTypeId` and `language`
2. Query list type subscriptions
3. Combine with existing subscriptions
4. Update template parameters if needed
5. Add unit tests

### Step 3: Update Blob Ingestion Trigger
1. Pass `listTypeId` and `language` to notification service
2. Add integration test

### Step 4: Update Audit Logging (if using Option B)
1. Add schema migration
2. Update `createNotificationAuditLog()` to accept optional `listTypeSubscriptionId`

### Step 5: E2E Testing
Include in existing list type subscription E2E test:
1. Create list type subscription
2. Trigger notification via blob ingestion
3. Verify notification sent
4. Check audit log created

## Language Matching Logic

Users receive notifications based on their language preference:

| User Preference | Publication Language | Receives Notification? |
|-----------------|---------------------|------------------------|
| ENGLISH         | ENGLISH             | Yes                    |
| ENGLISH         | WELSH               | No                     |
| WELSH           | WELSH               | Yes                    |
| WELSH           | ENGLISH             | No                     |
| BOTH            | ENGLISH             | Yes                    |
| BOTH            | WELSH               | Yes                    |

Implemented via SQL `OR` clause in query:
```sql
WHERE language = 'ENGLISH' OR language = 'BOTH'
```

## Testing Strategy

### Unit Tests
- `findActiveSubscriptionsByListType()` with language filtering
- Template parameter building with list type subscriptions
- Subscription combining logic

### Integration Tests
- Full notification flow with list type subscription
- Verify correct users notified based on language preference
- Verify audit log created correctly

### E2E Test (within existing journey)
Add notification verification to main list type subscription test:
```typescript
// After subscription created:
// Trigger publication (via test helper)
await triggerTestPublication(listTypeId, 'ENGLISH');

// Wait for notification (check audit log)
const notifications = await prisma.notificationAuditLog.findMany({
  where: { userId: testUser.userId }
});
expect(notifications).toHaveLength(1);
expect(notifications[0].status).toBe('Sent');
```

## Error Handling

### No Active Subscriptions
- Return empty array from query
- No notifications sent
- Log: "No active subscriptions for list type X"

### Invalid Language
- Skip notification
- Log warning
- Continue processing other subscriptions

### GOV.UK Notify Failure
- Existing retry logic applies
- Audit log updated with error
- Does not block other notifications

## Open Questions

1. **Template Content:** Does the current GOV.UK Notify template need updates to display list type language preference?

2. **Notification Frequency:** Should there be rate limiting if a user subscribes to many list types and receives multiple publications?

3. **Language Mismatch:** If a user subscribes to "ENGLISH" but publication language is missing/unknown, should they receive notification?

4. **Audit Log Schema:** Use Option A (minimal) or Option B (explicit field)? Option A is simpler but Option B provides clearer data model.

5. **Combined Notifications:** If a user has both location subscription AND list type subscription for the same publication, should they receive:
   - One combined notification?
   - Two separate notifications?
   - Currently: One notification (grouped by userId)

## Recommendation

**Use existing notification architecture with minimal changes:**
- Single notification per user per publication (existing behavior)
- Add list type subscriptions to existing subscription grouping
- Reuse existing GOV.UK Notify template
- Use Option A for audit log (store in existing `subscriptionId` field)

This approach minimizes changes and maintains consistency with existing notification behavior.
