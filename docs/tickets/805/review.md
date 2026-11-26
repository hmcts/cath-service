# Code Review: Issue #805

_Financial List (ChD/KB) Daily Cause List — non-strategic Excel-upload list type._

## Summary

The implementation adds a new list-type module `libs/list-types/financial-list-chd-kb-daily-cause-list/` as a thin wrapper over `@hmcts/chd-kb-common`, mirroring the sibling `companies-winding-up-chd-daily-cause-list` module closely. It ships no schema/validation/model of its own (all re-exported from `chd-kb-common`), reuses `CHD_KB_EXCEL_CONFIG`, and registers a converter, PDF generator, page controller, reference-data entry and email-summary builder.

The work is high quality, faithfully follows the established sibling pattern, and passes lint/tests. Wiring across `apps/web`, `libs/publication`, `libs/notifications`, `tsconfig.json` and `list-type-data.ts` is complete and correct. Welsh translations are real (no leftover markers) and structurally sound. All registration is keyed on the stable `listTypeName` string — no numeric `listTypeId` usage.

The `subJurisdictionIds: [10]` decision (plan open question: [10] vs the ticket-text [1]) was **confirmed as `[10]` by product**, matching the implemented value and the sibling list. No change required; all acceptance criteria are now met.

Counts: 0 critical, 0 high priority, 3 suggestions.

## 🚨 CRITICAL Issues

None.

## ⚠️ HIGH PRIORITY Issues

None.

## 💡 SUGGESTIONS

1. **`config.ts` exports an unused `assets` path.**
   `libs/list-types/financial-list-chd-kb-daily-cause-list/src/config.ts:8` exports `assets = path.join(__dirname, "assets/")`, but the module ships no `assets/` directory and `vite.config.ts` was (correctly) not modified. This is copied verbatim from the sibling, so it is consistent, but the export is dead. Harmless; consider dropping it from both modules in a later cleanup.

2. **Converter-config test relies on `chd-kb-common` for field-level coverage.**
   `financial-list-chd-kb-daily-cause-list-config.test.ts` only asserts registration, field order and `minRows` (correctly, since the config object is shared and the field-level behaviour is tested in `chd-kb-common`). This is a reasonable DRY decision and matches the sibling, but it means the required-field / time-format / HTML-rejection behaviour for this list type is only proven transitively. Acceptable given the shared config, worth being aware of.

3. **PDF generator branch coverage gaps.**
   `pdf-generator.ts` lines 35 and 60 (the empty-provenance branch and the `catch`/`createPdfErrorResult` path) are uncovered (branch coverage 60%). The sibling has the same shape. A small test for the error path and empty-provenance would lift branch coverage; statements are already 90.9%.

## ✅ Positive Feedback

- **Faithful reuse of the shared `chd-kb-common` package** — no duplicated schema/validator/converter/model. `index.ts` re-exports `validateChdKbListType as validateFinancialListChdKbDailyCauseList`, the `ChdKb*` types aliased, and the email-summary helpers, exactly matching the sibling `index.ts`. Single source of truth preserved.
- **All registration keyed on the stable `listTypeName` string** `FINANCIAL_LIST_CHD_KB_DAILY_CAUSE_LIST` — PDF registry (`service.ts:184`), converter (`...-config.ts:10`), email registry (`notification-service.ts:193`), controller guard (`index.ts:20`). No numeric `listTypeId` anywhere. Test fixtures correctly use `listTypeId: 999` to prove ID-independence (`index.test.ts:71` etc.).
- **Notifications email-summary wiring is complete and matches the Companies Winding Up pattern exactly** — package.json dependency, aliased import, and an `EMAIL_BUILDER_REGISTRY` entry with `extract`/`format` (`notification-service.ts:193-196`).
- **Welsh translations are real and complete** — `cy.ts` has genuine Welsh for the full page title, important-information guidance, table headers and cautions, with no `[WELSH TRANSLATION REQUIRED]` markers in source. Key parity is enforced by a test (`*.njk.test.ts:106-112`).
- **Strong template test suite** — structural Cheerio assertions, column-index constants, conditional-rendering both ways (table present vs empty-state), the two `@justice.gov.uk` contacts asserted, and Welsh rendering covered.
- **Correct GOV.UK / accessibility patterns** — `layouts/base-template.njk`, `page_content` block, `govukDetails`, semantic `<table>` with `scope="col"`, visually-hidden label tied to the search input via `for`/`aria-label`, back-to-top anchor. No inline styles. Progressive enhancement preserved (search input is plain HTML).
- **`.js` import extensions, ES modules, kebab-case files** all conform to CLAUDE.md.

## Test Coverage Assessment

- **Unit tests:** present and realistic — converter registration/order (`...-config.test.ts`), renderer EN/CY + PM-time formatting (`renderer.test.ts`), PDF success/oversize/failure/render-options (`pdf-generator.test.ts`), controller 11-case suite covering guard, 400/404/500, Welsh, provenance fallback (`index.test.ts`).
- **Template tests:** comprehensive structural + Welsh + locale-key-parity (`*.njk.test.ts`).
- **E2E:** none added for this list type. Consistent with the sibling (list-type pages are covered by shared upload/render E2E flows), so advisory only.
- **Accessibility:** covered inline via template structural assertions (semantic table, labelled search). No axe run in unit layer, consistent with sibling.

Statement coverage per changed workspace (`vitest run --coverage`):

| Workspace | Statements | Status |
|-----------|-----------|--------|
| `libs/list-types/financial-list-chd-kb-daily-cause-list` | 90.9% | ✅ |
| `libs/notifications` | 90.53% | ✅ |
| `libs/publication` | 96.5% | ✅ |
| `apps/web` (new controller) | 31 tests pass; filtered run shows 44% only because it reports the shared `list-type-handler.ts`, not the new controller | ✅ (advisory) |

Note on `apps/web`: the filtered coverage number reflects the shared `list-type-handler.ts` helper (partially exercised by a single filtered run), not the new page controller, whose 31 tests all pass. The new controller itself is thin and fully exercised by `index.test.ts`. Not flagged as below-threshold since the new code is well covered.

## Acceptance Criteria Verification

Criteria taken verbatim from the ticket Description ACCEPTANCE CRITERIA list (ticket.md:23-52).

- [x] **The Financial List (ChD/KB) daily cause list is created under the Business and Property Courts Rolls Building in CaTH and is linked to the 'Civil' jurisdiction and 'Royal Courts of Justice Group' region** — entry added at `libs/list-types/common/src/list-type-data.ts:780-789` with `subJurisdictionIds: [10]`; sub-jurisdiction 10 (High Court) rolls up to the Civil jurisdiction and the Business and Property Courts Rolls Building location (locationId 26) links region 11 (RCJ Group). Product confirmed `[10]` is the correct value (matching the sibling `COMPANIES_WINDING_UP_CHD_DAILY_CAUSE_LIST`); the ticket text's `[1]` is superseded.

- [x] **The following data fields are created in the listed order in the validation schema (Judge, Time, Venue, Type, Case Number, Case Name and Additional Information)** — reuses `CHD_KB_EXCEL_CONFIG`; order asserted at `libs/list-types/financial-list-chd-kb-daily-cause-list/src/conversion/financial-list-chd-kb-daily-cause-list-config.test.ts:14-24`; shared schema `libs/list-types/chd-kb-common/src/schemas/chd-kb-common.json`.

- [x] **Published through the Excel upload route; uploaded as an excel template and converted to JSON suitable for rendering** — converter registered via `registerConverterByName("FINANCIAL_LIST_CHD_KB_DAILY_CAUSE_LIST", ...)` at `libs/list-types/financial-list-chd-kb-daily-cause-list/src/conversion/financial-list-chd-kb-daily-cause-list-config.ts:10`; registration asserted in test line 10-12.

- [x] **The validation schema and style guide for the list is created** — validator re-exported as `validateFinancialListChdKbDailyCauseList` (`src/index.ts:13-18`) resolving the shared `chd-kb-common` schema; style-guide page template `apps/web/src/pages/(list-types)/financial-list-chd-kb-daily-cause-list/financial-list-chd-kb-daily-cause-list.njk` with controller `index.ts:14-41`.

- [x] **A PDF and Excel downloadable version of the hearing list is created** — PDF: `generateFinancialListChdKbDailyCauseListPdf` registered in `PDF_GENERATOR_REGISTRY` (`libs/publication/src/processing/service.ts:184`), generator at `src/pdf/pdf-generator.ts:24`. Excel: served by returning the originally uploaded workbook via the existing non-strategic flat-file download route (the module is not in `EXCEL_GENERATOR_REGISTRY`, identical to the sibling `COMPANIES_WINDING_UP_CHD_DAILY_CAUSE_LIST`, which also relies on the uploaded-file download rather than regeneration).

- [x] **The style guide should follow the structure in the reference pip-frontend page** — template mirrors the verified sibling layout: header/venue/address block, "Important information" `govukDetails`, "Search Cases", 7-column table in required order, data-source footer, back-to-top (`financial-list-chd-kb-daily-cause-list.njk`); structural parity asserted in `*.njk.test.ts`. Financial-List-specific "Important information" (Chancery + Commercial Court remote-hearing guidance with both `@justice.gov.uk` contacts) is present in the locales and asserted (`*.njk.test.ts:166-172`).

- [x] **The JSON file should follow the given format (judge/time/venue/type/caseNumber/caseName/additionalInformation)** — identical to the `ChdKbHearing` shape re-exported as `FinancialListChdKbHearing`/`FinancialListChdKbHearingList` (`src/index.ts:6`); exercised with the exact sample payload in `src/rendering/renderer.test.ts:9-19` and `apps/web/.../index.test.ts:79-89`.

Status: 7 met, 0 partial, 0 unmet (of 7).

## Next Steps

- [x] Product confirmation on `subJurisdictionIds` — confirmed `[10]` (as implemented). No change needed.
- [ ] (Optional) Add a PDF-generator test for the error path and empty-provenance branch to lift branch coverage.
- [ ] (Optional) Drop the unused `assets` export from `config.ts` in both this module and the sibling.
- [ ] Run the end-to-end manual upload → convert → validate → publish → render (EN/CY) → PDF/Excel download once in an environment (tasks.md marks this as not run here).

## Overall Assessment

**APPROVED**

The implementation is well-built, complete, and faithfully mirrors the sibling module with correct security, accessibility, type-safety and CLAUDE.md compliance. All seven acceptance criteria are met (product confirmed `subJurisdictionIds: [10]`), and all workspace coverage is above 80%. No critical or high-priority issues. The three remaining suggestions are optional cleanups. Ready to commit and raise a PR.
