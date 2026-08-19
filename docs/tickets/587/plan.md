# Plan: #587 System Admin delete court - complete journey

## 1. Technical Approach

The delete-court journey already exists end-to-end (search → confirm → success) under
`apps/web/src/pages/(system-admin)/`. This ticket is **enhancement work on that existing
journey**, not a new page or list-type view. The strategy is to close the gaps that make
the journey a dead end and to change the deletion semantics from soft to hard delete.

High-level strategy:

1. **Unblock the "has subscriptions" and "has publications" cases.** Today these raise a
   frontend error string with no path forward. We add links from the
   `delete-court-confirm` error state that let the System Admin delete the blocking
   subscriptions/publications for that location, then return to the confirm step.
2. **Reverse the validation order** in `validateLocationForDeletion` so the
   publication/artefact error is reported before the subscription error when both exist.
3. **Fix the "No" navigation** on `delete-court-confirm` to return to `/delete-court`
   instead of `/system-admin-dashboard`.
4. **Switch to hard delete.** Replace `softDeleteLocation` (which sets `deleted_at`) with a
   real `prisma.location.delete`, remove the `deleted_at` column via a Prisma migration,
   and strip every `deletedAt: null` read filter. Explicitly delete the location metadata
   record before the location (belt-and-braces; the Cascade FK already covers it — see Open
   Questions).
5. **Send System Admin notification emails** when a court, or a related
   publication/subscription, is deleted. Build on the existing GOV.UK Notify client in
   `libs/notifications`.

Architecture decisions:
- All business logic stays in `libs/` (service + repository layers). Controllers in
  `apps/web/src/pages/` remain thin: validate input, call services, render/redirect.
- Deletion of related data (subscriptions, artefacts) is orchestrated in the service layer,
  not in controllers, because subscriptions and artefacts are **not** FK-related to
  `Location` (they reference it by string `searchValue` / `locationId` string), so cascade
  does not apply and they must be deleted explicitly.
- Follow the notification pattern in CLAUDE.md: new template IDs in
  `template-config.ts`, send logic in `notification-service.ts`, built on
  `sendEmail(params)` with its existing retry/backoff.

## 2. Implementation Details

**TEMPLATE SOURCE: n/a** (this is enhancement work on the EXISTING delete-court journey,
not a new page or list-type view).

### Files to modify

Controllers / pages (`apps/web/src/pages/(system-admin)/`):
- `delete-court-confirm/index.ts`
  - POST "no" branch: redirect to `/delete-court` (not `/system-admin-dashboard`).
  - Error rendering: when validation returns ACTIVE_ARTEFACTS / ACTIVE_SUBSCRIPTIONS, pass
    a link/href to the relevant deletion action so the template can render a "delete
    publications" / "delete subscriptions" link.
- `delete-court-confirm/en.ts` and `delete-court-confirm/cy.ts`
  - Add link text content for "delete the publications for this court" and "delete the
    subscriptions for this court" (Welsh translation required). The active
    subscription/artefact error strings already live here (lines ~15-16) as frontend
    content — keep them, add the link copy.
- `delete-court/index.ts` — no functional change expected (target of the corrected "No"
  redirect); confirm it renders cleanly when returned to.

Service layer (`libs/system-admin-pages/src/delete-court/service.ts`):
- Reverse order in `validateLocationForDeletion`: (1) existence → LOCATION_NOT_FOUND;
  (2) `hasActiveArtefacts` → ACTIVE_ARTEFACTS; (3) `hasActiveSubscriptions` →
  ACTIVE_SUBSCRIPTIONS.
- `performLocationDeletion(locationId)`: explicitly delete location metadata, then hard
  delete the location; trigger the court-deleted notification email.

Location repository (`libs/location/src/repository/queries.ts`):
- Replace `softDeleteLocation` body with a `$transaction` that deletes
  locationSubJurisdiction + locationRegion rows then `prisma.location.delete({ where })`
  (hard delete). Rename to reflect hard delete (e.g. `deleteLocation`) and update callers.
- Remove all `deletedAt: null` filters from read queries (lines ~56, 93, 112, 130, 189).

Location metadata (`libs/location/src/repository/location-metadata-service.ts` /
`location-metadata-queries.ts`):
- Ensure an idempotent metadata delete is available for the delete-court flow
  (`deleteLocationMetadataRecord` hard-deletes; the service variant throws if absent —
  the flow must not fail when there is no metadata).

Subscription deletion (`libs/subscriptions/src/repository/queries.ts` + `service.ts`):
- Add a "delete all subscriptions for a location" function (none exists today). Use
  `findSubscriptionsByLocationId(locationId)` then a non-user-scoped bulk delete (the
  existing `deleteSubscriptionsByIds` is user-scoped — a System Admin action needs a
  variant that is not tied to a single subscriber). Send subscription-deleted notification.

Publication/artefact deletion (`libs/publication/src/repository/queries.ts`):
- Compose existing `getArtefactsByLocation(locationId)` → `deleteArtefacts(ids)` (bulk
  delete also removes blobs) into a "delete artefacts for location" service call. Send
  publication-deleted notification.

Notifications (`libs/notifications/src/`):
- `govnotify/template-config.ts` — add new template IDs: court deleted, publication(s)
  deleted, subscription(s) deleted (System Admin recipients).
- `notification/notification-service.ts` (~386) — add send functions built on
  `sendEmail(params)`.

### API endpoints

The links surfaced on the error state need a route to act on. Two options (see Open
Questions) — either reuse existing bulk-delete journeys or add dedicated page routes under
`apps/web/src/pages/(system-admin)/` (e.g. `delete-court-publications/`,
`delete-court-subscriptions/`) that delete the blocking data for the session's
`deleteCourt.locationId` and redirect back to `/delete-court-confirm`. No REST API endpoint
is required if page routes are used.

### DB schema changes

`libs/postgres-prisma/prisma/schema/location.prisma`:
- Remove `deletedAt DateTime? @map("deleted_at")` (line ~75) from the `Location` model.
- Generate a Prisma migration to `DROP COLUMN deleted_at` on the `location` table.
- Run `yarn db:generate` and `yarn db:migrate:dev`.
- `LocationMetadata` FK is `onDelete: Cascade`, so a hard delete of `Location`
  automatically removes its metadata row.

## 3. Error Handling & Edge Cases

- **Removing `deleted_at` affects read filters.** Every query filtering `deletedAt: null`
  (queries.ts ~56, 93, 112, 130, 189) must have that clause removed, or Prisma will error
  on a non-existent column after the migration. Grep the whole repo for `deletedAt` /
  `deleted_at` referencing Location to catch stray usages before running the migration.
- **Migration is destructive.** Any rows currently soft-deleted (`deleted_at` set but still
  present) will become "live" the moment the filter is removed and before the column drop.
  Confirm whether soft-deleted location rows exist in any environment (Open Questions).
- **Blob deletion.** `deleteArtefacts` also deletes blob storage; a blob-store failure must
  not leave the DB and blob store inconsistent — surface the error and abort the court
  deletion rather than half-completing.
- **Notification failures must not block deletion.** Email send is best-effort: log and
  continue on Notify failure (`sendEmail` already has retry/backoff). A failed email should
  not roll back a successful hard delete.
- **Metadata absent.** The delete-court flow must not throw when a location has no metadata
  (the service `deleteLocationMetadata` throws "Location metadata not found"); use the
  hard-delete record variant or guard for absence.
- **Concurrent modification.** A subscription/artefact could be created between the confirm
  render and the delete action; `validateLocationForDeletion` is re-run on the confirm
  "yes" POST, so the guard still fires — verify this remains true after the link flow.
- **Empty selection / missing session.** Existing guards (`session.deleteCourt`,
  `validateLocationForDeletion`, `validateRadioSelection`) are preserved.
- **Idempotent related-data deletion.** Deleting subscriptions/publications for a location
  that has none should be a no-op, not an error.

## 4. Acceptance Criteria Mapping

1. **Link to delete subscriptions when court has subscriptions** — error state on
   `delete-court-confirm` renders a link to a subscription-deletion action scoped to the
   session location; after deletion, user returns to confirm. Verified by unit test on the
   controller error branch (link present) + E2E journey.
2. **Link to delete publications when court has publications** — same mechanism for
   artefacts. Verified by unit test + E2E.
3. **Publication error before subscription error when both exist** — reorder checks in
   `validateLocationForDeletion` (artefacts before subscriptions). Verified by service unit
   test asserting ACTIVE_ARTEFACTS returned when both conditions are true.
4. **"No" goes to /delete-court** — change redirect target in `delete-court-confirm` POST
   "no" branch. Verified by controller unit test asserting
   `res.redirect("/delete-court")`.
5. **System Admin notification emails on court / publication / subscription deletion** —
   new template IDs + send functions invoked from the respective service deletions.
   Verified by unit tests asserting `sendEmail` called with the correct template/recipients.
6. **Hard delete + remove deleted_at** — `prisma.location.delete` replaces soft delete;
   Prisma migration drops `deleted_at`; all `deletedAt: null` filters removed. Verified by
   repository unit test (delete called, not update) + migration applied + build/tests green.
7. **Delete location metadata before location** — explicit metadata delete in
   `performLocationDeletion` before the location hard delete (Cascade FK also covers it).
   Verified by unit test asserting metadata delete runs and no orphan remains.

## 5. Resolved Decisions (legacy pip research + user confirmation)

Researched against the legacy stack (pip-frontend, pip-data-management,
pip-publication-services — real logic in `LocationService.deleteLocation()`) and confirmed
with the user:

- **Metadata: explicit delete.** The `LocationMetadata` FK is `onDelete: Cascade` so a hard
  delete already cascades, but we explicitly delete the metadata record first (via
  `deleteLocationMetadataRecord`, guarded so absence is a no-op) for clarity/auditability.
  This intentionally diverges from legacy, which *blocks* deletion on existing metadata.
- **Deletion links: new dedicated confirmation pages** (matches legacy's 3-journey
  structure). Add `delete-court-publications` and `delete-court-subscriptions` pages, linked
  from the blocked state on `delete-court-confirm`, each confirming then deleting all data
  for the session location and returning to `/delete-court`.
- **Notification recipients: ALL system admins** (matches legacy
  `SystemAdminNotificationService`, which emails every `SYSTEM_ADMIN` account). Add
  `findSystemAdminEmails()` in `libs/account` and loop `sendEmail` per admin.
- **When to email: success only.** Blocked states already surface as on-screen errors, so we
  do not send the "ATTEMPTED" emails legacy sends on blocked deletions.
- **Non-user-scoped subscription delete: confirmed.** A System Admin deletes ALL
  subscriptions for a location regardless of owner (legacy exposes
  `DELETE /subscription/location/{id}`). Add `deleteSubscriptionsByLocationId(locationId)` —
  not the user-scoped `deleteSubscriptionsByIds`. Publications mirror this with
  `deleteArtefactsByLocationId` (legacy `DELETE /publication/{id}/deleteArtefacts`).

### Remaining external dependency

- **GOV.UK Notify template ID.** Need a real template ID for the system-admin
  notification email (env var `GOVUK_NOTIFY_TEMPLATE_ID_SYSTEM_ADMIN`).
  Code + env var can land with a placeholder; the live value comes from the team.

### Pre-migration check (not a blocker, but verify)

- **Is removing `deleted_at` safe?** Confirm no environment has existing soft-deleted
  location rows before dropping the column (irreversible). Any such rows resurface as live
  data the moment the `deletedAt: null` filters are removed.
