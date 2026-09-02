# Tasks: #467 Audit Log View Formatting Fixes

## Implementation Tasks

- [x] In `libs/system-admin-pages/src/pages/audit-log-detail/en.ts` (line 44), change `backToList` value from `"Back to audit log list"` to `"Back"`
- [x] In `libs/system-admin-pages/src/pages/audit-log-detail/cy.ts` (line 44), change `backToList` value from `"Yn ôl i restr log archwilio"` to `"Yn ôl"`
- [x] In `libs/system-admin-pages/src/assets/css/dashboard.scss` (lines 43–45), remove the `.app-date-filter-narrow .govuk-date-input__item:last-child { padding-top: 10px; }` rule
- [x] In `libs/system-admin-pages/src/pages/audit-log-list/index.njk` (lines 99–101), remove the `formGroup: { classes: "app-date-filter-narrow" }` option from the `govukDateInput` call
- [x] Run `yarn test` in the `libs/system-admin-pages` workspace and confirm all existing tests pass
