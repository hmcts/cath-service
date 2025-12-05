# VIBE-307: Verified user - Select & Edit List Type

## User Story
As a Verified Media User, I want to select specific list types when subscribing to hearing lists in CaTH so that I can only receive email notifications for the selected list types.

## Problem Statement
Verified users are users who have applied to create accounts in CaTH to have access to restricted hearing information. Upon approval, verified users can then sign in on CaTH and subscribe to email notifications from CaTH and also select specific list types of interest.

## Pre-conditions
- The user has valid credentials and is already approved as a verified media user
- Only published information is available for searching, per system restriction
- Email notifications are implemented in Gov Notify
- VIBE-309 have been implemented

## Technical Specification
- Create branch from feature/VIBE-221-subscription-fulfilment-email
- On Page 5: Select list types, check sub-jurisdiction of the location and find all the lists which have matching sub-jurisdiction
- Create a new database table for list type subscription
- To trigger subscription notification email for list type, when publication is received, all the subscribers who are subscribed to that list type and language will get notification email
- List type subscription is not linked with location
- On Edit list type page, show all the list types which are matching with the sub-jurisdiction of the selected list type. Display all the lists and tick only those ones which the user is subscribed to

## User Journey Flow

```
START
 |
 v
Your email subscriptions (Page 1)
 |
 |-- If no subscriptions → show empty message
 |-- Else → show table + Add email subscription button
 |
 v
Click "Add email subscription"
 |
 v
Page 2: How do you want to add a subscription?
 |
 |-- If no radio selected → error
 |
 v
Select "By court or tribunal name"
 |
 v
Page 3: Court/Tribunal search + filters
 |
 |-- User may select:
 |       - Jurisdiction(s)
 |       - Region(s)
 |       - Court types (pop-ups)
 |-- No selection still allowed
 |
 v
Continue
 |
 v
Page 4: Your email subscriptions (Selected venues)
 |
 |-- User may:
 |       - Remove a venue
 |       - Add another subscription
 |
 v
Continue
 |
 v
Page 5: Select list types
 |
 |-- If no list type selected → error
 |
 v
Continue
 |
 v
Page 6: Select list version
 |
 |-- If no version selected → error
 |
 v
Continue
 |
 v
Page 7: Confirm your email subscriptions
 |
 |-- User may:
 |       - Remove list type
 |       - Change version
 |       - Add another subscription
 |
 v
Confirm subscriptions
 |
 v
Page 8: Subscription confirmation
 |
END
```

## Pages and Content

### Page 1: Your email subscriptions

**Form fields:**
- Add email subscription (button)
  - Input type: button
  - Required: No
  - Validation: None
- Remove subscription (per row)
  - Input type: link
  - Required: No
  - Validation: None

**Content:**
- EN: Title/H1 "Your email subscriptions"
- CY: Title/H1 "Eich tanysgrifiadau e-bost"
- EN: Button — "Add email subscription" (green)
- CY: Button — "Ychwanegu Tanysgrifiadau e-bost"
- EN (empty state): "You do not have any active subscriptions"
- CY (empty state): "Nid oes gennych unrhyw danysgrifiadau gweithredol"
- EN: Table columns — "Court or tribunal name", "Date added", "Actions"
- CY: Table columns — "Enw'r llys neu'r tribiwnlys", "Dyddiad wedi'i ychwanegu", "Camau gweithredu"

**Errors:** None on this page.

**Back navigation:** Back link returns user to previous signed-in landing page (Verified user dashboard).

---

### Page 2: How do you want to add an email subscription?

**Form fields:**
- Subscription method
  - Input type: radio
  - Required: Yes
  - Options:
    - By court or tribunal name
    - By case name
    - By case reference number, case ID or URN
  - Validation:
    - If no option selected → error "Select how you want to add an email subscription."
- Continue button
  - Input type: button
  - Required: No

**Content:**
- EN: Title/H1 "How do you want to add an email subscription?"
- CY: Title/H1 "Sut ydych chi eisiau ychwanegu tanysgrifiad e-bost?"
- EN: Hint text — "You can only search for information that is currently published."
- CY: Hint text — "Gallwch ond chwilio am wybodaeth sydd eisoes wedi'i chyhoeddi."
- EN: Radio options — "By court or tribunal name", "By case name", "By case reference number, case ID or unique reference number (URN)"
- CY: Radio options — "Yn ôl enw'r llys neu dribiwnlys", "Yn ôl enw'r achos", "Yn ôl cyfeirnod yr achos, ID yr achos neu gyfeirnod unigryw (URN)"
- EN: Button — "Continue"
- CY: Button — "Parhau"

**Errors:**
- EN: Summary title — "There is a problem"
- EN: Message — "Select how you want to add an email subscription."
- CY: "Mae yna broblem", "Welsh placeholder"

**Back navigation:** Back returns to Your email subscriptions.

---

### Page 3: Subscribe by court or tribunal name

**Form fields:**
- Search input
  - Input type: text
  - Required: No
  - Validation: None
- Jurisdiction filters
  - Input type: checkbox
  - Required: No
  - Validation: Each selection triggers corresponding court-type pop-up
- Region filters
  - Input type: checkbox
  - Required: No
  - Validation: None
- Court-type selections (pop-up filters)
  - Input type: checkbox
  - Required: No
  - Validation: None
- Continue button
  - Input type: button
  - Required: No
  - Validation: No error if the user selects nothing

**Content:**
- EN: Title/H1 "By court or tribunal name"
- CY: Title/H1 "Yn ôl enw'r llys neu dribiwnlys"
- EN: Hint text — "Subscribe to receive hearings list by court or tribunal"
- CY: Hint text — "Tanysgrifio i dderbyn rhestr wrandawiadau yn ôl llys neu dribiwnlys"
- EN: Filter headings — "Jurisdiction", "Region"
- CY: Filter headings — "Awdurdodaeth", "Rhanbarth"
- EN: Pop-up filter heading — "Type of court"
- CY: Pop-up filter heading — "Math o lys"
- EN: Button — "Continue"
- CY: Button — "Parhau"

**Errors:** None — user is allowed to continue without choosing any court.

**Back navigation:** Back returns to How do you want to add an email subscription?

---

### Page 4: Your email subscriptions (Selected venues)

**Form fields:**
- Remove (per row)
  - Input type: link
  - Required: No
- Continue button
  - Input type: button
  - Required: No
- Add another subscription
  - Input type: link
  - Required: No

**Content:**
- EN: Title/H1 "Your email subscriptions"
- CY: Title/H1 "Eich tanysgrifiadau e-bost"
- EN: Table headings — "Court or tribunal name", "Actions"
- CY: "Enw'r llys neu'r tribiwnlys", "Camau gweithredu"
- EN: Links — "Remove", "Add another email subscription"
- CY: "Dileu", "Ychwanegu tanysgrifiad e-bost arall"
- EN: Button — "Continue"
- CY: Button — "Parhau"

**Errors:** None.

**Back navigation:** Back returns to Subscribe by court or tribunal name, preserving previous selections.

---

### Page 5: Select list types

**Form fields:**
- List type selection
  - Input type: checkbox
  - Required: No (but required to proceed)
  - Validation:
    - If none selected → "Please select a list type to continue."
- Continue button
  - Input type: button
  - Required: No

**Content:**
- EN: Title/H1 "Select list types"
- CY: "Dewis Mathau o Restri"
- EN: Description—
  "Choose the lists you will receive for your selected courts and tribunals.
  This will not affect any specific cases you may have subscribed to.
  Also don't forget to come back regularly to see new list types as we add more."
- CY: "Dewiswch y rhestrau y byddwch yn eu derbyn ar gyfer y llysoedd a'r tribiwnlysoedd a ddewiswyd gennych. Ni fydd hyn yn effeithio ar unrhyw achosion penodol yr ydych efallai wedi tanysgrifio iddynt. Hefyd, peidiwch ag anghofio dychwelyd yn rheolaidd i weld mathau newydd o restri wrth i ni ychwanegu mwy."
- EN: List type table headings — alphabetical group, checkbox, list name
- CY: "Welsh placeholder"
- EN: Button — "Continue"
- CY: "Parhau"

**Errors:**
- EN: Summary title — "There is a problem"
- EN: Message — "Please select a list type to continue"
- CY: "Mae yna broblem", "Dewiswch opsiwn math o restr"

**Back navigation:** Back returns to Your email subscriptions (selected venues).

---

### Page 6: Select list version

**Form fields:**
- Version
  - Input type: radio
  - Required: Yes
  - Options: English, Welsh, English and Welsh
  - Validation: If not selected → "Please select version of the list type to continue"
- Continue button
  - Input type: button
  - Required: No

**Content:**
- EN: Title/H1 "What version of the list type do you want to receive?"
- CY: "Pa fersiwn o'r rhestr ydych chi am ei derbyn?"
- EN: Radio options — "English", "Welsh", "English and Welsh"
- CY: "Saesneg", "Cymraeg", "Cymraeg a Saesneg"
- EN: Button — "Continue"
- CY: "Parhau"

**Errors:**
- EN: Summary — "There is a problem"
- EN: Message — "Please select version of the list type to continue"
- CY: "Dewiswch fersiwn o'r math o restr Dewiswch opsiwn"

**Back navigation:** Back returns to Select list types, retaining selections.

---

### Page 7: Confirm your email subscriptions

**Form fields:**
- Remove list type
  - Input type: link
  - Required: No
- Change version
  - Input type: link
  - Required: No
- Add another email subscription
  - Input type: link
  - Required: No
- Confirm subscriptions
  - Input type: button
  - Required: No

**Content:**
- EN: Title/H1 "Confirm your email subscriptions"
- CY: "Cadarnhewch eich tanysgrifiadau e-bost"
- EN: Three tables with headings:
  - Court or tribunal name
  - List type
  - Version
- CY: "Enw'r llys neu'r tribiwnlys", "math o restr", "Fersiwn"
- EN links: "Remove", "Change version", "Add another email subscription"
- CY: Dileu, placeholder, Ychwanegu tanysgrifiad e-bost arall
- EN button: "Confirm subscriptions"
- CY: Cadarnhau tanysgrifiadau

**Errors:** None.

**Back navigation:** Back returns to Select list version.

---

### Page 8: Subscription confirmation

**Form fields:** None.

**Content:**
- EN: Title/H1 (green banner) — "Subscription confirmation"
- CY: "Cadarnhau tanysgrifiad"
- EN: Options displayed as links:
  - Add another subscription
  - Manage your current email subscriptions
  - Find a court or tribunal
  - Select which list type to receive
- CY: Ychwanegu tanysgrifiad e-bost arall, Rheoli eich tanysgrifiadau presennol, dod o hyd i lys neu dribiwnlys, Dewiswch pa fath o restri yr hoffech gael

**Errors:** None.

**Back navigation:** Back returns to Confirm your email subscriptions.

---

## Accessibility Requirements
- Must comply with WCAG 2.2 AA and GOV.UK Design System
- All radio, checkbox, link, and button elements must be keyboard operable
- Error summaries must be announced and include anchor links
- Filters and pop-ups must be accessible via keyboard and screen readers
- Table structures must use semantic markup
- Back link must be the first interactive element on each page

## Acceptance Criteria
1. When a verified media user signs into CaTH, the verified user can see the green 'Add email subscription' button when the user clicks on the 'Email subscriptions' tab to subscribe to hearing lists and sees a page with a header title 'Your email subscriptions'
2. The verified user must be able to add a new subscription via the "Add email subscription" link on 'Your email subscriptions' page
3. When the user clicks the 'Add email subscription' button, the user is taken to a page with header title 'How do you want to add an email subscription'
4. Where the user does not have any existing subscriptions, then the following message is displayed under the 'Add email subscription' tab; 'You do not have any active subscriptions'
5. Where the user has an existing subscription, then a table with columns titled 'Court or tribunal name', 'Date added' and 'Actions' is displayed under the green 'Add email subscription' tab with details of all the existing subscriptions
6. User can select from 3 radio button options; 'By court or tribunal name', 'By case name' and 'By case reference number, case ID or unique reference number (URN)'
7. Clicking Continue without selecting an option must trigger a validation error
8. User can search and filter courts/tribunals by jurisdiction and region with pop-up filters for court types
9. User can continue without selecting any court (no error)
10. Selected venues display in a table with Remove links
11. User must select at least one list type to proceed (validation error if none selected)
12. User must select a list version (English, Welsh, English and Welsh) to proceed
13. Confirmation page displays all selections with options to Remove, Change version, or Add another subscription
14. Final confirmation page displays success banner with navigation links
15. Back link must be available on every page and must return the user to the previous step without losing state
16. The system must prevent or avoid creating duplicate subscriptions for the same court/tribunal, list type(s), and list versions
17. All CaTH page specifications are maintained
