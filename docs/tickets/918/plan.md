# Technical Plan: #918 Remove deleted accounts (`user_archive`) after 3 months

## 1. Technical Approach

### Strategy

This is a headless retention job with no UI. It has three parts:

1. **Business logic in `@hmcts/account`**: a function that works out a UTC, month-end-clamped cutoff of `now - 3 calendar months`. It hard-deletes every `user_archive` row with `archived_date <= cutoff` and returns `{ deletedCount, cutoff }`.
2. **Cron script in `apps/crons`**: `purge-user-archive.ts`. Its default export calls the lib function, logs the count and cutoff, and disconnects Prisma. The existing runner (`apps/crons/src/index.ts`) already loads secrets, dynamically imports `./${SCRIPT_NAME}.js`, flushes telemetry and exits with code 1 on failure. The runner does not change.
3. **Deployment**: a new, separate HelmRelease in `hmcts/cnp-flux-config` (a separate PR, not made by this ticket) runs the same `cath-crons` image and chart with `SCRIPT_NAME=purge-user-archive` and schedule `0 2 * * *`. The repo-side umbrella chart keeps running only `example`.

### Architecture decisions

**Which lib owns the logic: `@hmcts/account` (existing). No new lib.**

- `@hmcts/account` is the user-account data lib. It already holds `repository/query.ts` and `repository/service.ts` for the `user` table. Its only dependency is `@hmcts/postgres-prisma`. #351 will write `user_archive` rows when accounts are deleted, so the archive lifecycle (write in #351, purge here) belongs in one place.
- `@hmcts/system-admin-pages` already reads `user_archive` for the MI report, but it is the wrong home. It is a page/UI lib with Express, LaunchDarkly, notifications, publication and similar dependencies. If `apps/crons` depended on it, all of that would be pulled into the crons image through `yarn workspaces focus @hmcts/crons --production`. That would also put retention policy inside an admin-pages package.
- A new `@hmcts/user-archive` lib is not justified for one function plus one query (YAGNI). If #356 later adds several purge jobs, that would be the time to reconsider.

**Package surface.** `@hmcts/account` has no `index.ts`. It exposes subpaths (`.` → `roles.ts`, `./repository/query`, `./repository/service`). Add one more subpath, `./user-archive`, pointing at `src/user-archive/service.ts`. Add the matching entry to root `tsconfig.json` `paths`. The query module is internal and is not exported.

**Cutoff arithmetic.** All of it is done with UTC accessors and `Date.UTC`:

- Target month = `getUTCMonth() - 3`. `Date.UTC` rolls negative months into the previous year.
- Day = `min(getUTCDate(), lastDayOf(targetYear, targetMonth))`, where `lastDayOf` is `new Date(Date.UTC(y, m + 1, 0)).getUTCDate()`.
- Hours, minutes, seconds and milliseconds are kept from `now`. Retention is therefore exact to the instant, and a row archived at exactly `now - 3 months` matches `lte`.
- The local `TZ` has no effect. `RETENTION_MONTHS = 3` is a module-level constant and is not configurable (ticket DECISIONS).

**Prisma lifecycle.** The script imports `prisma` from `@hmcts/postgres-prisma` and calls `$disconnect()` in a `finally` block. Without this, the `pg` pool keeps the event loop alive until its idle timeout. The script is loaded by the runner's dynamic import *after* `getPropertiesVolumeSecrets()` has run. A static import of `@hmcts/postgres-prisma` inside the script is therefore safe: `DATABASE_URL` is already set when the Prisma module first evaluates.

**`DATABASE_URL` resolution.** This is unchanged and needs no work:

- **CNP (Flux):** `NODE_ENV=production`, so `getPropertiesVolumeSecrets` reads the `/mnt/secrets` mount. The `omit: ["DATABASE_URL"]` option only applies to the Azure-vault path used locally. `postgres-url` → `DATABASE_URL` is already declared in `apps/crons/helm/values.yaml`.
- **Preview:** `POSTGRES_HOST`, `POSTGRES_USER` and the other variables are injected from secrets, and `@hmcts/postgres-prisma` builds the URL from them.
- **Local:** the `.env` or default URL is used.

**Repo-side umbrella chart (`helm/cath-service`).** It deploys exactly one `cath-crons` subchart instance. `SCRIPT_NAME` comes from `apps/crons/helm/values.yaml` (`example`), and neither `values.template.yaml` nor `values.preview.template.yaml` overrides it. Preview and aat/demo/perftest/ithc pipeline deploys therefore keep running `example` every 5 minutes and never run the purge. The ticket's requirement ("preview/stg values do not run this job every 5 minutes") is met by **not** changing those files and **not** changing the chart default `SCRIPT_NAME`. A small YAML test locks this in. I chose not to add an aliased second crons subchart to the umbrella chart: preview databases are short-lived, and a daily purge there adds nothing (YAGNI).

**CNP Flux release (separate PR to `hmcts/cnp-flux-config`).** This is described in section 2.4.

### Key considerations

- The job is idempotent. A rerun, a retry after a Kubernetes job backoff, or a manual trigger only deletes rows that are already past the cutoff. `concurrencyPolicy: Forbid` is already set in the chart.
- The job is safe against an empty table. #351 has not merged, so on every environment the job will delete 0 rows until then.
- A single `deleteMany` is enough. `user_archive` holds one row per deleted account, which is a low volume, and `archived_date` is indexed. Batching is not needed.
- No PII in logs. The service returns only a count and a `Date`. The script logs exactly those two values. Prisma logging in production is `["error"]`. Any Prisma error raised by this query only carries the cutoff timestamp parameter, never row data.

## 2. Implementation Details

TEMPLATE SOURCE: n/a

- **API endpoints:** none.
- **Database schema changes:** none. I confirmed that `UserArchive` (`libs/postgres-prisma/prisma/schema/user-archive.prisma`) maps to `user_archive`, and that `archivedDate` maps to `archived_date`, is `DateTime @default(now())` and has `@@index([archivedDate])`. No migration is needed.
- **UI / templates / Welsh content:** none.

### 2.1 File structure

```
libs/account/
├── package.json                         # add "./user-archive" export
└── src/
    └── user-archive/
        ├── query.ts                     # deleteUserArchivesArchivedOnOrBefore(cutoff) – internal
        ├── service.ts                   # RETENTION_MONTHS, purgeExpiredUserArchives()
        └── service.test.ts              # covers service + query via mocked prisma

apps/crons/
├── package.json                         # add @hmcts/account, @hmcts/postgres-prisma deps
├── helm/values.yaml.test.ts             # guards SCRIPT_NAME default / umbrella overrides
└── src/
    ├── purge-user-archive.ts            # default export: run purge, log, disconnect
    └── purge-user-archive.test.ts

tsconfig.json                            # add "@hmcts/account/user-archive" path
```

The file names follow the existing `@hmcts/account` convention (`repository/query.ts`, `repository/service.ts`). There is no `types.ts` and no `utils.ts`.

### 2.2 `libs/account/src/user-archive/`

`query.ts`:

```typescript
import { prisma } from "@hmcts/postgres-prisma";

export async function deleteUserArchivesArchivedOnOrBefore(cutoff: Date): Promise<number> {
  const { count } = await prisma.userArchive.deleteMany({ where: { archivedDate: { lte: cutoff } } });
  return count;
}
```

`service.ts`, following the module-ordering rule (constants, then exported functions, then helpers in the order they are used, then types):

```typescript
const RETENTION_MONTHS = 3;

export async function purgeExpiredUserArchives(): Promise<PurgeResult> {
  const cutoff = subtractUtcMonthsClamped(new Date(), RETENTION_MONTHS);
  const deletedCount = await deleteUserArchivesArchivedOnOrBefore(cutoff);
  return { deletedCount, cutoff };
}

function subtractUtcMonthsClamped(date: Date, months: number): Date { /* Date.UTC arithmetic per §1 */ }

interface PurgeResult { deletedCount: number; cutoff: Date; }
```

- `subtractUtcMonthsClamped` is not exported. Tests exercise it through `purgeExpiredUserArchives` using `vi.setSystemTime`.
- `PurgeResult` is exported as a type only if the cron script needs to annotate with it. Otherwise it stays internal.
- Only `user_archive` is touched. The `user` table, subscriptions and audit logs are not referenced.

`libs/account/package.json` exports entry:

```json
"./user-archive": {
  "production": "./dist/user-archive/service.js",
  "default": "./src/user-archive/service.ts"
}
```

Root `tsconfig.json` paths entry: `"@hmcts/account/user-archive": ["libs/account/src/user-archive/service"]`.

### 2.3 `apps/crons/src/purge-user-archive.ts`

```typescript
import { purgeExpiredUserArchives } from "@hmcts/account/user-archive";
import { prisma } from "@hmcts/postgres-prisma";

export default async function purgeUserArchive(): Promise<void> {
  try {
    const { deletedCount, cutoff } = await purgeExpiredUserArchives();
    console.log(`Purged ${deletedCount} user_archive row(s) archived on or before ${cutoff.toISOString()}`);
  } finally {
    await prisma.$disconnect();
  }
}
```

- The script has only a default export, because that is what the runner invokes. There is no extra named export added just for tests.
- The script does not catch errors. A rejection propagates to `index.ts` `main()`, which logs `Cron job failed:` and calls `process.exit(1)`. That is existing behaviour, and it is already covered by `index.test.ts`.
- `apps/crons/package.json` `dependencies` gets `"@hmcts/account": "workspace:*"` and `"@hmcts/postgres-prisma": "workspace:*"`. `apps/crons/tsconfig.json` already references `libs/postgres-prisma`. `@hmcts/account` is not `composite`. Follow the pattern `apps/web` uses for its other non-composite libs (no project reference) and confirm with `yarn build`. Only if `tsc` fails should you add `composite: true` to `libs/account/tsconfig.json` and add a reference.
- The Dockerfile `crons` stage needs no change. `yarn workspaces focus @hmcts/crons --production` picks up the new workspace dependencies, and all of `libs/` (including `account/dist` and `postgres-prisma/generated`) is already copied from `build`.

### 2.4 Deployment

**cath-service repo:**

- `apps/crons/helm/values.yaml`: no change. `SCRIPT_NAME: 'example'` stays the chart default. The placeholder schedule stays.
- `helm/cath-service/values.template.yaml` and `values.preview.template.yaml`: no change. Neither sets `cath-crons.job.environment.SCRIPT_NAME`, so the umbrella's 5-minute job remains `example`.
- The new test `apps/crons/helm/values.yaml.test.ts` asserts both points.

**`hmcts/cnp-flux-config` (separate PR, not created as part of this ticket):**

New file `apps/cath/cath-crons/cath-crons-purge-user-archive.yaml`, modelled on `cath-crons.yaml`:

```yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: cath-crons-purge-user-archive
spec:
  releaseName: cath-crons-purge-user-archive
  interval: 5m
  install:
    remediation:
      retries: 3
  upgrade:
    remediation:
      strategy: uninstall
      retries: 3
  values:
    job:
      releaseNameOverride: cath-crons-purge-user-archive
      image: hmctsprod.azurecr.io/cath/cath-crons:<current prod tag> # {"$imagepolicy": "flux-system:cath-crons"}
      schedule: "0 2 * * *"
      environment:
        SCRIPT_NAME: purge-user-archive
  chart:
    spec:
      chart: cath-crons
      version: ">=0.1.0-0"
      sourceRef:
        kind: HelmRepository
        name: hmctsprod-oci
        namespace: flux-system
      interval: 1m
```

- It reuses the existing `cath-crons` ImageRepository and ImagePolicy, so no new image objects are needed. Image automation bumps both HelmReleases together.
- `job.environment` is a map. Helm merges it with the chart defaults (`NODE_ENV`, `POSTGRES_DATABASE`), so only `SCRIPT_NAME` is overridden. `keyVaults`, `aadIdentityName` and `concurrencyPolicy: Forbid` are inherited from the chart.
- The name is 29 characters, within the 52-character CronJob name limit.
- Add `- ../../cath-crons/cath-crons-purge-user-archive.yaml` to the same `apps/cath/<env>/base/kustomization.yaml` files that list `cath-crons.yaml` today: **aat, demo, perftest, prod** (confirmed). Not stg, and not `preview/base`, which does not include `cath-crons` either.
- `cath-crons.yaml` (example, `*/5`) is not modified (AC8).
- **Merge order:** merge the Flux PR only after a `cath-crons` image containing `dist/purge-user-archive.js` has been promoted, so that the image policy tag includes it. Otherwise the job fails daily with "Cannot find module" until that image lands.
- Kubernetes CronJob schedules are evaluated in the controller-manager's timezone, which is UTC on AKS. `0 2 * * *` is therefore 02:00 UTC as required. No `timeZone` field is needed.

## 3. Error Handling & Edge Cases

| Case | Behaviour |
|---|---|
| Empty table / no eligible rows | `deleteMany` returns `{ count: 0 }`. The job logs `Purged 0 ...` and exits 0. |
| Row archived exactly at the cutoff instant | Deleted (`lte`). |
| Row archived 1 ms after the cutoff | Kept. |
| Run on the 29th, 30th or 31st when the target month is shorter | Day is clamped to the target month's last day (31 May → 28 Feb, or 29 Feb in a leap year; 31 Jul → 30 Apr; 31 Dec → 30 Sep). The cutoff is never later than `now - 3 months`, so nothing younger than 3 months is deleted. |
| January to March runs | The year rolls back (15 Jan 2027 → 15 Oct 2026). |
| Process `TZ` is not UTC, or the run is near a BST change or midnight | Only UTC accessors are used, so the result is unaffected. A test covers this with `TZ=Europe/London`. |
| DB unreachable, or `deleteMany` rejects | The error propagates. The script still disconnects in `finally`. `index.ts` logs `Cron job failed:` and exits 1, and the Kubernetes job is marked failed. Telemetry is flushed (existing). |
| `$disconnect()` rejects after a successful delete | The rejection propagates and the job exits 1. This is acceptable: the delete is committed and idempotent, and the next run is a no-op for those rows. |
| Image without the script, or `SCRIPT_NAME` typo | The dynamic import fails, the runner exits 1 (existing). Avoided by the merge order in 2.4. |
| Concurrent or manual runs | `concurrencyPolicy: Forbid`. The delete is idempotent anyway. |
| PII | Only `deletedCount` and `cutoff.toISOString()` are logged. No rows are selected or returned. |

## 4. Acceptance Criteria Mapping

| AC | How satisfied | Verified by |
|---|---|---|
| 1. Row archived ≥ 3 months ago is deleted | `deleteMany` with `archivedDate lte cutoff` | Unit test: `deleteMany` called with the exact `{ where: { archivedDate: { lte: <expected cutoff> } } }`. Manual check on aat with a seeded row. |
| 2. Row archived < 3 months ago is kept | The filter only matches `<= cutoff`, and the cutoff is exactly `now - 3 months` | Same unit test (exact cutoff value). Manual check on aat. |
| 3. Exact boundary is deleted | `lte`, with time-of-day kept from `now` | Unit test asserts `lte` (not `lt`) and the exact instant. |
| 4. Month-end clamp | `subtractUtcMonthsClamped` | `it.each` unit test: 31 May 2027 → 28 Feb 2027, 31 May 2028 → 29 Feb 2028, 31 Dec → 30 Sep, 15 Jan → 15 Oct of the previous year, plus the TZ case. |
| 5. No eligible rows / empty table | Count 0, normal completion | Service unit test (count 0). Script unit test logs `Purged 0`. |
| 6. Logs count and cutoff, no PII | The script logs one line built only from the count and ISO cutoff | Script unit test asserts the exact single `console.log` string. |
| 7. DB failure → non-zero exit and error logged | The error propagates to `index.ts`, which calls `console.error` and `process.exit(1)` | Service test (rejects with the DB error). Script test (rejects and still disconnects). Existing `index.test.ts` covers "should throw error when script execution fails". |
| 8. Runs daily on aat, demo, perftest and prod via Flux with its own `SCRIPT_NAME`, and `example` is unaffected | New HelmRelease `cath-crons-purge-user-archive` (`0 2 * * *`, `SCRIPT_NAME=purge-user-archive`). `cath-crons.yaml` and the umbrella values are unchanged. | Helm values test (chart default is still `example`, and the umbrella templates don't override `SCRIPT_NAME`). After the Flux merge, `kubectl -n cath get cronjob cath-crons-purge-user-archive` on aat shows the schedule, and a manual `kubectl create job --from=cronjob/...` shows the log line. |
| 9. MI 'Deleted accounts' report reflects the purge | No code change: `buildDeletedAccountsSheet` queries `user_archive` live, with no cache, so deleted rows disappear and rows inside 3 months remain. All MI periods (7/14/21/30 days) fall inside the retention window. "All" now means "last 3 months". | Manual check on aat: seed one row older than 3 months and one row newer, trigger the job, download the MI report and confirm only the newer row appears. |

## 5. Test Scenarios

Unit tests only, following `.claude/rules/testing.md`: Vitest, AAA comments, `vi.mock("@hmcts/postgres-prisma")`, `vi.clearAllMocks()` in `beforeEach`. Fake timers are restored in `afterEach`.

**`libs/account/src/user-archive/service.test.ts`.** This mocks `prisma.userArchive.deleteMany` only, so it exercises the real `service.ts` and `query.ts`.

1. **Deletes rows on or before the exact 3-month cutoff and returns the count.** System time is `2026-11-18T02:00:00.000Z` and `deleteMany` resolves `{ count: 4 }`. Expect `deleteMany` to be called once with `{ where: { archivedDate: { lte: new Date("2026-08-18T02:00:00.000Z") } } }`, and the result to equal `{ deletedCount: 4, cutoff }`. (AC1, AC2, AC3)
2. **Clamps and rolls over the cutoff in UTC** (`it.each`):
   - `2027-05-31T02:00Z` → `2027-02-28T02:00Z`
   - `2028-05-31T02:00Z` → `2028-02-29T02:00Z`
   - `2026-12-31T02:00Z` → `2026-09-30T02:00Z`
   - `2027-01-15T02:00Z` → `2026-10-15T02:00Z`
   - `2027-05-31T23:30Z` with `process.env.TZ = "Europe/London"` (already 1 June locally) → `2027-02-28T23:30Z`

   Each case asserts the `lte` argument. (AC4)
3. **Returns zero when no rows are eligible.** `deleteMany` resolves `{ count: 0 }`, and the result has `deletedCount: 0`. (AC5)
4. **Propagates a database error.** `deleteMany` rejects with `new Error("connection refused")`, and `purgeExpiredUserArchives()` rejects with the same error. (AC7, error path)

**`apps/crons/src/purge-user-archive.test.ts`.** This mocks `@hmcts/account/user-archive` and `@hmcts/postgres-prisma` (`$disconnect`) and spies on `console.log`.

5. **Logs only the count and cutoff, then disconnects.** The purge resolves `{ deletedCount: 2, cutoff: new Date("2026-08-18T02:00:00.000Z") }`. Expect `console.log` to be called exactly once with `"Purged 2 user_archive row(s) archived on or before 2026-08-18T02:00:00.000Z"`, and `$disconnect` to be called once. (AC6)
6. **Rejects and still disconnects when the purge fails.** The purge rejects. The default export rejects with the same error, `$disconnect` is called, and `console.log` is not called. (AC7, error path the ACs don't name: connection cleanup)

**`apps/crons/helm/values.yaml.test.ts`.** This uses the root `yaml` package, following the pattern in `apps/web/helm/values.yaml.test.ts`.

7. **The umbrella chart never runs the purge script.** `apps/crons/helm/values.yaml` `job.environment.SCRIPT_NAME` equals `"example"`, and neither `helm/cath-service/values.template.yaml` nor `values.preview.template.yaml` defines `cath-crons.job.environment.SCRIPT_NAME`. (AC8 / scope item 3b)

**Existing tests that already cover parts of this:** `apps/crons/src/index.test.ts` ("should throw error when script execution fails", "should flush telemetry when the script fails") covers the non-zero-exit path. No change is needed there.

**E2E is not warranted.** There is no page or user journey. The job runs on a Kubernetes schedule, and Playwright cannot trigger it on demand in CI. The only E2E-shaped check would be AC9, which means seeding `user_archive`, running the script and downloading the MI report. That would mostly re-test an unchanged query (`buildDeletedAccountsSheet`) and would need a new script-invocation harness just for this ticket. The deletion semantics are fully pinned by tests 1 to 4 (exact Prisma `where`). AC8 and AC9 are covered by the manual aat verification task.

## CLARIFICATIONS NEEDED

None. Resolved: the Flux release targets the same environments as `cath-crons` (aat, demo, perftest, prod) and not stg.
