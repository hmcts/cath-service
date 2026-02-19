# Code Review: Issue #310 - User Management

## Summary

This review covers the implementation of the User Management feature (issue #310), which adds the ability for System Admins to search, view, and delete user accounts. The implementation includes:

- 4 new page controllers with templates (find-users, manage-user, delete-user-confirm, delete-user-success)
- User search service with filtering and pagination
- User deletion service with cascade handling
- Comprehensive validation for search filters
- Unit tests for all services and controllers
- Dashboard integration

The implementation demonstrates good code quality with proper TypeScript usage, comprehensive testing, and adherence to GOV.UK Design System standards. However, there are several critical issues that must be addressed before deployment, and E2E tests are completely missing.

---

## 🚨 CRITICAL Issues

### 1. Missing E2E Tests (BLOCKING)
**Location**: `e2e-tests/tests/`
**Problem**: No end-to-end tests exist for the entire user management journey. This is a critical gap that violates project standards.
**Impact**: Cannot verify the complete user journey works correctly, Welsh translations display properly, or accessibility standards are met.
**Solution**: Create a comprehensive E2E test covering:
```typescript
test('system admin can manage users @nightly', async ({ page }) => {
  // 1. Login as system admin and navigate to user management
  // 2. Apply filters and verify results
  // 3. Test pagination
  // 4. Navigate to manage user page
  // 5. Test delete confirmation (No branch)
  // 6. Test delete confirmation (Yes branch)
  // 7. Verify user deleted
  // 8. Test Welsh translations at key points
  // 9. Run accessibility checks inline
});
```

### 2. Database Type Safety Issue
**Location**: `libs/system-admin-pages/src/user-management/queries.ts:35`
**Problem**: Using `any` type for `whereClause` defeats TypeScript's type safety.
```typescript
const whereClause: any = {};  // ❌ BAD
```
**Impact**: No compile-time type checking for database query conditions, potential runtime errors.
**Solution**: Use Prisma's generated types:
```typescript
import type { Prisma } from '@prisma/client';

const whereClause: Prisma.UserWhereInput = {};
```

### 3. Console.error Without Proper Logging
**Location**: Multiple files
- `libs/system-admin-pages/src/pages/find-users/index.ts:42`
- `libs/system-admin-pages/src/pages/manage-user/index.ts:29`
- `libs/system-admin-pages/src/pages/delete-user-confirm/index.ts:37, 68, 88`

**Problem**: Using `console.error()` instead of structured logging service.
**Impact**: Errors not properly tracked, no correlation IDs, difficult to debug in production.
**Solution**: Use a logging service (if available) or at minimum include context:
```typescript
console.error('Error searching users:', {
  error,
  filters,
  page,
  timestamp: new Date().toISOString()
});
```

### 4. Missing Database Indexes
**Location**: Database schema
**Problem**: No indexes exist on frequently queried fields (email, role, userProvenance).
**Impact**: Poor query performance with large user datasets, potential timeout on searches.
**Solution**: Add indexes in Prisma schema:
```prisma
model User {
  // ...
  @@index([email])
  @@index([role])
  @@index([userProvenance])
}
```

### 5. Template Accessibility: Missing Error Message Link
**Location**: `libs/system-admin-pages/src/pages/delete-user-confirm/index.njk:39`
**Problem**: Error message object structure doesn't match expected format for inline errors.
```typescript
errorMessage: errors and errors[0] if errors
```
**Impact**: Screen readers may not properly announce field-level errors.
**Solution**: Use proper error message format:
```njk
errorMessage: errors[0] if errors and errors[0]
```

---

## ⚠️ HIGH PRIORITY Issues

### 1. Pagination Implementation Issues
**Location**: `libs/system-admin-pages/src/pages/find-users/index.njk:152-180`
**Problem**: Pagination logic is overly complex and builds incorrect items array using Nunjucks array manipulation.
**Impact**: Confusing pagination UI, potential bugs with page navigation.
**Recommendation**: Simplify pagination by building items in controller:
```typescript
// In controller
const paginationItems = [];
if (currentPage > 1) {
  paginationItems.push({
    number: currentPage - 1,
    href: `/find-users?page=${currentPage - 1}${lng ? '&lng=' + lng : ''}`
  });
}
// ... build all page items
```

### 2. No Back Link on Find Users Page
**Location**: `libs/system-admin-pages/src/pages/find-users/index.njk`
**Problem**: Missing back link to System Admin Dashboard, violating GOV.UK pattern.
**Impact**: Poor user experience, users cannot easily navigate back.
**Recommendation**: Add back link after opening tag:
```njk
{% block page_content %}
<a href="/system-admin-dashboard{{ lng ? '?lng=' + lng : '' }}" class="govuk-back-link">Back</a>
```

### 3. Inconsistent Error Handling
**Location**: `libs/system-admin-pages/src/pages/find-users/index.ts:41-49`
**Problem**: Swallowing errors and returning empty results instead of showing error page.
**Impact**: Users see empty list instead of helpful error message when system fails.
**Recommendation**: Show error page for unexpected errors:
```typescript
} catch (error) {
  console.error("Error searching users:", error);
  return res.status(500).render("errors/500");
}
```

### 4. Session Data Not Cleared After Deletion
**Location**: `libs/system-admin-pages/src/pages/delete-user-confirm/index.ts`
**Problem**: Filters remain in session after user deletion, potentially causing confusion.
**Impact**: User sees outdated filters when returning to find-users page.
**Recommendation**: Consider clearing or documenting that filters persist (per technical plan question #4).

### 5. Missing Input Autocomplete Attributes
**Location**: `libs/system-admin-pages/src/pages/find-users/index.njk`
**Problem**: Email input missing `autocomplete` attribute.
**Impact**: Browsers cannot offer helpful autocomplete suggestions.
**Recommendation**: Add autocomplete to email field:
```njk
{{ govukInput({
  id: "email",
  name: "email",
  type: "email",
  autocomplete: "email",  // ADD THIS
  value: filters.email
}) }}
```

### 6. Delete Button Should Use Form POST
**Location**: `libs/system-admin-pages/src/pages/manage-user/index.njk:49`
**Problem**: Delete button uses GET method (navigates to confirmation page).
**Impact**: Not a security issue per se, but unconventional pattern.
**Recommendation**: While this works, consider if the confirmation should be POST or keep current pattern (acceptable as is, but document decision).

---

## 💡 SUGGESTIONS

### 1. Improve Pagination User Experience
Add "Previous" and "Next" text labels in addition to page numbers for better accessibility and UX.

### 2. Add Filter Clear Functionality
**Location**: `libs/system-admin-pages/src/pages/find-users/`
**Enhancement**: Add a "Clear filters" button to reset search.
**Benefit**: Better UX, allows users to quickly start fresh search.

### 3. Add Results Summary
Show a summary like "Showing 1-25 of 150 users" above the table for better context.

### 4. Improve Date Formatting Function
**Location**: Translation files
**Enhancement**: Centralize date formatting in a shared utility function.
**Benefit**: Consistent date formatting across application.

### 5. Add JSDoc Comments
**Location**: All exported functions in `queries.ts` and `validation.ts`
**Enhancement**: Document function parameters, return types, and behavior.
**Benefit**: Better developer experience and code maintainability.

### 6. Consider Adding User Role Display Name Mapping
**Location**: `libs/system-admin-pages/src/pages/find-users/index.njk:145`
**Enhancement**: Map role codes (INTERNAL_ADMIN_CTSC) to display names ("CTSC Admin").
**Benefit**: More user-friendly table display.

### 7. Add Loading States
Consider adding loading indicators for long-running searches.

### 8. Improve Error Messages
Make validation error messages more specific:
- "Enter an email address in the correct format, like name@example.com"
- "User ID must contain only letters and numbers (no spaces or special characters)"

---

## ✅ Positive Feedback

### Excellent Implementation Patterns

1. **Proper Middleware Arrays**: All controllers correctly use `RequestHandler[]` with `requireRole` middleware.

2. **Comprehensive Unit Tests**: All service functions and controllers have well-structured unit tests following AAA pattern.

3. **Type Safety**: Good use of TypeScript interfaces for data structures (except `whereClause` issue).

4. **Transaction Handling**: User deletion properly uses Prisma transactions with cascade deletion.

5. **Self-Deletion Prevention**: Excellent security check preventing admins from deleting their own accounts.

6. **Welsh Translation Support**: Complete Welsh translations for all pages with proper structure.

7. **GOV.UK Component Usage**: Proper use of design system components (govukInput, govukCheckboxes, govukTable, etc.).

8. **Validation Functions**: Well-separated, testable validation logic with clear error messages.

9. **Session Management**: Proper use of session to maintain filter state across navigation.

10. **Error Handling**: Good use of 404 and 403 status codes with appropriate error pages.

### Specific Good Practices

- **File Organization**: Clean module structure with collocated tests
- **Naming Conventions**: Consistent use of kebab-case for files, camelCase for variables
- **Test Coverage**: High test coverage on business logic (queries and validation)
- **Code Consistency**: Follows established patterns from other pages
- **Security**: Proper authorization checks on all routes

---

## Test Coverage Assessment

### Unit Tests: ✅ EXCELLENT
- **queries.test.ts**: 100% coverage of searchUsers, getUserById, deleteUserById
- **validation.test.ts**: Comprehensive coverage of all validation functions
- **Page controllers**: All GET/POST handlers tested with multiple scenarios
- **Test quality**: Well-structured AAA pattern, realistic scenarios

### E2E Tests: ❌ MISSING (CRITICAL)
- No end-to-end tests exist for user management journey
- Welsh translations not tested in browser
- Accessibility not verified with axe-core
- Keyboard navigation not tested
- Must be created before merge

### Accessibility Tests: ❌ NOT VERIFIED
- No automated accessibility testing
- Should be included inline in E2E test
- Screen reader announcements not verified

---

## Acceptance Criteria Verification

Based on ticket.md specifications:

- [x] **Only System Admin access**: ✅ `requireRole([USER_ROLES.SYSTEM_ADMIN])` on all routes
- [x] **User Management tab**: ✅ Added to dashboard with correct link `/find-users`
- [x] **User list table**: ✅ Email, Role, Provenance, Manage columns displayed
- [x] **25 users per page**: ✅ `PAGE_SIZE = 25` in queries
- [x] **Filter panel**: ✅ Email, User ID, User Provenance ID search fields
- [x] **Role checkboxes**: ✅ VERIFIED, CTSC Admin, Local Admin, System Admin
- [x] **Provenance checkboxes**: ✅ CFT IdAM, SSO, B2C, Crime IdAM
- [x] **Email partial match**: ✅ Uses `contains` with case-insensitive
- [x] **Exact match for IDs**: ✅ Uses direct equality for userId and userProvenanceId
- [x] **No results error**: ✅ Displays error message when filters return no results
- [x] **Manage user page**: ✅ Displays user details with warning message
- [x] **User details table**: ✅ All 7 fields (User ID, Email, Role, Provenance, Provenance ID, Creation Date, Last sign in)
- [x] **Delete user button**: ✅ Red button with govuk-button--warning class
- [x] **Confirmation page**: ✅ Yes/No radios with Continue button
- [x] **No redirects to manage**: ✅ Proper redirect logic in POST handler
- [x] **Yes deletes user**: ✅ Calls deleteUserById and redirects to success
- [x] **Success banner**: ✅ Green panel with "User deleted" message
- [x] **Pagination controls**: ⚠️ Present but overly complex implementation
- [x] **Database deletion**: ✅ User and subscriptions deleted in transaction
- [ ] **Welsh translations**: ✅ Complete (but not E2E tested)
- [ ] **Accessibility**: ⚠️ Components used correctly, but not tested

**Overall**: 21/23 criteria met. Missing E2E verification and accessibility testing.

---

## Next Steps

### Before Merge (REQUIRED):

1. - [ ] **Fix critical `any` type** in queries.ts whereClause
2. - [ ] **Add database indexes** for email, role, userProvenance
3. - [ ] **Create comprehensive E2E test** covering full user journey
4. - [ ] **Test Welsh translations** in browser with E2E
5. - [ ] **Run accessibility checks** with axe-core in E2E test
6. - [ ] **Fix inline error message** in delete-user-confirm template
7. - [ ] **Add back link** to find-users page

### High Priority (Should Fix):

8. - [ ] **Improve pagination implementation** (move logic to controller)
9. - [ ] **Fix error handling** in find-users (show error page instead of empty list)
10. - [ ] **Add autocomplete** to email input
11. - [ ] **Improve logging** with structured error logging

### Optional Improvements:

12. - [ ] Add filter clear button
13. - [ ] Add results summary text
14. - [ ] Add JSDoc comments
15. - [ ] Add loading states
16. - [ ] Map role codes to display names

### Testing Required:

- [ ] Run `yarn test` and verify all pass
- [ ] Run `yarn lint:fix` and resolve all warnings
- [ ] Run `yarn format`
- [ ] Manual test in browser (Chrome, Firefox)
- [ ] Manual test with screen reader
- [ ] Manual test keyboard navigation only
- [ ] Test Welsh translations (`?lng=cy`)
- [ ] Test on mobile viewport (320px width)

---

## Overall Assessment

**STATUS: NEEDS CHANGES**

The implementation demonstrates solid engineering practices with comprehensive unit testing, proper TypeScript usage, and good adherence to GOV.UK standards. The code is well-organized and follows established patterns.

However, the **complete absence of E2E tests is a blocking issue** that prevents approval. Additionally, the critical type safety issue with `any` type and missing database indexes must be addressed.

Once E2E tests are added and critical issues resolved, this will be a high-quality implementation ready for production.

**Estimated effort to address issues**: 4-6 hours
- E2E test creation: 3-4 hours
- Critical fixes: 1-2 hours

---

**Reviewer Note**: This is a substantial feature with 1000+ lines of new code. The developer has done excellent work on unit testing and code structure. The main gaps are in integration testing and a few type safety issues that should be straightforward to resolve.
