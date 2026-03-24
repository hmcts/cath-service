# Technical Plan: #467 — Update: Audit log view

## 1. Technical Approach

Two small, isolated display fixes in the `system-admin-pages` lib. No database changes, no API changes, no routing changes. Both are pure UI corrections.

### Fix 1 — Back link text on audit log detail page

The text "Back to audit log list" is driven by the `backToList` key in the locale files (`en.ts` and `cy.ts`) and passed to the template as `backToListText`. The template (`index.njk`) renders it directly via `{{ backToListText }}`.

Change required: update the string value of `backToList` in both locale files. No template or controller changes needed.

### Fix 2 — Date filter inputs on one row

The `govukDateInput` component renders Day/Month/Year as flex items on one row by default. The `formGroup.classes: "app-date-filter-narrow"` on the date input in `audit-log-list/index.njk` applies a custom CSS class defined in `dashboard.scss`:

```scss
.app-date-filter-narrow .govuk-date-input__item:last-child {
  padding-top: 10px;
}
```

This `padding-top` pushes the Year input down, causing it to wrap onto a second row in the narrow filter panel. Removing this CSS rule restores the default single-row layout.

The `app-date-filter-narrow` class on the `formGroup` in the Nunjucks template will then have no applied styles and can also be removed to avoid dead code.

## 2. Implementation Details

### Files to change

| File | Change |
|------|--------|
| `libs/system-admin-pages/src/pages/audit-log-detail/en.ts` | `backToList: "Back to audit log list"` → `"Back"` |
| `libs/system-admin-pages/src/pages/audit-log-detail/cy.ts` | `backToList: "Yn ôl i restr log archwilio"` → `"Yn ôl"` |
| `libs/system-admin-pages/src/assets/css/dashboard.scss` | Remove lines 43–45: the `.app-date-filter-narrow .govuk-date-input__item:last-child` rule |
| `libs/system-admin-pages/src/pages/audit-log-list/index.njk` | Remove `classes: "app-date-filter-narrow"` from `formGroup` on the `govukDateInput` call (line ~100) |

No other files require changes. No new files need to be created.

## 3. Error Handling & Edge Cases

- No validation or error handling changes are required.
- The `app-date-filter-narrow` class is used in exactly one place (confirmed by grep). Removing the CSS rule and class reference has no wider impact.
- The `backToList` key is only used in the audit-log-detail controller. The audit-log-list back link already reads "Back" and is unaffected.

## 4. Acceptance Criteria Mapping

| Criterion | Implementation |
|-----------|---------------|
| Back link reads "Back" (not "Back to audit log list") | Update `backToList` value in `en.ts` and `cy.ts` |
| Back link reads "Yn ôl" in Welsh | Update `backToList` value in `cy.ts` |
| Day/Month/Year inputs display on one row | Remove the `padding-top` CSS rule from `dashboard.scss` and remove the `app-date-filter-narrow` class from `audit-log-list/index.njk` |

## 5. Testing

Existing test file: `libs/system-admin-pages/src/pages/audit-log-detail/index.test.ts`

Update the test that asserts the back link text is passed to the template — change the expected value from `"Back to audit log list"` to `"Back"` (and Welsh equivalent if tested).

No new test files are needed. The CSS and template changes are display-only and covered by the existing E2E audit log journey test if one exists.

## 6. Open Questions / Clarifications

None. The spec comment on the issue provides complete detail for both changes. No ambiguities remain.
