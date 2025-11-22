# VIBE-187: Implementation Tasks

## Phase 1: Module Setup & Database (Week 1)

### Task 1.1: Create Module Structure
**Estimate:** 1 hour

```bash
mkdir -p libs/educational-feedback/src/pages/feedback
mkdir -p libs/educational-feedback/src/pages/feedback-success
mkdir -p libs/educational-feedback/src/admin-pages/feedback-dashboard
mkdir -p libs/educational-feedback/src/admin-pages/feedback-export
mkdir -p libs/educational-feedback/src/routes
mkdir -p libs/educational-feedback/src/feedback
mkdir -p libs/educational-feedback/src/assets/css
mkdir -p libs/educational-feedback/prisma
```

**Files to create:**
- [ ] `libs/educational-feedback/package.json`
- [ ] `libs/educational-feedback/tsconfig.json`
- [ ] `libs/educational-feedback/src/config.ts`
- [ ] `libs/educational-feedback/src/index.ts`

**Acceptance:**
- Module structure follows HMCTS monorepo patterns
- Package.json includes all required scripts
- TypeScript configuration extends root config

---

### Task 1.2: Register Module in Root Config
**Estimate:** 30 minutes

**Files to modify:**
- [ ] `/home/runner/work/cath-service/cath-service/tsconfig.json` - Add path alias
- [ ] `/home/runner/work/cath-service/cath-service/apps/web/package.json` - Add dependency
- [ ] `/home/runner/work/cath-service/cath-service/apps/postgres/package.json` - Add dependency

**Acceptance:**
- Module recognized by TypeScript
- Module available in workspace
- No build errors

---

### Task 1.3: Create Prisma Schema
**Estimate:** 2 hours

**Files to create:**
- [ ] `libs/educational-feedback/prisma/schema.prisma`

**Schema requirements:**
- Table: `educational_feedback`
- Fields: id (uuid), artefact_id (uuid), satisfaction_rating (int), trust_rating (int), comment (text), submitted_at (timestamp)
- Indexes: artefact_id, submitted_at, composite (artefact_id, submitted_at)
- Proper snake_case naming with @map annotations

**Acceptance:**
- Schema follows naming conventions
- All indexes defined
- No Prisma validation errors

---

### Task 1.4: Register Schema & Create Migration
**Estimate:** 1 hour

**Files to modify:**
- [ ] `apps/postgres/src/schema-discovery.ts` - Import prismaSchemas

**Commands to run:**
```bash
yarn db:generate
yarn db:migrate:dev --name add_educational_feedback
```

**Acceptance:**
- Migration file created
- Schema applied to local database
- Prisma client regenerated
- Database accessible in Prisma Studio

---

### Task 1.5: Create Data Access Layer
**Estimate:** 3 hours

**Files to create:**
- [ ] `libs/educational-feedback/src/feedback/feedback-queries.ts`
- [ ] `libs/educational-feedback/src/feedback/feedback-queries.test.ts`

**Functions to implement:**
- `createFeedback(data: CreateFeedbackData): Promise<EducationalFeedback>`
- `queryFeedbackWithFilters(filters: FeedbackFilters): Promise<EducationalFeedback[]>`
- `getFeedbackStats(filters: FeedbackFilters): Promise<FeedbackStats>`
- `getFeedbackById(id: string): Promise<EducationalFeedback | null>`

**Acceptance:**
- All queries use Prisma ORM
- Parameterized queries (no SQL injection)
- Unit tests with >80% coverage
- Mock Prisma client in tests

---

## Phase 2: Feedback Form (Week 2)

### Task 2.1: Create Validation Logic
**Estimate:** 2 hours

**Files to create:**
- [ ] `libs/educational-feedback/src/feedback/feedback-validation.ts`
- [ ] `libs/educational-feedback/src/feedback/feedback-validation.test.ts`

**Validation rules:**
- `artefactId`: required, valid UUID format
- `satisfactionRating`: required, integer 1-5
- `trustRating`: required, integer 1-5
- `comment`: optional, max 1000 characters, sanitized

**Functions:**
- `validateFeedbackSubmission(data: unknown): ValidationResult`
- `sanitizeComment(comment: string): string`

**Acceptance:**
- All validation rules tested
- Edge cases handled (missing fields, invalid types, etc.)
- Sanitization prevents XSS
- Unit tests with 100% coverage

---

### Task 2.2: Create Feedback Service
**Estimate:** 3 hours

**Files to create:**
- [ ] `libs/educational-feedback/src/feedback/feedback-service.ts`
- [ ] `libs/educational-feedback/src/feedback/feedback-service.test.ts`

**Functions to implement:**
- `submitFeedback(data: FeedbackSubmission): Promise<EducationalFeedback>`
- `getFeedbackMetrics(filters: FeedbackFilters): Promise<FeedbackMetrics>`
- `exportFeedbackToCsv(filters: FeedbackFilters): Promise<string>`

**Business logic:**
- Validate input before database operations
- Sanitize comments
- Calculate aggregate metrics
- Generate CSV with proper formatting

**Acceptance:**
- Service layer pure functions (no side effects beyond DB)
- All edge cases handled
- Unit tests mock database layer
- >80% test coverage

---

### Task 2.3: Create Rate Limiting Middleware
**Estimate:** 2 hours

**Files to create:**
- [ ] `libs/educational-feedback/src/rate-limit-middleware.ts`
- [ ] `libs/educational-feedback/src/rate-limit-middleware.test.ts`

**Requirements:**
- Limit: 10 submissions per hour per IP
- Store in Redis (use @hmcts/redis)
- Return 429 status when limit exceeded
- Clean up old entries

**Acceptance:**
- Middleware blocks after rate limit hit
- Uses Redis for distributed rate limiting
- Proper error page rendered
- Unit tests with mocked Redis

---

### Task 2.4: Create Feedback Form Controller
**Estimate:** 3 hours

**Files to create:**
- [ ] `libs/educational-feedback/src/pages/feedback/index.ts`
- [ ] `libs/educational-feedback/src/pages/feedback/index.test.ts`
- [ ] `libs/educational-feedback/src/pages/feedback/en.ts`
- [ ] `libs/educational-feedback/src/pages/feedback/cy.ts`

**Controller logic:**
- GET: Validate artefactId query param, render form
- POST: Validate submission, call service, redirect to success
- Error handling: validation errors, database errors
- CSRF protection

**Translations:**
- All form labels, hints, error messages
- Welsh translations match English structure

**Acceptance:**
- GET handler validates artefactId
- POST handler processes form data
- Validation errors displayed with GOV.UK error summary
- Both languages tested
- Unit tests for both handlers

---

### Task 2.5: Create Feedback Form Template
**Estimate:** 4 hours

**Files to create:**
- [ ] `libs/educational-feedback/src/pages/feedback/index.njk`
- [ ] `libs/educational-feedback/src/pages/feedback/index.njk.test.ts`

**GOV.UK Components to use:**
- govukRadios (satisfaction rating)
- govukRadios (trust rating)
- govukTextarea (comment with character count)
- govukButton (submit)
- govukErrorSummary (validation errors)

**Requirements:**
- Progressive enhancement (works without JS)
- Character counter for comments
- Proper ARIA labels
- Form hints and examples
- Error message placement

**Acceptance:**
- Template renders with all components
- Works without JavaScript
- WCAG 2.2 AA compliant
- Visual regression tests pass

---

### Task 2.6: Create Success Page
**Estimate:** 2 hours

**Files to create:**
- [ ] `libs/educational-feedback/src/pages/feedback-success/index.ts`
- [ ] `libs/educational-feedback/src/pages/feedback-success/index.njk`
- [ ] `libs/educational-feedback/src/pages/feedback-success/en.ts`
- [ ] `libs/educational-feedback/src/pages/feedback-success/cy.ts`

**Content:**
- Thank you message
- Confirmation that feedback received
- Link back to publications
- No back button to prevent resubmission

**Acceptance:**
- Page renders correctly
- Both languages available
- Links work correctly
- No form resubmission on refresh

---

### Task 2.7: Create Module Styles
**Estimate:** 1 hour

**Files to create:**
- [ ] `libs/educational-feedback/src/assets/css/feedback.scss`

**Styles needed:**
- Rating visualization (stars/indicators)
- Feedback card styling
- Admin dashboard layout
- Responsive design

**Acceptance:**
- Follows GOV.UK Design System
- Mobile responsive (320px+)
- No accessibility issues
- BEM naming convention

---

## Phase 3: Admin Dashboard (Week 3)

### Task 3.1: Create Dashboard Controller
**Estimate:** 4 hours

**Files to create:**
- [ ] `libs/educational-feedback/src/admin-pages/feedback-dashboard/index.ts`
- [ ] `libs/educational-feedback/src/admin-pages/feedback-dashboard/index.test.ts`
- [ ] `libs/educational-feedback/src/admin-pages/feedback-dashboard/en.ts`
- [ ] `libs/educational-feedback/src/admin-pages/feedback-dashboard/cy.ts`

**Features:**
- Query parameters for filters (date range, publication)
- Calculate aggregate statistics
- Paginated feedback list
- Sort options

**Acceptance:**
- Authentication required (system admin)
- Filters work correctly
- Pagination functional
- Statistics calculated accurately
- Unit tests with mocked auth

---

### Task 3.2: Create Dashboard Template
**Estimate:** 5 hours

**Files to create:**
- [ ] `libs/educational-feedback/src/admin-pages/feedback-dashboard/index.njk`
- [ ] `libs/educational-feedback/src/admin-pages/feedback-dashboard/index.njk.test.ts`

**Sections:**
- Summary cards (total, avg satisfaction, avg trust, recent)
- Filter form (date range, publication dropdown)
- Data table with sorting
- Pagination controls
- Export button

**Components:**
- govukSummaryCard
- govukInput (date)
- govukSelect (publication filter)
- govukTable
- govukPagination
- govukButton

**Acceptance:**
- Responsive layout
- Accessible data tables
- Sort indicators
- Empty state handled
- Both languages work

---

### Task 3.3: Create CSV Export Controller
**Estimate:** 3 hours

**Files to create:**
- [ ] `libs/educational-feedback/src/admin-pages/feedback-export/index.ts`
- [ ] `libs/educational-feedback/src/admin-pages/feedback-export/index.test.ts`

**Features:**
- Respect dashboard filters
- Stream CSV response
- Proper headers and encoding
- Filename with date range

**CSV columns:**
- Submission Date, Publication ID, Publication Name, Satisfaction, Trust, Comment

**Acceptance:**
- Large datasets stream correctly
- CSV format valid
- Opens in Excel/Sheets
- Authentication required
- Unit tests with mocked data

---

### Task 3.4: Add Admin Navigation Link
**Estimate:** 30 minutes

**Files to modify:**
- [ ] `libs/admin-pages/src/views/partials/navigation.njk` (or equivalent)
- [ ] `libs/admin-pages/src/locales/en.ts`
- [ ] `libs/admin-pages/src/locales/cy.ts`

**Changes:**
- Add "Feedback" menu item
- Link to `/admin/feedback-dashboard`
- Both languages

**Acceptance:**
- Link appears for authenticated admins
- Navigation highlights active page
- Both languages display correctly

---

## Phase 4: Integration (Week 4)

### Task 4.1: Integrate with Publication Pages
**Estimate:** 2 hours

**Files to modify:**
- [ ] `libs/publication/src/pages/publication-detail/index.njk` (or equivalent)
- [ ] `libs/publication/src/pages/publication-detail/en.ts`
- [ ] `libs/publication/src/pages/publication-detail/cy.ts`

**Changes:**
- Add feedback section at bottom of page
- Include artefactId in link
- Translations for feedback prompt

**Acceptance:**
- Feedback button visible on all publication pages
- artefactId passed correctly
- Styling consistent with page
- Both languages work

---

### Task 4.2: Register Module in Web App
**Estimate:** 1 hour

**Files to modify:**
- [ ] `apps/web/src/app.ts`
- [ ] `apps/web/vite.config.ts` (if module has assets)

**Changes:**
- Import pageRoutes from @hmcts/educational-feedback/config
- Register routes with simple-router
- Register assets with Vite (if needed)

**Acceptance:**
- Routes accessible
- No route conflicts
- Assets compiled correctly
- No build errors

---

### Task 4.3: Register Admin Pages
**Estimate:** 1 hour

**Files to modify:**
- [ ] `apps/web/src/app.ts`

**Changes:**
- Import admin page routes
- Apply authentication middleware
- Mount at `/admin` prefix

**Acceptance:**
- Admin routes accessible
- Authentication required
- Non-admins redirected
- No route conflicts

---

### Task 4.4: Update Module Configuration
**Estimate:** 30 minutes

**Files to create/modify:**
- [ ] Ensure `libs/educational-feedback/src/config.ts` exports all paths
- [ ] Ensure `libs/educational-feedback/package.json` has correct exports

**Exports needed:**
- pageRoutes
- apiRoutes (if API routes added)
- assets

**Acceptance:**
- Config separates from business logic
- No circular dependencies
- Apps import config correctly

---

## Phase 5: Testing (Week 5)

### Task 5.1: E2E Tests - User Flow
**Estimate:** 4 hours

**Files to create:**
- [ ] `e2e-tests/tests/educational-feedback/user-feedback.spec.ts`

**Test scenarios:**
- Submit feedback with all fields
- Submit feedback without comment
- Validation errors display correctly
- Success page loads
- Welsh language works
- Form without JavaScript works

**Acceptance:**
- All user flows tested
- Both languages covered
- Tests pass consistently
- No flaky tests

---

### Task 5.2: E2E Tests - Admin Flow
**Estimate:** 3 hours

**Files to create:**
- [ ] `e2e-tests/tests/educational-feedback/admin-dashboard.spec.ts`

**Test scenarios:**
- Admin can view dashboard
- Filters work correctly
- Pagination works
- CSV export succeeds
- Non-admins cannot access
- Welsh language works

**Acceptance:**
- All admin flows tested
- Authentication tested
- CSV download verified
- Tests pass consistently

---

### Task 5.3: Accessibility Testing
**Estimate:** 3 hours

**Files to create:**
- [ ] `e2e-tests/tests/educational-feedback/accessibility.spec.ts`

**Tests:**
- Axe-core scans on all pages
- Keyboard navigation tests
- Screen reader structure tests
- Color contrast verification

**Pages to test:**
- Feedback form
- Success page
- Admin dashboard

**Acceptance:**
- No axe-core violations
- Full keyboard navigation works
- Proper heading structure
- ARIA labels correct

---

### Task 5.4: Load Testing Admin Dashboard
**Estimate:** 2 hours

**Tools:** Artillery or k6

**Scenarios:**
- Dashboard with 1000 feedback items
- Dashboard with filters applied
- CSV export of large dataset
- Concurrent admin users

**Acceptance:**
- Dashboard loads <3 seconds
- Export completes <10 seconds for 1000 items
- No memory leaks
- Database queries optimized

---

### Task 5.5: Security Testing
**Estimate:** 2 hours

**Test cases:**
- [ ] XSS prevention in comments
- [ ] SQL injection prevention
- [ ] CSRF token validation
- [ ] Rate limiting works
- [ ] Authentication enforced
- [ ] Input validation comprehensive

**Tools:**
- Manual testing
- OWASP ZAP (optional)
- Unit tests for validation

**Acceptance:**
- No XSS vulnerabilities
- No SQL injection possible
- CSRF tokens enforced
- Rate limiting prevents spam
- All inputs validated

---

## Phase 6: Documentation & Deployment (Week 6)

### Task 6.1: Write User Documentation
**Estimate:** 2 hours

**Files to create:**
- [ ] `docs/features/educational-feedback.md`

**Sections:**
- Feature overview
- User guide (how to submit feedback)
- Admin guide (how to use dashboard)
- Troubleshooting

**Acceptance:**
- Clear instructions
- Screenshots included
- Both user and admin covered
- Reviewed by team

---

### Task 6.2: Write Technical Documentation
**Estimate:** 2 hours

**Files to create:**
- [ ] `libs/educational-feedback/README.md`

**Sections:**
- Architecture overview
- Module structure
- API documentation
- Database schema
- Integration guide
- Testing guide

**Acceptance:**
- Complete technical reference
- Code examples included
- Integration steps clear
- Reviewed by team

---

### Task 6.3: Create ADR
**Estimate:** 1 hour

**Files to create:**
- [ ] `docs/architecture/decisions/XXX-educational-feedback.md`

**Sections:**
- Context
- Decision (module-based architecture)
- Consequences
- Alternatives considered

**Acceptance:**
- Follows ADR template
- Key decisions documented
- Rationale explained

---

### Task 6.4: Deploy to Demo Environment
**Estimate:** 2 hours

**Steps:**
1. Create PR with all changes
2. Code review
3. Merge to master
4. CI/CD pipeline runs
5. Deploy to demo
6. Smoke test

**Acceptance:**
- All tests pass in CI
- Deployment successful
- Smoke tests pass
- No errors in logs

---

### Task 6.5: User Acceptance Testing
**Estimate:** 4 hours (includes fixes)

**Participants:**
- Product owner
- UX designer
- QA tester

**Test scenarios:**
- Submit feedback as user
- View dashboard as admin
- Export CSV
- Test on mobile devices
- Test with screen reader

**Acceptance:**
- UAT sign-off received
- All feedback addressed
- No blockers identified

---

### Task 6.6: Deploy to Production
**Estimate:** 2 hours

**Steps:**
1. Final code review
2. Merge to production branch
3. Run migration in production
4. Deploy application
5. Monitor for errors
6. Verify functionality

**Acceptance:**
- Database migration successful
- Application deployed
- No errors in production logs
- Functionality verified
- Monitoring in place

---

## Summary

**Total Estimated Time:** 6 weeks (1 developer)

**Phase Breakdown:**
- Phase 1 (Module Setup): 7.5 hours
- Phase 2 (Feedback Form): 17 hours
- Phase 3 (Admin Dashboard): 12.5 hours
- Phase 4 (Integration): 4.5 hours
- Phase 5 (Testing): 14 hours
- Phase 6 (Documentation & Deployment): 13 hours

**Total:** ~68.5 hours (~1.7 weeks of actual development time)

**Buffer:** 4.3 weeks for:
- Code reviews
- Bug fixes
- Waiting for deployments
- Team collaboration
- Unexpected issues

**Key Milestones:**
- End of Week 2: Feedback form functional
- End of Week 3: Admin dashboard complete
- End of Week 4: Integration complete
- End of Week 5: Testing complete
- End of Week 6: Production deployment

**Dependencies:**
- Access to demo/test/prod environments
- Database migration approval
- Design review and sign-off
- Security review
- UAT availability

**Risks:**
- Schema changes require coordination
- Performance issues with large datasets (mitigated by pagination and indexes)
- Rate limiting may need tuning based on real usage
- CSV export may need background processing for very large datasets
