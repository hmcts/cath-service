# VIBE-169: Remove publication

**Status:** Test
**Assignee:** Iqbal, Junaid
**Created:** 2025-10-07
**Updated:** 2025-11-14

## Problem Statement

Admins who can upload files and publish hearing lists in CaTH are also given permission to remove these publications if needed. This process is carried out in several steps.

## User Story

**AS AN** Admin
**I WANT** to remove a publication in CaTH
**SO THAT** the publication is no longer available to CaTH Users

## Acceptance Criteria

* An admin is able to access a verified account by signing in through the sign in page with their approved log in details
* The admin is able to see the 'Remove' tab on the dashboard
* The 'Remove' tab displays the descriptive message 'Search by court or tribunal and remove a publication from the external facing service on GOV.UK.'
* When the admin clicks on the 'Remove' tab on the dashboard, the system directs the local admin to the 'Find content to remove' page
* The admin is able to search for content to remove by typing in the 'Search by court or tribunal name' search tab which displays the sample descriptive text 'For example, Blackburn Crown Court'
* where the admin does not input any selection into the search bar and clicks the continue button, then the system will display the following descriptive message to prompt the user; ' There is a problem'. it will also state 'court or tribunal name must be 3 characters or more' and highlight the search bar so the admin knows where to input the information
* When a user types in the search bar, the system will display likely options that correspond with the user's input. This should be pulled from the Court Master Reference Data
* When the admin finds the content to be removed and clicks the continue button, the local admin is taken to the 'Select content to remove' page which displays all the published content in the specific venue selected and a total of all the results found with the display text 'Showing --result(s)'
* The admin can see a table displaying the list type, court or tribunal name, content date, display dates, language and sensitivity of each content that's available in the venue selected
* The admin can see a check box at the end of the row with each content's details in the table that allows the selection of all the content to be deleted
* The admin continues the process by clicking the continue button and is taken to a confirmation page titled 'Are you sure you want to remove this content?' which displays the details of all the selected content to be removed and two radio buttons to select yes to complete the removal or no to cancel the removal of the content
* Where the admin selects no, the removal process is terminated, and the admin is taken back to the 'select content to remove page'
* Where the admin selects yes, the removal process is completed and a confirmation of 'Successful file removal' is displayed by the system boldly in a green banner
* In the same banner, a descriptive text is displayed underneath and reads 'Your file has been removed'
* Beneath the green banner, the user can see several links that directs them to 'remove another file' or 'home'.
* All CaTH pages specifications are maintained

## Technical Criteria

* For court search box, use the autocomplete functionality which has been built already
* On confirmation, artefact must be removed from artefact table.

## URL Structure

| Page | URL |
|------|-----|
| Dashboard (Remove tab) | `/admin/remove` |
| Find content to remove | `/admin/remove/find` |
| Select content to remove | `/admin/remove/select` |
| Confirmation page | `/admin/remove/confirm` |
| Success page | `/admin/remove/success` |

## Validation Rules

* Minimum input length for search field: 3 characters
* Search must return matching venues from Court Master Reference Data
* At least one publication must be selected before proceeding
* Confirmation radio must be selected before continuing
* Successful removal triggers update in CaTH database and unpublishes the file from GOV.UK

## Error Messages

**EN:**
* "There is a problem."
* "Court or tribunal name must be 3 characters or more."
* "Select at least one publication to remove."
* "An error occurred while removing content. Please try again later."

**CY:**
* "Mae problem wedi codi."
* "Rhaid i enw'r llys neu'r tribiwnlys gynnwys 3 llythyren neu fwy."
* "Dewiswch o leiaf un gyhoeddiad i'w dynnu."
* "Digwyddodd gwall wrth dynnu'r cynnwys. Ceisiwch eto'n hwyrach."

## Content

**EN:**
* **Page Titles:** "Find content to remove", "Select content to remove", "Are you sure you want to remove this content?", "Successful file removal"
* **Messages:**
  * "Search by court or tribunal and remove a publication from the external-facing service on GOV.UK."
  * "Court or tribunal name must be 3 characters or more."
  * "Your file has been removed."
* **Buttons:** "Continue", "Remove another file", "Home"

**CY:**
* **Page Titles:** "Canfod cynnwys i'w dynnu", "Dewis cynnwys i'w dynnu", "A ydych yn siŵr eich bod am dynnu'r cynnwys hwn?", "Tynnu ffeil yn llwyddiannus"
* **Messages:**
  * "Chwiliwch yn ôl llys neu dribiwnlys a thynnwch gyhoeddiad o'r gwasanaeth allanol ar GOV.UK."
  * "Rhaid i enw'r llys neu'r tribiwnlys gynnwys 3 llythyren neu fwy."
  * "Mae eich ffeil wedi'i thynnu."
* **Buttons:** "Parhau", "Tynnu ffeil arall", "Hafan"

## Accessibility

* Comply with WCAG 2.2 AA and GOV.UK Design System standards
* Use semantic HTML for tables, inputs, and buttons
* Ensure all error messages are announced by screen readers using `aria-live="assertive"`
* Focus states visible on all interactive elements
* Checkbox and radio groups labelled with fieldset and legend
* All text readable in both English and Welsh, toggleable via language switch

## Assumptions / Open Questions

* Confirm whether removed publications should be soft-deleted (archived) or permanently deleted
* Confirm if audit logging should capture user ID, timestamp, and publication ID for all removals
* Confirm whether the success page should include a link to download a removal log
* Confirm if multi-language content (Welsh/English) should display both versions in the results table
* Confirm if removal should automatically trigger GOV.UK unpublishing via API or require manual sync
