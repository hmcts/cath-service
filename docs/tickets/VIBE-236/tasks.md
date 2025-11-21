# VIBE-236: Implementation Tasks

## Content Preparation
- [ ] Obtain full accessibility statement content document
- [ ] Obtain Welsh translation of accessibility statement
- [ ] Confirm contact details (phone, email, hours)
- [ ] Confirm audit dates and preparation dates

## Page Implementation
- [ ] Create accessibility statement page controller
  - Route: `/accessibility-statement` (EN)
  - Route: `/datganiad-hygyrchedd` (CY)
- [ ] Create Nunjucks template for accessibility statement page
- [ ] Implement language toggle functionality
- [ ] Set up route handling for both EN and CY URLs
- [ ] Add page metadata (title, description)
- [ ] Add alternate language links (`<link rel="alternate" hreflang="cy">`)

## Content Structure
- [ ] Implement all 10 content sections:
  - [ ] Accessibility statement header
  - [ ] How accessible this website is
  - [ ] Feedback and contact information
  - [ ] Reporting accessibility problems
  - [ ] Enforcement procedure
  - [ ] Technical information
  - [ ] Compliance status
  - [ ] Non-accessible content
  - [ ] What we're doing to improve accessibility
  - [ ] Preparation of this accessibility statement
- [ ] Format content using GOV.UK Design System components
- [ ] Add contact details with proper formatting
  - Telephone: 0300 303 0656
  - Email: publicationsinformation@justice.gov.uk
  - Hours: Monday–Friday, 8am–5pm

## Footer Link Implementation
- [ ] Add "Accessibility statement" link to footer component
- [ ] Ensure link appears on all CaTH pages
- [ ] Configure link to open in new tab/window
  - Add `target="_blank"`
  - Add `rel="noopener noreferrer"`
- [ ] Add descriptive ARIA label
  - `aria-label="Accessibility statement (opens in a new window)"`

## Back to Top Component
- [ ] Create Back to Top component
- [ ] Add upward arrow icon (↑)
- [ ] Implement smooth scroll to top functionality
- [ ] Add component to bottom of accessibility statement page
- [ ] Add ARIA label: `aria-label="Back to top of page"`
- [ ] Ensure keyboard accessibility (Tab navigation)

## Internationalization (i18n)
- [ ] Create English locale file for accessibility statement
- [ ] Create Welsh locale file for accessibility statement
- [ ] Add translations for:
  - Page title: "Accessibility statement" / "Datganiad hygyrchedd"
  - Back to Top: "Back to Top" / "Yn ôl i frig y dudalen"
  - Footer link text
  - All content sections
- [ ] Test language toggle persistence on refresh

## Accessibility & Compliance
- [ ] Ensure all content meets WCAG 2.2 AA standards
- [ ] Test with screen readers (JAWS, NVDA, VoiceOver)
- [ ] Test keyboard navigation
  - Tab through all interactive elements
  - Test Enter key on links
- [ ] Test focus management when opening link in new window
- [ ] Run automated accessibility tests (WAVE, Axe)
- [ ] Verify proper heading hierarchy
- [ ] Check color contrast ratios
- [ ] Test with browser zoom (up to 200%)

## Styling
- [ ] Apply GOV.UK Design System styles
- [ ] Ensure responsive design for mobile/tablet/desktop
- [ ] Style Back to Top button consistently with design system
- [ ] Test layout on various screen sizes

## Testing
- [ ] Unit tests for page controller
- [ ] Integration tests for routing
  - TS1: Footer link visible on all pages
  - TS2: Link opens in new tab/window
  - TS3: Page loads with full content
  - TS4: Language toggle switches between EN and CY
  - TS5: Back to Top scrolls to top
  - TS6: Keyboard navigation works
  - TS7: Accessibility compliance passes
  - TS8: Mobile responsiveness
  - TS9: SEO/metadata correct
- [ ] E2E tests for complete user journey
- [ ] Cross-browser testing (Chrome, Firefox, Safari, Edge)
- [ ] Screen reader testing

## Documentation
- [ ] Document page routes and controllers
- [ ] Document content update process
- [ ] Add deployment notes
- [ ] Document testing approach

## Open Questions to Resolve
- [ ] Confirm if accessibility statement should be within CaTH domain or external HMCTS URL
- [ ] Confirm maintenance owner for content updates
- [ ] Confirm if audit dates should be dynamically updated
- [ ] Confirm format and structure of full accessibility statement content
