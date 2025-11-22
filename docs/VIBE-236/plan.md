# VIBE-236: Accessibility Statement Implementation Plan

## 1. Implementation Overview

This plan outlines the step-by-step approach to implementing the accessibility statement updates for the CaTH service. The work is organized into logical phases to minimize risk and ensure quality.

## 2. Prerequisites

### Required Access
- Repository write access
- Ability to run local development environment
- Access to content from DOCX file (manual extraction or stakeholder coordination)

### Required Tools
- Node.js and Yarn (already configured)
- Local development environment running
- Browser developer tools
- Screen reader software (NVDA, JAWS, or VoiceOver) for testing

### Knowledge Requirements
- GOV.UK Design System patterns
- WCAG 2.2 AA standards
- Nunjucks templating
- TypeScript/Express.js
- Playwright E2E testing

## 3. Implementation Phases

### Phase 1: Content Extraction and Preparation (1-2 hours)

**Objective**: Extract and structure accessibility statement content from DOCX file

#### Steps:
1. **Extract Content from DOCX**
   - Manually open and read the DOCX file
   - Copy all English content sections
   - Copy all Welsh content sections
   - Note any formatting, lists, or special structures

2. **Map Content to Existing Structure**
   - Review current structure in `en.ts` and `cy.ts`
   - Identify sections that need updating
   - Identify new sections that need adding
   - Note any sections to be removed

3. **Prepare Content Files**
   - Format extracted content as TypeScript objects
   - Maintain consistent structure between EN and CY
   - Preserve all lists, links, and formatting
   - Verify translation accuracy

4. **Review and Validation**
   - Have stakeholder verify English content
   - Have Welsh speaker verify Welsh content
   - Check for any missing information
   - Verify contact details and dates are current

**Deliverables**:
- Updated `en.ts` content ready to commit
- Updated `cy.ts` content ready to commit
- Content verification sign-off

**Risk Mitigation**:
- Keep backup of original content files
- Document any content changes in commit message
- Request stakeholder review before proceeding

---

### Phase 2: Welsh Route Implementation (2-3 hours)

**Objective**: Create dedicated Welsh route at `/datganiad-hygyrchedd`

#### Steps:

1. **Create Welsh Route Controller**
   ```bash
   # File: libs/web-core/src/pages/datganiad-hygyrchedd.ts
   ```

   Implementation:
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

2. **Update English Controller**
   Add `backToTop` string to English content:
   ```typescript
   // File: libs/web-core/src/pages/accessibility-statement/index.ts
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

3. **Verify Route Registration**
   Routes are auto-discovered from `libs/web-core/src/pages/`, so no manual registration needed

4. **Test Route Access**
   ```bash
   yarn dev
   # Navigate to http://localhost:3000/accessibility-statement
   # Navigate to http://localhost:3000/datganiad-hygyrchedd
   ```

**Deliverables**:
- New Welsh route controller file
- Updated English route controller
- Both routes accessible in local environment

**Testing**:
- [ ] `/accessibility-statement` loads English content
- [ ] `/datganiad-hygyrchedd` loads Welsh content
- [ ] Both pages render correctly
- [ ] No console errors

---

### Phase 3: Back to Top Implementation (1-2 hours)

**Objective**: Add back-to-top functionality to accessibility statement page

#### Steps:

1. **Update Template**
   ```bash
   # File: libs/web-core/src/pages/accessibility-statement/index.njk
   ```

   Add before closing `{% endblock %}`:
   ```nunjucks
   <div class="govuk-!-margin-top-8">
     <a href="#" class="govuk-link back-to-top-link">{{ backToTop }}</a>
   </div>
   ```

2. **Verify JavaScript is Loaded**
   Check that back-to-top JavaScript is initialized in application entry point:
   ```bash
   # File: apps/web/src/assets/js/index.ts
   ```

   Should include:
   ```typescript
   import { initBackToTop } from "@hmcts/web-core/src/assets/js/back-to-top.js";

   document.addEventListener("DOMContentLoaded", () => {
     initBackToTop();
   });
   ```

   If not present, add it.

3. **Test Functionality**
   - Scroll down on accessibility statement page
   - Click "Back to top" link
   - Verify smooth scroll to top
   - Test keyboard navigation (Tab to link, Enter to activate)

4. **Verify Accessibility**
   - Check focus indicator is visible
   - Test with screen reader
   - Verify no JavaScript errors in console

**Deliverables**:
- Updated template with back-to-top link
- JavaScript initialization confirmed
- Feature working in both languages

**Testing**:
- [ ] Link appears at bottom of page
- [ ] Clicking link scrolls to top
- [ ] Smooth scroll animation works
- [ ] Keyboard accessible
- [ ] Screen reader announces link correctly

---

### Phase 4: Footer Link Enhancement (1 hour)

**Objective**: Update footer link to open in new window with accessibility considerations

#### Steps:

1. **Update Footer Component**
   ```bash
   # File: libs/web-core/src/views/components/site-footer.njk
   ```

   Modify accessibility link (around line 19-22):
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

2. **Update Locale Strings**
   ```bash
   # File: libs/web-core/src/locales/en.ts
   ```
   ```typescript
   accessibility: "Accessibility statement (opens in new tab)"
   ```

   ```bash
   # File: libs/web-core/src/locales/cy.ts
   ```
   ```typescript
   accessibility: "Datganiad hygyrchedd (yn agor mewn tab newydd)"
   ```

3. **Test Link Behavior**
   - Click footer link
   - Verify it opens in new tab
   - Verify original tab remains open
   - Test in multiple browsers

4. **Verify Security Attributes**
   - Inspect link in browser DevTools
   - Confirm `rel="noopener noreferrer"` is present
   - Verify no console warnings

**Deliverables**:
- Updated footer component
- Updated locale strings
- Link opens in new tab securely

**Testing**:
- [ ] Link opens in new tab/window
- [ ] Link text indicates new window behavior
- [ ] `rel="noopener noreferrer"` present
- [ ] Works in all major browsers
- [ ] Screen reader announces "opens in new tab"

---

### Phase 5: Content Updates (2-3 hours)

**Objective**: Update accessibility statement content with information from DOCX

#### Steps:

1. **Update English Content**
   ```bash
   # File: libs/web-core/src/pages/accessibility-statement/en.ts
   ```

   Replace sections with content extracted in Phase 1:
   - Verify all section headings match
   - Update all body content
   - Update contact information
   - Update testing dates
   - Update compliance status
   - Preserve structure and formatting

2. **Update Welsh Content**
   ```bash
   # File: libs/web-core/src/pages/accessibility-statement/cy.ts
   ```

   Replace with translated content from Phase 1:
   - Maintain same structure as English
   - Verify translation accuracy
   - Check all lists have same number of items
   - Ensure contact details match English

3. **Verify Template Compatibility**
   - Check that template handles all content sections
   - Verify no missing fields cause errors
   - Test rendering of lists and nested content
   - Check all headings render at correct levels

4. **Content Review**
   - Read through entire English statement
   - Read through entire Welsh statement
   - Check for typos or formatting issues
   - Verify all links work
   - Confirm dates are current

**Deliverables**:
- Updated `en.ts` with new content
- Updated `cy.ts` with new content
- Content renders correctly in both languages
- Stakeholder approval of content

**Testing**:
- [ ] All sections display correctly
- [ ] Lists render properly
- [ ] Links are functional
- [ ] No missing or broken content
- [ ] Formatting is consistent
- [ ] Dates are current and accurate

---

### Phase 6: Testing and Quality Assurance (3-4 hours)

**Objective**: Comprehensive testing to ensure WCAG 2.2 AA compliance and functionality

#### 6.1 Automated Accessibility Testing

1. **Create Playwright E2E Test**
   ```bash
   # File: e2e-tests/accessibility-statement.spec.ts
   ```

   Test scenarios:
   - Navigation to English accessibility statement
   - Navigation to Welsh accessibility statement
   - Footer link opens in new tab
   - Back to top functionality
   - Language switching
   - axe-core accessibility scan

2. **Run Automated Tests**
   ```bash
   yarn test:e2e
   ```

   Fix any failures before proceeding.

#### 6.2 Manual Accessibility Testing

1. **Screen Reader Testing**
   - NVDA (Windows): Test page structure and navigation
   - JAWS (Windows): Verify content is readable
   - VoiceOver (Mac/iOS): Test on Safari

   Verify:
   - [ ] Page title announced correctly
   - [ ] Headings navigable with H key
   - [ ] All links described accurately
   - [ ] "Opens in new tab" announced for footer link
   - [ ] Back to top link clearly identified

2. **Keyboard Navigation Testing**
   - Tab through all interactive elements
   - Verify focus indicators visible
   - Test back to top with Enter key
   - Verify no keyboard traps
   - Test with Tab, Shift+Tab, Enter, Space

3. **Visual Testing**
   - Check color contrast (use browser DevTools or WAVE)
   - Verify text is readable at 200% zoom
   - Test at 400% zoom for mobile
   - Check page at 320px viewport width
   - Verify no horizontal scrolling
   - Test focus indicators are visible

4. **Browser Compatibility Testing**
   - Chrome: All features
   - Firefox: All features
   - Safari: All features
   - Edge: All features
   - Mobile Safari: Responsive and accessible
   - Chrome Mobile: Responsive and accessible

#### 6.3 Functional Testing

1. **Route Testing**
   - [ ] `/accessibility-statement` loads correctly
   - [ ] `/datganiad-hygyrchedd` loads correctly
   - [ ] 404 for invalid routes
   - [ ] Content matches language
   - [ ] No console errors

2. **Footer Link Testing**
   - [ ] Link visible in footer
   - [ ] Text includes "opens in new tab" indicator
   - [ ] Clicking opens new tab
   - [ ] Original tab remains unchanged
   - [ ] Link works on all pages

3. **Back to Top Testing**
   - [ ] Link appears at bottom of page
   - [ ] Clicking scrolls to top
   - [ ] Smooth scroll animation
   - [ ] Works with keyboard
   - [ ] Works on both language versions

4. **Content Testing**
   - [ ] All headings correct hierarchy (h1→h2→h3)
   - [ ] All lists render correctly
   - [ ] All links functional
   - [ ] Contact information correct
   - [ ] Dates accurate
   - [ ] No typos or formatting errors

#### 6.4 Performance Testing

1. **Page Load Performance**
   - Check Lighthouse score
   - Verify First Contentful Paint < 1.5s
   - Ensure Total Blocking Time < 200ms
   - Check Cumulative Layout Shift < 0.1

2. **Animation Performance**
   - Smooth scroll at 60fps
   - No janky animations
   - Respects prefers-reduced-motion

**Deliverables**:
- All automated tests passing
- Manual testing checklist completed
- No critical accessibility issues
- Performance metrics meet targets

---

### Phase 7: Documentation and Review (1-2 hours)

**Objective**: Document changes and prepare for code review

#### Steps:

1. **Update Tests**
   - Ensure all new functionality has tests
   - Update existing tests if needed
   - Verify test coverage for new code
   - Run `yarn test` to confirm all pass

2. **Code Review Preparation**
   - Run `yarn lint:fix` to fix linting issues
   - Run `yarn format` to format code
   - Review all changed files
   - Write clear commit messages

3. **Create PR Description**
   - List all changes made
   - Reference VIBE-236 ticket
   - Include testing evidence
   - Note any breaking changes

4. **Documentation Updates**
   - Update CHANGELOG if present
   - Document any new patterns used
   - Note content update process for future

**Deliverables**:
- Clean, linted code
- Comprehensive tests
- Clear PR description
- Documentation updated

---

## 4. Testing Strategy

### Unit Tests
Location: Co-located with source files (`*.test.ts`)

**New/Updated Tests**:
- `libs/web-core/src/pages/datganiad-hygyrchedd.test.ts`
- `libs/web-core/src/pages/accessibility-statement/index.test.ts`
- `libs/web-core/src/locales/en.test.ts`
- `libs/web-core/src/locales/cy.test.ts`

### E2E Tests
Location: `e2e-tests/accessibility-statement.spec.ts`

**Test Scenarios**:
```typescript
describe('Accessibility Statement', () => {
  test('English route loads and displays content', async ({ page }) => {
    await page.goto('/accessibility-statement');
    await expect(page.locator('h1')).toContainText('Accessibility statement');
  });

  test('Welsh route loads and displays content', async ({ page }) => {
    await page.goto('/datganiad-hygyrchedd');
    await expect(page.locator('h1')).toContainText('Datganiad hygyrchedd');
  });

  test('Footer link opens in new tab', async ({ page, context }) => {
    await page.goto('/');
    const [newPage] = await Promise.all([
      context.waitForEvent('page'),
      page.locator('footer >> text=Accessibility statement').click()
    ]);
    expect(newPage.url()).toContain('/accessibility-statement');
  });

  test('Back to top scrolls to page top', async ({ page }) => {
    await page.goto('/accessibility-statement');
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.locator('.back-to-top-link').click();
    await expect(page.evaluate(() => window.scrollY)).resolves.toBe(0);
  });

  test('Meets WCAG 2.2 AA standards', async ({ page }) => {
    await page.goto('/accessibility-statement');
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });
});
```

### Accessibility Testing Checklist

**Automated Testing** (via Playwright + axe-core):
- [ ] No WCAG 2.2 Level A violations
- [ ] No WCAG 2.2 Level AA violations
- [ ] Color contrast meets 4.5:1 minimum
- [ ] All images have alt text
- [ ] Form elements have labels
- [ ] Page has valid HTML structure

**Manual Testing**:
- [ ] Screen reader navigation (NVDA/JAWS/VoiceOver)
- [ ] Keyboard-only navigation
- [ ] Focus indicators visible
- [ ] Zoom to 200% and 400%
- [ ] 320px viewport (mobile)
- [ ] Prefers-reduced-motion respected

---

## 5. Rollback Plan

In case of issues post-deployment:

### Immediate Rollback
1. Revert the deployment commit
2. Re-deploy previous version
3. Verify old version working

### Partial Rollback
If only specific features are problematic:

1. **Footer link issues**:
   - Remove `target="_blank"` and `attributes`
   - Keep link text without "(opens in new tab)"

2. **Welsh route issues**:
   - Remove `datganiad-hygyrchedd.ts`
   - Keep original accessibility-statement with i18n

3. **Back to top issues**:
   - Remove back-to-top link from template
   - Keep rest of changes

4. **Content issues**:
   - Revert `en.ts` and `cy.ts` to previous versions
   - Keep structural changes

---

## 6. Timeline Estimate

**Total Estimated Time**: 12-17 hours

| Phase | Duration | Dependencies |
|-------|----------|--------------|
| Phase 1: Content Extraction | 1-2 hours | Access to DOCX file, stakeholder availability |
| Phase 2: Welsh Route | 2-3 hours | Phase 1 complete |
| Phase 3: Back to Top | 1-2 hours | Phase 2 complete |
| Phase 4: Footer Link | 1 hour | Phase 2 complete |
| Phase 5: Content Updates | 2-3 hours | Phase 1 complete |
| Phase 6: Testing | 3-4 hours | All phases complete |
| Phase 7: Documentation | 1-2 hours | Phase 6 complete |

**Recommended Schedule**:
- **Day 1 Morning**: Phases 1-2 (Content + Welsh Route)
- **Day 1 Afternoon**: Phases 3-4 (Back to Top + Footer)
- **Day 2 Morning**: Phase 5 (Content Updates)
- **Day 2 Afternoon**: Phase 6 (Testing)
- **Day 3 Morning**: Phase 7 (Documentation + Review)

---

## 7. Risk Assessment

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| DOCX content unavailable | High | Low | Work with stakeholder to extract manually |
| Welsh translation incorrect | High | Medium | Have native speaker review |
| New window pattern causes confusion | Medium | Medium | Document reason, make text clear |
| Breaking change to Welsh URLs | Medium | Low | Add redirect from old format |
| Back-to-top interferes with other JS | Low | Low | Test thoroughly, use namespaced selectors |
| Footer macro doesn't support attributes | Medium | Low | Verify GOV.UK Frontend version, fallback to custom footer |
| Performance regression | Low | Low | Run Lighthouse before/after |
| Screen reader compatibility issues | High | Medium | Test with multiple screen readers |

---

## 8. Dependencies

### External Dependencies
- GOV.UK Frontend 5.2.0+ (already installed)
- Nunjucks 3.2.4+ (already installed)
- Express 5.1.0 (already installed)
- Playwright for E2E tests (already installed)

### Internal Dependencies
- `@hmcts/web-core` module structure
- `@hmcts/simple-router` for route registration
- Application i18n middleware
- Session management for language switching

### Stakeholder Dependencies
- Content approval from product owner
- Welsh translation verification
- Accessibility audit approval (optional, post-implementation)

---

## 9. Success Criteria

Implementation is complete when:

1. **Functional Requirements Met**:
   - [ ] English route working at `/accessibility-statement`
   - [ ] Welsh route working at `/datganiad-hygyrchedd`
   - [ ] Footer link opens in new tab
   - [ ] Back to top functionality works
   - [ ] Content updated from DOCX file

2. **Quality Standards Met**:
   - [ ] All automated tests passing
   - [ ] No WCAG 2.2 AA violations
   - [ ] Code review approved
   - [ ] Linting clean
   - [ ] Performance metrics acceptable

3. **Stakeholder Acceptance**:
   - [ ] Content approved
   - [ ] Welsh translation verified
   - [ ] Product owner sign-off

---

## 10. Post-Implementation Tasks

After deployment:

1. **Monitor Analytics**:
   - Track visits to accessibility statement
   - Monitor new tab opens (if tracked)
   - Check back-to-top usage

2. **User Feedback**:
   - Monitor support tickets
   - Check for accessibility complaints
   - Note any usability issues

3. **Future Improvements**:
   - Consider removing new-window pattern if causing issues
   - Add sitemap entry for Welsh route
   - Consider adding hreflang tags
   - Plan regular content review cycle

4. **Documentation Maintenance**:
   - Update accessibility statement dates annually
   - Review compliance status regularly
   - Keep testing methodology current
