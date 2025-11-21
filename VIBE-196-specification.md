# VIBE-196 — Unsubscribe from Email Subscriptions (Specification)

> Owner: VIBE-196
> Updated: 21 Nov 2025

---

## Problem Statement
Verified users (media) create accounts in CaTH to access restricted hearing information. They can subscribe to email notifications for publications and must also be able to **unsubscribe** when no longer interested.

## User Story
**As a** Verified Media User
**I want to** unsubscribe from my subscriptions in CaTH
**So that** I can stop receiving notifications for publications I'm no longer interested in

## Pre-condition

- The verified user has one or more **active** subscriptions in CaTH.
- User is signed in to a verified account.

---

## Acceptance Criteria (Functional)
1. Verified media user with an approved account can sign into CaTH and access:
   - **Top links:** Court and tribunal hearings, Dashboard, Email subscriptions.
2. Selecting **Email subscriptions** opens **Your email subscriptions** page showing:
   - Header, a green **Add email subscription** button.
   - A table of existing subscriptions with columns: **Court or tribunal name**, **Date added**, **Actions**.
   - Each row contains an **Unsubscribe** link.
3. Clicking **Unsubscribe** opens **Are you sure you want to remove this subscription?** with radio options **Yes/No** and a green **Continue** button.
   - **No →** return to **Your email subscriptions**.
   - **Yes →** show **Subscriptions removed** confirmation (green banner) with subtext **Your subscription has been removed** and links to:
     - **add a new email subscription** (Subscribe by court or tribunal name),
     - **manage your current email subscriptions** (Your email subscriptions),
     - **find a court or tribunal** (What court or tribunal are you interested in?).
4. A **Back** link is available at the top left of each page.
5. **Subscriptions table updates:**
   - If, after unsubscribe, the user has **no other** subscriptions → delete the user's record for that venue (and user entirely if model stores one row per user with set empty).
   - If other subscriptions remain → update the table to remove only the selected venue and ensure future notifications reflect the change.
6. All CaTH page specifications are maintained.

---

## Page 1 — Your email subscriptions

### Wireframe

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ GOV.UK Court & tribunal hearings                                            │
│ < Back    Dashboard | Email subscriptions                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│ Your email subscriptions                                                     │
│ [Add email subscription] (green)                                             │
│                                                                               │
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │ Court or tribunal name   | Date added    | Actions                      │ │
│ │ Oxford Combined Court    | 02 Nov 2025   | Unsubscribe                  │ │
│ │ Manchester Magistrates   | 28 Oct 2025   | Unsubscribe                  │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Form fields

- None (table actions only).

### Content
**EN:** Title/H1 — "Your email subscriptions"
**CY:** Title/H1 — "Eich tanysgrifiadau e-bost"

**EN:** Button — "Add email subscription"
**CY:** Button — "Ychwanegu tanysgrifiad e-bost"

**EN:** Table headers — "Court or tribunal name", "Date added", "Actions"
**CY:** Table headers — "Enw'r llys neu'r tribiwnlys", "Dyddiad ychwanegu", "Camau"

**EN:** Link — "Unsubscribe"
**CY:** Link — "Dad-danysgrifio"

### Errors

- None on this page.

### Back navigation

- **Back** returns to previous page (typically Dashboard).

---

## Page 2 — Are you sure you want to remove this subscription?

### Wireframe

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ < Back                                                                       │
│ Are you sure you want to remove this subscription?                          │
│                                                                               │
│ ( ) Yes                                                                      │
│ ( ) No                                                                       │
│                                                                               │
│ [Continue] (green)                                                           │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Form fields
| Field        | Type  | Required | Validation                          |
|--------------|-------|----------|-------------------------------------|
| confirmation | Radio | Yes      | Must be **Yes** or **No** selected  |

### Content
**EN:** Title/H1 — "Are you sure you want to remove this subscription?"
**CY:** Title/H1 — "Ydych chi'n siŵr eich bod am dynnu'r tanysgrifiad hwn?"

**EN:** Radio options — "Yes", "No"
**CY:** Radio options — "Ydw", "Nac ydw"

**EN:** Button — "Continue"
**CY:** Button — "Parhau"

### Errors
**EN:** "Select yes or no."
**CY:** "Dewiswch ie neu na."

### Back navigation

- **Back** returns to **Your email subscriptions**.

---

## Page 3 — Subscriptions removed (confirmation)

### Wireframe

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ ✅ Subscriptions removed (green banner)                                     │
│    Your subscription has been removed                                        │
│                                                                               │
│ To continue, you can go to your account in order to:                         │
│ • add a new email subscription                                               │
│ • manage your current email subscriptions                                    │
│ • find a court or tribunal                                                   │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Form fields

- None.

### Content
**EN:** Banner title — "Subscriptions removed"
**CY:** Banner title — "Tanysgrifiadau wedi'u tynnu"

**EN:** Banner subtext — "Your subscription has been removed"
**CY:** Banner subtext — "Mae eich tanysgrifiad wedi'i dynnu"

**EN:** Body intro — "To continue, you can go to your account in order to:"
**CY:** Body intro — "I barhau, gallwch fynd i'ch cyfrif er mwyn:"

**EN:** Links (bulleted) —
- "add a new email subscription"
- "manage your current email subscriptions"
- "find a court or tribunal"
**CY:** Links (bulleted) —
- "ychwanegu tanysgrifiad e-bost newydd"
- "rheoli eich tanysgrifiadau e-bost cyfredol"
- "dod o hyd i lys neu dribiwnlys"

### Errors

- None (success state).

### Back navigation

- **Back** returns to the confirmation question page.

---

## URL Structure
| Page                                 | URL                                  |
|--------------------------------------|--------------------------------------|
| Your email subscriptions             | `/subscriptions`                     |
| Remove subscription (confirm Yes/No) | `/subscriptions/unsubscribe/{id}`    |
| Subscriptions removed (success)      | `/subscriptions/removed`             |

---

## Behaviour & Data Updates

- Clicking **Unsubscribe** from Page 1 navigates to Page 2 with the selected subscription `{id}` in the route.
- On Page 2:
  - **No** → redirect back to `/subscriptions` (no change).
  - **Yes** → remove selected subscription server-side:
    - If this was the **only** subscription for the user, delete the user's record from **Subscriptions** (or leave user row but empty set per model).
    - Otherwise, delete only the row for `{user_id, court_id}`.
  - Redirect to `/subscriptions/removed`.
- Future email notifications must **exclude** the removed subscription immediately after successful update.

---

## Validation Rules

- Page 2 requires a selection of **Yes** or **No** before submitting.
- Subscription id in route must belong to the **signed-in user**; otherwise return to `/subscriptions` with an error summary.
- All navigation links must preserve language preference.

---

## Error Messages (system)
**EN:**
- "Select yes or no."
- "We could not find that subscription."
- "You are not authorised to update this subscription."

**CY:**
- "Dewiswch ie neu na."
- "Ni allem ddod o hyd i'r tanysgrifiad hwnnw."
- "Nid oes gennych awdurdod i ddiweddaru'r tanysgrifiad hwn."

---

## Accessibility (applies across all pages)

- Comply with **WCAG 2.2 AA** and **GOV.UK Design System**.
- Ensure **Back** link is programmatically associated and first in tab order after H1.
- Use `<fieldset>` and `<legend>` for the Yes/No radios; include error summary with `role="alert"` and focus on load.
- Table headers use `<th scope="col">`.
- All focus states visible; links/buttons accessible via keyboard.
- Language toggle preserves context and values where applicable.

---

## Test Scenarios
| ID  | Scenario                      | Steps                                            | Expected Result                                                     |
|-----|-------------------------------|--------------------------------------------------|---------------------------------------------------------------------|
| TS1 | List subscriptions            | Sign in → open `/subscriptions`                 | Header, Add button, and table with existing subscriptions          |
| TS2 | Start unsubscribe             | Click **Unsubscribe** on a row                  | Navigate to confirmation page for that subscription                 |
| TS3 | Confirm = No                  | Select **No** → Continue                        | Return to `/subscriptions`; no data change                          |
| TS4 | Confirm = Yes                 | Select **Yes** → Continue                       | See **Subscriptions removed** page; banner + links displayed        |
| TS5 | Data update (single remaining)| Unsubscribe with only one active subscription   | Subscriptions table updated to remove final row                     |
| TS6 | Data update (multiple)        | Unsubscribe one of several                      | Only selected row removed; others remain                            |
| TS7 | Validation                    | Click **Continue** with no radio selected       | Error summary "Select yes or no." and inline error on radios        |
| TS8 | Authorisation                 | Manipulate URL `{id}` for another user          | Error + redirect back to `/subscriptions`                           |
| TS9 | Welsh toggle                  | Switch to Welsh on each page                    | CY strings appear per **Content**; layout unchanged                 |
| TS10| Accessibility                 | Navigate with keyboard and screen reader        | Proper focus order; error readouts; table headers announced         |

---

## Risks & Ambiguities (to confirm)

- **Data model shape:** whether "delete user from Subscriptions table" means removing all rows for that user or only the selected `{user_id, court_id}` row when others exist.
- **Link destinations:** exact URLs for "Subscribe by court or tribunal name" and "What court or tribunal are you interested in?" should match the implemented routes used elsewhere.
