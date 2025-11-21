# VIBE-236: Accessibility Statement - Implementation Plan

## Summary
Implement a GOV.UK-compliant Accessibility Statement page that meets WCAG 2.2 AA standards, providing users with information about the service's accessibility features, known issues, and contact details for reporting problems.

## Implementation Approach

### Phase 1: Module Setup (20 mins)
1. Create `libs/accessibility-statement` module structure
2. Configure package.json with build scripts and dependencies
3. Add TypeScript configuration
4. Register module in root tsconfig.json

### Phase 2: Content Extraction (30 mins)
1. Extract full content from Accessibility statement.docx
2. Structure content into 10 sections
3. Format for TypeScript locale files
4. Prepare both English and Welsh translations

### Phase 3: Page Implementation (1.5 hours)
1. Build controller (`accessibility-statement.ts`):
   - GET handler for both /accessibility-statement and /datganiad-hygyrchedd
   - Language-aware rendering
   - Simple static content display
2. Create Nunjucks template (`accessibility-statement.njk`):
   - GOV.UK page layout
   - Proper heading hierarchy (h1, h2, h3)
   - Content sections with paragraphs and lists
   - Contact information formatting
   - Back to Top link with smooth scroll
3. Add translations (en.ts, cy.ts):
   - All 10 content sections
   - Contact details
   - Compliance dates
   - Back to Top text

### Phase 4: Footer Integration (30 mins)
1. Update footer component with "Accessibility statement" link
2. Configure new tab behavior
3. Add ARIA labels
4. Bilingual link text

### Phase 5: Registration (20 mins)
1. Register module in apps/web/src/app.ts
2. Configure route handlers
3. Update tsconfig paths

### Phase 6: Testing (1.5 hours)
1. Unit tests for controller routing
2. E2E tests with Playwright:
   - Footer link new tab behavior
   - Content rendering
   - Welsh translation
   - Back to Top scroll
   - Keyboard navigation
   - Mobile responsiveness
3. Accessibility testing:
   - Axe-core automated tests (WCAG 2.2 AA)
   - Manual keyboard navigation
   - Screen reader testing (JAWS, NVDA, VoiceOver)
   - Color contrast verification
   - Text resize to 200%

## Technical Decisions

### URL Structure
- English: `/accessibility-statement`
- Welsh: `/datganiad-hygyrchedd`
- Both routes served by same controller with language detection

### Content Management
Static content in locale files rather than database:
- Easier to version control
- Simpler deployment
- No database dependency
- Content reviewed as code changes

### Back to Top Implementation
Client-side JavaScript for smooth scrolling:
- Progressive enhancement (works without JS via anchor)
- Smooth scroll behavior
- Keyboard accessible
- ARIA label for screen readers

## File Changes

### New Files
- `libs/accessibility-statement/package.json`
- `libs/accessibility-statement/tsconfig.json`
- `libs/accessibility-statement/src/config.ts`
- `libs/accessibility-statement/src/index.ts`
- `libs/accessibility-statement/src/pages/accessibility-statement.ts`
- `libs/accessibility-statement/src/pages/accessibility-statement.njk`
- `libs/accessibility-statement/src/locales/en.ts`
- `libs/accessibility-statement/src/locales/cy.ts`
- `libs/accessibility-statement/src/accessibility-statement.test.ts`

### Modified Files
- `apps/web/src/app.ts` - Register accessibility-statement module
- `libs/govuk-frontend/src/views/partials/footer.njk` - Add Accessibility statement link
- `tsconfig.json` - Add accessibility-statement path alias

## Content Sections (from Document)

### 1. Accessibility Statement Header
- Service applicability
- Overview of CaTH service
- Accessibility principles

### 2. How Accessible This Website Is
- Zoom and contrast support
- Screen reader compatibility
- Known inaccessible content

### 3. Feedback and Contact Information
- Telephone: 0300 303 0656
- Email: publicationsinformation@justice.gov.uk
- Hours: Monday–Friday, 8am–5pm
- Text relay availability
- BSL interpreter information

### 4. Reporting Accessibility Problems
- How to report issues to HMCTS

### 5. Enforcement Procedure
- Equality and Human Rights Commission role

### 6. Technical Information
- Compliance with Public Sector Bodies Regulations 2018

### 7. Compliance Status
- Partial compliance with WCAG 2.2

### 8. Non-Accessible Content
- Flat file PDFs
- Missing page titles

### 9. What We're Doing to Improve Accessibility
- Ongoing improvements
- Testing details

### 10. Preparation of This Accessibility Statement
- Prepared: 8 September 2023
- Reviewed: 6 March 2025
- Last audited: 18 November 2024

## Testing Strategy

### Unit Tests
- Controller routing for both EN and CY routes
- Language detection logic

### Integration Tests
- GET /accessibility-statement returns 200
- GET /datganiad-hygyrchedd returns 200
- Content rendered correctly

### E2E Tests (Playwright)
```typescript
describe('Accessibility Statement', () => {
  test('footer link opens in new tab', async ({ page, context }) => {
    // Open new tab and verify URL
  });

  test('displays full content', async ({ page }) => {
    // Check all 10 sections present
  });

  test('Welsh translation works', async ({ page }) => {
    // Toggle language and verify Welsh content
  });

  test('Back to Top scrolls to top', async ({ page }) => {
    // Scroll down, click, verify scroll position
  });

  test('keyboard navigation', async ({ page }) => {
    // Tab through all interactive elements
    // Verify focus indicators
  });

  test('passes axe accessibility audit', async ({ page }) => {
    // Run axe-core automated tests
    // Assert no violations
  });

  test('responsive on mobile', async ({ page }) => {
    // Set viewport to mobile size
    // Verify layout and Back to Top visibility
  });
});
```

### Accessibility Testing Checklist
- [ ] All interactive elements keyboard accessible
- [ ] Visible focus indicators on all focusable elements
- [ ] ARIA labels descriptive and appropriate
- [ ] Heading hierarchy logical (no skipped levels)
- [ ] Color contrast meets 4.5:1 minimum
- [ ] Text resizable to 200% without loss
- [ ] Screen reader announces all content correctly
- [ ] No keyboard traps
- [ ] Link purpose clear from link text alone
- [ ] Page has descriptive title

## Acceptance Criteria Mapping

| AC | Implementation |
|----|----------------|
| Footer link on every page | Update footer.njk partial |
| Link labeled "Accessibility statement" | Bilingual link text in footer |
| Opens in new window | target="_blank" rel="noopener noreferrer" |
| Full document content | Extract all sections to locale files |
| Welsh translation | cy.ts locale file, language toggle |
| Back to Top | Upward arrow + text, smooth scroll JS |
| GOV.UK design standards | Use GOV.UK Design System components |
| WCAG 2.2 AA compliance | Axe-core tests, manual accessibility audit |
| ARIA labels | aria-label on footer link and Back to Top |

## Deployment Checklist
- [ ] Module builds successfully
- [ ] All tests pass
- [ ] Accessibility audit complete
- [ ] Welsh translation verified
- [ ] Code review approved
- [ ] Deploy to development
- [ ] Manual QA on development
- [ ] Deploy to staging
- [ ] UAT on staging
- [ ] Deploy to production
- [ ] Post-deployment smoke test

## Maintenance Plan
- Content updates managed through locale files
- Audit dates should be updated annually
- Non-accessible content list updated as issues resolved
- Welsh translations reviewed by HMCTS Welsh Translation Unit

## Future Enhancements (Out of Scope)
- Dynamic audit date management
- Admin panel for content updates
- Automated WCAG compliance monitoring
- Integration with central HMCTS accessibility statement
