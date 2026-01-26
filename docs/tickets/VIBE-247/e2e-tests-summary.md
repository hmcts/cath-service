# E2E Tests for Publication Authorisation (VIBE-247)

## Overview
Created comprehensive end-to-end tests to verify role-based and provenance-based authorization for publications based on sensitivity levels.

**Test File:** `e2e-tests/tests/publication-authorisation.spec.ts`

## Test Coverage

### 1. Unauthenticated Users (PUBLIC access only)
- ✅ Should only see PUBLIC publications
- ✅ Should not see CLASSIFIED Civil and Family publications
- ✅ Should redirect to sign-in or show 403 when trying to directly access CLASSIFIED publications

### 2. CFT IDAM Authenticated Users (VERIFIED role with CFT provenance)
- ✅ Should see PUBLIC, PRIVATE, and CLASSIFIED CFT publications
- ✅ Should be able to access CLASSIFIED Civil and Family Daily Cause List
- ✅ Should see PRIVATE publications
- ✅ Should maintain access after navigation and page reload
- ✅ Should lose access to CLASSIFIED publications after logout

### 3. Provenance-based Filtering for CLASSIFIED Publications
- ✅ CFT user should see CFT CLASSIFIED publications
- ✅ Should verify CLASSIFIED publications match user provenance (no 403 errors)

### 4. Edge Cases and Error Handling
- ✅ Should handle missing sensitivity level (defaults to CLASSIFIED)
- ✅ Should show appropriate error when accessing restricted publication directly
- ✅ Should handle invalid locationId gracefully

### 5. Accessibility Compliance
- ✅ Authenticated summary page should be accessible
- ✅ All publication links should have accessible text

## Test Scenarios

### Scenario 1: Unauthenticated User Journey
```
1. Navigate to /summary-of-publications?locationId=3
2. Verify only PUBLIC publications are visible
3. Verify CLASSIFIED publications are filtered out
4. Try to directly access CLASSIFIED publication URL
5. Verify 403/404 error or redirect to sign-in
```

### Scenario 2: CFT Verified User Journey
```
1. Login with CFT IDAM credentials
2. Navigate to /summary-of-publications?locationId=3
3. Verify CFT user sees more publications than public user
4. Click on Civil and Family Daily Cause List (CLASSIFIED CFT)
5. Verify access is granted (no 403 error)
6. Navigate away and back
7. Verify access persists
8. Logout
9. Verify access is revoked
```

### Scenario 3: Provenance Matching
```
1. Login as CFT user (provenance: "CFT")
2. Navigate to summary page
3. Verify CFT CLASSIFIED publications are visible
4. Click on CFT publication
5. Verify successful access (no error)
6. Verify Crime CLASSIFIED publications are NOT visible (different provenance)
```

## Test Data Requirements

### Location ID 3
- Should have publications with different sensitivity levels:
  - PUBLIC publications (visible to all)
  - PRIVATE publications (visible to verified users)
  - CLASSIFIED publications with CFT provenance (visible to CFT users only)

### Test Accounts
- **CFT_VALID_TEST_ACCOUNT**: CFT IDAM account with VERIFIED role and CFT provenance
- **CFT_VALID_TEST_ACCOUNT_PASSWORD**: Password for CFT test account

### Artefact IDs
- Tests use actual artefactIds from the database
- One specific test uses: `a4f06ae6-399f-4207-b676-54f35ad908ed` (from debug logs)

## Running the Tests

```bash
# Run all E2E tests
yarn test:e2e

# Run only publication authorization tests
yarn test:e2e publication-authorisation

# Run with UI mode for debugging
yarn test:e2e --ui publication-authorisation
```

## Environment Variables Required

```bash
# CFT IDAM credentials
CFT_VALID_TEST_ACCOUNT=pip-cft-valid-test-account@hmcts.net
CFT_VALID_TEST_ACCOUNT_PASSWORD=<password>

# Enable CFT IDAM
ENABLE_CFT_IDAM=true
```

## Test Results Expected

### Before Fix (Security Bug):
- ❌ CFT users would NOT see CLASSIFIED Civil and Family publications
- ❌ Provenance mismatch (`"CFT"` vs `"CFT_IDAM"`)
- ❌ Tests would fail

### After Fix:
- ✅ CFT users CAN see CLASSIFIED Civil and Family publications
- ✅ Provenance matching works correctly (`"CFT"` === `"CFT"`)
- ✅ All tests should pass

## Integration with Existing Tests

These new E2E tests complement the existing test suite:

1. **Unit Tests** (`libs/publication/src/authorisation/*.test.ts`)
   - Test individual functions
   - Test access logic in isolation
   - 72 tests covering all scenarios

2. **E2E Tests** (this file)
   - Test full user journey
   - Test authentication flow integration
   - Test actual publication filtering in UI
   - ~20 tests covering real-world scenarios

## Accessibility Considerations

All E2E tests verify:
- Publications are accessible to screen readers
- Links have meaningful text
- No accessibility violations for authenticated users
- Error messages are clear and bilingual

## Known Limitations

1. Tests assume CFT IDAM is configured and available
2. Tests require specific test data in database (locationId=3 with mixed sensitivity publications)
3. Some tests check for flexible error handling (403/404/sign-in redirect) as implementation may vary

## Future Enhancements

Potential additions for comprehensive coverage:
- [ ] E2E tests for CRIME IDAM users (when available)
- [ ] E2E tests for Local/CTSC admin users (SSO)
- [ ] E2E tests for System Admin users
- [ ] Cross-provenance blocking tests (CFT user trying to access CRIME CLASSIFIED)
- [ ] Performance tests for filtering large publication lists

## References

- Implementation: `libs/publication/src/authorisation/service.ts`
- Middleware: `libs/publication/src/authorisation/middleware.ts`
- Unit Tests: `libs/publication/src/authorisation/*.test.ts`
- Ticket: VIBE-247
- Security Fix: Provenance mismatch (`CFT_IDAM` → `CFT`)
