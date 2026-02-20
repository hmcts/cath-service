# #357: Implement Crime IDAM Integration

**State:** OPEN
**Assignees:** (none)
**Author:** junaidiqbalmoj
**Labels:** (none)
**Created:** 2026-02-12T14:41:50Z
**Updated:** 2026-02-20T10:59:39Z

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
## 1. User Story

**As a** crime service user
**I want to** authenticate via Crime IDAM using my existing crime service credentials
**So that** I can securely access crime-related services without creating a separate account

---

## 2. Background

The application currently supports two authentication providers: Azure AD SSO (for internal staff) and CFT IDAM (for civil/family/tribunal users). Crime IDAM is a third OAuth2 provider used by the HMCTS crime jurisdiction. Integrating it follows the same OAuth2 authorisation code flow already established for CFT IDAM.

The Crime IDAM provider exposes three relevant endpoints:
- **`/oauth2/authorise`** — redirects the user to the Crime IDAM login page
- **`/oauth2/token`** — exchanges the authorisation code for an access token
- **`/details`** — retrieves user profile and roles using the access token

The implementation should mirror the existing CFT IDAM integration pattern in `libs/auth/`, adding new config, token client, login page, and callback handler files with `CRIME_IDAM` as the user provenance value.

---

## 3. Acceptance Criteria

* **Scenario:** User signs in successfully via Crime IDAM
    * **Given** a user has a valid Crime IDAM account
    * **When** they click "Sign in with Crime IDAM" on the sign-in page
    * **Then** they are redirected to the Crime IDAM login page, and after authenticating are redirected back to `/crime-login/return`, a session is created, and they land on `/account-home`

* **Scenario:** User with an unauthorised role is rejected
    * **Given** a user authenticates via Crime IDAM but holds a role that is not permitted
    * **When** the callback handler evaluates their roles
    * **Then** they are redirected to `/crime-rejected` with a message explaining they cannot access the service

* **Scenario:** Authorisation code is missing from callback
    * **Given** the Crime IDAM callback is received without an authorisation code (e.g. user cancelled login)
    * **When** the callback handler processes the request
    * **Then** the user is redirected to `/sign-in?error=no_code`

* **Scenario:** Token exchange fails
    * **Given** the authorisation code exchange request to `/oauth2/token` fails (network error, invalid code, etc.)
    * **When** the callback handler handles the error
    * **Then** the user is redirected to `/sign-in?error=auth_failed` and the error is tracked via Application Insights

* **Scenario:** Database error during user creation
    * **Given** the token exchange and user info retrieval succeed but the database write fails
    * **When** the callback handler catches the error
    * **Then** the user is redirected to `/sign-in?error=db_error` and the error is tracked

* **Scenario:** Crime IDAM is not configured in the current environment
    * **Given** `CRIME_IDAM_BASE_URL` or `CRIME_IDAM_CLIENT_SECRET` are not set
    * **When** a user navigates to `/crime-login`
    * **Then** a `503` response is returned indicating the service is unavailable

* **Scenario:** Welsh language preference is preserved through the OAuth redirect
    * **Given** a user is browsing in Welsh (`?lng=cy`)
    * **When** they initiate Crime IDAM login
    * **Then** the language is stored in the session and restored after the callback, redirecting to `/account-home?lng=cy`

---

## 4. User Journey Flow

```
1. User visits /sign-in
2. User selects "Sign in with Crime IDAM"
3. Browser GET /crime-login (optionally with ?lng=cy)
   └── Language stored in session
   └── Redirect to: {CRIME_IDAM_BASE_URL}/oauth2/authorise
                    ?client_id=...
                    &response_type=code
                    &redirect_uri={BASE_URL}/crime-login/return
                    &scope=openid profile roles
                    &ui_locales=en|cy
4. User authenticates on Crime IDAM login page
5. Crime IDAM redirects to: {BASE_URL}/crime-login/return?code=...
6. Application (crime-callback handler):
   a. Extracts authorisation code from query string
   b. POST {CRIME_IDAM_BASE_URL}/oauth2/token → access_token
   c. GET {CRIME_IDAM_BASE_URL}/details (Bearer access_token) → user profile + roles
   d. Validate roles (reject if unauthorised)
   e. createOrUpdateUser in database (provenance: CRIME_IDAM)
   f. req.session.regenerate() → req.login(user) → req.session.save()
7. Redirect to /account-home?lng={preserved language}

Error paths:
- No code → /sign-in?error=no_code
- Token error → /sign-in?error=auth_failed
- Rejected role → /crime-rejected
- DB error → /sign-in?error=db_error
- Session error → /sign-in?error=session_failed
```

---

## 5. Page Specifications

### `/crime-login` — Initiate Crime IDAM Login

| Property | Value |
|----------|-------|
| Controller file | `libs/auth/src/pages/crime-login/index.ts` |
| HTTP method | `GET` |
| Behaviour | Checks `isCrimeIdamConfigured()`, stores language in session, redirects to Crime IDAM authorise endpoint |
| No-JS | Fully server-side redirect — no JavaScript required |
| Config check failure | Returns `503` with plain-text message |

### `/crime-login/return` — Crime IDAM Callback

| Property | Value |
|----------|-------|
| Controller file | `libs/auth/src/pages/crime-callback/index.ts` |
| HTTP method | `GET` |
| Query params | `code` (required), `error` (optional, from Crime IDAM on failure) |
| On success | Creates/updates user record, regenerates session, redirects to `/account-home` |
| On failure | Redirects to `/sign-in` with error query param |

### `/crime-rejected` — Unauthorised Role Page

| Property | Value |
|----------|-------|
| Controller file | `libs/auth/src/pages/crime-rejected/index.ts` |
| Template | `libs/auth/src/pages/crime-rejected/index.njk` |
| HTTP method | `GET` |
| Auth required | No — unauthenticated page |
| Content | Title, rejection message, support contact, link back to `/sign-in` |

---

## 6. URLs

| Route | Description |
|-------|-------------|
| `GET /crime-login` | Initiates Crime IDAM OAuth2 flow; redirects to external Crime IDAM login |
| `GET /crime-login/return` | Callback from Crime IDAM after authentication |
| `GET /crime-rejected` | Displayed when user's Crime IDAM role is not permitted |

---

## 7. Content

### Sign-In Page — new button label

| Key | English | Welsh |
|-----|---------|-------|
| `crimeIdamSignIn` | `Sign in with Crime IDAM` | [WELSH TRANSLATION REQUIRED] |

### Crime Rejected Page English

```typescript
export const en = {
  title: "You cannot access this service",
  message: "Your account type is not authorised to access this service.",
  whatYouCanDo: "What you can do",
  contactSupport: "If you think this is wrong, contact support for assistance.",
  returnToSignIn: "Return to sign in page"
};
```

### Crime Rejected Page — Welsh
All values require Welsh translation.

---

## 8. Assumptions & Open Questions

* **Permitted roles**: The issue does not specify which Crime IDAM roles are permitted. Assumed any non-empty role set is accepted initially.
* **User info endpoint format**: Exact JSON structure of the `/details` response must be confirmed with the Crime IDAM team.
* **Scopes**: `openid profile roles` must be confirmed as granting access to the `/details` endpoint.
* **Database `role` value**: Crime IDAM users will be stored with `role: "VERIFIED"` matching CFT IDAM — confirm if a distinct role is needed.
* **CRIME_IDAM_REDIRECT_URI**: May be derived at runtime as `${BASE_URL}/crime-login/return` following CFT pattern rather than a separate env var.
* **Refresh tokens**: The issue mentions handling refresh tokens — confirm whether in scope for this ticket.
* **Feature flag**: A `ENABLE_CRIME_IDAM` flag should be added following the CFT IDAM pattern.
