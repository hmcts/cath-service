# Implementation Tasks: Add Flat-File Only List Type Flag

## Phase 1: Database Schema and Data Access Layer

### Database Migration
- [ ] Create Prisma migration for `list_type` table with all fields
- [ ] Add `is_flat` column with default `false`
- [ ] Add unique constraint on `name` column
- [ ] Create seed script to populate table from `mockListTypes` data
- [ ] Run migration on development database
- [ ] Verify seed data inserted correctly

### Data Access Layer
- [ ] Create `libs/list-types/common/src/list-type-queries.ts`
- [ ] Implement `getAllListTypes()` query function
- [ ] Implement `getListTypeById(id)` query function
- [ ] Implement `getListTypeByName(name)` query function
- [ ] Implement `upsertListType(data)` function
- [ ] Write unit tests for all query functions
- [ ] Update `libs/list-types/common/src/index.ts` to export query functions

## Phase 2: API Validation Changes

### API Endpoint Modification
- [ ] Update `libs/api/src/routes/v1/publication.ts`
- [ ] Add validation to reject JSON payloads for `is_flat = true` list types
- [ ] Return 400 error with descriptive message
- [ ] Update type guard `isBlobIngestionRequest` if needed
- [ ] Write unit tests for JSON rejection logic
- [ ] Write integration tests for API endpoint behavior

### Blob Ingestion Validation
- [ ] Update `libs/api/src/blob-ingestion/validation.ts`
- [ ] Skip JSON schema validation for `is_flat = true` list types (line ~132)
- [ ] Update to query database for list type instead of using `mockListTypes`
- [ ] Write unit tests for validation logic
- [ ] Verify existing tests still pass

## Phase 3: Manual Upload Validation

### Upload Validation Logic
- [ ] Update `libs/admin-pages/src/manual-upload/validation.ts`
- [ ] Add check for `is_flat` flag before JSON validation (line ~126)
- [ ] Add error when JSON file uploaded to flat-file-only type
- [ ] Update to query database for list type
- [ ] Write unit tests for flat file validation

### Error Messages
- [ ] Add error message to `libs/admin-pages/src/locales/en.ts`
  - `flatFileOnlyType: "This list type only accepts flat files (PDF, CSV, Excel, etc.). JSON files are not allowed."`
- [ ] Add Welsh error message to `libs/admin-pages/src/locales/cy.ts`
  - `flatFileOnlyType: "Mae'r math hwn o restr yn derbyn ffeiliau fflat yn unig (PDF, CSV, Excel, ac ati). Ni chaniateir ffeiliau JSON."`

## Phase 4: Admin UI - Configure List Type Page

### Page Structure
- [ ] Create directory `libs/admin-pages/src/pages/configure-list-type-enter-details/`
- [ ] Create `index.ts` controller with GET and POST handlers
- [ ] Create `index.njk` Nunjucks template
- [ ] Create `en.ts` with English content
- [ ] Create `cy.ts` with Welsh content
- [ ] Create `index.test.ts` for unit tests

### Controller Implementation
- [ ] Implement GET handler to load existing list types
- [ ] Implement POST handler with validation
- [ ] Add business rule: if `isFlat = true`, force `isNonStrategic = false`
- [ ] Add role-based access control (system admin only)
- [ ] Implement redirect to success page after save
- [ ] Handle errors and re-render with validation messages

### Template Implementation
- [ ] Add form with all required fields
- [ ] Implement "Is flat file only" radio buttons (Yes/No)
- [ ] Implement "Is non-strategic" radio buttons (Yes/No)
- [ ] Add GOV.UK error summary component
- [ ] Add inline error messages for each field
- [ ] Add form labels and hint text

### Progressive Enhancement
- [ ] Create JavaScript file to disable "Is non-strategic" when "Is flat" selected
- [ ] Add event listeners for radio button changes
- [ ] Ensure core functionality works without JavaScript
- [ ] Test keyboard navigation

### Content Files
- [ ] Add all page text to `en.ts` (title, labels, hints, errors)
- [ ] Add Welsh translations to `cy.ts`
- [ ] Add success page content
- [ ] Add validation error messages

## Phase 5: Update Existing Code to Use Database

### Update List Type Consumers
- [ ] Update `libs/admin-pages/src/pages/manual-upload/index.ts` to query database
- [ ] Update `libs/admin-pages/src/pages/non-strategic-upload/index.ts` to query database
- [ ] Update `libs/api/src/blob-ingestion/repository/service.ts` to query database
- [ ] Update `libs/publication/src/repository/queries.ts` if it references list types
- [ ] Verify all imports of `mockListTypes` are updated
- [ ] Update any other consumers found via grep

### Backward Compatibility
- [ ] Keep `mockListTypes` array temporarily for reference
- [ ] Add deprecation notice in code comments
- [ ] Plan removal of `mockListTypes` in future ticket

## Phase 6: Testing

### Unit Tests
- [ ] Test all database query functions
- [ ] Test configure list type controller (GET and POST)
- [ ] Test validation logic for flat file types
- [ ] Test API endpoint rejection of JSON
- [ ] Test business rule enforcement (is_flat → is_non_strategic)

### Integration Tests
- [ ] Test complete flow: create list type → upload JSON → verify rejection
- [ ] Test complete flow: create list type → upload PDF → verify success
- [ ] Test API endpoint with flat-file-only type
- [ ] Test manual upload with flat-file-only type

### E2E Tests (Playwright)
- [ ] Test admin creates flat-file-only list type
- [ ] Test upload JSON to flat type shows error message
- [ ] Test upload PDF to flat type succeeds
- [ ] Test "is non-strategic" disabled when "is flat" selected (with JavaScript)
- [ ] Test server-side validation when JavaScript disabled
- [ ] Test Welsh translation of all pages

### Manual Testing Checklist
- [ ] Database migration runs successfully
- [ ] Seed data populates correctly
- [ ] Configure list type page loads
- [ ] Form validation works
- [ ] List type created successfully
- [ ] Manual upload rejects JSON for flat types
- [ ] Manual upload accepts PDF for flat types
- [ ] API rejects JSON for flat types
- [ ] Welsh translations display correctly

## Phase 7: Documentation and Cleanup

### Documentation
- [ ] Update README if necessary
- [ ] Document new admin page in user guide
- [ ] Add comments to complex validation logic
- [ ] Update API documentation for `/publication` endpoint

### Code Cleanup
- [ ] Remove any console.log statements
- [ ] Remove unused imports
- [ ] Format all files with Biome
- [ ] Run linter and fix all issues
- [ ] Remove commented-out code

## Phase 8: Deployment Preparation

### Pre-Deployment Checklist
- [ ] All tests passing
- [ ] Migration tested in development
- [ ] Rollback plan documented
- [ ] Database backup taken
- [ ] Deployment runbook created

### Deployment Steps
- [ ] Apply database migration
- [ ] Deploy backend API changes
- [ ] Deploy frontend admin changes
- [ ] Verify health checks pass
- [ ] Smoke test admin UI
- [ ] Smoke test upload validation

### Post-Deployment Verification
- [ ] Verify admin can access configure list type page
- [ ] Verify flat-file-only validation works
- [ ] Verify API rejects JSON for flat types
- [ ] Monitor error logs for issues
- [ ] Verify no regression in existing functionality

## Notes

- Phases should be completed in order
- Each phase should be tested before moving to the next
- Update this checklist as implementation progresses
- Mark tasks complete with `[x]` when finished
- Add notes for any blockers or issues encountered
