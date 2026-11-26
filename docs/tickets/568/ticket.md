# #568: Third-party subscription fulfilment (OAuth) with Redis-cached access tokens

**State:** OPEN
**Assignees:** alao-daniel
**Author:** junaidiqbalmoj
**Labels:** type:story
**Created:** 2026-05-12T10:27:37Z
**Updated:** 2026-10-26T14:15:37Z

> **Note:** the implementation follows legacy PIP, which differs from this issue text in places. The differences are: no token eviction; cached `{ accessToken, expiry }` with a 1-day Redis expiry refreshed on read; the push is still sent when the token request fails; retry with jitter on any error, including 4xx; a display-window check on new and updated pushes; and DELETE also sent on delete court. User status is #830 and Test connection is #829. See plan.md section 6. The GitHub issue is to be updated to match.

## Description

## User Story

As a third-party subscriber configured in CaTH with OAuth credentials, I want publications that match my subscriptions to be pushed to my API when they are published, updated or removed, so that I receive court and tribunal lists without polling CaTH.

As a developer, I want each subscriber's OAuth access token to be cached in Redis, so that we don't request a new token from the subscriber's identity provider on every push.

## Background

[#301](https://github.com/hmcts/cath-service/issues/301) delivered the system admin screens for the new (non-legacy) third-party users:
- `third_party_user` and `third_party_subscription` tables (one sensitivity per list type: `PUBLIC`, `PRIVATE`, `CLASSIFIED`)
- an OAuth configuration screen (`/third-party-subscribers/:id/oauth-config`) that stores `destination-url`, `token-url`, `scope`, `client-id` and `client-secret` per user through `@hmcts/third-party-user` (`getSecret` / `setSecret`; Key Vault, or the `third_party_secret` table when `THIRD_PARTY_KEY_VAULT` is unset)

Nothing reads these subscriptions or OAuth configs to deliver publications. The only fulfilment in CaTH today is the **legacy** Courtel push (`libs/legacy-third-party-fulfilment`, #323), which uses a certificate and the `legacy_third_party_*` tables. That push stays as it is.

The legacy service implements this in [pip-account-management](https://github.com/hmcts/pip-account-management) (`ThirdPartySubscriptionNotificationService`), which selects the subscribers, and [pip-publication-services](https://github.com/hmcts/pip-publication-services) (`ThirdPartySubscriptionService`, `ThirdPartyApiService`, `ThirdPartyOauthService`, `ThirdPartyTokenCachingService`), which delivers to them. That code is the source of truth for the behaviour below.

**Out of scope:** caching the Microsoft Graph API token (`getGraphApiAccessToken` in `libs/auth`). It isn't needed and should be reverted from the current branch.

## Acceptance Criteria

### Subscriber selection
- [ ] When a publication is processed, CaTH finds the `third_party_subscription` rows for its list type whose sensitivity allows the publication's sensitivity:
  - a `PUBLIC` publication goes to subscriptions at `PUBLIC`, `PRIVATE` or `CLASSIFIED`
  - a `PRIVATE` publication goes to subscriptions at `PRIVATE` or `CLASSIFIED`
  - a `CLASSIFIED` publication goes to subscriptions at `CLASSIFIED`
- [ ] Matching is by list type **name**, never by numeric `listTypeId`
- [ ] A subscriber without a complete OAuth config (destination URL, token URL, scope, client ID, client secret) is skipped and an error is logged with the user ID only
- [ ] Nothing is sent when no subscriber matches

### Delivery
- [ ] **New publication:** `POST {destinationUrl}`, `multipart/form-data`, `Authorization: Bearer <token>`
- [ ] **Updated publication** (same artefact re-published): `PUT {destinationUrl}/{publicationId}`, same body
- [ ] **Removed publication** (admin "Remove list"): `DELETE {destinationUrl}/{publicationId}` with the bearer token and no body
- [ ] The multipart body contains:
  - `metadata` (`application/json`): `publicationId`, `listType`, `locationName`, `contentDate`, `sensitivity`, `language`, `displayFrom`, `displayTo`
  - `payload` (`application/json`): the publication JSON, for JSON publications
  - `file`: the flat file from blob storage, named `{publicationId}{extension}` with the extension taken from the original upload, for flat-file publications
- [ ] Each subscriber is sent to independently. A failure for one subscriber doesn't stop delivery to the others
- [ ] A failed request is retried up to 3 times with exponential backoff starting at 2 seconds (legacy `error-handling.num-of-retries: 3`, `backoff: 2`)
- [ ] After the retries run out, the failure is logged with the subscriber user ID and publication ID. It is not thrown to the publish or remove flow
- [ ] Fulfilment runs in the background, like the legacy push, so publish and remove aren't blocked
- [ ] It runs for all publish paths that call `processPublication` (API ingestion, manual upload, non-strategic upload) and for the remove-list flow, alongside the existing legacy Courtel push

### Token cache
- [ ] Access tokens are obtained with the OAuth2 `client_credentials` grant: `POST {tokenUrl}` with `grant_type`, `client_id`, `client_secret` and `scope` as form data
- [ ] Tokens are cached in Redis using the existing shared client (`getRedisClient()` from `@hmcts/redis`), one entry per third-party user (key scoped to the user ID, e.g. `third-party:token:<userId>`)
- [ ] The cache TTL is `expires_in - 60` seconds. If `expires_in` is missing or 60 or less, the token is used but not cached
- [ ] On a cache hit, the cached token is used and the identity provider is not called
- [ ] On a cache miss or after expiry, a new token is requested and stored
- [ ] The cached token for a user is cleared when their OAuth config is saved or the user is deleted, so a rotated secret or changed scope takes effect straight away
- [ ] If the token request fails, an error is logged with the user ID, nothing is cached, and nothing is sent to that subscriber
- [ ] Tokens, client secrets and publication payloads are never logged

## Technical Notes

- New lib, e.g. `libs/third-party-subscription-fulfilment` (`@hmcts/third-party-subscription-fulfilment`), separate from `@hmcts/legacy-third-party-fulfilment`. It must not depend on `@hmcts/publication`, which will call it, so it can't create a cycle
- Read subscriptions with Prisma (`thirdPartySubscription` joined to `listType` by name). Read OAuth config with `getSecret(createKeyVaultSecretName(userId, ...))` from `@hmcts/third-party-user`
- Flat files: `downloadBlob(artefactId, CONTAINER.ARTEFACT)` from `@hmcts/azure-blob`. Older blobs are stored as `{artefactId}{extension}`, which matches the fallback in `getFlatFileUrl`
- Call sites:
  - `processPublication` in `libs/publication/src/processing/service.ts`: new or update, using the `isUpdate` flag
  - `apps/web/src/pages/(admin)/remove-list-confirmation/index.ts`: delete
- Cache eviction call sites:
  - `third-party-subscribers/[id]/oauth-config/summary` POST
  - `deleteThirdPartyUser`
- Revert the Graph API caching on the current branch: `libs/auth/src/graph-api/client.ts`, `libs/auth/src/oauth-token-cache/`, and the `@hmcts/redis` dependency in `libs/auth/package.json`

## Out of Scope
- Third-party health check on saving the OAuth config (legacy `HEALTH_CHECK` action). Raise as a follow-up story
- A user status (`PENDING` / `ACTIVE` / `SUSPENDED`) as in legacy `ApiUser`. A user with a complete OAuth config is treated as active
- Changes to the legacy Courtel push (#323)
- Caching the Graph API token

## Test Scenarios (unit, Vitest)
- Sensitivity matching: each publication sensitivity against each subscription sensitivity
- Subscriber with incomplete OAuth config is skipped; others still receive the publication
- New publication sends a POST with a `metadata` + `payload` multipart body
- Flat file sends a `metadata` + `file` multipart body with the correct filename
- Update sends a PUT to `{destinationUrl}/{publicationId}`; removal sends a DELETE
- Retry: a request that succeeds on the 2nd attempt counts as success; after 3 failures an error is logged and nothing is thrown
- Token cache: hit (no token request), miss (request and store with TTL `expires_in - 60`), expired (new request), `expires_in` of 60 or less (not stored), token request failure (not stored and nothing sent)
- Eviction on OAuth config save and on user delete
- No subscribers means no token request and no HTTP calls


## Comments

No comments on this issue.
