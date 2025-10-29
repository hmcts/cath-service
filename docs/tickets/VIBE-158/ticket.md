# VIBE-158: Manual Publishing – Manual Upload Form

## Ticket Information
- **Ticket ID**: VIBE-158
- **Type**: User Story
- **Status**: In Planning
- **Created**: 2025-10-28

## Problem Statement

Local admins (court clerks) can publish hearing lists manually in CaTH by uploading a flat file. This process involves several steps.

## User Story

**AS A** Local Admin
**I WANT** to upload a flat file in CaTH
**SO THAT** I can publish a hearing list in CaTH

## Acceptance Criteria

1. A local admin is able to access a verified account by signing in through the sign in page with their approved log in details

2. When the local admin clicks the upload tab on the dashboard, the user is taken to a manual upload form

3. The top of the form displays a 'warning' with a warning caution sign and the boldly written message 'Prior to upload you must ensure the file is suitable for publication e.g. redaction of personal data has been done during the production of this file.'

4. The manual upload form displays various data fields on the left side of the page:
   - **File upload tab** labelled 'chose file' where the local admin can upload the flat file
   - Descriptive sentence above: 'Manually upload a csv, doc, docx, htm, html, json, or pdf file, max size 2MB'
   - **Search tab** labelled 'Court name or Tribunal name' that displays likely venue names as the local admin searches a venue name to publish against
   - **List type field** displays 'Please choose a list type' and contains a list of all list types available in CaTH for manual uploads in a drop down
   - **Hearing start date** displays 'For example, 16 01 2022' and contains 3 free typing text boxes labelled 'Day', 'Month' and 'Year'
   - **Sensitivity field** with 3 options (public, Private – all verified users and classified) in a dropdown
   - **Language field** provides 3 language options in a drop down (English, welsh and bilingual English/welsh)
   - **Display file from** has descriptive text 'For example, 27 01 2022' and contains 3 free typing text boxes labelled 'Day', 'Month' and 'Year'
   - **Display file to** has descriptive text 'For example, 18 02 2022' and contains 3 free typing text boxes labelled 'Day', 'Month' and 'Year'
   - **Continue button** which the local admin can click to continue the manual upload process
   - **Back to top** message and arrow

5. On the right side of the form, various terms on the form are explained in sequential order under the heading 'Page Help':

   **Lists**
   You must ensure that you only upload one file that contains all hearings for the Court or Tribunal name and List type. This should include all judges and court rooms in one document.

   **Sensitivity**
   You need to indicate which user group your document should be available to:
   - **Public**: Publication available to all users.
   - **Private**: Publication available to all verified users e.g. Legal professionals and media.
   - **Classified**: Publication only available to verified users who are in a group eligible to view that list e.g. SJP press list available to Media

   **Display from**
   This will be the date the publication is available from, if today's date is used it will be displayed immediately. If a date in the future is used, it will display from 00:01 of that date.

   **Display to**
   This will be the last date the publication is available. It will be displayed until 23:59 of that date.

6. All CaTH pages specifications are maintained

---

## Attached Specification

# VIBE-158: Technical Specification

**Owner:** VIBE-158
**Date:** [Insert Date]
**Version:** 1.0

---

## 1. User Story

**As a** Local Admin
**I want** to upload a flat file in CaTH
**So that** I can publish a hearing list in CaTH

### Background

Local admins (court clerks) must be able to manually upload hearing lists into CaTH. This requires a secure sign-in process, navigation to the admin dashboard, and completion of a manual upload form with specific data entry fields, file upload capabilities, and contextual help.

### Acceptance Criteria

1. A local admin can access a verified account by signing in through the sign-in page with approved login details.
2. When the local admin clicks the **Upload** tab on the dashboard, they are taken to the **Manual Upload Form**.
3. At the top of the form, a **warning banner** is displayed with a caution sign and the message:
   *"Prior to upload you must ensure the file is suitable for publication e.g. redaction of personal data has been done during the production of this file."*
4. The manual upload form displays the following fields on the **left side of the page**:

   * **File Upload field**: Labelled *"Choose file"* with descriptive text above: *"Manually upload a csv, doc, docx, htm, html, json, or pdf file, max size 2MB"*.
   * **Court name or Tribunal name field**: Search box that displays suggested venues as the admin types.
   * **List type field**: Dropdown with descriptive text: *"Please choose a list type"*. Contains all available list types in CaTH.
   * **Hearing start date**: With descriptive text *"For example, 16 01 2022"*. Three free-text boxes: Day, Month, Year.
   * **Sensitivity field**: Dropdown with options: Public, Private (all verified users), Classified.
   * **Language field**: Dropdown with options: English, Welsh, Bilingual (English/Welsh).
   * **Display file from**: With descriptive text *"For example, 27 01 2022"*. Three free-text boxes: Day, Month, Year.
   * **Display file to**: With descriptive text *"For example, 18 02 2022"*. Three free-text boxes: Day, Month, Year.
   * **Continue button**: To proceed with upload.
   * **Back to top arrow/text**.
5. On the **right side of the page**, the **Page Help** section is displayed, providing definitions:

   * **Lists**: Upload one file containing all hearings for the selected court/tribunal and list type, including all judges and courtrooms.
   * **Sensitivity**: Explains user groups:

     * *Public*: Available to all users.
     * *Private*: Available to verified users (legal professionals and media).
     * *Classified*: Restricted to specific verified groups (e.g., SJP press list).
   * **Display from**: Date from which publication is available (immediate if today's date).
   * **Display to**: Last date publication is available (until 23:59 of that date).
6. All CaTH page specifications (header, footer, navigation, Welsh toggle, accessibility) are maintained.

---

## 2. User Journey Flow

1. Local admin signs in with verified account.
2. Admin navigates to the **Admin Dashboard**.
3. Admin clicks the **Upload** tab.
4. Admin is presented with the **Manual Upload Form**.
5. Admin reviews the **warning banner**.
6. Admin completes all fields on the form: uploads file, selects court/tribunal, list type, start date, sensitivity, language, display from/to dates.
7. Admin clicks **Continue** to proceed.
8. Upload validation occurs. If successful → confirmation page. If failed → error messages displayed.

---

## 3. Low-Fidelity Wireframe

```
┌─────────────────────────────────────────────────────────────────────┐
│ GOV.UK | Court and tribunal hearings                                │
│                                                        Sign out     │
│                                                        Cymraeg      │
├─────────────────────────────────────────────────────────────────────┤
│ ⚠ Prior to upload you must ensure the file is suitable for          │
│ publication e.g. redaction of personal data has been done during     │
│ the production of this file.                                        │
├─────────────────────────────────────────────────────────────────────┤
│ [Choose file]                                                       │
│ Manually upload a csv, doc, docx, htm, html, json, or pdf file,     │
│ max size 2MB                                                        │
│ [Court name or Tribunal name search box]                            │
│ [List type dropdown] – Please choose a list type                    │
│ [Hearing start date: Day | Month | Year]                            │
│ [Sensitivity dropdown: Public, Private, Classified]                 │
│ [Language dropdown: English, Welsh, Bilingual]                      │
│ [Display file from: Day | Month | Year]                             │
│ [Display file to: Day | Month | Year]                               │
│                                                                     │
│ [Continue]                                                          │
│ ↑ Back to top                                                       │
├─────────────────────────────────────────────────────────────────────┤
│ Page Help (right side):                                             │
│ • Lists: one file per venue/type                                    │
│ • Sensitivity: public, private, classified                          │
│ • Display from: start date                                          │
│ • Display to: end date                                              │
├─────────────────────────────────────────────────────────────────────┤
│ Help | Privacy | Cookies | Accessibility | Contact | T&Cs | Welsh   │
│ Government Digital Service | Open Government Licence                │
│ © Crown copyright                                                   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 4. Page Specifications

### Content

* **Warning banner** with caution sign and bold text.
* **Form fields**: File upload, Court/Tribunal name, List type, Hearing start date, Sensitivity, Language, Display file from, Display file to.
* **Page Help section**: Explains Lists, Sensitivity, Display from/to.
* **Buttons**: Continue, Back to top.

### URL

* `/admin/upload/manual`

### Validation

* File upload must match approved formats and size limit.
* Required fields: Court name, List type, Hearing start date, Sensitivity, Language, Display from, Display to.
* Date fields must be valid and correctly formatted.

### Error Messages

* "File type not supported. Please upload a csv, doc, docx, htm, html, json, or pdf file."
* "File exceeds maximum size of 2MB."
* "Enter a court or tribunal name."
* "Select a list type."
* "Enter a valid date."

---

## 5. Navigation

* **Forward**: Submit → upload validation and confirmation.
* **Back to top**: Scrolls to top of page.
* **Sign out**: Returns to CaTH landing page.
* **Footer links**: Standard CaTH footer maintained.

---

## 6. Accessibility

* Must comply with **WCAG 2.2 AA** and **GOV.UK Design System** standards.
* All form fields must be labelled and accessible via keyboard and screen readers.
* Warning banner must be visually prominent and announced to assistive technology.
* Accordion filters (if reused) must be accessible.
* Welsh toggle must reload content in Welsh.

---

## 7. Test Scenarios

1. **Login success**: Admin logs in and accesses dashboard.
2. **Upload form access**: Admin clicks Upload → Manual Upload Form displayed.
3. **File upload success**: Correct format and size accepted.
4. **File upload failure**: Incorrect format or size → error message.
5. **Court search**: Typing court name suggests valid venues.
6. **List type selection**: Dropdown displays valid types.
7. **Date fields**: Accept only valid dates.
8. **Sensitivity selection**: Dropdown enforces Public/Private/Classified.
9. **Language selection**: Dropdown enforces valid options.
10. **Display from/to**: Dates applied correctly.
11. **Continue button**: Proceeds only when all fields valid.
12. **Back to top**: Scrolls to top of form.
13. **Welsh toggle**: Reloads page in Welsh.
14. **Footer links**: Navigate correctly.

---

## 8. Assumptions & Open Questions

* Confirm maximum number of list types available in dropdown.
* Confirm whether file validation (format/size) is performed client-side, server-side, or both.
* Confirm whether "Display to" date can be left blank (indefinite availability).
* Confirm confirmation message format after successful upload.
