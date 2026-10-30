# Tasks: #1272 CaTH Cron Trigger - Subscription Triggers

## Implementation Tasks

### Scheduled list type flag
- [x] Add `isScheduledSubscription?: boolean` to `ListTypeData` and set `true` on `MAGISTRATES_ADULT_COURT_LIST_DAILY` and `MAGISTRATES_PUBLIC_ADULT_COURT_LIST_DAILY` in `libs/list-types/common/src/list-type-data.ts` (leave `_FUTURE` variants unset)
- [x] Add `libs/list-types/common/src/list-type-data.test.ts`: only the two DAILY names are flagged (scenario 1)

### `@hmcts/publication` — subscription-schedule domain
- [x] Add `luxon` `3.7.2` (dependency) and `@types/luxon` `3.7.5` (devDependency) to `libs/publication/package.json`
- [x] Create `libs/publication/src/subscription-schedule/london-day.ts` (`getLondonDay(now)` → `{ start, end, contentDate }`, Europe/London)
- [x] Create `london-day.test.ts`: GMT, BST late-night UTC, 25h clock-change day (scenario 2)
- [x] Create `scheduled-list-types.ts` exporting `SCHEDULED_SUBSCRIPTION_LIST_TYPE_NAMES` derived from `listTypeData`
- [x] Create `queries.ts` with `findArtefactsDisplayedFromToday` (displayFrom in London day, displayTo null or > now, `lastReceivedDate < day.start`, `listType: { name: { notIn: ... } }`) and `findScheduledListTypeArtefactsForToday` (`listType: { name: { in: ... } }`, `contentDate = day.contentDate`, displayTo null or > now, no displayFrom check); select fields incl. `listType.name`; drop NoMatch locations via `isNoMatchLocationId`
- [x] Create `queries.test.ts`: where-clauses, name-based list type filter with `listTypeId: 999` fixture, NoMatch dropped (scenarios 3, 4)
- [x] Create `service.ts` with `triggerDisplayFromSubscriptions(now)` and `triggerScheduledListTypeSubscriptions(now)`; sequential per-artefact try/catch; email via `sendPublicationNotificationsForArtefact` (`pdfFilePath: "<id>.pdf"`, locale from `language`, JSON via `getPublicationJson` unless flat file); email only, no third-party push; return `{ total, succeeded, failed }`; log artefactId/listTypeName/error message only; query errors propagate
- [x] Create `service.test.ts`: each artefact emailed with the right params, flat file skips JSON load, Welsh locale, partial failures continue with correct summary, query rejection propagates and sends nothing, London day derived from injected `now` (scenarios 5, 6, 7)
- [x] Export `triggerDisplayFromSubscriptions` and `triggerScheduledListTypeSubscriptions` from `libs/publication/src/index.ts`

### `apps/crons` entrypoints and config
- [x] Create `apps/crons/src/display-from-subscriptions.ts` (default export; calls trigger, logs summary, `finally` closes Redis and `prisma.$disconnect()`)
- [x] Create `apps/crons/src/scheduled-list-type-subscriptions.ts` (same shape, scheduled trigger)
- [x] Create a `.test.ts` for each script: success path logs summary and closes connections; rejection propagates and still closes connections (scenario 8)
- [x] Add `@hmcts/publication`, `@hmcts/postgres-prisma`, `@hmcts/redis` (`workspace:*`) to `apps/crons/package.json`; add matching project references in `apps/crons/tsconfig.json`; run `yarn install` (also added `redis` `5.12.1`, the peer dep of `@hmcts/redis`. Only the existing `postgres-prisma` reference was kept: `publication` and `redis` are not `composite`, so referencing them fails with TS6306, matching how `apps/web`/`apps/api` consume non-composite libs)
- [x] Add `redis.url` to `apps/crons/config/custom-environment-variables.json` (`REDIS_URL`) and `development.json` (`redis://localhost:6380`)
- [x] Add Key Vault secrets to `apps/crons/helm/values.yaml`: `redis-url`, `govuk-notify-api-key`, `storageaccount-connection-string`, `storageaccount-name`; add env `CATH_SERVICE_URL` and `MAX_SUMMARY_PAYLOAD_KB: 256`; keep `SCRIPT_NAME: 'example'` and the placeholder schedule unchanged

### Review fixes
- [x] Shutdown logs connection-close failures instead of failing a finished run, so Kubernetes doesn't retry and re-send (`apps/crons/src/close-connections.ts`, shared by both scripts, with tests)
- [x] Add `activeDeadlineSeconds: 3600` to `apps/crons/helm/values.yaml`, so a run hung on an unreachable Redis is stopped rather than blocking later runs under `Forbid`
- [x] `closeRedisClient` destroys rather than quits a client whose connection has dropped, because `quit()` never settles then (`libs/redis/src/redis-client.ts`, with a test; checked against a stopped local Redis: closes in 2ms)
- Upload-time double-send left to #588 (agreed)

### Verification
- [x] `yarn lint:fix`, `yarn test` from repo root; confirm `libs/list-types/common` guard tests still pass (fixed 2 `noUnsafeOptionalChaining` errors in `queries.test.ts`; all 71 test tasks pass at `--concurrency=2`. At default concurrency some `apps/web` template tests time out at 10s under load, unrelated to this change)
- [x] `docker build --target crons .` succeeds and image size is acceptable with the new `@hmcts/publication` dependency chain (puppeteer) (build succeeds; image is 1.14GB, roughly double master's ~0.55GB. The dependency install adds ~257MB of node_modules and ~199MB of .yarn/cache. Accepted; note in the PR. Dropping .yarn/cache from runtime images is raised as a separate ticket)
- [x] Local smoke run: `SCRIPT_NAME=display-from-subscriptions yarn workspace @hmcts/crons dev` and `SCRIPT_NAME=scheduled-list-type-subscriptions ...` against seeded data; confirm summary log and that the process exits (both log `{ total: 0, succeeded: 0, failed: 0 }` and exit 0 against the local DB. No matching artefacts were created, to avoid real Notify sends. Run via `../../node_modules/.bin/tsx src/index.ts`: `tsx` is not a declared dep of `@hmcts/crons`, so `yarn workspace @hmcts/crons dev` fails with `command not found: tsx`, which was already the case on master)

### Release
- [x] PR description notes (#1306): no per-recipient dedupe, so manual reruns re-send

### Out-of-repo (cnp-flux-config `apps/cath`) — raise alongside this PR
- [x] Check whether CaTH runs on both 00 and 01 clusters: it does (aat, demo, perftest). Rather than legacy's day-of-week split, the new releases set `disableActiveClusterCheck: false`. `ACTIVE_CRON_CLUSTER` is `"true"` only on 00 (`apps/flux-system/<env>/00/kustomize.yaml`), so the job chart suspends the CronJob on 01, and it follows the platform's active-cluster flag if that moves
- [x] Draft CronJob `SCRIPT_NAME=display-from-subscriptions`, schedule `0 1 * * *` UTC (`apps/cath/cath-crons-display-from-subscriptions/`). It inherits `concurrencyPolicy: Forbid` and `activeDeadlineSeconds` from the chart; no `backoffLimit`, which matches legacy, and the job chart drops a numeric `0` anyway
- [x] Draft CronJob `SCRIPT_NAME=scheduled-list-type-subscriptions`, schedule `30 10 * * *` UTC (`apps/cath/cath-crons-scheduled-list-type-subscriptions/`), same settings
- [x] Raise the cnp-flux-config PR as a draft: hmcts/cnp-flux-config#48744. Don't merge until #588 has shipped and an image containing these scripts is in hmctsprod
