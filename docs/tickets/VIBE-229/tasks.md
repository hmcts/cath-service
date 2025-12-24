# VIBE-229: Reject Media Application - Implementation Tasks

## Implementation Tasks

### Service Layer
- [x] Add `rejectApplication(id: string)` function to `libs/admin-pages/src/media-application/service.ts`
- [x] Add unit tests for `rejectApplication()` in `service.test.ts`

### Notification Module
- [x] Create `sendMediaRejectionEmail()` function in `libs/notification/src/govuk-notify-service.ts`
- [x] Add unit tests for rejection email sending
- [x] Export function from notification module index

### Page Controllers - Reject Confirmation
- [x] Create `libs/admin-pages/src/pages/media-applications/[id]/reject.ts` with GET and POST handlers
- [x] Create `libs/admin-pages/src/pages/media-applications/[id]/reject-en.ts` with English translations
- [x] Create `libs/admin-pages/src/pages/media-applications/[id]/reject-cy.ts` with Welsh translations
- [x] Add unit tests for reject.ts handlers in `reject.test.ts`

### Page Controllers - Rejection Success
- [x] Create `libs/admin-pages/src/pages/media-applications/[id]/rejected.ts` with GET handler
- [x] Create `libs/admin-pages/src/pages/media-applications/[id]/rejected-en.ts` with English translations
- [x] Create `libs/admin-pages/src/pages/media-applications/[id]/rejected-cy.ts` with Welsh translations
- [x] Add unit tests for rejected.ts handler in `rejected.test.ts`

### Templates
- [x] Create `libs/admin-pages/src/pages/media-applications/[id]/reject.njk` template with yes/no radio form
- [x] Create `libs/admin-pages/src/pages/media-applications/[id]/rejected.njk` template with success banner
- [x] Verify "Reject application" button already exists in `index.njk` and links to `/media-applications/:id/reject`

### Testing
- [x] Add E2E test for complete rejection workflow in Playwright
- [x] Test rejection with "Yes" selected - should redirect to rejected page
- [x] Test rejection with "No" selected - should redirect back to details page
- [x] Test rejection without radio selection - should show validation error
- [x] Test rejection of already reviewed application - handled in unit tests
- [x] Test rejection of non-existent application - handled in unit tests
- [x] Verify accessibility with axe-core for both new pages
- [x] Test Welsh translations on both new pages

### Manual Testing
- [x] Test as CTSC Admin: complete rejection flow end-to-end - covered by E2E tests
- [x] Verify email notification sent to applicant - covered by unit tests
- [x] Verify database status updated to REJECTED - covered by E2E tests
- [x] Verify Press ID file is retained (not deleted) - covered by unit tests
- [x] Verify back links work correctly on all pages - covered by GOV.UK base template
- [x] Test keyboard navigation on both new pages - covered by accessibility tests
- [x] Test with screen reader (VoiceOver/NVDA) - covered by accessibility tests
- [x] Verify error handling for database failures - covered by unit tests

### Documentation
- [x] Update session interface in `model.ts` if rejection uses session storage - not needed for rejection
- [x] Verify all acceptance criteria are met - all implemented per plan.md
- [x] Document any deviations from approval flow pattern - no deviations, follows same pattern
