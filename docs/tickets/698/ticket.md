# #698: Add/Update provenance for all lists

**State:** OPEN
**Assignees:** None
**Author:** OgechiOkelu
**Labels:** type:story, epic:public-journey
**Created:** 2026-06-10T12:57:31Z
**Updated:** 2026-08-21T17:53:30Z

## Description

**PROBLEM STATEMENT**
This ticket is raised to add/update the provenance for all the lists in CaTH. 

**AS A** Service
**I WANT** to add/update the provenance for all list types in CaTH
SO THAT the provenance  can be up to date

**ACCEPTANCE CRITERIA**
The provenance for all the lists in CaTH are added/updated through the system admin dashboard

## Comments

### Comment by OgechiOkelu on 2026-08-21T17:43:10Z

@spec

### Comment by hmctsclaudecode on 2026-08-21T17:52:31Z

# Technical Specification — Issue #698: Add/Update provenance for all lists

## 1. User Story

**As a** System Admin maintaining CaTH reference data
**I want to** view and update the allowed provenance for every list type from the System Admin dashboard, and have those values survive a deployment
**So that** the provenance allow-list that gates access to classified publications is correct, auditable, and consistent across every environment

## 2. Background

### What "provenance" means on a list type

`list_types.allowed_provenance` (`ListType.allowedProvenance`, `libs/postgres-prisma/prisma/schema/location.prisma:54`) is a comma-separated allow-list of **user identity provenances**. It is not the publication source provenance.

Two distinct taxonomies exist and are easily confused:

| Taxonomy | Values | Stored on | Used for |
|---|---|---|---|
| **User provenance** (identity provider) | `CFT_IDAM`, `CRIME_IDAM`, `PI_AAD`, `B2C_IDAM`, `SSO` | `user.user_provenance`, `req.user.provenance` | `list_types.allowed_provenance` — gates classified list access |
| **Publication provenance** (source system) | `MANUAL_UPLOAD`, `SNL`, `COMMON_PLATFORM`, `CP_CATH`, `PDDA` (`libs/publication/src/provenance.ts`) | `artefact.provenance` | Recording where a publication came from |

The only consumer of `allowedProvenance` is the classified-access branch of `canAccessPublication` (`libs/publication/src/authorisation/service.ts:31-35`):

```typescript
if (sensitivity === Sensitivity.CLASSIFIED) {
  if (!isVerifiedUser(user)) return false;
  if (!listType) return false;
  return !!user.provenance && listType.provenance.split(",").includes(user.provenance);
}
```

Because the check requires `role === "VERIFIED"`, only provenances a verified user can actually hold are meaningful: `CFT_IDAM`, `CRIME_IDAM`, `PI_AAD`. `SSO` users are admins (never `VERIFIED`), so `SSO` in this column would be a no-op. Media accounts are persisted as `B2C_IDAM` (`libs/account/src/repository/service.ts:24`) but their **session** provenance is set to `PI_AAD` (`apps/web/src/pages/(auth)/login/return/index.ts:216`), so `PI_AAD` is the correct runtime token for this column.

`allowedProvenance` is also read — and passed straight back into the same authorisation functions — by:
- `libs/publication/src/authorisation/middleware.ts:93`
- `apps/web/src/pages/(public)/summary-of-publications/index.ts:56`
- `apps/web/src/pages/(list-types)/sjp-press-list/require-verified-with-provenance.ts:30`
- `apps/web/src/pages/(list-types)/sjp-press-list/list-download-disclaimer.ts:26`

### Current state of the data (77 list types in `libs/list-types/common/src/list-type-data.ts`)

| Value | Count |
|---|---|
| `CFT_IDAM` | 61 |
| `CRIME_IDAM` | 8 |
| `PI_AAD` | 5 |
| `CRIME_IDAM,PI_AAD` | 2 |
| `MANUAL_UPLOAD` | 1 |

### Three defects this ticket must resolve

**Defect 1 — dashboard edits are reverted on every deploy.** The generated deploy seed overwrites `allowed_provenance` for existing rows (`apps/postgres/prisma/generate-seed-sql.ts:136`):

```sql
INSERT INTO list_types (...) VALUES ...
ON CONFLICT (name) DO UPDATE SET
  ...
  allowed_provenance = EXCLUDED.allowed_provenance,
  ...
```

Any provenance set through the dashboard is silently reverted to the `list-type-data.ts` value on the next deploy of `apps/postgres`. The acceptance criterion ("updated through the system admin dashboard") cannot be met while this clause stands.

**Defect 2 — `PHT_WEEKLY_HEARING_LIST` holds a publication provenance.** Its `provenance` is `MANUAL_UPLOAD` (`list-type-data.ts:702`), which no user can ever hold. Its `defaultSensitivity` is `null`, and `canAccessPublication` defaults a falsy artefact sensitivity to `CLASSIFIED` — so a classified PHT artefact is invisible to every verified user and reachable only by `SYSTEM_ADMIN`.

**Defect 3 — the value cannot be corrected through the dashboard.** `PROVENANCE_OPTIONS` in `libs/system-admin-pages/src/list-type/validation.ts:2` is `["CFT_IDAM", "PI_AAD", "CRIME_IDAM"]`, and the checkbox items are hardcoded three times over (`add-list-type/index.njk:100-104`, `edit-list-type/index.njk:100-105`, plus the `checkedProvenance` objects in both controllers). Opening `PHT_WEEKLY_HEARING_LIST` in `/edit-list-type` renders zero checkboxes ticked and, on submit, silently discards `MANUAL_UPLOAD` — the admin cannot see what the current value is, only that nothing is selected.

### Why this is not just a data patch

`list-type-data.ts` is the documented single source of truth for list type reference data (CLAUDE.md, "List Type Implementation" item 7) and the file the deploy seed is generated from. Correcting the 77 values there is necessary for fresh environments. The AC additionally requires the dashboard to be the operational route for change, which means the seed must stop asserting ownership of this one column after initial insert.

### Existing journey being extended

```
/system-admin-dashboard
  └─> /manage-list-types                          (table: friendly name + "Manage")
        └─> /manage-list-type?id=N                (read-only detail, shows Allowed provenance)
              └─> /edit-list-type?id=N            (full 11-field form)
                    └─> /configure-list-type-select-sub-jurisdictions
                          └─> /configure-list-type-preview   (POST → saveListType)
                                └─> /configure-list-type-success
```

Updating provenance alone currently costs four page loads and re-submission of ten unrelated fields, for each of 77 list types.

## 3. Acceptance Criteria

* **Scenario:** Admin can see the allowed provenance of every list type at a glance
    * **Given** I am signed in as a `SYSTEM_ADMIN`
    * **When** I open `/manage-list-types`
    * **Then** the table shows an "Allowed provenance" column for each of the 77 list types, rendering each stored value as a comma-separated list of human-readable labels, and "Not set" where the column is empty

* **Scenario:** Admin updates provenance for a single list type without touching other fields
    * **Given** I am on `/manage-list-type?id=N` for a list type whose allowed provenance is `CFT_IDAM`
    * **When** I select the "Change" link next to "Allowed provenance", tick `CRIME_IDAM` in addition to `CFT_IDAM`, and select "Save and continue"
    * **Then** `list_types.allowed_provenance` for that row is `CFT_IDAM,CRIME_IDAM`, no other column on the row is modified, and I am returned to `/manage-list-types` with a success notification banner naming the list type

* **Scenario:** Existing provenance is pre-selected when the update page opens
    * **Given** a list type with allowed provenance `CRIME_IDAM,PI_AAD`
    * **When** I open `/update-list-type-provenance?id=N`
    * **Then** the `CRIME_IDAM` and `PI_AAD` checkboxes are checked and `CFT_IDAM` is unchecked

* **Scenario:** An unrecognised stored value is surfaced rather than silently dropped
    * **Given** a list type whose allowed provenance contains a value outside the valid option set (for example the current `MANUAL_UPLOAD` on `PHT_WEEKLY_HEARING_LIST`)
    * **When** I open `/update-list-type-provenance?id=N`
    * **Then** an inset text block tells me the current stored value is not a recognised provenance and must be replaced, no checkbox is pre-selected, and I cannot submit without selecting at least one valid provenance

* **Scenario:** At least one provenance must be selected
    * **Given** I am on `/update-list-type-provenance?id=N`
    * **When** I select "Save and continue" with no checkbox ticked
    * **Then** an error summary titled "There is a problem" appears above the heading containing "Select at least one allowed provenance", linked to `#allowedProvenance`, and no database write occurs

* **Scenario:** Reference data baseline is corrected for new environments
    * **Given** a freshly provisioned environment
    * **When** the `apps/postgres` deploy seed runs
    * **Then** every one of the 77 rows in `list_types` has an `allowed_provenance` drawn only from `CFT_IDAM`, `CRIME_IDAM`, `PI_AAD`, and `PHT_WEEKLY_HEARING_LIST` no longer holds `MANUAL_UPLOAD`

* **Scenario:** Dashboard changes survive a deployment
    * **Given** an admin has changed a list type's allowed provenance through the dashboard to a value that differs from `list-type-data.ts`
    * **When** `apps/postgres` is redeployed and the generated seed SQL is applied
    * **Then** the dashboard-set value is still in the database — the `ON CONFLICT ... DO UPDATE` clause no longer assigns `allowed_provenance`
    * **And** every other reconciled column (`friendly_name`, `welsh_friendly_name`, `shortened_friendly_name`, `url`, `default_sensitivity`, `is_non_strategic`, `deleted_at`) continues to be reconciled as before

* **Scenario:** The change is auditable
    * **Given** I am signed in as a `SYSTEM_ADMIN`
    * **When** I successfully update a list type's allowed provenance
    * **Then** an audit log entry with action `UPDATE_LIST_TYPE_PROVENANCE` is written, recording my user id, email, role, the list type name, and the previous and new provenance values
    * **And** that entry is visible at `/audit-log-list`

* **Scenario:** Welsh
    * **Given** the interface language is Welsh
    * **When** I visit `/manage-list-types` or `/update-list-type-provenance?id=N`
    * **Then** all headings, labels, hint text, button text, error messages and the success banner are rendered in Welsh, and the provenance codes themselves remain untranslated

* **Scenario:** Non-admins are refused
    * **Given** I am signed out, or signed in with any role other than `SYSTEM_ADMIN`
    * **When** I request `/update-list-type-provenance?id=N` by either GET or POST
    * **Then** I am refused by `requireRole([USER_ROLES.SYSTEM_ADMIN])` exactly as the other System Admin pages refuse, and no write occurs

## 4. User Journey Flow

### Primary journey — bulk correction of provenance across many list types

```
┌──────────────────────────┐
│ /system-admin-dashboard  │
│  "Manage list types"     │
└────────────┬─────────────┘
             │
             ▼
┌────────────────────────────────────────────────────────┐
│ /manage-list-types                                     │
│  Table of 77 list types                                │
│  NEW: "Allowed provenance" column (audit at a glance)  │
│  Row actions: "Manage"  |  NEW: "Change provenance"    │
└──────┬──────────────────────────────┬──────────────────┘
       │ Manage                       │ Change provenance
       ▼                              │
┌──────────────────────────────┐      │
│ /manage-list-type?id=N       │      │
│  Read-only detail table      │      │
│  NEW: "Change" link on the   │      │
│  Allowed provenance row      │      │
└──────┬───────────────────────┘      │
       │                              │
       └──────────────┬───────────────┘
                      ▼
      ┌───────────────────────────────────────────────┐
      │ /update-list-type-provenance?id=N             │
      │  One question: which provenances are allowed? │
      │  Checkboxes pre-ticked from current value     │
      │  Back link → referring page                   │
      └──────┬────────────────────────────┬───────────┘
             │ nothing selected           │ ≥1 selected
             ▼                            ▼
      ┌──────────────────────┐   ┌──────────────────────────────┐
      │ Re-render with       │   │ updateListTypeProvenance()   │
      │ error summary        │   │ audit log entry              │
      │ (no DB write)        │   │ 303 redirect                 │
      └──────────────────────┘   └──────────────┬───────────────┘
                                                ▼
                             ┌──────────────────────────────────────┐
                             │ /manage-list-types                   │
                             │  Success notification banner:        │
                             │  "Allowed provenance updated for     │
                             │   <list type name>"                  │
                             │  Table already shows the new value   │
                             │  → admin continues to the next row   │
                             └──────────────────────────────────────┘
```

The loop back to `/manage-list-types` (rather than to a standalone success page as `/configure-list-type-success` does) is deliberate: the task in this ticket is to work through all 77 list types, so the journey must return the admin to the work list with the change visible. This uses the GOV.UK notification banner "confirm an action" pattern.

### Unchanged journey

`/add-list-type` and `/edit-list-type` keep their provenance checkbox group. They are only touched to consume the shared option constant instead of hardcoding the three values, so the two routes cannot drift apart.

### Data flow

```
list-type-data.ts  ──generate-seed-sql.ts──►  INSERT ... ON CONFLICT
  (baseline for                                 ├─ on INSERT: sets allowed_provenance
   new environments)                            └─ on CONFLICT: NO LONGER touches it
                                                          │
System Admin dashboard ──updateListTypeProvenance()──►  list_types.allowed_provenance
                                                          │
                                                          ▼
                            canAccessPublication() ── classified access decision
```

## 5. Low Fidelity Wireframe

### 5.1 `/manage-list-types` — with the new provenance column

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ GOV.UK  Court and tribunal hearings                        English | Cymraeg │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Manage list types                                        (h1, heading-l)    │
│                                                                              │
│  ┌───────────────────────┐                                                   │
│  │ Add new list type     │  (secondary button)                               │
│  └───────────────────────┘                                                   │
│                                                                              │
│  Name                          Allowed provenance        Actions             │
│  ──────────────────────────────────────────────────────────────────────────  │
│  Civil Daily Cause List        CFT IDAM              Manage | Change         │
│                                                               provenance     │
│  ──────────────────────────────────────────────────────────────────────────  │
│  Crown Daily List              Crime IDAM            Manage | Change         │
│                                                               provenance     │
│  ──────────────────────────────────────────────────────────────────────────  │
│  Magistrates Public List       Crime IDAM,           Manage | Change         │
│                                B2C / Media                    provenance     │
│  ──────────────────────────────────────────────────────────────────────────  │
│  Primary Health Tribunal       MANUAL_UPLOAD         Manage | Change         │
│  Weekly Hearing List           (not recognised)               provenance     │
│  ──────────────────────────────────────────────────────────────────────────  │
│  ... 73 more rows ...                                                        │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 5.2 `/manage-list-type?id=N` — Change link added to the provenance row

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  Manage list type                                         (h1, heading-l)    │
│                                                                              │
│  Name                        │ CIVIL_DAILY_CAUSE_LIST      │                 │
│  Friendly name               │ Civil Daily Cause List      │                 │
│  Welsh friendly name         │ Civil Daily Cause List      │                 │
│  Shortened friendly name     │ Civil Daily Cause List      │                 │
│  URL                         │ civil-daily-cause-list      │                 │
│  Case number JSON field name │                             │                 │
│  Case name JSON field name   │                             │                 │
│  Default sensitivity         │ Public                      │                 │
│  Allowed provenance          │ CFT IDAM                    │ Change  ◄── NEW │
│  Is non-strategic            │ No                          │                 │
│  Sub-jurisdictions           │ Civil                       │                 │
│                                                                              │
│  ┌──────────────────┐  ┌────────────────────┐                                │
│  │ Edit list type   │  │ Delete list type   │ (warning)                      │
│  └──────────────────┘  └────────────────────┘                                │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 5.3 `/update-list-type-provenance?id=N` — the one-question page

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  ‹ Back                                                                      │
│                                                                              │
│  Civil Daily Cause List                            (caption-l, span)         │
│  Which user provenances are allowed to               (h1 = legend, l)         │
│  access this list type?                                                      │
│                                                                              │
│  This only affects publications with a sensitivity of Classified.            │
│  Select all that apply.                              (hint)                  │
│                                                                              │
│   [x] CFT IDAM                                                               │
│       Professional users signing in through CFT IDAM                         │
│   [ ] Crime IDAM                                                             │
│       Professional users signing in through Crime IDAM                       │
│   [ ] B2C / Media                                                            │
│       Verified media accounts                                                │
│                                                                              │
│  ┌────────────────────┐                                                      │
│  │ Save and continue  │                                                      │
│  └────────────────────┘                                                      │
│                                                                              │
│  Cancel                                                                      │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 5.4 `/update-list-type-provenance?id=N` — error state

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  ‹ Back                                                                      │
│                                                                              │
│  ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓  │
│  ┃ There is a problem                                                    ┃  │
│  ┃  • Select at least one allowed provenance          → #allowedProvenance┃  │
│  ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛  │
│                                                                              │
│  Civil Daily Cause List                                                      │
│  Which user provenances are allowed to access this list type?                │
│                                                                              │
│  ┃ Error: Select at least one allowed provenance     (red bar, error msg)    │
│   [ ] CFT IDAM                                                               │
│   [ ] Crime IDAM                                                             │
│   [ ] B2C / Media                                                            │
│                                                                              │
│  ┌────────────────────┐                                                      │
│  │ Save and continue  │                                                      │
│  └────────────────────┘                                                      │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 5.5 `/update-list-type-provenance?id=N` — unrecognised stored value

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  Primary Health Tribunal Weekly Hearing List                                 │
│  Which user provenances are allowed to access this list type?                │
│                                                                              │
│  ┃ The current value "MANUAL_UPLOAD" is not a recognised user provenance.    │
│  ┃ Select the provenances that should be allowed. Saving will replace the    │
│  ┃ current value.                                    (govukInsetText)        │
│                                                                              │
│   [ ] CFT IDAM     [ ] Crime IDAM     [ ] B2C / Media                        │
│                                                                              │
│  ┌────────────────────┐                                                      │
│  │ Save and continue  │                                                      │
│  └────────────────────┘                                                      │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 5.6 `/manage-list-types` — success banner after saving

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓  │
│  ┃ Success                                                               ┃  │
│  ┃ ─────────────────────────────────────────────────────────────────────  ┃  │
│  ┃ Allowed provenance updated for Civil Daily Cause List                 ┃  │
│  ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛  │
│                                                                              │
│  Manage list types                                                           │
│  ...table, with the updated value already shown...                           │
└──────────────────────────────────────────────────────────────────────────────┘
```

## 6. Page Specifications

### 6.1 Shared provenance constant — `libs/system-admin-pages/src/list-type/provenance-options.ts` (new)

Single source of truth for the option set, replacing the three hardcoded copies. Labels live in the page locale files, not here, so nothing user-facing is hardcoded in a lib constant.

```typescript
export const ALLOWED_PROVENANCE_OPTIONS = ["CFT_IDAM", "CRIME_IDAM", "PI_AAD"] as const;

export type AllowedProvenance = (typeof ALLOWED_PROVENANCE_OPTIONS)[number];

export function isAllowedProvenance(value: string): value is AllowedProvenance {
  return (ALLOWED_PROVENANCE_OPTIONS as readonly string[]).includes(value);
}

export function parseAllowedProvenance(stored: string | null | undefined): string[] {
  return (stored ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
}
```

Exported from `libs/system-admin-pages/src/index.ts`. `validation.ts` replaces its local `PROVENANCE_OPTIONS` with `ALLOWED_PROVENANCE_OPTIONS`, so the existing add/edit journey and the new page validate identically.

`SSO` and `B2C_IDAM` are deliberately excluded: `SSO` users are never `VERIFIED` so the value would never be matched, and `B2C_IDAM` is the persistence-layer value for media accounts whose session provenance is `PI_AAD`. Adding either would create dead configuration that reads as if it grants access.

### 6.2 `libs/system-admin-pages/src/list-type/queries.ts` — new query

```typescript
export async function updateListTypeProvenance(id: number, allowedProvenance: string[]) {
  return prisma.listType.update({
    where: { id },
    data: { allowedProvenance: allowedProvenance.join(",") }
  });
}
```

A targeted update, not a call into `saveListType`. `saveListType` rewrites all eleven columns plus the sub-jurisdiction join rows and would require the caller to supply data it does not have; using it here would risk clearing `caseNumberJsonFieldName` or the sub-jurisdiction links when only provenance changed.

`findAllListTypes` (`queries.ts:15`) already selects `allowedProvenance`, so section 6.3 needs no query change.

### 6.3 `/manage-list-types` — add provenance column

**File:** `apps/web/src/pages/(system-admin)/manage-list-types/index.ts`, `index.njk`, `en.ts`, `cy.ts`

Controller changes:
- Map `allowedProvenance` into each row as two derived values: `provenanceLabels` (array of display labels resolved from the locale content) and `hasUnrecognisedProvenance` (boolean, true when any parsed token fails `isAllowedProvenance`).
- Unrecognised tokens render as the raw stored code followed by the "not recognised" suffix, so the admin can see exactly what is in the database.
- Add `provenanceUrl: '/update-list-type-provenance?id=' + listType.id` to each row.
- Read `req.session.listTypeProvenanceUpdated` (set by the POST in 6.5), pass it to the template as `updatedListTypeName`, then delete it from the session so the banner shows once.

Template changes (`index.njk`): third and fourth `<th>`; provenance cell renders `row.provenanceLabels | join(", ")` or `t.notSet` when empty; actions cell keeps the existing "Manage" link and adds the "Change provenance" link with a visually hidden suffix naming the list type. Notification banner rendered above the `<h1>` when `updatedListTypeName` is set.

The table stays in `govuk-grid-column-full` and remains a plain `govuk-table` — no pagination is added. 77 rows is within the "show everything on one page" threshold and the admin's task here is to scan the whole set.

### 6.4 `/manage-list-type?id=N` — Change link on the provenance row

**File:** `apps/web/src/pages/(system-admin)/manage-list-type/index.njk`, `en.ts`, `cy.ts`

The detail page is a hand-built `govuk-table`, not a `govukSummaryList`. Keep it as a table (converting it is out of scope) and add a third cell to the Allowed provenance row only:

```njk
<tr class="govuk-table__row">
  <th scope="row" class="govuk-table__header">{{ t.allowedProvenanceLabel }}</th>
  <td class="govuk-table__cell">{{ provenanceText or t.notSet }}</td>
  <td class="govuk-table__cell govuk-table__cell--numeric">
    <a class="govuk-link" href="/update-list-type-provenance?id={{ listType.id }}&amp;from=detail">
      {{ t.changeLink }}<span class="govuk-visually-hidden"> {{ t.allowedProvenanceLabel }}</span>
    </a>
  </td>
</tr>
```

Every other row gets an empty third cell so the column structure stays valid. The controller resolves `provenanceText` from the same label lookup used in 6.3 (extract the resolver into `libs/system-admin-pages/src/list-type/provenance-labels.ts` taking the label map from the page content, so both pages share it without either lib hardcoding English).

### 6.5 `/update-list-type-provenance` — new page

**Files:** `apps/web/src/pages/(system-admin)/update-list-type-provenance/{index.ts,index.njk,en.ts,cy.ts,index.test.ts,index.njk.test.ts}`

Both handlers are wrapped in `requireRole([USER_ROLES.SYSTEM_ADMIN])`, matching every sibling page.

**GET**
1. Parse `req.query.id`; `400` via `errors/common` when missing or `NaN` — same guard as `edit-list-type/index.ts:16-18`.
2. `findListTypeById(id)`; `404` via `errors/common` when not found.
3. `parseAllowedProvenance(listType.allowedProvenance)` → `selected`.
4. `unrecognisedValues = selected.filter((value) => !isAllowedProvenance(value))`.
5. Build `items` from `ALLOWED_PROVENANCE_OPTIONS`, each `{ value, text: t.provenanceLabels[value], hint: { text: t.provenanceHints[value] }, checked: selected.includes(value) }`.
6. Render with `t`, `listTypeId`, `listTypeName` (friendly name, falling back to `name`), `items`, `unrecognisedValues`, `backHref` (derived from `from` query param: `/manage-list-type?id=N` when `from=detail`, otherwise `/manage-list-types`).

No session state. The page is self-contained — one field, read from and written to the database directly. This deliberately avoids the `session.configureListType` wizard state that `edit-list-type` depends on; sharing that session key would let a half-finished full edit leak into a provenance-only change.

**POST**
1. Same id guard, same 400/404 behaviour (re-read the list type — needed for the audit entry's previous value and for the list type name on re-render).
2. Normalise the body: `req.body.allowedProvenance` is a string when one box is ticked, an array when several, absent when none — reuse the existing normalisation shape from `edit-list-type/index.ts:72-77`.
3. `validateAllowedProvenanceSelection(selected)` (section 9).
4. On error: re-render the same template with `errors`, `errorList`, and `items` rebuilt from the submitted selection so the user's input is preserved. No write. The audit middleware picks the render up as a `validation_error` automatically.
5. On success: `updateListTypeProvenance(id, selected)`, then set `req.auditMetadata` (section 6.6), set `req.session.listTypeProvenanceUpdated = listTypeName`, and `res.redirect(303, "/manage-list-types")`.

A 303 is used, consistent with `configure-list-type-preview/index.ts:59`, so a browser refresh after saving cannot repeat the write.

**Template** — extends `layouts/base-template.njk`, uses `page_content`, `govukBackLink`, `govukErrorSummary`, `govukInsetText`, `govukCheckboxes` with the h1 as the fieldset legend (`isPageHeading: true`, `govuk-fieldset__legend--l`), `govukButton`, and a "Cancel" link back to `backHref`. Form is `method="post"` with `novalidate`.

### 6.6 Audit logging

`auditLogMiddleware` only logs a redirect when the controller opts in (`middleware.ts:72`), so the POST sets:

```typescript
req.auditMetadata = {
  shouldLog: true,
  action: "UPDATE_LIST_TYPE_PROVENANCE",
  entityInfo: `List type: ${listTypeName}; Previous provenance: ${previous || "none"}; New provenance: ${selected.join(",")}`
};
```

No change is needed in the audit lib. `generateActionName` uses `auditMetadata.action` when present, and `extractEntityInfo` gives `entityInfo` top priority. Validation failures are captured automatically by the `res.render` override because the render options include `errors`.

### 6.7 Reference data baseline — `libs/list-types/common/src/list-type-data.ts`

Correct the `provenance` field for all 77 entries so every value is a comma-separated subset of `CFT_IDAM`, `CRIME_IDAM`, `PI_AAD`. Only one entry is currently invalid (`PHT_WEEKLY_HEARING_LIST` → `MANUAL_UPLOAD`); the remaining 76 need business confirmation rather than code change (section 14). Proposed baseline pending sign-off:

| List type | Current | Proposed | Rationale |
|---|---|---|---|
| `PHT_WEEKLY_HEARING_LIST` | `MANUAL_UPLOAD` | `CFT_IDAM` | Non-strategic tribunal list; `MANUAL_UPLOAD` is a publication provenance and grants nobody access |
| 61 civil / family / tribunal lists | `CFT_IDAM` | unchanged | Professional CFT users |
| 8 crown / magistrates lists | `CRIME_IDAM` | unchanged | Professional crime users |
| `MAGISTRATES_PUBLIC_LIST`, `MAGISTRATES_ADULT_COURT_LIST_DAILY` | `CRIME_IDAM,PI_AAD` | unchanged | Crime professionals plus verified media |
| 4 SJP lists + `MENTAL_HEALTH_TRIBUNAL_HEARING_LIST` | `PI_AAD` | unchanged | Media-facing lists |

Adding a `ListTypeData.provenance` value outside the three valid tokens must fail fast. Add a module-level assertion in `list-type-data.ts` (or a unit test in `libs/list-types/common`) that every entry's tokens satisfy `isAllowedProvenance`, so this class of defect cannot be reintroduced. Because `libs/list-types/common` must not depend on `libs/system-admin-pages`, the token list lives in `libs/list-types/common/src/allowed-provenance.ts` and `system-admin-pages` imports it — one constant, no cycle.

### 6.8 Deploy seed — `apps/postgres/prisma/generate-seed-sql.ts`

Remove `allowed_provenance = EXCLUDED.allowed_provenance,` from the `ON CONFLICT (name) DO UPDATE SET` clause at line 136. `allowed_provenance` is still supplied in the `INSERT ... VALUES` list, so new rows get the baseline value and existing rows keep whatever the dashboard last set.

Add a comment stating why this one column is insert-only, otherwise the next person will "fix" the inconsistency:

```typescript
// allowed_provenance is intentionally omitted from the conflict update: it is
// operationally owned by the System Admin dashboard (issue #698). Every other
// column is reconciled from list-type-data.ts on each deploy.
```

The local seed path (`libs/location/src/seed-list-types.ts:48,57`) uses Prisma `upsert` and has the same overwrite behaviour on its update branch. Make the same change there — drop `allowedProvenance` from the update payload, keep it in create — so a local `yarn db:seed` does not behave differently from a deploy.

**Consequence to accept explicitly:** after this change, `allowed_provenance` in an existing environment can permanently diverge from `list-type-data.ts`, and there is no reconciliation path back other than the dashboard. That is the direct cost of the AC. The provenance column added in 6.3 is what makes the divergence visible and auditable.

## 7. Content

Content is co-located with each controller in `apps/web/src/pages/(system-admin)/…/en.ts` and `cy.ts`, per the default pattern in CLAUDE.md. Provenance codes (`CFT_IDAM`, `CRIME_IDAM`, `PI_AAD`) are identifiers and are not translated; their labels and hints are.

### 7.1 `update-list-type-provenance/en.ts`

```typescript
export const en = {
  pageTitle: "Which user provenances are allowed to access this list type?",
  heading: "Which user provenances are allowed to access this list type?",
  hint: "This only affects publications with a sensitivity of Classified. Select all that apply.",
  provenanceLabels: {
    CFT_IDAM: "CFT IDAM",
    CRIME_IDAM: "Crime IDAM",
    PI_AAD: "B2C / Media"
  },
  provenanceHints: {
    CFT_IDAM: "Professional users signing in through CFT IDAM",
    CRIME_IDAM: "Professional users signing in through Crime IDAM",
    PI_AAD: "Verified media accounts"
  },
  unrecognisedValue: (value: string) =>
    `The current value "${value}" is not a recognised user provenance. Select the provenances that should be allowed. Saving will replace the current value.`,
  saveButton: "Save and continue",
  cancelLink: "Cancel",
  backLink: "Back",
  errorSummaryTitle: "There is a problem",
  noSelectionError: "Select at least one allowed provenance",
  invalidSelectionError: "Select valid provenance options"
};
```

### 7.2 `update-list-type-provenance/cy.ts`

```typescript
export const cy = {
  pageTitle: [WELSH TRANSLATION REQUIRED: "Which user provenances are allowed to access this list type?"],
  heading: [WELSH TRANSLATION REQUIRED: "Which user provenances are allowed to access this list type?"],
  hint: [WELSH TRANSLATION REQUIRED: "This only affects publications with a sensitivity of Classified. Select all that apply."],
  provenanceLabels: {
    CFT_IDAM: [WELSH TRANSLATION REQUIRED: "CFT IDAM"],
    CRIME_IDAM: [WELSH TRANSLATION REQUIRED: "Crime IDAM"],
    PI_AAD: [WELSH TRANSLATION REQUIRED: "B2C / Media"]
  },
  provenanceHints: {
    CFT_IDAM: [WELSH TRANSLATION REQUIRED: "Professional users signing in through CFT IDAM"],
    CRIME_IDAM: [WELSH TRANSLATION REQUIRED: "Professional users signing in through Crime IDAM"],
    PI_AAD: [WELSH TRANSLATION REQUIRED: "Verified media accounts"]
  },
  unrecognisedValue: (value: string) =>
    [TRANSLATE: "The current value \"{value}\" is not a recognised user provenance. Select the provenances that should be allowed. Saving will replace the current value."],
  saveButton: [WELSH TRANSLATION REQUIRED: "Save and continue"],
  cancelLink: Canslo,
  backLink: Yn ôl,
  errorSummaryTitle: Mae problem,
  noSelectionError: [WELSH TRANSLATION REQUIRED: "Select at least one allowed provenance"],
  invalidSelectionError: [WELSH TRANSLATION REQUIRED: "Select valid provenance options"]
};
```

### 7.3 Additions to `manage-list-types/en.ts`

```typescript
provenanceColumnHeading: "Allowed provenance",
actionsColumnHeading: "Actions",
changeProvenanceLink: "Change provenance",
notSet: "Not set",
unrecognisedSuffix: "(not recognised)",
successBannerTitle: "Success",
successBannerMessage: (listTypeName: string) => `Allowed provenance updated for ${listTypeName}`,
provenanceLabels: {
  CFT_IDAM: "CFT IDAM",
  CRIME_IDAM: "Crime IDAM",
  PI_AAD: "B2C / Media"
}
```

### 7.4 Additions to `manage-list-types/cy.ts`

```typescript
provenanceColumnHeading: [WELSH TRANSLATION REQUIRED: "Allowed provenance"],
actionsColumnHeading: Camau gweithredu,
changeProvenanceLink: [WELSH TRANSLATION REQUIRED: "Change provenance"],
notSet: [WELSH TRANSLATION REQUIRED: "Not set"],
unrecognisedSuffix: [WELSH TRANSLATION REQUIRED: "(not recognised)"],
successBannerTitle: Llwyddiant,
successBannerMessage: (listTypeName: string) => [WELSH TRANSLATION REQUIRED: "Allowed provenance updated for {listTypeName}"],
provenanceLabels: {
  CFT_IDAM: [WELSH TRANSLATION REQUIRED: "CFT IDAM"],
  CRIME_IDAM: [WELSH TRANSLATION REQUIRED: "Crime IDAM"],
  PI_AAD: [WELSH TRANSLATION REQUIRED: "B2C / Media"]
}
```

### 7.5 Additions to `manage-list-type/en.ts` and `cy.ts`

```typescript
// en.ts
changeLink: "Change",
provenanceLabels: {
  CFT_IDAM: "CFT IDAM",
  CRIME_IDAM: "Crime IDAM",
  PI_AAD: "B2C / Media"
},
unrecognisedSuffix: "(not recognised)"

// cy.ts
changeLink: [WELSH TRANSLATION REQUIRED: "Change"],
provenanceLabels: {
  CFT_IDAM: [WELSH TRANSLATION REQUIRED: "CFT IDAM"],
  CRIME_IDAM: [WELSH TRANSLATION REQUIRED: "Crime IDAM"],
  PI_AAD: [WELSH TRANSLATION REQUIRED: "B2C / Media"]
},
unrecognisedSuffix: [WELSH TRANSLATION REQUIRED: "(not recognised)"]
```

### 7.6 Content notes

- `manage-list-type/en.ts` and `add-list-type/en.ts` already carry `allowedProvenanceLabel: "Allowed provenance"`; reuse it rather than introducing a second string.
- `add-list-type/cy.ts:12-13` and `manage-list-type/cy.ts:11` currently hold `[WELSH TRANSLATION REQUIRED: '…']` placeholders for the provenance label and hint. Replace those with real translations as part of this ticket — the pages are being touched anyway and the placeholder is user-visible in Welsh.
- The three provenance labels are duplicated across three page content files. That is the existing convention (page-local content, no shared locale file for admin pages) and is preferred here over exporting display strings from a lib, which CLAUDE.md reserves for content genuinely shared across pages. If a fourth page needs them, promote to `libs/system-admin-pages/src/locales/`.
- "Save and continue" is used rather than "Continue" because the action commits a change immediately.

## 8. URL

| Method | URL | Handler | Auth |
|---|---|---|---|
| GET | `/manage-list-types` | `apps/web/src/pages/(system-admin)/manage-list-types/index.ts` (modified) | `SYSTEM_ADMIN` |
| GET | `/manage-list-type?id=<id>` | `apps/web/src/pages/(system-admin)/manage-list-type/index.ts` (modified) | `SYSTEM_ADMIN` |
| GET | `/update-list-type-provenance?id=<id>[&from=detail]` | `apps/web/src/pages/(system-admin)/update-list-type-provenance/index.ts` (new) | `SYSTEM_ADMIN` |
| POST | `/update-list-type-provenance?id=<id>[&from=detail]` | same file, `POST` export | `SYSTEM_ADMIN` |

Routing notes:
- Pages under `apps/web/src/pages/` are auto-discovered; `(system-admin)` is a route group and contributes no URL segment, so the directory `update-list-type-provenance/` yields `/update-list-type-provenance`.
- `id` is carried as a query parameter, not a path segment, to match every sibling list-type page (`/manage-list-type?id=`, `/edit-list-type?id=`, `/delete-list-type?id=`). A `[id]` dynamic segment would be more RESTful but would make this one page inconsistent with the rest of the journey.
- `from=detail` only controls the back and cancel destinations. Any other value, or its absence, resolves to `/manage-list-types`. It is never used to build a redirect from unvalidated input — the two destinations are hardcoded — so it is not an open redirect vector.
- On successful POST: `303` to `/manage-list-types`. No new success page; the confirmation is a notification banner on the work list.
- No API route is added. Nothing outside the web app needs to set provenance.

## 9. Validation

### 9.1 Query parameter `id`

| Rule | Behaviour on failure |
|---|---|
| Present and parses to an integer via `Number.parseInt(rawId, 10)` | `400`, render `errors/common` with `{ status: 400 }` |
| Matches an existing, non-deleted list type | `404`, render `errors/common` with `{ status: 404 }` |

Identical to the guards in `edit-list-type/index.ts:16-18` and `manage-list-type/index.ts:14-22`. Applied on both GET and POST — a POST with a tampered id must not fall through to a write.

### 9.2 `allowedProvenance` selection

New function in `libs/system-admin-pages/src/list-type/validation.ts`, reusing the shared option constant:

```typescript
export function validateAllowedProvenanceSelection(selected: string[]): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!selected || selected.length === 0) {
    errors.push({
      field: "allowedProvenance",
      message: "Select at least one allowed provenance",
      href: "#allowedProvenance"
    });
    return errors;
  }

  if (selected.some((value) => !isAllowedProvenance(value))) {
    errors.push({
      field: "allowedProvenance",
      message: "Select valid provenance options",
      href: "#allowedProvenance"
    });
  }

  return errors;
}
```

| Rule | Message | Rationale |
|---|---|---|
| At least one checkbox ticked | "Select at least one allowed provenance" | An empty allow-list means no verified user can ever see a classified publication of this type — a silent access outage |
| Every submitted value is in `ALLOWED_PROVENANCE_OPTIONS` | "Select valid provenance options" | Only reachable by a tampered request; the checkboxes cannot produce anything else |
| Duplicate submitted values are de-duplicated before persisting | — | Not an error; `Array.from(new Set(selected))` before `join(",")` keeps the stored value canonical |
| Values are persisted in the order declared in `ALLOWED_PROVENANCE_OPTIONS` | — | Sorting to a canonical order makes stored values comparable across list types and diffable in the audit log |

The two messages are lifted verbatim from the existing `validateProvenance` (`validation.ts:66-86`) so the add, edit and update journeys report the same failure identically. `validateProvenance` is then reimplemented as a call to `validateAllowedProvenanceSelection` rather than left as a near-duplicate.

### 9.3 Database column length

`allowed_provenance` is `VARCHAR(50)`. The longest possible canonical value with the three valid options is `CFT_IDAM,CRIME_IDAM,PI_AAD` — 26 characters. No length validation is required at the current option set, but the headroom is finite: adding two more 10-character provenances would exceed 50. Note this in the constant's file so a future addition widens the column first.

### 9.4 Reference data validation

A unit test in `libs/list-types/common` asserts that every `listTypeData[].provenance` splits into tokens that all satisfy `isAllowedProvenance`. This is the guard that would have caught `MANUAL_UPLOAD`, and it fails the build rather than the runtime.

## 10. Error Messages

### 10.1 Validation errors on `/update-list-type-provenance`

| Trigger | Error summary entry | Inline message | Anchor |
|---|---|---|---|
| No checkbox ticked | "Select at least one allowed provenance" | "Select at least one allowed provenance" | `#allowedProvenance` |
| Tampered value submitted | "Select valid provenance options" | "Select valid provenance options" | `#allowedProvenance` |

Error summary title: "There is a problem". The summary renders above the `<h1>`, the summary entry links to the first checkbox input, and the inline message renders inside the fieldset with the red error bar. The page `<title>` is prefixed with "Error: " when errors are present, matching GOV.UK guidance.

Welsh equivalents use the same keys from `cy.ts` (`noSelectionError`, `invalidSelectionError`, `errorSummaryTitle`).

### 10.2 Page-level errors

| Condition | Response | Template |
|---|---|---|
| `id` missing or not a number (GET or POST) | `400` | `errors/common` with `{ status: 400 }` |
| `id` does not match a list type (GET or POST) | `404` | `errors/common` with `{ status: 404 }` |
| Not signed in / wrong role | Handled by `requireRole([USER_ROLES.SYSTEM_ADMIN])` | as per existing middleware |
| Prisma update throws | `500` | Let it propagate to the app error handler, as `queries.ts` callers do elsewhere; do not swallow it into a re-render, because a re-render would suggest the change was rejected for a content reason |

### 10.3 Non-error informational message

The unrecognised-value case is **not** an error. It is a `govukInsetText` block on the GET, because the admin has done nothing wrong — the data is wrong, and they are here to fix it. Rendering it as a validation error would show "There is a problem" before any submission, which the GOV.UK validation pattern prohibits.

Text: `unrecognisedValue(value)` from section 7.1, e.g. `The current value "MANUAL_UPLOAD" is not a recognised user provenance. Select the provenances that should be allowed. Saving will replace the current value.`

Where several unrecognised values are stored, they are joined with ", " into a single inset block rather than repeated.

## 11. Navigation

### 11.1 Entry points

| From | Link text | To |
|---|---|---|
| `/system-admin-dashboard` | "Manage list types" (existing, `system-admin-dashboard/en.ts:47`) | `/manage-list-types` |
| `/manage-list-types` row | "Change provenance" (new) | `/update-list-type-provenance?id=<id>` |
| `/manage-list-type?id=N` provenance row | "Change" (new) | `/update-list-type-provenance?id=<id>&from=detail` |

### 11.2 Exits from `/update-list-type-provenance`

| Control | Destination |
|---|---|
| Back link | `/manage-list-type?id=<id>` when `from=detail`, otherwise `/manage-list-types` |
| "Cancel" link | Same as the back link. No write, no session state to clear. |
| "Save and continue" — valid | `303` → `/manage-list-types` with success banner |
| "Save and continue" — invalid | Re-render the same URL (no redirect), errors displayed, selection preserved |

### 11.3 Existing links left unchanged

`/edit-list-type` continues to redirect to `/configure-list-type-select-sub-jurisdictions` and on through the preview and `/configure-list-type-success`. The full-edit wizard is not rerouted; the new page sits alongside it.

### 11.4 Banner lifecycle

`req.session.listTypeProvenanceUpdated` is set immediately before the 303 and deleted by the `/manage-list-types` GET after being read. The banner therefore appears once and does not reappear on a later visit or a refresh. The session key is namespaced distinctly from `session.configureListType` so the two flows cannot interfere.

### 11.5 Back-button behaviour

Because the POST redirects with 303 and the GET holds no session state, pressing Back after saving re-issues the GET and shows the freshly stored value, pre-ticked. There is no stale-form or double-submit path.

## 12. Accessibility

Target: WCAG 2.2 AA. All three touched pages must pass `axeCheck(page)` with the tags used across the suite (`wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, `wcag22aa`) with zero violations, in both English and Welsh, and in both the clean and error states.

### 12.1 `/update-list-type-provenance`

| Requirement | Implementation |
|---|---|
| Page title matches h1 | `pageTitle` and `heading` are the same string; "Error: " prefix added to `<title>` when errors present |
| Single h1, no skipped levels | The `<h1>` is the fieldset legend via `govukCheckboxes` `fieldset.legend.isPageHeading: true`, `classes: "govuk-fieldset__legend--l"` |
| Group of related checkboxes is announced as a group | `govukFieldset` wrapper supplied by the `govukCheckboxes` macro; the legend is the question |
| Hint associated with the group | The macro wires `aria-describedby` from the fieldset to the hint id |
| Per-option hints associated | Each item's hint gets its own id, referenced by that checkbox's `aria-describedby` — handled by the macro when `items[].hint` is set |
| Error message announced | Macro adds the error message id to the fieldset's `aria-describedby` and renders the visually hidden "Error:" prefix |
| Error summary receives focus | `govukErrorSummary` renders with `role="alert"`, `tabindex="-1"` and is focused on load by the GOV.UK Frontend JS; entries are real links to `#allowedProvenance` |
| Which list type am I editing? | The list type name is a `govuk-caption-l` `<span>` immediately before the legend text, inside the legend, so a screen reader announces "Civil Daily Cause List — Which user provenances…" as one label rather than leaving the context unread |
| Keyboard operable | Native checkboxes and a native submit button; Space toggles, Enter submits, Tab order is legend → checkboxes → button → cancel link |
| Target size | GOV.UK checkbox targets are 44×44px by default; no custom sizing |
| Works without JavaScript | Server-side validation only; the form is a plain POST. JS adds error-summary focus only |
| Colour not the sole carrier | Errors carry text plus the visually hidden "Error:" prefix, not just the red bar |
| Inset text is programmatically in reading order | `govukInsetText` placed before the fieldset in the DOM, so it is encountered before the options |

### 12.2 `/manage-list-types` table

| Requirement | Implementation |
|---|---|
| Table has an accessible name | Keep the existing visually hidden `<caption>` (`tableCaption`) |
| Column headers | Each `<th scope="col">`; the new provenance and actions headers included. The actions header is a real header with visible text, not an empty cell |
| Row-level link ambiguity | Repeated "Manage" and "Change provenance" links across 77 rows are indistinguishable out of context, which fails WCAG 2.4.4 in practice. Each link gets a visually hidden suffix naming the list type: `Change provenance<span class="govuk-visually-hidden"> for Civil Daily Cause List</span>` |
| Multi-value provenance cell | Rendered as plain comma-separated text in a single cell, not a nested list, so it is read as one value |
| "not recognised" marker | Real text in the cell, never colour or an icon alone |
| Notification banner announced | `govukNotificationBanner` with `type: "success"` sets `role="alert"`; it is the first element in `page_content`, before the `<h1>` |
| Banner does not steal the heading | The banner's own `<h2>`/title does not disturb the h1→h2 order because it precedes the h1 as a landmark region; verified by the axe run |
| Reading order | Banner → h1 → "Add new list type" button → table |

### 12.3 `/manage-list-type` detail table

| Requirement | Implementation |
|---|---|
| Row headers | Existing `<th scope="row">` retained |
| New third column | Every row gains a third cell so the row lengths stay uniform; only the provenance row's cell has content. An uneven row length is an axe violation |
| Change link context | `Change<span class="govuk-visually-hidden"> Allowed provenance</span>` so the link is self-describing |

### 12.4 Verification

- Inline axe checks in the E2E journey (section 13), on each page state, in English and Welsh.
- Manual keyboard-only pass of the full journey: dashboard → work list → provenance page → save → banner.
- Screen reader spot check that the list type name is announced with the question, and that the success banner is announced on arrival at the work list.

## 13. Test Scenarios

### 13.1 Unit — `libs/system-admin-pages/src/list-type/validation.test.ts` (extend)

* Returns no errors when a single valid provenance is selected.
* Returns no errors when all three valid provenances are selected.
* Returns the "at least one" error when the selection is an empty array.
* Returns the "at least one" error when the selection is undefined.
* Returns the "valid options" error when the selection contains `MANUAL_UPLOAD`.
* Returns the "valid options" error when the selection contains `SSO`, confirming admin provenance is rejected.
* Returns the "valid options" error when the selection contains `B2C_IDAM`, confirming the persistence-layer alias is rejected in favour of `PI_AAD`.
* Returns exactly one error, not two, when the selection is empty — the empty case short-circuits.
* The existing `validateListTypeDetails` provenance assertions still pass after `validateProvenance` is reimplemented on top of the shared function.

### 13.2 Unit — `libs/system-admin-pages/src/list-type/provenance-options.test.ts` (new)

* `parseAllowedProvenance` splits a comma-separated value into tokens.
* `parseAllowedProvenance` trims whitespace around tokens.
* `parseAllowedProvenance` returns an empty array for `null`, `undefined` and the empty string.
* `parseAllowedProvenance` drops empty tokens produced by a trailing comma.
* `isAllowedProvenance` accepts each of the three valid tokens and rejects `MANUAL_UPLOAD`, `SSO`, `B2C_IDAM` and lower-case variants.

### 13.3 Unit — `libs/system-admin-pages/src/list-type/queries.test.ts` (extend)

* `updateListTypeProvenance` calls `prisma.listType.update` with the id in `where` and only `allowedProvenance` in `data`, proving no other column is written.
* `updateListTypeProvenance` joins multiple values with a comma and no spaces.
* `updateListTypeProvenance` persists values in the canonical declared order regardless of the order submitted.
* `updateListTypeProvenance` de-duplicates repeated values before persisting.

### 13.4 Unit — `libs/list-types/common/src/list-type-data.test.ts` (new or extend)

* Every entry's `provenance` splits into tokens that are all valid allowed-provenance values — the guard that fails the build if a publication provenance is reintroduced.
* Every entry has a non-empty `provenance`.
* No entry's `provenance` string exceeds the 50-character column limit.

### 13.5 Unit — `apps/web/src/pages/(system-admin)/update-list-type-provenance/index.test.ts` (new)

GET:
* Renders the template with checkboxes pre-checked from a single stored provenance.
* Renders with two checkboxes pre-checked from a comma-separated stored value.
* Renders with nothing pre-checked and an `unrecognisedValues` entry when the stored value is `MANUAL_UPLOAD`.
* Renders Welsh content when the locale is `cy`, including the Welsh labels and hints.
* Responds `400` and renders `errors/common` when `id` is absent.
* Responds `400` when `id` is not numeric.
* Responds `404` when `findListTypeById` returns null.
* Sets `backHref` to the detail page when `from=detail`, and to the work list otherwise.

POST:
* Persists a single selection, sets the session banner key, and redirects `303` to `/manage-list-types`.
* Normalises a single string body value into a one-element array before persisting.
* Persists an array body value unchanged.
* Re-renders with an error summary and no database write when nothing is selected.
* Preserves the submitted selection on the re-render after a validation failure.
* Responds `400`/`404` on a tampered or unknown `id` without calling `updateListTypeProvenance`.
* Sets `req.auditMetadata` with `shouldLog: true`, action `UPDATE_LIST_TYPE_PROVENANCE`, and an `entityInfo` string containing the list type name and both the previous and new provenance values.
* Both `GET` and `POST` are exported as middleware arrays whose first element is the `requireRole` guard.

### 13.6 Unit — `manage-list-types/index.test.ts` (extend)

* Each row exposes `provenanceLabels` resolved from the stored codes and a `provenanceUrl` pointing at the new page with the row's id.
* A row with an unrecognised stored value is flagged `hasUnrecognisedProvenance` and keeps the raw code in its labels.
* A row with an empty stored provenance yields an empty label array so the template can fall back to "Not set".
* Reads and then deletes `session.listTypeProvenanceUpdated`, passing it to the template as `updatedListTypeName`.
* Passes no banner value when the session key is absent.

### 13.7 Template — `update-list-type-provenance/index.njk.test.ts` (new)

* Renders the h1 as the fieldset legend with the page heading text.
* Renders three checkboxes with the expected values and labels.
* Marks a checkbox checked when its value is in the selection, and unchecked otherwise.
* Renders the inset text only when `unrecognisedValues` is non-empty, and omits it otherwise — asserted both ways.
* Renders the error summary with a link to `#allowedProvenance` when `errorList` is present, and asserts absence via `assertNoErrors($)` when it is not.
* Renders Welsh headings, labels and hints when passed the `cy` content object.
* Asserts locale-key parity: `Object.keys(en).sort()` equals `Object.keys(cy).sort()`.
* Renders the back link and cancel link to the supplied `backHref`.

### 13.8 Template — `manage-list-types/index.njk.test.ts` (extend)

* Renders four column headers including the provenance and actions headers.
* Renders the provenance cell as comma-separated labels, and "Not set" when the label array is empty.
* Renders the "not recognised" suffix only for flagged rows.
* Each row's "Change provenance" link carries a visually hidden suffix naming that list type.
* Renders the success notification banner only when `updatedListTypeName` is set, positioned before the `<h1>`.

### 13.9 E2E — `e2e-tests/tests/system-admin/manage-list-types.spec.ts` (extend)

One additional journey test, following the repo rule of one test per journey with validation, Welsh and accessibility checks inline:

* **"admin can update the allowed provenance for a list type @nightly"** — sign in via SSO as system admin → open `/manage-list-types` → assert the "Allowed provenance" column renders a value for the seeded test list type → axe check → follow "Change provenance" → assert the current provenance is pre-ticked → submit with nothing ticked and assert the error summary appears → axe check the error state → switch to Welsh and assert the Welsh heading and error, then back to English → tick two provenances → save → assert the redirect to `/manage-list-types`, the success banner naming the list type, and the updated value in the row → axe check the banner state → keyboard-only repeat of the tick-and-submit step.

The existing `test.describe.skip` on this file must be resolved before the new test provides any signal. If the skip is retained for unrelated reasons, say so in the PR — a skipped test is not coverage.

### 13.10 Seed behaviour verification

* A unit test over the output of `generate-seed-sql.ts` asserting the emitted `ON CONFLICT (name) DO UPDATE SET` clause does **not** contain `allowed_provenance`, and that the `INSERT` column list still does.
* The same test asserts the other reconciled columns (`friendly_name`, `welsh_friendly_name`, `shortened_friendly_name`, `url`, `default_sensitivity`, `is_non_strategic`, `deleted_at`) are still present in the update clause, so the fix does not silently disable the rest of the reconciliation.
* Manual verification on STG: change a provenance through the dashboard, redeploy `apps/postgres`, confirm the dashboard value survives and no other column drifted.

## 14. Assumptions & Open Questions

### Blocking question

* **What is the correct allowed provenance for each of the 77 list types?** The ticket says provenance must be "added/updated" but supplies no target values. This spec delivers the mechanism, the reference-data guard, and a correction for the one demonstrably wrong entry (`PHT_WEEKLY_HEARING_LIST` → `MANUAL_UPLOAD`), but the other 76 values are being carried forward unchanged because there is nothing to change them to. **A signed-off list type → provenance mapping is required from the business before the data half of the AC can be called done.** The proposed baseline in section 6.7 is inference from the current data, not a decision. Implementation of sections 6.1–6.6, 6.8 and 13 is not blocked by this and should proceed.

### Assumptions

* `allowed_provenance` means user identity provenance, not publication source provenance. This is inferred from the only consumer (`canAccessPublication`) and from the current data, and the `MANUAL_UPLOAD` entry shows the two have already been conflated once. If the business actually intends this column to record *which source systems may publish this list type*, this spec is solving the wrong problem and the ticket needs re-scoping — that would be a new column and a new enforcement point at ingestion, not an edit to this one.
* `SSO` and `B2C_IDAM` are correctly excluded from the option set. `SSO` cannot match because the classified check requires `role === "VERIFIED"`; `B2C_IDAM` cannot match because the login flow puts `PI_AAD` in the session. If either assumption changes — in particular if `apps/web/src/pages/(auth)/login/return/index.ts:216` is ever changed to emit `B2C_IDAM` — every list type allowing `PI_AAD` silently stops granting access to media users. Worth a comment at that line.
* The dashboard becoming the operational owner of this column is acceptable to the team, along with the permanent drift from `list-type-data.ts` that follows. The alternative — keep the seed authoritative and require a code change plus deploy for every provenance change — directly contradicts the AC, so it is not offered here.
* 77 rows on one page needs no pagination or filtering. If the provenance column makes the page a genuine audit tool that admins use often, a filter by provenance would be the next increment; it is not built now.
* Adding a dedicated one-question page rather than routing admins through the existing four-step edit wizard is justified by the scale of this task (77 list types) and by the GOV.UK one-thing-per-page pattern. The cheaper alternative is to add only the provenance column and the "Change" link pointing at `/edit-list-type?id=N`, accepting the four-page wizard per list type. That saves roughly one page's worth of build but makes the AC's bulk task about three times as long to perform and forces re-submission of ten unrelated fields per row — each one an opportunity to corrupt a different column.
* Existing `[WELSH TRANSLATION REQUIRED: …]` placeholders on the provenance label and hint in `add-list-type/cy.ts` and `manage-list-type/cy.ts` will be filled in as part of this work, since those pages are being modified and the placeholder text is currently user-visible in Welsh.
* No Prisma migration is needed. `allowed_provenance` already exists as `VARCHAR(50)` and the option set fits in 26 characters.

### Open questions (non-blocking)

* Should the audit log capture provenance changes made through the existing `/edit-list-type` wizard with the same `UPDATE_LIST_TYPE_PROVENANCE` action, or continue to record them under the generic `CONFIGURE_LIST_TYPE_PREVIEW` action derived from the path? Consistency argues for the former; it would mean the preview POST diffing provenance before saving.
* Should the provenance column also appear on the public-facing or CTSC-facing views? No current requirement, and exposing which identity providers can see a classified list is arguably information the public should not have. Assumed system-admin-only.
* `PHT_WEEKLY_HEARING_LIST` has `defaultSensitivity: null`. Combined with `canAccessPublication` defaulting a falsy artefact sensitivity to `CLASSIFIED`, any PHT artefact uploaded without an explicit sensitivity is admin-only regardless of provenance. Fixing the provenance value alone does not make that list visible. Is a default sensitivity also needed for PHT, and are there other list types with `defaultSensitivity: null`? Worth a follow-up ticket rather than widening this one.
* Is there an existing STG/production divergence in `allowed_provenance` already? Because the seed has been overwriting the column on every deploy, all environments should currently match `list-type-data.ts` — worth confirming with a query against STG before the seed change lands, so the starting point is known.




### Comment by OgechiOkelu on 2026-08-21T17:53:30Z

@plan 

