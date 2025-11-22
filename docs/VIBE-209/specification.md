# VIBE-209: Blob Ingestion API - Technical Specification

## Executive Summary

This specification details the implementation of a RESTful API endpoint for automated ingestion of JSON blobs from external source systems (XHIBIT, LIBRA, SJP) into the CaTH platform. The endpoint will validate, process, and publish hearing lists with OAuth 2.0 authentication using Azure AD app roles.

## Architecture Overview

### System Context

```
┌─────────────────────┐          ┌─────────────────────┐
│  Source Systems     │          │   Azure AD          │
│  - XHIBIT          │          │   (OAuth 2.0)       │
│  - LIBRA           │◄────────►│                     │
│  - SJP             │  Auth    │   App Role:         │
│                    │          │   api.publisher.user│
└─────────┬───────────┘          └─────────────────────┘
          │
          │ POST /api/v1/publication
          │ Bearer Token
          │ JSON Payload
          │
          ▼
┌─────────────────────────────────────────────────────┐
│              CaTH API Service                       │
│                                                     │
│  ┌──────────────────────────────────────────────┐ │
│  │  OAuth Middleware                            │ │
│  │  - Validate Bearer Token                     │ │
│  │  - Verify app role: api.publisher.user       │ │
│  └────────────────┬─────────────────────────────┘ │
│                   │                                 │
│  ┌────────────────▼─────────────────────────────┐ │
│  │  Request Validation                          │ │
│  │  - JSON schema validation                    │ │
│  │  - Required fields check                     │ │
│  │  - Size limit check                          │ │
│  └────────────────┬─────────────────────────────┘ │
│                   │                                 │
│  ┌────────────────▼─────────────────────────────┐ │
│  │  Location Lookup Service                     │ │
│  │  - Query location master data                │ │
│  │  - Determine no_match flag                   │ │
│  └────────────────┬─────────────────────────────┘ │
│                   │                                 │
│  ┌────────────────▼─────────────────────────────┐ │
│  │  Publication Processing                      │ │
│  │  - Reuse manual upload logic                 │ │
│  │  - Create/update artefact                    │ │
│  │  - Store blob in storage                     │ │
│  └────────────────┬─────────────────────────────┘ │
│                   │                                 │
│  ┌────────────────▼─────────────────────────────┐ │
│  │  Audit Logging                               │ │
│  │  - Log ingestion attempt                     │ │
│  │  - Store validation results                  │ │
│  │  - Track no_match incidents                  │ │
│  └──────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────┐
│  PostgreSQL         │
│  - artefact table   │
│  - audit_log table  │
│  - location data    │
└─────────────────────┘
```

## Database Schema Changes

### New Column in `artefact` Table

```prisma
model Artefact {
  artefactId        String   @id @default(uuid()) @map("artefact_id") @db.Uuid
  locationId        String   @map("location_id")
  listTypeId        Int      @map("list_type_id")
  contentDate       DateTime @map("content_date") @db.Date
  sensitivity       String
  language          String
  displayFrom       DateTime @map("display_from")
  displayTo         DateTime @map("display_to")
  lastReceivedDate  DateTime @default(now()) @map("last_received_date")
  isFlatFile        Boolean  @map("is_flat_file")
  provenance        String
  supersededCount   Int      @default(0) @map("superseded_count")
  noMatch           Boolean  @default(false) @map("no_match")  // NEW FIELD

  @@map("artefact")
}
```

**Migration Strategy:**
- Add column with default value `false` to support existing records
- Non-nullable field for data integrity
- Indexed for efficient querying of no_match publications

### New Audit Log Table

```prisma
model PublicationAuditLog {
  id                String   @id @default(uuid()) @map("id") @db.Uuid
  timestamp         DateTime @default(now()) @map("timestamp")
  sourceSystem      String   @map("source_system")
  locationId        String?  @map("location_id")
  listTypeId        Int?     @map("list_type_id")
  status            String   @map("status")  // SUCCESS, VALIDATION_ERROR, LOCATION_NOT_FOUND, SYSTEM_ERROR
  errorMessage      String?  @map("error_message") @db.Text
  requestPayload    String?  @map("request_payload") @db.Text
  artefactId        String?  @map("artefact_id") @db.Uuid
  noMatch           Boolean? @map("no_match")
  processingTimeMs  Int?     @map("processing_time_ms")

  @@index([timestamp])
  @@index([sourceSystem])
  @@index([status])
  @@index([locationId])
  @@map("publication_audit_log")
}
```

**Retention Policy:**
- Minimum 90 days retention as per requirements
- Consider partitioning by month for performance
- Implement cleanup job for records older than retention period

## API Specification

### Endpoint Details

**URL:** `POST /api/v1/publication`

**Authentication:** OAuth 2.0 Bearer Token (Azure AD)

**Required App Role:** `api.publisher.user`

**Content-Type:** `application/json`

**Rate Limiting:** 100 requests per minute per source system

### Request Schema

```typescript
interface PublicationRequest {
  // Core identification
  locationId: string;           // Maps to Court ID in location master data
  listTypeId: number;           // Type of hearing list
  provenance: string;           // Source system: XHIBIT, LIBRA, SJP

  // Content metadata
  contentDate: string;          // ISO 8601 date (YYYY-MM-DD)
  language: string;             // ENGLISH or WELSH
  sensitivity: string;          // PUBLIC, PRIVATE, CLASSIFIED

  // Display window
  displayFrom: string;          // ISO 8601 datetime
  displayTo: string;            // ISO 8601 datetime

  // Blob content
  content: object;              // JSON blob - validated against list type schema
}
```

**Example Request:**

```json
{
  "locationId": "341",
  "listTypeId": 1,
  "provenance": "XHIBIT",
  "contentDate": "2025-01-15",
  "language": "ENGLISH",
  "sensitivity": "PUBLIC",
  "displayFrom": "2025-01-15T00:00:00Z",
  "displayTo": "2025-01-16T23:59:59Z",
  "content": {
    "courtLists": [
      {
        "courtHouse": {
          "courtHouseName": "Manchester Crown Court",
          "courtHouseCode": "341"
        },
        "courtRoom": "Court 1",
        "session": "Morning",
        "sittings": [
          {
            "sittingStart": "10:00",
            "sittingEnd": "13:00",
            "judiciary": [
              {
                "johTitle": "HHJ",
                "johNameSurname": "Smith"
              }
            ],
            "hearings": [
              {
                "hearingSequence": 1,
                "defendant": "John Doe",
                "offence": "Theft"
              }
            ]
          }
        ]
      }
    ]
  }
}
```

### Response Schema

#### Success Response (200 OK)

```typescript
interface PublicationResponse {
  success: true;
  artefactId: string;
  message: string;
  noMatch: boolean;
  locationId: string;
}
```

**Example:**
```json
{
  "success": true,
  "artefactId": "550e8400-e29b-41d4-a716-446655440000",
  "message": "Publication ingested and processed successfully",
  "noMatch": false,
  "locationId": "341"
}
```

#### Error Responses

**400 Bad Request - Validation Error:**
```json
{
  "success": false,
  "error": "VALIDATION_ERROR",
  "message": "Invalid JSON structure",
  "details": [
    {
      "field": "content.courtLists",
      "message": "Required field is missing"
    }
  ]
}
```

**401 Unauthorized - Authentication Failed:**
```json
{
  "success": false,
  "error": "UNAUTHORIZED",
  "message": "Invalid or missing Bearer token"
}
```

**403 Forbidden - Insufficient Permissions:**
```json
{
  "success": false,
  "error": "FORBIDDEN",
  "message": "Insufficient permissions. Required role: api.publisher.user"
}
```

**413 Payload Too Large:**
```json
{
  "success": false,
  "error": "PAYLOAD_TOO_LARGE",
  "message": "Request payload exceeds maximum size of 10MB"
}
```

**500 Internal Server Error:**
```json
{
  "success": false,
  "error": "INTERNAL_ERROR",
  "message": "An unexpected error occurred while processing the request"
}
```

## Authentication & Authorization

### OAuth 2.0 Flow

The endpoint will use the **Client Credentials Flow** (machine-to-machine):

```
1. Source System requests token from Azure AD
   POST https://login.microsoftonline.com/{tenant}/oauth2/v2.0/token
   Body:
     - client_id: {source_system_client_id}
     - client_secret: {source_system_client_secret}
     - scope: api://{cath_api_client_id}/.default
     - grant_type: client_credentials

2. Azure AD validates credentials and app role assignment

3. Azure AD returns access token with app role claim

4. Source System calls CaTH API with Bearer token
   Authorization: Bearer {access_token}

5. CaTH API validates token:
   - Verify signature using Azure AD public keys
   - Check token expiration
   - Validate audience claim
   - Verify app role: api.publisher.user
```

### Implementation using passport-azure-ad

```typescript
// libs/api-auth/src/bearer-strategy.ts
import { BearerStrategy } from "passport-azure-ad";

const bearerOptions = {
  identityMetadata: process.env.OAUTH_IDENTITY_METADATA,
  clientID: process.env.OAUTH_CLIENT_ID,
  validateIssuer: true,
  issuer: process.env.OAUTH_ISSUER,
  passReqToCallback: false,
  audience: process.env.OAUTH_AUDIENCE,
  loggingLevel: "warn"
};

export function createBearerStrategy() {
  return new BearerStrategy(
    bearerOptions,
    (token, done) => {
      // Extract app roles from token
      const roles = token.roles || [];

      // Verify required app role
      if (!roles.includes("api.publisher.user")) {
        return done(null, false, { message: "Insufficient permissions" });
      }

      // Return validated token claims
      return done(null, {
        id: token.oid || token.sub,
        appId: token.appid,
        roles: roles
      });
    }
  );
}
```

### Middleware Implementation

```typescript
// libs/api-auth/src/require-api-role.ts
import type { Request, Response, NextFunction, RequestHandler } from "express";
import passport from "passport";

export function requireApiRole(role: string): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    passport.authenticate(
      "oauth-bearer",
      { session: false },
      (err: any, user: any, info: any) => {
        if (err) {
          return res.status(500).json({
            success: false,
            error: "INTERNAL_ERROR",
            message: "Authentication error"
          });
        }

        if (!user) {
          return res.status(401).json({
            success: false,
            error: "UNAUTHORIZED",
            message: info?.message || "Invalid token"
          });
        }

        // Check for required role
        if (!user.roles?.includes(role)) {
          return res.status(403).json({
            success: false,
            error: "FORBIDDEN",
            message: `Required role: ${role}`
          });
        }

        req.user = user;
        next();
      }
    )(req, res, next);
  };
}
```

## Validation Logic

### Multi-Layer Validation Strategy

```
Request → Size Check → Schema Validation → Business Rules → Location Check → Processing
```

### 1. Size Validation

```typescript
// Maximum payload size: 10MB
app.use("/api/v1/publication", express.json({ limit: "10mb" }));
```

### 2. JSON Schema Validation

Reuse existing validation infrastructure from `@hmcts/publication`:

```typescript
import { validateListTypeJson } from "@hmcts/list-types-common";

async function validatePublicationSchema(
  listTypeId: number,
  content: unknown
): Promise<ValidationResult> {
  return validateListTypeJson(
    listTypeId.toString(),
    content,
    mockListTypes
  );
}
```

### 3. Business Rules Validation

```typescript
interface ValidationError {
  field: string;
  message: string;
}

function validateBusinessRules(
  request: PublicationRequest
): ValidationError[] {
  const errors: ValidationError[] = [];

  // Required fields
  if (!request.locationId) {
    errors.push({ field: "locationId", message: "Location ID is required" });
  }

  if (!request.listTypeId) {
    errors.push({ field: "listTypeId", message: "List type ID is required" });
  }

  // Validate provenance
  const validProvenances = ["XHIBIT", "LIBRA", "SJP"];
  if (!validProvenances.includes(request.provenance)) {
    errors.push({
      field: "provenance",
      message: `Provenance must be one of: ${validProvenances.join(", ")}`
    });
  }

  // Validate language
  const validLanguages = ["ENGLISH", "WELSH"];
  if (!validLanguages.includes(request.language)) {
    errors.push({
      field: "language",
      message: `Language must be one of: ${validLanguages.join(", ")}`
    });
  }

  // Validate sensitivity
  const validSensitivities = ["PUBLIC", "PRIVATE", "CLASSIFIED"];
  if (!validSensitivities.includes(request.sensitivity)) {
    errors.push({
      field: "sensitivity",
      message: `Sensitivity must be one of: ${validSensitivities.join(", ")}`
    });
  }

  // Validate date formats
  if (!isValidDate(request.contentDate)) {
    errors.push({
      field: "contentDate",
      message: "Invalid date format. Expected: YYYY-MM-DD"
    });
  }

  // Validate display window
  const displayFrom = new Date(request.displayFrom);
  const displayTo = new Date(request.displayTo);

  if (displayTo <= displayFrom) {
    errors.push({
      field: "displayTo",
      message: "Display To must be after Display From"
    });
  }

  return errors;
}
```

### 4. Location Lookup

```typescript
import { getLocationById } from "@hmcts/location";

async function validateLocation(
  locationId: string
): Promise<{ exists: boolean; location?: Location }> {
  const locationIdNum = Number.parseInt(locationId, 10);

  if (Number.isNaN(locationIdNum)) {
    return { exists: false };
  }

  const location = getLocationById(locationIdNum);

  return {
    exists: !!location,
    location
  };
}
```

## Processing Logic

### Flow Diagram

```
┌─────────────────────────┐
│ Validate Request        │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│ Lookup Location         │
│ locationExists?         │
└───────────┬─────────────┘
            │
     ┌──────┴──────┐
     │ Yes    No   │
     ▼             ▼
┌─────────┐   ┌─────────┐
│noMatch  │   │noMatch  │
│= false  │   │= true   │
└────┬────┘   └────┬────┘
     │             │
     └──────┬──────┘
            │
            ▼
┌─────────────────────────┐
│ Create/Update Artefact  │
│ - Reuse existing logic  │
│ - Set noMatch flag      │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│ Store Blob Content      │
│ (Redis or Blob Storage) │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│ Create Audit Log Entry  │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│ Return Success Response │
└─────────────────────────┘
```

### Service Implementation

```typescript
// libs/publication/src/api-ingestion/service.ts

interface IngestionResult {
  success: boolean;
  artefactId?: string;
  noMatch: boolean;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

export async function ingestPublication(
  request: PublicationRequest,
  sourceSystem: string
): Promise<IngestionResult> {
  const startTime = Date.now();

  try {
    // Validate business rules
    const businessErrors = validateBusinessRules(request);
    if (businessErrors.length > 0) {
      await logAuditEvent({
        status: "VALIDATION_ERROR",
        sourceSystem,
        errorMessage: JSON.stringify(businessErrors),
        requestPayload: JSON.stringify(request)
      });

      return {
        success: false,
        noMatch: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Request validation failed",
          details: businessErrors
        }
      };
    }

    // Validate JSON schema
    const schemaValidation = await validatePublicationSchema(
      request.listTypeId,
      request.content
    );

    if (!schemaValidation.isValid) {
      await logAuditEvent({
        status: "VALIDATION_ERROR",
        sourceSystem,
        locationId: request.locationId,
        listTypeId: request.listTypeId,
        errorMessage: `Schema validation failed: ${JSON.stringify(schemaValidation.errors)}`,
        requestPayload: JSON.stringify(request)
      });

      return {
        success: false,
        noMatch: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "JSON schema validation failed",
          details: schemaValidation.errors
        }
      };
    }

    // Check location exists
    const locationCheck = await validateLocation(request.locationId);
    const noMatch = !locationCheck.exists;

    // Create artefact (reusing existing logic)
    const artefactId = await createArtefact({
      artefactId: randomUUID(),
      locationId: request.locationId,
      listTypeId: request.listTypeId,
      contentDate: new Date(request.contentDate),
      sensitivity: request.sensitivity,
      language: request.language,
      displayFrom: new Date(request.displayFrom),
      displayTo: new Date(request.displayTo),
      isFlatFile: false,
      provenance: request.provenance,
      noMatch
    });

    // Store blob content
    await storePublicationBlob(artefactId, request.content);

    // Log successful ingestion
    await logAuditEvent({
      status: "SUCCESS",
      sourceSystem,
      locationId: request.locationId,
      listTypeId: request.listTypeId,
      artefactId,
      noMatch,
      processingTimeMs: Date.now() - startTime
    });

    return {
      success: true,
      artefactId,
      noMatch
    };

  } catch (error) {
    // Log system error
    await logAuditEvent({
      status: "SYSTEM_ERROR",
      sourceSystem,
      locationId: request.locationId,
      listTypeId: request.listTypeId,
      errorMessage: error instanceof Error ? error.message : "Unknown error",
      processingTimeMs: Date.now() - startTime
    });

    return {
      success: false,
      noMatch: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "An unexpected error occurred"
      }
    };
  }
}
```

## Audit Logging

### Logging Strategy

All publication ingestion attempts must be logged with:

1. **Timestamp** - When the request was received
2. **Source System** - Extracted from OAuth token (appid claim)
3. **Location ID** - Court/venue identifier
4. **List Type ID** - Type of hearing list
5. **Status** - SUCCESS, VALIDATION_ERROR, LOCATION_NOT_FOUND, SYSTEM_ERROR
6. **Error Message** - Detailed error information (if applicable)
7. **Request Payload** - Full JSON payload (for debugging)
8. **Artefact ID** - Generated artefact ID (if successful)
9. **No Match Flag** - Whether location was found
10. **Processing Time** - Time taken to process request (milliseconds)

### Implementation

```typescript
// libs/publication/src/api-ingestion/audit-logging.ts

interface AuditLogEntry {
  timestamp?: Date;
  sourceSystem: string;
  locationId?: string;
  listTypeId?: number;
  status: "SUCCESS" | "VALIDATION_ERROR" | "LOCATION_NOT_FOUND" | "SYSTEM_ERROR";
  errorMessage?: string;
  requestPayload?: string;
  artefactId?: string;
  noMatch?: boolean;
  processingTimeMs?: number;
}

export async function logAuditEvent(entry: AuditLogEntry): Promise<void> {
  await prisma.publicationAuditLog.create({
    data: {
      id: randomUUID(),
      timestamp: entry.timestamp || new Date(),
      sourceSystem: entry.sourceSystem,
      locationId: entry.locationId,
      listTypeId: entry.listTypeId,
      status: entry.status,
      errorMessage: entry.errorMessage,
      requestPayload: entry.requestPayload,
      artefactId: entry.artefactId,
      noMatch: entry.noMatch,
      processingTimeMs: entry.processingTimeMs
    }
  });
}

// Query functions for audit log
export async function getAuditLogsBySourceSystem(
  sourceSystem: string,
  limit = 100
) {
  return prisma.publicationAuditLog.findMany({
    where: { sourceSystem },
    orderBy: { timestamp: "desc" },
    take: limit
  });
}

export async function getFailedIngestions(daysBack = 7) {
  const since = new Date();
  since.setDate(since.getDate() - daysBack);

  return prisma.publicationAuditLog.findMany({
    where: {
      status: { not: "SUCCESS" },
      timestamp: { gte: since }
    },
    orderBy: { timestamp: "desc" }
  });
}
```

## Error Handling & Alerting

### Error Categories

1. **Client Errors (4xx)** - Source system issues
   - Invalid JSON
   - Missing required fields
   - Invalid authentication
   - No action required from CaTH admins

2. **Server Errors (5xx)** - CaTH system issues
   - Database connection failures
   - Schema validation service down
   - Unexpected exceptions
   - Requires admin intervention

### Alerting Strategy

**Alert on:**
- More than 10 failed ingestions from same source system in 5 minutes
- Any 500 errors
- Database connection failures
- Location not found (no_match) for new locations

**Alert Channels:**
- Application Insights alerts
- Email to admin team
- Slack notification (if configured)

### Implementation

```typescript
// libs/publication/src/api-ingestion/alerting.ts

const ERROR_THRESHOLD = 10;
const TIME_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

export async function checkErrorThreshold(
  sourceSystem: string
): Promise<boolean> {
  const since = new Date(Date.now() - TIME_WINDOW_MS);

  const errorCount = await prisma.publicationAuditLog.count({
    where: {
      sourceSystem,
      timestamp: { gte: since },
      status: { not: "SUCCESS" }
    }
  });

  if (errorCount >= ERROR_THRESHOLD) {
    await sendAlert({
      severity: "HIGH",
      message: `${sourceSystem} has ${errorCount} failed ingestion attempts in the last 5 minutes`,
      sourceSystem,
      errorCount
    });
    return true;
  }

  return false;
}

export async function alertOnNoMatch(
  locationId: string,
  sourceSystem: string
): Promise<void> {
  await sendAlert({
    severity: "MEDIUM",
    message: `Location ${locationId} not found in master data. Publication created with no_match=true`,
    sourceSystem,
    locationId
  });
}
```

## Module Structure

Following HMCTS monorepo conventions:

```
libs/
└── api-publication/
    ├── package.json
    ├── tsconfig.json
    ├── prisma/
    │   └── schema.prisma          # Audit log table schema
    └── src/
        ├── config.ts              # Module configuration exports
        ├── index.ts               # Business logic exports
        ├── routes/
        │   └── v1/
        │       └── publication.ts # POST /api/v1/publication
        ├── ingestion/
        │   ├── service.ts         # Main ingestion logic
        │   ├── validation.ts      # Business rules validation
        │   └── blob-storage.ts    # Blob content storage
        ├── audit/
        │   ├── logging.ts         # Audit log functions
        │   ├── queries.ts         # Audit log queries
        │   └── alerting.ts        # Alert generation
        └── models.ts              # TypeScript interfaces

libs/
└── api-auth/
    ├── package.json
    ├── tsconfig.json
    └── src/
        ├── index.ts
        ├── bearer-strategy.ts     # OAuth bearer token strategy
        └── require-api-role.ts    # Role-based middleware
```

## Testing Strategy

### Unit Tests

```typescript
// libs/api-publication/src/ingestion/validation.test.ts
describe("validateBusinessRules", () => {
  it("should validate required fields", () => {
    const request = {} as PublicationRequest;
    const errors = validateBusinessRules(request);
    expect(errors).toContainEqual({
      field: "locationId",
      message: "Location ID is required"
    });
  });

  it("should validate provenance values", () => {
    const request = {
      provenance: "INVALID"
    } as PublicationRequest;
    const errors = validateBusinessRules(request);
    expect(errors.length).toBeGreaterThan(0);
  });

  it("should validate display window", () => {
    const request = {
      displayFrom: "2025-01-15T10:00:00Z",
      displayTo: "2025-01-15T09:00:00Z"
    } as PublicationRequest;
    const errors = validateBusinessRules(request);
    expect(errors).toContainEqual({
      field: "displayTo",
      message: "Display To must be after Display From"
    });
  });
});
```

### Integration Tests

```typescript
// libs/api-publication/src/routes/v1/publication.test.ts
describe("POST /api/v1/publication", () => {
  it("should require authentication", async () => {
    const response = await request(app)
      .post("/api/v1/publication")
      .send(validPayload);

    expect(response.status).toBe(401);
  });

  it("should require api.publisher.user role", async () => {
    const token = generateToken({ roles: [] });
    const response = await request(app)
      .post("/api/v1/publication")
      .set("Authorization", `Bearer ${token}`)
      .send(validPayload);

    expect(response.status).toBe(403);
  });

  it("should ingest valid publication", async () => {
    const token = generateToken({ roles: ["api.publisher.user"] });
    const response = await request(app)
      .post("/api/v1/publication")
      .set("Authorization", `Bearer ${token}`)
      .send(validPayload);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.artefactId).toBeDefined();
  });

  it("should set no_match when location not found", async () => {
    const token = generateToken({ roles: ["api.publisher.user"] });
    const payload = { ...validPayload, locationId: "999999" };
    const response = await request(app)
      .post("/api/v1/publication")
      .set("Authorization", `Bearer ${token}`)
      .send(payload);

    expect(response.status).toBe(200);
    expect(response.body.noMatch).toBe(true);
  });
});
```

### E2E Tests

```typescript
// e2e-tests/tests/api-publication.spec.ts
test("complete publication ingestion flow", async ({ request }) => {
  // Get OAuth token
  const token = await getApiToken();

  // Submit publication
  const response = await request.post("/api/v1/publication", {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    data: validPayload
  });

  expect(response.status()).toBe(200);
  const body = await response.json();
  expect(body.success).toBe(true);

  // Verify artefact created
  const artefact = await getArtefactById(body.artefactId);
  expect(artefact).toBeDefined();
  expect(artefact.noMatch).toBe(false);

  // Verify audit log created
  const auditLog = await getAuditLogByArtefactId(body.artefactId);
  expect(auditLog.status).toBe("SUCCESS");
});
```

## Security Considerations

1. **Input Validation** - Multiple layers of validation prevent injection attacks
2. **Rate Limiting** - Prevent DoS attacks
3. **Token Validation** - Verify all claims including signature, expiration, audience
4. **Audit Logging** - Complete audit trail for compliance
5. **Sensitive Data** - Do not log sensitive hearing details in plain text
6. **HTTPS Only** - Enforce TLS for all API traffic
7. **Secret Management** - OAuth credentials stored in Azure Key Vault

## Performance Considerations

1. **Response Time Target** - < 500ms for valid requests
2. **Throughput Target** - 1000 requests per minute
3. **Database Indexing** - Index audit log by timestamp, sourceSystem, status
4. **Connection Pooling** - Reuse database connections
5. **Async Processing** - Consider queue-based processing for large volumes

## Monitoring & Observability

### Metrics to Track

1. **Request Rate** - Requests per minute by source system
2. **Success Rate** - Percentage of successful ingestions
3. **Response Time** - P50, P95, P99 latencies
4. **Error Rate** - Errors per minute by type
5. **No Match Rate** - Percentage of publications with no_match=true
6. **Validation Failures** - Most common validation errors

### Application Insights Integration

```typescript
import { defaultClient } from "applicationinsights";

// Track custom metrics
defaultClient.trackMetric({
  name: "PublicationIngestion",
  value: 1,
  properties: {
    sourceSystem,
    success: result.success,
    noMatch: result.noMatch
  }
});

// Track dependencies
defaultClient.trackDependency({
  target: "LocationService",
  name: "validateLocation",
  data: locationId,
  duration: timeTaken,
  success: true
});
```

## Deployment Considerations

1. **Feature Flag** - Deploy behind feature flag for gradual rollout
2. **Backward Compatibility** - Existing artefacts have noMatch=false by default
3. **Data Migration** - No migration needed for existing records
4. **Rollback Plan** - Remove feature flag if issues detected
5. **Documentation** - Update API documentation and share with source systems

## Open Questions & Decisions

### Resolved
- Maximum blob size: 10MB
- Retention period: 90 days minimum
- Authentication: OAuth 2.0 with app roles
- Location not found: Still ingest with no_match=true

### Pending
- [ ] Should retry logic be automatic or manual?
- [ ] Notification mechanism for no_match incidents (email/webhook)?
- [ ] Schema versioning strategy (v1, v2)?
- [ ] Cleanup job schedule for old audit logs?
- [ ] Should we support batch ingestion in future?
