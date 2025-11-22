# VIBE-241: Cookie Policy Page - Implementation Plan

## Overview

This plan outlines the step-by-step implementation of the Cookie Policy page for the CaTH service. The work will be completed within the existing `@hmcts/web-core` module to maintain consistency with other general information pages (accessibility statement, cookie preferences).

## Implementation Phases

### Phase 1: Content Preparation and Structure (2 hours)

#### 1.1 Extract and Organize Content from Word Document
- Manually extract content from `docs/VIBE-241/Cookie Policy.docx`
- Organize into logical sections following GOV.UK patterns
- Identify cookie tables and their data
- Ensure all technical details are accurate

#### 1.2 Create Content Files
**Files to create:**
1. `libs/web-core/src/pages/cookies-policy/en.ts`
2. `libs/web-core/src/pages/cookies-policy/cy.ts`

**Content Structure:**
```typescript
export const en = {
  title: string;
  intro: string;

  essentialSection: {
    heading: string;
    description: string;
    tableCaption: string;
    cookies: Array<{
      name: string;
      purpose: string;
      expires: string;
    }>;
  };

  analyticsSection: {
    heading: string;
    description: string;
    tableCaption: string;
    cookies: Array<{...}>;
    controlNote: string;
  };

  performanceSection: {
    heading: string;
    description: string;
    tableCaption: string;
    cookies: Array<{...}>;
    controlNote: string;
  };

  preferencesSection: {
    heading: string;
    description: string;
    tableCaption: string;
    cookies: Array<{...}>;
  };

  changeSettings: {
    heading: string;
    description: string;
    linkText: string;
  };
};
```

**Cookie Information to Document:**

*Essential Cookies:*
- `connect.sid` - Session cookie (expires on browser close)
- `cookies_preferences_set` - Cookie banner control (expires after 1 year)
- `cookie_policy` - User cookie preferences (expires after 1 year)
- `_csrf` - CSRF protection token (expires on browser close)

*Analytics Cookies (Google Analytics):*
- `_ga` - Distinguishes users (expires after 2 years)
- `_gid` - Distinguishes users (expires after 24 hours)

*Performance Monitoring Cookies (Dynatrace):*
- `dtCookie` - Session tracking (expires on browser close)
- `dtSa` - Server action tracking (expires after 10 minutes)
- `rxVisitor` - Visitor tracking (expires after 1 year)
- `rxvt` - Visit tracking (expires on browser close)

*Preference Cookies:*
- `language` - Language preference (expires after 1 year)

#### 1.3 Welsh Translation
- Translate all content to Welsh
- Ensure technical terms are handled appropriately
- Maintain content parity with English version
- Use existing Welsh translations as reference for consistency

**Deliverables:**
- `en.ts` with complete English content
- `cy.ts` with complete Welsh content
- Content verified for accuracy

---

### Phase 2: Template Implementation (2 hours)

#### 2.1 Create Nunjucks Template
**File to create:**
- `libs/web-core/src/pages/cookies-policy/index.njk`

**Template Structure:**
```njk
{% extends "layouts/base-template.njk" %}
{% from "govuk/components/table/macro.njk" import govukTable %}
{% from "govuk/components/button/macro.njk" import govukButton %}

{% block backLink %}
  {# Override to remove back link from policy pages #}
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
    rows: essentialSection.cookies | map(cookie => [
      { text: cookie.name },
      { text: cookie.purpose },
      { text: cookie.expires }
    ])
  }) }}

  {# Analytics cookies section #}
  <h2 class="govuk-heading-l">{{ analyticsSection.heading }}</h2>
  <p class="govuk-body">{{ analyticsSection.description }}</p>

  {{ govukTable({...}) }}

  <p class="govuk-body">{{ analyticsSection.controlNote }}</p>

  {# Performance monitoring section #}
  <h2 class="govuk-heading-l">{{ performanceSection.heading }}</h2>
  <p class="govuk-body">{{ performanceSection.description }}</p>

  {{ govukTable({...}) }}

  <p class="govuk-body">{{ performanceSection.controlNote }}</p>

  {# Preferences section #}
  <h2 class="govuk-heading-l">{{ preferencesSection.heading }}</h2>
  <p class="govuk-body">{{ preferencesSection.description }}</p>

  {{ govukTable({...}) }}

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

**Key Template Features:**
1. Remove back link for policy pages (override `backLink` block)
2. Use GOV.UK table component for cookie listings
3. Proper heading hierarchy (h1 → h2)
4. Button-styled link to preferences page
5. Semantic HTML for accessibility
6. Responsive design (GOV.UK grid system if needed)

#### 2.2 Template Testing
- Verify template renders with sample data
- Check all Nunjucks syntax is correct
- Ensure proper GOV.UK component usage
- Test responsive behavior

**Deliverables:**
- Working Nunjucks template
- Template follows GOV.UK patterns

---

### Phase 3: Controller Implementation (1 hour)

#### 3.1 Create Main Controller
**File to create:**
- `libs/web-core/src/pages/cookies-policy/index.ts`

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

**Implementation Notes:**
- Simple GET handler only (no POST needed)
- Pass both language objects to template
- i18n middleware automatically selects correct language
- No business logic required

#### 3.2 Create Welsh Redirect Route
**File to create:**
- `libs/web-core/src/pages/polisi-cwcis/index.ts`

```typescript
import type { Request, Response } from "express";

export const GET = async (_req: Request, res: Response) => {
  res.redirect("/cookies-policy?lng=cy");
};
```

**Implementation Notes:**
- 301 redirect to main route with Welsh language parameter
- Maintains clean Welsh URL pattern
- Leverages existing i18n infrastructure

#### 3.3 Verify Route Registration
- Routes are auto-discovered by simple-router
- English route: `/cookies-policy`
- Welsh route: `/polisi-cwcis`
- No changes to `apps/web/src/app.ts` required

**Deliverables:**
- Working GET handlers
- Routes accessible at correct URLs
- Welsh redirect functioning

---

### Phase 4: Footer Integration (30 minutes)

#### 4.1 Update Footer Component
**File to modify:**
- `libs/web-core/src/views/components/site-footer.njk`

**Current code (lines 16-18):**
```njk
{
  href: "/cookie-preferences",
  text: footer.cookies
},
```

**Updated code:**
```njk
{
  href: "/cookies-policy",
  text: footer.cookies
},
```

**Changes Required:**
- Change href from `/cookie-preferences` to `/cookies-policy`
- Keep all other properties the same
- Maintain bilingual text (already handled by `footer.cookies`)

#### 4.2 Verify Footer Rendering
- Check footer on all page types
- Verify link text is correct in both languages
- Test navigation from footer to cookie policy

**Deliverables:**
- Updated footer component
- Footer links to new cookie policy page

---

### Phase 5: Unit Testing (2 hours)

#### 5.1 Controller Tests
**File to create:**
- `libs/web-core/src/pages/cookies-policy/index.test.ts`

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

  it("should include all required content sections", async () => {
    const req = {} as Request;
    const res = {
      render: vi.fn()
    } as unknown as Response;

    await GET(req, res);

    const renderArgs = (res.render as any).mock.calls[0][1];

    expect(renderArgs.en).toHaveProperty("title");
    expect(renderArgs.en).toHaveProperty("essentialSection");
    expect(renderArgs.en).toHaveProperty("analyticsSection");
    expect(renderArgs.en).toHaveProperty("performanceSection");
    expect(renderArgs.en).toHaveProperty("preferencesSection");
    expect(renderArgs.en).toHaveProperty("changeSettings");
  });
});
```

#### 5.2 Welsh Redirect Tests
**File to create:**
- `libs/web-core/src/pages/polisi-cwcis/index.test.ts`

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
});
```

#### 5.3 Content Structure Tests
**File to create:**
- `libs/web-core/src/pages/cookies-policy/en.test.ts`
- `libs/web-core/src/pages/cookies-policy/cy.test.ts`

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

  it("should have cookie arrays with required fields", () => {
    const sections = [
      en.essentialSection,
      en.analyticsSection,
      en.performanceSection,
      en.preferencesSection
    ];

    sections.forEach(section => {
      expect(section.cookies).toBeInstanceOf(Array);
      section.cookies.forEach(cookie => {
        expect(cookie).toHaveProperty("name");
        expect(cookie).toHaveProperty("purpose");
        expect(cookie).toHaveProperty("expires");
      });
    });
  });

  it("should document all essential cookies", () => {
    const cookieNames = en.essentialSection.cookies.map(c => c.name);
    expect(cookieNames).toContain("connect.sid");
    expect(cookieNames).toContain("cookies_preferences_set");
    expect(cookieNames).toContain("cookie_policy");
  });
});
```

#### 5.4 Run Tests
```bash
yarn test libs/web-core/src/pages/cookies-policy
yarn test libs/web-core/src/pages/polisi-cwcis
```

**Deliverables:**
- All unit tests passing
- Code coverage >80% for new files

---

### Phase 6: E2E Testing (2 hours)

#### 6.1 Create E2E Test Suite
**File to create:**
- `e2e-tests/tests/cookie-policy.spec.ts`

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
    await expect(page.locator("h2").filter({ hasText: "Analytics cookies" })).toBeVisible();
    await expect(page.locator("h2").filter({ hasText: "Performance monitoring" })).toBeVisible();
    await expect(page.locator("h2").filter({ hasText: "Preference cookies" })).toBeVisible();
  });

  test("should display cookie tables with data", async ({ page }) => {
    await page.goto("/cookies-policy");

    const tables = page.locator(".govuk-table");
    await expect(tables).toHaveCount(4);

    // Check essential cookies table has content
    const firstTable = tables.first();
    await expect(firstTable.locator("tbody tr")).toHaveCount(3, { timeout: 5000 });
  });

  test("should have link to cookie preferences page", async ({ page }) => {
    await page.goto("/cookies-policy");

    const link = page.locator('a[href="/cookie-preferences"]');
    await expect(link).toBeVisible();
    await expect(link).toContainText("Change your cookie settings");
  });

  test("should navigate to cookie preferences when link clicked", async ({ page }) => {
    await page.goto("/cookies-policy");

    await page.click('a[href="/cookie-preferences"]');
    await expect(page).toHaveURL("/cookie-preferences");
  });

  test("should be accessible from footer", async ({ page }) => {
    await page.goto("/");

    const footerLink = page.locator("footer a").filter({ hasText: "Cookies" });
    await expect(footerLink).toBeVisible();

    await footerLink.click();
    await expect(page).toHaveURL("/cookies-policy");
  });

  test("should work without JavaScript", async ({ page, context }) => {
    await context.setJavaScriptEnabled(false);
    await page.goto("/cookies-policy");

    await expect(page.locator("h1")).toContainText("Cookies");
    await expect(page.locator(".govuk-table")).toHaveCount(4);
  });

  test("should support keyboard navigation", async ({ page }) => {
    await page.goto("/cookies-policy");

    // Tab to "Change settings" button
    await page.keyboard.press("Tab");
    // Continue tabbing until we find the button
    for (let i = 0; i < 10; i++) {
      const focused = await page.locator(":focus");
      const text = await focused.textContent();
      if (text?.includes("Change your cookie settings")) {
        break;
      }
      await page.keyboard.press("Tab");
    }

    // Press Enter to navigate
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL("/cookie-preferences");
  });
});

test.describe("Cookie Policy - Welsh Language", () => {
  test("should load Welsh version at /polisi-cwcis", async ({ page }) => {
    await page.goto("/polisi-cwcis");

    await expect(page).toHaveURL(/cookies-policy\?lng=cy/);
    await expect(page.locator("h1")).toContainText("Cwcis");
  });

  test("should display Welsh content when language parameter set", async ({ page }) => {
    await page.goto("/cookies-policy?lng=cy");

    await expect(page.locator("h1")).toContainText("Cwcis");
    await expect(page.locator("h2").first()).toContainText(/Cwcis|hanfodol/i);
  });

  test("should switch from footer in Welsh", async ({ page }) => {
    await page.goto("/?lng=cy");

    const footerLink = page.locator("footer a").filter({ hasText: "Cwcis" });
    await expect(footerLink).toBeVisible();

    await footerLink.click();
    await expect(page).toHaveURL(/cookies-policy/);
    await expect(page.locator("h1")).toContainText("Cwcis");
  });
});
```

#### 6.2 Run E2E Tests
```bash
yarn test:e2e cookie-policy
```

**Deliverables:**
- All E2E tests passing
- Coverage of key user journeys

---

### Phase 7: Accessibility Testing (1.5 hours)

#### 7.1 Automated Accessibility Tests
Add to existing E2E suite:

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

    // Check h2s follow h1
    const h2s = page.locator("h2");
    await expect(h2s.first()).toBeVisible();

    // Verify no heading levels are skipped
    const h3s = page.locator("h3");
    const h3Count = await h3s.count();
    // h3s should only appear after h2s, if at all
    expect(h3Count).toBeGreaterThanOrEqual(0);
  });

  test("should have accessible table structure", async ({ page }) => {
    await page.goto("/cookies-policy");

    const tables = page.locator(".govuk-table");
    const firstTable = tables.first();

    // Check for thead
    await expect(firstTable.locator("thead")).toBeVisible();

    // Check for th elements with scope
    const headers = firstTable.locator("th");
    await expect(headers.first()).toHaveAttribute("scope", "col");
  });

  test("should have descriptive link text", async ({ page }) => {
    await page.goto("/cookies-policy");

    // No "click here" or "read more" links
    const links = page.locator("a");
    const count = await links.count();

    for (let i = 0; i < count; i++) {
      const link = links.nth(i);
      const text = await link.textContent();
      expect(text?.toLowerCase()).not.toContain("click here");
      expect(text?.toLowerCase()).not.toContain("here");
    }
  });

  test("should have sufficient color contrast", async ({ page }) => {
    await page.goto("/cookies-policy");

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2aa"])
      .include(".govuk-body")
      .analyze();

    const contrastViolations = results.violations.filter(
      v => v.id === "color-contrast"
    );
    expect(contrastViolations).toHaveLength(0);
  });
});
```

#### 7.2 Manual Accessibility Testing Checklist

Create checklist document:
```markdown
# Cookie Policy - Manual Accessibility Testing

## Screen Reader Testing
- [ ] NVDA (Windows): Page structure makes sense
- [ ] JAWS (Windows): Tables announced correctly
- [ ] VoiceOver (Mac): Headings navigable
- [ ] Mobile screen reader: Content accessible

## Keyboard Navigation
- [ ] Tab through all interactive elements
- [ ] Focus indicators visible
- [ ] No keyboard traps
- [ ] Logical tab order

## Visual Testing
- [ ] Zoom to 200% - content reflows correctly
- [ ] Text spacing adjustments work
- [ ] High contrast mode - content visible
- [ ] Mobile responsive - tables adapt

## Language Support
- [ ] Welsh characters display correctly
- [ ] Language switcher works
- [ ] Content parity between languages
```

#### 7.3 Run Accessibility Tests
```bash
yarn test:e2e cookie-policy --grep "Accessibility"
```

**Deliverables:**
- Axe-core tests passing
- Manual testing checklist completed
- No WCAG 2.2 AA violations

---

### Phase 8: Documentation and Cleanup (1 hour)

#### 8.1 Update Module Documentation
No README changes needed (following YAGNI principle).

#### 8.2 Code Review Preparation
Create PR description with:
- Summary of changes
- Screenshots of English and Welsh versions
- Accessibility testing results
- E2E test results
- Links to ticket and specification

#### 8.3 Final Verification Checklist
```markdown
# Pre-Merge Checklist

## Functionality
- [ ] English page loads at /cookies-policy
- [ ] Welsh redirect works at /polisi-cwcis
- [ ] Footer link navigates to cookie policy
- [ ] Link to preferences page works
- [ ] Content is accurate and complete

## Code Quality
- [ ] All unit tests pass
- [ ] All E2E tests pass
- [ ] Accessibility tests pass
- [ ] No TypeScript errors
- [ ] No linting warnings
- [ ] Code follows CLAUDE.md guidelines

## Accessibility
- [ ] WCAG 2.2 AA compliant
- [ ] Keyboard navigation works
- [ ] Screen reader compatible
- [ ] Proper heading hierarchy
- [ ] Tables properly structured

## Bilingual Support
- [ ] English content complete
- [ ] Welsh content complete
- [ ] Content parity verified
- [ ] Language switching works

## Browser Testing
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile browsers

## Integration
- [ ] No impact on existing pages
- [ ] Cookie preferences still work
- [ ] Footer renders correctly site-wide
- [ ] No console errors
```

**Deliverables:**
- Complete PR description
- All checklist items verified
- Ready for code review

---

## Build and Deployment

### Build Process
No changes to build configuration required:
- `yarn build` in `libs/web-core` includes new pages
- Nunjucks templates copied by existing build script
- TypeScript compiles new controllers

### Deployment Steps
1. Merge PR to master
2. CI/CD pipeline runs automatically
3. Unit tests run
4. E2E tests run
5. Docker image builds
6. Deploy to staging environment
7. Smoke test in staging
8. Deploy to production

### Rollback Plan
If issues are found:
1. Revert PR merge
2. Footer still links to old `/cookie-preferences` (backwards compatible)
3. No database changes to rollback
4. No breaking changes to existing functionality

---

## Risk Mitigation

### Risk: Inaccurate Cookie Information
**Mitigation:**
- Audit all cookies in browser DevTools
- Cross-reference with app.ts configuration
- Review with security team

### Risk: Welsh Translation Quality
**Mitigation:**
- Use professional translation service
- Review by Welsh-speaking team member
- Maintain consistency with existing translations

### Risk: Accessibility Violations
**Mitigation:**
- Run Axe-core tests early
- Manual testing with screen readers
- Review GOV.UK accessibility checklist

### Risk: Breaking Existing Cookie Preferences
**Mitigation:**
- No changes to preference functionality
- Only changing footer link target
- Thorough E2E testing of preferences flow

---

## Estimated Timeline

| Phase | Duration | Dependencies |
|-------|----------|--------------|
| Phase 1: Content Preparation | 2 hours | Word document |
| Phase 2: Template Implementation | 2 hours | Phase 1 |
| Phase 3: Controller Implementation | 1 hour | Phase 1, 2 |
| Phase 4: Footer Integration | 30 mins | Phase 3 |
| Phase 5: Unit Testing | 2 hours | Phase 3 |
| Phase 6: E2E Testing | 2 hours | Phase 4 |
| Phase 7: Accessibility Testing | 1.5 hours | Phase 6 |
| Phase 8: Documentation & Review | 1 hour | All phases |

**Total Estimated Time: 12 hours (1.5 days)**

---

## Success Metrics

Post-deployment metrics to monitor:
1. Page views for `/cookies-policy`
2. Bounce rate (should be low for informational page)
3. Click-through rate to `/cookie-preferences`
4. No increase in cookie-related support tickets
5. Accessibility audit score remains high
6. No console errors reported

---

## Next Steps After Implementation

1. Monitor analytics for cookie policy page usage
2. Gather user feedback
3. Update content as new cookies are added
4. Consider adding to help documentation
5. Share pattern with other HMCTS services
