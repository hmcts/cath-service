# Technical Plan — Issue #769: 'How do you want to sign in?' create-account copy

## 1. Technical Approach

This is a **content and markup change to one existing page**. There is no new module, no
new route, no API, no database change, and no new dependency.

The page already exists at `apps/web/src/pages/(public)/sign-in/` and serves `/sign-in`.
The work is:

- change two locale string values,
- add one new locale string (the user research notice),
- replace one `<p>` block in the template with a three-part block (bold sub-heading,
  link, bold notice),
- update the affected template tests, controller-level locale assertions, and the
  existing E2E journey tests.

### Key technical considerations

**No controller change is required.** `apps/web/src/pages/(public)/sign-in/index.ts`
passes `{ en, cy }` to `res.render`. The render interceptor at
`libs/web-core/src/middleware/i18n/locale-middleware.ts:107-117` detects the `en`/`cy`
pair, picks the object matching `res.locals.locale`, and **spreads it flat** onto the
template context. Any key added to `en.ts`/`cy.ts` is therefore automatically available
in the template as a bare variable (`{{ userResearchText }}`) with no controller edit.
This is why the existing template reads `{{ createAccountText }}` and not `{{ t.createAccountText }}`.

**Reference source.** The AC points at `https://pip-frontend.staging.platform.hmcts.net/sign-in`.
The authoritative strings and layout were taken from the pip-frontend repository rather
than by scraping the rendered page:

- `src/main/views/sign-in.njk` — layout of the block
- `src/main/resources/locales/en/sign-in.json` — `accountInfo`, `accountInfo_link_text`, `participantConsent`
- `src/main/resources/locales/cy/sign-in.json` — Welsh equivalents

**Link destination is unchanged.** `/create-media-account` stays exactly as-is; only the
anchor text changes. (pip-frontend uses the relative `create-media-account`; CaTH's
absolute `/create-media-account` is correct here and must not be changed to match.)

**Block stays outside the `<form>`.** pip-frontend nests this block inside its `<form>`.
CaTH currently renders it after `</form>`, which is correct — a navigation link is not a
form control. Keep it outside the form.

## 2. Implementation Details

**TEMPLATE SOURCE: n/a**

This is an edit to an existing CaTH page, not a new page or list-type view. The
`migrate-pip-pages` skill does not apply. pip-frontend is consulted only as the source of
truth for the exact copy strings and the visual ordering of the block.

### Files changed

| File | Change |
|---|---|
| `apps/web/src/pages/(public)/sign-in/en.ts` | Change 2 values, add `userResearchText` |
| `apps/web/src/pages/(public)/sign-in/cy.ts` | Change 2 values, add `userResearchText` |
| `apps/web/src/pages/(public)/sign-in/index.njk` | Replace the create-account `<p>` block |
| `apps/web/src/pages/(public)/sign-in/index.njk.test.ts` | Update assertions, add notice + `h2` coverage, add key to `requiredKeys` |
| `apps/web/src/pages/(public)/sign-in/index.test.ts` | Update any assertion referencing the old strings |
| `e2e-tests/tests/sign-in.spec.ts` | Update assertions in the **existing** tests — do not add new tests |

No new files. No `libs/` change — this copy is used by exactly one page, so it stays
co-located per the CLAUDE.md content-location strategy.

### Locale changes

`apps/web/src/pages/(public)/sign-in/en.ts` — replace the last two keys and add one:

```typescript
createAccountText: "Don't have an account?",
createAccountLink: "Create a Court and tribunal hearings account",
userResearchText:
  "You may be contacted to take part in user research to help us improve our services. Participation is optional, and any information you share will be handled confidentially."
```

`apps/web/src/pages/(public)/sign-in/cy.ts`:

```typescript
createAccountText: "Nid oes gennych gyfrif?",
createAccountLink: "Creu cyfrif gwrandawiadau Llys a thribiwnlys",
userResearchText:
  "Efallai y cysylltir â chi i gymryd rhan mewn ymchwil defnyddwyr i'n helpu i wella ein gwasanaethau. Mae cymryd rhan yn ddewisol, a chaiff unrhyw wybodaeth a rennir ei thrin yn gyfrinachol."
```

Notes on the Welsh:

- `userResearchText` is pip-frontend's `participantConsent` verbatim.
- `createAccountLink` is pip-frontend's `accountInfo_link_text` verbatim, except the
  capitalisation of "Llys a thribiwnlys" is taken from the existing `cathLabel` on this
  same page so the link and the radio label agree. See Open Question 3.
- `createAccountText` is **deliberately not** pip-frontend's `A oes gennych gyfrif?`.
  That translates as "Do you have an account?" — pip-frontend has dropped the negative.
  `Nid oes gennych gyfrif?` is the correct rendering of "Don't have an account?" and is
  consistent with the string CaTH already ships (`Nid oes gennych gyfrif CaTH?` with
  "CaTH" removed). See Open Question 2 — if the Welsh team wants byte-for-byte parity
  with pip-frontend, this reverts to `A oes gennych gyfrif?`.

Key ordering: keep `userResearchText` last in both files, and keep the `en`/`cy` key sets
identical — the existing `Locale consistency` test in `index.njk.test.ts` asserts this.

### Template change

`apps/web/src/pages/(public)/sign-in/index.njk` — replace lines 57-60:

```njk
    <p class="govuk-body">
      {{ createAccountText }}
      <a href="/create-media-account" class="govuk-link">{{ createAccountLink }}</a>
    </p>
```

with:

```njk
    <h2 class="govuk-heading-s govuk-!-margin-bottom-2">{{ createAccountText }}</h2>

    <p class="govuk-body govuk-!-margin-bottom-5">
      <a href="/create-media-account" class="govuk-link">{{ createAccountLink }}</a>
    </p>

    <p class="govuk-body govuk-!-font-weight-bold">{{ userResearchText }}</p>
```

This satisfies "2 sentences across 2 lines" — the heading and the link are separate block
elements, so they render on separate lines regardless of viewport, which the current
inline `{{ text }} <a>` markup does not guarantee.

**Markup decision — `<h2>` vs bold `<p>`.** pip-frontend uses
`<p class="govuk-body-s govuk-!-font-weight-bold">` for this line, i.e. a bold paragraph
that looks like a heading but is not one. This plan uses `<h2 class="govuk-heading-s">`
instead. Rationale:

- It is visually equivalent — `govuk-heading-s` is bold 19px, which is what the AC asks
  for ("displayed boldly") and is subordinate to the 36px `h1`.
- It gives screen-reader users a real landmark for this section. Faking a heading with
  bold text is called out as an anti-pattern in `.claude/rules/design.md` and
  `.claude/rules/frontend.md`, and WCAG 2.2 AA compliance is mandatory in this repo.
- The page's heading hierarchy stays valid: the radios legend renders the `h1`
  (`isPageHeading: true`), so `h2` is the correct next level.

The user research notice stays a bold `<p>`, matching pip-frontend — it is genuinely a
paragraph, not a heading.

Both new blocks render unconditionally, in the clean state and the validation-error state
alike.

## 3. Error Handling & Edge Cases

There is no new user input, so no new validation.

| Scenario | Expected behaviour |
|---|---|
| Validation error state (no radio selected, re-render) | Heading, link, and notice all still render below the form; error summary is unaffected |
| Welsh locale (`?lng=cy`) | All three strings render in Welsh; no English leaks |
| `userResearchText` missing from one locale file | Nunjucks renders an empty string silently — this is why the `Locale consistency` test must gain the new key in `requiredKeys` |
| Narrow viewport (320px) / 400% zoom | Heading, link and notice are separate block elements, so they wrap and stack without overlap |
| Keyboard navigation | Tab order is radios → Continue button → create-account link, following DOM order. The existing E2E test carries a stale comment implying the link precedes the button; correct that comment |
| JavaScript disabled | Unaffected — static content, no JS involved |

Non-edge-case but worth stating: the notice is ~180 characters of fully bold body text.
That is what the AC asks for, and it is implemented as written, but see Open Question 1.

## 4. Acceptance Criteria Mapping

| AC | How it is satisfied | Verification |
|---|---|---|
| Reads as 2 sentences across 2 lines | `<h2>` and the link's `<p>` are separate block elements | Template test asserts the `h2` and the anchor are distinct elements with the expected text |
| "Don't have an account?" displayed boldly | `<h2 class="govuk-heading-s">` — bold by default | Template test asserts `h2` text equals `en.createAccountText` / `cy.createAccountText` |
| Same link embedded in the new text | `href="/create-media-account"` unchanged; only anchor text changes | Template test asserts `a[href='/create-media-account']` text equals the new string; E2E asserts the link navigates to `/create-media-account` |
| User research notice displayed boldly underneath the link | `<p class="govuk-body govuk-!-font-weight-bold">` after the link's `<p>` | Template test asserts the text is present and that the notice element follows the anchor in DOM order; E2E asserts visibility in both locales |
| Follows the pip-frontend `/sign-in` format | Strings taken verbatim from pip-frontend's locale JSON (one documented Welsh exception); block ordering matches | Manual side-by-side comparison against the staging URL before merge |

### Testing approach

**Template tests** (`index.njk.test.ts`) — assert on structure with Cheerio, never on raw
HTML or on CSS classes:

- `h2` text equals `createAccountText`, in `en` and in `cy`
- `a[href='/create-media-account']` text equals `createAccountLink`, in `en` and in `cy`
- the user research notice text is present, in `en` and in `cy`
- the notice appears after the anchor in DOM order
- all three still render when `errors` is populated
- add `userResearchText` to the `requiredKeys` list

Do not assert on `govuk-heading-s` / `govuk-!-font-weight-bold` — those are styling and
may change per Open Question 4.

**E2E** (`e2e-tests/tests/sign-in.spec.ts`) — update the **existing** journey tests only;
adding tests violates the minimise-test-count rule in CLAUDE.md. Specifically, replace the
`/don't have a cath account/i` and `/create one here/i` matchers (lines ~33-37, ~191-194,
~257-259, ~369-370) with the new heading text, the new link accessible name, and the Welsh
equivalents, and add a notice-visibility assertion inside the existing English and Welsh
tests. Keep the existing inline axe scans; they must stay at zero violations under the
already-documented `target-size` / `link-name` footer exclusions.

**Commands:** `yarn lint:fix`, then `yarn test` from the repo root, then
`yarn test:e2e`.

**Manual:** load `/sign-in` and `/sign-in?lng=cy`, compare side by side against
`https://pip-frontend.staging.platform.hmcts.net/sign-in`, tab to the link and press
Enter, and check 320px width and 400% zoom.

## 5. CLARIFICATIONS NEEDED

1. **Is the whole user research notice meant to be bold?** The AC says "displayed boldly"
   and it is implemented that way, but that is two sentences / ~180 characters of bold
   body copy, which runs against GDS guidance to use bold sparingly and is a readability
   cost for users with dyslexia or low vision. pip-frontend does render it fully bold, so
   this matches the reference. Confirm with content design, or say whether only the first
   sentence should be bold / whether it belongs in `govukInsetText`.

2. **Welsh for "Don't have an account?"** — pip-frontend has
   `"accountInfo": "A oes gennych gyfrif?"`, which back-translates as "**Do** you have an
   account?"; the negative is missing. This plan uses `Nid oes gennych gyfrif?`. Confirm
   the correct Welsh is preferred over byte-for-byte parity with pip-frontend — and if so,
   whether a defect should be raised against pip-frontend.

3. **Welsh capitalisation of "Court and tribunal hearings"** — three variants are in
   circulation: pip-frontend's `gwrandawiadau llys a thribiwnlys` (lower case), this
   page's existing `cathLabel` (`gwrandawiadau Llys a thribiwnlys`), and
   `Llys a Thribiwnlys` elsewhere. This plan follows the existing `cathLabel` so the link
   and the radio directly above it agree. Confirm the canonical form with the Welsh
   language team.

4. **Heading size** — `govuk-heading-s` (bold, 19px) is used. If the side-by-side
   comparison shows pip-frontend rendering this larger, it becomes `govuk-heading-m`
   (24px). One-class change; no test asserts on the class, so no test churn either way.

5. **Should the notice also appear on `/create-media-account`?** That is where the
   application is actually submitted and personal data collected, so it is arguably the
   more natural place for a user research consent notice. This ticket scopes it to
   `/sign-in` only. Confirm whether a follow-up ticket is wanted.

6. **"Don't have an account?" on a three-account-type page** — the page offers MyHMCTS,
   Common Platform, and CaTH accounts, and only the CaTH one can be self-served from this
   link. A user without a MyHMCTS account could read the unqualified heading as applying
   to them. The AC mandates this exact wording and it matches the reference page, and the
   link text immediately below does disambiguate, so this is not treated as a blocker —
   but it is worth content design confirming the ambiguity is acceptable.
