# #1222: Mobile testing: Set up devices for Playwright tests

**State:** OPEN
**Assignees:** None
**Author:** OgechiOkelu
**Labels:** None
**Created:** 2026-10-22T15:51:45Z
**Updated:** 2026-10-22T16:05:05Z

## Description

**PROBLEM STATEMENT**
Following the investigation for integrating mobile testing into CaTH E2E pipelines specifically using Browser Stack in https://hmcts.atlassian.net/browse/PUB-2032, this ticket is created to set up mobile devices for Playwright. Information on the frameworks and other tools studied can be found here: https://hmcts.atlassian.net/wiki/display/PUBH/PUB-2032+-+Comparing+testing+frameworks+and+tools+for+mobile+testing 

**AS A** Service
**I WANT** to integrate mobile devices for Playwright into CaTH E2E pipelines
**SO THAT** these devices can be integrated in the mobile testing in CaTH E2E pipelines

**ACCEPTANCE CRITERIA**
The following devices are added to CaTH tests: 
Pixel 5 (Chrome)
iPhone 12 (Safari)
iPhone 15 (Safari)
iPad Pro 11 (Safari)
Galaxy S III (Chrome)
Galaxy S III landscape (Chrome)
 
https://playwright.dev/docs/emulation

## Comments

### Comment by OgechiOkelu on 2026-10-22T15:58:59Z

@spec enhancement 

### Comment by hmctsclaudecode on 2026-10-22T16:04:27Z

# Mobile testing: Set up devices for Playwright tests

**Issue:** #1222
**Type:** Enhancement (test infrastructure)
**Related:** PUB-2032 (framework/tooling comparison for mobile testing)

## 1. Current State

The Playwright E2E suite runs against exactly one browser configuration. `e2e-tests/playwright.config.ts:28-33` declares a single project:

```typescript
projects: [
  {
    name: "chromium",
    use: { ...devices["Desktop Chrome"] }
  }
]
```

`devices["Desktop Chrome"]` gives a 1280×720 viewport, `isMobile: false`, `hasTouch: false`, and a desktop Chrome user agent. Nothing in the repository emulates a phone or tablet — a search for `isMobile`, `devices[`, or `browserstack` across the codebase returns only this one config file.

Consequences today:

* **No small-viewport coverage.** Every one of the ~290 tests across `e2e-tests/tests/**` asserts against the desktop layout. GOV.UK Frontend changes layout substantially below 641px (`govuk-grid-column-two-thirds` becomes full width, the service navigation collapses behind a `Menu` toggle button when navigation items are present — see `libs/web-core/src/views/components/service-navigation.njk:18-26`, wide tables such as the SJP press list and cause lists begin to overflow). None of this is exercised.
* **No WebKit coverage at all.** Both CI paths install Chromium only: `.github/workflows/job.e2e-test.yml:78` runs `playwright install --with-deps chromium`, and `.github/workflows/nightly.yml:154,158` do the same. Safari is the only browser available on iOS, so the service's largest mobile audience segment is completely untested.
* **No touch-input coverage.** `hasTouch: false` means `tap()` paths, touch target overlap, and touch-only interaction are never exercised. The one accessibility rule that would catch undersized touch targets, `target-size`, is globally disabled in `e2e-tests/utils/axe-helper.ts:6` because of a known GOV.UK footer issue — so even the desktop runs cannot surface it.
* **Mobile regressions reach STG undetected.** The PR pipeline (`stage.e2e.yml` → `job.e2e-test.yml`) and the nightly pipeline (`nightly.yml`) are the only automated gates, and both are desktop-only.

PUB-2032 concluded that real-device cloud testing (BrowserStack) is the longer-term direction. This ticket is the cheaper, prerequisite step: Playwright's built-in device descriptor emulation, which needs no external account, no new vendor spend, and no change to how tests are written.

### Pipeline constraints the change has to live inside

| Constraint | Location | Value |
|---|---|---|
| PR E2E job timeout | `job.e2e-test.yml:21` | 15 minutes |
| PR E2E workers | `playwright.config.ts:13` | 4 in CI |
| PR E2E retries | `playwright.config.ts:12` | 2 in CI |
| Nightly job timeout | `nightly.yml:18` | 120 minutes |
| PR E2E test selection | `e2e-tests/package.json:7` | `--grep-invert "@nightly"` |
| Nightly test selection | `e2e-tests/package.json:8` | everything |
| Playwright version | `e2e-tests/package.json:28` | `1.62.1` (pinned) |

The 15-minute PR budget is the binding constraint. Adding six device projects that each run the full suite would multiply executions from ~290 to ~2,030 and blow that budget several times over.

## 2. Proposed Improvement

**I want to** register the six devices named in the acceptance criteria as Playwright projects in `e2e-tests/playwright.config.ts`, using Playwright's built-in device descriptors, and install the WebKit browser in both CI pipelines so the Safari-based devices can actually run.

**So that** mobile and tablet layout, touch-input and WebKit-engine regressions are caught by an automated gate rather than by manual spot-checks or by users, and so that subsequent tickets have a device matrix to attach journey tests to without further infrastructure work.

### Scope boundary

This ticket delivers **device configuration and browser provisioning only**. It does not rewrite the existing 290 tests to be device-aware, and it does not attempt to make the whole suite green on every device. Attempting that here would turn an infrastructure ticket into a suite-wide refactor of unknown size.

What is in scope:

* Six device projects wired into the Playwright config, spreading the descriptors rather than hand-rolling viewports.
* WebKit installed and cached in the PR and nightly pipelines.
* A `@mobile` tag convention plus one reference journey spec proving the matrix executes green on all six devices.
* Project-level exclusions so device projects skip tests that are meaningless or known-broken on them (API tests, WebKit tab-order assertions).
* Scripts so developers can target a single device locally.

What is explicitly **out** of scope, to be raised as follow-up tickets:

* Tagging the existing journey specs `@mobile` and fixing whatever they surface on narrow viewports.
* BrowserStack real-device integration (the PUB-2032 recommendation) — emulation is a different, complementary layer.
* Visual regression / screenshot comparison on mobile.
* Mobile coverage of the SSO, CFT IDAM and Crime IDAM login journeys (`tests/sso`, `tests/cft-idam`, `tests/crime-idam`), which redirect to third-party identity providers whose own pages behave differently under WebKit and are outside this service's control.

### Honest limits of emulation

The spec should not oversell what this buys, because the distinction matters when someone later reads a green pipeline:

* **A device descriptor is a user agent string, a viewport, a device scale factor and touch flags. It is not the device.** `devices["iPhone 15"]` runs Playwright's bundled WebKit on a Linux CI runner. That is not iOS Safari — it differs in media codecs, font rendering, scroll/viewport-unit behaviour (`100vh` vs the iOS dynamic toolbar), and PDF handling. Bugs specific to real iOS Safari will still get through. That gap is what BrowserStack is for.
* **`Galaxy S III` is a legacy descriptor.** Its user agent claims Android 4.0.4 / Chrome 18, but the engine executing the test is current Chromium. It therefore proves nothing about old-browser JavaScript support; its only real value is as a 360×640 portrait and 640×360 landscape viewport check — the narrowest and shortest configurations in the matrix. It is worth keeping for exactly that reason, but the limitation should be recorded in a comment in the config so nobody mistakes a green run for legacy-Android support.
* **`Pixel 5` and `Galaxy S III` run Chromium; the three iPhone/iPad descriptors and nothing else run WebKit.** The practical split is 2 Chromium projects + 4 WebKit projects (`Galaxy S III` and `Galaxy S III landscape` are both Chromium).

## 3. Modification Details

* **Visual Changes:** None. This is a test-infrastructure change — no application template, stylesheet, controller or locale file is touched, so there is no user-facing copy and no Welsh content to add. The only visible output difference is in the Playwright HTML report and the JUnit XML, where results gain a project name prefix (for example `[Pixel 5] › landing-page.spec.ts › …`).

* **Functional Changes:** Six new Playwright projects, WebKit provisioning in two workflows, a `@mobile` tag convention, one reference spec, and local-run scripts. Detailed below.

### 3.1 Device matrix

The six devices from the acceptance criteria map to these Playwright descriptor keys. These keys are the exact strings to index `devices` with — they are case- and space-sensitive:

| AC device | Descriptor key | Engine | Orientation | Notes |
|---|---|---|---|---|
| Pixel 5 (Chrome) | `Pixel 5` | chromium | portrait | Current-generation Android reference |
| iPhone 12 (Safari) | `iPhone 12` | webkit | portrait | Older iOS form factor still in wide use |
| iPhone 15 (Safari) | `iPhone 15` | webkit | portrait | Current iOS form factor |
| iPad Pro 11 (Safari) | `iPad Pro 11` | webkit | portrait | Tablet breakpoint (lands above the 641px GOV.UK breakpoint) |
| Galaxy S III (Chrome) | `Galaxy S III` | chromium | portrait | Narrowest viewport in the matrix |
| Galaxy S III landscape (Chrome) | `Galaxy S III landscape` | chromium | landscape | Shortest viewport in the matrix |

**Verification step before writing the config** — do not take the table above on trust, and do not hardcode viewport numbers. Confirm every key exists in the pinned Playwright version:

```bash
yarn install
node -e "const {devices}=require('playwright-core'); \
  ['Pixel 5','iPhone 12','iPhone 15','iPad Pro 11','Galaxy S III','Galaxy S III landscape'] \
  .forEach(n => console.log(n.padEnd(24), devices[n] ? JSON.stringify({vp:devices[n].viewport, browser:devices[n].defaultBrowserType, mobile:devices[n].isMobile, touch:devices[n].hasTouch}) : 'MISSING'))"
```

`iPhone 15` is the only key with real availability risk — it was added to the descriptor list well after `iPhone 12`. If it reports `MISSING` under the pinned `1.62.1`, the fix is to bump `@playwright/test` in `e2e-tests/package.json` (and keep it pinned, per the repo's pinned-dependency rule) rather than to hand-write a substitute descriptor. Record the resolved version in the PR description.

### 3.2 Playwright config changes

Replace the single-project array in `e2e-tests/playwright.config.ts:28-33`. Each device project spreads its descriptor so viewport, scale factor, user agent, `isMobile` and `hasTouch` all come from Playwright and stay correct across upgrades.

```typescript
// Device projects run only tests tagged @mobile, so adding the matrix does not
// multiply the existing ~290 desktop tests across six more configurations.
const MOBILE_GREP = /@mobile/;

// API specs drive HTTP directly and never open a page, so running them per
// device is pure duplicated cost.
const MOBILE_TEST_IGNORE = ["**/api/**"];

const MOBILE_DEVICES = [
  "Pixel 5",
  "iPhone 12",
  "iPhone 15",
  "iPad Pro 11",
  "Galaxy S III",
  // The Galaxy S III descriptor's user agent claims Android 4 / Chrome 18, but
  // the engine under test is current Chromium. Keep it for the 360x640 and
  // 640x360 viewports only; it proves nothing about legacy browser support.
  "Galaxy S III landscape"
] as const;
```

```typescript
projects: [
  {
    name: "chromium",
    use: { ...devices["Desktop Chrome"] }
  },
  ...MOBILE_DEVICES.map((device) => ({
    name: device,
    use: { ...devices[device] },
    grep: MOBILE_GREP,
    testIgnore: MOBILE_TEST_IGNORE
  }))
]
```

Project naming uses the descriptor key verbatim (`Pixel 5`, not `pixel-5`) so that a failure in the JUnit report names the device exactly as the acceptance criteria does, and so `--project="iPhone 15"` matches the thing a developer reads in the report. This is a deliberate exception to the repo's kebab-case file/directory convention — it is an external identifier, not a filename.

`grep` at project level is ANDed with any CLI `--grep`/`--grep-invert`, which is what makes the tagging scheme below work without touching the existing scripts' filtering.

### 3.3 Keeping the PR pipeline inside 15 minutes

Device projects must not run on every PR. Two switches do this:

1. `e2e-tests/package.json` — pin the PR script to the desktop project:

```json
"test:e2e": "node run-with-credentials.js --project=chromium --grep-invert \"@nightly\"",
"test:e2e:all": "node run-with-credentials.js",
"test:e2e:mobile": "node run-with-credentials.js --grep @mobile --project=\"Pixel 5\" --project=\"iPhone 12\" --project=\"iPhone 15\" --project=\"iPad Pro 11\" --project=\"Galaxy S III\" --project=\"Galaxy S III landscape\"",
"playwright:install": "npx playwright install chromium webkit"
```

`run-with-credentials.js:119,145` forwards `process.argv.slice(2)` straight through to `playwright test`, so no change is needed in that script.

2. Tag the reference journey `@mobile @nightly`. The `@nightly` tag keeps it out of the PR run via the existing `--grep-invert`; the `@mobile` tag is what the device projects select on. `test:e2e:all` in `nightly.yml:172` then picks it up across all seven projects.

Net effect on the PR pipeline: zero additional test executions, zero additional minutes, plus one extra browser download on cache miss. Net effect on nightly: one journey × 6 devices, a few minutes inside a 120-minute budget.

### 3.4 CI: install and cache WebKit

Four of the six devices need WebKit, which neither pipeline installs today.

**`.github/workflows/job.e2e-test.yml:77-78`** — add `webkit` to the install so the browser is present even though the PR run currently only exercises `chromium`. Installing it here keeps a `--project` override (for debugging a mobile failure on a branch) from failing with a missing-executable error:

```yaml
      - name: Install Playwright browsers
        run: yarn workspace e2e-tests playwright install --with-deps chromium webkit
```

**`.github/workflows/nightly.yml:143-165`** — add `webkit` to both install steps **and bust the cache key**. This second part is the trap: the key is `${{ runner.os }}-playwright-${{ hashFiles('e2e-tests/package.json') }}`, and if the Playwright version does not change, `hashFiles` returns the same hash as the existing chromium-only cache entry. The restore step would hit that stale cache, the conditional install step would be skipped on `cache-hit == 'true'`, and every WebKit project would fail with "Executable doesn't exist". Add a literal browser-set segment to the key so the set of installed browsers is part of the cache identity:

```yaml
      - name: Restore Playwright browsers cache
        uses: actions/cache/restore@v5
        id: playwright-cache
        with:
          path: ~/.cache/ms-playwright
          # The browser set is part of the key: adding a browser must miss the
          # cache, otherwise the conditional install below is skipped and the
          # new browser is never downloaded.
          key: ${{ runner.os }}-playwright-chromium-webkit-${{ hashFiles('e2e-tests/package.json') }}
          restore-keys: |
            ${{ runner.os }}-playwright-chromium-webkit-

      - name: Install Playwright browsers
        if: steps.playwright-cache.outputs.cache-hit != 'true'
        run: yarn workspace e2e-tests run playwright install chromium webkit --with-deps

      - name: Install Playwright system dependencies (if cached)
        if: steps.playwright-cache.outputs.cache-hit == 'true'
        run: yarn workspace e2e-tests run playwright install-deps chromium webkit

      - name: Save Playwright browsers cache
        if: steps.playwright-cache.outputs.cache-hit != 'true'
        uses: actions/cache/save@v5
        with:
          path: ~/.cache/ms-playwright
          key: ${{ runner.os }}-playwright-chromium-webkit-${{ hashFiles('e2e-tests/package.json') }}
```

The `restore-keys` prefix must change in lockstep with `key`, or a prefix match against an old chromium-only entry reintroduces the same failure.

WebKit on Linux needs its own system libraries, which is why `--with-deps` / `install-deps` must name `webkit` too. On the self-hosted `azure-nonprod` runner group used by `job.e2e-test.yml:19-20`, `--with-deps` runs `apt-get` and needs sudo; if that fails on the runner image, the fallback is to install WebKit's dependencies in the runner image rather than to drop WebKit from the matrix.

### 3.5 Reference journey spec

One new spec proves the matrix executes, and gives following tickets a pattern to copy. Put it at `e2e-tests/tests/mobile-device-matrix.spec.ts`, one test per the repo's "minimum number of tests, one per journey" rule:

```typescript
import { expect, test } from "@playwright/test";
import { axeCheck } from "../utils/axe-helper.js";

// Runs once per device project (projects grep on @mobile); @nightly keeps it out
// of the PR run, which is pinned to --project=chromium.
test.describe("Mobile device matrix", () => {
  test("user can start the view-option journey on a mobile device @mobile @nightly", async ({ page, isMobile, viewport }) => {
    await page.goto("/");

    // Layout must not overflow horizontally at any viewport in the matrix.
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(scrollWidth).toBeLessThanOrEqual((viewport?.width ?? 0) + 1);

    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Court and tribunal hearings");

    // Language toggle lives in the phase banner, not the collapsible nav, so it
    // stays reachable at every breakpoint.
    const languageToggle = page.locator(".app-phase-banner__language");
    await expect(languageToggle).toBeVisible();
    await languageToggle.click();
    await page.waitForURL(/lng=cy/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Gwrandawiadau llys a thribiwnlys");

    const welshResults = await axeCheck(page).analyze();
    expect(welshResults.violations).toEqual([]);

    await page.locator(".app-phase-banner__language").click();
    await page.waitForURL(/lng=en/);

    const results = await axeCheck(page).analyze();
    expect(results.violations).toEqual([]);

    // Touch input rather than mouse click on touch-capable devices.
    const continueButton = page.getByRole("button", { name: "Continue" });
    if (isMobile) {
      await continueButton.tap();
    } else {
      await continueButton.click();
    }
    await expect(page).toHaveURL(/\/view-option/);
  });
});
```

Notes on the choices above, each of which is a real constraint rather than style:

* **`tap()` needs `hasTouch`.** All six descriptors set it, so `tap()` is valid on every device project; the `isMobile` branch exists only so the same spec still passes if someone runs it under `--project=chromium`.
* **Do not assert Tab-key focus order on links in this spec.** `tests/landing-page.spec.ts:46-49` uses an explicit `.focus()` (safe everywhere), but `tests/language-toggle-service-navigation.spec.ts:51-62` tabs until a *link* receives focus. WebKit does not move focus to links on Tab unless full keyboard access is enabled, so that assertion would fail on all four Safari projects. This is the main reason the existing specs are not simply tagged `@mobile` as part of this ticket.
* **The service navigation `Menu` toggle only appears when navigation items exist** (`service-navigation.njk:3-21` builds `navigationItems` from `navigation.verifiedItems`, which `libs/auth/src/middleware/navigation.ts:23-30` populates only for signed-in users). The journey above is unauthenticated, so there is no collapsed menu to expand. Any future authenticated mobile journey must click the `Menu` button before nav links are reachable at narrow widths — worth a shared helper in `e2e-tests/utils/` when that ticket lands.
* **`axeCheck` already disables `target-size`** (`utils/axe-helper.ts:6`), which would otherwise be the loudest rule at these viewports. Expect `scrollable-region-focusable` to be the next most likely violation once wide list-type tables (SJP press list, cause lists) are brought into the mobile matrix; do not pre-emptively disable it here, let the follow-up ticket decide with real evidence.

### 3.6 Developer documentation

Add to `e2e-tests/README` material (or the existing E2E section of the docs) the local commands, since the device names contain spaces and are easy to get wrong:

```bash
yarn workspace e2e-tests playwright install chromium webkit   # one-off
yarn workspace e2e-tests test:e2e                             # desktop only, as today
yarn workspace e2e-tests test:e2e:mobile                      # all six devices
yarn workspace e2e-tests run test:e2e:all --project="iPhone 15" --headed   # one device, visible
```

## 4. Acceptance Criteria

**Device registration**

* [ ] `e2e-tests/playwright.config.ts` declares a Playwright project for each of the six devices, named exactly `Pixel 5`, `iPhone 12`, `iPhone 15`, `iPad Pro 11`, `Galaxy S III`, `Galaxy S III landscape`.
* [ ] Every device project obtains its settings by spreading `devices["<key>"]`; no viewport, device scale factor, user agent or touch flag is hardcoded anywhere in the config.
* [ ] The existing `chromium` desktop project is unchanged and still present.
* [ ] `npx playwright test --list` run from `e2e-tests/` shows the reference journey once per device project (6 device entries), confirming the projects resolve and the `@mobile` grep matches.
* [ ] The descriptor-availability check in §3.1 reports a descriptor for all six keys under the Playwright version committed in `e2e-tests/package.json`; if the version had to be bumped, it remains pinned (no `^` or `~`).

**Browser provisioning**

* [ ] `job.e2e-test.yml` and both install steps in `nightly.yml` install `chromium` and `webkit`.
* [ ] The nightly Playwright browser cache key and its `restore-keys` prefix both include a browser-set segment, so adding WebKit misses the existing cache.
* [ ] A nightly run started from a cold cache and a second run started from a warm cache both complete with no "Executable doesn't exist" error on any WebKit project.

**Pipeline cost**

* [ ] The PR E2E job (`job.e2e-test.yml`) executes the same number of tests as before the change — device projects do not run there.
* [ ] The PR E2E job still finishes inside its 15-minute timeout, with no increase in the timeout value.
* [ ] The nightly job runs the reference journey on all six devices and finishes inside its 120-minute timeout.
* [ ] No device project runs anything under `e2e-tests/tests/api/`.

**Reference journey**

* [ ] `e2e-tests/tests/mobile-device-matrix.spec.ts` exists, is tagged `@mobile @nightly`, and passes on all six device projects plus `chromium`.
* [ ] The journey asserts no horizontal overflow, the English and Welsh H1, and a clean axe scan in both languages, on every device.
* [ ] The journey completes via touch input (`tap()`) on the touch-capable projects.

**Reporting and diagnostics**

* [ ] `e2e-tests/junit-results.xml` distinguishes results per device, so the `dorny/test-reporter` and `EnricoMi/publish-unit-test-result-action` output in the nightly and PR workflows names the failing device.
* [ ] A deliberately failing assertion on a single device produces a trace, screenshot and video attributable to that device in the uploaded `playwright-test-results` artefact.

**Hygiene**

* [ ] `yarn lint` and `yarn format` pass; Biome reports no new findings.
* [ ] A comment in the config records that the `Galaxy S III` descriptor runs modern Chromium despite its legacy user agent, so a green run is not mistaken for legacy-Android support.
* [ ] Local run instructions for the device matrix are documented, including how to target a single device by name.

## 5. Impact on Existing Users

**No impact on service users.** No application code, template, stylesheet or content file changes, so there is no behaviour change to announce and no user re-training. Nothing ships to STG as a result of this ticket beyond the unchanged application.

**Impact on the development team** — this is where the real cost sits, and it needs stating rather than glossing:

* **A new local setup step.** Anyone who runs `yarn test:e2e:mobile` or passes `--project="iPhone 15"` without first running `playwright install chromium webkit` gets an "Executable doesn't exist" error. The `playwright:install` script is updated to cover both browsers, but developers with an existing `~/.cache/ms-playwright` will not be prompted — the error message is explicit about the fix, and the documented commands in §3.6 cover it.
* **WebKit is a ~100MB additional download** per developer machine and per cold CI cache. The nightly cache bust means one slower nightly run after merge.
* **A second failure surface in nightly.** A nightly failure can now mean "broken on iPhone 12 only", which is a more nuanced triage than today's single-browser pass/fail. The report names the device, so triage starts from the project name in the JUnit output rather than from a reproduction attempt.
* **New specs need a tagging decision.** Authors of future E2E tests must decide whether a journey is `@mobile`. Untagged journeys keep today's behaviour exactly (desktop only), so the default is safe and the convention is opt-in — this is deliberate, so the change cannot silently slow anyone's PR.
* **A known-limitations expectation to manage.** Because emulation is not a real device, a green mobile matrix must not be reported upward as "the service is tested on iPhone". The §2 limits should be carried into the ticket's closing comment and into whatever BrowserStack ticket follows from PUB-2032.

**Announcement needed:** a short note to the team covering the new install step, the `@mobile` tag convention, and the fact that nightly failures now carry a device name. No stakeholder or user-facing announcement.

## 6. Test Scenarios

This ticket's deliverable is test infrastructure, so "testing" here means verifying the configuration behaves as specified. Each scenario is a manual verification run before the PR merges; the reference journey itself is the only new automated test.

**Scenario 1 — Previous behaviour is preserved (regression guard).**
Run `yarn test:e2e` from the repo root on a branch with the change. Confirm the executed test count and the set of spec files match a run of the same command on `master`, and that only the `chromium` project appears in the output. This is the most important scenario: the change is unacceptable if it alters the PR gate's scope or runtime.

**Scenario 2 — All six devices resolve and execute.**
Run `yarn workspace e2e-tests test:e2e:mobile`. Confirm all six projects appear in the output by their exact AC names, that each runs the reference journey, and that all six pass. Confirm the two Galaxy S III projects report different viewports (360×640 portrait, 640×360 landscape) — identical viewports would mean the landscape descriptor key was wrong or silently `undefined`.

**Scenario 3 — A wrong descriptor key fails loudly, not silently.**
Temporarily add a project using a non-existent key such as `devices["iPhone 99"]` and confirm the run errors rather than quietly falling back to a default desktop viewport. If it does fall back silently, add an explicit guard in the config that throws when a descriptor lookup returns `undefined`, and cover the real keys with it. This matters because a silently-default project would report green while testing nothing mobile.

**Scenario 4 — WebKit provisioning survives a warm cache.**
Trigger the nightly workflow manually twice. The first run should miss the Playwright cache, install both browsers, and save under the new key. The second should hit the cache, skip the install step, run `install-deps chromium webkit`, and still pass every WebKit project. A pass on run 1 and a failure on run 2 is the specific symptom of the cache-key problem described in §3.4.

**Scenario 5 — Touch input genuinely drives the journey.**
On `Pixel 5` and `iPhone 15`, confirm the journey completes through `tap()`. Then temporarily force the mouse path (`click()`) and confirm the journey still completes — proving the `isMobile` branch is a convenience, not a dependency, and that the test is not accidentally asserting on touch-only behaviour the service does not have.

**Scenario 6 — Narrow-viewport layout assertion actually bites.**
With `Galaxy S III` (360px, the narrowest in the matrix), temporarily inject a fixed-width element wider than the viewport into the landing page template and confirm the horizontal-overflow assertion fails. Revert. An assertion that cannot fail is worse than no assertion.

**Scenario 7 — Accessibility scan is meaningful at mobile viewports.**
Confirm the axe scan passes on all six devices in both English and Welsh. If any device reports violations, record them in the ticket rather than widening `DISABLED_RULES` in `utils/axe-helper.ts` — that file's single existing exclusion is justified by a specific third-party defect, and adding blanket mobile exclusions here would hide exactly the class of bug this ticket exists to find. A genuine mobile accessibility violation is a successful outcome for this ticket and should become its own defect ticket.

**Scenario 8 — Per-device diagnostics are attributable.**
Force a failure on `iPad Pro 11` only. Confirm the JUnit XML and the HTML report name that device, and that the uploaded artefact contains a trace, screenshot and video for it. Confirm the other five projects still report pass.

**Scenario 9 — API tests are excluded from device projects.**
Confirm no test under `e2e-tests/tests/api/` executes in any device project, and that those tests still execute normally in `chromium`.


### Comment by OgechiOkelu on 2026-10-22T16:05:05Z

@plan 
