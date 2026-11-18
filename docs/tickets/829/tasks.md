# Tasks: #829 Test connection on Manage subscriber

Paths relative to `/Users/kian.kwa/IdeaProjects/cath-service`. TEMPLATE SOURCE: migrate from pip-frontend src/main/views/system-admin/manage-third-party-subscribers-view.njk (partial: button and result banner only).

## Implementation Tasks

### Lib: `libs/third-party-user/src/`
- [x] Create `outbound-request.ts`: `sendOutboundRequest` with `http:`/`https:` check, `AbortSignal.timeout(30_000)`, `redirect: "manual"`, sanitised result (`response` / `timeout` / `invalid-url` / `network-error`), never returns or logs `error.message`
- [x] Create `outbound-request.test.ts`: protocol rejection, `AbortSignal.timeout` called with 30000, 2xx/3xx/4xx/5xx passthrough, `TimeoutError` -> timeout, other rejection -> network-error, no message leakage
- [x] Create `oauth-config.ts`: `getOauthConfig(userId)` reading the five secrets via `createKeyVaultSecretName` + `getSecret`; returns `undefined` unless all five are non-blank
- [x] Create `oauth-config.test.ts`: all present; each of the five missing or blank
- [x] Create `access-token.ts`: `requestAccessToken(config)` client-credentials POST (`grant_type`, `client_id`, `client_secret`, `scope`, form-encoded); typed failure for non-2xx, non-JSON, missing or non-string or empty `access_token`; no caching
- [x] Create `access-token.test.ts`: request shape, non-2xx incl. 3xx, non-JSON, missing/empty `access_token`, timeout, network error
- [x] Create `connection-test-service.ts`: `testThirdPartyConnection(userId)` returning `success | missing-configuration | token-failure | destination-failure | error`; fixed `FailureReason` kinds; outer try/catch; `console.error` with userId, stage and reason code only; types at the bottom of the file
- [x] Create `connection-test-service.test.ts` covering plan scenarios 1-10: success, missing configuration (5 secrets, no fetch), token failure (401, 302, non-JSON, no `access_token`), destination failure (403, 500, 302), timeout (token and destination), invalid URL, network error, unexpected throw, secret-leak scan of result and `console.error`, fresh token per call
- [x] Export `testThirdPartyConnection`, `ConnectionTestResult`, `FailureReason` from `libs/third-party-user/src/index.ts`

### Audit
- [x] Add `TEST_THIRD_PARTY_CONNECTION = "Test third party connection"` to `AuditLogAction` in `libs/system-admin-pages/src/audit-log/logger.ts` (alphabetical; no Prisma migration needed)

- [x] Add an opt-out to `libs/system-admin-pages/src/audit-log/middleware.ts` (`req.auditMetadata.shouldLog === false` skips the generic entry) with tests, because `res.render` ends in `res.send` and the global middleware would otherwise write a second, misleading "Completed successfully" entry (deviation from plan section 1, found while implementing)

### Page: `libs/system-admin-pages/src/pages/third-party-subscribers/[id]/manage/`
- [x] Add Test connection and result strings to `en.ts` (`testConnectionButton`, plus a `connectionTest` object, not `connectionResult`: `succeededTitle`, `failedTitle`, five messages, `reasonLabel`, four reason sentences) using the exact ticket wording
- [x] Add the same keys to `cy.ts` with the real Welsh from the table in `plan.md` section 2 (no `[WELSH TRANSLATION REQUIRED: ...]` placeholders). The Welsh is a draft: get it reviewed by a Welsh speaker before merge
- [x] Add a locale test: `en` and `cy` have identical key sets and no `cy` value contains `WELSH TRANSLATION REQUIRED`
- [x] Update `index.ts`: factor shared `renderManagePage`; add `postHandler` (same `findThirdPartyUserById` lookup as GET, redirect with `lngParam` if not found, call `testThirdPartyConnection`, build `connectionResult` view model, direct `logAction` with outcome in a try/catch, render); add `POST = [requireRole([USER_ROLES.SYSTEM_ADMIN]), postHandler]`; no `errors` key in render context and no `req.auditMetadata`
- [x] Update `index.njk` in legacy order: import `govukNotificationBanner`; under the `<h1>` put `<form method="post" novalidate>` with the secondary `govukButton` (`preventDoubleClick: true`), then the banner directly below the form (success type for success, default type for failure, `role: "alert"`, title text "Succeeded"/"Failed"), then the summary list; confirm banner HTML is escaped and that the result is announced after the POST (axe plus a screen reader check, since the banner is not before the `<h1>`) (escaping covered by `index.njk.test.ts`; axe only runs in the E2E, which could not run locally; screen reader check split out below)
- [x] Extend `index.test.ts` with plan scenarios 11-18: unknown id redirect (en and cy), success view model, each failure outcome with reason text, Welsh strings, audit call per outcome, audit failure still renders, no `errors` key / no `auditMetadata` / no secret writes, `POST` is `requireRole` + handler, GET has no `connectionResult`

### E2E
- [x] Create `e2e-tests/tests/system-admin/third-party-test-connection.spec.ts`: one journey (SSO login as in `system-admin-dashboard.spec.ts`; create subscriber; Test connection with no config -> "Failed" + missing-configuration message; Welsh toggle and axe; configure OAuth through the UI against the #620 endpoint; Test connection -> "Succeeded"; axe); skip when `THIRD_PARTY_TEST_CONNECTION_URL` is unset; not tagged `@nightly` (verified to list and to skip when the URL is unset; could not be run against an environment)
- [x] Clean up in the E2E by deleting the subscriber through the UI delete flow (calls `deleteSecrets`; prefix teardown does not remove Key Vault secrets)
- [ ] Add `THIRD_PARTY_TEST_CONNECTION_URL` to `.github/workflows/job.e2e-test.yml` once the APIM aat host source is confirmed (Clarification 4)

### Verify
- [x] Run `yarn test` for `@hmcts/third-party-user` and `@hmcts/system-admin-pages`, then `yarn lint:fix` and `yarn format`
- [ ] Screen reader check that the result banner is announced after the POST (not done; banner is below the h1, relying on `role="alert"`)
- [ ] Manual check locally (DB-backed secrets, `?lng=cy` too): no config -> "Failed"; config pointing at a local stub returning 200 -> "Succeeded"; wrong token URL status -> "Failed to generate access token." with `HTTP status`; check the audit log viewer shows the entry and that no secret appears in the server logs
- [ ] Confirm #620 is merged and applied to aat, and the preview pod can reach Entra and the APIM gateway, before expecting the E2E "Succeeded" step to pass
- [x] Decided and no longer open: legacy lookup left to #830, real Welsh required, SSRF scope accepted, partial config and Key Vault errors accepted, stage-specific failures, legacy banner order
- [ ] Still OPEN in `plan.md` section 6, resolve before implementing the affected tasks: (4) source of `THIRD_PARTY_TEST_CONNECTION_URL`, (5) confirm audit failure handling and action naming, (9) E2E credentials: reuse the API client or provision a dedicated Entra app registration
- [ ] Get the Welsh strings reviewed by a Welsh speaker before merge
