# #1110: Update to the 'no published lists' message

**State:** OPEN
**Assignees:** None
**Author:** OgechiOkelu
**Labels:** None
**Created:** 2026-09-30T13:02:00Z
**Updated:** 2026-09-30T13:29:48Z

## Description

**PROBLEM STATEMENT**
When hearings lists are not published against a venue in CaTH, the following message is currently displayed 'Sorry, no lists found for this court'. This message needs to be updated to the version approved by the user inclusion team. 

 

**AS A** Service Manager
**I WANT** to update the 'no published lists' message currently displayed in CaTH
**SO THAT** the message is more inclusive 

 

 

**ACCEPTANCE CRITERIA**
The ‘no published lists’ message is updated from 'Sorry, no lists found for this court' to ‘There are no lists available for this court or tribunal today.’

 

**Welsh translation:**
There are no lists available for this court or tribunal today - Nid oes unrhyw restrau ar gael ar gyfer y llys na’r tribiwnlys hwn heddiw

## Comments

### Comment by OgechiOkelu on 2026-09-30T13:18:34Z

@spec 

### Comment by hmctsclaudecode on 2026-09-30T13:22:08Z

# Technical Specification — Issue #1110: Update to the 'no published lists' message

## 1. User Story
**As a** Service Manager
**I want to** update the 'no published lists' message currently displayed in CaTH
**So that** the message uses the wording approved by the user inclusion team and is more inclusive of tribunal users

## 2. Background

When a user selects a venue from the court and tribunal search and no hearing lists are published against that venue (or none are visible to that user after access filtering), the *summary of publications* page renders a fallback empty-state message.

The current message is `Sorry, no lists found for this court`. It has two problems:

1. It says "court" only — CaTH serves tribunals as well as courts, so the message is wrong for a tribunal venue.
2. It opens with an apology and is phrased as a system failure ("no lists found") rather than a statement of fact about publication, which the user inclusion team has asked to be changed.

The approved replacement is `There are no lists available for this court or tribunal today.`

### Where the message lives today

| Concern | Location |
|---|---|
| English copy | `apps/web/src/pages/(public)/summary-of-publications/en.ts:4` (`noPublicationsMessage`) |
| Welsh copy | `apps/web/src/pages/(public)/summary-of-publications/cy.ts:4` (`noPublicationsMessage`) |
| Controller | `apps/web/src/pages/(public)/summary-of-publications/index.ts:137` passes `noPublicationsMessage: t.noPublicationsMessage` |
| Template | `apps/web/src/pages/(public)/summary-of-publications/index.njk:55` |
| Controller unit test | `apps/web/src/pages/(public)/summary-of-publications/index.test.ts:211` (asserts the literal string) |
| Template test | `apps/web/src/pages/(public)/summary-of-publications/index.njk.test.ts:68` (asserts via `en.noPublicationsMessage`, no literal) |
| E2E — English | `e2e-tests/tests/summary-of-publications.spec.ts:312` |
| E2E — Welsh | `e2e-tests/tests/summary-of-publications.spec.ts:446` |
| Translation catalogue | `templates/tech-spec-references/welsh-translations-catalogue.json:356` |

### Interaction with the per-venue "no list" message

This message is a **fallback only**. `index.njk:51-57` gives precedence to the venue-specific message authored by admins in location metadata (`location_metadata.no_list_message` / `welsh_no_list_message`, surfaced as `noListMessage`):

```njk
{% if noListMessage %}
  <div class="govuk-body">{{ noListMessage | sanitiseHtml }}</div>
{% elif not error %}
  <p class="govuk-body">{{ noPublicationsMessage }}</p>
{% endif %}
```

This precedence is **unchanged** by this ticket. Venues that already have a custom no-list message will continue to show it and will not display the new wording.

## 3. Acceptance Criteria

* **Scenario:** English empty state shows the approved wording
    * **Given** a court or tribunal venue exists with no published lists visible to the user, and the venue has no venue-specific no-list message configured
    * **When** the user views `/summary-of-publications?locationId=<id>` in English
    * **Then** the page displays `There are no lists available for this court or tribunal today.`
    * **And** the message `Sorry, no lists found for this court` no longer appears anywhere in the service

* **Scenario:** Welsh empty state shows the approved Welsh wording
    * **Given** the same venue with no published lists
    * **When** the user views `/summary-of-publications?locationId=<id>&lng=cy`
    * **Then** the page displays the approved Welsh translation of `There are no lists available for this court or tribunal today.` supplied by the user inclusion team in the ticket
    * **And** the previous Welsh string beginning `Mae'n ddrwg gennym…` no longer appears

* **Scenario:** Venue-specific no-list message still takes precedence
    * **Given** a venue with no published lists **and** a no-list message configured in its location metadata
    * **When** the user views the summary of publications page for that venue
    * **Then** only the venue-specific message is displayed
    * **And** the new default message is not displayed

* **Scenario:** Pages with published lists are unaffected
    * **Given** a venue with at least one published list visible to the user
    * **When** the user views the summary of publications page for that venue
    * **Then** the list links and `Select the list you want to view from the link(s) below:` are displayed
    * **And** neither the old nor the new empty-state message is displayed

* **Scenario:** Accessibility is not regressed
    * **Given** the empty state is displayed in English or Welsh
    * **When** an axe-core scan runs against the page
    * **Then** there are no WCAG 2.2 AA violations

## 4. User Journey Flow

No journey changes. The message sits at an existing terminal point of the "find a court or tribunal list" journey.

```
┌──────────────────────┐
│ Start / view option  │
│   /view-option       │
└──────────┬───────────┘
           │ "Court or tribunal hearing lists"
           ▼
┌──────────────────────────────┐
│ Search for a court/tribunal  │
│   /search  or  A-Z list      │
└──────────┬───────────────────┘
           │ selects a venue
           ▼
┌───────────────────────────────────────────────┐
│ Summary of publications                       │
│   /summary-of-publications?locationId=<id>    │
└──────────┬────────────────────────────────────┘
           │
           ├── artefacts visible to user? ──► YES ──► list of links (unchanged)
           │
           └── NO
                │
                ├── venue has metadata noListMessage? ─► YES ─► venue message (unchanged)
                │
                └── NO ─► ★ default empty-state message  ◄── CHANGED BY THIS TICKET
                           EN: "There are no lists available for this court
                                or tribunal today."
                           CY: approved Welsh translation
```

The user's onward options from the empty state are unchanged: the FaCT link, the back link, the language toggle, and the header/footer navigation.

## 5. Low Fidelity Wireframe

English, empty state, no venue-specific message:

```
┌────────────────────────────────────────────────────────────────────────┐
│ GOV.UK  Court and tribunal hearings                                    │
├────────────────────────────────────────────────────────────────────────┤
│ BETA  This is a new service – your feedback will help…    English|Cymraeg│
├────────────────────────────────────────────────────────────────────────┤
│  < Back                                                                │
│                                                                        │
│  What do you want to view from Oxford Combined Court            (h1)   │
│  Centre?                                                               │
│                                                                        │
│  Find contact details and other information about courts and           │
│  tribunals  in England and Wales, and some non-devolved tribunals      │
│  ^^^^^^^^^^ (link)                                                     │
│  in Scotland.                                                          │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ There are no lists available for this court or tribunal today.   │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│    ^ <p class="govuk-body"> — plain body copy, no panel/inset/warning  │
│                                                                        │
├────────────────────────────────────────────────────────────────────────┤
│  Footer: Terms & conditions · Cookies · Accessibility statement · …    │
└────────────────────────────────────────────────────────────────────────┘
```

Welsh, empty state (`?lng=cy`):

```
┌────────────────────────────────────────────────────────────────────────┐
│  < Yn ôl                                                               │
│                                                                        │
│  Beth ydych chi eisiau edrych arno gan Llys Cyfun Rhydychen?    (h1)   │
│                                                                        │
│  Dod o hyd i fanylion cyswllt a gwybodaeth arall am lysoedd a          │
│  thribiwnlysoedd yng Nghymru a Lloegr, …                               │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │  (Welsh empty-state message — see below)                         │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────┘
```

Welsh empty-state message text: [WELSH TRANSLATION REQUIRED: "There are no lists available for this court or tribunal today."]

For contrast, the unchanged populated state:

```
│  Select the list you want to view from the link(s) below:              │
│                                                                        │
│  • Crown Daily Cause List 30 September 2026 - English (Saesneg)        │
│  • Magistrates Public List 30 September 2026 - Welsh (Cymraeg)         │
```

## 6. Page Specifications

**Page:** Summary of publications (existing)
**Change type:** Content-only. No new page, route, component, template structure, controller logic, or database change.

### Layout

| Element | Spec | Change |
|---|---|---|
| Grid | `govuk-grid-row` > `govuk-grid-column-full` | unchanged |
| Heading | `<h1 class="govuk-heading-l">` — `{{ title }}` | unchanged |
| FaCT link paragraph | `<p class="govuk-body">` with `govuk-link` | unchanged |
| Caution message | `<div class="govuk-body">` when `cautionMessage` set, `sanitiseHtml` filtered | unchanged |
| Publication list | `<ul class="govuk-list">` when `publications.length > 0` | unchanged |
| Venue no-list message | `<div class="govuk-body">` when `noListMessage` set | unchanged |
| **Default empty-state message** | `<p class="govuk-body">{{ noPublicationsMessage }}</p>` | **text value only** |

### Files to change

1. `apps/web/src/pages/(public)/summary-of-publications/en.ts`
   `noPublicationsMessage: "There are no lists available for this court or tribunal today."`

2. `apps/web/src/pages/(public)/summary-of-publications/cy.ts`
   `noPublicationsMessage: [WELSH TRANSLATION REQUIRED: "There are no lists available for this court or tribunal today."]`

3. `apps/web/src/pages/(public)/summary-of-publications/index.test.ts:211`
   Update the hard-coded expectation. Prefer asserting against `en.noPublicationsMessage` imported from `./en.js` so the copy is asserted in exactly one place and future copy changes do not require a test edit.

4. `e2e-tests/tests/summary-of-publications.spec.ts:312` and `:446`
   Update both regex selectors to the new English and Welsh wording.

5. `templates/tech-spec-references/welsh-translations-catalogue.json:356`
   Replace the stale `"Sorry, no lists found for this court"` key with the new English string and the approved Welsh value, so future specs resolve the correct translation.

### Explicitly out of scope

- No change to the precedence between `noListMessage` and `noPublicationsMessage`.
- No change to the component used — this stays plain body copy. It is not an error, so `govukErrorSummary`, `govukWarningText`, `govukInsetText` and `govukNotificationBanner` are all wrong here, and the existing `<p class="govuk-body">` is retained.
- No change to any venue's stored `no_list_message` metadata. Venues with bespoke text keep it.
- No backfill or migration. `location_metadata` rows are admin-authored free text and are not touched.

## 7. Content

### Changed string

| Key | Before | After |
|---|---|---|
| `noPublicationsMessage` (en) | `Sorry, no lists found for this court` | `There are no lists available for this court or tribunal today.` |
| `noPublicationsMessage` (cy) | `Mae'n ddrwg gennym, nid ydym wedi dod o hyd i unrhyw restrau i'r llys hwn` | `[WELSH TRANSLATION REQUIRED: "There are no lists available for this court or tribunal today."]` |

### Content notes

- The new English string **ends with a full stop**; the old one did not. It is a complete sentence, so the full stop is correct and must be included in all assertions.
- The wording deliberately drops "Sorry" — it is a factual statement about publication, not a service failure, and an apology implies something went wrong.
- "court or tribunal" replaces "court" to cover tribunal venues, matching the service name ("Court and tribunal hearings") and the FaCT link copy already on the page.
- "today" reflects the query in `index.ts:42-49`, which only returns artefacts where `displayFrom <= now <= displayTo` — i.e. what is publishable now. The word is accurate for the data being shown.
- Reading age: plain English, one clause, no jargon. Suitable for the GDS age-9 target.

### Welsh translation

The ticket's acceptance criteria contains the Welsh translation **approved by the user inclusion team**. That string must be used verbatim. Do not machine-translate and do not reuse the existing catalogue value, which is the translation of the old English sentence and is no longer correct.

Implementation copy for `cy.ts`:

```typescript
export const cy = {
  // ...
  noPublicationsMessage: [WELSH TRANSLATION REQUIRED: "There are no lists available for this court or tribunal today."],
  // ...
};
```

### Locale key parity

`en.ts` and `cy.ts` keep identical key sets — only the value of one existing key changes, so parity is preserved. No key is added or removed.

## 8. URL

No routing change.

| URL | Method | Notes |
|---|---|---|
| `/summary-of-publications?locationId=<numeric id>` | GET | English (default) |
| `/summary-of-publications?locationId=<numeric id>&lng=cy` | GET | Welsh |

Route is auto-discovered from `apps/web/src/pages/(public)/summary-of-publications/index.ts`. `(public)` is a route group and contributes no URL segment.

## 9. Validation

No form, no user input, no new validation. Existing `locationId` guards in `index.ts:19-35` are unchanged:

| Condition | Behaviour |
|---|---|
| `locationId` absent | redirect to `/400` |
| `locationId` not parseable as an integer | redirect to `/400` |
| `locationId` does not resolve to a location | redirect to `/400` |

The empty-state message is only reachable once the location has resolved successfully, so it can never be shown alongside a location error.

## 10. Error Messages

None. This is not an error state and must not be presented as one.

Clarification of the three distinct empty/error presentations on this page, all unchanged in behaviour:

| State | Trigger | Rendering |
|---|---|---|
| Location invalid | failed `locationId` guard | redirect to `/400` page — never rendered inline |
| Page error | `error` set in render data | `govukErrorSummary` with title "There is a problem"; suppresses the default empty-state message (`index.njk:54`) |
| No lists published | `publications.length === 0`, no `error`, no `noListMessage` | plain `<p class="govuk-body">` with the new message — **no error styling, no error summary, no red, no `role="alert"`** |

## 11. Navigation

No change.

- Back link returns the user to the search or A-Z page they arrived from.
- The FaCT link (`https://www.find-court-tribunal.service.gov.uk/`) remains above the message and is the user's onward route for venue contact details.
- The language toggle in the phase banner preserves `locationId` when switching between `?lng=cy` and English, so the new message must be correct in both locales on the same URL.
- No redirect, no new link, and no change to link ordering is introduced by this ticket.

## 12. Accessibility

Target: WCAG 2.2 AA. No new markup, so no new ARIA is required — and none should be added.

| Requirement | How it is met |
|---|---|
| 1.3.1 Info and relationships | Message is a semantic `<p>` in the main content region, after the `<h1>` and the FaCT paragraph. No heading level is skipped. |
| 1.4.3 Contrast | `govuk-body` on white: `$govuk-text-colour` (#0b0c0c) ≥ 4.5:1. No colour change. |
| 1.4.1 Use of colour | Meaning is carried entirely by text. No colour, icon or styling conveys the state. |
| 3.1.2 Language of parts | Welsh string is served with `<html lang="cy">` by the i18n middleware; no per-element `lang` needed as the whole page is in one language. |
| 4.1.3 Status messages | The message is present on initial page load, not injected dynamically, so it needs **no** `role="status"` or `aria-live`. Adding one would cause a spurious screen-reader announcement. |
| 2.4.2 Page titled | `<title>`/`<h1>` remain the venue question; unchanged. |
| Screen reader | Read in normal document order as part of the main content. No focus management required — nothing is interactive. |
| Keyboard | No interactive element added; tab order unchanged (back link → FaCT link → footer links). |

Existing axe exclusions on this page's E2E scans (`disableRules(["target-size", "link-name"])`) relate to the header/footer and phase banner, not to this message. **Do not add new exclusions** — if the new copy triggers a violation, that is a real defect.

### Inclusive content check

The new wording is the reason for this ticket: it removes a needless apology, and it stops telling tribunal users they are at a "court". Both are inclusion improvements approved by the user inclusion team, so the exact wording must not be paraphrased during implementation.

## 13. Test Scenarios

Unit / template (Vitest, AAA pattern):

* Controller passes the new English `noPublicationsMessage` to the template when the locale is English — assert against the imported `en` object rather than a duplicated string literal.
* Controller passes the new Welsh `noPublicationsMessage` when the locale is `cy`.
* Template renders the default empty-state message in a `govuk-body` paragraph when `publications` is empty, `noListMessage` is unset and `error` is unset.
* Template suppresses the default message when a venue-specific `noListMessage` is present, rendering only the venue message.
* Template suppresses the default message when `error` is set, rendering only the error summary.
* Template does not render the default message when `publications` is non-empty; the select-list message and links render instead.
* Welsh render of the template shows the Welsh empty-state message and not the English one.
* Locale key parity between `en.ts` and `cy.ts` still holds.

Repository-wide guard:

* A search for the literal `Sorry, no lists found for this court` and the old Welsh string returns no hits in `apps/`, `libs/` or `e2e-tests/`. (Historical `requirements/migrations/*.sql` reconciliation dumps are immutable records of past board state and are expected to still contain the old string — they must not be edited.)

E2E (Playwright — extend the existing journey tests, do not add new ones):

* Existing test "should display no publications message when location has no publications" — update the text assertion to the new English wording; the inline accessibility scan in that test covers the empty state.
* Existing test "should preserve language selection with no publications message @nightly" — update the text assertion to the approved Welsh wording.

Per the project's E2E rules, no separate test is added for this copy change: the assertions belong inside the existing venue-with-no-lists journeys, which already include accessibility scanning and the language toggle check.

## 14. Assumptions & Open Questions

Assumptions:

* The change applies **only** to the default fallback on the summary of publications page. Venue-specific no-list messages in `location_metadata` are admin-authored and are left as-is, even where they contain the old apologetic phrasing. If the user inclusion team wants those reviewed too, that is separate work.
* The trailing full stop in `There are no lists available for this court or tribunal today.` is intentional and part of the approved copy.
* The Welsh string in the ticket is the user-inclusion-team-approved translation and is used verbatim; no further Welsh review is needed.
* `templates/tech-spec-references/welsh-translations-catalogue.json` is a spec-generation reference only and has no runtime effect, but is updated to stop future specs resolving the stale translation.
* No feature flag or phased rollout — this is a copy change deployed with the next release.

Open questions:

* Is the same updated wording required in any non-CaTH surface that reuses this copy (for example email or subscription notifications)? A repository search found the string only in this page, its tests and the reference catalogue, so the assumption is no.
* Several venues currently rely on the default message because they have no `no_list_message` configured. Should the Service Manager review whether any of those venues should instead have bespoke wording now that the default mentions tribunals? Out of scope here, flagged for the product decision.
* "today" is accurate for the current display-window query, but if a future change lets users browse lists for a chosen date, this message would need revisiting to avoid implying only today was checked.


### Comment by OgechiOkelu on 2026-09-30T13:29:48Z

@plan 

