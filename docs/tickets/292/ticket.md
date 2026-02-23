# #292: [VIBE-297] Language toggle link is not consistent across different pages

**State:** OPEN
**Assignees:** Unassigned
**Author:** linusnorton
**Labels:** migrated-from-jira, status:new, priority:3-medium, type:story, jira:VIBE-297
**Created:** 2026-01-20T17:19:25Z
**Updated:** 2026-02-23T16:16:30Z

## Description

> **Migrated from [VIBE-297](https://tools.hmcts.net/jira/browse/VIBE-297)**

## Original JIRA Metadata

- **Status**: New
- **Priority**: 3-Medium
- **Issue Type**: Story
- **Assignee**: Unassigned
- **Created**: 12/1/2025
- **Updated**: 12/1/2025
- **Original Labels**: cath

## Comments

### Comment by OgechiOkelu on 2026-02-23T14:43:50Z

@SPEC new-feature.md

### Comment by hmctsclaudecode on 2026-02-23T14:50:14Z

## 1. User Story

**As a** user of the Court and Tribunal Hearings service
**I want to** see a consistent language toggle link in the same location on every page
**So that** I can switch between English and Welsh at any point in my journey without confusion

## 2. Background

The service currently implements the language toggle in two different locations depending on which page is being viewed:

1. **Phase banner** (`libs/web-core/src/views/components/phase-banner-content.njk`): A link floated to the right inside the beta banner using an inline `style="float: right;"`. This appears on most public-facing pages but is explicitly hidden on all admin and system-admin pages via `hideLanguageToggle: true` in the controller.

2. **Landing page inset text** (`apps/web/src/pages/index.njk`): An additional, distinct toggle inside a `govuk-inset-text` component using different text ("This service is also available in Welsh (Cymraeg)"). This only exists on the landing page, so users who navigate deeper lose this affordance and are dependent on the phase banner version.

This duplication on the landing page and inconsistency with other pages (including the complete absence of a toggle on admin pages) creates a confusing and non-standard user experience.

The GOV.UK Design System Service Navigation component supports a `navigationEnd` slot which is already used for Sign in/Sign out. The language toggle should be moved into the service navigation header to provide a consistent, accessible, and design-system-compliant location across all public-facing pages.

## 3. Acceptance Criteria

* **Scenario:** Language toggle appears in service navigation on all public-facing pages
    * **Given** a user visits any public page (landing, search, view-option, courts list, hearing lists, sign-in, account pages)
    * **When** the page loads
    * **Then** the language toggle link is rendered inside the service navigation bar, to the right of the navigation items and Sign in/Sign out link

* **Scenario:** Language toggle is absent from admin and system-admin pages
    * **Given** a user visits any admin or system-admin page
    * **When** the page loads
    * **Then** no language toggle is rendered anywhere on the page (service navigation or phase banner)

* **Scenario:** Toggle switches from English to Welsh
    * **Given** the user is viewing a page in English
    * **When** they click the language toggle in the service navigation
    * **Then** the page reloads with `?lng=cy` appended, all content renders in Welsh, and the toggle now reads "English"

* **Scenario:** Toggle switches from Welsh to English
    * **Given** the user is viewing a page in Welsh (`lng=cy`)
    * **When** they click the language toggle in the service navigation
    * **Then** the page reloads with `?lng=en`, all content renders in English, and the toggle now reads "Cymraeg"

* **Scenario:** Toggle preserves existing query parameters
    * **Given** the user is on a page with existing query parameters (e.g., `?locationId=9&filter=active`)
    * **When** they click the language toggle
    * **Then** all existing query parameters are preserved and only `lng` is added or updated

* **Scenario:** Landing page inset text is removed
    * **Given** a user visits the landing page (`/`)
    * **When** the page loads
    * **Then** the `govuk-inset-text` containing "This service is also available in Welsh (Cymraeg)" is no longer present

* **Scenario:** Phase banner no longer contains a language toggle
    * **Given** a user visits any page
    * **When** the page loads
    * **Then** the phase banner contains only the beta tag and feedback link — no language toggle link

## 4. User Journey Flow

```
User arrives at any public page
        |
        v
Service navigation renders:
  [Service name]  [Sign in / Sign out]  [Cymraeg / English]
        |
User clicks language toggle
        |
        v
Page reloads with lng= parameter
        |
        v
All content, navigation labels, footer links render in chosen language
        |
        v
Toggle label updates to other language name
```

## 5. Low Fidelity Wireframe

### Service Navigation — English, unauthenticated

```
+------------------------------------------------------------------+
|  GOV.UK                                                          |
+------------------------------------------------------------------+
|  Court and tribunal hearings          [Sign in]  [Cymraeg]       |
+------------------------------------------------------------------+
| BETA  This is a new service – your feedback will help us...      |
+------------------------------------------------------------------+
```

### Service Navigation — Welsh, unauthenticated

```
+------------------------------------------------------------------+
|  GOV.UK                                                          |
+------------------------------------------------------------------+
|  Gwrandawiadau llys a thribiwnlys   [Mewngofnodi]  [English]     |
+------------------------------------------------------------------+
| BETA  Mae hwn yn wasanaeth newydd – bydd eich adborth...         |
+------------------------------------------------------------------+
```

### Service Navigation — English, authenticated (verified user)

```
+------------------------------------------------------------------+
|  GOV.UK                                                          |
+------------------------------------------------------------------+
|  Court and tribunal hearings  [nav items]  [Sign out]  [Cymraeg] |
+------------------------------------------------------------------+
| BETA  This is a new service – your feedback will help us...      |
+------------------------------------------------------------------+
```

## 6. Page Specifications

### service-navigation.njk

The language toggle must be appended to the `navigationEnd` slot alongside the existing Sign in/Sign out link. Both items sit inside the `<ul>` rendered by the slot.

The toggle renders as a `<li>` element with the GOV.UK service navigation link class. It is always the last item in the slot, to the right of the authentication link.

The toggle link text uses the existing `language.switchPhaseBanner` translation key, which already returns:
- `"Cymraeg"` when the current locale is `en`
- `"English"` when the current locale is `cy`

The `href` comes from the existing `languageToggle.link` template variable, which is set by `translationMiddleware` in `locale-middleware.ts` and already preserves all query parameters.

### phase-banner-content.njk

Remove the language toggle anchor element and the `{% if not hideLanguageToggle %}` conditional block entirely. The phase banner reverts to displaying only the beta tag and feedback link.

### apps/web/src/pages/index.njk

Remove the `<div class="govuk-inset-text">` block that contains `welshAvailableText` and `welshAvailableLink`. Remove the corresponding content keys from `apps/web/src/pages/en.ts` and `apps/web/src/pages/cy.ts`.

### Controller changes

Remove all `hideLanguageToggle: true` properties from every controller render call across:
- `libs/admin-pages/src/pages/`
- `libs/system-admin-pages/src/pages/`

The `hideLanguageToggle` mechanism in the phase banner is no longer needed once the toggle is moved to service navigation. Admin pages already exclude service navigation items (they do not pass `navigation.verifiedItems`), so the toggle can be conditionally shown via a flag in the template variable instead if needed — but the simpler approach is to keep the current `isAuthenticated` logic and add an explicit `showLanguageToggle` boolean passed from public-page controllers only.

Alternative simpler approach: pass `showLanguageToggle: true` from all public-page controllers and default to not showing it when the variable is absent. This avoids touching admin controller files.

## 7. Content

### English

| Key | Value |
|-----|-------|
| `language.switchPhaseBanner` (existing, reused) | `"Cymraeg"` |
| `language.switch` (used for aria-label) | `"Change language to Welsh"` |

### Welsh

| Key | Value |
|-----|-------|
| `language.switchPhaseBanner` (existing, reused) | `"English"` |
| `language.switch` (used for aria-label) | [WELSH TRANSLATION REQUIRED: "Change language to English"] |

The toggle link must include a visible language abbreviation to meet GOV.UK standards:
- English view: link text = `"Cymraeg"`, `lang="cy"` attribute on the link
- Welsh view: link text = `"English"`, `lang="en"` attribute on the link

The `lang` attribute is required so that assistive technologies pronounce the link text correctly.

### Content to remove

From `apps/web/src/pages/en.ts`:
- `welshAvailableText: "This service is also available in"`
- `welshAvailableLink: "Welsh (Cymraeg)"`

From `apps/web/src/pages/cy.ts`:
- `welshAvailableText: "Mae'r gwasanaeth hwn hefyd ar gael yn"`
- `welshAvailableLink: "Saesneg (English)"`

## 8. URL

No new routes. The toggle links remain `?lng=cy` and `?lng=en` with preserved existing query parameters, exactly as generated today by `translationMiddleware`.

## 9. Validation

No user input. Not applicable.

## 10. Error Messages

No user input. Not applicable.

## 11. Navigation

The toggle link is a same-page reload. On click:

1. The browser navigates to the current URL with `lng=cy` or `lng=en` set/updated in query string
2. `localeMiddleware` picks up the `lng` query parameter and sets `req.session.locale` and the `locale` cookie
3. `translationMiddleware` resolves the new locale and sets `res.locals.languageToggle.link` to the reverse toggle URL
4. The page re-renders with translated content

No redirects. No server-side POST. Existing `localeMiddleware` and `translationMiddleware` logic is unchanged.

## 12. Accessibility

- The toggle link must have a `lang` attribute matching the **target** language (e.g., `lang="cy"` on the "Cymraeg" link). This is required by WCAG 3.1.2 (Language of Parts) so screen readers switch pronunciation engines correctly.
- The link must have a descriptive `aria-label` attribute: `"Change language to Welsh"` / `"Change language to English"` to disambiguate from other links for screen reader users who navigate by links list.
- The link is a standard `<a>` element, keyboard focusable without any additional ARIA role.
- Colour contrast of the link text against the service navigation background must meet WCAG 1.4.3 (4.5:1 for normal text).
- The link target area must be at least 44×44 CSS pixels (WCAG 2.5.8, Target Size).
- No `style` attributes. All positioning handled by the GOV.UK service navigation CSS.

## 13. Test Scenarios

* User visits the landing page, sees the language toggle in the service navigation bar, sees no inset text about Welsh language availability, and no language link in the phase banner.

* User visits the search page (`/search`), sees the language toggle in the service navigation bar in the same position as on the landing page.

* User visits a hearing list page, sees the language toggle in the service navigation bar.

* User clicks "Cymraeg" on the landing page; the page reloads in Welsh, the service name reads "Gwrandawiadau llys a thribiwnlys", the toggle now reads "English".

* User clicks "English" on a Welsh-language hearing list page; the page reloads in English, preserving any `locationId` or `artefactId` query parameters, and the toggle now reads "Cymraeg".

* User visits an admin page (e.g., `/admin/dashboard`); no language toggle is visible anywhere on the page.

* User visits a system-admin page; no language toggle is visible anywhere on the page.

* Screen reader user navigates by links list; the "Cymraeg" link is announced with Welsh pronunciation (due to `lang="cy"` attribute) and the aria-label reads "Change language to Welsh".

* Keyboard user Tabs through the service navigation; the language toggle is reachable by Tab key and activatable by Enter.

* Automated axe-core accessibility scan on the landing page, search page, and a hearing list page passes with no violations.

## 14. Assumptions & Open Questions

* The admin pages intentionally have no language toggle. This behaviour is preserved. `hideLanguageToggle` flags in admin controllers are removed but the net effect is the same because the service navigation template will only render the toggle when the `showLanguageToggle` variable is truthy, and admin controllers do not set it.

* The footer link `href: "https://www.gov.uk/cymraeg"` with text "Welsh"/"Cymraeg" is a different concept (GOV.UK Welsh language information page) and is **not** changed by this work.

* The existing `localeMiddleware` and `translationMiddleware` logic requires no changes; only the template placement of the toggle link changes.

* Should the language toggle on admin pages be re-enabled in future, it can be done by setting `showLanguageToggle: true` in the relevant controllers without touching shared templates.

* Open question: Should the `language.switch` aria-label key be added to the existing locale files in `libs/web-core/src/locales/` or to a new dedicated key in the page-level locale files? Recommendation: add to `libs/web-core/src/locales/en.ts` and `cy.ts` as it is a shared, global UI element.

### Comment by OgechiOkelu on 2026-02-23T16:16:30Z

@plan
