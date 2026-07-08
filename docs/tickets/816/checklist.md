# Checklist: Issue #816 — Consistent "List for" and "Last updated" date format

## Acceptance Criteria

- [ ] AC1: Single-digit day shown without leading zero in HTML (e.g. "List for 5 January 2026", not "05 January 2026")
- [ ] AC2: Single-digit day shown without leading zero in PDF (matches HTML output exactly)
- [ ] AC3: "Last updated" date uses no leading zero on the day (e.g. "Last updated 3 January 2026 at 9:05am")
- [ ] AC4: Two-digit days (10–31) are unchanged (e.g. "15 January 2026" still renders correctly)
- [ ] AC5: All 26 list types use identical `d MMMM yyyy` format (no-leading-zero) for both HTML and PDF
- [ ] AC6: Welsh locale unaffected in structure — day has no leading zero (e.g. "5 Ionawr 2026")

## Files to Fix (from spec)

### Shared helpers (fix first — covers most list types)
- [ ] `libs/list-types/common/src/rendering/date-formatting.ts` — `formatDisplayDate` (`day: "2-digit"` → `"numeric"`), `formatLastUpdatedDateTime` (`dd MMMM yyyy` → `d MMMM yyyy`), `formatDdMmYyyyDate` (`day: "2-digit"` → `"numeric"`)
- [ ] `libs/list-types/common/src/rendering/crown-utilities.ts` — date helper (~line 46, `day: "2-digit"`) + `formatCrownLastUpdated` (`dd MMMM yyyy` → `d MMMM yyyy`)
- [ ] `libs/list-types/daily-cause-list-common/src/rendering/renderer.ts` — `formatDisplayDate` (`day: "2-digit"` → `"numeric"`)
- [ ] `libs/web-core/src/utils/date-utils.ts` — `formatDateAndLocale` (`day: "2-digit"`) + `formatDate` (`padStart(2, "0")` removal)

### Per-list-type renderers (local date formatting)
- [ ] `libs/list-types/magistrates-standard-list/src/rendering/renderer.ts` — `formatDate` (~line 256) + helper (~line 267)
- [ ] `libs/list-types/crown-warned-list/src/rendering/renderer.ts` — date helper (~line 97)

### Audit all 26 list types for any remaining local date formatting
- [ ] Audit complete — no remaining leading-zero day issues

## Testing

- [ ] Unit tests updated/added for each corrected shared helper (single-digit day → no leading zero)
- [ ] Unit tests for two-digit days (15th → "15 January 2026", unchanged)
- [ ] Unit tests for Welsh locale (5 → "5 Ionawr 2026")
- [ ] Unit tests for list-type renderers that format locally (magistrates-standard-list, crown-warned-list)
- [ ] Regression: time formatting unchanged (minutes still padded, e.g. "9:05am")
- [ ] Coverage >80%

## Verification Steps

- [ ] Build passes: `yarn build`
- [ ] Lint passes: `yarn lint`
- [ ] Tests pass: `yarn test`
- [ ] No console.log statements
- [ ] No TODO comments left
