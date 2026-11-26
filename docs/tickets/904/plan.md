# #904 — CFT Lists Important Information Text Issue — Technical Plan

Two defects across three CFT list types (Civil Daily Cause List, Family Daily Cause List,
Civil and Family Daily Cause List), affecting both the web "Style Guide" page and the
generated PDF:

- **Bug 1** — the Important Information (open justice) paragraph merges the **JSON venue
  name** instead of the **location name** resolved from the `location` table.
- **Bug 2** — **Town** and **County** from the JSON payload must not be displayed on the
  web page or in the PDF (they must still be accepted by the JSON schema).

**TEMPLATE SOURCE: n/a** — this is a bug fix to existing rendering and PDF output, not a
new page or list-type view, so no pip-frontend migration.

---

## 1. Technical Approach

### Bug 1 — merge the resolved location name

The correct value is already computed in the shared renderer and then discarded.

`libs/list-types/daily-cause-list-common/src/rendering/renderer.ts`

- Line 165–166 resolves the display name correctly and is locale-aware:
  ```ts
  const location = await getLocationById(Number.parseInt(options.locationId, 10));
  const locationName = options.locale === "cy" && location?.welshName ? location.welshName : location?.name || jsonData.venue.venueName;
  ```
- Line 168–173 uses it for `header.locationName` (which is why the `<h1>`/`<h2>` heading is
  already correct).
- Line 175–179 ignores it:
  ```ts
  const openJustice = {
    venueName: jsonData.venue.venueName,   // line 176 — the bug
    ...
  };
  ```

`openJustice.venueName` is the first argument to the `openJusticeContact(venueName, email, phone)`
locale function in all three web templates and all three PDF templates. Feeding
`locationName` in at line 176 fixes the web page and the PDF for all three list types with
a one-line change, and inherits the existing Welsh handling and the existing
`jsonData.venue.venueName` fallback for unknown locations.

**Decision — keep the `venueName` key, do not rename it.** The key is consumed by six
templates plus COP's four (see §1.3) and by ET renderers that build their own `openJustice`
object. Renaming would spread an unrelated churn across templates and their tests for no
user-visible benefit. A short `why` comment records that the value is the resolved location
name. (Rename raised in §5.)

### Bug 2 — stop displaying Town and County

Town/county reach the rendered output through **two independent paths**:

**Path A — venue header address** (both web and PDF, all three lists)

`formatAddress()` in the shared renderer (lines 41–67) builds `header.addressLines` from
`jsonData.venue.venueAddress`, pushing `line[]`, then `town` (lines 54–56), then `county`
(lines 58–60), then `postCode`. Every template then loops `header.addressLines` blindly:

| Template | Header address loop |
| --- | --- |
| `apps/web/src/pages/(list-types)/civil-daily-cause-list/civil-daily-cause-list.njk` | line 29 |
| `apps/web/src/pages/(list-types)/family-daily-cause-list/family-daily-cause-list.njk` | line 35 |
| `apps/web/src/pages/(list-types)/civil-and-family-daily-cause-list/civil-and-family-daily-cause-list.njk` | line 33 |
| `libs/list-types/civil-daily-cause-list/src/pdf/pdf-template.njk` | line 14 |
| `libs/list-types/family-daily-cause-list/src/pdf/pdf-template.njk` | line 14 |
| `libs/list-types/civil-and-family-daily-cause-list/src/pdf/pdf-template.njk` | line 16 |

Because the templates are dumb loops, **the change belongs in `formatAddress`** — one edit
fixes six templates. Doing it in the templates instead would mean six near-identical
conditional loops and would leave `header.addressLines` carrying data nobody may display.

`formatAddress` is module-private (not exported from `index.ts`) and is only ever called
with `jsonData.venue.venueAddress` (line 170). `et-daily-list` and `et-fortnightly-list`
have their own separate copies of `formatAddress` and are unaffected.

**Path B — per-court-house address blocks** (both web and PDF, all three lists)

Each template renders `courtHouse.courtHouseAddress.town` / `.county` directly from
`listData`, bypassing `formatAddress` entirely:

| Template | town block | county block |
| --- | --- | --- |
| `civil-daily-cause-list.njk` (web) | 76–78 | 79–81 |
| `family-daily-cause-list.njk` (web) | 82–84 | 85–87 |
| `civil-and-family-daily-cause-list.njk` (web) | 79–81 | 82–84 |
| `civil-daily-cause-list/src/pdf/pdf-template.njk` | 41 | 42 |
| `family-daily-cause-list/src/pdf/pdf-template.njk` | 41 | 42 |
| `civil-and-family-daily-cause-list/src/pdf/pdf-template.njk` | 43 | 44 |

The ticket says "the Town and County values received in the JSON payload should not be
displayed" — both paths are values received in the JSON payload, so the plan removes both.
**This is the one scope judgement in the plan and is raised for confirmation in §5**; the
Path B edits are isolated in their own task so they can be dropped without touching Path A.

### 1.3 Shared-renderer blast radius — COP

`@hmcts/daily-cause-list-common` is a dependency of **four** packages: the three in scope
plus `cop-daily-cause-list`, which the ticket does not mention. Verified impact:

- **Bug 1 — COP already behaves correctly and is unaffected.**
  `libs/list-types/cop-daily-cause-list/src/rendering/renderer.ts` lines 59–65 already
  override the shared value:
  ```ts
  openJustice: { ...rendered.openJustice, venueName: rendered.header.locationName }
  ```
  After the shared fix, that override computes exactly the value the shared renderer now
  supplies, so COP's rendered output does not change at all. The override becomes redundant.
- **Bug 2 — COP renders no address, so it is unaffected.**
  `apps/web/src/pages/(list-types)/cop-daily-cause-list/cop-daily-cause-list.njk` and
  `libs/list-types/cop-daily-cause-list/src/pdf/pdf-template.njk` never reference
  `header.addressLines`, and neither renders `courtHouse.courtHouseAddress`. The
  `formatAddress` change alters data COP never displays.

**Recommendation: make the fix in the shared renderer.** COP has zero behaviour change, so
there is no need to scope the change to only the three named lists (and scoping it — e.g. by
adding a flag or duplicating the renderer — would add complexity for no benefit).

### 1.4 Other list types with a similar defect — noted, NOT in scope

Same `openJustice.venueName: jsonData.venue.venueName` shape, but each has its own renderer
and is untouched by this change:

- `libs/list-types/et-daily-list/src/rendering/renderer.ts:24`
- `libs/list-types/et-fortnightly-list/src/rendering/renderer.ts:114`
- `libs/list-types/iac-daily-list/src/rendering/renderer.ts:76` (`header.venueName`, not
  `openJustice`)

ET lists are region-level (their header shows `regionName`, not a location name), so whether
"venue" is even wrong there is a content question, not obviously the same bug. Raised in §5;
no code change proposed.

### 1.5 Schema and types unchanged

`town` and `county` remain optional properties in all three schemas — for example
`libs/list-types/civil-daily-cause-list/src/schemas/civil-daily-cause-list.json` lines 19–33
define them inside `$defs.address.properties` with **no `required` entry**. They also remain
on the shared types (`libs/list-types/common/src/models/cause-list-types.ts` lines 51–56 and
68–73). Payloads containing town/county continue to validate and upload successfully; the
values are simply not displayed. **No schema, validator or model change, and therefore no
new `json-validator` work under CLAUDE.md item 6.**

### 1.6 No database, API or route changes

No Prisma schema change, no migration, no new API endpoint, no new page, no new module, no
root `tsconfig.json` path registration, no app registration in `apps/web/src/app.ts` or
`vite.config.ts`.

---

## 2. Implementation Details

### 2.1 `libs/list-types/daily-cause-list-common/src/rendering/renderer.ts` (both bugs)

1. **Bug 2 / Path A** — in `formatAddress` (lines 41–67), delete the `town` block
   (lines 54–56) and the `county` block (lines 58–60). Result: `addressLines` = non-empty
   `line[]` entries followed by `postCode`. Keep the `!address` guard (lines 44–46) and the
   empty-string filtering, so behaviour for missing/partial addresses is unchanged.
2. **Bug 1** — at line 176 replace `venueName: jsonData.venue.venueName` with
   `venueName: locationName`, with a one-line comment explaining *why* (the open justice
   statement must name the court from the `location` table, not the JSON venue), matching
   CLAUDE.md's "comments explain why, not what".

No signature changes; `renderCauseListData` returns the same shape, so
`createCauseListRender` (`apps/web/src/pages/(list-types)/list-type-handler.ts` lines 225–236)
and `generateDailyCauseListPdf`
(`libs/list-types/daily-cause-list-common/src/pdf/pdf-generator.ts`) need no edits.

### 2.2 `libs/list-types/cop-daily-cause-list/src/rendering/renderer.ts`

Remove the now-redundant `openJustice` override (lines 59–65) and its comment, leaving
`header` augmentation intact. This is dead-code removal with no behaviour change; see §5 if
reviewers prefer to leave COP entirely untouched.

### 2.3 Web templates — remove court-house town/county (Bug 2 / Path B)

- `apps/web/src/pages/(list-types)/civil-daily-cause-list/civil-daily-cause-list.njk` — delete lines 76–81
- `apps/web/src/pages/(list-types)/family-daily-cause-list/family-daily-cause-list.njk` — delete lines 82–87
- `apps/web/src/pages/(list-types)/civil-and-family-daily-cause-list/civil-and-family-daily-cause-list.njk` — delete lines 79–84

Keep the surrounding `{% if courtHouse.courtHouseAddress %}` guard, the `line[]` loop and the
`postCode` block, so a court house with only town/county still renders its name and an empty
address area without markup errors.

### 2.4 PDF templates — remove court-house town/county (Bug 2 / Path B)

- `libs/list-types/civil-daily-cause-list/src/pdf/pdf-template.njk` — delete lines 41–42
- `libs/list-types/family-daily-cause-list/src/pdf/pdf-template.njk` — delete lines 41–42
- `libs/list-types/civil-and-family-daily-cause-list/src/pdf/pdf-template.njk` — delete lines 43–44

These `.njk` files are copied to `dist/pdf` by each package's `build:pdf-templates` script,
so no build-config change is needed.

### 2.5 Test changes

**A. Update — `libs/list-types/daily-cause-list-common/src/rendering/renderer.test.ts`**

- Line 46 currently asserts town and county are present:
  ```ts
  expect(result.header.addressLines).toEqual(["St Aldate's", "Oxford", "Oxfordshire", "OX1 1TL"]);
  ```
  Change to `["St Aldate's", "OX1 1TL"]`. Keep `town`/`county` in the input fixture
  (lines 25–30) — the point of the test is that supplied values are *not* emitted.
- Line 88 (`openJustice.venueName` is `"Oxford Combined Court Centre"`) still passes because
  `getLocationById` is mocked to `undefined` in that test, so `locationName` falls back to
  the JSON venue name. Keep it as the fallback assertion and rename it to say so.

New assertions required in the same file (all with `getLocationById` mocked, AAA style):

- `openJustice.venueName` is the **location name** when the location resolves and its `name`
  differs from `jsonData.venue.venueName` (this is the regression test for Bug 1 — it must
  fail before the fix).
- `openJustice.venueName` is the **Welsh** location name when `locale: "cy"` and
  `welshName` is set, proving locale-awareness is preserved.
- `openJustice.venueName` equals `header.locationName` in both `en` and `cy` (the two must
  never diverge again).
- `header.addressLines` excludes `town` and `county` when both are supplied.
- `header.addressLines` is `["Line 1", "AB1 2CD"]` when only `line` + `postCode` are
  supplied (unchanged behaviour).
- Existing "no address" test (lines 51–66) stays as-is.

**B. Update — web template tests (Cheerio structural assertions, no raw HTML matching)**

Each of these currently asserts town and county **are** rendered in the court-house block and
must be inverted:

- `apps/web/src/pages/(list-types)/civil-daily-cause-list/civil-daily-cause-list.njk.test.ts`
  — `describe("Court house details")` lines 171–205; the fixture at line 176 supplies
  `town: "London", county: "Greater London"` and line 188 asserts
  `["1 Court Street", "Building B", "London", "Greater London", "SW1A 1AA"]` → must become
  `["1 Court Street", "Building B", "SW1A 1AA"]`. The "omit the county paragraph when a
  partial address is provided" test (line 191) needs its expectation and name updating
  (`["2 Branch Road", "M1 1AA"]`).
- `apps/web/src/pages/(list-types)/family-daily-cause-list/family-daily-cause-list.njk.test.ts`
  — `describe("Court house address")` lines 238–274 (assertions at 254 and 257–272).
- `apps/web/src/pages/(list-types)/civil-and-family-daily-cause-list/civil-and-family-daily-cause-list.njk.test.ts`
  — `describe("Court house address variations")` lines 195–228 (assertions at 207 and
  212–226).

New assertions in each of the three web template tests:

- Court-house `town`/`county` supplied in the fixture do **not** appear in the rendered
  court-house block: assert the paragraph list equals lines + postcode, and assert
  `$("#court-lists-container").text()` does not contain the town/county values.
- The header address paragraph renders exactly the `header.addressLines` passed in (unchanged
  behaviour — the loop is dumb; town/county suppression is proven at renderer level, not here).
- The important-information `<details>` block renders the open justice contact sentence
  containing the value passed as `openJustice.venueName`, in English **and** Welsh
  (`t = cy`), asserting on the `details.govuk-details` element text rather than raw HTML.
  The family test already checks the English case at line 218 (`"Test Family Venue"`); civil
  and civil-and-family need an equivalent.

**C. New — PDF template tests (currently none exist for any PDF template)**

Add `pdf-template.njk.test.ts` next to each PDF template:

- `libs/list-types/civil-daily-cause-list/src/pdf/pdf-template.njk.test.ts`
- `libs/list-types/family-daily-cause-list/src/pdf/pdf-template.njk.test.ts`
- `libs/list-types/civil-and-family-daily-cause-list/src/pdf/pdf-template.njk.test.ts`

Using `createTestEnvironment([__dirname])` and `render` from `@hmcts/test-support` (isolated
environment per file — never `nunjucks.configure()`), asserting with Cheerio:

- the info box renders the open justice sentence containing the supplied
  `openJustice.venueName` (Bug 1 coverage for the PDF path), in `en` and `cy`;
- `.header-section .address` renders exactly the supplied `header.addressLines`;
- a court house whose `courtHouseAddress` includes `town` and `county` renders neither in
  `.court-section .address`, while `line[]` and `postCode` still render (Bug 2 coverage for
  the PDF path);
- locale-key parity is already covered by the web template tests, so do not duplicate it.

These tests require `"@hmcts/test-support": "workspace:*"` as a **devDependency** in the
three list-type packages (no lib currently depends on it). Infer Cheerio types from
`render`'s return value rather than importing `cheerio` directly, so no `cheerio` dependency
needs adding. The root `vitest.config.ts` uses default includes, so `*.njk.test.ts` is picked
up with no config change.

**D. Update — `libs/list-types/cop-daily-cause-list/src/rendering/renderer.test.ts`**

Only if §2.2 is done. That file mocks `@hmcts/daily-cause-list-common`, so it is unaffected
by the shared renderer change itself. Removing COP's override makes the test at lines 82–88
(`openJustice.venueName` is `"Regional COP Court"` while the mock returns `"Region Venue"`)
fail; it must be rewritten to assert COP passes the shared `openJustice` through unchanged.

**E. No change needed**

- `libs/list-types/daily-cause-list-common/src/pdf/pdf-generator.test.ts` — mocks
  `renderCauseListData`; its `mockRenderedData.header.addressLines` at line 34 is a fixture,
  not an assertion about `formatAddress`.
- The three packages' `pdf-generator.test.ts` files — they mock
  `generateDailyCauseListPdf` and only assert provenance-label plumbing.
- `apps/web/src/pages/(list-types)/*/index.test.ts` for the three lists — they mock the
  renderer and only assert that `openJustice` is passed to `res.render`.
- No E2E test covers these three list-type pages, so no `e2e-tests/` change.

### 2.6 Welsh verification

- `locationName` (renderer line 166) already prefers `location.welshName` when
  `options.locale === "cy"`; assigning it to `openJustice.venueName` inherits that. Verified
  by the new `cy` renderer test using a mocked location with a `welshName`.
- The Welsh sentence template `cy.openJusticeContact(venueName, email, phone)` exists in all
  three packages' `src/locales/cy.ts` (e.g. `libs/list-types/civil-daily-cause-list/src/locales/cy.ts`
  line 9) and interpolates the same first argument — **no locale file change is needed for
  either bug**, and no new translated strings are introduced.
- Manual check: load each of the three list pages with `?lng=cy` and confirm the Welsh
  sentence names the Welsh location name, and that neither the venue header nor the court
  house blocks show town/county.

---

## 3. Error Handling & Edge Cases

| Case | Behaviour after the fix |
| --- | --- |
| Location not found for `artefact.locationId` (`getLocationById` → `undefined`) | `locationName` falls back to `jsonData.venue.venueName`, so the open justice sentence reads exactly as it does today. No new failure mode. |
| `locale: "cy"` but the location has no `welshName` | Falls back to `location.name`, then to `jsonData.venue.venueName`. Unchanged. |
| Non-numeric `locationId` | `Number.parseInt` yields `NaN` and `getLocationById(NaN)` behaves exactly as it does today; any thrown error is still caught by the existing `list-type-handler` / `createPdfErrorResult` paths. Not changed by this ticket. |
| `venueAddress` absent | `formatAddress` returns `[]` (guard at lines 44–46); the header address paragraph renders empty. Unchanged, covered by the existing test at lines 51–66. |
| `venueAddress` with **only** town/county (no `line`, no `postCode`) | `addressLines` is now `[]` and the header address paragraph is empty. This is the intended consequence of Bug 2 — the payload still validates. |
| `courtHouseAddress` with only town/county | The `{% if courtHouse.courtHouseAddress %}` guard still passes, so the court house name renders with an empty address area. Add a template test for this shape in both web and PDF. |
| Payload supplies town/county | Still schema-valid (optional properties), still stored, simply not rendered. No upload or validation regression. |
| Empty-string address lines | Existing `line.length > 0` filtering (web templates use `{% if line | length %}`) is untouched. |

---

## 4. Acceptance Criteria Mapping

| # | Criterion (from ticket) | How it is satisfied | How it is verified |
| --- | --- | --- | --- |
| 1 | Important Information text merges the **location name**, not the JSON venue name — web page, all three list types | `renderer.ts` line 176 supplies `locationName` to `openJustice.venueName`, which every web template already passes to `t.openJusticeContact(...)` | New renderer test asserting `openJustice.venueName === header.locationName` and equals the mocked location `name`; web template tests asserting the `<details>` block contains the supplied name; manual check of each of the three pages |
| 2 | Same fix in the generated **PDF**, all three list types | The same `renderCauseListData` feeds `generateDailyCauseListPdf`, which passes `openJustice` to each package's `pdf-template.njk` (civil line 26, family line 26, civil-and-family line 28) | New `pdf-template.njk.test.ts` per package asserting the info-box sentence contains the supplied name; manual PDF download per list type |
| 3 | Sentence reads as specified, e.g. "…taking place at **Barnet Civil and Family Courts Centre** should be made in good time direct to: `<email>` or by calling `<phone>`" | Sentence wording is unchanged (`en.openJusticeContact`); only the first argument changes | Renderer + template tests above; the wording itself is asserted through the locale function, not hardcoded in tests |
| 4 | **Town** not displayed — web page and PDF, all three list types | `formatAddress` no longer emits `town` (Path A); court-house `town` blocks removed from three web and three PDF templates (Path B) | Renderer test asserting `addressLines` excludes town; web and PDF template tests asserting the supplied town string is absent from the court-house block |
| 5 | **County** not displayed — web page and PDF, all three list types | `formatAddress` no longer emits `county`; court-house `county` blocks removed from the same six templates | As above for county |
| 6 | Town/County still accepted by the JSON schema (no validation failure) | No schema, validator or model change — both remain optional properties (`civil-daily-cause-list.json` lines 19–33) | Existing `json-validator.test.ts` suites in the three packages continue to pass unchanged; renderer/template test fixtures deliberately still supply town and county |
| 7 | Welsh output correct for both fixes | `locationName` is already locale-aware; no locale strings change | New `cy` renderer test with a mocked `welshName`; Welsh assertions in web and PDF template tests; manual `?lng=cy` check |
| 8 | No regression for COP or other list types | COP already overrides `openJustice.venueName` with the location name and renders no address; ET/IAC use separate renderers | COP renderer test suite; full `yarn test`; `yarn lint` |

---

## 5. CLARIFICATIONS NEEDED

1. **Does Bug 2 cover the per-court-house address blocks, or only the venue header address?**
   Town/county appear twice: in `header.addressLines` (from `venue.venueAddress`, via
   `formatAddress`) and in the per-court-house blocks rendered directly from
   `courtHouse.courtHouseAddress` in each web and PDF template. The ticket's wording ("the
   Town and County values received in the JSON payload") covers both, and the plan removes
   both. **Recommendation: remove both**, so town/county never appear anywhere on the page or
   PDF; the Path B edits (§2.3, §2.4) are isolated so they can be dropped if the intent was
   the header only. Please confirm before merge — this is the only scope judgement in the plan.

2. **COP: fix all four packages, or scope the change to the three named lists?**
   `@hmcts/daily-cause-list-common` is shared by the three CFT lists **and**
   `cop-daily-cause-list`. Investigated: COP is **already correct** for Bug 1 (it overrides
   `openJustice.venueName` with `rendered.header.locationName` at
   `cop-daily-cause-list/src/rendering/renderer.ts` lines 59–65) and displays **no address at
   all**, so the `formatAddress` change is invisible to it. **Recommendation: fix in the
   shared renderer and do not scope it** — COP's rendered output is byte-identical either
   way, and scoping would mean duplicating the renderer or adding a flag for no benefit.

3. **Remove COP's now-redundant `openJustice` override?**
   After the shared fix the override computes exactly the shared default. **Recommendation:
   remove it** (§2.2) to avoid duplicated logic drifting, accepting a small edit to
   `cop-daily-cause-list/src/rendering/renderer.test.ts` lines 82–88. Say if you would rather
   leave COP completely untouched in this PR.

4. **ET and IAC lists have the same `venueName` shape — raise separately?**
   `et-daily-list/src/rendering/renderer.ts:24` and
   `et-fortnightly-list/src/rendering/renderer.ts:114` set
   `openJustice.venueName: jsonData.venue.venueName`; `iac-daily-list/src/rendering/renderer.ts:76`
   sets `header.venueName` the same way. These use their own renderers and are untouched here.
   ET lists are region-level (their header shows `regionName`, not a location name), so it is
   not clear the same fix is even correct for them. **Recommendation: out of scope — raise a
   separate ticket** if the same content rule applies to ET/IAC. Please confirm.

5. **Should the empty-address case be tightened?**
   If a payload supplies only `town`/`county` for `venue.venueAddress`, the header address
   paragraph will render as an empty `<p class="govuk-body">`. Options: leave the empty
   element (simplest, no visual change in practice), or wrap the loop in
   `{% if header.addressLines | length %}` in the six templates. **Recommendation: leave it**
   unless design objects — real payloads always carry `line` and `postCode`, and adding six
   conditionals is churn. Confirm if an empty paragraph is unacceptable.

6. **Is a rename of `openJustice.venueName` → `openJustice.locationName` wanted?**
   The plan keeps the key and adds a `why` comment, to avoid editing eight templates and
   their tests for a bug fix. If reviewers prefer the field name to match its meaning, the
   rename touches the three CFT web templates, the three CFT PDF templates, the COP web and
   PDF templates, and the associated template tests. **Recommendation: keep the current key
   for this PR.**
