# Implementation Tasks - Third Party Subscription Fulfilment

## Prerequisites
- [x] Resolve open questions in plan.md (especially PDF format and sensitivity filtering)

## New Module Setup
- [x] Create `libs/third-party-fulfilment/` directory structure
- [x] Create `package.json` with `@hmcts/third-party-fulfilment` name and workspace dependencies
- [x] Create `tsconfig.json`
- [x] Register `@hmcts/third-party-fulfilment` path in root `tsconfig.json`
- [x] Add `@hmcts/third-party-fulfilment` as dependency in `libs/publication/package.json`
- [x] Create `src/config.ts` (minimal, no pages or API routes)
- [x] Create `src/index.ts` exporting `sendThirdPartyPublications` and `sendThirdPartyDeletion`

## Subscription Queries
- [x] Implement `src/queries.ts` — `findSubscribersByListType(listTypeId)` querying `legacyThirdPartySubscription` with user included
- [x] Write unit tests for `queries.ts`

## Push Infrastructure
- [x] Implement `src/push/headers.ts` — build all 12 required x-* headers using artefact params + `LocationDetails`
- [x] Write unit tests for `headers.ts` covering all header fields and fallback for missing location data
- [x] Implement `src/push/http-client.ts` — HTTPS POST using `https.Agent` with cert/key from PEM string, returns `{ statusCode, success }`
- [x] Write unit tests for `http-client.ts` (mock `https.request`)
- [x] Implement `src/push/retry.ts` — up to 3 attempts, exponential backoff (1s, 2s), skip retry on 4xx (except 429)
- [x] Write unit tests for `retry.ts` covering success on first attempt, retry on 5xx, no retry on 4xx, all retries exhausted

## Core Service
- [x] Implement `src/service.ts` — `sendThirdPartyPublications`: find subscribers, get location details, build headers, push once to Courtel with `pushWithRetry`
- [x] Implement `src/service.ts` — `sendThirdPartyDeletion`: same as above but with null body
- [x] Read `process.env.COURTEL_API_URL` and `process.env.COURTEL_CERTIFICATE`; skip gracefully with error log if either is absent
- [x] Decode certificate from base64 before passing to HTTP client
- [x] Write unit tests for `service.ts` covering: no subscribers, missing env vars, push to multiple subscribers, partial failure

## Integration with processPublication
- [x] Add `skipThirdPartyPush?: boolean` to `ProcessPublicationParams` in `libs/publication/src/processing/service.ts`
- [x] Import and call `sendThirdPartyPublications` in `processPublication` (after PDF, fire-and-forget with `.catch()`)
- [x] Update unit tests in `libs/publication/src/processing/service.test.ts`

## Deletion Push
- [x] Locate the remove-list/delete publication handler (`libs/admin-pages/src/pages/remove-list-confirmation/index.ts`)
- [x] Read artefact metadata before deletion using `getArtefactsByIds`
- [x] Call `sendThirdPartyDeletion` after successful deletion (fire-and-forget)
- [x] Add `@hmcts/third-party-fulfilment` dependency to `libs/admin-pages/package.json`

## Helm Chart / Infrastructure
- [x] Add Courtel secrets to `apps/api/helm/values.yaml` under the existing `pip-ss-kv-stg` vault:
  ```yaml
  - name: auto-pip-stg-courtel-api
    alias: COURTEL_API_URL
  - name: courtel-certificate
    alias: COURTEL_CERTIFICATE
  ```

## Testing
- [x] Run `yarn test` across all modified packages — all tests pass
- [x] Verify test coverage >80% for `libs/third-party-fulfilment` (36 tests, 5 files)
- [ ] Manual test: upload a publication for a list type with a subscribed third-party user → check push was sent
- [ ] Manual test: delete a publication → check empty-body push was sent
- [ ] Manual test: upload for list type with no subscribers → no push attempt
