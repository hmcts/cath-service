# VIBE-166: Excel Upload - Care Standards Tribunal Weekly Hearing List

## Overview
Complete the Excel upload journey for the Care Standards Tribunal Weekly Hearing List, including summary page, success page, Excel-to-JSON transformation, and front-end display page.

## Problem Statement
The manual upload process currently supports JSON files. This ticket extends it to support Excel file uploads specifically for the Care Standards Tribunal Weekly Hearing List. The Excel file needs to be parsed, validated, converted to JSON, and displayed in a public-facing page.

## User Story
**As an** internal admin user
**I want to** upload an Excel file containing hearing list data
**So that** it can be published and displayed on the Care Standards Tribunal Weekly Hearing List public page

## Pre-Conditions
1. Admin user is authenticated with appropriate role (SYSTEM_ADMIN or INTERNAL_ADMIN_CTSC)
2. Excel file contains valid data matching the expected schema
3. Location (court) exists in the location master reference data
4. List type "Care Standards Tribunal Weekly Hearing List" is registered in the system

## Technical Requirements

### 1. Summary Page Specification

**URL**: `/manual-upload-summary?uploadId={uuid}`

**Purpose**: Display uploaded file details with ability to change any field before final submission

**Components**:
- Page title: "Check your answers before uploading the file"
- Summary list with change links for each field:
  - Court name
  - File
  - List type
  - Hearing start date
  - Sensitivity
  - Language
  - Display file dates
- "Confirm and upload" button to complete upload

**Data Requirements**:
- Retrieve upload data from Redis session using uploadId
- Display location name (with Welsh translation if applicable)
- Display list type friendly name (with Welsh translation if applicable)
- Format dates appropriately (dd/MM/yyyy for dates, date ranges for display period)
- Show sensitivity and language with human-readable labels

**Change Link Behavior**:
- Each "Change" link redirects back to `/manual-upload` with uploadId preserved
- Session data is retained so form can be pre-populated
- After changing values, user returns to summary page

**Validation**:
- Verify uploadId exists in session
- Verify all required fields are present
- Render error if upload data not found

**Welsh Language Support**:
- All labels and button text in both English and Welsh
- Query parameter `?lng=cy` switches to Welsh

### 2. Success Page Specification

**URL**: `/manual-upload-success`

**Purpose**: Confirm successful upload and provide next actions

**Components**:
- Green success banner: "Success - Your file has been uploaded"
- Confirmation message
- Three action links:
  - "Upload another file" - redirects to `/manual-upload`
  - "Remove file" - redirects to `/remove-list-search`
  - "Home" - redirects to `/admin-dashboard`

**Access Control**:
- Only accessible after successful upload (check session flag)
- Redirect to dashboard if accessed directly without upload

**Welsh Language Support**:
- All text in both English and Welsh
- Query parameter `?lng=cy` switches to Welsh

### 3. Excel Parsing and Validation

**Excel File Structure**:

| Column | Data Type | Format | Required | Validation Rules |
|--------|-----------|--------|----------|-----------------|
| Date | Date | dd/MM/yyyy | Yes | Valid date, not in past |
| Case name | String | Text | Yes | Max 500 characters |
| Hearing length | String | Text | Yes | Format: "X hours Y minutes" or similar |
| Hearing type | String | Text | Yes | Max 100 characters |
| Venue | String | Text | Yes | Max 200 characters |
| Additional information | String | Text | Yes | Max 1000 characters |

**Parsing Requirements**:
- Use `xlsx` npm package for Excel file parsing
- Support .xlsx and .xls file formats
- Read first worksheet only
- Skip header row (row 1)
- Read data rows starting from row 2
- Stop at first empty row
- Validate date format (dd/MM/yyyy) and convert to ISO 8601
- Trim whitespace from all string fields
- Validate all fields are mandatory (no empty cells allowed)

**Error Handling**:
- Invalid file format: "The selected file must be an Excel file (.xlsx or .xls)"
- Empty file: "The Excel file is empty"
- Missing columns: "The Excel file is missing required columns"
- Invalid date format: "Date in row X is not in the correct format (dd/MM/yyyy)"
- Empty cells: "Row X contains empty cells. All fields are required."
- File too large: "The Excel file must be smaller than 10MB"

**JSON Output Schema**:
```json
{
  "courtHouse": {
    "courtHouseName": "Care Standards Tribunal"
  },
  "venue": "Care Standards Tribunal",
  "listType": "CARE_STANDARDS_TRIBUNAL_WEEKLY_HEARING_LIST",
  "hearings": [
    {
      "date": "2025-11-24",
      "caseName": "Example Case Name",
      "hearingLength": "1 hour 30 minutes",
      "hearingType": "Final Hearing",
      "venue": "Manchester",
      "additionalInformation": "Further details here"
    }
  ]
}
```

### 4. Front-End Display Page Specification

**URL**: `/care-standards-tribunal-weekly-hearing-list?artefactId={uuid}`

**Purpose**: Public-facing page displaying the published hearing list

**Page Structure**:

**Header Section**:
- Page title: "Care Standards Tribunal Weekly Hearing List"
- Duration line: "List for week commencing {date}" (format: dd MMMM yyyy)
- Last updated: "Last updated on {date} at {time}" (e.g., "24 November 2025 at 14:30")

**Important Information Accordion**:
- Heading: "Important information"
- Expandable/collapsible section (using GOV.UK Details component)
- Content:
  - Contact information for Care Standards Tribunal
  - Link to GOV.UK Care Standards Tribunal page
  - Any relevant disclaimers or notes

**Search Cases Section**:
- Heading: "Search Cases"
- Search input field with label "Case name or reference"
- Search button: "Search"
- Client-side search functionality (filter table rows)
- Clear search button when search is active

**Hearings Table**:
- 6 columns:
  1. Date (dd/MM/yyyy)
  2. Case name
  3. Hearing length
  4. Hearing type
  5. Venue
  6. Additional information
- Sortable columns (Date ascending by default)
- Responsive design (stack on mobile)
- GOV.UK Table component styling

**Footer Section**:
- Data source: "Data source: Care Standards Tribunal"
- "Back to top" link (smooth scroll to page top)

**Accessibility Requirements**:
- WCAG 2.2 AA compliance
- Proper heading hierarchy (h1, h2, h3)
- Table headers with scope attributes
- Search form with proper labels and ARIA attributes
- Keyboard navigation for all interactive elements
- Screen reader announcements for search results

**Welsh Language Support**:
- All static content in both English and Welsh
- Hearing data remains in English (sourced from Excel)
- Query parameter `?lng=cy` switches to Welsh

### 5. Search Functionality Specification

**Implementation**: Client-side JavaScript

**Search Behavior**:
- Case-insensitive search
- Search across all columns (Date, Case name, Hearing length, Hearing type, Venue, Additional information)
- Partial match (substring search)
- Results update as user types (debounced by 300ms)
- Display count: "Showing X of Y hearings"
- No results message: "No hearings found matching your search"

**Progressive Enhancement**:
- Page works without JavaScript (displays all hearings)
- Search functionality enhanced with JavaScript
- No server-side search required

**Accessibility**:
- ARIA live region for result count
- Focus management after search
- Clear button accessible via keyboard

### 6. Database Schema

**List Type Registration**:
Add new list type to `mockListTypes` in `@hmcts/list-types-common`:

```typescript
{
  id: 9,
  name: "CARE_STANDARDS_TRIBUNAL_WEEKLY_HEARING_LIST",
  englishFriendlyName: "Care Standards Tribunal Weekly Hearing List",
  welshFriendlyName: "Rhestr Gwrandawiadau Wythnosol y Tribiwnlys Safonau Gofal",
  provenance: "CFT_IDAM",
  urlPath: "care-standards-tribunal-weekly-hearing-list"
}
```

**Artefact Storage**:
- Use existing `artefact` table (no schema changes needed)
- `isFlatFile`: false (Excel is converted to structured JSON)
- `listTypeId`: 9
- `provenance`: "MANUAL_UPLOAD"
- `noMatch`: false (location must exist for manual upload)

**File Storage**:
- Original Excel file stored in `storage/temp/uploads/{artefactId}.xlsx`
- Converted JSON stored in `storage/temp/uploads/{artefactId}.json`
- Both files retained for audit purposes

## Content (i18n)

### English (EN)

**Summary Page**:
- Page title: "Check your answers before uploading the file"
- Heading: "Check your answers"
- Sub-heading: "Review the information below and make changes if needed"
- Court name: "Court name"
- File: "File"
- List type: "List type"
- Hearing start date: "Hearing start date"
- Sensitivity: "Sensitivity"
- Language: "Language"
- Display file dates: "Display file dates"
- Change: "Change"
- Confirm button: "Confirm and upload"

**Success Page**:
- Success banner: "Success"
- Success message: "Your file has been uploaded"
- Heading: "What happens next"
- Body: "The hearing list is now published and available to the public."
- Upload another link: "Upload another file"
- Remove file link: "Remove file"
- Home link: "Return to admin dashboard"

**Display Page**:
- Page title: "Care Standards Tribunal Weekly Hearing List"
- Duration: "List for week commencing"
- Last updated: "Last updated on"
- Important info heading: "Important information"
- Search heading: "Search Cases"
- Search label: "Case name or reference"
- Search button: "Search"
- Clear search: "Clear search"
- Table headers: "Date", "Case name", "Hearing length", "Hearing type", "Venue", "Additional information"
- Data source: "Data source: Care Standards Tribunal"
- Back to top: "Back to top"
- Results count: "Showing {count} of {total} hearings"
- No results: "No hearings found matching your search"

### Welsh (CY)

**Summary Page**:
- Page title: "Gwirio'ch atebion cyn uwchlwytho'r ffeil"
- Heading: "Gwirio'ch atebion"
- Sub-heading: "Adolygwch y wybodaeth isod a gwnewch newidiadau os oes angen"
- Court name: "Enw'r llys"
- File: "Ffeil"
- List type: "Math o restr"
- Hearing start date: "Dyddiad dechrau'r gwrandawiad"
- Sensitivity: "Sensitifrwydd"
- Language: "Iaith"
- Display file dates: "Dangos dyddiadau ffeil"
- Change: "Newid"
- Confirm button: "Cadarnhau ac uwchlwytho"

**Success Page**:
- Success banner: "Llwyddiant"
- Success message: "Mae eich ffeil wedi'i huwchlwytho"
- Heading: "Beth sy'n digwydd nesaf"
- Body: "Mae'r rhestr gwrandawiadau bellach wedi'i chyhoeddi ac ar gael i'r cyhoedd."
- Upload another link: "Uwchlwytho ffeil arall"
- Remove file link: "Dileu ffeil"
- Home link: "Dychwelyd i'r bwrdd gweinyddol"

**Display Page**:
- Page title: "Rhestr Gwrandawiadau Wythnosol y Tribiwnlys Safonau Gofal"
- Duration: "Rhestr ar gyfer yr wythnos yn dechrau"
- Last updated: "Diweddarwyd ddiwethaf ar"
- Important info heading: "Gwybodaeth bwysig"
- Search heading: "Chwilio Achosion"
- Search label: "Enw'r achos neu gyfeirnod"
- Search button: "Chwilio"
- Clear search: "Clirio chwiliad"
- Table headers: "Dyddiad", "Enw'r achos", "Hyd y gwrandawiad", "Math o wrandawiad", "Lleoliad", "Gwybodaeth ychwanegol"
- Data source: "Ffynhonnell data: Tribiwnlys Safonau Gofal"
- Back to top: "Nôl i'r brig"
- Results count: "Yn dangos {count} o {total} gwrandawiadau"
- No results: "Dim gwrandawiadau wedi'u canfod sy'n cydweddu â'ch chwiliad"

## Error Handling

### Excel Parsing Errors
- Invalid file format: Display error on upload page with clear message
- Validation errors: List all errors with row numbers
- Empty file: Display error on upload page
- File too large: Display error before upload

### Display Page Errors
- Artefact not found: Render 404 error page
- JSON file not found: Render error page with helpful message
- Invalid JSON structure: Log error and render error page
- Validation errors: Log error and render error page

### Session Errors
- Session expired: Redirect to manual upload page with error message
- Invalid uploadId: Redirect to manual upload page with error message
- Missing required fields: Display validation errors on form

## Test Scenarios

| ID | Scenario | Steps | Expected Result |
|----|----------|-------|-----------------|
| TS1 | Valid Excel upload | Upload valid Excel file with all required columns | File parsed, converted to JSON, and stored successfully |
| TS2 | Summary page display | Complete upload form and navigate to summary | All fields displayed correctly with change links |
| TS3 | Change field from summary | Click change link for a field | Redirected to upload form with data pre-populated |
| TS4 | Confirm upload | Click confirm button on summary page | File processed and success page displayed |
| TS5 | Success page display | Complete upload successfully | Success banner and action links displayed |
| TS6 | Upload another file | Click "Upload another file" on success page | Redirected to upload form with clean session |
| TS7 | Display published list | Navigate to public display page | Hearing list displayed with correct formatting |
| TS8 | Search functionality | Enter search term in search box | Table filtered to show matching hearings |
| TS9 | Clear search | Click clear search button | All hearings displayed again |
| TS10 | Invalid Excel format | Upload file with missing columns | Error message displayed with clear guidance |
| TS11 | Invalid date format | Upload Excel with invalid date in Date column | Error message with row number displayed |
| TS12 | Empty cells | Upload Excel with empty cells | Error message listing all rows with empty cells |
| TS13 | Welsh language | View pages with ?lng=cy parameter | All static content displayed in Welsh |
| TS14 | Accessibility | Navigate pages using keyboard only | All interactive elements accessible |
| TS15 | Mobile responsive | View display page on mobile device | Table and search components work correctly |

## Assumptions / Open Questions

1. **Excel File Format**: Assuming .xlsx and .xls formats only (no .csv or .ods support)
2. **File Size Limit**: Assuming 10MB maximum file size (same as existing uploads)
3. **Date Range**: Should we validate that dates are within a reasonable range (e.g., not more than 1 year in the future)?
4. **Sorting**: Should table be sortable by clicking column headers or just default date ascending?
5. **Search Scope**: Should search be client-side only or also support server-side for large datasets?
6. **Important Information Content**: What specific contact information and links should be included in the accordion?
7. **Week Commencing Date**: Should this be calculated from the first hearing date or from a separate field?
8. **Hearing List Duration**: Are all hearings assumed to be for one week, or can the list span multiple weeks?
9. **Excel Template**: Should we provide a downloadable Excel template for users?
10. **Duplicate Handling**: How should duplicate case names or dates be handled?

## Non-Functional Requirements

### Performance
- Excel parsing should complete within 5 seconds for files up to 1000 rows
- Page load time under 2 seconds for display page
- Search results should appear within 100ms of user input

### Security
- File upload restricted to authenticated admin users only
- File type validation to prevent malicious files
- Input sanitization for all Excel cell values
- XSS protection for all displayed content

### Scalability
- Support Excel files with up to 1000 hearing entries
- Handle concurrent uploads from multiple admin users
- Efficient JSON storage and retrieval

### Maintainability
- Modular code structure following existing patterns
- Comprehensive unit tests for all components
- Clear error messages for debugging
- Logging for all Excel parsing operations

## Success Criteria

The implementation is considered successful when:
1. Admin users can upload Excel files and see them in the summary page
2. All fields are displayed correctly with change links working
3. Success page displays after confirmed upload
4. Public display page shows hearing list with correct formatting
5. Search functionality filters hearings as expected
6. Welsh translations are complete and accurate
7. All accessibility requirements are met (WCAG 2.2 AA)
8. Excel parsing handles all validation scenarios correctly
9. Unit tests achieve >90% code coverage
10. E2E tests pass for all user journeys
