# VIBE-298: Implementation Tasks

## Sequential Implementation Tasks

### Phase 1: Nightly Pipeline Configuration

- [x] Create `.github/workflows/nightly.yml` workflow file
- [x] Configure cron schedule trigger for 2:00 AM UTC: `'0 2 * * *'`
- [x] Add manual workflow_dispatch trigger
- [x] Configure lint job
- [x] Configure unit/integration test job with coverage
- [x] Configure E2E test job to run ALL tests (including @nightly)
- [x] Set 30-minute timeout for nightly jobs
- [x] Configure artifact uploads for coverage reports

### Phase 2: Update PR E2E Workflow

- [x] Update `.github/workflows/e2e.yml` to exclude nightly tests
- [x] Add `--grep-invert "@nightly"` to Playwright command
- [x] Verify existing tests still run in PR workflow

### Phase 3: Test Workflows

- [x] Run manual trigger of nightly workflow
- [x] Verify all jobs complete successfully
- [x] Verify nightly tests execute in nightly workflow
- [x] Verify nightly tests are excluded from PR workflow
- [x] Check coverage reports are generated

### Phase 4: CLAUDE.md Updates (Minimal & Focused)

- [x] Add E2E Testing section after line 344 (after existing Testing Strategy)
- [x] Document test organization and file locations
- [x] Add sequential test pattern example (content → Welsh → accessibility → keyboard)
- [x] Document correct selector priority: getByRole → getByLabel → getByText → getByTestId
- [x] Add "DO NOT Test" section (font sizes, colors, margins, UI styling)
- [x] Add nightly test tagging guidance with @nightly example
- [x] Document test data management (global-setup, test-specific data, cleanup)
- [x] Add coverage expectations (>80% business logic)
- [x] Add Playwright commands: yarn test:e2e

### Phase 5: Verification

- [x] Review CLAUDE.md changes for accuracy
- [x] Verify code examples are correct
- [x] Test that guidance is actionable and clear
- [x] Ensure documentation is concise (not over-documented)

### Phase 6: Finalization

- [ ] Create PR with all changes
- [ ] Verify CI passes (PR workflow excludes nightly tests)
- [ ] Update ticket with completion summary
