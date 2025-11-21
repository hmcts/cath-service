# VIBE-196 Unsubscribe Feature - Implementation Tasks

## Phase 1: Module Setup & Database

### Database Schema (database-engineer)
- [ ] Review existing user/account schema in Prisma
- [ ] Add `emailNotifications` boolean field (default: true)
- [ ] Add `emailNotificationsUpdatedAt` timestamp field
- [ ] Create migration for new fields
- [ ] Run migration on development database
- [ ] Verify migration with `yarn db:studio`

### Module Structure (full-stack-engineer)
- [ ] Create `libs/email-subscriptions` module directory structure
- [ ] Create `package.json` with module metadata and scripts
- [ ] Create `tsconfig.json` extending root config
- [ ] Setup build scripts including Nunjucks template copying
- [ ] Register module in root `tsconfig.json` paths as `@hmcts/email-subscriptions`
- [ ] Add module exports in `src/config.ts` (pageRoutes)
- [ ] Create `src/index.ts` for business logic exports

## Phase 2: Core Implementation

### Database Queries (full-stack-engineer)
- [ ] Create `src/email-subscriptions/queries.ts`
- [ ] Implement `getUserByEmail(email: string)` query
- [ ] Implement `getUserById(id: string)` query
- [ ] Implement `updateEmailNotificationPreference(userId: string, enabled: boolean)` mutation
- [ ] Add unit tests for all query functions

### Business Logic (full-stack-engineer)
- [ ] Create `src/email-subscriptions/service.ts`
- [ ] Implement `unsubscribeUser(userId: string)` service function
- [ ] Add validation for user existence
- [ ] Add error handling for database failures
- [ ] Add timestamp tracking for unsubscribe action
- [ ] Add unit tests for service layer (>80% coverage)

## Phase 3: Page Implementation

### Unsubscribe Page (full-stack-engineer)
- [ ] Create `src/pages/unsubscribe/index.ts` controller
- [ ] Implement GET handler with authentication check
- [ ] Retrieve user email from session/database
- [ ] Pass user email to template
- [ ] Implement POST handler for unsubscribe action
- [ ] Call `unsubscribeUser` service function
- [ ] Redirect to confirmation page on success
- [ ] Handle errors with appropriate error page
- [ ] Add CSRF protection to form
- [ ] Create English content object in controller
- [ ] Create Welsh content object in controller
- [ ] Add unit tests for GET handler
- [ ] Add unit tests for POST handler

### Unsubscribe Template (full-stack-engineer)
- [ ] Create `src/pages/unsubscribe/index.njk` template
- [ ] Extend base template layout
- [ ] Add page title with service name
- [ ] Add back link to account home
- [ ] Add main heading (h1)
- [ ] Add explanatory text about unsubscribe
- [ ] Display user's email address
- [ ] Add bulleted list of what they'll stop receiving
- [ ] Add note about re-subscribing
- [ ] Add warning component (GOV.UK Design System)
- [ ] Add primary button "Unsubscribe from email notifications"
- [ ] Add secondary cancel link
- [ ] Add form with POST method and CSRF token
- [ ] Ensure template supports English and Welsh content
- [ ] Test template rendering with Nunjucks tests

### Confirmation Page (full-stack-engineer)
- [ ] Create `src/pages/unsubscribe/confirmation/index.ts` controller
- [ ] Implement GET handler (no authentication required for confirmation)
- [ ] Create English content object
- [ ] Create Welsh content object
- [ ] Add unit tests for controller

### Confirmation Template (full-stack-engineer)
- [ ] Create `src/pages/unsubscribe/confirmation/index.njk` template
- [ ] Extend base template layout
- [ ] Add confirmation panel with checkmark (GOV.UK Design System)
- [ ] Add "What happens next" section
- [ ] Add button to return to account home
- [ ] Support English and Welsh content
- [ ] Test template rendering

## Phase 4: Navigation & Integration

### Navigation Updates (full-stack-engineer)
- [ ] Update `libs/auth/src/middleware/navigation-helper.ts`
- [ ] Change Email subscriptions href from "/" to "/unsubscribe"
- [ ] Add unit tests for navigation link change
- [ ] Update existing navigation tests if needed

### Account Home Integration (full-stack-engineer)
- [ ] Update `libs/verified-pages/src/pages/account-home/index.njk`
- [ ] Change Email subscriptions tile href from "/" to "/unsubscribe"
- [ ] Update E2E tests for account-home links

### Module Registration (full-stack-engineer)
- [ ] Import `@hmcts/email-subscriptions/config` in `apps/web/src/app.ts`
- [ ] Register pageRoutes with `createSimpleRouter`
- [ ] Add dependency to `apps/web/package.json`
- [ ] Verify module loads correctly with `yarn dev`

## Phase 5: Styling & Assets

### CSS Styling (full-stack-engineer)
- [ ] Create `src/assets/css/unsubscribe.scss` if custom styles needed
- [ ] Use GOV.UK Design System components primarily
- [ ] Add any custom spacing or layout styles
- [ ] Register assets in `src/config.ts` if needed
- [ ] Update `apps/web/vite.config.ts` to include assets

## Phase 6: Testing

### Unit Tests (test-engineer)
- [ ] Verify query layer tests pass (>80% coverage)
- [ ] Verify service layer tests pass (>80% coverage)
- [ ] Verify controller tests pass (>80% coverage)
- [ ] Verify navigation helper tests pass
- [ ] Run `yarn test` and ensure all tests pass

### E2E Tests (test-engineer)
- [ ] Create `e2e-tests/tests/unsubscribe.spec.ts`
- [ ] Test happy path: navigate to unsubscribe, submit, see confirmation
- [ ] Test cancel flow: navigate to unsubscribe, click cancel, return to account home
- [ ] Test unauthenticated access redirects to sign-in
- [ ] Test Welsh language support (?lng=cy)
- [ ] Verify database state changes after unsubscribe
- [ ] Run `yarn test:e2e` and ensure all tests pass

### Accessibility Tests (test-engineer)
- [ ] Run Axe accessibility scanner on unsubscribe page
- [ ] Run Axe accessibility scanner on confirmation page
- [ ] Manual keyboard navigation testing
- [ ] Test with screen reader (NVDA/JAWS)
- [ ] Test at 320px viewport width
- [ ] Test at 200% zoom level
- [ ] Verify color contrast ratios
- [ ] Document any accessibility issues found and fixed

### Manual Testing (qa-engineer)
- [ ] Test on Chrome, Firefox, Safari, Edge
- [ ] Test on mobile devices (iOS Safari, Android Chrome)
- [ ] Test with JavaScript disabled
- [ ] Test form validation and error handling
- [ ] Test session expiry scenarios
- [ ] Test concurrent unsubscribe requests
- [ ] Verify database updates correctly
- [ ] Test back button behavior
- [ ] Test bookmark/refresh on confirmation page

## Phase 7: Welsh Translation

### Translation Content (translator)
- [ ] Review English content in specification
- [ ] Translate unsubscribe page heading
- [ ] Translate unsubscribe page body text
- [ ] Translate button text
- [ ] Translate cancel link text
- [ ] Translate confirmation page heading
- [ ] Translate confirmation page body text
- [ ] Review translations for accuracy and tone
- [ ] Update controller content objects with Welsh translations

### Translation Verification (qa-engineer)
- [ ] Verify all Welsh content displays correctly
- [ ] Check for untranslated strings
- [ ] Verify Welsh grammar and spelling
- [ ] Test form submission in Welsh
- [ ] Verify error messages in Welsh (if any)

## Phase 8: Code Review & Quality

### Code Review (code-reviewer)
- [ ] Review adherence to HMCTS coding standards
- [ ] Check TypeScript strict mode compliance
- [ ] Verify ES module usage (no CommonJS)
- [ ] Review naming conventions (camelCase, PascalCase, kebab-case)
- [ ] Check file organization and module structure
- [ ] Verify proper .js extensions on imports
- [ ] Review separation of concerns (business logic separate from controllers)
- [ ] Check for code duplication

### Security Review (security-engineer)
- [ ] Verify authentication middleware on protected routes
- [ ] Check CSRF protection implementation
- [ ] Verify input validation and sanitization
- [ ] Check for SQL injection vulnerabilities (Prisma usage)
- [ ] Verify XSS prevention (Nunjucks auto-escaping)
- [ ] Check for sensitive data in logs
- [ ] Review error messages don't leak sensitive information
- [ ] Verify session handling security

### Testing Review (code-reviewer)
- [ ] Verify 80%+ test coverage achieved
- [ ] Review test quality and edge case coverage
- [ ] Check for brittle or flaky tests
- [ ] Verify E2E tests are reliable
- [ ] Check accessibility tests are comprehensive

### Performance Review (code-reviewer)
- [ ] Check for unnecessary database queries
- [ ] Verify efficient query patterns
- [ ] Review page load performance
- [ ] Check for N+1 query problems
- [ ] Verify proper database indexing on queried fields

## Phase 9: Documentation

### Technical Documentation (full-stack-engineer)
- [ ] Update CLAUDE.md if needed for new patterns
- [ ] Document unsubscribe flow in module README
- [ ] Document database schema changes
- [ ] Add JSDoc comments to public functions
- [ ] Update navigation documentation

### User Documentation (technical-writer)
- [ ] Create user guide for unsubscribe feature
- [ ] Document re-subscription process (if applicable)
- [ ] Update help center content
- [ ] Create FAQ entries

## Phase 10: Deployment Preparation

### Pre-Deployment Checks (devops-engineer)
- [ ] Verify database migration runs successfully
- [ ] Check environment variables are set correctly
- [ ] Verify no hardcoded values in code
- [ ] Test deployment in staging environment
- [ ] Run smoke tests in staging
- [ ] Verify monitoring and logging setup
- [ ] Create rollback plan

### Infrastructure Review (infrastructure-engineer)
- [ ] Verify existing infrastructure supports new feature
- [ ] No infrastructure changes required (uses existing patterns)
- [ ] Confirm database can handle schema changes
- [ ] Verify session storage capacity adequate

## Definition of Done

- [ ] All implementation tasks completed
- [ ] All unit tests passing with >80% coverage
- [ ] All E2E tests passing
- [ ] All accessibility tests passing (zero Axe violations)
- [ ] Code review completed and approved
- [ ] Security review completed and approved
- [ ] Both English and Welsh fully functional
- [ ] No linting or TypeScript errors
- [ ] Documentation updated
- [ ] Deployed to staging and tested
- [ ] Ready for production deployment

## Notes

- Module follows standard HMCTS monorepo patterns
- Uses existing authentication and authorization middleware from `@hmcts/auth`
- Database changes are minimal (two fields added to user table)
- No infrastructure changes required
- Progressive enhancement approach (works without JavaScript)
- Follows GOV.UK Design System patterns throughout
- Focus on simplicity and user experience
- Consider future enhancement: unsubscribe via email link without login

## Estimated Effort

- **Database setup**: 2 hours
- **Module structure**: 1 hour
- **Core implementation**: 4 hours
- **Page implementation**: 6 hours
- **Navigation integration**: 1 hour
- **Testing (unit + E2E)**: 6 hours
- **Accessibility testing**: 2 hours
- **Welsh translation**: 2 hours
- **Code review**: 2 hours
- **Documentation**: 2 hours

**Total Estimated Effort**: 28 hours (approximately 3.5 development days)
