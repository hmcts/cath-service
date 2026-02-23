# Implementation Tasks

## 1. Immediate: Merge Open Patch/Minor Renovate PRs

- [ ] Merge PR #196 — `@types/node` → v24.10.13 (verify CI passes)
- [ ] Merge PR #373 — `@playwright/test` → v1.58.2 (verify CI passes)
- [ ] Merge PR #393 — `applicationinsights` → v3.13.0 (verify CI passes)
- [ ] Merge PR #394 — `config` → v4.4.0 (verify CI passes)
- [ ] Merge PR #395 — `dotenv` → v17.3.1 (verify CI passes)
- [ ] Merge PR #396 — `express-session` → v1.19.0 (verify CI passes)
- [ ] Merge PR #397 — `govuk-frontend` → v5.14.0 (verify CI passes)
- [ ] Merge PR #398 — `redis` → v5.11.0 (verify CI passes)
- [ ] Merge PR #400 — `notifications-node-client` → v8.3.0 (verify CI passes)
- [ ] Merge PR #401 — `@biomejs/biome` → v2.4.4 (verify CI passes)

## 2. Primary: Migrate `passport-azure-ad` to `@azure/msal-node`

### Confirm decisions before coding
- [ ] Confirm library choice with team: `@azure/msal-node` (plan default) or `openid-client`
- [ ] Confirm config variable name: reuse `SSO_IDENTITY_METADATA` (plan default) or introduce `SSO_AUTHORITY`

### Dependency changes
- [ ] Add `@azure/msal-node` (pinned version) to `libs/auth/package.json` dependencies
- [ ] Remove `passport-azure-ad` from `libs/auth/package.json` dependencies
- [ ] Remove `passport-azure-ad` from root `package.json` dependencies
- [ ] Remove `@types/passport-azure-ad` from root `package.json` devDependencies
- [ ] Confirm whether `jws` resolution in root `package.json` was added for `passport-azure-ad`; remove if so
- [ ] Run `yarn install`

### Update `libs/auth/src/config/sso-config.ts`
- [ ] Remove `appendOpenIdConfigPath` function
- [ ] Replace `identityMetadata` field with `authority` on `SsoConfig` interface
- [ ] Remove `responseType` and `responseMode` fields from `SsoConfig` interface
- [ ] Rename `scope` to `scopes` on `SsoConfig` interface
- [ ] Update `getSsoConfig` to return `authority` (raw value, no suffix appended) instead of `identityMetadata`
- [ ] Update `isSsoConfigured` to check `ssoConfig.authority` instead of `ssoConfig.identityMetadata`
- [ ] Update `sso-config.test.ts` to match new interface shape and removed `appendOpenIdConfigPath` logic

### Update `libs/auth/src/config/passport-config.ts`
- [ ] Remove `OIDCStrategy` import from `passport-azure-ad`
- [ ] Add `ConfidentialClientApplication` import from `@azure/msal-node`
- [ ] Write a `MsalStrategy` class extending `passport.Strategy` (no extra dependency needed)
  - [ ] `name = "azure-msal"`
  - [ ] `authenticate(req)` method: read `code` from `req.query`, call `msalClient.acquireTokenByCode`, extract access token, call `verifyOidcCallback`, call `this.success(user)` or `this.fail()`
  - [ ] Generate and validate OIDC `state` parameter via session to prevent CSRF
- [ ] Add `createMsalClient` function that constructs `ConfidentialClientApplication` from `getSsoConfig()`
- [ ] Replace `passport.use(new OIDCStrategy(...))` with `passport.use(new MsalStrategy(msalClient))`
- [ ] Export `createMsalClient` so the login page can use the same instance
- [ ] Update `passport-config.test.ts`: remove `OIDCStrategy` mock, add `@azure/msal-node` mock, update assertions to reference `"azure-msal"` strategy name

### Update `libs/auth/src/pages/login/index.ts`
- [ ] Remove `passport.authenticate("azuread-openidconnect")` call
- [ ] Call `msalClient.getAuthCodeUrl({ scopes, redirectUri, state })` to get the Azure AD redirect URL
- [ ] Store generated `state` in session before redirecting
- [ ] `res.redirect(authCodeUrl)`
- [ ] Update `login/index.test.ts` to test MSAL redirect instead of passport authenticate call

### Update `libs/auth/src/pages/sso-callback/index.ts`
- [ ] Replace `passport.authenticate("azuread-openidconnect")` with `passport.authenticate("azure-msal")`
- [ ] Update `sso-callback/index.test.ts` to reference `"azure-msal"` strategy name

### Verify end-to-end behaviour
- [ ] SSO-disabled dev mode: app starts without MSAL client, protected pages redirect correctly
- [ ] SSO-enabled mode: login redirects to Azure AD, callback exchanges code for token, Graph API call succeeds, user session established
- [ ] Logout: tenant ID extraction from authority URL still works, Azure AD logout redirect functions

### Run tests and lint
- [ ] `yarn test` — all unit tests pass
- [ ] `yarn lint:fix` — no lint errors

## 3. Evaluation: Major Version Upgrades

### `govuk-frontend` v6
- [ ] Review govuk-frontend v6 changelog and migration guide for breaking Nunjucks macro changes
- [ ] Audit all `*.njk` templates across `libs/*/src/pages/` for affected macros
- [ ] Estimate migration effort and document findings
- [ ] Decision: enable rate-limited Renovate PR for v6, or defer

### Prisma v7
- [ ] Confirm with team why PR #107 was closed
- [ ] Review Prisma v7 migration guide against current usage in `apps/postgres` (collated schema, `prisma migrate`, `prisma generate`)
- [ ] Check if the `apps/postgres/src/collate-schema.ts` approach is compatible with Prisma v7's generator API
- [ ] Estimate migration effort and document findings
- [ ] Decision: recreate PR #107, or defer

### `undici` v7
- [ ] Confirm with team that `undici` v7 remains deferred (currently pinned at `6.23.0` via root `resolutions`)
- [ ] If deferring: no action needed
- [ ] If evaluating: check which packages pull in `undici` and whether v7 has breaking API changes relevant to usage in this codebase
