# Code Review: Issue #889

## Summary

Two-file, CI-configuration-only change re-enabling Renovate automerge for npm `minor`/`patch`
updates while denying majors, pre-1.0.0 packages, `node`, and all non-npm managers.

`.github/renovate.json` — the functional change — is **correct**. I independently reproduced the
implementer's `applyPackageRules` verification against the shipped config using Renovate 44.0.1
and got **14/14** on the cases that matter (npm minor/patch → `true`; major, `passport` 0.x pin and
`^0.7.0` peer range, node/nvm/regex, terraform, github-actions, helmv3, dockerfile, pin, rollback,
replacement, lockFileMaintenance → `false`). Rule ordering is right, the default-deny posture is
right, and I confirmed the C7 claim about grouped branches directly in the installed package.

The problems are all in the **surrounding scaffolding**, not the policy:

1. The new `job.lint.yml` validator step **never runs on a `renovate.json`-only PR** — the exact
   change class it exists to protect. It does not even run on this PR.
2. The validator is invoked in **global** config mode rather than `--no-global`, contrary to
   Renovate's own CLI guidance, which weakens what it detects.
3. `tasks.md`/`plan.md` state as verified fact that `matchCurrentVersion: "<1.0.0"` "did not deny"
   `passport`. That is **false** — it does deny it. The failure was an artefact of a missing
   `versioning` field in the ad-hoc harness. The shipped config is still the better choice, but for
   a different reason than documented, and the fixture gap undermines the "25/25" claim.
4. The npm allow rule's scope is wider than its own `description` says: it also automerges
   `packageManager` (yarn) and `resolutions` bumps.

Verdict: **NEEDS CHANGES**. The core policy is well-designed and genuinely verified; the fixes
below are small and mostly one-liners.

---

## 🚨 CRITICAL Issues

None. No acceptance criterion is unmet, and there is no path by which a dependency reaches
`master` with *failing* CI (see AC4 and Positive Feedback for the source-level confirmation).

---

## ⚠️ HIGH PRIORITY Issues

### H1. The new validator step never runs for the PRs it is meant to protect

`.github/workflows/job.lint.yml:40-41` is only reachable via `.github/workflows/stage.build.yml:27`,
which is invoked by `workflow.preview.yml:31-34` gated on:

```
if: needs.detect-code-changes.outputs.has-changes == 'true'
paths: "^(yarn\\.lock|apps/|libs/|helm/)"
```

`.github/renovate.json` does not match that pattern. I confirmed against this PR's own diff:

```
This PR's changed files: .github/renovate.json, .github/workflows/job.lint.yml
NO MATCH -> build-stage SKIPPED -> lint job SKIPPED -> validator DOES NOT RUN
```

`workflow.main.yml:17` widens the pattern to include `\.github/workflows/` but still not
`.github/renovate.json`, so a push-to-master config edit does not trigger it either.

**Impact**: plan §2.4 justifies the step as "the only automated protection against a future typo
silently changing the policy". As placed, a future PR that only edits `renovate.json` gets zero
validation. The step will only ever fire incidentally, on unrelated `apps/`/`libs/` PRs.

**Recommendation**: either add `\.github/renovate\.json` to the `detect-code-changes` pattern in
`workflow.preview.yml:29` (and `workflow.main.yml:17`), or — cleaner, since this has nothing to do
with the build stage — give it its own tiny workflow triggered on
`paths: ['.github/renovate.json']`. The second option also removes ~30s of unrelated `npx` download
from every lint run (see S3).

### H2. Validator runs in global config mode, not `--no-global`

`.github/workflows/job.lint.yml:41` runs:

```
npx --yes --package renovate -- renovate-config-validator .github/renovate.json
```

Output confirms the misclassification: `INFO: Validating .github/renovate.json as global config`.
Renovate's own CLI help is explicit about this
(`dist/config-validator.js:98-99`): *"if passing the filename, make sure it's not validating as a
global config — `renovate-config-validator --no-global renovate.json`"*.

Measured difference on this repo's config, injecting global-only options:

| Injected option | global mode (as CI runs it) | `--no-global` |
| --- | --- | --- |
| `allowedCommands` | exit **0** | exit 1 |
| `dryRun` | exit **0** | exit 1 |
| `redisUrl` | exit **0** | exit 1 |

`--no-global` correctly reports *"The `binarySource` option is a global option reserved only for
Renovate's global configuration and cannot be configured within a repository's config file."*

To be fair: the step is **not** useless as written — I verified it still exits 1 on both a typo'd
key (`autoMerge`, `matchUpdateTypess`) and a wrong type (`automerge: "yes-please"`), which is the
primary threat model. But it is validating the file as the wrong type.

**Recommendation**: add `--no-global`. One-word fix.

### H3. `tasks.md` / `plan.md` assert a provably false verification result

`tasks.md:65-69` and `plan.md:486-492` state:

> `matchCurrentVersion: "<1.0.0"` **did not deny** the `passport` update — it resolved to
> `automerge: true`, i.e. the hole was live.

This is wrong. `matchCurrentVersion` resolution in
`dist/util/package-rules/current-version.js` destructures `{ versioning, lockedVersion,
currentValue, currentVersion }` and calls `get(versioning)`. With `versioning` supplied — which the
npm manager always sets to `"npm"` in real runs — it denies correctly:

| harness shape | `currentValue: 0.7.0` | `currentValue: ^0.7.0` |
| --- | --- | --- |
| no `versioning` field | automerge=**true** | automerge=true |
| `versioning: "npm"` | automerge=**false** | automerge=true |
| `versioning: "semver"` | automerge=**false** | automerge=true |

So the harness omitted `versioning` and mis-attributed the resulting non-match to the *rule form*
rather than to its own fixture.

**The shipped `matchCurrentValue` regex is still the right call** — note the third column:
`matchCurrentVersion` genuinely does *not* catch the `^0.7.0` peer ranges in `libs/auth` and
`libs/web-core` even when `versioning` is set, whereas the regex does. Plan §2.3 anticipated exactly
this. The conclusion survives; the stated reason does not.

**Impact**: this is the one place where I could falsify a documented verification claim, and it
means the "25/25 cases passed" figure in `tasks.md:50` was produced by a harness with a known
fixture gap. I re-ran the shipped config with realistic `versioning` values and got 14/14, so no
*shipped* behaviour is affected — but the claim's provenance is weaker than tasks.md presents.

**Recommendation**: correct `tasks.md:65-69` and `plan.md:486-492` to state the real reason (the
regex matches raw range strings, which `matchCurrentVersion` cannot), and note the harness needed
`versioning` set. See S2 — this is a direct argument for committing the harness.

### H4. The npm allow rule automerges `packageManager` and `resolutions`, contrary to its description

`.github/renovate.json:47` describes the rule as applying "equally to dependencies and
devDependencies". The `npm` manager also owns other depTypes. Verified against the shipped config:

| upgrade | resolved `automerge` |
| --- | --- |
| `packageManager` yarn `4.17.0 → 4.18.0` (minor) | **true** |
| `resolutions` entry, minor | **true** |
| `engines.node` (minor) | false — caught by the node rule |
| `engines.yarn` (minor) | **true** |

`package.json:65` pins `"packageManager": "yarn@4.17.0"`, and `plan.md:372` (E2) already lists
`yarn monorepo` as a group this repo actually produces — so this is live, not hypothetical. A yarn
version bump changes the package manager for every workspace and is closer in risk profile to the
`node` bumps the plan deliberately keeps manual than to a library patch. The 14 `resolutions`
entries in `package.json` are security pins where automerge is arguably fine.

**Recommendation**: pick one and make it explicit rather than accidental — either add
`matchDepTypes: ["dependencies", "devDependencies", "optionalDependencies", "resolutions"]` to the
allow rule, or add a deny rule for `matchDepTypes: ["packageManager", "engines"]` after it. Then
correct the `description` so it lists the real scope.

### H5. AC4's "absent CI" half is not met — skipped checks resolve to green

Marked `- [~]` below, so recorded here per the review rules.

Failing CI genuinely blocks the merge — confirmed in
`dist/workers/repository/update/pr/automerge.js:33-35` (`if (branchStatus !== "green")` → abort) and
`dist/workers/repository/update/branch/status-checks.js:7-15` (with `ignoreTests: false`, it really
queries `platform.getBranchStatus`).

But `dist/modules/platform/github/index.js:756-760`:

```js
if ((commitStatus.state === "success" || commitStatus.statuses.length === 0) &&
    checkRuns.every((run) => ["skipped", "neutral", "success"].includes(run.conclusion)))
  return "green";
```

A branch whose checks all **skipped** is green, so Renovate merges it. That is the implementer's own
plan §5 residual risk 2 ("A skipped build job leaves the branch green") and E5. Genuinely *absent*
CI is safe — zero check runs with no statuses yields `pending` → `yellow` → no merge, per lines
750-753 — so this is narrower than it first looks, and every npm bump touches `yarn.lock` so
`detect-code-changes` should fire.

It is disclosed rather than hidden, which I credit. But AC4 as authored overclaims, and the
`verify-assets` guard is the thing that would silently not run.

**Recommendation**: no config change needed. Either soften AC4's wording to "failing CI", or keep
the claim and land C6 (required status checks on `master`) — `tasks.md:111-113` already tracks it.
The `tasks.md:109-110` first-automerged-PR check is the right stopgap; make sure someone owns it.

---

## 💡 SUGGESTIONS

### S1. The 0.x regex has residual gaps — consider shipping both rule forms

`matchCurrentValue: "/^\\^?~?0\\./"` (`renovate.json:54`) tested against version-string forms:

| form | caught |
| --- | --- |
| `0.7.0`, `^0.7.0`, `~0.7.0`, `0.x`, `0.0.1-beta` | yes |
| `>=0.5.0 <1.0.0`, `>=0.7.0`, bare `0`, `v0.7.0` | **no** |

I confirmed the three range forms resolve to `automerge: true` against the shipped config. I also
scanned every non-`node_modules` `package.json` in the repo: the **only** 0.x dependencies are the
five `passport` entries (`0.7.0` in root/`apps/api`/`apps/web`, `^0.7.0` peers in
`libs/auth`/`libs/web-core`) and all five are caught. The only unusual version strings anywhere are
`*` (workspace-internal peers) and `^4.0.0 || ^5.0.0`, neither 0.x. **So the gap is theoretical
today** — correctly judged as not blocking.

Plan §2.3 said "Do not ship both; pick whichever the dry run proves." That instruction was premised
on the belief that `matchCurrentVersion` is broken (H3). Since the two forms are *complementary* —
`matchCurrentVersion: "<1.0.0"` handles range semantics the regex can't parse, the regex handles raw
range strings `matchCurrentVersion` can't evaluate — adding both closes the gap:

```json
{ "description": "...", "matchCurrentVersion": "<1.0.0", "automerge": false },
{ "description": "...", "matchCurrentValue": "/^\\^?~?0\\./", "automerge": false }
```

Both are `automerge: false`, so there is no ordering hazard. Cheap belt-and-braces; your call
whether it is worth the two extra rules given the current dependency set.

### S2. The `applyPackageRules` harness should have been committed, not deleted

The prompt asks for a view, so: **yes, it should have been committed.** I hold this fairly strongly,
and H3 is the proof. I re-derived the harness from `tasks.md` in about ten minutes and immediately
found a fixture bug that invalidated a documented conclusion. Had it been in the repo, that bug
would have been visible in review rather than reconstructed.

I fully agree with the decision **not** to add a test asserting `renovate.json`'s own literals
(plan §4, "What is explicitly not being verified"). Such a test is a tautology and CLAUDE.md's YAGNI
stance rules it out. But the harness is categorically different: it exercises *Renovate's real
resolution semantics* against the real config and would catch a genuine regression — someone
reordering `packageRules` so a deny rule lands above the allow rule, or a future `matchDepTypes`
edit re-opening H4. That is precisely the class of bug a durable test should catch, and nothing else
in this change catches it (the validator only checks schema validity, not resolved behaviour).

Concretely: `libs/`-style co-located Vitest test importing `applyPackageRules` from a devDependency
`renovate` pin, one `it` per policy class, driven by the shipped JSON. This also removes the need for
the unpinned `npx` in S3, since the package would then be a normal pinned devDependency.

Counter-argument I acknowledge: it adds a heavyweight 424-package devDependency to the repo for one
test file, and the test would break on Renovate internal refactors (`applyPackageRules` is not a
documented public API — I had to import it from `dist/util/package-rules/index.js`, and the package
declares no `exports` map). That is a real cost. But "verified once, ad-hoc, then deleted" is the
weakest of the three options.

### S3. Pin the Renovate version in CI

`job.lint.yml:41` uses unpinned `npx --yes --package renovate`, which resolves to whatever is
`latest` at run time (currently 44.0.1 — a 333MB, 424-package install).

CLAUDE.md's pinned-dependency policy is written about `package.json`, so this is not a literal
violation, and for a validator-only step that never touches repo contents the supply-chain exposure
is modest. But two things make it worth fixing:

- It injects nondeterminism into a step that gates merges. A breaking Renovate release, or a change
  in validator strictness, fails `lint` on an unrelated PR with no code change to explain it.
- `--yes` suppresses the install prompt, so an unvetted latest version of a 424-dep package executes
  in CI on every lint run.

Fix: `npx --yes --package renovate@44.0.1 -- renovate-config-validator --no-global .github/renovate.json`
— and then let Renovate's own `github-actions`/`npm` managers propose bumps to it. Combined with H1's
suggestion of a dedicated workflow, this also stops paying the download cost on every lint run.

### S4. The node rule's description overstates what the regex managers actually match

`renovate.json:63` claims a node update "moves `.nvmrc`, four Dockerfile base images and three
workflow files together."

- Three workflow files: **correct** — `e2e.yml`, `job.test.yml`, `nightly.yml` contain
  `node-version:`. (Five more use `node-version-file`, which the regex at `renovate.json:31` does
  not match — correctly, since they read `.nvmrc`.)
- Four Dockerfile base images: **incorrect**. The regex at `renovate.json:22` is
  `FROM node:(?<currentValue>...)`, but all four Dockerfiles actually say
  `FROM hmctspublic.azurecr.io/base/node:22-alpine`. I tested the pattern against the real line: no
  match. Zero Dockerfiles are currently tracked.

The broken regex manager is **pre-existing** and out of scope, but this PR adds a new line asserting
it works. Either soften the wording, or fold the observation into the C5 follow-up ticket
(`tasks.md:114`) so the `regexManagers` → `customManagers` migration also fixes the pattern. Worth
noting the `.nvmrc` 24.17.0 vs Dockerfile `node:22-alpine` mismatch already flagged in C3 is a
*consequence* of this — the Dockerfiles were never being updated.

### S5. Revisit `minimumReleaseAge` once automerge volume is visible

C4 was decided against (`tasks.md:10-12`) on the grounds that 3 days delays security patches. That
reasoning is sound and I would not block on it. But plan §2.5's scoped form — `minimumReleaseAge` on
the *allow rule only*, leaving manually-reviewed security fixes undelayed — has no such downside and
filters yanked/immediately-repatched releases. Worth a team decision after a few weeks of data.

---

## ✅ Positive Feedback

- **Rule ordering is correct and the reasoning is right.** Later `packageRules` override earlier
  ones; the allow rule at `renovate.json:47-51` sits above all three denies (`52-56`, `57-61`,
  `62-66`). I verified the resolved outcome rather than trusting the ordering.
- **`platformAutomerge: false` (`renovate.json:5`) is the single most valuable line in this diff.**
  The plan §0 analysis of *why* is correct and non-obvious: `master` has zero required status checks,
  so if repo-level `allow_auto_merge` were ever flipped on, Renovate's default
  `platformAutomerge: true` would hand the merge to GitHub native auto-merge, which merges on
  required gates alone — i.e. two bot approvals and no CI. Catching that before re-enabling automerge
  is exactly the right instinct, and not depending on a settings checkbox outside the repo is right.
- **C7 is correct and I confirmed it independently.** `dist/workers/repository/updates/generate.js:247`
  in the installed package reads verbatim:
  `config.automerge = config.upgrades.every((upgrade) => upgrade.automerge);`
  A grouped branch automerges only if every member does, so no group-keyed deny rule is needed. The
  claim was cited to an exact file:line and it holds.
- **No path to `master` with failing CI.** Traced end to end: `ignoreTests: false` →
  `status-checks.js:7-15` really queries GitHub → `pr/automerge.js:33-35` aborts unless green →
  `github/index.js:755` returns `red` if any check run failed. The merge-safety reasoning is sound.
- **Refusing to loosen policy by `depType` is the correct lesson from #753.** The incident was a
  *devDependency* breaking the production artefact. Many teams would have reflexively added a
  "devDependencies are safe" carve-out; the reasoning at plan §0 and the `description` at
  `renovate.json:47` explicitly reject it and record why. That reason will still be legible in two
  years, which is the point of putting it in `description` rather than a doc that drifts.
- **Verification went well beyond inspection.** A dry run against the *local edited* config —
  correctly noting that `--dry-run=lookup` against the remote would have read `master`'s config, not
  the working change — is a subtlety most people miss.
- **`description` fields carry real rationale.** `renovate.json:58`'s note that the major deny is
  "redundant against the top-level default, but must appear after the npm minor/patch rule" is
  exactly the kind of comment that prevents a future reviewer from deleting it as dead config.
- **Honest scoping.** `tasks.md:91-103` distinguishes pre-existing failures from regressions by
  re-running with the change stashed, and `tasks.md:107-118` lists five follow-ups rather than
  quietly widening this PR. `regexManagers` deprecation, the `.nvmrc`/Dockerfile mismatch and the
  `vitest` pin drift were all correctly left alone.
- YAML in `job.lint.yml` is valid and the step is placed sensibly within the job (after
  `Install dependencies`, before `Generate Prisma client`) — parsed clean and indentation matches
  the surrounding steps. `renovate.json` is valid JSON and the validator exits 0.

---

## Test Coverage Assessment

**The 80% coverage rule is disapplied for this change.** `git diff --name-only` returns only
`.github/renovate.json` and `.github/workflows/job.lint.yml`. No workspace under `libs/` or `apps/`
changed, so there are no new or modified statements in any application workspace to attribute
coverage to. Running `yarn test:coverage` would report pre-existing coverage against a
config-only diff — a meaningless number. Not run, deliberately.

SonarCloud's coverage-on-new-code gate is likewise not engaged: a JSON/YAML diff adds no new lines
of measurable code. Plan §4 anticipated this correctly, and it is a genuine (if incidental) benefit
of keeping the change config-only.

**On not adding a `renovate.json` literals test — agree.** A test reading the JSON and asserting its
own values proves nothing about Renovate's resolution semantics and would be pure tautology. Correct
call under CLAUDE.md's YAGNI stance.

**On deleting the `applyPackageRules` harness — disagree.** See S2. The harness tested real
behaviour, not literals, and would catch exactly the regressions this config is vulnerable to
(rule reordering, depType scope changes). I reproduced it and found a fixture bug that invalidated a
documented conclusion (H3), which is the strongest possible argument that it belonged in the repo.

**Existing suite**: not re-run beyond the config checks above. Recorded from `tasks.md`, not
attributed to this change (both confirmed by the implementer to reproduce with the change stashed):

- `apps/web/src/server.test.ts` — `EADDRINUSE :::8080` under concurrent turbo runs; all 355 files /
  3667 tests otherwise pass. Port-binding test isolation issue, worth its own ticket.
- 8 workspaces have broken nested `vitest` installs from a pre-existing pin mismatch (`4.1.9`/`4.1.8`
  vs root `4.1.10`, introduced in `0fcb3af1`). Already tracked at `tasks.md:117`.

---

## Acceptance Criteria Verification

Issue #889 has **no formal Acceptance Criteria section** — it is a two-sentence prose issue. The
criteria below are therefore **derived**: D1–D3 from the issue body verbatim, cross-checked against
the AC1–AC8 table the implementer worked to in `plan.md:391-400`.

### Derived from the issue body

> "we disabled all the dependencies auto merging into master … We need to make sure only
> dependencies with minor version change can be auto merged."

- [x] **D1 — Automerge is re-enabled (it was fully disabled by #888).**
  `.github/renovate.json:47-51` adds the npm `minor`/`patch` allow rule. Verified resolving to
  `automerge: true` for `govuk-frontend 6.2.0→6.4.0` and `vitest 4.1.8→4.1.10`.
- [x] **D2 — Only non-breaking version changes automerge.**
  `renovate.json:49` (`["minor","patch"]`) plus denies at `52-56`, `57-61`, `62-66` and the
  default-deny at `renovate.json:4`. Interpretation widened from literal "minor" to minor+patch;
  confirmed with the issue author per `tasks.md:5-7`, and the rationale at `plan.md:143-160` is
  sound (patch is a strict subset of minor's risk surface).
- [x] **D3 — The cited regression (`3e09fb5e` / PR #753) could not automerge again.**
  It was a `major`, denied by `renovate.json:57-61`; verified `automerge: false` for the exact
  `vite-plugin-static-copy 3.4.0 → 4.1.1` bump. Second line of defence at
  `apps/web/package.json:12-13` (`build` → `&& yarn verify:assets`).

### Cross-check against plan.md §4 (AC1–AC8)

- [x] **AC1 — Automerge re-enabled for non-breaking npm updates.**
  `renovate.json:47-51`. Verified `true` for npm minor and patch, including a devDependency
  (`lefthook`) and a caret range (`happy-dom ^20.0.5 → ^20.1.0`).
- [x] **AC2 — Major updates are never automerged.**
  `renovate.json:4` (default-deny) + `renovate.json:57-61` (explicit deny after the allow rule).
  Verified `false` for the #753 bump and for `typescript 5.9.0 → 6.0.0`.
- [x] **AC3 — The specific #753 regression could not automerge again.**
  Same as D3: `renovate.json:57-61` blocks it as a major, and `apps/web/package.json:12` runs the
  `verify-assets` guard in the build. `apps/web/verify-assets.ts` and its test both exist. The
  scratch-branch build-failure reproduction at `tasks.md:70-75` I could not re-run — the branch was
  deleted — but the guard and its test are present in the tree, so the criterion is evidenced
  without it.
- [~] **AC4 — Automerge cannot happen with failing/absent CI.** *Partially met.*
  **Done**: `renovate.json:5-6` sets `platformAutomerge: false` and `ignoreTests: false`. Traced in
  the installed package that this genuinely forces a real branch-status query and aborts unless
  green (`status-checks.js:7-15`, `pr/automerge.js:33-35`, `github/index.js:755`). `allow_auto_merge`
  confirmed `false` per `tasks.md:76`. Failing CI is genuinely blocked; so is truly absent CI
  (zero check runs → `yellow`, `github/index.js:750-753`).
  **Missing**: a branch whose checks all **skipped** resolves to `green`
  (`github/index.js:756-760`) and will be merged — so the `verify-assets` guard can silently not
  run. This is the implementer's own plan §5 residual risk 2 and E5, disclosed rather than hidden,
  and unlikely in practice because every npm bump touches `yarn.lock`. No config change is required;
  the AC wording overclaims. Resolve by narrowing AC4 to "failing CI" or by landing C6 (required
  status checks on `master`, `tasks.md:111-113`). See H5.
- [x] **AC5 — Pre-1.0.0 minor bumps are not automerged.**
  `renovate.json:52-56`. Verified `false` for `passport 0.7.0 → 0.8.0`, `0.7.0 → 0.7.1`, and the
  `^0.7.0 → ^0.8.0` peer range, while `govuk-frontend`/`happy-dom` (1.x+) stay `true`. Repo-wide
  scan confirms all five 0.x entries are `passport` and all are caught. Residual regex gaps
  (`>=0.5.0 <1.0.0`, bare `0`) are real but unreachable in this dependency set — see S1.
- [x] **AC6 — Node.js version updates remain manual.**
  `renovate.json:62-66` denies all update types for `node`, correctly placed last. Verified `false`
  for the `nvm` manager, the `regex`/`docker` manager, and `engines.node`.
- [x] **AC7 — Infrastructure/pipeline updates remain manual.**
  `renovate.json:48` (`matchManagers: ["npm"]`). Verified `false` for `terraform`,
  `github-actions`, `helmv3` and `dockerfile`.
- [x] **AC8 — Config is syntactically valid and the rules resolve as intended.**
  `renovate-config-validator` exits 0 (warns only on the pre-existing `regexManagers`/`fileMatch`
  deprecations, as predicted at `plan.md:338-341`); JSON parses; and I independently resolved 14/14
  policy cases correctly against the shipped `renovate.json:37-67`. Note the CI step added to
  enforce this going forward has its own defects (H1, H2) — but those do not affect whether the
  config *is* valid today.

---

## Next Steps

- [ ] **H1** — Make the validator reachable for config-only PRs: add `\.github/renovate\.json` to
      the `detect-code-changes` pattern in `workflow.preview.yml:29` and `workflow.main.yml:17`, or
      move the step to its own `paths`-triggered workflow (preferred — also addresses S3's cost).
- [ ] **H2** — Add `--no-global` to `job.lint.yml:41`.
- [ ] **H3** — Correct `tasks.md:65-69` and `plan.md:486-492`: `matchCurrentVersion: "<1.0.0"` does
      work when `versioning` is set; the real reason to prefer `matchCurrentValue` is that it matches
      the raw `^0.7.0` peer ranges, which `matchCurrentVersion` cannot.
- [ ] **H4** — Decide and state explicitly whether `packageManager` (yarn) and `resolutions` should
      automerge; add `matchDepTypes` to the allow rule or a deny rule after it, and fix the
      `description` at `renovate.json:47` to match the real scope.
- [ ] **H5** — Either narrow AC4's wording to "failing CI", or assign an owner to C6
      (`tasks.md:111-113`). Keep the `tasks.md:109-110` first-automerged-PR check and make sure
      someone actually performs it.
- [ ] **S3** — Pin the Renovate version in the CI invocation.
- [ ] Consider **S1** (ship both 0.x rule forms), **S2** (commit the harness as a Vitest test) and
      **S4** (fix or re-scope the Dockerfile claim in the node rule's description).
- [ ] Re-run `renovate-config-validator --no-global` after the H2/H4 edits.
- [ ] Ensure the PR description covers the four points at `tasks.md:120-131`, **amended** for H3.

---

## Overall Assessment

**NEEDS CHANGES** — driven by AC4 being `- [~]`, and independently by H1, H2 and H4, each of which
is a small concrete fix.

To be clear about proportion: the functional change is good work. The `renovate.json` policy is
correctly ordered, correctly scoped, default-deny, and — unusually for a config change — genuinely
verified against Renovate's own resolution code rather than by eyeballing. The `platformAutomerge`
analysis found a real latent hazard that had nothing to do with the ticket as written, and the
refusal to add a devDependency carve-out shows the right lesson was drawn from #753. I could not
break the shipped policy in 14 attempts across every update class this repo produces.

What needs work is the scaffolding around it. The validator step, as placed, does not run on the
change class it was added to protect — which makes it decorative rather than protective, and that is
worth fixing before merge because it is cheap and because the next person will reasonably assume it
works. The `matchCurrentVersion` claim being false matters less for the shipped config (which is
still the better form) than for what it reveals: a verification harness with a fixture gap, run once
and then deleted, whose "25/25" headline cannot now be audited. That is the strongest argument for
S2, and it is why I would push back on the decision to delete it.

None of this is a security or data-integrity problem, and none of it risks a breaking dependency
reaching `master`. Fix H1, H2 and H4, correct the H3 documentation, and settle H5's wording, and
this is ready.

**Not applicable to this change — no findings invented for these categories:**
Accessibility / WCAG 2.2 AA, GOV.UK Design System compliance, semantic HTML / ARIA, keyboard
navigation, screen readers, XSS, SQL injection / Prisma query safety, authentication and
authorization, N+1 queries, mobile-first / responsive design, asset optimization, plain-English
content, Welsh translations, and CLAUDE.md's "business logic in `libs/` not `apps/`" rule. This
change is repository CI configuration only — two files under `.github/`, no TypeScript, no
templates, no user-facing pages, no database access. CLAUDE.md's pinned-dependency policy *was*
assessed and is raised as S3.
