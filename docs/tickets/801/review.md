# Code Review: Issue #801

## Summary

Issue #801 adds the **Chancery Appeals (ChD) Daily Cause List** as a non-strategic
list type. This is a thin wrapper over the shared `@hmcts/chd-kb-common` package,
structurally near-identical to the already-shipped
`companies-winding-up-chd-daily-cause-list` sibling. The implementation is clean,
follows the established pattern faithfully, keys everything on the stable
`listTypeName`, and has genuinely thorough unit + template tests. Welsh content is
real translation, not placeholder text.

The list-specific surface (locale copy, the two important-information blocks,
`list-type-data.ts` entry, `subJurisdictionIds:[10]`, and the PDF/converter/
notification wiring) is all correct and consistent with the sibling.

Counts: **0 critical / 1 high / 5 suggestions**. All acceptance criteria met.
New module statement coverage confirmed at **90.9%** (above the 80% threshold).

## 🚨 CRITICAL Issues

None.

## ⚠️ HIGH PRIORITY Issues

1. **E2E journey deferred (`docs/tickets/801/tasks.md:43`).** No Playwright spec
   exercises the Chancery Appeals upload/render journey. The task notes the only
   non-strategic-upload spec is a generic SSO-gated `.skip`. That is a reasonable
   argument against duplicating a journey, but it leaves the end-to-end publish →
   render → PDF path unverified outside unit tests.
   - **Impact**: No automated proof of the full upload-to-render journey.
   - **Recommendation**: confirm the shared non-strategic-upload E2E covers this
     list type by parameterisation, or record a manual verification note against the
     pip-frontend reference render before release.

## 💡 SUGGESTIONS

1. **Hardcoded English in the controller guard**
   (`apps/web/src/pages/(list-types)/chancery-appeals-chd-daily-cause-list/index.ts:23-26`).
   `errorTitle: "Invalid List Type"` and `errorMessage: "This list type is not
   supported by this module"` are hardcoded English on the wrong-list-type error
   path. This mirrors the sibling and is an internal error path (not normal user
   content), but it will not switch to Welsh. Consider sourcing from locale files
   for consistency with the CLAUDE.md "no hardcoded English display strings" rule.

2. **`config.ts` exports `assets` for a directory that does not exist**
   (`libs/list-types/chancery-appeals-chd-daily-cause-list/src/config.ts:8`).
   There is no `src/assets/` dir and nothing references this export (not wired into
   `apps/web/vite.build.ts`). Copied verbatim from the sibling. Harmless but dead —
   drop it, or add it only if assets are ever introduced (YAGNI).

3. **Redundant `role="table"` on a native `<table>`**
   (`chancery-appeals-chd-daily-cause-list.njk:40`). The explicit ARIA `role="table"`
   on a semantic `<table>` is redundant. Not a WCAG failure and it matches the
   sibling, but it is noise. The `aria-label` is fine and useful.

4. **`additionalInformation` required vs optional discrepancy.** The ticket spec
   comment §9 (`ticket.md:114-116`) lists `additionalInformation` as *optional*
   (`required` array excludes it). The shipped shared schema marks it **required**
   (`libs/list-types/chd-kb-common/src/schemas/chd-kb-common.json:7`). This was an
   explicit, documented decision (`plan.md:181`, confirmed by the assignee 2026-08-10)
   to reuse `chd-kb-common` rather than fork the schema. It does not violate the
   ticket's primary ACCEPTANCE CRITERIA (which only mandate field presence + order),
   so no change is required — but flagging so it is not lost: uploads with a blank
   Additional Information column will be rejected.

5. **Converter config indirection**
   (`libs/list-types/chancery-appeals-chd-daily-cause-list/src/conversion/chancery-appeals-chd-daily-cause-list-config.ts:7`).
   `export const CHANCERY_APPEALS_CHD_EXCEL_CONFIG = CHD_KB_EXCEL_CONFIG;` is a
   pass-through alias. Fine and matches the sibling, but the alias is only consumed
   locally — a direct `createConverter(CHD_KB_EXCEL_CONFIG)` would be simpler. Minor.

## ✅ Positive Feedback

- **Correct reuse of `@hmcts/chd-kb-common`.** Schema, converter, validator,
  renderer, email-summary and types are all inherited, not duplicated — no drift risk.
- **`listTypeName` everywhere, never `listTypeId`.** The guard keys on
  `artefact.listTypeName` (`index.ts:20`), the registries key on the string name
  (`service.ts:190`, `notification-service.ts:202`), and the controller test uses
  `listTypeId: 999` deliberately (`index.test.ts:71`) to prove ID-independence —
  exactly per CLAUDE.md.
- **Genuine Welsh translation.** `locales/cy.ts` contains real Welsh for every key
  including the two important-information blocks and the caution notes — no
  `[TRANSLATION REQUIRED]` placeholders.
- **Thorough controller tests** (`index.test.ts`): happy path, missing/array
  artefactId → 400, not found → 404, wrong list type → 400, missing JSON → 404,
  invalid JSON → 400, server error → 500, Welsh locale, default locale, provenance
  label resolution and fallback. All branches of the handler are exercised.
- **Structural template tests** (`*.njk.test.ts`): Cheerio-based structural
  assertions (not string matching), column-index constants, conditional
  empty-state rendering both ways, Welsh render, and en/cy key parity plus
  tableHeaders key parity (`:107`, `:111`). Matches the project's template-test rules.
- **Registration wiring is complete and consistent**: `list-type-data.ts` entry,
  `PDF_GENERATOR_REGISTRY`, `EMAIL_BUILDER_REGISTRY`, side-effect converter imports
  on both upload pages, `app.ts` modulePaths, root `tsconfig.json` paths, and the
  three `package.json` dependency additions.
- **`.js` import extensions, ESM, no `any` in production code** (test files use
  `as any` on mocks, which is acceptable). Types re-exported cleanly under
  list-specific aliases (`ChanceryAppealsChdHearingList`).
- **`autoescape: true`** in the render env; the template outputs untrusted hearing
  fields (`hearing.judge`, etc.) through Nunjucks escaping, and the schema's
  no-HTML-tags pattern is a second layer. The one `html:` block in `govukDetails`
  (`:25`) interpolates only trusted locale strings, not user data — safe.

## Test Coverage Assessment

- **Unit tests**: Present and comprehensive for all business logic —
  renderer (locale/date/PM-time/empty), PDF generator (success/failure/oversize/
  render-options), converter registration, and the full controller branch matrix.
- **Template tests**: Present (structural Cheerio, Welsh, key parity).
- **Accessibility**: Covered indirectly via structural template assertions
  (visually-hidden label wiring, heading structure, back-to-top anchor). No axe/E2E
  a11y run for this page (shared journey deferred).
- **E2E**: None specific to this list type (deferred — see HIGH #2).

**Per-workspace statement coverage** (from `yarn install` then
`yarn workspace @hmcts/chancery-appeals-chd-daily-cause-list test --coverage`):

- `libs/list-types/chancery-appeals-chd-daily-cause-list`: **90.9% statements**
  (20/22), branches 66.66%, functions 75%. 3 test files / 9 tests pass. ✅ above 80%.
  The only 0% file is `src/index.ts`, a pure re-export barrel that executes via
  package imports, not in-process — not a real gap. `pdf-generator.ts` is 86.66%
  (uncovered lines 35, 60 — error/edge branches).
- `libs/publication`, `libs/notifications`, `libs/list-types/common`, `apps/web`:
  changes are single-line registry/entry additions to large existing workspaces; the
  aggregate figures are dominated by pre-existing code and are not a meaningful
  signal for this change.

## Acceptance Criteria Verification

Criteria taken verbatim from `docs/tickets/801/ticket.md` ACCEPTANCE CRITERIA.

- [x] **Created under Business and Property Courts Rolls Building, linked to 'Civil'
  jurisdiction and 'Royal Courts of Justice Group' region** — entry added at
  `libs/list-types/common/src/list-type-data.ts:801-811` with
  `subJurisdictionIds:[10]` (High Court, within Civil jurisdiction), attaching to
  the existing Rolls Building location 26 / region 11 (per `plan.md:101`). Matches
  the Rolls Building sibling.
- [x] **Data fields created in order: Judge, Time, Venue, Type, Case Number, Case
  Name, Additional Information** — enforced by the shared
  `libs/list-types/chd-kb-common/src/schemas/chd-kb-common.json:7` and
  `CHD_KB_EXCEL_CONFIG`; column order asserted in
  `chancery-appeals-chd-daily-cause-list.njk.test.ts:192-200`.
- [x] **Published through the Excel upload route, converted to JSON** — converter
  registered by name at
  `libs/list-types/chancery-appeals-chd-daily-cause-list/src/conversion/chancery-appeals-chd-daily-cause-list-config.ts:10`;
  registration asserted in `…-config.test.ts:9-11`; upload pages import for
  side-effect (`apps/web/src/pages/(admin)/non-strategic-upload/index.ts:10`).
- [x] **Validation schema and style guide created** — validator re-exported for the
  dispatcher at
  `libs/list-types/chancery-appeals-chd-daily-cause-list/src/index.ts:15`
  (`validateChdKbListType`); invalid-JSON path returns 400 (`index.test.ts:229-261`);
  template migrated at `chancery-appeals-chd-daily-cause-list.njk`.
- [x] **PDF and Excel downloadable versions** — PDF generator
  (`src/pdf/pdf-generator.ts:24`) registered in `PDF_GENERATOR_REGISTRY`
  (`libs/publication/src/processing/service.ts:190`), tested in
  `pdf-generator.test.ts:54-136`; Excel download uses the shared non-strategic
  converter/download infrastructure.
- [x] **Style guide follows the pip-frontend reference structure** — template
  structure (h1/FaCT link/venue/important-information details/search/7-column
  table/data source/back-to-top) verified structurally in
  `chancery-appeals-chd-daily-cause-list.njk.test.ts` (whole file). Live visual diff
  against the reference URL deferred (`tasks.md:44`) — structural evidence exists.
- [x] **JSON follows the given format** — the seven fields with the ticket's exact
  keys are the `chd-kb-common` schema; the ticket's sample rows are used verbatim as
  fixtures in `index.test.ts:79-89` and `renderer.test.ts:8-17`.
- [x] **(implicit) Welsh support** — real Welsh locale
  (`libs/list-types/chancery-appeals-chd-daily-cause-list/src/locales/cy.ts`),
  key-parity test (`*.njk.test.ts:107`), Welsh render test (`*.njk.test.ts:284-300`),
  Welsh locale controller test (`index.test.ts:280-319`).

Tally: **8 met / 0 partial / 0 unmet** (of 8, including the implicit Welsh criterion).

## Next Steps

- [ ] Confirm the shared non-strategic-upload E2E covers this list type, or add a
      manual verification note against the pip-frontend reference render.
- [ ] (Optional) Move the guard's `errorTitle`/`errorMessage` into locale files.
- [ ] (Optional) Remove the unused `assets` export from `config.ts`.
- [ ] (Optional) Drop the redundant `role="table"` and the converter alias.

## Overall Assessment

**APPROVED** — The code is correct, faithful to the reviewed sibling pattern, fully
keyed on `listTypeName`, has real Welsh content and thorough unit/template tests, and
every acceptance criterion is met with cited evidence. The open items are
process/verification (E2E) and minor polish, not code defects.
