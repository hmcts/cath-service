# VIBE-192 — Verified User Email Subscriptions (Specification)

> Owner: VIBE-192
> Updated: 22 November 2025

---

## Problem Statement

Verified users (media) need the ability to subscribe to receive email notifications when new hearing lists are published for specific court/tribunal venues. Currently, users must manually check the service for updates. This feature enables proactive notification delivery based on user-selected venue subscriptions.

---

## User Story

**As a** Verified Media User
**I want to** subscribe to hearing lists for specific courts/tribunals in CaTH
**So that** I can receive email notifications whenever a new list I subscribed to is published

---

## Acceptance Criteria

### AC1: Navigation and Access
1. Verified media users must have approved CaTH accounts
2. Users can sign in and access the Dashboard with restricted information
3. Dashboard navigation displays three links:
   - Court and tribunal hearings
   - Dashboard
   - **Email subscriptions** (new)
4. Only verified users can access subscription functionality

### AC2: Subscription List Page (`/subscriptions`)
1. Page displays title "Your email subscriptions"
2. Green "Add email subscription" button at the top
3. If no subscriptions exist:
   - Display message: "You do not have any active subscriptions."
4. If subscriptions exist:
   - Display table with columns: Court or tribunal name, Date added, Actions
   - Each row shows subscription details with "Remove" action link
5. All content available in English and Welsh

### AC3: Add Subscription Page (`/subscriptions/add`)
1. Page displays title "Subscribe by court or tribunal name"
2. Venue selection interface matches existing alphabetical search pattern
3. Users can select one or more venues using checkboxes
4. "Continue" button to proceed to confirmation
5. Validation: At least one venue must be selected
6. Error message if no venue selected: "Select at least one court or tribunal"

### AC4: Confirmation Page (`/subscriptions/confirm`)
1. Page displays title "Confirm your email subscriptions"
2. Lists all selected subscriptions with venue names
3. Each selection has a "Remove" link
4. "Add another subscription" link returns to selection page
5. "Continue" button to save subscriptions
6. If user removes the last subscription:
   - Show error summary: "There is a problem - At least one subscription is needed"
   - Display "Add subscription" button to return to selection

### AC5: Success Page (`/subscriptions/success`)
1. Green confirmation banner displays "Subscription confirmation"
2. Guidance text: "To continue, you can go to your account in order to:"
3. Three action links:
   - "add a new email subscription" → `/subscriptions/add`
   - "manage your current email subscriptions" → `/subscriptions`
   - "find a court or tribunal" → `/hearing-lists/find-court`

### AC6: Data Persistence
1. Subscriptions stored in database table `subscription`
2. Table schema:
   - `subscription_id` (UUID, primary key)
   - `user_id` (string, foreign key to user)
   - `location_id` (number, references location data)
   - `date_added` (DateTime)
3. Unique constraint on `user_id` + `location_id` to prevent duplicates
4. Subscriptions can be added and deleted by users
5. Changes persist immediately

### AC7: Accessibility Requirements
1. WCAG 2.2 AA compliance
2. GOV.UK Design System components used throughout
3. Tables use proper `<th scope="col">` headers
4. Error summaries use `role="alert"`
5. All buttons, links, and checkboxes keyboard accessible
6. Visible focus states on all interactive elements
7. Back link on every page (top left)
8. Language toggle persists across pages

---

## URL Structure

| Page | URL | Method |
|------|-----|--------|
| Dashboard | `/account-home` | GET |
| List subscriptions | `/subscriptions` | GET |
| Add subscription (form) | `/subscriptions/add` | GET |
| Add subscription (submit) | `/subscriptions/add` | POST |
| Confirm subscriptions | `/subscriptions/confirm` | GET |
| Confirm subscriptions (submit) | `/subscriptions/confirm` | POST |
| Success confirmation | `/subscriptions/success` | GET |
| Remove subscription | `/subscriptions/remove/:id` | POST |

---

## Data Model

### Subscription Table

```prisma
model Subscription {
  id          String   @id @default(cuid()) @map("subscription_id")
  userId      String   @map("user_id")
  locationId  Int      @map("location_id")
  dateAdded   DateTime @default(now()) @map("date_added")

  @@unique([userId, locationId])
  @@index([userId])
  @@map("subscription")
}
```

**Business Rules:**
- Only verified users can create subscriptions
- Duplicate subscriptions (same user + location) prevented by unique constraint
- Subscriptions deleted immediately when removed
- No retention policy (subscriptions persist until manually deleted)
- Location references existing location data (in-memory, not database FK)

---

## Validation Rules

### Add Subscription Page
- **Required**: At least one venue must be selected
- **Error**: "Select at least one court or tribunal"

### Confirm Subscription Page
- **Required**: At least one subscription must remain
- **Error**: "There is a problem - At least one subscription is needed"
- If all removed: show error and "Add subscription" button

### General
- User must be authenticated
- User must be verified media user
- Session data cleared after successful submission

---

## Error Messages

### English (EN)
- "There is a problem"
- "At least one subscription is needed"
- "Select at least one court or tribunal"
- "You are already subscribed to this court or tribunal" (handled by database constraint)

### Welsh (CY)
- "Mae problem wedi codi"
- "Mae angen o leiaf un tanysgrifiad"
- "Dewiswch o leiaf un llys neu dribiwnlys"
- "Rydych chi eisoes wedi tanysgrifio i'r llys neu'r tribiwnlys hwn"

---

## Welsh Language Content

### Page 1: List Subscriptions
- **Title**: "Eich tanysgrifiadau e-bost"
- **Button**: "Ychwanegu tanysgrifiad e-bost"
- **Message**: "Nid oes gennych unrhyw danysgrifiadau gweithredol."
- **Table Headers**: "Enw'r llys neu'r tribiwnlys", "Dyddiad ychwanegu", "Camau gweithredu"
- **Remove Link**: "Tynnu"

### Page 2: Add Subscription
- **Title**: "Tanysgrifio yn ôl enw llys neu dribiwnlys"
- **Label**: "Chwilio am lys neu dribiwnlys"
- **Button**: "Parhau"

### Page 3: Confirm Subscriptions
- **Title**: "Cadarnhewch eich tanysgrifiadau e-bost"
- **Remove Link**: "Tynnu"
- **Add Another**: "Ychwanegu tanysgrifiad arall"
- **Button**: "Parhau"

### Page 4: Success
- **Title**: "Cadarnhad tanysgrifiad"
- **Intro**: "I barhau, gallwch fynd i'ch cyfrif er mwyn:"
- **Links**: "ychwanegu tanysgrifiad e-bost newydd", "rheoli eich tanysgrifiadau e-bost cyfredol", "dod o hyd i lys neu dribiwnlys"

---

## Test Scenarios

| ID | Scenario | Steps | Expected Result |
|----|----------|-------|-----------------|
| TS1 | Navigate to subscriptions | Log in as verified user → click "Email subscriptions" | Subscription list page loads with add button |
| TS2 | No subscriptions state | View subscriptions when none exist | Message: "You do not have any active subscriptions." |
| TS3 | View existing subscriptions | View subscriptions when some exist | Table displays all subscriptions with remove links |
| TS4 | Add subscription flow | Click add → select venues → continue | Navigates to confirmation page |
| TS5 | Validation: no venue selected | Click continue without selecting venues | Error: "Select at least one court or tribunal" |
| TS6 | Confirm and save | Review selections → click continue | Subscriptions saved, success page displayed |
| TS7 | Remove from confirmation | Select venues → remove all on confirm page | Error: "At least one subscription is needed" |
| TS8 | Add another subscription | On confirm page → click "Add another" | Returns to selection page, preserves existing selections |
| TS9 | Remove existing subscription | On list page → click "Remove" | Subscription deleted, page refreshes |
| TS10 | Duplicate prevention | Try to subscribe to same venue twice | Database constraint prevents duplicate |
| TS11 | Welsh language | Switch to Welsh on any page | All content displays in Welsh |
| TS12 | Accessibility: keyboard | Navigate entire flow with keyboard only | All functions accessible |
| TS13 | Accessibility: screen reader | Use screen reader on all pages | All content announced correctly |
| TS14 | Unauthorized access | Try to access subscriptions as non-verified user | Redirect to sign-in or access denied |

---

## Non-Functional Requirements

### Performance
- Subscription list loads within 2 seconds
- Database queries optimized with indexes
- Session data efficiently managed

### Security
- Authentication required for all routes
- User can only manage their own subscriptions
- SQL injection prevented via Prisma ORM
- CSRF protection on all POST requests

### Accessibility
- WCAG 2.2 AA compliance
- Screen reader compatible
- Keyboard navigation support
- Visible focus indicators
- Proper semantic HTML

### Maintainability
- Code follows HMCTS monorepo standards
- Business logic separated from controllers
- Type-safe database queries with Prisma
- Comprehensive unit and E2E tests

---

## Future Considerations

### Out of Scope (This Ticket)
- Actual email notification sending (separate ticket)
- Email notification frequency configuration
- Bulk subscription management
- Subscription export/import
- Email template design

### Potential Enhancements (Future)
- Email digest frequency preferences (immediate, daily, weekly)
- Subscription notes or labels
- Bulk subscribe to all venues in a region
- Subscription analytics (most popular venues)
- Email notification preview

---

## Dependencies

### Existing Modules
- `@hmcts/auth` - User authentication and authorization
- `@hmcts/location` - Location/venue data
- `@hmcts/web-core` - GOV.UK Design System integration
- `@hmcts/postgres` - Database access

### External Dependencies
- Prisma ORM for database operations
- Express.js for routing and middleware
- Nunjucks for templating
- GOV.UK Frontend components

---

## Risks and Clarifications

### Resolved
- ✅ Duplicate subscriptions should be prevented
- ✅ No retention policy for subscriptions (persist until deleted)
- ✅ Users can bulk-select multiple venues at once
- ✅ Error logging in standard application logs

### Deferred to Future Tickets
- ⏭️ Email notification delivery mechanism
- ⏭️ Email notification frequency/scheduling
- ⏭️ Email template design and content
- ⏭️ Unsubscribe via email link

---

## Success Metrics

- Verified users can successfully create subscriptions
- 0 duplicate subscription errors
- 100% WCAG 2.2 AA compliance
- 0 unauthorized access incidents
- All E2E tests passing
