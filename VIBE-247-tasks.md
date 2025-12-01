# VIBE-247: Authentication on Classified Publications - Implementation Tasks

## Task Breakdown

### Phase 1: Database Schema and Migrations

#### Task 1.1: Create ListType Table
**Assignee**: Backend Developer
**Estimated Time**: 2 hours
**Priority**: High
**Dependencies**: None

**Description**:
Create a new ListType reference data table to store list type information including provenance.

**Implementation Steps**:
1. Add ListType model to `/home/runner/work/cath-service/cath-service/apps/postgres/prisma/schema.prisma`
2. Generate Prisma migration: `yarn db:migrate:dev`
3. Create seed script to populate table with existing list types from mockListTypes

**Acceptance Criteria**:
- [ ] ListType table created with all required columns
- [ ] Migration file generated successfully
- [ ] Seed script populates all existing list types
- [ ] Foreign key constraint from Artefact.listTypeId works correctly

**Files to Create/Modify**:
- `apps/postgres/prisma/schema.prisma`
- `apps/postgres/prisma/seeds/list-types.ts` (new)

---

#### Task 1.2: Add Performance Indexes
**Assignee**: Backend Developer
**Estimated Time**: 1 hour
**Priority**: High
**Dependencies**: Task 1.1

**Description**:
Add database indexes to optimize authorization queries.

**Implementation Steps**:
1. Add indexes to Artefact model in Prisma schema
2. Generate migration
3. Test query performance improvement

**Acceptance Criteria**:
- [ ] Index added on `sensitivity` column
- [ ] Index added on `provenance` column
- [ ] Composite index added for common query patterns
- [ ] Migration applied successfully
- [ ] Query performance verified (< 100ms for typical queries)

**Files to Modify**:
- `apps/postgres/prisma/schema.prisma`

---

#### Task 1.3: Migrate Mock List Types to Database
**Assignee**: Backend Developer
**Estimated Time**: 2 hours
**Priority**: Medium
**Dependencies**: Task 1.1

**Description**:
Replace mockListTypes with database-backed list type queries.

**Implementation Steps**:
1. Create list type service in `libs/list-types/common/src/list-type-service.ts`
2. Implement `getListTypeById()` and `getAllListTypes()` functions
3. Update all references to mockListTypes throughout codebase
4. Add unit tests

**Acceptance Criteria**:
- [ ] List type service implemented and exported
- [ ] All page handlers use database queries instead of mockListTypes
- [ ] Unit tests pass with 100% coverage
- [ ] No references to mockListTypes remain (except in tests)

**Files to Create**:
- `libs/list-types/common/src/list-type-service.ts`
- `libs/list-types/common/src/list-type-service.test.ts`

**Files to Modify**:
- `libs/list-types/common/src/index.ts` (export new service)
- `libs/public-pages/src/pages/summary-of-publications/index.ts`
- Any other files using mockListTypes

---

### Phase 2: Authorization Service Layer

#### Task 2.1: Create Authorization Service
**Assignee**: Backend Developer
**Estimated Time**: 4 hours
**Priority**: High
**Dependencies**: Task 1.1

**Description**:
Implement core authorization logic for publication access control.

**Implementation Steps**:
1. Create new module `libs/publication-access` with standard structure
2. Implement `canAccessPublication()` function
3. Implement `canAccessMetadata()` function
4. Add comprehensive unit tests
5. Register module in root tsconfig.json

**Acceptance Criteria**:
- [ ] Module structure follows HMCTS conventions
- [ ] Authorization logic implements all permission rules correctly
- [ ] Unit tests cover all user/sensitivity combinations
- [ ] Test coverage > 95%
- [ ] All edge cases handled (null user, unknown sensitivity, etc.)

**Files to Create**:
- `libs/publication-access/package.json`
- `libs/publication-access/tsconfig.json`
- `libs/publication-access/src/index.ts`
- `libs/publication-access/src/config.ts`
- `libs/publication-access/src/publication-access/service.ts`
- `libs/publication-access/src/publication-access/service.test.ts`

**Files to Modify**:
- `tsconfig.json` (add module to paths)

**Test Scenarios**:
- PUBLIC accessible to everyone (authenticated and unauthenticated)
- PRIVATE denied to unauthenticated users
- PRIVATE accessible to verified users (B2C, CFT_IDAM, CRIME_IDAM)
- PRIVATE accessible to SYSTEM_ADMIN
- PRIVATE denied to INTERNAL_ADMIN_LOCAL and INTERNAL_ADMIN_CTSC
- CLASSIFIED accessible to SYSTEM_ADMIN
- CLASSIFIED accessible to verified users with matching provenance
- CLASSIFIED denied to verified users with non-matching provenance
- CLASSIFIED denied to internal admins
- Metadata accessible to internal admins for PRIVATE/CLASSIFIED
- Unknown sensitivity level defaults to deny

---

#### Task 2.2: Update Publication Query Service
**Assignee**: Backend Developer
**Estimated Time**: 3 hours
**Priority**: High
**Dependencies**: Task 2.1

**Description**:
Add authorization-aware query functions to publication repository.

**Implementation Steps**:
1. Add `getAccessibleArtefacts()` function to publication queries
2. Implement `buildAccessWhereClause()` helper function
3. Update existing query functions if needed
4. Add integration tests

**Acceptance Criteria**:
- [ ] Query functions filter by sensitivity based on user permissions
- [ ] Provenance matching works for CLASSIFIED publications
- [ ] Query performance meets requirements (< 100ms)
- [ ] Integration tests verify correct filtering
- [ ] Existing functionality not broken

**Files to Modify**:
- `libs/publication/src/repository/queries.ts`
- `libs/publication/src/repository/queries.test.ts`

---

### Phase 3: Middleware Implementation

#### Task 3.1: Create Publication Access Middleware
**Assignee**: Backend Developer
**Estimated Time**: 3 hours
**Priority**: High
**Dependencies**: Task 2.1

**Description**:
Create Express middleware to enforce publication access control.

**Implementation Steps**:
1. Create `requirePublicationAccess()` middleware in auth library
2. Support metadata-only access mode
3. Add error handling and redirects
4. Add middleware tests

**Acceptance Criteria**:
- [ ] Middleware enforces all authorization rules
- [ ] Unauthenticated users redirected to sign-in
- [ ] Authenticated but unauthorized users see 403 error
- [ ] returnTo URL saved for post-login redirect
- [ ] Middleware testable in isolation
- [ ] Error messages available in English and Welsh

**Files to Create**:
- `libs/auth/src/middleware/publication-access.ts`
- `libs/auth/src/middleware/publication-access.test.ts`

**Files to Modify**:
- `libs/auth/src/index.ts` (export new middleware)

---

### Phase 4: Error Pages and User Experience

#### Task 4.1: Create 403 Publication Access Error Page
**Assignee**: Frontend Developer
**Estimated Time**: 2 hours
**Priority**: Medium
**Dependencies**: None

**Description**:
Create accessible error page for unauthorized publication access.

**Implementation Steps**:
1. Create Nunjucks template for 403 error
2. Add English and Welsh content
3. Test accessibility with axe-core
4. Test with screen readers

**Acceptance Criteria**:
- [ ] Error page follows GOV.UK Design System
- [ ] Content available in English and Welsh
- [ ] WCAG 2.2 AA compliant (no axe violations)
- [ ] Screen reader announces title and message
- [ ] Helpful guidance provided to users
- [ ] Link back to homepage included

**Files to Create**:
- `libs/web-core/src/views/errors/403-publication-access.njk`

---

#### Task 4.2: Update Sign-In Flow for Return URL
**Assignee**: Full-Stack Developer
**Estimated Time**: 1 hour
**Priority**: Medium
**Dependencies**: Task 3.1

**Description**:
Ensure returnTo functionality works correctly for publication access.

**Implementation Steps**:
1. Verify session returnTo is set correctly
2. Test redirect after successful login
3. Test with different authentication providers (SSO, CFT IDAM, B2C)

**Acceptance Criteria**:
- [ ] returnTo URL saved when accessing protected publication
- [ ] User redirected to original publication after sign-in
- [ ] Works with all authentication providers
- [ ] Query parameters preserved in returnTo URL

**Files to Verify/Modify**:
- `libs/auth/src/middleware/publication-access.ts`
- `libs/auth/src/pages/sso-callback/index.ts`
- `libs/auth/src/pages/cft-callback/index.ts`

---

### Phase 5: Page Handler Updates

#### Task 5.1: Update Civil and Family Daily Cause List Handler
**Assignee**: Full-Stack Developer
**Estimated Time**: 2 hours
**Priority**: High
**Dependencies**: Task 2.1, Task 3.1

**Description**:
Add authorization checks to Civil and Family Daily Cause List page handler.

**Implementation Steps**:
1. Import authorization service
2. Add access check before rendering publication
3. Handle unauthorized access with appropriate error
4. Update tests to include authorization scenarios

**Acceptance Criteria**:
- [ ] Authorization check performed before rendering
- [ ] Unauthorized users see appropriate error
- [ ] Unauthenticated users redirected to sign-in
- [ ] Tests cover all authorization scenarios
- [ ] Existing functionality preserved

**Files to Modify**:
- `libs/list-types/civil-and-family-daily-cause-list/src/pages/index.ts`
- `libs/list-types/civil-and-family-daily-cause-list/src/pages/index.test.ts`

---

#### Task 5.2: Update Summary of Publications Handler
**Assignee**: Full-Stack Developer
**Estimated Time**: 3 hours
**Priority**: High
**Dependencies**: Task 2.2

**Description**:
Update summary page to only show accessible publications based on user permissions.

**Implementation Steps**:
1. Replace direct database query with `getAccessibleArtefacts()`
2. Pass user information to query function
3. Update tests to verify filtering
4. Test with different user types

**Acceptance Criteria**:
- [ ] Only accessible publications shown in summary
- [ ] Public users see only PUBLIC publications
- [ ] Verified users see appropriate publications based on provenance
- [ ] System admins see all publications
- [ ] Internal admins see only PUBLIC publications
- [ ] Tests verify correct filtering for all user types

**Files to Modify**:
- `libs/public-pages/src/pages/summary-of-publications/index.ts`
- `libs/public-pages/src/pages/summary-of-publications/index.test.ts`

---

#### Task 5.3: Update Generic Publication Handler
**Assignee**: Full-Stack Developer
**Estimated Time**: 1 hour
**Priority**: Low
**Dependencies**: Task 2.1

**Description**:
Add authorization to the fallback publication handler.

**Implementation Steps**:
1. Add authorization check to generic publication handler
2. Handle unauthorized access
3. Update tests

**Acceptance Criteria**:
- [ ] Authorization check performed
- [ ] Unauthorized access handled correctly
- [ ] Tests updated

**Files to Modify**:
- `libs/public-pages/src/pages/publication/[id].ts`
- `libs/public-pages/src/pages/publication/[id].test.ts`

---

### Phase 6: Admin Features (Metadata Access)

#### Task 6.1: Create Admin Publication List View
**Assignee**: Full-Stack Developer
**Estimated Time**: 4 hours
**Priority**: Medium
**Dependencies**: Task 2.1

**Description**:
Create admin page to view publication metadata without content access.

**Implementation Steps**:
1. Create new page in admin-pages module
2. Query all publications with metadata-only access
3. Display metadata table (no content links for PRIVATE/CLASSIFIED)
4. Add filtering and search capabilities
5. Add English and Welsh content

**Acceptance Criteria**:
- [ ] Admin page shows all publication metadata
- [ ] PRIVATE/CLASSIFIED publications show metadata only (no view link)
- [ ] PUBLIC publications show view link
- [ ] Table includes all required metadata fields
- [ ] Page accessible to internal admins
- [ ] GOV.UK Design System compliant
- [ ] WCAG 2.2 AA compliant

**Files to Create**:
- `libs/admin-pages/src/pages/publications-list/index.ts`
- `libs/admin-pages/src/pages/publications-list/index.test.ts`
- `libs/admin-pages/src/pages/publications-list/index.njk`
- `libs/admin-pages/src/pages/publications-list/en.ts`
- `libs/admin-pages/src/pages/publications-list/cy.ts`

---

### Phase 7: Testing

#### Task 7.1: Unit Tests for Authorization Service
**Assignee**: Backend Developer
**Estimated Time**: 2 hours
**Priority**: High
**Dependencies**: Task 2.1

**Description**:
Comprehensive unit tests for authorization service (covered in Task 2.1).

**Acceptance Criteria**:
- [ ] All authorization scenarios tested
- [ ] Edge cases covered
- [ ] Test coverage > 95%
- [ ] Tests are maintainable and well-documented

---

#### Task 7.2: Integration Tests for Query Service
**Assignee**: Backend Developer
**Estimated Time**: 2 hours
**Priority**: High
**Dependencies**: Task 2.2

**Description**:
Integration tests verifying database queries with authorization.

**Acceptance Criteria**:
- [ ] Tests use real database (with test data)
- [ ] All user permission scenarios tested
- [ ] Query performance verified
- [ ] Tests clean up after themselves

**Files to Create/Modify**:
- `libs/publication/src/repository/queries.test.ts`

---

#### Task 7.3: E2E Tests for Publication Access
**Assignee**: QA Engineer / Full-Stack Developer
**Estimated Time**: 6 hours
**Priority**: High
**Dependencies**: All Phase 5 tasks

**Description**:
End-to-end Playwright tests for complete user journeys.

**Implementation Steps**:
1. Set up test fixtures for different user types
2. Create test publications with different sensitivity levels
3. Test all access scenarios
4. Test error pages and redirects
5. Test Welsh language content

**Test Scenarios**:
- [ ] Public user views PUBLIC publication successfully
- [ ] Public user redirected when accessing PRIVATE publication
- [ ] B2C verified user views PRIVATE publication
- [ ] B2C verified user views CLASSIFIED publication with matching provenance
- [ ] B2C verified user denied CLASSIFIED with non-matching provenance
- [ ] CFT_IDAM user views CFT_IDAM CLASSIFIED publication
- [ ] System admin views all publication types
- [ ] Internal admin views metadata but cannot access PRIVATE content
- [ ] Internal admin views metadata but cannot access CLASSIFIED content
- [ ] Error messages display correctly in English
- [ ] Error messages display correctly in Welsh
- [ ] returnTo URL works after sign-in

**Files to Create**:
- `e2e-tests/publication-access/public-user.spec.ts`
- `e2e-tests/publication-access/verified-user.spec.ts`
- `e2e-tests/publication-access/system-admin.spec.ts`
- `e2e-tests/publication-access/internal-admin.spec.ts`
- `e2e-tests/fixtures/test-publications.ts`
- `e2e-tests/fixtures/test-users.ts`

---

#### Task 7.4: Accessibility Testing
**Assignee**: QA Engineer / Frontend Developer
**Estimated Time**: 2 hours
**Priority**: High
**Dependencies**: Task 4.1

**Description**:
Verify WCAG 2.2 AA compliance for all new pages and error states.

**Implementation Steps**:
1. Run axe-core tests on 403 error page
2. Test with screen readers (NVDA, JAWS, VoiceOver)
3. Test keyboard navigation
4. Verify color contrast
5. Test with Welsh content

**Acceptance Criteria**:
- [ ] Zero axe-core violations
- [ ] Screen reader announces all content correctly
- [ ] Full keyboard navigation support
- [ ] Color contrast meets WCAG AA standards
- [ ] Welsh content accessible

**Files to Create/Modify**:
- `e2e-tests/accessibility/publication-errors.spec.ts`

---

### Phase 8: Documentation and Security Review

#### Task 8.1: Update API Documentation
**Assignee**: Technical Writer / Developer
**Estimated Time**: 2 hours
**Priority**: Medium
**Dependencies**: All implementation tasks

**Description**:
Document authorization requirements in API documentation.

**Implementation Steps**:
1. Document authorization rules
2. Document permission matrix
3. Add examples for each user type
4. Document error responses

**Acceptance Criteria**:
- [ ] Permission matrix documented
- [ ] Authorization rules clearly explained
- [ ] Examples provided for each scenario
- [ ] Error responses documented

**Files to Create/Modify**:
- `docs/api/authorization.md` (new)
- `docs/api/publications.md` (update)

---

#### Task 8.2: Security Review
**Assignee**: Security Engineer / Senior Developer
**Estimated Time**: 4 hours
**Priority**: Critical
**Dependencies**: All implementation tasks

**Description**:
Comprehensive security review of authorization implementation.

**Review Checklist**:
- [ ] Authorization checks occur server-side only
- [ ] Default-deny approach used throughout
- [ ] No SQL injection vulnerabilities
- [ ] No authorization bypass possibilities
- [ ] Proper error handling (no information leakage)
- [ ] Logging includes security events
- [ ] Session management secure
- [ ] No sensitive data in client-side code
- [ ] HTTPS enforced for all routes
- [ ] CSRF protection in place

**Deliverables**:
- Security review report with findings
- Any required fixes implemented
- Sign-off from security team

---

#### Task 8.3: Performance Testing
**Assignee**: DevOps / Backend Developer
**Estimated Time**: 3 hours
**Priority**: Medium
**Dependencies**: All implementation tasks

**Description**:
Verify performance meets requirements under load.

**Implementation Steps**:
1. Create load test scenarios
2. Test authorization check performance
3. Test database query performance
4. Identify and fix bottlenecks
5. Document performance metrics

**Acceptance Criteria**:
- [ ] Authorization checks complete in < 50ms (p95)
- [ ] Database queries complete in < 100ms (p95)
- [ ] No performance degradation under load (1000 concurrent users)
- [ ] Cache hit rate > 80% for list type lookups
- [ ] No memory leaks identified

**Tools**:
- k6 for load testing
- Application Insights for monitoring

---

### Phase 9: Deployment and Monitoring

#### Task 9.1: Deploy to Development Environment
**Assignee**: DevOps Engineer
**Estimated Time**: 2 hours
**Priority**: High
**Dependencies**: All implementation tasks

**Description**:
Deploy changes to development environment and verify.

**Implementation Steps**:
1. Run database migrations
2. Deploy application code
3. Seed list type data
4. Run smoke tests
5. Verify all functionality

**Acceptance Criteria**:
- [ ] Migrations applied successfully
- [ ] Application starts without errors
- [ ] All smoke tests pass
- [ ] Authorization working as expected
- [ ] No errors in logs

---

#### Task 9.2: Deploy to Staging Environment
**Assignee**: DevOps Engineer
**Estimated Time**: 2 hours
**Priority**: High
**Dependencies**: Task 9.1

**Description**:
Deploy to staging and perform full regression testing.

**Implementation Steps**:
1. Run database migrations
2. Deploy application code
3. Run full E2E test suite
4. Perform manual testing
5. Security review in staging

**Acceptance Criteria**:
- [ ] All E2E tests pass
- [ ] Manual testing successful
- [ ] Security review completed
- [ ] Performance metrics meet requirements
- [ ] No critical issues identified

---

#### Task 9.3: Production Deployment
**Assignee**: DevOps Engineer
**Estimated Time**: 3 hours
**Priority**: Critical
**Dependencies**: Task 9.2, Task 8.2 (Security Review)

**Description**:
Deploy to production with monitoring and rollback plan.

**Implementation Steps**:
1. Create deployment checklist
2. Prepare rollback plan
3. Run database migrations during maintenance window
4. Deploy application code
5. Monitor for errors
6. Verify functionality
7. Enable monitoring alerts

**Acceptance Criteria**:
- [ ] Zero-downtime deployment (except migration window)
- [ ] All health checks passing
- [ ] No errors in logs
- [ ] Monitoring dashboards showing expected metrics
- [ ] Rollback plan tested and ready

**Rollback Plan**:
1. Revert application code to previous version
2. Keep database changes (migrations are backward compatible)
3. Verify application starts successfully
4. Monitor for 30 minutes

---

#### Task 9.4: Post-Deployment Monitoring
**Assignee**: DevOps Engineer / Product Owner
**Estimated Time**: Ongoing (first 48 hours critical)
**Priority**: Critical
**Dependencies**: Task 9.3

**Description**:
Monitor production system after deployment.

**Monitoring Checklist**:
- [ ] Monitor 403 error rates
- [ ] Monitor 401 error rates (unexpected redirects)
- [ ] Monitor authorization check performance
- [ ] Monitor database query performance
- [ ] Monitor user feedback and support tickets
- [ ] Check for security incidents
- [ ] Verify no increase in 500 errors

**Alert Thresholds**:
- 403 error rate > 10% of publication requests
- Authorization check time > 100ms (p95)
- Database query time > 200ms (p95)
- Any SQL errors related to ListType table

---

## Task Summary

### By Phase

**Phase 1: Database (3 tasks)** - 5 hours
**Phase 2: Authorization Service (2 tasks)** - 7 hours
**Phase 3: Middleware (1 task)** - 3 hours
**Phase 4: Error Pages (2 tasks)** - 3 hours
**Phase 5: Page Handlers (3 tasks)** - 6 hours
**Phase 6: Admin Features (1 task)** - 4 hours
**Phase 7: Testing (4 tasks)** - 12 hours
**Phase 8: Documentation (3 tasks)** - 9 hours
**Phase 9: Deployment (4 tasks)** - 7 hours + ongoing monitoring

**Total Estimated Time**: ~56 hours (approximately 7-8 working days)

### By Priority

**Critical**: 2 tasks
**High**: 13 tasks
**Medium**: 7 tasks
**Low**: 1 task

### Dependencies Graph

```
Task 1.1 (ListType Table)
  ├─> Task 1.2 (Indexes)
  ├─> Task 1.3 (Migrate Mock Data)
  └─> Task 2.1 (Auth Service)
        ├─> Task 2.2 (Query Service)
        ├─> Task 3.1 (Middleware)
        │     ├─> Task 5.1 (Update Handler 1)
        │     ├─> Task 5.2 (Update Handler 2)
        │     ├─> Task 5.3 (Update Handler 3)
        │     └─> Task 7.3 (E2E Tests)
        ├─> Task 6.1 (Admin Features)
        └─> Task 7.1 (Unit Tests)

Task 4.1 (Error Pages)
  └─> Task 7.4 (A11y Tests)

All Implementation Tasks
  └─> Task 8.1 (Documentation)
  └─> Task 8.2 (Security Review)
  └─> Task 8.3 (Performance Testing)
      └─> Task 9.1 (Deploy Dev)
          └─> Task 9.2 (Deploy Staging)
              └─> Task 9.3 (Deploy Production)
                  └─> Task 9.4 (Monitoring)
```

## Risk Mitigation

### High-Risk Tasks

1. **Task 2.1 (Authorization Service)**: Core logic - must be correct
   - **Mitigation**: Extensive unit tests, code review by 2+ developers, security review

2. **Task 9.3 (Production Deployment)**: Risk of breaking existing functionality
   - **Mitigation**: Comprehensive E2E tests, staging validation, rollback plan

3. **Task 1.1 (Database Migration)**: Risk of data inconsistency
   - **Mitigation**: Backup before migration, test in dev/staging first, reversible migration

### Medium-Risk Tasks

1. **Task 5.2 (Summary Handler)**: High-traffic page
   - **Mitigation**: Performance testing, database query optimization, caching

2. **Task 7.3 (E2E Tests)**: Complex test scenarios
   - **Mitigation**: Break into smaller tests, good test data fixtures, clear documentation

## Success Criteria

- All tasks completed and acceptance criteria met
- Zero critical or high severity bugs in production
- Performance metrics meet requirements (< 100ms authorization checks)
- Security review passed with no unresolved issues
- WCAG 2.2 AA compliance verified
- 100% of E2E tests passing
- No increase in production errors after deployment
- Positive feedback from stakeholders on authorization controls
