# Tasks: #918 Remove deleted accounts (`user_archive`) after 3 months

## Implementation Tasks

### Lib: `@hmcts/account`
- [x] Create `libs/account/src/user-archive/query.ts` with `deleteUserArchivesArchivedOnOrBefore(cutoff)`. It uses `prisma.userArchive.deleteMany({ where: { archivedDate: { lte: cutoff } } })` and returns `count`.
- [x] Create `libs/account/src/user-archive/service.ts`:
  - `RETENTION_MONTHS = 3` at the top.
  - Exported `purgeExpiredUserArchives()` returning `{ deletedCount, cutoff }`.
  - A non-exported `subtractUtcMonthsClamped()`, using `Date.UTC` with the day clamped to the target month's last day and the time of day kept.
  - The `PurgeResult` interface at the bottom.
- [x] Add the `"./user-archive"` export (production → `dist/user-archive/service.js`, default → `src/user-archive/service.ts`) to `libs/account/package.json`.
- [x] Add `"@hmcts/account/user-archive": ["libs/account/src/user-archive/service"]` to root `tsconfig.json` `paths`.

### Cron script: `apps/crons`
- [x] Create `apps/crons/src/purge-user-archive.ts`. It has only a default export, which calls `purgeExpiredUserArchives()`, logs `Purged <n> user_archive row(s) archived on or before <ISO cutoff>`, and calls `prisma.$disconnect()` in `finally`. It must not catch errors.
- [x] Add `"@hmcts/account": "workspace:*"` and `"@hmcts/postgres-prisma": "workspace:*"` to `apps/crons/package.json` dependencies, then run `yarn install`.
- [x] Run `yarn build` and confirm `apps/crons` compiles against `@hmcts/account`. Only if `tsc` fails, add `composite: true` to `libs/account/tsconfig.json` and a reference in `apps/crons/tsconfig.json`.
- [x] Do not change `apps/crons/helm/values.yaml` (`SCRIPT_NAME: 'example'`), `helm/cath-service/values.template.yaml` or `values.preview.template.yaml`.

### Unit tests
- [x] `libs/account/src/user-archive/service.test.ts`, test 1: `deleteMany` is called with `lte` at the exact 3-month cutoff (2026-11-18T02:00Z → 2026-08-18T02:00Z) and the count and cutoff are returned (AC1–3).
- [x] `service.test.ts`, test 2 (`it.each`): clamping and rollover cases (31 May 2027 → 28 Feb, 31 May 2028 → 29 Feb, 31 Dec → 30 Sep, 15 Jan → 15 Oct of the previous year), plus a `TZ=Europe/London` case (2027-05-31T23:30Z → 2027-02-28T23:30Z) (AC4). Restore `TZ` and the timers in `afterEach`.
- [x] `service.test.ts`, test 3: returns `deletedCount: 0` when `deleteMany` returns count 0 (AC5).
- [x] `service.test.ts`, test 4: rejects with the database error when `deleteMany` rejects (AC7).
- [x] `apps/crons/src/purge-user-archive.test.ts`, test 5: logs exactly one line containing only the count and ISO cutoff, then calls `$disconnect` (AC6).
- [x] `purge-user-archive.test.ts`, test 6: rejects when the purge fails, still calls `$disconnect`, and does not log success (AC7).
- [x] `apps/crons/helm/values.yaml.test.ts`, test 7: the chart default `SCRIPT_NAME` is `example`, and neither umbrella values template overrides `cath-crons.job.environment.SCRIPT_NAME` (AC8).
- [x] Run `yarn test`, `yarn lint:fix` and `yarn build` from the repo root, and make sure all pass.

### Deployment (separate PR to `hmcts/cnp-flux-config`, after a `cath-crons` image containing the script is promoted)
- [x] Add `apps/cath/cath-crons/cath-crons-purge-user-archive.yaml`. It is a HelmRelease and its `releaseName` are both `cath-crons-purge-user-archive`, with `job.releaseNameOverride: cath-crons-purge-user-archive`, the image carrying the marker `{"$imagepolicy": "flux-system:cath-crons"}`, `schedule: "0 2 * * *"` and `job.environment.SCRIPT_NAME: purge-user-archive`. (drafted in flux-config.md; PR to cnp-flux-config pending)
- [x] Reference it from `apps/cath/{aat,demo,perftest,prod}/base/kustomization.yaml`, next to `cath-crons.yaml` (confirmed). Do not add it to stg or preview. Leave `cath-crons.yaml` unchanged. (drafted in flux-config.md; PR to cnp-flux-config pending)

### Verification on aat (AC8, AC9)

Not done: requires the Flux PR to be merged and kubectl access to the aat cluster; cannot be run locally.

- [ ] Confirm `kubectl -n cath get cronjob cath-crons-purge-user-archive` shows `0 2 * * *`, and that `cath-crons` still shows `*/5 * * * *`.
- [ ] Seed one `user_archive` row archived more than 3 months ago and one archived less than 3 months ago. Run `kubectl create job --from=cronjob/cath-crons-purge-user-archive`. Check the log line shows only the count and cutoff. Download the MI 'Deleted accounts' report and confirm only the newer row appears.
