# #568: Cache outgoing OAuth access tokens in Redis to reduce latency on third-party API calls

**State:** OPEN
**Assignees:** alao-daniel
**Author:** junaidiqbalmoj
**Labels:** type:story
**Created:** 2026-05-12T10:27:37Z
**Updated:** 2026-10-21T11:45:10Z

## Description

## User Story

As a developer, I want outgoing OAuth access tokens for third-party APIs to be cached in Redis so that we avoid a redundant token request to the identity provider on every API call.

## Background

`libs/auth/src/graph-api/client.ts` — `getGraphApiAccessToken()` — fetches a fresh `client_credentials` access token from `login.microsoftonline.com` on every single Graph API operation (create media user, find user by email, update user). These tokens are valid for approximately 1 hour, but the current implementation discards them immediately after use.

[pip-publication-services](https://github.com/hmcts/pip-publication-services) solves this with a `third-party_token-cache` in Redis. Outgoing OAuth access tokens are stored with a TTL slightly shorter than the token's `expires_in` value, so subsequent calls within the validity window reuse the cached token.

## Gap

- `getGraphApiAccessToken()` (`libs/auth/src/graph-api/client.ts`) makes a network call to `login.microsoftonline.com` on every invocation — no caching
- Each media user creation/lookup/update incurs an additional token fetch round-trip
- Token expiry is not respected — valid tokens are thrown away

## Acceptance Criteria

- [ ] Graph API access token is cached in Redis after first fetch
- [ ] Cache TTL is set to `expires_in - 60` seconds (small buffer before actual expiry)
- [ ] On cache hit, the cached token is returned without calling the identity provider
- [ ] On cache miss (first call or after expiry), a fresh token is fetched and stored
- [ ] Cache key is scoped to the credential/scope combination (e.g. `oauth:token:graph-api`)
- [ ] Unit tests cover: cache hit (no fetch), cache miss (fetch + store), expired token (re-fetch)
- [ ] Implementation is structured to be extensible for other outgoing service tokens in future

## Technical Notes

- Use the existing Redis connection (already used for sessions and file upload cache)
- The token response from Azure includes `expires_in` (seconds) — use this to set the Redis key TTL
- Affected function: `getGraphApiAccessToken()` in `libs/auth/src/graph-api/client.ts:76`
- pip-publication-services reference: `third-party_token-cache` Redis cache configuration

## Comments

No comments on this issue.
