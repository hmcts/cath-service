# VIBE-341: Implementation Tasks

## Architecture Overview

```
Two Upload Paths (both use shared PDF generation):

┌─ API Path ────────────────────────────────────────────────────────────────┐
│ POST /v1/publication                                                      │
│   └─> processBlobIngestion()                                              │
│         ├─> Save JSON to storage/temp/uploads/{artefactId}.json           │
│         ├─> [NEW] generatePublicationPdf() from @hmcts/publication        │
│         └─> triggerPublicationNotifications(pdfFilePath)                  │
└───────────────────────────────────────────────────────────────────────────┘

┌─ Admin UI Path ───────────────────────────────────────────────────────────┐
│ /manual-upload-summary (POST)                                             │
│   └─> postHandler()                                                       │
│         ├─> saveUploadedFile()                                            │
│         ├─> [NEW] generatePublicationPdf() from @hmcts/publication        │
│         └─> sendPublicationNotifications(pdfFilePath)                     │
└───────────────────────────────────────────────────────────────────────────┘

┌─ Shared PDF Generation (libs/publication) ────────────────────────────────┐
│ generatePublicationPdf(artefactId, listTypeId, jsonData)                  │
│   ├─> If Civil/Family list:                                               │
│   │     ├─> Render HTML using renderCauseListData()                       │
│   │     ├─> Generate PDF using @hmcts/pdf-generation                      │
│   │     └─> Save to storage/temp/uploads/{artefactId}.pdf                 │
│   └─> Return PDF path (or null if not applicable)                         │
└───────────────────────────────────────────────────────────────────────────┘

┌─ Enhanced Notifications (libs/notifications) ─────────────────────────────┐
│ sendPublicationNotifications(event with pdfFilePath)                      │
│   └─> If Civil/Family list:                                               │
│         ├─> Read PDF size from pdfFilePath                                │
│         ├─> Build case summary using @hmcts/civil-and-family-daily-cause-list │
│         ├─> Select template (PDF+summary, summary-only, or original)      │
│         └─> Send email via GOV.UK Notify                                  │
└───────────────────────────────────────────────────────────────────────────┘
```

## Implementation Tasks

### Phase 1: PDF Generation Module
- [x] Install Puppeteer dependency (`yarn add puppeteer` at root)
- [x] Create `libs/pdf-generation` module (package.json, tsconfig.json)
- [x] Register module in root tsconfig.json paths
- [x] Create `libs/pdf-generation/src/generator.ts`:
  - `generatePdfFromHtml(html: string): Promise<Buffer>` - Puppeteer-based conversion
- [x] Create `libs/pdf-generation/src/index.ts` - export public API
- [x] Write unit tests for PDF generator

### Phase 2: Shared PDF Generation Service
- [x] Create PDF generation service (implemented in `libs/list-types/civil-and-family-daily-cause-list/src/pdf/pdf-generator.ts`):
  - `generateCauseListPdf()` - Generates PDF for Civil and Family Daily Cause List
  - Renders HTML using `renderCauseListData()`
  - Generates PDF using `@hmcts/pdf-generation`
  - Saves PDF to `storage/temp/uploads/{artefactId}.pdf`
  - Checks if PDF exceeds 2MB
- [x] Export from `libs/list-types/civil-and-family-daily-cause-list/src/index.ts`
- [x] Add dependencies (nunjucks, @hmcts/pdf-generation)

### Phase 2b: Integrate PDF Generation into Both Upload Paths
- [x] Update `libs/api/src/blob-ingestion/repository/service.ts` (API path):
  - After saving JSON, call `generateCauseListPdf()` from `@hmcts/civil-and-family-daily-cause-list`
  - Pass PDF path to `triggerPublicationNotifications()`
- [x] Update `libs/admin-pages/src/pages/manual-upload-summary/index.ts` (Admin UI path):
  - After `saveUploadedFile()`, call `generateCauseListPdf()` from `@hmcts/civil-and-family-daily-cause-list`
  - Pass PDF path to `sendPublicationNotifications()`
- [ ] Write integration tests for both paths

### Phase 3: Email Summary Builder
- [x] Create `libs/list-types/civil-and-family-daily-cause-list/src/email-summary/summary-builder.ts`:
  - `extractCaseSummary(jsonData: CauseListData): CaseSummaryItem[]`
  - `formatCaseSummaryForEmail(items: CaseSummaryItem[]): string`
  - Extract: Applicant, Case reference, Case name, Case type, Hearing type
  - Reuse party extraction logic from renderer
- [x] Add `SPECIAL_CATEGORY_DATA_WARNING` constant
- [x] Export from `libs/list-types/civil-and-family-daily-cause-list/src/index.ts`
- [x] Write unit tests with sample JSON data

### Phase 4: Extend Template Configuration
- [x] Update `libs/notifications/src/govnotify/template-config.ts`:
  - Add env var `GOVUK_NOTIFY_TEMPLATE_ID_PDF_AND_SUMMARY` (Template 1)
  - Add env var `GOVUK_NOTIFY_TEMPLATE_ID_SUMMARY_ONLY` (Template 2)
  - Keep existing `GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION` (Template 3 - original)
- [x] Create `getTemplateIdForListType(listTypeId: number, hasPdf: boolean, pdfUnder2MB: boolean): string`
- [x] Extend `TemplateParameters` interface:
  - `special_category_warning?: string`
  - `case_summary?: string`
  - `pdf_download_link?: string`
- [x] Create `buildEnhancedTemplateParameters()` for Civil and Family lists
- [ ] Write unit tests for template selection logic

### Phase 5: Extend Notification Service
- [x] Update `libs/notifications/src/notification/notification-service.ts`:
  - Extend `PublicationEvent` interface with optional fields:
    - `listTypeId: number`
    - `pdfFilePath?: string`
    - `jsonData?: unknown` (raw JSON, typed per list type)
  - Update `sendPublicationNotifications()` to handle enhanced flow
  - For Civil and Family lists:
    - Read PDF size from `pdfFilePath`
    - Import `extractCaseSummary`, `formatCaseSummaryForEmail` from `@hmcts/civil-and-family-daily-cause-list`
    - Build case summary from `jsonData`
    - Select appropriate template based on PDF size
  - For other list types: use existing Template 3 (original behaviour)
- [x] Update `processUserNotification()` to support enhanced parameters
- [x] Update `govnotify-client.ts` to accept optional `templateId` parameter
- [ ] Write unit tests for enhanced notification flow

### Phase 6: Update Publication Upload to Pass PDF Info
- [x] Update `triggerPublicationNotifications()` in `libs/api/src/blob-ingestion/repository/service.ts`:
  - Pass `listTypeId` to notification service
  - Pass `pdfFilePath` if PDF was generated
  - Pass `jsonData` (hearing_list) for case summary extraction
- [x] Update admin upload path to pass the same information
- [x] Update `.env.example` with new environment variables
- [x] Ensure existing list types continue working unchanged
- [ ] Write integration test for complete flow

### Phase 7: GOV.UK Notify Templates (Manual)
- [x] Create Template 1 in GOV.UK Notify dashboard:
  - Subject: "New Daily Cause List available"
  - Body: Special category warning + trigger text + PDF link + case summary + unsubscribe
- [x] Create Template 2 in GOV.UK Notify dashboard:
  - Subject: "New Daily Cause List available"
  - Body: Special category warning + trigger text + case summary + unsubscribe (no PDF link)
- [x] Configure personalisation fields in each template
- [x] Add template IDs to environment variables
- [x] Update `.env.example` files

### Phase 8: Testing
- [ ] Unit tests: >80% coverage on new code
- [ ] Integration tests:
  - PDF generation during upload
  - Template selection based on list type and PDF size
  - Email sending with enhanced parameters
- [ ] E2E test: Upload Civil/Family list → PDF generated → Subscriber receives email with PDF link
- [ ] E2E test: Upload Civil/Family list with large data → PDF >2MB → Email with summary only
- [ ] E2E test: Upload other list type → Original template used
- [ ] E2E test: Welsh language support in email summary

### Phase 9: Configuration & Deployment
- [ ] Document all new environment variables in `.env.example`
- [ ] Configure Puppeteer for containerized environment:
  - Install Chrome/Chromium dependencies in Dockerfile
  - Set `PUPPETEER_EXECUTABLE_PATH` if needed
- [ ] Test in staging with real GOV.UK Notify
- [ ] Monitor PDF generation performance (memory, time)

### Phase 10: Final Validation
- [ ] Verify all acceptance criteria from ticket
- [ ] Code review
- [ ] Manual test complete user journey in staging
- [ ] Deploy and monitor first batch of notifications
