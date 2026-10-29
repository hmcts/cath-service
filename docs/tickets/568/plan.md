# Technical Plan: #568 Third-party subscription fulfilment (OAuth) with Redis-cached access tokens

TEMPLATE SOURCE: n/a

> **Follows legacy PIP exactly.** In pip-account-management that's `ThirdPartySubscriptionNotificationService`. In pip-publication-services it's `ThirdPartySubscriptionService`, `ThirdPartyApiService`, `ThirdPartyOauthService`, `ThirdPartyTokenCachingService` and `RedisConfiguration`. In pip-data-management it's `PublicationSubscriptionService` and `PublicationRemovalService`. Where the GitHub issue text differs from legacy, this plan follows legacy (see section 6). The issue will be updated to match separately.

## 1. Technical Approach

### Strategy

Add a new library, `@hmcts/third-party-subscription-fulfilment` (`libs/third-party-subscription-fulfilment`), that pushes publications to the new (non-legacy) third-party subscribers configured through #301. It runs alongside the legacy Courtel push (`@hmcts/legacy-third-party-fulfilment`), which stays unchanged.

The library exposes two functions:

- `sendPublicationToThirdParties` is called from `processPublication` for new and updated publications.
- `sendPublicationDeletionToThirdParties` is called from the remove-list confirmation page and from the system admin delete-court flow.

The rejected Microsoft Graph token caching on this branch is reverted first, so the branch diff only contains #568 work.

### Architecture

```
processPublication (libs/publication)     remove-list-confirmation (apps/web)    delete court (libs/system-admin-pages)
        | fire-and-forget                          | fire-and-forget, per artefact        | fire-and-forget, per artefact
        v                                          v                                      v
sendPublicationToThirdParties             sendPublicationDeletionToThirdParties  <--------+
  (display-window check)                  (no display-window check)
        |                                          |
        +--------------------+---------------------+
                             v
          findMatchingSubscriptions(listTypeName, sensitivities)   -- Prisma, by list type name
                             |
                 for each subscriber (independent, Promise.all, never rejects)
                             v
          getDestinationUrl(userId)   -- @hmcts/third-party-user getSecret x1
                             v
          getAccessToken(userId)   -- Redis third-party_token-cache:<userId>, else getTokenCredentials (getSecret x4) + client_credentials POST
                             v
          withRetry(() => sendRequest(...))   -- POST / PUT {id} / DELETE {id}, Bearer, multipart
```

Dependency direction: `@hmcts/publication` and `@hmcts/system-admin-pages` depend on `@hmcts/third-party-subscription-fulfilment`. The new library depends only on `@hmcts/postgres-prisma`, `@hmcts/third-party-user`, `@hmcts/redis`, `@hmcts/azure-blob` and `@hmcts/location`, and none of these depend on `@hmcts/publication`, so there is no cycle. It can't reuse `getFileBuffer` or `getFileExtension` from `@hmcts/publication`, so it has its own small flat-file loader. The loader uses the same fallback: the bare blob first, then `{artefactId}{ext}`.

### Legacy reference

| Concern | Legacy (pip-*) | CaTH |
|---|---|---|
| Selection | Subscriptions for the artefact's list type with sensitivity in the allowed set | Same sensitivity matrix; list type matched by `name` |
| User status | Only `ACTIVE` `ApiUser`s | Out of scope, covered by **#830**. That ticket adds `status = ACTIVE` to `findMatchingSubscriptions` |
| Missing OAuth config | Logged, skipped | No destination URL: logged with user ID only, skipped. Missing token credentials: token request fails (logged), request still sent without a token, as legacy does for a failed token request |
| New / update | `supersededCount > 0` selects UPDATE | `isUpdate` flag already passed to `processPublication` |
| Verbs | POST `dest`, PUT `dest/{id}`, DELETE `dest/{id}` (no body) | Same |
| Body | Multipart `metadata` (JSON), plus `payload` (JSON) or `file` (`{id}{ext}`) | Same |
| Retry | Reactor `Retry.backoff(3, 2s)`: 3 retries, exponential, jitter 0.5, retries any error including 4xx | Same: 4 attempts in total, base delays 2s/4s/8s with ±50% jitter, any error |
| Exhausted retries | Error logged, not thrown | Same; logged with user ID and publication ID |
| Request timeout | None (`webClientThirdParty` has no timeout) | None |
| Token request | `client_credentials` form POST to `tokenUrl` | Same |
| Token cache key | User ID in cache `third-party_token-cache` | `third-party_token-cache:<userId>` |
| Token cache value | `ThirdPartyTokenInfo { accessToken, expiry }`; `expiry = now + (expires_in - 60) * 1000`, or `0` when `expires_in <= 60` (still stored) | Same, as JSON |
| Token cache Redis expiry | `AccessedExpiryPolicy(ONE_DAY)`: 1 day, refreshed on each access | `SET ... EX 86400` on write, `GETEX ... EX 86400` on read |
| Token validity | Served only if `now < expiry` | Same |
| Missing `expires_in` | Treated as 0 | Same |
| Token failure | Logged, nothing cached, returns null; the push is still sent (`setBearerAuth(null)`) | Same; the push is still sent without a usable token |
| Health check mode | `isHealthCheck = true` makes a token failure throw | `isHealthCheck` parameter on `getAccessToken`, for **#829** |
| Token eviction | None | None |
| Display window (new and update) | Push only if `displayFrom` date <= today and (`displayTo` null or date >= today) | Same. The daily job for publications that become displayable later is out of scope |
| DELETE triggers | Manual remove, `deleteArtefactById`, delete-by-location. Not sent when expired artefacts are archived | Remove-list and delete court. Not sent on expiry |

### Key considerations

- **List type by name.** `third_party_subscription` has an integer `list_type_id` and no Prisma relation; the FK was dropped in `20260701115926_third_party_subscription`. Subscriptions are found by resolving `listType.findUnique({ where: { name } })` and then filtering on that row's `id`.
  - The publish path gets the name from the artefact's `listType` relation.
  - The delete paths have artefact rows from `getArtefactsByIds` / `getArtefactsByLocation`, which carry no `listTypeName`, and the rows are already deleted when the push runs. So the library looks up the name from the artefact's runtime `listTypeId`.
  - No numeric ID is ever hardcoded or compared against a constant.
- **Artefact as the source of metadata.** `processPublication` callers do not pass `flatFilePath`, `isFlatFile` or `sourceArtefactId`. So the publish function takes `artefactId` and loads the artefact row itself, joining `listType.name`.
  - The row is already persisted when `processPublication` runs, so `metadata` comes from the stored record.
  - `jsonData` is still passed in, so the JSON isn't downloaded again.
- **Background execution.** All call sites invoke the function without `await` and add a `.catch` that logs, as the legacy push does. Inside the library, every subscriber is wrapped so one failure can't reject the batch.
- **Secrets cost.** Legacy keeps the destination and token URLs in the database and reads the three credential secrets from Key Vault only on a token cache miss. CaTH keeps all five in Key Vault (#301), so each push reads the `destination-url` secret, and the other four (token URL, scope, client ID, client secret) are read only on a cache miss. With a cached token that's 1 Key Vault read per subscriber per publication. Caching secrets is not in scope.
- **Never log** any of the following. Logs carry only the user ID, publication ID, HTTP status and attempt number.
  - tokens
  - client secrets
  - destination or token URLs (they are stored as secrets)
  - payloads
- **No schema changes.** Existing tables are enough, so no migration is needed.
- **No API endpoints, pages or templates.** The library has nothing for the apps to register (no pages, routes, assets or Prisma schemas), so it has no `config.ts` or `./config` export. Adding one would be YAGNI.
- **Changed OAuth config.** Because legacy never evicts, a cached token stays in use after its OAuth config is saved again, until its stored `expiry` passes. A user deleted with a cached token is harmless: they no longer match any subscription.

## 2. Implementation Details

### Revert (first)

Restore these to `master` with `git checkout master -- <paths>` and then run `yarn install`:

- `libs/auth/src/graph-api/client.ts`
- `libs/auth/src/graph-api/client.test.ts`
- `libs/auth/src/oauth-token-cache/token-cache.ts` (delete; it does not exist on master)
- `libs/auth/src/oauth-token-cache/token-cache.test.ts` (delete)
- `libs/auth/package.json` (drop `@hmcts/redis`)
- `yarn.lock` (regenerated by `yarn install`)

Afterwards, `git diff master...HEAD -- libs/auth yarn.lock` must be empty.

### File structure

```
libs/third-party-subscription-fulfilment/
├── package.json
├── tsconfig.json
└── src/
    ├── index.ts
    ├── fulfilment/
    │   ├── service.ts            # sendPublicationToThirdParties, sendPublicationDeletionToThirdParties
    │   ├── service.test.ts
    │   ├── queries.ts            # findArtefactForFulfilment, findListTypeName, findMatchingSubscriptions
    │   └── queries.test.ts
    ├── oauth/
    │   ├── oauth-config.ts       # getDestinationUrl, getTokenCredentials
    │   ├── oauth-config.test.ts
    │   ├── access-token.ts       # getAccessToken (legacy ThirdPartyOauthService + ThirdPartyTokenCachingService)
    │   └── access-token.test.ts
    └── delivery/
        ├── multipart.ts          # buildMultipartBody
        ├── multipart.test.ts
        ├── http-client.ts        # sendRequest
        ├── http-client.test.ts
        ├── retry.ts              # withRetry
        ├── retry.test.ts
        ├── flat-file.ts          # loadFlatFile
        └── flat-file.test.ts
```

`package.json`:

```json
{
  "name": "@hmcts/third-party-subscription-fulfilment",
  "version": "1.0.0",
  "type": "module",
  "exports": {
    ".": { "production": "./dist/index.js", "default": "./src/index.ts" }
  },
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "test": "vitest run",
    "test:watch": "vitest watch",
    "format": "biome format --write .",
    "lint": "biome check .",
    "lint:fix": "biome check --write ."
  },
  "dependencies": {
    "@hmcts/azure-blob": "workspace:*",
    "@hmcts/location": "workspace:*",
    "@hmcts/postgres-prisma": "workspace:*",
    "@hmcts/redis": "workspace:*",
    "@hmcts/third-party-user": "workspace:*"
  },
  "peerDependencies": { "@prisma/client": "*" }
}
```

`tsconfig.json` is the standard lib config from CLAUDE.md. In the root `tsconfig.json` paths, add `"@hmcts/third-party-subscription-fulfilment": ["libs/third-party-subscription-fulfilment/src"]`.

Add `"@hmcts/third-party-subscription-fulfilment": "workspace:*"` to `libs/publication/package.json`, `libs/system-admin-pages/package.json` and `apps/web/package.json`.

### Module contents and signatures

Module ordering follows CLAUDE.md: constants, then exported functions, then internal functions in order of use, then types at the bottom. Only the two entry points are exported from `index.ts`. Internal cross-file exports are not re-exported.

**`src/index.ts`**
```ts
export { sendPublicationDeletionToThirdParties, sendPublicationToThirdParties } from "./fulfilment/service.js";
```

**`fulfilment/queries.ts`**
```ts
export async function findArtefactForFulfilment(artefactId: string): Promise<FulfilmentArtefact | null>
// prisma.artefact.findUnique select: artefactId, locationId, contentDate, sensitivity, language,
// displayFrom, displayTo, isFlatFile, sourceArtefactId, listType { name }

export async function findListTypeName(listTypeId: number): Promise<string | null>

export async function findMatchingSubscriptions(listTypeName: string, sensitivities: string[]): Promise<string[]>
// listType.findUnique({ where: { name } }) -> thirdPartySubscription.findMany({ where: { listTypeId, sensitivity: { in } },
// select: { thirdPartyUserId: true } }) -> user IDs
// #830 adds the ACTIVE user filter here, and only here
```

**`fulfilment/service.ts`**
```ts
// Legacy ThirdPartySubscriptionNotificationService.determineAllowedApiSensitivities
const ALLOWED_SUBSCRIPTION_SENSITIVITIES: Record<string, string[]> = {
  PUBLIC: ["PUBLIC", "PRIVATE", "CLASSIFIED"],
  PRIVATE: ["PRIVATE", "CLASSIFIED"],
  CLASSIFIED: ["CLASSIFIED"]
};

export async function sendPublicationToThirdParties(params: PublicationFulfilmentParams): Promise<void>
// 1. findArtefactForFulfilment; if missing, log error and return
// 2. isWithinDisplayWindow(artefact, today) false -> log info and return (legacy checkAndTriggerPublicationSubscription)
// 3. findMatchingSubscriptions(listType.name, allowed); if none, log info and return (no secrets, no token, no HTTP)
// 4. build metadata (locationName via getLocationWithDetails); build the body part once:
//    flat file -> loadFlatFile (missing blob: log error, return); else payload = JSON.stringify(jsonData)
//    (no jsonData: log error, return)
// 5. Promise.all(userIds.map(deliver)) with method POST at destinationUrl, or PUT at destinationUrl/{id} when isUpdate

export async function sendPublicationDeletionToThirdParties(params: PublicationDeletionParams): Promise<void>
// no display-window check (legacy collectThirdPartyForDeletion)
// findListTypeName(listTypeId) -> findMatchingSubscriptions -> Promise.all(deliver DELETE {destinationUrl}/{id}, no body)

function isWithinDisplayWindow(artefact, today): boolean
// stored date (UTC fields, as legacy LocalDateTime.toLocalDate) vs today in Europe/London: displayFrom date <= today && (displayTo null || displayTo date >= today)

async function deliverToSubscriber(userId, request, logPrefix): Promise<void>  // never throws
// getDestinationUrl -> null: log "no destination URL configured" + userId, return
// getAccessToken(userId) -> may be null; request still sent (legacy setBearerAuth(null))
// withRetry(() => sendRequest(...)) -> false: log userId + publicationId, return

interface PublicationFulfilmentParams { artefactId: string; isUpdate: boolean; jsonData?: unknown; logPrefix?: string }
interface PublicationDeletionParams { artefactId: string; listTypeId: number; sensitivity: string; logPrefix?: string }
```

Unknown sensitivity values match nothing (an empty allowed list), and an info log is written.

Metadata JSON (legacy `ThirdPartyPublicationMetadata`): `{ publicationId, listType, locationName, contentDate, sensitivity, language, displayFrom, displayTo }`. `listType` is the list type name. Dates match what legacy actually sends: its `webClientThirdParty` is built with plain `WebClient.builder()`, so Spring's default Jackson mapper writes `LocalDateTime` as an array, `[year, month, day, hour, minute]`, then seconds and nanoseconds only when non-zero (e.g. `[2026,7,1,0,0]`, `[2026,7,1,9,30,15]`). Values are the stored column values with no time-zone conversion (the UTC fields Prisma returns). They are `null` when absent. Verified by encoding the legacy metadata with Spring 6.2.19 / Jackson 2.21.4.

**`oauth/oauth-config.ts`**
```ts
export async function getDestinationUrl(userId: string): Promise<string | null>     // read on every push
export async function getTokenCredentials(userId: string): Promise<TokenCredentials | null>  // read only on a token cache miss (legacy)
// null if any value is missing or empty or getSecret throws

export interface TokenCredentials { tokenUrl: string; scope: string; clientId: string; clientSecret: string }
```

**`oauth/access-token.ts`** (a port of legacy `ThirdPartyOauthService` and `ThirdPartyTokenCachingService`)
```ts
const CACHE_KEY_PREFIX = "third-party_token-cache:";       // legacy cache name
const CACHE_EXPIRY_SECONDS = 86_400;                       // legacy AccessedExpiryPolicy(ONE_DAY)
const TOKEN_EXPIRY_BUFFER_SECONDS = 60;                    // legacy TOKEN_EXPIRY_BUFFER_SECONDS

export async function getAccessToken(userId: string, config: OAuthConfig, isHealthCheck = false): Promise<string | null>
// cached = await getCachedToken(userId); if cached return it                       (legacy getApiAccessToken)
// otherwise requestAccessToken(userId, config, isHealthCheck)                       (legacy requestApiAccessToken)

async function getCachedToken(userId: string): Promise<string | null>
// redis.getEx(key, { EX: CACHE_EXPIRY_SECONDS })   -- read refreshes the 1-day expiry (accessed expiry)
// parse { accessToken, expiry }; return accessToken if Date.now() < expiry, else null

async function requestAccessToken(userId, config, isHealthCheck): Promise<string | null>
// fetch(tokenUrl, POST, application/x-www-form-urlencoded: grant_type=client_credentials, client_id, client_secret, scope)
// success -> cacheToken(userId, access_token, expires_in ?? 0); return access_token
// non-2xx, network error, or missing access_token -> log error with userId;
//   isHealthCheck ? throw : return null   (nothing cached)

async function cacheToken(userId: string, accessToken: string, expiresIn: number): Promise<void>
// expiry = expiresIn > 60 ? Date.now() + (expiresIn - 60) * 1000 : 0              (legacy cacheToken)
// redis.set(key, JSON.stringify({ accessToken, expiry }), { EX: CACHE_EXPIRY_SECONDS })

interface CachedToken { accessToken: string; expiry: number }                       // legacy ThirdPartyTokenInfo
```

Redis errors are not caught. That matches legacy JCache, where errors propagate up to `deliverToSubscriber`, which logs them and moves on to the other subscribers. There is no eviction function.

**`delivery/multipart.ts`**
```ts
export function buildMultipartBody(parts: MultipartPart[]): { body: Buffer; contentType: string }
// random boundary; Content-Disposition name (+ filename when set); Content-Type per part
interface MultipartPart { name: string; contentType: string; content: Buffer | string; fileName?: string }
```

The body is built by hand rather than with `FormData`. `FormData` adds `filename="blob"` to JSON parts, which differs from legacy and makes the exact body hard to assert in tests.

**`delivery/http-client.ts`**
```ts
export async function sendRequest(request: DeliveryRequest): Promise<void>
// fetch with method, Authorization: `Bearer ${accessToken}` (only when non-null), optional body + Content-Type; throws on non-2xx
// no timeout (legacy webClientThirdParty has none)
interface DeliveryRequest { method: "POST" | "PUT" | "DELETE"; url: string; accessToken: string | null; body?: Buffer; contentType?: string }
```

**`delivery/retry.ts`** (Reactor `Retry.backoff(3, Duration.ofSeconds(2))`)
```ts
const MAX_RETRIES = 3;          // legacy error-handling.num-of-retries
const MIN_BACKOFF_MS = 2000;    // legacy error-handling.backoff
const JITTER_FACTOR = 0.5;      // Reactor RetryBackoffSpec default
export async function withRetry(operation: () => Promise<void>, logContext: string): Promise<boolean>
// attempt 1 + up to 3 retries; base delay = MIN_BACKOFF_MS * 2^(retry-1) (2s, 4s, 8s) +/- up to 50% jitter
// any thrown error (4xx, 5xx, network) retries; returns true on success, false when exhausted
// logs a warning per retry (attempt number and status only)
```

**`delivery/flat-file.ts`**
```ts
export async function loadFlatFile(artefactId: string, sourceArtefactId: string | null): Promise<FlatFile | null>
// downloadBlob(artefactId, CONTAINER.ARTEFACT) ?? downloadBlob(`${artefactId}${ext}`, CONTAINER.ARTEFACT)
// ext = path.extname(sourceArtefactId ?? "")   (legacy: substring from the last "." of sourceArtefactId, or "")
// fileName = `${artefactId}${ext}`; the file part is always application/octet-stream (legacy ByteArrayResource has no filename, so Spring can't infer a type)
interface FlatFile { buffer: Buffer; fileName: string; contentType: string }
```

### Call-site changes

All call sites are fire-and-forget with a `.catch` that logs. The legacy Courtel calls next to them are unchanged.

1. **`libs/publication/src/processing/service.ts`**: inside the existing `if (!skipThirdPartyPush)` block, after the legacy call, add:
   ```ts
   sendPublicationToThirdParties({ artefactId, isUpdate, jsonData, logPrefix }).catch((error) => {
     console.error(`${logPrefix} Third-party OAuth fulfilment failed:`, { artefactId, error: error instanceof Error ? error.message : String(error) });
   });
   ```
   This covers API ingestion, manual upload and non-strategic upload, because all three call `processPublication`.
2. **`apps/web/src/pages/(admin)/remove-list-confirmation/index.ts`**: in the existing per-artefact loop, after `sendThirdPartyDeletion`, add a fire-and-forget `sendPublicationDeletionToThirdParties({ artefactId, listTypeId: artefact.listTypeId, sensitivity: artefact.sensitivity })` with a `.catch`.
3. **`libs/system-admin-pages/src/delete-court/service.ts`** `performLocationPublicationsDeletion`:
   - Before `deleteArtefactsByLocationId`, load the location's artefacts with `getArtefactsByLocation(locationId.toString())` from `@hmcts/publication`.
   - After the deletion, call `sendPublicationDeletionToThirdParties` fire-and-forget for each live artefact: `displayTo` null or not yet passed. All artefacts are still deleted.
   - This matches legacy `deleteArtefactByLocation` → `handleArtefactDeletion`, which only selects active artefacts (`findActiveArtefactsForLocation`: `display_to >= now`). Unlike legacy, a null `displayTo` counts as live, because CaTH displays it indefinitely. The legacy Courtel push is not added here; that's #323's scope.

### Database

There are no schema changes and no migrations.

## 3. Error Handling & Edge Cases

| Case | Behaviour |
|---|---|
| Publication outside display window (future `displayFrom` or past `displayTo`) | Info log, return. No push; the daily job is out of scope |
| No matching subscriptions | Info log, return. No secret reads, no token request, no HTTP calls |
| List type name not found (deleted or unknown) | Treated as no subscribers |
| Unknown publication sensitivity | Allowed set is empty, so no subscribers |
| Artefact not found on publish | Error log with artefactId, return |
| No destination URL (missing, empty, or getSecret throws) | Error log with the user ID only; subscriber skipped; other subscribers continue |
| Token credentials incomplete on a cache miss | Token request fails and is logged with the user ID; request still sent without a token (legacy) |
| Token endpoint non-2xx, network error, or no `access_token` | Error log with user ID; nothing cached; request still sent without a valid token, then retried and logged (legacy) |
| `expires_in` missing or <= 60 | Token used; stored with `expiry: 0`, so the next call requests a new one (legacy) |
| Cached token past its stored `expiry` | Treated as a miss; new token requested and stored |
| Cached entry not read for 1 day | Redis removes it (legacy accessed expiry) |
| OAuth config changed while a token is cached | Cached token used until its `expiry` passes (legacy, no eviction) |
| Redis error | Propagates to `deliverToSubscriber`, which logs it with the user ID; the other subscribers are unaffected |
| Delivery non-2xx (incl. 4xx) or network error | Retried 3 times with jittered backoff (base 2s, 4s, 8s); then error log with user ID and publication ID; not thrown |
| 401 from subscriber with a cached token | Retried like any error with the same token. Not evicted (legacy) |
| Hung subscriber connection | No timeout (legacy). The work runs in the background, so publish and remove are unaffected |
| Flat file blob missing (bare and `{id}{ext}`) | Error log with artefactId; nothing sent to any subscriber |
| Flat file `sourceArtefactId` null or without an extension | Filename `{id}` with no extension (legacy) |
| JSON publication with no `jsonData` passed | Error log, return |
| Location not found | `locationName` is `""`, warn log; delivery continues |
| One subscriber throws unexpectedly | Caught in `deliverToSubscriber`; the others are unaffected |
| `skipThirdPartyPush` true | Neither legacy nor new fulfilment runs |
| Delete court with no artefacts | No deletion pushes |
| Logging | Never tokens, secrets, URLs or payload content |

## 4. Acceptance Criteria Mapping

| AC | Implementation | Verified by |
|---|---|---|
| Sensitivity matrix | `ALLOWED_SUBSCRIPTION_SENSITIVITIES` + `findMatchingSubscriptions(..., sensitivities)` | service.test.ts matrix (3 x 3), queries.test.ts |
| Match by list type name | `findMatchingSubscriptions(listTypeName, ...)` resolves by `name`; publish uses the artefact `listType.name` join | queries.test.ts asserts `where: { name }`; fixtures use `listTypeId: 999` |
| Missing OAuth config skipped, user ID logged | `getDestinationUrl` returns null; `deliverToSubscriber` logs | oauth-config.test.ts, service.test.ts (others still delivered) |
| Nothing sent when no match | Early return before secrets and token | service.test.ts |
| Display window (legacy) | `isWithinDisplayWindow` in `sendPublicationToThirdParties` only | service.test.ts (before, within, after; delete ignores it) |
| New: POST multipart Bearer | `sendRequest` method POST, `buildMultipartBody` | service.test.ts, http-client.test.ts |
| Update: PUT `{dest}/{id}` | `isUpdate` selects PUT and the URL | service.test.ts |
| Remove: DELETE `{dest}/{id}`, no body | `sendPublicationDeletionToThirdParties` | service.test.ts, http-client.test.ts (no body or content type) |
| Delete court sends DELETE (legacy) | `performLocationPublicationsDeletion` call site | delete-court service.test.ts |
| Multipart `metadata`, `payload`, `file` | `buildMultipartBody` parts; `loadFlatFile` filename `{id}{ext}` | multipart.test.ts, flat-file.test.ts, service.test.ts |
| Subscribers independent | `Promise.all` over a non-throwing `deliverToSubscriber` | service.test.ts (one fails, others delivered) |
| Retry: `Retry.backoff(3, 2s)`, jitter, any error | `withRetry` | retry.test.ts with fake timers and a stubbed `Math.random` |
| Exhausted: logged, not thrown | `withRetry` returns false; service logs user ID + publication ID | retry.test.ts, service.test.ts |
| Background | Fire-and-forget `.catch` at all call sites | publication service.test.ts, remove-list-confirmation index.test.ts, delete-court service.test.ts |
| All publish paths + remove + delete court | Single hook in `processPublication`; remove-list loop; delete-court loop | as above |
| client_credentials form POST | `requestAccessToken` | access-token.test.ts asserts the body params |
| Redis per-user key via `getRedisClient` | `third-party_token-cache:<userId>` | access-token.test.ts |
| Cached `{ accessToken, expiry }`, `expiry = now + (expires_in - 60)s`, `0` when <= 60 | `cacheToken` | access-token.test.ts |
| 1-day Redis expiry, refreshed on read | `set` with `EX 86400`; `getEx` with `EX 86400` | access-token.test.ts |
| Cache hit, no IdP call | Valid `expiry` returns early | access-token.test.ts |
| Miss or expiry: request and store | Missing key or `expiry` passed leads to a request and `set` | access-token.test.ts |
| Token failure: logged, not cached, request still sent | `getAccessToken` returns null; `deliverToSubscriber` continues | access-token.test.ts, service.test.ts |
| Health check mode for #829 | `isHealthCheck` throws on token failure | access-token.test.ts |
| Never log secrets, tokens or payloads | Log calls carry IDs and status only | Assertions on `console.error` arguments not containing the token, secret or payload |

## 5. Test Scenarios

All tests are unit tests in Vitest, follow AAA, and are co-located.
- Mocked: Prisma, `@hmcts/redis` (hoisted mock as in `libs/admin-pages/src/manual-upload/storage.test.ts`, with `get`, `getEx` and `set`), `@hmcts/third-party-user`, `@hmcts/azure-blob`, `@hmcts/location`, and global `fetch` (via `vi.stubGlobal`).
- Time: retry and expiry tests use `vi.useFakeTimers()` / `vi.setSystemTime()` with `vi.advanceTimersByTimeAsync`.

- **queries.test.ts**:
  - Subscriptions are queried by list type `name` with the given sensitivities.
  - An unknown name returns `[]`.
  - `findListTypeName` returns the name, or null.
  - The artefact select includes `listType.name`, `isFlatFile` and `sourceArtefactId`.
- **service.test.ts**:
  - Sensitivity matrix: PUBLIC, PRIVATE and CLASSIFIED publications each pass the correct allowed set.
  - Display window: future `displayFrom` and past `displayTo` push nothing. A window that includes today pushes. Deletion pushes whatever the window.
  - No subscribers: no `getSecret`, no token request, no `fetch`.
  - Missing config for one subscriber: the error is logged with the user ID only, and the other subscriber still receives the publication.
  - New JSON publication: POST to `destinationUrl` with a Bearer token, and `metadata` + `payload` parts. Metadata fields are correct, with dates as Jackson `LocalDateTime` arrays.
  - Flat file: `metadata` + `file` part with filename `{id}{ext}`, and no `payload`.
  - Update: PUT `{destinationUrl}/{id}`.
  - Deletion: DELETE `{destinationUrl}/{id}`, no body, Bearer token.
  - Token failure: the request is still sent, with no valid bearer token (legacy).
  - Exhausted retries: an error with user ID and publication ID is logged, the function resolves, and other subscribers are unaffected.
  - Missing artefact, missing flat-file blob, and missing `jsonData` each log and send nothing.
  - Fixtures use `listTypeId: 999`.
- **oauth-config.test.ts**:
  - `getDestinationUrl` reads only the destination URL secret; missing, empty or rejecting returns null.
  - `getTokenCredentials` reads the four credential secrets and not the destination URL; any one missing or empty, or `getSecret` rejecting, returns null.
- **access-token.test.ts**:
  - Cache hit (`expiry` in the future): no `fetch`; `getEx` called with `EX 86400`.
  - Miss (no key): `fetch` to `tokenUrl` with the form params, then `set(key, JSON {accessToken, expiry: now + (3599 - 60) * 1000}, { EX: 86400 })`.
  - Expired (stored `expiry` <= now): new request and new `set`.
  - `expires_in` of 60, 30 or missing: token returned and stored with `expiry: 0`; the next call requests again.
  - Token non-2xx, network error, or missing `access_token`: null returned, `set` not called, user ID logged, no secret in the log.
  - `isHealthCheck = true` with a token failure: throws.
- **multipart.test.ts**:
  - Parts carry the boundary, name, Content-Type and optional filename.
  - The content type header includes the boundary.
  - Buffer content is preserved byte for byte.
- **http-client.test.ts**:
  - Method, URL, Authorization and Content-Type are set.
  - A null token sends no valid bearer.
  - DELETE has no body.
  - Non-2xx throws.
  - No timeout signal is passed.
- **retry.test.ts** (with `Math.random` stubbed):
  - Success on the first attempt makes 1 call.
  - Success on the 2nd attempt returns true.
  - 4xx, 5xx and network errors are all retried.
  - When all 4 attempts fail it returns false without throwing, with delays of 2s, 4s and 8s within ±50% jitter bounds.
- **flat-file.test.ts**:
  - The bare blob is used when present.
  - Falls back to `{id}{ext}`.
  - Both missing returns null.
  - A null or extensionless `sourceArtefactId` gives a filename with no extension.
- **publication `processing/service.test.ts`** (update):
  - `sendPublicationToThirdParties` is called with `{ artefactId, isUpdate, jsonData, logPrefix }`.
  - It isn't called when `skipThirdPartyPush` is set.
  - A rejection doesn't reject `processPublication`.
- **remove-list-confirmation `index.test.ts`** (update):
  - `sendPublicationDeletionToThirdParties` is called per artefact.
  - A rejection doesn't break the redirect.
- **delete-court `service.test.ts`** (update):
  - `performLocationPublicationsDeletion` calls `sendPublicationDeletionToThirdParties` for each live artefact of the location after deletion. Expired artefacts are deleted without a push.
  - No artefacts means no calls.
  - A rejection doesn't affect the admin notification.

**No E2E test.** There's no new page or user-visible journey. The behaviour is a background push to an external OAuth-protected endpoint. An E2E test would need a stub identity provider and receiver that the Playwright setup doesn't have.

## 6. CLARIFICATIONS NEEDED

None open. All earlier clarifications are **resolved: follow legacy PIP**.

1. **Token eviction:** none, as in legacy. A changed OAuth config takes effect once the cached token's `expiry` passes.
2. **User status (PENDING/ACTIVE/SUSPENDED):** out of scope, covered by **#830**, which adds the `ACTIVE` filter to `findMatchingSubscriptions`.
3. **Display window:** applied to new and updated pushes, as in legacy. The daily job for publications that become displayable later is out of scope for #568.
4. **Retry:** legacy `Retry.backoff(3, 2s)`. That's 4 attempts in total, exponential with 50% jitter, retrying any error including 4xx.
5. **Token request failure:** legacy behaviour. Logged, not cached, and the request is still sent.
6. **Test connection / health check:** out of scope, covered by **#829**. `getAccessToken` accepts `isHealthCheck` (legacy) for #829 to use.
7. **Deletion paths:** remove-list and delete court send DELETE, as in legacy. Expired-artefact archiving doesn't.
8. **Eviction location:** not applicable, since there is no eviction.
9. **Cache shape:** legacy `ThirdPartyTokenInfo` `{ accessToken, expiry }` under the user ID, with a 1-day Redis expiry refreshed on access.

The GitHub issue still contains the pre-legacy ACs: eviction, `expires_in - 60` Redis TTL, skip on token failure, remove-list only. It will be updated separately to match this plan.
