# VIBE-228: Implementation Tasks - Approve Media Application

## Prerequisites
- VIBE-229 must be completed first (shares infrastructure)
- Gov.Notify account set up
- Email templates created in Gov.Notify

## Phase 1: Database and Core Services

### Task 1.1: User Creation Service
**Estimate:** 2 hours

Create service for creating media user accounts.

**Files:**
- `libs/media-admin/src/user/creation-service.ts`
- `libs/media-admin/src/user/creation-service.test.ts`
- `libs/media-admin/src/user/queries.ts`
- `libs/media-admin/src/user/queries.test.ts`

**Acceptance Criteria:**
- Creates user with MEDIA role
- Sets userProvenance to SSO
- Uses email as userProvenanceId
- Validates required fields
- Handles duplicate email errors
- Unit tests >80% coverage

**Dependencies:** None

---

### Task 1.2: Gov.Notify Client Integration
**Estimate:** 3 hours

Integrate Gov.Notify client for sending approval emails.

**Files:**
- `libs/media-admin/src/notification/notify-client.ts`
- `libs/media-admin/src/notification/notify-client.test.ts`
- `libs/media-admin/src/notification/email-templates.ts`

**Acceptance Criteria:**
- Sends emails via Gov.Notify API
- Supports English and Welsh templates
- Handles API errors gracefully
- Logs failures for retry
- Mocked in tests
- Configuration from environment variables

**Dependencies:** None

**Notes:**
- Add `notifications-node-client` to package.json
- Environment variables for template IDs

---

### Task 1.3: Approval Service
**Estimate:** 4 hours

Implement approval business logic with transaction handling.

**Files:**
- `libs/media-admin/src/media-application/approval-service.ts`
- `libs/media-admin/src/media-application/approval-service.test.ts`

**Acceptance Criteria:**
- Uses database transaction for atomicity
- Validates application status is PENDING
- Checks for existing user email
- Creates user account
- Updates application to APPROVED
- Deletes Press ID file
- Sends approval email
- Handles all error scenarios
- Unit tests cover happy path and error cases

**Dependencies:**
- Task 1.1 (User Creation Service)
- Task 1.2 (Gov.Notify Client)
- File cleanup service from VIBE-229

---

## Phase 2: Page Controllers

### Task 2.1: Approval Confirmation Page Controller
**Estimate:** 3 hours

Create controller for approval confirmation page.

**Files:**
- `libs/media-admin/src/pages/admin/media-requests/[id]/approve.ts`
- `libs/media-admin/src/pages/admin/media-requests/[id]/approve.test.ts`

**Acceptance Criteria:**
- GET displays application details
- Shows radio buttons (Yes/No)
- POST validates selection
- POST with "yes" calls approval service
- POST with "no" redirects to details
- Error handling for missing application
- Error handling for already processed
- Flash messages for errors
- Welsh translations

**Dependencies:**
- Task 1.3 (Approval Service)
- Media application queries from VIBE-229

---

### Task 2.2: Approval Success Page Controller
**Estimate:** 2 hours

Create controller for approval success page.

**Files:**
- `libs/media-admin/src/pages/admin/media-requests/[id]/approved.ts`
- `libs/media-admin/src/pages/admin/media-requests/[id]/approved.test.ts`

**Acceptance Criteria:**
- GET displays success message
- Shows applicant details
- Links to media requests list
- Links to dashboard
- Validates application is APPROVED
- Redirects if not approved
- Welsh translations

**Dependencies:**
- Media application queries from VIBE-229

---

## Phase 3: Nunjucks Templates

### Task 3.1: Approval Confirmation Template
**Estimate:** 3 hours

Create Nunjucks template for approval confirmation.

**Files:**
- `libs/media-admin/src/pages/admin/media-requests/[id]/approve.njk`

**Acceptance Criteria:**
- Uses GOV.UK Design System components
- Summary list displays applicant details
- Radio buttons for Yes/No
- Error summary for validation errors
- Back link to applicant details
- Continue button
- Responsive layout
- Proper heading hierarchy
- Accessible labels and hints

**Dependencies:**
- Task 2.1 (Controller)

---

### Task 3.2: Approval Success Template
**Estimate:** 2 hours

Create Nunjucks template for approval success.

**Files:**
- `libs/media-admin/src/pages/admin/media-requests/[id]/approved.njk`

**Acceptance Criteria:**
- Uses GOV.UK panel component (green)
- Summary list displays applicant details
- Links to media requests list
- Links to dashboard
- Responsive layout
- Proper heading hierarchy

**Dependencies:**
- Task 2.2 (Controller)

---

## Phase 4: Integration and Configuration

### Task 4.1: Update Applicant Details Page
**Estimate:** 2 hours

Add "Approve" button to applicant details page (created in VIBE-229).

**Files:**
- `libs/media-admin/src/pages/admin/media-requests/[id].njk` (update)

**Acceptance Criteria:**
- "Approve" button links to approval confirmation
- "Reject" button links to rejection confirmation
- Both buttons visible for PENDING applications
- Proper button styling
- Accessible button labels

**Dependencies:**
- VIBE-229 completed

---

### Task 4.2: Environment Configuration
**Estimate:** 1 hour

Add environment variables for Gov.Notify.

**Files:**
- `.env.example` (update)
- `config/default.json` (update)
- `config/production.json` (update)

**Acceptance Criteria:**
- NOTIFY_API_KEY configured
- NOTIFY_TEMPLATE_MEDIA_APPROVED_EN configured
- NOTIFY_TEMPLATE_MEDIA_APPROVED_CY configured
- SERVICE_URL configured
- SERVICE_NAME configured
- Documentation updated

**Dependencies:** None

---

### Task 4.3: Module Registration
**Estimate:** 1 hour

Ensure media-admin module registered in web app (should be done in VIBE-229).

**Files:**
- `apps/web/src/app.ts` (verify)
- `tsconfig.json` (verify)

**Acceptance Criteria:**
- Module path in tsconfig.json
- Pages registered in app.ts
- Routes accessible
- Assets compiled

**Dependencies:**
- VIBE-229 completed

---

## Phase 5: Welsh Language Support

### Task 5.1: Welsh Translations
**Estimate:** 2 hours

Add Welsh translations for all approval content.

**Files:**
- `libs/media-admin/src/locales/cy.ts` (update)
- Controller files (verify cy objects)

**Acceptance Criteria:**
- All page content translated
- Error messages translated
- Button text translated
- Success messages translated
- Reviewed by Welsh speaker
- Consistent terminology

**Dependencies:**
- All controller and template tasks

---

### Task 5.2: Welsh Email Template
**Estimate:** 1 hour

Create Welsh approval email template in Gov.Notify.

**Acceptance Criteria:**
- Template created in Gov.Notify dashboard
- Template ID added to config
- Content reviewed by Welsh speaker
- Test email sent and verified

**Dependencies:**
- Task 4.2 (Environment Configuration)

---

## Phase 6: Testing

### Task 6.1: Unit Tests
**Estimate:** 4 hours

Write comprehensive unit tests for all services and controllers.

**Files:**
- All `*.test.ts` files created in previous tasks

**Acceptance Criteria:**
- Approval service tests (happy path + errors)
- User creation service tests
- Gov.Notify client tests (mocked)
- Controller tests (GET/POST scenarios)
- Coverage >80%
- All tests passing

**Dependencies:**
- All Phase 1 and Phase 2 tasks

---

### Task 6.2: E2E Tests (Playwright)
**Estimate:** 4 hours

Write end-to-end tests for approval flow.

**Files:**
- `e2e-tests/media-admin/approve-application.spec.ts`

**Acceptance Criteria:**
- Test complete approval flow
- Test validation errors
- Test "No" selection (go back)
- Test Welsh language version
- Test accessibility with axe-core
- Test error scenarios
- All tests passing

**Dependencies:**
- All Phase 2 and Phase 3 tasks

---

### Task 6.3: Integration Testing
**Estimate:** 3 hours

Test integration with shared VIBE-229 components.

**Acceptance Criteria:**
- Dashboard shows pending count
- List page displays applications
- Applicant details shows both buttons
- Approve and reject flows work together
- Status updates correctly
- File deletion works
- Email sending works

**Dependencies:**
- All previous tasks
- VIBE-229 completed

---

## Phase 7: Accessibility and Documentation

### Task 7.1: Accessibility Testing
**Estimate:** 2 hours

Comprehensive accessibility testing.

**Tasks:**
- Manual keyboard navigation testing
- Screen reader testing (NVDA/JAWS)
- Color contrast validation
- Focus management verification
- Error message clarity
- Axe DevTools scan

**Acceptance Criteria:**
- WCAG 2.2 AA compliant
- No axe-core violations
- Keyboard navigation functional
- Screen reader announcements correct
- Focus indicators visible
- Error messages clear

**Dependencies:**
- All Phase 3 tasks

---

### Task 7.2: Code Review Preparation
**Estimate:** 1 hour

Prepare code for review.

**Tasks:**
- Run Biome linter (`yarn lint:fix`)
- Run formatter (`yarn format`)
- Verify all tests pass
- Check TypeScript compilation
- Review error handling
- Verify no console.log statements

**Acceptance Criteria:**
- No linting errors
- All tests passing
- TypeScript compiles cleanly
- Code follows conventions

**Dependencies:**
- All implementation tasks

---

## Phase 8: Deployment

### Task 8.1: Database Migration
**Estimate:** 1 hour

Verify database schema supports approval flow (should be done in VIBE-229).

**Tasks:**
- Verify MediaApplication table exists
- Verify User table ready
- Test migration in dev environment
- Document rollback procedure

**Acceptance Criteria:**
- Migrations run successfully
- Schema supports all queries
- Rollback tested

**Dependencies:**
- VIBE-229 database setup

---

### Task 8.2: Gov.Notify Setup
**Estimate:** 2 hours

Set up Gov.Notify templates in production.

**Tasks:**
- Create English approval template
- Create Welsh approval template
- Test with real emails
- Document template IDs
- Add to environment config

**Acceptance Criteria:**
- Templates created and approved
- Test emails received
- Template IDs documented
- Environment variables set

**Dependencies:**
- Task 5.2 (Welsh Email Template)

---

### Task 8.3: Deployment Checklist
**Estimate:** 1 hour

Final deployment preparation.

**Checklist:**
- [ ] All tests passing
- [ ] Database migrations ready
- [ ] Environment variables documented
- [ ] Gov.Notify templates created
- [ ] Welsh translations reviewed
- [ ] Accessibility tested
- [ ] Code reviewed
- [ ] Documentation complete
- [ ] Rollback plan documented

**Dependencies:**
- All previous tasks

---

## Task Summary

### By Phase
| Phase | Tasks | Estimated Hours |
|-------|-------|-----------------|
| Phase 1: Database and Core Services | 3 | 9 |
| Phase 2: Page Controllers | 2 | 5 |
| Phase 3: Nunjucks Templates | 2 | 5 |
| Phase 4: Integration | 3 | 4 |
| Phase 5: Welsh Language | 2 | 3 |
| Phase 6: Testing | 3 | 11 |
| Phase 7: Accessibility | 2 | 3 |
| Phase 8: Deployment | 3 | 4 |
| **Total** | **20** | **44** |

### Critical Path
1. Task 1.1 → Task 1.3 → Task 2.1 → Task 3.1
2. Task 1.2 → Task 1.3
3. Task 2.2 → Task 3.2
4. All testing after implementation complete

### High-Risk Tasks
- Task 1.2: Gov.Notify integration (external dependency)
- Task 1.3: Transaction handling (database complexity)
- Task 6.3: Integration testing (dependency on VIBE-229)
- Task 8.2: Gov.Notify production setup (external service)

## Development Order

### Sprint 1 (Core Services)
1. Task 1.1: User Creation Service (2h)
2. Task 1.2: Gov.Notify Client (3h)
3. Task 1.3: Approval Service (4h)
4. Task 4.2: Environment Configuration (1h)

**Total:** 10 hours

### Sprint 2 (Controllers and Templates)
5. Task 2.1: Approval Confirmation Controller (3h)
6. Task 2.2: Approval Success Controller (2h)
7. Task 3.1: Approval Confirmation Template (3h)
8. Task 3.2: Approval Success Template (2h)
9. Task 4.1: Update Applicant Details (2h)

**Total:** 12 hours

### Sprint 3 (Welsh and Testing)
10. Task 5.1: Welsh Translations (2h)
11. Task 5.2: Welsh Email Template (1h)
12. Task 6.1: Unit Tests (4h)
13. Task 6.2: E2E Tests (4h)
14. Task 6.3: Integration Testing (3h)

**Total:** 14 hours

### Sprint 4 (Final Polish and Deployment)
15. Task 7.1: Accessibility Testing (2h)
16. Task 7.2: Code Review Prep (1h)
17. Task 4.3: Module Registration Verification (1h)
18. Task 8.1: Database Migration Verification (1h)
19. Task 8.2: Gov.Notify Setup (2h)
20. Task 8.3: Deployment Checklist (1h)

**Total:** 8 hours

## Notes

### Dependencies on VIBE-229
- Media-admin module structure
- Database schema (MediaApplication table)
- Dashboard page
- Media requests list page
- Applicant details page
- File cleanup service
- Admin authentication middleware

### External Dependencies
- Gov.Notify API
- Gov.Notify templates (English and Welsh)
- File storage for Press ID files
- Database (PostgreSQL)
- Azure AD (admin authentication)

### Testing Strategy
- Unit tests for all services
- Controller tests with mocked dependencies
- E2E tests with Playwright
- Accessibility tests with axe-core
- Integration tests with VIBE-229 components
- Manual testing for Welsh content
- Manual screen reader testing

### Risk Mitigation
- Mock Gov.Notify in tests
- Transaction rollback on failures
- Graceful error handling
- File deletion failures don't block approval
- Email failures logged and queued
- Comprehensive error messages

### Definition of Done
- All tasks completed
- All tests passing (unit, integration, E2E)
- Test coverage >80%
- WCAG 2.2 AA compliant
- Welsh translations reviewed
- Code reviewed and approved
- Documentation complete
- Deployed to staging
- Stakeholder acceptance
