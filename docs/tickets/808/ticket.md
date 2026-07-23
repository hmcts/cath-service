# #808: Insolvency & Companies Court (ChD) daily cause list

**State:** OPEN
**Assignees:** None
**Author:** OgechiOkelu
**Labels:** None
**Created:** 2026-07-22
**Updated:** 2026-07-23

## Description

**PROBLEM STATEMENT**

This ticket covers the non-strategic publishing of The Insolvency & Companies Court (ChD) daily cause list (through the upload of excel files in CaTH) which would require the creation of validation schema and style guides.

**AS A** Service

**I WANT** to create the validation schema and style guides for Insolvency & Companies Court (ChD) daily cause list

**SO THAT** the Insolvency & Companies Court (ChD) daily cause list can be published in CaTH

**ACCEPTANCE CRITERIA**
- The Insolvency & Companies Court (ChD) daily cause list is created under the Business and Property Courts Rolls Building in CaTH and is linked to the 'Civil' jurisdiction and 'Royal Courts of Justice Group' region
- The following data fields are created in the listed order in the validation schema for the Insolvency & Companies Court (ChD) daily cause list (Judge, Time, Venue, Type, Case Number, Case Name and Additional Information)
- The Insolvency & Companies Court (ChD) daily cause list is published through the Excel upload route in CaTH. It is uploaded as an excel template and converted to the Json file format suitable for rendering
- The validation schema and style guide for the Insolvency & Companies Court (ChD) daily cause list is created.
- A PDF and Excel downloadable version of the hearing list is created.
- The style guide should follow the structure in https://pip-frontend.staging.platform.hmcts.net/insolvency-and-companies-court-chd-daily-cause-list?artefactId=e54a8a97-7fe5-4585-b43a-d1a6a6eb4bba
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

### Comment by OgechiOkelu on 2026-07-22
@spec

### Comment by hmctsclaudecode on 2026-07-22
(A detailed technical specification was auto-generated in a prior run. Its content has been reviewed, verified against the codebase, and incorporated into `plan.md`.)

### Comment by OgechiOkelu on 2026-07-23
@plan
