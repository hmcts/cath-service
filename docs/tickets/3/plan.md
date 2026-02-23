# Plan: Dependency Dashboard — passport-azure-ad Migration & Renovate PRs

## 1. Technical Approach

### High-Level Strategy

Three parallel tracks of work:

1. **Merge open patch/minor Renovate PRs** — Ten PRs are ready and unblocked. Merge them individually after CI passes. No code changes required.

2. **Migrate `passport-azure-ad` to `@azure/msal-node`** — The primary engineering task. `passport-azure-ad` is deprecated with no automated replacement. The migration replaces the `OIDCStrategy`-based approach with a `ConfidentialClientApplication` from MSAL, wrapped in a custom passport strategy that preserves the existing `verifyOidcCallback` logic and Graph API integration.

3. **Evaluate major upgrades** — `govuk-frontend` v6, Prisma v7, and `undici` v7 each require a dedicated spike before enabling rate-limited PRs or recreating blocked PRs.

### Architecture Decisions

**Use `@azure/msal-node` over `openid-client`**
The ticket spec identifies `@azure/msal-node` as the target. It is the first-party Microsoft library, directly replacing `passport-azure-ad` (which itself was a Microsoft library). It has full Azure AD and Entra ID support and is actively maintained. `openid-client` is a generic OIDC library that would also work, but `@azure/msal-node` is the natural migration target for an Azure AD integration and avoids the need to implement token cache management manually. Confirm with the team if they have a preference, but the plan proceeds with `@azure/msal-node`.

**Wrap MSAL in a custom passport strategy**
The codebase uses `passport.authenticate("azuread-openidconnect")` in `login/index.ts` and `sso-callback/index.ts`. Replacing the OIDC strategy with a lightweight custom strategy preserves the passport session machinery (`req.login`, `req.logout`, `passport.serializeUser`) and keeps the diff minimal. The alternative — removing passport entirely — would require rewriting session handling in `sso-callback/index.ts`, which is a larger and riskier change.

**Preserve `SSO_IDENTITY_METADATA` config variable**
The current `sso-config.ts` reads `SSO_IDENTITY_METADATA` as a base URL and appends `/.well-known/openid-configuration`. MSAL takes an `authority` URL (e.g. `https://login.microsoftonline.com/<tenant-id>`) — not a discovery URL. The existing `SSO_IDENTITY_METADATA` value can be used as the MSAL authority directly (the `/.well-known/openid-configuration` appending logic is removed). A new `SSO_AUTHORITY` variable is cleaner semantically, but reusing `SSO_IDENTITY_METADATA` avoids a deployment config change. Confirm with the team which is preferred. The plan defaults to reusing `SSO_IDENTITY_METADATA` stripped of the openid-configuration suffix logic.

---

## 2. Implementation Details

### 2.1 Dependency Changes

**`libs/auth/package.json`**

Before:
```json
"dependencies": {
  "@hmcts/account": "*",
  "@microsoft/microsoft-graph-client": "3.0.7",
  "passport-azure-ad": "4.3.5"
}
```

After:
```json
"dependencies": {
  "@azure/msal-node": "<pinned-version>",
  "@hmcts/account": "*",
  "@microsoft/microsoft-graph-client": "3.0.7"
}
```

**Root `package.json`**

Remove from `dependencies`:
- `passport-azure-ad: 4.3.5`

Remove from `devDependencies`:
- `@types/passport-azure-ad: 4.3.6`

The `passport` package and `@types/passport` remain — they are still needed for the custom strategy.

The `jws` resolution in root `package.json` (`"jws": "4.0.1"`) was likely added to patch a vulnerability in `passport-azure-ad`'s dependency tree. Confirm this before removing it; it may be removable once `passport-azure-ad` is gone.

### 2.2 `libs/auth/src/config/sso-config.ts`

The `appendOpenIdConfigPath` function and the `identityMetadata` field on `SsoConfig` are specific to `passport-azure-ad`. MSAL uses an `authority` URL instead.

The `responseType` and `responseMode` fields on `SsoConfig` are also specific to `passport-azure-ad` options. These can be removed.

**SsoConfig interface — before:**
```typescript
interface SsoConfig {
  identityMetadata: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  responseType: "code" | "code id_token" | "id_token code" | "id_token";
  responseMode: "query" | "form_post";
  scope: string[];
  systemAdminGroupId: string;
  internalAdminCtscGroupId: string;
  internalAdminLocalGroupId: string;
}
```

**SsoConfig interface — after:**
```typescript
interface SsoConfig {
  authority: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
  systemAdminGroupId: string;
  internalAdminCtscGroupId: string;
  internalAdminLocalGroupId: string;
}
```

**`getSsoConfig` — before (key parts):**
```typescript
return {
  identityMetadata: appendOpenIdConfigPath(getConfigValue("SSO_IDENTITY_METADATA")),
  ...
  responseType: "code",
  responseMode: "query",
  scope: ["openid", "profile", "email"],
  ...
};
```

**`getSsoConfig` — after:**
```typescript
return {
  authority: getConfigValue("SSO_IDENTITY_METADATA"),  // base URL, no suffix
  ...
  scopes: ["openid", "profile", "email"],
  ...
};
```

**`isSsoConfigured` — before:**
```typescript
return !!(ssoConfig.identityMetadata && ssoConfig.clientId && ssoConfig.clientSecret);
```

**`isSsoConfigured` — after:**
```typescript
return !!(ssoConfig.authority && ssoConfig.clientId && ssoConfig.clientSecret);
```

The `appendOpenIdConfigPath` function is deleted entirely.

### 2.3 `libs/auth/src/config/passport-config.ts`

This file undergoes the most significant change. The MSAL `ConfidentialClientApplication` is created once and passed into a custom passport strategy. The verify callback logic (`verifyOidcCallback`) is preserved as-is — it receives an `accessToken` and calls Graph API, which is unaffected by the MSAL migration.

**New approach — key structure:**

```typescript
import { ConfidentialClientApplication } from "@azure/msal-node";
import type { Express } from "express";
import passport from "passport";
import { Strategy as CustomStrategy } from "passport-custom";
import { fetchUserProfile } from "../graph-api/client.js";
import { determineSsoUserRole } from "../role-service/index.js";
import type { UserProfile } from "../user-profile.js";
import { getSsoConfig } from "./sso-config.js";

// Creates and exports the MSAL client so login/callback pages can use it
export function createMsalClient(): ConfidentialClientApplication {
  const ssoConfig = getSsoConfig();
  return new ConfidentialClientApplication({
    auth: {
      clientId: ssoConfig.clientId,
      clientSecret: ssoConfig.clientSecret,
      authority: ssoConfig.authority
    }
  });
}
```

The custom passport strategy (named `"azure-msal"` to replace `"azuread-openidconnect"`) calls MSAL's `acquireTokenByCode` and then invokes the existing `verifyOidcCallback` logic. The strategy receives the authorization code from the callback request and handles its own token exchange.

The SSO-disabled path (dev mode, missing config) remains identical — passport is initialised without registering any strategy.

### 2.4 `libs/auth/src/pages/login/index.ts`

**Before:** Calls `passport.authenticate("azuread-openidconnect")` which triggers `OIDCStrategy` to build and redirect to the Azure AD authorization URL.

**After:** Calls MSAL's `getAuthCodeUrl()` directly to build the redirect URL, then redirects. The `passport.authenticate` call on the login page is removed — MSAL owns the redirect step.

```typescript
// Initiates the MSAL auth code flow
const authCodeUrlResponse = await msalClient.getAuthCodeUrl({
  scopes: ssoConfig.scopes,
  redirectUri: ssoConfig.redirectUri
});
res.redirect(authCodeUrlResponse);
```

The `msalClient` instance needs to be shared between the login page and the callback. The cleanest approach is to create the MSAL client in `passport-config.ts` and export it, or create it lazily in `sso-config.ts` alongside `getSsoConfig`. A module-level singleton in `passport-config.ts` (created once when `configurePassport` is called) is the simplest option.

### 2.5 `libs/auth/src/pages/sso-callback/index.ts`

**Before:** Calls `passport.authenticate("azuread-openidconnect")` which triggers `OIDCStrategy` to exchange the code for tokens.

**After:** The custom passport strategy registered in `passport-config.ts` handles token exchange via MSAL. The `passport.authenticate("azure-msal")` call triggers the custom strategy, which calls `msalClient.acquireTokenByCode(req.query.code)` and then calls the verify callback with the resulting access token.

The second handler in the middleware array (creating/updating the user in the DB, session regeneration, redirect) is unchanged.

### 2.6 `libs/auth/src/pages/logout/index.ts`

The logout page uses `extractTenantId` which parses the `identityMetadata` URL to extract the tenant ID. With `SSO_IDENTITY_METADATA` now stored as a plain authority URL (e.g. `https://login.microsoftonline.com/<tenant-id>/v2.0`), the regex `match(/\/([a-f0-9-]+)\/v2\.0\//)` continues to work without modification. No change needed here.

However, MSAL maintains a token cache. At logout, the MSAL token cache entry for the user should be cleared if a home account identifier was stored in the session. This is a nice-to-have; the core logout flow (session destruction, Azure AD redirect) remains unchanged.

### 2.7 `passport-custom` dependency

The custom strategy pattern requires a way to register a named strategy with passport that delegates to a user-supplied function. The `passport-custom` package (maintained, widely used) provides exactly this with minimal overhead. Alternatively, the `passport.Strategy` base class can be extended directly without an extra dependency — this is the zero-dependency approach and is preferred per YAGNI.

**Preferred: No `passport-custom` needed.** The custom strategy can be written as a small class extending `passport.Strategy`:

```typescript
class MsalStrategy extends passport.Strategy {
  name = "azure-msal";
  // constructor and authenticate() method
}
```

This avoids adding a new dependency.

### 2.8 Renovate Open PRs — Merge Order

These PRs are independent patch/minor updates. Suggested merge order to reduce conflict risk:

1. `#196` — `@types/node` → v24.10.13 (type-only, safe)
2. `#373` — `@playwright/test` → v1.58.2 (dev, e2e only)
3. `#393` — `applicationinsights` → v3.13.0
4. `#394` — `config` → v4.4.0
5. `#395` — `dotenv` → v17.3.1
6. `#396` — `express-session` → v1.19.0
7. `#397` — `govuk-frontend` → v5.14.0 (patch, not v6)
8. `#398` — `redis` → v5.11.0
9. `#400` — `notifications-node-client` → v8.3.0
10. `#401` — `@biomejs/biome` → v2.4.4

Each should be merged only after CI passes on that PR.

---

## 3. Error Handling & Edge Cases

### Token Exchange Failures
MSAL's `acquireTokenByCode` throws on invalid or expired codes. The custom strategy must catch these and call `done(error, false)` so passport redirects to the `failureRedirect` URL (`/login`).

### Missing `code` in Callback Request
If `req.query.code` is absent on the `/sso/return` route (e.g. user cancelled login, Azure AD returned an error), the custom strategy must detect this and call `done(null, false)` before attempting token exchange.

### MSAL Token Cache
By default, MSAL uses an in-memory token cache. In a horizontally scaled deployment (multiple web instances), each instance has its own cache. This is acceptable because the token returned by `acquireTokenByCode` is used immediately for the Graph API call and then the access token is stored on the user session. The MSAL cache is not used after initial authentication.

### MSAL Client Singleton
The `ConfidentialClientApplication` should be created once, not on every request. It must be created after `configurePassport` is called (which happens at app startup), not at module load time, to allow the config to be read correctly from environment variables.

### SSO Disabled / Incomplete Config
The existing guard logic in `configurePassport` (checking `NODE_ENV === "development"` and config completeness) is preserved unchanged. When SSO is disabled, no MSAL client is created.

### `state` Parameter
`passport-azure-ad`'s `OIDCStrategy` managed the OIDC `state` parameter automatically (CSRF protection for the auth code flow). With a custom strategy, the `state` parameter must be generated on the login redirect and validated on callback. MSAL's `getAuthCodeUrl` accepts a `state` option; the value should be stored in the session and compared on callback.

---

## 4. Acceptance Criteria Mapping

| Acceptance Criterion | How It Is Satisfied |
|---|---|
| `passport-azure-ad` is removed and replaced with a supported OIDC library | Removed from `libs/auth/package.json` and root `package.json`; replaced with `@azure/msal-node` |
| SSO-disabled development mode is preserved | The `NODE_ENV === "development" && !ENABLE_SSO` guard in `configurePassport` is unchanged; no MSAL client is created in this path |
| SSO-configured production mode works | The new MSAL-based login/callback flow replaces `OIDCStrategy`; `fetchUserProfile` and `determineSsoUserRole` are unchanged |
| Open patch/minor PRs are merged | Merging PRs #196, #373, #393–#401 after CI passes |
| `govuk-frontend` v6 upgrade is evaluated | Spike documents Nunjucks macro breaking changes and migration effort; decision made before enabling rate-limited PR |
| Prisma v7 upgrade is evaluated | Review Prisma v7 migration guide against current schema usage; understand why PR #107 was closed before recreating |

---

## 5. Open Questions / Clarifications Needed

**1. Library preference: `@azure/msal-node` vs `openid-client`**
The spec lists `@azure/msal-node` as the assumed target but flags `openid-client` as an alternative. `@azure/msal-node` is the first-party Microsoft library and the natural migration path from `passport-azure-ad`. Confirm with the team. The plan proceeds with `@azure/msal-node`.

**2. `SSO_IDENTITY_METADATA` vs `SSO_AUTHORITY` config variable name**
The current env var is `SSO_IDENTITY_METADATA`. Its value (e.g. `https://login.microsoftonline.com/<tenant>/v2.0`) is already a valid MSAL authority URL. Two options:
- Reuse `SSO_IDENTITY_METADATA` — no deployment config change needed, but the name is misleading without `passport-azure-ad`
- Introduce `SSO_AUTHORITY` — cleaner naming, but requires a deployment config change

Confirm which is preferred before implementing. The plan defaults to reusing `SSO_IDENTITY_METADATA` to avoid a config deployment change.

**3. Reason PR #107 (Prisma v7) was closed**
PR #107 was manually closed. Before recreating it, the team should confirm why it was closed — there may be a known blocker, a migration issue specific to the collated schema setup in `apps/postgres`, or a dependency conflict. The `apps/postgres/src/collate-schema.ts` approach (merging multiple `schema.prisma` files from libs) may have interacted poorly with a Prisma v7 breaking change in the generator or migration API.

**4. `govuk-frontend` v6 scope**
v6 has breaking changes to Nunjucks macros. A spike should confirm which templates across `libs/*/src/pages/**/*.njk` are affected and estimate the migration effort before the rate-limited PR is enabled.

**5. `undici` v7 deferral**
`undici` is currently pinned at `6.23.0` via the root `resolutions`. The plan assumes v7 remains deferred. Confirm this is intentional before removing or updating the resolution.
