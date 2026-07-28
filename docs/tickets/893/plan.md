# Plan: #893 — Add publishing policy link to CaTH footer

Content source: `docs/tickets/893/source-content.md` (full English and Welsh text extracted from the
three `.docx` attachments, plus every hyperlink target). That file is authoritative — the body copy
is a licence document and must not be paraphrased, summarised or reordered.

## 1. Technical Approach

A ninth footer meta link plus one new static content page. No backend work.

### 1.1 Strategy

1. Add two locale keys to the shared `footer` object (`libs/web-core/src/locales/{en,cy}.ts`) and a
   ninth `meta.items` entry in `libs/web-core/src/views/components/site-footer.njk`. This gives every
   page in the service the link for free — the footer is included by
   `layouts/base-template.njk` via `{% block govukFooter %}`.
2. Add the page content as a new shared locale pair,
   `libs/web-core/src/locales/publishing-policy/{en,cy}.ts`, exported from
   `libs/web-core/src/index.ts` as `publishingPolicyEn` / `publishingPolicyCy`.
3. Add the page at `apps/web/src/pages/(core)/publishing-policy/{index.ts,index.njk}`. It is
   auto-discovered — see 1.2.

### 1.2 Architecture decisions

**Content in `libs/web-core`, not co-located with the controller.** `CLAUDE.md` defaults to
co-locating `en.ts`/`cy.ts` with the controller and reserves the lib-export route for content that is
service-wide. This is exactly that case: it is legal/licence content reachable from the global footer
on every page, and it sits alongside the two existing precedents,
`libs/web-core/src/locales/accessibility-statement/` and `libs/web-core/src/locales/cookie-policy/`.
Following the same shape keeps the three footer content pages consistent.

**`target="_blank"` satisfies the "pop-up page" acceptance criterion.** The issue asks for a "pop-up
page … built into CaTH similar to the accessibility page". The accessibility statement and cookie
policy footer links both use `target="_blank" rel="noopener noreferrer"` — a new browser tab, not a
JavaScript modal and not `window.open`. A modal would break without JavaScript and would not be
directly linkable; `window.open` is blocked by popup blockers. A new tab is also the only option that
preserves unsaved form state on the originating page, which matters because the footer is reachable
mid-journey. GDS discourages new tabs generally, and the mitigation it asks for — announcing the
behaviour to assistive technology — is provided by a translated `aria-label` (see section 5).

**No manual route registration.** `apps/web/src/app.ts:211` mounts
`createSimpleRouter({ path: \`${__dirname}/pages\` })`. The `(core)` route group contributes no URL
segment, so `apps/web/src/pages/(core)/publishing-policy/` resolves to `GET /publishing-policy`.
Public, no auth, consistent with `/accessibility-statement` and `/cookie-policy`.

**The `renderInterceptorMiddleware` contract.** `renderInterceptorMiddleware` in
`libs/web-core/src/middleware/i18n/locale-middleware.ts:92` inspects the view model: if it contains
**both** `en` and `cy` keys, it picks the object matching `res.locals.locale` and **spreads that
object onto the top level** of the view model (`{...res.locals, ...selectedContent, ...otherContent}`).
That is why `accessibility-statement/index.njk` can reference bare `sections.*` and `backToTop`
without the controller passing them.

The new page must follow the same contract:

- Controller passes exactly `{ en, cy, pageTitle: t.title }`.
- Template reads bare `title`, `sections.*` and `backToTop` — never `t.*`, never `en.*`/`cy.*`.
- `pageTitle` is passed as a sibling (in `otherContent`) so it survives the spread and is consumed by
  `libs/web-core/src/views/components/page-title.njk` to build
  `Publishing policy - Court and tribunal hearings - GOV.UK`.

**Block choice.** The accessibility statement uses `{% block page_content %}` (which the base
template already wraps in the grid row); the cookie policy uses `{% block content %}` with its own
grid row. Match the accessibility statement: `page_content`. It is the reference implementation the
issue names, and the two-thirds measure keeps line length readable.

### 1.3 Key technical considerations

- The heading structure is fixed by the source document: `h1` (page title) → `h2` (the 10 numbered
  sections) → `h3` (the `x.y` sub-sections in 3, 4, 5 and 6). No `h4` is needed.
- Section 2 contains two roman-numeral lists (I–IV, I–III). In the `.docx` these are single paragraphs
  broken by `<w:br/>`, not real lists. They must be emitted as real `<ol>` markup — see section 3.
- The document contains no tables and no images, so `govukTable` is not needed and no alt text is
  required.
- Two paragraphs carry inline links mid-sentence (section 1, section 5.2) and one carries a `mailto:`
  (section 10). These use the accessibility statement's split-string convention
  (`xPrefix` / `xLinkText` / `xUrl` / `xSuffix`) rather than HTML in locale strings, so autoescape
  stays on.

### 1.4 Out of scope

No database schema, Prisma model or migration. No API route and no change to `apps/api`. No new npm
dependency. No change to `apps/web/vite.config.ts` (the page ships no new bundle entry). No
authentication. No `.docx` or PDF download of the policy — publishing the source file would reintroduce
the exact flat-file accessibility failure the accessibility statement already lists as a known issue.

## 2. Implementation Details

### 2.1 Files to create

| File | Purpose |
|---|---|
| `libs/web-core/src/locales/publishing-policy/en.ts` | English page content, `export const en` |
| `libs/web-core/src/locales/publishing-policy/cy.ts` | Welsh page content, `export const cy`, identical key structure |
| `apps/web/src/pages/(core)/publishing-policy/index.ts` | `GET` controller |
| `apps/web/src/pages/(core)/publishing-policy/index.njk` | Nunjucks template |
| `apps/web/src/pages/(core)/publishing-policy/index.test.ts` | Controller unit tests |
| `apps/web/src/pages/(core)/publishing-policy/index.njk.test.ts` | Template render + locale parity tests |
| `apps/web/src/assets/css/publishing-policy.scss` | Single rule for the upper-roman list (see 2.6) |

### 2.2 Files to modify

| File | Change |
|---|---|
| `libs/web-core/src/index.ts` | Add `publishingPolicyCy` / `publishingPolicyEn` exports, preserving the existing alphabetical ordering Biome enforces (they sort after `cookiePreferences*` and before `export { cy }`) |
| `libs/web-core/src/locales/en.ts` | Add `publishingPolicy` and `publishingPolicyAriaLabel` to `footer`, immediately after `governmentDigitalService` |
| `libs/web-core/src/locales/cy.ts` | Same two keys, same position, Welsh values |
| `libs/web-core/src/views/components/site-footer.njk` | Add a ninth `meta.items` entry after the Government Digital Service entry (currently lines 44–47) |
| `libs/web-core/src/locales/en.test.ts` | Assert the two new `footer` keys in the existing "should have footer object with required properties" test |
| `libs/web-core/src/locales/cy.test.ts` | Assert the Welsh equivalents in the existing footer test |
| `apps/web/src/assets/css/web.scss` | `@use "./publishing-policy.scss";` |
| `e2e-tests/tests/page-structure.spec.ts` | `toHaveCount(8)` → `toHaveCount(9)` at line 46; add the new link assertions and the new-tab open to the existing journey test; add the Welsh footer text assertion near line 139 |

### 2.3 Footer entry

Append to `meta.items` in `libs/web-core/src/views/components/site-footer.njk`, after the Government
Digital Service entry:

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

`footer.*` resolves because `translationMiddleware` spreads the active locale's translations onto
`res.locals`.

Note the `/cookie-policy` entry two items above hardcodes an English `aria-label`
(`"Cookie policy (opens in new tab)"`), so Welsh users hear English. That is a pre-existing defect.
**Do not copy it** — use the locale key. Fixing the cookie policy entry is out of scope for this
ticket but worth raising separately.

Locale keys:

| Key | English | Welsh |
|---|---|---|
| `footer.publishingPolicy` | `Publishing policy` | `[WELSH TRANSLATION REQUIRED: "Publishing policy"]` — the Welsh document's own title is `Polisi Cyhoeddi`; use that if the content owner confirms it |
| `footer.publishingPolicyAriaLabel` | `Publishing policy (opens in new tab)` | `[WELSH TRANSLATION REQUIRED: "Publishing policy (opens in new tab)"]` |

The `aria-label` must begin with the visible link text (2.5.3 Label in Name).

### 2.4 Controller

`apps/web/src/pages/(core)/publishing-policy/index.ts` — a direct copy of
`accessibility-statement/index.ts`:

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

No `POST` — the page is read-only. Both `en` and `cy` are passed so the render interceptor can select
and spread; `t` is used only to derive `pageTitle`.

### 2.5 Template

`apps/web/src/pages/(core)/publishing-policy/index.njk`:

```njk
{% extends "layouts/base-template.njk" %}

{% block head %}
  {{ super() }}
  <link rel="alternate" hreflang="en" href="/publishing-policy">
  <link rel="alternate" hreflang="cy" href="/publishing-policy?lng=cy">
{% endblock %}

{% block backLink %}{% endblock %}

{% block page_content %}
  <h1 class="govuk-heading-l">{{ title }}</h1>
  ...
{% endblock %}
```

- `{% block backLink %}{% endblock %}` suppresses the back link, as
  `apps/web/src/pages/(core)/cookie-policy/index.njk:14` does. The page opens in a new tab with no
  prior history entry, so `history.back()` has nowhere to go.
- `hreflang` alternates mirror the cookie policy page, which is worth keeping for an indexable
  standalone legal page.
- `{{ title }}` (bare, not `t.title`) because of the spread described in 1.2.
- Classes: `govuk-heading-l` for `h1`, `govuk-heading-m` for `h2`, `govuk-heading-s` for `h3`,
  `govuk-body` for paragraphs, `govuk-list govuk-list--bullet` for bullets,
  `govuk-list app-list--roman` for the two roman-numeral lists in section 2.
- Paragraph arrays are iterated (`{% for paragraph in sections.x.content %}`) so copy changes never
  need a template change.
- Postal address renders as one `<p>` with literal `<br>` between iterated lines — the `<br>` is
  template markup, not data, so autoescape stays intact.
- Ends with the same "Back to top" markup as the accessibility statement (inline SVG plus
  `{{ backToTop }}` inside `<p class="govuk-body back-to-top-link">`), which reuses the existing
  `apps/web/src/assets/css/back-to-top.scss` and `back-to-top.ts` progressive enhancement.
- No new components, no page-specific JavaScript.

### 2.6 Roman-numeral lists

Section 2's two lists are numbered I–IV and I–III in the source. Stripping the numerals and using
`govuk-list--number` would renumber them 1–4, changing a legal document's clause references.
Keeping the literal `"I. "` inside each string would produce a list whose markers are content, which
screen readers double-announce.

Use a real ordered list with a list-style override:

```njk
<ol class="govuk-list app-list--roman">
  {% for item in sections.background.functions %}
    <li>{{ item }}</li>
  {% endfor %}
</ol>
```

`apps/web/src/assets/css/publishing-policy.scss`:

```scss
.app-list--roman {
  list-style-type: upper-roman;
  padding-left: govuk-spacing(4);
}
```

Registered with `@use "./publishing-policy.scss";` in `apps/web/src/assets/css/web.scss`. The list
items in the locale files carry no numerals.

### 2.7 Locale object shape

Ten section keys, in document order: `scopeAndAim`, `background`, `definitions`,
`publicationPrinciples`, `licensing`, `enhancedInformation`, `onwardSharing`, `governance`,
`compliance`, `reportingAndReview`.

Conventions:

- The section number lives inside the `heading` string (`"1. Scope and aim"`,
  `"3.1 Listings information"`). The document cross-references these numbers, so they are content,
  not presentation — this avoids template numbering logic and keeps Welsh numbering identical.
- `content` is always an array of paragraphs, one entry per paragraph, even when there is one.
- `items` is an array of bullet strings. Where a section has paragraphs both before and after a list,
  use `content` then `items` then `contentAfterItems`.
- Sub-sections are nested objects with their own `heading` / `content` / `items`.
- Inline links follow the accessibility statement's convention:
  `<name>Prefix`, `<name>LinkText`, `<name>Url`, `<name>Suffix`. `LinkText` includes the visible
  "(opens in a new window)" suffix, matching `abilityNetLink` / `eassLinkText` / `wcagLinkText`.

Concrete shape for sections 1, 2, 5 and 10 (English; strings truncated with `…` here only — the real
files carry the full verbatim text from `source-content.md`):

```typescript
export const en = {
  title: "Publishing policy",
  backToTop: "Back to top",
  sections: {
    scopeAndAim: {
      heading: "1. Scope and aim",
      aimPrefix:
        "This policy explains how information published by HM Courts & Tribunals Service's (HMCTS) Courts and Tribunal Hearings Service (CaTH) may be reused, under two separate licences where information is published as part of HMCTS's public task, with information subject to ",
      rpsiLinkText: "The Re-use of Public Sector Information Regulations 2015 (opens in a new window)",
      rpsiUrl: "https://www.legislation.gov.uk/uksi/2015/1415/contents",
      aimSuffix:
        ", for either computational or non-computational analysis. It also sets out what HMCTS expects from re-users when publishing information derived from information published by CaTH.",
      content: [
        "This policy applies to anyone who reuses HMCTS information published by CaTH, including individuals, researchers and organisations. HMCTS applies different licensing and governance arrangements depending on whether the intended reuse of information intends to perform computational analysis, as explained in this policy."
      ]
    },

    background: {
      heading: "2. Background",
      functionsIntro:
        "HMCTS is an Executive Agency of the Ministry of Justice (MoJ) and collects and processes data for the performance of its public functions. These include:",
      functions: [
        "the administration of justice;",
        "criminal and civil enforcement of fines;",
        "research for the development of justice policies and statistics; and",
        "improvements to the services HMCTS provides."
      ],
      accessIntro:
        "HMCTS is committed to providing access to information to a range of users for a variety of purposes. Providing access to HMCTS information is important because it:",
      accessReasons: [
        "supports transparency and enables innovation and improved services;",
        "supports open justice as a fundamental principle of the justice system; and",
        "aligns with HMCTS' Data Strategy and the Government's National Data Strategy."
      ],
      balance:
        "Access to information must, however, be balanced against legal, ethical and operational considerations, including fairness, privacy, safety, and the proper administration of justice."
    },

    licensing: {
      heading: "5. RPSI 2015 and licensing approach",
      openJusticeLicence: {
        heading:
          "5.1 Re-use that does not perform computational analysis of information – the Open Justice Licence V2.0",
        content: [
          "Information published by CaTH that is re-used without performing computational analysis of the information is governed through the Open Justice Licence V2.0.",
          "This includes re-use for purposes such as:"
        ],
        items: [
          "Public Data, free access to hearing lists and upcoming court and tribunal sessions;",
          "Verified Access. Classified/Private data for the accredited news media, legal professionals and professional court users."
        ],
        contentAfterItems: [
          "Where reuse falls within this category, it is subject to the Re-use of Public Sector Information Regulations 2015 (RPSI 2015), unless otherwise exempt and governed by the Open Justice Licence V2.0, which is RPSI compliant."
        ]
      },
      thirdPartyLicence: {
        heading:
          "5.2 Re-use where computational analysis of information is performed with publicly available data or with restricted, enhanced data – the Third-Party Courts and Tribunals Data Licence",
        content: [
          "Where one wishes to perform computational analysis of data published by CaTH, including, but not limited to:"
        ],
        items: [
          "automated processing or analysis;",
          "aggregation or large-scale extraction; or",
          "use to train or support algorithmic or data-driven systems,"
        ],
        contentAfterItems: ["It is necessary to receive a Third-Party Courts and Tribunals Data Licence."],
        applyPrefix:
          "Permission for a licence to undertake computational analysis is by application only. More information on how to apply can be found here: ",
        applyLinkText: "Apply for an HMCTS Third-Party Courts and Tribunals Data Licence (opens in a new window)",
        applyUrl: "https://www.gov.uk/guidance/apply-for-an-hmcts-third-party-courts-and-tribunals-data-licence",
        applySuffix: "."
      }
    },

    reportingAndReview: {
      heading: "10. Reporting and review",
      content: [
        "This policy will be reviewed and updated as required.",
        "The work of the relevant governance panels will be reported annually to the Senior Information Risk Officer."
      ],
      contactPrefix:
        "For further information, advice or assistance, contact the Data Access & Governance Team online (recommended) at ",
      contactEmail: "thirdpartydatalicence@justice.gov.uk",
      contactEmailUrl: "mailto:thirdpartydatalicence@justice.gov.uk",
      contactSuffix: ".",
      postalIntro: "If you cannot contact us online, you can write to us at:",
      postalAddress: [
        "Data Access & Governance Team – Third Party Data Licence",
        "HM Courts & Tribunals Service",
        "Post point 6.32-34",
        "102 Petty France",
        "London",
        "SW1H 9AJ"
      ]
    }
  }
};
```

Sections 3, 4, 6, 7, 8 and 9 follow the same rules: 3 has `listingsInformation` / `enhancedInformation`
sub-objects; 4 has `transparency` / `attribution` / `disclaimer` / `accuracy`; 6 has `access` /
`permittedUses` / `restrictions` and two inline protocol links in `access`; 7, 8 and 9 are `heading`
plus `content` only.

The remaining hyperlinks from `source-content.md` map to:

| Section | Key pair | URL |
|---|---|---|
| 4.1 | `getAccessLinkText` / `getAccessUrl` | `https://www.gov.uk/guidance/access-hmcts-data-for-research` |
| 6.1 | `mediaProtocolLinkText` / `mediaProtocolUrl` | `https://www.gov.uk/government/publications/guidance-to-staff-on-supporting-media-access-to-courts-and-tribunals/protocol-on-sharing-court-lists-registers-and-documents-with-the-media-accessible-version` |
| 6.1 | `courtUsersProtocolLinkText` / `courtUsersProtocolUrl` | `https://www.gov.uk/government/publications/protocol-for-sharing-court-lists-in-criminal-proceedings-with-professional-court-users/protocol-for-sharing-court-lists-in-criminal-proceedings-with-professional-court-users` |

### 2.8 Welsh content rules

- `cy.ts` must have **exactly** the same key structure as `en.ts`, including array lengths, enforced
  by test (section 6).
- Welsh copy is taken **verbatim** from `CY.Publishing.Policy.-.Third.Party.Data.Licence.docx` as
  reproduced in `source-content.md`. Never machine-translate. This is a licence document; a generated
  translation is not legally equivalent copy.
- Where the Welsh document has no counterpart for an English string, ship
  `[WELSH TRANSLATION REQUIRED: "<the English string>"]` and raise the gap with the content owner.
  Currently that is exactly one place: `sections.licensing.thirdPartyLicence.applyLinkText`, because
  Welsh 5.2 ends `"Mae mwy o wybodaeth ar sut i wneud cais ar gael yma:"` with no link and no link
  text. `applyUrl` keeps the English GOV.UK URL (that guidance page has no Welsh version).
- `cy.title` = `"Polisi Cyhoeddi"` (the Welsh document's own title), `cy.backToTop` =
  `"Yn ôl i frig y dudalen"` — reuse the exact string already used by the accessibility statement.
- The four EN/CY content divergences listed in section 7 must be resolved by the content owner
  **before** the locale files are finalised. Do not silently reconcile them in code.

## 3. Error Handling & Edge Cases

**No user input.** No form, no request body, no route parameter, no query parameter that affects
rendering other than `lng`. Input validation is not applicable and no error summary is rendered —
`{% block error_summary %}` stays as inherited.

**Locale fallback chain.** `localeMiddleware` resolves `lng` query parameter → session → `locale`
cookie → `en`. Any `lng` value outside `["en", "cy"]` falls through to the next step. The controller
adds a belt-and-braces `res.locals.locale || "en"`. Unknown query parameters are ignored.

**Failure modes** fall to existing global handling in
`libs/web-core/src/middleware/govuk-frontend/error-handler.js`:

| Condition | Result |
|---|---|
| Mistyped URL, e.g. `/publishing-policy-x` | Existing 404 (`views/errors/404.njk`) via `notFoundHandler()` |
| Template or render failure | Existing 500 (`views/errors/500.njk`) |

No new copy needed for either.

**Content-integrity constraints** — these are the real risks on a page like this, and they are caught
by tests, not at runtime:

| Constraint | Enforced by |
|---|---|
| `en.ts` and `cy.ts` have identical keys at every nesting level | Recursive key-parity test in `index.njk.test.ts` |
| Parallel arrays are the same length in both locales | Length assertions on each `items` / `content` array |
| No unintended `[WELSH TRANSLATION REQUIRED: …]` marker ships | Test asserting the set of Welsh keys containing the marker equals an explicit allow-list of exactly `sections.licensing.thirdPartyLicence.applyLinkText`. A plain "contains no marker" assertion would block the known, documented gap; an allow-list stops new gaps creeping in |
| Footer stays at nine links | `toHaveCount(9)` in `e2e-tests/tests/page-structure.spec.ts` |
| Every hyperlink target from the source document is present | `a[href="…"]` assertions in `index.njk.test.ts` |

**Source-document artefacts to fix, not reproduce:**

- Section 2's roman-numeral "lists" are `<w:br/>`-separated paragraphs in the `.docx`. Rendering them
  as paragraphs would fail 1.3.1 Info and Relationships — they are semantically lists. Emit `<ol>`
  (see 2.6).
- English section 5.1 ends with an orphan paragraph consisting of a single comma (`,`). Drop it.
- The Welsh document has several empty bullet artefacts (after 3, after 3.1, after 5). Drop them.
- English section 1's second paragraph is prose; the Welsh equivalent is bulleted. Same for
  English 5.2's "Permission for a licence…" (bulleted in EN, prose in CY), and 3.2's "Enhanced
  information may increase the risk…" (a single orphan bullet in both). Render single orphan bullets
  as paragraphs and keep list markup only where there are two or more items, applying the same
  treatment in both locales so the two pages stay structurally identical. Flagged as non-blocking in
  section 7.

**Reflow.** The content sits in the standard two-thirds column, so 320 CSS pixel width and 400% zoom
reflow without horizontal scrolling. The only long unbroken strings are the two GOV.UK protocol URLs,
which are never rendered as visible text — the visible link text is the protocol title. Verify at
320px anyway (section 6).

## 4. Acceptance Criteria Mapping

| # | Acceptance criterion | How it is satisfied | Verified by |
|---|---|---|---|
| 1 | "The publishing policy link is added to all CaTH pages footer, immediately after the 'Government Digital Service' link." | Ninth `meta.items` entry in `libs/web-core/src/views/components/site-footer.njk`, which is included by `layouts/base-template.njk` on every page (including the 404 and 500 error pages) | `e2e-tests/tests/page-structure.spec.ts`: `toHaveCount(9)`, plus `footerMetaLinks.nth(8)` contains the link text and `nth(7)` is Government Digital Service. The existing "404 error page displays service navigation and footer" test in the same file confirms it also appears on error pages |
| 2 | "When a CaTH user clicks on the publishing policy link, a pop-up page is opened and displays the information in the attached document" | `target="_blank" rel="noopener noreferrer"` on the footer link; `GET /publishing-policy` renders the full policy content from the locale files | E2E: `context.waitForEvent("page")` on link click, asserting the new tab's URL and `h1`, and that the original page is still open. Template tests assert every heading, paragraph, bullet and link href from the English content object renders |
| 3 | "The pop-up page should be built into CaTH similar to the accessibility page" | Same file layout (`apps/web/src/pages/(core)/<page>/{index.ts,index.njk}`), same content location (`libs/web-core/src/locales/<page>/{en,cy}.ts`), same `{ en, cy, pageTitle }` render contract, same `page_content` block, same back-to-top markup, back link suppressed as on the cookie policy | Controller unit tests mirror `accessibility-statement/index.test.ts`; template tests mirror `accessibility-statement/index.njk.test.ts` (same `createTestEnvironment` paths, same `TEMPLATE = "(core)/<page>/index.njk"` form) |
| 4 | "Welsh translations for the information is attached" | `cy.ts` populated verbatim from the Welsh `.docx`; footer link text and `aria-label` translated; `<html lang="cy">` set by the base template from the resolved locale | Template test rendering the `cy` object asserts Welsh `h1`, headings, bullets and back-to-top; locale tests assert key parity and that the Welsh footer string differs from the English; E2E asserts the Welsh footer link text and runs axe in Welsh |

## 5. Accessibility

Target: **WCAG 2.2 AA** (legal requirement).

**Structure and semantics**

- Exactly one `<h1>`, matching `pageTitle`, so `<title>` and the main heading agree (2.4.2 Page
  Titled, 2.4.6 Headings and Labels).
- Heading levels descend without skipping: `h1` → `h2` (the ten numbered sections) → `h3` (the `x.y`
  sub-sections). No level is used for visual weight alone (1.3.1).
- All lists use real `<ul>` / `<ol>` markup, never styled paragraphs — including the two roman-numeral
  lists in section 2 (1.3.1). List markers come from CSS, not from text inside `<li>`, so screen
  readers do not double-announce them.
- Content sits inside the `<main>` landmark from `govuk/template.njk`; skip link, header and footer are
  inherited unchanged.
- `<html lang>` is set to `en` or `cy` by the base template from the resolved locale (3.1.1 Language of
  Page). This matters here: a screen reader must switch to a Welsh voice for the Welsh policy, and the
  document is long enough that a wrong-language voice makes it unusable.
- The postal address renders as a paragraph with `<br>` line breaks, not as a list or a table.

**Footer link**

- Translated `aria-label` "Publishing policy (opens in new tab)" / Welsh equivalent, so the new-tab
  behaviour is announced before activation (3.2.5 Change on Request). Using a locale key rather than
  the hardcoded English string the cookie policy entry uses is the point of this change.
- The `aria-label` begins with the visible link text, satisfying 2.5.3 Label in Name.
- Native `<a>`: keyboard focusable, activated with Enter, in DOM and focus order immediately after
  Government Digital Service and last in the meta list (2.4.3 Focus Order).
- GOV.UK Frontend focus styles inherited; no custom focus CSS (2.4.7, 2.4.11).
- `rel="noopener noreferrer"` — security, not accessibility, but required.
- **Do not add new axe rule exclusions.** `page-structure.spec.ts` already disables `link-name` and
  `target-size` for known GOV.UK footer shortcomings, and `e2e-tests/utils/axe-helper.ts` disables
  `target-size` globally. If the new link trips `link-name`, fix the link, not the test.

**Body links**

- Every external link gets `class="govuk-link" target="_blank" rel="noopener noreferrer"` with a
  visible "(opens in a new window)" suffix in the link text, matching the AbilityNet and EASS links in
  the accessibility statement. The warning is in the visible text, so it is available to sighted and
  screen reader users alike, and no `aria-label` is needed (avoiding a 2.5.3 mismatch).
- The `mailto:` link opens in the same context and gets no `target` and no "(opens in a new window)"
  text. Its visible text is the email address itself, so the visible address and the `mailto:` target
  must be the same string — see the blocking clarification in section 7.

**Visual**

- No colour-only meaning, no images, no custom colours; contrast inherited from GOV.UK Frontend
  (1.4.3). The Word document's red-text amendments carry meaning only for reviewers and must not be
  reproduced as coloured text.
- Reflows to 320 CSS pixels with no horizontal scrolling and stays readable at 400% zoom (1.4.10) —
  the two-thirds column handles this; verify manually.
- No time limits, no motion, no autoplay.

**Progressive enhancement**

- Fully functional with JavaScript disabled: static content, native links, no scripts of its own. The
  base template's back-link handler is irrelevant because the back link is suppressed.
- "Back to top" is a plain `href="#"` anchor; the existing `back-to-top.ts` enhancement is optional.

## 6. Test Plan

**Controller unit tests** — `apps/web/src/pages/(core)/publishing-policy/index.test.ts`, following
`accessibility-statement/index.test.ts`:

- renders the `publishing-policy/index` template with `en`, `cy` and `pageTitle` in the view model
- sets `pageTitle` to the English title when `res.locals.locale` is `"en"`
- sets `pageTitle` to the Welsh title when `res.locals.locale` is `"cy"`
- falls back to the English title when `res.locals.locale` is undefined
- calls `res.render` exactly once and never calls `res.redirect`

**Template render tests** — `apps/web/src/pages/(core)/publishing-policy/index.njk.test.ts`. Use
`createTestEnvironment` / `render` from `@hmcts/test-support` with
`TEMPLATE = "(core)/publishing-policy/index.njk"` and env paths
`[path.join(__dirname, "../../"), path.join(__dirname, "../../../../../../libs/web-core/src/views")]`.
Data is the spread form the render interceptor produces: `{ ...en, en, cy, locale: "en" }`. Assert on
structure with Cheerio, not raw HTML strings; use `toHaveLength`:

- the template file exists
- exactly one `<h1>`, containing the English title
- all ten numbered section headings render as `h2`, in document order
- all `x.y` sub-section headings render as `h3`
- no `h4` is emitted and no heading level is skipped
- every paragraph in every `content` / `contentAfterItems` array appears in the body text
- every `items` entry renders as an `li` inside a `ul.govuk-list--bullet`
- section 2's two lists render as `ol.app-list--roman` with 4 and 3 `li` respectively, and no `li`
  text begins with a roman numeral
- each source hyperlink renders as `a[href="…"]` with the expected link text, `target="_blank"` and
  `rel="noopener noreferrer"`
- the `mailto:` link's `href` is `mailto:` + its own visible text
- the postal address renders all six lines in one paragraph
- the back-to-top link renders with `en.backToTop`
- no `a.govuk-back-link` is rendered
- rendering with `{ ...cy, en, cy, locale: "cy" }` produces the Welsh `h1`, Welsh section headings,
  Welsh bullets and `cy.backToTop`

**Locale tests** — in the same `index.njk.test.ts` "Locale consistency" describe block:

- recursive key parity between `en` and `cy` at every nesting level
- every parallel array has the same length in both locales
- the only Welsh value containing `WELSH TRANSLATION REQUIRED` is
  `sections.licensing.thirdPartyLicence.applyLinkText` (explicit allow-list)
- section heading strings in both locales start with the same section number

**Footer locale tests** — extend the existing tests in `libs/web-core/src/locales/en.test.ts` and
`cy.test.ts`:

- `en.footer.publishingPolicy` is `"Publishing policy"`
- `en.footer.publishingPolicyAriaLabel` contains `"opens in new tab"` and starts with
  `en.footer.publishingPolicy`
- `cy.footer.publishingPolicy` is defined and not identical to the English string
- `cy.footer.publishingPolicyAriaLabel` starts with `cy.footer.publishingPolicy`

**E2E** — fold into `e2e-tests/tests/page-structure.spec.ts`. Per `.claude/rules/testing.md` and
`CLAUDE.md`, minimise test count: **do not add a new spec file**. Extend the existing
"page structure displays correctly…" journey test and the existing Welsh journey test:

- change `toHaveCount(8)` to `toHaveCount(9)` at line 46
- assert `footerMetaLinks.nth(7)` is Government Digital Service and `nth(8)` is the publishing policy
  link, proving the ordering requirement
- assert the link has `href="/publishing-policy"`, `target="_blank"`,
  `rel="noopener noreferrer"` and an `aria-label` mentioning a new tab
- open it with `const [newPage] = await Promise.all([context.waitForEvent("page"), link.click()])`,
  assert the new tab's URL and `h1`, that `a.govuk-back-link` is not visible, and that the original
  page is still open
- run `axeCheck(newPage)` (the shared helper, no extra rule exclusions) on the new tab
- in the Welsh journey test near line 139, assert the publishing policy footer link text is Welsh and
  that its `href` is still `/publishing-policy`

**Manual checks** before raising the PR:

- 320px viewport and 400% zoom — no horizontal scrolling
- keyboard-only pass through the footer, confirming the new link is last and focus is visible
- `?lng=cy` on `/publishing-policy` and back to `?lng=en` via the phase banner toggle
- JavaScript disabled — page renders and all links work

## 7. CLARIFICATIONS NEEDED

The `.docx` transcription is **resolved** — see `docs/tickets/893/source-content.md`. The following are
the genuine open questions.

### Blocking for content (locale files cannot be finalised until answered)

1. **Contact email mismatch.** English section 10's visible text is
   `thirdpartydatalicence@justice.gov.uk`, but the underlying `mailto:` hyperlink in the same document
   points to `ratioapplications@justice.gov.uk`. The Welsh document shows
   `thirdpartydatalicence@justice.gov.uk` as both visible text and link target. These cannot both be
   right. Which address is correct? The plan currently makes the `mailto:` match the visible
   `thirdpartydatalicence@` address in both locales, because a link whose target differs from its
   visible address is a content defect — but this must be confirmed, not assumed.
2. **Page `<h1>`: "Publication Policy" or "Publishing policy"?** The English document titles itself
   "Publication Policy"; the issue, the footer mock-up and the Welsh document ("Polisi Cyhoeddi") all
   say publishing. Which is the correct name for the page heading and the `<title>`? Recommendation:
   "Publishing policy", matching the issue and the footer link, and treat the document's
   "Publication Policy" as a drafting slip.
3. **Four EN/CY content divergences.** These are substantive, not translation style, and each changes
   what the policy says in Welsh versus English:
   - **6.2 permitted uses:** English lists three (open justice; professional or academic activity;
     other purposes approved by HMCTS). Welsh lists four, adding `budd y cyhoedd` (public interest).
     Is public interest a permitted use or not?
   - **Section 8 delegated authority:** English says authority is "exercised under delegation from the
     Keeper of the Public Record at The National Archives". Welsh names three parties — the Lord
     Chancellor and Secretary of State for Justice, the Keeper of Public Records at The National
     Archives, and HMCTS' Senior Information Risk Officer. Which list is correct?
   - **Section 10 team name:** English "Data Access & Governance Team"; Welsh
     `Tîm Gwasanaethau Mynediad at Ddata` ("Data Access Services Team"). Note the Welsh postal address
     block then uses `Tîm Mynediad at Ddata a Llywodraethu` (Data Access & Governance Team), so the
     Welsh document is internally inconsistent too. Which is the team's actual name?
   - **CY 4.1 extra phrase:** the Welsh closing paragraph of 4.1 adds
     `– Panel Llywodraethu Trwydded Llys a Thribiwnlys i Drydydd Parti`, absent from English. Should
     this be added to the English, or removed from the Welsh?
4. **Missing link in Welsh 5.2.** Welsh 5.2 ends `"Mae mwy o wybodaeth ar sut i wneud cais ar gael
   yma:"` with no link and no link text — the apply-for-a-licence link present in English 5.2 is
   absent. Confirm the Welsh link text (the GOV.UK guidance page itself is English-only, so the URL
   stays the same). Until supplied, a `[WELSH TRANSLATION REQUIRED: …]` marker ships, which means a
   Welsh user reaches a dead sentence.
5. **Are the red-text RPSI amendments approved copy?** The Word comment from Manisha Takhtar states
   "all text coloured in red has been added/amended from the original policy in light of the RPSI
   change". Confirm this is final, signed-off copy and not a draft under review, before it is
   published as the live policy on a public service.

### Non-blocking (implementation can proceed on the stated recommendation)

6. **Footer link case.** The mock-up screenshot shows "Publishing Policy" in title case. Every other
   footer link in this service is sentence case ("Terms and conditions", "Accessibility statement"),
   which is GDS house style. Recommendation: sentence case "Publishing policy". Confirm with the
   content designer.
7. **Welsh footer link text.** The Welsh document's title is "Polisi Cyhoeddi". Confirm this is the
   right footer label, or supply an alternative. Until confirmed, a
   `[WELSH TRANSLATION REQUIRED: …]` marker in `footer.publishingPolicy` would be visible on every
   Welsh page in the service, so this should be settled early even though it does not block the page
   itself.
8. **Is `/publishing-policy` the agreed URL?** It is consistent with `/cookie-policy` and
   `/accessibility-statement`, and short enough to say and share. The alternative
   `/publishing-policy-third-party-data-licence` is more descriptive and worse in every other respect.
9. **Does the page need a "last updated" or review date?** Licence and policy documents normally
   carry one, and the accessibility statement carries a preparation date. The source document has no
   date. Section 10 says the policy "will be reviewed and updated as required" without saying when it
   last was. Recommendation: ask the policy owner for a "Last updated" line and a review cycle.
10. **Orphan single bullets and EN/CY list-versus-paragraph mismatches.** In several places one
    document bullets a paragraph the other does not (EN 1 para 2, CY 1 para 2; EN 5.2 "Permission for
    a licence…"; 3.2 "Enhanced information may increase the risk…"; EN 10 "If you cannot contact us
    online…"). Recommendation: render these as paragraphs in both locales, so the English and Welsh
    pages are structurally identical. Confirm the content designer is content with that.
11. **Should the document's own cover lines be rendered?** The source begins "HMCTS Court and Tribunal
    Hearings Service (CaTH)" above the title. On the page this duplicates the service name already in
    the service navigation. Recommendation: drop it.
12. **Any other placement?** Should the policy also be linked from the search results or hearing list
    pages, where data re-use is most likely? Out of scope for this ticket if so — raise separately.
