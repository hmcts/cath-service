# #769: Inconsistencies - Frontend issue

**State:** OPEN
**Assignees:** junaidiqbalmoj
**Author:** OgechiOkelu
**Labels:** type:story, epic:public-journey
**Created:** 2026-06-24T16:33:57Z
**Updated:** 2026-09-10T08:16:00Z

## Description

**PROBLEM STATEMENT**
This ticket is raised to make changes to the 'How do you want to sign in?' page in CaTH.

**AS A** Service
**I WANT** to update the 'How do you want to sign in?' page in CaTH
**SO THAT** the page is up to date with current requirements 

**ACCEPTANCE CRITERIA**
The following changes need to be made and should follow the format displayed here https://pip-frontend.staging.platform.hmcts.net/sign-in 
- 'Don't have a CaTH account? [Create one here]' is updated to read as 2 sentences across 2 lines.

**Don't have an account?**

[Create a Court and tribunal hearings account]

- **Don't have an account?** is displayed boldly. 
- The same link embedded in [Create one here] is embedded in [Create a Court and tribunal hearings account]
- The following is displayed boldly underneath the embedded link; '**You may be contacted to take part in user research to help us improve our services. Participation is optional, and any information you share will be handled confidentially.**'

## Comments

### Comment by OgechiOkelu on 2026-08-12T12:49:07Z

@spec 

### Comment by hmctsclaudecode on 2026-08-12T12:53:50Z

# Technical Specification — Issue #769: Inconsistencies (Frontend) — 'How do you want to sign in?' page

## 1. User Story
**As a** professional user who does not yet have a Court and tribunal hearings (CaTH) account
**I want to** see a clearly signposted, plainly-worded prompt to create an account on the 'How do you want to sign in?' page, together with a notice about optional user research
**So that** I understand that self-service account creation is available to me, know exactly what kind of account I would be creating, and am told up front that I may be contacted for optional, confidential user research

## 2. Background

The CaTH sign-in page (`/sign-in`) is the entry point for all three professional sign-in routes (MyHMCTS, Common Platform, CaTH/B2C). Its current create-account footer copy diverges from the legacy PIP frontend, which is the reference implementation for this page:

Reference: `https://pip-frontend.staging.platform.hmcts.net/sign-in`

**Current implementation** — `apps/web/src/pages/(public)/sign-in/index.njk:57-60`:

```njk
<p class="govuk-body">
  {{ createAccountText }}
  <a href="/create-media-account" class="govuk-link">{{ createAccountLink }}</a>
</p>
```

Rendering as a single line: `Don't have a CaTH account? Create one here`

Three problems this ticket fixes:

1. **"CaTH" is unexplained jargon.** The abbreviation is not expanded anywhere on the page, so a first-time user cannot tell what account they are being offered. The service abbreviation is internal HMCTS shorthand.
2. **"Create one here" is a non-descriptive link.** "Here" links fail WCAG 2.4.4 (Link Purpose in Context) as a good-practice matter, and give screen-reader users scanning a link list no information. The destination page (`apps/web/src/pages/(public)/create-media-account/en.ts:2`) is already titled "Create a Court and tribunal hearings account" — the link text should match the destination title.
3. **No user research notice.** The service needs to tell account applicants that they may be contacted for user research, that participation is optional, and that anything they share is handled confidentially. Stating this at the point of account signposting (rather than only after submission) is a transparency requirement.

The page's routing, validation, and POST behaviour are **out of scope**. This is a content and markup change only — `apps/web/src/pages/(public)/sign-in/index.ts` requires no modification, because the locale-flattening render interceptor (`libs/web-core/src/middleware/i18n/locale-middleware.ts:92-134`) already spreads the `en`/`cy` object selected by locale into top-level template variables.

## 3. Acceptance Criteria

* **Scenario:** Create-account prompt renders as two lines with a bold lead-in
    * **Given** a user visits `/sign-in` in English
    * **When** the page renders
    * **Then** a bold second-level heading reading "Don't have an account?" is displayed below the Continue button, and on the line beneath it a link reading "Create a Court and tribunal hearings account" is displayed

* **Scenario:** Link destination is unchanged
    * **Given** a user is on `/sign-in`
    * **When** they activate the "Create a Court and tribunal hearings account" link
    * **Then** they are navigated to `/create-media-account` — the same destination previously served by the "Create one here" link

* **Scenario:** User research notice is displayed in bold beneath the link
    * **Given** a user visits `/sign-in`
    * **When** the page renders
    * **Then** the text "You may be contacted to take part in user research to help us improve our services. Participation is optional, and any information you share will be handled confidentially." is displayed in bold, positioned after the create-account link

* **Scenario:** Welsh users see the same structure fully translated
    * **Given** a user visits `/sign-in?lng=cy`
    * **When** the page renders
    * **Then** the bold heading, the link text, and the user research notice are all displayed in Welsh, in the same two-line-plus-notice layout, and the link still points to `/create-media-account`

* **Scenario:** The new content does not appear inside the form
    * **Given** the page renders
    * **When** the DOM is inspected
    * **Then** the heading, link, and user research notice are siblings of the `<form>` element, not descendants of it, so that pressing Enter within the radio group still submits the account-type selection and nothing else

* **Scenario:** Validation behaviour is unaffected
    * **Given** a user submits the form without selecting an account type
    * **When** the page re-renders with the error summary
    * **Then** the error summary, inline error message, and `href="#accountType"` link behave exactly as before, and the create-account heading, link, and user research notice are still displayed below the form

* **Scenario:** Heading hierarchy remains valid
    * **Given** the page renders
    * **When** the heading outline is inspected
    * **Then** the page has exactly one `h1` (the radio fieldset legend, "How do you want to sign in?") followed by the new `h2` ("Don't have an account?"), with no skipped levels

* **Scenario:** No new accessibility violations
    * **Given** the page renders in English and in Welsh, both in the clean state and in the validation-error state
    * **When** an axe-core scan runs (with the pre-existing site-wide `target-size` and `link-name` footer exclusions)
    * **Then** zero violations are reported

## 4. User Journey Flow

```
                    ┌─────────────────────────────┐
                    │  Landing page  /            │
                    │  or service nav "Sign in"   │
                    └──────────────┬──────────────┘
                                   │
                                   ▼
              ┌────────────────────────────────────────────┐
              │  GET /sign-in                              │
              │  "How do you want to sign in?"             │
              │                                            │
              │  ( ) With a MyHMCTS account                │
              │  ( ) With a Common Platform account        │
              │  ( ) With a Court and tribunal hearings    │
              │      account                               │
              │  [ Continue ]                              │
              │  ─────────────────────────────────────     │
              │  Don't have an account?          ◄── NEW   │
              │  Create a Court and tribunal      ◄── NEW  │
              │  hearings account (link)                   │
              │  You may be contacted to take     ◄── NEW  │
              │  part in user research… (bold)             │
              └───────┬────────────────────────┬───────────┘
                      │                        │
        selects + Continue              activates the
                      │              create-account link
        ┌─────────────┼─────────────┐          │
        ▼             ▼             ▼          ▼
   ┌─────────┐  ┌──────────┐  ┌─────────┐  ┌──────────────────────┐
   │POST     │  │POST      │  │POST     │  │GET                   │
   │/sign-in │  │/sign-in  │  │/sign-in │  │/create-media-account │
   │→        │  │→         │  │→        │  │"Create a Court and   │
   │/cft-    │  │/crime-   │  │/b2c-    │  │tribunal hearings     │
   │login    │  │login     │  │login    │  │account"              │
   └─────────┘  └──────────┘  └─────────┘  └──────────────────────┘

        nothing selected → re-render /sign-in with error summary
        (create-account block still present, unchanged)
```

The journey itself is not altered by this ticket. The only behavioural difference is that the second exit from the page (account creation) is now labelled descriptively, and the user research notice is read before the user commits to the account-creation route.

## 5. Low Fidelity Wireframe

**English, clean state (desktop, two-thirds column):**

```
┌────────────────────────────────────────────────────────────────────┐
│  ≡ GOV.UK  Court and tribunal hearings                    Sign in  │
├────────────────────────────────────────────────────────────────────┤
│  BETA  This is a new service – your feedback will help    Cymraeg  │
│        us improve it.                                              │
│                                                                    │
│  ‹ Back                                                            │
│                                                                    │
│  ┌──────────────────────────────────┐                              │
│  │ How do you want to sign in?      │  ← h1 (fieldset legend)      │
│  │ ═══════════════════════════      │                              │
│  │                                  │                              │
│  │  ( )  With a MyHMCTS account     │                              │
│  │                                  │                              │
│  │  ( )  With a Common Platform     │                              │
│  │       account                    │                              │
│  │                                  │                              │
│  │  ( )  With a Court and tribunal  │                              │
│  │       hearings account           │                              │
│  │                                  │                              │
│  │  ┏━━━━━━━━━━━━┓                  │                              │
│  │  ┃  Continue  ┃                  │                              │
│  │  ┗━━━━━━━━━━━━┛                  │                              │
│  └──────────────────────────────────┘  ← end of <form>             │
│                                                                    │
│  Don't have an account?                ← h2, bold  [NEW]           │
│                                                                    │
│  Create a Court and tribunal hearings account   ← link  [NEW]      │
│  ‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾                       │
│                                                                    │
│  You may be contacted to take part in user      ← bold  [NEW]      │
│  research to help us improve our services.                         │
│  Participation is optional, and any information                    │
│  you share will be handled confidentially.                         │
│                                                                    │
├────────────────────────────────────────────────────────────────────┤
│  Footer: Accessibility statement · Cookies · Privacy · Terms        │
└────────────────────────────────────────────────────────────────────┘
```

**Error state (nothing selected) — new block position is unchanged:**

```
│  ┌──────────────────────────────────────────────┐                  │
│  ┃ There is a problem                           │  ← error summary │
│  ┃                                              │                  │
│  ┃ • Please select an option  → #accountType    │                  │
│  └──────────────────────────────────────────────┘                  │
│                                                                    │
│  How do you want to sign in?                                       │
│  ┃                                                                 │
│  ┃ ✗ Please select an option                                       │
│  ┃                                                                 │
│  ┃  ( )  With a MyHMCTS account                                    │
│  ┃  ( )  With a Common Platform account                            │
│  ┃  ( )  With a Court and tribunal hearings account                │
│  ┃                                                                 │
│  ┃  ┏━━━━━━━━━━━━┓                                                 │
│  ┃  ┃  Continue  ┃                                                 │
│  ┃  ┗━━━━━━━━━━━━┛                                                 │
│                                                                    │
│  Don't have an account?                                            │
│                                                                    │
│  Create a Court and tribunal hearings account                      │
│                                                                    │
│  You may be contacted to take part in user research to help us     │
│  improve our services. Participation is optional, and any          │
│  information you share will be handled confidentially.             │
```

**Mobile (single column, ~320px) — the link wraps onto multiple lines; the heading and the notice each remain a distinct block:**

```
┌────────────────────────────┐
│ How do you want to         │
│ sign in?                   │
│                            │
│  ( ) With a MyHMCTS        │
│      account               │
│  ( ) With a Common         │
│      Platform account      │
│  ( ) With a Court and      │
│      tribunal hearings     │
│      account               │
│                            │
│  ┏━━━━━━━━━━━━━━━━━━━━━━┓  │
│  ┃      Continue        ┃  │
│  ┗━━━━━━━━━━━━━━━━━━━━━━┛  │
│                            │
│ Don't have an account?     │
│                            │
│ Create a Court and         │
│ tribunal hearings          │
│ account                    │
│                            │
│ You may be contacted to    │
│ take part in user          │
│ research to help us        │
│ improve our services.      │
│ Participation is           │
│ optional, and any          │
│ information you share      │
│ will be handled            │
│ confidentially.            │
└────────────────────────────┘
```

## 6. Page Specifications

### 6.1 Files changed

| File | Change |
|------|--------|
| `apps/web/src/pages/(public)/sign-in/en.ts` | Update `createAccountText` and `createAccountLink`; add `userResearchText` |
| `apps/web/src/pages/(public)/sign-in/cy.ts` | Mirror the three keys in Welsh |
| `apps/web/src/pages/(public)/sign-in/index.njk` | Replace the single-paragraph block at lines 57-60 with heading + link paragraph + bold notice |
| `apps/web/src/pages/(public)/sign-in/index.njk.test.ts` | Update assertions and the `requiredKeys` list |
| `e2e-tests/tests/sign-in.spec.ts` | Update the four assertions that reference the old copy |

**Not changed:** `apps/web/src/pages/(public)/sign-in/index.ts` (the controller already passes the whole `en`/`cy` objects to `res.render`, so new keys are picked up automatically), and `apps/web/src/pages/(public)/sign-in/index.test.ts` (it asserts only on `title`, radio labels, `continueButton`, and error behaviour — none of which change).

### 6.2 Template markup

Replace `index.njk:57-60` with:

```njk
    <h2 class="govuk-heading-s">{{ createAccountText }}</h2>

    <p class="govuk-body">
      <a href="/create-media-account" class="govuk-link">{{ createAccountLink }}</a>
    </p>

    <p class="govuk-body">
      <strong>{{ userResearchText }}</strong>
    </p>
```

Structural requirements:

- The block sits **outside and after** the `</form>` tag, inside `govuk-grid-column-two-thirds`, exactly where the current paragraph sits. Keeping it outside the form preserves implicit-submission semantics for the radio group.
- `<h2 class="govuk-heading-s">` gives the required bold rendering **and** a real heading, so screen-reader users can jump to the account-creation section via heading navigation. A `<p><strong>` would render bold but would be invisible to heading navigation — see §14 for the visual-parity check against the reference page.
- The link is the entire content of its own paragraph, which produces the required second line and guarantees the accessible name of the link is exactly the sentence "Create a Court and tribunal hearings account" (no leading "Don't have an account?" text bleeding into it, as would happen with the current inline layout).
- Bolding of the user research notice uses `<strong>`, matching the "displayed boldly" requirement in the AC. No custom CSS, no inline styles, no `govuk-!-font-weight-bold` utility needed.
- GOV.UK default spacing (`govuk-heading-s` bottom margin, `govuk-body` bottom margin) provides the vertical rhythm; do not add spacing overrides.

### 6.3 Content module

`apps/web/src/pages/(public)/sign-in/en.ts` — full file after change:

```typescript
export const en = {
  title: "How do you want to sign in?",
  errorSummaryTitle: "There is a problem",
  errorMessage: "Please select an option",
  hmctsLabel: "With a MyHMCTS account",
  commonPlatformLabel: "With a Common Platform account",
  cathLabel: "With a Court and tribunal hearings account",
  continueButton: "Continue",
  createAccountText: "Don't have an account?",
  createAccountLink: "Create a Court and tribunal hearings account",
  userResearchText:
    "You may be contacted to take part in user research to help us improve our services. Participation is optional, and any information you share will be handled confidentially."
};
```

The existing key names `createAccountText` and `createAccountLink` are **retained** — their semantics ("the lead-in text" and "the link text") are unchanged, so renaming would churn the template and both test files for no benefit. Only their values change. One key is added.

`apps/web/src/pages/(public)/sign-in/cy.ts` — full file after change:

```typescript
export const cy = {
  title: "Sut hoffech chi fewngofnodi?",
  errorSummaryTitle: "Mae yna broblem",
  errorMessage: "Rhaid dewis opsiwn",
  hmctsLabel: "Gyda chyfrif MyHMCTS",
  commonPlatformLabel: "Gyda chyfrif Common Platform",
  cathLabel: "Gyda chyfrif gwrandawiadau Llys a thribiwnlys",
  continueButton: "Parhau",
  createAccountText: "[TRANSLATE: \"Don't have an account?\"]",
  createAccountLink: "[TRANSLATE: \"Create a Court and tribunal hearings account\"]",
  userResearchText:
    "[TRANSLATE: \"You may be contacted to take part in user research to help us improve our services. Participation is optional, and any information you share will be handled confidentially.\"]"
};
```

Key parity between `en` and `cy` is already enforced by the existing test at `index.njk.test.ts:120-122` (`Object.keys(en).sort()` vs `Object.keys(cy).sort()`), so a missed Welsh key fails CI.

### 6.4 Rendered HTML (English)

```html
<h2 class="govuk-heading-s">Don&#39;t have an account?</h2>
<p class="govuk-body">
  <a href="/create-media-account" class="govuk-link">Create a Court and tribunal hearings account</a>
</p>
<p class="govuk-body">
  <strong>You may be contacted to take part in user research to help us improve our services. Participation is optional, and any information you share will be handled confidentially.</strong>
</p>
```

Nunjucks auto-escapes the apostrophe in "Don't"; no `| safe` filter is required or permitted here.

### 6.5 Progressive enhancement

The change is static markup and content only. It works with JavaScript disabled, with CSS disabled (the `<h2>` and `<strong>` still convey structure and emphasis semantically), and at 400% zoom / 320px viewport width, where the link text wraps across lines without truncation or horizontal scroll.

## 7. Content

### 7.1 English

| Key | Value |
|-----|-------|
| `createAccountText` | Don't have an account? |
| `createAccountLink` | Create a Court and tribunal hearings account |
| `userResearchText` | You may be contacted to take part in user research to help us improve our services. Participation is optional, and any information you share will be handled confidentially. |

Content notes:

- The typographic apostrophe question — "Don't" is written with a straight apostrophe (`'`), consistent with every other apostrophe in this page's locale files (`cy.ts:9` currently, `create-media-account/en.ts:10` "We'll"). Do not introduce a curly apostrophe for this string alone.
- "Court and tribunal hearings account" uses sentence case with a lowercase "tribunal" and "hearings", matching `cathLabel` on the same page and the `create-media-account` page title. Do not title-case it.
- The user research sentence is copied verbatim from the acceptance criteria, including the Oxford-comma-free ", and any information you share".

### 7.2 Welsh

| Key | Value |
|-----|-------|
| `createAccountText` | [WELSH TRANSLATION REQUIRED: "Don't have an account?"] |
| `createAccountLink` | Creu cyfrif gwrandawiadau llys a thribiwnlys |
| `userResearchText` | [WELSH TRANSLATION REQUIRED: "You may be contacted to take part in user research to help us improve our services. Participation is optional, and any information you share will be handled confidentially."] |

A Welsh rendering of "Create a Court and tribunal hearings account" already exists in the project's translation catalogue (`templates/tech-spec-references/welsh-translations-catalogue.json:950`), so the post-processing script should resolve that marker from the catalogue rather than producing a new variant. If it resolves to a different string than the one used on the `create-media-account` page heading, reconcile the two so the link text and the destination page's `h1` match in Welsh as they do in English.

The two other strings have no existing catalogue entry and will need translation.

### 7.3 Content removed

| Removed string | Where it lived |
|----------------|----------------|
| "Don't have a CaTH account?" | `en.ts:9` |
| "Create one here" | `en.ts:10` |
| "Nid oes gennych gyfrif CaTH?" | `cy.ts:9` |
| "Crëwch un yma" | `cy.ts:10` |

These strings appear nowhere else in the codebase apart from the tests listed in §6.1, so removal is safe.

## 8. URL

| Item | Value |
|------|-------|
| Page | `GET /sign-in` — unchanged |
| Source route | `apps/web/src/pages/(public)/sign-in/index.ts` (the `(public)` route group adds no URL prefix) |
| Template rendered | `sign-in/index` |
| Welsh | `GET /sign-in?lng=cy`, or via the language toggle / `locale` cookie / session locale |
| Link target | `/create-media-account` — unchanged |
| POST target | `POST /sign-in` — unchanged; redirects to `/cft-login`, `/crime-login`, or `/b2c-login` with `?lng=<locale>` |

No new routes. No routing, redirect, or route-group changes.

The create-account link remains a bare `/create-media-account` with no `lng` query parameter. Language continues to be carried by the session and `locale` cookie set in `localeMiddleware`, so a Welsh user following the link still lands on the Welsh version of the destination page. Adding `?lng=` to this link is **not** in scope for this ticket.

## 9. Validation

No new user input is introduced, so no new validation rules apply. Existing validation is unchanged and must be verified as a regression:

| Input | Rule | Behaviour |
|-------|------|-----------|
| `accountType` | Required; must be one of `hmcts`, `common-platform`, `cath` | Missing, empty, `null`, `undefined`, or unrecognised value → re-render `sign-in/index` with the error summary and the previously submitted value in `data.accountType` |

Validation remains server-side only (`index.ts:17-61`); the form keeps `novalidate`. The new content block is purely presentational and must not be rendered conditionally on the presence or absence of errors — it is always present, in both the clean and error states.

## 10. Error Messages

No new error messages. Existing messages are unchanged:

| Locale | Error summary title | Error message | Error link target |
|--------|--------------------|---------------|-------------------|
| English | There is a problem | Please select an option | `#accountType` |
| Welsh | Mae yna broblem | Rhaid dewis opsiwn | `#accountType` |

Note for a future ticket (out of scope here): "Please select an option" does not follow the GDS error-message convention — it should be an imperative naming the thing, e.g. "Select how you want to sign in". Changing it now would widen this ticket beyond the create-account block and would break several e2e assertions unrelated to the change requested.

## 11. Navigation

| Element | Type | Destination | Notes |
|---------|------|-------------|-------|
| Back link | `govukBackLink` from `layouts/base-template.njk` | `href="#"` | Pre-existing layout behaviour, unchanged |
| Continue | Submit button | `POST /sign-in` | Unchanged |
| Create a Court and tribunal hearings account | Standard `govuk-link` anchor | `GET /create-media-account` | Same destination as the previous "Create one here" link |
| Language toggle | Phase banner link | `?lng=<other locale>` | Preserves existing query params via `translationMiddleware` |

**Tab order after the change** (unchanged in relative order, because the block stays in the same DOM position):

1. Skip link
2. Header / service navigation links
3. Language toggle
4. Back link
5. Radio 1 (MyHMCTS) — arrow keys move within the radio group
6. Continue button
7. **Create a Court and tribunal hearings account link**
8. Footer links

The existing comment in `e2e-tests/tests/sign-in.spec.ts:273-280` lists the create-account link *before* the Continue button. That comment is already inaccurate against the current DOM (the link has always followed the form) and should be corrected while touching this file, so it does not mislead the next person.

Because the link is now the last interactive element before the footer and reads as a complete sentence, it is a genuine secondary call to action rather than an inline aside — no visual button styling, no `govuk-button--secondary`. It stays a plain link, matching the reference page.

## 12. Accessibility

WCAG 2.2 AA is mandatory. Specific requirements for this change:

**Heading structure (1.3.1 Info and Relationships, 2.4.6 Headings and Labels)**
- The page has exactly one `h1`: the radio fieldset legend, rendered by `govukRadios` with `isPageHeading: true` → `<legend><h1 class="govuk-fieldset__heading">`.
- The new `h2` follows it directly. No level is skipped. No other `h2` exists in `page_content`, so no sibling-ordering concern.
- "Don't have an account?" is a meaningful, descriptive section label — it passes 2.4.6.

**Link purpose (2.4.4 Link Purpose in Context, 2.4.9 Link Purpose Link Only — AAA, met as good practice)**
- The link's accessible name becomes the full "Create a Court and tribunal hearings account", which is self-describing out of context. This is the substantive accessibility improvement in this ticket: "Create one here" was only comprehensible from surrounding text.
- The link text matches the `h1` of the destination page (`create-media-account/en.ts:2`), satisfying 3.2.4 Consistent Identification.

**Emphasis and bold text (1.3.1, 1.4.8)**
- `<strong>` conveys the emphasis semantically rather than through appearance alone.
- Bolding a 2-sentence, ~180-character passage is a readability compromise — long bold runs are harder to read for users with dyslexia and low vision, and GDS content guidance advises using bold sparingly, for short phrases. The acceptance criteria explicitly require it and it matches the reference page, so it is implemented as specified. Flagged in §14 for content design to confirm.
- Do not add `aria-live`, `role="alert"`, or `role="note"` to the notice. It is static page content, not a status message; announcing it would be incorrect and disruptive.

**Colour and contrast (1.4.3, 1.4.11)**
- All three new elements use GOV.UK default colours: `govuk-heading-s` and `govuk-body` render `$govuk-text-colour` (#0b0c0c) on white (≈19:1), and `govuk-link` renders #1d70b8 on white (≈4.6:1) with a visible underline, so link identification is not colour-dependent.
- No custom colours, no inline styles.

**Focus (2.4.7 Focus Visible, 2.4.11 Focus Not Obscured)**
- The link uses the standard `govuk-link` focus state (black text on `$govuk-focus-colour` yellow with a black bottom bar). Nothing overlays it.

**Target size (2.5.8)**
- The link is inline text within a paragraph, which falls under the "inline" exception to 2.5.8. The existing site-wide footer `target-size` violation is separately documented in `docs/tickets/VIBE-150/accessibility-findings.md` and remains excluded from axe scans on this page.

**Reflow and text spacing (1.4.10, 1.4.12)**
- At 320px width and 400% zoom the link wraps across up to three lines and the notice across many; no truncation, no horizontal scroll, no fixed heights.

**Language of parts (3.1.2)**
- Handled at the document level by the layout's `lang` attribute. The Welsh page serves fully Welsh content — no mixed-language spans are introduced. "MyHMCTS" and "Common Platform" remain untranslated proper nouns in the existing radio labels; nothing new is added to that set.

**Screen reader verification** (manual, NVDA or VoiceOver):
- Heading navigation (`H` key) must reach "Don't have an account?" at level 2.
- Links list must show "Create a Court and tribunal hearings account" as a distinct, self-describing entry.
- Reading the notice must not be interrupted or repeated.

## 13. Test Scenarios

**Template tests** — `apps/web/src/pages/(public)/sign-in/index.njk.test.ts`

* Rendering with the English locale object produces an `h2` whose text is `en.createAccountText`, and that heading is the only `h2` in the rendered content.
* Rendering with the English locale object produces an anchor with `href="/create-media-account"` whose trimmed text equals `en.createAccountLink` exactly (not merely contains it), proving the link text is not polluted by the lead-in text.
* The anchor is inside its own `p.govuk-body` and is not a descendant of the `<form>` element.
* A `strong` element inside a `p.govuk-body` contains `en.userResearchText`.
* The DOM order of the three new elements is heading → link paragraph → notice paragraph, and all three come after the `<form>`.
* Rendering with the Welsh locale object produces the Welsh heading text, the Welsh link text on the same `/create-media-account` anchor, and the Welsh notice inside `strong`.
* The old strings "Don't have a CaTH account?", "Create one here", "Nid oes gennych gyfrif CaTH?" and "Crëwch un yma" no longer appear anywhere in the rendered output for either locale.
* Rendering in the error state (errors array present, `data.accountType` unset) still produces the heading, link, and notice, alongside the error summary.
* Existing assertions continue to pass: heading, three radio labels, radio values `["hmcts", "common-platform", "cath"]`, continue button, error summary in both locales, and pre-selection of the previously chosen radio.
* Locale key parity: `Object.keys(en).sort()` equals `Object.keys(cy).sort()`.
* The `requiredKeys` list is extended with `userResearchText`, and both `en` and `cy` are asserted to have every required key.

**Controller tests** — `apps/web/src/pages/(public)/sign-in/index.test.ts`

* No changes required. Optionally assert that the object passed to `res.render` includes `userResearchText` on both `en` and `cy`, to catch a locale file that fails to export the new key.

**E2E journey test** — `e2e-tests/tests/sign-in.spec.ts` (update existing tests; do not add new ones)

* In the existing "should load the page with all radio options" test, replace the "don't have a cath account" text assertion with an assertion on the level-2 heading "Don't have an account?", replace the "create one here" link-name assertion with "Create a Court and tribunal hearings account", keep the `href="/create-media-account"` assertion, and add an assertion that the user research notice text is visible.
* In the existing Welsh language-toggle test, replace the "nid oes gennych gyfrif cath" and "crëwch un yma" assertions with the Welsh heading, Welsh link name, and Welsh notice text, and keep the inline axe scan.
* In the existing "should navigate to create media account page" test, target the link by its new accessible name and assert navigation to `/create-media-account`.
* In the existing screen-reader ARIA test, update the create-account link accessible-name assertion to the new text.
* Correct the stale tab-order comment in the keyboard navigation test so it reflects the real DOM order (Continue button before the create-account link).
* The inline axe-core scans in the existing CaTH-selection and validation-error tests must continue to report zero violations with only the documented `target-size` and `link-name` exclusions.

**Manual verification**

* Side-by-side visual comparison of `/sign-in` against `https://pip-frontend.staging.platform.hmcts.net/sign-in` to confirm the heading size matches (see §14, open question 1).
* Keyboard-only pass: Tab reaches the link, Enter follows it.
* NVDA heading-navigation and links-list checks per §12.
* Rendering at 320px width and 400% zoom in both locales.

## 14. Assumptions & Open Questions

**Open questions**

1. **Heading size for "Don't have an account?"** — This spec uses `<h2 class="govuk-heading-s">`, which renders bold at 19px on desktop: bold as required, and visually subordinate to the 36px `h1`. The reference PIP page may use `govuk-heading-m` (24px). This needs a visual comparison against `https://pip-frontend.staging.platform.hmcts.net/sign-in` before merge; if the reference is larger, change the class to `govuk-heading-m`. This is a one-class change and affects no test that asserts on structure rather than styling — which is why the template tests above assert on the `h2` element and its text, never on its class.
2. **Bold user research notice** — Confirm with content design that a fully bold two-sentence, ~180-character paragraph is intended rather than, for example, only the first sentence bold, or the whole notice in `govukInsetText`. The AC is explicit ("displayed boldly"), so it is implemented as written, but it runs against GDS guidance to use bold sparingly and is a readability cost for users with dyslexia and low vision.
3. **Should the same user research notice appear on `/create-media-account`?** — The notice concerns account applicants, and that page is where the application is actually made and where personal data is collected. This ticket scopes it to `/sign-in` only. If the intent is that every applicant sees it, a follow-up ticket is needed for the destination page.
4. **Welsh for "Court and tribunal hearings account"** — The translation catalogue holds "Creu cyfrif gwrandawiadau llys a thribiwnlys" (`welsh-translations-catalogue.json:950`), while `cathLabel` on this same page uses the capitalisation "Gyda chyfrif gwrandawiadau Llys a thribiwnlys" and another catalogue entry uses "Llys a Thribiwnlys". Confirm the canonical Welsh capitalisation with the Welsh language team so the link text, the radio label, and the destination page `h1` are consistent.
5. **Does "account" without a qualifier introduce ambiguity?** — The heading now reads "Don't have an account?" on a page offering three different account types, two of which (MyHMCTS, Common Platform) cannot be self-served from this link. A user without a MyHMCTS account could reasonably read the heading as applying to them and follow the link to the wrong place. The AC mandates this exact wording and it matches the reference page; the link text immediately below does disambiguate. Worth raising with content design, but not a blocker.

**Assumptions**

1. Removing "CaTH" from the user-facing copy is intentional and desired; no other page needs a corresponding change, since these two strings exist only on this page.
2. The link destination stays `/create-media-account`. The AC states "the same link embedded in [Create one here] is embedded in [Create a Court and tribunal hearings account]" — only the text changes.
3. Existing locale-file key names (`createAccountText`, `createAccountLink`) are retained; only their values change. One key (`userResearchText`) is added.
4. No controller change is needed, because the render interceptor in `libs/web-core/src/middleware/i18n/locale-middleware.ts` flattens the locale object selected by `res.locals.locale` into template variables, so any new key on `en`/`cy` is automatically available to the template as `{{ userResearchText }}`.
5. The new content is always rendered, in both the clean and error states — it is not conditional.
6. No database, API, Prisma schema, or list-type changes. No new libs, no new package dependencies, no asset or SCSS changes.
7. The `?lng=` query parameter is deliberately not added to the create-account link; language continues to be carried by session and cookie, matching the current behaviour.
8. The site-wide footer accessibility exclusions (`target-size`, `link-name`) documented in `docs/tickets/VIBE-150/accessibility-findings.md` remain in place for the e2e axe scans on this page; this ticket does not fix them.
9. No analytics event, feature flag, or phased rollout is required — this is a straight content replacement.


### Comment by OgechiOkelu on 2026-08-12T12:55:15Z

@plan

### Comment by hmctsclaudecode on 2026-08-12T12:59:50Z

## Plan ready — `docs/tickets/769/` on branch `feature/769-sign-in-create-account-copy`

Scope is a content + markup change to one existing page (`apps/web/src/pages/(public)/sign-in/`). No controller, route, API, or database change: the render interceptor in `libs/web-core/src/middleware/i18n/locale-middleware.ts` flattens the `en`/`cy` object onto the template context, so a new locale key is available to the template automatically.

Strings were taken from the pip-frontend repo (`src/main/resources/locales/{en,cy}/sign-in.json`) rather than scraped from the staging page, so the copy is exact.

### Clarifications needed

1. **Is the whole user research notice meant to be bold?** It's two sentences / ~180 characters. Implemented bold as the AC states, and pip-frontend does render it fully bold — but it runs against GDS guidance to use bold sparingly and costs readability for users with dyslexia or low vision. Confirm, or say whether only the first sentence should be bold.

2. **The Welsh on pip-frontend looks wrong.** pip-frontend has `"accountInfo": "A oes gennych gyfrif?"`, which back-translates as "**Do** you have an account?" — the negative is missing. The plan uses `Nid oes gennych gyfrif?` instead, consistent with the string CaTH already ships. Confirm correct Welsh is preferred over byte-for-byte parity with pip-frontend, and whether a defect should be raised against pip-frontend.

3. **Welsh capitalisation of "Court and tribunal hearings".** Three variants are in circulation: pip-frontend's `gwrandawiadau llys a thribiwnlys`, this page's existing radio label `gwrandawiadau Llys a thribiwnlys`, and `Llys a Thribiwnlys` elsewhere. The plan follows the existing radio label so the link and the radio directly above it agree. Please confirm the canonical form with the Welsh language team.

4. **Heading size.** "Don't have an account?" uses `govuk-heading-s` (bold, 19px), subordinate to the 36px `h1`. If a side-by-side against staging shows pip-frontend rendering it larger, it becomes `govuk-heading-m`. One-class change, no test impact.

5. **Should the user research notice also appear on `/create-media-account`?** That's where the application is actually submitted and personal data collected, so it's arguably the more natural home for a research consent notice. This ticket scopes it to `/sign-in` only — confirm whether a follow-up is wanted.

6. **"Don't have an account?" is unqualified on a page offering three account types.** Only the CaTH account can be self-served from this link; a user without a MyHMCTS or Common Platform account could read the heading as applying to them. The AC mandates this wording and it matches the reference page, and the link text below does disambiguate, so it isn't treated as a blocker — but worth content design confirming the ambiguity is acceptable.

### Two deliberate departures from pip-frontend (flagged, not assumed)

- **Semantic `<h2>` instead of a bold `<p>`.** pip-frontend fakes the heading with `<p class="govuk-body-s govuk-!-font-weight-bold">`. Visually identical, but faking headings with bold text is an anti-pattern in this repo's own frontend/design rules and loses the screen-reader landmark. WCAG 2.2 AA is mandatory here, so the plan uses a real `h2`.
- **The block stays outside the `<form>`.** pip-frontend nests it inside; a navigation link is not a form control, and CaTH's current markup already has it outside.

Nothing above blocks implementation — items 1-6 can be answered while the change is built, with 2, 3 and 4 the ones that could alter shipped output.

