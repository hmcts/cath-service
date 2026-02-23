# Technical Plan: CaTH Cron Trigger - Infrastructure Deployment (#356)

## 1. Technical Approach

### High-Level Strategy

The `apps/crons` runner already exists and is production-ready. It resolves scripts dynamically via `SCRIPT_NAME`, calls the exported `default` function, and exits with code 0 or 1. No changes to the runner or the existing `example.ts` are required.

The work splits into two parallel concerns:

1. **Script files** — 7 TypeScript files in `apps/crons/src/`, each performing a single maintenance task against the database via `@hmcts/postgres` Prisma client.
2. **Helm values files** — 7 per-job YAML overrides in `apps/crons/helm/`, each specifying `SCRIPT_NAME` and `schedule` for a distinct Kubernetes CronJob. The base `values.yaml` is unchanged and provides all shared configuration.

### Architecture Decisions

- **One values file per CronJob**: Each job is a separate Flux HelmRelease pointing at the same chart with per-job overrides. The base `values.yaml` holds shared config (image, key vaults, `concurrencyPolicy: Forbid`). Per-job files override only `job.environment.SCRIPT_NAME` and `job.schedule`.
- **Scripts are stateless and self-contained**: All configuration comes from environment variables with sensible defaults. No shared state between script invocations.
- **Errors propagate to the runner**: Scripts do not catch errors. The runner in `index.ts` catches unhandled errors, logs them, and exits with code 1, which makes the Kubernetes Job visible as failed.
- **Retention thresholds via environment variables**: `AUDIT_RETENTION_DAYS` and `INACTIVE_USER_DAYS` default to 90 days. This allows Flux/Helm to override without a code change.
- **`refresh-views` is scaffolded only**: No materialised views are defined in the current Prisma schema. The script logs a placeholder message and documents the `prisma.$executeRawUnsafe` pattern ready for future population.

### Key Technical Considerations

- All scripts import `prisma` from `@hmcts/postgres`. The Prisma client is already configured and available in the crons container via `DATABASE_URL`.
- `deleteMany` is used in preference to raw SQL for type-safety and query logging. The exception is `refresh-views`, which requires raw SQL (`REFRESH MATERIALIZED VIEW`).
- The `expired-artefacts` script deletes `artefact` records. Related `ingestion_log` records have `onDelete: SetNull` on the `artefact` foreign key in the schema, so they are not cascade-deleted — their `artefactId` is nulled. This is the current schema behaviour; the open question about archiving is noted below.
- The `subscriptions` script: the `subscription` table has `onDelete: Cascade` from `user`, so deleting a user already removes their subscriptions. The script queries and logs the count of subscriptions whose `userId` does not exist in the `user` table as an explicit audit step, then deletes them.
- Cron expressions are UTC per the ticket assumption.

---

## 2. Implementation Details

### 2.1 Script Files (`apps/crons/src/`)

#### `clear-audit.ts`

- Reads `AUDIT_RETENTION_DAYS` from `process.env`, defaulting to `90`.
- Calculates a cutoff `DateTime` as `now() - retentionDays`.
- Calls `prisma.notificationAuditLog.deleteMany({ where: { createdAt: { lt: cutoff } } })`.
- Logs the count of deleted records.

```
clear-audit.ts
├── const AUDIT_RETENTION_DAYS = Number(process.env.AUDIT_RETENTION_DAYS ?? 90)
├── export const clearAudit = async (): Promise<void>
│   ├── log start
│   ├── compute cutoff date
│   ├── prisma.notificationAuditLog.deleteMany(...)
│   ├── log deleted count
│   └── log completion
└── export default clearAudit
```

#### `inactive-verification.ts`

- Reads `INACTIVE_USER_DAYS` from `process.env`, defaulting to `90`.
- Calculates a cutoff `DateTime` as `now() - inactiveDays`.
- Queries `user` records where `lastSignedInDate` is `null` OR `lastSignedInDate < cutoff`.
- Logs the count of matching users. Current scaffold logs rather than deletes — the actual action (delete, flag, notify) is an open question. The implementation uses `findMany` and logs count; a TODO comment marks where the action should be inserted.

```
inactive-verification.ts
├── const INACTIVE_USER_DAYS = Number(process.env.INACTIVE_USER_DAYS ?? 90)
├── export const inactiveVerification = async (): Promise<void>
│   ├── log start
│   ├── compute cutoff date
│   ├── prisma.user.findMany({ where: { OR: [{ lastSignedInDate: null }, { lastSignedInDate: { lt: cutoff } }] } })
│   ├── log count
│   └── log completion
└── export default inactiveVerification
```

#### `media-reporting.ts`

- Calls `prisma.mediaApplication.groupBy({ by: ['status'], _count: true })`.
- Logs a summary of counts per status (e.g., `PENDING: 12, APPROVED: 5, REJECTED: 3`).
- Output format is scaffolded as `console.log` pending product team decision (see open questions).

```
media-reporting.ts
├── export const mediaReporting = async (): Promise<void>
│   ├── log start
│   ├── prisma.mediaApplication.groupBy(...)
│   ├── log counts per status
│   └── log completion
└── export default mediaReporting
```

#### `expired-artefacts.ts`

- Calls `prisma.artefact.deleteMany({ where: { displayTo: { lt: new Date() } } })`.
- Logs the count of deleted records.
- Related `ingestion_log` rows have their `artefactId` set to `null` by the schema's `onDelete: SetNull` — no additional handling needed.

```
expired-artefacts.ts
├── export const expiredArtefacts = async (): Promise<void>
│   ├── log start
│   ├── prisma.artefact.deleteMany({ where: { displayTo: { lt: now } } })
│   ├── log deleted count
│   └── log completion
└── export default expiredArtefacts
```

#### `no-match-artefacts.ts`

- Calls `prisma.artefact.deleteMany({ where: { noMatch: true } })`.
- Logs the count of deleted records.

```
no-match-artefacts.ts
├── export const noMatchArtefacts = async (): Promise<void>
│   ├── log start
│   ├── prisma.artefact.deleteMany({ where: { noMatch: true } })
│   ├── log deleted count
│   └── log completion
└── export default noMatchArtefacts
```

#### `subscriptions.ts`

- Uses a raw query or subquery to find subscription records whose `userId` does not exist in the `user` table (orphaned subscriptions that cascade deletion may have missed).
- Calls `prisma.subscription.deleteMany({ where: { user: { is: null } } })` — Prisma supports filtering on a missing relation.
- Logs count before and after.

```
subscriptions.ts
├── export const subscriptions = async (): Promise<void>
│   ├── log start
│   ├── prisma.subscription.count({ where: { user: { is: null } } })
│   ├── log orphaned count
│   ├── prisma.subscription.deleteMany({ where: { user: { is: null } } })
│   ├── log deleted count
│   └── log completion
└── export default subscriptions
```

#### `refresh-views.ts`

- No materialised views are defined in the current schema. The script is scaffolded with a `TODO` comment listing the views to refresh once they are created.
- Uses `prisma.$executeRawUnsafe('REFRESH MATERIALIZED VIEW CONCURRENTLY <view_name>')` pattern inside a placeholder array.
- Logs a message indicating no views are currently configured.

```
refresh-views.ts
├── // TODO: populate viewNames once materialised views are defined in schema
├── const VIEW_NAMES: string[] = []
├── export const refreshViews = async (): Promise<void>
│   ├── log start
│   ├── if VIEW_NAMES.length === 0: log "No materialised views configured, skipping"
│   ├── else: for each view: prisma.$executeRawUnsafe(`REFRESH MATERIALIZED VIEW CONCURRENTLY ${viewName}`)
│   └── log completion
└── export default refreshViews
```

### 2.2 Helm Values Files (`apps/crons/helm/`)

Each file overrides only `job.environment.SCRIPT_NAME` and `job.schedule`. All other values (image, key vaults, `concurrencyPolicy`, `aadIdentityName`, etc.) are inherited from `values.yaml`.

| File | SCRIPT_NAME | Schedule |
|------|-------------|----------|
| `values-clear-audit.yaml` | `clear-audit` | `0 1 * * *` |
| `values-inactive-verification.yaml` | `inactive-verification` | `1 8 * * *` |
| `values-media-reporting.yaml` | `media-reporting` | `0 0 * * 1` |
| `values-expired-artefacts.yaml` | `expired-artefacts` | `0 1 * * *` |
| `values-no-match-artefacts.yaml` | `no-match-artefacts` | `0 1 * * *` |
| `values-subscriptions.yaml` | `subscriptions` | `0 1 * * *` |
| `values-refresh-views.yaml` | `refresh-views` | `0 2 * * *` |

Example structure for each file:

```yaml
job:
  environment:
    SCRIPT_NAME: '<script-name>'
  schedule: "<cron-expression>"
```

The `schedule` field in `values.yaml` is documented as a placeholder; Flux overrides it at deploy time. These per-job files make the intended schedule explicit in the repository for documentation purposes, consistent with the per-job override pattern.

### 2.3 Unit Tests

Each script has a co-located test file `<script-name>.test.ts`. Tests follow the Arrange-Act-Assert pattern established in `example.test.ts`.

**Per-script test structure:**

- Mock `@hmcts/postgres` to provide a typed mock `prisma` client.
- `beforeEach`: clear all mocks, configure mock return values.
- Test: script is an async function.
- Test: logs a start message.
- Test: calls the correct Prisma method with the correct arguments.
- Test: logs the result count (where applicable).
- Test: resolves to `undefined` on success.
- Test: propagates errors from Prisma (does not swallow them).

For `clear-audit` and `inactive-verification`, additionally test that the environment variable override changes the cutoff date calculation.

For `refresh-views`, test that when `VIEW_NAMES` is empty the script logs the skip message and does not call `$executeRawUnsafe`.

---

## 3. Open Questions / Clarifications Needed

1. **`clear-audit` retention period**: The 90-day default is an assumption. Confirm whether a different retention window is required or whether 90 days should be the permanent default.

2. **`inactive-verification` action**: The script currently identifies inactive users (null or stale `lastSignedInDate`) but does not act on them. Clarify whether the action is: delete the user record, set a flag field, send a notification, or something else. A `role` or `status` field may need to be added to the `user` table.

3. **`media-reporting` output format**: The script currently logs counts to stdout (captured by Application Insights). Clarify whether the output should be: a database record insert, a file export to blob storage, an email report via GOV Notify, or stdout only.

4. **`expired-artefacts` cascade behaviour**: The current schema sets `ingestion_log.artefactId` to `null` on artefact deletion (`onDelete: SetNull`). Confirm whether this is the intended behaviour or whether expired artefacts (and their logs) should be archived to a separate table before deletion.

5. **`subscriptions` scope**: Cascade deletion from `user` should already remove orphaned subscriptions. Confirm whether this script is intended as a safety net for orphaned records only, or whether it should also handle subscriptions for users in a specific inactive state.

6. **`refresh-views` materialised views**: No materialised views exist in the current Prisma schema. List the view names that need to be refreshed so the script can be populated. Confirm whether `REFRESH MATERIALIZED VIEW CONCURRENTLY` is acceptable (requires the view to have a unique index).

7. **UTC vs UK local time**: The ticket assumes UTC. Confirm whether any of the 7 jobs should account for BST/GMT transitions (i.e., should `inactive-verification` at "8:01 AM" mean 8:01 AM UK time, which shifts between `1 7 * * *` and `1 8 * * *` seasonally).
