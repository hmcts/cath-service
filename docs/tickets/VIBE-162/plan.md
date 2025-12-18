# VIBE-162: Upload Excel File in CaTH - Technical Plan

## Overview

This ticket implements a non-strategic publishing route that allows Local Admins to upload files (csv, doc, docx, htm, html, json, pdf) for conversion and publication in CaTH. The feature adds a new page accessible from the Admin Dashboard's second tile "Upload Excel File" (route: `/non-strategic-upload`).

## Technical Approach

### 1. Architecture Strategy

This will be implemented within the existing `libs/admin-pages` module since:
- It's an admin-only feature requiring authentication with `INTERNAL_ADMIN_LOCAL`, `INTERNAL_ADMIN_CTSC`, or `SYSTEM_ADMIN` roles
- The dashboard already has a tile linking to `/non-strategic-upload` (currently non-functional)
- Follows the same pattern as the existing `/manual-upload` feature
- Reuses existing infrastructure (file upload middleware, location autocomplete, session storage)

### 2. High-Level Implementation

The implementation will mirror the existing manual-upload workflow:
1. **Upload Form Page** (`/non-strategic-upload`) - Main file upload form with all required fields
2. **Summary Page** (`/non-strategic-upload-summary`) - Review uploaded details before confirmation
3. **Success Page** (`/non-strategic-upload-success`) - Confirmation of successful upload

### 3. Key Technical Considerations

**File Upload**
- Reuse existing `createFileUpload()` middleware from `@hmcts/web-core`
- Register file upload in `apps/web/src/app.ts` before route registration
- Store uploaded files in session/blob storage for backend transformation to JSON

**Form Data Management**
- Use Express session to persist form data across pages (PRG pattern)
- Session keys namespaced: `req.session.nonStrategicUploadForm`, `req.session.nonStrategicUploadErrors`
- Clear session data on successful completion or new upload start

**Location Autocomplete**
- Reuse existing location autocomplete from `@hmcts/location`
- Minimum 2 characters before triggering suggestions
- Store `locationId` (numeric) in hidden field, display `locationName`

**List Types**
- Use existing `mockListTypes` from `@hmcts/publication`
- Filter for types available for manual uploads
- Dynamic dropdown based on available types in CaTH

**Date Handling**
- Use 3-field date input pattern (day/month/year) from GOV.UK Design System
- Leverage existing `parseDate()` from `@hmcts/web-core`
- Validate date coherence and chronological relationships

**Validation**
- Server-side validation only (no JavaScript required for core functionality)
- Comprehensive error messages with href anchors for accessibility
- Validation reuses patterns from existing manual-upload validation

**Backend Processing**
- File transformation (to JSON) will be handled by backend service (out of scope for this ticket)
- This implementation focuses on the upload interface and session storage

## Implementation Details

### File Structure

All files will be added to `libs/admin-pages/src/`:

```
libs/admin-pages/src/
├── pages/
│   ├── non-strategic-upload/
│   │   ├── index.ts          # GET/POST handlers
│   │   ├── index.njk         # Form template
│   │   ├── en.ts             # English translations
│   │   ├── cy.ts             # Welsh translations
│   │   ├── index.test.ts     # Unit tests
│   │   └── index.njk.test.ts # Template tests
│   ├── non-strategic-upload-summary/
│   │   ├── index.ts
│   │   ├── index.njk
│   │   ├── en.ts
│   │   ├── cy.ts
│   │   ├── index.test.ts
│   │   └── index.njk.test.ts
│   └── non-strategic-upload-success/
│       ├── index.ts
│       ├── index.njk
│       ├── en.ts
│       ├── cy.ts
│       ├── index.test.ts
│       └── index.njk.test.ts
├── non-strategic-upload/
│   ├── model.ts              # TypeScript types
│   ├── validation.ts         # Form validation logic
│   ├── validation.test.ts
│   ├── storage.ts            # Session/blob storage
│   └── storage.test.ts
```

### Components to Create

**1. Data Model** (`libs/admin-pages/src/non-strategic-upload/model.ts`)
```typescript
export type DateInput = {
  day: string;
  month: string;
  year: string;
};

export type NonStrategicUploadFormData = {
  locationId?: string;
  locationName?: string;
  listType?: string;
  hearingStartDate?: DateInput;
  sensitivity?: string;
  language?: string;
  displayFrom?: DateInput;
  displayTo?: DateInput;
};

export type ValidationError = {
  text: string;
  href: string;
};

export const SENSITIVITY_LABELS = {
  PUBLIC: "Public",
  PRIVATE: "Private – all verified users",
  CLASSIFIED: "Classified"
};

export const LANGUAGE_LABELS = {
  ENGLISH: "English",
  WELSH: "Welsh",
  BI_LINGUAL: "Bilingual English/Welsh"
};
```

**2. Validation** (`libs/admin-pages/src/non-strategic-upload/validation.ts`)

Validation rules matching the ticket specification:
- **File**: Required, max 2MB, formats: csv, doc, docx, htm, html, json, pdf
- **Location**: Required, must match existing court/tribunal, minimum 3 characters
- **List Type**: Required, must be valid CaTH manual upload type
- **Hearing Start Date**: Required, valid date (DD/MM/YYYY)
- **Sensitivity**: Required, one of: Public, Private, Classified
- **Language**: Required, one of: English, Welsh, Bilingual
- **Display From**: Required, valid date, today or future
- **Display To**: Required, valid date, same or later than Display From

**3. Storage** (`libs/admin-pages/src/non-strategic-upload/storage.ts`)

Functions to store uploaded file and metadata:
- Store file buffer in blob storage (Azure Blob Storage)
- Store metadata in session for summary page
- Generate unique upload ID for tracking
- Return upload ID for redirect to summary page

**4. Page Controllers**

All controllers follow the pattern:
- Export `GET` and `POST` arrays with `requireRole` middleware first
- Use session for PRG (Post-Redirect-Get) pattern
- Clear session flags appropriately
- Render with locale-specific translations

**5. Templates**

Follow GOV.UK Design System:
- Use GOV.UK Frontend components (file upload, input, select, date input, error summary)
- Two-column layout: form on left (2/3 width), help content on right (1/3 width)
- Warning component at top (exclamation icon + bold text)
- Error summary at top when validation fails
- "Back to top" link at bottom
- Extend `layouts/base-template.njk`

### API Endpoints

No new API endpoints required. The feature uses existing:
- `GET /non-strategic-upload` - Display form
- `POST /non-strategic-upload` - Submit form (with file upload middleware)
- `GET /non-strategic-upload-summary` - Display summary
- `POST /non-strategic-upload-summary` - Confirm upload
- `GET /non-strategic-upload-success` - Display success message

### Database Schema Changes

No database changes required in this phase. File metadata and upload tracking will be handled via:
1. Express session (temporary form data)
2. Blob storage (file content)
3. Backend service will handle transformation and persistence

Note: Future work may require a database table for tracking upload status and history.

### Application Registration

Update `apps/web/src/app.ts` to register file upload middleware:

```typescript
// Register non-strategic upload with file upload middleware
app.post("/non-strategic-upload", (req, res, next) => {
  upload.single("file")(req, res, (err) => {
    if (err) {
      req.fileUploadError = err;
    }
    next();
  });
});
```

Routes are auto-discovered from `libs/admin-pages/src/pages/` via existing registration.

## Error Handling & Edge Cases

### Potential Error Scenarios

1. **File Upload Errors**
   - No file selected: "Select a file to upload"
   - File too large (>2MB): "The selected file must be smaller than 2MB"
   - Invalid file type: "The selected file type is not supported"
   - Multer errors: Caught in middleware, stored in `req.fileUploadError`

2. **Validation Errors**
   - Missing required fields: Field-specific error messages
   - Invalid dates: "Enter a valid [field name] date"
   - Display To before Display From: "'Display to' date must be the same as or later than 'Display from' date"
   - Invalid location: "Enter a court or tribunal name"
   - Invalid list type selection: "Select a list type"

3. **Session Errors**
   - Session expiry: Redirect to sign-in page (handled by auth middleware)
   - Redis connection issues: Graceful degradation with error logging

4. **Authorization Errors**
   - User without admin role: 403 Forbidden via `requireRole` middleware
   - User not authenticated: 401 Unauthorized, redirect to sign-in

### Edge Cases to Handle

1. **Browser Back Button**
   - Preserve form data in session when user navigates back
   - Clear success flags when starting new upload
   - Don't show stale success messages

2. **Duplicate Submissions**
   - Use POST-Redirect-GET pattern to prevent duplicate form submissions
   - Clear form data after successful completion

3. **Partial Form Completion**
   - Store partial data in session
   - Allow user to return and complete form
   - Pre-fill fields with previously entered values

4. **Date Input Variations**
   - Accept 1 or 2 digit day/month (normalize to 2 digits)
   - Validate impossible dates (e.g., 32/01/2024)
   - Validate leap years correctly

5. **Location Autocomplete**
   - Handle locations with special characters (e.g., St. Mary's Court)
   - Handle Welsh location names
   - Gracefully handle no results found

6. **File Upload Race Conditions**
   - Handle slow uploads (large files near 2MB limit)
   - Timeout protection (inherited from Express middleware)

7. **Accessibility Edge Cases**
   - Screen reader announces errors correctly (ARIA labels)
   - Keyboard-only navigation works throughout form
   - Error summary links focus correct field on click

## Acceptance Criteria Mapping

### AC1: Authentication & Access
**Implementation:**
- Use `requireRole([USER_ROLES.INTERNAL_ADMIN_LOCAL, USER_ROLES.INTERNAL_ADMIN_CTSC, USER_ROLES.SYSTEM_ADMIN])` middleware on all routes
- Leverages existing auth from `@hmcts/auth`

**Verification:**
- Unit test: Verify unauthorized users get 403
- E2E test: Sign in as local admin, access page successfully

### AC2: Dashboard Navigation
**Implementation:**
- Dashboard tile already exists at index 1 in `libs/admin-pages/src/pages/admin-dashboard/en.ts`
- Link points to `/non-strategic-upload`
- Route will be registered via `createSimpleRouter`

**Verification:**
- E2E test: Click "Upload Excel File" tile, navigate to form

### AC3: Descriptive Message
**Implementation:**
- Message already in dashboard tile: "Upload an excel file to be converted and displayed on the external facing service on GOV.UK."
- Content in `libs/admin-pages/src/pages/admin-dashboard/en.ts` and `cy.ts`

**Verification:**
- Visual inspection of dashboard

### AC4: Warning Message
**Implementation:**
- Custom warning component at top of form (similar to existing manual-upload)
- Bold text with warning icon
- Content: "Prior to upload you must ensure the file is suitable for publication e.g. redaction of personal data has been done during the production of this file."

**Verification:**
- Template test: Verify warning text present
- E2E test: Verify warning visible on page
- Accessibility test: Verify screen reader announces warning

### AC5: Form Fields
**Implementation:**
- All fields implemented as GOV.UK Design System components
- File upload with descriptive text
- Location autocomplete (reuse from `@hmcts/location`)
- List type dropdown (from `mockListTypes`)
- Date inputs with 3-field pattern and hint text
- Sensitivity and Language dropdowns
- Continue button

**Verification:**
- Unit test: Verify all field IDs and names correct
- Template test: Verify all components render
- E2E test: Fill out complete form successfully

### AC6: Page Help Content
**Implementation:**
- Right-hand column (1/3 width) with help text
- Sections: Lists, Sensitivity (with explanations), Display from, Display to
- Content from en.ts/cy.ts locale files

**Verification:**
- Template test: Verify help content renders
- E2E test: Verify help visible on desktop
- Responsive test: Verify help stacks below form on mobile

### Verification Approach

**Unit Tests** (Vitest)
- Test validation functions with valid/invalid inputs
- Test date parsing and comparison logic
- Test session storage functions
- Test controller handlers with mocked requests
- Coverage target: >80%

**Template Tests** (Vitest + happy-dom)
- Verify all required components present
- Verify error states render correctly
- Verify data pre-filling works

**E2E Tests** (Playwright)
- Full happy path: Sign in → Dashboard → Upload form → Fill fields → Submit → Success
- Error scenarios: Submit empty form, upload invalid file, etc.
- Back navigation: Navigate back, verify data preserved
- Language toggle: Switch to Welsh, verify content changes

**Accessibility Tests** (Axe-core via Playwright)
- WCAG 2.2 AA compliance
- Keyboard navigation: Tab through all fields, submit with Enter
- Screen reader: Verify ARIA labels and error announcements
- Color contrast: Verify all text meets minimum ratios

## Open Questions / Clarifications Needed

### CLARIFICATIONS NEEDED

1. **File Format Discrepancy**
   - Ticket title: "Upload Excel File"
   - Dashboard description: "Upload an excel file"
   - Accepted formats in spec: csv, doc, docx, htm, html, json, pdf
   - **Question:** Why is this called "Excel file upload" when Excel formats (.xls, .xlsx) are NOT in the accepted formats list? Should we accept .xls/.xlsx or change the name to "Non-strategic file upload"?
   - **Assumption for now:** Accept the formats listed in the spec (csv, doc, docx, htm, html, json, pdf) and keep the "Excel" terminology as it may be historical/user-facing naming.

2. **Backend Transformation**
   - Ticket mentions "transformed at the back end to a Json file before publishing"
   - **Question:** Is there an existing backend service/API endpoint for file transformation, or is that out of scope for this ticket?
   - **Assumption for now:** This ticket covers the frontend upload interface only. Backend transformation is separate work.

3. **Blob Storage Configuration**
   - **Question:** What blob storage connection details should be used? Azure Blob Storage connection string in environment variables?
   - **Assumption for now:** Reuse the same storage pattern as manual-upload (check `libs/admin-pages/src/manual-upload/file-storage.ts`).

4. **List Types for Non-Strategic Upload**
   - **Question:** Are the list types for non-strategic upload the same as strategic manual upload, or is there a different subset?
   - **Assumption for now:** Use the same `mockListTypes` filtered for manual upload eligibility.

5. **Success Page Next Steps**
   - **Question:** After successful upload, what should the "Next steps" content be? Should it explain the transformation process timeline?
   - **Assumption for now:** Generic success message directing user back to dashboard or to upload another file.

6. **Welsh Translations**
   - Ticket provides only placeholder text "Welsh placeholder" for all Welsh content
   - **Question:** Should we implement with placeholder text or wait for official translations?
   - **Assumption for now:** Implement with placeholder text matching the pattern in existing pages (e.g., "Placeholder Welsh text for [English text]").

7. **Display From Date - Future Validation**
   - Ticket says "Must be today's date or a future date"
   - **Question:** Should we block past dates completely, or allow admins to backdate publications if needed?
   - **Assumption for now:** Allow today or future dates only, show validation error for past dates.

8. **File Storage Duration**
   - **Question:** How long should uploaded files be retained in blob storage before cleanup?
   - **Assumption for now:** Retain until backend processing completes, then backend service handles cleanup.

9. **Upload ID Generation**
   - **Question:** Should upload IDs follow a specific format (UUID, CUID, sequential)?
   - **Assumption for now:** Use CUID (consistent with Prisma ID generation pattern in codebase).

10. **CTSC vs Local Admin Permissions**
    - Ticket specifies "Local Admin" as the user role
    - Dashboard filtering shows CTSC admins see 4 tiles, Local admins see 3
    - **Question:** Should non-strategic upload be visible to both roles? The second tile is visible to both currently.
    - **Assumption for now:** Both CTSC and Local admins can access non-strategic upload (same as manual upload).
