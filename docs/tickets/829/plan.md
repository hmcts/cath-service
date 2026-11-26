# Technical Plan: #829 Add Test connection to Manage subscriber (third-party subscribers)

All paths are relative to `/Users/kian.kwa/IdeaProjects/cath-service` unless stated.

## 1. Technical Approach

### What this does

Adds a **Test connection** button and a result banner to the existing Manage subscriber page (`/third-party-subscribers/:id/manage`). This is a partial migration into an existing page, not a new page. The existing GET, summary list and the three other buttons are unchanged.

Flow on POST:

1. Resolve the subscriber (same lookup as the page's GET).
2. Call a new lib function `testThirdPartyConnection(userId)` in `@hmcts/third-party-user`. It reads the five OAuth secrets, requests a client-credentials token, then sends `GET <destination>` with `Authorization: Bearer <token>`. It returns a closed, typed result and never throws.
3. Write an audit log entry with the subscriber id and the outcome.
4. Re-render the same page with a result banner. No data is changed.

The lib returns typed outcomes and typed failure reasons, not English text. The page maps them to en/cy strings. This keeps Welsh handling in the page and keeps free-form remote text out of both the UI and the logs.

### Architecture decisions

- **Logic in the lib, page stays thin.** Token request, health check, config read and the sanitised HTTP wrapper live in `libs/third-party-user/src/`, flat files in the style of `key-vault-service.ts`. A later OAuth push can reuse the token and HTTP pieces. Only `testThirdPartyConnection` and its result type are exported from the package for now (YAGNI; widen the exports when the push work needs them).
- **Native `fetch`.** No new dependency. `libs/auth` already uses global `fetch` with `AbortSignal.timeout`. `libs/legacy-third-party-fulfilment/src/push/http-client.ts` uses `node:https` with `REQUEST_TIMEOUT_MS = 30_000`; the same 30s value is used here, via `AbortSignal.timeout(REQUEST_TIMEOUT_MS)` (covers connect, headers and body read).
- **Redirects are not followed** (`redirect: "manual"`). A 3xx is therefore a non-2xx and fails. This matches the ticket ("Any 2xx response is a success") and stops the bearer token being replayed to a redirect target.
- **Always a fresh token.** No caching (#568).
- **Audit via a direct `logAction` call, not `req.auditMetadata`.** See "Audit logging" below for why the middleware cannot be used.
- **No schema change, no migration.** `audit_log.action` is a plain `String` column. `AuditLogAction` is a TypeScript enum in `libs/system-admin-pages/src/audit-log/logger.ts`, not a Prisma enum.

### Repo verification (ticket vs repo)

| Ticket reliance | Repo state | Result |
|---|---|---|
| Manage page exists at `/third-party-subscribers/:id/manage` | `libs/system-admin-pages/src/pages/third-party-subscribers/[id]/manage/` has `index.ts`, `index.njk`, `index.test.ts`, `en.ts`, `cy.ts`. Exports only `GET = [requireRole([SYSTEM_ADMIN]), getHandler]`. | OK, POST must be added |
| OAuth config via `createKeyVaultSecretName` / `getSecret` | `libs/third-party-user/src/key-vault-service.ts`. Secret names `third-party-<id>-{destination-url,token-url,scope,client-id,client-secret}`. | OK |
| "Read from Key Vault" | `getSecret` uses Key Vault only when `THIRD_PARTY_KEY_VAULT` is set; otherwise it reads the `third_party_secret` DB table (plaintext). Deployed web (helm `values.yaml`) sets `cath-tp-<env>`; preview uses `values.dev.yaml` = `cath-tp-aat`. | OK, but local and nightly (local app) read the DB table |
| OAuth config pages fall back to `legacy_third_party_user` | True for `oauth-config/index.ts` (GET) and `oauth-config/summary/index.ts` (POST): `(await findThirdPartyUserById(id)) ?? prisma.legacyThirdPartyUser.findUnique(...)`. | **The manage page does not.** See "Inconsistency" below |
| Audit via `AuditLogAction` | Enum in `libs/system-admin-pages/src/audit-log/logger.ts`. Siblings set `req.auditMetadata = { shouldLog: true, action, entityInfo: "Name: X, ID: Y" }` then `res.redirect`. | OK, but the middleware does not fit this feature (below) |
| 30s timeout convention | `REQUEST_TIMEOUT_MS = 30_000` in `legacy-third-party-fulfilment/src/push/http-client.ts` | OK |
| No OAuth client-credentials code exists | Confirmed. `legacy-third-party-fulfilment` is the Courtel mTLS POST push. | OK |
| #620 plan at `docs/tickets/620/plan.md` | **Not on `master`.** It exists only in commit `ba9b6cdcf` / `origin/feature/620-add-third-party-testing-support-APIM-endpoints` (`git show ba9b6cdcf:docs/tickets/620/plan.md`). The staged `git status` shown at session start no longer matches the working tree. Read from the commit. | Flag: #620 is unmerged |
| Legacy cy locale | `pip-frontend` `locales/cy/manage-third-party-subscribers-view.json` is a byte-for-byte copy of the English file. There is no upstream Welsh to adopt. | Decided: real Welsh is required, not placeholders. Drafted in section 2 from terms already used in this lib; needs review by a Welsh speaker before merge |

### Inconsistency to flag: the Manage page cannot reach legacy subscribers

- `third-party-subscribers/index.ts` lists only `ThirdPartyUser` (`findAllThirdPartyUsers` from `@hmcts/third-party-user`).
- `manage/index.ts` GET uses only `findThirdPartyUserById` and redirects to the list when it is null.
- `delete/confirmation/index.ts` also uses only `ThirdPartyUser`.
- Only `oauth-config` (GET and summary POST) falls back to `LegacyThirdPartyUser`.

So a legacy-only id can never reach the Manage page (it redirects), and the Test connection button lives on that page. A legacy fallback in the Test connection POST alone would be unreachable dead code, and the POST has to re-render the same summary (name, created date, subscription count), which needs the same lookup as GET.

The lib function `testThirdPartyConnection(userId)` does not care which table the subscriber is in: secrets are keyed by id only. Only the page lookup is model-specific.

**Plan default:** the POST uses exactly the same lookup as the GET (`findThirdPartyUserById`), via one shared function in the page file, so both stay consistent. The legacy fallback is not added to the manage page in this ticket, because it would also need the summary values for `LegacyThirdPartyUser` (`createdDate`, subscriptions) and the two sibling buttons (manage subscriptions, delete) would still not work for those ids. The model question belongs to #830. Decided (Clarification 1): left to #830, so POST stays identical to GET.

### Audit logging: why `req.auditMetadata` cannot be used

`libs/system-admin-pages/src/audit-log/middleware.ts` writes an entry only on:
- `res.redirect` with `shouldLog: true` (outcome text is always "Completed successfully", or "Action cancelled by user" when the redirect target equals the request path),
- `res.render` **only when the options contain `errors`** (logged as "Validation failed"),
- `res.json` / `res.send`.

The ticket requires a re-render (not a redirect) and the outcome (success or failure) in the entry. With the middleware, a plain `res.render` would write nothing; a redirect to the same path would be logged as "cancelled by user"; passing `errors` would be logged as a validation failure. So the handler calls `logAction` directly (precedent: `libs/system-admin-pages/src/jurisdiction-management/service.ts`).

Rules that follow from this:
- Do not set `req.auditMetadata.shouldLog` on this POST, and never put an `errors` key in the render context (use `connectionResult`), otherwise the middleware would write a second, wrong entry. A test asserts this.
- User fields come from `req.user` exactly as the middleware reads them: `id`, `email`, `role`, `provenance`.
- `details`: `Name: <name>, ID: <id>; Outcome: Success` or `Outcome: Failure (<stage>)` where `<stage>` is one of `missing configuration`, `token request`, `destination request`, `error`. These are fixed strings; no remote text and no reason detail is stored.
- If `logAction` throws, catch it, log `console.error` (as the middleware does), and still show the result. The test is read-only, so an audit write failure should not hide the result from the admin. See Clarification 5.

### Secrets safety (hard requirement), concretely

1. **Failure reasons are a closed type, never built from remote text or `error.message`.**

   ```ts
   type FailureReason =
     | { kind: "http-status"; status: number }
     | { kind: "invalid-token-response" }
     | { kind: "invalid-url" }
     | { kind: "connection-failed" };
   ```

   The UI shows `HTTP status 401`, or a fixed locale sentence. Response bodies (token endpoint or destination) are never read into a reason, a log line or the audit entry. The destination response body is cancelled unread; the token response body is parsed only to extract `access_token`, and only that value is kept.
2. **`fetch` errors are sanitised in one place** (`outbound-request.ts`). It catches everything and returns one of `{ kind: "response", status }`, `{ kind: "timeout" }`, `{ kind: "invalid-url" }`, `{ kind: "network-error" }`. It never returns or logs `error.message`, because undici messages and `cause` can include the host, and a URL with embedded userinfo (`https://user:pass@host`) can echo credentials. Only `error.name` and `error.cause.code` (e.g. `ECONNREFUSED`) are used internally, and only for the log line.
3. **Server logs** (`console.error`, same as the rest of the repo; there is no logger lib): `Third party connection test failed: userId=<id> stage=<token|destination|error|missing-configuration> reason=<http-status 401|invalid-url|...>`. Never log the client id, client secret, access token, URLs, scope, request body or response body.
4. **The client secret and token live only in local variables inside the lib call.** They are not put in the session, the render context, the audit entry, or any thrown error.
5. **A unit test seeds recognisable secret strings** (client secret, access token, and a URL with userinfo) into config, the token response and the error messages of rejected fetches, then asserts that `JSON.stringify(result)`, every `console.error` argument, the `logAction` payload, and the rendered context contain none of them.

### Other key technical considerations

- **Timeouts.** Token and destination each get 30s. A token timeout ends the flow, so the worst case for one POST is a token response just under 30s followed by a destination timeout at 30s, about 60s. Ingress and gateway timeouts may be shorter. Decided (Clarification 7): stage-specific failure messages with fixed reasons, and the generic message only for timeouts and unexpected errors, are the intent. Per-request 30s stays as the ticket states; no overall deadline is added (see the note under Clarification 7). The submit button uses `preventDoubleClick: true` so one click is one test.
- **SSRF.** The URLs are admin-supplied and the server calls them from inside the cluster. The oauth-config form only checks "not empty", so any string can be stored. Mitigations in scope: parse with `new URL`, allow only `http:` and `https:` (Node `fetch` would also accept `data:` and `blob:`, which could produce a false "success"), no redirect following, and no response content ever returned to the user (status code only), which limits this to a blind-SSRF status oracle for an already-trusted System Admin. Not in scope: blocking private, loopback and link-local ranges (e.g. `169.254.169.254`). DNS-based allow/deny lists are easy to get wrong (rebinding) and the mock lives behind APIM on a private network. Decided (Clarification 3): accepted for a System-Admin-only feature, including that plain `http` URLs are allowed.
- **CSRF.** Other forms in this lib do not include a CSRF token. This POST is consistent with them. Worst case from a forged POST is an outbound call plus an audit entry.
- **Welsh.** Every new string is added to `en.ts` and `cy.ts` with real Welsh (decided, Clarification 2). Upstream has no Welsh to adopt, so the strings are drafted in section 2 and reuse terms already in this lib's `cy.ts` files (`tocyn`, `ffurfweddiad OAuth`, `URL cyrchfan`, `tanysgrifwr trydydd parti`). The draft is not from a certified translator and must be reviewed by a Welsh speaker before merge. Do not ship `[WELSH TRANSLATION REQUIRED: ...]` placeholders.

## 2. Implementation Details

TEMPLATE SOURCE: migrate from pip-frontend src/main/views/system-admin/manage-third-party-subscribers-view.njk

This is a partial migration into the existing cath page. Adopt only the Test connection button and the result banner markup and wording, with the legacy order (button first, result below it). Welsh strings are drafted in this plan because upstream cy is a copy of the English file. Do not replace the page, and do not adopt the Status row or Change link (that is #830). Upstream companions for reference only: locale `src/main/resources/locales/{en,cy}/manage-third-party-subscribers-view.json` and controller `ManageThirdPartySubscribersViewController.ts` (`post`, private static `testConnection`). The migrate-pip-pages skill is run by `/qk-implement`.

### Files to create (lib)

| File | Purpose |
|---|---|
| `libs/third-party-user/src/outbound-request.ts` | `sendOutboundRequest(url, init)`: validates the URL (`http:`/`https:` only), applies `AbortSignal.timeout(REQUEST_TIMEOUT_MS)` (`const REQUEST_TIMEOUT_MS = 30_000`), `redirect: "manual"`, and returns the sanitised discriminated result described above. The only place that calls `fetch`. |
| `libs/third-party-user/src/outbound-request.test.ts` | Tests for the wrapper: URL/protocol rejection, timeout, network error, status passthrough, redirect not followed, no message leakage. |
| `libs/third-party-user/src/oauth-config.ts` | `getOauthConfig(userId)`: reads the five secrets with `getSecret(createKeyVaultSecretName(...))` in `Promise.all` (same as `oauth-config/index.ts`). Returns `undefined` unless all five are non-blank. Exports the `OauthConfig` type at the bottom of the file. |
| `libs/third-party-user/src/oauth-config.test.ts` | All present, each of the five missing or blank returns `undefined`. |
| `libs/third-party-user/src/access-token.ts` | `requestAccessToken(config)`: `POST tokenUrl`, `Content-Type: application/x-www-form-urlencoded`, `Accept: application/json`, body `URLSearchParams` of `grant_type=client_credentials`, `client_id`, `client_secret`, `scope` (same fields as legacy `requestApiAccessToken`). 2xx and JSON with a non-empty string `access_token` returns the token; anything else returns a typed failure. No `expires_in` handling. |
| `libs/third-party-user/src/access-token.test.ts` | Request shape, non-2xx, non-JSON, missing or empty `access_token`, timeout, network error. |
| `libs/third-party-user/src/connection-test-service.ts` | Exports `testThirdPartyConnection(userId): Promise<ConnectionTestResult>`: config, then token, then destination `GET` with `Authorization: Bearer`, then map to the result. Wraps everything in `try/catch` so unexpected errors (e.g. Prisma failing inside `getSecret`) become `{ status: "error" }`. Logs failures (userId, stage, reason code only). Exports `ConnectionTestResult` and `FailureReason` types at the bottom of the file. |
| `libs/third-party-user/src/connection-test-service.test.ts` | The ticket's required cases (success, missing configuration, token failure, destination failure, timeout) plus secret-leak and edge cases. |

Result type:

```ts
type ConnectionTestResult =
  | { status: "success" }
  | { status: "missing-configuration" }
  | { status: "token-failure"; reason: FailureReason }
  | { status: "destination-failure"; reason: FailureReason }
  | { status: "error" };
```

Types live next to the implementation, no `types.ts`.

### Files to modify (lib)

| File | Change |
|---|---|
| `libs/third-party-user/src/index.ts` | Add `export { type ConnectionTestResult, type FailureReason, testThirdPartyConnection } from "./connection-test-service.js";`. No other new exports. |

No `package.json`, `tsconfig.json` or root `tsconfig.json` paths change. The package already exists, is already a dependency of `@hmcts/system-admin-pages`, and `fetch` is global. No `config.ts` is needed (the package has none). Nothing under `apps/` changes.

### Files to modify (page: `libs/system-admin-pages/src/pages/third-party-subscribers/[id]/manage/`)

| File | Change |
|---|---|
| `index.ts` | Add `postHandler`. Factor a local `renderManagePage(res, user, t, lngParam, connectionResult?)` shared by GET and POST (DRY). Add `export const POST: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN]), postHandler];`. POST flow: lookup (redirect to `/third-party-subscribers${lngParam}` if not found), `testThirdPartyConnection(id)`, `recordConnectionTestAudit(...)` (try/catch), render with `connectionResult` (a view model: `{ isSuccess, title, message, reason? }`). Local helper functions (`toConnectionBanner`, `describeFailureReason`) ordered after their callers per CLAUDE.md. Import `AuditLogAction`, `logAction` from `../../../../audit-log/logger.js` (`oauth-config/summary/index.ts` is one directory deeper and uses five `../`). |
| `index.njk` | Import `govukNotificationBanner`. Legacy order (decided, Clarification 8): under the `<h1>`, add `<form method="post" novalidate>` containing `govukButton({ text: testConnectionButton, classes: "govuk-button--secondary", preventDoubleClick: true })`, then the notification banner immediately below the form, then the summary list. Both button and result are therefore above the summary list. No `action` attribute, so the POST keeps `?lng=cy`. The banner is not before the `<h1>`, which departs from the Design System's placement advice, so rely on `role: "alert"` to announce it and check with axe and a screen reader that the result is announced after the POST. Success uses `type: "success"`. Failure uses the default banner type. Both use `role: "alert"` and `titleText` of "Succeeded" or "Failed", so state is conveyed by text, not colour. Banner body is `<p class="govuk-notification-banner__heading">` with the message, plus a `<p class="govuk-body">` `Reason: ...` line when present. Verify the block-`set` capture is escaped (autoescape) before passing as `html`. |
| `en.ts` | Add `testConnectionButton`, and a `connectionTest` object (not `connectionResult`, which is the render-context view model and would be overwritten by the `...t` spread): `succeededTitle`, `failedTitle`, `succeeded`, `missingConfiguration`, `tokenFailure`, `destinationFailure`, `error`, `reasonLabel`, `reasons: { httpStatus, invalidTokenResponse, invalidUrl, connectionFailed }`. English wording is exactly the ticket and upstream (list below). |
| `cy.ts` | Same keys, with the Welsh values from the table below. |
| `index.test.ts` | Add POST tests (section 5). Existing GET tests stay and add one assertion that GET passes no `connectionResult`. |
| `libs/system-admin-pages/src/audit-log/logger.ts` | Add `TEST_THIRD_PARTY_CONNECTION = "Test third party connection"` to `AuditLogAction`, in alphabetical position (after `REMOVE_LIST`, before `UPDATE_LOCATION_JURISDICTION`). |

English strings (from the ticket, which matches upstream `en` JSON):

| Key | English |
|---|---|
| `testConnectionButton` | Test connection |
| `succeededTitle` | Succeeded |
| `failedTitle` | Failed |
| `succeeded` | Connection to third party succeeded. |
| `missingConfiguration` | No OAuth configuration found. Please supply valid OAuth configuration to enable connection. |
| `tokenFailure` | Failed to generate access token. |
| `destinationFailure` | Failed to send request to destination. |
| `error` | Error connecting to third party. Please try again later. |
| `reasonLabel` | Reason |
| `reasons.httpStatus` | HTTP status |
| `reasons.invalidTokenResponse` | The token response did not contain an access token. |
| `reasons.invalidUrl` | The URL is not valid. |
| `reasons.connectionFailed` | Could not connect. |

`tokenFailure` and `destinationFailure` and the four `reasons.*` strings are new relative to the upstream locale (upstream produced them from backend exception text). They get Welsh like every other string.

Welsh strings (decided, Clarification 2). These are a draft, not a certified translation, and must be reviewed by a Welsh speaker before merge. They reuse terms already in this lib: `tocyn` (token, `oauth-config/cy.ts`), `ffurfweddiad OAuth` (`manage/cy.ts`), `URL cyrchfan` (`oauth-config/cy.ts`).

| Key | Welsh |
|---|---|
| `testConnectionButton` | Profi cysylltiad |
| `succeededTitle` | Llwyddodd |
| `failedTitle` | Methodd |
| `succeeded` | Llwyddodd y cysylltiad â'r trydydd parti. |
| `missingConfiguration` | Heb ddod o hyd i ffurfweddiad OAuth. Rhowch ffurfweddiad OAuth dilys i alluogi'r cysylltiad. |
| `tokenFailure` | Methwyd â chynhyrchu tocyn mynediad. |
| `destinationFailure` | Methwyd ag anfon cais i'r URL cyrchfan. |
| `error` | Gwall wrth gysylltu â'r trydydd parti. Rhowch gynnig arall arni yn nes ymlaen. |
| `reasonLabel` | Rheswm |
| `reasons.httpStatus` | Statws HTTP |
| `reasons.invalidTokenResponse` | Nid oedd yr ymateb tocyn yn cynnwys tocyn mynediad. |
| `reasons.invalidUrl` | Nid yw'r URL yn ddilys. |
| `reasons.connectionFailed` | Methwyd â chysylltu. |

Points for the reviewer: `destinationFailure` says "URL cyrchfan" rather than just "cyrchfan" to avoid a grammatical gender choice and to match the existing field label, which is slightly narrower than the English "destination". "Succeeded"/"Failed" are rendered as `Llwyddodd`/`Methodd`; confirm the preferred banner wording against GOV.UK Welsh conventions.

### Files to create (E2E)

| File | Purpose |
|---|---|
| `e2e-tests/tests/system-admin/third-party-test-connection.spec.ts` | One journey test. Follows `system-admin-dashboard.spec.ts` (non-skipped, `loginWithSSO` in `beforeEach`), not the skipped `third-party-user-management.spec.ts`. Details in section 5. |

### Files to modify (CI wiring, E2E only)

| File | Change |
|---|---|
| `.github/workflows/job.e2e-test.yml` | Export the destination URL for the E2E run (new env var, e.g. `THIRD_PARTY_TEST_CONNECTION_URL`, value `https://<aat APIM gateway>/cath/testing-support/third-party`). Source of the host is unknown, see Clarification 4. `AZURE_TENANT_ID`, `CATH_SERVICE_API_CLIENT_ID` and `CATH_SERVICE_API_CLIENT_SECRET` are already exported there. |

### API endpoints

`POST /third-party-subscribers/:id/manage` on the existing page (`libs/system-admin-pages/src/pages/third-party-subscribers/[id]/manage/index.ts`). Auth: `requireRole([USER_ROLES.SYSTEM_ADMIN])`. Body: none. Responses: `200` page render (always, whatever the connection outcome), or `302` to `/third-party-subscribers[?lng=cy]` for an unknown id. The `:id` is used only to look up the subscriber and build secret names; it is a route parameter and is only ever passed to Prisma (parameterised) and `createKeyVaultSecretName`.

### Database schema changes

None. `audit_log.action` is `String`. No Prisma schema or migration change, no `yarn db:generate`.

## 3. Error Handling & Edge Cases

### Ticket message to code path

| Ticket result | Condition | Produced by |
|---|---|---|
| Success: "Succeeded" / "Connection to third party succeeded." | Token OK and destination returns 2xx | `connection-test-service.ts` returns `{ status: "success" }`; page uses `succeededTitle` + `succeeded`; `type: "success"` banner |
| No OAuth configuration | Any of the five secrets undefined or blank | `getOauthConfig` returns `undefined`; service returns `{ status: "missing-configuration" }` **before any fetch**; page uses `failedTitle` + `missingConfiguration` |
| Token request fails | Token endpoint returns non-2xx (incl. 3xx), or 2xx with non-JSON, or JSON without a non-empty string `access_token`; or token URL invalid or not http(s); or connection refused, DNS or TLS failure | `access-token.ts` returns a failure; service returns `{ status: "token-failure", reason }`; page uses `tokenFailure` + reason line. Destination is not called. |
| Destination request fails | Destination returns non-2xx (incl. 3xx), or destination URL invalid or not http(s), or connection refused, DNS or TLS failure | service returns `{ status: "destination-failure", reason }`; page uses `destinationFailure` + reason line |
| Unexpected error or timeout | Either request hits the 30s `AbortSignal.timeout`; or anything else thrown (e.g. `getSecret` rejecting in DB mode) | `outbound-request.ts` returns `{ kind: "timeout" }` and the service maps it to `{ status: "error" }`; outer `try/catch` maps unexpected throws to `{ status: "error" }`; page uses `failedTitle` + `error` (no reason line) |

Reason mapping: `http-status` renders `HTTP status 401`. The other three `FailureReason` kinds render their fixed locale sentence.

### Validation requirements

- No user input beyond the `:id` route parameter. Nothing in the body is read.
- Resolved URLs are parsed with `new URL(...)`; only `http:` and `https:` pass. Anything else is `invalid-url`, with no fetch made.
- `access_token` must be a non-empty string. Do not trust `token_type`; always send `Bearer` (ticket).

### Edge cases

- **Subscriber not found:** redirect to `/third-party-subscribers` with `lngParam`, same as GET. No outbound call, no audit entry (nothing to attribute it to).
- **Legacy-only id:** treated as not found by the manage page today. Decided (Clarification 1): left to #830. See "Inconsistency".
- **Partially saved config:** if any of the five is missing or blank, the result is "No OAuth configuration found" and nothing is called. The message says "supply valid OAuth configuration", which is accurate enough. Legacy returned the same message only when no config object existed at all, so this is slightly broader. Decided (Clarification 6): accepted.
- **Key Vault read problems look like missing config.** In Key Vault mode `getSecret` swallows every error (permissions, outage) and returns `undefined`. A vault outage therefore shows "No OAuth configuration found" instead of "Error connecting". `getSecret` is shared with the OAuth config pages and is not changed here. Decided (Clarification 6): accepted, no change to `getSecret`.
- **Non-2xx vs redirect:** 301/302/307 are not followed and count as failure with `HTTP status 3xx`. Legacy `WebClient.retrieve()` would not have flagged a 3xx as an error; the ticket's "any 2xx" is stricter, and this plan follows the ticket.
- **204 and empty bodies from destination:** 2xx is success. The destination body is never read (cancel it to free the socket).
- **Non-JSON or HTML token response with 200:** `invalid-token-response`. Token JSON with `access_token` as a number, object or empty string: `invalid-token-response`.
- **Timeout:** `AbortSignal.timeout` rejects with a `TimeoutError` `DOMException`; the wrapper identifies it by `name` and returns `{ kind: "timeout" }`. Timeout on either request is `{ status: "error" }` (the ticket's wording), logged with the stage.
- **Invalid URL in saved config:** parse failure gives `invalid-url` at the stage that owns the URL (token or destination). The reason text is a fixed sentence and does not echo the URL.
- **URL with embedded credentials (`https://user:pass@host`):** `fetch` throws `TypeError`; handled as `network-error` or `invalid-url` with no message echoed; unit-tested.
- **Double submit:** `preventDoubleClick` on the button. The server does not dedupe, so a deliberate second click or refresh runs a second test. Refreshing the result page re-prompts for form resubmission (re-render, not PRG). Accepted, because the ticket specifies a POST that re-renders.
- **Any subscriber status:** no status check exists today and none is added (#830 later). Test connection must not be gated on status.
- **Preview/local without Key Vault:** `getSecret` reads the `third_party_secret` table. Same code path, no special-casing.

## 4. Acceptance Criteria Mapping

| Criterion | How it is met | Verification |
|---|---|---|
| Secondary **Test connection** button above the summary list | `index.njk`: form with `govukButton` `govuk-button--secondary` between `<h1>` and `govukSummaryList` | Handler test asserts render; E2E asserts `getByRole("button", { name: "Test connection" })` |
| Selecting it POSTs to the same page; page re-renders with result above the summary list; no data changed | `POST` export on the manage page; `res.render` of the same view with `connectionResult`; the lib only reads (`getSecret`, `fetch`) | Handler test: render args; asserts `setSecret`, `deleteSecrets` and Prisma writes are never called |
| Only System Admins can trigger | `POST = [requireRole([USER_ROLES.SYSTEM_ADMIN]), postHandler]` | Test that `POST[0]` is the `requireRole` middleware output (same approach as other handlers in this lib; if no pattern exists, mock `@hmcts/auth` and assert `requireRole` was called with `[SYSTEM_ADMIN]`) |
| 1. Read OAuth config | `getOauthConfig` | `oauth-config.test.ts`, service tests |
| 2. Client credentials token request | `requestAccessToken` | `access-token.test.ts`: method, URL, content type, exact form fields |
| 3. `GET` destination with `Authorization: Bearer <token>` | `connection-test-service.ts` | Service test asserts method `GET`, header value, call order (token before destination) |
| 4. Any 2xx is success | Status check `>= 200 && < 300` | Service test with 200 and 204; 301 and 500 fail |
| Success message | `succeeded` + `succeededTitle` | Handler test, E2E |
| No config message, no calls made | Early return | Service test asserts `fetch` not called; handler test; E2E (no-config step) |
| Token request fails message + reason | `tokenFailure` + `HTTP status N` | Service and handler tests |
| Destination fails message + reason | `destinationFailure` + `HTTP status N` | Service and handler tests |
| Unexpected error or timeout message | `error` | Service test (timeout, unexpected throw), handler test |
| Banner conveys state in text, not colour | `titleText` "Succeeded"/"Failed"; GOV.UK notification banner | Handler test on view model; E2E axe scan |
| Failure reasons never contain secrets | Closed `FailureReason`, sanitised wrapper, status-only logs | Secret-leak unit tests (see "Secrets safety") |
| Works for any subscriber status | No status logic | Nothing to gate; noted in plan only. Covered implicitly because the model has no status yet |
| 30s timeouts | `AbortSignal.timeout(30_000)` on both requests | Wrapper test spies `AbortSignal.timeout` and asserts 30000 is passed; timeout outcome test |
| Fresh token each time | No cache module | Service test: two calls make two token requests |
| Audit entry with subscriber id and outcome | `logAction` with `AuditLogAction.TEST_THIRD_PARTY_CONNECTION` and details `Name: X, ID: Y; Outcome: ...` | Handler tests for success and each failure stage |
| Failures logged server-side with subscriber id, no secrets | `console.error` with id, stage, reason code | Service tests spy on `console.error` and scan arguments |
| Welsh for button and every message | `cy.ts` has every key with real Welsh (table in section 2) | Handler test with `locale: "cy"` renders the `cy` strings, and a test that `en` and `cy` have identical key sets and that no `cy` value contains `WELSH TRANSLATION REQUIRED`; E2E with `Cymraeg` toggle. Welsh wording needs review by a Welsh speaker before merge |
| Unit tests: success, missing config, token failure, destination failure, timeout | `connection-test-service.test.ts` | Task list |
| E2E (stg) shows "Succeeded" against the #620 endpoint | `third-party-test-connection.spec.ts` | Preview E2E after #620 is applied to aat (section 5) |

## 5. Test Scenarios

### Unit tests (Vitest, Arrange-Act-Assert; mock `./key-vault-service.js` and stub global `fetch` with `vi.stubGlobal("fetch", vi.fn())`)

`libs/third-party-user/src/connection-test-service.test.ts`
1. Success: token POST with `grant_type=client_credentials`, `client_id`, `client_secret`, `scope` as form body; destination `GET` with `Bearer <token>`; returns `{ status: "success" }`; token called before destination; `redirect: "manual"` and a signal are passed.
2. Missing configuration: `it.each` over each of the five secrets undefined (and one blank); returns `missing-configuration`; `fetch` not called.
3. Token failure: 401 gives `token-failure` with `{ kind: "http-status", status: 401 }`, destination not called. Also 302 (redirect not followed), 200 with non-JSON body, 200 JSON without `access_token`, 200 with empty or non-string `access_token`: `invalid-token-response`.
4. Destination failure: 403 and 500 give `destination-failure` with `http-status`; 302 gives `destination-failure` `http-status 302`.
5. Timeout: `fetch` rejects with `new DOMException("...", "TimeoutError")` on the token call, and separately on the destination call; both return `{ status: "error" }`.
6. Invalid URL: token URL `not a url` gives `token-failure` `invalid-url`; destination URL `ftp://x` or `data:text/plain,ok` gives `destination-failure` `invalid-url`; `fetch` not called for the invalid one.
7. Network error (`TypeError("fetch failed")` with `cause.code = "ECONNREFUSED"`) at token and at destination gives the stage failure with `connection-failed`.
8. Unexpected throw: `getSecret` rejects gives `{ status: "error" }`, no rethrow.
9. Secret safety: client secret `s3cr3t-value`, access token `tok-abc-123`, URL with `user:pass@` userinfo; fetch rejections whose messages contain these; token endpoint body containing the secret. Assert none appear in `JSON.stringify(result)` or in any `console.error` argument, and that logs contain the user id.
10. Fresh token: two calls make two token requests (no caching).

`libs/third-party-user/src/outbound-request.test.ts`: only `http:`/`https:` accepted; `AbortSignal.timeout` called with `30000`; 2xx, 3xx, 4xx, 5xx status passthrough with `redirect: "manual"`; `TimeoutError` gives `timeout`; other rejection gives `network-error`; no `message` or `cause` content in any result.
`libs/third-party-user/src/oauth-config.test.ts` and `access-token.test.ts`: cases listed in section 2.

Page: `libs/system-admin-pages/src/pages/third-party-subscribers/[id]/manage/index.test.ts` (extend; mock `@hmcts/third-party-user` including `testThirdPartyConnection`, and `../../../../audit-log/logger.js`)
11. POST unknown id redirects to `/third-party-subscribers` (and `?lng=cy` in Welsh); `testThirdPartyConnection` and `logAction` not called.
12. POST success renders the manage view with the summary values and a `connectionResult` of `{ isSuccess: true, title: "Succeeded", message: "Connection to third party succeeded." }`.
13. POST for each of `missing-configuration`, `token-failure` (http-status 401), `destination-failure` (http-status 500), `error`: correct title, message and reason text; `error` and `missing-configuration` have no reason line.
14. POST in Welsh uses the `cy` strings.
15. Audit: `logAction` called once with `AuditLogAction.TEST_THIRD_PARTY_CONNECTION`, the user from `req.user`, and details containing `ID: <id>` and the outcome for success and for each failure stage; no reason text and no URLs in details.
16. Audit failure: `logAction` rejects, page still renders the result and does not throw.
17. Read-only and middleware safety: render context has no `errors` key and `req.auditMetadata` is not set; `setSecret` and `deleteSecrets` not called.
18. `POST` export is `[requireRole(...), postHandler]` for System Admin only; GET render has no `connectionResult`.

### E2E (one journey, `e2e-tests/tests/system-admin/third-party-test-connection.spec.ts`)

**"System admin can test a third party subscriber connection"** (one test, per `.claude/rules/e2e-testing.md`):
1. `beforeEach`: SSO login as System Admin, as in `system-admin-dashboard.spec.ts`.
2. Create a subscriber with `createTestThirdPartyUser({ name: `${getTestPrefix()}Test Connection Corp` })`. It has no OAuth config.
3. Open `/third-party-subscribers/:id/manage`. Assert the secondary `Test connection` button is above the summary list. Run axe (wcag2a/aa/21/22).
4. Click **Test connection** with no config. Assert banner "Failed" and "No OAuth configuration found. Please supply valid OAuth configuration to enable connection." Toggle `Cymraeg`, assert the Welsh banner title `Methodd` and the Welsh missing-configuration message are shown, toggle back. Run axe on the result.
5. Click **Manage OAuth configuration** and complete the form and summary pages: destination `THIRD_PARTY_TEST_CONNECTION_URL`, token URL `https://login.microsoftonline.com/${AZURE_TENANT_ID}/oauth2/v2.0/token`, scope `${CATH_SERVICE_API_CLIENT_ID}/.default` (same scope shape as `e2e-tests/utils/api-auth-helpers.ts`), client id and secret from `CATH_SERVICE_API_CLIENT_ID` and `CATH_SERVICE_API_CLIENT_SECRET`. Use the UI so the secrets are written the same way as in production.
6. Back on the manage page, click **Test connection**. Assert banner "Succeeded" and "Connection to third party succeeded.". Run axe.
7. Cleanup in a `finally`/`afterEach`: delete the subscriber through the UI delete flow (`/third-party-subscribers/:id/delete/confirmation`, choose Yes). This is the only path that calls `deleteSecrets`; the prefix-based `global-teardown` removes the DB row but does not remove Key Vault secrets, so skipping this step leaves five orphaned secrets per run in `cath-tp-aat`, including a copy of the API client secret.

Use `test.skip(!process.env.THIRD_PARTY_TEST_CONNECTION_URL, "...")` so the test is skipped, not failed, where the URL is not provided (local runs).

This covers the no-config path without any external call and avoids deliberately sending wrong credentials to Entra (which would create failed-sign-in noise). Token failure, destination failure, timeout, and the other edge cases are covered by unit tests and are not repeated in E2E.

### Where the E2E can and cannot run

- **Test data and setup needed:** a subscriber (created via the test-support API), the five OAuth values above, and a reachable `GET /cath/testing-support/third-party` from #620. The mock accepts any valid token whose audience is `cath-service-api-client-id` (inline `validate-azure-ad-token` without the role check; per the #620 plan). The E2E runner already has `AZURE_TENANT_ID`, `CATH_SERVICE_API_CLIENT_ID` and `CATH_SERVICE_API_CLIENT_SECRET` (`job.e2e-test.yml`, loaded from `cath-bootstrap-aat`), so no new secret is needed if that client is reused. The only new input is the destination URL (APIM aat gateway host, not in the repo).
- **Preview pipeline (PR, `workflow.preview.yml` -> `stage.e2e.yml` -> `job.e2e-test.yml`): can run, with preconditions.** It runs untagged tests (`test:e2e` uses `--grep-invert "@nightly"`) against the deployed preview web app, which uses the real `cath-tp-aat` vault, on the `azure-nonprod` runner group. Preconditions: (a) #620 is merged and applied to aat (a PR run only plans it; `deploy_apim_testing_support` is on for aat, demo, perftest only); (b) the web pod can egress to `login.microsoftonline.com` and reach the APIM gateway; (c) the destination URL env var is provided; (d) the SSO System Admin login works as in `system-admin-dashboard.spec.ts`.
- **Nightly (`nightly.yml`): cannot run this test meaningfully.** It starts a local app against a local Postgres on a GitHub-hosted `ubuntu-latest` runner. Secrets come from the `third_party_secret` table, and the runner cannot be assumed to reach the private APIM. Do not tag the test `@nightly` (that would put it exactly where it cannot pass). The URL guard above makes it skip there.
- **#620 not yet merged:** until it is applied to aat, the final "Succeeded" assertion fails. Sequence #829's merge after #620, or accept that the E2E step is red until then. Clarification 4.
- **Caveat:** most other `system-admin` specs are `.skip`ped with the comment "due to using SSO system admin credentials" (`mi-report.spec.ts` and others). `system-admin-dashboard.spec.ts` is not skipped and uses `loginWithSSO`, so that pattern is followed. The existing `third-party-user-management.spec.ts` is `describe.skip` and stale (it asserts the heading "Manage user", but the page now says "Manage subscriber"); it is not touched here and cannot be extended.

## 6. Open Questions

### CLARIFICATIONS NEEDED

Status after the first round of answers: 1, 2, 3, 6, 7 and 8 are DECIDED. 4, 5 and 9 are OPEN because the answers given ("yes", "yes", "no") do not unambiguously answer an either/or question. The assumed reading is written against each item and must be confirmed.

1. **[DECIDED: left to #830; POST stays identical to GET] Legacy subscribers on the Manage page.** The ticket says Test connection should resolve the subscriber like the OAuth config pages, which fall back to `legacy_third_party_user`. But the Manage page GET (and the list, delete and subscription pages) use only `third_party_user` and redirect unknown ids, so a legacy-only id never reaches the button. The plan keeps POST identical to GET (new model only) so the two stay consistent. Should this ticket also make the Manage page resolve legacy subscribers (it needs a normalised view model for `createdDate` and subscriptions, and the two sibling buttons would still fail for those ids), or is that left to the #830 model decision? Which model is the source of truth?
2. **[DECIDED: real Welsh is required, no placeholders; drafted in section 2, still needs review by a Welsh speaker] Welsh.** Upstream `cy` is a copy of English, so every new Welsh string is `[WELSH TRANSLATION REQUIRED: '...']`, including the button, the two banner titles, all five messages and the four reason sentences. The ticket says Welsh is required. Who supplies the translations, and is a placeholder acceptable at merge?
3. **[DECIDED: acceptable as planned, including plain http and no private-range blocking] SSRF scope.** The plan allows only `http:`/`https:` URLs, never follows redirects, and returns status code only. It does not block private, loopback or link-local ranges, and it does not require HTTPS (so a client secret can be sent over plain `http` if an admin saves an `http` token URL). The oauth-config form accepts any non-empty string. Is that acceptable for a System-Admin-only feature, or should URL format and HTTPS be validated when the config is saved (separate change) and/or private ranges blocked here?
4. **[OPEN: answered "yes" to a multi-part question. Assumed: the preview pod can reach Entra and APIM, and #829 merges only after #620 is applied to aat. NOT answered: where `THIRD_PARTY_TEST_CONNECTION_URL` comes from] E2E destination and ordering.** The aat APIM gateway hostname for `GET /cath/testing-support/third-party` is not in the repo. Where should `THIRD_PARTY_TEST_CONNECTION_URL` come from (workflow variable, bootstrap Key Vault secret)? Can the preview web pod reach both Entra and the APIM gateway? And should #829 merge only after #620 is applied to aat? Also, #620's plan is not on `master` (only on `feature/620-add-third-party-testing-support-APIM-endpoints`); is its status current?
5. **[OPEN: answered "yes" to two either/or questions. Assumed: a missing audit entry is acceptable (do not fail closed) and the enum value stays `"Test third party connection"` rather than being normalised. Confirm] Audit write failure and action naming.** If `logAction` fails, the plan still shows the result (the middleware also swallows audit failures). Is a missing audit entry acceptable here, or should the test fail closed? Separately, the plan stores the enum value as written (`"Test third party connection"`, as `jurisdiction-management` does), while the middleware stores siblings as `UPDATE_THIRD_PARTY_OAUTH_CONFIG`. This makes the audit viewer's action filter show two styles. Is that acceptable, or should the value be normalised to `TEST_THIRD_PARTY_CONNECTION`?
6. **[DECIDED: accept both; `getSecret` unchanged] Partial config and Key Vault errors.** If only some of the five values exist, the plan shows "No OAuth configuration found. Please supply valid OAuth configuration to enable connection." Legacy only returned it when no config existed at all. Also, `getSecret` swallows all Key Vault errors, so a vault outage would show the same message instead of "Error connecting to third party". Accept both, or change `getSecret` (shared with the OAuth config pages) to distinguish "not found" from "error"?
7. **[DECIDED: "correct" read as confirming the stage-specific classification. The overall-deadline question was not answered, so the plan keeps two independent 30s timeouts as the ticket states] Time budget and error classification.** Each request has a 30s timeout (per the ticket), so one POST can take up to about 60s, which may exceed AKS ingress or Front Door timeouts. Should there be an overall 30s deadline instead? Also, the ticket says "Unexpected error or timeout" shows the generic message. The plan shows the stage-specific failure with a fixed reason ("Could not connect", "The URL is not valid") for connection refused, DNS, TLS and bad-URL errors, and the generic message only for timeouts and unexpected exceptions. Is that the intent?
8. **[DECIDED: follow legacy; button first, result banner below the button, both above the summary list] Banner placement.** Legacy puts the result below the button. The plan places the notification banner immediately before the `<h1>` as the GOV.UK Design System recommends, with the button under the heading and above the summary list. Both satisfy "above the summary list". Confirm, or follow the legacy order?
9. **[OPEN: answered "no" to "is that acceptable, or should a dedicated app registration be provisioned". "No" can mean not acceptable (so provision one) or no dedicated registration. Confirm] E2E credentials.** Reusing `CATH_SERVICE_API_CLIENT_ID/SECRET` for the third-party OAuth config copies the API publisher client secret into `cath-tp-aat` for the duration of the test (removed by the UI delete cleanup). Is that acceptable, or should a dedicated Entra app registration (granted only the audience needed for the mock) be provisioned for this test?
