# VIBE-215: Flat File Viewing - Test Implementation Summary

## Overview

Comprehensive E2E tests have been implemented for the flat file viewing functionality using Playwright. The test suite covers all acceptance criteria and user journeys specified in the ticket.

## Test File Location

**File**: `/workspaces/cath-service/e2e-tests/tests/flat-file-viewing.spec.ts`
**Size**: 26KB (699 lines)
**Test Cases**: 31 comprehensive test scenarios

## Test Coverage Summary

### Test Scenarios Implemented

#### TS1: Click Flat File Link Opens in New Tab
- Verifies flat file links have `target="_blank"` attribute
- Verifies `rel="noopener noreferrer"` security attribute
- Tests that clicking the link opens content in a new tab
- Confirms file content is served correctly

#### TS2: PDF Displays Inline in Browser
- Verifies Content-Type header is `application/pdf`
- Verifies Content-Disposition header is set to `inline`
- Confirms PDF viewer object tag is present and visible
- Tests page title displays court name and list type

#### TS3: Download Functionality
- Tests download link is present and functional
- Verifies download attribute is set correctly
- Confirms file can be downloaded via API endpoint

#### TS4: Expired File Shows Error Message
- Tests displayTo date in the past triggers error
- Tests displayFrom date in future triggers error
- Verifies appropriate error messages are displayed
- Confirms error page structure is correct

#### TS5: Missing File Shows Error Message
- Tests artefact exists in database but file missing from storage
- Tests non-existent artefact ID
- Tests locationId mismatch (security check)
- Tests non-flat file artefact accessed via flat file route

#### TS6: Back Button Returns to Previous Page
- Tests back button is present on error pages
- Verifies back button uses `javascript:history.back()`
- Confirms navigation flow through user journey

#### TS7: Welsh Error Messages
- Tests Welsh language support with `?lng=cy` parameter
- Verifies all error messages display in Welsh
- Tests Welsh content in viewer page (download link text)

#### TS8: Content-Type Headers Are Correct
- Tests PDF Content-Type header (`application/pdf`)
- Verifies Cache-Control headers (`public, max-age=3600`)
- Confirms all response headers are set correctly

#### TS9: Accessibility Test on Error Page
- Uses axe-core for WCAG 2.2 AA compliance testing
- Tests error page accessibility
- Tests viewer page accessibility
- Integrated into happy path tests

#### TS10: Keyboard Navigation on Error Page
- Tests Tab key navigation through error page
- Verifies back button is keyboard accessible
- Tests download link can be focused
- Confirms all interactive elements are keyboard accessible

## Test Structure

### Helper Functions

1. **createTestPDFBuffer(content: string): Buffer**
   - Creates valid PDF file buffers for testing
   - Generates minimal PDF structure with test content

2. **createFlatFileArtefact(options): Promise<string>**
   - Creates test artefacts in database
   - Creates corresponding PDF files in storage
   - Supports various test scenarios (expired, missing file, etc.)

3. **navigateToSummaryPage(page, locationId)**
   - Helper for navigating to summary of publications page
   - Simplifies test setup

### Test Organization

Tests are organized into logical describe blocks:

1. **Happy Path - View flat file PDF**
   - Primary user journey tests
   - Includes accessibility testing

2. **Error Handling - Expired Files**
   - Tests for expired artefacts (past displayTo)
   - Tests for future artefacts (future displayFrom)

3. **Error Handling - Missing Files**
   - Tests for missing files in storage
   - Tests for non-existent artefacts
   - Tests for locationId mismatch

4. **Error Handling - Not Flat File**
   - Tests for structured publications accessed via flat file route

5. **Navigation - Back Button**
   - Tests back button functionality
   - Tests navigation flow

6. **Welsh Language Support**
   - Tests Welsh error messages
   - Tests Welsh content in viewer

7. **Accessibility - Error Page**
   - WCAG 2.2 AA compliance testing

8. **Keyboard Navigation**
   - Keyboard accessibility testing

9. **Invalid Requests**
   - Tests for missing parameters

10. **Content-Type Headers for Multiple File Types**
    - Tests for correct MIME types

11. **Full User Journey**
    - Complete end-to-end journey from landing page to viewing flat file

## Key Features

### Database Integration
- Uses Prisma client to create test artefacts
- Properly integrates with existing E2E test setup
- Cleanup handled by global teardown script

### File System Integration
- Creates test PDF files in storage directory
- Properly manages file lifecycle
- Uses same storage path as production code

### Multi-Page Testing
- Tests new tab/window opening
- Tests context switching between pages
- Properly manages multiple browser contexts

### Accessibility Focus
- Integrated axe-core testing in happy path
- WCAG 2.2 AA compliance verification
- Keyboard navigation testing
- Screen reader considerations

### Internationalization
- Welsh language testing throughout
- Verifies language parameter handling
- Tests language-specific content

## Test Patterns Followed

1. **Arrange-Act-Assert Pattern**
   - Clear test structure throughout
   - Easy to understand and maintain

2. **GOV.UK Design System Compliance**
   - Tests verify GOV.UK component usage
   - Checks for proper error summary components
   - Verifies button and link patterns

3. **Security Testing**
   - LocationId mismatch testing (prevents unauthorized access)
   - Path traversal prevention (inherent in implementation)
   - Proper use of security attributes (noopener, noreferrer)

4. **Error State Coverage**
   - Comprehensive error scenario testing
   - User-friendly error message verification
   - Proper HTTP status code handling

## Running the Tests

### Run All E2E Tests
```bash
yarn test:e2e
```

### Run Only Flat File Tests
```bash
yarn test:e2e tests/flat-file-viewing.spec.ts
```

### Run in UI Mode (Debug)
```bash
yarn test:e2e --ui
```

### Run in Headed Mode
```bash
yarn test:e2e --headed
```

## Test Dependencies

- **Playwright**: E2E test framework
- **@axe-core/playwright**: Accessibility testing
- **@hmcts/postgres**: Database integration
- **Node.js fs module**: File system operations

## Notes

### Test Coverage Task
The task "Verify 80-90% test coverage for all new code" remains incomplete because:
- Unit tests for the implementation code need to be written first
- This task should be completed by the full-stack-engineer during implementation
- E2E tests complement but don't replace unit test coverage

### Test Data Cleanup
- Test artefacts are automatically cleaned up by global teardown
- Test files are removed from storage after test run
- Follows existing E2E test patterns for data management

### Known Limitations
1. Cannot test actual file download behavior (browser downloads) in Playwright
   - Instead, tests verify download link and API endpoint responses
2. Cannot test PDF rendering inside browser (browser-specific)
   - Instead, tests verify PDF object tag presence and attributes

## Future Enhancements

Potential improvements for future iterations:

1. **Visual Regression Testing**
   - Add screenshots of viewer page
   - Compare error page layouts

2. **Performance Testing**
   - Measure file load times
   - Test large file handling

3. **Cross-Browser Testing**
   - Enable Firefox and WebKit projects in Playwright config
   - Verify consistent behavior across browsers

4. **Mobile Device Testing**
   - Add mobile viewport testing
   - Verify responsive design

## Acceptance Criteria Coverage

| AC # | Test Coverage |
|------|---------------|
| AC1-4 | User journey tests from landing page to summary page |
| AC4 | New tab opening verified (TS1) |
| AC5 | File serving verified (TS2, TS8) |
| AC6 | Browser rendering verified (TS2) |
| AC7 | Browser controls verified (PDF object tag) |
| AC8 | Page title verified in viewer tests |
| AC9 | Error handling comprehensive (TS4, TS5) |
| AC10 | Accessibility verified (TS9, TS10) |

## Conclusion

All test-engineer tasks for VIBE-215 have been completed:
- ✅ E2E test file created
- ✅ All 10 test scenarios (TS1-TS10) implemented
- ✅ Accessibility testing integrated
- ✅ Welsh language support tested
- ✅ Error scenarios comprehensively covered
- ✅ Keyboard navigation verified
- ⏳ Test coverage verification pending (requires implementation code)

The E2E test suite is ready for use once the implementation code is completed.
