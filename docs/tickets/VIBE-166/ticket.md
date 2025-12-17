# VIBE-166: Excel Upload – Complete excel upload process / Care Standards Tribunal Weekly Hearing List

## Summary
Excel Upload – Complete excel upload process / Care Standards Tribunal Weekly Hearing List

## Status
In Progress

## Assignee
Iqbal, Junaid (Junaid.Iqbal@justice.gov.uk)

## Created
2025-10-07T10:28:22.239+0000

## Updated
2025-12-04T09:48:44.172+0000

## Description

### PROBLEM STATEMENT

The non-strategic publishing route requires the upload of an excel file in CaTH which is then transformed at the back end to a Json file before publishing. The upload process is completed over a number of steps.

### User Story

**AS A** Local Admin

**I WANT** to complete the excel file upload process

**SO THAT** I can publish a hearing list in CaTH

### ACCEPTANCE CRITERIA

* A local admin is able to access a verified account by signing in through the sign in page with their approved log in details
* When the local admin clicks the continue button on the excel file upload form, the user sees a summary page that displays the high level details of the uploaded file (Court name, File, List type, hearing start date, sensitivity, language and display file dates) in a table
* Each detail row shows the selected data and a link titled 'change' beside it that allows the user update the selected detail
* The local admin can click the continue button below to complete the excel file upload process
* When the local admin clicks the continue button to complete the excel file upload process, a confirmation of successful upload is displayed by the system
* The system displays 'success' boldly in a green banner
* In the same banner, a descriptive text is displayed and reads 'Your file has been uploaded'
* Beneath the green banner, the user can see several links that directs them to 'upload another file', 'remove file' or 'home'.
* when the list is uploaded, at the back end, the excel file is converted to a JSon file and validated using the approved validation schema displayed in the front end with the attached style guide
* The first list type to be created through the excel upload is for the Care Standards Tribunal
* at the front end, the list name will be displayed with the date of publication and language version. i.e. **Care Standards Tribunal Weekly Hearing List for week commencing 24 November 2025 - English (Saesneg)**
* The list will display the list title 'Care Standards Tribunal Weekly Hearing List' at the top of the list followed by the duration covered in the list written in the format 'List for week commencing 24 November 2025' and then the date the list was last updated which is displayed as 'Last updated 24 November 2025 at 9:55am'
* this is followed by a collapsible accordion beside the words 'Important Information' which when opened, displays the following sentence 'Please contact the Care Standards Office at cst@justice.gov.uk for details of how to access video hearings.' and then the link [Observe a court or tribunal hearing - GOV.UK](https://www.gov.uk/guidance/observe-a-court-or-tribunal-hearing) which is masked in the text 'Observe a court or tribunal hearing as a journalist, researcher or member of the public'.
* This will be followed by a search field with the title 'Search Cases' and then a table with the following data fields / columns; Date, Case name, Hearing length, Hearing type, Venue and Additional information
* At the bottom of the page, the 'Data Source: ' is listed followed by the 'Back to top' arrow
* All CaTH pages specifications are maintained

### Excel Field Mapping

| Excel field name | Schema field name | Mandatory | Comments |
|------------------|-------------------|-----------|----------|
| Date | date | Yes | Must be in format dd/MM/yyyy. E.g. 01/01/2025. This will be transformed into 1 January 2025 when displaying on the style guide. |
| Case name | caseName | Yes | |
| Hearing length | hearingLength | Yes | |
| Hearing type | hearingType | Yes | |
| Venue | venue | Yes | |
| Additional information | additionalInformation | Yes | |

## Detailed Specification

### 1. User Story

**As a** Local Admin
**I want to** complete the Excel file upload process
**So that** I can publish a hearing list in CaTH

### 2. Form Fields

(Summary page uses read-only values; upload form fields are out of scope for this story. Only summary fields are listed here.)

| Field name | Input type | Required | Validation / Notes |
|------------|------------|----------|-------------------|
| Court name | Display | Yes | Must match existing CaTH venue reference data |
| File name | Display | Yes | Must be a valid Excel file previously uploaded |
| List type | Display | Yes | First list type implemented: **Care Standards Tribunal Weekly Hearing List** |
| Hearing start date | Display | Yes | Must be a valid date |
| Sensitivity | Display | Yes | Public or Restricted |
| Language | Display | Yes | EN / CY |
| Display file dates | Display | Yes | Date range (e.g., "List for week commencing…") |

Each display row includes a **Change** link pointing back to the upload form to modify the selected attribute.

### 3. Content Requirements

#### 3.1 Summary Page (Step Before Submission)

**EN Content**
* Title/H1: **"Check your upload details"**
* Table row labels:
  * Court name
  * File
  * List type
  * Hearing start date
  * Sensitivity
  * Language
  * Display file dates
* Link: **"Change"** (one per row)
* Button: **"Continue"**

**CY Content (placeholders)**
* Title/H1: "Welsh placeholder"
* Labels: "Welsh placeholder"
* Button: "Welsh placeholder"
* Link: "Welsh placeholder"

#### 3.2 Success Page After Submission

**EN**
* Success banner header: **"Success"**
* Success banner text: **"Your file has been uploaded"**
* Links below banner:
  * **Upload another file**
  * **Remove file**
  * **Home**

**CY**
* "Welsh placeholder" for banner and links.

#### 3.3 Front-End Display — Care Standards Tribunal Weekly Hearing List

The first list type to be supported is the **Care Standards Tribunal Weekly Hearing List**.
After Excel → JSON conversion and validation, the published list appears on the CaTH front end as follows.

##### Header Format
* **List title:** "Care Standards Tribunal Weekly Hearing List"
* **Duration:** "List for week commencing 24 November 2025"
* **Last updated:** "Last updated 24 November 2025 at 9:55am"

##### Important Information Accordion
* Label: **"Important information"** (accordion closed by default)
* When opened, show:
  * Sentence: **"Please contact the Care Standards Office at cst@justice.gov.uk for details of how to access video hearings."**
  * Link masked in text: **"Observe a court or tribunal hearing as a journalist, researcher or member of the public"** (links to Observe a court or tribunal hearing – GOV.UK)

##### Search Section
* Title/H2: **"Search Cases"**
* Search input: Free text (case name, date, venue, etc.)

##### Cases Table

Column headers:
1. **Date**
2. **Case name**
3. **Hearing length**
4. **Hearing type**
5. **Venue**
6. **Additional information**

Rows are populated from the validated JSON derived from the Excel upload.

##### Footer Content
* "**Data source:** Care Standards Tribunal"
* "**Back to top**" arrow/text

### 4. Errors

#### Summary Page
This page never triggers field-level validation (all values originate from the upload form).
Errors are only triggered if:
* Mandatory data is missing (redirect back to upload form)
* Session expired (redirect to sign-in)

#### Upload Success
No error messages appear on the success page.

### 5. Back Navigation
* **Summary page Back link:** Returns to Excel upload form with pre-populated values.
* **Success page Back link:** Returns to summary page (non-editable).
* **Front-end list Back to Top:** Scrolls user back to H1.

### 6. Accessibility

All pages must comply with **WCAG 2.2 AA**, **GOV.UK Design System**, and **CaTH page specifications**, including:
* Success banner must use `role="status"`
* Summary table must use:
  * `<th scope="row">` for row labels
  * `<th scope="col">` for header cells
* Accordion must implement:
  * `aria-expanded`
  * `aria-controls`
  * Standard GOV.UK accordion pattern
* Links must have visible focus states
* Search input must have:
  * Associated `<label>`
  * Keyboard accessibility
* Cases table must announce column headers to screen readers
* "Back to top" must be a keyboard focusable button or link

### 7. Test Scenarios

| ID | Scenario | Steps | Expected Result |
|----|----------|-------|-----------------|
| TS1 | Signed-in access | Sign in as Local Admin | Access granted to upload journey |
| TS2 | Summary page display | Upload Excel → Continue | Summary table displays all metadata |
| TS3 | Change row | Click "Change" next to row | Returns to upload form with editable fields |
| TS4 | Complete upload | Summary → Continue | Success page shown |
| TS5 | Success banner | After upload | Banner displays "Success – Your file has been uploaded" |
| TS6 | Navigation links | Click "Upload another file" | Returns to upload start |
| TS7 | Navigation links | Click "Remove file" | Goes to remove file flow |
| TS8 | JSON conversion | Upload completed | Excel transforms to JSON successfully |
| TS9 | Validation schema | JSON schema validation | Invalid files reject at back end (logged; out of scope for UI) |
| TS10 | Front-end list header | Open published list | H1 matches: "Care Standards Tribunal Weekly Hearing List" |
| TS11 | Duration display | View list | Shows "List for week commencing…" |
| TS12 | Last updated | View list | Shows correct timestamp |
| TS13 | Important information | Open accordion | Text + GOV.UK link displayed |
| TS14 | Search cases | Enter query | Table filters based on search |
| TS15 | Table columns | View table | All required columns present |
| TS16 | Data Source footer | Scroll bottom | "Data source" text appears |
| TS17 | Back to top | Click link | Scrolls to page header |
| TS18 | Accessibility | Keyboard-only navigation | All controls operable |
| TS19 | Welsh toggle | Switch language | All page text replaces with Welsh equivalents |

### 8. Additional Behaviour & Processing Requirements

#### Excel → JSON Transformation
* Triggered immediately after final Continue click.
* Must follow the **approved validation schema** and **style guide** for Care Standards Tribunal lists.
* Invalid JSON or schema mismatch should:
  * Prevent publication
  * Be logged for Local Admin review (outside UI scope)

#### List Naming Convention

Displayed name format on CaTH front end:
> **Care Standards Tribunal Weekly Hearing List for week commencing 24 November 2025 – English (Saesneg)**

Future Welsh versions:
**"… – Welsh (Cymraeg)"**

### 9. Assumptions & Open Questions

* Should the "Data source" label always show "Care Standards Tribunal", or be dynamic per venue?
* Should "Search Cases" filter the table client-side only, or make a server request?
* Is the "Last updated" timestamp sourced from upload timestamp or publication timestamp?

## Front-End Wireframes (Detailed)

### 1. Excel Upload — Summary Page

```
[ CaTH Header / Navigation ]

< Back

Check your upload details

--------------------------------------------------------
|Court name          |Care Standards Tribunal  |Change|

--------------------------------------------------------
|File                |cst-weekly-24-11-2025.xlsx|Change|

--------------------------------------------------------
|List type            |Care Standards Tribunal  |Change|
|                     |Weekly Hearing List      |       |

--------------------------------------------------------
|Hearing start date  |24 November 2025          |Change|

--------------------------------------------------------
|Sensitivity          |Public                    |Change|

--------------------------------------------------------
|Language            |English                  |Change|

--------------------------------------------------------
|Display file dates  |24–30 November 2025      |Change|

--------------------------------------------------------

[ Continue ]  (primary / green button)
```

### 2. Excel Upload — Success Page

```
[ CaTH Header / Navigation ]

< Back

┌───────────────────────────────────────────────┐
│  ✓ Success                                   │
│  Your file has been uploaded                 │
└───────────────────────────────────────────────┘

What do you want to do next?

• Upload another file
• Remove file
• Home
```

Each bullet is a standard GOV.UK link, spaced as a vertical list.

### 3. Care Standards Tribunal List Display Page

```
[ CaTH Header / Navigation ]

< Back

Care Standards Tribunal Weekly Hearing List
List for week commencing 24 November 2025
Last updated 24 November 2025 at 9:55am

[▼] Important information  (accordion closed initially)
    When expanded:
    Please contact the Care Standards Office at cst@justice.gov.uk
    for details of how to access video hearings.
    Observe a court or tribunal hearing as a journalist, researcher
    or member of the public (link to GOV.UK guidance)

Search Cases
[____________________________________]  (Search input)

+--------------------------------------------------------------+
|Date      |Case name|Hearing length|Hearing type      |
|           |         |               |                   |
|Venue      |Additional information                          |

+--------------------------------------------------------------+
|24 Nov 25  |CST/001...|Half day      |Substantive hearing|
|Care ...  |Remote; video access details via CST office    |

+--------------------------------------------------------------+
|25 Nov 25  |...
+--------------------------------------------------------------+|

Data source: Care Standards Tribunal

↑ Back to top
```

* Table can be standard single row per case with 6 columns, or 2-line responsive rows; spec allows either as long as all 6 data items are visible.
* "Back to top" is a clickable link or button with arrow icon.
