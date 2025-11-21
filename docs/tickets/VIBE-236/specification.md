# VIBE-236: CaTH General Information - Accessibility Statement

## Overview
Implement an accessibility statement page with a footer link on all CaTH pages, providing users access to accessibility information in both English and Welsh.

## Problem Statement
Every page in CaTH includes a footer section that displays links to general information. This ticket defines the requirements for implementing a link to the Accessibility Statement to comply with GOV.UK and HMCTS accessibility regulations and ensure users can easily find accessibility-related information.

## User Story
**As a** System
**I want to** display a link to the Accessibility Statement on every page in CaTH
**So that** users can access the Accessibility Statement at any time

## Acceptance Criteria

### 1. Footer Link Placement
- A link labelled "Accessibility statement" is displayed at the bottom (footer) of every CaTH page
- The text must be masked in the phrase "Accessibility statement"
- The link must open the Accessibility Statement in a new browser window or tab

### 2. Accessibility Statement Page
- Clicking the link opens the Accessibility Statement page
- The page content includes all required sections (see Content Overview below)
- The page must provide a language toggle (English/Welsh)
- The Welsh version displays the translated Accessibility Statement text

### 3. Back to Top
- At the bottom of the Accessibility Statement page, display:
  - An upward arrow icon
  - The text "Back to Top"
  - Clicking either returns the user to the top of the page

### 4. Design and Accessibility
- The link and page follow GOV.UK and CaTH design system standards
- Page text must be fully readable with assistive technologies
- The link must have descriptive `aria-label` attributes, e.g., `aria-label="Accessibility statement (opens in a new window)"`
- All content and structure meet WCAG 2.2 AA compliance

### 5. Welsh Translation
- **EN:** Accessibility statement → **CY:** Datganiad hygyrchedd
- **EN:** Back to Top → **CY:** Yn ôl i frig y dudalen

## Page Location & Technical Details

| Element | Description |
|---------|-------------|
| Footer link text | "Accessibility statement" |
| Footer placement | Bottom section of all CaTH pages (alongside Privacy, Cookies, Contact, etc.) |
| URL (EN) | `/accessibility-statement` |
| URL (CY) | `/datganiad-hygyrchedd` |
| Page title (EN) | "Accessibility statement" |
| Page title (CY) | "Datganiad hygyrchedd" |
| Open behaviour | Opens in new browser tab/window |
| Language toggle | Switch between English and Welsh text versions |

## Accessibility Statement Page - Content Overview

The content must include all sections as detailed in the Accessibility Statement document:

### English Version Sections

1. **Accessibility statement header**
   - "This accessibility statement applies to content published on court-tribunal-hearings.service.gov.uk."
   - Overview of the CaTH service, its purpose, and accessibility principles

2. **How accessible this website is**
   - Lists accessible features (zoom, contrast, screen reader support)
   - Describes inaccessible content (flat file PDFs, untitled pages)

3. **Feedback and contact information**
   - Text relay and BSL interpreter availability
   - Contact details:
     - **Telephone:** 0300 303 0656
     - **Email:** publicationsinformation@justice.gov.uk
     - **Hours:** Monday–Friday, 8am–5pm

4. **Reporting accessibility problems**
   - Guidance on contacting HMCTS if accessibility issues are found

5. **Enforcement procedure**
   - Details of the Equality and Human Rights Commission's enforcement role

6. **Technical information**
   - Compliance commitment with Public Sector Bodies (Websites and Mobile Applications) Regulations 2018

7. **Compliance status**
   - States partial compliance with WCAG 2.2

8. **Non-accessible content**
   - Lists current non-compliances (PDFs, missing page titles)

9. **What we're doing to improve accessibility**
   - Ongoing improvements and testing details

10. **Preparation of this accessibility statement**
    - Prepared: 8 September 2023
    - Reviewed: 6 March 2025
    - Last audited: 18 November 2024

### Welsh Version
The Welsh translation mirrors the English structure and content, titled "Datganiad hygyrchedd".
All references (contact details, phone, email, audit dates) remain the same.

## Back to Top Element

| Element | Description |
|---------|-------------|
| Position | Bottom of Accessibility Statement page |
| Appearance | Upward arrow icon (↑) followed by "Back to Top" text |
| Action | Scrolls smoothly to top of the page |
| ARIA label | `aria-label="Back to top of page"` |
| Text (EN) | "Back to Top" |
| Text (CY) | "Yn ôl i frig y dudalen" |

## Validation Rules

- **Footer link** appears on all CaTH pages
- **Link accessibility:**
  - Must open `/accessibility-statement` in a new window (`target="_blank"`)
  - Must have `rel="noopener noreferrer"`
- **Language toggle:**
  - English and Welsh pages linked by `<link rel="alternate" hreflang="cy">` metadata
  - Toggle persists on refresh
- **ARIA and keyboard navigation:**
  - Footer link and Back to Top must be reachable via keyboard (Tab navigation)
- **Compliance check:**
  - Page passes WAVE or Axe automated accessibility testing

## Test Scenarios

| ID | Scenario | Steps | Expected Result |
|----|----------|-------|-----------------|
| TS1 | Footer link visible | Scroll to bottom of any CaTH page | "Accessibility statement" link displayed |
| TS2 | Link click | Click "Accessibility statement" | Opens new tab/window with accessibility statement |
| TS3 | Page load | Open `/accessibility-statement` | Full statement content displays correctly |
| TS4 | Language toggle | Switch to Welsh | Displays Welsh translation |
| TS5 | Back to Top | Scroll down → click Back to Top | Smooth scroll returns to top of page |
| TS6 | Link behaviour | Open footer link with keyboard (Enter key) | Opens in new tab, focus moves to new page |
| TS7 | Accessibility compliance | Run automated test | Page meets WCAG 2.2 AA standards |
| TS8 | Mobile responsiveness | View page on mobile | Layout responsive and Back to Top visible |
| TS9 | SEO/meta | Inspect metadata | `<title>` and `<meta description>` correctly set |

## Accessibility & Compliance

Page must comply with:
- **WCAG 2.2 AA**
- **Public Sector Bodies (Websites and Mobile Applications) Regulations 2018**
- **HMCTS Design System accessibility principles**

Accessibility link and Back to Top must:
- Be focusable via keyboard
- Provide descriptive labels
- Work with screen readers (JAWS, NVDA, VoiceOver)

Welsh translation must maintain semantic structure and content parity.

## Risks / Clarifications

- Confirm whether Accessibility Statement should load within CaTH domain or open HMCTS-hosted external URL
- Confirm maintenance owner for the accessibility content updates (e.g., CTSC team or platform team)
- Confirm if audit dates and compliance sections should be dynamically updated on future releases
- Obtain full accessibility statement content document for implementation
