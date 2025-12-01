# VIBE-162: Excel Upload – Implementation Tasks

## Overview

This document breaks down the implementation of the Excel upload form into discrete, testable tasks. Tasks are ordered by dependency and complexity.

## Prerequisites

- [ ] Review specification.md and plan.md
- [ ] Ensure local development environment is running
- [ ] Familiarize with existing manual-upload implementation

## Phase 1: Data Models and Types

### Task 1.1: Create Excel Upload Model

**File**: `libs/admin-pages/src/excel-upload/model.ts`

**Acceptance Criteria**:
- [ ] Create `ExcelUploadFormData` interface
- [ ] Create `ValidationError` interface
- [ ] Define `SENSITIVITY_LABELS` constant
- [ ] Define `LANGUAGE_LABELS` constant
- [ ] Add session type augmentation for `excelUploadForm`, `excelUploadErrors`, `excelUploadSubmitted`
- [ ] Import types from `@hmcts/publication` and `@hmcts/web-core`

**Estimated Time**: 15 minutes

**Testing**:
- [ ] TypeScript compiles without errors
- [ ] Types are properly exported

---

## Phase 2: Validation Logic

### Task 2.1: Create Validation Functions

**File**: `libs/admin-pages/src/excel-upload/validation.ts`

**Acceptance Criteria**:
- [ ] Create `validateForm()` function
- [ ] Implement file validation (required, size, type)
- [ ] Implement location validation (required, format)
- [ ] Implement list type validation
- [ ] Implement date validation (hearing start date, display from, display to)
- [ ] Implement sensitivity validation
- [ ] Implement language validation
- [ ] Implement date comparison validation (displayTo >= displayFrom)
- [ ] Create `validateDate()` helper function
- [ ] Export types and functions

**Estimated Time**: 45 minutes

**Testing**:
- [ ] TypeScript compiles without errors
- [ ] All validation functions return correct error format

---

### Task 2.2: Create Validation Tests

**File**: `libs/admin-pages/src/excel-upload/validation.test.ts`

**Acceptance Criteria**:
- [ ] Test file required validation
- [ ] Test file size validation (>2MB)
- [ ] Test file type validation (invalid extensions)
- [ ] Test location required validation
- [ ] Test location format validation (non-numeric ID)
- [ ] Test list type required validation
- [ ] Test hearing start date validation (missing, invalid format)
- [ ] Test sensitivity required validation
- [ ] Test language required validation
- [ ] Test display from date validation
- [ ] Test display to date validation
- [ ] Test date comparison validation (displayTo < displayFrom)
- [ ] Test valid form data returns no errors
- [ ] Test `validateDate()` helper function edge cases

**Estimated Time**: 60 minutes

**Testing**:
- [ ] Run `yarn test validation.test.ts` - all tests pass
- [ ] Code coverage >80% on validation.ts

---

## Phase 3: Storage Logic

### Task 3.1: Create Storage Functions

**File**: `libs/admin-pages/src/excel-upload/storage.ts`

**Acceptance Criteria**:
- [ ] Create `ExcelUploadData` interface
- [ ] Create `storeExcelUpload()` function
- [ ] Generate unique upload ID using `crypto.randomUUID()`
- [ ] Return upload ID for summary page

**Estimated Time**: 15 minutes

**Testing**:
- [ ] TypeScript compiles without errors
- [ ] Function returns valid UUID

---

### Task 3.2: Create Storage Tests

**File**: `libs/admin-pages/src/excel-upload/storage.test.ts`

**Acceptance Criteria**:
- [ ] Test `storeExcelUpload()` returns UUID
- [ ] Test UUID format is valid
- [ ] Test function accepts all required data fields

**Estimated Time**: 20 minutes

**Testing**:
- [ ] Run `yarn test storage.test.ts` - all tests pass

---

## Phase 4: Translation Content

### Task 4.1: Create English Translations

**File**: `libs/admin-pages/src/pages/excel-upload/en.ts`

**Acceptance Criteria**:
- [ ] Export `en` object with all page content
- [ ] Include all form labels and hints
- [ ] Include all page help content
- [ ] Include all error messages
- [ ] Match specification.md content exactly

**Estimated Time**: 30 minutes

**Testing**:
- [ ] TypeScript compiles without errors
- [ ] All required keys present
- [ ] Content matches specification

---

### Task 4.2: Create Welsh Translations

**File**: `libs/admin-pages/src/pages/excel-upload/cy.ts`

**Acceptance Criteria**:
- [ ] Export `cy` object with all page content
- [ ] Include all form labels and hints (Welsh)
- [ ] Include all page help content (Welsh)
- [ ] Include all error messages (Welsh)
- [ ] Match specification.md content exactly
- [ ] Structure matches `en.ts` exactly

**Estimated Time**: 30 minutes

**Testing**:
- [ ] TypeScript compiles without errors
- [ ] All keys match `en.ts` structure
- [ ] Content matches specification

---

## Phase 5: Page Controller

### Task 5.1: Create GET Handler

**File**: `libs/admin-pages/src/pages/excel-upload/index.ts`

**Acceptance Criteria**:
- [ ] Create `getHandler` function
- [ ] Retrieve form data from session
- [ ] Retrieve errors from session
- [ ] Clear errors from session after retrieval
- [ ] Support location pre-filling via query parameter
- [ ] Resolve location name from ID if available
- [ ] Build dropdown options (list types, sensitivity, language)
- [ ] Mark selected values in dropdowns
- [ ] Render template with all data
- [ ] Clear form data if not previously submitted

**Estimated Time**: 45 minutes

**Testing**:
- [ ] TypeScript compiles without errors
- [ ] Function signature matches RequestHandler
- [ ] All template variables provided

---

### Task 5.2: Create POST Handler

**File**: `libs/admin-pages/src/pages/excel-upload/index.ts`

**Acceptance Criteria**:
- [ ] Create `postHandler` function
- [ ] Transform request body to `ExcelUploadFormData`
- [ ] Parse date inputs from separate day/month/year fields
- [ ] Check for multer file upload errors
- [ ] Validate form data
- [ ] Handle file size errors from multer
- [ ] Store errors and form data in session on validation failure
- [ ] Redirect to GET on validation failure (PRG pattern)
- [ ] Store upload data via `storeExcelUpload()` on success
- [ ] Mark form as submitted in session
- [ ] Redirect to summary page with upload ID

**Estimated Time**: 45 minutes

**Testing**:
- [ ] TypeScript compiles without errors
- [ ] Function signature matches RequestHandler
- [ ] Redirects work correctly

---

### Task 5.3: Create Controller Exports

**File**: `libs/admin-pages/src/pages/excel-upload/index.ts`

**Acceptance Criteria**:
- [ ] Export `GET` as array with auth middleware and handler
- [ ] Export `POST` as array with auth middleware and handler
- [ ] Use `requireRole()` with SYSTEM_ADMIN, INTERNAL_ADMIN_CTSC, INTERNAL_ADMIN_LOCAL
- [ ] Import all dependencies

**Estimated Time**: 15 minutes

**Testing**:
- [ ] TypeScript compiles without errors
- [ ] Exports match expected format

---

### Task 5.4: Create Controller Tests

**File**: `libs/admin-pages/src/pages/excel-upload/index.test.ts`

**Acceptance Criteria**:
- [ ] Test GET handler renders form on first visit
- [ ] Test GET handler displays errors from session
- [ ] Test GET handler clears errors after display
- [ ] Test GET handler preserves form data on error
- [ ] Test GET handler pre-fills location from query parameter
- [ ] Test POST handler redirects on validation error
- [ ] Test POST handler stores errors in session
- [ ] Test POST handler stores form data in session
- [ ] Test POST handler redirects to summary on success
- [ ] Test POST handler handles multer errors

**Estimated Time**: 60 minutes

**Testing**:
- [ ] Run `yarn test index.test.ts` - all tests pass
- [ ] Code coverage >80% on controller

---

## Phase 6: Nunjucks Template

### Task 6.1: Create Base Template Structure

**File**: `libs/admin-pages/src/pages/excel-upload/index.njk`

**Acceptance Criteria**:
- [ ] Extend `layouts/base-template.njk`
- [ ] Import all required GOV.UK macros
- [ ] Define `pageTitle` block
- [ ] Define `page_content` block
- [ ] Create `getError` macro for error extraction

**Estimated Time**: 15 minutes

**Testing**:
- [ ] Template compiles without errors
- [ ] Basic structure renders

---

### Task 6.2: Add Error Summary and Warning

**File**: `libs/admin-pages/src/pages/excel-upload/index.njk`

**Acceptance Criteria**:
- [ ] Add `govukErrorSummary` component (conditional on errors)
- [ ] Add custom warning banner with icon
- [ ] Use `manual-upload-warning` CSS classes
- [ ] Display warning title and message

**Estimated Time**: 15 minutes

**Testing**:
- [ ] Warning displays correctly
- [ ] Error summary displays when errors present

---

### Task 6.3: Add Form and File Upload

**File**: `libs/admin-pages/src/pages/excel-upload/index.njk`

**Acceptance Criteria**:
- [ ] Add form tag with POST method and multipart encoding
- [ ] Add file upload input wrapped in `govuk-inset-text`
- [ ] Add file upload label
- [ ] Add error message display for file field
- [ ] Apply error styling conditionally

**Estimated Time**: 20 minutes

**Testing**:
- [ ] File input renders correctly
- [ ] Error styling applied when errors present

---

### Task 6.4: Add Court Autocomplete Field

**File**: `libs/admin-pages/src/pages/excel-upload/index.njk`

**Acceptance Criteria**:
- [ ] Add `govukInput` for court field
- [ ] Add autocomplete data attributes
- [ ] Add error message display
- [ ] Pre-fill location name if available
- [ ] Store location ID in data attribute

**Estimated Time**: 15 minutes

**Testing**:
- [ ] Autocomplete attributes present
- [ ] Error styling applied when errors present
- [ ] Value pre-fills correctly

---

### Task 6.5: Add List Type and Hearing Date Section

**File**: `libs/admin-pages/src/pages/excel-upload/index.njk`

**Acceptance Criteria**:
- [ ] Wrap in `govuk-inset-text`
- [ ] Add `govukSelect` for list type
- [ ] Add `govukDateInput` for hearing start date
- [ ] Add day/month/year labels
- [ ] Add hint text
- [ ] Add error messages for both fields
- [ ] Pre-fill values from form data

**Estimated Time**: 25 minutes

**Testing**:
- [ ] Inset text styling applied
- [ ] Both fields render correctly
- [ ] Error styling applied when errors present
- [ ] Values pre-fill correctly

---

### Task 6.6: Add Sensitivity and Language Fields

**File**: `libs/admin-pages/src/pages/excel-upload/index.njk`

**Acceptance Criteria**:
- [ ] Add `govukSelect` for sensitivity
- [ ] Add `govukSelect` for language
- [ ] Add error messages for both fields
- [ ] Pre-fill selected values

**Estimated Time**: 15 minutes

**Testing**:
- [ ] Both dropdowns render correctly
- [ ] Error styling applied when errors present
- [ ] Selected values marked correctly

---

### Task 6.7: Add Display Date Fields

**File**: `libs/admin-pages/src/pages/excel-upload/index.njk`

**Acceptance Criteria**:
- [ ] Add `govukDateInput` for display from
- [ ] Add `govukDateInput` for display to
- [ ] Add day/month/year labels for both
- [ ] Add hint text for both
- [ ] Add error messages for both fields
- [ ] Pre-fill values from form data

**Estimated Time**: 25 minutes

**Testing**:
- [ ] Both date inputs render correctly
- [ ] Error styling applied when errors present
- [ ] Values pre-fill correctly

---

### Task 6.8: Add Submit Button and Page Help

**File**: `libs/admin-pages/src/pages/excel-upload/index.njk`

**Acceptance Criteria**:
- [ ] Add `govukButton` for continue
- [ ] Add page help sidebar in grid column
- [ ] Add all help section headings and content
- [ ] Add "Back to top" link at bottom

**Estimated Time**: 20 minutes

**Testing**:
- [ ] Button renders correctly
- [ ] Page help displays in sidebar
- [ ] Layout is two-thirds/one-third

---

### Task 6.9: Create Template Tests

**File**: `libs/admin-pages/src/pages/excel-upload/index.njk.test.ts`

**Acceptance Criteria**:
- [ ] Test template renders without errors
- [ ] Test all form fields present
- [ ] Test error summary displays with errors
- [ ] Test inline errors display correctly
- [ ] Test form values pre-fill correctly
- [ ] Test page help content displays

**Estimated Time**: 45 minutes

**Testing**:
- [ ] Run `yarn test index.njk.test.ts` - all tests pass

---

## Phase 7: Application Integration

### Task 7.1: Register File Upload Middleware

**File**: `apps/web/src/app.ts`

**Acceptance Criteria**:
- [ ] Add multer middleware registration for `/excel-upload` POST route
- [ ] Place BEFORE admin routes registration
- [ ] Handle multer errors by storing in `req.fileUploadError`
- [ ] Use existing `upload` constant from manual-upload

**Estimated Time**: 10 minutes

**Testing**:
- [ ] Application starts without errors
- [ ] Middleware registered at correct point

---

### Task 7.2: Verify Route Auto-Discovery

**File**: N/A (verification task)

**Acceptance Criteria**:
- [ ] Start development server
- [ ] Navigate to `/excel-upload`
- [ ] Verify page loads
- [ ] Verify authentication required

**Estimated Time**: 10 minutes

**Testing**:
- [ ] Page accessible with authentication
- [ ] Redirects to login without authentication

---

## Phase 8: End-to-End Testing

### Task 8.1: Manual Testing - Happy Path

**Acceptance Criteria**:
- [ ] Navigate to `/excel-upload` as authenticated admin user
- [ ] Upload valid file (PDF, <2MB)
- [ ] Select court from autocomplete
- [ ] Select list type
- [ ] Enter valid hearing start date
- [ ] Select sensitivity
- [ ] Select language
- [ ] Enter valid display from date (today)
- [ ] Enter valid display to date (after display from)
- [ ] Click Continue
- [ ] Verify redirect to summary page (will 404 until VIBE-166)

**Estimated Time**: 15 minutes

**Testing**:
- [ ] All steps complete successfully
- [ ] Form data persists correctly

---

### Task 8.2: Manual Testing - Validation Errors

**Acceptance Criteria**:
- [ ] Submit form with no file - verify error
- [ ] Submit form with large file (>2MB) - verify error
- [ ] Submit form with invalid file type (.exe) - verify error
- [ ] Submit form without selecting court - verify error
- [ ] Submit form without list type - verify error
- [ ] Submit form with invalid dates - verify error
- [ ] Submit form with displayTo before displayFrom - verify error
- [ ] Verify error summary displays
- [ ] Verify inline errors display
- [ ] Verify form values persist after error

**Estimated Time**: 30 minutes

**Testing**:
- [ ] All validation errors display correctly
- [ ] Error messages match specification
- [ ] Form values preserved

---

### Task 8.3: Manual Testing - Court Autocomplete

**Acceptance Criteria**:
- [ ] Type 1 character - verify no results
- [ ] Type 2 characters - verify results appear
- [ ] Select a court - verify location ID stored
- [ ] Submit form - verify location name preserved
- [ ] Return to form - verify location name displays

**Estimated Time**: 15 minutes

**Testing**:
- [ ] Autocomplete works as expected
- [ ] Location data persists correctly

---

### Task 8.4: Manual Testing - Welsh Language

**Acceptance Criteria**:
- [ ] Navigate to `/excel-upload?lng=cy`
- [ ] Verify all content displays in Welsh
- [ ] Verify form labels in Welsh
- [ ] Verify page help in Welsh
- [ ] Submit form with errors
- [ ] Verify error messages in Welsh

**Estimated Time**: 15 minutes

**Testing**:
- [ ] All Welsh content displays correctly
- [ ] Content matches specification

---

### Task 8.5: Accessibility Testing

**Acceptance Criteria**:
- [ ] Run axe-core accessibility scan
- [ ] Verify no violations
- [ ] Test keyboard navigation through form
- [ ] Test with screen reader (basic)
- [ ] Verify focus indicators visible
- [ ] Verify error messages announced

**Estimated Time**: 30 minutes

**Testing**:
- [ ] No axe-core violations
- [ ] Keyboard navigation works
- [ ] WCAG 2.2 AA compliant

---

### Task 8.6: Create Playwright E2E Tests

**File**: `e2e-tests/specs/excel-upload.spec.ts`

**Acceptance Criteria**:
- [ ] Test: Admin can access excel upload form
- [ ] Test: Form shows validation errors on empty submit
- [ ] Test: File upload accepts valid file
- [ ] Test: Court autocomplete works
- [ ] Test: Form redirects to summary on valid submit
- [ ] Test: Form is accessible (axe-core)
- [ ] Test: Welsh language toggle works

**Estimated Time**: 60 minutes

**Testing**:
- [ ] Run `yarn test:e2e excel-upload.spec.ts` - all tests pass

---

## Phase 9: Documentation and Cleanup

### Task 9.1: Update Package.json

**File**: `libs/admin-pages/package.json`

**Acceptance Criteria**:
- [ ] Verify build scripts include Nunjucks copy
- [ ] Verify dependencies are correct
- [ ] Run `yarn build` in admin-pages
- [ ] Verify dist/ contains templates

**Estimated Time**: 10 minutes

**Testing**:
- [ ] Build completes successfully
- [ ] Templates copied to dist/

---

### Task 9.2: Code Quality Checks

**Acceptance Criteria**:
- [ ] Run `yarn lint:fix` - no errors
- [ ] Run `yarn format` - all files formatted
- [ ] Run `yarn test` - all tests pass
- [ ] Run `yarn build` - builds successfully

**Estimated Time**: 15 minutes

**Testing**:
- [ ] All quality checks pass

---

### Task 9.3: Update Documentation

**Acceptance Criteria**:
- [ ] Add entry to admin-pages README (if exists)
- [ ] Document any new environment variables (none expected)
- [ ] Document any new dependencies (none expected)

**Estimated Time**: 15 minutes

**Testing**:
- [ ] Documentation is clear and accurate

---

## Phase 10: Review and Deployment

### Task 10.1: Self-Review

**Acceptance Criteria**:
- [ ] Review all code for consistency with manual-upload patterns
- [ ] Verify all file paths use `.js` extensions in imports
- [ ] Verify all tests pass
- [ ] Verify accessibility compliance
- [ ] Verify Welsh translations complete and accurate
- [ ] Verify error messages match specification

**Estimated Time**: 30 minutes

**Testing**:
- [ ] Code review checklist complete

---

### Task 10.2: Create Pull Request

**Acceptance Criteria**:
- [ ] Create feature branch
- [ ] Commit all changes with clear messages
- [ ] Push to remote
- [ ] Create PR with description linking to VIBE-162
- [ ] Add screenshots of form
- [ ] Add test results summary

**Estimated Time**: 20 minutes

**Testing**:
- [ ] PR created successfully

---

### Task 10.3: Address Review Feedback

**Acceptance Criteria**:
- [ ] Respond to all reviewer comments
- [ ] Make requested changes
- [ ] Re-run tests after changes
- [ ] Update PR with changes

**Estimated Time**: Variable (60-120 minutes)

**Testing**:
- [ ] All review feedback addressed

---

## Summary

**Total Estimated Time**: 14-16 hours

**Task Breakdown**:
- Phase 1 (Models): 15 min
- Phase 2 (Validation): 105 min
- Phase 3 (Storage): 35 min
- Phase 4 (Translations): 60 min
- Phase 5 (Controller): 165 min
- Phase 6 (Template): 195 min
- Phase 7 (Integration): 20 min
- Phase 8 (E2E Testing): 180 min
- Phase 9 (Documentation): 40 min
- Phase 10 (Review): 110-170 min

**Testing Coverage**:
- Unit tests: validation.test.ts, storage.test.ts, index.test.ts
- Template tests: index.njk.test.ts
- E2E tests: excel-upload.spec.ts
- Manual testing: All user flows
- Accessibility testing: axe-core + keyboard navigation

**Definition of Done**:
- [ ] All tasks completed
- [ ] All tests passing
- [ ] Code reviewed and approved
- [ ] Welsh translations verified
- [ ] Accessibility compliance verified
- [ ] Documentation updated
- [ ] PR merged to main branch
- [ ] Feature deployed to development environment

**Notes**:
- Times are estimates for an experienced developer familiar with the codebase
- Add 25-50% buffer for unexpected issues
- Some tasks can be done in parallel (e.g., translations while working on controller)
- E2E tests may be skipped if summary page (VIBE-166) is not yet implemented
