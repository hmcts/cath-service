# #1658: Non-strategic Excel uploads reject blank cells that legacy PIP accepts — Implementation Plan

TEMPLATE SOURCE: n/a

No rendered page changes. This is a config-only bug fix to the non-strategic Excel converter configs under `libs/list-types/`.

## 1. Technical Approach

### Rule
A non-strategic converter field is `required: true` only when its `fieldName` is `date`, `time` or `hearingTime`. Every other field is `required: false`. This matches PIP. PIP's schemas list every key in `required`, but only the date and time patterns reject `""`.

### Verified against the code (origin/master `54924af3`)
- `excel-to-json.ts`: `validateHeaders` rejects any configured column missing from the header row, whether or not the field is required. `getField` throws `Missing required field '<header>' in row N` when the trimmed value is `""` and `field.required ?? true`. `parseRow` only runs validators when the value is non-empty. So `required` only controls whether a blank cell is allowed. It has no effect on column presence.
- Every field in all 23 converter config files sets `required` explicitly. No field leaves it out and falls back to the `true` default. The ticket's "Affected configs" table has the right fields for every config (see Clarifications for the small notes).
- `listTypeData` has 50 entries with `isNonStrategic: true`, and there are exactly 50 `registerConverterByName` calls. The two sets of names are identical.
- PIP schemas (`hmcts/pip-data-management`, `src/main/resources/schemas/non-strategic/*.json`) were checked by testing each property's pattern against `""`. Only `date`, `time` and `hearingTime` reject an empty string. Interim Applications `email` only has the no-HTML pattern. SEND `timeEstimate`, CST/PHT `hearingLength` and every other text field accept `""`.
- CaTH's own schemas accept `""` for every text field, so a blank optional cell passes schema validation after conversion. CaTH's schemas also accept `""` for the time field in FTT LRT, FTT RPT, FTT Tax, SIAC, SSCS and UTIAC SA, which confirms the ticket's reason for keeping time required in the converter.

### Decisions
1. **Set `required: false` explicitly, don't rely on the default.** Omitting `required` means `true`, so leaving it out would not make a field optional. Changing the default in `getField` to `false` would also change behaviour for any future config that leaves the flag out, and that would be a hidden converter change the ticket rules out. So the literal stays explicit in every field, as in the BPD reference config.
2. **No converter logic change.** `excel-to-json.ts`, `multi-sheet-converter.ts` and the registry stay as they are.
3. **Enforce the rule with one shared test, not one test per config.** A single table-driven test in `non-strategic-list-registry.test.ts`:
   - iterates `listTypeData.filter((l) => l.isNonStrategic)`, so any new non-strategic list type is checked automatically and fails if it has no converter;
   - checks every sheet config of multi-tab lists through `converter.sheets ?? [{ config: converter.config }]`. `sheets` is added by PR #1651. Without it, the second tab (CoA future judgments, IA open justice, London Admin Planning Court) would not be checked;
   - asserts `field.required === REQUIRED_FIELD_NAMES.has(field.fieldName)`, with `REQUIRED_FIELD_NAMES = new Set(["date", "time", "hearingTime"])` as a constant inside the test file only (no production export);
   - gets its converters registered by side-effect imports of each non-strategic list-type package. The test already does this for CST.

   The existing per-config "required flags" tests then cover the same behaviour twice, and they would all need rewriting anyway. They are deleted rather than kept as duplicates (see Section 5).
4. **Sequencing: build on PR #1651 (`feature/1355-non-strategic-upload-error-locations`).** That PR is open and approved but not merged. It contains the BPD reference fix, adds `ListTypeConverter.sheets`, and rewrites `parseRow`/`validateHeaders` (renamed `findMissingHeadersIssue`) so they collect `ExcelValidationError` issues instead of throwing on the first one. The user-facing message text is unchanged (`Error in row N: Missing required field 'X' in row N`). **Decided:** build on the #1651 branch, pulled up to date, rather than waiting for it to merge. Harvey is checking with Daniel that this is OK. Rebase onto master once #1651 merges.

## 2. Implementation Details

No API, database, Prisma, page, template or translation changes. Confirmed: the change only touches converter config literals and unit tests.

Change `required: true` to `required: false` on these fields. Every `date`/`time`/`hearingTime` field stays `required: true`. Fields already `false` are left as they are.

| File (under `libs/list-types/`) | Lists | Set `required: false` | Stays `required: true` |
|---|---|---|---|
| `common/src/conversion/rcj-field-configs.ts`: `RCJ_EXCEL_CONFIG` and `RCJ_EXCEL_CONFIG_SIMPLE_TIME` | RCJ standard ×8 (incl. SCCO), Admin Court ×4, London Admin (both tabs), CoA Civil "Daily hearings" tab | venue, judge, caseNumber, caseDetails, hearingType | time |
| `court-of-appeal-civil-daily-cause-list/src/conversion/court-of-appeal-civil-daily-cause-list-config.ts`: `FUTURE_JUDGMENTS_CONFIG` | 1 | venue, judge, caseNumber, caseDetails, hearingType | date, time |
| `interim-applications-daily-cause-list/src/conversion/interim-applications-daily-cause-list-config.ts`: `INTERIM_APPLICATIONS_HEARINGS_CONFIG`, `OPEN_JUSTICE_CONFIG` | 1 | judge, venue, type, caseNumber, caseName, additionalInformation; nameToBeDisplayed, email | time |
| `ast-daily-hearing-list/src/conversion/ast-config.ts` | 1 | appellant, appealReferenceNumber, caseType, hearingType, additionalInformation | hearingTime |
| `sscs-daily-hearing-list/src/conversion/sscs-config.ts` | 7 | venue, appealReferenceNumber, hearingType, appellant, courtroom, tribunal, respondent | hearingTime |
| `ftt-rpt-weekly-hearing-list/src/conversion/ftt-rpt-config.ts` | 6 | venue, caseType, caseReferenceNumber, judges, members, hearingMethod, additionalInformation | date, time |
| `siac-poac-paac-weekly-hearing-list/src/conversion/siac-poac-paac-config.ts` | 3 | appellant, caseReferenceNumber, hearingType, courtroom, additionalInformation | date, time |
| `utiac-jr-daily-hearing-list/src/conversion/utiac-jr-config.ts`: regional and London | 5 | regional: venue, judges, caseReferenceNumber, caseTitle, hearingType; London: caseTitle, caseReferenceNumber, judges, hearingType, location | hearingTime |
| `care-standards-tribunal-weekly-hearing-list/src/conversion/cst-config.ts` | 1 | caseName, hearingLength, hearingType, venue, additionalInformation | date |
| `pht-weekly-hearing-list/src/conversion/pht-config.ts` | 1 | caseName, hearingLength, hearingType, venue, additionalInformation | date |
| `cic-weekly-hearing-list/src/conversion/cic-config.ts` | 1 | caseReferenceNumber, caseName, `venue/platform`, judges, members, additionalInformation | date, hearingTime |
| `ftt-lands-registration-tribunal-weekly-hearing-list/src/conversion/ftt-lrt-config.ts` | 1 | caseName, caseReferenceNumber, judge, venuePlatform | date, hearingTime |
| `ftt-tax-chamber-weekly-hearing-list/src/conversion/ftt-tax-config.ts` | 1 | caseName, caseReferenceNumber, judges, members, venuePlatform | date, hearingTime |
| `grc-weekly-hearing-list/src/conversion/grc-config.ts` | 1 | caseReferenceNumber, caseName, judges, modeOfHearing, venue | date, hearingTime |
| `send-daily-hearing-list/src/conversion/send-config.ts` | 1 | caseReferenceNumber, respondent, hearingType, venue, timeEstimate | time |
| `upper-tribunal-administrative-appeals-chamber-daily-hearing-list/src/conversion/utaac-config.ts` | 1 | appellant, caseReferenceNumber, judges, members, modeOfHearing, venue, additionalInformation | time |
| `upper-tribunal-lands-chamber-daily-hearing-list/src/conversion/utlc-config.ts` | 1 | caseReferenceNumber, caseName, judges, members, hearingType, venue, modeOfHearing, additionalInformation | time |
| `upper-tribunal-tax-and-chancery-chamber-daily-hearing-list/src/conversion/utcc-config.ts` | 1 | caseReferenceNumber, caseName, judges, members, hearingType, venue, additionalInformation | time |
| `utiac-statutory-appeal-daily-hearing-list/src/conversion/utiac-sa-config.ts` | 1 | appellant, appealReferenceNumber, judges, hearingType, location | hearingTime |
| `wpafcc-weekly-hearing-list/src/conversion/wpafcc-config.ts` | 1 | caseReferenceNumber, caseName, panel, modeOfHearing, venue | date, hearingTime |
| `business-and-property-division-rolls-building-daily-cause-list/…-config.ts` | 1 | already done on #1651 | time |

Comments that are now wrong must be updated in the same change: the IA header comment ("the seven required fields") and any "All N fields are required" wording. Each one gets a short note, worded like the BPD comment on #1651: only date/time must have a value, to match PIP, and a blank optional cell is written as `""`.

## 3. Error Handling & Edge Cases

| Case | Behaviour after the fix | Why |
|---|---|---|
| Blank optional cell | Accepted; stored as `""` | `getField` only throws when the field is required. `parseRow` always writes `data[fieldName] = value`, so every schema-required key is present. |
| Whitespace-only optional cell | Accepted; stored as `""` | `readCellValue` trims strings and rich text, so `"   "` becomes `""`. |
| Formula error / unknown cell shape in an optional column | Accepted as `""` | `readCellValue` returns `""` for these. In PIP the cell becomes `""` too. Previously the required check caught them. Accepted for PIP parity and pinned by test scenario 2. |
| Validators on a blank optional cell | Skipped | `parseRow` skips validators when the value is `""`. This matters for IA `email`: `validateEmailFormat` would reject `""`, but it never runs on a blank cell. |
| Non-blank text cell containing HTML | Still rejected (`HTML tags are not allowed`) | Validators are unchanged and run on every non-empty value. |
| Missing column | Still rejected (`Excel file must contain columns: … Missing: …`) | Header validation covers every configured field, whatever its `required` flag. |
| Blank date / time / hearingTime | Still rejected (`Missing required field '<header>'`) | These stay `required: true`. For FTT LRT, FTT RPT, FTT Tax, SIAC, SSCS and UTIAC SA the CaTH schema accepts `""` for time, so the converter check is the only thing in CaTH that matches PIP's rejection of a blank time. |
| Fully blank row | Unchanged: skipped by ExcelJS `eachRow` | Not affected by this change. |
| Row with only the time filled | Accepted; all other keys `""` | Same as the BPD reference test on #1651 and as PIP. |

## 4. Acceptance Criteria Mapping

| AC | How it's satisfied | Verified by |
|---|---|---|
| Blank non-date/time cell uploads for every non-strategic list type and is stored as `""` | Config changes in Section 2 | The shared rule test (all 50 list types, all tabs) proves the flags. The registry conversion test proves the end-to-end behaviour, including the `""` value. |
| Blank date or time cell still rejected with the existing error | date/time/hearingTime keep `required: true` | The shared rule test asserts they are required. The registry test asserts a blank CST Date is rejected with `Missing required field 'Date'`. The generic required-cell behaviour is already covered in `excel-to-json.test.ts`. |
| Missing column still rejected | No change to header validation | Existing `should reject Excel file with missing columns` (registry test) and the `excel-to-json.test.ts` header tests |
| Non-blank text cell with HTML still rejected | Validators unchanged | Existing `should reject HTML tags in …` tests (registry, config tests) |
| Config unit tests assert only date/time fields are required | Shared table-driven test over `listTypeData` non-strategic entries and every sheet config | New test in `non-strategic-list-registry.test.ts` |
| `non-strategic-list-registry.test.ts` covers blank optional accepted and blank date rejected | Replace `should reject empty required fields` with the two tests below | Registry test |

## 5. Test Scenarios

One test per behaviour. Each scenario maps to a task in `tasks.md`.

New or replaced tests:
1. **Shared rule (registry test).** `should require a value only for date and time fields in every non-strategic converter`: for each non-strategic `listTypeData` entry, a converter exists, and every field of every sheet config has `required === REQUIRED_FIELD_NAMES.has(fieldName)`.
2. **Blank optional cells accepted (registry test, CST).** One row with several optional cells blank, one whitespace-only and one holding a formula error (`#REF!`). The conversion resolves and those keys equal `""`. This replaces `should reject empty required fields`, and it pins the formula-error behaviour (Clarification 3).
3. **Blank date rejected (registry test, CST).** A row with a blank Date rejects with `/Missing required field 'Date'/`.
4. **Validators skipped on a blank optional cell (IA config test).** An open-justice row with a name and a blank Email converts with `email: ""`. This proves `validateEmailFormat` does not run on blanks, and it is the only optional validator that rejects `""`. The existing `should reject a malformed judge email` test still covers a non-blank bad email.
5. **IA "Important information" paragraph with a partial open-justice row (IA `rendering/renderer.test.ts`).** Use `openJusticeStatementDetails[0]` with a name and `email: ""`, and again with `nameToBeDisplayed: ""` and an email. Assert the exact paragraph the renderer produces, so a test fixes the output instead of a manual check (Clarification 4). With the current English wording, a blank email renders as `Parties should contact the clerk to the Interim Judge Jane Smith,  as early as possible.`, with a stray comma and a double space. The test pins that as it is, because changing the wording is out of scope.

Existing tests kept as-is (they cover error paths that must not regress): missing columns, HTML rejection, invalid date/time format, malformed email, row number in errors.

Existing tests removed because the shared rule test covers them (each currently asserts the old flags and would fail):
- `administrative-court-daily-cause-list-config.test.ts`: "correct required flags"
- `rcj-standard-daily-cause-list-config.test.ts`: "correct required flags"
- `london-administrative-court-daily-cause-list-config.test.ts`: "mark additionalInformation as optional" / "mark all other fields as required"
- `court-of-appeal-civil-daily-cause-list-config.test.ts`: the same pair, for both tabs
- `interim-applications-daily-cause-list-config.test.ts`: "map the two open-justice fields as required". Keep the field-name assertion and rename it to "should map the two open-justice fields".
- `sscs-config.test.ts`: "mark most fields as required" / "mark additionalInformation as not required"
- `utaac-config.test.ts`, `utlc-config.test.ts`, `utcc-config.test.ts`, `utiac-jr-config.test.ts` (regional and London): "correct required flags"
- `business-and-property-division-rolls-building-daily-cause-list-config.test.ts`: "should require only the time field, matching PIP" (added on #1651)

Unaffected: `excel-to-json.test.ts` (uses inline configs), `multi-sheet-converter.test.ts`, and the `apps/web` non-strategic upload tests (they mock the converter). No E2E test checks for a blank-cell rejection.

Run: `yarn test` for `@hmcts/list-types-common` and each touched list-type package, then `yarn lint`.

## Resolutions (2026-11-25)

- **1 (PR #1651):** build on the up-to-date #1651 branch. Harvey is confirming with Daniel. Rebase onto master once it merges.
- **3 (formula errors):** accepted as `""`. Pinned by test scenario 2, and the `readCellValue` comment gets reworded.
- **4 (IA partial rows):** covered by test scenarios 4 and 5 instead of a manual rendering check.
- **5 (stricter-than-PIP validation):** not pursued, no follow-up ticket.
- **6 (shared test location):** keep the test in `@hmcts/list-types-common` with side-effect imports.
- **7 (local checkout):** start from the up-to-date #1651 branch.

## CLARIFICATIONS NEEDED (original, kept for reference)

1. **Dependency on PR #1651.** The BPD "reference" config is only fixed on `feature/1355-non-strategic-upload-error-locations` (PR #1651, approved, not merged). On master BPD still has `required: true` on all 7 fields. #1651 also renames `validateHeaders` to `findMissingHeadersIssue` and changes `parseRow` to collect issues. Confirm that #1658 should wait for #1651 to merge, or be stacked on it. The shared test's multi-tab coverage relies on `ListTypeConverter.sheets` from #1651.
2. **Ticket table: small notes, no missing configs or fields.** All 23 config files and all 50 registered converters match the table. Every field already sets `required` explicitly. None rely on the default.
   - The "Court of Appeal Civil" row only names the "Notice for future judgments" tab. The "Daily hearings" tab uses `RCJ_EXCEL_CONFIG_SIMPLE_TIME` and is fixed through `rcj-field-configs.ts`. The `date` and `time` fields on the future-judgments tab stay required.
   - London Admin (both tabs) also uses `RCJ_EXCEL_CONFIG_SIMPLE_TIME`, so it is covered by the RCJ row.
   - The "RCJ standard ×7, SCCO" count is right: 8 registrations in `rcj-standard-daily-cause-list-config.ts`.
   - CIC's `fieldName` is literally `"venue/platform"` (with a slash), unlike `venuePlatform` in FTT LRT and FTT Tax. Leave it as it is, because renaming it would break its schema and renderer.
3. **Formula errors (`#REF!`) in optional columns** will now be accepted as `""` instead of rejected. This matches PIP, but the code comment in `readCellValue` says error values are treated as empty "so required-field validation catches them". Confirm this is acceptable and reword that comment.
4. **IA open-justice partial rows.** A row with a name but a blank email, or the reverse, will now be accepted, as in PIP. Confirm the IA "Important information" paragraph renders acceptably with a blank email or name. This is a check, not a code change.
5. **Stricter-than-PIP validation left in place (out of scope).** CaTH's `validateEmailFormat` rejects a non-blank invalid email that PIP would accept (PIP only applies the no-HTML pattern). Separately, CaTH's schemas for FTT LRT, FTT RPT, FTT Tax, SIAC, SSCS and UTIAC SA accept `""` for time where PIP's reject it. Should either get a follow-up ticket?
6. **Shared test location.** The plan puts the cross-config test in `libs/list-types/common/.../non-strategic-list-registry.test.ts` and imports all 23 list-type packages for their side effects, following the existing CST import. Those packages are not declared as dependencies of `@hmcts/list-types-common`, which already holds for the CST import. Turbo's `test` task has `cache: false`, so the test always runs. Confirm this is acceptable, or say if the test should go in a package that already depends on every list type (for example `@hmcts/publication`).
7. **Local checkout state.** The local `cath-service` clone is on `fix/1190-family-dcl-pdf-legal-advisor`, 29 commits behind its remote. This plan was checked against `origin/master` (`54924af3`) and `origin/feature/1355-non-strategic-upload-error-locations`. Implementation should start from an up-to-date master or the #1651 branch.
