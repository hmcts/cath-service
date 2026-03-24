# #467: Update: Audit log view

**State:** OPEN
**Assignees:** None
**Author:** OgechiOkelu
**Labels:** bug
**Created:** 2026-03-24T12:54:56Z
**Updated:** 2026-03-24T13:02:04Z

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
    * **Then** the back link reads "Back" (English) and "Yn ôl" (Welsh), not "Back to audit log list"

* **Scenario:** Date filter inputs on one row
    * **Given** a System Admin is viewing the Audit Log list page (`/audit-log-list`)
    * **When** the filter panel is visible
    * **Then** the Day, Month, and Year inputs for the date filter are all displayed on a single horizontal row

## 4. Content Changes

### English (`en.ts`) — audit-log-detail
| Key | Current value | New value |
|-----|--------------|-----------|
| `backToList` | `"Back to audit log list"` | `"Back"` |

### Welsh (`cy.ts`) — audit-log-detail
| Key | Current value | New value |
|-----|--------------|-----------|
| `backToList` | `"Yn ôl i restr log archwilio"` | `"Yn ôl"` |

## 5. CSS Fix
Remove the CSS rule in `dashboard.scss`:
```scss
.app-date-filter-narrow .govuk-date-input__item:last-child {
  padding-top: 10px;
}
```
This rule forces the Year input to wrap to a second row. Removing it restores the default GOV.UK one-row layout.

### Comment by OgechiOkelu on 2026-03-24T13:02:04Z
@plan
