# Technical Plan: PDDA/HTML Upload to AWS S3 (Issue #334)

## 1. Overview

This feature implements a service-to-service API endpoint for PDDA to upload HTML/HTM files directly to AWS S3 (XHIBIT bucket). Unlike the standard blob ingestion flow (`/api/v1/publication`) which processes and stores data in the database, this endpoint performs passthrough upload to S3 only.

**Key Design Decisions:**
- New module `libs/pdda-html-upload` following HMCTS monorepo conventions
- Functional programming style with service/query separation
- AWS S3 SDK v3 for S3 operations
- New artefact type `LCSU` added via database migration
- OAuth authentication via existing `authenticateApi()` middleware
- No UI components required (service-to-service only)

## 2. Technical Approach

### 2.1 Architecture

```
┌──────────┐         ┌─────────────┐         ┌──────────────────┐         ┌─────────────┐
│   PDDA   │────────▶│  CaTH APIM  │────────▶│  Publication     │────────▶│  XHIBIT S3  │
│  System  │  HTML   │  OAuth      │         │  Services API    │         │   Bucket    │
└──────────┘         └─────────────┘         └──────────────────┘         └─────────────┘
                           │                           │
                           │                           │
                           ▼                           ▼
                    OAuth validation           1. Validate ArtefactType=LCSU
                                               2. Validate file extension (.htm/.html)
                                               3. Validate file size/path traversal
                                               4. Upload to S3
                                               5. Log audit event
```

### 2.2 Module Structure

New library module: `libs/pdda-html-upload/`

```
libs/pdda-html-upload/
├── package.json
├── tsconfig.json
└── src/
    ├── config.ts                          # Module registration exports
    ├── index.ts                           # Business logic exports (empty for now)
    ├── routes/
    │   └── v1/
    │       ├── pdda-html.ts              # POST endpoint handler
    │       └── pdda-html.test.ts         # Route unit tests
    ├── validation/
    │   ├── file-validation.ts            # File/request validation logic
    │   └── file-validation.test.ts
    ├── s3/
    │   ├── s3-client.ts                  # AWS S3 client factory
    │   ├── s3-client.test.ts
    │   ├── s3-upload-service.ts          # Upload business logic
    │   └── s3-upload-service.test.ts
    └── types.ts                          # TypeScript interfaces
```

**Module follows HMCTS patterns:**
- Functional style (no classes unless shared state required)
- Co-located tests with `.test.ts` suffix
- Business logic in service functions, not route handlers
- Configuration separate from business logic exports

### 2.3 Database Migration

Add `type` column to existing `artefact` table:

**Migration file:** `apps/postgres/prisma/migrations/XXX_add_artefact_type/migration.sql`

```sql
-- Add type column to artefact table
ALTER TABLE artefact ADD COLUMN type VARCHAR(50);

-- Set existing artefacts to 'LIST' type
UPDATE artefact SET type = 'LIST' WHERE type IS NULL;

-- Make type column NOT NULL after backfilling
ALTER TABLE artefact ALTER COLUMN type SET NOT NULL;

-- Add index for type lookups
CREATE INDEX idx_artefact_type ON artefact(type);
```

**Update Prisma schema:** `apps/postgres/prisma/schema.prisma`

```prisma
model Artefact {
  artefactId        String          @id @default(uuid()) @map("artefact_id") @db.Uuid
  type              String          // NEW: Artefact type (LIST, LCSU)
  locationId        String          @map("location_id")
  listTypeId        Int             @map("list_type_id")
  // ... rest of fields

  @@index([type])
  @@map("artefact")
}
```

### 2.4 Integration Points

**API Registration** (`apps/api/src/app.ts`):
```typescript
import { apiRoutes as pddaHtmlRoutes } from "@hmcts/pdda-html-upload/config";

const routeMounts = [
  { path: `${__dirname}/routes` },
  blobIngestionRoutes,
  locationRoutes,
  publicPagesRoutes,
  pddaHtmlRoutes  // NEW
];
```

**TypeScript Path Alias** (`tsconfig.json`):
```json
{
  "compilerOptions": {
    "paths": {
      "@hmcts/pdda-html-upload": ["libs/pdda-html-upload/src"]
    }
  }
}
```

## 3. Implementation Details

### 3.1 API Endpoint Specification

**Endpoint:** `POST /api/v1/pdda-html`

**Authentication:** OAuth 2.0 via `authenticateApi()` middleware (reused from blob-ingestion)

**Request Headers:**
```
Content-Type: multipart/form-data
Authorization: Bearer {token}
X-Correlation-ID: {uuid} (optional but recommended)
```

**Request Body (multipart/form-data):**
```
artefact_type: "LCSU" (required string)
file: <binary> (required file)
```

**Success Response (201 Created):**
```json
{
  "success": true,
  "message": "Upload accepted and stored",
  "s3_key": "pdda-html/2026/02/11/{uuid}.html",
  "correlation_id": "{uuid}"
}
```

**Error Response (400 Bad Request):**
```json
{
  "success": false,
  "message": "The uploaded file must be an HTM or HTML file",
  "correlation_id": "{uuid}"
}
```

**Error Response (500 Internal Server Error):**
```json
{
  "success": false,
  "message": "The file could not be uploaded to storage. Try again.",
  "correlation_id": "{uuid}"
}
```

### 3.2 File Validation Rules

```typescript
// libs/pdda-html-upload/src/validation/file-validation.ts

interface FileValidationResult {
  valid: boolean;
  error?: string;
}

export function validatePddaHtmlUpload(
  artefactType: unknown,
  file: Express.Multer.File | undefined
): FileValidationResult {
  // 1. Validate artefact type
  if (artefactType !== "LCSU") {
    return {
      valid: false,
      error: "ArtefactType must be LCSU for HTM/HTML uploads"
    };
  }

  // 2. Validate file presence
  if (!file) {
    return {
      valid: false,
      error: "Select an HTM or HTML file to upload"
    };
  }

  // 3. Validate file extension (case-insensitive)
  const allowedExtensions = [".htm", ".html"];
  const fileExtension = path.extname(file.originalname).toLowerCase();
  if (!allowedExtensions.includes(fileExtension)) {
    return {
      valid: false,
      error: "The uploaded file must be an HTM or HTML file"
    };
  }

  // 4. Validate file is not empty
  if (file.size === 0) {
    return {
      valid: false,
      error: "Select an HTM or HTML file to upload"
    };
  }

  // 5. Validate file size (10MB limit - configurable)
  const maxFileSize = Number.parseInt(process.env.PDDA_HTML_MAX_FILE_SIZE || "10485760", 10);
  if (file.size > maxFileSize) {
    return {
      valid: false,
      error: "The uploaded file is too large"
    };
  }

  // 6. Validate filename security (no path traversal)
  const pathTraversalPattern = /\.\.\//|\.\.\\/;
  if (pathTraversalPattern.test(file.originalname)) {
    return {
      valid: false,
      error: "Invalid filename"
    };
  }

  return { valid: true };
}
```

### 3.3 AWS S3 Integration

**S3 Client Factory:**
```typescript
// libs/pdda-html-upload/src/s3/s3-client.ts
import { S3Client } from "@aws-sdk/client-s3";

export function createS3Client(): S3Client {
  const region = process.env.AWS_S3_XHIBIT_REGION;
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

  if (!region || !accessKeyId || !secretAccessKey) {
    throw new Error("Missing required AWS S3 configuration");
  }

  return new S3Client({
    region,
    credentials: {
      accessKeyId,
      secretAccessKey
    }
  });
}
```

**S3 Upload Service:**
```typescript
// libs/pdda-html-upload/src/s3/s3-upload-service.ts
import { PutObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { createS3Client } from "./s3-client.js";

export async function uploadHtmlToS3(
  fileBuffer: Buffer,
  originalFilename: string,
  correlationId?: string
): Promise<S3UploadResult> {
  const s3Client = createS3Client();
  const bucketName = process.env.AWS_S3_XHIBIT_BUCKET_NAME;
  const prefix = process.env.AWS_S3_XHIBIT_PREFIX || "pdda-html/";

  if (!bucketName) {
    throw new Error("AWS S3 bucket name not configured");
  }

  // Generate S3 key with date-based path and UUID for uniqueness
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const uuid = crypto.randomUUID();
  const extension = path.extname(originalFilename).toLowerCase();
  const s3Key = `${prefix}${year}/${month}/${day}/${uuid}${extension}`;

  try {
    // Upload file to S3
    const putCommand = new PutObjectCommand({
      Bucket: bucketName,
      Key: s3Key,
      Body: fileBuffer,
      ContentType: "text/html",
      Metadata: {
        originalFilename,
        correlationId: correlationId || "",
        uploadTimestamp: now.toISOString()
      }
    });

    await s3Client.send(putCommand);

    // Verify upload succeeded
    const headCommand = new HeadObjectCommand({
      Bucket: bucketName,
      Key: s3Key
    });
    await s3Client.send(headCommand);

    return {
      success: true,
      s3Key,
      bucketName
    };
  } catch (error) {
    console.error("S3 upload failed:", {
      error: error instanceof Error ? error.message : "Unknown error",
      bucketName,
      s3Key,
      correlationId
    });
    throw new Error("The file could not be uploaded to storage. Try again.");
  }
}

interface S3UploadResult {
  success: boolean;
  s3Key: string;
  bucketName: string;
}
```

### 3.4 Route Handler Implementation

```typescript
// libs/pdda-html-upload/src/routes/v1/pdda-html.ts
import type { Request, Response } from "express";
import multer from "multer";
import { authenticateApi } from "@hmcts/blob-ingestion"; // Reuse existing
import { validatePddaHtmlUpload } from "../../validation/file-validation.js";
import { uploadHtmlToS3 } from "../../s3/s3-upload-service.js";

// Configure multer for in-memory file storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: Number.parseInt(process.env.PDDA_HTML_MAX_FILE_SIZE || "10485760", 10)
  }
});

export const POST = [
  authenticateApi(),
  upload.single("file"),
  async (req: Request, res: Response) => {
    const correlationId = req.headers["x-correlation-id"] as string | undefined;

    try {
      const { artefact_type } = req.body;
      const file = req.file;

      // Validate request
      const validation = validatePddaHtmlUpload(artefact_type, file);
      if (!validation.valid) {
        return res.status(400).json({
          success: false,
          message: validation.error,
          correlation_id: correlationId
        });
      }

      // Upload to S3
      const uploadResult = await uploadHtmlToS3(
        file.buffer,
        file.originalname,
        correlationId
      );

      // Log audit event
      console.info("PDDA HTML upload successful", {
        s3Key: uploadResult.s3Key,
        bucketName: uploadResult.bucketName,
        correlationId,
        originalFilename: file.originalname,
        fileSize: file.size
      });

      return res.status(201).json({
        success: true,
        message: "Upload accepted and stored",
        s3_key: uploadResult.s3Key,
        correlation_id: correlationId
      });
    } catch (error) {
      console.error("PDDA HTML upload failed", {
        error: error instanceof Error ? error.message : "Unknown error",
        correlationId
      });

      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : "Internal server error",
        correlation_id: correlationId
      });
    }
  }
];
```

### 3.5 Environment Configuration

**New Environment Variables:**
```bash
# AWS S3 Configuration for PDDA HTML Uploads
AWS_S3_XHIBIT_BUCKET_NAME=xhibit-publications
AWS_S3_XHIBIT_REGION=eu-west-2
AWS_S3_XHIBIT_PREFIX=pdda-html/
AWS_ACCESS_KEY_ID=<from-azure-keyvault-xhibit-s3-access-key>
AWS_SECRET_ACCESS_KEY=<from-azure-keyvault-xhibit-s3-access-key-secret>
PDDA_HTML_MAX_FILE_SIZE=10485760  # 10MB in bytes
```

**Azure Key Vault Integration:**
- Credentials retrieved from: `xhibit-s3-access-key`, `xhibit-s3-access-key-secret`
- Existing cloud-native-platform module handles Key Vault integration

### 3.6 Dependencies

**Package.json for `libs/pdda-html-upload`:**
```json
{
  "name": "@hmcts/pdda-html-upload",
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
    "@aws-sdk/client-s3": "3.712.0",
    "multer": "1.4.5-lts.1"
  },
  "peerDependencies": {
    "express": "5.2.0"
  },
  "devDependencies": {
    "@types/express": "5.0.0",
    "@types/multer": "1.4.12",
    "typescript": "5.9.3",
    "vitest": "4.0.16"
  }
}
```

**Root package.json updates:**
Add to devDependencies (if not already present):
```json
{
  "devDependencies": {
    "@types/multer": "1.4.12"
  }
}
```

## 4. Error Handling & Edge Cases

### 4.1 Validation Errors (400)

| Scenario | Error Message |
|----------|---------------|
| Missing file | "Select an HTM or HTML file to upload" |
| Invalid extension | "The uploaded file must be an HTM or HTML file" |
| File too large | "The uploaded file is too large" |
| Empty file | "Select an HTM or HTML file to upload" |
| Invalid artefact type | "ArtefactType must be LCSU for HTM/HTML uploads" |
| Path traversal in filename | "Invalid filename" |

### 4.2 Server Errors (500)

| Scenario | Error Message | Logging |
|----------|---------------|---------|
| S3 upload failure | "The file could not be uploaded to storage. Try again." | Log full error with correlation ID |
| Missing AWS config | "Storage configuration error prevented upload" | Log missing config keys |
| Invalid AWS credentials | "The file could not be uploaded to storage. Try again." | Log auth error without credentials |
| S3 verification failure | "Upload could not be verified" | Log HeadObject failure |

### 4.3 Edge Cases

1. **Duplicate uploads:** Allow overwrites - no idempotency checks initially (can be added later if needed)
2. **Large files:** Multer enforces size limit before processing (fail fast)
3. **Malformed multipart data:** Express/multer handles, returns 400
4. **Missing OAuth token:** Middleware returns 401 before route handler
5. **Invalid OAuth token:** Middleware returns 401 before route handler
6. **S3 bucket doesn't exist:** Caught in upload service, returns 500
7. **Network timeout to S3:** AWS SDK retries automatically, eventual timeout returns 500

### 4.4 Security Considerations

1. **Path traversal protection:** Validate filename doesn't contain `../` or `..\`
2. **File size limits:** Enforce max size via multer and validation
3. **Content type validation:** Accept HTML/HTM extensions only
4. **OAuth authentication:** Required for all requests
5. **No file content in logs:** Only log metadata (size, filename, S3 key)
6. **No credentials in logs:** Never log AWS keys or secrets
7. **Sanitize filenames:** Strip path components, use UUID-based S3 keys

## 5. Acceptance Criteria Mapping

| Acceptance Criterion | Implementation | Verification |
|---------------------|----------------|--------------|
| Both HTM and HTML files accepted | File extension validation allows `.htm` and `.html` (case-insensitive) | Unit test `file-validation.test.ts` |
| Files passed through to XHIBIT S3 | `uploadHtmlToS3` uploads to configured bucket | Integration test with S3 |
| AWS credentials configured | Environment variables from Azure Key Vault | Manual config verification |
| S3 region specified | `AWS_S3_XHIBIT_REGION` environment variable | Manual config verification |
| New endpoint created | `POST /api/v1/pdda-html` route handler | Route unit tests |
| AWS S3 SDK set up | `@aws-sdk/client-s3` dependency, S3Client wrapper | S3 client unit tests |
| New artefact type LCSU | Database migration adds `type` column, validation checks for LCSU | Migration test, validation test |
| Functional test for API upload | Test in `pdda-html.test.ts` | Unit test execution |
| Functional test for S3 verification | E2E test uploads file and verifies in S3 via HeadObject | E2E test execution |

## 6. Testing Strategy

### 6.1 Unit Tests

**File Validation Tests** (`file-validation.test.ts`):
- Valid HTML file with LCSU passes
- Valid HTM file with LCSU passes
- Invalid extension (.txt, .pdf) fails
- Invalid artefact type fails
- Empty file fails
- Oversized file fails
- Path traversal in filename fails

**S3 Client Tests** (`s3-client.test.ts`):
- Creates client with valid config
- Throws error when config missing

**S3 Upload Service Tests** (`s3-upload-service.test.ts`):
- Mock S3Client to test upload logic
- Test S3 key generation (date-based path + UUID)
- Test metadata inclusion
- Test error handling

**Route Handler Tests** (`pdda-html.test.ts`):
- Mock multer, authentication, S3 upload
- Test successful upload returns 201
- Test validation failures return 400
- Test S3 failures return 500
- Test correlation ID passthrough

### 6.2 Integration Tests

**E2E Test** (`e2e-tests/tests/pdda-html-upload.spec.ts`):
```typescript
test("PDDA uploads HTML file to S3 @nightly", async ({ request }) => {
  // Create test HTML file
  const htmlContent = "<html><body>Test</body></html>";
  const formData = new FormData();
  formData.append("artefact_type", "LCSU");
  formData.append("file", new Blob([htmlContent], { type: "text/html" }), "test.html");

  // Upload via API
  const response = await request.post("/api/v1/pdda-html", {
    data: formData,
    headers: {
      Authorization: `Bearer ${testToken}`,
      "X-Correlation-ID": crypto.randomUUID()
    }
  });

  expect(response.status()).toBe(201);
  const body = await response.json();
  expect(body.success).toBe(true);
  expect(body.s3_key).toBeDefined();

  // Verify file exists in S3
  const s3Client = createS3Client();
  const headCommand = new HeadObjectCommand({
    Bucket: process.env.AWS_S3_XHIBIT_BUCKET_NAME,
    Key: body.s3_key
  });
  const headResult = await s3Client.send(headCommand);
  expect(headResult.ContentLength).toBeGreaterThan(0);
});
```

### 6.3 Manual Testing Checklist

- [ ] Upload valid .html file with LCSU succeeds
- [ ] Upload valid .htm file with LCSU succeeds
- [ ] Upload .txt file with LCSU fails with 400
- [ ] Upload HTML without artefact_type fails with 400
- [ ] Upload HTML with artefact_type != LCSU fails with 400
- [ ] Upload without OAuth token fails with 401
- [ ] Verify uploaded file exists in S3 bucket
- [ ] Verify S3 object metadata includes originalFilename and correlationId
- [ ] Verify logs don't contain file content or AWS credentials
- [ ] Verify correlation ID flows through request/response/logs

## 7. Migration Strategy

### 7.1 Database Migration

**File:** `apps/postgres/prisma/migrations/XXX_add_artefact_type/migration.sql`

```sql
-- Add type column
ALTER TABLE artefact ADD COLUMN type VARCHAR(50);

-- Backfill existing records
UPDATE artefact SET type = 'LIST' WHERE type IS NULL;

-- Make NOT NULL
ALTER TABLE artefact ALTER COLUMN type SET NOT NULL;

-- Add index
CREATE INDEX idx_artefact_type ON artefact(type);
```

**Run migration:**
```bash
yarn db:migrate:dev
```

### 7.2 Deployment Checklist

1. Add AWS environment variables to Azure App Service configuration
2. Configure Azure Key Vault secrets: `xhibit-s3-access-key`, `xhibit-s3-access-key-secret`
3. Verify S3 bucket exists and credentials have PutObject + HeadObject permissions
4. Run database migration
5. Deploy API changes
6. Smoke test endpoint with valid HTML file
7. Monitor logs for errors

## 8. Observability

### 8.1 Logging

**Successful Upload:**
```json
{
  "level": "info",
  "message": "PDDA HTML upload successful",
  "s3Key": "pdda-html/2026/02/11/{uuid}.html",
  "bucketName": "xhibit-publications",
  "correlationId": "{uuid}",
  "originalFilename": "crown_list.html",
  "fileSize": 45678
}
```

**Failed Upload:**
```json
{
  "level": "error",
  "message": "PDDA HTML upload failed",
  "error": "Access Denied",
  "correlationId": "{uuid}"
}
```

### 8.2 Metrics to Monitor

- Upload success rate (target: >99%)
- Upload latency (p50, p95, p99)
- File size distribution
- S3 error rate by error type
- Authentication failures

## 9. Open Questions & Clarifications Needed

### Critical for Implementation

1. **Exact endpoint path:** Is `POST /api/v1/pdda-html` correct, or should it follow a different pattern?
2. **Multipart field name:** Confirm the file field name is `"file"` and artefact type field is `"artefact_type"`
3. **Maximum file size:** Currently set to 10MB - is this correct?
4. **S3 object key strategy:** Using date-based path + UUID (`pdda-html/YYYY/MM/DD/{uuid}.html`) - confirm this is acceptable
5. **Idempotency:** Should duplicate uploads be prevented? If yes, by what mechanism (correlation ID, content hash, filename)?
6. **Allowed MIME types:** Should we validate MIME type? If yes, which types (`text/html`, `application/octet-stream`)?
7. **S3 overwrite behavior:** Should we allow overwriting existing files with same key, or ensure uniqueness?

### Important for Testing

8. **Test S3 bucket:** Do we have a separate S3 bucket for testing/staging?
9. **S3 credentials rotation:** How are AWS credentials rotated? Does Key Vault handle automatic rotation?

### Important for Operations

10. **Monitoring/alerting:** What metrics should trigger alerts (error rate threshold, latency threshold)?
11. **Retry strategy:** Should the API support automatic retries? Or is client-side retry expected?
12. **Rate limiting:** Should this endpoint have rate limiting to prevent abuse?

### Future Considerations

13. **Artefact table integration:** Should LCSU uploads create artefact table records, or remain S3-only?
14. **File retention policy:** How long should files remain in S3? Is lifecycle policy needed?
15. **File format validation:** Should we validate HTML structure, or accept any content with .html extension?

---

## 10. Summary

This implementation adds PDDA HTML upload capability to CaTH following HMCTS monorepo conventions:

- **New module:** `libs/pdda-html-upload` with functional service pattern
- **Database change:** Add `type` column to `artefact` table via migration
- **New endpoint:** `POST /api/v1/pdda-html` with OAuth authentication
- **AWS integration:** S3 SDK for direct upload to XHIBIT bucket
- **Security:** File validation, path traversal protection, size limits
- **Observability:** Structured logging with correlation IDs, no sensitive data

**Key Files to Modify:**
- `apps/api/src/app.ts` - Register pdda-html-upload routes
- `apps/postgres/prisma/schema.prisma` - Add `type` field to Artefact model
- `tsconfig.json` - Add `@hmcts/pdda-html-upload` path alias

**Dependencies to Add:**
- `@aws-sdk/client-s3@3.712.0`
- `multer@1.4.5-lts.1`
- `@types/multer@1.4.12` (devDependency)

**Environment Variables to Add:**
- `AWS_S3_XHIBIT_BUCKET_NAME`
- `AWS_S3_XHIBIT_REGION`
- `AWS_S3_XHIBIT_PREFIX`
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `PDDA_HTML_MAX_FILE_SIZE`

Next step: Review clarifications needed, then proceed with implementation tasks.
