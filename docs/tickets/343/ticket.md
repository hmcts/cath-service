---
# #343: Subscription Emails Fulfilment Complete Journey

**State:** OPEN
**Assignees:** None
**Author:** junaidiqbalmoj
**Labels:** None
**Created:** 2026-02-11T12:00:11Z
**Updated:** 2026-02-12T16:18:44Z

## Description

Once excel generation for SJP has been implemented. We need to make sure that user is able to get all four types of subscriptions emails which have been configured in Gov Notifier:

Media Publication Subscription (JSON) - Both PDF and Excel. This will be send when list type is SJP list and file size is less than 2MB.
Template id: 4017c40f-0644-4b02-acd2-e00a1ece3b85
Personalisation list: 

- if there is case number, display_case_num will be true 
- case_num
- if there is case urn, display_case_urn will be true 
- case_urn
- if there is location, display_locations will be true 
- locations
- ListType
- content_date
- pdf_link_text
- excel_link_text
- display_summary
- summary_of_cases

Media Publication Subscription (JSON) - Excel Only - SJP Press list (need to check)
Template id: e03108e1-db29-40d3-90f2-bf8f6c233c35
Personalisation list: 

- if there is case number, display_case_num will be true 
- case_num
- if there is case urn, display_case_urn will be true 
- case_urn
- if there is location, display_locations will be true 
- locations
- ListType
- content_date
- excel_link_text
- display_summary
- summary_of_cases

Media Publication Subscription (JSON) - No Link - If any list size is more than 2MB (mostly SJP lists)
Template id: 072fa7fd-ac23-4a99-be9a-70153374c66e
Personalisation list: 

- if there is case number, display_case_num will be true 
- case_num
- if there is case urn, display_case_urn will be true 
- case_urn
- if there is location, display_locations will be true 
- locations
- ListType
- content_date
- display_summary
- summary_of_cases

Media Publication Subscription (JSON) - PDF Only. All the list except SJP lists and size is less than 2MB
Template id: e551a0c1-91e7-4871-a540-1e7101b70f14
Personalisation list: 

- if there is case number, display_case_num will be true 
- case_num
- if there is case urn, display_case_urn will be true 
- case_urn
- if there is location, display_locations will be true 
- locations
- ListType
- content_date
- pdf_link_text
- display_summary
- summary_of_cases

As a part of this ticket, we need to tell AI about the personalisation lists and also ask to include dynamic text like case number,  name or urn in the email subject.

**Acceptance criteria:**

- User is able to get all four type of subscription emails.

## Comments

### Comment by OgechiOkelu on 2026-02-12T14:13:57Z
@SPEC new-feature.md

### Comment by hmctsclaudecode on 2026-02-12T14:18:23Z
# Technical Specification: Subscription Email Fulfilment Complete Journey

## 1. User Story
**As a** subscribed user (media professional or member of public)  
**I want to** receive subscription emails with appropriate file download links (PDF, Excel, or no link) based on the publication type and file size  
**So that** I can access court and tribunal hearing lists in the most appropriate format for my needs

## 2. Background

The service currently sends basic subscription emails using a single Gov Notify template. This ticket extends the notification system to support four different email templates based on:
- **List type**: SJP (Single Justice Procedure) vs non-SJP lists
- **File size**: Files under 2MB can include download links, files over 2MB cannot
- **File format**: SJP lists support both PDF and Excel, non-SJP lists are PDF only

### Current Implementation
- Location: `libs/notifications/src/notification/notification-service.ts`
- Single template: `GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION`
- Basic personalisation: locations, ListType, content_date, start_page_link, subscription_page_link
- No file links or dynamic subject lines

### Gov Notify Templates (Provided)
1. **4017c40f-0644-4b02-acd2-e00a1ece3b85**: SJP with PDF + Excel (< 2MB)
2. **e03108e1-db29-40d3-90f2-bf8f6c233c35**: SJP with Excel only (< 2MB) 
3. **072fa7fd-ac23-4a99-be9a-70153374c66e**: Any list, no links (≥ 2MB)
4. **e551a0c1-91e7-4871-a540-1e7101b70f14**: Non-SJP with PDF only (< 2MB)

## 3. Acceptance Criteria

* **Scenario:** SJP list publication under 2MB with both PDF and Excel
    * **Given** a user is subscribed to a location with an SJP list type
    * **And** the publication file size is less than 2MB
    * **And** both PDF and Excel formats are available
    * **When** the publication is created
    * **Then** the user receives email using template 4017c40f-0644-4b02-acd2-e00a1ece3b85
    * **And** the email includes pdf_link_text and excel_link_text personalisation
    * **And** the email subject includes dynamic content (case number/name/URN if available)

* **Scenario:** SJP list publication under 2MB with Excel only
    * **Given** a user is subscribed to a location with an SJP list type
    * **And** the publication file size is less than 2MB
    * **And** only Excel format is available
    * **When** the publication is created
    * **Then** the user receives email using template e03108e1-db29-40d3-90f2-bf8f6c233c35
    * **And** the email includes excel_link_text personalisation

* **Scenario:** Any list publication over 2MB
    * **Given** a user is subscribed to any location
    * **And** the publication file size is 2MB or greater
    * **When** the publication is created
    * **Then** the user receives email using template 072fa7fd-ac23-4a99-be9a-70153374c66e
    * **And** the email includes no download links
    * **And** the email explains the file is too large

* **Scenario:** Non-SJP list publication under 2MB
    * **Given** a user is subscribed to a location with a non-SJP list type
    * **And** the publication file size is less than 2MB
    * **When** the publication is created
    * **Then** the user receives email using template e551a0c1-91e7-4871-a540-1e7101b70f14
    * **And** the email includes pdf_link_text personalisation

* **Scenario:** Email personalisation includes case details
    * **Given** a publication contains case information
    * **When** the notification email is sent
    * **Then** display_case_num is true if case number exists
    * **And** display_case_urn is true if case URN exists
    * **And** display_locations is true if location data exists
    * **And** display_summary includes summary_of_cases if available

## 4. User Journey Flow

```
Publication Created (Manual Upload or API Ingestion)
       ↓
1. Create Artefact in Database
   - Store file metadata (size, type, location, list type)
       ↓
2. Save File to Storage (temp/uploads/)
   - Save as {artefactId}.{extension}
       ↓
3. Trigger sendPublicationNotifications()
   - Query subscriptions for location
       ↓
4. For Each Subscriber:
   ├→ Determine file size (from storage or metadata)
   ├→ Identify list type (SJP vs non-SJP)
   ├→ Check available formats (PDF, Excel, both)
   ├→ Select appropriate template ID
   ├→ Build personalisation object:
   │  ├─ Base fields (locations, ListType, content_date)
   │  ├─ Conditional flags (display_case_num, display_case_urn, etc.)
   │  ├─ Download links (pdf_link_text, excel_link_text) if applicable
   │  └─ Summary data (summary_of_cases)
   ├→ Send email via Gov Notify
   └→ Log notification result in audit log
       ↓
5. Return NotificationResult
   - Report counts: sent, failed, skipped
```

## 5. Low Fidelity Wireframe

Email templates are managed in Gov Notify and not rendered by the application. The application provides personalisation data to populate template variables.

**Email Structure (All Templates):**
```
[GOV.UK Logo]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Subject: New {ListType} published for {locations} [+ case details if available]

Body:
A new {ListType} for {locations} has been published.

Content date: {content_date}

[Conditional: if display_case_num]
Case number: {case_num}

[Conditional: if display_case_urn]
Case URN: {case_urn}

[Conditional: if display_locations]
Locations: {locations}

[Conditional: if display_summary]
Summary: {summary_of_cases}

[Template-specific download links section]

Manage your subscriptions: {subscription_page_link}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## 6. Page Specifications

**Not Applicable** - This feature does not involve page rendering. All changes are backend service logic and email template configuration.

## 7. Content

### Email Personalisation Fields (All Templates)

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `locations` | string | Court/location name | "Birmingham Crown Court" |
| `ListType` | string | Hearing list type name | "Single Justice Procedure Cases" |
| `content_date` | string | Formatted publication date | "12 February 2026" |
| `display_case_num` | boolean | Show case number section | true |
| `case_num` | string | Case number | "12345678" |
| `display_case_urn` | boolean | Show case URN section | true |
| `case_urn` | string | Case URN | "ABC12345" |
| `display_locations` | boolean | Show locations section | true |
| `display_summary` | boolean | Show summary section | true |
| `summary_of_cases` | string | Summary text | "15 cases listed" |

### Template-Specific Fields

**Template 4017c40f (SJP PDF + Excel):**
- `pdf_link_text`: "Download PDF version"
- `excel_link_text`: "Download Excel version"

**Template e03108e1 (SJP Excel only):**
- `excel_link_text`: "Download Excel version"

**Template 072fa7fd (No links, > 2MB):**
- No download link fields

**Template e551a0c1 (Non-SJP PDF only):**
- `pdf_link_text`: "Download PDF version"

### Email Subject Line Format

Dynamic subject line should include available case information:
- With case number: "New {ListType} - Case {case_num}"
- With case name: "New {ListType} - {case_name}"
- With URN: "New {ListType} - URN {case_urn}"
- Default: "New {ListType} published for {locations}"

**Note:** Subject line customization requires Gov Notify template configuration support. If not supported, this becomes a future enhancement.

## 8. URL

**API Routes (No Changes):**
- Existing notification service is triggered internally by publication creation
- No new public-facing URLs required

**Download URLs (Referenced in Emails):**
- PDF: `{CATH_SERVICE_URL}/flat-file/{artefactId}/download`
- Excel: `{CATH_SERVICE_URL}/flat-file/{artefactId}/download` (same endpoint, different extension)

## 9. Validation

### Template Selection Logic

```typescript
function selectTemplate(listType: ListType, fileSize: number, formats: FileFormat[]): string {
  const isSJP = listType.isNonStrategic;
  const isUnder2MB = fileSize < 2 * 1024 * 1024;
  
  if (!isUnder2MB) {
    return "072fa7fd-ac23-4a99-be9a-70153374c66e"; // No links
  }
  
  if (isSJP) {
    const hasPDF = formats.includes("pdf");
    const hasExcel = formats.includes("xlsx") || formats.includes("xls");
    
    if (hasPDF && hasExcel) {
      return "4017c40f-0644-4b02-acd2-e00a1ece3b85"; // PDF + Excel
    }
    return "e03108e1-db29-40d3-90f2-bf8f6c233c35"; // Excel only
  }
  
  return "e551a0c1-91e7-4871-a540-1e7101b70f14"; // Non-SJP PDF
}
```

### File Size Calculation

- Use `fs.statSync(filePath).size` for stored files
- Store file size in Artefact table as `fileSize` field (new column)
- For API ingestion: Use `Content-Length` header or `Buffer.byteLength`

### Data Validation Rules

1. **Template ID**: Must be one of four valid UUIDs
2. **File Size**: Must be positive integer (bytes)
3. **List Type**: Must exist in `mockListTypes` registry
4. **Personalisation Fields**: All required fields must be non-empty strings
5. **Download Links**: Must be valid HTTPS URLs with correct artefact ID format

## 10. Error Messages

### Service-Level Errors (Logged, Not User-Facing)

| Error Condition | Message | Action |
|----------------|---------|--------|
| Invalid template ID | "Invalid Gov Notify template ID: {id}" | Log error, skip notification |
| Missing file | "File not found for artefact {id}" | Log error, use no-link template |
| File size unavailable | "Cannot determine file size for {id}" | Log warning, assume under 2MB |
| Gov Notify API error | "Failed to send email: {error}" | Log error, mark as Failed |
| Missing personalisation | "Missing required field: {field}" | Log error, skip notification |

### User-Facing Errors (In Email Content)

Not applicable - errors prevent email sending. Users are not notified of delivery failures.

## 11. Navigation

**Not Applicable** - This is a backend notification service with no user navigation flow.

## 12. Accessibility

**Email Accessibility Requirements:**

All Gov Notify templates must meet:
- **WCAG 2.2 AA compliance** for email content
- **Plain text alternative** provided automatically by Gov Notify
- **Semantic HTML** in email templates (headings, links, paragraphs)
- **Sufficient color contrast** (4.5:1 minimum)
- **Link text** is descriptive (not "click here")
  - Good: "Download PDF version of hearing list"
  - Bad: "Click here"
- **No color-only information** (use text + color)

**Template Review Checklist:**
- [ ] All templates tested with screen readers
- [ ] Plain text version readable
- [ ] Links have descriptive text
- [ ] Headings properly structured
- [ ] No reliance on color alone

## 13. Test Scenarios

### Unit Tests

* Test template selection logic for all four scenarios
* Test file size calculation from Buffer and file system
* Test personalisation object building with all fields
* Test personalisation object building with conditional fields (missing case data)
* Test download URL generation for PDF and Excel formats
* Test handling of missing file (fallback to no-link template)

### Integration Tests

* Test Gov Notify client sends email with correct template ID
* Test notification audit log records correct template used
* Test notification service handles Gov Notify API errors gracefully
* Test file retrieval from storage for size calculation
* Test artefact metadata query for list type identification

### E2E Tests (One Journey per Template)

* **SJP with PDF + Excel journey**: User subscribes, admin uploads SJP Excel file (<2MB), user receives email with both download links, user can download both formats
* **SJP Excel-only journey**: User subscribes, admin uploads SJP Excel file (<2MB) without PDF conversion, user receives email with Excel link only
* **Large file journey**: User subscribes, admin uploads large file (>2MB), user receives email with no download links and explanation
* **Non-SJP journey**: User subscribes, admin uploads Civil Daily Cause List (<2MB), user receives email with PDF link only

Each journey test should include:
- Subscription creation
- Publication upload/creation
- Email delivery verification (via Gov Notify test API)
- Email content validation (correct template, personalisation)
- Download link functionality (if applicable)
- Accessibility checks inline (not separate tests)

## 14. Assumptions & Open Questions

### Assumptions

1. **File size storage**: File size will be stored in a new `fileSize` column in the `artefact` table (type: `bigint`)
2. **Excel format detection**: Excel files are identified by extension (`.xlsx`, `.xls`) or MIME type (`application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`)
3. **PDF generation**: PDF conversion for SJP lists is assumed to be implemented separately (pre-requisite)
4. **Case metadata**: Case number, URN, and name are parsed from publication JSON content (not stored separately)
5. **Template IDs**: The four Gov Notify template IDs are already configured in Gov Notify dashboard
6. **2MB threshold**: The 2MB file size limit is consistent with existing upload validation (`DEFAULT_MAX_FILE_SIZE`)
7. **Single file format**: Each publication has one primary file format, with optional converted formats

### Open Questions

1. **Subject line customization**: Does Gov Notify support dynamic subject lines via personalisation, or must subjects be configured in template?
   - **Impact**: If not supported, subject customization becomes future work
   
2. **Excel-only scenario**: When does SJP have Excel without PDF? Is this for "SJP Press List" specifically?
   - **Impact**: May need additional list type flag or configuration
   
3. **Case metadata extraction**: Where is case number/URN/name stored? In JSON content, artefact metadata, or separate table?
   - **Impact**: Affects personalisation building logic
   
4. **Summary of cases**: How is `summary_of_cases` generated? Is it a count, text snippet, or structured data?
   - **Impact**: Affects personalisation building logic
   
5. **Multiple formats handling**: If a publication has both PDF and Excel, are they stored as separate files or one file with conversion?
   - **Impact**: Affects file discovery and link generation logic
   
6. **File size for JSON publications**: How is file size calculated for JSON publications that generate PDFs dynamically?
   - **Impact**: May need to store generated file size after PDF creation

7. **Template testing**: Are test Gov Notify template IDs available for development/staging environments?
   - **Impact**: Affects E2E test reliability

---

## Implementation Notes

### Files to Modify

1. **libs/notifications/src/govnotify/template-config.ts**
   - Add constants for four template IDs
   - Update `TemplateParameters` interface with new fields
   - Add template selection function
   - Update `buildTemplateParameters()` with conditional fields

2. **libs/notifications/src/notification/notification-service.ts**
   - Update `processUserNotification()` to select template
   - Add file size retrieval logic
   - Add list type identification logic
   - Update `sendEmail()` call to include template ID parameter

3. **libs/notifications/src/govnotify/govnotify-client.ts**
   - Update `sendEmail()` to accept optional template ID parameter
   - Default to `GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION` for backward compatibility

4. **apps/postgres/prisma/schema.prisma**
   - Add `fileSize` column to `Artefact` model: `fileSize BigInt? @map("file_size")`

5. **libs/publication/src/repository/service.ts**
   - Update `createArtefact()` to accept and store file size

6. **libs/admin-pages/src/pages/manual-upload-summary/index.ts**
   - Calculate and pass file size when creating artefact

7. **libs/api/src/blob-ingestion/repository/service.ts**
   - Calculate and pass file size when creating artefact

### Environment Variables

Add to `.env.example` and documentation:

```bash
# Gov Notify Template IDs for Subscription Emails
GOVUK_NOTIFY_TEMPLATE_ID_SJP_PDF_EXCEL=4017c40f-0644-4b02-acd2-e00a1ece3b85
GOVUK_NOTIFY_TEMPLATE_ID_SJP_EXCEL_ONLY=e03108e1-db29-40d3-90f2-bf8f6c233c35
GOVUK_NOTIFY_TEMPLATE_ID_NO_LINKS=072fa7fd-ac23-4a99-be9a-70153374c66e
GOVUK_NOTIFY_TEMPLATE_ID_NON_SJP_PDF=e551a0c1-91e7-4871-a540-1e7101b70f14
```

### Database Migration

```sql
-- Add file_size column to artefact table
ALTER TABLE artefact ADD COLUMN file_size BIGINT;

-- Add index for file size queries (optional, for reporting)
CREATE INDEX idx_artefact_file_size ON artefact(file_size);
```

### Testing Strategy

1. **Unit tests first**: Test template selection logic in isolation
2. **Mock Gov Notify**: Use `vi.mock()` for Gov Notify client in integration tests
3. **E2E with test templates**: Use Gov Notify test environment with throwaway template IDs
4. **File size scenarios**: Create test files of varying sizes (1MB, 1.9MB, 2.1MB, 5MB)
5. **Accessibility**: Test email HTML output with axe-core or manual screen reader testing

---

**Specification Version:** 1.0  
**Date:** 2026-02-12  
**Author:** Claude (AI Technical Specification Generator)

### Comment by OgechiOkelu on 2026-02-12T16:18:44Z
@Plan 
