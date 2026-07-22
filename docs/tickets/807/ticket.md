# #807: Intellectual Property and Enterprise Court (ChD) daily cause list

**State:** OPEN
**Assignees:**
**Author:** OgechiOkelu
**Labels:**
**Created:** (see GitHub)
**Updated:** 2026-07-22

## Description

**PROBLEM STATEMENT**

This ticket covers the non-strategic publishing of The Intellectual Property and Enterprise Court (ChD) daily cause list (through the upload of excel files in CaTH) which would require the creation of validation schema and style guides.

**AS A** Service

**I WANT** to create the validation schema and style guides for Intellectual Property and Enterprise Court (ChD) daily cause list

**SO THAT** the Intellectual Property and Enterprise Court (ChD) daily cause list can be published in CaTH

**ACCEPTANCE CRITERIA**
- The Intellectual Property and Enterprise Court (ChD) daily cause list is created under the Business and Property Courts Rolls Building in CaTH
- The Intellectual Property and Enterprise Court (ChD) daily cause list is linked to the 'Civil' jurisdiction and 'Royal Courts of Justice Group' region
- The following data fields are created in the listed order in the validation schema for the Intellectual Property and Enterprise Court (ChD) daily cause list (Judge, Time, Venue Type, Case Number, Case Name and Additional Information)
- The Intellectual Property and Enterprise Court (ChD) daily cause list is published through the Excel upload route in CaTH. It is uploaded as an excel template
- A PDF and Excel downloadable version of each hearing list is created.
- The validation schema and style guide for the Intellectual Property and Enterprise Court (ChD) daily cause list is created.
- The style guide should follow the structure in https://pip-frontend.staging.platform.hmcts.net/intellectual-property-and-enterprise-court-daily-cause-list?artefactId=ee796dd9-41cd-439c-a2f9-0c278edb83dd
- The Json file should follow the below format

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

### Comment by OgechiOkelu on 2026-07-22T13:10:06Z

@spec

### Comment by hmctsclaudecode on 2026-07-22T13:14:07Z

A detailed technical specification was auto-generated. Key points:

- Flat, single-table list. Closest existing implementations are the RCJ-family single-table lists (`court-of-appeal-civil-daily-cause-list`, `rcj-standard-daily-cause-list`, `london-administrative-court-daily-cause-list`). Reuse that architecture.
- **Field-name mismatch:** AC lists "Venue Type" as one field, but the JSON has two separate fields — `venue` and `type`. Spec treats them as two columns (Venue, Type) matching the JSON.
- New module: `libs/list-types/intellectual-property-enterprise-court-daily-cause-list/`.
- Registration touch points: `list-type-data.ts` (hierarchy entry, Civil jurisdiction, region 11), `PDF_GENERATOR_REGISTRY` in `libs/publication/src/processing/service.ts`, `registerConverterByName`, root `tsconfig.json` path alias, web app + vite config.
- JSON schema root `type: "array"`; required: judge, time, venue, type, caseNumber, caseName; `additionalInformation` optional. Free-text no-HTML pattern; simple time pattern.
- Mandatory validator wrapper + tests (CI guard enforced).
- PDF + Excel downloads, Welsh support, WCAG 2.2 AA.

**Open questions raised in spec:**
1. Field naming — two columns (Venue, Type) vs one combined "Venue Type"?
2. Sub-jurisdiction wiring — seed new Business and Property Courts / IPEC sub-jurisdiction or reuse existing Civil sub-jurisdiction id? Region = Royal Courts of Justice Group (regionId 11).
3. URL slug — match reference `intellectual-property-and-enterprise-court-daily-cause-list` (with "and") or shorter form?
4. Canonical `list_type` name constant (assumed `INTELLECTUAL_PROPERTY_ENTERPRISE_COURT_DAILY_CAUSE_LIST`).
5. Time format — simple pattern only (9am, 10:30pm), no 24-hour?
6. Important-information / location copy — lift exact text from reference page.
7. Excel template — single worksheet only (no second tab)?
8. Provenance — assumed `CFT_IDAM`?

### Comment by OgechiOkelu on 2026-07-22T13:25:27Z

@plan
</content>
</invoke>
