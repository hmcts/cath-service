# VIBE-241: CaTH General Information - Cookie Policy

## Metadata
- **Status**: Ready for Progress
- **Priority**: 3-Medium
- **Issue Type**: Story
- **Created**: 2025-11-19T10:06:57.220+0000
- **Updated**: 2025-11-22T21:30:38.571+0000
- **Assignee**: Unassigned

## Problem Statement

Every page in CaTH has a section displays links to various general information at the bottom of the page. This ticket captures the Cookie Policy requirements.

## User Story

**AS A** System

**I WANT** to display a link to the Cookie Policy in CaTH

**SO THAT** CaTH Users are able to access the Cookies Policy

## Acceptance Criteria

### Footer Link
- A footer link labelled "Cookies" is displayed on every CaTH page
- The text "Cookies" is a masked link pointing to the Cookie Policy page
- Clicking the link must open the Cookie Policy page in a new browser window/tab

### Cookie Policy Page
- The Cookie Policy page displays the full cookie policy content exactly as provided in the uploaded document
- The page provides a Welsh translation option, switching the full text to the Welsh content
- At the bottom of the Cookie Policy page, there is:
  - An upward arrow icon
  - The text "Back to Top"
  Both scroll the page back to the top

### Cookie Settings Controls
- At the end of the Cookie Policy page, a dedicated section titled "Change your cookie settings" is displayed
- The section contains two sub-headings, each with two radio-button options:

#### A. Allow cookies that measure website use?
- Use cookies that measure my website use
- Do not use cookies that measure my website use

#### B. Allow cookies that measure website application performance monitoring?
- Use cookies that measure website application performance monitoring
- Do not use cookies that measure website application performance monitoring

- Below the options, a green 'Save' button is displayed
- Saving settings must:
  - Disable measurement cookies when "Do not use…" is selected
  - Enable measurement cookies when "Use cookies…" is selected
  - Apply settings immediately for the current user/browser
  - Persist the selection using a user-specific cookie (non-measurement)

- After the Save button, a collapsible accordion titled "Contact us for help" is displayed
- When expanded, it shows:
  - Telephone: 0300 303 0656
  - Hours: Monday to Friday 8am to 5pm

### Behaviour Requirements
- Measurement cookies must not be set or loaded if the user opts out
- Performance-monitoring cookies must not be set if the user opts out
- Both choices must operate independently (user may opt in to one and out of the other)
- All CaTH design, accessibility, and page-specification standards must be maintained

## URL Structure
| Element | URL |
|---------|-----|
| Cookie Policy page (EN) | `/cookies-policy` |
| Cookie Policy page (CY) | `/polisi-cwcis` |
| Link on footer | Opens `/cookies-policy` in a new window |

## Welsh Translations

- Cookie Policy - Polisi Cwcis
- Back to Top - Yn ôl i frig y dudalen
- Change your cookie settings - Newid eich gosodiadau cwcis
- Allow cookies that measure website use - Caniatáu cwcis sy'n mesur defnydd o'r wefan?
- Use cookies that measure my website use - Defnyddio cwcis sy'n mesur fy nefnydd o'r wefan
- Do not use cookies that measure my website use - Peidio â defnyddio cwcis sy'n mesur fy nefnydd o'r wefan
- Allow cookies that measure website application performance monitoring - Caniatáu cwcis sy'n mesur y broses o fonitro perfformiad gwefannau?
- Use cookies that measure website application performance monitoring - Defnyddio cwcis sy'n mesur y broses o fonitro perfformiad gwefannau
- Do not cookies that measure website application performance monitoring - Peidio â defnyddio cwcis sy'n mesur y broses o fonitro perfformiad gwefannau
- Save - Cadw
- Contact us for help - Cysylltwch â ni am help
- Telephone - Ffon
- Monday to Friday 8am to 5pm - Dydd Llun i ddydd Gwener 8am i 5pm

## Functional Requirements

### Cookie Settings Logic
| Setting | Result |
|---------|--------|
| "Use cookies that measure my website use" | Enable Google Analytics cookies |
| "Do not use…" | Disable and prevent measuring cookies |
| "Use cookies that measure performance monitoring" | Enable Dynatrace cookies |
| "Do not use…" | Disable and prevent performance monitoring cookies |

- Choices must be persisted in a strictly necessary cookie
- Saved settings must immediately take effect:
  - If user opts OUT → remove/disable GA or Dynatrace scripts
  - If user opts IN → allow scripts to load normally

## Validation Rules
- User must select a radio for each cookie-category group
- If Save is clicked with missing selections → show error summary: "Select cookie settings for each option."
- Cookie preferences persist for up to 1 year unless cleared

## Accessibility Requirements
- All text must comply with WCAG 2.2 AA
- Radio groups must use `<fieldset>` and `<legend>`
- Accordion must use `aria-expanded`, `aria-controls`
- Back to Top must be keyboard accessible with visible focus
- Language toggle must switch content but keep scroll position where possible

## Test Scenarios
| ID | Scenario | Steps | Expected Result |
|----|----------|-------|----------------|
| TS1 | Footer link visible | Open any CaTH page | "Cookies" link shown in footer |
| TS2 | Footer link opens new window | Click Cookies | Cookie Policy page opens in new tab |
| TS3 | Content loads | Visit `/cookies-policy` | Full content from uploaded policy displayed |
| TS4 | Welsh toggle | Switch language | Welsh policy displayed |
| TS5 | Cookie settings validation | Click Save without selecting | Error summary displayed |
| TS6 | Disable measurement cookies | Select "Do not use…" | GA cookies not loaded |
| TS7 | Enable measurement cookies | Select "Use…" | GA cookies load |
| TS8 | Disable performance cookies | Select "Do not use…" | Dynatrace cookies not loaded |
| TS9 | Save settings persistence | Refresh browser | Saved settings retained |
| TS10 | Accordion expands | Click "Contact us for help" | Contact details displayed |
| TS11 | Back to Top | Scroll down → click Back to Top | Returns to top |
| TS12 | Accessibility | Keyboard navigation | All controls accessible and screen-reader friendly |

## Risks / Clarifications
- Confirm whether the cookie preferences should apply across all CaTH services or only within the Court and Tribunal Hearings service domain
- Confirm GA and Dynatrace scripts are conditionally loaded using server-side gating versus client-side script suppression
- Confirm Welsh cookie policy text will be formally approved by HMCTS Welsh Translation Unit
