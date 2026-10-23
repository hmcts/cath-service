# Implementation Tasks — #1242

## External dependency (raise first, does not block the code)

- [ ] Raise the IDAM demand request to enable the `login_hint` optional claim on the **ID token** for the CaTH SSO app registrations backing `sso-client-id` (STG) and `sso-client-id-dev` (preview)
- [ ] In the same request, confirm `{BASE_URL}/session-logged-out` is registered as a post-logout redirect URI on both registrations

## libs/auth

- [ ] Add `loginHint?: string` to `UserProfile` in `libs/auth/src/user-profile.ts`, above the "only used during authentication" comment block
- [ ] Add the `export` keyword to the `SsoConfig` interface in `libs/auth/src/config/sso-config.ts`
- [ ] Create `libs/auth/src/sso/logout-url.ts` with `buildSsoLogoutUrl(postLogoutRedirectUri, loginHint, config): string | null`, using `URL` / `URLSearchParams`, appending `logout_hint` only when `loginHint` is a non-empty non-whitespace string, and returning `null` when no tenant ID can be extracted
- [ ] Move `extractTenantId()` into `libs/auth/src/sso/logout-url.ts` as an unexported helper
- [ ] Export `buildSsoLogoutUrl` from `libs/auth/src/index.ts` alongside `buildCftIdamLogoutUrl`
- [ ] Map `claims.login_hint` onto `loginHint` in `verifyOidcCallback()` in `libs/auth/src/config/passport-config.ts` — no fallback to `preferred_username`, `email`, UPN or phone number, and no change to `scope`

## apps/web

- [ ] Capture `const loginHint = req.user?.loginHint;` in `apps/web/src/pages/(auth)/logout/index.ts`, alongside `userProvenance` and **before** `req.logout()`
- [ ] Delete the local `extractTenantId()` and the inline SSO URL string building from the logout controller
- [ ] Call `buildSsoLogoutUrl(getPostLogoutRedirectUri(req), loginHint, getSsoConfig())` and redirect to the result, falling back to `/session-logged-out` when it is `null`
- [ ] Verify the hint value is not written to any log line, error message or audit record

## Tests

- [ ] Create `libs/auth/src/sso/logout-url.test.ts` covering: hint present → both parameters; hint `undefined` → `logout_hint` omitted; hint empty/whitespace → omitted; reserved characters encoded in both parameters; tenant GUID extracted from a well-formed `SSO_ISSUER_URL`; `null` for an empty issuer URL and for one with no GUID followed by `/v2.0`
- [ ] Extend `libs/auth/src/config/passport-config.test.ts`: maps `login_hint` → `loginHint`; leaves `loginHint` undefined when the claim is absent without altering the other five mapped fields; does not substitute any other claim
- [ ] Extend `apps/web/src/pages/(auth)/logout/index.test.ts`: SSO user with `loginHint` → URL contains `logout_hint` after session destroy and cookie clear; SSO user without → no `logout_hint`; `req.logout` mock that clears `req.user` proves the hint is read first; `null` from `buildSsoLogoutUrl` → `/session-logged-out`; `CFT_IDAM` / `CRIME_IDAM` / `PI_AAD` redirects unchanged with no `logout_hint`
- [ ] Extend the existing `"session persistence, logout, and concurrent sessions @nightly"` journey in `e2e-tests/tests/sso/sso.spec.ts` — assert the sign out lands on `/session-logged-out` without a `login.microsoftonline.com` picker and that `/system-admin-dashboard` requires re-authentication, with the Welsh and inline axe checks inside the same journey (do not add a new test)

## Verification

- [ ] `yarn lint:fix` and `yarn test` pass from the repo root
- [ ] Manual on STG **before** the claim is enabled: sign out as each of the three SSO admin roles and confirm behaviour is unchanged (picker still shown, no errors, correct landing page)
- [ ] Manual on STG **after** the claim is enabled: decode the ID token at `/sso/return` to confirm `login_hint` is present, then confirm no picker on sign out for each of the three roles
- [ ] Manual on STG: with two Microsoft accounts signed in to the same browser, confirm only the CaTH account is ended and the second account's Entra session survives
- [ ] Manual on STG: confirm no web-app log line contains the hint value

## Follow-up tickets (out of scope here — raise, do not implement)

- [ ] Raise a ticket for ending the Entra session on SSO session timeout (`libs/auth/src/middleware/session-timeout.ts` currently only signs out `CFT_IDAM`)
- [ ] Raise a ticket for signing role-less IDAM users out of CaTH and Entra before rendering `/sso-rejected` (note: the page would need to be reachable unauthenticated)
