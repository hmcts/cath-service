# VIBE-196: Verified User - Unsubscribe

## Problem Statement

Verified users need the ability to unsubscribe from email notifications about court and tribunal hearings. Currently, the account home dashboard shows an "Email subscriptions" section, but there is no functional implementation for users to manage or unsubscribe from these notifications.

Without an unsubscribe mechanism, users who no longer wish to receive notifications have no way to opt out, leading to poor user experience and potential GDPR compliance issues (users must be able to easily withdraw consent for communications).

## User Story

**As a** verified user of the Court and Tribunal Hearings service
**I want to** view and manage my email subscriptions
**So that** I can unsubscribe from notifications that are no longer relevant to me

## Acceptance Criteria

1. **Navigation Access**
   - Verified users can access email subscriptions from "Email subscriptions" link in account home dashboard
   - Verified users can access email subscriptions from "Email subscriptions" link in navigation header
   - Authentication is required to access all subscription pages

2. **Email Subscriptions List Page**
   - Page displays "Your email subscriptions" heading
   - Page shows the user's email address
   - Page lists current subscriptions with "Unsubscribe" links
   - Each subscription type is clearly labeled
   - Page is fully accessible (WCAG 2.2 AA compliant)
   - Page supports both English and Welsh languages

3. **Unsubscribe Confirmation Page**
   - Page asks "Are you sure you want to unsubscribe?"
   - Page displays which subscription the user is unsubscribing from
   - Page shows radio buttons: "Yes" and "No"
   - Page has a "Continue" button
   - Page provides clear consequences of unsubscribing
   - Form validation requires radio selection

4. **Unsubscribe Process**
   - User must confirm via Yes/No radio selection
   - Selecting "No" returns user to subscription list without changes
   - Selecting "Yes" processes unsubscribe and shows success page
   - System validates user is authenticated before processing
   - System updates user's email notification preferences in database
   - System handles errors gracefully with appropriate error messages

5. **Success Confirmation Page**
   - Page displays green notification banner with success message
   - Banner confirms email notifications have been stopped
   - Page provides link to return to "Your email subscriptions"
   - Page provides link to return to account home
   - Page is available in English and Welsh

6. **Database Changes**
   - User subscription preferences are persisted in database
   - Unsubscribe action is timestamped for audit purposes
   - Changes are atomic and handle concurrent updates safely

## Page Structure and Wireframes

### Page 1: Your Email Subscriptions (`/email-subscriptions`)

```
┌────────────────────────────────────────────────────────────────┐
│ GOV.UK Header                                                   │
│ [Home] [Dashboard] [Email subscriptions]                       │
└────────────────────────────────────────────────────────────────┘
│ BETA This is a new service...                                  │
├────────────────────────────────────────────────────────────────┤
│ ← Back                                                          │
│                                                                 │
│ Your email subscriptions                                        │
│ ============================================                    │
│                                                                 │
│ You are subscribed to email notifications at:                  │
│ user@example.com                                                │
│                                                                 │
│ ┌──────────────────────────────────────────────────────────┐  │
│ │ Court and tribunal hearing notifications                 │  │
│ │                                                           │  │
│ │ Get email notifications about upcoming court and         │  │
│ │ tribunal hearings, including updates about changes       │  │
│ │ to hearing times or locations.                           │  │
│ │                                                           │  │
│ │ [Unsubscribe]                                            │  │
│ └──────────────────────────────────────────────────────────┘  │
│                                                                 │
└────────────────────────────────────────────────────────────────┘
│ Footer: Help links, etc.                                       │
└────────────────────────────────────────────────────────────────┘
```

### Page 2: Unsubscribe Confirmation (`/email-subscriptions/unsubscribe-confirm`)

```
┌────────────────────────────────────────────────────────────────┐
│ GOV.UK Header                                                   │
│ [Home] [Dashboard] [Email subscriptions]                       │
└────────────────────────────────────────────────────────────────┘
│ BETA This is a new service...                                  │
├────────────────────────────────────────────────────────────────┤
│ ← Back                                                          │
│                                                                 │
│ Are you sure you want to unsubscribe?                          │
│ ============================================                    │
│                                                                 │
│ If you unsubscribe from court and tribunal hearing            │
│ notifications, you will no longer receive:                     │
│                                                                 │
│ • Email notifications about upcoming hearings                  │
│ • Updates about changes to hearing times or locations          │
│ • Reminders about hearings you are interested in               │
│                                                                 │
│ You can subscribe again at any time by visiting the            │
│ email subscriptions page.                                       │
│                                                                 │
│ ○ Yes                                                           │
│ ○ No                                                            │
│                                                                 │
│ [Continue]                                                      │
│                                                                 │
└────────────────────────────────────────────────────────────────┘
│ Footer: Help links, etc.                                       │
└────────────────────────────────────────────────────────────────┘
```

### Page 3: Unsubscribe Success (`/email-subscriptions/unsubscribe-success`)

```
┌────────────────────────────────────────────────────────────────┐
│ GOV.UK Header                                                   │
│ [Home] [Dashboard] [Email subscriptions]                       │
└────────────────────────────────────────────────────────────────┘
│ BETA This is a new service...                                  │
├────────────────────────────────────────────────────────────────┤
│ ┌──────────────────────────────────────────────────────────┐  │
│ │ ✓ Success                                                 │  │
│ │   You have unsubscribed from email notifications         │  │
│ └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│ You will no longer receive email notifications about court     │
│ and tribunal hearings at user@example.com                      │
│                                                                 │
│ What happens next                                               │
│ ──────────────────                                              │
│                                                                 │
│ You can subscribe again at any time by visiting your           │
│ email subscriptions page.                                       │
│                                                                 │
│ [View your email subscriptions]                                │
│                                                                 │
│ [Return to your account]                                        │
│                                                                 │
└────────────────────────────────────────────────────────────────┘
│ Footer: Help links, etc.                                       │
└────────────────────────────────────────────────────────────────┘
```

## URL Structure

| Page | URL | Method | Description |
|------|-----|--------|-------------|
| Subscriptions list | `/email-subscriptions` | GET | Display list of subscriptions with unsubscribe links |
| Unsubscribe confirmation | `/email-subscriptions/unsubscribe-confirm` | GET | Display confirmation page with Yes/No radios |
| Process unsubscribe | `/email-subscriptions/unsubscribe-confirm` | POST | Process unsubscribe based on radio selection |
| Success page | `/email-subscriptions/unsubscribe-success` | GET | Display success notification banner |

## Data Model

### Database Schema Changes

Add email notification preference to a new User table:

```prisma
model User {
  id                         String    @id @default(cuid())
  email                      String    @unique
  emailNotifications         Boolean   @default(true) @map("email_notifications")
  emailNotificationsUpdatedAt DateTime? @map("email_notifications_updated_at")
  createdAt                  DateTime  @default(now()) @map("created_at")
  updatedAt                  DateTime  @updatedAt @map("updated_at")

  @@map("user")
  @@index([email])
}
```

**Design Notes**:
- Single boolean flag for now (YAGNI principle)
- Default to `true` (opted in) for new users
- Timestamp for audit trail
- Email indexed for efficient lookups
- Future: Could expand to granular subscription types

## Session Data Flow

Store temporary data in session to pass between pages:

```typescript
interface EmailSubscriptionSession {
  subscriptionType?: string;  // Type of subscription being unsubscribed from
  returnUrl?: string;          // URL to return to after completion
}
```

**Session Flow**:
1. User clicks "Unsubscribe" on list page → Store subscription type in session
2. Confirmation page reads subscription type from session
3. Success page clears session data

## Validation Rules

### Page 1: Email Subscriptions List
- **Authentication**: User must be authenticated (verified user account)
- **Data Display**: Show user's current email from `req.user.email`
- **No form validation** (just display and links)

### Page 2: Unsubscribe Confirmation
- **Authentication**: User must be authenticated
- **Session Validation**: Session must contain subscription context
- **Form Validation**:
  - Radio selection is required (Yes or No)
  - If empty: Show error "Select yes if you want to unsubscribe"
- **CSRF Protection**: Token must be valid

### Page 3: Success Page
- **Authentication**: User must be authenticated
- **Session Guard**: Only accessible after successful unsubscribe
- **Redirect**: If accessed directly without session flag, redirect to list page

## Accessibility Requirements

### WCAG 2.2 AA Compliance

1. **Keyboard Navigation**
   - All links and buttons accessible via keyboard
   - Logical tab order throughout pages
   - Visible focus indicators on all interactive elements
   - Radio buttons navigable with arrow keys

2. **Screen Reader Support**
   - Semantic HTML structure (h1, main, section)
   - Descriptive page titles for each page
   - Clear button and link text
   - Radio fieldset with legend
   - Success banner uses proper ARIA role
   - No reliance on color alone for information

3. **Color Contrast**
   - Text meets 4.5:1 contrast ratio minimum
   - Interactive elements meet 3:1 contrast ratio
   - GOV.UK Design System colors inherently compliant
   - Success banner green meets contrast requirements

4. **Responsive Design**
   - Mobile-first approach (320px minimum width)
   - Text reflows without horizontal scrolling
   - Touch targets minimum 44x44px
   - Works at 200% zoom level
   - Radio buttons stack vertically on mobile

5. **Error Handling**
   - Clear error messages at top of page
   - GOV.UK Error Summary component
   - Errors linked to form controls
   - Descriptive error text
   - Screen reader announces errors

## Test Scenarios

### Happy Path

1. **View Subscriptions List**
   - Given: Authenticated verified user
   - When: User navigates to /email-subscriptions
   - Then: List page displays with user's email and subscriptions
   - And: Unsubscribe link is visible

2. **Unsubscribe with Yes**
   - Given: User on subscriptions list page
   - When: User clicks "Unsubscribe" link
   - Then: Confirmation page displays with Yes/No radios
   - When: User selects "Yes" and clicks Continue
   - Then: Preferences updated in database (emailNotifications = false)
   - And: User redirected to success page
   - And: Green success banner displayed

3. **Cancel Unsubscribe with No**
   - Given: User on confirmation page
   - When: User selects "No" and clicks Continue
   - Then: User redirected to subscriptions list
   - And: No changes made to database
   - And: User still subscribed

### Validation Errors

4. **Missing Radio Selection**
   - Given: User on confirmation page
   - When: User clicks Continue without selecting Yes or No
   - Then: Page reloads with error summary at top
   - And: Error message "Select yes if you want to unsubscribe"
   - And: Error linked to radio buttons
   - And: User's previous input preserved

### Authentication & Authorization

5. **Unauthenticated Access - List Page**
   - Given: User is not signed in
   - When: User attempts to access /email-subscriptions
   - Then: User redirected to sign-in page
   - And: Return URL stored for post-login redirect

6. **Unauthenticated Access - Confirmation Page**
   - Given: User is not signed in
   - When: User attempts to access /email-subscriptions/unsubscribe-confirm
   - Then: User redirected to sign-in page

7. **Session Expired**
   - Given: User was authenticated but session expired
   - When: User submits confirmation form
   - Then: User redirected to sign-in page
   - And: Appropriate error message displayed

### Edge Cases

8. **Direct Access to Success Page**
   - Given: User tries to access /email-subscriptions/unsubscribe-success directly
   - When: User navigates to success URL
   - Then: User redirected to subscriptions list (no session flag present)

9. **Already Unsubscribed**
   - Given: User already has emailNotifications = false
   - When: User views subscriptions list
   - Then: Page shows "You are not subscribed" state
   - And: No unsubscribe link shown (or shows "Subscribe" option for future)

10. **Database Error**
    - Given: Database is unavailable
    - When: User submits unsubscribe confirmation
    - Then: Error page displayed
    - And: User notified to try again later
    - And: No partial state changes

### Accessibility Testing

11. **Keyboard Navigation - All Pages**
    - Tab through all interactive elements in logical order
    - Activate buttons and links using Enter
    - Navigate radio buttons using arrow keys
    - Verify focus indicators visible on all elements

12. **Screen Reader Testing**
    - Test with NVDA/JAWS on Windows
    - Test with VoiceOver on macOS/iOS
    - Verify page titles announced correctly
    - Verify radio fieldset legend announced
    - Verify success banner announced
    - Verify all content accessible

13. **Mobile Responsiveness**
    - Test on 320px viewport (iPhone SE)
    - Test on 768px viewport (iPad)
    - Test at 200% zoom level
    - Verify touch targets adequate size (44x44px minimum)
    - Verify no horizontal scroll
    - Verify radio buttons stack vertically

### Welsh Language Support

14. **Welsh Translation - Full Journey**
    - Change language to Welsh (?lng=cy)
    - Verify list page displays in Welsh
    - Click unsubscribe link
    - Verify confirmation page displays in Welsh
    - Submit form
    - Verify success page displays in Welsh
    - Verify all content properly translated

15. **Language Persistence**
    - Start journey in Welsh
    - Complete unsubscribe flow
    - Verify language persists across all pages

## Technical Implementation Notes

### Session Management
- Use existing Express session middleware
- Store minimal data in session (subscription context)
- Clear session data after successful completion
- Set session expiry appropriately (e.g., 30 minutes)

### Security Considerations
- CSRF protection on all POST endpoints
- Authentication middleware on all routes
- SQL injection prevention via Prisma parameterized queries
- XSS prevention via Nunjucks auto-escaping
- No email logging (PII protection)

### Performance Considerations
- Database query optimization with email index
- Minimal page weight (text-only pages)
- Single database UPDATE per unsubscribe
- No external API calls

### GOV.UK Design System Components Used
- Notification Banner (success page)
- Radios (confirmation page)
- Button (all pages)
- Error Summary (validation errors)
- Back Link (all pages)
- Typography classes (govuk-heading-l, govuk-body, etc.)

### Future Enhancements (Out of Scope)
- Granular subscription management (subscribe to specific courts)
- Temporary pause of notifications (snooze feature)
- Unsubscribe via email link (without login required)
- Re-subscribe functionality on list page
- Subscription history/audit log for users
- Email notification preferences per hearing type
- Frequency preferences (immediate, daily digest, weekly)

## Dependencies

- `@hmcts/auth` - Authentication middleware (requireAuth, blockUserAccess)
- `@hmcts/postgres` - Database access via Prisma
- `govuk-frontend` - UI components and styles
- `express` - Web framework
- `express-session` - Session management
- `nunjucks` - Template rendering

## Success Metrics

- Users can complete unsubscribe flow in < 5 clicks
- Page load time < 2 seconds for all pages
- Zero accessibility violations (Axe-core automated tests)
- 100% of automated tests passing
- Zero production errors in first week post-launch
- Welsh translation accuracy confirmed by native speaker
- > 80% code coverage on business logic

## Compliance

### GDPR Requirements
- Users can easily withdraw consent (unsubscribe)
- Unsubscribe action timestamped for audit
- User email preferences persisted
- No email sent after successful unsubscribe
- Clear communication about what unsubscribing means

### Government Service Standard
- Meets all 14 points of Government Service Standard
- Accessible to all users (WCAG 2.2 AA)
- Works on all devices and browsers
- Welsh language support (bilingual service)
- Clear, simple user journey
