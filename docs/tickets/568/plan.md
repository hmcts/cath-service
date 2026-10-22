# Technical Plan: #568 Cache outgoing OAuth access tokens in Redis

## 1. Technical Approach

`getGraphApiAccessToken()` in `libs/auth/src/graph-api/client.ts` calls `login.microsoftonline.com` with a `client_credentials` grant on every call. The only caller today is `apps/web/src/pages/(admin)/media-applications/[id]/approve.ts`, which fetches one token per approval and passes it to `approveApplication` (find / create / update user in Azure AD B2C).

The plan ports the legacy pip-publication-services token cache to `libs/auth` and wraps the Graph token fetch with it.

### Legacy reference (source of truth for behaviour)

These files in [hmcts/pip-publication-services](https://github.com/hmcts/pip-publication-services) (`src/main/java/uk/gov/hmcts/reform/pip/publication/services/`) define the behaviour being ported:

| Legacy file | Behaviour |
|---|---|
| `config/RedisConfiguration.java` | A dedicated Redis cache `third-party_token-cache`, separate from the rate-limit cache, holding `ThirdPartyTokenInfo` values |
| `models/ThirdPartyTokenInfo.java` | Value is `{ accessToken, expiry }`, with `expiry` as epoch millis. `isExpired()` is `now >= expiry` |
| `service/thirdparty/ThirdPartyTokenCachingService.java` | `getCachedToken(key)` returns the token only if it is present and not expired, otherwise null. `cacheToken(key, token, expiresIn)` stores `expiry = now + (expiresIn - 60) * 1000`. If `expiresIn <= 60`, it stores `expiry = 0`, which is already expired, so it is never served |
| `service/thirdparty/ThirdPartyOauthService.java` | `getApiAccessToken`: cached token, or `requestApiAccessToken`, which fetches and then caches. A missing `expires_in` is treated as 0 |
| `service/thirdparty/ThirdPartyApiService.java` | Calls `getApiAccessToken` once per request. Retries with backoff reuse the same token. There is **no** eviction on 401 |

What the legacy code does **not** do, and therefore neither does this plan:
- no eviction or retry on a 401 from the downstream API
- no lock or de-duplication on concurrent misses
- no fallback when Redis is unavailable (cache errors propagate)
- no read timeout
- no client or tenant ID in the key: the key is the identity of the configured integration

### Flow

1. Read `oauth:token:<name>` from Redis and parse `{ accessToken, expiry }`. If it is present and `Date.now() < expiry`, return `accessToken` (legacy `getCachedToken`).
2. Otherwise fetch from the token endpoint, store `{ accessToken, expiry: now + (expires_in - 60) * 1000 }` with `SET EX` set to `expires_in - 60` seconds, and return the token (legacy `cacheToken`).

The Redis `EX` satisfies the ticket's "TTL = `expires_in - 60`" requirement and keeps Redis tidy. The stored `expiry` and its check on read mirror legacy `ThirdPartyTokenInfo.isExpired()`. Legacy uses a one-day Redis expiry plus the logical expiry check. Here the Redis TTL is the ticket's `expires_in - 60` instead.

### Redis ownership and dependency direction

- `@hmcts/redis` (`libs/redis/src/index.ts`) owns the shared lazy singleton `getRedisClient()`. It reads `redis.url` / `REDIS_URL`. `@hmcts/admin-pages` already uses it for the upload cache (`libs/admin-pages/src/manual-upload/storage.ts`). That is the "file upload cache" connection the ticket refers to.
- The session store client in `apps/web/src/app.ts` is not reachable from libs and is not used.
- `@hmcts/redis` has no workspace dependencies, so `@hmcts/auth -> @hmcts/redis` cannot create a cycle. It is already in the root `tsconfig.json` paths. The only wiring needed is `"@hmcts/redis": "workspace:*"` in `libs/auth/package.json`.

### Extensibility without speculation

Legacy keys the cache per configured third-party integration. The equivalent here is `getCachedAccessToken(name, fetchToken)`. Another outgoing integration supplies its own name and fetcher, and the helper contains nothing Graph-specific. No provider registry or config-driven providers.

### Key considerations

- **Mock mode:** the `MOCK_AZURE_B2C=true` short-circuit stays before any cache access, so mock tokens are never written to Redis.
- **Secrets:** the token must never be logged. Redis already holds user access tokens in session data, so exposure is not widened.

## 2. Implementation Details

**TEMPLATE SOURCE: n/a**

### File structure

```
libs/auth/
├── package.json                                   # MODIFY: add "@hmcts/redis": "workspace:*"
└── src/
    ├── graph-api/
    │   ├── client.ts                              # MODIFY: getGraphApiAccessToken uses the cache
    │   └── client.test.ts                         # MODIFY: mock @hmcts/redis, add cache tests
    └── oauth-token-cache/
        ├── token-cache.ts                         # NEW: port of ThirdPartyTokenCachingService
        └── token-cache.test.ts                    # NEW: unit tests (port of ThirdPartyTokenCachingServiceTest + miss/store)
```

### `libs/auth/src/oauth-token-cache/token-cache.ts` (new)

Module order follows CLAUDE.md: constants, then the exported function, then private helpers in order of use, then types.

```ts
import { getRedisClient } from "@hmcts/redis";

const CACHE_KEY_PREFIX = "oauth:token:";
const TOKEN_EXPIRY_BUFFER_SECONDS = 60;   // legacy TOKEN_EXPIRY_BUFFER_SECONDS

export async function getCachedAccessToken(name: string, fetchToken: () => Promise<OAuthToken>): Promise<string>
// 1. key = `${CACHE_KEY_PREFIX}${name}`
// 2. cached = await getCachedToken(key)   -> return if non-null      (legacy getCachedToken)
// 3. token = await fetchToken()            (errors propagate unchanged)
// 4. await cacheToken(key, token)                                     (legacy cacheToken)
// 5. return token.accessToken

async function getCachedToken(key: string): Promise<string | null>
// redis.get -> JSON.parse -> return accessToken if Date.now() < expiry, else null

async function cacheToken(key: string, token: OAuthToken): Promise<void>
// ttlSeconds = expiresIn - TOKEN_EXPIRY_BUFFER_SECONDS
// if ttlSeconds <= 0 -> return (legacy stores expiry 0, i.e. never served; Redis rejects EX <= 0, so skip the write — same observable result)
// redis.setEx(key, ttlSeconds, JSON.stringify({ accessToken, expiry: Date.now() + ttlSeconds * 1000 }))

export interface OAuthToken {
  accessToken: string;
  expiresIn: number;
}

interface CachedToken {   // legacy ThirdPartyTokenInfo
  accessToken: string;
  expiry: number;
}
```

- No try/catch around Redis, matching legacy. A Redis error propagates to the caller, as a JCache error does in legacy.
- Nothing is exported from `libs/auth/src/index.ts` until a consumer outside `libs/auth` exists.

### `libs/auth/src/graph-api/client.ts` (modify)

- Add `const GRAPH_API_TOKEN_CACHE_NAME = "graph-api";`, giving the key `oauth:token:graph-api`.
- `getGraphApiAccessToken()` keeps the `isB2CMocked()` early return, then returns `getCachedAccessToken(GRAPH_API_TOKEN_CACHE_NAME, fetchGraphApiToken)`. This mirrors legacy `getApiAccessToken`.
- Move the existing body (env var validation, `fetch`, error on `!response.ok`) into a private `fetchGraphApiToken(): Promise<OAuthToken>`, the equivalent of legacy `requestApiAccessToken`. It maps `{ access_token, expires_in }` to `{ accessToken, expiresIn }`. A missing `expires_in` maps to `0`, as in legacy.
- The public signature is unchanged, so `approve.ts` and its tests need no change.
- **Deliberate divergence from legacy:** legacy `requestApiAccessToken` swallows fetch errors and returns null. The current cath behaviour, throwing `Failed to obtain Graph API access token`, is kept. `approve.ts` already handles that error, and returning null would just move the failure into the Graph call.

### API endpoints / Database schema / Configuration

None.

## 3. Error Handling & Edge Cases

| Case | Behaviour | Legacy parity |
|---|---|---|
| Cached and `now < expiry` | Return cached token, no IdP call | `getCachedToken` |
| Cached but `now >= expiry` | Treated as a miss: re-fetch and re-store | `isExpired()` |
| Key absent (first call or Redis TTL elapsed) | Fetch and store | `getCachedToken` returns null |
| `expires_in <= 60` or missing | Return the token, nothing stored | Legacy stores `expiry = 0` (never served), so the result is the same |
| IdP non-2xx | The existing error propagates, nothing cached | Diverges (legacy returns null), see above |
| Credentials missing | Existing `Azure B2C credentials not configured` error on a miss | n/a |
| Redis error on get or set | Propagates, so the approval fails with the existing error handling | Same as legacy (no fallback) |
| Graph returns 401 with a cached token (revoked or rotated) | Not handled. Approvals fail until the cached token expires (at most `expires_in - 60`) or the key is deleted | Same as legacy (no eviction) |
| Concurrent misses | Each fetches, last write wins, both tokens valid | Same as legacy (no lock) |
| `MOCK_AZURE_B2C=true` | `"mock-access-token"`, no Redis access | n/a |

## 4. Acceptance Criteria Mapping

| AC | How it is satisfied | Verified by |
|---|---|---|
| Token cached in Redis after first fetch | `cacheToken` runs after a successful fetch on a miss | `token-cache.test.ts` miss test; `client.test.ts` asserts `setEx("oauth:token:graph-api", ...)` |
| TTL is `expires_in - 60` | `setEx` with `expiresIn - TOKEN_EXPIRY_BUFFER_SECONDS`; stored `expiry` uses the same buffer | `client.test.ts`: `expires_in: 3599` gives TTL 3539 |
| Cache hit returns the token without an IdP call | `getCachedToken` early return | Hit tests in both files (fetcher / `fetch` not called) |
| Cache miss fetches and stores | Miss path | `token-cache.test.ts` miss test |
| Key scoped (`oauth:token:graph-api`) | Prefix + `GRAPH_API_TOKEN_CACHE_NAME` | `client.test.ts` key assertion |
| Tests: hit, miss, expired | Ported from `ThirdPartyTokenCachingServiceTest` (`testGetCachedTokenReturnsToken`, `testGetExpiredTokenReturnsNull`, `testGetCachedTokenNotFound`) plus miss/store | `token-cache.test.ts` |
| Extensible | `(name, fetchToken)` helper with no Graph logic | Code review; tests use a non-Graph name |

## 5. Test Scenarios

Unit tests only (Vitest, AAA). Use the existing `@hmcts/redis` mock pattern from `libs/admin-pages/src/manual-upload/storage.test.ts`. Use `vi.useFakeTimers()` / `vi.setSystemTime()` for the expiry tests.

**`libs/auth/src/oauth-token-cache/token-cache.test.ts`**
1. Cache hit: an unexpired cached entry returns `accessToken`; the fetcher and `setEx` are not called (legacy `testGetCachedTokenReturnsToken`).
2. Expired token: a cached entry with `expiry <= now` triggers a re-fetch and a re-store (legacy `testGetExpiredTokenReturnsNull`).
3. Not found: `get` resolves null, so the token is fetched and stored under `oauth:token:<name>` with TTL `expiresIn - 60` and `expiry = now + (expiresIn - 60) * 1000` (legacy `testGetCachedTokenNotFound` + `cacheToken`).
4. `expiresIn` of 60 or less: the token is returned and `setEx` is not called.
5. Fetcher rejects: the error propagates and nothing is stored.

**`libs/auth/src/graph-api/client.test.ts` (update)**
6. Add the `@hmcts/redis` mock with `get` resolving null by default, so the existing `getGraphApiAccessToken` tests keep passing as misses. Add `expires_in` to the fetch mocks.
7. Miss: `setEx("oauth:token:graph-api", 3539, ...)` for `expires_in: 3599`.
8. Hit: returns the cached token and `fetch` is not called.
9. `MOCK_AZURE_B2C=true`: Redis is not touched.

**E2E:** not required. The change is backend-only, and E2E runs with `MOCK_AZURE_B2C=true`, which bypasses the token path.

## 6. CLARIFICATIONS NEEDED

These were resolved by following legacy pip-publication-services:
- **Key scoping:** one key per configured integration, `oauth:token:graph-api`, with no client or tenant ID (legacy keys by the integration's identity).
- **401 eviction / retry:** not implemented (legacy has none).
- **Concurrent-miss de-duplication:** not implemented (legacy has none).
- **Redis read timeout / fallback:** none. Redis errors propagate (legacy has no fallback).

Decided with the user:
- **Redis failure behaviour:** match legacy. There is no fallback, so a Redis error fails the media approval. Sessions share the same Redis, so an outage already blocks the admin pages.

No open clarifications remain.
