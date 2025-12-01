# VIBE-298: Configure Nightly Pipeline and Add Test Guidance to CLAUDE.md

## Technical Approach

### 1. Nightly Pipeline Configuration

Create a GitHub Actions workflow that runs comprehensive tests nightly, including tests tagged for nightly-only execution. PR workflows will exclude nightly tests.

**Strategy:**
- Schedule to run at 2:00 AM UTC
- Run full test suite including nightly-tagged tests
- PR workflows explicitly exclude nightly tests via Playwright tag filtering
- Generate comprehensive coverage reports

### 2. CLAUDE.md Testing Documentation Enhancement

Add minimal, focused guidance on E2E testing best practices. Keep updates specific and actionable.

**Strategy:**
- Add E2E Testing section with practical examples
- Document test data management patterns
- Emphasize accessibility testing integrated into journey tests (not separate)
- Document correct selector usage
- Set clear coverage expectations
- Keep it concise - no over-documentation

## Implementation Details

### File Structure

```
.github/workflows/
├── nightly.yml           # New nightly scheduled pipeline
├── e2e.yml               # Update to exclude nightly tests

CLAUDE.md                 # Add focused E2E testing section
```

### Nightly Pipeline Workflow (nightly.yml)

**Trigger Configuration:**
- Schedule: `cron: '0 2 * * *'` (2:00 AM UTC daily)
- Manual trigger: `workflow_dispatch`

**Jobs:**
1. **Lint Job**: Run linting across all packages
2. **Unit/Integration Tests Job**: Run all tests with coverage
3. **E2E Tests Job**: Run full Playwright suite (including `@nightly` tagged tests)
4. **Coverage Report Job**: Generate consolidated coverage reports

**Key Configuration:**
```yaml
# Run all tests including nightly
npx playwright test
```

### PR E2E Workflow Update (e2e.yml)

**Modification Required:**
Update existing e2e.yml to exclude nightly tests:

```yaml
# Exclude nightly tests in PR runs
npx playwright test --grep-invert "@nightly"
```

### CLAUDE.md Testing Documentation Updates

Add new section under "Testing Strategy" (after line 344):

**New Content to Add:**

#### E2E Testing with Playwright (Detailed Section)

**Test Organization:**
- Location: `e2e-tests/`
- Naming: `*.spec.ts`
- Tag nightly-only tests with `@nightly` in test title

**Test Patterns (Sequential in Each Test):**
1. Test content and functionality
2. Test Welsh translation (same journey)
3. Test accessibility inline (not separate)
4. Test keyboard navigation
5. Test responsive behavior

**Example Pattern:**
```typescript
test('user can complete journey @nightly', async ({ page }) => {
  // 1. Test main journey
  await page.goto('/start');
  await page.getByRole('button', { name: 'Start now' }).click();

  // 2. Test Welsh
  await page.getByRole('link', { name: 'Cymraeg' }).click();
  expect(await page.getByRole('heading', { level: 1 })).toContainText('Dechrau nawr');

  // 3. Test accessibility inline
  const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
  expect(accessibilityScanResults.violations).toEqual([]);

  // 4. Test keyboard navigation
  await page.keyboard.press('Tab');
  await page.keyboard.press('Enter');

  // 5. Continue journey...
});
```

**Correct Selectors (Priority Order):**
1. `getByRole()` - Preferred for accessibility
2. `getByLabel()` - For form inputs
3. `getByText()` - For specific text
4. `getByTestId()` - Last resort only

**DO NOT Test:**
- Font sizes
- Background colors
- Margins/padding
- Any visual styling
- UI design aspects

**Test Data Management:**
- Use global-setup.ts for reference data seeding
- Use test-specific data creation in tests
- Clean up test data in global-teardown.ts

**Coverage Expectations:**
- Business logic: >80%
- E2E tests: Cover critical user journeys
- Accessibility: Test inline with journeys (not separately)

## Error Handling & Edge Cases

### Nightly Pipeline

1. **Service Startup Failures**: Use existing health checks
2. **Flaky Tests**: Retries configured (`retries: 2`)
3. **Timeouts**: Extended for nightly runs (30 min vs 15 min for PRs)

### PR Workflow Changes

1. **Tag Filtering**: Ensure `--grep-invert "@nightly"` works correctly
2. **Backward Compatibility**: Existing tests without tags continue to run in PRs

## Acceptance Criteria Mapping

### 1. Configure Nightly Pipeline

**AC:** Set up a nightly CI pipeline to run automatically at a scheduled time

**Implementation:**
- Create `.github/workflows/nightly.yml`
- Configure cron: `'0 2 * * *'`
- Run all tests including `@nightly` tagged tests
- Update e2e.yml to exclude `@nightly` tests in PRs

**Verification:**
- Nightly pipeline runs at scheduled time
- All tests execute (including nightly-tagged)
- PR pipeline excludes nightly-tagged tests
- Coverage reports generated

### 2. Update CLAUDE.md with Test Guidance

**AC:** Add clear instructions on how to write e2e tests with new guidance

**Implementation:**
- Add E2E Testing section with practical patterns
- Document correct selector usage (getByRole priority)
- Show integrated accessibility testing pattern
- Document what NOT to test (UI styling)
- Include nightly test tagging guidance

**Verification:**
- Section explains E2E patterns clearly
- Selector priority documented
- Accessibility integration shown
- Code examples accurate

**AC:** Add clear instructions on how to handle test data

**Implementation:**
- Document global-setup.ts pattern
- Explain test-specific data creation
- Reference cleanup patterns

**Verification:**
- Test data patterns documented
- Examples reference actual files

**AC:** Add clear instructions on expectations for test coverage

**Implementation:**
- Set target: >80% business logic
- Document what should/shouldn't be tested
- Include coverage commands

**Verification:**
- Coverage targets clear
- Guidance actionable

## Implementation Sequence

Execute tasks in this exact order:

1. Create nightly.yml workflow
2. Update e2e.yml to exclude nightly tests
3. Test both workflows locally/manually
4. Update CLAUDE.md with focused E2E guidance
5. Verify documentation accuracy
6. Create PR

## CLARIFICATIONS NEEDED

None - requirements are clear after feedback.
