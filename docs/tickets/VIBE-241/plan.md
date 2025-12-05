# VIBE-241: Technical Implementation Plan - Cookie Policy Page

## Overview
Implement a comprehensive cookie policy page that explains cookie usage, provides settings controls, and complies with GDPR/PECR requirements. The page will be similar in structure to the existing accessibility statement page.

## Current State Analysis

### Existing Cookie Infrastructure
The codebase already has a working cookie management system:

1. **Cookie Manager Middleware** (`libs/web-core/src/middleware/cookies/`)
   - `cookie-manager-middleware.ts` - Manages cookie state and banner visibility
   - `cookie-helpers.ts` - Parse/set cookie preferences via `cookie_policy` cookie
   - Tracks consent with `cookies_preferences_set` cookie
   - Supports categorized cookies (analytics, preferences, essential)

2. **Cookie Preferences Page** (`libs/web-core/src/pages/cookie-preferences/`)
   - Already exists at `/cookie-preferences` route
   - Provides form to enable/disable analytics and preferences cookies
   - Uses GOV.UK radios component with fieldsets
   - Displays success banner after saving
   - Fully bilingual (EN/CY)

3. **Cookie Banner** (`libs/web-core/src/views/components/cookie-banner.njk`)
   - Shows on first visit
   - Accept/reject analytics cookies
   - Links to `/cookie-preferences`
   - Hidden on cookies page itself

4. **Footer Integration**
   - Already includes "Cookies" link pointing to `/cookie-preferences`
   - Defined in `libs/web-core/src/views/components/site-footer.njk`

### Gap Analysis
The specification requires a **Cookie Policy page** (different from Cookie Preferences):
- URL: `/cookies-policy` (EN) and `/polisi-cwcis` (CY)
- **Static content page** explaining what cookies are, how they're used
- Detailed cookie information tables (names, purposes, expiry)
- "Change your cookie settings" section with radio controls (embedded form)
- "Contact us for help" accordion
- "Back to Top" link/button
- Opens in new tab when linked from footer

**Key Difference**:
- `/cookie-preferences` = Settings page (form-focused, minimal content)
- `/cookies-policy` = Policy page (content-focused, includes embedded settings form)

## Technical Architecture

### Module Structure
Since cookie policy is generic functionality, it will be added to the existing `@hmcts/web-core` module rather than creating a new module.

```
libs/web-core/src/
├── pages/
│   ├── cookie-preferences/       # Existing (keep as-is)
│   │   ├── index.ts
│   │   ├── index.njk
│   │   ├── en.ts
│   │   └── cy.ts
│   └── cookies-policy/           # New cookie policy page
│       ├── index.ts              # Controller with GET handler
│       ├── index.njk             # Policy template with content + settings form
│       ├── polisi-cwcis.ts       # Welsh route handler
│       ├── en.ts                 # English content
│       └── cy.ts                 # Welsh content
├── views/
│   └── components/
│       ├── cookie-banner.njk     # Existing (no changes needed)
│       ├── site-footer.njk       # Update to add cookies-policy link
│       └── back-to-top.njk       # New component (reusable)
├── assets/
│   ├── css/
│   │   └── back-to-top.scss      # Already exists
│   └── js/
│       └── back-to-top.ts        # Already exists
└── locales/
    ├── en.ts                      # Update footer.cookiesPolicy key
    └── cy.ts                      # Update footer.cookiesPolicy key
```

### URL Routing Strategy

**English Route**: `/cookies-policy`
- Handled by `libs/web-core/src/pages/cookies-policy/index.ts`
- Standard simple-router convention

**Welsh Route**: `/polisi-cwcis`
- Requires custom route handler: `libs/web-core/src/pages/cookies-policy/polisi-cwcis.ts`
- Renders same template but with `?lng=cy` or forced Welsh locale

**Alternative URLs**: The i18n middleware supports both approaches:
1. Query param: `/cookies-policy?lng=cy`
2. Dedicated route: `/polisi-cwcis`

We'll implement both for flexibility:
- Query param works automatically via i18n middleware
- Dedicated Welsh route provides clean URL

### Content Structure

#### Page Sections (in order)

1. **Page Title**
   - `<h1>` with "Cookie Policy" / "Polisi Cwcis"

2. **Introduction**
   - What cookies are
   - Why CaTH uses cookies

3. **Essential Cookies**
   - Always required, cannot be disabled
   - Table: cookie name, purpose, expiry
   - Includes: session cookies, security cookies

4. **Analytics Cookies (Google Analytics)**
   - Measure website usage
   - Table: GA cookie names (_ga, _gid), purposes, expiry
   - Can be disabled via settings below

5. **Performance Monitoring Cookies (Dynatrace)**
   - Application performance monitoring
   - Table: Dynatrace cookies (dtCookie, dtSa, rxVisitor, rxvt), purposes, expiry
   - Can be disabled via settings below

6. **Settings Cookies**
   - Remember language preference
   - Table: language cookie, purpose, expiry

7. **Change Your Cookie Settings** (Dynamic Section)
   - Embedded form similar to `/cookie-preferences`
   - Two radio groups:
     - Analytics cookies (Use / Do not use)
     - Performance monitoring cookies (Use / Do not use)
   - Green "Save" button
   - Success banner on save (requires form POST and redirect)

8. **Contact Us Accordion**
   - GOV.UK accordion component
   - Title: "Contact us for help"
   - Content: Phone number and hours

9. **Back to Top**
   - Link with upward arrow icon
   - Smooth scroll to page top
   - Already implemented in `libs/web-core/src/assets/js/back-to-top.ts`

### Component Patterns

#### 1. Cookie Policy Page Controller

```typescript
// libs/web-core/src/pages/cookies-policy/index.ts
import type { Request, Response } from "express";
import { parseCookiePolicy, setCookieBannerSeen, setCookiePolicy } from "../../middleware/cookies/cookie-helpers.js";
import type { CookiePreferences } from "../../middleware/cookies/cookie-manager-middleware.js";
import { cy } from "./cy.js";
import { en } from "./en.js";

export const GET = async (req: Request, res: Response) => {
  const cookiePolicy = parseCookiePolicy(req.cookies?.cookie_policy);

  res.render("cookies-policy/index", {
    en,
    cy,
    cookiePreferences: cookiePolicy,
    categories: res.locals.cookieConfig?.categories,
    saved: req.query.saved === "true"
  });
};

export const POST = async (req: Request, res: Response) => {
  // Reuse same logic as cookie-preferences
  const preferences: CookiePreferences = {};
  const categories = res.locals.cookieConfig?.categories || {};

  for (const category of Object.keys(categories)) {
    if (category === "essential") continue; // Skip essential cookies
    const isEnabled = req.body?.[category] === "on" || req.body?.[category] === true;
    preferences[category] = isEnabled;
  }

  setCookiePolicy(res, preferences);
  setCookieBannerSeen(res);

  res.redirect("/cookies-policy?saved=true");
};
```

#### 2. Welsh Route Handler

```typescript
// libs/web-core/src/pages/cookies-policy/polisi-cwcis.ts
import type { Request, Response } from "express";

export const GET = async (req: Request, res: Response) => {
  // Force Welsh language and redirect to main handler
  req.query.lng = "cy";
  res.redirect(307, `/cookies-policy?lng=cy${req.query.saved ? "&saved=true" : ""}`);
};
```

#### 3. Nunjucks Template Structure

```html
<!-- libs/web-core/src/pages/cookies-policy/index.njk -->
{% extends "layouts/base-template.njk" %}
{% from "govuk/components/radios/macro.njk" import govukRadios %}
{% from "govuk/components/button/macro.njk" import govukButton %}
{% from "govuk/components/accordion/macro.njk" import govukAccordion %}
{% from "govuk/components/notification-banner/macro.njk" import govukNotificationBanner %}
{% from "govuk/components/table/macro.njk" import govukTable %}

{% block content %}
<div class="govuk-grid-row">
  <div class="govuk-grid-column-two-thirds">

    {% if saved %}
      {{ govukNotificationBanner({
        type: "success",
        titleText: successBanner,
        html: "<p class='govuk-notification-banner__heading'>" + successMessage + "</p>"
      }) }}
    {% endif %}

    <h1 class="govuk-heading-xl">{{ title }}</h1>

    <!-- Introduction section -->
    <p class="govuk-body">{{ intro.whatAreCookies }}</p>
    <p class="govuk-body">{{ intro.howWeUseCookies }}</p>

    <!-- Essential cookies section -->
    <h2 class="govuk-heading-l">{{ sections.essential.heading }}</h2>
    <p class="govuk-body">{{ sections.essential.description }}</p>
    {{ govukTable({
      head: [
        { text: tableHeaders.name },
        { text: tableHeaders.purpose },
        { text: tableHeaders.expiry }
      ],
      rows: sections.essential.cookies
    }) }}

    <!-- Analytics cookies section -->
    <h2 class="govuk-heading-l">{{ sections.analytics.heading }}</h2>
    <p class="govuk-body">{{ sections.analytics.description }}</p>
    {{ govukTable({
      head: [...],
      rows: sections.analytics.cookies
    }) }}

    <!-- Performance monitoring section -->
    <h2 class="govuk-heading-l">{{ sections.performance.heading }}</h2>
    <p class="govuk-body">{{ sections.performance.description }}</p>
    {{ govukTable({
      head: [...],
      rows: sections.performance.cookies
    }) }}

    <!-- Settings cookies section -->
    <h2 class="govuk-heading-l">{{ sections.settings.heading }}</h2>
    <p class="govuk-body">{{ sections.settings.description }}</p>
    {{ govukTable({
      head: [...],
      rows: sections.settings.cookies
    }) }}

    <!-- Change cookie settings form -->
    <h2 class="govuk-heading-l">{{ changeSettings.heading }}</h2>
    <form method="POST" action="/cookies-policy" novalidate>
      <input type="hidden" name="_csrf" value="{{ csrfToken }}">

      {{ govukRadios({
        name: "analytics",
        fieldset: {
          legend: {
            text: changeSettings.analyticsLegend,
            classes: "govuk-fieldset__legend--m"
          }
        },
        items: [
          {
            value: "on",
            text: changeSettings.useAnalytics,
            checked: cookiePreferences.analytics
          },
          {
            value: "off",
            text: changeSettings.doNotUseAnalytics,
            checked: not cookiePreferences.analytics
          }
        ]
      }) }}

      {{ govukRadios({
        name: "performance",
        fieldset: {
          legend: {
            text: changeSettings.performanceLegend,
            classes: "govuk-fieldset__legend--m"
          }
        },
        items: [
          {
            value: "on",
            text: changeSettings.usePerformance,
            checked: cookiePreferences.performance
          },
          {
            value: "off",
            text: changeSettings.doNotUsePerformance,
            checked: not cookiePreferences.performance
          }
        ]
      }) }}

      {{ govukButton({
        text: changeSettings.saveButton,
        classes: "govuk-button"
      }) }}
    </form>

    <!-- Contact accordion -->
    {{ govukAccordion({
      items: [
        {
          heading: { text: contact.heading },
          content: {
            html: "<p>" + contact.telephone + " " + contact.phone + "</p><p>" + contact.hours + "</p>"
          }
        }
      ]
    }) }}

    <!-- Back to top -->
    <p class="govuk-body">
      <a href="#" class="govuk-link back-to-top-link" aria-label="{{ backToTop.ariaLabel }}">
        ↑ {{ backToTop.text }}
      </a>
    </p>

  </div>
</div>
{% endblock %}
```

#### 4. Content File Structure (English)

```typescript
// libs/web-core/src/pages/cookies-policy/en.ts
export const en = {
  title: "Cookie Policy",
  intro: {
    whatAreCookies: "Cookies are small files...",
    howWeUseCookies: "We use cookies to..."
  },
  tableHeaders: {
    name: "Cookie name",
    purpose: "Purpose",
    expiry: "Expiry"
  },
  sections: {
    essential: {
      heading: "Essential cookies",
      description: "These cookies are necessary...",
      cookies: [
        [
          { text: "connect.sid" },
          { text: "Session identifier for secure authentication" },
          { text: "Session (deleted when browser closes)" }
        ],
        [
          { text: "cookies_preferences_set" },
          { text: "Remembers your cookie preferences" },
          { text: "1 year" }
        ],
        [
          { text: "cookie_policy" },
          { text: "Stores your cookie consent choices" },
          { text: "1 year" }
        ]
      ]
    },
    analytics: {
      heading: "Analytics cookies (Google Analytics)",
      description: "We use Google Analytics to measure...",
      cookies: [
        [
          { text: "_ga" },
          { text: "Distinguishes users and sessions" },
          { text: "2 years" }
        ],
        [
          { text: "_gid" },
          { text: "Distinguishes users" },
          { text: "24 hours" }
        ]
      ]
    },
    performance: {
      heading: "Performance monitoring cookies (Dynatrace)",
      description: "We use Dynatrace to monitor...",
      cookies: [
        [
          { text: "dtCookie" },
          { text: "Tracks session for performance monitoring" },
          { text: "Session" }
        ],
        [
          { text: "dtSa" },
          { text: "Server-side action identifier" },
          { text: "Session" }
        ],
        [
          { text: "rxVisitor" },
          { text: "Visitor tracking for RUM" },
          { text: "1 year" }
        ],
        [
          { text: "rxvt" },
          { text: "Visit tracking timestamp" },
          { text: "Session" }
        ]
      ]
    },
    settings: {
      heading: "Settings cookies",
      description: "These cookies remember your preferences...",
      cookies: [
        [
          { text: "language" },
          { text: "Remembers your language preference (English/Welsh)" },
          { text: "1 year" }
        ]
      ]
    }
  },
  changeSettings: {
    heading: "Change your cookie settings",
    analyticsLegend: "Allow cookies that measure website use?",
    useAnalytics: "Use cookies that measure my website use",
    doNotUseAnalytics: "Do not use cookies that measure my website use",
    performanceLegend: "Allow cookies that measure website application performance monitoring?",
    usePerformance: "Use cookies that measure website application performance monitoring",
    doNotUsePerformance: "Do not use cookies that measure website application performance monitoring",
    saveButton: "Save"
  },
  contact: {
    heading: "Contact us for help",
    telephone: "Telephone:",
    phone: "0300 303 0656",
    hours: "Monday to Friday 8am to 5pm"
  },
  backToTop: {
    text: "Back to Top",
    ariaLabel: "Back to top of page"
  },
  successBanner: "Success",
  successMessage: "Your cookie settings have been saved"
};
```

### Footer Integration

Update the footer to differentiate between "Cookie preferences" (settings) and "Cookie policy" (information).

**Option 1: Add separate link** (Recommended)
```html
<!-- libs/web-core/src/views/components/site-footer.njk -->
{
  href: "/cookies-policy",
  text: footer.cookiesPolicy,
  attributes: {
    target: "_blank",
    rel: "noopener noreferrer"
  }
},
{
  href: "/cookie-preferences",
  text: footer.cookies
}
```

**Option 2: Replace existing link**
Change existing `/cookie-preferences` link to `/cookies-policy` and open in new tab.

**Recommendation**: Use Option 1 to maintain backward compatibility with cookie banner links.

### Cookie Categories Configuration

Update the cookie manager configuration to support "performance" category:

```typescript
// apps/web/src/app.ts
await configureCookieManager(app, {
  preferencesPath: "/cookie-preferences",
  categories: {
    essential: ["connect.sid", "cookies_preferences_set", "cookie_policy"],
    analytics: ["_ga", "_gid"],
    performance: ["dtCookie", "dtSa", "rxVisitor", "rxvt"],
    preferences: ["language"]
  }
});
```

### Conditional Script Loading

The specification requires that GA and Dynatrace scripts are conditionally loaded based on user preferences.

**Current Implementation** (from template):
```html
<!-- libs/web-core/src/views/components/head-analytics.njk -->
{% if cookieManager.cookiePreferences.analytics %}
  <!-- Google Analytics scripts -->
{% endif %}
```

**Required Enhancement**:
```html
<!-- libs/web-core/src/views/components/head-analytics.njk -->
{% if cookieManager.cookiePreferences.analytics %}
  <!-- Google Analytics scripts -->
  <script nonce="{{ cspNonce }}">
    (function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;...})(window,document,'script',...);
  </script>
{% endif %}

{% if cookieManager.cookiePreferences.performance %}
  <!-- Dynatrace RUM script -->
  <script nonce="{{ cspNonce }}" src="{{ dynatrace.url }}" crossorigin="anonymous"></script>
{% endif %}
```

### Back to Top Component

The back-to-top functionality already exists in `libs/web-core/src/assets/js/back-to-top.ts`. We need to:

1. **Initialize in page**: Import and call `initBackToTop()` in the main JS bundle
2. **Add component partial**: Create reusable Nunjucks partial for the link
3. **Style appropriately**: Use existing `back-to-top.scss`

```html
<!-- libs/web-core/src/views/components/back-to-top.njk -->
<p class="govuk-body">
  <a href="#" class="govuk-link back-to-top-link" aria-label="{{ ariaLabel }}">
    <span aria-hidden="true">↑</span> {{ text }}
  </a>
</p>
```

Usage in template:
```html
{% include "components/back-to-top.njk" %}
```

### Accessibility Compliance

#### WCAG 2.2 AA Requirements

1. **Semantic HTML**
   - Proper heading hierarchy (h1 → h2 → h3)
   - Use `<fieldset>` and `<legend>` for radio groups
   - Use `<table>` with `<th>` and `<td>` for cookie tables

2. **Keyboard Navigation**
   - All form controls focusable via Tab
   - Radio buttons navigable with arrow keys
   - Submit button activatable with Enter/Space
   - Back to top link keyboard accessible

3. **Screen Reader Support**
   - Descriptive link text ("Back to Top", not "Click here")
   - ARIA labels on interactive elements
   - Accordion uses `aria-expanded` and `aria-controls`
   - Success banner uses `role="alert"`

4. **Focus Management**
   - Visible focus indicators on all interactive elements
   - Focus moves to success banner after save (optional enhancement)

5. **Color Contrast**
   - GOV.UK Design System ensures WCAG AA compliance
   - Green button meets contrast requirements

6. **Language Toggle**
   - Preserves scroll position when switching languages (via fragment)
   - Welsh content properly marked with `lang="cy"` attribute

### Testing Strategy

#### Unit Tests

```typescript
// libs/web-core/src/pages/cookies-policy/index.test.ts
describe("Cookies Policy Page", () => {
  it("should render page with content", async () => {
    const req = mockRequest();
    const res = mockResponse();

    await GET(req, res);

    expect(res.render).toHaveBeenCalledWith("cookies-policy/index", expect.objectContaining({
      en: expect.any(Object),
      cy: expect.any(Object)
    }));
  });

  it("should display success banner when saved=true", async () => {
    const req = mockRequest({ query: { saved: "true" } });
    const res = mockResponse();

    await GET(req, res);

    expect(res.render).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({
      saved: true
    }));
  });

  it("should save cookie preferences on POST", async () => {
    const req = mockRequest({
      body: { analytics: "on", performance: "off" }
    });
    const res = mockResponse();

    await POST(req, res);

    expect(res.cookie).toHaveBeenCalledWith("cookie_policy", expect.stringContaining("analytics"));
    expect(res.redirect).toHaveBeenCalledWith("/cookies-policy?saved=true");
  });
});
```

#### Template Tests

```typescript
// libs/web-core/src/pages/cookies-policy/index.njk.test.ts
describe("Cookies Policy Template", () => {
  it("should render all sections", () => {
    const html = renderTemplate("cookies-policy/index", { en, categories });

    expect(html).toContain("Cookie Policy");
    expect(html).toContain("Essential cookies");
    expect(html).toContain("Analytics cookies");
    expect(html).toContain("Performance monitoring cookies");
    expect(html).toContain("Change your cookie settings");
    expect(html).toContain("Contact us for help");
    expect(html).toContain("Back to Top");
  });

  it("should render success banner when saved", () => {
    const html = renderTemplate("cookies-policy/index", { en, saved: true });

    expect(html).toContain("Success");
    expect(html).toContain("Your cookie settings have been saved");
  });

  it("should check correct radio based on preferences", () => {
    const html = renderTemplate("cookies-policy/index", {
      en,
      cookiePreferences: { analytics: true }
    });

    expect(html).toContain('checked'); // Analytics "on" should be checked
  });
});
```

#### E2E Tests

```typescript
// e2e-tests/tests/cookie-policy.spec.ts
test.describe("Cookie Policy Page", () => {
  test("should display cookie policy page", async ({ page }) => {
    await page.goto("/cookies-policy");

    await expect(page.locator("h1")).toHaveText("Cookie Policy");
    await expect(page.locator("h2:has-text('Essential cookies')")).toBeVisible();
    await expect(page.locator("h2:has-text('Analytics cookies')")).toBeVisible();
  });

  test("should save cookie preferences from policy page", async ({ page }) => {
    await page.goto("/cookies-policy");

    await page.locator("#analytics-yes").check();
    await page.locator("#performance-no").check();
    await page.locator("button:has-text('Save')").click();

    await expect(page).toHaveURL(/\/cookies-policy\?saved=true/);
    await expect(page.locator(".govuk-notification-banner--success")).toBeVisible();
  });

  test("should display Welsh content", async ({ page }) => {
    await page.goto("/polisi-cwcis");

    await expect(page.locator("h1")).toHaveText("Polisi Cwcis");
  });

  test("should expand contact accordion", async ({ page }) => {
    await page.goto("/cookies-policy");

    await page.locator("button:has-text('Contact us for help')").click();
    await expect(page.locator("text=0300 303 0656")).toBeVisible();
  });

  test("should scroll to top when back to top clicked", async ({ page }) => {
    await page.goto("/cookies-policy");

    await page.evaluate(() => window.scrollTo(0, 1000));
    await page.locator("a:has-text('Back to Top')").click();

    const scrollY = await page.evaluate(() => window.scrollY);
    expect(scrollY).toBe(0);
  });

  test("should open in new tab from footer", async ({ page, context }) => {
    await page.goto("/");

    const [newPage] = await Promise.all([
      context.waitForEvent("page"),
      page.locator("footer a:has-text('Cookie Policy')").click()
    ]);

    await expect(newPage).toHaveURL(/\/cookies-policy/);
  });

  test("should be keyboard accessible", async ({ page }) => {
    await page.goto("/cookies-policy");

    // Tab through form elements
    await page.keyboard.press("Tab");
    // Verify focus on first radio
    await expect(page.locator("#analytics-yes")).toBeFocused();
  });
});
```

#### Accessibility Tests

```typescript
// e2e-tests/tests/cookie-policy-accessibility.spec.ts
import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.describe("Cookie Policy Accessibility", () => {
  test("should not have accessibility violations", async ({ page }) => {
    await page.goto("/cookies-policy");

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test("should have proper heading hierarchy", async ({ page }) => {
    await page.goto("/cookies-policy");

    const h1Count = await page.locator("h1").count();
    expect(h1Count).toBe(1);

    // Ensure h2 comes after h1, not before
    const firstHeading = await page.locator("h1, h2").first();
    expect(await firstHeading.textContent()).toContain("Cookie Policy");
  });

  test("should have accessible form controls", async ({ page }) => {
    await page.goto("/cookies-policy");

    // All radios should have associated labels
    const radios = page.locator("input[type='radio']");
    const radioCount = await radios.count();

    for (let i = 0; i < radioCount; i++) {
      const radio = radios.nth(i);
      const id = await radio.getAttribute("id");
      const label = page.locator(`label[for="${id}"]`);
      await expect(label).toBeVisible();
    }
  });

  test("should have accessible accordion", async ({ page }) => {
    await page.goto("/cookies-policy");

    const accordionButton = page.locator("button:has-text('Contact us for help')");
    await expect(accordionButton).toHaveAttribute("aria-expanded");
    await expect(accordionButton).toHaveAttribute("aria-controls");
  });
});
```

### Validation Requirements

Based on the specification, validation is required for the settings form:

1. **Radio Selection Required**: Both radio groups must have a selection
2. **Error Summary**: Display GOV.UK error summary if validation fails
3. **Field-level Errors**: Show error message on affected fieldset

**Implementation**:
```typescript
// libs/web-core/src/pages/cookies-policy/index.ts
export const POST = async (req: Request, res: Response) => {
  const errors: ValidationError[] = [];
  const categories = res.locals.cookieConfig?.categories || {};

  // Validate each category has a selection
  for (const category of Object.keys(categories)) {
    if (category === "essential") continue;

    if (!req.body?.[category]) {
      errors.push({
        text: `Select cookie settings for ${category}`,
        href: `#${category}-yes`
      });
    }
  }

  if (errors.length > 0) {
    const cookiePolicy = parseCookiePolicy(req.cookies?.cookie_policy);
    return res.render("cookies-policy/index", {
      en,
      cy,
      cookiePreferences: cookiePolicy,
      categories,
      errors
    });
  }

  // Save preferences...
};

interface ValidationError {
  text: string;
  href: string;
}
```

**Template**:
```html
{% if errors %}
  {{ govukErrorSummary({
    titleText: errorSummaryTitle,
    errorList: errors
  }) }}
{% endif %}

{{ govukRadios({
  name: "analytics",
  errorMessage: errors.analytics,
  ...
}) }}
```

However, the specification states:
> "User must select a radio for each cookie-category group"

Since the form pre-selects radios based on current preferences (checked attribute), validation may not be strictly necessary. Radios always have a value in HTML. We'll implement validation as defensive programming.

### Content Requirements

The specification references "the uploaded document" for cookie policy content. Since we don't have that document, we'll use placeholder content in the implementation that can be replaced with actual approved content.

**Content to be obtained**:
1. Full cookie policy text explaining each cookie category
2. Detailed cookie name, purpose, and expiry information
3. Welsh translations approved by HMCTS Welsh Translation Unit
4. Contact details confirmation (0300 303 0656, hours)

### Security Considerations

1. **CSRF Protection**
   - Include `_csrf` token in form (already configured via express-session)

2. **Cookie Security**
   - `httpOnly: false` for `cookie_policy` (needs JS access for client-side script blocking)
   - `httpOnly: true` for `cookies_preferences_set` (server-side only)
   - `secure: true` in production
   - `sameSite: "strict"` to prevent CSRF

3. **Content Security Policy**
   - Use nonce for inline scripts
   - Already configured via helmet middleware

4. **External Link Security**
   - Use `rel="noopener noreferrer"` on footer link
   - Prevents window.opener access

### Performance Considerations

1. **Page Load**
   - Cookie tables are static HTML, no database queries
   - Form state loaded from cookies (fast)
   - No external API calls

2. **Script Loading**
   - Back to top script is small (~10 lines)
   - Progressive enhancement (works without JS)
   - Already bundled with web-core assets

3. **Caching**
   - Page is mostly static, can be cached with short TTL
   - Form state varies by user (cookie_policy cookie)

### Deployment Considerations

1. **Database Changes**: None required
2. **Configuration Changes**:
   - Update `configureCookieManager` to add "performance" category
   - Update footer template to add new link
3. **Content Updates**: Replace placeholder content with approved text
4. **Rollback**: Simply remove new routes, no data migration needed

## Implementation Checklist

### Phase 1: Core Page Implementation
- [ ] Create `libs/web-core/src/pages/cookies-policy/` directory
- [ ] Implement `index.ts` controller with GET and POST handlers
- [ ] Implement `polisi-cwcis.ts` for Welsh route
- [ ] Create `en.ts` with English content (placeholder)
- [ ] Create `cy.ts` with Welsh content (placeholder)
- [ ] Create `index.njk` template with all sections

### Phase 2: Content & Components
- [ ] Create cookie information tables (essential, analytics, performance, settings)
- [ ] Implement "Change cookie settings" form section
- [ ] Add contact accordion component
- [ ] Create reusable back-to-top component partial
- [ ] Ensure back-to-top JS is initialized in main bundle

### Phase 3: Footer Integration
- [ ] Update `site-footer.njk` to add cookies-policy link
- [ ] Add `target="_blank"` and `rel="noopener noreferrer"` attributes
- [ ] Update `en.ts` and `cy.ts` locale files with footer text
- [ ] Test link opens in new tab

### Phase 4: Cookie Category Updates
- [ ] Update `apps/web/src/app.ts` configureCookieManager to add "performance" category
- [ ] Update analytics template to conditionally load Dynatrace based on preferences
- [ ] Test script loading/blocking behavior

### Phase 5: Validation & Error Handling
- [ ] Implement form validation (radio selection required)
- [ ] Add error summary component to template
- [ ] Add field-level error messages
- [ ] Test validation error display

### Phase 6: Welsh Language Support
- [ ] Complete Welsh translations (pending approval)
- [ ] Test `/polisi-cwcis` route
- [ ] Test language toggle via `?lng=cy`
- [ ] Verify scroll position preservation

### Phase 7: Testing
- [ ] Write unit tests for controller (GET/POST)
- [ ] Write template rendering tests
- [ ] Write E2E tests (display, save, accordion, back to top)
- [ ] Run accessibility tests (Axe, WAVE)
- [ ] Test keyboard navigation
- [ ] Test screen reader compatibility
- [ ] Cross-browser testing (Chrome, Firefox, Safari, Edge)
- [ ] Mobile responsive testing

### Phase 8: Content Finalization
- [ ] Obtain full cookie policy document
- [ ] Obtain Welsh translation approval
- [ ] Replace placeholder content with approved text
- [ ] Verify contact details (phone, hours)
- [ ] Update cookie tables with accurate expiry periods

### Phase 9: Documentation
- [ ] Add TSconfig build scripts for template copying
- [ ] Document cookie category system
- [ ] Document script loading logic
- [ ] Update README if needed

## Open Questions & Risks

### Questions to Resolve

1. **Cookie Preference Scope**: Do cookie preferences apply across all CaTH services or only this domain?
   - **Impact**: Determines if we need cross-domain cookie sharing
   - **Recommendation**: Keep scoped to current domain for simplicity

2. **Script Loading Strategy**: Should GA/Dynatrace use server-side gating (don't render script tags) or client-side suppression (render but disable)?
   - **Current**: Server-side gating (template conditionals)
   - **Recommendation**: Continue with server-side gating (more performant, no script download)

3. **Performance Category Separation**: Should performance monitoring (Dynatrace) be a separate toggle from analytics (GA)?
   - **Specification**: Yes, two separate radio groups
   - **Implementation**: Add "performance" as third category alongside "analytics"

4. **Footer Link Strategy**: Add separate "Cookie Policy" link or replace "Cookies" link?
   - **Recommendation**: Add separate link to maintain backward compatibility with cookie banner

5. **Validation Strictness**: Radios are pre-selected based on current preferences. Is validation still needed?
   - **Recommendation**: Implement defensive validation in case of form manipulation

### Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Welsh translation approval delayed | High | Use placeholder text, make easy to update |
| Cookie policy content not available | High | Use placeholder based on specification, structure template for easy content updates |
| Breaking existing cookie preferences page | Medium | Extensive testing of both pages, ensure separate routes |
| Dynatrace script blocking doesn't work | Medium | Test thoroughly, document configuration requirements |
| Accessibility violations | High | Run automated tests early, manual testing with assistive tech |
| Performance impact of new page | Low | Page is mostly static, minimal JS |

## Success Criteria

1. **Functional Requirements**
   - ✅ Cookie policy page accessible at `/cookies-policy` and `/polisi-cwcis`
   - ✅ All content sections render correctly (essential, analytics, performance, settings)
   - ✅ Cookie settings form saves preferences correctly
   - ✅ GA scripts load only when analytics cookies enabled
   - ✅ Dynatrace scripts load only when performance cookies enabled
   - ✅ Footer link opens policy page in new tab
   - ✅ Contact accordion expands/collapses correctly
   - ✅ Back to top scrolls to page top smoothly

2. **Accessibility Requirements**
   - ✅ WCAG 2.2 AA compliance verified with automated tools
   - ✅ Screen reader compatibility tested (JAWS, NVDA, VoiceOver)
   - ✅ Full keyboard navigation functional
   - ✅ Proper heading hierarchy (single h1, logical h2/h3)
   - ✅ All form controls properly labeled
   - ✅ Focus indicators visible and clear

3. **Language Requirements**
   - ✅ Full English content rendered
   - ✅ Full Welsh content rendered
   - ✅ Language toggle preserves page state
   - ✅ Welsh route (`/polisi-cwcis`) works correctly

4. **Testing Requirements**
   - ✅ Unit tests for controller logic
   - ✅ Template rendering tests
   - ✅ E2E tests for all user journeys
   - ✅ Accessibility tests pass with zero violations
   - ✅ Cross-browser compatibility verified
   - ✅ Mobile responsive design verified

5. **Compliance Requirements**
   - ✅ GDPR/PECR compliant cookie consent
   - ✅ Clear explanation of cookie purposes
   - ✅ User control over non-essential cookies
   - ✅ Consent recorded and persisted correctly

## Timeline Estimate

- **Phase 1-2**: 2 days (Core implementation + content)
- **Phase 3-4**: 1 day (Footer integration + cookie categories)
- **Phase 5-6**: 1 day (Validation + Welsh support)
- **Phase 7**: 2 days (Comprehensive testing)
- **Phase 8**: 1 day (Content finalization, pending approvals)
- **Phase 9**: 0.5 days (Documentation)

**Total Estimate**: 7.5 days

Note: Timeline assumes cookie policy content and Welsh translations can be obtained in parallel with technical implementation.

## References

- **Specification**: `/home/runner/work/cath-service/cath-service/docs/tickets/VIBE-241/specification.md`
- **Tasks**: `/home/runner/work/cath-service/cath-service/docs/tickets/VIBE-241/tasks.md`
- **Existing Implementation**:
  - Cookie preferences page: `libs/web-core/src/pages/cookie-preferences/`
  - Cookie manager middleware: `libs/web-core/src/middleware/cookies/`
  - Accessibility statement (reference pattern): `libs/web-core/src/pages/accessibility-statement/`
- **GOV.UK Design System**: https://design-system.service.gov.uk/
- **WCAG 2.2 Guidelines**: https://www.w3.org/WAI/WCAG22/quickref/
- **GDPR/PECR Cookie Guidance**: https://ico.org.uk/for-organisations/guide-to-pecr/cookies-and-similar-technologies/
