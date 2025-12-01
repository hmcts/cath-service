# VIBE-229 Implementation Tasks

This document breaks down the work into specific, actionable tasks for implementing the media account rejection flow.

---

## Phase 1: Module Setup & Foundation

### Task 1.1: Create Module Structure
**Estimated Time**: 1 hour

**Steps**:
1. Create directory structure:
   ```bash
   mkdir -p libs/media-admin/src/{pages,routes,assets/{css,js},media-application}
   mkdir -p libs/media-admin/prisma
   ```

2. Create `libs/media-admin/package.json`:
   - Set module name to `@hmcts/media-admin`
   - Configure exports for main and config
   - Add build scripts (build, build:nunjucks, build:assets)
   - Add peer dependencies (express)
   - Add dependencies (@hmcts/auth, @hmcts/postgres, @hmcts/web-core, notifications-node-client)

3. Create `libs/media-admin/tsconfig.json`:
   - Extend root tsconfig
   - Set outDir to ./dist
   - Set rootDir to ./src
   - Exclude assets, tests, dist, node_modules

4. Create `libs/media-admin/src/config.ts`:
   - Export pageRoutes path
   - Export assets path
   - Export prismaSchemas path

5. Create `libs/media-admin/src/index.ts`:
   - Empty file for now (business logic exports will be added later)

**Acceptance Criteria**:
- [ ] Module structure created
- [ ] package.json configured correctly
- [ ] TypeScript compiles without errors
- [ ] Config exports defined

---

### Task 1.2: Define Database Schema
**Estimated Time**: 2 hours

**Steps**:
1. Create `libs/media-admin/prisma/schema.prisma`:
   - Define generator (output to node_modules/.prisma/client)
   - Define datasource (PostgreSQL)
   - Define MediaApplication model with all fields
   - Define ApplicationStatus enum
   - Add indexes on status and createdAt

2. Update `apps/postgres/src/schema-discovery.ts`:
   - Import media-admin schema path
   - Add to getPrismaSchemas array

3. Generate Prisma client:
   ```bash
   yarn db:generate
   ```

4. Create migration:
   ```bash
   cd apps/postgres
   yarn migrate:dev --name add_media_application_table
   ```

5. Verify migration:
   ```bash
   yarn db:studio
   ```

**Acceptance Criteria**:
- [ ] Schema defined with correct fields and types
- [ ] Indexes created on status and createdAt
- [ ] Migration generated and applied
- [ ] Prisma client generated successfully
- [ ] Can view table in Prisma Studio

---

### Task 1.3: Register Module in Applications
**Estimated Time**: 1 hour

**Steps**:
1. Update `tsconfig.json` (root):
   - Add `@hmcts/media-admin` to paths
   - Add `@hmcts/media-admin/config` to paths

2. Update `apps/web/src/app.ts`:
   - Import pageRoutes and moduleRoot from @hmcts/media-admin/config
   - Add moduleRoot to modulePaths array
   - Register page routes with createSimpleRouter

3. Verify registration:
   ```bash
   yarn dev
   ```

**Acceptance Criteria**:
- [ ] TypeScript resolves imports without errors
- [ ] Application starts without errors
- [ ] Module paths registered correctly

---

### Task 1.4: Implement Database Query Layer
**Estimated Time**: 2 hours

**Steps**:
1. Create `libs/media-admin/src/media-application/model.ts`:
   - Define TypeScript types for application data
   - Define rejection reason constants
   - Define status enum

2. Create `libs/media-admin/src/media-application/queries.ts`:
   - Implement getPendingApplicationsCount()
   - Implement getPendingApplications()
   - Implement getApplicationById()
   - Implement rejectApplication()

3. Create `libs/media-admin/src/media-application/queries.test.ts`:
   - Mock Prisma client
   - Test each query function
   - Test error scenarios

**Acceptance Criteria**:
- [ ] All query functions implemented
- [ ] Query functions use proper select and indexes
- [ ] Unit tests written and passing
- [ ] Test coverage > 80%

---

### Task 1.5: Implement File Storage Layer
**Estimated Time**: 3 hours

**Steps**:
1. Create `libs/media-admin/src/media-application/file-storage.ts`:
   - Implement saveProofOfId()
   - Implement getProofOfId()
   - Implement deleteProofOfId()
   - Implement cleanupOldFiles()
   - Add file path sanitization
   - Add MIME type detection

2. Create `libs/media-admin/src/media-application/file-storage.test.ts`:
   - Mock fs promises
   - Test save operation
   - Test get operation
   - Test delete operation
   - Test cleanup operation
   - Test path sanitization (prevent directory traversal)

3. Create temp directory structure:
   ```bash
   mkdir -p /tmp/media-applications
   ```

**Acceptance Criteria**:
- [ ] File storage functions implemented
- [ ] Directory traversal prevented
- [ ] File names sanitized
- [ ] MIME types detected correctly
- [ ] Unit tests written and passing
- [ ] Test coverage > 80%

---

### Task 1.6: Implement Email Service
**Estimated Time**: 3 hours

**Steps**:
1. Install Gov.Notify client:
   ```bash
   yarn workspace @hmcts/media-admin add notifications-node-client
   ```

2. Create `libs/media-admin/src/media-application/email-service.ts`:
   - Implement sendRejectionEmail()
   - Implement formatRejectionReasons()
   - Add support for English and Welsh
   - Define EmailSendError class
   - Add retry logic (optional)

3. Create `libs/media-admin/src/media-application/email-service.test.ts`:
   - Mock NotifyClient
   - Test email send with valid data
   - Test reason formatting (English and Welsh)
   - Test error handling
   - Test with all rejection reason combinations

4. Set up Gov.Notify template:
   - Create template in Gov.Notify dashboard
   - Add template variables
   - Test template with sample data
   - Document template ID

**Acceptance Criteria**:
- [ ] Email service implemented
- [ ] Supports English and Welsh
- [ ] Rejection reasons formatted correctly
- [ ] Error handling implemented
- [ ] Unit tests written and passing
- [ ] Gov.Notify template created and tested

---

### Task 1.7: Implement Validation Layer
**Estimated Time**: 2 hours

**Steps**:
1. Create `libs/media-admin/src/media-application/validation.ts`:
   - Implement validateRejectionReasons()
   - Implement validateConfirmation()
   - Define ValidationError interface

2. Create `libs/media-admin/src/media-application/validation.test.ts`:
   - Test rejection reasons validation (empty, valid, other without text)
   - Test confirmation validation
   - Test text length limits
   - Test error message generation

**Acceptance Criteria**:
- [ ] Validation functions implemented
- [ ] All validation rules covered
- [ ] Error messages match GOV.UK patterns
- [ ] Unit tests written and passing
- [ ] Test coverage 100%

---

### Task 1.8: Implement Business Logic Layer
**Estimated Time**: 3 hours

**Steps**:
1. Create `libs/media-admin/src/media-application/service.ts`:
   - Implement processRejection()
   - Integrate queries, file storage, and email service
   - Handle errors gracefully
   - Define custom error classes

2. Create `libs/media-admin/src/media-application/service.test.ts`:
   - Mock all dependencies (queries, file storage, email)
   - Test successful rejection flow
   - Test application not found error
   - Test application already processed error
   - Test email send failure (should not fail rejection)
   - Test file deletion failure (should log but not fail)

3. Update `libs/media-admin/src/index.ts`:
   - Export service functions
   - Export error classes
   - Export query functions needed by admin dashboard

**Acceptance Criteria**:
- [ ] Service functions implemented
- [ ] Integrates all layers correctly
- [ ] Error handling robust
- [ ] Email failure doesn't block rejection
- [ ] Unit tests written and passing
- [ ] Test coverage > 80%

---

## Phase 2: Page Implementation

### Task 2.1: Media Requests List Page
**Estimated Time**: 4 hours

**Steps**:
1. Create page controller `libs/media-admin/src/pages/media-requests/index.ts`:
   - Implement GET handler
   - Query pending applications
   - Format dates for display
   - Handle empty state
   - Add role-based access control

2. Create template `libs/media-admin/src/pages/media-requests/index.njk`:
   - Extend base template
   - Add page title and heading
   - Render table with pending applications
   - Add "View application" links
   - Handle empty state (no pending applications)
   - Add back link to admin dashboard

3. Create translations `libs/media-admin/src/pages/media-requests/en.ts`:
   - Page title
   - Headings
   - Table headers
   - Empty state message
   - Links

4. Create translations `libs/media-admin/src/pages/media-requests/cy.ts`:
   - Welsh translations for all content

5. Create tests `libs/media-admin/src/pages/media-requests/index.test.ts`:
   - Test GET handler with applications
   - Test GET handler with no applications
   - Test date formatting
   - Test access control

6. Create Nunjucks tests `libs/media-admin/src/pages/media-requests/index.njk.test.ts`:
   - Test template renders correctly
   - Test table structure
   - Test empty state
   - Test Welsh content

**Acceptance Criteria**:
- [ ] Page displays list of pending applications
- [ ] Table shows all required columns
- [ ] Dates formatted correctly (e.g., "16 Jan 2025")
- [ ] Empty state handled
- [ ] Access control enforced
- [ ] Welsh translations complete
- [ ] Unit tests passing
- [ ] Template tests passing

---

### Task 2.2: Application Details Page
**Estimated Time**: 4 hours

**Steps**:
1. Create page controller `libs/media-admin/src/pages/media-requests/[id].ts`:
   - Implement GET handler
   - Extract ID from params
   - Query application by ID
   - Handle not found (404)
   - Handle already processed
   - Format date for display
   - Add role-based access control

2. Create template `libs/media-admin/src/pages/media-requests/[id].njk`:
   - Extend base template
   - Add page title with applicant name
   - Render summary list with application details
   - Add proof of ID download link
   - Add "Reject application" button (red/warning style)
   - Add "Accept application" button (disabled/coming soon)
   - Add back link to media requests list

3. Create translations `libs/media-admin/src/pages/media-requests/[id]/en.ts`:
   - Page title template
   - Summary list labels
   - Button text
   - Error messages

4. Create translations `libs/media-admin/src/pages/media-requests/[id]/cy.ts`:
   - Welsh translations

5. Create tests:
   - Test GET handler with valid application
   - Test 404 error
   - Test already processed error
   - Test date formatting

**Acceptance Criteria**:
- [ ] Page displays full application details
- [ ] Summary list shows all required fields
- [ ] Proof of ID link present if file exists
- [ ] Reject button links to rejection flow
- [ ] Error handling for not found and already processed
- [ ] Access control enforced
- [ ] Welsh translations complete
- [ ] Unit tests passing

---

### Task 2.3: Select Rejection Reasons Page
**Estimated Time**: 4 hours

**Steps**:
1. Create page controller `libs/media-admin/src/pages/media-requests/[id]/reject.ts`:
   - Implement GET handler (load application, show form)
   - Implement POST handler (validate, store in session, redirect)
   - Add validation using validation layer
   - Store rejection reasons in session
   - Handle application not found
   - Add role-based access control

2. Create template `libs/media-admin/src/pages/media-requests/[id]/reject.njk`:
   - Extend base template
   - Add error summary component
   - Add checkbox group with rejection reasons
   - Add conditional reveal for "Other" text area
   - Add character count for text area
   - Add continue button
   - Add back link to application details

3. Create translations `libs/media-admin/src/pages/media-requests/[id]/reject/en.ts`:
   - Page title
   - Checkbox labels
   - Text area label and hint
   - Error messages
   - Button text

4. Create translations `libs/media-admin/src/pages/media-requests/[id]/reject/cy.ts`:
   - Welsh translations

5. Create tests:
   - Test GET handler
   - Test POST validation (no reasons, other without text)
   - Test POST success (stores in session)
   - Test session save

**Acceptance Criteria**:
- [ ] Form displays all rejection reason checkboxes
- [ ] "Other" reveals text area when selected
- [ ] Character count shows remaining characters
- [ ] Validation errors displayed correctly
- [ ] Errors linked from error summary
- [ ] Data stored in session on success
- [ ] Access control enforced
- [ ] Welsh translations complete
- [ ] Unit tests passing

---

### Task 2.4: Confirm Rejection Page
**Estimated Time**: 4 hours

**Steps**:
1. Create page controller `libs/media-admin/src/pages/media-requests/[id]/reject/confirm.ts`:
   - Implement GET handler (load from session, show summary)
   - Implement POST handler (validate confirmation, process rejection)
   - Retrieve rejection reasons from session
   - Validate session data exists
   - Call service layer to process rejection
   - Handle concurrent processing error
   - Clear session data on success
   - Add role-based access control

2. Create template `libs/media-admin/src/pages/media-requests/[id]/reject/confirm.njk`:
   - Extend base template
   - Add error summary component
   - Add warning text ("This action cannot be undone")
   - Add summary list with applicant details and reasons
   - Add "Change" links back to previous steps
   - Add radio buttons for confirmation
   - Add continue button
   - Add back link to rejection reasons page

3. Create translations:
   - Page title
   - Warning text
   - Summary list labels
   - Radio button labels
   - Error messages

4. Create Welsh translations

5. Create tests:
   - Test GET handler (valid session)
   - Test GET handler (missing session, redirects)
   - Test POST validation (no confirmation)
   - Test POST with "yes" (processes rejection)
   - Test POST with "no" (redirects back)
   - Test concurrent processing error

**Acceptance Criteria**:
- [ ] Page shows summary of application and reasons
- [ ] Change links work correctly
- [ ] Warning text visible
- [ ] Radio buttons for confirmation
- [ ] Validation errors displayed
- [ ] Rejection processed on "yes"
- [ ] Redirects to details on "no"
- [ ] Session cleared after processing
- [ ] Concurrent processing handled
- [ ] Access control enforced
- [ ] Welsh translations complete
- [ ] Unit tests passing

---

### Task 2.5: Rejection Complete Page
**Estimated Time**: 3 hours

**Steps**:
1. Create page controller `libs/media-admin/src/pages/media-requests/[id]/reject/complete.ts`:
   - Implement GET handler
   - Display success banner
   - Show applicant email
   - Show next steps
   - Add links to media requests list and dashboard

2. Create template `libs/media-admin/src/pages/media-requests/[id]/reject/complete.njk`:
   - Extend base template
   - Add success panel (green confirmation banner)
   - Add body text with applicant email
   - Add "What happens next" section
   - Add links to pending applications and dashboard
   - Add auto-redirect script (progressive enhancement)

3. Create auto-redirect JavaScript `libs/media-admin/src/assets/js/auto-redirect.ts`:
   - Wait 3 seconds
   - Redirect to media requests list
   - Announce to screen readers

4. Create translations:
   - Success banner text
   - Body text template
   - Next steps heading and text
   - Link text

5. Create Welsh translations

6. Create tests:
   - Test GET handler
   - Test success message rendered
   - Test links present

**Acceptance Criteria**:
- [ ] Success banner displayed
- [ ] Applicant email shown in message
- [ ] Next steps text clear
- [ ] Links to list and dashboard work
- [ ] Auto-redirect works (with JS)
- [ ] Page works without JS (manual links)
- [ ] Screen reader announcement for redirect
- [ ] Access control enforced
- [ ] Welsh translations complete
- [ ] Unit tests passing

---

### Task 2.6: File Download Endpoint
**Estimated Time**: 3 hours

**Steps**:
1. Create API route `libs/media-admin/src/routes/download-proof.ts`:
   - Extract application ID from params
   - Query application to get file details
   - Validate application exists and user has permission
   - Get file from storage
   - Stream file to response
   - Set proper Content-Type and Content-Disposition headers
   - Set security headers (X-Content-Type-Options)
   - Add role-based access control

2. Create tests:
   - Test successful download
   - Test 404 if application not found
   - Test 404 if file not found
   - Test 403 if unauthorized
   - Test proper headers set

**Acceptance Criteria**:
- [ ] Endpoint returns file correctly
- [ ] Proper headers set (content-type, disposition)
- [ ] Security headers set
- [ ] 404 for missing application or file
- [ ] Access control enforced
- [ ] Unit tests passing

---

## Phase 3: Integration & Updates

### Task 3.1: Update Admin Dashboard
**Estimated Time**: 3 hours

**Steps**:
1. Update `libs/admin-pages/src/pages/admin-dashboard/index.ts`:
   - Import getPendingApplicationsCount from @hmcts/media-admin
   - Query pending count in GET handler
   - Pass count to template

2. Update `libs/admin-pages/src/pages/admin-dashboard/index.njk`:
   - Add notification banner component
   - Conditionally render if count > 0
   - Show count in message
   - Media requests tile already exists

3. Update `libs/admin-pages/src/pages/admin-dashboard/en.ts`:
   - Add importantLabel ("Important")
   - Add pendingRequestsMessage template

4. Update `libs/admin-pages/src/pages/admin-dashboard/cy.ts`:
   - Add Welsh translations

5. Update tests:
   - Test with pending requests
   - Test without pending requests
   - Test notification banner rendering

**Acceptance Criteria**:
- [ ] Notification banner shows when requests pending
- [ ] Count displayed correctly
- [ ] Banner hidden when no requests
- [ ] Tile links to media requests page
- [ ] Welsh translations complete
- [ ] Unit tests passing

---

### Task 3.2: Add Module CSS
**Estimated Time**: 2 hours

**Steps**:
1. Create `libs/media-admin/src/assets/css/media-admin.scss`:
   - Import GOV.UK Frontend
   - Add custom styles for rejection flow (if needed)
   - Add print styles

2. Update `apps/web/vite.config.ts`:
   - Import assets path from @hmcts/media-admin/config
   - Add to baseConfig sources

3. Test styles:
   - Verify GOV.UK components styled correctly
   - Test responsive design
   - Test print styles

**Acceptance Criteria**:
- [ ] Styles compiled correctly
- [ ] GOV.UK components render properly
- [ ] Responsive design works on mobile
- [ ] Print styles work

---

## Phase 4: Testing & Quality Assurance

### Task 4.1: Write E2E Tests
**Estimated Time**: 6 hours

**Steps**:
1. Create `e2e-tests/tests/media-admin/reject-application.spec.ts`:
   - Test complete rejection flow (happy path)
   - Test validation errors on each form
   - Test navigation (back links, change links)
   - Test "no" on confirmation (redirects back)
   - Test application not found (404)
   - Test already processed error

2. Create `e2e-tests/tests/media-admin/media-requests-list.spec.ts`:
   - Test list displays applications
   - Test empty state
   - Test view application link

3. Create `e2e-tests/tests/media-admin/application-details.spec.ts`:
   - Test details page displays correctly
   - Test reject button navigation
   - Test file download link

4. Set up test data:
   - Create seed data for test applications
   - Create test proof of ID files

**Acceptance Criteria**:
- [ ] E2E tests cover happy path
- [ ] E2E tests cover error scenarios
- [ ] E2E tests cover validation
- [ ] E2E tests cover navigation
- [ ] All E2E tests passing
- [ ] Test data seeded correctly

---

### Task 4.2: Accessibility Testing
**Estimated Time**: 4 hours

**Steps**:
1. Create `e2e-tests/tests/media-admin/accessibility.spec.ts`:
   - Test each page with axe-core
   - Use WCAG 2.2 AA ruleset
   - Test keyboard navigation
   - Test focus indicators

2. Manual testing:
   - Test with NVDA screen reader on Windows
   - Test keyboard navigation (Tab, Enter, Space, Arrow keys)
   - Test focus order
   - Test skip links

3. Test color contrast:
   - Use browser dev tools to check contrast ratios
   - Verify minimum 4.5:1 for text
   - Verify 3:1 for UI components

4. Test responsive design:
   - Test on mobile (320px width)
   - Test on tablet (768px width)
   - Test on desktop (1024px+ width)

5. Fix any issues found

**Acceptance Criteria**:
- [ ] All pages pass axe-core automated tests
- [ ] Keyboard navigation works correctly
- [ ] Focus indicators visible
- [ ] Screen reader compatible
- [ ] Color contrast meets standards
- [ ] Mobile responsive
- [ ] Accessibility tests passing

---

### Task 4.3: Welsh Language Testing
**Estimated Time**: 3 hours

**Steps**:
1. Manual testing:
   - Test each page with `?lng=cy` parameter
   - Verify all content translated
   - Verify proper character encoding (UTF-8)
   - Verify Welsh characters display correctly (â, ê, î, ô, û, ŵ, ŷ)

2. Create E2E tests:
   - Test language toggle on each page
   - Test form submission in Welsh
   - Test error messages in Welsh
   - Test email sent in Welsh

3. Review translations:
   - Have Welsh speaker review all translations
   - Fix any translation issues

**Acceptance Criteria**:
- [ ] All content translated to Welsh
- [ ] Welsh characters display correctly
- [ ] Language toggle works
- [ ] Forms work in Welsh
- [ ] Error messages in Welsh
- [ ] Email sent in correct language
- [ ] Translations reviewed and approved

---

### Task 4.4: Security Review
**Estimated Time**: 4 hours

**Steps**:
1. Code review:
   - Review authentication on all routes
   - Review authorization (role checks)
   - Review input validation
   - Review file download security
   - Review SQL injection prevention (Prisma handles this)

2. Penetration testing:
   - Test directory traversal on file downloads
   - Test CSRF protection
   - Test XSS prevention
   - Test SQL injection (should be prevented by Prisma)

3. Test edge cases:
   - Test with invalid application IDs
   - Test with tampered session data
   - Test concurrent processing (two admins)
   - Test file access without permission

4. Fix any security issues found

**Acceptance Criteria**:
- [ ] All routes require authentication
- [ ] Role-based access control enforced
- [ ] Input validation on all endpoints
- [ ] File downloads properly secured
- [ ] No directory traversal possible
- [ ] CSRF protection working
- [ ] XSS prevented
- [ ] Security review passed

---

### Task 4.5: Performance Testing
**Estimated Time**: 3 hours

**Steps**:
1. Load testing:
   - Test with 100 pending applications
   - Test with 1000 pending applications (if applicable)
   - Measure page load times
   - Measure query performance

2. Optimization:
   - Add pagination if needed
   - Optimize database queries
   - Add indexes if missing

3. File operations testing:
   - Test file download performance
   - Test file deletion
   - Test concurrent file access

4. Email sending testing:
   - Test email send timeout
   - Test email send with Gov.Notify API

**Acceptance Criteria**:
- [ ] Page load times < 2 seconds
- [ ] Database queries optimized
- [ ] File operations performant
- [ ] Email sending doesn't block requests
- [ ] Performance benchmarks met

---

## Phase 5: Documentation & Deployment

### Task 5.1: Update Documentation
**Estimated Time**: 3 hours

**Steps**:
1. Update README.md:
   - Document new media-admin module
   - Document environment variables
   - Document Gov.Notify setup
   - Document file storage setup

2. Create MEDIA-ADMIN.md:
   - Document rejection flow
   - Document API endpoints
   - Document database schema
   - Document file storage structure

3. Update API documentation:
   - Document download endpoint
   - Document authentication requirements

4. Create runbook:
   - Document deployment steps
   - Document rollback procedure
   - Document monitoring and alerts
   - Document troubleshooting

**Acceptance Criteria**:
- [ ] README updated
- [ ] Module documentation created
- [ ] API documentation updated
- [ ] Runbook created

---

### Task 5.2: Set Up Environment Variables
**Estimated Time**: 1 hour

**Steps**:
1. Add to Azure Key Vault:
   - GOV_NOTIFY_API_KEY
   - GOV_NOTIFY_REJECTION_TEMPLATE_ID
   - MEDIA_FILES_PATH (optional, defaults to /tmp/media-applications)
   - MEDIA_FILES_RETENTION_DAYS (optional, defaults to 30)

2. Update environment config files:
   - Development
   - Staging
   - Production

3. Document in README

**Acceptance Criteria**:
- [ ] Environment variables configured
- [ ] Variables documented
- [ ] Test values work in dev/staging

---

### Task 5.3: Deploy to Staging
**Estimated Time**: 2 hours

**Steps**:
1. Merge feature branch to master:
   ```bash
   git checkout master
   git merge feature/VIBE-229-reject-media-applications
   ```

2. Build all packages:
   ```bash
   yarn build
   ```

3. Run database migrations:
   ```bash
   NODE_ENV=staging yarn db:migrate
   ```

4. Deploy via Azure DevOps pipeline

5. Verify deployment:
   - Check application health endpoint
   - Test rejection flow manually
   - Check logs for errors

**Acceptance Criteria**:
- [ ] Code merged to master
- [ ] Build successful
- [ ] Migrations applied
- [ ] Deployed to staging
- [ ] Health check passing
- [ ] No errors in logs

---

### Task 5.4: Manual Testing on Staging
**Estimated Time**: 4 hours

**Steps**:
1. Test complete rejection flow:
   - Login as CTSC admin
   - Navigate to media requests
   - View application details
   - Download proof of ID
   - Reject application
   - Verify email sent
   - Verify file deleted
   - Verify database updated

2. Test error scenarios:
   - Application not found
   - Application already processed
   - File not found
   - Email send failure

3. Test accessibility:
   - Keyboard navigation
   - Screen reader (if available)
   - Mobile devices

4. Test Welsh language:
   - All pages in Welsh
   - Form submission in Welsh
   - Email sent in Welsh

5. Test cross-browser:
   - Chrome
   - Firefox
   - Safari
   - Edge

6. Document any bugs found

**Acceptance Criteria**:
- [ ] Complete rejection flow works
- [ ] Error scenarios handled correctly
- [ ] Accessibility verified
- [ ] Welsh language works
- [ ] Cross-browser compatibility verified
- [ ] No critical bugs found

---

### Task 5.5: Fix Staging Bugs
**Estimated Time**: Variable (TBD based on bugs found)

**Steps**:
1. Prioritize bugs (critical, high, medium, low)
2. Fix critical and high priority bugs
3. Deploy fixes to staging
4. Re-test
5. Repeat until no critical bugs remain

**Acceptance Criteria**:
- [ ] All critical bugs fixed
- [ ] High priority bugs fixed
- [ ] Fixes deployed and tested

---

### Task 5.6: Deploy to Production
**Estimated Time**: 2 hours

**Steps**:
1. Create deployment plan:
   - Schedule deployment window
   - Notify stakeholders
   - Prepare rollback plan

2. Pre-deployment checks:
   - All tests passing
   - Code review approved
   - Product owner approval

3. Deploy to production:
   - Run database migrations
   - Deploy application via pipeline
   - Verify health check

4. Post-deployment verification:
   - Test rejection flow
   - Check logs for errors
   - Monitor for issues

5. Notify stakeholders of successful deployment

**Acceptance Criteria**:
- [ ] Deployment plan created
- [ ] Pre-deployment checks passed
- [ ] Deployed to production
- [ ] Health check passing
- [ ] Rejection flow tested
- [ ] No errors in logs
- [ ] Stakeholders notified

---

### Task 5.7: Post-Deployment Monitoring
**Estimated Time**: Ongoing for first week

**Steps**:
1. Monitor Application Insights:
   - Check for errors
   - Check for performance issues
   - Monitor email send success rate

2. Monitor Gov.Notify:
   - Check email delivery rates
   - Check for bounces
   - Check for complaints

3. Monitor database:
   - Check query performance
   - Check table sizes
   - Check index usage

4. Monitor file storage:
   - Check disk space
   - Check file counts

5. Address any issues immediately

**Acceptance Criteria**:
- [ ] No critical errors in logs
- [ ] Email delivery rate > 95%
- [ ] Page load times within acceptable range
- [ ] No performance degradation
- [ ] File storage not growing excessively

---

## Phase 6: Handover & Support

### Task 6.1: Team Training
**Estimated Time**: 2 hours

**Steps**:
1. Prepare training materials:
   - User guide for CTSC admins
   - Technical documentation for developers
   - Troubleshooting guide

2. Conduct training session:
   - Demonstrate rejection flow
   - Explain error handling
   - Show how to check logs
   - Answer questions

3. Record training session

**Acceptance Criteria**:
- [ ] Training materials created
- [ ] Training session conducted
- [ ] Recording available
- [ ] Team comfortable with feature

---

### Task 6.2: Create Support Documentation
**Estimated Time**: 2 hours

**Steps**:
1. Create user guide:
   - How to view pending applications
   - How to reject an application
   - What happens after rejection
   - Common error messages

2. Create troubleshooting guide:
   - Email not sending
   - File not downloading
   - Application not found
   - Permission denied

3. Create FAQ:
   - How long are files retained?
   - Can a rejection be undone?
   - How are applicants notified?

**Acceptance Criteria**:
- [ ] User guide created
- [ ] Troubleshooting guide created
- [ ] FAQ created
- [ ] Documentation accessible to team

---

### Task 6.3: Handover to Support Team
**Estimated Time**: 1 hour

**Steps**:
1. Share documentation with support team
2. Explain common issues and resolutions
3. Provide contact information for escalation
4. Set up monitoring alerts

**Acceptance Criteria**:
- [ ] Documentation shared
- [ ] Support team trained
- [ ] Escalation process defined
- [ ] Alerts configured

---

## Summary of Tasks

### By Phase
- **Phase 1**: Module Setup & Foundation (8 tasks, ~18 hours)
- **Phase 2**: Page Implementation (6 tasks, ~22 hours)
- **Phase 3**: Integration & Updates (2 tasks, ~5 hours)
- **Phase 4**: Testing & Quality Assurance (5 tasks, ~20 hours)
- **Phase 5**: Documentation & Deployment (7 tasks, ~17 hours + variable bug fixes)
- **Phase 6**: Handover & Support (3 tasks, ~5 hours)

### Total Estimated Time
- **Total**: ~87 hours (excluding bug fixes)
- **With contingency (20%)**: ~104 hours
- **Estimated duration**: 3-4 weeks with 1-2 developers

### Critical Path
1. Module setup (Phase 1)
2. Database and file storage (Phase 1)
3. Page implementation (Phase 2)
4. Integration (Phase 3)
5. Testing (Phase 4)
6. Deployment (Phase 5)

### Dependencies
- Gov.Notify account and API key
- Database access
- File storage (temp directory or Azure Blob Storage)
- CTSC Admin user accounts for testing
- Welsh translation review

---

## Risk Mitigation Strategies

### Risk: Gov.Notify API Issues
**Mitigation**: Implement email send failure handling that doesn't block rejection

### Risk: File Storage Issues
**Mitigation**: Graceful degradation if files not found

### Risk: Concurrent Processing
**Mitigation**: Check application status before processing

### Risk: Performance Issues
**Mitigation**: Add pagination and caching if needed

### Risk: Security Vulnerabilities
**Mitigation**: Thorough security review and penetration testing

---

## Definition of Done Checklist

For each task to be considered complete, it must meet these criteria:

- [ ] Code implemented and follows HMCTS conventions
- [ ] Unit tests written and passing (>80% coverage)
- [ ] Integration tests written and passing (if applicable)
- [ ] E2E tests written and passing (if applicable)
- [ ] Code reviewed and approved
- [ ] Welsh translations complete
- [ ] Accessibility requirements met
- [ ] Security requirements met
- [ ] Documentation updated
- [ ] Tested manually on local environment
- [ ] Merged to master branch

---

## Next Steps

After completing VIBE-229, the following related work is planned:

1. **VIBE-XXX**: Accept media application flow
2. **VIBE-XXX**: Request more information from applicant
3. **VIBE-XXX**: Bulk actions for multiple applications
4. **VIBE-XXX**: Search and filter applications
5. **VIBE-XXX**: Export applications to CSV
6. **VIBE-XXX**: Application audit trail

---

This task breakdown provides a clear roadmap for implementing the media account rejection flow. Each task is granular enough to be assigned and tracked independently while contributing to the overall feature delivery.
