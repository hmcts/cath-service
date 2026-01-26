# VIBE-310: Blob explorer and manual re-submission trigger functionality

## User Story
As a System Admin User, I want to access the Blob Explorer functionality in CaTH so that I can manually re-submit a publication.

## Problem Statement
System admin users in CaTH access several system functionalities through the System Admin dashboard which allows them to perform administrative tasks. The dashboard acts as the main control panel for managing reference data, user accounts, media accounts, audit logs, and other administrative operations. This ticket covers the Blob explorer and manual re-submission trigger functionality.

## Technical Specification
If a user clicks on re-submit for a specific publication, it should trigger subscription notification to all the subscribers for that publication.

## Pages and User Journey

### Page 1: System Admin Dashboard
- Shows Blob Explorer tile (button/tile component)
- Tile must be visible to System Admin users only
- Clicking the tile navigates to "Blob Explorer – Locations"

**Content:**
- EN: Title/H1 — "System Admin dashboard"
- CY: Title/H1 — "Welsh placeholder"
- EN: Tile — "Blob explorer"
- CY: Tile — "Welsh placeholder"

**Errors:**
- EN: "We could not load your system admin tools. Try again later."
- CY: "Welsh placeholder"

**Navigation:**
- Browser back only

---

### Page 2: Blob Explorer Locations
- Page title: "Blob Explorer Locations"
- Descriptive text: "Choose a location to see all publications associated with it."
- Table displaying all venues with columns:
  - Location
  - Number of publications per venue
- Selecting a location navigates to Blob Explorer Publications page

**Content:**
- EN: Title/H1 — "Blob Explorer Locations"
- CY: Title/H1 — "Welsh placeholder"
- EN: Body text — "Choose a location to see all publications associated with it."
- CY: Body text — "Welsh placeholder"
- EN: Column headings — "Location", "Number of publications per venue"
- CY: Column headings — "Welsh placeholder", "Welsh placeholder"

**Errors:**
- EN: "We could not load locations. Try again later."
- CY: "Welsh placeholder"

**Navigation:**
- Back returns to System Admin dashboard

---

### Page 3: Blob Explorer Publications
- Page title: "Blob Explorer Publications"
- Descriptive text: "Choose a publication from the list."
- Table displaying publications for selected location with columns:
  - Artefact ID (clickable link)
  - List Type
  - Display From
  - Display To
- Clicking Artefact ID opens either JSON file page or Flat file page depending on publication type

**Content:**
- EN: Title/H1 — "Blob Explorer Publications"
- CY: Title/H1 — "Welsh placeholder"
- EN: Body text — "Choose a publication from the list."
- CY: Body text — "Welsh placeholder"
- EN: Column headings — "Artefact ID", "List type", "Display from", "Display to"
- CY: Column headings — "Welsh placeholder" × 4

**Errors:**
- EN: "We could not load publications for this location."
- CY: "Welsh placeholder"

**Navigation:**
- Back returns to Blob Explorer Locations

---

### Page 4A: Blob Explorer – JSON File
- Page title: "Blob Explorer – JSON file"
- Green "Re-submit subscription" button under page title
- Metadata section in a table with fields:
  - Artefact ID
  - Location ID
  - Location Name
  - Publication Type
  - List Type
  - Provenance
  - Language
  - Sensitivity
  - Content Date
  - Display From
  - Display To
- "Link to rendered template" displayed below table (opens rendered publication)
- Closed accordion titled "View Raw JSON Content" (displays raw JSON when opened)

**Content:**
- EN: Title/H1 — "Blob Explorer – JSON file"
- CY: Title/H1 — "Welsh placeholder"
- EN: Button — "Re-submit subscription"
- CY: Button — "Welsh placeholder"
- EN: Section heading — "Metadata"
- CY: Section heading — "Welsh placeholder"
- EN: Accordion title — "View Raw JSON Content"
- CY: Accordion title — "Welsh placeholder"
- EN: Link — "Link to rendered template"
- CY: Link — "Welsh placeholder"

**Errors:**
- EN: "We could not load the JSON publication."
- CY: "Welsh placeholder"

**Navigation:**
- Back returns to Blob Explorer Publications

---

### Page 4B: Blob Explorer – Flat File
- Page title: "Blob Explorer – Flat file"
- Green "Re-submit subscription" button
- Metadata section (same fields as JSON file page)
- "Link to file" displayed below table:
  - If PDF → opens in pop-out view
  - If Word doc → triggers file download

**Content:**
- EN: Title/H1 — "Blob Explorer – Flat file"
- CY: Title/H1 — "Welsh placeholder"
- EN: Button — "Re-submit subscription"
- CY: Button — "Welsh placeholder"
- EN: Section heading — "Metadata"
- CY: Section heading — "Welsh placeholder"
- EN: Link — "Link to file"
- CY: Link — "Welsh placeholder"

**Errors:**
- EN: "We could not load the file publication."
- CY: "Welsh placeholder"

**Navigation:**
- Back returns to Blob Explorer Publications

---

### Page 5: Confirm Subscription Re-submission
- Page title: "Confirm subscription re-submission"
- Summary table with fields:
  - Location Name
  - Publication Type
  - List Type
  - Provenance
  - Language
  - Sensitivity
  - Content Date
  - Display From
  - Display To
- Green "Confirm" button
- "Cancel" link

**Actions:**
- Confirm: Proceeds to submission confirmation page
- Cancel: Returns to Blob Explorer Locations

**Content:**
- EN: Title/H1 — "Confirm subscription re-submission"
- CY: Title/H1 — "Welsh placeholder"
- EN: Button — "Confirm"
- CY: Button — "Welsh placeholder"
- EN: Link — "Cancel"
- CY: Link — "Welsh placeholder"

**Errors:**
- EN: "We could not re-submit this publication. Try again later."
- CY: "Welsh placeholder"

**Navigation:**
- Back returns to JSON/Flat File page

---

### Page 6: Submission Re-submitted
- Green success banner with text "Submission re-submitted."
- Descriptive text: "What do you want to do next?"
- Link to "Blob explorer – Locations"

**Content:**
- EN: Title/H1 — "Submission re-submitted"
- CY: Title/H1 — "Welsh placeholder"
- EN: Success banner text — "Submission re-submitted."
- CY: Success banner text — "Welsh placeholder"
- EN: Body text — "What do you want to do next?"
- CY: Body text — "Welsh placeholder"
- EN: Link — "Blob explorer – Locations"
- CY: Link — "Welsh placeholder"

**Navigation:**
- Browser back returns to confirmation page but must not re-submit

---

## Accessibility Requirements
- All screens must comply with WCAG 2.2 AA
- Buttons, links, tiles, tables, and accordions support keyboard navigation
- Focus order follows a logical sequence
- Success banners and errors use appropriate ARIA roles
- Accordion includes `aria-expanded` and `aria-controls`
- Tables use semantic `<table>`, `<thead>`, `<tbody>`, and correct header scope
- Screen reader users can:
  - Identify page titles
  - Understand metadata tables
  - Detect expanded/collapsed accordion states
  - Receive announcements for errors and success messages
- Bilingual content rendered correctly when language switches

## Test Scenarios

### Dashboard
- Admin user sees Blob Explorer tile
- Clicking the tile → Blob Explorer Locations

### Locations page
- Locations table loads with correct venue counts
- Clicking a location → Publications page

### Publications page
- Publications list loads for selected venue
- Clicking an Artefact ID → loads correct JSON or Flat File page

### JSON File page
- Metadata table displays all required fields
- "Link to rendered template" opens rendered publication
- Accordion displays raw JSON when opened
- Clicking Re-submit subscription → Confirmation page

### Flat File page
- Metadata table displays all fields
- "Link to file" opens or downloads appropriate file
- Clicking Re-submit subscription → Confirmation page

### Confirmation page
- Summary values match metadata
- Cancel → Locations page
- Confirm → Success page

### Success page
- Success banner shown
- "Blob explorer – Locations" link returns to Locations

### Accessibility
- All interactive elements reachable by keyboard
- Screen readers announce all metadata, errors, and success states
