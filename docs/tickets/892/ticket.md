# #892: Adopt MOJ Frontend mojFilter component across the six hand-rolled filter panels

**State:** OPEN
**Assignees:** alao-daniel
**Author:** junaidiqbalmoj
**Labels:** enhancement, priority:3-medium, type:story
**Created:** 2026-07-28T13:29:55Z
**Updated:** 2026-08-04T13:05:08Z

## Description

## Problem

The service has **six hand-rolled filter panels across four divergent class-name dialects**, none of which use the real MOJ Frontend `mojFilter` component. `@ministryofjustice/frontend` is not a dependency of this repo at all — it appears in no `package.json` and not in `yarn.lock`.

Two of the six pages (`sjp-press-list`, `sjp-public-list`) go as far as emitting `class="moj-filter" data-module="moj-filter"`, which is inert markup imitating a component that isn't installed. `apps/web/src/assets/css/list-types/sjp-filters.scss:1` is even titled `// MOJ Filter Layout Styles`, and several of its rules are empty stubs whose comments say the styling lives in template inline styles.

For comparison, the existing CaTH service does this properly — [`pip-frontend/src/main/views/alphabetical-search.njk`](https://github.com/hmcts/pip-frontend/blob/master/src/main/views/alphabetical-search.njk) imports `moj/components/filter/macro.njk` and calls `mojFilter({ submit, heading, selectedFilters, optionsHtml })`.

Consequences today:
- The `#d8d8d8` header + `#f3f2f1` selected strip + `1px solid #b1b4b6` border **inline-style triple is duplicated verbatim in five templates**, directly against the "never use inline styles — use GOV.UK classes only" rule in `.claude/rules/frontend.md`.
- Two independent JS implementations of "toggle the filter panel" and three of "collapsible filter section".
- The copies have already drifted apart (see the behavioural divergence and the mobile dead-end below), which is what duplication always costs.
- Selected-filter tags are `<span class="filter-tag">` with a bare `×` character, where MOJ renders a proper link list with a visually-hidden "Remove this filter" label.

## Evidence — the inventory

### Dialect A — `filter-column` / `filter-section*` / `filter-tag*`
Driven by the shared `apps/web/src/assets/js/filter-panel.ts`.

| File | Notes |
|---|---|
| `apps/web/src/pages/(public)/courts-tribunals-list/index.njk` (12–160) | The original |
| `apps/web/src/pages/(verified)/location-name-search/index.njk` (25–124) | Near-verbatim clone |
| `apps/web/src/pages/(system-admin)/jurisdiction-data-list/index.njk` (20–66) | Trimmed copy |

**Latent bug in `jurisdiction-data-list`:** it omits the `#show-filters-btn` / `#hide-filters-btn` buttons. `initMobileFilterToggle()` requires all four of those IDs plus `.filter-column` / `.courts-column` to be present (`filter-panel.ts:62`), so it silently no-ops — and `filter-panel.scss:29` sets `.filter-column { display: none }` under `max-width: 40.0525em`. **On mobile that page's filters are hidden with no way to reveal them.**

### Dialect B — fake `moj-filter*` / `layout-width-*` / `filter-colour`
Each page carries its own inline `<script nonce>`.

| File | Notes |
|---|---|
| `apps/web/src/pages/(list-types)/sjp-press-list/sjp-press-list.njk` | markup 85–196, script 259–321 |
| `apps/web/src/pages/(list-types)/sjp-public-list/sjp-public-list.njk` | markup 73–186, script 229–290 |

- **The two copies have already diverged:** `sjp-public-list` sets `checkbox.style.display = 'block'` on init (line 268); `sjp-press-list` only adds `.rotated`. The first click on a filter section therefore behaves inconsistently between the two pages.
- Both interpolate `'{{ hideFilters }}'` / `'{{ showFilters }}'` straight into JS string literals — a latent escaping hazard for Welsh strings containing an apostrophe.

### Dialect C — `audit-log-layout*`
`apps/web/src/pages/(system-admin)/audit-log-list/index.njk` (20–163). Flex layout in `dashboard.scss:43–68`, but reuses Dialect A's `.filter-tag*` classes, plus an ad-hoc `style="max-width: 100%; word-break: break-word;"` on the email tag (line 37).

### Dialect D — `user-management-*`
`apps/web/src/pages/(system-admin)/find-users/index.njk` (29–167). An entirely separate vocabulary (`user-management-filter-wrapper`, `-selected-filters`, `-filter-tag-link`…) in `apps/web/src/assets/css/user-management.scss`, rendering tags via `govukTag()` with an injected `×` span.

### No shared partial exists
`libs/web-core/src/views/` contains only `layouts/`, `components/` and `errors/`. There is no `partials/` directory anywhere in `apps/` or `libs/`, and no page `{% include %}`s a filter fragment. All six panels are independent copy-paste.

### Dead code this removes
- `sjp-filters.scss` is roughly half dead: `.moj-filter-tags`, `.moj-filter-tag-wrapper`, `.moj-filter-tag-label`, `.moj-filter-tag`, `.moj-button-menu` have **zero usages** anywhere in `.njk`, `.ts` or e2e; `.moj-filter`, `.moj-filter__header`, `.moj-filter__content`, `.moj-filter__selected`, `.moj-filter__options`, `.moj-filter-tag__text` are empty stubs.
- Its `@media (max-width: 768px)` block sets `flex-direction: column` on a container declared `display: block !important` — a no-op.
- Vite's `getEntries` (`apps/web/vite.build.ts`) emits `filter-panel_css` and `user-management_css` as standalone bundles that no template links — dead build outputs.

## Proposed change

Add `@ministryofjustice/frontend` and migrate all six panels to the real `mojFilter`.

Integration details, verified against `@ministryofjustice/frontend@10.0.1`:

1. **Dependency** — peer-deps are `govuk-frontend: ^6.0.0` (we have `6.2.0` at `apps/web/package.json:68`, compatible) and `moment: 2.30.1` (only used by `date-picker`, not by filter, but yarn will warn about the missing peer). Pin the exact version per CLAUDE.md.

2. **Nunjucks search path** — add `../../node_modules/@ministryofjustice/frontend` alongside `govukFrontendPath` in `libs/web-core/src/middleware/govuk-frontend/configure-govuk.ts:17-19`, so `moj/components/filter/macro.njk` resolves. **Mirror it in `createTestEnvironment` (`libs/test-support/src/nunjucks-test-helper.ts:24`)** or every `.njk.test.ts` will fail to render.

3. **SCSS** — `@use` from `apps/web/src/assets/css/web.scss` (the single stylesheet `<link>`, via `web_css` in `base-template.njk:7`). Prefer selective `moj/components/filter/_filter.scss` + `moj/objects/_filter-layout.scss` over the whole `moj/all.scss`, to avoid pulling in every MOJ component. `loadPaths: ["node_modules"]` is already configured (`apps/web/vite.build.ts:56`).

4. **JavaScript** — note that MOJ's `initAll()` (`moj/all.mjs`) **does not include `FilterToggleButton`**; it's exported separately and must be constructed explicitly with `toggleButtonContainer` / `closeButtonContainer` selectors, `bigModeMediaQuery`, `startHidden`, and `toggleButton.showText` / `hideText`. Wire it once in `apps/web/src/assets/js/web.ts` (which currently calls `initFilterPanel()` and `initSjpFilterSearch()`), replacing both the shared `filter-panel.ts` toggle logic and the two inline scripts. MOJ's mobile-overlay CSS is gated on `.js-enabled`, which nothing in this repo currently sets — that class needs adding.

5. **Markup** — `mojFilter` takes `optionsHtml` as a `| safe` blob, so each page's existing checkbox groups move in via `{% set filterOptionsHtml %}…{% endset %}`, exactly as `pip-frontend` does. Selected filters become `selectedFilters.categories`, which MOJ renders as `<ul class="moj-filter-tags"><li><a class="moj-filter__tag">` with a visually-hidden "Remove this filter" — an accessibility improvement on the current bare `×`.

6. Delete the two SJP inline `<script nonce="{{ cspNonce }}">` filter blocks in favour of the bundle.

## Tests that will need updating

Markup-coupled, will break:
- `apps/web/src/assets/js/filter-panel.test.ts` (385 lines) — the most markup-coupled file in the repo
- `apps/web/src/pages/(public)/courts-tribunals-list/index.njk.test.ts` — `#show-filters-btn`, `.filter-tag`, `a.filter-tag-remove`
- `apps/web/src/pages/(list-types)/sjp-press-list/sjp-press-list.njk.test.ts` and `.../sjp-public-list/sjp-public-list.njk.test.ts` — both **assert on the inline script's text content** (`filterToggle`, `setupFilterToggle`), and the public-list `filterScript($)` helper locates the script by the literal string `"filter-toggle"`
- `apps/web/src/pages/(system-admin)/find-users/index.njk.test.ts` — `.user-management-selected-filters`
- `apps/web/src/assets/js/web.test.ts` — mocks `./filter-panel.js`

E2E, also coupled:
- `e2e-tests/tests/courts-tribunals-list.spec.ts` — `.filter-tag`, `.filter-tag-remove`, `.filter-section-toggle`
- `e2e-tests/tests/sjp-press-list.spec.ts`, `e2e-tests/tests/verified-user/sjp-public-list.spec.ts` — `#filter-panel`, `.filter-tag`
- `e2e-tests/tests/system-admin/user-management.spec.ts` — `.user-management-filter-tag`

Already safe (text/label-based locators): `audit-log-list/index.njk.test.ts`, `location-name-search/index.njk.test.ts`, `audit-log-viewer.spec.ts`.

**Coverage gap:** `jurisdiction-data-list` has no `.njk.test.ts` at all — only a controller test — so its filter markup is untested at template level. Worth adding one as part of this work.

## Acceptance criteria

- [ ] `@ministryofjustice/frontend` added as a pinned dependency
- [ ] All six templates import and call `mojFilter`; no template hardcodes `moj-filter*` markup
- [ ] Zero inline `style=` attributes remain in the six filter panels
- [ ] Both SJP inline `<script>` filter blocks removed; a single init path in `web.ts`
- [ ] `sjp-filters.scss` dead/stub rules deleted; the four dialects collapse onto MOJ classes
- [ ] `jurisdiction-data-list` has a working mobile show/hide (fixes the current dead end)
- [ ] Welsh preserved on all six, verified with `?lng=cy`; no locale strings interpolated into JS
- [ ] Axe passes on all six; keyboard reach to the filter panel and its close button works
- [ ] Unit, template and E2E tests updated; `yarn test` and `yarn test:e2e` green

## Risks

- `@ministryofjustice/frontend` ships its own `base`/`core` SCSS which can collide with the GDS-rebrand overrides in `web.scss` (footer font size, warning-text flex, phase banner layout). Selective `@use` of just the filter component and filter-layout object mitigates this.
- MOJ's filter component is marked **"To be reviewed"** in the MOJ Design System — documented as usable in every product phase, but not actively developed. Still preferable to four bespoke copies, but worth knowing it isn't a component under active investment.
- Six pages in one change is a large diff. It could be split per dialect if it proves unwieldy in review.

## Out of scope (follow-up)

`apps/web/src/assets/js/sortable-table.ts` and `apps/web/src/assets/css/list-types/sjp-public-list.scss` are hand-rolled reimplementations of MOJ's `moj-sortable-table` — `sjp-public-list.scss:2` says so outright ("Replicates @ministryofjustice/frontend sortable-table component styling"). Once this dependency lands, both become redundant and `SortableTable` is available via MOJ's `initAll()`. Worth a separate ticket rather than widening this one.

## Comments

No comments on this issue.
