# Tasks — #892: Adopt MOJ Frontend `mojFilter`

## Implementation Tasks

### Setup
- [x] Add `"@ministryofjustice/frontend": "10.0.1"` to `apps/web/package.json` dependencies (pinned)
- [x] Run `yarn install`; confirm `node_modules/@ministryofjustice/frontend` exists; note any `moment` peer warning
- [x] Read the installed `FilterToggleButton` source to confirm the exact v10 constructor option names

### Wiring (search paths + SCSS + JS)
- [x] Add MOJ path to Nunjucks search paths in `libs/web-core/src/middleware/govuk-frontend/configure-govuk.ts`
- [x] Mirror MOJ path in `createTestEnvironment` in `libs/test-support/src/nunjucks-test-helper.ts`
- [x] Add selective `@use` of `moj/components/filter/filter` and `moj/objects/filter-layout` to `apps/web/src/assets/css/web.scss`
- [x] Wire `FilterToggleButton` once in `apps/web/src/assets/js/web.ts`, guarded on `.moj-filter`; pass button text via `data-*`
- [x] Reduce/remove `apps/web/src/assets/js/filter-panel.ts` (drop `initMobileFilterToggle`; keep sub-jurisdiction reveal if still used); update `web.ts` import

### Template migration (six pages)
- [x] Migrate `(public)/courts-tribunals-list/index.njk` to `mojFilter`; remove inline styles + mobile toggle markup
- [x] Migrate `(verified)/location-name-search/index.njk` to `mojFilter`; remove inline styles + mobile toggle markup
- [x] Migrate `(system-admin)/jurisdiction-data-list/index.njk` to `mojFilter` (fixes mobile dead-end)
- [x] Migrate `(list-types)/sjp-press-list/sjp-press-list.njk` to `mojFilter`; delete inline `<script>` block
- [x] Migrate `(list-types)/sjp-public-list/sjp-public-list.njk` to `mojFilter`; delete inline `<script>` block
- [x] Migrate `(system-admin)/audit-log-list/index.njk` to `mojFilter`; remove ad-hoc inline style on email tag
- [x] Migrate `(system-admin)/find-users/index.njk` to `mojFilter`; drop injected-`×` tag rendering

### SCSS cleanup
- [x] Delete dead/stub rules from `apps/web/src/assets/css/list-types/sjp-filters.scss` (keep only genuinely-used non-filter rules)
- [x] Remove `.user-management-filter-*` rules from `apps/web/src/assets/css/user-management.scss` (whole file was filter-only — deleted file and its `@use`)
- [x] Remove `.audit-log-layout*` filter layout from `apps/web/src/assets/css/dashboard.scss`
- [x] Remove/empty `apps/web/src/assets/css/filter-panel.scss` and clean orphan Vite bundles; drop stale `@use`s in `web.scss` (kept court-table/az-navigation rules still used by two pages; removed dead mobile-toggle/filter-section/filter-tag rules)

### Tests
- [x] Update/shrink `apps/web/src/assets/js/filter-panel.test.ts`
- [x] Update `apps/web/src/assets/js/web.test.ts` (filter-panel mock / new init) + add `filter-toggle.test.ts`
- [x] Update `(public)/courts-tribunals-list/index.njk.test.ts` to MOJ selectors
- [x] Update `sjp-press-list.njk.test.ts` and `sjp-public-list.njk.test.ts` (remove inline-script assertions + `filter-toggle` helper)
- [x] Update `(system-admin)/find-users/index.njk.test.ts` to MOJ selectors
- [x] Add `(system-admin)/jurisdiction-data-list/index.njk.test.ts` (coverage gap) with Welsh + toggle assertions
- [x] Update E2E: `courts-tribunals-list.spec.ts`, `sjp-press-list.spec.ts`, `verified-user/sjp-public-list.spec.ts`, `system-admin/user-management.spec.ts`

### Verification
- [x] Verify Welsh on all six with `?lng=cy`; confirm no locale string interpolated into JS (data-* attrs; template tests assert scripts contain no locale strings)
- [x] Confirm footer / warning-text / phase-banner rebrand overrides unaffected by MOJ SCSS (all present in compiled web_css alongside .moj-filter rules)
- [x] Confirm jurisdiction-data-list filters are reachable at mobile width (now uses mojFilter + FilterToggleButton; new .njk.test.ts asserts the toggle container renders)
- [~] Axe passes on all six; keyboard reach to toggle + close button works (axe assertions retained inline in the coupled E2E journeys; not executed here — no browser/Redis in this sandbox)
- [x] `yarn test` green (65 workspaces pass)
- [~] `yarn test:e2e` — not runnable in this environment (needs Redis on 6380 + Playwright browsers); specs updated to MOJ selectors
- [x] `yarn lint:fix` clean
