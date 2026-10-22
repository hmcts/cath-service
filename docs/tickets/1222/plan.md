# Technical Plan — #1222 Mobile testing: Set up devices for Playwright tests

**Type:** Test infrastructure (no application code, no user-facing change)
**Template source:** `n/a` — no rendered page or list-type view is created by this ticket.
**Related:** PUB-2032 (framework/tooling comparison for mobile testing)

---

## 0. Facts verified against this repo before planning

The `@spec` comment on the issue is largely sound but contains **one material error** and one
unnecessary risk flag. Both were checked against the pinned Playwright version actually installed in
this workspace (`playwright-core` 1.62.1, matching `e2e-tests/package.json:28`):

```
Pixel 5                  viewport 393x727    defaultBrowserType chromium   isMobile true  hasTouch true
iPhone 12                viewport 390x664    defaultBrowserType webkit     isMobile true  hasTouch true
iPhone 15                viewport 393x659    defaultBrowserType webkit     isMobile true  hasTouch true
iPad Pro 11              viewport 834x1194   defaultBrowserType webkit     isMobile true  hasTouch true
Galaxy S III             viewport 360x640    defaultBrowserType webkit     isMobile true  hasTouch true
Galaxy S III landscape   viewport 640x360    defaultBrowserType webkit     isMobile true  hasTouch true
```

**Correction 1 — the Galaxy S III descriptors are WebKit, not Chromium.** The spec comment's §2 and
§3.1 both state the engine split is "2 Chromium projects + 4 WebKit projects" with both Galaxy
projects on Chromium. That is wrong. `devices["Galaxy S III"].defaultBrowserType === "webkit"`,
because the descriptor's user agent is the Android 4.0 *stock browser* (`AppleWebKit/534.30`), not
Chrome. Left unaddressed, the two projects the AC labels "(Chrome)" would run WebKit, and the
delivered matrix would be 1 Chromium + 5 WebKit — not what the AC asks for. See §6 Q1; the planned
default is an explicit `browserName: "chromium"` override on those two projects.

**Correction 2 — no Playwright version bump is needed.** The spec flags `iPhone 15` as "the only key
with real availability risk". It is present in 1.62.1. All six keys resolve. Do not bump
`@playwright/test`; the `verify-descriptors` task below is retained only as a guard that will catch
drift on a future upgrade.

Other claims confirmed as accurate and carried through:

| Claim | Confirmed at |
|---|---|
| Single `chromium` project today | `e2e-tests/playwright.config.ts:28-33` |
| PR E2E timeout 15 minutes | `.github/workflows/job.e2e-test.yml:21` |
| PR installs chromium only | `.github/workflows/job.e2e-test.yml:78` |
| Nightly timeout 120 minutes | `.github/workflows/nightly.yml:18` |
| Nightly installs chromium only, twice | `.github/workflows/nightly.yml:154,158` |
| Nightly cache key excludes browser set | `.github/workflows/nightly.yml:148,149,165` |
| `--grep-invert "@nightly"` gates the PR run | `e2e-tests/package.json:7` |
| CLI args pass straight through to Playwright | `e2e-tests/run-with-credentials.js:119,145` |
| `target-size` globally disabled | `e2e-tests/utils/axe-helper.ts:6` |
| API specs exist and open no page | `e2e-tests/tests/api/*.spec.ts` (5 files) |

One further correction to the spec's reference spec sample: it selects the language toggle with the
CSS locator `.app-phase-banner__language`. The repo rule is role-first selectors, and the existing
suite already does this — `e2e-tests/tests/landing-page.spec.ts:60` uses
`getByRole("link", { name: "Welsh (Cymraeg)" })`. Use that.

---

## 1. Technical Approach

Register the six AC devices as Playwright **projects** driven entirely by built-in device
descriptors, and install WebKit in both CI pipelines so the five WebKit projects can execute.

Three decisions shape the whole change:

**Device projects select on a `@mobile` tag, not on the whole suite.** The 15-minute PR budget
(`job.e2e-test.yml:21`) is the binding constraint. Six projects × ~290 existing tests is ~2,030
executions and blows that budget many times over. Setting `grep: /@mobile/` at project level means
a device project runs only tests that opt in. Project-level `grep` is ANDed with the CLI
`--grep`/`--grep-invert` already used by the package scripts, so the existing filtering keeps working
untouched.

**Spread the descriptor; hardcode nothing.** Every project is `use: { ...devices[key] }`. Viewport,
device scale factor, user agent, `isMobile` and `hasTouch` all come from Playwright and stay correct
across upgrades. The single deliberate exception is the `browserName` override on the two Galaxy
projects (§0 Correction 1), which is an AC-conformance decision, not a hardcoded device
characteristic.

**Scope is configuration and provisioning only.** This ticket does not retag or fix the existing
~290 specs for narrow viewports. One reference journey proves the matrix executes green on all six
devices and gives follow-up tickets a pattern to copy. Widening coverage is a separate, unbounded
piece of work — see §1.2.

### 1.1 What emulation does and does not buy

This needs recording in the config and in the closing comment, because a green mobile matrix will
otherwise be read as "tested on iPhone":

- A device descriptor is a user agent, a viewport, a scale factor and touch flags. It is not the
  device. `devices["iPhone 15"]` runs Playwright's bundled WebKit on a Linux runner — not iOS
  Safari. Media codecs, font rendering, `100vh` behaviour under the iOS dynamic toolbar, and PDF
  handling all differ. Real-iOS-only bugs still get through. That gap is what BrowserStack is for.
- The `Galaxy S III` descriptor's UA claims Android 4.0 / stock browser, but the engine executing
  the test is current. It proves nothing about legacy-browser JavaScript support. Its value is
  solely as the narrowest (360×640) and shortest (640×360) viewports in the matrix. A comment in the
  config must say so.

### 1.2 Explicitly out of scope (follow-up tickets)

- Tagging the existing journey specs `@mobile` and fixing what that surfaces at narrow viewports.
- BrowserStack real-device integration (the PUB-2032 recommendation) — a complementary layer.
- Visual regression / screenshot comparison on mobile.
- Mobile coverage of `tests/sso`, `tests/cft-idam`, `tests/crime-idam`, which redirect to
  third-party identity providers whose own pages behave differently under WebKit and are outside
  this service's control.

---

## 2. Implementation Details

### 2.1 `e2e-tests/playwright.config.ts`

Replace the single-project array at lines 28-33. Add above `defineConfig`:

```typescript
// Device projects select on @mobile so adding the matrix does not multiply the
// existing ~290 desktop tests across six more configurations.
const MOBILE_GREP = /@mobile/;

// API specs drive HTTP directly and never open a page, so running them per
// device is pure duplicated cost.
const MOBILE_TEST_IGNORE = ["**/api/**"];

// Device names are the Playwright descriptor keys verbatim, so a JUnit failure
// names the device exactly as the acceptance criteria does and --project="iPhone 15"
// matches what a developer reads in the report. Deliberate exception to the
// repo's kebab-case convention: these are external identifiers, not filenames.
//
// browserName is overridden where the descriptor default does not match the
// engine named in the acceptance criteria. The Galaxy S III descriptors default
// to webkit because their user agent is the Android 4.0 stock browser; the AC
// asks for Chrome, so chromium is forced.
//
// The Galaxy S III user agent claims Android 4.0, but the engine under test is
// current Chromium. Keep these projects for the 360x640 and 640x360 viewports
// only — a green run proves nothing about legacy Android support.
const MOBILE_DEVICES = [
  { name: "Pixel 5" },
  { name: "iPhone 12" },
  { name: "iPhone 15" },
  { name: "iPad Pro 11" },
  { name: "Galaxy S III", browserName: "chromium" },
  { name: "Galaxy S III landscape", browserName: "chromium" }
] as const;
```

and inside `defineConfig`:

```typescript
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] }
    },
    ...MOBILE_DEVICES.map(({ name, ...overrides }) => ({
      name,
      use: { ...devices[name], ...overrides },
      grep: MOBILE_GREP,
      testIgnore: MOBILE_TEST_IGNORE
    }))
  ],
```

The existing `chromium` project stays byte-identical and first in the array.

**Descriptor guard.** Test Scenario 3 asks whether a wrong key fails loudly. Playwright spreads
`undefined` to an empty object, so a typo yields a silently-default desktop-ish project that reports
green while testing nothing mobile. Add a throw so that cannot happen — this is the one piece of
logic in the config, and it is cheap:

```typescript
for (const { name } of MOBILE_DEVICES) {
  if (!devices[name]) {
    throw new Error(`Unknown Playwright device descriptor: "${name}". Check the key against the installed Playwright version.`);
  }
}
```

### 2.2 `e2e-tests/package.json` scripts

```json
"test:e2e": "node run-with-credentials.js --project=chromium --grep-invert \"@nightly\"",
"test:e2e:all": "node run-with-credentials.js",
"test:e2e:mobile": "node run-with-credentials.js --grep @mobile --project=\"Pixel 5\" --project=\"iPhone 12\" --project=\"iPhone 15\" --project=\"iPad Pro 11\" --project=\"Galaxy S III\" --project=\"Galaxy S III landscape\"",
"playwright:install": "npx playwright install chromium webkit"
```

Pinning `test:e2e` to `--project=chromium` is what guarantees the PR gate's scope and runtime are
unchanged. `run-with-credentials.js:119,145` forwards `process.argv.slice(2)` to `playwright test`
verbatim, so that script needs no change. Root `package.json:16` delegates to the workspace script,
so it needs no change either.

### 2.3 CI — install and cache WebKit

**`.github/workflows/job.e2e-test.yml:78`:**

```yaml
        run: yarn workspace e2e-tests playwright install --with-deps chromium webkit
```

WebKit is installed here even though the PR run is pinned to `chromium`, so that a `--project`
override while debugging a mobile failure on a branch does not fail with a missing executable.

**`.github/workflows/nightly.yml:143-165`** — add `webkit` to both install steps (lines 154 and 158)
**and bust the cache key**. This is the trap in the change: the key is
`${{ runner.os }}-playwright-${{ hashFiles('e2e-tests/package.json') }}`, and because no Playwright
version bump is needed (§0 Correction 2), `hashFiles` returns the same hash as the existing
chromium-only entry. The restore would hit that stale cache, the install step is skipped on
`cache-hit == 'true'`, and every WebKit project fails with "Executable doesn't exist". Add a literal
browser-set segment to `key` **and** to `restore-keys` (lines 148, 149) and to the save key (line
165):

```yaml
          # The browser set is part of the key: adding a browser must miss the
          # cache, otherwise the conditional install below is skipped and the
          # new browser is never downloaded.
          key: ${{ runner.os }}-playwright-chromium-webkit-${{ hashFiles('e2e-tests/package.json') }}
          restore-keys: |
            ${{ runner.os }}-playwright-chromium-webkit-
```

If `restore-keys` keeps the old `-playwright-` prefix, a prefix match against the chromium-only
entry reintroduces the same failure. Both must move together.

WebKit on Linux needs its own system libraries, so `webkit` must be named in `--with-deps` (line
154) and in `install-deps` (line 158). `job.e2e-test.yml` runs on the self-hosted
`azure-nonprod` runner group (`job.e2e-test.yml:19-20`), where `--with-deps` shells out to `apt-get`
and needs sudo. If that fails on the runner image, the fix is to add WebKit's dependencies to the
runner image — **not** to drop WebKit from the matrix, which would delete four of the six AC devices.

### 2.4 Reference journey — `e2e-tests/tests/mobile-device-matrix.spec.ts`

One test, per the repo's one-test-per-journey rule. Tagged `@mobile @nightly`: `@nightly` keeps it
out of the PR run via the existing `--grep-invert`, `@mobile` is what the device projects select on,
and `test:e2e:all` at `nightly.yml:172` picks it up across all seven projects.

```typescript
import { expect, test } from "@playwright/test";
import { axeCheck } from "../utils/axe-helper.js";

test.describe("Mobile device matrix", () => {
  test("user can start the view-option journey on a mobile device @mobile @nightly", async ({ page, isMobile, viewport }) => {
    await page.goto("/");

    // Layout must not overflow horizontally at any viewport in the matrix.
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(scrollWidth).toBeLessThanOrEqual((viewport?.width ?? 0) + 1);

    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Court and tribunal hearings");

    const enResults = await axeCheck(page).analyze();
    expect(enResults.violations).toEqual([]);

    // The language toggle lives in the phase banner, not the collapsible
    // service navigation, so it stays reachable at every breakpoint.
    await page.getByRole("link", { name: "Welsh (Cymraeg)" }).click();
    await expect(page).toHaveURL(/lng=cy/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Gwrandawiadau llys a thribiwnlys");

    const cyResults = await axeCheck(page).analyze();
    expect(cyResults.violations).toEqual([]);

    await page.getByRole("link", { name: /English/ }).click();
    await expect(page).toHaveURL(/lng=en/);

    // Touch input rather than mouse on touch-capable devices.
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

Each choice is a constraint, not style:

- **`tap()` requires `hasTouch`.** All six descriptors set it, so `tap()` is valid on every device
  project. The `isMobile` branch exists only so the same spec still passes under
  `--project=chromium`, where `hasTouch` is false.
- **Do not assert Tab-key focus order on links here.** `landing-page.spec.ts:46-49` uses an explicit
  `.focus()` (safe everywhere), but `language-toggle-service-navigation.spec.ts:51-62` tabs until a
  *link* receives focus. WebKit does not move focus to links on Tab unless full keyboard access is
  enabled, so that assertion fails on all five WebKit projects. This is the main reason the existing
  specs are not simply retagged `@mobile` in this ticket.
- **The service navigation `Menu` toggle only appears when navigation items exist**
  (`libs/web-core/src/views/components/service-navigation.njk:3-21` builds `navigationItems` from
  `navigation.verifiedItems`, populated only for signed-in users by
  `libs/auth/src/middleware/navigation.ts:23-30`). This journey is unauthenticated, so there is no
  collapsed menu to expand. A future authenticated mobile journey must click `Menu` before nav links
  are reachable at narrow widths — worth a shared helper in `e2e-tests/utils/` when that lands.
- **`axeCheck` already disables `target-size`** (`utils/axe-helper.ts:6`), which would otherwise be
  the loudest rule at these viewports. `scrollable-region-focusable` is the next most likely
  violation once wide tables (SJP press list, cause lists) enter the matrix — do not pre-emptively
  disable it; let the follow-up ticket decide on evidence.
- **The locale-switch-back selector needs confirming at implementation time.** The Welsh-to-English
  link's accessible name comes from the `cy` locale's `language.switch` value, not from a hardcoded
  `"English"`. Read `libs/web-core/src/locales/cy.ts` and use the real string.

### 2.5 Documentation

Add local-run commands to the E2E docs (device names contain spaces and are easy to get wrong):

```bash
yarn workspace e2e-tests playwright install chromium webkit   # one-off
yarn workspace e2e-tests test:e2e                             # desktop only, as today
yarn workspace e2e-tests test:e2e:mobile                      # all six devices
yarn workspace e2e-tests run test:e2e:all --project="iPhone 15" --headed   # one device, visible
```

### 2.6 Not touched

No application code, template, stylesheet, controller, locale file, API endpoint or Prisma schema
changes. No Welsh content to add — nothing user-facing changes. The only visible output difference
is a project-name prefix in the Playwright HTML report and the JUnit XML, e.g.
`[Pixel 5] › mobile-device-matrix.spec.ts › …`.

---

## 3. Error Handling & Edge Cases

| Case | Handling |
|---|---|
| Descriptor key typo or removed on upgrade | Explicit `throw` in the config (§2.1) — fails loudly rather than silently defaulting to a desktop-ish viewport and reporting green |
| Stale nightly Playwright cache | Browser-set segment in `key` **and** `restore-keys` **and** the save key (§2.3) |
| WebKit missing locally | `playwright:install` covers both browsers; Playwright's own error names the fix; documented in §2.5 |
| `--with-deps` lacks sudo on `azure-nonprod` | Add WebKit deps to the runner image; do not drop WebKit |
| PR runtime regression | `test:e2e` pinned to `--project=chromium`; Scenario 1 verifies executed test count is unchanged |
| API specs duplicated per device | `testIgnore: ["**/api/**"]` on device projects only; they still run in `chromium` |
| Galaxy landscape silently equal to portrait | Scenario 2 asserts the two report different viewports (360×640 vs 640×360) |
| A real mobile axe violation | Record as its own defect ticket. Do **not** widen `DISABLED_RULES` in `utils/axe-helper.ts` — its one existing exclusion is justified by a specific third-party defect, and blanket mobile exclusions would hide exactly the bug class this ticket exists to find |

---

## 4. Acceptance Criteria Mapping

| AC device | Descriptor key | Project name | Engine as delivered | Verification |
|---|---|---|---|---|
| Pixel 5 (Chrome) | `Pixel 5` | `Pixel 5` | chromium (descriptor default) | `--list` shows the journey; passes |
| iPhone 12 (Safari) | `iPhone 12` | `iPhone 12` | webkit (default) | ditto |
| iPhone 15 (Safari) | `iPhone 15` | `iPhone 15` | webkit (default) | ditto |
| iPad Pro 11 (Safari) | `iPad Pro 11` | `iPad Pro 11` | webkit (default) | ditto |
| Galaxy S III (Chrome) | `Galaxy S III` | `Galaxy S III` | chromium (**override**, §0) | ditto + viewport 360×640 |
| Galaxy S III landscape (Chrome) | `Galaxy S III landscape` | `Galaxy S III landscape` | chromium (**override**) | ditto + viewport 640×360 |

Broader criteria:

- [ ] Six projects declared, named exactly as the AC names them.
- [ ] Every project spreads `devices["<key>"]`; no viewport, scale factor, user agent or touch flag
      hardcoded. `browserName` on the two Galaxy projects is the only override, commented with its
      reason.
- [ ] Existing `chromium` desktop project unchanged and still present.
- [ ] `npx playwright test --list` from `e2e-tests/` shows the reference journey once per device
      project (6 device entries), confirming the projects resolve and the `@mobile` grep matches.
- [ ] All six descriptor keys resolve under the Playwright version committed in
      `e2e-tests/package.json`, which stays pinned at `1.62.1` with no `^`/`~`.
- [ ] `job.e2e-test.yml` and both `nightly.yml` install steps install `chromium` and `webkit`.
- [ ] Nightly cache `key`, `restore-keys` prefix and save key all carry a browser-set segment.
- [ ] Cold-cache and warm-cache nightly runs both complete with no "Executable doesn't exist".
- [ ] PR E2E job executes the same test count as `master` and stays inside 15 minutes, with the
      timeout value unchanged.
- [ ] Nightly runs the reference journey on all six devices inside 120 minutes.
- [ ] No device project runs anything under `e2e-tests/tests/api/`.
- [ ] `mobile-device-matrix.spec.ts` exists, tagged `@mobile @nightly`, passing on all six device
      projects plus `chromium`; asserts no horizontal overflow, the English and Welsh H1, and a clean
      axe scan in both languages; completes via `tap()` on touch-capable projects.
- [ ] `junit-results.xml` distinguishes results per device, so `dorny/test-reporter` and
      `EnricoMi/publish-unit-test-result-action` name the failing device.
- [ ] A deliberate single-device failure produces a trace, screenshot and video attributable to that
      device in the `playwright-test-results` artefact.
- [ ] `yarn lint` and `yarn format` pass with no new Biome findings.
- [ ] Config comment records that `Galaxy S III` runs a modern engine despite its legacy UA.
- [ ] Local run instructions documented, including targeting a single device by name.

---

## 5. Test Scenarios

The deliverable is infrastructure, so most verification is a manual run before merge. The reference
journey is the only new automated test — deliberately one test, per the one-per-journey rule.

**S1 — Previous behaviour preserved (the regression guard; most important).** Run `yarn test:e2e` on
the branch and on `master`. Executed test count and spec-file set must match, and only the
`chromium` project may appear. The change is unacceptable if it alters the PR gate's scope or
runtime.

**S2 — All six devices resolve and execute.** `yarn workspace e2e-tests test:e2e:mobile`. All six
projects appear by their exact AC names, each runs the reference journey, all six pass. The two
Galaxy projects must report different viewports (360×640 / 640×360) — identical viewports mean a
wrong or `undefined` landscape key.

**S3 — A wrong descriptor key fails loudly.** Temporarily add a project using `devices["iPhone 99"]`
and confirm the §2.1 guard throws rather than quietly producing a default desktop viewport. A
silently-defaulting project would report green while testing nothing mobile.

**S4 — Engine per project matches the AC.** Assert the resolved engine per project (Playwright
reports it, or read `browserName` from the resolved config). `Pixel 5`, `Galaxy S III` and
`Galaxy S III landscape` must be chromium; the three Apple projects webkit. This scenario exists
specifically to catch §0 Correction 1 regressing.

**S5 — WebKit provisioning survives a warm cache.** Trigger nightly manually twice. Run 1 misses the
cache, installs both browsers, saves under the new key. Run 2 hits the cache, skips install, runs
`install-deps chromium webkit`, and still passes every WebKit project. Pass on run 1 and failure on
run 2 is the exact symptom of the cache-key problem in §2.3.

**S6 — Touch input genuinely drives the journey.** On `Pixel 5` and `iPhone 15`, confirm the journey
completes via `tap()`. Then force the mouse path and confirm it still completes — proving the
`isMobile` branch is a convenience, not a dependency, and the test is not asserting on touch-only
behaviour the service does not have.

**S7 — The narrow-viewport assertion actually bites.** On `Galaxy S III` (360px), temporarily inject
a fixed-width element wider than the viewport into the landing page template and confirm the
horizontal-overflow assertion fails. Revert. An assertion that cannot fail is worse than none.

**S8 — Accessibility scan is meaningful at mobile viewports.** Axe passes on all six devices in both
languages. Any violation is recorded as its own defect ticket, not suppressed in
`utils/axe-helper.ts` (see §3). A genuine mobile accessibility violation is a *successful* outcome
for this ticket.

**S9 — Per-device diagnostics are attributable.** Force a failure on `iPad Pro 11` only. JUnit XML
and the HTML report must name that device, and the artefact must contain its trace, screenshot and
video. The other five projects still report pass.

**S10 — API tests excluded from device projects.** No test under `e2e-tests/tests/api/` executes in
any device project; all of them still execute in `chromium`.

---

## 6. CLARIFICATIONS NEEDED

**Q1 (blocking on the AC's wording, non-blocking on delivery) — `Galaxy S III` runs WebKit by
default, but the AC says "(Chrome)". Which wins?**
Verified: `devices["Galaxy S III"].defaultBrowserType === "webkit"` in Playwright 1.62.1, because
the descriptor's UA is the Android 4.0 stock browser, not Chrome. Three options:
(a) force `browserName: "chromium"` on both Galaxy projects so the engine matches the AC — **planned
default**, matrix becomes 3 Chromium + 3 WebKit;
(b) accept the descriptor default, giving 1 Chromium + 5 WebKit and two projects whose engine
contradicts their AC label;
(c) drop the two Galaxy projects and substitute a current narrow Android descriptor.
Recommendation: (a). It satisfies the AC literally and keeps the two narrowest/shortest viewports,
which is the only real value these descriptors carry. Proceeding with (a) unless told otherwise.

**Q2 — Should the device matrix run on PRs at all, or nightly only?**
Planned: nightly only, with the PR script pinned to `--project=chromium`, because the PR job has a
15-minute timeout and 4 workers. If mobile regressions must block merges, the PR job needs either a
raised timeout or a separate parallel job — both are outside this ticket's scope as written. Confirm
nightly-only is acceptable.

**Q3 — Is one reference journey the expected deliverable, or should existing specs be retagged
`@mobile` now?**
Planned: one journey. Retagging the existing ~290 tests is a suite-wide refactor of unknown size and
will surface real narrow-viewport failures (and WebKit Tab-focus failures, §2.4) that need fixing in
the application, not in the test config. Recommend a follow-up ticket per spec area. Confirm.

**Q4 — Who owns the WebKit dependency install on the self-hosted `azure-nonprod` runner?**
`--with-deps` runs `apt-get` and needs sudo (`job.e2e-test.yml:19-20`). If the runner image lacks
WebKit's system libraries and the job cannot escalate, this needs a platform/runner-image change
before four of the six AC devices can execute in CI. Is there a known-good precedent for installing
WebKit on that runner group, or should a runner-image ticket be raised in parallel?

**Q5 — Does "added to CaTH tests" mean the devices are merely *available*, or that a stated set of
journeys passes on them?**
This plan delivers availability plus one proving journey. If the AC intends broader journey coverage,
the device list needs pairing with a journey list, and Q3 becomes blocking rather than advisory.
