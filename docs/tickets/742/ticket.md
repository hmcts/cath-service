# #742: Advisory message for SJP Publishing time

**State:** OPEN
**Assignees:** None
**Author:** OgechiOkelu
**Labels:** enhancement, type:story, epic:public-journey
**Created:** 2026-06-18T10:28:52Z
**Updated:** 2026-07-29T14:19:46Z

## Description

**PROBLEM STATEMENT**

During the British Summer Time, SJP hearing lists are triggered to CaTH at a later time; however users are unaware of this publishing time lag as the currently displayed message states tha no lists are available. Hence this ticket is raised to review the displayed message on the SJP venue.

 

**AS A** Service manager

**I WANT** to update the displayed message on the SJP venue

**SO THAT** users are aware of the publishing time lag

 

**ACCEPTANCE CRITERIA**

- The message displayed on the SJP venue in CaTH when no lists are published is updated to read as follows;

'**Please note:** SJP hearing lists are published up until 10:15am. If no lists are currently displayed, please check again after this time.'

- This message will be displayed underneath the FaCT sentence and just above the sentence 'Select the list you want to view from the link(s) below:' when lists are published or just above the sentence 'Sorry, no lists found for this court' when no lists are published.
- The 'Please note' should be bold.

 



**Welsh translation:**

**Please note:** SJP hearing lists are published up until 10:15am. If no lists are currently displayed, please check again after this time.- Sylwer: Caiff rhestrau gwrandawiadau’r Weithdrefn Un Ynad (SJP) eu cyhoeddi tan 10:15am. Os nad oes unrhyw restrau yn ymddangos ar hyn o bryd, gwiriwch eto ar ôl yr amser hwn.


## Comments

### Comment by OgechiOkelu on 2026-07-29T12:47:27Z

@spec 

### Comment by hmctsclaudecode on 2026-07-29T12:53:15Z

# Technical Specification — Issue #742: Advisory message for SJP Publishing time

## 1. User Story

**As a** Service manager
**I want to** display an advisory message about SJP publishing times on the Single Justice Procedure venue page
**So that** users understand that lists may not yet be published and know to check again after 10:15am, rather than concluding no lists exist at all

## 2. Background

SJP hearing lists are pushed to CaTH by the upstream provider on a schedule. During British Summer Time the trigger fires later in the day, so a user visiting the SJP venue page early in the morning sees "Sorry, no lists found for this court" — which reads as a definitive statement that nothing will be published, not "not yet published". Users therefore stop checking and miss the lists entirely.

The fix is content-only: an advisory line on the SJP venue page telling users the publishing cut-off is 10:15am.

**Existing implementation:**

| Concern | Location |
|---|---|
| Venue page controller | `apps/web/src/pages/(public)/summary-of-publications/index.ts` |
| Venue page template | `apps/web/src/pages/(public)/summary-of-publications/index.njk` |
| English content | `apps/web/src/pages/(public)/summary-of-publications/en.ts` |
| Welsh content | `apps/web/src/pages/(public)/summary-of-publications/cy.ts` |
| Controller tests | `apps/web/src/pages/(public)/summary-of-publications/index.test.ts` |
| Template tests | `apps/web/src/pages/(public)/summary-of-publications/index.njk.test.ts` |
| E2E | `e2e-tests/tests/summary-of-publications.spec.ts` |
| SJP location seed row | `libs/location/src/location-data.ts` (`locationId: 9`, `name: "Single Justice Procedure"`) |
| Existing hardcoded SJP redirect | `apps/web/src/pages/(public)/view-option/index.ts:42` — `res.redirect("/summary-of-publications?locationId=9")` |

The template already renders an optional `cautionMessage` in exactly the position the ticket describes — after the FaCT sentence and before both `selectListMessage` and `noPublicationsMessage` (`index.njk:25-27`). `cautionMessage` is sourced from the `location_metadata` table and is editable by a system admin at `/location-metadata-manage`.

**Two viable approaches:**

* **Option A — configure `location_metadata.cautionMessage` for location 9.** Zero code change. Rejected as the primary approach: the content would live only in a database row per environment, is not version-controlled, is not covered by automated tests, has no guaranteed Welsh counterpart, and would be silently lost on any environment rebuild. It also occupies the caution-message slot, blocking that field for its actual purpose.
* **Option B — code-level advisory keyed on the SJP location (recommended).** Content lives in the page's `en.ts`/`cy.ts`, is rendered conditionally when the requested location is the SJP venue, and is covered by unit, template, and E2E tests. This spec assumes Option B.

**Location ID stability note:** unlike `list_type.id`, `location.location_id` is a non-autoincrement `Int @id` explicitly assigned in `libs/location/src/location-data.ts` and seeded via `INSERT ... ON CONFLICT (location_id)`. ID `9` is therefore stable across local, STG and any future environment seeded from the same source. `view-option/index.ts` already depends on this. To avoid a second scattered literal, the ID is extracted into one exported constant.

## 3. Acceptance Criteria

* **Scenario:** Advisory shown on SJP venue when no lists are published
    * **Given** I am any user (unauthenticated, verified, or admin) viewing `/summary-of-publications?locationId=9`
    * **And** no publications are currently within their display window for that location
    * **When** the page renders
    * **Then** I see "**Please note:** SJP hearing lists are published up until 10:15am. If no lists are currently displayed, please check again after this time."
    * **And** the advisory appears below the FaCT link paragraph and directly above "Sorry, no lists found for this court"
    * **And** "Please note:" is rendered in bold

* **Scenario:** Advisory shown on SJP venue when lists are published
    * **Given** I am viewing `/summary-of-publications?locationId=9`
    * **And** one or more publications are available
    * **When** the page renders
    * **Then** I see the same advisory message
    * **And** it appears below the FaCT link paragraph and directly above "Select the list you want to view from the link(s) below:"

* **Scenario:** Advisory not shown on non-SJP venues
    * **Given** I am viewing `/summary-of-publications?locationId=1` (Oxford Combined Court Centre) or any other non-SJP location
    * **When** the page renders
    * **Then** the SJP advisory message is not present, in either the lists-available or no-lists state

* **Scenario:** Welsh advisory
    * **Given** I am viewing `/summary-of-publications?locationId=9&lng=cy`
    * **When** the page renders
    * **Then** I see the Welsh advisory: "**Sylwer:** Caiff rhestrau gwrandawiadau'r Weithdrefn Un Ynad (SJP) eu cyhoeddi tan 10:15am. Os nad oes unrhyw restrau yn ymddangos ar hyn o bryd, gwiriwch eto ar ôl yr amser hwn."
    * **And** "Sylwer:" is rendered in bold
    * **And** no English text remains on the page

* **Scenario:** Coexistence with an admin-configured caution message
    * **Given** location 9 also has a `cautionMessage` set in `location_metadata`
    * **When** the page renders
    * **Then** the caution message renders first, followed by the SJP advisory, followed by the list/no-list content

* **Scenario:** Accessibility
    * **Given** I am on `/summary-of-publications?locationId=9` in English or Welsh
    * **When** an axe-core scan runs
    * **Then** there are no new WCAG 2.2 AA violations
    * **And** the advisory is announced by a screen reader as part of the normal document reading order

## 4. User Journey Flow

```
                    ┌─────────────────────────┐
                    │  GOV.UK / CaTH homepage │
                    └────────────┬────────────┘
                                 │
              ┌──────────────────┴──────────────────┐
              │                                     │
              ▼                                     ▼
   ┌──────────────────────┐            ┌──────────────────────────┐
   │  /view-option        │            │ /courts-tribunals-list   │
   │  "Find a Single      │            │ or /search               │
   │   Justice Procedure  │            │ (user picks SJP venue)   │
   │   case"              │            └────────────┬─────────────┘
   └──────────┬───────────┘                         │
              │ redirect                            │ link
              └──────────────────┬──────────────────┘
                                 ▼
        ┌────────────────────────────────────────────────────┐
        │  GET /summary-of-publications?locationId=9         │
        │                                                    │
        │  1. Resolve location (id 9 = Single Justice Proc.)  │
        │  2. Query artefacts in display window              │
        │  3. Filter by user access rights                   │
        │  4. isSjpVenue = (locationId === SJP_LOCATION_ID)  │
        │  5. Render                                         │
        └───────────────────────┬────────────────────────────┘
                                │
              ┌─────────────────┴─────────────────┐
              │                                   │
              ▼ publications.length > 0           ▼ publications.length === 0
   ┌────────────────────────────┐    ┌────────────────────────────┐
   │ FaCT sentence              │    │ FaCT sentence              │
   │ [SJP ADVISORY]  ◀── NEW    │    │ [SJP ADVISORY]  ◀── NEW    │
   │ "Select the list you want  │    │ "Sorry, no lists found     │
   │  to view..."               │    │  for this court"           │
   │ • List link 1              │    │                            │
   │ • List link 2              │    │ User now knows to return   │
   └─────────────┬──────────────┘    │ after 10:15am              │
                 │                   └────────────────────────────┘
                 ▼
      ┌─────────────────────┐
      │ Selected list view  │
      └─────────────────────┘
```

No new pages, no new routes, no change to navigation. The advisory is purely informational and does not gate or branch the journey.

## 5. Low Fidelity Wireframe

### State A — SJP venue, no lists published (English)

```
┌────────────────────────────────────────────────────────────────────────┐
│ ≡ GOV.UK  Court and tribunal hearings                    English|Cymraeg│
├────────────────────────────────────────────────────────────────────────┤
│ BETA  This is a new service – your feedback will help us improve it.    │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  What do you want to view from Single Justice Procedure?               │
│  ══════════════════════════════════════════════════════                │
│                                                                        │
│  Find contact details and other information about courts and           │
│  tribunals in England and Wales, and some non-devolved tribunals       │
│  in Scotland.                                                          │
│  ‾‾‾‾‾‾‾‾‾ (link)                                                      │
│                                                                        │
│  Please note: SJP hearing lists are published up until 10:15am.   ◀NEW │
│  ▔▔▔▔▔▔▔▔▔▔▔ (bold)                                                    │
│  If no lists are currently displayed, please check again after         │
│  this time.                                                            │
│                                                                        │
│  Sorry, no lists found for this court                                  │
│                                                                        │
├────────────────────────────────────────────────────────────────────────┤
│ Accessibility statement  Cookies  Privacy policy  Terms and conditions │
└────────────────────────────────────────────────────────────────────────┘
```

### State B — SJP venue, lists published (English)

```
┌────────────────────────────────────────────────────────────────────────┐
│  What do you want to view from Single Justice Procedure?               │
│  ══════════════════════════════════════════════════════                │
│                                                                        │
│  Find contact details and other information about courts and           │
│  tribunals in England and Wales, and some non-devolved tribunals       │
│  in Scotland.                                                          │
│                                                                        │
│  Please note: SJP hearing lists are published up until 10:15am.   ◀NEW │
│  ▔▔▔▔▔▔▔▔▔▔▔ (bold)                                                    │
│  If no lists are currently displayed, please check again after         │
│  this time.                                                            │
│                                                                        │
│  Select the list you want to view from the link(s) below:              │
│                                                                        │
│   SJP Public List (Full list) 29 July 2026 - English (Saesneg)         │
│   ‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾ (opens in new window)│
│   SJP Press List (Full list) 29 July 2026 - English (Saesneg)          │
│   ‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾                       │
└────────────────────────────────────────────────────────────────────────┘
```

### State C — SJP venue, Welsh

```
┌────────────────────────────────────────────────────────────────────────┐
│  Beth ydych chi eisiau edrych arno gan Gweithdrefn Un Ynad?            │
│  ═══════════════════════════════════════════════════════════           │
│                                                                        │
│  Dod o hyd i fanylion cyswllt a gwybodaeth arall am lysoedd a          │
│  thribiwnlysoedd yng Nghymru a Lloegr, a rhai tribiwnlysoedd nad       │
│  ydynt wedi'u datganoli yn yr Alban.                                   │
│                                                                        │
│  Sylwer: Caiff rhestrau gwrandawiadau'r Weithdrefn Un Ynad (SJP)  ◀NEW │
│  ▔▔▔▔▔▔▔ (bold)                                                        │
│  eu cyhoeddi tan 10:15am. Os nad oes unrhyw restrau yn ymddangos       │
│  ar hyn o bryd, gwiriwch eto ar ôl yr amser hwn.                       │
│                                                                        │
│  Dewiswch y rhestr rydych chi am ei gweld o'r ddolen(nau) isod:        │
└────────────────────────────────────────────────────────────────────────┘
```

### State D — Non-SJP venue (unchanged, advisory absent)

```
┌────────────────────────────────────────────────────────────────────────┐
│  What do you want to view from Oxford Combined Court Centre?           │
│  ══════════════════════════════════════════════════════════            │
│                                                                        │
│  Find contact details and other information about courts and           │
│  tribunals in England and Wales, and some non-devolved tribunals       │
│  in Scotland.                                                          │
│                                                                        │
│  Sorry, no lists found for this court        ◀── no advisory inserted  │
└────────────────────────────────────────────────────────────────────────┘
```

## 6. Page Specifications

### 6.1 Shared constant

Introduce a single exported constant for the SJP location ID and reuse it in both places that currently need it.

**New file:** `libs/location/src/sjp-location.ts`

```typescript
/** Location ID of the Single Justice Procedure venue. Assigned explicitly in location-data.ts, stable across environments. */
export const SJP_LOCATION_ID = 9;
```

Export from `libs/location/src/index.ts`:

```typescript
export { SJP_LOCATION_ID } from "./sjp-location.js";
```

Refactor `apps/web/src/pages/(public)/view-option/index.ts:42` to use it:

```typescript
return res.redirect(`/summary-of-publications?locationId=${SJP_LOCATION_ID}`);
```

### 6.2 Controller change

**File:** `apps/web/src/pages/(public)/summary-of-publications/index.ts`

Add the SJP flag and advisory text to the render context. No change to any query, filter, sort or dedupe logic.

```typescript
import { getLocationById, getLocationMetadataByLocationId, SJP_LOCATION_ID } from "@hmcts/location";

// ... existing body unchanged up to the render call ...

const isSjpVenue = locationId === SJP_LOCATION_ID;

res.render("summary-of-publications/index", {
  en,
  cy,
  title: pageTitle,
  noPublicationsMessage: t.noPublicationsMessage,
  selectListMessage: t.selectListMessage,
  publications: uniquePublications,
  cautionMessage,
  noListMessage,
  factLinkText: t.factLinkText,
  factLinkUrl: t.factLinkUrl,
  factAdditionalText: t.factAdditionalText,
  isSjpVenue,
  sjpAdvisoryPrefix: t.sjpAdvisoryPrefix,
  sjpAdvisoryMessage: t.sjpAdvisoryMessage
});
```

`locationId` is already the parsed integer at that point (`index.ts:21`), so the comparison is a plain `===` with no coercion.

### 6.3 Template change

**File:** `apps/web/src/pages/(public)/summary-of-publications/index.njk`

Insert immediately after the existing `cautionMessage` block (line 27) and before the `publications.length > 0` conditional (line 29). This single insertion satisfies both AC positions, because it sits above the branch that chooses between `selectListMessage` and `noPublicationsMessage` — no duplication in the two states.

```njk
    {% if cautionMessage %}
      <div class="govuk-body">{{ cautionMessage | safe }}</div>
    {% endif %}

    {% if isSjpVenue %}
      <p class="govuk-body" id="sjp-publishing-advisory">
        <strong>{{ sjpAdvisoryPrefix }}</strong> {{ sjpAdvisoryMessage }}
      </p>
    {% endif %}

    {% if publications.length > 0 %}
```

**Markup decisions:**

* Bold via a real `<strong>` element rather than HTML embedded in the content string. The prefix and body are two separate translation keys, so no `| safe` filter is needed and no HTML enters the locale files — this keeps the escaping guarantee intact (unlike `cautionMessage`, which is admin-authored and deliberately `| safe`).
* `<p class="govuk-body">`, not `govukInsetText` or `govukWarningText`. The ticket specifies plain body copy directly above the list intro sentence; inset text would introduce a grey left border and vertical spacing that visually detaches the advisory from the sentence it qualifies, and warning text implies legal consequence. `govukNotificationBanner` is also wrong here — it would sit above the `h1`, contradicting the AC placement.
* `id="sjp-publishing-advisory"` for stable test targeting.
* No custom CSS. No inline styles.

### 6.4 Rendering order summary

| Position | Element | Condition |
|---|---|---|
| 1 | Error summary | `error` set |
| 2 | `<h1>` page title | always |
| 3 | FaCT link paragraph | always |
| 4 | Caution message | `cautionMessage` set |
| 5 | **SJP advisory** | **`isSjpVenue`** |
| 6a | `selectListMessage` + list | `publications.length > 0` |
| 6b | `noListMessage` or `noPublicationsMessage` | `publications.length === 0` |

## 7. Content

### 7.1 English — `apps/web/src/pages/(public)/summary-of-publications/en.ts`

```typescript
export const en = {
  titlePrefix: "What do you want to view from",
  titleSuffix: "?",
  noPublicationsMessage: "Sorry, no lists found for this court",
  selectListMessage: "Select the list you want to view from the link(s) below:",
  forWeekCommencing: "for week commencing",
  languageEnglish: "English (Saesneg)",
  languageWelsh: "Welsh (Cymraeg)",
  factLinkText: "Find contact details and other information about courts and tribunals",
  factLinkUrl: "https://www.find-court-tribunal.service.gov.uk/",
  factAdditionalText: "in England and Wales, and some non-devolved tribunals in Scotland.",
  sjpAdvisoryPrefix: "Please note:",
  sjpAdvisoryMessage:
    "SJP hearing lists are published up until 10:15am. If no lists are currently displayed, please check again after this time."
};
```

### 7.2 Welsh — `apps/web/src/pages/(public)/summary-of-publications/cy.ts`

```typescript
export const cy = {
  titlePrefix: "Beth ydych chi eisiau edrych arno gan",
  titleSuffix: "?",
  noPublicationsMessage: "Mae'n ddrwg gennym, nid ydym wedi dod o hyd i unrhyw restrau i'r llys hwn",
  selectListMessage: "Dewiswch y rhestr rydych chi am ei gweld o'r ddolen(nau) isod:",
  forWeekCommencing: "ar gyfer yr wythnos yn dechrau ar",
  languageEnglish: "Saesneg (English)",
  languageWelsh: "Cymraeg (Welsh)",
  factLinkText: "Dod o hyd i fanylion cyswllt a gwybodaeth arall am lysoedd a thribiwnlysoedd",
  factLinkUrl: "https://www.find-court-tribunal.service.gov.uk/",
  factAdditionalText: "yng Nghymru a Lloegr, a rhai tribiwnlysoedd nad ydynt wedi'u datganoli yn yr Alban.",
  sjpAdvisoryPrefix: "[TRANSLATE: \"Please note:\"]",
  sjpAdvisoryMessage:
    "[TRANSLATE: \"SJP hearing lists are published up until 10:15am. If no lists are currently displayed, please check again after this time.\"]"
};
```

**Welsh copy supplied in the ticket** (to be used by the translation post-processing step):

* `sjpAdvisoryPrefix` → `Sylwer:`
* `sjpAdvisoryMessage` → `Caiff rhestrau gwrandawiadau'r Weithdrefn Un Ynad (SJP) eu cyhoeddi tan 10:15am. Os nad oes unrhyw restrau yn ymddangos ar hyn o bryd, gwiriwch eto ar ôl yr amser hwn.`

### 7.3 Content notes

* The English string is taken verbatim from the AC, including "10:15am" (no space before the meridiem) and the trailing full stop.
* "SJP" is used unexpanded in English, matching the AC. The supplied Welsh copy expands it to "Weithdrefn Un Ynad (SJP)" on first use, which is the correct Welsh convention — the asymmetry is intentional and must not be "corrected" to match.
* The Welsh apostrophe in `gwrandawiadau'r` is a typographic apostrophe (U+2019) in the ticket. Use the straight ASCII apostrophe `'` in the source file to match the existing style of `cy.ts` (`Mae'n ddrwg gennym`), and rely on the rendered output being visually equivalent.
* The colon lives inside `sjpAdvisoryPrefix` so it is bolded along with "Please note", matching the AC's bold instruction on the label including its punctuation.
* Splitting into two keys keeps `Object.keys(en).sort()` equal to `Object.keys(cy).sort()`, which is asserted by an existing test (`index.njk.test.ts:177`).

## 8. URL

No new or changed routes.

| URL | Behaviour |
|---|---|
| `GET /summary-of-publications?locationId=9` | Advisory shown |
| `GET /summary-of-publications?locationId=9&lng=cy` | Welsh advisory shown |
| `GET /summary-of-publications?locationId={other}` | Advisory absent, page otherwise unchanged |
| `GET /view-option` → `POST` with `sjp-case` | Still redirects to `/summary-of-publications?locationId=9`, now built from `SJP_LOCATION_ID` |

The language toggle already preserves the `locationId` query parameter (covered by `libs/web-core/src/middleware/i18n/locale-middleware.test.ts:200`), so switching language on the SJP page keeps the user on location 9 and the advisory persists.

## 9. Validation

No user input is introduced, so there is no new input validation.

Existing `locationId` validation in `index.ts` is unchanged and continues to apply before the advisory logic is reached:

| Condition | Behaviour |
|---|---|
| `locationId` query param missing | `redirect("/400")` |
| `locationId` not parseable as an integer | `redirect("/400")` |
| Location not found in the database | `redirect("/400")` |

Constraints on the new logic:

* `isSjpVenue` is derived from the already-parsed integer `locationId`; it must not be derived from the raw query string, and must not be derived from the location `name` (which differs by locale and is user-visible reference data that could be edited).
* The advisory renders identically for all user types. There is no role, provenance or sensitivity gate — access filtering (`filterPublicationsForSummary`) affects only the publication list, not the advisory.
* The advisory is unconditional with respect to time of day. It is static copy, not a live "lists are late" indicator, so no clock, timezone or BST calculation is introduced. See §14.

## 10. Error Messages

No new error messages. No new failure modes are introduced — the change adds a boolean flag and two static strings to an existing render context.

The existing error summary behaviour is untouched:

| Message | Trigger |
|---|---|
| "There is a problem" / `{{ error }}` | Existing `error` render variable, unchanged |
| "Sorry, no lists found for this court" | No publications and no `noListMessage`; now preceded by the advisory when on the SJP venue |

Note that "Sorry, no lists found for this court" is **not** an error message and must not be converted into one, moved into an error summary, or reworded as part of this ticket. The AC keeps it in place and adds context above it.

## 11. Navigation

No navigation changes.

* No new links, buttons, redirects or back-link behaviour.
* The advisory is static text — it contains no link, so it introduces no new tab stop and no new destination.
* All existing entry points to the SJP venue page (`/view-option`, `/search`, `/courts-tribunals-list`, `/account-home` tile, hearing-list back button) continue to work unchanged.
* The `view-option` redirect target is unchanged in value; only its construction moves to the shared constant.

## 12. Accessibility

**WCAG 2.2 AA compliance:**

| Requirement | How it is met |
|---|---|
| 1.3.1 Info and Relationships | Advisory is a semantic `<p>` in normal document flow; emphasis uses `<strong>`, not a CSS class or colour |
| 1.4.1 Use of Colour | Emphasis conveyed by font weight and the literal word "note", not by colour |
| 1.4.3 Contrast | Inherits `govuk-body` — `$govuk-text-colour` (#0b0c0c) on white, 19.4:1 |
| 1.4.4 Resize Text / 1.4.10 Reflow | Standard GOV.UK responsive typography inside `govuk-grid-column-full`; no fixed widths, no custom CSS |
| 2.1.1 Keyboard | No interactive element added; no new tab stops, no keyboard trap |
| 2.4.6 Headings and Labels | No heading added, so the existing `h1` → content hierarchy is preserved and no level is skipped |
| 4.1.2 Name, Role, Value | Plain static text; no ARIA required |

**Screen reader considerations:**

* The advisory is announced in reading order between the FaCT paragraph and the list intro / no-lists sentence — the same order a sighted user reads it.
* **No `role="alert"`, `aria-live` or `role="status"`.** The content is present on initial page load and never changes dynamically. A live region would either be ignored or, worse, interrupt the user's reading of the page heading. Adding one would be a defect.
* `<strong>` is used rather than `<b>` so the emphasis is semantic. Note that most screen readers do not audibly change tone for `<strong>` — this is acceptable because the phrase "Please note:" carries the meaning in the text itself, so no information is lost when emphasis is not conveyed.
* Language attribute: the Welsh page already sets `lang="cy"` via the base template, so the Welsh advisory is pronounced with Welsh phonetics.

**Cognitive accessibility:**

* Plain English, two short sentences, one specific actionable instruction ("check again after this time").
* Placed before the "no lists" statement so the user has the context before reading the potentially discouraging message — this ordering is the entire point of the ticket and must be preserved.

**Progressive enhancement:** static server-rendered HTML. Works with JavaScript disabled and with CSS disabled.

## 13. Test Scenarios

### Controller unit tests — `apps/web/src/pages/(public)/summary-of-publications/index.test.ts`

* Rendering the page for `locationId=9` passes `isSjpVenue: true` plus the English advisory prefix and message into the render context, in the state where publications exist.
* Rendering the page for `locationId=9` passes `isSjpVenue: true` and the advisory strings in the state where the artefact query returns nothing.
* Rendering the page for a non-SJP location (e.g. `locationId=1`) passes `isSjpVenue: false`.
* Rendering `locationId=9` with locale `cy` passes the Welsh advisory prefix and message.
* The advisory flag is unaffected by user type — the same `isSjpVenue: true` is passed for an unauthenticated request, a verified user, and a system admin.
* Existing redirect-to-`/400` behaviour for missing, non-numeric and unknown `locationId` still holds and never reaches the advisory logic.

### Template tests — `apps/web/src/pages/(public)/summary-of-publications/index.njk.test.ts`

* When `isSjpVenue` is true and publications exist, exactly one advisory paragraph renders, its `<strong>` contains "Please note:", and its text contains the full advisory sentence.
* When `isSjpVenue` is true and publications is empty, the advisory renders and appears in the DOM before the "Sorry, no lists found for this court" paragraph.
* When `isSjpVenue` is true and publications exist, the advisory appears in the DOM before the "Select the list you want to view..." paragraph.
* When `isSjpVenue` is false, no advisory paragraph is present in either the lists or no-lists state.
* When both `cautionMessage` and `isSjpVenue` are set, the caution message renders before the advisory, and both render before the list content.
* Rendering with the `cy` locale object produces the Welsh advisory text and Welsh bold prefix, and no English advisory text.
* The advisory text is HTML-escaped, not passed through `| safe` — asserted by confirming the rendered `<strong>` is the only markup and the message body renders as literal text.
* Locale key parity: `Object.keys(en).sort()` equals `Object.keys(cy).sort()` (existing test, now covering the two new keys).
* Required-keys assertion extended to include `sjpAdvisoryPrefix` and `sjpAdvisoryMessage`.

### view-option regression — `apps/web/src/pages/(public)/view-option/index.test.ts`

* Selecting the `sjp-case` option still redirects to `/summary-of-publications?locationId=9` after the refactor to `SJP_LOCATION_ID`.

### E2E — `e2e-tests/tests/summary-of-publications.spec.ts`

* Extend the existing SJP venue journey (do not add a standalone test): navigate to the SJP venue, assert the advisory is visible with its bold prefix in the no-lists state, switch to Welsh via the language toggle and assert the Welsh advisory, run an inline axe-core scan in both languages, then continue the existing journey through to viewing a published list and assert the advisory is still visible above the list-selection sentence.
* Within an existing non-SJP venue journey, assert the advisory is absent.

## 14. Assumptions & Open Questions

**Assumptions**

* The advisory is displayed **all year round**, not only during BST. The problem statement cites BST as the trigger, but the AC states unconditionally that the message "is updated to read as follows" with no time or date condition. Implementing a BST-only or before-10:15am-only variant would add timezone logic, make the copy inconsistent for users, and go beyond the AC. Flagged for confirmation — see open questions.
* "The SJP venue" means the single Single Justice Procedure location (`locationId: 9`), not every venue carrying the Magistrates Court sub-jurisdiction (`subJurisdictionId: 7`), which also includes e.g. Birmingham Magistrates' Court (`locationId: 12`).
* The advisory applies to the venue summary page only. SJP list pages themselves (`sjp-public-list`, `sjp-press-list`) and the verified-user account-home SJP tile are out of scope.
* "10:15am" is a fixed, business-agreed cut-off expressed in UK local time and is not derived from any configuration or from the actual upstream trigger schedule.
* `location.location_id = 9` for Single Justice Procedure is stable across all environments, on the basis that it is an explicitly-assigned non-autoincrement primary key seeded from `libs/location/src/location-data.ts` via `INSERT ... ON CONFLICT (location_id)`, and that `view-option/index.ts` already relies on this.
* Content ownership sits with the service manager; the copy in §7 is treated as signed off as supplied in the ticket, including the "10:15am" formatting and the SJP-unexpanded-in-English / SJP-expanded-in-Welsh asymmetry.

**Open questions**

* **Should the advisory be suppressed outside BST, or after 10:15am?** Recommendation: no — keep it always-on. It is accurate year-round (lists are still published up until 10:15am in GMT), and conditional display would mean the page reads differently for two users minutes apart, which is harder to support than a constant message. Confirm with the service manager before build.
* **Is `cautionMessage` on location 9 currently populated in STG?** If it is, the page will show two stacked advisory blocks. Someone with STG access should check `location_metadata` for `location_id = 9` and clear or reconcile any existing caution message before release, otherwise the AC placement is technically met but the page reads poorly.
* **Should this become an admin-editable field instead of hardcoded copy?** If the service expects the 10:15am time to change, or expects to apply similar advisories to other venues, the right long-term shape is a generic per-location advisory field in `location_metadata` with English and Welsh columns, managed at `/location-metadata-manage`. That is a larger change and is not what this ticket asks for. Raise as a follow-up if the time is expected to move.
* **Does the upstream trigger time actually change under BST, and could that be fixed at source?** The advisory is a workaround for a scheduling inconsistency. Worth raising with the team owning the SJP feed — a message telling users the service is late is weaker than the service not being late. Out of scope for this ticket.
* **Confirmation of the Welsh copy by a Welsh Language Unit reviewer.** The translation is supplied in the ticket rather than by the usual translation route; confirm it has been through Welsh language assurance, particularly the "Weithdrefn Un Ynad (SJP)" expansion and the mutation in `gwrandawiadau'r`.


### Comment by OgechiOkelu on 2026-07-29T14:19:46Z

@plan 

