# Tasks: #889 — Re-enable Renovate automerge for non-breaking updates only

## Pre-implementation (blocking)

- [x] Confirm C1 with the issue author: automerge **minor + patch** (this plan's default) vs
      literal **minor only**. Everything below assumes minor + patch.
      **Answer: minor + patch.** Confirmed by the user; no other part of the plan changed.
- [x] Confirm C2/C3: non-npm managers (terraform, docker, helm, github-actions) and `node` stay
      manual. Implemented as planned via `matchManagers: ["npm"]` plus the node deny rule.
- [x] Decide C4: adopt `minimumReleaseAge: "3 days"` on the automerge rule, or not.
      **Not adopted** — it delays security patches by 3 days, which is a team trade-off not
      mandated by this issue. Left as a follow-up option; noted below.
- [x] Create a branch off `master` (do not commit to `master` directly).
      Branch: `fix/889-renovate-automerge-minor-patch`.

## Implementation Tasks

- [x] `.github/renovate.json`: add top-level `"platformAutomerge": false`.
- [x] `.github/renovate.json`: add top-level `"ignoreTests": false`.
- [x] `.github/renovate.json`: leave top-level `"automerge": false` (default-deny) unchanged.
- [x] `.github/renovate.json`: insert the npm allow rule as the **second** `packageRules` entry —
      `matchManagers: ["npm"]`, `matchUpdateTypes: ["minor", "patch"]`, `automerge: true`, with the
      `description` from plan §2.2 explaining why devDependencies are treated identically to
      dependencies.
- [x] `.github/renovate.json`: insert the pre-1.0.0 deny rule **third**.
      **Shipped as two complementary rules, not one** — `matchCurrentVersion: "<1.0.0"` *and*
      `matchCurrentValue: "/^\\^?~?0\\./"`. See Validation below; plan §2.3's "do not ship both"
      instruction was wrong, because neither matcher covers every 0.x value form alone.
- [x] `.github/renovate.json`: insert the `packageManager`/`resolutions` deny rule
      (`matchDepTypes: ["packageManager", "resolutions"]`) after the pre-1.0.0 rules. Added in
      response to review finding H4 — a `packageManager` bump changes the toolchain for every
      workspace and every CI job, and the 14 root `resolutions` (axios, tar, undici, vite, …)
      are deliberate security pins whose purpose is to hold a chosen version.
- [x] `.github/renovate.json`: insert the major deny rule —
      `matchUpdateTypes: ["major"]`, `automerge: false`.
- [x] `.github/renovate.json`: replace `"Require approval for Node.js major updates"` with a
      node deny rule covering **all** update types (`matchPackageNames: ["node"]`,
      `automerge: false`) and corrected wording.
- [x] Verify rule order is: node grouping → npm allow → pre-1.0.0 deny (×2) →
      packageManager/resolutions deny → major deny → node deny.
      Confirmed at `.github/renovate.json:37-77`.
- [x] Leave `regexManagers` and `constraints` untouched (deprecation migration is a separate PR — C5).
- [x] Optional (C4): `minimumReleaseAge` — decided against, see above.

## Validation

- [x] Run `npx --yes --package renovate -- renovate-config-validator .github/renovate.json` — passes,
      exit code 0. It emits `WARN: Config migration necessary` for the **pre-existing**
      `regexManagers`/`fileMatch` deprecations only; the migration diff touches none of the new
      rules, and it warns rather than hard-failing (so the CI step below is safe).
- [x] Dry run: `renovate --platform=local --dry-run=full` against the **local edited config**
      (note: `--dry-run=lookup` against `hmcts/cath-service` would have read `renovate.json` from
      `master`, not the working change). Produced 199 flattened updates across 38 branches.
- [x] The dry-run debug log does **not** dump resolved per-branch `automerge`, so resolution was
      verified authoritatively by calling Renovate's own
      `applyPackageRules` (from the installed `renovate` package) against the real config, driven by
      the 199-update inventory from the dry run. **32/32 cases passed** (originally 25; expanded
      during review follow-up with the `versioning` fix, the extra 0.x value forms and the
      `packageManager`/`resolutions` cases):
      - [x] npm `minor` → `true` (AC1) — govuk-frontend 6.2.0→6.4.0, @prisma/client 7.8.0→7.9.1
      - [x] npm `patch` → `true` (AC1) — vitest 4.1.8→4.1.10, tar, lefthook (devDep)
      - [x] npm `major` → `false` (AC2) — incl. the exact #753 bump, vite, redis, typescript
      - [x] `passport` (0.7.x) → `false` (AC5) — pinned minor, pinned patch, `^0.7.0` peer range,
            `~0.7.0`, `>=0.5.0 <1.0.0` and bare `0`
      - [x] `packageManager` (yarn) and `resolutions` → `false` (H4), while the same package as a
            plain `dependencies` entry still → `true`
      - [x] `Node.js version` group → `false` (AC6) — both nvm and regex managers
      - [x] terraform / github-actions / helmv3 / dockerfile / devcontainer → `false` (AC7)
      - [x] `pin` / `digest` / `rollback` / `replacement` / `lockFileMaintenance` → `false` (E10)
- [x] **Resolved C7 (mixed-updateType groups).** Renovate's source
      (`workers/repository/updates/generate.js:247`) computes
      `config.automerge = config.upgrades.every((upgrade) => upgrade.automerge)` — a branch
      automerges only if **every** upgrade in it does. Verified against real and synthetic groups:
      `prisma-monorepo` (all minor) → `true`; minor+major → `false`; minor+0.x → `false`;
      npm-minor+terraform-minor → `false`; `node.js-version` group → `false`.
      **No extra group-keyed deny rule is needed** and the plan needs no amendment.
- [x] **CORRECTION — an earlier version of this document was wrong about
      `matchCurrentVersion`.** It claimed `matchCurrentVersion: "<1.0.0"` "did not deny" the
      `passport` update. That claim was false and has been retracted. It was a **bug in the
      verification harness, not in Renovate**: `util/package-rules/current-version.js`
      destructures `versioning` from the upgrade and calls `get(versioning)` to obtain a
      versioning API, so with `versioning` absent from the fixture the matcher cannot compare
      anything and silently declines to match. Adding `versioning: "npm"` makes
      `matchCurrentVersion: "<1.0.0"` deny `passport 0.7.0` correctly. Credit to the code review
      (finding H3) for catching this; the fixtures now always set `versioning`.
- [x] **The two matchers are complementary, so both are shipped.** Plan §2.3 said "Do not ship
      both; pick whichever the dry run proves" — that instruction was wrong. Measured coverage of
      each form in isolation:

      | 0.x value form        | `matchCurrentVersion: "<1.0.0"` | `matchCurrentValue` regex |
      |-----------------------|:-------------------------------:|:-------------------------:|
      | `0.7.0` (bare pin)    | denies                          | denies                    |
      | `^0.7.0` (peer range) | **misses**                      | denies                    |
      | `~0.7.0`              | **misses**                      | denies                    |
      | `>=0.5.0 <1.0.0`      | denies                          | **misses**                |
      | `0` (bare major)      | denies                          | **misses**                |

      `matchCurrentVersion` has no single version to compare for a caret/tilde range; the regex
      only anchors on a literal leading `0.`. Neither is sufficient alone, so both rules ship and
      all five forms are now denied. Both leave 1.x+ untouched — `govuk-frontend`, `lodash` and
      `happy-dom` still resolve to `true`.
- [x] **The verification harness is now committed** at `scripts/verify-renovate-automerge.mjs`
      (32 assertions, all passing) and runs in CI. Previously it was an ad-hoc script in `/tmp`
      that was deleted after use — which is precisely why the `versioning` fixture bug above went
      unnoticed. Mutation-tested to confirm it actually fails on regressions: removing the
      pre-1.0.0 rules → 7 failures, exit 1; moving the npm allow rule last (order regression) →
      exit 1; removing the `packageManager`/`resolutions` rule → exit 1; restored config → 32/32,
      exit 0.
- [x] Regression check on the original incident (AC3): on scratch branch `scratch/889-ac3-verify`,
      set `vite-plugin-static-copy` to `4.1.1`, `yarn install`, `yarn workspace @hmcts/web run build`
      → **exited 1** and named the broken references: missing `images/govuk-crest.svg`,
      missing `manifest.json`, `fonts/` with no woff/woff2, and 5 unresolved `/assets/...` URLs
      (4 GDS Transport fonts + `govuk-crest.svg`). Scratch branch deleted; `apps/web/package.json`
      and `yarn.lock` restored to `3.4.0`.
- [~] AC4 (a broken update must not reach master unreviewed) is only **partially** provable, per
      review finding H5. Confirmed `gh api repos/hmcts/cath-service --jq .allow_auto_merge` is
      `false`, and `platformAutomerge: false` + `ignoreTests: false` mean Renovate merges through
      its own path and requires a green branch. **But** `master` has no required status checks
      (C6), and the preview pipeline skips wholesale for dependency PRs that touch neither
      `apps/`, `libs/`, `helm/` nor `yarn.lock` — an all-skipped run presents as green. So the
      guarantee holds for updates that change `yarn.lock` (which is every npm dependency bump, so
      in practice the common case is covered) but is **not** enforced by branch protection.
      Downgraded from `- [x]`; C6 is the fix and remains a follow-up.
- [x] `yarn lint` clean — 65/65 tasks successful.

## CI hardening

- [x] **Moved the validator out of `job.lint.yml` into its own workflow**
      (`.github/workflows/renovate-config.yml`). It was originally added at `job.lint.yml:40`,
      but review finding H1 correctly showed that step **could never run on the PRs it protects**:
      `job.lint.yml` is only reachable via `stage.build.yml:27` ← `workflow.preview.yml:31`, whose
      `detect-code-changes` gate is `paths: "^(yarn\\.lock|apps/|libs/|helm/)"`. `.github/` does
      not match, so a PR touching only `.github/renovate.json` skipped it entirely — including
      this PR. Confirmed by reading `workflow.preview.yml:14-35`.
      Widening that gate to include `.github/` was rejected: it would drag the whole
      build → deploy → smoke-test → e2e pipeline into every workflow-file edit. The new workflow
      instead triggers directly on `paths: ['.github/renovate.json', ...]` for both
      `pull_request` and `push` to master, so it runs exactly when the config changes.
- [x] Added `--no-global` to the validator invocation (review finding H2). Verified the flag
      matters: without it the validator logs `Validating renovate.json as global config` and
      checks the file against the **self-hosted global** schema; with it, `Validating
      .github/renovate.json as repo config`. Both exit 0 here, but the un-flagged form validates
      against the wrong schema, so genuine repo-config mistakes could pass.
- [x] Added the `Verify automerge resolution` step running the committed harness. The validator
      only proves the config is well-formed — it says nothing about what the order-dependent,
      last-match-wins `packageRules` actually resolve to.
- [x] Renovate is installed via `npm install --no-save --prefix "${RUNNER_TEMP}/renovate"` rather
      than added as a devDependency: the package tree is ~333MB and Renovate updates itself, and
      the scratch prefix keeps it out of `yarn.lock`.
- [x] Simulated the whole workflow locally from a clean install (`npm install --no-save --prefix
      /tmp/rvfresh renovate`, 614 packages): validator reports `as repo config` and exits 0, and
      the harness reports 32/32 and exits 0.

## Test suite status (pre-existing failures, unrelated to this change)

This change touches only CI configuration — no application code, so no workspace unit tests were
added and no workspace coverage figure changed. Plan §4's reasoning still holds (a test asserting
`renovate.json`'s own literals proves nothing about Renovate's resolution semantics), but its
conclusion — that therefore nothing should be committed — was wrong. The `applyPackageRules`
harness *is* the meaningful test, and it is now committed and CI-enforced at
`scripts/verify-renovate-automerge.mjs` rather than run once from `/tmp` and thrown away.

Two pre-existing local failures were encountered and confirmed **not** caused by #889 by
re-running with the changes stashed on an otherwise clean tree:

- [x] `EADDRINUSE :::8080` in `apps/web/src/server.test.ts` — all **355 test files / 3667 tests
      pass**; the single error is a port conflict when workspaces run concurrently under turbo.
      Reproduces identically with this change stashed.
- [x] Broken nested `vitest` installs (missing `dist/`) in 8 workspaces: `@hmcts/excel-generation`,
      `@hmcts/notification`, `@hmcts/pdda-html-upload`, `@hmcts/upper-tribunal-common`,
      `@hmcts/magistrates-adult-court-list`, and the three UT chamber list packages. Root cause is a
      pre-existing pin mismatch — 3 workspaces pin `vitest 4.1.9` and 3 pin `4.1.8` while root pins
      `4.1.10`, forcing nested installs. Introduced in `0fcb3af1` (2026-07-09), long before this
      ticket. `rm -rf node_modules && yarn install` and a yarn cache clean did not repair them.
      Not fixed here — out of scope for #889; worth its own ticket.
- [x] Everything else passes: 56/57 remaining workspaces green; `yarn dev` boots both servers
      (web `https://localhost:8080`, api `http://localhost:3001`).

## Post-merge follow-up

- [ ] On the first automerged Renovate PR, confirm `Build / Build Images / Build & Publish web`
      **ran** rather than skipped — this is what executes the `verify-assets` guard (plan E5).
- [ ] Raise C6 with a repo admin: enable required status checks on `master` for at least
      `Build / Test / Test Changed Packages`, `Build / Lint / Lint Changed Packages` and
      `Build / Build Images / Build & Publish web`.
- [ ] Raise a separate ticket for C5 (`regexManagers` → `customManagers` + `managerFilePatterns`).
- [ ] Raise a separate ticket for the `.nvmrc` 24.17.0 vs `Dockerfile node:22-alpine` mismatch
      noted in C3.
- [ ] Raise a separate ticket for the mismatched `vitest` pins (6 workspaces off root's `4.1.10`).
- [ ] Optional: revisit C4 (`minimumReleaseAge`) as a team decision.

## PR description must state

- [x] The interpretation chosen for C1 and why — minor + patch, confirmed by the issue author.
- [x] That `packageManager` and `resolutions` bumps are excluded from automerge, and why.
- [x] That the automerge resolution harness is committed and CI-enforced, and that the
      `renovate-config-validator` step lives in its own workflow because `job.lint.yml` is
      unreachable for `.github/`-only PRs.
- [x] The residual risks from plan §5 (minor/patch can still break; `verify-assets` covers one
      failure class only and runs only in the web image build; no human reviews automerged PRs;
      `master` has no required status checks).
- [x] That the dry run **was** actually run, against the local edited config, and that per-branch
      resolution was verified via Renovate's own `applyPackageRules` (25/25) rather than by
      inspection alone.
- [x] That **both** 0.x matcher forms are shipped because they are complementary — and that the
      earlier claim `matchCurrentVersion: "<1.0.0"` "does not work" was a harness fixture bug
      (missing `versioning`), not a Renovate limitation.
- [x] That AC4 is only partially enforced: `master` has no required status checks, so branch
      protection is not what stops a broken update. C6 is the fix.
