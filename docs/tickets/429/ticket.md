# #429: Style Guide: Tribunal non-strategic publishing - GRC, WPAFCC & UTIAC

**State:** OPEN
**Assignees:** junaidiqbalmoj
**Author:** OgechiOkelu
**Labels:** enhancement, priority:3-medium, type:story
**Created:** 2026-03-03T18:12:03Z
**Updated:** 2026-06-19T10:37:20Z

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
- The opening statement displayed within the important information accordion for the General Regulatory Chamber Weekly Hearing list is as follows: "Parties and representatives will be informed about arrangements for hearing cases remotely. Any other person interested in joining the hearing remotely should email GRC@justice.gov.uk so that arrangements can be made. If the case is to be heard in private or is subject to a reporting restriction, this will be notified. If you join a hearing you must not make any personal or private recording or publish any part of this hearing, including court communications. It is a criminal offence to do so."
- The opening statement for WPAFCC: "Members of the public wishing to observe a hearing or representatives of the media may, on their request, join any telephone or video hearing remotely while they are taking place by sending an email in advance to the tribunal at armedforces.listing@justice.gov.uk"
- The opening statement for UTIAC JR (London and Leeds): "The following list is subject to change until 4:30pm. Any alterations after this time will be telephoned or emailed direct to the parties or their legal representatives."
- The opening statement for UTIAC SA: "We update this list by 5pm for the following day. If there are late changes to the list, we'll update no later than 9am on the day of the hearing. For details on attending a UTIAC remote hearing, please email uppertribunallistingteam@justice.gov.uk."
- Fields for GRC and WPAFCC: Date, Hearing Time, Case Reference Number, Case Name, Judge(s), Member(s), Mode of Hearing, Venue and Additional information
- Fields for UTIAC JR Leeds: Venue, Judge(s), Hearing Time, Case Reference Number, Case Title, Hearing Type and Additional Information
- Fields for UTIAC JR London: Hearing Time, Case Title, Representative, Case Reference Number, Judge(s), Hearing Type, Location and Additional Information
- Fields for UTIAC SA: Hearing Time, Appellant, Representative, Appeal Reference Number, Judge(s), Hearing Type, Location and Additional Information
- The text 'Observe a court or tribunal hearing as a journalist, researcher or member of the public' masks the https://www.gov.uk/guidance/observe-a-court-or-tribunal-hearing link

## Comments

### Comment by OgechiOkelu on 2026-03-03T18:12:54Z
@SPEC new-feature.md

### Comment by hmctsclaudecode on 2026-03-03T18:18:26Z

## 1. User Story

**As a** Service
**I want to** create the validation schema, style guide, PDF & email summary for five tribunal hearing lists published through the non-strategic publishing route
**So that** the General Regulatory Chamber, First-tier Tribunal (War Pensions and Armed Forces Compensation), and Upper Tribunal (Immigration and Asylum) Chamber hearing lists can be published in CaTH

---

## 2. Background

CaTH (Courts and Tribunals Hearings) supports a non-strategic publishing route for tribunals that upload hearing lists via Excel file through the manual upload admin interface. This ticket adds five new list types across four tribunals, following the same patterns established by existing non-strategic list implementations (e.g., `libs/list-types/care-standards-tribunal-weekly-hearing-list/`).

Each list type requires:
- A new `ListType` entry in `libs/location/src/list-type-data.ts`
- A new library module under `libs/list-types/`
- An Excel-to-JSON converter config registered in the non-strategic list registry
- A JSON validation schema
- A data renderer
- A PDF generator with Nunjucks template
- An email summary builder
- An HTML page controller with English and Welsh content
- Registration in `apps/web/src/app.ts`

**Reference implementations:**
- `libs/list-types/care-standards-tribunal-weekly-hearing-list/` — weekly hearing list pattern
- `libs/list-types/common/src/conversion/rcj-field-configs.ts` — shared field config pattern
- `libs/location/src/list-type-data.ts` — list type registration

**Five new list types:**

| Upload form name | Front-end summary name | Frequency | Region | ID |
|---|---|---|---|---|
| GRC Weekly Hearing List | General Regulatory Chamber Weekly Hearing List | Weekly | National | 24 |
| WPAFCC Weekly Hearing List | First-tier Tribunal (War Pensions and Armed Forces Compensation) Weekly Hearing List | Weekly | National | 25 |
| UTIAC Statutory Appeal Daily Hearing List | Upper Tribunal (Immigration and Asylum) Chamber Statutory Appeal Daily Hearing List | Daily | National | 26 |
| UTIAC (JR) - London Daily Hearing List | Upper Tribunal (Immigration and Asylum) Chamber - Judicial Review: London Daily Hearing List | Daily | London | 27 |
| UTIAC (JR) - Leeds Daily Hearing List | Upper Tribunal (Immigration and Asylum) Chamber - Judicial Review: Leeds Daily Hearing List | Daily | Yorkshire | 28 |

---

## 3. Acceptance Criteria (Structured)

* New list types are registered with IDs 24–28, `isNonStrategic: true`, and `provenance: "MANUAL_UPLOAD"`
* Each list type validates Excel uploads to the correct field structure
* Valid publications are saved
* Invalid uploads surface structured errors (row, field)
* HTML style guide pages render in English and Welsh with correct columns and opening statements
* PDFs are generated with correct template and columns
* Email summaries include Date, Time, and Case/Appeal Reference Number
* Upload form labels match the short names

---

## 4. Page Specifications

### Column sets by list type

**GRC Weekly Hearing List (listTypeId: 24)**

| Column header (EN) | Field name | Required |
|---|---|---|
| Date | `date` | Yes |
| Hearing time | `hearingTime` | Yes |
| Case reference number | `caseReferenceNumber` | Yes |
| Case name | `caseName` | Yes |
| Judge(s) | `judges` | Yes |
| Member(s) | `members` | No |
| Mode of hearing | `modeOfHearing` | Yes |
| Venue | `venue` | Yes |
| Additional information | `additionalInformation` | No |

**WPAFCC Weekly Hearing List (listTypeId: 25)** — identical field structure to GRC Weekly.

**UTIAC Statutory Appeal Daily Hearing List (listTypeId: 26)**

| Column header (EN) | Field name | Required |
|---|---|---|
| Hearing time | `hearingTime` | Yes |
| Appellant | `appellant` | Yes |
| Representative | `representative` | No |
| Appeal reference number | `appealReferenceNumber` | Yes |
| Judge(s) | `judges` | Yes |
| Hearing type | `hearingType` | Yes |
| Location | `location` | Yes |
| Additional information | `additionalInformation` | No |

**UTIAC JR London Daily Hearing List (listTypeId: 27)**

| Column header (EN) | Field name | Required |
|---|---|---|
| Hearing time | `hearingTime` | Yes |
| Case title | `caseTitle` | Yes |
| Representative | `representative` | No |
| Case reference number | `caseReferenceNumber` | Yes |
| Judge(s) | `judges` | Yes |
| Hearing type | `hearingType` | Yes |
| Location | `location` | Yes |
| Additional information | `additionalInformation` | No |

**UTIAC JR Leeds Daily Hearing List (listTypeId: 28)**

| Column header (EN) | Field name | Required |
|---|---|---|
| Venue | `venue` | Yes |
| Judge(s) | `judges` | Yes |
| Hearing time | `hearingTime` | Yes |
| Case reference number | `caseReferenceNumber` | Yes |
| Case title | `caseTitle` | Yes |
| Hearing type | `hearingType` | Yes |
| Additional information | `additionalInformation` | No |

---

## 5. Content

### List type registration names

| listTypeId | `name` | `englishFriendlyName` | `urlPath` |
|---|---|---|---|
| 24 | `GRC_WEEKLY_HEARING_LIST` | `General Regulatory Chamber Weekly Hearing List` | `grc-weekly-hearing-list` |
| 25 | `WPAFCC_WEEKLY_HEARING_LIST` | `First-tier Tribunal (War Pensions and Armed Forces Compensation) Weekly Hearing List` | `wpafcc-weekly-hearing-list` |
| 26 | `UTIAC_STATUTORY_APPEAL_DAILY_HEARING_LIST` | `Upper Tribunal (Immigration and Asylum) Chamber Statutory Appeal Daily Hearing List` | `utiac-statutory-appeal-daily-hearing-list` |
| 27 | `UTIAC_JR_LONDON_DAILY_HEARING_LIST` | `Upper Tribunal (Immigration and Asylum) Chamber - Judicial Review: London Daily Hearing List` | `utiac-jr-london-daily-hearing-list` |
| 28 | `UTIAC_JR_LEEDS_DAILY_HEARING_LIST` | `Upper Tribunal (Immigration and Asylum) Chamber - Judicial Review: Leeds Daily Hearing List` | `utiac-jr-leeds-daily-hearing-list` |

### URLs

| List type | Page URL |
|---|---|
| GRC Weekly Hearing List | `/grc-weekly-hearing-list?artefactId={id}` |
| WPAFCC Weekly Hearing List | `/wpafcc-weekly-hearing-list?artefactId={id}` |
| UTIAC Statutory Appeal Daily Hearing List | `/utiac-statutory-appeal-daily-hearing-list?artefactId={id}` |
| UTIAC JR London Daily Hearing List | `/utiac-jr-london-daily-hearing-list?artefactId={id}` |
| UTIAC JR Leeds Daily Hearing List | `/utiac-jr-leeds-daily-hearing-list?artefactId={id}` |

### Email summary fields

| List type | Field 1 | Field 2 | Field 3 |
|---|---|---|---|
| GRC Weekly | Date | Hearing time | Case reference number |
| WPAFCC Weekly | Date | Hearing time | Case reference number |
| UTIAC SA Daily | Date (from artefact displayFrom) | Hearing time | Appeal reference number |
| UTIAC JR London Daily | Date (from artefact displayFrom) | Hearing time | Case reference number |
| UTIAC JR Leeds Daily | Date (from artefact displayFrom) | Hearing time | Case reference number |

---

## 6. Validation

- `validateDateFormat(DD_MM_YYYY_PATTERN)` — applied to `date` fields (GRC, WPAFCC)
- `validateTimeFormatSimple` — applied to `hearingTime` fields on all five list types
- `validateNoHtmlTags` — applied to all free-text fields
- `minRows: 1` — all five converters require at least one data row
- JSON Schema Draft 7 per list type with required fields and patterns

---

### Comment by OgechiOkelu on 2026-03-03T18:20:27Z
@plan

### Comment by hmctsclaudecode on 2026-03-03T18:29:18Z
Technical plan created on branch `feature/429-tribunal-non-strategic-grc-wpafcc-utiac`. Awaiting clarifications on user group access levels, date fields in UTIAC daily email summaries, UTIAC SA opening statement assignment, list manipulation scope, and Welsh translations availability.
