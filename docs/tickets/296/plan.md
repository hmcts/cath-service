# Technical Plan: List Type Subscription Feature (Issue #296)

## Overview

Implement an 8-page workflow for verified media users to subscribe to specific list types for selected courts/tribunals, with language version preferences (English/Welsh/Both).

## Technical Approach

### Architecture Pattern

- New module: `libs/subscription-list-types/` for list type subscription logic
- Reuse existing: `libs/verified-pages/` for page controllers
- Extend: `libs/subscriptions/` Prisma schema with new `subscription_list_type` table
- Session-based multi-step form flow with state preservation

### Key Design Decisions

1. **Separate subscription types**: List type subscriptions are independent of location subscriptions (can exist without selecting courts)
2. **Sub-jurisdiction matching**: List types filtered by sub-jurisdictions of selected locations
3. **Session storage**: Multi-step form data stored in namespaced session to preserve state on back navigation
4. **Language version**: Single radio selection (English, Welsh, or Both) applies to all selected list types
5. **Duplicate prevention**: Unique constraint on (userId, listTypeId, language) combination

## Database Schema Changes

### New Table: `subscription_list_type`

```prisma
model SubscriptionListType {
  listTypeSubscriptionId String   @id @default(uuid()) @map("list_type_subscription_id") @db.Uuid
  userId                 String   @map("user_id") @db.Uuid
  listTypeId             Int      @map("list_type_id") @db.Integer
  language               String   // "ENGLISH", "WELSH", "BOTH"
  dateAdded              DateTime @default(now()) @map("date_added")

  user User @relation(fields: [userId], references: [userId], onDelete: Cascade)

  @@unique([userId, listTypeId, language], name: "unique_user_list_type_language")
  @@index([userId], name: "idx_subscription_list_type_user")
  @@index([listTypeId], name: "idx_subscription_list_type_list_type")
  @@map("subscription_list_type")
}
```

Add relation to User model:
```prisma
model User {
  // ... existing fields
  listTypeSubscriptions SubscriptionListType[]
}
```

## Implementation Details

### Module Structure

```
libs/subscription-list-types/
├── prisma/
│   └── schema.prisma              # List type subscription schema
└── src/
    ├── config.ts                  # Module configuration exports
    ├── index.ts                   # Service exports
    ├── subscription-list-type/
    │   ├── queries.ts             # Database queries
    │   ├── queries.test.ts
    │   ├── service.ts             # Business logic
    │   └── service.test.ts
    └── locales/
        ├── en.ts                  # Shared English content
        └── cy.ts                  # Shared Welsh content

libs/verified-pages/src/pages/
├── subscription-add-method/       # Page 2: How to add subscription
├── subscription-by-location/      # Page 3: Court/tribunal search
├── subscription-locations-review/ # Page 4: Review selected venues
├── subscription-list-types/       # Page 5: Select list types
├── subscription-list-language/     # Page 6: Select language version
├── subscription-confirm/          # Page 7: Confirm subscriptions
└── subscription-confirmed/        # Page 8: Confirmation (already exists)
```

### Page Flow & Session Management

**Session Structure:**
```typescript
interface SubscriptionSession extends Session {
  listTypeSubscription?: {
    selectedLocationIds?: number[];        // From page 3
    selectedListTypeIds?: number[];        // From page 5
    language?: string;                     // From page 6
    returnUrl?: string;                    // For edit flow
  };
}
```

**Navigation Flow:**

1. **Page 1: Your email subscriptions** (`/subscription-management`)
   - Display existing location subscriptions (already implemented)
   - Add new table for list type subscriptions with Edit/Remove actions
   - "Add email subscription" button → Page 2

2. **Page 2: How do you want to add an email subscription?** (`/subscription-add-method`)
   - Radio options: By court/tribunal, By case name, By case reference
   - Validation: Must select one option
   - Store selection in session, redirect to appropriate page

3. **Page 3: Subscribe by court or tribunal name** (`/subscription-by-location`)
   - Reuse existing court/tribunal search with filters (jurisdiction, region, court type)
   - Allow zero selections (proceed without error)
   - Store `selectedLocationIds` in session

4. **Page 4: Your email subscriptions (Selected Venues)** (`/subscription-locations-review`)
   - Display selected venues in table
   - "Remove" link removes from session without page reload
   - "Add another subscription" → back to Page 2
   - "Continue" → Page 5

5. **Page 5: Select list types** (`/subscription-list-types`)
   - Query list types matching sub-jurisdictions of selected locations
   - Alphabetically grouped checkboxes (A, B, C...)
   - Validation: Must select at least one
   - Store `selectedListTypeIds` in session

6. **Page 6: What version do you want?** (`/subscription-list-language`)
   - Radio: English, Welsh, English and Welsh
   - Validation: Must select one
   - Store `language` in session

7. **Page 7: Confirm your email subscriptions** (`/subscription-confirm`)
   - Display 3 summary tables: Locations, List Types, Version
   - "Remove" removes list type from session
   - "Change version" → back to Page 6
   - "Add another subscription" → back to Page 2
   - "Confirm subscriptions" → create records, clear session → Page 8

8. **Page 8: Subscription confirmation** (`/subscription-confirmed`)
   - Green panel with success message
   - Links to: Add another, Manage subscriptions, Find court, Select list type

### Service Layer Functions

**`libs/subscription-list-types/src/subscription-list-type/service.ts`:**

```typescript
// Create list type subscriptions for a user
export async function createListTypeSubscriptions(
  userId: string,
  listTypeIds: number[],
  language: string
): Promise<void>

// Get all list type subscriptions for a user
export async function getListTypeSubscriptionsByUserId(
  userId: string,
  locale: "en" | "cy"
): Promise<SubscriptionListTypeWithDetails[]>

// Delete a list type subscription
export async function deleteListTypeSubscription(
  userId: string,
  listTypeSubscriptionId: string
): Promise<void>

// Get list types filtered by sub-jurisdictions
export async function getListTypesBySubJurisdictions(
  subJurisdictionIds: number[],
  locale: "en" | "cy"
): Promise<ListType[]>

// Check for duplicate subscriptions
export async function hasDuplicateSubscription(
  userId: string,
  listTypeId: number,
  language: string
): Promise<boolean>
```

### List Type Filtering Logic

When user selects locations on Page 3:
1. Get sub-jurisdiction IDs for each location from `location_sub_jurisdiction` table
2. On Page 5, display list types where the list type's sub-jurisdiction matches any selected location's sub-jurisdictions
3. If no locations selected, show all available list types

### Edit Flow

From Page 1 "Edit list type" action:
- Set `returnUrl` in session
- Load existing list type subscriptions into session
- Skip to Page 5 (list type selection)
- Back button returns to Page 1, not previous pages

## Error Handling & Edge Cases

### Validation Rules

- **Page 2**: Must select subscription method (radio)
- **Page 3**: No validation (zero selections allowed)
- **Page 5**: Must select at least one list type
- **Page 6**: Must select language version

### Error Messages

```typescript
// Page 2
errors: [{ text: "Select how you want to add an email subscription.", href: "#subscription-method" }]

// Page 5
errors: [{ text: "Please select a list type to continue", href: "#list-types" }]

// Page 6
errors: [{ text: "Please select version of the list type to continue", href: "#version" }]
```

### Edge Cases

1. **User backs out mid-flow**: Session data preserved for 1 hour
2. **Duplicate subscription attempt**: Check before creation, show error if duplicate exists
3. **Zero locations selected**: Show all list types on Page 5
4. **Location deleted after subscription**: Soft delete, subscription remains valid
5. **Session timeout**: Redirect to Page 1, clear session data
6. **Empty list types for sub-jurisdiction**: Display message "No list types available for selected courts"

## Back Link Behavior

All pages must implement proper back navigation:

- **Page 2** → Page 1 (subscription-management)
- **Page 3** → Page 2
- **Page 4** → Page 3 (restore search filters)
- **Page 5** → Page 4
- **Page 6** → Page 5 (restore selections)
- **Page 7** → Page 6
- **Page 8** → Page 7

Back links preserve session state and user input.

## Notification Integration

List type subscriptions trigger emails when:
1. A publication is received with matching `listTypeId`
2. User's language preference matches publication language
3. Publication's location has sub-jurisdiction matching list type's sub-jurisdiction

Notification logic in `libs/notifications/` checks both:
- Location subscriptions (existing)
- List type subscriptions (new)

## Acceptance Criteria Mapping

| AC | Implementation |
|----|----------------|
| Green "Add email subscription" button | Existing Page 1, add list type subscriptions table |
| Add new subscription via link | Button routes to Page 2 |
| Radio options for subscription method | Page 2 controller with validation |
| Empty state message | Page 1 conditional rendering |
| Existing subscriptions table | Query and display list type subscriptions |
| Court/tribunal search with filters | Reuse existing search page (Page 3) |
| Continue without selection allowed | No validation on Page 3 |
| Multiple pop-ups for jurisdictions | Existing jurisdiction filter behavior |
| List type selection page | Page 5 with alphabetical grouping |
| Validation on list type selection | Page 5 POST validation |
| Language version selection | Page 6 radio buttons |
| Confirmation page with tables | Page 7 summary display |
| Remove/change actions | Page 7 inline actions update session |
| Final confirmation page | Page 8 success panel |
| Back link on all pages | Each controller includes back link logic |
| No duplicate subscriptions | Unique constraint + pre-creation check |
| Welsh translations | All pages have cy.ts files |
| Accessibility compliance | GOV.UK components, proper labels, keyboard nav |

## Testing Strategy

### Unit Tests
- Service layer functions (CRUD operations)
- Validation functions
- List type filtering by sub-jurisdiction

### Integration Tests
- Session state management across pages
- Database constraints (unique user+listType+language)
- Duplicate prevention logic

### E2E Tests (Playwright)
One complete journey test:
- Navigate through all 8 pages
- Include validation error checks
- Test Welsh translation
- Include accessibility scan
- Test remove/change actions
- Verify database records created

## Open Questions & Clarifications Needed

### CLARIFICATIONS NEEDED

1. **List Type Data Source**: Are list types stored in a database table or sourced from the `mockListTypes` constant in `libs/list-types/common/src/mock-list-types.ts`? If database, what's the table schema?

2. **Sub-Jurisdiction Mapping**: How are list types linked to sub-jurisdictions? Is there a `list_type_sub_jurisdiction` join table, or is the relationship stored differently?

3. **Notification Template**: Does GOV Notify have a separate template for list type subscription notifications, or reuse the existing location subscription template?

4. **Edit vs Add**: When editing list types from Page 1, should users:
   - Edit the language version only (keeping same list types)?
   - Re-select list types entirely?
   - Add additional list types to existing subscription?

5. **Multiple Language Subscriptions**: Can a user subscribe to the same list type with different language preferences (e.g., "Crown Daily List" in English AND Welsh separately)?

6. **List Type Display Order**: Beyond alphabetical, are there priority list types that should appear first?

7. **Bulk Operations**: Should users be able to select all list types in a group (e.g., "Select all C") or bulk unsubscribe from list types?

8. **Location Independence Confirmation**: The spec says "list type subscription is not linked with location" - does this mean:
   - Users can subscribe to list types WITHOUT selecting any locations?
   - If so, notifications are sent for ANY publication matching the list type, regardless of location?

9. **Existing Subscription Integration**: On Page 1, should location subscriptions and list type subscriptions be:
   - Displayed in separate tables?
   - Combined in one table with a "Type" column?
   - Shown on separate tabs?

10. **Session Expiry**: What's the appropriate session timeout for the multi-step form? Standard 1 hour or longer?
