# VIBE-162: Upload Excel File in CaTH

**Status:** To be implemented

## Problem Statement

The non-strategic publishing route requires the upload of an excel file in CaTH which is then transformed at the back end to a Json file before publishing. The upload process is completed over a number of steps.

**AS A** Local Admin
**I WANT** to upload an excel file in CaTH
**SO THAT** I can publish a hearing list in CaTH

## Acceptance Criteria

1. A local admin is able to access a verified account by signing in through the sign in page with their approved log in details
2. The local admin is able to see the 'Upload excel file' tab on the dashboard and is taken to the excel file upload form when the tab is clicked
3. The 'Upload excel file' tab displays the descriptive message 'Upload an excel file to be converted and displayed on the external facing service on GOV.UK.'
4. The top of the excel file upload form displays a 'warning' with a warning caution sign and the boldly written message 'Prior to upload you must ensure the file is suitable for publication e.g. redaction of personal data has been done during the production of this file.'
5. The excel file upload form displays various data fields on the left side of the page:
   - File upload tab labelled 'chose file' where the local admin can upload the flat file
   - Descriptive sentence above: 'Manually upload a csv, doc, docx, htm, html, json, or pdf file, max size 2MB'
   - Search tab labelled 'Court name or Tribunal name' that displays likely venue names as the local admin searches
   - 'List type' field with 'Please choose a list type' and contains a list of all list types available in CaTH for manual uploads in a drop down
   - 'Hearing start date' with descriptive text 'For example, 16 01 2022' and 3 text boxes labelled 'Day', 'Month' and 'Year'
   - Sensitivity field with 3 options (Public, Private – all verified users, Classified) in a dropdown
   - Language field with 3 options (English, Welsh, Bilingual English/Welsh) in a dropdown
   - 'Display file from' with descriptive text 'For example, 27 01 2022' and 3 text boxes labelled 'Day', 'Month' and 'Year'
   - 'Display file to' with descriptive text 'For example, 18 02 2022' and 3 text boxes labelled 'Day', 'Month' and 'Year'
   - 'Continue' button and 'back to top' message and arrow
6. On the right side of the form, various terms are explained under 'Page Help' heading:
   - **Lists:** You must ensure that you only upload one file that contains all hearings for the Court or Tribunal name and List type. This should include all judges and court rooms in one document.
   - **Sensitivity:** Explanation of Public, Private, and Classified options
   - **Display from:** Date publication is available from
   - **Display to:** Last date the publication is available

## Technical Specification

### Page: Upload Excel File Form

#### Form Fields

**1. File upload**
- Input type: file
- Required: Yes
- Accepted formats: .csv, .doc, .docx, .htm, .html, .json, .pdf
- Validation rules:
  - Maximum file size: 2MB
  - Must be one of the permitted formats
  - Must contain a single consolidated document containing all hearings for the selected Court/Tribunal and list type

**2. Court name or Tribunal name**
- Input type: text with autocomplete/search
- Required: Yes
- Validation rules:
  - Must match an existing court/tribunal entity in CaTH
  - Minimum 2 characters before autocomplete triggers

**3. List type**
- Input type: select (dropdown)
- Required: Yes
- Validation rules:
  - Must choose one value from list types available for manual upload in CaTH

**4. Hearing start date**
- Input type: three text inputs: Day / Month / Year
- Required: Yes
- Validation rules:
  - Day: 1–31, numeric, max 2 characters
  - Month: 1–12, numeric, max 2 characters
  - Year: 4-digit year, numeric
  - Must form a valid date

**5. Sensitivity**
- Input type: select (dropdown)
- Required: Yes
- Options:
  - Public
  - Private – all verified users
  - Classified
- Validation: Must select one option

**6. Language**
- Input type: select (dropdown)
- Required: Yes
- Options:
  - English
  - Welsh
  - Bilingual English/Welsh
- Validation: Must select one option

**7. Display file from**
- Input type: three text inputs: Day / Month / Year
- Required: Yes
- Validation rules:
  - Same validation as Hearing start date
  - Must be today's date or a future date

**8. Display file to**
- Input type: three text inputs: Day / Month / Year
- Required: Yes
- Validation rules:
  - Same validation as Display file from
  - Must be the same or later than Display file from

**9. Continue button**
- Input type: button
- Triggers validation on all mandatory fields

### Content

#### English/Welsh Content

**Title/H1**
- EN: "Upload excel file"
- CY: "Welsh placeholder"

**Introductory warning**
- EN: "Prior to upload you must ensure the file is suitable for publication e.g. redaction of personal data has been done during the production of this file."
- CY: "Welsh placeholder"

**File upload descriptive text**
- EN: "Manually upload a csv, doc, docx, htm, html, json, or pdf file, max size 2MB"
- CY: "Welsh placeholder"

#### Page Help (right-hand column)

**Lists**
- EN: "You must ensure that you only upload one file that contains all hearings for the Court or Tribunal name and List type. This should include all judges and court rooms in one document."
- CY: "Welsh placeholder"

**Sensitivity**
- EN:
  - "You need to indicate which user group your document should be available to:"
  - "Public: Publication available to all users."
  - "Private: Publication available to all verified users e.g. Legal professionals and media."
  - "Classified: Publication only available to verified users who are in a group eligible to view that list e.g. SJP press list available to Media."
- CY: "Welsh placeholder"

**Display from**
- EN: "This will be the date the publication is available from … displayed immediately if today's date is used."
- CY: "Welsh placeholder"

**Display to**
- EN: "This will be the last date the publication is available. It will be displayed until 23:59 of that date."
- CY: "Welsh placeholder"

**Buttons**
- EN: Button "Continue"
- CY: Button "Welsh placeholder"

### Error Messages

**File upload**
- EN: "Select a file to upload" / CY: "Welsh placeholder"
- EN: "The selected file must be smaller than 2MB" / CY: "Welsh placeholder"
- EN: "The selected file type is not supported" / CY: "Welsh placeholder"

**Court/Tribunal name**
- EN: "Enter a court or tribunal name" / CY: "Welsh placeholder"

**List type**
- EN: "Select a list type" / CY: "Welsh placeholder"

**Hearing start date**
- EN: "Enter a valid hearing start date" / CY: "Welsh placeholder"

**Sensitivity**
- EN: "Select a sensitivity level" / CY: "Welsh placeholder"

**Language**
- EN: "Select a language option" / CY: "Welsh placeholder"

**Display file from**
- EN: "Enter a valid 'Display from' date" / CY: "Welsh placeholder"

**Display file to**
- EN: "Enter a valid 'Display to' date" / CY: "Welsh placeholder"
- EN: "'Display to' date must be the same as or later than 'Display from' date" / CY: "Welsh placeholder"

### Back Navigation

- Back link returns to the CaTH dashboard without losing entered values
- "Back to top" link scrolls to page header

### Accessibility

- Page must comply with WCAG 2.2 AA and GOV.UK Design System standards
- All form fields must have associated labels and accessible descriptions
- Error summary must list all errors and link to the first instance of each
- Keyboard-only navigation must be fully supported
- Warning component must use correct ARIA roles

### Test Scenarios

1. Submitting with no file presents the file-upload error
2. Uploading a file above 2MB triggers size validation
3. Uploading an invalid format (.xlsx, .zip, etc.) shows file format error
4. Court/tribunal name autocomplete returns matching entities after 2+ characters
5. List type dropdown lists all valid CaTH manual upload list types
6. Sensitivity and language options behave as dropdowns with required selection
7. Invalid or impossible dates (e.g., 32/01/2024) show date errors
8. "Display to" earlier than "Display from" produces chronological validation error
9. Successful submission with all fields valid progresses to the next step in publishing workflow
10. Language toggle switches all English text to Welsh placeholders
11. Back link returns user to dashboard without clearing form data
