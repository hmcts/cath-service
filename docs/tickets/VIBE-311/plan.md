# VIBE-311: Implementation Plan

## Overview

This ticket implements a comprehensive audit log viewer for system admins. It includes database schema creation, three main screens (dashboard tab, list view with filtering, detail view), and audit logging infrastructure.

## Critical Files

### New Files to Create

1. **Database Schema**
   - `libs/postgres/prisma/schema.prisma` - Add AuditLog model
   - `libs/postgres/prisma/migrations/` - Migration for audit_log table

2. **Audit Log Module**
   - `libs/audit-log/package.json` - Module configuration
   - `libs/audit-log/tsconfig.json` - TypeScript config
   - `libs/audit-log/src/config.ts` - Module exports
   - `libs/audit-log/src/index.ts` - Business logic exports
   - `libs/audit-log/src/pages/audit-log-list.ts` - List view controller
   - `libs/audit-log/src/pages/audit-log-list.njk` - List view template
   - `libs/audit-log/src/pages/audit-log-detail.ts` - Detail view controller
   - `libs/audit-log/src/pages/audit-log-detail.njk` - Detail view template
   - `libs/audit-log/src/locales/en.ts` - English translations
   - `libs/audit-log/src/locales/cy.ts` - Welsh translations
   - `libs/audit-log/src/audit-log-service.ts` - Service layer
   - `libs/audit-log/src/audit-log-repository.ts` - Data access
   - `libs/audit-log/src/audit-logger.ts` - Logging utility
   - `libs/audit-log/src/audit-log-middleware.ts` - Auto-logging middleware
   - `libs/audit-log/src/assets/css/audit-log.scss` - Styles for filter panel

3. **System Admin Dashboard Update**
   - `libs/system-admin/src/pages/dashboard.ts` - Add Audit Log Viewer tab
   - `libs/system-admin/src/pages/dashboard.njk` - Update template with new tab

### Files to Modify

1. **System Admin Module**
   - `libs/system-admin/src/pages/dashboard.ts` - Add "Audit Log Viewer" tab
   - `libs/system-admin/src/pages/dashboard.njk` - Update navigation

2. **App Registration**
   - `apps/web/src/app.ts` - Register audit-log module
   - `apps/web/vite.config.ts` - Register module assets
   - `apps/postgres/src/schema-discovery.ts` - Register prisma schema

3. **Root Configuration**
   - `tsconfig.json` - Add @hmcts/audit-log path

## Implementation Steps

### Phase 1: Database Schema (Priority: Critical)

1. **Create Prisma model** in `libs/postgres/prisma/schema.prisma`
   ```prisma
   model AuditLog {
     id             String   @id @default(cuid())
     timestamp      DateTime @default(now())
     action         String
     details        String?  @db.Text
     userId         String   @map("user_id")
     userEmail      String   @map("user_email")
     userRole       String   @map("user_role")
     userProvenance String   @map("user_provenance")

     @@map("audit_log")
     @@index([timestamp])
     @@index([userEmail])
     @@index([userId])
   }
   ```

2. **Generate migration**
   ```bash
   yarn db:migrate:dev
   ```

### Phase 2: Audit Logging Infrastructure (Priority: High)

1. **Create audit logger utility** `libs/audit-log/src/audit-logger.ts`
   - `logAction(userId, userEmail, userRole, userProvenance, action, details)`
   - Helper function to create audit log entries

2. **Create middleware** `libs/audit-log/src/audit-log-middleware.ts`
   - Optional: Auto-log certain admin actions
   - Extract user info from session/request
   - Call audit logger

3. **Create repository** `libs/audit-log/src/audit-log-repository.ts`
   - `create(data: AuditLogData)`
   - `findAll(filters, orderBy, pagination)`
   - `findById(id: string)`
   - `countByFilters(filters)`

### Phase 3: Audit Log List View (Priority: High)

1. **Create module structure**
   ```bash
   mkdir -p libs/audit-log/src/{pages,locales,assets/css}
   ```

2. **Implement service** `libs/audit-log/src/audit-log-service.ts`
   - `getAuditLogs(filters, page, pageSize)` - Returns paginated results
   - `getAuditLogById(id)` - Returns single entry
   - Filter validation logic
   - Date parsing and formatting

3. **Create list view controller** `libs/audit-log/src/pages/audit-log-list.ts`
   - GET handler: Load audit logs with filters
   - Query params: email, userId, date, actions[], page
   - POST handler: Apply filters (redirect to GET with query params)
   - Content objects (en/cy)

4. **Create list view template** `libs/audit-log/src/pages/audit-log-list.njk`
   - Table with Timestamp, Email, Action, View columns
   - Filter panel with:
     - Selected filters summary
     - Clear filters link
     - Apply filters button
     - Email search input
     - User ID search input
     - Date filter (day/month/year)
     - Actions checkboxes
   - Pagination controls
   - Error summary

5. **Create styles** `libs/audit-log/src/assets/css/audit-log.scss`
   - Filter panel layout
   - Selected filters summary box
   - Table styling

### Phase 4: Audit Log Detail View (Priority: High)

1. **Create detail view controller** `libs/audit-log/src/pages/audit-log-detail.ts`
   - GET handler: Load single audit log entry by ID
   - Handle not found error
   - Content objects (en/cy)

2. **Create detail view template** `libs/audit-log/src/pages/audit-log-detail.njk`
   - Table displaying:
     - User ID
     - Email
     - Role
     - Provenance
     - Action
     - Details
   - "Back to audit log list" link
   - "Back to top" link

### Phase 5: System Admin Dashboard Integration (Priority: High)

1. **Update dashboard controller** `libs/system-admin/src/pages/dashboard.ts`
   - Add "Audit Log Viewer" tab to content

2. **Update dashboard template** `libs/system-admin/src/pages/dashboard.njk`
   - Add "Audit Log Viewer" tab
   - Link to `/audit-log-list` or similar route

### Phase 6: Translations (Priority: High)

1. **Create English translations** `libs/audit-log/src/locales/en.ts`
   - Page titles
   - Table headers
   - Filter labels and helper text
   - Button text
   - Error messages

2. **Create Welsh translations** `libs/audit-log/src/locales/cy.ts`
   - All content from English file
   - Professional Welsh translations required

### Phase 7: Access Control (Priority: High)

1. **Add permission check** in audit log controllers
   - Verify user has SYSTEM_ADMIN role
   - Return 403 error if unauthorized
   - Display "You do not have permission to access this service"

2. **Update middleware** if needed
   - Ensure role-based access control is enforced

### Phase 8: Integration & Registration (Priority: Medium)

1. **Register module** in `apps/web/src/app.ts`
   - Import pageRoutes from @hmcts/audit-log/config
   - Register with createSimpleRouter

2. **Register assets** in `apps/web/vite.config.ts`
   - Import assets from @hmcts/audit-log/config
   - Add to vite config

3. **Register schema** in `apps/postgres/src/schema-discovery.ts`
   - Import prismaSchemas from @hmcts/audit-log/config
   - Add to schema paths

4. **Update root tsconfig.json**
   - Add `"@hmcts/audit-log": ["libs/audit-log/src"]`

### Phase 9: Testing (Priority: High)

1. **Unit tests**
   - AuditLogService filter logic
   - Date parsing and validation
   - Repository methods
   - Audit logger utility

2. **Integration tests**
   - Creating audit log entries
   - Filtering audit logs
   - Pagination
   - Permission checks

3. **E2E tests**
   - System admin navigates to Audit Log Viewer
   - Non-admin is denied access
   - Filters are applied and results updated
   - Individual entry is viewed
   - Welsh translation works
   - Accessibility checks with Axe

## Technical Considerations

### Filtering Implementation

- Use query parameters for filters (enables bookmarking/sharing)
- Filters: `email`, `userId`, `date`, `actions[]`
- Server-side filtering in repository layer
- Validate filter inputs before querying

### Pagination

- Default page size: 50 entries
- Use offset-based pagination
- Include total count for pagination controls
- Preserve filters when navigating pages

### Performance

- Index `timestamp` for sorting
- Index `user_email` and `user_id` for filtering
- Consider pagination to limit result sets
- Use database queries efficiently (avoid N+1)

### Date Formatting

- Store timestamps in UTC
- Display in UK format: dd/mm/yyyy hh:mm:ss
- Use date-fns or similar library for formatting
- Handle timezone conversion if needed

### Immutability

- Audit log entries cannot be updated or deleted
- No UPDATE or DELETE operations in repository
- Only CREATE and READ operations

### Filter Panel UX

- Selected filters displayed at top
- "Clear filters" removes all and reloads
- "Apply filters" button submits form
- Form uses GET method to update URL with query params

## Testing Strategy

### Unit Tests
- Filter validation logic
- Date parsing
- Repository query building
- Audit logger

### Integration Tests
- Database operations
- Filter combinations
- Permission checks
- Audit log creation

### E2E Tests
- Full navigation journey (dashboard → list → detail)
- Filter application journey
- Permission denial for non-admins
- Welsh translation journey
- Accessibility with Axe

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Large audit log tables affect performance | High | Implement pagination, indexing, consider archiving strategy |
| Filter UX is complex | Medium | Follow GOV.UK Design System patterns, user testing |
| Audit logging fails silently | Medium | Add error logging, monitoring, alerting |
| Permission bypass | High | Thorough testing of access control, middleware validation |

## Success Criteria

1. ✅ Audit log table created and indexed
2. ✅ System admin can access Audit Log Viewer from dashboard
3. ✅ List view displays all audit logs with filtering
4. ✅ Detail view shows complete audit entry information
5. ✅ Non-admin users are denied access
6. ✅ Filters work correctly (email, user ID, date, actions)
7. ✅ Timestamps display in correct format
8. ✅ Welsh translations provided
9. ✅ Accessibility standards met (WCAG 2.2 AA)
10. ✅ All tests passing
11. ✅ Newly created audit entries appear immediately

## Estimated Complexity: Medium

This ticket involves creating a new module with list and detail views, implementing filtering logic, and integrating with the system admin dashboard. The complexity is medium due to the filtering requirements and the need for proper access control and audit logging infrastructure.
