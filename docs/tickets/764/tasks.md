# Tasks — #764: Check session timeout login for CFT, Crime and MOJ SSO IDAM

Plan: `docs/tickets/764/plan.md`. The decision is to follow legacy pip-frontend: 60 min, or 4h for admins, with a warning page 20 min before. Re-verified at HEAD `56d9d3ac6`.

## Implementation Tasks

### Thresholds: one source (D3, D4)
- [x] In `libs/auth/src/session/timeout-tracker.ts`:
  - add `SESSION_TIMEOUT_MS` (60 min), `ADMIN_SESSION_TIMEOUT_MS` (240 min), exported `SESSION_WARNING_LEAD_MS` (20 min), and `ADMIN_ROLES` (`SYSTEM_ADMIN`, `INTERNAL_ADMIN_CTSC`, `INTERNAL_ADMIN_LOCAL` from `USER_ROLES`)
  - add `getSessionTimeoutMs(role)`
  - make `isSessionExpired` and `getTimeUntilExpiry` take the role
- [x] Delete `getTimeoutConfig` (and the `SESSION_TIMEOUT_*` env reads) and `isSessionApproachingExpiry`; update `libs/auth/src/index.ts` exports
- [x] Rewrite `timeout-tracker.test.ts`: 60 min for `VERIFIED` and an undefined role, 240 min for each admin role, the boundary cases, and a result that is never negative

### Expiry redirect and B2C logout (shared, libs/auth)
- [x] Create `libs/auth/src/b2c/logout-url.ts` with `buildB2cLogoutUrl(postLogoutRedirectUri)`, extracted from `apps/web/src/pages/(auth)/logout/index.ts:46-54`; switch the logout page to it; add a test
- [x] Create `libs/auth/src/session/expiry-redirect.ts`:
  - `RE_SIGN_IN_URLS`: `CFT`→`/cft-login`, `CRIME`→`/crime-login`, `AAD`→`/b2c-login`, `SSO`→`/login`
  - `getRedirectType(provenance)`: `PI_AAD`→AAD, `CRIME_IDAM`→CRIME, `SSO`→SSO, otherwise CFT
  - `buildSessionExpiredRedirectUrl({ provenance, locale, origin })`: CFT `endSession` (via `buildCftIdamLogoutUrl`) only for `CFT_IDAM`; B2C logout for `PI_AAD`; local for Crime and SSO; every result targets `/session-expired?lng=..&reSignInUrl=..`
- [x] Add `expiry-redirect.test.ts` covering every provenance and the unknown provenance
- [x] Create `libs/auth/src/session/continue-path.ts` with `resolveContinuePath(raw, role)`:
  - accept only a same-origin relative path (a string of 2048 characters or fewer, starting with `/`, not `//`, no `\`, origin unchanged after `new URL` parsing)
  - reject `/session-expiring`, `/session-expired*` and `/logout`
  - fall back to the role landing page: `/system-admin-dashboard`, `/admin-dashboard` or `/account-home`
- [x] Add `continue-path.test.ts` covering the open-redirect and XSS cases and the fallbacks

### Middleware (D6, D8)
- [x] In `libs/auth/src/middleware/session-timeout.ts`:
  - remove the `PUBLIC_ROUTES` skip list, so every signed-in request renews or enforces, as legacy
  - check expiry with `req.user.role`
  - on expiry, follow legacy `logOut(isSessionExpired=false)`: `req.logout` → destroy → clear cookie → redirect to `buildSignOutRedirectUrl`, landing on `/session-logged-out`
  - set `res.locals.sessionIdleMs = timeout - SESSION_WARNING_LEAD_MS`
  - drop `sessionTimeoutMs`
- [x] Extend `session-timeout.test.ts`:
  - 59/60 min for a verified user and 239/240 min for an admin
  - the same result for `CFT_IDAM`, `CRIME_IDAM` and `PI_AAD`
  - the redirect URL for each provenance, including `lng`
  - `sessionIdleMs`
  - `/session-expiring` is tracked
  - a redirect still happens on a `destroy` error
  - `/`, `/sign-in`, `/session-expired` and `/logout` renew; an expired session on `/` is signed out
- [x] Add `libs/auth/src/session/sign-out-redirect.ts` (+ test) with `buildSignOutRedirectUrl`, moved from `/logout`; switch `apps/web/src/pages/(auth)/logout/index.ts` (+ test) to use it
- [x] Delete `req.session.lastActivity = Date.now();` from `apps/web/src/pages/(auth)/login/return/index.ts:123`, and its test (lines 251-255)

### Session cookie (D5)
- [x] Change `libs/web-core/src/middleware/session-stores/redis-store.ts:22` to `maxAge: options.cookieMaxAge` (no 4h default), giving a browser-session cookie with the Redis TTL defaulting to 24h
- [x] Update `redis-store.test.ts`: `maxAge` is undefined by default, an explicit `cookieMaxAge` and `sessionOptions` still apply, and the other assertions are unchanged

### Body attribute and client (D1, D3, D7)
- [x] Add a root-level `{% set bodyAttributes = { "data-session-idle-ms": { value: …, optional: true } } %}` to `libs/web-core/src/views/layouts/base-template.njk`, emitted only when `isAuthenticated` and not `isSessionExpiringPage`. It is a `set`, not a block
- [x] Create `libs/web-core/src/views/layouts/base-template.njk.test.ts` covering present, anonymous, unset value, expiring page, and the `0` case
- [x] Rewrite `apps/web/src/assets/js/session-timeout.ts`:
  - delete the modal, countdown, `fetch`, translations and constants; replace the existing input listeners with legacy-parity `resetIdleTimeout()` listeners on `load`, `click`, `mousedown`, `mousemove`, `keypress`, `scroll`, `touchstart`
  - idle mode: write `localStorage.idleExpiry` on load; when the timer fires, re-check, then reschedule or `location.assign("/session-expiring?currentPath=" + encodeURIComponent(pathname + search))`
  - expiring mode (`#session-expiring`): at `idleExpiry + warningLeadMs`, re-check, then reschedule or go to `/session-expired-logout?redirectType=…`
  - wrap `localStorage` in `try`/`catch` with an in-memory fallback
- [x] Rewrite `session-timeout.test.ts`:
  - no-op guards
  - writes `idleExpiry`
  - idle redirect with an encoded path
  - cross-tab reschedule in both modes
  - each input event (`click`, `mousedown`, `mousemove`, `keypress`, `scroll`, `touchstart`) resets the timer and rewrites `idleExpiry`
  - logout redirect
  - `localStorage` throwing
- [x] Delete `apps/web/src/assets/css/session-timeout.scss` and its `@use` in `apps/web/src/assets/css/web.scss`

### `/session-expiring` page — TEMPLATE SOURCE: pip-frontend `session-expiring.njk`
- [x] Create `apps/web/src/pages/(auth)/session-expiring/index.ts`:
  - `GET` handler with no `requireAuth()`; no signed-in user renders 400 `errors/common`, as legacy `isPermittedAnyRole` (review H1)
  - `continueHref` from `resolveContinuePath`
  - `redirectType` from `getRedirectType`
  - pass `back: t.backButton`, `warningLeadMs` and `isSessionExpiringPage: true`
- [x] Create `index.njk`: `h1.govuk-heading-l` header, `govuk-body` continueMessage, `govukButton` Continue linking to `continueHref`, and a hidden `#session-expiring` marker with `data-warning-lead-ms` and `data-redirect-type`; no inline script
- [x] Create `en.ts` and `cy.ts` with the legacy copy verbatim (`pageTitle` without the service and GOV.UK suffix, `header`, `continueMessage`, `continue`, `backButton`)
- [x] Add `index.test.ts` (guard, validated or fallback path, `redirectType` per provenance, Welsh) and `index.njk.test.ts` (structure, back link present, marker attributes, no body idle attribute, Welsh, key parity)

### `/session-expired-logout`
- [x] Create `apps/web/src/pages/(auth)/session-expired-logout/index.ts` (GET):
  - signed in: `req.logout`, then `session.destroy`, then `clearCookie("connect.sid")`, then redirect to `buildSessionExpiredRedirectUrl` (origin from `req.protocol` and `host`)
  - signed out with a valid `redirectType`: redirect to `/session-expired?lng=..&reSignInUrl=<key>`
  - invalid `redirectType`: render the 400 error page
- [x] Add `index.test.ts` covering all three branches; the query is ignored when signed in

### `/session-expired` page (D8, D9) — TEMPLATE SOURCE: pip-frontend `session-expired.njk`
- [x] Change `apps/web/src/pages/(auth)/session-expired/index.ts`:
  - `t` from `res.locals.locale`
  - `signInUrl = RE_SIGN_IN_URLS[reSignInUrl]` for a valid key, otherwise `res.status(400).render("errors/common", …)` (legacy parity)
  - render `{ en, cy, t, signInUrl }` with no `back`
- [x] Rewrite `index.njk`: empty `backLink` block, `h1.govuk-heading-l` header, `govuk-body` detail, `govuk-body` signInMessage, `govukButton` signIn linking to `signInUrl`; no panel
- [x] Replace `en.ts` and `cy.ts` with the legacy keys and copy (`pageTitle`, `header`, `detail`, `signInMessage`, `signIn`)
- [x] Update `index.test.ts` (each `reSignInUrl`, invalid or missing renders 400 `errors/common`, Welsh from `res.locals.locale`) and `index.njk.test.ts` (one h1, no `.govuk-panel`, no back link, two paragraphs, button `href`, Welsh, key parity)

### E2E (plan §6.1)
- [ ] **DEFERRED with the E2E spec (removed 2026-11-02):** Create `libs/test-support/src/routes/test-support/session/expire.ts`: `POST`, `401` when anonymous, otherwise set `lastActivity = 1` and save; plus a unit test
- [ ] **DEFERRED (removed for now, 2026-11-02):** Create `e2e-tests/tests/session-timeout.spec.ts` using `context.clock`. Fix review H2/H3 when it is reinstated:
  - (1) SSO admin: two-tab coordination, warning at 3h40, Axe, Welsh, keyboard Continue back to the same path, sign-out at 4h on `/session-expired?…reSignInUrl=SSO` (no panel, no back link, button links to `/login`), Axe, and the `currentPath` open-redirect fallback
  - (2) CFT IDAM verified user: warning at 40 min, Axe, sign-out at 60 min through IDAM `endSession` to `reSignInUrl=CFT` (button links to `/cft-login`), then the server-side expiry path through the test-support hook

### Verification
- [x] Run `yarn lint:fix` and `yarn test` from the root; both clean
- [ ] Run `yarn test:e2e:all`, including the new spec (deferred with the spec)
- [ ] Manual screen reader and keyboard pass on `/session-expiring` and `/session-expired`
- [ ] Manual STG (aat) run for CFT IDAM, Crime IDAM, B2C and MOJ SSO:
  - warning at 40:00 (SSO 3:40:00)
  - Continue returns you to the same page
  - sign-out at 60:00 (SSO 4:00:00) on `/session-expired` with the correct provider button
  - CFT asks for credentials again and B2C has ended, but SSO is not signed out of Microsoft
  - JavaScript-disabled expiry
  - two-tab coordination
  - browser-close sign-out
  - no ingress or Front Door cut-off
- [ ] Post the observed timings per provider as a comment on #764

### Clarifications (plan §7)
- [ ] Confirm that the B2C and CFT IDAM post-logout redirect URIs accept `/session-expired?lng=..&reSignInUrl=..` before deploy (C5)
- [ ] Confirm the removal of the env-var overrides (C1)
- [ ] Raise a separate ticket for `<html lang>` (C6)
