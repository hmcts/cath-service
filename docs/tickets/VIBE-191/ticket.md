# VIBE-191: Verified Media User Dashboard

## Ticket Information
- **Ticket ID:** VIBE-191
- **Type:** User Story
- **Status:** In Progress
- **Branch:** feature/VIBE-191-verified-user-dashboard

## Problem Statement

Verified user are users who have applied to create accounts in CaTH to have access to restricted hearing information. Upon approval, verified users can then sign in on CaTH. The landing page in CaTH for a media verified user is the dashboard.

## User Story

**AS A** Verified Media User
**I WANT** to access the dashboard in CaTH
**SO THAT** I can view restricted hearing information and subscribe to email notifications

## Acceptance Criteria

1. A verified user is a member of the media who has been verified and has an approved account in CaTH.
2. A verified user can sign into CaTH to view restricted hearing information and subscribe to email notifications.
3. The verified user can see the Dashboard as soon as the user signs in
4. At the top of the page user can see a clickable link to see 3 pages provided in these texts Court and tribunal hearings, Dashboard and Email subscriptions
5. The verified user can see 3 tabs in the dashboard titled 'Court and tribunal hearings', 'Single Justice Procedure cases' and 'Email subscriptions', under a header title labelled 'Your account'
6. The verified user can navigate to the previous page using the 'back' link provided at the top left of the page
7. All CaTH pages specifications are maintained

---

# Attached Specification

## 1. User Story

**As a** Verified Media User
**I want** to access the dashboard in CaTH
**So that** I can view restricted hearing information and subscribe to email notifications

### Background

Verified users are members of the media who have been approved to access restricted hearing information in CaTH. Upon signing in, their landing page is the **Dashboard**, which provides access to hearing information, Single Justice Procedure (SJP) cases, and email subscription management. The Dashboard serves as the central hub for all verified user interactions within CaTH.

### Acceptance Criteria

1. A verified user is a member of the media who has been verified and has an approved account in CaTH.
2. A verified user can sign into CaTH to view restricted hearing information and subscribe to email notifications.
3. The verified user is taken directly to the **Dashboard** upon signing in.
4. At the top of the page, the user can see **clickable links** to navigate between the following pages:
   * Court and tribunal hearings
   * Dashboard
   * Email subscriptions
5. The Dashboard displays a **header titled "Your account"**, under which there are **three tabs**:
   * *Court and tribunal hearings*
   * *Single Justice Procedure cases*
   * *Email subscriptions*
6. The user can navigate to the previous page using the **Back** link provided at the top left of the page.
7. All CaTH page specifications (header, footer, navigation, Welsh toggle, accessibility) are maintained.

---

## 2. User Journey Flow

1. The verified user signs into CaTH using their approved credentials.
2. The system verifies account credentials and user permissions.
3. Upon successful sign-in, the user is redirected to the **Dashboard**.
4. The user sees navigation links at the top for *Court and tribunal hearings*, *Dashboard*, and *Email subscriptions*.
5. The user can interact with tabs under the *Your account* header to view restricted hearing lists, SJP cases, or manage email preferences.
6. The user can navigate back to the previous page via the **Back link** in the top left corner.

---

## 3. Low-Fidelity Wireframe

```
┌───────────────────────────────────────────────────────────────────┐
│ GOV.UK | Court and tribunal hearings | Dashboard | Email subscriptions │
│ ← Back                                                        Sign out │
│                                                        Cymraeg         │
├───────────────────────────────────────────────────────────────────┤
│ Your account                                                         │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │ [Court and tribunal hearings] [Single Justice Procedure cases]   │ │
│ │ [Email subscriptions]                                            │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│                                                                     │
│ [Content area – displays restricted hearing data or subscriptions]  │
│                                                                     │
│ [Continue]                                                          │
├───────────────────────────────────────────────────────────────────┤
│ Help | Privacy | Cookies | Accessibility | Contact | T&Cs | Welsh   │
│ Government Digital Service | Open Government Licence                │
│ © Crown copyright                                                   │
└───────────────────────────────────────────────────────────────────┘
```

---

## 4. Page Specifications

### Content

* **Header title:** "Your account"
* **Tabs:** Court and tribunal hearings, Single Justice Procedure cases, Email subscriptions.
* **Top navigation links:** Court and tribunal hearings | Dashboard | Email subscriptions.
* **Back link:** Present at top left corner of the page.
* **Continue button:** Optional, used for advancing from current tab (if needed).

### URL

* `/dashboard`

### Validation

* Only verified media users with approved accounts can access the dashboard.
* Unverified or unauthorised users attempting to access the dashboard are redirected to the sign-in page.

### Error Messages

* "You must sign in with a verified account to access this page."
* "Your session has expired. Please sign in again."

---

## 5. Navigation

* **Forward:** Navigation links and tabs redirect to:
  * Court and tribunal hearings → `/dashboard/hearings`
  * Single Justice Procedure cases → `/dashboard/sjp-cases`
  * Email subscriptions → `/dashboard/email-subscriptions`
* **Back:** Returns to previous page.
* **Sign out:** Logs user out and returns to CaTH start page.
* **Footer links:** Standard CaTH footer maintained.

---

## 6. Accessibility

* Must comply with **WCAG 2.2 AA** and **GOV.UK Design System** standards.
* Tabs and navigation links must be fully keyboard-accessible.
* Screen readers must correctly announce tab labels and page titles.
* The Back link must be accessible via keyboard and screen reader.
* Welsh toggle must reload page content in Welsh.

---

## 7. Test Scenarios

1. **Sign-in validation:** Verified media user can access dashboard; unverified users cannot.
2. **Landing page:** Dashboard loads immediately after successful sign-in.
3. **Navigation links:** Top links (Court and tribunal hearings, Dashboard, Email subscriptions) redirect correctly.
4. **Tabs:** Switching between the three tabs displays the correct content.
5. **Back link:** Returns user to the previous page.
6. **Session handling:** Session timeout redirects to sign-in page.
7. **Welsh toggle:** Reloads dashboard in Welsh.
8. **Footer links:** Navigate correctly to GOV.UK services.

---

## 8. Assumptions & Open Questions

* Confirm whether the dashboard content dynamically updates with recent hearing data.
* Confirm if the dashboard supports role-based views (e.g., media vs legal users).
* Confirm whether the tabs are client-side (SPA) or server-rendered pages.
* Confirm session timeout duration for verified users.
