# Plan: Update Remove List Summary Table (#466)

## 1. Technical Approach

This is a pure template change in a single Nunjucks file. The controller already passes `sortBy` and `order` to the template. No controller changes are needed.

The two requirements translate to two precise template logic changes:

1. **Add ↕ to every sortable column header** — unconditionally render `<span aria-hidden="true">↕</span>` after the link text on each of the five sortable headers.

2. **Suppress the directional arrow (↑/↓) on the default load state** — the default is `sortBy === 'contentDate'` and `order === 'desc'` (set in `index.ts` lines 57–58). A directional arrow must only appear on a column when:
   - It is the active sort column (`sortBy == columnKey`), AND
   - The current state is NOT the default (`sortBy != 'contentDate' or order != 'desc'`).

   This means: if `sortBy == 'contentDate'` and `order == 'desc'`, no directional arrow is shown on any column. If the user explicitly sorted by content date ascending, the directional arrow does appear.

## 2. Implementation Details

### File to modify

`libs/admin-pages/src/pages/remove-list-search-results/index.njk`

### Change per sortable column header

Current pattern (repeated for each sortable column, e.g. `listType`):
```njk
{{ tableHeaders.listType }}
{% if sortBy == 'listType' %}
  <span aria-hidden="true">{{ '↓' if order == 'desc' else '↑' }}</span>
{% endif %}
```

New pattern:
```njk
{{ tableHeaders.listType }}
<span aria-hidden="true">↕</span>
{% if sortBy == 'listType' and not (sortBy == 'contentDate' and order == 'desc') %}
  <span aria-hidden="true">{{ '↓' if order == 'desc' else '↑' }}</span>
{% endif %}
```

For the `contentDate` column the active-sort condition simplifies slightly — the `not (sortBy == 'contentDate' and order == 'desc')` guard naturally suppresses the arrow on default load while still showing it when the user has explicitly sorted that column ascending.

The five sortable columns and their `sortBy` key:

| Column header template var | `sort` query param key |
|---|---|
| `tableHeaders.listType` | `listType` |
| `tableHeaders.courtName` | `courtName` |
| `tableHeaders.contentDate` | `contentDate` |
| `tableHeaders.language` | `language` |
| `tableHeaders.sensitivity` | `sensitivity` |

The two non-sortable columns (`tableHeaders.displayDates`, `tableHeaders.select`) receive no changes.

### `aria-sort` consideration

The `<th>` elements currently carry no `aria-sort` attribute. The spec comment (section 5) notes these should be added for screen reader support. However, the acceptance criteria do not require `aria-sort` and the existing tests do not assert on it. Adding `aria-sort` is out of scope for this ticket but is noted in Open Questions.

## 3. Error Handling & Edge Cases

**Default load (no query params):** `sortBy` is `'contentDate'`, `order` is `'desc'`. The guard condition `not (sortBy == 'contentDate' and order == 'desc')` is false for every column, so no directional arrow renders anywhere. Only ↕ symbols show. This satisfies the "Down arrow removed on default load" criterion.

**User explicitly sorts contentDate ascending:** `sortBy == 'contentDate'`, `order == 'asc'`. The guard condition is true, so ↑ renders on the contentDate column. Correct.

**User explicitly sorts contentDate descending via click:** `sortBy == 'contentDate'`, `order == 'desc'`. This is visually identical to the default load. The guard suppresses the directional arrow. This is acceptable — the ↕ alone indicates the column is sorted, and the sort link href will toggle to ascending on next click. The ticket spec explicitly states "no single-directional arrow on default load" without distinguishing explicit re-selection of the default state.

**`sortBy` is absent from query string:** The controller defaults to `'contentDate'`, so the template always receives a defined `sortBy` value.

## 4. Acceptance Criteria Mapping

| Criterion | How satisfied |
|---|---|
| Double-headed arrow on all sortable column headers | ↕ span added unconditionally inside each of the five sortable header links |
| Down arrow removed from Content date on default load | Guard condition `not (sortBy == 'contentDate' and order == 'desc')` suppresses directional arrow when template state matches the controller default |
| Active sort column shows directional arrow alongside ↕ when explicitly sorted | Existing `sortBy == column` check retained; guard passes for any non-default active sort state |
| Non-sortable columns (Display dates, Select) unchanged | No changes to those `<th>` elements |

## 5. Open Questions

### CLARIFICATIONS NEEDED

- **`aria-sort` attributes**: The spec comment (section 5) calls for `aria-sort` on `<th>` elements for screen reader support. The acceptance criteria do not include this. Should it be added as part of this ticket or deferred?

- **Explicit re-sort to default state**: If a user clicks "Content date" when it is already sorted descending (matching the default), the guard will suppress the directional arrow. This is indistinguishable from the default load. Is this acceptable, or should a URL flag (e.g. `&explicit=true`) be introduced to distinguish explicit user sort from default state? The ticket spec does not address this case.

- **Arrow character vs icon**: Section 6 of the spec comment asks whether ↕ (U+2195) is the correct implementation or whether an SVG/icon font is expected. The acceptance criteria say "double-headed arrow cursor" — if this refers to a CSS `cursor` property rather than a visual character, the implementation approach is different. Assuming Unicode character based on the ticket description and mockup reference.
