# Implementation Tasks — #1222 Mobile testing: Set up devices for Playwright tests

## Implementation Tasks

- [ ] Re-run the descriptor check against the installed Playwright version and confirm all six keys
      resolve and which engine each defaults to (expected: `Pixel 5` chromium; `iPhone 12`,
      `iPhone 15`, `iPad Pro 11`, `Galaxy S III`, `Galaxy S III landscape` webkit)
- [ ] Add `MOBILE_GREP`, `MOBILE_TEST_IGNORE` and `MOBILE_DEVICES` consts at the top of
      `e2e-tests/playwright.config.ts` (consts-at-top per CLAUDE.md module ordering)
- [ ] Add the descriptor-existence guard that throws on an unknown key
- [ ] Replace the single-project array with the `chromium` project plus the six mapped device
      projects, each spreading `devices[name]` with `grep` and `testIgnore`
- [ ] Set `browserName: "chromium"` on `Galaxy S III` and `Galaxy S III landscape` so the engine
      matches the AC's "(Chrome)" label (see plan §0 Correction 1 / Q1)
- [ ] Add the config comment recording that `Galaxy S III` runs a modern engine despite its legacy
      Android 4.0 user agent, so a green run is not read as legacy-Android support
- [ ] Pin `test:e2e` in `e2e-tests/package.json` to `--project=chromium` so the PR gate's scope and
      runtime are unchanged
- [ ] Add `test:e2e:mobile` script naming all six projects
- [ ] Update `playwright:install` to `npx playwright install chromium webkit`
- [ ] Add `webkit` to the install in `.github/workflows/job.e2e-test.yml:78`
- [ ] Add `webkit` to both install steps in `.github/workflows/nightly.yml` (lines 154 and 158)
- [ ] Add a `chromium-webkit` browser-set segment to the nightly cache `key`, `restore-keys` prefix
      and save key (lines 148, 149, 165) so adding WebKit misses the existing cache
- [ ] Read `libs/web-core/src/locales/cy.ts` and confirm the real accessible name of the
      Welsh→English toggle link before writing the spec selector
- [ ] Create `e2e-tests/tests/mobile-device-matrix.spec.ts` — one test tagged `@mobile @nightly`,
      role-based selectors, no-horizontal-overflow assertion, English and Welsh H1, axe scan in both
      languages, `tap()` on touch-capable projects, ending on `/view-option`
- [ ] Document the local commands (one-off install, desktop run, full matrix, single device by name)
      in the E2E docs
- [ ] Run `npx playwright test --list` from `e2e-tests/` and confirm the journey appears once per
      device project (6 device entries)
- [ ] Verify S1: `yarn test:e2e` executes the same test count and spec set as `master`, chromium only
- [ ] Verify S2: `test:e2e:mobile` passes on all six devices; the two Galaxy projects report
      360×640 and 640×360
- [ ] Verify S3: a deliberately bogus descriptor key throws rather than silently defaulting
- [ ] Verify S4: resolved engine per project matches the plan's §4 table
- [ ] Verify S6: journey completes via `tap()` on `Pixel 5` and `iPhone 15`, and still completes when
      forced down the `click()` path
- [ ] Verify S7: inject an over-wide element on the landing page and confirm the overflow assertion
      fails on `Galaxy S III`, then revert
- [ ] Verify S8: axe passes on all six devices in both languages; raise any genuine violation as its
      own defect ticket rather than widening `DISABLED_RULES` in `e2e-tests/utils/axe-helper.ts`
- [ ] Verify S9: force a failure on `iPad Pro 11` only; confirm JUnit/HTML report name the device and
      the artefact carries its trace, screenshot and video
- [ ] Verify S10: no `tests/api/**` spec runs in any device project; all still run in `chromium`
- [ ] Verify S5: run nightly manually twice (cold then warm cache); both pass with no "Executable
      doesn't exist" on any WebKit project
- [ ] Run `yarn lint` and `yarn format`; no new Biome findings
- [ ] Record in the PR description the resolved Playwright version, the per-project engine split, and
      the §1.1 limits of emulation so a green matrix is not reported as "tested on iPhone"
- [ ] Raise follow-up tickets: retag/fix existing specs for mobile, BrowserStack real-device
      integration, mobile visual regression
