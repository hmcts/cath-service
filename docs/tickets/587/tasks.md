# Tasks: #587 System Admin delete court - complete journey

Decisions resolved (see plan.md §5): all system admins notified, success-only email,
dedicated confirmation pages, non-user-scoped by-location deletes, explicit metadata delete.

## Implementation Tasks

### A. Validation order + "No" redirect
- [x] Reverse validation order in `libs/system-admin-pages/src/delete-court/service.ts` `validateLocationForDeletion` so ACTIVE_ARTEFACTS is checked before ACTIVE_SUBSCRIPTIONS.
- [x] Fix "No" redirect in `apps/web/src/pages/(system-admin)/delete-court-confirm/index.ts` to `/delete-court`.

### B. Hard delete + drop deleted_at
- [x] Remove `deletedAt` field from the `Location` model in the Prisma schema (`libs/postgres-prisma/prisma/schema/` — location model).
- [x] Remove all `deletedAt: null` filters from `libs/location/src/repository/queries.ts` (lines ~56, 93, 112, 130, 189); grep repo for remaining `deletedAt` / `deleted_at` Location references.
- [x] Replace `softDeleteLocation` with a hard-delete function (`$transaction` deletes locationSubJurisdiction + locationRegion, then `prisma.location.delete`); rename to `deleteLocation` and update the caller in delete-court `service.ts`.
- [x] Create Prisma migration to `DROP COLUMN deleted_at`; run `yarn db:generate` and `yarn db:migrate:dev`.
- [x] Verify no soft-deleted location rows exist in local/STG before dropping the column.

### C. Delete location metadata before the court
- [x] In `performLocationDeletion`, call `deleteLocationMetadataRecord(locationId)` (guarded no-op when absent) before the location hard delete.

### D. Delete-by-location functions (non-user-scoped)
- [x] Add `deleteSubscriptionsByLocationId(locationId)` in `libs/subscriptions/src/repository/queries.ts` + `service.ts` using `findSubscriptionsByLocationId` then delete all (not user-scoped).
- [x] Add `deleteArtefactsByLocationId(locationId)` service in `libs/publication` composing `getArtefactsByLocation` + `deleteArtefacts` (blob deletion included).

### E. Dedicated confirmation pages + links
- [x] Create `apps/web/src/pages/(system-admin)/delete-court-publications/` page (index.ts/njk/en.ts/cy.ts/test) — confirm then delete artefacts for session location, redirect to `/delete-court`, role-guarded.
- [x] Create `apps/web/src/pages/(system-admin)/delete-court-subscriptions/` page — confirm then delete subscriptions for session location, redirect to `/delete-court`, role-guarded.
- [x] Add deletion-action links to the blocked state in `delete-court-confirm/index.ts` + `.njk`; add link copy to `delete-court-confirm/en.ts` and `cy.ts` (Welsh translation required).

### F. System Admin notification email (success only, all admins)
- [x] Add `findSystemAdminEmails()` in `libs/account/src/repository/query.ts` (`findMany` where role = SYSTEM_ADMIN, select email).
- [x] Add `GOVUK_NOTIFY_TEMPLATE_ID_SYSTEM_ADMIN` env var handling in `libs/notifications/src/govnotify/template-config.ts` (placeholder until real template ID supplied).
- [x] Add `sendLocationDeletedNotification(...)` in `libs/notifications/src/notification/notification-service.ts` built on `sendEmail`; loop over admin emails, best-effort (log + continue, non-blocking).
- [x] Invoke notification on successful court delete, and on subscription-only / publication-only deletions from the D/E pages.

### G. Audit logging
- [x] Confirm `AuditLogAction.DELETE_COURT` still fires via `req.auditMetadata` after refactor; add audit metadata for the new subscription/publication delete pages if wanted.

### Tests
- [x] Unit: reversed validation order, "No"→/delete-court redirect, hard delete (delete not update), metadata delete runs + no-ops when absent, `deleteSubscriptionsByLocationId` / `deleteArtefactsByLocationId` delete all for location, `findSystemAdminEmails` returns all admins, notification `sendEmail` called per admin on success (and not on blocked states).
- [x] Template tests: delete-court-confirm blocked state renders correct link; new pages render; en/cy locale parity.
- [x] E2E: full delete-court journey including has-subscriptions and has-publications paths via dedicated pages, Welsh, inline accessibility (single journey test).
- [x] Run `yarn lint:fix`, `yarn test`, and `yarn test:e2e`; fix failures.
