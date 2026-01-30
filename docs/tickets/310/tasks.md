# Implementation Tasks: User Management Feature

## Setup and Configuration
- [ ] Create `libs/user-management` directory structure
- [ ] Create `package.json` with module metadata and scripts
- [ ] Create `tsconfig.json` with proper configuration
- [ ] Add `@hmcts/user-management` to root `tsconfig.json` paths
- [ ] Create `src/config.ts` with pageRoutes export
- [ ] Create `src/index.ts` for business logic exports
- [ ] Register module in `apps/web/src/app.ts`

## Database and Models
- [ ] Check Prisma User-Subscription relation for cascade delete behavior
- [ ] Update relation with `onDelete: Cascade` if not present
- [ ] Run migration if schema changed
- [ ] Create `src/user-management/model.ts` with TypeScript interfaces

## Query Layer
- [ ] Create `src/user-management/queries.ts`
- [ ] Implement `findUsers` with Prisma where clause and pagination
- [ ] Implement `countUsers` for pagination totals
- [ ] Implement `findUserById`
- [ ] Implement `deleteUserById`
- [ ] Create `src/user-management/queries.test.ts` with unit tests

## Service Layer
- [ ] Create `src/user-management/service.ts`
- [ ] Implement `searchUsers` with filter logic and pagination
- [ ] Implement `getUserById`
- [ ] Implement `deleteUser` with existence check
- [ ] Create `src/user-management/service.test.ts` with unit tests

## Page 1: User Management List
- [ ] Create `src/pages/user-management/` directory
- [ ] Create `en.ts` with English content (filter labels, table headers, errors)
- [ ] Create `cy.ts` with Welsh translations
- [ ] Create `index.ts` controller with GET and POST handlers
- [ ] Implement GET: read session filters, call searchUsers, build pagination data
- [ ] Implement POST: validate filters, save to session, redirect to page 1
- [ ] Create `index.njk` template with two-column layout
- [ ] Add filter panel with Selected Filters section
- [ ] Add three text input fields (Email, User ID, User Provenance ID)
- [ ] Add Role checkboxes section
- [ ] Add Provenance checkboxes section
- [ ] Add results table with Email, Role, Provenance, Manage columns
- [ ] Add pagination component
- [ ] Add error summary for no results case
- [ ] Create `index.test.ts` with unit tests for controller

## Page 2: Manage User
- [ ] Create `src/pages/manage-user/` directory
- [ ] Create `en.ts` with English content (warning, labels)
- [ ] Create `cy.ts` with Welsh translations
- [ ] Create `index.ts` controller with GET handler
- [ ] Implement GET: fetch user by userId query param, render details
- [ ] Handle user not found edge case
- [ ] Create `index.njk` template
- [ ] Add warning text component
- [ ] Add summary list with 7 rows (User ID, Email, Role, Provenance, Provenance ID, Creation Date, Last sign in)
- [ ] Add red "Delete user" button
- [ ] Add back link to user-management
- [ ] Create `index.test.ts` with unit tests

## Page 3: Delete User Confirmation
- [ ] Create `src/pages/delete-user-confirm/` directory
- [ ] Create `en.ts` with English content (title, radio labels, errors)
- [ ] Create `cy.ts` with Welsh translations
- [ ] Create `index.ts` controller with GET and POST handlers
- [ ] Implement GET: fetch user email, store userId in session
- [ ] Implement POST: validate selection, branch on Yes/No
- [ ] Handle "No" selection: redirect to manage-user
- [ ] Handle "Yes" selection: call deleteUser, redirect to success
- [ ] Handle no selection: re-render with error
- [ ] Create `index.njk` template
- [ ] Add H1 with user email
- [ ] Add Yes/No radio buttons
- [ ] Add green "Continue" button
- [ ] Add error summary for no selection
- [ ] Create `index.test.ts` with unit tests

## Page 4: User Deleted Success
- [ ] Create `src/pages/user-deleted/` directory
- [ ] Create `en.ts` with English content (success message)
- [ ] Create `cy.ts` with Welsh translations
- [ ] Create `index.ts` controller with GET handler
- [ ] Implement GET: clear session data, render success
- [ ] Create `index.njk` template
- [ ] Add notification banner (success, green)
- [ ] Add link back to user-management
- [ ] Create `index.test.ts` with unit tests

## E2E Testing
- [ ] Create `e2e-tests/tests/user-management.spec.ts`
- [ ] Write test for complete user management journey (search, view, delete)
- [ ] Include filter testing (email, userId, role, provenance)
- [ ] Include pagination testing
- [ ] Include Welsh translation checks
- [ ] Include accessibility checks inline
- [ ] Test "No" confirmation path
- [ ] Test validation errors

## Documentation and Cleanup
- [ ] Run `yarn lint:fix` on all new files
- [ ] Run `yarn format` on all new files
- [ ] Verify all tests pass with `yarn test`
- [ ] Verify E2E tests pass with `yarn test:e2e`
- [ ] Update any relevant documentation if needed
