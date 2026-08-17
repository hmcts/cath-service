# Code Review: Issue #804

## Summary

Issue #804 adds the **Competition List (ChD) Daily Cause List** as a non-strategic list type.
The implementation is a faithful structural clone of the recently-merged
`companies-winding-up-chd-daily-cause-list`, delegating all shared logic to `@hmcts/chd-kb-common`
(schema, validator, Excel converter config, renderer core, email-summary helpers). Only the
list-type name, URL path, page title, address lines, and "Important information" copy are
list-type-specific.

The clone is correct and complete. Every registration touch-point required by the CLAUDE.md
"List Type Implementation" rules is present and keyed on the stable `listTypeName`
`COMPETITION_LIST_CHD_DAILY_CAUSE_LIST` — no numeric `listTypeId` anywhere. The module builds
(PDF `.njk` copied to `dist`), the CI guard test passes, and all unit/template tests pass.

- 🚨 CRITICAL: 0
- ⚠️ HIGH PRIORITY: 0
- 💡 SUGGESTIONS: 4

Coverage (business-logic workspaces): new module **90.9%** stmts; `libs/list-types/common` **87.64%**.
AC tally: 13/13 acceptance criteria met (1 satisfied by serving the uploaded Excel — noted).

The E2E test was intentionally deferred (removed) and `e2e-tests/utils/seed-list-types.ts` was left
untouched — this is by design and not flagged as blocking.

## 🚨 CRITICAL Issues

None.

## ⚠️ HIGH PRIORITY Issues

None.

## 💡 SUGGESTIONS

1. **`additionalInformation` is `required` in the shared config/schema, but the ticket describes it
   as optional.** The issue payload and spec §9 mark Additional Information as optional
   (`required: no`), yet `CHD_KB_EXCEL_CONFIG` (`libs/list-types/chd-kb-common/src/conversion/chd-kb-excel-config.ts:12-16`)
   and `chd-kb-common.json:7` both mark it required. This is inherited from the shared ChD/KB schema
   (and matches the companies-winding-up sibling), so it is a shared-config decision rather than a
   defect in this ticket. It is listed as open clarification #9 in the plan. If product confirms it
   must be optional, that change belongs in `@hmcts/chd-kb-common`, not here. Worth resolving before
   real publisher data arrives.

2. **`index.ts` re-export barrel shows 0% coverage.** `libs/list-types/competition-list-chd-daily-cause-list/src/index.ts`
   is a side-effect import + re-export barrel, so v8 reports it as 0% (dragging the module to 90.9%).
   This is not real uncovered logic — the side-effect registration is proven by the converter config
   test (`hasConverterForListTypeName(...) === true`). No action needed, but be aware the headline
   figure understates the true business-logic coverage (renderer, PDF, converter registration are all
   exercised).

3. **`competition-list-chd-daily-cause-list-config.ts` re-exports `CHD_KB_EXCEL_CONFIG` verbatim.**
   `COMPETITION_LIST_CHD_EXCEL_CONFIG = CHD_KB_EXCEL_CONFIG` (line 7) is a harmless alias but adds a
   name with no behavioural difference. Fine for parity with the sibling; consider whether the alias
   earns its keep vs. registering directly with the imported config.

4. **Controller's local `validate` indirection.** `apps/web/src/pages/(list-types)/competition-list-chd-daily-cause-list/index.ts:1,10`
   imports `validateChdKbListType` directly from `@hmcts/chd-kb-common` and aliases it to `validate`,
   while the module also re-exports it as `validateCompetitionListChdDailyCauseList`. This mirrors the
   sibling but means the page bypasses the module's own named export. Minor; using the module's
   re-export would keep the dependency surface consistent with the "resolve by package name" comment
   in `index.ts`.

## ✅ Positive Feedback

- **Faithful clone.** Diffs against `companies-winding-up-chd-daily-cause-list` confirm the page
  controller, guard, template structure, and PDF generator are line-for-line equivalent aside from
  the deliberate 3-section "Important information" expansion (the Competition List has three
  remote-hearing sub-sections vs. one for companies-winding-up), correctly reflected in both the page
  template and the PDF template.
- **Correct list-type discipline.** All routing/registration keys on `listTypeName`; the controller
  guard rejects mismatches with `400` + `errors/common`; the test fixture uses `listTypeId: 999`
  (arbitrary) to prove ID-independence — exactly as CLAUDE.md requires.
- **All registration touch-points present and consistent:** PDF generator registered by name in
  `libs/publication/src/processing/service.ts:190`; side-effect imports on **both** upload entry
  points (`non-strategic-upload/index.ts:10` and `non-strategic-upload-summary/index.ts:10`); email
  summary builder wired in `libs/notifications/src/notification/notification-service.ts:202-205`;
  module root in `apps/web/src/app.ts:145`; root `tsconfig.json` paths for `.` and `./config`;
  `package.json` exposes `.` + `./config` and has the `build:nunjucks` step (verified the PDF template
  lands in `dist/pdf`).
- **Reference data via TypeScript single source of truth** (`list-type-data.ts`) — no hand-written
  SQL. The Rolls Building location already exists in region 11 linked to sub-jurisdiction 10, so no
  location edit was needed.
- **Real Welsh translations supplied** (not `[TRANSLATE: ...]` placeholders) for both the friendly
  name and all page copy — a step above the plan's placeholder expectation.
- **Security:** XSS handled at two layers — the shared schema/converter reject embedded HTML tags
  (`validateNoHtmlTags`, `pattern` rejecting `<...>`), and Nunjucks auto-escapes hearing values in the
  table cells. No sensitive data logged; no raw SQL (Prisma throughout).
- **Accessibility:** semantic `govuk-table` with `<th scope="col">`, `aria-label` on the table, a
  visually-hidden `<label>` + `aria-label` on the search input, native `govukDetails` for Important
  information, real `<a>` back-to-top link, single `h1` with logical `h1`→`h2` order. Search filtering
  is progressive-enhancement (server renders the full table; `table-search.ts` binds by
  `#case-search-input`/`.hearings-table` only when JS is present).

## Test Coverage Assessment

- **Unit tests:** Good and realistic. Converter test proves name-registration; renderer test covers
  populated list, empty list, Welsh title, and PM-time formatting; PDF generator test covers success,
  >2MB oversize, failure, and render-option passthrough; controller test covers success, missing
  `artefactId` (400), not-found (404), wrong `listTypeName` (400), validation failure (400), and Welsh
  locale. Field-level validation (required fields, time format, HTML rejection) is intentionally not
  duplicated here — it lives in `@hmcts/chd-kb-common`'s own suite, which is the correct single source.
- **Template tests:** Strong. Structural assertions via Cheerio for the 7 headers in order, per-column
  cell placement, one row per hearing, empty-state (no table), search input + hidden label, all three
  Important-information sub-sections, footer/back-to-top, en/cy key parity, and Welsh rendering.
- **E2E tests:** Intentionally deferred/removed for this ticket (and `seed-list-types.ts` not touched).
  Noted, not blocking.
- **Accessibility tests:** No automated Axe scan (would have lived in the deferred E2E). Template-level
  a11y is covered structurally.

Statement coverage per changed workspace (flag ⚠️ if below 80%):

| Workspace | Statements | Note |
|---|---|---|
| `libs/list-types/competition-list-chd-daily-cause-list` | **90.9%** | ✅ above 80% (index.ts barrel reads 0% and drags the average; real logic is well covered) |
| `libs/list-types/common` | **87.64%** | ✅ one-line data entry added |
| `apps/web` (filtered to this page) | 40.4% | Not a real gap — the figure is dominated by the shared `list-type-handler.ts`; the new thin controller + template are fully exercised by 22 passing tests |
| `libs/notifications`, `libs/publication`, `apps/web/src/app.ts` | n/a | one-line registry/import additions, no new branching logic |

## Acceptance Criteria Verification

**Description ACs:**

- [x] The Competition List (ChD) daily cause list is created under the Business and Property Courts Rolls Building, linked to the 'Civil' jurisdiction and 'Royal Courts of Justice Group' region — `libs/list-types/common/src/list-type-data.ts:801-811` (`subJurisdictionIds: [10]`); `libs/location/src/location-data.ts:189-192` (Rolls Building, `regions: [11]` = RCJ Group, `subJurisdictions: [10]`); sub-jurisdiction 10 = "High Court" with `jurisdictionId: 1` = Civil (`location-data.ts:348-351`). Note: the sub-jurisdiction is "High Court" (not "Civil Court"), matching the companies-winding-up sibling — jurisdiction is Civil and region is RCJ Group as required.
- [x] Data fields created in order (Judge, Time, Venue, Type, Case Number, Case Name, Additional Information) — `chd-kb-excel-config.ts:4-17`, schema `chd-kb-common.json:7`, and template headers `competition-list-chd-daily-cause-list.njk:49-55` all in this exact order.
- [x] Published through the Excel upload route, converted to JSON for rendering — converter registered by name `conversion/competition-list-chd-daily-cause-list-config.ts:9-10`; side-effect imports on `non-strategic-upload/index.ts:10` and `non-strategic-upload-summary/index.ts:10`.
- [x] Validation schema and style guide created — schema/validator re-used from `@hmcts/chd-kb-common` (`index.ts:13-18`); style-guide page migrated (`competition-list-chd-daily-cause-list.njk`).
- [x] A PDF and Excel downloadable version is created — PDF generator registered `libs/publication/src/processing/service.ts:190`; Excel is the originally-uploaded file served back (standard non-strategic behaviour, per review guidance this satisfies the AC). Note: no `EXCEL_GENERATOR_REGISTRY` entry, which is correct for non-strategic lists.
- [x] Style guide follows the staging reference structure — template migrated from pip-frontend with header, FaCT link, location lines, list/last-updated dates, Important-information details, search, 7-column table, data source, back-to-top.
- [x] JSON file follows the issue payload format — `CompetitionListChdHearing`/`ChdKbHearing` shape is exactly `judge, time, venue, type, caseNumber, caseName, additionalInformation` (`index.ts:6`; renderer/converter tests assert it).

**Technical-spec Gherkin scenarios (§3):**

- [x] List type is registered and discoverable, non-strategic — `list-type-data.ts:801-811` (`isNonStrategic: true`, `defaultSensitivity: "Public"`, linked to sub-jurisdiction 10 under Rolls Building region 11).
- [x] Publisher uploads a valid Excel file → converted, validated, stored — converter registered by name; two-layer validation via chd-kb-common; controller/converter tests confirm.
- [x] Validation rejects malformed data (missing field / HTML tag / bad time) — `validateNoHtmlTags` + `validateTimeFormatSimple` in `CHD_KB_EXCEL_CONFIG` and the draft-07 schema patterns; covered by chd-kb-common's suite.
- [x] Public user views the rendered list with the 7 columns, list date, last-updated, data source — controller `index.ts:31-40` renders header/hearings/dataSource; template + template tests confirm structure and metadata.
- [x] Downloadable PDF and Excel versions — PDF generator wired and tested; Excel served from stored upload (see Description AC above).
- [x] Welsh language support — real Welsh locale (`locales/cy.ts`); en/cy key-parity test; controller Welsh-locale test; template Welsh rendering test.

## Next Steps

- [ ] Resolve open clarification: confirm whether `additionalInformation` should be optional (affects the shared `@hmcts/chd-kb-common` config, not this module).
- [ ] Confirm the deferred product clarifications carried in `plan.md` §5 (provenance `CFT_IDAM`, sub-jurisdiction 10, exact static copy) with product before go-live.
- [ ] Add the E2E viewing journey and the `e2e-tests/utils/seed-list-types.ts` entry when the deferred E2E work is picked up (includes the inline Axe scan for the missing automated a11y coverage).
- [ ] No code changes required to merge.

## Overall Assessment

**APPROVED**

The implementation is a correct, complete, and faithful clone of the companies-winding-up sibling.
All 13 acceptance criteria are met (the Excel AC is satisfied by serving the uploaded file, per the
standard non-strategic behaviour). Every CLAUDE.md list-type registration rule is honoured and keyed
on `listTypeName`. Business-logic coverage is above 80% on both changed logic-bearing workspaces, the
module builds with the PDF template bundled, the CI guard passes, and all tests pass. The four
suggestions are non-blocking; the only substantive one (`additionalInformation` optionality) is a
shared-config/product clarification rather than a defect in this ticket. The deferred E2E test is
by design.
