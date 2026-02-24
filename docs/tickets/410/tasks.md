# Tasks – Issue #410: System Admin Data Management

## Schema & Migration

- [ ] Add `deleted_at` column to `jurisdiction`, `sub_jurisdiction`, and `region` tables in `libs/location/prisma/schema.prisma`
- [ ] Add `AdminAuditLog` model (`admin_audit_log` table) to `libs/location/prisma/schema.prisma`
- [ ] Run `yarn db:migrate:dev` to generate and apply the migration
- [ ] Run `yarn db:generate` to regenerate the Prisma client

## Service Layer

- [ ] Create `libs/system-admin-pages/src/jurisdiction-management/jurisdiction-management-queries.ts` with:
  - `listAllJurisdictionData(filter?)` – combined Jurisdiction / SubJurisdiction / Region query, excludes soft-deleted
  - `findJurisdictionDataById(id, type)`
  - `createJurisdictionRecord(data)`
  - `updateJurisdictionRecord(id, type, data)`
  - `softDeleteJurisdictionRecord(id, type)`
  - `getLocationJurisdictionData(locationId)`
  - `updateLocationJurisdictions(locationId, subJurisdictionIds, regionIds)` – replaces junction rows in a transaction
  - `deleteLocationJurisdictions(locationId)` – hard-deletes junction rows
  - `hasDependencies(id, type)` – checks linked locations before deletion
  - `writeAuditLog(entry)`
- [ ] Create `libs/system-admin-pages/src/jurisdiction-management/jurisdiction-management-service.ts` with:
  - `listJurisdictionData(filter?)`
  - `createJurisdictionData(data)`
  - `updateJurisdictionData(id, type, data)` – uniqueness excludes self
  - `deleteJurisdictionData(id, type, performedBy)` – dependency check, soft-delete, audit
  - `getLocationJurisdictionDetails(locationId)`
  - `updateLocationJurisdictionData(locationId, data, performedBy)` – update + audit
  - `deleteLocationJurisdictionData(locationId, performedBy)` – delete + audit
- [ ] Create `libs/system-admin-pages/src/pages/jurisdiction-data-session.ts` session interface

## Unit Tests for Service Layer

- [ ] Create `libs/system-admin-pages/src/jurisdiction-management/jurisdiction-management-queries.test.ts`
- [ ] Create `libs/system-admin-pages/src/jurisdiction-management/jurisdiction-management-service.test.ts`

## Dashboard Update

- [ ] Update `libs/system-admin-pages/src/pages/system-admin-dashboard/en.ts` – remove "Upload Reference Data" and "Manage Location Metadata" tiles; add "Reference Data" tile (`href: "/reference-data"`, description: "Upload CSV data, manage jurisdiction and location data")
- [ ] Update `libs/system-admin-pages/src/pages/system-admin-dashboard/cy.ts` – Welsh equivalents

## Reference Data Landing Page

- [ ] Create `libs/system-admin-pages/src/pages/reference-data/en.ts`
- [ ] Create `libs/system-admin-pages/src/pages/reference-data/cy.ts`
- [ ] Create `libs/system-admin-pages/src/pages/reference-data/index.ts` – GET renders tiles or radios template based on `LANDING_PAGE_VARIANT` constant; POST (radios only) validates selection and redirects
- [ ] Create `libs/system-admin-pages/src/pages/reference-data/index-tiles.njk` – four `admin-tile` links
- [ ] Create `libs/system-admin-pages/src/pages/reference-data/index-radios.njk` – `govukRadios` + Continue, with error summary
- [ ] Create `libs/system-admin-pages/src/pages/reference-data/index.test.ts`

## Existing Page Updates

- [ ] Update `libs/system-admin-pages/src/pages/reference-data-upload/index.njk` – remove Add Jurisdiction, Add Sub-Jurisdiction, Add Region quick-link buttons; update back link to `/reference-data`
- [ ] Update `libs/system-admin-pages/src/pages/reference-data-upload/en.ts` – remove `addJurisdictionLinkText`, `addSubJurisdictionLinkText`, `addRegionLinkText`
- [ ] Update `libs/system-admin-pages/src/pages/reference-data-upload/cy.ts` – same in Welsh
- [ ] Update `libs/system-admin-pages/src/pages/location-metadata-search/index.ts` – change back link from `#` to `/reference-data`
- [ ] Update `libs/system-admin-pages/src/pages/location-metadata-search/en.ts` / `cy.ts` if back link text stored there

## Manage Jurisdiction Data – Landing Page

- [ ] Create `libs/system-admin-pages/src/pages/jurisdiction-data/en.ts`
- [ ] Create `libs/system-admin-pages/src/pages/jurisdiction-data/cy.ts`
- [ ] Create `libs/system-admin-pages/src/pages/jurisdiction-data/index.ts` – GET + POST; POST redirects to `/jurisdiction-data-create` or `/jurisdiction-data-list`
- [ ] Create `libs/system-admin-pages/src/pages/jurisdiction-data/index.njk` – `govukRadios` (Create / Modify) + Continue
- [ ] Create `libs/system-admin-pages/src/pages/jurisdiction-data/index.test.ts`

## Manage Jurisdiction Data – List with Filter

- [ ] Create `libs/system-admin-pages/src/pages/jurisdiction-data-list/en.ts`
- [ ] Create `libs/system-admin-pages/src/pages/jurisdiction-data-list/cy.ts`
- [ ] Create `libs/system-admin-pages/src/pages/jurisdiction-data-list/index.ts` – GET only; reads `?jurisdiction=&subJurisdiction=` from query; calls `listJurisdictionData(filter)`
- [ ] Create `libs/system-admin-pages/src/pages/jurisdiction-data-list/index.njk` – left-side filter panel + `govukTable` with Name, Type, Modify link columns
- [ ] Create `libs/system-admin-pages/src/pages/jurisdiction-data-list/index.test.ts`

## Manage Jurisdiction Data – Modify Item Page

- [ ] Create `libs/system-admin-pages/src/pages/jurisdiction-data-modify/en.ts`
- [ ] Create `libs/system-admin-pages/src/pages/jurisdiction-data-modify/cy.ts`
- [ ] Create `libs/system-admin-pages/src/pages/jurisdiction-data-modify/index.ts` – GET; reads `?id=&type=` from query; loads record from service; stores in session; renders summary table with Update and Delete buttons
- [ ] Create `libs/system-admin-pages/src/pages/jurisdiction-data-modify/index.njk` – `govukSummaryList` for Name and Type + Update (`govukButton`) + Delete (`govukButton--warning`)
- [ ] Create `libs/system-admin-pages/src/pages/jurisdiction-data-modify/index.test.ts`

## Manage Jurisdiction Data – Create Form

- [ ] Create `libs/system-admin-pages/src/pages/jurisdiction-data-create/en.ts`
- [ ] Create `libs/system-admin-pages/src/pages/jurisdiction-data-create/cy.ts`
- [ ] Create `libs/system-admin-pages/src/pages/jurisdiction-data-create/index.ts` – GET + POST; POST validates and calls `createJurisdictionData`; on success redirects to `/jurisdiction-data-create-success`
- [ ] Create `libs/system-admin-pages/src/pages/jurisdiction-data-create/index.njk` – Name input + Welsh Name input + Type select + Confirm button + error summary
- [ ] Create `libs/system-admin-pages/src/pages/jurisdiction-data-create/index.test.ts`

## Manage Jurisdiction Data – Create Success

- [ ] Create `libs/system-admin-pages/src/pages/jurisdiction-data-create-success/en.ts`
- [ ] Create `libs/system-admin-pages/src/pages/jurisdiction-data-create-success/cy.ts`
- [ ] Create `libs/system-admin-pages/src/pages/jurisdiction-data-create-success/index.ts` – GET; guard: redirect to `/jurisdiction-data-create` if no session data; clears session on render
- [ ] Create `libs/system-admin-pages/src/pages/jurisdiction-data-create-success/index.njk` – `govukPanel` ("Jurisdiction Data Created") + link to `/jurisdiction-data`
- [ ] Create `libs/system-admin-pages/src/pages/jurisdiction-data-create-success/index.test.ts`

## Manage Jurisdiction Data – Update Form

- [ ] Create `libs/system-admin-pages/src/pages/jurisdiction-data-update/en.ts`
- [ ] Create `libs/system-admin-pages/src/pages/jurisdiction-data-update/cy.ts`
- [ ] Create `libs/system-admin-pages/src/pages/jurisdiction-data-update/index.ts` – GET loads record from session; POST validates and calls `updateJurisdictionData`; redirects to `/jurisdiction-data-update-success`
- [ ] Create `libs/system-admin-pages/src/pages/jurisdiction-data-update/index.njk` – `govukSummaryList` rows showing existing + `govukInput` / `govukSelect` for new values + Confirm button
- [ ] Create `libs/system-admin-pages/src/pages/jurisdiction-data-update/index.test.ts`

## Manage Jurisdiction Data – Update Success

- [ ] Create `libs/system-admin-pages/src/pages/jurisdiction-data-update-success/en.ts`
- [ ] Create `libs/system-admin-pages/src/pages/jurisdiction-data-update-success/cy.ts`
- [ ] Create `libs/system-admin-pages/src/pages/jurisdiction-data-update-success/index.ts` – GET; guard redirect; clears session
- [ ] Create `libs/system-admin-pages/src/pages/jurisdiction-data-update-success/index.njk` – `govukPanel` ("Jurisdiction Data Updated") + link to `/jurisdiction-data`
- [ ] Create `libs/system-admin-pages/src/pages/jurisdiction-data-update-success/index.test.ts`

## Manage Jurisdiction Data – Delete Confirmation

- [ ] Create `libs/system-admin-pages/src/pages/jurisdiction-data-delete/en.ts`
- [ ] Create `libs/system-admin-pages/src/pages/jurisdiction-data-delete/cy.ts`
- [ ] Create `libs/system-admin-pages/src/pages/jurisdiction-data-delete/index.ts` – GET shows summary + Yes/No radios; POST validates selection; Yes calls `deleteJurisdictionData` (dependency check) and redirects to success; No redirects back to `/jurisdiction-data-modify`
- [ ] Create `libs/system-admin-pages/src/pages/jurisdiction-data-delete/index.njk` – `govukSummaryList` + `govukRadios` (Yes/No) + Continue
- [ ] Create `libs/system-admin-pages/src/pages/jurisdiction-data-delete/index.test.ts`

## Manage Jurisdiction Data – Delete Success

- [ ] Create `libs/system-admin-pages/src/pages/jurisdiction-data-delete-success/en.ts`
- [ ] Create `libs/system-admin-pages/src/pages/jurisdiction-data-delete-success/cy.ts`
- [ ] Create `libs/system-admin-pages/src/pages/jurisdiction-data-delete-success/index.ts` – GET; guard redirect; clears session
- [ ] Create `libs/system-admin-pages/src/pages/jurisdiction-data-delete-success/index.njk` – `govukPanel` ("Jurisdiction Data Deleted") + link to `/jurisdiction-data`
- [ ] Create `libs/system-admin-pages/src/pages/jurisdiction-data-delete-success/index.test.ts`

## Manage Location Jurisdiction Data – Search

- [ ] Create `libs/system-admin-pages/src/pages/location-jurisdiction-search/en.ts`
- [ ] Create `libs/system-admin-pages/src/pages/location-jurisdiction-search/cy.ts`
- [ ] Create `libs/system-admin-pages/src/pages/location-jurisdiction-search/index.ts` – mirrors `location-metadata-search` controller; stores `locationId` + `locationName` in `JurisdictionDataSession.locationJurisdiction`; redirects to `/location-jurisdiction-manage`
- [ ] Create `libs/system-admin-pages/src/pages/location-jurisdiction-search/index.njk` – autocomplete input + Continue (matches existing `location-metadata-search/index.njk` layout)
- [ ] Create `libs/system-admin-pages/src/pages/location-jurisdiction-search/index.test.ts`

## Manage Location Jurisdiction Data – Manage Page

- [ ] Create `libs/system-admin-pages/src/pages/location-jurisdiction-manage/en.ts`
- [ ] Create `libs/system-admin-pages/src/pages/location-jurisdiction-manage/cy.ts`
- [ ] Create `libs/system-admin-pages/src/pages/location-jurisdiction-manage/index.ts` – GET; guards on session; calls `getLocationJurisdictionDetails`; renders warning + table + Update + Delete
- [ ] Create `libs/system-admin-pages/src/pages/location-jurisdiction-manage/index.njk` – `govukWarningText` + `govukTable` (Court name, Jurisdiction, Sub-Jurisdiction columns) + Update (`govukButton`) + Delete (`govukButton--warning`)
- [ ] Create `libs/system-admin-pages/src/pages/location-jurisdiction-manage/index.test.ts`

## Manage Location Jurisdiction Data – Update Form

- [ ] Create `libs/system-admin-pages/src/pages/location-jurisdiction-update/en.ts`
- [ ] Create `libs/system-admin-pages/src/pages/location-jurisdiction-update/cy.ts`
- [ ] Create `libs/system-admin-pages/src/pages/location-jurisdiction-update/index.ts` – GET loads options from db + current selections from session; renders Option 1 or 2 based on `LOCATION_JURISDICTION_UPDATE_VARIANT` constant; POST calls `updateLocationJurisdictionData` and redirects to success; Cancel button links back without saving
- [ ] Create `libs/system-admin-pages/src/pages/location-jurisdiction-update/index-dropdowns.njk` – `govukSelect` per category + Confirm + Cancel
- [ ] Create `libs/system-admin-pages/src/pages/location-jurisdiction-update/index-accordions.njk` – `govukAccordion` wrapping `govukCheckboxes` per category + Confirm + Cancel
- [ ] Create `libs/system-admin-pages/src/pages/location-jurisdiction-update/index.test.ts`

## Manage Location Jurisdiction Data – Update Success

- [ ] Create `libs/system-admin-pages/src/pages/location-jurisdiction-update-success/en.ts`
- [ ] Create `libs/system-admin-pages/src/pages/location-jurisdiction-update-success/cy.ts`
- [ ] Create `libs/system-admin-pages/src/pages/location-jurisdiction-update-success/index.ts` – GET; guard redirect; clears session
- [ ] Create `libs/system-admin-pages/src/pages/location-jurisdiction-update-success/index.njk` – `govukPanel` ("Location Jurisdiction Data Updated") + link to `/location-jurisdiction-search`
- [ ] Create `libs/system-admin-pages/src/pages/location-jurisdiction-update-success/index.test.ts`

## Manage Location Jurisdiction Data – Delete Confirmation

- [ ] Create `libs/system-admin-pages/src/pages/location-jurisdiction-delete/en.ts`
- [ ] Create `libs/system-admin-pages/src/pages/location-jurisdiction-delete/cy.ts`
- [ ] Create `libs/system-admin-pages/src/pages/location-jurisdiction-delete/index.ts` – GET + POST; Yes calls `deleteLocationJurisdictionData` and redirects to success; No goes back to `/location-jurisdiction-manage`
- [ ] Create `libs/system-admin-pages/src/pages/location-jurisdiction-delete/index.njk` – `govukRadios` (Yes/No) + Confirm
- [ ] Create `libs/system-admin-pages/src/pages/location-jurisdiction-delete/index.test.ts`

## Manage Location Jurisdiction Data – Delete Success

- [ ] Create `libs/system-admin-pages/src/pages/location-jurisdiction-delete-success/en.ts`
- [ ] Create `libs/system-admin-pages/src/pages/location-jurisdiction-delete-success/cy.ts`
- [ ] Create `libs/system-admin-pages/src/pages/location-jurisdiction-delete-success/index.ts` – GET; guard redirect; clears session
- [ ] Create `libs/system-admin-pages/src/pages/location-jurisdiction-delete-success/index.njk` – `govukPanel` ("Jurisdiction Data Deleted") + link to `/location-jurisdiction-search`
- [ ] Create `libs/system-admin-pages/src/pages/location-jurisdiction-delete-success/index.test.ts`

## Linting and Build

- [ ] Run `yarn lint:fix` to resolve any Biome warnings across new and modified files
- [ ] Run `yarn build` (or `tsc`) to verify no TypeScript errors

## E2E Test

- [ ] Create `e2e-tests/tests/reference-data-management.spec.ts` covering:
  - System admin sees "Reference Data" tile on dashboard and no longer sees "Upload Reference Data" or "Manage Location Metadata" tiles
  - Reference Data landing page loads with correct options (test whichever variant is active)
  - Validation: submitting radios variant without selection shows error
  - Full journey: landing → Upload Reference Data → upload page loads with warning message
  - Full journey: landing → Manage Jurisdiction Data → Create → form → success panel (includes Welsh check + accessibility scan)
  - Full journey: landing → Manage Jurisdiction Data → Modify → list page → filter → modify item → update form → success panel
  - Full journey: landing → Manage Jurisdiction Data → Modify → modify item → delete → confirm Yes → success panel
  - Full journey: landing → Manage Location Jurisdiction Data → search → manage page → update form → success panel
  - Full journey: landing → Manage Location Jurisdiction Data → search → manage page → delete → confirm Yes → success panel
  - Cancel on location jurisdiction update returns to manage page without saving
