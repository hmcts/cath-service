# Implementation Tasks: Replace passport-azure-ad with openid-client (#347)

## Implementation Tasks

- [ ] Confirm `openid-client` version in use across the monorepo (v5 vs v6+) and identify the exact version to pin
- [ ] In `libs/auth/package.json`: remove `passport-azure-ad` from `dependencies` and add `openid-client` at the pinned version
- [ ] In `libs/auth/src/config/sso-config.ts`: rename env var read from `SSO_IDENTITY_METADATA` to `SSO_ISSUER_URL`, rename the interface field from `identityMetadata` to `issuerUrl`, and remove the `appendOpenIdConfigPath` function
- [ ] In `libs/auth/src/config/sso-config.ts`: update `isSsoConfigured()` to check `issuerUrl` instead of `identityMetadata`
- [ ] In `libs/auth/src/config/passport-config.ts`: make `configurePassport` async and replace the `OIDCStrategy` instantiation with a custom Passport strategy that uses `Issuer.discover()` and `openid-client`'s `client.authorizationUrl()` / `client.callback()` for the OIDC code flow
- [ ] In the custom strategy: generate `state` and `nonce` on the redirect leg, store them in `req.session.ssoOidc`, and read them back on the callback leg for validation
- [ ] In the custom strategy: simplify the verify callback to receive `(claims, accessToken, done)` and keep the existing `fetchUserProfile` and `determineSsoUserRole` calls unchanged
- [ ] In `libs/auth/src/pages/login/index.ts`: change strategy name from `"azuread-openidconnect"` to `"sso-oidc"`
- [ ] In `libs/auth/src/pages/sso-callback/index.ts`: change strategy name from `"azuread-openidconnect"` to `"sso-oidc"`
- [ ] In `apps/web/src/app.ts`: add `await` to the `configurePassport(app)` call
- [ ] In `libs/auth/src/config/sso-config.test.ts`: replace `SSO_IDENTITY_METADATA` with `SSO_ISSUER_URL` throughout, update the expected `issuerUrl` assertion to remove the `/.well-known/openid-configuration` suffix, and remove the `appendOpenIdConfigPath` test case
- [ ] In `libs/auth/src/config/passport-config.test.ts`: replace the `passport-azure-ad` / `OIDCStrategy` mock with an `openid-client` mock (`Issuer.discover`, `BaseClient`), update assertions to use the `"sso-oidc"` strategy name, and update the verify callback extraction to match the new signature
- [ ] In `libs/auth/src/pages/login/index.test.ts`: update the `passport.authenticate` call assertion from `"azuread-openidconnect"` to `"sso-oidc"`
- [ ] Run `yarn test` in `libs/auth` and fix any remaining test failures
- [ ] Run `yarn lint:fix` in `libs/auth` and resolve any linting issues
- [ ] Verify the full build compiles without TypeScript errors: `yarn build` in `libs/auth`
- [ ] Smoke test locally: confirm SSO login redirects to the Azure AD login page, completes the callback, and lands on the correct dashboard for each role (SYSTEM_ADMIN, INTERNAL_ADMIN_CTSC, INTERNAL_ADMIN_LOCAL)
- [ ] Confirm CFT IDAM and B2C login flows are unaffected by running their respective journeys
