# Code Review: Issue #347 - Replace passport-azure-ad with openid-client

## Summary

This PR replaces the deprecated `passport-azure-ad` library with `openid-client` v6.3.3 for SSO authentication. The implementation uses the built-in `openid-client/passport` Strategy class rather than creating a custom Passport strategy wrapper as originally planned. This is a sound decision -- it reduces custom code, leverages the library's built-in PKCE, state parameter, and token validation support, and results in a cleaner, more maintainable implementation.

The change touches 8 source files (excluding docs), reduces overall code volume, and all 276 unit tests pass. TypeScript compilation succeeds with no errors.

**Files changed:**
- `/workspaces/cath-service/libs/auth/package.json` -- dependency swap
- `/workspaces/cath-service/libs/auth/src/config/passport-config.ts` -- core strategy replacement
- `/workspaces/cath-service/libs/auth/src/config/passport-config.test.ts` -- updated tests
- `/workspaces/cath-service/libs/auth/src/config/sso-config.ts` -- config interface update
- `/workspaces/cath-service/libs/auth/src/config/sso-config.test.ts` -- updated tests
- `/workspaces/cath-service/libs/auth/src/pages/logout/index.ts` -- tenant ID extraction update
- `/workspaces/cath-service/libs/auth/src/pages/logout/index.test.ts` -- updated tests
- `/workspaces/cath-service/libs/auth/src/role-service/index.test.ts` -- config mock update
- `/workspaces/cath-service/apps/web/src/app.ts` -- async configurePassport call

---

## CRITICAL Issues

### 1. No error handling around OIDC discovery at startup

**File:** `/workspaces/cath-service/libs/auth/src/config/passport-config.ts`, line 40

**Problem:** The `client.discovery()` call is awaited directly with no try/catch. If the Azure AD discovery endpoint is unreachable, returns an error, or the URL is malformed, the entire application will fail to start with an unhandled rejection. This is a production reliability risk -- a transient network issue during deployment would prevent the service from booting.

```typescript
// Current code (line 40):
const oidcConfig = await client.discovery(new URL(ssoConfig.issuerUrl), ssoConfig.clientId, ssoConfig.clientSecret);
```

**Impact:** Application startup failure if Azure AD is temporarily unreachable. In a government service context, this could cause extended outages.

**Solution:** Wrap the discovery call in try/catch. On failure, log the error and fall back to initializing passport without the SSO strategy (same as incomplete config), allowing the application to start and serve non-SSO routes:

```typescript
let oidcConfig: client.Configuration;
try {
  oidcConfig = await client.discovery(
    new URL(ssoConfig.issuerUrl),
    ssoConfig.clientId,
    ssoConfig.clientSecret
  );
} catch (error) {
  console.error("OIDC discovery failed:", error);
  initializePassport(app);
  return;
}
```

### 2. `claims()` can return `undefined` but is accessed without null check

**File:** `/workspaces/cath-service/libs/auth/src/config/passport-config.ts`, lines 51-59

**Problem:** Per the openid-client type definitions, `tokens.claims()` returns `oauth.IDToken | undefined`. The code accesses `claims?.oid` and `claims?.sub` with optional chaining, which is good, but the fallback chain for `id` could result in using `undefined` as the user ID if both claims are missing AND `userProfile.id` is falsy:

```typescript
const claims = tokens.claims();  // Can be undefined
// ...
id: (claims?.oid as string) ?? claims?.sub ?? userProfile.id,
```

More critically, if `claims` is `undefined`, then `claims?.preferred_username` and `claims?.email` will both be `undefined`, and `claims?.name` will be `undefined`. The fallback to `userProfile.email` and `userProfile.displayName` handles this, but the `as string` casts on potentially undefined values are misleading and suppress TypeScript's null safety.

**Impact:** If an ID token is not returned (which should not happen in normal OIDC flows but could in edge cases), the user profile would still be constructed from Graph API data, which is acceptable. However, the `as string` casts defeat type safety and could mask issues.

**Solution:** Remove the `as string` casts and let TypeScript's nullish coalescing handle the types correctly, or add an explicit undefined check for claims:

```typescript
const claims = tokens.claims();
const oid = claims?.oid as string | undefined;
const email = (claims?.preferred_username ?? claims?.email) as string | undefined;
const displayName = claims?.name as string | undefined;

const user: UserProfile = {
  id: oid ?? claims?.sub ?? userProfile.id,
  email: email ?? userProfile.email,
  displayName: displayName ?? userProfile.displayName,
  role: userRole,
  provenance: "SSO"
};
```

---

## HIGH PRIORITY Issues

### 1. Missing test for OIDC discovery failure

**File:** `/workspaces/cath-service/libs/auth/src/config/passport-config.test.ts`

**Problem:** There is no test case verifying the behavior when `client.discovery()` rejects (e.g., network error, invalid issuer URL). The plan explicitly lists "OIDC discovery fails" as an error scenario that should "Log error, return 503 on /login attempts," but no test covers this path. Once the CRITICAL issue above is fixed (adding try/catch), a corresponding test should be added.

**Impact:** Untested error path in authentication -- a critical area for a government service.

**Recommendation:** Add a test:

```typescript
it("should initialize passport without strategy when discovery fails", async () => {
  process.env.NODE_ENV = "production";
  mockGetSsoConfig.mockReturnValue(FULL_SSO_CONFIG);
  mockDiscovery.mockRejectedValue(new Error("Network error"));

  await configurePassport(app);

  expect(mockPassport.use).not.toHaveBeenCalled();
  expect(mockPassport.initialize).toHaveBeenCalled();
});
```

### 2. `configurePassport` is now async but callers may not handle rejection

**File:** `/workspaces/cath-service/apps/web/src/app.ts`, line 85

**Problem:** The function signature changed from synchronous to async. The call site in `app.ts` was updated to `await configurePassport(app)`, which is correct. However, since `createApp()` is itself async and called at the application entry point, if `configurePassport` throws (due to the missing try/catch in CRITICAL #1), the error will propagate up to the entry point. This is related to CRITICAL #1 -- fixing that issue also fixes this concern.

**Impact:** Unhandled promise rejection could crash the process during startup.

**Recommendation:** This is resolved by fixing CRITICAL #1.

### 3. Missing test for `claims()` returning `undefined`

**File:** `/workspaces/cath-service/libs/auth/src/config/passport-config.test.ts`

**Problem:** No test verifies behavior when `tokens.claims()` returns `undefined`. The test for "fall back to Graph API values when claims are missing" uses `claims: () => ({ sub: "sub-id" })` which returns a minimal object, not `undefined`. A separate test should verify the `undefined` case.

**Recommendation:** Add:

```typescript
it("should handle undefined claims gracefully", async () => {
  const mockTokens = {
    access_token: "access-token",
    claims: () => undefined
  };
  // ... verify it falls back entirely to Graph API values
});
```

---

## SUGGESTIONS

### 1. The `responseType` and `responseMode` fields in SsoConfig are no longer used

**File:** `/workspaces/cath-service/libs/auth/src/config/sso-config.ts`, lines 8-9

The `SsoConfig` interface still defines `responseType: "code"` and `responseMode: "query"`, and `getSsoConfig()` still returns them. However, `passport-config.ts` no longer references these fields -- the `openid-client/passport` Strategy handles response type and mode internally. These fields are dead code.

**Benefit:** Removing them simplifies the configuration interface and eliminates confusion about what is actually configurable.

**Approach:** Remove `responseType` and `responseMode` from the `SsoConfig` interface and `getSsoConfig()` return value. Update the `FULL_SSO_CONFIG` constant in tests accordingly.

### 2. Consider logging when SSO is not configured

**File:** `/workspaces/cath-service/libs/auth/src/config/passport-config.ts`, lines 35-38

When SSO configuration is incomplete, the function silently initializes passport without the SSO strategy. A log message would help operators diagnose configuration issues in production.

```typescript
if (!ssoConfig.issuerUrl || !ssoConfig.clientId || !ssoConfig.clientSecret) {
  console.warn("SSO configuration incomplete - passport initialized without SSO strategy");
  initializePassport(app);
  return;
}
```

### 3. Plan vs implementation deviation should be documented

The plan in `/workspaces/cath-service/docs/tickets/347/plan.md` describes creating a custom `OpenIdConnectStrategy` class in `libs/auth/src/openid-connect-strategy/`. The actual implementation correctly chose to use the built-in `openid-client/passport` Strategy instead, which is simpler and better. The tasks file should note this deviation so future readers understand why the custom strategy directory does not exist.

### 4. `tokens.access_token ?? ""` fallback to empty string

**File:** `/workspaces/cath-service/libs/auth/src/config/passport-config.ts`, line 52

The `access_token` property on `TokenEndpointResponse` is typed as `readonly access_token: string` (required, not optional). The `?? ""` fallback is technically unnecessary. If it is kept as a defensive measure, that is acceptable, but it could mask an issue where an empty string is passed to `fetchUserProfile()` which would then fail with a confusing Graph API error rather than a clear "no access token" error.

**Approach:** Either trust the type and remove the fallback, or add an explicit check:

```typescript
const accessToken = tokens.access_token;
if (!accessToken) {
  return done(new Error("No access token received from identity provider"), false);
}
```

### 5. Incomplete tasks remain in tasks.md

**File:** `/workspaces/cath-service/docs/tickets/347/tasks.md`

Phases 5-10 have numerous unchecked items (integration tests, E2E tests, environment configuration, manual testing, documentation, deployment preparation). These are expected to be completed before merge to master. The current PR appears to cover the core implementation (Phases 1-4) which is appropriate for an initial review, but these remaining phases should be tracked.

---

## Positive Feedback

1. **Excellent simplification.** Using the built-in `openid-client/passport` Strategy instead of writing a custom wrapper is the right call. It eliminates hundreds of lines of custom OIDC flow code and relies on a well-tested library for PKCE, state management, and token validation.

2. **Good code deduplication.** The `initializePassport()` helper function eliminates the three separate copies of passport initialization code that existed in the old implementation. This follows the DRY principle well.

3. **Clean dependency swap.** Replacing `passport-azure-ad: 4.3.5` with `openid-client: 6.3.3` is a clean one-for-one swap with no orphaned dependencies.

4. **Correct openid-client v6 API usage.** The `client.discovery(new URL(...), clientId, clientSecret)` call correctly uses the v6 API where the third `string` parameter is interpreted as the client_secret. The Strategy constructor options (`config`, `name`, `callbackURL`, `scope`) match the library's expected interface.

5. **Backward-compatible session format.** The `UserProfile` structure passed to `done(null, user)` is unchanged, meaning existing sessions will not be invalidated by this migration.

6. **Thorough test updates.** All test files were properly updated to reflect the new API. The verify callback tests cover the main paths: successful auth with full claims, fallback to `sub` when `oid` is missing, fallback to Graph API when claims are minimal, and error handling.

7. **Correct logout URL construction.** The `extractTenantId()` regex was properly updated from `/\/([a-f0-9-]+)\/v2\.0\//` (which matched the `.well-known/openid-configuration` trailing path) to `/\/([a-f0-9-]+)\/v2\.0/` (which matches the shorter issuer URL format).

8. **Tests pass cleanly.** All 276 tests in the auth module pass, and TypeScript compilation succeeds with zero errors.

---

## Test Coverage Assessment

| Area | Coverage | Notes |
|------|----------|-------|
| SSO disabled (dev mode) | Covered | Test verifies no strategy registered |
| Incomplete SSO config | Covered | Tests for missing issuerUrl, clientId, clientSecret |
| Full SSO config + discovery | Covered | Verifies discovery call and strategy registration |
| Verify callback - happy path | Covered | Tests claims extraction and role determination |
| Verify callback - oid fallback | Covered | Tests sub fallback when oid missing |
| Verify callback - claims fallback | Covered | Tests Graph API fallback when claims minimal |
| Verify callback - error handling | Covered | Tests Graph API failure path |
| Discovery failure | **NOT COVERED** | No test for rejected discovery promise |
| claims() returning undefined | **NOT COVERED** | No test for undefined claims |
| SSO config (getSsoConfig) | Covered | Env vars, config fallback, defaults |
| isSsoConfigured | Covered | Dev mode, missing config, full config |
| Logout - all provenances | Covered | CFT, B2C, SSO, missing provenance |
| Logout - tenant ID extraction | Covered | Valid URLs, invalid URLs, different formats |
| Role service | Covered | No changes, existing tests updated for new config |

---

## Acceptance Criteria Verification

- [x] **SSO logins working** -- The SSO flow is implemented using openid-client/passport Strategy with correct discovery, token exchange, and claims extraction. PKCE and state parameters are handled automatically by the library. Graph API integration for user profile and role determination is preserved.
- [x] **CFT login working** -- No changes to CFT IDAM code. The cft-idam directory, token-client, and callback handlers are untouched.
- [x] **Azure B2C working** -- No changes to B2C authentication code. The b2c-callback handler and B2C config remain unchanged. The base branch provides B2C functionality.
- [ ] **Token refresh and session management** -- Session serialization/deserialization is preserved. No refresh token implementation (out of scope per plan). Passport session format is unchanged for backward compatibility. **Needs manual verification.**
- [ ] **Error handling** -- Verify callback error path is tested. However, discovery failure is not handled (CRITICAL #1). **Needs fix before deployment.**

---

## Overall Assessment

**NEEDS CHANGES**

The implementation is well-structured and makes good architectural decisions (using the built-in passport strategy instead of a custom wrapper). The core authentication flow is correct, and the openid-client v6 API is used properly. However, the missing error handling around OIDC discovery (CRITICAL #1) is a deployment risk that must be addressed. The missing test coverage for discovery failure and undefined claims should also be added before merging.

Once the CRITICAL issue is fixed and the HIGH PRIORITY test gaps are addressed, this is ready for deployment with appropriate manual testing of all three authentication flows.
