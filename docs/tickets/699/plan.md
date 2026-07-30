# Technical Plan — #699: Manage List Type Screens

## 1. Technical Approach

### High-level strategy

The work consolidates two overlapping System Admin flows — "Manage List Types" (simple table → list-search-config) and "Configure List Type" (4-step create/edit) — into a single, fully-featured 8-screen journey anchored on `/manage-list-types`.

One new capability is added:
- **`caseNumberJsonFieldName` / `caseNameJsonFieldName` form fields** (requires two new nullable columns on `ListType`).

Region selection is **out of scope** for this ticket — list types will not be linked to regions.

**What is created vs refactored vs removed:**

| Item | Action |
|------|--------|
| `libs/postgres-prisma/prisma/schema/location.prisma` | Add 2 new `ListType` columns |
| `libs/system-admin-pages/src/list-type/queries.ts` | Extend `createListType` / `updateListType` with the two new columns |
| `libs/system-admin-pages/src/list-type/service.ts` | Extend `SaveListTypeData` and `saveListType` to accept `caseNumberJsonFieldName` / `caseNameJsonFieldName` |
| `libs/system-admin-pages/src/list-type/validation.ts` | Add optional field validators for `caseNumberJsonFieldName`, `caseNameJsonFieldName` |
| `libs/system-admin-pages/src/list-type/types.ts` | Extend `ListTypeFormData` with new fields |
| `apps/web/src/pages/(system-admin)/manage-list-types/` | Repurpose: show list + "Manage" link + "Add new list type" button |
| `apps/web/src/pages/(system-admin)/manage-list-type/` | **New** — detail screen for a single list type |
| `apps/web/src/pages/(system-admin)/add-list-type/` | **New** — enter details form for adding |
| `apps/web/src/pages/(system-admin)/edit-list-type/` | **New** — enter details form for editing (pre-populated) |
| `apps/web/src/pages/(system-admin)/configure-list-type-select-sub-jurisdictions/` | Extend: add region checkboxes below sub-jurisdiction accordion |
| `apps/web/src/pages/(system-admin)/configure-list-type-preview/` | Extend: add `caseNumberJsonFieldName`, `caseNameJsonFieldName`, and regions summary rows; update Change hrefs |
| `apps/web/src/pages/(system-admin)/configure-list-type-success/` | Minor: update copy ("List type updated" / "List type added") per flag in session |
| `apps/web/src/pages/(system-admin)/delete-list-type/` | Minor: update "no" redirect from `/view-list-types` → `/manage-list-types` and cancel link |
| `apps/web/src/pages/(system-admin)/configure-list-type-enter-details/` | Replace GET with redirect to `/manage-list-types`; remove POST handler |
| `apps/web/src/pages/(system-admin)/view-list-types/` | Replace GET with redirect to `/manage-list-types` |
| `apps/web/src/pages/(system-admin)/system-admin-dashboard/en.ts` + `cy.ts` | Remove "Configure List Type" tile; update "Manage List Types" description |
| `e2e-tests/tests/system-admin/manage-list-types.spec.ts` | Replace skipped test with a complete journey test for the new flow |
| `e2e-tests/tests/system-admin/configure-list-type.spec.ts` | Remove (journey is now in manage-list-types.spec.ts) |

The existing `configure-list-type-enter-details` and `view-list-types` page directories are kept on disk as thin redirectors rather than deleted, to avoid broken bookmarks and to keep the git diff reviewable.

---

## 2. Database Changes

### New columns on `ListType`

```prisma
caseNumberJsonFieldName String? @map("case_number_json_field_name") @db.VarChar(255)
caseNameJsonFieldName   String? @map("case_name_json_field_name")   @db.VarChar(255)
```

Both are nullable; they are not required for existing list types and are optional in the form.

The `ListType` model gains the two new columns only:

```prisma
model ListType {
  // existing fields...
  caseNumberJsonFieldName String? @map("case_number_json_field_name") @db.VarChar(255)
  caseNameJsonFieldName   String? @map("case_name_json_field_name")   @db.VarChar(255)

  subJurisdictions ListTypeSubJurisdiction[]
  artefacts        Artefact[]
}
```

Region-to-list-type linking is **not** part of this ticket.

### Migration steps

1. Run `yarn db:migrate:dev` — Prisma will generate and apply a migration that adds `case_number_json_field_name` and `case_name_json_field_name` nullable columns to `list_types`.
2. Run `yarn db:generate` to refresh the Prisma client.

---

## 3. Service / Query Layer Changes

### `libs/system-admin-pages/src/list-type/queries.ts`

**Functions that change:**

- `createListType` — accept `caseNumberJsonFieldName` and `caseNameJsonFieldName` in `CreateListTypeData` and persist them.
- `updateListType` — accept the same two fields in `UpdateListTypeData` and persist them.

No region-related functions are added.

**Type changes:**

```typescript
interface CreateListTypeData {
  // existing fields...
  caseNumberJsonFieldName?: string | null;
  caseNameJsonFieldName?: string | null;
}

interface UpdateListTypeData {
  // existing fields...
  caseNumberJsonFieldName?: string | null;
  caseNameJsonFieldName?: string | null;
}
```

### `libs/system-admin-pages/src/list-type/service.ts`

`SaveListTypeData` grows to include:

```typescript
interface SaveListTypeData {
  // existing fields...
  caseNumberJsonFieldName?: string | null;
  caseNameJsonFieldName?: string | null;
}
```

`saveListType` passes the new fields through to `createListType` / `updateListType` unchanged.

`hasArtefactsForListType` already exists — no changes needed.

### `libs/system-admin-pages/src/list-type/types.ts`

`ListTypeFormData` extends:

```typescript
export interface ListTypeFormData {
  // existing fields...
  caseNumberJsonFieldName?: string | null;
  caseNameJsonFieldName?: string | null;
  editId?: number;
}
```

---

## 4. Page Changes

### [Screen 1] `manage-list-types/` — repurpose existing

**Route:** `GET /manage-list-types`

**Current:** Simple table of list types with a "Manage" link pointing at `/list-search-config/<id>`.

**New behaviour:**
- Table column showing `friendlyName || name`.
- "Manage" link in each row pointing at `/manage-list-type?id=<id>`.
- "Add new list type" button at the bottom of the table, linking to `/add-list-type`.

**Controller changes:** Update the `configureUrl` mapping from `/list-search-config/${id}` to `/manage-list-type?id=${id}`.

**Template changes:** Rename the second column header to something appropriate (e.g. "Actions"); add the "Add new list type" button below the table.

**Content (en.ts / cy.ts):** Add `addNewButton` and update `configureLink` label (already `"Manage"`, no change needed).

---

### [Screen 2] `manage-list-type/` — NEW

**Route:** `GET /manage-list-type?id=<id>`

**Purpose:** Detail screen showing a single list type's key fields with "Edit list type" and "Delete list type" buttons.

**Controller (`index.ts`):**
- Parse `id` from query; reject non-numeric IDs with 400.
- Call `findListTypeById(id)` — if not found, render 404.
- Render the template with the list type's fields and the linked regions/sub-jurisdictions.

**Template (`index.njk`):**
- Summary list showing: name, friendly name, Welsh friendly name, shortened friendly name, URL, case number JSON field name, case name JSON field name, default sensitivity, allowed provenance, is non-strategic, sub-jurisdictions.
- "Edit list type" button → `/edit-list-type?id=<id>`.
- "Delete list type" button (warning variant) → `/delete-list-type?id=<id>`.
- Back link → `/manage-list-types`.

**Content:** New `en.ts` / `cy.ts` in the page directory with all label strings. No `regionsLabel` needed.

---

### [Screen 3a] `add-list-type/` — NEW

**Routes:** `GET /add-list-type`, `POST /add-list-type`

**Purpose:** Enter details form for creating a new list type — starts a fresh session.

**Controller (`index.ts`):**

GET:
- Clear `session.configureListType` (fresh form).
- Render the form template with empty `formData`.

POST:
- Parse form body (same fields as existing `configure-list-type-enter-details` POST handler, plus `caseNumberJsonFieldName` and `caseNameJsonFieldName`).
- Run `validateListTypeDetails(formData)`.
- Check name uniqueness against DB.
- On errors: re-render with errors.
- On success: store in `session.configureListType = { ...formData, subJurisdictionIds: [], regionIds: [], editId: undefined }`; redirect to `/configure-list-type-select-sub-jurisdictions`.

**Template (`index.njk`):**
- Same form structure as the existing `configure-list-type-enter-details/index.njk`, extended with two new optional text inputs: "Case number JSON field name" and "Case name JSON field name".

**Content:** New `en.ts` / `cy.ts` in the page directory.

---

### [Screen 3b] `edit-list-type/` — NEW

**Routes:** `GET /edit-list-type?id=<id>`, `POST /edit-list-type?id=<id>`

**Purpose:** Pre-populated enter details form for editing an existing list type.

**Controller (`index.ts`):**

GET:
- If session already holds matching `editId`, use session data (user navigated back).
- Otherwise, load from DB via `findListTypeById(id)` and populate session.
- Map DB regions to `regionIds` in addition to existing `subJurisdictionIds` mapping.
- Render with pre-populated `formData`.

POST:
- Same validation as `add-list-type` POST.
- On success: update `session.configureListType` preserving `editId`; redirect to `/configure-list-type-select-sub-jurisdictions`.

**Template (`index.njk`):**
- Same template as `add-list-type` (can share or extract into a partial). The heading differs ("Edit list type").

**Content:** New `en.ts` / `cy.ts` in the page directory. The heading string is the only meaningful difference from add.

---

### [Screen 4] `configure-list-type-select-sub-jurisdictions/` — extend

**Routes:** `GET /configure-list-type-select-sub-jurisdictions`, `POST /configure-list-type-select-sub-jurisdictions`

**Changes:**

GET:
- Guard: redirect to `/manage-list-types` (not `/configure-list-type-enter-details`) if no session.
- Load sub-jurisdictions as before.

POST:
- Guard: same redirect fix.
- Run existing `validateSubJurisdictions` check.
- Redirect to `/configure-list-type-preview`.

No region checkboxes are added to this screen.

**Template (`index.njk`):** No structural changes beyond fixing the session guard redirect target.

**Content (en.ts / cy.ts):** No new keys needed.

---

### [Screen 5] `configure-list-type-preview/` — extend

**Changes:**

GET:
- Guard: redirect to `/manage-list-types`.
- Pass `subJurisdictionsText` as before.
- Derive `changeDetailsHref` from session `editId` (see below).

POST:
- Guard: redirect to `/manage-list-types`.
- Pass `caseNumberJsonFieldName` and `caseNameJsonFieldName` to `saveListType`.
- On success: clear session; redirect to `/configure-list-type-success`.

**Template (`index.njk`):**
- Add summary rows for `caseNumberJsonFieldName` and `caseNameJsonFieldName`.
- Change `href` for all existing "Change" actions from `/configure-list-type-enter-details` to the correct screen based on context:
  - Details rows (name, friendlyName, etc.) → `/add-list-type` (add flow) or `/edit-list-type?id=<editId>` (edit flow). Since the session holds `editId`, the controller derives the correct href and passes it to the template as `changeDetailsHref`.
  - Sub-jurisdictions row → `/configure-list-type-select-sub-jurisdictions`.

**Content (en.ts / cy.ts):** Add `caseNumberJsonFieldNameRow` and `caseNameJsonFieldNameRow` strings.

---

### [Screen 6] `configure-list-type-success/` — minor changes

**Changes:**
- Update copy: "List type updated" for edit; assumption is the same heading for add (see open questions).
- Return link target stays as `/system-admin-dashboard`.
- No structural changes to the controller or template beyond copy updates.

**Content:** Update `en.ts` / `cy.ts` title and banner strings.

---

### [Screen 7] `delete-list-type/` — minor fix

**Changes:**
- In the POST handler, change the redirect when user selects "no" from `/view-list-types` → `/manage-list-type?id=<id>` (returns to the list type detail screen, not the old listing).
- Update the template cancel link href from `/view-list-types` to `/manage-list-type?id=<id>`.

No other logic changes; `hasArtefactsForListType` and `softDeleteListType` remain unchanged.

---

### [Screen 8] `delete-list-type-success/` — content update

**Changes:**
- The `viewListTypesLink` in `en.ts` / `cy.ts` currently says "View all list types" and should still link to `/manage-list-types` (the repurposed manage screen already fulfils this purpose). No functional change required; verify the link href in the template points to `/manage-list-types`.

---

## 5. Pages to Remove / Redirect

### `configure-list-type-enter-details/index.ts`

Replace the existing GET handler with a simple redirect to `/manage-list-types`. Remove the POST handler. This prevents broken bookmarks while ensuring the old entry point no longer starts a session.

```typescript
export const GET: RequestHandler[] = [
  requireRole([USER_ROLES.SYSTEM_ADMIN]),
  (_req, res) => res.redirect(301, "/manage-list-types")
];
```

### `view-list-types/index.ts`

Replace the existing GET handler with a simple redirect to `/manage-list-types`.

```typescript
export const GET: RequestHandler[] = [
  requireRole([USER_ROLES.SYSTEM_ADMIN]),
  (_req, res) => res.redirect(301, "/manage-list-types")
];
```

### System Admin Dashboard tiles

In `apps/web/src/pages/(system-admin)/system-admin-dashboard/en.ts` and `cy.ts`:
- Remove the "Configure List Type" tile (the entry with `href: "/configure-list-type-enter-details"`).
- Update the "Manage List Types" tile description to: "View, create, update and delete list type configuration".

---

## 6. Session State

`ListTypeFormData` in `libs/system-admin-pages/src/list-type/types.ts` is extended:

```typescript
export interface ListTypeFormData {
  name: string;
  friendlyName: string;
  welshFriendlyName: string;
  shortenedFriendlyName: string;
  url: string;
  caseNumberJsonFieldName?: string | null;
  caseNameJsonFieldName?: string | null;
  defaultSensitivity: string;
  allowedProvenance: string[];
  isNonStrategic: boolean | null;
  subJurisdictionIds: number[];
  editId?: number;
}
```

`ListTypeSession` remains the same shape; the expanded `ListTypeFormData` is picked up automatically.

**Session lifecycle:**
- `add-list-type` GET: clears `session.configureListType`.
- `add-list-type` POST (valid): sets full session data with `editId: undefined`.
- `edit-list-type` GET: sets session data with `editId: <id>` (if not already set).
- `edit-list-type` POST (valid): updates session, preserves `editId`.
- `configure-list-type-select-sub-jurisdictions` POST: writes `subJurisdictionIds`.
- `configure-list-type-preview` POST: clears session on success.

---

## 7. Validation Changes

### `validateListTypeDetails`

Add two optional field validators. Because the fields are optional (nullable), the validator checks only the max-length constraint when a value is supplied:

```typescript
if (data.caseNumberJsonFieldName && data.caseNumberJsonFieldName.length > 255) {
  errors.push({
    field: "caseNumberJsonFieldName",
    message: "Case number JSON field name must be 255 characters or less",
    href: "#caseNumberJsonFieldName"
  });
}

if (data.caseNameJsonFieldName && data.caseNameJsonFieldName.length > 255) {
  errors.push({
    field: "caseNameJsonFieldName",
    message: "Case name JSON field name must be 255 characters or less",
    href: "#caseNameJsonFieldName"
  });
}
```

`ListTypeDetailsInput` interface gains these two optional fields.

### `validateRegions`

Region selection is optional (see Open Questions assumption). No new validation function is needed for the empty-selection case. If future requirements make it mandatory, a `validateRegions` function mirroring `validateSubJurisdictions` is straightforward to add.

---

## 8. Content Changes

All new pages follow the co-located content pattern (`en.ts` / `cy.ts` next to the controller). Welsh stubs use the `[WELSH TRANSLATION REQUIRED: '...']` marker.

### New files

**`apps/web/src/pages/(system-admin)/manage-list-type/en.ts`**
```typescript
export const en = {
  title: "Manage list type",
  // Summary list labels
  nameLabel: "Name",
  friendlyNameLabel: "Friendly name",
  welshFriendlyNameLabel: "Welsh friendly name",
  shortenedFriendlyNameLabel: "Shortened friendly name",
  urlLabel: "URL",
  caseNumberJsonFieldNameLabel: "Case number JSON field name",
  caseNameJsonFieldNameLabel: "Case name JSON field name",
  defaultSensitivityLabel: "Default sensitivity",
  allowedProvenanceLabel: "Allowed provenance",
  isNonStrategicLabel: "Is non-strategic",
  subJurisdictionsLabel: "Sub-jurisdictions",
  yesText: "Yes",
  noText: "No",
  editButton: "Edit list type",
  deleteButton: "Delete list type",
  notSet: "Not set",
  noneSelected: "None selected",
  backLink: "Back to manage list types"
};
```

**`apps/web/src/pages/(system-admin)/add-list-type/en.ts`**
```typescript
export const en = {
  title: "Enter list type details",
  nameLabel: "Name",
  friendlyNameLabel: "Friendly name",
  welshFriendlyNameLabel: "Welsh friendly name",
  shortenedFriendlyNameLabel: "Shortened friendly name",
  urlLabel: "URL",
  caseNumberJsonFieldNameLabel: "Case number JSON field name",
  caseNameJsonFieldNameLabel: "Case name JSON field name",
  defaultSensitivityLabel: "Default sensitivity",
  defaultSensitivityHint: "Select the default sensitivity level",
  allowedProvenanceLabel: "Allowed provenance",
  allowedProvenanceHint: "Select all that apply",
  isNonStrategicLabel: "Is non-strategic?",
  yesOption: "Yes",
  noOption: "No",
  continueButton: "Continue",
  errorSummaryTitle: "There is a problem",
  duplicateNameError: "A list type with this name already exists"
};
```

**`apps/web/src/pages/(system-admin)/edit-list-type/en.ts`**
Same structure as `add-list-type/en.ts`, with `title: "Edit list type"`.

**`apps/web/src/pages/(system-admin)/manage-list-type/cy.ts`** — all values stubbed as `[WELSH TRANSLATION REQUIRED: '...']`.

**`apps/web/src/pages/(system-admin)/add-list-type/cy.ts`** — all values stubbed.

**`apps/web/src/pages/(system-admin)/edit-list-type/cy.ts`** — all values stubbed.

### Modified files

**`apps/web/src/pages/(system-admin)/manage-list-types/en.ts`**
Add `addNewButton: "Add new list type"`.

**`apps/web/src/pages/(system-admin)/manage-list-types/cy.ts`**
Add Welsh stub for `addNewButton`.

**`apps/web/src/pages/(system-admin)/configure-list-type-preview/en.ts`**
Add `caseNumberJsonFieldNameRow` and `caseNameJsonFieldNameRow` keys.

**`apps/web/src/pages/(system-admin)/configure-list-type-preview/cy.ts`**
Add Welsh stubs for the same keys.

**`apps/web/src/pages/(system-admin)/configure-list-type-success/en.ts`**
Change `title` to `"List type updated"` and `banner` to `"List type updated successfully."` to match the issue's acceptance criteria wording.

**`apps/web/src/pages/(system-admin)/configure-list-type-success/cy.ts`**
Welsh stub.

**`apps/web/src/pages/(system-admin)/system-admin-dashboard/en.ts`**
Remove the "Configure List Type" tile; update "Manage List Types" description.

**`apps/web/src/pages/(system-admin)/system-admin-dashboard/cy.ts`**
Same changes.

**`apps/web/src/pages/(system-admin)/delete-list-type/en.ts`**
No text changes needed — "Cancel" link copy is fine. The href is updated in the template.

---

## 9. Error Handling & Edge Cases

- **Non-numeric or missing `id` on `manage-list-type`** — 400 with an error page; same pattern as `delete-list-type`.
- **List type not found on `manage-list-type` or `edit-list-type` GET** — 404 render.
- **Broken session on `configure-list-type-select-sub-jurisdictions` or `configure-list-type-preview`** — redirect to `/manage-list-types` (not the old `/configure-list-type-enter-details`).
- **Name uniqueness** — checked in the `add-list-type` and `edit-list-type` POST handlers the same way it was in the old `configure-list-type-enter-details` handler. The DB-level unique index on `list_types.name` remains the safety net.
- **Artefact dependency on delete** — `hasArtefactsForListType` is already present and the `delete-list-type` handler already uses it. No changes required.
- **Cascading delete of `list_type_region` rows** — `onDelete: Cascade` on the `listTypeId` FK means rows are cleaned up when a list type is hard-deleted. Soft deletes leave junction rows in place (consistent with existing sub-jurisdiction behaviour).
- **`saveListType` transaction** — `updateListType` deletes existing `listTypeRegion` rows in the same transaction as it deletes `listTypeSubJurisdiction` rows before recreating both.

---

## 10. Open Questions / Assumptions

The following questions were raised in the prior spec comment and the responses have not been received. The default assumptions used in this plan are documented below.

| # | Question | Assumption used |
|---|----------|-----------------|
| 1 | Welsh translations — stub with English or supply translations? | Stub with `[WELSH TRANSLATION REQUIRED: '...']` markers. |
| 2 | Region selection — mandatory or optional? | **Optional** — no validation error if no regions are selected. If it must be mandatory this is a one-line change to add a `validateRegions` call in the POST handler. |
| 3 | `configure-list-type-enter-details` — remove or redirect? | **301 redirect** to `/manage-list-types`. The controller is kept as a thin redirect; the template files are left in place (unused). |
| 4 | `view-list-types` — remove or redirect? | **301 redirect** to `/manage-list-types`. Same approach. |
| 5 | `list-search-config` access from new detail screen? | **Out of scope.** The "Manage list type" detail screen does not link to `/list-search-config`. If required this can be added later. |
| 6 | Success page copy — "List type created" vs "List type updated" for add flow? | The issue's own acceptance criteria state the confirmation reads "List type updated" for both add and edit. This plan follows that wording. A `isAdd` flag in session can differentiate the copy if needed. |
| 7 | `locationType` field — include or omit from add/edit form? | **Omit.** The field does not appear in the issue's form field list and appears to be system-managed. Existing `locationType` values are preserved on update because the `updateListType` query does not touch that column. |
