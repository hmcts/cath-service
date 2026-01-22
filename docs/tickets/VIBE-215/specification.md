# VIBE-215: Display of Pubs - View flat file - Technical Specification

## Overview

This specification covers the implementation of flat file viewing functionality in CaTH, enabling users to view publication files (PDF, CSV, HTML, etc.) that have been uploaded by Local Admins. The implementation focuses on serving flat files directly to users via a new page route with appropriate validation and error handling.

## High Level Technical Approach

The implementation will leverage the existing artefact storage system and extend the public-pages module with an HTML wrapper page for viewing flat files. The approach follows these principles:

1. **Reuse Existing Infrastructure**: Use the existing file storage in `storage/temp/uploads/` and the artefact database schema
2. **HTML Wrapper Pattern**: Create GOV.UK template page that embeds files and controls page title
3. **Security-First**: Validate display dates, file existence, locationId matching, and prevent directory traversal attacks
4. **Embedded File Viewing**: Use HTML `<object>` tags for PDF embedding with download fallbacks
5. **Progressive Enhancement**: Ensure core functionality works without JavaScript

### Key Design Decisions (REVISED)

- **Route Pattern**: Use `/hearing-lists/:locationId/:artefactId` as specified in ticket
- **HTML Wrapper**: Create full page template to control browser tab title and display metadata
- **Embedded Viewer**: Use `<object>` tag for PDF embedding, download links for other formats
- **Download API**: Separate endpoint `/api/flat-file/:artefactId/download` for raw file serving
- **File Storage**: Continue using filesystem storage at `storage/temp/uploads/` (Azure Blob Storage integration is a separate concern)
- **Validation Layer**: Implement service layer for business logic (date validation, file existence, locationId matching)
- **Error Handling**: Return appropriate HTTP status codes and user-friendly error pages

## File Structure and Routing

### Module Location

Add functionality to existing `libs/public-pages` module since this is public-facing functionality.

### New Files

```
libs/public-pages/src/
├── pages/
│   └── hearing-lists/
│       └── view/
│           ├── [locationId]/
│           │   ├── [artefactId].ts       # Page route handler (HTML wrapper)
│           │   └── [artefactId].njk      # Viewer page template with embedded file
│           ├── en.ts                      # English translations
│           └── cy.ts                      # Welsh translations
├── routes/
│   └── flat-file/
│       └── [artefactId]/
│           └── download.ts                # API endpoint for raw file download
├── flat-file/
│   ├── flat-file-service.ts              # Business logic for validation
│   └── flat-file-service.test.ts         # Unit tests
└── file-storage/
    ├── file-retrieval.ts                 # File system operations
    └── file-retrieval.test.ts            # Unit tests
```

### Routing Structure

**Viewer Page Route**: `/hearing-lists/:locationId/:artefactId`
- **Method**: GET only
- **Parameters**:
  - `locationId` (String) - Court/tribunal ID from URL path
  - `artefactId` (UUID with extension) - Publication file ID
- **Query Parameters**:
  - `lng` (optional) - Language selection (en/cy)
- **Response**: HTML page with:
  - GOV.UK template
  - Court name and list name in page title
  - Embedded PDF viewer (using `<object>` tag) or download link
  - Back navigation
  - Error messages if validation fails

**Download API Route**: `/api/flat-file/:artefactId/download`
- **Method**: GET only
- **Parameters**: `artefactId` (UUID with extension)
- **Response Types**:
  - PDF files: Content-Disposition: inline, application/pdf
  - CSV/text files: Content-Disposition: attachment
  - Other file types: Content-Disposition: attachment with MIME type
  - Errors: 404/410/400 status codes with JSON error response

### Integration Points

**Update summary-of-publications page template** to use the new flat file route when `isFlatFile === true`:

```typescript
// libs/public-pages/src/pages/summary-of-publications/index.ts
// Modify publication mapping to include isFlatFile flag and locationId

const publicationsWithDetails = artefacts.map((artefact) => {
  const listType = mockListTypes.find((lt) => lt.id === artefact.listTypeId);
  // ... existing mapping ...
  return {
    // ... existing fields ...
    isFlatFile: artefact.isFlatFile,
    locationId: artefact.locationId,
    urlPath: artefact.isFlatFile ? null : listType?.urlPath
  };
});
```

```html
<!-- libs/public-pages/src/pages/summary-of-publications/index.njk -->
<!-- Update link generation logic -->
{% if publication.isFlatFile %}
  <a href="/hearing-lists/{{ publication.locationId }}/{{ publication.id }}" class="govuk-link" target="_blank" rel="noopener noreferrer">
    {{ publication.listTypeName }} {{ publication.formattedDate }} - {{ publication.languageLabel }}
  </a>
{% elseif publication.urlPath %}
  <a href="/{{ publication.urlPath }}?artefactId={{ publication.id }}" class="govuk-link">
    {{ publication.listTypeName }} {{ publication.formattedDate }} - {{ publication.languageLabel }}
  </a>
{% else %}
  <a href="/publication/{{ publication.id }}" class="govuk-link">
    {{ publication.listTypeName }} {{ publication.formattedDate }} - {{ publication.languageLabel }}
  </a>
{% endif %}
```

## Implementation Details

### 1. File Storage Service

Create a file retrieval service to abstract file system operations:

```typescript
// libs/public-pages/src/file-storage/file-retrieval.ts
import fs from "node:fs/promises";
import path from "node:path";

const STORAGE_BASE = path.join(process.cwd(), "storage", "temp", "uploads");

// All flat files are PDFs - append .pdf extension automatically
export async function getFileBuffer(artefactId: string): Promise<Buffer | null> {
  const fileName = `${artefactId}.pdf`;
  const filePath = path.join(STORAGE_BASE, fileName);

  try {
    // Security: Validate resolved path is within storage directory
    const resolvedPath = path.resolve(filePath);
    const resolvedBase = path.resolve(STORAGE_BASE);

    if (!resolvedPath.startsWith(resolvedBase)) {
      return null;
    }

    return await fs.readFile(filePath);
  } catch (error) {
    return null;
  }
}

export async function fileExists(artefactId: string): Promise<boolean> {
  const fileName = `${artefactId}.pdf`;
  const filePath = path.join(STORAGE_BASE, fileName);

  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

export function getContentType(): string {
  // All flat files are PDFs
  return "application/pdf";
}

export function getFileName(artefactId: string): string {
  return `${artefactId}.pdf`;
}
```

### 2. Flat File Service (Business Logic)

```typescript
// libs/public-pages/src/flat-file/flat-file-service.ts
import { prisma } from "@hmcts/postgres";
import { getContentType, getFileBuffer, getFileName } from "../file-storage/file-retrieval.js";

export async function getFlatFileForDisplay(artefactId: string, locationId: string) {
  const artefact = await prisma.artefact.findUnique({
    where: { artefactId },
    include: {
      location: true,
      listType: true
    }
  });

  if (!artefact) {
    return { error: "NOT_FOUND" as const };
  }

  // Security: Validate locationId matches artefact
  if (artefact.locationId !== locationId) {
    return { error: "LOCATION_MISMATCH" as const };
  }

  if (!artefact.isFlatFile) {
    return { error: "NOT_FLAT_FILE" as const };
  }

  const now = new Date();
  if (now < artefact.displayFrom || now > artefact.displayTo) {
    return { error: "EXPIRED" as const };
  }

  // Check file exists before returning success
  const fileBuffer = await getFileBuffer(artefact.artefactId);

  if (!fileBuffer) {
    return { error: "FILE_NOT_FOUND" as const };
  }

  return {
    success: true,
    artefactId: artefact.artefactId,
    courtName: artefact.location.name,
    listTypeName: artefact.listType.listTypeName,
    contentDate: artefact.contentDate,
    language: artefact.language
  };
}

export async function getFileForDownload(artefactId: string) {
  const artefact = await prisma.artefact.findUnique({
    where: { artefactId }
  });

  if (!artefact) {
    return { error: "NOT_FOUND" as const };
  }

  if (!artefact.isFlatFile) {
    return { error: "NOT_FLAT_FILE" as const };
  }

  const now = new Date();
  if (now < artefact.displayFrom || now > artefact.displayTo) {
    return { error: "EXPIRED" as const };
  }

  const fileBuffer = await getFileBuffer(artefact.artefactId);

  if (!fileBuffer) {
    return { error: "FILE_NOT_FOUND" as const };
  }

  return {
    success: true,
    fileBuffer,
    contentType: getContentType(),
    fileName: getFileName(artefact.artefactId)
  };
}

type FlatFileResult = Awaited<ReturnType<typeof getFlatFileForDisplay>>;
type DownloadFileResult = Awaited<ReturnType<typeof getFileForDownload>>;
export type { FlatFileResult, DownloadFileResult };
```

### 3. HTML Wrapper Page Handler

```typescript
// libs/public-pages/src/pages/hearing-lists/view/[locationId]/[artefactId].ts
import type { Request, Response } from "express";
import { getFlatFileForDisplay } from "../../../../flat-file/flat-file-service.js";
import { cy } from "../cy.js";
import { en } from "../en.js";

export const GET = async (req: Request, res: Response) => {
  const locale = res.locals.locale || "en";
  const t = locale === "cy" ? cy : en;
  const { locationId, artefactId } = req.params;

  if (!locationId || !artefactId) {
    return res.status(400).render("hearing-lists/view/[locationId]/[artefactId]", {
      en,
      cy,
      isError: true,
      error: t.errorInvalidRequest,
      title: t.errorTitle
    });
  }

  const result = await getFlatFileForDisplay(artefactId, locationId);

  if ("error" in result) {
    let statusCode = 404;
    let errorMessage = t.errorNotFound;

    switch (result.error) {
      case "NOT_FOUND":
        statusCode = 404;
        errorMessage = t.errorNotFound;
        break;
      case "LOCATION_MISMATCH":
        statusCode = 404;
        errorMessage = t.errorNotFound;
        break;
      case "EXPIRED":
        statusCode = 410;
        errorMessage = t.errorExpired;
        break;
      case "NOT_FLAT_FILE":
        statusCode = 400;
        errorMessage = t.errorNotFlatFile;
        break;
      case "FILE_NOT_FOUND":
        statusCode = 404;
        errorMessage = t.errorFileNotFound;
        break;
    }

    return res.status(statusCode).render("hearing-lists/view/[locationId]/[artefactId]", {
      en,
      cy,
      isError: true,
      error: errorMessage,
      title: t.errorTitle
    });
  }

  const pageTitle = `${result.courtName} – ${result.listTypeName}`;
  const downloadUrl = `/api/flat-file/${result.artefactId}/download`;

  return res.render("hearing-lists/view/[locationId]/[artefactId]", {
    en,
    cy,
    isError: false,
    pageTitle,
    courtName: result.courtName,
    listTypeName: result.listTypeName,
    contentDate: result.contentDate,
    downloadUrl,
    artefactId: result.artefactId
  });
};
```

### 4. Download API Endpoint Handler

```typescript
// libs/public-pages/src/routes/flat-file/[artefactId]/download.ts
import type { Request, Response } from "express";
import { getFileForDownload } from "../../../flat-file/flat-file-service.js";

export const GET = async (req: Request, res: Response) => {
  const { artefactId } = req.params;

  if (!artefactId) {
    return res.status(400).json({ error: "Invalid request" });
  }

  const result = await getFileForDownload(artefactId);

  if ("error" in result) {
    let statusCode = 404;
    let errorMessage = "File not found";

    switch (result.error) {
      case "NOT_FOUND":
        statusCode = 404;
        errorMessage = "Artefact not found";
        break;
      case "EXPIRED":
        statusCode = 410;
        errorMessage = "File has expired";
        break;
      case "NOT_FLAT_FILE":
        statusCode = 400;
        errorMessage = "Not a flat file";
        break;
      case "FILE_NOT_FOUND":
        statusCode = 404;
        errorMessage = "File not found in storage";
        break;
    }

    return res.status(statusCode).json({ error: errorMessage });
  }

  res.setHeader("Content-Type", result.contentType);
  res.setHeader("Content-Disposition", `inline; filename="${result.fileName}"`);
  res.setHeader("Cache-Control", "public, max-age=3600");

  return res.send(result.fileBuffer);
};
```

### 5. HTML Wrapper Page Template

```html
<!-- libs/public-pages/src/pages/hearing-lists/view/[locationId]/[artefactId].njk -->
{% extends "layouts/base-template.njk" %}
{% from "govuk/components/error-summary/macro.njk" import govukErrorSummary %}
{% from "govuk/components/button/macro.njk" import govukButton %}

{% block pageTitle %}
  {% if isError %}
    {{ title }}
  {% else %}
    {{ pageTitle }}
  {% endif %}
{% endblock %}

{% block page_content %}
<div class="govuk-grid-row">
  {% if isError %}
    <div class="govuk-grid-column-two-thirds">
      {{ govukErrorSummary({
        titleText: title,
        errorList: [
          {
            text: error
          }
        ]
      }) }}

      <h1 class="govuk-heading-l">{{ title }}</h1>
      <p class="govuk-body">{{ error }}</p>
      <p class="govuk-body">{{ backMessage }}</p>

      <a href="javascript:history.back()" class="govuk-button">{{ backButton }}</a>
    </div>
  {% else %}
    <div class="govuk-grid-column-full">
      <h1 class="govuk-heading-l">{{ courtName }} – {{ listTypeName }}</h1>

      <p class="govuk-body">
        <a href="{{ downloadUrl }}" class="govuk-link" download>{{ downloadLinkText }}</a>
      </p>

      <!-- All flat files are PDFs - always embed PDF viewer -->
      <object
        data="{{ downloadUrl }}"
        type="application/pdf"
        width="100%"
        height="800px"
        class="govuk-!-margin-top-4">
        <p class="govuk-body">
          {{ pdfNotSupportedMessage }}
          <a href="{{ downloadUrl }}" class="govuk-link" download>{{ downloadHereText }}</a>
        </p>
      </object>
    </div>
  {% endif %}
</div>
{% endblock %}
```

### 6. Translation Files

```typescript
// libs/public-pages/src/pages/hearing-lists/view/en.ts
export const en = {
  // Error messages
  errorTitle: "File not available",
  errorInvalidRequest: "Invalid request. Please check the link and try again.",
  errorNotFound: "The selected hearing list is not available or has expired. Please return to the previous page.",
  errorExpired: "The selected hearing list is not available or has expired. Please return to the previous page.",
  errorNotFlatFile: "This publication is not available as a file.",
  errorFileNotFound: "We could not load the hearing list file. Please try again later.",
  backMessage: "You can go back to the previous page to select a different hearing list.",
  backButton: "Back to previous page",

  // Viewer page content
  downloadLinkText: "Download this PDF",
  pdfNotSupportedMessage: "Your browser does not support PDF viewing.",
  downloadHereText: "Download the PDF here"
};

// libs/public-pages/src/pages/hearing-lists/view/cy.ts
export const cy = {
  // Error messages
  errorTitle: "Ffeil ddim ar gael",
  errorInvalidRequest: "Cais annilys. Gwiriwch y ddolen a rhowch gynnig arall arni.",
  errorNotFound: "Nid yw'r rhestr wrando a ddewiswyd ar gael neu mae wedi dod i ben. Ewch yn ôl i'r dudalen flaenorol.",
  errorExpired: "Nid yw'r rhestr wrando a ddewiswyd ar gael neu mae wedi dod i ben. Ewch yn ôl i'r dudalen flaenorol.",
  errorNotFlatFile: "Nid yw'r cyhoeddiad hwn ar gael fel ffeil.",
  errorFileNotFound: "Ni allwn lwytho ffeil y rhestr wrando. Ceisiwch eto yn nes ymlaen.",
  backMessage: "Gallwch fynd yn ôl i'r dudalen flaenorol i ddewis rhestr wrando wahanol.",
  backButton: "Yn ôl i'r dudalen flaenorol",

  // Viewer page content
  downloadLinkText: "Lawrlwytho'r PDF hwn",
  pdfNotSupportedMessage: "Nid yw eich porwr yn cefnogi gwylio PDF.",
  downloadHereText: "Lawrlwythwch y PDF yma"
};
```

### 7. Export Service Functions

```typescript
// libs/public-pages/src/index.ts (add to existing exports)
export { getFlatFileForDisplay, getFileForDownload } from "./flat-file/flat-file-service.js";
export { fileExists, getContentType, getFileBuffer, getFileName } from "./file-storage/file-retrieval.js";
```

## Error Handling Implementation

### Error Types and HTTP Status Codes

| Error Type | HTTP Status | User Message |
|------------|-------------|--------------|
| Invalid artefactId/locationId format | 400 Bad Request | "Invalid request. Please check the link and try again." |
| Artefact not found | 404 Not Found | "The selected hearing list is not available or has expired." |
| Location ID mismatch | 404 Not Found | "The selected hearing list is not available or has expired." |
| Not a flat file | 400 Bad Request | "This publication is not available as a file." |
| Display date expired | 410 Gone | "The selected hearing list is not available or has expired." |
| File not in storage | 404 Not Found | "We could not load the hearing list file. Please try again later." |
| Directory traversal attempt | 400 Bad Request | "Invalid request." |

### Error Flow

1. **Route Handler Validation**: Check for artefactId and locationId presence
2. **Service Layer Validation**:
   - Database lookup
   - locationId matching (security check)
   - isFlatFile check
   - Display date validation
   - File existence check
   - Path security validation
3. **Render Error Page**: Show GOV.UK compliant error page with back navigation
4. **Logging**: Log all errors (except 404s for non-existent artefacts) for monitoring

### Security Considerations

1. **Path Traversal Prevention**: Validate resolved file paths stay within storage directory
2. **Location ID Validation**: Verify locationId matches artefact.locationId to prevent unauthorized access
3. **Input Validation**: Validate UUID format for artefactId
4. **File Type Restriction**: Only serve files with recognized extensions
5. **Content-Type Headers**: Always set explicit Content-Type to prevent MIME sniffing
6. **No Directory Listings**: Never expose storage directory structure
7. **Cache Headers**: Set appropriate cache headers for static files (1 hour)
8. **API Endpoint**: Download endpoint only accessible via authenticated requests (enforced by existing middleware)

## Database Schema

No database schema changes required. The implementation uses the existing `artefact` table:

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
  isFlatFile        Boolean  @map("is_flat_file")  // Used to identify flat files
  provenance        String
  supersededCount   Int      @default(0) @map("superseded_count")

  @@map("artefact")
}
```

### Query Patterns

**Single Artefact Lookup**:
```typescript
const artefact = await prisma.artefact.findUnique({
  where: { artefactId }
});
```

**Performance Considerations**:
- Primary key lookup (UUID) - very fast, indexed by default
- No joins required
- Consider adding database index on `(isFlatFile, displayFrom, displayTo)` if flat file queries become slow (future optimization)

## Testing Strategy

### Unit Tests

1. **flat-file-service.test.ts**:
   - Test successful file retrieval
   - Test artefact not found
   - Test non-flat file artefact
   - Test expired display dates (before displayFrom, after displayTo)
   - Test missing file in storage
   - Test invalid file format

2. **file-retrieval.test.ts**:
   - Test file buffer retrieval
   - Test path traversal prevention
   - Test MIME type detection
   - Test inline/attachment disposition logic
   - Test file existence checks

3. **[artefactId].test.ts**:
   - Test GET with valid artefactId
   - Test GET with missing artefactId
   - Test GET with invalid artefactId format
   - Test error page rendering
   - Test Welsh language error messages

### Integration Tests (E2E)

Create new E2E test file: `e2e-tests/tests/flat-file-viewing.spec.ts`

Test scenarios:
1. **TS1**: Click flat file link on summary page, file opens in new tab with correct content
2. **TS2**: Verify PDF displays inline in browser
3. **TS3**: Verify CSV downloads as attachment
4. **TS4**: Verify expired file shows error message
5. **TS5**: Verify missing file shows error message
6. **TS6**: Verify back button returns to previous page
7. **TS7**: Verify Welsh error messages with `?lng=cy`
8. **TS8**: Verify Content-Type headers are correct
9. **TS9**: Accessibility test on error page (WCAG 2.2 AA)
10. **TS10**: Keyboard navigation on error page (Tab, Enter)

### Accessibility Testing

- Screen reader announces error messages correctly
- Back button is keyboard accessible
- Error summary component is properly focused
- Color contrast meets WCAG AA standards
- Error page works without JavaScript

## Deployment Considerations

### Environment Variables

No new environment variables required. Uses existing file storage configuration.

### File Storage Path

Current implementation uses filesystem storage at `storage/temp/uploads/`. This is appropriate for:
- Development environments
- Initial production deployment
- Low to medium traffic

Future enhancement (out of scope for this ticket):
- Migrate to Azure Blob Storage for scalability
- Update file-retrieval service to support blob URLs
- Maintain backward compatibility with filesystem storage

### Monitoring and Logging

Add structured logging for:
- File retrieval failures (file not found)
- Path traversal attempts (security monitoring)
- Expired artefact access attempts (may indicate incorrect display dates)
- MIME type detection failures

Example log structure:
```typescript
console.error("Flat file error", {
  artefactId,
  error: result.error,
  timestamp: new Date().toISOString(),
  locale
});
```

## Performance Considerations

1. **File Caching**: Set Cache-Control headers (1 hour) to enable browser caching
2. **Database Queries**: Single primary key lookup - very fast
3. **File System Reads**: Node.js async file operations - non-blocking
4. **Memory Usage**: Large files are streamed, not loaded entirely into memory
5. **Response Time**: Expected < 100ms for small files, < 1s for large PDFs

### Future Optimizations (Out of Scope)

- CDN integration for file delivery
- Response compression for text-based files
- Partial content support (HTTP 206) for large files
- ETag headers for conditional requests

## Acceptance Criteria Mapping

| AC # | Implementation |
|------|----------------|
| AC1-4 | User journey maintained through existing summary-of-publications page |
| AC4 | New tab with `target="_blank" rel="noopener noreferrer"` |
| AC5 | File served directly from storage, all cases visible |
| AC6 | Browser-native rendering preserves original format |
| AC7 | Browser provides scroll/zoom/download controls |
| AC8 | Title set via summary page link, could add metadata in future |
| AC9 | Error handling implemented with user-friendly messages |
| AC10 | GOV.UK Design System components, WCAG 2.2 AA compliant |

## CLARIFICATIONS RESOLVED

All clarification questions have been resolved. The decisions below represent the agreed implementation approach:

### 1. File Extension Storage ✅ RESOLVED
**Decision**: Store as `{uuid}.{ext}` in artefactId field

- Files stored as `c1baacc3-8280-43ae-8551-24080c0654f9.pdf` in filesystem
- artefactId in database includes extension: `c1baacc3-8280-43ae-8551-24080c0654f9.pdf`
- Extract extension using `artefactId.substring(artefactId.lastIndexOf("."))`
- No database schema changes required

### 2. URL Pattern ✅ RESOLVED
**Decision**: Implement `/hearing-lists/:locationId/:artefactId` as specified in ticket

- URL matches ticket specification: `/hearing-lists/{court-id}/{list-id}`
- locationId maps to court-id
- artefactId serves as list-id
- Requires validation that locationId matches artefact.locationId for security
- More complex than simple UUID lookup, but matches user expectations

### 3. Browser Tab Title ✅ RESOLVED
**Decision**: Create HTML wrapper page with embedded viewer

- HTML wrapper controls page title via `<title>` tag
- Displays "[Court Name] – [List Name]" in browser tab
- Embeds PDF viewer using `<object>` tag for PDF files
- Provides download links for non-PDF files
- More complex than direct file serving, but meets AC8 requirement

### 4. Language Toggle ✅ RESOLVED
**Decision**: Don't implement toggle - files are language-specific

- Files are inherently English or Welsh based on `language` field
- No toggle needed - user selects language version from summary page
- Error messages use existing i18n middleware

### 5. Azure Blob Storage Scope ✅ RESOLVED
**Decision**: Separate ticket for production storage solution

- Keep filesystem storage for this ticket
- Document storage limitation in deployment notes
- Create follow-up ticket for Azure Blob Storage implementation
- Focus this ticket on viewing functionality only

### 6. Metadata Display ✅ RESOLVED
**Decision**: Display court name and list name in wrapper page

- HTML wrapper shows court name and list name in page heading
- Browser tab title also shows this information
- No additional metadata in page body initially
- Can be enhanced in future if needed

### 7. File Size Limits ✅ RESOLVED
**Decision**: No artificial limit

- Let browser handle large files
- User can download if browser struggles with inline display
- Monitor performance in production and adjust if needed

### 8. File Upload Format ✅ RESOLVED
**Decision**: Verify and ensure manual-upload stores as `{uuid}.{ext}`

- Confirm existing manual-upload implementation stores with extension
- Ensure artefactId field includes extension
- Document expected format for consistency

## Infrastructure Considerations

### Current State

The application currently uses filesystem storage for uploaded files:

- **Storage Location**: `storage/temp/uploads/` (relative to `process.cwd()`)
- **File Naming**: `{uuid}.{extension}` (e.g., `c1baacc3-8280-43ae-8551-24080c0654f9.pdf`)
- **Implementation**: Node.js `fs` module for file operations
- **Current Files**: Manual-upload already uses this approach (see `libs/admin-pages/src/manual-upload/file-storage.ts`)

### Development Environment

No infrastructure changes required:

- Local filesystem storage works correctly
- Files persist across development sessions
- Single-instance application

### Production Deployment Considerations

#### Critical Issue: Ephemeral Container Storage

The current filesystem-based storage approach has significant limitations in containerized Kubernetes deployments:

1. **Pod Ephemeral Storage**
   - Container filesystems are ephemeral and wiped on pod restart
   - Uploaded files will be lost when pods are recreated (deployments, scaling, crashes)
   - Files stored in one pod are not accessible to other pods

2. **Horizontal Scaling Impact**
   - Multiple pod replicas each have isolated filesystems
   - File upload may hit Pod A, but file retrieval request may hit Pod B (load balancing)
   - Results in "file not found" errors despite successful upload

3. **Current Helm Configuration**
   - No persistent volume configuration in `apps/web/helm/values.yaml`
   - No persistent volume claim (PVC) defined
   - No Azure Blob Storage integration

#### Production Storage Options

Two approaches for production deployment:

**Option 1: Kubernetes Persistent Volume (Short-term Solution)**

Add persistent volume configuration to Helm chart:

```yaml
# apps/web/helm/values.yaml
nodejs:
  # ... existing configuration ...

  # Add persistent volume for file storage
  persistence:
    enabled: true
    size: 10Gi
    storageClass: managed-premium
    mountPath: /app/storage

  environment:
    # Optional: Make storage path configurable
    STORAGE_BASE_PATH: /app/storage/temp/uploads
```

Pros:
- Simple to implement
- Works with existing code
- No code changes required

Cons:
- Single point of failure (shared volume)
- Limited scalability
- Not cloud-native
- Requires ReadWriteMany (RWX) volume for multi-pod access
- Azure Files (RWX support) has lower performance than Blob Storage

**Option 2: Azure Blob Storage (Recommended Long-term Solution)**

Migrate to Azure Blob Storage for cloud-native file storage:

Environment variables required:
```yaml
# apps/web/helm/values.yaml
nodejs:
  environment:
    AZURE_STORAGE_ACCOUNT_NAME: cathstorage{{ .Values.global.environment }}
    AZURE_STORAGE_CONTAINER_NAME: publications

  keyVaults:
    pip-ss-kv-{{ .Values.global.environment }}:
      secrets:
        - name: storage-account-connection-string
          alias: AZURE_STORAGE_CONNECTION_STRING
```

Pros:
- Cloud-native and highly scalable
- No single point of failure
- Better performance for distributed systems
- Automatic replication and redundancy
- Cost-effective for large files
- CDN integration possible

Cons:
- Requires code changes to file-storage service
- Additional Azure resource provisioning
- Slightly more complex implementation

### Recommended Approach for VIBE-215

**For this ticket (initial implementation):**

1. **Keep filesystem storage** as-is for development and initial deployment
2. **Document the limitation** that production requires persistent storage solution
3. **Design code to be storage-agnostic** (abstract file operations in `file-retrieval.ts`)
4. **Single pod deployment** initially (set `replicas: 1` in Helm chart)

**Immediate Helm Chart Updates Required:**

```yaml
# apps/web/helm/values.yaml
nodejs:
  # ... existing configuration ...

  # Force single replica until persistent storage implemented
  replicas: 1

  autoscaling:
    enabled: false  # Disable until storage solution implemented

  # Add comment documenting storage limitation
  # TODO: Enable autoscaling after implementing Azure Blob Storage (VIBE-XXX)
```

**Future Work (Separate Ticket Required):**

Create follow-up ticket for production storage solution:
- Provision Azure Storage Account and container
- Implement Azure Blob Storage adapter in `file-retrieval.ts`
- Add managed identity authentication for blob access
- Update Helm chart with storage configuration
- Enable horizontal pod autoscaling
- Migration plan for existing files

### Infrastructure Checklist for VIBE-215

- [ ] **No database schema changes** - Uses existing `artefact` table
- [ ] **No new environment variables** - Uses `process.cwd()` for storage path
- [ ] **No persistent volume configuration** - Filesystem storage for initial deployment
- [ ] **Set replicas: 1** in Helm chart to prevent multi-pod issues
- [ ] **Disable autoscaling** in Helm chart until storage solution implemented
- [ ] **Document storage limitation** in deployment notes
- [ ] **Create follow-up ticket** for Azure Blob Storage migration

### Deployment Notes

**For Non-Production Environments (Demo, Test, Staging):**
- Single pod deployment is acceptable
- Filesystem storage works for testing purposes
- Files may be lost on pod restart (acceptable for testing)

**For Production Environment:**
- Single pod deployment is a temporary solution
- Create follow-up ticket for Azure Blob Storage implementation before production release
- Monitor pod restarts and file availability
- Consider backup strategy for uploaded files

### Monitoring Requirements

Add monitoring for file storage issues:

```typescript
// Log file retrieval failures
console.error("File retrieval failed", {
  artefactId,
  error: "FILE_NOT_FOUND",
  timestamp: new Date().toISOString(),
  podName: process.env.HOSTNAME // Kubernetes pod name
});
```

Key metrics to monitor:
- File retrieval failure rate
- Pod restart frequency
- Storage volume usage (when persistent volume added)

### Security Considerations

Current implementation already includes:
- Path traversal prevention in `file-retrieval.ts`
- File validation before serving
- No directory listing exposure

No additional security configuration required for filesystem storage.

Future Azure Blob Storage implementation will require:
- Managed Identity authentication (no connection strings in code)
- Private endpoint configuration
- Blob access policies (no public access)
- Azure Key Vault for connection string storage
