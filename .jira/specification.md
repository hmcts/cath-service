# Technical Specification: VIBE-241 - Cookie Policy Page

## 1. Architecture Overview

This ticket requires implementing a new Cookie Policy page that provides comprehensive information about cookies used by the CaTH service and allows users to manage cookie preferences. The implementation will build upon the existing cookie management infrastructure already present in the codebase.

### Key Components
1. **Cookie Policy Page Controller** - New page route in `libs/public-pages`
2. **Cookie Policy Template** - Nunjucks template with full policy content
3. **Footer Link Update** - Modify footer to include new Cookie Policy link
4. **Cookie Settings Integration** - Leverage existing cookie preference functionality
5. **Back to Top Component** - Reusable component for page navigation
6. **Locale Support** - Full English and Welsh content

### Architecture Decisions
- **Module Location**: Add to `libs/public-pages` as this is a public-facing page
- **Route Pattern**: `/cookies-policy` (EN) and `/polisi-cwcis` (CY) routes will point to same controller
- **Existing Infrastructure**: Reuse cookie management code from `libs/web-core`
- **Footer Link**: Update `libs/web-core/src/views/components/site-footer.njk` to change existing `/cookie-preferences` link

## 2. Component Breakdown

### 2.1 Cookie Policy Page Controller

**Location**: `libs/public-pages/src/pages/cookies-policy/index.ts`

```typescript
export const GET = async (req: Request, res: Response) => {
  const locale = res.locals.locale || "en";
  const t = locale === "cy" ? cy : en;
  const cookiePolicy = parseCookiePolicy(req.cookies?.cookie_policy);

  res.render("cookies-policy/index", {
    en,
    cy,
    cookiePreferences: cookiePolicy,
    categories: res.locals.cookieConfig?.categories
  });
};

export const POST = async (req: Request, res: Response) => {
  // Handle cookie preferences form submission
  // Validate both radio groups are selected
  // Save preferences and redirect with success message
};
```

### 2.2 Template Structure

**Location**: `libs/public-pages/src/pages/cookies-policy/index.njk`

**Template Sections**:
1. Page title
2. Cookie policy content (from uploaded document)
3. Cookie settings form (two radio groups)
4. Save button
5. Help accordion
6. Back to top link

### 2.3 Content Files

**Locations**:
- `libs/public-pages/src/pages/cookies-policy/en.ts`
- `libs/public-pages/src/pages/cookies-policy/cy.ts`

**Content Structure**:
```typescript
export const en = {
  pageTitle: "Cookie Policy",
  // Full cookie policy content
  policyIntro: "...",
  whatAreCookies: "...",
  howWeUseCookies: "...",
  // ... more content sections

  // Cookie settings
  changeSettingsTitle: "Change your cookie settings",
  analyticsQuestion: "Allow cookies that measure website use?",
  analyticsYes: "Use cookies that measure my website use",
  analyticsNo: "Do not use cookies that measure my website use",
  performanceQuestion: "Allow cookies that measure website application performance monitoring?",
  performanceYes: "Use cookies that measure website application performance monitoring",
  performanceNo: "Do not use cookies that measure website application performance monitoring",
  saveButton: "Save",

  // Help accordion
  contactHelpTitle: "Contact us for help",
  telephone: "Telephone",
  phoneNumber: "0300 303 0656",
  hours: "Monday to Friday 8am to 5pm",

  // Navigation
  backToTop: "Back to Top",

  // Validation
  errorSummaryTitle: "There is a problem",
  errorSelectBoth: "Select cookie settings for each option"
};
```

### 2.4 Footer Update

**File**: `libs/web-core/src/views/components/site-footer.njk`

**Changes**:
- Update the `/cookie-preferences` link to `/cookies-policy`
- Link should open in same window (not new window as initially specified - GOV.UK pattern is same window for footer links)
- Add target and rel attributes if requirement for new window is mandatory

### 2.5 Locale Updates

**Files**:
- `libs/web-core/src/locales/en.ts`
- `libs/web-core/src/locales/cy.ts`

**Changes**:
Update footer translations:
```typescript
footer: {
  cookies: "Cookies" // EN
  cookies: "Cwcis" // CY
}
```

## 3. Data Models

No new database models required. This feature uses existing cookie management infrastructure.

**Existing Cookie Structure**:
```typescript
interface CookiePreferences {
  analytics?: boolean;
  performance?: boolean; // Will need to add this category
}
```

## 4. Configuration Updates

### 4.1 Cookie Manager Configuration

**File**: `apps/web/src/app.ts`

Update cookie configuration to include performance monitoring category:

```typescript
await configureCookieManager(app, {
  preferencesPath: "/cookie-preferences", // Keep existing preference page
  categories: {
    essential: ["connect.sid"],
    analytics: ["_ga", "_gid"],
    performance: ["dtCookie", "dtSa", "rxVisitor", "rxvt"], // Move Dynatrace to separate category
    preferences: ["language"]
  }
});
```

## 5. Frontend Requirements

### 5.1 GOV.UK Design System Components

**Required Components**:
- `govukRadios` - For cookie preference radio buttons
- `govukButton` - For Save button
- `govukAccordion` or `govukDetails` - For contact help section
- `govukErrorSummary` - For form validation errors
- `govukNotificationBanner` - For success message after save

### 5.2 Styling

**CSS Requirements**:
- Back to top link styling (arrow icon + text)
- Proper spacing between sections
- Accessible focus states
- Mobile responsive layout

**Location**: `libs/public-pages/src/assets/css/cookies-policy.scss`

```scss
.cookie-policy {
  &__back-to-top {
    display: inline-flex;
    align-items: center;
    margin-top: 2rem;

    &::before {
      content: "↑";
      margin-right: 0.5rem;
      font-size: 1.5rem;
    }
  }

  &__settings-section {
    margin-top: 3rem;
    padding-top: 2rem;
    border-top: 1px solid govuk-colour("mid-grey");
  }
}
```

### 5.3 JavaScript

**Location**: `libs/public-pages/src/assets/js/cookies-policy.ts`

```typescript
// Smooth scroll to top functionality
document.addEventListener('DOMContentLoaded', () => {
  const backToTopLink = document.querySelector('[data-module="back-to-top"]');
  if (backToTopLink) {
    backToTopLink.addEventListener('click', (e) => {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }
});
```

### 5.4 Route Configuration

The existing route auto-discovery in `createSimpleRouter` will automatically pick up the new page at `/cookies-policy`. No additional route configuration needed.

For Welsh route `/polisi-cwcis`, the i18n middleware will handle the language switching based on the `lng` query parameter or cookie.

## 6. Backend Requirements

### 6.1 Controller Logic

**Validation**:
- Ensure both radio groups have selections before saving
- Return error summary if validation fails
- Use existing `parseCookiePolicy` and `setCookiePolicy` helpers

**Form Processing**:
```typescript
export const POST = async (req: Request, res: Response) => {
  const errors: { text: string; href: string }[] = [];

  // Validate analytics selection
  if (!req.body.analytics) {
    errors.push({
      text: errorMessages.analyticsRequired,
      href: "#analytics-yes"
    });
  }

  // Validate performance selection
  if (!req.body.performance) {
    errors.push({
      text: errorMessages.performanceRequired,
      href: "#performance-yes"
    });
  }

  if (errors.length > 0) {
    return res.render("cookies-policy/index", {
      errors,
      formData: req.body
    });
  }

  // Save preferences
  const preferences: CookiePreferences = {
    analytics: req.body.analytics === "on",
    performance: req.body.performance === "on"
  };

  setCookiePolicy(res, preferences);
  setCookieBannerSeen(res);

  res.redirect("/cookies-policy?saved=true");
};
```

### 6.2 Cookie Management

**Existing Infrastructure** (no changes needed):
- `libs/web-core/src/middleware/cookies/cookie-helpers.ts` - Cookie policy helpers
- `libs/web-core/src/middleware/cookies/cookie-manager-middleware.ts` - Cookie manager middleware

**New Cookie Category**:
Add `performance` to the `CookiePreferences` interface:

```typescript
export interface CookiePreferences {
  analytics?: boolean;
  performance?: boolean;
  preferences?: boolean;
}
```

## 7. Security Considerations

### 7.1 CSRF Protection

- Form must include CSRF token
- Use existing CSRF middleware (already configured in web app)

### 7.2 Content Security Policy

- Inline scripts must use nonce attribute
- Back to top functionality should use CSP-compliant approach (external script file)

### 7.3 Cookie Security

- Existing cookie helpers already implement secure cookie settings
- `httpOnly: false` for cookie_policy (needs client-side access)
- `secure: true` in production
- `sameSite: "strict"`
- 1-year expiry

### 7.4 Input Validation

- Radio buttons only allow predefined values ("on" or "off")
- No user-generated content, so XSS risk is minimal
- Server-side validation ensures both preferences are set

## 8. Accessibility Requirements

### 8.1 WCAG 2.2 AA Compliance

**Radio Groups**:
```html
<fieldset class="govuk-fieldset">
  <legend class="govuk-fieldset__legend govuk-fieldset__legend--m">
    <h2 class="govuk-fieldset__heading">
      Allow cookies that measure website use?
    </h2>
  </legend>
  <div class="govuk-radios">
    <!-- Radio inputs -->
  </div>
</fieldset>
```

**Accordion**:
```html
<details class="govuk-details" data-module="govuk-details">
  <summary class="govuk-details__summary">
    <span class="govuk-details__summary-text">
      Contact us for help
    </span>
  </summary>
  <div class="govuk-details__text">
    <!-- Content -->
  </div>
</details>
```

**Back to Top**:
```html
<a href="#main-content"
   class="govuk-link cookie-policy__back-to-top"
   data-module="back-to-top">
  Back to Top
</a>
```

### 8.2 Keyboard Navigation

- All interactive elements must be keyboard accessible
- Focus indicators must be visible
- Tab order must be logical
- Skip to content link at page top

### 8.3 Screen Reader Support

- Proper heading hierarchy (h1 → h2)
- ARIA labels where needed
- Form validation errors announced
- Success banner announced with `role="alert"`

### 8.4 Language Switching

- Language toggle preserves scroll position where possible
- Welsh content matches English structure exactly
- `lang` attribute correctly set on content sections

## 9. Testing Strategy

### 9.1 Unit Tests

**Controller Tests** (`libs/public-pages/src/pages/cookies-policy/index.test.ts`):
- GET renders correct template with current preferences
- POST validates both radio groups selected
- POST saves preferences correctly
- POST redirects with success parameter
- Locale switching works correctly

**Template Tests** (`libs/public-pages/src/pages/cookies-policy/index.njk.test.ts`):
- All required GOV.UK components render
- Error summary displays when errors present
- Success banner displays when saved=true
- Radio buttons pre-selected based on current preferences
- Welsh content renders when locale=cy

**Content Tests**:
- English content complete and accurate
- Welsh translations complete and accurate
- All required ARIA attributes present

### 9.2 Integration Tests

**Cookie Flow Tests**:
1. User visits cookie policy page
2. User selects preferences
3. User saves preferences
4. Preferences persist across page loads
5. Cookie banner doesn't show after preferences saved

**Validation Tests**:
1. Submit form with no selections → error summary shown
2. Submit with one selection → error summary shown
3. Submit with both selections → success

### 9.3 E2E Tests (Playwright)

**Test File**: `e2e-tests/tests/cookies-policy.spec.ts`

**Test Scenarios** (matching TS1-TS12 from requirements):
1. TS1: Footer link visible on all pages
2. TS2: Footer link navigates to cookie policy
3. TS3: Cookie policy content displays
4. TS4: Welsh toggle works
5. TS5: Validation error when incomplete
6. TS6: Opting out disables analytics cookies
7. TS7: Opting in enables analytics cookies
8. TS8: Opting out disables performance cookies
9. TS9: Preferences persist after browser refresh
10. TS10: Help accordion expands
11. TS11: Back to top scrolls to top
12. TS12: Keyboard navigation works

### 9.4 Accessibility Tests

**Automated**:
- Axe-core scan in Playwright tests
- pa11y-ci in CI pipeline

**Manual**:
- NVDA/JAWS screen reader testing
- Keyboard-only navigation
- Browser zoom to 200%
- Color contrast verification

### 9.5 Cross-Browser Testing

**Target Browsers** (GOV.UK standard):
- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
- Mobile Safari (iOS)
- Chrome (Android)

## 10. Implementation Notes

### 10.1 Content Source

The full cookie policy content must be extracted from the uploaded document referenced in the JIRA ticket. This content should be structured in the English and Welsh locale files.

### 10.2 Cookie Categories

Currently, Dynatrace cookies are in the `analytics` category. They should be moved to a new `performance` category to match the requirements:
- **Analytics**: Google Analytics cookies (_ga, _gid)
- **Performance**: Dynatrace cookies (dtCookie, dtSa, rxVisitor, rxvt)

### 10.3 Footer Link Behavior

**Clarification Needed**: Requirements state the link should open in a new window, but GOV.UK pattern is same window for footer links. Recommend keeping same window for consistency unless there's a specific requirement.

If new window required:
```njk
{
  href: "/cookies-policy",
  text: footer.cookies,
  attributes: {
    target: "_blank",
    rel: "noopener noreferrer"
  }
}
```

### 10.4 Existing Cookie Preferences Page

The existing `/cookie-preferences` page will remain and continue to work. The new `/cookies-policy` page will provide the full policy content plus cookie settings, while `/cookie-preferences` provides just the settings.

**Recommendation**: Consider whether to keep both or consolidate. The new Cookie Policy page effectively supersedes the Cookie Preferences page.

## 11. Definition of Done

- [ ] Cookie policy page created at `/cookies-policy`
- [ ] Welsh route `/polisi-cwcis` works
- [ ] Footer link updated and visible on all pages
- [ ] Full policy content displays (EN and CY)
- [ ] Cookie settings form validates correctly
- [ ] Preferences save and persist
- [ ] Analytics cookies controlled by settings
- [ ] Performance cookies controlled by settings
- [ ] Help accordion works
- [ ] Back to top link works
- [ ] All unit tests pass (>80% coverage)
- [ ] All E2E tests pass
- [ ] Accessibility tests pass (Axe-core)
- [ ] Manual accessibility testing complete
- [ ] Cross-browser testing complete
- [ ] Code reviewed and approved
- [ ] Documentation updated
