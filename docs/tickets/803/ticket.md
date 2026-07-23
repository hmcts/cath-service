# #803: Companies Winding Up (ChD) daily cause list

**State:** OPEN
**Assignees:** (none)
**Author:** OgechiOkelu
**Labels:** enhancement, type:story, epic:public-journey
**Created:** 2026-07-01T18:04:52Z
**Updated:** 2026-07-23T12:02:04Z

## Description

**PROBLEM STATEMENT**
This ticket covers the non-strategic publishing of The Companies Winding Up (ChD) daily cause list (through the upload of excel files in CaTH) which would require the creation of validation schema and style guides.

**AS A** Service
**I WANT** to create the validation schema and style guides for Companies Winding Up (ChD) daily cause list
**SO THAT** the Companies Winding Up (ChD) daily cause list can be published in CaTH

**ACCEPTANCE CRITERIA**
- The Companies Winding Up (ChD) daily cause list is created under the Business and Property Courts Rolls Building in CaTH and is linked to the 'Civil' jurisdiction and 'Royal Courts of Justice Group' region
- The following data fields are created in the listed order in the validation schema for the Companies Winding Up (ChD) daily cause list (Judge, Time, Venue, Type, Case Number, Case Name and Additional Information)
- The the Companies Winding Up (ChD) daily cause list is published through the Excel upload route in CaTH. It is uploaded as an excel template and converted to the Json file format suitable for rendering
- The validation schema and style guide for the Companies Winding Up (ChD) daily cause list is created.
- A PDF and Excel downloadable version of the hearing list is created.
- The style guide should follow the structure in https://pip-frontend.staging.platform.hmcts.net/companies-winding-up-chd-daily-cause-list?artefactId=171f1390-8eff-4a01-86a1-6572ac3f3944
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

### Comment by OgechiOkelu on 2026-07-22T15:52:33Z
@spec

### Comment by hmctsclaudecode on 2026-07-22T15:56:49Z
A detailed technical specification was posted (module layout, schema, converter config, registration touch-points, test scenarios and open questions). It referenced the RCJ multi-list module as the closest analogue. This plan refines that by using the single-variant `court-of-appeal-civil-daily-cause-list` module as the reference pattern, since Companies Winding Up (ChD) is a single list variant.

### Comment by OgechiOkelu on 2026-07-23T09:39:51Z
@plan

### Comment by SarahLittlejohn on 2026-07-23T12:02:04Z
@plan
</content>
</invoke>
