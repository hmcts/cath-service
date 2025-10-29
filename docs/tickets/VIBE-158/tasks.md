# VIBE-158: Implementation Tasks

## Implementation Tasks (full-stack-engineer)

- [ ] Create libs/admin-pages module structure (package.json, tsconfig.json)
- [ ] Create src/config.ts with pageRoutes export
- [ ] Create src/index.ts for business logic exports
- [ ] Register @hmcts/admin-pages module in root tsconfig.json paths
- [ ] Add multer and @types/multer dependencies to root package.json
- [ ] Add @hmcts/redis dependency to libs/admin-pages/package.json
- [ ] Create manual-upload-storage.ts with Redis storage service
- [ ] Implement storeManualUpload function (store file as base64 with 1hr TTL)
- [ ] Implement getManualUpload function (retrieve and decode file from Redis)
- [ ] Implement manual-upload page controller (index.ts) with GET handler
- [ ] Implement session restoration in GET handler (restore form data from req.session)
- [ ] Implement manual-upload page controller (index.ts) with POST handler
- [ ] Implement session persistence in POST handler on validation error
- [ ] Implement Redis storage call in POST handler on success
- [ ] Implement session cleanup in POST handler on success
- [ ] Create file-upload-middleware.ts with multer configuration
- [ ] Create manual-upload Nunjucks template (index.njk) with two-column layout
- [ ] Implement GOV.UK warning text component at top of form
- [ ] Implement file upload field with govukFileUpload component
- [ ] Implement court/tribunal autocomplete field (integrate with @hmcts/location, client-side)
- [ ] Implement list type dropdown with govukSelect (all types for all courts)
- [ ] Implement hearing start date with govukDateInput (3 fields)
- [ ] Implement sensitivity dropdown with govukSelect
- [ ] Implement language dropdown with govukSelect
- [ ] Implement display from date with govukDateInput (3 fields)
- [ ] Implement display to date with govukDateInput (3 fields, required)
- [ ] Implement continue button with govukButton
- [ ] Create Page Help sidebar in right column (one-third width)
- [ ] Create English translations (en.ts) for all form labels, hints, and error messages
- [ ] Create Welsh translations (cy.ts) for all form labels, hints, and error messages
- [ ] Implement server-side validation for file upload (type, size, required)
- [ ] Implement server-side validation for all required fields (including display to)
- [ ] Implement server-side date validation (format, display to >= display from)
- [ ] Implement error summary with govukErrorSummary component
- [ ] Implement field-level error messages
- [ ] Register admin-pages module in apps/web/src/app.ts with createSimpleRouter
- [ ] Apply multer middleware to POST /manual-upload route
- [ ] Write unit tests for GET handler (render + session restoration)
- [ ] Write unit tests for POST handler with valid data (Redis storage + redirect)
- [ ] Write unit tests for file validation logic
- [ ] Write unit tests for required field validation
- [ ] Write unit tests for date validation logic
- [ ] Write unit tests for session persistence on validation error
- [ ] Write unit tests for session cleanup on success
- [ ] Write unit tests for storeManualUpload (Redis storage with TTL)
- [ ] Write unit tests for getManualUpload (retrieval and decoding)

## Testing Tasks (test-engineer)

- [ ] Create E2E test for manual upload form access (GET /manual-upload)
- [ ] Create E2E test for complete form submission with valid file
- [ ] Create E2E test for file type validation error (invalid extension)
- [ ] Create E2E test for file size validation error (>2MB)
- [ ] Create E2E test for missing file validation
- [ ] Create E2E test for required field validation (all fields including display to)
- [ ] Create E2E test for invalid date validation
- [ ] Create E2E test for display to < display from validation
- [ ] Create E2E test for court/tribunal client-side autocomplete functionality
- [ ] Create E2E test for session persistence (fill form, navigate away, return, verify data restored)
- [ ] Create E2E test for session cleanup on successful submission
- [ ] Create E2E test for Welsh language toggle
- [ ] Run axe-core accessibility tests on form (default state)
- [ ] Run axe-core accessibility tests on form with errors
- [ ] Verify WCAG 2.2 AA compliance for all form states

## Review Tasks (code-reviewer)

- [ ] Review code quality and adherence to CLAUDE.md standards
- [ ] Verify camelCase used for TypeScript variables
- [ ] Verify .js extensions used on relative imports
- [ ] Verify no CommonJS patterns (require/module.exports)
- [ ] Check 80-90% test coverage for new code
- [ ] Verify file upload validation is secure (no path traversal, proper MIME check)
- [ ] Verify Redis storage security (proper key naming, TTL set correctly)
- [ ] Verify session data is properly scoped and cleaned up
- [ ] Check that file is stored as base64 and properly decoded
- [ ] Verify proper error handling and user-friendly error messages
- [ ] Check Welsh translations are complete and match English structure
- [ ] Verify GOV.UK Design System components used correctly
- [ ] Verify two-column layout (two-thirds/one-third) implemented correctly
- [ ] Check accessibility of warning banner
- [ ] Verify form fields have proper labels and hints
- [ ] Check error summary links to correct fields
- [ ] Verify session restoration works correctly on GET
- [ ] Verify session persistence works on validation error
- [ ] Suggest improvements to user

## Infrastructure Tasks (infrastructure-engineer)

- [x] Verify @hmcts/redis module is configured in apps/web
- [x] Verify Redis connection is available in development environment
- [x] Verify Redis connection is available in test environment
- [x] Verify session store is using Redis (existing configuration)
- [x] Confirm no additional environment variables needed
- [x] Confirm no Helm chart updates required
- [x] Document Redis key naming convention (manual-upload:${uuid})
- [x] Document Redis TTL for manual uploads (1 hour)

### Infrastructure Assessment Complete

**Current Infrastructure Status:**

1. **Redis Service:**
   - ✅ Configured in docker-compose.yml (redis:8-alpine)
   - ✅ Exposed on port 6380 (host) -> 6379 (container)
   - ✅ Persistent storage with appendonly mode enabled
   - ✅ Health checks configured

2. **Redis Configuration:**
   - ✅ Default URL: redis://localhost:6380 (apps/web/config/default.json)
   - ✅ Environment variable: REDIS_URL (apps/web/config/custom-environment-variables.json)
   - ✅ Redis client created in apps/web/src/app.ts using redis package (v5.9.0)

3. **Session Management:**
   - ✅ Session middleware configured with Redis backend (expressSessionRedis from @hmcts/web-core)
   - ✅ Session secret via SESSION_SECRET environment variable
   - ✅ Session prefix: "sess:"

4. **No Infrastructure Changes Required:**
   - ✅ No new environment variables needed
   - ✅ No Docker/Kubernetes configuration changes
   - ✅ No Helm charts exist or need updating
   - ✅ No CI/CD pipeline changes needed

**Redis Storage Conventions:**
- Key naming: `manual-upload:${uuid}` (as per specification)
- TTL: 3600 seconds (1 hour)
- Data format: JSON string with base64-encoded file

**IMPORTANT NOTE - Specification Issue:**
The specification references `@hmcts/redis` module, but this module does not exist in the codebase. The implementation should:
- Accept Redis client as a parameter to storage functions (dependency injection)
- Redis client is created in apps/web/src/app.ts and can be exported if needed
- Alternative: Create @hmcts/redis module, but this violates YAGNI principle

**Recommendation:** Use dependency injection - pass Redis client as parameter to `storeManualUpload` and `getManualUpload` functions.

## Post-Implementation (ui-ux-engineer)

- [ ] Verify form layout matches specification wireframe
- [ ] Verify warning text is prominent with caution icon
- [ ] Check form field ordering matches specification (no back to top button)
- [ ] Verify Page Help sidebar content is clear and helpful
- [ ] Verify error messages are clear and actionable
- [ ] Check field labels and hints are user-friendly
- [ ] Verify client-side autocomplete UX matches search page
- [ ] Verify WCAG 2.2 AA compliance (color contrast, keyboard navigation)
- [ ] Test with screen reader to verify proper announcement
- [ ] Verify Welsh toggle works correctly and content makes sense
- [ ] Verify session restoration UX is smooth and intuitive
- [ ] Update user journey map based on final implementation
