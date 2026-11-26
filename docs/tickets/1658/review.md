# Code Review: Issue #1658

Non-strategic Excel uploads reject blank cells that legacy PIP accepts.

Reviewed: the uncommitted working-tree diff on `fix/1658-non-strategic-blank-cells`, stacked on PR #1651 (`f6adaf7c`). It touches 34 files (222+/265-) across 24 workspaces under `libs/list-types/`.

## Summary

The change sets `required: false` on every non-strategic converter field except `date`, `time` and `hearingTime`, across all 20 config files and 23 exported configs listed in the ticket. It also adds one table-driven test that enforces the rule for all 50 `isNonStrategic` list types and every tab of the multi-tab lists. Converter logic is unchanged. The only edit to `excel-to-json.ts` rewords a comment.

What I checked:
- Filtering the diff for any `+`/`-` line that is not a `required:` flag change leaves only comment rewrites and one Biome reflow of the IA "Case Number" field. That field still carries `required: false` (`interim-applications-daily-cause-list-config.ts:25`).
- No field went from `false` to `true`, and no `fieldName`, header or validator changed. CIC still uses `fieldName: "venue/platform"` (`cic-config.ts:39`).
- Converter logic still works as expected. A blank cell is still written as `""` (`excel-to-json.ts:198`). It only becomes an issue when `required ?? true` (`:200-209`). Validators, including the no-HTML check and `validateEmailFormat`, still run on every non-blank value (`:212`). Missing columns are still rejected by `findMissingHeadersIssue` (`:179-191`) whatever the flag says.
- No non-strategic CaTH JSON schema uses `minLength`. I ran an ad hoc check of the ticket's AST example against the real `validateAstDailyHearingList`, with blank Case type, Hearing type and Additional information: it returned `isValid: true`. A blank `hearingTime` returned `isValid: false`.
- Biome check of all 34 changed files: clean.
- `vitest run --coverage` in each of the 24 changed workspaces: every test passes (see the coverage table).

Accessibility, GOV.UK Design System, Welsh, progressive enhancement and E2E: not applicable. There are no page, template, locale or route changes. The only user-visible effect is that more spreadsheets are accepted.

## 🚨 CRITICAL Issues

None.

## ⚠️ HIGH PRIORITY Issues

None.

## 💡 SUGGESTIONS

1. **The partially blank IA paragraph is now reachable in production. Raise a follow-up ticket.**
   - `libs/list-types/interim-applications-daily-cause-list/src/rendering/renderer.test.ts:59-74` pins two outputs:
     - with a blank email: `"...Interim Judge Jane Smith,  as early as possible."` (stray comma and a double space)
     - with a blank name: `"...Interim Judge , jane.smith@justice.gov.uk..."`
   - Pinning this output, rather than fixing it, was agreed as out of scope (Resolution 4). But this change is what makes the output reachable, so a small content ticket is worth raising. It could fall back to the static wording when either value is blank, as it already does for an empty array. Only English is pinned; the Welsh wording probably has the same defect.

2. **Make the shared test read in plain AAA order** (`libs/list-types/common/src/conversion/non-strategic-list-registry.test.ts:74-84`).
   - The ternary `converter?.sheets ?? (converter ? [{ config: converter.config }] : [])` only exists so the code before `expect(converter).toBeDefined()` doesn't fail on `undefined`.
   - Asserting first, then narrowing, is simpler. For example: `expect(converter).toBeDefined(); const sheetConfigs = converter!.sheets ?? [{ config: converter!.config }];`. A small guard with an early `throw` works too, if non-null assertions are disallowed.
   - Behaviour is the same either way; this is readability only.

3. **Drop the ticket number from the renderer test comment** (`renderer.test.ts:57`, "accepted since #1658").
   - CLAUDE.md asks for comments that explain why, and ticket references go stale.
   - "Open-justice cells may be blank, as in PIP" carries the same intent.

4. **Undeclared test-only dependencies in `@hmcts/list-types-common`** (`non-strategic-list-registry.test.ts:7-29`).
   - The 23 side-effect imports are not in `libs/list-types/common/package.json`, and each of those packages depends on `list-types-common`. That is a test-time cycle, which CLAUDE.md "Don't create circular dependencies" warns against in spirit.
   - It follows the existing CST import, and Resolution 6 accepted it, so no change is requested here. It is worth a one-line comment, though, or moving the test into a package that already depends on every list type if this pattern grows. It also made this test file the slowest in the package on this machine (about 57 s to import).

5. **Run the manual upload check before merge.** This is the one unchecked item in `tasks.md`: upload the ticket's AST example and confirm `additionalInformation` is stored as `""`, and that a blank Hearing time is still rejected. The converter and the schema are each proven separately. The full upload, publish and render path for a blank cell has not been exercised.

6. **Optional: one schema round-trip test.**
   - The plan's claim that "CaTH schemas accept `""` for every text field" rests on inspection. My ad hoc check confirms it for AST only.
   - A single converter-to-validator test for one list type would pin that the two halves agree, so a future `minLength` in a schema cannot quietly reintroduce the rejection.
   - This is low priority, because the CLAUDE.md validator-test pattern already covers each schema.

## ✅ Positive Feedback

- **One rule, enforced in one place.** The `it.each` over `listTypeData.filter((l) => l.isNonStrategic)` (`non-strategic-list-registry.test.ts:35,74`) checks all 50 list types.
  - It also checks every tab, through `converter.sheets` (BPD, IA, London Admin, CoA Civil).
  - It fails if a new non-strategic list type has no registered converter.
  - `toBe(false)` also rejects an omitted `required`, which would default to `true`, so the explicit-literal decision (Plan Decision 1) is enforced too.
  - The `%s` in the test name and the `${listTypeName} ${field.fieldName}` failure message make failures easy to diagnose.
- **The deleted per-config flag tests are really covered.** Each removed test (Admin Court, RCJ standard, London Admin ×2 tabs, CoA Civil ×2 tabs, SSCS, UTAAC, UTLC, UTCC, UTIAC JR regional and London, BPD, IA open-justice) checked a config that one of the 50 shared-test cases reaches. All 50 cases pass. The field-name and validator tests in those files were kept.
- **Scenario 2 is a strong test.** `non-strategic-list-registry.test.ts:250-257` covers a blank cell, a whitespace-only cell and a `#REF!` formula-error cell in one row, and asserts the exact output object. That pins the Resolution 3 behaviour.
- **Scenario 4** (`interim-applications-daily-cause-list-config.test.ts:144-153`) proves `validateEmailFormat` is skipped for a blank cell. The malformed-email test at `:135` still covers a non-blank bad email.
- **The changed comments explain why.** The IA comments (`interim-applications-daily-cause-list-config.ts:11-15, 39-41`) and the `readCellValue` comment (`excel-to-json.ts:58-59`) now state the PIP-parity reason rather than restating the code.
- **The diff stays narrow.** It has no converter logic change, no production export added for tests (`REQUIRED_FIELD_NAMES` stays inside the test file), and no header or schema churn.

## Test Coverage Assessment

- **Unit tests:** good. One shared rule test (50 cases), two CST conversion tests (blank optional accepted, blank date rejected), one IA blank-email test and two pinned IA renderer outputs. The existing missing-column, HTML-rejection, date/time-format and malformed-email tests still pass unchanged. The number of tests is minimal and each covers one behaviour.
- **E2E tests:** not applicable. There is no new page or journey, and no E2E test asserts a blank-cell rejection.
- **Accessibility tests:** not applicable. There is no UI change.

Statement coverage per changed workspace, from `npx vitest run --coverage` run in each package directory one after another with `--hookTimeout=120000 --testTimeout=120000`. Every test passed in all of them.

| Workspace (`libs/list-types/…`) | Tests | Statements |
|---|---|---|
| common | 467 | 93.61% |
| administrative-court-daily-cause-list | 61 | 100% |
| ast-daily-hearing-list | 39 | 100% |
| business-and-property-division-rolls-building-daily-cause-list | 179 | 97.4% |
| care-standards-tribunal-weekly-hearing-list | 43 | 97.61% |
| cic-weekly-hearing-list | 43 | 100% |
| court-of-appeal-civil-daily-cause-list | 69 | 94.44% |
| ftt-lands-registration-tribunal-weekly-hearing-list | 36 | 100% |
| ftt-rpt-weekly-hearing-list | 47 | 100% |
| ftt-tax-chamber-weekly-hearing-list | 37 | 100% |
| grc-weekly-hearing-list | 38 | 100% |
| interim-applications-daily-cause-list | 50 | 96.29% |
| london-administrative-court-daily-cause-list | 52 | 90.47% |
| pht-weekly-hearing-list | 59 | 100% |
| rcj-standard-daily-cause-list | 46 | 95.23% |
| send-daily-hearing-list | 33 | 100% |
| siac-poac-paac-weekly-hearing-list | 56 | 100% |
| sscs-daily-hearing-list | 78 | 100% |
| upper-tribunal-administrative-appeals-chamber-daily-hearing-list | 48 | 100% |
| upper-tribunal-lands-chamber-daily-hearing-list | 49 | 100% |
| upper-tribunal-tax-and-chancery-chamber-daily-hearing-list | 50 | 100% |
| utiac-jr-daily-hearing-list | 73 | 92.59% |
| utiac-statutory-appeal-daily-hearing-list | 29 | 86.27% |
| wpafcc-weekly-hearing-list | 34 | 100% |

No workspace is below 80%. The lowest is `utiac-statutory-appeal-daily-hearing-list` at 86.27%, and its uncovered statements are outside the config this change touches.

## Acceptance Criteria Verification

- [x] **For every non-strategic list type, a spreadsheet with a blank non-date/time cell uploads successfully and the value is stored as `""`.**
  - Every non-date/time field in all 23 configs is now `required: false`. Examples: `ast-config.ts:8-38`, `rcj-field-configs.ts` (both configs), `interim-applications-daily-cause-list-config.ts:18-57`, `cic-config.ts:28-58`.
  - The rule is proven for all 50 list types and every tab by `non-strategic-list-registry.test.ts:73-84`.
  - The `""` output is proven by `non-strategic-list-registry.test.ts:250-257` and `interim-applications-daily-cause-list-config.test.ts:144-153`.
  - `excel-to-json.ts:198` writes the value whatever the flag.
  - Schema acceptance was confirmed ad hoc for AST. The full upload path has not been checked manually (Suggestion 5).
- [x] **A blank date or time cell is still rejected with the existing error.**
  - The `date`/`time`/`hearingTime` fields stay `required: true` (for example `ast-config.ts:31-32`, `rcj-field-configs.ts:25,79`, `cic-config.ts:15-16,21-22`), and `non-strategic-list-registry.test.ts:82` asserts this for all 50.
  - The error text is unchanged (`excel-to-json.ts:206`).
  - Tested by `non-strategic-list-registry.test.ts:259-264` (`Missing required field 'Date'`) and by `business-and-property-division-rolls-building-daily-cause-list-config.test.ts:118` (Time).
- [x] **A missing column is still rejected.**
  - Header validation is unchanged (`excel-to-json.ts:179-191`).
  - Tested by `non-strategic-list-registry.test.ts:151` ("should reject Excel file with missing columns"), which passes.
- [x] **A non-blank text cell containing HTML is still rejected.**
  - Validators are unchanged and still run on non-blank values (`excel-to-json.ts:212`).
  - Tested by `non-strategic-list-registry.test.ts:206-248` (four HTML tests) and `interim-applications-daily-cause-list-config.test.ts:126`, which pass.
- [x] **Config unit tests assert that only date/time fields are required.**
  - `non-strategic-list-registry.test.ts:73-84` asserts this for every field of every sheet of every non-strategic converter.
  - This is the single shared test that Plan Decision 3 asked for, in place of one test per config.
- [x] **`non-strategic-list-registry.test.ts` covers blank optional fields accepted and blank date rejected.**
  - Blank optional fields accepted: `:250-257`.
  - Blank date rejected: `:259-264`.

Tally: 6 met, 0 partial, 0 not met.

## Plan Adherence

The plan was followed. Every task in `tasks.md` is reflected in the diff. Deviations:

- The shared rule test uses `it.each`, giving one case per list type, instead of a single `it`. This is an improvement, because failures name the list type.
- The IA "Case Number" field was reflowed onto several lines by the formatter. It is cosmetic only.
- The manual upload check (last task) was not done, as noted in `tasks.md`, because Postgres and Redis were not available. See Suggestion 5.

## Next Steps

- [ ] Run the manual AST upload check (blank Additional information is accepted; blank Hearing time is rejected).
- [ ] Optionally tidy the shared test's narrowing (Suggestion 2) and the renderer test comment (Suggestion 3).
- [ ] Raise a follow-up content ticket for the IA "Important information" paragraph when a cell is blank (Suggestion 1).
- [ ] Commit, then rebase onto master once PR #1651 merges, and re-run the registry test after the rebase. It depends on `ListTypeConverter.sheets` from #1651.

## Overall Assessment

**APPROVED**

The change is small, mechanical and correct. It matches the ticket's rule exactly for all 50 non-strategic list types, and a shared test now enforces that rule. The HTML, missing-column and date/time protections are all still in place, and every changed workspace is above 80% statement coverage. The suggestions are advisory only.
