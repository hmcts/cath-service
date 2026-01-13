# VIBE-300: Implementation Tasks

## Phase 1: Database Schema ⚠️ CRITICAL - DO FIRST

- [ ] Verify VIBE-316 is complete and `artefact_search` table exists
- [ ] Update `libs/postgres/prisma/schema.prisma` to add `case_name` column to Subscription model
- [ ] Generate Prisma migration: `yarn db:migrate:dev`
- [ ] Verify migration applied successfully

## Phase 2: Case Search Service

### Repository Layer (if not exists from VIBE-316)
- [ ] Create `libs/publication/src/artefact-search-repository.ts`
- [ ] Implement `findByCaseName(caseName: string)`
- [ ] Implement `findByCaseNumber(caseNumber: string)`
- [ ] Add unit tests for repository

### Search Service
- [ ] Create directory structure: `libs/subscription-management/src/{pages,locales,assets/css}`
- [ ] Create `libs/subscription-management/package.json`
- [ ] Create `libs/subscription-management/tsconfig.json`
- [ ] Create `libs/subscription-management/src/config.ts`
- [ ] Create `libs/subscription-management/src/index.ts`
- [ ] Create `libs/subscription-management/src/case-search-service.ts`
- [ ] Implement `searchByCaseName(caseName: string)`
- [ ] Implement `searchByCaseReference(reference: string)`
- [ ] Add unit tests for search service

## Phase 3: Subscription Management Service

### Repository
- [ ] Create `libs/subscription/src/case-subscription-repository.ts`
- [ ] Implement `findByUserId(userId: string)`
- [ ] Implement `findByUserIdAndType(userId: string, searchType: string)`
- [ ] Implement `create(userId, searchType, searchValue, caseName)`
- [ ] Implement `delete(id: string)`
- [ ] Add unit tests for repository

### Service Layer
- [ ] Create `libs/subscription-management/src/subscription-management-service.ts`
- [ ] Implement `getUserSubscriptions(userId: string)`
- [ ] Implement `getSubscriptionsByCase(userId: string)`
- [ ] Implement `getSubscriptionsByLocation(userId: string)`
- [ ] Implement `createCaseSubscription(userId, caseNumber, caseName)`
- [ ] Add unit tests for service

## Phase 4: Subscription Management Pages

### Page 1: Email Subscriptions List
- [ ] Create `libs/subscription-management/src/pages/email-subscriptions.ts` controller
- [ ] Implement GET handler to load user subscriptions grouped by type
- [ ] Handle query param: `view` (all, case, location)
- [ ] Add content objects (en and cy)
- [ ] Create `libs/subscription-management/src/pages/email-subscriptions.njk` template
- [ ] Add tabs with counts (All, By case, By court/tribunal)
- [ ] Add tables for case and location subscriptions
- [ ] Add empty state message
- [ ] Add "Add email subscription" button

### Page 2: Add Subscription Method
- [ ] Create `libs/subscription-management/src/pages/add-subscription-method.ts` controller
- [ ] Implement GET handler to render form
- [ ] Implement POST handler to validate selection and redirect
- [ ] Add content objects (en and cy)
- [ ] Create `libs/subscription-management/src/pages/add-subscription-method.njk` template
- [ ] Add radio buttons for three methods
- [ ] Add body text about published information
- [ ] Add error summary component

### Page 3: Subscribe by Case Name
- [ ] Create `libs/subscription-management/src/pages/subscribe-by-case-name.ts` controller
- [ ] Implement GET handler to render form
- [ ] Implement POST handler to search and handle results
- [ ] Handle no results, single result, multiple results scenarios
- [ ] Add content objects (en and cy)
- [ ] Create `libs/subscription-management/src/pages/subscribe-by-case-name.njk` template
- [ ] Add input field for case name
- [ ] Add validation and error messages
- [ ] Add error summary component

### Page 4: Subscribe by Reference
- [ ] Create `libs/subscription-management/src/pages/subscribe-by-reference.ts` controller
- [ ] Implement GET handler to render form
- [ ] Implement POST handler to search and handle results
- [ ] Handle no results, single result, multiple results scenarios
- [ ] Add content objects (en and cy)
- [ ] Create `libs/subscription-management/src/pages/subscribe-by-reference.njk` template
- [ ] Add input field for reference number
- [ ] Add validation and error messages
- [ ] Add error summary component

### Page 5: Case Search Results
- [ ] Create `libs/subscription-management/src/pages/case-search-results.ts` controller
- [ ] Implement GET handler to load search results from session
- [ ] Implement POST handler to validate selection and redirect
- [ ] Add content objects (en and cy)
- [ ] Create `libs/subscription-management/src/pages/case-search-results.njk` template
- [ ] Add table with radio buttons
- [ ] Add columns: Case name, Party name, Reference number
- [ ] Add validation and error messages

### Page 6: Confirm Subscription
- [ ] Create `libs/subscription-management/src/pages/confirm-subscription.ts` controller
- [ ] Implement GET handler to load selected case from session
- [ ] Implement POST handler to create subscription
- [ ] Add content objects (en and cy)
- [ ] Create `libs/subscription-management/src/pages/confirm-subscription.njk` template
- [ ] Display selected case details
- [ ] Add confirm button

### Page 7: Subscription Added
- [ ] Create `libs/subscription-management/src/pages/subscription-added.ts` controller
- [ ] Implement GET handler to display success message
- [ ] Add content objects (en and cy)
- [ ] Create `libs/subscription-management/src/pages/subscription-added.njk` template
- [ ] Add success message
- [ ] Add link back to email subscriptions

### Styles
- [ ] Create `libs/subscription-management/src/assets/css/subscription-management.scss`
- [ ] Style subscription tables
- [ ] Style tabs

## Phase 5: Translations

### English Translations
- [ ] Create `libs/subscription-management/src/locales/en.ts`
- [ ] Add all page titles and headings
- [ ] Add form labels and button text
- [ ] Add error messages
- [ ] Add table headers
- [ ] Add navigation and link text

### Welsh Translations
- [ ] Create `libs/subscription-management/src/locales/cy.ts`
- [ ] Translate all content from English file using ticket descriptions
- [ ] Review Welsh translations for accuracy

## Phase 6: Dashboard Integration

- [ ] Update `libs/dashboard/src/pages/dashboard.ts` to add "Email subscriptions" link
- [ ] Update `libs/dashboard/src/pages/dashboard.njk` template
- [ ] Add navigation link to `/email-subscriptions`
- [ ] Test navigation from dashboard

## Phase 7: Subscription Fulfilment

- [ ] Update `libs/subscription/src/subscription-fulfilment-service.ts`
- [ ] Add logic to query case subscriptions when artefact published
- [ ] Match artefact case numbers against CASE_NUMBER subscriptions
- [ ] Send notification emails to matched subscriptions
- [ ] Add unit tests for fulfilment logic
- [ ] Add integration tests for fulfilment flow

## Phase 8: Access Control

- [ ] Create or update verified user middleware
- [ ] Verify user has VERIFIED_USER role
- [ ] Redirect to login if not authenticated
- [ ] Display error if not verified
- [ ] Apply middleware to all subscription management routes
- [ ] Add unit tests for access control

## Phase 9: Module Registration

- [ ] Register module in `apps/web/src/app.ts`
- [ ] Register assets in `apps/web/vite.config.ts`
- [ ] Register Prisma schema in `apps/postgres/src/schema-discovery.ts`
- [ ] Update root `tsconfig.json` with module path

## Phase 10: Testing

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
- [ ] Test complete subscription by case name journey
- [ ] Test complete subscription by reference journey
- [ ] Test multiple search results selection journey
- [ ] Test no results found error journey
- [ ] Test view subscriptions by case journey
- [ ] Test Welsh translation works across all pages
- [ ] Test accessibility with Axe (inline with journeys)
- [ ] Test keyboard navigation

## Phase 11: Documentation & Cleanup

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
