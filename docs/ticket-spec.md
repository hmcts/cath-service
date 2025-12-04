# VIBE-151: Find a single justice procedure case

## Description

All CaTH users, including members of the public, have access to hearing lists published in CaTH including single justice procedure (SJP) cases.

**As a** CaTH User
**I want to** access a Single Justice Procedure (SJP) hearing list
**So that** I can view specific SJP hearing information

## Technical Specifications

- Schema for Single Justice Procedure – Public List: http://github.com/hmcts/pip-data-management/blob/master/src/main/resources/schemas/single_justice_procedure_public.json
- Schema for Single Justice Procedure – Press List: https://github.com/hmcts/pip-data-management/blob/master/src/main/resources/schemas/single_justice_procedure_press.json

## Acceptance Criteria

### General Requirements
- There are 2 types of SJP lists: the public list and the press list
- The system should be able to handle up to 30,000 SJP case load
- Validation schemas:
  - [SJP Press List](https://tools.hmcts.net/confluence/spaces/PUBH/pages/1558261966/SJP+Press+List)
  - [SJP Public List](https://tools.hmcts.net/confluence/spaces/PUBH/pages/1558261961/SJP+Public+List)
- Style guide: See attached document

### Single Justice Procedure – Public List
- All CaTH users have access to unrestricted published hearing information in CaTH
- On the 'What do you want to view from single justice procedure?' page, users can see links to published SJP lists
- Users can click on any of the SJP list links to view the hearing details of all SJP cases that are published within each SJP list
- Each list displays the list title followed by text stating the number of cases in the list and the date/time the list was generated: 'List containing 10220 case(s) generated on 28 November 2025 at 9am'
- A green 'Download a copy' button allows users to download the list
- The SJP cases are published in a table with the following data fields: Name, Postcode, Offence, Prosecutor
- Users can click on page numbers to view the SJP cases published across different pages
- Users can click the 'show filters' button to access the SJP filter
- Users can search for specific case details using the search bar
- Users can use filter options to search for specific cases using postcode or prosecutor
- Users can close each filter option by clicking on the collapsible accordion
- Users can clear the selected filter options by clicking the 'clear filter' link provided at the top of the filter
- Users can go back to the top of the page by clicking the 'back to top' arrow/text provided at the bottom of the page
- All CaTH pages specifications are maintained

### Single Justice Procedure – Press List
- Only verified CaTH users have access to the SJP Press List
- Under the list title is an accordion titled 'What are Single Justice Procedure Cases?' which is open by default with the text: 'Cases ready to be decided by a magistrate without a hearing. Includes TV licensing and minor traffic offences such as speeding.'
- Publication date and time are displayed in the format:
  - List for 28 November 2025
  - Published 28 November 2025 at 9:05am
- A second accordion titled 'Important Information' follows with text and a link to the media protocol
- A green 'Download a copy' button allows users to download the list
- Users can click the 'show filters' button to access the SJP filter
- Users can search for specific case details using the search bar
- Users can use filter options to search for specific cases using postcode or prosecutor
- Users can close each filter option by clicking on the collapsible accordion
- Users can clear the selected filter options by clicking the 'clear filter' link
- Users can click on page numbers to view the SJP cases published across different pages
- Cases are displayed in sections with a table containing: Name, Date of Birth, Reference, Address, Prosecutor
- Each case includes a 'Reporting Restriction' field which can be either true or false
- Users can go back to the top of the page by clicking the 'back to top' arrow/text
- All CaTH pages specifications are maintained

## Pages Specification

This implementation includes **three pages**:

### PAGE 1 — What do you want to view from Single Justice Procedure?

#### Form Fields
No form fields - page is navigational only

#### Content

**English:**
- Title/H1: "What do you want to view from Single Justice Procedure?"
- SJP list links: "SJP Public List – [date]", "SJP Press List – [date]"
- Button/link: "Back"

**Welsh:**
- Title/H1: "Welsh placeholder"
- SJP list links: "Welsh placeholder"
- Back: "Welsh placeholder"

#### Errors
No errors on this page

#### Back Navigation
Back returns user to previous page (likely main hearings selection page)

---

### PAGE 2 — SJP PUBLIC LIST PAGE

#### Form Fields
| Field name | Input type | Required | Validation |
|------------|------------|----------|------------|
| Search SJP cases | Text | No | Max 200 chars |
| Postcode filter | Text | No | Must match UK postcode regex format |
| Prosecutor filter | Dropdown | No | Options supplied by SJP list metadata |
| Filter accordions | Toggle | No | GOV.UK accordion pattern |
| Clear filters | Link | No | Resets all applied filters |
| Pagination | Number link | No | Must be a valid page index |

#### Content

**English:**
- Title/H1: "Single Justice Procedure – Public List"
- Text under title: "List containing [X] case(s) generated on [Date] at [Time]."
- Green button: "Download a copy"
- Case table headers: Name, Postcode, Offence, Prosecutor
- Search bar: "Search SJP cases"
- Show filters button: "Show filters"
- Filter accordion titles: "Postcode", "Prosecutor"
- Filter links: "Clear filter"
- Pagination controls: "Previous", page numbers, "Next"
- Bottom of page: "Back to Top" (+ arrow icon)

**Welsh:**
All content has Welsh placeholders

#### Errors

**English:**
- Invalid postcode: "Enter a valid postcode"

**Welsh:**
- "Welsh placeholder"

#### Back Navigation
- Back returns to "What do you want to view from single justice procedure?"
- Back to Top scrolls to page header

---

### PAGE 3 — SJP PRESS LIST PAGE

#### Form Fields
| Field name | Input type | Required | Validation |
|------------|------------|----------|------------|
| Search SJP cases | Text | No | Max 200 chars |
| Postcode filter | Text | No | UK postcode format |
| Prosecutor filter | Dropdown | No | Populated from list data |
| Filter accordions | Toggle | No | Must expand/collapse |
| Clear filter | Link | No | Clears all filters |
| Pagination | Number link | No | Must be valid page index |

#### Content

**English:**
- Title/H1: "Single Justice Procedure – Press List"
- Accordion (open by default): "What are Single Justice Procedure Cases?"
  - Text: "Cases ready to be decided by a magistrate without a hearing. Includes TV licensing and minor traffic offences such as speeding."
- Publication text block:
  - "List for 28 November 2025"
  - "Published 28 November 2025 at 9:05am"
- Accordion: "Important Information"
  - Text: "In accordance with the media protocol, additional documents from these cases are available to the members of the media on request. The link below takes you to the full protocol and further information in relation to what documentation can be obtained."
  - Masked link text: "Protocol on sharing court lists, registers and documents with the media" (links to GOV.UK)
- Green button: "Download a copy"
- Search bar: "Search SJP cases"
- Filter button: "Show filters"
- Filter accordions: "Postcode", "Prosecutor"
- Clear filter link
- Pagination: "Previous", page numbers, "Next"
- Table-like sectioned case layout with row titles:
  - Name
  - Date of Birth
  - Reference
  - Address
  - Prosecutor
  - Reporting Restriction (true/false)
- Back to Top link and arrow at bottom

**Welsh:**
All text uses Welsh placeholders

#### Errors

**English:**
- Invalid postcode: "Enter a valid postcode"

**Welsh:**
- "Welsh placeholder"

#### Back Navigation
- Back returns to "What do you want to view from single justice procedure?"
- Back to Top scrolls up to the page header

## Accessibility (Applies to All Pages)

- Must comply with WCAG 2.2 AA and GOV.UK Design System guidance
- Accordion behaviour must include:
  - `aria-expanded` and `aria-controls`
  - Keyboard toggling with Space/Enter
- Tab order must follow a logical reading sequence
- Pagination must expose:
  - Current page to screen readers
  - Clear link labels ("Page 2", "Next page", etc.)
- Filter controls must:
  - Be reachable by keyboard
  - Announce opening/closing of accordions
- Search input must have a visible label, not placeholder-only
- Back to Top must be operable via keyboard and announce scrolling change
- Download button must include accessible name ("Download SJP list")

## Test Scenarios

| ID | Scenario | Steps | Expected Result |
|----|----------|-------|-----------------|
| TS1 | Access SJP selection page | Navigate to SJP landing | List links visible |
| TS2 | Open Public List | Click SJP Public List | Public list page loads |
| TS3 | Open Press List (verified only) | Sign in as verified → click Press List | Press list page loads |
| TS4 | Public list header | Open list | Case count + generation timestamp displayed |
| TS5 | Press list header | Open list | Publication date + time displayed |
| TS6 | Download list | Click "Download a copy" | File downloads |
| TS7 | Pagination | Click page numbers | Moves through case pages |
| TS8 | Search | Enter query → apply | Results filtered |
| TS9 | Postcode filter | Enter valid postcode | Correct results displayed |
| TS10 | Invalid postcode | Enter invalid format | Validation message shown |
| TS11 | Prosecutor filter | Select prosecutor | Table updates |
| TS12 | Clear filters | Apply filters → click Clear | Filters reset |
| TS13 | Accordion toggle | Click accordions | Sections open/close |
| TS14 | Reporting restriction | View press list | True/false value displayed |
| TS15 | Back to Top | Scroll down → click | Scroll returns to page header |
| TS16 | Accessibility: keyboard | Use Tab/Enter/Space | All links/filters/buttons accessible |
| TS17 | Language toggle | Switch to Welsh | Page displays Welsh placeholders |

## Attachments

- [single justice procedure style guide - mock up.docx](https://tools.hmcts.net/jira/secure/attachment/823062/single+justice+procedure+style+guide+-+mock+up.docx)
