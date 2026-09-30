# Technical Plan — Issue #1110: Update to the 'no published lists' message

## 1. Technical Approach

This is a **two-string content change plus test updates**. Nothing else.

- No new module, no new lib, no new page, no new route.
- No Prisma schema change, no migration, no seed data change.
- No new component, no template structure change, no controller logic change.
- No new locale key — only the *value* of the existing `noPublicationsMessage` key changes in `en.ts` and `cy.ts`. Locale key parity is preserved by construction.

The message is already wired correctly: the controller selects the locale object (`const t = locale === "cy" ? cy : en`) and passes `t.noPublicationsMessage` into the template, which renders it as plain body copy. Changing the two string values is sufficient to change what users see in both languages.

### Presentation decision — keep it plain body copy

The message stays exactly as it is today:

```njk
<p class="govuk-body">{{ noPublicationsMessage }}</p>
```

"There are no lists available for this court or tribunal today." is a **statement of fact**, not an error and not a system failure. Therefore:

- No `govukErrorSummary` — there is no problem for the user to fix.
- No `govukWarningText` — nothing hazardous or legally consequential.
- No `govukInsetText` / `govukNotificationBanner` / `govukPanel` — the message is the primary content of the page body at this point, not an aside or a transaction outcome.
- No `role="status"` / `aria-live` — the text is present on initial server render, not injected dynamically. Adding a live region would cause a spurious screen-reader announcement.

The whole point of the ticket is to *remove* the apologetic, failure-flavoured framing ("Sorry… not found"). Escalating the visual treatment would reintroduce exactly the tone the user inclusion team asked us to drop.

### Key considerations

- **The approved copy must be used verbatim.** The wording was signed off by the user inclusion team. Do not paraphrase, do not re-translate, do not add a `[WELSH TRANSLATION REQUIRED]` placeholder — the issue supplies the approved Welsh string.
- **Copy should live in one place.** The controller unit test currently duplicates the English literal. Change it to assert against the imported `en` object so a future copy change touches one file, not two.
- **Accessibility is unaffected** because no markup changes. The existing inline axe scan in the E2E empty-state test continues to cover it. Do **not** add new axe rule exclusions; a new violation would be a real defect.
- **Reading level.** New English copy is one short clause, plain English, no jargon — comfortably within the GDS reading-age target. "court or tribunal" matches the service name ("Court and tribunal hearings") and the FaCT link copy already on the same page, so it is consistent with its surroundings.

## 2. Implementation Details

**TEMPLATE SOURCE: n/a** — content-only change; no new page or list-type view, so there is no template to migrate from pip-frontend.

### Files to change

#### 1. `apps/web/src/pages/(public)/summary-of-publications/en.ts` (line 4)

Before:
```typescript
noPublicationsMessage: "Sorry, no lists found for this court",
```

After:
```typescript
noPublicationsMessage: "There are no lists available for this court or tribunal today.",
```

#### 2. `apps/web/src/pages/(public)/summary-of-publications/cy.ts` (line 4)

Before:
```typescript
noPublicationsMessage: "Mae'n ddrwg gennym, nid ydym wedi dod o hyd i unrhyw restrau i'r llys hwn",
```

After:
```typescript
noPublicationsMessage: "Nid oes unrhyw restrau ar gael ar gyfer y llys na'r tribiwnlys hwn heddiw",
```

The Welsh string is taken from the issue acceptance criteria (approved by the user inclusion team). The apostrophe in `na'r` is written as a **straight** apostrophe (`'`, U+0027) to match every other apostrophe in `cy.ts` (`Mae'n`, `o'r`, `ydynt wedi'u`). See Clarification (b).

#### 3. `apps/web/src/pages/(public)/summary-of-publications/index.test.ts` (line 211)

Before:
```typescript
expect(renderCall.noPublicationsMessage).toBe("Sorry, no lists found for this court");
```

After — assert against the imported content object so the copy is defined in exactly one place:
```typescript
expect(renderCall.noPublicationsMessage).toBe(en.noPublicationsMessage);
```

This requires adding `import { en } from "./en.js";` to the test file's imports (note the `.js` extension — required by nodenext resolution). The test name ("should render empty state when no publications found for location") is unchanged.

Optionally add the mirror assertion in the existing `describe("Welsh locale")` block asserting `renderCall.noPublicationsMessage === cy.noPublicationsMessage` when `locale === "cy"`, which currently has no coverage for this key. This is a one-line addition using the existing mocks and the existing `locationId: "1"` (empty) fixture.

#### 4. `e2e-tests/tests/summary-of-publications.spec.ts` (line 312)

In test "should display no publications message when location has no publications":

Before:
```typescript
await expect(page.getByText(/sorry, no lists found for this court/i)).toBeVisible();
```

After:
```typescript
await expect(page.getByText(/there are no lists available for this court or tribunal today/i)).toBeVisible();
```

The trailing full stop is deliberately omitted from the regex (`.` would need escaping and adds nothing to the assertion).

#### 5. `e2e-tests/tests/summary-of-publications.spec.ts` (line 446)

In test "should preserve language selection with no publications message @nightly":

Before:
```typescript
await expect(page.getByText(/mae'n ddrwg gennym, nid ydym wedi dod o hyd i unrhyw restrau/i)).toBeVisible();
```

After:
```typescript
await expect(page.getByText(/nid oes unrhyw restrau ar gael ar gyfer y llys/i)).toBeVisible();
```

The regex deliberately stops before `na'r` so the apostrophe never enters the pattern. Playwright matches the rendered text node, and Nunjucks auto-escaping renders `'` as `&#39;` in the HTML source — a regex containing a literal `'` is fragile across escaping and any future curly/straight apostrophe change. Matching the unambiguous leading substring is stable and still uniquely identifies the message on the page.

#### 6. `templates/tech-spec-references/welsh-translations-catalogue.json` (line 356)

Remove the stale entry:
```json
"Sorry, no lists found for this court": "Mae'n ddrwg gennym, nid ydym wedi dod o hyd i unrhyw restrau i'r llys hwn",
```

Add the new entry. The file is alphabetically ordered, so it belongs immediately **before** `"There are no matching results."` (currently line 396):
```json
"There are no lists available for this court or tribunal today.": "Nid oes unrhyw restrau ar gael ar gyfer y llys na'r tribiwnlys hwn heddiw",
```

This file is a spec-generation reference with **no runtime effect**. It is updated only so future auto-generated tech specs resolve the correct translation rather than the stale one.

### Files that need NO change, and why

| File | Why no change |
|---|---|
| `apps/web/src/pages/(public)/summary-of-publications/index.njk` | Renders `{{ noPublicationsMessage }}` — value-agnostic. Markup, precedence and classes are all correct as-is. |
| `apps/web/src/pages/(public)/summary-of-publications/index.ts` | Line 137 passes `t.noPublicationsMessage`. Locale selection and render payload are already correct. |
| `apps/web/src/pages/(public)/summary-of-publications/index.njk.test.ts` | Already asserts via `en.noPublicationsMessage` / `cy.noPublicationsMessage` (lines 73, 83, 130, 174) with **no literal strings**, and has a locale-key-parity test at line 211. It will pass unchanged and will automatically cover the new copy. This is the pattern the controller test is being brought in line with. |
| `requirements/migrations/011_reconcile_board_2026_07_29.sql`, `012_reconcile_board_2026_08_04.sql` | **MUST NOT be edited.** Historical, immutable dumps of past board state. They legitimately still contain the old string. Exclude them from the grep guard. |
| `location_metadata` rows (`no_list_message`, `welsh_no_list_message`) | Admin-authored free text. No backfill, no migration. See Clarification (c). |

### Explicitly out of scope

- **Admin-facing "No publications found…" strings** on `blob-explorer-locations`, `blob-explorer-publications` and `remove-list-search-results`. These are internal admin/system-admin tools with a different audience and a different meaning (a data-search result count, not a public "nothing is published today" statement). They are **not** the public 'no published lists' message and are not changed by this ticket. See Clarification (d).
- The precedence between `noListMessage` and `noPublicationsMessage` — unchanged.
- Venue-specific `no_list_message` metadata content — unchanged.
- Any feature flag or phased rollout — this ships as an ordinary copy change with the next release.

## 3. Error Handling & Edge Cases

The default message is a **fallback**, third in a chain of three mutually exclusive presentations. The template logic (`index.njk:51-57`, inside the `{% else %}` branch of the `publications.length > 0` check) is unchanged:

```njk
{% if noListMessage %}
  <div class="govuk-body">{{ noListMessage | sanitiseHtml }}</div>
{% elif not error %}
  <p class="govuk-body">{{ noPublicationsMessage }}</p>
{% endif %}
```

| Condition | What renders | Changed? |
|---|---|---|
| `publications.length > 0` | `selectListMessage` + list of links. Neither old nor new empty-state message appears. | No |
| Empty **and** venue has `noListMessage` (from `location_metadata`, locale-selected in `index.ts:131`) | Only the venue-specific message, HTML-sanitised. The new default is **suppressed**. | No |
| Empty, no `noListMessage`, `error` set | Only the `govukErrorSummary` ("There is a problem"). The default message is **suppressed** by `{% elif not error %}`. | No |
| Empty, no `noListMessage`, no `error` | The new default message as plain `<p class="govuk-body">`. | **Value only** |

### Edge cases

- **Venues with bespoke metadata messages keep their old apologetic wording.** Any venue whose admin has authored a `no_list_message` will continue to show it verbatim, including any "Sorry…" phrasing. This ticket does not touch stored metadata. It is a visible inconsistency but a deliberate one — that content is owned by admins, not the codebase. Flagged as Clarification (c).
- **Access-filtered-to-empty.** `filterPublicationsForSummary` (`index.ts:64`) can reduce a non-empty artefact set to empty for a given user. Such a user sees the new default message. That is correct — from their perspective there is nothing available — and no change in behaviour.
- **`locationId` guards are untouched** (`index.ts:19-35`): missing, non-integer, or unresolvable `locationId` all `redirect("/400")` before any render. The empty-state message is therefore unreachable alongside a location error; it can only appear once a location has resolved successfully.
- **Language toggle.** The phase-banner toggle preserves `locationId` across `?lng=cy`, so both strings must be correct on the same URL. Covered by the two E2E assertions.
- **Sanitisation.** The new strings are plain text with no markup. `noPublicationsMessage` is rendered through standard Nunjucks auto-escaping (unlike `noListMessage`, which goes through `sanitiseHtml` because it is admin-authored HTML). The Welsh apostrophe will be escaped to `&#39;` in the HTML source and displayed correctly — which is why the E2E regex avoids it.

## 4. Acceptance Criteria Mapping

| AC | How satisfied | How verified |
|---|---|---|
| Message updated to "There are no lists available for this court or tribunal today." | New value in `en.ts:4`; controller and template already pass it through unchanged | Controller unit test (`index.test.ts`, "should render empty state…" asserting `en.noPublicationsMessage`); template test `index.njk.test.ts` (no edit needed); E2E English assertion at `summary-of-publications.spec.ts:312` |
| Welsh translation is the approved "Nid oes unrhyw restrau ar gael ar gyfer y llys na'r tribiwnlys hwn heddiw" | New value in `cy.ts:4`, used verbatim from the issue | Optional Welsh controller assertion; template test Welsh render; E2E Welsh assertion at `summary-of-publications.spec.ts:446` |
| Old English string no longer appears anywhere in the service | Only occurrence in shipped code is `en.ts:4`; test/E2E/catalogue duplicates all removed | Repo-wide grep guard for `Sorry, no lists found for this court` returning zero hits, **excluding `requirements/migrations/*.sql`** (immutable historical dumps) |
| Old Welsh string no longer appears | Only occurrence in shipped code is `cy.ts:4`; test/E2E/catalogue duplicates all removed | Same grep guard for `Mae'n ddrwg gennym, nid ydym wedi dod o hyd i unrhyw restrau`, same exclusion |
| Venue-specific no-list message still takes precedence | Template precedence untouched | Existing template test covering `noListMessage` present → default suppressed (`index.njk.test.ts`) |
| Pages with published lists unaffected | Template `{% if publications.length > 0 %}` branch untouched | Existing template test asserting default message absent when publications present; existing E2E populated-state test |
| Locale key parity maintained | Only an existing key's value changes; no key added or removed | Existing parity test `index.njk.test.ts:211` |
| No accessibility regression (WCAG 2.2 AA) | No markup change; still a semantic `<p class="govuk-body">` in document order with no new ARIA | Inline axe scan already inside the English empty-state E2E test (`spec.ts:322`). No new `disableRules` entries. |

## 5. CLARIFICATIONS NEEDED

**(a) Full-stop asymmetry between English and Welsh.**
The approved English copy ends with a full stop ("…today.") but the Welsh string as supplied in the acceptance criteria does not ("…heddiw"). Both are complete sentences, so punctuation would normally match.
*Recommendation:* implement **both strings verbatim as supplied** (English with the full stop, Welsh without) rather than silently "correcting" approved copy. Raise with the Service Manager / user inclusion team, and if they confirm the Welsh should also end with a full stop, that is a one-character follow-up. Do not guess.

**(b) Curly vs straight apostrophe in the Welsh string.**
The issue text uses a curly apostrophe: `na’r` (U+2019). Every existing apostrophe in `cy.ts` is a straight `'` (U+0027).
*Recommendation:* use the **straight apostrophe** (`na'r`) for file consistency and to avoid mixed encodings within a single content file. This is a typographic normalisation, not a change of wording. Confirm it is acceptable; if the team requires curly apostrophes, that is a separate, service-wide typography decision rather than something to introduce in one string.

**(c) Should per-venue `no_list_message` values in `location_metadata` be reviewed or backfilled?**
Venues with bespoke admin-authored messages will keep showing them, including any that begin "Sorry…" or that say "court" to a tribunal audience. The new wording will not reach those venues.
*Recommendation:* **leave as-is for this ticket.** That content is admin-owned free text and changing it is a data/editorial exercise, not a code change. If the user inclusion team wants those reviewed, raise it as separate work with the Service Manager (it needs a content audit, Welsh translation of each bespoke message, and an admin decision per venue).

**(d) Should the admin-facing "No publications found for this location" strings be aligned too?**
These appear on `blob-explorer-locations`, `blob-explorer-publications` and `remove-list-search-results`.
*Recommendation:* **no — out of scope.** Different audience (internal admins), different meaning (an empty search/data result, not "nothing is published today for the public"). The inclusion rationale — don't apologise, don't call a tribunal a court — does not transfer cleanly. If the team wants admin copy reviewed, raise a separate ticket.

**(e) Does "today" remain accurate if users can browse other dates in future?**
"today" is accurate for the current query (`index.ts:42-49` returns only artefacts where `displayFrom <= now <= displayTo`). If a future change adds a date picker letting users view lists for another day, "today" becomes misleading.
*Recommendation:* ship the approved copy now, and note the dependency so any future date-selection work revisits this string. No action in this ticket.
