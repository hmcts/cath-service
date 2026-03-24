# Implementation Tasks: #467 — Update: Audit log view

## Implementation Tasks

- [ ] Update `backToList` in `libs/system-admin-pages/src/pages/audit-log-detail/en.ts` from `"Back to audit log list"` to `"Back"`
- [ ] Update `backToList` in `libs/system-admin-pages/src/pages/audit-log-detail/cy.ts` from `"Yn ôl i restr log archwilio"` to `"Yn ôl"`
- [ ] Remove the `.app-date-filter-narrow .govuk-date-input__item:last-child` CSS rule (lines 43–45) from `libs/system-admin-pages/src/assets/css/dashboard.scss`
- [ ] Remove `classes: "app-date-filter-narrow"` from the `formGroup` on the `govukDateInput` call in `libs/system-admin-pages/src/pages/audit-log-list/index.njk`
- [ ] Update `libs/system-admin-pages/src/pages/audit-log-detail/index.test.ts` to expect `"Back"` (English) and `"Yn ôl"` (Welsh) as the `backToListText` value
