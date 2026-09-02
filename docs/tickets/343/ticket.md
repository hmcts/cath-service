# #343: Subscription Emails Fulfilment Complete Journey

**State:** OPEN
**Assignees:** alao-daniel
**Author:** junaidiqbalmoj
**Labels:** priority:3-medium, type:story
**Created:** 2026-02-11T12:00:11Z
**Updated:** 2026-05-21T14:38:22Z

## Description

Once excel generation for SJP has been implemented. We need to make sure that user is able to get all four types of subscriptions emails which have been configured in Gov Notifier:

Media Publication Subscription (JSON) - Both PDF and Excel. This will be send when list type is SJP list and file size is less than 2MB.
Template id: 4017c40f-0644-4b02-acd2-e00a1ece3b85
Personalisation list:

- if there is case number, display_case_num will be true
- case_num
- if there is case urn, display_case_urn will be true
- case_urn
- if there is location, display_locations will be true
- locations
- ListType
- content_date
- pdf_link_text
- excel_link_text
- display_summary
- summary_of_cases

Media Publication Subscription (JSON) - Excel Only - SJP Press list (need to check)
Template id: e03108e1-db29-40d3-90f2-bf8f6c233c35
Personalisation list:

- if there is case number, display_case_num will be true
- case_num
- if there is case urn, display_case_urn will be true
- case_urn
- if there is location, display_locations will be true
- locations
- ListType
- content_date
- excel_link_text
- display_summary
- summary_of_cases

Media Publication Subscription (JSON) - No Link - If any list size is more than 2MB (mostly SJP lists)
Template id: 072fa7fd-ac23-4a99-be9a-70153374c66e
Personalisation list:

- if there is case number, display_case_num will be true
- case_num
- if there is case urn, display_case_urn will be true
- case_urn
- if there is location, display_locations will be true
- locations
- ListType
- content_date
- display_summary
- summary_of_cases

Media Publication Subscription (JSON) - PDF Only. All the list except SJP lists and size is less than 2MB
Template id: e551a0c1-91e7-4871-a540-1e7101b70f14
Personalisation list:

- if there is case number, display_case_num will be true
- case_num
- if there is case urn, display_case_urn will be true
- case_urn
- if there is location, display_locations will be true
- locations
- ListType
- content_date
- pdf_link_text
- display_summary
- summary_of_cases

As a part of this ticket, we need to tell AI about the personalisation lists and also ask to include dynamic text like case number, name or urn in the email subject.

**Acceptance criteria:**

- User is able to get all four type of subscription emails.

## Comments

### Comment by OgechiOkelu on 2026-02-12T14:13:57Z
@SPEC new-feature.md

### Comment by hmctsclaudecode on 2026-02-12T14:18:23Z
[Technical Specification provided - see full spec in issue comments for detailed user stories, acceptance criteria, personalisation fields, template selection logic, and implementation notes]

### Comment by OgechiOkelu on 2026-02-12T16:18:44Z
@Plan

### Comment by hmctsclaudecode on 2026-02-12T16:24:31Z
[Clarifications requested - covering case metadata storage, summary generation, PDF detection, Excel format identification, Gov Notify subject lines, test template IDs, existing artefacts without file size, and download link format]

### Comment by OgechiOkelu on 2026-02-12T16:38:13Z
@plan

### Comment by hmctsclaudecode on 2026-02-12T16:46:17Z
[Duplicate clarifications requested - same questions as previous comment]
