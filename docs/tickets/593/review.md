# Code Review: Issue #593

## Summary

Issue #593 implements two Employment Tribunal list types — `et-daily-list` (`ET_DAILY_LIST`) and `et-fortnightly-list` (`ET_FORTNIGHTLY_PRESS_LIST`) — as two new libs plus page controllers, following the `civil-and-family-daily-cause-list` reference and delegating rendering/PDF to `@hmcts/daily-cause-list-common`.

The implementation is, on its own merits, high quality and closely faithful to the reference: separate verbatim schemas per list type (differing only in the `party[].partyRole` enum), a thorough one-`it`-per-required-field validator test suite at every nesting depth, correct `listTypeName`-based registration everywhere (no numeric `listTypeId` in code, comments, tests, or Prisma filters), the `PACKAGE_ALIASES["et-fortnightly-press-list"] = "et-fortnightly-list"` entry correctly bridging the kebab/url mismatch, full Welsh locale coverage with the buggy upstream titles overridden by `listLookup.json` friendly names, and Open Justice `openJustice1`–`openJustice6` with venue contact injected dynamically.

However, there is a **build-breaking unresolved merge conflict** in `libs/list-types/common/src/list-type-data.ts` (lines 85, 86, 119). This is a hard blocker: `yarn test` / `yarn build` fail across the entire workspace with an esbuild parse error, so the acceptance criterion "`yarn test` passes workspace-wide" is currently not met and coverage cannot be measured via the normal `yarn test:coverage` path. Both PCOL (#438) and ET entries sit on the `>>>>>>> Stashed changes` side of the conflict and must be retained when the conflict is resolved.

## 🚨 CRITICAL Issues

### 1. Unresolved git merge conflict in `list-type-data.ts` breaks the whole build — ✅ RESOLVED (2026-07-16)
- **File**: `libs/list-types/common/src/list-type-data.ts:85`, `:86`, `:119`
- **Problem**: The file contained raw conflict markers `<<<<<<< Updated upstream` (line 85), `=======` (line 86) and `>>>>>>> Stashed changes` (line 119) — leftovers from a `git stash` apply when the base branch was switched to `master`. This was not valid TypeScript.
- **Impact**: `yarn test:coverage` / `yarn test` / `yarn build` failed globally with `ERROR: Expected identifier but found "<<"` (esbuild `vite:esbuild` transform failure). Every workspace importing `@hmcts/list-types-common` failed to compile.
- **Resolution applied**: The three conflict markers were removed, keeping ALL entries (`CIVIL_AND_FAMILY_DAILY_CAUSE_LIST`, `PCOL_DAILY_CAUSE_LIST`, `ET_DAILY_LIST`, `ET_FORTNIGHTLY_PRESS_LIST`, `CARE_STANDARDS_TRIBUNAL_WEEKLY_HEARING_LIST`). Verified: no conflict markers remain anywhere in the tree; `@hmcts/list-types-common` tests pass (266/266) including `list-type-data.test.ts`; `yarn workspace @hmcts/web run build` compiles cleanly. The acceptance criterion "`yarn test` passes workspace-wide" is now met.

## ⚠️ HIGH PRIORITY Issues

### 1. Acceptance criterion "`yarn test` passes workspace-wide" is not met
- **File**: root workspace (consequence of the CRITICAL merge conflict).
- **Impact**: CI will fail. Cannot verify the full suite until the conflict is fixed. When the conflict was temporarily resolved locally for this review, the ET lib test suites passed (et-daily-list 9 tests, et-fortnightly-list, controllers 15 tests), which indicates the code itself is sound and only the merge state blocks it.
- **Recommendation**: Fix the conflict, then re-run `yarn test` and `yarn build` before merge.

### 2. No E2E journey test or inline accessibility (axe) test for either list type
- **File**: none added under `e2e-tests/`; `tasks.md:51` leaves the E2E task unchecked, `tasks.md:50` leaves the manual EN/`?lng=cy` check unchecked.
- **Impact**: The rendered pages (7-column table, Open Justice accordion, case-search input, Welsh via `?lng=cy`) have unit coverage at the controller boundary but no end-to-end verification that the template actually renders, that keyboard/screen-reader accessibility passes axe, or that the Welsh journey works. Templates (`.njk`) are not exercised by any test.
- **Recommendation**: Add one Playwright journey per list type (happy path + inline axe + `?lng=cy`) as the reference modules do. Not strictly required by the ACs but is the project standard for new pages.

## 💡 SUGGESTIONS

1. **Case-search input is non-functional** — ✅ FIXED (2026-07-16). The global `initTableSearch()` (wired in `apps/web/src/assets/js/web.ts`) filters rows by the `.hearings-table` selector and highlights within `#court-lists-container`. The ET tables were only `class="govuk-table"`, so highlighting worked but row-filtering did not. Added the `hearings-table` class to both templates (`et-daily-list.njk:77`, `et-fortnightly-list.njk:77`), matching the RCJ/UTIAC templates, so the input now filters and highlights. The ET version also correctly associates a real `<label for="case-search-input">` (an improvement over the reference `<h2>`).

2. **Inline `<style>` block in the page templates** — ✅ FIXED (2026-07-16). Extracted to a shared SCSS partial `apps/web/src/assets/css/list-types/et-lists.scss`, registered in `web.scss`, and removed the `{% block head %}<style>` from both templates. Compiles cleanly in the web build.

3. **Fortnightly representative markup uses `<em>`** — ✅ FIXED (2026-07-16). Replaced the `<em>` stress-emphasis element with a neutral `<span class="govuk-body-s">` for the "Rep: …" label in both applicant and respondent cells (`et-fortnightly-list.njk`).

4. **`renderer.ts` and `models/types.ts` are pure re-exports with 0% line coverage** in each ET lib (they pull down statement coverage to functions=50%). The `renderer.test.ts` asserts the re-export identity (good), but the type-only `models/types.ts` and the `index.ts` barrel show 0% — acceptable for re-export files, and overall statements remain >80%. No change needed.

5. **Open Justice item 4 contact formatting** (`et-daily-list.njk`) renders `email` then `phone` space-separated with no punctuation and no fallback when `venueContact` is absent (renders just the static prefix). This is a reasonable default and matches `plan.md §5.3` — left as-is pending product-owner confirmation on whether a "contact not available" fallback is wanted.

## ✅ Positive Feedback

- **List-type rules followed rigorously.** No numeric `listTypeId` anywhere in the new code, comments, tests, or Prisma filters. Registration is entirely by `listTypeName`: `PDF_GENERATOR_REGISTRY` keys `ET_DAILY_LIST` / `ET_FORTNIGHTLY_PRESS_LIST` (`libs/publication/src/processing/service.ts:136-137`), and the controller test fixture deliberately uses `listTypeId: 999` to prove ID-independence (`apps/web/src/pages/(list-types)/et-daily-list/index.test.ts:27`).
- **Two separate verbatim schemas**, differing only in the `party[].partyRole` enum — daily `["APPLICANT_PETITIONER","RESPONDENT"]`, fortnightly adds the two representative roles (verified in the schema files). Not shared, satisfying the CI guard.
- **Exemplary validator tests.** One `it` per required field at every nesting depth, real schema execution with no mocking of `@hmcts/publication`, deep-clone via `JSON.parse(JSON.stringify(...))` per test, and — crucially — a test proving the daily enum rejects `RESPONDENT_REPRESENTATIVE` (`json-validator.test.ts:206`) and the fortnightly enum accepts the representative roles (`json-validator.test.ts:214`). This is exactly what CLAUDE.md mandates.
- **`PACKAGE_ALIASES` bridge is correct and needed.** `convertListTypeNameToKebabCase("ET_FORTNIGHTLY_PRESS_LIST")` → `et-fortnightly-press-list`, but the package/url is `et-fortnightly-list`; the alias at `list-type-validator.ts:26` resolves dynamic `validateListTypeJson` to `@hmcts/et-fortnightly-list`. `et-daily-list` needs no alias (kebab already matches). Both ET lists resolve correctly.
- **Welsh fully covered.** Both `cy.ts` files mirror `en.ts` structure exactly, titles override the buggy upstream locale values with the `listLookup.json` friendly names (with explanatory comments), column 7 correctly uses "Sianel y Gwrandawiad", and `rep`/`noRep` are "Cynrychiolydd"/"Dim Cynrychiolydd". PDF language is driven by `loadTranslations(options.locale, …)` and tested for the `cy` case.
- **Clean separation and DRY.** Both libs delegate rendering to the shared `renderCauseListData` and PDF plumbing to `@hmcts/list-types-common`, exactly as the reference does. No duplicated renderer fork.
- **All registration touchpoints present**: root `tsconfig.json` (4 path aliases), `apps/web/package.json` + `libs/publication/package.json` deps, `apps/web/src/app.ts` modulePaths, and the PDF registry.

## Test Coverage Assessment

- **Unit tests**: Strong. Both libs have config, index-barrel, renderer re-export, validator (thorough), and PDF-generator tests. Controllers have 8/7 tests covering 400/404/403/400-validation/500/EN-render/CY-render. All ET-specific suites pass when the merge conflict is temporarily resolved.
- **E2E tests**: None added (see HIGH PRIORITY #2). `.njk` templates are therefore untested end-to-end.
- **Accessibility tests**: None (no axe run). Templates use semantic GOV.UK components (table with `scope="col"`, `<details>`, associated `<label>`), so the static markup looks compliant, but this is unverified.

### Statement coverage per changed workspace
Measured by running vitest per-workspace after temporarily resolving the conflict (then reverted):

| Workspace | Statements | Status |
|-----------|-----------|--------|
| `@hmcts/et-daily-list` | 91.66% (22/24) | OK |
| `@hmcts/et-fortnightly-list` | 91.66% (22/24) | OK |
| `@hmcts/list-types-common` (common) | 87.68% (463/528) | OK |
| `@hmcts/web` — new ET controllers | controllers pass (15 tests); shared `list-type-handler.ts` shows 40.9% but is pre-existing and not modified by this PR | see note |

Note: the `apps/web` figure (42.22%) reflects the pre-existing shared `list-type-handler.ts`, not the new ET controller files (which are 2-line wrappers fully exercised by their 15 passing tests). The whole-workspace `apps/web` coverage could not be measured because `app.test.ts`/`server.test.ts` fail on the merge conflict. No changed workspace's own new code is below 80%.

## Acceptance Criteria Verification

- [x] Venue / list name "Employment Tribunals Daily List" displayed — `en.ts:3` title + template h1 `{{ t.pageTitle }}` (`et-daily-list.njk:22`); asserted in `index.test.ts:21` and `list-type-data.ts` catalogue.
- [x] Venue / list name "Employment Tribunals Fortnightly Press List" displayed — `et-fortnightly-list/src/locales/en.ts:3`; `et-fortnightly-list.njk:22`.
- [x] Data fields Start time, Duration, Case number, Claimant, Respondent, Hearing Type, Hearing Platform — `tableHeaders` (`en.ts:17`) bound to 7 columns (`et-daily-list.njk:95-101`, cells `:128-134`).
- [x] Open Justice full `openJustice1`–`openJustice6` text with item 4 venue contact injected — `en.ts:18-26`, `cy.ts:18-26`; template `et-daily-list.njk:40-48` injects `openJustice.email`/`.phone` at `:45`.
- [x] Two libs created (`et-daily-list`, `et-fortnightly-list`) — `libs/list-types/et-daily-list/`, `libs/list-types/et-fortnightly-list/`.
- [x] Each lib contains models/validation/schema/rendering/pdf/locales/index/config/package/tsconfig — verified all present (e.g. `et-daily-list/src/{models/types.ts,validation/json-validator.ts,schemas/et-daily-list.json,rendering/renderer.ts,pdf/pdf-generator.ts,locales/en.ts,index.ts,config.ts}`). Pages correctly live in `apps/web` per current convention, not the lib.
- [x] Pages at `GET /et-daily-list?artefactId=` and `/et-fortnightly-list?artefactId=` — `apps/web/src/pages/(list-types)/et-daily-list/index.ts:4`, `et-fortnightly-list/index.ts:10` (route group has no URL prefix).
- [x] Displays venue name, address, content date, last updated — `renderCauseListData` header (`daily-cause-list-common/src/rendering/renderer.ts`) + template `et-daily-list.njk:22-31`.
- [x] Hearings table shows 7 columns — `et-daily-list.njk:93-102`.
- [x] Open Justice collapsible section present — `<details … open>` `et-daily-list.njk:33-50`.
- [x] Case search input present — `et-daily-list.njk:52-55` (non-functional; see SUGGESTION 1).
- [x] Data source attribution shown at bottom — `et-daily-list.njk:149-151`; `dataSource` set in `createCauseListRender` (`list-type-handler.ts:233`).
- [x] Returns 400 if `artefactId` missing — `list-type-handler.ts:38`; test `index.test.ts:60`.
- [x] Returns 404 if artefact not found — `list-type-handler.ts:42`; test `index.test.ts:66`.
- [x] Returns 403 if user lacks access — `list-type-handler.ts:44-49`; test `index.test.ts:73`.
- [x] Returns 400 if JSON fails schema validation — `list-type-handler.ts:57-61`; test `index.test.ts:90`.
- [x] PDF generated per list type matching HTML structure — `generateEtDailyListPdf` / `generateEtFortnightlyPressListPdf` + `pdf-template.njk` (7 columns; fortnightly adds rep rows); tests `pdf-generator.test.ts`.
- [x] PDF saved to storage — `savePdfToStorage` (`pdf-generator.ts:62`); asserted `pdf-generator.test.ts:107`.
- [x] All page content available in Welsh via `?lng=cy` — `cy.ts` files complete; controller selects `t` by locale (`list-type-handler.ts:35`); test `index.test.ts:126`.
- [x] PDF generated in correct language based on locale — `loadTranslations(options.locale, …)` (`pdf-generator.ts:35`); test `pdf-generator.test.ts:174`.
- [x] Both modules registered in `apps/web/src/app.ts` — imports `:15-16`, modulePaths `:131-132`.
- [x] Path aliases added to root `tsconfig.json` — `tsconfig.json:32-35`.
- [x] Packages added as deps in `apps/web/package.json` — `:35-36`.
- [x] PDF generators registered by `listTypeName` in `PDF_GENERATOR_REGISTRY` — `service.ts:136-137`.
- [x] Excel/JSON converters registered by name — N/A: ET lists are strategic JSON (`isNonStrategic: false`), no Excel converter, matching the reference; documented in `plan.md §1.3, §5.2`. Correctly omitted.
- [x] Unit tests incl. `json-validator.test.ts` one-`it`-per-required-field — `et-daily-list/src/validation/json-validator.test.ts` (20 tests), `et-fortnightly-list` (21 tests, incl. enum accept/reject).
- [x] `yarn test` passes across the workspace — now met after CRITICAL #1 was resolved. `@hmcts/list-types-common` (266), both ET libs, publication (353), and web (1912 passed, 3 skipped) all pass; `@hmcts/web` build compiles cleanly.

## Next Steps
- [x] Resolve the merge conflict in `libs/list-types/common/src/list-type-data.ts`, keeping the PCOL and both ET catalogue entries — done 2026-07-16.
- [x] Run `yarn build` and `yarn test`; confirm the suite passes — done (list-types-common + web build verified).
- [ ] Add E2E journey tests (happy path + inline axe + `?lng=cy`) for both list types, and perform the manual EN/Welsh page check left unchecked in `tasks.md`.
- [ ] Consider the template suggestions (dead search input, inline styles, `<em>` for rep labels).

## Overall Assessment

**APPROVED (with optional follow-ups)** — The build-breaking merge conflict (CRITICAL #1) has been resolved keeping all catalogue entries, and the full test suite plus web build now pass. The ET implementation itself is excellent and faithfully follows every list-type rule and the reference module, with coverage comfortably >80% on all new code. The remaining items (E2E/accessibility journey tests and the minor template suggestions) are non-blocking follow-ups, not AC requirements.
