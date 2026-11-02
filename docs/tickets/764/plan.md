# Technical Plan — #764: Check session timeout login for CFT, Crime and MOJ SSO IDAM

**Decision (user, via coordinator):** CaTH must **follow the legacy pip-frontend session-timeout behaviour**. This plan replaces the earlier
"30/25 uniform plus modal plus `/api/extend-session`" plan. The spec comment's modal, extend API and 30-minute figure no longer apply.

## Investigation findings (re-verified at HEAD 56d9d3ac6)

HEAD of `feature-764-session-timeout` is `56d9d3ac6b25574215a3c89ed3d4e21c9c18dd5b`, 160 commits after the spec's `3c7178c`.
The legacy facts come from `hmcts/pip-frontend` master (`SessionManagementService.ts`, `views/template.njk`, `session-expiring.njk`,
`session-expired.njk`, `SessionExpiredController.ts`, `helpers/consts.ts`) and were checked against the local checkout.

### Timings: today versus target

| Role (CaTH `USER_ROLES`) | Provenance(s) | **Today at HEAD** | **Target (legacy)**: warning page / sign-out |
| --- | --- | --- | --- |
| `VERIFIED` | `CFT_IDAM`, `CRIME_IDAM`, `PI_AAD` | Warning at 25 min, but never shown (D1). Sign-out at 30 min | `/session-expiring` at **40 min** idle. Sign-out at **60 min** |
| `SYSTEM_ADMIN`, `INTERNAL_ADMIN_CTSC`, `INTERNAL_ADMIN_LOCAL` | `SSO` | same | `/session-expiring` at **3h40** idle. Sign-out at **4h** |

- Legacy `allAdminRoles` lists five roles. CaTH has three (`libs/account/src/roles.ts`); there is no `INTERNAL_SUPER_ADMIN_CTSC` or `INTERNAL_SUPER_ADMIN_LOCAL`.
  Legacy's client used a substring check (`'ADMIN' in user.roles`). CaTH uses an exact role list on both server and client, so the two cannot disagree (C4).
- Today the timing has no provenance or role branch (`libs/auth/src/middleware/session-timeout.ts`). Defaults are `timeout-tracker.ts:3-4`.
  `SESSION_TIMEOUT_*` is set nowhere: not in Helm, config, the umbrella chart or `cnp-flux-config`.
- IDAM token lifetimes do not matter in either system. `expires_in` is typed but never read.
- Sign-out destination by provenance in the target model:

| Provenance | Logout on expiry | Lands on | "Sign in" button |
| --- | --- | --- | --- |
| `CFT_IDAM` | CFT IDAM `endSession` (reuse `buildCftIdamLogoutUrl`, #1154) | `/session-expired?lng=..&reSignInUrl=CFT` | `/cft-login` |
| `CRIME_IDAM` | Local only | `/session-expired?lng=..&reSignInUrl=CRIME` | `/crime-login` |
| `PI_AAD` | B2C `oauth2/v2.0/logout` (**new on expiry**; today it is local only) | `/session-expired?lng=..&reSignInUrl=AAD` | `/b2c-login` |
| `SSO` | Local only (legacy deliberately skips the Microsoft logout on expiry) | `/session-expired?lng=..&reSignInUrl=SSO` | `/login` |

### Defect status under the legacy model

| ID | At HEAD | Under this plan |
| --- | --- | --- |
| D1 Client timeout never starts (no `data-authenticated`) | Holds (`session-timeout.ts:44`. `bodyAttributes` is a **variable** in `govuk-frontend@6.2.0` `template.njk:34`, not a block) | **Fixed.** `base-template.njk` sets `bodyAttributes` with the user's idle duration |
| D2 `POST /api/extend-session` missing | Holds | **Dropped.** Legacy has no extend API, and Continue is a plain GET link. The `fetch` code is deleted |
| D3 Thresholds duplicated in the client | Holds (`session-timeout.ts:6-7`. `res.locals.sessionTimeoutMs` at middleware `:48` is unread) | **Fixed.** Durations live only in `timeout-tracker.ts`. The server passes the per-user idle duration to the client |
| D4 `isSessionApproachingExpiry` dead | Holds (`timeout-tracker.ts:37`) | **Fixed** (deleted) |
| D5 4h cookie cap | Premise wrong at HEAD: the cookie already rolls, because `express-session@1.19.0` re-sends it whenever the session is modified (`index.js:485-487`) | **Becomes real under the target:** the admin timeout (4h) equals today's cookie `maxAge` (4h), so the cookie would die at the same instant and every admin expiry would arrive anonymous. **Fixed** by removing `maxAge`, as legacy does (§2.6) |
| D6 `lastActivity` set for B2C only | Holds (`login/return/index.ts:123`) | **Fixed.** The middleware is the only writer |
| D7 Client input events reset timers without the server | Holds (`session-timeout.ts:116-127`) | **Follows legacy** (decision): the client idle timer resets on `load`, `click`, `mousedown`, `mousemove`, `keypress`, `scroll` and `touchstart`, exactly as pip-frontend `template.njk`. The browser/server drift this allows (a reader with no requests for over 60 min, or 4h for admins, is signed out on the next request without a warning) is accepted, as in legacy. The server-side expiry still lands on `/session-expired`, so the user gets an explanation |
| D8 `/session-expired` reads `req.query.lng` | Holds (`index.ts:9`) | **Fixed.** Uses `res.locals.locale` |
| D9 Green confirmation panel | Holds (`index.njk:5-8`) | **Fixed.** pip template, no panel |

Other HEAD findings that still apply:

- **N1. The `locale` cookie is `httpOnly`** (`locale-middleware.ts:48-53`), so client JavaScript cannot read it. The client is given the locale by the server.
- **N2.** Today the client timer goes straight to the public `/session-expired`, without destroying the session or doing the CFT `endSession` hop. This is replaced by `/session-expired-logout`, which runs on the server.
- **N7.** `base-template.njk:34-39` always renders a "Back" link. `/session-expired` must override it to empty (legacy has none there). `/session-expiring` keeps it (legacy `goBack`).
- **N8.** `<html lang>` is always `en` (`htmlLang` is never set). Out of scope (C6).
- The Postgres session store is gone (`93a528c50`). Redis is the only store.
- CSP `script-src` is `'self'` plus a per-request nonce (`helmet-middleware.ts:34-38`), so legacy's inline scripts would need the nonce. This plan uses the bundled asset instead.

## 1. Technical Approach

The legacy model, made safe and kept to one source of truth:

1. **Server (authoritative).** `sessionTimeoutMiddleware` enforces a **role-based** inactivity timeout: 60 min, or 240 min for admins.
   Every tracked request by a signed-in user refreshes `lastActivity`. This is the same as legacy's `sessionExpires = now + expiry`, but the role is applied when the check runs.
   On expiry it signs the user out with the **provenance-specific** logout and lands on `/session-expired?reSignInUrl=…`.
2. **Client (warning only).** On each authenticated page load, the bundled `session-timeout.ts` writes `localStorage.idleExpiry = now + idleMs`.
   `idleMs` is the timeout minus 20 min, sent by the server in a body attribute. The `localStorage` value is shared across tabs, as in legacy.
   When the timer fires, the client re-reads `idleExpiry`. It then either reschedules (another tab was active) or navigates to `/session-expiring?currentPath=…`.
3. **`/session-expiring` (full page, migrated from pip).** Loading it is a tracked request, so it renews the server session, as legacy does.
   "Continue" is a link back to the **validated** `currentPath`. The bundled script then waits until `idleExpiry + 20 min` and navigates to `/session-expired-logout?redirectType=…`.
4. **`/session-expired-logout`.** Logs the user out by provenance. If the session has already gone (another tab), it uses the allow-listed `redirectType`.
5. **`/session-expired` (migrated from pip).** Shows a provider-specific "Sign in" button chosen by the allow-listed `reSignInUrl`.
6. **Cookie.** Remove `maxAge`, giving a browser-session cookie as in legacy. The Redis TTL defaults to 24h, comfortably above 4h.

There is no modal, no extend API, and no environment-variable thresholds.
The server timeout alone gives a complete no-JS experience: after 60 min or 4h, the next request lands on `/session-expired`.

## 2. Implementation Details

**TEMPLATE SOURCE: migrate from pip-frontend src/main/views/session-expiring.njk and src/main/views/session-expired.njk.**
Both get CaTH's `base-template.njk` and `page_content` block. Legacy inline `<script>` blocks are moved into the bundled `apps/web/src/assets/js/session-timeout.ts` (§4).
pip's `session-logged-out.njk` is not migrated; CaTH's `/session-logged-out` is out of scope.

### 2.1 Files

**Added**

| File | Purpose |
| --- | --- |
| `libs/auth/src/session/expiry-redirect.ts` (+ `.test.ts`) | `RE_SIGN_IN_URLS` (`CFT`→`/cft-login`, `CRIME`→`/crime-login`, `AAD`→`/b2c-login`, `SSO`→`/login`). `getRedirectType(provenance)`. `buildSessionExpiredRedirectUrl({ provenance, locale, origin })`, which returns the provenance logout URL from the table above |
| `libs/auth/src/session/continue-path.ts` (+ `.test.ts`) | `resolveContinuePath(raw, role)`: same-origin relative path validation with a role-based fallback (§2.4) |
| `libs/auth/src/b2c/logout-url.ts` (+ `.test.ts`) | `buildB2cLogoutUrl(postLogoutRedirectUri)`, extracted from `apps/web/src/pages/(auth)/logout/index.ts:46-54` so logout and expiry share it |
| `apps/web/src/pages/(auth)/session-expiring/{index.ts,index.njk,en.ts,cy.ts,index.test.ts,index.njk.test.ts}` | Legacy full-page warning |
| `apps/web/src/pages/(auth)/session-expired-logout/{index.ts,index.test.ts}` | Logout on client-driven expiry |
| `libs/web-core/src/views/layouts/base-template.njk.test.ts` | Body-attribute contract |
| `libs/test-support/src/routes/test-support/session/expire.ts` (+ test) | Non-prod E2E hook (§2.8) |
| `e2e-tests/tests/session-timeout.spec.ts` | Journeys (§5.1) |

**Changed**

| File | Change |
| --- | --- |
| `libs/auth/src/session/timeout-tracker.ts` | Constants `SESSION_TIMEOUT_MS = 3600000`, `ADMIN_SESSION_TIMEOUT_MS = 14400000`, `SESSION_WARNING_LEAD_MS = 1200000`, and `ADMIN_ROLES` from `USER_ROLES`. Add `getSessionTimeoutMs(role)`. `isSessionExpired` and `getTimeUntilExpiry` take the role. **Delete** `getTimeoutConfig` (and the `SESSION_TIMEOUT_WARNING_MS`/`SESSION_TIMEOUT_LOGOUT_MS` reads) and `isSessionApproachingExpiry` |
| `libs/auth/src/session/timeout-tracker.test.ts` | Rewrite for the role-based model |
| `libs/auth/src/middleware/session-timeout.ts` | Move `PUBLIC_ROUTES` to module top. Pass the role into the check. On expiry, destroy the session and redirect to `buildSessionExpiredRedirectUrl` using `res.locals.locale`. Set `res.locals.sessionIdleMs = remaining - SESSION_WARNING_LEAD_MS` (floored at 0). Drop `sessionTimeoutMs` |
| `libs/auth/src/middleware/session-timeout.test.ts` | Extend (§5.2) |
| `libs/auth/src/index.ts` | Remove the `getTimeoutConfig` export (no external users, checked by grep). Add exports for `SESSION_WARNING_LEAD_MS`, `buildSessionExpiredRedirectUrl`, `getRedirectType`, `RE_SIGN_IN_URLS`, `resolveContinuePath` and `buildB2cLogoutUrl` |
| `apps/web/src/pages/(auth)/logout/index.ts` | Use `buildB2cLogoutUrl` (no behaviour change) |
| `libs/web-core/src/views/layouts/base-template.njk` | Root-level `{% set bodyAttributes %}` (§2.5) |
| `libs/web-core/src/middleware/session-stores/redis-store.ts` (+ test) | `maxAge: options.cookieMaxAge` with no 4h default (§2.6) |
| `apps/web/src/assets/js/session-timeout.ts` | **Rewritten**: idle redirect and expiring-page logout (§2.7). Modal, countdown and `fetch` are deleted. The old input-event listeners are replaced by legacy-parity `resetIdleTimeout()` listeners (`load`, `click`, `mousedown`, `mousemove`, `keypress`, `scroll`, `touchstart`; §2.7 step 4) |
| `apps/web/src/assets/js/session-timeout.test.ts` | Rewrite |
| `apps/web/src/assets/css/web.scss` | Remove `@use "./session-timeout.scss";` |
| `apps/web/src/pages/(auth)/session-expired/{index.ts,index.njk,en.ts,cy.ts,*.test.ts}` | Legacy content and structure. `reSignInUrl` button. `res.locals.locale` |
| `apps/web/src/pages/(auth)/login/return/index.ts` (+ test) | Delete `req.session.lastActivity = Date.now();` (line 123) and its test (lines 251-255) |

**Removed:** `apps/web/src/assets/css/session-timeout.scss`.

**Not created** (previous plan): `libs/auth/src/routes/api/extend-session.ts`, the `apiRoutes` export in `libs/auth/src/config.ts`, and the `app.ts` registration.
`apps/web/src/app.ts` is **unchanged**. There are no Helm or `.env.example` changes. There are **no schema changes**.

### 2.2 Thresholds: one source

`timeout-tracker.ts` is the only place the numbers exist:

```ts
const SESSION_TIMEOUT_MS = 60 * 60 * 1000;
const ADMIN_SESSION_TIMEOUT_MS = 4 * SESSION_TIMEOUT_MS;
export const SESSION_WARNING_LEAD_MS = 20 * 60 * 1000;
const ADMIN_ROLES: readonly string[] = [USER_ROLES.SYSTEM_ADMIN, USER_ROLES.INTERNAL_ADMIN_CTSC, USER_ROLES.INTERNAL_ADMIN_LOCAL];

export function getSessionTimeoutMs(role: string | undefined): number { ... }
```

The `SESSION_TIMEOUT_WARNING_MS` and `SESSION_TIMEOUT_LOGOUT_MS` overrides are **removed**:

- Legacy hardcodes the values.
- The overrides are set nowhere.
- A single override pair cannot express a role-based model.
- Removing them also removes the `NaN`-disables-timeout hazard and the hardening work the previous plan needed for it.

If ops want the values tunable, see C1. `@hmcts/auth` already depends on `@hmcts/account` for `USER_ROLES` (`index.ts:2`), so there is no new dependency.

### 2.3 `sessionTimeoutMiddleware`

- Keep `PUBLIC_ROUTES = ["/", "/sign-in", "/session-expired", "/logout", "/health"]`, moved to the module top.
  Legacy renews on every route. Keeping CaTH's skip list is a minor deviation with no user impact, because the next tracked request still enforces the timeout.
- `/session-expiring` and `/session-expired-logout` are **tracked**:
  - Loading `/session-expiring` renews the server session, as in legacy, so the 20-minute client wait can never outlast the server.
  - If `/session-expired-logout` arrives after the server has already expired the session, the middleware does the same provenance redirect itself.
- On expiry, for a server-detected expiry (no JS, or a stale tab):
  1. Read `provenance` and `locale` before calling destroy.
  2. Call `req.session.destroy`. On error, log `Session destruction error:` and still redirect.
  3. Redirect to `buildSessionExpiredRedirectUrl`.

  Legacy's quirk of sending a server-detected expiry to the *logged-out* flow is **not copied** (§4).
- Otherwise call `updateLastActivity` and set `res.locals.sessionIdleMs`.

### 2.4 `/session-expiring` page

The controller is `export const GET`, with no `requireAuth()`. As legacy `isPermittedAnyRole`, a request with no signed-in user renders 400 `errors/common`. It does not redirect to sign-in, so the page is never saved as `session.returnTo`. Using `requireAuth()` would make the B2C and SSO return handlers send a re-signed-in user back to this page, where the stale `idleExpiry` would sign them out at once (review H1).

- `continueHref = resolveContinuePath(req.query.currentPath, req.user.role)`. The function:
  - accepts only a string of 2048 characters or fewer, starting with `/`, not `//`, with no `\`;
  - parses it with `new URL(raw, "http://cath.invalid")` and accepts it only if the origin is unchanged;
  - rejects `/session-expiring`, `/session-expired*` and `/logout`;
  - returns `pathname + search`.
  - If anything fails, it falls back to the role landing page: `/system-admin-dashboard` for `SYSTEM_ADMIN`, `/admin-dashboard` for internal admins, `/account-home` otherwise.

  These are the same defaults as `sso/return/index.ts:53-58`. Legacy put `currentPath` into `href` unvalidated, which is an open-redirect and `javascript:` sink. This is a **deliberate deviation**.
- `redirectType = getRedirectType(req.user.provenance)`. Legacy maps `PI_AAD`→`AAD`, `CRIME_IDAM`→`CRIME`, `SSO`→`SSO`, and anything else→`CFT`.
- Render `session-expiring/index` with `{ en, cy, t, back: t.backButton, continueHref, redirectType, warningLeadMs: SESSION_WARNING_LEAD_MS, isSessionExpiringPage: true }`.
- Template (pip structure):
  - the controller passes `back: t.backButton`, so the base-template `govukBackLink` renders and calls `history.back()`;
  - `h1.govuk-heading-l` `t.header`;
  - `p.govuk-body` `t.continueMessage`;
  - `govukButton({ text: t.continue, href: continueHref })`;
  - a marker element `<div id="session-expiring" hidden data-warning-lead-ms="…" data-redirect-type="…"></div>` for the bundled script.
- No inline script. The page's `<body>` gets **no** `data-session-idle-ms`: the controller passes `isSessionExpiringPage: true`, which `base-template.njk` checks. This matches legacy, where this page's `bodyEnd` does not reset `idleExpiry`.

| Key | `en` (legacy verbatim) | `cy` (legacy verbatim) |
| --- | --- | --- |
| `pageTitle` | Session expiring - You will soon be signed out due to inactivity | Sesiwn yn dod i ben - Byddwch yn cael eich allgofnodi’n fuan o ganlyniad i wneud dim |
| `header` | You will soon be signed out due to inactivity | Byddwch yn cael eich allgofnodi’n fuan o ganlyniad i wneud dim |
| `continueMessage` | To remain signed in, please click below | I atal hyn rhag digwydd, cliciwch isod |
| `continue` | Continue | Parhau |
| `backButton` | Back | Yn ôl |

`pageTitle` drops legacy's " - Court and Tribunal Hearings - GOV.UK" suffix, because `page-title.njk` appends `serviceName` and `govUk` itself.

### 2.5 Body attributes (`base-template.njk`)

Add this at root level, next to `{% set govukRebrand = true %}`. It is a `set`, not a block:

```njk
{% set bodyAttributes = {
  "data-session-idle-ms": { value: sessionIdleMs if (isAuthenticated and not isSessionExpiringPage) else false, optional: true }
} %}
```

- Use the `optional: true` form, so that `false` and `undefined` are omitted.
  If `sessionIdleMs` is `0`, check how `govukAttributes` renders it. `0` is only possible for a stale session at the expiry edge, and the client treats a missing value as "do nothing". Add a test for whichever behaviour results.
- `sessionIdleMs` is set only on tracked routes, so public pages reached while signed in start no timer.
- No locale attribute is needed. The client navigates to server routes, and the server reads the locale from the session or cookie.

### 2.6 Session cookie

Change `redis-store.ts:22` to `maxAge: options.cookieMaxAge`, with no default. `apps/web/src/app.ts:114` passes none, so the result is a **browser-session cookie**, as in legacy.

- **Redis TTL.** `connect-redis@9` falls back to `ttl = 86400` when `cookie.expires` is unset (`connect-redis.js:20`). Every save or touch refreshes it.
  That gives 24h of idle, well above the 4h admin timeout, so the server check always sees an expired session before Redis drops it. This **fixes D5 under the target model**.
- **Why not a `maxAge` above 4h:** it would be a second number to keep in sync with `ADMIN_SESSION_TIMEOUT_MS`, and it would depart from legacy.
- **Consequences:**
  - Closing the browser ends the session, unless the browser restores session cookies, as Chrome's "continue where you left off" does. The server timeout remains the real control.
  - Anonymous sessions also become browser-session scoped.
  - With no expiry, `express-session` sends `Set-Cookie` only when it creates the session, which is fine because nothing needs refreshing.
- `secure`, `httpOnly`, `sameSite: "lax"`, `resave: false` and `saveUninitialized: false` are unchanged.

### 2.7 Client module (`apps/web/src/assets/js/session-timeout.ts`)

It is bundled through `web.ts:9`, so it needs no nonce. Two modes:

- **Idle mode.** Runs when `<body data-session-idle-ms>` parses to a finite number `> 0`.
  1. On load, write `idleExpiry = now + idleMs` to `localStorage`.
  2. Schedule `check()` at `idleMs`.
  3. `check()` re-reads `idleExpiry`. If it is still in the future, reschedule for the difference (another tab loaded a page).
     Otherwise run `location.assign("/session-expiring?currentPath=" + encodeURIComponent(location.pathname + location.search))`.
  4. **Input-event resets, as legacy:** `load`, `click`, `mousedown`, `mousemove`, `keypress`, `scroll` and `touchstart` (capture phase, on `document`; `load` on `window`) call `resetIdleTimeout()`. That clears the timer, reschedules it at `idleMs`, and rewrites `idleExpiry = now + idleMs`. `idleMs` is the value from the body attribute, which on a tracked page load equals the full per-role idle duration (40 min, or 3h40).
- **Expiring mode.** Runs when `#session-expiring` exists.
  1. Read `warningLeadMs` and `redirectType`.
  2. Set `deadline = idleExpiry + warningLeadMs`. If `idleExpiry` is missing or invalid, use `now + warningLeadMs`.
  3. Schedule a check. If the deadline has been extended by another tab, reschedule. Otherwise run `location.assign("/session-expired-logout?redirectType=" + encodeURIComponent(redirectType))`.
- Wrap `localStorage` access in `try`/`catch`; Safari private mode and blocked storage throw. Fall back to an in-memory value, which only loses the cross-tab coordination.
- The `idleExpiry` key holds only a timestamp, so there is no personal data in storage.
- With either attribute missing or invalid, the module does nothing.

### 2.8 `/session-expired-logout`

The controller is `export const GET`, with no `requireAuth`, because the session may already be gone.

- **Signed in:**
  1. Read `provenance` and `locale`.
  2. Call `req.logout`.
  3. Call `req.session.destroy`.
  4. Clear the `connect.sid` cookie, as `/logout` does.
  5. Redirect to `buildSessionExpiredRedirectUrl({ provenance, locale, origin })`.

  `origin` is `${req.protocol}://${req.get("host")}`, the same as `logout/index.ts:12-16`, with `trust proxy` set. The query is ignored.
- **Not signed in:**
  - If `redirectType` is one of the `RE_SIGN_IN_URLS` keys, redirect to `/session-expired?lng=<locale>&reSignInUrl=<key>`. This is the legacy "signed out in another tab" case.
  - Otherwise render the 400 error page, matching legacy's error page.

The values are allow-listed and never echoed into a URL unchecked. This is a state-changing GET, the same as legacy and CaTH's `/logout`, so the most a cross-site request can do is sign the user out (C3).

`libs/test-support/src/routes/test-support/session/expire.ts` adds `POST /test-support/session/expire`. It is mounted only in non-prod or when `ENABLE_TEST_SUPPORT` is set (`app.ts:224`).
It returns `401` if the caller is not authenticated. Otherwise it sets `req.session.lastActivity = 1` and saves, so the caller's own next tracked request takes the server-side expiry path.

### 2.9 `/session-expired` page

- **Controller:**
  - `t` comes from `res.locals.locale`.
  - `reSignInUrl` is the query value, used only if it is a key of `RE_SIGN_IN_URLS`.
  - `signInUrl = RE_SIGN_IN_URLS[key]`.
  - If the key is missing or invalid, render `res.status(400).render("errors/common", …)`, as legacy (`SessionExpiredController` renders `error`). Same handling as an invalid `redirectType` on `/session-expired-logout`. Every post-deploy path sets `reSignInUrl`, and both IdPs preserve it (verified, C5).
  - Render `{ en, cy, t, signInUrl }` and never set `back`.
- **Template (pip):** `{% block backLink %}{% endblock %}`, then `h1.govuk-heading-l` `t.header`, `p.govuk-body` `t.detail`, `p.govuk-body` `t.signInMessage`, and `govukButton({ text: t.signIn, href: signInUrl })`. No panel.

| Key | `en` (legacy verbatim) | `cy` (legacy verbatim) |
| --- | --- | --- |
| `pageTitle` | Session expired - You have been signed out due to inactivity | Sesiwn wedi dod i ben - Rydych wedi cael eich allgofnodi o ganlyniad i wneud dim |
| `header` | You have been signed out due to inactivity | Rydych wedi cael eich allgofnodi o ganlyniad i wneud dim |
| `detail` | This has been for your security and for the security of the individuals included within our service. | Gwnaed hyn i’ch diogelu chi ac i ddiogelu eraill sy’n defnyddio ein gwasanaeth. |
| `signInMessage` | Please click here to sign in or close this session. | Cliciwch yma i fewngofnodi neu i ddod â’r sesiwn hon i ben. |
| `signIn` | Sign in | Mewngofnodi |

The existing keys (`heading`, `bodyText` and `signInAgainLink`) are removed.

## 3. Error Handling & Edge Cases

| Case | Handling |
| --- | --- |
| No JavaScript | No warning page. The server signs the user out at 60 min or 4h, and the next request lands on `/session-expired` with the provider button |
| Several tabs, one active | Each page load moves the shared `idleExpiry` forward. The idle tab's check reschedules instead of redirecting. An idle tab already on `/session-expiring` also reschedules |
| User on `/session-expiring` selects Continue | GET to the validated `currentPath`. That request renews the server, and the page load resets `idleExpiry` |
| User on `/session-expiring` selects Back | `history.back()`. That request also renews the server, which matches legacy |
| `currentPath` is malicious (`//evil`, `https://…`, `javascript:`, `\\evil`) or too long | Use the role landing page |
| `/session-expired-logout` arrives after a server-side expiry | The middleware has already expired the session and redirected by provenance |
| Invalid `redirectType` with no session | 400 error page |
| Missing or invalid `reSignInUrl` on `/session-expired` | 400 `errors/common`, as legacy. Edge cases: bookmarks, and users mid-sign-out during the deploy window, whose pre-deploy redirect has only `?lng=` |
| `localStorage` unavailable | In-memory fallback. Single-tab behaviour is still correct |
| Laptop sleep | Overdue timers fire on wake. The check compares against wall-clock `idleExpiry` and redirects, and the server is still authoritative |
| `session.destroy` error | Logged, and the redirect still happens |
| Idle for more than 24h with the browser open | Redis has dropped the record, so the next request is anonymous and gets a normal sign-in redirect. Documented |
| Unknown or empty provenance | `getRedirectType` returns `CFT` (legacy default). `buildSessionExpiredRedirectUrl` only does the CFT `endSession` hop when the provenance really is `CFT_IDAM`; otherwise it does a local logout and redirects to `reSignInUrl=CFT`. This avoids sending a non-CFT user to IDAM |
| Logging | Never log session ids, cookies, emails or tokens |

## 4. Deviations from legacy (deliberate)

| Legacy behaviour | CaTH plan | Why |
| --- | --- | --- |
| `currentPath` is put into the Continue `href` unvalidated | Same-origin relative path allow-list with a role landing fallback | Open redirect and `javascript:` XSS sink |
| Inline `<script>` blocks in `template.njk` and `session-expiring.njk` | Bundled `session-timeout.ts` | CSP is nonce-based (`helmet-middleware.ts:34-38`). Keeps the behaviour testable and in one file |
| A server-detected expiry calls `logOut(isSessionExpired=false)` and lands on `/session-logged-out` | Provenance expiry flow, landing on `/session-expired` | The user timed out and did not sign out. The page must say so (spec AC4) |
| Admin detection uses the substring `'ADMIN' in user.roles` on the client and five roles on the server | One exact `ADMIN_ROLES` list on the server. The client receives the computed duration | One source of truth. CaTH has three admin roles |
| The middleware renews on every route, including `/` | CaTH's existing `PUBLIC_ROUTES` skip list is kept | No user-visible effect. Avoids widening the change |
| Session-cookie `sameSite` comes from an env var | `lax` (unchanged since `0a81877eb`) | Already hardened |

## 5. Acceptance Criteria Mapping

The spec's AC1–AC6 were built for the 30-minute modal model. Under the decision they become:

| AC | Satisfied by | Verified by |
| --- | --- | --- |
| **Ticket AC: confirm and update the timing** | Findings table. The role-based 60/240 timeout with a 20-min warning page, as legacy | Role and provenance unit tests. Manual STG run with timings posted on #764 (§6.3) |
| L1: role-based timeout from one source | `timeout-tracker.ts` constants. The middleware passes the role | `timeout-tracker` and middleware tests for `VERIFIED` and each admin role; the provenance does not change the result |
| L2: warning page 20 min before, client seeded by the server | `data-session-idle-ms`. Shared `idleExpiry` across tabs | Template, client and E2E tests |
| L3: Continue keeps the user signed in and returns them to where they were | Tracked `/session-expiring` load. Validated `currentPath` link | Controller, `continue-path` and E2E tests |
| L4: sign-out by provenance with provider-specific re-sign-in | `buildSessionExpiredRedirectUrl`, `/session-expired-logout`, `/session-expired` `reSignInUrl` | `expiry-redirect`, controller and E2E tests. Manual IdP checks |
| L5: every timeout lands on `/session-expired` (JavaScript or not, admin 4h included) | Server flow. No cookie `maxAge` | Middleware, `redis-store` and E2E (server path) tests |
| L6: Welsh parity and accessibility | Legacy Welsh. `res.locals.locale`. GOV.UK components. Back link only on the expiring page | Template tests (including key parity), Axe in E2E, manual screen reader pass |

## 6. Test Scenarios

### 6.1 E2E: `e2e-tests/tests/session-timeout.spec.ts` (`@nightly`), using `context.clock` (`@playwright/test@1.62.1`)

> **Deferred (2026-11-02):** the spec and its `POST /test-support/session/expire` hook were removed for now. Until it is reinstated, the journeys are covered by unit and template tests plus the manual STG pass (§6.3). When it comes back, fix review H2 (match `currentPath` with a regex that allows `%3Flng%3Den`) and H3 (assert the 302 to `/login` without following it).

There is one test per user type, because each is a different journey (timing, provider logout, re-sign-in target). In both, `context.clock.install()` runs before the first navigation, so every page in the context shares the fake clock.

1. **"Admin (SSO) is warned at 3h40, continues, and is signed out at 4h"** (`loginWithSSO`)
   1. Open an admin page with a query string. `<body>` has `data-session-idle-ms`.
   2. Open a second page in the same context and leave it idle. Fast-forward 3h39 and navigate in the first page.
      Fast-forward 2 more minutes: the idle page must **not** have moved (`localStorage` coordination).
   3. Fast-forward to 3h40 in the idle page. It lands on `/session-expiring?currentPath=…`.
      Check the h1, the Back link and the Continue button. Run Axe. Switch to Welsh (`?lng=cy`) and check the Welsh header and "Parhau".
   4. Activate Continue with the keyboard. You return to the same path and query and are still signed in.
   5. Fast-forward 3h40, then 20 min. The flow goes through `/session-expired-logout` to `/session-expired?lng=cy&reSignInUrl=SSO`.
      Check the Welsh h1, no panel and no Back link. Run Axe. The "Mewngofnodi" button links to `/login`.
   6. Sign in again. Visit `/session-expiring?currentPath=//evil.example` and check that Continue links to `/system-admin-dashboard` (or the admin landing page for the role).
2. **"Verified user (CFT IDAM) is warned at 40 min and signed out at 60 min, including without the warning"** (`loginWithCftIdam`)
   1. Fast-forward 40 min. The page lands on `/session-expiring`. Run Axe.
   2. Fast-forward 20 min. The flow goes through the CFT IDAM `endSession` hop (`CFT_IDAM_URL_PATTERN`) to `/session-expired?reSignInUrl=CFT`. The button links to `/cft-login`.
   3. Sign in again. Call `POST /test-support/session/expire` with `page.request` and reload. The **server** path lands on `/session-expired?…reSignInUrl=CFT`; this is the no-JS equivalent.

Crime IDAM and B2C are not repeated in E2E. Their timings use the same `VERIFIED` code path (pinned by unit tests).
Their only difference is the logout URL, which is pinned by the `expiry-redirect` tests and checked manually (§6.3). Real 60-minute and 4-hour waits against real IdPs cannot be automated.

### 6.2 Unit and template tests

- **`timeout-tracker.test.ts`:**
  - 60 min for `VERIFIED` and for an undefined role.
  - 240 min for each of the three admin roles.
  - `isSessionExpired(session, role)` returns false with no `lastActivity`, false just inside the window, and true at and past the boundary, for both durations.
  - `getTimeUntilExpiry` is never negative.
- **`session-timeout.test.ts`:**
  - Public routes and anonymous requests are skipped.
  - A `VERIFIED` user is expired at 60 min but not at 59. An admin is expired at 240 min but not at 239.
  - **The same result for `CFT_IDAM`, `CRIME_IDAM` and `PI_AAD` users with the same role and `lastActivity`.**
  - Each provenance redirects to its expected URL, including `lng`.
  - `sessionIdleMs` equals the remaining time minus 20 min.
  - `/session-expiring` is tracked and renews.
  - A `destroy` error still redirects.
- **`expiry-redirect.test.ts`:** each provenance gives the right URL (CFT `endSession` wrapping `/session-expired?lng=..&reSignInUrl=CFT`, B2C logout with an absolute `post_logout_redirect_uri`, Crime and SSO local). The unknown-provenance mapping. The `RE_SIGN_IN_URLS` map.
- **`continue-path.test.ts`:**
  - Accepted: a valid path, and a path with a query.
  - Rejected: `//host`, `https://`, `javascript:`, a backslash, the empty string, a non-string or array query value, more than 2048 characters, and `/session-expiring` or `/session-expired*` or `/logout`.
  - The role fallbacks.
- **`b2c/logout-url.test.ts`:** the policy and the encoded redirect. The `logout/index.test.ts` B2C assertions still pass.
- **`session-expiring/index.test.ts`:** no signed-in user renders 400 `errors/common` (en and cy) and sets no `returnTo`. `continueHref` uses the validated path or the fallback. `redirectType` per provenance. `res.locals.locale` gives Welsh. `isSessionExpiringPage` is passed.
- **`session-expiring/index.njk.test.ts`:** the h1, the paragraph, a `govuk-button` with the given `href`, a `.govuk-back-link`, the `#session-expiring` data attributes, no `data-session-idle-ms` on `<body>`, the Welsh render, and key parity.
- **`session-expired-logout/index.test.ts`:**
  - When signed in: `logout`, `destroy` and `clearCookie` are called and the redirect is by provenance; the query is ignored.
  - When not signed in: a valid `redirectType` redirects to `/session-expired?reSignInUrl=…`; an invalid one renders 400.
- **`session-expired/index.test.ts`:** each `reSignInUrl` gives its `signInUrl`. A missing or invalid value renders 400 `errors/common` and no sign-in button. `res.locals.locale` gives Welsh with no `lng` (D8).
- **`session-expired/index.njk.test.ts`:** one h1, no `.govuk-panel` (D9), no `.govuk-back-link`, two `govuk-body` paragraphs, a button `href` equal to `signInUrl`, the Welsh render, and key parity.
- **`base-template.njk.test.ts`:** the attribute is present when authenticated with `sessionIdleMs`. It is absent when anonymous, when `sessionIdleMs` is not set, and when `isSessionExpiringPage` is true. The `0` case.
- **`redis-store.test.ts`:** with no `cookieMaxAge`, `maxAge` is undefined. An explicit `cookieMaxAge` and the `sessionOptions` override still apply. The existing `secure`, `httpOnly`, `sameSite` and `resave` assertions are unchanged.
- **Client `session-timeout.test.ts`** (happy-dom, fake timers):
  - Idle mode: does nothing without or with an invalid attribute; writes `idleExpiry`; redirects at `idleMs` with an encoded `currentPath`; reschedules when `idleExpiry` was moved forward by another tab; each of `click`, `mousedown`, `mousemove`, `keypress`, `scroll`, `touchstart` resets the timer and rewrites `idleExpiry` (legacy parity).
  - Expiring mode: redirects to `/session-expired-logout?redirectType=…` at `idleExpiry + lead`; reschedules when it was moved forward; works when `localStorage` throws.
- **`login/return/index.test.ts`:** the `lastActivity` test is removed.
- **`test-support/session/expire`:** `401` when anonymous. When authenticated, sets `lastActivity` and saves.

### 6.3 Manual STG (aat) verification before closing

For **CFT IDAM, Crime IDAM, B2C (if an account is available) and MOJ SSO**:

1. Sign in and note the time. Leave the browser idle.
2. `/session-expiring` appears at **40:00** (SSO: **3:40:00**).
3. Continue returns you to the same page and you are still signed in.
4. Repeat and let it lapse. Sign-out happens at **60:00** (SSO: **4:00:00**). Check:
   - you land on `/session-expired` with the right provider button;
   - for CFT, the next CFT sign-in asks for credentials;
   - for B2C, the B2C session has ended;
   - for SSO, Microsoft does **not** sign you out.
5. With JavaScript disabled, a request after the timeout lands on `/session-expired`.
6. With two tabs open, activity in one stops the other from showing `/session-expiring`.
7. Close and reopen the browser and confirm you are signed out (unless the browser restores session cookies).
8. Check for any ingress or Front Door limit that would end a long admin session early (C5).

**Post the observed timings per provider as a comment on #764.** That record is what this investigation ticket delivers.

## 7. CLARIFICATIONS NEEDED

Resolved by the decision, and dropped:

- C1 (target timings): resolved by legacy.
- C2 (absolute cap): legacy has none.
- C3 (`notSavedText`): legacy copy is used.
- C4 (modal strings in JS): no modal.
- C5 and C6 (extend API rate limit and CSRF; skipped IDAM hop on extend): no API.
- C9 (warning window): 20 min.
- C10 (re-sign-in target): provider-specific.
- C11 (multi-tab): handled by `localStorage`, as legacy does.
- D7 / passive input resets: follow legacy. Input events reset the client idle timer; the drift is accepted.
- Legacy copy versus GOV.UK style: follow legacy. The en/cy copy is used verbatim, including "click here/below".
- Browser-session cookie: follow legacy. No `maxAge`, so closing the browser signs the user out.
- Post-logout redirect URIs: follow legacy (`/session-expired?lng=..&reSignInUrl=CFT|AAD`). This is now a pre-deploy registration check (see C5), not a design decision.

Still open, or new:

- **C1. Environment-variable overrides.** The plan removes `SESSION_TIMEOUT_*` and hardcodes the legacy values. Should ops be able to tune them, for example `SESSION_TIMEOUT_MS` and `ADMIN_SESSION_TIMEOUT_MS`?
  **Recommendation:** no, as legacy. If it is needed later, add the overrides in `timeout-tracker.ts` only, with `NaN` hardening.
- **C3. `/session-expired-logout` is a state-changing GET**, the same as legacy and CaTH's `/logout`, so a cross-site link can sign a user out. **Recommendation:** accept, consistent with `/logout`. Revisit in a wider CSRF ticket.
- **C4. Admin role list.** Legacy has five admin roles; CaTH has three. Should any future super-admin role get the 4h timeout?
  **Recommendation:** add new admin roles to `ADMIN_ROLES` when they are introduced, and add a role-coverage test.
- **C5. IdP post-logout redirect URIs (pre-deploy check, not a decision).** B2C on expiry is new: its `post_logout_redirect_uri` becomes `…/session-expired?lng=..&reSignInUrl=AAD`. CFT's changes from `/session-expired?lng=cy` to include `reSignInUrl=CFT`.
  **Verified 2026-11-02 (unauthenticated probes against the STG IdPs):**
  - CFT IDAM AAT `/o/endSession?post_logout_redirect_uri=<cath.stg …/session-expired?lng=cy&reSignInUrl=CFT>` → `302 Location: https://cath.stg.platform.hmcts.net/session-expired?lng=cy&reSignInUrl=CFT`. The query string is preserved.
  - B2C staging (`sign-in.pip-frontend.staging…`, policy `B2C_1_SignInUserFlow`) `/oauth2/v2.0/logout?post_logout_redirect_uri=<…/session-expired?lng=cy&reSignInUrl=AAD>` → `200`, with a LogoutProcessor script that runs `window.location.replace(decodeURIComponent("…/session-expired?lng=cy&reSignInUrl=AAD"))`. The query string is preserved.
  - Not covered by the probes: logout with a live session (front-channel sign-out runs first, but the final redirect target is the same). Re-check this during the manual STG pass (§6.3).
  Still open: confirm that a 4h admin session is not cut short by an ingress or Front Door limit.
- **C6. `<html lang>` is always `en`** (WCAG 3.1.1, site-wide). **Recommendation:** a separate ticket.
