# VIBE-236: Accessibility Statement - Task Breakdown

## Task Organization

Tasks are organized by implementation phase. Each task includes:
- Clear description of work required
- Acceptance criteria
- Files to be modified/created
- Testing requirements

---

## Phase 1: Content Extraction and Preparation

### Task 1.1: Extract English Content from DOCX
**Effort**: 30 minutes

**Description**:
Extract all English accessibility statement content from the provided DOCX file and structure it for the TypeScript content file.

**Steps**:
1. Open `docs/VIBE-236/Accessibility statement.docx`
2. Copy all section headings and body text
3. Note all lists, bullet points, and special formatting
4. Capture all links, contact information, and dates
5. Document structure in a temporary file or notes

**Acceptance Criteria**:
- [ ] All content sections identified
- [ ] All lists and formatting noted
- [ ] Contact details recorded
- [ ] Testing dates captured
- [ ] Content ready for TypeScript conversion

**Files**: N/A (preparation only)

---

### Task 1.2: Extract Welsh Content from DOCX
**Effort**: 30 minutes

**Description**:
Extract all Welsh accessibility statement content from the provided DOCX file.

**Steps**:
1. Extract Welsh translations for all sections
2. Verify structure matches English content
3. Note any differences in formatting
4. Capture all Welsh-specific contact information

**Acceptance Criteria**:
- [ ] All Welsh content sections identified
- [ ] Structure matches English version
- [ ] All translations captured accurately

**Files**: N/A (preparation only)

---

### Task 1.3: Structure Content as TypeScript Objects
**Effort**: 1 hour

**Description**:
Convert extracted content into TypeScript object format matching existing structure.

**Steps**:
1. Review current structure in `libs/web-core/src/pages/accessibility-statement/en.ts`
2. Map extracted content to existing structure
3. Create formatted TypeScript objects for both languages
4. Add `backToTop` property to both EN and CY content structures
5. Validate syntax

**Acceptance Criteria**:
- [ ] Content formatted as valid TypeScript
- [ ] Structure matches existing pattern
- [ ] All nested objects properly formatted
- [ ] Arrays properly formatted
- [ ] No syntax errors
- [ ] `backToTop` property added

**Files**:
- Prepare updates for: `libs/web-core/src/pages/accessibility-statement/en.ts`
- Prepare updates for: `libs/web-core/src/pages/accessibility-statement/cy.ts`

---

### Task 1.4: Content Review and Validation
**Effort**: 30 minutes

**Description**:
Review extracted and formatted content for accuracy and completeness.

**Steps**:
1. Compare extracted content with DOCX source
2. Verify all sections present
3. Check contact information accuracy
4. Verify dates are current
5. Request stakeholder review if available

**Acceptance Criteria**:
- [ ] All content matches source document
- [ ] No missing sections
- [ ] Contact details verified
- [ ] Dates are current
- [ ] Welsh translation verified by native speaker (if possible)

**Files**: N/A (review only)

---

## Phase 2: Welsh Route Implementation

### Task 2.1: Create Welsh Route Controller
**Effort**: 30 minutes

**Description**:
Create a new page controller for the Welsh-specific accessibility statement route at `/datganiad-hygyrchedd`.

**Steps**:
1. Create new file: `libs/web-core/src/pages/datganiad-hygyrchedd.ts`
2. Import required types from Express
3. Import Welsh content from `accessibility-statement/cy.js`
4. Create GET handler that renders the accessibility-statement template with Welsh content
5. Add TypeScript strict mode compliance

**Implementation**:
```typescript
import type { Request, Response } from "express";
import { cy } from "./accessibility-statement/cy.js";

const WELSH_CONTENT = {
  ...cy,
  backToTop: "Yn ôl i'r brig"
};

export const GET = async (_req: Request, res: Response) => {
  res.render("accessibility-statement/index", {
    en: WELSH_CONTENT,
    cy: WELSH_CONTENT
  });
};
```

**Acceptance Criteria**:
- [ ] File created at correct location
- [ ] Imports use `.js` extension (ES module requirement)
- [ ] GET handler properly typed
- [ ] Renders accessibility-statement template
- [ ] Passes both `en` and `cy` as Welsh content (for i18n middleware compatibility)
- [ ] No TypeScript errors
- [ ] No linting errors

**Files**:
- Create: `libs/web-core/src/pages/datganiad-hygyrchedd.ts`

**Testing**:
```bash
yarn dev
# Navigate to http://localhost:3000/datganiad-hygyrchedd
# Verify Welsh content displays
```

---

### Task 2.2: Update English Route Controller
**Effort**: 15 minutes

**Description**:
Update the English accessibility statement controller to include the `backToTop` string.

**Steps**:
1. Open `libs/web-core/src/pages/accessibility-statement/index.ts`
2. Add `backToTop` property to the content object
3. Ensure TypeScript types are correct

**Implementation**:
```typescript
import type { Request, Response } from "express";
import { cy } from "./cy.js";
import { en } from "./en.js";

const ENGLISH_CONTENT = {
  ...en,
  backToTop: "Back to top"
};

export const GET = async (_req: Request, res: Response) => {
  res.render("accessibility-statement/index", {
    en: ENGLISH_CONTENT,
    cy
  });
};
```

**Acceptance Criteria**:
- [ ] `backToTop` property added
- [ ] Content constant properly typed
- [ ] No TypeScript errors
- [ ] No linting errors

**Files**:
- Update: `libs/web-core/src/pages/accessibility-statement/index.ts`

---

### Task 2.3: Create Unit Tests for Welsh Route
**Effort**: 30 minutes

**Description**:
Create unit tests for the new Welsh route controller.

**Steps**:
1. Create `libs/web-core/src/pages/datganiad-hygyrchedd.test.ts`
2. Write test for GET handler
3. Verify correct template is rendered
4. Verify Welsh content is passed

**Implementation**:
```typescript
import { describe, it, expect, vi } from "vitest";
import { GET } from "./datganiad-hygyrchedd.js";
import type { Request, Response } from "express";

describe("Datganiad Hygyrchedd Page", () => {
  it("should render accessibility statement template with Welsh content", async () => {
    const req = {} as Request;
    const res = {
      render: vi.fn()
    } as unknown as Response;

    await GET(req, res);

    expect(res.render).toHaveBeenCalledWith(
      "accessibility-statement/index",
      expect.objectContaining({
        en: expect.objectContaining({
          title: "Datganiad hygyrchedd",
          backToTop: "Yn ôl i'r brig"
        }),
        cy: expect.objectContaining({
          title: "Datganiad hygyrchedd"
        })
      })
    );
  });
});
```

**Acceptance Criteria**:
- [ ] Test file created
- [ ] GET handler test passes
- [ ] Template name verified
- [ ] Welsh content verified
- [ ] No test failures

**Files**:
- Create: `libs/web-core/src/pages/datganiad-hygyrchedd.test.ts`

**Testing**:
```bash
yarn test
```

---

### Task 2.4: Update English Route Unit Tests
**Effort**: 15 minutes

**Description**:
Update existing unit tests for English route to verify `backToTop` property.

**Steps**:
1. Open `libs/web-core/src/pages/accessibility-statement/index.test.ts`
2. Add assertion for `backToTop` property
3. Ensure all tests pass

**Acceptance Criteria**:
- [ ] Test updated to verify `backToTop`
- [ ] All tests pass
- [ ] No test failures

**Files**:
- Update: `libs/web-core/src/pages/accessibility-statement/index.test.ts`

---

### Task 2.5: Manual Route Testing
**Effort**: 15 minutes

**Description**:
Manually test both routes in local development environment.

**Steps**:
1. Start development server: `yarn dev`
2. Navigate to `/accessibility-statement`
3. Verify English content displays
4. Navigate to `/datganiad-hygyrchedd`
5. Verify Welsh content displays
6. Check browser console for errors

**Acceptance Criteria**:
- [ ] Both routes accessible
- [ ] English content correct
- [ ] Welsh content correct
- [ ] No console errors
- [ ] No 404 errors

**Files**: N/A (manual testing)

---

## Phase 3: Back to Top Implementation

### Task 3.1: Add Back to Top Link to Template
**Effort**: 15 minutes

**Description**:
Add the back-to-top link element to the accessibility statement template.

**Steps**:
1. Open `libs/web-core/src/pages/accessibility-statement/index.njk`
2. Add back-to-top link before closing `{% endblock %}`
3. Use GOV.UK spacing utilities
4. Apply correct CSS class

**Implementation**:
Add before the closing `{% endblock %}` tag:
```nunjucks
  <div class="govuk-!-margin-top-8">
    <a href="#" class="govuk-link back-to-top-link">{{ backToTop }}</a>
  </div>
{% endblock %}
```

**Acceptance Criteria**:
- [ ] Link added to template
- [ ] Uses `backToTop` variable
- [ ] GOV.UK spacing applied
- [ ] Correct CSS class applied
- [ ] Template renders without errors

**Files**:
- Update: `libs/web-core/src/pages/accessibility-statement/index.njk`

---

### Task 3.2: Verify JavaScript Initialization
**Effort**: 15 minutes

**Description**:
Ensure back-to-top JavaScript is properly initialized in the application entry point.

**Steps**:
1. Open `apps/web/src/assets/js/index.ts`
2. Check if `initBackToTop()` is imported and called
3. Add import and initialization if missing
4. Verify no duplicate initialization

**Implementation** (if not present):
```typescript
import { initBackToTop } from "@hmcts/web-core/src/assets/js/back-to-top.js";

document.addEventListener("DOMContentLoaded", () => {
  initBackToTop();
  // ... other initializations
});
```

**Acceptance Criteria**:
- [ ] Import statement present
- [ ] Initialization called on DOMContentLoaded
- [ ] No duplicate calls
- [ ] No JavaScript errors

**Files**:
- Check/Update: `apps/web/src/assets/js/index.ts`

---

### Task 3.3: Test Back to Top Functionality
**Effort**: 15 minutes

**Description**:
Manually test back-to-top functionality on both language versions.

**Steps**:
1. Navigate to `/accessibility-statement`
2. Scroll to bottom of page
3. Verify link is visible
4. Click link
5. Verify smooth scroll to top
6. Repeat for `/datganiad-hygyrchedd`
7. Test keyboard navigation (Tab to link, Enter to activate)

**Acceptance Criteria**:
- [ ] Link visible at bottom of page
- [ ] Click scrolls to top smoothly
- [ ] Works on English version
- [ ] Works on Welsh version
- [ ] Keyboard accessible (Tab + Enter)
- [ ] Focus indicator visible

**Files**: N/A (manual testing)

---

### Task 3.4: Create Back to Top Template Test
**Effort**: 30 minutes

**Description**:
Add template test to verify back-to-top link renders correctly.

**Steps**:
1. Open `libs/web-core/src/pages/accessibility-statement/index.njk.test.ts`
2. Add test case for back-to-top link
3. Verify link has correct class and content

**Acceptance Criteria**:
- [ ] Test verifies link presence
- [ ] Test verifies correct CSS class
- [ ] Test verifies content from variable
- [ ] Test passes

**Files**:
- Update: `libs/web-core/src/pages/accessibility-statement/index.njk.test.ts`

---

## Phase 4: Footer Link Enhancement

### Task 4.1: Update Footer Component
**Effort**: 15 minutes

**Description**:
Modify the footer component to make the accessibility link open in a new tab.

**Steps**:
1. Open `libs/web-core/src/views/components/site-footer.njk`
2. Locate accessibility link object (around line 19-22)
3. Add `attributes` property with `target` and `rel`
4. Verify GOV.UK footer macro supports this pattern

**Implementation**:
```nunjucks
{
  href: "/accessibility-statement",
  text: footer.accessibility,
  attributes: {
    target: "_blank",
    rel: "noopener noreferrer"
  }
}
```

**Acceptance Criteria**:
- [ ] Attributes object added
- [ ] `target="_blank"` specified
- [ ] `rel="noopener noreferrer"` specified
- [ ] No template syntax errors
- [ ] Footer renders without errors

**Files**:
- Update: `libs/web-core/src/views/components/site-footer.njk`

---

### Task 4.2: Update English Locale String
**Effort**: 10 minutes

**Description**:
Update the English footer locale string to indicate the link opens in a new tab.

**Steps**:
1. Open `libs/web-core/src/locales/en.ts`
2. Locate `footer.accessibility` property
3. Update text to include "(opens in new tab)"
4. Ensure TypeScript formatting is correct

**Implementation**:
```typescript
footer: {
  // ... other properties
  accessibility: "Accessibility statement (opens in new tab)",
  // ... other properties
}
```

**Acceptance Criteria**:
- [ ] Text updated to include new tab indicator
- [ ] TypeScript syntax correct
- [ ] No linting errors
- [ ] Clear and understandable text

**Files**:
- Update: `libs/web-core/src/locales/en.ts`

---

### Task 4.3: Update Welsh Locale String
**Effort**: 10 minutes

**Description**:
Update the Welsh footer locale string to indicate the link opens in a new tab.

**Steps**:
1. Open `libs/web-core/src/locales/cy.ts`
2. Locate `footer.accessibility` property
3. Update text to include Welsh translation of "(opens in new tab)"
4. Verify translation accuracy

**Implementation**:
```typescript
footer: {
  // ... other properties
  accessibility: "Datganiad hygyrchedd (yn agor mewn tab newydd)",
  // ... other properties
}
```

**Acceptance Criteria**:
- [ ] Welsh text updated
- [ ] Translation accurate
- [ ] TypeScript syntax correct
- [ ] No linting errors

**Files**:
- Update: `libs/web-core/src/locales/cy.ts`

---

### Task 4.4: Update Locale Unit Tests
**Effort**: 20 minutes

**Description**:
Update unit tests for locale files to reflect new text.

**Steps**:
1. Open `libs/web-core/src/locales/en.test.ts`
2. Update test assertion for `footer.accessibility`
3. Open `libs/web-core/src/locales/cy.test.ts`
4. Update test assertion for `footer.accessibility`
5. Run tests to verify

**Acceptance Criteria**:
- [ ] English locale test updated
- [ ] Welsh locale test updated
- [ ] All tests pass
- [ ] No test failures

**Files**:
- Update: `libs/web-core/src/locales/en.test.ts`
- Update: `libs/web-core/src/locales/cy.test.ts`

---

### Task 4.5: Manual Footer Link Testing
**Effort**: 15 minutes

**Description**:
Manually test footer link opens in new tab and displays correct text.

**Steps**:
1. Navigate to any page with footer
2. Verify link text includes "(opens in new tab)"
3. Click link
4. Verify new tab/window opens
5. Verify original tab remains open
6. Inspect link element in DevTools
7. Verify `rel="noopener noreferrer"` present
8. Test in multiple browsers

**Acceptance Criteria**:
- [ ] Link text includes new tab indicator
- [ ] Link opens in new tab
- [ ] Original tab unchanged
- [ ] Security attributes present
- [ ] Works in Chrome, Firefox, Safari, Edge

**Files**: N/A (manual testing)

---

## Phase 5: Content Updates

### Task 5.1: Update English Content File
**Effort**: 1 hour

**Description**:
Replace existing English content with content extracted from DOCX file.

**Steps**:
1. Open `libs/web-core/src/pages/accessibility-statement/en.ts`
2. Back up existing content (via git)
3. Replace section-by-section with new content
4. Maintain existing structure
5. Verify TypeScript syntax
6. Run linter and fix issues

**Acceptance Criteria**:
- [ ] All sections updated with new content
- [ ] Structure matches template expectations
- [ ] No TypeScript errors
- [ ] No linting errors
- [ ] `backToTop` property preserved
- [ ] All arrays and nested objects properly formatted

**Files**:
- Update: `libs/web-core/src/pages/accessibility-statement/en.ts`

---

### Task 5.2: Update Welsh Content File
**Effort**: 1 hour

**Description**:
Replace existing Welsh content with content extracted from DOCX file.

**Steps**:
1. Open `libs/web-core/src/pages/accessibility-statement/cy.ts`
2. Back up existing content (via git)
3. Replace section-by-section with new content
4. Ensure structure matches English version
5. Verify TypeScript syntax
6. Run linter and fix issues

**Acceptance Criteria**:
- [ ] All sections updated with new content
- [ ] Structure matches English version
- [ ] Structure matches template expectations
- [ ] No TypeScript errors
- [ ] No linting errors
- [ ] `backToTop` property preserved

**Files**:
- Update: `libs/web-core/src/pages/accessibility-statement/cy.ts`

---

### Task 5.3: Verify Template Compatibility
**Effort**: 30 minutes

**Description**:
Verify that updated content renders correctly in the Nunjucks template.

**Steps**:
1. Start development server: `yarn dev`
2. Navigate to `/accessibility-statement`
3. Verify all sections render
4. Check for missing content
5. Verify lists render correctly
6. Check heading hierarchy
7. Verify links are functional
8. Repeat for `/datganiad-hygyrchedd`

**Acceptance Criteria**:
- [ ] All sections visible
- [ ] No template errors
- [ ] Lists render correctly
- [ ] Links are clickable
- [ ] Headings at correct levels
- [ ] Both languages render correctly

**Files**: N/A (manual verification)

---

### Task 5.4: Content Proofreading and Review
**Effort**: 30 minutes

**Description**:
Proofread updated content for accuracy, typos, and formatting issues.

**Steps**:
1. Read through entire English accessibility statement
2. Check for typos, grammar errors
3. Verify contact information is correct
4. Verify dates are current
5. Read through Welsh accessibility statement
6. Check for translation accuracy
7. Request stakeholder review

**Acceptance Criteria**:
- [ ] No typos or grammar errors
- [ ] Contact information verified
- [ ] Dates are current and accurate
- [ ] Welsh translation reviewed
- [ ] Stakeholder approval obtained (if applicable)

**Files**: N/A (review only)

---

## Phase 6: Testing and Quality Assurance

### Task 6.1: Create E2E Tests
**Effort**: 1.5 hours

**Description**:
Create comprehensive Playwright E2E tests for accessibility statement functionality.

**Steps**:
1. Create `e2e-tests/accessibility-statement.spec.ts`
2. Write test for English route navigation
3. Write test for Welsh route navigation
4. Write test for footer link opening in new tab
5. Write test for back-to-top functionality
6. Write test for axe-core accessibility scan
7. Run tests and verify all pass

**Implementation**:
```typescript
import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.describe("Accessibility Statement", () => {
  test("English route loads and displays content", async ({ page }) => {
    await page.goto("/accessibility-statement");
    await expect(page.locator("h1")).toContainText("Accessibility statement");
    await expect(page.locator(".back-to-top-link")).toBeVisible();
  });

  test("Welsh route loads and displays content", async ({ page }) => {
    await page.goto("/datganiad-hygyrchedd");
    await expect(page.locator("h1")).toContainText("Datganiad hygyrchedd");
    await expect(page.locator(".back-to-top-link")).toBeVisible();
  });

  test("Footer link opens in new tab", async ({ page, context }) => {
    await page.goto("/");
    const footerLink = page.locator('footer a:has-text("Accessibility statement")');
    await expect(footerLink).toHaveAttribute("target", "_blank");
    await expect(footerLink).toHaveAttribute("rel", "noopener noreferrer");
  });

  test("Back to top scrolls to page top", async ({ page }) => {
    await page.goto("/accessibility-statement");
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    const scrollY = await page.evaluate(() => window.scrollY);
    expect(scrollY).toBeGreaterThan(0);

    await page.locator(".back-to-top-link").click();
    await page.waitForTimeout(500); // Wait for smooth scroll

    const finalScrollY = await page.evaluate(() => window.scrollY);
    expect(finalScrollY).toBe(0);
  });

  test("Meets WCAG 2.2 AA standards", async ({ page }) => {
    await page.goto("/accessibility-statement");
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag22aa"])
      .analyze();
    expect(results.violations).toEqual([]);
  });
});
```

**Acceptance Criteria**:
- [ ] Test file created
- [ ] All test scenarios implemented
- [ ] Tests run successfully
- [ ] All tests pass
- [ ] No accessibility violations

**Files**:
- Create: `e2e-tests/accessibility-statement.spec.ts`

**Testing**:
```bash
yarn test:e2e
```

---

### Task 6.2: Screen Reader Testing
**Effort**: 1 hour

**Description**:
Test accessibility statement pages with multiple screen readers.

**Steps**:
1. **NVDA Testing (Windows)**:
   - Navigate to English accessibility statement
   - Verify page title announced
   - Navigate headings with H key
   - Read through content
   - Test footer link announcement
   - Test back-to-top link

2. **JAWS Testing (Windows)** (if available):
   - Repeat NVDA tests
   - Verify consistency

3. **VoiceOver Testing (Mac/iOS)**:
   - Repeat tests on Safari
   - Test mobile version

**Checklist**:
- [ ] Page title announced correctly
- [ ] Headings navigable with H key
- [ ] All content readable
- [ ] Links described accurately
- [ ] "Opens in new tab" announced for footer link
- [ ] Back-to-top link clearly identified
- [ ] No confusing or missing information

**Files**: N/A (manual testing)

**Documentation**: Record any issues found

---

### Task 6.3: Keyboard Navigation Testing
**Effort**: 30 minutes

**Description**:
Test complete keyboard navigation of accessibility statement pages.

**Steps**:
1. Navigate to `/accessibility-statement`
2. Tab through all interactive elements
3. Verify focus indicators visible
4. Test back-to-top with Enter key
5. Verify no keyboard traps
6. Test with Shift+Tab (backward navigation)
7. Repeat for `/datganiad-hygyrchedd`

**Checklist**:
- [ ] All interactive elements reachable via Tab
- [ ] Focus indicators clearly visible
- [ ] Back-to-top activates with Enter
- [ ] Footer links accessible
- [ ] No keyboard traps
- [ ] Logical tab order
- [ ] Shift+Tab reverses direction

**Files**: N/A (manual testing)

---

### Task 6.4: Visual and Zoom Testing
**Effort**: 30 minutes

**Description**:
Test visual presentation and zoom levels for accessibility compliance.

**Steps**:
1. **Color Contrast**: Use browser DevTools or WAVE to check all text
2. **200% Zoom**: Verify readable and no horizontal scroll
3. **400% Zoom**: Test mobile-optimized layout
4. **320px Viewport**: Test on narrow mobile screens
5. **Focus Indicators**: Verify visibility at all zoom levels

**Checklist**:
- [ ] All text meets 4.5:1 contrast ratio
- [ ] Headings meet 3:1 contrast ratio
- [ ] Readable at 200% zoom
- [ ] Readable at 400% zoom
- [ ] No horizontal scrolling at 320px width
- [ ] Focus indicators visible at all zoom levels
- [ ] No text overlap or cutting

**Files**: N/A (manual testing)

**Tools**: Chrome DevTools, WAVE browser extension

---

### Task 6.5: Cross-Browser Testing
**Effort**: 45 minutes

**Description**:
Test accessibility statement functionality across multiple browsers and devices.

**Browsers to Test**:
- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
- Mobile Safari (iOS)
- Chrome Mobile (Android)

**Test Matrix**:
For each browser, verify:
- [ ] English route loads
- [ ] Welsh route loads
- [ ] Footer link opens in new tab
- [ ] Back-to-top works
- [ ] Content displays correctly
- [ ] No console errors
- [ ] Smooth scrolling works

**Files**: N/A (manual testing)

**Documentation**: Record browser-specific issues

---

### Task 6.6: Performance Testing
**Effort**: 30 minutes

**Description**:
Verify page load performance meets acceptable standards.

**Steps**:
1. Open Chrome DevTools Lighthouse
2. Run audit on `/accessibility-statement`
3. Check performance metrics
4. Run audit on `/datganiad-hygyrchedd`
5. Verify no performance regressions

**Metrics to Check**:
- First Contentful Paint (target: < 1.5s)
- Total Blocking Time (target: < 200ms)
- Cumulative Layout Shift (target: < 0.1)
- Overall Performance Score (target: > 90)
- Accessibility Score (target: 100)

**Checklist**:
- [ ] Performance score acceptable
- [ ] Accessibility score 100
- [ ] No layout shift during load
- [ ] Smooth scroll animation 60fps
- [ ] No janky interactions

**Files**: N/A (performance testing)

**Tools**: Chrome DevTools Lighthouse

---

### Task 6.7: Run Full Test Suite
**Effort**: 15 minutes

**Description**:
Run all automated tests to ensure no regressions.

**Steps**:
1. Run unit tests: `yarn test`
2. Run E2E tests: `yarn test:e2e`
3. Run linter: `yarn lint`
4. Fix any failures
5. Verify all tests pass

**Acceptance Criteria**:
- [ ] All unit tests pass
- [ ] All E2E tests pass
- [ ] No linting errors
- [ ] No console warnings
- [ ] Test coverage maintained or improved

**Files**: N/A (automated testing)

**Commands**:
```bash
yarn test
yarn test:e2e
yarn lint
```

---

## Phase 7: Documentation and Code Review

### Task 7.1: Run Code Quality Tools
**Effort**: 15 minutes

**Description**:
Ensure code meets quality standards before review.

**Steps**:
1. Run `yarn lint:fix` to auto-fix linting issues
2. Run `yarn format` to format code
3. Review all changed files
4. Fix any remaining issues
5. Commit changes with clear message

**Acceptance Criteria**:
- [ ] No linting errors
- [ ] Code properly formatted
- [ ] All files reviewed
- [ ] Clear commit messages
- [ ] No unnecessary changes

**Files**: All modified files

**Commands**:
```bash
yarn lint:fix
yarn format
git add .
git commit -m "feat(accessibility): update accessibility statement with CaTH content

- Add Welsh route at /datganiad-hygyrchedd
- Update footer link to open in new tab with accessibility indicator
- Add back-to-top functionality
- Update content from provided specification
- Add comprehensive E2E tests
- Ensure WCAG 2.2 AA compliance

VIBE-236"
```

---

### Task 7.2: Create Pull Request
**Effort**: 30 minutes

**Description**:
Create comprehensive pull request with all changes and testing evidence.

**Steps**:
1. Push branch to remote
2. Create PR in GitHub
3. Write detailed description
4. Include testing evidence
5. Tag relevant reviewers
6. Link to VIBE-236 ticket

**PR Description Template**:
```markdown
## VIBE-236: CaTH Accessibility Statement Updates

### Summary
Updates the accessibility statement for the CaTH service with current content, adds Welsh-specific route, enhances footer link, and implements back-to-top functionality.

### Changes
- ✅ Created Welsh route at `/datganiad-hygyrchedd`
- ✅ Updated footer link to open in new tab with "(opens in new tab)" indicator
- ✅ Added back-to-top functionality to accessibility statement pages
- ✅ Updated English content with CaTH-specific information
- ✅ Updated Welsh content with accurate translations
- ✅ Added comprehensive E2E tests
- ✅ Verified WCAG 2.2 AA compliance

### Files Changed
- `libs/web-core/src/pages/accessibility-statement/en.ts` - Updated English content
- `libs/web-core/src/pages/accessibility-statement/cy.ts` - Updated Welsh content
- `libs/web-core/src/pages/accessibility-statement/index.ts` - Added backToTop property
- `libs/web-core/src/pages/accessibility-statement/index.njk` - Added back-to-top link
- `libs/web-core/src/pages/datganiad-hygyrchedd.ts` - NEW: Welsh route
- `libs/web-core/src/views/components/site-footer.njk` - Added new tab attributes
- `libs/web-core/src/locales/en.ts` - Updated footer link text
- `libs/web-core/src/locales/cy.ts` - Updated footer link text
- `apps/web/src/assets/js/index.ts` - Ensured back-to-top initialization
- `e2e-tests/accessibility-statement.spec.ts` - NEW: E2E tests

### Testing Evidence
- ✅ All unit tests passing
- ✅ All E2E tests passing
- ✅ Axe-core accessibility scan: 0 violations
- ✅ Screen reader tested (NVDA/VoiceOver)
- ✅ Keyboard navigation verified
- ✅ Cross-browser tested (Chrome, Firefox, Safari, Edge)
- ✅ Mobile tested (iOS Safari, Chrome Mobile)
- ✅ Performance: Lighthouse score > 90

### Accessibility Compliance
- ✅ WCAG 2.2 Level AA compliant
- ✅ GOV.UK Design System patterns followed
- ✅ Screen reader compatible
- ✅ Keyboard accessible
- ✅ Proper color contrast
- ✅ Responsive at all zoom levels and viewport widths

### Breaking Changes
None. The Welsh URL is new, existing `/accessibility-statement` route unchanged.

### Deployment Notes
No special deployment requirements. Changes are backward compatible.

### Screenshots
[Include screenshots of English and Welsh pages if possible]

### Ticket
Closes VIBE-236
```

**Acceptance Criteria**:
- [ ] PR created
- [ ] Description complete
- [ ] Testing evidence included
- [ ] Reviewers tagged
- [ ] CI checks passing
- [ ] Ticket linked

**Files**: N/A (GitHub PR)

---

### Task 7.3: Address Code Review Feedback
**Effort**: Variable (1-3 hours estimated)

**Description**:
Respond to and address any code review feedback from team members.

**Steps**:
1. Review feedback from reviewers
2. Discuss any questions or concerns
3. Make requested changes
4. Re-test affected areas
5. Push updates
6. Re-request review

**Acceptance Criteria**:
- [ ] All feedback addressed
- [ ] Questions answered
- [ ] Changes tested
- [ ] Reviewers satisfied
- [ ] Approval obtained

**Files**: Various (based on feedback)

---

### Task 7.4: Update Documentation
**Effort**: 30 minutes

**Description**:
Update any relevant documentation about the accessibility statement.

**Steps**:
1. Check if CHANGELOG exists
2. Add entry for accessibility statement updates
3. Update README if necessary
4. Document any new patterns used
5. Note content update process for future reference

**Acceptance Criteria**:
- [ ] CHANGELOG updated (if exists)
- [ ] README updated (if necessary)
- [ ] Patterns documented
- [ ] Future maintainers have clear guidance

**Files**:
- Update (if exists): `CHANGELOG.md`
- Update (if necessary): `README.md`

---

## Task Summary

### Total Tasks: 42

**By Phase**:
- Phase 1 (Content Extraction): 4 tasks
- Phase 2 (Welsh Route): 5 tasks
- Phase 3 (Back to Top): 4 tasks
- Phase 4 (Footer Link): 5 tasks
- Phase 5 (Content Updates): 4 tasks
- Phase 6 (Testing): 7 tasks
- Phase 7 (Documentation): 4 tasks

**By Type**:
- Implementation: 18 tasks
- Testing: 15 tasks
- Documentation: 5 tasks
- Review: 4 tasks

**Estimated Total Time**: 12-17 hours

---

## Task Dependencies

```
Phase 1: Content Extraction
├── Task 1.1 → Task 1.3
├── Task 1.2 → Task 1.3
└── Task 1.3 → Task 1.4 → Phase 5

Phase 2: Welsh Route
├── Task 2.1 → Task 2.3
├── Task 2.2 → Task 2.4
├── Task 2.3 → Task 2.5
└── Task 2.4 → Task 2.5

Phase 3: Back to Top
├── Task 3.1 → Task 3.3, Task 3.4
├── Task 3.2 → Task 3.3
└── Task 3.3 → Phase 6

Phase 4: Footer Link
├── Task 4.1 → Task 4.5
├── Task 4.2 → Task 4.4
├── Task 4.3 → Task 4.4
└── Task 4.4 → Task 4.5

Phase 5: Content Updates
├── Task 5.1 → Task 5.3, Task 5.4
├── Task 5.2 → Task 5.3, Task 5.4
└── Task 5.3 → Phase 6

Phase 6: Testing
├── All previous phases → Task 6.1-6.6
└── Task 6.1-6.6 → Task 6.7 → Phase 7

Phase 7: Documentation
├── Task 7.1 → Task 7.2
├── Task 7.2 → Task 7.3
└── Task 7.3 → Task 7.4
```

---

## Quick Reference: Files to Modify/Create

### Files to Create (3):
- `libs/web-core/src/pages/datganiad-hygyrchedd.ts`
- `libs/web-core/src/pages/datganiad-hygyrchedd.test.ts`
- `e2e-tests/accessibility-statement.spec.ts`

### Files to Update (10):
- `libs/web-core/src/pages/accessibility-statement/en.ts`
- `libs/web-core/src/pages/accessibility-statement/cy.ts`
- `libs/web-core/src/pages/accessibility-statement/index.ts`
- `libs/web-core/src/pages/accessibility-statement/index.njk`
- `libs/web-core/src/pages/accessibility-statement/index.test.ts`
- `libs/web-core/src/pages/accessibility-statement/index.njk.test.ts`
- `libs/web-core/src/views/components/site-footer.njk`
- `libs/web-core/src/locales/en.ts`
- `libs/web-core/src/locales/cy.ts`
- `apps/web/src/assets/js/index.ts` (verify/update if needed)

### Files to Possibly Update (Test Files):
- `libs/web-core/src/locales/en.test.ts`
- `libs/web-core/src/locales/cy.test.ts`
