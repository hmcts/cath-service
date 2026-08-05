# #918: Add cron job to remove 'deleted accounts' from database after 3 months

**State:** OPEN
**Assignees:** _none_
**Author:** OgechiOkelu
**Labels:** _none_
**Created:** 2026-08-05T11:31:35Z
**Updated:** 2026-08-05T12:06:03Z

## Description

**PROBLEM STATEMENT**

Following the implementation of the additional MI report option for deleted accounts in https://github.com/hmcts/cath-service/issues/894, we need to maintain deleted accounts so they do not stay in the database indefinitely. We need a cron job to automatically delete these accounts after they have been archived for 3 months or longer.

**AS A** Product Manager

**I WANT** to keep the deleted accounts for 3 months only

**SO THAT** they do not stay in the database indefinitely.

**ACCEPTANCE CRITERIA**

The deleted accounts are removed from the 'deleted accounts' table after 3 months.

## Comments

### Comment by OgechiOkelu on 2026-08-05T11:52:14Z

@spec 

### Comment by hmctsclaudecode on 2026-08-05T12:00:27Z

# Technical Specification — Issue #918: Cron job to remove 'deleted accounts' from the database after 3 months

## 1. User Story

**As a** Product Manager
**I want to** have deleted account records automatically purged from the database once they are 3 months old
**So that** deleted account data does not stay in the database indefinitely and the service meets its data-minimisation obligations

---

## 2. Background

Following the annual verification process, CaTH accounts that are not re-verified are deleted. Issue [#894](https://github.com/hmcts/cath-service/issues/894) introduces a `deleted accounts` store so the System Admin `Download MI Report` page can report on deletion volumes. #894 itself depends on [#628](https://github.com/hmcts/cath-service/issues/628) (MI Report Download — System Admin Dashboard).

This ticket adds the retention side of that store: a scheduled job that hard-deletes archived account rows once they have been retained for 3 months or longer.

### Current state in the repo (verified, not assumed)

| Fact | Evidence |
|---|---|
| There is **no** `deleted_account` table, model, or migration. `grep -ri "deleted_account\|deletedAccount"` over `libs/`, `apps/`, and `*.prisma` returns nothing outside the requirements SQL dumps. | `libs/postgres-prisma/prisma/schema/*.prisma` |
| There is **no** MI report code at all. `find . -ipath "*mi*report*"` returns nothing; #628 and #894 are both unimplemented (`draft`/`Refined Tickets` in `requirements/migrations/012_reconcile_board_2026_08_04.sql`). | `requirements/migrations/012_reconcile_board_2026_08_04.sql:8314` |
| A cron runner app **already exists** — `apps/crons`. `src/index.ts` reads `SCRIPT_NAME`, dynamically imports `./${SCRIPT_NAME}.js`, and invokes its `default` export. Failures `console.error` and `process.exit(1)`. | `apps/crons/src/index.ts` |
| The only cron script today is the placeholder `apps/crons/src/example.ts`. `SCRIPT_NAME: 'example'` is hardcoded in `apps/crons/helm/values.yaml:12`. | `apps/crons/helm/values.yaml` |
| `apps/crons` has **no** database dependency. `package.json` dependencies are only `@hmcts-cft/cloud-native-platform` and `config`. Its `tsconfig.json` has a project reference to `../../libs/postgres-prisma` but nothing imports it. | `apps/crons/package.json`, `apps/crons/tsconfig.json:10` |
| The crons Helm chart models exactly **one** `CronJob` per release (`global.jobKind: CronJob`, a single `job:` block, `concurrencyPolicy: Forbid`). Schedule is overridden per environment (`*/5 * * * *` in both `values.template.yaml` and `values.preview.template.yaml`) with a comment saying the real schedule is configured in flux. | `apps/crons/helm/values.yaml`, `helm/cath-service/values.template.yaml:41` |
| Prisma models live in `libs/postgres-prisma/prisma/schema/<domain>.prisma`; migrations live in `apps/postgres/prisma/migrations/`. Deploy applies `prisma migrate deploy` from `apps/postgres/start.sh`. | `apps/postgres/start.sh` |
| Hard user deletion already exists and is transactional: `deleteUserById` removes `notificationAuditLog` → `subscription` → `user` inside `prisma.$transaction`. | `libs/system-admin-pages/src/user-management/queries.ts:107` |
| `audit_log` writes require a real actor (`userId`, `userEmail`, `userRole`, `userProvenance` are all non-null). There is no `SYSTEM` actor concept. | `libs/postgres-prisma/prisma/schema/audit-log.prisma`, `libs/system-admin-pages/src/audit-log/logger.ts` |

### Dependency position — read this before starting

**This ticket cannot be completed independently of #894.** The table it purges does not exist. Two things follow:

1. If #894 has not merged when this is picked up, this ticket must create the `deleted_account` model itself, which will collide with #894's migration.
2. There is a **direct functional conflict** between the two tickets. #894's acceptance criteria require the MI report to show "the number of deleted accounts from the annual verification process … **for the selected report duration**". A 3-month purge means any report duration extending further back than 3 months will silently under-report. See §14 — this needs a Product decision, not an engineering one.

The specification below is written against the schema #894 is expected to create (§6.1). If that schema differs, only the column name in the `where` clause and the index change; the rest holds.

---

## 3. Acceptance Criteria

* **Scenario:** An archived account older than the retention period is purged
    * **Given** a row exists in `deleted_account` with `deleted_at` = 2026-01-01T00:00:00Z
    * **And** the current time is 2026-05-05T02:00:00Z (more than 3 months later)
    * **When** the `remove-expired-deleted-accounts` cron job runs
    * **Then** that row is permanently removed from `deleted_account`
    * **And** the job logs the number of rows removed
    * **And** the job exits with code 0

* **Scenario:** An archived account inside the retention period is retained
    * **Given** a row exists in `deleted_account` with `deleted_at` = 2026-04-01T00:00:00Z
    * **And** the current time is 2026-05-05T02:00:00Z (less than 3 months later)
    * **When** the cron job runs
    * **Then** that row is still present in `deleted_account`

* **Scenario:** Retention boundary is inclusive of exactly-3-months-old rows
    * **Given** a row exists in `deleted_account` with `deleted_at` = 2026-02-05T02:00:00Z
    * **And** the current time is 2026-05-05T02:00:00Z (exactly 3 months later)
    * **When** the cron job runs
    * **Then** that row is removed, because the acceptance criterion is "archived for 3 months **or longer**"

* **Scenario:** Nothing to purge
    * **Given** every row in `deleted_account` has `deleted_at` within the last 3 months
    * **When** the cron job runs
    * **Then** no rows are deleted
    * **And** the job logs that 0 rows were removed
    * **And** the job exits with code 0 (an empty run is not an error)

* **Scenario:** Month-end cutoff arithmetic does not skip or over-delete
    * **Given** the current time is 2026-05-31T02:00:00Z
    * **When** the cutoff date is computed for a 3-month retention period
    * **Then** the cutoff is 2026-02-28T02:00:00Z (clamped to the last valid day of February), **not** 2026-03-03 as naive `setUTCMonth` arithmetic would produce

* **Scenario:** Database failure surfaces as a failed job
    * **Given** the database is unreachable
    * **When** the cron job runs
    * **Then** the error is logged with `Cron job failed:` and the process exits with code 1
    * **And** no partial deletion is left committed

* **Scenario:** Overlapping executions are prevented
    * **Given** a previous invocation of the CronJob is still running
    * **When** the next scheduled time is reached
    * **Then** Kubernetes skips the new invocation because `concurrencyPolicy: Forbid` is set

* **Scenario:** Retention period is configurable without a code change
    * **Given** `DELETED_ACCOUNT_RETENTION_MONTHS` is set to `6` in the environment
    * **When** the cron job runs
    * **Then** rows are purged only once they are 6 months old or older

---

## 4. User Journey Flow

There is **no user journey**. This is an unattended scheduled backend job with no UI, no route, and no request/response cycle. The only human-visible surface is the job's log output in Application Insights.

Execution flow:

```
Kubernetes CronJob (schedule from flux HelmRelease values)
        │
        ▼
  Pod starts: node dist/index.js
        │
        ▼
  apps/crons/src/index.ts
    ├─ getPropertiesVolumeSecrets({ chartPath, omit: ["DATABASE_URL"] })
    │     → loads app-insights-connection-string + postgres-url from Key Vault
    ├─ reads SCRIPT_NAME  ──► missing? throw ──► exit 1
    └─ import(`./${SCRIPT_NAME}.js`).default()
              │
              ▼
  apps/crons/src/remove-expired-deleted-accounts.ts  (thin wrapper — no logic)
    ├─ resolve retentionMonths from env (default 3)
    └─ purgeExpiredDeletedAccounts({ now: new Date(), retentionMonths })
              │
              ▼
  libs/account/src/deleted-account/retention.ts  (all logic lives here)
    ├─ cutoff = subtractMonthsUtc(now, retentionMonths)   // clamped
    ├─ prisma.deletedAccount.deleteMany({ where: { deletedAt: { lte: cutoff } } })
    └─ return { deletedCount, cutoff }
              │
              ▼
  log: "Purged N deleted account records archived on or before <cutoff ISO>"
              │
              ▼
  exit 0                                  (on throw: log + exit 1)
```

Row lifecycle across the two tickets:

```
 annual verification            #894                     #918 (this ticket)
 ─────────────────────          ────                     ──────────────────
 account not re-verified   ──►  row inserted into   ──►  row hard-deleted once
 → user row deleted             deleted_account          deleted_at <= now - 3 months
                                (deleted_at = now)
                                     │
                                     ▼
                                MI report counts
                                (only accurate for the
                                 last 3 months — see §14)
```

---

## 5. Low Fidelity Wireframe

No screens are added or changed by this ticket. The nearest thing to a "view" is the log line emitted per run:

```
┌────────────────────────────────────────────────────────────────────────────┐
│ Application Insights › traces › cath-crons                                 │
├────────────────────────────────────────────────────────────────────────────┤
│ 2026-08-06T02:00:01Z  Starting remove-expired-deleted-accounts             │
│                       (retentionMonths=3)                                  │
│ 2026-08-06T02:00:01Z  Purged 0 deleted account records archived on or      │
│                       before 2026-05-06T02:00:01.000Z                      │
├────────────────────────────────────────────────────────────────────────────┤
│ 2026-08-07T02:00:01Z  Starting remove-expired-deleted-accounts             │
│                       (retentionMonths=3)                                  │
│ 2026-08-07T02:00:02Z  Purged 412 deleted account records archived on or    │
│                       before 2026-05-07T02:00:01.000Z                      │
└────────────────────────────────────────────────────────────────────────────┘
```

Failure run:

```
┌────────────────────────────────────────────────────────────────────────────┐
│ 2026-08-08T02:00:01Z  Starting remove-expired-deleted-accounts             │
│ 2026-08-08T02:00:31Z  Cron job failed: Error: Can't reach database server  │
│                       at cath-stg.postgres.database.azure.com:5432         │
│                       ...stack...                                          │
│                       → pod exits 1, CronJob records Failed                │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## 6. Page Specifications

No pages. This section specifies the code and infrastructure artefacts instead.

### 6.1 Prisma model (owned by #894 — confirm before implementing)

The assumed shape, which this spec's query targets:

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

**Only `deleted_at` matters to this job.** If #894 names the archive timestamp differently (`archivedAt`, `deletionDate`, …), change the `where` clause and the index name; nothing else in this spec moves.

### 6.2 Migration (only if #894 has not already created the table/index)

`apps/postgres/prisma/migrations/<timestamp>_add_deleted_account_deleted_at_index/migration.sql`:

```sql
CREATE INDEX IF NOT EXISTS "deleted_account_deleted_at_idx" ON "deleted_account" ("deleted_at");
```

Follows the existing convention (`20260203115946_add_user_search_indexes`, `20260422140711_fix_index_names`). Do **not** hand-write seed SQL — this table holds no reference data.

### 6.3 Business logic — `libs/account`

Per `CLAUDE.md` ("Don't put business logic in apps/"), the deletion logic lives in a lib and `apps/crons` only wires it up.

New file `libs/account/src/deleted-account/retention.ts`:

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

// JS month arithmetic rolls over (31 May minus 3 months → 3 March), which would
// purge rows that are not yet 3 months old. Clamp to the last day of the target month.
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

Conventions honoured: module ordering (const → exported function → helper → interfaces at the bottom); `lte` for the inclusive "3 months **or longer**" boundary; injectable `now` so tests need no fake timers; comment explains *why*, not *what*.

**A single `deleteMany` is deliberate.** `deleted_account` is only written by the annual verification process, so steady-state volume per run is low and the delete is a single indexed range scan. Batching would be speculative complexity (YAGNI) — but see §14 for the first-run backfill question.

**No transaction is needed.** Unlike `deleteUserById`, there are no dependent rows: `deleted_account` is a flat archive table with no inbound foreign keys. `deleteMany` is already atomic.

Package export in `libs/account/package.json`, matching the existing granular style:

```json
"./deleted-account/retention": {
  "production": "./dist/deleted-account/retention.js",
  "default": "./src/deleted-account/retention.ts"
}
```

Root `tsconfig.json` path:

```json
"@hmcts/account/deleted-account/retention": ["libs/account/src/deleted-account/retention"]
```

### 6.4 Cron script — `apps/crons`

New file `apps/crons/src/remove-expired-deleted-accounts.ts`:

```typescript
import { purgeExpiredDeletedAccounts } from "@hmcts/account/deleted-account/retention";

export const removeExpiredDeletedAccounts = async () => {
  const retentionMonths = Number(process.env.DELETED_ACCOUNT_RETENTION_MONTHS ?? 3);

  if (!Number.isInteger(retentionMonths) || retentionMonths < 1) {
    throw new Error(`DELETED_ACCOUNT_RETENTION_MONTHS must be a positive integer, received "${process.env.DELETED_ACCOUNT_RETENTION_MONTHS}"`);
  }

  console.log(`Starting remove-expired-deleted-accounts (retentionMonths=${retentionMonths})`);

  const { deletedCount, cutoff } = await purgeExpiredDeletedAccounts({ retentionMonths });

  console.log(`Purged ${deletedCount} deleted account records archived on or before ${cutoff.toISOString()}`);
};

export default removeExpiredDeletedAccounts;
```

The `default` export is mandatory — `index.ts` throws `The script "<name>" does not export a default function.` without it. File name must be kebab-case and must match `SCRIPT_NAME` exactly, since `index.ts` interpolates it into the dynamic import path.

`apps/crons/package.json` — add the two missing dependencies (the workspace currently has no DB access at all):

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

The Dockerfile needs no change: it already does `COPY --from=build /opt/app/libs ./libs` and `yarn workspaces focus @hmcts/crons --production`, so the new workspace deps are picked up. Verify the Prisma client is present in the runtime image — `libs/postgres-prisma` builds via `prisma generate --no-hints && tsc`, and `generated/` is a declared turbo build output, so `COPY /opt/app/libs` carries it. **This is the first cron to touch the database; confirm it in a built image rather than assuming.**

### 6.5 Infrastructure — schedule and script selection

`apps/crons/helm/values.yaml` currently pins `SCRIPT_NAME: 'example'` and the chart renders exactly one CronJob per release. The new job needs:

```yaml
job:
  environment:
    SCRIPT_NAME: 'remove-expired-deleted-accounts'
    DELETED_ACCOUNT_RETENTION_MONTHS: '3'
  schedule: "0 2 * * *"
  concurrencyPolicy: Forbid   # already set — keep
```

Daily at 02:00 UTC. Daily (not monthly) keeps each run's delete set small and bounds worst-case over-retention to 24 hours.

**Constraint to resolve with the infrastructure team:** one chart release renders one CronJob, so `example` and `remove-expired-deleted-accounts` cannot both run from a single release. Options:

1. **Recommended:** repoint the existing release's `SCRIPT_NAME` at `remove-expired-deleted-accounts`. `example.ts` is a placeholder that only `console.log`s, so losing it costs nothing. Smallest change; no chart work.
2. Add a second `cath-crons` dependency alias in `helm/cath-service/Chart.yaml` with its own `SCRIPT_NAME`/`schedule`. Needed only once a second real cron exists — defer.

`schedule` and `suspend` are also set in `helm/cath-service/values.template.yaml` (stg) and `values.preview.template.yaml` (preview), both currently `*/5 * * * *`. Update stg to `0 2 * * *`. **Leave preview at a short interval or `suspend: true`** — a 5-minutely purge against an ephemeral preview DB is noisy and the table is empty there anyway.

Per `apps/crons/helm/values.yaml`, the authoritative schedule is set in flux; raise the corresponding flux HelmRelease change with the infrastructure team. There is **no prod deployment** of this service yet (per `CLAUDE.md`), so stg and preview are the only targets.

### 6.6 Not doing: audit logging

The purge deliberately does **not** write to `audit_log`. That table records System Admin actions and requires a real actor (`userId`, `userEmail`, `userRole`, `userProvenance` all non-null); an automated job would need synthetic values, polluting the audit log viewer with rows that have no user behind them. Run history is captured by stdout → Application Insights and by Kubernetes CronJob status. Revisit only if Product asks for in-service visibility (§14).

---

## 7. Content

**No user-facing content is added by this ticket.** No pages, no templates, no locale files, no emails, no notifications. Nothing rendered to a citizen, verified user, or System Admin changes.

Operator-facing log strings (English only — logs are not translated, consistent with `apps/api/src/server.ts` and `libs/system-admin-pages/src/audit-log/logger.ts`):

| Situation | Message |
|---|---|
| Run start | `Starting remove-expired-deleted-accounts (retentionMonths=3)` |
| Run success | `Purged {count} deleted account records archived on or before {cutoffIso}` |
| Bad config | `DELETED_ACCOUNT_RETENTION_MONTHS must be a positive integer, received "{value}"` |
| Any failure | `Cron job failed: {error}` — emitted by the existing handler in `apps/crons/src/index.ts` |

### Welsh language

No Welsh translation work is required, because no user-facing string is introduced. This is the correct outcome, not an omission — the "don't skip Welsh translations" rule applies to user-facing text, and a CronJob has none.

If the optional System Admin visibility item in §14 is taken up (surfacing purge activity in the audit log viewer), one label would become user-facing and would need `en.ts`/`cy.ts` entries:

* English: `Deleted accounts purged`
* Welsh: [WELSH TRANSLATION REQUIRED: "Deleted accounts purged"]

Note for whoever picks that up: the audit log viewer currently renders `action` values straight from the database (`index.njk` applies only `replace("_", " ") | title`), so action names are **not** translated today. Making one translatable means changing that rendering, not just adding a locale key — a bigger change than it looks.

---

## 8. URL

None. No HTTP route, no Express handler, no API endpoint.

The job is addressed by `SCRIPT_NAME=remove-expired-deleted-accounts`, resolved by `apps/crons/src/index.ts` to the module path `./remove-expired-deleted-accounts.js`.

Local invocation for manual testing:

```bash
SCRIPT_NAME=remove-expired-deleted-accounts yarn workspace @hmcts/crons dev
```

---

## 9. Validation

No user input exists. The validated inputs are configuration and data.

| Input | Rule | On breach |
|---|---|---|
| `SCRIPT_NAME` | Required, non-empty | `index.ts` throws `SCRIPT_NAME environment variable is required` → exit 1 (existing behaviour) |
| `SCRIPT_NAME` | Must resolve to a module with a `default` function export | `index.ts` throws `The script "<name>" does not export a default function.` → exit 1 (existing behaviour) |
| `DELETED_ACCOUNT_RETENTION_MONTHS` | Optional; if present must be an integer ≥ 1. Defaults to `3` | Throw before any database work → exit 1. Fail closed: never fall back to a shorter retention, which would over-delete |
| Database connectivity | `DATABASE_URL` supplied from the `postgres-url` Key Vault secret (`omit: ["DATABASE_URL"]` in `getPropertiesVolumeSecrets` keeps the volume loader from clobbering it) | Prisma throws → exit 1 |
| `deletedAt` boundary | `lte cutoff` — inclusive, so "archived for 3 months **or longer**" is honoured exactly | n/a |
| Cutoff arithmetic | Must clamp to the last valid day of the target month, and must use UTC getters/setters throughout | Covered by unit tests in §13 |

Deliberate non-validation: an empty result set is **not** an error. Most days will legitimately purge 0 rows.

---

## 10. Error Messages

No user-facing error pages, error summaries, or inline field errors — there is no form and no request.

| Failure | Message | Exit code | Where it surfaces |
|---|---|---|---|
| `SCRIPT_NAME` unset | `Cron job failed: Error: SCRIPT_NAME environment variable is required` | 1 | App Insights, pod logs, CronJob status `Failed` |
| Script has no default export | `Cron job failed: Error: The script "remove-expired-deleted-accounts" does not export a default function.` | 1 | as above |
| Invalid retention config | `Cron job failed: Error: DELETED_ACCOUNT_RETENTION_MONTHS must be a positive integer, received "three"` | 1 | as above |
| Database unreachable | `Cron job failed: PrismaClientInitializationError: Can't reach database server at ...` | 1 | as above |
| `deleted_account` table missing (#894 not deployed) | `Cron job failed: PrismaClientKnownRequestError: The table 'public.deleted_account' does not exist in the current database.` | 1 | as above — this is the expected symptom of deploying this ticket ahead of #894 |

No retry logic. A failed run is picked up by the next scheduled run; the operation is idempotent, so a missed run causes at most 24 hours of extra retention. Alerting on repeated CronJob failure is an infrastructure concern, not part of this change.

---

## 11. Navigation

No redirects, links, or back-link behaviour — no user navigates anywhere.

Process control flow:

* Entry point: `node dist/index.js` (`CMD` in `apps/crons/Dockerfile`), triggered by the Kubernetes CronJob schedule
* Dispatch: `index.ts` → `import("./remove-expired-deleted-accounts.js")` → `default()`
* Exit 0 on completion (including 0 rows purged); exit 1 on any thrown error, via the existing `main().catch(...)` handler
* `concurrencyPolicy: Forbid` means a still-running invocation causes the next scheduled invocation to be skipped, not queued

---

## 12. Accessibility

WCAG 2.2 AA is not applicable: this change introduces no HTML, no interactive element, no colour, no focus order, and nothing announced to assistive technology.

The service's existing accessibility posture is unaffected — no template, stylesheet, or client-side script is touched.

The one accessibility-adjacent consideration is second-order: because the purge caps the reportable window at 3 months, the System Admin MI report from #894 must not present a partial figure as a complete one. A number that silently changes meaning depending on the requested date range is a comprehension failure for a screen-reader and sighted user alike. Whatever caveat #894 renders should be real page content, not a `title` attribute or colour cue.

---

## 13. Test Scenarios

### Unit — `libs/account/src/deleted-account/retention.test.ts`

Mock `@hmcts/postgres-prisma` with `prisma.deletedAccount.deleteMany`, per the pattern in `libs/account/src/repository/query.test.ts`. Follow Arrange-Act-Assert.

* Deletes with `where: { deletedAt: { lte: <cutoff> } }` and returns the count reported by Prisma
* Uses a cutoff exactly 3 months before `now` when no `retentionMonths` is supplied
* Uses a cutoff 6 months before `now` when `retentionMonths: 6` is supplied
* Clamps month-end arithmetic: `now` = 2026-05-31 with 3 months yields a 2026-02-28 cutoff, not 2026-03-03
* Clamps into a leap February: `now` = 2024-05-31 with 3 months yields 2024-02-29
* Crosses a year boundary correctly: `now` = 2026-02-15 with 3 months yields 2025-11-15
* Computes the cutoff in UTC regardless of the process timezone (assert with `TZ=Australia/Sydney` and `TZ=UTC` producing identical cutoffs — catches a `getMonth`/`getUTCMonth` slip)
* Returns `deletedCount: 0` without throwing when Prisma reports `{ count: 0 }`
* Propagates a Prisma rejection to the caller rather than swallowing it

### Unit — `apps/crons/src/remove-expired-deleted-accounts.test.ts`

Mock `@hmcts/account/deleted-account/retention`; spy on `console.log`. Mirrors `apps/crons/src/example.test.ts`.

* Exports a `default` function (guards the contract `index.ts` depends on)
* Calls `purgeExpiredDeletedAccounts` with `retentionMonths: 3` when the env var is unset
* Calls it with `retentionMonths: 6` when `DELETED_ACCOUNT_RETENTION_MONTHS=6`
* Throws before invoking the purge when the env var is `0`, `-1`, `1.5`, or non-numeric — assert the purge mock was **not** called, so a bad config can never shorten retention
* Logs the start line including the resolved retention period
* Logs the purged count and the cutoff ISO timestamp on success
* Restores `process.env` after each test (`example.test.ts`/`index.test.ts` pattern)

### Unit — `apps/crons/src/index.test.ts` (extend the existing file)

* Dispatches to the new script when `SCRIPT_NAME=remove-expired-deleted-accounts`, awaiting its default export

### Boundary verification against a real database (manual, once, on the PR)

Prisma mocks prove the `where` clause is built correctly; they do not prove Postgres agrees with the comparison at the boundary. Against a local DB, seed rows at `now - 3 months + 1 second`, exactly `now - 3 months`, and `now - 3 months - 1 second`; run the script; confirm the first survives and the other two are gone. Record the result in the PR — do not automate this as a new test harness.

### E2E — none

No Playwright test. There is no user journey to walk, and per `.claude/rules/e2e-testing.md` E2E tests exist to cover user journeys, not scheduled jobs. Adding one would mean building schedule-triggering scaffolding for zero UI coverage.

### Deployment verification

* Confirm the built `cath-crons` image can reach Postgres and that `libs/postgres-prisma/generated` is present in the runtime image — this is the first cron with a database dependency
* Confirm the rendered CronJob carries the expected `schedule`, `SCRIPT_NAME`, and `concurrencyPolicy: Forbid`
* Trigger a manual run on stg (`kubectl create job --from=cronjob/...`) and confirm exit 0 plus the expected log lines

---

## 14. Assumptions & Open Questions

### Blocking — needs an answer before implementation starts

1. **#894 must land first, and its schema is the contract.** This ticket purges a table that does not exist in the repo today. Confirm the table name (`deleted_account`), the archive timestamp column (`deleted_at`), and whether #894 adds `@@index([deleted_at])`. If this ticket is picked up first, it must create the model and migration, and #894's author must be told — otherwise two migrations will try to create the same table.

2. **The purge contradicts #894's reporting requirement.** #894 requires deletion counts "for the selected report duration". Once rows older than 3 months are gone, any report period reaching further back under-reports, silently. Product must choose one of:
   * (a) Accept it, and have #894 display an explicit caveat and refuse/warn on ranges older than 3 months;
   * (b) Retain a small aggregate table (`deleted_account_monthly_count`: year, month, provenance, count) that this job populates before purging — reporting keeps working indefinitely, personal data still goes at 3 months. Costs one extra table and a bit of logic, and is the option that actually satisfies both tickets;
   * (c) Extend retention to cover the maximum reportable range, which defeats the purpose of this ticket.

   **Recommendation: (b).** It is the only option where neither ticket's acceptance criteria are quietly broken. It is a small addition and should be specified in whichever ticket lands second.

### Assumptions made (stated so they can be corrected)

3. "Archived for 3 months" is measured from the `deleted_at`/archive timestamp on the `deleted_account` row, not from the original account's `created_date` or `last_signed_in_date`.
4. "3 months" means 3 calendar months (5 May → 5 February), not 90 days. Calendar months match how the requirement is phrased; if 90 days is wanted the helper simplifies considerably — say so and it changes.
5. "3 months or longer" is inclusive, so a row that is exactly 3 months old is purged (`lte`, not `lt`).
6. Deletion is a hard `DELETE`. A soft delete on an archive table would defeat the purpose, and the codebase moved away from soft deletes for exactly this kind of data (`20260702000000_remove_soft_delete_and_admin_audit_log`).
7. `deleted_account` has no inbound foreign keys, so no cascade or transaction is needed. **Verify against #894's final schema** — if it references `user` or `subscription`, the delete order logic from `deleteUserById` applies.
8. All timestamps are UTC. `deleted_at` is `timestamptz`-backed via Prisma `DateTime`, and the cron pod runs UTC.
9. There is no prod environment yet, so stg + preview are the only deployment targets. Prod scheduling is out of scope.

### Open questions

10. **First-run volume.** The first run after #894 backfills historical deletions could delete a large batch in one statement. If #894 backfills more than ~100k rows, add chunked deletion (`take: 1000` in a bounded loop) — otherwise a single indexed `deleteMany` is correct and simpler. Needs the expected row count from #894.
11. **Schedule.** 02:00 UTC daily is proposed. Confirm with the infrastructure team that this does not collide with the nightly publication or notification windows.
12. **The one-CronJob-per-release constraint** (§6.5). Recommendation is to repoint the existing release's `SCRIPT_NAME` and retire the `example` placeholder. Needs infrastructure sign-off, plus the matching flux HelmRelease change — which lives outside this repo, so it cannot merge as part of this PR.
13. **Does the annual verification process that populates `deleted_account` exist yet?** No code was found for it (`grep -i "annual\|reverif"` finds nothing outside OAuth token verification). If deletions are currently manual System Admin actions via `delete-user-confirm`, then #894 must hook into `deleteUserById` and this job's input may be empty for some time after release. That is fine functionally, but it means the acceptance criteria cannot be demonstrated end-to-end on stg without seeding rows by hand.
14. **Should a purge be visible to System Admins in-service?** §6.6 says no, on the grounds that `audit_log` is for user actions and needs a real actor. If Product wants visibility, the cleanest route is a separate system-run log rather than synthetic `audit_log` rows — and it brings the Welsh string in §7 into scope.
15. **Is 3 months the retention period the data-protection assessment actually requires?** The env var makes it changeable without a deploy, but the default should match a documented DPIA position rather than the ticket text alone.


### Comment by OgechiOkelu on 2026-08-05T12:06:03Z

@plan 

