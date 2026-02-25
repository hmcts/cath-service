# VIBE-341: Create email summary and PDF version of Civil and Family Daily Cause List

**Status:** To Do
**Assignee:** Unassigned
**Reporter:** Not specified
**Labels:** subscription, pdf, email, daily-cause-list

---

## Problem Statement

This ticket covers the creation of the email summary and the PDF version of the Civil and Family Daily Cause List which are to be included within the subscription fulfilment.

## User Story

**AS A** Service
**I WANT** to create the email summary and PDF version of the Daily Cause Lists
**SO THAT** users who have subscribed to these Lists are notified and can download a copy of the lists

## Pre-Conditions

- CaTH users can subscribe and have subscribed to receive email notifications for specific hearing lists published in CaTH
- Email notification templates have been set up in GOV.UK Notify

## Acceptance Criteria

1. **PDF Generation** - 'Build a PDF' foundation-PDF-conversion-logic is implemented to allow the creation of a downloadable PDF version of the Civil and Family Daily Cause List from the list blob template, using the specific List Style Guide template.

2. **PDF Style Match** - The generated PDF file must match the style guide at the front end and should be included within the Subscription fulfilment in CaTH

3. **Email Notification Trigger** - When a CaTH user subscribes to publications in CaTH and a publication matching the users' subscriptions are uploaded to CaTH, then the user will receive an email notification informing them that the publication is available to view from the CaTH frontend.

4. **GOV.UK Notify Integration** - The mail notification is sent out from GOV.UK Notify using the agreed email template

5. **Email Content Structure** - The email notification summary should contain the link to the PDF file followed by the email summary.

6. **Three Email Templates Required**:
   - **Template 1**: Both PDF link and email summary (default)
   - **Template 2**: Just the email summary (used if PDF > 2MB for Civil and Family Daily Cause List)
   - **Template 3**: Original template for all other list types

7. **Email Summary Content** - Contains summary of cases within the listing including:
   - Applicant
   - Case reference number
   - Case name
   - Case type
   - Hearing type

8. **Email Format Requirements**:

   **Opening Statement:**
   > Note this email contains Special Category Data as defined by Data Protection Act 2018, formally known as Sensitive Personal Data, and should be handled appropriately.
   >
   > This email contains information intended to assist the accurate reporting of court proceedings. It is vital you ensure that you safeguard the Special Category Data included and abide by reporting restrictions (for example on victims and children). HMCTS will stop sending the data if there is concern about how it will be used.

   **Subscription Trigger Text:**
   > Your subscription to get updates about the below has been triggered based on a [list name e.g. Family Daily Cause List] being published for the date 25 October 2023:
   > - [Venue name e.g. Oxford Combined Court Centre]

   **Links Section:**
   - Link to CaTH masked as: "Manage your subscriptions, view lists, and add additional case information within the Court and tribunal hearings service."
   - Link to PDF masked as: "Download the case list as a PDF:"

   **Summary Section:**
   - Heading: "Summary of cases within listing"
   - Summarised key case details
   - "Unsubscribe" link

9. **Testing** - Validation, unit and integration tests are performed for each list type

10. **PDF Download** - When the user clicks the link to the PDF version, it redirects to https://documents.service.gov.uk to download the PDF.

---

## Specifications

### Page 1: Subscription fulfilment – PDF generation (Daily Cause Lists)

| Element | EN | CY |
|---------|----|----|
| Process description | "Build PDF version of Daily Cause Lists" | Welsh placeholder |
| List types | "Civil and Family Daily Cause List" | Welsh placeholder |
| Template reference | "List Style Guide template" | Welsh placeholder |
| Error message | "The PDF could not be generated for this list." | Welsh placeholder |

**Form fields:** None (system-generated process)
**Back navigation:** Not applicable

### Page 2: Subscription fulfilment – Email notification summary

| Element | EN | CY |
|---------|----|----|
| Email subject | "New Daily Cause List available" | Welsh placeholder |
| Opening statement | "Note this email contains Special Category Data..." (full text above) | Welsh placeholder |
| Trigger explanation | "Your subscription to get updates about the below has been triggered based on a [list name] being published for the date [publication date]:" | Welsh placeholder |
| Bulleted details | "[List name]", "[Venue name]" | Welsh placeholder |
| Link text | "Manage your subscriptions, view lists, and add additional case information within the Court and tribunal hearings service." | Welsh placeholder |
| PDF link text | "Download the case list as a PDF:" | Welsh placeholder |
| Section heading | "Summary of cases within listing" | Welsh placeholder |
| Summary content | "Applicant, Case reference number, Case name, Case type, Hearing type" | Welsh placeholder |
| Unsubscribe link | "Unsubscribe" | Welsh placeholder |
| Error message | "The email notification could not be sent." | Welsh placeholder |

**Form fields:** None (system-generated email content)
**Back navigation:** Not applicable

### Page 3: You have a file to download

| Element | EN | CY |
|---------|----|----|
| Title/H1 | "You have a file to download" | Welsh placeholder |
| Body text | "Court and tribunal hearings service sent you a file to download." | Welsh placeholder |
| Button | "Continue" | Welsh placeholder |
| Support text | "If you have any questions, call 0300 303 0656." | Welsh placeholder |

**Form fields:** None
**Errors:** None
**Back navigation:** Back link returns the user to the previous page without losing context.

### Page 4: Download your file

| Element | EN | CY |
|---------|----|----|
| Title/H1 | "Download your file" | Welsh placeholder |
| Body text 1 | "This file is available to download until [date]." | Welsh placeholder |
| Body text 2 | "Make sure you save your file somewhere you can find it." | Welsh placeholder |
| File link | "Download this PDF ([file size]) to your device" | Welsh placeholder |
| Support text | "If you have any questions, call 0300 303 0656." | Welsh placeholder |
| Error message | "The file is no longer available to download." | Welsh placeholder |

**Form fields:** None
**Back navigation:** Back link returns the user to the "You have a file to download" page.

---

## Accessibility Requirements

- Email content must be readable by screen readers with descriptive link text and logical reading order
- PDF files must be accessible, including tagged structure, selectable text, and correct heading hierarchy
- Download pages must meet WCAG 2.2 AA requirements, including visible focus states and keyboard-only navigation
- Error and status messages must be announced to assistive technologies

---

## Test Scenarios

1. **PDF generation** - Civil and Family Daily Cause List is successfully converted into a PDF using the List Style Guide template
2. **Subscription trigger** - Subscribed users receive an email when a matching list is published
3. **Email delivery** - Notifications are sent via GOV.UK Notify using the agreed template
4. **Email content** - Mandatory Special Category Data warning text is present
5. **Summary section** - Correct case details are displayed for each list type
6. **PDF link journey** - User can access "You have a file to download" and "Download your file" pages and download the PDF
7. **Expiry handling** - Attempting to access the file after expiry shows the correct error message
8. **Testing** - Validation, unit tests, and integration tests are completed successfully for each list type
