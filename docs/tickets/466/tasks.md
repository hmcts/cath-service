# Implementation Tasks

## Implementation Tasks

- [ ] In `libs/admin-pages/src/pages/remove-list-search-results/index.ts`, add `isDefaultSort: req.query.sort === undefined` to both `res.render` calls (GET handler and POST error re-render)
- [ ] In `libs/admin-pages/src/pages/remove-list-search-results/index.njk`, add `<span aria-hidden="true">↕</span>` unconditionally inside each of the five sortable column anchors (listType, courtName, contentDate, language, sensitivity)
- [ ] In the same template, change each directional arrow condition from `{% if sortBy == 'column' %}` to `{% if sortBy == 'column' and not isDefaultSort %}`
- [ ] Update `libs/admin-pages/src/pages/remove-list-search-results/index.test.ts` to assert `isDefaultSort: true` on default load and `isDefaultSort: false` when `req.query.sort` is set
