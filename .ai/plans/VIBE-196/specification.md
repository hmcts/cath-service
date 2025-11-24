# VIBE-196 — Verified User – Unsubscribe

## Problem Statement

Verified users (media) create accounts in CaTH to access restricted hearing information. They can subscribe to email notifications for publications and must also be able to **unsubscribe** when no longer interested.

## User Story

**As a** Verified Media User
**I want to** unsubscribe from my subscriptions in CaTH
**So that** I can stop receiving notifications for publications I'm no longer interested in

## Pre-conditions

- The verified user has one or more active subscriptions in CaTH
- User is signed in to a verified account

## Acceptance Criteria

1. Verified media user with an approved account can sign into CaTH and access:
   - Top links: Court and tribunal hearings, Dashboard, Email subscriptions

2. Selecting **Email subscriptions** opens **Your email subscriptions** page showing:
   - Header, a green **Add email subscription** button
   - A table of existing subscriptions with columns: **Court or tribunal name**, **Date added**, **Actions**
   - Each row contains an **Unsubscribe** link

3. Clicking **Unsubscribe** opens **Are you sure you want to remove this subscription?** with radio options **Yes/No** and a green **Continue** button:
   - **No →** return to **Your email subscriptions**
   - **Yes →** show **Subscriptions removed** confirmation (green banner) with subtext **Your subscription has been removed** and links to:
     - **add a new email subscription** (Subscribe by court or tribunal name)
     - **manage your current email subscriptions** (Your email subscriptions)
     - **find a court or tribunal** (What court or tribunal are you interested in?)

4. A **Back** link is available at the top left of each page

5. **Subscriptions table updates:**
   - If, after unsubscribe, the user has **no other** subscriptions → delete the user's record for that venue
   - If other subscriptions remain → update the table to remove only the selected venue and ensure future notifications reflect the change

6. All CaTH page specifications are maintained

## URL Structure

| Page | URL |
|------|-----|
| Your email subscriptions | `/subscriptions` |
| Remove subscription (confirm Yes/No) | `/subscriptions/unsubscribe/{id}` |
| Subscriptions removed (success) | `/subscriptions/removed` |

## Page 1 — Your email subscriptions

### Content

**EN:**
- Title/H1 — "Your email subscriptions"
- Button — "Add email subscription"
- Table headers — "Court or tribunal name", "Date added", "Actions"
- Link — "Unsubscribe"

**CY:**
- Title/H1 — "Eich tanysgrifiadau e-bost"
- Button — "Ychwanegu tanysgrifiad e-bost"
- Table headers — "Enw'r llys neu'r tribiwnlys", "Dyddiad ychwanegu", "Camau gweithredu"
- Link — "Dad-danysgrifio"

### Behaviour

- Displays all active subscriptions for the logged-in user
- Each subscription has an Unsubscribe link that navigates to `/subscriptions/unsubscribe/{id}`
- Add email subscription button navigates to subscription creation flow

## Page 2 — Are you sure you want to remove this subscription?

### Form Fields

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| confirmation | Radio | Yes | Must be **Yes** or **No** selected |

### Content

**EN:**
- Title/H1 — "Are you sure you want to remove this subscription?"
- Radio options — "Yes", "No"
- Button — "Continue"

**CY:**
- Title/H1 — "Ydych chi'n siŵr eich bod am dynnu'r tanysgrifiad hwn?"
- Radio options — "Ydy", "Nac ydy"
- Button — "Parhau"

### Errors

**EN:** "Select yes or no."
**CY:** "Dewiswch ydy neu nac ydy."

### Behaviour

- On Page 2:
  - **No** → redirect back to `/subscriptions` (no change)
  - **Yes** → remove selected subscription server-side:
    - If this was the **only** subscription for the user, delete the user's subscription record
    - Otherwise, delete only the row for `{user_id, court_id}`
  - Redirect to `/subscriptions/removed`

## Page 3 — Subscriptions removed (confirmation)

### Content

**EN:**
- Banner title — "Subscriptions removed"
- Banner subtext — "Your subscription has been removed"
- Body intro — "To continue, you can go to your account in order to:"
- Links (bulleted):
  - "add a new email subscription"
  - "manage your current email subscriptions"
  - "find a court or tribunal"

**CY:**
- Banner title — "Tanysgrifiadau wedi'u tynnu"
- Banner subtext — "Mae eich tanysgrifiad wedi'i dynnu"
- Body intro — "I barhau, gallwch fynd i'ch cyfrif er mwyn:"
- Links (bulleted):
  - "ychwanegu tanysgrifiad e-bost newydd"
  - "rheoli eich tanysgrifiadau e-bost cyfredol"
  - "dod o hyd i lys neu dribiwnlys"

## Validation Rules

- Page 2 requires a selection of **Yes** or **No** before submitting
- Subscription id in route must belong to the **signed-in user**; otherwise return to `/subscriptions` with an error summary
- All navigation links must preserve language preference

## Error Messages

**EN:**
- "Select yes or no."
- "We could not find that subscription."
- "You are not authorised to update this subscription."

**CY:**
- "Dewiswch ydy neu nac ydy."
- "Ni allem ddod o hyd i'r tanysgrifiad hwnnw."
- "Nid oes gennych awdurdod i ddiweddaru'r tanysgrifiad hwn."

## Accessibility Requirements

- Comply with **WCAG 2.2 AA** and **GOV.UK Design System**
- Ensure **Back** link is programmatically associated and first in tab order after H1
- Use `<fieldset>` and `<legend>` for the Yes/No radios; include error summary with `role="alert"` and focus on load
- Table headers use `<th scope="col">`
- All focus states visible; links/buttons accessible via keyboard
- Language toggle preserves context and values where applicable

## Test Scenarios

| ID | Scenario | Expected Result |
|----|----------|-----------------|
| TS1 | List subscriptions | Header, Add button, and table with existing subscriptions & Unsubscribe links |
| TS2 | Start unsubscribe | Navigate to confirmation page for that subscription |
| TS3 | Confirm = No | Return to `/subscriptions`; no data change |
| TS4 | Confirm = Yes | See **Subscriptions removed** page; banner + links displayed |
| TS5 | Data update (single remaining) | Subscriptions table updated to remove final row; future emails not sent |
| TS6 | Data update (multiple) | Only selected row removed; others remain |
| TS7 | Validation | Error summary "Select yes or no." and inline error on radios |
| TS8 | Authorisation | Error + redirect back to `/subscriptions` |
| TS9 | Welsh toggle | CY strings appear; layout unchanged |
| TS10 | Accessibility | Proper focus order; error readouts; table headers announced |

## Attachments

- [Media Unsubscribe screens.docx](.jira/attachments/Media%20Unsubscribe%20screens.docx)
