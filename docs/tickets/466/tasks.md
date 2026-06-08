# Implementation Tasks

## Controller (`libs/admin-pages/src/pages/remove-list-search-results/index.ts`)

- [x] In `getHandler`, add `isDefaultSort: req.query.sort === undefined` to the `res.render` call
- [x] In `postHandler`, add `isDefaultSort: req.query.sort === undefined` to the `res.render` call (error re-render path)

## Template (`libs/admin-pages/src/pages/remove-list-search-results/index.njk`)

- [x] Add `aria-sort` attribute to the `listType` `<th>` — `"ascending"`/`"descending"` when active, `"none"` otherwise
- [x] Add `<span aria-hidden="true">↕</span>` inside the `listType` header `<a>` tag
- [x] Change `{% if sortBy == 'listType' %}` to `{% if sortBy == 'listType' and not isDefaultSort %}`
- [x] Add `aria-sort` attribute to the `courtName` `<th>`
- [x] Add `<span aria-hidden="true">↕</span>` inside the `courtName` header `<a>` tag
- [x] Change `{% if sortBy == 'courtName' %}` to `{% if sortBy == 'courtName' and not isDefaultSort %}`
- [x] Add `aria-sort` attribute to the `contentDate` `<th>`
- [x] Add `<span aria-hidden="true">↕</span>` inside the `contentDate` header `<a>` tag
- [x] Change `{% if sortBy == 'contentDate' %}` to `{% if sortBy == 'contentDate' and not isDefaultSort %}`
- [x] Add `aria-sort` attribute to the `language` `<th>`
- [x] Add `<span aria-hidden="true">↕</span>` inside the `language` header `<a>` tag
- [x] Change `{% if sortBy == 'language' %}` to `{% if sortBy == 'language' and not isDefaultSort %}`
- [x] Add `aria-sort` attribute to the `sensitivity` `<th>`
- [x] Add `<span aria-hidden="true">↕</span>` inside the `sensitivity` header `<a>` tag
- [x] Change `{% if sortBy == 'sensitivity' %}` to `{% if sortBy == 'sensitivity' and not isDefaultSort %}`

## Tests (`libs/admin-pages/src/pages/remove-list-search-results/index.test.ts`)

- [x] Update "should render page with sorted artefacts" assertion to include `isDefaultSort: true`
- [x] Update "should sort by custom column when specified" assertion to include `isDefaultSort: false`
- [x] Update "should show error when no artefacts selected" assertion to include `isDefaultSort: true`
