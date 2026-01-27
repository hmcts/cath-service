# VIBE-300: Implementation Plan

## Overview

This ticket implements case-based subscription functionality for verified media users. Users can subscribe to hearing lists by case name, case reference number, case ID, or URN. The implementation builds on VIBE-316's artefact_search infrastructure.

## Critical Files

### New Files to Create

1. **Verified Pages Module** (existing - `libs/verified-pages/`)

   **Note:** Each page follows folder structure: `folder/index.ts`, `folder/index.njk`, `folder/en.ts`, `folder/cy.ts`, `folder/index.test.ts`

   - `libs/verified-pages/src/pages/subscription-management/` - Main subscriptions page (EXISTING - update to support case subscriptions)
   - `libs/verified-pages/src/pages/subscription-add/` - Method selection page folder
   - `libs/verified-pages/src/pages/case-name-search/` - Case name search folder
   - `libs/verified-pages/src/pages/case-number-search/` - Reference number search folder
   - `libs/verified-pages/src/pages/case-name-search-results/` - Case name search results folder
   - `libs/verified-pages/src/pages/case-number-search-results/` - Case number search results folder
   - `libs/verified-pages/src/pages/pending-subscriptions/` - Pending subscriptions page (EXISTING - update to support case subscriptions)
   - `libs/verified-pages/src/pages/subscription-confirmed/` - Confirmation success page (EXISTING - verify)
   - `libs/verified-pages/src/assets/css/` - Styles (update existing or add new)

2. **Subscription Module** (existing - `libs/subscription/`)
   - `libs/subscription/src/repository/queries.ts` - Subscription repository queries (case subscription data access)
   - `libs/subscription/src/repository/service.ts` - Subscription service layer (subscription management)
   - `libs/subscription/src/case-search-service.ts` - Case search logic

3. **Publication Module** (existing - `libs/publication/`)
   - `libs/publication/src/repository/artefact-search-queries.ts` - Case search queries (if not exists from VIBE-316)
   - Move artefact search code from `libs/publication/src/repository/queries.ts` to new file

### Files to Modify

1. **Database Schema**
   - `libs/postgres/prisma/schema.prisma` - Add `case_name` and `case_number` columns to Subscription model

2. **Subscription Module**
   - `libs/subscription/src/repository/queries.ts` - Add case subscription repository methods
   - `libs/subscription/src/repository/service.ts` - Add case subscription service methods

3. **Notifications Module**
   - `libs/notifications/src/notification/subscription-queries.ts` - Add case subscription queries for fulfilment
   - `libs/notifications/src/notification/notification-service.ts` - Update to handle case subscription fulfilment

4. **Subscription Management Page (Existing)**
   - `libs/verified-pages/src/pages/subscription-management/` - Update to support case subscriptions

**Note:** No app registration or dashboard navigation changes needed - both already exist.

## Implementation Steps

### Phase 0: Module Refactoring (Priority: Critical - Do First)

**Rename subscriptions module to singular:**
1. Rename directory: `libs/subscriptions` → `libs/subscription`
2. Update package name in `libs/subscription/package.json`: `@hmcts/subscriptions` → `@hmcts/subscription`
3. Update all imports across the codebase from `@hmcts/subscriptions` to `@hmcts/subscription` (~28 occurrences in 19 files)
   - Root `tsconfig.json`
   - `apps/postgres/src/schema-discovery.ts`
   - `libs/verified-pages/package.json` and various page controllers
   - Test files
4. Run `yarn install` to update workspace dependencies
5. Verify all tests pass: `yarn test`

**Why:** Ensures consistent singular naming convention across all modules (e.g., `@hmcts/auth`, `@hmcts/publication`, `@hmcts/subscription`).

### Phase 1: Database Schema (Priority: Critical)

1. **Update Prisma model** in `libs/postgres/prisma/schema.prisma`
   ```prisma
   model Subscription {
     id          String   @id @default(cuid())
     userId      String   @map("user_id")
     searchType  String   @map("search_type") @db.VarChar(50)
     searchValue String   @map("search_value")
     caseName    String?  @map("case_name")    // NEW COLUMN - display name
     caseNumber  String?  @map("case_number")  // NEW COLUMN - normalized number
     createdAt   DateTime @default(now()) @map("created_at")
     updatedAt   DateTime @updatedAt @map("updated_at")

     @@map("subscription")
     @@index([userId])
     @@index([searchType, searchValue])
     @@index([caseNumber])
   }
   ```

2. **Generate migration**
   ```bash
   yarn db:migrate:dev
   ```

### Phase 2: Case Search Service (Priority: High)

1. **Create case search service** `libs/subscription/src/case-search-service.ts`
   - `searchByCaseName(caseName: string)` - Search artefact_search table
   - `searchByCaseReference(reference: string)` - Exact match search
   - Return array of matching cases with: case_number, case_name, party_name (if available)

2. **Create artefact search repository** (if not exists from VIBE-316)
   - `libs/publication/src/repository/artefact-search-queries.ts`
   - Move any artefact search code from `libs/publication/src/repository/queries.ts`
   - `findByCaseName(caseName: string)`
   - `findByCaseNumber(caseNumber: string)`

3. **Add unit tests** for search service

### Phase 3: Subscription Management Service (Priority: High)

1. **Create or update repository queries** `libs/subscription/src/repository/queries.ts`
   - `findByUserId(userId: string)` - Get all subscriptions for user
   - `findByUserIdAndType(userId: string, searchType: string)` - Get subscriptions by type
   - `createSubscription(userId, searchType, searchValue, caseName, caseNumber)` - Create subscription
   - `deleteSubscription(id: string)` - Delete subscription

2. **Create or update service layer** `libs/subscription/src/repository/service.ts`
   - `getUserSubscriptions(userId: string)` - Get all subscriptions
   - `getSubscriptionsByCase(userId: string)` - Filter case subscriptions
   - `getSubscriptionsByLocation(userId: string)` - Filter location subscriptions
   - `createCaseSubscription(userId, caseNumber, caseName)` - Create new case subscription

3. **Add unit tests** for repository queries and service layer

### Phase 4: Subscription Management Pages (Priority: High)

**Note:** Each page follows folder structure: `folder/index.ts`, `folder/index.njk`, `folder/en.ts`, `folder/cy.ts`, `folder/index.test.ts`

#### Page 1: Subscription Management (EXISTING - Update)
**Path:** `/subscription-management` at `libs/verified-pages/src/pages/subscription-management/`

1. **Update controller** `index.ts`
   - Enhance GET handler to support case subscriptions
   - Add query param handling: `view` (all, case, location)
2. **Update English content** `en.ts` - Add case-related text, labels, headings
3. **Update Welsh content** `cy.ts` - Add Welsh translations for case content
4. **Update template** `index.njk`
   - Add tabs with counts (All, By case, By court/tribunal)
   - Add table for case subscriptions (Case name, Reference number, Date added, Checkbox)
   - Keep existing location subscriptions table
   - Update empty state message
5. **Update tests** `index.test.ts` - Add tests for new case subscription functionality

#### Page 2: Add Subscription Method
1. **Create folder** `libs/verified-pages/src/pages/subscription-add/`
2. **Create controller** `index.ts`
   - GET handler: Render form
   - POST handler: Validate selection, redirect based on method
3. **Create English content** `en.ts` - All page text, labels, options
4. **Create Welsh content** `cy.ts` - All page text, labels, options
5. **Create template** `index.njk`
   - Radio buttons for three methods
   - Body text about published information only
   - Error summary
6. **Create tests** `index.test.ts`

#### Page 3: Subscribe by Case Name
1. **Create folder** `libs/verified-pages/src/pages/case-name-search/`
2. **Create controller** `index.ts`
   - GET handler: Render form
   - POST handler: Search by case name
   - If no results: Show error message on same page
   - If results found: Store in session, redirect to `/case-name-search-results`
3. **Create English content** `en.ts` - All page text, labels, errors
4. **Create Welsh content** `cy.ts` - All page text, labels, errors
5. **Create template** `index.njk`
   - Input field for case name
   - Validation errors
   - Error summary
6. **Create tests** `index.test.ts`

#### Page 4: Subscribe by Reference
1. **Create folder** `libs/verified-pages/src/pages/case-number-search/`
2. **Create controller** `index.ts`
   - GET handler: Render form
   - POST handler: Search by reference number
   - If no results: Show error message on same page
   - If results found: Store in session, redirect to `/case-number-search-results`
3. **Create English content** `en.ts` - All page text, labels, errors
4. **Create Welsh content** `cy.ts` - All page text, labels, errors
5. **Create template** `index.njk`
   - Input field for reference number
   - Validation errors
   - Error summary
6. **Create tests** `index.test.ts`

#### Page 5: Case Name Search Results
1. **Create folder** `libs/verified-pages/src/pages/case-name-search-results/`
2. **Create controller** `index.ts`
   - GET handler: Load search results from session
   - POST handler: Validate selections (at least one), store in session, redirect to `/pending-subscriptions`
3. **Create English content** `en.ts` - Title: "Subscription case search results", table headers, button text
4. **Create Welsh content** `cy.ts` - All page text, table headers
5. **Create template** `index.njk`
   - Table with checkboxes (allow multiple selections)
   - 3 columns: "Select a result" (checkbox), "Case name", "Reference number"
   - "Continue" button at bottom
   - Validation error if no selection made
6. **Create tests** `index.test.ts`

#### Page 6: Case Number Search Results
1. **Create folder** `libs/verified-pages/src/pages/case-number-search-results/`
2. **Create controller** `index.ts`
   - GET handler: Load search results from session
   - POST handler: Validate selections (at least one), store in session, redirect to `/pending-subscriptions`
3. **Create English content** `en.ts` - Title: "Subscription case search results", table headers, button text
4. **Create Welsh content** `cy.ts` - All page text, table headers
5. **Create template** `index.njk`
   - Table with checkboxes (allow multiple selections)
   - 3 columns: "Select a result" (checkbox), "Case name", "Reference number"
   - "Continue" button at bottom
   - Validation error if no selection made
6. **Create tests** `index.test.ts`

#### Page 7: Pending Subscriptions (EXISTING - Update)
**Path:** `/pending-subscriptions` at `libs/verified-pages/src/pages/pending-subscriptions/`

1. **Update controller** `index.ts`
   - GET handler: Load pending subscriptions from session (both case and location)
   - POST handler: Save all pending subscriptions, redirect to `/subscription-confirmed`
   - Add remove functionality for case subscriptions
2. **Update English content** `en.ts` - Add case subscription table headers and content
3. **Update Welsh content** `cy.ts` - Add Welsh translations for case content
4. **Update template** `index.njk`
   - Add new table for case subscriptions
   - 3 columns: "Case Name", "Reference number", "Actions"
   - "Remove" link in Actions column for each row
   - Keep existing court/tribunal subscription table
   - Keep existing "Confirm subscription" button
5. **Update tests** `index.test.ts` - Add tests for case subscription functionality

#### Page 8: Subscription Confirmed (EXISTING - Verify)
**Path:** `/subscription-confirmed` at `libs/verified-pages/src/pages/subscription-confirmed/`

1. **Verify existing page** - No changes needed unless confirmation message needs updating for case subscriptions

### Phase 5: Translations (Priority: High)

**Note:** Translations are handled in separate `en.ts` and `cy.ts` files within each page folder (already covered in Phase 4).
- Each page folder contains `en.ts` (English content) and `cy.ts` (Welsh content)
- Use translations from ticket description
- All page titles, form labels, button text, error messages, and table headers included in respective files

### Phase 6: Subscription Fulfilment (Priority: High)

1. **Update subscription queries** `libs/notifications/src/notification/subscription-queries.ts`
   - Add `findActiveSubscriptionsByCaseNumbers(caseNumbers: string[])`
   - Query subscriptions where `searchType = 'CASE_NUMBER'` and `searchValue` in caseNumbers
   - Return `SubscriptionWithUser[]` matching existing interface
   - Include user email, firstName, surname
   - Add unit tests for new query function

2. **Update notification service** `libs/notifications/src/notification/notification-service.ts`
   - Update `sendPublicationNotifications()` function:
     ```typescript
     // 1. Get existing location subscriptions (already implemented)
     const locationSubscriptions = await findActiveSubscriptionsByLocation(locationId);

     // 2. Get case numbers from artefact search table
     const artefactCases = await findArtefactSearchByArtefactId(artefactId);
     const caseNumbers = artefactCases.map(ac => ac.caseNumber).filter(Boolean);

     // 3. Get case subscriptions
     const caseSubscriptions = caseNumbers.length > 0
       ? await findActiveSubscriptionsByCaseNumbers(caseNumbers)
       : [];

     // 4. Combine and deduplicate subscriptions
     const allSubscriptions = [...locationSubscriptions, ...caseSubscriptions];

     // 5. Process all with existing processUserNotification()
     ```
   - Ensure no duplicate notifications to same user
   - Add unit tests for case subscription fulfilment
   - Add integration tests for combined fulfilment flow

### Phase 7: Access Control (Priority: High)

1. **Add middleware** for verified user check
   - Verify user has VERIFIED_USER role
   - Redirect to login if not authenticated
   - Display error if not verified

2. **Apply middleware** to all subscription management routes

### Phase 8: Integration & Registration (Priority: Medium)

**Note:** The `verified-pages` module is already registered. No additional registration needed.
- Pages will be auto-discovered through existing `verified-pages` module registration
- Assets already configured in `apps/web/vite.config.ts`
- Verify that new services exported from `@hmcts/subscription` are accessible

### Phase 9: Testing (Priority: High)

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

1. ✅ Database schema updated with case_name and case_number columns
2. ✅ Users can search by case name and reference number
3. ✅ Search results display correctly
4. ✅ Subscriptions created with search_type = CASE_NUMBER
5. ✅ Case name and case number stored in subscription record
6. ✅ Subscriptions appear in "Subscriptions by case" table
7. ✅ Notifications sent when matching artefact published
8. ✅ All pages support Welsh language
9. ✅ Accessibility standards met (WCAG 2.2 AA)
10. ✅ All tests passing

## Estimated Complexity: High

This ticket involves creating a new multi-page user journey, case search functionality, subscription management UI, and integration with existing fulfilment logic. The complexity is high due to the number of pages, search logic, and dependency on VIBE-316.
