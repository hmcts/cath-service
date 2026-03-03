# #429: Tribunal non-strategic publishing - GRC, WPAFCC & UTIAC

**State:** OPEN
**Assignees:** None
**Author:** OgechiOkelu
**Labels:** enhancement, priority:3-medium, type:story
**Created:** 2026-03-03T18:12:03Z
**Updated:** 2026-03-03T18:20:27Z

## Description

**PROBLEM STATEMENT**
This ticket is raised for the creation of the validation schema, style guide, PDF and email summary needed for the following tribunals to publish in CaTH, through the non-strategic publishing route; General Regulatory Chamber, First-tier Tribunal (War Pensions and Armed Forces Compensation) Chamber, Upper Tribunal (Immigration and Asylum) Chamber - Judicial Review and Upper Tribunal (Immigration and Asylum) Chamber Statutory Appeals.


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
- The hearing lists for the General Regulatory Chamber will be published weekly, and the full list name shall be displayed as follows in the front-end summary of publications; General Regulatory Chamber Weekly Hearing list. On the upload form, the lists will be displayed as GRC Weekly Hearing List
- The hearing lists for the First-tier Tribunal (War Pensions and Armed Forces Compensation) will be published weekly, and the full list name shall be displayed as follows in the front-end summary of publications; First-tier Tribunal (War Pensions and Armed Forces Compensation) Weekly Hearing list while on the upload form, the names displayed is WPAFCC Weekly Hearing list
- The hearing list for the Upper Tribunal (Immigration and Asylum) Chamber Statutory Appeals will be published daily, and the full list name shall be displayed as follows in the front-end summary of publications; Upper Tribunal (Immigration and Asylum) Chamber Statutory Appeal Daily Hearing List while on the upload form, the names displayed is UTIAC Statutory Appeal Daily Hearing List
- The hearing lists for the Upper Tribunal (Immigration and Asylum) Chamber - Judicial Review will be published Daily and the full list names which shall be displayed in the front-end summary of publications are as follows; Upper Tribunal (Immigration and Asylum) Chamber - Judicial Review: London Daily Hearing List and Upper Tribunal (Immigration and Asylum) Chamber - Judicial Review: Leeds Daily Hearing List while on the upload form, the names displayed are UTIAC (JR) - Leeds Daily Hearing List and UTIAC (JR) - London Daily Hearing List
- The 'Region' for the General Regulatory Chamber Weekly Hearing list and First-tier Tribunal (War Pensions, Armed Forces Compensation) Weekly Hearing list and Upper Tribunal (Immigration and Asylum) Chamber Statutory Daily Hearing List is 'National', while the Upper Tribunal (Immigration and Asylum) Chamber - Judicial Review: London Daily hearing List is 'London' and the Upper Tribunal (Immigration and Asylum) Chamber - Judicial Review: Leeds Daily Hearing List is 'Yorkshire'

**Opening statements (important information accordion):**

GRC Weekly Hearing List:
> Parties and representatives will be informed about arrangements for hearing cases remotely. Any other person interested in joining the hearing remotely should email GRC@justice.gov.uk so that arrangements can be made. If the case is to be heard in private or is subject to a reporting restriction, this will be notified.
> If you join a hearing you must not make any personal or private recording or publish any part of this hearing, including court communications. It is a criminal offence to do so.
> [What to expect when joining a telephone or video hearing](https://www.gov.uk/guidance/what-to-expect-when-joining-a-telephone-or-video-hearing)
> [Observe a court or tribunal hearing as a journalist, researcher or member of the public](https://www.gov.uk/guidance/observe-a-court-or-tribunal-hearing)

WPAFCC Weekly Hearing List:
> Members of the public wishing to observe a hearing or representatives of the media may, on their request, join any telephone or video hearing remotely while they are taking place by sending an email in advance to the tribunal at armedforces.listing@justice.gov.uk with the following details in the subject line "[OBSERVER/MEDIA] REQUEST – [case reference] – [hearing date]" and appropriate arrangements will be made to allow access where reasonably practicable.
> [Observe a court or tribunal hearing as a journalist, researcher or member of the public](https://www.gov.uk/guidance/observe-a-court-or-tribunal-hearing)

UTIAC JR London & Leeds Daily Hearing Lists (shared):
> The following list is subject to change until 4:30pm. Any alterations after this time will be telephoned or emailed direct to the parties or their legal representatives.
> [Observe a court or tribunal hearing as a journalist, researcher or member of the public](https://www.gov.uk/guidance/observe-a-court-or-tribunal-hearing)

UTIAC Statutory Appeal Daily Hearing List:
> We update this list by 5pm for the following day. If there are late changes to the list, we'll update no later than 9am on the day of the hearing.
> For details on attending a UTIAC remote hearing, please email uppertribunallistingteam@justice.gov.uk.
> [Observe a court or tribunal hearing as a journalist, researcher or member of the public](https://www.gov.uk/guidance/observe-a-court-or-tribunal-hearing)

**Field columns per list type:**
- GRC Weekly & WPAFCC Weekly: Date, Hearing Time, Case Reference Number, Case Name, Judge(s), Member(s), Mode of Hearing, Venue, Additional Information
- UTIAC JR Leeds Daily: Venue, Judge(s), Hearing Time, Case Reference Number, Case Title, Hearing Type, Additional Information
- UTIAC JR London Daily: Hearing Time, Case Title, Representative, Case Reference Number, Judge(s), Hearing Type, Location, Additional Information
- UTIAC SA Daily: Hearing Time, Appellant, Representative, Appeal Reference Number, Judge(s), Hearing Type, Location, Additional Information

The text 'Observe a court or tribunal hearing as a journalist, researcher or member of the public' masks the URL https://www.gov.uk/guidance/observe-a-court-or-tribunal-hearing

## Comments

### Comment by hmctsclaudecode on 2026-03-03T18:18:26Z

## 1. User Story

**As a** Service
**I want to** create the validation schema, style guide, PDF & email summary for five tribunal hearing lists published through the non-strategic publishing route
**So that** the General Regulatory Chamber, First-tier Tribunal (War Pensions and Armed Forces Compensation), and Upper Tribunal (Immigration and Asylum) Chamber hearing lists can be published in CaTH

## 2. Background

CaTH supports a non-strategic publishing route for tribunals that upload hearing lists via Excel file. This ticket adds five new list types across four tribunals, following the pattern of `libs/list-types/care-standards-tribunal-weekly-hearing-list/`.

**Five new list types:**

| Upload form name | Front-end summary name | Frequency | Region | ID |
|---|---|---|---|---|
| GRC Weekly Hearing List | General Regulatory Chamber Weekly Hearing List | Weekly | National | 24 |
| WPAFCC Weekly Hearing List | First-tier Tribunal (War Pensions and Armed Forces Compensation) Weekly Hearing List | Weekly | National | 25 |
| UTIAC Statutory Appeal Daily Hearing List | Upper Tribunal (Immigration and Asylum) Chamber Statutory Appeal Daily Hearing List | Daily | National | 26 |
| UTIAC (JR) - London Daily Hearing List | Upper Tribunal (Immigration and Asylum) Chamber - Judicial Review: London Daily Hearing List | Daily | London | 27 |
| UTIAC (JR) - Leeds Daily Hearing List | Upper Tribunal (Immigration and Asylum) Chamber - Judicial Review: Leeds Daily Hearing List | Daily | Yorkshire | 28 |

## 14. Assumptions & Open Questions

* **Assumption:** The fourth opening statement ("We update this list by 5pm for the following day...") is intended for UTIAC Statutory Appeal Daily Hearing List. Confirm with tribunal team.
* **Open question:** What user group access level (Public / Private / Restricted) should be assigned to each of the five new list types?
* **Open question:** For the UTIAC SA and UTIAC JR daily lists, the `date` field is derived from the artefact `displayFrom`. Confirm whether email summary Date should be artefact display date or a date column in the spreadsheet.
* **Open question:** Should list manipulation in the style guide refer only to the existing `case-search-input` JS behaviour, or is additional sorting/grouping required?

### Comment by OgechiOkelu on 2026-03-03T18:20:27Z

@plan
