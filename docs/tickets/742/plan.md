# Technical Plan — Issue #742: Advisory message for SJP Publishing time

## 1. Summary

Content-only change. Add a static advisory paragraph to the Single Justice Procedure
venue summary page telling users SJP hearing lists are published up until 10:15am, so
that "Sorry, no lists found for this court" is not read as "no lists will ever exist".

No new routes, no new pages, no schema changes, no new dependencies.

## 2. Existing implementation (verified against the codebase)

| Concern | Location | Verified |
|---|---|---|
| Venue page controller | `apps/web/src/pages/(public)/summary-of-publications/index.ts` | yes |
| Venue page template | `apps/web/src/pages/(public)/summary-of-publications/index.njk` | yes |
| English content | `apps/web/src/pages/(public)/summary-of-publications/en.ts` | yes |
| Welsh content | `apps/web/src/pages/(public)/summary-of-publications/cy.ts` | yes |
| Controller tests | `apps/web/src/pages/(public)/summary-of-publications/index.test.ts` | yes |
| Template tests | `apps/web/src/pages/(public)/summary-of-publications/index.njk.test.ts` | yes |
| SJP location seed row | `libs/location/src/location-data.ts:66-72` (`locationId: 9`) | yes |
| SJP venue E2E journeys | `e2e-tests/tests/publication-authorisation.spec.ts` (uses `locationId=9`) | yes |

The template already renders an optional `cautionMessage` block at exactly the position
the AC describes — after the FaCT paragraph (`index.njk:21-23`) and before the
`publications.length > 0` branch (`index.njk:29`) that chooses between
`selectListMessage` and `noPublicationsMessage`. A single insertion between
`index.njk:27` and `index.njk:29` satisfies both AC placements with no duplication.

### Location ID stability

`Location.locationId` is `Int @id @map("location_id")` in
`libs/postgres-prisma/prisma/schema/location.prisma:70` — **no `@default(autoincrement())`**.
IDs are explicitly assigned in `libs/location/src/location-data.ts` and seeded with
`ON CONFLICT (location_id) DO UPDATE` (`apps/postgres/prisma/generate-seed-sql.ts:94`).
Location ID `9` is therefore stable across environments, unlike `list_type.id`. The
CLAUDE.md "never use numeric IDs" rule is specific to `ListType.id` and does not apply
here. Five existing sites already depend on `locationId=9`:

- `apps/web/src/pages/(public)/view-option/index.ts:42`
- `apps/web/src/pages/(verified)/account-home/index.njk:22`
- `apps/web/src/pages/(public)/hearing-lists/[locationId]/[artefactId]/index.njk.test.ts:44`
- `apps/web/src/pages/(verified)/account-home/index.njk.test.ts:52`
- `e2e-tests/tests/publication-authorisation.spec.ts` (multiple)

## 3. Approach

### 3.1 Rejected: configure `location_metadata.cautionMessage` for location 9

Zero code change, but rejected: the content would live only in a per-environment
database row, is not version-controlled, is not covered by automated tests, has no
guaranteed Welsh counterpart, is lost on any environment rebuild, and it consumes the
caution-message slot so that field can no longer be used for its actual purpose.

### 3.2 Chosen: code-level advisory keyed on the SJP location ID

Content lives in the page's `en.ts` / `cy.ts`, rendered conditionally when the requested
location is the SJP venue, covered by unit, template and E2E tests.

### 3.3 Where the SJP location ID constant lives — decision

**Declare `const SJP_LOCATION_ID = 9;` at the top of the page controller. Do not create
a new lib module and do not refactor `view-option`.**

Rationale (YAGNI / KISS): only one code site needs the *comparison*. Of the other four
existing occurrences of `9`, three are `.njk` template `href` literals and test
assertions that cannot import a TypeScript constant, and the fourth is a redirect string
in `view-option`. Introducing `libs/location/src/sjp-location.ts`, a barrel export, and a
cross-package dependency for a single integer that would still leave three literals in
place is added complexity for no reduction in duplication. If a future ticket needs the
SJP ID in several TypeScript modules, promote it to `@hmcts/location` then.

Per CLAUDE.md module ordering (§8), module-scope consts go at the top of the file.

## 4. Implementation details

### 4.1 English content — `apps/web/src/pages/(public)/summary-of-publications/en.ts`

Append two keys:

```typescript
sjpAdvisoryPrefix: "Please note:",
sjpAdvisoryMessage:
  "SJP hearing lists are published up until 10:15am. If no lists are currently displayed, please check again after this time."
```

### 4.2 Welsh content — `apps/web/src/pages/(public)/summary-of-publications/cy.ts`

```typescript
sjpAdvisoryPrefix: "Sylwer:",
sjpAdvisoryMessage:
  "Caiff rhestrau gwrandawiadau'r Weithdrefn Un Ynad (SJP) eu cyhoeddi tan 10:15am. Os nad oes unrhyw restrau yn ymddangos ar hyn o bryd, gwiriwch eto ar ôl yr amser hwn."
```

Content notes:

- The English string is verbatim from the AC, including `10:15am` (no space before the
  meridiem) and the trailing full stop.
- Splitting prefix from body into two keys is deliberate: it lets the template emit a
  real `<strong>` element, so no HTML enters the locale files and no `| safe` filter is
  needed. It also keeps `Object.keys(en).sort()` equal to `Object.keys(cy).sort()`, which
  is asserted by the existing test at `index.njk.test.ts:177`.
- The colon sits inside the prefix so it is bolded with the label, matching the AC.
- Use the ASCII apostrophe `'` in `gwrandawiadau'r`, matching the existing style of
  `cy.ts:4` (`Mae'n ddrwg gennym`). The ticket uses U+2019; the rendered output is
  visually equivalent.
- "SJP" is unexpanded in English (per AC) but expanded to "Weithdrefn Un Ynad (SJP)" in
  Welsh (per the supplied translation). This asymmetry is intentional — do not "correct" it.
- The Welsh copy is taken directly from the ticket. Welsh Language Unit assurance is an
  open question (§8).

### 4.3 Controller — `apps/web/src/pages/(public)/summary-of-publications/index.ts`

Add a module-scope constant and two render variables. No change to any query, filter,
sort or dedupe logic.

```typescript
const SJP_LOCATION_ID = 9;
```

In the existing `res.render(...)` call (`index.ts:121-133`), add:

```typescript
isSjpVenue: locationId === SJP_LOCATION_ID,
sjpAdvisoryPrefix: t.sjpAdvisoryPrefix,
sjpAdvisoryMessage: t.sjpAdvisoryMessage
```

`locationId` is already the parsed integer at that point (`index.ts:21`), so this is a
plain `===` with no coercion.

### 4.4 Template — `apps/web/src/pages/(public)/summary-of-publications/index.njk`

Insert between the existing `cautionMessage` block (ends line 27) and the
`publications.length > 0` conditional (line 29):

```njk
    {% if isSjpVenue %}
      <p class="govuk-body" id="sjp-publishing-advisory">
        <strong>{{ sjpAdvisoryPrefix }}</strong> {{ sjpAdvisoryMessage }}
      </p>
    {% endif %}
```

Markup decisions:

- Bold via a real `<strong>` element, not HTML embedded in a content string. Both values
  are auto-escaped by Nunjucks — unlike `cautionMessage`, which is admin-authored and
  deliberately `| safe`.
- `<p class="govuk-body">`, **not** `govukInsetText`, `govukWarningText` or
  `govukNotificationBanner`. The AC specifies plain body copy directly above the list
  intro sentence. Inset text adds a grey left border and vertical spacing that visually
  detaches the advisory from the sentence it qualifies; warning text implies legal
  consequence; a notification banner would sit above the `<h1>`, contradicting the AC
  placement.
- `id="sjp-publishing-advisory"` for stable test targeting.
- No custom CSS, no inline styles.

### 4.5 Resulting render order

| Position | Element | Condition |
|---|---|---|
| 1 | Error summary | `error` set (currently never set by the controller) |
| 2 | `<h1>` page title | always |
| 3 | FaCT link paragraph | always |
| 4 | Caution message | `cautionMessage` set |
| 5 | **SJP advisory** | **`isSjpVenue`** |
| 6a | `selectListMessage` + list | `publications.length > 0` |
| 6b | `noListMessage`, else `noPublicationsMessage` | `publications.length === 0` |

## 5. Error handling & edge cases

No new user input, so no new validation. Existing `locationId` validation is unchanged
and runs before the advisory logic is reached:

| Condition | Behaviour |
|---|---|
| `locationId` query param missing | `redirect("/400")` |
| `locationId` not parseable as an integer | `redirect("/400")` |
| Location not found in the database | `redirect("/400")` |

Edge cases:

- **`cautionMessage` also set on location 9** — both render, caution first, then the
  advisory. Technically meets the AC but reads poorly; see open questions (§8).
- **`noListMessage` set on location 9** — the advisory still renders above it, satisfying
  the AC intent (advisory above the no-lists content).
- **All user types** — the advisory renders identically for unauthenticated, verified,
  CTSC/local admin and system admin users. `filterPublicationsForSummary` affects only
  the publication list, never the advisory.
- **Time of day / BST** — the advisory is static copy, unconditional on the clock. No
  timezone or BST logic is introduced. See §8.
- **Non-SJP venues** — advisory absent, page otherwise byte-identical to today.
- **`isSjpVenue` derivation** — must come from the already-parsed integer `locationId`,
  never from the raw query string and never from the location `name` (which is
  locale-dependent and editable reference data).

## 6. Acceptance criteria mapping

| AC | How it is satisfied | Verified by |
|---|---|---|
| Message text updated to the supplied string | `sjpAdvisoryPrefix` + `sjpAdvisoryMessage` in `en.ts` | Template test asserting full sentence |
| Displayed underneath the FaCT sentence | Inserted after `index.njk:23` (FaCT paragraph) | Template test asserting DOM order |
| Above `selectListMessage` when lists are published | Insertion sits above the `publications.length > 0` branch | Template test, publications-present state |
| Above `noPublicationsMessage` when no lists | Same single insertion covers both branches | Template test, empty-publications state |
| "Please note" bold | `<strong>{{ sjpAdvisoryPrefix }}</strong>` | Template test asserting `strong` text |
| Welsh translation | `cy.ts` keys + existing locale-parity test | Template test with `cy` locale |
| SJP venue only | `isSjpVenue: locationId === 9` | Controller test for `locationId=1` → `false` |

## 7. Test plan

### Controller unit tests — `summary-of-publications/index.test.ts`

The existing mock for `getLocationById` already returns location 9 and location 1, so no
new mock scaffolding is needed.

- `locationId=9` with publications present → render context contains `isSjpVenue: true`
  and the English advisory prefix and message.
- `locationId=9` with an empty artefact result → same advisory values passed.
- `locationId=1` → `isSjpVenue: false`.
- `locationId=9` with `res.locals.locale = "cy"` → Welsh advisory prefix and message.
- Existing `/400` redirect tests continue to pass (advisory logic never reached).

### Template tests — `summary-of-publications/index.njk.test.ts`

The `buildData` helper (`index.njk.test.ts:15-28`) must be extended with
`isSjpVenue: false`, `sjpAdvisoryPrefix` and `sjpAdvisoryMessage` so existing tests keep
exercising the non-SJP default.

- `isSjpVenue: true` + publications → exactly one `#sjp-publishing-advisory`, its
  `<strong>` text is `Please note:`, its text contains the full sentence.
- `isSjpVenue: true` + publications → advisory appears in the DOM **before** the
  `selectListMessage` paragraph.
- `isSjpVenue: true` + empty publications → advisory appears **before** the
  `noPublicationsMessage` paragraph.
- `isSjpVenue: false` → no `#sjp-publishing-advisory`, in both the lists and no-lists states.
- `cautionMessage` + `isSjpVenue: true` → caution renders before the advisory, both
  before the list content.
- `cy` locale → Welsh advisory and Welsh bold prefix present, English advisory text absent.
- Existing locale-parity test (`:177`) now covers the two new keys; extend the
  required-keys list (`:181`) with `sjpAdvisoryPrefix` and `sjpAdvisoryMessage`.

Assert on structure with Cheerio (`$("#sjp-publishing-advisory strong")`), not raw HTML
slices, and use `toHaveLength` — per `.claude/rules/testing.md`.

### E2E — `e2e-tests/tests/publication-authorisation.spec.ts`

**Correction to the spec comment on the issue:** it recommends extending
`e2e-tests/tests/summary-of-publications.spec.ts`. That file creates its own dynamic test
locations via `createUniqueTestLocation` and never visits `locationId=9`, so the advisory
would never appear there. The SJP venue (`locationId=9`) journeys live in
`publication-authorisation.spec.ts`.

Extend the **existing** unauthenticated journey (`publication-authorisation.spec.ts:90`)
— do not add a standalone test, per the minimise-test-count rule:

- After the existing navigation to `/summary-of-publications?locationId=9`, assert the
  advisory is visible and its bold prefix reads `Please note:`.
- At the existing Welsh step (`locationId=9&lng=cy`, line ~114), assert the Welsh advisory
  text.
- Keep the existing inline axe scan; confirm no new violations.

Add one assertion to an existing non-SJP venue journey in
`summary-of-publications.spec.ts` that `#sjp-publishing-advisory` is absent.

## 8. Accessibility

| Requirement | How it is met |
|---|---|
| 1.3.1 Info and Relationships | Semantic `<p>` in normal flow; emphasis via `<strong>`, not a CSS class or colour |
| 1.4.1 Use of Colour | Emphasis conveyed by font weight and the literal word "note" |
| 1.4.3 Contrast | Inherits `govuk-body` — #0b0c0c on white, 19.4:1 |
| 1.4.4 / 1.4.10 | Standard GOV.UK responsive typography; no fixed widths, no custom CSS |
| 2.1.1 Keyboard | No interactive element added; no new tab stops |
| 2.4.6 Headings and Labels | No heading added; existing hierarchy preserved |
| 4.1.2 Name, Role, Value | Static text; no ARIA required |

- **No `role="alert"`, `aria-live` or `role="status"`.** The content is present on initial
  load and never changes. A live region would be ignored at best, or interrupt the user's
  reading of the heading at worst. Adding one would be a defect.
- Announced in reading order between the FaCT paragraph and the list-intro / no-lists
  sentence — the same order a sighted user reads it.
- Most screen readers do not audibly change tone for `<strong>`. Acceptable: the phrase
  "Please note:" carries the meaning in the text itself, so nothing is lost.
- The Welsh page already sets `lang="cy"` via the base template, so the Welsh advisory is
  pronounced with Welsh phonetics.
- Placing the advisory **before** the discouraging "no lists" statement is the whole point
  of the ticket and must be preserved.
- Progressive enhancement: static server-rendered HTML; works with JS and CSS disabled.

## 9. Out of scope

- SJP list pages themselves (`sjp-public-list`, `sjp-press-list`).
- The verified-user account-home SJP tile.
- Making the advisory admin-editable via `location_metadata`.
- Fixing the upstream BST trigger-time inconsistency at source.
- Refactoring the four other `locationId=9` literals.

## 10. CLARIFICATIONS NEEDED

1. **Should the advisory display all year round, or only during BST / only before
   10:15am?** The problem statement cites BST as the trigger, but the AC states the
   message unconditionally with no time or date condition. **Recommendation: always-on.**
   It is accurate year-round (lists are still published up until 10:15am in GMT), and
   conditional display would mean the page reads differently for two users minutes apart
   — harder to support, and it introduces timezone logic for no user benefit. This plan
   assumes always-on; confirm before build, because a time-conditional variant is a
   materially different implementation.

2. **Is `location_metadata.cautionMessage` currently populated for location 9 on STG?**
   If it is, the page will show two stacked advisory blocks. Someone with STG access
   should check and clear or reconcile it before release — the AC placement would be met
   but the page would read poorly.

3. **Does "the SJP venue" mean only `locationId: 9` (Single Justice Procedure), or every
   venue in the Magistrates Court sub-jurisdiction (`subJurisdictionId: 7`, which also
   includes e.g. Birmingham Magistrates' Court, `locationId: 12`)?** This plan assumes
   location 9 only.

4. **Has the Welsh copy been through Welsh Language Unit assurance?** It was supplied in
   the ticket rather than via the usual translation route. Specifically: the
   "Weithdrefn Un Ynad (SJP)" expansion (absent from the English), and the mutation in
   `gwrandawiadau'r`. Also confirm that bolding `Sylwer:` is the correct Welsh equivalent
   of bolding `Please note:`.

5. **Is the 10:15am cut-off expected to change?** If yes, or if similar advisories are
   wanted for other venues, the right long-term shape is a generic per-location advisory
   field in `location_metadata` with English and Welsh columns, managed at
   `/location-metadata-manage`. That is a larger change than this ticket asks for — raise
   as a follow-up rather than pre-building it.
