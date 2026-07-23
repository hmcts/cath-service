# #798: Interim Applications List (ChD) Daily Cause List

**State:** OPEN
**Assignees:** (none)
**Author:** OgechiOkelu
**Labels:** (none)
**Created:** 2026-07-22
**Updated:** 2026-07-23

## Description

**PROBLEM STATEMENT**
This ticket covers the non-strategic publishing of The Interim Applications List (ChD) Daily Cause List (through the upload of excel files in CaTH) which would require the creation of validation schema and style guides.
[interimApplicationsChanceryDivisionDailyCauseList.xlsx](https://github.com/user-attachments/files/30275690/interimApplicationsChanceryDivisionDailyCauseList.xlsx)

**AS A** Service
**I WANT** to create the validation schema and style guides for Interim Applications List (ChD) Daily Cause List
**SO THAT** the Interim Applications List (ChD) Daily Cause List can be published in CaTH

**ACCEPTANCE CRITERIA**
- The Interim Applications List (ChD) Daily Cause List is created under the Business and Property Courts Rolls Building in CaTH and is linked to the 'Civil' jurisdiction and 'Royal Courts of Justice Group' region
- The Interim Applications List (ChD) Daily Cause List is published through the Excel upload route in CaTH. It is uploaded as an excel template and converted to the Json file format suitable for rendering
- The excel template contains 2 tabs. The data fields in the first tab of the excel template are Judge, Time, Venue, Type, Case Number, Case Name and Additional Information. The second tab contains data fields that support the flexibility in updating the judge's name and email address each time the excel file is uploaded in CaTH (this means that the first paragraph of the important information section of the style guide for the Interim Applications list daily cause list is open to editing each time the template is uploaded).
- The validation schema and style guide for the Interim Applications List (ChD) Daily Cause List is created.
- A PDF and excel downloadable version of the hearing list is created.
- The style guide should adopt the format in https://pip-frontend.staging.platform.hmcts.net/interim-applications-chd-daily-cause-list?artefactId=9d1e86f3-1917-42de-8370-7da22773589f
- The Json file should follow the format in https://github.com/hmcts/pip-data-management/blob/master/src/integrationTest/resources/data/non-strategic/interim-applications-chd-daily-cause-list/interimApplicationsChanceryDivisionDailyCauseList.json
- A sample of the excel template is attached

## Comments

### Comment by OgechiOkelu on 2026-07-22T16:05:16Z
@spec

### Comment by hmctsclaudecode on 2026-07-22T16:09:33Z
A detailed technical specification was auto-generated on the issue covering: user story, background, acceptance criteria (Gherkin), user journey flow, wireframe, page specifications (new lib `libs/list-types/interim-applications-chd-daily-cause-list/`), two-tab Excel→JSON conversion via `createMultiSheetConverter`, JSON shape (`hearings[]` + `judgeDetails`), renderer, page controller via `createSimpleListTypeHandler`, registrations (list-type-data, PDF registry, tsconfig/app/vite, location reference data), content (en/cy locales), validation (Excel per-cell + JSON schema draft-07 + mandatory validator/test), error messages, navigation, accessibility, test scenarios, and assumptions/open questions.

This specification is the primary input to the plan below.

### Comment by OgechiOkelu on 2026-07-23T14:58:50Z
@plan
