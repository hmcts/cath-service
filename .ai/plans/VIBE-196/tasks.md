# Implementation Tasks: VIBE-196 — Verified User Unsubscribe

## Phase 1: Setup & Database

- [ ] Review existing subscription schema in `@hmcts/postgres`
- [ ] Create `@hmcts/subscriptions` module structure
- [ ] Set up package.json with proper exports and scripts
- [ ] Add module to root tsconfig.json paths
- [ ] Create subscription service with database methods

## Phase 2: Page Controllers & Routes

- [ ] Implement `/subscriptions` list page controller
- [ ] Implement `/subscriptions/unsubscribe/:id` GET controller
- [ ] Implement `/subscriptions/unsubscribe/:id` POST controller
- [ ] Implement `/subscriptions/removed` success page controller
- [ ] Add authorization middleware for all routes

## Phase 3: Templates

- [ ] Create `subscriptions.njk` list template with GOV.UK table
- [ ] Create `unsubscribe.njk` confirmation template with radios
- [ ] Create `removed.njk` success template with banner
- [ ] Ensure all templates use GOV.UK Design System components
- [ ] Add Back links to all templates

## Phase 4: Localization

- [ ] Create English content in `locales/en.ts`
- [ ] Create Welsh content in `locales/cy.ts`
- [ ] Test language switching with `?lng=cy`
- [ ] Ensure all error messages are bilingual

## Phase 5: Validation & Security

- [ ] Implement form validation for Yes/No selection
- [ ] Add subscription ownership authorization check
- [ ] Implement error handling for not found subscriptions
- [ ] Add error summary and inline errors
- [ ] Test unauthorized access scenarios

## Phase 6: Integration

- [ ] Register module in `apps/web/src/app.ts`
- [ ] Add module assets to Vite config
- [ ] Test integration with existing navigation
- [ ] Verify links to other subscription flows work
- [ ] Ensure email notification system respects deletions

## Phase 7: Testing

- [ ] Write unit tests for subscription service (>80% coverage)
- [ ] Write unit tests for controllers
- [ ] Write integration tests for full flow
- [ ] Create E2E test for TS1: List subscriptions
- [ ] Create E2E test for TS2: Start unsubscribe
- [ ] Create E2E test for TS3: Confirm No
- [ ] Create E2E test for TS4: Confirm Yes
- [ ] Create E2E test for TS5: Delete single subscription
- [ ] Create E2E test for TS6: Delete one of multiple
- [ ] Create E2E test for TS7: Validation error
- [ ] Create E2E test for TS8: Authorization check
- [ ] Create E2E test for TS9: Welsh language
- [ ] Create E2E test for TS10: Accessibility checks

## Phase 8: Documentation & Review

- [ ] Update module README
- [ ] Document API endpoints
- [ ] Code review
- [ ] Test on demo environment
- [ ] Update JIRA ticket with progress
