# Plan — #892: Adopt MOJ Frontend `mojFilter` across the six hand-rolled filter panels

## 1. Technical Approach

### Strategy
Add `@ministryofjustice/frontend` as a pinned dependency and migrate all six
divergent filter panels onto the real `moj/components/filter/macro.njk`
(`mojFilter`) macro, its SCSS (`_filter.scss` + `_filter-layout.scss` object), and
its `FilterToggleButton` behaviour. This deletes four bespoke class-name dialects,
two inline `<script>` blocks, the shared `filter-panel.ts` toggle logic, and the
dead/stub rules in `sjp-filters.scss` — collapsing everything onto one component.

The change is a like-for-like behavioural migration, not a redesign. Each page
keeps its existing checkbox groups, selected-filter data and query-string routing;
only the wrapping markup, styling and JS init change.

### Architecture decisions
- **No shared partial is introduced.** `mojFilter` *is* the shared component. Each
  page calls the macro with page-specific `optionsHtml` / `selectedFilters`, exactly
  as `pip-frontend/src/main/views/alphabetical-search.njk` does. A repo-local wrapper
  partial would just duplicate the macro's own API for no gain (YAGNI).
- **Selective SCSS `@use`**, not `moj/all.scss`, to avoid pulling every MOJ component
  and to minimise collision with the GDS-rebrand overrides already in `web.scss`.
- **Single JS init path** in `apps/web/src/assets/js/web.ts`. `FilterToggleButton` is
  constructed explicitly (it is *not* part of MOJ's `initAll()`), replacing
  `initFilterPanel()`'s toggle logic and both SJP inline scripts.
- **Two distinct filter interaction models remain**, because the pages genuinely
  differ and MOJ supports both:
  - **Sidebar-always-visible** (courts-tribunals-list, location-name-search,
    jurisdiction-data-list, audit-log-list, find-users): the filter sits in a
    one-quarter/one-third column beside results. `FilterToggleButton` only governs
    the mobile show/hide overlay via `bigModeMediaQuery`.
  - **Toggle-to-reveal** (sjp-press-list, sjp-public-list): a "Show filters" button
    reveals the panel on all viewports (`startHidden: true`).

### Key technical considerations
- `govuk-frontend@6.2.0` is already installed (`apps/web/package.json:68`); MOJ
  `10.0.1` peer-depends on `govuk-frontend: ^6.0.0` — compatible. Its other peer,
  `moment`, is only used by MOJ's date-picker (not filter); yarn will warn about the
  missing peer. Do not add `moment` unless the warning proves blocking.
- The `.js-enabled` body class the MOJ mobile-overlay CSS is gated on is **already
  set** by GOV.UK Frontend's `template.njk:35` (`document.body.className += ' js-enabled'`),
  which `base-template.njk` extends. The ticket's claim that "nothing in this repo
  currently sets" it is incorrect — no extra work is needed for that class. Verify
  during implementation that MOJ's filter overlay CSS keys off `.js-enabled` and not a
  separate `.moj-js-enabled`.

## 2. Implementation Details

**TEMPLATE SOURCE:** n/a (this is a refactor adopting the existing MOJ Frontend `mojFilter` component across six existing pages — not a new rendered page or list-type view).

### File structure and organization
No new libs module. All six templates already live in `apps/web/src/pages/` and stay
there. Shared JS/SCSS live in `apps/web/src/assets/` alongside the existing
`filter-panel.ts` / `web.ts` / `web.scss`. This follows the existing composition of
frontend assets in the web app; the filter is a cross-cutting UI concern already
owned by `apps/web`, not a domain feature warranting a lib.

### Components / modules to create or modify
- **Modify** `apps/web/src/assets/js/web.ts` — construct `FilterToggleButton` (from
  `@ministryofjustice/frontend`) with the correct selectors and show/hide text; remove
  the `initFilterPanel()` toggle wiring. Keep `initSjpFilterSearch()` (the search-box
  text filter is unrelated to the toggle and still needed).
- **Reduce** `apps/web/src/assets/js/filter-panel.ts` — the jurisdiction/sub-jurisdiction
  reveal-on-check logic (lines 1–23) and collapsible-section logic (lines 25–50) are
  page behaviour MOJ does not provide. Decide per section: keep the sub-jurisdiction
  reveal (still needed by courts-tribunals-list / location-name-search); drop
  `initMobileFilterToggle()` (lines 56–85) entirely — `FilterToggleButton` replaces it.
  If nothing remains, delete the file and its `web.ts` import.
- **Delete** the two SJP inline `<script nonce>` blocks
  (`sjp-press-list.njk:259-322`, `sjp-public-list.njk:229-291`).
- **Modify** all six `.njk` templates to call `mojFilter` (see per-page notes below).
- **Modify** SCSS (see §SCSS integration).

### Dependency addition (pinned version)
Add to `apps/web/package.json` dependencies, pinned exactly per CLAUDE.md:
```
"@ministryofjustice/frontend": "10.0.1"
```
Run `yarn install`; confirm `node_modules/@ministryofjustice/frontend` exists
(currently NOT installed). Expect a yarn peer warning for `moment`.

### Nunjucks search path changes (app + test-support)
Two places must resolve `moj/components/filter/macro.njk`:
1. `libs/web-core/src/middleware/govuk-frontend/configure-govuk.ts` — add a MOJ path
   alongside `govukFrontendPath` (line 17) so it is included in `allViewPaths`
   (line 19):
   ```ts
   const mojFrontendPath = "../../node_modules/@ministryofjustice/frontend";
   const allViewPaths = [govukFrontendPath, mojFrontendPath, sharedViews, ...mergedViewPaths];
   ```
2. `libs/test-support/src/nunjucks-test-helper.ts` — mirror it in
   `createTestEnvironment` (line 24/29), or every `.njk.test.ts` that renders a
   migrated page fails to resolve the macro:
   ```ts
   const mojPath = path.join(__dirname, "../../../node_modules/@ministryofjustice/frontend");
   const loader = new nunjucks.FileSystemLoader([...modulePaths, govukPath, mojPath], { noCache: true });
   ```

### SCSS integration approach
`web.scss` is the single stylesheet `<link>` (via `web_css` in
`base-template.njk:7`). `loadPaths: ["node_modules"]` is already set
(`apps/web/vite.build.ts:56`). Add selective imports to `web.scss` after the
`govuk-frontend/dist/govuk/index` line:
```scss
@use "@ministryofjustice/frontend/moj/components/filter/filter";
@use "@ministryofjustice/frontend/moj/objects/filter-layout";
```
Validate during implementation whether MOJ's `_filter.scss` uses `@use` or legacy
`@import` for its GOV.UK settings/tools dependencies; if it `@import`s `govuk/...`,
confirm it still compiles under the existing `@use` of `govuk-frontend` (mixing is
allowed but the MOJ partial may need its GOV.UK deps made available on the load path
— they already are via `loadPaths`). Prefer the narrowest set of partials that makes
the component render correctly; do not add `moj/all`.

### JavaScript init (FilterToggleButton wiring, .js-enabled class)
In `web.ts`, after `initAll()`:
```ts
import { FilterToggleButton } from "@ministryofjustice/frontend";
// inside the DOMContentLoaded / else branches:
const filter = document.querySelector<HTMLElement>(".moj-filter");
if (filter) {
  new FilterToggleButton({
    bigModeMediaQuery: "(min-width: 48.0625em)",
    startHidden: filter.dataset.startHidden === "true",
    toggleButton: { showText: ..., hideText: ..., classes: "govuk-button--secondary" },
    closeButton: { text: ... },
    // toggleButtonContainer / closeButtonContainer selectors as required by v10 API
  });
}
```
- The `.js-enabled` body class is already present (GOV.UK `template.njk:35`) — no work.
- Show/hide/close button text must come from the page's locale data, passed via
  `data-*` attributes on the container (NOT interpolated into JS — see §3), then read
  in `web.ts`. Confirm the exact v10 `FilterToggleButton` option names against the
  installed package before finalising (the ticket lists `toggleButtonContainer` /
  `closeButtonContainer` / `bigModeMediaQuery` / `startHidden` / `toggleButton.showText`
  / `hideText`).

### Per-page markup migration notes

Common pattern for every page: build the checkbox groups into a `{% set %}` block and
pass to the macro:
```njk
{% from "moj/components/filter/macro.njk" import mojFilter %}
{% set filterOptionsHtml %}
  ... existing govukCheckboxes / govukInput / govukDateInput calls ...
{% endset %}
{{ mojFilter({
  heading: { text: filterHeading },
  selectedFilters: selectedFilters,   // { heading, categories:[{ heading, items:[{ text, href }] }] }
  optionsHtml: filterOptionsHtml
}) }}
```
Selected-filter tags stop being `<span class="filter-tag">…×</span>` and become MOJ's
`selectedFilters.categories`, rendered as `<ul class="moj-filter-tags"><li><a class="moj-filter__tag">`
with a visually-hidden "Remove this filter" label — an accessibility improvement.

1. **`(public)/courts-tribunals-list/index.njk`** (Dialect A, the original, lines 12–160)
   — sidebar model. Move the jurisdiction + sub-jurisdiction + region checkbox groups
   into `optionsHtml`. Selected filters: jurisdictions, sub-jurisdictions, regions →
   three `categories`. Remove the `#show-filters-btn` / `#hide-filters-btn` /
   `.mobile-filter-toggle` markup and inline `style=` triple. Keep the sub-jurisdiction
   reveal-on-check JS.
2. **`(verified)/location-name-search/index.njk`** (Dialect A clone, lines 25–124) —
   same as above. Note it additionally has a results-form and a JS selection counter in
   its own inline `<script>` (lines 173–190) — that counter is unrelated to filtering;
   leave it, or move to a small named init if convenient, but it is not in scope.
3. **`(system-admin)/jurisdiction-data-list/index.njk`** (Dialect A trimmed, lines 20–66)
   — single "type" category. Migrating to `mojFilter` fixes the mobile dead-end (see §3).
4. **`(list-types)/sjp-press-list/sjp-press-list.njk`** (Dialect B, markup 85–196,
   script 259–321) — toggle-to-reveal model (`startHidden` unless a filter is active).
   Replace `moj-filter-layout` / `layout-width-*` / fake `moj-filter` markup with the
   macro. Postcode + prosecutor checkbox groups → `optionsHtml`; keep the
   `#filter-search` search input and `initSjpFilterSearch()`. Selected filters:
   postcodes + prosecutors → two `categories`. Delete inline script.
5. **`(list-types)/sjp-public-list/sjp-public-list.njk`** (Dialect B, markup 73–186,
   script 229–290) — identical treatment to sjp-press-list. This copy's init sets
   `checkbox.style.display='block'` (line 268) where press-list does not — the migration
   removes that divergence by construction.
6. **`(system-admin)/audit-log-list/index.njk`** (Dialect C, lines 20–163) — sidebar
   model. Email / userId / date-input / actions checkboxes → `optionsHtml`. Selected
   filters: email, userId, date, per-action → categories. Remove the ad-hoc
   `style="max-width:100%;word-break:break-word;"` on the email tag (line 37) — MOJ tag
   wrapping handles overflow; if a genuine long-token break is still needed, add a BEM
   `app-` class in SCSS, not an inline style. Remove `.audit-log-layout*` flex layout
   (`dashboard.scss:43-70`) in favour of `moj-filter-layout`.
7. **`(system-admin)/find-users/index.njk`** (Dialect D, lines 29–167) — sidebar model.
   Email / userId / userProvenanceId inputs + roles + provenances checkboxes →
   `optionsHtml`. `selectedFilterGroups` → `selectedFilters.categories`. Drop the
   `govukTag()`-with-injected-`×` tag rendering; MOJ renders the remove affordance.
   Delete the `user-management-filter-*` block from `user-management.scss`.

## 3. Error Handling & Edge Cases

- **jurisdiction-data-list mobile dead-end fix.** Confirmed: the template omits
  `#show-filters-btn` / `#hide-filters-btn`, so `initMobileFilterToggle()`
  (`filter-panel.ts:62`) silently no-ops, while `filter-panel.scss:29` hides
  `.filter-column` under `max-width: 40.0525em` — filters are unreachable on mobile.
  Moving to `mojFilter` + `FilterToggleButton` gives it the same working overlay as
  every other page, closing the dead-end. Add an `.njk.test.ts` asserting the toggle
  button and `.moj-filter` render (see coverage gap below).
- **Welsh strings must not be interpolated into JS.** Both SJP inline scripts currently
  do `filterToggle.textContent = '{{ hideFilters }}'` (e.g. `sjp-press-list.njk:282,287`)
  — a real escaping hazard for Welsh strings containing an apostrophe (e.g. "Cuddio'r
  hidlyddion"). The migration removes these scripts; pass show/hide/close text to
  `FilterToggleButton` via `data-*` attributes on the panel container and read them in
  `web.ts`. No locale string is ever written into a JS string literal.
- **SCSS collision risk with GDS-rebrand overrides.** `web.scss` carries deliberate
  rebrand overrides (footer size 16 / colour, warning-text flexbox, phase-banner
  layout — lines 98–187). MOJ's `base`/`core` SCSS can re-assert GDS defaults. Mitigate
  by `@use`-ing only `filter` + `filter-layout`, never `moj/all`. After integration,
  visually confirm footer, warning-text and phase-banner are unchanged; if MOJ pulls in
  shared settings that shift them, keep the existing overrides *after* the MOJ `@use`
  lines so they win on specificity/order.
- **Dead build outputs.** `filter-panel.scss` and `user-management.scss` are both
  standalone Vite entries (`getEntries` globs `css/*.scss`) *and* `@use`d by `web.scss`
  — the standalone `filter-panel_css` / `user-management_css` bundles are linked by no
  template. As their rules are deleted, either empty the files (leaving the `@use` a
  no-op) or remove the `@use` and the files; ensure no template `<link>`s the orphan
  bundles (none do).
- **`FilterToggleButton` absent from DOM.** Guard the constructor on the presence of
  `.moj-filter` so pages without a filter (most of the site) do not throw.

## 4. Acceptance Criteria Mapping

| Acceptance criterion | How satisfied | Verification |
|---|---|---|
| `@ministryofjustice/frontend` added as pinned dependency | `"@ministryofjustice/frontend": "10.0.1"` in `apps/web/package.json` | `node_modules/@ministryofjustice/frontend` present; `yarn install` clean |
| All six templates import & call `mojFilter`; no hardcoded `moj-filter*` markup | Per-page migration (§2) | `grep -rn "moj-filter\" data-module" apps/web/src/pages` returns nothing; each template has `mojFilter(` |
| Zero inline `style=` in the six panels | Remove every `style="…#d8d8d8/#f3f2f1/#b1b4b6…"` and the audit-log email-tag style | `grep -rn 'style=' ` across the six templates returns nothing |
| Both SJP inline `<script>` blocks removed; single init in `web.ts` | Delete both scripts; wire `FilterToggleButton` once | `grep -rn 'setupFilterToggle\|filterToggle' apps/web/src/pages` empty; toggle logic only in `web.ts` |
| `sjp-filters.scss` dead/stub rules deleted; dialects collapse onto MOJ | Delete stub/dead `moj-filter*`, `layout-width-*`; migrate to MOJ classes | `sjp-filters.scss` retains only genuinely-used, non-MOJ rules (e.g. section-break margins) or is removed |
| jurisdiction-data-list working mobile show/hide | `mojFilter` + `FilterToggleButton` | New `.njk.test.ts` + manual mobile-width check; toggle reveals panel |
| Welsh preserved on all six; no locale strings in JS | `data-*` attributes for button text; render with `?lng=cy` | `.njk.test.ts` renders `cy` locale; en/cy key parity check |
| Axe passes; keyboard reach to panel + close button | MOJ semantics (proper button, focusable close) | Axe inline in E2E journeys; keyboard tab to toggle/close |
| Unit, template, E2E tests updated; `yarn test` + `yarn test:e2e` green | Update the coupled tests listed in ticket | `yarn test` and `yarn test:e2e` pass |

### Tests to update (verified coupled)
- `apps/web/src/assets/js/filter-panel.test.ts` — rewrite/shrink to whatever logic
  remains; delete assertions for removed mobile-toggle IDs.
- `apps/web/src/assets/js/web.test.ts` — mocks `./filter-panel.js`; update for new init.
- `apps/web/src/pages/(public)/courts-tribunals-list/index.njk.test.ts` — replace
  `#show-filters-btn`, `.filter-tag`, `a.filter-tag-remove` with `.moj-filter` /
  `.moj-filter__tag` structural assertions.
- `sjp-press-list.njk.test.ts`, `sjp-public-list.njk.test.ts` — remove assertions on
  inline-script text (`filterToggle`, `setupFilterToggle`) and the `filterScript($)` /
  `"filter-toggle"` helper.
- `find-users/index.njk.test.ts` — replace `.user-management-selected-filters` with MOJ
  selectors.
- E2E: `courts-tribunals-list.spec.ts` (`.filter-tag`, `.filter-tag-remove`,
  `.filter-section-toggle`), `sjp-press-list.spec.ts`,
  `verified-user/sjp-public-list.spec.ts` (`#filter-panel`, `.filter-tag`),
  `system-admin/user-management.spec.ts` (`.user-management-filter-tag`).
- **Coverage gap:** add `apps/web/src/pages/(system-admin)/jurisdiction-data-list/index.njk.test.ts`
  (currently only a controller test exists).

## 5. CLARIFICATIONS NEEDED

- **Confirm MOJ v10 `FilterToggleButton` API.** The exact constructor option names
  (`toggleButtonContainer` / `closeButtonContainer` vs nested `toggleButton` /
  `closeButton`, and `bigModeMediaQuery` / `startHidden`) must be read from
  `node_modules/@ministryofjustice/frontend` once installed — the ticket's list should
  be treated as indicative, not authoritative.
- **Sidebar vs toggle-to-reveal per page.** Is it acceptable for the five sidebar pages
  to keep the filter always visible on desktop (toggle only governs the mobile overlay),
  while the two SJP pages keep their "Show filters" reveal on all viewports? This mirrors
  current behaviour but means two `FilterToggleButton` configurations coexist.
- **`sjp-filters.scss` residual rules.** Some rules in that file are non-filter (e.g.
  `.govuk-section-break` margins, summary-list border removal scoped to the content
  column). Confirm these should be retained (moved into a page/content SCSS) rather than
  deleted with the filter rules.
- **Single PR vs split by dialect.** The ticket flags six pages in one change as a large
  diff and suggests it "could be split per dialect if it proves unwieldy in review." Do
  you want one PR, or per-dialect PRs (A, B, C, D)?
- **Welsh translations for new close/label text.** MOJ introduces a visually-hidden
  "Remove this filter" and a filter "Close" control. Are approved Welsh strings needed
  for these, or is the existing per-page `hideFilters`/`showFilters` copy sufficient?
- **Out of scope confirmation.** The sortable-table follow-up
  (`sortable-table.ts` / `sjp-public-list.scss`) is explicitly deferred to a separate
  ticket — confirm it stays out of this change.
