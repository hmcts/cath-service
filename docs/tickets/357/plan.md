# Technical Implementation Plan — #357: Crime IDAM Integration

## 1. Technical Approach

Crime IDAM is a third OAuth2 provider following the same authorisation code flow already established for CFT IDAM. The implementation mirrors the CFT IDAM pattern in `libs/auth/src/` with one material difference: Crime IDAM retrieves user info via a separate REST call to `/details` rather than parsing JWT claims from the token response.

All new files live inside the existing `libs/auth/` module. No new module is required. The `apps/web/src/app.ts` registration follows the identical pattern used for the CFT callback handler.

### Key differences from CFT IDAM

| Aspect | CFT IDAM | Crime IDAM |
|--------|----------|-----------|
| User info source | JWT claim parsing (`extractUserInfoFromToken`) | Separate `GET /details` API call |
| Client ID source | Hardcoded `"app-pip-frontend"` | `CRIME_IDAM_CLIENT_ID` env var |
| Base URL env var | `CFT_IDAM_URL` | `CRIME_IDAM_BASE_URL` |
| Authorise endpoint | `{CFT_IDAM_URL}` (root, no path) | `{CRIME_IDAM_BASE_URL}/oauth2/authorise` |
| Token endpoint | `{CFT_IDAM_URL}/o/token` | `{CRIME_IDAM_BASE_URL}/oauth2/token` |
| Role rejection logic | Rejects `citizen`, `citizen-*`, `letter-holder` | Rejects only empty role set |
| Feature flag env var | `ENABLE_CFT_IDAM` | `ENABLE_CRIME_IDAM` |
| User provenance (DB) | `"CFT_IDAM"` | `"CRIME_IDAM"` |

---

## 2. Implementation Details

### 2.1 File Structure

All files are additions inside `libs/auth/src/`. No changes to `libs/auth/package.json`, `libs/auth/tsconfig.json`, or `libs/auth/src/config.ts` are required as the module already exports `pageRoutes` covering the entire `src/pages/` directory.

```
libs/auth/src/
├── config/
│   └── crime-idam-config.ts          NEW
├── crime-idam/
│   └── token-client.ts               NEW
├── pages/
│   ├── crime-login/
│   │   ├── index.ts                  NEW
│   │   └── index.test.ts             NEW
│   ├── crime-callback/
│   │   ├── index.ts                  NEW
│   │   └── index.test.ts             NEW
│   └── crime-rejected/
│       ├── en.ts                     NEW
│       ├── cy.ts                     NEW
│       ├── index.ts                  NEW
│       ├── index.njk                 NEW
│       └── index.test.ts             NEW
├── role-service/
│   └── index.ts                      MODIFY — add isRejectedCrimeRole
└── index.ts                          MODIFY — add new exports

libs/public-pages/src/pages/sign-in/
├── en.ts                             MODIFY — add crimeIdamLabel
├── cy.ts                             MODIFY — add crimeIdamLabel (Welsh)
├── index.ts                          MODIFY — add "crime-idam" case to POST switch
├── index.njk                         MODIFY — add radio option for Crime IDAM
└── index.test.ts                     MODIFY — add test cases for crime-idam routing

apps/web/src/app.ts                   MODIFY — register crimeCallbackHandler
e2e-tests/tests/cft-idam/
└── crime-idam.spec.ts                NEW
```

### 2.2 `libs/auth/src/config/crime-idam-config.ts`

Mirrors `cft-idam-config.ts` with Crime IDAM-specific env vars. The `redirectUri` is derived at runtime from `BASE_URL` following the CFT pattern — `CRIME_IDAM_REDIRECT_URI` is not a separate env var.

```typescript
export interface CrimeIdamConfig {
  crimeIdamBaseUrl: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scope: string;
  authorizationEndpoint: string;
  tokenEndpoint: string;
  userInfoEndpoint: string;
}

export function getCrimeIdamConfig(): CrimeIdamConfig { ... }
export function isCrimeIdamConfigured(): boolean { ... }
```

Config values read via the same `getConfigValue()` helper pattern (env var first, `config` library fallback):

| Field | Source |
|-------|--------|
| `crimeIdamBaseUrl` | `CRIME_IDAM_BASE_URL` |
| `clientId` | `CRIME_IDAM_CLIENT_ID` |
| `clientSecret` | `CRIME_IDAM_CLIENT_SECRET` |
| `scope` | `CRIME_IDAM_SCOPE` (default: `"openid profile roles"`) |
| `redirectUri` | Derived: `${BASE_URL}/crime-login/return` |
| `authorizationEndpoint` | `${crimeIdamBaseUrl}/oauth2/authorise` |
| `tokenEndpoint` | `${crimeIdamBaseUrl}/oauth2/token` |
| `userInfoEndpoint` | `${crimeIdamBaseUrl}/details` |

`isCrimeIdamConfigured()` returns `false` in development unless `ENABLE_CRIME_IDAM` is set. Returns `false` if `crimeIdamBaseUrl` or `clientSecret` are empty.

### 2.3 `libs/auth/src/crime-idam/token-client.ts`

Two exported functions, replacing JWT parsing with an API call:

**`exchangeCodeForToken(code, config)`** — identical POST pattern to CFT equivalent. Returns `{ access_token, token_type, expires_in }`.

**`fetchUserInfoFromApi(accessToken, config)`** — new function with no CFT equivalent:
```
GET {config.userInfoEndpoint}
Authorization: Bearer {accessToken}
```
Returns a `CrimeIdamUserInfo` object. Throws on non-2xx response.

The exact shape of the `/details` response is an open question (see section 5). The implementation should map known fields and guard against missing values, e.g.:

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

Field mapping from `/details` response (to be confirmed — see open questions):

| `CrimeIdamUserInfo` field | Expected `/details` JSON key |
|---------------------------|------------------------------|
| `id` | `uid` or `id` |
| `email` | `email` or `sub` |
| `displayName` | `name` |
| `firstName` | `forename` or `given_name` |
| `surname` | `surname` or `family_name` |
| `roles` | `roles` (array of strings) |

### 2.4 `libs/auth/src/pages/crime-login/index.ts`

Direct mirror of `cft-login/index.ts`:

- Calls `isCrimeIdamConfigured()`, returns 503 if false
- Reads locale from `req.query.lng` or `res.locals.locale`, defaults to `"en"`
- Stores `locale` in `req.session.lng`
- Builds `URLSearchParams` with `client_id`, `response_type: "code"`, `redirect_uri`, `scope`, `ui_locales`
- Redirects to `config.authorizationEndpoint?{params}`

Note: `scope` is included in the authorise redirect for Crime IDAM (not present in CFT login).

### 2.5 `libs/auth/src/pages/crime-callback/index.ts`

Mirrors `cft-callback/index.ts` with `fetchUserInfoFromApi` replacing the JWT extraction step:

```
GET handler:
1. Read code from req.query.code; if missing → redirect /sign-in?error=no_code&lng=...
2. exchangeCodeForToken(code, config) → tokenResponse
3. fetchUserInfoFromApi(tokenResponse.access_token, config) → userInfo
4. isRejectedCrimeRole(userInfo.roles) → if true, redirect /crime-rejected?lng=...
5. createOrUpdateUser({ ..., userProvenance: "CRIME_IDAM", role: "VERIFIED" })
   → on DB error: trackException + redirect /sign-in?error=db_error&lng=...
6. session.regenerate → req.login(user) → session.save → delete session.lng
7. redirect /account-home?lng=...

Catch block: trackException + redirect /sign-in?error=auth_failed&lng=...
```

The `UserProfile` object passed to `req.login`:
```typescript
{
  id: dbUser.userId,
  email: userInfo.email,
  displayName: userInfo.displayName,
  role: "VERIFIED",
  provenance: "CRIME_IDAM"
}
```

### 2.6 `libs/auth/src/pages/crime-rejected/`

Four files mirroring `cft-rejected/`:

**`en.ts`** — from spec:
```typescript
export const en = {
  title: "You cannot access this service",
  message: "Your account type is not authorised to access this service.",
  whatYouCanDo: "What you can do",
  contactSupport: "If you think this is wrong, contact support for assistance.",
  returnToSignIn: "Return to sign in page"
};
```

**`cy.ts`** — placeholder Welsh translations following `cft-rejected/cy.ts` pattern:
```typescript
export const cy = {
  title: "Ni allwch gael mynediad at y gwasanaeth hwn",
  message: "Nid yw eich math o gyfrif wedi'i awdurdodi i gael mynediad at y gwasanaeth hwn.",
  whatYouCanDo: "Beth y gallwch ei wneud",
  contactSupport: "Os ydych chi'n meddwl bod hyn yn anghywir, cysylltwch â chymorth am gymorth.",
  returnToSignIn: "Yn ôl i'r dudalen fewngofnodi"
};
```
These are placeholders pending a professional Welsh translation.

**`index.ts`** — identical structure to `cft-rejected/index.ts`, renders `"crime-rejected/index"` template.

**`index.njk`** — identical structure to `cft-rejected/index.njk`. Uses `{{ title }}`, `{{ message }}`, `{{ whatYouCanDo }}`, `{{ contactSupport }}`, `{{ returnToSignIn }}` variables. The sign-in link points to `/sign-in`.

### 2.7 `libs/auth/src/role-service/index.ts` — add `isRejectedCrimeRole`

Append to the existing file:

```typescript
/**
 * Checks if the user's Crime IDAM roles permit access.
 * Rejects only when the roles array is empty — any non-empty role set is accepted.
 * @param roles - Array of role strings from the Crime IDAM /details endpoint
 * @returns true if the user should be rejected (empty roles), false otherwise
 */
export function isRejectedCrimeRole(roles: string[]): boolean {
  return !roles || roles.length === 0;
}
```

### 2.8 `libs/auth/src/index.ts` — add new exports

```typescript
export { getCrimeIdamConfig, isCrimeIdamConfigured } from "./config/crime-idam-config.js";
export { GET as crimeCallbackHandler } from "./pages/crime-callback/index.js";
export { isRejectedCrimeRole } from "./role-service/index.js";
```

### 2.9 Sign-in page changes (`libs/public-pages/src/pages/sign-in/`)

**`en.ts`** — add `crimeIdamLabel: "Sign in with Crime IDAM"`.

**`cy.ts`** — add `crimeIdamLabel: "Mewngofnodwch gyda IDAM Troseddol"` (placeholder — professional translation required).

**`index.njk`** — add a fourth radio item to the existing `govukRadios` call:
```njk
{
  value: "crime-idam",
  text: crimeIdamLabel,
  checked: data.accountType == "crime-idam" if data else false
}
```

**`index.ts`** — add `case "crime-idam"` to the POST switch statement:
```typescript
case "crime-idam":
  return res.redirect(`/crime-login?lng=${locale}`);
```

### 2.10 `apps/web/src/app.ts` — register callback handler

Import and register the Crime IDAM callback handler, immediately after the CFT callback registration:

```typescript
import { cftCallbackHandler, crimeCallbackHandler, ... } from "@hmcts/auth";

// Manual route registration for Crime IDAM callback
app.get("/crime-login/return", crimeCallbackHandler);
```

The `configureHelmet` call may also need `CRIME_IDAM_BASE_URL` added to its CSP `connect-src` or `form-action` directives if the Crime IDAM origin differs from CFT. This depends on the helmet configuration — check `configureHelmet` in `@hmcts/web-core`.

---

## 3. Error Handling and Edge Cases

### OAuth flow errors

| Condition | Handler behaviour |
|-----------|------------------|
| Missing `code` query param | `redirect /sign-in?error=no_code&lng={lng}` |
| Token exchange non-2xx | `throw` caught by outer try/catch → `redirect /sign-in?error=auth_failed&lng={lng}` + `trackException` |
| `/details` API non-2xx | Same as token exchange failure |
| Empty roles from `/details` | `isRejectedCrimeRole` returns true → `redirect /crime-rejected?lng={lng}` |
| DB write failure | Inner try/catch → `redirect /sign-in?error=db_error&lng={lng}` + `trackException` |
| Session regeneration failure | Callback receives error → `redirect /sign-in?error=session_failed&lng={lng}` |
| `req.login` failure | Callback receives error → `redirect /sign-in?error=login_failed&lng={lng}` |
| Session save failure | Callback receives error → `redirect /sign-in?error=session_save_failed&lng={lng}` |

### Configuration guard

`isCrimeIdamConfigured()` short-circuits the login flow with a 503 before any OAuth redirect occurs, matching the CFT pattern exactly.

### Language preservation

`req.session.lng` is set in the crime-login handler before the external redirect. It is read in the crime-callback handler and passed through all error redirects. It is deleted from the session after the successful redirect to `/account-home`.

---

## 4. Acceptance Criteria Mapping

| Acceptance criterion | Implementation |
|---------------------|---------------|
| User signs in successfully — lands on `/account-home` | `crime-callback/index.ts`: session + `req.login` → `redirect /account-home?lng=...` |
| Unauthorised role → `/crime-rejected` | `isRejectedCrimeRole` in `role-service/index.ts`; redirect in callback |
| Missing code → `/sign-in?error=no_code` | Early guard in `crime-callback/index.ts` |
| Token failure → `/sign-in?error=auth_failed` | Outer catch + `trackException` in callback |
| DB error → `/sign-in?error=db_error` | Inner try/catch + `trackException` in callback |
| Not configured → 503 on `/crime-login` | `isCrimeIdamConfigured()` guard in `crime-login/index.ts` |
| Welsh language preserved through redirect | `req.session.lng` in login handler; read in callback |

---

## 5. Open Questions — CLARIFICATIONS NEEDED

**Q1. `/details` endpoint JSON shape**
The exact field names returned by `GET {CRIME_IDAM_BASE_URL}/details` are not specified. The implementation assumes `uid`/`id`, `email`, `name`, `forename`/`given_name`, `surname`/`family_name`, and `roles` based on the CFT IDAM JWT claim naming. The Crime IDAM team must confirm the actual response schema before the token client can be finalised.

**Q2. `CRIME_IDAM_REDIRECT_URI` as a separate env var**
The ticket spec lists `CRIME_IDAM_REDIRECT_URI` as a separate environment variable. The plan derives `redirectUri` at runtime as `${BASE_URL}/crime-login/return`, matching the CFT pattern and avoiding config duplication. Confirm with the team whether a separately configurable redirect URI is required.

**Q3. Welsh translations**
The spec marks the Crime IDAM sign-in button label and all crime-rejected page strings as `[WELSH TRANSLATION REQUIRED]`. Placeholder translations based on the CFT rejected page Welsh content are used. These must be replaced by a professional translator before the feature goes live.

**Q4. Permitted roles — empty role set vs specific role names**
The plan accepts any non-empty role set (i.e., `isRejectedCrimeRole` returns true only if roles is empty or absent). If specific Crime IDAM role names that should be rejected are later identified (analogous to `citizen` / `letter-holder` in CFT), the rejection logic must be updated. Confirm with the Crime IDAM team.

**Q5. Scope grants access to `/details`**
The plan uses `CRIME_IDAM_SCOPE` defaulting to `"openid profile roles"`. Confirm that this scope is sufficient for the `/details` endpoint to return the user's role claims.

**Q6. Refresh tokens**
The ticket description mentions handling refresh tokens. This is not in scope for this implementation — the current approach exchanges the authorisation code once and does not store or refresh tokens. Confirm whether refresh token handling is in scope.

**Q7. Helmet CSP — Crime IDAM origin**
`configureHelmet` in `apps/web/src/app.ts` currently receives `cftIdamUrl` for CSP configuration. If the Crime IDAM base URL is on a different origin, `CRIME_IDAM_BASE_URL` may need to be added to the helmet configuration to allow the browser redirect to proceed without a CSP violation.

**Q8. Database `role` field for Crime IDAM users**
The plan stores Crime IDAM users with `role: "VERIFIED"` matching CFT IDAM. Confirm whether a distinct role value is required for Crime IDAM users (e.g., for downstream access control differentiation).
