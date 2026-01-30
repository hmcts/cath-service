# Implementation Tasks

## Phase 1: Module Setup and Excel Generation

- [ ] Create `libs/excel-generation` module structure
  - [ ] Create package.json with exceljs dependency
  - [ ] Create tsconfig.json
  - [ ] Add module to root tsconfig.json paths
  - [ ] Create src/config.ts (empty for now - no routes/pages)
  - [ ] Create src/index.ts for business logic exports

- [ ] Implement Excel generation service
  - [ ] Create `src/excel/excel-styles.ts` with styling constants
  - [ ] Create `src/excel/sjp-formatter.ts` to parse SJP JSON structure
  - [ ] Create `src/excel/excel-generator.ts` main generation function
  - [ ] Create `src/excel/summary-generator.ts` for case summary text
  - [ ] Add unit tests for each file

- [ ] Implement file storage service in excel-generation module
  - [ ] Create `src/file-storage/file-storage-service.ts` to save Excel files
  - [ ] Add function to calculate file size in KB/MB
  - [ ] Add unit tests

## Phase 2: Download Page Module

- [ ] Create `libs/subscription-pages` module structure
  - [ ] Create package.json
  - [ ] Create tsconfig.json with build:nunjucks script
  - [ ] Add module to root tsconfig.json paths
  - [ ] Create src/config.ts with pageRoutes and apiRoutes exports
  - [ ] Create src/index.ts for business logic exports

- [ ] Implement download page controller
  - [ ] Create `src/pages/download-file/[fileId].ts` controller with GET handler
  - [ ] Create `src/pages/download-file/[fileId].njk` template
  - [ ] Create `src/pages/download-file/en.ts` English content
  - [ ] Create `src/pages/download-file/cy.ts` Welsh content (use placeholders)
  - [ ] Add unit tests for controller

- [ ] Implement download service
  - [ ] Create `src/download/download-service.ts` with file retrieval logic
  - [ ] Add validation for artefact IDs (UUID format)
  - [ ] Add file type filtering (Excel only)
  - [ ] Add unit tests

- [ ] Implement download API endpoint
  - [ ] Create `src/routes/download/[fileId].ts` API route
  - [ ] Add authentication middleware (requireAuth)
  - [ ] Set correct Content-Type headers for Excel download
  - [ ] Add error handling for missing files
  - [ ] Add unit tests

- [ ] Register module in web application
  - [ ] Import pageRoutes in apps/web/src/app.ts
  - [ ] Register with createSimpleRouter
  - [ ] Import apiRoutes in apps/api/src/app.ts
  - [ ] Register API routes with createSimpleRouter

## Phase 3: Notification System Enhancement

- [ ] Update notification template configuration
  - [ ] Modify `libs/notifications/src/govnotify/template-config.ts`
  - [ ] Add new TemplateParameters fields (download_link, case_summary, file_size)
  - [ ] Update buildTemplateParameters function signature
  - [ ] Add unit tests for new parameters

- [ ] Update notification service
  - [ ] Modify `libs/notifications/src/notification/notification-service.ts`
  - [ ] Update processUserNotification to include Excel download link
  - [ ] Add case summary generation call
  - [ ] Add file size calculation
  - [ ] Add integration tests

- [ ] Configure GOV.UK Notify template
  - [ ] Update template in GOV.UK Notify admin portal
  - [ ] Add Special Category Data warning section
  - [ ] Add download link section with ((download_link)) personalization
  - [ ] Add case summary section with ((case_summary)) personalization
  - [ ] Test template with sample data
  - [ ] Update GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION environment variable (if new template)

## Phase 4: Blob Ingestion Integration

- [ ] Integrate Excel generation into blob ingestion
  - [ ] Modify `libs/api/src/blob-ingestion/repository/service.ts`
  - [ ] Add Excel generation after JSON file save
  - [ ] Add error handling for Excel generation failures
  - [ ] Continue ingestion if Excel fails (log as PARTIAL_SUCCESS)
  - [ ] Pass Excel metadata to notification trigger

- [ ] Update notification trigger
  - [ ] Modify triggerPublicationNotifications in blob-ingestion service
  - [ ] Include download link construction
  - [ ] Include file size information
  - [ ] Add integration tests

## Phase 5: Testing

- [ ] Unit tests
  - [ ] Excel generation service (structure, styling, content)
  - [ ] SJP formatter (JSON parsing)
  - [ ] Case summary generator (text formatting)
  - [ ] File storage service (save/retrieve)
  - [ ] Download service (file retrieval, validation)
  - [ ] Template configuration (parameter building)
  - [ ] Download page controller (GET handler)
  - [ ] Download API endpoint (authentication, headers)

- [ ] Integration tests
  - [ ] Blob ingestion with Excel generation
  - [ ] Notification sending with download links
  - [ ] File retrieval for download
  - [ ] Multiple subscribers receive same download link

- [ ] E2E test
  - [ ] Complete subscription → upload → email → download journey
  - [ ] Verify Special Category Data warning in email
  - [ ] Verify case summary in email
  - [ ] Verify download link functionality
  - [ ] Test Welsh translation on download page
  - [ ] Accessibility testing with axe-core
  - [ ] Keyboard navigation on download page
  - [ ] Successful Excel file download and validation

## Phase 6: Documentation and Deployment

- [ ] Update environment variables documentation
  - [ ] Document GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION (if changed)
  - [ ] Document EXCEL_GENERATION_ENABLED feature flag (optional)
  - [ ] Document CATH_SERVICE_URL for download links

- [ ] Welsh translations
  - [ ] Replace "Welsh placeholder" in download page cy.ts
  - [ ] Get translations approved by HMCTS translation team
  - [ ] Update GOV.UK Notify template with Welsh version

- [ ] Update deployment documentation
  - [ ] Add Excel generation to feature list
  - [ ] Document storage directory requirements
  - [ ] Document GOV.UK Notify template setup

- [ ] Code review and merge
  - [ ] Address review feedback
  - [ ] Ensure all tests passing
  - [ ] Merge to master

## Phase 7: Monitoring and Rollout

- [ ] Deploy to staging environment
  - [ ] Test with real SJP data
  - [ ] Verify email delivery
  - [ ] Verify Excel download functionality
  - [ ] Check file storage location

- [ ] Enable feature flag in production (if using)
  - [ ] Start with small percentage of users
  - [ ] Monitor logs for errors
  - [ ] Check email delivery rates

- [ ] Full production rollout
  - [ ] Enable for all users
  - [ ] Monitor Excel generation success rate
  - [ ] Monitor download link click-through rate
  - [ ] Monitor error logs

- [ ] Post-deployment verification
  - [ ] Verify subscribers receiving emails with download links
  - [ ] Verify Excel files can be downloaded
  - [ ] Check storage directory for Excel files
  - [ ] Verify notification audit logs
