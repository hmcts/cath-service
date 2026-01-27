# VIBE-300: Implementation Tasks

## Phase 0: Module Refactoring ⚠️ DO FIRST

- [x] Rename `libs/subscriptions` to `libs/subscription` (singular)
- [x] Update all imports from `@hmcts/subscriptions` to `@hmcts/subscription`
- [x] Update package name in `libs/subscription/package.json`
- [x] Update root `tsconfig.json` path mapping
- [x] Run `yarn install` to update workspace dependencies
- [x] Verify all tests pass after rename

## Phase 1: Database Schema ⚠️ CRITICAL

- [x] Verify VIBE-316 is complete and `artefact_search` table exists
- [x] Update `libs/subscription/prisma/schema.prisma` to add `case_name` and `case_number` columns to Subscription model
- [x] Generate Prisma migration: `yarn db:migrate:dev`
- [x] Verify migration applied successfully

## Phase 2: Case Search Service

### Repository Layer (if not exists from VIBE-316)
- [x] Create `libs/publication/src/repository/artefact-search-queries.ts`
- [x] Move any artefact search code from `libs/publication/src/repository/queries.ts` to new file
- [x] Implement `findByCaseName(caseName: string)`
- [x] Implement `findByCaseNumber(caseNumber: string)`
- [x] Add unit tests for repository

### Search Service
- [x] Create `libs/subscription/src/case-search-service.ts`
- [x] Implement `searchByCaseName(caseName: string)`
- [x] Implement `searchByCaseReference(reference: string)`
- [x] Add unit tests for search service

## Phase 3: Subscription Management Service

### Repository Layer
- [x] Create or update `libs/subscription/src/repository/queries.ts`
- [x] Implement `findByUserId(userId: string)`
- [x] Implement `findByUserIdAndType(userId: string, searchType: string)`
- [x] Implement `createSubscription(userId, searchType, searchValue, caseName, caseNumber)`
- [x] Implement `deleteSubscription(id: string)`
- [x] Add unit tests for repository queries

### Service Layer
- [x] Create or update `libs/subscription/src/repository/service.ts`
- [x] Implement `getUserSubscriptions(userId: string)`
- [x] Implement `getSubscriptionsByCase(userId: string)`
- [x] Implement `getSubscriptionsByLocation(userId: string)`
- [x] Implement `createCaseSubscription(userId, caseNumber, caseName)`
- [x] Add unit tests for service

## Phase 4: Subscription Management Pages

**Note:** Each page follows the folder structure pattern: `folder/index.ts`, `folder/index.njk`, `folder/en.ts`, `folder/cy.ts`, `folder/index.test.ts`

### Page 1: Subscription Management (EXISTING - Update)
**Path:** `/subscription-management` (already exists at `libs/verified-pages/src/pages/subscription-management/`)

- [x] Update `index.ts` - Enhance GET handler to support case subscriptions
- [x] Implement query param handling: `view` (all, case, location)
- [x] Update `en.ts` - Add case-related content
- [x] Update `cy.ts` - Add Welsh translations for case content
- [x] Update `index.njk` - Add tabs with counts (All, By case, By court/tribunal)
- [x] Add table for case subscriptions (Case name, Reference number, Date added, Checkbox)
- [x] Keep existing location subscriptions table
- [x] Update empty state message
- [ ] Update `index.test.ts` - Add tests for new functionality

### Page 2: Add Subscription Method
- [x] Create folder `libs/verified-pages/src/pages/subscription-add/`
- [x] Create `index.ts` - Controller with GET/POST handlers
- [x] Implement GET handler to render form
- [x] Implement POST handler to validate selection and redirect
- [x] Create `en.ts` - English content object
- [x] Create `cy.ts` - Welsh content object
- [x] Create `index.njk` - Template with radio buttons
- [x] Add body text about published information
- [x] Add error summary component
- [x] Create `index.test.ts` - Unit tests

### Page 3: Subscribe by Case Name
- [x] Create folder `libs/verified-pages/src/pages/case-name-search/`
- [x] Create `index.ts` - Controller with GET/POST handlers
- [x] Implement GET handler to render form
- [x] Implement POST handler to search and redirect to results
- [x] Handle no results scenario with error message
- [x] Store search results in session
- [x] Redirect to `/case-name-search-results` on success
- [x] Create `en.ts` - English content object
- [x] Create `cy.ts` - Welsh content object
- [x] Create `index.njk` - Template with input field
- [x] Add validation and error messages
- [x] Add error summary component
- [x] Create `index.test.ts` - Unit tests

### Page 4: Subscribe by Reference
- [x] Create folder `libs/verified-pages/src/pages/case-number-search/`
- [x] Create `index.ts` - Controller with GET/POST handlers
- [x] Implement GET handler to render form
- [x] Implement POST handler to search and redirect to results
- [x] Handle no results scenario with error message
- [x] Store search results in session
- [x] Redirect to `/case-number-search-results` on success
- [x] Create `en.ts` - English content object
- [x] Create `cy.ts` - Welsh content object
- [x] Create `index.njk` - Template with input field
- [x] Add validation and error messages
- [x] Add error summary component
- [x] Create `index.test.ts` - Unit tests

### Page 5: Case Name Search Results
- [x] Create folder `libs/verified-pages/src/pages/case-name-search-results/`
- [x] Create `index.ts` - Controller with GET/POST handlers
- [x] Implement GET handler to load search results from session
- [x] Implement POST handler to validate selections and redirect to pending-subscriptions
- [x] Store selected cases in session for pending-subscriptions page
- [x] Create `en.ts` - English content object with title "Subscription case search results"
- [x] Create `cy.ts` - Welsh content object
- [x] Create `index.njk` - Template with table and checkboxes
- [x] Add 3 columns: "Select a result" (checkbox), "Case name", "Reference number"
- [x] Add "Continue" button at bottom
- [x] Add validation - at least one case must be selected
- [x] Create `index.test.ts` - Unit tests

### Page 6: Case Number Search Results
- [x] Create folder `libs/verified-pages/src/pages/case-number-search-results/`
- [x] Create `index.ts` - Controller with GET/POST handlers
- [x] Implement GET handler to load search results from session
- [x] Implement POST handler to validate selections and redirect to pending-subscriptions
- [x] Store selected cases in session for pending-subscriptions page
- [x] Create `en.ts` - English content object with title "Subscription case search results"
- [x] Create `cy.ts` - Welsh content object
- [x] Create `index.njk` - Template with table and checkboxes
- [x] Add 3 columns: "Select a result" (checkbox), "Case name", "Reference number"
- [x] Add "Continue" button at bottom
- [x] Add validation - at least one case must be selected
- [x] Create `index.test.ts` - Unit tests

### Page 7: Pending Subscriptions (EXISTING - Update)
**Path:** `/pending-subscriptions` (already exists at `libs/verified-pages/src/pages/pending-subscriptions/`)

- [x] Update `index.ts` - Add support for case subscriptions
- [x] Implement logic to load case subscriptions from session
- [x] Update `en.ts` - Add case subscription table content
- [x] Update `cy.ts` - Add Welsh translations for case content
- [x] Update `index.njk` - Add new table for case subscriptions
- [x] Add case subscription table with 3 columns: "Case Name", "Reference number", "Actions"
- [x] Add "Remove" link in Actions column for each case subscription
- [x] Keep existing court/tribunal subscription table
- [x] Keep existing "Confirm subscription" button
- [ ] Update `index.test.ts` - Add tests for case subscription functionality

### Page 8: Subscription Confirmed (EXISTING - Verify)
**Path:** `/subscription-confirmed` (already exists at `libs/verified-pages/src/pages/subscription-confirmed/`)

- [x] Verify existing page works for case subscriptions
- [x] Updated to handle confirmed case subscriptions from session

### Styles
- [ ] Update `libs/verified-pages/src/assets/css/verified-pages.scss` or create separate file
- [ ] Style subscription tables
- [ ] Style tabs

## Phase 5: Translations

**Note:** Translations are handled in separate `en.ts` and `cy.ts` files within each page folder (already covered in Phase 4). Each page folder structure includes these translation files.

## Phase 6: Subscription Fulfilment

### Subscription Queries
- [x] Update `libs/notifications/src/notification/subscription-queries.ts`
- [x] Add `findActiveSubscriptionsByCaseNumbers(caseNumbers: string[])`
- [x] Query subscriptions where `searchType = 'CASE_NUMBER'` and `searchValue` in caseNumbers
- [x] Return `SubscriptionWithUser[]` matching existing interface
- [x] Add unit tests for new query function

### Notification Service
- [x] Update `libs/notifications/src/notification/notification-service.ts`
- [x] Update `sendPublicationNotifications()` to handle both location and case subscriptions
- [x] Query artefact search table to get case numbers for the artefact
- [x] Query case subscriptions using `findActiveSubscriptionsByCaseNumbers()`
- [x] Combine location subscriptions and case subscriptions
- [x] Deduplicate subscriptions by userId
- [x] Process all subscriptions using existing `processUserNotification()`
- [x] Add unit tests for case subscription fulfilment logic
- [ ] Add integration tests for fulfilment flow

## Phase 7: Access Control

- [x] Verified existing auth middleware (requireAuth and blockUserAccess)
- [x] Confirmed all subscription pages use requireAuth() for authentication
- [x] Confirmed all subscription pages use blockUserAccess() to prevent SSO admin access
- [x] All new pages (subscription-add, case-name-search, case-number-search, case-name-search-results, case-number-search-results) have proper middleware
- [x] All updated pages (subscription-management, pending-subscriptions, subscription-confirmed) retain proper middleware
- [x] Unit tests for auth middleware exist and are comprehensive (authenticate.test.ts and authorise.test.ts)

## Phase 8: Module Registration

**Note:** The `verified-pages` module is already registered. Only verify that:
- [x] Pages are auto-discovered by the existing module registration in `apps/web/src/app.ts`
- [x] Assets are already configured in `apps/web/vite.config.ts`
- [x] No additional registration needed - `@hmcts/subscription` config exports already configured in schema-discovery.ts

## Phase 9: Testing

### Unit Tests
- [ ] Test case search service logic
- [ ] Test subscription management service
- [ ] Test repository methods
- [ ] Test form validation logic
- [ ] Test access control middleware
- [ ] Ensure >80% coverage on business logic

### Integration Tests
- [ ] Test case search by name
- [ ] Test case search by reference
- [ ] Test subscription creation
- [ ] Test subscription fulfilment with case matches
- [ ] Test permission checks with different user roles
- [ ] Test session handling

### E2E Tests
- [x] Test complete subscription by case name journey
- [x] Test complete subscription by reference journey
- [x] Test multiple search results selection journey
- [x] Test no results found error journey
- [x] Test view subscriptions by case journey
- [x] Test Welsh translation works across all pages
- [x] Test accessibility with Axe (inline with journeys)
- [x] Test keyboard navigation

## Phase 10: Documentation & Cleanup

- [ ] Update README if needed
- [ ] Run `yarn lint:fix` to fix any linting issues
- [ ] Run `yarn format` to format code
- [ ] Review all changes
- [ ] Create pull request

## Notes

- **Critical**: Verify VIBE-316 is complete before starting - this ticket depends on artefact_search table
- Store minimal data in session (case selection, search results)
- Clear session data after subscription created
- If single search result, skip results page and go directly to confirmation
- Index artefact_search columns for performance (case_number, case_name)
- Limit search results to prevent performance issues (e.g., max 50)
- All pages must support Welsh language
- Use `search_type = 'CASE_NUMBER'` for all case-based subscriptions
