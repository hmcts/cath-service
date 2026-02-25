# VIBE-341: Email Summary and PDF Generation for Civil and Family Daily Cause List - Technical Plan

## Overview

This ticket implements subscription fulfilment for Civil and Family Daily Cause Lists, including PDF generation from HTML lists, email summaries with case details, and integration with GOV.UK Document Service for secure PDF downloads.

## Technical Approach

### 1. Architecture Strategy

Create a new `libs/subscription-fulfilment` module to orchestrate PDF generation and enhanced email notifications. This separates concerns:
- Existing `libs/notifications` handles basic GOV.UK Notify integration
- New `libs/subscription-fulfilment` orchestrates the complete fulfilment workflow
- New `libs/pdf-generation` handles HTML to PDF conversion
- New `libs/document-service` manages GOV.UK Document Service integration
- Extend `libs/public-pages` for PDF download pages

This keeps the architecture modular and allows each component to be tested independently.

### 2. High-Level Implementation

**Workflow:**
1. When a Civil/Family Daily Cause List is published, trigger subscription fulfilment
2. Generate PDF from the list's HTML template using Puppeteer
3. Check PDF size:
   - If <= 2MB: Upload to GOV.UK Document Service, use Template 1 (PDF link + summary)
   - If > 2MB: Skip upload, use Template 2 (summary only)
4. Extract case details and build email summary
5. Send email via GOV.UK Notify with appropriate template
6. For other list types: Use existing Template 3 (original)

**PDF Download Journey:**
1. User clicks PDF link in email
2. Lands on "You have a file to download" page
3. Clicks Continue to "Download your file" page
4. Downloads PDF from GOV.UK Document Service
5. Handle expiry/errors appropriately

### 3. Key Technical Considerations

**PDF Generation:**
- Use Puppeteer for HTML to PDF conversion (production-ready, widely adopted)
- Apply List Style Guide CSS to match frontend styling
- Configure PDF options (A4, margins, print-friendly)
- Handle large lists that may exceed 2MB

**GOV.UK Document Service Integration:**
- API endpoints: Upload, retrieve, delete
- Secure tokens with expiry (7 days typical)
- Error handling for upload failures
- File size validation before upload

**Email Templates:**
- Template IDs stored as environment variables
- Dynamic template selection based on list type and PDF size
- Template parameters include case summary data structure
- Special Category Data warning text included in all templates

**Database Schema:**
- Extend `NotificationAuditLog` to track PDF generation
- New `DocumentDownload` table for PDF metadata (link, expiry, size)
- Link documents to publications and notifications

**Performance & Scalability:**
- PDF generation is async (may take seconds for large lists)
- Queue-based processing if needed (future enhancement)
- Cleanup expired document links via scheduled job

## Implementation Details

### File Structure

```
libs/subscription-fulfilment/
├── package.json
├── tsconfig.json
├── src/
│   ├── config.ts                        # Module exports for registration
│   ├── index.ts                         # Business logic exports
│   ├── fulfilment/
│   │   ├── service.ts                   # Orchestration logic
│   │   ├── service.test.ts
│   │   ├── email-summary.ts             # Extract and format case details
│   │   ├── email-summary.test.ts
│   │   └── template-selector.ts         # Choose correct email template
│   └── repository/
│       ├── queries.ts                   # Database operations
│       └── queries.test.ts

libs/pdf-generation/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts
│   ├── pdf/
│   │   ├── generator.ts                 # Puppeteer PDF generation
│   │   ├── generator.test.ts
│   │   ├── style-guide.ts               # CSS for List Style Guide
│   │   └── size-checker.ts              # Validate 2MB limit
│   └── templates/
│       └── civil-family-template.html   # PDF layout template

libs/document-service/
├── package.json
├── tsconfig.json
├── prisma/
│   └── schema.prisma                    # DocumentDownload model
└── src/
    ├── config.ts
    ├── index.ts
    ├── document/
    │   ├── client.ts                    # GOV.UK Document Service API client
    │   ├── client.test.ts
    │   ├── service.ts                   # Business logic
    │   └── service.test.ts
    └── repository/
        ├── queries.ts                   # Database operations
        └── queries.test.ts

libs/public-pages/src/pages/
├── download-file/
│   ├── index.ts                         # GET handler for landing page
│   ├── index.njk
│   ├── en.ts
│   ├── cy.ts
│   ├── index.test.ts
│   └── index.njk.test.ts
└── download-file-confirm/
    ├── index.ts                         # GET handler with actual download link
    ├── index.njk
    ├── en.ts
    ├── cy.ts
    ├── index.test.ts
    └── index.njk.test.ts
```

### Components to Create

#### 1. Database Schema Changes

**New Model: DocumentDownload** (`libs/document-service/prisma/schema.prisma`)
```prisma
model DocumentDownload {
  documentId     String   @id @default(uuid()) @map("document_id") @db.Uuid
  publicationId  String   @map("publication_id") @db.Uuid
  documentUrl    String   @map("document_url")
  expiryDate     DateTime @map("expiry_date")
  fileSizeBytes  Int      @map("file_size_bytes")
  status         String   @default("Active")  // Active, Expired, Error
  createdAt      DateTime @default(now()) @map("created_at")

  @@index([publicationId])
  @@index([expiryDate])
  @@index([status])
  @@map("document_download")
}
```

**Extend NotificationAuditLog** (`libs/notifications/prisma/schema.prisma`)
```prisma
model NotificationAuditLog {
  // ... existing fields ...
  documentId     String?  @map("document_id") @db.Uuid
  pdfGenerated   Boolean  @default(false) @map("pdf_generated")
  pdfSizeBytes   Int?     @map("pdf_size_bytes")
  templateUsed   String?  @map("template_used")  // template1, template2, template3
}
```

#### 2. PDF Generation Module

**Generator** (`libs/pdf-generation/src/pdf/generator.ts`)
```typescript
import puppeteer from "puppeteer";

const MAX_PDF_SIZE_BYTES = 2 * 1024 * 1024; // 2MB

interface PdfGenerationResult {
  success: boolean;
  pdfBuffer?: Buffer;
  sizeBytes?: number;
  error?: string;
}

export async function generatePdfFromHtml(
  html: string,
  listType: string
): Promise<PdfGenerationResult> {
  // Launch headless browser
  // Apply List Style Guide CSS
  // Convert HTML to PDF
  // Check size
  // Return buffer and metadata
}
```

**Style Guide** (`libs/pdf-generation/src/pdf/style-guide.ts`)
```typescript
export const LIST_STYLE_GUIDE_CSS = `
  /* GOV.UK Design System base styles */
  /* Court list specific styling */
  /* Print-friendly adjustments */
`;
```

#### 3. GOV.UK Document Service Integration

**Client** (`libs/document-service/src/document/client.ts`)
```typescript
interface UploadDocumentParams {
  filename: string;
  fileBuffer: Buffer;
  contentType: string;
}

interface UploadDocumentResult {
  success: boolean;
  documentUrl?: string;
  expiryDate?: Date;
  error?: string;
}

export async function uploadDocument(
  params: UploadDocumentParams
): Promise<UploadDocumentResult> {
  // POST to documents.service.gov.uk/documents
  // Return secure download URL with token
}

export async function getDocumentMetadata(
  documentId: string
): Promise<DocumentMetadata> {
  // GET document info including expiry
}

export async function deleteDocument(documentId: string): Promise<void> {
  // DELETE document when expired/no longer needed
}
```

**Service** (`libs/document-service/src/document/service.ts`)
```typescript
export async function createDocumentDownload(params: {
  publicationId: string;
  pdfBuffer: Buffer;
  filename: string;
}): Promise<DocumentDownload> {
  // Upload to GOV.UK Document Service
  // Store metadata in database
  // Return document record
}

export async function getActiveDocument(
  publicationId: string
): Promise<DocumentDownload | null> {
  // Retrieve active document for publication
  // Check expiry
}

export async function markDocumentExpired(documentId: string): Promise<void> {
  // Update status to Expired
}
```

#### 4. Subscription Fulfilment Orchestration

**Service** (`libs/subscription-fulfilment/src/fulfilment/service.ts`)
```typescript
import { generatePdfFromHtml } from "@hmcts/pdf-generation";
import { createDocumentDownload } from "@hmcts/document-service";
import { sendEmail } from "@hmcts/notifications";

const CIVIL_FAMILY_LIST_TYPE = "Civil and Family Daily Cause List";
const MAX_PDF_SIZE = 2 * 1024 * 1024;

export async function fulfillSubscription(params: {
  publicationId: string;
  listType: string;
  listHtml: string;
  listData: any; // Parsed list JSON
  subscriptions: Subscription[];
}): Promise<FulfilmentResult> {
  // 1. Check if this is Civil/Family Daily Cause List
  const isCivilFamily = params.listType === CIVIL_FAMILY_LIST_TYPE;

  if (!isCivilFamily) {
    // Use existing template (Template 3)
    return sendStandardNotifications(params);
  }

  // 2. Generate PDF
  const pdfResult = await generatePdfFromHtml(params.listHtml, params.listType);

  if (!pdfResult.success) {
    // Log error, fallback to summary-only template
    return sendSummaryOnlyNotifications(params);
  }

  // 3. Check size and upload if <= 2MB
  let documentDownload: DocumentDownload | null = null;
  let templateType: string;

  if (pdfResult.sizeBytes! <= MAX_PDF_SIZE) {
    documentDownload = await createDocumentDownload({
      publicationId: params.publicationId,
      pdfBuffer: pdfResult.pdfBuffer!,
      filename: `daily-cause-list-${params.publicationId}.pdf`
    });
    templateType = "template1"; // PDF + summary
  } else {
    templateType = "template2"; // Summary only
  }

  // 4. Extract case summary
  const caseSummary = extractCaseSummary(params.listData);

  // 5. Send notifications with appropriate template
  return sendEnhancedNotifications({
    subscriptions: params.subscriptions,
    publicationId: params.publicationId,
    templateType,
    documentDownload,
    caseSummary,
    listDetails: params
  });
}
```

**Email Summary** (`libs/subscription-fulfilment/src/fulfilment/email-summary.ts`)
```typescript
interface CaseSummary {
  applicant: string;
  caseReferenceNumber: string;
  caseName: string;
  caseType: string;
  hearingType: string;
}

export function extractCaseSummary(listData: any): CaseSummary[] {
  // Parse list JSON structure
  // Extract relevant fields for each case
  // Format for email template
  // Return array of case summaries
}

export function formatCaseSummaryForEmail(
  summaries: CaseSummary[]
): string {
  // Convert to formatted text for email body
  // Follow GOV.UK style guide for email content
}
```

**Template Selector** (`libs/subscription-fulfilment/src/fulfilment/template-selector.ts`)
```typescript
export function selectEmailTemplate(params: {
  listType: string;
  hasPdf: boolean;
  pdfSizeExceeded: boolean;
}): string {
  if (params.listType !== "Civil and Family Daily Cause List") {
    return process.env.GOVUK_NOTIFY_TEMPLATE_ID_ORIGINAL!;
  }

  if (params.hasPdf && !params.pdfSizeExceeded) {
    return process.env.GOVUK_NOTIFY_TEMPLATE_ID_WITH_PDF!;
  }

  return process.env.GOVUK_NOTIFY_TEMPLATE_ID_SUMMARY_ONLY!;
}
```

#### 5. Enhanced GOV.UK Notify Integration

**Extended Template Config** (`libs/notifications/src/govnotify/template-config.ts`)
```typescript
export interface EnhancedTemplateParameters extends TemplateParameters {
  // Existing fields
  locations: string;
  ListType: string;
  content_date: string;
  start_page_link: string;
  subscription_page_link: string;

  // New fields for Civil/Family templates
  pdf_download_link?: string;
  case_summary?: string;
  special_category_warning?: string;
  unsubscribe_link?: string;
}

export function buildEnhancedTemplateParameters(params: {
  // ... existing params ...
  documentDownload?: DocumentDownload;
  caseSummaries?: CaseSummary[];
  unsubscribeToken?: string;
}): EnhancedTemplateParameters {
  const baseParams = buildTemplateParameters(params);

  return {
    ...baseParams,
    pdf_download_link: documentDownload
      ? `${getServiceUrl()}/download-file?token=${documentDownload.documentId}`
      : undefined,
    case_summary: params.caseSummaries
      ? formatCaseSummaryForEmail(params.caseSummaries)
      : undefined,
    special_category_warning: SPECIAL_CATEGORY_DATA_WARNING,
    unsubscribe_link: params.unsubscribeToken
      ? `${getServiceUrl()}/unsubscribe?token=${params.unsubscribeToken}`
      : undefined
  };
}

const SPECIAL_CATEGORY_DATA_WARNING = `
Note this email contains Special Category Data as defined by Data Protection Act 2018,
formally known as Sensitive Personal Data, and should be handled appropriately.

This email contains information intended to assist the accurate reporting of court proceedings.
It is vital you ensure that you safeguard the Special Category Data included and abide by
reporting restrictions (for example on victims and children). HMCTS will stop sending the
data if there is concern about how it will be used.
`;
```

#### 6. PDF Download Pages

**Landing Page** (`libs/public-pages/src/pages/download-file/index.ts`)
```typescript
import type { Request, Response } from "express";
import { getActiveDocument } from "@hmcts/document-service";

const en = {
  title: "You have a file to download",
  bodyText: "Court and tribunal hearings service sent you a file to download.",
  continueButton: "Continue",
  supportText: "If you have any questions, call 0300 303 0656.",
  errorExpired: "This download link has expired.",
  errorNotFound: "The file you requested could not be found."
};

const cy = {
  title: "Mae gennych ffeil i'w lawrlwytho",
  bodyText: "Anfonodd gwasanaeth gwrandawiadau llys a thribiwnlys ffeil i chi ei lawrlwytho.",
  continueButton: "Parhau",
  supportText: "Os oes gennych unrhyw gwestiynau, ffoniwch 0300 303 0656.",
  errorExpired: "Mae'r ddolen lawrlwytho hon wedi dod i ben.",
  errorNotFound: "Ni ellid dod o hyd i'r ffeil y gwnaethoch ofyn amdani."
};

export const GET = async (req: Request, res: Response) => {
  const token = req.query.token as string;

  if (!token) {
    return res.status(400).render("download-file", {
      en,
      cy,
      error: "errorNotFound"
    });
  }

  // Validate document exists and is not expired
  const document = await getActiveDocument(token);

  if (!document || document.status === "Expired") {
    return res.status(404).render("download-file", {
      en,
      cy,
      error: "errorExpired"
    });
  }

  res.render("download-file", { en, cy, token });
};
```

**Download Page** (`libs/public-pages/src/pages/download-file-confirm/index.ts`)
```typescript
const en = {
  title: "Download your file",
  bodyText1: (date: string) => `This file is available to download until ${date}.`,
  bodyText2: "Make sure you save your file somewhere you can find it.",
  fileLink: (size: string) => `Download this PDF (${size}) to your device`,
  supportText: "If you have any questions, call 0300 303 0656.",
  errorExpired: "The file is no longer available to download."
};

const cy = {
  title: "Lawrlwythwch eich ffeil",
  bodyText1: (date: string) => `Mae'r ffeil hon ar gael i'w lawrlwytho tan ${date}.`,
  bodyText2: "Gwnewch yn siŵr eich bod yn cadw'ch ffeil mewn lle y gallwch ddod o hyd iddo.",
  fileLink: (size: string) => `Lawrlwythwch y PDF hwn (${size}) i'ch dyfais`,
  supportText: "Os oes gennych unrhyw gwestiynau, ffoniwch 0300 303 0656.",
  errorExpired: "Nid yw'r ffeil ar gael i'w lawrlwytho mwyach."
};

export const GET = async (req: Request, res: Response) => {
  const token = req.query.token as string;

  const document = await getActiveDocument(token);

  if (!document || document.status === "Expired") {
    return res.status(404).render("download-file-confirm", {
      en,
      cy,
      error: "errorExpired"
    });
  }

  const expiryDateFormatted = formatDate(document.expiryDate);
  const fileSizeFormatted = formatFileSize(document.fileSizeBytes);

  res.render("download-file-confirm", {
    en,
    cy,
    expiryDate: expiryDateFormatted,
    fileSize: fileSizeFormatted,
    downloadUrl: document.documentUrl
  });
};
```

**Templates** (`libs/public-pages/src/pages/download-file/index.njk`)
```html
{% extends "layouts/base-templates.njk" %}
{% from "govuk/components/button/macro.njk" import govukButton %}

{% block content %}
<div class="govuk-grid-row">
  <div class="govuk-grid-column-two-thirds">
    <h1 class="govuk-heading-xl">{{ title }}</h1>

    {% if error %}
      <p class="govuk-body">{{ errorExpired if error == "errorExpired" else errorNotFound }}</p>
    {% else %}
      <p class="govuk-body">{{ bodyText }}</p>

      <form method="get" action="/download-file-confirm">
        <input type="hidden" name="token" value="{{ token }}">
        {{ govukButton({
          text: continueButton
        }) }}
      </form>

      <p class="govuk-body">{{ supportText }}</p>
    {% endif %}
  </div>
</div>
{% endblock %}
```

**Download Confirm Template** (`libs/public-pages/src/pages/download-file-confirm/index.njk`)
```html
{% extends "layouts/base-templates.njk" %}

{% block content %}
<div class="govuk-grid-row">
  <div class="govuk-grid-column-two-thirds">
    <h1 class="govuk-heading-xl">{{ title }}</h1>

    {% if error %}
      <p class="govuk-body">{{ errorExpired }}</p>
    {% else %}
      <p class="govuk-body">{{ bodyText1(expiryDate) }}</p>
      <p class="govuk-body">{{ bodyText2 }}</p>

      <p class="govuk-body">
        <a href="{{ downloadUrl }}" class="govuk-link" download>
          {{ fileLink(fileSize) }}
        </a>
      </p>

      <p class="govuk-body">{{ supportText }}</p>
    {% endif %}
  </div>
</div>
{% endblock %}
```

### API Endpoints

No new API endpoints required. All functionality is page-based with server-side rendering.

### Database Migrations

**Migration 1: Create document_download table**
```sql
CREATE TABLE document_download (
  document_id UUID PRIMARY KEY,
  publication_id UUID NOT NULL,
  document_url VARCHAR(500) NOT NULL,
  expiry_date TIMESTAMP NOT NULL,
  file_size_bytes INTEGER NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'Active',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_document_publication ON document_download(publication_id);
CREATE INDEX idx_document_expiry ON document_download(expiry_date);
CREATE INDEX idx_document_status ON document_download(status);
```

**Migration 2: Extend notification_audit_log table**
```sql
ALTER TABLE notification_audit_log
  ADD COLUMN document_id UUID,
  ADD COLUMN pdf_generated BOOLEAN DEFAULT FALSE,
  ADD COLUMN pdf_size_bytes INTEGER,
  ADD COLUMN template_used VARCHAR(50);

CREATE INDEX idx_notification_document ON notification_audit_log(document_id);
```

## Error Handling & Edge Cases

### PDF Generation Errors
- **Puppeteer launch failure**: Log error, fallback to summary-only template
- **HTML rendering issues**: Validate HTML structure, provide error-specific messages
- **Timeout (>30s)**: Cancel generation, use summary-only template
- **Memory issues**: Configure Puppeteer memory limits, handle OOM gracefully

### Document Service Errors
- **Upload failure**: Retry 3 times with exponential backoff, then fallback to summary-only
- **Network timeout**: Retry mechanism, fallback after 3 attempts
- **Authentication errors**: Log critical error, alert admin
- **Rate limiting**: Queue requests, implement backoff

### Email Notification Errors
- **Template not found**: Log error, fallback to original template
- **Invalid email**: Skip user, log in NotificationAuditLog with "Skipped" status
- **GOV.UK Notify API failure**: Retry with backoff, mark as "Failed" in audit log

### Download Page Errors
- **Expired link**: Show user-friendly error message with support contact
- **Invalid token**: 404 page with error message
- **Document not found**: Check if document was deleted, show appropriate message

### Edge Cases
- **PDF exactly 2MB**: Treat as <= 2MB (include PDF)
- **Empty case list**: Generate PDF anyway (show "No cases scheduled")
- **Missing case data fields**: Show "Not provided" or skip field in summary
- **Welsh language lists**: Generate PDF with Welsh content, use Welsh email template
- **Concurrent subscriptions**: Process in parallel, handle race conditions
- **List superseded before fulfilment**: Check publication status before sending

## Acceptance Criteria Mapping

### AC1: PDF Generation Foundation
**Implementation:**
- `libs/pdf-generation` module with Puppeteer
- Apply List Style Guide CSS template
- Generate from existing list HTML
**Verification:**
- Unit tests: PDF buffer generated successfully
- Integration test: PDF matches frontend styling
- E2E test: Download PDF and verify content

### AC2: PDF Style Match
**Implementation:**
- Extract CSS from List Style Guide
- Apply in Puppeteer page context
- Configure PDF options (A4, margins)
**Verification:**
- Visual regression testing (compare screenshots)
- Manual QA: Side-by-side comparison with frontend

### AC3: Email Notification Trigger
**Implementation:**
- Hook into existing publication notification flow
- Call `fulfillSubscription()` for Civil/Family lists
**Verification:**
- Integration test: Publish list, verify notifications sent
- E2E test: Subscribe, publish, receive email

### AC4: GOV.UK Notify Integration
**Implementation:**
- Three template IDs in environment variables
- `selectEmailTemplate()` chooses correct template
**Verification:**
- Unit test: Template selection logic
- E2E test: Verify correct template used in each scenario

### AC5: Email Content Structure
**Implementation:**
- Build template parameters with PDF link first, summary second
- Use GOV.UK Notify template structure
**Verification:**
- E2E test: Receive email, verify structure and order

### AC6: Three Email Templates
**Implementation:**
- Configure three template IDs
- Logic in `selectEmailTemplate()`
- Size check before template selection
**Verification:**
- Unit tests: All three scenarios
- E2E tests: Trigger each template type

### AC7: Email Summary Content
**Implementation:**
- `extractCaseSummary()` parses list data
- Format fields: Applicant, Case ref, Case name, Case type, Hearing type
**Verification:**
- Unit test: Parse sample list data
- E2E test: Verify summary content in email

### AC8: Email Format Requirements
**Implementation:**
- Special Category Data warning in template parameters
- Subscription trigger text with list name and date
- Links to CaTH and PDF download
- Summary section with unsubscribe link
**Verification:**
- E2E test: Verify all required sections present
- Accessibility test: Screen reader compatibility

### AC9: Testing
**Implementation:**
- Unit tests for all modules (target >80% coverage)
- Integration tests for PDF generation and email sending
- E2E test for complete journey
**Verification:**
- Run `yarn test` and `yarn test:e2e`
- Coverage report shows >80%

### AC10: PDF Download
**Implementation:**
- Link format: `/download-file?token=<documentId>`
- Redirect to GOV.UK Document Service URL
**Verification:**
- E2E test: Click link, verify redirect to documents.service.gov.uk
- Test with expired link

## Open Questions

### CLARIFICATIONS NEEDED

1. **GOV.UK Document Service API Details**
   - What is the exact API endpoint and authentication mechanism?
   - Do we have API credentials for documents.service.gov.uk?
   - What is the default expiry time for uploaded documents? (Ticket says "until [date]" but doesn't specify duration)
   - Is there a file size limit on the document service side?

2. **PDF Generation Performance**
   - What is the expected list size? (number of cases, typical file size)
   - Should PDF generation be synchronous or async/queued?
   - Is there a timeout requirement for the fulfilment process?

3. **Email Template Configuration**
   - Are the three GOV.UK Notify templates already created?
   - What are the template IDs for:
     - Template 1 (PDF + summary)
     - Template 2 (summary only)
     - Template 3 (original)
   - Do templates support all required personalisation fields?

4. **List Style Guide**
   - Where is the official "List Style Guide template" documented?
   - Is there a reference PDF or design specification?
   - Should the PDF exactly match the web view or have print-specific adjustments?

5. **Case Data Structure**
   - What is the exact JSON structure of Civil and Family Daily Cause List data?
   - Are all fields (Applicant, Case ref, Case name, Case type, Hearing type) always present?
   - How should missing fields be handled in the summary?

6. **Download Page Access Control**
   - Should download pages require authentication?
   - Can anyone with the link download, or only the subscribed user?
   - Should we track who downloads the PDF?

7. **Welsh Language Support**
   - Should PDFs be generated in both English and Welsh?
   - Do we need separate PDFs or a bilingual PDF?
   - Are Welsh email templates required for all three templates?

8. **Error Handling**
   - If PDF generation fails, should we still send an email with summary only?
   - Should we retry failed PDF uploads automatically?
   - What level of error detail should be exposed to users?

9. **Performance Monitoring**
   - Are there SLA requirements for email delivery time?
   - Should we implement metrics/logging for PDF generation time?
   - Do we need alerting for fulfilment failures?

10. **Unsubscribe Functionality**
    - The ticket mentions an "Unsubscribe" link - is this already implemented?
    - What should the unsubscribe link format be?
    - Should unsubscribe be immediate or require confirmation?

11. **Expiry and Cleanup**
    - How long should PDFs be available on the document service?
    - Do we need a scheduled job to clean up expired documents?
    - Should expired documents be marked in the database or deleted?

12. **Puppeteer Configuration**
    - Should we use a managed Puppeteer instance or launch per-request?
    - What are the infrastructure constraints (memory, CPU)?
    - Is there a containerized environment for Puppeteer?
