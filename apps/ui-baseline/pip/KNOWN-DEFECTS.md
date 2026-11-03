# Known pip-frontend defects

Behaviour found while building the parity baseline that is pip getting it wrong. The baseline
records pip as it behaves; where CaTH differs because it does not have the defect, that difference
is intended. Pinned commits: pip-frontend f9ccef8a, pip-data-management 7fe83c36,
pip-account-management 0c1016af.

| Where | Defect | Found by |
|---|---|---|
| `src/test/a11y` | The accessibility suite never calls `appSetup()`, so every route it checks is Express's default 404 and the suite passes without testing pip's pages. | Stub harness, 2026-10-22 |
| Remove list (`/remove-list-confirmation`) | After the "no answer" validation error, the re-rendered form loses the hidden `locationId`, so answering "yes" shows the error page instead of removing the list. | `manual-upload-and-remove-list` journey |
| Media application rejection (`/media-account-rejection`) | After the "no answer" validation error, the re-rendered form posts to `?applicantId=` (empty), so answering "yes" shows the error page instead of rejecting. Same pattern as remove list. | `media-applications` journey |
| System admin dashboard, Welsh | The "upload reference data" card links to `/manual-reference-data-upload` (from `locales/cy/system-admin-dashboard.json`), which does not exist, so Welsh users get "page not found". The card's id also differs by language (`card-manual-reference-data-upload` vs `card-reference-data-upload`), and the page heading is not translated. | `court-reference-data` journey |
| Magistrates adult court lists | Both `MAGISTRATES_ADULT_COURT_LIST_DAILY` and `_FUTURE` render the title "Magistrates Standard List". | List page captures |
| Bulk unsubscribe confirmation | The question is an `<h2>`; the page has no `<h1>`. | `email-subscriptions` journey |
| List pages (e.g. civil and family) | "Search Cases" and each court name are `<h1>`, so the page has several `<h1>`s. | List page captures |
| Accordions on list pages | `aria-controls` points at IDs that do not exist (axe `aria-valid-attr-value`), on 11 list pages. | axe on list page captures |
