# Code Review: Issue #1272

CaTH Cron Trigger - Subscription Triggers. This is a re-review of the uncommitted work on `feature/1272-cron-subscription-triggers` against `master`, including the untracked files. I checked every finding from the previous review against the current code. I also reviewed the cnp-flux-config draft in `/tmp/flux-1272/cnp-flux-config` (branch `feature/cath-1272-subscription-crons`) and the HMCTS `job` chart v2.2.0 source (`hmcts/chart-job`, tag `v2.2.0`), which `apps/crons/helm/Chart.yaml` depends on.

## Summary

The change adds two cron scripts, `display-from-subscriptions` and `scheduled-list-type-subscriptions`, in `apps/crons/src/`. Both are thin wrappers around a new `subscription-schedule/` domain in `@hmcts/publication`:

- They select today's artefacts using a London-day window.
- They call the existing `sendPublicationNotificationsForArtefact` for each artefact in turn, with errors isolated per artefact.
- They close Redis and Prisma through a new best-effort `closeConnections()`.

Scheduled list types are flagged as data in `list-type-data.ts` and filtered by `listType.name`. Nothing uses a numeric ID.

**Previous findings, rechecked:**

| Previous finding | Status now |
|---|---|
| Critical 1: double send at upload | **Settled.** Out of scope, tracked as #588, which must ship before the flux CronJobs merge. Recorded as a dependency below, not a defect. |
| Critical 2: no CronJob schedules | **Resolved by the draft (not yet raised).** Both HelmReleases exist with the legacy UTC schedules, `SCRIPT_NAME` set and `disableActiveClusterCheck: false`. I verified that the chart suspends the CronJob on cluster 01 (details below). |
| High 1: AC1/AC2 partial | **Resolved**, given the draft and the #588 dependency. |
| High 2: Redis hang blocks runs under `Forbid` | **Mitigated as agreed.** `activeDeadlineSeconds: 3600` (`apps/crons/helm/values.yaml:34`) renders into the Job spec (`job/templates/_jobspec.tpl:13-15`), so a hung run is killed and the next day's run is not blocked. The bounded reconnect is now a suggestion. |
| High 3: cleanup can change the exit code / `backoffLimit` | **Resolved for the rejection case** by `Promise.allSettled` (`apps/crons/src/close-connections.ts:8-16`). `backoffLimit` is settled (matches legacy; chart default is 6, `restartPolicy: OnFailure`). **New gap:** cleanup *hangs* rather than rejects in the most likely Redis failure mode. See Suggestion 1. |
| Suggestions 1-9 | 1 (over-reported success), 2 (image size), 3 (`as string`), 4 (`payloadSizeBytes`), 5 (comment), 6 (indexes), 7 (seeded smoke run), 8 (`tsx`) and 9 (PR note) are all still open. None has been addressed, and none blocks merge. |

**No new critical or high defects.** One new defect came in with the fix: `closeRedisClient()` uses `quit()`, which never settles if the Redis connection dropped before cleanup. I reproduced it against the local Redis. Its impact is bounded: no emails are re-sent, and the run either stops early or is killed by the deadline. So it is a suggestion, not a blocker.

**Known dependency, not a defect of this PR.** #588 must gate upload-time notifications before the flux HelmReleases merge. When it does, it needs to stay consistent with two assumptions this PR makes:

- The upload path still notifies a publication whose `displayFrom` is today and which was received today. `queries.ts:21-22` excludes these from the display-from cron on that assumption.
- A scheduled list type uploaded after 10:30 UTC on its content date gets a decision either way (`plan.md:235`).

Out of scope for this review: there is no UI, so accessibility, the GOV.UK Design System, Welsh content and progressive enhancement do not apply.

## 🚨 CRITICAL Issues

None.

## ⚠️ HIGH PRIORITY Issues

None.

## 💡 SUGGESTIONS

### 1. `closeConnections()` hangs, rather than logs, when Redis dropped before cleanup (new, introduced by the fix)

- **Where:**
  - `apps/crons/src/close-connections.ts:8` awaits `closeRedisClient()`.
  - `closeRedisClient()` calls `redisClient.quit()` (`libs/redis/src/redis-client.ts:18-22`).
- **Mechanism (redis 5.12.1):**
  - `quit()` sets the socket's `isOpen` to false, which stops the reconnect loop.
  - It then queues `QUIT` on a socket that no longer exists (`node_modules/@redis/client/dist/lib/client/index.js:1053-1062`, `socket.js:283-290`, `write()` returns early when `#socket` is undefined).
  - The promise never settles.
- **Reproduced:** I ran a TCP proxy in front of the local Redis, connected, sent `PING`, then destroyed the proxy. The client reported `isOpen: true, isReady: false`, and `await client.quit()` was still pending after 10 seconds.
- **Failure scenario:** Redis restarts, fails over or becomes unreachable after the last email of a run and before cleanup. `Promise.allSettled` never resolves, so:
  - nothing is logged, despite the comment at `close-connections.ts:4-6`;
  - `monitoring?.flush()` is never reached;
  - the process either drains its event loop and exits 0 silently, or, if any other handle stays open, sits until `activeDeadlineSeconds` kills it. The Job is then marked `Failed / DeadlineExceeded` even though every email was sent.

  Nothing is re-sent in either case, because a deadline kill does not retry. That is why this is a suggestion, not a blocker.
- **Gap in the tests:** `close-connections.test.ts:34-62` only covers a *rejecting* `closeRedisClient`.
- **Fix:** keep `close-connections.ts` the same shape, but make sure the Redis close cannot hang. Either:
  - use `destroy()` (or `close()`) when `!client.isReady` in `closeRedisClient`; or
  - race each close in `closeConnections` against a short timeout, for example 5 seconds, and log the timeout.

  Add a test where `closeRedisClient` never resolves.

### 2. Bound how long Redis can reconnect (residual of previous High 2)

`createClient` still has no `connectTimeout` or `reconnectStrategy` cap (`libs/redis/src/redis-client.ts:11-14`). With the deadline in place, an unreachable Redis now costs one hour and that day's remaining artefacts, which are never sent because there is no retry after `DeadlineExceeded`. It no longer blocks every later run. A bounded strategy would make each send fail fast, so the artefact is counted as failed and the run carries on. This is optional under the agreed retry decision.

### 3. The summary over-reports success (carried over, still present)

`notifyArtefact` counts success whenever `result.success` is true (`libs/publication/src/subscription-schedule/service.ts:48-52`). `sendPublicationNotificationsForArtefact` returns `success: true` even when every email failed (`libs/publication/src/processing/service.ts:678-685,719-725`). So the run log can show `{ succeeded: N, failed: 0 }` for a run that delivered nothing. Add `sent`, `failed` and `skipped` from the result into `TriggerSummary`, so operations can alert on it.

### 4. `plan.md` is out of date with the settled decisions

- `plan.md:218`, `:229` and `:286` still say flux needs `backoffLimit: 0`.
- `plan.md:220` still prescribes the legacy day-of-week split.

Both were superseded: retries now match legacy, and duplication across clusters is handled by the active-cluster check. Update the plan so the next reviewer or implementer does not "fix" the flux draft back.

### 5. Image size (carried over)

The image is 1.14GB and there is no baseline (`tasks.md:35`). `@hmcts/publication` pulls in puppeteer and every list-type package, and the crons need none of them. Measure `master`'s image. If the difference matters, prune or add a narrow subpath export.

### 6. Smoke-test against seeded artefacts before enabling in AAT (carried over)

The smoke runs used an empty database, so Redis, Blob and Notify were never opened. One seeded run with a Notify test key would confirm that the process exits once real connections are open. It would also exercise the `@db.Date` equality and the `notIn` relation filter against Postgres. I checked: Node's keep-alive agents unref idle sockets, so the risk is low but unproven.

### 7. Smaller carried-over items

- `london-day.ts:8`: the `as string` assertion. `DateTime.utc(start.year, start.month, start.day)` avoids it.
- `service.ts:38-47`: `payloadSizeBytes` is not passed, so the summary gate uses the re-serialised size, which can differ slightly from the upload path.
- `service.ts:18`: the comment "Notify load stays flat" is only partly true, because recipients within one artefact are sent concurrently.
- `base.prisma:11-32`: no index on `display_from`, `content_date` or `last_received_date`. A full scan once a day is fine at current volumes.
- `apps/crons/package.json:24-27`: there is no `tsx` and no `vitest` devDependency, so both `yarn workspace @hmcts/crons dev` and `yarn workspace @hmcts/crons test` fail with "command not found". I confirmed the `test` failure. `turbo test` from the root still works. This was already the case on `master`.
- PR description: add the no-dedupe / manual-rerun-re-sends note (`tasks.md:39`).

### 8. Emails before visibility (accepted, recorded for awareness only)

Selection is by date. A `displayFrom` of 14:00 today is emailed at 01:00 UTC. A scheduled list type with `displayFrom` tomorrow is emailed at 10:30 on its content date. This includes `MAGISTRATES_ADULT_COURT_LIST_DAILY`, which is `Classified`. Both cases match legacy and are accepted in `plan.md:237,240`. Make sure #588's design does not assume the cron respects the time of day.

## ✅ Positive Feedback

- **The flux draft is correct for the platform.** I checked these points:
  - **Schedules:** `0 1 * * *` and `30 10 * * *` (both HelmReleases, line 19), at the legacy UTC times.
  - **Script names:** `SCRIPT_NAME` is set per release (line 22). The `environment` map merges with the chart's, so the Key Vault secrets, `CATH_SERVICE_URL` and `activeDeadlineSeconds` are inherited.
  - **Active-cluster check:** `disableActiveClusterCheck: false` (line 20). Because Sprig's `default` treats `false` as empty, the chart falls back to `global.disableActiveClusterCheck` (`job/templates/CronJob.yaml:8`). That is `false` by chart default and is set nowhere else, so the check is active. `global.activeCronCluster` comes from `${ACTIVE_CRON_CLUSTER}` (`apps/base/kustomize.yaml:35`). That is `"true"` only on 00 for aat, demo and perftest (`apps/flux-system/<env>/00/kustomize.yaml:18`) and unset on 01. As a result the chart renders `suspend: true` on 01 (`CronJob.yaml:26-30`), so each job runs once per environment per day.
  - **Concurrency:** `concurrencyPolicy: Forbid` is inherited from `apps/crons/helm/values.yaml:32`.
  - **Name length:** the CronJob names are 44 characters or fewer, under the 52-character limit.
  - **Chart pickup:** `version: ">=0.1.0-0"` picks up the prerelease chart that `job.helm-publish.yml` publishes on each build, so no chart version bump is needed.
- **Cleanup no longer changes the exit code on rejection.** `Promise.allSettled` runs both disconnects independently and logs only sanitised messages. Prisma is still disconnected when the Redis close fails. Both behaviours are tested.
- **The deadline is wired through the chart correctly.** `activeDeadlineSeconds` is a Job-level setting (`_jobspec.tpl:13-15`). It also bounds `restartPolicy: OnFailure` restarts. When it fires, the Job is not retried, so a hung run cannot cause re-sends.
- **The no-fail-after-sending invariant holds.** In this code I found no path that rejects once sending has started:
  - `notifyArtefact` catches everything (`service.ts:32-60`).
  - Cleanup cannot reject.
  - `MonitoringService.flush()` is synchronous (`cloud-native-platform/dist/monitoring/monitoring-service.js:51-52`).

  Only a query failure exits 1, and that happens before anything is sent, so the chart's automatic retries are safe there.
- **Correct London-day logic.** It uses luxon `Europe/London` `startOf("day")` with an exclusive end, so 23-hour and 25-hour days are right. `contentDate` is UTC midnight, to match `@db.Date`. DST is tested (`london-day.test.ts:7-65`).
- **List types by name only.** The flags are data in `list-type-data.ts:723,744` and derived at `scheduled-list-types.ts:3`. They are applied through `listType.name` filters (`queries.ts:23,34`), and the fixtures use `listTypeId: 999`. Seeding is unaffected: `generate-seed-sql.ts` and `seed-list-types.ts` map fields explicitly, so the new optional field is never sent to the database.
- **Config is consistent.** The Key Vault secret names match `apps/api/helm/values.yaml` and the preview overrides, so the pipeline-deployed `example` cron's secret mount keeps working. `SCRIPT_NAME` stays `example`, so merging does not start sending from the 5-minute pipeline cron.
- **Clean structure and logging.** Constants come first, then exports, helpers and interfaces. Nothing is exported only so it can be tested. No email addresses or payloads appear in any new log line.

## Test Coverage Assessment

| Workspace | Statement coverage | Status |
|---|---|---|
| `@hmcts/publication` | 97.05% | OK |
| `@hmcts/list-types-common` | 94.59% | OK |
| `@hmcts/crons` | 88.57% | OK |

All three workspaces are above 80%.

- **Unit:**
  - `subscription-schedule`: 24 tests in 3 files. I re-ran them and they pass. They cover London-day and DST, both where-clauses and the name filters, NoMatch rows, propagation of query errors, partial failure, missing JSON, flat files, Welsh locale and injected time.
  - `apps/crons`: 22 tests in 5 files. I re-ran them and they pass. They cover both scripts on success and on trigger rejection, and `closeConnections` for success, a Redis rejection, and a non-Error Prisma rejection.
  - `list-type-data.test.ts`: checks that exactly the two DAILY names are flagged and the `_FUTURE` variants are not.
  - Lint 71/71 and the full suite 71/71 were reported as passing.
- **Gaps:**
  - No test for a Redis close that never settles (Suggestion 1).
  - No integration check of the Prisma filters against Postgres (Suggestion 6).
- **E2E:** none, which is appropriate. A cron has no user journey.
- **Accessibility:** does not apply (no UI).

## Acceptance Criteria Verification

- [x] **AC1 – Retrieve artefacts where `display_from` is today and `display_to` is in the future or null, trigger notifications for them, and run the query on a scheduled trigger.**
  - Query: `libs/publication/src/subscription-schedule/queries.ts:16-29` (London-day `displayFrom` window, `displayTo` null or `> now`).
  - Trigger: `service.ts:8-11,19-61`.
  - Script: `apps/crons/src/display-from-subscriptions.ts:4-11`.
  - Schedule: draft `cnp-flux-config/apps/cath/cath-crons-display-from-subscriptions/cath-crons-display-from-subscriptions.yaml:19-22` (`0 1 * * *`). Pending raising and merge.
  - Deliberate narrowing, agreed in the plan: the `lastReceivedDate` filter and the exclusion of scheduled list types (`queries.ts:21-23`).
  - Depends on #588 to remove the upload-time duplicate.
- [x] **AC2 – For the flagged list types, find today's unexpired publications by content date and send them at a set time using this cron.**
  - Flags: `libs/list-types/common/src/list-type-data.ts:723,744`.
  - Query: `queries.ts:31-42` (name `in`, `contentDate = day.contentDate`, not expired, null `displayTo` included).
  - Trigger: `service.ts:13-16`.
  - Script: `apps/crons/src/scheduled-list-type-subscriptions.ts:4-11`.
  - Set time: draft `cath-crons-scheduled-list-type-subscriptions.yaml:19-22` (`30 10 * * *`). Pending raising and merge.
  - The send at upload is removed by #588, which is a dependency.
- [x] **AC2 – List types are identified by `listTypeName`, never by numeric `listTypeId`.**
  - `scheduled-list-types.ts:3`, `queries.ts:23,34`.
  - Tested in `queries.test.ts:109-141` with `listTypeId: 999`.
  - The row's own `listTypeId` is only forwarded to the existing notification API.
- [x] **AC3 – Errors are logged and handled, and a failure on one artefact does not stop the rest.**
  - Per-artefact try/catch with sanitised logging: `service.ts:29-61`.
  - The loop carries on after a failure: `service.ts:19-27`.
  - Query errors propagate and are logged by `apps/crons/src/index.ts:40-44`.
  - Connection-close failures are logged rather than thrown: `apps/crons/src/close-connections.ts:7-17`. A close that never settles is not handled (Suggestion 1); it does not cause a re-send.
  - Tested in `service.test.ts:94-147,187-211` and `close-connections.test.ts:34-62`.
- [x] **Tech note – implemented as scripts in `apps/crons/src/`, run through the existing `SCRIPT_NAME` entrypoint.**
  - Default exports in `display-from-subscriptions.ts:4` and `scheduled-list-type-subscriptions.ts:4`.
  - Loaded by the unchanged `apps/crons/src/index.ts:28-31`.
- [x] **Tech note – reuses `sendPublicationNotificationsForArtefact` rather than duplicating it.**
  - `libs/publication/src/subscription-schedule/service.ts:2,38-47`.
- [x] **Tech note – the CronJob and schedule are configured in cnp-flux-config (`apps/cath`), and the repo schedule stays a placeholder.**
  - Draft HelmReleases: `apps/cath/cath-crons-display-from-subscriptions/…yaml:16-22` and `apps/cath/cath-crons-scheduled-list-type-subscriptions/…yaml:16-22`.
  - Registered in `apps/cath/{aat,demo,perftest}/base/kustomization.yaml:11-12`.
  - The repo placeholder is unchanged: `apps/crons/helm/values.yaml:12,31`.
  - Met by the draft, which is not yet committed or raised. Its merge is gated on #588 and on an hmctsprod image that contains these scripts (`tasks.md:45`).

**Tally: 7 of 7 met.** The flux criterion and the schedule parts of AC1 and AC2 depend on the draft being raised and merged.

## Next Steps

- [ ] Optional before merge: make the Redis close unable to hang, either with `destroy()` or `close()` when not ready, or a timeout race, and add a never-resolving test (Suggestion 1).
- [ ] Update `plan.md:218,220,229,286` to match the settled retry and active-cluster decisions (Suggestion 4).
- [ ] Add the no-dedupe / manual-rerun-re-sends note to the PR description (`tasks.md:39`).
- [ ] Decide on image size against a `master` baseline (Suggestion 5).
- [ ] Before enabling in AAT, do a seeded smoke run with a Notify test key (Suggestion 6).
- [ ] Merge order:
  1. this PR;
  2. #588, which gates upload-time notifications while keeping "displayFrom today, received today" notified at upload and deciding what happens to scheduled list types uploaded after 10:30;
  3. a promoted hmctsprod `cath-crons` image that contains these scripts;
  4. then commit, raise and merge the cnp-flux-config draft.
- [ ] Consider adding the email-level counts to `TriggerSummary`, and the bounded Redis reconnect (Suggestions 2 and 3).

## Overall Assessment: APPROVED

The code is correct, well tested, and above 80% coverage in every workspace. Every previous critical and high finding is resolved, mitigated as agreed, or settled as the #588 dependency. The flux draft is correct: it uses the legacy UTC schedules, sets `SCRIPT_NAME` per release, and suspends each CronJob on cluster 01, as I confirmed in the chart source.

The approval comes with two conditions:
- The flux HelmReleases must not merge before #588 and before an image containing these scripts is promoted.
- The `quit()` hang (Suggestion 1) should ideally be fixed in this PR. It is a real defect introduced by the cleanup change, but it cannot cause duplicate emails.

## Post-review fixes

- Suggestion 1 (`quit()` hang on a dropped Redis connection): fixed. `closeRedisClient` now calls `quit()` only when `isReady` and otherwise calls `destroy()` (`libs/redis/src/redis-client.ts`), with a test in `libs/redis/src/index.test.ts`. Checked by stopping the local Redis mid-run: the close finishes in 2ms and the process exits 0.
- Outdated `plan.md` lines on `backoffLimit: 0` and the day-of-week split: updated to the settled decisions.
