# VIBE-241: Cookie Policy Page - Technical Specification

## Overview

This specification details the implementation of a dedicated Cookie Policy page for the CaTH (Courts and Tribunals Hearings) service. The page will provide comprehensive information about cookie usage and allow users to manage their cookie preferences, meeting GOV.UK Design System standards and WCAG 2.2 AA accessibility requirements.

## Business Requirements

### Primary Goals
1. Provide transparent information about cookie usage in the CaTH service
2. Allow users to view and manage cookie preferences from a dedicated informational page
3. Comply with UK GDPR and ePrivacy regulations
4. Meet Government Service Standard requirements for cookie disclosure

### User Needs
- **As a service user**, I need to understand what cookies are used and why, so I can make informed decisions about my privacy
- **As a service user**, I need to access cookie settings from any page via the footer
- **As a Welsh-speaking user**, I need full access to cookie information in Welsh
- **As a user with accessibility needs**, I need the cookie policy to be screen reader compatible and keyboard navigable

## Technical Requirements

### 1. URL Structure and Routing

**English Route:**
- URL: `/cookies-policy`
- Controller: `libs/web-core/src/pages/cookies-policy/index.ts`
- Template: `libs/web-core/src/pages/cookies-policy/index.njk`

**Welsh Route:**
- URL: `/polisi-cwcis`
- Controller: `libs/web-core/src/pages/polisi-cwcis/index.ts`
- Template: Shared with English route (`cookies-policy/index.njk`)
- i18n: Automatic language detection via existing i18n middleware

### 2. Footer Link Integration

**Current Footer Structure:**
The footer currently includes links to:
- Help (external)
- Privacy Policy (external)
- Cookies (/cookie-preferences) - **TO BE UPDATED**
- Accessibility statement (/accessibility-statement)
- Contact Us (external)
- Terms and conditions (external)
- Welsh language toggle
- Government Digital Service (external)

**Required Changes:**
1. Update the "Cookies" footer link to point to `/cookies-policy` instead of `/cookie-preferences`
2. Link must open the cookie policy page (not in a new window - standard GOV.UK pattern)
3. Maintain bilingual support via existing i18n system

**File to modify:**
- `libs/web-core/src/views/components/site-footer.njk` (line 16-18)

### 3. Page Structure and Content

#### Content Sections (Based on GOV.UK Pattern)

1. **Page Title and Introduction**
   - Clear heading explaining the purpose of cookies
   - Brief introduction to how the CaTH service uses cookies

2. **Essential Cookies Section**
   - Explanation of strictly necessary cookies
   - Table listing essential cookies with:
     - Cookie name
     - Purpose
     - Expiry time
   - Essential cookies currently used:
     - `connect.sid` - Session management
     - `cookies_preferences_set` - Cookie banner control
     - `cookie_policy` - User cookie preferences

3. **Analytics Cookies Section**
   - Explanation of Google Analytics usage
   - Table listing analytics cookies:
     - `_ga`, `_gid` (Google Analytics)
   - Purpose: Measure service usage and improve user experience
   - Note: Only loaded if user consents

4. **Performance Monitoring Cookies Section**
   - Explanation of Dynatrace usage
   - Table listing performance cookies:
     - `dtCookie`, `dtSa`, `rxVisitor`, `rxvt` (Dynatrace)
   - Purpose: Monitor service performance and technical issues
   - Note: Only loaded if user consents

5. **Preference Cookies Section**
   - Explanation of preference cookies
   - Currently: `language` cookie for Welsh/English preference
   - Purpose: Remember user settings

6. **Manage Cookie Settings**
   - Prominent link to `/cookie-preferences` page
   - Button or link styled using GOV.UK button component
   - Text: "Change your cookie settings"

#### Cookie Tables Format

Each cookie table should follow GOV.UK Design System table patterns:

```
| Name | Purpose | Expires |
|------|---------|---------|
| cookie_name | Description of what it does | Time period |
```

### 4. Template Implementation

**Base Template:**
- Extend `layouts/base-template.njk`
- No back link required (informational page)
- Use standard GOV.UK typography and spacing

**Component Usage:**
- `govuk-heading-xl` for main title
- `govuk-heading-l` for section headings
- `govuk-heading-m` for sub-sections
- `govuk-body` for paragraphs
- `govuk-table` for cookie listings
- `govuk-button` for "Change settings" link

**Nunjucks Structure:**
```njk
{% extends "layouts/base-template.njk" %}

{% block backLink %}
  {# No back link for policy pages #}
{% endblock %}

{% block page_content %}
  <h1 class="govuk-heading-xl">{{ title }}</h1>

  {# Introduction #}
  <p class="govuk-body">{{ intro }}</p>

  {# Essential cookies section #}
  <h2 class="govuk-heading-l">{{ essentialSection.heading }}</h2>
  <p class="govuk-body">{{ essentialSection.description }}</p>

  {# Cookie table macro or component #}
  {{ govukTable(...) }}

  {# Repeat for other sections #}

  {# Link to preferences page #}
  <p class="govuk-body">
    <a href="/cookie-preferences" class="govuk-button">{{ changeSettingsButton }}</a>
  </p>
{% endblock %}
```

### 5. Content Management (i18n)

**English Content File:**
- Location: `libs/web-core/src/pages/cookies-policy/en.ts`
- Export: `export const en = { ... }`

**Welsh Content File:**
- Location: `libs/web-core/src/pages/cookies-policy/cy.ts`
- Export: `export const cy = { ... }`

**Content Structure:**
```typescript
export const en = {
  title: "Cookies",
  intro: "A cookie is a small piece of data...",
  essentialSection: {
    heading: "Essential cookies",
    description: "We use essential cookies to...",
    cookies: [
      {
        name: "connect.sid",
        purpose: "Session management...",
        expires: "When you close your browser"
      },
      // ... more cookies
    ]
  },
  analyticsSection: {
    heading: "Analytics cookies (optional)",
    description: "We use Google Analytics to...",
    cookies: [ /* ... */ ]
  },
  performanceSection: {
    heading: "Performance monitoring cookies (optional)",
    description: "We use Dynatrace to...",
    cookies: [ /* ... */ ]
  },
  preferencesSection: {
    heading: "Preference cookies",
    description: "We use preference cookies to...",
    cookies: [ /* ... */ ]
  },
  changeSettings: {
    text: "You can change which cookies you're happy for us to use.",
    buttonText: "Change your cookie settings"
  }
};
```

### 6. Controller Implementation

**Responsibilities:**
- Render the cookie policy template
- Pass bilingual content to the template
- No POST handler required (read-only page)

**Implementation:**
```typescript
// libs/web-core/src/pages/cookies-policy/index.ts
import type { Request, Response } from "express";
import { cy } from "./cy.js";
import { en } from "./en.js";

export const GET = async (_req: Request, res: Response) => {
  res.render("cookies-policy/index", {
    en,
    cy
  });
};
```

**Welsh Route Controller:**
```typescript
// libs/web-core/src/pages/polisi-cwcis/index.ts
import type { Request, Response } from "express";

export const GET = async (_req: Request, res: Response) => {
  res.redirect("/cookies-policy?lng=cy");
};
```

### 7. Integration with Existing Cookie System

**Current Cookie Infrastructure:**
- Cookie manager middleware: `libs/web-core/src/middleware/cookies/cookie-manager-middleware.ts`
- Cookie preferences page: `libs/web-core/src/pages/cookie-preferences/`
- Cookie helpers: `libs/web-core/src/middleware/cookies/cookie-helpers.ts`
- Analytics loading: `libs/web-core/src/views/components/head-analytics.njk`

**Integration Points:**

1. **Footer Link Update:**
   - Change from `/cookie-preferences` to `/cookies-policy`
   - Maintain bilingual support

2. **Cookie Policy Page Links to Preferences:**
   - Cookie policy is informational
   - Contains prominent link to `/cookie-preferences` for changing settings
   - Clear distinction: policy = information, preferences = settings control

3. **Cookie Loading Logic:**
   - No changes required to existing conditional loading
   - Analytics scripts (`head-analytics.njk`) already check cookie preferences
   - Cookie manager middleware already provides state to templates

4. **Cookie Banner:**
   - No changes required
   - Banner already links to `/cookie-preferences` for settings

### 8. Accessibility Requirements

**WCAG 2.2 AA Compliance:**

1. **Semantic HTML:**
   - Proper heading hierarchy (h1 → h2 → h3)
   - Semantic table markup with `<th>` scope attributes
   - Descriptive link text (no "click here")

2. **Keyboard Navigation:**
   - All interactive elements keyboard accessible
   - Focus indicators visible
   - Logical tab order

3. **Screen Reader Support:**
   - Page title in `<title>` tag
   - Table headers properly associated with data cells
   - No empty table cells (use "N/A" if needed)

4. **Visual Design:**
   - GOV.UK typography provides sufficient contrast
   - 1.5 line spacing for body text
   - Responsive layout for mobile devices

5. **Language Support:**
   - `lang` attribute on HTML element
   - Proper Welsh character support (UTF-8)
   - Content parity between English and Welsh

### 9. Testing Requirements

**Unit Tests:**
- Test GET handler renders correct template
- Test bilingual content is passed correctly
- Test Welsh redirect route functions

**E2E Tests:**
- Navigate to `/cookies-policy` - page loads
- Navigate to `/polisi-cwcis` - redirects to Welsh version
- Footer "Cookies" link navigates to cookie policy
- "Change your cookie settings" link navigates to preferences
- Page is accessible without JavaScript
- Keyboard navigation works
- Switch language - content updates

**Accessibility Tests:**
- Axe-core automated testing
- Heading hierarchy validation
- Table structure validation
- Contrast ratio checks

## Implementation Constraints

### Must Not Change
- Existing cookie preference functionality (`/cookie-preferences`)
- Cookie manager middleware behavior
- Analytics and performance monitoring conditional loading
- Cookie banner functionality

### Must Maintain
- Backward compatibility with existing cookie settings
- Session handling
- i18n middleware integration
- GOV.UK Design System compliance

## Dependencies

### Existing Systems
- i18n middleware (provides language switching)
- Cookie manager middleware (provides cookie state)
- Nunjucks templating engine
- GOV.UK Frontend components

### Files to Modify
1. `libs/web-core/src/views/components/site-footer.njk` - Update footer link
2. Create new page: `libs/web-core/src/pages/cookies-policy/`
3. Create new redirect: `libs/web-core/src/pages/polisi-cwcis/`

### No Build Changes Required
- Routes are auto-discovered by simple-router
- Templates copied by existing build:nunjucks script
- No changes to `apps/web/src/app.ts` registration

## Security Considerations

1. **No User Input:**
   - Read-only informational page
   - No forms or POST handlers
   - No XSS risk from dynamic content

2. **Content Security:**
   - All content from static i18n files
   - No external scripts on this page
   - No inline JavaScript required

3. **Cookie Information:**
   - Accurately document all cookies used
   - Keep technical details without exposing vulnerabilities
   - Explain security cookies (session) appropriately

## Performance Considerations

1. **Static Content:**
   - No database queries
   - No external API calls
   - Fast page load time

2. **Template Caching:**
   - Nunjucks template caching enabled in production
   - i18n content loaded at startup

3. **No Additional Assets:**
   - Uses existing GOV.UK styles
   - No custom CSS required
   - No JavaScript required

## Future Considerations

1. **Content Updates:**
   - Cookie list may change as features are added
   - Content should be easy to update in i18n files
   - Consider CMS for non-technical content updates

2. **Additional Languages:**
   - Architecture supports adding more languages
   - Welsh route pattern can be replicated

3. **Cookie Scanning:**
   - Consider automated cookie detection tools
   - Keep documentation synchronized with actual usage

## Success Criteria

1. Users can access cookie policy from footer on any page
2. Cookie policy page displays all cookie information clearly
3. Page is fully bilingual (English and Welsh)
4. Page meets WCAG 2.2 AA standards
5. Users can easily navigate to cookie preferences to change settings
6. Page loads without JavaScript (progressive enhancement)
7. E2E and accessibility tests pass
8. No impact on existing cookie preference functionality

## Out of Scope

1. Changes to cookie preference functionality
2. Changes to cookie banner behavior
3. Additional cookie categories
4. Cookie consent mechanism changes
5. Analytics implementation changes
6. Performance monitoring implementation changes
