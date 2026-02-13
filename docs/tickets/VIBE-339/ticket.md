# VIBE-339: Email Summary and PDF for RCJ Hearing Lists and Care Standards List

## Problem Statement

This ticket covers the creation of the email summary and the PDF version of the RCJ Hearing Lists and the Care Standards List which are to be included within the Subscription fulfilment.

## User Story

**AS A** Service
**I WANT** to create the email summary and PDF version of the RCJ and Care Standards Lists
**SO THAT** users who have subscribed to these Lists are notified and can download a copy of the lists

## Pre-Conditions

- CaTH users can subscribe and have subscribed to receive email notifications for specific hearing lists published in CaTH
- Email notification templates have been set up in Gov.Notify

## Acceptance Criteria

1. **PDF Generation**: 'Build a PDF' foundation-PDF-conversion-logic is implemented to allow the creation of a downloadable PDF version of the RCJ hearing lists and the Care Standard list from the list blob / Excel template, using the specific List Style Guide template

2. **PDF Style Matching**: The generated PDF file must match the style guide at the front end and should be included within the Subscription fulfilment process

3. **Email Notification Trigger**: When a CaTH user subscribes to publications in CaTH and a publication matching the users' subscriptions are uploaded to CaTH, then the user will receive an email notification informing them that the publication is available to view from the CaTH frontend

4. **GOV.Notify Integration**: The email notification is sent out from GOV.Notify using the agreed email template

5. **Email Summary Content**: The email notification summary should contain:
   - Link to the PDF file
   - For RCJ Hearing Lists: Case Number, Case Details, Hearing Type
   - For Care Standards List: Case name, Hearing date

6. **Email Format**: The email summary should follow this format:
   - Opening statement (Special Category Data warning)
   - List name and venue (bulleted)
   - Link to CaTH masked in text
   - Link to PDF version
   - Summary of cases section
   - Unsubscribe link

7. **PDF Download Journey**:
   - Page 1: "You have a file to download" with Continue button
   - Page 2: "Download your file" with file link and expiry date

8. **Testing**: Integration test, Unit test and Accessibility tests are performed

## Email Content Specification

### Opening Statement
```
Note this email contains Special Category Data as defined by Data Protection Act 2018, formally known as Sensitive Personal Data, and should be handled appropriately.

This email contains information intended to assist the accurate reporting of court proceedings. It is vital you ensure that you safeguard the Special Category Data included and abide by reporting restrictions (for example on victims and children). HMCTS will stop sending the data if there is concern about how it will be used.
```

### Trigger Explanation
```
Your subscription to get updates about the below has been triggered based on a [list name] being published for the date [publication date]:
• [Venue name]
```

### Links
- "Manage your subscriptions, view lists, and add additional case information within the Court and tribunal hearings service."
- "Download the case list as a PDF:"

### Summary Section
- **RCJ Hearing Lists**: Case number, Case details, Hearing type
- **Care Standards List**: Case name, Hearing date

### Footer
- Unsubscribe link

## Page Specifications

### Page 1: You have a file to download

| Element | EN | CY |
|---------|----|----|
| Title/H1 | "You have a file to download" | Welsh placeholder |
| Body text | "Court and tribunal hearings service sent you a file to download." | Welsh placeholder |
| Button | "Continue" | Welsh placeholder |
| Support text | "If you have any questions, call 0300 303 0656." | Welsh placeholder |

### Page 2: Download your file

| Element | EN | CY |
|---------|----|----|
| Title/H1 | "Download your file" | Welsh placeholder |
| Body text | "This file is available to download until [expiry date]." | Welsh placeholder |
| Body text | "Make sure you save your file somewhere you can find it." | Welsh placeholder |
| File link | "Download this PDF ([file size]) to your device" | Welsh placeholder |
| Support text | "If you have any questions, call 0300 303 0656." | Welsh placeholder |

## List Types Covered

1. **RCJ Standard Daily Cause List** (listTypeId: 9)
2. **Court of Appeal Civil Daily Cause List** (listTypeId: 10)
3. **Administrative Court Daily Cause List** (listTypeId: 11)
4. **London Administrative Court Daily Cause List** (listTypeId: 12)
5. **Care Standards Tribunal Weekly Hearing List** (listTypeId: 13)

## Accessibility Requirements

- Email notifications must be readable by screen readers with clear structure and descriptive links
- PDF files must meet WCAG 2.2 AA standards, including tagged structure, selectable text, and logical heading hierarchy
- Download journey pages must support keyboard-only navigation and visible focus states
- Status and error messages must be announced to assistive technologies

## Test Scenarios

1. PDF generation: RCJ Hearing Lists are successfully converted into PDFs using the List Style Guide template
2. PDF generation: Care Standards List is successfully converted into a PDF using the List Style Guide template
3. Subscription trigger: Subscribed users receive an email when a matching list is published
4. Email delivery: Notifications are sent via GOV.UK Notify using the agreed template
5. Email content: Mandatory Special Category Data warning text is present
6. Summary section: Correct case details are displayed for each list type
7. PDF link journey: User can access the download screens and successfully download the PDF
8. Testing: Unit tests, integration tests, and accessibility tests are completed successfully
