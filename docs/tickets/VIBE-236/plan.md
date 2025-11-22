# VIBE-236: CaTH General Information - Accessibility Statement
## Technical Implementation Plan

## Executive Summary

The accessibility statement page already exists in the codebase at `/libs/web-core/src/pages/accessibility-statement/`. This ticket focuses on updating the existing implementation to comply with VIBE-236 requirements, particularly:

1. **Content updates** - Align with CaTH-specific accessibility statement content
2. **"Back to Top" functionality** - Already implemented in web-core
3. **Footer link** - Already present but needs verification
4. **Welsh translation** - Already implemented via i18n middleware
5. **Testing** - Add E2E tests for accessibility statement

The main work involves **content updates** and **comprehensive testing** rather than creating new infrastructure.

---

## Current Implementation Analysis

### Existing Infrastructure ✅

**1. Page Controller**
- **Location**: `/libs/web-core/src/pages/accessibility-statement/index.ts`
- **Status**: ✅ Implemented
- **Route**: `/accessibility-statement`
- **Pattern**: Standard GOV.UK page controller with GET handler

**2. Nunjucks Template**
- **Location**: `/libs/web-core/src/pages/accessibility-statement/index.njk`
- **Status**: ✅ Implemented
- **Extends**: `layouts/base-template.njk`
- **Structure**: Semantic HTML with proper heading hierarchy

**3. Bilingual Content**
- **English**: `/libs/web-core/src/pages/accessibility-statement/en.ts`
- **Welsh**: `/libs/web-core/src/pages/accessibility-statement/cy.ts`
- **Status**: ✅ Implemented
- **i18n Support**: Automatic via `renderInterceptorMiddleware`
- **Language Toggle**: Automatic via `?lng=cy` / `?lng=en` query parameters

**4. Footer Link**
- **Location**: `/libs/web-core/src/views/components/site-footer.njk`
- **Status**: ✅ Implemented at line 20-22
- **Current Implementation**:
  ```nunjucks
  {
    href: "/accessibility-statement",
    text: footer.accessibility
  }
  ```
- **Translation**: `footer.accessibility` from `/libs/web-core/src/locales/en.ts` and `cy.ts`

**5. "Back to Top" Component**
- **JavaScript**: `/libs/web-core/src/assets/js/back-to-top.ts`
- **Styles**: `/libs/web-core/src/assets/css/back-to-top.scss`
- **Status**: ✅ Fully implemented with tests
- **Functionality**: Smooth scroll to top with progressive enhancement

**6. Unit Tests**
- **Controller Tests**: `/libs/web-core/src/pages/accessibility-statement/index.test.ts`
- **Template Tests**: `/libs/web-core/src/pages/accessibility-statement/index.njk.test.ts`
- **Back to Top Tests**: `/libs/web-core/src/assets/js/back-to-top.test.ts`
- **Status**: ✅ Comprehensive unit test coverage

---

## Gap Analysis

### Missing Implementations ⚠️

**1. E2E Tests** ❌
- No Playwright E2E tests for accessibility statement page
- Need to test full user journey including:
  - Page load and content display
  - Language toggle (EN ↔ CY)
  - Footer link navigation
  - Back to Top functionality
  - Keyboard navigation
  - WCAG 2.2 AA compliance (axe-core)
  - Responsive design

**2. Content Alignment** ⚠️
- Current content is generic HMCTS
- VIBE-236 specifies CaTH-specific content:
  - Domain: `court-tribunal-hearings.service.gov.uk`
  - Contact: `publicationsinformation@justice.gov.uk` / `0300 303 0656`
  - Hours: Monday–Friday, 8am–5pm
  - Audit dates: Prepared 8 Sep 2023, Reviewed 6 Mar 2025, Audited 18 Nov 2024
  - WCAG 2.2 AA compliance (current shows 2.1)

**3. Footer Link Behavior** ⚠️
- Specification requires opening in new tab/window (`target="_blank"`)
- Current implementation opens in same window
- Need to add `rel="noopener noreferrer"` for security
- Need to add ARIA label: `aria-label="Accessibility statement (opens in a new window)"`

**4. Back to Top on Accessibility Statement Page** ⚠️
- "Back to Top" component exists but may not be rendered on accessibility statement page
- Need to verify and add if missing

**5. Welsh URL Route** ❓
- Specification mentions `/datganiad-hygyrchedd` URL for Welsh
- Current implementation uses single route with `?lng=cy` query parameter
- **Decision needed**: Keep query parameter approach or add dedicated Welsh route?

---

## Technical Architecture

### 1. Route Handling

**Current Implementation**
```
/accessibility-statement          → English by default
/accessibility-statement?lng=cy   → Welsh version
/accessibility-statement?lng=en   → English version (explicit)
```

**Specification Requirement**
```
/accessibility-statement          → English
/datganiad-hygyrchedd            → Welsh
```

**Recommendation**: Keep current implementation
- **Rationale**:
  - Consistent with codebase patterns (see landing page E2E tests)
  - Simpler maintenance (single route)
  - Language toggle already works seamlessly
  - All other pages use `?lng=cy` approach
  - Footer link can still have different text per language

### 2. Content Structure

**Content Sections** (10 total, as per specification)

1. **Accessibility statement header**
   - Service domain and purpose
   - Commitment to accessibility

2. **How accessible this website is**
   - List of accessible features
   - Known issues

3. **Feedback and contact information**
   - Alternative formats
   - Contact details (email, phone, hours)
   - Response time (5 working days)

4. **Reporting accessibility problems**
   - How to report issues
   - Contact information

5. **Enforcement procedure**
   - EHRC responsibility
   - EASS contact

6. **Technical information**
   - Compliance commitment
   - Regulations reference

7. **Compliance status**
   - WCAG 2.2 AA partial compliance

8. **Non-accessible content**
   - Non-compliance items
   - Disproportionate burden (N/A)
   - Out of scope content (PDFs)

9. **What we're doing to improve accessibility**
   - Ongoing improvements

10. **Preparation of this accessibility statement**
    - Prepared: 8 September 2023
    - Reviewed: 6 March 2025
    - Audited: 18 November 2024

### 3. Footer Link Enhancement

**Current Implementation** (site-footer.njk)
```nunjucks
{
  href: "/accessibility-statement",
  text: footer.accessibility
}
```

**Required Implementation**
```nunjucks
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

**Locale Updates Required**

`/libs/web-core/src/locales/en.ts`:
```typescript
footer: {
  accessibility: "Accessibility statement",
  accessibilityAriaLabel: "Accessibility statement (opens in a new window)"
  // ... other footer items
}
```

`/libs/web-core/src/locales/cy.ts`:
```typescript
footer: {
  accessibility: "Datganiad hygyrchedd",
  accessibilityAriaLabel: "Datganiad hygyrchedd (yn agor mewn ffenestr newydd)"
  // ... other footer items
}
```

### 4. Back to Top Implementation

**Option A: Add to Base Template** (Recommended)
- Modify `/libs/web-core/src/views/layouts/base-template.njk`
- Add Back to Top link before footer
- Conditionally show based on content length

**Option B: Add to Accessibility Statement Template**
- Modify `/libs/web-core/src/pages/accessibility-statement/index.njk`
- Add at end of `page_content` block
- Only appears on accessibility statement

**Recommended Approach**: Option B (Page-Specific)
- **Rationale**: Specification only requires it on accessibility statement
- Less risk of affecting other pages
- Easier to test and maintain

**Template Addition**:
```nunjucks
{% block page_content %}
  <!-- Existing content sections -->

  <a href="#" class="back-to-top-link" aria-label="{{ backToTopAriaLabel }}">
    <span aria-hidden="true">▴ </span>{{ backToTopText }}
  </a>
{% endblock %}
```

**Content Updates**:

`en.ts`:
```typescript
export const en = {
  title: "Accessibility statement",
  backToTopText: "Back to Top",
  backToTopAriaLabel: "Back to top of page",
  // ... sections
};
```

`cy.ts`:
```typescript
export const cy = {
  title: "Datganiad hygyrchedd",
  backToTopText: "Yn ôl i frig y dudalen",
  backToTopAriaLabel: "Yn ôl i frig y dudalen",
  // ... sections
};
```

### 5. JavaScript Initialization

The back-to-top functionality is already exported and needs to be initialized on page load.

**Verify in**: `/apps/web/src/assets/js/index.ts` or equivalent entry point

```typescript
import { initBackToTop } from "@hmcts/web-core/src/assets/js/back-to-top.js";

document.addEventListener("DOMContentLoaded", () => {
  initBackToTop();
});
```

---

## Content Updates Required

### Contact Information Changes

**Current Content** (needs updating):
- Email: `enquiries@hmcts.gsi.gov.uk`
- Phone: `0300 303 0642`
- Hours: Monday–Friday, 9am–5pm

**New Content** (per VIBE-236):
- Email: `publicationsinformation@justice.gov.uk`
- Phone: `0300 303 0656`
- Hours: Monday–Friday, 8am–5pm

### Service Domain

**Current**: Generic "this service"
**New**: "court-tribunal-hearings.service.gov.uk"

### WCAG Version

**Current**: WCAG 2.1 AA
**New**: WCAG 2.2 AA

### Dates

**Current**:
- Prepared: 23 September 2019
- Reviewed: 23 September 2024
- Tested: 1 September 2024 by DAC

**New** (per specification):
- Prepared: 8 September 2023
- Reviewed: 6 March 2025
- Audited: 18 November 2024

### Accessibility Issues

**Current**: Generic issues list
**New**: CaTH-specific issues (flat file PDFs, untitled pages, etc.)

---

## Implementation Tasks

### Phase 1: Content Updates ✏️

**Files to Modify**:
1. `/libs/web-core/src/pages/accessibility-statement/en.ts`
2. `/libs/web-core/src/pages/accessibility-statement/cy.ts`

**Changes**:
- [ ] Update service domain reference
- [ ] Update contact email to `publicationsinformation@justice.gov.uk`
- [ ] Update phone to `0300 303 0656`
- [ ] Update hours to 8am–5pm
- [ ] Update WCAG version to 2.2 AA
- [ ] Update preparation dates (8 Sep 2023, 6 Mar 2025, 18 Nov 2024)
- [ ] Update accessibility issues to match CaTH specifics
- [ ] Add Back to Top text and ARIA label

### Phase 2: Footer Link Enhancement 🔗

**Files to Modify**:
1. `/libs/web-core/src/views/components/site-footer.njk`
2. `/libs/web-core/src/locales/en.ts`
3. `/libs/web-core/src/locales/cy.ts`

**Changes**:
- [ ] Add `target="_blank"` to accessibility statement link
- [ ] Add `rel="noopener noreferrer"` for security
- [ ] Add `aria-label` with "opens in new window" text
- [ ] Add `accessibilityAriaLabel` to EN locale
- [ ] Add `accessibilityAriaLabel` to CY locale

### Phase 3: Back to Top Integration ⬆️

**Files to Modify**:
1. `/libs/web-core/src/pages/accessibility-statement/index.njk`

**Changes**:
- [ ] Add Back to Top link at end of page content
- [ ] Use existing `.back-to-top-link` CSS class
- [ ] Include upward arrow icon (`▴`)
- [ ] Add ARIA label from content
- [ ] Verify initBackToTop() is called on page load

### Phase 4: E2E Testing 🧪

**New File**: `/e2e-tests/tests/accessibility-statement.spec.ts`

**Test Coverage**:

**Content Display**:
- [ ] Page loads at `/accessibility-statement`
- [ ] Displays correct page title "Accessibility statement"
- [ ] Shows all 10 content sections with proper headings
- [ ] Contact details are correct (email, phone, hours)
- [ ] Audit dates are visible and correct
- [ ] Back to Top link is visible at bottom

**Welsh Language Support**:
- [ ] Switch to Welsh via `?lng=cy`
- [ ] Page title becomes "Datganiad hygyrchedd"
- [ ] All content displays in Welsh
- [ ] Back to Top text in Welsh "Yn ôl i frig y dudalen"
- [ ] Contact details remain the same (not translated)

**Footer Link**:
- [ ] Footer link visible on all pages
- [ ] Footer link text is "Accessibility statement" (EN)
- [ ] Footer link text is "Datganiad hygyrchedd" (CY)
- [ ] Link opens in new tab/window (`target="_blank"`)
- [ ] Link has `rel="noopener noreferrer"`
- [ ] Link has descriptive ARIA label

**Back to Top Functionality**:
- [ ] Back to Top link is clickable
- [ ] Clicking scrolls smoothly to top
- [ ] Arrow icon is visible
- [ ] Works with keyboard (Tab + Enter)
- [ ] ARIA label is present

**Accessibility Compliance**:
- [ ] Passes WCAG 2.2 AA axe-core scan
- [ ] Logical heading hierarchy (single h1, proper h2/h3/h4)
- [ ] All interactive elements are keyboard accessible
- [ ] Color contrast meets AA standards
- [ ] Screen reader compatible (ARIA labels present)

**Responsive Design**:
- [ ] Mobile viewport (375x667)
- [ ] Tablet viewport (768x1024)
- [ ] Desktop viewport (1920x1080)

**Cross-Browser Testing** (via Playwright):
- [ ] Chromium
- [ ] Firefox
- [ ] WebKit (Safari)

### Phase 5: Unit Test Updates 🔬

**Files to Modify**:
1. `/libs/web-core/src/pages/accessibility-statement/index.test.ts`
2. `/libs/web-core/src/pages/accessibility-statement/index.njk.test.ts`

**New Test Cases**:
- [ ] Verify Back to Top text in EN locale
- [ ] Verify Back to Top text in CY locale
- [ ] Verify updated contact details
- [ ] Verify WCAG 2.2 AA reference
- [ ] Verify CaTH service domain reference

---

## Testing Strategy

### 1. Unit Tests (Vitest)

**Location**: `/libs/web-core/src/pages/accessibility-statement/`

**Coverage**:
- Controller renders correct template ✅ (existing)
- Content structure validation ✅ (existing)
- English/Welsh locale consistency ✅ (existing)
- Back to Top content validation ➕ (new)
- Contact details validation ➕ (new)

**Run Command**:
```bash
yarn test libs/web-core/src/pages/accessibility-statement
```

### 2. Template Tests (Vitest)

**Location**: `/libs/web-core/src/pages/accessibility-statement/`

**Coverage**:
- Template file exists ✅ (existing)
- Required sections present ✅ (existing)
- Back to Top element present ➕ (new)

**Run Command**:
```bash
yarn test libs/web-core/src/pages/accessibility-statement/index.njk.test.ts
```

### 3. E2E Tests (Playwright)

**Location**: `/e2e-tests/tests/accessibility-statement.spec.ts`

**Test Structure** (following landing-page.spec.ts pattern):

```typescript
import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.describe("Accessibility Statement Page", () => {
  test.describe("Content Display", () => {
    // Test cases for content sections
  });

  test.describe("Welsh Language Support", () => {
    // Test cases for language toggle
  });

  test.describe("Footer Link", () => {
    // Test cases for footer link behavior
  });

  test.describe("Back to Top", () => {
    // Test cases for Back to Top functionality
  });

  test.describe("Accessibility", () => {
    test("should meet WCAG 2.2 AA standards", async ({ page }) => {
      await page.goto("/accessibility-statement");
      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
        .analyze();
      expect(accessibilityScanResults.violations).toEqual([]);
    });
  });

  test.describe("Keyboard Navigation", () => {
    // Test cases for keyboard accessibility
  });

  test.describe("Responsive Design", () => {
    // Test cases for different viewports
  });
});
```

**Run Command**:
```bash
yarn test:e2e accessibility-statement
```

### 4. Accessibility Testing (Manual)

**Tools**:
- WAVE browser extension
- axe DevTools browser extension
- NVDA screen reader (Windows)
- JAWS screen reader (Windows)
- VoiceOver (macOS)

**Test Cases**:
- Tab through all interactive elements
- Navigate with screen reader
- Test with 200% browser zoom
- Test with Windows High Contrast mode
- Test with reduced motion preference

---

## File Structure Summary

```
libs/web-core/
├── src/
│   ├── pages/
│   │   └── accessibility-statement/
│   │       ├── index.ts                 ✏️ No changes needed
│   │       ├── index.njk                ✏️ Add Back to Top link
│   │       ├── en.ts                    ✏️ Update content
│   │       ├── cy.ts                    ✏️ Update content
│   │       ├── index.test.ts            ✏️ Add new test cases
│   │       └── index.njk.test.ts        ✏️ Add Back to Top test
│   ├── locales/
│   │   ├── en.ts                        ✏️ Add accessibilityAriaLabel
│   │   └── cy.ts                        ✏️ Add accessibilityAriaLabel
│   ├── views/
│   │   └── components/
│   │       └── site-footer.njk          ✏️ Add target, rel, aria-label
│   └── assets/
│       ├── js/
│       │   └── back-to-top.ts           ✅ Already implemented
│       └── css/
│           └── back-to-top.scss         ✅ Already implemented
│
e2e-tests/
└── tests/
    └── accessibility-statement.spec.ts  ➕ New file

apps/web/
└── src/
    └── assets/
        └── js/
            └── index.ts                 ✅ Verify initBackToTop() called
```

**Legend**:
- ✅ Already implemented, no changes needed
- ✏️ Needs modification
- ➕ New file to create

---

## Accessibility Compliance Checklist

### WCAG 2.2 AA Requirements

**Perceivable**:
- [ ] 1.1.1 Non-text Content: All images have alt text
- [ ] 1.3.1 Info and Relationships: Semantic HTML with proper headings
- [ ] 1.4.3 Contrast (Minimum): AA contrast ratios (4.5:1 for normal text)
- [ ] 1.4.10 Reflow: Content reflows at 320px without horizontal scroll
- [ ] 1.4.11 Non-text Contrast: UI components have 3:1 contrast
- [ ] 1.4.12 Text Spacing: User can adjust line height and spacing

**Operable**:
- [ ] 2.1.1 Keyboard: All functionality available via keyboard
- [ ] 2.1.2 No Keyboard Trap: Focus can move away from all elements
- [ ] 2.4.1 Bypass Blocks: Skip link to main content
- [ ] 2.4.3 Focus Order: Logical tab order
- [ ] 2.4.6 Headings and Labels: Descriptive headings and labels
- [ ] 2.4.7 Focus Visible: Keyboard focus indicator visible
- [ ] 2.5.8 Target Size (Minimum): Interactive elements ≥24x24px

**Understandable**:
- [ ] 3.1.1 Language of Page: `lang` attribute on html element
- [ ] 3.1.2 Language of Parts: Welsh content marked with `lang="cy"`
- [ ] 3.2.2 On Input: No unexpected context changes
- [ ] 3.3.1 Error Identification: Clear error messages (N/A for static page)
- [ ] 3.3.2 Labels or Instructions: Form labels present (N/A for static page)

**Robust**:
- [ ] 4.1.2 Name, Role, Value: ARIA attributes on interactive elements
- [ ] 4.1.3 Status Messages: ARIA live regions where appropriate (N/A)

### GOV.UK Service Standard Compliance

- [ ] Point 5: Make sure everyone can use the service (accessibility)
- [ ] Point 9: Create a secure service (rel="noopener noreferrer")
- [ ] Point 12: Make new source code open (already public)
- [ ] Point 13: Use and contribute to open standards (WCAG 2.2 AA)

---

## Security Considerations

### Footer Link Security

**Issue**: `target="_blank"` without `rel="noopener noreferrer"` creates security vulnerability

**Risk**:
- Opened page can access `window.opener`
- Potential phishing attacks
- Performance issues (shared process)

**Mitigation**: Add `rel="noopener noreferrer"` attribute

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

### Content Security Policy

Verify accessibility statement page complies with CSP headers:
- No inline scripts (use nonce)
- No inline styles (use classes)
- External links have appropriate rel attributes

---

## Performance Considerations

### Page Load Time

**Target**: < 2 seconds on 3G connection

**Optimizations**:
- Static content (no API calls)
- Minimal JavaScript (only Back to Top)
- CSS already bundled in main stylesheet
- No images or heavy media

### JavaScript Bundle Size

**Back to Top module**: ~300 bytes (minified + gzipped)
- Already included in web-core bundle
- Progressive enhancement (works without JS)

### CSS Bundle Size

**Back to Top styles**: ~200 bytes (minified + gzipped)
- Already included in web-core bundle
- Scoped to `.back-to-top-link` class

---

## Browser Compatibility

### Supported Browsers (GOV.UK Standard)

**Desktop**:
- Chrome (latest 2 versions)
- Firefox (latest 2 versions)
- Safari (latest 2 versions)
- Edge (latest 2 versions)
- Internet Explorer 11 ⚠️ (if still required)

**Mobile**:
- iOS Safari (latest 2 versions)
- Chrome for Android (latest version)
- Samsung Internet (latest version)

**Assistive Technologies**:
- JAWS (latest version)
- NVDA (latest version)
- VoiceOver (macOS/iOS latest)
- Dragon NaturallySpeaking

### Progressive Enhancement

**Core Functionality** (works without JavaScript):
- Content display ✅
- Language toggle ✅
- Footer links ✅
- Semantic HTML structure ✅

**Enhanced Functionality** (requires JavaScript):
- Smooth scroll to top (degrades to instant scroll) ✅
- Back to Top link visibility (could be shown by default) ✅

---

## Deployment Strategy

### Pre-Deployment Checklist

- [ ] All unit tests pass (`yarn test`)
- [ ] All E2E tests pass (`yarn test:e2e`)
- [ ] Accessibility scan passes (no violations)
- [ ] Manual testing completed
- [ ] Content reviewed by stakeholders
- [ ] Welsh translation verified by native speaker

### Deployment Steps

1. **Build**: `yarn build`
2. **Run tests**: `yarn test && yarn test:e2e`
3. **Deploy to staging**: Verify functionality
4. **Accessibility audit**: Run WAVE/axe on staging
5. **User acceptance testing**: Stakeholder review
6. **Deploy to production**
7. **Post-deployment smoke test**: Verify page loads

### Rollback Plan

If issues discovered post-deployment:
1. Revert to previous version via git
2. Rebuild and redeploy
3. Investigate issues in lower environment

---

## Maintenance & Updates

### Content Update Process

**Frequency**: Review every 6 months or when material changes occur

**Stakeholders**:
- Accessibility team
- Legal team
- Content designers

**Files to Update**:
- `/libs/web-core/src/pages/accessibility-statement/en.ts`
- `/libs/web-core/src/pages/accessibility-statement/cy.ts`

**Trigger Events**:
- New accessibility audit
- Changes to service functionality
- Updates to WCAG standards
- Contact detail changes

### Monitoring

**Metrics to Track**:
- Page views (analytics)
- Time on page (analytics)
- Accessibility report submissions (support tickets)
- User satisfaction (feedback surveys)

---

## Open Questions / Decisions Required

### 1. Welsh URL Route ❓

**Question**: Should we implement `/datganiad-hygyrchedd` as a separate route or continue using `?lng=cy`?

**Current**: Single route with query parameter
**Spec**: Mentions separate Welsh URL

**Options**:
- **A**: Keep current implementation (`/accessibility-statement?lng=cy`)
  - **Pros**: Consistent with codebase, simpler maintenance
  - **Cons**: Doesn't match specification exactly

- **B**: Add separate Welsh route (`/datganiad-hygyrchedd`)
  - **Pros**: Matches specification, better SEO
  - **Cons**: More complex routing, duplicate controller code

**Recommendation**: Option A (keep current)
**Rationale**: All other pages in CaTH use query parameter approach. Changing one page would be inconsistent.

**Decision**: ⏳ Awaiting stakeholder confirmation

### 2. Footer Link Behavior ❓

**Question**: Should accessibility statement always open in new tab, or only from certain pages?

**Current**: Opens in same window
**Spec**: Opens in new tab/window

**Options**:
- **A**: Always open in new tab (globally)
  - **Pros**: Consistent behavior, matches spec
  - **Cons**: May be unexpected for users

- **B**: Open in same tab (current behavior)
  - **Pros**: Standard web behavior, user control
  - **Cons**: Doesn't match specification

**Recommendation**: Option A (new tab)
**Rationale**: Specification explicitly requires it

**Decision**: ⏳ Awaiting stakeholder confirmation

### 3. Back to Top Placement ❓

**Question**: Should "Back to Top" appear on all pages or just accessibility statement?

**Current**: Not visible on any pages
**Spec**: Required on accessibility statement

**Options**:
- **A**: Only on accessibility statement
  - **Pros**: Matches spec, targeted implementation
  - **Cons**: Inconsistent user experience

- **B**: On all long-form content pages
  - **Pros**: Better UX, useful for other pages
  - **Cons**: Outside scope of this ticket

**Recommendation**: Option A (accessibility statement only)
**Rationale**: Stick to ticket scope, can expand later

**Decision**: ⏳ Awaiting stakeholder confirmation

### 4. Content Maintenance Owner ❓

**Question**: Who is responsible for keeping accessibility statement content up to date?

**Options**:
- CTSC team
- Platform team
- Accessibility team
- Legal team

**Recommendation**: Shared ownership with clear process
**Rationale**: Content needs both technical and legal expertise

**Decision**: ⏳ Awaiting stakeholder confirmation

### 5. Dynamic Dates ❓

**Question**: Should audit dates be dynamically updated or hardcoded?

**Current**: Hardcoded in content files
**Spec**: Specific dates provided

**Options**:
- **A**: Keep hardcoded
  - **Pros**: Simplicity, exact dates
  - **Cons**: Manual updates required

- **B**: Make configurable via environment variables
  - **Pros**: Easier updates, no code changes
  - **Cons**: More complex, might not be needed

**Recommendation**: Option A (hardcoded)
**Rationale**: Dates change infrequently, simplicity preferred

**Decision**: ⏳ Awaiting stakeholder confirmation

---

## Risk Assessment

### High Risk ⚠️

**Risk**: Content inaccuracies
- **Impact**: Legal/regulatory non-compliance
- **Mitigation**: Stakeholder review, Welsh translation verification

**Risk**: Accessibility failures
- **Impact**: Service cannot be used by people with disabilities
- **Mitigation**: Comprehensive testing, axe-core scans, manual testing

### Medium Risk ⚠️

**Risk**: Browser compatibility issues
- **Impact**: Page doesn't work on certain browsers
- **Mitigation**: Cross-browser E2E testing, progressive enhancement

**Risk**: Footer link behavior confusion
- **Impact**: Users may be surprised by new tab opening
- **Mitigation**: Clear ARIA labels, standard GOV.UK pattern

### Low Risk ⚠️

**Risk**: Back to Top JavaScript failure
- **Impact**: Link doesn't work smoothly
- **Mitigation**: Progressive enhancement (regular link works without JS)

**Risk**: Welsh translation inaccuracies
- **Impact**: Incorrect information for Welsh speakers
- **Mitigation**: Native Welsh speaker review, translation service

---

## Success Criteria

### Definition of Done ✅

**Content**:
- [ ] All 10 sections present and accurate
- [ ] Contact details updated (email, phone, hours)
- [ ] WCAG 2.2 AA referenced
- [ ] CaTH service domain mentioned
- [ ] Audit dates correct (8 Sep 2023, 6 Mar 2025, 18 Nov 2024)
- [ ] Welsh translation complete and verified

**Functionality**:
- [ ] Page loads at `/accessibility-statement`
- [ ] Language toggle works (EN ↔ CY)
- [ ] Footer link opens in new tab with correct attributes
- [ ] Back to Top link scrolls smoothly to top
- [ ] All interactive elements keyboard accessible

**Testing**:
- [ ] Unit tests pass (100% coverage on new code)
- [ ] E2E tests pass (all browsers)
- [ ] Accessibility scan passes (0 violations)
- [ ] Manual testing complete
- [ ] Stakeholder review approved

**Documentation**:
- [ ] Technical documentation updated
- [ ] Content update process documented
- [ ] Deployment notes written

### Acceptance Criteria Mapping

Mapping specification acceptance criteria to implementation:

**AC1: Footer Link Placement** ✅
- Link visible on all pages ← Footer component already global
- Text "Accessibility statement" ← Already implemented
- Opens in new tab ← Need to add target="_blank"

**AC2: Accessibility Statement Page** ✅
- Clicking opens page ← Already works
- All 10 sections present ← Need content updates
- Language toggle works ← Already implemented
- Welsh translation complete ← Already implemented

**AC3: Back to Top** ⚠️
- Link at bottom of page ← Need to add to template
- Arrow icon and text ← Need to add to template
- Clicking scrolls to top ← JavaScript already implemented

**AC4: Design and Accessibility** ✅
- GOV.UK Design System ← Already compliant
- Assistive technology compatible ← Need to verify
- Descriptive ARIA labels ← Need to add to footer link
- WCAG 2.2 AA compliant ← Need to verify with axe-core

**AC5: Welsh Translation** ✅
- Footer link translated ← Already implemented
- Page content translated ← Already implemented
- Back to Top translated ← Need to add to content

---

## Estimated Effort

### Development Time

- **Content Updates**: 2 hours
  - Update EN content: 1 hour
  - Update CY content: 1 hour

- **Footer Link Enhancement**: 1 hour
  - Update footer template: 20 min
  - Update locales: 20 min
  - Testing: 20 min

- **Back to Top Integration**: 1 hour
  - Update template: 20 min
  - Update content: 20 min
  - Testing: 20 min

- **E2E Test Creation**: 4 hours
  - Write test spec: 2 hours
  - Debug and refine: 1 hour
  - Cross-browser testing: 1 hour

- **Unit Test Updates**: 1 hour
  - Add new test cases: 30 min
  - Fix any broken tests: 30 min

- **Documentation**: 1 hour
  - Update this plan with findings
  - Add inline code comments

**Total Development**: ~10 hours (1.25 days)

### Testing Time

- **Manual Testing**: 2 hours
  - Browser testing: 30 min
  - Accessibility testing: 1 hour
  - Welsh translation verification: 30 min

- **Review**: 2 hours
  - Code review: 1 hour
  - Stakeholder review: 1 hour

**Total Testing**: ~4 hours (0.5 days)

### Total Effort

**Total**: ~14 hours (1.75 days)
**Buffer**: +25% = 17.5 hours (2.2 days)

**Recommended Sprint**: 1 sprint (single ticket)

---

## Appendix A: Code Examples

### A.1 Updated English Content Structure

```typescript
// libs/web-core/src/pages/accessibility-statement/en.ts
export const en = {
  title: "Accessibility statement",
  backToTopText: "Back to Top",
  backToTopAriaLabel: "Back to top of page",
  sections: {
    intro: {
      content: "This accessibility statement applies to content published on court-tribunal-hearings.service.gov.uk.",
      commitment: "We want as many people as possible to be able to use this website...",
      features: [
        "change colours, contrast levels and fonts",
        "zoom in up to 300% without the text spilling off the screen",
        // ... etc
      ],
      simpleLanguage: "We've also made the website text as simple as possible to understand.",
      abilityNet: "AbilityNet has advice on making your device easier to use if you have a disability."
    },
    howAccessible: {
      heading: "How accessible this website is",
      content: "We know some parts of this website are not fully accessible:",
      issues: [
        "flat file PDFs are not fully accessible to screen reader software",
        "some pages do not have titles",
        // ... etc
      ]
    },
    feedback: {
      heading: "Feedback and contact information",
      content: "If you need information on this website in a different format...",
      contact: {
        email: "Email: publicationsinformation@justice.gov.uk",
        phone: "Telephone: 0300 303 0656",
        hours: "Monday to Friday, 8am to 5pm"
      },
      response: "We'll consider your request and get back to you in 5 working days."
    },
    // ... remaining sections
    preparation: {
      heading: "Preparation of this accessibility statement",
      content: [
        "This statement was prepared on 8 September 2023. It was last reviewed on 6 March 2025.",
        "This website was last tested on 18 November 2024.",
        "We tested the service using internal and external accessibility audits."
      ]
    }
  }
};
```

### A.2 Enhanced Footer Component

```nunjucks
{# libs/web-core/src/views/components/site-footer.njk #}
{% from "govuk/components/footer/macro.njk" import govukFooter %}

{{ govukFooter({
  rebrand: true,
  meta: {
    items: [
      {
        href: "https://www.gov.uk/help",
        text: footer.help
      },
      {
        href: "https://www.gov.uk/help/privacy-notice",
        text: footer.privacyPolicy
      },
      {
        href: "/cookie-preferences",
        text: footer.cookies
      },
      {
        href: "/accessibility-statement",
        text: footer.accessibility,
        attributes: {
          target: "_blank",
          rel: "noopener noreferrer",
          "aria-label": footer.accessibilityAriaLabel
        }
      },
      {
        href: "https://www.gov.uk/contact",
        text: footer.contactUs
      },
      {
        href: "https://www.gov.uk/help/terms-conditions",
        text: footer.termsAndConditions
      },
      {
        href: "https://www.gov.uk/cymraeg",
        text: footer.language
      },
      {
        href: "https://www.gov.uk/government/organisations/government-digital-service",
        text: footer.governmentDigitalService
      }
    ]
  },
  contentLicence: {
    html: '...'
  },
  copyright: {
    text: '© Crown copyright'
  }
}) }}
```

### A.3 Updated Template with Back to Top

```nunjucks
{# libs/web-core/src/pages/accessibility-statement/index.njk #}
{% extends "layouts/base-template.njk" %}

{% block page_content %}
  <h1 class="govuk-heading-xl">{{ title }}</h1>

  {# All existing content sections #}
  <p class="govuk-body">{{ sections.intro.content }}</p>

  {# ... all other sections ... #}

  <h2 class="govuk-heading-l">{{ sections.preparation.heading }}</h2>
  {% for paragraph in sections.preparation.content %}
    <p class="govuk-body">{{ paragraph }}</p>
  {% endfor %}

  {# Back to Top Link #}
  <a href="#" class="back-to-top-link" aria-label="{{ backToTopAriaLabel }}">
    <span aria-hidden="true">▴ </span>{{ backToTopText }}
  </a>
{% endblock %}
```

### A.4 E2E Test Example

```typescript
// e2e-tests/tests/accessibility-statement.spec.ts
import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.describe("Accessibility Statement Page", () => {
  test.describe("Content Display", () => {
    test("should load the accessibility statement page", async ({ page }) => {
      await page.goto("/accessibility-statement");
      await expect(page).toHaveTitle(/Accessibility statement/);
    });

    test("should display the main heading", async ({ page }) => {
      await page.goto("/accessibility-statement");
      const heading = page.locator("h1");
      await expect(heading).toBeVisible();
      await expect(heading).toHaveText("Accessibility statement");
    });

    test("should display correct contact details", async ({ page }) => {
      await page.goto("/accessibility-statement");
      await expect(page.getByText("publicationsinformation@justice.gov.uk")).toBeVisible();
      await expect(page.getByText("0300 303 0656")).toBeVisible();
      await expect(page.getByText("Monday to Friday, 8am to 5pm")).toBeVisible();
    });

    test("should display Back to Top link", async ({ page }) => {
      await page.goto("/accessibility-statement");
      const backToTop = page.locator(".back-to-top-link");
      await expect(backToTop).toBeVisible();
      await expect(backToTop).toHaveText(/Back to Top/);
    });
  });

  test.describe("Welsh Language Support", () => {
    test("should switch to Welsh and display translated content", async ({ page }) => {
      await page.goto("/accessibility-statement");

      await page.click('a[href*="lng=cy"]');
      await page.waitForURL("**/accessibility-statement?lng=cy");

      const heading = page.locator("h1");
      await expect(heading).toHaveText("Datganiad hygyrchedd");

      const backToTop = page.locator(".back-to-top-link");
      await expect(backToTop).toHaveText(/Yn ôl i frig y dudalen/);
    });
  });

  test.describe("Back to Top", () => {
    test("should scroll to top when clicked", async ({ page }) => {
      await page.goto("/accessibility-statement");

      // Scroll down
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

      // Click Back to Top
      await page.click(".back-to-top-link");

      // Wait for scroll animation
      await page.waitForTimeout(500);

      // Check we're at the top
      const scrollY = await page.evaluate(() => window.scrollY);
      expect(scrollY).toBe(0);
    });
  });

  test.describe("Accessibility", () => {
    test("should meet WCAG 2.2 AA standards", async ({ page }) => {
      await page.goto("/accessibility-statement");
      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
        .analyze();
      expect(accessibilityScanResults.violations).toEqual([]);
    });
  });
});
```

---

## Appendix B: Useful Commands

### Development

```bash
# Start development server
yarn dev

# Watch mode for specific library
cd libs/web-core && yarn dev

# Build all packages
yarn build

# Build specific package
cd libs/web-core && yarn build
```

### Testing

```bash
# Run all tests
yarn test

# Run tests for specific package
yarn test libs/web-core

# Run E2E tests
yarn test:e2e

# Run specific E2E test file
yarn test:e2e accessibility-statement

# Run with UI
yarn test:e2e --ui

# Generate coverage report
yarn test:coverage
```

### Code Quality

```bash
# Lint all files
yarn lint

# Fix linting issues
yarn lint:fix

# Format all files
yarn format
```

### Database

```bash
# Generate Prisma client
yarn db:generate

# Run migrations
yarn db:migrate

# Open Prisma Studio
yarn db:studio
```

---

## Appendix C: References

### Specification Documents
- **VIBE-236 Specification**: `/docs/tickets/VIBE-236/specification.md`
- **VIBE-236 Tasks**: `/docs/tickets/VIBE-236/tasks.md`

### GOV.UK Standards
- **GOV.UK Design System**: https://design-system.service.gov.uk/
- **Service Standard**: https://www.gov.uk/service-manual/service-standard
- **Accessibility Guidance**: https://www.gov.uk/guidance/accessibility-requirements-for-public-sector-websites-and-apps

### WCAG Standards
- **WCAG 2.2 AA**: https://www.w3.org/WAI/WCAG22/quickref/?currentsidebar=%23col_overview&levels=aaa
- **Understanding WCAG 2.2**: https://www.w3.org/WAI/WCAG22/Understanding/

### Testing Resources
- **Playwright Documentation**: https://playwright.dev/
- **axe-core Documentation**: https://github.com/dequelabs/axe-core
- **Vitest Documentation**: https://vitest.dev/

### Codebase Patterns
- **Landing Page Tests**: `/e2e-tests/tests/landing-page.spec.ts`
- **Cookie Preferences Page**: `/libs/web-core/src/pages/cookie-preferences/`
- **Base Template**: `/libs/web-core/src/views/layouts/base-template.njk`

---

## Document Control

**Version**: 1.0
**Author**: Claude (AI Assistant)
**Date**: 2025-11-22
**Status**: Draft - Awaiting Review

**Change Log**:
- 2025-11-22: Initial plan created based on VIBE-236 specification and codebase analysis

**Review Required From**:
- Technical Lead
- Accessibility Specialist
- Content Designer
- Welsh Language Reviewer
- Product Owner

---

## Next Steps

1. **Review this plan** with technical lead and stakeholders
2. **Resolve open questions** (sections marked with ❓)
3. **Create development branch** from master
4. **Implement Phase 1**: Content updates
5. **Implement Phase 2**: Footer link enhancement
6. **Implement Phase 3**: Back to Top integration
7. **Implement Phase 4**: E2E tests
8. **Implement Phase 5**: Unit test updates
9. **Manual testing** and accessibility audit
10. **Code review** and approval
11. **Deployment** to staging
12. **UAT** with stakeholders
13. **Deployment** to production
14. **Post-deployment verification**

---

**END OF DOCUMENT**
