# Technical Specification: VIBE-236 - Accessibility Statement Page

## 1. Architecture Overview

This ticket requires implementing an Accessibility Statement page that provides comprehensive accessibility information about the CaTH service. The implementation is simpler than the Cookie Policy (VIBE-241) as it's a content-only page without form interactions.

### Key Components
1. **Accessibility Statement Page Controller** - New page route in `libs/public-pages`
2. **Accessibility Statement Template** - Nunjucks template with full statement content
3. **Footer Link Update** - The footer already has an accessibility link; verify it points to correct route
4. **Back to Top Component** - Reusable component for page navigation (can share with Cookie Policy)
5. **Locale Support** - Full English and Welsh content

### Architecture Decisions
- **Module Location**: Add to `libs/public-pages` as this is a public-facing statutory page
- **Route Pattern**: `/accessibility-statement` (EN) and `/datganiad-hygyrchedd` (CY)
- **No Forms**: This is a static content page, no POST handler needed
- **Footer Link**: Update existing `/accessibility-statement` link if needed
- **Component Reuse**: Can share Back to Top component with Cookie Policy page

## 2. Component Breakdown

### 2.1 Accessibility Statement Page Controller

**Location**: `libs/public-pages/src/pages/accessibility-statement/index.ts`

```typescript
import type { Request, Response } from "express";
import { cy } from "./cy.js";
import { en } from "./en.js";

export const GET = async (req: Request, res: Response) => {
  const locale = res.locals.locale || "en";
  const t = locale === "cy" ? cy : en;

  res.render("accessibility-statement/index", {
    en,
    cy
  });
};
```

### 2.2 Template Structure

**Location**: `libs/public-pages/src/pages/accessibility-statement/index.njk`

**Template Sections**:
1. Page title
2. Full accessibility statement content (10 sections)
3. Back to top link

### 2.3 Content Files

**Locations**:
- `libs/public-pages/src/pages/accessibility-statement/en.ts`
- `libs/public-pages/src/pages/accessibility-statement/cy.ts`

**Content Structure**:
```typescript
export const en = {
  pageTitle: "Accessibility statement",

  // Section 1: Header
  introHeading: "Accessibility statement for Court and Tribunal Hearings",
  introText: "This accessibility statement applies to content published on court-tribunal-hearings.service.gov.uk.",
  serviceDescription: "...",

  // Section 2: How accessible this website is
  accessibleHeading: "How accessible this website is",
  accessibleFeatures: [
    "You can zoom in up to 300% without the text spilling off the screen",
    "Navigate most of the website using just a keyboard",
    // ... more features
  ],
  inaccessibleContent: [
    "Some PDFs are not fully accessible to screen readers",
    // ... more issues
  ],

  // Section 3: Feedback and contact
  feedbackHeading: "Feedback and contact information",
  contactDetails: {
    telephone: "0300 303 0656",
    email: "publicationsinformation@justice.gov.uk",
    hours: "Monday to Friday, 8am to 5pm"
  },

  // ... all other sections

  // Navigation
  backToTop: "Back to Top",

  // Metadata
  preparedDate: "8 September 2023",
  reviewedDate: "6 March 2025",
  auditedDate: "18 November 2024"
};
```

### 2.4 Footer Verification

**File**: `libs/web-core/src/views/components/site-footer.njk`

The footer already has an accessibility link at line 20-22:
```njk
{
  href: "/accessibility-statement",
  text: footer.accessibility
}
```

**Action**: Verify the link works correctly and update the `target` and `rel` attributes to open in a new window as per requirements:
```njk
{
  href: "/accessibility-statement",
  text: footer.accessibility,
  attributes: {
    target: "_blank",
    rel: "noopener noreferrer",
    "aria-label": footer.accessibilityAriaLabel
  }
}
```

### 2.5 Locale Updates

**Files**:
- `libs/web-core/src/locales/en.ts`
- `libs/web-core/src/locales/cy.ts`

**Changes**:
```typescript
footer: {
  accessibility: "Accessibility statement", // EN
  accessibilityAriaLabel: "Accessibility statement (opens in new window)" // EN

  accessibility: "Datganiad hygyrchedd", // CY
  accessibilityAriaLabel: "Datganiad hygyrchedd (yn agor mewn ffenestr newydd)" // CY
}
```

## 3. Data Models

No database models required. This is a static content page.

## 4. Frontend Requirements

### 4.1 GOV.UK Design System Components

**Required Components**:
- Standard text elements (headings, paragraphs, lists)
- No form components needed
- Back to top link (custom component)

### 4.2 Template Structure

```njk
{% extends "layouts/base-template.njk" %}

{% block content %}
<div class="govuk-grid-row">
  <div class="govuk-grid-column-two-thirds">

    <h1 class="govuk-heading-xl">{{ pageTitle }}</h1>

    <!-- Section 1: Introduction -->
    <h2 class="govuk-heading-l">{{ introHeading }}</h2>
    <p class="govuk-body">{{ introText }}</p>
    <p class="govuk-body">{{ serviceDescription }}</p>

    <!-- Section 2: How accessible -->
    <h2 class="govuk-heading-l">{{ accessibleHeading }}</h2>
    <p class="govuk-body">{{ accessibleIntro }}</p>
    <ul class="govuk-list govuk-list--bullet">
      {% for feature in accessibleFeatures %}
      <li>{{ feature }}</li>
      {% endfor %}
    </ul>

    <!-- ... all other sections -->

    <!-- Back to Top -->
    <p class="govuk-body">
      <a href="#main-content"
         class="govuk-link accessibility-statement__back-to-top"
         aria-label="{{ backToTopAriaLabel }}">
        ↑ {{ backToTop }}
      </a>
    </p>

  </div>
</div>
{% endblock %}
```

### 4.3 Styling

**Location**: `libs/public-pages/src/assets/css/accessibility-statement.scss` (if needed)

Can reuse Back to Top styles from Cookie Policy:
```scss
.accessibility-statement {
  &__back-to-top {
    display: inline-flex;
    align-items: center;
    margin-top: 2rem;

    &::before {
      content: "↑";
      margin-right: 0.5rem;
      font-size: 1.5rem;
    }
  }
}
```

### 4.4 JavaScript

**Location**: Can reuse from Cookie Policy or create shared component

```typescript
// Smooth scroll to top functionality
document.addEventListener('DOMContentLoaded', () => {
  const backToTopLinks = document.querySelectorAll('[data-module="back-to-top"]');
  backToTopLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });
});
```

## 5. Backend Requirements

### 5.1 Controller Logic

**Simple GET-only controller**:
- No form processing
- No validation
- No POST handler
- Just render the template with locale data

```typescript
export const GET = async (req: Request, res: Response) => {
  const locale = res.locals.locale || "en";
  const t = locale === "cy" ? cy : en;

  res.render("accessibility-statement/index", {
    en,
    cy,
    title: t.pageTitle
  });
};
```

### 5.2 Route Configuration

The existing route auto-discovery in `createSimpleRouter` will automatically pick up the new page at `/accessibility-statement`.

For Welsh route `/datganiad-hygyrchedd`, the i18n middleware will handle the language switching.

## 6. Security Considerations

### 6.1 Content Security Policy

- No forms, so no CSRF concerns
- No user input
- Static content only
- Back to top functionality should use CSP-compliant approach

### 6.2 External Links

- Email links should use `mailto:` protocol
- External links (if any) should have `rel="noopener noreferrer"`

## 7. Accessibility Requirements

### 7.1 WCAG 2.2 AA Compliance

**Heading Hierarchy**:
```html
<h1>Accessibility statement</h1>
  <h2>How accessible this website is</h2>
  <h2>Feedback and contact information</h2>
  <h2>Reporting accessibility problems</h2>
  <!-- etc. -->
```

**Lists**:
```html
<ul class="govuk-list govuk-list--bullet">
  <li>Feature 1</li>
  <li>Feature 2</li>
</ul>
```

**Contact Information**:
```html
<p class="govuk-body">
  <strong>Telephone:</strong> 0300 303 0656<br>
  <strong>Email:</strong> <a href="mailto:publicationsinformation@justice.gov.uk" class="govuk-link">publicationsinformation@justice.gov.uk</a><br>
  <strong>Hours:</strong> Monday to Friday, 8am to 5pm
</p>
```

**Back to Top**:
```html
<a href="#main-content"
   class="govuk-link accessibility-statement__back-to-top"
   aria-label="Back to top of page">
  ↑ Back to Top
</a>
```

### 7.2 Keyboard Navigation

- All links must be keyboard accessible
- Focus indicators must be visible
- Tab order must be logical
- Back to top link must be reachable via Tab

### 7.3 Screen Reader Support

- Proper heading hierarchy
- Descriptive link text
- ARIA labels where needed
- Language attribute correctly set

### 7.4 Language Switching

- Welsh content matches English structure exactly
- `lang` attribute correctly set on HTML element
- Metadata includes alternate language links

## 8. Testing Strategy

### 8.1 Unit Tests

**Controller Tests** (`libs/public-pages/src/pages/accessibility-statement/index.test.ts`):
- GET renders correct template
- GET passes correct locale data
- GET handles locale switching
- GET sets correct page title

**Template Tests** (`libs/public-pages/src/pages/accessibility-statement/index.njk.test.ts`):
- Template renders without errors
- All content sections display
- Back to top link renders
- Welsh content renders when locale=cy
- All headings in correct hierarchy
- All ARIA attributes present

### 8.2 E2E Tests (Playwright)

**Test File**: `e2e-tests/tests/accessibility-statement.spec.ts`

**Test Scenarios** (TS1-TS9):
1. Footer link visible on all pages
2. Footer link opens accessibility statement in new window
3. Full content loads correctly
4. Welsh toggle works
5. Back to top scrolls to top
6. Keyboard navigation works
7. Axe accessibility scan passes
8. Mobile responsive layout
9. SEO metadata correct

### 8.3 Accessibility Tests

**Automated**:
- Axe-core scan in Playwright tests
- pa11y-ci in CI pipeline
- Heading hierarchy validation
- Link accessibility validation

**Manual**:
- NVDA/JAWS screen reader testing
- Keyboard-only navigation
- Browser zoom to 200%
- Color contrast verification

### 8.4 Cross-Browser Testing

**Target Browsers** (GOV.UK standard):
- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
- Mobile Safari (iOS)
- Chrome (Android)

## 9. Implementation Notes

### 9.1 Content Source

The full accessibility statement content must be extracted from the uploaded document referenced in the JIRA ticket. This should be structured in the English and Welsh locale files.

**Important Dates to Include**:
- Prepared: 8 September 2023
- Reviewed: 6 March 2025
- Last audited: 18 November 2024

### 9.2 Footer Link Behavior

Requirements state the link should open in a new window. Update the footer component to include:
```njk
{
  href: "/accessibility-statement",
  text: footer.accessibility,
  attributes: {
    target: "_blank",
    rel: "noopener noreferrer",
    "aria-label": footer.accessibilityAriaLabel
  }
}
```

### 9.3 Component Reuse Opportunities

**Back to Top Component**:
Since both Cookie Policy (VIBE-241) and Accessibility Statement (VIBE-236) need a Back to Top component, consider creating a shared component:

**Location**: `libs/web-core/src/views/components/back-to-top.njk`

```njk
{% macro backToTop(text, ariaLabel) %}
<p class="govuk-body">
  <a href="#main-content"
     class="govuk-link back-to-top"
     data-module="back-to-top"
     aria-label="{{ ariaLabel or 'Back to top of page' }}">
    ↑ {{ text }}
  </a>
</p>
{% endmacro %}
```

Then use in both pages:
```njk
{% from "components/back-to-top.njk" import backToTop %}
{{ backToTop(backToTopText, backToTopAriaLabel) }}
```

### 9.4 Dynamic Content Considerations

The specification mentions dates (prepared, reviewed, audited). These could be:
- **Static**: Hardcoded in locale files (simpler)
- **Dynamic**: Stored in config/database (more maintainable)

**Recommendation**: Start with static content in locale files. If dates need frequent updates, consider moving to a config file later.

## 10. Comparison with VIBE-241 (Cookie Policy)

| Aspect | Cookie Policy (VIBE-241) | Accessibility Statement (VIBE-236) |
|--------|--------------------------|-----------------------------------|
| Complexity | Medium (has form) | Low (content only) |
| POST Handler | Yes (save preferences) | No |
| Form Validation | Yes | No |
| Cookie Management | Yes | No |
| Content Length | Medium | Long (10 sections) |
| Back to Top | Yes | Yes |
| Welsh Support | Yes | Yes |
| Footer Link Update | Yes (change link) | Yes (add attributes) |
| Estimated Effort | 55 hours | 25 hours |

**Shared Components**:
- Back to Top component
- Footer structure
- i18n/locale handling
- Base template
- GOV.UK styling

## 11. Definition of Done

- [ ] Accessibility statement page created at `/accessibility-statement`
- [ ] Welsh route `/datganiad-hygyrchedd` works
- [ ] Footer link updated with new window attributes
- [ ] Full statement content displays (EN and CY)
- [ ] All 10 content sections included
- [ ] Contact information correct
- [ ] Audit dates displayed
- [ ] Back to top link works
- [ ] Smooth scroll functionality
- [ ] Opens in new window from footer
- [ ] All unit tests pass (>80% coverage)
- [ ] All E2E tests pass
- [ ] Accessibility tests pass (Axe-core)
- [ ] Manual accessibility testing complete
- [ ] Cross-browser testing complete
- [ ] Heading hierarchy correct (h1 → h2)
- [ ] Screen reader compatible
- [ ] Keyboard navigation works
- [ ] Code reviewed and approved
- [ ] Documentation updated

## 12. Risk Mitigation

### Risk 1: Content Accuracy
**Risk**: Accessibility statement content may be outdated or inaccurate.
**Mitigation**: Verify content with HMCTS accessibility team before implementation.

### Risk 2: Statutory Compliance
**Risk**: Accessibility statement must comply with legal requirements.
**Mitigation**: Review against Public Sector Bodies regulations. Get legal/compliance sign-off.

### Risk 3: Audit Date Updates
**Risk**: Audit dates will become outdated.
**Mitigation**: Add reminder to update dates. Consider dynamic solution if frequent updates needed.

### Risk 4: External Dependencies
**Risk**: Content references external services (EHRC, GOV.UK).
**Mitigation**: Ensure external links are current and functional.
