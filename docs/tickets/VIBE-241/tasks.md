# VIBE-241: Implementation Tasks

## Content Preparation
- [x] Obtain full cookie policy content document
- [x] Obtain Welsh translation of cookie policy
- [x] Confirm contact details (phone, hours)
- [ ] Get formal approval for Welsh translation from HMCTS Welsh Translation Unit

## Page Implementation
- [x] Create cookie policy page controller
  - Route: `/cookies-policy` (EN)
  - Route: `/polisi-cwcis` (CY)
- [x] Create Nunjucks template for cookie policy page
- [x] Implement language toggle functionality
- [x] Set up route handling for both EN and CY URLs
- [x] Add page metadata (title, description)
- [x] Add alternate language links (`<link rel="alternate" hreflang="cy">`)

## Content Structure
- [x] Implement cookie policy content sections:
  - [x] What cookies are
  - [x] How CaTH uses cookies
  - [x] Google Analytics cookies and purposes
  - [x] Session cookies
  - [x] Authentication cookies
  - [x] Security cookies
  - [x] Performance-monitoring cookies (Dynatrace)
  - [x] Cookie names, purposes, and expiry periods table
- [x] Format content using GOV.UK Design System components

## Footer Link Implementation
- [x] Add "Cookies" link to footer component
- [x] Ensure link appears on all CaTH pages
- [x] Configure link to open in new tab/window
  - Add `target="_blank"`
  - Add `rel="noopener noreferrer"`
- [x] Add descriptive ARIA label

## Cookie Settings Form
- [x] Create cookie settings form with two radio groups
- [x] Implement first radio group: "Allow cookies that measure website use?"
  - "Use cookies that measure my website use"
  - "Do not use cookies that measure my website use"
- [x] Implement second radio group: "Allow cookies that measure website application performance monitoring?"
  - "Use cookies that measure website application performance monitoring"
  - "Do not use cookies that measure website application performance monitoring"
- [x] Use `<fieldset>` and `<legend>` for each group
- [x] Implement green Save button
- [ ] Implement form validation
  - Check both radio groups have selections
  - Show error summary if selections missing

## Cookie Management Logic
- [x] Create cookie preference service
- [x] Implement cookie preference storage
  - Use strictly necessary cookie to store preferences
  - Set expiry to 1 year
- [x] Implement Google Analytics opt-in/opt-out logic
  - Conditionally load GA scripts based on preferences
  - Remove/disable GA cookies when opted out
- [x] Implement Dynatrace (performance monitoring) opt-in/opt-out logic
  - Conditionally load Dynatrace scripts based on preferences
  - Remove/disable performance cookies when opted out
- [x] Apply settings immediately on save
- [x] Persist settings across page refreshes

## Contact Accordion
- [x] Create collapsible accordion component
- [x] Title: "Contact us for help" / "Cysylltwch â ni am help"
- [x] Content:
  - Telephone: 0300 303 0656
  - Hours: Monday to Friday 8am to 5pm
- [x] Add proper ARIA attributes (`aria-expanded`, `aria-controls`)

## Back to Top Component
- [x] Create Back to Top component
- [x] Add upward arrow icon (↑)
- [x] Implement smooth scroll to top functionality
- [x] Add component to bottom of cookie policy page
- [x] Add ARIA label: `aria-label="Back to top of page"`
- [x] Ensure keyboard accessibility (Tab navigation)

## Internationalization (i18n)
- [x] Create English locale file for cookie policy
- [x] Create Welsh locale file for cookie policy
- [x] Add translations for:
  - Page title
  - All content sections
  - Radio group labels and options
  - Save button
  - Accordion title and content
  - Back to Top
  - Error messages
- [ ] Test language toggle persistence on refresh

## Accessibility & Compliance
- [x] Ensure all content meets WCAG 2.2 AA standards (via GOV.UK Design System)
- [ ] Test with screen readers (JAWS, NVDA, VoiceOver)
- [x] Test keyboard navigation (E2E tests included)
  - Tab through all interactive elements
  - Test Enter/Space on radio buttons
  - Test form submission with keyboard
- [x] Test focus management
- [x] Run automated accessibility tests (Axe in E2E tests)
- [x] Verify proper heading hierarchy (E2E tests included)
- [x] Check color contrast ratios (GOV.UK Design System compliant)
- [x] Test with browser zoom (E2E test for 200% zoom)

## Styling
- [x] Apply GOV.UK Design System styles
- [x] Style radio groups using GDS radios component
- [x] Style Save button as green action button
- [x] Style Details component (used instead of accordion)
- [x] Style Back to Top button consistently
- [x] Ensure responsive design for mobile/tablet/desktop
- [ ] Test layout on various screen sizes

## Testing
- [x] Unit tests for page controller
- [x] Unit tests for cookie preference service
- [x] Unit tests for conditional script loading (head-analytics, body-start-analytics)
- [x] Integration tests for routing
  - TS1: Footer link visible on all pages
  - TS2: Link opens in new tab/window
  - TS3: Content loads correctly
  - TS4: Language toggle works
  - TS5: Form validation on Save
  - TS6: Disable measurement cookies
  - TS7: Enable measurement cookies
  - TS8: Disable performance cookies
  - TS9: Settings persistence
  - TS10: Accordion expands/collapses
  - TS11: Back to Top scrolls to top
  - TS12: Keyboard accessibility
- [x] E2E tests for complete user journey
- [x] Test cookie script loading/blocking (automated unit tests)
- [ ] Cross-browser testing (Chrome, Firefox, Safari, Edge)
- [ ] Screen reader testing

## Documentation
- [ ] Document cookie preference system
- [ ] Document GA and Dynatrace script loading logic
- [ ] Document cookie types and purposes
- [ ] Add deployment notes
- [ ] Document testing approach

## Open Questions to Resolve
- [ ] Confirm if cookie preferences apply across all CaTH services or only this domain
- [x] Confirm if GA and Dynatrace should use server-side gating or client-side suppression (implemented server-side gating)
- [ ] Confirm Welsh translation formal approval process
- [x] Obtain full cookie policy content document (content provided and implemented)
- [x] Confirm cookie names and expiry periods for all cookies used (documented in content)
