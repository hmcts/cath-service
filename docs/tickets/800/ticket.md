# #800: Business list (ChD) daily cause list

**State:** OPEN
**Assignees:** _(none)_
**Author:** OgechiOkelu
**Labels:** enhancement, type:story, epic:public-journey
**Created:** 2026-07-01T17:58:39Z
**Updated:** 2026-07-23T15:45:59Z

## Description

**PROBLEM STATEMENT**

This ticket covers the non-strategic publishing of The Business list (ChD) daily cause list (through the upload of excel files in CaTH) which would require the creation of validation schema and style guides.

**AS A** Service

**I WANT** to create the validation schema and style guides for Business list (ChD) daily cause list

**SO THAT** the Business list (ChD) daily cause list can be published in CaTH

**ACCEPTANCE CRITERIA**
- The Business list (ChD) daily cause list is created under the Business and Property Courts Rolls Building in CaTH and is linked to the 'Civil' jurisdiction and 'Royal Courts of Justice Group' region
- The following data fields are created in the listed order in the validation schema for the Business list (ChD) daily cause list (Judge, Time, Venue, Type, Case Number, Case Name and Additional Information)
- The the Business list (ChD) daily cause list is published through the Excel upload route in CaTH. It is uploaded as an excel template and converted to the Json file format suitable for rendering
- The validation schema and style guide for the Business list (ChD) daily cause list is created.
- A PDF and Excel downloadable version of the hearing list is created.
- The style guide should follow the structure in https://pip-frontend.staging.platform.hmcts.net/business-list-chd-daily-cause-list?artefactId=bbd53ff0-cbb2-4c1d-ac33-a3c797a414c4
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

### Comment by OgechiOkelu on 2026-07-22T14:34:55Z
@spec

### Comment by hmctsclaudecode on 2026-07-22T14:39:32Z
A full technical specification was auto-generated on the issue (see the plan below, which incorporates and verifies it against the actual codebase). Key points:
- Follows the RCJ non-strategic list pattern (`libs/list-types/rcj-standard-daily-cause-list/`).
- Requires a **bespoke** Excel config and JSON schema — the field set/order (`Judge, Time, Venue, Type, Case Number, Case Name, Additional Information`) differs from the shared `RCJ_EXCEL_CONFIG` (`Venue, Judge, Time, Case Number, Case Details, Hearing Type, Additional Information`), so it cannot reuse it.
- New library module + new page controller + PDF/Excel registration + seed metadata.

### Comment by OgechiOkelu on 2026-07-23T15:45:59Z
@plan
