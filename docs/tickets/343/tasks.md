# Implementation Tasks - Issue #343

## Database Schema
- [ ] Add `fileSize` column to Artefact model in `apps/postgres/prisma/schema.prisma`
- [ ] Run database migration with `yarn db:migrate:dev`
- [ ] Verify migration applied successfully

## Template Configuration
- [ ] Add four Gov Notify template ID constants to `libs/notifications/src/govnotify/template-config.ts`
- [ ] Add environment variables for template IDs to `.env` and `.env.example`
- [ ] Implement `selectTemplate()` function with file size and list type logic
- [ ] Extend `TemplateParameters` interface with new personalisation fields
- [ ] Implement `buildTemplateParameters()` function with conditional fields and download links
- [ ] Add unit tests for template selection logic (all four scenarios)
- [ ] Add unit tests for personalisation building with various case metadata

## Case Metadata Extraction
- [ ] Create `libs/notifications/src/notification/case-metadata-extractor.ts`
- [ ] Implement `extractCaseMetadata()` function to parse case number, URN, name from artefact
- [ ] Implement summary generation logic
- [ ] Add unit tests for case metadata extraction

## Publication Service
- [ ] Update `createArtefact()` in `libs/publication/src/publication/publication-service.ts` to calculate and store file size
- [ ] Handle both file path and buffer scenarios for size calculation
- [ ] Add unit tests for file size calculation

## Manual Upload Flow
- [ ] Update `POST` handler in `libs/admin-pages/src/pages/manual-upload-summary/index.ts`
- [ ] Calculate file size from uploaded file before creating artefact
- [ ] Pass file size to `createArtefact()` call
- [ ] Add unit tests for file size handling in upload flow

## API Blob Ingestion
- [ ] Update blob ingestion service in `libs/api/src/blob-ingestion/blob-ingestion/blob-ingestion-service.ts`
- [ ] Calculate file size from buffer or Content-Length header
- [ ] Pass file size to `createArtefact()` call
- [ ] Add unit tests for file size handling in blob ingestion

## Notification Service
- [ ] Update `processUserNotification()` in `libs/notifications/src/notification/notification-service.ts`
- [ ] Add case metadata extraction call
- [ ] Add format detection logic (PDF/Excel)
- [ ] Add template selection call
- [ ] Update personalisation building to use new function
- [ ] Update `sendEmail()` call to pass selected template ID
- [ ] Add error handling for missing file size (fallback to no-link template)
- [ ] Add unit tests for notification flow with all four templates

## Gov Notify Client
- [ ] Update `sendEmail()` in `libs/notifications/src/govnotify/govnotify-client.ts` to accept optional template ID parameter
- [ ] Default to existing subscription template ID for backward compatibility
- [ ] Add unit tests for template ID parameter handling

## Integration Tests
- [ ] Test Gov Notify client sends email with correct template ID
- [ ] Test notification audit log records correct template used
- [ ] Test error handling for Gov Notify API failures
- [ ] Test file size retrieval from storage
- [ ] Test graceful degradation when file size unavailable

## E2E Tests
- [ ] Create E2E test for SJP with PDF + Excel journey (< 2MB)
- [ ] Create E2E test for SJP Excel-only journey (< 2MB)
- [ ] Create E2E test for large file journey (≥ 2MB, no links)
- [ ] Create E2E test for non-SJP PDF journey (< 2MB)
- [ ] Verify email content and personalisation in each journey
- [ ] Verify download links work correctly
- [ ] Include accessibility checks inline in each journey test

## Documentation
- [ ] Update notification service documentation with new template logic
- [ ] Document case metadata extraction approach
- [ ] Document file size calculation strategy
- [ ] Add troubleshooting guide for template selection issues
