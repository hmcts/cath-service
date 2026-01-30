# Technical Plan: Excel Generation and Subscription Fulfilment for SJP Lists

**Issue**: #307
**Based on**: #236 (PR #192) - Subscription infrastructure
**Related**: #324 (File storage and retention)

## 1. Current State Analysis

### Existing Infrastructure (from #236/PR #192)

**Subscription System**:
- `libs/subscriptions` - User subscription management (court-based subscriptions)
- Database: `subscription` table with user-location mappings
- Service: `createSubscription`, `removeSubscription`, `getAllSubscriptionsByUserId`
- Pages: `/subscription-management`, `/subscription-confirmed`

**Notification System**:
- `libs/notifications` - GOV.UK Notify email integration
- Database: `notification_audit_log` table tracking email delivery
- Service: `sendPublicationNotifications` - orchestrates email sending to subscribers
- GOV.UK Notify client with retry logic
- Template configuration with `GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION` environment variable

**Publication System**:
- `libs/publication` - Publication/artefact management
- Database: Artefact storage with metadata (location, list type, dates)
- File storage: JSON files stored in `storage/temp/uploads/` directory
- Blob ingestion: API endpoint processes hearing list JSON, creates artefact, triggers notifications

**Current Notification Flow**:
1. Hearing list JSON uploaded via blob ingestion API
2. Artefact created in database with unique ID
3. JSON saved to file storage as `{artefactId}/upload.json`
4. `triggerPublicationNotifications()` called (fire-and-forget)
5. `sendPublicationNotifications()` finds subscribers by location
6. Emails sent via GOV.UK Notify with current template (text-only notification)

### Current Limitations

1. **No Excel generation** - Only JSON files stored
2. **Basic email template** - No download link, no case summary, no Special Category Data warning
3. **No file download page** - Users can't download Excel files
4. **No file reference storage** - Excel files not tracked for later retrieval (#324)

### Database Schema

**Subscription** (libs/subscriptions/prisma/schema.prisma):
```prisma
model Subscription {
  subscriptionId String   @id @default(uuid()) @map("subscription_id") @db.Uuid
  userId         String   @map("user_id") @db.Uuid
  locationId     Int      @map("location_id") @db.Integer
  dateAdded      DateTime @default(now()) @map("date_added")
}
```

**NotificationAuditLog** (libs/notifications/prisma/schema.prisma):
```prisma
model NotificationAuditLog {
  notificationId String    @id @default(uuid()) @map("notification_id") @db.Uuid
  subscriptionId String    @map("subscription_id") @db.Uuid
  userId         String    @map("user_id") @db.Uuid
  publicationId  String    @map("publication_id") @db.Uuid
  govNotifyId    String?   @map("gov_notify_id")
  status         String    @default("Pending")
  errorMessage   String?   @map("error_message")
  createdAt      DateTime  @default(now()) @map("created_at")
  sentAt         DateTime? @map("sent_at")
}
```

## 2. Technical Approach

### High-Level Strategy

1. **Excel Generation Service** - Convert JSON hearing lists to Excel format
2. **File Storage Enhancement** - Store Excel files alongside JSON files
3. **Enhanced Email Template** - Add Special Category Data warning, download link, case summary
4. **File Download Page** - Allow users to download Excel files from email links
5. **Subscription Fulfilment Orchestration** - Coordinate Excel generation → email sending → file cleanup

### Architecture Decision: Excel Generation Once

Per acceptance criteria: "The excel file should only be created once regardless of the number of subscriptions"

**Approach**: Generate Excel file during blob ingestion (before notifications sent), store alongside JSON file, reference in all emails sent to subscribers.

**Rationale**:
- Avoids duplicate generation for multiple subscribers
- Ensures consistent file for all recipients
- Simplifies error handling (fail fast if generation fails)
- File already available when emails sent

### Integration with #324 (File Storage)

From acceptance criteria: "The excel file should also be stored and referenced later as part of #324"

**Current plan**: Store Excel files in same `storage/temp/uploads/{artefactId}/` directory as JSON files. Ticket #324 will handle:
- File retention policies (how long to keep files)
- Archive/deletion strategy
- File reference tracking in database
- Download link expiry

**This ticket**: Create Excel files, store them, provide download capability. Let #324 handle retention and lifecycle management.

## 3. Implementation Details

### File Structure

```
libs/
├── excel-generation/               # New module
│   ├── package.json
│   ├── tsconfig.json
│   ├── prisma/
│   │   └── schema.prisma          # (if needed for file tracking)
│   └── src/
│       ├── config.ts              # Module configuration exports
│       ├── index.ts               # Business logic exports
│       ├── excel/
│       │   ├── excel-generator.ts      # JSON to Excel conversion
│       │   ├── excel-generator.test.ts
│       │   ├── sjp-formatter.ts        # SJP-specific formatting logic
│       │   ├── sjp-formatter.test.ts
│       │   └── excel-styles.ts         # Excel styling configuration
│       └── file-storage/
│           ├── file-storage-service.ts  # Save/retrieve Excel files
│           └── file-storage-service.test.ts
│
└── subscription-pages/             # New module for download page
    ├── package.json
    ├── tsconfig.json
    └── src/
        ├── config.ts               # pageRoutes export
        ├── pages/
        │   └── download-file/
        │       ├── [fileId].ts     # Dynamic route controller
        │       ├── [fileId].njk    # Download page template
        │       ├── [fileId].test.ts
        │       ├── en.ts           # English content
        │       └── cy.ts           # Welsh content
        └── download/
            ├── download-service.ts      # File retrieval logic
            └── download-service.test.ts
```

### Module Registration

**Root tsconfig.json**:
```json
{
  "compilerOptions": {
    "paths": {
      "@hmcts/excel-generation": ["libs/excel-generation/src"],
      "@hmcts/subscription-pages": ["libs/subscription-pages/src"]
    }
  }
}
```

**apps/web/src/app.ts**:
```typescript
import { pageRoutes as subscriptionPageRoutes } from "@hmcts/subscription-pages/config";
app.use(await createSimpleRouter(subscriptionPageRoutes));
```

**apps/api/src/blob-ingestion/repository/service.ts** (modify existing):
```typescript
import { generateExcelForPublication } from "@hmcts/excel-generation";

// After saving JSON file, generate Excel
const excelBuffer = await generateExcelForPublication(artefactId, request.hearing_list, validation.listTypeId);
await saveUploadedFile(artefactId, "list.xlsx", excelBuffer);
```

## 4. Excel Generation Specifications

### Library Selection

**Chosen**: `exceljs` (already used in libs/list-types/common)
**Version**: 4.4.0
**Rationale**:
- Already in monorepo dependencies
- Proven for Excel to JSON conversion (reverse operation)
- Good TypeScript support
- Supports styling and formatting

### Format Requirements

From ticket: "The Excel spreadsheet should follow the format of the front end style guide"

**Interpretation** (needs clarification):
- Likely refers to consistent formatting across CaTH frontend list displays
- Apply standard Excel best practices:
  - Clear column headers with bold formatting
  - Auto-fit column widths
  - Freeze header row
  - Use consistent fonts (Arial/Calibri)
  - Apply borders to table
  - Alternate row colors for readability

**Open Question**: Specific style guide document to follow?

### SJP List Structure

Based on hearing list JSON structure (inferred from blob ingestion):

**Typical SJP Fields** (to be confirmed with actual data):
- Case Reference
- Defendant Name
- Offence
- Hearing Date
- Hearing Time
- Venue
- Prosecutor

**Excel Generation Logic**:
```typescript
// libs/excel-generation/src/excel/sjp-formatter.ts
export interface SjpCase {
  caseReference: string;
  defendantName: string;
  offence: string;
  hearingDate: string;
  hearingTime: string;
  venue: string;
  prosecutor: string;
}

export function formatSjpDataForExcel(hearingListJson: unknown): SjpCase[] {
  // Parse JSON structure
  // Extract relevant fields
  // Return normalized array
}
```

### Accessibility Considerations

**Excel File Best Practices**:
1. **Clear headers** - First row contains descriptive column headers
2. **Table structure** - Defined Excel table with named columns
3. **No merged cells** - Screen readers struggle with merged cells
4. **Consistent formatting** - Predictable structure
5. **Alt text** (if images used) - Not applicable for data-only sheets
6. **File name** - Descriptive name indicating content and date

**Implementation**:
```typescript
// libs/excel-generation/src/excel/excel-styles.ts
export const HEADER_STYLE = {
  font: { bold: true, size: 11, name: 'Arial' },
  fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9D9D9' } },
  border: {
    top: { style: 'thin' },
    bottom: { style: 'thin' },
    left: { style: 'thin' },
    right: { style: 'thin' }
  },
  alignment: { vertical: 'middle', horizontal: 'left' }
};

export const DATA_STYLE = {
  font: { size: 11, name: 'Arial' },
  border: {
    top: { style: 'thin' },
    bottom: { style: 'thin' },
    left: { style: 'thin' },
    right: { style: 'thin' }
  }
};
```

### File Storage Approach

**Storage location**: `storage/temp/uploads/{artefactId}/list.xlsx`
**Naming convention**: `list.xlsx` (consistent name, unique by directory)
**File size limit**: TBD (validate during generation)
**Retention**: Managed by #324

## 5. Email Notification Specifications

### GOV.UK Notify Template Structure

**Template ID**: Use existing `GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION` or create new one

**Required Personalization Fields**:
```typescript
export interface SubscriptionEmailTemplateParams {
  // Existing fields (keep)
  locations: string;              // Venue name
  ListType: string;               // "SJP Press List"
  content_date: string;           // "25 October 2023"
  start_page_link: string;        // CaTH homepage URL
  subscription_page_link: string; // Subscription management URL

  // New fields (add)
  download_link: string;          // Link to /download-file/[fileId]
  case_summary: string;           // Summarized case details
  file_size: string;              // "123 KB"
}
```

**Template Content** (to be configured in GOV.UK Notify):

```
Subject: New SJP hearing list available

---

Note this email contains Special Category Data as defined by Data Protection Act 2018, formally known as Sensitive Personal Data, and should be handled appropriately.

This email contains information intended to assist the accurate reporting of court proceedings. It is vital you ensure that you safeguard the Special Category Data included and abide by reporting restrictions (for example on victims and children). HMCTS will stop sending the data if there is concern about how it will be used.

Your subscription to get updates about the below has been triggered based on a ((ListType)) being published for the date ((content_date)):

* ((ListType))
* ((locations))

[Manage your subscriptions, view lists, and add additional case information]((subscription_page_link)) within the Court and tribunal hearings service.

Download the case list as an Excel Spreadsheet:
[Download Excel file (((file_size)))]((download_link))

## Summary of cases within listing

((case_summary))

---

[Unsubscribe from this venue]((unsubscribe_link))
```

### Email Template Configuration

**Update in**: `libs/notifications/src/govnotify/template-config.ts`

```typescript
export interface TemplateParameters {
  locations: string;
  ListType: string;
  content_date: string;
  start_page_link: string;
  subscription_page_link: string;
  download_link: string;          // NEW
  case_summary: string;           // NEW
  file_size: string;              // NEW
}

export function buildTemplateParameters(params: {
  userName: string;
  hearingListName: string;
  publicationDate: Date;
  locationName: string;
  downloadLink: string;            // NEW
  caseSummary: string;             // NEW
  fileSize: string;                // NEW
}): TemplateParameters {
  return {
    locations: params.locationName,
    ListType: params.hearingListName,
    content_date: formatPublicationDate(params.publicationDate),
    start_page_link: getServiceUrl(),
    subscription_page_link: `${getServiceUrl()}/subscription-management`,
    download_link: params.downloadLink,        // NEW
    case_summary: params.caseSummary,          // NEW
    file_size: params.fileSize                 // NEW
  };
}
```

### Case Summary Generation

**Purpose**: Provide text summary of cases in email (not full details)

**Approach**: Extract key metrics from hearing list JSON

```typescript
// libs/excel-generation/src/excel/summary-generator.ts
export interface CaseSummary {
  totalCases: number;
  defendants: string[];  // First 5 defendant names
  offenceTypes: string[]; // Unique offence types
}

export function generateCaseSummary(hearingListJson: unknown): string {
  const summary = extractSummaryData(hearingListJson);

  return `
Total cases: ${summary.totalCases}

Defendants include:
${summary.defendants.slice(0, 5).map(name => `- ${name}`).join('\n')}
${summary.totalCases > 5 ? `... and ${summary.totalCases - 5} more` : ''}

Offence types: ${summary.offenceTypes.join(', ')}
  `.trim();
}
```

### Special Category Data Warning

**Compliance requirement**: All emails containing personal data must include DPA 2018 warning

**Implementation**: Hardcoded in GOV.UK Notify template (shown above)

**No variation needed**: Same warning text for all SJP list emails

## 6. File Download Page

### Route Configuration

**URL pattern**: `/download-file/[fileId]`
**File ID format**: Artefact ID (UUID)
**Controller**: `libs/subscription-pages/src/pages/download-file/[fileId].ts`

### Page Controller

```typescript
// libs/subscription-pages/src/pages/download-file/[fileId].ts
import type { Request, Response } from "express";
import { requireAuth } from "@hmcts/auth";
import { getFileForDownload } from "../../download/download-service.js";
import en from "./en.js";
import cy from "./cy.js";

const getHandler = async (req: Request, res: Response) => {
  const { fileId } = req.params;
  const locale = res.locals.locale || "en";
  const t = locale === "cy" ? cy : en;

  try {
    const fileInfo = await getFileForDownload(fileId);

    if (!fileInfo) {
      return res.status(404).render("errors/404", {
        en: { message: t.fileNotFoundError },
        cy: { message: t.fileNotFoundError }
      });
    }

    res.render("download-file/[fileId]", {
      en,
      cy,
      t,
      fileId,
      fileName: fileInfo.fileName,
      fileSize: fileInfo.fileSize,
      downloadUrl: `/api/download/${fileId}`
    });
  } catch (error) {
    console.error("Error retrieving file info:", error);
    res.status(500).render("errors/500");
  }
};

// Authentication required to download files
export const GET: RequestHandler[] = [
  requireAuth(),
  getHandler
];
```

### Page Template

```html
<!-- libs/subscription-pages/src/pages/download-file/[fileId].njk -->
{% extends "layouts/base-template.njk" %}
{% from "govuk/components/button/macro.njk" import govukButton %}

{% block page_content %}
<div class="govuk-grid-row">
  <div class="govuk-grid-column-two-thirds">

    <h1 class="govuk-heading-xl">{{ t.title }}</h1>

    <p class="govuk-body">{{ t.bodyText }}</p>

    <p class="govuk-body">
      <a href="{{ downloadUrl }}" class="govuk-link" download="{{ fileName }}">
        {{ t.downloadLinkText }} ({{ fileSize }})
      </a>
    </p>

    <p class="govuk-body">{{ t.supportText }}</p>

  </div>
</div>
{% endblock %}
```

### Content Files

```typescript
// libs/subscription-pages/src/pages/download-file/en.ts
export default {
  title: "Download your file",
  bodyText: "Save your file somewhere you can find it. You may need to print it or show it to someone later.",
  downloadLinkText: "Download this Microsoft Excel spreadsheet",
  supportText: "If you have any questions, call 0300 303 0656.",
  fileNotFoundError: "The file is no longer available to download.",
  backLinkText: "Back to CaTH"
};

// libs/subscription-pages/src/pages/download-file/cy.ts
export default {
  title: "Lawrlwytho eich ffeil",
  bodyText: "Cadwch eich ffeil mewn lle y gallwch ddod o hyd iddo. Efallai y bydd angen i chi ei argraffu neu ei ddangos i rywun yn nes ymlaen.",
  downloadLinkText: "Lawrlwytho'r daenlen Microsoft Excel hon",
  supportText: "Os oes gennych unrhyw gwestiynau, ffoniwch 0300 303 0656.",
  fileNotFoundError: "Nid yw'r ffeil ar gael i'w lawrlwytho mwyach.",
  backLinkText: "Yn ôl i CaTH"
};
```

### File Download Service

```typescript
// libs/subscription-pages/src/download/download-service.ts
import { findFileByArtefactId } from "@hmcts/publication";

export interface FileInfo {
  fileName: string;
  fileSize: string;
  buffer: Buffer;
}

export async function getFileForDownload(artefactId: string): Promise<FileInfo | null> {
  const fileResult = await findFileByArtefactId(artefactId);

  if (!fileResult || fileResult.extension !== '.xlsx') {
    return null;
  }

  const fileSizeKB = Math.round(fileResult.buffer.length / 1024);

  return {
    fileName: `hearing-list-${artefactId}.xlsx`,
    fileSize: `${fileSizeKB} KB`,
    buffer: fileResult.buffer
  };
}
```

### API Download Endpoint

```typescript
// libs/subscription-pages/src/routes/download/[fileId].ts
import type { Request, Response } from "express";
import { requireAuth } from "@hmcts/auth";
import { getFileForDownload } from "../../download/download-service.js";

const getHandler = async (req: Request, res: Response) => {
  const { fileId } = req.params;

  try {
    const fileInfo = await getFileForDownload(fileId);

    if (!fileInfo) {
      return res.status(404).json({ error: "File not found" });
    }

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${fileInfo.fileName}"`);
    res.setHeader('Content-Length', fileInfo.buffer.length);

    res.send(fileInfo.buffer);
  } catch (error) {
    console.error("Error downloading file:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const GET: RequestHandler[] = [
  requireAuth(),
  getHandler
];
```

## 7. Error Handling & Edge Cases

### Excel Generation Failures

**Scenarios**:
- Invalid JSON structure
- Missing required fields
- Unknown list type
- Memory exhaustion (very large lists)

**Handling**:
```typescript
try {
  const excelBuffer = await generateExcelForPublication(artefactId, hearingList, listTypeId);
  await saveUploadedFile(artefactId, "list.xlsx", excelBuffer);
} catch (error) {
  console.error("Excel generation failed:", { artefactId, error });
  // Continue with blob ingestion (don't fail entire upload)
  // Email notifications will not include download link
  await createIngestionLog({
    status: "PARTIAL_SUCCESS",
    errorMessage: `Excel generation failed: ${error.message}`
  });
}
```

**Fallback**: Send email notifications without download link if Excel generation fails

### Email Delivery Failures

**Already handled** by existing notification system:
- Retry logic with exponential backoff
- Notification audit log tracks delivery status
- Failed emails logged with error messages

**No changes needed** for this ticket

### File Download Errors

**Scenarios**:
- File deleted/missing
- Corrupted file
- Network interruption during download
- Expired download link (future #324)

**Handling**:

1. **Missing file**:
```typescript
if (!fileInfo) {
  return res.status(404).render("errors/404", {
    message: "The file is no longer available to download."
  });
}
```

2. **Corrupted file**:
```typescript
try {
  await validateExcelFile(fileBuffer);
} catch (error) {
  return res.status(500).render("errors/500", {
    message: "The file is corrupted and cannot be downloaded."
  });
}
```

3. **Network interruption**: Browser handles retry automatically

4. **Expired links**: Not implemented in this ticket (covered by #324)

### Validation Requirements

**Input validation**:
- `artefactId` parameter: Must be valid UUID
- List type: Must be SJP (this ticket only supports SJP)
- JSON structure: Must contain required fields for Excel generation

**Implementation**:
```typescript
// libs/excel-generation/src/excel/validation.ts
export function validateArtefactId(id: string): boolean {
  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return UUID_REGEX.test(id);
}

export function validateSjpListStructure(json: unknown): void {
  // Validate JSON has required fields for SJP Excel generation
  if (!json || typeof json !== 'object') {
    throw new Error("Invalid hearing list JSON structure");
  }
  // Additional validation...
}
```

### Multiple Subscriptions for Same List

**Requirement**: "The excel file should only be created once regardless of the number of subscriptions"

**Implementation**: Excel generated during blob ingestion (once), before notification loop begins

**Flow**:
1. Blob ingestion API receives hearing list
2. Create artefact in database
3. Save JSON file
4. **Generate Excel file (once)** ← Single generation point
5. Trigger notifications (fire-and-forget)
6. For each subscriber:
   - Build email with same download link
   - Send email

**Result**: One Excel file, N emails with same download link

## 8. Testing Strategy

### Unit Tests

**Excel Generation**:
```typescript
// libs/excel-generation/src/excel/excel-generator.test.ts
describe("generateExcelForPublication", () => {
  it("should generate Excel file from SJP JSON", async () => {
    const mockJson = { /* SJP hearing list */ };
    const result = await generateExcelForPublication("artefact-123", mockJson, 1);
    expect(result).toBeInstanceOf(Buffer);
    expect(result.length).toBeGreaterThan(0);
  });

  it("should throw error for invalid JSON structure", async () => {
    await expect(
      generateExcelForPublication("artefact-123", null, 1)
    ).rejects.toThrow("Invalid hearing list JSON structure");
  });

  it("should apply correct styling to Excel headers", async () => {
    const mockJson = { /* SJP hearing list */ };
    const buffer = await generateExcelForPublication("artefact-123", mockJson, 1);

    // Load workbook and verify styles
    const workbook = new Workbook();
    await workbook.xlsx.load(buffer);
    const worksheet = workbook.worksheets[0];
    const headerRow = worksheet.getRow(1);

    expect(headerRow.font.bold).toBe(true);
  });
});
```

**Email Template Parameters**:
```typescript
// libs/notifications/src/govnotify/template-config.test.ts
describe("buildTemplateParameters", () => {
  it("should include download link and case summary", () => {
    const params = buildTemplateParameters({
      userName: "John Doe",
      hearingListName: "SJP Press List",
      publicationDate: new Date("2023-10-25"),
      locationName: "Single Justice Procedure",
      downloadLink: "https://example.com/download/123",
      caseSummary: "Total cases: 5",
      fileSize: "45 KB"
    });

    expect(params.download_link).toBe("https://example.com/download/123");
    expect(params.case_summary).toBe("Total cases: 5");
    expect(params.file_size).toBe("45 KB");
  });
});
```

**Download Service**:
```typescript
// libs/subscription-pages/src/download/download-service.test.ts
describe("getFileForDownload", () => {
  it("should return file info for valid artefact", async () => {
    const fileInfo = await getFileForDownload("valid-uuid");

    expect(fileInfo).not.toBeNull();
    expect(fileInfo?.fileName).toMatch(/hearing-list-.*\.xlsx/);
    expect(fileInfo?.fileSize).toMatch(/\d+ KB/);
  });

  it("should return null for missing file", async () => {
    const fileInfo = await getFileForDownload("nonexistent-uuid");
    expect(fileInfo).toBeNull();
  });

  it("should return null for non-Excel files", async () => {
    // Mock findFileByArtefactId to return JSON file
    const fileInfo = await getFileForDownload("json-only-uuid");
    expect(fileInfo).toBeNull();
  });
});
```

### Integration Tests

**Subscription Fulfilment Flow**:
```typescript
// libs/notifications/src/notification/notification-service.test.ts
describe("sendPublicationNotifications with Excel", () => {
  it("should send emails with download links to all subscribers", async () => {
    // Arrange: Create subscriptions, generate Excel
    const artefactId = "test-artefact-123";
    const subscribers = await createTestSubscribers(2);
    await generateTestExcelFile(artefactId);

    // Act: Send notifications
    const result = await sendPublicationNotifications({
      publicationId: artefactId,
      locationId: "1",
      locationName: "Single Justice Procedure",
      hearingListName: "SJP Press List",
      publicationDate: new Date()
    });

    // Assert: All emails sent with download link
    expect(result.sent).toBe(2);
    expect(result.failed).toBe(0);

    const sentEmails = await getTestEmailsSent();
    for (const email of sentEmails) {
      expect(email.personalisation.download_link).toContain(artefactId);
    }
  });
});
```

**Blob Ingestion with Excel Generation**:
```typescript
// libs/api/src/blob-ingestion/repository/service.test.ts
describe("processBlobIngestion with Excel generation", () => {
  it("should create both JSON and Excel files", async () => {
    const request = createValidBlobRequest();
    const result = await processBlobIngestion(request, 1000);

    expect(result.success).toBe(true);

    const jsonFile = await findFileByArtefactId(result.artefact_id!);
    expect(jsonFile).not.toBeNull();

    const excelFile = await getFileForDownload(result.artefact_id!);
    expect(excelFile).not.toBeNull();
    expect(excelFile?.fileName).toMatch(/\.xlsx$/);
  });

  it("should continue ingestion if Excel generation fails", async () => {
    // Mock Excel generator to throw error
    const request = createValidBlobRequest();
    const result = await processBlobIngestion(request, 1000);

    // Ingestion succeeds, Excel generation logged as partial failure
    expect(result.success).toBe(true);

    const logs = await getIngestionLogs(result.artefact_id!);
    expect(logs[0].status).toBe("PARTIAL_SUCCESS");
  });
});
```

### E2E Test

**Complete User Journey**:
```typescript
// e2e-tests/tests/subscription-excel-download.spec.ts
import { test, expect } from "@playwright/test";

test("user receives Excel download link after subscribing to SJP list @nightly", async ({ page }) => {
  // 1. User subscribes to Single Justice Procedure location
  await page.goto("/subscription-management");
  await page.getByLabel("Single Justice Procedure").check();
  await page.getByRole("button", { name: "Save subscriptions" }).click();

  expect(page.url()).toContain("/subscription-confirmed");

  // 2. Admin uploads SJP hearing list (simulate blob ingestion)
  const uploadResult = await uploadSjpHearingList({
    court_id: "9999",  // Single Justice Procedure location ID
    list_type: "SJP_PRESS_LIST",
    hearing_list: mockSjpData
  });

  expect(uploadResult.success).toBe(true);

  // 3. Check email notification sent (using test email service)
  const sentEmail = await getLastSentEmail();
  expect(sentEmail.to).toBe("test@example.com");
  expect(sentEmail.subject).toContain("New SJP hearing list available");

  // Verify Special Category Data warning present
  expect(sentEmail.body).toContain("Special Category Data as defined by Data Protection Act 2018");

  // Verify download link present
  expect(sentEmail.body).toContain("Download the case list as an Excel Spreadsheet");
  const downloadLinkMatch = sentEmail.body.match(/href="([^"]+download-file[^"]+)"/);
  expect(downloadLinkMatch).toBeTruthy();

  // Verify case summary present
  expect(sentEmail.body).toContain("Summary of cases within listing");
  expect(sentEmail.body).toContain("Total cases:");

  // 4. User clicks download link from email
  const downloadLink = downloadLinkMatch![1];
  await page.goto(downloadLink);

  // 5. Verify download page loads
  await expect(page.getByRole("heading", { name: "Download your file" })).toBeVisible();
  await expect(page.getByText("Save your file somewhere you can find it")).toBeVisible();

  // 6. Test Welsh translation
  await page.getByRole("link", { name: "Cymraeg" }).click();
  await expect(page.getByRole("heading", { name: "Lawrlwytho eich ffeil" })).toBeVisible();

  // 7. Accessibility check
  const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
  expect(accessibilityScanResults.violations).toEqual([]);

  // 8. Download Excel file
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("link", { name: /Download this Microsoft Excel spreadsheet/ }).click();
  const download = await downloadPromise;

  expect(download.suggestedFilename()).toMatch(/hearing-list-.*\.xlsx/);

  // 9. Verify Excel file is valid
  const buffer = await download.createReadStream().then(stream => streamToBuffer(stream));
  const workbook = new Workbook();
  await workbook.xlsx.load(buffer);

  expect(workbook.worksheets.length).toBeGreaterThan(0);
  const worksheet = workbook.worksheets[0];
  expect(worksheet.rowCount).toBeGreaterThan(1); // Headers + data
});
```

**Note**: Following E2E testing guidelines - one test covering complete journey including validations, Welsh translations, and accessibility.

### Accessibility Testing

**Download Page**:
- WCAG 2.2 AA compliance verified with axe-core (inline in E2E test)
- Keyboard navigation tested
- Screen reader announcements verified
- Focus states visible

**Excel File**:
- Clear column headers (row 1)
- No merged cells
- Consistent table structure
- Readable with screen reader-compatible spreadsheet software

## 9. Acceptance Criteria Mapping

| Criterion | Implementation | Verification |
|-----------|----------------|--------------|
| Excel spreadsheet created via JSON to Excel conversion following front end style guide | `libs/excel-generation` module with exceljs, styling configuration | Unit tests verify Excel structure and styling |
| Users receive email notification when subscribed SJP list published | Existing `sendPublicationNotifications` enhanced with new template parameters | Integration test verifies email sent with correct content |
| Email includes Special Category Data warning | Hardcoded in GOV.UK Notify template | E2E test verifies warning text present in email |
| Email includes list name and venue in specified format | Template parameters `ListType`, `locations`, `content_date` | Unit tests verify template parameter building |
| Email includes CaTH service link | Template parameter `subscription_page_link` | Email template includes link |
| Email includes Excel download link | Template parameter `download_link` pointing to `/download-file/[fileId]` | E2E test verifies link present and functional |
| Email includes case summary | Template parameter `case_summary` generated from hearing list | Unit tests verify summary generation |
| Excel file created once regardless of subscription count | Generated during blob ingestion before notification loop | Integration test verifies single file for multiple subscribers |
| Excel file stored and referenced for #324 | File saved to `storage/temp/uploads/` directory | File retrieval service verifies file exists |
| Validation, unit, and integration tests for each list type | Comprehensive test suite created | Test coverage report shows >80% coverage |

## 10. Open Questions / Clarifications Needed

### High Priority

1. **Front End Style Guide Format**:
   - Is there a specific document defining Excel formatting requirements?
   - Should we match existing CaTH frontend list display styles?
   - Any specific color schemes, fonts, or layout requirements?

2. **SJP List JSON Structure**:
   - What is the exact JSON structure for SJP hearing lists?
   - Which fields should be included in Excel?
   - Are there optional vs required fields?

3. **Case Summary Content**:
   - What level of detail required in email case summary?
   - Should it include defendant names (privacy concern)?
   - Number of cases to show before truncating?

4. **GOV.UK Notify Template**:
   - Is the subscription template already approved with all new fields?
   - Do we need separate template for Excel download vs text-only notification?
   - Who handles template configuration in GOV.UK Notify admin?

### Medium Priority

5. **Welsh Translations**:
   - "Welsh placeholder" appears in ticket content - who provides actual translations?
   - Timeline for Welsh translation approval?
   - Use English content until Welsh available?

6. **File Storage Integration (#324)**:
   - What file retention period should we assume?
   - Should download links expire after certain time?
   - Database schema changes needed for file tracking?

7. **Authentication for Downloads**:
   - Should file downloads require authentication?
   - If yes, subscriber-only or any verified user?
   - Public download links or authenticated endpoints?

### Low Priority

8. **Excel File Size Limits**:
   - Maximum file size for email links?
   - Handling for very large hearing lists (100+ cases)?
   - Should we compress Excel files?

9. **Error Handling Strategy**:
   - If Excel generation fails, send text-only email or no email?
   - Retry logic for Excel generation failures?
   - Alert admins if Excel generation fails?

10. **Accessibility Standards**:
    - Any specific government accessibility requirements for Excel files?
    - Should we provide CSV alternative for maximum accessibility?
    - Testing with specific assistive technologies?

## 11. Dependencies

**Blocking**:
- None (subscription infrastructure already exists from #236)

**Integration Points**:
- #324: File storage and retention (this ticket provides Excel files, #324 manages lifecycle)

**External**:
- GOV.UK Notify template configuration (requires admin access to GOV.UK Notify)
- Welsh translations (requires HMCTS translation team)

## 12. Rollout Considerations

**Feature Flag**: Consider feature flag for Excel generation
```typescript
const EXCEL_GENERATION_ENABLED = process.env.EXCEL_GENERATION_ENABLED === "true";

if (EXCEL_GENERATION_ENABLED) {
  await generateAndSaveExcel(artefactId, hearingList);
}
```

**Phased Rollout**:
1. Deploy Excel generation (disabled by flag)
2. Test in staging with real SJP data
3. Enable for small subset of users
4. Monitor email delivery and download rates
5. Full rollout

**Monitoring**:
- Excel generation success/failure rate
- Email delivery rate (compare to baseline)
- Download link click-through rate
- File download completion rate
- Error logs for generation/download failures

**Rollback Plan**:
- Disable feature flag to stop Excel generation
- Emails revert to text-only format (existing template)
- No database rollback needed (additive changes only)
