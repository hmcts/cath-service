# Technical Plan: Azure B2C Sign-In

## Technical Approach

### Azure B2C Integration (Non-Prod Instance)
- **Use Non-Prod B2C instance** for integration as per technical criteria
- Add B2C OIDC strategy alongside existing SSO (passport-azure-ad)
- Three B2C user flows (policies): HMCTS, Common Platform, CaTH
- Pass `ui_locales` parameter for Welsh language support in B2C flows
- Handle B2C callbacks with authorization code exchange
- Store user profile in existing session (already Redis-backed via web-core)

### Environment Variables (Non-Prod B2C)
Add to `.env.example`:
```bash
# Azure B2C Configuration (Non-Prod)
B2C_TENANT_NAME=<non-prod-tenant-name>
B2C_TENANT_ID=<non-prod-tenant-id>
B2C_CLIENT_ID=<client-id>
B2C_CLIENT_SECRET=<client-secret>
B2C_POLICY_HMCTS=B2C_1A_HMCTS_SignIn
B2C_POLICY_COMMON_PLATFORM=B2C_1A_CommonPlatform_SignIn
B2C_POLICY_CATH=B2C_1A_CaTH_SignIn

# Session Timeout (milliseconds)
SESSION_TIMEOUT_WARNING_MS=1500000  # 25 minutes
SESSION_TIMEOUT_LOGOUT_MS=1800000   # 30 minutes
```

### Session Management
- Extend existing Redis session with inactivity tracking
- Server-side: Track `lastActivity` timestamp, calculate timeout
- Client-side: JavaScript countdown timer, show modal warning
- Timeout thresholds: warning at 25 mins, logout at 30 mins (configurable)

### Authentication Flow
1. User clicks "Sign in" → `/sign-in` (options page)
2. User selects provider → redirect to B2C with policy + language
3. B2C authentication → callback to `/b2c/callback`
4. Exchange code for tokens → create session → redirect to dashboard
5. Inactivity timer running on all authenticated pages
6. Warning modal → user can continue or be logged out

## Implementation

### New Files in libs/auth/

**Configuration:**
- `src/config/b2c-config.ts` - B2C tenant, policies, redirect URIs (similar to sso-config.ts)

**Business Logic:**
- `src/b2c/strategy.ts` - Passport B2C OIDC strategy setup
- `src/b2c/verify-callback.ts` - User profile extraction from B2C token
- `src/session/timeout-tracker.ts` - Session activity tracking service

**Middleware:**
- `src/middleware/session-timeout.ts` - Track activity, inject timeout data

**Pages:**
- `src/pages/sign-in/index.ts` - Sign-in options controller (GET/POST)
- `src/pages/sign-in/index.njk` - Radio buttons for 3 providers
- `src/pages/sign-in/en.ts` - English content
- `src/pages/sign-in/cy.ts` - Welsh content
- `src/pages/b2c-callback/index.ts` - B2C OAuth callback handler
- `src/pages/session-expired/index.ts` - Timeout expiry page
- `src/pages/session-expired/index.njk`
- `src/pages/session-expired/en.ts`
- `src/pages/session-expired/cy.ts`

**Assets:**
- `src/assets/js/session-timeout.ts` - Client-side countdown timer + modal

### Files to Modify

**libs/auth/:**
- `src/config/passport-config.ts` - Add B2C strategy alongside SSO
- `src/index.ts` - Export new B2C handlers and middleware
- `package.json` - Add build:nunjucks script for new pages

**apps/web/:**
- `src/app.ts` - Register session timeout middleware, mount B2C routes
- `vite.config.ts` - Include auth assets

**Root:**
- `.env.example` - Document B2C environment variables

### Key Exports (libs/auth/src/index.ts)
```typescript
export { sessionTimeoutMiddleware } from "./middleware/session-timeout.js";
export { GET as b2cCallbackHandler } from "./pages/b2c-callback/index.js";
export { isBtoCConfigured } from "./config/b2c-config.js";
```

## Error Handling

### B2C Errors
- Invalid authorization code → Show error summary on sign-in page
- Network failures → Retry with exponential backoff, fallback error page
- Invalid policy → Log error, redirect to sign-in with message

### Session Errors
- Redis connection failure → Fallback to in-memory sessions (dev only)
- Session not found → Redirect to `/session-expired` page
- Activity tracking failure → Log warning, continue (graceful degradation)

### User Input Errors
- No provider selected → Show GOV.UK error summary component
- Invalid callback state parameter → Log security event, reject with 403

## CLARIFICATIONS NEEDED

1. **Non-Prod B2C Tenant Configuration**
   - Need Non-Prod B2C tenant name, tenant ID, client ID, and client secret
   - Are the 3 user flow policies already created in Non-Prod B2C?
   - What are the exact policy names (e.g., B2C_1A_HMCTS_SignIn)?
   - Are Welsh translations configured in B2C user flows (ui_locales support)?
   - What redirect URI is registered in Non-Prod B2C? (e.g., `https://localhost:8080/b2c/callback`)

2. **Session Timeout Values**
   - Confirm timeout thresholds (warning: 25 mins, logout: 30 mins)?
   - Should timeout apply to all users or only verified users?

3. **Sign-In Provider Differences**
   - Do the 3 providers return different claims/profile structures?
   - Should all 3 providers use the same B2C tenant or separate ones?
   - Are error messages different for HMCTS vs CaTH/Common Platform?

4. **Dashboard Redirect**
   - After sign-in, redirect to `/dashboard` or different page per role?
   - Does dashboard already exist in verified-pages module?

5. **Forgotten Password Flow**
   - Is this handled entirely by B2C user flows (built-in)?
   - Or do we need custom pages for verification code entry?

6. **Sign-Out Behavior**
   - Should sign-out call B2C logout endpoint or just destroy local session?
   - Where to redirect after sign-out (home page `/` or custom page)?
