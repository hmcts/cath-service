# VIBE-241: Cookie Policy Page - Task Breakdown

## Overview
Add comprehensive Cookie Policy information page to CaTH service.

**Estimated Total Time**: 4.5 hours

---

## Task 1: Create Cookie Policy Page Structure
**Estimated Time**: 15 minutes

### Steps
1. Create directory structure:
   ```bash
   mkdir -p libs/web-core/src/pages/cookie-policy
   ```

2. Create files:
   - `libs/web-core/src/pages/cookie-policy/index.ts`
   - `libs/web-core/src/pages/cookie-policy/index.njk`
   - `libs/web-core/src/pages/cookie-policy/en.ts`
   - `libs/web-core/src/pages/cookie-policy/cy.ts`

### Acceptance Criteria
- [ ] Directory structure created
- [ ] All four files exist
- [ ] Files follow naming conventions (kebab-case)

---

## Task 2: Implement Cookie Policy Controller
**Estimated Time**: 15 minutes

### Steps
1. Edit `libs/web-core/src/pages/cookie-policy/index.ts`
2. Import types from Express
3. Import content from en.ts and cy.ts
4. Create GET handler that renders template
5. Pass en and cy objects to template

### Implementation
```typescript
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

### Acceptance Criteria
- [ ] Controller imports correct types
- [ ] GET handler exports correct function signature
- [ ] Template path is "cookie-policy/index"
- [ ] Both en and cy content passed to template
- [ ] Uses .js extension for relative imports

---

## Task 3: Build Cookie Policy Template
**Estimated Time**: 45 minutes

### Steps
1. Edit `libs/web-core/src/pages/cookie-policy/index.njk`
2. Extend base-template.njk layout
3. Import govukTable and govukButton macros
4. Create content block with:
   - Page title (h1)
   - Introduction paragraph
   - "What are cookies" section (h2)
   - Essential cookies section with table (h2)
   - Analytics cookies section with table (h2)
   - Performance cookies section with table (h2)
   - "Manage cookies" section with button (h2)
5. Use govuk-grid-row/govuk-grid-column-two-thirds for layout
6. Ensure proper heading hierarchy

### Template Structure
```nunjucks
{% extends "layouts/base-template.njk" %}
{% from "govuk/components/table/macro.njk" import govukTable %}
{% from "govuk/components/button/macro.njk" import govukButton %}

{% block content %}
<div class="govuk-grid-row">
  <div class="govuk-grid-column-two-thirds">

    <h1 class="govuk-heading-xl">{{ title }}</h1>
    <p class="govuk-body-l">{{ intro }}</p>

    <!-- Sections with tables -->

  </div>
</div>
{% endblock %}
```

### Acceptance Criteria
- [ ] Template extends correct layout
- [ ] All required GOV.UK macros imported
- [ ] Responsive grid layout used
- [ ] Proper heading hierarchy (h1 → h2)
- [ ] Tables use govukTable component
- [ ] Button uses govukButton component
- [ ] Link to /cookie-preferences included

---

## Task 4: Write English Cookie Policy Content
**Estimated Time**: 45 minutes

### Steps
1. Edit `libs/web-core/src/pages/cookie-policy/en.ts`
2. Research cookie information from existing codebase:
   - apps/web/src/app.ts (categories config)
   - libs/web-core/src/middleware/cookies/cookie-helpers.ts
3. Write content sections:
   - Page title and intro
   - What are cookies explanation
   - Essential cookies description and table
   - Analytics cookies description and table
   - Performance cookies description and table
   - How to manage cookies section
4. Format table data as arrays for govukTable

### Content Structure
```typescript
export const en = {
  title: "Cookie policy",
  intro: "Cookies are small files saved on your phone, tablet or computer when you visit a website.",

  whatAreCookies: {
    title: "How cookies are used on this service",
    description: "We use cookies to make this service work and collect information about how you use our service."
  },

  essentialCookies: {
    title: "Strictly necessary cookies",
    description: "These cookies are essential for you to browse the website and use its features...",
    table: [
      [
        { text: "connect.sid" },
        { text: "Maintains your session while using the service" },
        { text: "When you close your browser" }
      ],
      // More cookies...
    ]
  },

  // More sections...

  tableHeaders: {
    name: "Name",
    purpose: "Purpose",
    expiry: "Expires"
  }
};
```

### Cookies to Document

**Essential:**
- connect.sid (session)
- cookie_policy (preferences storage)
- cookies_preferences_set (banner tracking)

**Analytics (optional):**
- _ga (Google Analytics main)
- _gid (Google Analytics session)

**Performance (optional):**
- dtCookie (Dynatrace)
- dtSa (Dynatrace session)
- rxVisitor (Dynatrace visitor)
- rxvt (Dynatrace visit)

### Acceptance Criteria
- [ ] All cookie categories documented
- [ ] Table data formatted correctly for govukTable
- [ ] Clear, user-friendly descriptions
- [ ] Accurate expiry information
- [ ] Legal references included (GDPR, PECR)
- [ ] Links to external resources if needed

---

## Task 5: Create Welsh Translation
**Estimated Time**: 30 minutes

### Steps
1. Edit `libs/web-core/src/pages/cookie-policy/cy.ts`
2. Copy structure from en.ts
3. Translate all text content:
   - Titles and headings
   - Descriptions
   - Table headers
   - Cookie descriptions
   - Button text
4. Maintain same structure as English version
5. Mark any technical terms that need review

### Acceptance Criteria
- [ ] Welsh file has identical structure to English
- [ ] All user-facing text translated
- [ ] Technical cookie names unchanged
- [ ] Comments added for terms needing review
- [ ] Export statement matches English version

### Note
Initial machine translation acceptable. Flag for professional Welsh translation team review before production deployment.

---

## Task 6: Update Footer Links
**Estimated Time**: 20 minutes

### Steps
1. Edit `libs/web-core/src/views/components/site-footer.njk`
2. Change cookie link href from `/cookie-preferences` to `/cookie-policy`
3. Consider renaming link text to "Cookie policy"

4. Edit `libs/web-core/src/locales/en.ts`
5. Update footer.cookies text if needed

6. Edit `libs/web-core/src/locales/cy.ts`
7. Update footer.cookies text in Welsh if needed

### Decision Point
**Option A**: Single "Cookie policy" link → `/cookie-policy`
**Option B**: Two links: "Cookie policy" → `/cookie-policy` and "Cookie preferences" → `/cookie-preferences`

Recommend Option A for simplicity. Policy page links to preferences.

### Acceptance Criteria
- [ ] Footer link updated in site-footer.njk
- [ ] Link text updated in locale files
- [ ] Welsh translation updated
- [ ] Link points to correct URL
- [ ] Footer still renders correctly

---

## Task 7: Update Cookie Banner (Optional)
**Estimated Time**: 10 minutes

### Steps
1. Edit `libs/web-core/src/views/components/cookie-banner.njk`
2. Consider updating "View cookies" link:
   - Option: Change to "View cookie policy"
   - Option: Add second link to policy
3. Ensure both banner states (initial and confirmation) updated

### Acceptance Criteria
- [ ] Banner links make sense with new structure
- [ ] Text updated in banner template or locales
- [ ] Welsh text updated
- [ ] Banner still functions correctly

---

## Task 8: Manual Testing
**Estimated Time**: 20 minutes

### Steps
1. Start local development server: `yarn dev`
2. Navigate to http://localhost:3000/cookie-policy
3. Verify page renders with all content
4. Check all sections visible
5. Verify tables display correctly
6. Click "Manage cookie preferences" button
7. Verify navigation to /cookie-preferences
8. Test footer link to /cookie-policy
9. Test Welsh version: /cookie-policy?lng=cy
10. Test on mobile viewport (resize browser)
11. Test keyboard navigation (Tab through page)

### Acceptance Criteria
- [ ] Page loads without errors
- [ ] All sections render correctly
- [ ] Tables are readable
- [ ] Button link works
- [ ] Footer link works
- [ ] Welsh translation displays
- [ ] Responsive on mobile
- [ ] Keyboard accessible

---

## Task 9: Create E2E Tests
**Estimated Time**: 30 minutes

### Steps
1. Create `e2e-tests/tests/cookie-policy.spec.ts`
2. Write tests for:
   - Page renders
   - Content is visible
   - Navigation to preferences
   - Welsh translation
   - Footer link

### Test Implementation
```typescript
import { expect, test } from "@playwright/test";

test.describe("Cookie Policy Page", () => {
  test("renders cookie policy page", async ({ page }) => {
    await page.goto("/cookie-policy");

    await expect(page.locator("h1")).toContainText("Cookie policy");
    await expect(page.locator("table").first()).toBeVisible();
  });

  test("links to cookie preferences", async ({ page }) => {
    await page.goto("/cookie-policy");

    await page.click("text=Manage cookie preferences");
    await expect(page).toHaveURL("/cookie-preferences");
  });

  test("displays Welsh translation", async ({ page }) => {
    await page.goto("/cookie-policy?lng=cy");

    await expect(page.locator("h1")).toContainText("Polisi cwcis");
  });

  test("footer links to cookie policy", async ({ page }) => {
    await page.goto("/");

    await page.click("footer >> text=Cookie");
    await expect(page).toHaveURL("/cookie-policy");
  });
});
```

### Acceptance Criteria
- [ ] Test file created in correct location
- [ ] All test cases pass
- [ ] Tests cover key user journeys
- [ ] Tests verify both English and Welsh
- [ ] Tests use Playwright best practices

---

## Task 10: Add Accessibility Tests
**Estimated Time**: 15 minutes

### Steps
1. Edit existing accessibility test file or create new one
2. Add axe-core scan for cookie policy page
3. Test in both English and Welsh
4. Verify no accessibility violations

### Test Implementation
```typescript
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("cookie policy page is accessible", async ({ page }) => {
  await page.goto("/cookie-policy");

  const accessibilityScanResults = await new AxeBuilder({ page })
    .analyze();

  expect(accessibilityScanResults.violations).toEqual([]);
});

test("Welsh cookie policy page is accessible", async ({ page }) => {
  await page.goto("/cookie-policy?lng=cy");

  const accessibilityScanResults = await new AxeBuilder({ page })
    .analyze();

  expect(accessibilityScanResults.violations).toEqual([]);
});
```

### Acceptance Criteria
- [ ] Accessibility tests added
- [ ] Tests pass with zero violations
- [ ] Both language versions tested
- [ ] Keyboard navigation verified
- [ ] Screen reader compatibility checked

---

## Task 11: Run Regression Tests
**Estimated Time**: 10 minutes

### Steps
1. Run full E2E test suite: `yarn test:e2e`
2. Verify no regressions in:
   - Cookie preferences page
   - Cookie banner functionality
   - Cookie consent persistence
   - Footer navigation
3. Fix any broken tests
4. Ensure all existing tests pass

### Acceptance Criteria
- [ ] All existing E2E tests pass
- [ ] No regressions in cookie functionality
- [ ] Cookie preferences page still works
- [ ] Cookie banner still works
- [ ] Consent is still saved correctly

---

## Task 12: Code Quality Checks
**Estimated Time**: 10 minutes

### Steps
1. Run linter: `yarn lint:fix`
2. Run formatter: `yarn format`
3. Fix any TypeScript errors
4. Ensure all imports use .js extensions
5. Check naming conventions followed

### Acceptance Criteria
- [ ] No linting errors
- [ ] Code properly formatted
- [ ] No TypeScript errors
- [ ] Imports use .js extensions
- [ ] Follows HMCTS conventions

---

## Task 13: Documentation
**Estimated Time**: 15 minutes

### Steps
1. Add comments to controller explaining purpose
2. Document distinction between cookie-policy and cookie-preferences
3. Update web-core README if needed
4. Document how to update cookie information in future
5. Note Welsh translation review process

### Acceptance Criteria
- [ ] Code comments added
- [ ] README updated (if needed)
- [ ] Update process documented
- [ ] Clear distinction between policy and preferences explained

---

## Task 14: Create Pull Request
**Estimated Time**: 10 minutes

### Steps
1. Commit changes with descriptive message
2. Push to feature branch
3. Create PR with:
   - Link to JIRA ticket (VIBE-241)
   - Description of changes
   - Screenshots of new page
   - Testing notes
   - Note about Welsh translation review
4. Request code review

### PR Description Template
```markdown
## VIBE-241: Cookie Policy Page

### Changes
- Added comprehensive cookie policy page at `/cookie-policy`
- Updated footer to link to cookie policy
- Documented all cookies used by CaTH service
- Included full Welsh translation

### Screenshots
[Add screenshots of English and Welsh pages]

### Testing
- All E2E tests pass
- Accessibility tests pass (WCAG 2.2 AA)
- Manual testing completed
- No regressions in existing functionality

### Notes
- Welsh translation may need professional review
- Cookie policy is separate from cookie preferences
- Policy page links to preferences for settings management

### Checklist
- [ ] Code follows HMCTS conventions
- [ ] Tests added and passing
- [ ] Welsh translation included
- [ ] Accessibility tested
- [ ] No regressions
```

### Acceptance Criteria
- [ ] PR created with clear description
- [ ] Link to JIRA ticket included
- [ ] Screenshots added
- [ ] Testing notes included
- [ ] Code review requested

---

## Post-Implementation Tasks

### Task 15: Monitor After Deployment
1. Check page analytics for /cookie-policy
2. Monitor for accessibility complaints
3. Watch for user feedback
4. Verify Welsh translation reviewed
5. Update content as needed

### Task 16: Follow-Up Items
- Consider adding "last updated" date to page
- Review user navigation patterns (policy vs preferences)
- Update cookie information when new cookies added
- Schedule periodic review of cookie documentation

---

## Task Summary

| Task | Estimated Time | Type |
|------|----------------|------|
| 1. Create structure | 15 min | Setup |
| 2. Implement controller | 15 min | Backend |
| 3. Build template | 45 min | Frontend |
| 4. Write English content | 45 min | Content |
| 5. Create Welsh translation | 30 min | Content |
| 6. Update footer | 20 min | Frontend |
| 7. Update banner (optional) | 10 min | Frontend |
| 8. Manual testing | 20 min | Testing |
| 9. Create E2E tests | 30 min | Testing |
| 10. Add accessibility tests | 15 min | Testing |
| 11. Run regression tests | 10 min | Testing |
| 12. Code quality checks | 10 min | Quality |
| 13. Documentation | 15 min | Docs |
| 14. Create PR | 10 min | Process |
| **Total** | **4.5 hours** | |

---

## Dependencies Between Tasks

- Task 2 depends on Task 1 (need files created)
- Task 3 depends on Tasks 4 & 5 (need content structure)
- Tasks 8-11 depend on Tasks 1-7 (need implementation complete)
- Task 14 depends on all previous tasks (need everything done)

## Recommended Order

1. Tasks 1-2 (setup and controller)
2. Task 4 (English content) - do first to establish structure
3. Task 5 (Welsh translation) - follow English structure
4. Task 3 (template) - can use content structure
5. Tasks 6-7 (navigation updates)
6. Tasks 8-11 (testing)
7. Task 12 (code quality)
8. Task 13 (documentation)
9. Task 14 (PR)
