# #802: Commercial Court (KB) daily cause list

**State:** OPEN
**Assignees:** None
**Author:** OgechiOkelu
**Labels:** None
**Created:** 2026-07-22
**Updated:** 2026-07-23

## Description

**PROBLEM STATEMENT**

This ticket covers the non-strategic publishing of The Commercial Court (KB) daily cause list (through the upload of excel files in CaTH) which would require the creation of validation schema and style guides.

**AS A** Service

**I WANT** to create the validation schema and style guides for Commercial Court (KB) daily cause list

**SO THAT** the Commercial Court (KB) daily cause list can be published in CaTH

**ACCEPTANCE CRITERIA**
- The Commercial Court (KB) daily cause list is created under the Business and Property Courts Rolls Building in CaTH and is linked to the 'Civil' jurisdiction and 'Royal Courts of Justice Group' region
- The following data fields are created in the listed order in the validation schema for the Commercial Court (KB) daily cause list (Judge, Time, Venue, Type, Case Number, Case Name and Additional Information)
- The the Commercial Court (KB) daily cause list is published through the Excel upload route in CaTH. It is uploaded as an excel template and converted to the Json file format suitable for rendering
- The validation schema and style guide for the Commercial Court (KB) daily cause list is created.
- A PDF and Excel downloadable version of the hearing list is created.
- The style guide should follow the structure in https://pip-frontend.staging.platform.hmcts.net/commercial-court-kb-daily-cause-list?artefactId=cbcc9d8d-e8fc-4035-aba5-cee6bd0d20ae
- The Json file should follow the below format

```json
[
  {
    "judge": "Judge A",
    "time": "9am",
    "venue": "Venue A",
    "type": "Type A",
    "caseNumber": "12345",
    "caseName": "Case name A",
    "additionalInformation": "This is additional information"
  },
  {
    "judge": "Judge B",
    "time": "10:30pm",
    "venue": "Venue B",
    "type": "Type B",
    "caseNumber": "12346",
    "caseName": "Case name B",
    "additionalInformation": "This is another additional information"
  }
]
```

## Comments

### Comment by OgechiOkelu on 2026-07-22T15:00:23Z
@spec

### Comment by hmctsclaudecode on 2026-07-22
A detailed technical specification was auto-generated on the issue covering: user story, background (mirroring `libs/list-types/administrative-court-daily-cause-list/` as the closest single flat-array reference), acceptance criteria, user journey flow, the canonical JSON array format, locale files (en/cy), public route `/commercial-court-kb-daily-cause-list`, the JSON schema (root array; required `judge, time, venue, type, caseNumber, caseName`; optional `additionalInformation`), validator wrapper, bespoke Excel conversion config (the field set `type`/`caseName` does NOT map onto the shared `RCJ_EXCEL_CONFIG`), error messages, navigation, accessibility, test scenarios, and open questions. Key deviation flagged: the field set/order differs from existing RCJ/admin lists, so a dedicated Excel config and schema are required.
