# #1320: Add POST /notify/otp endpoint to cath-service API

**State:** OPEN
**Assignees:** alao-daniel
**Author:** junaidiqbalmoj
**Labels:** type:story
**Created:** 2026-11-02T14:38:25Z
**Updated:** 2026-11-10T12:28:51Z

## Description

## Overview

Add a backend `POST /notify/otp` endpoint to `apps/api`. It sends a B2C one-time password (OTP) email through GOV.UK Notify. This is the backend that the APIM OTP API in #619 sits in front of. #619 cannot be finished until this endpoint exists, because its `service_url` / `path` and the "reachable through `cft-api-mgmt-stg`" acceptance criterion depend on it.

This copies the behaviour of `B2cNotificationController#sendOtpEmail` in [pip-publication-services](https://github.com/hmcts/pip-publication-services/blob/master/src/main/java/uk/gov/hmcts/reform/pip/publication/services/controllers/B2cNotificationController.java). It is the endpoint described in the password reset journey of #379: a B2C policy sends the user's email and OTP to APIM, APIM gets a token and calls the CaTH backend, and CaTH sends the email through GOV.UK Notify. No code for this exists in cath today (no `/notify/otp` route, no OTP template, no OTP email builder).

---

## Reference behaviour (pip-publication-services)

- `POST /notify/otp`, protected by bearer auth (`@IsB2C`)
- Request body (`OtpEmail`):
  - `otp`: string, required, not empty
  - `email`: string, required, valid email
- Sends Notify template `OTP_EMAIL` ("B2C OTP email") with personalisation `{ otp }`
- Rate limit group: `EmailLimit.HIGH`
- Responses: `200` with `OTP email successfully sent with referenceId: {id}`, `400` on validation or Notify error, `401` invalid token, `403` not authorised

---

## Proposed changes

### `apps/api/src/routes/notify/otp.ts` (new)

The route goes at `/notify/otp` so the APIM operation in #619 can forward it unchanged. It follows the `apps/api/src/routes/v1/publication.ts` pattern: authenticate first, then parse the body, so unauthenticated callers can't make the pod buffer a payload.

```typescript
export const POST = [
  authenticateApi(/* role: see open questions */),
  express.json({ limit: "10kb" }),
  async (req: Request, res: Response) => { /* validate → send → 200 */ }
];
```

### `libs/notifications`

- Add an OTP email sender (e.g. `src/otp/otp-email-service.ts`) that:
  1. validates `otp` (non-empty string) and `email` (valid format), returning field errors so the route can respond `400`
  2. calls `validateEmailRateLimit(email, "HIGH", "OTP email")` from `@hmcts/email-rate-limit`
  3. sends the OTP template through the existing `@hmcts/govuk-notify` client with personalisation `{ otp }`
  4. returns the Notify reference ID
- Export it from `src/index.ts`

### `libs/govuk-notify/src/template-ids.ts`

- Add `GOVUK_NOTIFY_TEMPLATE_ID_OTP`. The template must exist in cath's Notify service (see open questions).

### Logging

- Never log the OTP or the full email address. Mask the email, as `email-rate-limit` already does.

---

## Acceptance Criteria

- [ ] `POST /notify/otp` exists on `cath-api` and is served at that exact path
- [ ] Requests without a bearer token, or with an invalid or expired one, return `401` with the same body shape `authenticateApi` returns today
- [ ] Tokens without the required app role return `403`
- [ ] The body is parsed only after authentication succeeds
- [ ] A missing or empty `otp`, or a missing or invalid `email`, returns `400` and no email is sent
- [ ] A valid request sends the OTP Notify template to `email` with personalisation `otp`, and returns `200` with `OTP email successfully sent with referenceId: <id>`
- [ ] Exceeding the `HIGH` per-recipient rate limit returns an error and no email is sent (status code agreed with the open question below)
- [ ] A GOV.UK Notify failure returns an error response and doesn't crash the request
- [ ] The OTP and full email address never appear in logs
- [ ] The OTP template ID is configured for every environment where `local.deploy_apim` is true (aat/demo/perftest)
- [ ] Unit tests cover the route (auth, validation, success, rate limit, Notify failure) and the service, using AAA, with >80% coverage on the new business logic
- [ ] `infrastructure/resources/otp/swagger/api-swagger.json` in #619 matches this contract (path, `operationId: sendOtpEmail`, request and response schemas)

---

## Open questions

1. **App role:** `authenticateApi()` currently hard-codes `api.publisher.user`. The OTP caller is APIM, using its client-credentials token, not a publisher. Should the middleware accept a role parameter, and should a dedicated role (e.g. `api.b2c.user`, matching pip's `@IsB2C`) be added to the `cath-service-api` app registration?
2. **Notify template:** is the pip template (`c51dc591-e956-43b2-8cc2-ac32bbcece3b`) in a Notify service cath can use, or does a new template need creating in cath's Notify service? Who owns the wording (English and Welsh)?
3. **Rate limit response:** pip returns `400` (`NotifyException`) when the limit is hit. Keep `400` for parity, or use `429`?
4. **Path prefix:** use `/notify/otp` (pip parity, as above) or `/v1/notify/otp` to match `/v1/publication`? This decides the `path` / operation URL in #619.

## Dependencies

- Blocks #619 (APIM OTP API)
- Relates to #379 (Crime IDAM sign in / B2C password reset), #567 and #962 (email rate limiting)

## References

- pip `B2cNotificationController`, `OtpEmail`, `OtpEmailGenerator`, `Templates.OTP_EMAIL`
- cath: `apps/api/src/routes/v1/publication.ts`, `libs/api/src/middleware/oauth-middleware.ts`, `libs/email-rate-limit`, `libs/govuk-notify`, `libs/notifications`


## Comments

No comments on this issue.
