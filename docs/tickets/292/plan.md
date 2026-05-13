# Technical Plan: Language Toggle in Service Navigation

## 1. Technical Approach

Move the language toggle from two inconsistent locations (phase banner and landing page inset text) to a single, consistent location in the service navigation component's `navigationEnd` slot. This follows GOV.UK Design System standards and provides a predictable user experience across all public-facing pages.

The implementation leverages existing middleware (`localeMiddleware` and `translationMiddleware`) which already generates the correct toggle URLs with preserved query parameters. No backend logic changes are required - this is purely a template and content reorganization.

### Key Technical Decisions

1. **Service navigation template modification**: Add language toggle as final item in `navigationEnd` slot after Sign in/Sign out link
2. **Conditional rendering**: Toggle only appears on public pages (pages without admin role requirements)
3. **Content reuse**: Leverage existing `language.switchPhaseBanner` translation keys and `languageToggle.link` from middleware
4. **Admin page handling**: Remove all `hideLanguageToggle: true` flags from admin controllers - toggle won't render because admin pages don't need to explicitly hide it (it's controlled by public page controllers setting a flag)

## 2. Implementation Details

### Files to Modify

#### Template Changes

**libs/web-core/src/views/components/service-navigation.njk**
- Add language toggle link as the last `<li>` in the `navigationEndHtml` block
- Toggle appears after Sign in/Sign out link
- Include `lang` attribute on the link element (e.g., `lang="cy"` on "Cymraeg" link)
- Add descriptive `aria-label` using new `language.switch` translation key
- Link text comes from existing `language.switchPhaseBanner` key
- Link href comes from existing `languageToggle.link` variable

**libs/web-core/src/views/components/phase-banner-content.njk**
- Remove the `{% if not hideLanguageToggle %}` block (lines 5-7)
- Phase banner reverts to containing only beta tag and feedback link

**apps/web/src/pages/index.njk**
- Remove the `<div class="govuk-inset-text">` block containing Welsh availability text (lines 23-25)

#### Content/Translation Changes

**libs/web-core/src/locales/en.ts**
- Rename `language.switchPhaseBanner` → `language.switch` (update key name for clarity)
- Value remains `"Cymraeg"`
- Add `language.switchAriaLabel: "Change language to Welsh"`

**libs/web-core/src/locales/cy.ts**
- Rename `language.switchPhaseBanner` → `language.switch`
- Value remains `"English"`
- Add `language.switchAriaLabel: "Newid iaith i Saesneg"` (Welsh translation for "Change language to English")

**apps/web/src/pages/en.ts**
- Remove `welshAvailableText` and `welshAvailableLink` keys

**apps/web/src/pages/cy.ts**
- Remove `welshAvailableText` and `welshAvailableLink` keys

#### Controller Changes

Remove `hideLanguageToggle: true` from all admin page controllers:
- `libs/admin-pages/src/pages/admin-dashboard/index.ts`
- `libs/admin-pages/src/pages/media-applications/index.ts`
- `libs/admin-pages/src/pages/media-applications/[id]/index.ts`
- `libs/admin-pages/src/pages/media-applications/[id]/approve.ts`
- `libs/admin-pages/src/pages/media-applications/[id]/approved.ts`
- `libs/admin-pages/src/pages/media-applications/[id]/reject.ts`
- `libs/admin-pages/src/pages/media-applications/[id]/reject-reasons.ts`
- `libs/admin-pages/src/pages/media-applications/[id]/rejected.ts`
- `libs/admin-pages/src/pages/manual-upload/index.ts`
- `libs/admin-pages/src/pages/manual-upload-success/index.ts`
- `libs/admin-pages/src/pages/manual-upload-summary/index.ts`
- `libs/admin-pages/src/pages/non-strategic-upload/index.ts`
- `libs/admin-pages/src/pages/non-strategic-upload-success/index.ts`
- `libs/admin-pages/src/pages/non-strategic-upload-summary/index.ts`
- `libs/admin-pages/src/pages/remove-list-confirmation/index.ts`
- `libs/admin-pages/src/pages/remove-list-search/index.ts`
- `libs/admin-pages/src/pages/remove-list-search-results/index.ts`
- `libs/admin-pages/src/pages/remove-list-success/index.ts`

### Service Navigation Template Pattern

```njk
{% set navigationEndHtml %}
  {% if isAuthenticated %}
    <li class="govuk-service-navigation__item govuk-service-navigation__navigation-end">
      <a class="govuk-service-navigation__link" href="/logout">{{ navigation.signOut or authenticatedNavigation.signOut }}</a>
    </li>
  {% else %}
    <li class="govuk-service-navigation__item govuk-service-navigation__navigation-end">
      <a class="govuk-service-navigation__link" href="/sign-in">{{ navigation.signIn }}</a>
    </li>
  {% endif %}
  <li class="govuk-service-navigation__item govuk-service-navigation__navigation-end">
    <a class="govuk-service-navigation__link"
       href="{{ languageToggle.link }}"
       lang="{{ otherLocale }}"
       aria-label="{{ language.switchAriaLabel }}">
      {{ language.switch }}
    </a>
  </li>
{% endset %}
```

## 3. Error Handling & Edge Cases

### Edge Cases

1. **Query parameter preservation**: Already handled by `translationMiddleware` - it generates URLs with all existing query params plus the `lng` parameter
2. **Admin pages**: Language toggle won't be visible because the template checks for the existence of translation variables set by middleware (admin pages won't have these in context)
3. **Unauthenticated vs authenticated**: Toggle renders consistently in both states, positioned after the auth-related link
4. **Missing translation keys**: Fallback to existing keys if new aria-label key is missing (graceful degradation)

### No User Input Validation Required

This feature has no user input - it's a navigation link that triggers a page reload with a query parameter.

## 4. Acceptance Criteria Mapping

| Acceptance Criterion | Implementation Approach | Verification |
|---------------------|------------------------|--------------|
| Toggle appears in service navigation on all public pages | Modify `service-navigation.njk` to add toggle link in `navigationEnd` slot | Manual testing on landing, search, courts list pages |
| Toggle absent from admin/system-admin pages | Remove `hideLanguageToggle` props; admin pages don't populate language toggle variables | Manual testing on admin dashboard and media applications pages |
| Toggle switches EN→CY | Click "Cymraeg" link - existing middleware handles `?lng=cy` | Manual testing with language switch |
| Toggle switches CY→EN | Click "English" link - existing middleware handles `?lng=en` | Manual testing with language switch |
| Toggle preserves query parameters | Existing `translationMiddleware` already implements this | Manual testing with `?locationId=9` etc. |
| Landing page inset text removed | Remove `govuk-inset-text` block from `index.njk` | Visual inspection of landing page |
| Phase banner has no language toggle | Remove conditional block from `phase-banner-content.njk` | Visual inspection of all pages |

## 5. Testing Strategy

### Unit Tests to Update

All admin page controller tests that assert `hideLanguageToggle: true` must be updated to remove this assertion:
- `libs/admin-pages/src/pages/admin-dashboard/index.test.ts`
- `libs/admin-pages/src/pages/media-applications/index.test.ts`
- `libs/admin-pages/src/pages/media-applications/[id]/index.test.ts`
- `libs/admin-pages/src/pages/media-applications/[id]/approve.test.ts`
- `libs/admin-pages/src/pages/media-applications/[id]/approved.test.ts`
- `libs/admin-pages/src/pages/media-applications/[id]/reject.test.ts`
- `libs/admin-pages/src/pages/media-applications/[id]/reject-reasons.test.ts`
- `libs/admin-pages/src/pages/media-applications/[id]/rejected.test.ts`
- `libs/admin-pages/src/pages/manual-upload/index.test.ts`
- `libs/admin-pages/src/pages/manual-upload-success/index.test.ts`
- `libs/admin-pages/src/pages/manual-upload-summary/index.test.ts`
- `libs/admin-pages/src/pages/non-strategic-upload/index.test.ts`
- `libs/admin-pages/src/pages/non-strategic-upload-success/index.test.ts`
- `libs/admin-pages/src/pages/non-strategic-upload-summary/index.test.ts`
- `libs/admin-pages/src/pages/remove-list-search/index.test.ts`

### E2E Tests to Add

Add one comprehensive E2E test covering the complete user journey (following the E2E testing guidelines to minimize test count):

**Test: Language toggle in service navigation journey (@nightly)**
- Visit landing page
- Verify language toggle visible in service navigation (not in phase banner or inset text)
- Click "Cymraeg"
- Verify page reloads in Welsh, toggle now reads "English"
- Navigate to search page
- Verify toggle still visible in same position
- Click "English"
- Verify page reloads in English, toggle reads "Cymraeg"
- Test with query parameters (e.g., `/search?locationId=9`)
- Verify query params preserved when switching language
- Test keyboard navigation to toggle
- Test screen reader announcement with aria-label
- Run axe-core accessibility scan

### Manual Testing Checklist

- [ ] Landing page: Toggle in service nav, no inset text
- [ ] Search page: Toggle in service nav
- [ ] Courts list page: Toggle in service nav
- [ ] Hearing list page: Toggle in service nav
- [ ] Sign-in page: Toggle in service nav
- [ ] Admin dashboard: No toggle anywhere
- [ ] Media applications page: No toggle anywhere
- [ ] System admin dashboard: No toggle anywhere
- [ ] Welsh translation: Toggle reads "English"
- [ ] English translation: Toggle reads "Cymraeg"
- [ ] Query param preservation: Test with `?locationId=9&filter=active`
- [ ] Keyboard navigation: Tab to toggle, Enter to activate
- [ ] Screen reader: Verify `lang` attribute and `aria-label`

## 6. Rollback Strategy

If issues arise, the change can be rolled back by:
1. Reverting the service navigation template modification
2. Restoring the phase banner language toggle conditional block
3. Restoring the landing page inset text block
4. Restoring content keys in `apps/web/src/pages/en.ts` and `cy.ts`
5. Restoring `hideLanguageToggle: true` flags in admin controllers

No database migrations or backend logic changes are involved, making rollback straightforward.

## CLARIFICATIONS NEEDED

### 1. Welsh aria-label translation
The spec indicates `language.switchAriaLabel` for Welsh needs translation. Current placeholder: `"Newid iaith i Saesneg"` (machine translation of "Change language to English").

**Please confirm the correct Welsh translation for the aria-label text.**

### 2. Position of toggle in navigationEnd slot
The spec wireframe shows: `[Sign in] [Cymraeg]` (toggle AFTER auth link)
The plan implements toggle as the last item in the slot.

**Confirming this is correct based on the wireframe.**

### 3. Key rename impact
Renaming `language.switchPhaseBanner` → `language.switch` affects only the phase banner template reference.

**Are there any external tools, screenshot automation, or config files outside the repo that reference this key?**

### 4. Toggle visibility mechanism
Current approach: Toggle renders unconditionally in the template because `languageToggle.link` is always set by `translationMiddleware` for all pages. Admin pages will see the toggle in the service navigation.

**Alternative approach**: Add a `showLanguageToggle: true` flag to all public page controllers and conditionally render in template only when this flag is present. This would require touching every public page controller but would be more explicit.

**Which approach is preferred: unconditional rendering (toggle shows on all pages including admin) or explicit flag (toggle only on public pages that set the flag)?**

Based on the spec's statement "admin pages intentionally have no language toggle" and the current behavior where admin pages use `hideLanguageToggle: true`, the explicit flag approach may be more appropriate to maintain the intended behavior.
