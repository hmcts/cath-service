# Technical Plan — #918: Cron job to remove 'deleted accounts' after 3 months

## 0. Dependency status — read first

**This ticket cannot be completed on its own today.** The table it purges does not exist.

Verified against the repo at `master` (`1b912d2`):

| Claim | Verified |
|---|---|
| No `deleted_account` table, model, or migration | `grep -r "deletedAccount\|deleted_account\|DeletedAccount"` over the whole repo → **no matches** |
| No MI report code at all | `find . -ipath "*mi*report*"` → **nothing** |
| #894 (`'Deleted accounts' to be added to the MI Report`) is **OPEN**, unimplemented | `gh issue view 894` |
| #628 (`MI Report Download — System Admin Dashboard`), which #894 depends on, is **OPEN** | `gh issue view 628` |
| `apps/crons` exists and works: `SCRIPT_NAME` → dynamic `import("./${SCRIPT_NAME}.js")` → `default()` | `apps/crons/src/index.ts` |
| `apps/crons` has **no** database dependency today (deps are only `@hmcts-cft/cloud-native-platform` + `config`) | `apps/crons/package.json` |
| The only cron script is the `console.log` placeholder `example.ts`; `SCRIPT_NAME: 'example'` is pinned in helm | `apps/crons/helm/values.yaml:12` |
| The crons chart renders exactly **one** `CronJob` per release (single `job:` block, `concurrencyPolicy: Forbid`) | `apps/crons/helm/values.yaml`, `helm/cath-service/Chart.yaml` |
| Hard user deletion already exists and is transactional | `libs/system-admin-pages/src/user-management/queries.ts:107` |
| `audit_log` requires a real actor — `userId`, `userEmail`, `userRole`, `userProvenance` are all non-null; there is no `SYSTEM` actor | `libs/postgres-prisma/prisma/schema/audit-log.prisma` |

Two consequences:

1. **Sequencing.** If #894 has not merged when this is picked up, this ticket must create the `deleted_account` model and migration itself, which will collide with #894's migration. Coordinate before writing either.
2. **A functional conflict with #894 that Product must resolve.** #894 requires the MI report to show deleted-account counts *"for the selected report duration"*. Once rows older than 3 months are hard-deleted, any report range reaching further back silently under-reports. See §5, question 2 — this is a Product decision, not an engineering one.

Everything below is written against the schema #894 is expected to create (§2.1). If that schema differs, only the `where` clause column and the index name change; the rest holds.

---

## 1. Technical Approach

A Kubernetes `CronJob` runs a new script in the existing `apps/crons` runner. The script is a thin wrapper; all logic lives in a lib, per `CLAUDE.md` ("Don't put business logic in apps/").

The purge is a single indexed `deleteMany` filtered on the archive timestamp:

```
prisma.deletedAccount.deleteMany({ where: { deletedAt: { lte: cutoff } } })
```

### Architecture decisions

**Hard delete, single statement, no transaction.** `deleted_account` is a flat archive table with no inbound foreign keys, so there are no dependent rows to cascade — unlike `deleteUserById`, which must clear `notificationAuditLog` → `subscription` → `user` inside `$transaction`. `deleteMany` is already atomic. A soft delete would defeat the purpose of the ticket, and the codebase deliberately moved away from soft deletes for this kind of data (`20260702000000_remove_soft_delete_and_admin_audit_log`).

**`lte`, not `lt`.** The acceptance criterion is "archived for 3 months **or longer**", so a row that is exactly 3 months old is purged.

**Calendar months, clamped.** "3 months" is read as 3 calendar months (5 May → 5 February), not 90 days. Naive `setUTCMonth` arithmetic rolls over — 31 May minus 3 months yields **3 March**, which would purge rows that are not yet 3 months old. The cutoff helper must clamp to the last valid day of the target month. All arithmetic in UTC.

**Retention is configurable** via `DELETED_ACCOUNT_RETENTION_MONTHS` (default 3) so the period can change without a code deploy if the data-protection position changes. Invalid values **fail closed** — throw before touching the database rather than falling back to a shorter default, which would over-delete.

**Daily at 02:00 UTC, not monthly.** Keeps each run's delete set small and bounds worst-case over-retention to 24 hours.

**No audit logging.** `audit_log` records System Admin actions and requires a real actor on four non-null columns. An automated job would need synthetic values, polluting the audit log viewer with rows that have no user behind them. Run history is already captured by stdout → Application Insights and by `CronJob` status. Revisit only if Product asks for in-service visibility (§5, question 8).

**No batching.** `deleted_account` is written only by the annual verification process; steady-state volume per run is low and the delete is one indexed range scan. Chunking would be speculative complexity (YAGNI) — but see §5, question 5 on first-run backfill volume.

---

## 2. Implementation Details

**TEMPLATE SOURCE: n/a**

No rendered page or list-type view is added. This is an unattended backend job with no UI, no route, no template, and no locale file.

### 2.1 Prisma model — owned by #894, confirm before implementing

The assumed shape this plan's query targets:

```prisma
// libs/postgres-prisma/prisma/schema/deleted-account.prisma
model DeletedAccount {
  id               String    @id @default(uuid()) @db.Uuid
  userId           String    @map("user_id") @db.Uuid
  email            String    @db.VarChar(255)
  userProvenance   String    @map("user_provenance") @db.VarChar(20)
  role             String    @db.VarChar(20)
  createdDate      DateTime  @map("created_date")
  lastSignedInDate DateTime? @map("last_signed_in_date")
  deletedAt        DateTime  @default(now()) @map("deleted_at")

  @@index([deletedAt])
  @@map("deleted_account")
}
```

`@@index([deletedAt])` is **required by this ticket** — the purge filters exclusively on that column. If #894 ships without it, add it here in a dedicated migration.

Only `deleted_at` matters to this job. If #894 names the archive timestamp differently (`archivedAt`, `deletionDate`, …), change the `where` clause and the index name; nothing else moves.

### 2.2 Migration — only if #894 has not already created the table/index

`apps/postgres/prisma/migrations/<timestamp>_add_deleted_account_deleted_at_index/migration.sql`:

```sql
CREATE INDEX IF NOT EXISTS "deleted_account_deleted_at_idx" ON "deleted_account" ("deleted_at");
```

Follows the existing convention (`20260714112456_add_list_type_json_fields`, `20260702000000_remove_soft_delete_and_admin_audit_log`). Do not hand-write seed SQL — this table holds no reference data.

### 2.3 Business logic — `libs/account/src/deleted-account/retention.ts` (new)

```typescript
import { prisma } from "@hmcts/postgres-prisma";

const DEFAULT_RETENTION_MONTHS = 3;

export async function purgeExpiredDeletedAccounts(options: PurgeOptions = {}): Promise<PurgeResult> {
  const retentionMonths = options.retentionMonths ?? DEFAULT_RETENTION_MONTHS;
  const now = options.now ?? new Date();
  const cutoff = subtractMonthsUtc(now, retentionMonths);

  const { count } = await prisma.deletedAccount.deleteMany({
    where: { deletedAt: { lte: cutoff } }
  });

  return { deletedCount: count, cutoff };
}

// JS month arithmetic rolls over (31 May minus 3 months → 3 March), which would purge
// rows that are not yet 3 months old. Clamp to the last day of the target month.
function subtractMonthsUtc(from: Date, months: number): Date {
  const result = new Date(from.getTime());
  const targetMonth = result.getUTCMonth() - months;
  const dayOfMonth = result.getUTCDate();

  result.setUTCDate(1);
  result.setUTCMonth(targetMonth);

  const lastDayOfTargetMonth = new Date(Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0)).getUTCDate();
  result.setUTCDate(Math.min(dayOfMonth, lastDayOfTargetMonth));

  return result;
}

interface PurgeOptions {
  now?: Date;
  retentionMonths?: number;
}

interface PurgeResult {
  deletedCount: number;
  cutoff: Date;
}
```

Conventions honoured: module ordering (const → exported function → helper → interfaces at the bottom); injectable `now` so tests need no fake timers; the comment explains *why*, not *what*.

Package export in `libs/account/package.json`, matching the existing granular style (`./repository/query`, `./repository/service`):

```json
"./deleted-account/retention": {
  "production": "./dist/deleted-account/retention.js",
  "default": "./src/deleted-account/retention.ts"
}
```

Root `tsconfig.json` path, alongside the existing `@hmcts/account/*` entries at lines 15–17:

```json
"@hmcts/account/deleted-account/retention": ["libs/account/src/deleted-account/retention"]
```

### 2.4 Cron script — `apps/crons/src/remove-expired-deleted-accounts.ts` (new)

```typescript
import { purgeExpiredDeletedAccounts } from "@hmcts/account/deleted-account/retention";

export const removeExpiredDeletedAccounts = async () => {
  const retentionMonths = Number(process.env.DELETED_ACCOUNT_RETENTION_MONTHS ?? 3);

  if (!Number.isInteger(retentionMonths) || retentionMonths < 1) {
    throw new Error(
      `DELETED_ACCOUNT_RETENTION_MONTHS must be a positive integer, received "${process.env.DELETED_ACCOUNT_RETENTION_MONTHS}"`
    );
  }

  console.log(`Starting remove-expired-deleted-accounts (retentionMonths=${retentionMonths})`);

  const { deletedCount, cutoff } = await purgeExpiredDeletedAccounts({ retentionMonths });

  console.log(`Purged ${deletedCount} deleted account records archived on or before ${cutoff.toISOString()}`);
};

export default removeExpiredDeletedAccounts;
```

The `default` export is mandatory — `index.ts` throws `The script "<name>" does not export a default function.` without it. The file name must be kebab-case and must match `SCRIPT_NAME` exactly, because `index.ts` interpolates it into the dynamic import path.

**Do not add a static top-level import of the retention lib to `apps/crons/src/index.ts`.** `libs/postgres-prisma/src/index.ts` resolves `DATABASE_URL` at *module load* time, and falls back to `postgresql://hmcts@localhost:5433/postgres` if it is unset. `index.ts` currently awaits `getPropertiesVolumeSecrets(...)` *before* the dynamic `import()`, so the secret is in place by the time Prisma initialises. Hoisting the import would invert that ordering and silently point the pod at localhost.

`apps/crons/package.json` — add the two missing dependencies (the workspace has no DB access today):

```json
"@hmcts/account": "workspace:*",
"@hmcts/postgres-prisma": "workspace:*"
```

`apps/crons/tsconfig.json` — add the project reference alongside the existing `postgres-prisma` one:

```json
"references": [
  { "path": "../../libs/postgres-prisma" },
  { "path": "../../libs/account" }
]
```

The Dockerfile needs no change: it already does `COPY --from=build /opt/app/libs ./libs` and `yarn workspaces focus @hmcts/crons --production`, so the new workspace deps are picked up. `libs/postgres-prisma` builds via `prisma generate --no-hints && tsc`, so `libs/postgres-prisma/generated/` is produced during `yarn build` and carried by the `COPY libs`. **This is the first cron to touch the database — verify the generated client is present in a built runtime image rather than assuming.**

### 2.5 Infrastructure — schedule and script selection

```yaml
# apps/crons/helm/values.yaml
job:
  environment:
    SCRIPT_NAME: 'remove-expired-deleted-accounts'
    DELETED_ACCOUNT_RETENTION_MONTHS: '3'
  schedule: "0 2 * * *"
  concurrencyPolicy: Forbid   # already set — keep
```

**Constraint to resolve with the infrastructure team:** one chart release renders one `CronJob`, so `example` and `remove-expired-deleted-accounts` cannot both run from a single release. Options:

1. **Recommended:** repoint the existing release's `SCRIPT_NAME` and retire `example.ts`. It is a placeholder that only `console.log`s, so losing it costs nothing. Smallest change, no chart work. Its tests (`apps/crons/src/example.test.ts`) and the `vi.mock("./example.js")` in `index.test.ts` go with it.
2. Add a second `cath-crons` dependency alias in `helm/cath-service/Chart.yaml` with its own `SCRIPT_NAME`/`schedule`. Needed only once a second real cron exists — defer.

`schedule` and `suspend` are also set in `helm/cath-service/values.template.yaml:39` (stg) and `values.preview.template.yaml:93` (preview), both currently `*/5 * * * *`. Update stg to `0 2 * * *`. **Leave preview short-interval or `suspend: true`** — a 5-minutely purge against an ephemeral preview DB is noise, and the table is empty there anyway.

Per the comment in `apps/crons/helm/values.yaml`, the authoritative schedule is configured in flux. That HelmRelease lives **outside this repo**, so it cannot merge as part of this PR — raise it with the infrastructure team. There is no prod deployment of this service yet, so stg and preview are the only targets.

### 2.6 API endpoints

None. No HTTP route, no Express handler. The job is addressed by `SCRIPT_NAME`. Local invocation:

```bash
SCRIPT_NAME=remove-expired-deleted-accounts yarn workspace @hmcts/crons dev
```

### 2.7 Welsh content

None required, because no user-facing string is introduced. This is the correct outcome, not an omission — the "don't skip Welsh translations" rule covers user-facing text, and a `CronJob` has none. Operator log strings stay English, consistent with the rest of the service's logging.

---

## 3. Error Handling & Edge Cases

| Input / condition | Rule | On breach |
|---|---|---|
| `SCRIPT_NAME` | Required, non-empty | `index.ts` throws `SCRIPT_NAME environment variable is required` → exit 1 (existing behaviour) |
| `SCRIPT_NAME` resolution | Must resolve to a module with a `default` function | `index.ts` throws `The script "<name>" does not export a default function.` → exit 1 (existing) |
| `DELETED_ACCOUNT_RETENTION_MONTHS` | Optional; if present, integer ≥ 1. Default 3 | Throw **before** any database work → exit 1. Fail closed — never fall back to a shorter retention |
| `DATABASE_URL` | Supplied from the `postgres-url` Key Vault secret. `omit: ["DATABASE_URL"]` keeps the volume loader from clobbering the alias | Prisma throws → exit 1. **But note the silent localhost fallback in §2.4 — confirm the env var actually reaches the pod** |
| `deletedAt` boundary | `lte cutoff` — inclusive, honouring "3 months **or longer**" | n/a |
| Cutoff arithmetic | Clamp to the last valid day of the target month; UTC getters/setters throughout | Covered by unit tests (§4) |
| Empty result set | **Not an error.** Most days will legitimately purge 0 rows | Log `Purged 0 …`, exit 0 |
| Overlapping runs | `concurrencyPolicy: Forbid` — Kubernetes skips the new invocation rather than queuing it | n/a |
| `deleted_account` missing | Expected symptom of deploying ahead of #894 | `PrismaClientKnownRequestError: The table 'public.deleted_account' does not exist` → exit 1 |

### Edge cases the cutoff helper must get right

| `now` (UTC) | Retention | Correct cutoff | Naive result (wrong) |
|---|---|---|---|
| 2026-05-31 | 3 months | 2026-02-28 | 2026-03-03 |
| 2024-05-31 | 3 months | 2024-02-29 (leap) | 2024-03-02 |
| 2026-02-15 | 3 months | 2025-11-15 (year boundary) | — |
| 2026-05-05 | 6 months | 2025-11-05 | — |

**No retry logic.** A failed run is picked up by the next scheduled run; the operation is idempotent, so a missed run causes at most 24 hours of extra retention. Alerting on repeated `CronJob` failure is an infrastructure concern, not part of this change.

### Operator-facing messages

| Situation | Message |
|---|---|
| Run start | `Starting remove-expired-deleted-accounts (retentionMonths=3)` |
| Run success | `Purged {count} deleted account records archived on or before {cutoffIso}` |
| Bad config | `DELETED_ACCOUNT_RETENTION_MONTHS must be a positive integer, received "{value}"` |
| Any failure | `Cron job failed: {error}` — emitted by the existing handler in `apps/crons/src/index.ts` |

---

## 4. Acceptance Criteria Mapping

The ticket states one criterion: *"The deleted accounts are removed from the 'deleted accounts' table after 3 months."*

| Sub-criterion | Satisfied by | Verified by |
|---|---|---|
| Rows older than 3 months are removed | `deleteMany({ where: { deletedAt: { lte: cutoff } } })` in `retention.ts` | Unit test asserting the `where` clause and returned count; manual boundary check against a real DB |
| Rows newer than 3 months are retained | Same `lte` filter — no other rows match | Unit test on cutoff computation |
| Exactly-3-months-old rows are removed ("or longer") | `lte`, not `lt` | Unit test |
| Removal is automatic, not manual | Kubernetes `CronJob`, `schedule: "0 2 * * *"` | Rendered-manifest check + manual `kubectl create job --from=cronjob/...` on stg |
| Runs do not overlap | `concurrencyPolicy: Forbid` (already set) | Rendered-manifest check |
| Nothing stays indefinitely | Hard `DELETE`, no soft-delete column | Schema review |
| Failures are visible | Existing `main().catch` → `console.error` + `exit 1` → App Insights and `CronJob` status `Failed` | Unit test that a Prisma rejection propagates |
| Retention period changeable without a deploy | `DELETED_ACCOUNT_RETENTION_MONTHS`, default 3 | Unit tests for default, override, and invalid values |

### Test scenarios

**Unit — `libs/account/src/deleted-account/retention.test.ts`.** Mock `@hmcts/postgres-prisma` with `prisma.deletedAccount.deleteMany`, following `libs/account/src/repository/query.test.ts`. Arrange-Act-Assert.

- Deletes with `where: { deletedAt: { lte: <cutoff> } }` and returns Prisma's count
- Cutoff is exactly 3 months before `now` when `retentionMonths` is omitted
- Cutoff is 6 months before `now` when `retentionMonths: 6`
- Clamps month-end: `now` = 2026-05-31, 3 months → 2026-02-28 (not 2026-03-03)
- Clamps into leap February: `now` = 2024-05-31, 3 months → 2024-02-29
- Crosses a year boundary: `now` = 2026-02-15, 3 months → 2025-11-15
- Cutoff is identical under `TZ=Australia/Sydney` and `TZ=UTC` — catches a `getMonth`/`getUTCMonth` slip
- Returns `deletedCount: 0` without throwing when Prisma reports `{ count: 0 }`
- Propagates a Prisma rejection rather than swallowing it

**Unit — `apps/crons/src/remove-expired-deleted-accounts.test.ts`.** Mock `@hmcts/account/deleted-account/retention`; spy on `console.log`. Mirrors `apps/crons/src/example.test.ts`.

- Exports a `default` function (guards the contract `index.ts` depends on)
- Calls the purge with `retentionMonths: 3` when the env var is unset
- Calls it with `retentionMonths: 6` when `DELETED_ACCOUNT_RETENTION_MONTHS=6`
- Throws for `0`, `-1`, `1.5`, and non-numeric values, and asserts the purge mock was **not** called — a bad config can never shorten retention
- Logs the start line with the resolved retention period
- Logs the purged count and cutoff ISO timestamp on success
- Restores `process.env` after each test (the `index.test.ts` pattern)

**Unit — `apps/crons/src/index.test.ts` (extend).** Dispatches to the new script when `SCRIPT_NAME=remove-expired-deleted-accounts`, awaiting its default export. If `example.ts` is retired (§2.5 option 1), replace the `vi.mock("./example.js")` fixture.

**Manual boundary check against a real database, once, on the PR.** Prisma mocks prove the `where` clause is built correctly; they do not prove Postgres agrees at the boundary. Seed rows at `now - 3 months + 1s`, exactly `now - 3 months`, and `now - 3 months - 1s`; run the script; confirm the first survives and the other two are gone. Record the result in the PR — do not automate this as a new harness.

**E2E — none.** No user journey to walk. Per `.claude/rules/e2e-testing.md`, E2E tests cover user journeys, not scheduled jobs; adding one means building schedule-triggering scaffolding for zero UI coverage.

**Deployment verification.**
- Confirm the built `cath-crons` image can reach Postgres and that `libs/postgres-prisma/generated` is present in the runtime image
- Confirm `DATABASE_URL` is actually populated in the pod (not silently defaulted to localhost)
- Confirm the rendered `CronJob` carries the expected `schedule`, `SCRIPT_NAME`, and `concurrencyPolicy: Forbid`
- Trigger a manual run on stg (`kubectl create job --from=cronjob/...`) and confirm exit 0 plus the expected log lines

---

## 5. CLARIFICATIONS NEEDED

### Blocking — needs an answer before implementation starts

1. **#894 must land first, and its schema is the contract.** Confirm the table name (`deleted_account`), the archive timestamp column (`deleted_at`), and whether #894 adds `@@index([deleted_at])`. If #918 is picked up first, it must create the model and migration, and #894's author must be told — otherwise two migrations will try to create the same table. Note #894 itself is blocked on #628, and neither is started.

2. **The purge contradicts #894's reporting requirement.** #894 requires deletion counts "for the selected report duration". Once rows older than 3 months are gone, longer report ranges under-report silently. Product must choose:
   - **(a)** Accept it — #894 displays an explicit caveat and warns/refuses on ranges older than 3 months;
   - **(b)** Retain a small aggregate table (`deleted_account_monthly_count`: year, month, provenance, count) that this job populates *before* purging. Reporting keeps working indefinitely; personal data still goes at 3 months. Costs one extra table and a little logic;
   - **(c)** Extend retention to cover the maximum reportable range — which defeats the purpose of this ticket.

   **Recommendation: (b).** It is the only option where neither ticket's acceptance criteria are quietly broken. Specify it in whichever ticket lands second.

3. **Does the annual verification process that populates `deleted_account` exist yet?** No code was found for it. If deletions are currently manual System Admin actions via `delete-user-confirm` → `deleteUserById`, then #894 must hook into that, and this job's input may be empty for some time after release. Functionally fine, but it means the acceptance criteria cannot be demonstrated end-to-end on stg without seeding rows by hand.

### Needs a decision, not blocking the first commit

4. **Is 3 months what the data-protection assessment actually requires?** The env var makes it changeable without a deploy, but the default should match a documented DPIA position rather than the ticket text alone.

5. **First-run volume.** If #894 backfills historical deletions, the first run could delete a large batch in one statement. Above roughly 100k rows, add chunked deletion (`take: 1000` in a bounded loop); below that, a single indexed `deleteMany` is correct and simpler. Needs the expected row count from #894.

6. **Schedule.** 02:00 UTC daily is proposed. Confirm with the infrastructure team that it does not collide with the nightly publication or notification windows.

7. **The one-CronJob-per-release constraint** (§2.5). Recommendation is to repoint the existing release's `SCRIPT_NAME` and retire the `example` placeholder. Needs infrastructure sign-off plus the matching flux HelmRelease change, which lives outside this repo and so cannot merge in this PR.

8. **Should a purge be visible to System Admins in-service?** §1 says no, on the grounds that `audit_log` is for user actions and needs a real actor. If Product wants visibility, a separate system-run log is cleaner than synthetic `audit_log` rows — and it would bring a Welsh string into scope for the first time.

### Assumptions made (stated so they can be corrected)

9. "Archived for 3 months" is measured from the `deleted_at` timestamp on the `deleted_account` row, not the original account's `created_date` or `last_signed_in_date`.
10. "3 months" means 3 calendar months, not 90 days. If 90 days is wanted, the cutoff helper simplifies considerably — say so and it changes.
11. "3 months or longer" is inclusive: a row exactly 3 months old is purged (`lte`, not `lt`).
12. Deletion is a hard `DELETE`.
13. `deleted_account` has no inbound foreign keys, so no cascade or transaction is needed. **Verify against #894's final schema** — if it references `user` or `subscription`, the ordered-delete logic from `deleteUserById` applies.
14. All timestamps are UTC; the cron pod runs UTC.
15. No prod environment exists yet, so stg + preview are the only deployment targets. Prod scheduling is out of scope.
