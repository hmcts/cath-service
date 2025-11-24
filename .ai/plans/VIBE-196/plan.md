# Technical Implementation Plan: VIBE-196 — Verified User Unsubscribe

## Overview

Implement unsubscribe functionality for verified users to manage their email subscriptions to court and tribunal hearings. Users can view their subscriptions, confirm removal, and receive confirmation of the action.

## Technical Approach

### 1. Database Schema

Assuming existing subscription model tracks user subscriptions to venues. The implementation will:
- Query subscriptions by user ID
- Delete individual subscription records
- Handle cases where users have no remaining subscriptions

### 2. Module Structure

Create a new feature module `@hmcts/subscriptions` with:
- Page controllers for the three-page flow
- Nunjucks templates using GOV.UK Design System components
- Bilingual content (EN/CY)
- Form validation middleware

### 3. Route Structure

```
GET  /subscriptions                      → List all user subscriptions
GET  /subscriptions/unsubscribe/:id      → Confirmation page
POST /subscriptions/unsubscribe/:id      → Process unsubscription
GET  /subscriptions/removed              → Success confirmation
```

## Implementation Steps

### Phase 1: Database & Data Layer

1. **Review existing subscription schema** in `@hmcts/postgres`
   - Identify subscription table structure
   - Understand relationship between users and venues
   - Determine soft delete vs hard delete approach

2. **Create subscription service** in `@hmcts/subscriptions`
   - `getUserSubscriptions(userId)` - Fetch all user subscriptions
   - `getSubscriptionById(subscriptionId, userId)` - Fetch single subscription with auth check
   - `deleteSubscription(subscriptionId, userId)` - Remove subscription
   - `getRemainingSubscriptionCount(userId)` - Check if user has other subscriptions

### Phase 2: Module Setup

1. **Create module structure**
   ```
   libs/subscriptions/
   ├── package.json
   ├── tsconfig.json
   ├── prisma/schema.prisma (if new tables needed)
   └── src/
       ├── config.ts
       ├── index.ts
       ├── pages/
       │   ├── subscriptions.ts
       │   ├── subscriptions.njk
       │   ├── unsubscribe.ts
       │   ├── unsubscribe.njk
       │   ├── removed.ts
       │   └── removed.njk
       ├── locales/
       │   ├── en.ts
       │   └── cy.ts
       └── subscription-service.ts
   ```

2. **Configure package.json** with proper exports and build scripts

3. **Register module** in `apps/web/src/app.ts` and root `tsconfig.json`

### Phase 3: Page Implementation

1. **Subscriptions List Page** (`/subscriptions`)
   - Controller: Fetch user subscriptions from database
   - Template: GOV.UK table component with subscription details
   - Display: Court name, date added, unsubscribe link per row
   - Button: "Add email subscription" (links to existing flow)

2. **Unsubscribe Confirmation Page** (`/subscriptions/unsubscribe/:id`)
   - GET: Display confirmation form with Yes/No radios
   - POST: Process form submission
     - Validate radio selection
     - Verify subscription belongs to user (authorization)
     - If Yes: delete subscription and redirect to success
     - If No: redirect back to list
   - Template: GOV.UK radios component with error summary

3. **Success Confirmation Page** (`/subscriptions/removed`)
   - Display: GOV.UK success banner
   - Content: Confirmation message and helpful links
   - Links to: add subscription, manage subscriptions, find court

### Phase 4: Validation & Security

1. **Form validation**
   - Require Yes/No selection on confirmation page
   - Display inline and summary errors using GOV.UK error patterns

2. **Authorization checks**
   - Verify subscription ID belongs to logged-in user
   - Return error if user attempts to access another user's subscription
   - Middleware to ensure user is authenticated

3. **Data integrity**
   - Use transactions where appropriate
   - Handle race conditions (subscription already deleted)
   - Log deletion events for audit

### Phase 5: Localization

1. **English content** (`libs/subscriptions/src/locales/en.ts`)
   - Page titles, labels, button text
   - Error messages
   - Success messages

2. **Welsh content** (`libs/subscriptions/src/locales/cy.ts`)
   - Complete Welsh translations for all content
   - Maintain same structure as English

3. **Template integration**
   - Use i18n middleware to serve correct language
   - Test with `?lng=cy` query parameter

### Phase 6: Testing

1. **Unit tests** (Vitest)
   - Test subscription service methods
   - Mock Prisma client
   - Verify authorization logic

2. **Integration tests**
   - Test full controller flow
   - Verify database operations
   - Test validation rules

3. **E2E tests** (Playwright)
   - Test complete user journey (TS1-TS10 from specification)
   - Test English and Welsh versions
   - Test accessibility with axe-core
   - Test keyboard navigation

4. **Accessibility testing**
   - WCAG 2.2 AA compliance
   - Screen reader compatibility
   - Keyboard navigation
   - Focus management

## Technical Considerations

### Authentication & Authorization
- Require verified user authentication for all routes
- Verify subscription ownership before deletion
- Handle unauthorized access gracefully

### Data Model
- Clarify if deleting last subscription removes user record entirely
- Consider soft delete vs hard delete for audit trail
- Ensure email notification system respects deleted subscriptions

### Error Handling
- Handle subscription not found (404)
- Handle unauthorized access (403)
- Handle database errors gracefully
- Provide user-friendly error messages

### Performance
- Index subscription lookups by user_id
- Consider caching user subscription counts
- Minimize database queries per page load

## Dependencies

- `@hmcts/postgres` - Database access
- `@hmcts/auth` - User authentication
- `express@5.1.0` - Routing
- `nunjucks` - Template rendering
- GOV.UK Frontend - UI components
- Existing subscription/notification infrastructure

## Acceptance Criteria Mapping

| AC | Implementation |
|----|----------------|
| AC1 | Email subscriptions tab in navigation |
| AC2 | `/subscriptions` page with table and Add button |
| AC3 | Confirmation flow with Yes/No radios |
| AC4 | Back links on all pages |
| AC5 | Database deletion logic based on subscription count |
| AC6 | Follow GOV.UK Design System and HMCTS patterns |

## Open Questions

1. What is the exact database schema for subscriptions?
2. Does the Add email subscription flow already exist?
3. Should we implement soft delete or hard delete?
4. Are there any notification system integrations needed?
5. What are the exact routes for "find a court or tribunal" and "subscribe by name"?

## Definition of Done

- [ ] All three pages implemented with controllers and templates
- [ ] Database service methods created and tested
- [ ] Form validation working with GOV.UK error patterns
- [ ] Authorization checks prevent cross-user access
- [ ] Complete English and Welsh translations
- [ ] Unit tests achieve >80% coverage
- [ ] E2E tests cover all 10 test scenarios
- [ ] Accessibility tests pass WCAG 2.2 AA
- [ ] Code review completed
- [ ] Documentation updated
