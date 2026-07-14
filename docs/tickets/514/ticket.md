# #514: Style guide: Magistrates Adult Court List (Crime Portal / Libra)

**State:** OPEN
**Assignees:** KianKwa
**Author:** OgechiOkelu
**Labels:** (none)
**Created:** 2026-07-02
**Updated:** 2026-07-02

## Description

## PROBLEM STATEMENT

This ticket is raised for the creation of the style guide, downloadable PDF and email summary of the **Magistrates Adult Court List - Daily** and **Magistrates Adult Court List - Future** from Crime Portal / Libra, which are to be published in CaTH.

## USER STORY

**AS A** Service
**I WANT** to create the style guide, PDF & email summary for the Magistrates Adult Court List - Daily and Magistrates Adult Court List - Future
**SO THAT** the hearing lists can be published in CaTH

## ACCEPTANCE CRITERIA

- The `MAGISTRATES_ADULT_COURT_LIST_DAILY` and `MAGISTRATES_ADULT_COURT_LIST_FUTURE` list types are created in CaTH backend for publishing in CaTH from Crime Portal / Libra
- The names to be displayed in CaTH frontend are:
  - **Magistrates Adult Court List - Daily**
  - **Magistrates Adult Court List - Future**
- The data fields to be displayed are: Block Start, Defendant Name, Date of Birth, Address, Age, Informant, Case Number, Offence Code, Offence Title and Offence Summary
- The validation schema, style guide, PDF & email summary are created for both list types
- Subscription fulfilment process is implemented for each list
- A new PDF template is created for the downloadable version of each list
- The Email notification summary will display: **Defendant Name**, **Informant**, **Case Number** and **Offence Title**
- List manipulation is created for both style guides
- The JSON file for the validation schema follows the structure in: https://github.com/hmcts/pip-data-management/blob/master/src/main/resources/schemas/magistrates_adult_court_list.json

## WELSH TRANSLATIONS

| English | Welsh |
|---|---|
| Magistrates Adult Court List - Daily | Rhestr Achosion Dyddiol Cyhoeddus y Llys Ynadon – Oedolion |
| Magistrates Adult Court List - Future | Rhestr Llys Ynadon Oedolion – Dyfodol |
| Defendant Name | Enw'r Diffynnydd |
| Case Number | Rhif yr Achos |
| Sitting at | Yn eistedd yn |
| Session start | Amser Cychwyn y Sesiwn |
| Listing time | Amser rhestru |

## REPORTING RESTRICTIONS (English)

> Restrictions on publishing or writing about these cases
>
> You must check if any reporting restrictions apply before publishing details on any of the cases listed here either in writing, in a broadcast or by internet, including social media.
>
> You'll be in contempt of court if you publish any information which is protected by a reporting restriction. You could get a fine, prison sentence or both.
>
> Specific restrictions ordered by the court will be mentioned on the cases listed here.
>
> However, restrictions are not always listed. Some apply automatically. For example, anonymity given to the victims of certain sexual offences.
>
> To find out which reporting restrictions apply on a specific case, contact:
> - the court directly
> - HM Courts and Tribunals Service on 0330 808 4407
>
> You can also read the reporting restrictions guide

## REPORTING RESTRICTIONS (Welsh)

> Cyfyngiadau ar gyhoeddi neu ysgrifennu am yr achosion hyn.
>
> Rhaid i chi wirio a oes unrhyw gyfyngiadau riportio yn berthnasol cyn cyhoeddi manylion am unrhyw un o'r achosion a restrir yma, naill ai'n ysgrifenedig, mewn darllediad neu ar y rhyngrwyd, gan gynnwys y cyfryngau cymdeithasol.
>
> Byddwch yn euog o ddirmyg llys os byddwch yn cyhoeddi unrhyw wybodaeth sydd wedi'i diogelu gan gyfyngiad riportio. Gallwch gael dirwy, eich dedfrydu i garchar, neu'r ddau.
>
> Bydd cyfyngiadau penodol a orchmynnir gan y llys yn cael eu crybwyll ar yr achosion a restrir yma.
>
> Fodd bynnag, nid yw'r cyfyngiadau bob amser yn cael eu rhestru. Mae rhai yn berthnasol yn awtomatig. Er enghraifft, anhysbysrwydd a roddir i ddioddefwyr rhai troseddau rhywiol.
>
> I ganfod pa gyfyngiadau riportio sy'n berthnasol ar achos penodol, cysylltwch â'r:
> - llys yn uniongyrchol
> - Gwasanaeth Llysoedd a Thribiwnlysoedd EM ar 0330 808 4407
>
> Gallwch hefyd ddarllen y canllaw ar gyfyngiadau riportio

## REFERENCE MATERIAL

- JSON Schema: https://github.com/hmcts/pip-data-management/blob/master/src/main/resources/schemas/magistrates_adult_court_list.json
- English language file: https://github.com/hmcts/pip-frontend/blob/master/src/main/resources/locales/en/magistrates-adult-court-list.json
- Welsh language file: https://github.com/hmcts/pip-frontend/blob/master/src/main/resources/locales/cy/magistrates-adult-court-list.json
- Data manipulation service: https://github.com/hmcts/pip-frontend/blob/master/src/main/service/listManipulation/MagistratesAdultCourtListService.ts
- NJK view: https://github.com/hmcts/pip-frontend/blob/master/src/main/views/style-guide/magistrates-adult-court-list.njk

## Comments

### Comment by junaidiqbalmoj on 2026-07-02T15:22:40Z

@SPEC

### Comment by hmctsclaudecode on 2026-07-02T15:22:40Z

# Technical Specification: Magistrates Adult Court List (Crime Portal / Libra)

> GitHub Issue #514 — Style Guide: Magistrates Adult Court List (Crime Portal / Libra)

This specification covers the creation of two new CaTH list types sourced from Crime Portal / Libra:

- `MAGISTRATES_ADULT_COURT_LIST_DAILY` — **Magistrates Adult Court List - Daily**
- `MAGISTRATES_ADULT_COURT_LIST_FUTURE` — **Magistrates Adult Court List - Future**

Each requires a validation schema, a rendered web style guide, a downloadable PDF, an email subscription summary, list manipulation (rendering), and subscription fulfilment.

### Seed data entries

```ts
{
  id: 28,
  name: "MAGISTRATES_ADULT_COURT_LIST_DAILY",
  englishFriendlyName: "Magistrates Adult Court List - Daily",
  welshFriendlyName: "Rhestr Achosion Dyddiol Cyhoeddus y Llys Ynadon – Oedolion",
  provenance: "CRIME_IDAM",
  urlPath: "magistrates-adult-court-list-daily",
  isNonStrategic: false,
  defaultSensitivity: "Public",
  subJurisdictionIds: [7]
},
{
  id: 29,
  name: "MAGISTRATES_ADULT_COURT_LIST_FUTURE",
  englishFriendlyName: "Magistrates Adult Court List - Future",
  welshFriendlyName: "Rhestr Llys Ynadon Oedolion – Dyfodol",
  provenance: "CRIME_IDAM",
  urlPath: "magistrates-adult-court-list-future",
  isNonStrategic: false,
  defaultSensitivity: "Public",
  subJurisdictionIds: [7]
}
```
