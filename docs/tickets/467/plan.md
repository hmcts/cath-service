# Plan: #467 Audit Log View Formatting Fixes

## 1. Technical Approach

Two isolated, low-risk changes:

1. Update the `backToList` string values in the English and Welsh content files for the audit-log-detail page. The template already uses `backToListText` as a variable (line 5 of `index.njk`) and the controller passes it through — no template or controller changes are needed.

2. Remove the CSS rule in `dashboard.scss` that forces the Year date input onto a new row, and remove the now-unused `app-date-filter-narrow` class from the `govukDateInput` `formGroup` in the audit-log-list template. The GOV.UK `govukDateInput` macro renders Day/Month/Year on a single flex row by default; the CSS rule is the sole cause of the wrapping.

Neither change touches routing, business logic, or database code.

---

## 2. Implementation Details

### Fix 1 — Back link text

**File:** `libs/system-admin-pages/src/pages/audit-log-detail/en.ts`

| Line | Current value | New value |
|------|--------------|-----------|
| 44 | `backToList: "Back to audit log list"` | `backToList: "Back"` |

**File:** `libs/system-admin-pages/src/pages/audit-log-detail/cy.ts`

| Line | Current value | New value |
|------|--------------|-----------|
| 44 | `backToList: "Yn ôl i restr log archwilio"` | `backToList: "Yn ôl"` |

The template (`audit-log-detail/index.njk`, line 5) already renders:
```njk
<a href="/audit-log-list" class="govuk-back-link">{{ backToListText }}</a>
```
No template change required. The `href` value (`/audit-log-list`) is unchanged.

### Fix 2 — Date filter inputs on one row

**File:** `libs/system-admin-pages/src/assets/css/dashboard.scss`

Remove lines 43–45 in their entirety:
```scss
.app-date-filter-narrow .govuk-date-input__item:last-child {
  padding-top: 10px;
}
```
After removal the `.app-date-filter-narrow` class has no associated styles in this file and no purpose elsewhere.

**File:** `libs/system-admin-pages/src/pages/audit-log-list/index.njk`

Remove the `formGroup` option from the `govukDateInput` call at lines 99–101:
```njk
          formGroup: {
            classes: "app-date-filter-narrow"
          },
```
The surrounding `govukDateInput` call (lines 96–132) is otherwise unchanged.

### Fix 3 — Update test assertion

**File:** `libs/system-admin-pages/src/pages/audit-log-detail/index.test.ts`

The test at lines 69–105 ("should render audit log detail when found") asserts:
```typescript
backToListText: expect.any(String),
```
This assertion continues to pass after the change because the value is still a string. No test update is required unless the team wants to assert the exact string value. The existing assertion is sufficient for the scope of this ticket.

---

## 3. Error Handling & Edge Cases

- The back link `href` is hardcoded in the template as `/audit-log-list` and is not altered by this change.
- Removing the CSS rule cannot break layout elsewhere: the selector `.app-date-filter-narrow` is used only in this one SCSS file and only applied in `audit-log-list/index.njk`. No other template in the codebase uses that class.
- Welsh content: `"Yn ôl"` is the standard GOV.UK Wales back link text, consistent with other pages in CaTH (e.g., `audit-log-list/index.njk` line 10 uses the hardcoded `Back` for its own back link).

---

## 4. Acceptance Criteria Mapping

| AC | How it is satisfied |
|----|-------------------|
| Back link reads "Back" (English) | `en.ts` line 44: `backToList` changed to `"Back"` |
| Back link reads "Yn ôl" (Welsh) | `cy.ts` line 44: `backToList` changed to `"Yn ôl"` |
| Day/Month/Year inputs on a single row | CSS rule removed from `dashboard.scss`; `app-date-filter-narrow` class removed from template |

---

## 5. Open Questions

None. The spec is complete and unambiguous.
