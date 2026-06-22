# Technical Plan: Issue #699 — Manage List Type Screens

## 1. Technical Approach

Consolidate the two overlapping System Admin Dashboard tiles ("Manage List Types" and "Configure List Type") into a single "Manage List Types" tile, then restructure the journey to match the screen flow described in the issue. This requires:

1. **Dashboard**: Remove "Configure List Type" tile; update "Manage List Types" description.
2. **New screens**: Add `manage-list-type` (detail/action page), `add-list-type` (add form), `edit-list-type` (edit form).
3. **Extend existing screens**: Update `configure-list-type-select-sub-jurisdictions` to group by jurisdiction using `govukAccordion` and add region checkboxes; update `configure-list-type-preview` to show new fields and regions.
4. **Data model**: Add two new nullable fields (`case_number_json_field_name`, `case_name_json_field_name`) to `ListType`; add a new `ListTypeRegion` junction table; extend queries and service layer.
5. **Repurpose `manage-list-types`**: Change from "Name + configure link" table to "Name + Manage link" table with "Add new list type" button — this becomes the "Select list type" screen.

Existing pages being removed or redirected:
- `view-list-types/` — superseded by the new `manage-list-type` detail screen; redirect to `/manage-list-types`.
- The standalone `/configure-list-type-enter-details` entry point is no longer a dashboard tile; the page itself remains but is now reached only via `/edit-list-type?id=` or `/add-list-type`.

## 2. User Journey

```
Dashboard
  └─ "Manage List Types" tile ──► [1] /manage-list-types  (Select list type)
                                       │
                                       ├─ "Manage" link ──► [2] /manage-list-type?id=<id>
                                       │                         │
                                       │                         ├─ "Edit list type" ──► [3] /edit-list-type?id=<id>
                                       │                         │                              │ Continue (POST)
                                       │                         │                              ▼
                                       │                         └─ "Delete list type" ─► [7] /delete-list-type?id=<id>
                                       │                                                         │ Confirm (POST)
                                       │                                                         ▼
                                       │                                                  [8] /delete-list-type-success
                                       │
                                       └─ "Add new list type" ──► [3b] /add-list-type
                                                                           │ Continue (POST)
                                                                           ▼
                                                            [4] /configure-list-type-select-sub-jurisdictions
                                                                           │ Continue (POST)
                                                                           ▼
                                                            [5] /configure-list-type-preview
                                                                           │ Confirm (POST)
                                                                           ▼
                                                            [6] /configure-list-type-success
```

Both add and edit converge at screen [4] through [6]. The `editId` in session distinguishes create vs update.

## 3. Database Changes

### New fields on `ListType`

```prisma
caseNumberJsonFieldName  String?  @map("case_number_json_field_name") @db.VarChar(255)
caseNameJsonFieldName    String?  @map("case_name_json_field_name")   @db.VarChar(255)
```

### New junction table `ListTypeRegion`

```prisma
model ListTypeRegion {
  id         Int @id @default(autoincrement())
  listTypeId Int @map("list_type_id")
  regionId   Int @map("region_id")

  listType ListType @relation(fields: [listTypeId], references: [id], onDelete: Cascade)
  region   Region   @relation(fields: [regionId],   references: [regionId])

  @@unique([listTypeId, regionId])
  @@map("list_types_regions")
}
```

Add `regions ListTypeRegion[]` relation back-reference to `ListType`.
Add `listTypes ListTypeRegion[]` relation back-reference to `Region`.

Run `yarn db:migrate:dev` to generate and apply migration.

## 4. Service Layer Changes (`libs/system-admin-pages/src/list-type/`)

### `types.ts`
- Add `caseNumberJsonFieldName?: string` and `caseNameJsonFieldName?: string` to `ListTypeFormData`.
- Add `regionIds: number[]` to `ListTypeFormData`.

### `queries.ts`
- `findAllListTypes` / `findListTypeById`: include `regions` relation in select.
- `createListType` / `updateListType`: accept and write `caseNumberJsonFieldName`, `caseNameJsonFieldName`, `regionIds`; mirror the sub-jurisdiction cascade-delete pattern for regions in `updateListType`.
- Add `findAllRegions()` — `prisma.region.findMany({ orderBy: { name: 'asc' } })`.

### `validation.ts`
- Add optional max-length checks (255 chars) for `caseNumberJsonFieldName` and `caseNameJsonFieldName` to `validateListTypeDetails`.
- Update `ListTypeDetailsInput` interface to include the new fields.

### `index.ts` (lib exports)
- Export `findAllRegions`.

## 5. Page Changes

### [1] `apps/web/src/pages/(system-admin)/manage-list-types/`
**Change**: The GET handler currently maps list types to `{ id, name, configureUrl }` pointing at `/list-search-config/<id>`. Change it to map to `{ id, name, manageUrl: '/manage-list-type?id=<id>' }`. Add "Add new list type" button to template. Update `en.ts`/`cy.ts` content keys.

### [2] NEW: `apps/web/src/pages/(system-admin)/manage-list-type/`
New page. GET handler: read `id` from `req.query`, call `findListTypeById(id)` (400 on invalid id, 404 if not found). Render summary list of all list type details including sub-jurisdictions and regions. Template has two buttons: "Edit list type" → `/edit-list-type?id=<id>` and "Delete list type" (warning button) → `/delete-list-type?id=<id>`.

### [3] NEW: `apps/web/src/pages/(system-admin)/edit-list-type/`
New page. Structurally mirrors `configure-list-type-enter-details/index.ts` but:
- Title is "Edit list type".
- GET: requires `id` query param; loads from DB into session (same logic as current `getHandler` in `configure-list-type-enter-details` when `editId` is present).
- POST: validates, stores in session with `editId`, redirects to `/configure-list-type-select-sub-jurisdictions`.
- Form includes the two new JSON field name inputs.

### [3b] NEW: `apps/web/src/pages/(system-admin)/add-list-type/`
New page. Mirrors the add-mode of `configure-list-type-enter-details`:
- Title is "Enter list type".
- GET: clears session `configureListType`, shows empty form.
- POST: validates, stores in session (no `editId`), redirects to `/configure-list-type-select-sub-jurisdictions`.
- Same form fields including the two new JSON field name inputs.

### [4] EXTEND: `apps/web/src/pages/(system-admin)/configure-list-type-select-sub-jurisdictions/`
**Changes**:
- GET: also fetch `findAllSubJurisdictions()` with jurisdiction info (need to update query to include `jurisdictionId` and join `Jurisdiction` name), and `findAllRegions()`. Group sub-jurisdictions by jurisdiction for the accordion. Pre-check selected region IDs from session.
- POST: parse `regionIds` from body alongside `subJurisdictionIds`; store both in session; redirect to `/configure-list-type-preview`.
- Template: replace flat `govukCheckboxes` with `govukAccordion` (open by default, one section per jurisdiction containing a checkboxes component), followed by a separate "Regions" `govukCheckboxes` block.
- Update `en.ts`/`cy.ts` for new heading and region label.

To group sub-jurisdictions by jurisdiction, extend `findAllSubJurisdictions` to include the jurisdiction (or add a new query `findAllSubJurisdictionsWithJurisdiction` that joins `Jurisdiction`).

### [5] EXTEND: `apps/web/src/pages/(system-admin)/configure-list-type-preview/`
**Changes**:
- GET: include new fields (case number/name JSON field names) and regions in the summary list.
- POST: pass `caseNumberJsonFieldName`, `caseNameJsonFieldName`, `regionIds` through to `saveListType()`.
- Update `en.ts`/`cy.ts` for new row labels.

### [6] `configure-list-type-success/` — no structural change. Review copy: success page currently says "List type updated" for both add and edit. The issue uses "List type updated" for the edit confirmation too. Keep as-is unless product confirms different copy for add vs edit.

### [7] `delete-list-type/` — no structural change needed. Currently navigates from the old `view-list-types` page. The back link target should change to `/manage-list-type?id=<id>`.

### [8] `delete-list-type-success/` — no structural change needed.

### Dashboard: `apps/web/src/pages/(system-admin)/system-admin-dashboard/en.ts` and `cy.ts`
- Remove "Configure List Type" tile entry.
- Update "Manage List Types" description to "View, create, update and delete list type configurations".

### Redirect `view-list-types/`
Add a GET redirect from `/view-list-types` to `/manage-list-types` to avoid broken links.

### Remove `configure-list-type-enter-details/` as a standalone entry point
The page can remain (since edit/add now use dedicated pages that duplicate its logic) or be removed once the new pages exist. Recommended: remove it and replace with the two dedicated pages; update any existing links.

## 6. Sub-jurisdiction Query Extension

`findAllSubJurisdictions` currently returns `{ subJurisdictionId, name, welshName }` with no jurisdiction grouping info. Add a new query in `queries.ts`:

```typescript
export async function findAllSubJurisdictionsGrouped() {
  return prisma.jurisdiction.findMany({
    orderBy: { name: 'asc' },
    select: {
      jurisdictionId: true,
      name: true,
      welshName: true,
      subJurisdictions: {
        orderBy: { name: 'asc' },
        select: {
          subJurisdictionId: true,
          name: true,
          welshName: true
        }
      }
    }
  });
}
```

Use this in the select sub-jurisdictions page to build the accordion sections.

## 7. Template Changes

### `manage-list-types/index.njk`
- Change table column from "Configure" to "Action".
- Change link text from the current "configure" link to "Manage".
- Add `govukButton` for "Add new list type" above the table.

### `manage-list-type/index.njk` (NEW)
- `govukSummaryList` with all list type fields including regions and sub-jurisdictions.
- Two `govukButton`s: "Edit list type" (primary) and "Delete list type" (warning/red).

### `add-list-type/index.njk` and `edit-list-type/index.njk` (NEW)
- Same form as current `configure-list-type-enter-details/index.njk` but with two additional `govukInput` rows for case number and case name JSON field names.
- Page `<h1>` differs: "Enter list type" vs "Edit list type".

### `configure-list-type-select-sub-jurisdictions/index.njk` (EXTEND)
- Replace flat checkboxes block with `govukAccordion` macro, each section containing a `govukCheckboxes` block for its sub-jurisdictions.
- Add a separate `govukCheckboxes` block for regions below the accordion.

### `configure-list-type-preview/index.njk` (EXTEND)
- Add rows for case number JSON field name, case name JSON field name, and regions.

## 8. Validation Changes

In `validation.ts`:
- `validateListTypeDetails`: add optional max-length (255) checks for `caseNumberJsonFieldName` and `caseNameJsonFieldName`.
- No region validation needed (optional per assumption — confirm with product).

## 9. Error Handling & Edge Cases

- Invalid/missing `id` on `/manage-list-type`, `/edit-list-type`, `/delete-list-type`: return 400.
- List type not found: return 404.
- Session missing on `/configure-list-type-select-sub-jurisdictions` or `/configure-list-type-preview`: redirect to `/manage-list-types`.
- Deletion blocked when artefacts exist: re-render delete page with error (already handled).
- Duplicate name on create/edit: handled by `saveListType()` service; surface as form error.

## 10. Open Questions / CLARIFICATIONS NEEDED

1. **Welsh translations**: The issue does not supply Welsh strings for the new content. Welsh placeholders should be provided by a content designer before this ships. The implementation can use English strings as stubs with `[WELSH NEEDED]` markers.

2. **Region selection mandatory?** The issue shows region checkboxes but does not state that at least one must be selected. Current assumption: optional. Confirm.

3. **`configure-list-type-enter-details` fate**: Should the existing page be removed (all callers replaced by `add-list-type` and `edit-list-type`)? Or kept as a redirect? Removing it is cleaner.

4. **`view-list-types` fate**: Should it be removed or just redirected? The new `manage-list-type` detail page replaces its purpose.

5. **`list-search-config` link**: The current `/manage-list-types` links to `/list-search-config/<id>`. Under the new flow, this link disappears from the "Select list type" screen. Is `/list-search-config` reachable from elsewhere (e.g. the new "Manage list type" detail screen)?

6. **Success page copy**: The issue says both add and edit end at "List type updated". Should add say "List type created" instead? Confirm with content designer.

7. **`locationType` field**: The existing `ListType` model has a `locationType` field not mentioned in the issue form. Is it still in scope? Currently not shown in any UI. Keep as-is.
