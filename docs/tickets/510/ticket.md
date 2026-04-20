# #510: Subscribe by case name, case reference number, case ID or unique reference number (URN)

**State:** OPEN
**Assignees:** None
**Author:** OgechiOkelu
**Labels:** enhancement, migrated-from-jira, status:new, priority:3-medium, type:story, jira:VIBE-300
**Created:** 2026-04-20T16:01:32Z
**Updated:** 2026-04-20T16:24:01Z

## Description

**PROBLEM STATEMENT**

Verified user are users who have applied to create accounts in CaTH to have access to restricted hearing information. Upon approval, verified users can then sign in on CaTH and subscribe to email notifications from CaTH.

**AS A** Verified Media User

**I WANT** to subscribe to hearing lists in CaTH

**SO THAT** I can receive email notifications whenever a new list I subscribed to is published

**Technical Specification:**

This ticket should branch off 'feature/VIBE-316-refactor-artefact-search-extraction-subscription'
Add Case_number and case_name fields to the subscription table so they can be retrieved for display on subscription pages.
When user search by a case number or case name, use the artefact_search table to get the results.
If user is subscriber by case number, Store value for search_type column on the subscription table as CASE_NUMBER and store the case number in the search_value column.
If user is subscriber by case name, Store value for search_type column on the subscription table as CASE_NAME and store the case name in the search_value column.
Subscriptions should be fulfilled for the new search type / value combination. If an artefact is ingested that matches the CASE_NUMBER, then subscription should be fulfilled using the existing subscriptions process / logic.
The code for subscription pages should sit under libs/verified-pages/src/pages.
The code for manipulating subscription information should sit under libs/subscription

**Pre-conditions:**

The user has valid credentials and is already approved as a verified media user.
Only published information is available for searching, per system restriction.
Email notifications are implemented in Gov Notify

**ACCEPTANCE CRITERIA**

- A verified user is a member of the media who has been verified and has an approved account in CaTH
- A verified user can sign into CaTH to view restricted hearing information and subscribe to email notifications.
- The verified user can see the Dashboard as soon as the user signs in
- At the top of the page user can see a clickable link to see 3 pages provided in these texts Court and tribunal hearings, Dashboard and Email subscriptions
- The verified user can click on the 'Email subscriptions' tab to subscribe to hearing lists from specific venues.
- When the user clicks on the 'Email subscriptions' tab, the user is taken to a page with a header title 'Your email subscriptions' and can see the green 'Add email subscription' button under the header. Underneath the button is a table with multiple display options available to the user to select. These display options are titled 'All subscriptions', 'Subscriptions by case' and 'Subscription by court or tribunal'. Each option displays the total number of active subscriptions in a bracket beside the title.
- The content of each displayed table is dependent on the availability of active subscriptions the user has and the selected option.
- Each table displays details of the available active subscriptions in the user's account
- Where the user has subscribed by case name or/and case reference number and clicks on the 'Subscriptions by case' option, then the column titles displayed will be 'Case name','Reference number' and 'date added'.
- Where the user has subscribed by court or tribunal name and clicks on the 'Subscription by court or tribunal' option, then the table will display 'Court or tribunal name' and 'Date added' in the columns
- Where the user has subscribed by both case name or/and case reference number and court or tribunal name and selects the 'All subscriptions' option, then 2 tables will be displayed with the Subscription by case table coming first before the subscription by court or tribunal table following
- Where the user does not have any existing subscriptions, then the following message is displayed under the 'Add email subscription' tab; 'You do not have any active subscriptions' and the user can click the green 'Add email subscription' tab to begin the subscription process
- When the user clicks on the 'Add email subscription' tab, the user is taken to the page with path '/subscription-add' titled 'How do you want to add an email subscription?' and underneath the page title, user can see the following message 'You can only search for information that is currently published.'
- User can see 3 radio button options; 'By court or tribunal name', 'By case name' and 'By case reference number, case ID or unique reference number (URN)'
- The user can make one selection and then click the continue button to progress to the next page
- Clicking Continue without selecting an option must trigger a validation error.
- When the user clicks to subscribe 'By court or tribunal name' it should go to the existing path for 'location-name-search'.
- Where the user clicks to subscribe 'By case name' then the following steps completes the subscription process:
  - After selecting By case name, the user must be shown a page requesting a case name input.
  - Submitting an empty form must trigger a mandatory field validation message.
  - If no results match the case name entered, an error message must be displayed.
  - If matching cases exist, the system must display a search results page.
  - The user must be able to select one case from the results list.
  - After selection, the user must be brought to a Confirm email subscription page.
  - After confirming, the user must be shown a subscription confirmation page.
  - The subscription must be added to the user's active subscription table immediately.
- Where the user clicks to subscribe 'By case reference number, case ID or unique reference number (URN)' then the following steps completes the subscription process:
  - After selecting By case reference number, case ID or URN, show an input page requesting the reference.
  - Submitting an empty value must trigger validation requiring a reference number.
  - Submitting an invalid or non-matching reference must show an error message.
  - If a matching case is found, display the results page.
  - The user must select a case to subscribe to.
  - Display a confirmation page for the selected case.
  - Upon confirmation, show a subscription success page.
  - The subscription must be added to the user's subscription table.
- The newly added subscription must be updated in the database and be visible immediately in the subscription table in the user's account
- All CaTH page specifications are maintained.

**Welsh Translations**

EN: Title/H1 "Dashboard" → CY: "Dangosfwrdd"
EN: Navigation links — "Court and tribunal hearings", "Dashboard", "Email subscriptions" → CY: "Gwrandawiadau llys a thribiwnlys", "Dangosfwrdd", "tanysgrifiadau e-bost"
EN: Title/H1 "Your email subscriptions" → CY: "Eich tanysgrifiadau e-bost"
EN: Button — "Add email subscription" → CY: "Ychwanegu tanysgrifiad e-bost"
EN: Tab options — "All subscriptions", "Subscriptions by case", "Subscription by court or tribunal" → CY: "Pob tanysgrifiad", "Tanysgrifio yn ôl achos", "Tanysgrifio yn ôl llys neu dribiwnlys"
EN: Empty state message — "You do not have any active subscriptions" → CY: "Nid oes gennych unrhyw danysgrifiadau gweithredol"
EN: Title/H1 "How do you want to add an email subscription?" → CY: "Sut ydych chi eisiau ychwanegu tanysgrifiad e-bost?"
EN: Body text — "You can only search for information that is currently published." → CY: "Gallwch ond chwilio am wybodaeth sydd eisoes wedi'i chyhoeddi"
EN: Button — "Continue" → CY: "Dewiswch opsiwn"
EN: "Select how you want to add an email subscription." → CY: "Dewiswch Sut ydych chi eisiau ychwanegu tanysgrifiad e-bost?"
EN: Title/H1 "By case name" → CY: "Yn ôl enw'r achos"
EN: Label — "Case name" → CY: "Enw'r Achos"
EN: "Enter a case name" → CY: "Welsh placeholder"
EN: "No results found" → CY: "Welsh placeholder"
EN: Title/H1 "By case reference number, case ID or unique reference number (URN)" → CY: "Yn ôl enw'r achos, Yn ôl cyfeirnod yr achos, ID yr achos neu gyfeirnod unigryw (URN)"
EN: Label — "Reference number" → CY: "Cyfeirnod"
EN: "Enter reference number" → CY: "Rhowch gyfeirnod achos dilys"
EN: "No matching case found" → CY: "Welsh placeholder"
EN: Title/H1 "Select a case" → CY: "Dewiswch yr achos"
EN: Table column headers — "Case name", "Party name", "Reference number" → CY: "Enw'r Achos", "Enw'r parti", "Cyfeirnod yr Achos"
EN: Title/H1 "Confirm email subscription" → CY: "Cadarnhewch tanysgrifiadau e-bost"
EN: Button — "Confirm" → CY: "Cadarnhewch"
EN: Title/H1 "Subscription added" → CY: "tanysgrifiadau wedi'i ychwanegu"
EN: Body text — "Your email subscription has been added." → CY: "Eich tanysgrifiadau e-bost wedi'i ychwanegu"
EN: Link — "Email subscriptions" → CY: "Welsh placeholder"

## Comments

### Comment by OgechiOkelu on 2026-04-20T16:18:38Z
@SPEC new-feature.md

### Comment by hmctsclaudecode on 2026-04-20T16:23:11Z

A detailed functional and technical spec was generated and posted as a comment. Key contents:

- Full BDD acceptance criteria scenarios
- User journey flow diagrams (Journey A: by case name, Journey B: by case reference, Journey C: by court/tribunal via new gateway)
- Low-fidelity wireframes for all 6 screens
- Page-by-page specifications for 7 pages (subscription-management update + 6 new pages)
- Full content tables (EN/CY) for all pages
- URL routing table
- Validation rules per page
- Error message specifications
- Back link and redirect navigation table
- Accessibility requirements (WCAG 2.2 AA)
- Database schema changes (add `case_name`, `case_number` nullable columns to `subscription` table)
- New service and query function signatures for `libs/subscriptions`
- Subscription fulfillment strategy for CASE_NUMBER at artefact ingestion time
- Unit test scenarios (25+ cases)
- E2E test scenarios (2 journey tests + 1 inline)
- Assumptions and open questions (party name column, CASE_NAME fulfillment, session structure, search result limits)

### Comment by OgechiOkelu on 2026-04-20T16:24:01Z
@plan
