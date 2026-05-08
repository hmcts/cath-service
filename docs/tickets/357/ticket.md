# #357: Implement Crime IDAM Integration

**State:** OPEN
**Assignees:** alexbottenberg
**Author:** junaidiqbalmoj
**Labels:**
**Created:** 2026-02-12T14:41:50Z
**Updated:** 2026-03-10T11:48:49Z

## Description

I want to integrate Crime IDAM into the application so that users can authenticate securely and access crime-related services.

**Description:**
The application needs to integrate with Crime IDAM to enable secure authentication and authorisation for users accessing crime-related services. This integration will involve setting up environment variables, configuring endpoints, and ensuring proper handling of tokens and user roles.

The following environment variables must be added to the .env file:

- CRIME_IDAM_CLIENT_ID: The client ID for the Crime IDAM application.
- CRIME_IDAM_CLIENT_SECRET: The client secret for the Crime IDAM application.
- CRIME_IDAM_BASE_URL: The base URL for the Crime IDAM service (e.g., https://idam.crime.hmcts.net).
- CRIME_IDAM_REDIRECT_URI: The redirect URI configured in Crime IDAM for the application.
- CRIME_IDAM_SCOPE: The scope of access required (e.g., openid profile roles).

The application must use the Crime IDAM OAuth2 endpoints for:

- Authorisation (/oauth2/authorise).
- Token exchange (/oauth2/token).
- User info retrieval (/details).
- Ensure proper handling of access tokens and refresh tokens.

**Authentication Flow:**

- Users must be redirected to the Crime IDAM login page for authentication.
- Upon successful login, the application must handle the callback and exchange the authorisation code for an access token.
- The access token must be used to retrieve user details and roles

**Error Handling**

- Handle errors gracefully, such as invalid tokens, expired sessions, or unauthorised access.
- Display appropriate error messages to the user.

## Comments

### Comment by OgechiOkelu on 2026-02-20T10:54:32Z
@SPEC new-feature.md

### Comment by hmctsclaudecode on 2026-02-20T10:58:40Z
[Full detailed specification including user story, acceptance criteria, wireframes, page specifications, content, validation, error messages, navigation, accessibility, test scenarios, and implementation notes - see full comment in GitHub for complete details]

Key points from specification:
- Add Crime IDAM as third OAuth2 provider alongside Azure AD SSO and CFT IDAM
- Mirror existing CFT IDAM integration pattern
- New routes: `/crime-login`, `/crime-login/return`, `/crime-rejected`
- Environment variables: CRIME_IDAM_CLIENT_ID, CRIME_IDAM_CLIENT_SECRET, CRIME_IDAM_BASE_URL, CRIME_IDAM_SCOPE
- OAuth2 flow: authorise → token exchange → user info retrieval → session creation
- User provenance: "CRIME_IDAM"
- Role validation with rejection page for unauthorised roles
- Welsh language support throughout
- Error handling for all failure scenarios

### Comment by OgechiOkelu on 2026-02-20T10:59:39Z
@plan

### Comment by hmctsclaudecode on 2026-02-20T11:08:06Z
Technical plan created with clarifying questions about:
- /details endpoint response shape
- CRIME_IDAM_REDIRECT_URI configuration
- Welsh translations
- Permitted/rejected roles
- Scope requirements
- Refresh token handling
- CSP configuration
- Database role value
