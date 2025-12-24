# VIBE-306: Technical Implementation Plan

## Overview
This ticket implements bulk unsubscribe functionality for verified media users, allowing them to select multiple subscriptions and remove them in a single operation. The implementation includes a 3-page workflow with tabbed views, checkbox selection, confirmation, and success messaging.

## Summary
Verified media users can efficiently manage their subscriptions by selecting multiple subscriptions across different categories (all, by case, by court/tribunal) and removing them in bulk. The feature includes tab-based filtering, select-all functionality, confirmation workflow, and prevents accidental deletion through a two-step confirmation process.

## Architecture

### Database Requirements
- Use existing subscription tables (location subscriptions, case subscriptions, list type subscriptions)
- Delete operations must be transactional to ensure all selected subscriptions are removed atomically
- Soft delete vs hard delete consideration (recommendation: hard delete for immediate effect)

### Subscription Types
1. **Subscriptions by case** - case name, party name, reference number subscriptions
2. **Subscriptions by court or tribunal** - location-based subscriptions
3. **All subscriptions** - combined view of both types

## Module Structure

Extend existing subscription module or create: `libs/bulk-unsubscribe`

```
libs/bulk-unsubscribe/
├── package.json
├── tsconfig.json
└── src/
    ├── index.ts                # Business logic exports
    ├── config.ts               # Module configuration
    ├── pages/
    │   ├── bulk-unsubscribe.ts
    │   ├── bulk-unsubscribe.njk
    │   ├── confirm-bulk-unsubscribe.ts
    │   ├── confirm-bulk-unsubscribe.njk
    │   ├── bulk-unsubscribe-success.ts
    │   └── bulk-unsubscribe-success.njk
    ├── services/
    │   └── bulk-unsubscribe-service.ts
    ├── assets/
    │   └── js/
    │       └── select-all.ts    # Client-side select all logic
    └── locales/
        ├── en.ts
        └── cy.ts
```

## Implementation Tasks

### 1. Database Service

**bulk-unsubscribe-service.ts:**
- `getAllSubscriptionsByUserId(userId)` - Get all subscriptions for display
- `getCaseSubscriptionsByUserId(userId)` - Get case subscriptions only
- `getCourtSubscriptionsByUserId(userId)` - Get court/tribunal subscriptions only
- `deleteSubscriptionsByIds(subscriptionIds, userId)` - Bulk delete with transaction
- `validateSubscriptionOwnership(subscriptionIds, userId)` - Security check
- `getSubscriptionDetailsForConfirmation(subscriptionIds)` - Get details for confirmation page

### 2. Page Controllers and Templates

**bulk-unsubscribe (Page 1):**
- GET:
  - Query user's subscriptions based on selected tab (default: All)
  - Query parameter: `view` (all|case|court)
  - Display tabbed interface
  - Render tables with checkboxes
  - Show empty state if no subscriptions in selected view
- POST:
  - Validate at least one subscription selected
  - Store selected subscription IDs in session
  - Redirect to confirm-bulk-unsubscribe
- Tab switching:
  - Use query parameters to switch views
  - Preserve selections across tab switches (store in session)
- Select all functionality:
  - Client-side JavaScript to check/uncheck all boxes
  - Header checkbox controls all row checkboxes

**confirm-bulk-unsubscribe (Page 2):**
- GET:
  - Retrieve selected subscription IDs from session
  - Query subscription details for display
  - Render confirmation table
  - Show Yes/No radio buttons
- POST:
  - Validate radio selection (Yes or No)
  - If No: Redirect to your-email-subscriptions
  - If Yes: Delete subscriptions using bulk-unsubscribe-service
  - Clear session data
  - Redirect to bulk-unsubscribe-success
- Transaction handling:
  - Use database transaction to ensure all-or-nothing deletion
  - Log deletion for audit purposes

**bulk-unsubscribe-success (Page 3):**
- GET: Display success banner
- Show navigation links:
  - Add a new email subscription
  - Manage your current email subscriptions
  - Find a court or tribunal
- Clear session data if not already cleared
- POST/Redirect/GET pattern to prevent duplicate deletions

### 3. Tab Implementation

**Tabbed Views:**
- Implement GOV.UK Tabs component
- Three tabs:
  1. All subscriptions - Combined view
  2. Subscriptions by case - Case subscriptions only
  3. Subscriptions by court or tribunal - Location subscriptions only
- Tab state managed via query parameter: `/bulk-unsubscribe?view=case`
- Preserve selections when switching tabs (store in session)

**Empty States:**
- If no subscriptions in selected tab, show empty state message
- Hide table when empty
- Message: "You do not have any subscriptions in this category."

### 4. Table Structures

**Subscriptions by case table:**
- Columns: Select (checkbox), Case name, Party name, Reference number, Date added
- Each row has unique checkbox with subscription ID as value

**Subscriptions by court or tribunal table:**
- Columns: Select (checkbox), Court or tribunal name, Date added
- Each row has unique checkbox with subscription ID as value

**All subscriptions view:**
- Display both tables sequentially
- Case subscriptions table first
- Court/tribunal subscriptions table second
- Separate "Select all" for each table

### 5. Select All Functionality

**Client-side JavaScript (select-all.ts):**
```typescript
// Pseudocode
function initSelectAll() {
  const selectAllCheckboxes = document.querySelectorAll('.select-all-checkbox');

  selectAllCheckboxes.forEach(checkbox => {
    checkbox.addEventListener('change', (e) => {
      const tableId = e.target.dataset.table;
      const rowCheckboxes = document.querySelectorAll(`#${tableId} .row-checkbox`);

      rowCheckboxes.forEach(row => {
        row.checked = e.target.checked;
      });
    });
  });

  // Update select-all if all rows manually checked
  updateSelectAllState();
}
```

### 6. Session Management
- Store selected subscription IDs across pages
- Session data structure:
```typescript
{
  bulk_unsubscribe: {
    selected_ids: [123, 456, 789],
    view: 'all' | 'case' | 'court'
  }
}
```
- Clear session after successful deletion or cancellation

### 7. Validation

**Page 1 Validation:**
- At least one checkbox must be selected
- Error: "At least one subscription must be selected"
- Display GOV.UK error summary with anchor link

**Page 2 Validation:**
- One radio must be selected (Yes or No)
- Error: "An option must be selected."
- Display GOV.UK error summary

### 8. Security Considerations
- Validate subscription ownership before deletion
- Use CSRF tokens on POST requests
- Ensure authenticated user owns all selected subscriptions
- Use database transactions for atomic deletions
- Log all bulk deletions for audit trail

### 9. Locales
Create en.ts and cy.ts with content for:
- Page titles
- Tab labels
- Table column headings
- Button labels
- Radio options
- Empty state messages
- Error messages
- Success banner text
- Navigation links

### 10. Accessibility Implementation
- Ensure all tabs support keyboard navigation
- ARIA roles for tabs: `role="tablist"`, `role="tab"`, `role="tabpanel"`
- Checkboxes must have associated labels
- Select all checkbox clearly labeled
- Error summaries with anchor links to fields
- Success banner with `role="status"` or `role="alert"`
- Tables use semantic markup with proper header scope
- Screen reader announcements for tab changes
- Visible focus indicators on all interactive elements

### 11. Styling
- Use GOV.UK Design System components:
  - Tabs
  - Checkboxes
  - Radios
  - Tables
  - Button (green)
  - Error summary
  - Success banner
- Responsive design for mobile/tablet
- Ensure checkbox alignment in tables
- Visual indication for selected rows (optional)

### 12. Integration
- Link from "Your email subscriptions" page
- Add "Bulk unsubscribe" button/link next to "Add email subscription"
- Ensure authentication middleware protects all pages
- Add authorization check for verified media user role
- Register module in apps/web/src/app.ts

### 13. Testing

**Unit Tests (Vitest):**
- bulk-unsubscribe-service.test.ts
  - Get all subscriptions
  - Get case subscriptions
  - Get court subscriptions
  - Delete subscriptions in transaction
  - Validate subscription ownership
  - Handle errors gracefully
  - Verify audit logging

**E2E Tests (Playwright):**
- Create single journey test: "Verified user can bulk unsubscribe @nightly"
  - Navigate from email subscriptions to bulk unsubscribe
  - Test "All subscriptions" tab view
  - Test "Subscriptions by case" tab view
  - Test "Subscriptions by court or tribunal" tab view
  - Test validation error when no checkbox selected
  - Select multiple subscriptions
  - Test select all functionality
  - Test tab switching preserves selections
  - Proceed to confirmation page
  - Verify selected subscriptions displayed
  - Test validation error when no radio selected
  - Test "No" returns to email subscriptions
  - Select "Yes" and confirm deletion
  - Verify success page
  - Verify subscriptions deleted from database
  - Test empty state when no subscriptions
  - Test back navigation
  - Test Welsh translation at key points
  - Test accessibility inline
  - Test keyboard navigation

### 14. Documentation
- Update README if needed
- Document bulk unsubscribe workflow
- Add comments for transaction logic
- Document audit logging

## Dependencies
- @hmcts/postgres - Database access via Prisma
- @hmcts/auth - Authentication/authorization
- GOV.UK Frontend - UI components (Tabs, Tables, Checkboxes, Radios)
- express-session - Session management
- VIBE-300 - Subscription by case name and case reference (pre-requisite)

## Migration Requirements
- No new database tables required
- Use existing subscription tables
- Ensure cascading deletes configured correctly (if using foreign keys)

## Risk Considerations
- Accidental bulk deletion mitigated by two-step confirmation
- Transaction failure handling critical for data integrity
- Session timeout could lose selections (inform user to complete quickly)
- Large number of subscriptions may cause performance issues (pagination consideration)
- Concurrent deletion attempts need proper locking
- Audit trail essential for compliance and user support

## Definition of Done
- All 3 pages implemented with Welsh translations
- Tabbed interface functional with correct filtering
- Select all functionality working
- Bulk deletion service with transaction support
- Validation working on both pages
- Empty state handling correct
- Session management functional
- Audit logging implemented
- All pages meet WCAG 2.2 AA standards
- E2E journey test passes (including Welsh and accessibility)
- Unit tests achieve >80% coverage on service
- Code reviewed and approved
- Integration with email subscriptions page complete
- Security validation in place
