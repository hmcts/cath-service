# Plan: Move Language Toggle to Service Navigation Bar (Issue #292)

## 1. Technical Approach

Move the language toggle link out of the phase banner and the landing page inset text, and into the GOV.UK service navigation bar. The toggle must appear on all public-facing pages and be absent from admin/system-admin pages.

The key constraint is that admin controllers already pass `hideLanguageToggle: true` in `res.render()` locals (33 files across `libs/admin-pages/` and `libs/system-admin-pages/`). The minimal-change approach reuses this existing flag in the new location rather than touching any admin controller.

**Decision:** Check `{% if not hideLanguageToggle %}` in `service-navigation.njk` to conditionally render the toggle in the `navigationEnd` slot. This requires no admin controller changes. The phase banner template loses the toggle block entirely. The landing page inset text block is removed because the service navigation toggle makes it redundant.

The existing `language.switchPhaseBanner` key in `libs/web-core/src/locales/en.ts` and `cy.ts` is renamed to `language.switch` to reflect the new location, and a `language.switchAriaLabel` key is added to give screen readers a meaningful accessible name for the toggle link.

## 2. Implementation Details

### File 1: `libs/web-core/src/views/components/phase-banner-content.njk`

Remove the language toggle block. The phase banner becomes purely a feedback/beta notification.

**Before:**
```njk
{% set bannerHtml %}
  {{ feedback.part1 }}<a class="govuk-link" aria-label="{{ feedback.ariaLabel }}" href="{{ feedback.link }}{{ pageUrl }}" target="_blank">{{ feedback.part2 }}</a>{{ feedback.part3 }}
  {% if not hideLanguageToggle %}
  <a href="{{ languageToggle.link }}" class="govuk-link language" style="float: right;">{{ language.switchPhaseBanner }}</a>
  {% endif %}
{% endset %}
```

**After:**
```njk
{% set bannerHtml %}
  {{ feedback.part1 }}<a class="govuk-link" aria-label="{{ feedback.ariaLabel }}" href="{{ feedback.link }}{{ pageUrl }}" target="_blank">{{ feedback.part2 }}</a>{{ feedback.part3 }}
{% endset %}
```

---

### File 2: `libs/web-core/src/views/components/service-navigation.njk`

Add the language toggle link into the `navigationEnd` slot, before the sign in/sign out item, conditional on `hideLanguageToggle` being falsy.

**Before:**
```njk
{% set navigationEndHtml %}
  {% if isAuthenticated %}
    <li class="govuk-service-navigation__item govuk-service-navigation__navigation-end"><a class="govuk-service-navigation__link" href="/logout">{{ navigation.signOut or authenticatedNavigation.signOut }}</a></li>
  {% else %}
    <li class="govuk-service-navigation__item govuk-service-navigation__navigation-end"><a class="govuk-service-navigation__link" href="/sign-in">{{ navigation.signIn }}</a></li>
  {% endif %}
{% endset %}
```

**After:**
```njk
{% set navigationEndHtml %}
  {% if not hideLanguageToggle %}
    <li class="govuk-service-navigation__item govuk-service-navigation__navigation-end"><a class="govuk-service-navigation__link" href="{{ languageToggle.link }}" aria-label="{{ language.switchAriaLabel }}">{{ language.switch }}</a></li>
  {% endif %}
  {% if isAuthenticated %}
    <li class="govuk-service-navigation__item govuk-service-navigation__navigation-end"><a class="govuk-service-navigation__link" href="/logout">{{ navigation.signOut or authenticatedNavigation.signOut }}</a></li>
  {% else %}
    <li class="govuk-service-navigation__item govuk-service-navigation__navigation-end"><a class="govuk-service-navigation__link" href="/sign-in">{{ navigation.signIn }}</a></li>
  {% endif %}
{% endset %}
```

The toggle appears before the sign-in/sign-out link so it reads left-to-right: language | sign in.

---

### File 3: `apps/web/src/pages/index.njk`

Remove the `govuk-inset-text` block. The toggle is now in the service navigation bar on every public page, so the inset text is redundant.

**Before:**
```njk
    <div class="govuk-inset-text">
      {{ welshAvailableText }} <a href="{{ languageToggle.link }}" class="govuk-link">{{ welshAvailableLink }}</a>.
    </div>
```

**After:** (block removed entirely)

---

### File 4: `apps/web/src/pages/en.ts`

Remove `welshAvailableText` and `welshAvailableLink` keys.

**Before:**
```typescript
  welshAvailableText: "This service is also available in",
  welshAvailableLink: "Welsh (Cymraeg)",
```

**After:** (both lines removed)

---

### File 5: `apps/web/src/pages/cy.ts`

Remove `welshAvailableText` and `welshAvailableLink` keys.

**Before:**
```typescript
  welshAvailableText: "Mae'r gwasanaeth hwn hefyd ar gael yn",
  welshAvailableLink: "Saesneg (English)",
```

**After:** (both lines removed)

---

### File 6: `libs/web-core/src/locales/en.ts`

Rename `switchPhaseBanner` to `switch` and add `switchAriaLabel`.

**Before:**
```typescript
  language: {
    switchPhaseBanner: "Cymraeg"
  },
```

**After:**
```typescript
  language: {
    switch: "Cymraeg",
    switchAriaLabel: "Switch to Welsh (Cymraeg)"
  },
```

---

### File 7: `libs/web-core/src/locales/cy.ts`

Rename `switchPhaseBanner` to `switch` and add `switchAriaLabel`.

**Before:**
```typescript
  language: {
    switchPhaseBanner: "English"
  },
```

**After:**
```typescript
  language: {
    switch: "English",
    switchAriaLabel: "Switch to English (Saesneg)"
  },
```

---

### File 8: Unit test — `apps/web/src/pages/index.test.ts`

The existing tests assert on `en.welshAvailableText`, `en.welshAvailableLink`, `cy.welshAvailableText`, and `cy.welshAvailableLink` indirectly through `expect.objectContaining`. Check for any direct assertions on these keys and remove them. The controller itself does not change — it still renders `index` with `{ en, cy }` — so the test structure remains the same. Only assertions that specifically check for the removed keys need updating.

Looking at the current test file, no test directly asserts on `welshAvailableText` or `welshAvailableLink` by name. The `expect.objectContaining` blocks only assert on `hearingsList`, `additionalInfo`, and `continueButton`, so **no changes are required to `index.test.ts`** unless a test explicitly verifies those keys.

---

### File 9: E2E tests — `e2e-tests/tests/landing-page.spec.ts`

The test "should display Welsh language toggle in inset text" asserts on `.govuk-inset-text` and `a[href="?lng=cy"]` within it. That test must be updated: remove the inset text assertion and instead verify the toggle exists in the service navigation bar.

The Welsh language test "should switch to Welsh and display translated content @nightly" asserts on `.govuk-inset-text` containing the English toggle link (`a[href="?lng=en"]`). That assertion must be replaced with a check for the toggle in the service navigation.

**Updated landing page E2E test (replace the two affected assertions):**

```typescript
// Replace "should display Welsh language toggle in inset text"
test("should display Welsh language toggle in service navigation", async ({ page }) => {
  await page.goto("/");
  const languageToggle = page.getByRole("link", { name: /cymraeg/i });
  await expect(languageToggle).toBeVisible();
  await expect(languageToggle).toHaveAttribute("href", "?lng=cy");
});
```

In the Welsh journey test, replace:
```typescript
// OLD - inset text assertion
const insetText = page.locator(".govuk-inset-text");
await expect(insetText).toContainText("Mae'r gwasanaeth hwn hefyd ar gael yn");
const englishLink = insetText.locator('a[href="?lng=en"]');
await expect(englishLink).toHaveText("Saesneg (English)");
```
With:
```typescript
// NEW - service navigation assertion
const englishToggle = page.getByRole("link", { name: /english/i });
await expect(englishToggle).toBeVisible();
await expect(englishToggle).toHaveAttribute("href", "?lng=en");
```

---

### File 10: E2E tests — `e2e-tests/tests/page-structure.spec.ts`

Multiple tests in this file assert on the toggle being in `.govuk-phase-banner`. All such assertions need updating to target the service navigation instead.

Affected tests:
- "should display Welsh toggle in beta banner" — asserts `'.govuk-phase-banner a:has-text("Cymraeg")'`
- "Welsh Language Toggle > should switch to Welsh and back to English" — uses `'.govuk-phase-banner a:has-text("Cymraeg")'` and `'.govuk-phase-banner a:has-text("English")'` as selectors
- "Responsive Design > should display correctly on desktop @nightly" — asserts `'.govuk-phase-banner a:has-text("Cymraeg")'`
- "Keyboard Navigation > should navigate through header and footer links with Tab key" — includes `'.govuk-phase-banner a:has-text("Cymraeg")'` in `keyElements`
- "Accessibility > should have visible focus states on all interactive elements" — includes `'.govuk-phase-banner a:has-text("Cymraeg")'` in `elements`

All of these must be updated to use a service navigation selector, for example:
```typescript
// OLD
const languageToggle = page.locator('.govuk-phase-banner a:has-text("Cymraeg")');
// NEW
const languageToggle = page.getByRole("link", { name: /cymraeg/i });
```

The test "should display Welsh toggle in beta banner" should also be renamed to reflect the new location, for example "should display Welsh toggle in service navigation".

## 3. Error Handling & Edge Cases

**`languageToggle` not set:** The `translationMiddleware` sets `res.locals.languageToggle` for all routes. If for any reason it is absent (e.g., a middleware ordering issue), the `href` attribute on the toggle link will render empty. This is not a regression — it was the same behaviour in the phase banner. No additional guard is required.

**Admin pages with `hideLanguageToggle: true`:** These already pass this value through `res.render()` locals. Nunjucks merges render locals with `res.locals`, with render locals taking precedence, so `hideLanguageToggle` will be truthy in the template and the toggle will not render. No admin controller changes are needed.

**Pages that do not set `hideLanguageToggle`:** All public-facing pages omit this key, so it defaults to `undefined` (falsy), and `{% if not hideLanguageToggle %}` evaluates to true — the toggle is shown. This is the correct default.

**Query parameter preservation:** The existing `translationMiddleware` sets `languageToggle.link` to `?lng=<otherLocale>` preserving existing query parameters. This behaviour is unchanged; the link in service navigation uses the same `languageToggle.link` value.

**The `language.switchPhaseBanner` key rename:** Any code that references `language.switchPhaseBanner` directly (outside the phase banner template, which is the only consumer) must be updated. A grep confirms the only usage is in `phase-banner-content.njk` and the locale files themselves — no TypeScript code references this key directly.

## 4. Acceptance Criteria Mapping

| Acceptance Criterion | Implementation |
|---|---|
| Language toggle appears in service navigation bar on all public pages | `service-navigation.njk` renders toggle when `not hideLanguageToggle` |
| Language toggle absent from admin/system-admin pages | Existing `hideLanguageToggle: true` in admin render calls suppresses it |
| Language toggle removed from phase banner | Block removed from `phase-banner-content.njk` |
| Language toggle removed from landing page inset text | `govuk-inset-text` block removed from `apps/web/src/pages/index.njk`; keys removed from `en.ts`/`cy.ts` |
| Toggle link is accessible (aria-label) | `switchAriaLabel` key added to both locale files; used as `aria-label` on the link |
| English/Welsh toggle text correct | `language.switch` = "Cymraeg" in en.ts, "English" in cy.ts |

## 5. Open Questions / Clarifications Needed

**Toggle link text:** The current phase banner uses `language.switchPhaseBanner` which shows just "Cymraeg" or "English". In the service navigation, a more descriptive label like "Cymraeg" (visible) with `aria-label="Switch to Welsh (Cymraeg)"` is proposed for accessibility. Confirm whether design wants different visible text (e.g., "Welsh / Cymraeg") or the single-word current approach is acceptable.

**Toggle position relative to sign-in/sign-out:** The plan places the toggle before the sign-in link (left of it). Confirm the desired visual order — some services place the language toggle after the sign-in link on the right edge.

**`language.switchPhaseBanner` key removal timing:** This rename will break any other template or code that references `language.switchPhaseBanner`. A full-codebase grep confirms only `phase-banner-content.njk` uses it, but confirm no downstream consumers (e.g., automated screenshots, external config) rely on it.

**Admin dashboard page-structure tests:** The `page-structure.spec.ts` E2E test currently visits `/` (public landing page) to verify the toggle in the phase banner. After this change the phase banner will no longer contain the toggle. The E2E tests need updating as described above — confirm whether the `page-structure.spec.ts` tests should be consolidated into `landing-page.spec.ts` or kept separate.
