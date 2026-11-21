# Technical Plan: #1320 Add POST /notify/otp endpoint to cath-service API

TEMPLATE SOURCE: n/a

## 1. Technical Approach

Add a backend-only `POST /notify/otp` route to `apps/api` that sends a B2C one-time password email through GOV.UK Notify, matching `B2cNotificationController#sendOtpEmail` in pip-publication-services. It is the backend APIM forwards to in #619.

The route stays thin. It has four parts: authentication, a body parser that runs after authentication, a body-parse error handler local to the route, and a handler that maps a service result to an HTTP response. All validation and sending lives in a new `libs/notifications/src/otp/otp-email-service.ts`.

The design follows what is already in the code:

- **Routing.** `apps/api/src/app.ts` mounts `apps/api/src/routes` with `createSimpleRouter`, and nested directories become path segments (`routes/v1/publication.ts` is served at `/v1/publication`). So `apps/api/src/routes/notify/otp.ts` is served at `/notify/otp` with no change to `app.ts`. There is no global body parser on purpose (see the comment in `app.ts`), so the route parses its own body after `authenticateApi`, as `v1/publication.ts` does.
- **Auth.** `authenticateApi()` lives in `libs/api/src/middleware/oauth-middleware.ts`. The package is named `@hmcts/blob-ingestion`, not `@hmcts/api`. It hard-codes `REQUIRED_ROLE = "api.publisher.user"`. Its only production caller is `apps/api/src/routes/v1/publication.ts` (`routes/publication.ts` re-exports it). An optional `requiredRole` parameter that defaults to the publisher role therefore leaves existing behaviour unchanged.
- **Rate limit.** `sendNotifyEmail` in `libs/govuk-notify/src/notify-client.ts` **already calls `validateEmailRateLimit`** before it delivers. If the OTP service also called `validateEmailRateLimit(email, "HIGH", "OTP email")`, as the ticket suggests, each send would use **two** tokens. Instead the service passes `emailLimit: "HIGH"` to `sendNotifyEmail`, which applies the limit once.
- **Notify delivery.** Use `sendNotifyEmail`, not `sendNotifyEmailWithRetry`. pip does not retry OTP sends, and the B2C policy is waiting on the call synchronously. The ID returned to the caller is a client reference UUID generated per request and passed to Notify as `reference`, as pip does (`EmailData.referenceId`, read back via `getReference()`). It is not Notify's `notificationId`.
- **Template ID.** `libs/govuk-notify/src/template-ids.ts` hardcodes every template ID as a constant, and its header comment says they are the same in every environment because cath sends everything from one Notify service. The ticket assumes per-environment config, but no `GOVUK_NOTIFY_TEMPLATE_ID_*` variable exists in helm, terraform, `.env` or `config/`. Adding the constant therefore covers aat, demo and perftest (the environments where `local.deploy_apim` is true) and every other environment, with no infrastructure change.
- **Notify API key and Redis** are already wired into `cath-api`. `apps/api/helm/values.yaml` maps `govuk-notify-api-key` to `GOVUK_NOTIFY_API_KEY` and `redis-url` to `REDIS_URL`, and `values.dev.yaml` uses the Notify test key. `getApiKey()` in `libs/notifications/src/notify-templates/template-config.ts` reads it.
- **Email validation** reuses `isValidEmail` from `libs/notifications/src/notification/validation.ts`, which is in the same lib and uses a regex with no ReDoS risk.

**No database changes.** Nothing is persisted. The only state is the existing Redis token bucket. No Prisma schema or migration is needed.

## 2. Implementation Details

### Files

```
apps/api/
├── package.json                                   # modify: add "@hmcts/notifications": "workspace:*"
└── src/routes/notify/
    ├── otp.ts                                     # new: POST /notify/otp
    └── otp.test.ts                                # new

libs/api/src/
├── index.ts                                       # modify: export API_ROLE
└── middleware/
    ├── oauth-middleware.ts                        # modify: authenticateApi(requiredRole = API_ROLE.PUBLISHER)
    └── oauth-middleware.test.ts                   # modify: role-param tests

libs/email-rate-limit/src/
├── email-rate-limit.ts                            # modify: name the thrown error, add isEmailRateLimitError
├── email-rate-limit.test.ts                       # modify
└── index.ts                                       # modify: export isEmailRateLimitError

libs/govuk-notify/src/
├── template-ids.ts                                # modify: add GOVUK_NOTIFY_TEMPLATE_ID_OTP
├── notify-client.ts                               # modify: optional emailDescription param (default "Email")
└── notify-client.test.ts                          # modify

libs/notifications/
├── package.json                                   # modify: add "@hmcts/email-rate-limit": "workspace:*"
└── src/
    ├── index.ts                                   # modify: export sendOtpEmail + OtpEmailResult type
    └── otp/
        ├── otp-email-service.ts                   # new
        └── otp-email-service.test.ts              # new

docs/api/openapi.yaml                              # modify: document /notify/otp (internal reference)
```

`infrastructure/resources/apim-operations.json` is **not** changed. That file defines the publisher-facing APIM API, and `/notify/otp` must not appear in it. The OTP API and its swagger belong to #619.

### `libs/api/src/middleware/oauth-middleware.ts`

```typescript
export const API_ROLE = {
  PUBLISHER: "api.publisher.user",
  B2C: "api.request.b2c"
} as const;

export function authenticateApi(requiredRole: ApiRole = API_ROLE.PUBLISHER) { ... }

type ApiRole = (typeof API_ROLE)[keyof typeof API_ROLE];
```

The 403 body already includes the role (`Insufficient permissions. Required role: ${role}`), so it now reports the role that was passed in. The 401 body (`{ statusCode: 401, message: "Access denied due to invalid OAuth information" }`) does not change. `v1/publication.ts` keeps calling `authenticateApi()` and needs no change.

### `libs/email-rate-limit`

The limiter currently throws a plain `Error`. The OTP service has to tell a rate-limit rejection (safe to return, and the message already masks the email) apart from a Redis or configuration failure (must not be returned). Without a marker it would have to match on the message text. Change:

- set `error.name = "EmailRateLimitError"` on the thrown error. The message is unchanged, so existing callers (`send-email.ts`) are unaffected
- export `isEmailRateLimitError(error: unknown): boolean`

### `libs/govuk-notify`

- `template-ids.ts`: `export const GOVUK_NOTIFY_TEMPLATE_ID_OTP = "<id from cath's Notify service>";`. See clarification 2. The ID must be the real one before merge.
- `notify-client.ts`: add optional `emailDescription?: string` to `SendNotifyEmailParams` and pass `params.emailDescription ?? "Email"` to `validateEmailRateLimit`. The rate-limit message then reads `... OTP email failed to be sent to j***@example.com`, as pip's does, and existing callers see no change.

### `libs/notifications/src/otp/otp-email-service.ts`

```typescript
const OTP_EMAIL_DESCRIPTION = "B2C OTP email";

export async function sendOtpEmail(request: unknown): Promise<OtpEmailResult> {
  // 1. validate shape: object with otp (non-empty string) and email (string, isValidEmail)
  //    → { outcome: "VALIDATION_ERROR", message } ; nothing sent
  // 2. sendNotifyEmail({ apiKey: getApiKey(), templateId: GOVUK_NOTIFY_TEMPLATE_ID_OTP,
  //      emailAddress: email.trim(), personalisation: { otp }, emailLimit: "HIGH",
  //      emailDescription: OTP_EMAIL_DESCRIPTION })
  //    → { outcome: "SENT", referenceId }  (randomUUID(), sent to Notify as `reference`)
  // 3. catch:
  //    isEmailRateLimitError(error)          → { outcome: "RATE_LIMITED", message: error.message }
  //    extractNotifyError(error).status > 0  → { outcome: "NOTIFY_ERROR", message }
  //    anything else                         → rethrow (route returns 500)
}

export type OtpEmailResult =
  | { outcome: "SENT"; referenceId: string }
  | { outcome: "VALIDATION_ERROR"; message: string }
  | { outcome: "RATE_LIMITED"; message: string }
  | { outcome: "NOTIFY_ERROR"; message: string };
```

This follows the outcome-union pattern that `respondToIngestion` uses in `v1/publication.ts`. The service has no HTTP concerns. Validation messages name the field but never echo its value: `otp must not be empty`, `email must be a valid email address`. If both fields fail, both messages are joined with `", "`.

The service takes `unknown` because `req.body` is `undefined` when the parser did not match the Content-Type, and it can be any JSON value (array, string, null).

Logging, through `console.info` and `console.error` as elsewhere:

- success: `"OTP email sent", { notificationId, referenceId }`
- rate limited: `"OTP email rate limited"`. No email: the masked address is only in the response message.
- Notify error: `"OTP email failed", { status, message }`. Notify error messages describe the field (for example `email_address Not a valid email address`) and do not echo values.
- The OTP, the email and the personalisation are never logged.

### `apps/api/src/routes/notify/otp.ts`

```typescript
import { API_ROLE, authenticateApi, buildMessage } from "@hmcts/blob-ingestion";
import { sendOtpEmail } from "@hmcts/notifications";

const BODY_LIMIT = "10kb";
const RATE_LIMIT_STATUS = 400; // see clarification 3

export const POST = [
  authenticateApi(API_ROLE.B2C),
  express.json({ limit: BODY_LIMIT }),
  handleBodyParseError,
  async (req: Request, res: Response) => {
    try {
      const result = await sendOtpEmail(req.body);
      return respondToOtpResult(res, result);
    } catch (error) {
      console.error("Unexpected error in OTP endpoint:", { name: ..., code: ... }); // no message (may contain config detail), no body
      return res.status(500).json(buildMessage("Internal server error"));
    }
  }
];

function handleBodyParseError(error: BodyParserError, _req, res, next) { ... }
function respondToOtpResult(res, result) { switch (result.outcome) ... }
```

### API contract

`POST /notify/otp` · `Authorization: Bearer <Entra token, aud = cath-service-api, roles contains api.request.b2c>` · `Content-Type: application/json`

Request:
```json
{ "otp": "123456", "email": "user@example.com" }
```

| Status | When | Body |
|---|---|---|
| 200 | Sent | `text/plain`: `<referenceId>` (UUID only) |
| 400 | Validation failed | `{ "message": "otp must not be empty", "timestamp": "..." }` (`buildMessage`) |
| 400 | Malformed JSON | `{ "message": "Malformed JSON request body", "timestamp": "..." }` |
| 429 | Rate limit exceeded | `{ "message": "Rate limit has been exceeded. B2C OTP email failed to be sent to u***@example.com", "timestamp": "..." }` |
| 400 | Notify rejected the send | `{ "message": "<Notify error message>", "timestamp": "..." }` |
| 401 | No/invalid/expired token | `{ "statusCode": 401, "message": "Access denied due to invalid OAuth information" }` |
| 403 | Token lacks role | `{ "statusCode": 403, "message": "Insufficient permissions. Required role: api.request.b2c" }` |
| 413 | Body over 10 KB | `{ "message": "Request body too large", "timestamp": "..." }` |
| 500 | Unexpected (Redis down, missing API key) | `{ "message": "Internal server error", "timestamp": "..." }` |

`buildMessage` returns `{ message, timestamp }`, the same shape as pip's `ExceptionResponse`, so 400 bodies match pip on the wire. #619's `infrastructure/resources/otp/swagger/api-swagger.json` should use `operationId: sendOtpEmail` and copy the request schema and these responses from the `docs/api/openapi.yaml` entry this ticket adds.

### Config, helm and terraform

- **No helm, terraform or env changes.** The template ID is a code constant (see Technical Approach). `GOVUK_NOTIFY_API_KEY`, `REDIS_URL`, `AZURE_TENANT_ID` and `CATH_SERVICE_API_CLIENT_ID` are already mapped for `cath-api` in `values.yaml` and `values.dev.yaml`.
- **Outside the repo:** the `api.request.b2c` app role has to be added to the `cath-service-api` app registration and assigned to its service principal in each tenant (clarification 1). APIM gets its backend token with client credentials **for that same app** (see `infrastructure/resources/api-policy/api-policy.xml`: `client_id` = `cath-service-api-client-id`, and the scope is the app's own). The role must therefore be assigned to the cath-service-api SP itself. The E2E helper `getApiAuthToken()` uses the same identity, so it picks up the role at the same time.

## 3. Error Handling & Edge Cases

- **Authentication runs first.** `authenticateApi` is `POST[0]`. No body is read until it calls `next()`.
- **Body parse failures leak data in the current setup.** Without a local handler, an `express.json` error reaches the global handler in `app.ts`. That handler returns **500** (not 400 or 413) and calls `console.error(err.stack)`. On Node 24 a JSON `SyntaxError` message includes a snippet of the input (`Unexpected token ..., "{"otp":"12345..." is not valid JSON`), and body-parser attaches the raw body as `err.body`. So the OTP and email would reach the logs. `handleBodyParseError` handles `type === "entity.parse.failed"` (400) and `"entity.too.large"` (413) without logging the message or body. Any other error goes to `next(error)`.
- **Non-JSON Content-Type.** `express.json` skips the body, `req.body` is `undefined`, and the service returns `VALIDATION_ERROR` (400).
- **Body is not an object** (array, string, `null`): 400 validation error.
- **`otp` not a string, or `""`:** 400. pip parity is `@NotEmpty`, so a whitespace-only OTP is accepted. See clarification 8.
- **`email` missing, not a string, or failing `isValidEmail`:** 400. The value sent to Notify is trimmed.
- **Rate limit:** `isEmailRateLimitError` gives `RATE_LIMITED`, and the route returns `RATE_LIMIT_STATUS`. The token is consumed before delivery, so a rejected request sends nothing.
- **Notify failure** (HTTP error, `status > 0`): 400 with Notify's message, as in pip. The request does not crash.
- **Infrastructure failure** (Redis unreachable, `GOVUK_NOTIFY_API_KEY` unset, Notify response with no ID): the service rethrows and the route returns a generic 500. The raw message (for example `connect ECONNREFUSED ...`) is not returned or logged. Only `name` and `code` are logged.
- **Unknown fields** in the body are ignored.
- **APIM interaction:** the existing `api-policy.xml` outbound block turns backend 401 and 403 into 502 at the gateway, and #619 will probably copy it. The B2C caller will see 502 for a role misconfiguration, not 403. That is expected, and #619 should document it.

## 4. Acceptance Criteria Mapping

| AC | How satisfied | Verified by |
|---|---|---|
| `POST /notify/otp` served at that exact path | `apps/api/src/routes/notify/otp.ts` under the simple-router mount | Route unit test imports `POST`. Manual `curl` against local API, plus the optional E2E test |
| No, invalid or expired token returns 401 with the existing body shape | Unchanged `authenticateApi` 401 path | Existing `oauth-middleware.test.ts` 401 tests, plus a new test with a custom role |
| Missing role returns 403 | `authenticateApi(API_ROLE.B2C)` | New middleware tests: a publisher-only token is rejected for B2C. Route test asserts `authenticateApi` called with `API_ROLE.B2C` |
| Body parsed only after auth | Middleware order | Route test asserts `POST[0]` is not a parser and `POST[1].name === "jsonParser"` (same technique as `v1/publication.test.ts`) |
| Invalid `otp`/`email` returns 400 and nothing is sent | Service `VALIDATION_ERROR` | Service tests assert `sendNotifyEmail` is not called. Route test maps the result to 400 |
| Valid request sends the template with `{ otp }` and returns 200 with the message | Service `SENT` + route | Service test asserts `templateId`, `personalisation`, `emailLimit: "HIGH"`. Route test asserts 200 and the exact text |
| HIGH limit exceeded returns an error and nothing is sent | `emailLimit: "HIGH"` + `RATE_LIMITED` | Service test with a mocked rate-limit error. Route test asserts `RATE_LIMIT_STATUS`. `notify-client.test.ts` already asserts the limit runs before delivery |
| Notify failure returns an error and does not crash | `NOTIFY_ERROR` → 400, unknown → 500 | Service and route tests |
| OTP and full email never logged | Logging rules + `handleBodyParseError` | Tests spy on `console.*` and assert no call argument contains the OTP or the email, including for the parse-error path |
| Template ID configured where `deploy_apim` is true | Single constant used in every environment | Code review. Optional E2E test against aat |
| Unit tests (AAA, >80% coverage) | New and updated tests | `yarn test` and `yarn test:coverage` for `libs/notifications`, `libs/api`, `apps/api` |
| #619 swagger matches | `docs/api/openapi.yaml` entry for `/notify/otp`, `operationId: sendOtpEmail` | Cross-check in the #619 review. `yarn openapi:publisher` must leave `infrastructure/resources/swagger/api-swagger.json` unchanged |

## 5. Test Scenarios

### `libs/notifications/src/otp/otp-email-service.test.ts`

Mocks: `@hmcts/govuk-notify` (`sendNotifyEmail`; real `extractNotifyError` and template constant through `importActual`) and `@hmcts/email-rate-limit` (`isEmailRateLimitError` real through `importActual`). Set `GOVUK_NOTIFY_API_KEY` before import.

1. Valid request: calls `sendNotifyEmail` with the OTP template ID, trimmed email, `personalisation: { otp }`, `emailLimit: "HIGH"`, `emailDescription: "B2C OTP email"`, and returns `{ outcome: "SENT", referenceId }`
2. `otp` missing gives `VALIDATION_ERROR` and no send
3. `otp` empty string gives `VALIDATION_ERROR` and no send
4. `otp` not a string gives `VALIDATION_ERROR` and no send
5. `email` missing gives `VALIDATION_ERROR` and no send
6. `email` invalid format gives `VALIDATION_ERROR` and no send
7. Both invalid: both messages are in one `VALIDATION_ERROR`
8. Body `undefined`, `null` or an array gives `VALIDATION_ERROR`
9. Validation messages do not contain the submitted values
10. Rate-limit error gives `RATE_LIMITED` with the masked-email message
11. Notify HTTP error (`response.status` 400) gives `NOTIFY_ERROR` with Notify's message
12. Unknown error (no status, not rate limit) is rethrown
13. No `console.*` call contains the OTP or the full email (success and each failure path)

### `apps/api/src/routes/notify/otp.test.ts`

Mocks: `@hmcts/blob-ingestion` (`authenticateApi` pass-through spy; real `buildMessage` and `API_ROLE`) and `@hmcts/notifications` (`sendOtpEmail`).

1. Middleware order: `POST[0]` is not a parser, `POST[1].name === "jsonParser"`
2. `authenticateApi` called with `API_ROLE.B2C`
3. `SENT` gives 200, `text/plain`, body is the reference UUID only
4. `VALIDATION_ERROR` gives 400 `buildMessage(message)`
5. `RATE_LIMITED` gives `RATE_LIMIT_STATUS` `buildMessage(message)`
6. `NOTIFY_ERROR` gives 400 `buildMessage(message)`
7. Service throws: 500 generic body, and the log contains no error message, OTP or email
8. Parse error handler: `entity.parse.failed` gives 400, `entity.too.large` gives 413, other errors go to `next(error)`. Neither status logs `err.body` or `err.message`

### `libs/api/src/middleware/oauth-middleware.test.ts` (additions)

1. `authenticateApi()` with no argument still requires `api.publisher.user` (existing tests stay green)
2. `authenticateApi(API_ROLE.B2C)` with a token holding only `api.publisher.user` gives 403 with `Required role: api.request.b2c`
3. `authenticateApi(API_ROLE.B2C)` with a token holding `api.request.b2c` calls `next()`

### `libs/email-rate-limit/src/email-rate-limit.test.ts` (additions)

1. Thrown error satisfies `isEmailRateLimitError`, and the message is unchanged
2. `isEmailRateLimitError` returns false for a plain `Error` and for non-errors

### `libs/govuk-notify/src/notify-client.test.ts` (additions)

1. `emailDescription` is passed to `validateEmailRateLimit`
2. If it is omitted, `"Email"` is still passed (no regression)

### E2E

**One** test is justified, tagged `@nightly`: `e2e-tests/tests/api/otp-email.spec.ts`. Unit tests mock Notify, so they cannot show that the template ID exists in cath's Notify service or that the template's personalisation key really is `otp`. Notify rejects the send with `Missing personalisation: otp` if it is not, and that would only show up in production through B2C. The journey: get a token with `getApiAuthToken()`, confirm a request with no token gets 401, confirm an invalid body gets 400, then POST a valid request to a test address, read the reference UUID from the 200 body, and use `getGovNotifyEmailByReference(id)` to assert the template ID and that the body contains the OTP. The template now exists (`e24f0be1-...`). The test cannot run until `api.request.b2c` is assigned to the cath-service-api SP, so it can follow in a later PR. If the team decides not to do it, replace it with a one-off manual check against aat.

## 6. Decisions (follow legacy pip)

All open questions and clarifications are resolved by following pip-publication-services behaviour.

1. **App role:** dedicated `api.request.b2c` role, pip's `@IsB2C` value and its APIM gateway role. This follows the same rule as `api.publisher.user`, which is pip's gateway role name (`pip-data-management` api-policy.xml). cath uses one app (`cath-service-api`) for both hops, so each role is defined once. Register it in `hmcts/central-app-registration` `apps.yaml` (an `appRoles` entry and the `customApiPermissions` self-grant), then admin consent. Tracked in #619. `authenticateApi` gains an optional `requiredRole` parameter that defaults to `api.publisher.user`, so `v1/publication.ts` is unchanged. Someone still has to assign the role on the `cath-service-api` app registration in each tenant. Until then the route returns 403, so merging first is safe. Caveat: APIM's backend token will carry both roles, so separating the routes behind APIM is left to the #619 gateway policy.
2. **Notify template:** copy pip's `OTP_EMAIL` template ("B2C OTP email"): pip's wording, the `((otp))` placeholder, English only. pip's ID is `c51dc591-e956-43b2-8cc2-ac32bbcece3b`. None of cath's existing template IDs match pip's, so cath sends from a separate Notify service and pip's ID will not resolve with cath's API key. The template has been created in cath's Notify service: **`GOVUK_NOTIFY_TEMPLATE_ID_OTP = "e24f0be1-cb5f-491f-80f7-3f2562809f80"`** (2026-11-10). Its personalisation key must be `otp`, to match the `{ otp }` the service sends.
3. **Rate limit status:** `429`, matching pip. Its `RateLimitingService` throws `TooManyEmailsException`, which `GlobalExceptionHandler` maps to `TOO_MANY_REQUESTS`. `NotifyRateLimitTest.testRateLimitWithHighCapacity` asserts this for OTP. The ticket's "400 via `NotifyException`" was incorrect.
4. **Path:** `/notify/otp` with no `/v1` alias, matching pip.
5. **Success body:** plain text, just the reference UUID, matching pip. `B2cNotificationController` returns `handleOtpEmailRequest(body)` directly; `"OTP email successfully sent with referenceId: {Id}"` is only its Swagger `@ApiResponse` description. The ticket's acceptance criterion copied that description by mistake. Error bodies are JSON `{ message, timestamp }`, matching pip's error response.
6. **Rate limit counted once:** pip checks the limit once per send. Pass `emailLimit: "HIGH"` and `emailDescription: "B2C OTP email"` to `sendNotifyEmail` instead of calling `validateEmailRateLimit` a second time.
7. **Malformed or oversized body:** return `400` (`413` if too large) and log nothing from the body, matching Spring's default 400 on an unreadable message. Handled by the route-level `handleBodyParseError`. `/publication` has the same exposure; raise a follow-up ticket for it.
8. **Whitespace-only OTP:** accepted. pip's `@NotEmpty` only rejects missing or empty.
9. **Template ID per environment:** a single constant, as pip does with its `Templates` enum. Reword the acceptance criterion on the issue so nobody adds unused helm values.
10. **Email validation:** a port of Hibernate Validator's `@Email` (the validator behind pip's `OtpEmail`): unquoted dot-atom local part of at most 64 characters, RFC 5322 atom characters (including apostrophes) and non-ASCII; domain labels with internal hyphens only, no trailing dot, at most 255 characters, no TLD required. Quoted local parts and IP-literal domains are left out, because B2C's sign-up pattern can't create such accounts. Every test case was checked against Hibernate's own patterns. Found in review (HIGH 1).
