# #1242: SSO sign out prompting the user to pick an account

**State:** OPEN
**Assignees:** None
**Author:** OgechiOkelu
**Labels:** Post-Migration
**Created:** 2026-10-23T16:26:26Z
**Updated:** 2026-10-23T16:32:58Z

## Description

**PROBLEM STATEMENT**
Currently when SSO admin users sign out of their account, they are prompted with a dialog box asking them to pick an account even if there is only one signed in account. 


**AS A** Service 
**I WANT** to remove the dialog box that pops up when SSO admin users sign out from a CaTH account 
**SO THAT** SSO Admin users are no longer prompted to to pick an account after signing out


**ACCEPTANCE CRITERIA**

- The dialog box is removed by setting the login hint optional claim as documented in the following document: 
https://learn.microsoft.com/en-us/entra/identity-platform/v2-protocols-oidc#send-a-sign-out-request. (However this would require a demand request to the IDAM team as we do not have the permission to change it.)
- After the fix is deployed, the following should be reconsidered:
After session timeout, we log out the user from CaTH SSO session.
If an IDAM user not assigned to any CaTH security group tries to sign in, we sign them out before presenting them with the SSO rejected login page.

## Comments

### Comment by OgechiOkelu on 2026-10-23T16:26:39Z

@spec 

### Comment by hmctsclaudecode on 2026-10-23T16:31:59Z

# Technical Specification — Issue #1242: SSO sign out prompting the user to pick an account

## 1. User Story
**As a** Service
**I want to** remove the account-picker dialog that Microsoft Entra ID shows when SSO admin users sign out of a CaTH account
**So that** SSO admin users are returned straight to the "You have been signed out" page instead of being asked to pick an account

## 2. Background

### What happens today
`apps/web/src/pages/(auth)/logout/index.ts` handles sign out for all four provenances. For `SSO` users it:

1. Calls `req.logout()` then `req.session.destroy()` and clears the `connect.sid` cookie.
2. Extracts the tenant GUID from `SSO_ISSUER_URL` with a local `extractTenantId()` regex (`/\/([a-f0-9-]+)\/v2\.0(?:\/|$)/`).
3. Redirects to:
   ```
   https://login.microsoftonline.com/{tenantId}/oauth2/v2.0/logout?post_logout_redirect_uri={encoded}
   ```
4. Entra ID receives a sign-out request with **no hint about which account to end**, so it renders its own interstitial account-picker page ("Pick an account") before honouring `post_logout_redirect_uri`. It does this even when exactly one account is signed in to the browser.

The picker is a Microsoft-hosted page. It cannot be styled, translated into Welsh, or accessibility-audited by this service, and it adds a click to every admin sign out.

### The fix
Microsoft's OIDC documentation ([send a sign-out request](https://learn.microsoft.com/en-us/entra/identity-platform/v2-protocols-oidc#send-a-sign-out-request)) specifies the `logout_hint` query parameter:

> `logout_hint` — Enables sign-out to occur without prompting the user to select an account. To use `logout_hint`, enable the `login_hint` optional claim in your client application and use the value of the `login_hint` optional claim as the `logout_hint` parameter. Don't use UPNs or phone numbers as the value of the `logout_hint` parameter.

So there are two halves:

* **Entra configuration (external dependency):** the `login_hint` optional claim must be added to the ID token of the CaTH SSO app registrations. CaTH does not hold permissions on these registrations — this requires a demand request to the IDAM team. App registrations are referenced in `apps/web/helm/values.yaml` (`sso-client-id` / `sso-client-secret`) and `apps/web/helm/values.dev.yaml` (`sso-client-id-dev` / `sso-client-secret-dev`), so both the STG and preview registrations need the claim.
* **Service change (this ticket):** read the `login_hint` claim from the ID token during the OIDC callback, persist it on the session user profile, and append it as `logout_hint` to the Entra sign-out URL.

The service change must be deployable **before** IDAM action completes — with the claim absent the parameter is simply omitted and behaviour is identical to today. This is the safe ordering, because the claim appearing in the ID token is outside our release control.

### Relevant existing code
| File | Relevance |
| --- | --- |
| `apps/web/src/pages/(auth)/logout/index.ts` | Builds the Entra sign-out URL; owns `extractTenantId()` |
| `libs/auth/src/config/passport-config.ts` | `verifyOidcCallback()` maps ID token claims onto `UserProfile` |
| `libs/auth/src/user-profile.ts` | `UserProfile` shape; already has an unused `idToken?: string` field |
| `libs/auth/src/cft-idam/logout-url.ts` | Existing precedent for a lib-owned `build*LogoutUrl()` helper |
| `libs/auth/src/middleware/session-timeout.ts` | Ends the CFT IDAM session on timeout; does **not** end the Entra session |
| `apps/web/src/pages/(auth)/sso/return/index.ts` | Redirects role-less users to `/sso-rejected` without signing them out |

### Related behaviours to revisit after deployment
The issue flags two behaviours for reconsideration once the picker is gone. Both are **out of scope for implementation here** and recorded as decisions in section 14:

* On session timeout, SSO users have their CaTH session destroyed but their Entra session is left intact (`session-timeout.ts` only calls `buildCftIdamLogoutUrl` for `CFT_IDAM`).
* An IDAM user in no CaTH security group reaches `/sso-rejected` with a role-less Passport session still established and their Entra session intact.

## 3. Acceptance Criteria

* **Scenario:** `login_hint` claim is captured at sign in
    * **Given** the `login_hint` optional claim is enabled on the CaTH SSO app registration
    * **When** an SSO admin user completes the OIDC callback at `/sso/return`
    * **Then** the value of the `login_hint` claim is stored as `loginHint` on the session `UserProfile`
    * **And** no other claim mapping (`id`, `email`, `displayName`, `role`, `provenance`) changes

* **Scenario:** SSO admin signs out with a single signed-in account
    * **Given** an SSO admin user is signed in and their session holds a `loginHint`
    * **When** they select "Sign out"
    * **Then** their CaTH session is destroyed and the `connect.sid` cookie is cleared
    * **And** they are redirected to `https://login.microsoftonline.com/{tenantId}/oauth2/v2.0/logout` with both `post_logout_redirect_uri` and `logout_hint` query parameters
    * **And** Entra ID signs them out without displaying the "Pick an account" page
    * **And** they land on `/session-logged-out`

* **Scenario:** SSO admin has more than one Microsoft account signed in to the browser
    * **Given** an SSO admin user is signed in to CaTH and also has a second Microsoft account signed in to the same browser
    * **When** they select "Sign out"
    * **Then** only the account identified by `logout_hint` is signed out
    * **And** no account picker is shown
    * **And** the second account's Entra session is left intact

* **Scenario:** `login_hint` claim is not yet available
    * **Given** the IDAM demand request has not yet been applied, so the ID token carries no `login_hint` claim
    * **When** an SSO admin user selects "Sign out"
    * **Then** the `logout_hint` parameter is omitted from the sign-out URL entirely (not sent empty)
    * **And** sign out completes exactly as it does today, ending on `/session-logged-out`
    * **And** no error is logged or surfaced to the user

* **Scenario:** session predates the change
    * **Given** an SSO admin user holds a session created before this release, so `loginHint` is absent from the serialised Passport user
    * **When** they select "Sign out"
    * **Then** the `logout_hint` parameter is omitted and sign out completes without error

* **Scenario:** Welsh language is preserved through sign out
    * **Given** an SSO admin user is browsing with `lng=cy`
    * **When** they select "Sign out"
    * **Then** the `locale` cookie survives session destruction
    * **And** `/session-logged-out` renders in Welsh after returning from Entra ID

* **Scenario:** non-SSO provenances are unaffected
    * **Given** a signed-in user whose provenance is `CFT_IDAM`, `CRIME_IDAM` or `PI_AAD`
    * **When** they select "Sign out"
    * **Then** their existing sign-out redirect is unchanged and no `logout_hint` parameter is added

* **Scenario:** tenant ID cannot be derived
    * **Given** `SSO_ISSUER_URL` is missing or does not contain a tenant GUID followed by `/v2.0`
    * **When** an SSO admin user selects "Sign out"
    * **Then** the CaTH session is still destroyed
    * **And** the user is redirected to `/session-logged-out` without any Entra round trip

* **Scenario:** the hint value is never logged
    * **Given** any SSO sign-in or sign-out
    * **When** the application writes log output for that request
    * **Then** the `login_hint` / `logout_hint` value does not appear in any log line

## 4. User Journey Flow

### Sign in — where the hint is captured

```
  Admin                 CaTH /login            Entra ID              CaTH /sso/return
    |                        |                     |                        |
    |-- GET /login --------->|                     |                        |
    |                        |-- authorize ------->|                        |
    |                        |                     |-- credentials ---------|
    |                        |                     |                        |
    |                        |      code + id_token (claims now include     |
    |                        |      login_hint once IDAM enables it)        |
    |                        |                     |----------------------->|
    |                        |                     |                        |
    |                        |          verifyOidcCallback() maps claims:   |
    |                        |          id, email, displayName, role,       |
    |                        |          provenance: "SSO", loginHint        |
    |                        |                     |                        |
    |<-------------- 302 /system-admin-dashboard or /admin-dashboard -------|
```

### Sign out — before this change (the defect)

```
  Admin              CaTH /logout            Entra ID            CaTH /session-logged-out
    |                      |                     |                        |
    |-- Sign out --------->|                      |                       |
    |                      | logout(), destroy()  |                       |
    |                      | clearCookie          |                       |
    |                      |--- /oauth2/v2.0/logout?post_logout_redirect_uri=... -->
    |                      |                      |                       |
    |<=== "Pick an account" interstitial =========|                       |   <-- UNWANTED
    |                      |                      |                       |
    |--- clicks account ---------------------->   |                       |
    |                      |                      |---- 302 ------------->|
    |<------------------------------ "You have been signed out" ----------|
```

### Sign out — after this change

```
  Admin              CaTH /logout            Entra ID            CaTH /session-logged-out
    |                      |                     |                        |
    |-- Sign out --------->|                      |                       |
    |                      | read req.user.loginHint BEFORE req.logout()  |
    |                      | logout(), destroy(), clearCookie             |
    |                      |--- /oauth2/v2.0/logout                       |
    |                      |      ?post_logout_redirect_uri=...           |
    |                      |      &logout_hint=<value> ------------------>|
    |                      |                      |                       |
    |                      |        account resolved from hint,           |
    |                      |        no interstitial rendered              |
    |                      |                      |---- 302 ------------->|
    |<------------------------------ "You have been signed out" ----------|
```

### Decision points inside `/logout`

```
                      GET /logout
                           |
              capture provenance + loginHint
                     (before req.logout)
                           |
            req.logout() -> session.destroy() -> clearCookie
                           |
         +-----------------+------------------+------------------+
         |                 |                  |                  |
    CFT_IDAM          CRIME_IDAM            PI_AAD              SSO
         |                 |                  |                  |
  CFT endSession     /session-        B2C /oauth2/v2.0/     tenantId derived
   + redirect        logged-out            logout           from SSO_ISSUER_URL?
   path                                                           |
                                                      +-----------+-----------+
                                                      | yes                   | no
                                                      |                       |
                                            loginHint present?        /session-logged-out
                                              |            |
                                              | yes        | no
                                              |            |
                                    logout URL with   logout URL without
                                     logout_hint        logout_hint
```

## 5. Low Fidelity Wireframe

No CaTH page is added or redesigned. The change removes a Microsoft-hosted screen from the middle of the journey.

### Screen removed (Entra-hosted, not ours to style)

```
+--------------------------------------------------------------+
|  Microsoft                                                   |
|                                                              |
|   Pick an account                                            |
|                                                              |
|   +------------------------------------------------------+   |
|   | (o)  admin.user@justice.gov.uk                       |   |
|   |      Signed in                                       |   |
|   +------------------------------------------------------+   |
|   | (+)  Use another account                             |   |
|   +------------------------------------------------------+   |
|                                                              |
+--------------------------------------------------------------+
         ^ shown even with exactly one signed-in account
```

### Screen the user now reaches directly — `/session-logged-out` (unchanged)

```
+--------------------------------------------------------------+
|  GOV.UK   Court and Tribunal Hearings                        |
+--------------------------------------------------------------+
|                                                              |
|  +--------------------------------------------------------+  |
|  |                                                        |  |
|  |            You have been signed out                    |  |
|  |                                                        |  |
|  +--------------------------------------------------------+  |
|      govukPanel, govuk-panel--confirmation, no back link      |
|                                                              |
+--------------------------------------------------------------+
```

## 6. Page Specifications

No new page, template, route or GOV.UK component. The work is confined to the SSO branch of the existing `/logout` handler plus the OIDC claim mapping in `libs/auth`.

### 6.1 `libs/auth/src/user-profile.ts`
Add one optional field to `UserProfile`:

```typescript
loginHint?: string;
```

Placed with the session-persisted fields (above the "only used during authentication" comment block), because unlike `accessToken` / `groupIds` it **must** survive serialisation — `passport.serializeUser` stores the whole user object, so no serialiser change is needed.

### 6.2 `libs/auth/src/config/passport-config.ts`
In `verifyOidcCallback()`, map the claim onto the profile:

```typescript
const user: UserProfile = {
  id: claims.oid || userProfile.id,
  email: claims.preferred_username || claims.email || userProfile.email,
  displayName: claims.name || userProfile.displayName,
  role: userRole,
  provenance: "SSO",
  loginHint: claims.login_hint
};
```

Rules:
* Read from `claims` only. Do **not** fall back to `claims.preferred_username`, `email`, UPN or phone number — Microsoft explicitly prohibits those values as `logout_hint`, and a rejected hint reintroduces the picker.
* The OIDC `scope` stays `openid profile email`. `login_hint` is an optional claim configured on the app registration, not a scope.

### 6.3 New `libs/auth/src/sso/logout-url.ts`
URL construction is business logic and belongs in a lib, mirroring `libs/auth/src/cft-idam/logout-url.ts`. Move `extractTenantId()` out of the page controller into this module (unexported — it is an implementation detail).

```typescript
export function buildSsoLogoutUrl(postLogoutRedirectUri: string, loginHint: string | undefined, config: SsoConfig): string | null
```

Behaviour:
* Returns `null` when no tenant ID can be extracted from `config.issuerUrl`, so the caller can fall back to a local-only sign out.
* Builds `https://login.microsoftonline.com/{tenantId}/oauth2/v2.0/logout` and sets `post_logout_redirect_uri`.
* Appends `logout_hint` **only** when `loginHint` is a non-empty string.
* Uses `URL` / `URLSearchParams` for construction so encoding is handled once (the current handler hand-rolls `encodeURIComponent`).

Export `buildSsoLogoutUrl` from `libs/auth/src/index.ts`, alongside the existing `buildCftIdamLogoutUrl` export.

### 6.4 `apps/web/src/pages/(auth)/logout/index.ts`
* Capture `const loginHint = req.user?.loginHint;` alongside the existing `const userProvenance = req.user?.provenance;` — **before** `req.logout()`, which clears `req.user`.
* Delete the local `extractTenantId()` and the inline SSO URL string building; call `buildSsoLogoutUrl(getPostLogoutRedirectUri(req), loginHint, getSsoConfig())`.
* Redirect to the returned URL, or to `/session-logged-out` when it is `null`.
* `getPostLogoutRedirectUri()` is unchanged.

### 6.5 Infrastructure / configuration
* No new environment variable, Helm value, Key Vault secret or `config/*.json` entry. `logout_hint` is derived from the ID token at runtime.
* `post_logout_redirect_uri` (`{BASE_URL}/session-logged-out`) must already be registered as a front-channel logout / redirect URI on the app registration — unchanged by this ticket, but worth confirming in the same IDAM demand request.
* **IDAM demand request:** enable the `login_hint` optional claim on the ID token for the CaTH SSO app registrations backing `sso-client-id` (STG) and `sso-client-id-dev` (preview). Per `CLAUDE.md` there is currently no prod deployment, so no prod registration is in scope yet.

## 7. Content

No new or amended copy, in either language. The change removes a screen; it does not add one.

The two existing pages the journey touches keep their current content:

| Page | Key | English | Welsh |
| --- | --- | --- | --- |
| `(auth)/session-logged-out` | `title` | You have been signed out | Rydych wedi allgofnodi |
| `libs/web-core/src/locales` | `navigation.signOut` | Sign out | Allgofnodi |

The locale-key parity test between `session-logged-out/en.ts` and `cy.ts` continues to apply unchanged.

## 8. URL

### Service routes — all unchanged
| Route | Method | Change |
| --- | --- | --- |
| `/logout` | GET | Behaviour change inside the SSO branch only; path, method and auth requirements unchanged |
| `/session-logged-out` | GET | None — remains the post-logout landing page |
| `/sso/return` | GET | Claim mapping only; no routing change |

### Outbound Entra ID sign-out URL

Before:
```
https://login.microsoftonline.com/{tenantId}/oauth2/v2.0/logout
  ?post_logout_redirect_uri=https%3A%2F%2F{host}%2Fsession-logged-out
```

After, when `loginHint` is present:
```
https://login.microsoftonline.com/{tenantId}/oauth2/v2.0/logout
  ?post_logout_redirect_uri=https%3A%2F%2F{host}%2Fsession-logged-out
  &logout_hint=<url-encoded login_hint claim value>
```

After, when `loginHint` is absent — byte-identical to the "before" URL.

`{tenantId}` continues to come from `SSO_ISSUER_URL`; `{host}` from `req.protocol` + `req.get("host")`.

## 9. Validation

There is no user input and therefore no form validation. The rules below govern the `loginHint` value flowing from ID token to query string.

| Rule | Behaviour |
| --- | --- |
| Claim absent from ID token | `loginHint` is `undefined`; `logout_hint` omitted from the URL |
| Claim present but empty string or whitespace-only | Treated as absent; `logout_hint` omitted (never sent as `logout_hint=`) |
| Claim present and non-empty | Sent as `logout_hint`, URL-encoded by `URLSearchParams` |
| Claim is not a string (unexpected token shape) | Treated as absent; `logout_hint` omitted |
| Substitute values | Never derive the hint from `preferred_username`, `email`, UPN or phone number — Microsoft prohibits these and Entra will fall back to showing the picker |
| Provenance | `logout_hint` is only ever added to the Entra `oauth2/v2.0/logout` URL for `provenance === "SSO"`; never added to CFT IDAM, Crime IDAM or B2C URLs |
| Tenant ID | Must match `/\/([a-f0-9-]+)\/v2\.0(?:\/|$)/` against `SSO_ISSUER_URL`; no match means no Entra redirect at all |
| Read ordering | `loginHint` must be read from `req.user` before `req.logout()` executes, otherwise it is always `undefined` |
| Logging | The hint value is PII-adjacent and must not be written to logs, error messages or audit records |

## 10. Error Messages

No user-facing error text is added. Every failure mode degrades silently to a successful sign out, because the user has already been signed out of CaTH locally by the time any of these can occur — showing them an error would be both alarming and useless.

| Failure | Handling | User sees |
| --- | --- | --- |
| `login_hint` claim missing | `logout_hint` omitted | Current behaviour: Entra account picker, then "You have been signed out" |
| Tenant ID not derivable from `SSO_ISSUER_URL` | No Entra redirect | "You have been signed out" (CaTH session already destroyed; Entra session persists) |
| `req.session.destroy()` returns an error | Existing callback behaviour retained; redirect still issued | "You have been signed out" |
| Entra rejects `logout_hint` as malformed | Entra falls back to its own picker | Current behaviour — no CaTH error page |

No existing error copy, `govukErrorSummary` usage or `errors/*` template is touched.

## 11. Navigation

### Entry point
The "Sign out" link in `libs/web-core/src/views/components/service-navigation.njk` (`href="/logout"`). Unchanged.

### Redirect matrix for `GET /logout`
| Provenance | `loginHint` | Tenant ID | Redirect target |
| --- | --- | --- | --- |
| `SSO` | present | derivable | Entra `oauth2/v2.0/logout` with `post_logout_redirect_uri` **and** `logout_hint` → `/session-logged-out` |
| `SSO` | absent | derivable | Entra `oauth2/v2.0/logout` with `post_logout_redirect_uri` only → `/session-logged-out` |
| `SSO` | either | not derivable | `/session-logged-out` directly |
| `CFT_IDAM` | n/a | n/a | `buildCftIdamLogoutUrl("/session-logged-out?lng={locale}")` — unchanged |
| `CRIME_IDAM` | n/a | n/a | `/session-logged-out` — unchanged |
| `PI_AAD` | n/a | n/a | B2C `oauth2/v2.0/logout` with `p` and `post_logout_redirect_uri` — unchanged |
| unauthenticated / no provenance | n/a | derivable | Falls into the SSO branch as today (no `logout_hint`, since `req.user` is undefined) |

### Language on return
`post_logout_redirect_uri` stays `/session-logged-out` with no `lng` parameter for the SSO branch. Welsh is preserved by the `locale` cookie, which `localeMiddleware` reads and which survives sign out because `res.clearCookie` only clears `connect.sid`. Adding `?lng={locale}` for parity with the CFT IDAM branch would mean re-registering the redirect URI with IDAM (Entra matches `post_logout_redirect_uri` exactly), so it is deliberately not done here — see section 14.

### Not changed by this ticket
* `/sso-rejected` is still reached by a direct `res.redirect` from `/sso/return` with the Passport session established.
* Session timeout still redirects SSO users to `/session-expired` without an Entra round trip.

## 12. Accessibility

No new markup, so no new WCAG 2.2 AA surface. The accessibility value here is the removal of a step:

* The Entra account picker is hosted by Microsoft. It is outside this service's control for styling, Welsh language and WCAG auditing, and it cannot be included in the service's accessibility statement with any confidence. Removing it from the journey removes an un-auditable interstitial.
* Sign out drops from two user actions (click "Sign out", click the account tile) to one, which materially helps keyboard-only, screen-reader and switch users, and anyone with a motor impairment.
* Welsh-speaking admins no longer pass through an English-only Microsoft screen mid-journey.
* `/session-logged-out` is unchanged and remains the compliant end state: `govukPanel` with `govuk-panel--confirmation`, page title matching the panel heading, no back link (correct — there is nothing to go back to).
* The existing `index.njk.test.ts` for `session-logged-out` continues to cover the landing page structure; no new axe coverage is required for a redirect-only change, beyond the inline check already present in the SSO E2E journey.

## 13. Test Scenarios

### `libs/auth/src/sso/logout-url.test.ts` (new)
* Builds the Entra sign-out URL with both `post_logout_redirect_uri` and `logout_hint` when a login hint is supplied.
* Omits the `logout_hint` parameter entirely when the login hint is `undefined`.
* Omits the `logout_hint` parameter when the login hint is an empty or whitespace-only string.
* URL-encodes a login hint containing reserved characters, and encodes the post-logout redirect URI.
* Extracts the tenant GUID from a well-formed `SSO_ISSUER_URL` and places it in the path.
* Returns `null` when `SSO_ISSUER_URL` is empty, and when it contains no tenant GUID followed by `/v2.0`.

### `libs/auth/src/config/passport-config.test.ts` (extend)
* Maps the `login_hint` claim from the ID token onto `UserProfile.loginHint` during the OIDC callback.
* Leaves `loginHint` undefined when the claim is absent, without altering any other mapped field.
* Does not substitute `preferred_username`, `email` or any other claim when `login_hint` is missing.

### `apps/web/src/pages/(auth)/logout/index.test.ts` (extend)
* Redirects an SSO user with a session `loginHint` to a URL containing `logout_hint`, after destroying the session and clearing `connect.sid`.
* Redirects an SSO user without a `loginHint` to a URL with no `logout_hint` parameter.
* Reads `loginHint` from `req.user` before `req.logout()` is invoked — asserted by a `req.logout` mock that clears `req.user`, proving the hint still reaches the built URL.
* Redirects to `/session-logged-out` when `buildSsoLogoutUrl` returns `null`.
* Does not add `logout_hint` for `CFT_IDAM`, `CRIME_IDAM` or `PI_AAD` users, and leaves their existing redirect targets intact (regression cover for the existing cases).

### `e2e-tests/tests/sso/sso.spec.ts` (extend the existing sign-out journey)
* Within the existing "session persistence, logout, and concurrent sessions" journey: after signing out as a system admin, assert the browser lands on `/session-logged-out` without passing through a `login.microsoftonline.com` account-picker page, and that returning to `/system-admin-dashboard` requires re-authentication. Include the Welsh check and the inline axe check on the landing page in the same journey rather than as separate tests.

### Manual verification on STG (gated on the IDAM demand request)
* Before the claim is enabled: sign out as each of the three SSO admin roles and confirm behaviour is unchanged from today (picker still shown, no errors, correct landing page).
* After the claim is enabled: decode the ID token on `/sso/return` to confirm `login_hint` is present, then sign out and confirm no picker appears for each of the three roles.
* With two Microsoft accounts signed in to the same browser, confirm only the CaTH account is ended and the second account's Entra session survives.
* Confirm no log line in the web app contains the hint value.

## 14. Assumptions & Open Questions

### Assumptions
* The `login_hint` claim value Entra issues is accepted verbatim as `logout_hint` — no transformation, decoding or re-encoding beyond URL encoding is required.
* Because `passport.serializeUser` persists the entire user object, `loginHint` reaches the Redis-backed session with no serialiser change.
* `post_logout_redirect_uri` (`{BASE_URL}/session-logged-out`) is already registered against both app registrations and keeps working unchanged; adding `logout_hint` does not affect redirect-URI matching.
* All three CaTH SSO admin roles (`SYSTEM_ADMIN`, `INTERNAL_ADMIN_CTSC`, `INTERNAL_ADMIN_LOCAL`) authenticate through the same app registration, so one claim change covers all of them.
* Shipping the service change ahead of the IDAM change is safe and is the intended order — with the claim absent the sign-out URL is byte-identical to today's.

### Open questions and decisions needed
* **IDAM demand request is a hard external dependency and the ticket cannot be fully verified without it.** Who raises it, and what is the expected turnaround? The code change is mergeable and testable in isolation, but the acceptance criterion "no picker is shown" can only be demonstrated once the claim is live on STG.
* **Does the demand request need to cover both registrations?** This spec assumes STG (`sso-client-id`) and preview (`sso-client-id-dev`). Confirm whether the preview registration is managed by IDAM or by the CaTH team.
* **Session timeout for SSO users (flagged in the issue for reconsideration).** Today timeout destroys only the CaTH session, leaving the Entra session live, so the next visit silently re-authenticates. Should SSO users be routed through the Entra sign-out endpoint on timeout as CFT IDAM users already are? That becomes viable without a picker, but it changes the meaning of "signed out due to inactivity" and would sign the user out of other Microsoft-authenticated tools in the same browser. Needs a product decision — raise as a separate ticket.
* **`/sso-rejected` for users in no CaTH security group (flagged in the issue for reconsideration).** Today `/sso/return` redirects role-less users to `/sso-rejected` with a Passport session still established and no Entra sign out. Should they be signed out of both CaTH and Entra before the rejection page is rendered? The same picker problem is what makes this unattractive today. Needs a separate ticket, and note that signing out before rendering means the rejection page must be reachable unauthenticated.
* **Should the SSO branch pass `?lng={locale}` on `post_logout_redirect_uri` for parity with CFT IDAM?** Not needed for correctness (the `locale` cookie carries the language), and it would require re-registering the redirect URI with IDAM because Entra matches it exactly. Recommendation: leave as is.
* **Should the sign-out endpoint come from OIDC discovery instead of being hand-built?** `oidcClient.discovery()` already returns `end_session_endpoint` in `configurePassport`, which would remove the `extractTenantId` regex and the hardcoded `login.microsoftonline.com` host. Deliberately out of scope — it is a wider refactor of how the discovered config is shared between `libs/auth` and the page controller, and it would change the sign-out URL for reasons unrelated to this defect.


### Comment by OgechiOkelu on 2026-10-23T16:32:58Z

@plan 
