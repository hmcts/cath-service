# VIBE-236: Accessibility Statement Implementation - Technical Specification

## Overview
Implement a GOV.UK-compliant Accessibility Statement page that meets WCAG 2.2 AA standards and Public Sector Bodies regulations for the Court and Tribunal Hearings (CaTH) service.

## User Story
**As a** System
**I want to** display a link to the Accessibility Statement on every page in CaTH
**So that** users can access the Accessibility Statement at any time

## Technical Requirements

### 1. Footer Link Implementation
- Add "Accessibility statement" link to footer component on all pages
- Link opens `/accessibility-statement` in new tab with `target="_blank" rel="noopener noreferrer"`
- ARIA label: `aria-label="Accessibility statement (opens in a new window)"`
- Bilingual support: "Accessibility statement" (EN) / "Datganiad hygyrchedd" (CY)

### 2. Accessibility Statement Page
- **Route**: `/accessibility-statement` (EN) and `/datganiad-hygyrchedd` (CY)
- Full page with accessibility statement content from attached document
- Implements GOV.UK Design System components
- Language toggle functionality
- "Back to Top" scroll functionality with keyboard accessibility

### 3. Page Content Sections
All sections from the Accessibility Statement document:

1. **Header** - Service description and applicability
2. **How accessible this website is** - Accessibility features
3. **Feedback and contact information** - Contact details, text relay, BSL interpreter
4. **Reporting accessibility problems** - Guidance for reporting issues
5. **Enforcement procedure** - EHRC details
6. **Technical information** - Compliance commitment
7. **Compliance status** - WCAG 2.2 compliance statement
8. **Non-accessible content** - Known issues (PDFs, page titles)
9. **What we're doing to improve accessibility** - Ongoing improvements
10. **Preparation of this accessibility statement** - Audit dates and review history

### 4. Contact Information
- **Telephone**: 0300 303 0656
- **Email**: publicationsinformation@justice.gov.uk
- **Hours**: Monday–Friday, 8am–5pm

### 5. Compliance Dates
- **Prepared**: 8 September 2023
- **Reviewed**: 6 March 2025
- **Last audited**: 18 November 2024

## Architecture

### Module Structure
```
libs/accessibility-statement/
├── src/
│   ├── pages/
│   │   └── accessibility-statement.ts   # Controller
│   │   └── accessibility-statement.njk  # Nunjucks template
│   ├── locales/
│   │   ├── en.ts                        # English content
│   │   └── cy.ts                        # Welsh content
│   └── config.ts                        # Module exports
├── package.json
└── tsconfig.json
```

### Database Schema
Not required - static content page

### API Endpoints
- `GET /accessibility-statement` - Display accessibility statement page (EN)
- `GET /datganiad-hygyrchedd` - Display accessibility statement page (CY)

## Implementation Tasks

### Task 1: Create Accessibility Statement Module
- Set up libs/accessibility-statement package structure
- Configure package.json with build scripts
- Add TypeScript configuration

### Task 2: Create Accessibility Statement Page Controller
- GET handler: Render page with current language
- Handle both EN and CY routes
- Simple static content rendering

### Task 3: Create Nunjucks Template
- Implement GOV.UK Design System layout
- Full accessibility statement content
- Back to Top link with smooth scroll
- Proper heading hierarchy (h1, h2, h3)
- Contact information formatting
- Lists and paragraphs

### Task 4: Add Content Translations
- English content in en.ts (extract from document)
- Welsh content in cy.ts (extract from document)
- All 10 sections with proper structure
- Contact details
- Compliance dates

### Task 5: Update Footer Component
- Add "Accessibility statement" link to existing footer
- New tab behavior with security attributes
- ARIA label for accessibility
- Bilingual link text

### Task 6: Register Module in Web App
- Import module config in apps/web/src/app.ts
- Register page route with createSimpleRouter
- Add assets path to Vite config (if needed)
- Update root tsconfig.json paths

### Task 7: Testing
- Unit tests for controller routing
- E2E tests with Playwright:
  - Footer link opens new tab
  - Content loads correctly
  - Welsh translation works
  - Back to Top functionality
  - Keyboard navigation
  - Accessibility with axe-core (WCAG 2.2 AA)
  - Screen reader compatibility
  - Mobile responsiveness

## Accessibility Requirements (WCAG 2.2 AA)

### Keyboard Navigation
- All links focusable via Tab
- Back to Top keyboard accessible (Enter key)
- Visible focus indicators on all interactive elements
- Skip to main content link

### Screen Reader Support
- Proper ARIA labels on links
- Descriptive link text
- Proper heading structure
- Landmark regions (<main>, <nav>, <footer>)

### Visual Requirements
- Sufficient color contrast (minimum 4.5:1 for text)
- Text resizable to 200% without loss of functionality
- No content relying solely on color
- Responsive design for all viewport sizes

### Content Requirements
- Plain language
- Descriptive page title
- Descriptive headings
- Alternative text for any images (if used)
- Consistent navigation

## Content Structure

### English Version (en.ts)
```typescript
export const accessibilityStatement = {
  pageTitle: "Accessibility statement",
  sections: [
    {
      heading: "Accessibility statement for Court and Tribunal Hearings",
      content: "...",
    },
    {
      heading: "How accessible this website is",
      content: "...",
      list: [...]
    },
    // ... all 10 sections
  ],
  contact: {
    telephone: "0300 303 0656",
    email: "publicationsinformation@justice.gov.uk",
    hours: "Monday to Friday 8am to 5pm"
  },
  backToTop: "Back to Top"
};
```

### Welsh Version (cy.ts)
Mirror structure with Welsh translations

## Test Scenarios

| ID | Scenario | Expected Result |
|----|----------|----------------|
| TS1 | Footer link visible | "Accessibility statement" link in footer on all pages |
| TS2 | Click footer link | Opens in new tab/window |
| TS3 | Visit /accessibility-statement | Full content loads correctly |
| TS4 | Switch to Welsh | Welsh translation displayed |
| TS5 | Click Back to Top | Smooth scroll to page top |
| TS6 | Keyboard navigation | All elements accessible via keyboard |
| TS7 | Axe accessibility test | WCAG 2.2 AA compliance |
| TS8 | Mobile view | Responsive layout, Back to Top visible |
| TS9 | Screen reader test | Content read correctly by JAWS/NVDA |
| TS10 | Page metadata | Correct title and meta description |

## Risks & Questions
1. Should the page be hosted within CaTH domain or link to external HMCTS-hosted URL?
2. Who owns maintenance of accessibility content updates (CTSC or platform team)?
3. Should audit dates and compliance sections be dynamically updated?
4. Is Welsh translation formally approved by HMCTS Welsh Translation Unit?

## Dependencies
- GOV.UK Design System components
- Existing footer component in web app
- i18n middleware for language switching

## Definition of Done
- [ ] Accessibility statement page accessible at /accessibility-statement
- [ ] Footer link on all pages opens statement in new tab
- [ ] Full content from attached document implemented
- [ ] Welsh translation complete and accurate
- [ ] Back to Top functionality works
- [ ] Keyboard navigation fully functional
- [ ] ARIA labels on all interactive elements
- [ ] All accessibility tests pass (WCAG 2.2 AA)
- [ ] Axe-core automated tests pass
- [ ] Screen reader tested (JAWS, NVDA, VoiceOver)
- [ ] Mobile responsive
- [ ] E2E tests cover all scenarios
- [ ] Code review approved
