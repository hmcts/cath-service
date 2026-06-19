# Technical Plan: Update Remove List Summary Table (#466)

## 1. Technical Approach

This is a small, focused change across two files:

- `libs/admin-pages/src/pages/remove-list-search-results/index.ts` — controller
- `libs/admin-pages/src/pages/remove-list-search-results/index.njk` — template

The core problem is that the controller defaults `sortBy` to `"contentDate"` and `order` to `"desc"` when no query parameters are present. The template then renders a directional arrow (↓) for `contentDate` on every initial page load, because `sortBy == 'contentDate'` evaluates to true. The user has not explicitly sorted — it just looks like they have.

The fix requires distinguishing between "default sort applied implicitly" and "user explicitly clicked a column header to sort". The controller achieves this by passing an `isDefaultSort` flag, and the template uses it to suppress directional arrows on the default load while still rendering `↕` on all sortable columns at all times.

## 2. Implementation Details

### Controller changes (`index.ts`)

The `isDefaultSort` flag is `true` when the user has not yet clicked a column header — i.e. when `req.query.sort` is `undefined`.

**In `getHandler`:** Add `isDefaultSort: req.query.sort === undefined` to the `res.render` call object (line 95–108).

**In `postHandler`:** The POST handler re-renders the page when no artefacts are selected. It also reads `req.query.sort`, so the same flag applies. Add `isDefaultSort: req.query.sort === undefined` to the `res.render` call object (line 163–183).

No other controller logic changes are needed. The existing `sortBy` and `order` defaults remain correct for data sorting purposes.

### Template changes (`index.njk`)

Five columns are sortable: `listType`, `courtName`, `contentDate`, `language`, `sensitivity`. Two are not: `displayDates`, `select`.

**Change 1 — Add `↕` to all sortable column headers.**

Inside each sortable column's `<a>` tag, unconditionally add:

```html
<span aria-hidden="true">↕</span>
```

This goes alongside the existing conditional directional arrow span. Both can appear at the same time when the user has explicitly sorted a column.

**Change 2 — Gate directional arrows behind `isDefaultSort`.**

Change every:

```nunjucks
{% if sortBy == 'column' %}
```

to:

```nunjucks
{% if sortBy == 'column' and not isDefaultSort %}
```

This applies to all five sortable columns.

**Change 3 — Add `aria-sort` to `<th>` elements.**

For each sortable `<th>`, add an `aria-sort` attribute to communicate sort state to screen readers:

- Active column, ascending: `aria-sort="ascending"`
- Active column, descending: `aria-sort="descending"`
- Non-active sortable columns: `aria-sort="none"`
- Non-sortable columns (`displayDates`, `select`): no `aria-sort` attribute

In Nunjucks this is expressed as a conditional attribute on each sortable `<th>`:

```nunjucks
<th scope="col" class="govuk-table__header govuk-table__header--sortable"
  {% if sortBy == 'listType' and not isDefaultSort %}
    aria-sort="{{ 'descending' if order == 'desc' else 'ascending' }}"
  {% else %}
    aria-sort="none"
  {% endif %}>
```

### Full picture of template edits per column

| Column | Add `↕` span | Gate `↓`/`↑` with `isDefaultSort` | `aria-sort` on `<th>` |
|---|---|---|---|
| listType | Yes | Yes | Yes |
| courtName | Yes | Yes | Yes |
| contentDate | Yes | Yes | Yes |
| displayDates | No | N/A | No |
| language | Yes | Yes | Yes |
| sensitivity | Yes | Yes | Yes |
| select | No | N/A | No |

## 3. Error Handling and Edge Cases

**Default load:** `req.query.sort` is `undefined`, so `isDefaultSort` is `true`. No directional arrows appear. All sortable columns show `↕` only. This is the correct state.

**Explicit sort click:** `req.query.sort` is a non-undefined string (e.g. `"contentDate"`). `isDefaultSort` is `false`. The active column shows both `↕` and the directional arrow. Other sortable columns show `↕` only.

**POST re-render (validation error):** The POST handler re-renders the page with the same query parameters. `req.query.sort` behaves identically, so `isDefaultSort` propagates correctly.

**Invalid sort query param:** The existing controller already falls back to `"contentDate"` / `"desc"` for unrecognised values, but `req.query.sort` will not be `undefined` in that case — `isDefaultSort` will be `false`. This is acceptable; if a user has manipulated query parameters manually, showing a directional arrow is harmless.

## 4. Acceptance Criteria Mapping

**"Double-headed arrow visible on all sortable column headers"**
Satisfied by adding `<span aria-hidden="true">↕</span>` unconditionally inside each of the five sortable column header `<a>` tags in the template. The span is always rendered regardless of current sort state.

**"Down arrow removed from Content date column on default load"**
Satisfied by passing `isDefaultSort: req.query.sort === undefined` from the controller and changing `{% if sortBy == 'contentDate' %}` to `{% if sortBy == 'contentDate' and not isDefaultSort %}` in the template. On initial page load, the directional arrow is suppressed.

**"Active sort column shows directional arrow alongside double-headed arrow"**
Satisfied by the same `isDefaultSort` gate — when `isDefaultSort` is `false` (user has clicked a column), both `↕` and the directional arrow are shown for the active column.

**"Non-sortable columns unchanged"**
`displayDates` and `select` columns are not modified. They have no `<a>` tag, no arrow spans, and no `aria-sort` attribute.

**Accessibility (`aria-sort`)**
Each sortable `<th>` gets `aria-sort="ascending"` or `aria-sort="descending"` when actively sorted, and `aria-sort="none"` otherwise. Non-sortable columns have no `aria-sort`. All arrow spans use `aria-hidden="true"`.

## 5. Test Changes

The existing test at `index.test.ts` line 87–95 asserts `res.render` was called with `expect.objectContaining(...)`. The addition of `isDefaultSort` to the render call must be reflected in the tests.

**Test to update:** "should render page with sorted artefacts" — add `isDefaultSort: true` to the `expect.objectContaining(...)` assertion, since `mockReq.query` is `{}` (no `sort` key).

**Test to update:** "should sort by custom column when specified" — add `isDefaultSort: false` to the assertion, since `mockReq.query` is `{ sort: "language", order: "asc" }`.

**Test to update:** "should show error when no artefacts selected" (POST handler) — add `isDefaultSort: true` to the assertion, since `mockReq.query` is `{}`.

No new test cases are required; the existing structure covers the behaviour.
