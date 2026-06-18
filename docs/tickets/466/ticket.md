# #466: Update: 'Remove List Summary' table

**State:** OPEN
**Assignees:** KianKwa
**Author:** OgechiOkelu
**Labels:** bug
**Created:** 2026-03-24T11:30:02Z
**Updated:** 2026-06-05T13:27:25Z

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

---

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

## 6. Page Specifications

### Affected File
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
- Controller should pass `isDefaultSort: req.query.sort === undefined` to distinguish initial page load from user-triggered sort

### Template changes required
1. Add `<span aria-hidden="true">↕</span>` unconditionally inside each sortable column header `<a>` tag
2. Gate directional arrows using `isDefaultSort` flag: change `{% if sortBy == 'column' %}` to `{% if sortBy == 'column' and not isDefaultSort %}`

## 12. Accessibility

### ARIA sort attributes
- Active sort column, ascending: `aria-sort="ascending"`
- Active sort column, descending: `aria-sort="descending"`
- Non-active sortable columns: `aria-sort="none"`
- Non-sortable columns: no `aria-sort` attribute

### Double-headed arrow character
- Use `↕` (U+2195)
- Must be wrapped in `<span aria-hidden="true">` — decorative only

---

### Comment by OgechiOkelu on 2026-03-24T11:40:06Z
@plan

---

### Comment by hmctsclaudecode on 2026-03-24T11:44:09Z
## Technical Plan: Update Remove List Summary Table

Branch: `feature/466-remove-list-summary-table-updates`

### Approach

This is a **pure Nunjucks template change** in a single file:
`libs/admin-pages/src/pages/remove-list-search-results/index.njk`

No controller changes are needed — the controller already passes `sortBy` and `order` to the template.

**Changes:**
1. Add `<span aria-hidden="true">↕</span>` unconditionally inside each of the 5 sortable column header links
2. Suppress the directional arrow (↑/↓) on the default load state using a guard

### Clarifications Needed

**1.** Does "double-headed arrow cursor" mean a visual Unicode ↕ character or a CSS `cursor` property change?

**2.** Should the directional arrow (↑/↓) still appear when the user has explicitly clicked a column to sort?

**3.** Should `aria-sort` attributes be added to `<th>` elements (accessibility improvement)?

---

### Comment by OgechiOkelu on 2026-05-01T09:52:26Z
@plan

---

### Comment by hmctsclaudecode on 2026-05-01T09:57:09Z
## Technical Plan (Updated): Update Remove List Summary Table

Branch: `feature/466-remove-list-summary-table-updates`

### Approach

This is a **small Nunjucks template + controller change** in two files:
- `libs/admin-pages/src/pages/remove-list-search-results/index.njk`
- `libs/admin-pages/src/pages/remove-list-search-results/index.ts`

**Controller change:** Pass `isDefaultSort: req.query.sort === undefined` to both `res.render` calls (GET handler and POST error re-render). This distinguishes the initial page load (no explicit sort clicked) from a user-triggered sort.

**Template changes:**
1. Add `<span aria-hidden="true">↕</span>` unconditionally inside each of the 5 sortable column header links
2. Gate directional arrows: change `{% if sortBy == 'column' %}` to `{% if sortBy == 'column' and not isDefaultSort %}` on each sortable column

### Clarifications Needed

**1.** Does "double-headed arrow cursor" mean a visual Unicode ↕ character or a CSS cursor change?

**2.** Should directional arrows (↑/↓) remain on explicitly-clicked sort columns, or only ↕ ever shown?

**3. Pre-existing bug (out of scope):** The `locale` variable is computed in the controller but never passed to `res.render`, so the Welsh language parameter (`&lng=cy`) is silently dropped from sort links.
