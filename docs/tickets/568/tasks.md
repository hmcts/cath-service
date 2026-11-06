# Tasks: #568 Third-party subscription fulfilment (OAuth) with Redis-cached access tokens

Follows legacy PIP exactly (see plan.md). Out of scope: user status (#830), Test connection (#829), and the daily push of newly displayed publications.

## Implementation Tasks

### Revert Graph API token caching
- [x] Restore `libs/auth/src/graph-api/client.ts`, `client.test.ts` and `libs/auth/package.json` from `master`
- [x] Delete `libs/auth/src/oauth-token-cache/` (`token-cache.ts`, `token-cache.test.ts`)
- [x] Run `yarn install` to drop the `@hmcts/redis` entry for `@hmcts/auth` from `yarn.lock`
- [x] Confirm `git diff master...HEAD -- libs/auth yarn.lock` is empty and that `@hmcts/auth` tests pass

### Scaffold `@hmcts/third-party-subscription-fulfilment`
- [x] Create `libs/third-party-subscription-fulfilment/package.json` (exports `.` only; deps `@hmcts/azure-blob`, `@hmcts/location`, `@hmcts/postgres-prisma`, `@hmcts/redis`, `@hmcts/third-party-user`)
- [x] Create `libs/third-party-subscription-fulfilment/tsconfig.json` (standard lib config)
- [x] Register `@hmcts/third-party-subscription-fulfilment` in the root `tsconfig.json` paths
- [x] Create `src/index.ts` exporting only `sendPublicationToThirdParties` and `sendPublicationDeletionToThirdParties`

### Queries
- [x] `fulfilment/queries.ts`:
  - `findArtefactForFulfilment`, returning `listType.name`, `isFlatFile`, `sourceArtefactId` and the display dates
  - `findListTypeName`
  - `findMatchingSubscriptions(listTypeName, sensitivities)`, resolving by name. This is the single place #830 will add `ACTIVE`
- [x] `fulfilment/queries.test.ts`:
  - query by name + sensitivities
  - unknown name gives `[]`
  - `findListTypeName` hit and miss
  - artefact select shape

### OAuth config and token cache (legacy `ThirdPartyOauthService` + `ThirdPartyTokenCachingService`)
- [x] `oauth/oauth-config.ts`: `getDestinationUrl(userId)` reads 1 secret on every push; `getTokenCredentials(userId)` reads the other 4 only on a token cache miss (legacy); null if any is missing, empty or erroring
- [x] `oauth/oauth-config.test.ts`:
  - destination URL only; credentials without the destination URL
  - each secret missing or empty
  - `getSecret` rejection
- [x] `oauth/access-token.ts`: `getAccessToken(userId, isHealthCheck = false)`, which reads credentials only on a cache miss
  - key `third-party_token-cache:<userId>`, value JSON `{ accessToken, expiry }`
  - read with `getEx` and `EX 86400` (1-day accessed expiry); serve only when `Date.now() < expiry`
  - on a miss: `client_credentials` form POST, then `set` with `EX 86400`
  - `expiry = now + (expires_in - 60) * 1000`, or `0` when `expires_in` <= 60 or missing (still stored)
  - on failure: log the user ID, cache nothing, return null; throw instead when `isHealthCheck`
  - no eviction function
- [x] `oauth/access-token.test.ts`:
  - hit: no fetch, and `getEx` refreshes the TTL
  - miss: fetch, then `set` with the expected value and `EX 86400`
  - stored `expiry` passed: new request
  - `expires_in` 60, 30 or missing: stored with `expiry: 0`, and the next call requests again
  - token request fails (non-2xx, network error, missing `access_token`): null, not stored, user ID logged, secret not logged
  - `isHealthCheck` throws on failure

### Delivery (legacy `ThirdPartyApiService`)
- [x] `delivery/multipart.ts`: `buildMultipartBody(parts)` with boundary, names, content types and optional filename
- [x] `delivery/multipart.test.ts`: part headers, boundary in content type, Buffer bytes preserved
- [x] `delivery/http-client.ts`: `sendRequest` via `fetch`
  - Bearer header when a token is present
  - optional body
  - no timeout (legacy)
  - throws on non-2xx
- [x] `delivery/http-client.test.ts`:
  - method, URL and headers
  - null token
  - DELETE without body
  - non-2xx throws
  - no timeout signal
- [x] `delivery/retry.ts`: `withRetry` matching Reactor `Retry.backoff(3, 2s)`
  - 1 attempt + 3 retries
  - base delays 2s, 4s and 8s, with ±50% jitter
  - retries any error, including 4xx
  - returns a boolean
- [x] `delivery/retry.test.ts` (fake timers, stubbed `Math.random`):
  - first-attempt success
  - success on the 2nd attempt
  - 4xx, 5xx and network errors retried
  - exhausted after 4 attempts returns false without throwing, with delays within jitter bounds
- [x] `delivery/flat-file.ts`: `loadFlatFile`
  - tries the bare blob, then `{id}{ext}`
  - filename `{id}{ext}`, where `ext` is taken from `sourceArtefactId` (no extension if there isn't one, as in legacy)
  - content type from `@hmcts/azure-blob`
- [x] `delivery/flat-file.test.ts`:
  - bare blob hit
  - legacy-name fallback
  - both missing
  - null or extensionless `sourceArtefactId`

### Fulfilment service (legacy `ThirdPartySubscriptionNotificationService` + `ThirdPartySubscriptionService`)
- [x] `fulfilment/service.ts`:
  - `ALLOWED_SUBSCRIPTION_SENSITIVITIES`
  - `sendPublicationToThirdParties`: display-window check (stored date vs today in Europe/London: `displayFrom` <= today and `displayTo` null or >= today); POST or PUT chosen by `isUpdate`; body is metadata plus payload or file
  - `sendPublicationDeletionToThirdParties`: DELETE with no body and no display-window check
  - per-subscriber delivery never throws, and the request is still sent if the token is null
  - metadata dates as Jackson `LocalDateTime` arrays of the stored values; flat files sent as `application/octet-stream` (legacy)
  - logs contain IDs only
- [x] `fulfilment/service.test.ts`:
  - 3x3 sensitivity matrix
  - display window: before, within and after; deletion ignores it
  - no subscribers: no secrets, token or fetch
  - incomplete config skipped while others are still delivered to
  - POST with metadata + payload
  - flat file with metadata + file and the right filename
  - PUT to `{dest}/{id}`
  - DELETE to `{dest}/{id}` without body
  - token failure still sends the request
  - exhausted retries logged with user and publication ID, not thrown
  - missing artefact, blob or `jsonData`
  - fixtures use `listTypeId: 999`
  - no token, secret or payload in logs

### Call sites
- [x] Add `@hmcts/third-party-subscription-fulfilment` to `libs/publication/package.json`, `libs/system-admin-pages/package.json` and `apps/web/package.json`, then run `yarn install`
- [x] `libs/publication/src/processing/service.ts`: fire-and-forget `sendPublicationToThirdParties({ artefactId, isUpdate, jsonData, logPrefix })` inside `if (!skipThirdPartyPush)`
- [x] `libs/publication/src/processing/service.test.ts`:
  - called with the expected params
  - skipped when `skipThirdPartyPush`
  - a rejection doesn't reject `processPublication`
- [x] `apps/web/src/pages/(admin)/remove-list-confirmation/index.ts`: fire-and-forget `sendPublicationDeletionToThirdParties` per artefact
- [x] `apps/web/src/pages/(admin)/remove-list-confirmation/index.test.ts`: called per artefact; a rejection doesn't affect the redirect
- [x] `libs/system-admin-pages/src/delete-court/service.ts` `performLocationPublicationsDeletion`:
  - load the artefacts with `getArtefactsByLocation` before `deleteArtefactsByLocationId`
  - after deletion, call `sendPublicationDeletionToThirdParties` fire-and-forget for each live one, where `displayTo` is null or not passed (legacy `deleteArtefactByLocation` / `findActiveArtefactsForLocation`)
- [x] `libs/system-admin-pages/src/delete-court/service.test.ts`:
  - called for each artefact after deletion
  - no artefacts means no calls
  - a rejection doesn't affect the admin notification

### Verification
- [ ] All of these pass:
  - `yarn lint:fix` and `yarn test` from the repo root
  - the builds for `@hmcts/third-party-subscription-fulfilment`, `@hmcts/publication`, `@hmcts/system-admin-pages` and `@hmcts/web`
- [x] Manual check locally, with secrets in the `third_party_secret` table and a stub token endpoint and receiver:
  - publish, re-publish and remove give POST, PUT and DELETE
  - a second publish makes no token request
  - `TTL third-party_token-cache:<id>` is about 86400 after each read
  - a future-dated publication isn't pushed
  - deleting a court sends a DELETE for each of its artefacts
