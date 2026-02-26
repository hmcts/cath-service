# VIBE-357: Implementation Tasks

## Implementation Tasks

### 1. Database Setup
- [x] Add `location_metadata` table to `libs/location/prisma/schema.prisma`
- [x] Add `locationMetadata` relation to Location model in `libs/location/prisma/schema.prisma`
- [x] Run `yarn db:migrate:dev` to create migration and apply changes
- [x] Verify schema in Prisma Studio

### 2. Business Logic Layer (in libs/location)
- [x] Add LocationMetadata types to `libs/location/src/repository/model.ts`
- [x] Create `libs/location/src/repository/location-metadata-queries.ts` with Prisma database queries
- [x] Create `libs/location/src/validation/location-metadata-validation.ts` with input validation functions
- [x] Create `libs/location/src/repository/location-metadata-service.ts` with business logic functions
- [x] Export location-metadata functions from `libs/location/src/index.ts`
- [x] Write unit tests for service layer

### 3. Search Page (in libs/system-admin-pages)
- [x] Create `libs/system-admin-pages/src/pages/location-metadata-search/index.ts` with GET and POST handlers
- [x] Create `libs/system-admin-pages/src/pages/location-metadata-search/index.njk` template with autocomplete
- [x] Create `libs/system-admin-pages/src/pages/location-metadata-search/en.ts` with English content
- [x] Create `libs/system-admin-pages/src/pages/location-metadata-search/cy.ts` with Welsh translations
- [x] Add requireRole middleware for SYSTEM_ADMIN
- [x] Handle validation errors for missing location selection
- [ ] Write unit tests for handlers

### 4. Management Page (in libs/system-admin-pages)
- [x] Create `libs/system-admin-pages/src/pages/location-metadata-manage/index.ts` with GET and POST handlers
- [x] Create `libs/system-admin-pages/src/pages/location-metadata-manage/index.njk` with 4 textarea form
- [x] Create `libs/system-admin-pages/src/pages/location-metadata-manage/en.ts` with English content
- [x] Create `libs/system-admin-pages/src/pages/location-metadata-manage/cy.ts` with Welsh translations
- [x] Implement conditional button rendering (Create vs Update/Delete)
- [x] Handle session storage for location details
- [x] Add validation for at least one message required
- [ ] Write unit tests for handlers

### 5. Delete Confirmation Page (in libs/system-admin-pages)
- [x] Create `libs/system-admin-pages/src/pages/location-metadata-delete-confirmation/index.ts` with GET and POST handlers
- [x] Create `libs/system-admin-pages/src/pages/location-metadata-delete-confirmation/index.njk` with Yes/No radios
- [x] Create `libs/system-admin-pages/src/pages/location-metadata-delete-confirmation/en.ts` with English content
- [x] Create `libs/system-admin-pages/src/pages/location-metadata-delete-confirmation/cy.ts` with Welsh translations
- [x] Handle Yes/No logic in POST handler
- [ ] Write unit tests for handlers

### 6. Success Page (in libs/system-admin-pages)
- [x] Create `libs/system-admin-pages/src/pages/location-metadata-success/index.ts` with GET handler
- [x] Create `libs/system-admin-pages/src/pages/location-metadata-success/index.njk` with GOV.UK panel
- [x] Create `libs/system-admin-pages/src/pages/location-metadata-success/en.ts` with English content
- [x] Create `libs/system-admin-pages/src/pages/location-metadata-success/cy.ts` with Welsh translations
- [x] Handle three operation types (created, updated, deleted)
- [ ] Write unit tests for handler

### 7. Update Summary of Publications
- [x] Update `libs/public-pages/src/pages/summary-of-publications/index.ts` to fetch location metadata
- [x] Pass metadata messages to template (caution and no-list for both languages)
- [x] Update `libs/public-pages/src/pages/summary-of-publications/index.njk` to display messages
- [x] Implement display logic: caution when publications exist, both when no publications
- [x] Handle locale-specific message selection
- [ ] Write unit tests for new logic

### 8. Update System Admin Dashboard
- [x] Update `libs/system-admin-pages/src/pages/system-admin-dashboard/en.ts` href to `/location-metadata-search`
- [x] Update `libs/system-admin-pages/src/pages/system-admin-dashboard/cy.ts` href to `/location-metadata-search`

### 9. Testing
- [ ] Write unit tests for all service functions
- [ ] Write unit tests for all page handlers
- [ ] Create E2E test for complete admin journey (search → manage → create → success)
- [ ] Create E2E test for update journey (search → manage → update → success)
- [ ] Create E2E test for delete journey (search → manage → delete → confirm → success)
- [ ] Create E2E test for message display on summary page (with and without publications)
- [ ] Test Welsh translations throughout all pages
- [ ] Test accessibility with screen reader on all pages
- [ ] Test validation error handling

### 10. Documentation and Cleanup
- [ ] Run `yarn lint:fix` to fix any linting issues
- [ ] Run `yarn format` to format all new code
- [ ] Verify all imports use `.js` extensions for relative imports
- [ ] Ensure all TypeScript errors are resolved
- [ ] Test locally with `yarn dev`
- [ ] Verify database migrations work correctly
- [ ] Check all pages load without errors

### 11. Optional Enhancements (if clarifications confirm)
- [ ] Add default messages for RCJ and Rolls Building in migration
- [ ] Add audit logging for metadata operations
- [ ] Add character count indicators on textareas
- [ ] Add FaCT link if location is known
