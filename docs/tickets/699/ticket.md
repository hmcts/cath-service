# #699: Manage List Type Screens (Screens for adding jurisdictions and regions)

**State:** OPEN
**Assignees:** junaidiqbalmoj
**Author:** OgechiOkelu
**Labels:** enhancement
**Created:** 2026-06-10T13:46:48Z
**Updated:** 2026-07-14T10:17:25Z

## Description

**PROBLEM STATEMENT**
This ticket is raised to make changes to the System Admin Dashboard.

**AS A** Service
**I WANT** to update the System Admin Dashboard
**SO THAT** the list configuration process is consolidated

**ACCEPTANCE CRITERIA**
Merge the 'Manage List Types' and 'Configure List Types' tiles and re-name the merged/single tile to  'Manage List Types'

**Process Flow:**

**'Manage list type' process:**
Step 1: Log into the System Admin Dashboard and click on the 'Manage List Types' tile which proceeds to the 'Select list type' screen.
Step 2: Click on the 'Manage' link which proceeds to the 'Manage list type' screen.

**'Edit list type' process:**
Step 1: On the 'Manage List Type' screen, click on the 'Edit List Type' button which proceeds to the 'Edit List Type' screen.
Step 2: Populate the form (Data fields: Name, Friendly name, Welsh friendly name, Shortened friendly name, URL, Case number JSON field name, Case name JSON field name, Default sensitivity, Allowed provenance and 'Is non-strategic?) and click 'Continue' button which proceeds to the 'Select sub-jurisdiction and region' screen.
Step 3: On the 'Select Sub-Jurisdiction and region' screen, check the boxes for the sub-jurisdictions to be linked to the list type (Type of criminal court, Type of civil court, Type of family court and Type of tribunal sub-jurisdiction options provided as check boxes under each jurisdiction title in an accordion) and the region. Accordions are open by default. Click 'Continue' button to proceed to the summary screen.
Step 4: On the Summary screen titled 'Check list type details', check the details and click 'Change' link beside any detail to be updated (takes user back to 'Edit List Type' screen) or 'Confirm' to proceed if the details are correct. 'Confirm' button takes user to the final confirmation screen titled 'List type updated'.

**'Delete list type' process:**
Step 1: On the 'Manage List Type' screen, click on the 'Delete List Type' button which proceeds to the 'Are you sure you want to delete list type' screen.
Step 2: Click on the 'Confirm' to proceed if the details are correct. 'Confirm' button takes user to the final confirmation screen titled 'list type deleted'.

**'Add new list type' process:**
Step 1: On the 'Select List Type' screen, click on the 'Add New List Type' button which proceeds to the 'Enter List Type' screen.
Step 2: Populate the form (Data fields: Name, Friendly name, Welsh friendly name, Shortened friendly name, URL, Case number JSON field name, Case name JSON field name, Default sensitivity, Allowed provenance and 'Is non-strategic?) and click 'Continue' button which proceeds to the 'Select sub-jurisdiction and region' screen.
Step 3: On the 'Select sub-jurisdiction and region' screen, check the boxes for the sub-jurisdictions to be linked to the list type (Type of criminal court, Type of civil court, Type of family court and Type of tribunal sub-jurisdiction options provided as check boxes under each jurisdiction title in an accordion) and the region. Accordions are open by default. Click 'Continue' button to proceed to the 'Summary' screen.
Step 3: On the Summary screen titled 'Check list details', check the details and click 'Change' link beside any detail to be updated (takes user back to 'Add List Configuration' screen) or 'Confirm' to proceed if the details are correct. 'Confirm' button takes user to the final confirmation screen titled 'List type updated'.

## Comments

### Comment by OgechiOkelu on 2026-06-15T13:27:33Z
@spec

### Comment by OgechiOkelu on 2026-06-19T09:16:50Z
@SPEC

### Comment by hmctsclaudecode on 2026-06-19T09:22:12Z
# Technical Specification: Manage List Type Screens (Issue #699)

## 1. User Story
**As a** System Admin user
**I want to** manage list types (add, edit and delete) and link them to sub-jurisdictions and regions through a single consolidated journey
**So that** the list configuration process is consolidated into one place and I no longer have to use two separate, overlapping dashboard tiles

## 2. Background

The System Admin Dashboard currently exposes **two separate tiles** that overlap in purpose:

| Tile | Current route | Purpose |
|------|---------------|---------|
| Manage List Types | `/manage-list-types` | Simple Name / Manage table linking to `/list-search-config/<id>` |
| Configure List Type | `/configure-list-type-enter-details` | Full 4‑step create/edit flow (enter details → select sub-jurisdictions → preview → success) |

This split confuses System Admin users: "managing" and "configuring" a list type are not distinct tasks. This ticket merges the two tiles into a **single "Manage List Types" tile** and restructures the journey into the screen names defined in the issue, while adding two capabilities not present today:

1. **Region selection** alongside sub-jurisdiction selection (no `ListTypeRegion` relationship exists yet).
2. **Case number / Case name JSON field name** form fields (not present on the `ListType` model today).

Existing related building blocks that will be reused or refactored:
- `apps/web/src/pages/(system-admin)/configure-list-type-enter-details/` – form + validation
- `apps/web/src/pages/(system-admin)/configure-list-type-select-sub-jurisdictions/` – checkbox selection
- `apps/web/src/pages/(system-admin)/configure-list-type-preview/` – check-answers summary
- `apps/web/src/pages/(system-admin)/configure-list-type-success/` – confirmation panel
- `apps/web/src/pages/(system-admin)/delete-list-type/` and `delete-list-type-success/`
- `apps/web/src/pages/(system-admin)/view-list-types/` – full listing with Edit/Delete actions
- Services in `libs/system-admin-pages/src/list-type/` (`queries.ts`, `service.ts`, `validation.ts`, `types.ts`)
- Data model in `libs/postgres-prisma/prisma/schema/location.prisma`

## 3. Acceptance Criteria

* **Scenario:** Single consolidated tile on the dashboard
    * **Given** I am a signed-in System Admin on the System Admin Dashboard
    * **When** the dashboard renders
    * **Then** I see a single tile titled "Manage List Types" (the former "Configure List Types" tile is removed) describing view/create/update/delete of list types
    * **And** clicking it takes me to the "Select list type" screen

* **Scenario:** Navigate to manage a list type
    * **Given** I am on the "Select list type" screen
    * **When** I click the "Manage" link next to a list type
    * **Then** I am taken to the "Manage list type" screen showing that list type's details with "Edit list type", "Delete list type" buttons

* **Scenario:** Edit an existing list type
    * **Given** I am on the "Manage list type" screen
    * **When** I click "Edit list type", populate the form and click "Continue"
    * **Then** I proceed to the "Select sub-jurisdiction and region" screen
    * **And** when I select sub-jurisdictions and regions and click "Continue"
    * **Then** I see the "Check list type details" summary screen
    * **And** clicking "Confirm" saves the changes and shows the "List type updated" confirmation

* **Scenario:** Add a new list type
    * **Given** I am on the "Select list type" screen
    * **When** I click "Add new list type", complete the form, select sub-jurisdictions and regions, review and click "Confirm"
    * **Then** the new list type is created and I see the "List type updated" confirmation

* **Scenario:** Delete a list type
    * **Given** I am on the "Manage list type" screen
    * **When** I click "Delete list type" and then "Confirm"
    * **Then** the list type is soft-deleted and I see the "List type deleted" confirmation
    * **And** if the list type has existing artefacts, deletion is blocked with an explanatory error

## 4. User Journey Flow

```
System Admin Dashboard
        │  click "Manage List Types" tile
        ▼
[1] Select list type  (/manage-list-types)
        │
        ├──► "Manage" link ─────────────► [2] Manage list type (/manage-list-type?id=<id>)
        │                                       │
        │                                       ├──► "Edit list type" ──► [3] Edit list type (/edit-list-type?id=<id>)
        │                                       │
        │                                       └──► "Delete list type" ─► [7] Are you sure...delete (/delete-list-type?id=<id>)
        │
        └──► "Add new list type" ───────► [3b] Enter list type (/add-list-type)

[3]/[3b] Enter / Edit list type form
        │  Continue
        ▼
[4] Select sub-jurisdiction and region (/configure-list-type-select-sub-jurisdictions)
        │  Continue
        ▼
[5] Check list type details (summary)  (/configure-list-type-preview)
        │  Confirm
        ▼
[6] List type updated (success)  (/configure-list-type-success)

[7] Are you sure you want to delete list type (/delete-list-type?id=<id>)
        │  Confirm
        ▼
[8] List type deleted (success)  (/delete-list-type-success)
```

## 5. New DB Fields Required

- `ListType.caseNumberJsonFieldName` (`case_number_json_field_name`, nullable VarChar(255))
- `ListType.caseNameJsonFieldName` (`case_name_json_field_name`, nullable VarChar(255))
- New `ListTypeRegion` junction table linking `list_type` ↔ `region`

## 6. Open Questions (from prior spec comment)

1. Welsh translations for new content — stub with English or have actual translations?
2. Region selection — mandatory or optional?
3. `configure-list-type-enter-details` — remove or redirect?
4. `view-list-types` — remove or redirect?
5. `list-search-config` access — remain accessible from "Manage list type" detail screen?
6. Success page copy — "List type created" vs "List type updated" for add flow?
7. `locationType` field — omit from add/edit form?

### Comment by OgechiOkelu on 2026-06-19T09:22:57Z
@plan

### Comment by OgechiOkelu on 2026-06-22T09:22:26Z
@plan

### Comment by hmctsclaudecode on 2026-06-22T09:28:42Z
## Technical Plan — Clarifications Needed

The plan has been committed to branch `feature/699-manage-list-type-screens` at `docs/tickets/699/plan.md`. Before implementation begins, please confirm the following:

**1. Welsh translations for new content**
The plan introduces several new strings (e.g. "Enter list type", "Manage list type", "Select sub-jurisdiction and region", region section heading, new summary row labels, etc.). Do you have Welsh translations for these, or should they be stubbed with English text for now?

**2. Region selection — mandatory or optional?**
The journey includes a region checkboxes section on the "Select sub-jurisdiction and region" screen. Must the user select at least one region, or is it optional?

**3. `configure-list-type-enter-details` — remove or redirect?**
This existing page is being replaced by the new `add-list-type` and `edit-list-type` pages. Should it be removed entirely, or kept as a redirect to `/manage-list-types`?

**4. `view-list-types` — remove or redirect?**
The new "Manage list type" detail screen replaces this page's purpose. Should `/view-list-types` be removed or redirected to `/manage-list-types`?

**5. `list-search-config` access**
Under the current flow, the "Manage List Types" table links to `/list-search-config/<id>`. The new plan removes that link from the listing screen. Should the list search config remain accessible from the new "Manage list type" detail screen, or is it out of scope for this ticket?

**6. Success page copy — add vs edit**
The issue describes the add-flow confirmation as "List type updated" (same as the edit flow). Should the add confirmation read "List type created" instead, or "List type updated" for both? Please confirm with your content designer.

**7. `locationType` field**
The existing `ListType` model has a `locationType` field that does not appear in the issue's form field list. Should it be omitted from the add/edit form (keeping existing behaviour — not user-editable)?
