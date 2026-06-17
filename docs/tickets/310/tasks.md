# Implementation Tasks: User Management Feature

## Setup

- [x] Create `libs/system-admin-pages/src/user-management/` directory for user management services
- [x] Create page directories under `libs/system-admin-pages/src/pages/`:
  - [x] `find-users/`
  - [x] `manage-user/`
  - [x] `delete-user-confirm/`
  - [x] `delete-user-success/`

## Database Layer

- [ ] Add database indexes for user search (email, role, userProvenance)
- [x] Create `src/user-management/queries.ts` with searchUsers function
- [x] Add deleteUserById function to `src/user-management/queries.ts`
- [x] Add getUserById function to `src/user-management/queries.ts`
- [x] Add unit tests for all query functions in `src/user-management/queries.test.ts`

## Service Layer

- [x] Create `src/user-management/search-service.ts` with filter logic (implemented in queries.ts)
- [x] Implement email partial match filtering
- [x] Implement exact match for userId and userProvenanceId
- [x] Implement role multi-select filtering
- [x] Implement provenance multi-select filtering
- [x] Implement pagination calculation (25 per page)
- [x] Add unit tests for search service in `src/user-management/search-service.test.ts` (in queries.test.ts)
- [x] Create `src/user-management/delete-service.ts` with deletion logic (implemented in queries.ts)
- [x] Implement cascade deletion for user subscriptions
- [x] Add validation to prevent self-deletion (implemented in delete-user-confirm controller)
- [x] Add unit tests for delete service in `src/user-management/delete-service.test.ts` (in queries.test.ts)

## Session Management

- [x] Define UserManagementSession interface
- [x] Create session helper functions for filter storage (implemented inline in controller)
- [x] Create session helper functions for pagination storage (implemented inline in controller)
- [x] Add session clear function (not needed - session automatically cleared on logout)

## Validation

- [x] Create `src/user-management/validation.ts` file
- [x] Create validation functions for email format
- [x] Create validation for userId format (alphanumeric, max 50)
- [x] Create validation for userProvenanceId format (alphanumeric, max 50)
- [x] Create validation for role checkbox values
- [x] Create validation for provenance checkbox values
- [x] Add unit tests for all validation functions in `src/user-management/validation.test.ts`

## Page 1: Find Users

- [x] Create `src/pages/find-users/index.ts` controller
- [x] Implement GET handler with session retrieval
- [x] Implement POST handler with filter processing
- [x] Add requireRole([SYSTEM_ADMIN]) middleware
- [x] Create `src/pages/find-users/index.njk` template
- [x] Add filter panel with email text input
- [x] Add filter panel with userId text input (with hint)
- [x] Add filter panel with userProvenanceId text input (with hint)
- [x] Add role checkboxes (VERIFIED, CTSC_ADMIN, LOCAL_ADMIN, SYSTEM_ADMIN)
- [x] Add provenance checkboxes (values TBC)
- [x] Add selected filters display section
- [x] Add user table with Email, Role, Provenance, Manage columns
- [x] Add pagination component with Next/Previous
- [x] Add error summary for no results found
- [x] Create `src/pages/find-users/en.ts` with English content
- [x] Create `src/pages/find-users/cy.ts` with Welsh content
- [x] Add unit tests for GET handler
- [x] Add unit tests for POST handler

## Page 2: Manage User

- [x] Create `src/pages/manage-user/index.ts` controller
- [x] Implement GET handler to retrieve user by ID
- [x] Add 404 handling for non-existent users
- [x] Add requireRole([SYSTEM_ADMIN]) middleware
- [x] Create `src/pages/manage-user/index.njk` template
- [x] Add dynamic page title with user email
- [x] Add warning text component with authorization message
- [x] Add summary list with User ID row
- [x] Add summary list with Email row
- [x] Add summary list with Role row
- [x] Add summary list with Provenance row
- [x] Add summary list with Provenance ID row
- [x] Add summary list with Creation Date row
- [x] Add summary list with Last sign in row
- [x] Add red "Delete user" button (govuk-button--warning)
- [x] Create `src/pages/manage-user/en.ts` with English content
- [x] Create `src/pages/manage-user/cy.ts` with Welsh content
- [x] Add unit tests for GET handler

## Page 3: Confirm Delete

- [x] Create `src/pages/delete-user-confirm/index.ts` controller
- [x] Implement GET handler to display confirmation form
- [x] Implement POST handler for radio selection
- [x] Add validation for radio selection required
- [x] Add "No" branch redirecting to manage-user
- [x] Add "Yes" branch calling delete service
- [x] Add requireRole([SYSTEM_ADMIN]) middleware
- [x] Create `src/pages/delete-user-confirm/index.njk` template
- [x] Add dynamic page title with user identifier
- [x] Add radio buttons for Yes/No
- [x] Add green "Continue" button
- [x] Add error summary for missing selection
- [x] Create `src/pages/delete-user-confirm/en.ts` with English content
- [x] Create `src/pages/delete-user-confirm/cy.ts` with Welsh content
- [x] Add unit tests for GET handler
- [x] Add unit tests for POST handler (both branches)

## Page 4: User Deleted

- [x] Create `src/pages/delete-user-success/index.ts` controller
- [x] Implement GET handler with success message
- [x] Add requireRole([SYSTEM_ADMIN]) middleware
- [x] Create `src/pages/delete-user-success/index.njk` template
- [x] Add green notification banner with "User deleted" message
- [x] Add back link to find-users page
- [x] Create `src/pages/delete-user-success/en.ts` with English content
- [x] Create `src/pages/delete-user-success/cy.ts` with Welsh content
- [x] Add unit tests for GET handler

## Styling

- [x] Create `libs/system-admin-pages/src/assets/css/user-management.scss` (not needed - using GOV.UK components)
- [x] Style filter panel layout (left sidebar)
- [x] Style selected filters section
- [x] Ensure mobile responsiveness
- [x] Test with GOV.UK Design System classes

## Admin Dashboard Integration

- [x] Update `libs/system-admin-pages/src/pages/system-admin-dashboard/` to add User Management link
- [x] Add link/tile for System Admin role only
- [x] Update English translations with link/tile content
- [x] Update Welsh translations with link/tile content
- [ ] Test link appears only for System Admin users

## Module Verification

- [x] Verify system-admin-pages module is already registered in apps/web/src/app.ts
- [x] Verify new pages are auto-discovered through existing registration
- [x] Test new pages load correctly in development
- [x] Test new pages build correctly for production

## Error Handling

- [x] Add 404 handler for invalid userId
- [x] Add error page for deletion failures
- [x] Add validation error display on all forms
- [x] Test error scenarios in all pages

## Testing

- [x] Write unit tests for all query functions
- [x] Write unit tests for all service functions
- [x] Write unit tests for all validation functions
- [x] Write unit tests for all page controllers
- [ ] Create E2E test covering full user management journey
- [ ] Test filter application and pagination
- [ ] Test deletion confirmation flow (No branch)
- [ ] Test deletion confirmation flow (Yes branch)
- [ ] Test Welsh translations across all pages
- [ ] Run accessibility checks with axe-core
- [ ] Test keyboard navigation through all pages
- [ ] Verify pagination controls are accessible
- [ ] Verify error summaries are announced

## Documentation

- [ ] Add JSDoc comments to all exported functions
- [ ] Document session data structure
- [ ] Document filter behavior
- [ ] Update README if needed

## Final Verification

- [ ] Verify all acceptance criteria are met
- [x] Run yarn lint:fix and fix all issues
- [x] Run yarn format and format all files
- [x] Run yarn test and ensure all pass
- [ ] Run yarn test:e2e and ensure all pass
- [ ] Manual test in browser (Chrome, Firefox, Safari)
- [ ] Manual test with screen reader (NVDA/JAWS)
- [ ] Manual test keyboard navigation only
- [ ] Verify Welsh translations work correctly
- [ ] Test on mobile viewport (320px width minimum)
