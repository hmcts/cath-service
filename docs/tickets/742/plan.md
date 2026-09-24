# Technical Plan — #742: Advisory message for SJP publishing time

## 1. Technical Approach

### Strategy

Content-only change to an existing page. No new routes, no new pages, no schema change, no new lib.

The advisory is:

1. Two new locale keys (`sjpAdvisoryPrefix`, `sjpAdvisoryMessage`) in the page's co-located `en.ts` / `cy.ts`.
2. One boolean render flag (`isSjpVenue`) computed in the existing controller from the already-parsed integer `locationId`.
3. One conditional `<p class="govuk-body">` block in the existing template.

### Why a single template insertion satisfies both AC placements

`apps/web/src/pages/(public)/summary-of-publications/index.njk` currently renders, in order:

| Line | Element | Condition |
|---|---|---|
| 8–17 | Error summary | `error` |
| 19 | `<h1>{{ title }}</h1>` | always |
| 21–23 | FaCT link paragraph | always |
| 25–27 | `cautionMessage` | `cautionMessage` |
| 29–50 | `selectListMessage` + publication list | `publications.length > 0` |
| 51–57 | `noListMessage` / `noPublicationsMessage` | else |

The gap between line 27 and line 29 sits *after* the FaCT sentence and *above* the branch that chooses between "Select the list you want to view from the link(s) below:" and "Sorry, no lists found for this court". The AC asks for the advisory above whichever of those two renders — so one insertion at that point covers both states with no duplicated markup and no per-branch conditionals.

### Architecture decisions

**Code-level content, not `location_metadata.cautionMessage`.** The `cautionMessage` field is admin-authored per environment and would meet the AC with zero code. Rejected: it is not version-controlled, has no test coverage, has no guaranteed Welsh counterpart, would be lost on any environment rebuild, and would consume the caution-message slot that exists for a different purpose.

**Bold via a real `<strong>` element, not markup inside the content string.** The prefix and body are separate keys, concatenated in the template. Nothing enters the locale files as HTML, so nothing needs the `sanitiseHtml` filter and the default Nunjucks autoescaping still applies to both strings.

> Note: the template filters `cautionMessage` and `noListMessage` through `| sanitiseHtml` (registered in `libs/web-core/src/middleware/govuk-frontend/configure-govuk.ts:68`), **not** `| safe`. The earlier `@spec` comment on the issue describes it as `| safe`, which is stale. The advisory needs neither filter.

**Plain body copy, not `govukInsetText` / `govukWarningText` / `govukNotificationBanner`.** The AC places the advisory directly above the sentence it qualifies. Inset text adds a grey left border and vertical spacing that visually detaches it; warning text implies legal consequence; a notification banner would sit above the `<h1>`, contradicting the AC placement.

**Advisory is always-on, not time- or BST-conditional.** The AC states the message unconditionally. See CLARIFICATIONS NEEDED #1.

### Resolving the two disagreements between the prior `@spec` and `@plan` comments

Both were checked against the code in this repo. The `@plan` comment is correct on both, with a nuance added to each.

#### (a) E2E test location — `@plan` is correct

`e2e-tests/tests/summary-of-publications.spec.ts` obtains every location from `createUniqueTestLocation()` (lines 258, 303, 329, 393, 438, 495, 573) and the only literal it navigates to is `locationId=999999999` (line 479, a 400-redirect case). It **never visits `locationId=9`**, so an advisory assertion added there would never find the advisory.

The SJP venue journeys are in `e2e-tests/tests/publication-authorisation.spec.ts`, which visits `/summary-of-publications?locationId=9` at lines 92, 114, 162, 219, 252, 273, 278, 288, 301, 312, 336, 369, 396, 462.

**Nuance:** the two files split the work rather than one replacing the other.

* **Advisory present** → extend the existing unauthenticated journey in `publication-authorisation.spec.ts` (line 90, `"unauthenticated user can only see PUBLIC publications and is denied access to CLASSIFIED content"`), which already visits location 9 in English (line 92) and Welsh (line 114).
* **Advisory absent on a non-SJP venue** → assert inside the existing `summary-of-publications.spec.ts` test `"should display no publications message when location has no publications"` (line 301), because its dynamic test locations are by definition not location 9. This is the natural home for the negative case; `publication-authorisation.spec.ts` has only one non-SJP location (the keyboard-nav journey, line 528).

**Further nuance:** that unauthenticated journey asserts `expect(count).toBeGreaterThan(0)` on location 9 (line 100) — location 9 always has publications in the E2E environment. The *no-lists-on-SJP* state is therefore not reachable E2E without deleting seeded data, and is covered by template and controller tests instead. Do not try to force an empty location 9 in E2E.

#### (b) `SJP_LOCATION_ID` in `libs/location` — `@plan` is correct: do not add it

Every non-test occurrence of the literal `9` as a location identifier:

| Site | Form | Can import a TS constant? |
|---|---|---|
| `apps/web/src/pages/(public)/view-option/index.ts:42` | `res.redirect("/summary-of-publications?locationId=9")` | yes |
| `apps/web/src/pages/(verified)/account-home/index.njk:22` | `href="/summary-of-publications?locationId=9"` | no (Nunjucks) |
| `libs/location/src/location-data.ts:67` | `locationId: 9` seed row — the source of truth | n/a |

A new `libs/location/src/sjp-location.ts` would therefore deduplicate exactly two TS sites (the `view-option` redirect string and the new comparison), while leaving the `.njk` href and its test assertions untouched.

**Nuance the `@plan` comment did not mention:** `apps/web/src/pages/(public)/summary-of-publications/index.test.ts:9-31` mocks `@hmcts/location` with an explicit factory exposing only `getLocationById` and `getLocationMetadataByLocationId`. Importing a new named export from that package would make it `undefined` at runtime in that test, so `locationId === SJP_LOCATION_ID` would silently evaluate `9 === undefined` → `false`, and every new advisory test would fail with a misleading message. The same trap applies to any other file that mocks `@hmcts/location` with a factory.

**Decision:** declare a module-scope constant in the controller under test:

```typescript
const SJP_LOCATION_ID = 9;
```

No new lib module, and no refactor of `view-option/index.ts` (out of scope for a content ticket, and its own test at `index.test.ts:94` asserts the literal URL). Revisit if a third TS consumer appears — noted as a follow-up, not built now.

### ID-stability check (this is not a `listTypeId` violation)

CLAUDE.md prohibits hardcoding numeric **`ListType.id`** values because that column is `@default(autoincrement())` and diverges per environment. `Location.locationId` is different and was verified:

* `libs/postgres-prisma/prisma/schema/location.prisma:70` — `locationId Int @id @map("location_id")`, **no** `@default(autoincrement())`.
* `libs/location/src/location-data.ts:67` — the value `9` is assigned explicitly alongside `name: "Single Justice Procedure"`.
* `apps/postgres/prisma/generate-seed-sql.ts:94` — seeded via `INSERT INTO location (location_id, ...) ... ON CONFLICT (location_id) DO UPDATE`.

So `9` is deterministic across local, STG and any future environment seeded from the same source, and `view-option` and `account-home` already depend on this.

`isSjpVenue` must be derived from the parsed integer `locationId`, **not** from `location.name` (locale-dependent, and admin-editable reference data).

## 2. Implementation Details

### TEMPLATE SOURCE

> n/a (this is a content/copy change to an existing page — no new rendered page or list-type view, so no pip-frontend template migration applies)

### Files changed (5 source + 3 test, all existing — no new files)

| File | Change |
|---|---|
| `apps/web/src/pages/(public)/summary-of-publications/en.ts` | add `sjpAdvisoryPrefix`, `sjpAdvisoryMessage` |
| `apps/web/src/pages/(public)/summary-of-publications/cy.ts` | add the same two keys with the Welsh copy supplied in the ticket |
| `apps/web/src/pages/(public)/summary-of-publications/index.ts` | add module-scope `SJP_LOCATION_ID`, compute `isSjpVenue`, add three keys to the render context |
| `apps/web/src/pages/(public)/summary-of-publications/index.njk` | insert the advisory block between the `cautionMessage` block and the `publications.length > 0` branch |
| `apps/web/src/pages/(public)/summary-of-publications/index.test.ts` | new advisory assertions |
| `apps/web/src/pages/(public)/summary-of-publications/index.njk.test.ts` | new advisory assertions; extend `requiredKeys` (line 211) |
| `e2e-tests/tests/publication-authorisation.spec.ts` | extend the unauthenticated location-9 journey (line 90) |
| `e2e-tests/tests/summary-of-publications.spec.ts` | assert absence in the existing no-publications test (line 301) |

No `libs/` change. No `apps/api` change. No schema change, no migration, no seed change. No new API endpoint. No CSS, no JavaScript.

### Controller

`apps/web/src/pages/(public)/summary-of-publications/index.ts` — module-scope constant next to the existing `IAC_ORDER` (CLAUDE.md module ordering: consts first), and three additions to the render context. No change to any query, filter, dedupe or sort.

```typescript
const SJP_LOCATION_ID = 9;
```

```typescript
const isSjpVenue = locationId === SJP_LOCATION_ID;

res.render("summary-of-publications/index", {
  // ...existing keys unchanged...
  isSjpVenue,
  sjpAdvisoryPrefix: t.sjpAdvisoryPrefix,
  sjpAdvisoryMessage: t.sjpAdvisoryMessage
});
```

`locationId` is already the parsed integer at line 26, so this is a plain `===` with no coercion. The flag is computed after the existing `/400` guards, so an invalid or unknown location never reaches it.

### Template

Insert between the existing `{% endif %}` at line 27 and `{% if publications.length > 0 %}` at line 29:

```njk
    {% if isSjpVenue %}
      <p class="govuk-body" id="sjp-publishing-advisory">
        <strong>{{ sjpAdvisoryPrefix }}</strong> {{ sjpAdvisoryMessage }}
      </p>
    {% endif %}
```

* `<p class="govuk-body">` — matches the surrounding body copy. Deliberately a `<p>`, not a `<div>`: the existing template tests select `$("div.govuk-body")` for the caution and no-list messages (`index.njk.test.ts:138,150`), so a `<p>` cannot collide with them.
* `id="sjp-publishing-advisory"` for stable targeting in template tests and E2E.
* No inline styles, no custom classes, no `| safe`, no `| sanitiseHtml`.

### Content

`en.ts` — verbatim from the AC, including `10:15am` with no space before the meridiem and the trailing full stop:

```typescript
sjpAdvisoryPrefix: "Please note:",
sjpAdvisoryMessage:
  "SJP hearing lists are published up until 10:15am. If no lists are currently displayed, please check again after this time."
```

`cy.ts` — the Welsh copy supplied in the ticket (do **not** use a `[WELSH TRANSLATION REQUIRED]` placeholder; the translation is provided):

```typescript
sjpAdvisoryPrefix: "Sylwer:",
sjpAdvisoryMessage:
  "Caiff rhestrau gwrandawiadau'r Weithdrefn Un Ynad (SJP) eu cyhoeddi tan 10:15am. Os nad oes unrhyw restrau yn ymddangos ar hyn o bryd, gwiriwch eto ar ôl yr amser hwn."
```

Content notes:

* Use the straight ASCII apostrophe in `gwrandawiadau'r` to match the existing style of `cy.ts` (`Mae'n ddrwg gennym`, `o'r ddolen(nau)`). The ticket renders it as U+2019; the visual output is equivalent.
* The colon lives inside `sjpAdvisoryPrefix` so it is bolded with the label, matching the AC.
* The English leaves "SJP" unexpanded while the Welsh expands it to "Weithdrefn Un Ynad (SJP)". This asymmetry is as supplied and is correct Welsh convention — do not "fix" it to match. See CLARIFICATIONS NEEDED #4.
* Two keys rather than one interpolated string keeps `Object.keys(en).sort()` equal to `Object.keys(cy).sort()`, asserted by the existing test at `index.njk.test.ts:206-208`.

### Test coverage

**Controller** (`index.test.ts`) — the existing `@hmcts/location` mock already returns location 9 and location 1, and the `prisma.artefact.findMany` mock already returns two location-9 artefacts, so no new mock scaffolding is needed except overriding `findMany` to `[]` for the empty case:

* `locationId=9` with publications → `isSjpVenue: true` plus the English prefix and message in the render context.
* `locationId=9` with an empty artefact list → `isSjpVenue: true` and the advisory strings still present.
* `locationId=1` → `isSjpVenue: false`.
* `locationId=9`, locale `cy` → Welsh prefix and message.
* `isSjpVenue: true` is unaffected by user type (unauthenticated vs. a `req.user` with a role) — `filterPublicationsForSummary` narrows the list, never the advisory.

**Template** (`index.njk.test.ts`) — add `isSjpVenue`, `sjpAdvisoryPrefix`, `sjpAdvisoryMessage` to `buildData` (defaults: `false`, `t.sjpAdvisoryPrefix`, `t.sjpAdvisoryMessage`):

* `isSjpVenue: true` → exactly one `#sjp-publishing-advisory`; its `<strong>` text is `"Please note:"`; its text contains the full sentence.
* `isSjpVenue: true`, publications empty → advisory precedes the `noPublicationsMessage` paragraph in DOM order.
* `isSjpVenue: true`, publications present → advisory precedes the `selectListMessage` paragraph in DOM order.
* `isSjpVenue: false` → `#sjp-publishing-advisory` absent, in both states.
* `cautionMessage` set and `isSjpVenue: true` → the caution `div` precedes the advisory `<p>`, and both precede the list content.
* Rendered with the `cy` objects → Welsh advisory and Welsh bold prefix present, English advisory text absent.
* Extend the `requiredKeys` array (line 211) with `sjpAdvisoryPrefix` and `sjpAdvisoryMessage`. The parity test at line 206 covers them automatically.

DOM-order assertions should compare Cheerio index positions (e.g. `$("#sjp-publishing-advisory").index()` against the target paragraph's, or `$("#sjp-publishing-advisory").nextAll(...)`), not raw HTML string offsets.

**E2E** — no new spec file and no new `test()` block:

* `publication-authorisation.spec.ts`, unauthenticated journey (line 90): after the existing English page load at line 92, assert `#sjp-publishing-advisory` is visible and its `strong` reads "Please note:"; after the existing Welsh load at line 114, assert the Welsh advisory. Add an inline `axeCheck(page).disableRules(["target-size", "link-name", "region"]).analyze()` matching the convention used elsewhere in that file (line 166).
* `summary-of-publications.spec.ts`, no-publications test (line 301): assert `#sjp-publishing-advisory` has count 0 on the dynamic non-SJP location.

## 3. Error Handling & Edge Cases

No user input is introduced, so no new validation. Existing `locationId` handling is unchanged and runs before the advisory logic:

| Condition | Behaviour |
|---|---|
| `locationId` missing | `redirect("/400")` — advisory logic never reached |
| `locationId` not parseable as an integer | `redirect("/400")` |
| Location not in the database | `redirect("/400")` |

Edge cases:

| Case | Expected |
|---|---|
| Location 9 with publications | Advisory above `selectListMessage` |
| Location 9 with no publications | Advisory above `noPublicationsMessage` |
| Location 9 with an admin `noListMessage` set | Advisory above the `noListMessage` div |
| Location 9 with an admin `cautionMessage` set | Caution first, then advisory, then list/no-list content. Two stacked advisory blocks — technically correct, reads poorly. See CLARIFICATIONS NEEDED #2 |
| Location 9 with an `error` in the render context | Error summary first, advisory still rendered; `noPublicationsMessage` suppressed by the existing `elif not error` at line 54 |
| `locationId=09` or `locationId=9abc` | `Number.parseInt` yields `9` → advisory shown. Pre-existing parsing behaviour for every other feature on this page; not changed here |
| `locationId=9` as any user type (unauthenticated, verified CFT, system admin, internal admin) | Advisory identical. No role gate |
| Welsh locale | Welsh advisory; the language toggle preserves `locationId` (covered by `libs/web-core/src/middleware/i18n/locale-middleware.test.ts:200`) so the advisory persists across the toggle |
| Other Magistrates-sub-jurisdiction venues (e.g. Birmingham Magistrates' Court, `locationId: 12`) | No advisory — see CLARIFICATIONS NEEDED #3 |
| JavaScript or CSS disabled | Static server-rendered text; unaffected |

Not in scope and must not change: `noPublicationsMessage` ("Sorry, no lists found for this court") stays as-is and is not an error message — it must not be reworded, moved into an error summary, or converted into one.

## 4. Acceptance Criteria Mapping

| AC | Implementation | Verification |
|---|---|---|
| Message reads "**Please note:** SJP hearing lists are published up until 10:15am. If no lists are currently displayed, please check again after this time." | Verbatim in `en.ts` across the two new keys | Template test asserts `<strong>` text and full sentence text; controller test asserts the strings reach the render context |
| Displayed underneath the FaCT sentence | Inserted after the FaCT paragraph (line 21–23) and after the `cautionMessage` block | Template test asserts DOM order relative to the FaCT paragraph |
| Just above "Select the list you want to view from the link(s) below:" when lists are published | Insertion point is above the `publications.length > 0` branch | Template test with a populated `publications` array asserts DOM order |
| Just above "Sorry, no lists found for this court" when none are published | Same insertion point, above the `else` branch | Template test with `publications: []` asserts DOM order |
| "Please note" is bold | `<strong>{{ sjpAdvisoryPrefix }}</strong>` | Template test asserts the text is inside `strong`, and that `strong` is the only markup in the paragraph |
| Welsh translation as supplied | `cy.ts` uses the ticket's Welsh, prefix `Sylwer:` bolded the same way | Template test with the `cy` objects; controller test with locale `cy`; E2E asserts on `?lng=cy`; existing parity test covers key symmetry |
| Shown on the SJP venue only (implicit) | `isSjpVenue` gate on `locationId === 9` | Controller test for `locationId=1` → `false`; template test for `isSjpVenue: false` → absent; E2E asserts absence on a dynamic non-SJP location |
| No accessibility regression (mandatory, WCAG 2.2 AA) | Semantic `<p>` + `<strong>`, no ARIA, no live region, no colour-only meaning, inherits `govuk-body` contrast, adds no tab stop | Inline `axeCheck` in the extended E2E journey, English and Welsh |

Accessibility specifics worth stating explicitly, because they are easy to get wrong:

* **No `role="alert"`, `aria-live` or `role="status"`.** The content is present on initial load and never changes. A live region would be ignored at best and would interrupt the user's reading of the heading at worst.
* `<strong>` not `<b>`, for semantic emphasis. Most screen readers do not change tone for `<strong>`; acceptable here because the words "Please note" carry the meaning, so nothing is lost.
* No heading is added, so the existing `h1` → content hierarchy is preserved.
* Placement before the discouraging "no lists" sentence is the entire point of the ticket and must be preserved.

## 5. CLARIFICATIONS NEEDED

1. **Should the advisory show all year round, or only during BST / only before 10:15am?** The problem statement cites BST as the trigger, but the AC states the message unconditionally with no time or date condition. **Recommendation: always-on.** It is accurate year-round (lists are still published up until 10:15am under GMT), and time-conditional display would make the page read differently for two users minutes apart — harder to support, and it introduces timezone logic for no user benefit. This plan assumes always-on; a time-conditional variant is a materially different build and would need re-planning.

2. **Is `location_metadata.cautionMessage` currently populated for location 9 on STG?** If it is, the page will show two stacked advisory blocks. The AC placement is still met, but the page reads badly. Someone with STG access should check and clear or reconcile it before release.

3. **Does "the SJP venue" mean only `locationId: 9` (Single Justice Procedure), or every venue in the Magistrates Court sub-jurisdiction (`subJurisdictionId: 7`)?** That sub-jurisdiction also covers e.g. Birmingham Magistrates' Court (`locationId: 12`). This plan assumes location 9 only. If it means the whole sub-jurisdiction, the gate changes from an ID comparison to a sub-jurisdiction lookup and the controller would need `getLocationWithDetails` rather than `getLocationById`.

4. **Has the Welsh copy been through Welsh Language Unit assurance?** It was supplied in the ticket rather than via the usual translation route. Specifically: the Welsh expands SJP to "Weithdrefn Un Ynad (SJP)" while the English leaves it unexpanded (treated as intentional and not "corrected"); the mutation in `gwrandawiadau'r`; and whether bolding `Sylwer:` is the right Welsh equivalent of bolding `Please note:`.

5. **Is the 10:15am cut-off expected to change, or are similar advisories wanted for other venues?** If either is likely, the right long-term shape is a generic per-location advisory field in `location_metadata` with English and Welsh columns, managed at `/location-metadata-manage`. That is larger than this ticket and should be a follow-up rather than pre-built — but knowing now would change whether this hardcoded copy is acceptable.

6. **Follow-up, not a blocker:** if a third TypeScript consumer of the SJP location ID appears, promote the controller constant to `libs/location`. Doing it now would deduplicate only two call sites, cannot help the two `.njk` hrefs, and would require updating the `@hmcts/location` mock factories in the affected test files.

Outside this ticket's scope but worth flagging: the advisory is a workaround for an upstream scheduling inconsistency. A message telling users the feed is late is weaker than the feed not being late — worth raising with the team owning the SJP trigger.
