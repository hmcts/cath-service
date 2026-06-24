# Checklist: Issue #729 - Make the footer font size the same as in OG CaTH

## Acceptance Criteria (verify each when complete)

- [x] AC1: The footer font size in AI CaTH matches OG CaTH (16px, down from v6.2.0's 19px). Verified in compiled CSS: `.govuk-footer{font-size:1rem}` overrides framework `1.1875rem`.
- [x] AC2: Applied using the GOV.UK Design System typography scale via `govuk-font-size($size: 16)`, not an arbitrary px value.
- [x] AC3: Consistent across all pages — rule lives in the global `apps/web/src/assets/css/web.scss`; footer is a single shared partial (`libs/web-core/src/views/components/site-footer.njk`).
- [x] AC4: No other footer styling affected — only `font-size`/`line-height` set on `.govuk-footer`; existing copyright/licence margin/padding/display rules untouched.
- [x] AC5: Renders correctly on mobile and desktop — govuk size 16 is "16/20 at all breakpoints" (confirmed in `settings/_typography-responsive.scss`), so both viewports render at 16px.

## Verification Steps

- [x] Build passes: `yarn build` (web app built, SCSS compiled, footer override present in output)
- [x] Lint passes: `yarn lint` (530 files checked, no fixes applied)
- [x] Tests pass: `yarn test` (164 files, 1688 passed / 3 skipped)
- [x] E2E tests pass (if applicable): N/A — no font-size assertions added per CLAUDE.md (styling excluded from E2E)
- [x] Coverage >80%: N/A — pure CSS change, no new logic

## Code Quality Checks

- [x] Self-review: `git diff`
- [x] All acceptance criteria verified
- [x] No TODO comments left
- [x] No console.log statements
