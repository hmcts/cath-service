# Technical Plan: Third Party Subscription Fulfilment

## Overview

This ticket implements the mechanism to fulfil third-party subscriptions by pushing publications to external third-party systems via HTTP POST with custom headers and certificate-based authentication. When publications are uploaded (via manual upload or API endpoint), the system identifies subscribed third parties and sends the publication data with metadata headers.

## Technical Approach

### High-Level Strategy

1. **New Module**: Create `libs/third-party-fulfilment` to handle all third-party push logic
2. **Integration Point**: Hook into existing publication creation flow (both manual upload and API ingestion)
3. **Configuration**: Use Azure Key Vault for third-party URL and certificate retrieval
4. **Retry Mechanism**: Implement 3-retry pattern for failed requests
5. **Audit Trail**: Track all push attempts in database

### Architecture Decisions

**Why a new module instead of extending notifications?**
- Third-party push is fundamentally different from email notifications (GOV.UK Notify)
- Different authentication mechanism (certificate-based)
- Different payload format (JSON/PDF with custom headers)
- Different retry and error handling requirements
- Cleaner separation of concerns

**Push vs Pull Pattern**
- Implementation uses push pattern as specified ("P&I push")
- Third parties receive publications via POST to their API
- Alternative subscription mechanism to user email notifications

## Implementation Details

### 1. Database Schema Changes

**New Table: `third_party_subscription`**
```prisma
model ThirdPartySubscription {
  id             String   @id @default(uuid()) @db.Uuid
  thirdPartyId   String   @map("third_party_id")
  locationId     Int      @map("location_id")
  listTypeId     Int?     @map("list_type_id")  // null = all list types for location
  isActive       Boolean  @default(true) @map("is_active")
  createdAt      DateTime @default(now()) @map("created_at")

  @@unique([thirdPartyId, locationId, listTypeId])
  @@index([thirdPartyId])
  @@index([locationId])
  @@map("third_party_subscription")
}
```

**New Table: `third_party_push_log`**
```prisma
model ThirdPartyPushLog {
  id             String    @id @default(uuid()) @db.Uuid
  subscriptionId String    @map("subscription_id") @db.Uuid
  artefactId     String    @map("artefact_id") @db.Uuid
  thirdPartyId   String    @map("third_party_id")
  status         String    // "Pending", "Sent", "Failed", "Deleted"
  httpStatus     Int?      @map("http_status")
  attemptCount   Int       @default(0) @map("attempt_count")
  errorMessage   String?   @map("error_message")
  createdAt      DateTime  @default(now()) @map("created_at")
  lastAttemptAt  DateTime? @map("last_attempt_at")
  sentAt         DateTime? @map("sent_at")

  @@index([artefactId])
  @@index([status])
  @@index([thirdPartyId])
  @@map("third_party_push_log")
}
```

**New Table: `third_party_config`**
```prisma
model ThirdPartyConfig {
  id              String    @id @default(uuid()) @db.Uuid
  thirdPartyId    String    @unique @map("third_party_id")
  name            String
  endpoint        String    // Retrieved from Key Vault
  certificateRef  String?   @map("certificate_ref")  // Key Vault reference
  isActive        Boolean   @default(true) @map("is_active")
  createdAt       DateTime  @default(now()) @map("created_at")
  updatedAt       DateTime  @updatedAt @map("updated_at")

  @@map("third_party_config")
}
```

### 2. Module Structure

```
libs/third-party-fulfilment/
├── package.json
├── tsconfig.json
├── prisma/
│   └── schema.prisma           # Third party tables
└── src/
    ├── config.ts               # Module configuration exports
    ├── index.ts                # Public API exports
    ├── subscription/
    │   ├── queries.ts          # DB queries for third-party subscriptions
    │   ├── queries.test.ts
    │   ├── service.ts          # Subscription management logic
    │   └── service.test.ts
    ├── push/
    │   ├── http-client.ts      # HTTP push with certificate auth
    │   ├── http-client.test.ts
    │   ├── retry.ts            # Retry logic (3 attempts)
    │   ├── retry.test.ts
    │   ├── headers.ts          # Build custom headers
    │   ├── headers.test.ts
    │   ├── service.ts          # Main push orchestration
    │   └── service.test.ts
    ├── certificate/
    │   ├── keyvault.ts         # Retrieve cert from Key Vault
    │   └── keyvault.test.ts
    └── audit/
        ├── queries.ts          # Push log queries
        ├── queries.test.ts
        ├── service.ts          # Audit logging
        └── service.test.ts
```

### 3. Integration Points

**A. Manual Upload Flow**
```typescript
// libs/admin-pages/src/pages/manual-upload-success/index.ts
// After successful upload, trigger third-party push

import { triggerThirdPartyPush } from "@hmcts/third-party-fulfilment";

// In manual upload confirmation handler
await triggerThirdPartyPush({
  artefactId,
  action: "CREATE"
}).catch(error => {
  console.error("Third-party push failed:", error);
  // Don't block user flow
});
```

**B. API Blob Ingestion Flow**
```typescript
// libs/api/src/blob-ingestion/repository/service.ts
// Already has notification trigger pattern, add third-party push

import { triggerThirdPartyPush } from "@hmcts/third-party-fulfilment";

// After artefact creation, alongside notification trigger
if (!noMatch) {
  triggerThirdPartyPush({
    artefactId,
    action: "CREATE"
  }).catch(error => {
    console.error("Third-party push failed:", error);
  });
}
```

**C. Manual Deletion Flow**
```typescript
// When publication is manually deleted
await triggerThirdPartyPush({
  artefactId,
  action: "DELETE"
});
```

### 4. Core Service Implementation

**Push Service (`libs/third-party-fulfilment/src/push/service.ts`)**
```typescript
export interface ThirdPartyPushRequest {
  artefactId: string;
  action: "CREATE" | "UPDATE" | "DELETE";
}

export async function triggerThirdPartyPush(request: ThirdPartyPushRequest): Promise<void> {
  // 1. Get artefact metadata
  const artefact = await getArtefactMetadata(request.artefactId);

  // 2. Find subscribed third parties for this location/list type
  const subscriptions = await findActiveThirdPartySubscriptions(
    artefact.locationId,
    artefact.listTypeId
  );

  if (subscriptions.length === 0) {
    console.log("No third-party subscriptions for this publication");
    return;
  }

  // 3. Push to each third party (fire-and-forget with audit)
  await Promise.allSettled(
    subscriptions.map(sub => pushToThirdParty(sub, artefact, request.action))
  );
}

async function pushToThirdParty(
  subscription: ThirdPartySubscription,
  artefact: ArtefactMetadata,
  action: "CREATE" | "UPDATE" | "DELETE"
): Promise<void> {
  // 1. Create audit log entry
  const logId = await createPushLog({
    subscriptionId: subscription.id,
    artefactId: artefact.artefactId,
    thirdPartyId: subscription.thirdPartyId,
    status: "Pending"
  });

  try {
    // 2. Get third-party config (endpoint, certificate)
    const config = await getThirdPartyConfig(subscription.thirdPartyId);

    // 3. Build headers
    const headers = buildPushHeaders(artefact);

    // 4. Build payload (empty for DELETE)
    const payload = action === "DELETE" ? null : await buildPushPayload(artefact);

    // 5. Execute push with retry
    const result = await pushWithRetry({
      url: config.endpoint,
      certificate: config.certificate,
      headers,
      payload,
      maxRetries: 3
    });

    // 6. Update audit log
    await updatePushLog(logId, {
      status: "Sent",
      httpStatus: result.statusCode,
      sentAt: new Date(),
      attemptCount: result.attemptCount
    });

  } catch (error) {
    await updatePushLog(logId, {
      status: "Failed",
      errorMessage: error.message,
      attemptCount: 3
    });
    throw error;
  }
}
```

**Headers Builder (`libs/third-party-fulfilment/src/push/headers.ts`)**
```typescript
export interface PushHeaders {
  "x-provenance": string;
  "x-source-artefact-id": string;
  "x-type": string;  // List type
  "x-list-type": string;
  "x-content-date": string;
  "x-sensitivity": string;
  "x-language": string;
  "x-display-from": string;
  "x-display-to": string;
  "x-location-name": string;
  "x-location-jurisdiction": string;
  "x-location-region": string;
  "Content-Type": string;
}

export async function buildPushHeaders(artefact: ArtefactMetadata): Promise<PushHeaders> {
  // Get location details for jurisdiction and region
  const location = await getLocationWithDetails(artefact.locationId);

  return {
    "x-provenance": artefact.provenance,
    "x-source-artefact-id": artefact.artefactId,
    "x-type": artefact.listType,
    "x-list-type": artefact.listType,
    "x-content-date": artefact.contentDate.toISOString(),
    "x-sensitivity": artefact.sensitivity,
    "x-language": artefact.language,
    "x-display-from": artefact.displayFrom.toISOString(),
    "x-display-to": artefact.displayTo.toISOString(),
    "x-location-name": location.name,
    "x-location-jurisdiction": location.jurisdiction,
    "x-location-region": location.region,
    "Content-Type": "application/json"
  };
}
```

**HTTP Client with Certificate Auth (`libs/third-party-fulfilment/src/push/http-client.ts`)**
```typescript
import https from "node:https";

export interface PushRequest {
  url: string;
  certificate: string;  // PEM format from Key Vault
  headers: Record<string, string>;
  payload: string | null;
}

export interface PushResponse {
  success: boolean;
  statusCode: number;
  error?: string;
}

export async function executePush(request: PushRequest): Promise<PushResponse> {
  return new Promise((resolve) => {
    const options = {
      method: "POST",
      headers: request.headers,
      cert: request.certificate,
      key: request.certificate  // Assuming cert includes key
    };

    const req = https.request(request.url, options, (res) => {
      let data = "";
      res.on("data", chunk => data += chunk);
      res.on("end", () => {
        const statusCode = res.statusCode || 500;
        const success = statusCode >= 200 && statusCode < 300;

        resolve({
          success,
          statusCode,
          error: success ? undefined : `HTTP ${statusCode}: ${data}`
        });
      });
    });

    req.on("error", (error) => {
      resolve({
        success: false,
        statusCode: 0,
        error: error.message
      });
    });

    if (request.payload) {
      req.write(request.payload);
    }

    req.end();
  });
}
```

**Retry Logic (`libs/third-party-fulfilment/src/push/retry.ts`)**
```typescript
export interface RetryConfig {
  maxRetries: number;
  initialDelayMs: number;
  backoffMultiplier: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelayMs: 1000,
  backoffMultiplier: 2
};

export async function pushWithRetry(
  request: PushRequest,
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): Promise<PushResponse & { attemptCount: number }> {
  let lastError: string | undefined;
  let attemptCount = 0;

  for (let attempt = 1; attempt <= config.maxRetries; attempt++) {
    attemptCount = attempt;

    const response = await executePush(request);

    if (response.success) {
      return { ...response, attemptCount };
    }

    lastError = response.error;

    // Don't retry on 4xx errors (except 429)
    if (response.statusCode >= 400 && response.statusCode < 500 && response.statusCode !== 429) {
      break;
    }

    // Don't delay after last attempt
    if (attempt < config.maxRetries) {
      const delayMs = config.initialDelayMs * Math.pow(config.backoffMultiplier, attempt - 1);
      await sleep(delayMs);
    }
  }

  return {
    success: false,
    statusCode: 0,
    error: lastError || "All retry attempts failed",
    attemptCount
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
```

**Key Vault Integration (`libs/third-party-fulfilment/src/certificate/keyvault.ts`)**
```typescript
import { getSecret } from "@hmcts/cloud-native-platform";

export interface ThirdPartyCredentials {
  endpoint: string;
  certificate: string;
}

export async function getThirdPartyCredentials(thirdPartyId: string): Promise<ThirdPartyCredentials> {
  // Key Vault secret names follow pattern: third-party-{id}-endpoint, third-party-{id}-cert
  const endpointKey = `third-party-${thirdPartyId}-endpoint`;
  const certKey = `third-party-${thirdPartyId}-cert`;

  const [endpoint, certificate] = await Promise.all([
    getSecret(endpointKey),
    getSecret(certKey)
  ]);

  if (!endpoint || !certificate) {
    throw new Error(`Third party credentials not found for ${thirdPartyId}`);
  }

  return { endpoint, certificate };
}
```

### 5. Configuration and Registration

**Prisma Schema Registration**
```typescript
// apps/postgres/src/schema-discovery.ts
import { prismaSchemas as thirdPartySchemas } from "@hmcts/third-party-fulfilment/config";

const schemaPaths = [
  // ... existing schemas
  thirdPartySchemas
];
```

**Module Configuration**
```typescript
// libs/third-party-fulfilment/src/config.ts
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const prismaSchemas = path.join(__dirname, "../prisma");
export const moduleRoot = __dirname;
```

**Root tsconfig.json**
```json
{
  "compilerOptions": {
    "paths": {
      "@hmcts/third-party-fulfilment": ["libs/third-party-fulfilment/src"]
    }
  }
}
```

## Error Handling & Edge Cases

### Error Scenarios

1. **Third-party endpoint unavailable**: Retry 3 times, log failure
2. **Certificate invalid/expired**: Fail immediately, log error
3. **Invalid artefact ID**: Skip push, log error
4. **No subscriptions found**: Silent success (expected case)
5. **Key Vault unavailable**: Fail push, log error
6. **Malformed location data**: Use fallback values or skip

### Validation Requirements

**Input Validation**
- Artefact must exist
- Third-party config must exist and be active
- Location metadata must be available
- Certificate must be valid PEM format

**Header Validation**
- All required headers present
- Dates in ISO 8601 format
- Provenance is valid enum value

### Edge Cases

1. **Duplicate push attempts**: Check audit log before pushing
2. **Concurrent uploads**: Each push is independent, race conditions acceptable
3. **Partial failures**: Log each failure independently, don't block others
4. **Large payloads**: No size limit specified, handle memory efficiently
5. **Manual deletion before push completes**: DELETE action will send empty body

## Acceptance Criteria Mapping

| Criterion | Implementation |
|-----------|----------------|
| System identifies Third Party User ID subscribed to publication | `findActiveThirdPartySubscriptions(locationId, listTypeId)` in subscription service |
| Retrieves publication metadata from artefact table | `getArtefactMetadata(artefactId)` with joins to location/list type tables |
| Sends file in JSON format to Third Party POST endpoint | `executePush()` with Content-Type: application/json |
| Uses third party authorization certificate | Certificate from Key Vault passed to HTTPS client |
| Issues acknowledgment receipt (HTTP status return) | `PushResponse` contains statusCode, logged in audit table |
| Notifies on upload/update/delete with correct status | Action parameter drives empty body for DELETE, normal payload for CREATE/UPDATE |
| Generates 200/201/202/204 for successful POST | Third-party API responsibility, our system logs whatever status received |
| Validation prevents send without trigger | Push only triggered from upload/ingestion flows, not independently |
| Differentiates new vs updated publication | Based on artefact creation (new) vs superseding (update) - future enhancement |
| Integration and unit tests | All services, queries, and utilities have co-located .test.ts files |

## Open Questions / CLARIFICATIONS NEEDED

1. **Third-party subscription management**: How are third-party subscriptions created? Is there an admin interface needed, or are these configured via database scripts?

2. **PDF generation**: Ticket mentions "PDF generated for that list" in headers. Current implementation only handles JSON. Should we:
   - Generate PDF from JSON and send both?
   - Send PDF URL reference?
   - Skip PDF for now (JSON only)?

3. **Certificate format**: Are certificates client certificates (mutual TLS) or just trust certificates? Implementation assumes client certificate in PEM format.

4. **"Updated publication" detection**: How do we differentiate between CREATE and UPDATE? Current artefact creation doesn't track if it supersedes another. Should we:
   - Check for existing artefact with same location/listType/contentDate?
   - Add superseded_by field to artefact table?
   - Always send CREATE action?

5. **Third-party ID format**: What format will third-party IDs take? UUIDs, slugs (e.g., "solicitors-portal"), or numeric IDs?

6. **Multiple subscriptions per third party**: Can a single third party subscribe to multiple locations/list types, or is it one subscription = all publications?

7. **HTTP status code expectations**: Should 202 (Accepted) be treated as success even though processing isn't complete? Should we track async completion?

8. **Retry backoff strategy**: Is exponential backoff acceptable (1s, 2s, 4s) or should all retries be immediate?

9. **Location reference data**: Do locations already have jurisdiction and region fields, or do we need to join through location_sub_jurisdiction and location_region tables?

10. **Manual deletion scope**: Does this apply to all publications or only those uploaded manually? Should API-ingested publications also support deletion push?
