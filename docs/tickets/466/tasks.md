# Tasks: Update Remove List Summary Table (#466)

## Implementation Tasks

- [ ] In `libs/admin-pages/src/pages/remove-list-search-results/index.njk`, add `<span aria-hidden="true">↕</span>` after the link text in each of the five sortable column headers: `listType`, `courtName`, `contentDate`, `language`, `sensitivity`
- [ ] For each sortable column, update the directional arrow condition from `{% if sortBy == 'columnKey' %}` to `{% if sortBy == 'columnKey' and not (sortBy == 'contentDate' and order == 'desc') %}` so the ↑/↓ arrow is suppressed when the page is in the default sort state (`contentDate` / `desc`)
- [ ] Update `libs/admin-pages/src/pages/remove-list-search-results/index.test.ts` to add a test asserting that on default load (`sortBy: 'contentDate'`, `order: 'desc'`) the controller passes the expected values to the template (the template-level arrow suppression is covered by the Nunjucks change, but confirm the render call includes `sortBy` and `order` — this is already tested; verify no new controller assertions are needed)
