# #805: Financial List (ChD/KB) daily cause list

**State:** OPEN
**Assignees:** _none_
**Author:** OgechiOkelu
**Labels:** _none_
**Created:** 2026-07-22
**Updated:** 2026-07-23

## Description

**PROBLEM STATEMENT**
This ticket covers the non-strategic publishing of The Financial List (ChD/KB) daily cause list (through the upload of excel files in CaTH) which would require the creation of validation schema and style guides.

**AS A** Service

**I WANT** to create the validation schema and style guides for Financial List (ChD/KB) daily cause list

**SO THAT** the Financial List (ChD/KB) daily cause list can be published in CaTH

**ACCEPTANCE CRITERIA**
- The Financial List (ChD/KB) daily cause list is created under the Business and Property Courts Rolls Building in CaTH and is linked to the 'Civil' jurisdiction and 'Royal Courts of Justice Group' region
- The following data fields are created in the listed order in the validation schema for the Financial List (ChD/KB) daily cause list (Judge, Time, Venue, Type, Case Number, Case Name and Additional Information)
- The Financial List (ChD/KB) daily cause list is published through the Excel upload route in CaTH. It is uploaded as an excel template and converted to the Json file format suitable for rendering
- The validation schema and style guide for the Financial List (ChD/KB) daily cause list is created.
- A PDF and Excel downloadable version of the hearing list is created.
- The style guide should follow the structure in https://pip-frontend.staging.platform.hmcts.net/financial-list-chd-kb-daily-cause-list?artefactId=bb5307f2-e0fd-4d72-8ae8-b72457413eb8
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

### Comment by OgechiOkelu on 2026-07-22T15:47:06Z
@spec

### Comment by hmctsclaudecode on 2026-07-22
A detailed technical specification was posted (mirroring the RCJ standard daily cause list module). Its content has been verified against the codebase and folded into `plan.md`.
