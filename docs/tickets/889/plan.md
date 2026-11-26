# Plan: #889 — Re-enable Renovate automerge for non-breaking dependency updates only

## 0. Current state (verified in repo, not assumed)

### `.github/renovate.json` as it stands today

```json
{
  "$schema": "https://docs.renovatebot.com/renovate-schema.json",
  "extends": ["config:recommended"],
  "automerge": false,
  "node": { "enabled": true },
  "regexManagers": [ /* node in .nvmrc, Dockerfiles, workflows */ ],
  "packageRules": [
    { "description": "Group all Node.js version updates", "groupName": "Node.js version", "matchPackageNames": ["node"], "matchManagers": ["regex", "nvm"], "matchDatasources": ["node-version", "docker"], "enabled": true },
    { "description": "Require approval for Node.js major updates", "matchPackageNames": ["node"], "matchUpdateTypes": ["major"], "automerge": false }
  ],
  "constraints": { "node": ">=22" }
}
```

### What commit `d9320eac` (#888) actually changed

Only two things in the Renovate/CI space (plus the dependency revert and its tests):

1. `.github/renovate.json`: top-level `"automerge": true` → `"automerge": false`, and the
   rule `"Auto-merge Node.js minor and patch updates"` (`matchUpdateTypes: ["minor","patch"]`,
   `automerge: true`) was **deleted**. The `"Require approval for Node.js major updates"`
   rule was kept as documentation-only (it is redundant while the default is deny).
2. `apps/web/package.json`: added `"verify:assets": "tsx verify-assets.ts"` and appended
   `&& yarn verify:assets` to the `build` script; reverted `vite-plugin-static-copy`
   `4.1.1` → `3.4.0`.

So the "before" state for this ticket is **deny-all automerge**, and the previous model was
**allow-all with a redundant node-major carve-out**. This ticket must build the middle ground.

### The failure mode that must stay prevented (`3e09fb5e`, PR #753)

`vite-plugin-static-copy` `3.4.0 → 4.1.1` — a **major** bump, in **`devDependencies`** of
`apps/web`. v4.0.0 removed the `structured` option and always preserves directory structure,
so every `viteStaticCopy` target in `apps/web/vite.build.ts` (which globs out of the Vite root
via `../../node_modules/...`) landed its output several directories deep. The compiled CSS still
emitted the flat `url(/assets/fonts/...)` and `url(/assets/images/govuk-crest.svg)` paths, which
then 404'd: GDS Transport fell back to a system sans-serif and the footer crown crest vanished.

Two independent facts from this that drive the design:

- **It was a major bump.** A minor/patch-only automerge policy would have blocked it. This is
  the primary control.
- **It was a devDependency.** A build-time tool in `devDependencies` broke the production
  artefact. Therefore **do not** give `devDependencies` a looser policy than `dependencies` —
  the depType tells you nothing about production risk in this repo.

### The safety net added in #888 — it exists, and here is exactly how it runs

`apps/web/verify-assets.ts` exports `findAssetProblems(distAssets)` and
`reportAssetProblems(distAssets, out)`; the CLI entry point is behind an
`import.meta.url === file://${process.argv[1]}` guard. It fails on: missing
`images/govuk-crest.svg` or `manifest.json`; a `fonts/` directory with no `.woff`/`.woff2`;
and — the authoritative check — any `url(/assets/...)` in the compiled CSS that does not
resolve on disk. It is covered by `apps/web/verify-assets.test.ts` (real fixture trees under
`os.tmpdir()`, including a regression case reproducing the v4 nesting).

Execution path in CI:

```
workflow.preview.yml (pull_request → master)
  └─ detect-code-changes  paths: ^(yarn\.lock|apps/|libs/|helm/)
  └─ build-stage (stage.build.yml)  [if has-changes]
       ├─ job.lint.yml           turbo lint            (no build)
       ├─ job.test.yml           turbo test            (no build)
       ├─ job.osv-scanner.yml
       └─ job.build-and-publish-images.yml
            └─ Build & Publish web  → docker build apps/web/Dockerfile
                 └─ RUN yarn build  → turbo build → @hmcts/web build
                      → tsc --build && vite build && yarn verify:assets   ← the guard
```

The guard therefore runs **only inside the web Docker image build**, and only when `web` is in
`affected-apps` (computed by `.github/workflows/jobs/build-and-publish-images/detect-affected-apps.sh`
via `turbo ls --affected`, with a fallback that builds all apps when no cached SHA exists).
There is no standalone `yarn build` step in CI. See §3 for why this matters and §5 for the
residual risk this leaves.

### How Renovate merges here, and the trap hiding in branch protection

Verified via the GitHub API:

| Setting | Value |
| --- | --- |
| `master` required approving reviews | **1** |
| `master` required status checks | **not enabled** (API returns 404) |
| `enforce_admins` | false |
| Repo `allow_auto_merge` | **false** |

PR #753's merge metadata: `mergedBy: app/renovate`, `autoMergeRequest: null`, and approvals from
the `renovate-approve` / `renovate-approve-2` apps (which satisfy the 1-review requirement
without a human). All 24 checks were SUCCESS (with `osv-scanner` NEUTRAL) before Renovate merged.

Two conclusions:

1. **Renovate merged using its own automerge path**, not GitHub's. Renovate's own automerge
   waits for the branch commit status to be green (governed by `ignoreTests`, default `false`).
   That is why #753 merged only after CI passed. This is the behaviour we depend on.
2. **This is fragile by accident, not by design.** Because `master` has **no required status
   checks**, if repo-level `allow_auto_merge` were ever turned on, Renovate's default
   `platformAutomerge: true` would hand the merge to GitHub's native auto-merge — which merges as
   soon as the *required* gates pass. With zero required checks and two bot approvals, that means
   **merge immediately, ignoring CI entirely**. Re-enabling automerge without pinning this down
   would be reckless. Hence `"platformAutomerge": false` is a mandatory part of this change.

### Dependency pinning reality (affects which update classes can even occur)

CLAUDE.md mandates pinned exact versions except peer dependencies, and the repo follows it:
`express: "5.2.0"`, `vite: "7.3.6"`, `prisma: "7.8.0"`, etc., with `^` reserved for
`peerDependencies` and a handful of devDeps (`happy-dom: ^20.0.5`,
`@biomejs/cli-linux-arm64: ^2.3.6`, `accessible-autocomplete: ^3.0.1`,
`notifications-node-client: ^8.2.1`). Consequences:

- Every Renovate npm PR bumps a literal pin — there is a real, classifiable `updateType` on
  essentially every PR. Good for a `matchUpdateTypes` policy.
- `lockFileMaintenance` is **disabled** by `config:recommended`, and `rangeStrategy: "auto"`
  only rewrites a range when the new version falls outside it. So lockfile-only PRs are
  effectively not produced today. No policy needed; see §5 for the note if that ever changes.
- **`passport: "0.7.0"`** (root, `apps/api`, `apps/web`) is a pinned **pre-1.0.0 production**
  dependency, plus `^0.7.0` peer ranges in `libs/auth` and `libs/web-core`. Under semver a
  `0.7 → 0.8` bump is allowed to break, but Renovate still classifies it as `minor`. This is a
  live hole in a naive minor-automerge rule, not a hypothetical.

### Non-npm managers Renovate is updating in this repo

`config:recommended` also drives `github-actions`, `dockerfile`, `terraform`, and helm.
Evidence from merged Renovate PRs: `hashicorp/terraform to v1.15.8`, `helm to v4.2.3`,
`docker/login-action action to v4`, `dorny/test-reporter action to v3`, plus the `node` regex
managers touching `.nvmrc`, `apps/*/Dockerfile` and `.github/workflows/*`. Terraform matters
most: PRs run `stage.infrastructure.yml` with `plan-only: true`, but a merge to `master`
runs it with `plan-only: false` — i.e. **apply**. See §2 for why these stay manual.

---

## 1. Technical Approach

### Interpretation of "only dependencies with minor version change can be auto merged"

**Stated interpretation: automerge `minor` *and* `patch`; `major` is always manual.**

The literal reading is minor-only, but that produces a policy where the *safer* of the two
non-breaking classes (patch) requires a human while the *riskier* one (minor) does not. Patch is
strictly a subset of minor's risk surface under semver, and patch releases are the bulk of the
volume in this repo (`@types/supertest 7.2.1`, `pg-connection-string 2.14.0`, `sass 1.101.0`,
`vitest 4.1.10`, …). Blocking those defeats the point of Renovate while retaining the merge risk.
The author's intent, read against the incident they cite, is clearly "don't automerge breaking
changes" — and the thing that broke was a major.

This is flagged in **CLARIFICATIONS NEEDED** as item C1. If the author insists on the literal
reading, the change is one array element (`["minor", "patch"]` → `["minor"]`) and nothing else in
this plan moves. Note that with Renovate's default `separateMinorPatch: false`, a dependency with
both a patch and a minor available produces a single branch classified `minor`, so minor-only
automerge does not accidentally sweep patches along.

### Architecture decisions

1. **Default-deny, allow narrowly.** Keep top-level `"automerge": false` exactly as #888 left it
   and enable automerge only through a specific `packageRules` entry. Anything Renovate cannot
   classify as npm minor/patch — majors, digests, replacements, rollbacks, non-npm managers,
   future update types — stays manual with no further work. The alternative (allow-all with
   carve-outs) is what caused #753.

2. **Rule ordering is load-bearing.** Renovate applies `packageRules` in order and later matching
   rules override earlier ones. The allow rule goes *before* the deny rules so that the 0.x deny,
   the major deny and the node deny all win over it.

3. **`platformAutomerge: false`, explicitly.** Forces Renovate's own automerge path, which will
   not merge until the branch status is green. Do not rely on `allow_auto_merge: false` remaining
   false at repo level — that is a checkbox in a settings page outside this repo, and its current
   value is the only thing standing between the new config and CI-ignoring merges (see §0).

4. **`ignoreTests: false`, explicitly.** It is already the default; setting it in-file makes the
   "CI must be green" contract reviewable in the diff rather than implied.

5. **npm manager only.** Terraform, Docker base images, helm and GitHub Actions stay manual.
   Terraform because merging to `master` *applies* to STG and nobody would have read the plan.
   Docker base images and helm chart versions because nothing in the PR pipeline meaningfully
   exercises a base-image change beyond a build. GitHub Actions because an action bump changes the
   very pipeline that is supposed to be vetting it. `node` stays manual too — #888 deliberately
   removed its automerge rule, and a node bump moves `.nvmrc`, four Dockerfile base images and
   three workflow files at once (and note `.nvmrc` is already `24.17.0` while the Dockerfiles pin
   `node:22-alpine`, so that surface is not even self-consistent). Flagged as C2/C3.

6. **No `libs/` module, no code.** This is repository CI configuration. CLAUDE.md's "features go
   in `libs/`" applies to product features; there is no feature here. The entire functional change
   is `.github/renovate.json`. As a side benefit, a JSON-only diff adds no new lines for
   SonarCloud's coverage-on-new-code gate, which is what forced the test rewrite in #888.

7. **Documentation lives in the config.** `renovate.json` is JSON and cannot carry comments, but
   Renovate supports a `description` field on every `packageRules` entry and the existing config
   already uses it. Put the rationale there rather than in a separate doc that will drift.

---

## 2. Implementation Details

### 2.1 File structure

| File | Change |
| --- | --- |
| `.github/renovate.json` | The whole functional change: `platformAutomerge`, `ignoreTests`, four `packageRules` edits |
| `.github/workflows/job.lint.yml` | Optional (§2.4): add a `renovate-config-validator` step |

No changes to `libs/`, `apps/`, Prisma schema, or any application code. No API endpoints. No
database migrations.

### 2.2 `.github/renovate.json` — before / after

**Before** (current `master`, lines 1–7 and 35–50):

```json
{
  "$schema": "https://docs.renovatebot.com/renovate-schema.json",
  "extends": ["config:recommended"],
  "automerge": false,
  "node": {
    "enabled": true
  },
  ...
  "packageRules": [
    {
      "description": "Group all Node.js version updates",
      "groupName": "Node.js version",
      "matchPackageNames": ["node"],
      "matchManagers": ["regex", "nvm"],
      "matchDatasources": ["node-version", "docker"],
      "enabled": true
    },
    {
      "description": "Require approval for Node.js major updates",
      "matchPackageNames": ["node"],
      "matchUpdateTypes": ["major"],
      "automerge": false
    }
  ],
  ...
}
```

**After**:

```json
{
  "$schema": "https://docs.renovatebot.com/renovate-schema.json",
  "extends": ["config:recommended"],
  "automerge": false,
  "platformAutomerge": false,
  "ignoreTests": false,
  "node": {
    "enabled": true
  },
  ...
  "packageRules": [
    {
      "description": "Group all Node.js version updates",
      "groupName": "Node.js version",
      "matchPackageNames": ["node"],
      "matchManagers": ["regex", "nvm"],
      "matchDatasources": ["node-version", "docker"],
      "enabled": true
    },
    {
      "description": "Automerge npm minor and patch updates only. Renovate merges via its own automerge path (platformAutomerge is false) so the branch must be green first. Applies equally to dependencies and devDependencies: PR #753 was a devDependency bump that broke the production GOV.UK assets, so depType is not a risk signal here. Rules below this one override it.",
      "matchManagers": ["npm"],
      "matchUpdateTypes": ["minor", "patch"],
      "automerge": true
    },
    {
      "description": "Never automerge pre-1.0.0 packages. Under semver a 0.x minor bump may break, but Renovate still classifies it as minor. Applies to passport (0.7.0).",
      "matchCurrentVersion": "<1.0.0",
      "automerge": false
    },
    {
      "description": "Never automerge major updates. Redundant against the top-level default, but must appear after the npm minor/patch rule so it wins for any grouped branch whose resolved updateType is major.",
      "matchUpdateTypes": ["major"],
      "automerge": false
    },
    {
      "description": "Node.js version updates always need manual review - a single update moves .nvmrc, four Dockerfile base images and three workflow files together.",
      "matchPackageNames": ["node"],
      "automerge": false
    }
  ],
  ...
}
```

Changes, precisely:

- **Add** top-level `"platformAutomerge": false` and `"ignoreTests": false`.
- **Keep** top-level `"automerge": false` unchanged (default-deny).
- **Keep** the node grouping rule unchanged.
- **Insert** the npm minor/patch allow rule as the second `packageRules` entry.
- **Insert** the pre-1.0.0 deny rule third.
- **Insert** the major deny rule fourth.
- **Replace** `"Require approval for Node.js major updates"` with the broader node deny rule
  (all update types, not just major) and fix the misleading wording — in Renovate, "approval"
  means `dependencyDashboardApproval`, which is not what that rule did.
- `regexManagers` and `constraints` untouched.

### 2.3 If `matchCurrentVersion: "<1.0.0"` misbehaves

`matchCurrentVersion` accepts a version, a range, or a regex. The range form is the correct
primary choice, but it is evaluated against the *current value*, which for the `^0.7.0` peer
ranges in `libs/auth` / `libs/web-core` is a range rather than a single version. If the dry run
(§4) shows a 0.x update still resolving to `automerge: true`, swap that rule to the value-regex
form, which matches the raw string:

```json
{
  "description": "Never automerge pre-1.0.0 packages ...",
  "matchCurrentValue": "/^\\^?~?0\\./",
  "automerge": false
}
```

Do not ship both; pick whichever the dry run proves.

> **Superseded during implementation.** This instruction was wrong. Verification showed the two
> forms are *complementary*, not alternatives: `matchCurrentVersion` covers `>=0.5.0 <1.0.0` and
> bare `0`, which the regex misses, while the regex covers `^0.7.0` / `~0.7.0`, which
> `matchCurrentVersion` misses. **Both** rules ship. See "Correction to §2.2/§2.3" at the end of
> this document.

### 2.4 Optional: validate the config in CI

Add to `.github/workflows/job.lint.yml`, after "Install dependencies":

```yaml
      - name: Validate Renovate config
        run: npx --yes --package renovate -- renovate-config-validator .github/renovate.json
```

This is cheap and is the only automated protection against a future typo silently changing the
policy. It is marked optional because an invalid config does not fail *open*: Renovate raises a
config-error issue and stops, rather than automerging. Note the existing config uses the
deprecated `regexManagers` / `fileMatch` spellings (now `customManagers` + `customType: "regex"`
and `managerFilePatterns`); the validator reports these as migration warnings. **Do not** migrate
them in this PR — that is unrelated churn on the change that re-enables automerge, and it should
land separately. If the validator exits non-zero on the deprecations rather than warning, drop
this step and record it as follow-up work (see C5).

> **Superseded during implementation.** `job.lint.yml` is the wrong host for this step: it is only
> reachable via `stage.build.yml` ← `workflow.preview.yml`, whose `detect-code-changes` gate is
> `paths: "^(yarn\.lock|apps/|libs/|helm/)"` — so it never runs for a PR that touches only
> `.github/renovate.json`, which is exactly the PR it is meant to protect. The check now lives in
> its own workflow, `.github/workflows/renovate-config.yml`, triggered directly on that path.
> `--no-global` is also required, or the file is validated against the self-hosted global schema
> instead of the repo-config schema. And the validator alone is not sufficient — it proves the
> config parses, not what it resolves to — so that workflow also runs
> `scripts/verify-renovate-automerge.mjs`.

### 2.5 Optional hardening: `minimumReleaseAge`

```json
  "minimumReleaseAge": "3 days",
```

Renovate will not open (and therefore cannot automerge) an update until the release is 3 days
old, which filters out releases that get yanked or immediately re-patched. The cost is delaying
security patches by the same 3 days, so this is a real trade-off, not a free win. Flagged as C4.
If adopted, prefer scoping it to the automerge rule rather than globally, so manual review of a
security fix is not delayed:

```json
    {
      "description": "Automerge npm minor and patch updates only. ...",
      "matchManagers": ["npm"],
      "matchUpdateTypes": ["minor", "patch"],
      "minimumReleaseAge": "3 days",
      "automerge": true
    }
```

---

## 3. Error Handling & Edge Cases

| # | Edge case | Handling |
| --- | --- | --- |
| E1 | **0.x minor bumps are breaking under semver** but Renovate classifies them `minor`. Live case: `passport 0.7.0` in root, `apps/api`, `apps/web`, plus `^0.7.0` peers in `libs/auth`, `libs/web-core`. | Explicit pre-1.0.0 deny rule (§2.2), placed after the allow rule so it wins. Verify against `passport` specifically in the dry run. |
| E2 | **Grouped/monorepo branches mixing major and minor.** This repo produces them: `vitest monorepo`, `terraform monorepo`, `playwright monorepo`, `happy-dom monorepo`, `yarn monorepo`. Renovate's per-branch `automerge` resolution for a mixed group must not silently inherit `true` from one member. | Belt-and-braces `matchUpdateTypes: ["major"]` deny rule placed *after* the allow rule, so if the grouped branch resolves to `major` it is denied regardless. The residual case — a group that resolves to `minor` while containing a major member — must be **verified in the dry run** (§4), not assumed. If it can happen, add `"separateMajorMinor": true` (already the default) is insufficient; instead disable grouping for automerge by adding `"matchPackageNames": ["!*"]`-style narrowing or simply exclude grouped branches with a rule keyed on the affected `groupName`s. Do not guess — inspect the dry-run output. |
| E3 | **A devDependency breaks production.** Exactly what #753 was. | No depType-based loosening anywhere in the config; the rule matches all npm depTypes uniformly, and the reason is recorded in its `description`. |
| E4 | **A *patch* bump breaks the build output.** Nothing in semver guarantees a patch is safe; `sass`, `vite`, `vite-plugin-static-copy` are all build-time. | Accepted residual risk, mitigated by `verify-assets` + full PR pipeline (lint, unit tests, image build, deploy to dev, smoke test, E2E) all having to be green before Renovate merges. Stated explicitly in §5 rather than pretended away. |
| E5 | **The `verify-assets` guard does not run** because `web` is absent from `affected-apps`, or the whole `build-stage` is skipped. A SKIPPED job still leaves the branch status green, and Renovate's automerge tolerates green-with-skips (PR #753 merged with `Infrastructure` SKIPPED and `osv-scanner` NEUTRAL). | Every npm bump touches `yarn.lock` and a `package.json`, so `detect-code-changes` (`^(yarn\.lock\|apps/\|libs/\|helm/)`) fires and `turbo ls --affected` resolves the lockfile change to the dependent workspaces — in practice including `@hmcts/web` for anything in its dependency graph. This must be **confirmed on the first automerged PR** by checking that `Build / Build Images / Build & Publish web` ran rather than skipped. Optional hardening if it does not hold: promote asset verification to an unconditional CI step. Do not add that speculatively. |
| E6 | **GitHub native auto-merge bypassing CI.** `master` has no required status checks, so native auto-merge would merge on approvals alone; the two `renovate-approve` bot approvals already satisfy the 1-review requirement. | `"platformAutomerge": false` forces Renovate's own green-branch-required path. Additionally recommend (repo-admin task, outside this repo) enabling required status checks on `master` for at least `Build / Test / Test Changed Packages`, `Build / Lint / Lint Changed Packages` and `Build / Build Images / Build & Publish web`. Flagged as C6. |
| E7 | **Bot approvals mean no human ever looks at an automerged PR.** | Inherent to the requested feature; the control is the update-type restriction plus CI, not review. Worth stating plainly so nobody believes review is a gate here. |
| E8 | **Automerges land on `master` and deploy straight to STG** via `workflow.main.yml` with no human watching. `concurrency: group: main, cancel-in-progress: false` queues them, so a burst does not race. | No change needed; recorded so the behaviour is understood and accepted. |
| E9 | **Lockfile-only / `lockFileMaintenance` updates.** Currently not produced (`lockFileMaintenance` disabled by `config:recommended`; pinned deps mean range-satisfying updates do not occur). | Out of scope by default-deny — such a branch has no npm `minor`/`patch` updateType and so is not automerged. If `lockFileMaintenance` is ever enabled, its automerge policy is a separate decision. |
| E10 | **Renovate's `rollback` and `replacement` update types**, and digest pins. | Default-deny covers them; no rule needed. |
| E11 | **Terraform minor bump automerged would apply to STG infrastructure on merge** (`workflow.main.yml` runs `stage.infrastructure.yml` with `plan-only: false`). | `matchManagers: ["npm"]` on the allow rule excludes terraform entirely. |
| E12 | **A typo or bad edit to `renovate.json`** silently widening the policy. | Optional validator step (§2.4). Note the failure mode is fail-closed (Renovate errors and does nothing), so this is defence in depth, not a gate. |

---

## 4. Acceptance Criteria Mapping

The issue states no formal AC list, so these are derived from the issue body ("only dependencies
with minor version change can be auto merged") and the incident it cites.

| AC | Criterion | Satisfied by | Verification (no real PR needed) |
| --- | --- | --- | --- |
| AC1 | Automerge is re-enabled for non-breaking npm updates | npm `minor`+`patch` allow rule, §2.2 | `renovate --dry-run=lookup` (below) shows `automerge: true` on the resolved config for a minor/patch npm branch |
| AC2 | Major updates are never automerged | Default-deny + explicit `matchUpdateTypes: ["major"]` deny placed after the allow rule | Dry run shows `automerge: false` for a major branch. Deterministic negative check: re-apply the exact #753 bump on a scratch branch (`vite-plugin-static-copy` → `4.1.1`) and confirm the dry run classifies it `major` with `automerge: false` |
| AC3 | The specific #753 regression could not automerge again | AC2 (it was a major) **and** the #888 build guard | Re-apply `vite-plugin-static-copy: 4.1.1` in `apps/web/package.json`, `yarn install`, then `yarn workspace @hmcts/web run build` — must exit non-zero and name the broken `/assets/...` references. Revert afterwards. This is the highest-value single check and needs no Renovate at all |
| AC4 | Automerge cannot happen with failing/absent CI | `platformAutomerge: false` + `ignoreTests: false` | Assert both keys present in the config; confirm `gh api repos/hmcts/cath-service --jq .allow_auto_merge` is still `false`; dry-run log shows Renovate's own automerge path |
| AC5 | Pre-1.0.0 minor bumps are not automerged | Pre-1.0.0 deny rule | Dry run against `passport` — must resolve `automerge: false` |
| AC6 | Node.js version updates remain manual | Node deny rule (all update types) | Dry run on the `Node.js version` group branch → `automerge: false` |
| AC7 | Infrastructure/pipeline updates remain manual | `matchManagers: ["npm"]` on the allow rule | Dry run on a `hashicorp/terraform` / `docker/login-action` / helm branch → `automerge: false` |
| AC8 | The config is syntactically valid and the rules resolve as intended | §2.2 + optional §2.4 | `npx --yes --package renovate -- renovate-config-validator .github/renovate.json` |

### The dry run, concretely

```bash
LOG_LEVEL=debug npx --yes renovate \
  --platform=github \
  --token="$GITHUB_TOKEN" \
  --dry-run=lookup \
  --schedule= \
  hmcts/cath-service 2>&1 | tee /tmp/renovate-dry-run.log
```

Then inspect the resolved per-branch config, e.g.:

```bash
grep -nE '"(branchName|updateType|automerge|depName)"' /tmp/renovate-dry-run.log
```

The pass condition is a table where every branch's `automerge` matches AC1–AC7. Requires a token
with read access to the repo; `--dry-run=lookup` neither writes branches nor opens PRs.

If a token is unavailable, the fallback is weaker but still useful: validate with
`renovate-config-validator`, then reason the rule ordering through by hand against the update
inventory in §0, and accept that E2 (mixed groups) is confirmed only on the first real grouped PR.
Say so in the PR description rather than claiming it was verified.

### What is explicitly *not* being verified by automated tests

No unit test is added for `renovate.json`. A test that reads the JSON and asserts its own literals
tests nothing about Renovate's resolution semantics — the dry run does. Adding one would violate
CLAUDE.md's YAGNI stance and add no coverage value. A JSON-only diff also adds no new lines to
SonarCloud's coverage-on-new-code gate, so the problem that bit #888 does not recur here.

---

## 5. Residual risk (state this in the PR description)

1. A `minor` or `patch` npm update can still break something that no CI check detects. `verify-assets`
   closes exactly one class of failure — GOV.UK asset relocation. It is not a general regression net.
2. `verify-assets` runs only inside the web Docker image build, gated on `turbo`'s affected-app
   detection (E5). A skipped build job leaves the branch green.
3. Nothing human reviews an automerged PR; the `renovate-approve` bots satisfy branch protection.
4. `master` has no required status checks. The safety of automerge rests on `platformAutomerge: false`
   plus Renovate's green-branch requirement, not on branch protection (E6, C6).

---

## CLARIFICATIONS NEEDED

- **C1 (blocking, decide before implementing) — minor-only, or minor+patch?** The issue says
  "only dependencies with minor version change". This plan implements **minor + patch**, on the
  grounds that patch is strictly less risky than minor and is the bulk of the volume, so a
  minor-only policy would keep the risk while removing most of the benefit. Confirm with the issue
  author. If minor-only is genuinely wanted, change `["minor", "patch"]` → `["minor"]`; nothing
  else in the plan changes.
- **C2 — Should non-npm managers really stay manual?** This plan excludes terraform, Docker base
  images, helm chart versions and GitHub Actions via `matchManagers: ["npm"]`. Terraform is the
  strong case (merging to `master` *applies* to STG). GitHub Actions patch bumps are arguably safe
  and are high-volume; if the team wants them automerged, add `"github-actions"` to the allow rule's
  `matchManagers`. Terraform and helm should stay manual regardless.
- **C3 — Should Node.js minor/patch automerge be restored?** #888 deleted that rule; this plan keeps
  it deleted. Note `.nvmrc` is `24.17.0` while all four Dockerfiles pin `node:22-alpine`, so the
  node surface is already inconsistent and a node bump touches 4 workflow/config files at once.
  Recommend keeping it manual until that inconsistency is resolved separately.
- **C4 — Adopt `minimumReleaseAge` (§2.5)?** 3 days would filter yanked/immediately-repatched
  releases, at the cost of delaying security patches by 3 days. Needs a team decision; if adopted,
  scope it to the automerge rule, not globally.
- **C5 — Migrate `regexManagers` → `customManagers` now or later?** The current spellings
  (`regexManagers`, `fileMatch`) are deprecated. Recommend **later**, in its own PR, to keep this
  diff reviewable. Only pull it forward if the config validator hard-fails rather than warning.
- **C6 — Enable required status checks on `master`?** This is a repository-settings change, not a
  code change, and cannot be done from this PR. Without it, the *only* thing preventing
  CI-ignoring merges is `platformAutomerge: false` plus `allow_auto_merge: false` at repo level.
  Recommend requiring at minimum `Build / Test / Test Changed Packages`,
  `Build / Lint / Lint Changed Packages` and `Build / Build Images / Build & Publish web`. Needs an
  owner with admin rights; confirm whether it is in scope for #889 or a separate ticket.
- **C7 — ~~Verify E2 (mixed-updateType groups) before merging.~~ RESOLVED during implementation.**
  Renovate computes branch-level automerge as
  `config.automerge = config.upgrades.every((upgrade) => upgrade.automerge)`
  (`workers/repository/updates/generate.js:247` in the installed `renovate` package). A grouped
  branch therefore automerges only if **every** member does, so a mixed group containing a major (or
  a 0.x, or a non-npm manager) cannot resolve to `automerge: true`. Verified against the real
  `prisma-monorepo` group (all minor → `true`) and synthetic mixed groups (minor+major → `false`,
  minor+0.x → `false`, npm-minor+terraform-minor → `false`). **No group-keyed deny rule is needed.**

### Correction to §2.2/§2.3 made during implementation

**Retraction.** An earlier version of this section claimed `matchCurrentVersion: "<1.0.0"` "does not
work" for this repo's `passport` pin. That was false. It was a bug in the verification harness, not
in Renovate: `util/package-rules/current-version.js` destructures `versioning` from the upgrade and
calls `get(versioning)` to obtain a versioning API, so a fixture with no `versioning` gives the
matcher nothing to compare against and it silently declines to match. With `versioning: "npm"` set,
`matchCurrentVersion: "<1.0.0"` denies `passport 0.7.0` correctly. Caught by the code review
(finding H3).

**What shipped: both forms.** §2.3's "do not ship both" was also wrong — the two matchers cover
different value shapes and neither is sufficient alone:

| 0.x value form        | `matchCurrentVersion: "<1.0.0"` | `matchCurrentValue: "/^\\^?~?0\\./"` |
|-----------------------|:-------------------------------:|:------------------------------------:|
| `0.7.0` (bare pin)    | denies                          | denies                               |
| `^0.7.0` (peer range) | **misses**                      | denies                               |
| `~0.7.0`              | **misses**                      | denies                               |
| `>=0.5.0 <1.0.0`      | denies                          | **misses**                           |
| `0` (bare major)      | denies                          | **misses**                           |

`matchCurrentVersion` has no single version to compare for a caret/tilde range, and the regex only
anchors on a literal leading `0.`. Both rules are therefore present, and all five forms resolve to
`automerge: false`. Neither affects 1.x+ — `govuk-frontend`, `lodash` and `happy-dom` still resolve
to `true`.

Today only `passport` is affected in first-party manifests (`0.7.0` pinned in the root, `apps/web`
and `apps/api`; `^0.7.0` as a peer in `libs/web-core` and `libs/auth`), so the compound-range and
bare-`0` forms are covered pre-emptively rather than in response to a live gap.

### Addition beyond the plan: `packageManager` and `resolutions`

Neither the ticket nor this plan considered these `depTypes`, but both are matched by
`matchManagers: ["npm"]` and were resolving to `automerge: true`. A `packageManager` bump
(`yarn@4.17.0`, `package.json:65`) changes the toolchain for every workspace and every CI job, and
the 14 root `resolutions` (`axios`, `tar`, `undici`, `vite`, …) are deliberate security and
compatibility pins whose entire purpose is to hold a chosen version. A third deny rule
(`matchDepTypes: ["packageManager", "resolutions"]`) excludes both, while the same packages as plain
`dependencies` entries still automerge. Raised as review finding H4.
