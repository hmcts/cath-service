# #296: [VIBE-307] Verified user - Select & Edit List Type

**State:** OPEN
**Assignees:** None
**Author:** linusnorton
**Labels:** migrated-from-jira, priority:3-medium, type:story, status:ready-for-progress, jira:VIBE-307
**Created:** 2026-01-20T17:20:13Z
**Updated:** 2026-01-29T16:02:30Z

## Description

> **Migrated from [VIBE-307](https://tools.hmcts.net/jira/browse/VIBE-307)**

**PROBLEM STATEMENT**

Verified user are users who have applied to create accounts in CaTH to have access to restricted hearing information. Upon approval, verified users can then sign in on CaTH and subscribe to email notifications from CaTH and also select specific list types of interest.

 

**AS A** Verified Media User

**I WANT** to select specific list types when subscribing to hearing lists in CaTH

**SO THAT** I can only receive email notifications for the selected list types

 

**Pre-conditions:**
 * The user has valid credentials and is already approved as a verified media user.
 * Only published information is available for searching, per system restriction.
 * Email notifications are implemented in Gov Notify
 * VIBE-309 have been implemented

 

**Technical Specification:**
 * Create branch from feature/VIBE~~221~~subscription~~fulfilment~~email.
 * On Page 5: Select list types, you need to check sub~~jurisdiction of the location and find all the lists which have matching sub~~jurisdiction.
 * Create a new database table for list type subscription.
 * To trigger subscription notification email for list type, when publication is received, all the subscribers who are subscribe to that list type and language will get notification email.
 * List type subscription is not linked with location. 
 * On Edit list type page, you show all the list types which are matching with the sub-jurisdiction of the selected list type. Display all the lists and tick only those ones which are subscriber the user.

 

**ACCEPTANCE CRITERIA**
 * When a verified media user signs into CaTH, the verified user can see the green ‘Add email subscription’ button when the user clicks on the ‘Email subscriptions’ tab to subscribe to hearing lists and sees a page with a header title ‘Your email subscriptions’
 * The verified user must be able to add a new subscription via the **“Add email subscription”** link on '{*}Your email subscriptions' page{*}.
 * When the user clicks the ‘Add email subscription’ button, the user is taken to a page with header title ‘How do you want to add an email subscription’
 * Where the user does not have any existing subscriptions, then the following message is displayed under the 'Add email subscription' tab; 'You do not have any active subscriptions' 
 * Where the user has an existing subscription, then a table with columns titled ‘Court or tribunal name’, ‘Date added’ and ‘Actions’ is displayed under the green  'Add email subscription' tab with details of all the existing subscriptions
 * When the user clicks on the 'Add email subscription' tab, the user is taken to the page titled ‘{**}How do you want to add an email subscription?’{**} and underneath the page title, user can see the following message ‘You can only search for information that is currently published.’
 * User can see 3 radio button options; ‘By court or tribunal name', ‘By case name’ and ‘By case reference number, case ID or unique reference number (URN)’
 *  The user can make one selection and then click the green continue button to progress to the next page
 * Clicking Continue without selecting an option must trigger a validation error.
 * where the user clicks the ‘By court or tribunal name', the user is taken to 'Subscribe ‘By court or tribunal name' page where the user sees all the available venues in CaTH. underneath the page title, the following message is displayed ; 'Subscribe to receive hearings list by court or tribunal' 
 * In the filter tab on the left side of the page, the user sees 2 filter accordions open by default with the options 'Jurisdiction' and 'Region'
 * if a jurisdiction is selected, then a pop-up filter for type of court' comes up.
 * The jurisdiction filter selection can result in multiple valid court types, and in this case, all relevant pop-ups for each selection must appear.
 ** When subscribing by court or tribunal name, the user must be able to:
 *** Search for a court or tribunal.
 *** Select one or more jurisdictions.
 **** See a pop~~up map of corresponding *court types** for each jurisdiction selected (multiple pop~~ups may appear).
 * the user clicks the green 'Continue' button to be taken to the 'Your email subscriptions' page which displays the selected court or tribunal name and actions in the table columns and the selected venues in rows with 'Remove' link under actions in each row.

 * 
 ** User must be able to:
 **** Confirm by selecting *Continue**
 *** Remove a list type from this screen without leaving the page
 *** Change the version (returns user to the List Version screen)
 *** Add another subscription (returns to Add subscription screen)
 * when user clicks the 'continue button, user is taken to the 'Select list types' page where the user must be presented with an option to select **list types** relevant to the court or tribunal they selected.
 * under the page title, the following text is written ' Choose the lists you will receive for your selected courts and tribunals. This will not affect any specific cases you may have subscribed to. Also don't forget to come back regularly to see new list types as we add more.'

 * the user selects from the list types displayed by ticking the check boxes on the left just before each list provided in the rows
 * list types are arranged alphabetically, with the alphabet first on the row to indicate list types starting with that alphabet. the checkbox comes after the letter and before the list type
 * user must be able to select one or more list types.
 * No error should be shown if the user selects *no court type* — the flow must still proceed to {*}Your email subscriptions{*}.
 * If the user selects **“Edit list type”** from '{*}Your email subscriptions' page{*}, then the user must be taken directly to the list-type selection screen (Screen 5a).

 * If the user clicks **Continue** without selecting any list type, an error message must be displayed:

 * 
 *** *There is a problem. Please select a list type to continue”**

 * Upon selecting valid list types and clicking continue, the user is taken to the next page titled 'What version of the list type do you want to receive?' page.

 * The user must choose one **list version** from the 3 radio button options (English, Welsh, English and Welsh) before clicking the green 'Continue' button to proceed to the confirmation page

 * If no version is selected, an error is shown:

 * 
 *** *“There is a problem. Please select version of the list type to continue”**

 * on the **Confirmation** page, under the page title 'Confirm your email subscriptions', user can see the selected options

 * 3 tables are displayed with headers

 * 
 ** Court or tribunal name
 ** List type

 * 
 ** Version 

 *  Beside the table name, under the 'Actions' column, user can see link to 'Remove' the court or tribunal name and list type and to change the version
 * A link to 'Add another email subscription' is provided under the tables, followed by a green 'Confirm subscriptions' button which takes user to the final confirmation page
 ** User must be able to:
 **** Confirm by selecting *Continue**
 *** Remove a list type from this screen without leaving the page
 *** Change the version (returns user to the List Version screen)
 *** Add another subscription (returns to Add subscription screen)

 * On confirmation:

 * 
 ** The subscription is updated to include the list types selected.
 ** The confirmation page displays the page header 'Subscription confirmation' in a green banner.
 * The user can navigate back to manage subscriptions, 'add another subscription', 'manage your current email subscriptions', 'find a court or tribunal' or 'select which list type to receive' by using the links under the green banner
 * Back link must be available on every page and must return the user to the **previous step** without losing state.
 * The system must prevent or avoid creating duplicate subscriptions for the same:

 * 
 ** Court or tribunal

 * 
 ** List type(s)

 * 
 ** List versions

 * All CaTH page specifications are maintained 

 

 

Page 1 – Your email subscriptions
## **Form fields**
 * **Add email subscription (button)**

 * 
 ** Input type: button

 * 
 ** Required: No

 * 
 ** Validation: None

 * **Remove subscription (per row)**

 * 
 ** Input type: link

 * 
 ** Required: No

 * 
 ** Validation: None

*Table fields are system-generated.*
## **Content**
 * EN: Title/H1 “Your email subscriptions”

 * CY: Title/H1 “Eich tanysgrifiadau e-bost”

 * EN: Button — “Add email subscription” (green)

 * CY: Button — “Ychwanegu Tanysgrifiadau e-bost”

 * EN (empty state): “You do not have any active subscriptions”

 * CY (empty state): “Nid oes gennych unrhyw danysgrifiadau gweithredol”

 * EN: Table columns — “Court or tribunal name”, “Date added”, “Actions”

 * CY: Table columns — “Enw’r llys neu’r tribiwnlys”, “Dyddiad wedi’i ychwanegu”, “Camau gweithredu”

## **Errors**
 * None on this page.

## **Back navigation**
 * Back link returns user to previous signed-in landing page (Verified user dashboard).

 

Page 2 – How do you want to add an email subscription?
## **Form fields**
 * **Subscription method**

 * 
 ** Input type: radio

 * 
 ** Required: Yes

 * 
 ** Options:

 * 
 ** 
 *** By court or tribunal name

 * 
 ** 
 *** By case name

 * 
 ** 
 *** By case reference number, case ID or URN

 * 
 ** Validation:

 * 
 ** 
 *** If no option selected → error “Select how you want to add an email subscription.”

 * **Continue button**

 * 
 ** Input type: button

 * 
 ** Required: No

## **Content**
 * EN: Title/H1 “How do you want to add an email subscription?”

 * CY: Title/H1 “Sut ydych chi eisiau ychwanegu tanysgrifiad e-bost?”

 * EN: Hint text — “You can only search for information that is currently published.”

 * CY: Hint text — “Gallwch ond chwilio am wybodaeth sydd eisoes wedi’i chyhoeddi.”

 * EN: Radio options — “By court or tribunal name”, “By case name”, “By case reference number, case ID or unique reference number (URN)”

 * CY: Radio options — “Yn ôl enw’r llys neu dribiwnlys”, “Yn ôl enw’r achos”, “Yn ôl cyfeirnod yr achos, ID yr achos neu gyfeirnod unigryw (URN)”

 * EN: Button — “Continue”

 * CY: Button — “Parhau”

## **Errors**
 * EN: Summary title — “There is a problem”

 * EN: Message — “Select how you want to add an email subscription.”

 * CY: “Mae yna broblem”, “Welsh placeholder”

## **Back navigation**
 * Back returns to {**}Your email subscriptions{**}.

 

Page 3 – Subscribe by court or tribunal name
## **Form fields**
 * **Search input**

 * 
 ** Input type: text

 * 
 ** Required: No

 * 
 ** Validation: None

 * **Jurisdiction filters**

 * 
 ** Input type: checkbox

 * 
 ** Required: No

 * 
 ** Validation: Each selection triggers corresponding court~~type pop~~up

 * **Region filters**

 * 
 ** Input type: checkbox

 * 
 ** Required: No

 * 
 ** Validation: None

 * **Court~~type selections (pop~~up filters)**

 * 
 ** Input type: checkbox

 * 
 ** Required: No

 * 
 ** Validation: None

 * **Continue button**

 * 
 ** Input type: button

 * 
 ** Required: No

 * 
 ** Validation: No error if the user selects nothing

## **Content**
 * EN: Title/H1 “By court or tribunal name”

 * CY: Title/H1 “Yn ôl enw’r llys neu dribiwnlys”

 * EN: Hint text — “Subscribe to receive hearings list by court or tribunal”

 * CY: Hint text — “Tanysgrifio i dderbyn rhestr wrandawiadau yn ôl llys neu dribiwnlys”

 * EN: Filter headings — “Jurisdiction”, “Region”

 * CY: Filter headings — “Awdurdodaeth”, “Rhanbarth”

 * EN: Pop-up filter heading — “Type of court”

 * CY: Pop-up filter heading — “Math o lys”

 * EN: Button — “Continue”

 * CY: Button — “Parhau”

## **Errors**
 * None — user is allowed to continue without choosing any court.

## **Back navigation**
 * Back returns to **How do you want to add an email subscription?**

 

**Page 4 – Your email subscriptions (Selected venues)**
## **Form fields**
 * **Remove (per row)**

 * 
 ** Input type: link

 * 
 ** Required: No

 * **Continue button**

 * 
 ** Input type: button

 * 
 ** Required: No

 * **Add another subscription**

 * 
 ** Input type: link

 * 
 ** Required: No

## **Content**
 * EN: Title/H1 “Your email subscriptions”

 * CY: Title/H1 “Eich tanysgrifiadau e-bost”

 * EN: Table headings — “Court or tribunal name”, “Actions”

 * CY: “Enw’r llys neu’r tribiwnlys”, “Camau gweithredu”

 * EN: Links — “Remove”, “Add another email subscription”

 * CY: “Dileu”, “Ychwanegu tanysgrifiad e-bost arall“

 * EN: Button — “Continue”,  

 * CY: Button — “Parhau”

## **Errors**
 * None.

## **Back navigation**
 * Back returns to {**}Subscribe by court or tribunal name{**}, preserving previous selections.

 

Page 5 – Select list types
## **Form fields**
 * **List type selection**

 * 
 ** Input type: checkbox

 * 
 ** Required: No (but required to proceed)

 * 
 ** Validation:

 * 
 ** 
 *** If none selected → “Please select a list type to continue.”

 * **Continue button**

 * 
 ** Input type: button

 * 
 ** Required: No

## **Content**
 * EN: Title/H1 “Select list types”

 * CY: “Dewis Mathau o Restri”

 * EN: Description—
“Choose the lists you will receive for your selected courts and tribunals.
This will not affect any specific cases you may have subscribed to.
Also don't forget to come back regularly to see new list types as we add more.”

 * CY: “Dewiswch y rhestrau y byddwch yn eu derbyn ar gyfer y llysoedd a'r tribiwnlysoedd a ddewiswyd gennych. Ni fydd hyn yn effeithio ar unrhyw achosion penodol yr ydych efallai wedi tanysgrifio iddynt. Hefyd, peidiwch ag anghofio dychwelyd yn rheolaidd i weld mathau newydd o restri wrth i ni ychwanegu mwy.”

 * EN: List type table headings — alphabetical group, checkbox, list name

 * CY: “Welsh placeholder”

 * EN: Button — “Continue”

 * CY: “Parhau”

## **Errors**
 * EN: Summary title — “There is a problem”

 * EN: Message — “Please select a list type to continue”

 * CY: “Mae yna broblem”, “Dewiswch opsiwn math o restr”

## **Back navigation**
 * Back returns to {**}Your email subscriptions (selected venues){**}.

 

Page 6 – Select list version
## **Form fields**
 * **Version**

 * 
 ** Input type: radio

 * 
 ** Required: Yes

 * 
 ** Options: English, Welsh, English and Welsh

 * 
 ** Validation: If not selected → “Please select version of the list type to continue”

 * **Continue button**

 * 
 ** Input type: button

 * 
 ** Required: No

## **Content**
 * EN: Title/H1 “What version of the list type do you want to receive?”

 * CY: “Pa fersiwn o'r rhestr ydych chi am ei derbyn?”

 * EN: Radio options — “English”, “Welsh”, “English and Welsh”

 * CY: “Saesneg”, “Cymraeg”, “Cymraeg a Saesneg”

 * EN: Button — “Continue”

 * CY: “Parhau”

## **Errors**
 * EN: Summary — “There is a problem”

 * EN: Message — “Please select version of the list type to continue”

 * CY: “Dewiswch fersiwn o'r math o restr Dewiswch opsiwn”

## **Back navigation**
 * Back returns to {**}Select list types{**}, retaining selections.

 

Page 7 – Confirm your email subscriptions
## **Form fields**
 * **Remove list type**

 * 
 ** Input type: link

 * 
 ** Required: No

 * **Change version**

 * 
 ** Input type: link

 * 
 ** Required: No

 * **Add another email subscription**

 * 
 ** Input type: link

 * 
 ** Required: No

 * **Confirm subscriptions**

 * 
 ** Input type: button

 * 
 ** Required: No

## **Content**
 * EN: Title/H1 “Confirm your email subscriptions”

 * CY: “Cadarnhewch eich tanysgrifiadau e-bost”

 * EN: Three tables with headings:

 * 
 ** Court or tribunal name

 * 
 ** List type

 * 
 ** Version

 * CY: “Enw’r llys neu’r tribiwnlys”, “math o restr”, “Fersiwn”

 * EN links: “Remove”, “Change version”, “Add another email subscription”

 * CY: Dileu, placeholder, Ychwanegu tanysgrifiad e-bost arall

 * EN button: “Confirm subscriptions”

 * CY: Cadarnhau tanysgrifiadau

## **Errors**
 * None.

## **Back navigation**
 * Back returns to {**}Select list version{**}.

 

Page 8 – Subscription confirmation
## **Form fields**
 * None.

## **Content**
 * EN: Title/H1 (green banner) — “Subscription confirmation”

 * CY: “Cadarnhau tanysgrifiad”

 * EN: Options displayed as links:

 * 
 ** Add another subscription

 * 
 ** Manage your current email subscriptions

 * 
 ** Find a court or tribunal

 * 
 ** Select which list type to receive

 * CY: Ychwanegu tanysgrifiad e-bost arall, Rheoli eich tanysgrifiadau presennol, dod o hyd i lys neu dribiwnlys, Dewiswch pa fath o restri yr hoffech gael

## **Errors**
 * None.

## **Back navigation**
 * Back returns to {**}Confirm your email subscriptions{**}.

 
# **Accessibility**
 * Must comply with WCAG 2.2 AA and GOV.UK Design System.

 * All radio, checkbox, link, and button elements must be keyboard operable.

 * Error summaries must be announced and include anchor links.

 * Filters and pop-ups must be accessible via keyboard and screen readers.

 * Table structures must use semantic markup.

 * Back link must be the first interactive element on each page.

 
# **Test Scenarios**
 * Verified media user can access “Your email subscriptions”.

 * Add email subscription shows correct radio choices.

 * Attempting to continue without choosing radio option shows error.

 * Court/tribunal filters behave as expected (multiple pop-ups).

 * Continue without selecting any venue proceeds without error.

 * Selected venues appear with Remove option.

 * List type page enforces mandatory selection.

 * Version page enforces mandatory selection.

 * Confirmation page reflects all selections.

 * Remove and change version links function without leaving state.

 * Final confirmation page displays correct banner text.

 * Back links always restore previous state.

 * Duplicate subscription combinations are not allowed.

 

 
 # JIRA~~FORMATTED SPECIFICATION (VIBE~~307)

# VIBE-307 – Select List Types When Subscribing (Technical Specification)
## User Story

As a verified media user, I want to select specific list types when subscribing to hearing lists in CaTH so that I can only receive email notifications for the list types I am interested in.

—
## Page 1 – Your email subscriptions

**System-generated table values.**
### Form fields
 * Add email subscription (button)
 ** Type: button
 ** Required: No

 * Remove (link, per row)
 ** Type: link
 ** Required: No

### Content
 * H1: "Your email subscriptions"
 * Button: "Add email subscription"
 * Empty state: "You do not have any active subscriptions"
 * Table headings: Court or tribunal name | Date added | Actions

### Errors
 * None.

### Back navigation

Returns to verified user dashboard.

—
## Page 2 – How do you want to add an email subscription?
### Form fields
 * Subscription method (radio)
 ** Options: By court or tribunal name; By case name; By case reference number, case ID or URN
 ** Required: Yes
 ** Error: "Select how you want to add an email subscription."

 * Continue (button)

### Content
 * H1: "How do you want to add an email subscription?"
 * Hint: "You can only search for information that is currently published."
 * Radio list displayed as per AC.

### Back navigation

Returns to Your email subscriptions.

—
## Page 3 – Subscribe by court or tribunal name
### Form fields
 * Search (text field)
 ** Required: No

 * Jurisdiction filter (checkbox)
 ** Required: No
 ** Selecting one triggers a “Type of court" pop-up.

 * Region filter (checkbox)
 ** Required: No

 * Type of court (checkbox)
 ** Required: No

 * Continue (button)
 ** No error if nothing selected.

### Content
 * H1: "By court or tribunal name"
 * Helper: "Subscribe to receive hearings list by court or tribunal"
 * Filter accordions: Jurisdiction, Region (open by default)
 * Pop-up filters appear dynamically for selected jurisdictions.

### Back navigation

Returns to “How do you want to add an email subscription?”

—
## Page 4 – Your email subscriptions (Selected Venues)
### Form fields
 * Remove (link, per row)
 * Add another subscription (link)
 * Continue (button)

### Content
 * H1: "Your email subscriptions"
 * Selected venues shown in table
 * Links: Remove; Add another email subscription
 * Button: Continue

### Back navigation

Returns to Subscribe by court or tribunal name.

—
## Page 5 – Select list types
### Form fields
 * List type selection (checkbox)
 ** Required to proceed
 ** Error: "Please select a list type to continue"

 * Continue (button)

### Content
 * H1: "Select list types"
 * Descriptive paragraph from AC
 * Alphabetically grouped list types with letter → checkbox → list name

### Back navigation

Returns to Your email subscriptions (selected venues).

—
## Page 6 – Select list version
### Form fields
 * Version (radio)
 ** Options: English; Welsh; English and Welsh
 ** Required: Yes
 ** Error: "Please select version of the list type to continue"

 * Continue (button)

### Content
 * H1: "What version of the list type do you want to receive?"
 * Radio list shown.

### Back navigation

Returns to Select list types.

—
## Page 7 – Confirm your email subscriptions
### Form fields
 * Remove (link)
 * Change version (link)
 * Add another email subscription (link)
 * Confirm subscriptions (button)

### Content
 * H1: "Confirm your email subscriptions"
 * Three tables shown:
 ** Court or tribunal name
 ** List type
 ** Version
 * Links under Actions: Remove, Change version, Add another email subscription
 * Button: Confirm subscriptions

### Back navigation

Returns to Select list version.

—
## Page 8 – Subscription confirmation
### Content
 * H1 (green banner): "Subscription confirmation"
 * Links:
 ** Add another subscription
 ** Manage your current email subscriptions
 ** Find a court or tribunal
 ** Select which list type to receive

### Back navigation

Returns to confirmation page.

—
## Accessibility
 * Must meet WCAG 2.2 AA and GOV.UK Design System.
 * Errors shown in GOV.UK error summary with anchor links.
 * All filters, pop-ups, tables must be accessible via keyboard and assistive tech.
 * Back link must always retain user input/state.

—
## Test Scenarios
 * See detailed test pack attached in section below.

 

2. FLOW DIAGRAM (TEXT-BASED + OPTIONAL MERMAID)

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
 |       - Jurisdiction(s)
 |       - Region(s)
 |       - Court types (pop-ups)
 |-- No selection still allowed
 |
 v
Continue
 |
 v
Page 4: Your email subscriptions (Selected venues)
 |
 |-- User may:
 |       - Remove a venue
 |       - Add another subscription
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
 |       - Remove list type
 |       - Change version
 |       - Add another subscription
 |
 v
Confirm subscriptions
 |
 v
Page 8: Subscription confirmation
 |
END

 

Mermaid Diagram (for Confluence / Markdown environments)

flowchart TD

A<Your email subscriptions> --> B<Add email subscription>
B --> C<How do you want to add an email subscription?>

C -->|By court or tribunal name| D<Subscribe by court or tribunal name>
C -->|No selection| C_ERR<Error: Must select an option>

D --> E<Your email subscriptions - selected venues>
E -->|Continue| F<Select list types>
E -->|Remove venue| E
E -->|Add another subscription| B

F -->|No list selected| F_ERR<Error: Select a list type>
F --> G<Select list version>

G -->|No version selected| G_ERR<Error: Select version>
G --> H<Confirm your email subscriptions>

H -->|Remove list type| H
H -->|Change version| G
H -->|Add another subscription| B
H --> I<Subscription confirmation>

I --> END

 

3. DEVELOPER GHERKIN ACCEPTANCE TEST PACK (VIBE-307)

Feature: Subscribing to hearing lists with list~~type selection (VIBE~~307)

  Background:
    Given the user is a verified media user
    And the user is signed in
    And published hearing data is available

  Scenario: User views their email subscriptions
    When the user navigates to the "Your email subscriptions" page
    Then they should see the "Add email subscription" button
    And if they have no subscriptions they should see "You do not have any active subscriptions"
    And if they have subscriptions they should see a table with "Court or tribunal name", "Date added", "Actions"

  Scenario: User attempts to continue without selecting subscription method
    When the user clicks "Add email subscription"
    And the user does not select any radio option
    And the user clicks Continue
    Then an error is shown: "Select how you want to add an email subscription."

  Scenario: User selects "By court or tribunal name"
    When the user selects "By court or tribunal name"
    And the user clicks Continue
    Then the user is taken to the subscription~~by~~court screen
    And filter accordions for Jurisdiction and Region are open by default

  Scenario: Jurisdiction selection triggers type~~of~~court pop-ups
    Given the user is on the subscribe~~by~~court page
    When the user selects a jurisdiction
    Then the corresponding "Type of court" pop-up appears

  Scenario: Multiple pop-ups appear for multiple jurisdiction selections
    Given multiple jurisdictions are selected
    Then pop-ups for each jurisdiction appear simultaneously

  Scenario: User continues with no court selected
    When the user clicks Continue without selecting any court
    Then the system proceeds without error
    And the selected court list on the next page may be empty

  Scenario: User reviews selected venues
    Given the user selected one or more courts
    When the user clicks Continue
    Then the selected venues appear in a table
    And each row contains a "Remove" link

  Scenario: Removing a selected venue
    Given the user is on the selected venues page
    When the user clicks "Remove"
    Then the venue is removed from the table

  Scenario: User proceeds to selecting list types
    When the user clicks Continue
    Then the user is taken to the "Select list types" page

  Scenario: Error when no list type selected
    When the user clicks Continue on the list types page without selecting a type
    Then an error appears: "Please select a list type to continue"

  Scenario: User selects one or more list types
    When the user selects list types
    And clicks Continue
    Then the user is taken to the list version selection page

  Scenario: Error when no version selected
    When the user clicks Continue without selecting a version
    Then an error appears: "Please select version of the list type to continue"

  Scenario: User confirms subscription details
    When the user selects a version
    And clicks Continue
    Then the confirmation page displays tables of:
      | Court or tribunal name |
      | List type |
      | Version |

  Scenario: User removes a list type on confirmation page
    When the user clicks Remove
    Then the list type is removed without navigating away

  Scenario: User changes version on confirmation page
    When the user clicks Change version
    Then the system returns to the list version page with previous data retained

  Scenario: User submits final confirmation
    When the user clicks "Confirm subscriptions"
    Then the subscription is created/updated
    And the user is taken to the "Subscription confirmation" page

  Scenario: Confirmation page options
    Given the user is on the confirmation page
    Then they should see options to:
      | Add another subscription |
      | Manage your current email subscriptions |
      | Find a court or tribunal |
      | Select which list type to receive |

---

## Original JIRA Metadata

- **Status**: Ready for Progress
- **Priority**: 3-Medium
- **Issue Type**: Story
- **Assignee**: Unassigned
- **Created**: 12/2/2025
- **Updated**: 1/13/2026
- **Original Labels**: CaTH, tech-refinement


_Attachments will be added in a comment below._

## Comments

### Comment by linusnorton on 2026-01-20T17:20:19Z
> **Linus Norton** commented on 5 Dec 2025, 15:12

## Technical Planning Complete

Technical specification and implementation plan have been generated for this ticket. The feature implements list type subscription functionality for verified media users through an 8-page workflow, allowing users to subscribe to specific list types for selected courts and tribunals.

***Branch:*** https://github.com/hmcts/cath~~service/tree/feature/VIBE~~307~~verified~~user~~select~~edit~~list~~type

***Documentation:***
- <Specification>(https://github.com/hmcts/cath~~service/blob/feature/VIBE~~307~~verified~~user~~select~~edit~~list~~type/docs/tickets/VIBE-307/specification.md)
- <Implementation Plan>(https://github.com/hmcts/cath~~service/blob/feature/VIBE~~307~~verified~~user~~select~~edit~~list~~type/docs/tickets/VIBE-307/plan.md)

### Comment by linusnorton on 2026-01-20T17:20:21Z
> **Linus Norton** commented on 13 Jan 2026, 10:07

## Technical Planning Complete

The technical planning for list type subscription functionality has been completed. This implementation enables verified media users to select specific list types when subscribing to hearing lists, with support for filtering by court/tribunal, selecting language versions (English/Welsh/Both), and managing subscriptions through an 8-page workflow.

The approach includes a new database table (list*type*subscription), comprehensive subscription management services, and integration with existing location subscriptions for intelligent notification matching based on sub-jurisdictions and language preferences.

### Planning Documents
- <Branch: feature/VIBE~~307~~verified~~user~~select~~edit~~list~~type>(https://github.com/hmcts/cath~~service/tree/feature/VIBE~~307~~verified~~user~~select~~edit~~list-type)
- <Technical Plan (plan.md)>(https://github.com/hmcts/cath~~service/blob/feature/VIBE~~307~~verified~~user~~select~~edit~~list~~type/docs/tickets/VIBE-307/plan.md)
- <Specification (specification.md)>(https://github.com/hmcts/cath~~service/blob/feature/VIBE~~307~~verified~~user~~select~~edit~~list~~type/docs/tickets/VIBE-307/specification.md)

*Implementation includes database schema, 8 page controllers with templates, subscription services, and notification logic.*

### Comment by linusnorton on 2026-01-29T16:02:27Z
> **Linus Norton** commented on 5 Dec 2025, 15:12

## Technical Planning Complete

Technical specification and implementation plan have been generated for this ticket. The feature implements list type subscription functionality for verified media users through an 8-page workflow, allowing users to subscribe to specific list types for selected courts and tribunals.

***Branch:*** https://github.com/hmcts/cath~~service/tree/feature/VIBE~~307~~verified~~user~~select~~edit~~list~~type

***Documentation:***
- <Specification>(https://github.com/hmcts/cath~~service/blob/feature/VIBE~~307~~verified~~user~~select~~edit~~list~~type/docs/tickets/VIBE-307/specification.md)
- <Implementation Plan>(https://github.com/hmcts/cath~~service/blob/feature/VIBE~~307~~verified~~user~~select~~edit~~list~~type/docs/tickets/VIBE-307/plan.md)

### Comment by linusnorton on 2026-01-29T16:02:30Z
> **Linus Norton** commented on 13 Jan 2026, 10:07

## Technical Planning Complete

The technical planning for list type subscription functionality has been completed. This implementation enables verified media users to select specific list types when subscribing to hearing lists, with support for filtering by court/tribunal, selecting language versions (English/Welsh/Both), and managing subscriptions through an 8-page workflow.

The approach includes a new database table (list*type*subscription), comprehensive subscription management services, and integration with existing location subscriptions for intelligent notification matching based on sub-jurisdictions and language preferences.

### Planning Documents
- <Branch: feature/VIBE~~307~~verified~~user~~select~~edit~~list~~type>(https://github.com/hmcts/cath~~service/tree/feature/VIBE~~307~~verified~~user~~select~~edit~~list-type)
- <Technical Plan (plan.md)>(https://github.com/hmcts/cath~~service/blob/feature/VIBE~~307~~verified~~user~~select~~edit~~list~~type/docs/tickets/VIBE-307/plan.md)
- <Specification (specification.md)>(https://github.com/hmcts/cath~~service/blob/feature/VIBE~~307~~verified~~user~~select~~edit~~list~~type/docs/tickets/VIBE-307/specification.md)

*Implementation includes database schema, 8 page controllers with templates, subscription services, and notification logic.*

