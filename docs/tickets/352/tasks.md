# Tasks — #352: CaTH Cron Trigger - Manage Expired Artefacts and Audit Logs

## Implementation Tasks

### 0. Sequencing
- [x] Branch from `feature/1272-cron-subscription-triggers` (PR #1306), or from master if #1306 has merged; plan to merge after #1306
- [x] Confirm `apps/crons` has `@hmcts/postgres-prisma`, `@hmcts/publication`, storage-account secrets, `activeDeadlineSeconds` and `close-connections.ts` from #1306 (do not re-add)

### 1. Schema and migration
- [x] Create `libs/postgres-prisma/prisma/schema/artefact-archive.prisma` (`ArtefactArchive` → `artefact_archive`, PK `artefact_id`, `list_type_name`, no FKs, `@@index([archivedDate])`)
- [x] Run `yarn db:migrate:dev --name add_artefact_archive`; review `apps/postgres/prisma/migrations/<ts>_add_artefact_archive/migration.sql` contains only the new table + index — local DB had drift from another branch (`migrate dev` wanted a reset), so SQL was generated with `prisma migrate diff --from-schema <schema without new file> --to-schema` into `20261119143551_add_artefact_archive`
- [x] Run `yarn db:generate`

### 2. Blob deletion helper (`libs/publication/src/repository/queries.ts`)
- [x] Add exported `deleteArtefactBlobs(artefactId, sourceArtefactId)` that awaits all 4 deletes (artefact, legacy `<id><ext>`, `publications/<id>.pdf`, `.xlsx`) via `Promise.allSettled` and throws listing every failed blob
- [x] Refactor `deleteArtefacts` to `void deleteArtefactBlobs(...).catch(log)`; keep it non-blocking and keep its DB delete unchanged
- [x] Do not export `deleteArtefactBlobs` from `src/index.ts`
- [x] Tests: 4 targets with correct containers; `.pdf` fallback when `sourceArtefactId` is null or has no extension; resolves when all deletes succeed; rejects listing every failed blob after trying all four
- [x] Adjust existing `deleteArtefacts` tests: DB rows deleted, blob failure logged and not thrown

### 3. Archive queries (`libs/publication/src/artefact-archive/queries.ts`)
- [x] `findExpiredArtefacts(now, afterArtefactId, take)`: `displayTo: { lt: now }`, optional `artefactId: { gt }`, `orderBy artefactId asc`, select archived columns + `listType.name`
- [x] `archiveAndDeleteArtefact(artefact)`: `prisma.$transaction([artefactArchive.create, artefact.delete])`, mapping `listType.name` → `listTypeName` (no `listTypeId`)
- [x] `deleteArtefactArchiveOnOrBefore(cutoff)`: `deleteMany` with `archivedDate: { lte: cutoff }`, returns count
- [x] Tests (`queries.test.ts`): exact `where`/order/take/select; cursor clause added only when given; transaction contents and mapping; purge `where` + returned count

### 4. Archive service (`libs/publication/src/artefact-archive/service.ts`)
- [x] Constants `EXPIRED_ARTEFACT_BATCH_SIZE = 100`, `ARTEFACT_ARCHIVE_RETENTION_MONTHS = 3`
- [x] `archiveExpiredArtefacts(now = new Date())`: keyset loop; per artefact transaction then blobs; per-stage failure capture; returns `{ searchDate, archived, failed[] }`
- [x] `purgeArtefactArchive(now = new Date())`: cutoff from the private `subtractMonthsUtc` (UTC, clamped); returns `{ cutoff, deleted }`
- [x] Export both from `libs/publication/src/index.ts`
- [x] Tests: multi-page processing and cursor advance; empty result; injected `now` used as `searchDate`; transaction failure → `stage: "database"`, blobs not touched, loop continues; blob failure → `stage: "blob"`, still counted archived, loop continues; blobs deleted only after the transaction resolves
- [x] Tests: purge cutoff 15 Aug → 15 May, 31 May → 28 Feb (non-leap) / 29 Feb (leap), 31 Mar → 31 Dec previous year, time of day kept; returns deleted count
- [x] Review check: `grep -r legacy-third-party-fulfilment libs/publication/src/artefact-archive apps/crons/src/expired-artefacts.ts` returns nothing (AC7)

### 5. Audit log retention (`libs/system-admin-pages`)
- [x] Add `AUDIT_LOG_RETENTION_DAYS = 90` and `deleteExpiredAuditLogs(now = new Date())` (`timestamp: { lt: now − 90d }`, returns `{ cutoff, deleted }`) to `src/audit-log/repository.ts`
- [x] Add `"./audit-log/repository"` subpath export to `libs/system-admin-pages/package.json` (production/default)
- [x] Add `"@hmcts/system-admin-pages/audit-log/repository"` path to root `tsconfig.json`
- [x] Test in `repository.test.ts`: `deleteMany` `where` and cutoff for a fixed `now`; returns count

### 6. Cron scripts (`apps/crons`)
- [x] Add `"@hmcts/system-admin-pages": "workspace:*"` to `apps/crons/package.json`; run `yarn install`
- [x] Add `tsconfig.json` project references for `libs/publication` / `libs/system-admin-pages` if `yarn build` needs them (follow #1306) — not needed: `yarn workspace @hmcts/crons build` succeeds with only the existing `libs/postgres-prisma` reference (same as #1306)
- [x] Create `src/clear-audit.ts` (default export; logs count + cutoff; `closeConnections` in `finally`)
- [x] Create `src/expired-artefacts.ts` (default export; archive → log count + search date + each failure → purge → log count + cutoff → throw if any failures; `closeConnections` in `finally`)
- [x] Tests `clear-audit.test.ts`: logs count/cutoff and closes connections; propagates failure and still closes connections
- [x] Tests `expired-artefacts.test.ts`: success logs both lines and resolves; failures logged, purge still runs, throws, connections closed; purge failure propagates and connections closed
- [x] Leave `apps/crons/helm/values.yaml` `SCRIPT_NAME: 'example'` unchanged (preview/stg umbrella chart runs every 5 min)

### 7. Quality gates
- [x] `yarn lint:fix` and `yarn format` clean
- [x] `yarn test` passes; coverage > 80% on the new `artefact-archive` and audit retention code
- [x] `yarn workspace @hmcts/crons build` succeeds and `dist/clear-audit.js` / `dist/expired-artefacts.js` exist

### 8. Local verification
- [x] `yarn dev:up`; seed artefacts with past, future and null `display_to` plus their blobs; add `artefact_archive` rows older and newer than 3 months; add `audit_log` rows older and newer than 90 days — `yarn dev:up` not used (its `db:migrate:dev` would reset the drifted local DB); applied the migration with `prisma migrate deploy` and seeded fixtures via psql + Azurite
- [x] Run `SCRIPT_NAME=expired-artefacts yarn workspace @hmcts/crons dev`: past artefacts archived (`list_type_name` populated) and their blobs gone; future/null artefacts untouched; old archive rows purged; log lines correct; exit 0
- [x] Run `SCRIPT_NAME=clear-audit yarn workspace @hmcts/crons dev`: only rows older than 90 days deleted; count logged; exit 0
- [x] Force a failure (e.g. invalid storage connection string) and confirm the run continues, logs the failure and exits non-zero

### 9. Deployment (cnp-flux-config, separate repo/PR)
- [ ] Get the stg count of `artefact WHERE display_to < now()` to size the first run (Clarification 1)
- [ ] After the image is published, add HelmReleases `clear-audit-cron` (`SCRIPT_NAME=clear-audit`, `0 1 * * *`) and `expired-artefacts-cron` (`SCRIPT_NAME=expired-artefacts`, `0 1 * * *`) in `apps/cath`
- [ ] Trigger each once on stg with `kubectl create job --from=cronjob/<name>`; confirm logs in App Insights and the Job reaches `Complete`
- [ ] Confirm the scheduled 01:00 runs the next day
