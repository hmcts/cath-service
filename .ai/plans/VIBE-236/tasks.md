# Task Breakdown: VIBE-236

## Phase 1: Content Review and Verification

### Task 1.1: Review Testing Dates
**Priority**: High
**Estimate**: 30 minutes
**Status**: TODO

**Description**: Verify and update testing dates in accessibility statement content

**Steps**:
1. Review current dates in `libs/web-core/src/pages/accessibility-statement/en.ts` (lines 101-106)
2. Review current dates in `libs/web-core/src/pages/accessibility-statement/cy.ts` (lines 102-107)
3. Confirm with product owner if dates are accurate for CaTH service
4. Update if needed:
   - Statement preparation date
   - Last review date
   - Last testing date
   - Testing organization name

**Files to Modify**:
- `libs/web-core/src/pages/accessibility-statement/en.ts`
- `libs/web-core/src/pages/accessibility-statement/cy.ts`

**Acceptance Criteria**:
- [ ] Dates reflect actual CaTH service timeline
- [ ] English and Welsh dates match
- [ ] Testing organization is correct

---

### Task 1.2: Verify Contact Information
**Priority**: High
**Estimate**: 30 minutes
**Status**: TODO

**Description**: Verify contact details are correct for CaTH service

**Steps**:
1. Check email address: `enquiries@hmcts.gsi.gov.uk`
2. Check phone number: `0300 303 0642`
3. Check operating hours: "Monday to Friday, 9am to 5pm"
4. Confirm with HMCTS service team these are correct for CaTH
5. Update if needed in both English and Welsh files

**Files to Review**:
- `libs/web-core/src/pages/accessibility-statement/en.ts` (lines 34-36, 45-46)
- `libs/web-core/src/pages/accessibility-statement/cy.ts` (lines 35-37, 46-47)

**Acceptance Criteria**:
- [ ] Email address verified as correct
- [ ] Phone number verified as correct
- [ ] Operating hours verified
- [ ] Response time expectations accurate

---

### Task 1.3: Review Known Accessibility Issues
**Priority**: Medium
**Estimate**: 1 hour
**Status**: TODO

**Description**: Update known issues section with actual CaTH findings

**Steps**:
1. Review current generic issues in `en.ts` (lines 21-28)
2. Consult with accessibility team for CaTH-specific findings
3. Update list with actual issues if available
4. Ensure WCAG references are accurate (lines 72-78)
5. Update Welsh translation to match

**Files to Modify**:
- `libs/web-core/src/pages/accessibility-statement/en.ts`
- `libs/web-core/src/pages/accessibility-statement/cy.ts`

**Acceptance Criteria**:
- [ ] Issues reflect actual CaTH service findings
- [ ] WCAG 2.2 criterion references are accurate
- [ ] Both language versions are consistent

**Note**: If no audit has been completed yet, existing generic content is acceptable as placeholder.

---

## Phase 2: E2E Testing Implementation

### Task 2.1: Create E2E Test Suite
**Priority**: High
**Estimate**: 4 hours
**Status**: TODO

**Description**: Create comprehensive E2E tests for accessibility statement page

**Steps**:
1. Create file: `e2e-tests/tests/accessibility-statement.spec.ts`
2. Follow pattern from `e2e-tests/tests/cookie-management.spec.ts`
3. Implement test suite structure with describe blocks
4. Add imports for Playwright and expect

**File to Create**:
- `e2e-tests/tests/accessibility-statement.spec.ts`

**Acceptance Criteria**:
- [ ] File created with proper imports
- [ ] Test suite structure in place

---

### Task 2.2: Implement Basic Functionality Tests
**Priority**: High
**Estimate**: 1 hour
**Status**: TODO

**Description**: Test basic page loading and navigation

**Tests to Implement**:
```typescript
test.describe('Basic Functionality', () => {
  test('should load accessibility statement page', async ({ page }) => {
    await page.goto('/accessibility-statement');
    await expect(page).toHaveURL('/accessibility-statement');
    await expect(page.locator('h1')).toHaveText('Accessibility statement');
  });

  test('should navigate from footer link', async ({ page }) => {
    await page.goto('/');
    const footerLink = page.locator('footer a[href="/accessibility-statement"]');
    await expect(footerLink).toBeVisible();
    await footerLink.click();
    await expect(page).toHaveURL('/accessibility-statement');
  });
});
```

**Acceptance Criteria**:
- [ ] Page loads successfully
- [ ] Title is correct
- [ ] Footer link navigation works

---

### Task 2.3: Implement Content Structure Tests
**Priority**: High
**Estimate**: 1.5 hours
**Status**: TODO

**Description**: Verify all required content sections are present

**Tests to Implement**:
```typescript
test.describe('Content Structure', () => {
  test('should display all required sections', async ({ page }) => {
    await page.goto('/accessibility-statement');

    // Check main heading
    await expect(page.locator('h1')).toHaveText('Accessibility statement');

    // Check level 2 headings exist
    await expect(page.locator('h2:has-text("How accessible this website is")')).toBeVisible();
    await expect(page.locator('h2:has-text("Feedback and contact information")')).toBeVisible();
    await expect(page.locator('h2:has-text("Reporting accessibility problems")')).toBeVisible();
    await expect(page.locator('h2:has-text("Enforcement procedure")')).toBeVisible();
    await expect(page.locator('h2:has-text("Technical information")')).toBeVisible();
    await expect(page.locator('h2:has-text("Compliance status")')).toBeVisible();
    await expect(page.locator('h2:has-text("Non-accessible content")')).toBeVisible();
    await expect(page.locator('h2:has-text("What we\'re doing to improve accessibility")')).toBeVisible();
    await expect(page.locator('h2:has-text("Preparation of this accessibility statement")')).toBeVisible();
  });

  test('should have proper heading hierarchy', async ({ page }) => {
    await page.goto('/accessibility-statement');

    // Get all headings
    const h1Count = await page.locator('h1').count();
    const h2Count = await page.locator('h2').count();
    const h3Count = await page.locator('h3').count();

    // Should have exactly one h1
    expect(h1Count).toBe(1);

    // Should have multiple h2s
    expect(h2Count).toBeGreaterThan(5);

    // Should have some h3s for subsections
    expect(h3Count).toBeGreaterThan(0);
  });

  test('should display contact information', async ({ page }) => {
    await page.goto('/accessibility-statement');

    await expect(page.locator('text=enquiries@hmcts.gsi.gov.uk')).toBeVisible();
    await expect(page.locator('text=0300 303 0642')).toBeVisible();
  });
});
```

**Acceptance Criteria**:
- [ ] All section headings are present
- [ ] Heading hierarchy is correct
- [ ] Contact information is visible

---

### Task 2.4: Implement Welsh Language Tests
**Priority**: High
**Estimate**: 1 hour
**Status**: TODO

**Description**: Test Welsh language version of the page

**Tests to Implement**:
```typescript
test.describe('Welsh Language Support', () => {
  test('should display Welsh content', async ({ page }) => {
    await page.goto('/accessibility-statement?lng=cy');

    await expect(page.locator('h1')).toHaveText('Datganiad hygyrchedd');
  });

  test('should have Welsh section headings', async ({ page }) => {
    await page.goto('/accessibility-statement?lng=cy');

    await expect(page.locator('h2:has-text("Pa mor hygyrch yw\'r wefan hon")')).toBeVisible();
    await expect(page.locator('h2:has-text("Adborth a gwybodaeth gyswllt")')).toBeVisible();
  });

  test('should display contact information in Welsh', async ({ page }) => {
    await page.goto('/accessibility-statement?lng=cy');

    await expect(page.locator('text=E-bost: enquiries@hmcts.gsi.gov.uk')).toBeVisible();
    await expect(page.locator('text=Ffôn: 0300 303 0642')).toBeVisible();
  });
});
```

**Acceptance Criteria**:
- [ ] Welsh page loads correctly
- [ ] Welsh title is correct
- [ ] Welsh section headings are present

---

### Task 2.5: Implement Accessibility Tests
**Priority**: High
**Estimate**: 2 hours
**Status**: TODO

**Description**: Add automated accessibility validation

**Steps**:
1. Install or verify @axe-core/playwright is available
2. Implement accessibility tests

**Tests to Implement**:
```typescript
import { injectAxe, checkA11y } from 'axe-playwright';

test.describe('Accessibility Compliance', () => {
  test('should have no WCAG 2.2 AA violations', async ({ page }) => {
    await page.goto('/accessibility-statement');
    await injectAxe(page);
    await checkA11y(page, undefined, {
      detailedReport: true,
      detailedReportOptions: { html: true }
    });
  });

  test('should be keyboard navigable', async ({ page }) => {
    await page.goto('/accessibility-statement');

    // Tab through the page
    await page.keyboard.press('Tab');

    // Check first link has focus
    const firstLink = page.locator('a').first();
    await expect(firstLink).toBeFocused();

    // Continue tabbing to verify no keyboard traps
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('Tab');
    }

    // Should be able to tab backwards
    await page.keyboard.press('Shift+Tab');
  });

  test('should have proper ARIA landmarks', async ({ page }) => {
    await page.goto('/accessibility-statement');

    // Main content should be in a main landmark
    const main = page.locator('main');
    await expect(main).toBeVisible();

    // Check for proper heading structure
    const h1 = page.locator('h1');
    await expect(h1).toHaveAttribute('class');
  });
});
```

**Acceptance Criteria**:
- [ ] No axe-core violations detected
- [ ] Keyboard navigation works
- [ ] ARIA landmarks are correct

**Dependencies**:
- May need to install `@axe-core/playwright` or `axe-playwright`

---

### Task 2.6: Implement Progressive Enhancement Tests
**Priority**: Medium
**Estimate**: 30 minutes
**Status**: TODO

**Description**: Verify page works without JavaScript

**Tests to Implement**:
```typescript
test.describe('Progressive Enhancement', () => {
  test('should work without JavaScript', async ({ page, context }) => {
    // Disable JavaScript
    await context.setJavaScriptEnabled(false);

    await page.goto('/accessibility-statement');

    // Page should still load
    await expect(page.locator('h1')).toHaveText('Accessibility statement');

    // Content should be visible
    await expect(page.locator('h2:has-text("How accessible this website is")')).toBeVisible();
  });

  test('should have functional links without JavaScript', async ({ page, context }) => {
    await context.setJavaScriptEnabled(false);

    await page.goto('/accessibility-statement');

    // Check external link is present (don't click to avoid navigation)
    const abilityNetLink = page.locator('a[href*="abilitynet.org.uk"]');
    await expect(abilityNetLink).toBeVisible();
  });
});
```

**Acceptance Criteria**:
- [ ] Page loads without JavaScript
- [ ] All content is visible without JavaScript

---

### Task 2.7: Run E2E Tests
**Priority**: High
**Estimate**: 30 minutes
**Status**: TODO

**Description**: Execute E2E test suite and verify all tests pass

**Steps**:
1. Run `yarn test:e2e` to execute Playwright tests
2. Review test results
3. Fix any failing tests
4. Verify all tests pass consistently

**Acceptance Criteria**:
- [ ] All E2E tests pass
- [ ] No intermittent failures
- [ ] Test coverage is comprehensive

---

## Phase 3: Manual Accessibility Testing

### Task 3.1: Screen Reader Testing - NVDA
**Priority**: High
**Estimate**: 2 hours
**Status**: TODO

**Description**: Test page with NVDA screen reader on Windows

**Steps**:
1. Install NVDA if not available
2. Navigate to `/accessibility-statement`
3. Use NVDA to read page from top to bottom
4. Verify:
   - Heading navigation (H key)
   - Link navigation (K key)
   - Landmark navigation (D key)
   - All content is announced
   - No confusing or incorrect announcements

**Testing Checklist**:
- [ ] Page title announced correctly
- [ ] Heading structure makes sense
- [ ] All links have descriptive text
- [ ] Contact information is clear
- [ ] No unlabeled elements
- [ ] Language switching works

**Documentation**:
Document any issues found in a separate testing report.

---

### Task 3.2: Screen Reader Testing - VoiceOver
**Priority**: High
**Estimate**: 1.5 hours
**Status**: TODO

**Description**: Test page with VoiceOver on macOS/iOS

**Steps**:
1. Enable VoiceOver (Cmd+F5 on macOS)
2. Navigate to `/accessibility-statement`
3. Use VoiceOver to read page
4. Test rotor navigation
5. Verify all content is accessible

**Testing Checklist**:
- [ ] VoiceOver announces page correctly
- [ ] Rotor shows proper heading structure
- [ ] Links are accessible via rotor
- [ ] Content reads in logical order
- [ ] Welsh version works with VoiceOver

---

### Task 3.3: Keyboard Navigation Testing
**Priority**: High
**Estimate**: 1 hour
**Status**: TODO

**Description**: Test complete keyboard navigation of the page

**Steps**:
1. Navigate to `/accessibility-statement`
2. Use only keyboard (no mouse)
3. Tab through all interactive elements
4. Test with both English and Welsh versions

**Testing Checklist**:
- [ ] Tab order is logical
- [ ] Focus indicators are visible
- [ ] No keyboard traps
- [ ] Skip to content link works
- [ ] Can navigate footer links
- [ ] Back button accessible via keyboard

---

### Task 3.4: Visual Testing
**Priority**: Medium
**Estimate**: 1.5 hours
**Status**: TODO

**Description**: Test visual appearance and responsive design

**Steps**:
1. Test at different zoom levels (100%, 200%, 300%)
2. Test at different viewport widths (320px, 768px, 1024px, 1920px)
3. Test color contrast using Chrome DevTools
4. Test in Windows High Contrast Mode if available

**Testing Checklist**:
- [ ] Content readable at 300% zoom
- [ ] No horizontal scrolling at 320px width
- [ ] Text reflows properly
- [ ] Color contrast meets 4.5:1 (normal text)
- [ ] Color contrast meets 3:1 (large text)
- [ ] Readable in high contrast mode

---

### Task 3.5: Cross-Browser Testing
**Priority**: Medium
**Estimate**: 1 hour
**Status**: TODO

**Description**: Test page in multiple browsers

**Browsers to Test**:
- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Internet Explorer 11 (if required)

**Testing Checklist**:
- [ ] Page renders correctly in Chrome
- [ ] Page renders correctly in Firefox
- [ ] Page renders correctly in Safari
- [ ] Page renders correctly in Edge
- [ ] No console errors in any browser

---

## Phase 4: Welsh Translation Review

### Task 4.1: Welsh Translation Verification
**Priority**: High
**Estimate**: 2 hours
**Status**: TODO

**Description**: Have Welsh content reviewed by Welsh speaker

**Steps**:
1. Identify Welsh speaker on team or request review
2. Provide `libs/web-core/src/pages/accessibility-statement/cy.ts` for review
3. Provide English version for comparison
4. Request review of:
   - Translation accuracy
   - Natural Welsh language usage
   - Technical terminology correctness
   - Consistency with other HMCTS Welsh content

**Files to Review**:
- `libs/web-core/src/pages/accessibility-statement/cy.ts`

**Acceptance Criteria**:
- [ ] Welsh speaker confirms translation is accurate
- [ ] Any corrections made
- [ ] Technical terms verified as correct

---

## Phase 5: Final Verification and Documentation

### Task 5.1: Pre-Deployment Verification
**Priority**: High
**Estimate**: 1 hour
**Status**: TODO

**Description**: Final checks before deployment

**Verification Checklist**:
- [ ] All unit tests passing (`yarn test`)
- [ ] All E2E tests passing (`yarn test:e2e`)
- [ ] Content reviewed and approved
- [ ] Contact information verified
- [ ] Welsh translation reviewed
- [ ] Manual accessibility testing complete
- [ ] Screen reader testing complete
- [ ] Keyboard navigation tested
- [ ] Cross-browser testing complete
- [ ] No console errors
- [ ] Page loads in development environment

---

### Task 5.2: Create Testing Report
**Priority**: Medium
**Estimate**: 1 hour
**Status**: TODO

**Description**: Document testing results

**Steps**:
1. Create testing report document
2. Include results from:
   - Unit tests
   - E2E tests
   - Manual accessibility tests
   - Screen reader tests
   - Keyboard navigation tests
   - Visual tests
   - Cross-browser tests
3. Document any issues found and resolved
4. Document any remaining known issues

**Deliverable**:
- Testing report document

---

### Task 5.3: Update Documentation
**Priority**: Low
**Estimate**: 30 minutes
**Status**: TODO

**Description**: Update project documentation if needed

**Steps**:
1. Review if CLAUDE.md needs updates based on patterns used
2. Add note about accessibility statement maintenance schedule
3. Document content update process for future

**Acceptance Criteria**:
- [ ] CLAUDE.md updated if needed
- [ ] Maintenance process documented

---

## Summary of Tasks

### By Phase
- **Phase 1 (Content Review)**: 3 tasks, ~2 hours
- **Phase 2 (E2E Testing)**: 7 tasks, ~11 hours
- **Phase 3 (Manual Testing)**: 5 tasks, ~7 hours
- **Phase 4 (Welsh Review)**: 1 task, ~2 hours
- **Phase 5 (Verification)**: 3 tasks, ~2.5 hours

### By Priority
- **High Priority**: 12 tasks
- **Medium Priority**: 5 tasks
- **Low Priority**: 1 task

### Total Estimate
- **Optimistic**: 11 hours
- **Expected**: 18 hours
- **Pessimistic**: 24 hours

### Critical Path
1. Task 1.2 (Contact Verification)
2. Task 2.1 - 2.7 (E2E Testing)
3. Task 3.1 - 3.3 (Core Accessibility Testing)
4. Task 4.1 (Welsh Review)
5. Task 5.1 (Final Verification)

### Dependencies
- Tasks 2.2 - 2.7 depend on 2.1
- Task 5.1 depends on all testing tasks
- Welsh review (4.1) can happen in parallel with E2E testing

### Quick Wins
- Task 1.2: Contact verification (30 min)
- Task 3.3: Keyboard testing (1 hour)
- Task 5.3: Documentation (30 min)
