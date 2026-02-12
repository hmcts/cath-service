# Technical Plan: Subscription Email Fulfilment Complete Journey

## 1. Technical Approach

### Overview
Extend the existing notification service to support four different Gov Notify email templates based on list type (SJP vs non-SJP), file size (< 2MB vs ≥ 2MB), and available formats (PDF, Excel, both). The system will dynamically select templates and build personalisation data including conditional case information and download links.

### Architecture Decisions

1. **Template Selection Logic**: Centralized function in `template-config.ts` that determines which of the four Gov Notify templates to use based on:
   - List type (SJP/non-SJP via `isNonStrategic` flag)
   - File size (2MB threshold)
   - Available formats (PDF and/or Excel)

2. **File Size Storage**: Add `fileSize` column to `artefact` table to avoid repeated file system calls for size calculation.

3. **Conditional Personalisation**: Build personalisation object with boolean flags (`display_case_num`, `display_case_urn`, etc.) to control what sections appear in emails.

4. **Backward Compatibility**: Default to existing template ID when template selection logic is not applicable.

### Key Technical Considerations

- **File Size Calculation**: Must happen at artefact creation (both manual upload and API ingestion)
- **Case Metadata Extraction**: Need to parse case number, URN, and summary from publication JSON content
- **Download Link Generation**: Use existing flat-file download routes with artefact ID
- **Error Handling**: Graceful degradation when file size unavailable (fall back to no-link template)
- **Gov Notify Rate Limits**: Existing batching logic should handle multiple subscribers

## 2. Implementation Details

### File Structure

```
libs/notifications/
├── src/
│   ├── govnotify/
│   │   ├── template-config.ts          # MODIFY: Add 4 template IDs, selection logic
│   │   └── govnotify-client.ts         # MODIFY: Accept template ID parameter
│   └── notification/
│       └── notification-service.ts      # MODIFY: Template selection and personalisation

libs/publication/
└── src/
    └── publication/
        └── publication-service.ts       # MODIFY: Calculate and store file size

libs/admin-pages/
└── src/
    └── pages/
        └── manual-upload-summary/
            └── index.ts                 # MODIFY: Pass file size on upload

libs/api/
└── src/
    └── blob-ingestion/
        └── blob-ingestion/
            └── blob-ingestion-service.ts # MODIFY: Calculate file size from buffer

apps/postgres/
└── prisma/
    └── schema.prisma                    # MODIFY: Add fileSize to Artefact model
```

### Database Schema Changes

```prisma
model Artefact {
  // ... existing fields ...
  fileSize BigInt? @map("file_size")

  @@index([fileSize])
}
```

**Migration**:
```bash
yarn db:migrate:dev
```

### Components/Modules to Create

**New file: libs/notifications/src/notification/case-metadata-extractor.ts**
```typescript
// Extract case metadata from publication JSON content
export function extractCaseMetadata(artefact: Artefact): CaseMetadata {
  // Parse search field or content for case number, URN, name
  // Generate summary of cases
}

interface CaseMetadata {
  caseNumber?: string;
  caseUrn?: string;
  caseName?: string;
  summaryOfCases?: string;
}
```

### Template Configuration (libs/notifications/src/govnotify/template-config.ts)

```typescript
// Template IDs from Gov Notify
export const TEMPLATE_SJP_PDF_EXCEL = "4017c40f-0644-4b02-acd2-e00a1ece3b85";
export const TEMPLATE_SJP_EXCEL_ONLY = "e03108e1-db29-40d3-90f2-bf8f6c233c35";
export const TEMPLATE_NO_LINKS = "072fa7fd-ac23-4a99-be9a-70153374c66e";
export const TEMPLATE_NON_SJP_PDF = "e551a0c1-91e7-4871-a540-1e7101b70f14";

const FILE_SIZE_THRESHOLD = 2 * 1024 * 1024; // 2MB in bytes

export function selectTemplate(
  listType: ListType,
  fileSize: number | null,
  hasExcel: boolean,
  hasPdf: boolean
): string {
  // If file size unavailable or >= 2MB, use no-link template
  if (!fileSize || fileSize >= FILE_SIZE_THRESHOLD) {
    return TEMPLATE_NO_LINKS;
  }

  const isSJP = listType.isNonStrategic;

  if (isSJP) {
    if (hasPdf && hasExcel) {
      return TEMPLATE_SJP_PDF_EXCEL;
    }
    return TEMPLATE_SJP_EXCEL_ONLY;
  }

  return TEMPLATE_NON_SJP_PDF;
}

interface TemplateParameters {
  // Base fields (all templates)
  locations: string;
  ListType: string;
  content_date: string;

  // Conditional display flags
  display_case_num?: string; // "true" or undefined
  case_num?: string;
  display_case_urn?: string;
  case_urn?: string;
  display_locations?: string;
  display_summary?: string;
  summary_of_cases?: string;

  // Download links (template-specific)
  pdf_link_text?: string;
  excel_link_text?: string;

  // Existing fields (for backward compatibility)
  start_page_link?: string;
  subscription_page_link?: string;
}

export function buildTemplateParameters(
  artefact: Artefact,
  listType: ListType,
  location: Location,
  caseMetadata: CaseMetadata,
  baseUrl: string
): TemplateParameters {
  const params: TemplateParameters = {
    locations: location.name,
    ListType: listType.friendlyName,
    content_date: formatContentDate(artefact.contentDate),
  };

  // Add conditional case information
  if (caseMetadata.caseNumber) {
    params.display_case_num = "true";
    params.case_num = caseMetadata.caseNumber;
  }

  if (caseMetadata.caseUrn) {
    params.display_case_urn = "true";
    params.case_urn = caseMetadata.caseUrn;
  }

  if (location.name) {
    params.display_locations = "true";
  }

  if (caseMetadata.summaryOfCases) {
    params.display_summary = "true";
    params.summary_of_cases = caseMetadata.summaryOfCases;
  }

  // Add download links based on file size
  if (artefact.fileSize && artefact.fileSize < FILE_SIZE_THRESHOLD) {
    const downloadUrl = `${baseUrl}/flat-file/${artefact.artefactId}/download`;

    if (listType.isNonStrategic) {
      // SJP lists
      params.excel_link_text = downloadUrl; // Excel link
      if (/* has PDF version */) {
        params.pdf_link_text = downloadUrl; // PDF link
      }
    } else {
      // Non-SJP lists
      params.pdf_link_text = downloadUrl;
    }
  }

  return params;
}
```

### Notification Service Updates (libs/notifications/src/notification/notification-service.ts)

```typescript
async function processUserNotification(
  subscription: Subscription,
  artefact: Artefact,
  listType: ListType,
  location: Location
): Promise<NotificationResult> {
  // Extract case metadata from artefact content
  const caseMetadata = extractCaseMetadata(artefact);

  // Determine available formats
  const hasExcel = artefact.sourceArtefactId?.endsWith('.xlsx') ||
                   artefact.sourceArtefactId?.endsWith('.xls');
  const hasPdf = /* check for PDF conversion or original PDF */;

  // Select appropriate template
  const templateId = selectTemplate(
    listType,
    artefact.fileSize,
    hasExcel,
    hasPdf
  );

  // Build personalisation parameters
  const personalisation = buildTemplateParameters(
    artefact,
    listType,
    location,
    caseMetadata,
    process.env.CATH_SERVICE_URL || "https://cath.hmcts.net"
  );

  // Send email with selected template
  await sendEmail(
    subscription.email,
    templateId,
    personalisation
  );

  return { sent: 1, failed: 0, skipped: 0 };
}
```

### Publication Service Updates (libs/publication/src/publication/publication-service.ts)

```typescript
export async function createArtefact(data: CreateArtefactData): Promise<Artefact> {
  // Calculate file size if file path provided
  let fileSize: bigint | undefined;

  if (data.filePath) {
    const stats = fs.statSync(data.filePath);
    fileSize = BigInt(stats.size);
  } else if (data.fileBuffer) {
    fileSize = BigInt(data.fileBuffer.byteLength);
  }

  return prisma.artefact.create({
    data: {
      ...data,
      fileSize,
    },
  });
}
```

### API Endpoints

No new API endpoints required. Existing endpoints will be modified:
- **Manual Upload**: `POST /manual-upload-summary` (calculate file size before creating artefact)
- **Blob Ingestion**: Internal blob processing (calculate from buffer or Content-Length header)

### Environment Variables

Add to `.env` and `.env.example`:

```bash
# Gov Notify Template IDs for Subscription Emails
GOVUK_NOTIFY_TEMPLATE_ID_SJP_PDF_EXCEL=4017c40f-0644-4b02-acd2-e00a1ece3b85
GOVUK_NOTIFY_TEMPLATE_ID_SJP_EXCEL_ONLY=e03108e1-db29-40d3-90f2-bf8f6c233c35
GOVUK_NOTIFY_TEMPLATE_ID_NO_LINKS=072fa7fd-ac23-4a99-be9a-70153374c66e
GOVUK_NOTIFY_TEMPLATE_ID_NON_SJP_PDF=e551a0c1-91e7-4871-a540-1e7101b70f14
```

## 3. Error Handling & Edge Cases

### Error Scenarios

| Scenario | Handling Strategy |
|----------|-------------------|
| File size unavailable | Log warning, use no-link template (072fa7fd) |
| File not found on disk | Log error, use no-link template |
| Invalid template ID | Log error, fall back to default subscription template |
| Gov Notify API failure | Log error, mark notification as Failed in audit log |
| Missing case metadata | Continue with empty conditional fields (flags = false) |
| Multiple format detection fails | Default to Excel-only for SJP, PDF-only for non-SJP |

### Validation Requirements

1. **Template ID validation**: Ensure template ID is one of four valid UUIDs
2. **File size validation**: Must be positive integer (bytes) or null
3. **List type validation**: Must exist in list types registry
4. **Personalisation validation**: All required base fields must be non-empty
5. **Download URL validation**: Must be valid HTTPS URL with correct format

### Edge Cases

1. **File exactly 2MB**: Treated as >= 2MB (use no-link template)
2. **SJP list without Excel**: Should not occur per spec, but handle gracefully with Excel-only template
3. **Non-SJP list with Excel**: Ignore Excel, use PDF-only template
4. **Missing content date**: Use artefact creation date as fallback
5. **Empty location name**: Use location ID or "Unknown location"
6. **Malformed case metadata**: Skip conditional fields, send without case info

## 4. Acceptance Criteria Mapping

### AC1: SJP list under 2MB with PDF and Excel
- **Implementation**: `selectTemplate()` returns `TEMPLATE_SJP_PDF_EXCEL` when `isSJP=true`, `fileSize < 2MB`, `hasPdf=true`, `hasExcel=true`
- **Verification**: Unit test template selection, E2E test with manual upload of 1.5MB SJP Excel file

### AC2: SJP list under 2MB with Excel only
- **Implementation**: `selectTemplate()` returns `TEMPLATE_SJP_EXCEL_ONLY` when `isSJP=true`, `fileSize < 2MB`, `hasPdf=false`, `hasExcel=true`
- **Verification**: Unit test template selection, E2E test with SJP Excel upload without PDF conversion

### AC3: Any list over 2MB
- **Implementation**: `selectTemplate()` returns `TEMPLATE_NO_LINKS` when `fileSize >= 2MB` (regardless of list type)
- **Verification**: Unit test with 2.1MB mock file, E2E test with large file upload

### AC4: Non-SJP list under 2MB
- **Implementation**: `selectTemplate()` returns `TEMPLATE_NON_SJP_PDF` when `isSJP=false`, `fileSize < 2MB`
- **Verification**: Unit test template selection, E2E test with Civil Daily Cause List upload

### AC5: Email personalisation includes case details
- **Implementation**: `buildTemplateParameters()` sets conditional flags based on `caseMetadata` extraction
- **Verification**: Unit test personalisation building with various case metadata scenarios

## 5. Open Questions

### CLARIFICATIONS NEEDED

1. **Case metadata storage**: Where exactly is case number, URN, and case name stored?
   - In `artefact.search` JSON field?
   - In separate case table?
   - Parsed from file content?
   - **Impact**: Affects `extractCaseMetadata()` implementation

2. **Summary of cases generation**: How is `summary_of_cases` calculated?
   - Is it a simple count ("15 cases listed")?
   - A text snippet from content?
   - Pre-generated and stored in artefact metadata?
   - **Impact**: Affects personalisation building logic

3. **PDF conversion detection**: How do we know if a PDF version exists for SJP Excel files?
   - Separate artefact record with `convertedFrom` relationship?
   - Same artefact with multiple file extensions stored?
   - Flag in artefact metadata?
   - **Impact**: Affects `hasPdf` determination in `selectTemplate()`

4. **Excel format identification**: What's the most reliable way to detect Excel format?
   - File extension (`.xlsx`, `.xls`)?
   - MIME type from upload?
   - `sourceArtefactId` suffix?
   - **Impact**: Affects format detection logic

5. **Gov Notify subject line customization**: Can Gov Notify templates use personalisation variables in subject lines?
   - If yes: Add `email_subject` to personalisation with dynamic case info
   - If no: Subject customization becomes future work
   - **Impact**: Determines if dynamic subjects are in scope

6. **Test environment template IDs**: Are there separate Gov Notify template IDs for dev/staging?
   - Needed for E2E tests without sending real emails
   - **Impact**: E2E test configuration

7. **Existing file size data**: For existing artefacts without `fileSize`, should we:
   - Backfill with migration script?
   - Calculate on-demand in notification service?
   - Default to no-link template?
   - **Impact**: Migration strategy and backward compatibility

8. **Download link text vs URL**: The spec shows `pdf_link_text` and `excel_link_text` - should these be:
   - The full download URL (`https://...`)?
   - Descriptive text ("Download PDF version")?
   - **Impact**: Affects personalisation building and Gov Notify template configuration
