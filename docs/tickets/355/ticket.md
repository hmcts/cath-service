# #355: CaTH Cron Trigger - Manage Artefacts, Refresh Views and Subscription Triggers

**State:** OPEN
**Assignees:** None
**Author:** junaidiqbalmoj
**Labels:** None
**Created:** 2026-02-12T14:21:09Z
**Updated:** 2026-02-20T13:34:57Z

## Description

I want the application to manage artefacts and refresh materialised views based on scheduled triggers,
so that the data remains up-to-date and artefacts are processed efficiently.

 **Acceptance Criteria:**

1. NoMatch Artefacts Retrieval:
The system should retrieve all artefacts where the location_id contains the string "NoMatch".
This query should be executed using a scheduled trigger.

2. Refresh Materialised Views:
The system should refresh the sdp_mat_view_artefact materialized view to ensure artefact data is up-to-date.
The system should refresh the sdp_mat_view_location materialized view to ensure location data is up-to-date.
Both refresh operations should be executed in a transactional and modifying context.

3. Subscriptions Artefacts Retrieval:
The system should retrieve artefacts where:
- The display_from date matches the current date.
- The display_to timestamp is either in the future or null.
This query should be executed using a scheduled trigger.

4. Error Handling:
The system should log and handle any errors encountered during the execution of these queries or refresh operations.

## Comments

### Comment by OgechiOkelu on 2026-02-20T13:30:59Z
@SPEC new-feature.md

### Comment by hmctsclaudecode on 2026-02-20T13:34:34Z

## 1. User Story

**As a** system administrator
**I want** the application to automatically retrieve NoMatch artefacts, refresh materialised views, and retrieve subscription artefacts on scheduled triggers
**So that** data remains up-to-date and artefacts are processed efficiently without manual intervention

## 2. Background

The CaTH service ingests court hearing publications (artefacts) via blob ingestion. When an artefact's `location_id` cannot be matched to a known court location, it is stored with a `location_id` containing the string "NoMatch". The service also maintains materialised views (`sdp_mat_view_artefact` and `sdp_mat_view_location`) that need periodic refreshing to remain accurate. Additionally, subscribed users need to receive notifications for artefacts becoming active on a given day.

The cron runner in `apps/crons/src/index.ts` already provides infrastructure for executing scripts on schedule via the `SCRIPT_NAME` environment variable. Three new cron scripts are required to fulfil these scheduled processing needs. New query functions are needed in `libs/publication/src/repository/queries.ts`.

## 3. Acceptance Criteria

* **Scenario:** NoMatch artefacts are retrieved on schedule
    * **Given** artefacts exist in the database with a `location_id` containing the string "NoMatch"
    * **When** the `manage-artefacts` cron script executes
    * **Then** all artefacts where `location_id` contains "NoMatch" are retrieved and logged

* **Scenario:** Materialised views are refreshed on schedule
    * **Given** the `sdp_mat_view_artefact` and `sdp_mat_view_location` materialised views exist in the database
    * **When** the `refresh-views` cron script executes
    * **Then** both views are refreshed via raw SQL `REFRESH MATERIALIZED VIEW` statements and completion is logged

* **Scenario:** Subscription artefacts are retrieved on schedule
    * **Given** artefacts exist with `display_from` matching the current date and `display_to` in the future or null
    * **When** the `subscription-artefacts` cron script executes
    * **Then** all matching artefacts are retrieved and logged

* **Scenario:** Errors are handled gracefully
    * **Given** a database error occurs during any cron script execution
    * **When** the error is thrown
    * **Then** the error is caught, logged with context, and re-thrown so the cron runner exits with code 1

## 4. User Journey Flow

This feature has no user-facing journey. These are server-side scheduled operations triggered by Kubernetes CronJobs:

```
Kubernetes Scheduler
       |
       v
CronJob fires (SCRIPT_NAME env var set)
       |
       v
apps/crons/src/index.ts
  - configurePropertiesVolume()
  - dynamic import of script by SCRIPT_NAME
       |
       +---> manage-artefacts.ts
       |       - getNoMatchArtefacts()
       |       - log results / count
       |
       +---> refresh-views.ts
       |       - refreshMaterialisedViews()
       |       - log completion
       |
       +---> subscription-artefacts.ts
               - getSubscriptionArtefacts()
               - log results / count
```

## 5. Low Fidelity Wireframe

Not applicable. This feature has no user interface. All interactions are server-side scheduled processes.

## 6. Page Specifications

Not applicable. This feature has no pages.

Implementation details:

### New cron scripts in `apps/crons/src/`

**`manage-artefacts.ts`**
- Calls `getNoMatchArtefacts()` from `@hmcts/publication`
- Logs the count and artefact IDs retrieved
- Exports an async default function

**`refresh-views.ts`**
- Calls `refreshMaterialisedViews()` from `@hmcts/publication`
- Logs confirmation after each view refresh
- Exports an async default function

**`subscription-artefacts.ts`**
- Calls `getSubscriptionArtefacts()` from `@hmcts/publication`
- Logs the count and artefact IDs retrieved
- Exports an async default function

### New query functions in `libs/publication/src/repository/queries.ts`

**`getNoMatchArtefacts()`**
- Uses `prisma.artefact.findMany` with `where: { locationId: { contains: "NoMatch" } }`
- Returns `Artefact[]`

**`refreshMaterialisedViews()`**
- Uses `prisma.$executeRaw` to execute `REFRESH MATERIALIZED VIEW sdp_mat_view_artefact`
- Uses `prisma.$executeRaw` to execute `REFRESH MATERIALIZED VIEW sdp_mat_view_location`
- Returns `void`
- Note: `REFRESH MATERIALIZED VIEW` cannot run inside a Prisma transaction; two sequential `$executeRaw` calls are used

**`getSubscriptionArtefacts()`**
- Uses `prisma.artefact.findMany` with:
  - `displayFrom`: date range covering the start and end of the current day (midnight to midnight)
  - `displayTo`: `{ gt: new Date() }` OR `null` using Prisma `OR` condition
- Returns `Artefact[]`

## 7. Content

Not applicable. This feature has no user-facing content.

Log messages (server-side only):

| Event | Log message |
|-------|-------------|
| NoMatch artefacts retrieved | `"NoMatch artefacts retrieved: {count}"` |
| No NoMatch artefacts found | `"No NoMatch artefacts found"` |
| View refresh started | `"Refreshing materialised view: {viewName}"` |
| View refresh complete | `"Materialised view refreshed: {viewName}"` |
| Subscription artefacts retrieved | `"Subscription artefacts retrieved: {count}"` |
| No subscription artefacts found | `"No subscription artefacts found for today"` |
| Error occurred | `"Cron job failed: {errorMessage}"` with full error object |

## 8. URL

Not applicable. These are scheduled backend processes with no HTTP endpoints.

Helm configuration references (set per Flux environment):

| Script | `SCRIPT_NAME` env var value |
|--------|------------------------------|
| NoMatch artefact retrieval | `manage-artefacts` |
| Materialised view refresh | `refresh-views` |
| Subscription artefact retrieval | `subscription-artefacts` |

Suggested cron schedules (to be configured in Flux, not in `values.yaml`):

| Script | Suggested schedule |
|--------|-------------------|
| `manage-artefacts` | Hourly or as determined by SDP ingestion cadence |
| `refresh-views` | After each expected ingestion window |
| `subscription-artefacts` | Daily at midnight or early morning |

## 9. Validation

No user input validation required. All inputs are derived from the database state at execution time.

Query constraints:

| Query | Filter constraint |
|-------|-------------------|
| `getNoMatchArtefacts` | `locationId` contains string `"NoMatch"` (case-sensitive per Prisma default) |
| `getSubscriptionArtefacts` | `displayFrom` >= start of current day AND `displayFrom` < start of next day AND (`displayTo` > current time OR `displayTo` is null) |
| `refreshMaterialisedViews` | Materialised views must exist in the database; failure if views do not exist |

## 10. Error Messages

No user-facing error messages. Server-side error handling only.

| Scenario | Handling |
|----------|----------|
| Database connection failure | Error logged with `console.error`, re-thrown to cron runner which exits with code 1 |
| `REFRESH MATERIALIZED VIEW` fails (view does not exist) | Error logged with view name context, re-thrown |
| `SCRIPT_NAME` not set | Existing behaviour in `index.ts` — throws `"SCRIPT_NAME environment variable is required"` |
| No artefacts match query | Not an error — log count of 0 and exit successfully |

## 11. Navigation

Not applicable. No page navigation is involved.

## 12. Accessibility

Not applicable. This feature has no user interface.

## 13. Test Scenarios

Unit tests for new query functions in `libs/publication/src/repository/queries.test.ts`:

* `getNoMatchArtefacts` returns all artefacts where `locationId` contains "NoMatch"
* `getNoMatchArtefacts` returns an empty array when no artefacts match
* `refreshMaterialisedViews` calls `$executeRaw` twice — once for `sdp_mat_view_artefact` and once for `sdp_mat_view_location`
* `refreshMaterialisedViews` propagates errors from `$executeRaw`
* `getSubscriptionArtefacts` returns artefacts with `displayFrom` matching today and `displayTo` in the future
* `getSubscriptionArtefacts` returns artefacts with `displayFrom` matching today and `displayTo` null
* `getSubscriptionArtefacts` returns an empty array when no artefacts match

Unit tests for new cron scripts in `apps/crons/src/`:

* `manage-artefacts` logs the count of retrieved NoMatch artefacts when results are found
* `manage-artefacts` logs that no artefacts were found when the result set is empty
* `manage-artefacts` re-throws errors from `getNoMatchArtefacts`
* `refresh-views` calls `refreshMaterialisedViews` and logs completion
* `refresh-views` re-throws errors from `refreshMaterialisedViews`
* `subscription-artefacts` logs the count of retrieved subscription artefacts when results are found
* `subscription-artefacts` logs that no artefacts were found when the result set is empty
* `subscription-artefacts` re-throws errors from `getSubscriptionArtefacts`

## 14. Assumptions & Open Questions

* The materialised views `sdp_mat_view_artefact` and `sdp_mat_view_location` already exist in the database — this spec does not cover their creation. Confirm with the database team.
* `REFRESH MATERIALIZED VIEW` cannot run inside a PostgreSQL transaction. The spec uses sequential `$executeRaw` calls rather than `$transaction`. If atomicity is required, consider `REFRESH MATERIALIZED VIEW CONCURRENTLY` which allows other reads during refresh but also cannot run in a transaction.
* "location_id contains the string 'NoMatch'" — the existing `artefact` table has a `noMatch` boolean field. Clarify whether the filter should use `{ noMatch: true }` (boolean) or `{ locationId: { contains: "NoMatch" } }` (string). This spec follows the acceptance criteria literally and uses the string-contains approach.
* The Prisma `contains` filter is case-sensitive by default in PostgreSQL. If the string can appear as "nomatch" or "NOMATCH", confirm the expected case sensitivity.
* The `displayFrom` date comparison for subscription artefacts — confirm whether this means the date portion only (ignoring time) or an exact datetime match. This spec uses a date-range approach (start-of-day to end-of-day) to capture any time within the current date.
* Separate Kubernetes CronJob configurations will be needed in Flux for each of the three scripts. This spec covers only the application code; Flux/Helm configuration is out of scope but must be coordinated.
* The three cron scripts are independent operations. If they should run in a specific order or as part of a single job, raise this with the team before implementation.

### Comment by OgechiOkelu on 2026-02-20T13:34:57Z
@plan
