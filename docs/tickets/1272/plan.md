# Technical Plan: #1272 CaTH Cron Trigger - Subscription Triggers

TEMPLATE SOURCE: n/a

## 1. Technical Approach

### What exists today

- `apps/crons` is a generic runner. `main()` loads Key Vault secrets, then dynamically imports `./${SCRIPT_NAME}.js` and awaits its default export (`apps/crons/src/index.ts:21-34`). Only `example.ts` exists. A failure rejects `main()` and the process exits 1 (`index.ts:40-44`).
- One helm release runs one script: `SCRIPT_NAME: 'example'` (`apps/crons/helm/values.yaml:12`), placeholder schedule (`:21`), `concurrencyPolicy: Forbid` (`:22`). The pipeline umbrella chart also deploys this job **every 5 minutes** (`helm/cath-service/values.template.yaml:66-71`, `values.preview.template.yaml:153-158`). So the default `SCRIPT_NAME` in this repo must stay `example`. If it pointed at a subscription script, that release would send emails every 5 minutes.
- The crons Key Vault list only has app insights and `postgres-url` (`apps/crons/helm/values.yaml:14-20`). Sending notifications also needs:
  - `GOVUK_NOTIFY_API_KEY`
  - `AZURE_STORAGE_*`, for the JSON/PDF/xlsx blobs
  - `REDIS_URL`, for the new Notify rate limiter (see below)
  - `CATH_SERVICE_URL`, for email links (`libs/notifications/src/notify-templates/template-config.ts:12`)
- Email sending is now rate-limited through Redis. `@hmcts/govuk-notify` calls `validateEmailRateLimit` (`libs/govuk-notify/src/notify-client.ts:30,38`), which uses `@hmcts/redis`, which reads `config.get("redis.url")` (`libs/redis/src/redis-client.ts:11`). `apps/crons/config/*.json` has no `redis` key. Without it, every email attempt throws.
- The email flow is `sendPublicationNotificationsForArtefact` (`libs/publication/src/processing/service.ts:629`), already exported (`libs/publication/src/index.ts:19`). It never throws. It returns `{ success: false }` on failure (`service.ts:633-646,725-728`). It needs:
  - `jsonData`, for case summaries
  - `pdfFilePath`, which is the blob key `${artefactId}.pdf` (`libs/list-types/common/src/pdf/pdf-utilities.ts:34-40`). A missing blob is tolerated because `downloadBlob` returns null on 404 (`libs/azure-blob/src/blob-client.ts:62-65`).
  - `locale`, which drives list-type subscriptions (`service.ts:687-688`)
- The xlsx is loaded by convention from `${artefactId}.xlsx` (`libs/notifications/src/notification/notification-service.ts:604-606`). At upload, `locale` is derived from `language === "WELSH" ? "cy" : "en"` (`libs/api/src/blob-ingestion/repository/service.ts:171`).
- **Scope: email subscribers only.** Third-party (Courtel) push via `sendThirdPartyPublications` is out of scope for this ticket.
- There is **no** `isScheduledSubscription` flag on master:
  - `ListTypeData` has no such field (`libs/list-types/common/src/list-type-data.ts:1-11`).
  - `ListType` has no such column (`libs/postgres-prisma/prisma/schema/location.prisma:46-67`).
  - A repo-wide grep finds nothing.
- The upload path notifies every publication immediately (`service.ts:887,905`).
- Artefact columns are `contentDate @db.Date`, nullable `displayFrom`/`displayTo` timestamps, and `lastReceivedDate`, which is set to `now()` on create and on supersede (`libs/postgres-prisma/prisma/schema/base.prisma:16-21`, `libs/publication/src/repository/queries.ts:52-61`).

### Strategy

Put the business logic in `@hmcts/publication`, in a new `subscription-schedule/` domain folder. Add two thin cron scripts in `apps/crons/src/`, one per mode, selected by `SCRIPT_NAME`. There is no argument parsing: `index.ts` has no argument mechanism, and two modes need two different schedules anyway. In cnp-flux-config that means two CronJobs.

| SCRIPT_NAME | Lib function | Selects | Sends |
|---|---|---|---|
| `display-from-subscriptions` | `triggerDisplayFromSubscriptions(now)` | London date of `displayFrom` is today, `displayTo` null or > now, `lastReceivedDate` before London midnight today, and `listType.name` **not** in the scheduled names | Email |
| `scheduled-list-type-subscriptions` | `triggerScheduledListTypeSubscriptions(now)` | `listType.name` in the scheduled names, `contentDate` = London today, and `displayTo` null or > now (no `displayFrom` check, as legacy) | Email |

How a run works:
- Each function runs one query, then processes artefacts **sequentially**. Sequential keeps Notify load flat and the logs readable.
- Each artefact is wrapped in its own try/catch.
- The function returns `{ total, succeeded, failed }`.
- If the query fails, the error is thrown. Nothing has been sent at that point, so the script exits 1 and a retry is safe.
- If an artefact fails, the error is logged and the loop continues (AC3).

### How this follows and departs from legacy

Legacy behaviour (`pip-data-management` `PublicationSubscriptionService.checkNewlyActiveArtefacts`, checked 2026-10-29):
- Selects with `findArtefactsByDisplayFrom` (`DATE(display_from) = today AND (display_to > now OR display_to IS NULL)`) and `findActiveArtefactsByListTypeIn` (`DATE(content_date) = today AND display_to > now AND list_type IN (...)`).
- The scheduled branch sends **email only**.
- The display-from branch sends scheduled list types to API subscribers only, never email. Everything else gets all subscriptions.
- Schedules (`sds-flux-config` `apps/pip/data-management-subscriptions-cron` and `data-management-scheduled-subscriptions-cron`, prod): display-from at `0 1 * * *`, scheduled at `30 10 * * *`, both UTC. Each is split across the 00/01 clusters on alternating days (`0,2,4,6` / `1,3,5`) so only one cluster runs it per day.

The scheduled cron departs from legacy in one place: it includes artefacts with a null `displayTo`. The ticket says "not expired yet", and a null `displayTo` never expires; legacy's `display_to > now` silently excluded them.

The display-from cron departs from legacy in one place:

1. **The `lastReceivedDate < London start of today` filter on the display-from cron** (idempotency).
   - An artefact received today was already notified by the upload path.
   - Without the filter, every same-day upload with a displayFrom of today that arrives before the cron runs is notified twice. That is the most common upload shape.
   - The result is the same whatever time the cron runs.
   - A supersede updates `lastReceivedDate` (`queries.ts:59`), so a re-upload today is notified by the upload path, not the cron.

Excluding scheduled list types from the display-from cron is **not** a departure. Legacy never emailed them from that branch, and this ticket is email only, so there is nothing left to send for them there.

### Identifying scheduled list types

**Decision: add the flag as data, not as a DB column.**
- Add `isScheduledSubscription?: boolean` to `ListTypeData` and set it to `true` on `MAGISTRATES_ADULT_COURT_LIST_DAILY` (`list-type-data.ts:714`) and `MAGISTRATES_PUBLIC_ADULT_COURT_LIST_DAILY` (`:734`). Leave the `_FUTURE` variants unset, as in legacy.
- `@hmcts/publication` derives `SCHEDULED_SUBSCRIPTION_LIST_TYPE_NAMES` from `listTypeData`. The query filters with `listType: { name: { in: SCHEDULED_SUBSCRIPTION_LIST_TYPE_NAMES } }`, the same pattern as `getLatestSjpArtefacts` (`queries.ts:341`).
- No numeric IDs and no migration. `list-type-data.ts` stays the single source of truth.
- The cron needs a name list to satisfy AC2's "identified by listTypeName" anyway, and a DB column would add a migration plus seed-SQL plus seed changes for one boolean.

### Switching the crons on

Merging this code sends nothing, because the repo default stays `SCRIPT_NAME: example`. The crons only run once their CronJobs are created in cnp-flux-config, which is raised alongside this PR. The upload path currently notifies every publication at upload, so enabling the CronJobs against today's upload path would notify future-dated and scheduled publications a second time.

## 2. Implementation Details

### File structure

```
libs/list-types/common/src/
├── list-type-data.ts                  # MODIFY: isScheduledSubscription?: boolean + flag 2 entries
└── list-type-data.test.ts             # NEW: exactly the two DAILY names are flagged
libs/publication/src/subscription-schedule/
├── london-day.ts                      # NEW: London-day bounds
├── london-day.test.ts                 # NEW
├── scheduled-list-types.ts            # NEW: SCHEDULED_SUBSCRIPTION_LIST_TYPE_NAMES (derived)
├── queries.ts                         # NEW: two selection queries
├── queries.test.ts                    # NEW
├── service.ts                         # NEW: two trigger functions + per-artefact send
└── service.test.ts                    # NEW
libs/publication/src/index.ts          # MODIFY: export the two trigger functions
libs/publication/package.json          # MODIFY: add "luxon": "3.7.2" (+ @types/luxon dev)
apps/crons/src/
├── display-from-subscriptions.ts      # NEW: thin entry, default export
├── display-from-subscriptions.test.ts # NEW
├── scheduled-list-type-subscriptions.ts      # NEW
└── scheduled-list-type-subscriptions.test.ts # NEW
apps/crons/package.json                # MODIFY: deps @hmcts/publication, @hmcts/postgres-prisma, @hmcts/redis
apps/crons/tsconfig.json               # MODIFY: project references for the new deps
apps/crons/config/{custom-environment-variables,default,development}.json  # MODIFY: redis.url
apps/crons/helm/values.yaml            # MODIFY: Key Vault secrets + env; SCRIPT_NAME stays 'example'
```

There are no DB schema changes and no migration.

### `london-day.ts`

```typescript
export function getLondonDay(now: Date): LondonDay
// luxon: const start = DateTime.fromJSDate(now).setZone("Europe/London").startOf("day")
// start: start.toJSDate()
// end: start.plus({ days: 1 }).toJSDate()          (exclusive; correct across BST changes)
// contentDate: DateTime.fromISO(start.toISODate(), { zone: "utc" }).toJSDate()   (UTC midnight, matches @db.Date)

interface LondonDay { start: Date; end: Date; contentDate: Date }
```

- Luxon `3.7.2` is already the pinned version used across list-type libs, and `@hmcts/list-types-common` already uses `setZone("Europe/London")` (`libs/list-types/common/src/rendering/date-formatting.ts:21`).
- Manual uploads store `displayFrom` at UTC midnight (`libs/web-core/src/utils/date-utils.ts:34`). That always falls inside `[start, end)` of the same London date, because London is never behind UTC.

### `scheduled-list-types.ts`

```typescript
import { listTypeData } from "@hmcts/list-types-common";
export const SCHEDULED_SUBSCRIPTION_LIST_TYPE_NAMES = listTypeData.filter((lt) => lt.isScheduledSubscription).map((lt) => lt.name);
```

### `queries.ts`

```typescript
export async function findArtefactsDisplayedFromToday(day: LondonDay, now: Date): Promise<ScheduledArtefact[]>
// where: { displayFrom: { gte: day.start, lt: day.end },
//          OR: [{ displayTo: null }, { displayTo: { gt: now } }],
//          lastReceivedDate: { lt: day.start },
//          listType: { name: { notIn: SCHEDULED_SUBSCRIPTION_LIST_TYPE_NAMES } } }

export async function findScheduledListTypeArtefactsForToday(day: LondonDay, now: Date): Promise<ScheduledArtefact[]>
// where: { listType: { name: { in: SCHEDULED_SUBSCRIPTION_LIST_TYPE_NAMES } },
//          contentDate: day.contentDate,
//          OR: [{ displayTo: null }, { displayTo: { gt: now } }] }   // displayFrom not checked, as legacy
```

Both queries:
- select `artefactId, locationId, listTypeId, contentDate, language, isFlatFile, listType: { select: { name: true } }` (what `sendPublicationNotificationsForArtefact` and the logs need);
- map the result to `ScheduledArtefact` with `listTypeName: string`;
- drop NoMatch locations in JS with `isNoMatchLocationId` (`libs/publication/src/no-match-location.ts:12`). The upload path never notifies these, and `parseInt` would otherwise log a failure for them every day (`service.ts:633-637`).

### `service.ts`

```typescript
export async function triggerDisplayFromSubscriptions(now: Date = new Date()): Promise<TriggerSummary>
// artefacts = await findArtefactsDisplayedFromToday(getLondonDay(now), now)       // throws -> propagate
// return notifyAll(artefacts)

export async function triggerScheduledListTypeSubscriptions(now: Date = new Date()): Promise<TriggerSummary>
// artefacts = await findScheduledListTypeArtefactsForToday(getLondonDay(now), now)
// return notifyAll(artefacts)

async function notifyAll(artefacts): Promise<TriggerSummary>   // sequential, counts successes/failures
async function notifyArtefact(artefact): Promise<boolean>     // per-artefact try/catch, returns success
// jsonData = artefact.isFlatFile ? undefined : await getPublicationJson(artefact.artefactId)
// locale = artefact.language === "WELSH" ? "cy" : "en"
// const r = await sendPublicationNotificationsForArtefact({ artefactId, locationId, listTypeId, contentDate,
//          jsonData, pdfFilePath: `${artefactId}.pdf`, locale, logPrefix: LOG_PREFIX }); failure if !r.success

const LOG_PREFIX = "[SubscriptionSchedule]";
interface TriggerSummary { total: number; succeeded: number; failed: number }
```

- `pdfFilePath` is the blob key, exactly as the upload path passes it.
- `jsonData` is loaded from the artefact blob through `getPublicationJson` (`libs/publication/src/file-storage/file-retrieval.ts:40-44`). The upload path keeps it in memory; the cron has to reload it.

### Cron scripts (`apps/crons/src/*.ts`)

```typescript
// display-from-subscriptions.ts
import { closeRedisClient } from "@hmcts/redis";
import { prisma } from "@hmcts/postgres-prisma";
import { triggerDisplayFromSubscriptions } from "@hmcts/publication";

export default async function displayFromSubscriptions() {
  try {
    const summary = await triggerDisplayFromSubscriptions();
    console.info("[SubscriptionSchedule] display-from run complete:", summary);
  } finally {
    await closeRedisClient();
    await prisma.$disconnect();
  }
}
```

- `scheduled-list-type-subscriptions.ts` is identical, but calls the scheduled function.
- Static imports are safe. `index.ts` imports the script only after `getPropertiesVolumeSecrets` has populated the env (`index.ts:9-28`), and `@hmcts/postgres-prisma` reads `DATABASE_URL` at import (`libs/postgres-prisma/src/index.ts:4-16`).
- The `finally` disconnect is needed because the open Prisma pool and Redis socket would otherwise stop the Node process from exiting. `example.ts` never opened connections, so this was never exercised.
- `index.ts` needs no change.

### Config and helm (this repo)

- `apps/crons/config/custom-environment-variables.json`: add `"redis": { "url": "REDIS_URL" }`.
- `apps/crons/config/development.json`: add `"redis": { "url": "redis://localhost:6380" }`, the same as `apps/api/config/default.json`.
- `apps/crons/helm/values.yaml` Key Vault secrets: add these, with the same names and aliases as `apps/web/helm/values.yaml:60-86` / `apps/api/helm/values.yaml:17-39`:
  - `redis-url`
  - `govuk-notify-api-key`
  - `storageaccount-connection-string`
  - `storageaccount-name`
- `apps/crons/helm/values.yaml` env: add `CATH_SERVICE_URL: https://cath.{{ .Values.global.environment }}.platform.hmcts.net` and `MAX_SUMMARY_PAYLOAD_KB: 256`, to match web/api.
- Leave `SCRIPT_NAME: 'example'` and the placeholder schedule unchanged.

### Out-of-repo (cnp-flux-config `apps/cath`) — raised alongside this PR

Two CronJob HelmReleases using the `cath-crons` image, at the legacy times (UTC, no `timeZone`):
- `SCRIPT_NAME=display-from-subscriptions`, `0 1 * * *` (01:00 GMT / 02:00 BST).
- `SCRIPT_NAME=scheduled-list-type-subscriptions`, `30 10 * * *` (10:30 GMT / 11:30 BST).

Both inherit `concurrencyPolicy: Forbid` and `activeDeadlineSeconds: 3600` from `apps/crons/helm/values.yaml`. No `backoffLimit` is set, which matches legacy (see section 3). The HMCTS job chart would drop a numeric `0` anyway, because it renders the field only `if` it is truthy.

**Multi-cluster:** CaTH runs on both cft 00 and 01 clusters (aat, demo, perftest), so a plain schedule on both would email everyone twice a day. Rather than legacy's day-of-week split, each HelmRelease sets `disableActiveClusterCheck: false`. `ACTIVE_CRON_CLUSTER` is `"true"` only on 00 (`apps/flux-system/<env>/00/kustomize.yaml`), so the job chart suspends the CronJob on 01. It also follows the platform's flag if the active cluster moves.

## 3. Error Handling & Edge Cases

- **Query failure**: the error is thrown, `index.ts` logs "Cron job failed" and exits 1 (`index.ts:41-43`). Nothing was sent, so a manual re-run is safe.
- **Per-artefact failure (AC3)**: covers a JSON blob missing or unparseable, `sendPublicationNotificationsForArtefact` returning `success: false`, and any unexpected throw.
  - Log `{ artefactId, listTypeName, error: message }` only. No emails or payloads. This matches the existing sanitised logging (`service.ts:680-685`).
  - Count the failure and continue.
  - The run exits 0 with `failed` in the summary log. Exiting non-zero with a k8s retry would re-send to everyone who succeeded (agreed: succeed and log).
- **Retries / reruns**: there is no per-recipient dedupe. `notification_audit_log` is written but never checked before sending (`libs/notifications/src/notification/notification-queries.ts`). As in legacy, the run must not fail once sending has started: per-artefact errors are counted, and connection-close errors are logged rather than thrown (`apps/crons/src/close-connections.ts`). Any manual rerun re-sends. Document this in the PR. Adding dedupe is out of scope.
- **Missed run** (cluster outage): that day's deferred set is never sent. Legacy has the same behaviour. Accept it and note it.
- **Same-day uploads**:
  - displayFrom today, received today: notified at upload and excluded by the `lastReceivedDate` filter, so sent once.
  - Received yesterday, superseded today: the upload today notifies it, the cron skips it.
  - Superseded after the cron ran: notified again, as a normal supersede.
- **Scheduled list type uploaded after the scheduled cron ran on its content date**: the cron has already run, so it does not email it. Legacy has the same gap. Today the upload path emails at upload anyway, so nobody misses out.
- **Scheduled artefact with contentDate before displayFrom**: the display-from cron excludes scheduled list types, and the scheduled cron only emails when `contentDate = today`, so a list displayed after its content date gets no email. This is unusual for DAILY lists. Accept it.
- **Time of day**: selection is date-based. A displayFrom of 14:00 today is notified at 01:00 UTC, before it is publicly visible (`isWithinDisplayWindow` is instant-based, `display-window.ts:6-16`). This matches legacy.
- **Manual upload with displayTo = today**: stored as UTC midnight, so `displayTo > now` is false all day. It is excluded, which is consistent with public visibility (hidden from midnight). Note it only.
- **Scheduled list type with no displayTo**: included by the scheduled cron (not expired), per the ticket. Legacy excluded these.
- **Scheduled list type not yet public** (contentDate today, displayFrom tomorrow): emailed at 10:30 anyway, copying legacy.
- **BST / clock change**: `[start, end)` comes from luxon in Europe/London, so 23- and 25-hour days are correct. At 23:30Z on 1 June, "today" is 2 June.
- **NoMatch locations**: filtered out.
- **Image size**: `@hmcts/publication` pulls in `@hmcts/pdf-generation` (`puppeteer` 24.42.0) through `yarn workspaces focus @hmcts/crons --production` (`Dockerfile:90`). Verify the crons image still builds and check its size (task).

## 4. Acceptance Criteria Mapping

| AC | How it is satisfied | Verified by |
|---|---|---|
| 1. Retrieve artefacts with display_from = today and display_to future/null, trigger subscriptions, on a schedule | `findArtefactsDisplayedFromToday` + `triggerDisplayFromSubscriptions`, run by `SCRIPT_NAME=display-from-subscriptions` on a flux CronJob | Scenarios 3, 5, 7; flux task |
| 2. Scheduled list types (the two MAGISTRATES_*_DAILY): content date today, not expired, sent at a set time; identified by `listTypeName` | `isScheduledSubscription` in `list-type-data.ts`, `SCHEDULED_SUBSCRIPTION_LIST_TYPE_NAMES`, a `listType.name in` relation filter, and `triggerScheduledListTypeSubscriptions` | Scenarios 1, 4, 6, 7 |
| 3. Log and handle errors; one artefact failing doesn't stop the rest | Per-artefact try/catch, summary counts, query errors propagate to exit 1 | Scenarios 5, 6, 8 |
| Tech: script in `apps/crons/src` via `SCRIPT_NAME` | Two default-export scripts, unchanged runner | Scenario 8 |
| Tech: reuse `sendPublicationNotificationsForArtefact` | Called directly by `notifyArtefact` | Scenario 5 |
| Tech: schedule in cnp-flux-config | Out-of-repo task; repo `SCRIPT_NAME` stays `example` | Review |

## 5. Test Scenarios

Unit tests only. A cron has no user journey, and asserting emails would need Notify and time control, so there is no E2E test.

1. **`list-type-data.test.ts`**: exactly `MAGISTRATES_ADULT_COURT_LIST_DAILY` and `MAGISTRATES_PUBLIC_ADULT_COURT_LIST_DAILY` have `isScheduledSubscription: true`, and the `_FUTURE` variants do not.
2. **`london-day.test.ts`** (`it.each`):
   - GMT day, `2026-01-15T10:00Z`: start `2026-01-15T00:00Z`.
   - BST late-night UTC, `2026-06-01T23:30Z`: start `2026-06-01T23:00Z` (2 June), contentDate `2026-06-02T00:00Z`.
   - Clock-change day, `2026-10-25`: `end - start` = 25h.
3. **`queries.test.ts` / `findArtefactsDisplayedFromToday`**: `findMany` is called with the displayFrom range, the displayTo null-or-future OR, `lastReceivedDate < day.start`, and `listType: { name: { notIn: [the two DAILY names] } }`. The result is mapped to `listTypeName`. A NoMatch row is dropped.
4. **`queries.test.ts` / `findScheduledListTypeArtefactsForToday`**: `where.listType` is `{ name: { in: [the two DAILY names] } }` and `listTypeId` is not used. Also checks `contentDate` = `day.contentDate`, the displayTo null-or-future OR, no `displayFrom` condition, and that the fixture uses `listTypeId: 999`.
5. **`service.test.ts` / `triggerDisplayFromSubscriptions`** (mock queries, `sendPublicationNotificationsForArtefact`, `getPublicationJson`):
   - Each artefact is emailed with `pdfFilePath: "<id>.pdf"`, the loaded JSON, and locale `cy` for WELSH.
   - A flat file does not load JSON.
   - With three artefacts where the second's email returns `success: false` and the third's `getPublicationJson` rejects, all three are attempted and the result is `{ total: 3, succeeded: 1, failed: 2 }`. The error log has the artefactId and no email.
6. **`service.test.ts` / `triggerScheduledListTypeSubscriptions`**:
   - Each artefact returned by the scheduled query is emailed.
   - If `getPublicationJson` rejects for one artefact, the others are still sent.
   - If the query rejects, the function rejects and nothing is sent.
7. **`service.test.ts`**: the London day passed to the queries comes from the injected `now`, with a BST late-night case.
8. **`apps/crons/src/*.test.ts`** (one file per script, two tests each):
   - It calls the trigger, logs the summary, and closes Redis and Prisma.
   - When the trigger rejects, the error propagates and Redis and Prisma are still closed.

## CLARIFICATIONS NEEDED

None outstanding. Resolved 2026-10-29:

1. **cnp-flux-config CronJobs**: raised by the developer alongside this PR.
2. **Send times**: match legacy, in UTC: display-from `0 1 * * *`, scheduled `30 10 * * *`.
3. **Partial failure**: the job succeeds (exit 0) and logs the failure count and artefact IDs, so Kubernetes does not retry.
4. **Scheduled query**: include null `displayTo` (follows the ticket's "not expired yet", unlike legacy); no `displayFrom` check (as legacy).
5. **Scheduled list types in the display-from cron**: excluded; this matches legacy, which never emailed them from that branch.
