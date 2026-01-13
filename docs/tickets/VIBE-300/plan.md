# VIBE-300: Implementation Plan

## Overview

This ticket implements case-based subscription functionality for verified media users. Users can subscribe to hearing lists by case name, case reference number, case ID, or URN. The implementation builds on VIBE-316's artefact_search infrastructure.

## Critical Files

### New Files to Create

1. **Subscription Management Module**
   - `libs/subscription-management/package.json` - Module configuration
   - `libs/subscription-management/tsconfig.json` - TypeScript config
   - `libs/subscription-management/src/config.ts` - Module exports
   - `libs/subscription-management/src/index.ts` - Business logic exports
   - `libs/subscription-management/src/pages/email-subscriptions.ts` - Main subscriptions page
   - `libs/subscription-management/src/pages/email-subscriptions.njk` - Template
   - `libs/subscription-management/src/pages/add-subscription-method.ts` - Method selection page
   - `libs/subscription-management/src/pages/add-subscription-method.njk` - Template
   - `libs/subscription-management/src/pages/subscribe-by-case-name.ts` - Case name search
   - `libs/subscription-management/src/pages/subscribe-by-case-name.njk` - Template
   - `libs/subscription-management/src/pages/subscribe-by-reference.ts` - Reference search
   - `libs/subscription-management/src/pages/subscribe-by-reference.njk` - Template
   - `libs/subscription-management/src/pages/case-search-results.ts` - Search results
   - `libs/subscription-management/src/pages/case-search-results.njk` - Template
   - `libs/subscription-management/src/pages/confirm-subscription.ts` - Confirmation
   - `libs/subscription-management/src/pages/confirm-subscription.njk` - Template
   - `libs/subscription-management/src/pages/subscription-added.ts` - Success page
   - `libs/subscription-management/src/pages/subscription-added.njk` - Template
   - `libs/subscription-management/src/locales/en.ts` - English translations
   - `libs/subscription-management/src/locales/cy.ts` - Welsh translations
   - `libs/subscription-management/src/subscription-management-service.ts` - Service layer
   - `libs/subscription-management/src/case-search-service.ts` - Case search logic
   - `libs/subscription-management/src/assets/css/subscription-management.scss` - Styles

2. **Repository Updates**
   - `libs/subscription/src/case-subscription-repository.ts` - Case subscription data access
   - `libs/publication/src/artefact-search-repository.ts` - Case search queries (if not exists from VIBE-316)

### Files to Modify

1. **Database Schema**
   - `libs/postgres/prisma/schema.prisma` - Add `case_name` column to Subscription model

2. **Dashboard Navigation**
   - `libs/dashboard/src/pages/dashboard.ts` - Add "Email subscriptions" navigation
   - `libs/dashboard/src/pages/dashboard.njk` - Update navigation links

3. **Subscription Service**
   - `libs/subscription/src/subscription-service.ts` - Add case subscription methods
   - `libs/subscription/src/subscription-fulfilment-service.ts` - Update fulfilment logic for case subscriptions

4. **App Registration**
   - `apps/web/src/app.ts` - Register subscription-management module
   - `apps/web/vite.config.ts` - Register module assets
   - `apps/postgres/src/schema-discovery.ts` - Register prisma schema

5. **Root Configuration**
   - `tsconfig.json` - Add @hmcts/subscription-management path

## Implementation Steps

### Phase 1: Database Schema (Priority: Critical)

1. **Update Prisma model** in `libs/postgres/prisma/schema.prisma`
   ```prisma
   model Subscription {
     id          String   @id @default(cuid())
     userId      String   @map("user_id")
     searchType  String   @map("search_type") @db.VarChar(50)
     searchValue String   @map("search_value")
     caseName    String?  @map("case_name")  // NEW COLUMN
     createdAt   DateTime @default(now()) @map("created_at")
     updatedAt   DateTime @updatedAt @map("updated_at")

     @@map("subscription")
     @@index([userId])
     @@index([searchType, searchValue])
   }
   ```

2. **Generate migration**
   ```bash
   yarn db:migrate:dev
   ```

### Phase 2: Case Search Service (Priority: High)

1. **Create case search service** `libs/subscription-management/src/case-search-service.ts`
   - `searchByCaseName(caseName: string)` - Search artefact_search table
   - `searchByCaseReference(reference: string)` - Exact match search
   - Return array of matching cases with: case_number, case_name, party_name (if available)

2. **Create artefact search repository** (if not exists from VIBE-316)
   - `libs/publication/src/artefact-search-repository.ts`
   - `findByCaseName(caseName: string)`
   - `findByCaseNumber(caseNumber: string)`

3. **Add unit tests** for search service

### Phase 3: Subscription Management Service (Priority: High)

1. **Create service** `libs/subscription-management/src/subscription-management-service.ts`
   - `getUserSubscriptions(userId: string)` - Get all subscriptions
   - `getSubscriptionsByCase(userId: string)` - Filter case subscriptions
   - `getSubscriptionsByLocation(userId: string)` - Filter location subscriptions
   - `createCaseSubscription(userId, caseNumber, caseName)` - Create new subscription

2. **Create repository** `libs/subscription/src/case-subscription-repository.ts`
   - `findByUserId(userId: string)`
   - `findByUserIdAndType(userId: string, searchType: string)`
   - `create(userId, searchType, searchValue, caseName)`
   - `delete(id: string)`

3. **Add unit tests** for service and repository

### Phase 4: Subscription Management Pages (Priority: High)

#### Page 1: Email Subscriptions List
1. **Create controller** `libs/subscription-management/src/pages/email-subscriptions.ts`
   - GET handler: Load user subscriptions, group by type
   - Query param: `view` (all, case, location)
   - Content objects (en/cy)

2. **Create template** `libs/subscription-management/src/pages/email-subscriptions.njk`
   - Display tabs with counts
   - Tables for case and location subscriptions
   - Empty state message
   - "Add email subscription" button

#### Page 2: Add Subscription Method
1. **Create controller** `libs/subscription-management/src/pages/add-subscription-method.ts`
   - GET handler: Render form
   - POST handler: Validate selection, redirect based on method
   - Content objects (en/cy)

2. **Create template** `libs/subscription-management/src/pages/add-subscription-method.njk`
   - Radio buttons for three methods
   - Body text about published information only
   - Error summary

#### Page 3: Subscribe by Case Name
1. **Create controller** `libs/subscription-management/src/pages/subscribe-by-case-name.ts`
   - GET handler: Render form
   - POST handler: Search by case name, handle results
   - If no results: Show error
   - If single result: Store in session, redirect to confirmation
   - If multiple results: Store in session, redirect to search results
   - Content objects (en/cy)

2. **Create template** `libs/subscription-management/src/pages/subscribe-by-case-name.njk`
   - Input field for case name
   - Validation errors
   - Error summary

#### Page 4: Subscribe by Reference
1. **Create controller** `libs/subscription-management/src/pages/subscribe-by-reference.ts`
   - GET handler: Render form
   - POST handler: Search by reference, handle results
   - Similar logic to case name search
   - Content objects (en/cy)

2. **Create template** `libs/subscription-management/src/pages/subscribe-by-reference.njk`
   - Input field for reference number
   - Validation errors
   - Error summary

#### Page 5: Case Search Results
1. **Create controller** `libs/subscription-management/src/pages/case-search-results.ts`
   - GET handler: Load search results from session
   - POST handler: Validate selection, store in session, redirect to confirmation
   - Content objects (en/cy)

2. **Create template** `libs/subscription-management/src/pages/case-search-results.njk`
   - Table with radio buttons
   - Columns: Case name, Party name, Reference number
   - Validation errors

#### Page 6: Confirm Subscription
1. **Create controller** `libs/subscription-management/src/pages/confirm-subscription.ts`
   - GET handler: Load selected case from session
   - POST handler: Create subscription, redirect to success
   - Content objects (en/cy)

2. **Create template** `libs/subscription-management/src/pages/confirm-subscription.njk`
   - Display selected case details
   - Confirm button

#### Page 7: Subscription Added
1. **Create controller** `libs/subscription-management/src/pages/subscription-added.ts`
   - GET handler: Display success message
   - Content objects (en/cy)

2. **Create template** `libs/subscription-management/src/pages/subscription-added.njk`
   - Success message
   - Link back to email subscriptions

### Phase 5: Translations (Priority: High)

1. **Create English translations** `libs/subscription-management/src/locales/en.ts`
   - All page titles
   - Form labels
   - Button text
   - Error messages
   - Table headers

2. **Create Welsh translations** `libs/subscription-management/src/locales/cy.ts`
   - All content from English file
   - Use translations from ticket description

### Phase 6: Dashboard Integration (Priority: Medium)

1. **Update dashboard** `libs/dashboard/src/pages/dashboard.ts`
   - Add "Email subscriptions" link to navigation

2. **Update dashboard template** `libs/dashboard/src/pages/dashboard.njk`
   - Add navigation link to `/email-subscriptions`

### Phase 7: Subscription Fulfilment (Priority: High)

1. **Update fulfilment service** `libs/subscription/src/subscription-fulfilment-service.ts`
   - When artefact published, query:
     ```typescript
     // Find case subscriptions matching this artefact
     const caseNumbers = await artefactSearchRepo.findByArtefactId(artefactId);
     const subscriptions = await subscriptionRepo.findBySearchTypeAndValues(
       'CASE_NUMBER',
       caseNumbers.map(c => c.caseNumber)
     );
     // Send notifications
     ```

2. **Add unit tests** for fulfilment logic

### Phase 8: Access Control (Priority: High)

1. **Add middleware** for verified user check
   - Verify user has VERIFIED_USER role
   - Redirect to login if not authenticated
   - Display error if not verified

2. **Apply middleware** to all subscription management routes

### Phase 9: Integration & Registration (Priority: Medium)

1. **Register module** in `apps/web/src/app.ts`
2. **Register assets** in `apps/web/vite.config.ts`
3. **Register schema** in `apps/postgres/src/schema-discovery.ts`
4. **Update root tsconfig.json** with module path

### Phase 10: Testing (Priority: High)

1. **Unit tests**
   - Case search service
   - Subscription management service
   - Repository methods
   - Form validation logic

2. **Integration tests**
   - Case search by name
   - Case search by reference
   - Subscription creation
   - Subscription fulfilment
   - Permission checks

3. **E2E tests**
   - Complete subscription by case name journey
   - Complete subscription by reference journey
   - Multiple search results journey
   - No results found journey
   - View subscriptions journey
   - Welsh translation journey
   - Accessibility checks with Axe

## Technical Considerations

### Session Management

- Store search results in session between pages
- Store selected case in session for confirmation
- Clear session data after subscription created

### Search Logic

**Case Name Search:**
- Use case-insensitive ILIKE search
- Pattern: `%{search_term}%`
- Return all matches

**Reference Search:**
- Exact match only
- Case-sensitive or case-insensitive depending on data format

### Performance

- Index `artefact_search(case_number)` for reference lookups
- Index `artefact_search(case_name)` for name searches (consider GIN for text search)
- Limit search results (e.g., max 50 results)

### User Experience

- If single search result, skip results page and go directly to confirmation
- Display party name in results if available
- Clear error messages for no results
- Preserve search term on validation error

### Data Consistency

- Validate case still exists before creating subscription
- Handle race conditions (case deleted between search and confirmation)

## Testing Strategy

### Unit Tests
- Search service logic
- Validation rules
- Repository queries
- Subscription creation

### Integration Tests
- Database operations
- Search queries
- Fulfilment matching
- Session handling

### E2E Tests
- Full subscription journeys (by name, by reference)
- Edge cases (no results, multiple results)
- Permission checks
- Welsh language support
- Accessibility with Axe

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|-----------|
| VIBE-316 not completed | High | Verify artefact_search table exists before starting |
| Large search results slow page | Medium | Limit results, add pagination if needed |
| Case data changes after search | Low | Validate case exists before creating subscription |
| Session data loss | Medium | Store minimal data in session, re-query if needed |

## Success Criteria

1. ✅ Database schema updated with case_name column
2. ✅ Users can search by case name and reference number
3. ✅ Search results display correctly
4. ✅ Subscriptions created with search_type = CASE_NUMBER
5. ✅ Case name stored in subscription record
6. ✅ Subscriptions appear in "Subscriptions by case" table
7. ✅ Notifications sent when matching artefact published
8. ✅ All pages support Welsh language
9. ✅ Accessibility standards met (WCAG 2.2 AA)
10. ✅ All tests passing

## Estimated Complexity: High

This ticket involves creating a new multi-page user journey, case search functionality, subscription management UI, and integration with existing fulfilment logic. The complexity is high due to the number of pages, search logic, and dependency on VIBE-316.
