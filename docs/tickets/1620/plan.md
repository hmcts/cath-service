# Technical Plan — #1620: [A11y] Package 1: Shared components across the whole site

## 0. Investigation findings (grounded at `master` 537a6da2)

### 0.1 Item 1.1 — gap analysis against Feature-764 (#1322, commit dd1704f2, merged 18 Nov 2026)

Feature-764 deliberately chose **legacy pip-frontend parity** (`docs/tickets/764/plan.md` line 3): a full-page `/session-expiring` redirect, no modal, no extend API, no countdown. The audit finding is therefore **not** fixed by #1322. What exists today:

| Piece | Where | Behaviour |
| --- | --- | --- |
| Server timeout | `libs/auth/src/session/timeout-tracker.ts` | `SESSION_TIMEOUT_MS` 60 min (verified), `ADMIN_SESSION_TIMEOUT_MS` 240 min (`SYSTEM_ADMIN`, `INTERNAL_ADMIN_CTSC`, `INTERNAL_ADMIN_LOCAL`). `SESSION_WARNING_LEAD_MS` 20 min |
| Enforcement | `libs/auth/src/middleware/session-timeout.ts` (mounted `apps/web/src/app.ts:193`) | Every signed-in request either renews `session.lastActivity` or, if expired, runs provider sign-out → `/session-logged-out` ("You have been signed out"). Sets `res.locals.sessionIdleMs = timeout − 20 min` |
| Client trigger | `libs/web-core/src/views/layouts/base-template.njk` (`data-session-idle-ms` on `<body>`) + `apps/web/src/assets/js/session-timeout.ts` | After `sessionIdleMs` with no `click/mousedown/mousemove/keypress/scroll/touchstart`, **navigates** to `/session-expiring?currentPath=…`. `localStorage.idleExpiry` syncs tabs |
| Warning page | `apps/web/src/pages/(auth)/session-expiring/*` | Full page, "You will soon be signed out due to inactivity" / "To remain signed in, please click below", Continue = link back to `currentPath`. Silently waits 20 min then goes to `/session-expired-logout` |
| Expired page | `apps/web/src/pages/(auth)/session-expired/*` (via `/session-expired-logout`) | "You have been signed out due to inactivity" + provider-specific Sign in button |
| Session store | `libs/web-core/src/middleware/session-stores/redis-store.ts` | No cookie `maxAge` (browser-session cookie). connect-redis default TTL (24h), touched on write. Real limit is the `lastActivity` check |
| Keep-alive endpoint | none | Any request through `sessionTimeoutMiddleware` renews. No CSRF middleware exists; cookie is `sameSite: "lax"` |
| MoJ component | not available | `@ministryofjustice/frontend@10.0.1` has no timeout-warning component (checked `node_modules/@ministryofjustice/frontend/moj/components`). Must be built to the MoJ guidance |

| AC | Status at HEAD | Delta needed |
| --- | --- | --- |
| Warning after 10 min inactivity, 5 min countdown | **Gap.** Warning at 40 min (verified) / 3h40 (admin); 20 min silent wait, no visible countdown | New constants; see CLARIFICATION C1 (this conflicts with #764's 60 min / 4h) |
| Header "You're about to be signed out due to inactivity." + "For your security, you will be signed out in -- minutes -- seconds." | **Gap.** Different wording, no timer | New en/cy strings, live countdown |
| Continue extends session | **Partial.** Continue is a link that *navigates* to `currentPath`; the redirect to `/session-expiring` has already discarded unsubmitted form input | In-page dialog + `POST /session-keep-alive`; user stays on the page with input intact |
| Signed-out message "You have been signed out, due to inactivity." | **Partial.** `/session-expired` header lacks comma/full stop. Server-detected expiry lands on `/session-logged-out` ("You have been signed out") | Update `/session-expired` copy (en+cy). C3 for the server-expiry path |
| Focus moves into dialog, countdown announced at intervals, keyboard close | **Gap.** No dialog | Native `<dialog>` + `showModal()`, live region, Esc = Continue |
| Verified users and system admins | **Met** — both use `apps/web` and `base-template.njk`; role-based timeouts | Keep |
| Follows MoJ timeout warning | **Gap** (full page) | Build modal to MoJ guidance |

Reusable as-is: `isSessionExpired`/`updateLastActivity`, `/session-expired-logout`, `/session-expired`, `getRedirectType`/`buildSessionExpiredRedirectUrl`, `localStorage.idleExpiry` cross-tab sync, `bodyAttributes` mechanism in `base-template.njk`.

### 0.2 Items 1.2 + 1.4 — phase banner
`libs/web-core/src/views/components/phase-banner-content.njk` line 4 (feedback: `aria-label="{{ feedback.ariaLabel }}"`, `target="_blank"`, no `rel`, no new-tab text) and line 6 (toggle: `aria-label="{{ language.switchAriaLabel }}"`, `lang="{{ otherLocale }}"`). Strings in `libs/web-core/src/locales/en.ts` / `cy.ts` (`language.switchAriaLabel`, `feedback.ariaLabel`). The toggle is only rendered for non-admins (`locale-middleware.ts` `translationMiddleware`), so 1.2 is citizen-only; the feedback link renders for everyone. No Welsh "(… tab newydd)" string exists in the repo; the only existing phrase is "(yn agor mewn ffenestr newydd)" (window), e.g. `apps/web/src/pages/(admin)/media-applications/[id]/cy.ts:10`.

### 0.3 Item 1.3 — back to top
`<main class="govuk-main-wrapper" id="main-content">` comes from `govuk-frontend/dist/govuk/template.njk:78`; **no `tabindex`**. The govuk skip link only adds a temporary `tabindex="-1"` to its own target via its JS. There are **54 templates**, not 10, in three variants:
- `href="#"` (10, the ticket's list): `(public)/courts-tribunals-list`, `(verified)/location-name-search`, `(list-types)/sjp-public-list`, `(list-types)/sjp-press-list`, `(list-types)/magistrates-public-adult-court-list`, `(admin)/manual-upload`, `(admin)/non-strategic-upload`, `(core)/cookie-policy` (also has a mismatching `aria-label`), `(core)/accessibility-statement`, `(core)/publishing-policy` (these two use an SVG arrow).
- `href="#top"` (44): every other list-type template (target is a non-focusable `<h1 id="top">` or nothing), plus `(public)/create-media-account`, `(system-admin)/audit-log-list`, `(system-admin)/audit-log-detail`, and lib templates `libs/list-types/siac-poac-paac-weekly-hearing-list/src/views/siac-poac-paac-weekly-hearing-list.njk`, `libs/list-types/utiac-jr-daily-hearing-list/src/utiac-jr-daily-hearing-list.njk`. Neither moves focus.
- `apps/web/src/assets/js/back-to-top.ts` targets `.back-to-top-link a`, calls `preventDefault()` + `window.scrollTo` — this is what keeps focus on the link on the accessibility/publishing policy pages.

Full list: `grep -rlE 'href="#top"|back-to-top-link"' apps/web/src libs --include='*.njk'`.

### 0.4 Item 1.5 — filter panel
Not a CaTH partial: each page calls `mojFilter` from `@ministryofjustice/frontend`, whose `template.njk` hard-codes the `govukButton` as the **first** child of `.moj-filter__options`. Seven consumers:
`(public)/courts-tribunals-list/index.njk`, `(verified)/location-name-search/index.njk`, `(list-types)/sjp-public-list/sjp-public-list.njk`, `(list-types)/sjp-press-list/sjp-press-list.njk`, `(system-admin)/audit-log-list/index.njk`, `(system-admin)/find-users/index.njk`, `(system-admin)/jurisdiction-data-list/index.njk`.
`apps/web/src/assets/js/filter-toggle.ts` `ensureHideContainer()` inserts the "Hide filters" container after the first `.govuk-button` in `.moj-filter__options`, so it follows the Apply button wherever it is.

### 0.5 Item 1.6 — tiles
`(verified)/account-home/index.njk` (`a.verified-tile`, 3 tiles), `(admin)/admin-dashboard/index.njk` (`a.admin-tile`, 3–4), `(system-admin)/system-admin-dashboard/index.njk` (loop), `(system-admin)/reference-data/index-tiles.njk` (loop). CSS: `apps/web/src/assets/css/verified-pages.scss`, and `.admin-tile*` is **duplicated** in both `admin-pages.scss` and `dashboard.scss`.

## 1. Technical Approach

### 1.1 Timeout warning dialog
- **Server stays authoritative.** Keep `sessionTimeoutMiddleware` and `lastActivity`. Change `SESSION_WARNING_LEAD_MS` to 5 min and set the timeouts per C1 (default: literal AC, 15 min for every role, so the dialog opens after 10 min). The timings stay as constants in `timeout-tracker.ts` only.
- **Client timer reflects the server, not mouse movement.** The idle clock restarts only on page load, a successful keep-alive, or a newer `idleExpiry` written by another tab (`storage` event). The `RESET_EVENTS` listeners are removed: #764 accepted that they drift from the server, and with a 15 min timeout that drift would sign readers out with no warning — the exact 2.2.1 failure. See C2.
- **Native `<dialog>` opened with `showModal()`** (gives focus containment, inert background and Esc as `cancel`). It is server-rendered in a new `components/session-timeout-dialog.njk`, included from `base-template.njk` only when `isAuthenticated` and `sessionIdleMs` are set. All copy comes from the web-core locale (`sessionTimeout.*`), so no strings live in JS (this also closes #764's open question).
  - `aria-labelledby` points at the h2 heading and `aria-describedby` at the body text. On open, focus moves to the heading (`tabindex="-1"`).
  - The visible countdown is `aria-hidden="true"` and updates every second from a deadline timestamp, so it does not drift. A visually hidden `aria-live="polite"` region inside the dialog is updated on open, at each whole minute, then every 15 s in the last minute (MoJ guidance; avoids a per-second announcement flood).
  - Continue (`govukButton`) and Esc (`cancel` → `preventDefault` → same handler) call `POST /session-keep-alive`. On 204: write the new `idleExpiry`, close the dialog, return focus to the element that had it before, reschedule.
  - At zero → `window.location.assign("/session-expired-logout?redirectType=…")` (existing route → provider logout → `/session-expired`).
- **Keep-alive route** `apps/web/src/pages/(auth)/session-keep-alive/index.ts`: `POST` only. It returns `204` with `Cache-Control: no-store` when authenticated and `401` otherwise. Renewal is done by the existing middleware before the handler runs. The handler uses `res.status(204).end()`, not `send`/`json`, so `auditLogMiddleware` (which logs on `send`/`json` for SYSTEM_ADMIN POSTs) does not write an audit row each time Continue is pressed. Lax cookies are not sent cross-site on POST, so CSRF is not a concern.
- **Remove `/session-expiring`** with `isSessionExpiringPage`, `resolveContinuePath` (`libs/auth/src/session/continue-path.ts`, only used there) and its export. Nothing links to it once the client no longer redirects there. YAGNI.
- `/session-expired` copy is updated to the AC wording.

### 1.2 + 1.4 Phase banner (ship as one change)
One template edit and one locale edit:
- Remove both `aria-label`s and delete `language.switchAriaLabel` and `feedback.ariaLabel` from en/cy. `lang="{{ otherLocale }}"` stays.
- Feedback link text becomes `{{ feedback.part2 }} {{ feedback.newTab }}`, **inside** the `<a>`, so the accessible name starts with the visible text: "feedback (opens in a new tab)" (mock-up wording). Add `rel="noopener noreferrer"`. Welsh: "adborth (yn agor mewn tab newydd)" (see C5).
- The same template serves citizen and admin, so both are fixed together. The English toggle on Welsh pages uses the same `<a>`, so it is fixed by the same edit.

### 1.3 Back to top
- New macro `libs/web-core/src/views/components/back-to-top.njk` → `appBackToTop({ text })`, rendering one standard markup: `<p class="govuk-body app-back-to-top"><a href="#main-content" class="govuk-link app-back-to-top__link"><span aria-hidden="true">▴ </span>{{ text }}</a></p>`. Replace all 54 occurrences. This standardises the 4 visual variants (arrow glyph/SVG). Each page keeps its existing locale key.
- Rewrite `apps/web/src/assets/js/back-to-top.ts`. For every `.app-back-to-top__link`, on click: do **not** `preventDefault` (the hash navigation still scrolls). Then set `tabindex="-1"` on `#main-content` if it has none, call `focus()`, add `app-back-to-top-focused` (outline: none, like govuk's `govuk-skip-link-focused-element`), and remove the tabindex and class on `blur`. This copies the GOV.UK skip-link approach. We do not put a permanent `tabindex` on `<main>`: with that, mouse clicks inside `<main>` would focus it and the next Tab would jump back to the top.
- Without JS: the native fragment link moves the sequential focus starting point to `#main-content` in current browsers, so the next Tab still goes to the first focusable element in main.
- Remove `cookie-policy` `backToTop.ariaLabel` (a label-in-name mismatch on the same link).

### 1.5 Filter panel
- New macro `libs/web-core/src/views/components/filter-panel.njk` → `appFilter(params)`. It is a fork of the MoJ filter template that keeps every MoJ class name, so `FilterToggleButton` and `filter-toggle.ts` keep working. Differences:
  1. `<p class="govuk-hint" id="filter-hint">{{ params.hint.text }}</p>` comes first in `.moj-filter__options`.
  2. `optionsHtml` follows.
  3. The Apply `govukButton` (with `aria-describedby="filter-hint"`) comes **last**.
  4. Optionally, `params.removeFilterText` replaces MoJ's hard-coded English "Remove this filter". This is a free Welsh fix while forking. Drop it if reviewers object to the scope.
- Hint copy goes in the web-core shared locale (`filterPanel.hint`), because it is used by seven pages.
- The **top button is removed** (mock-up). See C4.
- Swap all seven `mojFilter` imports to `appFilter`, passing `hint: { text: filterPanel.hint }`.

### 1.6 Dashboard tiles (clickable card pattern)
- Wrapper becomes `<div class="admin-tile">` / `<div class="verified-tile">`. The heading contains `<a class="govuk-link govuk-link--no-visited-state admin-tile__link" href="…">heading</a>`; the description is plain text.
- CSS: the card is `position: relative`. `.…__link::after { content: ""; position: absolute; inset: 0; }` makes the whole card clickable with one link. Hover styles sit on `.admin-tile:hover`. For focus, the link keeps the GOV.UK yellow focus style, and the card gets `:focus-within` outline 3px `$govuk-focus-colour` + black border, so focus stays clearly visible.
- Delete the duplicate `.admin-tile*` rules from `dashboard.scss` and keep one definition in `admin-pages.scss`.
- Edit in place (4 small templates). No macro, because the two tile styles differ and the markup is 4 lines. Tell the owner of item 3.3 (account home) before merging.

## 2. Implementation Details

**TEMPLATE SOURCE: n/a**

No database changes. No new environment variables.

### New files
| Path | Purpose |
| --- | --- |
| `libs/web-core/src/views/components/session-timeout-dialog.njk` (+ `.njk.test.ts`) | Dialog markup; `data-warning-ms`, `data-redirect-type`, unit labels for JS |
| `apps/web/src/pages/(auth)/session-keep-alive/index.ts` (+ `index.test.ts`) | `POST` → 204 / 401 |
| `libs/web-core/src/views/components/back-to-top.njk` (+ `.njk.test.ts`) | `appBackToTop` macro |
| `libs/web-core/src/views/components/filter-panel.njk` (+ `.njk.test.ts`) | `appFilter` macro |
| `libs/web-core/src/views/components/phase-banner-content.njk.test.ts` | Phase banner structure tests |
| `e2e-tests/tests/session-timeout.spec.ts` | Citizen + system admin timeout journeys |

### Modified files
| Path | Change |
| --- | --- |
| `libs/auth/src/session/timeout-tracker.ts` (+test) | `SESSION_WARNING_LEAD_MS = 5 min`; timeouts per C1 |
| `libs/auth/src/middleware/session-timeout.ts` (+test) | Also set `res.locals.sessionWarningMs` and `res.locals.sessionRedirectType = getRedirectType(provenance)`. Per C3, possibly use `buildSessionExpiredRedirectUrl` on server-detected expiry |
| `libs/auth/src/index.ts` | Drop `resolveContinuePath` export |
| `libs/web-core/src/views/layouts/base-template.njk` (+test) | Drop `isSessionExpiringPage`; include the dialog component when authenticated |
| `libs/web-core/src/locales/en.ts`, `cy.ts` (+tests) | Add `sessionTimeout.{heading, countdownPrefix, minute, minutes, second, seconds, continue}`, `feedback.newTab`, `filterPanel.hint`; delete `language.switchAriaLabel`, `feedback.ariaLabel` |
| `libs/web-core/src/views/components/phase-banner-content.njk` | Items 1.2 + 1.4 |
| `libs/web-core/src/locales/cookie-policy/en.ts`, `cy.ts` | `backToTop` becomes a plain string (drop `ariaLabel`) |
| `apps/web/src/assets/js/session-timeout.ts` (+test) | Rewrite: idle scheduler, dialog controller, keep-alive, announcements, storage/visibility sync |
| `apps/web/src/assets/js/back-to-top.ts` (+test) | Focus `#main-content` |
| `apps/web/src/assets/js/filter-toggle.test.ts` | Fixture with the Apply button at the bottom |
| `apps/web/src/assets/css/back-to-top.scss`, `table-search.scss` | Consolidate onto `.app-back-to-top`; remove dead `.back-to-top*` rules |
| `apps/web/src/assets/css/admin-pages.scss`, `dashboard.scss`, `verified-pages.scss` | Card pattern; remove duplicate |
| `apps/web/src/assets/css/web.scss` | Add a `session-timeout.scss` import if the dialog needs styling beyond govuk classes (backdrop, max-width) |
| `apps/web/src/pages/(auth)/session-expired/en.ts`, `cy.ts` (+njk test) | AC wording |
| 54 back-to-top templates (§0.3) and their `*.njk.test.ts` / `index.test.ts` | Use `appBackToTop`; assert `href="#main-content"` |
| 7 filter templates (§0.4) and their `*.njk.test.ts` | Use `appFilter` |
| 4 tile templates (§0.5) and `account-home`, `admin-dashboard`, `system-admin-dashboard` `index.njk.test.ts` | Heading-only link |
| E2E: `page-structure.spec.ts`, `courts-tribunals-list.spec.ts`, `cookie-policy.spec.ts`, `create-media-account.spec.ts` (asserts `href="#top"`), `admin/manual-upload.spec.ts`, `admin/admin-dashboard.spec.ts`, `admin/media-application-management.spec.ts`, `system-admin/{system-admin-dashboard,reference-data-management,blob-explorer,location-metadata,mi-report}.spec.ts`, `verified-user/{account-home,email-subscriptions}.spec.ts`, `sjp-press-list.spec.ts` | Selectors `a.admin-tile[href=…]` / `.verified-tile` → `getByRole("link", { name: heading })`; back-to-top href; filter order |

### Deleted
`apps/web/src/pages/(auth)/session-expiring/` (all 6 files), `libs/auth/src/session/continue-path.ts` (+test).

### API
`POST /session-keep-alive` (web app, not `apps/api`, because the session lives in the web app). 204 when renewed, 401 when there is no session. An expired session gets the middleware's 302, which the client reads as expired.

## 3. Error Handling & Edge Cases
- **JS disabled:** no dialog. The server timeout still applies, and the next request lands on the signed-out page. 2.2.1 cannot be met without JS; this matches GOV.UK/MoJ.
- **`<dialog>` unsupported:** guard `typeof dialog.showModal === "function"`. If missing, do nothing (server enforcement only). All supported browsers have had it since 2022.
- **Multiple tabs:** a `storage` event for `idleExpiry` with a later value closes an open dialog and reschedules. Continue in one tab extends all tabs. `localStorage` blocked → in-memory fallback (existing). Cross-tab sync is lost but each tab still warns.
- **Timer drift / sleeping laptop:** the countdown is computed from `deadline − Date.now()` every tick. On `visibilitychange` to visible, recompute, and if the deadline has passed, sign out at once.
- **Session already expired server-side when Continue is pressed:** fetch `redirect: "manual"` gets an `opaqueredirect` or 401. The client then navigates to `window.location.href` (GET), so the middleware runs the proper provider sign-out (CFT IDAM `endSession` / B2C).
- **Keep-alive network failure (offline):** leave the dialog open and the countdown running. Put a short error line in the live region ("We could not keep you signed in. Try again.", en+cy). Do not close the dialog silently.
- **Focus return:** remember `document.activeElement` before `showModal()` and restore it on close. If that element is gone, focus `#main-content` (temporary tabindex, same helper as back-to-top).
- **Cookie banner / other overlays:** `showModal` puts the dialog in the top layer above the banner. Nothing else in the app uses `<dialog>`.
- **Admin locale:** admins get no language toggle, but the dialog still follows `res.locals.locale`, so a Welsh session gets Welsh copy.
- **Back to top on pages without `#main-content`:** every page extends `base-template.njk` → govuk template, so the id always exists. JS does nothing if the target is missing.
- **`#top` anchors:** the `<h1 id="top">` ids become unused after the swap. Leave them; they are harmless and removing them adds churn.
- **Filter panel without JS:** the button is still at the bottom and submits the GET form. The hint is static text.
- **Clickable card:** the `::after` overlay stops users selecting description text. This is an accepted MoJ card trade-off. The description must not contain links (none do).
- **Welsh:** every new string needs a cy value. Use the `[WELSH TRANSLATION REQUIRED: '…']` placeholder where no approved translation exists, and list these in the PR.

## 4. Acceptance Criteria Mapping

| Item | AC | How satisfied | Verified by |
| --- | --- | --- | --- |
| 1.1 | Dialog after 10 min, 5 min countdown | `sessionIdleMs = timeout − 5 min`; dialog opens at `idleExpiry` | `session-timeout.test.ts` (fake timers); middleware test; E2E `page.clock` |
| 1.1 | Header + timer sentence wording | Locale strings in dialog component | `session-timeout-dialog.njk.test.ts` (en+cy); E2E text assertion |
| 1.1 | Continue extends | `POST /session-keep-alive` → middleware renews | Route test; JS test; E2E dialog closes, still signed in after more time passes |
| 1.1 | "You have been signed out, due to inactivity." | `/session-expired` copy | `session-expired/index.njk.test.ts`; E2E end state |
| 1.1 | Focus in, announced at intervals, keyboard close | `showModal`, heading focus, live region schedule, Esc = Continue | JS tests (focus, live-region text at 5:00/4:00/…/0:45/0:30/0:15, cancel); E2E `toBeFocused`, `Escape`; manual NVDA/VoiceOver |
| 1.1 | Verified + system admin | Role-agnostic dialog; both specs | E2E citizen + system admin journeys |
| 1.1 | MoJ pattern | Modal, heading, countdown, Continue, Esc | Design review against MoJ guidance |
| 1.2 | No aria-label; name "Cymraeg"; `lang="cy"` kept | Template + locale | `phase-banner-content.njk.test.ts`; E2E `getByRole("link", { name: "Cymraeg", exact: true })` |
| 1.2 | English toggle on Welsh pages | Same element | njk test with `cy` locale; E2E `name: "English"` |
| 1.2 | Voice Control / Dragon | — | Manual check (DoD) |
| 1.3 | Href is `#main-content` | Macro | `back-to-top.njk.test.ts`; 54 page template tests |
| 1.3 | Focus moves to main; next Tab = first focusable in main | `back-to-top.ts` | `back-to-top.test.ts`; E2E keyboard on courts-tribunals-list + manual-upload |
| 1.3 | Every page, citizen + admin | All 54 templates swapped | Grep gate in tasks: no `href="#top"` / `back-to-top-link` left |
| 1.4 | Text says opens in new tab | `feedback.newTab` inside link | njk test (en+cy); E2E `page-structure.spec.ts` |
| 1.4 | Name contains visible text | aria-label removed | njk test asserts no `aria-label` |
| 1.4 | Citizen + admin | Shared component | E2E on a public page + admin dashboard |
| 1.5 | Apply after last option | `appFilter` | `filter-panel.njk.test.ts` (button is last child of options); page tests |
| 1.5 | Hint message | `filterPanel.hint` first in options | njk test (en+cy) |
| 1.5 | No tabbing backwards | DOM order | E2E: tick option, `Tab` reaches Apply |
| 1.5 | Every filter panel | 7 consumers swapped | Grep gate: no `mojFilter` import left |
| 1.6 | Only heading is a link | Markup | 3 dashboard njk tests + new reference-data tiles assertion |
| 1.6 | Whole card clickable, one focusable link | `::after` overlay | njk: one `a` per tile. E2E: click on description navigates |
| 1.6 | Focus visible | `:focus-within` + govuk-link focus | Manual check + axe |
| 1.6 | Verified + admin dashboards | 4 templates | E2E account-home, admin-dashboard, system-admin-dashboard |

## 5. Test Scenarios (one per journey)

1. **Citizen session timeout journey (E2E, `@nightly`).** Use `loginAsTestUser`, go to `/account-home`, call `page.clock.install()`, then fast-forward 10 min.
   - Dialog visible, heading focused, wording as in the AC, axe passes.
   - Press Esc: dialog closes, focus returns, still signed in.
   - Fast-forward 10 min, dialog again. Switch to `?lng=cy` before this so it shows Welsh copy.
   - Press Continue, keep-alive returns 204.
   - Fast-forward 15 min: lands on `/session-expired` with "You have been signed out, due to inactivity.", axe passes.
2. **System admin session timeout journey (E2E, `@nightly`).** SSO login to `/system-admin-dashboard`, fast-forward, dialog shown, Continue extends. Let the timer lapse → `/session-expired` with SSO "Sign in" button.
3. **Session timeout error paths (unit, `session-timeout.test.ts`).**
   - Keep-alive returns 401 or opaqueredirect → navigates to current URL.
   - Network failure → dialog stays open with error text.
   - `storage` event from another tab closes the dialog.
   - `visibilitychange` after the deadline → immediate sign-out.
   - `localStorage` throws → in-memory fallback.
   - No `showModal` → no-op.
   - Live-region announcement schedule.
4. **Keep-alive route (unit).** Authenticated → 204 + `no-store`. Anonymous → 401. GET → not routed. No audit row for SYSTEM_ADMIN (`res.end`, not `send`).
5. **Phase banner (njk + E2E in `page-structure.spec.ts`).**
   - en: toggle has no aria-label, `lang="cy"`, text "Cymraeg"; feedback text "feedback (opens in a new tab)", `target="_blank"`, `rel` contains `noopener`.
   - cy: "English", `lang="en"`, Welsh feedback text.
   - Admin: no toggle; feedback text present.
6. **Back to top keyboard journey (E2E, inside the existing `courts-tribunals-list.spec.ts` journey and `admin/manual-upload.spec.ts`).** Focus the link and press Enter. `#main-content` is focused. Tab → the first focusable element in main is focused. axe passes. Welsh text checked.
7. **Filter journey (E2E, inside the existing `courts-tribunals-list.spec.ts` and `system-admin/audit-log-viewer.spec.ts`).**
   - Hint visible at the top.
   - Tick a checkbox, Tab forward to "Apply filters", press Enter → results filtered.
   - Welsh hint; axe passes.
   - On narrow viewport, "Hide filters" sits after Apply.
8. **Dashboard card journeys (E2E, update `verified-user/account-home.spec.ts`, `admin/admin-dashboard.spec.ts`, `system-admin/system-admin-dashboard.spec.ts`).**
   - Each tile exposes one link whose name equals the heading.
   - Clicking the description navigates.
   - Tab order is one stop per tile; axe passes.
9. **Template unit tests.**
   - `back-to-top.njk.test.ts`, `filter-panel.njk.test.ts`, `session-timeout-dialog.njk.test.ts`, `phase-banner-content.njk.test.ts`.
   - Updated page tests (54 back-to-top, 7 filter, 4 tile).
   - `base-template.njk.test.ts` (dialog included only when authenticated).
   - Locale key parity en/cy.

## CLARIFICATIONS NEEDED

- **C1 — RESOLVED 2026-11-24:** keep the existing per-role timings. Verified users (Azure B2C / CFT IDAM / Crime IDAM): warning after 40 min idle, 20 min countdown, signed out at 1 h. SSO admins (SYSTEM_ADMIN, INTERNAL_ADMIN_CTSC, INTERNAL_ADMIN_LOCAL): warning after 3 h 40 min, 20 min countdown, signed out at 4 h. Implemented in `libs/auth/src/session/timeout-tracker.ts`. Original question: **C1 (blocking for 1.1): timings.** The AC says the dialog appears "after 10 minutes of inactivity, with a 5 minute countdown", which means a **15 min** session. #764 set 60 min (verified) and 4 h (admins) for legacy parity one week ago. Should the 15 min apply to everyone (it cuts admin sessions from 4 h to 15 min)? Or should the existing timeouts stay, with the dialog shown 5 min before them? The plan sets the timings as constants, so either choice is a one-line change. The default below is the literal AC. This needs the PO and security to agree.
- **C2: what counts as "activity"?** The plan counts only server contact (page loads, Continue), so the dialog shows exactly when the server will expire the session. Under #764, mouse movement and scrolling also reset the client timer, which lets it drift from the server. Confirm that dropping this is acceptable.
- **C3 — RESOLVED 2026-11-24:** server-detected expiry keeps each provider's logout (CFT IDAM, B2C, Microsoft SSO) but returns to `/session-expired` via `buildSignOutRedirectUrl({ returnPath })`, so every inactivity sign-out shows "You have been signed out, due to inactivity." The client also schedules sign-out on its own deadline timer instead of the 1 s ticks. Original question: **C3: signed-out page on server-detected expiry.** This covers JS off, a sleeping laptop, or an expired Continue. Today that path lands on `/session-logged-out` ("You have been signed out"), not the AC message. Should the middleware use `buildSessionExpiredRedirectUrl` so every inactivity sign-out shows "You have been signed out, due to inactivity."?
- **C4 (1.5): top button.** The AC says the message is "displayed on the top filter button". The mock-up says the button is *moved* to the bottom and the message sits at the top. The plan follows the mock-up: hint at the top, one Apply button at the bottom. Confirm that the top button is removed rather than kept as well.
- **C5 (Welsh).** New strings need translation:
  - Dialog heading, timer sentence and units
  - "(opens in a new tab)": proposed "(yn agor mewn tab newydd)"; the repo only has "(yn agor mewn ffenestr newydd)"
  - Filter hint
  - New signed-out wording
  - Keep-alive error line

  Also confirm the English: the mock-up says "(opens in a new tab)" but the AC example says "(opens in new tab)".
- **C6 (1.3): visual change.** Standardising the 54 links to one markup changes the arrow glyph or SVG on the cookie, accessibility and publishing policy pages. Is that acceptable?
- **C7 (1.1): Sign out link.** MoJ's timeout warning usually offers "Sign out" next to Continue. The AC and mock-up only show Continue. The plan adds no Sign out link unless asked.
- **C8: item 3.3 coordination.** Account home is also changed by Package 3 item 3.3. Agree merge order with that owner.
