# VIBE-221: Implementation Plan

## Overview

This plan outlines the step-by-step implementation of the email notification system for hearing list publications. The implementation is organized into sequential phases, with each phase building on the previous one.

## Time Estimates

- **Phase 1: Database Schema**: 1.5 hours
- **Phase 2: Core Module Setup**: 1 hour
- **Phase 3: GOV.UK Notify Integration**: 2 hours
- **Phase 4: Notification Service**: 3 hours
- **Phase 5: Event Trigger**: 1.5 hours
- **Phase 6: Testing**: 3 hours
- **Phase 7: Documentation**: 1 hour

**Total Estimated Time**: 13 hours

## Prerequisites

1. Access to GOV.UK Notify account for template creation
2. Azure Key Vault access for API key storage
3. Database migration permissions
4. Understanding of existing codebase structure

## Phase 1: Database Schema (1.5 hours)

### 1.1 Create Notification Module Structure

**Location**: `libs/notification/`

```bash
mkdir -p libs/notification/src/{subscription,audit,notify,notification}
mkdir -p libs/notification/prisma
```

**Files to create**:
```
libs/notification/
├── package.json
├── tsconfig.json
├── prisma/
│   └── schema.prisma
└── src/
    ├── index.ts
    └── config.ts
```

### 1.2 Define Prisma Schema

**File**: `libs/notification/prisma/schema.prisma`

```prisma
model Subscription {
  subscriptionId   String   @id @default(uuid()) @map("subscription_id") @db.Uuid
  userId           String   @map("user_id")
  locationId       String   @map("location_id")
  listTypeId       Int?     @map("list_type_id")
  createdAt        DateTime @default(now()) @map("created_at")
  updatedAt        DateTime @updatedAt @map("updated_at")

  @@unique([userId, locationId, listTypeId])
  @@index([locationId])
  @@index([userId])
  @@map("subscription")
}

model NotificationAudit {
  auditId          String   @id @default(uuid()) @map("audit_id") @db.Uuid
  artefactId       String   @map("artefact_id") @db.Uuid
  subscriptionId   String   @map("subscription_id") @db.Uuid
  recipientEmail   String   @map("recipient_email")
  notifyReference  String?  @map("notify_reference")
  status           String
  errorMessage     String?  @map("error_message")
  attemptCount     Int      @default(1) @map("attempt_count")
  sentAt           DateTime @default(now()) @map("sent_at")

  @@index([artefactId])
  @@index([subscriptionId])
  @@index([status])
  @@map("notification_audit")
}
```

### 1.3 Register Module in Schema Discovery

**File**: `apps/postgres/src/schema-discovery.ts`

```typescript
import { prismaSchemas as notificationSchemas } from "@hmcts/notification/config";

export function getPrismaSchemas(): string[] {
  return [notificationSchemas];
}
```

### 1.4 Update Root tsconfig.json

Add notification module to paths:

```json
{
  "compilerOptions": {
    "paths": {
      "@hmcts/notification": ["libs/notification/src"],
      "@hmcts/notification/config": ["libs/notification/src/config.ts"]
    }
  }
}
```

### 1.5 Run Database Migration

```bash
yarn db:migrate:dev
```

**Deliverables**:
- [ ] Notification module structure created
- [ ] Prisma schema defined
- [ ] Database migration successful
- [ ] Module registered in monorepo

## Phase 2: Core Module Setup (1 hour)

### 2.1 Create package.json

**File**: `libs/notification/package.json`

```json
{
  "name": "@hmcts/notification",
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
    "notifications-node-client": "8.3.1"
  },
  "peerDependencies": {
    "express": "5.1.0"
  }
}
```

### 2.2 Create tsconfig.json

**File**: `libs/notification/tsconfig.json`

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "declaration": true,
    "declarationMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["**/*.test.ts", "**/*.spec.ts", "dist", "node_modules"]
}
```

### 2.3 Create Configuration Module

**File**: `libs/notification/src/config.ts`

```typescript
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const prismaSchemas = path.join(__dirname, "../prisma");
```

### 2.4 Install Dependencies

```bash
cd libs/notification
yarn add notifications-node-client@8.3.1
```

**Deliverables**:
- [ ] package.json configured
- [ ] tsconfig.json configured
- [ ] Dependencies installed
- [ ] Config module created

## Phase 3: GOV.UK Notify Integration (2 hours)

### 3.1 Create Notify Client Configuration

**File**: `libs/notification/src/notify/notify-config.ts`

```typescript
import config from "config";

const NOTIFY_API_KEY = "notify.apiKey";
const NOTIFY_TEMPLATE_ID = "notify.templateId";
const NOTIFY_BASE_URL = "notify.baseUrl";

export interface NotifyConfig {
  apiKey: string;
  templateId: string;
  baseUrl?: string;
}

export function getNotifyConfig(): NotifyConfig {
  const apiKey = config.get<string>(NOTIFY_API_KEY);
  const templateId = config.get<string>(NOTIFY_TEMPLATE_ID);
  const baseUrl = config.has(NOTIFY_BASE_URL)
    ? config.get<string>(NOTIFY_BASE_URL)
    : undefined;

  if (!apiKey) {
    throw new Error("GOV.UK Notify API key is not configured");
  }

  if (!templateId) {
    throw new Error("GOV.UK Notify template ID is not configured");
  }

  return { apiKey, templateId, baseUrl };
}
```

### 3.2 Create Notify Client Wrapper

**File**: `libs/notification/src/notify/client.ts`

```typescript
import { NotifyClient } from "notifications-node-client";
import { getNotifyConfig } from "./notify-config.js";

let notifyClient: NotifyClient | null = null;

export function getNotifyClient(): NotifyClient {
  if (!notifyClient) {
    const config = getNotifyConfig();
    notifyClient = new NotifyClient(config.baseUrl, config.apiKey);
  }
  return notifyClient;
}

export interface EmailPersonalisation {
  content_date: string;
  list_type: string;
  case_num?: string;
  case_urn?: string;
  locations?: string;
  manage_subscription_url: string;
}

export interface SendEmailResult {
  success: boolean;
  notifyReference?: string;
  error?: {
    message: string;
    code?: string;
    statusCode?: number;
  };
}

export async function sendNotificationEmail(
  emailAddress: string,
  personalisation: EmailPersonalisation
): Promise<SendEmailResult> {
  try {
    const client = getNotifyClient();
    const config = getNotifyConfig();

    const response = await client.sendEmail(
      config.templateId,
      emailAddress,
      { personalisation }
    );

    return {
      success: true,
      notifyReference: response.data.id
    };
  } catch (error) {
    return {
      success: false,
      error: {
        message: error instanceof Error ? error.message : "Unknown error",
        code: (error as any).response?.data?.errors?.[0]?.error,
        statusCode: (error as any).response?.status
      }
    };
  }
}
```

### 3.3 Add Retry Logic

**File**: `libs/notification/src/notify/retry-handler.ts`

```typescript
const MAX_RETRY_ATTEMPTS = 3;
const INITIAL_DELAY_MS = 1000;
const MAX_DELAY_MS = 10000;
const BACKOFF_MULTIPLIER = 2;

interface RetryableFunction<T> {
  (): Promise<T>;
}

function isRetryableError(statusCode?: number): boolean {
  if (!statusCode) return false;
  return statusCode === 429 || statusCode === 503 || statusCode >= 500;
}

function calculateDelay(attemptNumber: number): number {
  const delay = INITIAL_DELAY_MS * Math.pow(BACKOFF_MULTIPLIER, attemptNumber - 1);
  return Math.min(delay, MAX_DELAY_MS);
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function withRetry<T>(
  fn: RetryableFunction<T>,
  context: { statusCode?: number }
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= MAX_RETRY_ATTEMPTS; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      const shouldRetry =
        attempt < MAX_RETRY_ATTEMPTS &&
        isRetryableError(context.statusCode);

      if (!shouldRetry) {
        throw lastError;
      }

      const delayMs = calculateDelay(attempt);
      await sleep(delayMs);
    }
  }

  throw lastError || new Error("Max retry attempts reached");
}
```

### 3.4 Create Configuration File

**File**: `apps/crons/config/default.json`

Update to include notify configuration:

```json
{
  "serviceName": "cath-crons",
  "applicationInsights": {
    "enabled": false
  },
  "notify": {
    "apiKey": "",
    "templateId": "",
    "baseUrl": "https://api.notifications.service.gov.uk"
  }
}
```

### 3.5 Add Unit Tests

**File**: `libs/notification/src/notify/client.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { sendNotificationEmail } from "./client.js";

vi.mock("notifications-node-client");
vi.mock("./notify-config.js", () => ({
  getNotifyConfig: () => ({
    apiKey: "test-key",
    templateId: "test-template-id"
  })
}));

describe("sendNotificationEmail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should send email successfully", async () => {
    const result = await sendNotificationEmail("test@example.com", {
      content_date: "25th September 2025",
      list_type: "Civil Daily Cause List",
      manage_subscription_url: "https://example.com/manage"
    });

    expect(result.success).toBe(true);
    expect(result.notifyReference).toBeDefined();
  });

  it("should handle errors gracefully", async () => {
    const result = await sendNotificationEmail("invalid-email", {
      content_date: "25th September 2025",
      list_type: "Civil Daily Cause List",
      manage_subscription_url: "https://example.com/manage"
    });

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});
```

**Deliverables**:
- [ ] Notify client configuration created
- [ ] Notify client wrapper implemented
- [ ] Retry logic implemented
- [ ] Unit tests written and passing
- [ ] Configuration file updated

## Phase 4: Notification Service (3 hours)

### 4.1 Create Data Models

**File**: `libs/notification/src/subscription/model.ts`

```typescript
export interface Subscription {
  subscriptionId: string;
  userId: string;
  locationId: string;
  listTypeId: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface SubscriptionWithEmail extends Subscription {
  email: string;
}
```

### 4.2 Create Subscription Queries

**File**: `libs/notification/src/subscription/queries.ts`

```typescript
import { prisma } from "@hmcts/postgres";
import type { SubscriptionWithEmail } from "./model.js";

export async function getSubscriptionsForPublication(
  locationId: string,
  listTypeId: number
): Promise<SubscriptionWithEmail[]> {
  // TODO: Update when user table structure is confirmed
  // This query assumes a user table with email field
  const subscriptions = await prisma.$queryRaw<SubscriptionWithEmail[]>`
    SELECT DISTINCT
      s.subscription_id,
      s.user_id,
      s.location_id,
      s.list_type_id,
      s.created_at,
      s.updated_at,
      'placeholder@example.com' as email
    FROM subscription s
    WHERE s.location_id = ${locationId}
      AND (s.list_type_id = ${listTypeId} OR s.list_type_id IS NULL)
    ORDER BY s.user_id
  `;

  return subscriptions;
}
```

### 4.3 Create Audit Queries

**File**: `libs/notification/src/audit/queries.ts`

```typescript
import { prisma } from "@hmcts/postgres";

export interface CreateAuditParams {
  artefactId: string;
  subscriptionId: string;
  recipientEmail: string;
  notifyReference?: string;
  status: "sent" | "failed" | "pending";
  errorMessage?: string;
  attemptCount: number;
}

export async function createNotificationAudit(
  params: CreateAuditParams
): Promise<void> {
  await prisma.notificationAudit.create({
    data: {
      artefactId: params.artefactId,
      subscriptionId: params.subscriptionId,
      recipientEmail: params.recipientEmail,
      notifyReference: params.notifyReference,
      status: params.status,
      errorMessage: params.errorMessage,
      attemptCount: params.attemptCount
    }
  });
}

export async function getAuditsByArtefact(artefactId: string) {
  return prisma.notificationAudit.findMany({
    where: { artefactId },
    orderBy: { sentAt: "desc" }
  });
}
```

### 4.4 Create Email Personalisation Builder

**File**: `libs/notification/src/notification/personalisation-builder.ts`

```typescript
import type { Artefact } from "@hmcts/publication";
import type { ListType } from "@hmcts/list-types-common";
import type { Location } from "@hmcts/location";
import type { EmailPersonalisation } from "../notify/client.js";

export function buildEmailPersonalisation(
  artefact: Artefact,
  listType: ListType,
  location: Location,
  baseUrl: string
): EmailPersonalisation {
  const contentDate = formatDate(artefact.contentDate);
  const listTypeName = listType.englishFriendlyName;
  const locationName = location.name;

  return {
    content_date: contentDate,
    list_type: listTypeName,
    locations: locationName,
    manage_subscription_url: `${baseUrl}/account/subscriptions`
  };
}

function formatDate(date: Date): string {
  const day = date.getDate();
  const suffix = getOrdinalSuffix(day);
  const month = date.toLocaleDateString("en-GB", { month: "long" });
  const year = date.getFullYear();
  return `${day}${suffix} ${month} ${year}`;
}

function getOrdinalSuffix(day: number): string {
  if (day > 3 && day < 21) return "th";
  switch (day % 10) {
    case 1:
      return "st";
    case 2:
      return "nd";
    case 3:
      return "rd";
    default:
      return "th";
  }
}
```

### 4.5 Create Main Notification Service

**File**: `libs/notification/src/notification/service.ts`

```typescript
import { getArtefactsByIds } from "@hmcts/publication";
import { mockListTypes } from "@hmcts/list-types-common";
import { getLocationById } from "@hmcts/location";
import { sendNotificationEmail } from "../notify/client.js";
import { getSubscriptionsForPublication } from "../subscription/queries.js";
import { createNotificationAudit } from "../audit/queries.js";
import { buildEmailPersonalisation } from "./personalisation-builder.js";

interface SendNotificationsParams {
  artefactId: string;
  locationId: string;
  listTypeId: number;
  baseUrl: string;
}

interface NotificationResult {
  totalSubscriptions: number;
  successfulNotifications: number;
  failedNotifications: number;
  errors: Array<{ email: string; error: string }>;
}

export async function sendPublicationNotifications(
  params: SendNotificationsParams
): Promise<NotificationResult> {
  const { artefactId, locationId, listTypeId, baseUrl } = params;

  const result: NotificationResult = {
    totalSubscriptions: 0,
    successfulNotifications: 0,
    failedNotifications: 0,
    errors: []
  };

  try {
    // Get artefact details
    const artefacts = await getArtefactsByIds([artefactId]);
    if (artefacts.length === 0) {
      throw new Error(`Artefact not found: ${artefactId}`);
    }
    const artefact = artefacts[0];

    // Get list type details
    const listType = mockListTypes.find((lt) => lt.id === listTypeId);
    if (!listType) {
      throw new Error(`List type not found: ${listTypeId}`);
    }

    // Get location details
    const location = await getLocationById(locationId);
    if (!location) {
      throw new Error(`Location not found: ${locationId}`);
    }

    // Build email personalisation
    const personalisation = buildEmailPersonalisation(
      artefact,
      listType,
      location,
      baseUrl
    );

    // Get subscriptions
    const subscriptions = await getSubscriptionsForPublication(
      locationId,
      listTypeId
    );
    result.totalSubscriptions = subscriptions.length;

    // Send notifications
    for (const subscription of subscriptions) {
      const emailResult = await sendNotificationEmail(
        subscription.email,
        personalisation
      );

      // Create audit record
      await createNotificationAudit({
        artefactId,
        subscriptionId: subscription.subscriptionId,
        recipientEmail: subscription.email,
        notifyReference: emailResult.notifyReference,
        status: emailResult.success ? "sent" : "failed",
        errorMessage: emailResult.error?.message,
        attemptCount: 1
      });

      if (emailResult.success) {
        result.successfulNotifications++;
      } else {
        result.failedNotifications++;
        result.errors.push({
          email: maskEmail(subscription.email),
          error: emailResult.error?.message || "Unknown error"
        });
      }
    }
  } catch (error) {
    throw new Error(
      `Failed to send publication notifications: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }

  return result;
}

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) return email;
  const masked = local.charAt(0) + "***";
  return `${masked}@${domain}`;
}
```

### 4.6 Export Module API

**File**: `libs/notification/src/index.ts`

```typescript
export { sendPublicationNotifications } from "./notification/service.js";
export { getSubscriptionsForPublication } from "./subscription/queries.js";
export { createNotificationAudit, getAuditsByArtefact } from "./audit/queries.js";
export type { SubscriptionWithEmail } from "./subscription/model.js";
```

### 4.7 Add Unit Tests

**File**: `libs/notification/src/notification/service.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { sendPublicationNotifications } from "./service.js";

vi.mock("@hmcts/publication");
vi.mock("@hmcts/location");
vi.mock("../subscription/queries.js");
vi.mock("../audit/queries.js");
vi.mock("../notify/client.js");

describe("sendPublicationNotifications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should send notifications to all subscribers", async () => {
    const result = await sendPublicationNotifications({
      artefactId: "test-artefact-id",
      locationId: "test-location-id",
      listTypeId: 1,
      baseUrl: "https://example.com"
    });

    expect(result.totalSubscriptions).toBeGreaterThanOrEqual(0);
    expect(result.successfulNotifications).toBeGreaterThanOrEqual(0);
  });
});
```

**Deliverables**:
- [ ] Subscription queries implemented
- [ ] Audit queries implemented
- [ ] Email personalisation builder created
- [ ] Main notification service implemented
- [ ] Module exports configured
- [ ] Unit tests written and passing

## Phase 5: Event Trigger (1.5 hours)

### 5.1 Create Cron Job Script

**File**: `apps/crons/src/send-publication-notifications.ts`

```typescript
import { sendPublicationNotifications } from "@hmcts/notification";

export async function sendPublicationNotificationsCron() {
  const artefactId = process.env.ARTEFACT_ID;
  const locationId = process.env.LOCATION_ID;
  const listTypeId = process.env.LIST_TYPE_ID;
  const baseUrl = process.env.BASE_URL || "https://cath-web.platform.hmcts.net";

  if (!artefactId || !locationId || !listTypeId) {
    throw new Error(
      "Missing required environment variables: ARTEFACT_ID, LOCATION_ID, LIST_TYPE_ID"
    );
  }

  console.log("Starting publication notifications", {
    artefactId,
    locationId,
    listTypeId
  });

  try {
    const result = await sendPublicationNotifications({
      artefactId,
      locationId,
      listTypeId: Number.parseInt(listTypeId, 10),
      baseUrl
    });

    console.log("Publication notifications completed", {
      totalSubscriptions: result.totalSubscriptions,
      successfulNotifications: result.successfulNotifications,
      failedNotifications: result.failedNotifications,
      errorCount: result.errors.length
    });

    if (result.errors.length > 0) {
      console.error("Notification errors:", result.errors);
    }
  } catch (error) {
    console.error("Failed to send publication notifications", {
      error: error instanceof Error ? error.message : "Unknown error"
    });
    throw error;
  }
}

export default sendPublicationNotificationsCron;
```

### 5.2 Update Cron Package Dependencies

**File**: `apps/crons/package.json`

```json
{
  "dependencies": {
    "@hmcts/cloud-native-platform": "workspace:*",
    "@hmcts/postgres": "workspace:*",
    "@hmcts/notification": "workspace:*",
    "config": "4.1.1"
  }
}
```

### 5.3 Create Kubernetes CronJob Configuration

**File**: `apps/crons/helm/templates/send-publication-notifications-cronjob.yaml`

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: {{ .Release.Name }}-send-publication-notifications
  labels:
    app: {{ .Release.Name }}
spec:
  schedule: "*/5 * * * *"  # Every 5 minutes
  concurrencyPolicy: Forbid
  successfulJobsHistoryLimit: 3
  failedJobsHistoryLimit: 3
  jobTemplate:
    spec:
      template:
        spec:
          restartPolicy: Never
          containers:
          - name: send-publication-notifications
            image: {{ .Values.image.repository }}:{{ .Values.image.tag }}
            imagePullPolicy: {{ .Values.image.pullPolicy }}
            env:
            - name: SCRIPT_NAME
              value: "send-publication-notifications"
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: {{ .Release.Name }}-secrets
                  key: DATABASE_URL
            - name: NOTIFY_API_KEY
              valueFrom:
                secretKeyRef:
                  name: {{ .Release.Name }}-secrets
                  key: NOTIFY_API_KEY
            - name: BASE_URL
              value: {{ .Values.baseUrl }}
            volumeMounts:
            - name: properties-volume
              mountPath: /mnt/properties
          volumes:
          - name: properties-volume
            secret:
              secretName: {{ .Release.Name }}-properties
```

### 5.4 Add Unit Tests

**File**: `apps/crons/src/send-publication-notifications.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { sendPublicationNotificationsCron } from "./send-publication-notifications.js";

vi.mock("@hmcts/notification");

describe("sendPublicationNotificationsCron", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ARTEFACT_ID = "test-artefact";
    process.env.LOCATION_ID = "test-location";
    process.env.LIST_TYPE_ID = "1";
  });

  it("should execute successfully with valid environment variables", async () => {
    await expect(sendPublicationNotificationsCron()).resolves.not.toThrow();
  });

  it("should throw error when environment variables are missing", async () => {
    delete process.env.ARTEFACT_ID;
    await expect(sendPublicationNotificationsCron()).rejects.toThrow();
  });
});
```

**Deliverables**:
- [ ] Cron job script created
- [ ] Dependencies updated
- [ ] Kubernetes configuration created
- [ ] Unit tests written and passing

## Phase 6: Testing (3 hours)

### 6.1 Integration Tests

**File**: `libs/notification/src/notification/integration.test.ts`

```typescript
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { sendPublicationNotifications } from "./service.js";
import { createNotificationAudit } from "../audit/queries.js";
import { getSubscriptionsForPublication } from "../subscription/queries.js";

describe("Notification Integration Tests", () => {
  // Setup test data before all tests
  beforeAll(async () => {
    // Create test subscriptions
    // Create test artefact
  });

  afterAll(async () => {
    // Clean up test data
  });

  it("should send notifications end-to-end", async () => {
    const result = await sendPublicationNotifications({
      artefactId: "test-artefact",
      locationId: "test-location",
      listTypeId: 1,
      baseUrl: "https://test.example.com"
    });

    expect(result.totalSubscriptions).toBeGreaterThanOrEqual(0);
  });

  it("should create audit records for all notifications", async () => {
    await sendPublicationNotifications({
      artefactId: "test-artefact",
      locationId: "test-location",
      listTypeId: 1,
      baseUrl: "https://test.example.com"
    });

    // Verify audit records created
  });
});
```

### 6.2 Manual Testing Checklist

Create test scenarios:

1. **Happy Path**:
   - [ ] Create test subscription
   - [ ] Trigger notification
   - [ ] Verify email received
   - [ ] Check audit log

2. **Error Scenarios**:
   - [ ] Invalid email address
   - [ ] Network timeout
   - [ ] Invalid API key
   - [ ] Missing template

3. **Edge Cases**:
   - [ ] No subscriptions
   - [ ] Multiple subscriptions for same user
   - [ ] Missing artefact
   - [ ] Missing location

4. **Performance**:
   - [ ] 100 subscriptions
   - [ ] 500 subscriptions
   - [ ] 1000 subscriptions

### 6.3 Create Test Data Seeds

**File**: `libs/notification/prisma/seeds/test-subscriptions.ts`

```typescript
import { prisma } from "@hmcts/postgres";

export async function seedTestSubscriptions() {
  const testSubscriptions = [
    {
      userId: "test-user-1",
      locationId: "test-location-1",
      listTypeId: 1
    },
    {
      userId: "test-user-2",
      locationId: "test-location-1",
      listTypeId: null // All list types
    }
  ];

  for (const subscription of testSubscriptions) {
    await prisma.subscription.create({ data: subscription });
  }
}
```

**Deliverables**:
- [ ] Integration tests written
- [ ] Manual testing checklist completed
- [ ] Test data seeds created
- [ ] All tests passing

## Phase 7: Documentation (1 hour)

### 7.1 Create GOV.UK Notify Template Guide

**File**: `docs/VIBE-221/notify-template-setup.md`

```markdown
# GOV.UK Notify Template Setup

## Template Creation

1. Log in to GOV.UK Notify dashboard
2. Create new email template
3. Name: "Hearing List Publication Notification"
4. Subject: "((case_num??With case number or ID)) ((case_num)) ((case_urn??With unique reference number)) ((case_urn)) ((locations??*)) ((locations)) - your email subscriptions"

## Template Body

[Include the full template body from the mockup]

## Personalisation Fields

- content_date (required)
- list_type (required)
- manage_subscription_url (required)
- case_num (optional)
- case_urn (optional)
- locations (optional)
```

### 7.2 Create Deployment Guide

**File**: `docs/VIBE-221/deployment.md`

```markdown
# Deployment Guide

## Prerequisites

1. GOV.UK Notify account with API key
2. Azure Key Vault access
3. Kubernetes cluster access

## Configuration Steps

[Include step-by-step deployment instructions]
```

### 7.3 Update Main README

Add notification section to main README explaining the feature.

**Deliverables**:
- [ ] GOV.UK Notify template guide created
- [ ] Deployment guide created
- [ ] README updated
- [ ] Code comments reviewed

## Post-Implementation Tasks

### Immediate (After Deployment)

1. **Monitor Notification Delivery**:
   - Check GOV.UK Notify dashboard for delivery statistics
   - Monitor application logs for errors
   - Track audit table for patterns

2. **Verify Email Content**:
   - Send test notifications
   - Verify all personalisation fields render correctly
   - Check Welsh language support (if applicable)

3. **Performance Baseline**:
   - Measure average notification processing time
   - Monitor database query performance
   - Check API rate limit usage

### Short-term (Within 1 Week)

1. **User Feedback**:
   - Gather feedback from early users
   - Identify any email deliverability issues
   - Adjust notification timing if needed

2. **Optimization**:
   - Tune batch sizes based on actual load
   - Adjust retry parameters if needed
   - Optimize database queries if slow

3. **Documentation**:
   - Update runbooks based on operational experience
   - Document common issues and resolutions
   - Create monitoring dashboard

### Medium-term (Within 1 Month)

1. **Analytics**:
   - Analyze notification delivery rates
   - Identify common failure patterns
   - Generate compliance reports

2. **Enhancements**:
   - Consider email verification flow
   - Implement unsubscribe mechanism
   - Add notification preferences (frequency, timing)

## Rollback Plan

If issues are encountered in production:

1. **Disable CronJob**:
   ```bash
   kubectl patch cronjob send-publication-notifications -p '{"spec":{"suspend":true}}'
   ```

2. **Verify Publications Still Work**:
   - Ensure publication workflow is unaffected
   - Check that hearing lists are still accessible

3. **Investigate and Fix**:
   - Review logs and audit records
   - Identify root cause
   - Apply fix and test in staging

4. **Re-enable**:
   ```bash
   kubectl patch cronjob send-publication-notifications -p '{"spec":{"suspend":false}}'
   ```

## Success Metrics

Track these metrics to measure success:

1. **Delivery Rate**: >95% of notifications successfully delivered
2. **Performance**: Notifications sent within 5 minutes of publication
3. **Reliability**: <1% failure rate due to system errors
4. **User Satisfaction**: Positive feedback on notification content and timing

## Support and Maintenance

- **Primary Contact**: [Team Lead]
- **On-call Support**: [Rotation Schedule]
- **Documentation**: `/docs/VIBE-221/`
- **Monitoring Dashboard**: [Dashboard URL]
- **GOV.UK Notify Dashboard**: [Dashboard URL]

## Dependencies and Related Work

- **VIBE-220**: Subscription Management UI (required for users to create subscriptions)
- **VIBE-222**: Email Verification (enhancement for security)
- **VIBE-223**: Notification Analytics (enhancement for monitoring)
- **User Table**: Requires user table with email addresses (may need separate ticket)

## Risk Mitigation

1. **API Rate Limiting**: Monitor GOV.UK Notify usage, upgrade plan if needed
2. **Email Deliverability**: Use GOV.UK Notify's established reputation
3. **Data Protection**: Include mandatory notices, implement retention policies
4. **Performance**: Implement batching and async processing
5. **Failures**: Comprehensive error handling and retry logic

## Next Steps

After this implementation is complete:

1. Create subscription management UI (VIBE-220)
2. Implement email verification (VIBE-222)
3. Build analytics dashboard (VIBE-223)
4. Add notification preferences (future ticket)
5. Implement unsubscribe mechanism (future ticket)
