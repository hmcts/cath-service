# VIBE-229 Technical Implementation Plan

## Overview

This document outlines the technical approach for implementing the media account rejection flow in the CaTH service. The implementation follows HMCTS monorepo conventions and patterns established in the codebase.

---

## Architecture Decisions

### 1. Module Structure

Create a new library module: `libs/media-admin`

**Rationale**:
- Separates media administration concerns from general admin pages
- Allows for future expansion (accept flow, media user management)
- Follows existing pattern (`libs/admin-pages`, `libs/system-admin-pages`)
- Enables independent testing and deployment

**Structure**:
```
libs/media-admin/
├── package.json
├── tsconfig.json
├── prisma/
│   └── schema.prisma              # Media application schema
└── src/
    ├── config.ts                  # Module configuration exports
    ├── index.ts                   # Business logic exports
    ├── pages/                     # Page controllers and templates
    │   ├── media-requests/
    │   │   ├── index.ts           # List view controller
    │   │   ├── index.njk          # List view template
    │   │   ├── en.ts              # English translations
    │   │   └── cy.ts              # Welsh translations
    │   ├── media-request-details/
    │   │   ├── index.ts           # Details view controller
    │   │   ├── index.njk          # Details view template
    │   │   ├── en.ts
    │   │   └── cy.ts
    │   ├── reject-application/
    │   │   ├── index.ts           # Select reasons controller
    │   │   ├── index.njk          # Select reasons template
    │   │   ├── en.ts
    │   │   └── cy.ts
    │   ├── reject-confirm/
    │   │   ├── index.ts           # Confirm rejection controller
    │   │   ├── index.njk          # Confirm rejection template
    │   │   ├── en.ts
    │   │   └── cy.ts
    │   └── reject-complete/
    │       ├── index.ts           # Success page controller
    │       ├── index.njk          # Success page template
    │       ├── en.ts
    │       └── cy.ts
    ├── routes/                    # API routes
    │   └── download-proof.ts      # File download endpoint
    ├── assets/                    # Module-specific assets
    │   ├── css/
    │   │   └── media-admin.scss
    │   └── js/
    │       └── auto-redirect.ts   # Auto-redirect on success page
    └── media-application/         # Domain logic
        ├── model.ts               # Data models and types
        ├── queries.ts             # Database queries
        ├── service.ts             # Business logic
        ├── validation.ts          # Form validation
        ├── file-storage.ts        # File operations
        └── email-service.ts       # Email notifications
```

---

### 2. Database Schema Design

**Location**: `libs/media-admin/prisma/schema.prisma`

```prisma
generator client {
  provider = "prisma-client-js"
  output   = "../../../node_modules/.prisma/client"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model MediaApplication {
  id                   String            @id @default(cuid())
  fullName             String            @map("full_name")
  email                String            @unique
  employer             String
  proofOfIdFileName    String?           @map("proof_of_id_file_name")
  proofOfIdFileSize    Int?              @map("proof_of_id_file_size")
  proofOfIdMimeType    String?           @map("proof_of_id_mime_type")
  status               ApplicationStatus @default(PENDING)
  rejectionReasons     String[]          @map("rejection_reasons")
  rejectionOther       String?           @map("rejection_other")
  createdAt            DateTime          @default(now()) @map("created_at")
  processedAt          DateTime?         @map("processed_at")
  processedBy          String?           @map("processed_by") @db.Uuid

  @@index([status])
  @@index([createdAt])
  @@map("media_application")
}

enum ApplicationStatus {
  PENDING
  APPROVED
  REJECTED

  @@map("application_status")
}
```

**Design Decisions**:
- Use `cuid()` for IDs (consistent with codebase pattern)
- Email is unique to prevent duplicate applications
- `rejectionReasons` stored as string array for flexibility
- Indexes on `status` and `createdAt` for efficient queries
- `processedBy` stores admin user ID for audit trail
- Snake_case database names with `@map` (follows HMCTS convention)

---

### 3. File Storage Approach

**Strategy**: Temporary file system storage with cleanup job

**Storage Path**: `/tmp/media-applications/{application-id}/{filename}`

**Implementation**:

```typescript
// libs/media-admin/src/media-application/file-storage.ts

import fs from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";

const BASE_PATH = process.env.MEDIA_FILES_PATH || "/tmp/media-applications";
const RETENTION_DAYS = Number.parseInt(process.env.MEDIA_FILES_RETENTION_DAYS || "30", 10);

export async function saveProofOfId(
  applicationId: string,
  fileBuffer: Buffer,
  originalFileName: string
): Promise<string> {
  const dirPath = path.join(BASE_PATH, applicationId);
  await fs.mkdir(dirPath, { recursive: true });

  const fileName = `${applicationId}_${sanitizeFileName(originalFileName)}`;
  const filePath = path.join(dirPath, fileName);

  await fs.writeFile(filePath, fileBuffer);

  return fileName;
}

export async function getProofOfId(
  applicationId: string,
  fileName: string
): Promise<{ buffer: Buffer; mimeType: string } | null> {
  const filePath = getFilePath(applicationId, fileName);

  try {
    const buffer = await fs.readFile(filePath);
    const mimeType = getMimeTypeFromExtension(fileName);
    return { buffer, mimeType };
  } catch (error) {
    if (error.code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

export async function deleteProofOfId(
  applicationId: string,
  fileName: string
): Promise<void> {
  const dirPath = path.join(BASE_PATH, applicationId);

  try {
    await fs.rm(dirPath, { recursive: true, force: true });
  } catch (error) {
    console.error(`Failed to delete proof of ID for ${applicationId}:`, error);
  }
}

export async function cleanupOldFiles(): Promise<void> {
  const applications = await fs.readdir(BASE_PATH);
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - RETENTION_DAYS);

  for (const applicationId of applications) {
    const dirPath = path.join(BASE_PATH, applicationId);
    const stats = await fs.stat(dirPath);

    if (stats.mtime < cutoffDate) {
      await fs.rm(dirPath, { recursive: true, force: true });
    }
  }
}

function getFilePath(applicationId: string, fileName: string): string {
  // Prevent directory traversal
  const sanitized = path.basename(fileName);
  return path.join(BASE_PATH, applicationId, sanitized);
}

function sanitizeFileName(fileName: string): string {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function getMimeTypeFromExtension(fileName: string): string {
  const ext = path.extname(fileName).toLowerCase();
  const mimeTypes: Record<string, string> = {
    ".pdf": "application/pdf",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".doc": "application/msword",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  };
  return mimeTypes[ext] || "application/octet-stream";
}
```

**Alternative for Production**: Azure Blob Storage
- Store files in blob container with SAS tokens
- Automatic retention policies
- Better scalability and reliability
- Implementation would swap out file-storage.ts

---

### 4. Email Service Integration (Gov.Notify)

**Setup**:
1. Install Gov.Notify client: `yarn add notifications-node-client`
2. Configure API key in environment variables
3. Create email template in Gov.Notify dashboard
4. Implement email service with retry logic

**Implementation**:

```typescript
// libs/media-admin/src/media-application/email-service.ts

import { NotifyClient } from "notifications-node-client";

const NOTIFY_API_KEY = process.env.GOV_NOTIFY_API_KEY || "";
const REJECTION_TEMPLATE_ID = process.env.GOV_NOTIFY_REJECTION_TEMPLATE_ID || "";

const notifyClient = new NotifyClient(NOTIFY_API_KEY);

export async function sendRejectionEmail(
  email: string,
  fullName: string,
  rejectionReasons: string[],
  rejectionOther?: string,
  language: "en" | "cy" = "en"
): Promise<void> {
  const formattedReasons = formatRejectionReasons(rejectionReasons, rejectionOther, language);

  const personalisation = {
    applicant_name: fullName,
    rejection_reasons: formattedReasons,
    service_name: language === "cy" ? "Gwrandawiadau Llysoedd a Thribiwnlysoedd" : "Courts and Tribunals Hearings",
    contact_email: "cath-support@justice.gov.uk"
  };

  try {
    await notifyClient.sendEmail(REJECTION_TEMPLATE_ID, email, {
      personalisation,
      reference: `media-rejection-${Date.now()}`
    });
  } catch (error) {
    console.error("Failed to send rejection email:", error);
    throw new EmailSendError("Failed to send rejection notification", { cause: error });
  }
}

function formatRejectionReasons(
  reasons: string[],
  other: string | undefined,
  language: "en" | "cy"
): string {
  const reasonLabels: Record<string, { en: string; cy: string }> = {
    invalid_id: {
      en: "Proof of ID not valid",
      cy: "Prawf adnabyddiaeth ddim yn ddilys"
    },
    expired_id: {
      en: "Proof of ID expired",
      cy: "Prawf adnabyddiaeth wedi dod i ben"
    },
    not_media: {
      en: "Not a media organization",
      cy: "Nid sefydliad cyfryngau"
    },
    duplicate: {
      en: "Duplicate application",
      cy: "Cais dyblyg"
    },
    other: {
      en: `Other: ${other}`,
      cy: `Arall: ${other}`
    }
  };

  return reasons
    .map((reason) => `• ${reasonLabels[reason]?.[language] || reason}`)
    .join("\n");
}

class EmailSendError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "EmailSendError";
  }
}

export { EmailSendError };
```

**Email Template Setup** (Gov.Notify Dashboard):

Template Name: `Media Account Rejection`

Subject: `Media account application - Decision`

Body (English):
```
Dear ((applicant_name)),

Your application for a media account on the ((service_name)) service has been rejected.

Reason(s) for rejection:
((rejection_reasons))

If you believe this decision is incorrect, please contact us at ((contact_email)).

You can submit a new application if you have additional information to provide.

Regards,
HMCTS Courts and Tribunals Hearings Team
```

---

### 5. Page Controller Pattern

All page controllers follow this pattern:

```typescript
// libs/media-admin/src/pages/[page-name]/index.ts

import { requireRole, USER_ROLES } from "@hmcts/auth";
import type { Request, RequestHandler, Response } from "express";
import { en } from "./en.js";
import { cy } from "./cy.js";

const getHandler = async (req: Request, res: Response) => {
  const locale = req.query.lng === "cy" ? "cy" : "en";
  const t = locale === "cy" ? cy : en;

  // Controller logic here

  res.render("[page-name]/index", {
    ...t,
    // Additional template data
  });
};

const postHandler = async (req: Request, res: Response) => {
  const locale = req.query.lng === "cy" ? "cy" : "en";
  const t = locale === "cy" ? cy : en;

  // Form processing logic

  res.redirect("/next-page");
};

export const GET: RequestHandler[] = [
  requireRole([USER_ROLES.INTERNAL_ADMIN_CTSC, USER_ROLES.SYSTEM_ADMIN]),
  getHandler
];

export const POST: RequestHandler[] = [
  requireRole([USER_ROLES.INTERNAL_ADMIN_CTSC, USER_ROLES.SYSTEM_ADMIN]),
  postHandler
];
```

---

### 6. Form Validation Strategy

**Validation Layer**: Separate validation functions for each form

```typescript
// libs/media-admin/src/media-application/validation.ts

export function validateRejectionReasons(
  reasons: string[] | undefined,
  other: string | undefined,
  translations: any
): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!reasons || reasons.length === 0) {
    errors.push({
      text: translations.errorMessages.reasonRequired,
      href: "#rejection-reasons"
    });
    return errors;
  }

  if (reasons.includes("other")) {
    if (!other || other.trim() === "") {
      errors.push({
        text: translations.errorMessages.otherRequired,
        href: "#other-reason"
      });
    } else if (other.length > 500) {
      errors.push({
        text: translations.errorMessages.otherTooLong,
        href: "#other-reason"
      });
    }
  }

  return errors;
}

export function validateConfirmation(
  confirmation: string | undefined,
  translations: any
): ValidationError[] {
  if (!confirmation) {
    return [{
      text: translations.errorMessages.confirmationRequired,
      href: "#confirmation"
    }];
  }

  return [];
}

interface ValidationError {
  text: string;
  href: string;
}
```

---

### 7. Session Management

**Session Structure**:

```typescript
// Extended session interface
declare module "express-session" {
  interface SessionData {
    mediaRejection?: {
      applicationId: string;
      reasons: string[];
      other?: string;
    };
  }
}
```

**Session Flow**:
1. Select reasons page: Store in `req.session.mediaRejection`
2. Confirm page: Read from session, validate still present
3. Complete page: Clear session data
4. Session saved after each step using `req.session.save()`

---

### 8. Routing Structure

**URL Mapping to File Structure**:

```
URL: /admin/media-requests
File: libs/media-admin/src/pages/media-requests/index.ts

URL: /admin/media-requests/[id]
File: libs/media-admin/src/pages/media-requests/[id].ts

URL: /admin/media-requests/[id]/reject
File: libs/media-admin/src/pages/media-requests/[id]/reject.ts

URL: /admin/media-requests/[id]/reject/confirm
File: libs/media-admin/src/pages/media-requests/[id]/reject/confirm.ts

URL: /admin/media-requests/[id]/reject/complete
File: libs/media-admin/src/pages/media-requests/[id]/reject/complete.ts
```

**Simple Router Configuration**:
- Routes discovered automatically from file structure
- Dynamic segments use `[id]` notation
- Accessed via `req.params.id` in controllers

---

### 9. Database Query Layer

**Implementation**:

```typescript
// libs/media-admin/src/media-application/queries.ts

import { prisma } from "@hmcts/postgres";
import type { ApplicationStatus } from "@prisma/client";

export async function getPendingApplicationsCount(): Promise<number> {
  return prisma.mediaApplication.count({
    where: { status: "PENDING" }
  });
}

export async function getPendingApplications() {
  return prisma.mediaApplication.findMany({
    where: { status: "PENDING" },
    select: {
      id: true,
      fullName: true,
      email: true,
      employer: true,
      createdAt: true
    },
    orderBy: { createdAt: "asc" }
  });
}

export async function getApplicationById(id: string) {
  return prisma.mediaApplication.findUnique({
    where: { id },
    select: {
      id: true,
      fullName: true,
      email: true,
      employer: true,
      proofOfIdFileName: true,
      proofOfIdFileSize: true,
      proofOfIdMimeType: true,
      status: true,
      createdAt: true,
      processedAt: true
    }
  });
}

export async function rejectApplication(
  id: string,
  reasons: string[],
  other: string | undefined,
  userId: string
): Promise<void> {
  await prisma.mediaApplication.update({
    where: { id },
    data: {
      status: "REJECTED",
      rejectionReasons: reasons,
      rejectionOther: other,
      processedAt: new Date(),
      processedBy: userId
    }
  });
}
```

**Query Optimization**:
- Use `select` to fetch only required fields
- Leverage indexes on `status` and `createdAt`
- Consider pagination for large result sets (future enhancement)

---

### 10. Business Logic Layer

**Service Functions**:

```typescript
// libs/media-admin/src/media-application/service.ts

import { deleteProofOfId } from "./file-storage.js";
import { sendRejectionEmail } from "./email-service.js";
import { getApplicationById, rejectApplication } from "./queries.js";

export async function processRejection(
  applicationId: string,
  reasons: string[],
  other: string | undefined,
  userId: string,
  language: "en" | "cy" = "en"
): Promise<{ success: boolean; emailSent: boolean }> {
  // Get application details
  const application = await getApplicationById(applicationId);

  if (!application) {
    throw new Error("Application not found");
  }

  if (application.status !== "PENDING") {
    throw new Error("Application already processed");
  }

  // Update database
  await rejectApplication(applicationId, reasons, other, userId);

  // Delete proof of ID file
  if (application.proofOfIdFileName) {
    await deleteProofOfId(applicationId, application.proofOfIdFileName);
  }

  // Send email (don't fail if email send fails)
  let emailSent = true;
  try {
    await sendRejectionEmail(
      application.email,
      application.fullName,
      reasons,
      other,
      language
    );
  } catch (error) {
    console.error("Failed to send rejection email:", error);
    emailSent = false;
  }

  return { success: true, emailSent };
}
```

---

## Integration Points

### 1. Admin Dashboard Updates

**File**: `libs/admin-pages/src/pages/admin-dashboard/index.ts`

**Changes**:
- Import `getPendingApplicationsCount` from `@hmcts/media-admin`
- Query count in GET handler
- Pass count to template
- Template conditionally renders notification banner

```typescript
import { getPendingApplicationsCount } from "@hmcts/media-admin";

const getHandler = async (req: Request, res: Response) => {
  const locale = req.query.lng === "cy" ? "cy" : "en";
  const t = locale === "cy" ? cy : en;

  const pendingMediaRequests = await getPendingApplicationsCount();

  res.render("admin-dashboard/index", {
    ...t,
    pendingMediaRequests
  });
};
```

**Template**: `libs/admin-pages/src/pages/admin-dashboard/index.njk`

```html
{% if pendingMediaRequests > 0 %}
<div class="govuk-notification-banner govuk-notification-banner--info" role="region" aria-labelledby="pending-requests">
  <div class="govuk-notification-banner__header">
    <h2 class="govuk-notification-banner__title" id="pending-requests">
      {{ importantLabel }}
    </h2>
  </div>
  <div class="govuk-notification-banner__content">
    <p class="govuk-body">
      {{ pendingRequestsMessage.replace('{count}', pendingMediaRequests) }}
    </p>
  </div>
</div>
{% endif %}
```

---

### 2. Web Application Registration

**File**: `apps/web/src/app.ts`

**Changes**:
- Import media-admin module configuration
- Register page routes with simple-router
- Add module root to govuk frontend paths

```typescript
import { pageRoutes as mediaAdminPages, moduleRoot as mediaAdminModuleRoot } from "@hmcts/media-admin/config";

// Add to modulePaths array
const modulePaths = [
  __dirname,
  webCoreModuleRoot,
  adminModuleRoot,
  mediaAdminModuleRoot,  // <-- Add this
  // ... other modules
];

// Register routes (after admin-pages routes)
app.use(await createSimpleRouter(mediaAdminPages, pageRoutes));
```

---

### 3. Postgres Schema Discovery

**File**: `apps/postgres/src/schema-discovery.ts`

**Changes**:
- Import media-admin schema path
- Add to schema paths array

```typescript
import { prismaSchemas as mediaAdminSchemas } from "@hmcts/media-admin/config";

export function getPrismaSchemas(): string[] {
  return [
    subscriptionsSchemas,
    locationSchemas,
    mediaAdminSchemas  // <-- Add this
  ];
}
```

---

### 4. Root TypeScript Configuration

**File**: `tsconfig.json`

**Changes**:
- Add media-admin to paths mapping

```json
{
  "compilerOptions": {
    "paths": {
      "@hmcts/media-admin": ["libs/media-admin/src"],
      "@hmcts/media-admin/config": ["libs/media-admin/src/config.ts"],
      // ... other paths
    }
  }
}
```

---

## Development Workflow

### 1. Local Development Setup

```bash
# Create module structure
mkdir -p libs/media-admin/src/{pages,routes,assets/{css,js},media-application}
mkdir -p libs/media-admin/prisma

# Create package.json
cd libs/media-admin
yarn init -y

# Install dependencies
yarn add @hmcts/auth @hmcts/postgres @hmcts/web-core
yarn add -D typescript vitest @types/node

# Generate Prisma client
yarn db:generate

# Run migrations
yarn db:migrate:dev

# Start development server
yarn dev
```

### 2. Testing Strategy

**Unit Tests**:
```bash
# Test individual functions
yarn workspace @hmcts/media-admin test

# Test with coverage
yarn workspace @hmcts/media-admin test --coverage

# Watch mode
yarn workspace @hmcts/media-admin test:watch
```

**E2E Tests**:
```bash
# Run Playwright tests
yarn test:e2e
```

### 3. Database Migrations

```bash
# Create new migration
cd apps/postgres
yarn migrate:dev --name add_media_application_table

# Apply migrations
yarn db:migrate

# Reset database (caution: deletes all data)
yarn db:drop
```

---

## Security Implementation

### 1. Authentication Middleware

All routes protected with `requireRole` middleware:

```typescript
export const GET: RequestHandler[] = [
  requireRole([USER_ROLES.INTERNAL_ADMIN_CTSC, USER_ROLES.SYSTEM_ADMIN]),
  getHandler
];
```

### 2. File Download Security

```typescript
// libs/media-admin/src/routes/download-proof.ts

import { requireRole, USER_ROLES } from "@hmcts/auth";
import type { Request, RequestHandler, Response } from "express";
import { getApplicationById } from "../media-application/queries.js";
import { getProofOfId } from "../media-application/file-storage.js";

const downloadHandler = async (req: Request, res: Response) => {
  const { id } = req.params;

  // Validate application exists and get file details
  const application = await getApplicationById(id);

  if (!application || !application.proofOfIdFileName) {
    return res.status(404).render("errors/404", {
      message: "File not found"
    });
  }

  // Get file from storage
  const file = await getProofOfId(id, application.proofOfIdFileName);

  if (!file) {
    return res.status(404).render("errors/404", {
      message: "File not found"
    });
  }

  // Set security headers
  res.setHeader("Content-Type", file.mimeType);
  res.setHeader("Content-Disposition", `attachment; filename="${application.proofOfIdFileName}"`);
  res.setHeader("X-Content-Type-Options", "nosniff");

  // Stream file to response
  res.send(file.buffer);
};

export const GET: RequestHandler[] = [
  requireRole([USER_ROLES.INTERNAL_ADMIN_CTSC, USER_ROLES.SYSTEM_ADMIN]),
  downloadHandler
];
```

### 3. Input Sanitization

```typescript
// Sanitize user input before database storage
function sanitizeInput(input: string): string {
  return input.trim().replace(/[<>]/g, "");
}

// Validate array input
function validateReasonsCodes(reasons: unknown): string[] {
  if (!Array.isArray(reasons)) {
    return [];
  }

  const validReasons = ["invalid_id", "expired_id", "not_media", "duplicate", "other"];
  return reasons.filter((r) => typeof r === "string" && validReasons.includes(r));
}
```

---

## Performance Optimization

### 1. Database Indexes

```prisma
model MediaApplication {
  // ... fields ...

  @@index([status])         // Fast filtering by status
  @@index([createdAt])      // Fast sorting by date
  @@index([email])          // Fast duplicate checking (automatic with @unique)
}
```

### 2. Query Optimization

```typescript
// Only select needed fields
const applications = await prisma.mediaApplication.findMany({
  where: { status: "PENDING" },
  select: {
    id: true,
    fullName: true,
    email: true,
    employer: true,
    createdAt: true
  },
  // Add pagination for large datasets
  take: 50,
  skip: page * 50
});
```

### 3. File Streaming

```typescript
// Stream files instead of loading into memory
import { createReadStream } from "node:fs";

const stream = createReadStream(filePath);
stream.pipe(res);
```

---

## Error Handling Strategy

### 1. Controller Error Handling

```typescript
const getHandler = async (req: Request, res: Response) => {
  try {
    const application = await getApplicationById(req.params.id);

    if (!application) {
      return res.status(404).render("errors/404", {
        title: "Application not found",
        message: "The application you're looking for could not be found."
      });
    }

    if (application.status !== "PENDING") {
      return res.status(400).render("errors/error", {
        title: "Application already processed",
        message: `This application has already been ${application.status.toLowerCase()}.`
      });
    }

    res.render("media-request-details/index", { application });
  } catch (error) {
    console.error("Error loading application:", error);
    res.status(500).render("errors/500", {
      title: "Something went wrong",
      message: "There was a problem loading the application. Please try again later."
    });
  }
};
```

### 2. Service Layer Error Handling

```typescript
// Custom error types
export class ApplicationNotFoundError extends Error {
  constructor(id: string) {
    super(`Application ${id} not found`);
    this.name = "ApplicationNotFoundError";
  }
}

export class ApplicationAlreadyProcessedError extends Error {
  constructor(id: string, status: string) {
    super(`Application ${id} already ${status}`);
    this.name = "ApplicationAlreadyProcessedError";
  }
}

// Service function with error handling
export async function processRejection(
  applicationId: string,
  reasons: string[],
  other: string | undefined,
  userId: string
): Promise<ProcessRejectionResult> {
  const application = await getApplicationById(applicationId);

  if (!application) {
    throw new ApplicationNotFoundError(applicationId);
  }

  if (application.status !== "PENDING") {
    throw new ApplicationAlreadyProcessedError(applicationId, application.status);
  }

  // ... rest of processing
}
```

---

## Accessibility Implementation

### 1. GOV.UK Component Usage

All pages use GOV.UK Design System components:

```html
{% from "govuk/components/button/macro.njk" import govukButton %}
{% from "govuk/components/checkboxes/macro.njk" import govukCheckboxes %}
{% from "govuk/components/error-summary/macro.njk" import govukErrorSummary %}
{% from "govuk/components/notification-banner/macro.njk" import govukNotificationBanner %}
{% from "govuk/components/panel/macro.njk" import govukPanel %}
{% from "govuk/components/radios/macro.njk" import govukRadios %}
{% from "govuk/components/summary-list/macro.njk" import govukSummaryList %}
{% from "govuk/components/table/macro.njk" import govukTable %}
{% from "govuk/components/textarea/macro.njk" import govukTextarea %}
```

### 2. Error Summary Pattern

```html
{% if errors %}
  {{ govukErrorSummary({
    titleText: errorSummaryTitle,
    errorList: errors
  }) }}
{% endif %}
```

### 3. Form Field Errors

```typescript
// Controller generates error format
const errors: ValidationError[] = [
  {
    text: "Select at least one reason for rejection",
    href: "#rejection-reasons"
  }
];

// Template renders with error message
{{ govukCheckboxes({
  name: "rejectionReasons",
  errorMessage: errors.rejectionReasons and {
    text: errors.rejectionReasons.text
  },
  items: [...]
}) }}
```

### 4. Keyboard Navigation

- All interactive elements accessible via Tab key
- Logical tab order (top to bottom, left to right)
- Focus indicators visible (GOV.UK default styles)
- Skip links for screen readers

### 5. Screen Reader Support

```html
<!-- Visually hidden but available to screen readers -->
<h1 class="govuk-visually-hidden">Media account requests</h1>

<!-- Table caption for context -->
<table class="govuk-table">
  <caption class="govuk-table__caption govuk-table__caption--m">
    Pending media account applications
  </caption>
  <!-- ... -->
</table>

<!-- Action links with context -->
<a href="/admin/media-requests/{{ id }}" aria-label="View application from {{ fullName }}">
  View application
</a>
```

---

## Welsh Language Implementation

### 1. Translation File Structure

**English** (`libs/media-admin/src/pages/media-requests/en.ts`):
```typescript
export const en = {
  pageTitle: "Manage media account requests",
  heading: "Media account requests",
  noRequests: "There are no pending media account requests",
  tableHeaders: {
    name: "Name",
    email: "Email",
    employer: "Employer",
    dateApplied: "Date applied",
    action: "Action"
  },
  viewApplication: "View application",
  backLink: "Back to admin dashboard"
};
```

**Welsh** (`libs/media-admin/src/pages/media-requests/cy.ts`):
```typescript
export const cy = {
  pageTitle: "Rheoli ceisiadau cyfrif cyfryngau",
  heading: "Ceisiadau cyfrif cyfryngau",
  noRequests: "Nid oes ceisiadau cyfrif cyfryngau yn yr arfaeth",
  tableHeaders: {
    name: "Enw",
    email: "E-bost",
    employer: "Cyflogwr",
    dateApplied: "Dyddiad ymgeisio",
    action: "Camau gweithredu"
  },
  viewApplication: "Gweld cais",
  backLink: "Yn ôl i'r bwrdd gweinyddu"
};
```

### 2. Controller Language Selection

```typescript
const getHandler = async (req: Request, res: Response) => {
  const locale = req.query.lng === "cy" ? "cy" : "en";
  const t = locale === "cy" ? cy : en;

  res.render("media-requests/index", {
    ...t,
    locale
  });
};
```

### 3. Template Language Switching

```html
<!-- Language toggle (if not hidden) -->
{% if not hideLanguageToggle %}
<nav class="govuk-language-toggle">
  <ul class="govuk-language-toggle__list">
    <li class="govuk-language-toggle__list-item">
      <a href="?lng=en" class="govuk-link" lang="en" hreflang="en">English</a>
    </li>
    <li class="govuk-language-toggle__list-item">
      <a href="?lng=cy" class="govuk-link" lang="cy" hreflang="cy">Cymraeg</a>
    </li>
  </ul>
</nav>
{% endif %}
```

---

## Testing Implementation

### 1. Unit Tests

```typescript
// libs/media-admin/src/media-application/validation.test.ts

import { describe, it, expect } from "vitest";
import { validateRejectionReasons } from "./validation.js";

describe("validateRejectionReasons", () => {
  const translations = {
    errorMessages: {
      reasonRequired: "Select at least one reason",
      otherRequired: "Enter details for other reason",
      otherTooLong: "Details must be 500 characters or less"
    }
  };

  it("should return error if no reasons selected", () => {
    const errors = validateRejectionReasons([], undefined, translations);
    expect(errors).toHaveLength(1);
    expect(errors[0].text).toBe("Select at least one reason");
  });

  it("should return error if other selected but no text", () => {
    const errors = validateRejectionReasons(["other"], undefined, translations);
    expect(errors).toHaveLength(1);
    expect(errors[0].text).toBe("Enter details for other reason");
  });

  it("should pass validation with valid reasons", () => {
    const errors = validateRejectionReasons(["invalid_id", "not_media"], undefined, translations);
    expect(errors).toHaveLength(0);
  });

  it("should pass validation with other and text", () => {
    const errors = validateRejectionReasons(["other"], "Some reason", translations);
    expect(errors).toHaveLength(0);
  });
});
```

### 2. Integration Tests

```typescript
// libs/media-admin/src/media-application/service.test.ts

import { describe, it, expect, vi, beforeEach } from "vitest";
import { processRejection } from "./service.js";

vi.mock("@hmcts/postgres", () => ({
  prisma: {
    mediaApplication: {
      findUnique: vi.fn(),
      update: vi.fn()
    }
  }
}));

vi.mock("./file-storage.js", () => ({
  deleteProofOfId: vi.fn()
}));

vi.mock("./email-service.js", () => ({
  sendRejectionEmail: vi.fn()
}));

describe("processRejection", () => {
  it("should reject application and send email", async () => {
    // Test implementation
  });

  it("should throw error if application not found", async () => {
    // Test implementation
  });

  it("should continue if email send fails", async () => {
    // Test implementation
  });
});
```

### 3. E2E Tests

```typescript
// e2e-tests/tests/media-admin/reject-application.spec.ts

import { test, expect } from "@playwright/test";

test.describe("Reject media application", () => {
  test.beforeEach(async ({ page }) => {
    // Login as CTSC admin
    await page.goto("/sign-in");
    // ... login steps
  });

  test("complete rejection flow", async ({ page }) => {
    // Navigate to media requests
    await page.goto("/admin/media-requests");

    // Click view application
    await page.click('a:has-text("View application")');

    // Click reject button
    await page.click('button:has-text("Reject application")');

    // Select rejection reasons
    await page.check('[name="rejectionReasons"][value="invalid_id"]');
    await page.check('[name="rejectionReasons"][value="not_media"]');

    // Continue
    await page.click('button:has-text("Continue")');

    // Confirm rejection
    await page.check('[name="confirmation"][value="yes"]');
    await page.click('button:has-text("Continue")');

    // Verify success page
    await expect(page.locator("text=Account request has been rejected")).toBeVisible();
  });

  test("shows validation error if no reasons selected", async ({ page }) => {
    await page.goto("/admin/media-requests/test-id/reject");

    await page.click('button:has-text("Continue")');

    await expect(page.locator(".govuk-error-summary")).toBeVisible();
    await expect(page.locator("text=Select at least one reason")).toBeVisible();
  });

  test("supports Welsh language", async ({ page }) => {
    await page.goto("/admin/media-requests?lng=cy");

    await expect(page.locator("text=Ceisiadau cyfrif cyfryngau")).toBeVisible();
  });
});
```

### 4. Accessibility Tests

```typescript
// e2e-tests/tests/media-admin/accessibility.spec.ts

import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.describe("Media admin accessibility", () => {
  test("media requests list meets WCAG 2.2 AA", async ({ page }) => {
    await page.goto("/admin/media-requests");

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag22aa"])
      .analyze();

    expect(results.violations).toEqual([]);
  });

  test("reject application form meets WCAG 2.2 AA", async ({ page }) => {
    await page.goto("/admin/media-requests/test-id/reject");

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag22aa"])
      .analyze();

    expect(results.violations).toEqual([]);
  });
});
```

---

## Deployment Steps

### 1. Pre-Deployment

```bash
# Run all tests
yarn test

# Run E2E tests
yarn test:e2e

# Run linter
yarn lint:fix

# Build all packages
yarn build

# Verify database migrations
yarn db:migrate --dry-run
```

### 2. Database Migration

```bash
# Production migration
NODE_ENV=production yarn db:migrate
```

### 3. Environment Variables

```bash
# Add to Azure Key Vault or environment config
GOV_NOTIFY_API_KEY=your_api_key_here
GOV_NOTIFY_REJECTION_TEMPLATE_ID=template_id_here
MEDIA_FILES_PATH=/tmp/media-applications
MEDIA_FILES_RETENTION_DAYS=30
```

### 4. Gov.Notify Configuration

1. Login to Gov.Notify dashboard
2. Create new email template
3. Add template content with variables
4. Get template ID
5. Test template with sample data
6. Add template ID to environment config

### 5. Post-Deployment Verification

```bash
# Verify application is running
curl https://cath.service.gov.uk/health

# Test media requests page (requires authentication)
# Manual testing of rejection flow

# Monitor logs for errors
az monitor app-insights query --app cath-insights --analytics-query "traces | where message contains 'media'"

# Verify email sending
# Check Gov.Notify dashboard for sent emails
```

---

## Monitoring & Observability

### 1. Logging

```typescript
// Log rejection actions
console.info("Media application rejected", {
  applicationId,
  reasons,
  userId,
  timestamp: new Date().toISOString()
});

// Log email failures
console.error("Failed to send rejection email", {
  applicationId,
  email,
  error: error.message,
  timestamp: new Date().toISOString()
});
```

### 2. Application Insights

```typescript
// Track custom events
import { trackEvent } from "@hmcts/cloud-native-platform";

trackEvent("MediaApplicationRejected", {
  applicationId,
  reasons: reasons.join(","),
  emailSent: emailSent.toString()
});
```

### 3. Metrics

- Count of applications rejected per day
- Email send success rate
- Average time from application to rejection
- Most common rejection reasons

### 4. Alerts

Set up alerts in Azure Monitor:
- Email send failure rate > 5%
- Database query timeouts
- File download failures
- 500 errors on media admin pages

---

## Rollback Plan

### 1. Code Rollback

```bash
# Revert to previous deployment
git revert HEAD
git push origin master

# Redeploy
yarn build
# Deploy via Azure DevOps pipeline
```

### 2. Database Rollback

```bash
# If migration needs to be reversed
cd apps/postgres
yarn migrate:reset

# Or manually drop tables
psql $DATABASE_URL -c "DROP TABLE media_application CASCADE;"
```

### 3. Feature Flag (Optional)

```typescript
// Add feature flag to disable media admin
const MEDIA_ADMIN_ENABLED = process.env.MEDIA_ADMIN_ENABLED === "true";

if (MEDIA_ADMIN_ENABLED) {
  app.use(await createSimpleRouter(mediaAdminPages));
}
```

---

## Future Enhancements

### 1. Phase 2 Features
- Accept application flow
- Request more information from applicant
- Bulk actions (reject multiple at once)
- Export applications to CSV

### 2. Technical Improvements
- Migrate to Azure Blob Storage for files
- Add Redis caching for application counts
- Implement pagination for large lists
- Add search and filtering
- Add audit trail page

### 3. User Experience
- Auto-save draft rejection reasons
- Real-time validation
- Keyboard shortcuts for common actions
- Dark mode support

---

## Dependencies and Prerequisites

### Required Dependencies

**Add to `libs/media-admin/package.json`**:
```json
{
  "dependencies": {
    "@hmcts/auth": "workspace:*",
    "@hmcts/postgres": "workspace:*",
    "@hmcts/web-core": "workspace:*",
    "notifications-node-client": "^8.2.0"
  },
  "devDependencies": {
    "@types/node": "24.10.1",
    "typescript": "5.9.3",
    "vitest": "3.2.4"
  }
}
```

### Infrastructure Prerequisites

1. **Database**: PostgreSQL 14+ with existing connection
2. **Redis**: For session storage (already configured)
3. **Gov.Notify**: Account and API key
4. **File Storage**: Writable `/tmp` directory or Azure Blob Storage
5. **Email**: Gov.Notify template created and tested

---

## Success Criteria

### Functional
- [ ] CTSC Admin can view list of pending applications
- [ ] CTSC Admin can view application details
- [ ] CTSC Admin can download proof of ID
- [ ] CTSC Admin can select rejection reasons
- [ ] CTSC Admin can confirm and complete rejection
- [ ] Application status updated in database
- [ ] Proof of ID file deleted
- [ ] Rejection email sent to applicant

### Non-Functional
- [ ] All pages load in < 2 seconds
- [ ] All pages pass WCAG 2.2 AA
- [ ] All pages support Welsh
- [ ] All pages work without JavaScript
- [ ] Unit test coverage > 80%
- [ ] E2E tests cover happy path and error scenarios
- [ ] Security review passed
- [ ] Performance review passed

---

## Risk Mitigation

### Risk: Email Send Failures
**Mitigation**:
- Don't block rejection on email failure
- Log failures for manual follow-up
- Implement retry queue
- Show warning to admin if email fails

### Risk: File Storage Issues
**Mitigation**:
- Graceful handling if file not found
- Regular cleanup of old files
- Monitor disk space
- Consider cloud storage migration

### Risk: Concurrent Processing
**Mitigation**:
- Check application status before processing
- Use database transactions
- Show error if already processed
- Add "processed by" field to prevent conflicts

### Risk: Performance with Large Lists
**Mitigation**:
- Add pagination
- Implement caching for counts
- Use database indexes
- Consider archiving old applications

---

## Timeline Estimate

### Week 1: Foundation
- [ ] Create module structure
- [ ] Define database schema
- [ ] Implement query layer
- [ ] Set up file storage
- [ ] Write unit tests

### Week 2: Core Pages
- [ ] Implement media requests list page
- [ ] Implement application details page
- [ ] Implement select reasons page
- [ ] Write page controller tests

### Week 3: Rejection Flow
- [ ] Implement confirm rejection page
- [ ] Implement complete page
- [ ] Implement email service
- [ ] Add file download endpoint
- [ ] Write integration tests

### Week 4: Integration & Polish
- [ ] Update admin dashboard
- [ ] Add Welsh translations
- [ ] Write E2E tests
- [ ] Accessibility audit
- [ ] Security review
- [ ] Performance testing

### Week 5: Deployment & Testing
- [ ] Deploy to staging
- [ ] Manual testing
- [ ] Fix bugs
- [ ] Documentation
- [ ] Deploy to production
- [ ] Monitor for issues

---

This implementation plan provides a comprehensive roadmap for building the media account rejection flow following HMCTS best practices and conventions.
