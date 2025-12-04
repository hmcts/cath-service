# VIBE-166: Implementation Tasks

**Schema Reference:** `https://github.com/hmcts/pip-data-management/blob/master/src/main/resources/schemas/non-strategic/cst_weekly_hearing_list.json`

## Implementation Tasks

### 1. Module Setup
- [x] Create new module directory: `libs/list-types/care-standards-tribunal-weekly-hearing-list/`
- [x] Create `package.json` with build scripts and dependencies
- [x] Create `tsconfig.json` with proper configuration
- [x] Register module in root `tsconfig.json` paths
- [x] Create `src/config.ts` for module configuration exports
- [x] Create `src/index.ts` for business logic exports

### 2. List Type Registration
- [x] Add Care Standards Tribunal Weekly Hearing List to `libs/list-types/common/src/mock-list-types.ts`
- [x] Set ID to 9, name to `CARE_STANDARDS_TRIBUNAL_WEEKLY_HEARING_LIST`
- [x] Set urlPath to `care-standards-tribunal-weekly-hearing-list`
- [x] Set provenance to `MANUAL_UPLOAD`

### 3. JSON Schema Creation
- [x] Copy schema from pip-data-management to `src/schemas/care-standards-tribunal-weekly-hearing-list.json`
- [x] Schema defines array of hearing objects, each with 6 required fields
- [x] Fields: date (dd/MM/yyyy pattern), caseName, hearingLength, hearingType, venue, additionalInformation
- [x] All text fields include HTML tag validation pattern for XSS protection
- [x] Date field includes regex pattern: `^\\d{2}/\\d{2}/\\d{4}$`

### 4. TypeScript Types
- [x] Create `src/models/types.ts`
- [x] Define `CareStandardsTribunalHearing` interface with 6 string fields
- [x] date: string (dd/MM/yyyy format)
- [x] caseName, hearingLength, hearingType, venue, additionalInformation: string
- [x] Export type as array: `CareStandardsTribunalHearing[]`

### 5. JSON Validation
- [x] Create `src/validation/json-validator.ts`
- [x] Implement `validateCareStandardsTribunalList()` function
- [x] Use Ajv library for JSON schema validation
- [x] Return validation result with isValid flag and errors array
- [x] Create `src/validation/json-validator.test.ts` with unit tests

### 6. Excel-to-JSON Conversion
- [x] Create `src/conversion/excel-to-json.ts`
- [x] Implement `convertExcelToJson(buffer: Buffer): Promise<CareStandardsTribunalHearing[]>`
- [x] Parse Excel buffer using xlsx library and read first worksheet
- [x] Validate Excel headers match expected columns (case-insensitive)
- [x] Expected: "Date", "Case name", "Hearing length", "Hearing type", "Venue", "Additional information"
- [x] Transform each row to hearing object with camelCase field names
- [x] Validate date field matches `dd/MM/yyyy` pattern (e.g., "02/01/2025")
- [x] Keep date in dd/MM/yyyy format (DO NOT transform to readable format yet)
- [x] Validate all text fields do not contain HTML tags (XSS protection)
- [x] Handle empty cells and throw error for missing required fields
- [x] Throw descriptive errors with row numbers for invalid data
- [x] Create `src/conversion/excel-to-json.test.ts` with unit tests

### 7. Rendering Logic
- [x] Create `src/rendering/renderer.ts`
- [x] Implement `renderCareStandardsTribunalData()` function
- [x] Transform JSON data to view model
- [x] Format header with list title, duration, last updated (from artefact metadata)
- [x] Transform date format from dd/MM/yyyy to "d MMMM yyyy" for display (e.g., "02/01/2025" → "2 January 2025")
- [x] Format hearings array for table display with all 6 columns
- [x] Create `src/rendering/renderer.test.ts` with unit tests

### 8. Content Files
- [x] Create `src/pages/en.ts` with English content
- [x] Add page title, headings, labels, button text
- [x] Add Important Information accordion content with email and GOV.UK link
- [x] Add table column headers
- [x] Create `src/pages/cy.ts` with Welsh placeholder content
- [x] Mirror English structure with "Welsh placeholder" strings

### 9. Display Page Controller
- [x] Create `src/pages/index.ts`
- [x] Implement GET handler
- [x] Retrieve artefactId from query params
- [x] Fetch artefact from database
- [x] Read JSON file from storage
- [x] Validate JSON against schema
- [x] Call renderer to transform data
- [x] Render template with data
- [x] Handle errors (404 for missing artefact, 400 for validation errors)

### 10. Display Page Template
- [x] Create `src/pages/care-standards-tribunal-weekly-hearing-list.njk`
- [x] Extend base template layout
- [x] Add page title and header section with duration and last updated
- [x] Add Important Information details component (accordion)
- [x] Include email (cst@justice.gov.uk) and GOV.UK link
- [x] Add Search Cases input field
- [x] Render govukTable with 6 columns matching Excel fields
- [x] Add data source footer text
- [x] Add Back to top link
- [x] Include client-side search JavaScript with highlighting

### 11. Integration with Upload Summary
- [x] Modify `libs/admin-pages/src/pages/non-strategic-upload-summary/index.ts`
- [x] In POST handler, detect if listTypeId === 9 (Care Standards Tribunal)
- [x] Import and call `convertExcelToJson(buffer)` with Excel buffer only
- [x] Import and call `validateCareStandardsTribunalList()` on converted JSON array
- [x] Handle conversion/validation errors and display user-friendly messages on summary page
- [x] Save both original Excel file and converted JSON file to storage with same artefactId
- [x] Keep existing success redirect flow

### 12. Application Registration
- [x] Register page routes in `apps/web/src/app.ts`
- [x] Import pageRoutes from CST module config
- [x] Add to createSimpleRouter call
- [x] Verify routing works for `/care-standards-tribunal-weekly-hearing-list?artefactId=...`

### 13. Testing
- [x] Write unit tests for Excel-to-JSON conversion:
  - [x] Valid Excel with correct headers and data
  - [x] Invalid headers (missing or misnamed columns)
  - [x] Invalid dates (wrong format, e.g., "2025-01-01", "1/1/2025", "32/01/2025")
  - [x] HTML tags in fields (XSS protection test)
  - [x] Empty file (no data rows)
  - [x] Missing required fields (empty cells)
- [x] Write unit tests for JSON validation (valid JSON, missing fields, invalid patterns)
- [x] Write unit tests for renderer (data transformation, date formatting from dd/MM/yyyy to d MMMM yyyy)
- [ ] Write unit tests for page controller (success case, missing artefact, invalid JSON)
- [x] Create E2E test for full upload flow: upload Excel → verify summary → submit → verify success
- [x] Create E2E test for Excel validation on upload page (missing fields, invalid dates, HTML tags)
- [x] Create E2E test for display page: navigate to list → verify headers → verify table → test search
- [x] Create E2E test for important information accordion: open accordion → verify content
- [x] Create E2E test for search functionality with highlighting
- [x] Create E2E test for data source display (Manual upload)
- [x] Create E2E test for keyboard navigation throughout flow
- [x] Create E2E test for Welsh language support
- [x] Run accessibility audit with axe-core on upload form, error page, and display page

### 14. Error Handling
- [x] Add error handling for invalid Excel headers (missing or misnamed columns)
- [x] Add error handling for invalid date formats in Excel (must be dd/MM/yyyy)
- [x] Add error handling for HTML tags in any field (XSS protection)
- [x] Add error handling for empty Excel files (no data rows)
- [x] Add error handling for missing required fields (empty cells)
- [x] Add error handling for JSON validation failures
- [x] Add error handling for missing JSON files on display
- [x] Add user-friendly error messages on summary page with row/column details

### 15. Documentation
- [x] Update module README if needed
- [x] Add JSDoc comments to public functions
- [x] Document Excel file format requirements

### 16. Build and Deploy
- [x] Run `yarn build` to verify module builds successfully
- [x] Run `yarn test` to verify all tests pass
- [x] Run `yarn lint:fix` to fix any linting issues
- [x] Verify Nunjucks templates are copied to dist/ folder
- [ ] Test in local development environment
- [ ] Verify file upload, summary, success, and display pages work end-to-end
