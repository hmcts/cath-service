# Code Review: VIBE-247 - Authenticate Publications Based on Sensitivity Level

## Summary

This ticket implements role-based and provenance-based authorisation for publications based on their sensitivity levels (PUBLIC, PRIVATE, CLASSIFIED). The implementation includes a well-structured authorisation service module with comprehensive unit tests, middleware for protecting routes, and integration into existing publication pages.

The core authorisation logic follows security best practices (fail-closed approach) and has excellent test coverage. However, there is a **critical security bug** where Local/CTSC admins can see PRIVATE and CLASSIFIED publications on public pages when they should only see PUBLIC publications.

**Overall Assessment:** NEEDS CHANGES (Critical security bug must be fixed)

---

## 🚨 CRITICAL Issues

### 1. Local/CTSC Admins Can See PRIVATE/CLASSIFIED on Public Pages (SECURITY BUG)
**File:** `/Users/kian.kwa/IdeaProjects/cath-service2/libs/publication/src/authorisation/service.ts`
**Lines:** 34-37

**Problem:** The `canAccessPublication()` function incorrectly returns `true` for Local/CTSC admins on PRIVATE and CLASSIFIED publications:
```typescript
// Local and CTSC admins can access metadata but handled separately
if (METADATA_ONLY_ROLES.includes(user.role as any)) {
  return true; // They can access for metadata purposes
}
```

This causes Local/CTSC admins to see PRIVATE and CLASSIFIED publications on the public `summary-of-publications` page (libs/public-pages/src/pages/summary-of-publications/index.ts:46), which uses `filterAccessiblePublications()`.

**Impact:** **CRITICAL SECURITY VULNERABILITY** - Local/CTSC admins can see sensitive publications they should not have access to on public-facing pages. This violates AC9.

**Correct Behavior:**
- Local/CTSC admins should ONLY see PUBLIC publications on public pages (summary-of-publications)
- Local/CTSC admins CAN see all publications in admin pages (remove-list-search-results) for deletion purposes
- Admin pages use `requireRole` middleware and fetch publications directly, bypassing `canAccessPublication()`

**Solution:** Remove lines 34-37 from `canAccessPublication()`. Admin pages don't rely on this function (they use `requireRole` + direct database queries), so removing these lines will:
1. ✅ Fix public pages: Local/CTSC admins will only see PUBLIC
2. ✅ Admin pages continue working: They bypass access checks entirely via `requireRole`
3. ✅ Direct URL access to PRIVATE/CLASSIFIED will be properly blocked by `requirePublicationAccess()` middleware

---

### 2. Missing 403 Error Template
**File:** Multiple locations (middleware.ts, list type pages)
**Lines:**
- `/Users/kian.kwa/IdeaProjects/cath-service2/libs/publication/src/authorisation/middleware.ts:34`
- `/Users/kian.kwa/IdeaProjects/cath-service2/libs/list-types/civil-and-family-daily-cause-list/src/pages/index.ts:51`

**Problem:** The code attempts to render `errors/403` template but this file does not exist in the codebase. Only `400.njk`, `404.njk`, and `500.njk` exist in `libs/web-core/src/views/errors/`.

**Impact:** Runtime errors when unauthorised users attempt to access restricted publications. The application will fail to render the 403 error page, resulting in a broken user experience.

**Solution:** Create `/Users/kian.kwa/IdeaProjects/cath-service2/libs/web-core/src/views/errors/403.njk` template following the same pattern as other error pages. Include both English and Welsh content. Example structure:

```nunjucks
{% extends "layouts/default.njk" %}

{% block pageTitle %}{{ title }} - {{ serviceName }}{% endblock %}

{% block content %}
  <div class="govuk-grid-row">
    <div class="govuk-grid-column-two-thirds">
      <h1 class="govuk-heading-xl">{{ title }}</h1>
      <p class="govuk-body">{{ message }}</p>
    </div>
  </div>
{% endblock %}
```

---

### 3. Type Safety Issue with Role/Provenance Checking
**File:** `/Users/kian.kwa/IdeaProjects/cath-service2/libs/publication/src/authorisation/service.ts`
**Lines:** 35, 41, 46, 75, 100

**Problem:** Code uses `as any` type assertions when checking roles and provenance:
```typescript
if (METADATA_ONLY_ROLES.includes(user.role as any)) {
if (VERIFIED_USER_PROVENANCES.includes(user.provenance as any)) {
```

**Impact:** Defeats TypeScript's type safety, potential runtime errors if user.role or user.provenance have unexpected values.

**Solution:** Since `UserProfile.role` and `UserProfile.provenance` are optional strings, perform proper type guards:
```typescript
if (user.role && METADATA_ONLY_ROLES.includes(user.role as typeof METADATA_ONLY_ROLES[number])) {
```

Or better, define proper types for valid roles and provenance values and use them in UserProfile interface.

---

## ⚠️ HIGH PRIORITY Issues

### 1. Duplicate Database Queries in Middleware
**File:** `/Users/kian.kwa/IdeaProjects/cath-service2/libs/publication/src/authorisation/middleware.ts`
**Lines:** 21-23

**Problem:** The middleware fetches the artefact from the database to check permissions, then the page handler likely fetches it again. This is inefficient.

**Impact:** Unnecessary database load, slower response times, potential for race conditions if data changes between checks.

**Recommendation:** Consider attaching the fetched artefact to `req` so the handler can reuse it:
```typescript
// In middleware
req.artefact = artefact; // Add to Request type augmentation

// In handler
const artefact = req.artefact || await prisma.artefact.findUnique(...);
```

---

### 2. Missing Audit Logging for Access Denials
**Files:** Middleware and service files

**Problem:** When access is denied, there's no audit trail. Security-sensitive applications should log who attempted to access what and why they were denied.

**Impact:** Cannot track potential security breaches, unauthorised access attempts, or debug permission issues.

**Recommendation:** Add structured logging for access denials:
```typescript
if (!canAccessPublication(user, artefact, listType)) {
  logger.warn('Publication access denied', {
    userId: user?.id,
    userRole: user?.role,
    userProvenance: user?.provenance,
    artefactId: publicationId,
    sensitivity: artefact.sensitivity,
    timestamp: new Date().toISOString()
  });
  return res.status(403).render("errors/403");
}
```

---

### 3. Error Information Leakage via Console.error
**File:** `/Users/kian.kwa/IdeaProjects/cath-service2/libs/publication/src/authorisation/middleware.ts`
**Lines:** 38, 85

**Problem:** Using `console.error` to log errors may expose sensitive information in production logs and doesn't follow structured logging best practices.

**Impact:** Potential information disclosure, poor log management, difficult to monitor in production.

**Recommendation:** Use a proper logger with appropriate log levels:
```typescript
logger.error('Error checking publication access', {
  error: error.message,
  publicationId,
  userId: req.user?.id
});
```

---

### 4. Hard-coded Error Message in Production
**File:** `/Users/kian.kwa/IdeaProjects/cath-service2/libs/admin-pages/src/pages/remove-list-confirmation/index.ts`
**Line:** 126

**Problem:** Error message is hard-coded in English only within the code:
```typescript
text: "An error occurred while removing content. Please try again later."
```

**Impact:** Breaks Welsh language support, inconsistent with the rest of the application's i18n approach.

**Recommendation:** Move this to the lang object (en.ts and cy.ts files).

---

## 💡 SUGGESTIONS

### 1. Test Coverage Enhancement
**Current:** Unit tests are comprehensive (58 tests for service, 14 for middleware), but no E2E tests added despite tasks.md claiming they were done.

**Recommendation:** Add E2E tests to verify the full user journey:
- Unauthenticated user trying to access PRIVATE publication
- Verified user with matching provenance accessing CLASSIFIED
- Local admin attempting to view PRIVATE list data
- System admin accessing all publications
- **Local/CTSC admin on summary-of-publications page (should only see PUBLIC)**

---

### 2. Performance Optimization - Caching List Types
**File:** `/Users/kian.kwa/IdeaProjects/cath-service2/libs/publication/src/authorisation/service.ts`
**Line:** 122

**Problem:** `filterAccessiblePublications` iterates through all artefacts and performs a `find` on list types for each one.

**Impact:** O(n*m) complexity, could be slow for large datasets.

**Recommendation:** Convert listTypes array to a Map for O(1) lookups:
```typescript
const listTypeMap = new Map(listTypes.map(lt => [lt.id, lt]));
return artefacts.filter((artefact) => {
  const listType = listTypeMap.get(artefact.listTypeId);
  return canAccessPublication(user, artefact, listType);
});
```

---

### 3. Consistent Error Handling Pattern
**File:** `/Users/kian.kwa/IdeaProjects/cath-service2/libs/list-types/civil-and-family-daily-cause-list/src/pages/index.ts`
**Lines:** 47-59

**Problem:** Error handling for authorisation check is done inline with custom English/Welsh messages, while the middleware uses a separate approach.

**Impact:** Inconsistent error messages, duplicate code.

**Recommendation:** Standardise on using the middleware for all authorisation checks, or create a shared error message utility.

---

## ✅ Positive Feedback

### 1. Excellent Test Coverage
The authorisation service has comprehensive unit tests covering all sensitivity levels, user roles, and edge cases including:
- All user role combinations
- Provenance matching for CLASSIFIED publications
- Missing data scenarios (fail-closed approach)
- Edge cases like missing sensitivity fields

This demonstrates good testing practices and gives confidence in the core logic.

---

### 2. Security-First Design
The implementation follows security best practices:
- Fail-closed approach (defaults to CLASSIFIED if sensitivity missing)
- Explicit permission checks rather than blacklisting
- Separation of "access" vs "data access" for metadata-only scenarios
- Provenance matching for CLASSIFIED lists

---

### 3. Clean Separation of Concerns
The architecture properly separates:
- Business logic (service.ts)
- HTTP handling (middleware.ts)
- Pure functions for easy testing
- Clear function naming that describes intent

This makes the code maintainable and easy to understand.

---

### 4. Proper TypeScript Usage
- Comprehensive type definitions
- Type imports where appropriate
- Minimal use of `any` (only in the noted issues)
- Good interface definitions for test helpers

---

### 5. Welsh Language Support
Error messages in middleware include both English and Welsh translations, maintaining consistency with the rest of the application.

---

## Test Coverage Assessment

### Unit Tests: EXCELLENT (✅)
- **Service tests:** 58 tests covering all functions and scenarios
- **Middleware tests:** 14 tests covering happy paths and error conditions
- **Edge cases:** Well covered (missing fields, null users, unknown list types)
- **Coverage:** High coverage on business logic

### Integration Tests: PARTIAL (⚠️)
- Publication list filtering tested via unit tests
- No tests for the complete flow from HTTP request to authorisation decision
- No tests for session/authentication integration

### E2E Tests: MISSING (❌)
- Task list claims E2E tests were added but none found
- No Playwright tests for different user roles accessing publications
- No tests for the complete user journey
- **Missing critical test:** Local/CTSC admin on summary page should only see PUBLIC

### Accessibility Tests: NOT APPLICABLE
- New error pages need a11y testing once 403.njk is created
- Existing pages not modified so no new a11y concerns

---

## Acceptance Criteria Verification

- [x] **AC1:** Sensitivity level during upload
  - Already existed in artefact model, not part of this ticket

- [x] **AC2:** PUBLIC accessible to all
  - Implemented correctly in service.ts line 25-27

- [x] **AC3:** PRIVATE accessible to verified users
  - Implemented correctly in service.ts line 40-42

- [x] **AC4:** CLASSIFIED accessible with provenance match
  - Implemented correctly in service.ts line 45-57

- [x] **AC5:** Validation using user provenance
  - Implemented, uses UserProfile.provenance from session

- [x] **AC6:** Parent-child relationship hierarchy
  - Implemented through role constants and checking logic

- [x] **AC7:** System admin full access
  - Implemented in service.ts line 20-22

- [x] **AC8:** Verified user classified check
  - Implemented in service.ts line 46-57

- [ ] **AC9:** Local/CTSC admin metadata only (CRITICAL BUG)
  - **INCORRECT: Lines 34-37 allow Local/CTSC admins to see PRIVATE/CLASSIFIED on public pages** (✗)
  - Should only see PUBLIC on summary-of-publications page (✗)
  - Can see all publications in admin pages for deletion via requireRole (✓)
  - Must remove lines 34-37 to fix

- [x] **AC10:** Public users only PUBLIC
  - Implemented in service.ts line 30-32

**Acceptance Criteria Status:** 9/10 met (AC9 has critical security bug)

---

## Next Steps

### Must Fix Before Deployment (Critical)
- [ ] **Remove lines 34-37** from `canAccessPublication()` in service.ts (SECURITY BUG)
- [ ] Create 403.njk error template in libs/web-core/src/views/errors/
- [ ] Fix type safety issues (remove `as any` assertions)
- [ ] Add E2E test verifying Local/CTSC admins only see PUBLIC on summary page

### Should Fix (High Priority)
- [ ] Add audit logging for access denials
- [ ] Implement structured logging instead of console.error
- [ ] Optimize duplicate database queries in middleware
- [ ] Fix hard-coded error message in remove-list-confirmation

### Nice to Have (Suggestions)
- [ ] Add E2E tests for different user roles
- [ ] Implement caching for list type lookups
- [ ] Add rate limiting for authorisation endpoints
- [ ] Enhance JSDoc documentation
- [ ] Consider database-level filtering for performance

### Testing Required
- [ ] Manual testing as unauthenticated public user
- [ ] Manual testing as B2C verified user
- [ ] Manual testing as CFT IDAM verified user with provenance matching
- [ ] Manual testing as System Admin
- [ ] **Manual testing as Local Admin on summary-of-publications (should only see PUBLIC)**
- [ ] **Manual testing as CTSC Admin on summary-of-publications (should only see PUBLIC)**
- [ ] Manual testing as Local/CTSC Admin on admin delete pages (should see all)
- [ ] Test direct URL access to restricted publications
- [ ] Test 403 error page rendering once created
- [ ] Accessibility testing on new error pages

---

## Overall Assessment

**Status:** NEEDS CHANGES (Critical Security Bug)

The core authorisation logic is well-designed, thoroughly tested, and follows security best practices. However, there is a **critical security vulnerability** in AC9 implementation:

**Critical Issues:**
1. **Security Bug:** Lines 34-37 in `canAccessPublication()` allow Local/CTSC admins to see PRIVATE and CLASSIFIED publications on the public summary-of-publications page
2. Missing 403 error template will cause runtime errors
3. Type safety compromised with `as any` usage

The fix for issue #1 is straightforward: remove lines 34-37. Admin pages use `requireRole` middleware and don't rely on `canAccessPublication()`, so this change will not affect admin functionality.

Once the security bug is fixed, the missing 403 template is created, and type safety issues are addressed, the implementation will be production-ready. The test coverage is excellent and demonstrates careful consideration of edge cases and security scenarios.

**After fixes, this will satisfy all 10 acceptance criteria.**

---

**Reviewed by:** AI Code Reviewer
**Date:** 2025-12-01
**Ticket:** VIBE-247
