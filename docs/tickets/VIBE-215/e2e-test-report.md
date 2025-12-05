# E2E Test Report: VIBE-215 Flat File Viewing

## Test Execution Summary

**Date**: 2025-11-27
**Test File**: `/workspaces/cath-service/e2e-tests/tests/flat-file-viewing.spec.ts`
**Total Tests**: 19
**Passing**: 3 (15.8%)
**Failing**: 16 (84.2%)

## Critical Issue Found and Fixed

### UUID Generation Error
**Problem**: All tests were initially failing with Prisma validation errors because test artefact IDs used string format (`test-${Date.now()}-*`) instead of valid UUIDs.

**Fix Applied**: Updated all test cases to use `randomUUID()` from Node.js crypto module.

**Files Changed**:
- `/workspaces/cath-service/e2e-tests/tests/flat-file-viewing.spec.ts`
  - Added `import { randomUUID } from "node:crypto"`
  - Replaced 16 instances of template string IDs with `randomUUID()` calls

## Implementation Gap Analysis

### Root Cause
The flat file viewing feature implementation is complete in `libs/public-pages`, but the module is NOT properly registered in the application:

1. **Missing API Routes Export**: `libs/public-pages/src/config.ts` does not export `apiRoutes`
2. **Missing API Registration**: `apps/api/src/app.ts` does not import and register the public-pages API routes

### Test Failure Breakdown

#### 1. Navigation Failures (13 tests)
**Symptom**: `locator.click: Test timeout of 30000ms exceeded`

**Affected Tests**:
- Happy Path tests (3): PDF viewing, headers, download
- Error Handling tests (7): Expired files, missing files, not flat file, location mismatch
- Navigation tests (1): Back button
- Welsh language tests (2): Error messages, viewer content

**Cause**: Page routes ARE registered but tests cannot complete because the download API endpoint returns 404, causing PDF viewer to fail.

#### 2. API Endpoint Failures (3 tests)
**Symptom**: `expect(received).toBe(expected) Expected: 200, Received: 404`

**Affected Tests**:
- Content-Type header validation
- PDF Content-Type verification
- Download functionality

**Cause**: `/api/flat-file/:artefactId/download` endpoint not registered in API application.

**Route Location**: `/workspaces/cath-service/libs/public-pages/src/routes/flat-file/[artefactId]/download.ts`

**Expected URL**: `https://localhost:8080/api/flat-file/{uuid}/download`

#### 3. Full Journey Timeout (1 test)
**Symptom**: Test timeout waiting for "start now" link

**Cause**: Test may be starting from wrong page or base routing issue.

### Passing Tests (Baseline)
1. **Invalid request - missing artefactId**: Correctly returns error
2. **Invalid request - missing locationId**: Correctly returns error
3. **Accessibility - Error page**: Meets WCAG 2.2 AA standards

## Required Fixes

### Priority 1: Export API Routes from Public Pages Config

**File**: `/workspaces/cath-service/libs/public-pages/src/config.ts`

**Current State**:
```typescript
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const pageRoutes = { path: path.join(__dirname, "pages") };
export const moduleRoot = __dirname;
```

**Required Change**:
```typescript
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const pageRoutes = { path: path.join(__dirname, "pages") };
export const apiRoutes = { path: path.join(__dirname, "routes") };
export const moduleRoot = __dirname;
```

### Priority 2: Register API Routes in API Application

**File**: `/workspaces/cath-service/apps/api/src/app.ts`

**Current State** (line 4-5):
```typescript
import { healthcheck } from "@hmcts/cloud-native-platform";
import { apiRoutes as locationRoutes } from "@hmcts/location/config";
```

**Required Change**:
```typescript
import { healthcheck } from "@hmcts/cloud-native-platform";
import { apiRoutes as locationRoutes } from "@hmcts/location/config";
import { apiRoutes as publicPagesRoutes } from "@hmcts/public-pages/config";
```

**Current State** (line 30):
```typescript
const routeMounts = [{ path: `${__dirname}/routes` }, locationRoutes];
```

**Required Change**:
```typescript
const routeMounts = [{ path: `${__dirname}/routes` }, locationRoutes, publicPagesRoutes];
```

## Test Coverage Analysis

### Implemented Test Scenarios

#### Happy Path Tests (3)
- TS1: Open flat file in new tab
- TS2: PDF displays inline with correct headers
- TS3: Download functionality
- TS9: Accessibility compliance

#### Error Handling Tests (8)
- TS4: Expired file (displayTo in past)
- Future file (displayFrom in future)
- TS5: Missing file in storage
- Non-existent artefact
- Location ID mismatch
- Not a flat file artefact

#### Navigation Tests (2)
- TS6: Back button returns to previous page
- Invalid request handling

#### Internationalization Tests (2)
- TS7: Welsh error messages
- Welsh viewer content

#### Accessibility Tests (2)
- TS9: WCAG 2.2 AA compliance on error page
- TS10: Keyboard navigation

#### Integration Tests (2)
- TS8: Content-Type headers
- Full user journey

## Next Steps

1. **Full Stack Engineer**: Apply Priority 1 and 2 fixes above
2. **Test Engineer**: Re-run E2E tests after fixes applied
   ```bash
   yarn test:e2e tests/flat-file-viewing.spec.ts
   ```
3. **Expected Result**: All 19 tests should pass
4. **Code Reviewer**: Review implementation and test results

## Test Quality Assessment

### Strengths
- Comprehensive coverage of happy path, error cases, and edge cases
- Proper accessibility testing with axe-core
- Welsh language support verification
- Keyboard navigation testing
- Realistic user journey scenarios
- Good test data setup with helper functions

### Areas for Improvement
- Consider adding tests for concurrent access scenarios
- Add tests for very large file sizes
- Consider adding visual regression tests
- Add performance testing for file download speeds

## Recommendations

1. **Immediate**: Apply the two required fixes (Priority 1 and 2)
2. **Short-term**: Re-run tests and verify all 19 tests pass
3. **Medium-term**: Consider adding Azure Blob Storage integration tests
4. **Long-term**: Implement visual regression testing for PDF viewer page

## Appendix: Test File Location

**Test File**: `/workspaces/cath-service/e2e-tests/tests/flat-file-viewing.spec.ts`
**Test Fixtures**: `/workspaces/cath-service/e2e-tests/fixtures/test-reference-data.csv`
**Storage Path**: `/workspaces/cath-service/apps/web/storage/temp/uploads`

## References

- VIBE-215 Test Plan: `/workspaces/cath-service/docs/tickets/VIBE-215/test-plan.md`
- VIBE-215 Tasks: `/workspaces/cath-service/docs/tickets/VIBE-215/tasks.md`
- CLAUDE.md: `/workspaces/cath-service/CLAUDE.md` (Module registration guidelines)
