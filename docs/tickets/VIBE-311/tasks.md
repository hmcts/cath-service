# VIBE-311: Implementation Tasks

## Phase 1: Database Schema ⚠️ CRITICAL - DO FIRST

- [ ] Update `libs/postgres/prisma/schema.prisma` to add AuditLog model
- [ ] Add indexes for timestamp, user_email, and user_id
- [ ] Generate Prisma migration: `yarn db:migrate:dev`
- [ ] Verify migration applied successfully

## Phase 2: Audit Logging Infrastructure

### Module Setup
- [ ] Create directory structure: `libs/audit-log/src/{pages,locales,assets/css}`
- [ ] Create `libs/audit-log/package.json`
- [ ] Create `libs/audit-log/tsconfig.json`
- [ ] Create `libs/audit-log/src/config.ts`
- [ ] Create `libs/audit-log/src/index.ts`

### Audit Logger Utility
- [ ] Create `libs/audit-log/src/audit-logger.ts`
- [ ] Implement `logAction(userId, userEmail, userRole, userProvenance, action, details)`
- [ ] Add error handling and logging
- [ ] Add unit tests for audit logger

### Repository Layer
- [ ] Create `libs/audit-log/src/audit-log-repository.ts`
- [ ] Implement `create(data: AuditLogData)`
- [ ] Implement `findAll(filters, orderBy, pagination)`
- [ ] Implement `findById(id: string)`
- [ ] Implement `countByFilters(filters)`
- [ ] Add unit tests for repository

### Middleware (Optional)
- [ ] Create `libs/audit-log/src/audit-log-middleware.ts`
- [ ] Implement auto-logging for admin actions
- [ ] Add unit tests for middleware

## Phase 3: Audit Log List View

### Service Layer
- [ ] Create `libs/audit-log/src/audit-log-service.ts`
- [ ] Implement `getAuditLogs(filters, page, pageSize)`
- [ ] Implement `getAuditLogById(id)`
- [ ] Add filter validation logic (email format, user ID format, date)
- [ ] Add date parsing and formatting
- [ ] Add unit tests for service

### List View Controller
- [ ] Create `libs/audit-log/src/pages/audit-log-list.ts`
- [ ] Implement GET handler to load audit logs with filters
- [ ] Handle query params: email, userId, date, actions[], page
- [ ] Implement POST handler to apply filters (redirect to GET)
- [ ] Add content objects (en and cy)
- [ ] Add validation error handling

### List View Template
- [ ] Create `libs/audit-log/src/pages/audit-log-list.njk`
- [ ] Add table with columns: Timestamp, Email, Action, View
- [ ] Create filter panel with selected filters summary
- [ ] Add "Clear filters" link
- [ ] Add "Apply filters" button
- [ ] Add email search input
- [ ] Add user ID search input with helper text
- [ ] Add date filter (day/month/year fields) with helper text
- [ ] Add actions checkboxes
- [ ] Add pagination controls
- [ ] Add error summary component

### Styles
- [ ] Create `libs/audit-log/src/assets/css/audit-log.scss`
- [ ] Style filter panel layout
- [ ] Style selected filters summary box
- [ ] Style table

## Phase 4: Audit Log Detail View

### Detail View Controller
- [ ] Create `libs/audit-log/src/pages/audit-log-detail.ts`
- [ ] Implement GET handler to load single audit log entry by ID
- [ ] Handle not found error (404)
- [ ] Add content objects (en and cy)

### Detail View Template
- [ ] Create `libs/audit-log/src/pages/audit-log-detail.njk`
- [ ] Add table displaying User ID, Email, Role, Provenance, Action, Details
- [ ] Add "Back to audit log list" link
- [ ] Add "Back to top" link with focus management
- [ ] Add error handling for missing entry

## Phase 5: System Admin Dashboard Integration

- [ ] Update `libs/system-admin/src/pages/dashboard.ts` to add "Audit Log Viewer" tab
- [ ] Update `libs/system-admin/src/pages/dashboard.njk` template
- [ ] Add link to audit log list page
- [ ] Test navigation from dashboard to audit log list

## Phase 6: Translations

### English Translations
- [ ] Create `libs/audit-log/src/locales/en.ts`
- [ ] Add page titles and headings
- [ ] Add table headers
- [ ] Add filter labels and helper text
- [ ] Add button text
- [ ] Add error messages
- [ ] Add link text

### Welsh Translations
- [ ] Create `libs/audit-log/src/locales/cy.ts`
- [ ] Translate all content from English file
- [ ] Review Welsh translations for accuracy

## Phase 7: Access Control

- [ ] Add permission check in `audit-log-list.ts` controller
- [ ] Add permission check in `audit-log-detail.ts` controller
- [ ] Verify user has SYSTEM_ADMIN role
- [ ] Return 403 error with message if unauthorized
- [ ] Add unit tests for permission checks

## Phase 8: Module Registration

- [ ] Register module in `apps/web/src/app.ts`
- [ ] Register assets in `apps/web/vite.config.ts`
- [ ] Register Prisma schema in `apps/postgres/src/schema-discovery.ts`
- [ ] Update root `tsconfig.json` with module path

## Phase 9: Testing

### Unit Tests
- [ ] Test AuditLogService filter logic
- [ ] Test date parsing and validation
- [ ] Test repository methods
- [ ] Test audit logger utility
- [ ] Test permission checks
- [ ] Ensure >80% coverage on business logic

### Integration Tests
- [ ] Test creating audit log entries
- [ ] Test filtering audit logs (all filter combinations)
- [ ] Test pagination
- [ ] Test permission checks with different user roles

### E2E Tests
- [ ] Test system admin navigates from dashboard to audit log list
- [ ] Test non-admin user is denied access
- [ ] Test filters are applied and results updated
- [ ] Test individual entry is viewed and back navigation works
- [ ] Test "Back to top" link focus management
- [ ] Test Welsh translation works across all pages
- [ ] Test accessibility with Axe (inline with journey)
- [ ] Test keyboard navigation

## Phase 10: Documentation & Cleanup

- [ ] Update README if needed
- [ ] Run `yarn lint:fix` to fix any linting issues
- [ ] Run `yarn format` to format code
- [ ] Review all changes
- [ ] Create pull request

## Notes

- **Critical**: Do Phase 1 first - database schema is required for everything else
- Audit log entries are immutable (no updates or deletes)
- All pages must support Welsh language
- Use query parameters for filters to enable bookmarking
- Index the database columns used for filtering
- Default page size: 50 entries
- Timestamp format: dd/mm/yyyy hh:mm:ss
