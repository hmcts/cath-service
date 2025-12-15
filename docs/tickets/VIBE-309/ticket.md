# VIBE-309: Configure List Type and Get List information from database

**Status:** In Progress
**Priority:** 3-Medium
**Assignee:** Alao, Daniel
**Labels:** cath

## Summary
Configure List Type and Get List information from database

## Description

### PROBLEM STATEMENT

In CaTH AI, we are getting list type information from mock file libs/list-types/common/src/mock-list-types.ts. Now we have implemented Admin functionality and Location information is storing into database, so we need to store list information into database to make it more flexible. Below will be the list database fields:

```sql
CREATE TABLE list_types (
    id INTEGER PRIMARY KEY,
    name VARCHAR(1000) NOT NULL,
    friendly_name VARCHAR(1000),
    welsh_friendly_name VARCHAR(255),
    shortened_friendly_name VARCHAR(255),
    url VARCHAR(255),
    default_sensitivity VARCHAR(50),
    allowed_provenance VARCHAR(50) NOT NULL,
    is_non_strategic BOOLEAN DEFAULT false
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

We also need to link list with sub-jurisdictions. sub-jurisdictions table has been created already. So you just need to create a table which can link list types with sub-jurisdictions table.

Once tables has been created, You need do implement following functionality:
* Create a new tile in System admin dashboard named "Configure List Type:
* Create a screen where you can input all the related information about the list type.
  - name, friendly_name, welsh_friendly_name, shortened_friendly_name and url. These will be text boxes
  - default_sensitivity will be dropdown with option Public, private and classified
  - allowed_provenance will be checkbox with values CFT_IDAM, B2C, COMMON_PLATFORM
  - is_non_strategic will be radio button with Yes or No option
  - Validation needs to be implemented on all the field. All fields are mandatory
* Next page will display sub-jurisdictions as a checkbox and user can select more than one sub-jurisdictions
* Preview screen will display all the information which user enter
* Success screen will display success message aligned with other pages.
* Update manual and non-strategic upload page to use shortened_friendly_name to populate list type dropdown
* Create a branch from vibe-166-cst-excel-list

Once all system admin screen implemented, entered all the information about lists using libs/list-types/common/src/mock-list-types.ts.

Final step is to get all the list type information from database on all the pages where it was using libs/list-types/common/src/mock-list-types.ts. Once this functionality is implemented, delete libs/list-types/common/src/mock-list-types.ts file.

### Acceptance Criteria
1. Move list type information to database tables
2. All System Admin screens have been implemented
3. All the code getting list information from database (not from libs/list-types/common/src/mock-list-types.ts)

---

## User Story

As a System Admin User, I want to configure list types through the System Admin dashboard so that list type information is stored in the database rather than in mock files and can be managed flexibly.

---

## Page 1 — System Admin Dashboard (Configure List Type tile)

### Form fields
* **Configure List Type tile**
  - Input type: button (tile)
  - Required: N/A (navigation only)
  - Validation rules:
    - Visible only to users with System Admin permissions.
    - On click, navigates to "Configure List Type – Enter details" page.

### Content
* EN: Title/H1 — "System Admin dashboard"
* CY: Title/H1 — "Welsh placeholder"
* EN: Tile label — "Configure List Type"
* CY: Tile label — "Welsh placeholder"

### Errors
* No field-level errors (no form submission).
* Page-level error only if the dashboard fails to load.
  - EN: "We could not load your system admin tools. Try again later."
  - CY: "Welsh placeholder"

### Back navigation
* Back link not required.
* Browser back returns to previous page.

---

## Page 2 — Configure List Type: Enter Details

### Form fields
* **name**
  - Input type: text
  - Required: Yes
  - Validation rules:
    - Maximum length: 1000 characters
    - Format: free text, no line breaks
    - Cannot be empty
* **friendly_name**
  - Input type: text
  - Required: Yes
  - Validation rules:
    - Maximum length: 1000
    - Cannot be empty
* **welsh_friendly_name**
  - Input type: text
  - Required: Yes
  - Validation rules:
    - Maximum length: 255
    - Cannot be empty
* **shortened_friendly_name**
  - Input type: text
  - Required: Yes
  - Validation rules:
    - Maximum length: 255
    - Cannot be empty
* **url**
  - Input type: text
  - Required: Yes
  - Validation rules:
    - Maximum length: 255
    - Must be valid relative or absolute path format
* **default_sensitivity**
  - Input type: dropdown
  - Required: Yes
  - Options:
    - Public
    - Private
    - Classified
  - Validation rules:
    - Option must be selected
* **allowed_provenance**
  - Input type: checkbox group
  - Required: Yes
  - Options:
    - CFT_IDAM
    - B2C
    - COMMON_PLATFORM
  - Validation rules:
    - At least one option must be selected
* **is_non_strategic**
  - Input type: radio group
  - Required: Yes
  - Options: Yes / No
  - Validation rules:
    - Exactly one radio option must be selected
* **Continue**
  - Input type: button
  - Required: N/A
  - Validation rules:
    - Disabled unless all mandatory fields are complete and valid

### Content
* EN: Title/H1 — "Enter list type details"
* CY: Title/H1 — "Welsh placeholder"
* EN: Label — "Name"
* CY: Label — "Welsh placeholder"
* EN: Label — "Friendly name"
* CY: Label — "Welsh placeholder"
* EN: Label — "Welsh friendly name"
* CY: Label — "Welsh placeholder"
* EN: Label — "Shortened friendly name"
* CY: Label — "Welsh placeholder"
* EN: Label — "URL"
* CY: Label — "Welsh placeholder"
* EN: Dropdown label — "Default sensitivity"
* CY: Dropdown label — "Welsh placeholder"
* EN: Dropdown options — "Public", "Private", "Classified"
* CY: Dropdown options — "Welsh placeholder", "Welsh placeholder", "Welsh placeholder"
* EN: Checkbox label — "Allowed provenance"
* CY: Checkbox label — "Welsh placeholder"
* EN: Checkbox options — "CFT_IDAM", "B2C", "COMMON_PLATFORM"
* CY: Checkbox options — "Welsh placeholder", "Welsh placeholder", "Welsh placeholder"
* EN: Radio label — "Is non-strategic?"
* CY: Radio label — "Welsh placeholder"
* EN: Radio options — "Yes", "No"
* CY: Radio options — "Welsh placeholder", "Welsh placeholder"
* EN: Button — "Continue"
* CY: Button — "Welsh placeholder"

### Errors
* For each text field:
  - EN: "Enter a value for <field name>."
  - CY: "Welsh placeholder"
* For sensitivity/select field:
  - EN: "Select a default sensitivity."
  - CY: "Welsh placeholder"
* For provenance:
  - EN: "Select at least one allowed provenance."
  - CY: "Welsh placeholder"
* For non-strategic:
  - EN: "Select whether this list type is non-strategic."
  - CY: "Welsh placeholder"

### Back navigation
* EN: "Back" returns to System Admin Dashboard.
* CY: "Welsh placeholder"

---

## Page 3 — Configure List Type: Select Sub-jurisdictions

### Form fields
* **sub-jurisdictions**
  - Input type: checkbox group
  - Required: Yes
  - Validation rules:
    - At least one checkbox must be selected
    - Values must match existing sub-jurisdiction IDs
* **Continue**
  - Input type: button
  - Required: N/A

### Content
* EN: Title/H1 — "Select sub-jurisdictions"
* CY: Title/H1 — "Welsh placeholder"
* EN: Body text — "Select all sub-jurisdictions that apply to this list type."
* CY: Body text — "Welsh placeholder"
* EN: Checkbox options — dynamically generated from database
* CY: Checkbox options — "Welsh placeholder"
* EN: Button — "Continue"
* CY: Button — "Welsh placeholder"

### Errors
* EN: "Select at least one sub-jurisdiction."
* CY: "Welsh placeholder"

### Back navigation
* EN: "Back" returns to the Enter Details page with previously entered values retained.
* CY: "Welsh placeholder"

---

## Page 4 — Configure List Type: Preview

### Form fields
* No editable form fields; preview only.
* **Confirm**
  - Input type: button
  - Required: N/A
* **Back**
  - Input type: link
  - Required: No
  - Returns to sub-jurisdictions page

### Content
* EN: Title/H1 — "Check list type details"
* CY: Title/H1 — "Welsh placeholder"
* EN: Body text — "Review the details before saving."
* CY: Body text — "Welsh placeholder"
* EN: Table headings (all values read-only):
  - "Name"
  - "Friendly name"
  - "Welsh friendly name"
  - "Shortened friendly name"
  - "URL"
  - "Default sensitivity"
  - "Allowed provenance"
  - "Is non-strategic"
  - "Sub-jurisdictions"
* CY: Table headings — "Welsh placeholder" (one placeholder per heading)
* EN: Button — "Confirm"
* CY: Button — "Welsh placeholder"

### Errors
* If preview data cannot be loaded:
  - EN: "We could not load the list type details. Try again."
  - CY: "Welsh placeholder"

### Back navigation
* EN: "Back" returns to Select Sub-jurisdictions page.
* CY: "Welsh placeholder"

---

## Page 5 — Configure List Type: Success

### Form fields
* **Return to System Admin dashboard**
  - Input type: link
  - Required: No

### Content
* EN: Title/H1 — "List type saved"
* CY: Title/H1 — "Welsh placeholder"
* EN: Success banner — "List type saved successfully."
* CY: Success banner — "Welsh placeholder"
* EN: Body text — "What do you want to do next?"
* CY: Body text — "Welsh placeholder"
* EN: Link — "Return to System Admin dashboard"
* CY: Link — "Welsh placeholder"

### Errors
* No field-level errors.
* If navigation fails:
  - EN: "We could not return to the dashboard. Use your browser back button."
  - CY: "Welsh placeholder"

### Back navigation
* Back link not shown (success screen).
* Browser back returns to Preview but must not re-submit.

---

## Accessibility
* Complies with WCAG 2.2 AA and GOV.UK Design System patterns.
* All interactive elements accessible via keyboard and have visible focus.
* Screen readers correctly announce:
  - All form labels
  - Error messages
  - Success banner using appropriate ARIA role
* Tables use semantic markup with correct scope attributes.
* Language toggle switches all EN/CY content and updates the HTML lang attribute.
* Accordions, checkboxes, radios, and dropdowns announce their state to assistive technologies.

---

## Test Scenarios

### Admin Dashboard
* When the System Admin dashboard loads, the "Configure List Type" tile is visible to authorised users.
* When the user selects the tile, they navigate to Enter Details.

### Enter Details page
* When all required fields are empty and Continue is clicked, all relevant errors appear.
* When valid values are entered for all fields, Continue navigates to Sub-jurisdictions.

### Sub-jurisdictions page
* When no checkbox is selected and Continue is clicked, an error appears.
* When one or more sub-jurisdictions are selected, Continue navigates to Preview.

### Preview page
* All previously entered values are displayed correctly.
* Back returns to Sub-jurisdictions with all selections retained.
* Confirm saves the list type and navigates to Success.

### Success page
* Displays success banner and standard success layout.
* Link returns to the System Admin dashboard.

### Database usage
* All list type screens retrieve list type and sub-jurisdiction data from the database.
* No page reads data from the legacy mock-list-types.ts file.

### Accessibility
* All pages can be fully navigated by keyboard.
* Screen reader announces all labels, errors, banners, and headings correctly.

---

## Database Specification

### Table: list_types

Fields:
* id — INTEGER PRIMARY KEY
* name — VARCHAR(1000) NOT NULL
* friendly_name — VARCHAR(1000)
* welsh_friendly_name — VARCHAR(255)
* shortened_friendly_name — VARCHAR(255)
* url — VARCHAR(255)
* default_sensitivity — VARCHAR(50)
* allowed_provenance — VARCHAR(50) NOT NULL
* is_non_strategic — BOOLEAN DEFAULT false
* created_at — TIMESTAMP
* updated_at — TIMESTAMP

### Table: list_types_sub_jurisdictions

Links each list type to one or more sub-jurisdictions.

Fields:
* id — INTEGER PRIMARY KEY
* list_type_id — INTEGER (FK → list_types.id)
* sub_jurisdiction_id — INTEGER (FK → sub_jurisdictions.id)

Constraints:
* list_type_id and sub_jurisdiction_id must pair uniquely (no duplicates).
* Deleting a list type removes its linking rows (cascade delete).
