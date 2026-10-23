# Technical Plan — #1242: SSO sign out prompting the user to pick an account

Ticket format: **full** (the issue carries a complete technical specification in
[comment #6369731421](https://github.com/hmcts/cath-service/issues/1242#issuecomment-6369731421) —
wireframe, accessibility and test scenarios are taken from it as written, not reconstructed).

## 1. Technical Approach

### The defect

`apps/web/src/pages/(auth)/logout/index.ts:63` builds the Entra ID sign-out URL with only
`post_logout_redirect_uri`:

```
https://login.microsoftonline.com/{tenantId}/oauth2/v2.0/logout?post_logout_redirect_uri={encoded}
```

With no hint about which account to end, Entra renders its own "Pick an account" interstitial before
honouring the redirect — even when exactly one account is signed in to the browser. That page is
Microsoft-hosted, so it cannot be styled, translated into Welsh, or accessibility-audited by this
service.

### The fix — two halves

Per [Microsoft's OIDC sign-out documentation](https://learn.microsoft.com/en-us/entra/identity-platform/v2-protocols-oidc#send-a-sign-out-request),
the `logout_hint` query parameter suppresses the picker. Its value must be the `login_hint` optional
claim from the ID token — Microsoft explicitly prohibits UPNs and phone numbers.

| Half | Owner | Scope here |
| --- | --- | --- |
| Enable the `login_hint` optional claim on the ID token of the CaTH SSO app registrations | IDAM team (demand request — CaTH holds no permissions on these registrations) | **External dependency.** Tracked, not implemented |
| Read `login_hint` from the ID token at callback, persist it on the session profile, append it as `logout_hint` on sign out | This ticket | **In scope** |

### Key architectural decisions

1. **Ship the service change before the IDAM change.** With the claim absent, `logout_hint` is
   omitted and the sign-out URL is byte-identical to today's. The claim appearing in the ID token is
   outside our release control, so this ordering is the only safe one. It also means the code is
   mergeable and unit-testable in isolation, while the acceptance criterion "no picker is shown" can
   only be demonstrated once the claim is live on STG.

2. **URL construction moves into `libs/auth`.** It is business logic and currently sits in a page
   controller, which violates CLAUDE.md pitfall #1. `libs/auth/src/cft-idam/logout-url.ts` is the
   existing precedent for a lib-owned `build*LogoutUrl()` helper. The local `extractTenantId()`
   moves with it and stays unexported — it is an implementation detail.

3. **Read the hint before `req.logout()`.** `req.logout()` clears `req.user`, so `loginHint` must be
   captured alongside the existing `const userProvenance = req.user?.provenance` at the top of the
   handler. Getting this wrong makes the hint silently `undefined` on every sign out — the failure is
   invisible without a test that proves the ordering.

4. **No serialiser change needed.** `passport.serializeUser` stores the whole user object
   (`libs/auth/src/config/passport-config.ts:86`), so `loginHint` reaches the session store for free.

5. **No new configuration.** No environment variable, Helm value, Key Vault secret or `config/*.json`
   entry. The hint is derived from the ID token at runtime.

6. **Deliberately out of scope:** replacing the hand-built URL with `end_session_endpoint` from OIDC
   discovery. `oidcClient.discovery()` already returns it in `configurePassport`, which would remove
   the `extractTenantId` regex and the hardcoded `login.microsoftonline.com` host — but it is a wider
   refactor of how discovered config is shared between `libs/auth` and the page controller, and it
   would change the sign-out URL for reasons unrelated to this defect.

## 2. Implementation Details

**TEMPLATE SOURCE: `n/a`** — no new page, template, route or GOV.UK component. The change is confined
to the SSO branch of the existing `/logout` handler plus the OIDC claim mapping in `libs/auth`.

### Files to change

| File | Change |
| --- | --- |
| `libs/auth/src/user-profile.ts` | Add `loginHint?: string` to `UserProfile` |
| `libs/auth/src/config/sso-config.ts` | Export the existing `SsoConfig` interface (currently module-private) |
| `libs/auth/src/sso/logout-url.ts` | **New** — `buildSsoLogoutUrl()` plus the relocated `extractTenantId()` |
| `libs/auth/src/sso/logout-url.test.ts` | **New** |
| `libs/auth/src/index.ts` | Export `buildSsoLogoutUrl` alongside `buildCftIdamLogoutUrl` |
| `libs/auth/src/config/passport-config.ts` | Map `claims.login_hint` → `loginHint` in `verifyOidcCallback()` |
| `libs/auth/src/config/passport-config.test.ts` | Extend |
| `apps/web/src/pages/(auth)/logout/index.ts` | Capture `loginHint`; delete local `extractTenantId()` and inline URL building; call `buildSsoLogoutUrl()` |
| `apps/web/src/pages/(auth)/logout/index.test.ts` | Extend |
| `e2e-tests/tests/sso/sso.spec.ts` | Extend the existing sign-out journey |

### 2.1 `libs/auth/src/user-profile.ts`

Add one optional field, placed **above** the `// The following fields are only used during
authentication and not stored in session:` comment block — unlike `accessToken` / `groupIds`,
`loginHint` must survive serialisation:

```typescript
export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  role?: string;
  provenance?: string;
  idToken?: string;
  loginHint?: string;
  // The following fields are only used during authentication and not stored in session:
  ...
}
```

### 2.2 `libs/auth/src/config/passport-config.ts`

In `verifyOidcCallback()` (line 16), add the mapping:

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

* Read from `claims` **only**. Do not fall back to `claims.preferred_username`, `claims.email`, UPN
  or phone number — Microsoft prohibits those values, and a rejected hint reintroduces the picker.
* The OIDC `scope` stays `"openid profile email"` (line 80). `login_hint` is an optional claim
  configured on the app registration, not a scope.
* No other mapped field changes.

### 2.3 `libs/auth/src/config/sso-config.ts`

`SsoConfig` is currently declared without `export`. Add the keyword so the new helper can type its
config parameter, mirroring how `buildCftIdamLogoutUrl` takes a `CftIdamConfig`. Export the type from
`libs/auth/src/index.ts` only if the app needs to name it — the controller does not, it just passes
`getSsoConfig()` through.

### 2.4 New `libs/auth/src/sso/logout-url.ts`

```typescript
export function buildSsoLogoutUrl(
  postLogoutRedirectUri: string,
  loginHint: string | undefined,
  config: SsoConfig
): string | null
```

Behaviour:

* Returns `null` when no tenant ID can be extracted from `config.issuerUrl`, so the caller falls back
  to a local-only sign out.
* Builds `https://login.microsoftonline.com/{tenantId}/oauth2/v2.0/logout` and sets
  `post_logout_redirect_uri`.
* Appends `logout_hint` **only** when `loginHint` is a non-empty, non-whitespace string.
* Uses `URL` / `URLSearchParams` so encoding is handled once — the current handler hand-rolls
  `encodeURIComponent`.
* `extractTenantId()` moves here verbatim (regex `/\/([a-f0-9-]+)\/v2\.0(?:\/|$)/`) and is **not**
  exported (CLAUDE.md pitfall #13).

### 2.5 `apps/web/src/pages/(auth)/logout/index.ts`

```typescript
export const GET = async (req: Request, res: Response) => {
  const userProvenance = req.user?.provenance;
  const loginHint = req.user?.loginHint;          // MUST be read before req.logout()
  const locale = res.locals.locale === "cy" ? "cy" : "en";

  req.logout(() => {
    req.session.destroy(() => {
      res.clearCookie("connect.sid");

      // ... CFT_IDAM / CRIME_IDAM / PI_AAD branches unchanged ...

      const logoutUrl = buildSsoLogoutUrl(getPostLogoutRedirectUri(req), loginHint, getSsoConfig());
      return res.redirect(logoutUrl ?? "/session-logged-out");
    });
  });
};
```

* Delete the local `extractTenantId()` and the inline SSO URL string building.
* `getPostLogoutRedirectUri()` is unchanged.
* Update the JSDoc block only if its wording becomes inaccurate.

### 2.6 Outbound URL — before and after

Before, and after when `loginHint` is absent (byte-identical):

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

`{tenantId}` continues to come from `SSO_ISSUER_URL`; `{host}` from `req.protocol` + `req.get("host")`.

### 2.7 API endpoints and database

None. No route, method or auth requirement changes; no schema change.

### 2.8 Infrastructure / IDAM demand request

* **Demand request to IDAM:** enable the `login_hint` optional claim on the **ID token** for the CaTH
  SSO app registrations backing `sso-client-id` (`apps/web/helm/values.yaml:68`, STG) and
  `sso-client-id-dev` (`apps/web/helm/values.dev.yaml:25`, preview). Per CLAUDE.md there is currently
  no prod deployment, so no prod registration is in scope.
* Confirm in the same request that `{BASE_URL}/session-logged-out` is registered as a post-logout
  redirect URI. Unchanged by this ticket, but worth verifying while the registration is open.

### 2.9 Content, navigation and accessibility

* **Content:** no new or amended copy in either language. `(auth)/session-logged-out`
  (`title` → "You have been signed out" / "Rydych wedi allgofnodi") and `navigation.signOut`
  ("Sign out" / "Allgofnodi") are untouched, and the existing locale-key parity test still applies.
* **Welsh on return:** `post_logout_redirect_uri` stays `/session-logged-out` with no `lng` parameter
  for the SSO branch. Welsh is preserved by the `locale` cookie, which survives sign out because
  `res.clearCookie` only clears `connect.sid`. Adding `?lng={locale}` for parity with the CFT IDAM
  branch would mean re-registering the redirect URI with IDAM (Entra matches it exactly) — see
  section 6.
* **Accessibility:** no new markup, so no new WCAG 2.2 AA surface. The gain is removal of a step —
  sign out drops from two user actions (click "Sign out", click the account tile) to one, which
  materially helps keyboard-only, screen-reader, switch and motor-impaired users, and Welsh-speaking
  admins no longer pass through an English-only Microsoft screen mid-journey. `/session-logged-out`
  remains the compliant end state (`govukPanel` with `govuk-panel--confirmation`, page title matching
  the panel heading, correctly no back link).

## 3. Error Handling & Edge Cases

### Hint value rules

| Condition | Behaviour |
| --- | --- |
| Claim absent from ID token | `loginHint` is `undefined`; `logout_hint` omitted |
| Claim present but empty or whitespace-only | Treated as absent; omitted — never sent as `logout_hint=` |
| Claim present and non-empty | Sent as `logout_hint`, URL-encoded by `URLSearchParams` |
| Claim is not a string (unexpected token shape) | Treated as absent; omitted |
| Session predates this release | `loginHint` absent from the serialised Passport user; omitted, no error |
| Substitute values | Never derive the hint from `preferred_username`, `email`, UPN or phone number — Entra rejects these and falls back to the picker |
| Provenance | `logout_hint` is only ever added to the Entra `oauth2/v2.0/logout` URL for `provenance === "SSO"`; never to CFT IDAM, Crime IDAM or B2C URLs |
| Tenant ID | Must match `/\/([a-f0-9-]+)\/v2\.0(?:\/|$)/` against `SSO_ISSUER_URL`; no match means no Entra redirect at all |
| Read ordering | `loginHint` must be read from `req.user` before `req.logout()` runs, or it is always `undefined` |
| Logging | The hint value is PII-adjacent and must not reach logs, error messages or audit records |

### Failure modes — all degrade silently to a successful sign out

No user-facing error text is added. By the time any of these can occur the user has already been
signed out of CaTH locally, so an error page would be both alarming and useless.

| Failure | Handling | User sees |
| --- | --- | --- |
| `login_hint` claim missing | `logout_hint` omitted | Today's behaviour: Entra picker, then "You have been signed out" |
| Tenant ID not derivable | No Entra redirect | "You have been signed out" (CaTH session destroyed; Entra session persists) |
| `req.session.destroy()` errors | Existing callback behaviour retained; redirect still issued | "You have been signed out" |
| Entra rejects `logout_hint` as malformed | Entra falls back to its own picker | Today's behaviour — no CaTH error page |

No existing error copy, `govukErrorSummary` usage or `errors/*` template is touched.

### Redirect matrix for `GET /logout`

| Provenance | `loginHint` | Tenant ID | Redirect target |
| --- | --- | --- | --- |
| `SSO` | present | derivable | Entra logout with `post_logout_redirect_uri` **and** `logout_hint` → `/session-logged-out` |
| `SSO` | absent | derivable | Entra logout with `post_logout_redirect_uri` only → `/session-logged-out` |
| `SSO` | either | not derivable | `/session-logged-out` directly |
| `CFT_IDAM` | n/a | n/a | `buildCftIdamLogoutUrl("/session-logged-out?lng={locale}")` — unchanged |
| `CRIME_IDAM` | n/a | n/a | `/session-logged-out` — unchanged |
| `PI_AAD` | n/a | n/a | B2C logout with `p` and `post_logout_redirect_uri` — unchanged |
| unauthenticated / no provenance | n/a | derivable | Falls into the SSO branch as today, with no `logout_hint` since `req.user` is undefined |

## 4. Acceptance Criteria Mapping

### AC1 — "The dialog box is removed by setting the login hint optional claim"

| Sub-criterion | How it is satisfied | Verification |
| --- | --- | --- |
| `login_hint` claim captured at sign in | §2.2 maps `claims.login_hint` → `UserProfile.loginHint`; `serializeUser` persists it | `passport-config.test.ts` |
| Hint sent as `logout_hint` on sign out | §2.4 appends the parameter; §2.5 reads the hint before `req.logout()` | `logout-url.test.ts`, `logout/index.test.ts` |
| Picker no longer shown | Entra resolves the account from the hint | **Manual on STG, gated on the IDAM demand request** — cannot be asserted in CI |
| Only the CaTH account is ended when two Microsoft accounts are signed in | `logout_hint` scopes the sign-out to one account | Manual on STG |
| Optional claim enabled on the registration | §2.8 demand request | Decode the ID token at `/sso/return` on STG and confirm the claim is present |
| Claim not yet live → unchanged behaviour | Parameter omitted entirely; URL byte-identical to today | `logout-url.test.ts`, `logout/index.test.ts` |

**This AC cannot be fully closed in CI.** The code half is mergeable and unit-testable now; "no picker
is shown" is demonstrable only once IDAM has applied the claim on STG.

### AC2 — "After the fix is deployed, the following should be reconsidered"

Both items are explicitly *reconsider after deployment*, so they are **out of scope for
implementation here** and recorded as decisions needed in section 6:

* On session timeout, SSO users have their CaTH session destroyed but their Entra session left intact
  (`libs/auth/src/middleware/session-timeout.ts` only calls `buildCftIdamLogoutUrl` for `CFT_IDAM`).
* An IDAM user in no CaTH security group reaches `/sso-rejected` with a role-less Passport session
  still established and their Entra session intact (`apps/web/src/pages/(auth)/sso/return/index.ts`
  redirects without signing them out).

Each needs a product decision and a separate ticket. Raising those tickets *is* in scope.

### Non-regression criteria

| Criterion | Verification |
| --- | --- |
| Non-SSO provenances unaffected | Existing `logout/index.test.ts` cases for `CFT_IDAM`, `CRIME_IDAM`, `PI_AAD` keep passing unchanged |
| Welsh preserved through sign out | `locale` cookie survives; existing Welsh CFT IDAM test plus the E2E Welsh check |
| Hint never logged | Code review of the changed files; manual log inspection on STG |
| No other claim mapping changes | `passport-config.test.ts` asserts the other five fields |

## 5. Test Scenarios

Every scenario below has a corresponding task in `tasks.md`.

### `libs/auth/src/sso/logout-url.test.ts` (new)

1. Builds the Entra sign-out URL with both `post_logout_redirect_uri` and `logout_hint` when a login
   hint is supplied.
2. Omits `logout_hint` entirely when the login hint is `undefined`.
3. Omits `logout_hint` when the login hint is an empty or whitespace-only string.
4. URL-encodes a login hint containing reserved characters, and encodes the post-logout redirect URI.
5. Extracts the tenant GUID from a well-formed `SSO_ISSUER_URL` and places it in the path.
6. Returns `null` when `SSO_ISSUER_URL` is empty, and when it contains no tenant GUID followed by
   `/v2.0`.

### `libs/auth/src/config/passport-config.test.ts` (extend)

7. Maps the `login_hint` claim from the ID token onto `UserProfile.loginHint` during the OIDC callback.
8. Leaves `loginHint` undefined when the claim is absent, without altering any other mapped field.
9. Does not substitute `preferred_username`, `email` or any other claim when `login_hint` is missing.

### `apps/web/src/pages/(auth)/logout/index.test.ts` (extend)

10. Redirects an SSO user with a session `loginHint` to a URL containing `logout_hint`, after
    destroying the session and clearing `connect.sid`.
11. Redirects an SSO user without a `loginHint` to a URL with no `logout_hint` parameter.
12. Reads `loginHint` from `req.user` **before** `req.logout()` is invoked — asserted by a `req.logout`
    mock that clears `req.user`, proving the hint still reaches the built URL.
13. Redirects to `/session-logged-out` when `buildSsoLogoutUrl` returns `null`.
14. Does not add `logout_hint` for `CFT_IDAM`, `CRIME_IDAM` or `PI_AAD` users, and leaves their
    existing redirect targets intact (regression cover for the existing cases).

### `e2e-tests/tests/sso/sso.spec.ts` (extend — do not add a new test)

15. Within the existing `"session persistence, logout, and concurrent sessions @nightly"` journey:
    after signing out as a system admin, assert the browser lands on `/session-logged-out` without
    passing through a `login.microsoftonline.com` account-picker page, and that returning to
    `/system-admin-dashboard` requires re-authentication. The Welsh check and the inline axe check on
    the landing page go **inside this same journey** — per CLAUDE.md, one test per journey, not one per
    assertion.

### Manual verification on STG (gated on the IDAM demand request)

16. **Before** the claim is enabled: sign out as each of the three SSO admin roles and confirm
    behaviour is unchanged from today (picker still shown, no errors, correct landing page).
17. **After** the claim is enabled: decode the ID token at `/sso/return` to confirm `login_hint` is
    present, then sign out and confirm no picker appears for each of the three roles.
18. With two Microsoft accounts signed in to the same browser, confirm only the CaTH account is ended
    and the second account's Entra session survives.
19. Confirm no web-app log line contains the hint value.

## 6. Open Questions

### Assumptions being made

* The `login_hint` value Entra issues is accepted verbatim as `logout_hint` — no transformation or
  decoding beyond URL encoding.
* `passport.serializeUser` persists the whole user object, so `loginHint` reaches the Redis-backed
  session with no serialiser change. **Verified** at `passport-config.ts:86`.
* `{BASE_URL}/session-logged-out` is already registered against both app registrations and keeps
  working; adding `logout_hint` does not affect redirect-URI matching.
* All three CaTH SSO admin roles (`SYSTEM_ADMIN`, `INTERNAL_ADMIN_CTSC`, `INTERNAL_ADMIN_LOCAL`)
  authenticate through the same app registration, so one claim change covers all of them.
* Shipping the service change ahead of the IDAM change is safe and is the intended order.

### CLARIFICATIONS NEEDED

1. **The IDAM demand request is a hard external dependency and this ticket cannot be fully verified
   without it.** Who raises it, and what is the expected turnaround? The code change is mergeable and
   unit-testable in isolation, but "no picker is shown" is only demonstrable once the claim is live on
   STG. Should the ticket be closed on the code change with a follow-up for verification, or held open
   until IDAM completes?

2. **Does the demand request need to cover both app registrations?** This plan assumes STG
   (`sso-client-id`) and preview (`sso-client-id-dev`). Confirm whether the preview registration is
   managed by IDAM or by the CaTH team — if the latter, that half can be done without waiting.

3. **Session timeout for SSO users** (flagged in the issue for reconsideration). Today timeout
   destroys only the CaTH session, leaving the Entra session live, so the next visit silently
   re-authenticates. Should SSO users be routed through the Entra sign-out endpoint on timeout as CFT
   IDAM users already are? That becomes viable without a picker, but it changes the meaning of "signed
   out due to inactivity" and would sign the user out of other Microsoft-authenticated tools in the
   same browser. Needs a product decision — recommend a separate ticket.

4. **`/sso-rejected` for users in no CaTH security group** (flagged in the issue for reconsideration).
   Today `/sso/return` redirects role-less users to `/sso-rejected` with a Passport session still
   established and no Entra sign out. Should they be signed out of both CaTH and Entra before the
   rejection page renders? The picker is what makes this unattractive today. Needs a separate ticket —
   and note that signing out first means `/sso-rejected` must be reachable unauthenticated.

5. **Should the SSO branch pass `?lng={locale}` on `post_logout_redirect_uri` for parity with CFT
   IDAM?** Not needed for correctness (the `locale` cookie carries the language), and it would require
   re-registering the redirect URI with IDAM because Entra matches it exactly.
   **Recommendation: leave as is.**

6. **Should the sign-out endpoint come from OIDC discovery instead of being hand-built?**
   `oidcClient.discovery()` already returns `end_session_endpoint` in `configurePassport`, which would
   remove the `extractTenantId` regex and the hardcoded `login.microsoftonline.com` host.
   **Recommendation: out of scope** — it is a wider refactor of how discovered config is shared
   between `libs/auth` and the page controller, and it would change the sign-out URL for reasons
   unrelated to this defect.
