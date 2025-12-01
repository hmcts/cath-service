# VIBE-162: Excel Upload – Upload Excel File

## Overview

Initial Excel upload form for the non-strategic publishing route. This form collects file and metadata required for manual publication of hearing lists. This is a prerequisite to VIBE-166 (summary/completion page).

## User Story

**As an** Internal Admin (CTSC or Local)
**I want to** upload an Excel file with hearing list metadata
**So that** I can manually publish hearing lists to CaTH

## Page Details

### URL Structure

| Page | URL | Methods | Auth Required |
|------|-----|---------|---------------|
| Excel Upload | `/excel-upload` | GET, POST | Yes (System Admin, Internal Admin CTSC, Internal Admin Local) |

### Page Layout

```
Excel upload
────────────────────────────────────

⚠ Warning
Prior to upload you must ensure the file is suitable for
publication e.g. redaction of personal data has been done
during the production of this file.

┌────────────────────────────────────────────────────┐
│ Upload a csv, doc, docx, htm, html, json, or pdf   │
│ file, max size 2MB                                 │
│ [Choose file] button                               │
└────────────────────────────────────────────────────┘

Court name or Tribunal name
[Search input field with autocomplete         ]

┌────────────────────────────────────────────────────┐
│ List type                                          │
│ [Dropdown: Please choose a list type ▼]           │
│                                                    │
│ Hearing start date                                 │
│ For example, 16 01 2022                           │
│ Day [  ] Month [  ] Year [    ]                   │
└────────────────────────────────────────────────────┘

Sensitivity
[Dropdown: Please choose a sensitivity ▼]

Language
[Dropdown: English ▼]

Display file from
For example, 27 01 2022
Day [  ] Month [  ] Year [    ]

Display file to
For example, 18 02 2022
Day [  ] Month [  ] Year [    ]

[Continue] button

────────────────────────────────────
│ Page help                        │
│                                  │
│ Lists                            │
│ You must ensure that you only    │
│ upload one file that contains    │
│ all hearings...                  │
│                                  │
│ Sensitivity                      │
│ You need to indicate which user  │
│ group your document should be... │
│                                  │
│ Public                           │
│ Publication available to all...  │
│                                  │
│ Private                          │
│ Publication available to all...  │
│                                  │
│ Classified                       │
│ Publication only available to... │
│                                  │
│ Display from                     │
│ This will be the date the...     │
│                                  │
│ Display to                       │
│ This will be the last date...    │
└──────────────────────────────────┘

[▴ Back to top] link
```

## Form Fields

### 1. File Upload

- **Field Name**: `file`
- **Type**: File input
- **Label**: "Upload a csv, doc, docx, htm, html, json, or pdf file, max size 2MB"
- **Required**: Yes
- **Accepted Types**: csv, doc, docx, htm, html, json, pdf
- **Max Size**: 2MB
- **GOV.UK Component**: File upload (styled with inset text wrapper)

### 2. Court/Tribunal Name

- **Field Name**: `locationId` (hidden), `court-display` (visible autocomplete)
- **Type**: Text input with autocomplete
- **Label**: "Court name or Tribunal name"
- **Required**: Yes
- **Minimum Characters**: 2 (for search to trigger)
- **Validation**: Must select from autocomplete results
- **GOV.UK Component**: govukInput with autocomplete attributes
- **API Endpoint**: `/api/locations?q=search-term&language=en`

### 3. List Type

- **Field Name**: `listType`
- **Type**: Dropdown select
- **Label**: "List type"
- **Required**: Yes
- **Options**: Populated from mock list types
- **Default**: "" (placeholder: "<Please choose a list type>")
- **GOV.UK Component**: govukSelect
- **Styled**: Inside inset text with hearing start date

### 4. Hearing Start Date

- **Field Name**: `hearingStartDate-day`, `hearingStartDate-month`, `hearingStartDate-year`
- **Type**: Date input (3 text fields)
- **Label**: "Hearing start date"
- **Hint**: "For example, 16 01 2022"
- **Required**: Yes (all three parts)
- **Validation**: Valid date in DD MM YYYY format
- **GOV.UK Component**: govukDateInput
- **Styled**: Inside inset text with list type

### 5. Sensitivity

- **Field Name**: `sensitivity`
- **Type**: Dropdown select
- **Label**: "Sensitivity"
- **Required**: Yes
- **Options**:
  - "" (placeholder: "<Please choose a sensitivity>")
  - Public
  - Private
  - Classified
- **GOV.UK Component**: govukSelect

### 6. Language

- **Field Name**: `language`
- **Type**: Dropdown select
- **Label**: "Language"
- **Required**: Yes
- **Options**:
  - English (default selected)
  - Welsh
  - Bilingual
- **GOV.UK Component**: govukSelect

### 7. Display File From

- **Field Name**: `displayFrom-day`, `displayFrom-month`, `displayFrom-year`
- **Type**: Date input (3 text fields)
- **Label**: "Display file from"
- **Hint**: "For example, 27 01 2022"
- **Required**: Yes (all three parts)
- **Validation**: Valid date, must be today or future date
- **GOV.UK Component**: govukDateInput

### 8. Display File To

- **Field Name**: `displayTo-day`, `displayTo-month`, `displayTo-year`
- **Type**: Date input (3 text fields)
- **Label**: "Display file to"
- **Hint**: "For example, 18 02 2022"
- **Required**: Yes (all three parts)
- **Validation**: Valid date, must be >= Display from date
- **GOV.UK Component**: govukDateInput

### 9. Continue Button

- **Type**: Submit button
- **Text**: "Continue"
- **GOV.UK Component**: govukButton
- **Action**: Submit form data via POST

## Validation Rules

### File Upload Validation

| Rule | Error Message (EN) | Error Message (CY) |
|------|-------------------|-------------------|
| No file provided | "Please provide a file" | "Darparwch ffeil" |
| Invalid file type | "Please upload a valid file format" | "Llwythwch fformat ffeil dilys" |
| File too large (>2MB) | "File too large, please upload file smaller than 2MB" | "Ffeil yn rhy fawr, llwythwch ffeil yn llai na 2MB" |

### Court/Tribunal Validation

| Rule | Error Message (EN) | Error Message (CY) |
|------|-------------------|-------------------|
| No court selected | "Please enter and select a valid court" | "Rhowch a dewiswch lys dilys" |
| Search query < 3 chars | "Court name must be three characters or more" | "Rhaid i enw'r llys fod yn dri chymeriad neu fwy" |
| Invalid locationId (non-numeric) | "Please enter and select a valid court" | "Rhowch a dewiswch lys dilys" |

### List Type Validation

| Rule | Error Message (EN) | Error Message (CY) |
|------|-------------------|-------------------|
| Not selected | "Please select a list type" | "Dewiswch fath o restr" |

### Hearing Start Date Validation

| Rule | Error Message (EN) | Error Message (CY) |
|------|-------------------|-------------------|
| Missing any part | "Please enter a valid hearing start date" | "Rhowch ddyddiad dechrau gwrandawiad dilys" |
| Invalid date format | "Please enter a valid hearing start date" | "Rhowch ddyddiad dechrau gwrandawiad dilys" |
| Day/month not 2 digits | "Please enter a valid hearing start date" | "Rhowch ddyddiad dechrau gwrandawiad dilys" |

### Sensitivity Validation

| Rule | Error Message (EN) | Error Message (CY) |
|------|-------------------|-------------------|
| Not selected | "Please select a sensitivity" | "Dewiswch lefel sensitifrwydd" |

### Language Validation

| Rule | Error Message (EN) | Error Message (CY) |
|------|-------------------|-------------------|
| Not selected | "Select a language" | "Dewiswch iaith" |

### Display From Validation

| Rule | Error Message (EN) | Error Message (CY) |
|------|-------------------|-------------------|
| Missing any part | "Please enter a valid display file from date" | "Rhowch ddyddiad dangos y ffeil o dilys" |
| Invalid date format | "Please enter a valid display file from date" | "Rhowch ddyddiad dangos y ffeil o dilys" |
| Day/month not 2 digits | "Please enter a valid display file from date" | "Rhowch ddyddiad dangos y ffeil o dilys" |

### Display To Validation

| Rule | Error Message (EN) | Error Message (CY) |
|------|-------------------|-------------------|
| Missing any part | "Please enter a valid display file to date" | "Rhowch ddyddiad dangos y ffeil tan dilys" |
| Invalid date format | "Please enter a valid display file to date" | "Rhowch ddyddiad dangos y ffeil tan dilys" |
| Day/month not 2 digits | "Please enter a valid display file to date" | "Rhowch ddyddiad dangos y ffeil tan dilys" |
| Before display from | "Display to date must be after display from date" | "Rhaid i'r dyddiad dangos tan fod ar ôl y dyddiad dangos o" |

## Content (English)

### Page Content

```typescript
{
  title: "Excel upload",
  pageTitle: "Upload - Excel upload",
  warningTitle: "Warning",
  warningMessage: "Prior to upload you must ensure the file is suitable for publication e.g. redaction of personal data has been done during the production of this file.",
  fileUploadLabel: "Upload a csv, doc, docx, htm, html, json, or pdf file, max size 2MB",
  courtLabel: "Court name or Tribunal name",
  listTypeLabel: "List type",
  listTypePlaceholder: "Please choose a list type",
  hearingStartDateLabel: "Hearing start date",
  hearingStartDateHint: "For example, 16 01 2022",
  sensitivityLabel: "Sensitivity",
  languageLabel: "Language",
  displayFromLabel: "Display file from",
  displayFromHint: "For example, 27 01 2022",
  displayToLabel: "Display file to",
  displayToHint: "For example, 18 02 2022",
  continueButton: "Continue",
  errorSummaryTitle: "There is a problem",
  pageHelpTitle: "Page help",
  pageHelpLists: "Lists",
  pageHelpListsText: "You must ensure that you only upload one file that contains all hearings for the Court or Tribunal name and List type. This should include all judges and court rooms in one document.",
  pageHelpSensitivity: "Sensitivity",
  pageHelpSensitivityText: "You need to indicate which user group your document should be available to:",
  pageHelpSensitivityPublic: "Public",
  pageHelpSensitivityPublicText: "Publication available to all users.",
  pageHelpSensitivityPrivate: "Private",
  pageHelpSensitivityPrivateText: "Publication available to all verified users e.g. Legal professionals and media.",
  pageHelpSensitivityClassified: "Classified",
  pageHelpSensitivityClassifiedText: "Publication only available to verified users who are in a group eligible to view that list e.g. SJP press list available to Media",
  pageHelpDisplayFrom: "Display from",
  pageHelpDisplayFromText: "This will be the date the publication is available from, if today's date is used it will be displayed immediately. If a date in the future is used, it will display from 00:01 of that date.",
  pageHelpDisplayTo: "Display to",
  pageHelpDisplayToText: "This will be the last date the publication is available. It will be displayed until 23:59 of that date.",
  dayLabel: "Day",
  monthLabel: "Month",
  yearLabel: "Year",
  backToTop: "Back to top"
}
```

### Error Messages

See validation tables above for all error messages in both English and Welsh.

## Content (Welsh)

### Page Content

```typescript
{
  title: "Llwytho Excel",
  pageTitle: "Llwytho - Llwytho Excel",
  warningTitle: "Rhybudd",
  warningMessage: "Cyn llwytho rhaid i chi sicrhau bod y ffeil yn addas i'w chyhoeddi e.e. bod data personol wedi'i olygu yn ystod cynhyrchu'r ffeil hon.",
  fileUploadLabel: "Llwytho ffeil csv, doc, docx, htm, html, json, neu pdf, uchafswm maint 2MB",
  courtLabel: "Enw'r llys neu enw'r tribiwnlys",
  listTypeLabel: "Math o restr",
  listTypePlaceholder: "Dewiswch fath o restr",
  hearingStartDateLabel: "Dyddiad dechrau'r gwrandawiad",
  hearingStartDateHint: "Er enghraifft, 16 01 2022",
  sensitivityLabel: "Sensitifrwydd",
  languageLabel: "Iaith",
  displayFromLabel: "Dangos y ffeil o",
  displayFromHint: "Er enghraifft, 27 01 2022",
  displayToLabel: "Dangos y ffeil tan",
  displayToHint: "Er enghraifft, 18 02 2022",
  continueButton: "Parhau",
  errorSummaryTitle: "Mae yna broblem",
  pageHelpTitle: "Cymorth tudalen",
  pageHelpLists: "Rhestrau",
  pageHelpListsText: "Rhaid i chi sicrhau eich bod chi ond yn llwytho un ffeil sy'n cynnwys yr holl wrandawiadau ar gyfer enw'r Llys neu'r Tribiwnlys a'r math o restr. Dylai hyn gynnwys pob barnwr ac ystafell lys mewn un ddogfen.",
  pageHelpSensitivity: "Sensitifrwydd",
  pageHelpSensitivityText: "Mae angen i chi nodi pa grŵp defnyddwyr y dylai eich dogfen fod ar gael iddynt:",
  pageHelpSensitivityPublic: "Cyhoeddus",
  pageHelpSensitivityPublicText: "Cyhoeddiad ar gael i bob defnyddiwr.",
  pageHelpSensitivityPrivate: "Preifat",
  pageHelpSensitivityPrivateText: "Cyhoeddiad ar gael i bob defnyddiwr wedi'u dilysu e.e. Gweithwyr proffesiynol cyfreithiol a'r cyfryngau.",
  pageHelpSensitivityClassified: "Dosbarthedig",
  pageHelpSensitivityClassifiedText: "Cyhoeddiad ar gael i ddefnyddwyr wedi'u dilysu sydd mewn grŵp sy'n gymwys i weld y rhestr honno e.e. Rhestr y wasg SJP ar gael i'r Cyfryngau",
  pageHelpDisplayFrom: "Dangos o",
  pageHelpDisplayFromText: "Hwn fydd y dyddiad y bydd y cyhoeddiad ar gael ohono, os defnyddir dyddiad heddiw bydd yn cael ei ddangos ar unwaith. Os defnyddir dyddiad yn y dyfodol, bydd yn cael ei ddangos o 00:01 ar y dyddiad hwnnw.",
  pageHelpDisplayTo: "Dangos tan",
  pageHelpDisplayToText: "Hwn fydd y dyddiad olaf y bydd y cyhoeddiad ar gael. Bydd yn cael ei ddangos tan 23:59 ar y dyddiad hwnnw.",
  dayLabel: "Diwrnod",
  monthLabel: "Mis",
  yearLabel: "Blwyddyn",
  backToTop: "Nôl i'r brig"
}
```

## User Flow

### Happy Path

1. User navigates to `/excel-upload`
2. User sees warning banner about data suitability
3. User selects a valid file (CSV, DOC, DOCX, HTM, HTML, JSON, or PDF, ≤2MB)
4. User types ≥2 characters in court field, autocomplete shows results
5. User selects a court from autocomplete
6. User selects a list type from dropdown
7. User enters hearing start date (DD MM YYYY)
8. User selects sensitivity level
9. User selects language (defaults to English)
10. User enters display from date (today or future)
11. User enters display to date (≥ display from)
12. User clicks "Continue"
13. Form validates successfully
14. File and metadata stored in session
15. User redirected to `/excel-upload-summary` (VIBE-166)

### Error Path

1. User submits form with validation errors
2. Form data stored in session (preserves user input)
3. Validation errors stored in session
4. User redirected back to `/excel-upload` (POST-Redirect-GET pattern)
5. Page displays error summary at top
6. Each field with error shows inline error message
7. Form fields repopulated with previous values
8. User corrects errors and resubmits

### Back Navigation

1. User navigates back from summary page
2. Session preserves form data
3. Page displays previously entered values
4. User can modify and resubmit

## Session Storage

```typescript
interface ExcelUploadSession {
  excelUploadForm?: ExcelUploadFormData;
  excelUploadErrors?: ValidationError[];
  excelUploadSubmitted?: boolean;
  uploadConfirmed?: boolean;
  successPageViewed?: boolean;
  viewedLanguage?: "en" | "cy";
}

interface ExcelUploadFormData {
  locationId?: string;
  locationName?: string;
  listType?: string;
  hearingStartDate?: DateInput;
  sensitivity?: string;
  language?: string;
  displayFrom?: DateInput;
  displayTo?: DateInput;
}
```

## GOV.UK Components Used

- **govukWarningText** (custom styled warning banner)
- **govukFileUpload** (file input)
- **govukInput** (court autocomplete field)
- **govukSelect** (list type, sensitivity, language dropdowns)
- **govukDateInput** (hearing start date, display from, display to)
- **govukButton** (continue button)
- **govukErrorSummary** (validation errors)
- **govukInsetText** (wrapping file upload and list type section)

## Accessibility Requirements

### WCAG 2.2 AA Compliance

1. **Keyboard Navigation**
   - All form fields accessible via Tab key
   - Logical tab order through form
   - Focus indicators visible on all interactive elements
   - Date inputs navigable with Tab between day/month/year

2. **Screen Readers**
   - Semantic HTML5 elements
   - Labels properly associated with inputs via for/id
   - Error messages linked to fields via aria-describedby
   - Warning banner uses proper heading hierarchy
   - Autocomplete has ARIA labels

3. **Visual Design**
   - Color contrast ratio minimum 4.5:1 for text
   - Error states use both color and icon/text
   - Focus states clearly visible
   - Text resizable up to 200%

4. **Forms**
   - All inputs have visible labels
   - Required fields indicated
   - Error summary receives focus when present
   - Inline errors shown at field level
   - Hint text properly associated

5. **Progressive Enhancement**
   - Core functionality works without JavaScript
   - Form submits via standard HTTP POST
   - Autocomplete degrades gracefully
   - Date inputs work without JavaScript validation

## Technical Requirements

### Authentication & Authorization

- **Middleware**: `requireRole([USER_ROLES.SYSTEM_ADMIN, USER_ROLES.INTERNAL_ADMIN_CTSC, USER_ROLES.INTERNAL_ADMIN_LOCAL])`
- Only authenticated users with appropriate roles can access

### File Upload Handling

- **Middleware**: multer via `createFileUpload()` from `@hmcts/web-core`
- **Max File Size**: 2MB
- **Allowed Extensions**: csv, doc, docx, htm, html, json, pdf
- **Storage**: Memory storage (buffer) for temporary processing
- **Error Handling**: Multer errors captured in `req.fileUploadError`

### Court/Tribunal Autocomplete

- **API Endpoint**: `/api/locations` (already implemented in `@hmcts/location`)
- **Method**: GET
- **Query Parameters**: `?q=search-term&language=en`
- **Response**: JSON array of location objects with id and name
- **Minimum Characters**: 2 (enforced client-side and server-side)

### Date Parsing

- **Format**: DD MM YYYY (separate inputs)
- **Validation**: Uses `parseDate()` from `@hmcts/web-core`
- **Requirements**: Day and month must be exactly 2 characters, year must be 4 characters

### Session Management

- **Storage**: Redis via `expressSessionRedis`
- **Persistence**: Form data persists across GET requests
- **Cleanup**: Errors cleared after display, form cleared after successful submission

## Out of Scope

The following are explicitly NOT included in this ticket:

- Summary/confirmation page (VIBE-166)
- Actual publication to database (VIBE-166)
- File processing/parsing logic
- JSON schema validation (handled in manual-upload)
- Strategic publishing route
- Email notifications
- Audit logging of uploads

## Assumptions

1. Excel upload follows same patterns as manual-upload (file handling, validation, session storage)
2. Uses existing location autocomplete API
3. Uses existing list types from `@hmcts/publication`
4. File is stored in session/temporary storage until confirmed on summary page
5. No JSON schema validation required for Excel upload (unlike manual-upload)
6. Language selector is for publication language, not UI language

## Dependencies

- **@hmcts/admin-pages**: Extends this module with new page
- **@hmcts/location**: Provides location autocomplete API
- **@hmcts/publication**: Provides list types, sensitivity, and language enums
- **@hmcts/web-core**: Provides file upload, date parsing, GOV.UK components
- **@hmcts/auth**: Provides role-based authentication

## Follow-up Tickets

- **VIBE-166**: Excel Upload Summary/Confirmation page
- Future: Excel file parsing and publication logic
