# VIBE-158: Manual Upload Form - Technical Specification

## 1. High Level Approach

Create a new `libs/admin-pages` module following the existing `libs/public-pages` pattern. Implement a single-page manual upload form at `/manual-upload` with:
- GOV.UK Design System components
- Two-column layout (form fields + help sidebar)
- File upload with validation (type, size)
- Form validation with error display
- Welsh language support
- Client-side court autocomplete
- Redis storage for temporary file and metadata storage
- Session management for form data persistence

## 2. Module Structure

```
libs/admin-pages/
├── package.json
├── tsconfig.json
└── src/
    ├── config.ts                    # Module configuration (pageRoutes export)
    ├── index.ts                     # Business logic exports
    ├── manual-upload-storage.ts     # Redis storage service
    └── pages/
        └── manual-upload/
            ├── index.ts             # GET/POST handlers
            ├── index.njk            # Form template
            ├── index.test.ts        # Unit tests
            ├── en.ts                # English content
            └── cy.ts                # Welsh content
```

### package.json
```json
{
  "name": "@hmcts/admin-pages",
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
    "build": "tsc && yarn build:nunjucks",
    "build:nunjucks": "mkdir -p dist/pages && cd src/pages && find . -name '*.njk' -exec sh -c 'mkdir -p ../../dist/pages/$(dirname {}) && cp {} ../../dist/pages/{}' \\;",
    "dev": "tsc --watch",
    "test": "vitest run",
    "test:watch": "vitest watch",
    "format": "biome format --write .",
    "lint": "biome check .",
    "lint:fix": "biome check --write ."
  },
  "peerDependencies": {
    "express": "^5.1.0"
  },
  "dependencies": {
    "@hmcts/location": "workspace:*",
    "@hmcts/redis": "workspace:*",
    "multer": "1.4.5-lts.1"
  },
  "devDependencies": {
    "@types/multer": "^1.4.12"
  }
}
```

### src/config.ts
```typescript
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const pageRoutes = { path: path.join(__dirname, "pages") };
```

## 3. Form Fields & Components

All fields use GOV.UK Design System components:

1. **Warning Text** - `govukWarningText` at top of form
2. **File Upload** - `govukFileUpload` (accepts: .csv,.doc,.docx,.htm,.html,.json,.pdf, max 2MB)
3. **Court/Tribunal Name** - `govukInput` with client-side autocomplete (use @hmcts/location data)
4. **List Type** - `govukSelect` with placeholder "Please choose a list type" (all types available for all courts)
5. **Hearing Start Date** - `govukDateInput` (day, month, year)
6. **Sensitivity** - `govukSelect` (PUBLIC, PRIVATE, CLASSIFIED)
7. **Language** - `govukSelect` (ENGLISH, WELSH, BILINGUAL)
8. **Display From Date** - `govukDateInput` (day, month, year)
9. **Display To Date** - `govukDateInput` (day, month, year) - **Required field**
10. **Continue Button** - `govukButton` (submit)

**Layout:** Two-column (govuk-grid-row):
- Left (two-thirds): Form fields
- Right (one-third): Page Help sidebar

## 4. Validation

### Server-Side Validation (POST handler)

**File Validation:**
- Required: "Select a file to upload"
- Type: "The selected file must be a csv, doc, docx, htm, html, json, or pdf"
- Size: "The selected file must be smaller than 2MB"

**Required Fields:**
- `courtId`: "Enter a court or tribunal name"
- `listType`: "Select a list type"
- `hearingStartDate`: "Enter a hearing start date"
- `sensitivity`: "Select a sensitivity level"
- `language`: "Select a language"
- `displayFrom`: "Enter a display from date"
- `displayTo`: "Enter a display to date"

**Date Validation:**
- Valid format (day, month, year all provided)
- Valid date: "Enter a valid date"
- Display to >= Display from: "Display to date must be after display from date"

**Error Display:**
- `govukErrorSummary` at top with links to fields
- `errorMessage` on individual fields
- Preserve user input on validation failure

## 5. Controller Implementation

### GET Handler
```typescript
import type { Request, Response } from "express";
import { getAllLocations } from "@hmcts/location";
import { en } from "./en.js";
import { cy } from "./cy.js";

const LIST_TYPES = [
  { value: "", text: "Please choose a list type" },
  { value: "CIVIL_DAILY_CAUSE_LIST", text: "Civil Daily Cause List" },
  { value: "FAMILY_DAILY_CAUSE_LIST", text: "Family Daily Cause List" },
  { value: "CRIMINAL_DAILY_CAUSE_LIST", text: "Criminal Daily Cause List" }
  // Add other list types as needed
];

export const GET = async (req: Request, res: Response) => {
  // Restore form data from session if available
  const data = req.session.manualUploadForm || {};

  res.render("manual-upload/index", {
    en,
    cy,
    data,
    locations: getAllLocations(),
    listTypes: LIST_TYPES
  });
};
```

### POST Handler
```typescript
import { storeManualUpload } from "../manual-upload-storage.js";

export const POST = async (req: Request, res: Response) => {
  const errors = validateForm(req.body, req.file);

  if (errors.length > 0) {
    // Store form data in session for persistence
    req.session.manualUploadForm = req.body;

    return res.render("manual-upload/index", {
      en,
      cy,
      errors,
      data: req.body,
      locations: getAllLocations(),
      listTypes: LIST_TYPES
    });
  }

  // Store file and metadata in Redis temporarily
  const uploadId = await storeManualUpload({
    file: req.file.buffer,
    fileName: req.file.originalname,
    fileType: req.file.mimetype,
    courtId: req.body.courtId,
    listType: req.body.listType,
    hearingStartDate: req.body.hearingStartDate,
    sensitivity: req.body.sensitivity,
    language: req.body.language,
    displayFrom: req.body.displayFrom,
    displayTo: req.body.displayTo
  });

  // Clear form data from session
  delete req.session.manualUploadForm;

  // Redirect to confirmation (will 404 for now)
  res.redirect("/manual-upload/confirm");
};
```

## 6. File Upload Middleware

Use multer for file upload handling:

```typescript
// src/file-upload-middleware.ts
import multer from "multer";

const ALLOWED_EXTENSIONS = /\.(csv|doc|docx|htm|html|json|pdf)$/i;
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB

const storage = multer.memoryStorage();

const fileFilter = (_req: any, file: any, cb: any) => {
  if (ALLOWED_EXTENSIONS.test(file.originalname)) {
    cb(null, true);
  } else {
    cb(new Error("Invalid file type"), false);
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE }
});
```

## 7. Redis Storage Service

Create a service to store uploaded files and metadata temporarily in Redis:

```typescript
// src/manual-upload-storage.ts
import { getRedisClient } from "@hmcts/redis";
import { randomUUID } from "node:crypto";

const UPLOAD_TTL = 3600; // 1 hour expiry

interface ManualUploadData {
  file: Buffer;
  fileName: string;
  fileType: string;
  courtId: string;
  listType: string;
  hearingStartDate: { day: string; month: string; year: string };
  sensitivity: string;
  language: string;
  displayFrom: { day: string; month: string; year: string };
  displayTo: { day: string; month: string; year: string };
}

export async function storeManualUpload(data: ManualUploadData): Promise<string> {
  const redis = getRedisClient();
  const uploadId = randomUUID();
  const key = `manual-upload:${uploadId}`;

  await redis.setex(
    key,
    UPLOAD_TTL,
    JSON.stringify({
      fileName: data.fileName,
      fileType: data.fileType,
      fileBase64: data.file.toString("base64"),
      courtId: data.courtId,
      listType: data.listType,
      hearingStartDate: data.hearingStartDate,
      sensitivity: data.sensitivity,
      language: data.language,
      displayFrom: data.displayFrom,
      displayTo: data.displayTo,
      uploadedAt: new Date().toISOString()
    })
  );

  return uploadId;
}

export async function getManualUpload(uploadId: string): Promise<ManualUploadData | null> {
  const redis = getRedisClient();
  const key = `manual-upload:${uploadId}`;
  const data = await redis.get(key);

  if (!data) {
    return null;
  }

  const parsed = JSON.parse(data);
  return {
    file: Buffer.from(parsed.fileBase64, "base64"),
    fileName: parsed.fileName,
    fileType: parsed.fileType,
    courtId: parsed.courtId,
    listType: parsed.listType,
    hearingStartDate: parsed.hearingStartDate,
    sensitivity: parsed.sensitivity,
    language: parsed.language,
    displayFrom: parsed.displayFrom,
    displayTo: parsed.displayTo
  };
}
```

## 8. Registration

### Root tsconfig.json
```json
{
  "compilerOptions": {
    "paths": {
      "@hmcts/admin-pages": ["libs/admin-pages/src"],
      "@hmcts/admin-pages/config": ["libs/admin-pages/src/config.ts"]
    }
  }
}
```

### apps/web/src/app.ts
```typescript
import { pageRoutes as adminPages } from "@hmcts/admin-pages/config";
import { upload } from "@hmcts/admin-pages";

// Register admin pages
app.use(await createSimpleRouter(adminPages));

// Apply multer middleware to upload route
app.post("/manual-upload", upload.single("file"), ...);
```

## 9. Routes

- **GET /manual-upload** - Display form (restore from session if available)
- **POST /manual-upload** - Validate, store in Redis, and redirect
- **Redirect on success** - `/manual-upload/confirm` (will 404 for now per clarification #6)

## 10. Testing Requirements

### Unit Tests (index.test.ts)
- GET renders form with locations and list types
- GET restores form data from session if available
- POST validates required fields
- POST validates file type and size
- POST validates dates
- POST preserves input in session on error
- POST stores upload in Redis on success
- POST clears session data on success
- POST redirects to confirmation on success

### Unit Tests (manual-upload-storage.test.ts)
- storeManualUpload creates Redis key with TTL
- storeManualUpload stores file as base64
- getManualUpload retrieves and decodes file
- getManualUpload returns null for missing upload

### E2E Tests (Playwright)
- Complete form submission with valid data
- File upload validation errors
- Required field validation
- Date validation
- Court autocomplete
- Form data persistence (navigate away and return)
- Welsh toggle
- Accessibility (axe-core)

## 11. Dependencies

**Root package.json:**
```json
{
  "devDependencies": {
    "@types/multer": "^1.4.12"
  }
}
```

**libs/admin-pages/package.json:**
```json
{
  "dependencies": {
    "@hmcts/location": "workspace:*",
    "@hmcts/redis": "workspace:*",
    "multer": "1.4.5-lts.1"
  }
}
```

## 12. Database Schema

**Not required for this ticket.** Files and metadata are stored temporarily in Redis (1 hour TTL). No persistent database storage needed.

## 13. Infrastructure Requirements

### 13.1 Redis
**Required**: Redis connection for temporary file storage.

- Ensure `@hmcts/redis` module is configured in `apps/web`
- Redis connection should already be available from existing infrastructure
- No additional environment variables needed (uses existing Redis config)

### 13.2 Session Management
**Required**: Express session middleware must be configured.

- Session store should use Redis (via existing session configuration)
- Session data structure:
  ```typescript
  interface SessionData {
    manualUploadForm?: {
      courtId: string;
      listType: string;
      hearingStartDate: { day: string; month: string; year: string };
      sensitivity: string;
      language: string;
      displayFrom: { day: string; month: string; year: string };
      displayTo: { day: string; month: string; year: string };
    };
  }
  ```

### 13.3 No Changes Required
- No Helm chart updates
- No Docker/Kubernetes updates
- No CI/CD pipeline changes
- No new environment variables

## CLARIFICATIONS RESOLVED

1. **Authentication**: No verification at the moment. This will be added in the future. No authentication middleware needed for this ticket.

2. **File Storage**: Yes, store in Redis temporarily (1 hour TTL). File stored as base64 string with metadata. No persistent database storage needed for this ticket.

3. **Court Search**: Client-side autocomplete, similar to how the search page works. Use accessible-autocomplete with @hmcts/location data.

4. **Upload Processing**: Validate the fields and store the file in Redis temporarily. Redirect to `/manual-upload/confirm` page after successful form submission.

5. **Display To Date**: No, it cannot be left blank. This is a required field.

6. **Success Page**: 404 for now. `/manual-upload/confirm` will be built in a future ticket.

7. **Back Navigation**: "Back to top" is not needed for this ticket. Removed from requirements.

8. **List Types Filter**: All list types are available for all courts. No filtering needed.

9. **Existing Dashboard**: Not at present. No admin dashboard integration needed for this ticket. This is a standalone page.

10. **Session Management**: Yes, form data should be preserved in session if user navigates away and returns. Store form data in `req.session.manualUploadForm` on validation error, restore on GET, and clear on successful submission.
