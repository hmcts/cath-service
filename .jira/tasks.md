# Implementation Tasks: VIBE-236 - Accessibility Statement Page

## Task Priority Legend
- **P0**: Critical path, must be completed first
- **P1**: High priority, needed for core functionality
- **P2**: Medium priority, enhances functionality

## Complexity Legend
- **S (Small)**: < 2 hours, straightforward implementation
- **M (Medium)**: 2-4 hours, moderate complexity
- **L (Large)**: 4+ hours, complex or extensive work

---

## Phase 1: Foundation & Content (P0)

### Task 1.1: Extract Accessibility Statement Content
**Category**: Documentation
**Complexity**: M
**Dependencies**: None

**Description**: Extract full accessibility statement text from the uploaded document referenced in JIRA ticket and structure it into English and Welsh locale files.

**Acceptance Criteria**:
- All 10 sections extracted and formatted
- Contact details verified (phone, email, hours)
- Audit dates recorded (prepared, reviewed, audited)
- Content structured in logical sections
- Welsh translations verified
- Content matches uploaded document exactly

**Files**:
- `.jira/accessibility-statement-content-en.md` (temporary reference)
- `.jira/accessibility-statement-content-cy.md` (temporary reference)

---

### Task 1.2: Create Accessibility Statement Module Structure
**Category**: Frontend
**Complexity**: S
**Dependencies**: None

**Description**: Set up the basic file structure for the accessibility statement page in `libs/public-pages`.

**Acceptance Criteria**:
- Directory structure created
- TypeScript compilation works
- Files scaffold complete

**Files**:
- `libs/public-pages/src/pages/accessibility-statement/` (directory)
- `libs/public-pages/src/pages/accessibility-statement/index.ts`
- `libs/public-pages/src/pages/accessibility-statement/index.njk`
- `libs/public-pages/src/pages/accessibility-statement/en.ts`
- `libs/public-pages/src/pages/accessibility-statement/cy.ts`
- `libs/public-pages/src/pages/accessibility-statement/index.test.ts`
- `libs/public-pages/src/pages/accessibility-statement/index.njk.test.ts`

---

### Task 1.3: Create English Content File
**Category**: Frontend
**Complexity**: L
**Dependencies**: Task 1.1, Task 1.2

**Description**: Create the English locale file with all 10 sections of accessibility statement content.

**Acceptance Criteria**:
- All content from extracted document included
- All 10 sections properly structured
- Contact details formatted correctly
- Audit dates included
- Back to top text defined
- TypeScript types correct

**Content Sections**:
1. Introduction and service overview
2. How accessible this website is
3. Feedback and contact information
4. Reporting accessibility problems
5. Enforcement procedure
6. Technical information
7. Compliance status
8. Non-accessible content
9. What we're doing to improve
10. Preparation details

**Files**:
- `libs/public-pages/src/pages/accessibility-statement/en.ts`

---

### Task 1.4: Create Welsh Content File
**Category**: Frontend
**Complexity**: L
**Dependencies**: Task 1.1, Task 1.2, Task 1.3

**Description**: Create the Welsh locale file with all translated content.

**Acceptance Criteria**:
- All content translated
- Keys match English file exactly
- Structure matches English version
- Welsh content verified by translation team
- TypeScript types correct

**Files**:
- `libs/public-pages/src/pages/accessibility-statement/cy.ts`

---

## Phase 2: Backend Implementation (P0)

### Task 2.1: Implement GET Controller
**Category**: Backend
**Complexity**: S
**Dependencies**: Task 1.2

**Description**: Implement the GET handler to render the accessibility statement page.

**Acceptance Criteria**:
- Renders correct template
- Passes locale data
- Handles language switching
- Sets correct page title

**Files**:
- `libs/public-pages/src/pages/accessibility-statement/index.ts`

**Code Pattern**:
```typescript
import type { Request, Response } from "express";
import { cy } from "./cy.js";
import { en } from "./en.js";

export const GET = async (req: Request, res: Response) => {
  const locale = res.locals.locale || "en";
  const t = locale === "cy" ? cy : en;

  res.render("accessibility-statement/index", {
    en,
    cy,
    title: t.pageTitle
  });
};
```

---

## Phase 3: Frontend Implementation (P1)

### Task 3.1: Create Base Template Structure
**Category**: Frontend
**Complexity**: M
**Dependencies**: Task 1.3, Task 1.4

**Description**: Create the Nunjucks template with proper structure and GOV.UK components.

**Acceptance Criteria**:
- Extends base-template.njk
- Proper heading hierarchy (h1 → h2)
- Two-thirds column layout
- All sections defined
- Back to top link included

**Files**:
- `libs/public-pages/src/pages/accessibility-statement/index.njk`

---

### Task 3.2: Implement Content Sections (Part 1)
**Category**: Frontend
**Complexity**: M
**Dependencies**: Task 3.1

**Description**: Implement sections 1-5 of the accessibility statement.

**Sections**:
1. Introduction
2. How accessible this website is
3. Feedback and contact information
4. Reporting accessibility problems
5. Enforcement procedure

**Acceptance Criteria**:
- All headings use correct GOV.UK classes
- Lists properly formatted with govuk-list classes
- Contact details structured appropriately
- Email links use mailto:
- Phone numbers formatted correctly

**Files**:
- `libs/public-pages/src/pages/accessibility-statement/index.njk`

---

### Task 3.3: Implement Content Sections (Part 2)
**Category**: Frontend
**Complexity**: M
**Dependencies**: Task 3.1

**Description**: Implement sections 6-10 of the accessibility statement.

**Sections**:
6. Technical information
7. Compliance status
8. Non-accessible content
9. What we're doing to improve
10. Preparation details

**Acceptance Criteria**:
- All sections display correctly
- Dates formatted properly
- Lists and paragraphs styled with GOV.UK classes
- Content is locale-aware

**Files**:
- `libs/public-pages/src/pages/accessibility-statement/index.njk`

---

### Task 3.4: Implement Back to Top Component
**Category**: Frontend
**Complexity**: S
**Dependencies**: Task 3.1

**Description**: Add the back to top link with smooth scroll functionality.

**Acceptance Criteria**:
- Link displays at bottom of page
- Arrow icon displays (↑)
- Smooth scroll to top on click
- Keyboard accessible
- Focus visible
- ARIA label correct

**Files**:
- `libs/public-pages/src/pages/accessibility-statement/index.njk`

**Template Pattern**:
```njk
<p class="govuk-body">
  <a href="#main-content"
     class="govuk-link accessibility-statement__back-to-top"
     data-module="back-to-top"
     aria-label="{{ backToTopAriaLabel }}">
    ↑ {{ backToTop }}
  </a>
</p>
```

---

### Task 3.5: Add Styling (if needed)
**Category**: Frontend
**Complexity**: S
**Dependencies**: Task 3.4

**Description**: Create any custom CSS needed for the accessibility statement page.

**Acceptance Criteria**:
- Back to top arrow styling
- Section spacing appropriate
- Mobile responsive
- Follows GOV.UK design patterns

**Files**:
- `libs/public-pages/src/assets/css/accessibility-statement.scss` (if needed)

**Note**: May be able to reuse styles from Cookie Policy page (VIBE-241)

---

## Phase 4: Footer Integration (P1)

### Task 4.1: Update Footer Component
**Category**: Frontend
**Complexity**: S
**Dependencies**: None (can be done in parallel)

**Description**: Update the site footer link to open accessibility statement in new window.

**Acceptance Criteria**:
- Footer link has `target="_blank"`
- Footer link has `rel="noopener noreferrer"`
- ARIA label indicates "opens in new window"
- Link text remains "Accessibility statement" / "Datganiad hygyrchedd"

**Files**:
- `libs/web-core/src/views/components/site-footer.njk`

**Change**:
```njk
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

---

### Task 4.2: Update Footer Locale Strings
**Category**: Frontend
**Complexity**: S
**Dependencies**: None

**Description**: Add ARIA label strings to footer locales for accessibility link.

**Acceptance Criteria**:
- English: "Accessibility statement (opens in new window)"
- Welsh: "Datganiad hygyrchedd (yn agor mewn ffenestr newydd)"
- Strings defined in web-core locales

**Files**:
- `libs/web-core/src/locales/en.ts`
- `libs/web-core/src/locales/cy.ts`

---

## Phase 5: Testing (P1)

### Task 5.1: Write Controller Unit Tests
**Category**: Testing
**Complexity**: S
**Dependencies**: Task 2.1

**Description**: Write unit tests for the GET controller.

**Test Cases**:
- GET renders correct template
- GET includes correct locale data
- GET handles locale switching (en/cy)
- GET sets correct page title
- GET passes all content sections

**Files**:
- `libs/public-pages/src/pages/accessibility-statement/index.test.ts`

**Target Coverage**: >80%

---

### Task 5.2: Write Template Unit Tests
**Category**: Testing
**Complexity**: M
**Dependencies**: Task 3.1, 3.2, 3.3, 3.4

**Description**: Write tests to verify template renders correctly.

**Test Cases**:
- Template renders without errors
- All 10 sections display
- Back to top link renders
- Welsh content renders when locale=cy
- All headings in correct hierarchy
- Contact details formatted correctly
- Email links work
- All ARIA attributes present

**Files**:
- `libs/public-pages/src/pages/accessibility-statement/index.njk.test.ts`

---

### Task 5.3: Write E2E Tests
**Category**: Testing
**Complexity**: M
**Dependencies**: All previous implementation tasks

**Description**: Write comprehensive Playwright E2E tests covering all test scenarios from requirements.

**Test Cases** (TS1-TS9):
1. Footer link visible on all pages
2. Footer link opens statement in new window
3. Full content loads correctly
4. Welsh toggle works
5. Back to top scrolls to top
6. Keyboard navigation (Enter key on link)
7. Axe accessibility scan passes
8. Mobile responsive layout
9. SEO metadata correct (title, description)

**Files**:
- `e2e-tests/tests/accessibility-statement.spec.ts`

---

### Task 5.4: Write Accessibility Tests
**Category**: Testing
**Complexity**: M
**Dependencies**: Task 5.3

**Description**: Add automated accessibility tests using Axe-core in Playwright.

**Test Cases**:
- No Axe-core violations on page load
- Heading hierarchy correct (h1 → h2)
- All links have accessible names
- Focus indicators visible
- Keyboard navigation test
- Screen reader announcements work

**Files**:
- `e2e-tests/tests/accessibility-statement-accessibility.spec.ts`

---

### Task 5.5: Manual Accessibility Testing
**Category**: Testing
**Complexity**: M
**Dependencies**: All implementation complete

**Description**: Perform manual accessibility testing with assistive technologies.

**Testing Checklist**:
- [ ] NVDA screen reader testing (Windows)
- [ ] JAWS screen reader testing (Windows)
- [ ] VoiceOver testing (Mac)
- [ ] Keyboard-only navigation
- [ ] Browser zoom to 200%
- [ ] Color contrast verification
- [ ] Windows High Contrast mode
- [ ] Content makes sense to screen reader users

**Output**: Create accessibility test report documenting findings

---

### Task 5.6: Cross-Browser Testing
**Category**: Testing
**Complexity**: S
**Dependencies**: All implementation complete

**Description**: Test the accessibility statement page across all supported browsers.

**Browsers**:
- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
- Mobile Safari (iOS)
- Chrome (Android)

**Test Cases**:
- Page renders correctly
- All content displays
- Links work (especially mailto: links)
- Smooth scroll works
- Responsive layout on mobile
- New window behavior works

**Output**: Cross-browser test report

---

## Phase 6: Polish & Documentation (P2)

### Task 6.1: Content Review and Approval
**Category**: Documentation
**Complexity**: M
**Dependencies**: Task 1.3, 1.4

**Description**: Get accessibility statement content reviewed and approved by relevant teams.

**Review Required From**:
- HMCTS Accessibility Team
- Legal/Compliance Team
- Welsh Translation Team
- Product Owner

**Acceptance Criteria**:
- Content accuracy verified
- Audit dates confirmed current
- Contact details verified
- Welsh translation approved
- Legal compliance confirmed

---

### Task 6.2: Add JSDoc Comments
**Category**: Documentation
**Complexity**: S
**Dependencies**: Task 2.1

**Description**: Add comprehensive JSDoc comments to controller functions.

**Acceptance Criteria**:
- All exported functions documented
- Parameter types documented
- Return types documented
- Usage examples included

**Files**:
- `libs/public-pages/src/pages/accessibility-statement/index.ts`

---

### Task 6.3: Update Developer Documentation
**Category**: Documentation
**Complexity**: S
**Dependencies**: All implementation complete

**Description**: Document the new accessibility statement page in developer docs.

**Acceptance Criteria**:
- Page purpose documented
- URL structure documented
- Content update process documented
- Audit date update process documented
- How to test documented

**Files**:
- `docs/accessibility-statement.md` (if docs folder exists)
- Update CLAUDE.md examples if relevant

---

### Task 6.4: Create Shared Back to Top Component (Optional)
**Category**: Frontend
**Complexity**: S
**Dependencies**: Task 3.4, VIBE-241 complete

**Description**: If both Cookie Policy and Accessibility Statement are complete, consider creating a shared Back to Top component.

**Acceptance Criteria**:
- Shared component created in web-core
- Both pages use shared component
- Functionality preserved
- Styling consistent

**Files**:
- `libs/web-core/src/views/components/back-to-top.njk`
- `libs/web-core/src/assets/css/components/back-to-top.scss`

**Note**: This is optional and can be done later as a refactoring task

---

## Phase 7: Code Review & Refinement (P1)

### Task 7.1: Code Review
**Category**: Quality Assurance
**Complexity**: M
**Dependencies**: All implementation tasks

**Description**: Conduct thorough code review of all changes.

**Review Checklist**:
- [ ] Follows HMCTS coding standards
- [ ] No TypeScript errors or warnings
- [ ] No console.log or debug code
- [ ] Content accuracy verified
- [ ] Security considerations addressed
- [ ] Accessibility requirements met
- [ ] Welsh translations accurate
- [ ] Test coverage adequate
- [ ] Heading hierarchy correct
- [ ] Links work correctly

---

### Task 7.2: Address Review Feedback
**Category**: Quality Assurance
**Complexity**: Variable
**Dependencies**: Task 7.1

**Description**: Address all feedback from code review.

**Acceptance Criteria**:
- All required changes made
- All comments addressed
- Re-review approval obtained

---

### Task 7.3: Performance Testing
**Category**: Testing
**Complexity**: S
**Dependencies**: All implementation complete

**Description**: Verify page performance meets standards.

**Metrics**:
- Page load time < 3 seconds
- Time to interactive < 5 seconds
- No console errors
- No memory leaks
- Smooth scroll performance

---

## Phase 8: Deployment Preparation (P2)

### Task 8.1: Create Deployment Checklist
**Category**: Documentation
**Complexity**: S
**Dependencies**: All implementation complete

**Description**: Create checklist for deploying to production.

**Checklist Items**:
- [ ] All tests passing
- [ ] Code reviewed and approved
- [ ] Content reviewed and approved
- [ ] Accessibility verified
- [ ] Welsh translations approved
- [ ] Footer link behavior verified
- [ ] Cross-browser testing complete
- [ ] Monitoring alerts configured
- [ ] Rollback plan documented

---

### Task 8.2: Prepare Release Notes
**Category**: Documentation
**Complexity**: S
**Dependencies**: Task 8.1

**Description**: Write release notes describing the new feature.

**Content**:
- Feature description
- User impact
- URL structure
- New window behavior
- Known issues (if any)
- Testing performed
- Compliance notes

---

## Task Summary

### By Category
- **Frontend**: 8 tasks
- **Backend**: 1 task
- **Testing**: 6 tasks
- **Documentation**: 5 tasks
- **Quality Assurance**: 3 tasks

### By Complexity
- **Small (S)**: 11 tasks (~1-2 hours each)
- **Medium (M)**: 10 tasks (~2-4 hours each)
- **Large (L)**: 2 tasks (~4+ hours)

### By Priority
- **P0**: 8 tasks (critical path)
- **P1**: 11 tasks (high priority)
- **P2**: 4 tasks (medium priority)

### Estimated Total Effort
- **Minimum**: ~20 hours (optimal conditions)
- **Expected**: ~28 hours (realistic estimate)
- **Maximum**: ~35 hours (with complications)

## Critical Path
1. Task 1.1: Extract content
2. Task 1.2: Create module structure
3. Task 1.3 & 1.4: Create content files (parallel)
4. Task 2.1: Implement controller
5. Task 3.1-3.4: Build template and UI
6. Task 5.1-5.3: Core testing
7. Task 7.1-7.2: Code review

## Parallelization Opportunities
- Content extraction (1.1) can happen before module structure (1.2)
- Frontend (Phase 3) and Backend (Phase 2) minimal dependencies
- Footer updates (Task 4.1, 4.2) can happen anytime
- Testing (Phase 5) can start as soon as each component is complete
- Documentation tasks can happen throughout
- Content review (6.1) can start as soon as locale files are created

## Comparison with VIBE-241

| Aspect | VIBE-241 (Cookie Policy) | VIBE-236 (Accessibility) | Difference |
|--------|---------------------------|--------------------------|------------|
| Total Tasks | 28 | 23 | -5 tasks |
| Estimated Hours | 55 | 28 | -27 hours |
| Has Forms | Yes | No | Simpler |
| POST Handler | Yes | No | Easier |
| Validation | Yes | No | Easier |
| Content Length | Medium | Long | More content |

**Shared Work**:
- Back to Top component (can reuse)
- Footer updates (similar)
- Testing approach (same)
- i18n/locale handling (same)

## Dependencies Graph
```
1.1 → 1.3, 1.4
1.2 → 2.1, 3.1
1.3, 1.4 → 3.1
3.1 → 3.2, 3.3, 3.4
2.1 → 5.1
3.1-3.4 → 5.2
All implementation → 5.3, 5.4, 5.5, 5.6
All implementation → 7.1 → 7.2
```

## Notes

- This page is simpler than Cookie Policy (no forms, no validation)
- Focus should be on content accuracy and accessibility
- Ensure statutory compliance with Public Sector Bodies regulations
- Consider creating shared Back to Top component with VIBE-241
- Content will need periodic updates (audit dates, compliance status)
