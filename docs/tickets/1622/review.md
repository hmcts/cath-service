# Code Review: Issue #1622

[A11y] Package 3: Verified user journey – subscriptions and dashboard

Reviewed: uncommitted working tree on `fix/1622-a11y-package-3` (37 files, +923 / -230). The scope decisions in plan.md section 6 were treated as binding. These are: the five admin hidden-legend pages left to Package 4 item 4.7, an `h2` per letter, the tooltip text reused verbatim, inset text turned into a hint, only `/pending-subscriptions` changed for 3.6, and no work on the public courts-tribunals-list.

## Summary

The code changes are correct and follow the plan closely. I found no security, type-safety or functional bugs in the new code.

- **3.5:** the server-side validation path in `delete-subscription` tells the two POST sources apart correctly. It keeps the ownership check before any branching, and it now works without JavaScript.
- **3.4 and 3.7:** the legend and `isPageHeading` changes use the GOV.UK macros correctly. Every error-summary `href` matches the id of its first radio.
- **3.1:** the tooltip markup, CSS and locale keys are all removed. Nothing is left behind.
- **Tests:** template tests follow `.claude/rules/testing.md`: structural Cheerio assertions, conditional rendering tested both ways, Welsh, and en/cy key parity.

Two things block approval:

1. Four acceptance criteria are manual assistive-technology checks (keyboard-only, VoiceOver, screen reader). None of them has been done, and three more are only partly evidenced (Edge and Safari, cut-off content).
2. The system-admin E2E change (S5) has not been run.

Neither needs a code change, but the ticket's Definition of Done requires both.

## 🚨 CRITICAL Issues

There are no code defects. The items below are acceptance criteria with no evidence. Under the review rules, each unmet AC is listed here.

1. **Manual assistive-technology acceptance criteria not done (3.1, 3.2, 3.4, 3.7)**
   - **Problem:** These ACs have no evidence:
     - 3.1 "Checked with a keyboard only"
     - 3.2 "Checked with VoiceOver: the letter headings can be found with heading navigation…"
     - 3.4 "Checked with a screen reader: the question is announced when focus moves to the first option"
     - 3.7 "Checked with a screen reader: the question is announced once"

     `tasks.md` Verification items 52–54 are unticked.
   - **Impact:** The audit findings were raised with VoiceOver, JAWS and keyboard testing. Automated checks (axe, Cheerio) cannot confirm announcement order, double announcement or rotor behaviour, so the audit cannot be closed.
   - **Solution:** Do the checks and record the results (browser, AT, version, pass/fail) in the PR description:
     - Keyboard-only through the subscribe and edit-list-type journeys, covering `/subscription-add-list-language` and `/subscription-configure-list-language` and their previews.
     - VoiceOver + Safari rotor on `/location-name-search`. Letters should appear as `h2`, and the courts should follow their letter.
     - VoiceOver + Safari and JAWS + Edge on `/delete-subscription`, `/add-email-subscription`, `/delete-user-confirm/{id}` and `/delete-third-party-user`. The question should be announced once, and announced when focus enters the first radio.

## ⚠️ HIGH PRIORITY Issues

1. **S5 system-admin E2E changes not run** – `e2e-tests/tests/system-admin/user-management.spec.ts:154-162`
   - **Impact:** These are new assertions:
     - the legend group's accessible name
     - a single `h1`
     - the error-summary link moving focus to the first radio

     They have not run against a server, so a regression in the `delete-user-confirm` legend could ship without anyone seeing it. I traced the logic statically and it looks right. `pageTitle(email)` builds the legend text, so the group name is "Are you sure you want to delete {email}?". With no `idPrefix`, the first radio id is `confirmation`, which matches the `#confirmation` href. It still needs a real run.
   - **Recommendation:** Run `user-management.spec.ts` on a free port, or in CI, before merging. No E2E covers `delete-third-party-user`. Its template test (`delete-third-party-user/index.njk.test.ts`, "fieldset and legend" block) is the only evidence for that page.

2. **AC 3.3 "Nothing is cut off or overlapping at that size" – partly met**
   - **Done:** `verified-pages.scss:3-13,26` stacks the tiles below 40.0625em and adds `overflow-wrap: anywhere`. `account-home.spec.ts:56-69` asserts no horizontal scroll at 320px in en and cy, checks the three tiles are visible, and runs axe.
   - **Missing:** Nobody has looked at the page at 320px or 400% zoom to confirm nothing is clipped or overlapping. This matters most in Welsh, and for the phase banner (`white-space: nowrap`) and the fixed `.app-watermark` that plan section 3.3 names. `scrollWidth <= clientWidth` does not catch content clipped inside an `overflow: hidden` ancestor.

3. **AC 3.3 "Checked in Chrome, Edge and Safari" – partly met**
   - **Done:** Playwright Chromium at 320px (`account-home.spec.ts:56`).
   - **Missing:** Edge and Safari checks at 400% zoom. Safari matters most: see suggestion 6 on `flex: 1 1 0` in a column container.

4. **AC 3.6 "Checked with a keyboard on Chrome, Edge and Safari" – partly met**
   - **Done:** `email-subscriptions.spec.ts:245-246` and `:267-268` assert the Remove buttons on `/pending-subscriptions` and `/subscription-management` get keyboard focus (Chromium).
   - **Missing:** Nobody has checked visually that the yellow background and black underline appear in Chrome, Edge and Safari. Tasks.md says `/subscription-management` was "re-checked", but there is no record of the browser or the result.

## 💡 SUGGESTIONS

1. **`govuk-body-m` on the Remove buttons does nothing** – `pending-subscriptions/index.njk:73,110`
   - `web.scss` loads `govuk-frontend` (line 13) before `.app-link-button` (lines 53-64). Both are single-class selectors, so source order decides, and `.app-link-button`'s `margin: 0`, `font-size: inherit`, `line-height: inherit` and `color` win. The plan says the class keeps the old 19px size, but the button takes its size from `govuk-table__cell` instead. That is 19px from tablet up and 16px on mobile. This is a good result, because the old fixed 19px was larger than the surrounding text on mobile.
   - The extra class is therefore dead. `pending-subscriptions/index.njk.test.ts` asserts that it is present, which locks a no-op class into the test. Drop the class and that assertion, or document why it stays.

2. **Two near-identical link-button classes**
   - `.app-link-button` (`web.scss:53-76`) and `.govuk-button-as-link` (`button-as-link.scss:3`) do the same job.
   - The second uses the reserved `govuk-` prefix, which risks clashing with future govuk-frontend releases.
   - Consider moving `/subscription-management` to `.app-link-button` and deleting `button-as-link.scss` in a follow-up (DRY). This is out of scope under decision 7, so it is not required here.

3. **Tie each letter heading to its checkbox group** – `location-name-search/index.njk:121-133`
   - Add `role="group" aria-labelledby="letter-{{ group.letter }}"` to each `.govuk-checkboxes` div. Screen reader users who Tab between checkboxes in forms mode would then hear the letter as group context, not only in heading or browse navigation.
   - This also gives the `id="letter-X"` attributes a use. Today only the tests reference them.
   - `data-module="govuk-checkboxes"` on each group is harmless but not needed, because there are no conditional reveals.

4. **Accessible names of Remove buttons (existing issue, raise a follow-up)**
   - `subscription-management/index.njk:53` etc. use `aria-label="Unsubscribe from {name}"` on a button whose visible text is "Remove". The accessible name does not contain the visible label, which fails WCAG 2.5.3 Label in Name (Level A). Voice-control users who say "click Remove" will not hit it.
   - On `pending-subscriptions/index.njk:73,110`, every Remove button has the same name "Remove", with no context.
   - Recommended pattern: `Remove<span class="govuk-visually-hidden"> {{ location.name }}</span>`.
   - Not in this ticket's ACs, and the plan deliberately keeps the aria-labels for the E2E selectors. Do raise a ticket, because this is a Level A failure on a page this ticket touched.

5. **`as any` in a new test** – `location-name-search/index.test.ts:83`
   - `{ A: [abbey, ashford], B: [bristol] } as any`. Build fully typed `Location` fixtures (or a `buildLocation()` helper returning `Location`) so the test breaks if the `Location` shape changes.

6. **`flex: 1 1 0` in column mode** – `verified-pages.scss:19`
   - Below tablet the container is now `flex-direction: column` with auto height, but the tiles keep `flex: 1 1 0`. Current engines handle this because of `min-height: auto`. Older Safari is known to collapse `flex-basis: 0` items in auto-height column containers.
   - Applying `flex: 1 1 0` only inside the `min-width: 40.0625em` block is more robust, and it makes the mobile layout depend on content only.

7. **No back link on `/delete-subscription`** – `delete-subscription/index.njk` (existing)
   - GOV.UK question pages should have a back link. Out of scope, but cheap to add while the template is open.

8. **`subscription-add-list-language` has an error summary but no inline error** (existing; plan section 3 lists it as out of scope)
   - It has the same usability gap that 3.5 fixed on delete-subscription. Worth a follow-up.

9. **UI baseline checkpoints will change**
   - The `delete-subscription-no-answer` checkpoint in `apps/ui-baseline/cath/journeys/subscriptions.ts:150-152` will now show the server-rendered error page. The `location-name-search` and preview checkpoints will also change. These diffs are expected, so refresh or approve the baselines when the PR runs.

10. **Hint wording (content note only, decision 2 respected)**
    - "This version change will affect…" was written for the check answers page. On the question page, before any change is made, "This version change" is slightly odd. Consider a content-design review later. No change is needed for this ticket.

## ✅ Positive Feedback

**delete-subscription controller** (`delete-subscription/index.ts:80-96`)
- The ownership check (`getSubscriptionById(subscriptionId, userId)`) still runs before the form-source branch. A tampered or foreign `subscription` id redirects without rendering anything. The new tests cover null, throw and invalid UUID.
- The branch test is now explicit: `Boolean(subscription)`. That is simpler and more correct than the old `!unsubscribeConfirm` check, which could never send the error back to the server.
- Invalid values such as `maybe` fall through to the error render.

**delete-subscription template**
- The inline `bodyEnd` validation script is gone. It was the cause of the overlap, and the page now validates without JavaScript (progressive enhancement).
- The page title uses the GOV.UK "Error: " prefix (`index.njk:8`).

**Error-summary links**
- They are correct on all four radio pages: `#unsubscribe-confirm`, `#confirm-delete` (the `idPrefix` added in `delete-third-party-user/index.njk:29` fixes a broken link that existed before), `#confirmation` and `#subscriptionMethod`. Each has a template test asserting the href equals the first radio id.

**location-name-search refactor**
- `locationGroups` is built with a single immutable `map` (`index.ts:159`), and the interface sits at the bottom of the file in line with CLAUDE.md module ordering.
- The template keeps `id="location-{id}"`, `name="locationIds"` and `#selectionCount`, so the client JS and the E2E tests keep working.
- `.court-table` CSS was rightly left alone, because `(public)/courts-tribunals-list` still uses it.

**Tooltip removal**
- No leftovers. `grep` finds no `versionTooltip` or `app-version-header` outside the two negative test assertions.

**Template tests**
- They follow `.claude/rules/testing.md`:
  - `createTestEnvironment`
  - structural selectors
  - `toHaveLength`
  - no AAA comments in `.njk` tests
  - present and absent states (errors, no errors)
  - Welsh rendering
  - en/cy key-parity tests on every touched page

**E2E**
- Assertions were added to existing journeys rather than new tests (CLAUDE.md "minimise test count"). Accessibility checks use roles (`getByRole("group", { name })`), axe runs inline, and Welsh checks are part of the journey.

## Test Coverage Assessment

- **Unit tests:** Good.
  - `delete-subscription/index.test.ts` covers every new POST branch: subscription-management redirect, empty choice, invalid choice, Welsh error, ownership null, ownership throw, invalid UUID.
  - `location-name-search/index.test.ts` covers grouping order, the empty result and Welsh grouping.
  - Context run: 4123 pass, 3 skipped.
- **Template tests:** Good. All 13 touched templates have structural tests for the new behaviour. Gap: no fixture for a non-alphabetic first character (a name starting with a digit or apostrophe). Low risk, because the id stays valid HTML.
- **E2E tests:** Mostly good.
  - S1–S4 extended and reported passing on port 8443.
  - **S5 (`user-management.spec.ts`) has not been run** (HIGH #1).
  - No E2E covers `delete-third-party-user`; this is acceptable given the template tests.
- **Accessibility tests:** axe runs inline on `/add-email-subscription`, `/subscription-add-list-language`, `/subscription-confirmation-preview`, `/delete-subscription` (normal and error states), `/subscription-configure-list-*` and `/account-home` at 320px (en and cy). There have been no manual screen reader, Edge or Safari checks (CRITICAL #1, HIGH #2–4).
- **Statement coverage per changed workspace:**

  | Workspace | Statements | Status |
  |---|---|---|
  | `apps/web` | **95.76%** (5226/5457) | ✅ above 80% |
  | `e2e-tests` | n/a (not coverage-measured) | – |

  I measured this directly with `../../node_modules/.bin/vitest run --coverage` from `apps/web`: 386 files, 4123 passed. I did not use the root `yarn test:coverage`. Branches are 82.23%, functions 95.27% and lines 95.88%.

## Acceptance Criteria Verification

### 3.1 – Tooltip content unable to be accessed with a keyboard
- [x] The tooltip is removed from the check answers page – `subscription-confirmation-preview/index.njk:166`, `subscription-configure-list-preview/index.njk:59` (plain header text); `versionTooltip` removed from both pages' `en.ts`/`cy.ts`; `.app-version-header*` removed from `web.scss`; E2E `email-subscriptions.spec.ts:201-202,439-440`
- [x] Its content is shown as hint text on the "What version of the list do you want to receive?" page, before the user makes their choice – `subscription-add-list-language/index.njk:40-42`, `subscription-configure-list-language/index.njk:40-42`, `en.ts:4` / `cy.ts` on both; template tests assert `aria-describedby` and hint before `.govuk-radios`; E2E `email-subscriptions.spec.ts:186,191,400,402`
- [x] There is no information on the journey that only a mouse user can reach – the SVG `<title>` was the only hover-only content; nothing in `apps`, `libs` or `e2e-tests` references the tooltip any more (only the negative test assertions at `subscription-confirmation-preview/index.njk.test.ts:176`, `subscription-configure-list-preview/index.njk.test.ts:124`)
- [ ] Checked with a keyboard only – no evidence (manual check not done; `tasks.md:52` unticked)

### 3.2 – List of courts grouped by letter visually, but not in the page markup
- [x] Alphabets are displayed in standalone separate rows before the lists for that alphabet are displayed – `location-name-search/index.njk:122` (`h2.govuk-heading-m` per letter, decision 1)
- [x] The table markup is removed – `location-name-search/index.njk:121-133`; `index.ts:159` (no `tableRows`); template test "should not render any table markup"; E2E `email-subscriptions.spec.ts:141-142`
- [x] Courts are grouped under a heading for each letter, followed by that letter's checkboxes – `location-name-search/index.njk:121-133`; template test "should place each letter's checkboxes directly after its heading"; E2E `email-subscriptions.spec.ts:144`
- [x] Each checkbox still has a correctly linked label – `location-name-search/index.njk:126-127` (`id`/`for="location-{id}"`); template test "should link every checkbox to its label…"; E2E `getByRole("checkbox", { name })` at `email-subscriptions.spec.ts:149`
- [ ] Checked with VoiceOver: the letter headings can be found with heading navigation, and each court is clearly under its letter – no evidence (manual check not done; `tasks.md:54` unticked)

### 3.3 – Content does not reflow
- [x] At 320px width (400% zoom at 1280px), the dashboard content stacks vertically with no horizontal scrolling – `verified-pages.scss:3-13,26`; E2E `account-home.spec.ts:56-69` (en and cy, `scrollWidth <= clientWidth`)
- [~] Nothing is cut off or overlapping at that size – done: tiles asserted visible at 320px (`account-home.spec.ts:61-63`), `overflow-wrap: anywhere` (`verified-pages.scss:26`); missing: visual check for clipping or overlap (phase banner nowrap, watermark, Welsh text) at 320px and 400% zoom
- [~] Checked in Chrome, Edge and Safari – done: Playwright Chromium (`account-home.spec.ts:56`); missing: Edge and Safari

### 3.4 – Radio button groups are missing a fieldset and legend
- [x] Each affected radio group is wrapped in a `<fieldset>` with a `<legend>` – `delete-subscription/index.njk:32-43`, `delete-user-confirm/[userId]/index.njk:18-26`, `delete-third-party-user/index.njk:28-38`
- [x] Where the page asks a single question, the legend contains the page `<h1>` (GOV.UK `isPageHeading: true`) – same lines; template tests assert `legend h1.govuk-fieldset__heading` and exactly one `h1`; E2E `email-subscriptions.spec.ts` (delete-subscription group), `user-management.spec.ts:154-156` (not run)
- [x] Both pages above are fixed, and other confirmation pages using radios are checked – citizen `delete-subscription/index.njk:32-43`; admin `delete-user-confirm/[userId]/index.njk:18-26` and `delete-third-party-user/index.njk:28-38`; audit table of the other pages in `plan.md` section 2 item 3.4 (the five hidden-legend pages left to Package 4 item 4.7 by decision 4)
- [ ] Checked with a screen reader: the question is announced when focus moves to the first option – no evidence (manual VoiceOver and JAWS checks not done)

### 3.5 – Error message overlaps radio button content and no error summary provided
- [x] Submitting with no option chosen shows a GOV.UK error summary at the top of the page, and focus moves to it – `delete-subscription/index.ts:93-126`, `index.njk:12-17`; unit tests "should render the error summary when the confirmation form is submitted without a choice"; E2E `email-subscriptions.spec.ts:288-292` (`toBeFocused`, `Error:` title)
- [x] The inline error message is shown above the radios without overlapping them – `delete-subscription/index.njk:43` (`errorMessage` via the macro); inline `bodyEnd` script removed; template test "should render the inline error inside the fieldset, after the legend and before the radios"
- [x] The error summary link moves focus to the first radio option – `delete-subscription/index.ts:122` (`#unsubscribe-confirm`) matches `idPrefix` at `index.njk:30`; template test compares href with the first radio id; E2E `email-subscriptions.spec.ts:296-297`

### 3.6 – No clear focus indicator on 'remove' elements
- [x] "Remove" controls show the full GOV.UK focus style (yellow background with a black underline) when focused – `pending-subscriptions/index.njk:73,110` (inline `background: none` removed, `app-link-button`); focus rule at `web.scss:70-76`; template test asserts no `style` attribute; `/subscription-management` unchanged under decision 7
- [~] Checked with a keyboard on Chrome, Edge and Safari – done: Chromium keyboard-focus E2E at `email-subscriptions.spec.ts:245-246,267-268`; missing: visual focus-style check in Chrome, Edge and Safari

### 3.7 – Page heading is not used as radio group legend
- [x] The visually hidden legend is removed – `add-email-subscription/index.njk:33-39` (no `govuk-visually-hidden`); template test "should not render a visually hidden legend"
- [x] The page `<h1>` sits inside the `<legend>` (GOV.UK `isPageHeading: true`), and the `<fieldset>` wraps the whole radio group – `add-email-subscription/index.njk:31-58`; template tests (one `h1`, three radios in the fieldset); E2E `email-subscriptions.spec.ts:114-119`
- [ ] Checked with a screen reader: the question is announced once – no evidence (manual check not done)

**Totals: 24 criteria. 17 met, 3 partly met, 4 not met.**

## Next Steps

- [ ] Run `e2e-tests/tests/system-admin/user-management.spec.ts` (S5) and confirm it passes.
- [ ] Manual keyboard-only pass of the subscribe and edit-list-type journeys in Chrome, Edge and Safari, including the Remove focus style on `/pending-subscriptions` and `/subscription-management`.
- [ ] Manual 320px and 400% zoom check of `/account-home` in Chrome, Edge and Safari, in en and cy.
- [ ] VoiceOver + Safari (letter headings in the rotor, questions announced once) and JAWS + Edge on delete-subscription, add-email-subscription, delete-user-confirm and delete-third-party-user.
- [ ] Record the results in the PR description and tick `tasks.md:51-54`.
- [ ] Optional: suggestions 1, 3, 5 and 6 (small, low-risk).
- [ ] Raise follow-ups: suggestion 4 (Label in Name, WCAG 2.5.3, Level A), 2 (merge the link-button classes) and 8 (inline error on the list-language page).

## Overall Assessment

**NEEDS CHANGES**

The implementation is sound and ready on the code side, with no critical code defects. The NEEDS CHANGES status comes from the review rules:

- 4 manual assistive-technology acceptance criteria have no evidence.
- 3 browser and visual criteria are only partly evidenced.
- The S5 E2E has not been run.

Once those checks are done and recorded, I would expect this to be approved with no code changes, assuming the manual checks find nothing.

## Fixes applied after review (25 Nov 2026)

- Suggestion 1: removed the no-op `govuk-body-m` from the pending-subscriptions Remove buttons, along with its test assertion.
- Suggestion 3: each letter's checkbox group now has `role="group" aria-labelledby="letter-X"`, and the unneeded `data-module` is dropped. A template test covers it.
- Suggestion 5: the `as any` is replaced with typed `Location` fixtures in `location-name-search/index.test.ts`.
- Suggestion 6: `flex: 1 1 0` on `.verified-tile` now applies only from the tablet breakpoint up.
- Not done (out of scope or follow-up): 2, 4, 7, 8, 9 and 10.
- Still outstanding: the manual screen reader, keyboard, Edge, Safari and zoom checks; and the S5 E2E run, which is blocked because port 8080 is in use by another checkout.
