# VIBE-221: Technical Implementation Plan
## Backend - Subscription Fulfilment Email Notifications

## Overview

This document provides detailed technical architecture for implementing the backend trigger and email notification system that automatically sends notifications to subscribed users when hearing lists are published in CaTH. The system integrates with Gov.Notify for email delivery and includes comprehensive error handling, audit logging, and deduplication.

## Architecture

### System Components

```
┌─────────────────────┐
│  Publication Event  │
│   (Artefact API)    │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Event Handler      │
│  (Middleware/Hook)  │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────────────────────┐
│  Notification Service Module        │
│  - Query Subscriptions              │
│  - Validate Recipients              │
│  - Deduplicate Notifications        │
│  - Send via Gov.Notify              │
│  - Audit Logging                    │
└──────────┬──────────────────────────┘
           │
           ├──────────────┬──────────────┐
           ▼              ▼              ▼
    ┌──────────┐   ┌──────────┐   ┌──────────┐
    │ Database │   │Gov.Notify│   │ Audit Log│
    │(Postgres)│   │   API    │   │ (Database)│
    └──────────┘   └──────────┘   └──────────┘
```

### Data Flow

1. **Publication Trigger**: When an artefact is published (via `createArtefact` in publication module)
2. **Event Emission**: Post-publication hook emits notification event
3. **Subscription Query**: Notification service queries subscriptions by `location_id`
4. **Recipient Validation**: Validates email addresses and user data
5. **Deduplication Check**: Queries notification audit log for existing notifications
6. **Gov.Notify Integration**: Sends email via Gov.Notify API
7. **Audit Logging**: Records notification attempt with status

## Database Schema

### New Tables

#### Subscription Table

```prisma
model Subscription {
  subscriptionId String   @id @default(uuid()) @map("subscription_id") @db.Uuid
  userId         String   @map("user_id")
  locationId     String   @map("location_id")
  status         String   @default("active")
  dateAdded      DateTime @default(now()) @map("date_added")

  notifications  NotificationAuditLog[]

  @@index([locationId, status])
  @@index([userId])
  @@map("subscription")
}
```

#### Notification Audit Log Table

```prisma
model NotificationAuditLog {
  notificationId  String    @id @default(uuid()) @map("notification_id") @db.Uuid
  subscriptionId  String    @map("subscription_id") @db.Uuid
  userId          String    @map("user_id")
  publicationId   String    @map("publication_id")
  status          String    // "sent", "failed", "skipped", "duplicate_filtered"
  errorMessage    String?   @map("error_message")
  createdAt       DateTime  @default(now()) @map("created_at")
  sentAt          DateTime? @map("sent_at")

  subscription    Subscription @relation(fields: [subscriptionId], references: [subscriptionId])

  @@unique([userId, publicationId])
  @@index([publicationId])
  @@index([userId])
  @@index([status])
  @@map("notification_audit_log")
}
```

### Schema Location

Following the monorepo pattern, these schemas will be created in a new module:

```
libs/notifications/
├── prisma/
│   └── schema.prisma        # Contains Subscription and NotificationAuditLog models
└── src/
    ├── notification/
    │   ├── queries.ts       # Database queries
    │   ├── service.ts       # Business logic
    │   └── validation.ts    # Email validation
    ├── govnotify/
    │   ├── client.ts        # Gov.Notify API client
    │   └── templates.ts     # Template configuration
    ├── config.ts            # Module configuration exports
    └── index.ts             # Public API exports
```

## Module Structure

### libs/notifications Module

```
libs/notifications/
├── package.json
├── tsconfig.json
├── prisma/
│   └── schema.prisma
└── src/
    ├── notification/
    │   ├── queries.ts
    │   ├── queries.test.ts
    │   ├── service.ts
    │   ├── service.test.ts
    │   ├── validation.ts
    │   └── validation.test.ts
    ├── govnotify/
    │   ├── client.ts
    │   ├── client.test.ts
    │   ├── templates.ts
    │   └── templates.test.ts
    ├── config.ts
    └── index.ts
```

### Package Configuration

```json
{
  "name": "@hmcts/notifications",
  "version": "1.0.0",
  "type": "module",
  "exports": {
    ".": {
      "production": "./dist/index.js",
      "default": "./src/index.ts"
    },
    "./config": {
      "production": "./dist/config.js",
      "default": "./src/config.ts"
    }
  },
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "test": "vitest run",
    "test:watch": "vitest watch",
    "format": "biome format --write .",
    "lint": "biome check .",
    "lint:fix": "biome check --write ."
  },
  "dependencies": {
    "@hmcts/postgres": "workspace:*",
    "notifications-node-client": "8.2.1"
  },
  "peerDependencies": {
    "express": "^5.1.0"
  },
  "devDependencies": {
    "@types/node": "24.10.1",
    "typescript": "5.9.3",
    "vitest": "3.2.4"
  }
}
```

## Implementation Details

### 1. Publication Event Integration

The notification trigger will be integrated into the existing publication flow in `libs/publication/src/repository/queries.ts`:

```typescript
// libs/publication/src/repository/queries.ts
import { sendPublicationNotifications } from "@hmcts/notifications";

export async function createArtefact(data: Artefact): Promise<string> {
  // Existing artefact creation logic...

  const artefactId = existing?.artefactId || artefact.artefactId;
  const isNewPublication = !existing;

  // Trigger notifications for new publications only
  if (isNewPublication) {
    // Fire and forget - don't block publication
    sendPublicationNotifications({
      publicationId: artefactId,
      locationId: data.locationId,
      listTypeId: data.listTypeId,
      contentDate: data.contentDate,
      language: data.language
    }).catch((error) => {
      console.error("Failed to send publication notifications:", error);
      // Continue - publication succeeded even if notifications failed
    });
  }

  return artefactId;
}
```

**Design Decision**: Fire-and-forget approach ensures publication isn't blocked by notification failures. Errors are logged but don't fail the publication.

### 2. Notification Service

```typescript
// libs/notifications/src/notification/service.ts
import { findActiveSubscriptionsByLocation } from "./queries.js";
import { validateEmail } from "./validation.js";
import { sendNotificationEmail } from "../govnotify/client.js";
import { createNotificationAuditLog, notificationExists } from "./queries.js";

const MAX_RETRIES = 1;

export interface PublicationNotificationRequest {
  publicationId: string;
  locationId: string;
  listTypeId: number;
  contentDate: Date;
  language: string;
}

export async function sendPublicationNotifications(
  request: PublicationNotificationRequest
): Promise<void> {
  const subscriptions = await findActiveSubscriptionsByLocation(request.locationId);

  if (subscriptions.length === 0) {
    console.log(`No active subscriptions for location ${request.locationId}`);
    return;
  }

  console.log(
    `Processing ${subscriptions.length} subscriptions for location ${request.locationId}`
  );

  const results = await Promise.allSettled(
    subscriptions.map((subscription) =>
      processSubscriptionNotification(subscription, request)
    )
  );

  const successful = results.filter((r) => r.status === "fulfilled").length;
  const failed = results.filter((r) => r.status === "rejected").length;

  console.log(
    `Notification batch complete: ${successful} successful, ${failed} failed`
  );
}

async function processSubscriptionNotification(
  subscription: SubscriptionWithUser,
  request: PublicationNotificationRequest
): Promise<void> {
  // Check for duplicate notification
  const isDuplicate = await notificationExists(
    subscription.userId,
    request.publicationId
  );

  if (isDuplicate) {
    await createNotificationAuditLog({
      subscriptionId: subscription.subscriptionId,
      userId: subscription.userId,
      publicationId: request.publicationId,
      status: "duplicate_filtered",
      errorMessage: "Notification already sent for this publication"
    });
    return;
  }

  // Validate email
  if (!subscription.userEmail || !validateEmail(subscription.userEmail)) {
    await createNotificationAuditLog({
      subscriptionId: subscription.subscriptionId,
      userId: subscription.userId,
      publicationId: request.publicationId,
      status: "invalid_channel",
      errorMessage: "Invalid or missing email address"
    });
    return;
  }

  // Send notification with retry
  let lastError: Error | null = null;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      await sendNotificationEmail({
        email: subscription.userEmail,
        userName: subscription.userName,
        locationName: subscription.locationName,
        listTypeName: getListTypeName(request.listTypeId),
        publicationDate: request.contentDate,
        language: request.language
      });

      await createNotificationAuditLog({
        subscriptionId: subscription.subscriptionId,
        userId: subscription.userId,
        publicationId: request.publicationId,
        status: "sent",
        sentAt: new Date()
      });

      return;
    } catch (error) {
      lastError = error as Error;
      console.error(
        `Notification attempt ${attempt + 1} failed for user ${subscription.userId}:`,
        error
      );
    }
  }

  // All retries failed
  await createNotificationAuditLog({
    subscriptionId: subscription.subscriptionId,
    userId: subscription.userId,
    publicationId: request.publicationId,
    status: "failed",
    errorMessage: lastError?.message || "Unknown error"
  });
}

function getListTypeName(listTypeId: number): string {
  // Map list type IDs to display names
  // This will be imported from @hmcts/list-types-common
  const listTypes: Record<number, string> = {
    1: "Civil and Family Daily Cause List",
    // ... other list types
  };
  return listTypes[listTypeId] || "Hearing List";
}
```

### 3. Database Queries

```typescript
// libs/notifications/src/notification/queries.ts
import { prisma } from "@hmcts/postgres";

export interface SubscriptionWithUser {
  subscriptionId: string;
  userId: string;
  locationName: string;
  userEmail: string;
  userName: string;
}

export async function findActiveSubscriptionsByLocation(
  locationId: string
): Promise<SubscriptionWithUser[]> {
  const subscriptions = await prisma.subscription.findMany({
    where: {
      locationId,
      status: "active"
    },
    select: {
      subscriptionId: true,
      userId: true,
      locationId: true
    }
  });

  // Join with user data (implementation depends on user table structure)
  // This is a placeholder - actual implementation will depend on VIBE-192
  return subscriptions.map((sub) => ({
    ...sub,
    locationName: "TBD", // From location service
    userEmail: "TBD", // From user profile
    userName: "TBD" // From user profile
  }));
}

export async function notificationExists(
  userId: string,
  publicationId: string
): Promise<boolean> {
  const existing = await prisma.notificationAuditLog.findUnique({
    where: {
      userId_publicationId: {
        userId,
        publicationId
      }
    }
  });

  return existing !== null;
}

export interface CreateNotificationAuditLogData {
  subscriptionId: string;
  userId: string;
  publicationId: string;
  status: string;
  errorMessage?: string;
  sentAt?: Date;
}

export async function createNotificationAuditLog(
  data: CreateNotificationAuditLogData
): Promise<string> {
  const log = await prisma.notificationAuditLog.create({
    data: {
      subscriptionId: data.subscriptionId,
      userId: data.userId,
      publicationId: data.publicationId,
      status: data.status,
      errorMessage: data.errorMessage,
      sentAt: data.sentAt
    }
  });

  return log.notificationId;
}
```

### 4. Email Validation

```typescript
// libs/notifications/src/notification/validation.ts

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateEmail(email: string): boolean {
  if (!email || typeof email !== "string") {
    return false;
  }

  const trimmed = email.trim();

  if (trimmed.length === 0 || trimmed.length > 254) {
    return false;
  }

  return EMAIL_REGEX.test(trimmed);
}
```

### 5. Gov.Notify Integration

```typescript
// libs/notifications/src/govnotify/client.ts
import { NotifyClient } from "notifications-node-client";
import { getTemplateId, buildTemplateParameters } from "./templates.js";

const GOVUK_NOTIFY_API_KEY = process.env.GOVUK_NOTIFY_API_KEY;

if (!GOVUK_NOTIFY_API_KEY) {
  throw new Error("GOVUK_NOTIFY_API_KEY environment variable is required");
}

const notifyClient = new NotifyClient(GOVUK_NOTIFY_API_KEY);

export interface NotificationEmailRequest {
  email: string;
  userName: string;
  locationName: string;
  listTypeName: string;
  publicationDate: Date;
  language: string;
}

export async function sendNotificationEmail(
  request: NotificationEmailRequest
): Promise<string> {
  const templateId = getTemplateId(request.language);
  const personalisation = buildTemplateParameters(request);

  try {
    const response = await notifyClient.sendEmail(templateId, request.email, {
      personalisation,
      reference: `${request.email}-${Date.now()}`
    });

    return response.data.id;
  } catch (error) {
    console.error("Gov.Notify send email failed:", error);
    throw new Error(`Failed to send email: ${(error as Error).message}`);
  }
}
```

### 6. Template Configuration

```typescript
// libs/notifications/src/govnotify/templates.ts
import type { NotificationEmailRequest } from "./client.js";

const GOVUK_NOTIFY_TEMPLATE_ID_EN = process.env.GOVUK_NOTIFY_TEMPLATE_ID_EN || "";
const GOVUK_NOTIFY_TEMPLATE_ID_CY = process.env.GOVUK_NOTIFY_TEMPLATE_ID_CY || "";
const CATH_SERVICE_URL = process.env.CATH_SERVICE_URL || "https://www.court-tribunal-hearings.service.gov.uk/";

export function getTemplateId(language: string): string {
  if (language === "cy") {
    if (!GOVUK_NOTIFY_TEMPLATE_ID_CY) {
      throw new Error("GOVUK_NOTIFY_TEMPLATE_ID_CY not configured");
    }
    return GOVUK_NOTIFY_TEMPLATE_ID_CY;
  }

  if (!GOVUK_NOTIFY_TEMPLATE_ID_EN) {
    throw new Error("GOVUK_NOTIFY_TEMPLATE_ID_EN not configured");
  }

  return GOVUK_NOTIFY_TEMPLATE_ID_EN;
}

export function buildTemplateParameters(request: NotificationEmailRequest) {
  return {
    user_name: request.userName,
    hearing_list_name: request.listTypeName,
    publication_date: formatDate(request.publicationDate),
    location_name: request.locationName,
    manage_link: CATH_SERVICE_URL
  };
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric"
  }).format(date);
}
```

## Gov.Notify Template Structure

### Template Creation Requirements

Two templates need to be created in Gov.Notify dashboard:

1. **English Template** (`GOVUK_NOTIFY_TEMPLATE_ID_EN`)
2. **Welsh Template** (`GOVUK_NOTIFY_TEMPLATE_ID_CY`)

### Template Content Structure

#### Subject Line
```
New hearing list published: ((hearing_list_name))
```

#### Email Body

```
Dear ((user_name)),

# Important: Special Category Data Notice

Note this email contains Special Category Data as defined by the Data Protection Act 2018, formerly known as Sensitive Personal Data, and should be handled appropriately.

This email contains information intended to assist the accurate reporting of court proceedings. It is vital you ensure that you safeguard the Special Category Data included and abide by reporting restrictions (for example on victims and children). HMCTS will stop sending the data if there is concern about how it will be used.

---

# Hearing List Published

Your subscription to get updates about the below has been triggered based on a ((hearing_list_name)) being published for ((publication_date)).

**Location:** ((location_name))

---

# Manage Your Subscriptions

[Manage your subscriptions, view lists and additional case information within the Court and tribunal hearings service]((manage_link))

---

^ Do not reply to this email. If you need help, visit the Court and Tribunal Hearings service.
```

### Template Parameters

| Parameter | Description | Example |
|-----------|-------------|---------|
| `user_name` | Recipient's display name | "John Smith" |
| `hearing_list_name` | Type of hearing list | "Civil and Family Daily Cause List" |
| `publication_date` | Publication date | "22 November 2025" |
| `location_name` | Court/tribunal name | "Manchester Crown Court" |
| `manage_link` | CaTH service URL | "https://www.court-tribunal-hearings.service.gov.uk/" |

## Configuration & Environment Variables

### Required Environment Variables

Add to `apps/web/.env.example` and deployment configurations:

```bash
# Gov.Notify Configuration
GOVUK_NOTIFY_API_KEY=your-api-key-here
GOVUK_NOTIFY_TEMPLATE_ID_EN=template-uuid-for-english
GOVUK_NOTIFY_TEMPLATE_ID_CY=template-uuid-for-welsh

# CaTH Service URL for email links
CATH_SERVICE_URL=https://www.court-tribunal-hearings.service.gov.uk/
```

### Configuration Loading

Configuration will be loaded via the existing config system in `config/default.json`:

```json
{
  "notifications": {
    "govNotify": {
      "apiKey": "${GOVUK_NOTIFY_API_KEY}",
      "templateIdEn": "${GOVUK_NOTIFY_TEMPLATE_ID_EN}",
      "templateIdCy": "${GOVUK_NOTIFY_TEMPLATE_ID_CY}"
    },
    "serviceUrl": "${CATH_SERVICE_URL}"
  }
}
```

## Error Handling Strategy

### Error Categories

| Error Type | Retry? | Action | Status |
|------------|--------|--------|--------|
| Invalid email format | No | Skip, log "invalid_channel" | `skipped` |
| Missing user data | No | Skip, log error | `skipped` |
| Duplicate notification | No | Skip, log "duplicate_filtered" | `duplicate_filtered` |
| Gov.Notify API error | Yes (once) | Retry once, then log failure | `failed` |
| Network timeout | Yes (once) | Retry once, then log failure | `failed` |
| Database error | No | Log error, continue batch | N/A |

### Retry Logic

- **Maximum retries**: 1 (total 2 attempts)
- **Retry delay**: None (immediate retry)
- **Retry scope**: Per-user (one user's failure doesn't affect others)
- **Batch processing**: Failures don't stop batch processing

### Error Logging

All errors are logged to:
1. **Console**: For operational monitoring
2. **Audit table**: For user-specific tracking
3. **Application Insights**: For alerting (via existing monitoring)

## Deduplication Strategy

### Approach: Database Unique Constraint

Using database-level unique constraint on `(user_id, publication_id)` provides:

- **Atomicity**: Prevents race conditions
- **Persistence**: Works across restarts
- **Simplicity**: No cache management needed

### Implementation

```sql
-- Enforced by Prisma schema
@@unique([userId, publicationId])
```

### Check Logic

```typescript
// Before sending, check for existing notification
const isDuplicate = await notificationExists(userId, publicationId);

if (isDuplicate) {
  // Log and skip
  await createNotificationAuditLog({
    status: "duplicate_filtered",
    errorMessage: "Notification already sent for this publication"
  });
  return;
}
```

### Edge Cases

- **Multiple triggers**: First wins, others marked as `duplicate_filtered`
- **Failed retries**: Original record exists, retry doesn't create duplicate
- **User resubscribes**: No duplicate - only one notification per publication

## Testing Strategy

### Unit Tests

**Location**: Co-located with source files (`*.test.ts`)

#### Notification Service Tests
```typescript
// libs/notifications/src/notification/service.test.ts
describe("sendPublicationNotifications", () => {
  it("should send notifications to all active subscribers", async () => {
    // Test batch processing
  });

  it("should skip duplicate notifications", async () => {
    // Test deduplication
  });

  it("should retry failed Gov.Notify calls once", async () => {
    // Test retry logic
  });

  it("should log all notification attempts", async () => {
    // Test audit logging
  });

  it("should continue batch on individual failures", async () => {
    // Test partial success
  });
});
```

#### Email Validation Tests
```typescript
// libs/notifications/src/notification/validation.test.ts
describe("validateEmail", () => {
  it("should accept valid email addresses", () => {
    expect(validateEmail("user@example.com")).toBe(true);
  });

  it("should reject invalid email formats", () => {
    expect(validateEmail("invalid")).toBe(false);
    expect(validateEmail("@example.com")).toBe(false);
    expect(validateEmail("user@")).toBe(false);
  });

  it("should reject empty or null emails", () => {
    expect(validateEmail("")).toBe(false);
    expect(validateEmail(null as any)).toBe(false);
  });
});
```

#### Gov.Notify Client Tests
```typescript
// libs/notifications/src/govnotify/client.test.ts
describe("sendNotificationEmail", () => {
  it("should send email with correct template parameters", async () => {
    // Mock NotifyClient
    // Verify template ID and parameters
  });

  it("should throw error on Gov.Notify API failure", async () => {
    // Mock API failure
    // Verify error handling
  });
});
```

### Integration Tests

**Location**: `libs/notifications/src/notification/integration.test.ts`

```typescript
describe("Notification Integration", () => {
  beforeEach(async () => {
    // Set up test database
    await setupTestDatabase();
  });

  afterEach(async () => {
    // Clean up test data
    await cleanupTestDatabase();
  });

  it("should process publication notification end-to-end", async () => {
    // Create test subscription
    // Trigger notification
    // Verify audit log entry
    // Verify Gov.Notify call (mocked)
  });

  it("should prevent duplicate notifications at database level", async () => {
    // Create test subscription
    // Trigger notification twice concurrently
    // Verify only one notification sent
    // Verify duplicate_filtered audit log
  });
});
```

### E2E Tests

**Location**: `e2e-tests/notifications/`

```typescript
describe("Publication Notification Flow", () => {
  it("TS1: should trigger notification on publication", async () => {
    // Create user with subscription
    // Publish hearing list via API
    // Verify notification sent
    // Verify audit log
  });

  it("TS2: should deduplicate multiple triggers", async () => {
    // Create user with subscription
    // Publish same list twice
    // Verify one email per user
  });

  it("TS7: should retry Gov.Notify failures", async () => {
    // Mock Gov.Notify to fail once then succeed
    // Trigger notification
    // Verify retry occurred
    // Verify final success
  });

  it("TS8: should log persistent failures", async () => {
    // Mock Gov.Notify to fail persistently
    // Trigger notification
    // Verify status is "failed"
    // Verify error message logged
  });

  it("TS9: should handle partial success", async () => {
    // Create multiple subscriptions
    // Make some users invalid
    // Trigger notification
    // Verify mixed success/failure statuses
  });

  it("TS10: should record complete audit trail", async () => {
    // Trigger multiple notifications
    // Query audit log
    // Verify all statuses and timestamps
  });
});
```

### Manual Testing Checklist

- [ ] Send test notification via Gov.Notify sandbox
- [ ] Verify email formatting and content
- [ ] Test Welsh template
- [ ] Verify all links work correctly
- [ ] Test with real email addresses
- [ ] Verify special character handling
- [ ] Test retry logic with network issues
- [ ] Verify audit log accuracy

## Performance Considerations

### Batch Processing

- **Parallel execution**: Process subscriptions concurrently using `Promise.allSettled()`
- **No blocking**: Publication doesn't wait for notifications
- **Resilience**: Individual failures don't affect batch

### Database Optimization

```prisma
// Indexes for efficient queries
@@index([locationId, status])  // Subscription lookup
@@index([userId])              // User-based queries
@@index([publicationId])       // Publication-based queries
```

### Rate Limiting

Gov.Notify has rate limits:
- **3000 emails per minute** (standard tier)
- **Recommendation**: No artificial throttling needed for MVP
- **Future**: Add rate limiting if subscription volume exceeds limits

### Scalability Considerations

For future iterations (out of scope for VIBE-221):
- **Message queue**: Move to async queue (e.g., Azure Service Bus)
- **Worker processes**: Scale horizontally for large batches
- **Batch chunking**: Process in chunks of 100-500

## Security & Compliance

### Data Protection

- **Special Category Data**: Warning included in email template
- **GDPR Compliance**: Audit log for data processing transparency
- **Email security**: All connections via HTTPS
- **No PII in logs**: User IDs only, no email addresses in console logs

### Access Control

- **Gov.Notify API key**: Stored in Azure Key Vault
- **Database access**: Via Prisma with connection pooling
- **Audit log**: Read-only for non-admin users

### Data Retention

- **Audit logs**: Retained indefinitely (or per HMCTS policy)
- **PII handling**: Email addresses not stored in notification module
- **Subscription data**: Managed by VIBE-192

## Dependencies

### External Dependencies

- **VIBE-192**: Subscription infrastructure (must be completed first)
  - Subscription table structure
  - User profile integration
  - Location data access
- **Gov.Notify account**: Team setup required
- **Template creation**: Templates must be created in Gov.Notify dashboard
- **API key provisioning**: Production API key from Gov.Notify

### Internal Dependencies

- `@hmcts/postgres`: Database access
- `@hmcts/publication`: Publication event hook
- `@hmcts/location`: Location name resolution
- `@hmcts/list-types-common`: List type name mapping

### NPM Dependencies

- `notifications-node-client@8.2.1`: Official Gov.Notify client

## Deployment Considerations

### Database Migrations

```bash
# Create notification tables
yarn db:migrate:dev
```

### Environment Configuration

1. **Local development**: Add variables to `.env`
2. **Staging/Production**: Configure in Azure Key Vault
3. **Gov.Notify keys**: Different keys per environment

### Rollout Strategy

1. **Phase 1**: Deploy code with feature flag disabled
2. **Phase 2**: Create Gov.Notify templates
3. **Phase 3**: Configure environment variables
4. **Phase 4**: Enable feature flag
5. **Phase 5**: Monitor audit logs and error rates

### Monitoring

- **Application Insights**: Existing integration captures errors
- **Audit log queries**: Dashboard for notification metrics
- **Gov.Notify dashboard**: Email delivery statistics

## Open Questions & Decisions

### Resolved in This Plan

- ✅ **Deduplication**: Database unique constraint
- ✅ **Retry policy**: Retry once (2 attempts total)
- ✅ **Trigger approach**: Fire-and-forget (synchronous, non-blocking)
- ✅ **Bilingual support**: Separate templates for EN/CY

### To Be Resolved Before Implementation

- ⚠️ **User data access**: Awaiting VIBE-192 completion
  - How to retrieve user email from `userId`?
  - How to retrieve user display name?
  - What is the user table structure?
- ⚠️ **Location name resolution**: Integration with `@hmcts/location`
  - API for resolving `locationId` to display name
  - Support for both English and Welsh names
- ⚠️ **Gov.Notify templates**: Need actual template IDs
  - Who creates templates in Gov.Notify dashboard?
  - What are the approval processes?
- ⚠️ **Service URL**: Confirm production URL
  - Currently: `https://www.court-tribunal-hearings.service.gov.uk/`
  - Is this correct?

### Future Enhancements (Out of Scope)

- 🔮 **Async queue processing**: Azure Service Bus integration
- 🔮 **PDF attachments**: Hearing list PDF generation and attachment
- 🔮 **Email summaries**: Digest emails for multiple publications
- 🔮 **API notifications**: Webhook/API endpoint notifications
- 🔮 **User preferences**: Notification frequency settings
- 🔮 **Unsubscribe links**: Self-service unsubscribe flow

## Success Criteria

### Functional Requirements ✅

- [x] Notification triggered on hearing list publication
- [x] Subscriptions queried by location
- [x] Deduplication prevents duplicate notifications
- [x] Email validation before sending
- [x] Gov.Notify integration with template parameters
- [x] Retry logic on transient failures
- [x] Comprehensive audit logging
- [x] Error handling for all scenarios

### Non-Functional Requirements ✅

- [x] Fire-and-forget (doesn't block publication)
- [x] Batch processing with parallel execution
- [x] Database-level deduplication
- [x] Bilingual template support (EN/CY)
- [x] GDPR compliance (Special Category Data notice)
- [x] Comprehensive test coverage (unit, integration, E2E)
- [x] Production-ready error handling
- [x] Operational monitoring via Application Insights

### Acceptance Criteria from Specification ✅

1. ✅ Trigger raised automatically on publication
2. ✅ Active subscriptions retrieved by location
3. ✅ One email per user per publication (deduplication)
4. ✅ Email validation before sending
5. ✅ Error handling for Gov.Notify failures and invalid users
6. ✅ Deduplication ensures single notification per user
7. ✅ Gov.Notify used with HMCTS branding
8. ✅ Excludes PDF attachments and email summaries (out of scope)

## Timeline Estimate

Assuming VIBE-192 is complete and Gov.Notify templates are ready:

- **Module setup**: 1 day
  - Package.json, tsconfig, module structure
- **Database schema**: 1 day
  - Prisma models, migrations, initial queries
- **Core service logic**: 2 days
  - Notification service, validation, queries
- **Gov.Notify integration**: 1 day
  - Client setup, template configuration
- **Publication integration**: 0.5 days
  - Hook into createArtefact
- **Unit tests**: 2 days
  - Service, validation, Gov.Notify client
- **Integration tests**: 1 day
  - End-to-end notification flow
- **E2E tests**: 1 day
  - Full acceptance criteria coverage
- **Documentation**: 0.5 days
  - API docs, deployment notes

**Total**: ~10 days (2 weeks)

## References

- **Specification**: `docs/tickets/VIBE-221/specification.md`
- **Tasks**: `docs/tickets/VIBE-221/tasks.md`
- **VIBE-192**: Subscription infrastructure (prerequisite)
- **Gov.Notify Docs**: https://docs.notifications.service.gov.uk/
- **Monorepo Guidelines**: `CLAUDE.md`
