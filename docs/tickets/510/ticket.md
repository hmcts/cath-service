# #510: Subscribe by case name, case reference number, case ID or unique reference number (URN)

**State:** OPEN
**Assignees:** KianKwa
**Author:** OgechiOkelu
**Labels:** enhancement, migrated-from-jira, status:new, priority:3-medium, type:story, jira:VIBE-300
**Created:** 2026-04-20T16:01:32Z
**Updated:** 2026-04-22T14:49:46Z

## Description

**PROBLEM STATEMENT**

Verified user are users who have applied to create accounts in CaTH to have access to restricted hearing information. Upon approval, verified users can then sign in on CaTH and subscribe to email notifications from CaTH.

 

**AS A** Verified Media User

**I WANT** to subscribe to hearing lists in CaTH

**SO THAT** I can receive email notifications whenever a new list I subscribed to is published

**Technical Specification:**

This ticket should branch off 'feature/296-select-and-edit-list-type-subscriptions
Add Case_number and case_name fields to the subscription table so they can be retrieved for display on subscription pages.
When user search by a case number or case name, use the artefact_search table to get the results.
If user subscribes by case number, Store value for search_type column on the subscription table as CASE_NUMBER and store the case number in the search_value column.
If user subscribes by case name, Store value for search_type column on the subscription table as CASE_NAME and store the case name in the search_value column.
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

- At the top of the page user can see a clickable link to see 3 pages provided in these texts Court and tribunal hearings , Dashboard and Email subscriptions

- The verified user can click on the ‘Email subscriptions’ tab to subscribe to hearing lists from specific venues.

- When the user clicks on the 'Email subscriptions' tab,  the user is taken to a page with a header title ‘Your email subscriptions’ and can see the green ‘Add email subscription’ button under the header. Underneath the button is a table with multiple display options available to the user to select. These display options are titled ‘All subscriptions’, ‘Subscriptions by case’ and ‘Subscription by court or tribunal’. Each option displays the total number of active subscriptions in a bracket beside the title.

- The content of each displayed table is dependent on the availability of active subscriptions the user has and the selected option.

- Each table displays details of the available active subscriptions in the user’s account

- Where the user has subscribed by case name or /and case reference number and clicks on the ‘Subscriptions by case’ option, then the column titles displayed will be ‘Case name’,'Reference number’ and ‘date added’.

- Where the user has subscribed by court or tribunal name and clicks on the ‘Subscription by court or tribunal’ option, then the table will display ‘Court or tribunal name’ and ‘Date added' in the columns

- Where the user has subscribed by both case name or /and case reference number and court or tribunal name and selects the ‘All subscriptions’ option, then 2 tables will be displayed with the Subscription by case table coming first before the subscription by court or tribunal table following

- Where the user does not have any existing subscriptions, then the following message is displayed under the 'Add email subscription' tab; 'You do not have any active subscriptions' and the user can click the green 'Add email subscription' tab to begin the subscription process

- When the user clicks on the 'Add email subscription' tab, the user is taken to the page with path '/subscription-add' titled ‘How do you want to add an email subscription?’ and underneath the page title, user can see the following message ‘You can only search for information that is currently published.’

- User can see 3 radio button options; ‘By court or tribunal name', ‘By case name’ and ‘By case reference number, case ID or unique reference number (URN)’

- The user can make one selection and then click the continue button to progress to the next page

- Clicking Continue without selecting an option must trigger a validation error.

- When the user clicks to subscribe 'By court or tribunal name' it should go to the existing path for 'location-name-search'.

- Where the user clicks to subscribe 'By case name' then the following steps completes the subscription process

- After selecting By case name, the user must be shown a page requesting a case name input.

- Submitting an empty form must trigger a mandatory field validation message.

- If no results match the case name entered, an error message must be displayed (per Screen 3).

- If matching cases exist, the system must display a search results page (Screen 4).

- The user must be able to select one case from the results list.

- After selection, the user must be brought to a Confirm email subscription page (Screen 5).

- After confirming, the user must be shown a subscription confirmation page (Screen 6).

- The subscription must be added to the user’s active subscription table immediately.

- Where the user clicks to subscribe 'By case reference number, case ID or unique reference number (URN)' then the following steps completes the subscription process

- After selecting By case reference number, case ID or URN, show an input page requesting the reference.

- Submitting an empty value must trigger validation requiring a reference number.

- Submitting an invalid or non-matching reference must show an error message (Screen 3).

- If a matching case is found, display the results page (Screen 4).

- The user must select a case to subscribe to.

- Display a confirmation page for the selected case (Screen 5).

- Upon confirmation, show a subscription success page (Screen 6).

- The subscription must be added to the user’s subscription table.

- The newly added subscription must updated in the database and be visible immediately in the subscription table in the user's account

- All CaTH page specifications are maintained.

 **Welsh Translations**

EN: Title/H1 “Dashboard”
CY: Title/H1 “Dangosfwrdd”
EN: Navigation links — “Court and tribunal hearings”, “Dashboard”, “Email subscriptions”
CY: Navigation links — “Gwrandawiadau llys a thribiwnlys”, “Dangosfwrdd”, “tanysgrifiadau e-bost”
EN: Title/H1 “Your email subscriptions”
CY: Title/H1 “Eich tanysgrifiadau e-bost”
EN: Button — “Add email subscription”
CY: Button — “Ychwanegu tanysgrifiad e-bost”
EN: Tab options — “All subscriptions”, “Subscriptions by case”, “Subscription by court or tribunal”
CY: Tab options — “Pob tanysgrifiad”, “Tanysgrifio yn ôl achos”, “Tanysgrifio yn ôl llys neu dribiwnlys”
EN: Empty state message — “You do not have any active subscriptions”
CY: Empty state message — “Nid oes gennych unrhyw danysgrifiadau gweithredol”
EN: Title/H1 “How do you want to add an email subscription?”
CY: Title/H1 “Sut ydych chi eisiau ychwanegu tanysgrifiad e-bost?”
EN: Body text — “You can only search for information that is currently published.”
CY: Body text — “Gallwch ond chwilio am wybodaeth sydd eisoes wedi’i chyhoeddi”
EN: Button — “Continue”
CY: Button — “Dewiswch opsiwn”
EN: “Select how you want to add an email subscription.”
CY: “Dewiswch Sut ydych chi eisiau ychwanegu tanysgrifiad e-bost?”
EN: Title/H1 “By case name”
CY: Title/H1 “Yn ôl enw’r achos”
EN: Label — “Case name”
CY: Label — “Enw'r Achos”
EN: Button — “Continue”
CY: Button — “Dewiswch opsiwn”
EN: “Enter a case name”
CY: “Welsh placeholder”
EN: “No results found”
CY: “Welsh placeholder”
EN: Title/H1 “By case reference number, case ID or unique reference number (URN)”
CY: Title/H1 “Yn ôl enw’r achos, Yn ôl cyfeirnod yr achos, ID yr achos neu gyfeirnod unigryw (URN)”
EN: Label — “Reference number”
CY: Label — “Cyfeirnod”
EN: Button — “Continue”
CY: Button — “Dewiswch opsiwn”
EN: “Enter reference number”
CY: “Rhowch gyfeirnod achos dilys”
EN: “No matching case found”
CY: “Welsh placeholder”
EN: Title/H1 “Select a case”
CY: Title/H1 “Dewiswch yr achos”
EN: Table column headers — “Case name”, “Party name”, “Reference number”
CY: Table column headers — “Enw'r Achos”, “Enw’r parti”, “Cyfeirnod yr Achos”
EN: Button — “Continue”
CY: Button — “Dewiswch opsiwn”
EN: Title/H1 “Confirm email subscription”
CY: Title/H1 “Cadarnhewch tanysgrifiadau e-bost”
EN: Button — “Confirm”
CY: Button — “Cadarnhewch”
 EN: Title/H1 “Subscription added”
CY: Title/H1 “tanysgrifiadau wedi’i ychwanegu”
EN: Body text — “Your email subscription has been added.”
CY: Body text — “Eich tanysgrifiadau e-bost wedi’i ychwanegu”
EN: Link — “Email subscriptions”
CY: Link — “Welsh placeholder”


## Comments

### Comment by OgechiOkelu on 2026-04-20T16:18:38Z

@SPEC new-feature.md

### Comment by hmctsclaudecode on 2026-04-20T16:23:11Z

# Issue #510 — Subscribe by case name, case reference number, case ID or unique reference number (URN)

## 1. User Story

**As a** Verified Media User  
**I want to** subscribe to hearing lists in CaTH by case name or case reference number / ID / URN  
**So that** I can receive email notifications whenever a new list I subscribed to is published

---

## 2. Background

Verified Media Users are journalists and media professionals who have applied and been approved for a CaTH account. They can already subscribe to court and tribunal hearing lists by location (court/tribunal name). This feature extends the subscription system to also support subscriptions by case name and case reference number (including case ID and URN).

The implementation builds on the existing subscription infrastructure in `libs/subscriptions` and the verified pages in `libs/verified-pages`. Search lookups will use the `artefact_search` table (which already stores `case_name` and `case_number` metadata extracted from ingested artefacts).

This ticket branches from `feature/VIBE-316-refactor-artefact-search-extraction-subscription`.

Key architectural decisions:
- New `search_type` values `CASE_NUMBER` and `CASE_NAME` are added to the existing `subscription` table.
- Two new nullable display columns (`case_name`, `case_number`) are added to the `subscription` table for use on subscription management pages.
- The subscription-management page is updated to display tabs separating case subscriptions from court/tribunal subscriptions.
- A new `subscription-add` gateway page replaces the direct link to `location-name-search`, routing users to the correct search flow based on their selection.

---

## 3. Acceptance Criteria

* **Scenario:** Verified user views their email subscriptions page
    * **Given** the user is authenticated as a verified media user
    * **When** they navigate to `/subscription-management`
    * **Then** they see a page titled "Your email subscriptions" with an "Add email subscription" button and three tab options: "All subscriptions", "Subscriptions by case", and "Subscription by court or tribunal", each showing a count of active subscriptions in brackets

* **Scenario:** User with no subscriptions sees empty state
    * **Given** the user has no active subscriptions
    * **When** they view the email subscriptions page on any tab
    * **Then** the message "You do not have any active subscriptions" is displayed

* **Scenario:** User with case subscriptions views "Subscriptions by case" tab
    * **Given** the user has one or more active case subscriptions
    * **When** they click the "Subscriptions by case" tab
    * **Then** a table is shown with column headers "Case name", "Reference number", and "Date added"

* **Scenario:** User with court subscriptions views "Subscription by court or tribunal" tab
    * **Given** the user has one or more active court/tribunal subscriptions
    * **When** they click the "Subscription by court or tribunal" tab
    * **Then** a table is shown with column headers "Court or tribunal name" and "Date added"

* **Scenario:** User with both subscription types views "All subscriptions" tab
    * **Given** the user has both case subscriptions and court/tribunal subscriptions
    * **When** they view the "All subscriptions" tab
    * **Then** two tables are displayed: the case subscriptions table appears first, followed by the court or tribunal subscriptions table

* **Scenario:** User navigates to the add subscription gateway page
    * **Given** the user clicks the "Add email subscription" button
    * **When** they arrive at `/subscription-add`
    * **Then** they see the heading "How do you want to add an email subscription?", the body text "You can only search for information that is currently published.", and three radio options: "By court or tribunal name", "By case name", and "By case reference number, case ID or unique reference number (URN)"

* **Scenario:** User submits the gateway page without selecting an option
    * **Given** the user is on `/subscription-add`
    * **When** they click Continue without selecting a radio
    * **Then** a validation error is shown: "Select how you want to add an email subscription."

* **Scenario:** User selects "By court or tribunal name"
    * **Given** the user selects "By court or tribunal name" on the gateway page
    * **When** they click Continue
    * **Then** they are redirected to the existing `/location-name-search` page

* **Scenario:** User searches by case name — happy path
    * **Given** the user selects "By case name" and arrives at `/case-name-search`
    * **When** they enter a valid case name that matches published artefacts and click Continue
    * **Then** they see a results page at `/case-search-results` with a table listing matching cases

* **Scenario:** User searches by case name — empty submission
    * **Given** the user is on `/case-name-search`
    * **When** they submit an empty form
    * **Then** a validation error is shown: "Enter a case name"

* **Scenario:** User searches by case name — no results
    * **Given** the user is on `/case-name-search`
    * **When** they enter a term that matches no published artefacts
    * **Then** an error message is displayed: "No results found"

* **Scenario:** User searches by case reference number — happy path
    * **Given** the user selects "By case reference number, case ID or unique reference number (URN)" and arrives at `/case-reference-search`
    * **When** they enter a valid reference number matching a published artefact and click Continue
    * **Then** they see the results page at `/case-search-results`

* **Scenario:** User searches by case reference number — empty submission
    * **Given** the user is on `/case-reference-search`
    * **When** they submit an empty form
    * **Then** a validation error is shown: "Enter reference number"

* **Scenario:** User searches by case reference number — no results
    * **Given** the user is on `/case-reference-search`
    * **When** they enter a reference that matches no published artefacts
    * **Then** an error message is displayed: "No matching case found"

* **Scenario:** User selects a case from results and confirms
    * **Given** search results are displayed at `/case-search-results`
    * **When** the user selects a case and clicks Continue
    * **Then** they are taken to `/case-subscription-confirm` showing the selected case details

* **Scenario:** User confirms subscription
    * **Given** the user is on `/case-subscription-confirm`
    * **When** they click "Confirm"
    * **Then** the subscription is saved to the database and they are redirected to `/case-subscription-confirmed`

* **Scenario:** Subscription is immediately visible
    * **Given** the user has just confirmed a case subscription
    * **When** they navigate back to `/subscription-management`
    * **Then** the new subscription appears in the "Subscriptions by case" and "All subscriptions" tabs immediately

* **Scenario:** Subscription fulfillment on artefact ingestion
    * **Given** a subscription exists with `search_type = CASE_NUMBER` and `search_value = "ABC123"`
    * **When** a new artefact is ingested with a matching `case_number = "ABC123"` in `artefact_search`
    * **Then** the existing notification process triggers an email notification for the subscriber

---

## 4. User Journey Flow

### Journey A: Subscribe by Case Name

```
[subscription-management]
        |
        | (click "Add email subscription")
        v
[subscription-add]  ──(no selection)──> [validation error, stay on page]
        |
        | (select "By case name", click Continue)
        v
[case-name-search]  ──(empty submit)──> [validation error, stay on page]
        |                               [no results]──> [error on same page]
        | (enter name, click Continue, results found)
        v
[case-search-results]
        |
        | (select case, click Continue)
        v
[case-subscription-confirm]
        |
        | (click Confirm)
        v
[case-subscription-confirmed]
        |
        | (click "Email subscriptions" link)
        v
[subscription-management]
```

### Journey B: Subscribe by Case Reference Number / ID / URN

```
[subscription-add]
        |
        | (select "By case reference number, case ID or URN", click Continue)
        v
[case-reference-search]  ──(empty submit)──> [validation error, stay on page]
        |                                    [no match]──> [error on same page]
        | (enter reference, click Continue, match found)
        v
[case-search-results]
        |
        | (select case, click Continue)
        v
[case-subscription-confirm]
        |
        | (click Confirm)
        v
[case-subscription-confirmed]
```

### Journey C: Subscribe by Court or Tribunal Name (existing, via new gateway)

```
[subscription-add]
        |
        | (select "By court or tribunal name", click Continue)
        v
[location-name-search]  ──> [existing flow unchanged]
```

---

## 5. Low Fidelity Wireframes

### Screen 1 — Your Email Subscriptions (updated subscription-management)

```
+------------------------------------------------------------------+
| [GOV.UK Header]                                                  |
| Court and tribunal hearings | Dashboard | Email subscriptions    |
+------------------------------------------------------------------+
| < Back                                                           |
|                                                                  |
| Your email subscriptions                               [H1]      |
|                                                                  |
| [Add email subscription]  [Bulk unsubscribe]                     |
|                                                                  |
| [All subscriptions (3)] [Subscriptions by case (2)]              |
| [Subscription by court or tribunal (1)]                          |
|                                                                  |
| --- Subscription by case ---                                     |
| +--------------------+------------------+-------------+          |
| | Case name          | Reference number | Date added  |          |
| +--------------------+------------------+-------------+          |
| | Smith v Jones      | AB-123           | 20 Apr 2026 |          |
| | R v Doe            | CD-456           | 19 Apr 2026 |          |
| +--------------------+------------------+-------------+          |
|                                                                  |
| --- Subscription by court or tribunal ---                        |
| +-------------------------------+-------------+                  |
| | Court or tribunal name        | Date added  |                  |
| +-------------------------------+-------------+                  |
| | Leeds Crown Court             | 18 Apr 2026 |                  |
| +-------------------------------+-------------+                  |
+------------------------------------------------------------------+
| [GOV.UK Footer]                                                  |
+------------------------------------------------------------------+
```

### Screen 2 — Add Email Subscription Gateway (subscription-add)

```
+------------------------------------------------------------------+
| [GOV.UK Header]                                                  |
| Court and tribunal hearings | Dashboard | Email subscriptions    |
+------------------------------------------------------------------+
| < Back                                                           |
|                                                                  |
| How do you want to add an email subscription?          [H1]      |
|                                                                  |
| You can only search for information that is currently published. |
|                                                                  |
| ( ) By court or tribunal name                                    |
| ( ) By case name                                                 |
| ( ) By case reference number, case ID or unique                  |
|     reference number (URN)                                       |
|                                                                  |
| [Continue]                                                       |
+------------------------------------------------------------------+
| [GOV.UK Footer]                                                  |
+------------------------------------------------------------------+
```

### Screen 3 — Case Name Search (case-name-search)

```
+------------------------------------------------------------------+
| [GOV.UK Header]                                                  |
+------------------------------------------------------------------+
| < Back                                                           |
|                                                                  |
| By case name                                           [H1]      |
|                                                                  |
| Case name                                                        |
| +-----------------------------------------------+               |
| |                                               |               |
| +-----------------------------------------------+               |
|                                                                  |
| [Continue]                                                       |
+------------------------------------------------------------------+
```

### Screen 3 (error state) — Case Name Search — No Results

```
+------------------------------------------------------------------+
| [GOV.UK Header]                                                  |
+------------------------------------------------------------------+
| < Back                                                           |
|                                                                  |
| There is a problem                                     [H2]      |
| - No results found                                               |
|                                                                  |
| By case name                                           [H1]      |
|                                                                  |
| ! No results found                                               |
|                                                                  |
| Case name                                                        |
| +-----------------------------------------------+               |
| | Smith Jones                                   |               |
| +-----------------------------------------------+               |
|                                                                  |
| [Continue]                                                       |
+------------------------------------------------------------------+
```

### Screen 3 (variant) — Case Reference Number Search (case-reference-search)

```
+------------------------------------------------------------------+
| [GOV.UK Header]                                                  |
+------------------------------------------------------------------+
| < Back                                                           |
|                                                                  |
| By case reference number, case ID or unique            [H1]      |
| reference number (URN)                                           |
|                                                                  |
| Reference number                                                 |
| +-----------------------------------------------+               |
| |                                               |               |
| +-----------------------------------------------+               |
|                                                                  |
| [Continue]                                                       |
+------------------------------------------------------------------+
```

### Screen 4 — Select a Case (case-search-results)

```
+------------------------------------------------------------------+
| [GOV.UK Header]                                                  |
+------------------------------------------------------------------+
| < Back                                                           |
|                                                                  |
| Select a case                                          [H1]      |
|                                                                  |
| +---------+------------------+-------------------+              |
| |         | Case name        | Reference number  |              |
| +---------+------------------+-------------------+              |
| | ( )     | Smith v Jones    | AB-2024-00123     |              |
| | ( )     | Smith v Crown    | AB-2024-00456     |              |
| +---------+------------------+-------------------+              |
|                                                                  |
| [Continue]                                                       |
+------------------------------------------------------------------+
```

### Screen 5 — Confirm Email Subscription (case-subscription-confirm)

```
+------------------------------------------------------------------+
| [GOV.UK Header]                                                  |
+------------------------------------------------------------------+
| < Back                                                           |
|                                                                  |
| Confirm email subscription                             [H1]      |
|                                                                  |
| +------------------+------------------------------+             |
| | Case name        | Smith v Jones                |             |
| +------------------+------------------------------+             |
| | Reference number | AB-2024-00123                |             |
| +------------------+------------------------------+             |
|                                                                  |
| [Confirm]                                                        |
+------------------------------------------------------------------+
```

### Screen 6 — Subscription Added (case-subscription-confirmed)

```
+------------------------------------------------------------------+
| [GOV.UK Header]                                                  |
+------------------------------------------------------------------+
|                                                                  |
| +------------------------------------------------------------+  |
| |  Subscription added                                        |  |
| +------------------------------------------------------------+  |
|                                                                  |
| Your email subscription has been added.                         |
|                                                                  |
| Email subscriptions                                             |
+------------------------------------------------------------------+
```

---

## 6. Page Specifications

### 6.1 Subscription Management Page (UPDATED)

**File:** `libs/verified-pages/src/pages/subscription-management/`

The page is updated to display three tab options above the subscriptions table. Tabs are implemented as anchor links that pass a `tab` query parameter (`?tab=all`, `?tab=case`, `?tab=court`). The default tab is `all`.

**Tab: All subscriptions**
- If the user has case subscriptions, display the "Subscription by case" table first.
- If the user has court subscriptions, display the "Subscription by court or tribunal" table below.
- If neither, display the empty state message.

**Tab: Subscriptions by case**
- Table columns: "Case name", "Reference number", "Date added"
- Each row has an "Unsubscribe" action link.
- Data source: `getCaseSubscriptionsByUserId(userId, locale)` — returns subscriptions where `searchType IN ('CASE_NAME', 'CASE_NUMBER')`, with `caseName` and `caseNumber` from the new columns.

**Tab: Subscription by court or tribunal**
- Table columns: "Court or tribunal name", "Date added"
- Each row has an "Unsubscribe" action link.
- Data source: `getCourtSubscriptionsByUserId(userId, locale)` — unchanged.

The tab counts are derived from the lengths of each result set, fetched in a single controller call.

The "Add email subscription" button links to `/subscription-add` (changed from the current `/location-name-search` direct link).

### 6.2 Subscription Add Gateway Page (NEW)

**File:** `libs/verified-pages/src/pages/subscription-add/`

- GET: Renders the radio selection page.
- POST: Validates a radio option is selected. Redirects based on selection:
  - `LOCATION` → `/location-name-search`
  - `CASE_NAME` → `/case-name-search`
  - `CASE_NUMBER` → `/case-reference-search`
- Stores the selected subscription type in `req.session.emailSubscriptions.subscriptionType` before redirecting, for back-navigation context.

### 6.3 Case Name Search Page (NEW)

**File:** `libs/verified-pages/src/pages/case-name-search/`

- GET: Renders text input form. Repopulates input value from `req.session.emailSubscriptions.caseNameSearch` if returning from results page.
- POST: Validates the input is not empty. Queries `artefact_search` via `searchByCaseName(term)`. If no results, re-renders with error. If results found, stores results in `req.session.emailSubscriptions.caseSearchResults` and redirects to `/case-search-results`.

### 6.4 Case Reference Search Page (NEW)

**File:** `libs/verified-pages/src/pages/case-reference-search/`

- GET: Renders text input form. Repopulates input from `req.session.emailSubscriptions.caseReferenceSearch` if returning.
- POST: Validates the input is not empty. Queries `artefact_search` via `searchByCaseNumber(reference)`. If no results, re-renders with error. If results found, stores results in session and redirects to `/case-search-results`.

### 6.5 Case Search Results Page (NEW)

**File:** `libs/verified-pages/src/pages/case-search-results/`

- GET: Reads results from `req.session.emailSubscriptions.caseSearchResults`. If session data is missing, redirects back to the appropriate search page. Renders a table of results as radio button rows. Each row value encodes both `caseName` and `caseNumber` as a composite identifier (e.g., a JSON-encoded string or `caseNumber` alone where unique).
- POST: Validates a case is selected. Stores the selected case (`caseName`, `caseNumber`, `searchType`) in `req.session.emailSubscriptions.pendingCaseSubscription`. Redirects to `/case-subscription-confirm`.

**Table columns:** Case name | Reference number (Party name is listed in the acceptance criteria column headers but omitted from `artefact_search` — see Assumptions section)

### 6.6 Case Subscription Confirm Page (NEW)

**File:** `libs/verified-pages/src/pages/case-subscription-confirm/`

- GET: Reads pending subscription details from `req.session.emailSubscriptions.pendingCaseSubscription`. If missing, redirects to `/subscription-management`. Renders a summary list of the selected case.
- POST: Calls `createCaseSubscription(userId, searchType, searchValue, caseName, caseNumber)` from `libs/subscriptions`. On success, clears the session data and redirects to `/case-subscription-confirmed`. On error (e.g., duplicate subscription), re-renders with an appropriate error message.

### 6.7 Case Subscription Confirmed Page (NEW)

**File:** `libs/verified-pages/src/pages/case-subscription-confirmed/`

- GET: Renders confirmation panel with "Subscription added" heading and a link back to `/subscription-management`.
- No POST handler.

---

## 7. Content

### Subscription Management Page (updated content additions)

| Key | EN | CY |
|-----|----|----|
| `tabAllSubscriptions` | "All subscriptions" | Pob tanysgrifiad |
| `tabByCase` | "Subscriptions by case" | Tanysgrifiadau yn 'l achos |
| `tabByCourt` | "Subscription by court or tribunal" | [WELSH TRANSLATION REQUIRED: "Subscription by court or tribunal"] |
| `tableHeaderCaseName` | "Case name" | Enw'r Achos |
| `tableHeaderReferenceNumber` | "Reference number" | Cyfeirnod |
| `tableHeaderDateAdded` | "Date added" | Dyddiad wedi'i ychwanegu |
| `caseSubscriptionsHeading` | "Subscription by case" | [WELSH TRANSLATION REQUIRED: "Subscription by case"] |
| `courtSubscriptionsHeading` | "Subscription by court or tribunal" | [WELSH TRANSLATION REQUIRED: "Subscription by court or tribunal"] |

### Subscription Add Gateway (en.ts / cy.ts)

| Key | EN | CY |
|-----|----|----|
| `title` | "How do you want to add an email subscription?" | Sut ydych chi eisiau ychwanegu tanysgrifiad e-bost? |
| `heading` | "How do you want to add an email subscription?" | Sut ydych chi eisiau ychwanegu tanysgrifiad e-bost? |
| `bodyText` | "You can only search for information that is currently published." | Gallwch ond chwilio am wybodaeth sydd eisoes wedi'i chyhoeddi . |
| `optionByCourt` | "By court or tribunal name" | Yn 'l enw'r llys neu dribiwnlys |
| `optionByCaseName` | "By case name" | Yn 'l enw'r achos |
| `optionByCaseReference` | "By case reference number, case ID or unique reference number (URN)" | Yn 'l cyfeirnod yr achos, ID yr achos neu gyfeirnod unigryw (URN) |
| `continueButton` | "Continue" | Parhau |
| `errorNoSelection` | "Select how you want to add an email subscription." | [WELSH TRANSLATION REQUIRED: "Select how you want to add an email subscription."] |
| `errorSummaryTitle` | "There is a problem" | Mae problem |

### Case Name Search (en.ts / cy.ts)

| Key | EN | CY |
|-----|----|----|
| `title` | "By case name" | Yn 'l enw'r achos |
| `heading` | "By case name" | Yn 'l enw'r achos |
| `caseNameLabel` | "Case name" | Enw'r Achos |
| `continueButton` | "Continue" | Parhau |
| `errorEmpty` | "Enter a case name" | [WELSH TRANSLATION REQUIRED: "Enter a case name"] |
| `errorNoResults` | "No results found" | Ni ddaethpwyd o hyd i unrhyw ganlyniad |
| `errorSummaryTitle` | "There is a problem" | Mae problem |

### Case Reference Search (en.ts / cy.ts)

| Key | EN | CY |
|-----|----|----|
| `title` | "By case reference number, case ID or unique reference number (URN)" | Yn 'l cyfeirnod yr achos, ID yr achos neu gyfeirnod unigryw (URN) |
| `heading` | "By case reference number, case ID or unique reference number (URN)" | Yn 'l cyfeirnod yr achos, ID yr achos neu gyfeirnod unigryw (URN) |
| `referenceLabel` | "Reference number" | Cyfeirnod |
| `continueButton` | "Continue" | Parhau |
| `errorEmpty` | "Enter reference number" | [WELSH TRANSLATION REQUIRED: "Enter reference number"] |
| `errorNoResults` | "No matching case found" | [WELSH TRANSLATION REQUIRED: "No matching case found"] |
| `errorSummaryTitle` | "There is a problem" | Mae problem |

### Case Search Results (en.ts / cy.ts)

| Key | EN | CY |
|-----|----|----|
| `title` | "Select a case" | [WELSH TRANSLATION REQUIRED: "Select a case"] |
| `heading` | "Select a case" | [WELSH TRANSLATION REQUIRED: "Select a case"] |
| `columnCaseName` | "Case name" | Enw'r Achos |
| `columnReferenceNumber` | "Reference number" | Cyfeirnod |
| `continueButton` | "Continue" | Parhau |
| `errorNoSelection` | "Select a case" | [WELSH TRANSLATION REQUIRED: "Select a case"] |
| `errorSummaryTitle` | "There is a problem" | Mae problem |

### Case Subscription Confirm (en.ts / cy.ts)

| Key | EN | CY |
|-----|----|----|
| `title` | "Confirm email subscription" | [WELSH TRANSLATION REQUIRED: "Confirm email subscription"] |
| `heading` | "Confirm email subscription" | [WELSH TRANSLATION REQUIRED: "Confirm email subscription"] |
| `labelCaseName` | "Case name" | Enw'r Achos |
| `labelReferenceNumber` | "Reference number" | Cyfeirnod |
| `confirmButton` | "Confirm" | [WELSH TRANSLATION REQUIRED: "Confirm"] |
| `errorDuplicate` | "You are already subscribed to this case" | [WELSH TRANSLATION REQUIRED: "You are already subscribed to this case"] |

### Case Subscription Confirmed (en.ts / cy.ts)

| Key | EN | CY |
|-----|----|----|
| `title` | "Subscription added" | [WELSH TRANSLATION REQUIRED: "Subscription added"] |
| `heading` | "Subscription added" | [WELSH TRANSLATION REQUIRED: "Subscription added"] |
| `bodyText` | "Your email subscription has been added." | [WELSH TRANSLATION REQUIRED: "Your email subscription has been added."] |
| `emailSubscriptionsLink` | "Email subscriptions" | [WELSH TRANSLATION REQUIRED: "Email subscriptions"] |

---

## 8. URL

| Page | Path | Method |
|------|------|--------|
| Email subscriptions (updated) | `/subscription-management` | GET |
| Add email subscription gateway | `/subscription-add` | GET, POST |
| Case name search | `/case-name-search` | GET, POST |
| Case reference search | `/case-reference-search` | GET, POST |
| Case search results | `/case-search-results` | GET, POST |
| Case subscription confirm | `/case-subscription-confirm` | GET, POST |
| Case subscription confirmed | `/case-subscription-confirmed` | GET |
| Court/tribunal search (existing) | `/location-name-search` | GET, POST (unchanged) |

---

## 9. Validation

### Subscription Add Gateway (`/subscription-add`)

| Field | Rule | Error message |
|-------|------|---------------|
| `subscriptionType` (radio) | Must be one of: `LOCATION`, `CASE_NAME`, `CASE_NUMBER` | "Select how you want to add an email subscription." |

### Case Name Search (`/case-name-search`)

| Field | Rule | Error message |
|-------|------|---------------|
| `caseName` | Must not be empty | "Enter a case name" |
| `caseName` | After query: must return at least one result | "No results found" |

### Case Reference Search (`/case-reference-search`)

| Field | Rule | Error message |
|-------|------|---------------|
| `caseReference` | Must not be empty | "Enter reference number" |
| `caseReference` | After query: must return at least one result | "No matching case found" |

### Case Search Results (`/case-search-results`)

| Field | Rule | Error message |
|-------|------|---------------|
| `selectedCase` (radio) | Must have a value selected | "Select a case" |

### Case Subscription Confirm (`/case-subscription-confirm`)

No form fields on GET. The POST action validates server-side:
- Subscription must not already exist for this user + searchType + searchValue combination (unique constraint on database enforces this; handle `Prisma P2002` error gracefully).

---

## 10. Error Messages

All error messages follow the GOV.UK error pattern: an error summary at the top of the page (linking to the relevant field) and an inline error message below the affected field.

| Context | Summary text | Inline field text |
|---------|-------------|-------------------|
| Gateway — no option selected | "There is a problem — Select how you want to add an email subscription." | "Select how you want to add an email subscription." |
| Case name — empty | "There is a problem — Enter a case name" | "Enter a case name" |
| Case name — no results | "There is a problem — No results found" | "No results found" |
| Case reference — empty | "There is a problem — Enter reference number" | "Enter reference number" |
| Case reference — no results | "There is a problem — No matching case found" | "No matching case found" |
| Results page — no case selected | "There is a problem — Select a case" | "Select a case" |
| Confirm — duplicate subscription | "There is a problem — You are already subscribed to this case" | "You are already subscribed to this case" |

---

## 11. Navigation

### Back Links

| Page | Back link destination |
|------|-----------------------|
| `/subscription-add` | `/subscription-management` |
| `/case-name-search` | `/subscription-add` |
| `/case-reference-search` | `/subscription-add` |
| `/case-search-results` | Back to the search page that produced results (stored in session as `req.session.emailSubscriptions.searchSource`: either `/case-name-search` or `/case-reference-search`) |
| `/case-subscription-confirm` | `/case-search-results` |
| `/case-subscription-confirmed` | No back link (confirmation page) |

### Post-Action Redirects

| Action | Redirect destination |
|--------|----------------------|
| Gateway: select LOCATION, click Continue | `/location-name-search` |
| Gateway: select CASE_NAME, click Continue | `/case-name-search` |
| Gateway: select CASE_NUMBER, click Continue | `/case-reference-search` |
| Case name search: results found | `/case-search-results` |
| Case reference search: results found | `/case-search-results` |
| Results: case selected, click Continue | `/case-subscription-confirm` |
| Confirm: click Confirm (success) | `/case-subscription-confirmed` |
| Confirmed: click "Email subscriptions" link | `/subscription-management` |

### Navigation Bar

All verified pages must show the top navigation with active state on "Email subscriptions" when the user is on any subscription-related page. `buildVerifiedUserNavigation(req.path, locale)` handles this automatically.

---

## 12. Accessibility

- All pages must pass WCAG 2.2 AA.
- The tab navigation on subscription-management must be implemented as anchor links (not JavaScript-only tabs) so it works without JS. Active tab is indicated by `aria-current="true"` on the active link.
- The case search results table uses radio buttons for selection; the `<fieldset>` and `<legend>` must wrap the table for screen reader context. Legend text: "Select a case".
- Error summaries must include `role="alert"` and focus must move to the error summary on page load when errors are present (standard GOV.UK error summary behaviour).
- The confirmation panel on the "Subscription added" page uses `govukPanel` which includes the appropriate ARIA role.
- Form labels on search pages must be associated with their inputs via `for`/`id` attributes (handled automatically by `govukInput` macro).
- Back links must have descriptive text (e.g., "Back to subscription options") rather than a generic "Back" where the destination is ambiguous. Use the standard GOV.UK back link component.
- All axe-core accessibility checks must pass inline within E2E tests.

---

## 13. Database Changes

### Schema Update — `libs/subscriptions/prisma/schema.prisma`

Add two optional fields to the `Subscription` model to store display values for case subscriptions:

```prisma
model Subscription {
  subscriptionId String    @id @default(uuid()) @map("subscription_id") @db.Uuid
  userId         String    @map("user_id") @db.Uuid
  searchType     String    @map("search_type") @db.VarChar(50)
  searchValue    String    @map("search_value")
  caseName       String?   @map("case_name")
  caseNumber     String?   @map("case_number")
  dateAdded      DateTime  @default(now()) @map("date_added")

  user                  User                   @relation(fields: [userId], references: [userId], onDelete: Cascade, onUpdate: Cascade)
  notificationAuditLogs NotificationAuditLog[]

  @@unique([userId, searchType, searchValue], name: "unique_user_subscription")
  @@index([userId], name: "idx_subscription_user")
  @@index([searchType, searchValue], name: "idx_subscription_search")
  @@map("subscription")
}
```

`searchType` valid values (stored as strings):
- `LOCATION_ID` — existing, for court/tribunal subscriptions
- `CASE_NAME` — new, for subscriptions by case name
- `CASE_NUMBER` — new, for subscriptions by case reference number / ID / URN

A Prisma migration is required. Run `yarn db:migrate:dev` after schema update.

### New Service Functions — `libs/subscriptions/src/repository/service.ts`

```typescript
// Create a case subscription
export async function createCaseSubscription(
  userId: string,
  searchType: "CASE_NAME" | "CASE_NUMBER",
  searchValue: string,
  caseName: string,
  caseNumber: string | null
): Promise<void>

// Get case subscriptions for a user (implements the existing stub)
export async function getCaseSubscriptionsByUserId(
  userId: string,
  locale?: string
): Promise<CaseSubscriptionDto[]>
```

### New Query Functions — `libs/subscriptions/src/repository/queries.ts`

```typescript
// Search artefact_search by case name (partial match, case-insensitive)
export async function searchByCaseName(term: string): Promise<CaseSearchResult[]>

// Search artefact_search by case number (exact match)
export async function searchByCaseNumber(reference: string): Promise<CaseSearchResult[]>

// Create subscription record with case fields
export async function createCaseSubscriptionRecord(
  userId: string,
  searchType: string,
  searchValue: string,
  caseName: string,
  caseNumber: string | null
): Promise<Subscription>

// Find all case subscriptions for a user
export async function findCaseSubscriptionsByUserId(userId: string): Promise<Subscription[]>
```

### Subscription Fulfillment

The existing notification process must be updated to handle `CASE_NUMBER` subscriptions. When an artefact is ingested:
1. Query `subscription` table for records where `searchType = 'CASE_NUMBER'` and `searchValue` matches the `case_number` in the new `artefact_search` entry.
2. Trigger the existing notification email via Gov Notify for each matched subscriber.

The `CASE_NAME` search type does not require fulfillment changes (subscriptions by name are matched at search/selection time, not at ingestion time).

---

## 14. Test Scenarios

### Unit Tests (`*.test.ts` co-located with source)

* `subscription-add` GET renders page with radio options and both `en` and `cy` translations
* `subscription-add` POST with no selection re-renders with validation error
* `subscription-add` POST with `CASE_NAME` selection redirects to `/case-name-search`
* `subscription-add` POST with `CASE_NUMBER` selection redirects to `/case-reference-search`
* `subscription-add` POST with `LOCATION` selection redirects to `/location-name-search`
* `case-name-search` GET renders form
* `case-name-search` POST with empty input re-renders with validation error
* `case-name-search` POST with no-results response re-renders with "No results found" error
* `case-name-search` POST with results stores results in session and redirects to `/case-search-results`
* `case-reference-search` POST with empty input re-renders with validation error
* `case-reference-search` POST with no results re-renders with "No matching case found" error
* `case-search-results` GET with missing session data redirects to appropriate search page
* `case-search-results` POST with no selection re-renders with validation error
* `case-search-results` POST with valid selection stores to session and redirects to `/case-subscription-confirm`
* `case-subscription-confirm` GET with missing session data redirects to `/subscription-management`
* `case-subscription-confirm` POST calls `createCaseSubscription` and redirects to confirmed page
* `case-subscription-confirm` POST handles duplicate subscription error and re-renders with error
* `createCaseSubscription` service function creates record with correct `searchType`, `searchValue`, `caseName`, `caseNumber`
* `getCaseSubscriptionsByUserId` returns correct DTO for both `CASE_NAME` and `CASE_NUMBER` subscriptions
* `searchByCaseName` query returns results matching partial case name (case-insensitive)
* `searchByCaseNumber` query returns results matching exact case number
* subscription-management GET with case subscriptions passes correct data to template for all three tab states

### E2E Tests (`e2e-tests/`)

* `user can subscribe to a case by name @nightly` — covers full journey: select "By case name", enter search term, select case from results, confirm, see confirmation page, verify subscription appears in subscription-management; includes Welsh translation check and accessibility scan inline
* `user can subscribe to a case by reference number @nightly` — covers full journey: select "By case reference number, case ID or URN", enter reference, select case, confirm, see confirmation page; includes validation checks for empty input and no-match error, Welsh translation check and accessibility scan inline
* `user sees validation errors on subscription-add page @nightly` — covered inline within the case name journey test above

---

## 15. Assumptions & Open Questions

* **Party name column**: The acceptance criteria list "Party name" as a column in the case search results table, but `artefact_search` does not appear to store a party name field. The spec omits this column pending clarification. If it is needed, `artefact_search` schema must be extended or the column sourced elsewhere.

* **CASE_NAME fulfillment**: The issue specifies that `CASE_NUMBER` subscriptions are fulfilled when a matching artefact is ingested. It does not explicitly specify fulfilment for `CASE_NAME` subscriptions. This spec assumes `CASE_NAME` subscriptions are display-only (the user subscribed by name after finding and selecting a specific case, so the actual matching at notification time uses the case number stored in `caseNumber` column). Clarification is needed if `CASE_NAME` subscriptions should also trigger notifications.

* **Session structure**: This spec assumes the existing `req.session.emailSubscriptions` namespace is used for all subscription wizard state, consistent with the existing `pendingSubscriptions` pattern. If the session type needs extending, the `Session` interface in the auth/session module will need updating.

* **Search result limits**: No upper limit for search results is defined in the issue. A sensible default (e.g., 50 results) should be applied to the `searchByCaseName` query to prevent unbounded result sets.

* **Case number uniqueness**: The spec assumes `case_number` values in `artefact_search` are not guaranteed unique across different cases. The results page therefore shows all matches, letting the user select the specific case they mean.

* **Feature branch**: This ticket must branch from `feature/VIBE-316-refactor-artefact-search-extraction-subscription`. Ensure that branch is up to date with master before starting work.

* **`subscription-add` as new gateway**: The existing "Add email subscription" button on `subscription-management` currently links directly to `/location-name-search`. This must be updated to point to `/subscription-add`. This is a breaking change to the existing location subscription journey and must be communicated to QA.


### Comment by OgechiOkelu on 2026-04-20T16:24:01Z

@plan 

### Comment by hmctsclaudecode on 2026-04-20T16:36:16Z

## Technical plan — clarifying questions

I've created a technical implementation plan on branch `feature/510-subscribe-by-case` in `docs/tickets/510/plan.md`.

Before implementation starts, the following questions need answers:

**1. Party name column**
The acceptance criteria list "Party name" as a results table column, but the `artefact_search` table has no `party_name` field — only `case_name` and `case_number`. Should this column be included? If yes, the `artefact_search` schema needs extending, which would require a separate ticket.

**2. CASE_NAME subscription fulfillment**
The issue specifies that `CASE_NUMBER` subscriptions trigger email notifications when a matching artefact is ingested. Does a `CASE_NAME` subscription also trigger notifications? The plan assumes the selected case's `caseNumber` is stored and used for matching at notification time, but this needs confirmation.

**3. Feature branch availability**
The ticket specifies branching from `feature/VIBE-316-refactor-artefact-search-extraction-subscription`. This branch does not exist on the remote. Please confirm it will be available before implementation starts, or confirm whether we should branch from master.

**4. Missing Welsh translations**
The following strings have no Welsh translation in the issue and are marked as placeholders in the plan:
- "By court or tribunal name" radio option
- "By case name" radio option  
- "By case reference number, case ID or unique reference number (URN)" radio option
- "Enter a case name" (validation error)
- "No results found" (case name search)
- "No matching case found" (case reference search)
- "Select a case" (validation error on results page)
- "Confirm email subscription" heading Welsh
- "Subscription added" heading Welsh
- "Your email subscription has been added." body Welsh
- "Email subscriptions" link Welsh

Can a content designer provide these before implementation?

**5. Entry point change impact**
The plan changes the "Add email subscription" button on the subscriptions page to point to `/subscription-add` (the new gateway) instead of going directly to `/location-name-search`. This alters the existing court/tribunal subscription journey — QA should regression-test that flow through the new gateway.

