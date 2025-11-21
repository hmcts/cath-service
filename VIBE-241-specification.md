# VIBE-241: Cookie Policy Implementation - Technical Specification

## Overview
Implement a GOV.UK-compliant Cookie Policy page with user-configurable cookie consent management for the Court and Tribunal Hearings (CaTH) service.

## User Story
**As a** System
**I want to** display a link to the Cookie Policy on every page in CaTH
**So that** users can access the Cookie Policy and manage their cookie preferences

## Technical Requirements

### 1. Footer Link Implementation
- Add "Cookies" link to footer component on all pages
- Link opens `/cookies-policy` in new tab with `target="_blank" rel="noopener noreferrer"`
- Bilingual support: "Cookies" (EN) / "Cwcis" (CY)

### 2. Cookie Policy Page
- **Route**: `/cookies-policy` (EN) and `/polisi-cwcis` (CY)
- Full page with cookie policy content from attached document
- Implements GOV.UK Design System components
- Language toggle functionality
- "Back to Top" scroll functionality

### 3. Cookie Settings Management
Two independent cookie categories with radio button controls:

**Category A: Website Usage Measurement**
- Google Analytics cookies
- Options: Enable / Disable

**Category B: Performance Monitoring**
- Dynatrace cookies
- Options: Enable / Disable

### 4. Cookie Preferences Storage
- Store preferences in strictly necessary cookie (name: `cookie_preferences`)
- Cookie expiry: 1 year
- JSON structure: `{"analytics": boolean, "performance": boolean}`
- Persist across sessions

### 5. Cookie Script Loading Logic
- Server-side or client-side conditional loading based on preferences
- Default state: Opt-in required (no tracking until user consents)
- Scripts affected:
  - Google Analytics (GA4)
  - Dynatrace monitoring

## Architecture

### Module Structure
```
libs/cookie-policy/
├── src/
│   ├── pages/
│   │   └── cookie-policy.ts        # Controller
│   │   └── cookie-policy.njk       # Nunjucks template
│   ├── middleware/
│   │   └── cookie-consent-middleware.ts  # Consent checking
│   ├── services/
│   │   └── cookie-service.ts       # Cookie management logic
│   ├── locales/
│   │   ├── en.ts                   # English translations
│   │   └── cy.ts                   # Welsh translations
│   └── config.ts                   # Module exports
├── package.json
└── tsconfig.json
```

### Database Schema
Not required - cookie preferences stored client-side only

### API Endpoints
- `GET /cookies-policy` - Display cookie policy page
- `POST /cookies-policy` - Save cookie preferences

## Implementation Tasks

### Task 1: Create Cookie Policy Module
- Set up libs/cookie-policy package structure
- Configure package.json with build scripts
- Add TypeScript configuration

### Task 2: Implement Cookie Service
- Create cookie-service.ts with methods:
  - `getCookiePreferences(req)` - Read preferences from cookie
  - `setCookiePreferences(res, preferences)` - Save preferences
  - `getDefaultPreferences()` - Return opt-out defaults

### Task 3: Create Cookie Consent Middleware
- Middleware to check cookie preferences on each request
- Attach preferences to `res.locals` for template access
- Block GA/Dynatrace scripts if consent not given

### Task 4: Build Cookie Policy Page Controller
- GET handler: Render page with current preferences
- POST handler: Validate and save preferences, show confirmation
- Form validation for radio button selections
- Error handling with GOV.UK error summary

### Task 5: Create Nunjucks Template
- Implement GOV.UK Design System components:
  - govukRadios for preference controls
  - govukButton for Save action
  - govukDetails for "Contact us for help" accordion
  - govukErrorSummary for validation errors
- Back to Top link with smooth scroll
- Full cookie policy content from document

### Task 6: Add Translations
- English content in en.ts
- Welsh content in cy.ts
- All labels, headings, body text, error messages

### Task 7: Update Footer Component
- Add "Cookies" link to existing footer
- New tab behavior with security attributes
- Bilingual link text

### Task 8: Conditional Script Loading
- Modify layout template to check cookie preferences
- Only load GA script if `analytics` consent = true
- Only load Dynatrace if `performance` consent = true
- Update CSP headers if needed

### Task 9: Register Module in Web App
- Import module config in apps/web/src/app.ts
- Register page route with createSimpleRouter
- Add assets path to Vite config
- Update root tsconfig.json paths

### Task 10: Testing
- Unit tests for cookie-service.ts
- Integration tests for POST /cookies-policy
- E2E tests with Playwright:
  - Footer link opens new tab
  - Save preferences flow
  - Script loading with/without consent
  - Welsh translation
  - Accessibility with axe-core
  - Keyboard navigation

## Validation Rules
- Both radio groups must have a selection before Save
- Error message: "Select your cookie preferences for each category"
- Show GOV.UK error summary at top of page

## Accessibility Requirements (WCAG 2.2 AA)
- Radio groups use `<fieldset>` and `<legend>`
- Accordion uses `aria-expanded`, `aria-controls`
- Back to Top keyboard accessible with visible focus
- Language toggle maintains scroll position
- All interactive elements have focus indicators
- Screen reader announcements for saved preferences

## Content Requirements
Content from Cookie Policy.docx attachment including:
- What cookies are
- How CaTH uses cookies
- Cookie tables (name, purpose, expiry)
- Google Analytics cookies
- Session cookies
- Authentication cookies
- Security cookies
- Performance monitoring cookies

## Test Scenarios

| ID | Scenario | Expected Result |
|----|----------|----------------|
| TS1 | Footer link visible on all pages | "Cookies" link in footer |
| TS2 | Click footer link | Opens in new tab |
| TS3 | Visit /cookies-policy | Full content loads |
| TS4 | Switch to Welsh | Welsh content displayed |
| TS5 | Save without selections | Error summary shown |
| TS6 | Opt out of analytics | GA scripts not loaded |
| TS7 | Opt in to analytics | GA scripts loaded |
| TS8 | Opt out of performance | Dynatrace not loaded |
| TS9 | Refresh browser | Preferences persist |
| TS10 | Expand accordion | Contact details shown |
| TS11 | Click Back to Top | Scrolls to top |
| TS12 | Keyboard navigation | All controls accessible |

## Risks & Questions
1. Should preferences apply across all HMCTS services or just CaTH?
2. Server-side vs client-side script gating approach?
3. Welsh translation approval process with HMCTS Welsh Translation Unit
4. Default state: Opt-in or opt-out for analytics/performance cookies?
5. GDPR compliance review needed?

## Dependencies
- GOV.UK Design System components
- Existing footer component in web app
- Current analytics/monitoring setup (GA, Dynatrace)

## Definition of Done
- [ ] Cookie policy page accessible at /cookies-policy
- [ ] Footer link on all pages opens policy in new tab
- [ ] User can save cookie preferences
- [ ] Preferences persist for 1 year
- [ ] GA/Dynatrace respect user choices
- [ ] Full Welsh translation
- [ ] All accessibility tests pass (WCAG 2.2 AA)
- [ ] E2E tests cover all scenarios
- [ ] Code review approved
- [ ] Attachment content integrated into page
