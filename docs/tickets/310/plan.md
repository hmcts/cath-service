# Technical Plan: User Management Feature

## Overview

Implement a user management system allowing System Admins to search, view, and delete user accounts. This includes a multi-screen workflow with filtering, pagination, and confirmation dialogs.

## Technical Approach

### Architecture Strategy

1. **Module Structure**: Extend existing `system-admin-pages` library in `libs/` with:
   - Page controllers for 4 new screens (find-users, manage-user, delete-user-confirm, delete-user-success)
   - User search/filter service
   - User deletion service
   - Nunjucks templates for all pages

2. **Access Control**: Use existing `requireRole` middleware to restrict access to System Admin only

3. **Data Layer**: Extend existing `@hmcts/account` queries for user listing, filtering, and deletion

4. **Session Management**: Store filter state and pagination in session to maintain state across navigation

### Key Technical Decisions

**Filter Implementation**: Use POST requests for filter application to avoid long URLs and support proper back navigation

**Pagination**: Server-side pagination with 25 users per page, using skip/take pattern with Prisma

**Deletion Strategy**: Soft delete approach initially, with cascade deletion of related subscriptions

**Navigation State**: Preserve search filters and pagination when returning from Manage page via session storage

## Implementation Details

### File Structure

```
libs/system-admin-pages/
└── src/
    ├── pages/
    │   ├── system-admin-dashboard/         # Existing
    │   ├── find-users/                     # NEW
    │   │   ├── index.ts                    # Search & filter controller
    │   │   ├── index.njk                   # List with filter panel
    │   │   ├── en.ts
    │   │   └── cy.ts
    │   ├── manage-user/                    # NEW
    │   │   ├── index.ts                    # User details display
    │   │   ├── index.njk                   # Summary list view
    │   │   ├── en.ts
    │   │   └── cy.ts
    │   ├── delete-user-confirm/                 # NEW
    │   │   ├── index.ts                    # Confirmation radio selection
    │   │   ├── index.njk                   # Yes/No radios
    │   │   ├── en.ts
    │   │   └── cy.ts
    │   └── delete-user-success/                   # NEW
    │       ├── index.ts                    # Success confirmation
    │       ├── index.njk                   # Green banner
    │       ├── en.ts
    │       └── cy.ts
    ├── user-management/                    # NEW directory
    │   ├── search-service.ts               # User filtering & pagination
    │   ├── search-service.test.ts
    │   ├── delete-service.ts               # User deletion logic
    │   ├── delete-service.test.ts
    │   ├── queries.ts                      # Prisma queries
    │   ├── queries.test.ts
    │   └── validation.ts                   # Filter validation
    │   └── validation.test.ts
    └── assets/
        └── css/
            └── user-management.scss        # Filter panel styles (NEW)
```

### Database Changes

**No schema changes required** - existing User table has all necessary fields:
- userId (UUID)
- email
- role
- userProvenance
- userProvenanceId
- createdDate
- lastSignedInDate

### API/Service Endpoints

**No REST API endpoints** - all functionality via server-rendered pages with POST handlers

### Page Controllers

#### 1. Find Users Page (`/find-users`)

**GET Handler**:
- Retrieve filter state from session
- Query users with filters and pagination
- Render table with results (max 25 per page)
- Display filter panel with current selections

**POST Handler**:
- Accept filter form submission
- Validate filter inputs (email format, max lengths)
- Store filters in session
- Reset to page 1
- Redirect to GET

**Session Data**:
```typescript
interface UserManagementSession {
  filters?: {
    email?: string;
    userId?: string;
    userProvenanceId?: string;
    roles?: string[];
    provenances?: string[];
  };
  pagination?: {
    page: number;
    totalPages: number;
  };
}
```

#### 2. Manage User Page (`/manage-user/:userId`)

**GET Handler**:
- Retrieve user by userId
- Return 404 if not found
- Render summary list with user details
- Display warning message

#### 3. Confirm Delete Page (`/delete-user-confirm/:userId`)

**GET Handler**:
- Retrieve user by userId
- Render confirmation page with Yes/No radios

**POST Handler**:
- If "No" selected: redirect to `/manage-user/:userId`
- If "Yes" selected: call delete service, redirect to `/delete-user-success`
- If no selection: re-render with error

#### 4. User Deleted Page (`/delete-user-success`)

**GET Handler**:
- Display green success banner
- Provide link back to find-users

### Service Layer

#### Search Service

```typescript
interface UserSearchFilters {
  email?: string;
  userId?: string;
  userProvenanceId?: string;
  roles?: string[];
  provenances?: string[];
}

interface UserSearchResult {
  users: User[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
}

async function searchUsers(
  filters: UserSearchFilters,
  page: number,
  pageSize: number = 25
): Promise<UserSearchResult>
```

#### Delete Service

```typescript
async function deleteUser(userId: string): Promise<void> {
  // Delete related subscriptions first
  // Delete user record
  // Log deletion action
}
```

### Validation Rules

**Email Field**:
- Optional
- Valid email format
- Max 254 characters

**User ID Field**:
- Optional
- Exact match only
- Alphanumeric only
- Max 50 characters

**User Provenance ID Field**:
- Optional
- Exact match only
- Alphanumeric only
- Max 50 characters

**Role Checkboxes**:
- Optional
- Values: VERIFIED, CTSC_ADMIN, LOCAL_ADMIN, SYSTEM_ADMIN

**Provenance Checkboxes**:
- Optional
- Values: CFT_IDAM, SSO (clarification needed on full list)

### Error Handling

**User Not Found**:
- Show error message on find-users page
- Content: "No users could be found matching your search criteria. Try adjusting or clearing the filters."

**Invalid Filter Input**:
- Show field-level errors with error summary
- Preserve entered filter values

**Deletion Failure**:
- Log error
- Show generic error page
- Do not reveal internal error details

**Access Denied**:
- Return 403 if non-System Admin attempts access
- Redirect to appropriate dashboard

## Integration Points

### Admin Dashboard

Add "User Management" tab/link to existing System Admin dashboard (`libs/system-admin-pages/src/pages/system-admin-dashboard/`):

```typescript
{
  title: "User Management",
  description: "Find, update and delete users",
  href: "/find-users"
}
```

### Module Registration

No changes needed - the `system-admin-pages` module is already registered in `apps/web/src/app.ts`. The new pages will be automatically discovered through the existing registration.

## Acceptance Criteria Mapping

| AC | Implementation |
|----|----------------|
| Only System Admin can access | `requireRole([USER_ROLES.SYSTEM_ADMIN])` middleware on all pages |
| User Management tab on dashboard | Add tile to admin-dashboard tiles array |
| Display user list with Email, Role, Provenance, Manage columns | Table in find-users template with govukTable component |
| Maximum 25 users per page | Prisma skip/take with pageSize = 25 |
| Filter panel with search fields | Form with text inputs and checkboxes in left column |
| Email search with partial matching | Prisma contains filter on email field |
| User ID and Provenance ID exact match | Prisma equals filter with hint text |
| Role and Provenance checkboxes | Checkbox component with proper validation |
| Error message for no results | Conditional error summary in template |
| Manage link to user details page | Dynamic route `/manage-user/:userId` |
| Warning message on manage page | Warning text component with authorization reminder |
| Display user details in table | Summary list component with 7 rows |
| Delete user button (red) | Button component with classes "govuk-button--warning" |
| Confirmation page with Yes/No radios | Radio component with required validation |
| No redirects to manage page | POST handler conditional redirect |
| Yes deletes and shows green banner | Delete service + notification banner component |
| Pagination controls | Pagination component with Next/Previous and page numbers |
| User deleted from database | Prisma delete with cascade to subscriptions |

## Edge Cases

1. **Self-deletion**: System Admin attempts to delete own account
   - Prevention: Check if userId matches current user, show error

2. **Concurrent deletion**: User deleted by another admin while viewing
   - Handling: Show 404 on manage page if user not found

3. **Empty filter results**: No users match criteria
   - Handling: Show error message, allow clearing filters

4. **Invalid userId in URL**: Malformed or non-existent UUID
   - Handling: Return 404 page

5. **Session expiry during multi-page flow**: Filters lost
   - Handling: Acceptable - user restarts search

6. **Large result sets**: Thousands of users returned
   - Handling: Pagination limits memory usage, consider index on email/role

7. **Special characters in email search**: SQL injection attempt
   - Handling: Prisma parameterized queries prevent injection

## Testing Strategy

### Unit Tests

- Search service with various filter combinations
- Pagination calculations
- Validation functions
- Delete service with cascade

### Integration Tests

- Database queries with Prisma
- Session storage and retrieval
- Filter state preservation

### E2E Tests (Playwright)

Single comprehensive journey test covering:
- Navigate from dashboard to user management
- Apply filters (email, role, provenance)
- View paginated results
- Navigate to manage user page
- Initiate deletion (select No, return to manage)
- Initiate deletion (select Yes, confirm deletion)
- Verify user removed from list
- Test Welsh translations at key points
- Accessibility checks inline

## Performance Considerations

1. **Database Indexes**: Add indexes on email, role, userProvenance for filter queries
2. **Query Optimization**: Use Prisma select to return only needed fields in list view
3. **Session Size**: Store only filter values in session, not full result set
4. **Pagination**: Always use skip/take to limit memory usage

## Security Considerations

1. **Authorization**: Every route protected with requireRole middleware
2. **Input Validation**: Server-side validation on all filter inputs
3. **SQL Injection**: Prisma prevents through parameterization
4. **Audit Logging**: Log all user deletion actions (future enhancement)
5. **CSRF Protection**: Forms use POST with session validation

## Accessibility Compliance

- WCAG 2.2 AA compliance across all pages
- Table headers with proper scope attributes
- Pagination keyboard accessible
- Error summary announced to screen readers
- Warning text has proper ARIA attributes
- Color contrast meets standards (red delete button, green banner)
- Form labels associated with inputs
- Hint text linked via aria-describedby

## CLARIFICATIONS NEEDED

1. **Provenance Options**: Acceptance criteria mentions "CFT IdAM and SSO" but specifications list "B2C, CFT IdAM, Crime IdAM and SSO". Which provenance values should be available in the filter checkboxes?

2. **Role Naming**: Should filter options match database values exactly? Specifications mention "Verified, CTSC Admin, Local Admin, System Admin" - confirm mapping to `VERIFIED`, `CTSC_ADMIN`, `INTERNAL_ADMIN_LOCAL`, `SYSTEM_ADMIN`.

3. **Self-Deletion**: Should System Admins be prevented from deleting their own account?

4. **Filter Persistence After Deletion**: After successful deletion, should filters remain active or be cleared?

5. **Back Navigation Pagination**: When returning from Manage page, should exact pagination position be preserved or return to page 1?

6. **Filter Application**: Should filters auto-apply on change or require explicit "Apply filters" button?

7. **Cascade Deletion**: Should user subscriptions be automatically deleted when user is deleted?

8. **Welsh Translations**: Confirm all pages need full Welsh translation support (assuming yes based on project standards).

9. **Update Functionality**: Ticket title mentions "update" but acceptance criteria only covers viewing and deleting. Confirm update functionality is not in scope for this ticket.
