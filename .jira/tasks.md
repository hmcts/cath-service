# Implementation Tasks: VIBE-241 - Cookie Policy Page

## Task Priority Legend
- **P0**: Critical path, must be completed first
- **P1**: High priority, needed for core functionality
- **P2**: Medium priority, enhances functionality
- **P3**: Low priority, polish and optimization

## Complexity Legend
- **S (Small)**: < 2 hours, straightforward implementation
- **M (Medium)**: 2-4 hours, moderate complexity
- **L (Large)**: 4+ hours, complex or extensive work

---

## Phase 1: Foundation & Content (P0)

### Task 1.1: Extract Cookie Policy Content
**Category**: Documentation
**Complexity**: M
**Dependencies**: None

**Description**: Extract full cookie policy text from the uploaded document referenced in JIRA ticket and structure it into English and Welsh locale files.

**Acceptance Criteria**:
- All policy content extracted and formatted
- Content structured in logical sections
- Welsh translations verified
- Content matches uploaded document exactly

**Files**:
- `.jira/cookie-policy-content-en.md` (temporary reference)
- `.jira/cookie-policy-content-cy.md` (temporary reference)

---

### Task 1.2: Create Cookie Policy Module Structure
**Category**: Frontend
**Complexity**: S
**Dependencies**: None

**Description**: Set up the basic file structure for the cookie policy page in `libs/public-pages`.

**Acceptance Criteria**:
- Directory structure created
- Config exports set up
- TypeScript compilation works

**Files**:
- `libs/public-pages/src/pages/cookies-policy/` (directory)
- `libs/public-pages/src/pages/cookies-policy/index.ts`
- `libs/public-pages/src/pages/cookies-policy/index.njk`
- `libs/public-pages/src/pages/cookies-policy/en.ts`
- `libs/public-pages/src/pages/cookies-policy/cy.ts`
- `libs/public-pages/src/pages/cookies-policy/index.test.ts`
- `libs/public-pages/src/pages/cookies-policy/index.njk.test.ts`

---

### Task 1.3: Create English Content File
**Category**: Frontend
**Complexity**: M
**Dependencies**: Task 1.1, Task 1.2

**Description**: Create the English locale file with all cookie policy content and UI strings.

**Acceptance Criteria**:
- All content from extracted document included
- All UI strings defined (form labels, buttons, etc.)
- Welsh translations keys match English
- TypeScript types correct

**Files**:
- `libs/public-pages/src/pages/cookies-policy/en.ts`

---

### Task 1.4: Create Welsh Content File
**Category**: Frontend
**Complexity**: M
**Dependencies**: Task 1.1, Task 1.2, Task 1.3

**Description**: Create the Welsh locale file with all translated content.

**Acceptance Criteria**:
- All content translated
- Keys match English file exactly
- Welsh content verified by translation team
- TypeScript types correct

**Files**:
- `libs/public-pages/src/pages/cookies-policy/cy.ts`

---

## Phase 2: Backend Implementation (P0)

### Task 2.1: Implement GET Controller
**Category**: Backend
**Complexity**: S
**Dependencies**: Task 1.2

**Description**: Implement the GET handler to render the cookie policy page with current cookie preferences.

**Acceptance Criteria**:
- Renders correct template
- Passes locale data
- Includes current cookie preferences
- Handles saved=true query parameter

**Files**:
- `libs/public-pages/src/pages/cookies-policy/index.ts`

**Code Pattern**:
```typescript
export const GET = async (req: Request, res: Response) => {
  const locale = res.locals.locale || "en";
  const t = locale === "cy" ? cy : en;
  const cookiePolicy = parseCookiePolicy(req.cookies?.cookie_policy);

  res.render("cookies-policy/index", {
    en,
    cy,
    cookiePreferences: cookiePolicy,
    categories: res.locals.cookieConfig?.categories,
    saved: req.query.saved === "true"
  });
};
```

---

### Task 2.2: Implement POST Controller with Validation
**Category**: Backend
**Complexity**: M
**Dependencies**: Task 2.1

**Description**: Implement the POST handler to save cookie preferences with validation.

**Acceptance Criteria**:
- Validates both radio groups selected
- Returns error summary if validation fails
- Saves preferences using existing helpers
- Redirects with success parameter
- Sets cookie banner seen flag

**Files**:
- `libs/public-pages/src/pages/cookies-policy/index.ts`

**Code Pattern**:
```typescript
export const POST = async (req: Request, res: Response) => {
  const errors: { text: string; href: string }[] = [];

  if (!req.body.analytics) {
    errors.push({ text: "Select analytics preference", href: "#analytics-yes" });
  }
  if (!req.body.performance) {
    errors.push({ text: "Select performance preference", href: "#performance-yes" });
  }

  if (errors.length > 0) {
    return res.render("cookies-policy/index", { errors, formData: req.body });
  }

  const preferences: CookiePreferences = {
    analytics: req.body.analytics === "on",
    performance: req.body.performance === "on"
  };

  setCookiePolicy(res, preferences);
  setCookieBannerSeen(res);
  res.redirect("/cookies-policy?saved=true");
};
```

---

### Task 2.3: Update Cookie Manager Configuration
**Category**: Backend
**Complexity**: M
**Dependencies**: Task 2.2

**Description**: Add performance category to cookie manager configuration and split analytics/performance cookies.

**Acceptance Criteria**:
- Performance category added
- Dynatrace cookies moved to performance category
- Google Analytics cookies remain in analytics category
- Cookie manager middleware handles new category
- CookiePreferences interface updated

**Files**:
- `apps/web/src/app.ts`
- `libs/web-core/src/middleware/cookies/cookie-manager-middleware.ts` (if interface update needed)

**Changes**:
```typescript
// apps/web/src/app.ts
await configureCookieManager(app, {
  preferencesPath: "/cookie-preferences",
  categories: {
    essential: ["connect.sid"],
    analytics: ["_ga", "_gid"],
    performance: ["dtCookie", "dtSa", "rxVisitor", "rxvt"],
    preferences: ["language"]
  }
});
```

---

## Phase 3: Frontend Implementation (P1)

### Task 3.1: Create Base Template Structure
**Category**: Frontend
**Complexity**: M
**Dependencies**: Task 1.3, Task 1.4

**Description**: Create the Nunjucks template with all required sections and GOV.UK components.

**Acceptance Criteria**:
- Extends base-template.njk
- All required GOV.UK components imported
- Page title and content sections defined
- Form structure complete
- Success banner conditional rendering
- Error summary conditional rendering

**Files**:
- `libs/public-pages/src/pages/cookies-policy/index.njk`

---

### Task 3.2: Implement Cookie Policy Content Section
**Category**: Frontend
**Complexity**: M
**Dependencies**: Task 3.1

**Description**: Add full cookie policy content to template using locale data.

**Acceptance Criteria**:
- All policy content displays
- Proper heading hierarchy
- Content structured with paragraphs and lists
- Locale-aware content rendering

**Files**:
- `libs/public-pages/src/pages/cookies-policy/index.njk`

---

### Task 3.3: Implement Cookie Settings Form
**Category**: Frontend
**Complexity**: M
**Dependencies**: Task 3.1

**Description**: Create the cookie settings form with two radio button groups.

**Acceptance Criteria**:
- Analytics radio group with fieldset/legend
- Performance radio group with fieldset/legend
- Radio buttons pre-selected based on current preferences
- CSRF token included
- Save button styled correctly
- Form validation errors display
- Accessibility attributes correct

**Files**:
- `libs/public-pages/src/pages/cookies-policy/index.njk`

**Template Pattern**:
```njk
<form method="POST" action="/cookies-policy">
  <input type="hidden" name="_csrf" value="{{ csrfToken }}">

  <div class="govuk-form-group {% if errors.analytics %}govuk-form-group--error{% endif %}">
    <fieldset class="govuk-fieldset">
      <legend class="govuk-fieldset__legend govuk-fieldset__legend--m">
        <h2 class="govuk-fieldset__heading">
          {{ analyticsQuestion }}
        </h2>
      </legend>
      {{ govukRadios({
        name: "analytics",
        items: [
          { value: "on", text: analyticsYes, checked: cookiePreferences.analytics },
          { value: "off", text: analyticsNo, checked: not cookiePreferences.analytics }
        ]
      }) }}
    </fieldset>
  </div>

  <!-- Performance radio group similar -->

  {{ govukButton({ text: saveButton }) }}
</form>
```

---

### Task 3.4: Implement Help Accordion
**Category**: Frontend
**Complexity**: S
**Dependencies**: Task 3.1

**Description**: Add the collapsible help accordion with contact information.

**Acceptance Criteria**:
- Uses GOV.UK Details component
- Contact information displays correctly
- Accessible keyboard interaction
- ARIA attributes correct

**Files**:
- `libs/public-pages/src/pages/cookies-policy/index.njk`

**Template Pattern**:
```njk
{% from "govuk/components/details/macro.njk" import govukDetails %}

{{ govukDetails({
  summaryText: contactHelpTitle,
  html: "<p><strong>" + telephone + "</strong><br>" + phoneNumber + "</p><p>" + hours + "</p>"
}) }}
```

---

### Task 3.5: Implement Back to Top Component
**Category**: Frontend
**Complexity**: S
**Dependencies**: Task 3.1

**Description**: Create the back to top link with smooth scroll functionality.

**Acceptance Criteria**:
- Link displays at bottom of page
- Arrow icon displays
- Smooth scroll to top on click
- Keyboard accessible
- Focus visible

**Files**:
- `libs/public-pages/src/pages/cookies-policy/index.njk`
- `libs/public-pages/src/assets/css/cookies-policy.scss` (if needed)

**Template Pattern**:
```njk
<a href="#main-content"
   class="govuk-link cookie-policy__back-to-top"
   data-module="back-to-top">
  {{ backToTop }}
</a>
```

---

### Task 3.6: Implement Success Banner
**Category**: Frontend
**Complexity**: S
**Dependencies**: Task 3.1

**Description**: Add success notification banner that displays after saving preferences.

**Acceptance Criteria**:
- Uses GOV.UK Notification Banner component
- Only displays when saved=true
- Success styling applied
- Accessible with role="alert"

**Files**:
- `libs/public-pages/src/pages/cookies-policy/index.njk`

---

### Task 3.7: Add Cookie Policy Styling
**Category**: Frontend
**Complexity**: S
**Dependencies**: Task 3.5

**Description**: Create any custom CSS needed for the cookie policy page.

**Acceptance Criteria**:
- Back to top arrow styling
- Section spacing
- Mobile responsive
- Follows GOV.UK design patterns

**Files**:
- `libs/public-pages/src/assets/css/cookies-policy.scss` (if needed)

---

## Phase 4: Footer Integration (P1)

### Task 4.1: Update Footer Component
**Category**: Frontend
**Complexity**: S
**Dependencies**: None (can be done in parallel)

**Description**: Update the site footer to link to the new cookie policy page instead of cookie preferences.

**Acceptance Criteria**:
- Footer link changed from `/cookie-preferences` to `/cookies-policy`
- Link text remains "Cookies" / "Cwcis"
- Opens in same window (unless requirement confirmed for new window)

**Files**:
- `libs/web-core/src/views/components/site-footer.njk`

**Change**:
```njk
{
  href: "/cookies-policy",  // Changed from /cookie-preferences
  text: footer.cookies
}
```

---

### Task 4.2: Update Footer Locale Strings
**Category**: Frontend
**Complexity**: S
**Dependencies**: None

**Description**: Ensure footer locale strings are correct for both languages.

**Acceptance Criteria**:
- English: "Cookies"
- Welsh: "Cwcis"
- Strings defined in web-core locales

**Files**:
- `libs/web-core/src/locales/en.ts`
- `libs/web-core/src/locales/cy.ts`

---

## Phase 5: Testing (P1)

### Task 5.1: Write Controller Unit Tests
**Category**: Testing
**Complexity**: M
**Dependencies**: Task 2.1, Task 2.2

**Description**: Write comprehensive unit tests for the GET and POST controllers.

**Test Cases**:
- GET renders correct template
- GET includes current preferences
- GET handles saved parameter
- GET handles locale switching
- POST validates both selections required
- POST saves preferences correctly
- POST sets cookie banner seen
- POST redirects with success parameter
- POST returns errors for missing selections

**Files**:
- `libs/public-pages/src/pages/cookies-policy/index.test.ts`

**Target Coverage**: >80%

---

### Task 5.2: Write Template Unit Tests
**Category**: Testing
**Complexity**: M
**Dependencies**: Task 3.1 through 3.6

**Description**: Write tests to verify template renders correctly with various data.

**Test Cases**:
- Template renders without errors
- Success banner shows when saved=true
- Error summary shows when errors present
- Radio buttons pre-selected correctly
- Help accordion renders
- Back to top link renders
- Welsh content renders when locale=cy
- All ARIA attributes present

**Files**:
- `libs/public-pages/src/pages/cookies-policy/index.njk.test.ts`

---

### Task 5.3: Write E2E Tests
**Category**: Testing
**Complexity**: L
**Dependencies**: All previous implementation tasks

**Description**: Write comprehensive Playwright E2E tests covering all test scenarios from requirements.

**Test Cases** (TS1-TS12):
1. Footer link visible on all pages
2. Footer link navigates to cookie policy
3. Full content loads correctly
4. Welsh toggle works
5. Form validation when incomplete
6. Disable analytics cookies works
7. Enable analytics cookies works
8. Disable performance cookies works
9. Preferences persist after refresh
10. Help accordion expands/collapses
11. Back to top scrolls to top
12. Keyboard navigation works

**Files**:
- `e2e-tests/tests/cookies-policy.spec.ts`

---

### Task 5.4: Write Accessibility Tests
**Category**: Testing
**Complexity**: M
**Dependencies**: Task 5.3

**Description**: Add automated accessibility tests using Axe-core in Playwright.

**Test Cases**:
- No Axe-core violations on page load
- No violations with errors displayed
- No violations with success banner
- Keyboard navigation test
- Focus indicators visible
- Screen reader announcements

**Files**:
- `e2e-tests/tests/cookies-policy-accessibility.spec.ts`

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

**Output**: Create accessibility test report documenting findings

---

### Task 5.6: Cross-Browser Testing
**Category**: Testing
**Complexity**: M
**Dependencies**: All implementation complete

**Description**: Test the cookie policy page across all supported browsers.

**Browsers**:
- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
- Mobile Safari (iOS)
- Chrome (Android)

**Test Cases**:
- Page renders correctly
- Form submission works
- Cookie preferences save
- Smooth scroll works
- Accordion works
- Responsive layout

**Output**: Cross-browser test report

---

## Phase 6: Polish & Documentation (P2)

### Task 6.1: Add Page-Specific JavaScript
**Category**: Frontend
**Complexity**: S
**Dependencies**: Task 3.5

**Description**: Add JavaScript for smooth scroll to top functionality.

**Acceptance Criteria**:
- Smooth scroll animation works
- Fallback for browsers without smooth scroll
- CSP compliant (uses nonce or external file)

**Files**:
- `libs/public-pages/src/assets/js/cookies-policy.ts` (if needed)

---

### Task 6.2: Update Build Configuration
**Category**: Infrastructure
**Complexity**: S
**Dependencies**: Task 1.2

**Description**: Ensure build process correctly handles new assets and templates.

**Acceptance Criteria**:
- Nunjucks templates copied to dist
- Assets compiled and bundled
- TypeScript compiles without errors

**Files**:
- `libs/public-pages/package.json` (verify build scripts)

---

### Task 6.3: Add JSDoc Comments
**Category**: Documentation
**Complexity**: S
**Dependencies**: Task 2.1, Task 2.2

**Description**: Add comprehensive JSDoc comments to controller functions.

**Acceptance Criteria**:
- All exported functions documented
- Parameter types documented
- Return types documented
- Usage examples included

**Files**:
- `libs/public-pages/src/pages/cookies-policy/index.ts`

---

### Task 6.4: Update Developer Documentation
**Category**: Documentation
**Complexity**: S
**Dependencies**: All implementation complete

**Description**: Document the new cookie policy page in developer docs.

**Acceptance Criteria**:
- Page purpose documented
- URL structure documented
- Cookie categories explained
- How to update content documented

**Files**:
- `docs/cookie-policy.md` (if docs folder exists)
- Update CLAUDE.md examples if relevant

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
- [ ] Error handling appropriate
- [ ] Security considerations addressed
- [ ] Accessibility requirements met
- [ ] Welsh translations accurate
- [ ] Test coverage adequate

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
- [ ] Accessibility verified
- [ ] Content approved
- [ ] Welsh translations approved
- [ ] Feature flag configured (if applicable)
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
- Known issues (if any)
- Testing performed

---

## Task Summary

### By Category
- **Frontend**: 12 tasks
- **Backend**: 3 tasks
- **Testing**: 6 tasks
- **Documentation**: 3 tasks
- **Quality Assurance**: 3 tasks
- **Infrastructure**: 1 task

### By Complexity
- **Small (S)**: 14 tasks (~1-2 hours each)
- **Medium (M)**: 13 tasks (~2-4 hours each)
- **Large (L)**: 1 task (~4+ hours)

### By Priority
- **P0**: 9 tasks (critical path)
- **P1**: 13 tasks (high priority)
- **P2**: 6 tasks (medium priority)
- **P3**: 0 tasks

### Estimated Total Effort
- **Minimum**: ~40 hours (optimal conditions)
- **Expected**: ~55 hours (realistic estimate)
- **Maximum**: ~70 hours (with complications)

## Critical Path
1. Task 1.1: Extract content
2. Task 1.2: Create module structure
3. Task 1.3 & 1.4: Create content files (parallel)
4. Task 2.1 & 2.2: Implement controllers
5. Task 3.1-3.6: Build templates and UI
6. Task 5.1-5.3: Core testing
7. Task 7.1-7.2: Code review

## Parallelization Opportunities
- Content extraction (1.1) can happen before module structure (1.2)
- Frontend (Phase 3) and Backend (Phase 2) can be developed in parallel after Phase 1
- Footer updates (Task 4.1, 4.2) can happen anytime
- Testing (Phase 5) can start as soon as each component is complete
- Documentation tasks can happen throughout

## Dependencies Graph
```
1.1 → 1.3, 1.4
1.2 → 2.1, 3.1
1.3, 1.4 → 3.1
2.1 → 2.2 → 2.3
3.1 → 3.2, 3.3, 3.4, 3.5, 3.6
2.1, 2.2 → 5.1
3.1-3.6 → 5.2
All implementation → 5.3, 5.4, 5.5, 5.6
All implementation → 7.1 → 7.2
```
