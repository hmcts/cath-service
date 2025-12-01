# VIBE-192: Verified User – Email subscriptions

## Overview

Verified users need the ability to subscribe to email notifications for court and tribunal hearing publications. This feature allows users to select one or more court/tribunal locations and receive notifications when new publications are available.

## User Story

**As a** verified user of the Court and Tribunal Hearings service
**I want to** subscribe to email notifications for specific courts and tribunals
**So that** I can be automatically informed when new hearing publications are available

## Acceptance Criteria

### Functional Requirements

1. **User Access**
   - Only verified users can access subscription management
   - Feature is accessible from user account dashboard
   - Requires authentication to view or modify subscriptions

2. **Subscription Management**
   - Users can view their current subscriptions
   - Users can add new subscriptions by searching/selecting courts
   - Users can remove existing subscriptions
   - Users must maintain at least one subscription (cannot remove all)
   - Duplicate subscriptions prevented (cannot subscribe to same venue twice)

3. **Data Persistence**
   - Subscriptions stored in database with: subscription_id (UUID), user_id, location_id, date_added
   - User's subscriptions persist across sessions
   - Account deletion removes all associated subscriptions

### Non-Functional Requirements

1. **Accessibility**
   - WCAG 2.2 AA compliant
   - Fully keyboard navigable
   - Screen reader compatible
   - Works without JavaScript (progressive enhancement)

2. **Welsh Language Support**
   - All UI text available in Welsh and English
   - Language toggle available on all pages
   - Content matches user's selected language preference

3. **Security**
   - Authentication required for all subscription operations
   - CSRF protection on all forms
   - Input validation on all fields
   - Users can only manage their own subscriptions

## Page Flows

### Page 1: Your email subscriptions

**URL**: `/account/email-subscriptions`
**Methods**: GET, POST

**Purpose**: Display user's current subscriptions with ability to add more or remove existing ones

**Empty State** (no subscriptions):
```
Your email subscriptions
────────────────────────

You have no email subscriptions

Subscribe to courts and tribunals to receive email notifications
when new hearing publications are available.

[Add subscription] button
```

**With Subscriptions**:
```
Your email subscriptions
────────────────────────

You are subscribed to 3 courts and tribunals

[Add subscription] button

┌──────────────────────────────────────────────────┐
│ Birmingham Civil and Family Justice Centre       │
│ Subscribed: 12 January 2025                      │
│ [Remove] link                                    │
└──────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────┐
│ Manchester Crown Court                           │
│ Subscribed: 5 January 2025                       │
│ [Remove] link                                    │
└──────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────┐
│ Cardiff Employment Tribunal                      │
│ Subscribed: 28 December 2024                     │
│ [Remove] link                                    │
└──────────────────────────────────────────────────┘
```

**GOV.UK Components**:
- govukButton (Add subscription)
- govukSummaryList (subscription list)
- govukWarningText (empty state)
- govukNotificationBanner (success messages after add/remove)

**Validation**:
- None on this page (display only, actions redirect to other pages)

---

### Page 2: Subscribe by court or tribunal name

**URL**: `/account/email-subscriptions/add`
**Methods**: GET, POST

**Purpose**: Search for courts/tribunals and select one to subscribe to

**Layout**:
```
Subscribe by court or tribunal name
────────────────────────────────────

Search for a court or tribunal by name:

[Search input field                           ]
[Search] button

Or browse all courts and tribunals alphabetically:

[Browse A-Z] link
```

**After Search** (query parameter: `?q=birmingham`):
```
Subscribe by court or tribunal name
────────────────────────────────────

Search results for "birmingham" (5 results)

[New search input with "birmingham" pre-filled   ]
[Search] button

┌──────────────────────────────────────────────────┐
│ Birmingham Civil and Family Justice Centre       │
│ Bull Street, Birmingham, B4 6DS                  │
│ [Subscribe] button                               │
└──────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────┐
│ Birmingham Crown Court                           │
│ Bull Street, Birmingham, B4 6DS                  │
│ [Subscribe] button                               │
└──────────────────────────────────────────────────┘

... more results ...
```

**Browse A-Z View** (URL: `/account/email-subscriptions/add?view=browse`):
```
Subscribe by court or tribunal name
────────────────────────────────────

Browse all courts and tribunals

[A] [B] [C] [D] [E] [F] [G] [H] [I] [J] [K] [L] [M]
[N] [O] [P] [Q] [R] [S] [T] [U] [V] [W] [X] [Y] [Z]

Courts and tribunals beginning with 'B'

• Birmingham Civil and Family Justice Centre [Subscribe]
• Birmingham Crown Court [Subscribe]
• Blackpool Magistrates Court [Subscribe]
... more ...
```

**GOV.UK Components**:
- govukInput (search field)
- govukButton (Search, Subscribe buttons)
- govukBackLink (return to dashboard)

**Validation**:
- Search query minimum 2 characters
- At least one result must be returned (or show "No results" message)
- Cannot subscribe to a location user is already subscribed to (show error)

---

### Page 3: Confirm your email subscriptions

**URL**: `/account/email-subscriptions/confirm`
**Methods**: GET, POST

**Purpose**: Review selected subscription before confirming, with option to remove

**Layout** (single subscription pending):
```
Confirm your email subscriptions
─────────────────────────────────

Review your subscription before confirming:

┌──────────────────────────────────────────────────┐
│ Birmingham Civil and Family Justice Centre       │
│ Bull Street, Birmingham, B4 6DS                  │
│ [Remove] link                                    │
└──────────────────────────────────────────────────┘

You will receive email notifications when new hearing
publications are available for this court.

[Confirm subscription] button
[Cancel] link (returns to add page)
```

**With Multiple Selections** (if user selected multiple in one session):
```
Confirm your email subscriptions
─────────────────────────────────

Review your subscriptions before confirming:

┌──────────────────────────────────────────────────┐
│ Birmingham Civil and Family Justice Centre       │
│ [Remove] link                                    │
└──────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────┐
│ Manchester Crown Court                           │
│ [Remove] link                                    │
└──────────────────────────────────────────────────┘

[Confirm subscriptions] button
[Cancel] link
```

**Error State** (tried to remove all):
```
[Error Summary]
There is a problem
• You must subscribe to at least one court or tribunal

Confirm your email subscriptions
─────────────────────────────────

[No subscriptions shown]

[Back to search] link
```

**GOV.UK Components**:
- govukSummaryList (subscription list with remove actions)
- govukButton (Confirm)
- govukBackLink
- govukErrorSummary (validation errors)

**Validation**:
- Must have at least one subscription selected
- Cannot proceed with zero subscriptions
- All selected locations must be valid location IDs

---

### Page 4: Subscription confirmation

**URL**: `/account/email-subscriptions/confirmation`
**Method**: GET (only accessed after successful POST)

**Purpose**: Confirm successful subscription addition

**Layout** (single subscription):
```
┌─────────────────────────────────────────────────┐
│ ✓ Subscription confirmed                        │
└─────────────────────────────────────────────────┘

You have subscribed to email notifications for:
• Birmingham Civil and Family Justice Centre

You will receive an email when new hearing publications
are available for this court.

[View your subscriptions] button
[Back to service home] link
```

**Layout** (multiple subscriptions):
```
┌─────────────────────────────────────────────────┐
│ ✓ Subscriptions confirmed                       │
└─────────────────────────────────────────────────┘

You have subscribed to email notifications for:
• Birmingham Civil and Family Justice Centre
• Manchester Crown Court

You will receive emails when new hearing publications
are available for these courts.

[View your subscriptions] button
[Back to service home] link
```

**GOV.UK Components**:
- govukPanel (success confirmation - green banner)
- govukButton
- govukBackLink

**Note**: This page should only be accessible after a successful POST to confirm. Direct access should redirect to the subscriptions dashboard.

---

## Database Schema

### New Table: subscription

```prisma
model Subscription {
  subscriptionId String   @id @default(uuid()) @map("subscription_id") @db.Uuid
  userId         String   @map("user_id")
  locationId     String   @map("location_id")
  subscribedAt   DateTime @default(now()) @map("subscribed_at")
  isActive       Boolean  @default(true) @map("is_active")

  @@unique([userId, locationId], name: "unique_user_location")
  @@index([userId], name: "idx_subscription_user")
  @@index([locationId], name: "idx_subscription_location")
  @@index([isActive], name: "idx_subscription_active")
  @@map("subscription")
}
```

**Field Descriptions**:
- `subscription_id`: Unique identifier for the subscription (UUID)
- `user_id`: ID of the user who created the subscription
- `location_id`: ID of the court/tribunal location
- `subscribed_at`: Timestamp when subscription was created (maps to "date_added" requirement)
- `is_active`: Soft delete flag (true = active, false = deleted)

**Indexes**:
- `userId`: Find all subscriptions for a user (dashboard page)
- `locationId`: Find all users subscribed to a location (for notifications)
- `isActive`: Filter active subscriptions efficiently
- Unique constraint on (userId, locationId): Prevent duplicate subscriptions

---

## Validation Rules

### Page 1: Dashboard
- No validation required (display only)

### Page 2: Add Subscription
- Search query: Minimum 2 characters, maximum 100 characters
- Location ID: Must exist in location data
- Duplicate check: User cannot subscribe to a location they're already subscribed to
- Error messages:
  - "Enter at least 2 characters to search"
  - "You are already subscribed to this court"
  - "No results found for '{query}'"

### Page 3: Confirm
- Must have at least one subscription in the confirmation list
- All location IDs must be valid
- Cannot proceed with empty list
- Error messages:
  - "You must subscribe to at least one court or tribunal"
  - "Invalid location selected"

### Page 4: Confirmation
- No validation (display only)
- Redirect to dashboard if accessed directly without prior confirmation

---

## URL Structure

| Page | URL | Methods | Auth Required |
|------|-----|---------|---------------|
| Dashboard | `/account/email-subscriptions` | GET, POST | Yes (Verified) |
| Add Subscription | `/account/email-subscriptions/add` | GET, POST | Yes (Verified) |
| Confirm | `/account/email-subscriptions/confirm` | GET, POST | Yes (Verified) |
| Confirmation | `/account/email-subscriptions/confirmation` | GET | Yes (Verified) |

**Query Parameters**:
- `/add?q=search-term`: Search results
- `/add?view=browse`: Browse A-Z view
- `/add?view=browse&letter=B`: Browse specific letter

---

## Session Storage

Track pending subscriptions during the add/confirm flow:

```typescript
interface EmailSubscriptionsSession {
  pendingSubscriptions?: string[]; // Array of location IDs
  confirmationComplete?: boolean;  // Flag for confirmation page access
}
```

**Flow**:
1. User clicks "Subscribe" on Page 2 → Add location ID to `pendingSubscriptions` array
2. User navigates to Page 3 → Display all locations in `pendingSubscriptions`
3. User clicks "Remove" on Page 3 → Remove location ID from array
4. User clicks "Confirm" on Page 3 → Save to database, set `confirmationComplete` = true
5. User views Page 4 → Show success, clear session data

---

## Accessibility Requirements

### WCAG 2.2 AA Compliance

1. **Keyboard Navigation**
   - All interactive elements accessible via Tab key
   - Logical tab order throughout forms
   - Focus indicators visible on all interactive elements
   - Skip links provided for main content

2. **Screen Readers**
   - Semantic HTML5 elements (nav, main, section)
   - ARIA labels on search input: "Search for a court or tribunal"
   - ARIA live region for search results count
   - Clear link text (avoid "click here")
   - Error messages linked to form fields via aria-describedby

3. **Visual Design**
   - Color contrast ratio minimum 4.5:1 for text (GOV.UK Design System compliant)
   - Text resizable up to 200% without loss of functionality
   - No information conveyed by color alone
   - Focus states clearly visible (GOV.UK defaults)

4. **Forms**
   - Labels associated with inputs via for/id
   - Error messages in error summary and inline
   - Error summary receives focus when errors present
   - Fieldset/legend for grouped controls

5. **Progressive Enhancement**
   - Core functionality works without JavaScript
   - Forms submit via standard HTTP POST
   - Search works with page refresh
   - JavaScript enhances (e.g., autocomplete) but doesn't replace

---

## Welsh Language Content

All pages must provide Welsh translations for:

### Page 1 - Dashboard
- EN: "Your email subscriptions", "You have no email subscriptions", "You are subscribed to X courts and tribunals", "Add subscription", "Remove", "Subscribed: {date}"
- CY: "Eich tanysgrifiadau e-bost", "Nid oes gennych unrhyw danysgrifiadau e-bost", "Rydych wedi tanysgrifio i X llys a thribiwnlys", "Ychwanegu tanysgrifiad", "Dileu", "Tanysgrifiwyd: {dyddiad}"

### Page 2 - Add Subscription
- EN: "Subscribe by court or tribunal name", "Search for a court or tribunal by name", "Search", "Subscribe", "Browse A-Z", "Search results for", "results"
- CY: "Tanysgrifio yn ôl enw llys neu dribiwnlys", "Chwilio am lys neu dribiwnlys yn ôl enw", "Chwilio", "Tanysgrifio", "Pori A-Z", "Canlyniadau chwilio ar gyfer", "canlyniad"

### Page 3 - Confirm
- EN: "Confirm your email subscriptions", "Review your subscription before confirming", "You will receive email notifications...", "Confirm subscription", "Cancel", "Remove"
- CY: "Cadarnhau eich tanysgrifiadau e-bost", "Adolygu eich tanysgrifiad cyn cadarnhau", "Byddwch yn derbyn hysbysiadau e-bost...", "Cadarnhau tanysgrifiad", "Canslo", "Dileu"

### Page 4 - Confirmation
- EN: "Subscription confirmed", "You have subscribed to email notifications for:", "View your subscriptions", "Back to service home"
- CY: "Tanysgrifiad wedi'i gadarnhau", "Rydych wedi tanysgrifio i hysbysiadau e-bost ar gyfer:", "Gweld eich tanysgrifiadau", "Yn ôl i hafan y gwasanaeth"

### Error Messages
- EN: "There is a problem", "You must subscribe to at least one court or tribunal", "Enter at least 2 characters to search", "You are already subscribed to this court"
- CY: "Mae problem wedi codi", "Mae'n rhaid i chi danysgrifio i o leiaf un llys neu dribiwnlys", "Rhowch o leiaf 2 nod i chwilio", "Rydych eisoes wedi tanysgrifio i'r llys hwn"

---

## Test Scenarios

### Unit Tests

1. **Subscription Service**
   - `createSubscription()` creates new subscription successfully
   - `createSubscription()` prevents duplicate subscriptions
   - `getSubscriptionsByUserId()` returns user's active subscriptions
   - `removeSubscription()` deactivates subscription (soft delete)
   - `removeSubscription()` validates user owns subscription

2. **Validation Functions**
   - `validateLocationId()` returns true for valid location
   - `validateLocationId()` returns false for invalid location
   - `validateMinimumSubscriptions()` prevents removing all subscriptions
   - `validateDuplicateSubscription()` detects duplicates

### Integration Tests

1. **Complete Add Flow**
   - User searches for court
   - User selects court from results
   - User confirms subscription
   - Subscription saved to database
   - Success message displayed

2. **Remove Flow**
   - User removes subscription from dashboard
   - Subscription marked inactive in database
   - Confirmation message shown
   - Subscription no longer appears in list

### E2E Tests (Playwright)

```typescript
test('verified user can add email subscription', async ({ page }) => {
  // Login as verified user
  await page.goto('/login');
  // ... authentication ...

  // Navigate to subscriptions
  await page.goto('/account/email-subscriptions');
  await expect(page.locator('h1')).toContainText('Your email subscriptions');

  // Add subscription
  await page.click('text=Add subscription');
  await page.fill('[name="search"]', 'Birmingham');
  await page.click('button:has-text("Search")');
  await page.click('button:has-text("Subscribe")').first();

  // Confirm
  await page.click('button:has-text("Confirm subscription")');

  // Verify success
  await expect(page.locator('.govuk-panel__title')).toContainText('Subscription confirmed');
});

test('user cannot remove all subscriptions', async ({ page }) => {
  await page.goto('/account/email-subscriptions/confirm');

  // Remove all subscriptions
  await page.click('a:has-text("Remove")');

  // Try to confirm
  await page.click('button:has-text("Confirm subscription")');

  // Verify error
  await expect(page.locator('.govuk-error-summary')).toBeVisible();
  await expect(page.locator('.govuk-error-message')).toContainText('at least one');
});

test('subscriptions page is accessible', async ({ page }) => {
  await page.goto('/account/email-subscriptions');
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});

test('Welsh language toggle works', async ({ page }) => {
  await page.goto('/account/email-subscriptions');
  await page.click('a[href*="lng=cy"]');
  await expect(page.locator('h1')).toContainText('Eich tanysgrifiadau e-bost');
});
```

---

## Security Considerations

1. **Authentication & Authorization**
   - All pages require `requireAuth()` middleware
   - All pages require `blockUserAccess()` (verified users only)
   - Users can only view/modify their own subscriptions
   - Validate user owns subscription before removal

2. **CSRF Protection**
   - All POST forms include CSRF token
   - Tokens validated on server side

3. **Input Validation**
   - Search queries sanitized
   - Location IDs validated against known locations
   - Maximum subscription limits enforced

4. **Data Protection**
   - No email addresses stored in subscriptions (use user_id reference)
   - Soft deletes preserve audit trail
   - No sensitive data in URLs or logs

---

## Performance Requirements

- Subscription list page load: < 2 seconds
- Search results: < 1 second
- Add/remove operations: < 1 second
- Support up to 50 subscriptions per user
- Support 10,000 concurrent verified users

---

## Out of Scope

The following are explicitly NOT included in this ticket:

- Email notification sending (separate ticket)
- Email frequency preferences (immediate/daily/weekly)
- Unsubscribe via email link
- Subscription to specific case types or hearing types
- Bulk subscription import/export
- SMS or push notifications
- Notification history
- Email templates and GOV Notify integration
