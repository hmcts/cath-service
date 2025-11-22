# VIBE-192: Email Subscriptions - Technical Implementation Plan

## Overview

This document provides a detailed technical implementation plan for the email subscriptions feature. The feature allows verified users to subscribe to email notifications for court and tribunal hearing publications.

## Architecture Overview

### System Components

```
┌─────────────────────────────────────────────────────────────────┐
│                        Web Application                          │
│                                                                   │
│  ┌────────────────┐  ┌──────────────┐  ┌───────────────┐       │
│  │ Subscriptions  │  │   Account    │  │  Navigation   │       │
│  │     Pages      │  │  Dashboard   │  │   Middleware  │       │
│  └────────────────┘  └──────────────┘  └───────────────┘       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ HTTP
                              │
┌─────────────────────────────────────────────────────────────────┐
│                    Email Subscriptions Module                   │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                   Subscription Service                    │   │
│  │  • Create/Remove subscriptions                           │   │
│  │  • Validate limits and duplicates                        │   │
│  │  • Manage email frequency preferences                    │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                    │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                   Notification Service                    │   │
│  │  • Queue notifications on publication                     │   │
│  │  • Process notification queue                            │   │
│  │  • Send emails via GOV Notify                            │   │
│  │  • Handle retries and failures                           │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │
┌─────────────────────────────────────────────────────────────────┐
│                         Data Layer                              │
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │ Subscription │  │ Notification │  │  Email Log   │         │
│  │    Table     │  │    Queue     │  │    Table     │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
│                                                                   │
│  PostgreSQL + Prisma ORM                                        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │
┌─────────────────────────────────────────────────────────────────┐
│                      External Services                          │
│                                                                   │
│  ┌──────────────┐         ┌──────────────┐                     │
│  │ GOV Notify   │         │    Redis     │                     │
│  │ Email Service│         │ Rate Limiting│                     │
│  └──────────────┘         └──────────────┘                     │
└─────────────────────────────────────────────────────────────────┘
```

## Module Structure

### New Module: `@hmcts/email-subscriptions`

Following the monorepo conventions, we'll create a new feature module:

```
libs/email-subscriptions/
├── package.json                    # Module metadata
├── tsconfig.json                   # TypeScript configuration
├── prisma/
│   └── schema.prisma              # Database schema
└── src/
    ├── config.ts                  # Module configuration exports
    ├── index.ts                   # Business logic exports
    │
    ├── pages/                     # Page controllers and templates
    │   └── account/
    │       └── email-subscriptions/
    │           ├── index.ts       # Dashboard GET/POST handlers
    │           ├── index.njk      # Dashboard template
    │           ├── add/
    │           │   ├── index.ts   # Add subscription GET handler
    │           │   └── index.njk  # Add subscription template
    │           ├── search/
    │           │   ├── index.ts   # Search GET handler
    │           │   └── index.njk  # Search results template
    │           ├── confirm/
    │           │   ├── index.ts   # Confirm GET/POST handlers
    │           │   └── index.njk  # Confirmation template
    │           └── remove/
    │               ├── index.ts   # Remove GET/POST handlers
    │               └── index.njk  # Removal confirmation template
    │
    ├── subscription/              # Subscription domain logic
    │   ├── service.ts            # Business logic
    │   ├── service.test.ts       # Unit tests
    │   ├── queries.ts            # Database queries
    │   ├── queries.test.ts       # Query tests
    │   ├── validation.ts         # Validation functions
    │   └── validation.test.ts    # Validation tests
    │
    ├── notification/              # Notification domain logic
    │   ├── service.ts            # Email notification service
    │   ├── service.test.ts       # Unit tests
    │   ├── trigger.ts            # Publication event handler
    │   ├── trigger.test.ts       # Trigger tests
    │   ├── queue-processor.ts    # Queue processing logic
    │   └── queue-processor.test.ts
    │
    ├── unsubscribe/               # Unsubscribe functionality
    │   ├── token-service.ts      # Token generation/validation
    │   ├── token-service.test.ts
    │   └── pages/
    │       └── [token]/
    │           ├── index.ts      # Unsubscribe GET/POST handlers
    │           └── index.njk     # Unsubscribe template
    │
    ├── jobs/                      # Scheduled jobs
    │   ├── process-notifications.ts  # Queue processor job
    │   ├── send-daily-digest.ts      # Daily digest job
    │   └── send-weekly-digest.ts     # Weekly digest job
    │
    ├── locales/                   # Shared translations
    │   ├── en.ts                 # English common content
    │   └── cy.ts                 # Welsh common content
    │
    └── assets/                    # Frontend assets
        ├── css/
        │   └── subscriptions.scss
        └── js/
            └── subscriptions.ts
```

## Database Schema Design

### Prisma Schema (`libs/email-subscriptions/prisma/schema.prisma`)

```prisma
generator client {
  provider = "prisma-client-js"
  output   = "../../../node_modules/.prisma/client"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// User email subscription to a court/tribunal location
model Subscription {
  subscriptionId String   @id @default(uuid()) @map("subscription_id") @db.Uuid
  userId         String   @map("user_id")
  locationId     String   @map("location_id")
  emailFrequency String   @default("IMMEDIATE") @map("email_frequency") // IMMEDIATE, DAILY, WEEKLY
  subscribedAt   DateTime @default(now()) @map("subscribed_at")
  unsubscribedAt DateTime? @map("unsubscribed_at")
  isActive       Boolean  @default(true) @map("is_active")

  @@unique([userId, locationId], name: "unique_user_location")
  @@index([userId], name: "idx_subscription_user")
  @@index([locationId], name: "idx_subscription_location")
  @@index([isActive], name: "idx_subscription_active")
  @@index([emailFrequency], name: "idx_subscription_frequency")
  @@map("subscription")
}

// Queue for notification emails to be sent
model NotificationQueue {
  queueId        String   @id @default(uuid()) @map("queue_id") @db.Uuid
  subscriptionId String   @map("subscription_id") @db.Uuid
  artefactId     String   @map("artefact_id") @db.Uuid
  status         String   @default("PENDING") // PENDING, SENT, FAILED
  attemptCount   Int      @default(0) @map("attempt_count")
  createdAt      DateTime @default(now()) @map("created_at")
  sentAt         DateTime? @map("sent_at")
  errorMessage   String?  @map("error_message")
  nextRetryAt    DateTime? @map("next_retry_at")

  @@index([status], name: "idx_notification_status")
  @@index([createdAt], name: "idx_notification_created")
  @@index([nextRetryAt], name: "idx_notification_retry")
  @@index([subscriptionId], name: "idx_notification_subscription")
  @@map("notification_queue")
}

// Log of all emails sent
model EmailLog {
  logId        String   @id @default(uuid()) @map("log_id") @db.Uuid
  userId       String   @map("user_id")
  emailAddress String   @map("email_address")
  subject      String
  templateId   String   @map("template_id")
  status       String   // SENT, FAILED, BOUNCED
  sentAt       DateTime @default(now()) @map("sent_at")
  errorMessage String?  @map("error_message")
  artefactId   String?  @map("artefact_id") @db.Uuid

  @@index([userId], name: "idx_email_log_user")
  @@index([sentAt], name: "idx_email_log_sent")
  @@index([status], name: "idx_email_log_status")
  @@map("email_log")
}

// Unsubscribe tokens (time-limited, stored in Redis primarily)
// This table is backup/audit trail only
model UnsubscribeToken {
  tokenId        String   @id @default(uuid()) @map("token_id") @db.Uuid
  token          String   @unique
  subscriptionId String   @map("subscription_id") @db.Uuid
  createdAt      DateTime @default(now()) @map("created_at")
  expiresAt      DateTime @map("expires_at")
  usedAt         DateTime? @map("used_at")

  @@index([token], name: "idx_unsubscribe_token")
  @@index([expiresAt], name: "idx_unsubscribe_expires")
  @@map("unsubscribe_token")
}
```

### Database Indexes Rationale

1. **subscription table**:
   - `userId` index: Fast lookup of user's subscriptions
   - `locationId` index: Find all subscriptions for a location (when publication created)
   - `isActive` index: Filter active subscriptions efficiently
   - `emailFrequency` index: Query subscriptions by frequency for digest jobs
   - Unique constraint on `(userId, locationId)`: Prevent duplicates

2. **notification_queue table**:
   - `status` index: Query pending/failed notifications
   - `createdAt` index: Process oldest first
   - `nextRetryAt` index: Find notifications ready for retry
   - `subscriptionId` index: Track notifications for a subscription

3. **email_log table**:
   - `userId` index: Audit trail for user's emails
   - `sentAt` index: Time-based queries and cleanup
   - `status` index: Monitor success/failure rates

## Integration Points

### 1. Module Registration in Web Application

Update `apps/web/src/app.ts`:

```typescript
import { pageRoutes as emailSubscriptionsPages } from "@hmcts/email-subscriptions/config";
import { moduleRoot as emailSubscriptionsModuleRoot } from "@hmcts/email-subscriptions/config";

// Add to modulePaths array
const modulePaths = [
  // ... existing paths
  emailSubscriptionsModuleRoot
];

// Register routes (after auth routes)
app.use(await createSimpleRouter(emailSubscriptionsPages, pageRoutes));
```

### 2. Vite Asset Registration

Update `apps/web/vite.config.ts`:

```typescript
import { assets as emailSubscriptionsAssets } from "@hmcts/email-subscriptions/config";

const baseConfig = createBaseViteConfig([
  // ... existing paths
  emailSubscriptionsAssets
]);
```

### 3. Database Schema Registration

Update `apps/postgres/src/schema-discovery.ts`:

```typescript
import { prismaSchemas as emailSubscriptionsSchemas } from "@hmcts/email-subscriptions/config";

const schemaPaths = [
  // ... existing schemas
  emailSubscriptionsSchemas
];
```

### 4. TypeScript Path Registration

Update root `tsconfig.json`:

```json
{
  "compilerOptions": {
    "paths": {
      "@hmcts/email-subscriptions": ["libs/email-subscriptions/src"]
    }
  }
}
```

### 5. Navigation Integration

Update verified user navigation in `libs/auth/src/middleware/navigation-helper.ts`:

```typescript
// Add email subscriptions link to verified user navigation
{
  text: "Email subscriptions",
  href: "/account/email-subscriptions",
  active: currentPath.startsWith("/account/email-subscriptions")
}
```

## Key Implementation Patterns

### 1. Subscription Service Pattern

**File**: `libs/email-subscriptions/src/subscription/service.ts`

```typescript
import { prisma } from "@hmcts/postgres";
import {
  countActiveSubscriptionsByUserId,
  findActiveSubscriptionsByUserId,
  findSubscriptionByUserAndLocation,
  createSubscriptionRecord,
  deactivateSubscriptionRecord
} from "./queries.js";
import {
  validateLocationId,
  validateEmailFrequency,
  validateSubscriptionLimit
} from "./validation.js";

const MAX_SUBSCRIPTIONS = 50;

export async function createSubscription(
  userId: string,
  locationId: string,
  emailFrequency: string = "IMMEDIATE"
) {
  // Validate location exists
  const locationValid = await validateLocationId(locationId);
  if (!locationValid) {
    throw new Error("Invalid location ID");
  }

  // Check for duplicate
  const existing = await findSubscriptionByUserAndLocation(userId, locationId);
  if (existing?.isActive) {
    throw new Error("Subscription already exists");
  }

  // Check subscription limit
  const count = await countActiveSubscriptionsByUserId(userId);
  if (count >= MAX_SUBSCRIPTIONS) {
    throw new Error(`Maximum ${MAX_SUBSCRIPTIONS} subscriptions allowed`);
  }

  // Validate frequency
  if (!validateEmailFrequency(emailFrequency)) {
    throw new Error("Invalid email frequency");
  }

  // Create subscription (or reactivate if previously unsubscribed)
  if (existing && !existing.isActive) {
    return prisma.subscription.update({
      where: { subscriptionId: existing.subscriptionId },
      data: {
        isActive: true,
        subscribedAt: new Date(),
        unsubscribedAt: null,
        emailFrequency
      }
    });
  }

  return createSubscriptionRecord(userId, locationId, emailFrequency);
}

export async function getSubscriptionsByUserId(userId: string) {
  return findActiveSubscriptionsByUserId(userId);
}

export async function removeSubscription(subscriptionId: string, userId: string) {
  const subscription = await prisma.subscription.findUnique({
    where: { subscriptionId }
  });

  if (!subscription) {
    throw new Error("Subscription not found");
  }

  if (subscription.userId !== userId) {
    throw new Error("Unauthorized");
  }

  return deactivateSubscriptionRecord(subscriptionId);
}

export async function updateEmailFrequency(userId: string, frequency: string) {
  if (!validateEmailFrequency(frequency)) {
    throw new Error("Invalid email frequency");
  }

  return prisma.subscription.updateMany({
    where: {
      userId,
      isActive: true
    },
    data: {
      emailFrequency: frequency
    }
  });
}
```

### 2. Page Controller Pattern (with Session Storage)

**File**: `libs/email-subscriptions/src/pages/account/email-subscriptions/confirm/index.ts`

```typescript
import { blockUserAccess, buildVerifiedUserNavigation, requireAuth } from "@hmcts/auth";
import { getLocationById } from "@hmcts/location";
import type { Request, RequestHandler, Response } from "express";
import { createSubscription } from "../../../subscription/service.js";

interface SessionData {
  locationId?: string;
  emailFrequency?: string;
}

const getHandler = async (req: Request, res: Response) => {
  const locale = res.locals.locale || "en";
  const locationId = req.query.locationId as string;

  if (!locationId) {
    return res.redirect("/account/email-subscriptions/add");
  }

  // Store in session for POST
  if (!req.session.emailSubscriptions) {
    req.session.emailSubscriptions = {};
  }
  req.session.emailSubscriptions.confirmData = { locationId };

  // Get location details
  const location = await getLocationById(locationId);
  if (!location) {
    return res.redirect("/account/email-subscriptions/add");
  }

  // Build navigation
  if (!res.locals.navigation) {
    res.locals.navigation = {};
  }
  res.locals.navigation.verifiedItems = buildVerifiedUserNavigation(req.path, locale);

  res.render("account/email-subscriptions/confirm/index", {
    location,
    en: {
      title: "Confirm subscription",
      heading: "Confirm subscription",
      description: "You will receive email notifications when new hearing publications are available for this court.",
      confirmButton: "Confirm subscription",
      cancelLink: "Cancel"
    },
    cy: {
      title: "Cadarnhau tanysgrifiad",
      heading: "Cadarnhau tanysgrifiad",
      description: "Byddwch yn derbyn hysbysiadau e-bost pan fydd cyhoeddiadau gwrandawiad newydd ar gael ar gyfer y llys hwn.",
      confirmButton: "Cadarnhau tanysgrifiad",
      cancelLink: "Canslo"
    }
  });
};

const postHandler = async (req: Request, res: Response) => {
  const locale = res.locals.locale || "en";
  const userId = req.user?.id;

  if (!userId) {
    return res.redirect("/login");
  }

  // Get location from session
  const sessionData = req.session.emailSubscriptions?.confirmData as SessionData | undefined;
  if (!sessionData?.locationId) {
    return res.redirect("/account/email-subscriptions/add");
  }

  try {
    await createSubscription(userId, sessionData.locationId);

    // Clear session data
    delete req.session.emailSubscriptions?.confirmData;

    // Set success message
    req.session.successMessage = locale === "cy"
      ? "Tanysgrifiad wedi'i ychwanegu yn llwyddiannus"
      : "Subscription added successfully";

    res.redirect("/account/email-subscriptions");
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    // Build navigation
    if (!res.locals.navigation) {
      res.locals.navigation = {};
    }
    res.locals.navigation.verifiedItems = buildVerifiedUserNavigation(req.path, locale);

    // Get location details again for re-render
    const location = await getLocationById(sessionData.locationId);

    res.render("account/email-subscriptions/confirm/index", {
      location,
      errors: {
        titleText: locale === "cy" ? "Mae problem wedi codi" : "There is a problem",
        errorList: [{ text: errorMessage }]
      },
      en: {
        title: "Confirm subscription",
        heading: "Confirm subscription",
        description: "You will receive email notifications when new hearing publications are available for this court.",
        confirmButton: "Confirm subscription",
        cancelLink: "Cancel"
      },
      cy: {
        title: "Cadarnhau tanysgrifiad",
        heading: "Cadarnhau tanysgrifiad",
        description: "Byddwch yn derbyn hysbysiadau e-bost pan fydd cyhoeddiadau gwrandawiad newydd ar gael ar gyfer y llys hwn.",
        confirmButton: "Cadarnhau tanysgrifiad",
        cancelLink: "Canslo"
      }
    });
  }
};

export const GET: RequestHandler[] = [requireAuth(), blockUserAccess(), getHandler];
export const POST: RequestHandler[] = [requireAuth(), blockUserAccess(), postHandler];
```

### 3. Notification Service Pattern

**File**: `libs/email-subscriptions/src/notification/service.ts`

```typescript
import { prisma } from "@hmcts/postgres";
import { NotifyClient } from "notifications-node-client";

const notifyClient = new NotifyClient(process.env.GOV_NOTIFY_API_KEY || "");

const TEMPLATES = {
  IMMEDIATE_EN: process.env.GOV_NOTIFY_IMMEDIATE_TEMPLATE_EN || "",
  IMMEDIATE_CY: process.env.GOV_NOTIFY_IMMEDIATE_TEMPLATE_CY || "",
  DAILY_EN: process.env.GOV_NOTIFY_DAILY_TEMPLATE_EN || "",
  DAILY_CY: process.env.GOV_NOTIFY_DAILY_TEMPLATE_CY || "",
  WEEKLY_EN: process.env.GOV_NOTIFY_WEEKLY_TEMPLATE_EN || "",
  WEEKLY_CY: process.env.GOV_NOTIFY_WEEKLY_TEMPLATE_CY || ""
};

export async function queueNotification(subscriptionId: string, artefactId: string) {
  return prisma.notificationQueue.create({
    data: {
      subscriptionId,
      artefactId,
      status: "PENDING",
      attemptCount: 0
    }
  });
}

export async function processNotificationQueue() {
  const pending = await prisma.notificationQueue.findMany({
    where: {
      status: "PENDING",
      OR: [
        { nextRetryAt: null },
        { nextRetryAt: { lte: new Date() } }
      ]
    },
    take: 100,
    orderBy: { createdAt: "asc" }
  });

  const results = await Promise.allSettled(
    pending.map((notification) => processSingleNotification(notification))
  );

  return {
    processed: results.length,
    succeeded: results.filter((r) => r.status === "fulfilled").length,
    failed: results.filter((r) => r.status === "rejected").length
  };
}

async function processSingleNotification(notification: any) {
  try {
    // Get subscription and user details
    const subscription = await prisma.subscription.findUnique({
      where: { subscriptionId: notification.subscriptionId }
    });

    if (!subscription || !subscription.isActive) {
      // Subscription no longer active, mark as sent
      await prisma.notificationQueue.update({
        where: { queueId: notification.queueId },
        data: { status: "SENT", sentAt: new Date() }
      });
      return;
    }

    // Get artefact details
    const artefact = await prisma.artefact.findUnique({
      where: { artefactId: notification.artefactId }
    });

    if (!artefact) {
      throw new Error("Artefact not found");
    }

    // Send email
    await sendNotificationEmail(subscription, artefact);

    // Mark as sent
    await prisma.notificationQueue.update({
      where: { queueId: notification.queueId },
      data: { status: "SENT", sentAt: new Date() }
    });

  } catch (error) {
    const attemptCount = notification.attemptCount + 1;
    const maxAttempts = 3;

    if (attemptCount >= maxAttempts) {
      // Max retries reached, mark as failed
      await prisma.notificationQueue.update({
        where: { queueId: notification.queueId },
        data: {
          status: "FAILED",
          attemptCount,
          errorMessage: error instanceof Error ? error.message : "Unknown error"
        }
      });
    } else {
      // Schedule retry (exponential backoff: 5min, 15min, 30min)
      const retryDelays = [5, 15, 30];
      const delayMinutes = retryDelays[attemptCount - 1] || 30;
      const nextRetryAt = new Date(Date.now() + delayMinutes * 60 * 1000);

      await prisma.notificationQueue.update({
        where: { queueId: notification.queueId },
        data: {
          attemptCount,
          nextRetryAt,
          errorMessage: error instanceof Error ? error.message : "Unknown error"
        }
      });
    }

    throw error;
  }
}

async function sendNotificationEmail(subscription: any, artefact: any) {
  // Get user email from auth system
  const userEmail = "user@example.com"; // TODO: Get from user profile
  const locale = "en"; // TODO: Get from user profile

  // Select template based on locale
  const templateId = locale === "cy" ? TEMPLATES.IMMEDIATE_CY : TEMPLATES.IMMEDIATE_EN;

  // Generate unsubscribe token
  const unsubscribeToken = "token"; // TODO: Generate secure token

  // Send via GOV Notify
  const response = await notifyClient.sendEmail(templateId, userEmail, {
    personalisation: {
      court_name: artefact.locationId, // TODO: Get actual court name
      publication_date: artefact.contentDate,
      publication_type: artefact.listTypeId,
      view_url: `${process.env.BASE_URL}/publication/${artefact.artefactId}`,
      unsubscribe_url: `${process.env.BASE_URL}/unsubscribe/${unsubscribeToken}`
    }
  });

  // Log email
  await prisma.emailLog.create({
    data: {
      userId: subscription.userId,
      emailAddress: userEmail,
      subject: "New court hearing publication",
      templateId,
      status: "SENT",
      artefactId: artefact.artefactId
    }
  });

  return response;
}
```

### 4. Publication Event Hook

**File**: `libs/email-subscriptions/src/notification/trigger.ts`

```typescript
import { prisma } from "@hmcts/postgres";
import { queueNotification } from "./service.js";

export async function onPublicationCreated(artefactId: string, locationId: string) {
  // Find all active subscriptions for this location with IMMEDIATE frequency
  const subscriptions = await prisma.subscription.findMany({
    where: {
      locationId,
      isActive: true,
      emailFrequency: "IMMEDIATE"
    }
  });

  // Queue notification for each subscription
  const queuePromises = subscriptions.map((sub) =>
    queueNotification(sub.subscriptionId, artefactId)
  );

  await Promise.all(queuePromises);

  return {
    subscriptionsFound: subscriptions.length,
    notificationsQueued: subscriptions.length
  };
}
```

## URL Routing Structure

All routes are automatically generated based on file structure under `pages/account/email-subscriptions/`:

| URL Path | File Location | Methods | Description |
|----------|--------------|---------|-------------|
| `/account/email-subscriptions` | `pages/account/email-subscriptions/index.ts` | GET, POST | Dashboard - list subscriptions, update preferences |
| `/account/email-subscriptions/add` | `pages/account/email-subscriptions/add/index.ts` | GET | Add subscription - search/browse courts |
| `/account/email-subscriptions/search` | `pages/account/email-subscriptions/search/index.ts` | GET | Search results for courts |
| `/account/email-subscriptions/confirm` | `pages/account/email-subscriptions/confirm/index.ts` | GET, POST | Confirm subscription |
| `/account/email-subscriptions/remove` | `pages/account/email-subscriptions/remove/index.ts` | GET, POST | Remove subscription |

Unsubscribe (outside account namespace):

| URL Path | File Location | Methods | Description |
|----------|--------------|---------|-------------|
| `/unsubscribe/:token` | `pages/unsubscribe/[token]/index.ts` | GET, POST | Unsubscribe via email link |

## Session Storage Strategy

Session data is stored in Redis via express-session (already configured). Each module should namespace its session keys:

```typescript
interface EmailSubscriptionsSession {
  confirmData?: {
    locationId: string;
    emailFrequency?: string;
  };
}

// Extend express-session types
declare module "express-session" {
  interface SessionData {
    emailSubscriptions?: EmailSubscriptionsSession;
  }
}
```

## GOV.UK Frontend Components Usage

### Subscription Dashboard

- **govukButton**: Add subscription, Save preferences
- **govukRadios**: Email frequency selection
- **govukSummaryList**: Display subscription details
- **govukNotificationBanner**: Success messages
- **govukWarningText**: Empty state message

### Add/Search Pages

- **govukInput**: Search field
- **govukButton**: Search button
- **govukDetails**: Expandable region browser

### Confirmation Pages

- **govukPanel**: Success confirmation
- **govukButton**: Primary actions
- **govukBackLink**: Navigation
- **govukErrorSummary**: Validation errors

## Validation Strategy

### Client-Side Validation (Progressive Enhancement)

- Optional JavaScript validation for immediate feedback
- Uses HTML5 attributes (required, pattern, maxlength)
- Core functionality works without JavaScript

### Server-Side Validation (Required)

All validations must occur server-side:

```typescript
// libs/email-subscriptions/src/subscription/validation.ts

export async function validateLocationId(locationId: string): Promise<boolean> {
  const location = await getLocationById(locationId);
  return location !== null;
}

export function validateEmailFrequency(frequency: string): boolean {
  return ["IMMEDIATE", "DAILY", "WEEKLY"].includes(frequency);
}

export async function validateSubscriptionLimit(userId: string): Promise<boolean> {
  const count = await countActiveSubscriptionsByUserId(userId);
  return count < 50;
}

export async function validateDuplicateSubscription(
  userId: string,
  locationId: string
): Promise<boolean> {
  const existing = await findSubscriptionByUserAndLocation(userId, locationId);
  return !existing || !existing.isActive;
}
```

## Error Handling Strategy

### Business Logic Errors

Throw descriptive errors from service layer:

```typescript
if (count >= MAX_SUBSCRIPTIONS) {
  throw new Error("Maximum 50 subscriptions allowed");
}
```

### Controller Error Handling

Catch errors in controllers and render with error state:

```typescript
try {
  await createSubscription(userId, locationId);
  res.redirect("/account/email-subscriptions");
} catch (error) {
  res.render("confirm/index", {
    errors: {
      titleText: "There is a problem",
      errorList: [{ text: error.message }]
    },
    data: { locationId }
  });
}
```

### Email Service Error Handling

- Retry with exponential backoff
- Log all failures
- Alert on sustained high failure rates

## Testing Strategy

### Unit Tests (Vitest)

Co-located with source files (`*.test.ts`):

```typescript
// subscription/service.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createSubscription } from './service.js';

vi.mock('@hmcts/postgres', () => ({
  prisma: {
    subscription: {
      findUnique: vi.fn(),
      create: vi.fn()
    }
  }
}));

describe('createSubscription', () => {
  it('should create subscription successfully', async () => {
    // Test implementation
  });

  it('should throw error for duplicate subscription', async () => {
    // Test implementation
  });

  it('should enforce 50 subscription limit', async () => {
    // Test implementation
  });
});
```

### Integration Tests

Test complete flows with database:

```typescript
// subscription/integration.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { prisma } from '@hmcts/postgres';
import { createSubscription, getSubscriptionsByUserId } from './service.js';

describe('Subscription Integration Tests', () => {
  beforeEach(async () => {
    // Clean database
    await prisma.subscription.deleteMany();
  });

  it('should create and retrieve subscription', async () => {
    const userId = 'test-user';
    const locationId = 'test-location';

    await createSubscription(userId, locationId);
    const subscriptions = await getSubscriptionsByUserId(userId);

    expect(subscriptions).toHaveLength(1);
    expect(subscriptions[0].locationId).toBe(locationId);
  });
});
```

### E2E Tests (Playwright)

```typescript
// e2e-tests/tests/email-subscriptions.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Email Subscriptions', () => {
  test('user can add subscription', async ({ page }) => {
    // Login as verified user
    await page.goto('/login');
    // ... login steps ...

    await page.goto('/account/email-subscriptions');
    await page.click('text=Add subscription');
    await page.fill('[name="search"]', 'Birmingham');
    await page.click('text=Search');
    await page.click('text=Subscribe').first();
    await page.click('text=Confirm subscription');

    await expect(page.locator('text=Subscription added')).toBeVisible();
  });

  test('dashboard is accessible', async ({ page }) => {
    await page.goto('/account/email-subscriptions');
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });
});
```

## Scheduled Jobs Architecture

### Job 1: Process Notification Queue

**File**: `libs/email-subscriptions/src/jobs/process-notifications.ts`

**Schedule**: Every 5 minutes

**Function**: Process pending notifications in queue

```typescript
import { processNotificationQueue } from "../notification/service.js";

export async function runProcessNotifications() {
  console.log("Starting notification queue processing...");

  try {
    const result = await processNotificationQueue();
    console.log(`Processed ${result.processed} notifications`, result);
  } catch (error) {
    console.error("Error processing notification queue:", error);
  }
}
```

### Job 2: Send Daily Digest

**File**: `libs/email-subscriptions/src/jobs/send-daily-digest.ts`

**Schedule**: Daily at 8:00 AM

**Function**: Send daily digest emails

```typescript
import { prisma } from "@hmcts/postgres";

export async function runDailyDigest() {
  console.log("Starting daily digest job...");

  // Get all subscriptions with DAILY frequency
  const subscriptions = await prisma.subscription.findMany({
    where: {
      isActive: true,
      emailFrequency: "DAILY"
    }
  });

  // Group by user and send digest
  // TODO: Implement digest logic
}
```

### Job 3: Send Weekly Digest

**File**: `libs/email-subscriptions/src/jobs/send-weekly-digest.ts`

**Schedule**: Weekly on Monday at 8:00 AM

**Function**: Send weekly digest emails

## Security Considerations

### Authentication & Authorization

- All subscription pages require `requireAuth()` middleware
- All subscription pages require `blockUserAccess()` to ensure verified users only
- Users can only manage their own subscriptions
- Ownership validation on all mutation operations

### CSRF Protection

- All forms include CSRF token (provided by express-session middleware)
- POST requests validate CSRF token

### Rate Limiting

Use Redis-based rate limiting:

```typescript
import { createRateLimiter } from "@hmcts/redis";

const subscriptionRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 requests per minute
  keyGenerator: (req) => req.user?.id || req.ip
});

// Apply to subscription mutation routes
export const POST: RequestHandler[] = [
  requireAuth(),
  blockUserAccess(),
  subscriptionRateLimiter,
  postHandler
];
```

### Input Sanitization

- All inputs validated before database operations
- Prisma parameterized queries prevent SQL injection
- Email addresses validated with regex
- Location IDs validated against known locations

### Token Security

Unsubscribe tokens:

- Cryptographically secure random generation
- Time-limited (7 days)
- Single-use
- Stored in Redis with automatic expiry

## Performance Optimization

### Database Query Optimization

1. **Indexes**: All foreign keys and query columns indexed
2. **Connection Pooling**: Prisma manages connection pool
3. **Batch Operations**: Use `createMany` and `updateMany` where possible
4. **Selective Fields**: Only query needed fields with `select`

### Caching Strategy

1. **Location Data**: Cache location lookups in Redis (rarely changes)
2. **Subscription Counts**: Cache user subscription counts (5 minute TTL)
3. **Email Templates**: GOV Notify handles template caching

### Email Sending Optimization

1. **Queue Processing**: Batch process up to 100 at a time
2. **Parallel Sending**: Use Promise.allSettled for concurrent sends
3. **GOV Notify Limits**: Respect API rate limits (3000/min)

## Monitoring & Observability

### Application Insights Metrics

Custom metrics to track:

```typescript
import { trackMetric, trackEvent } from "@hmcts/cloud-native-platform";

// Track subscription operations
trackEvent("SubscriptionAdded", {
  userId,
  locationId
});

trackMetric("ActiveSubscriptions", subscriptionCount);

// Track email operations
trackEvent("EmailSent", {
  status: "success",
  templateId
});

trackMetric("NotificationQueueDepth", queueDepth);
```

### Health Checks

Add health check endpoint for notification queue:

```typescript
app.get("/health/email-subscriptions", async (req, res) => {
  const queueDepth = await prisma.notificationQueue.count({
    where: { status: "PENDING" }
  });

  const oldestPending = await prisma.notificationQueue.findFirst({
    where: { status: "PENDING" },
    orderBy: { createdAt: "asc" }
  });

  const healthy = queueDepth < 1000 &&
    (!oldestPending || Date.now() - oldestPending.createdAt.getTime() < 30 * 60 * 1000);

  res.status(healthy ? 200 : 503).json({
    healthy,
    queueDepth,
    oldestPendingAge: oldestPending
      ? Date.now() - oldestPending.createdAt.getTime()
      : 0
  });
});
```

### Alerts

Configure alerts for:

1. Email delivery failure rate > 5%
2. Notification queue depth > 1000
3. Oldest pending notification > 30 minutes
4. Rate limit exceeded frequently

## Deployment Checklist

### Pre-Deployment

- [ ] All tests passing (unit, integration, E2E)
- [ ] Code review completed
- [ ] Accessibility audit passed
- [ ] Welsh translations verified
- [ ] Database migration reviewed
- [ ] GOV Notify templates created and tested
- [ ] Environment variables configured
- [ ] Rate limiting tested

### Deployment Steps

1. **Database Migration** (staging):
   ```bash
   yarn db:migrate
   ```

2. **Deploy Application** (staging):
   - Deploy code changes
   - Verify health checks pass
   - Smoke test all pages

3. **Verify GOV Notify Integration**:
   - Send test emails
   - Verify email formatting
   - Test unsubscribe links

4. **Load Testing**:
   - Test with 100 concurrent users
   - Test notification queue with 1000 notifications

5. **Production Deployment**:
   - Run migration
   - Deploy application
   - Monitor for 24 hours

### Post-Deployment

- [ ] Monitor error rates
- [ ] Monitor email delivery rates
- [ ] Monitor notification queue depth
- [ ] Check Application Insights dashboards
- [ ] Verify alerts working

## Configuration Requirements

### Environment Variables

```bash
# GOV Notify API
GOV_NOTIFY_API_KEY=your_api_key
GOV_NOTIFY_IMMEDIATE_TEMPLATE_EN=template_id
GOV_NOTIFY_IMMEDIATE_TEMPLATE_CY=template_id
GOV_NOTIFY_DAILY_TEMPLATE_EN=template_id
GOV_NOTIFY_DAILY_TEMPLATE_CY=template_id
GOV_NOTIFY_WEEKLY_TEMPLATE_EN=template_id
GOV_NOTIFY_WEEKLY_TEMPLATE_CY=template_id

# Subscription Limits
SUBSCRIPTION_MAX_PER_USER=50
SUBSCRIPTION_RATE_LIMIT_PER_MINUTE=10

# Email Settings
EMAIL_RATE_LIMIT_PER_DAY=100
NOTIFICATION_BATCH_SIZE=100

# Base URL for links in emails
BASE_URL=https://court-and-tribunal-hearings.service.gov.uk
```

### Helm Values

Update `apps/web/helm/values.yaml`:

```yaml
config:
  GOV_NOTIFY_API_KEY: "#{GOV_NOTIFY_API_KEY}#"
  GOV_NOTIFY_IMMEDIATE_TEMPLATE_EN: "#{GOV_NOTIFY_IMMEDIATE_TEMPLATE_EN}#"
  GOV_NOTIFY_IMMEDIATE_TEMPLATE_CY: "#{GOV_NOTIFY_IMMEDIATE_TEMPLATE_CY}#"
  # ... other templates
  SUBSCRIPTION_MAX_PER_USER: "50"
  BASE_URL: "#{BASE_URL}#"
```

## Risks & Mitigation

### Risk 1: GOV Notify API Rate Limits

**Risk**: May hit rate limits with many subscribers

**Mitigation**:
- Batch processing (max 100 at a time)
- Exponential backoff on rate limit errors
- Monitor queue depth
- Consider digest emails for high-volume courts

### Risk 2: Email Deliverability

**Risk**: Emails marked as spam

**Mitigation**:
- Use GOV Notify (handles SPF/DKIM/DMARC)
- Clear, professional email content
- Prominent unsubscribe link
- Monitor bounce rates

### Risk 3: Database Performance

**Risk**: Slow queries with many subscriptions

**Mitigation**:
- Comprehensive database indexes
- Query optimization with `explain analyze`
- Pagination for large result sets
- Regular database maintenance

### Risk 4: Notification Queue Backlog

**Risk**: Queue grows faster than processing

**Mitigation**:
- Horizontal scaling of job processing
- Alert when queue depth exceeds threshold
- Emergency mode to skip non-critical notifications
- Consider separate queues for immediate vs digest

### Risk 5: Duplicate Notifications

**Risk**: Users receive multiple emails for same publication

**Mitigation**:
- Unique constraint on (subscriptionId, artefactId) in queue
- Idempotent processing logic
- Deduplicate before sending

## Future Enhancements (Out of Scope)

The following features are explicitly out of scope for this implementation but may be considered in future iterations:

1. **SMS Notifications**: Text message alerts in addition to email
2. **Push Notifications**: Browser/mobile app push notifications
3. **Custom Notification Rules**: Filter by case type, hearing type, etc.
4. **Calendar Integration**: Add hearings to Google Calendar, Outlook
5. **Subscription Recommendations**: Suggest courts based on search history
6. **Bulk Operations**: Import/export subscription lists
7. **Notification History**: View past notifications in dashboard
8. **Advanced Digest Customization**: Custom digest schedule (e.g., Tue/Thu)

## Appendix: Naming Conventions Reference

### Database (snake_case, singular)
- Tables: `subscription`, `notification_queue`, `email_log`
- Columns: `subscription_id`, `user_id`, `location_id`, `email_frequency`

### TypeScript (camelCase)
- Variables: `userId`, `locationId`, `emailFrequency`
- Functions: `createSubscription`, `getSubscriptionsByUserId`

### Files (kebab-case)
- Files: `subscription-service.ts`, `notification-queue.ts`
- Directories: `email-subscriptions/`, `notification/`

### URLs (kebab-case)
- Paths: `/account/email-subscriptions`, `/email-subscriptions/add`

### Constants (SCREAMING_SNAKE_CASE)
- `MAX_SUBSCRIPTIONS`, `NOTIFICATION_BATCH_SIZE`

## Summary

This implementation plan provides a comprehensive roadmap for building the email subscriptions feature following HMCTS monorepo patterns and conventions. The architecture emphasizes:

- Modular, maintainable code structure
- WCAG 2.2 AA accessibility compliance
- Bilingual support (English/Welsh)
- Robust error handling and retry logic
- Comprehensive testing at all levels
- Production-ready monitoring and observability
- Security-first design
- Performance optimization

The plan balances simplicity (KISS, YAGNI) with robustness, avoiding unnecessary complexity while ensuring production-ready quality.
