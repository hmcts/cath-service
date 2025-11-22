# VIBE-241: Cookie Policy Page - Task Breakdown

## Task Overview

This document provides a detailed, actionable task list for implementing the Cookie Policy page. Each task includes specific files to create/modify, code snippets, and acceptance criteria.

---

## Task 1: Extract Content from Word Document

**Priority:** HIGH
**Estimated Time:** 1 hour
**Dependencies:** None

### Description
Manually extract cookie policy content from the Word document and organize it into structured data for the TypeScript content files.

### Steps
1. Open `docs/VIBE-241/Cookie Policy.docx` in Word or compatible viewer
2. Extract all cookie information into a structured format
3. Organize content into sections:
   - Introduction
   - Essential cookies (with table data)
   - Analytics cookies (with table data)
   - Performance monitoring cookies (with table data)
   - Preference cookies (with table data)
   - Change settings call-to-action
4. Create a temporary markdown file with organized content

### Acceptance Criteria
- [ ] All content extracted from Word document
- [ ] Content organized by section
- [ ] Cookie tables include: name, purpose, expires for each cookie
- [ ] Technical accuracy verified against current implementation

### Notes
- Essential cookies to verify: `connect.sid`, `cookies_preferences_set`, `cookie_policy`, `_csrf`
- Analytics cookies to verify: `_ga`, `_gid`
- Performance cookies to verify: `dtCookie`, `dtSa`, `rxVisitor`, `rxvt`
- Preference cookies to verify: `language`

---

## Task 2: Create English Content File

**Priority:** HIGH
**Estimated Time:** 1 hour
**Dependencies:** Task 1

### Description
Create the English content file with all cookie policy text and data structures.

### Steps
1. Create file: `libs/web-core/src/pages/cookies-policy/en.ts`
2. Export content object with proper TypeScript structure
3. Include all sections from extracted content
4. Format cookie arrays with name, purpose, expires fields

### File to Create
**Path:** `libs/web-core/src/pages/cookies-policy/en.ts`

**Template Structure:**
```typescript
export const en = {
  title: "Cookies",
  intro: "A cookie is a small piece of data that's stored on your computer, tablet, or phone when you visit a website. We use cookies to make the Court and tribunal hearings service work and collect information about how you use our service.",

  essentialSection: {
    heading: "Essential cookies",
    description: "Essential cookies keep your information secure while you use the Court and tribunal hearings service. We do not need to ask permission to use them.",
    tableCaption: "Essential cookies we use",
    cookies: [
      {
        name: "connect.sid",
        purpose: "Used to keep you signed in and maintain your session",
        expires: "When you close your browser"
      },
      {
        name: "cookies_preferences_set",
        purpose: "Remembers that you've seen the cookie banner",
        expires: "1 year"
      },
      {
        name: "cookie_policy",
        purpose: "Saves your cookie consent settings",
        expires: "1 year"
      }
    ]
  },

  analyticsSection: {
    heading: "Analytics cookies (optional)",
    description: "With your permission, we use Google Analytics to collect data about how you use the Court and tribunal hearings service. This information helps us improve our service.",
    tableCaption: "Analytics cookies we use",
    controlNote: "Google Analytics will only store cookies on your device if you consent to analytics cookies.",
    cookies: [
      {
        name: "_ga",
        purpose: "Helps us count how many people visit the service by tracking if you've visited before",
        expires: "2 years"
      },
      {
        name: "_gid",
        purpose: "Helps us count how many people visit the service by tracking if you've visited before",
        expires: "24 hours"
      }
    ]
  },

  performanceSection: {
    heading: "Performance monitoring cookies (optional)",
    description: "With your permission, we use Dynatrace to monitor the performance and stability of the Court and tribunal hearings service. This helps us identify and fix technical issues.",
    tableCaption: "Performance monitoring cookies we use",
    controlNote: "Dynatrace will only store cookies on your device if you consent to performance monitoring cookies.",
    cookies: [
      {
        name: "dtCookie",
        purpose: "Tracks your session to help us identify performance issues",
        expires: "When you close your browser"
      },
      {
        name: "dtSa",
        purpose: "Tracks server actions to help us monitor response times",
        expires: "10 minutes"
      },
      {
        name: "rxVisitor",
        purpose: "Tracks visitor sessions to help us understand service usage patterns",
        expires: "1 year"
      },
      {
        name: "rxvt",
        purpose: "Tracks visit timing to help us measure page load performance",
        expires: "When you close your browser"
      }
    ]
  },

  preferencesSection: {
    heading: "Preference cookies",
    description: "We use preference cookies to remember your settings, such as your language choice (English or Welsh).",
    tableCaption: "Preference cookies we use",
    cookies: [
      {
        name: "language",
        purpose: "Remembers whether you prefer to use the service in English or Welsh",
        expires: "1 year"
      }
    ]
  },

  changeSettings: {
    heading: "Change your cookie settings",
    description: "You can change which cookies you're happy for us to use at any time.",
    linkText: "Change your cookie settings"
  }
};
```

### Acceptance Criteria
- [ ] File created at correct path
- [ ] All sections present and complete
- [ ] TypeScript exports correctly
- [ ] Cookie data matches current implementation
- [ ] No TypeScript compilation errors

### Verification
```bash
cd libs/web-core
yarn build
```

---

## Task 3: Create Welsh Content File

**Priority:** HIGH
**Estimated Time:** 1.5 hours
**Dependencies:** Task 2

### Description
Create the Welsh translation of the cookie policy content with full parity to the English version.

### Steps
1. Create file: `libs/web-core/src/pages/cookies-policy/cy.ts`
2. Translate all content from English version
3. Maintain identical structure to English version
4. Verify technical terms are appropriate
5. Ensure cookie names remain in English (they're technical identifiers)

### File to Create
**Path:** `libs/web-core/src/pages/cookies-policy/cy.ts`

**Template Structure:**
```typescript
export const cy = {
  title: "Cwcis",
  intro: "[Welsh translation of intro]",

  essentialSection: {
    heading: "[Welsh: Essential cookies]",
    description: "[Welsh translation]",
    tableCaption: "[Welsh translation]",
    cookies: [
      {
        name: "connect.sid", // Keep English - technical identifier
        purpose: "[Welsh translation of purpose]",
        expires: "[Welsh translation of time period]"
      },
      // ... more cookies
    ]
  },

  // ... other sections following same structure
};
```

### Acceptance Criteria
- [ ] File created at correct path
- [ ] All content translated to Welsh
- [ ] Structure matches English version exactly
- [ ] Cookie names kept in English
- [ ] Welsh characters (ŵ, ŷ, etc.) display correctly
- [ ] No TypeScript compilation errors

### Translation Reference
Use existing Welsh translations from:
- `libs/web-core/src/locales/cy.ts`
- `libs/web-core/src/pages/cookie-preferences/cy.ts`

### Verification
```bash
cd libs/web-core
yarn build
```

---

## Task 4: Create Nunjucks Template

**Priority:** HIGH
**Estimated Time:** 2 hours
**Dependencies:** Task 2

### Description
Create the Nunjucks template that will render the cookie policy page with proper GOV.UK styling and components.

### Steps
1. Create file: `libs/web-core/src/pages/cookies-policy/index.njk`
2. Extend base template layout
3. Override back link block (not needed for policy pages)
4. Implement table macro for cookie listings
5. Add button-styled link to preferences page
6. Ensure proper heading hierarchy

### File to Create
**Path:** `libs/web-core/src/pages/cookies-policy/index.njk`

**Complete Template:**
```njk
{% extends "layouts/base-template.njk" %}
{% from "govuk/components/table/macro.njk" import govukTable %}
{% from "govuk/components/button/macro.njk" import govukButton %}

{% block backLink %}
  {# No back link for policy pages #}
{% endblock %}

{% block page_content %}
  <h1 class="govuk-heading-xl">{{ title }}</h1>

  <p class="govuk-body">{{ intro }}</p>

  {# Essential cookies section #}
  <h2 class="govuk-heading-l">{{ essentialSection.heading }}</h2>
  <p class="govuk-body">{{ essentialSection.description }}</p>

  {{ govukTable({
    caption: essentialSection.tableCaption,
    captionClasses: "govuk-visually-hidden",
    firstCellIsHeader: false,
    head: [
      { text: "Name" },
      { text: "Purpose" },
      { text: "Expires" }
    ],
    rows: essentialSection.cookies | map(function(cookie) {
      return [
        { text: cookie.name },
        { text: cookie.purpose },
        { text: cookie.expires }
      ];
    })
  }) }}

  {# Analytics cookies section #}
  <h2 class="govuk-heading-l">{{ analyticsSection.heading }}</h2>
  <p class="govuk-body">{{ analyticsSection.description }}</p>

  {{ govukTable({
    caption: analyticsSection.tableCaption,
    captionClasses: "govuk-visually-hidden",
    firstCellIsHeader: false,
    head: [
      { text: "Name" },
      { text: "Purpose" },
      { text: "Expires" }
    ],
    rows: analyticsSection.cookies | map(function(cookie) {
      return [
        { text: cookie.name },
        { text: cookie.purpose },
        { text: cookie.expires }
      ];
    })
  }) }}

  <p class="govuk-body">{{ analyticsSection.controlNote }}</p>

  {# Performance monitoring section #}
  <h2 class="govuk-heading-l">{{ performanceSection.heading }}</h2>
  <p class="govuk-body">{{ performanceSection.description }}</p>

  {{ govukTable({
    caption: performanceSection.tableCaption,
    captionClasses: "govuk-visually-hidden",
    firstCellIsHeader: false,
    head: [
      { text: "Name" },
      { text: "Purpose" },
      { text: "Expires" }
    ],
    rows: performanceSection.cookies | map(function(cookie) {
      return [
        { text: cookie.name },
        { text: cookie.purpose },
        { text: cookie.expires }
      ];
    })
  }) }}

  <p class="govuk-body">{{ performanceSection.controlNote }}</p>

  {# Preferences section #}
  <h2 class="govuk-heading-l">{{ preferencesSection.heading }}</h2>
  <p class="govuk-body">{{ preferencesSection.description }}</p>

  {{ govukTable({
    caption: preferencesSection.tableCaption,
    captionClasses: "govuk-visually-hidden",
    firstCellIsHeader: false,
    head: [
      { text: "Name" },
      { text: "Purpose" },
      { text: "Expires" }
    ],
    rows: preferencesSection.cookies | map(function(cookie) {
      return [
        { text: cookie.name },
        { text: cookie.purpose },
        { text: cookie.expires }
      ];
    })
  }) }}

  {# Change settings section #}
  <h2 class="govuk-heading-l">{{ changeSettings.heading }}</h2>
  <p class="govuk-body">{{ changeSettings.description }}</p>

  <p class="govuk-body">
    <a href="/cookie-preferences" class="govuk-button" data-module="govuk-button">
      {{ changeSettings.linkText }}
    </a>
  </p>
{% endblock %}
```

### Acceptance Criteria
- [ ] File created at correct path
- [ ] Extends base template correctly
- [ ] No back link rendered
- [ ] All sections render with proper headings
- [ ] Tables use GOV.UK table component
- [ ] Button styled link to preferences page
- [ ] Proper heading hierarchy (h1 → h2)
- [ ] Responsive design works on mobile

### Testing
Test template rendering locally:
```bash
yarn dev
# Visit http://localhost:3000/cookies-policy
```

---

## Task 5: Create Main Controller

**Priority:** HIGH
**Estimated Time:** 30 minutes
**Dependencies:** Task 2, Task 3, Task 4

### Description
Create the Express controller that handles GET requests to the cookie policy page.

### Steps
1. Create file: `libs/web-core/src/pages/cookies-policy/index.ts`
2. Import English and Welsh content
3. Export GET handler that renders template
4. Ensure types are correct

### File to Create
**Path:** `libs/web-core/src/pages/cookies-policy/index.ts`

**Complete Code:**
```typescript
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

### Acceptance Criteria
- [ ] File created at correct path
- [ ] Imports have `.js` extensions (ESM requirement)
- [ ] GET handler exported correctly
- [ ] No TypeScript compilation errors
- [ ] No linting errors

### Verification
```bash
cd libs/web-core
yarn lint
yarn build
```

---

## Task 6: Create Welsh Redirect Route

**Priority:** MEDIUM
**Estimated Time:** 15 minutes
**Dependencies:** Task 5

### Description
Create a redirect route for the Welsh URL `/polisi-cwcis` that redirects to the main cookie policy page with Welsh language parameter.

### Steps
1. Create directory: `libs/web-core/src/pages/polisi-cwcis/`
2. Create file: `libs/web-core/src/pages/polisi-cwcis/index.ts`
3. Export GET handler with redirect

### File to Create
**Path:** `libs/web-core/src/pages/polisi-cwcis/index.ts`

**Complete Code:**
```typescript
import type { Request, Response } from "express";

export const GET = async (_req: Request, res: Response) => {
  res.redirect("/cookies-policy?lng=cy");
};
```

### Acceptance Criteria
- [ ] File created at correct path
- [ ] 302 redirect (default) to `/cookies-policy?lng=cy`
- [ ] No TypeScript compilation errors
- [ ] No linting errors

### Verification
```bash
cd libs/web-core
yarn lint
yarn build
```

Test redirect:
```bash
curl -I http://localhost:3000/polisi-cwcis
# Should show Location: /cookies-policy?lng=cy
```

---

## Task 7: Update Footer Component

**Priority:** HIGH
**Estimated Time:** 15 minutes
**Dependencies:** Task 5

### Description
Update the footer component to link to the new cookie policy page instead of cookie preferences.

### Steps
1. Open file: `libs/web-core/src/views/components/site-footer.njk`
2. Locate the cookies link (line 16-18)
3. Change href from `/cookie-preferences` to `/cookies-policy`
4. Keep all other properties unchanged

### File to Modify
**Path:** `libs/web-core/src/views/components/site-footer.njk`

**Change:**
```njk
# BEFORE (line 16-18):
{
  href: "/cookie-preferences",
  text: footer.cookies
},

# AFTER (line 16-18):
{
  href: "/cookies-policy",
  text: footer.cookies
},
```

### Acceptance Criteria
- [ ] href changed to `/cookies-policy`
- [ ] Text remains `footer.cookies` (bilingual)
- [ ] No syntax errors
- [ ] Footer renders correctly on all pages

### Verification
Start dev server and check footer on multiple pages:
```bash
yarn dev
# Check footer on: /, /search, /cookie-preferences, /accessibility-statement
```

---

## Task 8: Create Controller Unit Tests

**Priority:** HIGH
**Estimated Time:** 1 hour
**Dependencies:** Task 5, Task 6

### Description
Create comprehensive unit tests for the cookie policy controller and Welsh redirect.

### Steps
1. Create test file for main controller
2. Create test file for Welsh redirect
3. Test that templates render with correct data
4. Test that all content sections are present

### File to Create #1
**Path:** `libs/web-core/src/pages/cookies-policy/index.test.ts`

**Complete Test Suite:**
```typescript
import { describe, it, expect, vi } from "vitest";
import { GET } from "./index.js";
import type { Request, Response } from "express";

describe("Cookie Policy Page", () => {
  it("should render cookies-policy template with bilingual content", async () => {
    const req = {} as Request;
    const res = {
      render: vi.fn()
    } as unknown as Response;

    await GET(req, res);

    expect(res.render).toHaveBeenCalledWith(
      "cookies-policy/index",
      expect.objectContaining({
        en: expect.any(Object),
        cy: expect.any(Object)
      })
    );
  });

  it("should include all required content sections in English", async () => {
    const req = {} as Request;
    const res = {
      render: vi.fn()
    } as unknown as Response;

    await GET(req, res);

    const renderArgs = (res.render as ReturnType<typeof vi.fn>).mock.calls[0][1];

    expect(renderArgs.en).toHaveProperty("title");
    expect(renderArgs.en).toHaveProperty("intro");
    expect(renderArgs.en).toHaveProperty("essentialSection");
    expect(renderArgs.en).toHaveProperty("analyticsSection");
    expect(renderArgs.en).toHaveProperty("performanceSection");
    expect(renderArgs.en).toHaveProperty("preferencesSection");
    expect(renderArgs.en).toHaveProperty("changeSettings");
  });

  it("should include all required content sections in Welsh", async () => {
    const req = {} as Request;
    const res = {
      render: vi.fn()
    } as unknown as Response;

    await GET(req, res);

    const renderArgs = (res.render as ReturnType<typeof vi.fn>).mock.calls[0][1];

    expect(renderArgs.cy).toHaveProperty("title");
    expect(renderArgs.cy).toHaveProperty("intro");
    expect(renderArgs.cy).toHaveProperty("essentialSection");
    expect(renderArgs.cy).toHaveProperty("analyticsSection");
    expect(renderArgs.cy).toHaveProperty("performanceSection");
    expect(renderArgs.cy).toHaveProperty("preferencesSection");
    expect(renderArgs.cy).toHaveProperty("changeSettings");
  });
});
```

### File to Create #2
**Path:** `libs/web-core/src/pages/polisi-cwcis/index.test.ts`

**Complete Test Suite:**
```typescript
import { describe, it, expect, vi } from "vitest";
import { GET } from "./index.js";
import type { Request, Response } from "express";

describe("Welsh Cookie Policy Redirect", () => {
  it("should redirect to cookies-policy with Welsh language parameter", async () => {
    const req = {} as Request;
    const res = {
      redirect: vi.fn()
    } as unknown as Response;

    await GET(req, res);

    expect(res.redirect).toHaveBeenCalledWith("/cookies-policy?lng=cy");
  });

  it("should call redirect exactly once", async () => {
    const req = {} as Request;
    const res = {
      redirect: vi.fn()
    } as unknown as Response;

    await GET(req, res);

    expect(res.redirect).toHaveBeenCalledTimes(1);
  });
});
```

### Acceptance Criteria
- [ ] Both test files created
- [ ] All tests pass
- [ ] Tests cover rendering behavior
- [ ] Tests cover content structure
- [ ] Tests cover redirect behavior

### Verification
```bash
cd libs/web-core
yarn test src/pages/cookies-policy
yarn test src/pages/polisi-cwcis
```

---

## Task 9: Create Content Structure Tests

**Priority:** MEDIUM
**Estimated Time:** 1 hour
**Dependencies:** Task 2, Task 3

### Description
Create tests to verify the structure and completeness of the English and Welsh content objects.

### Steps
1. Create test for English content structure
2. Create test for Welsh content structure
3. Verify all cookie arrays have required fields
4. Verify specific cookies are documented

### File to Create #1
**Path:** `libs/web-core/src/pages/cookies-policy/en.test.ts`

**Complete Test Suite:**
```typescript
import { describe, it, expect } from "vitest";
import { en } from "./en.js";

describe("Cookie Policy English Content", () => {
  it("should have all required top-level properties", () => {
    expect(en).toHaveProperty("title");
    expect(en).toHaveProperty("intro");
    expect(en).toHaveProperty("essentialSection");
    expect(en).toHaveProperty("analyticsSection");
    expect(en).toHaveProperty("performanceSection");
    expect(en).toHaveProperty("preferencesSection");
    expect(en).toHaveProperty("changeSettings");
  });

  it("should have properly structured section objects", () => {
    const sections = [
      en.essentialSection,
      en.analyticsSection,
      en.performanceSection,
      en.preferencesSection
    ];

    sections.forEach(section => {
      expect(section).toHaveProperty("heading");
      expect(section).toHaveProperty("description");
      expect(section).toHaveProperty("tableCaption");
      expect(section).toHaveProperty("cookies");
      expect(Array.isArray(section.cookies)).toBe(true);
    });
  });

  it("should have cookie arrays with required fields", () => {
    const sections = [
      en.essentialSection,
      en.analyticsSection,
      en.performanceSection,
      en.preferencesSection
    ];

    sections.forEach(section => {
      expect(section.cookies.length).toBeGreaterThan(0);
      section.cookies.forEach(cookie => {
        expect(cookie).toHaveProperty("name");
        expect(cookie).toHaveProperty("purpose");
        expect(cookie).toHaveProperty("expires");
        expect(typeof cookie.name).toBe("string");
        expect(typeof cookie.purpose).toBe("string");
        expect(typeof cookie.expires).toBe("string");
      });
    });
  });

  it("should document all essential cookies", () => {
    const cookieNames = en.essentialSection.cookies.map(c => c.name);
    expect(cookieNames).toContain("connect.sid");
    expect(cookieNames).toContain("cookies_preferences_set");
    expect(cookieNames).toContain("cookie_policy");
  });

  it("should document all analytics cookies", () => {
    const cookieNames = en.analyticsSection.cookies.map(c => c.name);
    expect(cookieNames).toContain("_ga");
    expect(cookieNames).toContain("_gid");
  });

  it("should document all performance monitoring cookies", () => {
    const cookieNames = en.performanceSection.cookies.map(c => c.name);
    expect(cookieNames).toContain("dtCookie");
    expect(cookieNames).toContain("dtSa");
    expect(cookieNames).toContain("rxVisitor");
    expect(cookieNames).toContain("rxvt");
  });

  it("should document preference cookies", () => {
    const cookieNames = en.preferencesSection.cookies.map(c => c.name);
    expect(cookieNames).toContain("language");
  });

  it("should have change settings section with required fields", () => {
    expect(en.changeSettings).toHaveProperty("heading");
    expect(en.changeSettings).toHaveProperty("description");
    expect(en.changeSettings).toHaveProperty("linkText");
  });

  it("should have non-empty string values", () => {
    expect(en.title.length).toBeGreaterThan(0);
    expect(en.intro.length).toBeGreaterThan(0);
    expect(en.essentialSection.heading.length).toBeGreaterThan(0);
  });
});
```

### File to Create #2
**Path:** `libs/web-core/src/pages/cookies-policy/cy.test.ts`

**Complete Test Suite:**
```typescript
import { describe, it, expect } from "vitest";
import { cy } from "./cy.js";
import { en } from "./en.js";

describe("Cookie Policy Welsh Content", () => {
  it("should have all required top-level properties", () => {
    expect(cy).toHaveProperty("title");
    expect(cy).toHaveProperty("intro");
    expect(cy).toHaveProperty("essentialSection");
    expect(cy).toHaveProperty("analyticsSection");
    expect(cy).toHaveProperty("performanceSection");
    expect(cy).toHaveProperty("preferencesSection");
    expect(cy).toHaveProperty("changeSettings");
  });

  it("should have same structure as English version", () => {
    const sections = [
      "essentialSection",
      "analyticsSection",
      "performanceSection",
      "preferencesSection"
    ] as const;

    sections.forEach(sectionKey => {
      expect(cy[sectionKey]).toHaveProperty("heading");
      expect(cy[sectionKey]).toHaveProperty("description");
      expect(cy[sectionKey]).toHaveProperty("tableCaption");
      expect(cy[sectionKey]).toHaveProperty("cookies");
    });
  });

  it("should have same number of cookies as English version", () => {
    expect(cy.essentialSection.cookies.length).toBe(en.essentialSection.cookies.length);
    expect(cy.analyticsSection.cookies.length).toBe(en.analyticsSection.cookies.length);
    expect(cy.performanceSection.cookies.length).toBe(en.performanceSection.cookies.length);
    expect(cy.preferencesSection.cookies.length).toBe(en.preferencesSection.cookies.length);
  });

  it("should have same cookie names as English version", () => {
    const sections = [
      "essentialSection",
      "analyticsSection",
      "performanceSection",
      "preferencesSection"
    ] as const;

    sections.forEach(sectionKey => {
      const enNames = en[sectionKey].cookies.map(c => c.name).sort();
      const cyNames = cy[sectionKey].cookies.map(c => c.name).sort();
      expect(cyNames).toEqual(enNames);
    });
  });

  it("should have non-empty Welsh translations", () => {
    expect(cy.title.length).toBeGreaterThan(0);
    expect(cy.intro.length).toBeGreaterThan(0);
    expect(cy.essentialSection.heading.length).toBeGreaterThan(0);

    // Check that Welsh content is different from English
    expect(cy.title).not.toBe(en.title);
    expect(cy.intro).not.toBe(en.intro);
  });
});
```

### Acceptance Criteria
- [ ] Both test files created
- [ ] All tests pass
- [ ] Content structure validated
- [ ] Cookie completeness verified
- [ ] Welsh/English parity verified

### Verification
```bash
cd libs/web-core
yarn test src/pages/cookies-policy/en.test.ts
yarn test src/pages/cookies-policy/cy.test.ts
```

---

## Task 10: Create E2E Tests

**Priority:** HIGH
**Estimated Time:** 2 hours
**Dependencies:** Task 5, Task 6, Task 7

### Description
Create comprehensive end-to-end tests covering all user journeys related to the cookie policy page.

### Steps
1. Create E2E test file
2. Test English page loading
3. Test Welsh language support
4. Test navigation from footer
5. Test link to preferences page
6. Test without JavaScript
7. Test keyboard navigation

### File to Create
**Path:** `e2e-tests/tests/cookie-policy.spec.ts`

**Complete Test Suite:**
```typescript
import { test, expect } from "@playwright/test";

test.describe("Cookie Policy Page", () => {
  test("should load cookie policy page at /cookies-policy", async ({ page }) => {
    await page.goto("/cookies-policy");

    await expect(page).toHaveTitle(/Cookies/);
    await expect(page.locator("h1")).toContainText("Cookies");
  });

  test("should display all cookie sections", async ({ page }) => {
    await page.goto("/cookies-policy");

    await expect(page.locator("h2").filter({ hasText: "Essential cookies" })).toBeVisible();
    await expect(page.locator("h2").filter({ hasText: /Analytics cookies/ })).toBeVisible();
    await expect(page.locator("h2").filter({ hasText: /Performance monitoring/ })).toBeVisible();
    await expect(page.locator("h2").filter({ hasText: /[Pp]reference cookies/ })).toBeVisible();
    await expect(page.locator("h2").filter({ hasText: "Change your cookie settings" })).toBeVisible();
  });

  test("should display cookie tables with data", async ({ page }) => {
    await page.goto("/cookies-policy");

    const tables = page.locator(".govuk-table");
    const tableCount = await tables.count();
    expect(tableCount).toBeGreaterThanOrEqual(4);

    // Check first table (essential cookies) has content
    const firstTable = tables.first();
    const rowCount = await firstTable.locator("tbody tr").count();
    expect(rowCount).toBeGreaterThan(0);

    // Check table headers
    await expect(firstTable.locator("th").first()).toContainText("Name");
  });

  test("should have link to cookie preferences page", async ({ page }) => {
    await page.goto("/cookies-policy");

    const link = page.locator('a.govuk-button[href="/cookie-preferences"]');
    await expect(link).toBeVisible();
    await expect(link).toContainText(/Change.*cookie settings/i);
  });

  test("should navigate to cookie preferences when link clicked", async ({ page }) => {
    await page.goto("/cookies-policy");

    await page.click('a.govuk-button[href="/cookie-preferences"]');
    await expect(page).toHaveURL("/cookie-preferences");
    await expect(page.locator("h1")).toContainText(/Cookie preferences/i);
  });

  test("should be accessible from footer", async ({ page }) => {
    await page.goto("/");

    const footerLink = page.locator("footer a").filter({ hasText: "Cookies" });
    await expect(footerLink).toBeVisible();
    await expect(footerLink).toHaveAttribute("href", "/cookies-policy");

    await footerLink.click();
    await expect(page).toHaveURL("/cookies-policy");
    await expect(page.locator("h1")).toContainText("Cookies");
  });

  test("should be accessible from footer on various pages", async ({ page }) => {
    const pages = ["/", "/search", "/accessibility-statement"];

    for (const pagePath of pages) {
      await page.goto(pagePath);

      const footerLink = page.locator("footer a").filter({ hasText: "Cookies" });
      await expect(footerLink).toBeVisible();
      await expect(footerLink).toHaveAttribute("href", "/cookies-policy");
    }
  });

  test("should work without JavaScript", async ({ page, context }) => {
    await context.setJavaScriptEnabled(false);
    await page.goto("/cookies-policy");

    await expect(page.locator("h1")).toContainText("Cookies");
    const tables = page.locator(".govuk-table");
    const tableCount = await tables.count();
    expect(tableCount).toBeGreaterThanOrEqual(4);

    // Check link still works
    const link = page.locator('a.govuk-button[href="/cookie-preferences"]');
    await expect(link).toBeVisible();
  });

  test("should support keyboard navigation", async ({ page }) => {
    await page.goto("/cookies-policy");

    // Tab through interactive elements
    let found = false;
    for (let i = 0; i < 20; i++) {
      await page.keyboard.press("Tab");

      const focused = await page.locator(":focus");
      const text = await focused.textContent();

      if (text?.includes("Change your cookie settings")) {
        found = true;
        // Press Enter to navigate
        await page.keyboard.press("Enter");
        await expect(page).toHaveURL("/cookie-preferences");
        break;
      }
    }

    expect(found).toBe(true);
  });

  test("should have no back link", async ({ page }) => {
    await page.goto("/cookies-policy");

    const backLink = page.locator(".govuk-back-link");
    await expect(backLink).not.toBeVisible();
  });
});

test.describe("Cookie Policy - Welsh Language", () => {
  test("should redirect Welsh URL to cookie policy with language parameter", async ({ page }) => {
    await page.goto("/polisi-cwcis");

    await expect(page).toHaveURL(/cookies-policy\?lng=cy/);
    await expect(page.locator("h1")).toContainText("Cwcis");
  });

  test("should display Welsh content when language parameter set", async ({ page }) => {
    await page.goto("/cookies-policy?lng=cy");

    await expect(page.locator("h1")).toContainText("Cwcis");

    // Check that we have Welsh content (look for section headings)
    const headings = page.locator("h2");
    const firstHeadingText = await headings.first().textContent();

    // Welsh content should be different from English
    expect(firstHeadingText).not.toContain("Essential cookies");
  });

  test("should be accessible from footer in Welsh", async ({ page }) => {
    await page.goto("/?lng=cy");

    const footerLink = page.locator("footer a").filter({ hasText: "Cwcis" });
    await expect(footerLink).toBeVisible();

    await footerLink.click();
    await expect(page).toHaveURL(/cookies-policy/);
    await expect(page.locator("h1")).toContainText("Cwcis");
  });

  test("should maintain language when navigating to preferences", async ({ page }) => {
    await page.goto("/cookies-policy?lng=cy");

    const link = page.locator('a.govuk-button[href="/cookie-preferences"]');
    await link.click();

    await expect(page).toHaveURL(/cookie-preferences.*lng=cy/);
  });

  test("should have same cookie names in both languages", async ({ page }) => {
    // Get English cookie names
    await page.goto("/cookies-policy");
    const enTableCells = await page.locator(".govuk-table tbody tr td:first-child").allTextContents();
    const enCookieNames = enTableCells.map(t => t.trim());

    // Get Welsh cookie names
    await page.goto("/cookies-policy?lng=cy");
    const cyTableCells = await page.locator(".govuk-table tbody tr td:first-child").allTextContents();
    const cyMookieNames = cyTableCells.map(t => t.trim());

    // Cookie names should be identical (technical identifiers)
    expect(cyMookieNames).toEqual(enCookieNames);
  });
});

test.describe("Cookie Policy - Integration", () => {
  test("should maintain existing cookie preferences functionality", async ({ page }) => {
    // Go to preferences page directly
    await page.goto("/cookie-preferences");
    await expect(page.locator("h1")).toContainText(/Cookie preferences/i);

    // Set preferences
    await page.click('input[name="analytics"][value="on"]');
    await page.click('button[type="submit"]');

    // Should show success message
    await expect(page.locator(".govuk-notification-banner--success")).toBeVisible();

    // Navigate to cookie policy
    await page.goto("/cookies-policy");
    await expect(page.locator("h1")).toContainText("Cookies");
  });

  test("should not affect other footer links", async ({ page }) => {
    await page.goto("/");

    const accessibilityLink = page.locator("footer a").filter({ hasText: "Accessibility statement" });
    await expect(accessibilityLink).toBeVisible();
    await expect(accessibilityLink).toHaveAttribute("href", "/accessibility-statement");

    await accessibilityLink.click();
    await expect(page).toHaveURL("/accessibility-statement");
  });
});
```

### Acceptance Criteria
- [ ] Test file created
- [ ] All tests pass
- [ ] Coverage of key user journeys
- [ ] Welsh language support tested
- [ ] Footer integration tested
- [ ] No JavaScript functionality tested
- [ ] Keyboard navigation tested

### Verification
```bash
yarn test:e2e cookie-policy
```

---

## Task 11: Create Accessibility Tests

**Priority:** HIGH
**Estimated Time:** 1.5 hours
**Dependencies:** Task 10

### Description
Create automated accessibility tests using Axe-core to ensure WCAG 2.2 AA compliance.

### Steps
1. Add accessibility tests to E2E suite
2. Test automated accessibility checks
3. Test heading hierarchy
4. Test table structure
5. Test link text quality
6. Test color contrast

### File to Modify
**Path:** `e2e-tests/tests/cookie-policy.spec.ts`

**Add to existing file:**
```typescript
import AxeBuilder from "@axe-core/playwright";

test.describe("Cookie Policy - Accessibility", () => {
  test("should pass axe accessibility tests", async ({ page }) => {
    await page.goto("/cookies-policy");

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .analyze();

    expect(results.violations).toEqual([]);
  });

  test("should have proper heading hierarchy", async ({ page }) => {
    await page.goto("/cookies-policy");

    // Check h1 exists and is unique
    const h1s = page.locator("h1");
    await expect(h1s).toHaveCount(1);

    // Check h2s exist
    const h2s = page.locator("h2");
    const h2Count = await h2s.count();
    expect(h2Count).toBeGreaterThanOrEqual(4);

    // Check no h3 without h2, no h4 without h3, etc.
    const h3s = page.locator("h3");
    const h3Count = await h3s.count();

    // If h3s exist, verify they come after h2s
    if (h3Count > 0) {
      const h2First = await h2s.first().boundingBox();
      const h3First = await h3s.first().boundingBox();

      if (h2First && h3First) {
        expect(h3First.y).toBeGreaterThan(h2First.y);
      }
    }
  });

  test("should have accessible table structure", async ({ page }) => {
    await page.goto("/cookies-policy");

    const tables = page.locator(".govuk-table");
    const firstTable = tables.first();

    // Check for thead
    await expect(firstTable.locator("thead")).toBeVisible();

    // Check for th elements
    const headers = firstTable.locator("thead th");
    const headerCount = await headers.count();
    expect(headerCount).toBeGreaterThanOrEqual(3);

    // Check th elements have scope attribute
    const firstHeader = headers.first();
    const scope = await firstHeader.getAttribute("scope");
    expect(scope).toBe("col");

    // Check tbody exists with rows
    await expect(firstTable.locator("tbody")).toBeVisible();
    const rows = firstTable.locator("tbody tr");
    const rowCount = await rows.count();
    expect(rowCount).toBeGreaterThan(0);
  });

  test("should have descriptive link text", async ({ page }) => {
    await page.goto("/cookies-policy");

    // Get all links
    const links = page.locator("a");
    const count = await links.count();

    for (let i = 0; i < count; i++) {
      const link = links.nth(i);
      const text = await link.textContent();
      const trimmedText = text?.trim().toLowerCase() || "";

      // No "click here" or vague link text
      expect(trimmedText).not.toBe("click here");
      expect(trimmedText).not.toBe("here");
      expect(trimmedText).not.toBe("more");
      expect(trimmedText).not.toBe("read more");

      // Links should have meaningful text
      if (trimmedText.length > 0) {
        expect(trimmedText.length).toBeGreaterThan(2);
      }
    }
  });

  test("should have sufficient color contrast", async ({ page }) => {
    await page.goto("/cookies-policy");

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2aa"])
      .analyze();

    const contrastViolations = results.violations.filter(
      v => v.id === "color-contrast"
    );
    expect(contrastViolations).toHaveLength(0);
  });

  test("should be zoomable to 200%", async ({ page }) => {
    await page.goto("/cookies-policy");

    // Set viewport to simulate zoom
    await page.setViewportSize({ width: 640, height: 480 });

    // Content should still be visible and not overflow
    await expect(page.locator("h1")).toBeVisible();
    await expect(page.locator(".govuk-table").first()).toBeVisible();
  });

  test("should have language attribute", async ({ page }) => {
    await page.goto("/cookies-policy");

    const html = page.locator("html");
    const lang = await html.getAttribute("lang");
    expect(lang).toBeTruthy();
    expect(lang).toMatch(/^en/);
  });

  test("should have Welsh language attribute when in Welsh", async ({ page }) => {
    await page.goto("/cookies-policy?lng=cy");

    const html = page.locator("html");
    const lang = await html.getAttribute("lang");
    expect(lang).toBeTruthy();
    expect(lang).toMatch(/^cy/);
  });

  test("should have page title", async ({ page }) => {
    await page.goto("/cookies-policy");

    const title = await page.title();
    expect(title).toBeTruthy();
    expect(title.length).toBeGreaterThan(0);
    expect(title).toContain("Cookies");
  });

  test("should not have empty table cells", async ({ page }) => {
    await page.goto("/cookies-policy");

    const tables = page.locator(".govuk-table");
    const tableCount = await tables.count();

    for (let i = 0; i < tableCount; i++) {
      const table = tables.nth(i);
      const cells = table.locator("tbody td");
      const cellCount = await cells.count();

      for (let j = 0; j < cellCount; j++) {
        const cell = cells.nth(j);
        const text = await cell.textContent();
        const trimmedText = text?.trim() || "";

        // Cells should not be empty
        expect(trimmedText.length).toBeGreaterThan(0);
      }
    }
  });
});
```

### Acceptance Criteria
- [ ] Accessibility tests added to E2E suite
- [ ] All axe-core tests pass
- [ ] Heading hierarchy verified
- [ ] Table structure verified
- [ ] Link text quality verified
- [ ] Color contrast verified
- [ ] No WCAG 2.2 AA violations

### Verification
```bash
yarn test:e2e cookie-policy --grep "Accessibility"
```

---

## Task 12: Manual Testing

**Priority:** HIGH
**Estimated Time:** 1 hour
**Dependencies:** All previous tasks

### Description
Perform manual testing to verify functionality that automated tests may not cover.

### Testing Checklist

#### Functional Testing
- [ ] Navigate to `/cookies-policy` - page loads
- [ ] Navigate to `/polisi-cwcis` - redirects to Welsh version
- [ ] Click "Cookies" link in footer - navigates to policy page
- [ ] Click "Change your cookie settings" button - navigates to preferences
- [ ] Switch language to Welsh - content updates
- [ ] Switch language back to English - content updates
- [ ] View page on mobile device - responsive layout works
- [ ] Test on different browsers (Chrome, Firefox, Safari, Edge)

#### Content Verification
- [ ] All cookie sections present and complete
- [ ] Cookie tables display all data
- [ ] English content accurate and clear
- [ ] Welsh content accurate and clear
- [ ] No spelling or grammar errors
- [ ] Technical information matches implementation

#### Accessibility Testing
- [ ] Tab through page with keyboard - all elements reachable
- [ ] Focus indicators visible
- [ ] No keyboard traps
- [ ] Screen reader announces content correctly (test with NVDA/VoiceOver)
- [ ] Headings navigable with screen reader
- [ ] Tables announced with correct structure
- [ ] Page works at 200% zoom
- [ ] High contrast mode - content visible

#### Visual Testing
- [ ] GOV.UK styling applied correctly
- [ ] Typography consistent with design system
- [ ] Spacing and layout follows GOV.UK patterns
- [ ] Tables formatted correctly
- [ ] Button styled link looks correct
- [ ] No layout issues on mobile
- [ ] No horizontal scroll on small screens

#### Integration Testing
- [ ] Cookie preferences page still works
- [ ] Cookie banner still works
- [ ] Analytics still load conditionally
- [ ] Dynatrace still loads conditionally
- [ ] Other footer links still work
- [ ] No console errors

### Browser Testing Matrix

Test on:
- [ ] Chrome (latest) - Windows
- [ ] Chrome (latest) - macOS
- [ ] Firefox (latest) - Windows
- [ ] Firefox (latest) - macOS
- [ ] Safari (latest) - macOS
- [ ] Safari - iOS
- [ ] Edge (latest) - Windows
- [ ] Chrome - Android

### Acceptance Criteria
- [ ] All functional tests pass
- [ ] All content verification complete
- [ ] All accessibility tests pass
- [ ] All visual tests pass
- [ ] All integration tests pass
- [ ] All browsers tested

---

## Task 13: Code Review and Documentation

**Priority:** MEDIUM
**Estimated Time:** 1 hour
**Dependencies:** All previous tasks

### Description
Prepare the code for review and ensure all quality checks pass.

### Steps

#### 1. Run All Quality Checks
```bash
# From repo root
cd libs/web-core

# Lint check
yarn lint

# Fix linting issues
yarn lint:fix

# Format code
yarn format

# Run tests
yarn test

# Build
yarn build
```

#### 2. Verify Build Output
```bash
# Check dist folder has all files
ls -la dist/pages/cookies-policy/
ls -la dist/pages/polisi-cwcis/

# Should include:
# - index.js (controller)
# - index.njk (template)
# - en.js (English content)
# - cy.js (Welsh content)
```

#### 3. Run E2E Tests
```bash
# From repo root
yarn test:e2e cookie-policy
```

#### 4. Create PR Description

**Template:**
```markdown
# VIBE-241: Cookie Policy Page

## Summary
Adds a dedicated Cookie Policy page for the CaTH service that provides comprehensive information about cookie usage. Users can access this page from the footer on any page.

## Changes
- Created new cookie policy page at `/cookies-policy`
- Added Welsh redirect route at `/polisi-cwcis`
- Updated footer to link to cookie policy instead of preferences
- Full bilingual support (English and Welsh)
- WCAG 2.2 AA compliant
- Comprehensive test coverage

## Files Changed
### New Files
- `libs/web-core/src/pages/cookies-policy/index.ts` - Controller
- `libs/web-core/src/pages/cookies-policy/index.njk` - Template
- `libs/web-core/src/pages/cookies-policy/en.ts` - English content
- `libs/web-core/src/pages/cookies-policy/cy.ts` - Welsh content
- `libs/web-core/src/pages/cookies-policy/index.test.ts` - Controller tests
- `libs/web-core/src/pages/cookies-policy/en.test.ts` - Content tests
- `libs/web-core/src/pages/cookies-policy/cy.test.ts` - Content tests
- `libs/web-core/src/pages/polisi-cwcis/index.ts` - Welsh redirect
- `libs/web-core/src/pages/polisi-cwcis/index.test.ts` - Redirect tests
- `e2e-tests/tests/cookie-policy.spec.ts` - E2E and accessibility tests

### Modified Files
- `libs/web-core/src/views/components/site-footer.njk` - Updated cookies link

## Testing
- ✅ Unit tests: 15 tests passing
- ✅ E2E tests: 25 tests passing
- ✅ Accessibility tests: 10 tests passing
- ✅ Manual testing complete
- ✅ Browser compatibility verified

## Screenshots
[Add screenshots of English and Welsh versions]

## Accessibility
- ✅ WCAG 2.2 AA compliant
- ✅ Axe-core tests passing
- ✅ Keyboard navigation functional
- ✅ Screen reader compatible
- ✅ Proper heading hierarchy
- ✅ Accessible table structure

## Checklist
- [ ] Code follows CLAUDE.md guidelines
- [ ] All tests passing
- [ ] No TypeScript errors
- [ ] No linting warnings
- [ ] Accessibility verified
- [ ] Browser testing complete
- [ ] Documentation updated (if needed)
- [ ] Ready for review

## Related
- Ticket: VIBE-241
- Specification: docs/VIBE-241/specification.md
- Plan: docs/VIBE-241/plan.md
```

#### 5. Final Verification

Complete the checklist:
```markdown
# Pre-Submit Checklist

## Code Quality
- [ ] No TypeScript errors: `yarn build`
- [ ] No linting errors: `yarn lint`
- [ ] Code formatted: `yarn format`
- [ ] All imports have .js extensions
- [ ] No console.log statements
- [ ] No commented-out code

## Testing
- [ ] All unit tests pass: `yarn test`
- [ ] All E2E tests pass: `yarn test:e2e`
- [ ] Test coverage adequate
- [ ] Manual testing complete

## Functionality
- [ ] Page loads at /cookies-policy
- [ ] Welsh redirect works at /polisi-cwcis
- [ ] Footer link works
- [ ] Link to preferences works
- [ ] Language switching works

## Accessibility
- [ ] Axe-core tests pass
- [ ] Keyboard navigation works
- [ ] Screen reader tested
- [ ] Heading hierarchy correct
- [ ] Tables properly structured

## Documentation
- [ ] PR description complete
- [ ] Screenshots added
- [ ] Acceptance criteria met
- [ ] No breaking changes
```

### Acceptance Criteria
- [ ] All quality checks pass
- [ ] PR description complete
- [ ] Pre-submit checklist verified
- [ ] Ready for code review

---

## Task 14: Create and Submit Pull Request

**Priority:** HIGH
**Estimated Time:** 30 minutes
**Dependencies:** Task 13

### Description
Create a pull request with all changes and request code review.

### Steps

#### 1. Commit Changes
```bash
git add .
git status  # Verify files

git commit -m "feat(web-core): add cookie policy page

- Add dedicated cookie policy page at /cookies-policy
- Add Welsh redirect route at /polisi-cwcis
- Update footer to link to cookie policy
- Full bilingual support (English/Welsh)
- WCAG 2.2 AA compliant
- Comprehensive test coverage

VIBE-241"
```

#### 2. Push Branch
```bash
git push origin feature/VIBE-241-cookie-policy
```

#### 3. Create Pull Request
- Go to GitHub repository
- Click "New Pull Request"
- Select your branch
- Fill in PR description from Task 13
- Add screenshots
- Add labels: `enhancement`, `accessibility`, `web-core`
- Request reviewers

#### 4. Add Screenshots

Take screenshots of:
1. English cookie policy page (full page)
2. Welsh cookie policy page (full page)
3. Footer with cookies link (zoomed in)
4. Change settings button (zoomed in)
5. Cookie table (zoomed in)
6. Mobile view

### Acceptance Criteria
- [ ] Changes committed with descriptive message
- [ ] Branch pushed to remote
- [ ] PR created with full description
- [ ] Screenshots added
- [ ] Reviewers requested
- [ ] CI/CD pipeline passes

---

## Summary

### Total Tasks: 14

### Estimated Time Breakdown
| Task | Time | Type |
|------|------|------|
| 1. Extract Content | 1h | Content |
| 2. English Content | 1h | Development |
| 3. Welsh Content | 1.5h | Development |
| 4. Nunjucks Template | 2h | Development |
| 5. Main Controller | 0.5h | Development |
| 6. Welsh Redirect | 0.25h | Development |
| 7. Footer Update | 0.25h | Development |
| 8. Controller Tests | 1h | Testing |
| 9. Content Tests | 1h | Testing |
| 10. E2E Tests | 2h | Testing |
| 11. Accessibility Tests | 1.5h | Testing |
| 12. Manual Testing | 1h | Testing |
| 13. Code Review Prep | 1h | Documentation |
| 14. Create PR | 0.5h | Process |
| **Total** | **14.5 hours** | |

### Task Dependencies
```
Task 1 (Content Extraction)
  ↓
Task 2 (English Content) → Task 3 (Welsh Content)
  ↓                              ↓
Task 4 (Template) ←──────────────┘
  ↓
Task 5 (Controller) → Task 6 (Welsh Redirect)
  ↓                        ↓
Task 7 (Footer) ←──────────┘
  ↓
Task 8 (Controller Tests) → Task 9 (Content Tests)
  ↓
Task 10 (E2E Tests) → Task 11 (Accessibility Tests)
  ↓
Task 12 (Manual Testing)
  ↓
Task 13 (Code Review)
  ↓
Task 14 (Create PR)
```

### Critical Path
Tasks 1 → 2 → 4 → 5 → 7 → 10 → 12 → 13 → 14

### Parallel Work Opportunities
- Tasks 2 and 3 can be done in parallel (if content extracted)
- Tasks 8 and 9 can be done in parallel
- Task 6 can be done while Task 7 is in progress

### Success Criteria
All tasks completed with acceptance criteria met:
- ✅ Functional cookie policy page
- ✅ Full bilingual support
- ✅ WCAG 2.2 AA compliant
- ✅ Comprehensive test coverage
- ✅ Footer integration complete
- ✅ No impact on existing functionality
- ✅ Code review ready
