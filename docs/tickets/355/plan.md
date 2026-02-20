# Technical Plan: Issue #355 - CaTH Cron Trigger - Manage Artefacts, Refresh Views and Subscription Triggers

## 1. Technical Approach

Three cron scripts are added to `apps/crons/src/` and three query functions are added to `libs/publication/src/repository/queries.ts`. The cron runner in `apps/crons/src/index.ts` dynamically imports scripts by name from `SCRIPT_NAME`, so no changes to `index.ts` are needed — scripts are auto-discovered at runtime.

Each cron script:
- Imports its query function from `@hmcts/publication`
- Calls the query, logs the result, and re-throws any error
- Exports an async default function (required by the runner)

Each query function:
- Lives in `libs/publication/src/repository/queries.ts` alongside existing queries
- Is exported from `libs/publication/src/index.ts`
- Uses the existing `prisma` client from `@hmcts/postgres`

## 2. Implementation Details

### New files

**`apps/crons/src/manage-artefacts.ts`**

Imports `getNoMatchArtefacts` from `@hmcts/publication`. Calls it, logs count and artefact IDs if results exist, logs "No NoMatch artefacts found" if empty. On error, logs with context and re-throws.

**`apps/crons/src/manage-artefacts.test.ts`**

Unit tests for the default export. Mocks `@hmcts/publication`. Tests: results found, empty result, error re-thrown.

**`apps/crons/src/refresh-views.ts`**

Imports `refreshMaterialisedViews` from `@hmcts/publication`. Logs before and after each view refresh (the log messages are emitted from within the query function itself, since the function knows which views it is refreshing). On error, logs with context and re-throws.

**`apps/crons/src/refresh-views.test.ts`**

Unit tests. Mocks `@hmcts/publication`. Tests: successful refresh logged, error re-thrown.

**`apps/crons/src/subscription-artefacts.ts`**

Imports `getSubscriptionArtefacts` from `@hmcts/publication`. Calls it, logs count and artefact IDs if results exist, logs "No subscription artefacts found for today" if empty. On error, logs with context and re-throws.

**`apps/crons/src/subscription-artefacts.test.ts`**

Unit tests. Mocks `@hmcts/publication`. Tests: results found, empty result, error re-thrown.

### Changes to existing files

**`libs/publication/src/repository/queries.ts`** — add three functions:

`getNoMatchArtefacts()`: uses `prisma.artefact.findMany({ where: { noMatch: true } })`. Returns `Artefact[]`. See open question below on `noMatch` boolean vs string-contains.

`refreshMaterialisedViews()`: calls `prisma.$executeRaw` twice in sequence — once for `sdp_mat_view_artefact` and once for `sdp_mat_view_location`. Logs before and after each call. Returns `void`. No transaction wrapper (`REFRESH MATERIALIZED VIEW` cannot run inside a PostgreSQL transaction).

`getSubscriptionArtefacts()`: uses `prisma.artefact.findMany` with a `where` clause filtering `displayFrom` to the current calendar day (start-of-day to start-of-next-day) and `displayTo` greater than the current time. The Prisma schema defines `displayTo` as non-nullable `DateTime`, so no null branch is needed unless the schema is updated. Returns `Artefact[]`.

**`libs/publication/src/index.ts`** — add the three new functions to the existing re-export block from `./repository/queries.js`.

**`libs/publication/src/repository/queries.test.ts`** — add the `$executeRaw` mock to the existing `vi.mock("@hmcts/postgres", ...)` call, and add new `describe` blocks for the three new functions.

### Prisma mock update

The existing `vi.mock("@hmcts/postgres", ...)` in `queries.test.ts` currently mocks `$queryRaw` but not `$executeRaw`. The mock object must be extended with `$executeRaw: vi.fn()` to support testing `refreshMaterialisedViews`.

## 3. Error Handling and Edge Cases

**Error pattern**: each cron script wraps its query call in a `try/catch`. On error, `console.error("Cron job failed:", error)` is called and the error is re-thrown. The runner's `main().catch(...)` in `index.ts` catches the re-thrown error and exits with code 1.

**Empty result sets**: returning an empty array from `getNoMatchArtefacts` or `getSubscriptionArtefacts` is not an error. The cron script logs a zero-count or "no results" message and exits successfully.

**`REFRESH MATERIALIZED VIEW` and transactions**: Prisma's `$transaction` cannot wrap `REFRESH MATERIALIZED VIEW` because PostgreSQL does not support that statement inside a transaction block. Two sequential `$executeRaw` calls are used. If the first succeeds and the second fails, the first view will have been refreshed already — this is acceptable given the spec does not require atomicity between the two refreshes.

**`displayTo` nullability**: the Prisma schema currently defines `displayTo` as non-nullable. The spec mentions `displayTo` being null as a valid case. If the query should handle null `displayTo`, a schema migration adding `?` to the field is required before implementing the OR-null branch. The implementation should follow the actual schema; see open questions.

## 4. Acceptance Criteria Mapping

| Acceptance criterion | Implementation |
|---|---|
| Retrieve artefacts where `location_id` contains "NoMatch" on schedule | `manage-artefacts.ts` calls `getNoMatchArtefacts()` which filters by `noMatch: true` (see open question on approach) |
| Refresh `sdp_mat_view_artefact` and `sdp_mat_view_location` on schedule | `refresh-views.ts` calls `refreshMaterialisedViews()` which issues two sequential `$executeRaw` statements |
| Retrieve artefacts where `display_from` matches current date and `display_to` is future or null | `subscription-artefacts.ts` calls `getSubscriptionArtefacts()` which filters by date range and `displayTo > now` |
| Log and handle errors gracefully | Each script catches, logs with `console.error`, and re-throws; runner exits with code 1 |

## 5. Open Questions (Clarifications Needed)

**NoMatch filter approach**: The acceptance criteria say `location_id contains "NoMatch"` (string-contains). The actual Prisma schema has `noMatch: Boolean @map("no_match")` — a dedicated boolean column. The existing `createArtefact` function already writes this field. Using `{ noMatch: true }` is the correct Prisma approach and is consistent with the data model. Using `{ locationId: { contains: "NoMatch" } }` would be fragile and would miss artefacts whose location ID happens not to contain that string literally. **Confirm with the team whether `{ noMatch: true }` is the correct filter**, as the spec text describes the string-contains approach but the schema has a boolean field for exactly this purpose.

**`displayTo` nullability for subscription artefacts**: the spec states `displayTo` can be null (meaning "no expiry"). The current Prisma schema defines `displayTo` as non-nullable `DateTime`. If null `displayTo` records need to be included, a database migration making the column nullable is required before the OR-null filter can be implemented. **Confirm whether `displayTo` should be made nullable, and whether a migration is in scope for this issue.**

**`displayFrom` comparison granularity**: the spec says `displayFrom` matches "the current date". This plan uses a start-of-day to start-of-next-day range (UTC) to capture any time within the current date regardless of the time component stored in `displayFrom`. **Confirm that UTC day boundaries are correct**, or whether a local timezone should be used.
