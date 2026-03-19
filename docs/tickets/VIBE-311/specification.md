# VIBE-311: Audit Log View

## Problem Statement

System admin users need the ability to view and review audit logs of all administrative actions performed in CaTH. This functionality provides transparency and accountability by allowing system admins to monitor and review system activity through a comprehensive audit log viewer.

## User Story

**As a** system admin
**I want** to view the full list of audit logs and individual audit log entries
**So that** I can monitor and review system activity.

## Technical Requirements

### Database Schema

**New Table: audit_log**
- `id` (PK) - Unique identifier
- `timestamp` - When the action occurred
- `action` - Description of the action performed
- `details` - Additional details about the action
- `user_id` - ID of the user who performed the action
- `user_email` - Email of the user who performed the action
- `user_role` - Role of the user (e.g., SYSTEM_ADMIN)
- `user_provenance` - Origin/authentication method of the user

**Requirements:**
- Table must be created before implementation
- Audit log entries are created immediately when an admin performs an action
- Entries are immutable (no updates or deletes)

### Three Main Screens

#### 1. System Admin Dashboard
- Entry point for audit log viewer
- Contains navigation tab: "Audit Log Viewer"
- Only accessible to system admin users
- No form fields

#### 2. Audit Log List View
- Displays all audit log entries in a table
- Table columns:
  - **Timestamp**: Date (dd/mm/yyyy) Time (hh:mm:ss)
  - **Email**: User email address
  - **Action**: Action performed
  - **View**: Link to individual entry details
- **Sorting**: Most recent entries first (default)
- **Filter Panel** (left side):
  - Selected filters summary with "Clear filters" link
  - "Apply filters" button (green)
  - Email search field
  - User ID search field (with "Must be an exact match" helper text)
  - Filter date (day/month/year fields with "For example, 27 3 2007" helper text)
  - Actions filter (checkboxes for different action types)

**Form Fields:**
- Email search:
  - Type: text
  - Required: No
  - Validation: Valid email format if entered, max 254 characters
- User ID search:
  - Type: text
  - Required: No
  - Validation: Exact match, alphanumeric only, max 50 characters
- Filter date:
  - Type: date (split fields: day/month/year)
  - Required: No
  - Validation: Valid calendar date
- Actions filter:
  - Type: checkbox group
  - Required: No
  - Validation: One or more actions may be selected

#### 3. Individual Audit Log Detail View
- Read-only view of single audit log entry
- Display fields in table format:
  - User ID
  - Email
  - Role
  - Provenance
  - Action
  - Details
- Navigation:
  - "Back to audit log list" link (top)
  - "Back to top" arrow (bottom)

### Content Requirements

All content must be provided in both English and Welsh.

**System Admin Dashboard:**
- EN: Title/H1 "System admin dashboard"
- EN: Navigation tab "Audit Log Viewer"
- CY: Welsh translations required

**Audit Log List View:**
- EN: Title/H1 "Audit log viewer"
- EN: Table headers "Timestamp", "Email", "Action", "View"
- EN: Filter panel "Filters", "Selected filters", "Clear filters", "Apply filters"
- EN: Helper texts for User ID and date fields
- CY: Welsh translations required

**Individual Audit Log Detail View:**
- EN: Title/H1 "Audit log entry details"
- EN: Table row labels "User ID", "Email", "Role", "Provenance", "Action", "Details"
- EN: Links "Back to audit log list", "Back to top"
- CY: Welsh translations required

### Error Messages

**System Admin Dashboard:**
- EN: "You do not have permission to access this service"
- CY: Welsh translation required

**Audit Log List View:**
- EN: "There are no audit log entries that match your filters"
- EN: "Enter a valid date"
- CY: Welsh translations required

**Individual Audit Log Detail View:**
- EN: "Audit log entry could not be found"
- CY: Welsh translation required

### Navigation

- **From Dashboard**: Click "Audit Log Viewer" tab → Audit Log List View
- **From List View**: Click "View" link → Individual Detail View
- **From Detail View**: Click "Back to audit log list" → List View (with filters retained)
- **From Detail View**: Click "Back to top" → Scroll to page heading

### Access Control

- Only system admin users can access the Audit Log Viewer
- Non-admin users must be prevented from accessing
- Display permission error if unauthorized access attempted

### Audit Logging

- All system admin actions must be captured in the audit_log table
- Entries are created immediately when action is performed
- No updates or deletes allowed (immutable audit trail)

## Accessibility Requirements

- WCAG 2.2 AA standards compliance
- Tables with proper semantic markup and header associations
- Filter controls keyboard accessible and clearly labelled
- Error messages announced to assistive technologies
- "Back to top" link moves focus to page heading
- All form fields properly labelled

## Test Scenarios

1. System admin can access Audit Log Viewer from the dashboard
2. Non-system admin users are prevented from accessing the Audit Log Viewer
3. Audit log entries are displayed sorted by most recent first
4. Timestamp displays date and time in specified format (dd/mm/yyyy hh:mm:ss)
5. Filters correctly refine audit log results by email, user ID, date and action
6. Clearing filters resets the results list
7. Selecting "View" opens the correct individual audit log entry
8. Audit log detail view displays all required fields (User ID, Email, Role, Provenance, Action, Details)
9. Back navigation returns user to previous screen without losing context
10. Newly performed system admin actions appear immediately in the audit log list
11. Invalid date format displays validation error
12. Email filter with invalid format displays validation error
13. User ID filter with special characters displays validation error
14. Multiple action filters can be selected and applied together
15. Welsh language support works across all pages

## Out of Scope

- Audit log retention policies
- Exporting audit logs
- Advanced search features beyond specified filters
- Bulk operations on audit logs
- Audit log analytics/reporting
