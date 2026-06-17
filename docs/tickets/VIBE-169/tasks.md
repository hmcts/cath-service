# VIBE-169: Remove Publication - Implementation Tasks

## Implementation Tasks

### Phase 1: Repository Functions

- [x] Add `getArtefactsByLocation(locationId: string)` function to `libs/publication/src/repository/queries.ts`
- [x] Add `getArtefactsByIds(artefactIds: string[])` function to `libs/publication/src/repository/queries.ts`
- [x] Add `deleteArtefacts(artefactIds: string[])` function to `libs/publication/src/repository/queries.ts`
- [x] Write unit tests for new repository functions in `libs/publication/src/repository/queries.test.ts`

### Phase 2: Remove List Landing Page

- [x] Create `libs/admin-pages/src/pages/remove-list/index.ts` with GET handler that redirects to `/remove-list/find`
- [x] Create `libs/admin-pages/src/pages/remove-list/en.ts` with English content
- [x] Create `libs/admin-pages/src/pages/remove-list/cy.ts` with Welsh content
- [x] Create `libs/admin-pages/src/pages/remove-list/index.njk` template

### Phase 3: Find Content Page

- [x] Create `libs/admin-pages/src/pages/remove-list-find/index.ts` with GET and POST handlers
- [x] Implement validation for location search (minimum 3 characters)
- [x] Handle POST to save location to session and redirect to select page
- [x] Create `libs/admin-pages/src/pages/remove-list-find/en.ts` with English content
- [x] Create `libs/admin-pages/src/pages/remove-list-find/cy.ts` with Welsh content
- [x] Create `libs/admin-pages/src/pages/remove-list-find/index.njk` with autocomplete input
- [ ] Write unit tests for find page controller

### Phase 4: Select Content Page

- [x] Create `libs/admin-pages/src/pages/remove-list-select/index.ts` with GET and POST handlers
- [x] Implement GET to fetch artefacts by location from session
- [x] Handle "no results found" case
- [x] Implement POST to validate checkbox selection and save to session
- [x] Create `libs/admin-pages/src/pages/remove-list-select/en.ts` with English content
- [x] Create `libs/admin-pages/src/pages/remove-list-select/cy.ts` with Welsh content
- [x] Create `libs/admin-pages/src/pages/remove-list-select/index.njk` with table and checkboxes
- [ ] Write unit tests for select page controller

### Phase 5: Confirmation Page

- [x] Create `libs/admin-pages/src/pages/remove-list-confirm/index.ts` with GET and POST handlers
- [x] Implement GET to display selected artefacts from session
- [x] Implement POST to handle Yes/No radio buttons
- [x] Handle "No" selection (redirect back to select)
- [x] Handle "Yes" selection (delete artefacts and redirect to success)
- [x] Create `libs/admin-pages/src/pages/remove-list-confirm/en.ts` with English content
- [x] Create `libs/admin-pages/src/pages/remove-list-confirm/cy.ts` with Welsh content
- [x] Create `libs/admin-pages/src/pages/remove-list-confirm/index.njk` with radio buttons
- [ ] Write unit tests for confirm page controller

### Phase 6: Success Page

- [x] Create `libs/admin-pages/src/pages/remove-list-success/index.ts` with GET handler
- [x] Implement session validation (ensure removal was completed)
- [x] Create `libs/admin-pages/src/pages/remove-list-success/en.ts` with English content
- [x] Create `libs/admin-pages/src/pages/remove-list-success/cy.ts` with Welsh content
- [x] Create `libs/admin-pages/src/pages/remove-list-success/index.njk` with success banner and links
- [ ] Write unit tests for success page controller

### Phase 7: Integration

- [ ] Ensure all pages are properly exported and discoverable by the simple-router
- [ ] Test the complete flow manually with `yarn dev`
- [ ] Verify language toggle works on all pages
- [ ] Verify back button navigation works correctly
- [ ] Clear session data after successful removal

## Testing Tasks

### Unit Tests

- [x] Verify all repository functions have >80% test coverage
- [ ] Verify all page controllers have unit tests
- [ ] Test validation logic for all forms
- [ ] Test session data management
- [ ] Test error handling scenarios

### E2E Tests

- [ ] Create `e2e-tests/tests/remove-publication.spec.ts`
- [ ] Test complete removal flow (happy path) - search, select, confirm, success
- [ ] Test validation error on find page (empty input)
- [ ] Test "no results found" scenario
- [ ] Test validation error on select page (no checkboxes selected)
- [ ] Test cancel on confirmation page (returns to select)
- [ ] Test multiple artefacts removal
- [ ] Test language toggle (English/Welsh) on all pages
- [ ] Test accessibility with axe-core on all pages
- [ ] Test role-based access control (only admins can access)

### Manual Testing Checklist

- [ ] Test with SYSTEM_ADMIN role
- [ ] Test with INTERNAL_ADMIN_CTSC role
- [ ] Test with INTERNAL_ADMIN_LOCAL role
- [ ] Test unauthorized access (non-admin user)
- [ ] Test session timeout handling
- [ ] Verify artefacts are actually deleted from database
- [ ] Verify success banner displays correctly
- [ ] Verify all links work on success page
