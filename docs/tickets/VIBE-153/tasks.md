# VIBE-153: Implementation Tasks

## Implementation Tasks (full-stack-engineer)

### Phase 1: Location Module Setup
- [x] Create `libs/location` package structure (package.json, tsconfig.json)
- [x] Implement `libs/location/src/location-data.ts` with mock JSON data (10 locations total)
- [x] Implement `libs/location/src/location-service.ts` with search (priority: starts-with first, then partial matches) and filter functions
- [x] Write unit tests for location service (`location-service.test.ts`) - test priority ordering
- [x] Export location module in `libs/location/src/index.ts`
- [x] Register location module in root `tsconfig.json` paths

### Phase 2: Search Page Implementation
- [x] Create search page controller `libs/public-pages/src/pages/search.ts`
- [x] Create search page locale file `libs/public-pages/src/locales/search.ts` (EN/CY)
- [x] Create search page template `libs/public-pages/src/views/search.njk`
- [x] Implement GET handler with autocomplete suggestions
- [x] Implement POST handler with validation and redirect (locationId in URL, not session)
- [x] Write unit tests for search controller (`search.test.ts`)

### Phase 3: A-Z List Page Implementation
- [x] Create A-Z list controller `libs/public-pages/src/pages/courts-tribunals-list.ts`
- [x] Create A-Z list locale file `libs/public-pages/src/locales/courts-tribunals-list.ts` (EN/CY)
- [x] Create A-Z list template `libs/public-pages/src/views/courts-tribunals-list.njk`
- [x] Implement GET handler with grouped locations
- [x] Write unit tests for A-Z list controller (`courts-tribunals-list.test.ts`)

### Phase 4: Client-Side Enhancement (Optional - if accessible-autocomplete used)
- [x] Create `libs/public-pages/src/assets/js/search-autocomplete.ts`
- [x] Implement accessible autocomplete initialization
- [x] Test keyboard navigation and screen reader compatibility

### Phase 5: Integration
- [x] Update `libs/public-pages/src/index.ts` to export new assets (if applicable)
- [x] Test full user journey from /view-option → /search → /summary-of-publications?locationId=X
- [x] Verify locationId correctly passed in URL parameters
- [x] Test Welsh language toggle on all new pages

## Testing Tasks (test-engineer)

### E2E Test Suite
- [x] Create E2E test for search page happy path
  - Navigate to /search
  - Type in search field
  - Select a location from suggestions
  - Click continue
  - Verify redirect to correct page with locationId

- [x] Create E2E test for search page validation errors
  - Navigate to /search
  - Click continue without selecting location
  - Verify error message displayed
  - Verify error summary present

- [x] Create E2E test for A-Z list navigation
  - Navigate to /search
  - Click "select from an A-Z list" link
  - Verify A-Z list page loads
  - Verify all locations grouped by letter
  - Click a location
  - Verify redirect to correct page

- [x] Create E2E test for Welsh language support
  - Navigate to /search
  - Toggle to Welsh (Cymraeg)
  - Verify all text translated
  - Verify search works with Welsh location names
  - Submit form and verify Welsh content maintained

- [x] Create E2E test for keyboard navigation
  - Navigate to /search using Tab key
  - Verify focus indicators visible
  - Verify autocomplete navigable with arrow keys
  - Verify form submittable with Enter key

- [x] Create accessibility test with axe-core
  - Run axe scan on /search page
  - Run axe scan on /courts-tribunals-list page
  - Verify WCAG 2.2 AA compliance
  - Verify no accessibility violations

## Review Tasks (code-reviewer)

- [ ] Review location service implementation
  - Check search algorithm efficiency
  - Verify type safety
  - Check error handling
  - Verify Welsh language support

- [ ] Review search page controller
  - Check validation logic
  - Verify URL parameter handling (locationId in redirect)
  - Check error handling patterns
  - Verify locale switching works correctly

- [ ] Review template implementation
  - Check GOV.UK Design System component usage
  - Verify accessibility attributes (aria-*)
  - Check form validation markup
  - Verify Welsh content structure

- [ ] Verify test coverage
  - Check unit test coverage >80%
  - Verify all edge cases tested
  - Check E2E tests cover user journeys
  - Verify accessibility tests present

- [ ] Check code quality standards
  - Verify TypeScript strict mode compliance
  - Check ESM imports (with .js extensions)
  - Verify naming conventions followed
  - Check no unused imports or variables

- [ ] Security review
  - Verify input sanitization
  - Check no XSS vulnerabilities in templates
  - Verify URL parameters properly validated
  - Check no sensitive data logged

- [ ] Suggest improvements to user
  - Performance optimizations if needed
  - Code simplification opportunities
  - Additional test scenarios
  - Accessibility enhancements

## Post-Implementation (ui-ux-engineer)

- [ ] Review final implementation against wireframes
  - Verify page layout matches specification
  - Check spacing and typography
  - Verify button and link placement

- [ ] Verify GOV.UK Design System compliance
  - Check component usage correct
  - Verify color contrast ratios
  - Check focus states visible
  - Verify error styling correct

- [ ] Test user experience flow
  - Test search interaction feels natural
  - Verify error messages clear and helpful
  - Check A-Z list easy to navigate
  - Test Welsh toggle smooth

- [ ] Update user journey documentation
  - Document the implemented flow
  - Note any deviations from original spec
  - Record UX decisions made during implementation
  - Create screenshots for documentation (optional)

## Infrastructure Tasks (infrastructure-engineer)

- [x] Review specification for infrastructure requirements
- [x] Assess need for Helm chart updates - NOT REQUIRED
- [x] Assess need for Docker configuration changes - NOT REQUIRED
- [x] Assess need for CI/CD pipeline updates - NOT REQUIRED
- [x] Assess need for Kubernetes configuration - NOT REQUIRED
- [x] Assess need for environment variables/secrets - NOT REQUIRED

**Infrastructure Assessment**: No infrastructure changes required. This ticket implements pure application-level code using mock JSON data, URL parameters for state management, and standard TypeScript/JavaScript build processes. All requirements are met within existing infrastructure.

## Definition of Done

- [x] All unit tests passing with >80% coverage
- [x] All E2E tests passing (78/78 tests passing)
- [x] No accessibility violations (axe-core) - WCAG 2.2 AA compliant
- [x] Welsh language fully supported
- [ ] Code review completed and approved
- [x] No TypeScript errors
- [x] No linting errors (Biome)
- [x] Location ID correctly passed via URL parameters
- [x] Search priority ordering working correctly (starts-with first)
- [x] 10 locations in mock data for testing
- [ ] Manual testing completed on all pages
- [ ] Documentation updated (if needed)

## Implementation Summary

### Completed:
- ✅ All engineering tasks (location module, search page, A-Z list, client-side enhancement, integration)
- ✅ All unit tests written and passing (29 tests for location, 12 new tests for public-pages)
- ✅ All E2E tests created and passing (78/78 tests passing)
- ✅ Accessibility tests passing - WCAG 2.2 AA compliant with axe-core
- ✅ Infrastructure assessment (no changes required)
- ✅ No TypeScript errors
- ✅ No linting errors
- ✅ Build successful

### Pending:
- ⏳ Code review by code-reviewer agent
- ⏳ UI/UX review by ui-ux-engineer agent
- ⏳ Manual testing on running application
