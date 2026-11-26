# Code Review: Issue #659

## Summary

The change implements the "Business and Property Division Rolls Building" venue and its two publishable hearing lists. It is a well-executed, faithful application of the existing London Administrative Court multi-tab pattern, plus a sensible consolidation that repurposes the pre-existing `interim-applications-chd-daily-cause-list` package rather than duplicating it.

Scope delivered:
- Venue **rename in place** on `locationId: 26` (name + welshName) — correctly avoids orphaning historic artefacts.
- New package `business-and-property-division-rolls-building-daily-cause-list` — a 16-section multi-tab list driven by a single `SECTIONS` source of truth (Excel config, model, schema, renderer, template, PDF all derive from it).
- Renamed/repurposed package `interim-applications-daily-cause-list` (dropping "chd") with a two-tab workbook: hearings + an editable "Open Justice Statement Details" tab carrying judge name/email interpolated into the open-justice wording, with a placeholder-free fallback.
- Reference data: two new `listTypeData` entries (`isNonStrategic: true`, `Public`, `CFT_IDAM`, `subJurisdictionIds: [10]`); three superseded entries deleted (auto soft-delete on deploy), `CIRCUIT_COMMERCIAL_COURT_DAILY_CAUSE_LIST` deliberately retained pending business confirmation (Q2).
- New common helpers: `CHD_KB_EXCEL_CONFIG_SIMPLE_TIME`, `validateEmailFormat`, and a `matchByNameOnly` option on `createMultiSheetConverter` (a genuinely thoughtful addition — see Positive Feedback).
- Full registration wiring: `app.ts` modulePaths, non-strategic-upload side-effect imports, `PDF_GENERATOR_REGISTRY`, `EMAIL_BUILDER_REGISTRY`, tsconfig paths, package.json deps.
- Mandatory schema + `validate*` wrapper + `json-validator.test.ts` present for both packages (CI guard satisfied).

Tests pass across all changed workspaces (the sole `apps/web/src/server.test.ts` EADDRINUSE failure is the documented pre-existing port flake, unrelated to this work). All changed workspaces are above the 80% statement-coverage threshold.

Overall the implementation is solid. The main gaps are acceptance-criteria completeness (Circuit Commercial removal, alphabetical-order AC), not code correctness.

## 🚨 CRITICAL Issues

None.

## ⚠️ HIGH PRIORITY Issues

1. **AC "old list types removed but retained for MI" is only partially satisfied** — `libs/list-types/common/src/list-type-data.ts`
   - The AC removal list includes commercial-court list types. Three of the four existing entries were soft-deleted, but `CIRCUIT_COMMERCIAL_COURT_DAILY_CAUSE_LIST` (retained ~line 758) was deliberately left active per the documented Q2 decision (not London-scoped; awaiting business confirmation).
   - **Impact:** a list type the AC arguably wants removed remains publishable service-wide.
   - **Recommendation:** confirm scope with the business. If confirmed London-only, delete the entry (one-line change; deploy soft-deletes automatically). Track the follow-up explicitly.

2. **AC "lists arranged in alphabetical order under the caution message" has no evidence in this change** — venue landing (`summary-of-publications`)
   - This relies on the pre-existing `localeCompare` ordering on the venue publications page; nothing in this branch verifies it, and the E2E test does not assert publication ordering.
   - **Impact:** the AC cannot be shown to hold for this venue.
   - **Recommendation:** add an assertion to the E2E journey (or a unit test on the venue page) that the two publications render alphabetically, so the criterion is provably met.

## 💡 SUGGESTIONS

1. **`as any` cast on the multi-sheet converter registration** — `business-and-property-division-rolls-building-daily-cause-list-config.ts:27` and `interim-applications-daily-cause-list-config.ts:63`. The multi-sheet converter returns an object shape while `convertExcelToJson` is typed for the single-sheet array shape, so the cast mirrors the sibling court-of-appeal converter. Consider widening the registry's `convertExcelToJson` type to accept `Record<string, unknown[]>` so multi-sheet converters no longer need `as any`. Low priority — it is a consistent, documented pattern — but it defeats type-checking at the registration boundary.

2. **Interim `email` schema property has no email-format check** — `interim-applications-daily-cause-list/src/schemas/interim-applications-daily-cause-list.json` (email property ~line 81). The schema only enforces the no-HTML pattern; email-format validation lives solely in `validateEmailFormat` at Excel-conversion time. A direct JSON upload with a malformed email would pass schema validation. Conversion is the normal path so risk is low, but adding a `format`/`pattern` to the schema would close the gap and keep validation in one declarative place.

3. **Interim template injects interpolated content via raw `html:`** — `interim-applications-daily-cause-list.njk:25`. `importantInfo.editableParagraph` (which embeds the spreadsheet-sourced judge name and email) is concatenated into the `govukDetails` `html` option, which is not autoescaped. This is safe today because both the schema `pattern` and `validateNoHtmlTags` reject `<...>` at two layers, and it matches the inherited pre-existing pattern. Still, prefer passing structured fields to the template and letting Nunjucks autoescape each value, rather than building HTML strings from user-influenced data — it removes the reliance on upstream validation for XSS safety.

4. **Duplicated per-section schema blocks** — `business-and-property-division-rolls-building-daily-cause-list.json`. The 16 section objects are byte-identical. This is fine for a static JSON schema (no clean DRY primitive without `$ref`/`definitions`), but a single `$ref`ed `hearing` definition reused across the 16 properties would make the schema far shorter and prevent drift. Optional.

## ✅ Positive Feedback

- **`SECTIONS` single source of truth** (`sections.ts`) is exactly the right call for a 16-section list — Excel config, model type, renderer, template loop and validator test all derive from one array, so section changes are a one-line edit. The validator test iterates `SECTIONS` with `describe.each`, guaranteeing every section and every required field is individually enforced without 16 hand-written blocks.
- **`matchByNameOnly` converter option** (`multi-sheet-converter.ts`) is a genuinely good piece of engineering: because all 16 section tabs share the same field config, the positional-index fallback would silently mis-file a mis-named tab into section 0. Disabling the fallback and throwing a clear "expected tabs named…" error is the correct, safe behaviour, and the 31-char truncation handling for long tab names shows real attention to Excel's quirks.
- **Venue rename rather than create** correctly preserves `locationId: 26`, avoiding orphaned artefacts and broken subscriptions — the highest-risk trap in this ticket, handled well.
- **`listTypeName` used everywhere** for guards, PDF registry and notification registry; no numeric `listTypeId` coupling, per CLAUDE.md.
- **Consolidation of the duplicate interim package** into a renamed CHD package (with the old list-type entry removed so MI retention still works via soft-delete) is the pragmatic, DRY choice and is clearly documented in plan.md/tasks.md.
- **Welsh parity** is maintained across both packages; locale objects mirror English structurally and the fallback wording avoids ever rendering the literal `[name, email address]` placeholder to the public.
- **Strong test suites**: 130 tests (package A) and 42 (interim) covering converter, renderer, PDF, validator, config and template (structural Cheerio + Welsh) plus an E2E journey exercising both populated and empty sections, Welsh, and inline axe checks.

## Test Coverage Assessment

- **Unit tests:** Comprehensive. Converter (ExcelJS fixtures built programmatically), renderer (empty/populated sections, locale switch), PDF generator, schema validator (every required field per section), and config. Interim package additionally tests the empty open-justice tab fallback and email/time validation.
- **E2E tests:** One well-scoped journey (`business-and-property-division-rolls-building-daily-cause-list.spec.ts`, `@nightly`) covering venue landing → list selection → 16-section render (populated + empty branch) → Welsh → inline axe (WCAG 2.2 AA). Does not assert the alphabetical publication ordering AC (see HIGH #2). No dedicated interim-applications E2E, but the pattern is shared and the interim renderer/template are unit-tested.
- **Accessibility tests:** axe run inline in the E2E journey for both English and Welsh; documented rule disables (`target-size`, `link-name`) are pre-existing site-wide footer issues, correctly annotated.
- **Statement coverage per changed workspace (from STEP 2b):**
  - @hmcts/business-and-property-division-rolls-building-daily-cause-list: 95.12%
  - @hmcts/interim-applications-daily-cause-list: 94%
  - @hmcts/list-types-common: 92.56%
  - @hmcts/chd-kb-common: 100%
  - @hmcts/location: 92.19%
  - @hmcts/publication: 94.9%
  - @hmcts/notifications: 90.57%
  - @hmcts/web: full suite passes (1 pre-existing `server.test.ts` port flake); new page + template tests all pass.
  - All changed workspaces are above the 80% threshold.

## Acceptance Criteria Verification

- [x] The venue 'Business and Property Division Rolls Building' is created in CaTH — rename in place on `libs/location/src/location-data.ts:189` (`name`/`welshName` on `locationId: 26`).
- [x] Page header 'What do you want to view from Business and Property Division Rolls Building?' is displayed — rendered from the renamed venue on the existing summary-of-publications page; asserted in `e2e-tests/tests/business-and-property-division-rolls-building-daily-cause-list.spec.ts:92`.
- [x] FaCT link displayed with the masked link text and trailing wording — venue landing (existing) and list templates, e.g. `apps/web/src/pages/(list-types)/business-and-property-division-rolls-building-daily-cause-list/business-and-property-division-rolls-building-daily-cause-list.njk:10-12` with content in `locales/en.ts:5-7`.
- [x] Caution message displayed under the FaCT link — the venue landing page renders `location_metadata.caution_message` (admin-managed, matches reference pip-frontend behaviour, not code-seeded). The content entry is a documented post-deploy operational step in `docs/tickets/659/tasks.md:75`. Code mechanism is complete; display depends on the operational step being actioned.
- [x] Only 2 list types publishable under the venue (Interim Applications + Rolls Building) — both added with `subJurisdictionIds: [10]` in `libs/list-types/common/src/list-type-data.ts` (new entries ~lines 749-770).
- [~] Any other list type previously created under this venue removed but retained for MI — three existing entries soft-deleted (`BUSINESS_AND_PROPERTY_DAILY_CAUSE_LIST`, `COMPANIES_WINDING_UP_CHD_DAILY_CAUSE_LIST`, `FINANCIAL_LIST_CHD_KB_DAILY_CAUSE_LIST`) and `INTERIM_APPLICATIONS_CHD_DAILY_CAUSE_LIST` renamed; packages/wiring retained for historic rendering. **Missing:** `CIRCUIT_COMMERCIAL_COURT_DAILY_CAUSE_LIST` remains active by deliberate Q2 decision pending business confirmation (`list-type-data.ts` ~line 758). See HIGH #1.
- [x] The Rolls Building list contains multiple sections from the various courts — `libs/list-types/business-and-property-division-rolls-building-daily-cause-list/src/sections.ts:7-24` (16 sections) drive `rendering/renderer.ts:34-38`.
- [x] 16 sequential section headers in the listed order — `sections.ts` literal order (Q3); asserted in the template test and E2E (`...spec.ts:110-113,128-129`).
- [x] Rolls Building list published via multi-tab Excel template (like London Admin) — `conversion/business-and-property-division-rolls-building-daily-cause-list-config.ts:13-28` via `createMultiSheetConverter` with `matchByNameOnly`; covered by `conversion/*-config.test.ts`.
- [x] 'No hearings scheduled for this day' shown for empty sections — `business-and-property-division-rolls-building-daily-cause-list.njk:75-77`; `locales/en.ts:40`; asserted E2E `...spec.ts:118`.
- [x] Rolls Building open-justice wording updated (Remote Hearings block, 5 contacts, Remote Judgments) — `locales/en.ts:12-28` / `cy.ts:12-28`; rendered `...njk:21-35`; asserted E2E `...spec.ts:105-107`.
- [x] Interim Applications published via 2-tab Excel supporting judge name/email amendment — `interim-applications-daily-cause-list/src/conversion/interim-applications-daily-cause-list-config.ts:53-57` (Hearing List + Open Justice Statement Details tabs); interpolation in `rendering/renderer.ts:30-38`.
- [x] Interim Applications open-justice wording updated (name/email substitution + 2-hour paragraph + individual-list note) — `interim-applications-daily-cause-list/src/locales/en.ts:12-18`; renderer builds paragraphs 1-3; literal `[name, email address]` never rendered (fallback at `renderer.ts:33-35`).
- [~] The Rolls Building hearing lists are arranged in alphabetical order under the caution message — relies on the pre-existing `localeCompare` ordering on the venue publications page; **no evidence** in this change and no test asserts publication ordering. See HIGH #2.
- [x] Welsh translations present and structurally parallel — both packages ship full `cy.ts` mirroring `en.ts` (e.g. `business-.../locales/cy.ts`, `interim-.../locales/cy.ts`); section Welsh labels in `sections.ts`; venue welshName updated in `location-data.ts:190`.

## Next Steps
- [ ] Address critical issues
- [ ] Fix high priority items
- [ ] Consider suggestions
- [ ] Re-run tests after fixes

## Overall Assessment

NEEDS CHANGES

The implementation is high quality and technically sound; this rating is driven solely by two acceptance criteria not being fully provable in this change: the deliberate retention of `CIRCUIT_COMMERCIAL_COURT_DAILY_CAUSE_LIST` (HIGH #1, pending business confirmation) and the absence of any evidence/test for the alphabetical-ordering AC (HIGH #2). Both are quick to resolve — confirm/remove the entry and add an ordering assertion — after which this is comfortably approvable.
