# VIBE-317: The RCJ Hearing Lists

**Status:** Ready for Progress
**Priority:** 3-Medium
**Created:** 2025-12-15
**Labels:** CaTH

## Problem Statement

Hearing lists are published in CaTH through various routes. This ticket covers the non-strategic publishing of hearing lists from The Royal Court of Justice (through the upload of Excel files in CaTH) which would require the creation of validation schema and style guides.

## User Story

**AS A** Service
**I WANT** to create the validation schema and style guides for hearing lists published from the Royal Courts of Justice using the non-strategic publishing route
**SO THAT** these hearing lists can be uploaded via Excel and published correctly in CaTH

## RCJ Hearing Lists to Implement

All lists are for venue "Royal Courts of Justice" linked to "Royal Courts of Justice Group" region:

### Standard Daily Cause List Format (7 columns)
1. **Civil Courts at the RCJ Daily Cause List** (Civil/Civil)
2. **County Court at Central London Civil Daily Cause List** (Civil/Civil)
3. **Court of Appeal (Criminal Division) Daily Cause List** (Criminal/Criminal) - *includes special quick guide link*
4. **Family Division of the High Court Daily Cause List** (Family/Family)
5. **King's Bench Division Daily Cause List** (Civil/High Court)
6. **King's Bench Masters Daily Cause List** (Civil/High Court)
7. **Mayor & City Civil Daily Cause List** (Civil/Civil)
8. **Senior Courts Costs Office Daily Cause List** (Civil/High Court)

**Standard Columns (in order):**
1. Venue
2. Judge
3. Time
4. Case Number
5. Case Details
6. Hearing Type
7. Additional Information

### Special Format 1: London Administrative Court Daily Cause List
**London Administrative Court Daily Cause List** (Civil/High Court)

**Special Schema:**
- Excel template has 2 tabs
- **Tab 1 (Main hearings):** 7 fields (Venue, Judge, Time, Case Number, Case Details, Hearing Type, Additional Information)
- **Tab 2 (Planning Court):** Header "Planning Court" + 7 fields (Venue, Judge, Time, Case Number, Case Details, Hearing Type, Additional Information)

**Display:**
- Two sub-sections: Main hearings and "Planning Court" with Planning Court data displayed in the style guide format

### Special Format 2: Court of Appeal (Civil Division)
**Court of Appeal (Civil Division) Daily Cause List** (Civil/High Court)

**Special Schema:**
- Excel template has 2 tabs
- **Tab 1 (Daily hearings):** Standard 7 columns (Venue, Judge, Time, Case Number, Case Details, Hearing Type, Additional Information)
- **Tab 2 (Notice for future judgments):** 8 columns (Date, Venue, Judge, Time, Case Number, Case Details, Hearing Type, Additional Information)

**Display:**
- Two sub-sections: "Daily hearings" and "Notice for future judgments"

## Administrative Court Lists (Outside RCJ Venue)

### Birmingham Administrative Court Daily Cause List
- **Jurisdiction:** Civil / High Court
- **Venue:** Birmingham Administrative Court
- **Region:** Midlands
- **Format:** Standard 7 columns

### Leeds Administrative Court Daily Cause List
- **Jurisdiction:** Civil / High Court
- **Venue:** Leeds Administrative Court
- **Region:** Yorkshire
- **Format:** Standard 7 columns

### Bristol and Cardiff Administrative Court Daily Cause List
- **Jurisdiction:** Civil / High Court
- **Venue:** Bristol and Cardiff Administrative Court
- **Region:** Wales and South West
- **Format:** Standard 7 columns

### Manchester Administrative Court Daily Cause List
- **Jurisdiction:** Civil / High Court
- **Venue:** Manchester Administrative Court
- **Region:** North West
- **Format:** Standard 7 columns

## Royal Courts of Justice Landing Page

**Purpose:** Central hub for all RCJ hearing lists

**Content:**

### Header
- **EN:** "What do you want to view from Royal Courts of Justice?"
- **CY:** "Beth hoffech chi ei weld o Lys Barn Brenhinol?"

### FaCT Link
- **EN:** "Find contact details and other information about courts and tribunals in England and Wales, and some non-devolved tribunals in Scotland."
- **CY:** "Dewch o hyd i fanylion cyswllt a gwybodaeth arall am lysoedd a thribiwnlysoedd yng Nghymru a Lloegr, a rhai tribiwnlysoedd heb eu datganoli yn yr Alban."
- **URL:** https://www.find-court-tribunal.service.gov.uk/

### Caution Message
- **EN:** "These lists are subject to change until 4:30pm. Any alterations after this time will be telephoned or emailed direct to the parties or their legal representatives. If you do not see a list published for the court you are looking for, it means there are no hearings scheduled."
- **CY:** "Mae'r rhestrau hyn yn destun newid tan 4:30pm. Os bydd unrhyw newidiadau ar ôl yr amser hwn, byddwn yn ffonio neu'n anfon e-bost yn uniongyrchol at y partïon neu eu cynrychiolwyr cyfreithiol. Os nad ydych yn gweld rhestr wedi'i chyhoeddi ar gyfer y llys rydych yn chwilio amdano, mae'n golygu nad oes gwrandawiadau wedi'u trefnu."

### Hearing Lists Section
- **Heading EN:** "Hearing lists"
- **Heading CY:** "Rhestrau gwrandawiadau"
- **Display:** All RCJ hearing lists in alphabetical order

## Form Fields

### Front-end (Public User)

#### Search cases
- **Input type:** text
- **Required:** No
- **Validation:**
  - Maximum length: 200 characters
  - Format: free text
- **Behaviour:** filters visible hearing entries by matching any displayed case text

#### Download PDF
- **Input type:** button/link
- **Required:** No
- **Behaviour:** downloads PDF version of currently viewed hearing list

### Admin (Non-Strategic Publishing Route)

#### List type
- **Input type:** select (dropdown)
- **Required:** Yes
- **Validation:** Must match one of the configured list types for RCJ or Administrative Courts

#### Upload hearing list
- **Input type:** file upload
- **Required:** Yes
- **Validation:**
  - File type: .xlsx only
  - File must conform to validation schema for selected list type
  - Publishing blocked if schema validation fails

## Content (Welsh Translations)

### Standard Daily Cause List Pages

**Title:** List name (e.g., "King's Bench Division Daily Cause List")

**Column Headers:**
- **EN:** Venue, Judge, Time, Case Number, Case Details, Hearing Type, Additional Information
- **CY:** Lleoliad, Barnwr, Amser, Rhif yr Achos, Manylion yr achos, Math o Wrandawiad, Gwybodaeth ychwanegol

**Download Button:**
- **EN:** "Download PDF"
- **CY:** "Lawrlwytho PDF"

### London Administrative Court Daily Cause List Page

**Title:**
- **EN:** "London Administrative Court Daily Cause List"
- **CY:** "Rhestr Achosion Dyddiol y Llys Gweinyddol Llundain"

**Sub-sections:**
- **EN:** Main hearings and "Planning Court"
- **CY:** Prif wrandawiadau and "Llys Cynllunio"

**Column Headers (both tabs):**
- **EN:** Venue, Judge, Time, Case Number, Case Details, Hearing Type, Additional Information
- **CY:** Lleoliad, Barnwr, Amser, Rhif yr Achos, Manylion yr achos, Math o Wrandawiad, Gwybodaeth ychwanegol

### Court of Appeal (Civil Division) Page

**Title:**
- **EN:** "Court of Appeal (Civil Division) Daily Cause List"
- **CY:** "Rhestr Achosion Dyddiol y Llys Apêl (Adran Sifil)"

**Sub-sections:**
- **EN:** "Daily hearings" and "Notice for future judgments"
- **CY:** "Gwrandawiadau dyddiol" and "Hysbysiad ar gyfer dyfarniadau'r dyfodol"

### Court of Appeal (Criminal Division) Special Content

**Masked Link:**
- **EN:** "For further information about our hearings, please see [this quick guide](https://www.judiciary.uk/wp-content/uploads/2025/07/A-QUICK-GUIDE-TO-HEARINGS-IN-THE-CACD.docx)"
- **CY:** "y canllaw cyflym hwn"

## Errors

### No hearings available
- **EN:** "There are no hearings scheduled."
- **CY:** "Nid oes gwrandawiadau wedi'u trefnu."

### Search returns no results
- **EN:** "No cases match your search."
- **CY:** "Nid oes achosion yn cyfateb i'ch chwiliad."

### List unavailable
- **EN:** "We cannot display this hearing list at the moment."
- **CY:** "Ni ellir arddangos y rhestr gwrandawiadau hon ar hyn o bryd."

### Admin upload – invalid file type
- **EN:** "The file must be an Excel .xlsx."
- **CY:** "Rhaid i'r ffeil fod yn Excel .xlsx."

### Admin upload – schema validation failure
- **EN:** "The file does not match the required format for this hearing list."
- **CY:** "Nid yw'r ffeil yn cyd-fynd â'r fformat gofynnol ar gyfer y rhestr hon."

## Back Navigation

### From any RCJ hearing list
- **Behaviour:** Back returns the user to the RCJ landing page

### From PDF view
- **Behaviour:** Back returns to the same hearing list page

### From admin upload journey
- **Behaviour:** Back returns to the previous admin screen without publishing

## Accessibility

- All pages must meet WCAG 2.2 AA standards
- Tables must use semantic table markup with correctly associated headers
- Error messages must be announced to assistive technologies and appear next to the relevant control

## Test Scenarios

1. **Venue configuration:**
   - Royal Courts of Justice exists and is linked to Royal Courts of Justice Group region
   - All Administrative Court venues exist with correct region linkages

2. **List configuration:**
   - All lists are linked to the correct venue, region, and jurisdiction

3. **Landing page:**
   - Header, FaCT link, caution message, and alphabetical list order display correctly

4. **Standard lists:**
   - Columns render in the specified order and match the validation schema

5. **London Administrative Court Daily Cause List:**
   - Excel template supports two tabs (Main hearings and Planning Court)
   - "Planning Court" renders as a distinct sub-section with header

6. **Court of Appeal (Civil Division):**
   - Excel template supports two tabs
   - "Notice for future judgments" renders as a distinct sub-section

7. **PDF:**
   - Each list generates a downloadable PDF matching the on-screen content

8. **Admin upload:**
   - Invalid files are rejected with clear validation errors
   - Valid files publish successfully using the correct style guide

## Deliverables

- [ ] Royal Courts of Justice venue and region configuration
- [ ] RCJ landing page implementation
- [ ] 8 standard format list type implementations with validation schemas
- [ ] London Administrative Court Daily Cause List with two-tab support (Planning Court)
- [ ] Court of Appeal (Civil Division) with two-tab support
- [ ] 4 Administrative Court list type implementations (outside RCJ)
- [ ] Excel templates for all list types
- [ ] PDF generation for all list types
- [ ] Confluence documentation pages for all list types
- [ ] Email summary templates
- [ ] Welsh translations for all content
- [ ] E2E tests for all list types
- [ ] Accessibility compliance verification

## Attachments

- Court of Appeal (Civil Division) Daily Cause List Schema.xlsx
- RCJ hearing lists and welsh translations.docx
- RCJ hearing lists mock ups.docx
- RCJ mapping.pdf
- Royal Court of Justice hearing lists.xlsx
