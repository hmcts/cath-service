# Technical Plan — #352: CaTH Cron Trigger - Manage Expired Artefacts and Audit Logs

## 0. Sequencing with #1306 — read first

PR #1306 (`feature/1272-cron-subscription-triggers`, OPEN) already changes `apps/crons` in the ways this ticket needs:

| #1306 adds | Used by this ticket |
|---|---|
| `@hmcts/postgres-prisma`, `@hmcts/publication`, `@hmcts/redis` deps in `apps/crons/package.json` | Yes: Prisma for both jobs, `@hmcts/publication` for archiving |
| `storageaccount-connection-string` / `storageaccount-name` Key Vault secrets → `AZURE_STORAGE_CONNECTION_STRING` / `AZURE_STORAGE_ACCOUNT_NAME` | Yes: blob deletion |
| `activeDeadlineSeconds: 3600` | Yes: limits a hung run |
| `apps/crons/src/close-connections.ts` (`prisma.$disconnect()` + `closeRedisClient()`, failures logged, not thrown) | Yes: both scripts call it in `finally`. `closeRedisClient()` does nothing if Redis was never opened, so it is safe to call here. |
| Thin-wrapper script pattern (`display-from-subscriptions.ts` + test) | Both new scripts follow it |

**Decision: branch from `feature/1272-cron-subscription-triggers` (or rebase on master once #1306 merges) and merge after #1306.** This ticket adds no helm values and no further `apps/crons/package.json` deps except `@hmcts/system-admin-pages` (§2.5), so the only overlap is one line in `package.json`. If #1306 stalls, cherry-pick only its `package.json` deps, the two storage secrets and `close-connections.ts`. Do not re-implement them with different names.

`apps/crons/helm/values.yaml` keeps `SCRIPT_NAME: 'example'` as the default. The umbrella chart (`helm/cath-service/values.template.yaml:66`, `values.preview.template.yaml:153`) runs the crons release every 5 minutes in stg/preview using that default. If the default were changed to `expired-artefacts`, every preview environment would archive (and delete blobs for) its own artefacts every 5 minutes, including E2E fixtures. The real jobs are selected only by the flux HelmReleases (§2.7).

---

## 1. Technical Approach

Two scripts run through the existing crons entrypoint (`SCRIPT_NAME` → `import("./${SCRIPT_NAME}.js")` → `default()`):

- `clear-audit`: calls `deleteExpiredAuditLogs()` in `@hmcts/system-admin-pages`, which runs one `deleteMany` on `audit_log.timestamp < now − 90 days`.
- `expired-artefacts`: calls `archiveExpiredArtefacts()`, then `purgeArtefactArchive()`, both in `@hmcts/publication`.

Each script is a thin wrapper: it logs the summary, calls `closeConnections()` in `finally`, and throws if there were failures. `index.ts` already turns a thrown error into `process.exit(1)` after flushing App Insights.

### Architecture decisions

**Archive logic lives in `@hmcts/publication`.** That lib already owns the `artefact` table, the blob deletion helpers, and the legacy blob-name rule. #1306 already makes it a crons dependency. A new lib would have to duplicate the blob-name logic.

**Awaited blob deletion via a shared helper, admin flow unchanged.** Pull the "which blobs belong to an artefact" logic out of `deleteArtefacts` into one exported helper in `libs/publication/src/repository/queries.ts`:

- `deleteArtefactBlobs(artefactId, sourceArtefactId)` deletes four blobs with `Promise.allSettled`:
  - `artefact/<id>`
  - `artefact/<id><ext>` (legacy name)
  - `publications/<id>.pdf`
  - `publications/<id>.xlsx`
- It awaits all of them, then throws one error that lists every blob that failed.

`deleteArtefacts` (admin remove-list, delete-court) keeps its current fire-and-forget behaviour: `void deleteArtefactBlobs(...).catch(log)`. Its signature, its ordering and its non-blocking UI response all stay the same. The only visible change is that a non-404 failure on the legacy blob name is now logged instead of silently swallowed. A 404 is already silent inside `deleteBlob`. `deleteDerivedFiles` stays as it is, because `createArtefact` deliberately swallows its errors.

**The blob store treats 404 as success already.** `libs/azure-blob/src/blob-client.ts:94` returns normally on `statusCode === 404`. No new handling is needed. A re-run, or an artefact that never had a PDF or Excel file, does not count as a failure.

**Per-artefact order: DB transaction first, then blobs** (as the ticket says). The archive-row `create` and the artefact `delete` run together in `prisma.$transaction([...])`. The array form is enough because the two writes do not depend on each other, and it is simpler to mock. Blob deletion runs only after the commit. If blob deletion fails, we are left with an orphaned blob, not a DB row pointing at missing data.

**Expiry semantics match `isWithinDisplayWindow`.** A publication is visible while `now <= displayTo`, so it is expired when `displayTo < now`. The query is `where: { displayTo: { lt: now } }`. In SQL, `NULL < x` is never true, so null `display_to` rows are excluded by the database itself (AC5). The unit test also asserts the exact `where` clause, so nobody can loosen it later.

**List type is stored by name.** The query selects `listType: { select: { name: true } }` and writes `list_type_name`. `list_type_id` differs between environments and would be meaningless once the `list_type` row changes (CLAUDE.md, List Type Implementation).

**Archive retention uses calendar months, clamped, with `lte`** (ticket Decisions, same as #918). `cutoff = subtractMonthsUtc(now, 3)`, then `deleteMany({ where: { archivedDate: { lte: cutoff } } })`. For example, 31 May → 28/29 Feb, not 3 Mar. #918 is unimplemented (plan only), so this ticket owns the helper. It stays a private function in `libs/publication/src/artefact-archive/service.ts` (YAGNI). If #918 lands later and needs it, extract it into a shared date module at that point.

**Audit retention is 90 days as a fixed duration:** `now − 90 × 24h`, compared with `lt` ("older than 90 days", AC1). It is a named constant `AUDIT_LOG_RETENTION_DAYS = 90`. The retention periods (90 days, 3 months) are constants, not env vars. The ticket fixes them as policy, and an env var adds a path where a bad value over-deletes.

**No third-party deletion push** (AC7, Decisions). `sendThirdPartyDeletion` (`@hmcts/legacy-third-party-fulfilment`) is called only from the admin page controller `apps/web/src/pages/(admin)/remove-list-confirmation/index.ts:131`, not from `deleteArtefacts`. `@hmcts/publication` already depends on `@hmcts/legacy-third-party-fulfilment` for other flows, so the dependency itself cannot be removed. The rule is that `libs/publication/src/artefact-archive/` and the new crons scripts must not import it. That is checked in review: `grep` for the package in `libs/publication/src/artefact-archive` and `apps/crons/src/expired-artefacts.ts` returns nothing. Mocking a module the code never imports would prove nothing, so there is no unit test for this.

**No `audit_log` rows written** (Decisions). Run history goes to stdout → App Insights and to the CronJob status.

**Batching: keyset pagination, sequential processing.**
- Read expired artefacts in pages of `EXPIRED_ARTEFACT_BATCH_SIZE = 100`, ordered by `artefactId`, using `artefactId > lastSeenId` as a cursor.
- Process each artefact in a page one after another: one transaction, then up to 4 parallel blob deletes.
- The cursor is needed. Artefacts whose transaction failed stay in the table, so "re-query the first 100" would loop on them forever.
- Processing one at a time stays well inside the Prisma connection pool. It also leaves the throughput headroom (inside the 3600s deadline) to clear a first-run backlog (§3).
- No parallelism across artefacts (YAGNI). Add it only if a stg dry run shows the backlog cannot finish within the deadline.

**`now` is fixed once at the start of the run** and used for every page. The logged "date used for the search" (AC4) is therefore exactly the date that was applied. Artefacts that expire during the run are picked up the next day.

---

## 2. Implementation Details

**TEMPLATE SOURCE: n/a**

No page, template, route or locale file is added. These are unattended backend jobs. No Welsh content is needed because there are no user-facing strings, and log messages stay in English like the rest of the service.

### 2.1 File structure

```
libs/postgres-prisma/prisma/schema/
└── artefact-archive.prisma                         # NEW: ArtefactArchive model

apps/postgres/prisma/migrations/
└── <timestamp>_add_artefact_archive/migration.sql  # NEW: generated by prisma migrate dev

libs/publication/src/
├── repository/queries.ts                           # MODIFY: add deleteArtefactBlobs, deleteArtefacts uses it
├── repository/queries.test.ts                      # MODIFY
├── artefact-archive/
│   ├── queries.ts                                  # NEW: findExpiredArtefacts, archiveAndDeleteArtefact, deleteArtefactArchiveOnOrBefore
│   ├── queries.test.ts                             # NEW
│   ├── service.ts                                  # NEW: archiveExpiredArtefacts, purgeArtefactArchive, subtractMonthsUtc (private)
│   └── service.test.ts                             # NEW
└── index.ts                                        # MODIFY: export archiveExpiredArtefacts, purgeArtefactArchive

libs/system-admin-pages/
├── package.json                                    # MODIFY: add "./audit-log/repository" subpath export
└── src/audit-log/
    ├── repository.ts                               # MODIFY: AUDIT_LOG_RETENTION_DAYS, deleteExpiredAuditLogs
    └── repository.test.ts                          # MODIFY

tsconfig.json                                       # MODIFY: path "@hmcts/system-admin-pages/audit-log/repository"

apps/crons/
├── package.json                                    # MODIFY: add @hmcts/system-admin-pages
├── src/clear-audit.ts                              # NEW
├── src/clear-audit.test.ts                         # NEW
├── src/expired-artefacts.ts                        # NEW
└── src/expired-artefacts.test.ts                   # NEW
```

### 2.2 Prisma model — `libs/postgres-prisma/prisma/schema/artefact-archive.prisma`

Mirrors `user-archive.prisma`. The column types match `artefact` so that values copy over without conversion. There is no FK to `artefact`, `location` or `list_type`, because the archive must outlive all of them.

```prisma
model ArtefactArchive {
  artefactId       String    @id @map("artefact_id") @db.Uuid
  type             String    @db.VarChar(50)
  locationId       String    @map("location_id")
  listTypeName     String    @map("list_type_name") @db.VarChar(1000)
  contentDate      DateTime  @map("content_date") @db.Date
  sensitivity      String
  language         String
  displayFrom      DateTime? @map("display_from")
  displayTo        DateTime? @map("display_to")
  isFlatFile       Boolean   @map("is_flat_file")
  provenance       String
  sourceArtefactId String?   @map("source_artefact_id")
  supersededCount  Int       @map("superseded_count")
  lastReceivedDate DateTime  @map("last_received_date")
  archivedDate     DateTime  @default(now()) @map("archived_date")

  @@index([archivedDate])
  @@map("artefact_archive")
}
```

- `artefact_id` is the PK, the same as `user_archive.user_id`. Superseding reuses the existing row (`createArtefact` updates in place), so one `artefactId` is only ever archived once.
- `list_type_name` is `VarChar(1000)` to match `list_type.name`.
- No index on `artefact.display_to`. The daily query scans a table that this job keeps small. Add the index only if `EXPLAIN` on stg shows a problem (YAGNI).

### 2.3 Migration

Migrations live in `apps/postgres/prisma/migrations/` (`apps/postgres/prisma.config.ts`). Generate it, don't hand-write it:

```bash
yarn db:migrate:dev --name add_artefact_archive
```

Expected SQL, which should match the `20260925110634_add_user_archive` pattern:

```sql
CREATE TABLE "artefact_archive" ( ...columns above..., CONSTRAINT "artefact_archive_pkey" PRIMARY KEY ("artefact_id") );
CREATE INDEX "artefact_archive_archived_date_idx" ON "artefact_archive"("archived_date");
```

Review the generated file. It must contain only this table and index, with no drift from other branches. `apps/postgres/start.sh` applies it on deploy (`prisma migrate deploy`). No seed changes.

### 2.4 Business logic — `@hmcts/publication`

**`repository/queries.ts`**

- `export async function deleteArtefactBlobs(artefactId: string, sourceArtefactId: string | null): Promise<void>`
  - Builds the 4 `{ name, container }` targets. The legacy extension is `path.extname(sourceArtefactId) || ".pdf"`, defaulting to `.pdf`, as it does today.
  - Runs `Promise.allSettled(targets.map(t => deleteBlob(t.name, t.container)))`.
  - If any delete was rejected, it throws `Error("Failed to delete blobs for artefact <id>: <container>/<name>, ...")`.
- `deleteArtefacts` replaces its per-blob code with `void deleteArtefactBlobs(a.artefactId, a.sourceArtefactId).catch((error) => console.error(...))`.
- `deleteArtefactBlobs` is exported from `queries.ts` for the `artefact-archive` module only. It is **not** added to `src/index.ts`.

**`artefact-archive/queries.ts`**

```typescript
export async function findExpiredArtefacts(now: Date, afterArtefactId: string | undefined, take: number) {
  return prisma.artefact.findMany({
    where: { displayTo: { lt: now }, ...(afterArtefactId && { artefactId: { gt: afterArtefactId } }) },
    orderBy: { artefactId: "asc" },
    take,
    select: { /* all archived columns */ listType: { select: { name: true } } }
  });
}

export async function archiveAndDeleteArtefact(artefact: ExpiredArtefact): Promise<void> {
  await prisma.$transaction([
    prisma.artefactArchive.create({ data: toArchiveRow(artefact) }),
    prisma.artefact.delete({ where: { artefactId: artefact.artefactId } })
  ]);
}

export async function deleteArtefactArchiveOnOrBefore(cutoff: Date): Promise<number> {
  const { count } = await prisma.artefactArchive.deleteMany({ where: { archivedDate: { lte: cutoff } } });
  return count;
}
```

`artefact_search` rows cascade and `ingestion_log.artefact_id` is set to null on `artefact.delete`. No extra cleanup is needed.

**`artefact-archive/service.ts`**

```typescript
const EXPIRED_ARTEFACT_BATCH_SIZE = 100;
const ARTEFACT_ARCHIVE_RETENTION_MONTHS = 3;

export async function archiveExpiredArtefacts(now: Date = new Date()): Promise<ArchiveSummary>
// loop pages via cursor; per artefact:
//   try { await archiveAndDeleteArtefact(a) } catch → record { artefactId, stage: "database" }, log, continue (blobs NOT touched)
//   try { await deleteArtefactBlobs(a.artefactId, a.sourceArtefactId) } catch → record { artefactId, stage: "blob" }, log, continue
// returns { searchDate: now, archived: <committed count>, failed: [{ artefactId, stage, message }] }

export async function purgeArtefactArchive(now: Date = new Date()): Promise<PurgeSummary>
// cutoff = subtractMonthsUtc(now, ARTEFACT_ARCHIVE_RETENTION_MONTHS); returns { cutoff, deleted }

function subtractMonthsUtc(from: Date, months: number): Date  // clamped, as in #918 plan §2.3
```

- `now` can be injected, so tests need no fake timers.
- `archived` counts artefacts whose DB transaction committed. A later blob failure is reported in `failed` with `stage: "blob"`, but the artefact still counts as archived, because it *is* archived in the DB.
- Logs contain artefact IDs and error messages only. No payload content.
- Export `archiveExpiredArtefacts` and `purgeArtefactArchive` from `libs/publication/src/index.ts`.

### 2.5 Audit log — `libs/system-admin-pages/src/audit-log/repository.ts`

```typescript
const AUDIT_LOG_RETENTION_DAYS = 90;
const DAY_MS = 24 * 60 * 60 * 1000;

export async function deleteExpiredAuditLogs(now: Date = new Date()): Promise<{ cutoff: Date; deleted: number }> {
  const cutoff = new Date(now.getTime() - AUDIT_LOG_RETENTION_DAYS * DAY_MS);
  const { count } = await prisma.auditLog.deleteMany({ where: { timestamp: { lt: cutoff } } });
  return { cutoff, deleted: count };
}
```

Following the module ordering rule, the constants go at the top of the file.

**Dependency choice.** The ticket names this file, and it is the only owner of `audit_log` writes. Importing `@hmcts/system-admin-pages` from its root would also load `launch-darkly.ts`, `web-core` and the rest of the admin page logic at runtime. So:

- Add a subpath export `"./audit-log/repository"` to `libs/system-admin-pages/package.json`. Use the same production/default shape as `@hmcts/account/repository/query`.
- Add the matching root `tsconfig.json` path.
- In crons, import only `@hmcts/system-admin-pages/audit-log/repository`. That file imports only `@hmcts/postgres-prisma`.

`yarn workspaces focus @hmcts/crons --production` will still install the lib's transitive deps into the crons image, which makes it bigger. That is acceptable. It is cheaper than moving `audit_log` access into a new lib, and it is what the ticket asked for. `express` is a peer dependency of that lib, and nothing is resolved from it at runtime through this subpath.

### 2.6 Cron scripts — `apps/crons/src/`

These follow #1306's `display-from-subscriptions.ts`. The file name must equal `SCRIPT_NAME`. A default export is required.

```typescript
// clear-audit.ts
import { deleteExpiredAuditLogs } from "@hmcts/system-admin-pages/audit-log/repository";
import { closeConnections } from "./close-connections.js";

export default async function clearAudit() {
  try {
    const { cutoff, deleted } = await deleteExpiredAuditLogs();
    console.info(`[ClearAudit] Deleted ${deleted} audit log rows with timestamp before ${cutoff.toISOString()}`);
  } finally {
    await closeConnections();
  }
}
```

```typescript
// expired-artefacts.ts
export default async function expiredArtefacts() {
  try {
    const archive = await archiveExpiredArtefacts();
    console.info(`[ExpiredArtefacts] Archived ${archive.archived} artefacts with display_to before ${archive.searchDate.toISOString()}`);
    // log each failure (artefactId, stage, message)

    const purge = await purgeArtefactArchive();
    console.info(`[ExpiredArtefacts] Deleted ${purge.deleted} artefact_archive rows archived on or before ${purge.cutoff.toISOString()}`);

    if (archive.failed.length > 0) {
      throw new Error(`${archive.failed.length} artefact(s) failed to archive cleanly`);
    }
  } finally {
    await closeConnections();
  }
}
```

The purge runs even when some artefacts failed. The failures are per-artefact and should not block retention of the archive table. A purge error itself (e.g. DB unavailable) propagates and also exits non-zero.

Static imports in these scripts are safe. They are loaded by the dynamic `import()` in `index.ts` *after* `getPropertiesVolumeSecrets` has populated `DATABASE_URL`. Do **not** import them statically from `index.ts`.

`apps/crons/package.json`: add `"@hmcts/system-admin-pages": "workspace:*"`. `@hmcts/publication` and `@hmcts/postgres-prisma` come from #1306. For `apps/crons/tsconfig.json` project references, follow whatever #1306 settles on. If `yarn build` in `apps/crons` needs references for the new libs, add `libs/publication` and `libs/system-admin-pages` alongside `libs/postgres-prisma`.

### 2.7 Helm / flux

**This repo:** no change to `apps/crons/helm/values.yaml` beyond #1306. DB and storage secrets are already there, and the Courtel secrets are not needed by either job. `SCRIPT_NAME` stays `example` (see §0).

**cnp-flux-config (separate repo, `apps/cath`, separate PR, not part of this repo's PR):** add two HelmReleases of the `cath-crons` chart. Each one overrides `job.environment.SCRIPT_NAME` and `job.schedule` as shown in the ticket comment:

| HelmRelease | `SCRIPT_NAME` | `schedule` |
|---|---|---|
| `clear-audit-cron` | `clear-audit` | `0 1 * * *` |
| `expired-artefacts-cron` | `expired-artefacts` | `0 1 * * *` |

- Keep `concurrencyPolicy: Forbid` (the chart default).
- Both jobs run at 01:00. They touch different tables, so they do not conflict.
- Cron schedules are interpreted in the cluster timezone, which is UTC on CNP AKS.
- Raise the flux PR only after this repo's image containing both scripts is published. Otherwise the job fails on `import("./clear-audit.js")`.

---

## 3. Error Handling & Edge Cases

| Condition | Behaviour |
|---|---|
| Archive transaction fails for one artefact (e.g. DB error, unexpected PK clash) | Transaction rolls back; artefact row and blobs untouched; failure recorded `stage: "database"`; loop continues; job exits non-zero at end (AC6). The next run retries it. |
| Blob delete fails (non-404) after commit | Artefact stays archived and deleted from DB; failure recorded `stage: "blob"` with the blob names; loop continues; job exits non-zero. A re-run will **not** retry, because the artefact is no longer found. The log line names the blobs for manual cleanup. This is the trade-off the ticket accepts. |
| Blob already missing (404), no PDF/Excel generated, or no legacy-named blob | Success (`deleteBlob` returns on 404). |
| `display_to` is null | Never selected (`lt` on NULL is false) (AC5). |
| `display_to` exactly equals `now` | Not expired (`lt`), consistent with `isWithinDisplayWindow` (`now > displayTo`). |
| First-run backlog | Every artefact with a past `display_to` in stg is archived on the first run. Keyset pages of 100 bound memory. The 3600s `activeDeadlineSeconds` bounds runtime. If the deadline is hit, the pod is killed mid-run, but each artefact is atomic in the DB, so the next run continues where this one stopped. Before enabling, check the backlog size on stg (`SELECT count(*) FROM artefact WHERE display_to < now()`). See Clarification 1. |
| Re-run / Kubernetes Job retry after non-zero exit | Idempotent: already archived artefacts are gone from `artefact`; purge and audit deletes are range deletes. The only repeated work is retrying database-stage failures, which is what we want. |
| Failed artefacts in a page | Cursor (`artefactId > last`) moves past them, so the loop always ends. |
| Month-end clamp | 31 May → 28 Feb (29 Feb in a leap year); 31 Mar → 31 Dec of the previous year; 15 Aug → 15 May. `lte`, so a row archived exactly at the cutoff is purged (AC8). |
| Audit cutoff exactly 90 days | `lt`: a row at exactly `now − 90d` is kept; anything older is deleted (AC1 "older than 90 days"). |
| `closeConnections` failure | Logged, not thrown (#1306 behaviour); does not mask the job's real result. |
| DB unreachable at start | `findExpiredArtefacts` / `deleteMany` throws → propagates → `index.ts` exits 1. |
| Concurrent runs | Prevented by `concurrencyPolicy: Forbid`. The admin remove-list flow deleting the same artefact during the run causes a P2025 on `artefact.delete`, recorded as a database-stage failure. That only happens in a narrow window; the next run does not see it again. |

---

## 4. Acceptance Criteria Mapping

| AC | How it is satisfied | Verification |
|---|---|---|
| 1. Delete audit logs > 90 days, log count | `deleteExpiredAuditLogs` (`timestamp < now − 90d`); `clear-audit.ts` logs `Deleted N audit log rows…` | `repository.test.ts` asserts `where` + cutoff for a fixed `now`; `clear-audit.test.ts` asserts log line includes count; stg manual run |
| 2. Identify `display_to < now` and archive | `findExpiredArtefacts` `where: { displayTo: { lt: now } }` + `archiveAndDeleteArtefact` | `artefact-archive/queries.test.ts` asserts `where`; `service.test.ts` asserts each expired artefact is processed; local run |
| 3. Blob payload + PDF/Excel deleted; archive row saved; artefact removed | `$transaction([artefactArchive.create, artefact.delete])` then `deleteArtefactBlobs` (artefact container incl. legacy name, `publications/<id>.pdf`, `.xlsx`) | `queries.test.ts` asserts 4 `deleteBlob` calls with correct containers; archive queries test asserts `create` data (incl. `listTypeName`) and `delete`; local run against Azurite/stg blob listing |
| 4. Log archived count and search date | `expired-artefacts.ts` logs `Archived N artefacts with display_to before <ISO now>` | `expired-artefacts.test.ts` asserts message |
| 5. Null `display_to` never archived | `lt` filter excludes NULL in SQL | Query test asserts exact `where` (no `OR null`); local run with a null-`display_to` artefact confirms it survives |
| 6. Per-artefact failure isolated, then non-zero exit | try/catch per artefact and stage; summary `failed[]`; script throws after logging; `index.ts` exits 1 | `service.test.ts`: transaction failure on 1 of 3 → other 2 archived and blobs for failed one untouched; blob failure recorded; `expired-artefacts.test.ts`: throws when `failed` non-empty, after purge and with `closeConnections` called |
| 7. No third-party deletion notification | Push lives only in the admin page controller; `artefact-archive/` and `expired-artefacts.ts` do not import `@hmcts/legacy-third-party-fulfilment` | Review check: `grep -r legacy-third-party-fulfilment libs/publication/src/artefact-archive apps/crons/src/expired-artefacts.ts` is empty; Courtel secrets not required by the job |
| 8. Purge `artefact_archive` ≥ 3 months, log count | `purgeArtefactArchive` (`archivedDate lte subtractMonthsUtc(now, 3)`) runs inside `expired-artefacts`; logs `Deleted N artefact_archive rows…` | `service.test.ts` clamp cases + `lte`; `expired-artefacts.test.ts` asserts log + purge runs even when archiving had failures |

There is no UI journey, so there is no E2E Playwright test. Verification beyond unit tests:

1. **Local:** `yarn dev:up`. Insert artefacts (past/future/null `display_to`), upload blobs and old `artefact_archive` / `audit_log` rows. Then run `SCRIPT_NAME=expired-artefacts yarn workspace @hmcts/crons dev` and `SCRIPT_NAME=clear-audit yarn workspace @hmcts/crons dev`, and check the DB, blob containers and exit code.
2. **Stg (after flux PR):** `kubectl create job --from=cronjob/<release> manual-<n> -n cath`. Check the pod logs / App Insights for both log lines, and check that the job status is `Complete`. Then confirm the scheduled 01:00 run the next day.

---

## 5. Test Scenarios (Vitest, AAA, co-located)

**`libs/publication/src/repository/queries.test.ts`**
- `deleteArtefactBlobs` deletes `artefact/<id>`, `artefact/<id><ext>` (ext from `sourceArtefactId`), `publications/<id>.pdf`, `publications/<id>.xlsx`
- uses `.pdf` legacy extension when `sourceArtefactId` is null or has no extension
- resolves when every delete resolves (404s already resolve inside `deleteBlob`)
- rejects with all failed blob names when one or more deletes reject, after attempting all four
- `deleteArtefacts` still deletes DB rows without awaiting blob deletion and logs (does not throw) on blob failure (existing tests adjusted)

**`libs/publication/src/artefact-archive/queries.test.ts`**
- `findExpiredArtefacts` uses `displayTo: { lt: now }`, ascending `artefactId` order, `take`, and selects `listType.name`
- adds `artefactId: { gt }` only when a cursor is given
- `archiveAndDeleteArtefact` calls `$transaction` with archive `create` (maps `listType.name` → `listTypeName`, no `listTypeId`) and artefact `delete`
- `deleteArtefactArchiveOnOrBefore` uses `archivedDate: { lte: cutoff }` and returns `count`

**`libs/publication/src/artefact-archive/service.test.ts`** (mock `./queries.js`, `../repository/queries.js`)
- archives every artefact across multiple pages and moves the cursor forward (page of 100 then partial page)
- returns `archived: 0` and does nothing when there are no expired artefacts
- passes the injected `now` to the query and returns it as `searchDate`
- continues after a transaction failure, records `stage: "database"`, and does not delete that artefact's blobs
- continues after a blob failure, records `stage: "blob"`, and counts the artefact as archived
- deletes blobs only after the transaction resolves (call order)
- `purgeArtefactArchive`: cutoff for 15 Aug → 15 May; 31 May → 28 Feb (non-leap) / 29 Feb (leap); 31 Mar → 31 Dec of previous year; time of day kept; returns the deleted count

**`libs/system-admin-pages/src/audit-log/repository.test.ts`**
- `deleteExpiredAuditLogs` calls `deleteMany` with `timestamp: { lt: now − 90 days }` and returns `{ cutoff, deleted }`

**`apps/crons/src/clear-audit.test.ts`**
- logs the deleted count and cutoff, and calls `closeConnections`
- propagates a repository failure and still calls `closeConnections`

**`apps/crons/src/expired-artefacts.test.ts`**
- logs the archived count + search date and the purged count + cutoff, and resolves when there are no failures
- logs each failure, still runs the purge, then throws, with `closeConnections` called
- propagates a purge failure and still calls `closeConnections`

**`apps/crons/src/index.test.ts`:** no change. Script resolution is already covered.

---

## 6. CLARIFICATIONS NEEDED

1. **First-run backlog size on stg.** How many artefacts currently have `display_to < now()`, and how big are their blobs? If the first run cannot finish within `activeDeadlineSeconds: 3600` (from #1306), it completes over several nights, which is safe but noisy (non-zero exits from the deadline). Is that acceptable, or should someone trigger it manually once before the schedule is enabled? Someone with stg DB access needs to run the count query.
2. **Orphaned blobs after a blob-stage failure.** These are not retried automatically (the artefact row is gone). Is a log line naming the blobs enough for now, or does ops want a follow-up cleanup ticket? The ticket says "can be cleaned up later" but no owner is named.
