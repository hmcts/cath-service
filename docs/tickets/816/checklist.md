# Checklist: Issue #816 — Consistent "List for" and "Last updated" date format

## Acceptance Criteria

- [x] AC1: Single-digit day shown without leading zero in HTML (e.g. "List for 5 January 2026", not "05 January 2026")
- [x] AC2: Single-digit day shown without leading zero in PDF (matches HTML output exactly)
- [x] AC3: "Last updated" date uses no leading zero on the day (e.g. "Last updated 3 January 2026 at 9:05am")
- [x] AC4: Two-digit days (10–31) are unchanged (e.g. "15 January 2026" still renders correctly)
- [x] AC5: All 26 list types use identical `d MMMM yyyy` format (no-leading-zero) for both HTML and PDF
- [x] AC6: Welsh locale unaffected in structure — day has no leading zero (e.g. "5 Ionawr 2026")

## Files to Fix (from spec)

### Shared helpers (fix first — covers most list types)
- [x] `libs/list-types/common/src/rendering/date-formatting.ts` — `formatDisplayDate` (`day: "2-digit"` → `"numeric"`), `formatLastUpdatedDateTime` (`dd MMMM yyyy` → `d MMMM yyyy`), `formatDdMmYyyyDate` (`day: "2-digit"` → `"numeric"`)
- [x] `libs/list-types/common/src/rendering/crown-utilities.ts` — `formatContentDate` (`day: "2-digit"` → `"numeric"`) + `formatCrownLastUpdated` (`dd MMMM yyyy` → `d MMMM yyyy`)
- [x] `libs/list-types/daily-cause-list-common/src/rendering/renderer.ts` — `formatContentDate` (`day: "2-digit"` → `"numeric"`)
- [x] `libs/web-core/src/utils/date-utils.ts` — left unchanged; `formatDateAndLocale` feeds `/summary-of-publications` which intentionally uses `"2-digit"`

### Per-list-type renderers (local date formatting)
- [x] `libs/list-types/magistrates-standard-list/src/rendering/renderer.ts` — `formatDate` + `formatDateAndTime` (`day: "2-digit"` → `"numeric"`)
- [x] `libs/list-types/crown-warned-list/src/rendering/renderer.ts` — `formatLongDate` (`day: "2-digit"` → `"numeric"`)

### Audit all 26 list types for any remaining local date formatting
- [x] Audit complete — no remaining leading-zero day issues (only `system-admin-pages/formatting.ts` uses `"2-digit"` but is an admin timestamp, explicitly out of scope)

## Testing

- [x] Unit tests updated/added for each corrected shared helper (single-digit day → no leading zero)
- [x] Unit tests for two-digit days (15th → "15 January 2026", unchanged)
- [x] Unit tests for Welsh locale (5 → "5 Ionawr 2026")
- [x] Unit tests for list-type renderers that format locally (magistrates-standard-list, crown-warned-list)
- [x] Regression: time formatting unchanged (minutes still padded, e.g. "9:05am")
- [x] Coverage >80%

## Verification Steps

- [x] Build passes: `yarn build`
- [x] Lint passes: `yarn lint`
- [x] Tests pass: `yarn test`
- [x] No console.log statements
- [x] No TODO comments left
