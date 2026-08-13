# Code Review: Issue #802

## Summary

Implements the Commercial Court (KB) Daily Cause List as a thin per-list-type consumer of
`@hmcts/chd-kb-common`, closely mirroring the sibling `companies-winding-up-chd-daily-cause-list`.
The new lib `libs/list-types/commercial-court-kb-daily-cause-list/` ships no bespoke schema, validator,
Excel config, types, or renderer core — it re-exports and wraps the shared CHD/KB building blocks and
adds only its own locales, PDF generator + template, converter registration, renderer wrapper, and
composition-point registrations. The public page lives at
`apps/web/src/pages/(list-types)/commercial-court-kb-daily-cause-list/`.

The implementation is clean, consistent with the established sibling pattern, routes exclusively on the
stable `listTypeName` (never numeric `listTypeId`), and every composition point called out in the plan
is present: PDF registry, both admin upload side-effect imports, email builder registry,
`list-type-data.ts`, tsconfig aliases, `app.ts` modulePaths, and workspace deps in three packages. All
changed workspaces exceed the 80% statement-coverage bar. All ACs are met (with the two documented
clarifications — no generated `.xlsx`, `additionalInformation` required — applied as resolved).

- Files reviewed: lib (`config.ts`, `index.ts`, `conversion/`, `rendering/`, `pdf/`, `locales/`),
  page (`index.ts`, `.njk`, tests), plus 8 modified composition-point files.
- No CRITICAL or HIGH issues found. A handful of low-value suggestions below.

## 🚨 CRITICAL Issues

None.

## ⚠️ HIGH PRIORITY Issues

None.

## 💡 SUGGESTIONS

1. **Unused direct dependencies in the new lib's `package.json`**
   (`libs/list-types/commercial-court-kb-daily-cause-list/package.json:30-32`).
   `exceljs`, `luxon`, and `nunjucks` are declared but not imported anywhere in this lib's `src/`
   (grep returns no usage). Excel conversion, date formatting, and Nunjucks configuration are all
   reached transitively via `@hmcts/chd-kb-common` / `@hmcts/list-types-common`. These were copied
   verbatim from the sibling. Consider trimming to what is actually imported to keep the dependency
   graph honest. Low risk — purely hygiene, and mirrors the existing sibling.

2. **Redundant ARIA `role="table"` on a native `<table>`**
   (`apps/web/src/pages/(list-types)/commercial-court-kb-daily-cause-list/commercial-court-kb-daily-cause-list.njk:40`).
   A semantic `<table>` already exposes the table role; the explicit `role="table"` is redundant.
   Harmless, and inherited from the sibling template, but it can be dropped.

3. **Search input has both an associated `<label>` and an `aria-label`**
   (`commercial-court-kb-daily-cause-list.njk:31-34`). When both are present the `aria-label`
   overrides the visually-hidden `<label>`, making the `<label for="case-search-input">` effectively
   dead markup for screen readers. One accessible name mechanism is enough. Again matches the sibling,
   so consistency is preserved, but worth noting for a future cleanup of the shared pattern.

4. **PDF generator branch coverage** — `pdf-generator.ts` lines 35 (Welsh `loadTranslations` branch)
   and 60 (`createPdfErrorResult` catch) are uncovered (86.66% stmts / 60% branch on that file). A
   `locale: "cy"` PDF test and a thrown-error test would push this over 90% and exercise the Welsh
   translation path end-to-end.

5. **No E2E coverage for the public journey.** There is no Playwright spec for this list type (nor for
   the sibling `companies-winding-up-chd`). The `.claude/rules` ask for one happy-path journey per new
   page with inline accessibility + Welsh checks. Not a blocker given the strong unit/template
   coverage and the consistent sibling precedent, but a single `@nightly` journey spanning
   upload → view (EN) → view (`?lng=cy`) → Axe scan would close the gap.

## ✅ Positive Feedback

- **Correct reuse of `@hmcts/chd-kb-common`.** No duplicated schema/validator/Excel config/renderer —
  exactly the intent of the shared lib. The re-export comments in `src/index.ts:3-18` explain *why*
  each symbol is re-exported under this list type's name (PDF registry, validator dispatcher, email
  builders resolve by package name), which is genuinely useful context.
- **Stable `listTypeName` everywhere.** `SUPPORTED_LIST_TYPE = "COMMERCIAL_COURT_KB_DAILY_CAUSE_LIST"`
  (`index.ts:12`), converter registered by name (`commercial-court-kb-daily-cause-list-config.ts:10`),
  PDF/email registries keyed by name. Test fixtures deliberately use `listTypeId: 999` to prove
  ID-independence (`index.test.ts:71,205,...`) — precisely what CLAUDE.md requires.
- **Full bilingual support with parity assertions.** `en.ts`/`cy.ts` keys and `tableHeaders` keys are
  asserted equal (`commercial-court-kb-daily-cause-list.njk.test.ts:106-112`), Welsh rendering is
  exercised in both the template and renderer tests, and no hardcoded display strings leak into the
  controller (title flows from locale via the renderer).
- **Renderer feeds the template faithfully.** The `chd-kb-common` schema requires exactly
  `judge, time, venue, type, caseNumber, caseName, additionalInformation`
  (`chd-kb-common/src/schemas/chd-kb-common.json:7`); the renderer maps those same seven fields
  (`renderer.ts:32`), and the template renders them as seven columns in that order
  (`commercial-court-kb-daily-cause-list.njk:43-49`) — column order is asserted in the template test
  (`...njk.test.ts:191-199`).
- **Template structure matches the migrated pip-frontend / sibling layout** almost line-for-line
  (title, FaCT link, venue/address, "List for"/"Last updated", important-information `govukDetails`,
  visually-hidden search label, single GOV.UK table, data source, back-to-top). The only intended
  divergence is a second important-information section (remote hearings + remote judgments), correctly
  reflected in both EN/CY locales and the template test (`...njk.test.ts:152-168`).
- **Comprehensive controller error-branch tests** — 400 (missing/array artefactId), 404 (artefact
  missing, JSON missing), 400 (wrong list type, invalid data), 500 (server error), plus EN/CY/default
  locale and provenance-label fallback (`index.test.ts:127-436`).
- **CI validator guard satisfied correctly** — the lib ships no `src/schemas/` dir, so the guard
  (`libs/list-types/common/src/validation/guard.test.ts`) does not require a local schema, yet a
  `validate*` symbol is still exported (`validateCommercialCourtKbDailyCauseList`, `index.ts:17`).
- **Court hierarchy AC verified against source data:** location 26 "Business and Property Courts Rolls
  Building" has `regions: [11]` (Royal Courts of Justice Group) and `subJurisdictions: [10]`
  (`location-data.ts:189-192`); subJurisdiction 10 = "High Court" under `jurisdictionId: 1` = "Civil"
  (`location-data.ts:347-352`, `272-274`). The new `list-type-data.ts` entry uses `subJurisdictionIds: [10]`.

## Test Coverage Assessment

Per-workspace statement coverage (from `yarn ... test --coverage`):

| Workspace | Statements | Flag |
|-----------|-----------|------|
| `@hmcts/commercial-court-kb-daily-cause-list` (new lib) | 90.9% (20/22) | OK |
| `apps/web` | 95.74% (5017/5240) | OK |
| `@hmcts/publication` | 95.34% (410/430) | OK |
| `@hmcts/notifications` | 90.57% (221/244) | OK |
| `@hmcts/list-types-common` | 87.64% (468/534) | OK |

Notes:
- The new lib's uncovered lines are all in `pdf/pdf-generator.ts` (86.66% file stmts): the Welsh
  translation branch and the error-catch path. `index.ts` shows 0% in the lib's own run because it is
  a pure re-export barrel exercised via the app/registry consumers, not the lib's own tests — this is
  expected for a re-export barrel and does not drag the workspace below 80%.
- `list-type-data.ts` (data-only) and the composition-point diffs in `publication`/`notifications` are
  registry entries covered indirectly; both workspaces remain well above 80%.

No changed workspace is below 80% statement coverage.

## Acceptance Criteria Verification

ACs taken verbatim from `docs/tickets/802/ticket.md` Description (lines 23-29):

- [x] **The Commercial Court (KB) daily cause list is created under the Business and Property Courts
  Rolls Building in CaTH and is linked to the 'Civil' jurisdiction and 'Royal Courts of Justice Group'
  region** — `libs/list-types/common/src/list-type-data.ts` (new entry `subJurisdictionIds: [10]`);
  location 26 mapping in `libs/location/src/location-data.ts:189-192` (regions [11]=RCJ Group,
  subJurisdictions [10]); subJurisdiction 10 → jurisdiction 1 "Civil" at `location-data.ts:347-352`,`272-274`.

- [x] **The following data fields are created in the listed order in the validation schema (Judge,
  Time, Venue, Type, Case Number, Case Name and Additional Information)** — shared schema
  `libs/list-types/chd-kb-common/src/schemas/chd-kb-common.json:7-15` (all seven required, this order);
  Excel config `chd-kb-common/src/conversion/chd-kb-excel-config.ts:4-17`; column order asserted in
  `commercial-court-kb-daily-cause-list.njk.test.ts:191-199`.

- [x] **The list is published through the Excel upload route in CaTH; uploaded as an excel template
  and converted to the JSON format suitable for rendering** — converter registered by name in
  `libs/list-types/commercial-court-kb-daily-cause-list/src/conversion/commercial-court-kb-daily-cause-list-config.ts:9-10`;
  side-effect imports wired into both admin upload pages
  (`apps/web/src/pages/(admin)/non-strategic-upload/index.ts:10`,
  `.../non-strategic-upload-summary/index.ts:10`); registration test at
  `conversion/commercial-court-kb-daily-cause-list-config.test.ts:9-11`.

- [x] **The validation schema and style guide for the list is created** — validator re-exported as
  `validateCommercialCourtKbDailyCauseList`
  (`libs/list-types/commercial-court-kb-daily-cause-list/src/index.ts:17`); style guide = page template
  `commercial-court-kb-daily-cause-list.njk` + tests; CI guard passes
  (`libs/list-types/common/src/validation/guard.test.ts`).

- [x] **A PDF and Excel downloadable version of the hearing list is created** — PDF: generator
  `libs/list-types/commercial-court-kb-daily-cause-list/src/pdf/pdf-generator.ts:24` registered in
  `PDF_GENERATOR_REGISTRY` (`libs/publication/src/processing/service.ts:190`); tests in
  `pdf/pdf-generator.test.ts`. Excel: per the resolved clarification, satisfied by the Excel-template
  upload round-trip (no generated `.xlsx`), consistent with the sibling CHD/KB list — no
  `EXCEL_GENERATOR_REGISTRY` entry, as intended.

- [x] **The style guide should follow the structure in the pip-frontend
  commercial-court-kb-daily-cause-list page** — template migrated to match the sibling/pip-frontend
  layout: `commercial-court-kb-daily-cause-list.njk:1-82` (title, FaCT link, venue/address, list date,
  important-information `govukDetails`, search, seven-column GOV.UK table, data source, back-to-top);
  structure verified against `companies-winding-up-chd-daily-cause-list.njk`.

- [x] **The Json file should follow the [given] format** — shared `ChdKbHearing` type keys are exactly
  `judge, time, venue, type, caseNumber, caseName, additionalInformation`
  (`libs/list-types/chd-kb-common/src/models/types.ts:1-9`), matching the ticket's sample payload;
  exercised in `rendering/renderer.test.ts:7-38` and `index.test.ts:79-89`.

Tally: 7 met / 0 partial / 0 unmet of 7.

## Next Steps

- [ ] Optional: trim unused `exceljs`/`luxon`/`nunjucks` deps from the new lib's `package.json`.
- [ ] Optional: add a Welsh-locale and error-path PDF generator test to lift `pdf-generator.ts` branch coverage.
- [ ] Optional: drop redundant `role="table"` and the duplicate search-input accessible name (shared with sibling — consider fixing both together).
- [ ] Optional: add one `@nightly` E2E journey (upload → view EN → view CY → Axe).
- [ ] Confirm the outstanding plan clarifications (Welsh copy sign-off, exact template column headers, caution wording) with the business before go-live.

## Overall Assessment

**APPROVED** — advisory.

All seven acceptance criteria are met, every composition-point registration is present and consistent,
routing is entirely on the stable `listTypeName`, bilingual parity is enforced, the renderer/schema/
template field sets align, the CI validator guard is satisfied, and all changed workspaces are above
80% statement coverage. The remaining items are low-value suggestions, not blockers.
