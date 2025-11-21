# VIBE-241: Implementation Tasks

## Content Preparation
- [ ] Obtain full cookie policy content document
- [ ] Obtain Welsh translation of cookie policy
- [ ] Confirm contact details (phone, hours)
- [ ] Get formal approval for Welsh translation from HMCTS Welsh Translation Unit

## Page Implementation
- [ ] Create cookie policy page controller
  - Route: `/cookies-policy` (EN)
  - Route: `/polisi-cwcis` (CY)
- [ ] Create Nunjucks template for cookie policy page
- [ ] Implement language toggle functionality
- [ ] Set up route handling for both EN and CY URLs
- [ ] Add page metadata (title, description)
- [ ] Add alternate language links (`<link rel="alternate" hreflang="cy">`)

## Content Structure
- [ ] Implement cookie policy content sections:
  - [ ] What cookies are
  - [ ] How CaTH uses cookies
  - [ ] Google Analytics cookies and purposes
  - [ ] Session cookies
  - [ ] Authentication cookies
  - [ ] Security cookies
  - [ ] Performance-monitoring cookies (Dynatrace)
  - [ ] Cookie names, purposes, and expiry periods table
- [ ] Format content using GOV.UK Design System components

## Footer Link Implementation
- [ ] Add "Cookies" link to footer component
- [ ] Ensure link appears on all CaTH pages
- [ ] Configure link to open in new tab/window
  - Add `target="_blank"`
  - Add `rel="noopener noreferrer"`
- [ ] Add descriptive ARIA label

## Cookie Settings Form
- [ ] Create cookie settings form with two radio groups
- [ ] Implement first radio group: "Allow cookies that measure website use?"
  - "Use cookies that measure my website use"
  - "Do not use cookies that measure my website use"
- [ ] Implement second radio group: "Allow cookies that measure website application performance monitoring?"
  - "Use cookies that measure website application performance monitoring"
  - "Do not use cookies that measure website application performance monitoring"
- [ ] Use `<fieldset>` and `<legend>` for each group
- [ ] Implement green Save button
- [ ] Implement form validation
  - Check both radio groups have selections
  - Show error summary if selections missing

## Cookie Management Logic
- [ ] Create cookie preference service
- [ ] Implement cookie preference storage
  - Use strictly necessary cookie to store preferences
  - Set expiry to 1 year
- [ ] Implement Google Analytics opt-in/opt-out logic
  - Conditionally load GA scripts based on preferences
  - Remove/disable GA cookies when opted out
- [ ] Implement Dynatrace (performance monitoring) opt-in/opt-out logic
  - Conditionally load Dynatrace scripts based on preferences
  - Remove/disable performance cookies when opted out
- [ ] Apply settings immediately on save
- [ ] Persist settings across page refreshes

## Contact Accordion
- [ ] Create collapsible accordion component
- [ ] Title: "Contact us for help" / "Cysylltwch â ni am help"
- [ ] Content:
  - Telephone: 0300 303 0656
  - Hours: Monday to Friday 8am to 5pm
- [ ] Add proper ARIA attributes (`aria-expanded`, `aria-controls`)

## Back to Top Component
- [ ] Create Back to Top component
- [ ] Add upward arrow icon (↑)
- [ ] Implement smooth scroll to top functionality
- [ ] Add component to bottom of cookie policy page
- [ ] Add ARIA label: `aria-label="Back to top of page"`
- [ ] Ensure keyboard accessibility (Tab navigation)

## Internationalization (i18n)
- [ ] Create English locale file for cookie policy
- [ ] Create Welsh locale file for cookie policy
- [ ] Add translations for:
  - Page title
  - All content sections
  - Radio group labels and options
  - Save button
  - Accordion title and content
  - Back to Top
  - Error messages
- [ ] Test language toggle persistence on refresh

## Accessibility & Compliance
- [ ] Ensure all content meets WCAG 2.2 AA standards
- [ ] Test with screen readers (JAWS, NVDA, VoiceOver)
- [ ] Test keyboard navigation
  - Tab through all interactive elements
  - Test Enter/Space on radio buttons
  - Test form submission with keyboard
- [ ] Test focus management
- [ ] Run automated accessibility tests (WAVE, Axe)
- [ ] Verify proper heading hierarchy
- [ ] Check color contrast ratios
- [ ] Test with browser zoom (up to 200%)

## Styling
- [ ] Apply GOV.UK Design System styles
- [ ] Style radio groups using GDS radios component
- [ ] Style Save button as green action button
- [ ] Style accordion using GDS accordion component
- [ ] Style Back to Top button consistently
- [ ] Ensure responsive design for mobile/tablet/desktop
- [ ] Test layout on various screen sizes

## Testing
- [ ] Unit tests for page controller
- [ ] Unit tests for cookie preference service
- [ ] Integration tests for routing
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
- [ ] E2E tests for complete user journey
- [ ] Test cookie script loading/blocking
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
- [ ] Confirm if GA and Dynatrace should use server-side gating or client-side suppression
- [ ] Confirm Welsh translation formal approval process
- [ ] Obtain full cookie policy content document
- [ ] Confirm cookie names and expiry periods for all cookies used
