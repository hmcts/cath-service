# #466: Update: 'Remove List Summary' table

**State:** OPEN
**Assignees:** None
**Author:** OgechiOkelu
**Labels:** bug
**Created:** 2026-03-24T11:30:02Z
**Updated:** 2026-05-01T09:52:26Z

## Description

**PROBLEM STATEMENT**
In the 'Remove' tile, when the Local Admin selects the venue to remove a publication from, the published lists for the selected venue are displayed in a table with several columns. This ticket is raised to implement some changes to the table.

**AS A** Service
**I WANT** to make changes to the table (see mockup attachment)

**SO THAT** the table aligns with the expected formatting

**ACCEPTANCE CRITERIA**
- The double-headed arrow cursor is added beside each column header
- The arrow facing down under the 'content date' column is removed

## Comments

### Comment by OgechiOkelu on 2026-03-24T11:30:51Z
@SPEC new-feature.md

### Comment by hmctsclaudecode on 2026-03-24T11:33:51Z
## 1. User Story
**As a** Local Admin
**I want to** see clear visual sorting indicators on all sortable columns in the Remove List Summary table
**So that** I can easily identify which columns are sortable and interact with the table as expected

## 2. Background
The Remove List Summary page (`/remove-list-search-results`) displays a table of published lists for a selected venue, allowing a Local Admin to select one or more publications for removal. The table supports sorting by clicking column headers.

Currently, the table has a visual inconsistency:
- The 'Content date' column (the default sort column) always shows a down-facing arrow (↓) on page load because it defaults to descending order — giving the impression this column has special or static behaviour
- Non-active sortable columns show no visual indicator that they can be clicked to sort

## 3. Acceptance Criteria
* **Scenario:** Double-headed arrow visible on all sortable column headers
  * All sortable columns (List type, Court or tribunal name, Content date, Language, Sensitivity) should show ↕ at all times
* **Scenario:** Down arrow removed from Content date column on default load
  * No single-directional down arrow (↓) shown on Content date when page loads with default sort
* **Scenario:** Active sort column shows directional arrow alongside double-headed arrow (if keeping directional arrows)
* **Scenario:** Non-sortable columns unchanged (Display dates and Select — no arrows)

## 4. Column header behaviour

| Column | Sortable | Always shows ↕ | Shows ↑/↓ |
|--------|----------|-----------------|-----------| 
| List type | Yes | Yes | When actively sorted |
| Court or tribunal name | Yes | Yes | When actively sorted |
| Content date | Yes | Yes | When actively sorted by explicit click (NOT on default load) |
| Display dates | No | No | Never |
| Language | Yes | Yes | When actively sorted |
| Sensitivity | Yes | Yes | When actively sorted |
| Select | No | No | Never |

### Comment by OgechiOkelu on 2026-03-24T11:40:06Z
@plan

### Comment by hmctsclaudecode on 2026-03-24T11:44:09Z
Previous technical plan was posted with clarifying questions:

1. **Arrow character vs CSS cursor** - Does "double-headed arrow cursor" mean a Unicode ↕ character or a CSS `cursor` property change?
2. **Directional arrow on explicit re-sort to default state** - Should the directional arrow appear when user explicitly clicks Content date when it's already active desc?
3. **`aria-sort` attributes** - Should accessibility improvements be included in this ticket?

### Comment by OgechiOkelu on 2026-05-01T09:52:26Z
@plan
