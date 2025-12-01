# VIBE-166: Implementation Tasks

## Overview
Tasks for implementing Excel upload journey for Care Standards Tribunal Weekly Hearing List. Tasks are organized in logical implementation order with dependencies clearly marked.

---

## Phase 1: Foundation Setup (Estimated: 1 day)

### Task 1.1: Create New List Type Module Structure
**Priority**: High
**Estimated Time**: 1 hour
**Dependencies**: None

**Subtasks**:
- [ ] Create directory structure: `libs/list-types/care-standards-tribunal-weekly-hearing-list/`
- [ ] Create `package.json` with correct exports and scripts
- [ ] Create `tsconfig.json` extending root config
- [ ] Create `src/config.ts` for module configuration
- [ ] Create `src/index.ts` for business logic exports
- [ ] Create subdirectories: `models/`, `pages/`, `rendering/`, `validation/`, `assets/css/`, `assets/js/`

**Files to Create**:
- `libs/list-types/care-standards-tribunal-weekly-hearing-list/package.json`
- `libs/list-types/care-standards-tribunal-weekly-hearing-list/tsconfig.json`
- `libs/list-types/care-standards-tribunal-weekly-hearing-list/src/config.ts`
- `libs/list-types/care-standards-tribunal-weekly-hearing-list/src/index.ts`

**Acceptance Criteria**:
- Module builds successfully with `yarn build`
- TypeScript compilation succeeds
- No linting errors

---

### Task 1.2: Register List Type Definition
**Priority**: High
**Estimated Time**: 30 minutes
**Dependencies**: None

**Subtasks**:
- [ ] Add new list type to `mockListTypes` array in `libs/list-types/common/src/mock-list-types.ts`
- [ ] Set ID to 9
- [ ] Add English and Welsh friendly names
- [ ] Set URL path to `care-standards-tribunal-weekly-hearing-list`
- [ ] Run tests to ensure no regressions

**Files to Modify**:
- `libs/list-types/common/src/mock-list-types.ts`

**Acceptance Criteria**:
- List type ID 9 is available in mockListTypes
- English and Welsh names are correct
- URL path is properly formatted
- All existing tests pass

---

### Task 1.3: Register Module in Root Configuration
**Priority**: High
**Estimated Time**: 30 minutes
**Dependencies**: Task 1.1

**Subtasks**:
- [ ] Add module path to `tsconfig.json` paths
- [ ] Import and register page routes in `apps/web/src/app.ts`
- [ ] Import and register assets in `apps/web/vite.config.ts`
- [ ] Verify module resolution works

**Files to Modify**:
- `tsconfig.json`
- `apps/web/src/app.ts`
- `apps/web/vite.config.ts`

**Acceptance Criteria**:
- Module imports resolve correctly
- No TypeScript errors
- Web app builds successfully

---

## Phase 2: Excel Parsing Implementation (Estimated: 2 days)

### Task 2.1: Add Excel Dependencies
**Priority**: High
**Estimated Time**: 15 minutes
**Dependencies**: None

**Subtasks**:
- [ ] Add `xlsx` package (version 0.18.5) to `libs/admin-pages/package.json`
- [ ] Add `@types/node` for file system types
- [ ] Run `yarn install` to install dependencies
- [ ] Verify package installation

**Files to Modify**:
- `libs/admin-pages/package.json`

**Acceptance Criteria**:
- Dependencies installed successfully
- No version conflicts
- TypeScript types available

---

### Task 2.2: Create Excel Type Definitions
**Priority**: High
**Estimated Time**: 1 hour
**Dependencies**: None

**Subtasks**:
- [ ] Create `ExcelParsingResult` interface
- [ ] Create `CareStandardsHearingData` interface
- [ ] Create `HearingRow` interface
- [ ] Create `ExcelUploadMetadata` interface
- [ ] Extend `ManualUploadForm` interface with `fileType` field
- [ ] Add comprehensive JSDoc comments

**Files to Create/Modify**:
- `libs/admin-pages/src/manual-upload/model.ts` (extend)

**Acceptance Criteria**:
- All types are properly defined
- Types compile without errors
- JSDoc comments are clear and complete

---

### Task 2.3: Implement Excel Validator
**Priority**: High
**Estimated Time**: 3 hours
**Dependencies**: Task 2.2

**Subtasks**:
- [ ] Create `excel-validator.ts` file
- [ ] Define `REQUIRED_COLUMNS` constant
- [ ] Define `MAX_LENGTHS` constant
- [ ] Implement `validateExcelStructure()` function
- [ ] Implement `validateHearingRow()` function
- [ ] Implement `validateDate()` function (dd/MM/yyyy format)
- [ ] Implement string length validation
- [ ] Implement empty cell detection
- [ ] Add comprehensive error messages

**Files to Create**:
- `libs/admin-pages/src/manual-upload/excel-validator.ts`

**Acceptance Criteria**:
- All validation functions work correctly
- Date format validation is robust
- Error messages are clear and helpful
- No false positives or negatives

---

### Task 2.4: Create Excel Validator Tests
**Priority**: High
**Estimated Time**: 2 hours
**Dependencies**: Task 2.3

**Subtasks**:
- [ ] Create test file `excel-validator.test.ts`
- [ ] Test valid Excel structure passes
- [ ] Test missing columns detected
- [ ] Test invalid date formats rejected
- [ ] Test valid dates accepted (dd/MM/yyyy)
- [ ] Test string length validation
- [ ] Test empty cell detection
- [ ] Test edge cases (leap years, invalid calendar dates)
- [ ] Achieve >90% code coverage

**Files to Create**:
- `libs/admin-pages/src/manual-upload/excel-validator.test.ts`

**Acceptance Criteria**:
- All tests pass
- Code coverage >90%
- Edge cases covered
- Tests are maintainable

---

### Task 2.5: Implement Excel Parser
**Priority**: High
**Estimated Time**: 4 hours
**Dependencies**: Task 2.3

**Subtasks**:
- [ ] Create `excel-parser.ts` file
- [ ] Implement `parseExcelFile()` function
- [ ] Implement `isExcelFile()` helper function
- [ ] Implement `convertToListTypeSchema()` function
- [ ] Use xlsx library to read file
- [ ] Extract and validate header row
- [ ] Iterate through data rows
- [ ] Convert dd/MM/yyyy dates to ISO 8601
- [ ] Trim whitespace from all string fields
- [ ] Handle empty rows (stop at first empty row)
- [ ] Return structured JSON or validation errors
- [ ] Add comprehensive error handling

**Files to Create**:
- `libs/admin-pages/src/manual-upload/excel-parser.ts`

**Acceptance Criteria**:
- Parser correctly reads .xlsx and .xls files
- Date conversion is accurate
- Error handling is robust
- Performance is acceptable (<5s for 1000 rows)

---

### Task 2.6: Create Excel Parser Tests
**Priority**: High
**Estimated Time**: 3 hours
**Dependencies**: Task 2.5

**Subtasks**:
- [ ] Create test file `excel-parser.test.ts`
- [ ] Create sample valid Excel file for testing
- [ ] Create sample invalid Excel files (various error types)
- [ ] Test successful parsing of valid file
- [ ] Test invalid file format handling
- [ ] Test missing columns detection
- [ ] Test invalid date format handling
- [ ] Test empty cell detection
- [ ] Test row-level validation errors
- [ ] Test JSON schema conversion
- [ ] Test edge cases (empty file, single row, max columns)
- [ ] Achieve >90% code coverage

**Files to Create**:
- `libs/admin-pages/src/manual-upload/excel-parser.test.ts`
- `libs/admin-pages/src/manual-upload/__fixtures__/valid-hearing-list.xlsx`
- `libs/admin-pages/src/manual-upload/__fixtures__/invalid-*.xlsx` (various error types)

**Acceptance Criteria**:
- All tests pass
- Code coverage >90%
- Test fixtures are realistic
- Edge cases covered

---

### Task 2.7: Extend Manual Upload Controller
**Priority**: High
**Estimated Time**: 3 hours
**Dependencies**: Task 2.5

**Subtasks**:
- [ ] Modify `libs/admin-pages/src/pages/manual-upload/index.ts`
- [ ] Add file type detection based on extension
- [ ] Add Excel file handling branch in POST handler
- [ ] Save original Excel file to temp storage
- [ ] Call `parseExcelFile()` and handle result
- [ ] Convert parsed data to JSON schema
- [ ] Save JSON file to temp storage
- [ ] Store both file paths in session
- [ ] Handle validation errors (display on upload page)
- [ ] Handle success (redirect to summary page)
- [ ] Add error logging

**Files to Modify**:
- `libs/admin-pages/src/pages/manual-upload/index.ts`

**Acceptance Criteria**:
- Excel files are parsed correctly
- JSON files continue to work (no regression)
- Validation errors are displayed clearly
- Session data is stored correctly
- Redirects work as expected

---

### Task 2.8: Create Manual Upload Integration Tests
**Priority**: Medium
**Estimated Time**: 2 hours
**Dependencies**: Task 2.7

**Subtasks**:
- [ ] Extend existing manual upload tests
- [ ] Test Excel file upload flow
- [ ] Test validation error display
- [ ] Test successful redirect to summary
- [ ] Test session data storage
- [ ] Test both file types (Excel and JSON)
- [ ] Mock file system operations
- [ ] Mock Redis session storage

**Files to Modify**:
- `libs/admin-pages/src/pages/manual-upload/index.test.ts`

**Acceptance Criteria**:
- All tests pass
- Both file types tested
- Error scenarios covered
- No flaky tests

---

## Phase 3: Display Page Implementation (Estimated: 3 days)

### Task 3.1: Create Type Definitions for Display
**Priority**: High
**Estimated Time**: 1 hour
**Dependencies**: Task 1.1

**Subtasks**:
- [ ] Create `libs/list-types/care-standards-tribunal-weekly-hearing-list/src/models/types.ts`
- [ ] Define `CareStandardsHearingList` interface
- [ ] Define `Hearing` interface
- [ ] Define `DisplayData` interface
- [ ] Define `HeaderData` interface
- [ ] Define `ImportantInfoData` interface
- [ ] Define `DisplayHearing` interface
- [ ] Add JSDoc comments

**Files to Create**:
- `libs/list-types/care-standards-tribunal-weekly-hearing-list/src/models/types.ts`

**Acceptance Criteria**:
- All interfaces properly typed
- Types compile without errors
- JSDoc comments complete

---

### Task 3.2: Implement JSON Validator
**Priority**: High
**Estimated Time**: 2 hours
**Dependencies**: Task 3.1

**Subtasks**:
- [ ] Create `libs/list-types/care-standards-tribunal-weekly-hearing-list/src/validation/json-validator.ts`
- [ ] Define JSON schema using Ajv
- [ ] Add validation for required fields
- [ ] Add validation for data types
- [ ] Add validation for string lengths
- [ ] Add validation for date format
- [ ] Implement `validateCareStandardsHearingList()` function
- [ ] Return structured validation result

**Files to Create**:
- `libs/list-types/care-standards-tribunal-weekly-hearing-list/src/validation/json-validator.ts`

**Acceptance Criteria**:
- Schema validation works correctly
- All required fields validated
- Data type validation accurate
- Error messages are helpful

---

### Task 3.3: Create JSON Validator Tests
**Priority**: High
**Estimated Time**: 2 hours
**Dependencies**: Task 3.2

**Subtasks**:
- [ ] Create test file `json-validator.test.ts`
- [ ] Test valid schema passes validation
- [ ] Test missing required fields detected
- [ ] Test invalid data types rejected
- [ ] Test string length validation
- [ ] Test hearing array validation
- [ ] Test edge cases (empty hearings array, max lengths)
- [ ] Achieve >90% code coverage

**Files to Create**:
- `libs/list-types/care-standards-tribunal-weekly-hearing-list/src/validation/json-validator.test.ts`

**Acceptance Criteria**:
- All tests pass
- Code coverage >90%
- Edge cases covered

---

### Task 3.4: Implement Renderer
**Priority**: High
**Estimated Time**: 3 hours
**Dependencies**: Task 3.1

**Subtasks**:
- [ ] Create `libs/list-types/care-standards-tribunal-weekly-hearing-list/src/rendering/renderer.ts`
- [ ] Implement `renderHearingListData()` function
- [ ] Calculate week commencing date from first hearing
- [ ] Format last updated timestamp
- [ ] Sort hearings by date ascending
- [ ] Convert dates from ISO 8601 to dd/MM/yyyy
- [ ] Resolve location name (English/Welsh)
- [ ] Generate important info content (English/Welsh)
- [ ] Return `DisplayData` object

**Files to Create**:
- `libs/list-types/care-standards-tribunal-weekly-hearing-list/src/rendering/renderer.ts`

**Acceptance Criteria**:
- Week calculation is correct (Monday start)
- Date formatting is accurate
- Hearing sorting works correctly
- Welsh translation handled properly

---

### Task 3.5: Create Renderer Tests
**Priority**: High
**Estimated Time**: 2 hours
**Dependencies**: Task 3.4

**Subtasks**:
- [ ] Create test file `renderer.test.ts`
- [ ] Test week commencing calculation
- [ ] Test date formatting (ISO to dd/MM/yyyy)
- [ ] Test hearing sorting by date
- [ ] Test location name resolution
- [ ] Test Welsh translation handling
- [ ] Test important info content generation
- [ ] Test edge cases (single hearing, multiple same-day hearings)
- [ ] Achieve >90% code coverage

**Files to Create**:
- `libs/list-types/care-standards-tribunal-weekly-hearing-list/src/rendering/renderer.test.ts`

**Acceptance Criteria**:
- All tests pass
- Code coverage >90%
- Edge cases covered
- Tests are maintainable

---

### Task 3.6: Create Content Files
**Priority**: High
**Estimated Time**: 2 hours
**Dependencies**: Task 1.1

**Subtasks**:
- [ ] Create `libs/list-types/care-standards-tribunal-weekly-hearing-list/src/pages/en.ts`
- [ ] Create `libs/list-types/care-standards-tribunal-weekly-hearing-list/src/pages/cy.ts`
- [ ] Add all English content (page title, headings, labels, buttons, messages)
- [ ] Add all Welsh content (translations)
- [ ] Export content objects
- [ ] Review translations for accuracy

**Files to Create**:
- `libs/list-types/care-standards-tribunal-weekly-hearing-list/src/pages/en.ts`
- `libs/list-types/care-standards-tribunal-weekly-hearing-list/src/pages/cy.ts`

**Acceptance Criteria**:
- All content present in both languages
- Welsh translations accurate
- Content follows GOV.UK style guide
- No hardcoded strings

---

### Task 3.7: Create Page Controller
**Priority**: High
**Estimated Time**: 2 hours
**Dependencies**: Task 3.4, Task 3.6

**Subtasks**:
- [ ] Create `libs/list-types/care-standards-tribunal-weekly-hearing-list/src/pages/index.ts`
- [ ] Implement GET handler
- [ ] Validate artefactId parameter
- [ ] Fetch artefact from database
- [ ] Read JSON file from storage
- [ ] Validate JSON structure
- [ ] Call renderer to transform data
- [ ] Render Nunjucks template
- [ ] Handle errors (artefact not found, JSON invalid, etc.)
- [ ] Add error logging

**Files to Create**:
- `libs/list-types/care-standards-tribunal-weekly-hearing-list/src/pages/index.ts`

**Acceptance Criteria**:
- Valid requests render correctly
- Invalid artefactId returns 400 error
- Missing artefact returns 404 error
- Validation errors handled gracefully
- Error logging is comprehensive

---

### Task 3.8: Create Nunjucks Template
**Priority**: High
**Estimated Time**: 3 hours
**Dependencies**: Task 3.7

**Subtasks**:
- [ ] Create `libs/list-types/care-standards-tribunal-weekly-hearing-list/src/pages/index.njk`
- [ ] Extend default layout
- [ ] Add page header (title, duration, last updated)
- [ ] Add important information accordion (GOV.UK Details component)
- [ ] Add search form (input, buttons)
- [ ] Add results count element (with ARIA live region)
- [ ] Add no results message element
- [ ] Add hearings table (6 columns)
- [ ] Add data-* attributes for search functionality
- [ ] Add footer (data source, back to top link)
- [ ] Ensure proper heading hierarchy (h1, h2)
- [ ] Add ARIA attributes for accessibility

**Files to Create**:
- `libs/list-types/care-standards-tribunal-weekly-hearing-list/src/pages/index.njk`

**Acceptance Criteria**:
- Template renders correctly with sample data
- All GOV.UK components used properly
- Accessibility attributes present
- No hardcoded content (uses content files)
- Responsive design considerations

---

### Task 3.9: Create Page Styles (SCSS)
**Priority**: Medium
**Estimated Time**: 2 hours
**Dependencies**: Task 3.8

**Subtasks**:
- [ ] Create `libs/list-types/care-standards-tribunal-weekly-hearing-list/src/assets/css/hearing-list.scss`
- [ ] Import GOV.UK Frontend styles
- [ ] Style search container
- [ ] Style search form (buttons, clear button)
- [ ] Style results count
- [ ] Style no results message
- [ ] Style hearings table
- [ ] Add responsive styles for mobile (stack table on small screens)
- [ ] Test on different screen sizes

**Files to Create**:
- `libs/list-types/care-standards-tribunal-weekly-hearing-list/src/assets/css/hearing-list.scss`

**Acceptance Criteria**:
- Styles follow GOV.UK design patterns
- Mobile responsive (320px and up)
- No layout issues on different screen sizes
- Styles compiled correctly by Vite

---

### Task 3.10: Implement Client-Side Search
**Priority**: High
**Estimated Time**: 3 hours
**Dependencies**: Task 3.8

**Subtasks**:
- [ ] Create `libs/list-types/care-standards-tribunal-weekly-hearing-list/src/assets/js/search.ts`
- [ ] Implement `initializeSearch()` function
- [ ] Query DOM elements (search input, table rows, buttons)
- [ ] Implement `performSearch()` function (case-insensitive, substring match)
- [ ] Implement debouncing (300ms delay)
- [ ] Update results count (with locale-aware text)
- [ ] Show/hide clear button based on search state
- [ ] Show/hide no results message
- [ ] Hide/show table rows based on matches
- [ ] Add event listeners (input, submit, clear button)
- [ ] Ensure progressive enhancement (works without JS)

**Files to Create**:
- `libs/list-types/care-standards-tribunal-weekly-hearing-list/src/assets/js/search.ts`

**Acceptance Criteria**:
- Search filters hearings correctly
- Search is case-insensitive
- Debouncing works (no lag)
- Clear button works
- Results count updates correctly
- ARIA live regions announce changes
- Progressive enhancement (page works without JS)

---

### Task 3.11: Create Page Controller Tests
**Priority**: High
**Estimated Time**: 2 hours
**Dependencies**: Task 3.7

**Subtasks**:
- [ ] Create test file `index.test.ts`
- [ ] Test valid artefactId handling
- [ ] Test missing artefactId error (400)
- [ ] Test artefact not found error (404)
- [ ] Test JSON file not found error (404)
- [ ] Test validation error handling (400)
- [ ] Test successful rendering (200)
- [ ] Mock Prisma database calls
- [ ] Mock file system reads
- [ ] Achieve >90% code coverage

**Files to Create**:
- `libs/list-types/care-standards-tribunal-weekly-hearing-list/src/pages/index.test.ts`

**Acceptance Criteria**:
- All tests pass
- Code coverage >90%
- Error scenarios covered
- Mock data is realistic

---

### Task 3.12: Create Template Rendering Tests
**Priority**: Medium
**Estimated Time**: 1 hour
**Dependencies**: Task 3.8

**Subtasks**:
- [ ] Create test file `index.njk.test.ts`
- [ ] Test template renders with valid data
- [ ] Test table rows rendered correctly
- [ ] Test important info accordion present
- [ ] Test search form present
- [ ] Test Welsh content renders correctly
- [ ] Use snapshot testing if appropriate

**Files to Create**:
- `libs/list-types/care-standards-tribunal-weekly-hearing-list/src/pages/index.njk.test.ts`

**Acceptance Criteria**:
- Template rendering tests pass
- Snapshot tests (if used) are stable
- Both English and Welsh tested

---

## Phase 4: Integration and Testing (Estimated: 2 days)

### Task 4.1: Create E2E Test - Excel Upload Journey
**Priority**: High
**Estimated Time**: 3 hours
**Dependencies**: Task 2.7, Task 3.7

**Subtasks**:
- [ ] Create `e2e-tests/tests/care-standards-excel-upload.spec.ts`
- [ ] Test complete upload journey (upload → summary → success)
- [ ] Test uploading valid Excel file
- [ ] Test Excel parsing and JSON conversion
- [ ] Test navigation to summary page
- [ ] Test data display on summary page
- [ ] Test confirm button action
- [ ] Test success page display
- [ ] Test action links on success page
- [ ] Use Playwright fixtures

**Files to Create**:
- `e2e-tests/tests/care-standards-excel-upload.spec.ts`
- `e2e-tests/fixtures/valid-hearing-list.xlsx`

**Acceptance Criteria**:
- E2E test passes reliably
- All steps of journey covered
- No flaky tests
- Test fixtures are realistic

---

### Task 4.2: Create E2E Test - Display Page
**Priority**: High
**Estimated Time**: 2 hours
**Dependencies**: Task 3.7

**Subtasks**:
- [ ] Extend E2E test file
- [ ] Test accessing published hearing list
- [ ] Test page header renders correctly
- [ ] Test important info accordion works
- [ ] Test search functionality
- [ ] Test search results filtering
- [ ] Test clear search button
- [ ] Test results count updates
- [ ] Test no results message
- [ ] Test Welsh language toggle
- [ ] Test responsive design (mobile viewport)

**Files to Modify**:
- `e2e-tests/tests/care-standards-excel-upload.spec.ts`

**Acceptance Criteria**:
- All display page features tested
- Search functionality verified
- Welsh language tested
- Mobile responsive tested

---

### Task 4.3: Create E2E Test - Validation Errors
**Priority**: Medium
**Estimated Time**: 2 hours
**Dependencies**: Task 2.7

**Subtasks**:
- [ ] Create test for invalid Excel format
- [ ] Create test for missing columns
- [ ] Create test for invalid date format
- [ ] Create test for empty cells
- [ ] Test error messages display correctly
- [ ] Test error summary component
- [ ] Test form retains data after error
- [ ] Use multiple invalid fixture files

**Files to Create**:
- `e2e-tests/fixtures/invalid-*.xlsx` (various error types)

**Files to Modify**:
- `e2e-tests/tests/care-standards-excel-upload.spec.ts`

**Acceptance Criteria**:
- All validation error scenarios tested
- Error messages are clear
- User can correct errors
- No data loss on error

---

### Task 4.4: Accessibility Testing
**Priority**: High
**Estimated Time**: 2 hours
**Dependencies**: Task 3.8

**Subtasks**:
- [ ] Run axe-core on display page
- [ ] Run axe-core on upload page
- [ ] Run axe-core on summary page
- [ ] Run axe-core on success page
- [ ] Fix any WCAG 2.2 AA violations
- [ ] Test keyboard navigation on all pages
- [ ] Test screen reader announcements (ARIA live regions)
- [ ] Test focus management
- [ ] Verify color contrast ratios
- [ ] Test with assistive technologies (if available)

**Acceptance Criteria**:
- No WCAG 2.2 AA violations
- Keyboard navigation works completely
- ARIA live regions announce correctly
- Focus management is logical
- Color contrast meets standards

---

### Task 4.5: Manual Testing and Bug Fixes
**Priority**: High
**Estimated Time**: 3 hours
**Dependencies**: All previous tasks

**Subtasks**:
- [ ] Test complete user journey manually
- [ ] Test with different Excel file sizes
- [ ] Test with different browsers (Chrome, Firefox, Safari, Edge)
- [ ] Test on different devices (desktop, tablet, mobile)
- [ ] Test Welsh language throughout journey
- [ ] Test error scenarios manually
- [ ] Document any bugs found
- [ ] Fix critical bugs
- [ ] Retest after fixes

**Acceptance Criteria**:
- All critical bugs fixed
- Journey works across browsers
- Journey works on all device sizes
- Welsh language works correctly
- No regression in existing features

---

### Task 4.6: Performance Testing
**Priority**: Medium
**Estimated Time**: 2 hours
**Dependencies**: Task 3.7, Task 2.5

**Subtasks**:
- [ ] Test Excel parsing performance (files with 100, 500, 1000 rows)
- [ ] Measure page load time for display page
- [ ] Measure search performance
- [ ] Test concurrent uploads (if possible)
- [ ] Monitor memory usage during parsing
- [ ] Identify performance bottlenecks
- [ ] Optimize if needed (e.g., streaming, pagination)

**Acceptance Criteria**:
- Excel parsing <5s for 1000 rows
- Display page loads <2s
- Search results appear <100ms
- No memory leaks
- Performance meets requirements

---

## Phase 5: Documentation and Deployment (Estimated: 1 day)

### Task 5.1: Code Review and Refactoring
**Priority**: High
**Estimated Time**: 2 hours
**Dependencies**: All Phase 4 tasks

**Subtasks**:
- [ ] Review all code for consistency
- [ ] Check for code duplication
- [ ] Ensure naming conventions followed
- [ ] Verify error handling is comprehensive
- [ ] Check logging is adequate
- [ ] Refactor as needed
- [ ] Run linter and fix all warnings
- [ ] Format all code with Biome

**Acceptance Criteria**:
- No linting warnings
- Code is consistent and maintainable
- No obvious duplication
- Error handling is robust
- Logging is comprehensive

---

### Task 5.2: Update Documentation
**Priority**: Medium
**Estimated Time**: 2 hours
**Dependencies**: Task 5.1

**Subtasks**:
- [ ] Update README if needed
- [ ] Add inline code comments where needed
- [ ] Document any assumptions or limitations
- [ ] Create user guide for Excel upload (optional)
- [ ] Create Excel template file (optional)
- [ ] Update architecture diagrams (if any)

**Acceptance Criteria**:
- Code is well-documented
- User guide is clear (if created)
- Excel template is accurate (if created)
- Documentation is up to date

---

### Task 5.3: Pre-Deployment Checklist
**Priority**: High
**Estimated Time**: 1 hour
**Dependencies**: All previous tasks

**Subtasks**:
- [ ] All unit tests passing (`yarn test`)
- [ ] All E2E tests passing (`yarn test:e2e`)
- [ ] Linting passes (`yarn lint`)
- [ ] Code formatted (`yarn format`)
- [ ] Build succeeds (`yarn build`)
- [ ] No TypeScript errors
- [ ] Accessibility audit passes
- [ ] Performance testing complete
- [ ] Manual testing complete
- [ ] Code review complete
- [ ] Documentation updated

**Acceptance Criteria**:
- All checks pass
- Ready for deployment
- No blockers identified

---

### Task 5.4: Deployment to Staging
**Priority**: High
**Estimated Time**: 1 hour
**Dependencies**: Task 5.3

**Subtasks**:
- [ ] Build all modules (`yarn build`)
- [ ] Deploy to staging environment
- [ ] Run smoke tests on staging
- [ ] Test Excel upload end-to-end on staging
- [ ] Test display page on staging
- [ ] Verify Welsh language on staging
- [ ] Monitor error logs
- [ ] Fix any staging-specific issues

**Acceptance Criteria**:
- Deployment successful
- Smoke tests pass on staging
- No errors in logs
- All features work on staging

---

### Task 5.5: Production Deployment
**Priority**: High
**Estimated Time**: 1 hour
**Dependencies**: Task 5.4

**Subtasks**:
- [ ] Get approval for production deployment
- [ ] Deploy to production environment
- [ ] Run smoke tests on production
- [ ] Monitor error logs for 1 hour
- [ ] Test critical paths
- [ ] Verify no regressions
- [ ] Document deployment

**Acceptance Criteria**:
- Production deployment successful
- No errors in production logs
- All features work in production
- No performance issues
- Deployment documented

---

### Task 5.6: Post-Deployment Monitoring
**Priority**: Medium
**Estimated Time**: Ongoing (first 24 hours)
**Dependencies**: Task 5.5

**Subtasks**:
- [ ] Monitor application logs
- [ ] Monitor error rates
- [ ] Monitor performance metrics
- [ ] Check for user-reported issues
- [ ] Verify Excel uploads working
- [ ] Verify display pages loading
- [ ] Check search functionality
- [ ] Monitor file storage usage

**Acceptance Criteria**:
- No critical errors in logs
- Error rates within normal range
- Performance metrics acceptable
- No user complaints
- Storage usage normal

---

## Summary

**Total Estimated Time**: 12-13 days (developer time)

**Phase Breakdown**:
- Phase 1 (Foundation): 1 day
- Phase 2 (Excel Parsing): 2 days
- Phase 3 (Display Page): 3 days
- Phase 4 (Integration & Testing): 2 days
- Phase 5 (Documentation & Deployment): 1 day
- Buffer for issues: 2-3 days

**Critical Path**:
1. Foundation setup (Tasks 1.1-1.3)
2. Excel parsing (Tasks 2.1-2.7)
3. Display page (Tasks 3.1-3.10)
4. Integration testing (Tasks 4.1-4.5)
5. Deployment (Tasks 5.3-5.5)

**Key Dependencies**:
- Excel parser must be complete before manual upload extension
- Display page types must be defined before renderer
- All unit tests must pass before E2E tests
- All tests must pass before deployment

**Risk Factors**:
- Excel parsing complexity (may need more time for edge cases)
- Accessibility issues may require refactoring
- Performance issues may require optimization
- Welsh translations may need stakeholder review
- Integration testing may reveal unforeseen issues

**Recommendations**:
1. Start with Phase 1 to establish foundation
2. Implement Phase 2 and Phase 3 in parallel if possible
3. Allocate sufficient time for testing and bug fixes
4. Plan for stakeholder review of Welsh translations
5. Consider creating Excel template for users early
6. Monitor performance throughout development
7. Keep documentation updated as you go
