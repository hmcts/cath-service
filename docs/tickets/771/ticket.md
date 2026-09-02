# #771: Style Guide: Implement Magistrates Standard List

**State:** OPEN
**Assignees:** KianKwa
**Author:** junaidiqbalmoj
**Labels:** (none)
**Created:** 2026-06-25T13:48:43Z
**Updated:** 2026-06-30T08:21:04Z

## Description

## User Story

As a user, I want to view the Magistrates Standard List in an accessible and well-formatted style, so that I can see scheduled hearings with all relevant case details including reporting restrictions.

> See issue #596 for the magistrates-public-list implementation.

## Background

`magistrates-standard-list` has its own separate JSON schema. It follows the same module pattern as the existing `civil-and-family-daily-cause-list` implementation. All magistrates lists include reporting restriction information.

## Acceptance Criteria

### Module structure
- [ ] New lib created: `libs/list-types/magistrates-standard-list/`
- [ ] Lib contains:
  - `src/models/types.ts`, `src/validation/json-validator.ts`, `src/schemas/magistrates-standard-list.json`
  - `src/rendering/renderer.ts`, `renderer.test.ts`
  - `src/pages/index.ts`, `index.test.ts`, `en.ts`, `cy.ts`, `magistrates-standard-list.njk`
  - `src/pdf/pdf-generator.ts`, `pdf-template.njk`, `pdf-generator.test.ts`
  - `src/index.ts`, `src/config.ts`, `package.json`, `tsconfig.json`

### Page content (EN)

| Key | English |
|-----|---------|
| title | Magistrates Standard List |
| listDate | List for date: |
| lastUpdated | Last updated: |
| publishedAt | Published at: |
| venueAddress | Venue address |
| openJusticeTitle | Open justice |
| dataSource | Data source |
| defendant | Defendant |
| caseNumber | Case number |
| offence | Offence |
| plea | Plea |
| results | Results |
| resultsProviso | Results proviso |
| noHearings | No hearings today |
| linkToTop | Back to top |

### Page content (CY)

| Key | Welsh |
|-----|-------|
| title | Rhestr Safonol Llys Ynadon |
| listDate | Rhestr ar gyfer dyddiad: |
| lastUpdated | Diweddarwyd ddiwethaf: |
| publishedAt | Cyhoeddwyd am: |
| venueAddress | Cyfeiriad y lleoliad |
| openJusticeTitle | Cyfiawnder agored |
| dataSource | Ffynhonnell data |
| defendant | Diffynnydd |
| caseNumber | Rhif yr achos |
| offence | Trosedd |
| plea | Ple |
| results | Canlyniadau |
| resultsProviso | Darpariaeth canlyniadau |
| noHearings | Dim gwrandawiadau heddiw |
| linkToTop | Yn ôl i'r brig |

### Hearings table columns

| Column | EN | CY |
|--------|----|----|
| Time | Time | Amser |
| Defendant name | Defendant name | Enw'r diffynnydd |
| Case number | Case number | Rhif yr achos |
| Offence | Offence | Trosedd |
| Plea | Plea | Ple |
| Results | Results | Canlyniadau |

### Reporting restriction content (EN)

| Key | English |
|-----|---------|
| restrictionInformationHeading | Restriction information |
| restrictionInformationP1 | In these cases, certain information may be subject to reporting restrictions. Such restrictions will be noted in the relevant entries. The Press and public should note the following before publishing any information about this matter: |
| restrictionInformationBoldText | Further information about reporting restrictions may be obtained from the Clerk of the Court before any publication is made. |
| restrictionInformationP2 | Section 49 of the Children and Young Persons Act 1933 provides that in any proceedings against a young person, the court shall not publish: |
| restrictionInformationP3 | Section 39 of the Children and Young Persons Act 1933 gives the court the power to impose restrictions preventing any reporting of cases involving children. If such an order has been made, the media should not publish: |
| restrictionInformationP4 | In cases where a defendant is found unfit to plead, Section 4A of the Criminal Procedure (Insanity) Act 1964 gives courts the power to impose restrictions. |
| restrictionBulletPoint1 | the name, address or school of the young person |
| restrictionBulletPoint2 | any particulars calculated to lead to the identification of the young person |

### Reporting restriction content (CY)

| Key | Welsh |
|-----|-------|
| restrictionInformationHeading | Gwybodaeth cyfyngiad |
| restrictionInformationP1 | Yn yr achosion hyn, efallai y bydd rhai gwybodaeth yn destun cyfyngiadau adrodd. Nodir cyfyngiadau o'r fath yn y cofnodion perthnasol. Dylai'r Wasg a'r cyhoedd nodi'r canlynol cyn cyhoeddi unrhyw wybodaeth am y mater hwn: |
| restrictionInformationBoldText | Gellir cael rhagor o wybodaeth am gyfyngiadau adrodd gan Glerc y Llys cyn gwneud unrhyw gyhoeddiad. |
| restrictionInformationP2 | Mae adran 49 o Ddeddf Plant a Phobl Ifanc 1933 yn darparu, mewn unrhyw achos yn erbyn person ifanc, na chaiff y llys gyhoeddi: |
| restrictionInformationP3 | Mae adran 39 o Ddeddf Plant a Phobl Ifanc 1933 yn rhoi pŵer i'r llys osod cyfyngiadau sy'n atal unrhyw adroddiad ar achosion yn ymwneud â phlant. Os gwnaed gorchymyn o'r fath, ni ddylai'r cyfryngau gyhoeddi: |
| restrictionInformationP4 | Mewn achosion lle canfyddir bod diffynnydd yn anghymwys i bledio, mae Adran 4A o Ddeddf Gweithdrefn Droseddol (Annhwylldeb) 1964 yn rhoi pŵer i lysoedd osod cyfyngiadau. |
| restrictionBulletPoint1 | enw, cyfeiriad neu ysgol y person ifanc |
| restrictionBulletPoint2 | unrhyw fanylion a allai arwain at adnabod y person ifanc |

### Pages
- [ ] Page accessible at: `GET /magistrates-standard-list?artefactId=`
- [ ] Displays venue name, address, content date, last updated timestamp
- [ ] Hearings table shows correct columns (as defined above)
- [ ] Reporting restriction section displayed
- [ ] Open Justice collapsible section present
- [ ] Case search input present
- [ ] Data source attribution shown at bottom

### Validation and access control
- [ ] Returns 400 if `artefactId` is missing
- [ ] Returns 404 if artefact not found
- [ ] Returns 403 if user does not have access
- [ ] Returns 400 if JSON fails schema validation

### PDF generation
- [ ] PDF generated matching the HTML view structure
- [ ] PDF includes reporting restriction section
- [ ] PDF saved to storage correctly

### Welsh language
- [ ] All page content available in Welsh via `?lng=cy`
- [ ] Reporting restriction content translated in Welsh
- [ ] PDF generated in correct language based on locale

### Registration
- [ ] Module registered in `apps/web/src/app.ts`
- [ ] Path alias added to root `tsconfig.json`
- [ ] Package added as dependency in `apps/web/package.json`

### Tests
- [ ] Unit tests pass
- [ ] `yarn test` passes across the workspace

## TODO

- [ ] Add email summary (`src/email-summary/summary-builder.ts`) once email summary requirements are confirmed

## Technical Notes

- Schema source from pip-data-management `src/main/resources/schemas/magistrates_standard_list.json`
- Follow the `civil-and-family-daily-cause-list` module as the reference implementation
- Includes the same reporting restriction section in both HTML and PDF output

## Comments

No comments on this issue.
