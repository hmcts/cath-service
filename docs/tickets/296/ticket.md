# GitHub Issue #296 — [VIBE-307] Verified User: Select & Edit List Type (List Type Subscription Only)

## Summary

As a verified media user, I want to select specific list types when subscribing to hearing lists in CaTH so that I only receive email notifications for the list types I am interested in.

## Pre-conditions

- User is a verified media user (role: VERIFIED, provenance: B2C_IDAM)
- VIBE-309 (location subscription flow, Pages 1–4) is already implemented

## The 8-Page Subscription Flow

| Page | Route | Description |
|------|-------|-------------|
| 1 | `/subscription-management` | Your email subscriptions — overview |
| 2 | `/add-email-subscription` | How do you want to add? (method selection) |
| 3 | `/location-name-search` | Subscribe by court/tribunal name |
| 4 | `/pending-subscriptions` | Review selected venues |
| 5 | `/subscription-add-list` | Select list types (filtered by sub-jurisdiction) |
| 6 | `/subscription-add-list-language` | Select language version (English/Welsh/Both) |
| 7 | `/subscription-confirmation-preview` | Confirm all selections |
| 8 | `/subscription-confirmed` | Subscription confirmed (enhanced) |

## Key Business Rules

- List type subscriptions are **not linked to specific locations** — subscribing to a list type means notifications for that type from any location
- List types shown on Page 5 must be filtered by the **sub-jurisdictions** of the user's selected locations
- Validation is required on both the add flow (Page 5 `/select-list-types`) and the edit flow (`/subscription-configure-list`) — error: "Please select a list type to continue"
- "Edit list type" from Page 1 navigates to `/subscription-configure-list`, which shows all list types pre-selected with the user's current subscriptions; continuing leads to `/subscription-configure-list-language` (pre-selected language) then `/subscription-configure-list-preview` (summary of selected list types and language version)
- Duplicate list type + language combinations per user must be prevented
- Back navigation must preserve all selections

## Acceptance Criteria (Key Points)

- "Add email subscription" button on Page 1
- Method selection on Page 2 (By court/tribunal / By case name / By case reference)
- List types on Page 5 filtered by sub-jurisdictions of selected courts
- Page 5 validation: must select at least one list type to continue (error: "Please select a list type to continue")
- Page 6 validation: must select version (error: "Please select version of the list type to continue")
- Page 7: Combined confirmation showing courts, list types, and version; ability to remove items or change version
- Page 8: Success banner + navigation links
- Notification: when a publication is received for a list type, all users subscribed to that list type and matching language receive an email

## Welsh Translations Required

All pages must have full English and Welsh content (en.ts / cy.ts per page).

## Labels

- jira:VIBE-307
- type:story
- priority:3-medium
- assignee: KianKwa
