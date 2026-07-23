# #804: Competition List (ChD) daily cause list

**State:** OPEN
**Assignees:** _None_
**Author:** OgechiOkelu
**Labels:** enhancement, type:story, epic:public-journey
**Created:** 2026-07-01T18:06:18Z
**Updated:** 2026-07-23T13:27:54Z

## Description

**PROBLEM STATEMENT**

This ticket covers the non-strategic publishing of The Competition List (ChD) daily cause list (through the upload of excel files in CaTH) which would require the creation of validation schema and style guides.

**AS A** Service

**I WANT** to create the validation schema and style guides for Competition List (ChD) daily cause list

**SO THAT** the Competition List (ChD) daily cause list can be published in CaTH

**ACCEPTANCE CRITERIA**
- The Competition List (ChD) daily cause list is created under the Business and Property Courts Rolls Building in CaTH and is linked to the 'Civil' jurisdiction and 'Royal Courts of Justice Group' region
- The following data fields are created in the listed order in the validation schema for the Competition List (ChD) daily cause list (Judge, Time, Venue, Type, Case Number, Case Name and Additional Information)
- The Competition List (ChD) daily cause list is published through the Excel upload route in CaTH. It is uploaded as an excel template and converted to the Json file format suitable for rendering
- The validation schema and style guide for the Competition List (ChD) daily cause list is created.
- A PDF and Excel downloadable version of the hearing list is created.
- The style guide should follow the structure in https://pip-frontend.staging.platform.hmcts.net/competition-list-chd-daily-cause-list?artefactId=504b46d6-f6b4-4d13-a145-6bbe3b35f1aa
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

### Comment by OgechiOkelu on 2026-07-22T15:36:38Z
@spec

### Comment by hmctsclaudecode on 2026-07-22T15:44:17Z
A full technical specification was generated (see the `@spec` reply on the issue). Key points, reproduced in `plan.md`:
- List type name (stable, `@unique`): `COMPETITION_LIST_CHD_DAILY_CAUSE_LIST`
- URL path: `/competition-list-chd-daily-cause-list`
- Structurally almost identical to the RCJ Standard Daily Cause List family (flat array of hearings), differing in two field names (`type`, `caseName`) and column order — so it needs its own module and Excel converter config.

### Comment by OgechiOkelu on 2026-07-23T13:27:54Z
@plan
