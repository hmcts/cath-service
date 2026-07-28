# #893: Add publishing policy link to CaTH footer

**State:** OPEN
**Assignees:** None
**Author:** OgechiOkelu
**Labels:** None
**Created:** 2026-07-28T13:32:47Z
**Updated:** 2026-07-28T13:56:00Z

## Description

**PROBLEM STATEMENT**
This ticket is raised to add the publishing policy link to CaTH footer.

 

**AS A** Service

**I WANT** to add the publishing policy link to CaTH footer

**SO THAT** users can access the required information 

 

**ACCEPTANCE CRITERIA** 

- The publishing policy link is added to all CaTH pages footer, immediately after the 'Government Digital Service' link.
- When a CaTH user clicks on the publishing policy link, a pop-up page is opened and displays the information in the attached document
- The pop-up page should be built into CaTH similar to the accessibility page
- Welsh translations for the information is attached 

[ublishing policy link Mock Up .docx](https://github.com/user-attachments/files/30463921/ublishing.policy.link.Mock.Up.docx)

[Publishing Policy - Third Party Data Licence.docx](https://github.com/user-attachments/files/30463942/Publishing.Policy.-.Third.Party.Data.Licence.docx)

[CY Publishing Policy - Third Party Data Licence.docx](https://github.com/user-attachments/files/30463953/CY.Publishing.Policy.-.Third.Party.Data.Licence.docx)

## Comments

### Comment by OgechiOkelu on 2026-07-28T13:33:02Z

@spec 

### Comment by hmctsclaudecode on 2026-07-28T13:37:36Z

# Add publishing policy link to CaTH footer

**Issue:** #893

## 1. User Story
**As a** member of the public or professional user of the Court and Tribunal Hearings (CaTH) service
**I want to** open a publishing policy page from a link in the footer of every CaTH page
**So that** I can read the service's publishing policy and third party data licence terms before relying on or re-using published hearing information

## 2. Background

The CaTH footer currently renders eight meta links from `libs/web-core/src/views/components/site-footer.njk`, ending with "Government Digital Service". HMCTS legal/policy has produced a "Publishing Policy – Third Party Data Licence" document that must be discoverable from every page of the service, so that users re-using hearing list data understand the licence terms attached to it. This complements the existing Open Government Licence and Open Justice Licence attribution text already rendered in the footer content licence block.

The issue specifies the page must be "built into CaTH similar to the accessibility page". The accessibility statement is the reference implementation:

- Shared page content lives in `libs/web-core/src/locales/accessibility-statement/{en,cy}.ts` and is exported from `libs/web-core/src/index.ts` as `accessibilityStatementEn` / `accessibilityStatementCy`.
- The page controller and template live at `apps/web/src/pages/(core)/accessibility-statement/{index.ts,index.njk}` — auto-discovered by `createSimpleRouter` in `apps/web/src/app.ts:211`, so no manual route registration is needed.
- The footer link uses `target="_blank"` with `rel="noopener noreferrer"`, which satisfies the issue's "pop-up page" requirement (a new browser tab, not a JavaScript modal or `window.open` popup).

Supporting documents attached to the issue:

- `ublishing policy link Mock Up .docx` — footer placement mock-up
- `Publishing Policy - Third Party Data Licence.docx` — English copy
- `CY Publishing Policy - Third Party Data Licence.docx` — Welsh copy

**These three attachments could not be read while producing this specification.** All structural, routing, accessibility and test requirements below are complete and implementable. The page's body prose must be transcribed from the two policy `.docx` files during implementation — see section 7 and section 14.

## 3. Acceptance Criteria

* **Scenario:** Publishing policy link appears in the footer of every page
    * **Given** a user is on any CaTH page (public, verified, admin or list-type page)
    * **When** the page renders
    * **Then** the footer meta list contains nine links, and a "Publishing policy" link appears immediately after the "Government Digital Service" link

* **Scenario:** Publishing policy link opens in a new tab
    * **Given** a user is viewing any CaTH page
    * **When** they activate the "Publishing policy" footer link
    * **Then** `/publishing-policy` opens in a new browser tab with `rel="noopener noreferrer"`, and the originating page is left untouched with its scroll position and any form state intact

* **Scenario:** Publishing policy page renders the policy content in English
    * **Given** the current locale is English
    * **When** a user visits `/publishing-policy`
    * **Then** the page renders with `<h1>` "Publishing policy", the full third party data licence content in English, and the document title "Publishing policy - Court and tribunal hearings - GOV.UK"

* **Scenario:** Publishing policy page renders the policy content in Welsh
    * **Given** the current locale is Welsh (set via the `lng=cy` query parameter, session or `locale` cookie)
    * **When** a user visits `/publishing-policy`
    * **Then** the page renders the Welsh translation of every heading, paragraph and list item, and the `<html lang>` attribute is `cy`

* **Scenario:** Footer link text is translated
    * **Given** the current locale is Welsh
    * **When** any CaTH page renders
    * **Then** the footer link text is the Welsh translation of "Publishing policy", and its `href` still points to `/publishing-policy`

* **Scenario:** Page is reachable directly and is accessible
    * **Given** a user navigates directly to `/publishing-policy` (bookmark, shared URL, or search result)
    * **When** the page loads
    * **Then** it returns HTTP 200 with no authentication required, and an axe-core scan against WCAG 2.2 AA reports no violations

* **Scenario:** Language toggle works on the publishing policy page
    * **Given** a user is on `/publishing-policy` in English
    * **When** they activate the "Cymraeg" toggle in the phase banner
    * **Then** the same page is re-rendered in Welsh with `?lng=cy` applied

## 4. User Journey Flow

```
┌──────────────────────────────────┐
│  Any CaTH page                   │
│  (e.g. /, /search, a hearing     │
│   list, admin dashboard)         │
│                                  │
│  ┌────────────────────────────┐  │
│  │ Footer meta links          │  │
│  │  Help                      │  │
│  │  Privacy                   │  │
│  │  Cookies          [new tab]│  │
│  │  Accessibility    [new tab]│  │
│  │  Contact                   │  │
│  │  Terms and conditions      │  │
│  │  Welsh                     │  │
│  │  Government Digital Service│  │
│  │  Publishing policy ◄── NEW │  │
│  │                   [new tab]│  │
│  └──────────┬─────────────────┘  │
└─────────────┼────────────────────┘
              │ user activates link
              │ (target="_blank")
              ▼
┌──────────────────────────────────────────────┐
│  NEW TAB: GET /publishing-policy             │
│                                              │
│  • Locale resolved by localeMiddleware from   │
│    lng query param → session → locale cookie  │
│  • Controller selects en or cy content object │
│  • Static content page — no forms, no state   │
│                                              │
│  ┌────────────────────────────────────────┐  │
│  │ h1: Publishing policy                  │  │
│  │ Policy body + third party data licence │  │
│  │ Back to top link                       │  │
│  └────────────────────────────────────────┘  │
│                                              │
│  Exits available:                            │
│   • Cymraeg / English toggle (phase banner)   │
│   • Footer + header links                     │
│   • Close tab → returns to originating page   │
└──────────────────────────────────────────────┘
```

No back link is rendered — the page opens in a new tab with no browser history to go back to. This matches the cookie policy page, which blanks the `backLink` block for the same reason (`apps/web/src/pages/(core)/cookie-policy/index.njk:14`).

## 5. Low Fidelity Wireframe

### Footer on all pages (link placement)

```
════════════════════════════════════════════════════════════════════
  ─────────────────────────────────────────────────────────────────
  Help   Privacy   Cookies   Accessibility statement   Contact
  Terms and conditions   Welsh   Government Digital Service
  Publishing policy                        ◄── NEW, last in list
  ─────────────────────────────────────────────────────────────────

  All content is available under the Open Government Licence v3.0,
  except where otherwise stated.

  When you use this information under the OGL, you should include
  the following attribution:
  Contains public sector information licensed under the
  Open Government Licence v3.0.

  The Open Government Licence v3.0 does not cover use of any
  personal data in the Court and tribunal hearings service.
  Personal data is subject to applicable data protection laws.

  Contains information licensed under the Open Justice Licence v2.0.

  [Crown logo]  © Crown copyright
════════════════════════════════════════════════════════════════════
```

### `/publishing-policy` page (new tab)

```
┌──────────────────────────────────────────────────────────────────┐
│  ≡ GOV.UK                                              Sign in   │
├──────────────────────────────────────────────────────────────────┤
│  Court and tribunal hearings                                     │
├──────────────────────────────────────────────────────────────────┤
│  ┌──────┐  This is a new service – your feedback will help us    │
│  │ beta │  to improve it.                          Cymraeg       │
│  └──────┘                                                        │
│                                                                  │
│  (no back link — page opened in a new tab)                       │
│                                                                  │
│  ╔══════════════════════════════════════════════════════════╗    │
│  ║ Publishing policy                            <h1>        ║    │
│  ║                                                          ║    │
│  ║ Lorem ipsum introductory paragraph explaining the scope   ║    │
│  ║ of the publishing policy and who it applies to.           ║    │
│  ║                                                          ║    │
│  ║ Third party data licence                     <h2>        ║    │
│  ║                                                          ║    │
│  ║ Paragraph of licence terms.                              ║    │
│  ║                                                          ║    │
│  ║   • bullet point of a licence condition                  ║    │
│  ║   • bullet point of a licence condition                  ║    │
│  ║   • bullet point of a licence condition                  ║    │
│  ║                                                          ║    │
│  ║ Sub-heading                                  <h3>        ║    │
│  ║                                                          ║    │
│  ║ Further paragraph, with an inline link to related        ║    │
│  ║ guidance where the source document has one.              ║    │
│  ║                                                          ║    │
│  ║ ↑ Back to top                                            ║    │
│  ╚══════════════════════════════════════════════════════════╝    │
│                                                                  │
├──────────────────────────────────────────────────────────────────┤
│  Help  Privacy  Cookies  Accessibility statement  Contact        │
│  Terms and conditions  Welsh  Government Digital Service         │
│  Publishing policy                                               │
│  [OGL / Open Justice Licence text]        © Crown copyright      │
└──────────────────────────────────────────────────────────────────┘
```

Content occupies the standard two-thirds grid column used by the accessibility statement, so line length stays within the readable measure.

## 6. Page Specifications

### 6.1 Files to create

| File | Purpose |
|---|---|
| `libs/web-core/src/locales/publishing-policy/en.ts` | English page content, exported as `en` |
| `libs/web-core/src/locales/publishing-policy/cy.ts` | Welsh page content, exported as `cy`, identical key structure |
| `apps/web/src/pages/(core)/publishing-policy/index.ts` | `GET` controller |
| `apps/web/src/pages/(core)/publishing-policy/index.njk` | Nunjucks template |
| `apps/web/src/pages/(core)/publishing-policy/index.test.ts` | Controller unit tests |
| `apps/web/src/pages/(core)/publishing-policy/index.njk.test.ts` | Template render tests |

### 6.2 Files to modify

| File | Change |
|---|---|
| `libs/web-core/src/index.ts` | Add `export { en as publishingPolicyEn } from "./locales/publishing-policy/en.js";` and the matching `cy` export, keeping the existing alphabetical ordering enforced by Biome |
| `libs/web-core/src/locales/en.ts` | Add `publishingPolicy: "Publishing policy"` to the `footer` object, immediately after `governmentDigitalService` |
| `libs/web-core/src/locales/cy.ts` | Add the Welsh `publishingPolicy` key in the same position |
| `libs/web-core/src/views/components/site-footer.njk` | Add a ninth `meta.items` entry after the Government Digital Service entry |
| `libs/web-core/src/locales/en.test.ts` | Assert `en.footer.publishingPolicy` in the existing "should have footer object with required properties" test |
| `libs/web-core/src/locales/cy.test.ts` | Assert the Welsh equivalent |
| `e2e-tests/tests/page-structure.spec.ts` | Change the footer meta link count assertion from `8` to `9` (line 46) and add the new-tab assertions for `/publishing-policy` |

Content is placed in `libs/web-core` rather than co-located with the controller because, like the accessibility statement and cookie policy, it is service-wide legal content reachable from a global footer — the exception to the co-location default documented in `CLAUDE.md`.

### 6.3 Footer link specification

Insert as the final entry of `meta.items` in `libs/web-core/src/views/components/site-footer.njk`, after the Government Digital Service item at lines 44–47:

```njk
{
  href: "/publishing-policy",
  text: footer.publishingPolicy,
  attributes: {
    target: "_blank",
    rel: "noopener noreferrer",
    "aria-label": footer.publishingPolicyAriaLabel
  }
}
```

`footer.publishingPolicyAriaLabel` is a translated locale key holding "Publishing policy (opens in new tab)". The existing cookie policy entry hardcodes its English `aria-label`, which is a pre-existing defect; do not copy it. Use a locale key so the announcement is translated in Welsh.

`footer.*` values are available in every template because `translationMiddleware` spreads the current locale's translations onto `res.locals` (`libs/web-core/src/middleware/i18n/locale-middleware.ts`).

### 6.4 Controller specification

`apps/web/src/pages/(core)/publishing-policy/index.ts`, following `accessibility-statement/index.ts` exactly:

```typescript
import { publishingPolicyCy, publishingPolicyEn } from "@hmcts/web-core";
import type { Request, Response } from "express";

export const GET = async (_req: Request, res: Response) => {
  const locale = res.locals.locale || "en";
  const t = locale === "cy" ? publishingPolicyCy : publishingPolicyEn;
  res.render("publishing-policy/index", {
    en: publishingPolicyEn,
    cy: publishingPolicyCy,
    pageTitle: t.title
  });
};
```

Both `en` and `cy` are passed so the template can resolve either object, matching the accessibility statement. `pageTitle` is consumed by `components/page-title.njk` to build the `<title>`. No `POST` export — the page is read-only.

### 6.5 Template specification

`apps/web/src/pages/(core)/publishing-policy/index.njk`:

- Extends `layouts/base-template.njk`.
- Overrides `{% block page_content %}`.
- Overrides `{% block backLink %}{% endblock %}` to suppress the back link, as the cookie policy page does — the page opens in a new tab with no history entry to return to.
- Renders section content by iterating locale-file arrays rather than hardcoding prose, so the template does not need editing if the policy copy changes.
- Uses `govuk-heading-l` for `<h1>`, `govuk-heading-m` for `<h2>`, `govuk-heading-s` for `<h3>`, `govuk-body` for paragraphs and `govuk-list govuk-list--bullet` for lists.
- Ends with the same "Back to top" link markup used by the accessibility statement, driven by `t.backToTop`.
- No custom components, no JavaScript — the page works entirely without JS.

### 6.6 Non-requirements

- No database schema change, Prisma model or migration.
- No API route, and no change to `apps/api`.
- No new npm dependency.
- No change to `apps/web/vite.config.ts` — the page ships no assets.
- No authentication or authorisation — the page is public, consistent with the accessibility statement and cookie policy.
- No PDF or `.docx` download of the policy. The content is rendered as accessible HTML; publishing the source `.docx` would reintroduce exactly the flat-file accessibility problem the accessibility statement already documents as a known issue.

## 7. Content

### 7.1 Footer link text

| Key | English | Welsh |
|---|---|---|
| `footer.publishingPolicy` | Publishing policy | [WELSH TRANSLATION REQUIRED: "Publishing policy"] |
| `footer.publishingPolicyAriaLabel` | Publishing policy (opens in new tab) | [WELSH TRANSLATION REQUIRED: "Publishing policy (opens in new tab)"] |

"Publishing policy" is used rather than the full document title "Publishing Policy – Third Party Data Licence": footer meta links are short, sentence case, and the full title is too long for the inline list. The full title is used as the page `<h1>` if the mock-up requires it — confirm against the mock-up during implementation (section 14).

### 7.2 Page content structure

`libs/web-core/src/locales/publishing-policy/en.ts` and `cy.ts` must have identical key structures. Proposed shape, mirroring the accessibility statement's `sections` pattern:

```typescript
export const en = {
  title: "Publishing policy",
  backToTop: "Back to top",
  sections: {
    intro: {
      content: [
        // one entry per introductory paragraph
      ]
    },
    thirdPartyDataLicence: {
      heading: "Third party data licence",
      content: [
        // one entry per paragraph
      ],
      items: [
        // one entry per bullet point
      ]
    }
    // further sections, one per heading in the source document
  }
};
```

The precise sections, headings, paragraphs and bullets must be transcribed from `Publishing Policy - Third Party Data Licence.docx`, and the Welsh values from `CY Publishing Policy - Third Party Data Licence.docx`. **The Welsh document is authoritative — use its wording verbatim rather than generating a translation.** Only fall back to `[WELSH TRANSLATION REQUIRED: "..."]` markers for strings that appear in the English document but have no counterpart in the Welsh one.

### 7.3 Content rules

- Sentence case for all headings and the footer link.
- Plain English, addressing the user as "you".
- Any external link in the policy body renders as `class="govuk-link"` with `target="_blank" rel="noopener noreferrer"` and visible "(opens in a new window)" text, matching the AbilityNet and EASS links in the accessibility statement.
- Do not paraphrase, summarise or reorder the legal content — this is a licence document and its wording is binding.
- `title` and `backToTop` must be present in both locale files; `backToTop` in Welsh is "Yn ôl i frig y dudalen" (already used by the accessibility statement — reuse that exact string for consistency).

## 8. URL

| Method | Path | Auth | Response |
|---|---|---|---|
| `GET` | `/publishing-policy` | None | 200, HTML |

- Route is derived automatically from the directory name by `createSimpleRouter({ path: \`${__dirname}/pages\` })` at `apps/web/src/app.ts:211`. The `(core)` route group contributes no URL segment, so `apps/web/src/pages/(core)/publishing-policy/` maps to `/publishing-policy`.
- Kebab-case, singular, no trailing slash — consistent with `/accessibility-statement`, `/cookie-policy`, `/cookie-preferences`.
- `?lng=cy` and `?lng=en` are honoured by `localeMiddleware`; any other `lng` value falls back to the session locale, then the `locale` cookie, then `en`.
- Unknown query parameters are ignored.
- No route parameters, no nested routes.

## 9. Validation

There is no user input on this page — no form, no query parameter that affects rendering other than `lng`, and no request body. Input validation is therefore not applicable.

The constraints that do need enforcing are content-integrity ones, checked by unit tests rather than at runtime:

| Constraint | How it is enforced |
|---|---|
| `en.ts` and `cy.ts` have identical key structures | `expect(Object.keys(en).sort()).toEqual(Object.keys(cy).sort())` in `index.njk.test.ts`, plus the same assertion recursively for the `sections` object and each section |
| No untranslated `[TRANSLATE: ...]` marker ships | Test asserting no string value in `cy.ts` contains `TRANSLATE` |
| `lng` values outside `["en", "cy"]` do not break rendering | Existing `localeMiddleware` behaviour; covered by a controller test with `res.locals.locale` unset, asserting the English fallback |
| Footer link count stays correct | `toHaveCount(9)` in `e2e-tests/tests/page-structure.spec.ts` |

## 10. Error Messages

No user-facing error messages are introduced. The page has no form, so there is no error summary and no inline field errors — `{% block error_summary %}` is left as inherited from the base template.

Failure modes fall back to existing global handling in `libs/web-core/src/middleware/govuk-frontend/error-handler.js`:

| Condition | Result |
|---|---|
| Mistyped URL, e.g. `/publishing-policy-x` | Existing 404 page (`views/errors/404.njk`) |
| Template or render failure | Existing 500 page (`views/errors/500.njk`) — "Sorry, there is a problem with the service" |

Neither needs new copy.

## 11. Navigation

**Entry points**

- Footer "Publishing policy" link on every CaTH page — the primary and only in-service entry point.
- Direct URL entry, bookmark, or an externally shared link.

**Behaviour on activation**

Opens `/publishing-policy` in a new browser tab (`target="_blank"`, `rel="noopener noreferrer"`). `rel="noopener"` prevents the new tab reaching the originating page via `window.opener`; `rel="noreferrer"` suppresses the `Referer` header. This mirrors the existing accessibility statement and cookie policy links and satisfies the issue's "pop-up page" requirement.

Opening in a new tab is deliberate here despite GDS guidance generally discouraging it: the link sits in the global footer and is reachable mid-journey, including from pages holding unsaved form state. Opening in the same tab would discard that state. The behaviour is announced to assistive technology through the "(opens in new tab)" `aria-label`, which is the mitigation GDS asks for when a new tab is genuinely warranted.

**Exits from the page**

- Language toggle in the phase banner — re-renders `/publishing-policy` with `lng` flipped, preserving other query parameters (handled by `translationMiddleware`).
- Standard footer and header links.
- Closing the tab returns the user to their original page, unchanged.
- No back link is rendered, since the new tab has no prior history entry.

**Not changed:** header navigation, service navigation, and the phase banner are untouched. No redirects are added.

## 12. Accessibility

Target: **WCAG 2.2 AA** (legal requirement).

**Structure and semantics**

- Exactly one `<h1>` per page, matching `pageTitle`, so the document title and main heading agree (2.4.2 Page Titled, 2.4.6 Headings and Labels).
- Heading levels descend without skipping: `h1` → `h2` → `h3` (1.3.1 Info and Relationships).
- Bullet lists use real `<ul>`/`<li>` markup, not styled paragraphs.
- Content sits inside the `<main>` landmark provided by the base template; header, footer and skip link come from `govuk/template.njk` unchanged.
- `<html lang>` is set to `en` or `cy` by the base template from the resolved locale (3.1.1 Language of Page). This matters here — a screen reader must switch to a Welsh voice for the Welsh policy text.

**The new-tab footer link**

- `aria-label="Publishing policy (opens in new tab)"` (translated in Welsh) so screen reader users are warned before activating it (3.2.5 Change on Request).
- The `aria-label` begins with the visible link text "Publishing policy", satisfying 2.5.3 Label in Name.
- `rel="noopener noreferrer"` for security, not accessibility, but required.

**Keyboard and pointer**

- The footer link is a native `<a>` — keyboard focusable, activated by Enter, in DOM order after Government Digital Service (2.4.3 Focus Order).
- GOV.UK Frontend focus styles are inherited; no custom focus CSS (2.4.7 Focus Visible, 2.4.11 Focus Not Obscured).
- The GOV.UK footer's inline list item spacing is a known 2.5.8 Target Size shortfall shared by all existing footer links; `page-structure.spec.ts` already disables the `target-size` and `link-name` axe rules for this reason. Do not add new axe rule exclusions for the new link.

**Visual**

- No colour-only meaning; no images; no custom colours. Contrast is inherited from GOV.UK Frontend (1.4.3).
- Content must reflow to 320 CSS pixels without horizontal scrolling and remain readable at 400% zoom (1.4.10 Reflow) — the standard two-thirds grid column handles this. Verify any wide content in the source document (particularly tables, if the `.docx` contains any) still reflows.
- No time limits, no motion, no autoplay.

**Progressive enhancement**

- The page is fully functional with JavaScript disabled. The only script involvement is the base template's back-link handler, which the page does not use.
- The "Back to top" link is a plain in-page `href="#"` anchor.

**If the source document contains a table**

Render it with `govukTable`, supply a `caption`, and mark header cells with `scope`. Do not use a table for layout.

## 13. Test Scenarios

**Controller unit tests** — `apps/web/src/pages/(core)/publishing-policy/index.test.ts`

* `GET` renders the `publishing-policy/index` template with `en`, `cy` and `pageTitle` in the view model
* `GET` sets `pageTitle` to the English title when `res.locals.locale` is `"en"`
* `GET` sets `pageTitle` to the Welsh title when `res.locals.locale` is `"cy"`
* `GET` falls back to English when `res.locals.locale` is undefined
* `GET` calls `res.render` exactly once and never calls `res.redirect`

**Template render tests** — `apps/web/src/pages/(core)/publishing-policy/index.njk.test.ts`

* The template file exists at the expected path
* Renders a single `<h1>` containing the English page title
* Renders every section heading from the English content object at the correct heading level
* Renders every paragraph and every bullet item from the English content object
* Renders Welsh headings, paragraphs and bullets when the `cy` content object is supplied
* Renders the "Back to top" link
* Does not render a back link
* English and Welsh content objects have identical key structures, recursively through `sections`
* No Welsh string value contains an unprocessed `TRANSLATE` marker
* Any external link in the body has `target="_blank"` and `rel="noopener noreferrer"`

**Footer component / locale tests** — `libs/web-core/src/locales/{en,cy}.test.ts`

* `en.footer.publishingPolicy` is `"Publishing policy"`
* `cy.footer.publishingPolicy` is the Welsh translation and is not identical to the English string
* `en.footer.publishingPolicyAriaLabel` contains "opens in new tab"
* Both locale files expose the same `footer` keys

**E2E tests** — extend the existing footer assertions in `e2e-tests/tests/page-structure.spec.ts`; do not add a new spec file

* The footer meta list contains nine items (update the existing `toHaveCount(8)` assertion)
* The `/publishing-policy` footer link is visible, has `target="_blank"`, `rel="noopener noreferrer"`, and an `aria-label` mentioning a new tab
* The publishing policy link is positioned immediately after the Government Digital Service link in DOM order
* Activating the link opens a new tab whose `<h1>` is the publishing policy title, and the original page remains open
* The publishing policy page passes an inline axe-core scan against `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, `wcag22aa`, with only the pre-existing `link-name` and `target-size` footer exclusions
* Switching to Welsh on the publishing policy page renders the Welsh heading, and the footer link text is Welsh on the Welsh page
* The publishing policy page is reachable directly by URL without signing in

Per the repo E2E guidance, these fold into the existing page-structure journey test rather than becoming separate per-assertion tests.

## 14. Assumptions & Open Questions

**Blocking — must be resolved before the content is final**

* **The three `.docx` attachments could not be read while producing this specification** (network fetch unavailable in this environment). The page's body copy, its section headings, and the exact number of sections must be transcribed from `Publishing Policy - Third Party Data Licence.docx` (English) and `CY Publishing Policy - Third Party Data Licence.docx` (Welsh) during implementation. Everything else in this spec — routing, files, footer placement, accessibility, tests — is complete and unaffected.
* Does the source document contain tables, images, or a numbered clause structure? If so, section 12's table guidance applies and the locale object shape in section 7.2 needs a corresponding nested structure. Diagrams would need text alternatives supplied by the policy owner.
* Does the mock-up show the footer link labelled "Publishing policy" or the full "Publishing Policy – Third Party Data Licence"? This spec assumes the short form for the footer and confirms the `<h1>` against the mock-up.

**Assumptions**

* "Pop-up page" means a new browser tab via `target="_blank"`, not a JavaScript modal or `window.open` popup. This is what "similar to the accessibility page" implies, and it is the only option that degrades gracefully without JavaScript.
* The link is the last footer meta item. "Immediately after the 'Government Digital Service' link" places it ninth, since Government Digital Service is currently last.
* The page is public — no authentication, matching the accessibility statement and cookie policy.
* Content belongs in `libs/web-core/src/locales/publishing-policy/` because it is service-wide legal content reachable from a global footer, which is the documented exception to the co-location default.
* `/publishing-policy` is the URL. Confirm with the content designer if they prefer `/publishing-policy-third-party-data-licence`; the shorter form is easier to say and share, and consistent with `/cookie-policy`.
* The Welsh `.docx` is a complete translation of the English one. If it is partial, missing strings get `[WELSH TRANSLATION REQUIRED: "..."]` markers and the gap is raised with the content owner rather than machine-translated into a legal document.
* No analytics event is needed on the link. Add one only if a measurement requirement is raised separately.

**Open questions for the product owner**

* Should the publishing policy also be linked from anywhere other than the footer — for example the search results or hearing list pages, where data re-use is most likely?
* Does the policy need a "last updated" date on the page? Legal and licence documents usually do, and the accessibility statement carries a preparation date. The source document may contain one.
* Is there a review cycle or expiry for this policy that should be recorded somewhere in the repo?


### Comment by OgechiOkelu on 2026-07-28T13:56:00Z

@plan 
