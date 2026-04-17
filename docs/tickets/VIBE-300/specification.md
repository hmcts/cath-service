# VIBE-300: Subscribe by case name, case reference number, case ID or unique reference number (URN)

## Problem Statement

Verified media users need the ability to subscribe to hearing lists by case-specific identifiers (case name, case reference number, case ID, or URN), not just by location. This enables users to receive email notifications for specific cases they are monitoring.

## User Story

**As a** verified media user
**I want** to subscribe to hearing lists in CaTH
**So that** I can receive email notifications whenever a list I subscribed to is published.

## Pre-conditions

- User has valid credentials and is approved as a verified media user
- Only published information is available for searching
- Email notifications are implemented in Gov Notify
- `artefact_search` table exists (from VIBE-316) with case data
- Subscription table has `search_type` and `search_value` columns (from VIBE-316)

## Technical Requirements

### Database Changes

**Subscription Table Updates:**
- Add column: `case_name` (text, nullable) - display name of the case
- Add column: `case_number` (text, nullable) - normalized case number for matching
- Existing columns from VIBE-316:
  - `search_type` (varchar 50)
  - `search_value` (text)

**Data Storage Rules:**
- When subscribing by case name:
  - `search_type` = `'CASE_NUMBER'`
  - `search_value` = resolved case number
  - `case_number` = resolved case number (duplicate for clarity)
  - `case_name` = entered/displayed case name
- When subscribing by case reference/ID/URN:
  - `search_type` = `'CASE_NUMBER'`
  - `search_value` = case number
  - `case_number` = case number
  - `case_name` = case name (if available from search results)

### User Journey Pages

#### 1. Verified User Dashboard
- **Entry point** after sign-in
- Navigation links:
  - "Court and tribunal hearings"
  - "Dashboard"
  - "Email subscriptions"

#### 2. Your Email Subscriptions
- **URL**: `/subscription-management` or `/email-subscriptions`
- **Access**: Verified users only
- **Content**:
  - H1: "Your email subscriptions"
  - Button: "Add email subscription" (green)
  - Display tabs:
    - "All subscriptions" (shows count)
    - "Subscriptions by case" (shows count)
    - "Subscription by court or tribunal" (shows count)
  - Empty state: "You do not have any active subscriptions"

**Subscriptions by Case Table:**
- Columns: Case name, Reference number, Date added, Checkbox
- Displays all case-based subscriptions

**Subscriptions by Court or Tribunal Table:**
- Columns: Court or tribunal name, Date added, Checkbox
- Displays all location-based subscriptions

**All Subscriptions:**
- Shows both tables if both types exist

#### 3. How Do You Want to Add an Email Subscription?
- **Form field**: Subscription method (radio buttons, required)
- **Options**:
  - By court or tribunal name
  - By case name
  - By case reference number, case ID or unique reference number (URN)
- **Body text**: "You can only search for information that is currently published."
- **Validation**: Must select one option

#### 4. Enter Case Name (if "By case name" selected)
- **Form field**: Case name (text, required, max 255 characters)
- **Validation**:
  - Must not be empty
  - Search `artefact_search` table for matching case names
  - Display error if no results found: "No results found"

#### 5. Enter Case Reference Number / URN (if "By case reference..." selected)
- **Form field**: Reference number (text, required, alphanumeric and symbols)
- **Validation**:
  - Must not be empty
  - Search `artefact_search` table for matching case numbers
  - Display error if no match: "No matching case found"

#### 6. Case Search Results
- **Form field**: Case selection (radio buttons, required)
- **Table columns**: Case name, Party name, Reference number
- **Validation**: Must select one case

#### 7. Confirm Email Subscription
- **Content**: Display selected case details
- **Button**: "Confirm"
- **Action**: Create subscription record

#### 8. Subscription Added
- **Content**: "Your email subscription has been added."
- **Link**: "Email subscriptions" (returns to subscription management page)

### Search Logic

**By Case Name:**
1. Query `artefact_search` table: `WHERE case_name ILIKE '%{search_term}%'`
2. Return matching cases with case_number and case_name
3. If multiple results, show search results page
4. If single result, proceed directly to confirmation

**By Case Reference/ID/URN:**
1. Query `artefact_search` table: `WHERE case_number = '{reference}'`
2. Return exact match
3. If found, show search results (or proceed directly to confirmation)
4. If not found, display "No matching case found"

### Subscription Creation

When user confirms subscription:
1. Create subscription record:
   - `user_id` = current user ID
   - `search_type` = `'CASE_NUMBER'`
   - `search_value` = case number from search results
   - `case_name` = case name (if available)
   - `created_at` = current timestamp
2. Subscription appears immediately in user's subscription table
3. Redirect to confirmation page

### Subscription Fulfilment

When an artefact is published:
1. Extract case information into `artefact_search` table (VIBE-316 functionality)
2. Query subscriptions:
   ```sql
   WHERE search_type = 'CASE_NUMBER'
   AND search_value IN (SELECT case_number FROM artefact_search WHERE artefact_id = :artefact_id)
   ```
3. Send notification emails to matched subscriptions via Gov Notify

### Content Requirements

All content must be provided in both English and Welsh.

**Dashboard:**
- EN: Title "Dashboard"
- EN: Navigation "Court and tribunal hearings", "Dashboard", "Email subscriptions"
- CY: Translations provided in ticket description

**Your Email Subscriptions:**
- EN: Title "Your email subscriptions"
- EN: Button "Add email subscription"
- EN: Tabs "All subscriptions", "Subscriptions by case", "Subscription by court or tribunal"
- EN: Empty state "You do not have any active subscriptions"
- CY: Translations provided

**Subscription Method Selection:**
- EN: Title "How do you want to add an email subscription?"
- EN: Body "You can only search for information that is currently published."
- EN: Options as listed above
- EN: Error "Select how you want to add an email subscription."
- CY: Translations provided

**Enter Case Name:**
- EN: Title "By case name"
- EN: Label "Case name"
- EN: Error "Enter a case name"
- EN: Error "No results found"
- CY: Translations needed

**Enter Reference Number:**
- EN: Title "By case reference number, case ID or unique reference number (URN)"
- EN: Label "Reference number"
- EN: Error "Enter reference number"
- EN: Error "No matching case found"
- CY: Translations provided

**Search Results:**
- EN: Title "Select a case"
- EN: Table headers "Case name", "Party name", "Reference number"
- EN: Error "Select a case to continue"
- CY: Translations needed

**Confirmation:**
- EN: Title "Confirm email subscription"
- EN: Button "Confirm"
- CY: Translations provided

**Success:**
- EN: Title "Subscription added"
- EN: Body "Your email subscription has been added."
- EN: Link "Email subscriptions"
- CY: Translations provided

## Accessibility Requirements

- WCAG 2.2 AA standards compliance
- Radio buttons and tables fully keyboard accessible
- Error messages announced to assistive technologies
- Unique and descriptive page headings
- Proper form labels and error associations

## Test Scenarios

1. Verified media user can access Email Subscriptions from dashboard
2. User with no subscriptions sees empty state message
3. Validation errors appear when required inputs are missing
4. Subscribing without selecting a method displays validation error
5. Case search by name returns results based on published information only
6. Case search by reference number finds exact matches
7. No results found message appears when search returns no matches
8. Multiple search results display in table with radio buttons
9. Selecting and confirming a case adds subscription immediately
10. Subscription appears in "Subscriptions by case" table
11. Subscription stored with `search_type = 'CASE_NUMBER'`
12. Case name stored in `case_name` column when subscribing by name
13. Subscription confirmation page displays success message
14. Notification email sent when matching artefact is published
15. Welsh translations display correctly
16. All pages meet accessibility standards

## Dependencies

- VIBE-316: Requires `artefact_search` table and `search_type`/`search_value` columns in subscription table
- Existing location-based subscription functionality
- Gov Notify integration for email notifications

## Out of Scope

- Editing existing subscriptions
- Bulk subscription management
- Subscription expiry/renewal
- Advanced search filters (date range, court type, etc.)
- Email notification content customization
