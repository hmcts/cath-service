# Tasks — #1620: [A11y] Package 1: Shared components across the whole site

## Implementation Tasks

### 0. Before starting
- [ ] Get answers to CLARIFICATIONS C1–C4 in `plan.md` (C1 blocks item 1.1 timings; other items can go ahead) — NOT ANSWERED: implemented with the plan defaults (C1 literal 15 min for all roles, C2 server-contact only, C3 unchanged, C4 single bottom button, C7 no Sign out)
- [ ] Agree merge order with the owner of item 3.3 (account home) (C8) — no action taken (C8 default)

### 1.2 + 1.4 Phase banner (one change)
- [x] `libs/web-core/src/views/components/phase-banner-content.njk`: remove `aria-label` from the language toggle (keep `lang`). Remove `aria-label` from the feedback link, put `{{ feedback.newTab }}` inside the link text, and add `rel="noopener noreferrer"`
- [x] `libs/web-core/src/locales/en.ts` / `cy.ts`: delete `language.switchAriaLabel` and `feedback.ariaLabel`; add `feedback.newTab` (en "(opens in a new tab)", cy per C5)
- [x] Update `libs/web-core/src/locales/en.test.ts` / `cy.test.ts` (remove the `switchAriaLabel` assertions; check key parity)
- [x] Add `libs/web-core/src/views/components/phase-banner-content.njk.test.ts` covering en, cy and admin (no toggle) (Scenario 5)
- [x] E2E `page-structure.spec.ts`: assert the feedback link name includes "(opens in a new tab)" and `getByRole("link", { name: "Cymraeg", exact: true })` is present with `lang="cy"`; on the Welsh page check "English" (Scenario 5)
- [x] Re-run `crime-idam.spec.ts` and `third-party-subscriber-status.spec.ts`, which use `getByRole("link", { name: "Cymraeg" })`; these now match the phase-banner link, so check for strict-mode clashes

### 1.3 Back to top
- [x] Create the `libs/web-core/src/views/components/back-to-top.njk` macro `appBackToTop({ text })` with `href="#main-content"`, plus `back-to-top.njk.test.ts`
- [x] Rewrite `apps/web/src/assets/js/back-to-top.ts`: no `preventDefault`; temporary `tabindex="-1"` and focus on `#main-content`, removed on blur. Rewrite `back-to-top.test.ts`
- [x] Consolidate CSS onto `.app-back-to-top` in `apps/web/src/assets/css/back-to-top.scss` (add the focused-element `outline: none` class); remove dead `.back-to-top*` rules there and in `table-search.scss`
- [x] Swap the 10 `href="#"` templates: courts-tribunals-list, location-name-search, sjp-public-list, sjp-press-list, magistrates-public-adult-court-list, manual-upload, non-strategic-upload, cookie-policy, accessibility-statement, publishing-policy
- [x] Drop `backToTop.ariaLabel` from `libs/web-core/src/locales/cookie-policy/en.ts` / `cy.ts` and make `backToTop` a string
- [x] Swap the 44 `href="#top"` templates (all remaining list types, create-media-account, audit-log-list, audit-log-detail, and the two lib templates under `libs/list-types/`)
- [x] Gate: `grep -rlE 'href="#top"|back-to-top-link' apps/web/src libs --include='*.njk'` returns nothing
- [x] Update the ~49 unit and template tests that assert `#top` / `.back-to-top` (list in plan §0.3). Make sure each test env includes `libs/web-core/src/views`
- [x] E2E: add the keyboard back-to-top check to the existing journeys in `courts-tribunals-list.spec.ts` and `admin/manual-upload.spec.ts`; update `create-media-account.spec.ts` (`#top`) and `cookie-policy.spec.ts` (Scenario 6)

### 1.5 Filter panel
- [x] Create the `libs/web-core/src/views/components/filter-panel.njk` macro `appFilter` (MoJ fork: hint first, `optionsHtml`, Apply button last with `aria-describedby`, optional `removeFilterText`), plus `filter-panel.njk.test.ts` (en + cy)
- [x] Add `filterPanel.hint` (and `removeFilter` if used) to `libs/web-core/src/locales/en.ts` / `cy.ts`
- [x] Replace `mojFilter` with `appFilter` in courts-tribunals-list, location-name-search, sjp-public-list, sjp-press-list, audit-log-list, find-users and jurisdiction-data-list
- [x] Gate: `grep -rl "moj/components/filter/macro.njk" apps/web/src libs --include='*.njk'` returns nothing
- [x] Update the `filter-toggle.test.ts` fixture (Apply at the bottom; Hide container follows it); check `filter-toggle.ts` needs no change
- [x] Update the 7 page `*.njk.test.ts` files: the button is the last child of `.moj-filter__options` and the hint comes first
- [x] E2E: add forward-tab-to-Apply, hint text, Welsh and axe checks to the existing `courts-tribunals-list.spec.ts` and `system-admin/audit-log-viewer.spec.ts` journeys; re-check `sjp-press-list.spec.ts` (Scenario 7)

### 1.6 Dashboard tiles
- [x] `account-home/index.njk`: `div.verified-tile` with a heading link `.verified-tile__link`; description as plain text
- [x] `admin-dashboard/index.njk`, `system-admin-dashboard/index.njk`, `reference-data/index-tiles.njk`: `div.admin-tile` with `h2 > a.admin-tile__link`
- [x] CSS: `position: relative` card, `::after` overlay, hover on the card, `:focus-within` focus ring; delete the duplicate `.admin-tile*` from `dashboard.scss`
- [x] Update the `account-home`, `admin-dashboard` and `system-admin-dashboard` `index.njk.test.ts` files (one `a` per tile; link text equals the heading; description outside the link); add a reference-data tiles template test
- [x] Update E2E selectors (`a.admin-tile[href=…]`, `.verified-tile`, `p.verified-tile-description`) to `getByRole("link", { name })` in admin-dashboard, media-application-management, system-admin-dashboard, reference-data-management, blob-explorer, location-metadata, mi-report, account-home and email-subscriptions; add a "click description navigates" check plus axe (Scenario 8)
- [ ] Manual check: focus ring is clearly visible in Chrome, Edge and Safari — needs a person; axe passes in Chromium E2E

### 1.1 Timeout warning dialog
- [x] `libs/auth/src/session/timeout-tracker.ts`: set `SESSION_WARNING_LEAD_MS = 5 min` and the timeouts per C1; update tests
- [x] `libs/auth/src/middleware/session-timeout.ts`: expose `res.locals.sessionWarningMs` and `res.locals.sessionRedirectType`; apply the C3 decision on server expiry; update tests
- [x] Create `apps/web/src/pages/(auth)/session-keep-alive/index.ts`: `POST` → `res.status(204).end()` with `Cache-Control: no-store`, 401 when anonymous; `index.test.ts` covers the no-audit-row case (Scenario 4)
- [x] Add `sessionTimeout.*` strings (heading, countdown sentence, unit words, continue, keep-alive error) to `libs/web-core/src/locales/en.ts` / `cy.ts`
- [x] Create `libs/web-core/src/views/components/session-timeout-dialog.njk` (`<dialog>`, h2 with `tabindex="-1"`, `aria-hidden` countdown, visually hidden `aria-live` region, `govukButton` Continue, data attributes), plus `session-timeout-dialog.njk.test.ts` (en + cy)
- [x] `base-template.njk`: include the dialog only when `isAuthenticated` and `sessionIdleMs` are set; remove `isSessionExpiringPage`; update `base-template.njk.test.ts`
- [x] Rewrite `apps/web/src/assets/js/session-timeout.ts`:
  - idle scheduler with no `RESET_EVENTS`
  - dialog open with focus capture and restore
  - countdown from the deadline
  - announcement schedule
  - Continue/Esc → keep-alive
  - expiry → `/session-expired-logout`
  - `storage` and `visibilitychange` sync
  - `showModal` guard
- [x] Rewrite `session-timeout.test.ts` to cover all of Scenario 3
- [x] Add dialog styles (max-width, backdrop) if govuk classes are not enough; register them in `web.scss`
- [x] `apps/web/src/pages/(auth)/session-expired/en.ts` / `cy.ts`: "You have been signed out, due to inactivity." (and `pageTitle`); update the njk and controller tests
- [x] Delete `apps/web/src/pages/(auth)/session-expiring/` and `libs/auth/src/session/continue-path.ts` (+ test); remove the export from `libs/auth/src/index.ts`
- [x] Create `e2e-tests/tests/session-timeout.spec.ts` with the citizen journey (Scenario 1) and system admin journey (Scenario 2) using `page.clock`, with inline axe and Welsh checks
- [ ] Manual: NVDA/JAWS and VoiceOver announce the dialog and countdown at the intervals; Esc and Tab stay inside the dialog — needs a person; announcement schedule, Esc and focus covered by unit and E2E tests

### Finish
- [ ] `yarn lint:fix`, `yarn test` and `yarn test:e2e` pass from the root — lint and unit tests pass; E2E run only for the changed specs (full `yarn test:e2e` not run locally)
- [ ] Run axe and a screen reader on: courts-tribunals-list, account-home, admin-dashboard, system-admin-dashboard, reference-data, manual-upload, audit-log-list, and one list-type page (Definition of Done) — axe passes in the changed E2E journeys (no list-type page run); screen reader not done
- [ ] List every `[WELSH TRANSLATION REQUIRED]` string in the PR description (C5) — listed in the implementation summary; no PR created yet
