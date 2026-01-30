# #307: [VIBE-340] Excel generation (SJP Only) and fulfilment for subscriptions

**State:** OPEN
**Assignees:** None
**Author:** linusnorton
**Labels:** migrated-from-jira, priority:3-medium, type:story, status:prioritised-backlog, jira:VIBE-340
**Created:** 2026-01-20T17:22:54Z
**Updated:** 2026-01-30T13:46:59Z

## Description

> **Migrated from [VIBE-340](https://tools.hmcts.net/jira/browse/VIBE-340)**

**PROBLEM STATEMENT**

CaTH verified users are able to add email subscriptions to publications using either the court name, case reference number, case name or case URN. Users expect to receive a notification when hearing lists that have been subscribed to are published. This ticket covers the creation of the email summary and the Excel version of the SJP Hearing List which are to be included within the Subscription fulfilment.



**AS A** Service

**I WANT** to create the email summary and Excel version of the SJP Hearing Lists

**SO THAT** users who have subscribed to these Lists are notified and receive the link to the excel in the email notification



**Pre-Condition**
 * CaTH users can subscribe to receive email notifications for specific hearing lists published in CaTH
 * Email notification templates have been set up in Gov.Notify



**Acceptance criteria**
 * An Excel spreadsheet of the SJP hearing lists is created though the implementation of a JSON to Excel conversion logic. The Excel spreadsheet should follow the format of the front end style guide.
 * When a CaTH user subscribe to SJP publications in CaTH and an SJP hearing list matching the users' subscriptions are uploaded to CaTH, then the user will receive an email notification informing them that the hearing list is available to view from the CaTH frontend.
 * The system (CaTH) should fulfil the subscription by sending the email notification to all identified subscribers to that publication (based on the user ID and subscribers' emails in the account management system), using the approved GOV.Notify template which should adopt the following email summary format;

 * An opening statement that reads as follows;

Note this email contains Special Category Data as defined by Data Protection Act 2018, formally known as Sensitive Personal Data, and should be handled appropriately.

This email contains information intended to assist the accurate reporting of court proceedings. It is vital you ensure that you safeguard the Special Category Data included and abide by reporting restrictions (for example on victims and children). HMCTS will stop sending the data if there is concern about how it will be used.
 * This is followed by the list name and venue (bulleted) in the following format;

 Your subscription to get updates about the below has been triggered based on a <list name e.g. SJP Press List> being published for the date 25 October 2023:
 *    <Venue name i.e. Single Justice Procedure>
 * This is followed by the text with the link to CaTH masked in the highlighted text '{**}Manage your subscriptions, view lists, and add additional case information{**} within the Court and tribunal hearings service.' and then the link to the Excel version of the list which is masked in the text 'Download the case list as a Excel Spreadsheet:'.
 * The excel file should only be created once regardless of the number of subscriptions
 * The excel file should also be stored and referenced later as part of #324
 * Validation, unit and Integration tests are performed for each list type

## h2. Specifications:


~~--~~
### Page 1: Subscription fulfilment – Excel generation (SJP Hearing List)

**Form fields**
 * None (system-generated process)

**Content**
 * EN: Process description — "Build Excel version of SJP Hearing List"

 * CY: Process description — "Welsh placeholder"

 * EN: File type — "Microsoft Excel spreadsheet"

 * CY: File type — "Welsh placeholder"

 * EN: Data source — "SJP hearing list JSON"

 * CY: Data source — "Welsh placeholder"

 * EN: Template reference — "Front end style guide format"

 * CY: Template reference — "Welsh placeholder"

**Errors**
 * EN: Error message — "The Excel file could not be generated for this list."

 * CY: Error message — "Welsh placeholder"

**Back navigation**
 * Not applicable

~~--~~
### Page 2: Subscription fulfilment – Email notification summary

**Form fields**
 * None (system-generated email content)

**Content**
 * EN: Email subject — "New SJP hearing list available"

 * CY: Email subject — "Welsh placeholder"

 * EN: Opening statement —
"Note this email contains Special Category Data as defined by Data Protection Act 2018, formally known as Sensitive Personal Data, and should be handled appropriately.

This email contains information intended to assist the accurate reporting of court proceedings. It is vital you ensure that you safeguard the Special Category Data included and abide by reporting restrictions (for example on victims and children). HMCTS will stop sending the data if there is concern about how it will be used."

 * CY: Opening statement — "Welsh placeholder"

 * EN: Trigger explanation —
"Your subscription to get updates about the below has been triggered based on a <list name e.g. SJP Press List> being published for the date <publication date>:"

 * CY: Trigger explanation — "Welsh placeholder"

 * EN: Bulleted details —

 ** "<List name e.g. SJP Press List>"

 ** "<Venue name i.e. Single Justice Procedure>"

 * CY: Bulleted details —

 ** "Welsh placeholder"

 ** "Welsh placeholder"

 * EN: Link text —
"Manage your subscriptions, view lists, and add additional case information within the Court and tribunal hearings service."

 * CY: Link text — "Welsh placeholder"

 * EN: File link text —
"Download the case list as an Excel Spreadsheet:"

 * CY: File link text — "Welsh placeholder"

 * EN: Section heading — "Summary of cases within listing"

 * CY: Section heading — "Welsh placeholder"

 * EN: Summary content —
"Summarised key case details"

 * CY: Summary content — "Welsh placeholder"

 * EN: Link — "Unsubscribe"

 * CY: Link — "Welsh placeholder"

**Errors**
 * EN: Error message — "The email notification could not be sent."

 * CY: Error message — "Welsh placeholder"

**Back navigation**
 * Not applicable

~~--~~
### Page 3: Download your file (via email link)

**Form fields**
 * None

**Content**
 * EN: Title/H1 "Download your file"

 * CY: Title/H1 "Welsh placeholder"

 * EN: Body text —
"Save your file somewhere you can find it. You may need to print it or show it to someone later."

 * CY: Body text — "Welsh placeholder"

 * EN: File link —
"Download this Microsoft Excel spreadsheet (<file size>) to your device"

 * CY: File link — "Welsh placeholder"

 * EN: Support text —
"If you have any questions, call 0300 303 0656."

 * CY: Support text — "Welsh placeholder"

**Errors**
 * EN: Error message — "The file is no longer available to download."

 * CY: Error message — "Welsh placeholder"

**Back navigation**
 * Back link returns the user to the CaTH frontend.

~~--~~
**Accessibility**
 * Email content must be accessible, with descriptive links and a logical reading order for screen readers.

 * Excel spreadsheets must follow accessibility best practice, including clear column headers and readable formatting.

 * Download pages must comply with WCAG 2.2 AA standards, including keyboard navigation and visible focus states.

 * Error and status messages must be announced to assistive technologies.

**Test Scenarios**
 * File generation: SJP Hearing List JSON is successfully converted into an Excel spreadsheet following the front end style guide.

 * Subscription trigger: Subscribed users receive an email when a matching SJP hearing list is published.

 * Email delivery: Notifications are sent using the approved GOV.UK Notify template.

 * Email content: Mandatory Special Category Data warning text is present.

 * Summary section: "Summary of cases within listing" displays summarised key case details.

 * File download: User can successfully download the Excel file from the email link.

 * Testing: Validation, unit tests, and integration tests are completed successfully for the SJP list subscription fulfilment.

---

## Original JIRA Metadata

- **Status**: Prioritised Backlog
- **Priority**: 3-Medium
- **Issue Type**: Story
- **Assignee**: Unassigned
- **Created**: 1/12/2026
- **Updated**: 1/26/2026
- **Original Labels**: CaTH, tech-refinement


_Attachments will be added in a comment below._


## Comments

### Comment by OgechiOkelu on 2026-01-30T11:50:56Z
@plan

### Comment by ChrisS1512 on 2026-01-30T11:57:43Z
@claude Rebase the plan off of https://github.com/hmcts/cath-service/issues/236 (PR: https://github.com/hmcts/cath-service/pull/192) instead of master

### Comment by ChrisS1512 on 2026-01-30T13:46:58Z
@plan
