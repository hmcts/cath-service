# #1658: Non-strategic Excel uploads reject blank cells that legacy PIP accepts

**State:** OPEN
**Assignees:** HarveyMoj
**Author:** alao-daniel
**Labels:** bug
**Created:** 2026-11-24T11:20:29Z
**Updated:** 2026-11-25T12:25:52Z

## Description

## Summary

Non-strategic Excel uploads in CaTH reject blank cells that legacy PIP accepts. A publisher can upload a spreadsheet to PIP with, for example, an empty **Additional information** column on the AST Daily Hearing List, and it publishes successfully. The same file fails in CaTH with `Missing required field 'Additional information'`.

This affects **all 50 non-strategic Excel list types** (every one except Business and Property Division Rolls Building, which was fixed on the #1355 branch).

## Root cause

PIP and CaTH interpret "required" differently.

**PIP** (`pip-data-management` → `ExcelConversionService.java`)
- Every header becomes a JSON key; a blank cell becomes `""`. The converter never checks for empty values.
- The JSON schema's `required` array only checks that the **key exists**, i.e. that the **column is present**.
- A blank value is only rejected if the field's `pattern` rejects `""`. In the non-strategic schemas that is only true for **date and time fields** (`date`, `time`, `hearingTime`). Text fields use the no-HTML pattern `^(?!(.|\r|\n)*<[^>]+>)(.|\r|\n)*$`, which accepts `""`.

**CaTH** (`libs/list-types/common/src/conversion/excel-to-json.ts`)
- `validateHeaders` already checks that every configured column is present (matches PIP).
- `parseRow` additionally rejects a blank cell for any field where `required` is `true` (the default when omitted).
- The converter configs copied the schema's `required` array into `required: true` on almost every field, turning "column must exist" into "cell must have a value".

## Example: AST Daily Hearing List

Upload with a blank Additional information cell:

| Appellant | Appeal reference number | Case type | Hearing type | Hearing time | Additional information |
|---|---|---|---|---|---|
| Appellant 1 | AA/12345/2025 | Asylum support | Oral | 10am | *(blank)* |

**PIP** converts this to the following, which passes `ast_daily_hearing_list.json` (key present, `""` matches the no-HTML pattern). Upload succeeds.

```json
[
  {
    "appellant": "Appellant 1",
    "appealReferenceNumber": "AA/12345/2025",
    "caseType": "Asylum support",
    "hearingType": "Oral",
    "hearingTime": "10am",
    "additionalInformation": ""
  }
]
```

**CaTH** rejects it before schema validation because `libs/list-types/ast-daily-hearing-list/src/conversion/ast-config.ts` has `required: true` on `additionalInformation`:

```
Error in row 2: Missing required field 'Additional information' in row 2
```

The same applies if Appellant, Appeal reference number, Case type or Hearing type are blank. A blank **Hearing time** correctly fails in both systems, because PIP's time pattern `^\s*\d{1,2}([:.]\d{2})?[ap]m\s*$` rejects `""`.

## Affected configs

Fields currently `required: true` in CaTH that PIP allows to be blank (paths under `libs/list-types/`):

| Config | Lists | Fields to make optional |
|---|---|---|
| `common/src/conversion/rcj-field-configs.ts` (both configs) | RCJ standard ×7, SCCO, Admin Court ×4, London Admin Court | venue, judge, caseNumber, caseDetails, hearingType |
| `court-of-appeal-civil-daily-cause-list/…-config.ts` | 1 | venue, judge, caseNumber, caseDetails, hearingType |
| `interim-applications-daily-cause-list/…-config.ts` | 1 | judge, venue, type, caseNumber, caseName, additionalInformation, nameToBeDisplayed, email |
| `ast-daily-hearing-list/…/ast-config.ts` | 1 | appellant, appealReferenceNumber, caseType, hearingType, additionalInformation |
| `sscs-daily-hearing-list/…/sscs-config.ts` | 7 | venue, appealReferenceNumber, hearingType, appellant, courtroom, tribunal, respondent |
| `ftt-rpt-weekly-hearing-list/…/ftt-rpt-config.ts` | 6 | venue, caseType, caseReferenceNumber, judges, members, hearingMethod, additionalInformation |
| `siac-poac-paac-weekly-hearing-list/…/siac-poac-paac-config.ts` | 3 | appellant, caseReferenceNumber, hearingType, courtroom, additionalInformation |
| `utiac-jr-daily-hearing-list/…/utiac-jr-config.ts` (regional + London) | 5 | venue / location, judges, caseReferenceNumber, caseTitle, hearingType |
| `care-standards-tribunal-weekly-hearing-list/…/cst-config.ts` | 1 | caseName, hearingLength, hearingType, venue, additionalInformation |
| `pht-weekly-hearing-list/…/pht-config.ts` | 1 | caseName, hearingLength, hearingType, venue, additionalInformation |
| `cic-weekly-hearing-list/…/cic-config.ts` | 1 | caseReferenceNumber, caseName, venue/platform, judges, members, additionalInformation |
| `ftt-lands-registration-tribunal-weekly-hearing-list/…/ftt-lrt-config.ts` | 1 | caseName, caseReferenceNumber, judge, venuePlatform |
| `ftt-tax-chamber-weekly-hearing-list/…/ftt-tax-config.ts` | 1 | caseName, caseReferenceNumber, judges, members, venuePlatform |
| `grc-weekly-hearing-list/…/grc-config.ts` | 1 | caseReferenceNumber, caseName, judges, modeOfHearing, venue |
| `send-daily-hearing-list/…/send-config.ts` | 1 | caseReferenceNumber, respondent, hearingType, venue, timeEstimate |
| `upper-tribunal-administrative-appeals-chamber-daily-hearing-list/…/utaac-config.ts` | 1 | appellant, caseReferenceNumber, judges, members, modeOfHearing, venue, additionalInformation |
| `upper-tribunal-lands-chamber-daily-hearing-list/…/utlc-config.ts` | 1 | caseReferenceNumber, caseName, judges, members, hearingType, venue, modeOfHearing, additionalInformation |
| `upper-tribunal-tax-and-chancery-chamber-daily-hearing-list/…/utcc-config.ts` | 1 | caseReferenceNumber, caseName, judges, members, hearingType, venue, additionalInformation |
| `utiac-statutory-appeal-daily-hearing-list/…/utiac-sa-config.ts` | 1 | appellant, appealReferenceNumber, judges, hearingType, location |
| `wpafcc-weekly-hearing-list/…/wpafcc-config.ts` | 1 | caseReferenceNumber, caseName, panel, modeOfHearing, venue |

Column headers already match the keys PIP derives (`NonStrategicFieldFormattingHelper.formatFieldInLowerCamelCaseFormat`), so no header changes are needed.

## Proposed fix

Apply one rule to every non-strategic converter config, matching PIP:

- `required: true` **only** for `date`, `time` and `hearingTime`.
- `required: false` for every other field.

No converter logic change is needed:
- `validateHeaders` keeps every column mandatory (PIP parity).
- A blank optional cell is still written as `""`, so the schema's required keys are satisfied.
- Validators (HTML check, email format) are skipped for blank values; non-blank text cells still reject HTML.

Keep `time` / `hearingTime` as `required: true` even where CaTH's own schema accepts `""` (FTT LR, FTT RPT, FTT Tax, SIAC, SSCS, UTIAC SA): for those lists the converter check is the only thing in CaTH that matches PIP's rejection of a blank time.

Business and Property Division Rolls Building already follows this rule and can be used as the reference config.

## Acceptance criteria

- [ ] For every non-strategic list type, a spreadsheet with a blank non-date/time cell uploads successfully and the value is stored as `""`.
- [ ] A blank date or time cell is still rejected with the existing error.
- [ ] A missing column is still rejected.
- [ ] A non-blank text cell containing HTML is still rejected.
- [ ] Config unit tests assert that only date/time fields are required.
- [ ] `non-strategic-list-registry.test.ts` covers blank optional fields accepted and blank date rejected.

## Out of scope / related

Tab matching for multi-tab lists differs slightly from PIP and is not part of this fix. CaTH falls back to tab position for London Admin, CoA Civil and Interim Applications, and single-tab lists ignore extra tabs. Both are more lenient than PIP.


## Comments

No comments on this issue.

