# Tasks — #764: Check session timeout login for CFT, Crime and MOJ SSO IDAM

## Implementation Tasks

### Single source of truth for the thresholds (D3, D4)
- [ ] Harden `getTimeoutConfig()` in `libs/auth/src/session/timeout-tracker.ts`: reject non-finite / non-positive parsed values in favour of the defaults; clamp `warningMs` to `logoutMs / 2` and log once when `warningMs >= logoutMs`
- [ ] Delete `isSessionApproachingExpiry` from `libs/auth/src/session/timeout-tracker.ts` (dead code, not exported from `index.ts`)
- [ ] Update `libs/auth/src/session/timeout-tracker.test.ts`: remove the `isSessionApproachingExpiry` block; add the hardening cases, including a test proving an old `lastActivity` still expires under bad configuration

### Middleware (D3, D8)
- [ ] Hoist `PUBLIC_ROUTES` to a module constant in `libs/auth/src/middleware/session-timeout.ts`
- [ ] Set `res.locals.sessionWarningMs = Math.max(0, sessionTimeoutMs - (logoutMs - warningMs))` alongside the existing `sessionTimeoutMs`
- [ ] Resolve the expiry-redirect locale as `res.locals.locale ?? req.cookies?.locale`
- [ ] Extend `libs/auth/src/middleware/session-timeout.test.ts`: `sessionWarningMs` assertions, locale resolution from both sources, and the per-provenance equivalence test for `CFT_IDAM` / `CRIME_IDAM` / `SSO` / `PI_AAD`

### Extend-session endpoint (D2)
- [ ] Create `libs/auth/src/routes/extend-session.ts` — `POST /api/extend-session`, `204` when authenticated, `401` with `{"error":"Not authenticated"}` otherwise, `Cache-Control: no-store`
- [ ] Add `export const apiRoutes = { path: path.join(__dirname, "routes") }` to `libs/auth/src/config.ts`
- [ ] Register `app.use(await createSimpleRouter(authApiRoutes))` in `apps/web/src/app.ts` beside lines 215-216, before the page router
- [ ] Create `libs/auth/src/routes/extend-session.test.ts`

### Body-attribute contract (D1)
- [ ] Add a root-level `{% set bodyAttributes = { ... } %}` to `libs/web-core/src/views/layouts/base-template.njk` using the `{ value, optional: true }` form — **not** a `{% block bodyAttributes %}`, which does not exist in `govuk-frontend@6.2.0` (see plan §1.1)
- [ ] Create `libs/web-core/src/views/layouts/base-template.njk.test.ts` asserting all three attributes when authenticated, none when not, and the ms attributes omitted when the middleware skipped tracking

### Client-side module (D1, D3, D7, AC5)
- [ ] Rewrite `apps/web/src/assets/js/session-timeout.ts`: delete `WARNING_THRESHOLD_MS` / `LOGOUT_THRESHOLD_MS`; read and validate the three body attributes; fail closed (no timers) on any invalid value with no hardcoded fallback
- [ ] Seed `warningTimer` / `logoutTimer` from the server-supplied remaining time
- [ ] Delete `trackUserActivity()` and its input-event timer resets
- [ ] Check `response.ok` in `handleContinue()`; redirect to `/session-expired` on any non-ok status or rejected fetch
- [ ] Add dialogue semantics (`role="dialog"`, `aria-modal="true"`, `aria-labelledby` → the `h2`, `hidden` attribute instead of `style.display`)
- [ ] Add focus capture on open, focus into the container (`tabindex="-1"`), `Tab`/`Shift+Tab` trap, focus restore on close, and `Escape` behaving as Continue
- [ ] Add a visually hidden `aria-live="polite" role="status"` region announcing at 5 min / 2 min / 1 min / 30 s only — the visible `m:ss` countdown must not be a live region
- [ ] Add the `dialogueLabel` key to both `translations.en` and `translations.cy` (Welsh marked `[WELSH TRANSLATION REQUIRED: ...]`)
- [ ] Update `apps/web/src/assets/css/session-timeout.scss`: percentage-based `max-width` for 320px and 400% zoom, no `outline: none`, no body-scroll lock
- [ ] Rewrite `apps/web/src/assets/js/session-timeout.test.ts` against the data-attribute contract, including the D7 inverse (no timer reset on input events) and the D2 regression (`404`/`500` must not count as success)

### Session cookie (D5)
- [ ] Set `rolling: true` and derive `cookie.maxAge` from `SESSION_TIMEOUT_LOGOUT_MS` (default `1800000`) in `libs/web-core/src/middleware/session-stores/redis-store.ts`, with a comment pointing at `timeout-tracker.ts` as canonical and explaining why web-core cannot import `@hmcts/auth`
- [ ] Extend `libs/web-core/src/middleware/session-stores/redis-store.test.ts`: `rolling`, the new default, derivation from the env var, and that explicit `cookieMaxAge` / `sessionOptions` overrides still win

### `lastActivity` ownership (D6)
- [ ] Remove `req.session.lastActivity = Date.now();` from `apps/web/src/pages/(auth)/login/return/index.ts:133`
- [ ] Drop the corresponding assertion from `apps/web/src/pages/(auth)/login/return/index.test.ts`

### Expiry page (D8, D9)
- [ ] Change `apps/web/src/pages/(auth)/session-expired/index.ts` to select content from `res.locals.locale` and pass `en`, `cy`, `t` per the controller pattern
- [ ] Add `notSavedText` and `signInAgainButton` to `en.ts` and `cy.ts`; remove `signInAgainLink` once unreferenced
- [ ] Replace `govukPanel` in `index.njk` with an `h1.govuk-heading-l`, the two body paragraphs and a `govukButton` to `/sign-in`; override the `backLink` block to empty
- [ ] Extend `index.njk.test.ts`: single `h1`, no `govuk-panel--confirmation`, not-saved paragraph, button, no back link, Welsh rendering, `en`/`cy` key parity
- [ ] Extend `index.test.ts`: locale from `res.locals.locale` with no `lng`, Welsh via `res.locals.locale`, still Welsh with only `?lng=cy`

### Configuration (AC6)
- [ ] Declare `SESSION_TIMEOUT_WARNING_MS` (`1500000`) and `SESSION_TIMEOUT_LOGOUT_MS` (`1800000`) in `apps/web/helm/values.yaml` and `apps/web/helm/values.dev.yaml`

### E2E
- [ ] Create `e2e-tests/tests/session-timeout.spec.ts` — one `@nightly` journey test driven by short injected `SESSION_TIMEOUT_*` values, covering warning → Axe → keyboard Continue → Welsh → lapse → `/session-expired` → Axe → "Sign in again"

### Verification
- [ ] `yarn lint:fix` and `yarn test` clean from the repository root
- [ ] `yarn test:e2e:all` passes with the new spec
- [ ] Manual screen-reader pass on the modal (NVDA + Firefox, VoiceOver + Safari) for focus return and live-region timing
- [ ] Manual STG verification for CFT IDAM, Crime IDAM and MOJ SSO: warning at threshold, Continue extends, sign-out at threshold, timings equal across providers and matching `values.yaml`, active session survives past 4 hours, no shorter ingress idle timeout
- [ ] **Record the observed timings as a comment on issue #764** — that record is the deliverable of an investigation ticket

### Blocked on clarification
- [ ] Q1 (plan §CLARIFICATIONS NEEDED) — confirm with the service owner and security assessor that removing the accidental 4-hour absolute cap is acceptable **before merge**. All other tasks can proceed regardless
