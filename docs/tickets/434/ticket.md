# #434: SEND, CIC and Asylum Support Tribunal Hearing Lists Publishing in CaTH

**State:** OPEN
**Assignees:** (none)
**Author:** OgechiOkelu
**Labels:** enhancement, priority:3-medium, type:story
**Created:** 2026-03-10T13:26:03Z
**Updated:** 2026-03-17T11:16:41Z

## Description

**PROBLEM STATEMENT**
This ticket is raised for the creation of the validation schema, style guide, PDF and email summary needed for the First-tier Tribunal (Special Educational Needs and Disability), Criminal Injuries Compensation Tribunal and Asylum Support Tribunal to publish in CaTH through the non-strategic publishing route.

**AS A** Service
**I WANT** to create the validation schema, style guide, PDF & email summary for the above-mentioned Tribunals
**SO THAT** the tribunal hearing lists can be published in CaTH through the non-strategic publishing route

**ACCEPTANCE CRITERIA**
- Validation schemas are created for each hearing list from the tribunals listed above
- Error handling is put in place for the validation schema
- Valid publications are saved via the current method
- List types are classified and user groups are decided based on authorised access to the list types (Public, Private, etc)
- A new pdf template is created for the downloadable version of each tribunal hearing list
- All the tribunals adopt a unified email summary format like the existing email summary
- A new style guide is created for each hearing list of all the tribunals
- List manipulation is created for the style guides
- The full list names shall be displayed as follows in the front-end summary of publications; First-tier Tribunal (Special Educational Needs and Disability) Daily Hearing List, Criminal Injuries Compensation Weekly Hearing List and Asylum Support Tribunal Daily Hearing List
- On the Excel file upload form, the lists will be displayed as follows; SEND Daily Hearing list, CIC Weekly Hearing List and AST Daily Hearing List respectively
- The SEND Daily Hearing list and CIC Weekly Hearing List are linked to the 'Tribunal' jurisdiction and 'National' region
- The AST Daily Hearing List is linked to the 'Tribunal' jurisdiction and 'London' region
- The SEND Daily Hearing list and AST Daily Hearing List will be published daily
- The CIC Weekly Hearing List will be published weekly
- Data fields to be displayed within the SEND Daily Hearing list are Time, Case Reference Number, Respondent, Hearing Type, Venue and Time Estimate
- Data fields to be displayed within the CIC Weekly Hearing List are Date, Hearing time, Case reference number, Case name, Venue/Platform, Judge(s), Member(s), Additional information
- Data fields to be displayed within the AST Daily Hearing List are Appellant, Appeal Reference Number, Case Type, Hearing Type, Hearing Time and Additional Information
- The address to be displayed within the AST Daily Hearing List is East London Tribunal Service, HMCTS, 2nd Floor, Import Building, 2 Clove Crescent London E14 2BE
- The fields to be published in the email summary for the SEND Daily Hearing list and CIC Weekly Hearing List are Time, Case Reference Number and venue
- The fields to be published in the email summary for the AST Daily Hearing List are Appellant, Appeal Reference Number and Hearing Time

**Important information accordion text:**

**SEND Daily Hearing List:**
Special Educational Needs and Disability (SEND) Tribunal hearings are held in private and unless a request from the parties for the hearing to be heard in public has been approved, you will not be able to observe.
Private hearings do not allow anyone to observe remotely or in person. This includes members of the press.
Open justice is a fundamental principle of our justice system. To attend a public hearing using a remote link you must apply for permission to observe.
Requests to observe a public hearing that is taking place should be made in good time direct to: send@justice.gov.uk. You may be asked to provide further details.
The judge hearing the case will decide if it is appropriate for you to observe remotely. They will have regard to the interests of justice, the technical capacity for remote observation and what is necessary to secure the proper administration of justice.

**CIC Weekly Hearing List:**
Open justice is a fundamental principle of our justice system.
When considering the use of telephone and video technology, the judiciary will have regard to the principles of open justice. Judges may determine that a hearing should be held in private if this is necessary to secure the proper administration of justice.
Criminal Injuries Compensation Tribunal parties and representatives will be informed directly as to the arrangements for hearing cases remotely. Any other person interested in joining the hearing remotely should contact the Criminal Injuries Compensation Tribunal Office direct, in advance of the hearing date, by emailing CIC.enquiries@Justice.gov.uk so that arrangements can be made. The following details should be included in the subject line of the email [OBSERVER/MEDIA] REQUEST – [AN Other v CICA] – [hearing date]. If the case is to be heard in private or is subject to a reporting restriction, this will be notified.
Restricted Reporting Orders: The inclusion of a case in the Press List is no guarantee that it is not subject to a restricted reporting order. Members of the press should ensure that no order exists on an individual case before submitting material for publication.
For more information, please visit https://www.gov.uk/guidance/observe-a-court-or-tribunal-hearing.

**AST Daily Hearing List:**
Open justice is a fundamental principle of our justice system. When considering the use of telephone and video technology, the judiciary will have regard to the principles of open justice. Judges may determine that a hearing should be held in private if this is necessary to secure the proper administration of justice.
Asylum Support Tribunal parties and representatives will be informed directly as to the arrangements for hearing cases remotely. Any other person interested in joining the hearing remotely should contact the Asylum Support Tribunal Office direct, in advance of the hearing date, by emailing asylumsupporttribunals@justice.gov.uk so that arrangements can be made. The following details should be included in the subject line of the email [OBSERVER/MEDIA] REQUEST – [case reference] – [hearing date]. If the case is to be heard in private or is subject to a reporting restriction, this will be notified.
For more information, please visit https://www.gov.uk/guidance/observe-a-court-or-tribunal-hearing.

## Comments

### Comment by OgechiOkelu on 2026-03-10T13:35:14Z
@SPEC new-feature.md

### Comment by OgechiOkelu on 2026-03-10T13:59:48Z
@analyse

### Comment by hmctsclaudecode on 2026-03-10T14:02:45Z
Requirements analysis: three new list types (SEND Daily, CIC Weekly, AST Daily) following the existing non-strategic pattern. IDs to be assigned: 24 (SEND), 25 (CIC), 26 (AST). Conflicts noted with issues #425, #428, #429, #431 on `mock-list-types.ts` and app registration files due to parallel development. Also conflict risk with #342 (database-driven list types refactor).

### Comment by hmctsclaudecode on 2026-03-17T10:14:34Z
Technical specification posted. Confirmed list type IDs: 24 (SEND_DAILY_HEARING_LIST), 25 (CIC_WEEKLY_HEARING_LIST), 26 (AST_DAILY_HEARING_LIST). All use `provenance: "MANUAL_UPLOAD"` and `isNonStrategic: true`. Full acceptance criteria in Gherkin format provided.

### Comment by OgechiOkelu on 2026-03-17T11:16:41Z
@plan
