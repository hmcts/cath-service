# Technical Plan: User Management Feature

## Technical Approach

This feature adds user management capabilities for System Admins to search, view, and delete CaTH users. The implementation follows the existing monorepo patterns with a new module in `libs/` containing five pages organized as a multi-step workflow.

### Architecture Decisions

1. **New Module**: Create `libs/user-management` to house all user management functionality
2. **Reuse Existing Infrastructure**: Leverage existing `@hmcts/account` queries and Prisma User model
3. **Session-Based Filtering**: Store filter state in session to maintain search criteria across pages
4. **Pagination Pattern**: Follow the existing pagination approach from reference-data-upload-summary
5. **Access Control**: Use existing `requireRole([USER_ROLES.SYSTEM_ADMIN])` middleware

### Key Technical Considerations

- User deletion must cascade to remove related subscriptions (handled by Prisma schema)
- Filter state preservation across page navigation (back button, pagination)
- Email search should support partial matching; User ID and Provenance ID must be exact matches
- Pagination shows 25 users per page (different from reference data's 10)
- Warning message on manage page uses GOV.UK warning text component
- Confirmation banner uses GOV.UK notification banner component

## Implementation Details

### File Structure

```
libs/user-management/
├── package.json
├── tsconfig.json
└── src/
    ├── config.ts                           # Module configuration exports
    ├── index.ts                            # Business logic exports
    ├── pages/
    │   ├── user-management/                # Page 1: Search and list users
    │   │   ├── index.ts                    # Controller (GET/POST for filters)
    │   │   ├── index.njk                   # Template with filters and table
    │   │   ├── index.test.ts               # Unit tests
    │   │   ├── en.ts                       # English content
    │   │   └── cy.ts                       # Welsh content
    │   ├── manage-user/                    # Page 2: View user details
    │   │   ├── index.ts                    # Controller (GET only, [userId] param)
    │   │   ├── index.njk                   # Template with summary list
    │   │   ├── index.test.ts
    │   │   ├── en.ts
    │   │   └── cy.ts
    │   ├── delete-user-confirm/            # Page 3: Delete confirmation
    │   │   ├── index.ts                    # Controller (GET/POST)
    │   │   ├── index.njk                   # Template with Yes/No radios
    │   │   ├── index.test.ts
    │   │   ├── en.ts
    │   │   └── cy.ts
    │   └── user-deleted/                   # Page 4: Success confirmation
    │       ├── index.ts                    # Controller (GET only)
    │       ├── index.njk                   # Template with notification banner
    │       ├── index.test.ts
    │       ├── en.ts
    │       └── cy.ts
    └── user-management/
        ├── service.ts                      # Business logic (search, delete)
        ├── service.test.ts
        ├── queries.ts                      # Database queries
        ├── queries.test.ts
        └── model.ts                        # TypeScript interfaces
```

### Module Registration

**libs/user-management/src/config.ts**
```typescript
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const pageRoutes = { path: path.join(__dirname, "pages") };
export const moduleRoot = __dirname;
```

**apps/web/src/app.ts** (add to existing imports)
```typescript
import { pageRoutes as userManagementPages } from "@hmcts/user-management/config";

// Register in createGovukFrontend and createSimpleRouter calls
```

**Root tsconfig.json** (add to paths)
```json
"@hmcts/user-management": ["libs/user-management/src"]
```

### Database Schema Changes

No schema changes required. The existing User model in `apps/postgres/prisma/schema.prisma` already has all necessary fields:

- `userId` (primary key)
- `email`
- `firstName`
- `surname`
- `userProvenance`
- `userProvenanceId`
- `role`
- `createdDate`
- `lastSignedInDate`

Existing Prisma relation with Subscription will handle cascade deletion if configured with `onDelete: Cascade`.

### Components to Create

#### 1. Service Layer (libs/user-management/src/user-management/service.ts)

```typescript
export async function searchUsers(filters: UserSearchFilters, page: number = 1): Promise<PaginatedUsers>
export async function getUserById(userId: string): Promise<UserDetails | null>
export async function deleteUser(userId: string): Promise<void>
```

**searchUsers** logic:
- Build Prisma where clause from filters
- Email: case-insensitive partial match (`contains`, mode: 'insensitive')
- User ID: exact match
- Provenance ID: exact match
- Role: array of selected roles (`in` operator)
- Provenance: array of selected provenances (`in` operator)
- Return paginated results (25 per page) with total count

**deleteUser** logic:
- Check user exists
- Delete user (subscriptions cascade via Prisma relation)
- Return void

#### 2. Query Layer (libs/user-management/src/user-management/queries.ts)

```typescript
export async function findUsers(where: Prisma.UserWhereInput, skip: number, take: number)
export async function countUsers(where: Prisma.UserWhereInput)
export async function findUserById(userId: string)
export async function deleteUserById(userId: string)
```

Uses existing `@hmcts/postgres` Prisma client.

#### 3. Page Controllers

**Page 1: user-management/index.ts**
- GET: Render filter panel and user table
  - Read filter state from session
  - Call searchUsers service
  - Build pagination component data
  - Pass to template
- POST: Update filters and redirect to self
  - Validate filter inputs
  - Save to session
  - Reset to page 1
  - Redirect to GET

**Page 2: manage-user/index.ts**
- GET with [userId] query param
  - Fetch user by ID
  - Render summary list with user details
  - Include "Delete user" button (red)
  - Add warning text component

**Page 3: delete-user-confirm/index.ts**
- GET with [userId] query param
  - Fetch user email for display
  - Store userId in session
- POST: Process confirmation
  - Validate radio selection
  - If "No": redirect to manage-user
  - If "Yes": call deleteUser service, redirect to success page
  - If no selection: re-render with error

**Page 4: user-deleted/index.ts**
- GET only
  - Show success notification banner
  - Clear session data
  - Provide link back to user-management

#### 4. Templates

**user-management/index.njk**
- Two-column layout (filters left, results right)
- Filter panel with:
  - "Selected filters" section (shows active filters with clear links)
  - Email text input
  - User ID text input with hint "Must be an exact match"
  - User Provenance ID text input with hint "Must be an exact match"
  - Role checkboxes (Verified, CTSC Admin, Local Admin, System Admin)
  - Provenance checkboxes (B2C, CFT IdAM, Crime IdAM, SSO)
- Results table with columns: Email, Role, Provenance, Manage (link)
- Pagination component at bottom (25 per page)
- Error summary for "No users found" state

**manage-user/index.njk**
- Warning text component at top
- GOV.UK summary list with user details (7 rows)
- Red "Delete user" button
- Back link to user-management (preserves filters)

**delete-user-confirm/index.njk**
- H1: "Are you sure you want to delete [email]?"
- GOV.UK radios (Yes/No)
- Green "Continue" button
- Error summary if no selection

**user-deleted/index.njk**
- GOV.UK notification banner (success, green)
- Link back to user-management

### Session Structure

```typescript
interface UserManagementSession extends Session {
  userManagement?: {
    filters?: {
      email?: string;
      userId?: string;
      userProvenanceId?: string;
      roles?: string[];
      provenances?: string[];
    };
    currentPage?: number;
    deleteUserId?: string; // Temporary storage for delete confirmation
  };
}
```

### API Endpoints

None required. All functionality uses page routes:
- `/user-management` - List and search
- `/manage-user?userId=[id]` - View details
- `/delete-user-confirm?userId=[id]` - Confirm delete
- `/user-deleted` - Success page

### Database Schema Changes

No new tables or fields required. Potential update to ensure cascade delete:

```prisma
model User {
  // ... existing fields ...
  subscriptions Subscription[] @relation(onDelete: Cascade)
}
```

Check if this relation already exists with cascade behavior.

## Error Handling & Edge Cases

### Validation Requirements

**Email field:**
- Optional
- Must be valid email format if provided
- Max 254 characters
- Case-insensitive partial match

**User ID field:**
- Optional
- Alphanumeric only
- Max 50 characters
- Must be exact match

**User Provenance ID field:**
- Optional
- Alphanumeric only
- Max 50 characters
- Must be exact match

**Delete confirmation:**
- Radio selection required
- Error: "Select yes or no to continue"

### Error Scenarios

1. **No users found**: Display error summary with message "No users could be found matching your search criteria. Try adjusting or clearing the filters."

2. **Invalid filter input**: Show field-level errors for format violations

3. **User not found**: Redirect to user-management with error message

4. **Delete fails**: Show error summary and log error

5. **Unauthorized access**: Handled by requireRole middleware (redirect to appropriate dashboard)

6. **Session lost**: Redirect to user-management root to start fresh

### Edge Cases

1. **Empty database**: Show empty table with message "No users to display"

2. **Single page of results**: Hide pagination component

3. **User deleted while viewing**: Handle 404 gracefully, redirect to user-management

4. **Back button navigation**: Preserve filters in session

5. **Multiple tabs**: Session-based filters may conflict; acceptable trade-off

6. **Concurrent deletions**: Last write wins; acceptable for admin operations

7. **Self-deletion**: Allow (system admin can delete their own account)

8. **Filter clearing**: Provide clear functionality to reset all filters

## Acceptance Criteria Mapping

### AC1: Access Control
**Criterion**: Only users with System Admin role can access
**Implementation**: Apply `requireRole([USER_ROLES.SYSTEM_ADMIN])` middleware to all page handlers
**Verification**: Attempt access as non-admin, verify redirect to appropriate dashboard

### AC2: User List Display
**Criterion**: Table shows Email, Role, Provenance columns plus Manage link; 25 per page
**Implementation**:
- Query users with pagination (25 per page)
- GOV.UK table component with 4 columns
- Pagination component at bottom
**Verification**: Seed >25 users, verify pagination appears and splits correctly

### AC3: Filter Panel
**Criterion**: Left panel with Selected Filters, 3 search fields, 2 checkbox sections
**Implementation**:
- Two-column grid layout
- Selected filters section shows active filters with clear links
- Email (partial match), User ID (exact), Provenance ID (exact) text inputs
- Role checkboxes (4 options), Provenance checkboxes (4 options per spec)
- Error summary for no results
**Verification**: Test each filter individually and in combination

### AC4: Manage User Page
**Criterion**: Shows user details in table with warning message and Delete button
**Implementation**:
- H1 with user email
- GOV.UK warning text component
- GOV.UK summary list with 7 rows
- Red button using `classes: "govuk-button--warning"`
**Verification**: Click Manage link, verify all details displayed correctly

### AC5: Delete Confirmation
**Criterion**: Confirmation page with Yes/No radios; No returns to previous page; Yes deletes and shows success
**Implementation**:
- Yes/No radio buttons
- POST handler branches on selection
- No: redirect to manage-user with userId param
- Yes: call deleteUser service, redirect to success
**Verification**: Test both paths; verify user removed from database

### AC6: Pagination Display
**Criterion**: Page numbers at bottom with Next/Previous
**Implementation**: GOV.UK pagination component with previous/next and page numbers
**Verification**: Navigate through multiple pages, verify page numbers and controls update correctly

### AC7: Database Deletion
**Criterion**: User deleted from database
**Implementation**: Prisma delete operation on User model
**Verification**: Query database after deletion, verify user and subscriptions removed

## Open Questions

### CLARIFICATIONS NEEDED

1. **Provenance options discrepancy**: Acceptance criteria mentions "CFT IdAM and SSO" but specifications list "B2C, CFT IdAM, Crime IdAM and SSO". The database model shows all 4 options. Which is correct?
   - **Assuming**: Use all 4 options from database model (B2C_IDAM, CFT_IDAM, CRIME_IDAM, SSO)

2. **Role options discrepancy**: Acceptance criteria mentions "Verified, CTSC Admin, Local Admin, System Admin" but database model uses "VERIFIED, LOCAL_ADMIN, CTSC_ADMIN, SYSTEM_ADMIN". Should we show INTERNAL_ADMIN_CTSC and INTERNAL_ADMIN_LOCAL from the roles.ts file or database values?
   - **Assuming**: Use database role values (VERIFIED, LOCAL_ADMIN, CTSC_ADMIN, SYSTEM_ADMIN)

3. **User Management tile**: The tile is already in system-admin-dashboard/en.ts. Does this need to be activated or is it already live?
   - **Assuming**: Tile exists but links to `/user-management` which doesn't exist yet; we're implementing the destination

4. **Self-deletion**: Should System Admin be prevented from deleting their own account?
   - **Assuming**: Allow self-deletion (admin responsibility)

5. **Filter persistence**: Should filters persist after user deletion or be cleared?
   - **Assuming**: Persist filters to allow continued management of similar users

6. **Cascade deletion**: Should subscriptions be automatically deleted with user?
   - **Assuming**: Yes, cascade delete (check Prisma schema for existing onDelete behavior)

7. **Back navigation from Manage page**: Spec says "returns to Find page without losing search results". Should this maintain pagination position?
   - **Assuming**: Return to page 1 of filtered results (simpler implementation)

8. **Welsh translations**: Should this feature be fully translated?
   - **Assuming**: Yes, all pages require Welsh translations per project standards

9. **Filter application**: Should filters update on input change or require explicit "Apply" action?
   - **Assuming**: Require explicit form submission (POST) to apply filters

10. **Navigation after deletion**: Spec says back link returns to Find page. Should this also show a success message?
    - **Assuming**: Success page shows notification banner; back link returns to clean search page
