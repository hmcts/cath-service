# VIBE-307: Technical Implementation Plan

## Overview
This ticket implements list type subscription functionality for verified media users, allowing them to select specific list types when subscribing to hearing lists in CaTH. The implementation includes an 8-page workflow from subscription management through court/tribunal selection, list type selection, version selection, and confirmation.

## Summary
Verified media users can subscribe to specific list types for their selected courts and tribunals, receiving email notifications only for publications matching their selected list types and language preferences. The feature includes a comprehensive subscription workflow with filtering capabilities, duplicate prevention, and the ability to edit existing list type subscriptions.

## Architecture

### Database Requirements

**New Table: list_type_subscription**
```sql
CREATE TABLE list_type_subscription (
    id INTEGER PRIMARY KEY,
    user_id INTEGER NOT NULL,
    list_type_id INTEGER NOT NULL,
    version VARCHAR(50) NOT NULL,  -- 'english', 'welsh', 'both'
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES user(id),
    FOREIGN KEY (list_type_id) REFERENCES list_type(id),
    UNIQUE (user_id, list_type_id, version)
);
```

**Key Relationships:**
- List type subscriptions are NOT linked to specific locations
- When a publication is received, notify all subscribers who:
  - Have subscribed to that list type
  - Have selected the matching language version
  - Have subscribed to a location with matching sub-jurisdiction

### Subscription Notification Logic
- Publication received → Query list_type_subscription table
- Find users subscribed to that list_type_id and matching language
- Cross-reference with location subscriptions (existing table)
- Send email notifications via Gov Notify to matching subscribers

### Sub-jurisdiction Matching
- On Page 5 (Select list types), query selected location's sub-jurisdiction
- Display only list types that have matching sub-jurisdiction from list_types_sub_jurisdictions table

## Module Structure

Extend existing subscription module or create: `libs/list-type-subscription`

```
libs/list-type-subscription/
├── package.json
├── tsconfig.json
├── prisma/
│   └── schema.prisma           # List type subscription table
└── src/
    ├── index.ts                # Business logic exports
    ├── config.ts               # Module configuration
    ├── pages/
    │   ├── your-email-subscriptions.ts
    │   ├── your-email-subscriptions.njk
    │   ├── add-subscription-method.ts
    │   ├── add-subscription-method.njk
    │   ├── subscribe-by-court.ts
    │   ├── subscribe-by-court.njk
    │   ├── selected-venues.ts
    │   ├── selected-venues.njk
    │   ├── select-list-types.ts
    │   ├── select-list-types.njk
    │   ├── select-list-version.ts
    │   ├── select-list-version.njk
    │   ├── confirm-subscriptions.ts
    │   ├── confirm-subscriptions.njk
    │   ├── subscription-confirmation.ts
    │   └── subscription-confirmation.njk
    ├── services/
    │   ├── subscription-service.ts
    │   ├── list-type-subscription-service.ts
    │   ├── location-filter-service.ts
    │   └── notification-service.ts
    └── locales/
        ├── en.ts
        └── cy.ts
```

## Implementation Tasks

### 1. Branch Strategy
- Create branch from feature/VIBE-221-subscription-fulfilment-email
- Ensure dependencies on VIBE-309 (list type database) are met

### 2. Database Schema

**Create Prisma Schema (libs/list-type-subscription/prisma/schema.prisma):**
```prisma
model ListTypeSubscription {
  id          Int       @id @default(autoincrement())
  userId      Int       @map("user_id")
  listTypeId  Int       @map("list_type_id")
  version     String    @db.VarChar(50)
  createdAt   DateTime  @default(now()) @map("created_at")
  updatedAt   DateTime  @updatedAt @map("updated_at")

  user        User      @relation(fields: [userId], references: [id])
  listType    ListType  @relation(fields: [listTypeId], references: [id])

  @@unique([userId, listTypeId, version])
  @@map("list_type_subscription")
}
```

**Run migrations:**
- `yarn db:migrate:dev` to create table
- `yarn db:generate` to generate Prisma client

### 3. Database Services

**subscription-service.ts (existing or new):**
- `getSubscriptionsByUserId(userId)` - Get all subscriptions for a user
- `getLocationSubscriptionsByUserId(userId)` - Get location subscriptions

**list-type-subscription-service.ts:**
- `createListTypeSubscription(userId, listTypeId, version)` - Create subscription
- `getListTypeSubscriptionsByUserId(userId)` - Get user's list type subscriptions
- `deleteListTypeSubscription(id)` - Delete subscription
- `checkDuplicateSubscription(userId, listTypeId, version)` - Prevent duplicates
- `updateListTypeSubscription(id, data)` - Update subscription

**location-filter-service.ts:**
- `getLocationsByJurisdiction(jurisdictions)` - Filter locations by jurisdiction
- `getLocationsByRegion(regions)` - Filter locations by region
- `getCourtTypesByJurisdiction(jurisdiction)` - Get court types for pop-up
- `getSubJurisdictionsForLocations(locationIds)` - Get sub-jurisdictions for selected locations

**notification-service.ts:**
- `getSubscribersForPublication(publicationId, listTypeId, language)` - Get subscribers
- `sendListTypeNotifications(subscribers, publication)` - Send emails via Gov Notify

### 4. Page Controllers and Templates

**your-email-subscriptions (Page 1):**
- GET: Query and display user's existing subscriptions
- Show empty state if no subscriptions
- Display table with Court/tribunal name, Date added, Actions columns
- Remove link triggers deletion of subscription
- Green "Add email subscription" button

**add-subscription-method (Page 2):**
- GET: Render radio options
- POST: Validate selection, store in session, redirect based on selection
- Validation: Must select one option
- Three options: By court/tribunal, By case name, By case reference

**subscribe-by-court (Page 3):**
- GET: Display search and filter UI
- Render Jurisdiction and Region filter accordions (open by default)
- Implement pop-up filters for court types based on jurisdiction selection
- Allow multiple jurisdiction selections → multiple pop-ups
- POST: Store selected courts/tribunals in session, redirect to selected-venues
- Allow continue without selection (no error)

**selected-venues (Page 4):**
- GET: Display selected venues in table
- Show Remove link per venue
- Show "Add another subscription" link (returns to Page 2)
- POST: Continue to select-list-types
- Back: Return to subscribe-by-court with selections retained

**select-list-types (Page 5):**
- GET:
  - Query sub-jurisdictions of selected locations
  - Query list types matching those sub-jurisdictions from list_types_sub_jurisdictions
  - Display list types alphabetically with letter grouping
  - Show checkboxes for each list type
- POST: Validate at least one selected, store in session, redirect to select-list-version
- Validation: "Please select a list type to continue"
- Back: Return to selected-venues

**select-list-version (Page 6):**
- GET: Render radio options (English, Welsh, English and Welsh)
- POST: Validate selection, store in session, redirect to confirm-subscriptions
- Validation: "Please select version of the list type to continue"
- Back: Return to select-list-types with selections retained

**confirm-subscriptions (Page 7):**
- GET: Display three summary tables:
  - Court or tribunal name
  - List type
  - Version
- Show Remove, Change version, Add another subscription links
- POST: Save subscriptions to database using list-type-subscription-service
- Implement duplicate prevention logic
- Redirect to subscription-confirmation
- Back: Return to select-list-version

**subscription-confirmation (Page 8):**
- GET: Display green success banner
- Show navigation links:
  - Add another subscription
  - Manage your current email subscriptions
  - Find a court or tribunal
  - Select which list type to receive
- Clear session data
- POST/Redirect/GET pattern to prevent duplicate submissions

### 5. Session Management
- Store form data across pages 2-7 in session:
  - subscription_method
  - selected_locations (array)
  - selected_list_types (array)
  - selected_version
- Clear session after successful save on Page 8
- Preserve session data on back navigation

### 6. Filtering and Pop-up Logic
- Implement JavaScript for dynamic pop-up filters on Page 3
- When jurisdiction checkbox selected → show corresponding court type pop-up
- Multiple jurisdictions → multiple pop-ups simultaneously
- Pop-ups dismissible but selections retained
- Ensure accessibility for keyboard and screen reader users

### 7. Edit List Type Functionality
- From Page 1 (Your email subscriptions), add "Edit list type" link per subscription
- Clicking Edit list type → navigate directly to Page 5 (select-list-types)
- Pre-populate checkboxes with user's existing subscriptions
- Display all list types matching sub-jurisdiction of selected location
- Tick only subscribed list types

### 8. Duplicate Prevention
- Before saving subscription in confirm-subscriptions controller:
  - Query existing subscriptions for user
  - Check if combination of (userId, listTypeId, version) already exists
  - If duplicate found, show error or skip creation
  - Display message to user if applicable

### 9. Locales
Create en.ts and cy.ts with content for:
- Page titles
- Body text
- Button labels
- Link text
- Table headings
- Filter labels
- Radio/checkbox options
- Error messages
- Success messages
- Pop-up headings

### 10. Notification Integration
- Update publication notification service to include list type subscriptions
- When publication received:
  - Query list_type_subscription for matching listTypeId and version
  - Cross-reference with location subscriptions
  - Send emails via Gov Notify to matching users
- Ensure no duplicate emails sent to same user

### 11. Accessibility Implementation
- Ensure all form elements support keyboard navigation
- Add appropriate ARIA roles for pop-ups and filters
- Implement aria-expanded for accordions
- Error summaries with anchor links
- Screen reader announcements for dynamic content (pop-ups)
- Semantic HTML for tables and forms
- Proper heading hierarchy
- Test with screen readers

### 12. Styling
- Use GOV.UK Design System components:
  - Text input
  - Radios
  - Checkboxes
  - Button (green)
  - Filter accordions
  - Pop-up modals/dialogs
  - Tables
  - Error summary
  - Success banner
- Implement pop-up styling for court type filters
- Responsive design for mobile/tablet
- Alphabetical grouping for list types with visual separation

### 13. Integration
- Integrate with existing verified user dashboard
- Link from dashboard to your-email-subscriptions
- Ensure authentication middleware protects all pages
- Add authorization check for verified media user role
- Register module in apps/web/src/app.ts

### 14. Testing

**Unit Tests (Vitest):**
- list-type-subscription-service.test.ts
  - Create subscription
  - Get subscriptions by user
  - Delete subscription
  - Check duplicate prevention
  - Update subscription
- location-filter-service.test.ts
  - Filter by jurisdiction
  - Filter by region
  - Get court types
  - Get sub-jurisdictions
- notification-service.test.ts
  - Get subscribers for publication
  - Send notifications
  - Verify no duplicate emails

**E2E Tests (Playwright):**
- Create single journey test: "Verified user can subscribe to list types @nightly"
  - Navigate from dashboard to email subscriptions
  - Add new subscription by court/tribunal
  - Test validation errors (no selection on Page 2, 5, 6)
  - Select jurisdiction and verify pop-up appears
  - Select multiple jurisdictions and verify multiple pop-ups
  - Continue without court selection (no error)
  - Select venues and remove one
  - Select list types (test sub-jurisdiction filtering)
  - Select version
  - Review confirmation page
  - Test Remove and Change version links
  - Confirm subscription
  - Verify success page
  - Test back navigation preserves state
  - Test Welsh translation at key points
  - Test accessibility inline
  - Test keyboard navigation
  - Verify subscription in database
  - Test Edit list type functionality
  - Test duplicate prevention

### 15. Documentation
- Update README if needed
- Document subscription workflow
- Add comments for complex filtering logic
- Document notification trigger logic

## Dependencies
- @hmcts/postgres - Database access via Prisma
- @hmcts/auth - Authentication/authorization
- GOV.UK Frontend - UI components
- express-session - Session management
- Gov Notify SDK - Email notifications
- VIBE-309 - List type database implementation
- VIBE-221 - Subscription fulfilment email (base branch)

## Migration Requirements
- Create Prisma schema in libs/list-type-subscription/prisma/
- Run `yarn db:migrate:dev` to create list_type_subscription table
- Register schema in apps/postgres/src/schema-discovery.ts

## Risk Considerations
- Complex filtering logic with pop-ups requires careful state management
- Duplicate prevention must be robust to avoid user frustration
- Session data management across 8 pages requires careful testing
- List type matching by sub-jurisdiction requires accurate data
- Notification service must avoid sending duplicate emails
- Performance of sub-jurisdiction queries with large datasets
- Accessibility of pop-up filters critical for screen reader users

## Definition of Done
- Database table created for list type subscriptions
- All 8 pages implemented with Welsh translations
- CRUD services for list type subscriptions functional
- Filtering and pop-up logic working correctly
- Sub-jurisdiction matching implemented
- Duplicate prevention working
- Edit list type functionality operational
- Notification service integrated with list type subscriptions
- All form validation working
- Session management across pages functional
- All pages meet WCAG 2.2 AA standards
- E2E journey test passes (including Welsh and accessibility)
- Unit tests achieve >80% coverage on services
- Code reviewed and approved
- Integration with verified user dashboard complete
