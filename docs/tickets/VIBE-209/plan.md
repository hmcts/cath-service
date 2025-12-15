# VIBE-209: Technical Implementation Plan - Blob Ingestion in CaTH

## Overview
This document provides a detailed technical implementation plan for creating an API endpoint to ingest and validate JSON blobs from source systems for auto-publishing hearing lists in CaTH.

## Architecture Summary

The implementation follows the monorepo architecture pattern:
- **New Library**: `libs/blob-ingestion` - Core validation and processing logic
- **API Endpoint**: `/api/v1/publication` (POST) - Exposed via `apps/api`
- **Database Changes**: Add `no_match` column to `artefact` table
- **Reuse**: Leverage existing validation, publication, and location lookup logic

## 1. Database Schema Changes

### 1.1 Prisma Schema Update
**Location**: `/home/runner/work/cath-service/cath-service/apps/postgres/prisma/schema.prisma`

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

### 1.2 Migration Strategy
```bash
# Command to run after schema update
yarn db:migrate:dev
```

**Migration file** (auto-generated):
```sql
-- Add no_match column with default value false
ALTER TABLE "artefact" ADD COLUMN "no_match" BOOLEAN NOT NULL DEFAULT false;
```

### 1.3 Update Existing Queries
**Location**: `/home/runner/work/cath-service/cath-service/libs/publication/src/repository/queries.ts`

Update `createArtefact` function to handle `noMatch` field:
```typescript
export async function createArtefact(data: Artefact): Promise<string> {
  const existing = await prisma.artefact.findFirst({
    where: {
      locationId: data.locationId,
      listTypeId: data.listTypeId,
      contentDate: data.contentDate,
      language: data.language
    }
  });

  if (existing) {
    await prisma.artefact.update({
      where: { artefactId: existing.artefactId },
      data: {
        sensitivity: data.sensitivity,
        displayFrom: data.displayFrom,
        displayTo: data.displayTo,
        isFlatFile: data.isFlatFile,
        provenance: data.provenance,
        noMatch: data.noMatch,  // NEW FIELD
        lastReceivedDate: new Date(),
        supersededCount: { increment: 1 }
      }
    });
    return existing.artefactId;
  }

  const artefact = await prisma.artefact.create({
    data: {
      artefactId: data.artefactId,
      locationId: data.locationId,
      listTypeId: data.listTypeId,
      contentDate: data.contentDate,
      sensitivity: data.sensitivity,
      language: data.language,
      displayFrom: data.displayFrom,
      displayTo: data.displayTo,
      isFlatFile: data.isFlatFile,
      provenance: data.provenance,
      noMatch: data.noMatch  // NEW FIELD
    }
  });
  return artefact.artefactId;
}
```

Update model type:
```typescript
// libs/publication/src/repository/model.ts
export interface Artefact {
  artefactId: string;
  locationId: string;
  listTypeId: number;
  contentDate: Date;
  sensitivity: string;
  language: string;
  displayFrom: Date;
  displayTo: Date;
  isFlatFile: boolean;
  provenance: string;
  noMatch: boolean;  // NEW FIELD
}
```

## 2. New Module: libs/blob-ingestion

### 2.1 Module Structure
```
libs/blob-ingestion/
├── package.json
├── tsconfig.json
├── src/
│   ├── config.ts                    # Module configuration (routes export)
│   ├── index.ts                     # Business logic exports
│   ├── routes/
│   │   └── v1/
│   │       └── publication.ts       # POST /api/v1/publication
│   ├── blob-ingestion/
│   │   ├── model.ts                 # Request/response types
│   │   ├── validation.ts            # JSON schema validation
│   │   ├── service.ts               # Business logic
│   │   ├── queries.ts               # Audit logging queries
│   │   ├── validation.test.ts
│   │   ├── service.test.ts
│   │   └── queries.test.ts
│   └── middleware/
│       ├── oauth-middleware.ts      # OAuth 2.0 authentication
│       └── oauth-middleware.test.ts
```

### 2.2 Package Configuration
**File**: `libs/blob-ingestion/package.json`
```json
{
  "name": "@hmcts/blob-ingestion",
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
  "peerDependencies": {
    "express": "^5.1.0"
  }
}
```

**File**: `libs/blob-ingestion/tsconfig.json`
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
  "exclude": ["**/*.test.ts", "dist", "node_modules"]
}
```

### 2.3 Module Configuration Export
**File**: `libs/blob-ingestion/src/config.ts`
```typescript
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const apiRoutes = { path: path.join(__dirname, "routes") };
```

**File**: `libs/blob-ingestion/src/index.ts`
```typescript
// Business logic exports
export * from "./blob-ingestion/service.js";
export * from "./blob-ingestion/validation.js";
export * from "./blob-ingestion/model.js";
export { authenticateApi } from "./middleware/oauth-middleware.js";
```

## 3. API Endpoint Implementation

### 3.1 Request/Response Models
**File**: `libs/blob-ingestion/src/blob-ingestion/model.ts`
```typescript
export interface BlobIngestionRequest {
  court_id: string;              // Location ID from master reference data
  provenance: string;            // Source system identifier (e.g., "XHIBIT", "LIBRA", "SJP")
  publication_date: string;      // ISO 8601 date string
  list_type: string;             // List type identifier
  sensitivity: string;           // "PUBLIC" | "PRIVATE" | "CLASSIFIED"
  language: string;              // "ENGLISH" | "WELSH" | "BILINGUAL"
  display_from: string;          // ISO 8601 datetime string
  display_to: string;            // ISO 8601 datetime string
  hearing_list: unknown;         // JSON object matching list type schema
}

export interface BlobIngestionResponse {
  success: boolean;
  artefact_id?: string;
  no_match?: boolean;
  message: string;
}

export interface ValidationError {
  field: string;
  message: string;
}

export interface BlobValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  locationExists: boolean;
}

export interface IngestionLog {
  id: string;
  timestamp: Date;
  sourceSystem: string;
  courtId: string;
  status: "SUCCESS" | "VALIDATION_ERROR" | "SYSTEM_ERROR";
  errorMessage?: string;
  artefactId?: string;
}

// Extend session for tracking
declare module "express-session" {
  interface SessionData {
    apiIngestionAttempts?: number;
    lastApiIngestionError?: Date;
  }
}
```

### 3.2 Validation Logic
**File**: `libs/blob-ingestion/src/blob-ingestion/validation.ts`
```typescript
import { validateListTypeJson } from "@hmcts/list-types-common";
import { getLocationById } from "@hmcts/location";
import { Language, Sensitivity } from "@hmcts/publication";
import type { BlobIngestionRequest, BlobValidationResult, ValidationError } from "./model.js";

const MAX_BLOB_SIZE = 10 * 1024 * 1024; // 10MB default
const ALLOWED_PROVENANCES = ["XHIBIT", "LIBRA", "SJP", "MANUAL_UPLOAD"];

export async function validateBlobRequest(
  request: BlobIngestionRequest,
  rawBodySize: number
): Promise<BlobValidationResult> {
  const errors: ValidationError[] = [];

  // Size validation
  if (rawBodySize > MAX_BLOB_SIZE) {
    errors.push({
      field: "body",
      message: `Payload too large. Maximum size is ${MAX_BLOB_SIZE / 1024 / 1024}MB`
    });
  }

  // Required fields
  if (!request.court_id) {
    errors.push({ field: "court_id", message: "court_id is required" });
  }

  if (!request.provenance) {
    errors.push({ field: "provenance", message: "provenance is required" });
  } else if (!ALLOWED_PROVENANCES.includes(request.provenance)) {
    errors.push({
      field: "provenance",
      message: `Invalid provenance. Allowed values: ${ALLOWED_PROVENANCES.join(", ")}`
    });
  }

  if (!request.publication_date) {
    errors.push({ field: "publication_date", message: "publication_date is required" });
  } else if (!isValidISODate(request.publication_date)) {
    errors.push({
      field: "publication_date",
      message: "publication_date must be a valid ISO 8601 date"
    });
  }

  if (!request.list_type) {
    errors.push({ field: "list_type", message: "list_type is required" });
  }

  if (!request.sensitivity) {
    errors.push({ field: "sensitivity", message: "sensitivity is required" });
  } else if (!Object.values(Sensitivity).includes(request.sensitivity as Sensitivity)) {
    errors.push({
      field: "sensitivity",
      message: `Invalid sensitivity. Allowed values: ${Object.values(Sensitivity).join(", ")}`
    });
  }

  if (!request.language) {
    errors.push({ field: "language", message: "language is required" });
  } else if (!Object.values(Language).includes(request.language as Language)) {
    errors.push({
      field: "language",
      message: `Invalid language. Allowed values: ${Object.values(Language).join(", ")}`
    });
  }

  if (!request.display_from) {
    errors.push({ field: "display_from", message: "display_from is required" });
  } else if (!isValidISODateTime(request.display_from)) {
    errors.push({
      field: "display_from",
      message: "display_from must be a valid ISO 8601 datetime"
    });
  }

  if (!request.display_to) {
    errors.push({ field: "display_to", message: "display_to is required" });
  } else if (!isValidISODateTime(request.display_to)) {
    errors.push({
      field: "display_to",
      message: "display_to must be a valid ISO 8601 datetime"
    });
  }

  // Date comparison validation
  if (request.display_from && request.display_to) {
    const fromDate = new Date(request.display_from);
    const toDate = new Date(request.display_to);
    if (toDate < fromDate) {
      errors.push({
        field: "display_to",
        message: "display_to must be after display_from"
      });
    }
  }

  if (!request.hearing_list) {
    errors.push({ field: "hearing_list", message: "hearing_list is required" });
  }

  // Location validation - check if location exists in master reference data
  let locationExists = false;
  if (request.court_id) {
    const locationId = Number.parseInt(request.court_id, 10);
    if (Number.isNaN(locationId)) {
      errors.push({ field: "court_id", message: "court_id must be a valid number" });
    } else {
      const location = getLocationById(locationId);
      locationExists = !!location;
      // Note: We don't add an error if location doesn't exist
      // This is handled by setting no_match=true
    }
  }

  // JSON schema validation for hearing_list
  if (request.list_type && request.hearing_list && errors.length === 0) {
    try {
      const validationResult = await validateListTypeJson(
        request.list_type,
        request.hearing_list
      );

      if (!validationResult.isValid) {
        for (const error of validationResult.errors) {
          errors.push({
            field: "hearing_list",
            message: (error as { message?: string }).message || "Invalid hearing_list structure"
          });
        }
      }
    } catch (error) {
      errors.push({
        field: "hearing_list",
        message: "Failed to validate hearing_list against schema"
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    locationExists
  };
}

function isValidISODate(dateString: string): boolean {
  const date = new Date(dateString);
  return !Number.isNaN(date.getTime()) && /^\d{4}-\d{2}-\d{2}/.test(dateString);
}

function isValidISODateTime(dateString: string): boolean {
  const date = new Date(dateString);
  return !Number.isNaN(date.getTime()) && dateString.includes("T");
}
```

### 3.3 Business Logic Service
**File**: `libs/blob-ingestion/src/blob-ingestion/service.ts`
```typescript
import { randomUUID } from "node:crypto";
import { createArtefact, Provenance } from "@hmcts/publication";
import type { BlobIngestionRequest, BlobIngestionResponse } from "./model.js";
import { createIngestionLog } from "./queries.js";
import { validateBlobRequest } from "./validation.js";

const PROVENANCE_MAP: Record<string, string> = {
  XHIBIT: "XHIBIT",
  LIBRA: "LIBRA",
  SJP: "SJP",
  MANUAL_UPLOAD: Provenance.MANUAL_UPLOAD
};

export async function processBlobIngestion(
  request: BlobIngestionRequest,
  rawBodySize: number
): Promise<BlobIngestionResponse> {
  // Validate request
  const validation = await validateBlobRequest(request, rawBodySize);

  if (!validation.isValid) {
    // Log validation failure
    await createIngestionLog({
      id: randomUUID(),
      timestamp: new Date(),
      sourceSystem: request.provenance || "UNKNOWN",
      courtId: request.court_id || "UNKNOWN",
      status: "VALIDATION_ERROR",
      errorMessage: validation.errors.map((e) => `${e.field}: ${e.message}`).join("; ")
    });

    return {
      success: false,
      message: "Validation failed",
      errors: validation.errors
    };
  }

  const artefactId = randomUUID();
  const noMatch = !validation.locationExists;

  try {
    // Create artefact in database
    await createArtefact({
      artefactId,
      locationId: request.court_id,
      listTypeId: Number.parseInt(request.list_type, 10),
      contentDate: new Date(request.publication_date),
      sensitivity: request.sensitivity,
      language: request.language,
      displayFrom: new Date(request.display_from),
      displayTo: new Date(request.display_to),
      isFlatFile: false, // JSON blobs are structured
      provenance: PROVENANCE_MAP[request.provenance] || request.provenance,
      noMatch
    });

    // Store blob content (hearing_list) to temporary storage
    // This would be similar to the manual upload file storage
    // await saveBlobContent(artefactId, request.hearing_list);

    // Log successful ingestion
    await createIngestionLog({
      id: randomUUID(),
      timestamp: new Date(),
      sourceSystem: request.provenance,
      courtId: request.court_id,
      status: "SUCCESS",
      artefactId
    });

    return {
      success: true,
      artefact_id: artefactId,
      no_match: noMatch,
      message: noMatch
        ? "Blob ingested but location not found in reference data"
        : "Blob ingested and published successfully"
    };
  } catch (error) {
    // Log system error
    await createIngestionLog({
      id: randomUUID(),
      timestamp: new Date(),
      sourceSystem: request.provenance,
      courtId: request.court_id,
      status: "SYSTEM_ERROR",
      errorMessage: error instanceof Error ? error.message : "Unknown error"
    });

    return {
      success: false,
      message: "Internal server error during ingestion"
    };
  }
}
```

### 3.4 Audit Logging Queries
**File**: `libs/blob-ingestion/src/blob-ingestion/queries.ts`
```typescript
import { prisma } from "@hmcts/postgres";
import type { IngestionLog } from "./model.js";

// Note: This requires a new table in the database schema
// See section 3.7 for the Prisma schema definition

export async function createIngestionLog(log: IngestionLog): Promise<void> {
  await prisma.ingestionLog.create({
    data: {
      id: log.id,
      timestamp: log.timestamp,
      sourceSystem: log.sourceSystem,
      courtId: log.courtId,
      status: log.status,
      errorMessage: log.errorMessage,
      artefactId: log.artefactId
    }
  });
}

export async function getIngestionLogsByDateRange(
  startDate: Date,
  endDate: Date
): Promise<IngestionLog[]> {
  const logs = await prisma.ingestionLog.findMany({
    where: {
      timestamp: {
        gte: startDate,
        lte: endDate
      }
    },
    orderBy: {
      timestamp: "desc"
    }
  });

  return logs.map((log) => ({
    id: log.id,
    timestamp: log.timestamp,
    sourceSystem: log.sourceSystem,
    courtId: log.courtId,
    status: log.status as "SUCCESS" | "VALIDATION_ERROR" | "SYSTEM_ERROR",
    errorMessage: log.errorMessage || undefined,
    artefactId: log.artefactId || undefined
  }));
}

export async function getRecentErrorLogs(limit = 10): Promise<IngestionLog[]> {
  const logs = await prisma.ingestionLog.findMany({
    where: {
      status: {
        in: ["VALIDATION_ERROR", "SYSTEM_ERROR"]
      }
    },
    orderBy: {
      timestamp: "desc"
    },
    take: limit
  });

  return logs.map((log) => ({
    id: log.id,
    timestamp: log.timestamp,
    sourceSystem: log.sourceSystem,
    courtId: log.courtId,
    status: log.status as "SUCCESS" | "VALIDATION_ERROR" | "SYSTEM_ERROR",
    errorMessage: log.errorMessage || undefined,
    artefactId: log.artefactId || undefined
  }));
}
```

### 3.5 OAuth Authentication Middleware
**File**: `libs/blob-ingestion/src/middleware/oauth-middleware.ts`
```typescript
import type { NextFunction, Request, Response } from "express";

const REQUIRED_ROLE = "api.publisher.user";

/**
 * Middleware to authenticate API requests using OAuth 2.0
 * Validates bearer token and checks for required app role
 */
export function authenticateApi() {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authHeader = req.headers.authorization;

      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({
          success: false,
          message: "Missing or invalid Authorization header"
        });
      }

      const token = authHeader.substring(7); // Remove "Bearer " prefix

      // Validate token and extract claims
      const claims = await validateToken(token);

      // Check for required app role
      if (!hasRequiredRole(claims, REQUIRED_ROLE)) {
        return res.status(403).json({
          success: false,
          message: "Insufficient permissions. Required role: api.publisher.user"
        });
      }

      // Attach claims to request for downstream use
      (req as any).apiUser = {
        appId: claims.appid || claims.azp,
        roles: claims.roles || []
      };

      next();
    } catch (error) {
      console.error("API authentication error:", error);
      return res.status(401).json({
        success: false,
        message: "Invalid or expired token"
      });
    }
  };
}

async function validateToken(token: string): Promise<any> {
  // TODO: Implement JWT validation
  // This should:
  // 1. Verify token signature using Azure AD public keys
  // 2. Validate issuer, audience, expiration
  // 3. Extract claims
  //
  // Implementation options:
  // - Use passport-azure-ad JwtStrategy
  // - Use jsonwebtoken library with jwks-rsa
  // - Use @azure/identity library
  //
  // For now, throw error indicating not implemented
  throw new Error("Token validation not yet implemented");
}

function hasRequiredRole(claims: any, requiredRole: string): boolean {
  const roles = claims.roles || [];
  return Array.isArray(roles) && roles.includes(requiredRole);
}
```

### 3.6 API Route Handler
**File**: `libs/blob-ingestion/src/routes/v1/publication.ts`
```typescript
import type { Request, Response } from "express";
import { authenticateApi } from "../../middleware/oauth-middleware.js";
import { processBlobIngestion } from "../../blob-ingestion/service.js";
import type { BlobIngestionRequest } from "../../blob-ingestion/model.js";

// Middleware array - OAuth authentication is applied first
export const middleware = [authenticateApi()];

export const POST = async (req: Request, res: Response) => {
  try {
    const request = req.body as BlobIngestionRequest;
    const rawBodySize = JSON.stringify(req.body).length;

    const result = await processBlobIngestion(request, rawBodySize);

    if (!result.success) {
      // Determine appropriate status code
      if (result.message === "Validation failed") {
        return res.status(400).json(result);
      }
      return res.status(500).json(result);
    }

    // Success response
    return res.status(200).json(result);
  } catch (error) {
    console.error("Unexpected error in blob ingestion endpoint:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};
```

### 3.7 Ingestion Log Database Schema
**File**: `apps/postgres/prisma/schema.prisma` (add this model)
```prisma
model IngestionLog {
  id            String   @id @map("id") @db.Uuid
  timestamp     DateTime @default(now()) @map("timestamp")
  sourceSystem  String   @map("source_system")
  courtId       String   @map("court_id")
  status        String   @map("status")
  errorMessage  String?  @map("error_message")
  artefactId    String?  @map("artefact_id")

  @@index([timestamp])
  @@index([status])
  @@index([sourceSystem])
  @@map("ingestion_log")
}
```

## 4. Application Registration

### 4.1 Register in API App
**File**: `apps/api/src/app.ts`
```typescript
// Add import
import { apiRoutes as blobIngestionRoutes } from "@hmcts/blob-ingestion/config";

// Add to routeMounts array
const routeMounts = [
  { path: `${__dirname}/routes` },
  blobIngestionRoutes  // Registers /api/v1/publication
];
```

### 4.2 Root tsconfig.json Update
**File**: `tsconfig.json`
```json
{
  "compilerOptions": {
    "paths": {
      "@hmcts/blob-ingestion": ["libs/blob-ingestion/src"],
      // ... other paths
    }
  }
}
```

## 5. Provenance Enumeration Update

### 5.1 Add New Provenances
**File**: `libs/publication/src/provenance.ts`
```typescript
export enum Provenance {
  MANUAL_UPLOAD = "MANUAL_UPLOAD",
  XHIBIT = "XHIBIT",
  LIBRA = "LIBRA",
  SJP = "SJP"
}

export const PROVENANCE_LABELS: Record<string, string> = {
  [Provenance.MANUAL_UPLOAD]: "Manual Upload",
  [Provenance.XHIBIT]: "XHIBIT",
  [Provenance.LIBRA]: "LIBRA",
  [Provenance.SJP]: "SJP"
};
```

## 6. Error Handling and Logging

### 6.1 Structured Logging
Use consistent logging format across the module:
```typescript
// Log format
{
  timestamp: ISO8601,
  level: "INFO" | "WARN" | "ERROR",
  module: "blob-ingestion",
  action: string,
  details: object
}
```

### 6.2 Error Response Format
All error responses follow this structure:
```json
{
  "success": false,
  "message": "Human-readable error message",
  "errors": [
    {
      "field": "field_name",
      "message": "Specific error for this field"
    }
  ]
}
```

### 6.3 Admin Alerting
Implement alerting for repeated errors:
- Track failed ingestion attempts per source system
- Alert when error rate exceeds threshold (e.g., >10 errors in 5 minutes)
- Alert on specific error types (system errors vs. validation errors)

## 7. Testing Strategy

### 7.1 Unit Tests
**Location**: Co-located with source files (`*.test.ts`)

**Coverage targets**:
- Validation logic: 100% coverage
- Service logic: >95% coverage
- Queries: >90% coverage

**Test files**:
- `libs/blob-ingestion/src/blob-ingestion/validation.test.ts`
- `libs/blob-ingestion/src/blob-ingestion/service.test.ts`
- `libs/blob-ingestion/src/blob-ingestion/queries.test.ts`
- `libs/blob-ingestion/src/middleware/oauth-middleware.test.ts`

**Key test scenarios**:
```typescript
describe("validateBlobRequest", () => {
  it("should validate a complete valid request", async () => {
    // Test with all required fields and valid data
  });

  it("should reject request with missing required fields", async () => {
    // Test each required field individually
  });

  it("should reject request with invalid data types", async () => {
    // Test type validation
  });

  it("should reject request exceeding size limit", async () => {
    // Test MAX_BLOB_SIZE enforcement
  });

  it("should reject invalid provenance", async () => {
    // Test provenance whitelist
  });

  it("should reject invalid JSON schema for hearing_list", async () => {
    // Test list type schema validation
  });

  it("should set locationExists=false when court_id not found", async () => {
    // Test location lookup
  });
});
```

### 7.2 Integration Tests
**Location**: `libs/blob-ingestion/src/routes/v1/publication.test.ts`

**Test scenarios** (matching specification):
- TS1: Valid blob ingestion with existing court
- TS2: Invalid JSON schema
- TS3: Unknown court (no_match scenario)
- TS4: Missing required field
- TS5: Provenance mismatch
- TS6: Logging verification
- TS8: Large blob
- TS9: API security (OAuth)

**Example test structure**:
```typescript
import supertest from "supertest";
import { createApp } from "@hmcts/api";

describe("POST /api/v1/publication", () => {
  let app: Express;
  let request: supertest.SuperTest<supertest.Test>;

  beforeAll(async () => {
    app = await createApp();
    request = supertest(app);
  });

  it("TS1: should ingest valid blob with existing court", async () => {
    const response = await request
      .post("/api/v1/publication")
      .set("Authorization", `Bearer ${VALID_TOKEN}`)
      .send(VALID_BLOB_REQUEST)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.artefact_id).toBeDefined();
    expect(response.body.no_match).toBe(false);
  });

  it("TS3: should ingest blob with unknown court and set no_match=true", async () => {
    const response = await request
      .post("/api/v1/publication")
      .set("Authorization", `Bearer ${VALID_TOKEN}`)
      .send({ ...VALID_BLOB_REQUEST, court_id: "999999" })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.no_match).toBe(true);
  });

  it("TS9: should reject request without authorization header", async () => {
    await request
      .post("/api/v1/publication")
      .send(VALID_BLOB_REQUEST)
      .expect(401);
  });
});
```

### 7.3 E2E Tests
**Location**: `e2e-tests/tests/blob-ingestion.spec.ts`

**Scenarios**:
- Complete ingestion flow with real database
- Verify audit logs are created
- Verify artefact is stored correctly
- Test retry after admin fixes location

## 8. Security Considerations

### 8.1 OAuth 2.0 Implementation
**Requirements**:
- Use existing Azure AD app registrations
- Validate JWT tokens using Azure AD public keys
- Verify token signature, issuer, audience, expiration
- Check for required app role: `api.publisher.user`

**Token validation library options**:
1. `passport-azure-ad` (already in use for SSO)
2. `jsonwebtoken` + `jwks-rsa`
3. `@azure/identity`

### 8.2 Input Validation
- **Size limits**: Enforce 10MB maximum blob size
- **Schema validation**: Use JSON schema validation for hearing_list
- **SQL injection**: Use Prisma parameterized queries (built-in protection)
- **XSS protection**: Not applicable (API only, no HTML rendering)

### 8.3 Rate Limiting
Consider implementing rate limiting per source system:
```typescript
// Pseudo-code for rate limiting
const RATE_LIMIT = 100; // requests per minute
const rateLimitBySource = new Map<string, number>();

function checkRateLimit(sourceSystem: string): boolean {
  const count = rateLimitBySource.get(sourceSystem) || 0;
  if (count >= RATE_LIMIT) {
    return false;
  }
  rateLimitBySource.set(sourceSystem, count + 1);
  return true;
}
```

### 8.4 HTTPS and Headers
**Security headers** (already configured in `apps/api/src/app.ts`):
- Enable CORS for specific origins only
- Use compression for responses
- Set secure headers (via helmet or similar)

## 9. Reusing Manual Upload Logic

### 9.1 Shared Validation
The blob ingestion endpoint reuses validation patterns from manual upload:
- Location lookup: `getLocationById()` from `@hmcts/location`
- List type validation: `validateListTypeJson()` from `@hmcts/list-types-common`
- Date validation: Similar patterns to manual upload
- Artefact creation: `createArtefact()` from `@hmcts/publication`

### 9.2 Key Differences
| Aspect | Manual Upload | Blob Ingestion |
|--------|--------------|----------------|
| Authentication | SSO (session-based) | OAuth 2.0 (token-based) |
| Input | Multipart form + file upload | JSON body |
| User journey | Multi-page flow with confirmation | Single API call |
| File storage | Multer + Redis session storage | Direct JSON storage |
| Error handling | Render error pages | JSON error responses |
| Language support | EN/CY with i18n | English only (API) |

## 10. Data Retention and Audit

### 10.1 Ingestion Logs
- **Retention period**: Minimum 90 days
- **Storage**: PostgreSQL `ingestion_log` table
- **Cleanup strategy**: Implement scheduled job to archive/delete logs older than 90 days

### 10.2 Validation Reports
Create validation reports for failed ingestions:
```typescript
// Pseudo-code
interface ValidationReport {
  id: string;
  timestamp: Date;
  sourceSystem: string;
  courtId: string;
  errorSummary: string;
  errorDetails: ValidationError[];
  rawRequest: string; // For debugging
}
```

## 11. Configuration and Environment Variables

### 11.1 Required Environment Variables
```bash
# OAuth Configuration
AZURE_AD_TENANT_ID=<tenant-id>
AZURE_AD_CLIENT_ID=<api-app-client-id>
AZURE_AD_ISSUER=https://login.microsoftonline.com/<tenant-id>/v2.0

# Blob Ingestion Settings
BLOB_MAX_SIZE=10485760  # 10MB in bytes
BLOB_ALLOWED_PROVENANCES=XHIBIT,LIBRA,SJP
BLOB_RATE_LIMIT=100     # Requests per minute per source

# Database (already configured)
DATABASE_URL=postgresql://...
```

### 11.2 Configuration Module
**File**: `libs/blob-ingestion/src/blob-ingestion/config.ts`
```typescript
export const BLOB_CONFIG = {
  MAX_SIZE: Number.parseInt(process.env.BLOB_MAX_SIZE || "10485760", 10),
  ALLOWED_PROVENANCES: (process.env.BLOB_ALLOWED_PROVENANCES || "XHIBIT,LIBRA,SJP").split(","),
  RATE_LIMIT: Number.parseInt(process.env.BLOB_RATE_LIMIT || "100", 10)
};
```

## 12. API Documentation

### 12.1 OpenAPI Specification
Create OpenAPI/Swagger documentation for the endpoint:

**File**: `docs/api/blob-ingestion-v1.yaml`
```yaml
openapi: 3.0.0
info:
  title: CaTH Blob Ingestion API
  version: 1.0.0
  description: API for ingesting hearing list blobs from source systems

servers:
  - url: https://api.cath.service.gov.uk
    description: Production
  - url: https://api.staging.cath.service.gov.uk
    description: Staging

security:
  - oauth2: [api.publisher.user]

paths:
  /api/v1/publication:
    post:
      summary: Ingest hearing list blob
      description: Validates and ingests a JSON blob containing hearing list data
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/BlobIngestionRequest'
      responses:
        '200':
          description: Blob ingested successfully
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/SuccessResponse'
        '400':
          description: Validation error
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '401':
          description: Unauthorized
        '500':
          description: Internal server error

components:
  securitySchemes:
    oauth2:
      type: oauth2
      flows:
        clientCredentials:
          tokenUrl: https://login.microsoftonline.com/{tenant}/oauth2/v2.0/token
          scopes:
            api.publisher.user: Permission to publish hearing lists

  schemas:
    BlobIngestionRequest:
      type: object
      required:
        - court_id
        - provenance
        - publication_date
        - list_type
        - sensitivity
        - language
        - display_from
        - display_to
        - hearing_list
      properties:
        court_id:
          type: string
          description: Location ID from Court Master Reference Data
        provenance:
          type: string
          enum: [XHIBIT, LIBRA, SJP]
          description: Source system identifier
        publication_date:
          type: string
          format: date
          description: Hearing date (ISO 8601)
        list_type:
          type: string
          description: List type identifier
        sensitivity:
          type: string
          enum: [PUBLIC, PRIVATE, CLASSIFIED]
        language:
          type: string
          enum: [ENGLISH, WELSH, BILINGUAL]
        display_from:
          type: string
          format: date-time
          description: Start of display period (ISO 8601)
        display_to:
          type: string
          format: date-time
          description: End of display period (ISO 8601)
        hearing_list:
          type: object
          description: Hearing list data (structure depends on list_type)

    SuccessResponse:
      type: object
      properties:
        success:
          type: boolean
          example: true
        artefact_id:
          type: string
          format: uuid
        no_match:
          type: boolean
          description: True if location not found in reference data
        message:
          type: string

    ErrorResponse:
      type: object
      properties:
        success:
          type: boolean
          example: false
        message:
          type: string
        errors:
          type: array
          items:
            type: object
            properties:
              field:
                type: string
              message:
                type: string
```

## 13. Implementation Phases

### Phase 1: Foundation (Week 1)
- [ ] Database schema changes (add `no_match` column)
- [ ] Update Artefact model and queries
- [ ] Add new Provenance values
- [ ] Create `libs/blob-ingestion` module structure
- [ ] Unit tests for validation logic

### Phase 2: Core Implementation (Week 2)
- [ ] Implement validation logic
- [ ] Implement service logic
- [ ] Implement audit logging
- [ ] Unit tests for service and queries
- [ ] Integration tests for endpoint

### Phase 3: Authentication (Week 3)
- [ ] Implement OAuth middleware
- [ ] Configure Azure AD app registration
- [ ] Test token validation
- [ ] Document authentication setup

### Phase 4: Integration & Testing (Week 4)
- [ ] Register module in API app
- [ ] E2E tests
- [ ] Security testing
- [ ] Performance testing
- [ ] Documentation

### Phase 5: Deployment (Week 5)
- [ ] Staging deployment
- [ ] Integration testing with source systems
- [ ] Production deployment
- [ ] Monitoring and alerting setup

## 14. Open Questions & Decisions Needed

1. **Token Validation**: Which library should be used for JWT validation?
   - Recommendation: Use `passport-azure-ad` for consistency with existing SSO implementation

2. **Blob Content Storage**: Where should the hearing_list JSON be stored?
   - Option A: Store as JSONB column in artefact table
   - Option B: Store in file system (like manual upload)
   - Option C: Store in Azure Blob Storage
   - Recommendation: Option A (JSONB column) for better queryability

3. **Rate Limiting**: Should rate limiting be implemented?
   - Recommendation: Yes, implement per-source-system rate limiting

4. **Maximum Blob Size**: Confirm 10MB limit
   - Current assumption: 10MB (configurable via environment variable)

5. **Retry Mechanism**: Should automatic retry be implemented?
   - Recommendation: No automatic retry. Source systems should implement retry logic

6. **Notification Mechanism**: How should source systems be notified of errors?
   - Option A: Synchronous HTTP response only
   - Option B: Webhook callback
   - Option C: Email notification
   - Recommendation: Option A for MVP, consider B for future enhancement

7. **Schema Versioning**: Should JSON schema versioning be supported?
   - Recommendation: Not for MVP. Add version field to support future schema evolution

## 15. Monitoring and Alerting

### 15.1 Metrics to Track
- Ingestion success rate per source system
- Average ingestion time
- Validation error rate
- System error rate
- `no_match` occurrence rate
- API request rate

### 15.2 Alerts
- Error rate exceeds 10% in 5-minute window
- System error rate exceeds 1% in 5-minute window
- No ingestions received from expected source system in 1 hour
- High rate of `no_match` occurrences (>5% of ingestions)

### 15.3 Dashboards
Create monitoring dashboard showing:
- Ingestion volume over time
- Success/failure breakdown
- Top validation errors
- Source system performance comparison
- `no_match` trend analysis

## 16. Migration and Rollback

### 16.1 Database Migration
```bash
# Forward migration
yarn db:migrate:dev

# Rollback (if needed)
yarn db:migrate:reset
```

### 16.2 Feature Flag
Consider implementing feature flag for gradual rollout:
```typescript
const BLOB_INGESTION_ENABLED = process.env.FEATURE_BLOB_INGESTION === "true";

if (!BLOB_INGESTION_ENABLED) {
  return res.status(503).json({
    success: false,
    message: "Blob ingestion is currently disabled"
  });
}
```

## 17. Dependencies

### 17.1 Existing Modules
- `@hmcts/postgres` - Database access
- `@hmcts/location` - Location lookup
- `@hmcts/publication` - Artefact creation
- `@hmcts/list-types-common` - JSON schema validation

### 17.2 New Dependencies (if needed)
- JWT validation library (passport-azure-ad or jsonwebtoken + jwks-rsa)
- Rate limiting library (express-rate-limit)

## 18. Success Criteria

The implementation is considered successful when:
1. All test scenarios (TS1-TS10) pass
2. Unit test coverage >95%
3. Integration tests pass
4. E2E tests pass
5. OAuth authentication working
6. Audit logging capturing all ingestion attempts
7. API documentation complete
8. Source systems can successfully ingest blobs
9. Admin dashboard shows ingestion metrics
10. No security vulnerabilities identified

## Appendix A: Example Request/Response

### Example Valid Request
```json
POST /api/v1/publication
Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGc...

{
  "court_id": "123",
  "provenance": "XHIBIT",
  "publication_date": "2025-01-25",
  "list_type": "1",
  "sensitivity": "PUBLIC",
  "language": "ENGLISH",
  "display_from": "2025-01-25T09:00:00Z",
  "display_to": "2025-01-25T17:00:00Z",
  "hearing_list": {
    "courtLists": [
      {
        "courtHouse": {
          "courtHouseName": "Royal Courts of Justice"
        },
        "courtRooms": [
          {
            "courtRoomName": "Court 1",
            "sessions": [
              {
                "sessionChannel": "Crime",
                "sittings": [
                  {
                    "time": "10:00",
                    "hearing": [
                      {
                        "case": [
                          {
                            "caseNumber": "T20257890"
                          }
                        ]
                      }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      }
    ]
  }
}
```

### Example Success Response
```json
{
  "success": true,
  "artefact_id": "550e8400-e29b-41d4-a716-446655440000",
  "no_match": false,
  "message": "Blob ingested and published successfully"
}
```

### Example Validation Error Response
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "court_id",
      "message": "court_id is required"
    },
    {
      "field": "display_to",
      "message": "display_to must be after display_from"
    }
  ]
}
```

### Example No-Match Response
```json
{
  "success": true,
  "artefact_id": "550e8400-e29b-41d4-a716-446655440000",
  "no_match": true,
  "message": "Blob ingested but location not found in reference data"
}
```
