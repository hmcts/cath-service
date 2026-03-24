# #466: Update: 'Remove List Summary' table

**State:** OPEN
**Assignees:** (none)
**Author:** OgechiOkelu
**Labels:** bug
**Created:** 2026-03-24T11:30:02Z
**Updated:** 2026-03-24T11:40:06Z

## Description

**PROBLEM STATEMENT**
In the 'Remove' tile, when the Local Admin selects the venue to remove a publication from, the published lists for the selected venue are displayed in a table with several columns. This ticket is raised to implement some changes to the table.

**AS A** Service
**I WANT** to make changes to the

[Remove list summary changes mock up.docx](https://github.com/user-attachments/files/26211877/Remove.list.summary.changes.mock.up.docx)

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

This ticket resolves both issues to align the table with the expected design shown in the mockup.

## 3. Acceptance Criteria

* **Scenario:** Double-headed arrow visible on all sortable column headers
    * **Given** the Local Admin is viewing the Remove List Summary table
    * **When** the page is loaded (regardless of current sort state)
    * **Then** a double-headed arrow (↕) is displayed beside each sortable column header: List type, Court or tribunal name, Content date, Language, Sensitivity

* **Scenario:** Down arrow removed from Content date column on default load
    * **Given** the Local Admin navigates to the Remove List Summary page without explicitly choosing a sort column
    * **When** the page renders with the default sort (Content date, descending)
    * **Then** no single-directional down arrow (↓) is shown under the Content date column header

* **Scenario:** Active sort column shows directional arrow alongside double-headed arrow
    * **Given** the Local Admin has clicked a column header to explicitly sort by it
    * **When** the table re-renders with that column as the active sort
    * **Then** the active column shows the appropriate directional arrow (↑ or ↓) indicating sort direction, in addition to the double-headed arrow

* **Scenario:** Non-sortable columns unchanged
    * **Given** the table is displayed
    * **When** the Local Admin looks at the Display dates and Select column headers
    * **Then** no arrow indicators are shown (these columns are not sortable)

## 4. Affected File
`libs/admin-pages/src/pages/remove-list-search-results/index.njk`

### Column header behaviour

| Column | Sortable | Always shows ↕ | Shows ↑/↓ |
|--------|----------|-----------------|-----------|
| List type | Yes | Yes | When actively sorted |
| Court or tribunal name | Yes | Yes | When actively sorted |
| Content date | Yes | Yes | When actively sorted by explicit click (NOT on default load) |
| Display dates | No | No | Never |
| Language | Yes | Yes | When actively sorted |
| Sensitivity | Yes | Yes | When actively sorted |
| Select | No | No | Never |

### Default load state
- `sortBy` defaults to `contentDate`, `order` defaults to `desc` (set in `index.ts`)
- On default load, no directional arrow should appear on any column — only ↕ on all sortable columns
- To achieve this without changing controller logic, the template must suppress the directional arrow when the sort matches the default state

## 5. Accessibility
- `aria-sort` attributes on `<th>` elements for screen reader support
- The `↕` indicator must use `aria-hidden="true"` — it is decorative
- WCAG 2.2 AA contrast compliance for the arrow character

## 6. Open Questions
- Should the directional arrow (↑/↓) be removed from ALL columns (only ↕ ever shown), or should it still appear on the column the user has explicitly clicked to sort?
- Is the double-headed arrow a Unicode character ↕ (U+2195) or an SVG/icon font?
- Does "double-headed arrow cursor" mean a visual icon or a CSS `cursor` property change?

### Comment by OgechiOkelu on 2026-03-24T11:40:06Z
@plan
