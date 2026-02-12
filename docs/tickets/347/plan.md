# Technical Plan: Replace passport-azure-ad with openid-client

## 1. Technical Approach

### Strategy: Passport Strategy Wrapper (Minimal Risk)

Create a custom Passport strategy that wraps openid-client to replace the deprecated passport-azure-ad OIDCStrategy. This approach:
- Maintains existing passport.authenticate() call patterns in route handlers
- Preserves existing session serialization format (no forced re-login)
- Minimizes code changes in controllers
- Enables straightforward testing and rollback
- Keeps CFT IDAM and other auth methods completely unchanged

### Key Technical Decisions

1. **openid-client version**: Use latest stable v6.x (aligned with 2026 timeframe)
2. **Configuration format**: Use `SSO_ISSUER_URL` (base issuer URL) instead of `SSO_IDENTITY_METADATA` (full .well-known URL), let openid-client handle auto-discovery
3. **Token storage**: Continue with session-only storage (no refresh token implementation in this ticket)
4. **Session format**: Maintain backward compatibility with existing serialized sessions
5. **Passport integration**: Keep Passport.js for consistent auth abstraction across all methods

### Migration Path

The migration replaces:
```typescript
// OLD: passport-azure-ad OIDCStrategy
import { OIDCStrategy } from "passport-azure-ad";
passport.use(new OIDCStrategy(config, verifyCallback));
```

With:
```typescript
// NEW: Custom strategy wrapping openid-client
import { OpenIdConnectStrategy } from "./openid-connect-strategy.js";
passport.use(new OpenIdConnectStrategy(config, verifyCallback));
```

Route handlers (`libs/auth/src/pages/login/index.ts` and `libs/auth/src/pages/sso-callback/index.ts`) remain unchanged.

## 2. Implementation Details

### File Structure

```
libs/auth/
├── package.json                                  # Update dependencies
├── src/
│   ├── config/
│   │   ├── passport-config.ts                    # Update strategy instantiation
│   │   ├── passport-config.test.ts               # Update tests
│   │   └── sso-config.ts                         # Update to use SSO_ISSUER_URL
│   ├── openid-connect-strategy/
│   │   ├── openid-connect-strategy.ts            # NEW: Custom Passport strategy
│   │   └── openid-connect-strategy.test.ts       # NEW: Strategy tests
│   ├── graph-api/
│   │   └── client.ts                             # No changes
│   ├── role-service/
│   │   └── index.ts                              # No changes
│   └── pages/
│       ├── login/index.ts                        # No changes
│       └── sso-callback/index.ts                 # No changes
```

### Component Details

#### 1. New Custom Passport Strategy (`libs/auth/src/openid-connect-strategy/openid-connect-strategy.ts`)

Create a Passport strategy class that:
- Extends `passport.Strategy` base class
- Uses openid-client `Issuer.discover()` for OIDC discovery
- Generates authorization URLs with PKCE support
- Exchanges authorization codes for tokens
- Validates ID tokens
- Extracts user claims and invokes verify callback

**Key responsibilities:**
- OIDC discovery and client configuration
- Authorization URL generation (GET /login)
- Token exchange and validation (GET /sso/return)
- Claims extraction and verify callback invocation

**Interface:**
```typescript
interface OpenIdConnectStrategyOptions {
  issuerUrl: string;              // Base issuer URL (e.g., https://login.microsoftonline.com/{tenant}/v2.0)
  clientId: string;               // Azure AD client ID
  clientSecret: string;           // Azure AD client secret
  redirectUri: string;            // OAuth callback URL
  scope: string[];                // OIDC scopes (openid, profile, email)
  passReqToCallback?: boolean;    // Pass request to verify callback
}

type VerifyCallback = (
  iss: string,
  sub: string,
  profile: any,
  accessToken: string,
  refreshToken: string,
  done: (error: any, user?: any) => void
) => void | Promise<void>;

class OpenIdConnectStrategy extends Strategy {
  constructor(options: OpenIdConnectStrategyOptions, verify: VerifyCallback);
  authenticate(req: Request, options?: any): void;
}
```

**Implementation notes:**
- Store Issuer and Client instances after discovery (avoid repeated discovery)
- Generate and store PKCE code_verifier in session during authorization
- Retrieve code_verifier from session during token exchange
- Handle both authorization initiation and callback in `authenticate()` method
- Use req.query.code presence to distinguish between initiation and callback

#### 2. Updated SSO Configuration (`libs/auth/src/config/sso-config.ts`)

**Changes:**
- Replace `SSO_IDENTITY_METADATA` with `SSO_ISSUER_URL`
- Remove `appendOpenIdConfigPath()` helper (no longer needed)
- Update `SsoConfig` interface to replace `identityMetadata` with `issuerUrl`

**New configuration structure:**
```typescript
interface SsoConfig {
  issuerUrl: string;                    // NEW: Base issuer URL
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  responseType: "code";                 // Always "code" with PKCE
  responseMode: "query";
  scope: string[];
  systemAdminGroupId: string;
  internalAdminCtscGroupId: string;
  internalAdminLocalGroupId: string;
}
```

**Environment variable mapping:**
- `SSO_ISSUER_URL` → `ssoConfig.issuerUrl` (new format: `https://login.microsoftonline.com/{tenant}/v2.0`)
- All other variables remain unchanged

#### 3. Updated Passport Configuration (`libs/auth/src/config/passport-config.ts`)

**Changes:**
- Import `OpenIdConnectStrategy` instead of `OIDCStrategy`
- Update strategy instantiation with new config structure
- Update configuration check to use `issuerUrl` instead of `identityMetadata`
- Maintain identical `verifyOidcCallback()` logic (no changes)

**Modified code:**
```typescript
// OLD
import { OIDCStrategy } from "passport-azure-ad";
passport.use(new OIDCStrategy({
  identityMetadata: ssoConfig.identityMetadata,
  clientID: ssoConfig.clientId,
  // ...
}, verifyOidcCallback));

// NEW
import { OpenIdConnectStrategy } from "../openid-connect-strategy/openid-connect-strategy.js";
passport.use(new OpenIdConnectStrategy({
  issuerUrl: ssoConfig.issuerUrl,
  clientId: ssoConfig.clientId,
  // ...
}, verifyOidcCallback));
```

#### 4. Package Dependencies (`libs/auth/package.json`)

**Changes:**
```json
{
  "dependencies": {
    "@hmcts/account": "*",
    "@microsoft/microsoft-graph-client": "3.0.7",
    "openid-client": "6.1.3"  // NEW: Replace passport-azure-ad
  }
}
```

**Remove:**
- `passport-azure-ad: 4.3.5`

**Add:**
- `openid-client: 6.1.3` (latest stable v6.x)

#### 5. Test Updates

**Update `libs/auth/src/config/passport-config.test.ts`:**
- Mock `OpenIdConnectStrategy` instead of `OIDCStrategy`
- Update import paths
- Update test assertions for new strategy options structure
- Maintain existing test coverage for all scenarios:
  - SSO disabled for development
  - Incomplete SSO configuration
  - Fully configured SSO
  - Verify callback success/failure cases

**Create `libs/auth/src/openid-connect-strategy/openid-connect-strategy.test.ts`:**
- Test OIDC discovery from issuer URL
- Test authorization URL generation with PKCE
- Test token exchange with authorization code
- Test ID token validation
- Test claims extraction and profile construction
- Test error handling for all failure scenarios

## 3. Error Handling & Edge Cases

### Configuration Errors

| Scenario | Handling |
|----------|----------|
| Missing `SSO_ISSUER_URL` | Passport initializes without SSO strategy (existing behavior) |
| Missing `SSO_CLIENT_ID` or `SSO_CLIENT_SECRET` | Passport initializes without SSO strategy (existing behavior) |
| Invalid issuer URL format | Log error, initialize without SSO strategy |
| OIDC discovery fails | Log error, return 503 on /login attempts |

### Authentication Errors

| Scenario | Handling |
|----------|----------|
| Token exchange fails | Redirect to /login with session error message |
| ID token validation fails | Redirect to /login with session error message |
| Microsoft Graph API fails | Redirect to /login with error (existing behavior) |
| No role assigned (no matching groups) | Redirect to /sso-rejected (existing behavior) |
| User cancels Azure AD login | Redirect to /login (passport failureRedirect) |

### Session Management Errors

| Scenario | Handling |
|----------|----------|
| Missing PKCE code_verifier in session | Redirect to /login (restart flow) |
| Session regeneration fails | Redirect to /login (existing behavior) |
| User serialization fails | Log error, redirect to /login |

### Edge Cases

1. **Concurrent login attempts**: PKCE code_verifier stored per-session prevents CSRF
2. **Session timeout during auth flow**: Missing code_verifier triggers flow restart
3. **Browser back button after login**: Session already established, redirects to dashboard
4. **Multiple browser tabs**: Each has independent session and PKCE verifier
5. **Development mode with SSO disabled**: Strategy not registered, /login returns 503

## 4. Acceptance Criteria Mapping

### AC 1: SSO logins working and users can login successfully

**Implementation:**
- Custom `OpenIdConnectStrategy` handles full OAuth 2.0 + OIDC flow
- Authorization URL generation redirects to Azure AD login
- Token exchange validates and processes ID tokens
- Graph API integration fetches user profile and group memberships
- Role determination assigns correct role based on group IDs
- Passport session established with user profile

**Verification:**
- Unit tests for strategy authentication flow
- Integration tests for complete login journey
- E2E tests for SSO login with different user roles
- Manual testing with real Azure AD tenant

### AC 2: CFT login working and users can login successfully

**Implementation:**
- No changes to CFT IDAM authentication flow
- `libs/auth/src/cft-idam/token-client.ts` remains unchanged
- CFT IDAM controllers and routes remain unchanged

**Verification:**
- Existing CFT IDAM tests continue to pass
- E2E tests for CFT login journey must pass
- Manual testing confirms no regression

### AC 3: Azure B2C working and users can login successfully

**Implementation:**
- No B2C authentication flow currently exists in codebase
- B2C_IDAM provenance referenced in code but no actual implementation
- This ticket does NOT implement B2C support

**Verification:**
- Confirm with stakeholders that B2C support is out of scope for this ticket
- If B2C is required, create separate ticket for implementation

### AC 4: Token refresh and session management

**Implementation:**
- Passport session serialization/deserialization remains unchanged
- Session regeneration after successful authentication remains unchanged
- No refresh token implementation (out of scope for this ticket)

**Verification:**
- Unit tests for serialize/deserialize user
- Integration tests for session persistence across requests
- E2E tests verify authenticated state persists

### AC 5: Error handling

**Implementation:**
- Strategy authenticate() method handles all OIDC errors
- Configuration validation prevents misconfigured SSO attempts
- Appropriate redirects and error messages for all failure scenarios

**Verification:**
- Unit tests for all error scenarios
- Integration tests for configuration validation
- E2E tests for authentication failures

## 5. Testing Strategy

### Unit Tests

**New tests:**
- `libs/auth/src/openid-connect-strategy/openid-connect-strategy.test.ts`
  - OIDC discovery success/failure
  - Authorization URL generation
  - Token exchange success/failure
  - ID token validation
  - Claims extraction
  - Error handling for all failure modes

**Updated tests:**
- `libs/auth/src/config/passport-config.test.ts`
  - Update mocks for new strategy
  - Update assertions for new config structure
  - Maintain existing coverage

**Unchanged tests:**
- `libs/auth/src/config/sso-config.test.ts` (update to test `issuerUrl` instead of `identityMetadata`)
- All other auth module tests remain unchanged

### Integration Tests

Create integration tests in `libs/auth/src/integration-tests/` (if directory doesn't exist):
- Complete SSO authentication flow from /login to dashboard redirect
- Session regeneration and user persistence
- Database user creation/update with SSO provenance
- Role-based redirects after successful authentication

### E2E Tests

**Required E2E tests** (must be tagged `@nightly` if using real Azure AD accounts):
- SSO login journey for system admin user
- SSO login journey for CTSC admin user
- SSO login journey for local admin user
- SSO rejection for user without required groups
- CFT IDAM login journey (regression test - must continue to pass)

**Note:** Follow CLAUDE.md guidelines - minimize test count, include validations within journey tests.

### Manual Testing

Before deployment to each environment:
- [ ] Verify `SSO_ISSUER_URL` format in Key Vault/Secrets
- [ ] Test SSO login in dev environment
- [ ] Test CFT IDAM login in dev environment (regression)
- [ ] Test SSO login in staging environment
- [ ] Test CFT IDAM login in staging environment (regression)
- [ ] Verify error pages display correctly for auth failures
- [ ] Verify session cookies are set correctly
- [ ] Verify role-based access control works after migration

## 6. Deployment Considerations

### Environment Configuration

**Required environment variable change:**
- **OLD:** `SSO_IDENTITY_METADATA=https://login.microsoftonline.com/{tenant}/v2.0/.well-known/openid-configuration`
- **NEW:** `SSO_ISSUER_URL=https://login.microsoftonline.com/{tenant}/v2.0`

**Update locations:**
- Azure Key Vault (production/staging environments)
- GitHub Secrets (CI/CD pipelines)
- Local `.env` files (development)

**Note:** If `SSO_ISSUER_URL` is already configured (as ticket description states), verify format matches expected base URL (not full .well-known URL).

### Zero-Downtime Deployment

This migration supports zero-downtime deployment:
1. Deploy code with new openid-client implementation
2. Existing authenticated sessions continue to work (session format unchanged)
3. New login attempts use openid-client strategy
4. No forced re-login required

### Rollback Strategy

If issues are discovered in production:
1. Revert to previous deployment (passport-azure-ad)
2. No session migration needed (format unchanged)
3. Users with active sessions continue working
4. New logins use old passport-azure-ad strategy

**Note:** For extra safety, could implement feature flag to toggle between strategies, but adds complexity. Recommend standard deployment rollback instead.

## 7. Performance Considerations

### OIDC Discovery Caching

The custom strategy should cache the Issuer and Client instances after initial discovery to avoid repeated network calls to `/.well-known/openid-configuration` endpoint.

**Implementation:**
```typescript
private issuer?: Issuer<Client>;
private client?: Client;

async getClient(): Promise<Client> {
  if (!this.client) {
    this.issuer = await Issuer.discover(this.options.issuerUrl);
    this.client = new this.issuer.Client({
      client_id: this.options.clientId,
      client_secret: this.options.clientSecret,
      redirect_uris: [this.options.redirectUri],
      response_types: ['code']
    });
  }
  return this.client;
}
```

### Session Storage

No changes to session storage strategy. Continue using existing session store (likely Redis or in-memory for dev).

## 8. Security Considerations

### PKCE (Proof Key for Code Exchange)

openid-client supports PKCE by default. The custom strategy should:
- Generate code_verifier and code_challenge during authorization
- Store code_verifier in session
- Include code_verifier in token exchange request

**Benefits:**
- Protection against authorization code interception attacks
- Recommended for all OAuth 2.0 clients (RFC 7636)

### Token Validation

openid-client handles all token validation automatically:
- Signature verification using JWKS from discovery
- Issuer validation
- Audience validation (client ID)
- Expiry validation
- Nonce validation (if provided)

No manual token validation needed.

### State Parameter

Use state parameter for CSRF protection:
- Generate random state value during authorization
- Store in session
- Validate on callback

openid-client handles this automatically via `authorizationUrl()` method.

## 9. CLARIFICATIONS NEEDED

### 1. Azure B2C Implementation Status

**Question:** Should Azure B2C authentication support be implemented as part of this ticket?

**Context:**
- Acceptance criteria mentions "Azure B2C is working"
- Code references B2C_IDAM provenance in several places
- No actual B2C authentication flow exists in `libs/auth/src/pages/`
- No B2C configuration exports from `sso-config.ts`

**Recommendation:** Clarify with stakeholders if B2C is:
- **Option A:** Out of scope (no B2C users exist yet, future implementation)
- **Option B:** Required for this ticket (need B2C tenant details and configuration)

**Impact:** If B2C required, need additional implementation:
- Separate B2C configuration in `sso-config.ts`
- B2C login/callback route handlers
- B2C-specific role determination logic
- Additional E2E tests for B2C flow

### 2. SSO_ISSUER_URL Format

**Question:** What is the exact format of `SSO_ISSUER_URL` in Key Vault?

**Context:**
- Ticket states "SSO_ISSUER_URL will be used from keyvault and Github secrets which has been added already"
- Need to confirm if it's base URL or full .well-known URL

**Expected format:** `https://login.microsoftonline.com/{tenant}/v2.0`

**Verification needed:** Check Key Vault to confirm current value matches expected format.

### 3. Token Refresh Strategy

**Question:** Should token refresh be implemented as part of this migration?

**Context:**
- Current passport-azure-ad implementation does not use refresh tokens
- openid-client supports token refresh out of the box
- Session-based authentication may be sufficient for admin users

**Recommendation:** Keep session-based auth (no refresh tokens) for this ticket to minimize scope. Consider refresh tokens in future ticket if user experience requires it (e.g., long-lived sessions).

### 4. Deployment Window

**Question:** Is there a maintenance window available for deployment, or must this be zero-downtime?

**Context:**
- Implementation supports zero-downtime deployment
- If maintenance window available, could include additional validation/testing

**Recommendation:** Proceed with zero-downtime approach. Session format backward compatibility ensures no forced re-login.

### 5. Feature Flag for Gradual Rollout

**Question:** Should we implement a feature flag to toggle between passport-azure-ad and openid-client?

**Context:**
- Adds complexity but provides safer rollout
- Could enable SSO for subset of users first
- Standard deployment rollback may be sufficient

**Recommendation:** Skip feature flag unless stakeholders require gradual rollout strategy. Standard deployment rollback is simpler and sufficient for this change.
