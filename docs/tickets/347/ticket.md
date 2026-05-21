# #347: Replace passport-azure-ad with openid-client

**State:** OPEN
**Assignees:** KianKwa
**Author:** junaidiqbalmoj
**Labels:** priority:3-medium, type:story
**Created:** 2026-02-11
**Updated:** 2026-05-21

## Description

CaTH AI is currently using library passport-azure-ad which will be deprecated soon. Instead of using passport-azure-ad, we need to use openid-client in our application.

SSO_ISSUER_URL will be used from keyvault and Github secrets which has been added already.

Once both https://github.com/hmcts/cath-service/issues/229 and https://github.com/hmcts/cath-service/issues/357 merged, we need to make sure that both Azure B2C and Crime IDAM is using openid-client.

**Acceptance criteria**

- SSO logins are working and users are able to login successfully.
- CFT login is working and users are able to login successfully.
- Azure B2C is working and users are able to login successfully.
- Crime IDAM user is working and able to login successfully.

## Comments

### Comment by OgechiOkelu on 2026-02-12
@SPEC new-feature.md

### Comment by hmctsclaudecode on 2026-02-12
## 1. User Story
**As a** HMCTS CaTH service maintainer
**I want to** replace the deprecated passport-azure-ad library with openid-client
**So that** the authentication system remains supported and secure with modern OIDC standards

## 2. Background

The passport-azure-ad library is being deprecated and needs to be replaced. The service currently uses passport-azure-ad for SSO authentication with Azure AD (for internal staff access). The replacement library, openid-client, is a modern, standards-compliant OpenID Connect client that provides better maintainability and broader OIDC provider support.

### Current Authentication Flows

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

## 3. Acceptance Criteria

* **Scenario 1:** SSO login with Azure AD works end-to-end
* **Scenario 2:** CFT IDAM login continues to work
* **Scenario 3:** Azure B2C login support (from issue #229)
* **Scenario 4:** Token refresh and session management
* **Scenario 5:** Error handling for all failure scenarios

## 9. Validation

Required environment variables:
- `SSO_ISSUER_URL` - Azure AD issuer URL (replaces SSO_IDENTITY_METADATA)
- `SSO_CLIENT_ID` - Azure AD application client ID
- `SSO_CLIENT_SECRET` - Azure AD application client secret
- `SSO_SYSTEM_ADMIN_GROUP_ID` - Group ID for system admin role
- `SSO_INTERNAL_ADMIN_CTSC_GROUP_ID` - Group ID for CTSC admin role
- `SSO_INTERNAL_ADMIN_LOCAL_GROUP_ID` - Group ID for local admin role
- `BASE_URL` - Application base URL for redirect URI construction

### Comment by OgechiOkelu on 2026-02-12
@plan

### Comment by hmctsclaudecode on 2026-02-12
Technical Plan Created - previous plan with clarifications needed.

### Comment by ChrisS1512 on 2026-02-18
Clarifications provided:
1. Update this branch to base off of issue #229 instead of master. Ticket 229 has the B2C functionality in it. That should resolve the Azure B2C issue.
2. Go with the recommendation (Approach 1: Passport Strategy Wrapper around openid-client)
3. Keep session only approach (no token refresh)
4. Maintenance window available (force re-login is acceptable)
5. No feature flag needed

### Comment by melvchance on 2026-03-11
Testing results:
- CTSC Admin user can login: **Pass**
- Local Admin user can login: **Pass**
- System Admin user can login: **Pass**
- CFT User can login: **Pass**
- Azure B2C user can login: **Not implemented** (to be implemented after/with the B2C sign in ticket)
- Users with no roles redirected to /sso-rejected: **Pass**
- Error messages display as expected: **Pass**

Testing has passed, ready for sign off.
