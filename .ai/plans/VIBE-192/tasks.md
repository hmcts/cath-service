# VIBE-192 — Implementation Tasks

> Ticket: VIBE-192 — Verified User Email Subscriptions
> Updated: 22 November 2025

---

## Task Breakdown

### Phase 1: Module Setup

#### Task 1.1: Create Module Structure
- [ ] Create directory `libs/subscriptions/`
- [ ] Create `libs/subscriptions/package.json` with proper exports
- [ ] Create `libs/subscriptions/tsconfig.json`
- [ ] Create directory structure:
  - `src/`
  - `src/pages/subscriptions/`
  - `src/subscription/`
  - `src/locales/`
  - `prisma/`

**Estimated: 30 minutes**

#### Task 1.2: Register Module in Monorepo
- [ ] Add module to root `tsconfig.json` paths:
  - `@hmcts/subscriptions`
  - `@hmcts/subscriptions/config`
- [ ] Add dependency to `apps/web/package.json`
- [ ] Add dependency to `apps/postgres/package.json` (for schema discovery)
- [ ] Run `yarn install` to link workspace

**Estimated: 15 minutes**

#### Task 1.3: Create Module Configuration Files
- [ ] Create `src/config.ts` with pageRoutes, prismaSchemas, locales exports
- [ ] Create `src/index.ts` for business logic exports
- [ ] Test that module can be imported

**Estimated: 15 minutes**

---

### Phase 2: Database Schema

#### Task 2.1: Create Prisma Schema
- [ ] Create `prisma/schema.prisma` with Subscription model
- [ ] Define fields: id, userId, locationId, dateAdded
- [ ] Add unique constraint on [userId, locationId]
- [ ] Add index on userId
- [ ] Configure generator and datasource

**Estimated: 30 minutes**

#### Task 2.2: Register Schema in Postgres App
- [ ] Import prismaSchemas from `@hmcts/subscriptions/config`
- [ ] Add to schemaPaths array in `apps/postgres/src/schema-discovery.ts`

**Estimated: 10 minutes**

#### Task 2.3: Create and Test Migration
- [ ] Run `yarn db:migrate:dev --name add-subscription-table`
- [ ] Verify migration file created
- [ ] Verify table created in database
- [ ] Run `yarn db:generate` to generate Prisma client

**Estimated: 30 minutes**

---

### Phase 3: Service Layer

#### Task 3.1: Create Database Queries
- [ ] Create `src/subscription/queries.ts`
- [ ] Implement `findUserSubscriptions(userId: string)`
- [ ] Implement `findSubscriptionById(id: string)`
- [ ] Implement `createSubscription(userId: string, locationId: number)`
- [ ] Implement `deleteSubscription(id: string)`
- [ ] Implement `subscriptionExists(userId: string, locationId: number)`
- [ ] Add proper TypeScript types

**Estimated: 1 hour**

#### Task 3.2: Create Business Logic Service
- [ ] Create `src/subscription/service.ts`
- [ ] Define `SubscriptionWithLocation` interface
- [ ] Implement `getUserSubscriptionsWithLocations(userId: string)`
- [ ] Implement `addSubscriptions(userId: string, locationIds: number[])`
- [ ] Implement `removeSubscription(subscriptionId: string, userId: string)`
- [ ] Add duplicate prevention logic

**Estimated: 1.5 hours**

#### Task 3.3: Create Validation Functions
- [ ] Create `src/subscription/validation.ts`
- [ ] Define `ValidationError` interface
- [ ] Implement `validateLocationSelection(locationIds: unknown)`
- [ ] Implement `normalizeLocationIds(locationIds: unknown)`
- [ ] Add comprehensive validation logic

**Estimated: 45 minutes**

#### Task 3.4: Write Unit Tests for Service Layer
- [ ] Create `src/subscription/service.test.ts`
- [ ] Test `getUserSubscriptionsWithLocations`
- [ ] Test `addSubscriptions` (including duplicate handling)
- [ ] Test `removeSubscription` (including authorization)
- [ ] Mock Prisma and location data
- [ ] Achieve >80% coverage

**Estimated: 2 hours**

---

### Phase 4: Localization

#### Task 4.1: Create English Translations
- [ ] Create `src/locales/en.ts`
- [ ] Add translations for all subscription pages:
  - `subscriptions.list.*`
  - `subscriptions.add.*`
  - `subscriptions.confirm.*`
  - `subscriptions.success.*`
- [ ] Export as default

**Estimated: 30 minutes**

#### Task 4.2: Create Welsh Translations
- [ ] Create `src/locales/cy.ts`
- [ ] Add Welsh translations matching English structure
- [ ] Review translations with Welsh speaker if available
- [ ] Export as default

**Estimated: 45 minutes**

---

### Phase 5: Page Controllers and Templates

#### Task 5.1: List Subscriptions Page
- [ ] Create `src/pages/subscriptions/index.ts` controller
- [ ] Implement GET handler with auth middleware
- [ ] Fetch user subscriptions
- [ ] Build verified user navigation
- [ ] Create `src/pages/subscriptions/index.njk` template
- [ ] Use GOV.UK table component
- [ ] Display "no subscriptions" message when empty
- [ ] Add "Add email subscription" button
- [ ] Add remove form for each subscription

**Estimated: 2 hours**

#### Task 5.2: Add Subscription Page
- [ ] Create `src/pages/subscriptions/add.ts` controller
- [ ] Implement GET handler to display form
- [ ] Implement POST handler to save selections
- [ ] Add validation for at least one selection
- [ ] Store selections in session
- [ ] Create `src/pages/subscriptions/add.njk` template
- [ ] Use GOV.UK checkboxes component
- [ ] Display locations grouped by letter
- [ ] Show error summary if validation fails

**Estimated: 3 hours**

#### Task 5.3: Confirm Subscriptions Page
- [ ] Create `src/pages/subscriptions/confirm.ts` controller
- [ ] Implement GET handler to display confirmation
- [ ] Implement POST handler for:
  - Remove action
  - Add another action
  - Continue action (save to database)
- [ ] Add validation for at least one subscription
- [ ] Create `src/pages/subscriptions/confirm.njk` template
- [ ] Display selected subscriptions with remove links
- [ ] Show "Add another subscription" link
- [ ] Handle error state when all removed

**Estimated: 3.5 hours**

#### Task 5.4: Success Page
- [ ] Create `src/pages/subscriptions/success.ts` controller
- [ ] Implement GET handler
- [ ] Create `src/pages/subscriptions/success.njk` template
- [ ] Use GOV.UK panel component for confirmation
- [ ] Display next action links

**Estimated: 45 minutes**

#### Task 5.5: Remove Subscription Handler
- [ ] Create `src/pages/subscriptions/remove/[id].ts`
- [ ] Implement POST handler
- [ ] Validate user owns subscription
- [ ] Call removeSubscription service
- [ ] Redirect back to list page
- [ ] Handle not found / unauthorized cases

**Estimated: 1 hour**

---

### Phase 6: Integration

#### Task 6.1: Register Pages in Web App
- [ ] Import pageRoutes from `@hmcts/subscriptions/config`
- [ ] Register with createSimpleRouter in `apps/web/src/app.ts`
- [ ] Test that routes are accessible

**Estimated: 15 minutes**

#### Task 6.2: Add Navigation Link
- [ ] Update `libs/auth/src/middleware/navigation-helper.ts`
- [ ] Add "Email subscriptions" link to `buildVerifiedUserNavigation`
- [ ] Add active state detection for `/subscriptions` paths
- [ ] Add Welsh translation

**Estimated: 30 minutes**

#### Task 6.3: Session Type Augmentation
- [ ] Create session type definition for subscription selection data
- [ ] Add to Express session types if needed

**Estimated: 15 minutes**

---

### Phase 7: Testing

#### Task 7.1: Manual Testing
- [ ] Test complete flow as verified user:
  - View empty subscription list
  - Add multiple subscriptions
  - View populated subscription list
  - Remove subscription from list
  - Add subscription with validation errors
  - Confirm page removal logic
  - Success page links
- [ ] Test Welsh language on all pages
- [ ] Test navigation integration

**Estimated: 1.5 hours**

#### Task 7.2: E2E Tests
- [ ] Create `e2e-tests/subscriptions.spec.ts`
- [ ] Test: Display subscription list page
- [ ] Test: Add subscriptions successfully
- [ ] Test: Validation error when no location selected
- [ ] Test: Remove subscription from list
- [ ] Test: Remove all on confirm page shows error
- [ ] Test: Add another subscription link
- [ ] Test: Welsh language switch
- [ ] All tests passing

**Estimated: 3 hours**

#### Task 7.3: Accessibility Testing
- [ ] Run axe-core tests on all pages
- [ ] Test keyboard navigation:
  - Tab through all interactive elements
  - Submit forms with Enter
  - Navigate with arrow keys where applicable
- [ ] Test with screen reader:
  - Verify error announcements
  - Verify table headers announced
  - Verify button labels clear
- [ ] Fix any accessibility issues found
- [ ] Document test results

**Estimated: 2 hours**

---

### Phase 8: Code Quality and Documentation

#### Task 8.1: Code Review Preparation
- [ ] Run `yarn lint:fix` on subscriptions module
- [ ] Run `yarn format` on subscriptions module
- [ ] Check TypeScript errors: `yarn workspace @hmcts/subscriptions build`
- [ ] Ensure all tests passing: `yarn test`
- [ ] Review code for HMCTS standards compliance

**Estimated: 1 hour**

#### Task 8.2: Update Documentation
- [ ] Update module README if needed
- [ ] Add JSDoc comments to exported functions
- [ ] Update any relevant ADRs

**Estimated: 30 minutes**

---

### Phase 9: Deployment

#### Task 9.1: Create Pull Request
- [ ] Create feature branch: `feature/VIBE-192-verified-user-email-subscriptions`
- [ ] Commit all changes with descriptive messages
- [ ] Push branch to remote
- [ ] Create PR with description and link to JIRA ticket
- [ ] Ensure CI/CD pipeline passes

**Estimated: 30 minutes**

#### Task 9.2: Address Review Comments
- [ ] Respond to code review feedback
- [ ] Make requested changes
- [ ] Re-test affected areas
- [ ] Push updates

**Estimated: 2 hours (variable)**

#### Task 9.3: Merge and Deploy
- [ ] Get PR approval
- [ ] Merge to main/master
- [ ] Monitor deployment
- [ ] Verify in demo environment
- [ ] Run smoke tests

**Estimated: 1 hour**

---

## Task Summary

| Phase | Tasks | Estimated Time |
|-------|-------|----------------|
| 1. Module Setup | 3 | 1 hour |
| 2. Database Schema | 3 | 1 hour 10 minutes |
| 3. Service Layer | 4 | 5 hours 15 minutes |
| 4. Localization | 2 | 1 hour 15 minutes |
| 5. Pages | 5 | 10 hours 15 minutes |
| 6. Integration | 3 | 1 hour |
| 7. Testing | 3 | 6 hours 30 minutes |
| 8. Code Quality | 2 | 1 hour 30 minutes |
| 9. Deployment | 3 | 3 hours 30 minutes |

**Total Estimated Time: ~31 hours (4 days)**

---

## Critical Path

The following tasks must be completed in order:

1. Module Setup (Phase 1) → Database Schema (Phase 2)
2. Database Schema (Phase 2) → Service Layer (Phase 3)
3. Service Layer (Phase 3) → Localization (Phase 4)
4. Localization (Phase 4) → Pages (Phase 5)
5. Pages (Phase 5) → Integration (Phase 6)
6. Integration (Phase 6) → Testing (Phase 7)
7. Testing (Phase 7) → Code Quality (Phase 8)
8. Code Quality (Phase 8) → Deployment (Phase 9)

**Note**: Some tasks within phases can be parallelized (e.g., unit tests while building pages).

---

## Prerequisites

Before starting:
- [ ] JIRA ticket approved and assigned
- [ ] Development environment set up
- [ ] Database running locally
- [ ] All dependencies up to date

---

## Definition of Done

- [ ] All tasks marked complete
- [ ] All unit tests passing
- [ ] All E2E tests passing
- [ ] Accessibility testing passed (WCAG 2.2 AA)
- [ ] Code reviewed and approved
- [ ] PR merged to main/master
- [ ] Deployed to demo environment
- [ ] Smoke tests completed
- [ ] JIRA ticket moved to Done

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Session data loss | Store minimal data, validate on each step |
| Database constraint violations | Handle gracefully with user-friendly errors |
| Location data out of sync | Use location module as single source of truth |
| Navigation integration breaks | Test thoroughly, use existing patterns |
| Welsh translations incorrect | Review with Welsh speaker, use existing patterns |

---

## Testing Checklist

### Unit Tests
- [ ] Service layer CRUD operations
- [ ] Duplicate prevention logic
- [ ] Validation functions
- [ ] Error handling

### E2E Tests
- [ ] Complete subscription flow
- [ ] Validation scenarios
- [ ] Removal scenarios
- [ ] Language switching
- [ ] Navigation integration

### Accessibility Tests
- [ ] Keyboard navigation
- [ ] Screen reader compatibility
- [ ] Focus indicators
- [ ] Error announcements
- [ ] Color contrast
- [ ] Semantic HTML

### Manual Tests
- [ ] All pages render correctly
- [ ] Forms submit correctly
- [ ] Errors display properly
- [ ] Welsh content correct
- [ ] Navigation active states
- [ ] Session management
- [ ] Authorization checks

---

## Notes

- Follow HMCTS monorepo standards from CLAUDE.md
- Use GOV.UK Design System components throughout
- Ensure WCAG 2.2 AA compliance
- Test with keyboard and screen readers
- Keep business logic separate from controllers
- Use functional patterns over classes
- Add `.js` extensions to all relative imports
