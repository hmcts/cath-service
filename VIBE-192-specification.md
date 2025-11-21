# VIBE-192 — Subscribe to Email Notifications (Specification)

> Owner: VIBE-192
> Updated: 21 Nov 2025

---

## Problem Statement
Verified users (media) can create accounts in CaTH to access restricted hearing information.
Once approved, they can subscribe to receive **email notifications** when new hearing lists are published for specific venues.

---

## User Story
**As a** Verified Media User
**I want to** subscribe to hearing lists in CaTH
**So that** I can receive email notifications whenever a new list I subscribed to is published

---

## Acceptance Criteria
1. Verified media users have approved CaTH accounts.
2. Verified users can sign in, access the **Dashboard**, and view restricted information.
3. Dashboard top navigation displays three links:
   - **Court and tribunal hearings**
   - **Dashboard**
   - **Email subscriptions**
4. Clicking **Email subscriptions** opens a page titled **Your email subscriptions**, showing:
   - Green **Add email subscription** button.
   - Either a "no subscriptions" message or a table of existing subscriptions:
     - **Court or tribunal name**
     - **Date added**
     - **Actions**
5. If the user has **no existing subscriptions**, the message under the button reads:
   > "You do not have any active subscriptions."
6. If subscriptions exist, the table displays all current subscriptions.
7. Clicking **Add email subscription** opens **Subscribe by court or tribunal name**.
   - The location selection page should look the same as the alphabetical search page
   - User selects one or more venues.
   - User clicks **Continue** → navigates to **Confirm your email subscriptions**.
8. **Confirm your email subscriptions**:
   - Lists selected subscriptions.
   - Each selection has a **Remove** link.
   - Below the list:
     - **Add another subscription** link (returns to "Subscribe by court or tribunal name").
     - **Continue** button.
   - If the user removes their last subscription:
     - Error message:
       **There is a problem**
       **At least one subscription is needed**
     - Green **Add subscription** button below (returns to subscription selection).
9. Clicking **Continue** navigates to **Subscription confirmation**, displaying:
   - Green banner: **Subscription confirmation**
   - Subtext:
     > "To continue, you can go to your account in order to:"
     - **add a new email subscription** → `/subscriptions/add`
     - **manage your current email subscriptions** → `/subscriptions`
     - **find a court or tribunal** → `/hearing-lists/find-court`
10. Every page includes a **Back** link (top left).
11. The system creates a **Subscriptions table** in the database linking user details with subscribed venues.
12. Only verified users (in API database) can create subscriptions.
13. Subscriptions table fields:
    - `subscription_id` (UUID; primary key)
    - `user_id` (verified user's ID)
    - `location_id` (linked venue ID)
    - `date_added`
14. Users can delete or add subscriptions; changes persist in the Subscriptions table.
15. All CaTH accessibility and page specifications are maintained.

---

## User Journey Flow
1. **Sign in** → Verified user lands on Dashboard.
2. Click **Email subscriptions** → opens Your email subscriptions.
3. If no subscriptions, message shown; otherwise, table appears.
4. Click **Add email subscription** → opens Subscribe by court or tribunal name.
5. Select one or more venues → click **Continue** → opens Confirm your email subscriptions.
6. Optional: Remove selections or add another.
7. Click **Continue** → opens Subscription confirmation.
8. Use provided links to navigate to other areas or add new subscriptions.

---

## Page 1 — Your email subscriptions

### Wireframe

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ GOV.UK [Language Toggle]                                                     │
├──────────────────────────────────────────────────────────────────────────────┤
│ HMCTS – Courts and Tribunals Hearings (CaTH)                                 │
├──────────────────────────────────────────────────────────────────────────────┤
│ < Back                                                                        │
│ Your email subscriptions                                                      │
│ [Add email subscription] (Green Button)                                       │
│                                                                                │
│ (If none) You do not have any active subscriptions.                           │
│                                                                                │
│ (If existing)                                                                  │
│ ┌──────────────────────────────────────────────────────────────────────────┐ │
│ │ Court or tribunal name   | Date added    | Actions                       │ │
│ │ Oxford Crown Court       | 12 Nov 2025   | Remove                        │ │
│ │ Manchester Magistrates   | 10 Nov 2025   | Remove                        │ │
│ └──────────────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Content
**EN:** Title — "Your email subscriptions"
**CY:** Title — "Eich tanysgrifiadau e-bost"

**EN:** Button — "Add email subscription"
**CY:** Button — "Ychwanegu tanysgrifiad e-bost"

**EN:** Message (none) — "You do not have any active subscriptions."
**CY:** Message (none) — "Nid oes gennych unrhyw danysgrifiadau gweithredol."

**EN:** Table headers — "Court or tribunal name", "Date added", "Actions"
**CY:** Table headers — "Enw'r llys neu'r tribiwnlys", "Dyddiad ychwanegu", "Camau gweithredu"

---

## Page 2 — Subscribe by court or tribunal name

### Wireframe

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ < Back                                                                        │
│ Subscribe by court or tribunal name                                           │
│                                                                                │
│ Search for a court or tribunal:                                               │
│ [_________________________________________]                                    │
│                                                                                │
│ [Continue] (Green Button)                                                     │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Content
**EN:** Title — "Subscribe by court or tribunal name"
**CY:** Title — "Tanysgrifio yn ôl enw llys neu dribiwnlys"

**EN:** Button — "Continue"
**CY:** Button — "Parhau"

---

## Page 3 — Confirm your email subscriptions

### Wireframe

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ < Back                                                                        │
│ Confirm your email subscriptions                                              │
│                                                                                │
│ Oxford Combined Court Centre [Remove]                                         │
│ Manchester Magistrates' Court [Remove]                                        │
│                                                                                │
│ [Add another subscription] (Link)                                             │
│                                                                                │
│ [Continue] (Green Button)                                                     │
│                                                                                │
│ (Error state if last removed)                                                 │
│ ┌──────────────────────────────────────────────────────────────────────────┐ │
│ │ ⚠️ There is a problem                                                     │ │
│ │    At least one subscription is needed.                                   │ │
│ │    [Add subscription] (Green Button)                                      │ │
│ └──────────────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Content
**EN:** Title — "Confirm your email subscriptions"
**CY:** Title — "Cadarnhewch eich tanysgrifiadau e-bost"

**EN:** Error — "There is a problem. At least one subscription is needed."
**CY:** Error — "Mae problem. Mae angen o leiaf un tanysgrifiad."

**EN:** Button — "Continue"
**CY:** Button — "Parhau"

---

## Page 4 — Subscription confirmation

### Wireframe

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ ✅ Subscription confirmation                                                 │
│                                                                                │
│ To continue, you can go to your account in order to:                          │
│ • add a new email subscription                                                │
│ • manage your current email subscriptions                                     │
│ • find a court or tribunal                                                    │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Content
**EN:** Header — "Subscription confirmation"
**CY:** Header — "Cadarnhad tanysgrifiad"

**EN:** Message —
"To continue, you can go to your account in order to:"
- "add a new email subscription"
- "manage your current email subscriptions"
- "find a court or tribunal"
**CY:** Message —
"I barhau, gallwch fynd i'ch cyfrif er mwyn:"
- "Ychwanegu tanysgrifiad e-bost newydd"
- "Rheoli eich tanysgrifiadau e-bost cyfredol"
- "Dod o hyd i lys neu dribiwnlys"

---

## URL Structure
| Page                            | URL                      |
|---------------------------------|--------------------------|
| Dashboard                       | `/account-home`          |
| Your email subscriptions        | `/subscriptions`         |
| Subscribe by court or tribunal  | `/subscriptions/add`     |
| Confirm your email subscriptions| `/subscriptions/confirm` |
| Subscription confirmation       | `/subscriptions/success` |

---

## Data Model — Subscriptions Table
**Storage:** CaTH back-end PostgreSQL database.

| Field           | Type     | Required | Description                           |
|-----------------|----------|----------|---------------------------------------|
| subscription_id | UUID     | Yes      | Unique primary key                    |
| user_id         | String   | Yes      | ID of verified user                   |
| location_id     | String   | Yes      | Court/tribunal venue identifier       |
| date_added      | DateTime | Yes      | Timestamp for when subscription was created |

**Business logic:**
- Subscriptions can only be created for **verified users**.
- Users can manage (add, update, delete) subscriptions.
- Subscriptions deleted immediately when user unsubscribes.
- Future email notifications must reflect subscription updates.
- Duplicate subscriptions for the same venue should be prevented.

---

## Validation Rules

- At least one venue must be selected before continuing from "Subscribe" page.
- Removing all subscriptions triggers error ("At least one subscription is needed.").
- Buttons and links must only act when valid states exist.
- All navigation preserves the user's session and language selection.
- Prevent duplicate subscriptions for the same user/venue combination.

---

## Error Messages
**EN:**
- "There is a problem."
- "At least one subscription is needed."
- "Please select a valid court or tribunal."
- "You are already subscribed to this court or tribunal."

**CY:**
- "Mae problem wedi codi."
- "Mae angen o leiaf un tanysgrifiad."
- "Dewiswch lys neu dribiwnlys dilys."
- "Rydych chi eisoes wedi tanysgrifio i'r llys neu'r tribiwnlys hwn."

---

## Accessibility

- Comply with **WCAG 2.2 AA** and **GOV.UK Design System**.
- Tables use `<th scope="col">` for headers.
- Error summaries use `role="alert"`.
- All buttons, links, and checkboxes are keyboard accessible with visible focus states.
- Language toggle persists context.
- "Add another subscription" link and back navigation must be reachable via keyboard navigation.

---

## Test Scenarios
| ID   | Scenario               | Steps                                    | Expected Result                                      |
|------|------------------------|------------------------------------------|------------------------------------------------------|
| TS1  | Navigate to subs       | Log in → click "Email subscriptions"     | Page shows Add button and either message or table    |
| TS2  | No subscriptions       | User has none                            | "You do not have any active subscriptions." shown    |
| TS3  | Existing subscriptions | User has some                            | Table displays all with "Remove" actions             |
| TS4  | Add subscription       | Click Add email subscription             | "Subscribe by court or tribunal name" opens          |
| TS5  | Confirm selections     | Add venues → Continue                    | "Confirm your email subscriptions" opens             |
| TS6  | Remove all             | Remove last subscription                 | Error: "At least one subscription is needed."        |
| TS7  | Confirmation           | Click Continue                           | Subscription confirmation page displayed             |
| TS8  | Manage links           | Click links on confirmation              | Each redirects correctly                             |
| TS9  | Data persistence       | Add subscription                         | Row saved in Subscriptions table                     |
| TS10 | Modify/delete          | Update or remove subscription            | Table updates accordingly                            |
| TS11 | Duplicate prevention   | Try to add existing subscription         | Error: "You are already subscribed"                  |
| TS12 | Accessibility          | Keyboard + screen reader                 | All controls and errors announced correctly          |
| TS13 | Welsh toggle           | Switch to Welsh                          | All text updates to Welsh version                    |

---

## Risks / Clarifications

- ✅ Confirm whether duplicate subscriptions for the same venue should be prevented - **Yes, duplicate subscriptions should be prevented**
- ✅ Confirm subscription table storage lifetime and retention - **No retention for now**
- ✅ Confirm if users can bulk-select multiple venues at once - **Yes**
- ⚠️ Confirm if email notifications are immediate (real-time) or scheduled batch triggers - **Not applicable yet in this ticket**
- ✅ Confirm error logging location for invalid subscription updates - **Yes**
