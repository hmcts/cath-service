# Tasks: #1320 Add POST /notify/otp endpoint

## Implementation Tasks

### Prerequisites (outside the repo)
- [x] OTP template created in cath's GOV.UK Notify service: `e24f0be1-cb5f-491f-80f7-3f2562809f80` (decision 2)
- [ ] (Tracked in #619) Get the `api.request.b2c` app role added to the `cath-service-api` app registration and assigned to its own service principal in each tenant (decision 1)

### `libs/email-rate-limit`
- [x] Set `name = "EmailRateLimitError"` on the error thrown by `validateEmailRateLimit` (message unchanged)
- [x] Add and export `isEmailRateLimitError(error: unknown): boolean` from `src/index.ts`
- [x] Test: thrown error satisfies `isEmailRateLimitError` and the message is unchanged
- [x] Test: `isEmailRateLimitError` is false for a plain `Error` and for non-error values

### `libs/govuk-notify`
- [x] Add `GOVUK_NOTIFY_TEMPLATE_ID_OTP` to `src/template-ids.ts` = `"e24f0be1-cb5f-491f-80f7-3f2562809f80"` (decision 2)
- [x] Add optional `emailDescription` to `SendNotifyEmailParams` and pass `params.emailDescription ?? "Email"` to `validateEmailRateLimit` in both send functions
- [x] Test: `emailDescription` is forwarded to `validateEmailRateLimit`
- [x] Test: `"Email"` is still passed when `emailDescription` is omitted

### `libs/api` (`@hmcts/blob-ingestion`)
- [x] Add `API_ROLE = { PUBLISHER: "api.publisher.user", B2C: "api.request.b2c" }` to `oauth-middleware.ts`, replacing `REQUIRED_ROLE`
- [x] Change the signature to `authenticateApi(requiredRole = API_ROLE.PUBLISHER)` and use `requiredRole` in the role check and the 403 message
- [x] Export `API_ROLE` from `src/index.ts`
- [x] Test: `authenticateApi()` with no argument still requires `api.publisher.user` (existing tests pass unchanged)
- [x] Test: `authenticateApi(API_ROLE.B2C)` with a publisher-only token returns 403 with `Required role: api.request.b2c`
- [x] Test: `authenticateApi(API_ROLE.B2C)` with an `api.request.b2c` token calls `next()`

### `libs/notifications`
- [x] Add `"@hmcts/email-rate-limit": "workspace:*"` to `package.json`
- [x] Create `src/otp/otp-email-service.ts` with `sendOtpEmail(request: unknown): Promise<OtpEmailResult>` (validate, send via `sendNotifyEmail` with `emailLimit: "HIGH"` and `emailDescription: "B2C OTP email"`, map errors to `RATE_LIMITED`/`NOTIFY_ERROR`, rethrow unknown)
- [x] Reuse `isValidEmail` from `src/notification/validation.ts`, and send the trimmed email
- [x] Log success with `notificationId` and `referenceId` only, and log failures without the OTP or email
- [x] Export `sendOtpEmail` and `type OtpEmailResult` from `src/index.ts`
- [x] Test: valid request calls `sendNotifyEmail` with the OTP template ID, trimmed email, `{ otp }`, `"HIGH"`, `"B2C OTP email"` plus `reference: <uuid>`, and returns `SENT` with that UUID as `referenceId`
- [x] Test: missing `otp` gives `VALIDATION_ERROR` and no send
- [x] Test: empty `otp` gives `VALIDATION_ERROR` and no send
- [x] Test: non-string `otp` gives `VALIDATION_ERROR` and no send
- [x] Test: missing `email` gives `VALIDATION_ERROR` and no send
- [x] Test: invalid `email` gives `VALIDATION_ERROR` and no send
- [x] Test: both fields invalid gives one `VALIDATION_ERROR` containing both messages
- [x] Test: `undefined`, `null` and array bodies give `VALIDATION_ERROR`
- [x] Test: validation messages do not contain the submitted values
- [x] Test: rate-limit error gives `RATE_LIMITED` with the masked-email message
- [x] Test: Notify HTTP error gives `NOTIFY_ERROR` with Notify's message
- [x] Test: unknown error is rethrown
- [x] Test: no `console.*` call contains the OTP or full email on the success and failure paths

### `apps/api`
- [x] Add `"@hmcts/notifications": "workspace:*"` to `apps/api/package.json` and run `yarn install`
- [x] Create `src/routes/notify/otp.ts`: `POST = [authenticateApi(API_ROLE.B2C), express.json({ limit: "10kb" }), handleBodyParseError, handler]`
- [x] Implement `handleBodyParseError`: `entity.parse.failed` gives 400, `entity.too.large` gives 413, both use `buildMessage` and log no `err.message` or `err.body`. Other errors go to `next(error)`
- [x] Implement `respondToOtpResult`: `SENT` gives 200 `text/plain` with the reference UUID only. `VALIDATION_ERROR` and `NOTIFY_ERROR` give 400. `RATE_LIMITED` gives `RATE_LIMIT_STATUS` (429)
- [x] Catch unexpected errors: 500 `buildMessage("Internal server error")`, logging `name` and `code` only
- [x] Test (`src/routes/notify/otp.test.ts`): `POST[0]` is not a parser and `POST[1].name === "jsonParser"`
- [x] Test: `authenticateApi` is called with `API_ROLE.B2C`
- [x] Test: `SENT` gives 200, `text/plain`, the exact success message
- [x] Test: `VALIDATION_ERROR` gives 400 with the message body
- [x] Test: `RATE_LIMITED` gives `RATE_LIMIT_STATUS` with the message body
- [x] Test: `NOTIFY_ERROR` gives 400 with the message body
- [x] Test: service throws, giving 500 generic body, and the log has no error message, OTP or email
- [x] Test: `handleBodyParseError` gives 400 for parse failure and 413 for too large, logs no body or message, and calls `next(error)` for other errors

### Docs
- [x] Add `/notify/otp` (`operationId: sendOtpEmail`, `azureAd` security, `OtpEmail` request schema, 200/400/401/403/413/500 responses) to `docs/api/openapi.yaml`
- [x] Run `yarn openapi:publisher` and confirm `infrastructure/resources/swagger/api-swagger.json` is unchanged (`/notify/otp` is not in `apim-operations.json`)
- [ ] Post the contract on #619 so its `infrastructure/resources/otp/swagger/api-swagger.json` matches

### E2E (after the template and role exist)
- [x] Add `e2e-tests/tests/api/otp-email.spec.ts` (`@nightly`): no token gives 401, invalid body gives 400, valid request gives 200, then `getGovNotifyEmail(referenceId)` confirms the template ID and that the OTP appears in the body

### Verification
- [x] `yarn lint:fix` and `yarn test` from the repo root
- [x] `yarn test:coverage`: over 80% on `otp-email-service.ts` and `routes/notify/otp.ts`
- [ ] Manual `curl` against local API (`yarn dev`) with a real token: 200 and the email arrives through the Notify test key
- [ ] Reword the "template ID configured per environment" AC on the issue (decision 9)
