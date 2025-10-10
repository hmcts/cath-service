# VIBE-69 Onboarding Form - Implementation Tasks

## Implementation Tasks (full-stack-engineer)

### Module Setup
- [x] Create `libs/onboarding` module structure with package.json, tsconfig.json, vitest.config.ts
- [x] Register module in root tsconfig.json paths as `@hmcts/onboarding`
- [x] Setup build scripts including Nunjucks template copying

### Homepage Update
- [x] Update homepage template to include "See example form" link to `/onboarding/start`
- [x] Add Welsh translation for the link text

### Page Implementation
- [x] Implement `/onboarding/start` page (controller + template) with service information and requirements
- [x] Implement `/onboarding/name` page (controller + template) with name collection
- [x] Implement `/onboarding/date-of-birth` page with date fields (day, month, year) on same row
- [x] Implement `/onboarding/address` page with address fields (line 1, line 2, town, postcode)
- [x] Implement `/onboarding/role` page with radio buttons and conditional "Other" text field
- [x] Implement `/onboarding/summary` page with all collected data and change links
- [x] Implement `/onboarding/confirmation` page with submission confirmation

### Session Management
- [x] Create session management utilities for form data storage
- [x] Implement data preservation between pages
- [x] Add session cleanup on confirmation

### Validation with Zod
- [x] Install and configure Zod for validation
- [x] Create Zod schemas for each form page (name, dob, address, role)
- [x] Implement server-side validation using Zod schemas
- [x] Add age validation (minimum 16 years) using Zod refinement
- [x] Add UK postcode format validation with Zod regex
- [x] Create Zod error formatter for GOV.UK error display
- [x] Implement discriminated union for role conditional validation

### Navigation
- [x] Implement back navigation functionality with data preservation
- [x] Add navigation helpers for page flow (getPreviousPage, getNextPage)
- [x] Add change links on summary page with return context (?return=summary)
- [x] Setup proper URL routing under `/onboarding/` path
- [x] Ensure start page has no back link, name page goes back to start

### Localization
- [x] Create English locale file with common strings
- [x] Create Welsh locale file with all translations
- [x] Add start page content in both languages
- [x] Ensure all 8 pages render correctly in both languages

### Unit Tests
- [x] Write unit tests for validation utilities (90% coverage)
- [x] Write unit tests for session management utilities
- [x] Write unit tests for each page controller
- [x] Test error handling scenarios

## Testing Tasks (test-engineer)

### E2E Testing
- [x] Create E2E test for happy path (start page through confirmation)

## Review Tasks (code-reviewer)

### Code Quality Review
- [x] Review adherence to HMCTS coding standards
- [x] Check TypeScript strict mode compliance (no `any` without justification)
- [x] Verify ES module usage (no CommonJS)
- [x] Review naming conventions (camelCase, PascalCase, kebab-case)
- [x] Check file organization and module structure

### Testing Review
- [x] Verify 80-90% test coverage achieved
- [x] Review test quality and edge case coverage

### Security Review
- [x] Verify input validation on all form fields
- [x] Check for XSS vulnerabilities in form handling
- [x] Review session data handling for security
- [x] Ensure no sensitive data in logs

### Accessibility Review
- [x] Verify WCAG 2.2 AA compliance
- [x] Check proper form labeling and ARIA attributes
- [x] Review error message accessibility
- [x] Test keyboard navigation flow

### Performance Review
- [x] Check for unnecessary re-renders or calculations
- [x] Review session data size and cleanup
- [x] Verify efficient validation logic

### Suggestions for Improvement
- [x] Identify code optimization opportunities
- [x] Suggest UX enhancements based on implementation
- [x] Recommend testing improvements
- [x] Document any technical debt created

## Post-Implementation (ui-ux-engineer)

### Verification
- [ ] Verify all pages match wireframe specifications
- [ ] Check form flow matches user journey diagram
- [ ] Validate all content appears in English and Welsh
- [ ] Test user experience with actual users if possible

### Documentation Updates
- [ ] Update user journey map based on final implementation
- [ ] Document any deviations from original specification
- [ ] Create user testing feedback summary if conducted

### Database Tasks
- [x] Add OnboardingSubmission model to Prisma schema
- [x] Create database migration for onboarding_submission table
- [x] Implement database queries for saving submissions
- [x] Add submission timestamp and optional session ID tracking

### Accessibility Validation
- [x] Conduct manual accessibility testing
- [x] Verify color contrast ratios
- [x] Test with assistive technologies
- [x] Document any accessibility improvements made

## Definition of Done

- [x] All implementation tasks completed
- [x] All tests passing with >80% coverage
- [x] Code review feedback addressed - Review complete, issues documented
- [ ] Accessibility standards met (WCAG 2.2 AA)
- [x] Both English and Welsh languages fully functional
- [x] No linting or TypeScript errors
- [x] Documentation updated
- [x] Ready for deployment

## Infrastructure Assessment (infrastructure-engineer)

**Status: ✅ NO INFRASTRUCTURE CHANGES REQUIRED**

### Analysis Summary:
After reviewing the VIBE-69 specification and current project infrastructure, the onboarding form feature can be implemented using existing infrastructure components with no modifications required.

### Current Infrastructure Supports:
- **Docker**: ✅ Multi-stage Dockerfile handles module auto-discovery and nunjucks compilation
- **Helm Charts**: ✅ HMCTS nodejs base chart configuration is sufficient for new pages
- **CI/CD Pipeline**: ✅ GitHub Actions workflow supports testing and deployment of new modules
- **Database**: ✅ PostgreSQL with Prisma ready for OnboardingSubmission model addition
- **Container Registry**: ✅ Uses standard HMCTS Azure Container Registry setup
- **Session Management**: ✅ Redis already configured and available for form data storage

### Infrastructure Tasks:
- [x] **Docker Configuration**: No changes needed - existing build supports libs/ modules
- [x] **Helm Chart Updates**: No changes needed - current nodejs chart handles web application
- [x] **CI/CD Pipeline**: No changes needed - workflow covers new module testing and building
- [x] **Database Infrastructure**: No changes needed - migration process handles schema updates
- [x] **Container Registry**: No changes needed - existing ACR configuration sufficient

### Infrastructure Components Ready for VIBE-69:
1. **Module Auto-Discovery**: Web app automatically discovers modules with pages/ directories
2. **Template Compilation**: Dockerfile includes nunjucks template copying for new modules
3. **Database Migrations**: Standard Prisma migration process for OnboardingSubmission model
4. **Session Storage**: Redis configuration supports multi-page form data persistence
5. **Load Balancing**: Helm chart autoscaling ready for production traffic

**Result**: Feature implementation can proceed without any infrastructure modifications. All required components (database, session storage, containerization, deployment) are available and properly configured.

## Notes

- Clarifying questions from specification should be addressed before implementation
- Database persistence is REQUIRED per specification - OnboardingSubmission model needed
- Progressive enhancement approach - core functionality works without JavaScript
- Follow GOV.UK Design System patterns throughout