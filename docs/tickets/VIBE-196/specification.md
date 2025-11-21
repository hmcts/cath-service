# VIBE-196: Verified User - Unsubscribe

## Problem Statement

Verified users need the ability to unsubscribe from email notifications about court and tribunal hearings. Currently, the account home dashboard shows an "Email subscriptions" section, but there is no functional implementation for users to manage or unsubscribe from these notifications.

Without an unsubscribe mechanism, users who no longer wish to receive notifications have no way to opt out, leading to poor user experience and potential GDPR compliance issues (users must be able to easily withdraw consent for marketing communications).

## User Story

**As a** verified user of the Court and Tribunal Hearings service
**I want to** unsubscribe from email notifications about hearings
**So that** I stop receiving emails that are no longer relevant to me

## Acceptance Criteria

1. **Navigation Access**
   - Verified users can access the unsubscribe page from the "Email subscriptions" link in the account home dashboard
   - Verified users can access the unsubscribe page from the "Email subscriptions" link in the navigation header
   - Authentication is required to access the unsubscribe page

2. **Unsubscribe Page Display**
   - Page displays clear information about what unsubscribing means
   - Page shows the user's email address that will be unsubscribed
   - Page explains the consequences of unsubscribing (no more email notifications)
   - Page provides a clear "Unsubscribe" button and "Cancel" link
   - Page is fully accessible (WCAG 2.2 AA compliant)
   - Page supports both English and Welsh languages

3. **Unsubscribe Process**
   - User can confirm unsubscribe action via form submission
   - User can cancel and return to account home without unsubscribing
   - System validates the user is authenticated before processing
   - System updates the user's email notification preferences in the database
   - System handles errors gracefully with appropriate error messages

4. **Confirmation Page**
   - After successful unsubscribe, user sees a confirmation page
   - Confirmation page confirms email notifications have been stopped
   - Confirmation page provides a link back to the account home
   - Confirmation page is available in English and Welsh

5. **Database Changes**
   - User preferences are persisted in the database
   - Unsubscribe action is timestamped for audit purposes
   - Changes are atomic and handle concurrent updates safely

## Page Structure and Wireframes

### Page 1: Unsubscribe Form (`/unsubscribe`)

```
┌────────────────────────────────────────────────────────────────┐
│ GOV.UK Header                                                   │
│ [Home] [Dashboard] [Email subscriptions]                       │
└────────────────────────────────────────────────────────────────┘
│ BETA This is a new service...                                  │
├────────────────────────────────────────────────────────────────┤
│ ← Back                                                          │
│                                                                 │
│ Unsubscribe from email notifications                           │
│ ============================================                    │
│                                                                 │
│ You are currently subscribed to email notifications about      │
│ court and tribunal hearings.                                   │
│                                                                 │
│ Your email address: user@example.com                           │
│                                                                 │
│ If you unsubscribe, you will no longer receive:                │
│ • Email notifications about upcoming hearings                  │
│ • Updates about changes to hearing times or locations          │
│ • Reminders about hearings you are interested in               │
│                                                                 │
│ You can subscribe again at any time by visiting the Email      │
│ subscriptions page.                                             │
│                                                                 │
│ [Unsubscribe from email notifications] [Cancel]                │
│                                                                 │
└────────────────────────────────────────────────────────────────┘
│ Footer: Help links, etc.                                       │
└────────────────────────────────────────────────────────────────┘
```

### Page 2: Confirmation (`/unsubscribe/confirmation`)

```
┌────────────────────────────────────────────────────────────────┐
│ GOV.UK Header                                                   │
│ [Home] [Dashboard] [Email subscriptions]                       │
└────────────────────────────────────────────────────────────────────┘
│ BETA This is a new service...                                  │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│ ✓ You have been unsubscribed                                   │
│ ============================================                    │
│                                                                 │
│ You will no longer receive email notifications about court     │
│ and tribunal hearings.                                          │
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
| Unsubscribe form | `/unsubscribe` | GET | Display unsubscribe form |
| Unsubscribe action | `/unsubscribe` | POST | Process unsubscribe request |
| Confirmation | `/unsubscribe/confirmation` | GET | Display confirmation message |

## Data Model

### Database Schema Changes

Add email notification preference to the existing user table:

```prisma
model User {
  id                    String    @id @default(cuid())
  email                 String    @unique
  emailNotifications    Boolean   @default(true) @map("email_notifications")
  emailNotificationsUpdatedAt DateTime? @map("email_notifications_updated_at")
  createdAt             DateTime  @default(now()) @map("created_at")
  updatedAt             DateTime  @updatedAt @map("updated_at")

  @@map("user")
}
```

**Note**: The actual user table schema may differ. This is a proposed addition to support the unsubscribe functionality. If a user table doesn't exist, we'll need to create one or modify the existing authentication/account model.

## Validation Rules

1. **Authentication Validation**
   - User must be authenticated (verified user account)
   - Session must be valid
   - If not authenticated, redirect to sign-in page

2. **Form Validation**
   - No form fields to validate (confirmation button only)
   - CSRF token must be valid
   - Request must be POST method

3. **Business Logic Validation**
   - User must exist in database
   - User must have an email address
   - User must currently be subscribed (emailNotifications = true)

## Accessibility Requirements

### WCAG 2.2 AA Compliance

1. **Keyboard Navigation**
   - All interactive elements accessible via keyboard
   - Logical tab order (button then cancel link)
   - Visible focus indicators
   - Skip to main content link

2. **Screen Reader Support**
   - Semantic HTML structure (h1, main, section)
   - Descriptive page title
   - Clear button and link text
   - No reliance on color alone for information

3. **Color Contrast**
   - Text meets 4.5:1 contrast ratio minimum
   - Interactive elements meet 3:1 contrast ratio
   - GOV.UK Design System colors inherently compliant

4. **Responsive Design**
   - Mobile-first approach (320px minimum width)
   - Text reflows without horizontal scrolling
   - Touch targets minimum 44x44px
   - Works at 200% zoom level

5. **Error Handling**
   - Clear error messages
   - Error summary at top of page
   - Errors associated with form controls
   - Descriptive error text

## Test Scenarios

### Happy Path

1. **Successful Unsubscribe**
   - Given: Authenticated verified user with email notifications enabled
   - When: User navigates to /unsubscribe
   - Then: Unsubscribe form is displayed with user's email
   - When: User clicks "Unsubscribe from email notifications"
   - Then: User preferences updated in database (emailNotifications = false)
   - And: User redirected to /unsubscribe/confirmation
   - And: Confirmation message displayed

2. **Cancel Unsubscribe**
   - Given: User on unsubscribe page
   - When: User clicks "Cancel" link
   - Then: User redirected to /account-home
   - And: No changes made to database

### Authentication & Authorization

3. **Unauthenticated Access Attempt**
   - Given: User is not signed in
   - When: User attempts to access /unsubscribe
   - Then: User redirected to sign-in page

4. **Session Expired**
   - Given: User was authenticated but session expired
   - When: User submits unsubscribe form
   - Then: User redirected to sign-in page
   - And: Appropriate error message displayed

### Error Handling

5. **Database Error**
   - Given: Database is unavailable
   - When: User submits unsubscribe form
   - Then: Error page displayed with generic error message
   - And: User notified to try again later

6. **Already Unsubscribed**
   - Given: User already has emailNotifications = false
   - When: User accesses /unsubscribe
   - Then: Page still displays but with message indicating already unsubscribed
   - Or: Redirect to account home with flash message

### Accessibility Testing

7. **Keyboard Navigation**
   - Tab through all interactive elements in logical order
   - Activate button using Enter/Space
   - Verify focus indicators visible

8. **Screen Reader Testing**
   - Test with NVDA/JAWS
   - Verify page title announced
   - Verify button purpose clear
   - Verify all content accessible

9. **Mobile Responsiveness**
   - Test on 320px viewport
   - Test at 200% zoom
   - Verify touch targets adequate size
   - Verify no horizontal scroll

### Welsh Language Support

10. **Welsh Translation**
    - Change language to Welsh (?lng=cy)
    - Verify all content displays in Welsh
    - Verify form submission works in Welsh
    - Verify confirmation page displays in Welsh

## Technical Implementation Notes

### Session Management
- Use existing Express session middleware
- Store user ID in session after authentication
- Validate session before displaying page or processing form

### Security Considerations
- CSRF protection using csurf middleware or equivalent
- Input sanitization (though minimal input in this flow)
- SQL injection prevention via Prisma parameterized queries
- XSS prevention via Nunjucks auto-escaping

### Performance Considerations
- Database query optimization (indexed user lookups)
- Caching user preferences where appropriate
- Minimal page weight (text-only, few assets)

### Future Enhancements (Out of Scope)
- Granular subscription management (subscribe to specific courts)
- Temporary pause of notifications
- Unsubscribe via email link (without login)
- Subscription preferences page (manage multiple types)

## Dependencies

- `@hmcts/auth` - Authentication middleware
- `@hmcts/postgres` - Database access via Prisma
- GOV.UK Frontend - UI components
- Express.js - Route handlers and middleware
- Nunjucks - Template rendering

## Success Metrics

- Users can successfully unsubscribe without errors
- Page load time < 2 seconds
- Zero accessibility violations (Axe core)
- 100% of automated tests passing
- Welsh translation accuracy confirmed by native speaker
