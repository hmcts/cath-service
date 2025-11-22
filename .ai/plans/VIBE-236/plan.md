# Technical Implementation Plan: VIBE-236

## Overview

The accessibility statement feature has been partially implemented in the `libs/web-core` module. This plan outlines the remaining work to complete the feature, including content updates, E2E testing, and verification.

## Current State Analysis

### Existing Implementation

The following components are already in place:

1. **Controller**: `/libs/web-core/src/pages/accessibility-statement/index.ts`
   - GET handler implemented
   - Renders template with English and Welsh content

2. **Template**: `/libs/web-core/src/pages/accessibility-statement/index.njk`
   - Extends base-template.njk
   - Properly structured with GOV.UK Design System components
   - Iterates through sections with proper heading hierarchy

3. **English Content**: `/libs/web-core/src/pages/accessibility-statement/en.ts`
   - Comprehensive content structure
   - Includes all required sections
   - Contact information present (needs verification)

4. **Welsh Content**: `/libs/web-core/src/pages/accessibility-statement/cy.ts`
   - Complete Welsh translation
   - Matches English structure

5. **Unit Tests**:
   - `/libs/web-core/src/pages/accessibility-statement/index.test.ts` - Controller tests
   - `/libs/web-core/src/pages/accessibility-statement/index.njk.test.ts` - Template and locale tests

6. **Footer Integration**: `/libs/web-core/src/views/components/site-footer.njk`
   - Link already present at line 20: `href: "/accessibility-statement"`

### Module Registration

The page is already registered in the web application:
- `libs/web-core/src/config.ts` exports pageRoutes
- `apps/web/src/app.ts` imports and registers web-core pageRoutes (line 99)
- Route is automatically mounted at `/accessibility-statement`

## Implementation Strategy

### Phase 1: Content Review and Updates ✅ COMPLETE

The content is already comprehensive and follows GOV.UK patterns. However, the following should be reviewed:

1. **Testing Information** (en.ts lines 101-106, cy.ts lines 102-107)
   - Current statement: "This statement was prepared on 23 September 2019. It was last reviewed on 23 September 2024."
   - Current testing: "This website was last tested on 1 September 2024. The test was carried out by the Digital Accessibility Centre (DAC)."
   - **Action**: Verify dates are accurate or update to reflect actual CaTH testing schedule

2. **Contact Information** (en.ts lines 34-36, cy.ts lines 35-37)
   - Current email: `enquiries@hmcts.gsi.gov.uk`
   - Current phone: `0300 303 0642`
   - **Action**: Verify these are the correct contacts for CaTH service

3. **Known Issues** (en.ts lines 21-28, cy.ts lines 20-27)
   - Generic placeholder issues listed
   - **Action**: Update with actual CaTH accessibility findings when available

### Phase 2: E2E Testing Implementation 🔨 TODO

Create comprehensive E2E tests following the pattern from cookie-management.spec.ts:

**File**: `/home/runner/work/cath-service/cath-service/e2e-tests/tests/accessibility-statement.spec.ts`

Tests to implement:

1. **Basic Functionality**
   - Page loads successfully at `/accessibility-statement`
   - Page title is "Accessibility statement"
   - All required sections are present
   - Footer link works correctly

2. **Content Structure**
   - Heading hierarchy is correct (h1 → h2 → h3 → h4)
   - All section headings are present
   - Contact information is visible
   - External links are present and functional

3. **Welsh Language Support**
   - Page loads with `?lng=cy` parameter
   - Welsh title is "Datganiad hygyrchedd"
   - All Welsh content renders correctly
   - Language switching maintains content structure

4. **Accessibility Validation**
   - No WCAG 2.2 AA violations (using axe-core)
   - Keyboard navigation works
   - Screen reader landmark structure is correct
   - Color contrast meets standards
   - Focus indicators are visible

5. **Progressive Enhancement**
   - Page works without JavaScript
   - All links are functional
   - Content is readable

### Phase 3: Manual Accessibility Testing 🔨 TODO

While automated testing catches many issues, manual testing is required:

1. **Screen Reader Testing**
   - Test with NVDA (Windows)
   - Test with JAWS (Windows) if available
   - Test with VoiceOver (macOS)
   - Verify: proper heading navigation, link text, form controls

2. **Keyboard Navigation**
   - Tab through all interactive elements
   - Verify focus indicators are visible
   - Verify no keyboard traps
   - Check Skip to content link works

3. **Visual Testing**
   - Test at 200% and 300% zoom
   - Test color contrast with tools
   - Test on mobile devices (320px+)
   - Test with browser zoom
   - Test with Windows High Contrast Mode

4. **Content Review**
   - Plain English review
   - Welsh translation verification by Welsh speaker
   - Legal compliance review

### Phase 4: Documentation Updates 🔨 TODO

1. **User-Facing Documentation**
   - No specific user documentation needed (page is self-documenting)
   - Ensure service manual references accessibility statement

2. **Developer Documentation**
   - Update CLAUDE.md if patterns used differ from examples
   - Document content update process
   - Document testing schedule

## Technical Architecture

### File Structure
```
libs/web-core/src/pages/accessibility-statement/
├── index.ts              # Controller with GET handler
├── index.test.ts         # Controller unit tests
├── index.njk             # Nunjucks template
├── index.njk.test.ts     # Template unit tests
├── en.ts                 # English content
└── cy.ts                 # Welsh content

e2e-tests/tests/
└── accessibility-statement.spec.ts  # E2E tests (TO CREATE)

apps/web/src/app.ts       # Module registration (ALREADY DONE)
libs/web-core/src/views/components/site-footer.njk  # Footer link (ALREADY DONE)
```

### Module Pattern

The implementation follows the standard HMCTS module pattern:

1. **Configuration Separation**
   - Config exports in `libs/web-core/src/config.ts`
   - Business logic exports in `libs/web-core/src/index.ts`

2. **Page Controller Pattern**
   - Export GET handler from index.ts
   - Render template with en and cy objects
   - No POST handler needed (static page)

3. **Content Organization**
   - Page-specific content in controller (en/cy objects)
   - Structured as nested objects for maintainability
   - Template iterates through sections

4. **Testing Pattern**
   - Unit tests for controller
   - Unit tests for template existence
   - Unit tests for locale consistency
   - E2E tests for user journeys
   - E2E tests for accessibility

## Design Decisions

### 1. Content Structure
**Decision**: Use nested object structure for content sections
**Rationale**: Makes content maintainable, easy to update, and clear in templates
**Alternative Considered**: Flat structure with prefixed keys (rejected - harder to maintain)

### 2. Template Approach
**Decision**: Single template with loops for sections
**Rationale**: Reduces duplication, ensures consistency, follows GOV.UK patterns
**Alternative Considered**: Multiple includes for each section (rejected - more files to maintain)

### 3. Module Location
**Decision**: Place in `libs/web-core` rather than separate module
**Rationale**: Core functionality needed by all services, not feature-specific
**Alternative Considered**: Separate `libs/accessibility-statement` module (rejected - too small)

### 4. Welsh Translation Approach
**Decision**: Separate cy.ts file with identical structure
**Rationale**: Type safety, compile-time checking, maintainability
**Alternative Considered**: JSON translation files (rejected - less type-safe)

### 5. External Link Pattern
**Decision**: Open in same window (no target="_blank")
**Rationale**: GOV.UK pattern, better accessibility, user control
**Alternative Considered**: Open in new tab (rejected - against GOV.UK guidance)

## Risk Assessment

### High Priority Risks

1. **Outdated Content** (Likelihood: Medium, Impact: High)
   - **Risk**: Dates, contact info, or issues become outdated
   - **Mitigation**: Create process for quarterly reviews
   - **Owner**: Product team

2. **Incorrect Contact Information** (Likelihood: Low, Impact: High)
   - **Risk**: Users cannot reach support using listed contacts
   - **Mitigation**: Verify contacts before deployment
   - **Owner**: Development team

### Medium Priority Risks

3. **Welsh Translation Accuracy** (Likelihood: Low, Impact: Medium)
   - **Risk**: Translation errors or inconsistencies
   - **Mitigation**: Review by Welsh speaker before release
   - **Owner**: Content team

4. **Known Issues Incomplete** (Likelihood: Medium, Impact: Medium)
   - **Risk**: Real accessibility issues not documented
   - **Mitigation**: Update after comprehensive accessibility audit
   - **Owner**: Accessibility team

### Low Priority Risks

5. **Template Rendering Issues** (Likelihood: Very Low, Impact: Low)
   - **Risk**: Template fails to render correctly
   - **Mitigation**: Comprehensive unit and E2E tests
   - **Owner**: Development team

## Testing Strategy

### Unit Tests (✅ COMPLETE)
- Controller renders correct template
- English content structure is valid
- Welsh content structure is valid
- Locale consistency between en and cy

### E2E Tests (🔨 TODO)
- Page loads and renders
- Footer link navigation
- Welsh language support
- Accessibility validation with axe-core
- Keyboard navigation
- Mobile responsiveness

### Manual Testing (🔨 TODO)
- Screen reader testing
- Keyboard-only navigation
- Visual testing (zoom, contrast)
- Content accuracy review

### Accessibility Testing Tools
- **Automated**: axe-core via Playwright
- **Manual**: NVDA, JAWS, VoiceOver
- **Color Contrast**: Chrome DevTools, Contrast Checker
- **Keyboard**: Manual testing
- **Mobile**: Chrome DevTools device emulation + real devices

## Deployment Considerations

### Pre-Deployment Checklist
- [ ] Content reviewed and approved
- [ ] Contact information verified
- [ ] Welsh translation reviewed
- [ ] All unit tests passing
- [ ] All E2E tests passing
- [ ] Manual accessibility testing complete
- [ ] Screen reader testing complete
- [ ] Cross-browser testing complete

### Post-Deployment Validation
- [ ] Page accessible in production
- [ ] Footer link works
- [ ] Welsh version works
- [ ] Contact links functional
- [ ] No console errors
- [ ] Analytics tracking (if required)

### Rollback Plan
- If issues found, page can be removed by:
  1. Remove footer link from site-footer.njk
  2. Deploy updated footer
  3. Page will still exist but not be discoverable
  4. Fix issues and redeploy

## Maintenance Plan

### Quarterly Reviews
- Review and update testing dates
- Verify contact information
- Update known issues based on latest audit
- Review WCAG version (update to 2.2 AA as standard)

### After Accessibility Audits
- Update known issues section
- Update compliance status
- Add specific WCAG criterion references
- Update fix timelines

### Content Ownership
- **Technical accuracy**: Development team
- **Content accuracy**: Content/UX team
- **Welsh translation**: Welsh language team
- **Legal compliance**: Legal/compliance team

## Success Criteria

The implementation will be considered complete when:

1. ✅ All required sections are present and complete
2. ✅ Unit tests pass for controller and template
3. 🔨 E2E tests pass for all scenarios
4. 🔨 Manual accessibility testing complete
5. 🔨 Welsh translation verified
6. 🔨 Contact information verified
7. 🔨 Deployed to production
8. 🔨 Zero WCAG 2.2 AA violations on the page itself

## Timeline Estimate

- **Content Review**: 1-2 hours
- **E2E Test Implementation**: 4-6 hours
- **Manual Accessibility Testing**: 4-8 hours
- **Welsh Translation Review**: 1-2 hours
- **Final Verification**: 1-2 hours

**Total Estimate**: 11-20 hours

## Dependencies

- GOV.UK Frontend v5.2.0+ (✅ already satisfied)
- Playwright for E2E testing (✅ already configured)
- axe-core for accessibility testing (needs verification)
- Welsh speaker for translation review (external dependency)

## References

- [GOV.UK Accessibility Statement Pattern](https://design-system.service.gov.uk/patterns/accessibility-statement/)
- [WCAG 2.2 Guidelines](https://www.w3.org/WAI/WCAG22/quickref/)
- [Public Sector Accessibility Regulations](https://www.legislation.gov.uk/uksi/2018/952/contents/made)
- Existing cookie-management.spec.ts for E2E test patterns
