# Technical Plan — #764: Check session timeout login for CFT, Crime and MOJ SSO IDAM

## 0. Answer to the acceptance criterion (the investigation result)

**The set timing is 30 minutes of inactivity, with a warning intended at 25 minutes, and it is
identical for all four sign-in provenances.**

`sessionTimeoutMiddleware` (`libs/auth/src/middleware/session-timeout.ts`) contains no branch on
`req.user.provenance`. `CFT_IDAM`, `CRIME_IDAM`, `SSO` and `PI_AAD` all share one code path and one
pair of thresholds resolved by `getTimeoutConfig()`. There is no per-provider configuration to
confirm and none is required.

| Concern | Value in effect | Source (verified at `3c7178c`) |
| --- | --- | --- |
| Inactivity **warning** threshold | 25 min (`1500000` ms) | `libs/auth/src/session/timeout-tracker.ts:3` |
| Inactivity **logout** threshold | 30 min (`1800000` ms) | `libs/auth/src/session/timeout-tracker.ts:4` |
| Env overrides | `SESSION_TIMEOUT_WARNING_MS`, `SESSION_TIMEOUT_LOGOUT_MS` | `timeout-tracker.ts:11-12` |
| Are the overrides set anywhere? | **No** — zero hits for `SESSION_TIMEOUT` in `apps/**/*.yaml` / `apps/**/*.json` | verified by grep |
| Session cookie `maxAge` | **4 hours**, `rolling` unset | `libs/web-core/src/middleware/session-stores/redis-store.ts:20` |
| Client warning/logout thresholds | 25 / 30 min, hardcoded a **second** time | `apps/web/src/assets/js/session-timeout.ts:6-7` |
| Enforcement point | `app.use(sessionTimeoutMiddleware)` | `apps/web/src/app.ts:189` |
| Expiry landing page | `GET /session-expired` | `apps/web/src/pages/(auth)/session-expired/` |

Layered on top is an **undocumented absolute cap of 4 hours** from sign-in, imposed by the session
cookie's `maxAge`. It is not an inactivity timeout and is not surfaced to the user.

### 0.1 Why the ticket cannot close as "confirmed, no change needed"

Nine defects were confirmed by reading the code. The two that matter most: **the 25-minute warning
modal never renders for any user** (D1), and **the endpoint its Continue button calls does not
exist** (D2). So the confirmed 30-minute timing is enforced, but with no warning — every CFT,
Crime, SSO and B2C user is dumped onto `/session-expired` with no chance to save work.

| ID | Defect | Evidence |
| --- | --- | --- |
| **D1** | Warning modal never appears. `initSessionTimeout()` returns unless `document.body.dataset.authenticated` is set (`session-timeout.ts:44-46`); nothing sets `data-authenticated` on `<body>`. `base-template.njk` never sets `bodyAttributes`; `authNavigationMiddleware` only sets `res.locals.isAuthenticated`. The attribute is set **only inside the unit test**, so the suite passes while the feature is inert in every environment. | grep: 0 hits for `bodyAttributes` outside `node_modules` |
| **D2** | `POST /api/extend-session` does not exist. Only hits are the `fetch()` call and its test. It resolves to `notFoundHandler()`. `fetch` resolves (not rejects) on 404, so the client treats failure as success. It "works" only as an accident: the request passes through `sessionTimeoutMiddleware`, which calls `updateLastActivity()` before the 404 is produced. | grep: `extend-session` only in `session-timeout.ts` + its test |
| **D3** | Thresholds duplicated. `getTimeoutConfig()` reads the env vars; the client timers are compile-time constants. `res.locals.sessionTimeoutMs` is computed (`session-timeout.ts:44`) and **no template reads it**. Setting either env var would silently desynchronise browser from server. | grep: 0 `.njk` hits for `sessionTimeoutMs` |
| **D4** | `isSessionApproachingExpiry` (`timeout-tracker.ts:37`) is dead code — referenced only by its own test, not even exported from `libs/auth/src/index.ts`. Violates "Don't export functions in order to test them". | grep confirmed |
| **D5** | 4-hour cookie cap signs out active users silently. `rolling` is unset, so `express-session` emits `Set-Cookie` only on session creation; the cookie `Expires` is fixed at sign-in + 4h and never refreshed however active the user is. The Redis TTL *is* refreshed (session is written every authenticated request because `lastActivity` changes), so the server record outlives the cookie. An admin working continuously is signed out at 4h with no warning, no `/session-expired`, no explanation — the next click renders as anonymous. | `redis-store.ts:20`, no `rolling` key |
| **D6** | `session.lastActivity = Date.now()` appears in the B2C return handler only (`login/return/index.ts:133`). CFT, Crime and SSO return handlers do not set it. Behaviour converges via the middleware, but the asymmetry is a latent trap. | grep confirmed: single non-test writer |
| **D7** | `trackUserActivity()` resets both timers on `mousedown`/`keydown`/`scroll`/`touchstart` **without contacting the server** (`session-timeout.ts:116-127`). Scrolling a long cause list pushes the browser warning out indefinitely while the server's `lastActivity` stands still — user is never warned, then hits `/session-expired` on the next navigation. Same user-visible failure as D1 by a second route. | code read |
| **D8** | `/session-expired` reads `req.query.lng` directly (`index.ts:9`) instead of `res.locals.locale`, against the project controller pattern. Works today only because both redirect sites append `?lng=cy` themselves. A Welsh user arriving by bookmark or link gets English. | code read |
| **D9** | `/session-expired` renders the heading in `govukPanel` with `govuk-panel--confirmation` — the large green success panel. Per the GOV.UK Design System, panel confirms a *completed transaction*; being signed out through inactivity is not a success outcome. | `index.njk` |

### 0.2 Scope decision

The ticket says "confirm the set timing … and update if needed". The confirmed timing (30 minutes'
inactivity, uniform across providers) is judged appropriate and is **not changed**. "If needed"
resolves to: make that timing genuinely and consistently enforced, warn the user as was always
intended, collapse the duplication, and remove the silent 4-hour cliff. No new user journey.

---

## 1. Technical Approach

Four structural moves, in dependency order:

1. **One source of truth for the two numbers.** `getTimeoutConfig()` stays canonical and gains
   input hardening. The client stops holding its own copies and instead reads the server's *remaining*
   time from `<body>` data attributes. That single change closes D1, D3 and D7 together, because
   once the browser is seeded from the server it has nothing to desynchronise from.
2. **Make the extend contract real.** Add `POST /api/extend-session` returning `204`/`401`, and make
   the client check `response.ok` and fail closed to `/session-expired`. (D2)
3. **Make the cookie agree with the middleware.** `rolling: true` and `cookie.maxAge` derived from the
   logout threshold, so cookie expiry, Redis TTL and `lastActivity` all track one rolling window. (D5)
4. **Clean-up and correctness tail.** Delete dead code (D4), single `lastActivity` writer (D6),
   controller locale via `res.locals` (D8), correct component on the expiry page (D9), declare the
   timings in Helm so they are auditable without reading TypeScript (AC6).

### 1.1 Correction to the specification in the issue comment

The spec (§6.5) proposes `{% block bodyAttributes %}` in `base-template.njk`. **That will not work.**
In `govuk-frontend@6.2.0`, `dist/govuk/template.njk:34` is:

```njk
<body class="govuk-template__body {%- if bodyClasses %} {{ bodyClasses }}{% endif %}" {{- govukAttributes(bodyAttributes) }}>
```

`bodyAttributes` is a **variable passed to the `govukAttributes` macro**, not a Nunjucks block. There
is no `bodyAttributes` block to override. Use a root-level `{% set %}` in `base-template.njk` — the
same mechanism `{% set govukRebrand = true %}` already uses at line 4 of that file, so the pattern is
proven in this repo.

`govukAttributes` supports the `{ value, optional: true }` form and omits attributes whose value is
`undefined`, `null` or `false` (see `node_modules/govuk-frontend/dist/govuk/macros/attributes.njk`).
That gives an unconditional `set` with no `{% if %}` wrapper:

```njk
{% set bodyAttributes = {
  "data-authenticated": { value: "true" if isAuthenticated else false, optional: true },
  "data-session-timeout-ms": { value: sessionTimeoutMs if isAuthenticated else false, optional: true },
  "data-session-warning-ms": { value: sessionWarningMs if isAuthenticated else false, optional: true }
} %}
```

Use the string `"true"`, not boolean `true` — with `optional: true` a boolean `true` renders the
attribute name only, without a value.

### 1.2 Architecture decision: one duplicated constant, deliberately

`libs/web-core` must **not** import `@hmcts/auth` — `@hmcts/auth` already depends on web-core's
Express type augmentation, so that would be a cycle (CLAUDE.md: "Don't create circular dependencies").
`redis-store.ts` therefore reads `SESSION_TIMEOUT_LOGOUT_MS` directly and falls back to the same
`1800000` default, with a comment pointing at `timeout-tracker.ts` as canonical. This duplicates one
*number* to avoid a cycle; it does not duplicate *logic*. This is the only accepted duplication —
the client-side copies are removed outright.

### 1.3 Fail-closed principle for the client

Where the browser cannot establish a trustworthy view of the server's remaining time (attributes
missing, `NaN`, non-positive, or `warning >= timeout`), it starts **no timers and shows no modal**.
The server-side 30-minute enforcement still applies. Falling back to a hardcoded default is exactly
how D3 would return through the back door, so it is prohibited.

### 1.4 What deliberately stays out of scope

- No per-provider timeout differentiation (nothing requires it; role would be the better axis if ever wanted).
- No absolute session cap to replace the removed 4-hour one — see Open Question Q1.
- No single sign-out / back-channel logout.
- No CSRF token on the new endpoint (consistent with the rest of the service; reasoning in §3.4).
- No rate limit on the new endpoint (see Q6).
- `session-logged-out` (deliberate sign-out) is untouched — different outcome, already correct.
- `postgres-session.ts` is untouched: it is not used by `apps/web` (only `expressSessionRedis` is
  wired at `app.ts:112`). Noted so that if it is ever adopted it needs the same treatment.

---

## 2. Implementation Details

**TEMPLATE SOURCE: n/a**

No new rendered page or list-type view is introduced. `/session-expired` already exists; the change
to it is a component correction (replace `govukPanel` with `h1` + body + `govukButton`), not a
migration. The warning modal is constructed in client-side JavaScript, not from a `.njk` template.

### 2.1 Files changed and added

| File | Change | Addresses |
| --- | --- | --- |
| `libs/auth/src/session/timeout-tracker.ts` | Remove `isSessionApproachingExpiry`; harden `getTimeoutConfig()` parsing | D4, §3.1 |
| `libs/auth/src/session/timeout-tracker.test.ts` | Delete the dead-function block; add hardening cases | D4 |
| `libs/auth/src/middleware/session-timeout.ts` | Hoist `PUBLIC_ROUTES` to module scope; set `res.locals.sessionWarningMs`; resolve locale via `res.locals.locale ?? req.cookies?.locale` | D3, D8 |
| `libs/auth/src/middleware/session-timeout.test.ts` | Per-provenance equivalence cases; `sessionWarningMs` assertions | AC1 |
| `libs/auth/src/routes/extend-session.ts` | **New** — `POST /api/extend-session` | D2 |
| `libs/auth/src/routes/extend-session.test.ts` | **New** | D2 |
| `libs/auth/src/config.ts` | Add `export const apiRoutes = { path: path.join(__dirname, "routes") }` | D2 |
| `libs/web-core/src/middleware/session-stores/redis-store.ts` | `rolling: true`; `cookie.maxAge` from `SESSION_TIMEOUT_LOGOUT_MS`, default `1800000` | D5 |
| `libs/web-core/src/middleware/session-stores/redis-store.test.ts` | Extend (file exists) | D5 |
| `libs/web-core/src/views/layouts/base-template.njk` | Root-level `{% set bodyAttributes = ... %}` per §1.1 | D1, D3 |
| `libs/web-core/src/views/layouts/base-template.njk.test.ts` | **New** | D1 |
| `apps/web/src/assets/js/session-timeout.ts` | Read thresholds from `<body>`; delete the two constants; delete input-event resets; check `response.ok`; dialogue semantics, focus trap, `Escape` | D1, D3, D7, AC5 |
| `apps/web/src/assets/js/session-timeout.test.ts` | Rewrite against the data-attribute contract | D1, D3, D7 |
| `apps/web/src/assets/css/session-timeout.scss` | Percentage-based `max-width` for 320px / 400% zoom; no `outline: none` | AC5 |
| `apps/web/src/pages/(auth)/session-expired/index.ts` | Use `res.locals.locale`; pass `en`, `cy`, `t` | D8 |
| `apps/web/src/pages/(auth)/session-expired/index.njk` | Replace `govukPanel` with `h1` + body copy + `govukButton`; empty `backLink` block | D9 |
| `apps/web/src/pages/(auth)/session-expired/{en,cy}.ts` | Add `notSavedText`, `signInAgainButton`; drop `signInAgainLink` | D9 |
| `apps/web/src/pages/(auth)/session-expired/index.njk.test.ts` | Extend (file exists) | D9 |
| `apps/web/src/pages/(auth)/session-expired/index.test.ts` | Extend (file exists) | D8 |
| `apps/web/src/pages/(auth)/login/return/index.ts` | Remove the one-off `lastActivity` assignment (line 133) | D6 |
| `apps/web/src/pages/(auth)/login/return/index.test.ts` | Drop the `lastActivity` assertion | D6 |
| `apps/web/src/app.ts` | `app.use(await createSimpleRouter(authApiRoutes))` beside lines 215-216 | D2 |
| `apps/web/helm/values.yaml`, `apps/web/helm/values.dev.yaml` | Declare both `SESSION_TIMEOUT_*` env vars | AC6 |
| `e2e-tests/tests/session-timeout.spec.ts` | **New** — one `@nightly` journey test | §5 |

### 2.2 `getTimeoutConfig()` — hardening

Current code is `Number.parseInt(process.env.X || String(DEFAULT), 10)`. A typo'd Helm value
(`"30m"` → `30`, or `"abc"` → `NaN`) is a real hazard: with `logoutMs = NaN`,
`timeSinceActivity >= NaN` is always `false`, so **sessions would never expire**. A misconfigured
deployment must not silently disable the session timeout.

- Parse, then reject non-finite or non-positive results in favour of the default.
- If `warningMs >= logoutMs`, log once and clamp `warningMs` to `logoutMs / 2`.
- Defaults stay `DEFAULT_WARNING_MS = 1500000`, `DEFAULT_LOGOUT_MS = 1800000`.

This is defensive validation of deployment configuration, not speculative feature work.

### 2.3 `sessionTimeoutMiddleware` — revised behaviour

Hoist to module scope (currently rebuilt on every request):

```ts
const PUBLIC_ROUTES = ["/", "/sign-in", "/session-expired", "/logout", "/health"];
```

Otherwise unchanged, plus:

1. After `updateLastActivity()`, set **both**:
   - `res.locals.sessionTimeoutMs` — ms until sign-out (already computed; now actually consumed)
   - `res.locals.sessionWarningMs` — `Math.max(0, sessionTimeoutMs - (logoutMs - warningMs))`
2. On expiry, resolve locale as `res.locals.locale ?? req.cookies?.locale`, keeping the `?lng=cy`
   suffix. (D8)
3. `/api/extend-session` is deliberately **not** added to `PUBLIC_ROUTES` — it must pass through so
   the expiry check runs first. An extend request arriving after expiry must expire, not extend.

### 2.4 `POST /api/extend-session`

New route file `libs/auth/src/routes/extend-session.ts`, discovered by `createSimpleRouter` via a new
`apiRoutes` export from `libs/auth/src/config.ts` (which today exports only `pageRoutes` and
`moduleRoot`). This mirrors `@hmcts/location/config` and `@hmcts/public-pages`, already registered at
`apps/web/src/app.ts:215-216`.

| Aspect | Specification |
| --- | --- |
| Method / path | `POST /api/extend-session` |
| Auth | Requires `req.isAuthenticated()`; `401` with `{"error":"Not authenticated"}` otherwise (not localised — never rendered to a user) |
| Body | None. Nothing to validate |
| Success | `204 No Content`, no body |
| Side effect | None of its own — `sessionTimeoutMiddleware` has already refreshed `lastActivity` by the time the handler runs. The handler exists so the client gets a truthful status code instead of relying on a 404's side effects |
| Cache headers | `Cache-Control: no-store` |
| Registration order | **Before** `createSimpleRouter({ path: pages })` (`app.ts:219`), alongside lines 215-216 |

Progressive enhancement: reachable only from JavaScript. Without JS there is no modal and no Continue
button; the user simply gets the 30-minute server timeout and `/session-expired`. No core
functionality depends on it.

### 2.5 Body-attribute contract

Emitted by `base-template.njk` per §1.1. `isAuthenticated` comes from `authNavigationMiddleware`
(`app.ts:186`); `sessionTimeoutMs` / `sessionWarningMs` come from `sessionTimeoutMiddleware`
(`app.ts:189`), which runs after it. All three are on `res.locals`, so no controller changes are
needed anywhere.

- Emitted **only** when `isAuthenticated` is truthy, so anonymous pages start no timers.
- On a public route reached while signed in (e.g. `/`), the middleware skips tracking, so the two
  millisecond attributes are absent while `data-authenticated` is present. The client must treat that
  as "do not run" (§1.3).

### 2.6 Client-side module — revised behaviour

| Behaviour | Specification |
| --- | --- |
| Init guard | Run only if `data-authenticated` is present **and** both ms attributes parse as finite numbers with `0 <= warning < timeout` |
| Timer seeding | `warningTimer` at `sessionWarningMs`, `logoutTimer` at `sessionTimeoutMs` — the server's remaining time, not a fresh 25/30 minutes |
| Input-event resets | **Removed** (D7). Every real navigation or submission is a server request, which refreshes `lastActivity` and re-seeds on the next page load |
| Warning display | Show dialogue; per-second countdown over `sessionTimeoutMs - sessionWarningMs` |
| Countdown format | `m:ss`, zero-padded seconds — existing `updateCountdown` is correct and retained |
| Continue | `POST /api/extend-session`; on `response.ok` dismiss and reseed from the full configured durations; on any non-ok status **or** network failure, redirect to `/session-expired` |
| Timeout reached | Redirect to `/session-expired`, `?lng=cy` when Welsh |
| Locale | Existing `getCurrentLocale()` (URL `lng` → `locale` cookie → `en`) retained |
| Nonce | No inline `<script>` added; the module stays bundled via `web.ts:9`. No CSP nonce plumbing |

The 5-minute warning window is **derived** (`logoutMs - warningMs`), so the two env vars remain the
only knobs.

### 2.7 Session cookie configuration

`libs/web-core/src/middleware/session-stores/redis-store.ts`:

| Option | Now | Specified |
| --- | --- | --- |
| `cookie.maxAge` | `1000 * 60 * 60 * 4` | `SESSION_TIMEOUT_LOGOUT_MS`, default `1800000` |
| `rolling` | unset | `true` |
| `resave` / `saveUninitialized` | `false` / `false` | unchanged |
| `cookie.secure` / `httpOnly` | `NODE_ENV === "production"` / `true` | unchanged |
| `cookie.sameSite` | unset (browser default `Lax`) | unchanged — `Lax` is required for the OAuth authorisation-code redirects from CFT, Crime, B2C and Azure AD to carry the session cookie |

The explicit `cookieMaxAge` option and `sessionOptions` override must keep working — existing callers
must not break (`apps/web/src/app.ts:112` passes neither).

**Consequences to accept explicitly:**

- The undocumented 4-hour absolute cap is removed. An indefinitely active user stays signed in
  indefinitely. See Q1.
- **Anonymous sessions also shorten from 4 hours to 30 minutes.** Anonymous sessions hold only
  `returnTo`, `lng`, `crimeOauthState` and the B2C provider/locale keys — all consumed within a single
  OAuth round-trip, so 30 minutes of inactivity is ample. The realistic edge is a user who lands on
  an SJP download-disclaimer page (which writes `session.returnTo`), walks away for over 30 minutes,
  then signs in: they lose the deep link and land on the default post-login page. Acceptable, but see Q4.
- Pending subscriptions are **not** affected — `restorePendingSubscriptionsMiddleware` reads them from
  Redis keyed by user id, independently of the session.
- `Set-Cookie` on every response is negligible overhead; the session is already written to Redis on
  every authenticated request because `lastActivity` changes.

### 2.8 `lastActivity` ownership

`sessionTimeoutMiddleware` becomes the sole writer. Remove the assignment at
`apps/web/src/pages/(auth)/login/return/index.ts:133`: the post-login redirect target
(`/account-home` or `returnTo`) is an authenticated non-public route, so the middleware sets
`lastActivity` on that very next request. CFT, Crime and SSO return handlers need no change — they
already rely on this. `lastActivity` stays declared on `SessionData` (`libs/auth/src/user-profile.ts:26`).

Existing safe behaviour to preserve: `isSessionExpired()` returns `false` when `lastActivity` is
absent, so the first authenticated request after any sign-in cannot expire.

### 2.9 Content

The modal is built in JavaScript, so its strings cannot come from a Nunjucks controller. The existing
`translations` object in `session-timeout.ts` is retained as the mechanism — the one place in the
service where locale strings live in a `.ts` asset rather than an `en.ts`/`cy.ts` pair. Accepted
consequence of a JS-generated modal; the key structure still mirrors `en`/`cy` exactly. See Q5.

Existing modal keys (`heading`, `bodyText`, `continueButton`) already have real Welsh and are kept
verbatim. One new key is needed for the dialogue's accessible name:

| Key | `en` | `cy` |
| --- | --- | --- |
| `dialogueLabel` | `Inactivity warning` | `[WELSH TRANSLATION REQUIRED: "Inactivity warning"]` |

Rendered sentence: `{bodyText} <strong>{countdown}</strong>.` — the numeric `m:ss` value is not translated.

`/session-expired` locale files — existing keys all have real Welsh and are unchanged except that
`signInAgainLink` is removed once no template references it:

| Key | `en` | `cy` | Change |
| --- | --- | --- | --- |
| `pageTitle` | `You have been signed out` | existing | unchanged |
| `heading` | `You have been signed out, due to inactivity` | existing | unchanged |
| `bodyText` | `Your session has expired because you have been inactive for too long.` | existing | unchanged |
| `notSavedText` | `We have not saved any information you had not yet submitted.` | `[WELSH TRANSLATION REQUIRED: …]` | **new** |
| `signInAgainButton` | `Sign in again` | `[WELSH TRANSLATION REQUIRED: "Sign in again"]` | **new** (replaces the text link) |

`notSavedText` exists because the commonest user question after an unexpected sign-out is whether
their work survived; answering it plainly prevents a support contact. Its accuracy needs confirming
— see Q3.

`en`/`cy` key parity is asserted by a template test per `.claude/rules/testing.md`.

### 2.10 Accessibility

The modal is the only new interactive component, and a timed modal is easy to get wrong under
WCAG 2.2. The current one is a plain `div` with no dialogue semantics, no focus management, no live
region and no keyboard dismissal.

**Semantics:** `role="dialog"` + `aria-modal="true"` on the content container;
`aria-labelledby` → the `h2` id, `aria-label` from `dialogueLabel` as fallback; `h2` not `h1` (the
page already owns an `h1`); toggle the `hidden` attribute rather than `style.display` so assistive
tech consistently ignores it while closed.

**Focus:** capture the focused element at open time (the modal opens on a timer, not a user action);
move focus to the container (`tabindex="-1"`) so heading and countdown are announced before the
button; trap `Tab`/`Shift+Tab` between container and Continue; restore focus on close; keep the GOV.UK
yellow focus style — no `outline: none` anywhere in `session-timeout.scss`.

**Countdown announcement (WCAG 4.1.3):** a naive `aria-live="polite"` on a per-second countdown makes
a screen reader announce 300 times. So the visible `<strong>` is **not** a live region. A separate
visually hidden `<div aria-live="polite" role="status">` announces at meaningful intervals only: on
open ("You will be signed out in 5 minutes"), then at 2 min, 1 min and 30 s. The visible `m:ss`
keeps updating every second for sighted users.

**WCAG 2.2.1 Timing Adjustable:** compliance rests on the standard mitigation — the user is warned
before the limit and can extend with a single action. That is precisely what D1 breaks. Warning notice
must be ≥ 20 s (5 min here); extension is one button press; extension must be available ≥ 10 times
(the endpoint is neither counted nor rate-limited, so effectively unlimited). Note the interaction with
§2.7: removing the 4-hour cap also removes a hard limit that could not be extended. Any reintroduced
cap (Q1) must be justified against 2.2.1's essential-activity exception.

**Keyboard:** `Tab`/`Shift+Tab` cycle within the dialogue; `Enter`/`Space` activate Continue (a real
`<button type="button">`, which it already is); **`Escape` behaves as Continue** — extend and dismiss.
A user pressing `Escape` wants the dialogue gone, not to be signed out.

**Visual:** `govuk-black` on `govuk-white` (4.5:1 exceeded); the overlay must not reduce contrast of the
modal content; the warning is conveyed by text and numerals, never colour alone; Continue is a standard
`govuk-button` (44×44px); readable and operable at 400% zoom and 320px width via percentage-based
`max-width`, never a fixed pixel width; no animated entrance so `prefers-reduced-motion` needs no
handling; **do not lock body scroll** — a user at 400% zoom may need to scroll to read the dialogue.

**`/session-expired`:** single `h1` with `govuk-heading-l`; `pageTitle` is a prefix of `heading`, both
from the same locale file; informational outcome, so no `govuk-panel--confirmation` (D9); fixing the
controller to use `res.locals.locale` (D8) keeps `<html lang>` and content consistent for cookie-based
Welsh users; skip link comes from `govuk/template.njk`, unchanged.

**No back link on `/session-expired`.** `base-template.njk` emits `govukBackLink` in `beforeContent`
whenever `back` is set, and its handler calls `history.back()` — which would return the user to a
now-unauthenticated page and immediately re-trigger the expiry redirect. The controller must not set
`back`, and the template overrides the `backLink` block to empty.

### 2.11 Navigation and redirects

| From | Trigger | To |
| --- | --- | --- |
| Any authenticated non-public page | Server sees `lastActivity` older than the threshold | `/session-expired` (`?lng=cy` when Welsh); session destroyed first |
| Any authenticated page | Browser logout timer fires | `/session-expired` (`?lng=cy` when Welsh) |
| Warning modal | Continue returns non-2xx or fails | `/session-expired` (fail closed) |
| Warning modal | Continue returns `204` | No navigation — modal dismissed, timers reseeded, unsubmitted input intact |
| `/session-expired` | "Sign in again" | `/sign-in` — the provider-choice page; the user re-picks CFT, Crime, MOJ SSO or B2C |
| Any page | `/logout` | `/session-logged-out` via the provider's logout endpoint for `PI_AAD`/`SSO` — unchanged |

`returnTo` is deliberately not preserved across an expiry: the session is destroyed, taking it with
it. Preserving it would mean writing the pre-expiry URL to a separate cookie, leaking which court or
case a signed-in user was viewing into a store that outlives their session. Not worth the convenience.

`/session-expired` stays in `PUBLIC_ROUTES` — without that entry the redirect loops.
`/session-logged-out` is deliberately not in it and does not need to be: by the time it is reached the
session is destroyed, so `req.isAuthenticated()` is false and the middleware skips.

While the modal is open the overlay prevents click-through and the focus trap keeps keyboard users out
of the header. If a user does reach `/logout`, deliberate sign-out takes precedence and they land on
`/session-logged-out` — the correct outcome, not an error.

### 2.12 API endpoints

| URL | Method | Status | Auth |
| --- | --- | --- | --- |
| `/api/extend-session` | `POST` | **New** | Authenticated only → `204`; otherwise `401` |
| `/session-expired` | `GET` | Existing, revised | Public; optional `?lng=cy` |
| `/session-logged-out` | `GET` | Existing, unchanged | Public |

Served from `apps/web`, not `apps/api`, because it operates on the web app's Express session.

### 2.13 Database schema changes

None.

---

## 3. Error Handling & Edge Cases

### 3.1 Configuration validation

| Input | Rule | On violation |
| --- | --- | --- |
| `SESSION_TIMEOUT_WARNING_MS` | Positive finite integer, ms | Fall back to `DEFAULT_WARNING_MS`; log once: `Invalid SESSION_TIMEOUT_* value, falling back to default` |
| `SESSION_TIMEOUT_LOGOUT_MS` | Positive finite integer, ms | Fall back to `DEFAULT_LOGOUT_MS`; log once |
| Relationship | `warningMs < logoutMs` | Clamp `warningMs` to `logoutMs / 2`; log once: `SESSION_TIMEOUT_WARNING_MS must be less than SESSION_TIMEOUT_LOGOUT_MS; clamping` |

### 3.2 Body-attribute validation (client)

| Attribute | Rule | On violation |
| --- | --- | --- |
| `data-authenticated` | Present or absent | Absent → do not initialise |
| `data-session-timeout-ms` | Finite, `> 0` | Missing / `NaN` / `<= 0` → do not initialise |
| `data-session-warning-ms` | Finite, `>= 0`, `<` timeout | Violated → do not initialise |

"Do not initialise" = no modal, no client timers; server-side enforcement still applies (§1.3).

### 3.3 Runtime edge cases

| Case | Handling |
| --- | --- |
| `session.destroy()` fails during expiry | Existing behaviour retained — log `Session destruction error:` and still redirect. The user must not be left on an authenticated page because a Redis delete failed |
| Extend request arrives after expiry | Middleware runs first (§2.3), so it expires and redirects. The handler is never reached |
| Public route reached while signed in | Middleware skips; ms attributes absent; client does not initialise |
| First authenticated request after sign-in | `lastActivity` absent → `isSessionExpired()` returns `false`; cannot expire |
| Multiple tabs open | Each tab seeds from its own page load. A navigation in one tab refreshes the server `lastActivity`; an idle tab may still show its warning modal. Continue in that tab returns `204` and dismisses it. Not a defect — no cross-tab coordination is added |
| User clicks Continue after the server session has already gone | `sessionTimeoutMiddleware` expires it; the client sees a non-2xx/redirect and fails closed to `/session-expired` |
| Browser back after expiry | Cached authenticated page may render, but the next request redirects to `/session-expired` |
| No JavaScript | No modal; server-side 30-minute timeout applies; user lands on `/session-expired` |

### 3.4 Security

`POST /api/extend-session` reads no body, query string or header beyond the session cookie. The only
check is `req.isAuthenticated()`. Nothing to sanitise; no database query, so the parameterised-query
requirement does not arise.

No CSRF token: the service does not currently apply CSRF tokens to form posts, so none is applied
here. The endpoint is state-refreshing only, requires an authenticated cookie, accepts no input and
returns no data, so a forged cross-site call can at worst keep alive a session the user's own browser
already holds. Flagged for security review (Q6).

No session identifier, cookie value, user email or token is written to any log.

### 3.5 User-facing messages

No validation error messages are introduced — there are no inputs.

| Situation | User sees |
| --- | --- |
| Warning threshold reached | `You will soon be signed out, due to inactivity` / `You will be signed out in m:ss.` (modal) |
| Logout threshold reached | `You have been signed out, due to inactivity` / `Your session has expired…` / `We have not saved any information you had not yet submitted.` (`/session-expired`) |
| Continue fails | The same `/session-expired` page — no separate message |

Deliberately no "we could not keep you signed in" message: from the user's point of view a failed
extension and an expired session are the same event with the same remedy — sign in again. A distinct
message adds a string to translate and a state to test for no user benefit.

---

## 4. Acceptance Criteria Mapping

The ticket's single AC is "Confirm the set timing for session timeout CFT, Crime, and MOJ SSO IDAM
users and update if needed." The spec comment decomposes it into AC1–AC6.

| AC | Satisfied by | Verified by |
| --- | --- | --- |
| **Ticket AC — confirm the timing** | §0: 30 min inactivity, 25 min warning, uniform across `CFT_IDAM`, `CRIME_IDAM`, `SSO`, `PI_AAD` — no provenance branch exists | Documented here; encoded as a unit test (§5.2) so a future per-provider divergence fails the build; observed timings recorded on STG (§5.7) |
| **AC1 — uniform and single-sourced** | Single `getTimeoutConfig()`; client reads server-supplied values only | Per-provenance middleware test; client test proving no hardcoded fallback |
| **AC2 — warning actually shown** | Body-attribute contract (§1.1, §2.5) + init guard + removal of input-event resets | `base-template.njk.test.ts` attribute assertions (D1 regression); client tests incl. the D7 inverse; E2E |
| **AC3 — Continue extends for real** | `POST /api/extend-session` returning `204`/`401`; client checks `response.ok`, fails closed | Route unit tests; client tests for `404`/`500`/rejected fetch (D2 regression); E2E |
| **AC4 — no unexplained sign-out** | `rolling: true` + `maxAge` from the logout threshold, so cookie, Redis TTL and `lastActivity` agree | `redis-store.test.ts`; manual 4-hour check on STG (§5.7) |
| **AC5 — Welsh parity and accessibility** | Welsh modal strings; `res.locals.locale` on the expiry page; dialogue semantics, focus trap, `Escape`, interval-based live region | Template/controller tests incl. key parity; Axe inline in E2E; manual screen-reader pass |
| **AC6 — documented and deployed** | Both env vars declared in `values.yaml` / `values.dev.yaml` with the confirmed values | Inspect the Helm values; E2E injects short values, which simultaneously proves the config path works |

---

## 5. Test Plan

### 5.1 `libs/auth/src/session/timeout-tracker.test.ts`

- 25/30-minute defaults when neither env var is set; configured values when both are valid.
- Falls back to defaults when either var is non-numeric, negative or zero — **and specifically proves
  a session with an old `lastActivity` still expires under that bad configuration** (the `NaN` gap, §2.2).
- Clamps and logs once when `warningMs >= logoutMs`.
- `isSessionExpired`: `false` without `lastActivity`, `false` just inside the window, `true` at and
  beyond the boundary.
- `getTimeUntilExpiry`: `null` without `lastActivity`, remaining ms inside the window, `0` (not
  negative) past expiry.
- Delete the `isSessionApproachingExpiry` block with the function.

### 5.2 `libs/auth/src/middleware/session-timeout.test.ts`

- Skips each public route and unauthenticated requests without touching `res.locals`.
- Destroys the session and redirects on expiry; redirects to `?lng=cy` from `res.locals.locale` and,
  separately, from the `locale` cookie when `res.locals.locale` is absent.
- Still redirects when `session.destroy` yields an error.
- Sets both `sessionTimeoutMs` and `sessionWarningMs`, with warning strictly less than timeout.
- **Identical values for `CFT_IDAM`, `CRIME_IDAM`, `SSO` and `PI_AAD` users given identical
  `lastActivity`** — this test encodes the ticket's acceptance criterion.
- Refreshes `lastActivity` for `/api/extend-session`, and expires instead when it arrives after the threshold.

### 5.3 `libs/auth/src/routes/extend-session.test.ts` (new)

`204` with no body when authenticated; `401` when not; `Cache-Control: no-store`.

### 5.4 `libs/web-core/src/middleware/session-stores/redis-store.test.ts`

`rolling: true`; `maxAge` defaults to 30 min not 4 h; derives from `SESSION_TIMEOUT_LOGOUT_MS`; still
honours explicit `cookieMaxAge` and `sessionOptions` overrides; `secure`/`httpOnly`/`resave`/
`saveUninitialized` unchanged (regression guard on the existing assertions).

### 5.5 `apps/web/src/assets/js/session-timeout.test.ts` (rewrite)

- No init without `data-authenticated`; no init when the ms attributes are missing, `NaN`, zero or
  negative — and specifically **no fallback to a hardcoded 25/30 minutes**; no init when
  `warning >= timeout`.
- Seeds from the body attributes, proven with deliberately unusual values (4-minute timeout, 3-minute warning).
- Shows the dialogue on the warning timer, countdown starting at the derived window; `m:ss` zero-padded
  including under one minute.
- **Does not reset timers on `mousedown`/`keydown`/`scroll`/`touchstart`** — the D7 regression, and the
  inverse of what the current suite asserts.
- Redirects to `/session-expired` on the logout timer; `?lng=cy` when Welsh.
- Continue → `204` dismisses and reseeds; `404`/`500` redirects to `/session-expired` (D2 regression —
  a resolved-but-not-ok `fetch` must not count as success); rejected `fetch` also redirects.
- Welsh modal text when the locale is Welsh; `Tab` trapped in the dialogue; `Escape` behaves as Continue.

### 5.6 Template and controller tests

- `base-template.njk.test.ts` (new): emits all three attributes when `isAuthenticated` and both values
  are present (D1 regression, via Cheerio attribute queries); emits none when not authenticated; omits
  the ms attributes but keeps `data-authenticated` when the middleware skipped tracking.
- `session-expired/index.njk.test.ts`: single `h1`; **no element carrying `govuk-panel--confirmation`**
  (D9 regression); "not saved" paragraph present; "Sign in again" as a `govuk-button` to `/sign-in`;
  no back link; Welsh headings and button text with the `cy` object; `en`/`cy` key parity.
- `session-expired/index.test.ts`: selects content from `res.locals.locale` with no `lng` (D8
  regression); Welsh when `res.locals.locale` is `cy`; still Welsh with only `?lng=cy` so existing
  redirect targets keep working; passes `en`, `cy`, `t`.
- `login/return/index.test.ts`: drop the `session.lastActivity` assertion; other login assertions unchanged.

### 5.7 E2E — `e2e-tests/tests/session-timeout.spec.ts` (new)

**One** Playwright test tagged `@nightly`, per the E2E guidance in CLAUDE.md. It must run with short
timeouts injected via `SESSION_TIMEOUT_WARNING_MS` / `SESSION_TIMEOUT_LOGOUT_MS` (e.g. 6 s and 10 s) —
a real 25-minute wait is not viable, and the injected values simultaneously prove the config path works.

One journey, in order: sign in as an admin → assert `<body>` carries `data-authenticated` and both ms
attributes → wait for the warning and assert the dialogue with a counting-down timer → Axe with the
dialogue open → `Tab`-only traversal and keyboard-activate Continue, asserting the dialogue closes, the
page is unchanged and the user is still signed in → switch to Welsh, wait again, assert the Welsh
heading and "Parhau" → let the countdown lapse, assert the redirect to `/session-expired?lng=cy` and
Welsh content → Axe on `/session-expired` → "Sign in again" lands on `/sign-in`.

Deliberately **not** separate tests: the Welsh, accessibility, keyboard and redirect checks are all
points along this one journey.

### 5.8 Manual verification before closing the ticket

The point of the ticket is confirmation across three identity providers, and the provider round-trips
cannot be automated against real IDAMs. On STG, for each of CFT IDAM, Crime IDAM and MOJ SSO:

1. Sign in and note the time.
2. Idle; confirm the warning dialogue appears at the configured warning threshold.
3. Confirm Continue keeps the session alive.
4. Repeat, let it lapse; confirm sign-out at the configured logout threshold with `/session-expired`.
5. Confirm elapsed times match across all three providers and match `values.yaml`.
6. Confirm a continuously active session survives past 4 hours (D5).
7. Check for any ingress or load-balancer idle timeout that could cut a session shorter (Q7).

**Record the observed timings in the ticket.** That record is the actual deliverable of an
investigation ticket.

Automated checks do not cover focus return or live-region timing — both need a manual screen-reader
pass (NVDA + Firefox, VoiceOver + Safari) before the ticket closes.

---

## 6. Assumptions

- **30 minutes of inactivity is the correct and agreed timeout.** It is what the code already does and
  a common value for authenticated government content of this sensitivity. This plan changes
  enforcement and warning, not the number. A different number becomes a one-line Helm change under AC6.
- **The timeout should remain uniform across providers.** No provider-specific requirement has been
  identified. CFT and Crime IDAM users hold `VERIFIED`, as B2C media users do; MOJ SSO users hold admin
  roles. Role-based rather than provenance-based differentiation would be the more defensible axis if
  differentiation is ever wanted; neither is introduced now.
- **The identity providers' own token lifetimes are not the binding constraint.** CaTH exchanges the
  authorisation code once at sign-in, reads the claims, and thereafter relies solely on its own Express
  session — `expires_in` is not stored and no refresh token is used. The IDAMs' token lifetimes
  therefore have no effect on how long a CaTH session lasts. Stated explicitly because it is the most
  likely wrong assumption a reader of the ticket title would make.
- **Single sign-out is out of scope.** Signing out of Azure AD or CFT IDAM elsewhere does not terminate
  a CaTH session before its inactivity timeout.
- **Redis remains the session store for `apps/web`.** `postgres-session.ts` (24-hour default `maxAge`)
  is not used by the web app and is left untouched.
- **`Lax` remains the correct `sameSite` value** — the OAuth redirects from all four providers are
  top-level GET navigations, which `Lax` permits. `Strict` would break sign-in.

---

## CLARIFICATIONS NEEDED

**Q1 — Should an explicit absolute session cap replace the accidental 4-hour one?** §2.7 removes it,
because as it stands it silently signs out active users with no explanation, which is worse than not
having it. A deliberate cap (`sessionCreatedAt` + a configurable maximum, checked in
`sessionTimeoutMiddleware`, landing on a distinct page) is implementable, but it is new functionality
the ticket does not ask for, and an unextendable limit needs justifying against WCAG 2.2.1 (§2.10).
**Recommendation: ship without an absolute cap and raise a separate ticket if the security assessment
requires one.** This is the one genuinely blocking question — it is a deliberate reduction in a control
that exists today, so it needs a decision from the service owner and the security assessor before merge.

**Q2 — Is there an HMCTS-wide standard for these thresholds that this service should inherit?** If a
departmental standard exists, `values.yaml` should match it rather than having the values set by this
ticket. Needs confirmation from the security or architecture function. Does not block implementation —
changing the number afterwards is a one-line Helm edit.

**Q3 — Does the `notSavedText` claim hold everywhere?** "We have not saved any information you had not
yet submitted" is true of the form journeys reviewed, but some flows persist partial state in the
session (subscription selections, list-removal selections, reference-data uploads), and pending
subscriptions are persisted in Redis independently of the session. Confirm no journey silently recovers
partial data in a way that would make the message misleading, or soften the wording.

**Q4 — Is shortening anonymous sessions from 4 hours to 30 minutes acceptable?** It follows from
deriving `cookie.maxAge` from the logout threshold. The realistic edge: a user on an SJP
download-disclaimer page (which writes `session.returnTo`) walks away for over 30 minutes, then signs
in and loses the deep link. **Recommendation: accept.** Flagging it so the choice is deliberate.

**Q5 — Should the modal strings move out of the JavaScript bundle?** They are the only user-facing copy
in the service not held in `en.ts`/`cy.ts`. They could be passed through body data attributes instead,
at the cost of several more attributes on every authenticated page. **Recommendation: leave as-is**;
revisit if the content team needs to own them.

**Q6 — Is a rate limit or CSRF token needed on `/api/extend-session`?** Without a rate limit a script
could keep a session alive indefinitely — but only using a cookie it already holds, which it could
equally achieve by requesting any page. **Recommendation: neither**, consistent with the rest of the
service. Raise only if security review disagrees.

**Q7 — Does STG have a load balancer or ingress idle timeout that could cut a session shorter than 30
minutes?** Not visible from the repository. To be checked during the manual verification (§5.8) so the
confirmed timing is genuinely end-to-end.

**Q8 — Should the warning threshold sit closer to the logout threshold?** A 5-minute window means an
inactive user's browser sits with a modal open for 5 minutes; 2 minutes is also common. Low impact
either way. **Recommendation: keep 5 minutes** — it is what the code and copy already assume, and a
longer window is kinder to users who have stepped away.
