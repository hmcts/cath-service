# Technical Plan – Issue #410: System Admin Data Management

## 1. Technical Approach

Consolidate all reference-data workflows under a single "Reference Data" tile on the System Admin Dashboard. The existing "Upload Reference Data" and "Manage Location Metadata" top-level tiles are removed from the dashboard and accessed via the new landing page at `/reference-data`.

Two entirely new workflows are introduced:
- **Manage Jurisdiction Data** – CRUD operations for `Jurisdiction`, `SubJurisdiction`, and `Region` records
- **Manage Location Jurisdiction Data** – Associate / update the jurisdictions and sub-jurisdictions linked to a specific court location

All new pages live inside `libs/system-admin-pages/src/pages/` following the existing controller pattern. No new library is needed.

### Key Architecture Decisions

**Landing page display variant**: The ticket requires two visual options (tiles vs radio buttons) for prototype/UX review. Both are implemented as separate Nunjucks templates within a single controller (`reference-data/index.ts`). A module-level constant `LANDING_PAGE_VARIANT: "tiles" | "radios"` controls which template is rendered. This avoids branching at the route level and keeps the controller clean. Both templates are shipped; toggling the constant changes which renders.

**Jurisdiction list filter**: The `/jurisdiction-data-list` page uses GET query parameters (`?jurisdiction=&subJurisdiction=`) for filtering. No session state is needed – the controller queries the database on every request and passes filtered results to the template. This is the simplest approach and matches how filters work elsewhere in the service.

**Jurisdiction data type discriminator**: `Jurisdiction`, `SubJurisdiction`, and `Region` live in separate tables. The list page needs to display them together with a "Type" column. The service layer fetches all three, maps each to `{ id, name, welshName, type: "Jurisdiction" | "Sub-Jurisdiction" | "Region" }`, and returns a single sorted array.

**Location jurisdiction update variants**: Two Nunjucks templates implement Option 1 (dropdowns) and Option 2 (accordions). A constant `LOCATION_JURISDICTION_UPDATE_VARIANT: "dropdowns" | "accordions"` in the controller selects which template to render.

**Session vs query params for location jurisdiction search**: Mirrors the existing location-metadata pattern – the found `locationId` and `locationName` are stored in session, then consumed by the manage page. A new `JurisdictionDataSession` interface covers this namespace.

**Soft delete**: The ticket states to "consider" soft delete. `Jurisdiction`, `SubJurisdiction`, and `Region` do not currently have a `deleted_at` column. A migration is required to add this. The delete flow will set `deletedAt` rather than hard-deleting, and list queries will filter `deletedAt: null`. `LocationSubJurisdiction` and `LocationRegion` use hard delete (removing the association row) since they are junction table records, not master data.

**Audit logging**: No audit infrastructure exists. The ticket says an "audit entry must be logged." A simple `admin_audit_log` table is added via migration and a lightweight write-only service is used. Defer building a viewer UI to a follow-up ticket – the "Audit Log Viewer" tile already exists on the dashboard as a placeholder.

**Existing `add-jurisdiction`, `add-sub-jurisdiction`, `add-region` pages**: These pages and their success pages are superseded by the new Manage Jurisdiction Data workflow. They are not deleted in this ticket (existing e2e tests cover them) but the quick-link buttons for them are removed from the `reference-data-upload` template. The add-* pages remain accessible by direct URL until a cleanup ticket removes them.

---

## 2. File Structure

### New pages (`libs/system-admin-pages/src/pages/`)

```
reference-data/                        GET          /reference-data
  index.ts
  index-tiles.njk                      (Option 1 template)
  index-radios.njk                     (Option 2 template)
  en.ts
  cy.ts

jurisdiction-data/                     GET+POST     /jurisdiction-data
  index.ts                             (landing: create vs modify radio)
  index.njk
  en.ts
  cy.ts

jurisdiction-data-list/                GET          /jurisdiction-data-list
  index.ts                             (list + filter)
  index.njk
  en.ts
  cy.ts

jurisdiction-data-modify/              GET          /jurisdiction-data-modify
  index.ts                             (view Name/Type + Update/Delete buttons)
  index.njk
  en.ts
  cy.ts

jurisdiction-data-create/              GET+POST     /jurisdiction-data-create
  index.ts
  index.njk
  en.ts
  cy.ts

jurisdiction-data-update/              GET+POST     /jurisdiction-data-update
  index.ts
  index.njk
  en.ts
  cy.ts

jurisdiction-data-delete/              GET+POST     /jurisdiction-data-delete
  index.ts                             (Are you sure? Yes/No)
  index.njk
  en.ts
  cy.ts

jurisdiction-data-delete-success/      GET          /jurisdiction-data-delete-success
  index.ts
  index.njk
  en.ts
  cy.ts

jurisdiction-data-update-success/      GET          /jurisdiction-data-update-success
  index.ts
  index.njk
  en.ts
  cy.ts

jurisdiction-data-create-success/      GET          /jurisdiction-data-create-success
  index.ts
  index.njk
  en.ts
  cy.ts

location-jurisdiction-search/          GET+POST     /location-jurisdiction-search
  index.ts                             (autocomplete, same pattern as location-metadata-search)
  index.njk
  en.ts
  cy.ts

location-jurisdiction-manage/          GET          /location-jurisdiction-manage
  index.ts                             (warning + table + Update/Delete buttons)
  index.njk
  en.ts
  cy.ts

location-jurisdiction-update/          GET+POST     /location-jurisdiction-update
  index.ts
  index-dropdowns.njk                  (Option 1)
  index-accordions.njk                 (Option 2)
  en.ts
  cy.ts

location-jurisdiction-delete/          GET+POST     /location-jurisdiction-delete
  index.ts                             (Are you sure? Yes/No)
  index.njk
  en.ts
  cy.ts

location-jurisdiction-delete-success/  GET          /location-jurisdiction-delete-success
  index.ts
  index.njk
  en.ts
  cy.ts

location-jurisdiction-update-success/  GET          /location-jurisdiction-update-success
  index.ts
  index.njk
  en.ts
  cy.ts
```

### New service file

```
libs/system-admin-pages/src/jurisdiction-management/
  jurisdiction-management-service.ts   (business logic: list, create, update, soft-delete)
  jurisdiction-management-queries.ts   (Prisma queries)
```

### New session file

```
libs/system-admin-pages/src/pages/jurisdiction-data-session.ts
```

### Existing files modified

- `libs/system-admin-pages/src/pages/system-admin-dashboard/en.ts` – remove "Upload Reference Data" and "Manage Location Metadata" tiles; add "Reference Data" tile
- `libs/system-admin-pages/src/pages/system-admin-dashboard/cy.ts` – same in Welsh
- `libs/system-admin-pages/src/pages/reference-data-upload/index.njk` – remove the three quick-link buttons (Add Jurisdiction, Add Sub-Jurisdiction, Add Region); update back link to `/reference-data`
- `libs/system-admin-pages/src/pages/reference-data-upload/en.ts` – remove `addJurisdictionLinkText`, `addSubJurisdictionLinkText`, `addRegionLinkText`
- `libs/system-admin-pages/src/pages/reference-data-upload/cy.ts` – same in Welsh
- `libs/system-admin-pages/src/pages/location-metadata-search/index.ts` – update back link href to `/reference-data`
- `libs/location/prisma/schema.prisma` – add `deletedAt` to `Jurisdiction`, `SubJurisdiction`, `Region`; add `AdminAuditLog` model

---

## 3. Schema Changes

### Migration: soft-delete columns on jurisdiction tables

```prisma
model Jurisdiction {
  jurisdictionId   Int       @id @map("jurisdiction_id")
  name             String    @unique
  welshName        String    @unique @map("welsh_name")
  deletedAt        DateTime? @map("deleted_at")   // NEW

  subJurisdictions SubJurisdiction[]

  @@map("jurisdiction")
}

model SubJurisdiction {
  subJurisdictionId Int       @id @map("sub_jurisdiction_id")
  name              String    @unique
  welshName         String    @unique @map("welsh_name")
  jurisdictionId    Int       @map("jurisdiction_id")
  deletedAt         DateTime? @map("deleted_at")   // NEW

  jurisdiction             Jurisdiction              @relation(...)
  locationSubJurisdictions LocationSubJurisdiction[]

  @@map("sub_jurisdiction")
}

model Region {
  regionId  Int       @id @map("region_id")
  name      String    @unique
  welshName String    @unique @map("welsh_name")
  deletedAt DateTime? @map("deleted_at")   // NEW

  locationRegions LocationRegion[]

  @@map("region")
}
```

### Migration: audit log table

```prisma
model AdminAuditLog {
  adminAuditLogId String   @id @default(uuid()) @map("admin_audit_log_id")
  action          String                         // e.g. "DELETE_JURISDICTION"
  entityType      String   @map("entity_type")   // e.g. "Jurisdiction"
  entityId        String   @map("entity_id")
  entityName      String   @map("entity_name")
  performedBy     String   @map("performed_by")  // user email or ID
  performedAt     DateTime @default(now()) @map("performed_at")
  details         String?  @db.Text

  @@map("admin_audit_log")
}
```

These changes belong in `libs/location/prisma/schema.prisma`. One migration covers both additions.

---

## 4. Service Layer Design

### `libs/system-admin-pages/src/jurisdiction-management/jurisdiction-management-queries.ts`

Prisma queries only – no business logic:

- `listAllJurisdictionData(filter?: { jurisdiction?: string; subJurisdiction?: string })` – returns combined array of `Jurisdiction`, `SubJurisdiction`, `Region` records (excluding soft-deleted), filtered when params are provided
- `findJurisdictionDataById(id: number, type: JurisdictionDataType)` – find one record by id and type
- `createJurisdictionRecord(data: CreateJurisdictionDataInput)` – insert into the appropriate table (auto-increment id logic from existing repositories)
- `updateJurisdictionRecord(id: number, type: JurisdictionDataType, data: UpdateJurisdictionDataInput)` – update name/welshName; allow type change (requires insert + soft-delete of old record to avoid id collisions)
- `softDeleteJurisdictionRecord(id: number, type: JurisdictionDataType)` – set `deletedAt = now()`
- `getLocationJurisdictionData(locationId: number)` – return location with all linked sub-jurisdictions and regions
- `updateLocationJurisdictions(locationId: number, subJurisdictionIds: number[], regionIds: number[])` – replace junction table rows in a transaction
- `deleteLocationJurisdictions(locationId: number)` – hard-delete all `LocationSubJurisdiction` and `LocationRegion` rows for the location
- `hasDependencies(id: number, type: JurisdictionDataType)` – check `LocationSubJurisdiction` / `LocationRegion` counts before deletion
- `writeAuditLog(entry: AuditLogEntry)` – insert into `admin_audit_log`

### `libs/system-admin-pages/src/jurisdiction-management/jurisdiction-management-service.ts`

Business logic layer:

- `listJurisdictionData(filter?)` – calls query, returns normalised `JurisdictionDataRow[]`
- `createJurisdictionData(data)` – validates uniqueness (reuse existing jurisdiction/sub-jurisdiction/region validation pattern), calls query
- `updateJurisdictionData(id, type, data)` – validates, calls query
- `deleteJurisdictionData(id, type, performedBy)` – checks dependencies via `hasDependencies`, throws if linked to active locations, calls soft-delete query, writes audit log
- `getLocationJurisdictionDetails(locationId)` – calls query, returns structured data for manage page
- `updateLocationJurisdictionData(locationId, data, performedBy)` – calls `updateLocationJurisdictions`, writes audit log
- `deleteLocationJurisdictionData(locationId, performedBy)` – calls `deleteLocationJurisdictions`, writes audit log

---

## 5. Session Design

```typescript
// libs/system-admin-pages/src/pages/jurisdiction-data-session.ts

export interface JurisdictionDataSession {
  // For jurisdiction record management (create/update/delete)
  jurisdictionData?: {
    id: number;
    type: "Jurisdiction" | "Sub-Jurisdiction" | "Region";
    name: string;
    welshName: string;
  };
  jurisdictionDataErrors?: Array<{ text: string; href: string }>;

  // For location jurisdiction management
  locationJurisdiction?: {
    locationId: number;
    locationName: string;
    locationWelshName: string;
  };
  locationJurisdictionSearchErrors?: Array<{ text: string; href: string }>;
}
```

Session data is written before redirect and consumed + deleted on the target page – matching the existing `LocationMetadataSession` pattern.

---

## 6. Routing Summary

| URL | Method | Page / Purpose |
|-----|--------|----------------|
| `/reference-data` | GET | Landing page (tiles or radios variant) |
| `/reference-data` | POST | Handle radio selection → redirect |
| `/jurisdiction-data` | GET | Landing: Create vs Modify radio |
| `/jurisdiction-data` | POST | Redirect to create or list |
| `/jurisdiction-data-list` | GET | List with filter |
| `/jurisdiction-data-modify` | GET | View single record, Update/Delete buttons |
| `/jurisdiction-data-create` | GET+POST | Create form |
| `/jurisdiction-data-create-success` | GET | Confirmation panel |
| `/jurisdiction-data-update` | GET+POST | Update form |
| `/jurisdiction-data-update-success` | GET | Confirmation panel |
| `/jurisdiction-data-delete` | GET+POST | Delete confirmation (Yes/No) |
| `/jurisdiction-data-delete-success` | GET | Confirmation panel |
| `/location-jurisdiction-search` | GET+POST | Autocomplete search |
| `/location-jurisdiction-manage` | GET | Manage page: table + Update/Delete |
| `/location-jurisdiction-update` | GET+POST | Update form (Option 1 or 2) |
| `/location-jurisdiction-update-success` | GET | Confirmation panel |
| `/location-jurisdiction-delete` | GET+POST | Delete confirmation |
| `/location-jurisdiction-delete-success` | GET | Confirmation panel |

---

## 7. Error Handling and Validation

### Reference Data landing page (radios variant)

- No radio selected + Continue: error `"There is a problem. Please select one option"` on `#action`

### Jurisdiction Data landing page

- No radio selected + Continue: same error pattern

### Create / Update Jurisdiction Data form

| Field | Rule | Error |
|-------|------|-------|
| Name (English) | Required, non-empty after trim | "Enter the name in English" |
| Name (English) | No HTML tags (reuse existing validator) | "Name contains HTML tags which are not allowed" |
| Name (English) | Unique across all types (case-insensitive) | "A record with this name already exists" |
| Welsh Name | Required, non-empty | "Enter the name in Welsh" |
| Welsh Name | No HTML tags | "Welsh name contains HTML tags which are not allowed" |
| Welsh Name | Unique across all types | "A record with this Welsh name already exists" |
| Type | Required, valid enum value | "Select a type" |

On update: uniqueness check excludes the record being updated.

### Delete Jurisdiction Data

- Dependency check: if the record is linked to active locations via `LocationSubJurisdiction` or `LocationRegion`, block deletion and render an error: `"This record cannot be deleted because it is linked to one or more locations"`.
- No radio selected + Continue: standard radio error.

### Location Jurisdiction Search

Mirrors `location-metadata-search` exactly:
- Empty input: `"Court or tribunal name must be 3 characters or more"`
- Text typed but no suggestion selected: `"There are no matching results"`
- Location not found: `"There are no matching results"`

### Location Jurisdiction Update

- At least one field must be changed (if all values remain identical, show `"No changes were made"`).
- No cancel-without-change confirmation needed – Cancel button navigates back without saving.

### Location Jurisdiction Delete

- No radio selected + Continue: standard radio error.

---

## 8. Acceptance Criteria Mapping

| AC | Implementation |
|----|----------------|
| "Reference Data" tile on dashboard | Remove "Upload Reference Data" and "Manage Location Metadata" from `en.ts`/`cy.ts`; add "Reference Data" tile pointing to `/reference-data` |
| Landing page – tiles option | `reference-data/index-tiles.njk` rendered when `LANDING_PAGE_VARIANT = "tiles"` |
| Landing page – radios option | `reference-data/index-radios.njk` rendered when `LANDING_PAGE_VARIANT = "radios"`; POST handles selection + validation |
| Radio error | `govukErrorSummary` + `govukRadios` error message, matching existing pattern |
| Upload Reference Data pathway | Landing page links directly (tiles) or redirects (radios POST) to `/reference-data-upload`; back link on upload page updated to `/reference-data` |
| Manage Location Metadata pathway | Links to `/location-metadata-search`; back link on that page updated to `/reference-data` |
| Manage Jurisdiction Data – create | `jurisdiction-data` → select create → `jurisdiction-data-create` → POST → `jurisdiction-data-create-success` |
| Manage Jurisdiction Data – modify list + filter | `jurisdiction-data-list` with GET params; left-side filter using CaTH filter pattern |
| Modify individual record | `jurisdiction-data-modify` shows summary table + Update + Delete buttons |
| Delete jurisdiction record | `jurisdiction-data-delete` (Yes/No) → POST → soft-delete + audit log → `jurisdiction-data-delete-success` |
| Update jurisdiction record | `jurisdiction-data-update` (Name/WelshName/Type form) → POST → `jurisdiction-data-update-success` |
| Create success banner | `govukPanel` with "Jurisdiction Data Created" |
| Update success banner | `govukPanel` with "Jurisdiction Data Updated" |
| Delete success banner | `govukPanel` with "Jurisdiction Data Deleted" |
| Success page back link | "Manage Jurisdiction Data" links to `/jurisdiction-data` |
| Location Jurisdiction search | `/location-jurisdiction-search` using autocomplete pattern from `location-metadata-search` |
| Manage Location Jurisdiction page | Warning text + table (Court name, Jurisdiction, Sub-Jurisdiction) + Update + Delete |
| Location Jurisdiction delete | `location-jurisdiction-delete` (Yes/No) → hard-delete junction rows + audit log → success |
| Location Jurisdiction update Option 1 | `index-dropdowns.njk` with Select components for each category |
| Location Jurisdiction update Option 2 | `index-accordions.njk` with Accordion + Checkboxes for each category |
| Confirm → success | `location-jurisdiction-update-success` with "Location Jurisdiction Data Updated" panel |
| Cancel button | `<a>` styled as `govuk-button--warning` linking back; no POST needed |
| Dependency check on delete | `hasDependencies` called in service before soft-delete; blocking error rendered if true |
| Audit logging | `writeAuditLog` called after each successful delete or update in service layer |
| Soft delete | `deletedAt` timestamp set; hard delete not performed on master data |

---

## 9. Open Questions / Clarifications Needed

1. **Type change on update**: The spec allows changing Type (e.g., Jurisdiction → Sub-Jurisdiction). This requires moving data between tables since `jurisdictionId` is a foreign key only on `SubJurisdiction`. The simplest safe implementation is to create the new record and soft-delete the old one in a transaction. This needs product confirmation that this behaviour is acceptable and what ID the new record should inherit.

2. **Sub-Jurisdiction parent on create/update**: When creating or updating a Sub-Jurisdiction, the existing `add-sub-jurisdiction` page asks for a parent Jurisdiction. The spec's Create Jurisdiction Data form only shows Name, Welsh Name, and Type. Clarify whether a parent Jurisdiction dropdown should be shown when Type = "Sub-Jurisdiction".

3. **Region in Jurisdiction list filter**: The filter on `/jurisdiction-data-list` has fields labelled "Jurisdiction" and "Sub-Jurisdiction". Should Region records also appear in the list and be filterable by a third "Region" field, or only Jurisdiction and Sub-Jurisdiction records are managed here?

4. **Location Jurisdiction update – which sub-jurisdictions to show**: The update form shows categories "Type of civil court", "Type of criminal court", etc. These appear to map to specific sub-jurisdictions grouped by their parent jurisdiction. Confirm the mapping between the on-screen category labels and the `Jurisdiction` records in the database.

5. **Dependency block vs soft-delete**: If a Jurisdiction or Sub-Jurisdiction is linked to a location and the admin wants to delete it, should the delete be blocked entirely or should the location associations be automatically removed first? The current plan blocks deletion.

6. **Audit log viewer**: The "Audit Log Viewer" tile exists on the dashboard but has no implementation. Is the viewer UI in scope for this ticket or deferred?

7. **Back link on `reference-data-upload`**: The current back link on the upload page points to `#`. After this ticket the back link should point to `/reference-data`. Confirm this is correct.
