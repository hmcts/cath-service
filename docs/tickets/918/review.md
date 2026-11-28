# Code Review: Issue #918

## Summary

This change adds a headless retention cron that hard-deletes `user_archive` rows archived 3 or more calendar months ago.

- **Business logic** is in `@hmcts/account`, under a new `./user-archive` subpath:
  - `libs/account/src/user-archive/service.ts`
  - `libs/account/src/user-archive/query.ts`
- **Runner script** is `apps/crons/src/purge-user-archive.ts`.
- **Guard test** `apps/crons/helm/values.yaml.test.ts` makes sure the umbrella chart (preview and pipeline deploys) keeps running only `example`.
- **Flux HelmRelease** is drafted in `docs/tickets/918/flux-config.md`. It will be raised as a separate PR to `hmcts/cnp-flux-config`, which is a deliberate process boundary.

The implementation is small and correct, and it matches the plan closely.

Checks I ran on this tree:
- `tsc --noEmit -p apps/crons` passed.
- `turbo build --filter=@hmcts/crons` passed. It emits `apps/crons/dist/purge-user-archive.js` and `libs/account/dist/user-archive/{service,query}.js`.
- `biome check apps/crons libs/account` passed with 0 issues.
- Unit tests passed: account 38/38, crons 20/20.
- `--conditions=production` resolution from `apps/crons` gives `libs/account/dist/user-archive/service.js` and `libs/postgres-prisma/dist/index.js`. The crons script and the account lib therefore share one Prisma singleton.

I found no code defects. The only open item is AC8: the deployment exists only as a draft until the Flux PR merges and is checked on aat.

N/A categories:
- **Accessibility, GOV.UK Design System, responsive/mobile-first, Welsh:** not applicable. This is a headless Kubernetes CronJob with no pages, templates or user-facing text.

## 🚨 CRITICAL Issues

None.

## ⚠️ HIGH PRIORITY Issues

1. **AC8 partially met: the deployment is drafted but not live.** See `docs/tickets/918/flux-config.md:15-90` and `docs/tickets/918/tasks.md:378-383`.
   - **Impact:** No environment runs the purge until the `hmcts/cnp-flux-config` PR is merged. Until then, `user_archive` rows keep building up (zero today, because #351 has not merged).
   - **Not a code defect.** I checked the draft against live `hmcts/cnp-flux-config` master and it is correct:
     - `cath-crons.yaml` uses the same `apiVersion`, remediation, chart `cath-crons`, `hmctsprod-oci` sourceRef and `{"$imagepolicy": "flux-system:cath-crons"}` marker.
     - The kustomization context lines match exactly for aat, demo, perftest and prod.
     - `stg/base` does not exist, and `preview/base` does not list crons.
     - The image policy and repo are already wired in `apps/cath/automation/kustomization.yaml`, so reusing the marker is valid.
     - None of the env `patches:` target the cath-crons HelmRelease, so the new release inherits nothing unexpected.
     - Helm deep-merges `job.environment`, so `NODE_ENV`, `POSTGRES_DATABASE` and `keyVaults` (`postgres-url` → `DATABASE_URL`) are kept.
   - **Remaining work:**
     - (a) Raise the Flux PR, and only after a `cath-crons` image containing `dist/purge-user-archive.js` has been promoted. Replace `<TAG>` with the tag the policy currently resolves to.
     - (b) Do the aat checks in tasks.md: `kubectl get cronjob` shows `0 2 * * *` and `cath-crons` still shows `*/5`, then trigger a manual job and inspect the log line.

## 💡 SUGGESTIONS

1. **A `$disconnect()` failure can hide the real error.** See `apps/crons/src/purge-user-archive.ts:8-10`.
   - If `purgeExpiredUserArchives()` rejects (for example, the DB is unreachable) and `prisma.$disconnect()` then also rejects, the `finally` rejection replaces the original. The runner then logs the disconnect error instead of the root cause.
   - This is unlikely, and the exit code is still non-zero, so AC7 still holds. It would make failures easier to diagnose.
   - **Fix:** `await prisma.$disconnect().catch((error) => console.error("Prisma disconnect failed:", error));` keeps the primary error.
2. **Add non-clamping month-end and year-rollover cases to the `it.each` table.** See `libs/account/src/user-archive/service.test.ts:45-51`.
   - Current cases cover clamping (31 May → 28/29 Feb, 31 Dec → 30 Sep) and rollover with a mid-month day (15 Jan → 15 Oct).
   - Add `2027-03-31T02:00Z → 2026-12-31T02:00Z`, a rollover where day 31 must *not* be clamped.
   - Add `2027-05-29T02:00Z → 2027-02-28T02:00Z`, the clamp from a day other than the 31st.
   - These make sure the `firstOfTargetMonth` normalisation (`service.ts:12-15`) never drifts.
3. **The runner's exit-code path is not covered by tests (pre-existing).** See `apps/crons/src/index.ts:40-44`.
   - AC7 ("exits non-zero and the error is logged") depends on `main().catch(...)` → `console.error` + `process.exit(1)`. Coverage shows lines 41-43 as uncovered.
   - `index.test.ts:83` only checks that `main()` rejects.
   - This predates the ticket. A small test that extracts or simulates the entrypoint (or a `spawnSync` smoke test with `SCRIPT_NAME=does-not-exist`) would close the gap the AC relies on.
4. **Make `values.yaml.test.ts` match the house style.** See `apps/crons/helm/values.yaml.test.ts:13-28`.
   - `parse()` returns `any`, so `values.job.environment.SCRIPT_NAME` and `values["cath-crons"]?.job?...` are untyped. A small `interface CronsValues { job?: { environment?: { SCRIPT_NAME?: string } } }` cast at the `readYaml` boundary keeps the no-`any` rule.
   - `.claude/rules/testing.md` asks for Arrange/Act/Assert comments in unit tests (only template tests are exempt), and these two tests have none.
5. **Optional: test against a real database.** All deletion tests mock `prisma.userArchive.deleteMany`. They pin the exact `where` (`lte` and the exact cutoff instant), but not Postgres behaviour on `timestamp(3)` without a time zone.
   - The risk is low because both writer (#351) and reader use Prisma, which stores UTC.
   - The planned aat seed-and-run check (tasks.md:383) is the right place to confirm this. Do not skip it.
6. **Optional: consider an explicit CronJob `timeZone: Etc/UTC`** in the Flux values, if the `cath-crons` / base job chart supports it.
   - AKS controller-manager runs in UTC today, so `0 2 * * *` is correct.
   - An explicit field would record the ticket's "UTC" rule in config rather than leaving it to the cluster default.

## ✅ Positive Feedback

**Architecture**
- Correct lib choice. Putting the logic in `@hmcts/account` instead of `@hmcts/system-admin-pages` keeps Express, LaunchDarkly and notifications out of the crons image (`yarn workspaces focus @hmcts/crons --production`).
- The `./user-archive` subpath export (`libs/account/package.json:18-21`) and the tsconfig path (`tsconfig.json:18`) follow the existing `repository/*` pattern. `query.ts` stays internal.
- Follows CLAUDE.md:
  - module ordering in `service.ts`: constant, then exported function, then helper, then interface at the bottom
  - kebab-case file names and `.js` relative imports
  - no `types.ts` or `utils.ts`
  - no exports added only for tests (`subtractUtcMonthsClamped` is tested through the public function)
  - `RETENTION_MONTHS` is a fixed constant, as the ticket DECISIONS require

**Correctness**
- The cutoff arithmetic is correct and uses UTC only (`service.ts:11-28`).
  - Normalising through `firstOfTargetMonth` first means the year rollover and the last-day lookup always refer to the real target month.
  - Keeping hours, minutes, seconds and milliseconds gives exact-instant retention.
  - `lte` (`query.ts:4`) makes the boundary inclusive.
- The Europe/London test case (`service.test.ts:50`) shows that local TZ has no effect.

**Security and performance**
- No PII in logs. The only log line is the count plus the ISO cutoff (`purge-user-archive.ts:7`). The query returns only `count` and never selects any rows.
- One `DELETE ... WHERE archived_date <= $1` statement, backed by `@@index([archivedDate])`. It is atomic and idempotent, and `concurrencyPolicy: Forbid` is inherited. Batching is not needed at this volume.

**Runtime and deployment**
- Correct Prisma lifecycle. `$disconnect()` runs in `finally`, and the script is dynamically imported by the runner after `getPropertiesVolumeSecrets()`, so `DATABASE_URL` is set before the Prisma module evaluates. Errors are not swallowed, so the existing runner exit-1 path applies.
- The Docker crons stage needs no change. `focus` picks up the new workspace deps, and `libs/` (including `account/dist` and `postgres-prisma/generated`) is already copied from `build`. Turbo `^build` now orders account before crons.
- The umbrella-chart guard test is a good idea. It catches anyone accidentally setting `SCRIPT_NAME: purge-user-archive` in a template that runs every 5 minutes.
- The Flux draft documents merge order, and the tag issue is called out explicitly.

## Test Coverage Assessment

- **Unit tests:** Good.
  - `service.test.ts` has 8 cases: exact cutoff and count, 5 clamp/rollover/TZ cases, empty result, and DB rejection. It runs real `service.ts` and `query.ts` with only `deleteMany` mocked.
  - `purge-user-archive.test.ts` has 2 cases: the exact single log line plus disconnect, and reject plus still-disconnect with no success log.
  - `values.yaml.test.ts` has 3 cases.
  - AAA comments are used everywhere except `values.yaml.test.ts` (suggestion 4).
- **E2E tests:** None. This is justified because there is no page or user journey, and Playwright cannot trigger the K8s CronJob in CI. AC8 and AC9 are covered by the planned manual aat verification instead.
- **Accessibility tests:** N/A (no UI).
- **Statement coverage** (v8, measured with `vitest run --coverage` per workspace):

| Workspace | Statements | Branches | Functions | Notes |
|---|---|---|---|---|
| `@hmcts/account` | **100%** (36/36) | 100% | 100% | Includes the new `user-archive/service.ts` and `query.ts` |
| `@hmcts/crons` | **85.18%** (23/27) | 83.33% | 75% | `purge-user-archive.ts` is fully covered. The uncovered lines are `index.ts:33,41-43`, which predate this change. |

Both workspaces are above 80%.

## Acceptance Criteria Verification

- [x] **AC1.** Given a `user_archive` row archived 3 months or more ago, when the job runs, then that row is deleted.
  - `libs/account/src/user-archive/query.ts:4` (`deleteMany` with `archivedDate: { lte: cutoff }`)
  - `libs/account/src/user-archive/service.ts:5-9`
  - Tested: `service.test.ts:30-43`
- [x] **AC2.** Given a `user_archive` row archived less than 3 months ago, when the job runs, then that row is kept.
  - The filter only matches `<= cutoff`, and the cutoff is never later than `now − 3 months` (`service.ts:11-28`).
  - Tested: `service.test.ts:41` (exact `where` with no other predicate)
- [x] **AC3.** Given a row archived at exactly the 3-month boundary, when the job runs, then it is deleted.
  - `lte` at `query.ts:4`, with time of day kept at `service.ts:22-25`
  - Tested: `service.test.ts:41` asserts `lte` at the exact instant `2026-08-18T02:00:00.000Z`
- [x] **AC4.** Given the job runs on a date whose day does not exist 3 months earlier (e.g. 31 May), when the cutoff is computed, then it is clamped to the last day of that month and no row younger than 3 months is deleted.
  - `service.ts:12-21`
  - Tested: `service.test.ts:45-63` (31 May → 28 Feb / 29 Feb in a leap year, 31 Dec → 30 Sep, Jan rollover, Europe/London TZ)
- [x] **AC5.** Given there are no eligible rows (including an empty table), when the job runs, then it completes successfully and deletes nothing.
  - `query.ts:4-5` returns `count: 0`
  - Tested: `service.test.ts:65-75`
- [x] **AC6.** Given the job completes, then it logs the number of rows deleted and the cutoff date, with no emails or user IDs.
  - `apps/crons/src/purge-user-archive.ts:7`
  - Tested: `purge-user-archive.test.ts:36-37` (exactly one call with the exact string)
- [x] **AC7.** Given the database call fails, when the job runs, then the process exits with a non-zero code and the error is logged.
  - `purge-user-archive.ts:5-10` has no catch, so the rejection propagates.
  - `apps/crons/src/index.ts:41-43` logs with `console.error("Cron job failed:", error)` and calls `process.exit(1)`.
  - Tested: `service.test.ts:77-85`, `purge-user-archive.test.ts:41-50`, `index.test.ts:83`
  - Entrypoint lines 41-43 are not covered by tests (suggestion 3).
- [~] **AC8.** Given the job is deployed, then it runs once a day on aat, demo, perftest and prod (CNP, via `cnp-flux-config`, the same environments as `cath-crons`; not stg) using its own `SCRIPT_NAME`. The existing `example` cron is not affected.
  - **Done:**
    - The HelmRelease is drafted in `docs/tickets/918/flux-config.md:15-46` with `0 2 * * *`, `SCRIPT_NAME: purge-user-archive` and its own `releaseNameOverride`.
    - Kustomization diffs for the four envs are at `flux-config.md:52-90`, and I verified them against live cnp-flux-config.
    - The `example` cron is unaffected: the chart default stays `example` and the umbrella templates do not override it (`apps/crons/helm/values.yaml:12`, guarded by `apps/crons/helm/values.yaml.test.ts:18-28`).
  - **Missing:** the cnp-flux-config PR is not raised or merged, and the aat checks are not done (`tasks.md:380-383`).
- [x] **AC9.** Given the 'Deleted accounts' MI report is downloaded after a purge, then purged accounts no longer appear, and accounts archived within the last 3 months still do.
  - The report reads `user_archive` live with no cache (`libs/system-admin-pages/src/mi-report/queries.ts:153-156`).
  - The purge removes exactly the rows at or before the cutoff (`query.ts:4`).
  - All fixed MI periods (≤ 30 days) fall inside the retention window.
  - The planned aat seed-and-download check (`tasks.md:383`) should still be done as runtime confirmation.

**Tally:** 8 met, 1 partial (AC8), 0 unmet.

## Next Steps

- [ ] Address critical issues (none)
- [ ] Fix high priority items: raise the cnp-flux-config PR from `flux-config.md` after the image with the script is promoted (replace `<TAG>`), then do the aat verification in tasks.md
- [ ] Consider suggestions: keep the primary error over a disconnect failure, add the extra clamp/rollover cases, cover the runner exit path, type and AAA-annotate the helm values test
- [ ] Re-run tests after fixes (`yarn test`, `yarn lint:fix`, `yarn build`)

## Overall Assessment

**NEEDS CHANGES** (advisory)

The code in this repo is ready to merge as it stands. It is correct, well tested (100% in `@hmcts/account`, 85% in `@hmcts/crons`), follows the conventions and logs no PII. The rating is NEEDS CHANGES only because AC8 is partial until the separately-tracked `hmcts/cnp-flux-config` PR is merged and checked on aat. No source changes are needed for that.
