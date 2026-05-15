# Technical Plan: Crime IDAM Integration

## Overview

Integrate Crime IDAM as a third OAuth2 authentication provider alongside Azure AD SSO and CFT IDAM. This implementation will mirror the existing CFT IDAM pattern established in the codebase.

## Technical Approach

### 1. Architecture Pattern

Follow the established CFT IDAM pattern:
- Configuration module (`crime-idam-config.ts`) for environment variables and endpoint construction
- Token client module (`crime-idam/token-client.ts`) for OAuth2 flow implementation
- Page controllers for login initiation, callback handling, and rejection
- Role validation service to determine access permissions
- Update sign-in page to include Crime IDAM option

### 2. OAuth2 Flow

```
User clicks "Crime IDAM" → /crime-login
  ↓
Redirect to Crime IDAM /oauth2/authorise
  ↓
User authenticates at Crime IDAM
  ↓
Callback to /crime-login/return with code
  ↓
Exchange code for token at /oauth2/token
  ↓
Extract user info from JWT (id_token or access_token)
  ↓
Validate roles → If rejected role → /crime-rejected
  ↓
Create/update user in database with userProvenance: "CRIME_IDAM"
  ↓
Create session with user profile
  ↓
Redirect to /account-home
```

### 3. Key Differences from CFT IDAM

- Different base URL environment variable: `CRIME_IDAM_BASE_URL`
- Different client credentials: `CRIME_IDAM_CLIENT_ID`, `CRIME_IDAM_CLIENT_SECRET`
- Different endpoint paths: `/oauth2/authorise` and `/oauth2/token` (same as CFT)
- User details endpoint: `/details` (need clarification on response format)
- Separate CSP configuration for Crime IDAM domain
- User provenance value: `"CRIME_IDAM"`

## Implementation Details

### 1. Configuration Module

**File**: `libs/auth/src/config/crime-idam-config.ts`

```typescript
export interface CrimeIdamConfig {
  crimeIdamUrl: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scope: string;
  authorizationEndpoint: string;
  tokenEndpoint: string;
  userInfoEndpoint: string;
}

export function getCrimeIdamConfig(): CrimeIdamConfig
export function isCrimeIdamConfigured(): boolean
```

Environment variables:
- `CRIME_IDAM_BASE_URL` - Base URL (e.g., https://idam.crime.hmcts.net)
- `CRIME_IDAM_CLIENT_ID` - OAuth2 client ID
- `CRIME_IDAM_CLIENT_SECRET` - OAuth2 client secret
- `CRIME_IDAM_SCOPE` - OAuth2 scope (e.g., "openid profile roles")
- `BASE_URL` - Used to construct redirect URI

Redirect URI: `${BASE_URL}/crime-login/return`

### 2. Token Client Module

**File**: `libs/auth/src/crime-idam/token-client.ts`

Functions:
- `exchangeCodeForToken(code: string, config: CrimeIdamConfig): Promise<TokenResponse>`
- `extractUserInfoFromToken(tokenResponse: TokenResponse): CrimeIdamUserInfo`
- Optional: `fetchUserDetails(accessToken: string, config: CrimeIdamConfig): Promise<CrimeIdamUserInfo>`

Interface:
```typescript
export interface CrimeIdamUserInfo {
  id: string;
  email: string;
  displayName: string;
  firstName?: string;
  surname?: string;
  roles: string[];
}
```

JWT token parsing will extract user information from `id_token` claims.

### 3. Role Validation Service

**File**: `libs/auth/src/role-service/index.ts` (update existing)

Add new function:
```typescript
export function isRejectedCrimeRole(roles: string[]): boolean
```

Pattern to be determined based on Crime IDAM role structure. Initially, we'll implement a conservative approach that rejects all roles unless explicitly allowed.

### 4. Page Controllers

#### /crime-login

**File**: `libs/auth/src/pages/crime-login/index.ts`

- Check if Crime IDAM is configured
- Store language preference in session
- Build authorization URL with parameters: client_id, response_type=code, redirect_uri, scope, ui_locales
- Redirect to Crime IDAM authorization endpoint

#### /crime-login/return

**File**: `libs/auth/src/pages/crime-callback/index.ts`

- Extract authorization code from query
- Exchange code for token
- Extract user info from token
- Validate roles (reject if necessary)
- Create or update user in database with `userProvenance: "CRIME_IDAM"`
- Create user session
- Redirect to /account-home

#### /crime-rejected

**File**: `libs/auth/src/pages/crime-rejected/index.ts`, `index.njk`, `en.ts`, `cy.ts`

- Display rejection message
- Link back to sign-in page
- Welsh language support

### 5. Sign-in Page Updates

**File**: `libs/public-pages/src/pages/sign-in/index.ts`, `index.njk`, `en.ts`, `cy.ts`

Add new radio option for Crime IDAM:
- English: "With a Crime IDAM account"
- Welsh: "Gyda chyfrif Crime IDAM" (placeholder - needs professional translation)
- Value: `"crime"`
- Route: `/crime-login?lng=${locale}`

### 6. Security Configuration

**File**: `apps/web/src/app.ts`

Update helmet configuration:
```typescript
app.use(
  configureHelmet({
    cftIdamUrl: process.env.CFT_IDAM_URL,
    crimeIdamUrl: process.env.CRIME_IDAM_BASE_URL
  })
);
```

**File**: `libs/web-core/src/middleware/helmet/helmet-middleware.ts`

Update `SecurityOptions` interface and `formAction` CSP directive to include Crime IDAM URL.

### 7. Callback Route Registration

**File**: `apps/web/src/app.ts`

Add manual route registration:
```typescript
import { crimeCallbackHandler } from "@hmcts/auth";
app.get("/crime-login/return", crimeCallbackHandler);
```

**File**: `libs/auth/src/index.ts`

Export callback handler:
```typescript
export { GET as crimeCallbackHandler } from "./pages/crime-callback/index.js";
```

### 8. Database Schema

**No changes required** - The `user_provenance` enum in the Prisma schema already includes `"CRIME_IDAM"`:

```prisma
enum UserProvenance {
  SSO
  CFT_IDAM
  CRIME_IDAM
  B2C_IDAM
}
```

## Error Handling & Edge Cases

### Error Scenarios

1. **Configuration Missing**
   - Check: `isCrimeIdamConfigured()` returns false
   - Response: 503 Service Unavailable with message

2. **No Authorization Code**
   - Check: Missing `code` query parameter in callback
   - Response: Redirect to `/sign-in?error=no_code&lng=${lng}`

3. **Token Exchange Failure**
   - Check: HTTP error from token endpoint
   - Response: Log error, redirect to `/sign-in?error=auth_failed&lng=${lng}`

4. **Invalid JWT Token**
   - Check: Malformed token, missing claims
   - Response: Log error, redirect to `/sign-in?error=auth_failed&lng=${lng}`

5. **Rejected Role**
   - Check: `isRejectedCrimeRole()` returns true
   - Response: Redirect to `/crime-rejected?lng=${lng}`

6. **Database Error**
   - Check: `createOrUpdateUser()` throws error
   - Response: Track exception, redirect to `/sign-in?error=db_error&lng=${lng}`

7. **Session Creation Failure**
   - Check: Session regeneration, login, or save fails
   - Response: Log error, redirect to `/sign-in?error=session_failed&lng=${lng}`

### Edge Cases

1. **Development Environment**
   - Crime IDAM disabled by default unless `ENABLE_CRIME_IDAM=true`
   - Similar to CFT IDAM pattern

2. **Language Preservation**
   - Store `req.session.lng` before redirecting to Crime IDAM
   - Restore language in callback for proper redirect

3. **Existing User**
   - `createOrUpdateUser()` updates existing user by `userProvenanceId`
   - Updates `lastSignedInDate` on each login

4. **Missing User Details**
   - Handle optional fields (firstName, surname) gracefully
   - Use email or id as fallback for displayName

## Acceptance Criteria Mapping

### AC1: Environment Variables Configuration
- **Implementation**: `crime-idam-config.ts` reads from environment variables
- **Verification**: Unit tests for `getCrimeIdamConfig()` with different environment states

### AC2: OAuth2 Endpoints Usage
- **Implementation**: `token-client.ts` implements authorization code exchange
- **Verification**: Unit tests mocking fetch calls to token endpoint

### AC3: Authentication Flow
- **Implementation**:
  - `/crime-login` redirects to Crime IDAM
  - `/crime-login/return` handles callback
  - Token exchange and user info extraction
- **Verification**: E2E test for complete flow

### AC4: Error Handling
- **Implementation**: Try-catch blocks with specific error redirects
- **Verification**: Unit tests for each error scenario

### AC5: User Details and Roles
- **Implementation**: JWT parsing extracts user info, role validation service checks permissions
- **Verification**: Unit tests for token parsing and role validation

### AC6: Session Management
- **Implementation**: Express session with Passport.js serialization
- **Verification**: E2E test verifies user can access protected pages after login

### AC7: Welsh Language Support
- **Implementation**: `en.ts` and `cy.ts` for all pages, language parameter preserved through flow
- **Verification**: E2E test with `?lng=cy` parameter

## Testing Strategy

### Unit Tests

1. **crime-idam-config.test.ts**
   - Test `getCrimeIdamConfig()` with various environment configurations
   - Test `isCrimeIdamConfigured()` logic for development and production

2. **crime-idam/token-client.test.ts**
   - Mock fetch responses for token exchange
   - Test JWT parsing with various token structures
   - Test error handling for invalid tokens

3. **role-service/index.test.ts**
   - Test `isRejectedCrimeRole()` with various role arrays
   - Test edge cases (empty array, undefined)

4. **Pages unit tests**
   - `crime-login/index.test.ts` - Test redirect URL construction
   - `crime-callback/index.test.ts` - Test callback flow with mocked dependencies
   - `crime-rejected/index.test.ts` - Test page rendering

### E2E Tests

**File**: `e2e-tests/tests/crime-idam/crime-idam.spec.ts`

Test scenarios:
1. Valid user authentication flow (full journey)
2. Rejected role redirects to rejection page
3. Welsh language support throughout flow
4. Error handling for missing authorization code
5. Accessibility checks on rejection page

## CLARIFICATIONS NEEDED

### 1. User Details Endpoint Response Shape

**Question**: What is the exact response structure from the `/details` endpoint?

The ticket mentions using `/details` to retrieve user info, but the CFT IDAM implementation extracts everything from the JWT token. We need to know:
- Is `/details` endpoint required, or can we extract everything from the JWT?
- If required, what does the response JSON look like?
- Which fields map to `id`, `email`, `displayName`, `firstName`, `surname`, `roles`?

**Current Assumption**: Extract all user info from JWT `id_token` claims, similar to CFT IDAM.

### 2. CRIME_IDAM_REDIRECT_URI Configuration

**Question**: Should `CRIME_IDAM_REDIRECT_URI` be a separate environment variable or computed from `BASE_URL`?

The ticket lists `CRIME_IDAM_REDIRECT_URI` as an environment variable, but CFT IDAM computes it as `${BASE_URL}/cft-login/return`.

**Current Assumption**: Compute from `BASE_URL` as `${BASE_URL}/crime-login/return` to maintain consistency.

### 3. Welsh Translations

**Question**: What are the official Welsh translations for Crime IDAM content?

Need professional translations for:
- "With a Crime IDAM account" (sign-in page)
- All content on `/crime-rejected` page

**Current Assumption**: Use placeholder Welsh text, to be replaced with official translations.

### 4. Permitted vs Rejected Roles

**Question**: What are the specific Crime IDAM roles that should be permitted or rejected?

The ticket mentions role validation but doesn't specify which roles are valid.

**Current Assumption**: Initially reject all roles except an empty list (conservative), then update based on requirements. Alternative: Mirror CFT IDAM pattern and reject "citizen" and "letter-holder" roles.

### 5. OAuth2 Scope Requirements

**Question**: What is the exact scope string to use for Crime IDAM authorization?

Ticket suggests "openid profile roles" but needs confirmation.

**Current Assumption**: Use `CRIME_IDAM_SCOPE` environment variable with default value "openid profile roles".

### 6. Refresh Token Handling

**Question**: Should we store and use refresh tokens for Crime IDAM sessions?

CFT IDAM implementation doesn't store refresh tokens currently.

**Current Assumption**: Don't implement refresh token handling in initial version, matching CFT IDAM behavior.

### 7. CSP Configuration

**Question**: What is the exact domain for Crime IDAM in production?

Need to know the domain to add to Content Security Policy `form-action` directive.

**Current Assumption**: Use `CRIME_IDAM_BASE_URL` value (e.g., https://idam.crime.hmcts.net).

### 8. Database Role Value

**Question**: What role should be assigned to Crime IDAM users in the database?

CFT IDAM users receive `role: "VERIFIED"`. Should Crime IDAM users receive the same?

**Current Assumption**: Assign `role: "VERIFIED"` to all Crime IDAM users who pass role validation.

### 9. Sign-in Page Radio Option Label

**Question**: What should the user-facing label be for the Crime IDAM option?

Options:
- "With a Crime IDAM account"
- "With a HMCTS Crime account"
- "With a Crime Platform account"

**Current Assumption**: "With a Crime IDAM account" (technical name, may need rewording for end users).

### 10. Development Environment Enablement

**Question**: Should Crime IDAM be disabled by default in development like CFT IDAM?

**Current Assumption**: Yes, require `ENABLE_CRIME_IDAM=true` environment variable in development.
