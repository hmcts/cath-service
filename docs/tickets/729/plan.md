# Implementation Plan: Issue #729

## Overview

Make the AI CaTH footer font size match the legacy (OG) CaTH footer. The footer currently renders larger because govuk-frontend v6.2.0 sets `.govuk-footer` to `govuk-font($size: 19)` (19px desktop / 14px mobile). OG CaTH ran on an older govuk-frontend where the footer used `govuk-font($size: 16)` (16px desktop / 14px mobile — the GDS pre-rebrand value). Fix: add a single targeted override restoring the 16px responsive font scale.

## Root Cause (confirmed)

- `node_modules/govuk-frontend/dist/govuk/components/footer/_mixin.scss:14` → `.govuk-footer { @include base.govuk-font($size: 19); }`
- No existing font-size override in the codebase (`apps/web/src/assets/css/web.scss` only touches footer margin/padding/display).
- OG CaTH footer = 16px desktop (older govuk-frontend default before the rebrand bumped it to 19px).

## Acceptance Criteria Coverage

- **AC1: Footer font size matches OG CaTH** — Override `.govuk-footer` to use the GOV.UK 16px responsive typography scale (`govuk-typography-responsive($size: 16)`), matching OG CaTH's 16px desktop / 14px mobile.
  - Files: `apps/web/src/assets/css/web.scss`

- **AC2: Uses GOV.UK typography scale, not arbitrary value** — Use the `govuk-frontend` `govuk-typography-responsive` mixin (size 16) rather than a hardcoded `px` value, so it stays on the Design System scale and remains responsive.
  - Files: `apps/web/src/assets/css/web.scss`

- **AC3: Consistent across all pages** — `web.scss` is the global stylesheet bundled into every page via the web app; a `.govuk-footer` rule applies site-wide. The footer is rendered from a single shared partial (`libs/web-core/src/views/components/site-footer.njk`).
  - Files: `apps/web/src/assets/css/web.scss` (global)

- **AC4: No unintended changes to other footer styling** — Only set `font-size` on `.govuk-footer`. Leave existing copyright/licence margin, padding, and display rules untouched. Inheriting children (links, licence text) pick up the smaller size as they did in OG CaTH.
  - Files: `apps/web/src/assets/css/web.scss`

- **AC5: Renders correctly on mobile and desktop** — `govuk-typography-responsive(16)` emits the responsive breakpoint (14px mobile, 16px tablet/desktop), so both viewports match OG CaTH. The v6.2.0 mobile size is already 14px, so mobile is effectively unchanged; only desktop drops 19px → 16px.

## Implementation Steps

1. In `apps/web/src/assets/css/web.scss`, add an `@use` for the govuk typography tools if not already importable, then add a `.govuk-footer` rule applying `govuk-typography-responsive($size: 16)`.
   - Note: `web.scss` already does `@use "govuk-frontend/dist/govuk/index";` at line 1. Reference the mixin via that namespace (e.g. `index.govuk-typography-responsive(...)`) or `@use` the specific tools module with a clear namespace. Confirm the correct mixin path during implementation; fall back to `@include` from the `govuk-frontend` tools (`@use "govuk-frontend/dist/govuk/tools/typography"` / `helpers`) if the index namespace doesn't expose it.
2. Place the new rule alongside the existing footer rules (around lines 30-49) for locality.
3. Verify the compiled CSS (build) sets `.govuk-footer` font-size to 16px desktop / 14px mobile.

## Testing

- **Build/lint**: `yarn build`, `yarn lint` must pass (SCSS compiles, Biome clean).
- **Manual/visual** (not automated): footer text is 16px on desktop, matching OG CaTH; other footer elements (licence, copyright, links) unchanged in layout.
- **No new unit tests**: pure CSS change, no JS/TS logic to cover.
- **E2E**: Per CLAUDE.md, do NOT add font-size assertions to Playwright tests (styling is explicitly excluded from E2E). Existing footer E2E/accessibility tests should continue to pass unchanged.

## Notes / Risks

- The exact OG CaTH value (16px) is inferred from the GOV.UK Frontend rebrand history (footer moved 16px→19px), not from a documented constant. If design confirms a different target, only the `$size` value changes.
- Using the responsive mixin (not a flat `16px`) keeps the mobile size at 14px, matching both OG CaTH and the current mobile rendering — avoids regressing mobile.
