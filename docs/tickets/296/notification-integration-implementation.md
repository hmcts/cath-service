# Notification Integration Implementation Summary

## Overview

Successfully implemented notification integration for list type subscriptions. Users who subscribe to specific list types will now receive email notifications when publications matching their subscriptions are ingested.

## Changes Made

### 1. Added List Type Subscription Query Function

**File:** `libs/subscription-list-types/src/subscription-list-type/repository/queries.ts`

Added `findActiveSubscriptionsByListType()` function:
- Queries subscriptions by `listTypeId` and `language`
- Uses Prisma array `has` operator to match language (supports "ENGLISH", "WELSH", or arrays containing both)
- Filters for active users with valid email addresses
- Returns subscriptions with user information

```typescript
export async function findActiveSubscriptionsByListType(
  listTypeId: number,
  language: string,
  tx?: TransactionClient
)
```

### 2. Exported Service Function

**File:** `libs/subscription-list-types/src/subscription-list-type/repository/service.ts`

Added wrapper function for notification service:
```typescript
export async function getActiveSubscriptionsByListType(
  listTypeId: number,
  language: string
)
```

### 3. Extended Notification Service

**File:** `libs/notifications/src/notification/validation.ts`

Extended `PublicationEvent` interface:
- Added optional `listTypeId?: number`
- Added optional `language?: string`

**File:** `libs/notifications/src/notification/notification-service.ts`

Changes:
- Imported `getActiveSubscriptionsByListType` from subscription-list-types module
- Added `getListTypeSubscriptions()` helper function to fetch and transform list type subscriptions
- Integrated list type subscription query into main notification flow
- Combined list type subscriptions with location and case subscriptions
- Mapped list type subscriptions to standard `SubscriptionWithUser` format

### 4. Updated Blob Ingestion Service

**File:** `libs/api/src/blob-ingestion/repository/service.ts`

Changes:
- Updated `triggerPublicationNotifications()` function signature to accept `language` parameter
- Passed `language` from `request.language` to notification trigger
- Updated `sendPublicationNotifications()` call to include `listTypeId` and `language`

## Language Matching Logic

The implementation uses Prisma's array `has` operator to match language preferences:

| User Subscription | Publication Language | Notification Sent |
|-------------------|---------------------|-------------------|
| ["ENGLISH"]       | ENGLISH             | ✓                 |
| ["ENGLISH"]       | WELSH               | ✗                 |
| ["WELSH"]         | WELSH               | ✓                 |
| ["WELSH"]         | ENGLISH             | ✗                 |
| ["ENGLISH", "WELSH"] | ENGLISH          | ✓                 |
| ["ENGLISH", "WELSH"] | WELSH             | ✓                 |

SQL equivalent:
```sql
WHERE language @> ARRAY['ENGLISH']  -- Has ENGLISH in array
```

## Test Coverage

### Unit Tests Added

**File:** `libs/subscription-list-types/src/subscription-list-type/repository/queries.test.ts`

Added 3 test cases for `findActiveSubscriptionsByListType()`:
1. Returns active subscriptions for list type and language
2. Returns subscriptions for users who want both languages
3. Returns empty array when no active subscriptions

**File:** `libs/notifications/src/notification/notification-service.test.ts`

Added 3 test cases:
1. Sends notifications to list type subscribers
2. Combines location and list type subscriptions
3. Doesn't query list type subscriptions when listTypeId is missing

### Test Results

```
@hmcts/subscription-list-types:test:
  ✓ src/subscription-list-type/repository/queries.test.ts (13 tests) 4ms
  ✓ src/subscription-list-type/repository/service.test.ts (10 tests) 4ms
  Test Files: 2 passed (2)
  Tests: 23 passed (23)
```

All tests passing successfully.

## Architecture Decisions

### 1. Optional Parameters
Made `listTypeId` and `language` optional in `PublicationEvent` to maintain backward compatibility with existing notification flows.

### 2. Transform to Standard Format
Transformed list type subscriptions to match `SubscriptionWithUser` interface:
- Maps `listTypeSubscriptionId` to `subscriptionId`
- Sets `searchType` to `"LIST_TYPE"`
- Sets `searchValue` to stringified `listTypeId`
- Includes user information in standard format

### 3. Graceful Degradation
If `listTypeId` or `language` is missing, the system skips list type subscription queries without errors.

### 4. Single Notification Per User
Users with both location and list type subscriptions for the same publication receive one combined notification (existing behavior maintained).

## Integration Points

The notification flow now works as follows:

```
Blob Ingestion
  ↓
Extract: locationId, listTypeId, language, contentDate
  ↓
Trigger Notifications (fire-and-forget)
  ↓
Query Subscriptions:
  ├─ Location subscriptions (by locationId)
  ├─ Case subscriptions (by case numbers/names)
  └─ List type subscriptions (by listTypeId + language)
  ↓
Group by userId
  ↓
Send Notification (one per user)
  ↓
Audit Log (Sent/Failed/Skipped)
```

## Error Handling

### No List Type ID or Language
- Returns empty array from `getListTypeSubscriptions()`
- No error thrown
- Continues with location/case subscriptions only

### No Active Subscriptions
- Returns empty array
- No notifications sent
- Logs: "No active subscriptions for list type X"

### Database Errors
- Caught by existing error handling in notification service
- Audit log updated with error status
- Doesn't block other notifications

## Backward Compatibility

- Existing location and case subscriptions continue to work unchanged
- Optional parameters don't break existing notification calls
- No database schema changes required (language field already exists as array)

## Performance Considerations

### Query Optimization
- Uses index on `listTypeId` (existing: `idx_subscription_list_type_list_type`)
- Filters inactive users and null emails at database level
- Single query per list type (not per user)

### Parallel Processing
- List type subscription query runs in parallel with case subscription queries
- All subscriptions grouped before sending
- Individual notifications sent via `Promise.allSettled()`

## Next Steps

### Testing
- Add E2E test for complete notification flow
- Test with real blob ingestion and notification delivery
- Verify GOV.UK Notify template displays correctly

### Monitoring
- Monitor notification success/failure rates for list type subscriptions
- Track query performance
- Alert on high failure rates

### Documentation
- Update API documentation with new notification triggers
- Document language matching behavior
- Add troubleshooting guide for notification issues

## Files Modified

1. `libs/subscription-list-types/src/subscription-list-type/repository/queries.ts` - Added query function
2. `libs/subscription-list-types/src/subscription-list-type/repository/queries.test.ts` - Added tests
3. `libs/subscription-list-types/src/subscription-list-type/repository/service.ts` - Exported service function
4. `libs/notifications/src/notification/validation.ts` - Extended PublicationEvent interface
5. `libs/notifications/src/notification/notification-service.ts` - Integrated list type subscriptions
6. `libs/notifications/src/notification/notification-service.test.ts` - Added tests
7. `libs/api/src/blob-ingestion/repository/service.ts` - Passed language parameter

## Verification Checklist

- [x] Query function implemented with language array matching
- [x] Service function exported from module
- [x] Notification service integrated
- [x] Blob ingestion updated to pass language
- [x] Unit tests added and passing
- [x] Backward compatibility maintained
- [x] Error handling in place
- [x] No database schema changes needed
- [ ] E2E test with real notification delivery (to be added)
- [ ] Production monitoring configured (to be added)

## Conclusion

The notification integration is complete and functional. Users with list type subscriptions will receive email notifications when matching publications are ingested. The implementation follows the existing notification architecture pattern and maintains backward compatibility with location and case subscriptions.
