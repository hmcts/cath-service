# VIBE-228: Implementation Tasks

## Database Setup
- [x] Add MediaApplication model to `apps/postgres/prisma/schema.prisma`
- [x] Create and run database migration
- [x] Generate Prisma client

## Data Layer
- [x] Create `libs/admin-pages/src/media-application/model.ts` with TypeScript interfaces
- [x] Create `libs/admin-pages/src/media-application/queries.ts` with database queries
  - [x] getPendingApplications()
  - [x] getApplicationById(id)
  - [x] updateApplicationStatus(id, status, reviewedBy)
  - [x] getPendingCount()
- [x] Create `libs/admin-pages/src/media-application/service.ts` with business logic
  - [x] approveApplication(id, reviewedBy)
  - [x] deleteProofOfIdFile(filePath)
- [x] Write unit tests for queries and service functions

## Dashboard Updates
- [x] Update `admin-dashboard/index.ts` to fetch pending count
- [x] Update `admin-dashboard/index.njk` to display notification banner
- [x] Update `admin-dashboard/en.ts` with notification text
- [x] Update `admin-dashboard/cy.ts` with Welsh notification text
- [ ] Test notification displays correctly when applications exist

## Page 1: List Applications
- [x] Create `pages/media-applications/index.ts` controller (GET handler)
- [x] Create `pages/media-applications/index.njk` template
- [x] Create `pages/media-applications/en.ts` with English content
- [x] Create `pages/media-applications/cy.ts` with Welsh content
- [x] Add requireRole middleware for CTSC Admin
- [ ] Test table displays pending applications correctly
- [ ] Test empty state when no pending applications

## Page 2: Applicant Details
- [x] Create `pages/media-applications/[id]/index.ts` controller (GET handler)
- [x] Create `pages/media-applications/[id]/index.njk` template
- [x] Create `pages/media-applications/[id]/en.ts` with English content
- [x] Create `pages/media-applications/[id]/cy.ts` with Welsh content
- [x] Implement file preview link with new tab/window
- [x] Add requireRole middleware for CTSC Admin
- [ ] Test details display correctly
- [ ] Test 404 handling for invalid application ID
- [ ] Test file link opens in new tab

## Page 3: Approve Confirmation
- [x] Create `pages/media-applications/[id]/approve.ts` controller (GET/POST handlers)
- [x] Create `pages/media-applications/[id]/approve.njk` template
- [x] Create `pages/media-applications/[id]/approve-en.ts` with English content
- [x] Create `pages/media-applications/[id]/approve-cy.ts` with Welsh content
- [x] Implement radio button validation
- [x] Add requireRole middleware for CTSC Admin
- [ ] Test validation error displays when no radio selected
- [ ] Test "No" redirects back to details page
- [ ] Test "Yes" proceeds to approval

## Page 4: Approved Success
- [x] Create `pages/media-applications/[id]/approved.ts` controller (GET handler)
- [x] Create `pages/media-applications/[id]/approved.njk` template
- [x] Create `pages/media-applications/[id]/approved-en.ts` with English content
- [x] Create `pages/media-applications/[id]/approved-cy.ts` with Welsh content
- [x] Implement success banner with green styling
- [x] Add requireRole middleware for CTSC Admin
- [ ] Test success page displays applicant details correctly

## File Handling
- [x] Verify temp folder location for Press ID files
- [x] Implement file deletion in service layer
- [ ] Test file download link works correctly
- [ ] Test file deletion after approval
- [ ] Handle missing file gracefully

## Error Handling
- [ ] Add error pages for database failures
- [ ] Test invalid application ID handling
- [ ] Test already-approved application handling
- [ ] Test missing file handling
- [ ] Test radio validation error messages (EN/CY)

## Accessibility
- [ ] Run axe-core tests on all pages
- [ ] Verify keyboard navigation works
- [ ] Test with screen reader
- [ ] Verify table headers use proper scope attributes
- [ ] Verify success banner uses role="status"
- [ ] Verify file links have proper aria-label
- [ ] Test color contrast ratios
- [ ] Verify focus states are visible

## Welsh Translation
- [ ] Verify all pages have both en.ts and cy.ts files
- [ ] Test ?lng=cy parameter on all pages
- [ ] Verify error messages in both languages
- [ ] Review Welsh translations with native speaker if available

## Integration Testing
- [ ] E2E test: Dashboard shows notification when applications pending
- [ ] E2E test: Complete approval flow from list to success
- [ ] E2E test: Validation error on confirmation page
- [ ] E2E test: File download functionality
- [ ] E2E test: Welsh language flow

## Documentation
- [ ] Update README if needed
- [ ] Add code comments for complex logic
- [ ] Document any assumptions made

## Pre-Deployment Checklist
- [x] All tests passing (admin-pages: 249 tests passed)
- [x] No TypeScript errors
- [x] No Biome lint warnings
- [x] Database migration tested locally
- [ ] Manual testing completed for all flows
- [ ] Accessibility testing completed
- [ ] Welsh translations verified
