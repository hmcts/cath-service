# #425: Tribunal non-strategic publishing - UTCC, UTLC & UTAAC

**State:** OPEN
**Assignees:** None
**Author:** OgechiOkelu
**Labels:** enhancement, priority:3-medium, type:story
**Created:** 2026-02-27T16:23:17Z
**Updated:** 2026-02-27T16:36:20Z

## Description

**PROBLEM STATEMENT**
This ticket is raised for the creation of the validation schema, style guide, PDF and email summary needed for the Upper Tribunal (Tax and Chancery Chamber), Upper Tribunal (Lands Chamber) and the Upper Tribunal (Administrative Appeals Chamber) to publish in CaTH, through the non-strategic publishing route.

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
- The full list names shall be displayed as follows in the front-end summary of publications:
  - Upper Tribunal Tax and Chancery Chamber Daily Hearing list - date
  - Upper Tribunal (Lands Chamber) Daily Hearing list – date
  - Upper Tribunal (Administrative Appeals Chamber) Daily Hearing list - date
  - While in the upload form, it will be displayed as: UT (T and CC) Daily Hearing List, UT (LC) Daily Hearing List and UT (AAC) Daily Hearing List
- The 'Region' for UT (T and CC) Daily Hearing List and UT (LC) Daily Hearing List is 'National' while for UT (AAC) Daily Hearing List is 'London'
- The opening statement displayed within the Upper Tribunal (Tax and Chancery Chamber) Daily Hearing list should be as follows:

  > A representative of the media, or any other person, wishing to attend a remote hearing should contact uttc@justice.gov.uk and we will arrange for your attendance.
  > Observe a court or tribunal hearing as a journalist, researcher or member of the public

- The fields to be displayed in the Upper Tribunal (Tax and Chancery Chamber) Daily Hearing list are: Time, Case Reference, Case Name, Judge(s), Member(s), Hearing Type, Venue and Additional Information

- The opening statement displayed within the Upper Tribunal (Lands Chamber) Daily Hearing list should be as follows:

  > If a representative of the media or a member of the public wishes to attend a Cloud Video Platform (CVP) hearing they should contact the Lands Chamber listing section Lands@justice.gov.uk who will provide further information.
  > Observe a court or tribunal hearing as a journalist, researcher or member of the public

- The fields to be displayed in the Upper Tribunal (Lands Chamber) Daily Hearing list are: Time, Case Reference, Case Name, Judge(s), Member(s), Hearing Type, Venue, Mode of Hearing and Additional Information

- The opening statement displayed within the Upper Tribunal (Administrative Appeals Chamber) Daily Hearing list should be as follows:

  > Details
  > Lists are subject to change until 4:30pm. Any alterations after this time will be telephoned or emailed direct to the parties or their legal representatives.
  >
  > **England and Wales**
  > Remote hearings via CVP and BT Meet Me
  > Hearings will be available to representatives of the media or any other member of the public, on their request, and therefore will be a hearing conducted in public in accordance with Rule 37 of the Tribunal Procedure (Upper Tribunal) Rules 2008.
  > Any media representative or any other member of the public wishing to witness the hearing will need to do so over the internet and provide an email address at which to be sent an appropriate link for access.
  > Please contact adminappeals@justice.gov.uk.
  >
  > **Scotland**
  > Remote hearings
  > When hearings are listed for Scotland the hearing will be available to representatives of the media or any other member of the public, on their request, and therefore will be a hearing conducted in public in accordance with Rule 37 of the Tribunal Procedure (Upper Tribunal) Rules 2008. It will be organised and conducted using Cloud Video Platform (CVP). Any media representative or any other member of the public wishing to witness the hearing will need to do so over the internet and provide an email address at which to be sent an appropriate link for access. Please contact UTAACMailbox@justice.gov.uk.

- The fields to be displayed in the Upper Tribunal (Administrative Appeals Chamber) Daily Hearing list are: Time, Appellant, Case Reference Number, Case Name, Judge(s), Member(s), Mode of Hearing, Venue and Additional Information
- The following link https://www.gov.uk/guidance/observe-a-court-or-tribunal-hearing should be masked anywhere this text is displayed in the opening statement for all the lists: 'Observe a court or tribunal hearing as a journalist, researcher or member of the public'

## Comments

### Comment by OgechiOkelu on 2026-02-27T16:25:54Z
@SPEC new-feature.md

### Comment by hmctsclaudecode on 2026-02-27T16:30:41Z
Technical Specification was generated (see issue for full spec).

### Comment by OgechiOkelu on 2026-02-27T16:36:20Z
@plan
