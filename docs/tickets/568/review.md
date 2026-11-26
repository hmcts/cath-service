# Code Review: Issue #568

## Summary

This change caches the Microsoft Graph `client_credentials` access token in Redis under `oauth:token:graph-api`. Before, `getGraphApiAccessToken()` requested a new token from `login.microsoftonline.com` every time it was called.

- **New generic helper:** `getCachedAccessToken(name, fetchToken)` in `libs/auth/src/oauth-token-cache/token-cache.ts`. It ports the pip-publication-services `ThirdPartyTokenCachingService` / `ThirdPartyTokenInfo`.
- **Refactor:** `getGraphApiAccessToken()` (`libs/auth/src/graph-api/client.ts:78-85`) keeps its `MOCK_AZURE_B2C` early return and then delegates to the helper. The old fetch code now lives in a private `fetchGraphApiToken()` (`client.ts:228-263`).
- **Redis connection:** uses the existing shared `getRedisClient()` singleton from `@hmcts/redis`, the same client the admin-pages upload cache uses.

Files changed:
- `libs/auth/package.json:39`: adds `"@hmcts/redis": "workspace:*"`, declared the same way as in `libs/admin-pages/package.json:37`.
- `yarn.lock`: one line, the workspace dependency entry.
- `libs/auth/src/graph-api/client.ts` and `client.test.ts`: modified.
- `libs/auth/src/oauth-token-cache/token-cache.ts` and `token-cache.test.ts`: new.

The public signature of `getGraphApiAccessToken()` has not changed. Its only caller, `apps/web/src/pages/(admin)/media-applications/[id]/approve.ts:89`, needs no change.

**Changes since the previous review:** two of its suggestions are done:
- `fetchGraphApiToken` now throws if the response has no `access_token` (`client.ts:258-260`), with a test at `client.test.ts:338-349`. A 2xx response without a token can no longer put a `{ expiry }`-only entry in the cache.
- The comment explaining the skipped write was reworded and no longer just says "Legacy" (`token-cache.ts:32`).

The other two suggestions are still open (see Suggestions 1 and 2).

Automated checks run during this review:

| Check | Result |
|---|---|
| `libs/auth` vitest with coverage | 21 files, 233 tests, all passed |
| `libs/auth` `tsc --noEmit` | clean |
| Biome check on `libs/auth` | 45 files, no issues |
| `apps/web` media-applications tests (the caller) | 15 files, 127 tests, passed |

### Accepted risks (agreed with the user in `plan.md` §6, not raised as issues)

These match the legacy pip-publication-services behaviour:

- **No fallback when Redis fails.** A Redis error on `get` or `setEx` propagates. `approve.ts:104-126` catches it and shows `azureAdFailed`. Sessions use the same Redis, so an outage already blocks the admin pages.
- **No eviction or retry when Graph returns a 401.** If the cached token is revoked, or the secret or app is rotated, approvals fail for up to about 59 minutes, or until someone deletes the key by hand.
- **No de-duplication of concurrent misses,** in-process or across pods. Each miss fetches its own token and the last write wins. All of those tokens are valid, so the only cost is a few extra IdP calls during a cold start. Given how rarely media approvals happen, this is acceptable.
- **The key `oauth:token:graph-api` contains no client or tenant ID.** After a credential change, a shared Redis keeps serving the old token until it expires.

## 🚨 CRITICAL Issues

None.

## ⚠️ HIGH PRIORITY Issues

None.

## 💡 SUGGESTIONS

1. **A malformed cached value fails every approval until it expires.** (`libs/auth/src/oauth-token-cache/token-cache.ts:26-27`, still open from the previous review)
   - **Problem:** `JSON.parse(value) as CachedToken` throws when the value is not JSON, and nothing checks the shape of the result.
     - A bad value could come from manual debugging, a future change to the stored format, or another writer.
     - When parsing throws, every approval fails until the Redis TTL runs out, which can be about 59 minutes.
     - When the parsed object has `expiry` but no `accessToken`, `undefined` is returned through a `string` return type.
   - **Benefit:** this is about the stored data being wrong, not Redis being down. Handling it does not conflict with the agreed "no fallback on Redis errors" decision.
   - **Approach:** add a small type guard, for example `isCachedToken(value: unknown): value is CachedToken`, which checks that `accessToken` is a string and `expiry` is a number. Treat a parse failure or a failed guard as a miss, so the next fetch overwrites the bad entry. This also removes the `as` assertion, which the review standards say to prefer type guards over. The risk is low because only this module writes the key.

2. **Add a test that pins the agreed Redis-error behaviour.** (`libs/auth/src/oauth-token-cache/token-cache.test.ts`, still open from the previous review)
   - **Benefit:** "Redis errors propagate, no fallback" is a deliberate decision, but no test records it. Someone could later wrap the calls in try/catch without realising they are changing agreed behaviour.
   - **Approach:** add one test where `mockRedisClient.get.mockRejectedValue(new Error("Redis down"))`. Assert that `getCachedAccessToken` rejects with that error and that `fetchToken` is not called.

3. **`expires_in` is trusted without validation.** (`libs/auth/src/graph-api/client.ts:257,262`)
   - **Problem:** only `undefined` is defaulted, by `?? 0`. If the value is `null` it still becomes 0, but if it is a non-numeric string, `ttlSeconds` becomes `NaN`. `NaN <= 0` is false, so `setEx(key, NaN, ...)` runs, Redis rejects it, and the approval fails even though a valid token was obtained.
   - **Approach:** use `expiresIn: Number.isFinite(data.expires_in) ? data.expires_in : 0`, or check the type alongside the `access_token` guard. Azure always returns a number, so this is defensive hardening only.

4. **Add a test at the TTL boundary.** (`token-cache.test.ts:75-85`)
   - **Benefit:** the test for "60 seconds or less" covers `expiresIn: 60`, which gives a TTL of 0. Nothing covers `expiresIn: 61`, which gives a TTL of 1, so changing `<= 0` to `< 0` or `<= 1` would go unnoticed.
   - **Approach:** add one test asserting `setEx(CACHE_KEY, 1, ...)` when `expiresIn` is 61.

## ✅ Positive Feedback

- **Security**
  - The token is never logged.
  - The only error text that includes response data is the existing `Failed to obtain Graph API access token: <status> <body>` (`client.ts:253-254`). That body is the IdP's error response, not a token.
  - The `MOCK_AZURE_B2C` early return (`client.ts:79-82`) happens before any Redis access. `client.test.ts:255-256` asserts Redis is not touched in mock mode, so mock tokens cannot end up in a shared cache.
  - A failed fetch (`client.test.ts:335`) and a missing `access_token` (`client.test.ts:348`) both write nothing to the cache.
- **Faithful port, with the right deviations**
  - The stored `{ accessToken, expiry }` and the `Date.now() < expiry` check mirror `ThirdPartyTokenInfo.isExpired()`.
  - When `ttl <= 0` the write is skipped. This gives the same result as legacy storing `expiry = 0`, and avoids Redis rejecting `EX 0`. The comment at `token-cache.ts:32` now explains why.
  - The existing throw on a non-2xx response is kept instead of legacy's return-null.
- **Extensible without speculation**
  - `getCachedAccessToken(name, fetchToken)` contains nothing specific to Graph.
  - It is not exported from `libs/auth/src/index.ts`, which avoids exporting only for tests and follows YAGNI.
- **CLAUDE.md conventions**
  - Module order is correct: constants (`token-cache.ts:3-4`), then the exported function, then private helpers in order of use, then interfaces at the bottom (`token-cache.ts:45-53`).
  - Relative imports use `.js`, there is no `any`, the style is functional, constants use SCREAMING_SNAKE_CASE and names are kebab-case.
  - There is only one comment, and it explains why rather than what.
- **No dependency cycle:** `@hmcts/redis` has no workspace dependencies.
- **Tests**
  - They follow AAA and use fake timers.
  - The expired case sets `expiry: NOW`, which exercises the exact `now >= expiry` boundary (`token-cache.test.ts:48`).
  - The stored payload is checked exactly (`token-cache.test.ts:71-72`).
  - The missing `expires_in`, short-lived token, fetch failure and missing `access_token` cases are all covered.
- **Performance:** a cache hit swaps an HTTPS round trip to `login.microsoftonline.com` for one Redis `GET` on an already-open connection. A miss adds one `GET` and one `SETEX`, which is negligible. Nothing blocks, and only one small key is stored, so memory use is trivial.

## Test Coverage Assessment

- **Unit tests:** good.
  - **`token-cache.test.ts`, 5 tests:**
    - a cache hit makes no fetch and no store (`:31`)
    - an expired entry is fetched and stored again (`:46`)
    - a miss fetches and stores with a buffered TTL and expiry (`:60`)
    - `expiresIn <= 60` stores nothing (`:75`)
    - a fetcher rejection propagates and stores nothing (`:87`)
  - **`client.test.ts`, 4 new and 3 updated tests:**
    - new: missing `access_token` throws and is not cached (`:338`)
    - new: Graph key with TTL 3539 for `expires_in: 3599` (`:351`)
    - new: missing `expires_in` is not cached (`:368`)
    - new: a cache hit makes no `fetch` and no `setEx` (`:384`)
    - updated: mock mode does not touch Redis (`:255-256`)
    - updated: a failed request is not cached (`:335`)
    - updated: the client credentials happy path includes `expires_in`
  - **Gaps:** the Redis-error test (Suggestion 2) and the TTL=1 boundary (Suggestion 4).
- **E2E tests:** none, which is acceptable. This is a backend-only change, and E2E runs with `MOCK_AZURE_B2C=true`, which skips the token path.
- **Accessibility tests:** not applicable. There are no template, content, style or client-side JS changes, so WCAG 2.2 AA, the GOV.UK Design System, Welsh content and progressive enhancement are unaffected.
- **Statement coverage per changed workspace:**
  - `@hmcts/auth` (`libs/auth`): **96.3%** statements (365/379), 93.9% branches, 86.11% functions, 96.28% lines
  - `src/oauth-token-cache/token-cache.ts`: 100% statements, 100% branches
  - `src/graph-api/client.ts`: 94.93% statements. The uncovered lines 34, 100, 148 and 192 are in code this change did not touch.

## Acceptance Criteria Verification

- [x] **Graph API access token is cached in Redis after first fetch.** `token-cache.ts:14-15` calls `cacheToken` after a successful fetch, and the `setEx` is at `token-cache.ts:37-42`. Tested at `token-cache.test.ts:60-73` and `client.test.ts:351-366`.
- [x] **Cache TTL is set to `expires_in - 60` seconds (small buffer before actual expiry).** The buffer is `token-cache.ts:4` and the TTL is computed at `token-cache.ts:31` and passed at `:42`. `expires_in` is mapped at `client.ts:262`. Tested at `client.test.ts:365` (3599 gives 3539) and `token-cache.test.ts:70-72`.
- [x] **On cache hit, the cached token is returned without calling the identity provider.** The early return is at `token-cache.ts:9-12` and the read is at `token-cache.ts:19-28`. Tested at `token-cache.test.ts:31-44` (fetcher not called) and `client.test.ts:384-396` (`fetch` not called).
- [x] **On cache miss (first call or after expiry), a fresh token is fetched and stored.** An absent key is handled at `token-cache.ts:22-24` and an expired entry at `token-cache.ts:27`. Both lead to the fetch and store at `token-cache.ts:14-16`. Tested at `token-cache.test.ts:46-58` (expired) and `:60-73` (first call).
- [x] **Cache key is scoped to the credential/scope combination (e.g. `oauth:token:graph-api`).** The prefix is set at `token-cache.ts:3,7` and the name at `client.ts:7,84`. Tested at `client.test.ts:364-365`. Leaving the client and tenant ID out of the key is the agreed legacy-parity decision, and the ticket's own example key has the same form.
- [x] **Unit tests cover: cache hit (no fetch), cache miss (fetch + store), expired token (re-fetch).** The hit is tested at `token-cache.test.ts:31`, the miss at `token-cache.test.ts:60` and the expired token at `token-cache.test.ts:46`. `client.test.ts:351` and `:384` repeat the hit and miss tests at the Graph client level.
- [x] **Implementation is structured to be extensible for other outgoing service tokens in future.** `token-cache.ts:6` is a generic `getCachedAccessToken(name, fetchToken)`, with the `OAuthToken` contract exported at `token-cache.ts:45-48`. It contains no Graph logic, and the tests use the non-Graph name `test-service` (`token-cache.test.ts:15-16`).

**AC status: 7 met, 0 partial, 0 unmet (out of 7).**

### Tasks (`tasks.md`)

Every task is ticked, and each one is confirmed in the code:

- The dependency is added and in the lockfile.
- `token-cache.ts` has the specified constants, the exported function, the private helpers and the interfaces at the bottom. There is no try/catch and no logging.
- `client.ts` is refactored with the mock early return kept.
- Both test files contain the listed scenarios.
- Tests, lint and type check pass.

## Next Steps

- [ ] Optional: treat a malformed or invalid cached value as a miss, using a type guard (Suggestion 1).
- [ ] Optional: add a test that Redis errors propagate (Suggestion 2).
- [ ] Optional: check `expires_in` with `Number.isFinite` (Suggestion 3).
- [ ] Optional: add a test for the TTL boundary at `expiresIn: 61` (Suggestion 4).
- [ ] Stage the unstaged changes (`libs/auth/package.json`, `client.ts`, `client.test.ts`, `yarn.lock`) with the already-staged new files before committing.

## Overall Assessment

**APPROVED**

All 7 acceptance criteria are met and there are no critical or high-priority issues. `@hmcts/auth` has 96.3% statement coverage, with 100% on the new module, and type check, lint and the caller's tests pass. Since the last review, the `access_token` check and the comment fix were added. The remaining suggestions are defensive hardening and test additions. The known behavioural limits (no Redis fallback, no 401 eviction, no miss de-duplication, a key without credential identity) are legacy-parity decisions already agreed with the user.
