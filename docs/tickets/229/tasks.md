# Implementation Tasks

## Prerequisites (Non-Prod B2C)
- [ ] Obtain Non-Prod B2C tenant name, tenant ID, client ID, and client secret
- [ ] Confirm user flow policy names for HMCTS, Common Platform, CaTH
- [ ] Register redirect URI in Non-Prod B2C (e.g., `https://localhost:8080/b2c/callback`)

## B2C Configuration and Strategy
- [x] Create `libs/auth/src/config/b2c-config.ts` with Non-Prod tenant, policies, redirect URIs
- [ ] Create `libs/auth/src/b2c/strategy.ts` with Passport B2C OIDC strategy (deferred - using manual token exchange)
- [ ] Create `libs/auth/src/b2c/verify-callback.ts` for user profile extraction (integrated into callback handler)
- [ ] Update `libs/auth/src/config/passport-config.ts` to register B2C strategy (not needed - manual flow)
- [x] Add B2C environment variables to `.env.example`

## Sign-In Options Page
- [x] Create `libs/auth/src/pages/sign-in/index.ts` controller with GET/POST handlers
- [x] Create `libs/auth/src/pages/sign-in/index.njk` with radio buttons for 3 providers
- [x] Create `libs/auth/src/pages/sign-in/en.ts` with English content
- [x] Create `libs/auth/src/pages/sign-in/cy.ts` with Welsh content
- [x] Add validation for provider selection
- [x] Add error summary component for validation errors

## B2C Callback Handler
- [x] Create `libs/auth/src/pages/b2c-callback/index.ts` OAuth callback controller
- [x] Handle authorization code exchange
- [x] Create session with user profile
- [x] Handle B2C errors (invalid code, network failures, invalid policy)
- [x] Redirect to dashboard after successful sign-in

## Session Timeout
- [x] Create `libs/auth/src/session/timeout-tracker.ts` service
- [x] Create `libs/auth/src/middleware/session-timeout.ts` middleware
- [x] Track `lastActivity` timestamp in session
- [x] Create `libs/auth/src/pages/session-expired/index.ts` controller
- [x] Create `libs/auth/src/pages/session-expired/index.njk` template
- [x] Create `libs/auth/src/pages/session-expired/en.ts` content
- [x] Create `libs/auth/src/pages/session-expired/cy.ts` content
- [x] Create `libs/auth/src/assets/js/session-timeout.ts` client-side timer
- [x] Add countdown modal warning at 25 mins
- [x] Auto-logout at 30 mins

## Welsh Language Support
- [x] Pass `ui_locales` parameter to B2C flows based on session language
- [x] Test Welsh content on sign-in page (implemented in controller tests)
- [x] Test Welsh content on session expired page (implemented)
- [ ] Verify B2C flows display Welsh when `ui_locales=cy` is passed (requires Non-Prod B2C setup)

## Sign-Out Functionality
- [x] Update sign-out handler to call B2C logout endpoint
- [x] Destroy local session on sign-out
- [x] Redirect to appropriate page after sign-out

## Forgot Password Functionality
- [x] Add `policyPasswordReset` to B2C config interface
- [x] Create `libs/auth/src/pages/b2c-forgot-password/index.ts` handler
- [x] Export handler in `libs/auth/src/index.ts`
- [x] Register `/b2c-forgot-password` route in `apps/web/src/app.ts`
- [x] Add unit tests (b2c-forgot-password/index.test.ts - 5 tests)

## Module Registration
- [x] Add `build:nunjucks` script to `libs/auth/package.json` (already exists)
- [x] Export B2C handlers and middleware in `libs/auth/src/index.ts`
- [x] Register session timeout middleware in `apps/web/src/app.ts`
- [x] Include auth assets in web app (JS in index.ts, CSS in index.scss, exports in package.json)

## Unit Tests
- [x] Test B2C strategy configuration (b2c-config.test.ts - 9 tests)
- [x] Test verify callback profile extraction (integrated into callback handler)
- [x] Test session timeout tracker service (timeout-tracker.test.ts - 13 tests)
- [x] Test session timeout middleware (session-timeout.test.ts - 6 tests)
- [x] Test sign-in page controller (GET/POST) (index.test.ts - 9 tests)
- [x] Test B2C callback handler (b2c-callback/index.test.ts - 23 tests)
- [x] Test session expired page controller (session-expired/index.test.ts - 5 tests)
- [x] Test validation errors on sign-in page (included in controller tests)

## E2E Tests
- [x] Test complete sign-in journey with HMCTS provider (sign-in.spec.ts - redirects to CFT IDAM)
- [x] Test complete sign-in journey with Common Platform provider (sign-in.spec.ts - redirects to home)
- [x] Test complete sign-in journey with CaTH provider (sign-in.spec.ts - redirects to B2C with Welsh locale support)
- [x] Test validation error when no provider selected (sign-in.spec.ts)
- [x] Test Welsh language on sign-in flow (sign-in.spec.ts - multiple Welsh tests)
- [ ] Test session timeout warning modal (requires authenticated session - manual testing)
- [ ] Test session timeout auto-logout (requires authenticated session - manual testing)
- [x] Test sign-out journey (sign-out.spec.ts - session-logged-out page)
- [x] Test accessibility on sign-in page (sign-in.spec.ts - axe-core checks)
- [x] Test accessibility on session expired page (session-expired.spec.ts - axe-core checks)
