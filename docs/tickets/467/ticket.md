# #467: Update: Audit log view

**State:** OPEN
**Assignees:** alexbottenberg
**Author:** OgechiOkelu
**Labels:** bug
**Created:** 2026-03-24T12:54:56Z
**Updated:** 2026-06-03T12:46:12Z

## Description

**PROBLEM STATEMENT**
In the 'Audit Log Viewer' tile, when the Admin selects the action to view from the list of actions in the audit log, there are several functionalities that are inconsistent with the formatting across CaTH. Hence, this ticket is raised to implement changes to the identified instances.

**AS A** Service
**I WANT** to make changes to the Audit log view
**SO THAT** it aligns with the expected formatting in CaTH

**ACCEPTANCE CRITERIA**
- 'Back' link is changed from 'Back to audit log list' to 'Back'
- The 'Date/Month/Year' data boxes are presented in one row rather than across two rows

## Comments

### Comment by OgechiOkelu on 2026-03-24T12:55:24Z
@SPEC new-feature.md

### Comment by hmctsclaudecode on 2026-03-24T12:58:20Z
## 1. User Story
**As a** Service
**I want to** make changes to the Audit Log detail view
**So that** it aligns with the expected formatting in CaTH

## 2. Background
The Audit Log Viewer tile in the System Admin area has two formatting inconsistencies:

1. The back link on the audit log detail page displays "Back to audit log list" rather than the standard "Back" used elsewhere in CaTH.
2. The date filter on the audit log list page renders the Day/Month/Year inputs across two rows instead of one row, due to a CSS rule in `dashboard.scss` that forces the Year (last child) item onto a new line with additional top padding.

Relevant files:
- `libs/system-admin-pages/src/pages/audit-log-detail/index.njk` — back link template
- `libs/system-admin-pages/src/pages/audit-log-detail/en.ts` — English content, `backToList` key
- `libs/system-admin-pages/src/pages/audit-log-detail/cy.ts` — Welsh content, `backToList` key
- `libs/system-admin-pages/src/pages/audit-log-list/index.njk` — date filter template, uses `app-date-filter-narrow` class
- `libs/system-admin-pages/src/assets/css/dashboard.scss` — contains the CSS rule causing the wrapping

## 3. Acceptance Criteria
* **Scenario:** Back link text on audit log detail page
    * **Given** a System Admin is viewing the Audit Log detail page (`/audit-log-detail?id=...`)
    * **When** the page loads
    * **Then** the back link reads "Back" (English) and Yn ôl (Welsh), not "Back to audit log list"

* **Scenario:** Date filter inputs on one row
    * **Given** a System Admin is viewing the Audit Log list page (`/audit-log-list`)
    * **When** the filter panel is visible
    * **Then** the Day, Month, and Year inputs for the date filter are all displayed on a single horizontal row

## 4. User Journey Flow
1. Admin navigates to System Admin dashboard
2. Admin selects the "Audit Log Viewer" tile → lands on `/audit-log-list`
3. On the list page, Admin can see date filter with Day/Month/Year on **one row**
4. Admin selects "View" on a log entry → lands on `/audit-log-detail?id=...`
5. On the detail page, the back link reads **"Back"** and links to `/audit-log-list`

## 6. Page Specifications

### Audit Log Detail Page (`/audit-log-detail`)

**Back Link:**
- Change the back link text from `"Back to audit log list"` to `"Back"`
- The `href` remains `/audit-log-list` — no change to routing
- Uses the standard GOV.UK back link component pattern via the `{% block backLink %}` in `index.njk`
- The text is driven by the `backToList` key in `en.ts` / `cy.ts`; update those values rather than hardcoding in the template

### Audit Log List Page (`/audit-log-list`)

**Date Filter Input Row:**
- The `govukDateInput` component already renders Day/Month/Year as flex items on one row by default
- The issue is the CSS rule in `dashboard.scss`:
  ```scss
  .app-date-filter-narrow .govuk-date-input__item:last-child {
    padding-top: 10px;
  }
  ```
  This forces the Year input (last child) to visually appear below the Day/Month inputs in the narrow filter panel
- **Remove** this CSS rule entirely
- The `app-date-filter-narrow` class on the `formGroup` in the template can also be removed since it will have no remaining styles applied to it.

## 7. Content

### English (`en.ts`) — audit-log-detail

| Key | Current value | New value |
|-----|--------------|-----------|
| `backToList` | `"Back to audit log list"` | `"Back"` |

### Welsh (`cy.ts`) — audit-log-detail

| Key | Current value | New value |
|-----|--------------|-----------|
| `backToList` | `"Yn ôl i restr log archwilio"` | `Yn ôl` |

## 13. Test Scenarios

* Admin views audit log detail page and sees back link text is "Back" (not "Back to audit log list")
* Admin views audit log detail page in Welsh (`?lng=cy`) and sees the Welsh translation of "Back" in the back link
* Admin views audit log list page and the Day, Month, and Year date filter inputs are displayed on a single row within the filter panel
* Clicking the "Back" link on the detail page navigates the admin to `/audit-log-list`

### Comment by OgechiOkelu on 2026-03-24T13:02:04Z
@plan

### Comment by hmctsclaudecode on 2026-03-24T13:05:12Z
Technical plan created on branch `feature/467-audit-log-view-updates` in `docs/tickets/467/`.

## Summary of changes

**Fix 1 — Back link text**
- `libs/system-admin-pages/src/pages/audit-log-detail/en.ts`: `backToList` → `"Back"`
- `libs/system-admin-pages/src/pages/audit-log-detail/cy.ts`: `backToList` → `"Yn ôl"`

**Fix 2 — Date filter inputs on one row**
- `libs/system-admin-pages/src/assets/css/dashboard.scss`: remove `.app-date-filter-narrow .govuk-date-input__item:last-child { padding-top: 10px; }` (the rule causing Year input to wrap)
- `libs/system-admin-pages/src/pages/audit-log-list/index.njk`: remove `classes: "app-date-filter-narrow"` from the date input `formGroup`

**Tests**
- Update `index.test.ts` for audit-log-detail to expect `"Back"` / `"Yn ôl"` as `backToListText`

No clarifying questions — the spec is complete. Ready to implement.
