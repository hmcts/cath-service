# Plan: Replace passport-azure-ad with openid-client (#347)

## Overview

Replace the deprecated `passport-azure-ad` library with `openid-client` for the SSO (Azure AD) authentication flow. The B2C and CFT IDAM flows are unaffected: B2C already uses manual OAuth (added in #229), and CFT IDAM has its own native token exchange. Only the internal staff SSO flow (using `OIDCStrategy` from `passport-azure-ad`) needs to change.

The approach is to write a custom Passport strategy that wraps `openid-client`. This is a drop-in replacement: the rest of the codebase continues to call `passport.authenticate("sso-oidc", ...)`, no other files need to change.

---

## Technical Approach

### Custom Passport Strategy wrapping openid-client

The `passport-azure-ad` `OIDCStrategy` currently handles:
1. Building the authorization redirect URL and redirecting the browser
2. On callback, exchanging the authorization code for tokens
3. Calling the verify callback with the access token and profile claims

The replacement custom strategy does the same three things using `openid-client` primitives, registered under the strategy name `"sso-oidc"`. References to `"azuread-openidconnect"` in `login/index.ts` and `sso-callback/index.ts` are updated to `"sso-oidc"`.

`openid-client` is already a transitive dependency via other HMCTS packages. It will be added as a direct dependency of `@hmcts/auth`.

### openid-client API used

- `Issuer.discover(issuerUrl)` — fetches the OIDC provider metadata (replaces `identityMetadata` passed to `OIDCStrategy`)
- `new issuer.BaseClient({ client_id, client_secret, redirect_uris, response_types })` — creates the client
- `client.authorizationUrl({ scope, state, nonce, response_type })` — builds the authorization redirect
- `client.callbackParams(req)` — extracts code/state/error params from the callback request
- `client.callback(redirectUri, params, { state, nonce })` — exchanges the code for a `TokenSet`
- `tokenSet.claims()` — returns the ID token claims (oid, upn, email, name, etc.)
- `tokenSet.access_token` — the access token passed to the Graph API

### State and nonce handling

`passport-azure-ad` managed state and nonce internally. The custom strategy must manage them explicitly:

- On the authorization redirect, generate a cryptographically secure `state` and `nonce` using `crypto.randomBytes`
- Store both in the session under a namespaced key (e.g., `req.session.ssoOidc = { state, nonce }`)
- On callback, read `state` and `nonce` from session, pass them to `client.callback()` for validation
- Clear the session values after use

This pattern mirrors what `b2c-login/index.ts` already does for the B2C flow.

### Session serialization

No change required. The verify callback still calls `done(null, user)` with a `UserProfile` object. `passport.serializeUser` / `passport.deserializeUser` store the whole object in the session, as they do today. Token refresh is out of scope (session-only approach confirmed).

---

## Implementation Details

### 1. `libs/auth/package.json`

- Remove `"passport-azure-ad": "4.3.5"` from `dependencies`
- Add `"openid-client": "<pinned version>"` to `dependencies`

The version to pin should be the latest stable `openid-client` v5 (e.g. `5.7.0`). v6+ is ESM-only and requires different import syntax — verify what the broader monorepo uses before pinning.

### 2. `libs/auth/src/config/sso-config.ts`

The `appendOpenIdConfigPath` function and the `identityMetadata` field exist solely because `passport-azure-ad` requires the full `/.well-known/openid-configuration` URL. `openid-client`'s `Issuer.discover()` accepts the bare issuer URL and fetches the discovery document itself.

Changes:
- Rename the `SSO_IDENTITY_METADATA` env var read to `SSO_ISSUER_URL` (matches the env var name from Key Vault / GitHub secrets as stated in the ticket)
- Remove `appendOpenIdConfigPath` — it is no longer needed
- Rename the field in the `SsoConfig` interface from `identityMetadata` to `issuerUrl`
- Update `isSsoConfigured()` to check `issuerUrl` instead of `identityMetadata`

The `responseType` and `responseMode` fields on `SsoConfig` are `passport-azure-ad`-specific options that will not be passed to `openid-client` directly. They can be removed from the interface, or retained as documentation; removing them is cleaner.

### 3. `libs/auth/src/config/passport-config.ts`

This file is replaced almost entirely. It keeps the same public API: `configurePassport(app: Express): void`.

The new implementation:

```
import { Issuer } from "openid-client";
import passport from "passport";
import { Strategy as PassportStrategy } from "passport";
```

`configurePassport` becomes `async` (it needs to call `Issuer.discover()`). The call site in `apps/web/src/app.ts` must be updated to `await configurePassport(app)`.

Structure of the new strategy (inner class or inline, not exported):

```
class SsoOidcStrategy extends PassportStrategy {
  name = "sso-oidc";

  authenticate(req: Request): void {
    if (req.path matches the callback path) {
      // callback branch: exchange code, call verify callback
    } else {
      // redirect branch: generate state+nonce, store in session, redirect
    }
  }
}
```

In practice, `passport-azure-ad`'s `OIDCStrategy` uses a single strategy instance for both the initiation redirect and the callback by inspecting whether query/body parameters from the IdP are present. The replacement strategy does the same: check for `req.query.code` or `req.query.error` to distinguish callback from initiation.

The verify callback signature simplifies from the `passport-azure-ad` 6-argument form `(_iss, _sub, profile, accessToken, _refreshToken, done)` to a cleaner function:

```typescript
async function verifyOidcCallback(claims: Record<string, unknown>, accessToken: string, done: VerifyCallback): Promise<void>
```

`claims` come from `tokenSet.claims()`. The fields used (`oid`, `upn`, `email`, `name`) are standard OIDC claims present in Azure AD ID tokens. The Graph API call (`fetchUserProfile`) still receives the `access_token` for group membership lookup, so that path is unchanged.

Because `Issuer.discover()` is async and must happen before the strategy is usable, the OIDC client is created once during `configurePassport` and captured in the strategy's closure.

### 4. `libs/auth/src/pages/login/index.ts`

One-line change:

```typescript
// Before
passport.authenticate("azuread-openidconnect", { ... })

// After
passport.authenticate("sso-oidc", { ... })
```

### 5. `libs/auth/src/pages/sso-callback/index.ts`

One-line change (same as login):

```typescript
// Before
passport.authenticate("azuread-openidconnect", { ... })

// After
passport.authenticate("sso-oidc", { ... })
```

The rest of `sso-callback/index.ts` — session regeneration, role check, `createOrUpdateUser`, redirect logic — is unchanged.

### 6. `apps/web/src/app.ts`

`configurePassport` becomes async, so the call must be awaited. Check the call site and add `await`.

---

## Error Handling and Edge Cases

### Missing SSO configuration

Existing guard in `configurePassport`: if `issuerUrl`, `clientId`, or `clientSecret` are missing, passport is initialized without a strategy (same behaviour as today). The `isSsoConfigured()` function gates the login and callback handlers before they attempt `passport.authenticate`, so unauthenticated environments degrade gracefully.

### `Issuer.discover()` failure

If the issuer URL is wrong or the IdP is unreachable at startup, `Issuer.discover()` will throw. This should propagate and crash the process at startup rather than silently swallowing the error, since a service that cannot reach its IdP is not usable. Wrap the call in a try/catch that logs the error clearly and re-throws.

### Token exchange failure

`client.callback()` throws an `OPError` or `RPError` for invalid codes, expired codes, state mismatches, or nonce mismatches. The strategy should call `this.fail(error)` for expected OIDC errors, and `this.error(error)` for unexpected errors. This causes passport to follow `failureRedirect` (set to `/login` in `sso-callback/index.ts`).

### Graph API failure

The `fetchUserProfile` call in the verify callback can fail if the access token lacks the required Graph API scopes or the Graph API is unavailable. The existing error path `done(error, false)` is retained — passport will redirect to `failureRedirect`.

### Role determination returning `undefined`

`determineSsoUserRole` already returns `undefined` when no matching group is found. The `sso-callback/index.ts` handler already redirects to `/sso-rejected` when `req.user.role` is falsy. No change needed.

### State/nonce mismatch

`openid-client` validates state and nonce internally when they are passed to `client.callback()`. A mismatch throws `RPError: state mismatch` which the strategy handles via `this.fail(error)`.

---

## Acceptance Criteria Mapping

| Criterion | How satisfied |
|---|---|
| SSO logins work end-to-end | Custom `sso-oidc` strategy uses `openid-client` to perform the full OIDC code flow with Azure AD |
| CFT IDAM login continues to work | CFT IDAM uses its own token exchange (`cft-idam/token-client.ts`) and is completely unaffected |
| Azure B2C login works | B2C uses its own manual OAuth flow (`b2c-callback/index.ts`) and is completely unaffected |
| Crime IDAM login works | Crime IDAM follows the same manual token exchange pattern as CFT IDAM and is unaffected |
| `passport-azure-ad` removed | Removed from `package.json` dependencies |
| `SSO_ISSUER_URL` env var used | `sso-config.ts` reads `SSO_ISSUER_URL`; the old `SSO_IDENTITY_METADATA` is no longer read |

---

## Files Changed Summary

| File | Nature of change |
|---|---|
| `libs/auth/package.json` | Remove `passport-azure-ad`, add `openid-client` |
| `libs/auth/src/config/sso-config.ts` | Replace `identityMetadata`/`SSO_IDENTITY_METADATA` with `issuerUrl`/`SSO_ISSUER_URL`; remove `appendOpenIdConfigPath` |
| `libs/auth/src/config/passport-config.ts` | Rewrite: replace `OIDCStrategy` with custom strategy using `openid-client` |
| `libs/auth/src/pages/login/index.ts` | Change strategy name string from `"azuread-openidconnect"` to `"sso-oidc"` |
| `libs/auth/src/pages/sso-callback/index.ts` | Change strategy name string from `"azuread-openidconnect"` to `"sso-oidc"` |
| `libs/auth/src/config/passport-config.test.ts` | Rewrite: mock `openid-client` instead of `passport-azure-ad` |
| `libs/auth/src/config/sso-config.test.ts` | Update env var name from `SSO_IDENTITY_METADATA` to `SSO_ISSUER_URL`; remove `appendOpenIdConfigPath` assertion |
| `libs/auth/src/pages/login/index.test.ts` | Update strategy name assertion from `"azuread-openidconnect"` to `"sso-oidc"` |
| `apps/web/src/app.ts` | Add `await` to `configurePassport(app)` call |

---

## Assumptions

- `openid-client` v5 is used (CommonJS-compatible, available as `import { Issuer } from "openid-client"`). If the monorepo has already moved to v6+ ESM-only, import syntax needs adjustment.
- `SSO_ISSUER_URL` contains a bare issuer URL such as `https://login.microsoftonline.com/<tenant-id>/v2.0` — no trailing `/` or `.well-known` suffix. `Issuer.discover()` appends the discovery path itself.
- Existing `@types/passport` dev dependency covers the base `Strategy` class without additional type packages.
- The `configurePassport` call in `apps/web/src/app.ts` is in an async context where `await` can be added without structural changes.
