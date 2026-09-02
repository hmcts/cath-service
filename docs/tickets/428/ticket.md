# #428: Style Guide: Tribunal non-strategic publishing - SIAC, POAC, PAAC, FFT TC, FFT LRT & FFT RPT

**State:** OPEN
**Assignees:** junaidiqbalmoj
**Author:** OgechiOkelu
**Labels:** enhancement, priority:3-medium, type:story, ai-sizing
**Created:** 2026-03-03T13:36:57Z
**Updated:** 2026-06-18T08:06:25Z

## Description

**PROBLEM STATEMENT**
This ticket is raised for the creation of the validation schema, style guide, PDF and email summary needed for the following tribunals to publish in CaTH, through the non-strategic publishing route; Special Immigration Appeals Commission, Proscribed Organisations Appeal Commission, Pathogens Access Appeal Commission, First-tier Tribunal (Tax Chamber), First-tier Tribunal (Lands Registration Tribunal and First-tier Tribunal (Property Chamber) (Residential Property).

**AS A** Service
**I WANT** to create the validation schema, style guide, PDF & email summary for tribunal hearing lists to be published through the non-strategic publishing route
**SO THAT** the tribunal hearing lists can be published in CaTH

**ACCEPTANCE CRITERIA**
- Validation schemas are created for each hearing list from the tribunals listed above
- Error handling is put in place for the validation schema
- Valid publications are saved via the current method
- List types are classified and user groups are decided based on authorised access to the list types (Public, Private, etc)
- A new pdf template is created for the downloadable version of each tribunal hearing list
- All the tribunals adopt a unified email summary format similar to the existing email summary
- The fields to be published for the email summary for all the lists are the Date, Time and Case Reference Number
- A new style guide is created for each hearing list of the above-mentioned tribunals
- List manipulation is created for the style guide(s)
- The hearing lists for the Special Immigration Appeals Commission, Proscribed Organisations Appeal Commission and the Pathogens Access Appeal Commission will be published weekly, and the full list name shall be displayed as follows in the front-end summary of publications; Special Immigration Appeals Commission Weekly Hearing List, Proscribed Organisations Appeal Commission Weekly Hearing List and Pathogens Access Appeal Commission Weekly Hearing List respectively
- On the upload form, the lists will be displayed as SIAC Weekly Hearing List, POAC Weekly Hearing List and PACC Weekly Hearing List
- The 'Region' for all 3 lists above is 'London'
- The opening statement displayed within the important information accordion for the Special Immigration Appeals Commission, Proscribed Organisations Appeal Commission and Pathogens Access Appeal Commission is as follows:
  - The tribunal sometimes uses reference numbers or initials to protect the anonymity of those involved in the appeal.
  - All hearings take place at Field House, 15-25 Bream's Buildings, London EC4A 1DZ.
  - [Find out what to expect coming to a court or tribunal](https://www.gov.uk/guidance/what-to-expect-coming-to-a-court-or-tribunal)
- The fields to be displayed within the Special Immigration Appeals Commission Weekly Hearing List, Proscribed Organisations Appeal Commission Weekly Hearing List and Pathogens Access Appeal Commission Weekly Hearing List are Date, Time, Appellant, Case Reference Number, Hearing Type, Courtroom and Additional information
- The hearing lists for the First-tier Tribunal (Tax Chamber) will be published weekly, and the full list name shall be displayed as follows in the front-end summary of publications; First-tier Tribunal (Tax Chamber) Weekly Hearing List while on the upload form, the names displayed is FFT Tax Weekly Hearing List
- The 'Region' for First-tier Tribunal (Tax Chamber) Weekly Hearing List is 'National'
- The opening statement displayed within the important information accordion for the First-tier Tribunal (Tax Chamber) Weekly Hearing List is as follows:
  - Open justice is a fundamental principle of our justice system. You can attend a public hearing in person, or you can apply for permission to observe remotely.
  - Members of the public and the media can ask to join any telephone or video hearing remotely. Contact the Tribunal before the hearing to ask for permission to attend by emailing taxappeals@justice.gov.uk.
  - The subject line for the email should contain the following wording: "HEARING ACCESS REQUEST – [Appellant's name] v [Respondent's name, for example HMRC] – [case reference] – [hearing date]". You will be sent instructions on how to join the hearing.
  - The judge may refuse a request and can also decide a hearing must be held in private, in such cases you will not be able to attend.
  - [Observe a court or tribunal hearing as a journalist, researcher or member of the public](https://www.gov.uk/guidance/observe-a-court-or-tribunal-hearing)
- The fields to be displayed within the First-tier Tribunal (Tax Chamber) Weekly Hearing List are Date, Hearing Time, Case Name, Case Reference Number, Judge(s), Member(s) and Venue/Platform
- The hearing list for the First-tier Tribunal (Lands Registration Tribunal) will be published weekly, and the full list name shall be displayed as follows in the front-end summary of publications; First-tier Tribunal (Lands Registration Tribunal) Weekly Hearing list while on the upload form, the names displayed is FFT (LR) Weekly Hearing List
- The 'Region' for First-tier Tribunal (Lands Registration Tribunal) Weekly Hearing List is 'National'
- The fields to be displayed within the First-tier Tribunal (Lands Registration Tribunal) Weekly Hearing List are Date, Hearing Time, Case Name, Case Reference Number, Judge, and Venue/Platform
- The opening statement displayed within the important information accordion for the First-tier Tribunal (Lands Registration Tribunal) Weekly Hearing List is as follows:
  - Members of the public wishing to observe a hearing or representatives of the media may, on their request, join any telephone or video hearing remotely while they are taking place by sending an email in advance to the tribunal at [insert office email] with the following details in the subject line "[OBSERVER/MEDIA] REQUEST – [case reference] – [hearing date] (need to include any other information required by the tribunal)" and appropriate arrangements will be made to allow access where reasonably practicable
  - [Observe a court or tribunal hearing as a journalist, researcher or member of the public](https://www.gov.uk/guidance/observe-a-court-or-tribunal-hearing)
- The hearing list for the First-tier Tribunal (Residential and Property Tribunal) will be published weekly and as different lists for the different regions. The full list names are:
  - First-tier Tribunal (Residential and Property Tribunal) Eastern Region Weekly Hearing list
  - First-tier Tribunal (Residential and Property Tribunal) London Region Weekly Hearing list
  - First-tier Tribunal (Residential and Property Tribunal) Midlands Region Weekly Hearing list
  - First-tier Tribunal (Residential and Property Tribunal) Northern Region Weekly Hearing list
  - First-tier Tribunal (Residential and Property Tribunal) Southern Region Weekly Hearing list
- The regions for the First-tier Tribunal (Residential and Property Tribunal) are Eastern, London, Midlands, Northern and Southern regions
- On the upload form, the names displayed are RPT Eastern Weekly Hearing List, RPT London Weekly Hearing List, RPT Midlands Weekly Hearing List, RPT Northern Weekly Hearing List and RPT Southern Weekly Hearing List
- The opening statement displayed within the important information accordion for the First-tier Tribunal (Residential and Property Tribunal) Weekly Hearing List is as follows:
  - Members of the public wishing to observe a hearing or representatives of the media may, on their request, join any telephone or video hearing remotely while they are taking place by sending an email in advance to the tribunal at [insert office email] with the following details in the subject line "[OBSERVER/MEDIA] REQUEST – [case reference] – [hearing date]" and appropriate arrangements will be made to allow access where reasonably practicable.
  - [Observe a court or tribunal hearing as a journalist, researcher or member of the public](https://www.gov.uk/guidance/observe-a-court-or-tribunal-hearing)
- The fields to be displayed within the First-tier Tribunal (Residential and Property Tribunal) Weekly Hearing Lists are Date, Time, Venue, Case Type, Case Reference Number, Judge(s), Member(s), Hearing Method and Additional Information

## Comments

### Comment by OgechiOkelu on 2026-03-03T13:37:32Z
@SPEC new-feature.md

### Comment by hmctsclaudecode on 2026-03-03T13:45:41Z
(Full technical specification — see plan.md for details)

New list type IDs (24–33):

| ID | Registry name | Full front-end display name | Upload form label | Region |
|----|---------------|----------------------------|-------------------|--------|
| 24 | `SIAC_WEEKLY_HEARING_LIST` | Special Immigration Appeals Commission Weekly Hearing List | SIAC Weekly Hearing List | London |
| 25 | `POAC_WEEKLY_HEARING_LIST` | Proscribed Organisations Appeal Commission Weekly Hearing List | POAC Weekly Hearing List | London |
| 26 | `PAAC_WEEKLY_HEARING_LIST` | Pathogens Access Appeal Commission Weekly Hearing List | PACC Weekly Hearing List | London |
| 27 | `FTT_TAX_CHAMBER_WEEKLY_HEARING_LIST` | First-tier Tribunal (Tax Chamber) Weekly Hearing List | FFT Tax Weekly Hearing List | National |
| 28 | `FTT_LANDS_REGISTRATION_TRIBUNAL_WEEKLY_HEARING_LIST` | First-tier Tribunal (Lands Registration Tribunal) Weekly Hearing List | FFT (LR) Weekly Hearing List | National |
| 29 | `FTT_RPT_EASTERN_WEEKLY_HEARING_LIST` | First-tier Tribunal (Residential and Property Tribunal) Eastern Region Weekly Hearing List | RPT Eastern Weekly Hearing List | Eastern |
| 30 | `FTT_RPT_LONDON_WEEKLY_HEARING_LIST` | First-tier Tribunal (Residential and Property Tribunal) London Region Weekly Hearing List | RPT London Weekly Hearing List | London |
| 31 | `FTT_RPT_MIDLANDS_WEEKLY_HEARING_LIST` | First-tier Tribunal (Residential and Property Tribunal) Midlands Region Weekly Hearing List | RPT Midlands Weekly Hearing List | Midlands |
| 32 | `FTT_RPT_NORTHERN_WEEKLY_HEARING_LIST` | First-tier Tribunal (Residential and Property Tribunal) Northern Region Weekly Hearing List | RPT Northern Weekly Hearing List | Northern |
| 33 | `FTT_RPT_SOUTHERN_WEEKLY_HEARING_LIST` | First-tier Tribunal (Residential and Property Tribunal) Southern Region Weekly Hearing List | RPT Southern Weekly Hearing List | Southern |

### Comment by OgechiOkelu on 2026-03-03T13:47:12Z
@plan

### Comment by hmctsclaudecode on 2026-03-03T13:58:12Z
## Clarifying Questions

1. **PAAC upload label — typo?** The issue specifies "PACC Weekly Hearing List" as the upload form label (double-C), but the tribunal abbreviation is PAAC. Is "PACC" intentional?
2. **FTT LRT office email** — the important information accordion text contains `[insert office email]` as a placeholder.
3. **FTT RPT office email(s)** — similarly, the FTT RPT accordion text contains `[insert office email]`. Does each region have a separate email address?
4. **FTT RPT display names (IDs 30–33)** — should all five RPT lists use the same full `First-tier Tribunal (Residential and Property Tribunal) [Region] Region Weekly Hearing List` pattern?
5. **Welsh translations** — no Welsh strings are supplied for the ten new list types. Should cy.ts files be stubs with English text as placeholders?
6. **SIAC / POAC / PAAC access classification** — what is the intended sensitivity level?
7. **FTT RPT `caseType`** — free text or enum?
8. **PDF generation scope** — is PDF generation in scope for this ticket or deferred?
