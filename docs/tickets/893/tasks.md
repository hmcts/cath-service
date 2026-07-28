# Implementation Tasks — #893

Content source: `docs/tickets/893/source-content.md`. Copy is verbatim; do not paraphrase.
Resolve the blocking clarifications in `plan.md` section 7 before finalising the locale files.

## Content

- [ ] Create `libs/web-core/src/locales/publishing-policy/en.ts` with `title`, `backToTop` and a
      `sections` object containing all ten numbered sections (`scopeAndAim`, `background`,
      `definitions`, `publicationPrinciples`, `licensing`, `enhancedInformation`, `onwardSharing`,
      `governance`, `compliance`, `reportingAndReview`), section numbers inside the `heading` strings
- [ ] Add the `x.y` sub-section objects: `definitions.listingsInformation` / `.enhancedInformation`;
      `publicationPrinciples.transparency` / `.attribution` / `.disclaimer` / `.accuracy`;
      `licensing.openJusticeLicence` / `.thirdPartyLicence`; `enhancedInformation.access` /
      `.permittedUses` / `.restrictions`
- [ ] Add the six link key sets using the `xPrefix` / `xLinkText` / `xUrl` / `xSuffix` convention:
      RPSI 2015 (section 1), Get access to HMCTS data (4.1), apply for a licence (5.2), media protocol
      (6.1), professional court users protocol (6.1), contact email `mailto:` (section 10). Every
      external `LinkText` ends with "(opens in a new window)"
- [ ] Drop the source artefacts: the orphan comma paragraph at the end of English 5.1, the empty
      Welsh bullets after sections 3, 3.1 and 5, and the document's cover line
      "HMCTS Court and Tribunal Hearings Service (CaTH)"
- [ ] Strip the roman numerals from `background.functions` and `background.accessReasons` — the
      markers come from CSS
- [ ] Create `libs/web-core/src/locales/publishing-policy/cy.ts` with the identical key structure,
      copy taken verbatim from the Welsh `.docx`. `cy.title` = "Polisi Cyhoeddi",
      `cy.backToTop` = "Yn ôl i frig y dudalen". Never machine-translate
- [ ] Add `[WELSH TRANSLATION REQUIRED: "…"]` to
      `sections.licensing.thirdPartyLicence.applyLinkText` in `cy.ts` (Welsh 5.2 has no link text)
- [ ] Add `publishingPolicyCy` / `publishingPolicyEn` exports to `libs/web-core/src/index.ts`,
      preserving the existing alphabetical ordering

## Footer

- [ ] Add `publishingPolicy: "Publishing policy"` and
      `publishingPolicyAriaLabel: "Publishing policy (opens in new tab)"` to the `footer` object in
      `libs/web-core/src/locales/en.ts`, immediately after `governmentDigitalService`
- [ ] Add the Welsh equivalents in the same position in `libs/web-core/src/locales/cy.ts`
- [ ] Add the ninth `meta.items` entry to `libs/web-core/src/views/components/site-footer.njk` after
      the Government Digital Service entry, with `href: "/publishing-policy"`,
      `text: footer.publishingPolicy`, `target: "_blank"`, `rel: "noopener noreferrer"` and
      `"aria-label": footer.publishingPolicyAriaLabel` (locale key, not a hardcoded English string)

## Page

- [ ] Create `apps/web/src/pages/(core)/publishing-policy/index.ts` with a single `GET` export
      rendering `publishing-policy/index` with `{ en, cy, pageTitle: t.title }`
- [ ] Create `apps/web/src/pages/(core)/publishing-policy/index.njk` extending
      `layouts/base-template.njk`, overriding `{% block page_content %}`, with
      `{% block backLink %}{% endblock %}` and `hreflang` alternates in `{% block head %}`
- [ ] Render the heading hierarchy: one `h1.govuk-heading-l` from `{{ title }}`, ten
      `h2.govuk-heading-m` section headings, `h3.govuk-heading-s` sub-section headings. No `h4`
- [ ] Iterate `content` / `contentAfterItems` arrays into `p.govuk-body` and `items` arrays into
      `ul.govuk-list.govuk-list--bullet`. Reference bare `sections.*` (the render interceptor spreads
      the selected locale onto the top level) — never `t.*` or `en.*`
- [ ] Render section 2's two lists as `ol.govuk-list.app-list--roman`
- [ ] Render the postal address as one `p.govuk-body` with `<br>` between the six iterated lines
- [ ] Render external links as `a.govuk-link` with `target="_blank" rel="noopener noreferrer"`; render
      the contact `mailto:` with no `target`
- [ ] Add the back-to-top link using the same markup as
      `apps/web/src/pages/(core)/accessibility-statement/index.njk` (inline SVG + `{{ backToTop }}`
      inside `p.govuk-body.back-to-top-link`)
- [ ] Create `apps/web/src/assets/css/publishing-policy.scss` with the `.app-list--roman`
      `list-style-type: upper-roman` rule and register it with
      `@use "./publishing-policy.scss";` in `apps/web/src/assets/css/web.scss`

## Tests

- [ ] Create `apps/web/src/pages/(core)/publishing-policy/index.test.ts`: renders the template with
      `en`, `cy` and `pageTitle`; English title when locale is `"en"`; Welsh title when `"cy"`;
      English fallback when locale is undefined; `res.render` called exactly once
- [ ] Create `apps/web/src/pages/(core)/publishing-policy/index.njk.test.ts` using
      `createTestEnvironment` / `render` from `@hmcts/test-support`, with
      `TEMPLATE = "(core)/publishing-policy/index.njk"` and env paths
      `[path.join(__dirname, "../../"), path.join(__dirname, "../../../../../../libs/web-core/src/views")]`
- [ ] Assert structure with Cheerio: one `h1`; ten `h2` headings in document order; all `h3`
      sub-section headings; no `h4`; every paragraph and bullet present; both roman lists render as
      `ol.app-list--roman` with 4 and 3 `li`; no `li` text starts with a roman numeral
- [ ] Assert each source hyperlink renders as `a[href="…"]` with the expected link text,
      `target="_blank"` and `rel="noopener noreferrer"`; assert the `mailto:` href matches its own
      visible text; assert no `a.govuk-back-link`; assert the back-to-top link
- [ ] Add a Welsh render test (`{ ...cy, en, cy, locale: "cy" }`) asserting the Welsh `h1`, section
      headings, bullets and `cy.backToTop`
- [ ] Add a "Locale consistency" describe block: recursive key parity between `en` and `cy`; equal
      lengths for every parallel array; section headings start with the same numbers; the only Welsh
      value containing `WELSH TRANSLATION REQUIRED` is
      `sections.licensing.thirdPartyLicence.applyLinkText` (explicit allow-list)
- [ ] Extend `libs/web-core/src/locales/en.test.ts`: assert `en.footer.publishingPolicy` and that
      `en.footer.publishingPolicyAriaLabel` contains "opens in new tab" and starts with the link text
- [ ] Extend `libs/web-core/src/locales/cy.test.ts`: assert `cy.footer.publishingPolicy` is defined,
      differs from the English string, and that the `aria-label` starts with the link text
- [ ] In `e2e-tests/tests/page-structure.spec.ts`, change `toHaveCount(8)` to `toHaveCount(9)`
      (line 46) and assert `footerMetaLinks.nth(7)` is Government Digital Service and `nth(8)` is the
      publishing policy link
- [ ] In the same test, assert the link's `href`, `target`, `rel` and `aria-label`, open it via
      `context.waitForEvent("page")`, assert the new tab's URL and `h1`, that no back link is visible,
      that the original page is still open, and run `axeCheck(newPage)` — do not add new axe rule
      exclusions
- [ ] In the existing Welsh journey test (near line 139), assert the publishing policy footer link
      text is Welsh and its `href` is still `/publishing-policy`

## Verify

- [ ] Manually check `/publishing-policy` at 320px width and 400% zoom — no horizontal scrolling
- [ ] Keyboard-only pass through the footer: the new link is last, focus is visible, Enter activates it
- [ ] Check `/publishing-policy?lng=cy` renders Welsh throughout and the phase banner toggle returns
      to English
- [ ] Check the page renders and all links work with JavaScript disabled
- [ ] `yarn lint:fix`
- [ ] `yarn test`
- [ ] `yarn test:e2e`
