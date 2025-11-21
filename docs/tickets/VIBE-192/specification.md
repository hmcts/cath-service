# VIBE-192: Verified User – Email subscriptions

## Problem Statement

Verified users need the ability to subscribe to email notifications for court and tribunal hearing publications. Currently, there is no mechanism for users to manage their notification preferences or receive automated updates when new publications are available for courts they are interested in.

The system needs to allow users to:
- Browse available courts and tribunals
- Subscribe to notifications for specific locations
- Manage their subscriptions (view, add, remove)
- Receive emails when new publications are posted

## User Story

**As a** verified user of the Court and Tribunal Hearings service
**I want to** subscribe to email notifications for specific courts and tribunals
**So that** I can be automatically informed when new hearing publications are available without manually checking the service

## Acceptance Criteria

### Functional Requirements

1. **Subscription Management Page**
   - Authenticated users can access an email subscriptions management page from their account dashboard
   - Page displays list of currently active subscriptions
   - Each subscription shows: court/tribunal name, location, date subscribed
   - Users can remove existing subscriptions with confirmation
   - Empty state shown when user has no subscriptions

2. **Add Subscription Flow**
   - Users can add new subscriptions by selecting a court/tribunal location
   - Location search/browse functionality to find courts
   - Confirmation message shown when subscription is successfully added
   - Duplicate subscriptions prevented (cannot subscribe to same location twice)
   - Maximum subscription limit of 50 locations per user

3. **Email Notifications**
   - Users receive email when new publications are posted for subscribed locations
   - Emails contain: court name, publication type, date, direct link to view publication
   - Emails sent within 15 minutes of publication being available
   - Unsubscribe link included in all notification emails
   - Users can manage email frequency preference (immediate, daily digest, weekly digest)

4. **Data Management**
   - User email taken from their verified account profile
   - Subscription data persists across sessions
   - Users can export their subscription list
   - Account deletion removes all associated subscriptions

### Non-Functional Requirements

1. **Accessibility**
   - WCAG 2.2 AA compliant
   - Fully keyboard navigable
   - Screen reader compatible
   - Works without JavaScript (progressive enhancement)

2. **Welsh Language Support**
   - All UI text available in Welsh and English
   - Email notifications sent in user's preferred language
   - Language preference persists from user profile

3. **Performance**
   - Subscription list loads within 2 seconds
   - Add/remove operations complete within 1 second
   - Email notifications sent within 15 minutes of publication

4. **Security**
   - Only authenticated verified users can manage subscriptions
   - CSRF protection on all forms
   - Email addresses validated and sanitized
   - Rate limiting on subscription changes (max 10 per minute)

## Page Structure and Wireframes

### 1. Email Subscriptions Dashboard (`/account/email-subscriptions`)

**Layout:**
```
[GOV.UK Header]
[Phase Banner]
[Breadcrumb: Home > Your account > Email subscriptions]

Your email subscriptions
────────────────────────

You are subscribed to 3 courts and tribunals

[Add subscription] button

Current subscriptions:
┌──────────────────────────────────────────────────┐
│ Birmingham Civil and Family Justice Centre       │
│ Subscribed: 12 January 2025                      │
│ [Remove subscription] link                       │
└──────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────┐
│ Manchester Crown Court                           │
│ Subscribed: 5 January 2025                       │
│ [Remove subscription] link                       │
└──────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────┐
│ Cardiff Employment Tribunal                      │
│ Subscribed: 28 December 2024                     │
│ [Remove subscription] link                       │
└──────────────────────────────────────────────────┘

Email preferences
─────────────────
○ Send emails immediately when publications are available
● Send a daily digest email (selected)
○ Send a weekly digest email

[Save preferences] button
```

**Empty State:**
```
Your email subscriptions
────────────────────────

You have no email subscriptions

Add a subscription to get email notifications when new
court and tribunal hearing publications are available.

[Add subscription] button
```

### 2. Add Subscription Page (`/account/email-subscriptions/add`)

**Layout:**
```
[GOV.UK Header]
[Phase Banner]
[Breadcrumb: Home > Your account > Email subscriptions > Add subscription]

Add email subscription
──────────────────────

Search for a court or tribunal

[Search input field]
[Search] button

Or browse by region:
• England and Wales
• Scotland
• Northern Ireland
```

### 3. Subscription Search Results (`/account/email-subscriptions/search`)

**Layout:**
```
Search results for "Birmingham"
───────────────────────────────

5 results found

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

[More results...]
```

### 4. Confirm Subscription (`/account/email-subscriptions/confirm`)

**Layout:**
```
Confirm subscription
────────────────────

Birmingham Civil and Family Justice Centre
Bull Street, Birmingham, B4 6DS

You will receive email notifications when new hearing
publications are available for this court.

[Confirm subscription] button
[Cancel] link
```

### 5. Remove Subscription Confirmation (`/account/email-subscriptions/remove`)

**Layout:**
```
Remove subscription
───────────────────

Are you sure you want to remove your subscription to:

Birmingham Civil and Family Justice Centre

You will no longer receive email notifications for this court.

[Yes, remove subscription] button
[No, keep subscription] link
```

## Data Model

### New Database Tables

```prisma
model Subscription {
  subscriptionId   String   @id @default(uuid()) @map("subscription_id") @db.Uuid
  userId          String   @map("user_id")
  locationId      String   @map("location_id")
  emailFrequency  String   @default("IMMEDIATE") @map("email_frequency") // IMMEDIATE, DAILY, WEEKLY
  subscribedAt    DateTime @default(now()) @map("subscribed_at")
  unsubscribedAt  DateTime? @map("unsubscribed_at")
  isActive        Boolean  @default(true) @map("is_active")

  @@unique([userId, locationId])
  @@index([userId])
  @@index([locationId])
  @@index([isActive])
  @@map("subscription")
}

model NotificationQueue {
  queueId         String   @id @default(uuid()) @map("queue_id") @db.Uuid
  subscriptionId  String   @map("subscription_id") @db.Uuid
  artefactId      String   @map("artefact_id") @db.Uuid
  status          String   @default("PENDING") // PENDING, SENT, FAILED
  attemptCount    Int      @default(0) @map("attempt_count")
  createdAt       DateTime @default(now()) @map("created_at")
  sentAt          DateTime? @map("sent_at")
  errorMessage    String?   @map("error_message")

  @@index([status])
  @@index([createdAt])
  @@map("notification_queue")
}

model EmailLog {
  logId           String   @id @default(uuid()) @map("log_id") @db.Uuid
  userId          String   @map("user_id")
  emailAddress    String   @map("email_address")
  subject         String
  templateId      String   @map("template_id")
  status          String   // SENT, FAILED, BOUNCED
  sentAt          DateTime @default(now()) @map("sent_at")
  errorMessage    String?   @map("error_message")

  @@index([userId])
  @@index([sentAt])
  @@map("email_log")
}
```

### User Profile Extension

The existing `UserProfile` interface in `@hmcts/auth` should be extended to include email notification preferences:

```typescript
interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  role?: string;
  provenance?: string;
  emailFrequency?: string; // IMMEDIATE, DAILY, WEEKLY
  locale?: string; // en, cy
}
```

## URL Structure

| Page | URL | Method | Auth Required |
|------|-----|--------|---------------|
| Subscriptions Dashboard | `/account/email-subscriptions` | GET | Yes (Verified) |
| Add Subscription | `/account/email-subscriptions/add` | GET | Yes (Verified) |
| Search Courts | `/account/email-subscriptions/search` | GET | Yes (Verified) |
| Confirm Subscription | `/account/email-subscriptions/confirm` | POST | Yes (Verified) |
| Remove Subscription | `/account/email-subscriptions/remove` | POST | Yes (Verified) |
| Update Preferences | `/account/email-subscriptions/preferences` | POST | Yes (Verified) |
| Unsubscribe via Email | `/unsubscribe/[token]` | GET | No |

## Validation Rules

### Subscription Management

1. **User ID Validation**
   - Must be authenticated verified user
   - User ID must exist in session
   - User email must be verified

2. **Location ID Validation**
   - Must be a valid court/tribunal location ID
   - Must exist in the system
   - Cannot be empty or null

3. **Duplicate Prevention**
   - Check for existing active subscription (userId + locationId)
   - Return appropriate error message if duplicate

4. **Subscription Limits**
   - Maximum 50 active subscriptions per user
   - Return error when limit exceeded

5. **Email Frequency**
   - Must be one of: IMMEDIATE, DAILY, WEEKLY
   - Default to IMMEDIATE if not specified

### Email Notifications

1. **Email Address Validation**
   - Must be valid email format
   - Must match user profile email
   - Maximum 254 characters

2. **Content Validation**
   - Subject line maximum 998 characters
   - Template ID must exist
   - All required template variables provided

3. **Rate Limiting**
   - Maximum 10 subscription changes per user per minute
   - Maximum 100 notification emails per user per day

## Accessibility Requirements

### WCAG 2.2 AA Compliance

1. **Keyboard Navigation**
   - All interactive elements accessible via keyboard
   - Logical tab order maintained
   - Focus indicators visible on all interactive elements
   - Skip links provided for main content

2. **Screen Readers**
   - Semantic HTML used throughout
   - ARIA labels on all form controls
   - Status messages announced via aria-live regions
   - Clear link text (avoid "click here")

3. **Visual Design**
   - Color contrast ratio minimum 4.5:1 for text
   - Text resizable up to 200% without loss of functionality
   - No information conveyed by color alone
   - Focus states clearly visible

4. **Forms**
   - Clear labels associated with inputs
   - Error messages linked to inputs
   - Error summary at top of page
   - Fieldset and legend for grouped controls

5. **Progressive Enhancement**
   - Core functionality works without JavaScript
   - Forms submit via standard HTTP POST
   - Search functionality works with page refresh
   - JavaScript enhances but doesn't replace functionality

### Screen Reader Testing

Must be tested with:
- JAWS (Windows)
- NVDA (Windows)
- VoiceOver (macOS/iOS)
- TalkBack (Android)

## Test Scenarios

### Unit Tests

1. **Subscription Service**
   - `createSubscription()` - Creates new subscription successfully
   - `createSubscription()` - Prevents duplicate subscriptions
   - `createSubscription()` - Enforces 50 subscription limit
   - `getSubscriptionsByUserId()` - Returns user's subscriptions
   - `removeSubscription()` - Deactivates subscription
   - `validateLocationId()` - Validates court location exists

2. **Email Service**
   - `sendNotificationEmail()` - Sends email successfully
   - `sendNotificationEmail()` - Handles email failure gracefully
   - `queueNotification()` - Adds notification to queue
   - `processNotificationQueue()` - Processes pending notifications
   - `generateUnsubscribeToken()` - Creates secure unsubscribe token

3. **Validation**
   - Email format validation
   - Location ID validation
   - User ID validation
   - Rate limiting enforcement

### Integration Tests

1. **Subscription Flow**
   - User adds subscription via web interface
   - Subscription saved to database
   - Confirmation message displayed
   - Subscription appears in user's list

2. **Notification Flow**
   - New publication created
   - Subscriptions identified
   - Notifications queued
   - Emails sent to subscribers
   - Email log updated

3. **Unsubscribe Flow**
   - User clicks unsubscribe link in email
   - Token validated
   - Subscription removed
   - Confirmation page displayed

### E2E Tests (Playwright)

1. **Add Subscription**
   ```typescript
   test('verified user can add email subscription', async ({ page }) => {
     await page.goto('/account/email-subscriptions');
     await page.click('text=Add subscription');
     await page.fill('[name="search"]', 'Birmingham');
     await page.click('text=Search');
     await page.click('text=Subscribe').first();
     await page.click('text=Confirm subscription');
     await expect(page.locator('text=Subscription added')).toBeVisible();
   });
   ```

2. **Remove Subscription**
   ```typescript
   test('user can remove subscription', async ({ page }) => {
     await page.goto('/account/email-subscriptions');
     await page.click('text=Remove subscription').first();
     await page.click('text=Yes, remove subscription');
     await expect(page.locator('text=Subscription removed')).toBeVisible();
   });
   ```

3. **Update Email Preferences**
   ```typescript
   test('user can change email frequency', async ({ page }) => {
     await page.goto('/account/email-subscriptions');
     await page.check('[value="DAILY"]');
     await page.click('text=Save preferences');
     await expect(page.locator('text=Preferences updated')).toBeVisible();
   });
   ```

4. **Accessibility**
   ```typescript
   test('subscriptions page is accessible', async ({ page }) => {
     await page.goto('/account/email-subscriptions');
     const results = await new AxeBuilder({ page }).analyze();
     expect(results.violations).toEqual([]);
   });
   ```

### Manual Test Scenarios

1. **Screen Reader Navigation**
   - Navigate entire subscription flow using only screen reader
   - Verify all form labels are announced
   - Verify error messages are announced

2. **Keyboard-Only Navigation**
   - Complete entire subscription flow using only keyboard
   - Verify logical tab order
   - Verify all actions accessible via keyboard

3. **Email Testing**
   - Verify emails received in Gmail, Outlook, Apple Mail
   - Verify formatting correct across email clients
   - Verify links work correctly
   - Verify unsubscribe link functions

4. **Welsh Language Testing**
   - Switch to Welsh language
   - Verify all UI text in Welsh
   - Verify emails sent in Welsh
   - Verify validation messages in Welsh

## Security Considerations

1. **Authentication & Authorization**
   - Require verified user authentication
   - Validate user owns subscription before removal
   - CSRF tokens on all state-changing forms

2. **Data Protection**
   - Email addresses stored securely
   - Unsubscribe tokens time-limited (7 days)
   - Rate limiting on subscription changes
   - SQL injection prevention via Prisma

3. **Email Security**
   - SPF, DKIM, DMARC configured
   - Unsubscribe links use secure tokens
   - No sensitive data in email content
   - Email addresses not exposed in logs

4. **Privacy**
   - Comply with GDPR
   - Allow users to export subscription data
   - Delete all subscriptions on account deletion
   - Privacy notice updated to mention email notifications

## Technical Dependencies

### Required Libraries

- `@hmcts/auth` - User authentication and profiles
- `@hmcts/location` - Court location data
- `@hmcts/publication` - Publication data
- GOV Notify API or similar email service
- Prisma ORM for database operations

### Infrastructure

- Scheduled job for processing notification queue
- Email service integration (GOV Notify recommended)
- Database indexes for performance
- Redis cache for rate limiting

## Performance Targets

- Subscription list page load: < 2 seconds
- Add/remove subscription: < 1 second
- Email notification sending: < 15 minutes after publication
- Support 10,000 active subscriptions
- Support 1,000 concurrent users

## Monitoring & Analytics

1. **Metrics to Track**
   - Number of active subscriptions
   - Subscription additions per day
   - Subscription removals per day
   - Email open rates
   - Email click-through rates
   - Unsubscribe rate

2. **Alerts**
   - Email delivery failures > 5%
   - Notification queue processing delayed > 30 minutes
   - Subscription service errors > 1%

## Future Enhancements (Out of Scope)

- SMS notifications
- Push notifications
- Subscription to specific case types
- Custom notification rules
- Email templates with more detail
- Integration with calendar apps
