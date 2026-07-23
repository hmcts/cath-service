# #801: Chancery Appeals (ChD) daily cause list

**State:** OPEN
**Assignees:** (none)
**Author:** OgechiOkelu
**Labels:** (none)
**Created:** (see GitHub)
**Updated:** (see GitHub)

## Description

**PROBLEM STATEMENT**
This ticket covers the non-strategic publishing of The Chancery Appeals (ChD) daily cause list (through the upload of excel files in CaTH) which would require the creation of validation schema and style guides.

**AS A** Service
**I WANT** to create the validation schema and style guides for Chancery Appeals (ChD) daily cause list
**SO THAT** the Chancery Appeals (ChD) daily cause list can be published in CaTH

**ACCEPTANCE CRITERIA**
- The Chancery Appeals (ChD) daily cause list is created under the Business and Property Courts Rolls Building in CaTH and is linked to the 'Civil' jurisdiction and 'Royal Courts of Justice Group' region
- The following data fields are created in the listed order in the validation schema for the Chancery Appeals (ChD) daily cause list (Judge, Time, Venue, Type, Case Number, Case Name and Additional Information)
- The Chancery Appeals (ChD) daily cause list is published through the Excel upload route in CaTH. It is uploaded as an excel template and converted to the Json file format suitable for rendering
- The validation schema and style guide for the Chancery Appeals (ChD) daily cause list is created.
- A PDF and Excel downloadable version of the hearing list is created.
- The style guide should follow the structure in https://pip-frontend.staging.platform.hmcts.net/chancery-appeals-chd-daily-cause-list?artefactId=9cc94552-ee10-4226-972d-b8d189b01aa3
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

### Comment by OgechiOkelu
`@spec`

### Comment by hmctsclaudecode
A detailed technical specification was posted (structure, field ordering, module layout,
schema rules, registration touch-points, accessibility, test scenarios, open questions).
Its content has been folded into `plan.md` in this folder.
