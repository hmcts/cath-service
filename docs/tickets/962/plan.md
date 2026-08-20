# Technical Plan — #962: Implement Rate Limiting for Email Notifications

## 0. Corrections to the earlier `@spec` comment on the issue

The spec comment posted on the issue (2026-08-20T14:18:29Z) was written without network access to
`pip-publication-services`. The reference source **has now been read**, and three of its load-bearing
assumptions are wrong. This plan supersedes them.

| Spec comment said | `pip-publication-services` actually does | Consequence |
| --- | --- | --- |
| Buckets held in an in-process `ConcurrentHashMap`; limiter is per-process | `RateLimitConfiguration` injects a Bucket4j `ProxyManager<String>` backed by **Redisson JCache over Redis** (`RedisConfiguration.java`). The limiter is **distributed** across replicas | An in-process limiter is *not* "the same implementation" (AC 3). Under HPA it multiplies the effective limit by the pod count. This plan is Redis-backed |
| `Refill.intervally` — one refill to full capacity at the 30-minute boundary | `Refill.greedy(capacity, Duration.ofMinutes(interval))` — tokens trickle back continuously | Behaviour differs materially: an exhausted `STANDARD` recipient regains 1 permit every 3 minutes, not 10 permits after 30. This plan implements greedy |
| Key `` `${email}:${GROUP}` ``; error message `Rate limit exceeded for email X in group Y` | Key `` `${prefix}::${email}` `` (prefix `1`=STANDARD, `2`=HIGH); message `Rate limit has been exceeded. %s failed to be sent to %s` (template description, masked email) | Cosmetic, but the message format is worth matching for log-grepping parity with OG CaTH |

Two further facts confirmed from source, both of which close open questions in the spec comment:

* **`Templates.java` grouping is confirmed.** Every `MEDIA_SUBSCRIPTION_*` template is `EmailLimit.HIGH`.
  Every media-account lifecycle template (`EXISTING_USER_WELCOME_EMAIL`, `MEDIA_NEW_ACCOUNT_SETUP`,
  `MEDIA_DUPLICATE_ACCOUNT_EMAIL`, `MEDIA_USER_VERIFICATION_EMAIL`, `MEDIA_USER_REJECTION_EMAIL`),
  the reporting templates and the inactive-user templates are `EmailLimit.STANDARD`.
  `SYSTEM_ADMIN_UPDATE_EMAIL`, `DELETE_LOCATION_SUBSCRIPTION` and `OTP_EMAIL` are also `HIGH` — CaTH has no
  equivalents today, but that establishes the rule for future templates: **fan-out or machine-triggered → `HIGH`;
  one-email-per-human-action → `STANDARD`.**
* **`EmailHelper.maskEmail`** is `email.replaceAll("(^([^@])|(?!^)\\G)[^@]", "$1*")` — keep the first character
  of the local part, replace every other local-part character with `*`, leave `@` and domain untouched.
* **Config values and env var names** (`application.yaml`): `STANDARD_MAX_EMAILS:10`,
  `HIGH_CAPACITY_MAX_EMAILS:200`, `EMAIL_RATE_LIMIT_INTERVAL:30`, `RATE_LIMIT_CACHE_EXPIRY:30`.

## 1. Technical Approach

### Strategy

Add one new library, `@hmcts/email-rate-limit`, holding a distributed greedy-token-bucket limiter, the
email-type→group map, the masking helper and the error type. Call it from the two libraries that send email.
No new pages, no new routes, no schema change.

The limiter exposes exactly the two entry points OG CaTH's `RateLimitingService` exposes, mapped onto the
AC's critical/non-critical split:

| OG CaTH | This plan | AC |
| --- | --- | --- |
| `validate(email, template)` → throws `TooManyEmailsException` | `assertEmailWithinRateLimit(email, emailType)` → throws `TooManyEmailsError` | AC: "throw a `TooManyEmailsException` for critical operations" |
| `isValid(email, template)` → logs `error`, returns `boolean` | `isEmailWithinRateLimit(email, emailType)` → logs `console.error`, returns `boolean` | AC: "log an error message for non-critical operations" |

Both consume exactly one permit on success and none on failure. A caller uses one or the other, never both
for the same send.

### Architecture decisions

**D1 — New library, not an addition to either existing one.** Both `@hmcts/notification` (media account
emails) and `@hmcts/notifications` (subscription emails) need the limiter. Neither depends on the other, and
their names differ by one character; making one depend on the other would be actively confusing. The new lib
depends only on `@hmcts/redis`.

**D2 — Redis-backed, because that is what the reference implementation is and because the numbers only mean
anything if they are shared.** `apps/web` autoscales under an HPA and `apps/api` also drives publication
notifications, so an in-process counter would make the real limit `pods × capacity` — an unstated and
unstable multiple of the AC's figures. `REDIS_URL` is already provisioned as a keyvault secret for **both**
apps (`apps/web/helm/values.yaml`, `apps/api/helm/values.yaml`) and `docker-compose.yml` runs Redis locally,
so no new infrastructure is required.

**D3 — Atomicity via a single Lua script, not read-modify-write from Node.** A `GET` then `SET` from
application code races across pods, which is exactly the failure mode `CLAUDE.md` documents for Prisma
`upsert` during seeding. One `EVALSHA` executes the whole refill-and-consume inside Redis.

**D4 — The bucket maths lives in one pure function, and the Lua script is its transliteration.**
`consumeToken(state, { capacity, windowMs, nowMs })` → `{ allowed, tokens, updatedAt }` is pure, exhaustively
unit-testable with `vi.setSystemTime`, and is also what the in-memory fallback store calls directly. The Lua
script is tested separately against a real Redis.

**D5 — In-memory fallback when no Redis URL is resolvable.** Unit tests, and local dev without
`docker-compose up`, must not need a Redis. When neither `REDIS_URL` nor `config.get("redis.url")` yields a
value the limiter uses a process-local `Map` with the same maths, and logs once that it is degraded to
per-process counting. This is not a production path — production always has `REDIS_URL`.

**D6 — Fail *open* when Redis errors.** If the `EVALSHA` rejects, log and permit the send. Rationale: this is
an anti-abuse throttle, not metering. Silently dropping every subscription notification in a publication
fan-out because Redis blipped is a worse outcome than briefly allowing over-limit sends. OG CaTH effectively
fails closed (Bucket4j propagates the cache exception); this is a deliberate divergence — see
CLARIFICATIONS NEEDED Q2.

**D7 — Async API.** Redis is I/O, so both entry points return promises. Every call site already sits in an
`async` function and already awaits the send.

**D8 — Keyed on a stable string email-type name, never on a Notify template UUID.** Template IDs come from
per-environment env vars (`GOVUK_NOTIFY_TEMPLATE_ID_*`), differ between local/STG/prod, and are secrets.
Keying on them would reproduce the environment-divergence class of bug that the `listTypeName` rule in
`CLAUDE.md` exists to prevent.

**D9 — Normalise the recipient address (`trim().toLowerCase()`) before building the key.** OG CaTH does not,
which lets `User@Example.com` and `user@example.com` each get a full allowance. Deliberate divergence; noted.

## 2. Implementation Details

**TEMPLATE SOURCE: n/a** — no new rendered page or list-type view. The only screen change reuses the existing
shared `errors/common.njk`.

### 2.1 New library — `libs/email-rate-limit` (`@hmcts/email-rate-limit`)

```
libs/email-rate-limit/
├── package.json
├── tsconfig.json
└── src/
    ├── index.ts                       # public exports
    ├── email-limit-group.ts           # EMAIL_LIMIT_GROUP, capacity/interval/TTL config reads
    ├── email-limit-group.test.ts
    ├── email-type.ts                  # EMAIL_TYPE -> group map
    ├── email-type.test.ts
    ├── mask-email.ts
    ├── mask-email.test.ts
    ├── too-many-emails-error.ts
    ├── token-bucket.ts                # pure consumeToken() — the maths
    ├── token-bucket.test.ts
    ├── bucket-store.ts                # Redis (Lua) store + in-memory fallback
    ├── bucket-store.test.ts
    ├── rate-limit-service.ts          # isEmailWithinRateLimit / assertEmailWithinRateLimit
    └── rate-limit-service.test.ts
```

No `config.ts` — the lib ships no templates, assets or API routes, so there is nothing for
`moduleRoot`/`assets`/`apiRoutes` to point at and nothing in `apps/web/src/app.ts` or `vite.config.ts` to
register. `package.json` therefore exports only `"."`.

`package.json`: `"type": "module"`, `"test": "vitest run"`, standard `build`/`dev`/`lint` scripts per
`CLAUDE.md`, `dependencies: { "@hmcts/redis": "workspace:*" }`, `devDependencies` pinned to the versions
already used by sibling libs.

### 2.2 `email-limit-group.ts`

```typescript
const DEFAULT_STANDARD_CAPACITY = 10;
const DEFAULT_HIGH_CAPACITY = 200;
const DEFAULT_INTERVAL_MINUTES = 30;
const DEFAULT_CACHE_EXPIRY_MINUTES = 30;
const MS_PER_MINUTE = 60_000;

export const EMAIL_LIMIT_GROUP = {
  STANDARD: "STANDARD",
  HIGH: "HIGH"
} as const;

export type EmailLimitGroup = (typeof EMAIL_LIMIT_GROUP)[keyof typeof EMAIL_LIMIT_GROUP];

export function getCapacity(group: EmailLimitGroup): number;
export function getWindowMs(): number;
export function getCacheExpiryMs(): number;
export function isRateLimitEnabled(): boolean;
```

Environment variables use the OG CaTH names so an existing ops configuration transfers unchanged:

| Variable | Default | Meaning |
| --- | --- | --- |
| `STANDARD_MAX_EMAILS` | `10` | Permits per interval for `STANDARD` |
| `HIGH_CAPACITY_MAX_EMAILS` | `200` | Permits per interval for `HIGH` |
| `EMAIL_RATE_LIMIT_INTERVAL` | `30` | Interval in minutes over which a bucket refills to full |
| `RATE_LIMIT_CACHE_EXPIRY` | `30` | Redis key TTL in minutes, refreshed on each access |
| `EMAIL_RATE_LIMIT_ENABLED` | `true` | Only the exact string `"false"` disables enforcement |

Read at each call, not captured at module load, so tests can use `vi.stubEnv` without module-cache
gymnastics. Parsed with `Number.parseInt(value, 10)`; `NaN` or `< 1` falls back to the default and logs
`[email-rate-limit] Invalid <VAR> "<value>", using default <n>`. A capacity of `0` is rejected rather than
honoured as "block everything" — an unset variable expanding to empty in a Helm template is far more likely
than a deliberate total block.

`EMAIL_RATE_LIMIT_ENABLED` is not in OG CaTH. It is added because the E2E journey needs to exhaust the limit
deterministically, and because a new throttle on a live send path needs a kill switch that does not require a
code change.

### 2.3 `email-type.ts`

```typescript
export const EMAIL_TYPE = {
  SUBSCRIPTION_NO_LINKS: "SUBSCRIPTION_NO_LINKS",
  SUBSCRIPTION_NON_SJP_PDF: "SUBSCRIPTION_NON_SJP_PDF",
  SUBSCRIPTION_PDF_EXCEL: "SUBSCRIPTION_PDF_EXCEL",
  SUBSCRIPTION_SJP_EXCEL_ONLY: "SUBSCRIPTION_SJP_EXCEL_ONLY",
  MEDIA_NEW_ACCOUNT: "MEDIA_NEW_ACCOUNT",
  MEDIA_DUPLICATE_ACCOUNT: "MEDIA_DUPLICATE_ACCOUNT",
  MEDIA_REJECTION: "MEDIA_REJECTION"
} as const;

export type EmailType = (typeof EMAIL_TYPE)[keyof typeof EMAIL_TYPE];

const EMAIL_TYPE_GROUPS: Record<EmailType, EmailLimitGroup> = {
  SUBSCRIPTION_NO_LINKS: EMAIL_LIMIT_GROUP.HIGH,
  SUBSCRIPTION_NON_SJP_PDF: EMAIL_LIMIT_GROUP.HIGH,
  SUBSCRIPTION_PDF_EXCEL: EMAIL_LIMIT_GROUP.HIGH,
  SUBSCRIPTION_SJP_EXCEL_ONLY: EMAIL_LIMIT_GROUP.HIGH,
  MEDIA_NEW_ACCOUNT: EMAIL_LIMIT_GROUP.STANDARD,
  MEDIA_DUPLICATE_ACCOUNT: EMAIL_LIMIT_GROUP.STANDARD,
  MEDIA_REJECTION: EMAIL_LIMIT_GROUP.STANDARD
};

export function getEmailLimitGroup(emailType: string): EmailLimitGroup;
```

The four `SUBSCRIPTION_*` types are exactly the four branches of `getSubscriptionTemplateId` in
`libs/notifications/src/govnotify/template-config.ts`. The mapping matches `Templates.java` as verified in §0.

`getEmailLimitGroup` returns `STANDARD` for an unrecognised type and logs
`[email-rate-limit] Unknown email type "<type>", defaulting to STANDARD group` — failing to the *more
restrictive* group so a mapping oversight cannot silently create an unlimited path.

### 2.4 `mask-email.ts`

```typescript
export function maskEmail(email: string): string;
```

Index-based build rather than the OG CaTH `\G` regex, which Sonar flags there and which is unreadable.
Same output:

| Input | Output |
| --- | --- |
| `test@example.com` | `t***@example.com` |
| `a@b.com` | `a@b.com` |
| `subscriber.one+tag@justice.gov.uk` | `s*****************@justice.gov.uk` |
| `""` | `""` |
| `not-an-email` | `n***********` |

The mask length equals the original local-part length, so the output cannot be used to infer a shorter address.

### 2.5 `too-many-emails-error.ts`

```typescript
export class TooManyEmailsError extends Error {
  readonly emailLimitGroup: EmailLimitGroup;
  readonly emailType: string;

  constructor(maskedEmail: string, emailType: string, group: EmailLimitGroup) {
    super(`Rate limit has been exceeded. ${emailType} failed to be sent to ${maskedEmail}`);
    this.name = "TooManyEmailsError";
    this.emailType = emailType;
    this.emailLimitGroup = group;
  }
}
```

Message format mirrors OG CaTH's `"Rate limit has been exceeded. %s failed to be sent to %s"` so log
searches transfer. Named `TooManyEmailsError`, not `...Exception`: `Error` is the JS/TS convention and
`Exception` is a Java-ism. See CLARIFICATIONS NEEDED Q1 if the AC wording is meant to bind the identifier.

The constructor takes an **already-masked** address, so the raw address cannot reach the message or the stack
by accident. `rate-limit-service.ts` is the only place that masks.

### 2.6 `token-bucket.ts` — the maths, as a pure function

```typescript
export interface BucketState {
  tokens: number;
  updatedAt: number;
}

export interface ConsumeResult {
  allowed: boolean;
  state: BucketState;
}

export function consumeToken(
  state: BucketState | null,
  options: { capacity: number; windowMs: number; nowMs: number }
): ConsumeResult;
```

Greedy refill, matching `Refill.greedy(capacity, Duration.ofMinutes(interval))`:

1. `state === null` → start at `{ tokens: capacity, updatedAt: nowMs }`.
2. Otherwise `elapsed = max(0, nowMs - state.updatedAt)` and
   `tokens = min(capacity, state.tokens + elapsed * capacity / windowMs)`, `updatedAt = nowMs`.
3. If `tokens >= 1`, decrement by 1 and `allowed = true`; otherwise `allowed = false` and tokens are left as
   they are.
4. `updatedAt` advances on every call, permitted or not — that is what makes the refill continuous rather
   than a window that a hot loop could push out indefinitely.

Fractional tokens are retained deliberately: with `HIGH` at 200 per 30 minutes a permit accrues every 9s, so
truncating would lose most of the refill.

### 2.7 `bucket-store.ts`

```typescript
export async function tryConsume(key: string, capacity: number, windowMs: number, ttlMs: number): Promise<boolean>;
export async function resetBuckets(): Promise<void>;   // test/E2E support only
```

Redis path — one `EVALSHA` of a script that is a line-by-line transliteration of `consumeToken`:

```lua
-- KEYS[1] = bucket key
-- ARGV = capacity, windowMs, nowMs, ttlMs
local state = redis.call('HMGET', KEYS[1], 'tokens', 'updatedAt')
local capacity, windowMs, nowMs, ttlMs =
  tonumber(ARGV[1]), tonumber(ARGV[2]), tonumber(ARGV[3]), tonumber(ARGV[4])
local tokens, updatedAt = tonumber(state[1]), tonumber(state[2])

if tokens == nil then
  tokens, updatedAt = capacity, nowMs
else
  local elapsed = nowMs - updatedAt
  if elapsed > 0 then
    tokens = math.min(capacity, tokens + (elapsed * capacity / windowMs))
  end
  updatedAt = nowMs
end

local allowed = 0
if tokens >= 1 then
  tokens = tokens - 1
  allowed = 1
end

redis.call('HSET', KEYS[1], 'tokens', tokens, 'updatedAt', updatedAt)
redis.call('PEXPIRE', KEYS[1], ttlMs)
return allowed
```

* `nowMs` is passed in by the caller rather than read from `redis.call('TIME')`, so the script is
  deterministic and the maths is testable with fake timers. Cost: cross-pod clock skew shifts the refill
  slightly. On AKS that is milliseconds against a 30-minute interval — negligible, and noted in a comment.
* The script SHA is cached in module scope after the first `SCRIPT LOAD`; a `NOSCRIPT` reply re-loads and
  retries once. This is the only retry.
* `PEXPIRE` on every access reproduces OG CaTH's `AccessedExpiryPolicy(30 min)`: idle recipients evict
  themselves, so there is no unbounded key growth and no sweep to write.
* Key format: `email-rate-limit:<GROUP>:<normalised-email>` — namespaced so it cannot collide with session
  keys in the same Redis, and readable in `redis-cli` (unlike OG CaTH's `1::user@example.com`).

Client acquisition: `getRedisClient()` from `@hmcts/redis`, which must first be changed to prefer
`process.env.REDIS_URL` — see §2.8. On any rejection from the client or the script: log
`[email-rate-limit] Redis unavailable, permitting send` and return `true` (D6).

In-memory fallback (D5): a module-scope `Map<string, BucketState>` driven by the same `consumeToken`, used
only when no Redis URL resolves. Logged once at first use.

`resetBuckets()` deletes the `email-rate-limit:*` keys (via `SCAN`, not `KEYS`) and clears the in-memory map.
It exists for unit tests and E2E fixtures; its doc comment states it must not be called from application code.

### 2.8 Change to `libs/redis/src/index.ts`

`getRedisClient()` currently does `config.get("redis.url")` unconditionally. `apps/api` has **no `config/`
directory** (only `apps/web` does), so that call throws there — and `apps/api` is on the publication
notification path. Change the URL resolution to:

1. `process.env.REDIS_URL` if set and non-empty;
2. otherwise `config.get("redis.url")` inside a `try`;
3. otherwise `null` → the caller falls back to the in-memory store.

This is behaviour-preserving in deployed environments, because
`apps/web/config/custom-environment-variables.json` already maps `redis.url` → `REDIS_URL`, so the two
sources agree wherever both exist. It also removes a latent crash for any future `apps/api` consumer of
Redis. Existing tests in `libs/redis/src/index.test.ts` assert `config.get("redis.url")` is called and must be
extended, not replaced: add cases for the env-var branch and the no-URL branch.

### 2.9 `rate-limit-service.ts`

```typescript
export async function isEmailWithinRateLimit(email: string, emailType: string): Promise<boolean>;
export async function assertEmailWithinRateLimit(email: string, emailType: string): Promise<void>;
```

`isEmailWithinRateLimit`:

1. `isRateLimitEnabled() === false` → return `true` without touching the store.
2. `email.trim()` empty → return `false`. An empty recipient can never produce a valid send; no key is created.
3. `group = getEmailLimitGroup(emailType)`; `key = \`email-rate-limit:${group}:${email.trim().toLowerCase()}\``.
4. `allowed = await tryConsume(key, getCapacity(group), getWindowMs(), getCacheExpiryMs())`.
5. On `false`, `console.error("[email-rate-limit] Rate limit has been exceeded. <emailType> failed to be sent to <masked>")`
   — mirroring OG CaTH's `isValid`, which logs at error level and returns the boolean.
6. Return `allowed`.

`assertEmailWithinRateLimit` calls `isEmailWithinRateLimit` and, on `false`, throws
`new TooManyEmailsError(maskEmail(email), emailType, group)`. It consumes a permit on success exactly like the
boolean form.

`index.ts` exports: `EMAIL_TYPE`, `EMAIL_LIMIT_GROUP`, types `EmailType`/`EmailLimitGroup`,
`isEmailWithinRateLimit`, `assertEmailWithinRateLimit`, `TooManyEmailsError`, `maskEmail`, `resetBuckets`.

### 2.10 Integration — non-critical path (`@hmcts/notifications`)

The check goes in `libs/notifications/src/notification/notification-service.ts`, not inside `sendEmail`,
because only the service layer knows the audit row to update and can classify the outcome as `Skipped`
rather than `Failed`.

Thread the email type from the template choice so the two cannot drift:

* `getSubscriptionTemplateId` (`govnotify/template-config.ts`) returns
  `{ templateId: string; emailType: EmailType }` instead of `string`. Its four branches map to
  `SUBSCRIPTION_NO_LINKS`, `SUBSCRIPTION_SJP_EXCEL_ONLY`, `SUBSCRIPTION_PDF_EXCEL`,
  `SUBSCRIPTION_NON_SJP_PDF` respectively. The existing "env var not set" throws are unchanged.
* `EmailTemplateData` (`notification-service.ts`) gains `emailType: EmailType`; `buildEmailDataWithFiles`
  returns it. `SendEmailParams` in `govnotify-client.ts` is untouched.

Two call sites gate the send:

* `processUserNotification` — after `createNotificationAuditLog` and after `buildEmailTemplateData`
  (which is what yields `emailType`), immediately before `sendEmail`:

  ```typescript
  if (!(await isEmailWithinRateLimit(subscription.user.email!, emailData.emailType))) {
    await updateNotificationStatus(notification.notificationId, "Skipped", undefined, "Email rate limit exceeded");
    return { status: "skipped", error: `User ${subscription.userId}: Email rate limit exceeded` };
  }
  ```

  No second `console.error` here — `isEmailWithinRateLimit` has already logged the masked address, and
  duplicating it would be the one place a raw address could creep back in.

* `processListTypeUserNotification` — the same check. This path writes no audit row today, so it returns
  `{ status: "skipped", error: \`User ${subscriber.userId}: Email rate limit exceeded\` }` only.

`aggregateResults` increments by status name and `UserNotificationResult` already includes `"skipped"`, so
`NotificationResult.skipped` picks up rate-limited recipients with **no change to the aggregation code**. The
`processPublication` summary in `libs/publication/src/processing/service.ts` therefore surfaces rate limiting
as a non-zero `skipped` count. The error strings deliberately contain no address; the existing
`[REDACTED_EMAIL]` regex in that file remains as belt-and-braces.

### 2.11 Integration — critical path (`@hmcts/notification`)

Each of the three functions in `libs/notification/src/govuk-notify-service.ts` gains one line, placed **after**
the existing configuration guards and **before** `new NotifyClient(...)`, so an unconfigured template still
throws its own configuration error rather than consuming a permit:

| Function | Email type |
| --- | --- |
| `sendMediaRejectionEmail` | `EMAIL_TYPE.MEDIA_REJECTION` |
| `sendMediaNewAccountEmail` | `EMAIL_TYPE.MEDIA_NEW_ACCOUNT` |
| `sendMediaDuplicateAccountEmail` | `EMAIL_TYPE.MEDIA_DUPLICATE_ACCOUNT` |

```typescript
await assertEmailWithinRateLimit(data.email, EMAIL_TYPE.MEDIA_REJECTION);
```

`libs/notification/package.json` gains `"@hmcts/email-rate-limit": "workspace:*"`.

### 2.12 Integration — controllers

`apps/web/src/pages/(admin)/media-applications/[id]/reject.ts` and `approve.ts` already wrap the send in an
inner `try/catch` nested inside the outer handler `try`. Extend that inner `catch` to branch on the error kind:

```typescript
} catch (error) {
  if (error instanceof TooManyEmailsError) {
    console.error(`Rejection email blocked by rate limit: ${error.message}`);
    return res.status(429).render("errors/common", {
      errorTitle: lang.errorMessages.emailRateLimitTitle,
      errorMessage: lang.errorMessages.emailRateLimitMessage
    });
  }
  const { status, message } = extractNotifyError(error);
  console.error(`Failed to send rejection email: ${status} ${message}`);
}
```

`error.message` is safe to log verbatim — the address in it is already masked. Returning from the inner catch
exits `postHandler` before the success redirect, and does not fall through to the outer catch.

Existing Notify failures keep their current log-then-redirect behaviour. Only the rate-limit branch surfaces
to the admin, because a rate limit is something they can act on (wait, then resend) whereas a transient
Notify 500 is not.

`errors/common` is rendered with `errorTitle`/`errorMessage` only, matching the ~30 existing call sites in
`apps/web/src/pages/(list-types)/*`. Note that `libs/web-core/src/views/errors/common.njk` additionally reads
`t.contactPrefix`/`t.contactLink`/`t.contactSuffix` for its contact paragraph; those come from
`errorCommon` in `libs/web-core/src/views/errors/en.ts`/`cy.ts` and are **not** currently passed by any
existing caller. Match existing behaviour — do not start passing `t` from these two controllers only.

Ordering is unchanged: `rejectApplication` / `approveApplication` still runs **before** the email attempt, so
a rate-limited email cannot silently reverse a committed admin decision. What changes is that the admin now
sees an explicit failure page instead of a silent log followed by a success redirect. See
CLARIFICATIONS NEEDED Q3.

### 2.13 Content

Add two keys to the existing `errorMessages` object in each of the four co-located locale files, preserving
en/cy structural parity:

`reject-en.ts`
```typescript
emailRateLimitTitle: "We could not send the email",
emailRateLimitMessage:
  "Too many emails have been sent to this address recently. The application decision has been saved. Try sending the email again in 30 minutes."
```

`approve-en.ts` — same title; message ends `"The account has been approved. Try sending the email again in 30 minutes."`

`reject-cy.ts` / `approve-cy.ts` — same keys with
`[WELSH TRANSLATION REQUIRED: '<English string>']` placeholders, per the `CLAUDE.md` convention.

Content notes: the copy avoids "rate limit" (implementation vocabulary); it states that the decision was
already saved, which is the single most important fact for the admin and prevents them retrying the decision
itself; and it gives one concrete recovery action. It does not show the recipient's address, masked or
otherwise — the admin already knows which application they are on, and a partially-masked address on screen
reads as a defect. The "30 minutes" is the default `EMAIL_RATE_LIMIT_INTERVAL`; if that is ever changed in a
deployed environment this copy becomes wrong (CLARIFICATIONS NEEDED Q5).

### 2.14 Wiring

* Root `tsconfig.json` `paths`: `"@hmcts/email-rate-limit": ["libs/email-rate-limit/src"]`.
* `libs/notification/package.json` and `libs/notifications/package.json`: add
  `"@hmcts/email-rate-limit": "workspace:*"`.
* `libs/email-rate-limit/package.json`: `"@hmcts/redis": "workspace:*"`.
* **No** `apps/web/src/app.ts` `modulePaths` entry and **no** `vite.config.ts` change — no templates, no assets.
* **No** `apps/api/src/app.ts` change — reached transitively via `@hmcts/publication` → `@hmcts/notifications`.
* **No** Prisma schema change and **no** migration. `notification_audit_log.status` is a free-form `String`,
  so `"Skipped"` needs no schema work, and it is already used by `skipNotification`.
* Helm: add the four tunables to `apps/web/helm/values.yaml` and `apps/api/helm/values.yaml` `environment`
  only if the defaults are not wanted. The defaults are the correct OG CaTH values, so **no Helm change is
  required** and none should be added speculatively.

## 3. Error Handling & Edge Cases

| Scenario | Handling |
| --- | --- |
| Redis unreachable / `EVALSHA` rejects | Log `[email-rate-limit] Redis unavailable, permitting send`; return `true` (fail open, D6) |
| `NOSCRIPT` after a Redis restart or `SCRIPT FLUSH` | Re-`SCRIPT LOAD` and retry once, then fail open |
| No Redis URL resolvable (unit tests, bare local dev) | In-memory `Map` store with identical maths; logged once as degraded (D5) |
| Empty / whitespace-only recipient | `isEmailWithinRateLimit` returns `false`, `assert*` throws; no bucket key created. Defence in depth — `validateUserEmail` and the `processListTypeUserNotification` guard already reject these upstream |
| Unmapped `emailType` | Resolve to `STANDARD` (the more restrictive group) and log a warning naming the type. The check still runs |
| Invalid config value (`NaN`, `0`, negative) | Fall back to the default and log; `0` is treated as invalid, not as "block everything" |
| Mixed case / padded address | Normalised with `trim().toLowerCase()` before key construction, so one recipient has one allowance |
| One subscriber rate-limited mid-fan-out | `Promise.allSettled` already isolates each subscriber; the blocked one returns `skipped` and every other subscriber is still processed |
| Rate limit hit on the critical path | `rejectApplication`/`approveApplication` has already committed; the admin gets `429` + `errors/common` and the decision stands |
| Rate-limited approval where `isNewUser` is false | Identical handling; the duplicate-account email is `STANDARD` too |
| Clock skew across pods | `nowMs` comes from each pod's clock; skew is milliseconds against a 30-minute interval. Documented in a comment, not compensated for |
| Fractional token accrual | `tokens` stored as a float; a `HIGH` permit accrues every ~9s and would be lost entirely if truncated |
| Rejected attempt in a hot loop | `updatedAt` advances but tokens are not consumed and the refill is continuous, so repeated rejections cannot push the recovery point out |
| Redis key growth | `PEXPIRE` on every access (`RATE_LIMIT_CACHE_EXPIRY`, default 30 min) evicts idle recipients — no sweep needed |
| `resetBuckets` in production | Exported for tests/E2E only; uses `SCAN` (never `KEYS`) and is documented as not-for-application-code |

## 4. Acceptance Criteria Mapping

| AC | How it is satisfied | Verification |
| --- | --- | --- |
| Track limits using a unique key for each user and email type | Key `email-rate-limit:<GROUP>:<normalised-email>` — per recipient, per limit group, mirroring OG CaTH's `email + EmailLimit`. The group **is** the email-type dimension, as in the reference implementation | `rate-limit-service.test.ts`: STANDARD and HIGH tracked independently for the same recipient; two recipients tracked independently |
| Configuration customisable based on email type and user | Per email type via `EMAIL_TYPE_GROUPS` → per-group capacity; per user because every recipient has an independent bucket. Capacities and interval are env-configurable at runtime | `email-limit-group.test.ts` with `vi.stubEnv`; `email-type.test.ts` for the mapping. Note: no per-*account* override exists — see Q6 |
| Follow the same implementation as `pip-publication-services` | Greedy token bucket in a shared Redis store; `validate`→`assert*` throws, `isValid`→`is*` logs+returns; grouping copied from `Templates.java`; masking copied from `EmailHelper`; env var names and defaults copied from `application.yaml`. Divergences are enumerated in §0 and §1 | Source-verified in §0. `token-bucket.test.ts` asserts greedy (not interval) refill |
| STANDARD group: 10 emails per 30 minutes | `STANDARD_MAX_EMAILS` default `10`, `EMAIL_RATE_LIMIT_INTERVAL` default `30` | `rate-limit-service.test.ts`: permits exactly 10 then rejects the 11th within one interval |
| HIGH group: 200 emails per 30 minutes | `HIGH_CAPACITY_MAX_EMAILS` default `200` | `rate-limit-service.test.ts`: permits exactly 200 then rejects the 201st |
| Throw `TooManyEmailsException` for critical operations | `assertEmailWithinRateLimit` throws `TooManyEmailsError` from the three media-account send functions; the controllers turn it into `429` + `errors/common` | `govuk-notify-service.test.ts`: throws and never constructs `NotifyClient`. `reject.test.ts`/`approve.test.ts`: renders `errors/common` with `429` |
| Log an error for non-critical operations | `isEmailWithinRateLimit` logs at `console.error` and returns `false`; the subscription paths record `Skipped` and continue | `notification-service.test.ts`: no `sendEmail` call, audit row `Skipped` / `"Email rate limit exceeded"`, `skipped` (not `failed`) incremented, remaining subscribers still sent |
| Email address masked in error messages | `maskEmail` is applied at the single point where a message is constructed; `TooManyEmailsError` only ever receives a masked string | `mask-email.test.ts`; plus an assertion in `notification-service.test.ts` and `rate-limit-service.test.ts` that the raw local part appears in **no** `console.error` argument and in no thrown message |

## 5. Test Plan

Time-dependent tests use `vi.useFakeTimers()` / `vi.setSystemTime()`. `resetBuckets()` runs in `beforeEach`
alongside `vi.clearAllMocks()`.

**`token-bucket.test.ts`** — starts full when state is null; consumes one token per call; rejects at zero;
refills proportionally to elapsed time (`capacity/2` tokens after half an interval); never exceeds capacity;
advances `updatedAt` on a rejected call without consuming; retains fractional tokens; treats negative elapsed
(clock going backwards) as zero.

**`mask-email.test.ts`** — masks all but the first local-part character; single-character local part
unchanged; dots and `+` tags handled; empty string; no `@`; mask length equals original local-part length.

**`email-limit-group.test.ts`** — defaults 10 / 200 / 30 minutes with no env set; honours valid overrides;
falls back and warns on non-numeric, zero and negative values; `EMAIL_RATE_LIMIT_ENABLED` disabled only by
the exact string `"false"` (not `"FALSE "`, not `"0"`).

**`email-type.test.ts`** — all four `SUBSCRIPTION_*` → `HIGH`; all three media types → `STANDARD`; unmapped
string → `STANDARD` with a warning; and a completeness assertion that every key of `EMAIL_TYPE` has an entry
in `EMAIL_TYPE_GROUPS`, so adding a type without a group fails the test run.

**`bucket-store.test.ts`** — with `@hmcts/redis` mocked: builds the expected key, passes capacity/window/TTL
as script arguments, returns the script's verdict, re-loads and retries once on `NOSCRIPT`, fails open on any
other rejection, and uses the in-memory store when no URL resolves.

**`rate-limit-service.test.ts`** — exactly 10 STANDARD then reject; exactly 200 HIGH then reject; groups
independent for one recipient; recipients independent; `User@Example.com` / `  user@example.com  ` share one
bucket; a permit is available again after one refill tick and not before; `true` without consuming when
disabled; `false` for an empty address; `assert*` throws `TooManyEmailsError` with `name`, `emailType` and
`emailLimitGroup` set and a masked message; `assert*` consumes a permit on success; no raw local part in any
log or message.

**`libs/redis/src/index.test.ts` (extended)** — prefers `REDIS_URL`; falls back to `config.get("redis.url")`;
returns null-URL behaviour when neither is available. Existing assertions retained.

**`libs/notifications/.../notification-service.test.ts` (extended)** — sends and records `Sent` when within
limit; skips with `Skipped` / `"Email rate limit exceeded"` and makes no `sendEmail` call when over;
increments `skipped` not `failed`; other subscribers in the batch still sent; masked address only;
`processListTypeUserNotification` covered as well as `processUserNotification`; the `emailType` threaded from
the selected template resolves to `HIGH`.

**`libs/notifications/.../template-config.test.ts` (extended)** — `getSubscriptionTemplateId` returns
`{ templateId, emailType }` for each of its four branches, each `emailType` resolving to `HIGH`; existing
"env var not set" throws unchanged.

**`libs/notification/src/govuk-notify-service.test.ts` (extended)** — each of the three functions sends
normally within limit, and throws `TooManyEmailsError` without constructing a `NotifyClient` when over;
configuration guards still fire first, before any permit is consumed.

**`reject.test.ts` / `approve.test.ts` (extended)** — redirect on success (unchanged); `429` +
`errors/common` with the rate-limit title/message on `TooManyEmailsError`; Welsh copy when `?lng=cy`;
`rejectApplication`/`approveApplication` still called before the blocked email; non-rate-limit Notify errors
keep log-then-redirect. Plus locale-key parity
(`Object.keys(en).sort()` equals `Object.keys(cy).sort()`) for all four content files.

**E2E — one journey, tagged `@nightly`.** A CTSC admin signs in, rejects a media application and reaches the
confirmation; then, with `STANDARD_MAX_EMAILS` set low enough that the limit is already spent, a second
rejection surfaces the "We could not send the email" page. Within that single test: assert the `h1`, run an
inline Axe-core scan expecting zero violations, switch to Welsh and assert the translated heading, and tab to
the contact-us link. No separate tests for accessibility, Welsh or copy.

**Not tested** — GOV.UK Notify's own service-level sending limits (out of our control); exact cross-pod
aggregate counts (Redis makes the limit shared, but asserting a precise global total in an E2E run would be
flaky for reasons unrelated to this code).

## 6. Accessibility

The one changed screen reuses `errors/common.njk`, already used for existing error states, so it inherits the
compliant layout. Requirements an implementer must not break: exactly one `h1` (`govuk-heading-l`), `<title>`
set from `errorTitle` so it matches the heading (WCAG 2.4.2); **no** `govukErrorSummary` — this is a
whole-page error state, not a form validation failure, and an error summary implies focusable fields to link
to; no colour-only signalling and no red styling; contact link uses descriptive text, not "click here";
skip link remains the first focusable element; correct `<html lang>` via the normal locale path; three short
plain-English sentences, no "rate limit"/"throttle"/"exception"; no time limit and no auto-refresh on the
page. The `429` is returned with a full HTML document so assistive technology gets normal document semantics.

WCAG 2.2 AA criteria relied on: 1.3.1, 1.4.1, 1.4.3, 2.1.1, 2.4.2, 2.4.4, 2.4.6, 3.1.2.

## 7. Risks

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Redis outage during a large publication fan-out | Limiter fails open, so a flood is briefly possible | Accepted (D6). The alternative — dropping every notification — is worse. Logged at error level so it is visible |
| Sharing Redis with the session store | A pathological key count could pressure the same instance | Keys are namespaced and TTL'd at 30 minutes; one key per (recipient, group) with traffic in the window |
| A future email send added without a rate-limit call | Silent gap in the control | The completeness assertion in `email-type.test.ts` catches a missing *group* but not a missing *call site*. Code review is the only guard; routing all Notify calls through one function is a sensible follow-up |
| Greedy refill is more permissive than a fixed window at the tail | An exhausted recipient regains a trickle rather than waiting the full interval | This is what OG CaTH does; matching it is the AC. Noted so it is not mistaken for a defect |
| User-facing "30 minutes" hardcoded | Copy goes stale if `EMAIL_RATE_LIMIT_INTERVAL` changes in a deployed environment | Flagged as Q5; interpolating the configured value is a small change if wanted |
| Rate limiting a genuine high-volume subscriber | Lost publication notifications, dropped not retried | 200 per 30 minutes is the OG CaTH-proven figure; watch `skipped` counts after release. Retry queue is out of scope (Q4) |

## 8. Out of Scope

* Retrying or queueing rate-limited subscription sends — they are dropped, as in OG CaTH.
* Per-account limit overrides (see Q6).
* Alerting or an Application Insights dashboard on rate-limit blocks (see Q7).
* Surfacing `Skipped` reasons in the system-admin notification views.
* Rate limiting any send path other than the seven email types in §2.3 — there are no others today.

---

## CLARIFICATIONS NEEDED

1. **`TooManyEmailsError` vs `TooManyEmailsException`.** The AC names `TooManyEmailsException`. This plan uses
   `TooManyEmailsError`, since `Error` is the JS/TS convention and `Exception` is a Java-ism carried over from
   the reference implementation. Confirm the AC is describing the OG CaTH counterpart rather than mandating the
   identifier. (Trivial to rename if it is binding.)

2. **Fail open or fail closed when Redis is unavailable?** This plan fails **open** — log and permit the send —
   on the grounds that this is an anti-abuse throttle and silently dropping every publication notification
   during a Redis blip is the worse failure. OG CaTH effectively fails **closed** (the Bucket4j cache
   exception propagates). Confirm fail-open is acceptable, since it is a deliberate divergence from
   "the same implementation".

3. **Should a rate-limited approval leave the account approved?** This plan keeps the current ordering, so the
   Azure AD account creation and the application state change commit *before* the email attempt, and the admin
   sees a `429` telling them the decision was saved. If product wants the whole action to fail atomically, the
   state change has to move after the email and the controllers need a transaction — a materially larger change.

4. **Are dropped subscription notifications acceptable?** A rate-limited subscriber never receives that
   publication notification; there is no retry. Confirm, or raise a follow-up for a retry queue.

5. **Is "30 minutes" safe to hardcode in the admin-facing copy?** It is the default
   `EMAIL_RATE_LIMIT_INTERVAL`. If that value may differ per environment, the copy should interpolate it —
   which affects the Welsh string structure, so it is worth deciding before translation is requested.

6. **What does "customisable based on the email type and user" mean for the *user* dimension?** This plan is
   customisable per email type (via group) and per user in the sense that every recipient has an independent
   bucket — but there is no per-*account* override, i.e. no way to grant one account a larger allowance. If
   overrides are wanted, that needs a data model and an admin UI, neither of which is in this ticket.

7. **Is monitoring expected in this ticket?** Application Insights is wired into both apps. The `skipped`
   count and the `[email-rate-limit]` error lines are the raw material for an alert on sustained blocking.
   Confirm whether a dashboard or alert is in scope here or a follow-up.

8. **Welsh translations needed.** Four strings (two keys × reject/approve). The plan lands
   `[WELSH TRANSLATION REQUIRED: ...]` placeholders per the `CLAUDE.md` convention; please confirm who
   supplies the translations and whether the placeholders may merge.
