# #347: Replace passport-azure-ad with openid-client

**State:** OPEN
**Assignees:** (none)
**Author:** junaidiqbalmoj
**Labels:** (none)
**Created:** 2026-02-11T16:48:32Z
**Updated:** 2026-02-12T13:45:34Z

## Description

CaTH AI is currently using library passport-azure-ad which will be deprecated soon. Instead of using passport-azure-ad, we need to use openid-client in our application.

SSO_ISSUER_URL will be used from keyvault and Github secrets which has been added already.

**Acceptance criteria**

- SSO logins are working and users are able to login successfully.
- CFT login is working and users are able to login successfully.
- Azure B2C is working and users are able to login successfully.

## Comments

### Comment by OgechiOkelu on 2026-02-12T13:39:48Z
@SPEC new-feature.md

### Comment by hmctsclaudecode on 2026-02-12T13:42:08Z
## 1. User Story
**As a** HMCTS CaTH service maintainer
**I want to** replace the deprecated passport-azure-ad library with openid-client
**So that** the authentication system remains supported and secure with modern OIDC standards

## 2. Background

The passport-azure-ad library is being deprecated and needs to be replaced. The service currently uses passport-azure-ad for SSO authentication with Azure AD (for internal staff access). The replacement library, openid-client, is a modern, standards-compliant OpenID Connect client that provides better maintainability and broader OIDC provider support.

### Current Authentication Flows

The application supports three authentication methods:

1. **SSO (Azure AD)** - Internal HMCTS staff authentication using passport-azure-ad OIDCStrategy
2. **CFT IDAM** - Courts and Tribunals IDAM service (already using native OAuth2/OIDC implementation)
3. **Azure B2C** - Public user authentication (referenced in code but implementation appears incomplete)

### Affected Files

- `libs/auth/package.json` - Dependency replacement
- `libs/auth/src/config/passport-config.ts` - Core authentication logic
- `libs/auth/src/config/passport-config.test.ts` - Unit tests
- `libs/auth/src/config/sso-config.ts` - Configuration management
- `libs/auth/src/pages/login/index.ts` - SSO login initiation
- `libs/auth/src/pages/sso-callback/index.ts` - OAuth callback handler

**Reference:** CFT IDAM implementation already uses native fetch-based OAuth2 implementation in `libs/auth/src/cft-idam/token-client.ts` which can serve as a pattern.

## 3. Acceptance Criteria

* **Scenario 1:** SSO login with Azure AD
    * **Given** an internal HMCTS staff member is not authenticated
    * **When** they click the SSO login button
    * **Then** they are redirected to Azure AD login page
    * **And** after successful authentication they are redirected back to the application
    * **And** their user profile is fetched from Microsoft Graph API
    * **And** their role is determined based on Azure AD group membership
    * **And** they can access pages appropriate for their role

* **Scenario 2:** CFT IDAM login continues to work
    * **Given** a CFT user is not authenticated
    * **When** they use CFT IDAM login
    * **Then** authentication completes successfully using existing OAuth2 implementation
    * **And** they can access their account

* **Scenario 3:** Azure B2C login support (if implemented)
    * **Given** Azure B2C configuration is provided
    * **When** a public user authenticates via Azure B2C
    * **Then** they receive a B2C_IDAM provenance
    * **And** they have VERIFIED role access

* **Scenario 4:** Token refresh and session management
    * **Given** a user is authenticated via SSO
    * **When** their session is active
    * **Then** the application maintains their authentication state
    * **And** passport serialization/deserialization works correctly

* **Scenario 5:** Error handling
    * **Given** authentication fails for any reason
    * **When** errors occur during the OIDC flow
    * **Then** users see appropriate error messages
    * **And** errors are logged for debugging
    * **And** users are redirected to appropriate error pages

## 4. User Journey Flow

### SSO Authentication Flow

```
[User] ---> /login (GET) ---> [Check if SSO configured]
                                      |
                                      v
                        [Generate authorization URL with openid-client]
                                      |
                                      v
                        [Redirect to Azure AD login page]
                                      |
                                      v
                        [User authenticates with Azure AD]
                                      |
                                      v
                        /sso/return (GET with auth code)
                                      |
                                      v
                        [Exchange code for tokens using openid-client]
                                      |
                                      v
                        [Fetch user profile from Microsoft Graph]
                                      |
                                      v
                        [Determine role from group membership]
                                      |
                                      v
                        [Create/update user in database]
                                      |
                                      v
                        [Establish Passport session]
                                      |
                                      v
                        [Redirect to dashboard based on role]
```

### Technical Flow Diagram

```
┌─────────────┐         ┌──────────────┐         ┌──────────────┐
│   Browser   │────────>│  Express App │────────>│  Azure AD    │
│             │  /login │   + openid-  │ redirect│  (OIDC)      │
│             │         │    client    │         │              │
└─────────────┘         └──────────────┘         └──────────────┘
      ^                        |                         |
      |                        |                         |
      |                        v                         v
      |                 ┌──────────────┐         ┌──────────────┐
      |─────────────────│  /sso/return │<────────│ Auth Code    │
        dashboard       │   callback   │  code   │   returned   │
                        └──────────────┘         └──────────────┘
                               |
                               v
                        ┌──────────────┐
                        │ Token        │
                        │ Exchange     │
                        │ (openid-     │
                        │  client)     │
                        └──────────────┘
                               |
                               v
                        ┌──────────────┐
                        │ Graph API    │
                        │ Fetch User   │
                        │ & Groups     │
                        └──────────────┘
                               |
                               v
                        ┌──────────────┐
                        │ Passport     │
                        │ Session      │
                        └──────────────┘
```

## 5. Low Fidelity Wireframe

No UI changes required. This is a backend authentication library migration that maintains identical user-facing behavior.

## 6. Page Specifications

No page changes required. Existing SSO login flow pages remain unchanged:
- `/login` - Initiates SSO authentication
- `/sso/return` - Handles OAuth callback
- `/sso-rejected` - Shown when user lacks required roles

## 7. Content

No content changes required.

## 8. URL

No URL changes required. Existing routes preserved:
- `GET /login` - SSO login initiation
- `GET /sso/return` - SSO callback handler

## 9. Validation

### Configuration Validation

Required environment variables:
- `SSO_ISSUER_URL` - Azure AD issuer URL (new format, replaces SSO_IDENTITY_METADATA)
- `SSO_CLIENT_ID` - Azure AD application client ID
- `SSO_CLIENT_SECRET` - Azure AD application client secret
- `SSO_SYSTEM_ADMIN_GROUP_ID` - Group ID for system admin role
- `SSO_INTERNAL_ADMIN_CTSC_GROUP_ID` - Group ID for CTSC admin role
- `SSO_INTERNAL_ADMIN_LOCAL_GROUP_ID` - Group ID for local admin role
- `BASE_URL` - Application base URL for redirect URI construction

### Token Validation

- Token signature verification via openid-client (automatic)
- Token expiry validation
- Issuer validation
- Audience validation (client ID)

### User Profile Validation

- Email address present
- User ID present
- Group membership data available for role assignment

## 10. Error Messages

Existing error handling preserved:

| Scenario | Error Handling | User Message |
|----------|---------------|--------------|
| SSO not configured | 503 Service Unavailable | "SSO authentication is not available. Please check configuration." |
| Token exchange fails | Redirect to /login | Session-based error displayed on login page |
| Graph API fails | Redirect to /login with error | "Authentication failed. Please try again." |
| No role assigned | Redirect to /sso-rejected | "You do not have permission to access this service." |
| Database error | Redirect to /login?error=db_error | "A system error occurred. Please try again." |

## 11. Navigation

No navigation changes required. Existing redirect logic preserved:
- System admins → `/system-admin-dashboard`
- CTSC/Local admins → `/admin-dashboard`
- Failed auth → `/login`
- Rejected users → `/sso-rejected`

## 12. Accessibility

No accessibility changes. Backend-only modification maintains existing WCAG 2.2 AA compliance of authentication pages.

## 13. Test Scenarios

### Unit Tests

* Test openid-client Issuer discovery from SSO_ISSUER_URL
* Test authorization URL generation with correct parameters
* Test token exchange with authorization code
* Test ID token verification and claims extraction
* Test user profile construction from token claims
* Test Microsoft Graph API integration for group membership
* Test role determination based on group IDs
* Test passport serialization/deserialization
* Test error handling for missing configuration
* Test error handling for token exchange failures
* Test error handling for Graph API failures

### Integration Tests

* Test complete SSO authentication flow from login to dashboard redirect
* Test session regeneration and user persistence
* Test database user creation/update with SSO provenance
* Test role-based redirects after successful authentication
* Test CFT IDAM continues to work independently
* Test authentication with missing/incomplete SSO configuration
* Test logout and session cleanup

### E2E Tests

* Test SSO login journey for system admin user
* Test SSO login journey for CTSC admin user
* Test SSO login journey for local admin user
* Test SSO rejection for user without required groups
* Test CFT IDAM login journey (existing tests must continue to pass)
* Test authentication across multiple browser tabs/sessions
* Test session timeout and re-authentication

### Manual Testing Checklist

* Verify SSO_ISSUER_URL format matches Azure AD v2.0 endpoint
* Verify all three authentication methods work in dev environment
* Verify all three authentication methods work in staging/production
* Verify error pages display correctly for auth failures
* Verify session cookies are set correctly
* Verify role-based access control works after migration
* Verify existing user sessions are not disrupted

## 14. Assumptions & Open Questions

### Assumptions

* Azure AD configuration (client ID, secret, group IDs) remains unchanged
* SSO_ISSUER_URL will use Azure AD v2.0 endpoint format: `https://login.microsoftonline.com/{tenant}/v2.0`
* The `.well-known/openid-configuration` discovery endpoint is available and properly configured
* Microsoft Graph API access token scopes remain `openid profile email`
* Passport session serialization format can be maintained for backward compatibility
* Existing E2E tests with SSO test accounts will continue to function

### Open Questions

1. **Azure B2C Implementation Status**: Code references B2C_IDAM provenance but no B2C authentication flow exists in `libs/auth/src/pages/`. Should Azure B2C support be implemented as part of this ticket, or is it future work?

2. **SSO_ISSUER_URL Format**: Should `SSO_ISSUER_URL` be the full discovery URL (`https://login.microsoftonline.com/{tenant}/v2.0/.well-known/openid-configuration`) or the base issuer URL (`https://login.microsoftonline.com/{tenant}/v2.0`)? Recommend base issuer URL with openid-client auto-discovery.

3. **Token Refresh Strategy**: The current implementation does not appear to use refresh tokens. Should token refresh be implemented as part of this migration, or continue with session-based authentication without refresh?

4. **Breaking Changes Window**: Is there a maintenance window available for deployment, or must this be a zero-downtime migration? Current approach assumes zero-downtime with backward-compatible session format.

5. **Rollback Strategy**: If issues are discovered in production, what is the rollback plan? Should we maintain the ability to toggle between passport-azure-ad and openid-client via feature flag temporarily?

### Technical Decisions Needed

* **openid-client version**: Use latest stable (v6.x as of 2026) or specific version?
* **Token storage**: Continue with session-only storage or implement token refresh mechanism?
* **Passport integration**: Continue using Passport.js or migrate to pure openid-client without Passport abstraction?
* **Session format**: Maintain exact compatibility with existing serialized sessions or allow session migration (force re-login)?

### Recommendation: Implementation Approach

**Approach 1: Passport Strategy Wrapper (Recommended)**
- Create custom Passport strategy that wraps openid-client
- Maintains existing passport.authenticate() call patterns
- Minimal code changes in route handlers
- Easier testing and rollback
- Preserves existing session format

**Approach 2: Direct openid-client Integration**
- Remove Passport.js dependency for SSO (keep for other auth methods)
- Direct integration with openid-client in route handlers
- More modern approach but requires more code changes
- May require session format migration

**Recommendation**: Use Approach 1 for this migration to minimize risk and preserve backward compatibility. Approach 2 can be considered in a future refactoring ticket if desired.

### Comment by OgechiOkelu on 2026-02-12T13:45:34Z
@plan
