# Implementation Checklist — #357: Crime IDAM Integration

Tasks are ordered so each step compiles and tests pass before moving to the next.

---

## 1. Config

- [ ] Create `libs/auth/src/config/crime-idam-config.ts`
  - Export `CrimeIdamConfig` interface with fields: `crimeIdamBaseUrl`, `clientId`, `clientSecret`, `redirectUri`, `scope`, `authorizationEndpoint`, `tokenEndpoint`, `userInfoEndpoint`
  - Export `getCrimeIdamConfig()` — reads `CRIME_IDAM_BASE_URL`, `CRIME_IDAM_CLIENT_ID`, `CRIME_IDAM_CLIENT_SECRET`, `CRIME_IDAM_SCOPE` (default `"openid profile roles"`), `BASE_URL`; derives `redirectUri` as `${baseUrl}/crime-login/return`; derives endpoint paths as `${crimeIdamBaseUrl}/oauth2/authorise`, `/oauth2/token`, `/details`
  - Export `isCrimeIdamConfigured()` — returns `false` in development when `ENABLE_CRIME_IDAM` is not set; returns `false` if `crimeIdamBaseUrl` or `clientSecret` are empty

---

## 2. Token client

- [ ] Create `libs/auth/src/crime-idam/token-client.ts`
  - Export `CrimeIdamUserInfo` interface: `id`, `email`, `displayName`, `firstName?`, `surname?`, `roles`
  - Export `exchangeCodeForToken(code: string, config: CrimeIdamConfig): Promise<TokenResponse>` — POST to `config.tokenEndpoint` with URLSearchParams (`client_id`, `client_secret`, `grant_type: "authorization_code"`, `redirect_uri`, `code`); throw on non-2xx
  - Export `fetchUserInfoFromApi(accessToken: string, config: CrimeIdamConfig): Promise<CrimeIdamUserInfo>` — GET `config.userInfoEndpoint` with `Authorization: Bearer {accessToken}`; map response fields to `CrimeIdamUserInfo`; throw on non-2xx or missing required fields

---

## 3. Role service

- [ ] Modify `libs/auth/src/role-service/index.ts`
  - Add and export `isRejectedCrimeRole(roles: string[]): boolean` — returns `true` if `roles` is falsy, empty, or has zero length; returns `false` otherwise (accept all non-empty role sets)

---

## 4. Crime login page

- [ ] Create `libs/auth/src/pages/crime-login/index.ts`
  - Export `GET` handler: call `isCrimeIdamConfigured()` — if false, return `res.status(503).send("Crime IDAM authentication is not available. Please check configuration.")`; read locale from `req.query.lng` or `res.locals.locale` defaulting to `"en"`; store in `req.session.lng`; build `URLSearchParams` with `client_id`, `response_type: "code"`, `redirect_uri`, `scope`, `ui_locales`; redirect to `${config.authorizationEndpoint}?${params}`
- [ ] Create `libs/auth/src/pages/crime-login/index.test.ts`
  - Test: redirects to Crime IDAM authorisation URL with correct params when configured
  - Test: includes `scope` param in authorisation URL
  - Test: stores locale in session before redirect
  - Test: defaults locale to `"en"` when no `lng` query param
  - Test: uses Welsh locale when `lng=cy`
  - Test: uses `res.locals.locale` when no query param
  - Test: returns 503 when `isCrimeIdamConfigured()` is false

---

## 5. Crime callback handler

- [ ] Create `libs/auth/src/pages/crime-callback/index.ts`
  - Export `GET` async handler:
    - Read `code` from `req.query.code`; if missing, redirect to `/sign-in?error=no_code&lng={lng}`
    - Call `exchangeCodeForToken(code, config)` to get `tokenResponse`
    - Call `fetchUserInfoFromApi(tokenResponse.access_token, config)` to get `userInfo`
    - Call `isRejectedCrimeRole(userInfo.roles)`; if true, redirect to `/crime-rejected?lng={lng}`
    - Call `createOrUpdateUser({ email, firstName, surname, userProvenance: "CRIME_IDAM", userProvenanceId: userInfo.id, role: "VERIFIED" })`; on DB error, call `trackException` and redirect to `/sign-in?error=db_error&lng={lng}`
    - Build `UserProfile` with `provenance: "CRIME_IDAM"`, `role: "VERIFIED"`
    - `req.session.regenerate` → on error redirect to `/sign-in?error=session_failed&lng={lng}`
    - `req.login(user)` → on error redirect to `/sign-in?error=login_failed&lng={lng}`
    - `req.session.save` → on error redirect to `/sign-in?error=session_save_failed&lng={lng}`
    - Delete `req.session.lng`; redirect to `/account-home?lng={lng}`
    - Outer catch: call `trackException`; redirect to `/sign-in?error=auth_failed&lng={lng}`
- [ ] Create `libs/auth/src/pages/crime-callback/index.test.ts`
  - Mock `../../crime-idam/token-client.js`, `../../config/crime-idam-config.js`, `../../role-service/index.js`, `@hmcts/account/repository/query`, `@hmcts/cloud-native-platform`
  - Test: successful auth creates user and redirects to `/account-home?lng=en`
  - Test: calls `req.session.regenerate`, `req.login`, `req.session.save` in order
  - Test: `req.login` called with `UserProfile` containing `provenance: "CRIME_IDAM"` and `role: "VERIFIED"`
  - Test: `req.session.lng` deleted after successful redirect
  - Test: missing code → redirects to `/sign-in?error=no_code&lng=en`
  - Test: token exchange failure → redirects to `/sign-in?error=auth_failed&lng=en`
  - Test: user info fetch failure → redirects to `/sign-in?error=auth_failed&lng=en`
  - Test: rejected roles (empty array) → redirects to `/crime-rejected?lng=en`
  - Test: DB error → redirects to `/sign-in?error=db_error&lng=en`
  - Test: session regeneration failure → redirects to `/sign-in?error=session_failed&lng=en`
  - Test: `req.login` failure → redirects to `/sign-in?error=login_failed&lng=en`
  - Test: session save failure → redirects to `/sign-in?error=session_save_failed&lng=en`
  - Test: Welsh locale (`session.lng = "cy"`) preserved in success redirect → `/account-home?lng=cy`
  - Test: Welsh locale preserved in error redirects
  - Test: Welsh locale preserved in role rejection redirect

---

## 6. Crime rejected page

- [ ] Create `libs/auth/src/pages/crime-rejected/en.ts`
  - Export `en` object with: `title`, `message`, `whatYouCanDo`, `contactSupport`, `returnToSignIn` (exact strings from spec section 7)
- [ ] Create `libs/auth/src/pages/crime-rejected/cy.ts`
  - Export `cy` object mirroring `en` structure with placeholder Welsh translations (mark as requiring professional review)
- [ ] Create `libs/auth/src/pages/crime-rejected/index.ts`
  - Export `GET` async handler: `res.render("crime-rejected/index", { en, cy })`
- [ ] Create `libs/auth/src/pages/crime-rejected/index.njk`
  - Extend `layouts/base-template.njk`
  - `{% block page_content %}` — GOV.UK grid layout, `govuk-grid-column-two-thirds`
  - Render `{{ title }}` as `h1.govuk-heading-l`, `{{ message }}` as `p.govuk-body`, `{{ whatYouCanDo }}` as `h2.govuk-heading-m`, `{{ contactSupport }}` as `p.govuk-body`, `{{ returnToSignIn }}` as `govuk-link` pointing to `/sign-in`
- [ ] Create `libs/auth/src/pages/crime-rejected/index.test.ts`
  - Test: renders `"crime-rejected/index"` template
  - Test: passes `en` and `cy` objects to render

---

## 7. Module exports

- [ ] Modify `libs/auth/src/index.ts`
  - Add export: `export { getCrimeIdamConfig, isCrimeIdamConfigured } from "./config/crime-idam-config.js";`
  - Add export: `export { GET as crimeCallbackHandler } from "./pages/crime-callback/index.js";`
  - Add export: `export { isRejectedCrimeRole } from "./role-service/index.js";`

---

## 8. Sign-in page

- [ ] Modify `libs/public-pages/src/pages/sign-in/en.ts`
  - Add `crimeIdamLabel: "Sign in with Crime IDAM"` to the `en` object
- [ ] Modify `libs/public-pages/src/pages/sign-in/cy.ts`
  - Add `crimeIdamLabel: "Mewngofnodwch gyda IDAM Troseddol"` (placeholder — professional Welsh translation required)
- [ ] Modify `libs/public-pages/src/pages/sign-in/index.njk`
  - Add a fourth item to the `govukRadios` items array: `value: "crime-idam"`, `text: crimeIdamLabel`, `checked: data.accountType == "crime-idam" if data else false`
- [ ] Modify `libs/public-pages/src/pages/sign-in/index.ts`
  - Add `case "crime-idam": return res.redirect(\`/crime-login?lng=${locale}\`);` to the POST switch statement
- [ ] Modify `libs/public-pages/src/pages/sign-in/index.test.ts`
  - Add test: GET renders `crimeIdamLabel` in both `en` and `cy`
  - Add test: POST with `accountType: "crime-idam"` redirects to `/crime-login?lng=en`
  - Add test: POST with `accountType: "crime-idam"` and Welsh locale redirects to `/crime-login?lng=cy`

---

## 9. App registration

- [ ] Modify `apps/web/src/app.ts`
  - Add `crimeCallbackHandler` to the named import from `@hmcts/auth`
  - Register `app.get("/crime-login/return", crimeCallbackHandler);` immediately after the CFT callback registration on line 120
  - Confirm whether `configureHelmet` requires `CRIME_IDAM_BASE_URL` added to CSP directives (check `configureHelmet` signature in `@hmcts/web-core`)

---

## 10. E2E tests

- [ ] Create `e2e-tests/tests/crime-idam/crime-idam.spec.ts`
  - Test: user sees "Sign in with Crime IDAM" option on sign-in page, selects it, is redirected to Crime IDAM, authenticates, and lands on `/account-home` — include Welsh translation check and accessibility scan inline `@nightly`
  - Test: crime-rejected page displays correct content, is accessible (axe scan), and sign-in link navigates correctly; include Welsh content check `@nightly`
  - Test: callback with missing code redirects to sign-in with error param; callback with invalid code redirects to sign-in with error param `@nightly`
