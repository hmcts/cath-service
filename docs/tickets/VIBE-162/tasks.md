# VIBE-162: Upload Excel File in CaTH - Implementation Tasks

## Implementation Tasks

### Phase 1: Data Models and Validation

- [x] Create `libs/admin-pages/src/non-strategic-upload/model.ts` with TypeScript types
  - [x] Define `NonStrategicUploadFormData` type
  - [x] Define `DateInput` type
  - [x] Define `ValidationError` type
  - [x] Define `SENSITIVITY_LABELS` constant
  - [x] Define `LANGUAGE_LABELS` constant

- [x] Create `libs/admin-pages/src/non-strategic-upload/validation.ts` with validation logic
  - [x] Implement `validateForm()` function
  - [x] Implement file validation (required, size, format)
  - [x] Implement location validation (required, valid ID)
  - [x] Implement list type validation (required, valid selection)
  - [x] Implement date validation helper
  - [x] Implement hearing start date validation
  - [x] Implement sensitivity validation (required)
  - [x] Implement language validation (required)
  - [x] Implement display from validation (required, valid date)
  - [x] Implement display to validation (required, valid date, after display from)

- [x] Create `libs/admin-pages/src/non-strategic-upload/validation.test.ts`
  - [x] Test file validation scenarios
  - [x] Test location validation scenarios
  - [x] Test date validation scenarios
  - [x] Test date comparison logic (display to >= display from)
  - [x] Test all required field validations
  - [x] Test error message formatting

### Phase 2: Storage and Backend Integration

- [x] Create `libs/admin-pages/src/non-strategic-upload/storage.ts`
  - [x] Implement `storeNonStrategicUpload()` function
  - [x] Store file buffer in blob storage
  - [x] Store metadata in appropriate format
  - [x] Generate unique upload ID (CUID)
  - [x] Handle storage errors gracefully

- [x] Create `libs/admin-pages/src/non-strategic-upload/storage.test.ts`
  - [x] Test upload ID generation
  - [x] Test blob storage interaction (mocked)
  - [x] Test metadata serialization
  - [x] Test error handling

### Phase 3: Upload Form Page

- [x] Create `libs/admin-pages/src/pages/non-strategic-upload/en.ts` with English content
  - [x] Add page title and heading
  - [x] Add warning message content
  - [x] Add form field labels and hints
  - [x] Add page help content (Lists, Sensitivity, Display from/to)
  - [x] Add all error messages

- [x] Create `libs/admin-pages/src/pages/non-strategic-upload/cy.ts` with Welsh content (placeholders)

- [x] Create `libs/admin-pages/src/pages/non-strategic-upload/index.ts` controller
  - [x] Implement GET handler with authentication middleware
  - [x] Load form data from session
  - [x] Load errors from session
  - [x] Pre-fill location from query parameter if present
  - [x] Prepare dropdown options (list types, sensitivity, language)
  - [x] Clear session flags appropriately
  - [x] Implement POST handler with authentication middleware
  - [x] Parse form data including date fields
  - [x] Check for Multer file upload errors
  - [x] Validate form data
  - [x] Store form data in session on error
  - [x] Store uploaded file on success
  - [x] Redirect to summary page on success
  - [x] Redirect back to form on error

- [x] Create `libs/admin-pages/src/pages/non-strategic-upload/index.njk` template
  - [x] Extend base template layout
  - [x] Import GOV.UK component macros
  - [x] Add error summary component
  - [x] Add custom warning component with icon
  - [x] Add file upload field in inset text
  - [x] Add location autocomplete input
  - [x] Add list type dropdown
  - [x] Add hearing start date (3-field date input)
  - [x] Add sensitivity dropdown
  - [x] Add language dropdown
  - [x] Add display from date (3-field date input)
  - [x] Add display to date (3-field date input)
  - [x] Add continue button
  - [x] Add page help sidebar (right column)
  - [x] Add "back to top" link
  - [x] Implement error state handling for all fields

- [ ] Create `libs/admin-pages/src/pages/non-strategic-upload/index.test.ts` unit tests
  - [ ] Test GET handler clears session flags
  - [ ] Test GET handler loads form data from session
  - [ ] Test GET handler pre-fills location from query param
  - [ ] Test POST handler validates form data
  - [ ] Test POST handler handles file upload errors
  - [ ] Test POST handler stores data on error
  - [ ] Test POST handler redirects to summary on success
  - [ ] Test authentication middleware is applied

- [ ] Create `libs/admin-pages/src/pages/non-strategic-upload/index.njk.test.ts` template tests
  - [ ] Test all form fields render correctly
  - [ ] Test error summary renders when errors present
  - [ ] Test error states for each field
  - [ ] Test data pre-filling works
  - [ ] Test page help content renders

### Phase 4: Summary Page

- [x] Create `libs/admin-pages/src/pages/non-strategic-upload-summary/en.ts` with English content
  - [x] Add page title and heading
  - [x] Add summary labels (file name, court, list type, dates, etc.)
  - [x] Add confirmation text
  - [x] Add button text (Confirm and Publish, Change answers)

- [x] Create `libs/admin-pages/src/pages/non-strategic-upload-summary/cy.ts` with Welsh content (placeholders)

- [x] Create `libs/admin-pages/src/pages/non-strategic-upload-summary/index.ts` controller
  - [x] Implement GET handler with authentication middleware
  - [x] Load upload data from session using uploadId query param
  - [x] Redirect to form if no upload data found
  - [x] Resolve location name from ID
  - [x] Format dates for display
  - [x] Format sensitivity and language labels
  - [x] Implement POST handler with authentication middleware
  - [x] Mark upload as confirmed
  - [x] Redirect to success page

- [x] Create `libs/admin-pages/src/pages/non-strategic-upload-summary/index.njk` template
  - [x] Extend base template layout
  - [x] Import GOV.UK summary list component
  - [x] Add page heading
  - [x] Display summary list with all upload details
  - [x] Add "Change" links for each row (link back to form)
  - [x] Add warning/information text about publication
  - [x] Add "Confirm and Publish" button
  - [x] Add "Change answers" link back to form

- [ ] Create `libs/admin-pages/src/pages/non-strategic-upload-summary/index.test.ts` unit tests
  - [ ] Test GET handler loads upload data
  - [ ] Test GET handler redirects if no data found
  - [ ] Test POST handler confirms upload
  - [ ] Test POST handler redirects to success
  - [ ] Test authentication middleware is applied

- [ ] Create `libs/admin-pages/src/pages/non-strategic-upload-summary/index.njk.test.ts` template tests
  - [ ] Test summary list renders with all fields
  - [ ] Test change links are correct
  - [ ] Test buttons render correctly

### Phase 5: Success Page

- [x] Create `libs/admin-pages/src/pages/non-strategic-upload-success/en.ts` with English content
  - [x] Add page title and heading
  - [x] Add confirmation panel content
  - [x] Add "what happens next" content
  - [x] Add reference number display
  - [x] Add links (return to dashboard, upload another file)

- [x] Create `libs/admin-pages/src/pages/non-strategic-upload-success/cy.ts` with Welsh content (placeholders)

- [x] Create `libs/admin-pages/src/pages/non-strategic-upload-success/index.ts` controller
  - [x] Implement GET handler with authentication middleware
  - [x] Verify upload confirmation in session
  - [x] Redirect to form if not confirmed
  - [x] Load upload reference/ID from session
  - [x] Clear session data after displaying success
  - [x] Prevent page refresh showing stale success message

- [x] Create `libs/admin-pages/src/pages/non-strategic-upload-success/index.njk` template
  - [x] Extend base template layout
  - [x] Import GOV.UK panel component
  - [x] Add success panel with reference number
  - [x] Add "what happens next" content
  - [x] Add link to admin dashboard
  - [x] Add link to upload another file

- [ ] Create `libs/admin-pages/src/pages/non-strategic-upload-success/index.test.ts` unit tests
  - [ ] Test GET handler verifies confirmation
  - [ ] Test GET handler redirects if not confirmed
  - [ ] Test GET handler clears session
  - [ ] Test authentication middleware is applied

- [ ] Create `libs/admin-pages/src/pages/non-strategic-upload-success/index.njk.test.ts` template tests
  - [ ] Test success panel renders
  - [ ] Test reference number displays
  - [ ] Test links render correctly

### Phase 6: Application Integration

- [x] Update `apps/web/src/app.ts`
  - [x] Register file upload middleware for `/non-strategic-upload` POST route
  - [x] Add error handling for file upload errors (store in `req.fileUploadError`)

- [x] Verify admin dashboard tile links to `/non-strategic-upload` correctly
  - [x] Check English dashboard content
  - [x] Check Welsh dashboard content

### Phase 7: Testing and Quality Assurance

- [x] Run all unit tests and verify coverage >80%
  - [x] `yarn test libs/admin-pages/src/non-strategic-upload`
  - [x] `yarn test libs/admin-pages/src/pages/non-strategic-upload`

- [ ] Create E2E tests in `e2e-tests/`
  - [ ] Test: Sign in as local admin, navigate to non-strategic upload
  - [ ] Test: Submit empty form, verify all validation errors
  - [ ] Test: Upload file too large, verify error
  - [ ] Test: Upload invalid file type, verify error
  - [ ] Test: Fill valid form, submit, verify summary page
  - [ ] Test: Confirm upload, verify success page
  - [ ] Test: Navigate back from summary, verify form data preserved
  - [ ] Test: Language toggle works on all pages

- [ ] Accessibility testing
  - [ ] Run Axe-core via Playwright on all three pages
  - [ ] Test keyboard-only navigation (Tab, Enter, Shift+Tab)
  - [ ] Test with screen reader (VoiceOver/NVDA)
  - [ ] Verify error summary links focus correct fields
  - [ ] Verify all form labels and ARIA attributes correct
  - [ ] Verify color contrast meets WCAG AA standards

- [ ] Visual regression testing
  - [ ] Test on desktop (1920x1080, 1366x768)
  - [ ] Test on tablet (768px width)
  - [ ] Test on mobile (375px, 320px widths)
  - [ ] Test error states render correctly
  - [ ] Test long content doesn't break layout

- [ ] Code quality checks
  - [ ] Run `yarn lint:fix` and fix any issues
  - [ ] Run `yarn format` to format code
  - [ ] Verify TypeScript strict mode passes
  - [ ] Verify no console errors or warnings

### Phase 8: Documentation and Deployment

- [ ] Update documentation if needed
  - [ ] Add comments to complex validation logic
  - [ ] Document session key usage
  - [ ] Document blob storage integration

- [ ] Create PR with comprehensive description
  - [ ] List all changes
  - [ ] Include screenshots of all pages
  - [ ] Document testing performed
  - [ ] Note any open questions or follow-up work needed
