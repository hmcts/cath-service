# #764: Check session timeout login for CFT, Crime and MOJ SSO IDAM

**State:** OPEN
**Assignees:** None
**Author:** OgechiOkelu
**Labels:** type:story
**Created:** 2026-06-23T13:49:42Z
**Updated:** 2026-08-20T15:41:57Z

## Description

**PROBLEM STATEMENT**
This ticket is raised to investigate the session timeout after login for CFT, Crime and MOJ SSO IDAM users.


**AS A** Service
**I WANT** to investigate the session timeout after login
**SO THAT** CaTH I can confirm the set timing for session timeout 


**ACCEPTANCE CRITERIA**
Confirm the set timing for session timeout CFT, Crime, and MOJ SSO IDAM users and update if needed.

## Comments

### Comment by OgechiOkelu on 2026-08-20T15:20:03Z

@spec 

---

### Comment by hmctsclaudecode on 2026-08-20T15:29:23Z

# Technical Specification — Issue #764: Check session timeout login for CFT, Crime and MOJ SSO IDAM

## 1. User Story

**As a** CaTH service team member responsible for the security of authenticated journeys
**I want to** confirm and document the session timeout timings that apply after login for CFT IDAM, Crime IDAM and MOJ SSO (Azure AD) users, and correct them where the implemented behaviour does not match the intended behaviour
**So that** every signed-in user is warned before they are signed out, is signed out after a single, agreed period of inactivity regardless of which identity provider they used, and is never silently signed out mid-task

---

## 2. Background

This is an investigation ticket with a remediation tail. The investigation has been completed against `master` at commit `3c7178c`; the findings below are the substance of the ticket, and Section 3 onwards specifies the changes needed to make the confirmed timings actually hold.

### 2.1 Where session timeout is implemented today

| Concern | Value in effect | Source |
| --- | --- | --- |
| Server-side inactivity **warning** threshold | 25 minutes (`1500000` ms) | `libs/auth/src/session/timeout-tracker.ts:3` (`DEFAULT_WARNING_MS`) |
| Server-side inactivity **logout** threshold | 30 minutes (`1800000` ms) | `libs/auth/src/session/timeout-tracker.ts:4` (`DEFAULT_LOGOUT_MS`) |
| Env var overrides | `SESSION_TIMEOUT_WARNING_MS`, `SESSION_TIMEOUT_LOGOUT_MS` | `libs/auth/src/session/timeout-tracker.ts:11-12` |
| Are the overrides set anywhere? | **No** — absent from `apps/web/helm/values.yaml`, `values.dev.yaml` and `apps/web/config/*.json`, so the hardcoded defaults are what runs on local and STG | verified by search |
| Session cookie `maxAge` | **4 hours** (`1000 * 60 * 60 * 4`), `rolling` not set | `libs/web-core/src/middleware/session-stores/redis-store.ts:20` |
| Client-side warning threshold | 25 minutes, hardcoded a second time | `apps/web/src/assets/js/session-timeout.ts:6` |
| Client-side logout threshold | 30 minutes, hardcoded a second time | `apps/web/src/assets/js/session-timeout.ts:7` |
| Enforcement point | `app.use(sessionTimeoutMiddleware)` | `apps/web/src/app.ts:189` |
| Expiry landing page | `/session-expired` | `apps/web/src/pages/(auth)/session-expired/` |

### 2.2 Answer to the acceptance criterion

**The set timing is 30 minutes of inactivity, with a warning intended at 25 minutes, and it is identical for all four provenances.** `sessionTimeoutMiddleware` (`libs/auth/src/middleware/session-timeout.ts`) contains no branch on `req.user.provenance`, so `CFT_IDAM`, `CRIME_IDAM`, `SSO` and `PI_AAD` (B2C media users) all share one code path and one pair of thresholds. There is no per-provider configuration to confirm, and none is required.

Layered on top of that is an **undocumented absolute cap of 4 hours** from sign-in, imposed by the session cookie's `maxAge`. This is not an inactivity timeout and is not surfaced to the user in any way.

### 2.3 Defects found during the investigation

These are the reason the ticket cannot close as "confirmed, no change needed".

**D1 — The 25-minute warning modal never appears for any user.**
`initSessionTimeout()` returns immediately unless `document.body.dataset.authenticated` is set (`apps/web/src/assets/js/session-timeout.ts:44-46`). Nothing in the codebase sets `data-authenticated` on `<body>`: `libs/web-core/src/views/layouts/base-template.njk` does not override the `bodyAttributes` block that `govuk/template.njk` provides, and `authNavigationMiddleware` only sets `res.locals.isAuthenticated`, which is consumed by `service-navigation.njk` and nowhere else. The attribute is set only inside `session-timeout.test.ts`, so the unit tests pass while the feature is inert in every environment. **Consequence: CFT, Crime, SSO and B2C users are all dumped onto `/session-expired` at 30 minutes with no prior warning and no chance to save work.**

**D2 — `POST /api/extend-session` does not exist.**
The modal's Continue button calls it (`session-timeout.ts:199`). There is no route by that name anywhere in `apps/` or `libs/`, so it resolves to `notFoundHandler()`. Because `fetch()` resolves rather than rejects on a 404, the client treats the failure as success and calls `resetTimers()`. It happens to *work* today only as an accident: the request passes through `sessionTimeoutMiddleware`, which calls `updateLastActivity()` before the 404 is produced. Relying on a 404's side effects is not acceptable, and the client cannot distinguish a genuine extension from a broken one.

**D3 — The thresholds are duplicated, so the env var overrides are a trap.**
`getTimeoutConfig()` reads `SESSION_TIMEOUT_WARNING_MS` / `SESSION_TIMEOUT_LOGOUT_MS`, but the client-side timers are compile-time constants. `sessionTimeoutMiddleware` computes `res.locals.sessionTimeoutMs` (`session-timeout.ts:44`) and **no template ever reads it** — confirmed by search across all `.njk` files. Setting either env var to change the timeout would silently desynchronise the browser from the server.

**D4 — `isSessionApproachingExpiry()` is dead code.**
Exported from `libs/auth/src/session/timeout-tracker.ts:37` and unit-tested, but never called by any middleware, controller or template. It exists only to be tested, which the repository standards explicitly prohibit ("Don't export functions in order to test them").

**D5 — The 4-hour cookie cap signs out active users silently.**
`expressSessionRedis` sets `cookie.maxAge` to 4 hours without `rolling: true`. `express-session` therefore emits `Set-Cookie` only on the response that creates the session, so the browser cookie's `Expires` is fixed at sign-in + 4 hours and is never refreshed, no matter how active the user is. The Redis TTL *is* refreshed (the session is written on every authenticated request because `lastActivity` changes), so the server-side record outlives the cookie. An admin working continuously through a long list-management task is signed out at the 4-hour mark with no warning, no `/session-expired` page, and no explanation — the next click simply renders as an anonymous user or bounces to sign-in.

**D6 — `lastActivity` is initialised for one provenance only.**
`req.session.lastActivity = Date.now()` appears solely in the B2C return handler (`apps/web/src/pages/(auth)/login/return/index.ts:133`). The CFT (`cft-login/return/index.ts`), Crime (`crime-login/return/index.ts`) and SSO (`sso/return/index.ts`) handlers do not set it. Behaviour converges because the middleware writes it on the first authenticated request to a non-public route, but the asymmetry is a latent trap and means `getTimeUntilExpiry()` returns different values on the first post-login page depending on the provider.

**D7 — Client-side activity tracking desynchronises from the server.**
`trackUserActivity()` resets both timers on `mousedown`, `keydown`, `scroll` and `touchstart` (`session-timeout.ts:116-127`) **without contacting the server**. Passive activity — scrolling a long cause list, or typing into a search box — pushes the browser's warning out indefinitely while the server's `lastActivity` stands still. The user is never warned, then hits `/session-expired` on their next navigation. This is the same user-visible failure as D1, arriving by a second route.

**D8 — `/session-expired` resolves its locale inconsistently.**
The controller reads `req.query.lng` directly (`session-expired/index.ts:9`) instead of `res.locals.locale`, contrary to the project's controller pattern. It works today only because both the server redirect (`session-timeout.ts:26`) and the client redirect (`session-timeout.ts:219`) append `?lng=cy` after reading the `locale` cookie themselves. A Welsh-language user who reaches the page by any other route (a bookmark, a link, a future redirect) gets English.

**D9 — `/session-expired` misuses the GOV.UK panel component.**
`session-expired/index.njk` renders the heading in `govukPanel` with `govuk-panel--confirmation`, which is the large green success panel. Per the GOV.UK Design System, panel is for confirming a *completed transaction*; being signed out through inactivity is not a success outcome, and the green treatment miscommunicates it.

### 2.4 Scope decision

The ticket says "confirm the set timing … and update if needed". The confirmed timing (30 minutes' inactivity, uniform across providers) is judged appropriate and is **not** being changed. What "if needed" resolves to here is: make the confirmed timing genuinely and consistently enforced, warn the user as was always intended, and remove the duplication and the silent 4-hour cliff. No new user-facing journey is introduced.

### 2.5 Reference documentation

- GOV.UK Design System — [Modal dialogue guidance / session timeout patterns](https://design-system.service.gov.uk/components/)
- GOV.UK Design System — [Panel](https://design-system.service.gov.uk/components/panel/) (why D9 is a defect)
- WCAG 2.2 AA — [2.2.1 Timing Adjustable](https://www.w3.org/WAI/WCAG22/Understanding/timing-adjustable.html), [4.1.3 Status Messages](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html)
- `express-session` — `rolling` and `cookie.maxAge` semantics
- Project rules: `CLAUDE.md`, `.claude/rules/frontend.md`, `.claude/rules/testing.md`

---

## 3. Acceptance Criteria

### AC1 — Timings are confirmed and identical across all identity providers

* **Scenario:** Uniform inactivity timeout regardless of provenance
    * **Given** a user is signed in via CFT IDAM, Crime IDAM, MOJ SSO or B2C
    * **When** they make no request for 30 minutes
    * **Then** their session is destroyed and they are redirected to `/session-expired`
    * **And** the elapsed time before sign-out is the same for all four provenances

* **Scenario:** Timings are configurable from a single source
    * **Given** `SESSION_TIMEOUT_WARNING_MS` and `SESSION_TIMEOUT_LOGOUT_MS` are set to non-default values
    * **When** an authenticated page is rendered
    * **Then** the browser's warning and sign-out timers use those same values
    * **And** no threshold is hardcoded in client-side JavaScript

### AC2 — The inactivity warning is actually shown (fixes D1, D3, D7)

* **Scenario:** Warning appears before sign-out
    * **Given** a signed-in CFT IDAM user has been inactive for 25 minutes on an authenticated page
    * **When** the warning threshold is reached
    * **Then** a modal dialogue is displayed containing the heading "You will soon be signed out, due to inactivity" and a live countdown of the remaining 5 minutes
    * **And** the same behaviour occurs for Crime IDAM, MOJ SSO and B2C users

* **Scenario:** Warning is not shown to anonymous users
    * **Given** a user is not signed in
    * **When** they browse any public page for more than 25 minutes
    * **Then** no warning modal is created and no timers are started

* **Scenario:** Passive browser activity does not suppress the warning
    * **Given** a signed-in user scrolls and types on a page for 26 minutes without making any request to the server
    * **When** the warning threshold is reached
    * **Then** the warning modal is still displayed, because the browser countdown is seeded from the server's remaining time on page load and is not reset by input events alone

### AC3 — Continuing extends the session for real (fixes D2)

* **Scenario:** Continue keeps the user signed in
    * **Given** the warning modal is displayed
    * **When** the user selects "Continue"
    * **Then** `POST /api/extend-session` returns `204 No Content`, the server's `lastActivity` is refreshed, the modal is dismissed, and the countdown restarts from the full inactivity period
    * **And** the user remains on the page they were on, with any unsubmitted form input intact

* **Scenario:** A failed extension does not leave the user falsely reassured
    * **Given** the warning modal is displayed
    * **When** the user selects "Continue" and the request returns a non-2xx status or fails
    * **Then** the user is redirected to `/session-expired` rather than the modal silently closing

* **Scenario:** The extend endpoint rejects unauthenticated callers
    * **Given** no authenticated session exists
    * **When** `POST /api/extend-session` is called
    * **Then** the response is `401 Unauthorized` and no session is created

### AC4 — No user is signed out without an explanation (fixes D5)

* **Scenario:** An active user is not cut off at 4 hours
    * **Given** a signed-in MOJ SSO admin has been continuously active for more than 4 hours
    * **When** they make their next request
    * **Then** they remain signed in and the session cookie's expiry has been rolled forward on each response

* **Scenario:** Timing out always lands on the expiry page
    * **Given** a signed-in user's session has expired through inactivity
    * **When** they make their next request to an authenticated page
    * **Then** they are redirected to `/session-expired` and see the "You have been signed out, due to inactivity" message — never a bare sign-in redirect or an anonymous rendering of the page

### AC5 — Welsh parity and accessibility

* **Scenario:** Warning modal in Welsh
    * **Given** a signed-in user has selected Welsh
    * **When** the warning modal is displayed
    * **Then** all modal text, including the countdown label and the "Continue" button, is in Welsh

* **Scenario:** Expiry page in Welsh from any entry point
    * **Given** a user's `locale` cookie is `cy`
    * **When** they load `/session-expired` with no `lng` query parameter
    * **Then** the page renders in Welsh

* **Scenario:** Modal is operable by keyboard and announced
    * **Given** the warning modal is displayed
    * **When** the user navigates with a keyboard only
    * **Then** focus moves into the modal, is trapped within it, `Escape` dismisses it as "Continue" does, and the modal's appearance is announced by a screen reader

### AC6 — Configuration is documented and deployed

* **Scenario:** The confirmed timings are explicit in configuration
    * **Given** the STG deployment
    * **When** `apps/web/helm/values.yaml` is inspected
    * **Then** `SESSION_TIMEOUT_WARNING_MS` and `SESSION_TIMEOUT_LOGOUT_MS` are declared with the confirmed values, so the timeout is auditable without reading TypeScript constants

---

## 4. User Journey Flow

### 4.1 Provider-agnostic session lifecycle

All four sign-in routes converge on the same session and therefore the same timeout. This is the confirmation the ticket asks for.

```
  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
  │  /sign-in    │  │ /cft-login   │  │ /crime-login │  │    /sso      │
  │   (B2C)      │  │              │  │              │  │  (MOJ SSO)   │
  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘
         │                 │                 │                 │
         ▼                 ▼                 ▼                 ▼
  /login/return    /cft-login/return  /crime-login/return  /sso/return
    PI_AAD            CFT_IDAM           CRIME_IDAM           SSO
         │                 │                 │                 │
         └────────┬────────┴─────────┬───────┴────────┬────────┘
                  ▼                  ▼                ▼
         session.regenerate() → req.login() → session.save()
                                   │
                                   ▼
                  ┌─────────────────────────────────────┐
                  │  ONE session, ONE timeout policy    │
                  │  warning  : 25 min inactivity       │
                  │  sign-out : 30 min inactivity       │
                  │  cookie   : rolling, = sign-out     │
                  └─────────────────────────────────────┘
```

### 4.2 Per-request server flow (`sessionTimeoutMiddleware`)

```
   incoming request
         │
         ▼
   ┌───────────────────────────┐   yes
   │ path in PUBLIC_ROUTES?    ├───────────► next()   (no tracking)
   └────────────┬──────────────┘
                │ no
                ▼
   ┌───────────────────────────┐   no
   │ req.isAuthenticated()?    ├───────────► next()   (no tracking)
   └────────────┬──────────────┘
                │ yes
                ▼
   ┌───────────────────────────┐   yes    ┌──────────────────────────┐
   │ isSessionExpired()?       ├─────────►│ read locale cookie       │
   │ now - lastActivity >= 30m │          │ session.destroy()        │
   └────────────┬──────────────┘          │ redirect /session-expired│
                │ no                      └──────────────────────────┘
                ▼
   ┌────────────────────────────────────────────────┐
   │ updateLastActivity(session)                    │
   │ res.locals.sessionTimeoutMs   = time remaining │
   │ res.locals.sessionWarningMs   = warning offset │  ← NEW
   └────────────────────┬───────────────────────────┘
                        ▼
                     next()
```

### 4.3 Browser flow on an authenticated page

```
  page load
     │
     ▼
  read data-authenticated / data-session-timeout-ms /
       data-session-warning-ms from <body>            ← NEW (fixes D1, D3)
     │
     ├── not authenticated ──► do nothing
     │
     ▼ authenticated
  seed timers from server-provided remaining time
     │
     ├──────────────────────────────────────────────┐
     │                                              │
     ▼ warning fires (25 min mark)                  ▼ user navigates or submits
  show modal + 5-minute countdown                any request refreshes
     │                                            lastActivity server-side;
     ├── "Continue" pressed ──► POST /api/extend-session
     │                              │                next page load re-seeds
     │                              ├── 204 ──► dismiss modal, reseed timers
     │                              └── other ─► redirect /session-expired
     │
     └── countdown reaches 0 ──► redirect /session-expired?lng=<locale>
```

### 4.4 Journey narrative — MOJ SSO admin (worst current case)

| Step | Today (defective) | After this change |
| --- | --- | --- |
| 1. Admin signs in via MOJ SSO, opens list-management | Session created, `lastActivity` written by middleware | Same |
| 2. Admin takes a 26-minute phone call | Nothing happens; no warning is shown (D1) | Modal appears at 25 min with a 5-minute countdown |
| 3. Admin returns to the screen | Clicks a link, lands on `/session-expired`, loses unsaved selections | Clicks "Continue", stays signed in and on the page |
| 4. Admin works continuously past the 4-hour mark | Cookie expires; next click renders as anonymous with no explanation (D5) | Cookie has rolled forward on every response; admin stays signed in |

---

## 5. Low Fidelity Wireframe

### 5.1 Inactivity warning modal — English (fires at 25 minutes)

```
┌──────────────────────────────────────────────────────────────────────┐
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ GOV.UK header ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │
├──────────────────────────────────────────────────────────────────────┤
│ Court and tribunal hearings          Sign out                        │
├──────────────────────────────────────────────────────────────────────┤
│░░░░░░░░░░░░░░ page content dimmed by overlay (rgba black) ░░░░░░░░░░░│
│░░░░                                                              ░░░░│
│░░░  ┌──────────────────────────────────────────────────────────┐ ░░░ │
│░░░  │  ← focus moves here on open; focus trapped in dialogue   │ ░░░ │
│░░░  │                                                          │ ░░░ │
│░░░  │  You will soon be signed out, due to                     │ ░░░ │
│░░░  │  inactivity                              [h2, heading-m] │ ░░░ │
│░░░  │                                                          │ ░░░ │
│░░░  │  You will be signed out in 4:32.                         │ ░░░ │
│░░░  │                          └── live countdown, mm:ss ──┘   │ ░░░ │
│░░░  │                            aria-live="polite"            │ ░░░ │
│░░░  │                                                          │ ░░░ │
│░░░  │  ┌──────────────────┐                                    │ ░░░ │
│░░░  │  │    Continue      │  govukButton                       │ ░░░ │
│░░░  │  └──────────────────┘                                    │ ░░░ │
│░░░  │                                                          │ ░░░ │
│░░░  │  Escape or Continue both dismiss and extend              │ ░░░ │
│░░░  └──────────────────────────────────────────────────────────┘ ░░░ │
│░░░░                                                              ░░░░│
│░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│
└──────────────────────────────────────────────────────────────────────┘
```

### 5.2 Inactivity warning modal — Welsh

```
┌──────────────────────────────────────────────────────────────────────┐
│░░░  ┌──────────────────────────────────────────────────────────┐ ░░░ │
│░░░  │  Byddwch yn cael eich allgofnodi yn fuan,                │ ░░░ │
│░░░  │  oherwydd anweithgarwch                  [h2, heading-m] │ ░░░ │
│░░░  │                                                          │ ░░░ │
│░░░  │  Byddwch yn cael eich allgofnodi mewn 4:32.              │ ░░░ │
│░░░  │                                                          │ ░░░ │
│░░░  │  ┌──────────────────┐                                    │ ░░░ │
│░░░  │  │      Parhau      │                                    │ ░░░ │
│░░░  │  └──────────────────┘                                    │ ░░░ │
│░░░  └──────────────────────────────────────────────────────────┘ ░░░ │
└──────────────────────────────────────────────────────────────────────┘
```

### 5.3 `/session-expired` — revised (removes the green confirmation panel, D9)

**Before (current, incorrect):**

```
┌──────────────────────────────────────────────────────────────────────┐
│ ████████████████████████████████████████████████████████████████████ │
│ ████  You have been signed out, due to inactivity              ████ │
│ ████  (large GREEN govuk-panel--confirmation — implies success) ████ │
│ ████████████████████████████████████████████████████████████████████ │
│                                                                      │
│ Your session has expired because you have been inactive for too long. │
│ Sign in again                                                        │
└──────────────────────────────────────────────────────────────────────┘
```

**After (specified):**

```
┌──────────────────────────────────────────────────────────────────────┐
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ GOV.UK header ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │
├──────────────────────────────────────────────────────────────────────┤
│ Court and tribunal hearings                            Sign in       │
├──────────────────────────────────────────────────────────────────────┤
│ ┌ BETA ─ This is a new service. Your feedback will help us... ──────┐ │
│ └───────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│  ┌── two-thirds column ────────────────────────────────────────────┐  │
│  │                                                                 │  │
│  │  You have been signed out, due to                               │  │
│  │  inactivity                                    [h1, heading-l]  │  │
│  │                                                                 │  │
│  │  Your session has expired because you have been inactive        │  │
│  │  for too long.                                    [govuk-body]  │  │
│  │                                                                 │  │
│  │  We have not saved any information you had not yet              │  │
│  │  submitted.                                       [govuk-body]  │  │
│  │                                                                 │  │
│  │  ┌────────────────────┐                                         │  │
│  │  │   Sign in again    │  govukButton — href="/sign-in"          │  │
│  │  └────────────────────┘                                         │  │
│  │                                                                 │  │
│  └─────────────────────────────────────────────────────────────────┘  │
├──────────────────────────────────────────────────────────────────────┤
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ GOV.UK footer ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │
└──────────────────────────────────────────────────────────────────────┘
```

Note: no back link on `/session-expired` — the previous page is gone with the session, so `history.back()` would produce a confusing second expiry redirect.

---

## 6. Page Specifications

### 6.1 Files changed and added

| File | Change | Addresses |
| --- | --- | --- |
| `libs/auth/src/session/timeout-tracker.ts` | Remove `isSessionApproachingExpiry`; keep `getTimeoutConfig` as the single source of the two numbers | D4 |
| `libs/auth/src/session/timeout-tracker.test.ts` | Remove tests for the deleted function | D4 |
| `libs/auth/src/middleware/session-timeout.ts` | Hoist `PUBLIC_ROUTES` to a module constant; add `/api/extend-session` handling awareness; set `res.locals.sessionWarningMs` alongside `sessionTimeoutMs`; resolve locale via `res.locals.locale` with the cookie as fallback | D3, D8 |
| `libs/auth/src/middleware/session-timeout.test.ts` | Add per-provenance cases and `sessionWarningMs` assertions | AC1 |
| `libs/auth/src/routes/extend-session.ts` | **New** — `POST /api/extend-session` | D2 |
| `libs/auth/src/routes/extend-session.test.ts` | **New** | D2 |
| `libs/auth/src/config.ts` | Export `apiRoutes` so the new route is discovered | D2 |
| `libs/web-core/src/middleware/session-stores/redis-store.ts` | Add `rolling: true`; default `cookie.maxAge` to the inactivity logout threshold | D5 |
| `libs/web-core/src/views/layouts/base-template.njk` | Override the `bodyAttributes` block to emit `data-authenticated` and the two timeout values | D1, D3 |
| `libs/web-core/src/views/layouts/base-template.njk.test.ts` | **New or extended** — assert the body attributes render only when authenticated | D1 |
| `apps/web/src/assets/js/session-timeout.ts` | Read thresholds from `<body>`; remove hardcoded constants; remove input-event timer resets; check `response.ok`; add focus trap and `Escape` handling | D1, D3, D7, AC5 |
| `apps/web/src/assets/js/session-timeout.test.ts` | Rewrite for the data-attribute contract | D1, D3, D7 |
| `apps/web/src/assets/css/session-timeout.scss` | Confirm/adjust styles for the dialogue and overlay | AC5 |
| `apps/web/src/pages/(auth)/session-expired/index.ts` | Use `res.locals.locale`; pass `t`, `en`, `cy` per the controller pattern | D8 |
| `apps/web/src/pages/(auth)/session-expired/index.njk` | Replace `govukPanel` with `h1` + body copy + `govukButton` | D9 |
| `apps/web/src/pages/(auth)/session-expired/{en,cy}.ts` | Add `notSavedText`, `signInAgainButton`; keep keys in parity | D9 |
| `apps/web/src/pages/(auth)/login/return/index.ts` | Remove the one-off `lastActivity` assignment | D6 |
| `apps/web/src/app.ts` | Register `authApiRoutes` before the page router | D2 |
| `apps/web/helm/values.yaml`, `values.dev.yaml` | Declare the two `SESSION_TIMEOUT_*` env vars | AC6 |
| `e2e-tests/tests/session-timeout.spec.ts` | **New** — one journey test | Section 13 |

### 6.2 Single source of truth for the thresholds

`getTimeoutConfig()` in `libs/auth/src/session/timeout-tracker.ts` remains the only place the numbers are resolved. It keeps its existing env-var reads and defaults:

```
DEFAULT_WARNING_MS = 1500000   // 25 minutes
DEFAULT_LOGOUT_MS  = 1800000   // 30 minutes
```

`libs/web-core` must not import `@hmcts/auth` — that would create a circular dependency, since `@hmcts/auth` already depends on web-core's Express type augmentation. The Redis store therefore reads the same env vars directly and falls back to the same numeric default, with a comment pointing at `timeout-tracker.ts` as the canonical definition. This is a deliberate, documented duplication of one constant to avoid a cycle; it is not a duplication of logic.

### 6.3 `sessionTimeoutMiddleware` — revised behaviour

```
const PUBLIC_ROUTES = ["/", "/sign-in", "/session-expired", "/logout", "/health"];
```

Hoisted to module scope (currently rebuilt on every request). Behaviour otherwise unchanged, plus:

1. After `updateLastActivity()`, set **both**:
   - `res.locals.sessionTimeoutMs` — milliseconds until sign-out (already computed, now consumed)
   - `res.locals.sessionWarningMs` — milliseconds until the warning, i.e. `max(0, sessionTimeoutMs - (logoutMs - warningMs))`
2. On expiry, resolve the redirect locale as `res.locals.locale ?? req.cookies?.locale`, keeping the existing `?lng=cy` suffix so `/session-expired` renders in Welsh.
3. `/api/extend-session` is deliberately **not** added to `PUBLIC_ROUTES` — it must pass through this middleware so the expiry check runs first (an extend request arriving after the session has already expired must expire, not extend).

### 6.4 `POST /api/extend-session`

New route file `libs/auth/src/routes/extend-session.ts`, discovered by `createSimpleRouter` via `apiRoutes` exported from `libs/auth/src/config.ts` (matching the `@hmcts/location` and `@hmcts/public-pages` pattern already used in `apps/web/src/app.ts`).

| Aspect | Specification |
| --- | --- |
| Method and path | `POST /api/extend-session` |
| Authentication | Requires `req.isAuthenticated()`; returns `401` otherwise |
| Body | None. No parameters are read, so there is nothing to validate |
| Success response | `204 No Content`, no body |
| Side effect | None of its own — `sessionTimeoutMiddleware` has already refreshed `lastActivity` by the time the handler runs. The handler exists so the client gets a truthful status code |
| Cache headers | `Cache-Control: no-store` |
| CSRF | The service does not currently apply CSRF tokens to form posts, so none is applied here. The endpoint is state-refreshing only, requires an authenticated cookie, accepts no input and returns no data, so a forged cross-site call can at worst keep a session alive that the user's own browser already holds |
| Registration order | Must be registered **before** `createSimpleRouter({ path: pages })` in `apps/web/src/app.ts`, alongside the existing `locationApiRoutes` and `publicPagesApiRoutes` |

Progressive enhancement: this endpoint is only reachable from JavaScript. Without JavaScript there is no modal and no Continue button; the user simply gets the 30-minute server-side timeout and the `/session-expired` page. No core functionality depends on it.

### 6.5 Body attributes contract (`base-template.njk`)

The `govuk/template.njk` layout renders `<body class="govuk-template__body {{ bodyClasses }}" {{ bodyAttributes }}>`. `base-template.njk` currently overrides neither, which is why `data-authenticated` is never present. Add:

```njk
{% block bodyAttributes %}
  {%- if isAuthenticated %} data-authenticated="true" data-session-timeout-ms="{{ sessionTimeoutMs }}" data-session-warning-ms="{{ sessionWarningMs }}"{% endif -%}
{% endblock %}
```

Rules:
- Emitted **only** when `isAuthenticated` is truthy, so anonymous pages start no timers.
- `isAuthenticated` is already set by `authNavigationMiddleware`; `sessionTimeoutMs` and `sessionWarningMs` come from `sessionTimeoutMiddleware`, which runs after it. Both are on `res.locals`, so both are available to Nunjucks without controller changes.
- On a page where the middleware skipped tracking (a public route reached while signed in, e.g. `/`), the two millisecond attributes are absent. The client must treat missing or unparseable values as "do not run" rather than falling back to a hardcoded default — otherwise the D3 duplication returns through the back door.

### 6.6 Client-side module — revised behaviour

`apps/web/src/assets/js/session-timeout.ts`, rewritten against this contract:

| Behaviour | Specification |
| --- | --- |
| Initialisation guard | Run only if `data-authenticated` is present **and** both `data-session-timeout-ms` and `data-session-warning-ms` parse as finite positive numbers |
| Timer seeding | `warningTimer` at `sessionWarningMs`, `logoutTimer` at `sessionTimeoutMs`, both taken from the body attributes — i.e. from the server's view of remaining time, not from a fresh 25/30 minutes |
| Input-event resets | **Removed.** Scrolling, typing and clicking no longer reset the timers (D7). Every real navigation or form submission is a server request, which refreshes `lastActivity` and re-seeds the timers on the next page load |
| Warning display | Show the dialogue and start a per-second countdown for `sessionTimeoutMs - sessionWarningMs` |
| Countdown format | `m:ss`, zero-padded seconds (existing `updateCountdown` behaviour is correct and is retained) |
| Continue | `POST /api/extend-session`; on `response.ok` dismiss the modal and reseed timers from the full configured durations; on any non-ok status or network failure, redirect to `/session-expired` |
| Timeout reached | Redirect to `/session-expired`, appending `?lng=cy` when the locale is Welsh |
| Locale resolution | Existing `getCurrentLocale()` (URL `lng` parameter, then `locale` cookie, then `en`) is retained |
| Modal markup | Built in JavaScript as today, but as a proper dialogue — see Section 12 |
| Nonce | No inline `<script>` is added, so no CSP nonce plumbing is needed; the module is bundled and loaded via `web.ts` as it is now |

The 5-minute warning window is derived (`logoutMs - warningMs`) rather than configured separately, so the two env vars remain the only knobs.

### 6.7 Session cookie configuration

In `libs/web-core/src/middleware/session-stores/redis-store.ts`:

| Option | Now | Specified |
| --- | --- | --- |
| `cookie.maxAge` | `1000 * 60 * 60 * 4` (4 hours) | `SESSION_TIMEOUT_LOGOUT_MS`, defaulting to `1800000` (30 minutes) |
| `rolling` | unset (`false`) | `true` |
| `resave` | `false` | `false` (unchanged) |
| `saveUninitialized` | `false` | `false` (unchanged) |
| `cookie.secure` | `NODE_ENV === "production"` | unchanged |
| `cookie.httpOnly` | `true` | unchanged |
| `cookie.sameSite` | unset (browser default `Lax`) | unchanged — `Lax` is required for the OAuth authorisation-code redirects back from CFT, Crime, B2C and Azure AD to carry the session cookie |

With `rolling: true`, `Set-Cookie` is emitted on every response, so the browser cookie expiry and the Redis TTL both track the same rolling 30-minute inactivity window as `lastActivity`. The three now agree on one number, which is the point of the change.

**Consequences to accept explicitly:**
- The undocumented 4-hour absolute cap is removed. An indefinitely active user stays signed in indefinitely. See Section 14 for the open question on whether an explicit absolute cap should replace it.
- Anonymous sessions also shorten from 4 hours to 30 minutes. Anonymous sessions hold only `returnTo`, `lng`, `b2cProvider`, `b2cLocale` and `crimeOauthState` — all consumed within a single OAuth round-trip, so 30 minutes of inactivity is ample. Pending subscriptions are **not** affected: `restorePendingSubscriptionsMiddleware` reads them from Redis keyed by user id (`libs/subscriptions/src/pending-subscriptions-store.ts`), independently of the session.
- `Set-Cookie` on every response is a negligible overhead; the session is already written to Redis on every authenticated request because `lastActivity` changes.

### 6.8 `lastActivity` ownership

`sessionTimeoutMiddleware` becomes the sole writer of `session.lastActivity`. The assignment at `apps/web/src/pages/(auth)/login/return/index.ts:133` is removed: the post-login redirect target (`/account-home` or `returnTo`) is an authenticated non-public route, so the middleware sets `lastActivity` on that very next request. The CFT, Crime and SSO return handlers need no change — they already rely on this. `lastActivity` remains declared on `SessionData` in `libs/auth/src/user-profile.ts:26`.

Note the existing safe behaviour that must be preserved: `isSessionExpired()` returns `false` when `lastActivity` is absent, so the first authenticated request after any sign-in cannot expire.

---

## 7. Content

### 7.1 Warning modal content

The modal is built in client-side JavaScript, so its strings cannot be supplied by a Nunjucks controller. The existing `translations` object in `apps/web/src/assets/js/session-timeout.ts` is retained as the mechanism. It is the one place in the service where locale strings live in a `.ts` asset rather than an `en.ts`/`cy.ts` pair; that is an accepted consequence of the modal being JavaScript-generated, and the key structure still mirrors `en`/`cy` exactly.

**English (`translations.en`):**

| Key | Value |
| --- | --- |
| `heading` | `You will soon be signed out, due to inactivity` |
| `bodyText` | `You will be signed out in` |
| `continueButton` | `Continue` |
| `dialogueLabel` | `Inactivity warning` |

**Welsh (`translations.cy`):**

| Key | Value |
| --- | --- |
| `heading` | `Byddwch yn cael eich allgofnodi'n fuan, o ganlyniad i wneud dim` |
| `bodyText` | `[WELSH TRANSLATION REQUIRED: "You will be signed out in"]` |
| `continueButton` | `Parhau` |
| `dialogueLabel` | `[WELSH TRANSLATION REQUIRED: "Inactivity warning"]` |

The rendered sentence is `{bodyText} <strong>{countdown}</strong>.` — for example "You will be signed out in **4:32**." The countdown is a numeric `m:ss` value and is not translated.

### 7.2 `/session-expired` content

**`apps/web/src/pages/(auth)/session-expired/en.ts`:**

| Key | Value | Change |
| --- | --- | --- |
| `pageTitle` | `You have been signed out` | unchanged |
| `heading` | `You have been signed out, due to inactivity` | unchanged |
| `bodyText` | `Your session has expired because you have been inactive for too long.` | unchanged |
| `notSavedText` | `We have not saved any information you had not yet submitted.` | **new** |
| `signInAgainButton` | `Sign in again` | **new** — replaces the `signInAgainLink` text link with a button |

`signInAgainLink` is removed once no template references it.

**`apps/web/src/pages/(auth)/session-expired/cy.ts`:**

| Key | Value |
| --- | --- |
| `pageTitle` | `[WELSH TRANSLATION REQUIRED: "You have been signed out"]` |
| `heading` | `Rydych wedi cael eich allgofnodi oherwydd anweithgarwch` |
| `bodyText` | `[WELSH TRANSLATION REQUIRED: "Your session has expired because you have been inactive for too long."]` |
| `notSavedText` | `[WELSH TRANSLATION REQUIRED: "We have not saved any information you had not yet submitted."]` |
| `signInAgainButton` | `[WELSH TRANSLATION REQUIRED: "Sign in again"]` |

Key parity between `en` and `cy` is asserted by a template test (`expect(Object.keys(en).sort()).toEqual(Object.keys(cy).sort())`), per `.claude/rules/testing.md`.

### 7.3 Content not changed

`apps/web/src/pages/(auth)/session-logged-out/` is out of scope. It covers deliberate sign-out via `/logout`, which is a different outcome from timing out and already reads correctly.

### 7.4 Tone

"You have been signed out, due to inactivity" and "You will soon be signed out, due to inactivity" are retained verbatim from the existing implementation. They are plain English, use "you", and state the consequence before the reason. The new `notSavedText` line exists because the most common user question after an unexpected sign-out is whether their work survived; stating it plainly prevents a support contact.

---

## 8. URL

| URL | Method | Status | Auth | Purpose |
| --- | --- | --- | --- | --- |
| `/api/extend-session` | `POST` | **New** | Authenticated only | Refresh session activity from the warning modal; returns `204` |
| `/session-expired` | `GET` | Existing, revised | Public | Inactivity sign-out landing page. Accepts optional `?lng=cy` |
| `/session-logged-out` | `GET` | Existing, unchanged | Public | Deliberate sign-out landing page |

Routing notes:

- `/api/extend-session` follows the singular-resource-for-an-action convention used elsewhere in the service (`/api/...`) and is served from `apps/web`, not `apps/api`, because it operates on the web app's Express session. It is registered from `libs/auth/src/config.ts` via `apiRoutes`, mirroring `@hmcts/location`.
- `/session-expired` stays in the `(auth)` route group, which contributes no URL prefix.
- `/session-expired` remains in `PUBLIC_ROUTES` inside `sessionTimeoutMiddleware`. Without that entry the redirect would loop.
- `/session-logged-out` is deliberately **not** in `PUBLIC_ROUTES` and does not need to be: by the time it is reached the session has been destroyed, so `req.isAuthenticated()` is false and the middleware skips.

---

## 9. Validation

There are no user-entered fields anywhere in this change, so there is no form validation. The validation that does apply is on configuration and on the browser-to-server contract.

### 9.1 Configuration validation

| Input | Rule | Behaviour when violated |
| --- | --- | --- |
| `SESSION_TIMEOUT_WARNING_MS` | Positive integer, milliseconds | `Number.parseInt` yields `NaN`; must fall back to `DEFAULT_WARNING_MS` rather than propagating `NaN` |
| `SESSION_TIMEOUT_LOGOUT_MS` | Positive integer, milliseconds | Falls back to `DEFAULT_LOGOUT_MS` |
| Relationship | `warningMs` must be `< logoutMs` | If not, no warning window exists and the user is signed out with no warning |

The current `getTimeoutConfig()` has a real robustness gap: `Number.parseInt("abc", 10)` returns `NaN`, and `NaN` is truthy-ish in the arithmetic that follows, so `timeSinceActivity >= NaN` is always `false` and **sessions would never expire**. Harden it:

- Parse, then reject non-finite or non-positive results in favour of the default.
- If `warningMs >= logoutMs`, log a warning once and clamp `warningMs` to `logoutMs / 2`.

This is defensive validation of deployment configuration, not speculative feature work: a typo in a Helm value must not silently disable the session timeout.

### 9.2 Body-attribute validation (client)

| Attribute | Rule | Behaviour when violated |
| --- | --- | --- |
| `data-authenticated` | Present or absent | Absent → do not initialise |
| `data-session-timeout-ms` | Finite number `> 0` | Missing, `NaN`, `<= 0` → do not initialise |
| `data-session-warning-ms` | Finite number `>= 0` and `< data-session-timeout-ms` | Violated → do not initialise |

"Do not initialise" means no modal and no client timers; the server-side 30-minute timeout still applies. Failing closed to server-only enforcement is correct — the alternative is a browser timer that disagrees with the server, which is defect D3.

### 9.3 Endpoint validation

`POST /api/extend-session` reads no request body, query string or headers beyond the session cookie. The only check is `req.isAuthenticated()`. There is nothing to sanitise, and no database query is issued, so the parameterised-query requirement does not arise.

---

## 10. Error Messages

No validation error messages are introduced — there are no inputs. The user-facing messages are state messages, and the failure modes are handled by redirect rather than by an error summary.

### 10.1 User-facing messages

| Situation | User sees | Where |
| --- | --- | --- |
| 25 minutes of inactivity | `You will soon be signed out, due to inactivity` / `You will be signed out in m:ss.` | Warning modal |
| 30 minutes of inactivity | `You have been signed out, due to inactivity` / `Your session has expired because you have been inactive for too long.` / `We have not saved any information you had not yet submitted.` | `/session-expired` |
| "Continue" fails (non-2xx or network error) | The same `/session-expired` page — no separate error message | Redirect |

The decision not to invent a "we could not keep you signed in" message is deliberate. From the user's point of view a failed extension and an expired session are the same event with the same remedy: sign in again. A distinct message would add a string to translate and a state to test for no user benefit.

### 10.2 Server-side and developer-facing messages

| Situation | Response / log |
| --- | --- |
| `POST /api/extend-session` while unauthenticated | `401` with body `{"error":"Not authenticated"}`. Not localised — never rendered to a user |
| `session.destroy()` fails during expiry | Existing behaviour retained: log via `console.error("Session destruction error:", err)` and still redirect to `/session-expired`. The user must not be left on an authenticated page because a Redis delete failed |
| `SESSION_TIMEOUT_*` unparseable | Log once at startup: `Invalid SESSION_TIMEOUT_* value, falling back to default` |
| `warningMs >= logoutMs` | Log once at startup: `SESSION_TIMEOUT_WARNING_MS must be less than SESSION_TIMEOUT_LOGOUT_MS; clamping` |

No session identifier, cookie value, user email or token is written to any log, per the security requirements in `CLAUDE.md`.

---

## 11. Navigation

### 11.1 Redirect matrix

| From | Trigger | To | Notes |
| --- | --- | --- | --- |
| Any authenticated non-public page | Server detects `lastActivity` older than 30 min | `/session-expired` (`?lng=cy` when Welsh) | Session destroyed first |
| Any authenticated page | Browser logout timer fires | `/session-expired` (`?lng=cy` when Welsh) | The server session may still be marginally alive; the next request to any tracked route will expire it |
| Warning modal | "Continue" returns non-2xx or fails | `/session-expired` | Fail closed |
| Warning modal | "Continue" returns `204` | No navigation — stays on the current page | Modal dismissed, timers reseeded |
| `/session-expired` | "Sign in again" | `/sign-in` | The provider-choice page; the user re-picks CFT, Crime, MOJ SSO or B2C |
| Any page | `/logout` | `/session-logged-out`, via the provider's logout endpoint for `PI_AAD` and `SSO` | Existing behaviour, unchanged |

### 11.2 `returnTo` is deliberately not preserved across an expiry

When a session expires it is destroyed, taking `returnTo` with it. `/session-expired` therefore sends the user to `/sign-in` rather than deep-linking back to where they were. Preserving the deep link would mean writing the pre-expiry URL to a separate cookie, which leaks a signed-in user's browsing target — for this service, potentially which court or which case they were viewing — into a store that outlives their session. Not worth it for the convenience gained.

### 11.3 Back link

`/session-expired` renders no back link. `base-template.njk` emits `govukBackLink` inside the `beforeContent` block whenever the `back` variable is set, and the wired-up handler calls `history.back()`. On this page that would return the user to a now-unauthenticated page and immediately re-trigger the expiry redirect. The controller must not set `back`, and the template overrides the `backLink` block to empty.

### 11.4 Navigation links while the modal is open

The modal overlay covers the page but does not disable the header's "Sign out" link or the service navigation beneath it. Clicking through the overlay is prevented by the overlay element itself; keyboard users cannot reach those links because focus is trapped in the dialogue. If a user does reach `/logout`, the deliberate sign-out flow takes precedence and they land on `/session-logged-out` — the correct outcome, not an error.

---

## 12. Accessibility

The modal is the only new interactive component, and a timed modal is one of the easier things to get wrong under WCAG 2.2. The current implementation is not accessible: it is a plain `div` with no dialogue semantics, no focus management, no live region on the countdown, and no keyboard dismissal.

### 12.1 Modal semantics

| Requirement | Implementation |
| --- | --- |
| Dialogue role | `role="dialog"` with `aria-modal="true"` on the content container |
| Accessible name | `aria-labelledby` pointing at the `h2` id, with `aria-label` from `dialogueLabel` as the fallback |
| Heading level | `h2` — the page already owns an `h1`, so the modal must not introduce a second one |
| Hidden when inactive | Toggle the `hidden` attribute rather than `style.display`, so assistive technology consistently ignores it while closed |

### 12.2 Focus management

| Requirement | Implementation |
| --- | --- |
| Focus on open | Move focus to the modal container (given `tabindex="-1"`), so the heading and countdown are announced before the button is reached |
| Focus trap | `Tab` and `Shift+Tab` cycle between the "Continue" button and the container; focus cannot escape to the page behind |
| Focus on close | Return focus to the element that held it when the modal opened. Because the modal opens on a timer rather than a user action, the previously focused element must be captured at open time |
| Visible focus | GOV.UK yellow focus style, inherited from `govuk-button`; no custom `outline: none` anywhere in `session-timeout.scss` |

### 12.3 Countdown announcement — WCAG 4.1.3 Status Messages

A naive `aria-live="polite"` on a per-second countdown makes a screen reader announce the time 300 times. Instead:

- The countdown `<strong>` is **not** a live region.
- A separate visually hidden `<div aria-live="polite" role="status">` announces at meaningful intervals only: on open ("You will be signed out in 5 minutes"), then at 2 minutes, 1 minute and 30 seconds remaining.
- The visible `m:ss` countdown continues to update every second for sighted users.

### 12.4 WCAG 2.2 — 2.2.1 Timing Adjustable

A session timeout is a time limit, so 2.2.1 applies. The exception this implementation relies on is the 20-hour and the "essential" exception combined with the standard mitigation: **the user is warned before the limit expires and can extend it with a simple action**. Compliance therefore depends on the warning working, which is exactly what defect D1 breaks. Requirements:

- The warning must appear with at least 20 seconds' notice — 5 minutes here, comfortably exceeded.
- The extension must be a single action — one button press.
- The extension must be available at least 10 times. `POST /api/extend-session` is not rate-limited or counted, so it is effectively unlimited.

Note the interaction with Section 6.7: removing the 4-hour absolute cap also removes a hard limit that could not be extended. If an absolute cap is later reintroduced (Section 14), it must be justified against 2.2.1's essential-activity exception, since an unextendable limit is otherwise a failure.

### 12.5 Keyboard operation

| Key | Behaviour |
| --- | --- |
| `Tab` / `Shift+Tab` | Cycle within the dialogue only |
| `Enter` / `Space` on "Continue" | Extend the session (native button behaviour — the element must be a real `<button type="button">`, which it already is) |
| `Escape` | Same as "Continue": extend and dismiss. Standard modal behaviour, and the safe interpretation — a user pressing `Escape` wants the dialogue gone, not to be signed out |

### 12.6 Visual requirements

| Requirement | Implementation |
| --- | --- |
| Contrast | Modal text is `govuk-black` on `govuk-white`: 4.5:1 exceeded. The overlay must not reduce contrast of the modal content itself |
| Not colour-alone | The warning is conveyed by text and a numeric countdown, not by colour |
| Target size | "Continue" is a standard `govuk-button`, meeting the 44×44px minimum |
| Reflow / zoom | The modal must remain fully readable and operable at 400% zoom and at 320px width — use a `max-width` with percentage-based sizing in `session-timeout.scss`, never a fixed pixel width |
| Reduced motion | No animated entrance is added, so `prefers-reduced-motion` needs no handling |
| Page scroll | Do not lock body scroll while the modal is open; a user zoomed to 400% may need to scroll to read the whole dialogue |

### 12.7 `/session-expired` page accessibility

| Requirement | Implementation |
| --- | --- |
| Page title matches `h1` | `pageTitle` is "You have been signed out", `heading` is "You have been signed out, due to inactivity" — the title is a prefix of the heading, which satisfies the intent. Both come from the same locale file |
| Heading level | Single `h1` with `govuk-heading-l`. Replacing `govukPanel` removes the previous `h1`-inside-panel styling |
| Semantic outcome | The page is an informational outcome, not a confirmation — no `govuk-panel--confirmation` (D9) |
| Language attribute | `<html lang>` is set by the existing i18n layer; correcting the controller to use `res.locals.locale` (D8) keeps `lang` and content consistent for cookie-based Welsh users |
| Skip link | Provided by `govuk/template.njk`, unchanged |

### 12.8 Testing

- Axe-core runs inline in the E2E journey test at two points: with the modal open, and on `/session-expired`.
- Keyboard-only traversal of the modal is asserted in the same test.
- Automated checks do not cover focus return or live-region timing; both need a manual screen reader pass (NVDA with Firefox, and VoiceOver with Safari) before the ticket closes.

---

## 13. Test Scenarios

### 13.1 Unit — `libs/auth/src/session/timeout-tracker.test.ts`

* Returns the 25-minute and 30-minute defaults when neither environment variable is set.
* Returns the configured values when both environment variables are set to valid integers.
* Falls back to the defaults when either variable is non-numeric, negative or zero — and specifically proves that a session with an old `lastActivity` still expires under that bad configuration, which is the `NaN` gap described in Section 9.1.
* Clamps the warning threshold and logs once when the warning value is greater than or equal to the logout value.
* `isSessionExpired` returns `false` when `lastActivity` is absent, `false` just inside the window, and `true` at and beyond the boundary.
* `getTimeUntilExpiry` returns `null` without `lastActivity`, the remaining milliseconds inside the window, and `0` rather than a negative number past expiry.
* Existing tests for `isSessionApproachingExpiry` are deleted along with the function.

### 13.2 Unit — `libs/auth/src/middleware/session-timeout.test.ts`

* Skips tracking for each public route, and for unauthenticated requests, without touching `res.locals`.
* Destroys the session and redirects to `/session-expired` when the inactivity threshold has passed.
* Redirects to `/session-expired?lng=cy` when the locale is Welsh, resolved from `res.locals.locale` and, separately, from the `locale` cookie when `res.locals.locale` is absent.
* Still redirects to `/session-expired` when `session.destroy` yields an error.
* Sets both `sessionTimeoutMs` and `sessionWarningMs`, with `sessionWarningMs` strictly less than `sessionTimeoutMs`.
* **Produces identical timeout values for a `CFT_IDAM` user, a `CRIME_IDAM` user, an `SSO` user and a `PI_AAD` user given identical `lastActivity`** — this is the test that encodes the ticket's acceptance criterion, so a future per-provider divergence fails the build.
* Refreshes `lastActivity` for a request to `/api/extend-session`, and expires instead when that request arrives after the threshold.

### 13.3 Unit — `libs/auth/src/routes/extend-session.test.ts`

* Returns `204` with no body for an authenticated request.
* Returns `401` for an unauthenticated request.
* Sets `Cache-Control: no-store`.

### 13.4 Unit — `libs/web-core/src/middleware/session-stores/redis-store.test.ts`

* Sets `rolling: true`.
* Defaults `cookie.maxAge` to 30 minutes rather than 4 hours.
* Derives `cookie.maxAge` from `SESSION_TIMEOUT_LOGOUT_MS` when it is set.
* Still honours an explicit `cookieMaxAge` option and an explicit `sessionOptions` override, so existing callers are not broken.
* Leaves `secure`, `httpOnly`, `resave` and `saveUninitialized` behaviour unchanged (regression guard on the existing assertions).

### 13.5 Unit — `apps/web/src/assets/js/session-timeout.test.ts`

* Does not initialise when `data-authenticated` is absent.
* Does not initialise when `data-authenticated` is present but the millisecond attributes are missing, `NaN`, zero or negative — and specifically does **not** fall back to a hardcoded 25/30 minutes.
* Does not initialise when the warning value is not less than the timeout value.
* Seeds the warning and logout timers from the body attributes, not from fixed constants — verified by supplying deliberately unusual values such as a 4-minute timeout with a 3-minute warning.
* Shows the dialogue when the warning timer fires, with the countdown starting at the derived warning window.
* Formats the countdown as `m:ss` with zero-padded seconds, including at values under one minute.
* Does **not** reset the timers on `mousedown`, `keydown`, `scroll` or `touchstart` — the regression test for defect D7, and the inverse of what the current suite asserts.
* Redirects to `/session-expired` when the logout timer fires, and to `/session-expired?lng=cy` when the locale cookie or URL parameter indicates Welsh.
* On "Continue", posts to `/api/extend-session`, and on a `204` dismisses the dialogue and reseeds the timers.
* On "Continue" with a `404` or `500` response, redirects to `/session-expired` — the regression test for defect D2, since a `fetch` that resolves with a non-ok status must not be treated as success.
* On "Continue" with a rejected `fetch`, redirects to `/session-expired`.
* Renders Welsh modal text when the locale is Welsh.
* Traps `Tab` within the dialogue, and treats `Escape` the same as "Continue".

### 13.6 Template — `libs/web-core/src/views/layouts/base-template.njk.test.ts`

* Emits `data-authenticated`, `data-session-timeout-ms` and `data-session-warning-ms` on `<body>` when `isAuthenticated` is true and both values are present — asserted via Cheerio attribute queries, which is the regression test for defect D1.
* Emits none of the three when `isAuthenticated` is false.
* Omits the millisecond attributes when the middleware did not set them, while still emitting `data-authenticated`.

### 13.7 Template — `apps/web/src/pages/(auth)/session-expired/index.njk.test.ts`

* Renders the heading as a single `h1`.
* Renders no element carrying `govuk-panel--confirmation` — the regression test for defect D9.
* Renders the "not saved" paragraph.
* Renders "Sign in again" as a `govuk-button` linking to `/sign-in`.
* Renders no back link.
* Renders Welsh headings and button text when the `cy` locale object is supplied.
* Asserts `en` and `cy` key parity.

### 13.8 Controller — `apps/web/src/pages/(auth)/session-expired/index.test.ts`

* Renders with content selected from `res.locals.locale` when no `lng` query parameter is present — the regression test for defect D8.
* Renders Welsh content when `res.locals.locale` is `cy`.
* Still renders Welsh content when only `?lng=cy` is supplied, so the existing redirect targets keep working.
* Passes `en`, `cy` and `t` to the template per the project controller pattern.

### 13.9 Controller — `apps/web/src/pages/(auth)/login/return/index.test.ts`

* No longer asserts that the handler writes `session.lastActivity`; the successful-login redirect assertions are otherwise unchanged.

### 13.10 E2E — `e2e-tests/tests/session-timeout.spec.ts`

**One** Playwright test, tagged `@nightly`, covering the whole journey. It must run with short timeouts injected via `SESSION_TIMEOUT_WARNING_MS` and `SESSION_TIMEOUT_LOGOUT_MS` (for example 6 seconds and 10 seconds) — driving a real 25-minute wait is not viable, and the injected values simultaneously prove the configuration path works.

The single journey covers, in order:

1. Sign in as an admin user and land on the dashboard.
2. Assert `<body>` carries `data-authenticated` and both millisecond attributes.
3. Wait for the warning threshold and assert the dialogue appears with a counting-down timer.
4. Run Axe with the dialogue open and assert no violations.
5. Traverse the dialogue with `Tab` only and activate "Continue" with the keyboard; assert the dialogue closes, the page is unchanged, and the user is still signed in.
6. Switch to Welsh, wait for the warning again, and assert the Welsh heading and "Continue" text.
7. Let the countdown run out; assert the redirect to `/session-expired?lng=cy` and the Welsh page content.
8. Run Axe on `/session-expired`.
9. Select "Sign in again" and assert arrival at `/sign-in`.

Deliberately **not** separate tests: the Welsh check, the accessibility checks, the keyboard check and the redirect check are all points along this one journey, per the E2E guidance in `CLAUDE.md`.

### 13.11 Manual verification before closing the ticket

The point of the ticket is confirmation across three identity providers, and the provider round-trips cannot be automated in E2E against real IDAMs. On STG, for each of CFT IDAM, Crime IDAM and MOJ SSO:

1. Sign in and note the time.
2. Leave the browser idle and confirm the warning dialogue appears at the configured warning threshold.
3. Confirm "Continue" keeps the session alive.
4. Repeat, let it lapse, and confirm sign-out at the configured logout threshold with the `/session-expired` page.
5. Confirm the elapsed times match across all three providers and match the values in `values.yaml`.
6. Confirm a continuously active session survives past 4 hours (defect D5).

Record the observed timings in the ticket. That record is the actual deliverable of an investigation ticket.

---

## 14. Assumptions & Open Questions

### 14.1 Assumptions

* **30 minutes of inactivity is the correct and agreed timeout.** It is what the code already does, it is a common government-service value for authenticated content of this sensitivity, and nothing in the ticket suggests a different target. This specification changes enforcement and warning, not the number. If the business wants a different number, it becomes a one-line Helm change under AC6 rather than a code change.
* **The timeout should remain uniform across providers.** No provider-specific requirement has been identified. CFT and Crime IDAM users hold the `VERIFIED` role, as B2C media users do; MOJ SSO users hold admin roles. Role-based rather than provenance-based differentiation would be the more defensible axis if differentiation is ever wanted, but neither is being introduced now.
* **The identity providers' own token lifetimes are not the binding constraint.** CaTH exchanges the authorisation code once at sign-in, reads the claims, and thereafter relies solely on its own Express session — `expires_in` from the CFT and Crime token responses is not stored and no refresh token is used. Consequently the IDAMs' token lifetimes have no effect on how long a CaTH session lasts. This is worth stating explicitly because it is the most likely wrong assumption a reader of the ticket title would make.
* **Single sign-out is out of scope.** Signing out of Azure AD or CFT IDAM elsewhere does not terminate a CaTH session before its inactivity timeout. No back-channel logout is implemented and none is being added.
* **Redis remains the session store for `apps/web`.** `postgres-session.ts` exists in `libs/web-core` with a 24-hour default `maxAge` but is not used by the web app. It is left untouched; if it is ever adopted, its cookie configuration will need the same treatment.
* **`lax` remains the correct `sameSite` value.** The OAuth redirects from all four providers are top-level GET navigations, which `Lax` permits. Tightening to `Strict` would break sign-in.
* **No CSRF token is required on `/api/extend-session`,** consistent with the rest of the service's POST handling. See Section 6.4 for the reasoning.

### 14.2 Open questions

* **Should an explicit absolute session cap replace the accidental 4-hour one?** Section 6.7 removes it, because as it stands it silently signs out active users with no explanation, which is worse than not having it. A deliberate cap — say `sessionCreatedAt` plus a configurable maximum, checked in `sessionTimeoutMiddleware` and landing on a distinct page — is implementable, but it is new functionality the ticket does not ask for, and an unextendable limit needs justifying against WCAG 2.2.1 (Section 12.4). **Recommendation: ship without an absolute cap and raise a separate ticket if the security assessment requires one.** Needs a decision from the service owner and the security assessor before merge, because it is a deliberate reduction in a control that exists today.
* **Are the warning and logout thresholds subject to an HMCTS-wide standard this service should inherit?** If a departmental standard exists, the values in `values.yaml` should match it rather than being set by this ticket. Needs confirmation from the security or architecture function.
* **Should the warning threshold be closer to the logout threshold?** A 5-minute window is generous and means an inactive user's browser sits with a modal open for 5 minutes. 2 minutes is also common. Low impact either way; flagging it so the choice is deliberate rather than inherited. **Recommendation: keep 5 minutes** — it is what the code and copy already assume, and a longer window is kinder to users who have stepped away.
* **Does the `notSavedText` claim hold everywhere?** It is true of the form journeys reviewed, but some flows persist partial state in the session (subscription selections, list-removal selections, reference-data uploads) and pending subscriptions are persisted in Redis independently of the session. Confirm no journey silently recovers partial data in a way that would make the message misleading, or soften the wording.
* **Should the modal strings move out of the JavaScript bundle?** They are currently the only user-facing copy in the service not held in `en.ts`/`cy.ts`. They could be passed through body data attributes instead, at the cost of five more attributes on every authenticated page. Left as-is for now; worth revisiting if the content team needs to own them.
* **Does STG have any load balancer or ingress idle timeout that could cut a session shorter than 30 minutes?** Not visible from the repository. Worth checking during the manual verification in Section 13.11 so the confirmed timing is genuinely end-to-end.
* **Is a rate limit needed on `/api/extend-session`?** Without one, a script could keep a session alive indefinitely — but only using a cookie it already holds, which it could equally achieve by requesting any page. **Recommendation: no rate limit.** Raise it only if the security review disagrees.


---

### Comment by OgechiOkelu on 2026-08-20T15:41:57Z

@plan 

