# VIBE-300: E2E Tests Summary

## Overview

E2E tests created for case subscription functionality following the CLAUDE.md guidelines:
- Minimum number of tests (one per complete user journey)
- Validation, Welsh translation, and accessibility checks inline with each journey
- All tests tagged with @nightly for nightly-only execution

## Test File Location

`/Users/kian.kwa/IdeaProjects/cath-service/e2e-tests/tests/case-subscriptions.spec.ts`

## Test Structure

### 1. Subscribe by Case Name Journey
**Test:** `should complete subscription by case name with validation, Welsh, and accessibility @nightly`

**Coverage:**
- Navigate from account home to subscription management
- Add email subscription flow
- Subscription method selection page with validation
- Case name search page with:
  - Form validation (empty field)
  - Keyboard navigation testing
  - Welsh translation checks
  - Accessibility testing
- Search results page with:
  - Selection validation (at least one case required)
  - Welsh translation
  - Accessibility testing
- Pending subscriptions confirmation
- Subscription confirmed page
- Verify subscription appears in management list

### 2. Subscribe by Case Reference Journey
**Test:** `should complete subscription by case reference with validation, Welsh, and accessibility @nightly`

**Coverage:**
- Navigate to subscription method selection
- Select case reference option
- Case reference search page with:
  - Form validation
  - Welsh translation
  - Accessibility testing
- Search results and selection
- Pending subscriptions and confirmation

### 3. Multiple Search Results Journey
**Test:** `should handle multiple search results selection @nightly`

**Coverage:**
- Search returns multiple results
- Select multiple cases with checkboxes
- Verify multiple cases in pending subscriptions
- Remove one subscription from pending list
- Confirm remaining subscriptions
- Accessibility testing

### 4. No Results Found Journey
**Test:** `should handle no search results with validation and accessibility @nightly`

**Coverage:**
- Search for non-existent case name
- Verify "no results found" error message
- Welsh translation of error message
- Accessibility testing with error state
- Test same flow for case reference search
- Verify error handling on both search types

### 5. View Subscriptions by Case Journey
**Test:** `should view and manage case subscriptions with tabs and accessibility @nightly`

**Coverage:**
- Create a case subscription
- Navigate to subscription management
- Verify tabs (All, By case, By court/tribunal)
- Welsh translation of tabs
- Accessibility testing with tabs
- Click "By case" tab and verify URL parameter
- View case subscriptions table
- Remove case subscription flow
- Verify subscription is removed from list

### 6. Authentication Protection
**Test:** `should require authentication for case subscription pages @nightly`

**Coverage:**
- Test all protected pages redirect to sign-in when not authenticated:
  - /subscription-add
  - /case-name-search
  - /case-name-search-results
  - /case-number-search
  - /case-number-search-results

## Test Data Management

### Setup (beforeEach)
- Creates unique test case data using timestamp and random ID
- Creates test artefact in artefact_search table
- Stores test data in Map keyed by testInfo.testId for parallel execution safety
- Authenticates user with CFT IDAM

### Teardown (afterEach)
- Deletes associated subscriptions
- Deletes test artefact data
- Removes test data from Map

### Parallel Test Safety
- Uses Map with testInfo.testId as key to avoid conflicts
- Generates unique IDs for each test run
- Proper cleanup ensures no data leakage between tests

## Key Testing Patterns

### Inline Validation Testing
All journeys include validation checks within the user flow:
- Empty form submission errors
- Required field validations
- Selection requirement checks

### Inline Welsh Translation Testing
Welsh translation checked at key points in each journey:
- Page headings
- Error messages
- Tab labels
- Form labels

### Inline Accessibility Testing
Accessibility scans performed inline using AxeBuilder:
- Disables "region" rule (project standard)
- Tests at each major page in the journey
- Verifies no violations

### Keyboard Navigation Testing
Tests keyboard interaction where relevant:
- Tab key navigation
- Enter key form submission

## Dependencies

### External Dependencies
- @playwright/test
- @axe-core/playwright
- @hmcts/postgres (for test data management)

### Helper Functions
- loginWithCftIdam from e2e-tests/utils/cft-idam-helpers.js

### Environment Variables
- CFT_VALID_TEST_ACCOUNT
- CFT_VALID_TEST_ACCOUNT_PASSWORD

## Assumptions

### Database Schema
Tests assume VIBE-316 is complete with:
- artefact_search table exists
- Subscription table has caseName and caseNumber columns
- locationId column in artefact_search table

### Pages Exist
Tests assume the following pages are implemented:
- /subscription-management
- /subscription-add
- /case-name-search
- /case-name-search-results
- /case-number-search
- /case-number-search-results
- /pending-subscriptions
- /subscription-confirmed
- /delete-subscription
- /unsubscribe-confirmation

## Running the Tests

```bash
# Run all E2E tests including @nightly tagged tests
yarn test:e2e:all

# Run E2E tests excluding @nightly tests
yarn test:e2e

# Run case subscriptions tests specifically
npx playwright test case-subscriptions.spec.ts

# Run with UI
npx playwright test case-subscriptions.spec.ts --ui

# Run in headed mode for debugging
npx playwright test case-subscriptions.spec.ts --headed
```

## Notes

- All tests are tagged with @nightly as they represent complete user journeys
- Tests follow the principle: one test per complete user journey
- No separate tests for individual validations, Welsh, or accessibility - all inline
- Tests use proper Playwright selectors (getByRole, getByLabel) for accessibility
- Test data cleanup is robust with try-catch to handle missing data gracefully
