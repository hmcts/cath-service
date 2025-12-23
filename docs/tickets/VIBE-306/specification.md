# VIBE-306: Verified user - Bulk unsubscribe process

## User Story
As a Verified Media User, I want to bulk unsubscribe from my subscriptions in CaTH so that I can stop receiving notifications from publications I am no longer interested in.

## Problem Statement
Verified users are users who have applied to create accounts in CaTH to have access to restricted hearing information which they can subscribe to receive email notifications from CaTH and also unsubscribe from.

## Pre-conditions
- The user has a verified account
- The verified user already has some active subscriptions in CaTH
- Subscription by case name and case reference number have been implemented (VIBE-300)
- Verified user dashboard has already been created

## Technical Specification
On confirmation, all the selected subscriptions must be deleted from subscription database table for given user.

## User Journey Flow

```
START
 |
 v
User logs in → lands on "Your email subscriptions"
 |
 v
Clicks "Bulk unsubscribe"
 |
 v
Page 1: Bulk Unsubscribe (tabs + tables)
 |
 |-- If no subscriptions found in selected view → show empty state
 |
 |-- User selects one or more checkboxes?
 |         |
 |         |-- NO → Error: "At least one subscription must be selected"
 |         |
 |         └-- YES
 |
 v
Clicks "Bulk unsubscribe" button
 |
 v
Page 2: Confirm removal
 |
 |-- User selects radio?
 |         |
 |         |-- NO SELECTION → Error: "An option must be selected"
 |         |
 |         |-- Selects "No" → return to "Your email subscriptions"
 |         |
 |         └-- Selects "Yes"
 |
 v
Subscriptions removed
 |
 v
Page 3: Success page ("Email subscriptions updated")
 |
 v
User may:
• Add a new email subscription
• Manage current subscriptions
• Find a court or tribunal
 |
 v
END
```

## Pages and Content

### Page 1: Your email subscriptions (Bulk Unsubscribe entry point)

**URL:** https://www.court-tribunal-hearings.service.gov.uk/bulk-unsubscribe

**Form fields:**
- View selection tabs (All subscriptions / Subscriptions by case / Subscriptions by court or tribunal)
  - Input type: tab selection
  - Required: No
  - Validation: None
- Subscription selection checkbox (per row)
  - Input type: checkbox
  - Required: No (but at least one must be selected before continuing)
  - Validation: "At least one subscription must be selected" if user submits with none selected
- Select all checkbox (table header)
  - Input type: checkbox
  - Required: No
  - Validation: None

**Note:** Table values (case name, party name, reference number, court or tribunal name, date added) are system-generated read-only content.

**Content:**
- EN: Title/H1 "Bulk Unsubscribe"
- CY: Title/H1 "Welsh placeholder"
- EN: Tabs — "All subscriptions", "Subscriptions by case", "Subscriptions by court or tribunal"
- CY: Tabs — "Welsh placeholder", "Welsh placeholder", "Welsh placeholder"
- EN: Table headings (depending on selected tab):
  - **Subscriptions by case:** "Case name", "Party name", "Reference number", "Date added", "Select"
  - **Subscriptions by court or tribunal:** "Court or tribunal name", "Date added", "Select"
  - **All subscriptions:** Case table (same as above), then court or tribunal table (same as above)
- CY: Table headings — "Welsh placeholder", "Welsh placeholder", "Welsh placeholder", "Welsh placeholder", "Welsh placeholder"
- EN: Button — "Bulk unsubscribe" (green)
- CY: Button — "Welsh placeholder"
- EN: Empty-state message (if no subscriptions in selected view): "You do not have any subscriptions in this category."
- CY: Empty-state message — "Welsh placeholder"

**Errors:**
- EN: Error summary title — "There is a problem"
- EN: Error message — "At least one subscription must be selected"
- CY: "Welsh placeholder" / "Welsh placeholder"

**Back navigation:**
Back link returns the user to the previous page ("Your email subscriptions").

---

### Page 2: Confirm selected subscriptions for removal

**URL:** https://www.court-tribunal-hearings.service.gov.uk/bulk-unsubscribe

**Form fields:**
- Radio button: Yes
  - Input type: radio
  - Required: Yes
  - Validation: Must be selected if user chooses Yes
- Radio button: No
  - Input type: radio
  - Required: Yes
  - Validation: Must be selected if user chooses No
- Validation rule (page-level):
  - If user submits without selecting Yes/No → show "An option must be selected"

**Content:**
- EN: Title/H1 "Are you sure you want to remove these subscriptions?"
- CY: Title/H1 "Welsh placeholder"
- EN: Table headings mirror those shown on the previous page, showing the selected subscriptions
- CY: Table headings — "Welsh placeholder", etc.
- EN: Radio options — "Yes", "No"
- CY: Radio options — "Welsh placeholder", "Welsh placeholder"
- EN: Button — "Continue" (green)
- CY: Button — "Welsh placeholder"

**Errors:**
- EN: Error summary title — "There is a problem"
- EN: Error message — "An option must be selected."
- CY: "Welsh placeholder" / "Welsh placeholder"

**Back navigation:**
Back link returns the user to the Bulk Unsubscribe selection page with previous selections retained.

---

### Page 3: Email subscriptions updated (Success page)

**URL:** https://www.court-tribunal-hearings.service.gov.uk/bulk-unsubscribe-confirmed

**Form fields:**
None (this page does not contain interactive fields).

**Content:**
- EN: Title/H1 (green banner) — "Email subscriptions updated"
- CY: Title/H1 — "Welsh placeholder"
- EN: Intro text — "To continue, you can go to your account in order to:"
- CY: Intro text — "Welsh placeholder"
- EN: Bullet list:
  - "add a new email subscription"
  - "manage your current email subscriptions"
  - "find a court or tribunal"
- CY: Bullet list — "Welsh placeholder", "Welsh placeholder", "Welsh placeholder"

**Errors:** None.

**Back navigation:**
Back link returns the user to the confirmation page.

---

## Accessibility Requirements
- Must comply with WCAG 2.2 AA and GOV.UK Design System
- Error summaries must appear at the top and contain anchor links to the relevant field
- All interactive elements (tabs, checkboxes, radios, buttons, back links) must be accessible via keyboard navigation and support visible focus states
- The success banner must be announced by assistive technology as a status message
- Tables must include appropriate semantic markup (<th> headers, row labels where required)
- Content must be fully navigable without reliance on colour alone

## Acceptance Criteria
1. When the verified user signs into CaTH, the user can see the following tabs; Dashboard and 3 tabs 'Court and tribunal hearings', 'Dashboard', and 'Email subscriptions'
2. When the verified user clicks on the 'Email subscriptions' tab, the user is taken to a page with a header title 'Your email subscriptions' and can see the 'Bulk unsubscribe' tab under the header and beside the 'Add email subscription' tab
3. The user can tick the check box at the table header to select all the items in the table
4. Underneath the table, the user sees a green 'Bulk unsubscribe' button which when clicked, takes the user to the page titled 'Are you sure you want to remove these subscriptions?' which displays all selected options in a table with similar column titles to aforementioned
5. Underneath the table, 2 radio buttons are available with the options 'Yes' and 'No'
6. If the user selects 'No', then the user is taken back to the 'Your email subscriptions' page
7. If the user selects 'Yes', then the user is taken to the confirmation page which displays the page title 'Email subscriptions updated' in a green banner. Underneath the banner, user the following options in bullet points after the text 'To continue, you can go to your account in order to:'
   - add a new email subscription
   - manage your current email subscriptions
   - find a court or tribunal
8. The user can navigate to the previous page on each page using the 'back' link provided at the top left of the page
9. All CaTH pages specifications are maintained

## Test Scenarios
- Submitting Page 1 with no checkboxes selected shows the correct error summary and message
- Submitting Page 1 with selected subscriptions takes the user to the confirmation page showing only the selected subscriptions
- Confirming "No" on Page 2 returns the user to "Your email subscriptions"
- Submitting Page 2 with no radio selection shows the correct error summary and message
- Selecting "Yes" removes the subscriptions and displays the success page
- View tabs correctly filter subscriptions and show empty states where appropriate
- "Select all" checkbox ticks and unticks all subscription rows
- Back links always return to the previous page and preserve user state
- Empty-state scenario: When a user has no subscriptions in a selected view, the empty-state message is displayed and no table appears
- Language toggle updates all text to Welsh placeholders
- URLs for pages 1–3 remain /bulk-unsubscribe; success page loads /bulk-unsubscribe-confirmed
