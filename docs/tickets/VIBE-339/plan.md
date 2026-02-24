# VIBE-339: Technical Plan - Email Summary and PDF for RCJ Hearing Lists and Care Standards List

## 1. Technical Approach

### High-Level Strategy

Extend the existing subscription notification system (following the pattern established in VIBE-341 for Civil and Family Daily Cause List) to support:
- **5 new list types**: RCJ Standard Daily Cause List, Court of Appeal Civil Daily Cause List, Administrative Court Daily Cause List, London Administrative Court Daily Cause List, and Care Standards Tribunal Weekly Hearing List
- **PDF generation**: For all 5 list types using their existing renderers
- **Email summaries**: With list-specific case details
- **PDF attachment**: Include PDF in subscription email (or download link if >2MB)

### Architecture Decisions

1. **Reuse existing patterns**: Follow the civil-and-family-daily-cause-list implementation pattern
2. **Module-based approach**: Each list type module contains its own pdf/ and email-summary/ subdirectories
3. **Template strategy**: Use separate GOV.UK Notify templates for RCJ lists and Care Standards list due to different summary content
4. **Service integration**: Extend libs/notifications to handle the 5 new list types

### Key Technical Considerations

- RCJ lists (9, 10, 11, 12) use StandardHearing data model with simpler structure than CauseListData
- Care Standards list (13) uses CareStandardsTribunalHearing data model
- Email summary content differs between RCJ (Case Number, Case Details, Hearing Type) and Care Standards (Case Name, Hearing Date)
- PDF generation requires standalone templates (no GOV.UK Frontend dependencies)
- 2MB PDF size threshold for attachment vs download link in email

## 2. Implementation Details

### File Structure

```
libs/list-types/rcj-standard-daily-cause-list/
├── src/
│   ├── pdf/
│   │   ├── pdf-generator.ts           # PDF generation for RCJ Standard
│   │   ├── pdf-generator.test.ts
│   │   └── pdf-template.njk          # Standalone PDF template
│   ├── email-summary/
│   │   ├── summary-builder.ts        # Extract and format case summaries
│   │   └── summary-builder.test.ts
│   └── ... (existing files)

libs/list-types/court-of-appeal-civil-daily-cause-list/
├── src/
│   ├── pdf/
│   │   ├── pdf-generator.ts
│   │   ├── pdf-generator.test.ts
│   │   └── pdf-template.njk
│   ├── email-summary/
│   │   ├── summary-builder.ts
│   │   └── summary-builder.test.ts
│   └── ... (existing files)

libs/list-types/administrative-court-daily-cause-list/
├── src/
│   ├── pdf/
│   │   ├── pdf-generator.ts
│   │   ├── pdf-generator.test.ts
│   │   └── pdf-template.njk
│   ├── email-summary/
│   │   ├── summary-builder.ts
│   │   └── summary-builder.test.ts
│   └── ... (existing files)

libs/list-types/london-administrative-court-daily-cause-list/
├── src/
│   ├── pdf/
│   │   ├── pdf-generator.ts
│   │   ├── pdf-generator.test.ts
│   │   └── pdf-template.njk
│   ├── email-summary/
│   │   ├── summary-builder.ts
│   │   └── summary-builder.test.ts
│   └── ... (existing files)

libs/list-types/care-standards-tribunal-weekly-hearing-list/
├── src/
│   ├── pdf/
│   │   ├── pdf-generator.ts
│   │   ├── pdf-generator.test.ts
│   │   └── pdf-template.njk
│   ├── email-summary/
│   │   ├── summary-builder.ts        # Different structure for Care Standards
│   │   └── summary-builder.test.ts
│   └── ... (existing files)

libs/notifications/
└── src/
    ├── notification/
    │   └── notification-service.ts   # MODIFY: Add RCJ and Care Standards support
    └── govnotify/
        └── template-config.ts        # MODIFY: Add new template IDs
```

### Components/Modules to Create

**REFERENCE IMPLEMENTATION: civil-and-family-daily-cause-list**

All implementations MUST follow the exact patterns established in `libs/list-types/civil-and-family-daily-cause-list/`.

#### 1. PDF Generation (5 modules)

**Pattern (identical for all list types - based on civil-and-family-daily-cause-list):**

```typescript
// libs/list-types/[list-type]/src/pdf/pdf-generator.ts

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { generatePdfFromHtml } from "@hmcts/pdf-generation";
import { PROVENANCE_LABELS } from "@hmcts/publication";
import nunjucks from "nunjucks";
import type { StandardHearingList } from "../models/types.js";  // or CareStandardsTribunalHearingList
import { renderStandardDailyCauseList } from "../rendering/renderer.js";  // use existing renderer

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MONOREPO_ROOT = path.join(__dirname, "..", "..", "..", "..", "..");
const TEMP_STORAGE_BASE = path.join(MONOREPO_ROOT, "storage", "temp", "uploads");

const MAX_PDF_SIZE_BYTES = 2 * 1024 * 1024; // 2MB

// Interface matches civil-and-family-daily-cause-list pattern
interface PdfGenerationOptions {
  artefactId: string;
  contentDate: Date;  // or displayFrom/displayTo for Care Standards
  locale: string;
  locationId: string;
  jsonData: StandardHearingList;  // or CareStandardsTribunalHearingList
  provenance?: string;
}

interface PdfGenerationResult {
  success: boolean;
  pdfPath?: string;
  sizeBytes?: number;
  exceedsMaxSize?: boolean;
  error?: string;
}

function configureNunjucks(): nunjucks.Environment {
  const templateDir = __dirname;
  const env = nunjucks.configure([templateDir], {
    autoescape: true,
    noCache: true
  });
  return env;
}

export async function generateRcjStandardDailyCauseListPdf(
  options: PdfGenerationOptions
): Promise<PdfGenerationResult> {
  try {
    // 1. Use the existing renderer to prepare data
    const renderedData = renderStandardDailyCauseList(options.jsonData, {
      locale: options.locale,
      listTypeId: 9,  // Adjust per list type
      listTitle: "RCJ Standard Daily Cause List",
      displayFrom: options.contentDate,
      displayTo: options.contentDate,
      lastReceivedDate: new Date().toISOString()
    });

    // 2. Load translations from pages/en.ts or pages/cy.ts
    const translations = await loadTranslations(options.locale);

    // 3. Normalize provenance text
    const provenanceLabel = options.provenance
      ? PROVENANCE_LABELS[options.provenance as keyof typeof PROVENANCE_LABELS] || options.provenance
      : "";

    // 4. Configure Nunjucks and render standalone PDF template
    const env = configureNunjucks();
    const html = env.render("pdf-template.njk", {
      header: renderedData.header,
      hearings: renderedData.hearings,
      dataSource: provenanceLabel,
      t: translations
    });

    // 5. Generate PDF from HTML using @hmcts/pdf-generation
    const pdfResult = await generatePdfFromHtml(html);

    if (!pdfResult.success || !pdfResult.pdfBuffer) {
      return {
        success: false,
        error: pdfResult.error || "PDF generation failed"
      };
    }

    // 6. Check if PDF exceeds 2MB
    const exceedsMaxSize = pdfResult.sizeBytes! > MAX_PDF_SIZE_BYTES;

    // 7. Save PDF to temp storage
    await fs.mkdir(TEMP_STORAGE_BASE, { recursive: true });
    const pdfPath = path.join(TEMP_STORAGE_BASE, `${options.artefactId}.pdf`);
    await fs.writeFile(pdfPath, pdfResult.pdfBuffer);

    return {
      success: true,
      pdfPath,
      sizeBytes: pdfResult.sizeBytes,
      exceedsMaxSize
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return {
      success: false,
      error: `Failed to generate PDF: ${errorMessage}`
    };
  }
}

async function loadTranslations(locale: string): Promise<Record<string, unknown>> {
  if (locale === "cy") {
    const { cy } = await import("../pages/cy.js");
    return cy;
  }
  const { en } = await import("../pages/en.js");
  return en;
}
```

#### 2. Email Summary (5 modules)

**Pattern (identical structure for all list types - based on civil-and-family-daily-cause-list):**

```typescript
// libs/list-types/[list-type]/src/email-summary/summary-builder.ts

import type { StandardHearingList } from "../models/types.js";  // or CareStandardsTribunalHearingList

// Constant - MUST be present in all summary builders
export const SPECIAL_CATEGORY_DATA_WARNING = `Note this email contains Special Category Data as defined by Data Protection Act 2018, formally known as Sensitive Personal Data, and should be handled appropriately.

This email contains information intended to assist the accurate reporting of court proceedings. It is vital you ensure that you safeguard the Special Category Data included and abide by reporting restrictions (for example on victims and children). HMCTS will stop sending the data if there is concern about how it will be used.`;

// RCJ Lists - CaseSummaryItem interface
export interface CaseSummaryItem {
  caseNumber: string;
  caseDetails: string;
  hearingType: string;
}

// Care Standards - CaseSummaryItem interface (different fields)
// export interface CaseSummaryItem {
//   caseName: string;
//   hearingDate: string;
// }

// Extract case summaries from JSON data
export function extractCaseSummary(jsonData: StandardHearingList): CaseSummaryItem[] {
  const summaries: CaseSummaryItem[] = [];

  for (const hearing of jsonData) {
    summaries.push({
      caseNumber: hearing.caseNumber || "N/A",
      caseDetails: hearing.caseDetails || "N/A",
      hearingType: hearing.hearingType || "N/A"
    });
  }

  return summaries;
}

// Format for GOV.UK Notify email (markdown format)
export function formatCaseSummaryForEmail(items: CaseSummaryItem[]): string {
  if (items.length === 0) {
    return "No cases scheduled.";
  }

  const lines: string[] = [];

  // Add horizontal line at the start (below the heading in the template)
  lines.push("---");
  lines.push("");

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    lines.push(`Case number - ${item.caseNumber}`);
    lines.push(`Case details - ${item.caseDetails}`);
    lines.push(`Hearing type - ${item.hearingType}`);

    // Add horizontal line between cases (not after the last one)
    if (i < items.length - 1) {
      lines.push("");
      lines.push("---");
      lines.push("");
    }
  }

  return lines.join("\n");
}
```

#### 3. Module Index Exports

**Pattern (matches civil-and-family-daily-cause-list/src/index.ts):**

```typescript
// libs/list-types/[list-type]/src/index.ts

// Business logic exports
export type { ValidationResult } from "@hmcts/publication";
export * from "./email-summary/summary-builder.js";
export * from "./models/types.js";
export * from "./pdf/pdf-generator.js";
export * from "./rendering/renderer.js";
```

### API Endpoints

No new API endpoints required. The existing subscription notification system triggers automatically on publication upload.

### Database Schema Changes

No database schema changes required.

### Integration Points

#### Notification Service Extension

```typescript
// libs/notifications/src/notification/notification-service.ts

// Add list type IDs
const RCJ_STANDARD_DAILY_CAUSE_LIST_ID = 9;
const COURT_OF_APPEAL_CIVIL_DAILY_CAUSE_LIST_ID = 10;
const ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST_ID = 11;
const LONDON_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST_ID = 12;
const CARE_STANDARDS_TRIBUNAL_WEEKLY_HEARING_LIST_ID = 13;

// Modify buildEmailTemplateData() to handle new list types
async function buildEmailTemplateData(event: PublicationEvent, userName: string): Promise<EmailTemplateData> {
  const isRcjList = [9, 10, 11, 12].includes(event.listTypeId);
  const isCareStandards = event.listTypeId === 13;

  if (isRcjList && event.jsonData) {
    return buildRcjEmailData(event, userName);
  }

  if (isCareStandards && event.jsonData) {
    return buildCareStandardsEmailData(event, userName);
  }

  // Fallback to standard template
  return { templateParameters: buildTemplateParameters(...) };
}
```

#### Template Configuration

```typescript
// libs/notifications/src/govnotify/template-config.ts

// Add new environment variables
const GOVUK_NOTIFY_TEMPLATE_ID_RCJ_PDF_AND_SUMMARY = process.env.GOVUK_NOTIFY_TEMPLATE_ID_RCJ_PDF_AND_SUMMARY || "";
const GOVUK_NOTIFY_TEMPLATE_ID_RCJ_SUMMARY_ONLY = process.env.GOVUK_NOTIFY_TEMPLATE_ID_RCJ_SUMMARY_ONLY || "";
const GOVUK_NOTIFY_TEMPLATE_ID_CARE_STANDARDS_PDF_AND_SUMMARY = process.env.GOVUK_NOTIFY_TEMPLATE_ID_CARE_STANDARDS_PDF_AND_SUMMARY || "";
const GOVUK_NOTIFY_TEMPLATE_ID_CARE_STANDARDS_SUMMARY_ONLY = process.env.GOVUK_NOTIFY_TEMPLATE_ID_CARE_STANDARDS_SUMMARY_ONLY || "";

// Extend getSubscriptionTemplateIdForListType()
export function getSubscriptionTemplateIdForListType(
  listTypeId: number,
  hasPdf: boolean,
  pdfUnder2MB: boolean
): string {
  // Handle RCJ lists
  if ([9, 10, 11, 12].includes(listTypeId)) {
    if (hasPdf && pdfUnder2MB) {
      return GOVUK_NOTIFY_TEMPLATE_ID_RCJ_PDF_AND_SUMMARY;
    }
    return GOVUK_NOTIFY_TEMPLATE_ID_RCJ_SUMMARY_ONLY;
  }

  // Handle Care Standards
  if (listTypeId === 13) {
    if (hasPdf && pdfUnder2MB) {
      return GOVUK_NOTIFY_TEMPLATE_ID_CARE_STANDARDS_PDF_AND_SUMMARY;
    }
    return GOVUK_NOTIFY_TEMPLATE_ID_CARE_STANDARDS_SUMMARY_ONLY;
  }

  // Existing logic for Civil and Family Daily Cause List
  if (listTypeId === CIVIL_AND_FAMILY_DAILY_CAUSE_LIST_ID) {
    // ... existing code
  }

  // Default template
  return getTemplateId();
}
```

## 3. Error Handling & Edge Cases

### PDF Generation Errors

**Scenario**: PDF generation fails due to malformed data or rendering issues
- **Handling**: Catch error, log details, fall back to summary-only email template
- **User impact**: User receives email with summary but no PDF link

**Scenario**: PDF exceeds 2MB limit
- **Handling**: Store PDF in temp storage, generate download token, include download link in email
- **User impact**: User sees download link instead of direct PDF attachment

**Scenario**: Disk space full when saving PDF
- **Handling**: Catch error, log, fall back to summary-only email
- **User impact**: User receives email without PDF

### Email Sending Errors

**Scenario**: GOV.UK Notify API is unavailable
- **Handling**: Mark notification as Failed in audit log with error details
- **Retry**: Not implemented in this ticket (future enhancement)
- **User impact**: User doesn't receive notification, admin can review failed notifications

**Scenario**: Invalid email address
- **Handling**: Skip notification, mark as Skipped in audit log
- **User impact**: User doesn't receive notification

**Scenario**: Missing template parameters
- **Handling**: Catch error during template parameter building, fall back to standard template
- **User impact**: User receives basic notification without enhanced summary

### Validation Requirements

**PDF Generation:**
- Validate artefactId format (CUID)
- Validate contentDate is valid Date object
- Validate locale is "en" or "cy"
- Validate jsonData structure matches expected schema

**Email Summary:**
- Validate jsonData contains hearings array
- Handle empty hearings list gracefully
- Validate required fields exist (caseNumber, caseDetails, hearingType for RCJ; caseName, date for Care Standards)

## 4. Acceptance Criteria Mapping

### AC 1: PDF Generation
**Implementation:**
- pdf-generator.ts in each list type module
- Uses @hmcts/pdf-generation package
- Standalone Nunjucks templates for each list type
- Returns PdfGenerationResult with success status and file path

**Verification:**
- Unit tests for generateXxxPdf() functions
- Test with valid hearing data returns success: true and valid pdfPath
- Test with invalid data returns success: false with error message

### AC 2: PDF Style Matching
**Implementation:**
- PDF templates use same styling as frontend pages
- GOV.UK-like CSS in pdf-template.njk
- Tables match frontend table structure
- Header and footer match List Style Guide

**Verification:**
- Visual comparison of generated PDF with frontend page
- PDF contains all required sections (header, hearings table, footer)
- Fonts, spacing, and layout match style guide

### AC 3: Email Notification Trigger
**Implementation:**
- Existing subscription system already handles trigger
- Extend notification-service.ts to support new list types
- Filter subscriptions by location and list type

**Verification:**
- Integration test: Upload publication for list type 9, verify subscribed users receive email
- Unit test: notification-service.ts correctly identifies RCJ and Care Standards list types

### AC 4: GOV.UK Notify Integration
**Implementation:**
- Reuse existing govnotify-client.ts
- Add new template IDs to template-config.ts
- Configure environment variables for new templates

**Verification:**
- Test emails sent via GOV.UK Notify API
- Verify correct template ID used for each list type
- Check notification audit log records GOV.UK Notify notification ID

### AC 5: Email Summary Content
**Implementation:**
- RCJ lists: extractCaseSummary() returns caseNumber, caseDetails, hearingType
- Care Standards: extractCaseSummary() returns caseName, hearingDate
- formatCaseSummaryForEmail() formats as markdown for GOV.UK Notify

**Verification:**
- Unit tests for extractCaseSummary() with sample data
- Verify formatted output matches required structure
- Test with multiple hearings/cases

### AC 6: Email Format
**Implementation:**
- SPECIAL_CATEGORY_DATA_WARNING constant in summary-builder.ts
- buildEnhancedTemplateParameters() includes all required fields
- GOV.UK Notify template includes opening statement, links, summary, unsubscribe

**Verification:**
- Review GOV.UK Notify template content
- Test email contains all required sections
- Verify links are correctly masked
- Check Special Category Data warning appears at top

### AC 7: PDF in Subscription Email
**Implementation:**
- PDF attached directly to email if under 2MB
- Download link included in email if PDF exceeds 2MB
- PDF stored in storage/temp/uploads/ for retrieval

**Verification:**
- Test email with PDF attachment under 2MB
- Test email with download link when PDF exceeds 2MB
- Verify PDF can be downloaded from link

### AC 8: Testing
**Implementation:**
- Unit tests for all new functions (pdf-generator, summary-builder)
- Integration tests for notification flow
- E2E tests for subscription notifications

**Verification:**
- yarn test passes for all affected modules
- yarn test:e2e includes subscription notification tests

## 5. Open Questions

### CLARIFICATIONS NEEDED

1. **PDF Template Content for RCJ Lists:**
   - Should the RCJ PDF templates include the same "Important Information" box about open justice that appears in the Civil and Family list?
   - Are there any RCJ-specific warnings or notices that should appear in the PDF?

2. **PDF Template Content for Care Standards:**
   - What additional information should appear in the Care Standards PDF header/footer?
   - Should it follow the same format as RCJ lists or have a different structure?

3. **GOV.UK Notify Templates:**
   - Have the GOV.UK Notify templates already been created for RCJ and Care Standards lists?
   - What are the template IDs for:
     - RCJ with PDF and summary
     - RCJ with summary only
     - Care Standards with PDF and summary
     - Care Standards with summary only

4. **Error Handling for Large PDFs:**
   - If a PDF exceeds 2MB, should we still generate it and include a download link, or skip PDF generation entirely?
   - Current assumption: Generate and store, include download link in email

5. **Accessibility Requirements for PDFs:**
   - Should the generated PDFs be fully tagged for screen reader compatibility?
   - Current implementation uses HTML-to-PDF conversion which provides basic accessibility but not full tagging

6. **Email Summary Length:**
   - Is there a maximum number of cases that should be included in the email summary?
   - Should we truncate long lists with "... and X more cases" text?

7. **Translation Status:**
   - The ticket shows "Welsh placeholder" for all Welsh content. Are Welsh translations ready?
   - Should we implement with English-only first and add Welsh later?
