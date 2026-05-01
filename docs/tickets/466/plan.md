# Technical Plan — #466: Update 'Remove List Summary' table

## 1. Technical Approach

Two visual changes are needed to the sortable table in `remove-list-search-results/index.njk`:

1. **Add a ↕ (double-headed arrow) to every sortable column header** — always visible, giving a consistent affordance that the column can be clicked to sort.
2. **Remove the ↓ arrow from the Content date column on default page load** — the controller defaults to `sortBy = "contentDate"` and `order = "desc"` when no `?sort=` query param is present, causing ↓ to render on first load even though the user never clicked to sort.

The cleanest fix is Approach A: pass a single boolean `isDefaultSort` from the controller. When `true` (no explicit `?sort=` in the query string), the template suppresses all directional arrows, including the spurious ↓ on Content date. When `false`, directional arrows appear on the active sort column as they do today.

This is minimal: one line in the controller, one condition change per sortable column in the template. No new data structures, no refactoring.

The `locale` variable used in the sort link `href` attributes is set on line 50 of the controller (`const locale = req.query.lng === "cy" ? "cy" : "en";`) but is not currently passed to `res.render`. This is a pre-existing bug — the sort links always append `&lng=cy` based on the value of `locale`, but `locale` is never in the template context so it evaluates as falsy and the Welsh param is never appended. This is out of scope for this ticket but is noted below under Open Questions.

## 2. Implementation Details

### Controller change — `libs/admin-pages/src/pages/remove-list-search-results/index.ts`

Add `isDefaultSort` to both `res.render` calls (GET handler and POST error re-render).

**Before (line 95–109 in `getHandler`):**
```typescript
res.render("remove-list-search-results/index", {
  ...
  sortBy,
  order,
  hideLanguageToggle: true
});
```

**After:**
```typescript
res.render("remove-list-search-results/index", {
  ...
  sortBy,
  order,
  isDefaultSort: req.query.sort === undefined,
  hideLanguageToggle: true
});
```

The same `isDefaultSort: req.query.sort === undefined` line must be added to the POST handler's re-render call (line 164–185) so the table state is consistent when a validation error forces a re-render.

### Template change — `libs/admin-pages/src/pages/remove-list-search-results/index.njk`

For each sortable column, add the always-visible ↕ and gate the directional arrow on `not isDefaultSort`.

**Before (one representative column — Content date):**
```njk
<th scope="col" class="govuk-table__header govuk-table__header--sortable">
  <a href="?sort=contentDate&order={{ 'desc' if sortBy == 'contentDate' and order == 'asc' else 'asc' }}{{ '&lng=cy' if locale == 'cy' else '' }}" class="govuk-link govuk-link--no-visited-state">
    {{ tableHeaders.contentDate }}
    {% if sortBy == 'contentDate' %}
      <span aria-hidden="true">{{ '↓' if order == 'desc' else '↑' }}</span>
    {% endif %}
  </a>
</th>
```

**After:**
```njk
<th scope="col" class="govuk-table__header govuk-table__header--sortable">
  <a href="?sort=contentDate&order={{ 'desc' if sortBy == 'contentDate' and order == 'asc' else 'asc' }}{{ '&lng=cy' if locale == 'cy' else '' }}" class="govuk-link govuk-link--no-visited-state">
    {{ tableHeaders.contentDate }}
    <span aria-hidden="true">↕</span>
    {% if sortBy == 'contentDate' and not isDefaultSort %}
      <span aria-hidden="true">{{ '↓' if order == 'desc' else '↑' }}</span>
    {% endif %}
  </a>
</th>
```

The same pattern applies to all five sortable columns: `listType`, `courtName`, `contentDate`, `language`, `sensitivity`. Non-sortable columns (`displayDates`, `select`) are unchanged.

### Test change — `libs/admin-pages/src/pages/remove-list-search-results/index.test.ts`

The existing test "should render page with sorted artefacts" asserts `expect.objectContaining(...)` without checking `isDefaultSort`, so it will not break. However, a test covering the new field should be added to the default-load assertion:

```typescript
expect(mockRes.render).toHaveBeenCalledWith(
  "remove-list-search-results/index",
  expect.objectContaining({
    sortBy: "contentDate",
    order: "desc",
    isDefaultSort: true
  })
);
```

And the "should sort by custom column" test should assert `isDefaultSort: false` when `req.query.sort` is set.

## 3. Acceptance Criteria Mapping

| Acceptance Criterion | How it is satisfied |
|---|---|
| Double-headed arrow beside each sortable column header | `<span aria-hidden="true">↕</span>` is rendered unconditionally inside every sortable column's anchor |
| Down arrow removed from Content date on default load | `isDefaultSort: true` is passed when `req.query.sort === undefined`; the directional arrow is only rendered when `not isDefaultSort` |
| Active sort column still shows directional arrow after explicit click | After user clicks a sort link, `?sort=` is present in the URL, so `isDefaultSort` is `false` and the existing `{% if sortBy == 'column' %}` logic renders ↑ or ↓ as before |
| Non-sortable columns unchanged | `displayDates` and `select` headers have no `govuk-table__header--sortable` class and no arrows — nothing changes there |

## 4. Open Questions

These were raised in the previous plan comment and remain unanswered. They do not block implementation but affect edge-case behaviour:

1. **Arrow character vs CSS cursor** — The ticket says "double-headed arrow cursor". The spec comment (by hmctsclaudecode) interprets this as the Unicode ↕ character. If the intent is a CSS `cursor: ns-resize` or `cursor: col-resize` property change instead of (or in addition to) a visible character, the implementation changes. Proceeding with the ↕ Unicode character based on the spec comment table which explicitly shows ↕ in the "Always shows ↕" column.

2. **Directional arrow after user explicitly re-sorts to the same default state** — If the user clicks Content date to sort ascending, then clicks again to sort descending, the URL will have `?sort=contentDate&order=desc`. In this state `isDefaultSort` is `false` (because `req.query.sort` is defined), so the ↓ arrow will appear. This is the correct and expected behaviour per the spec table ("When actively sorted by explicit click (NOT on default load)"). No ambiguity here.

3. **`locale` not passed to render** — The sort link hrefs reference `locale` in the template (`{{ '&lng=cy' if locale == 'cy' else '' }}`), but `locale` is computed in the controller and never passed to `res.render`. The Welsh language param in sort links is currently broken. This is pre-existing and out of scope for this ticket, but worth a separate fix.

4. **`aria-sort` attributes** — Not addressed in this ticket. Adding `aria-sort="ascending"/"descending"/"none"` to `<th>` elements would improve screen reader support, but was out of scope per the previous plan comment.
