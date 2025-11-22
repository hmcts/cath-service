# VIBE-241: Cookie Policy Page - Technical Specification

## Overview
Implement a comprehensive Cookie Policy information page for the CaTH service. This differs from the existing cookie preferences page by providing detailed educational content about what cookies are, how they're used, and legal information rather than just preference management.

## User Story
**As a** user of the CaTH service
**I want to** read detailed information about how cookies are used
**So that** I can make informed decisions about my cookie preferences and understand legal requirements

## Existing Infrastructure

The codebase already has:
- Cookie preferences page at `/cookie-preferences` (libs/web-core/src/pages/cookie-preferences/)
- Cookie manager middleware (libs/web-core/src/middleware/cookies/)
- Cookie banner component (libs/web-core/src/views/components/cookie-banner.njk)
- Footer with link to `/cookie-preferences`

## Requirements

### 1. New Cookie Policy Page

**Route**: `/cookie-policy` (separate from existing `/cookie-preferences`)

**Purpose**: Educational/informational page explaining:
- What cookies are and how they work
- Types of cookies used by CaTH service
- Legal basis for cookie usage (PECR, GDPR)
- Detailed cookie tables with name, purpose, expiry
- Links to cookie preferences management

**Content Structure**:
1. Introduction to cookies
2. Essential cookies section
   - Session cookies (connect.sid)
   - Security cookies (CSRF tokens)
   - Cookie preference storage (cookie_policy)
3. Analytics cookies section
   - Google Analytics (_ga, _gid)
   - Purpose and data collected
   - How to opt out
4. Performance monitoring cookies
   - Dynatrace (dtCookie, dtSa, rxVisitor, rxvt)
   - Purpose and data collected
   - How to opt out
5. Managing your cookies
   - Link to `/cookie-preferences` page
   - Browser cookie controls
6. Contact information

### 2. Footer Link Update

Current footer has: "Cookies" → `/cookie-preferences`

Update to provide both:
- "Cookie policy" → `/cookie-policy` (new information page)
- "Cookie preferences" → `/cookie-preferences` (existing settings page)

Or keep single link to `/cookie-policy` with prominent link to preferences.

### 3. Bilingual Support

- English content (en.ts)
- Welsh content (cy.ts)
- Both languages for all sections including detailed cookie descriptions

### 4. GOV.UK Design System Compliance

Use components:
- `govukTable` for cookie information tables
- `govukDetails` for expandable sections (optional)
- `govukInsetText` for important notices
- `govukButton` for "Manage cookie preferences" call-to-action

### 5. Accessibility Requirements (WCAG 2.2 AA)

- Semantic HTML structure with proper heading hierarchy (h1, h2, h3)
- Tables with proper `<th>` scope attributes
- All interactive elements keyboard accessible
- Proper focus indicators
- Screen reader friendly descriptions
- Language attributes on Welsh content

## Technical Implementation

### Module Structure
```
libs/web-core/src/pages/cookie-policy/
├── index.ts              # Controller
├── index.njk             # Template
├── en.ts                 # English content
└── cy.ts                 # Welsh content
```

### Controller Pattern
```typescript
// libs/web-core/src/pages/cookie-policy/index.ts
import type { Request, Response } from "express";
import { en } from "./en.js";
import { cy } from "./cy.js";

export const GET = async (_req: Request, res: Response) => {
  res.render("cookie-policy/index", {
    en,
    cy
  });
};
```

### Template Structure

```nunjucks
{% extends "layouts/base-template.njk" %}

{% block content %}
<div class="govuk-grid-row">
  <div class="govuk-grid-column-two-thirds">

    <h1 class="govuk-heading-xl">{{ title }}</h1>

    <p class="govuk-body-l">{{ intro }}</p>

    <h2 class="govuk-heading-l">{{ whatAreCookies.title }}</h2>
    <p class="govuk-body">{{ whatAreCookies.description }}</p>

    <h2 class="govuk-heading-l">{{ essentialCookies.title }}</h2>
    <p class="govuk-body">{{ essentialCookies.description }}</p>

    {{ govukTable({
      head: [
        { text: tableHeaders.name },
        { text: tableHeaders.purpose },
        { text: tableHeaders.expiry }
      ],
      rows: essentialCookies.table
    }) }}

    <h2 class="govuk-heading-l">{{ analyticsCookies.title }}</h2>
    <p class="govuk-body">{{ analyticsCookies.description }}</p>

    {{ govukTable({
      head: [
        { text: tableHeaders.name },
        { text: tableHeaders.purpose },
        { text: tableHeaders.expiry }
      ],
      rows: analyticsCookies.table
    }) }}

    <h2 class="govuk-heading-l">{{ performanceCookies.title }}</h2>
    <p class="govuk-body">{{ performanceCookies.description }}</p>

    {{ govukTable({
      head: [
        { text: tableHeaders.name },
        { text: tableHeaders.purpose },
        { text: tableHeaders.expiry }
      ],
      rows: performanceCookies.table
    }) }}

    <h2 class="govuk-heading-l">{{ manageCookies.title }}</h2>
    <p class="govuk-body">{{ manageCookies.description }}</p>

    {{ govukButton({
      text: manageCookies.buttonText,
      href: "/cookie-preferences"
    }) }}

  </div>
</div>
{% endblock %}
```

### Content Structure (en.ts and cy.ts)

```typescript
export const en = {
  title: "Cookie policy",
  intro: "Cookies are files saved on your phone, tablet or computer when you visit a website.",

  whatAreCookies: {
    title: "How cookies are used on this service",
    description: "We use cookies to..."
  },

  essentialCookies: {
    title: "Strictly necessary cookies",
    description: "These cookies are essential for you to use this service...",
    table: [
      [
        { text: "connect.sid" },
        { text: "Used to maintain your session..." },
        { text: "When you close your browser" }
      ],
      // More rows...
    ]
  },

  analyticsCookies: {
    title: "Analytics cookies (optional)",
    description: "We use Google Analytics to measure how you use the service...",
    table: [
      // Cookie details...
    ]
  },

  performanceCookies: {
    title: "Performance monitoring cookies (optional)",
    description: "We use Dynatrace to monitor service performance...",
    table: [
      // Cookie details...
    ]
  },

  manageCookies: {
    title: "Change your cookie settings",
    description: "You can choose which cookies you're happy for us to use.",
    buttonText: "Manage cookie preferences"
  },

  tableHeaders: {
    name: "Name",
    purpose: "Purpose",
    expiry: "Expires"
  }
};
```

## Implementation Tasks

### Task 1: Create Cookie Policy Page Files (30 mins)
- [ ] Create `libs/web-core/src/pages/cookie-policy/index.ts`
- [ ] Create `libs/web-core/src/pages/cookie-policy/index.njk`
- [ ] Create `libs/web-core/src/pages/cookie-policy/en.ts`
- [ ] Create `libs/web-core/src/pages/cookie-policy/cy.ts`

### Task 2: Write Cookie Policy Content (1 hour)
- [ ] Research and document all cookies used by CaTH
- [ ] Write English content with detailed descriptions
- [ ] Obtain Welsh translations
- [ ] Organize content into tables for each cookie category
- [ ] Include legal information (PECR, GDPR references)

### Task 3: Update Footer Component (15 mins)
- [ ] Add separate link for "Cookie policy" in site-footer.njk
- [ ] Update footer locale strings in web-core/src/locales/en.ts
- [ ] Update footer locale strings in web-core/src/locales/cy.ts
- [ ] Consider grouping cookie-related links

### Task 4: Update Cookie Banner Links (15 mins)
- [ ] Update cookie-banner.njk to reference `/cookie-policy` for detailed information
- [ ] Keep `/cookie-preferences` link for settings

### Task 5: Testing (1 hour)
- [ ] Unit tests for controller if needed
- [ ] E2E test: Navigate to /cookie-policy
- [ ] E2E test: Verify all content sections render
- [ ] E2E test: Welsh translation works
- [ ] E2E test: Link to cookie preferences works
- [ ] E2E test: Footer link works
- [ ] Accessibility test: WCAG 2.2 AA compliance with axe-core
- [ ] Accessibility test: Keyboard navigation
- [ ] Accessibility test: Screen reader compatibility

### Task 6: Documentation (15 mins)
- [ ] Update web-core README if needed
- [ ] Document cookie categories for future reference

## Cookie Information to Document

Based on existing code in apps/web/src/app.ts:

### Essential Cookies
- `connect.sid` - Session cookie
- `cookie_policy` - Stores cookie preferences
- `cookies_preferences_set` - Tracks if user has seen banner
- CSRF tokens (if used)

### Analytics Cookies (Optional - requires consent)
- `_ga` - Google Analytics main cookie
- `_gid` - Google Analytics session cookie

### Performance Cookies (Optional - requires consent)
- `dtCookie` - Dynatrace session
- `dtSa` - Dynatrace monitoring
- `rxVisitor` - Dynatrace visitor tracking
- `rxvt` - Dynatrace visit tracking

## Dependencies

No new dependencies required. Uses existing:
- GOV.UK Frontend components
- Express routing via simple-router
- i18n middleware
- Existing cookie infrastructure

## Definition of Done

- [ ] Cookie policy page accessible at `/cookie-policy`
- [ ] Footer includes link to cookie policy page
- [ ] All cookie categories documented with tables
- [ ] Full Welsh translation provided
- [ ] All accessibility tests pass (WCAG 2.2 AA)
- [ ] E2E tests cover navigation and content rendering
- [ ] Link to cookie preferences page included
- [ ] Code reviewed and approved
- [ ] No regressions in existing cookie functionality

## Open Questions

1. Should we consolidate both pages into one with tabs/sections, or keep them separate?
   - **Recommendation**: Keep separate - policy is informational, preferences is functional
2. Do we need legal/compliance team review of content?
   - **Recommendation**: Yes, especially for GDPR/PECR statements
3. Should cookie policy link open in new tab from footer?
   - **Recommendation**: No, keep standard navigation (same tab)
4. Are there additional cookies used that aren't in the current config?
   - **Action**: Audit actual cookies set by the application

## Non-Functional Requirements

- **Performance**: Page should load in < 2 seconds
- **SEO**: Proper meta tags for cookie policy page
- **Monitoring**: No special monitoring needed (standard page view tracking)
- **Security**: No security concerns (read-only informational page)
