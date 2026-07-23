# #807: Intellectual Property and Enterprise Court (ChD) daily cause list

**State:** OPEN
**Assignees:** _None_
**Author:** OgechiOkelu
**Labels:** _None_
**Created:** (see GitHub)
**Updated:** (see GitHub)

## Description

**PROBLEM STATEMENT**

This ticket covers the non-strategic publishing of The Intellectual Property and Enterprise Court (ChD) daily cause list (through the upload of excel files in CaTH) which would require the creation of validation schema and style guides.

**AS A** Service

**I WANT** to create the validation schema and style guides for Intellectual Property and Enterprise Court (ChD) daily cause list

**SO THAT** the Intellectual Property and Enterprise Court (ChD) daily cause list can be published in CaTH

**ACCEPTANCE CRITERIA**
- The Intellectual Property and Enterprise Court (ChD) daily cause list is created under the Business and Property Courts Rolls Building in CaTH
- The Intellectual Property and Enterprise Court (ChD) daily cause list is linked to the 'Civil' jurisdiction and 'Royal Courts of Justice Group' region
- The following data fields are created in the listed order in the validation schema for the Intellectual Property and Enterprise Court (ChD) daily cause list (Judge, Time, Venue, Type, Case Number, Case Name and Additional Information)
- The Intellectual Property and Enterprise Court (ChD) daily cause list is published through the Excel upload route in CaTH. It is uploaded as an excel template
- A PDF and Excel downloadable version of each hearing list is created.
- The validation schema and style guide for the Intellectual Property and Enterprise Court (ChD) daily cause list is created.
- The style guide should follow the structure in https://pip-frontend.staging.platform.hmcts.net/intellectual-property-and-enterprise-court-daily-cause-list?artefactId=ee796dd9-41cd-439c-a2f9-0c278edb83dd
- The Json file should follow the below format:

```json
[
   {
      "judge":"Judge A",
      "time":"9am",
      "venue":"Venue A",
      "type":"Type A",
      "caseNumber":"12345",
      "caseName":"Case name A",
      "additionalInformation":"This is additional information"
   },
   {
      "judge":"Judge B",
      "time":"10:30pm",
      "venue":"Venue B",
      "type":"Type B",
      "caseNumber":"12346",
      "caseName":"Case name B",
      "additionalInformation":"This is another additional information"
   }
]
```

## Comments

### Comment by OgechiOkelu
`@SPEC`

### Comment by hmctsclaudecode
A prior automated planning run posted a detailed technical specification. Key points captured and reconciled into this plan:
- Non-strategic list type published via the Excel upload journey (same pattern as RCJ Standard Daily Cause Lists / Administrative Court lists).
- **Field names differ from RCJ**: this list uses `type` (RCJ uses `hearingType`) and `caseName` (RCJ uses `caseDetails`). Do **not** reuse `RCJ_EXCEL_CONFIG` / the RCJ JSON schema verbatim — a dedicated schema, Excel config, model and renderer are required.
- **Column order** (issue-defined): Judge, Time, Venue, Type, Case Number, Case Name, Additional Information.
- Proposed stable list type name constant: `INTELLECTUAL_PROPERTY_ENTERPRISE_COURT_DAILY_CAUSE_LIST`.
- Open questions raised: exact seeded list-type name string, `subJurisdictionIds` for Business and Property Courts Rolls Building under Civil / Royal Courts of Justice Group, court address & IPEC media-contact block, Welsh translations, default sensitivity, and time-format confirmation.
