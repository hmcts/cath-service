# Implementation Tasks — #962: Rate Limiting for Email Notifications

## Prerequisite

- [ ] Read the "Corrections to the earlier `@spec` comment" section of `plan.md` before writing any code — the
      spec comment on the issue is wrong about the storage layer and the refill strategy
- [ ] Answer, or record an assumption for, the questions in `CLARIFICATIONS NEEDED` (Q2 fail-open and Q3
      approval ordering change behaviour; the rest do not block)

## Redis client

- [ ] Change `getRedisClient()` in `libs/redis/src/index.ts` to resolve the URL from `process.env.REDIS_URL`
      first, then `config.get("redis.url")` inside a `try`, then `null`
- [ ] Extend `libs/redis/src/index.test.ts` with the env-var branch, the config fallback branch and the
      no-URL branch; keep the existing assertions

## New library scaffold — `libs/email-rate-limit`

- [ ] Create `libs/email-rate-limit/package.json` (`@hmcts/email-rate-limit`, `"type": "module"`, single `"."`
      export, `test: "vitest run"`, depends on `@hmcts/redis`) — no `./config` export, the lib ships no assets
- [ ] Create `libs/email-rate-limit/tsconfig.json` extending the root config
- [ ] Register `"@hmcts/email-rate-limit": ["libs/email-rate-limit/src"]` in the root `tsconfig.json` `paths`

## Core primitives

- [ ] `src/mask-email.ts` — keep the first local-part character, `*` the rest, leave `@`+domain intact
- [ ] `src/mask-email.test.ts` — normal address, single-char local part, dotted/`+tag` address, empty string,
      no `@`, mask length equals original local-part length
- [ ] `src/email-limit-group.ts` — `EMAIL_LIMIT_GROUP`, `getCapacity`, `getWindowMs`, `getCacheExpiryMs`,
      `isRateLimitEnabled`; read env at call time; defaults 10 / 200 / 30 / 30; invalid or `0` falls back and logs
- [ ] `src/email-limit-group.test.ts` — defaults, valid overrides, non-numeric/zero/negative fallbacks,
      `EMAIL_RATE_LIMIT_ENABLED` disabled only by the exact string `"false"`
- [ ] `src/email-type.ts` — `EMAIL_TYPE` (4 × `SUBSCRIPTION_*`, 3 × media), `EMAIL_TYPE_GROUPS`
      (subscriptions → `HIGH`, media → `STANDARD`), `getEmailLimitGroup` defaulting to `STANDARD` with a warning
- [ ] `src/email-type.test.ts` — every mapping, unknown type → `STANDARD` + warning, and a completeness
      assertion that every `EMAIL_TYPE` key has a group
- [ ] `src/too-many-emails-error.ts` — `TooManyEmailsError` with `name`, `emailType`, `emailLimitGroup` and the
      message `Rate limit has been exceeded. <emailType> failed to be sent to <maskedEmail>`; takes an
      already-masked address

## Token bucket

- [ ] `src/token-bucket.ts` — pure `consumeToken(state, { capacity, windowMs, nowMs })` implementing **greedy**
      refill; null state starts full; `updatedAt` advances even on rejection; fractional tokens retained
- [ ] `src/token-bucket.test.ts` — starts full, consumes one per call, rejects at zero, proportional refill,
      never exceeds capacity, rejected call advances `updatedAt` without consuming, negative elapsed treated as zero

## Bucket store

- [ ] `src/bucket-store.ts` — `tryConsume(key, capacity, windowMs, ttlMs)` via a single Lua `EVALSHA`
      (`HMGET` → refill → `HSET` → `PEXPIRE`), transliterated from `consumeToken`, with `nowMs` passed in
- [ ] Cache the script SHA in module scope; on `NOSCRIPT` re-`SCRIPT LOAD` and retry **once**
- [ ] Fail open on any other Redis rejection, logging `[email-rate-limit] Redis unavailable, permitting send`
- [ ] In-memory `Map` fallback using the same `consumeToken` when no Redis URL resolves; log once as degraded
- [ ] `resetBuckets()` — `SCAN` (never `KEYS`) + delete `email-rate-limit:*`, clear the map; document as
      test/E2E-only
- [ ] `src/bucket-store.test.ts` — key format, script arguments, verdict pass-through, `NOSCRIPT` retry,
      fail-open, in-memory fallback selection

## Service API

- [ ] `src/rate-limit-service.ts` — `isEmailWithinRateLimit` (disabled → `true`; empty address → `false`;
      key `email-rate-limit:<GROUP>:<trim().toLowerCase()>`; log masked `console.error` on block) and
      `assertEmailWithinRateLimit` (throws `TooManyEmailsError`)
- [ ] `src/index.ts` — export `EMAIL_TYPE`, `EMAIL_LIMIT_GROUP`, `EmailType`, `EmailLimitGroup`,
      `isEmailWithinRateLimit`, `assertEmailWithinRateLimit`, `TooManyEmailsError`, `maskEmail`, `resetBuckets`
- [ ] `src/rate-limit-service.test.ts` — exactly 10 STANDARD then reject; exactly 200 HIGH then reject; groups
      independent per recipient; recipients independent; case/whitespace variants share a bucket; permit returns
      after one refill tick and not before; disabled short-circuit consumes nothing; empty address; `assert*`
      throws with masked message and populated fields; `assert*` consumes on success; no raw local part in any
      log or message

## Non-critical integration — `@hmcts/notifications`

- [ ] Add `"@hmcts/email-rate-limit": "workspace:*"` to `libs/notifications/package.json`
- [ ] Change `getSubscriptionTemplateId` in `libs/notifications/src/govnotify/template-config.ts` to return
      `{ templateId, emailType }`; map its four branches to `SUBSCRIPTION_NO_LINKS`,
      `SUBSCRIPTION_SJP_EXCEL_ONLY`, `SUBSCRIPTION_PDF_EXCEL`, `SUBSCRIPTION_NON_SJP_PDF`
- [ ] Add `emailType: EmailType` to `EmailTemplateData` and return it from `buildEmailDataWithFiles` /
      `buildEmailTemplateData` in `notification-service.ts`
- [ ] Gate `processUserNotification`: after the audit row and the email-data build, before `sendEmail` —
      on block, `updateNotificationStatus(id, "Skipped", undefined, "Email rate limit exceeded")` and return
      `{ status: "skipped", error: \`User <id>: Email rate limit exceeded\` }`; do **not** log again
- [ ] Gate `processListTypeUserNotification` the same way, without an audit row
- [ ] Confirm `aggregateResults` needs no change (it increments by status name)
- [ ] Extend `template-config.test.ts` for the new return shape and the four `emailType` values
- [ ] Extend `notification-service.test.ts` — sends within limit; skips with `Skipped` /
      `"Email rate limit exceeded"` and no `sendEmail` when over; `skipped` not `failed`; other subscribers in
      the batch still sent; masked address only; both notification functions covered

## Critical integration — `@hmcts/notification`

- [ ] Add `"@hmcts/email-rate-limit": "workspace:*"` to `libs/notification/package.json`
- [ ] Add `await assertEmailWithinRateLimit(data.email, EMAIL_TYPE.MEDIA_REJECTION)` to
      `sendMediaRejectionEmail`, after the config guards and before `new NotifyClient(...)`
- [ ] Same for `sendMediaNewAccountEmail` (`MEDIA_NEW_ACCOUNT`) and `sendMediaDuplicateAccountEmail`
      (`MEDIA_DUPLICATE_ACCOUNT`)
- [ ] Extend `libs/notification/src/govuk-notify-service.test.ts` — each function sends within limit, throws
      `TooManyEmailsError` without constructing a `NotifyClient` when over, and config guards still fire first

## Controllers and content

- [ ] Add `emailRateLimitTitle` / `emailRateLimitMessage` to the existing `errorMessages` object in
      `reject-en.ts` (message states the decision was saved and to retry in 30 minutes)
- [ ] Same keys in `approve-en.ts` (message states the account was approved)
- [ ] Add both keys to `reject-cy.ts` and `approve-cy.ts` as `[WELSH TRANSLATION REQUIRED: '<English>']`
- [ ] In `reject.ts`, branch the inner `catch` on `error instanceof TooManyEmailsError` →
      `return res.status(429).render("errors/common", { errorTitle, errorMessage })` from `lang.errorMessages`;
      leave the existing `extractNotifyError` log-then-redirect path untouched
- [ ] Same in `approve.ts`, inside the inner email `try/catch` so the outer `alreadyReviewed`/`azureAdFailed`
      handling is unaffected
- [ ] Keep the send **after** `rejectApplication` / `approveApplication` — do not reorder
- [ ] Extend `reject.test.ts` / `approve.test.ts` — success redirect unchanged; `429` + `errors/common` on
      `TooManyEmailsError`; Welsh copy with `?lng=cy`; decision still committed before the blocked email;
      non-rate-limit Notify errors unchanged
- [ ] Add locale-key parity assertions (`Object.keys(en).sort()` equals `Object.keys(cy).sort()`) for the four
      content files

## E2E

- [ ] Add **one** `@nightly` journey to `e2e-tests/tests/` — CTSC admin rejects an application successfully,
      then hits the "We could not send the email" page with the limit spent; inside that single test assert the
      `h1`, run an inline Axe scan expecting zero violations, check the Welsh heading, and tab to the contact link

## Verification

- [ ] `yarn lint:fix` and `yarn format`
- [ ] `yarn test` — full suite green from the repo root
- [ ] `yarn test:coverage` — confirm `libs/email-rate-limit` is above 80%
- [ ] Manual check with `docker-compose up` Redis running: send 10 media rejections to the same address, confirm
      the 11th shows the error page, confirm the key exists in `redis-cli` with a TTL, and confirm the raw
      address appears nowhere in the logs
- [ ] Manual check with Redis stopped: sends still succeed and the fail-open line is logged
- [ ] Confirm no Helm change is needed (defaults are the required 10 / 200 / 30 values)
