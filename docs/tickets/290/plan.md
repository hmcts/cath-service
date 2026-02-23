# #290: Create hook for lint style check and any TypeScript errors - Technical Plan

## 1. Technical Approach

### High-Level Strategy

The goal is to prevent developers from pushing code that contains lint errors or TypeScript type errors. The implementation has two parts:

1. **A `pre-push` git hook** (via Husky v9) that runs lint and TypeScript checks before any `git push` completes. Using `pre-push` rather than `pre-commit` ensures the check runs once per push event rather than on every single commit, which is a better trade-off between feedback speed and friction.

2. **`typecheck` scripts across all workspace packages** so that Turbo can orchestrate type-checking the same way it orchestrates linting and building today.

### Why `pre-push` and not `pre-commit`

The acceptance criteria say "before pushing to Github". A `pre-commit` hook runs on every `git commit`, which would add latency to every incremental save. A `pre-push` hook runs only when the developer attempts to push a branch, which is the right moment to enforce quality gates before the code reaches the remote and triggers a CI build.

### Why Husky v9

Husky is the de facto standard for managing git hooks in Node.js monorepos. Version 9 uses a shell-less hook format (no POSIX shell shebang required) and integrates with `yarn prepare` so hooks are installed automatically after `yarn install`. No global binary is needed.

### Turbo task naming

The existing `turbo.json` already has a `type-check` task definition (hyphenated). Renaming it to `typecheck` (no hyphen) matches the npm script convention used everywhere else in this repo (`lint`, `lint:fix`, `test`) and avoids a mismatch between the turbo task name and the package script name. A Turbo task name must exactly match the package script name it runs.

---

## 2. Implementation Details

### 2.1 Install Husky

Add Husky as a root devDependency. Pin to a specific version consistent with the project's pinned-dependency convention.

```bash
yarn add --dev husky@9.1.7 -W
```

### 2.2 Add `prepare` script to root `package.json`

The `prepare` lifecycle script runs automatically after `yarn install`. Husky uses this to install the git hooks into `.git/hooks/`.

```json
// package.json (root) — add to "scripts"
"prepare": "husky"
```

### 2.3 Initialise Husky

```bash
yarn husky init
```

This creates the `.husky/` directory and a default `pre-commit` file. The `pre-commit` file created by `init` should be deleted or left empty — this project uses `pre-push`.

### 2.4 Create `.husky/pre-push`

```sh
yarn lint:changed
yarn typecheck:changed
```

Using the `*:changed` variants scopes the checks to packages that have changed relative to `HEAD^1`. This keeps the hook fast on large branches while still catching errors in the code being pushed. See section 3 for trade-offs.

### 2.5 Add `typecheck` and `typecheck:changed` scripts to root `package.json`

```json
// package.json (root) — add to "scripts"
"typecheck": "turbo typecheck",
"typecheck:changed": "turbo typecheck --filter='...[HEAD^1]'"
```

### 2.6 Update `turbo.json`

Rename the `type-check` task to `typecheck` so the Turbo task name matches the npm script name that will be added to each package.

```json
// turbo.json — replace "type-check" with "typecheck"
"typecheck": {
  "dependsOn": ["^build"],
  "outputs": []
}
```

Remove the old `"type-check"` entry entirely.

### 2.7 Add `typecheck` script to every workspace package

Each package needs `"typecheck": "tsc --noEmit"` added to its `scripts`. The `--noEmit` flag runs the TypeScript compiler for type-checking only — it does not write output files, so it does not interfere with the existing `build` script.

**Packages requiring the addition:**

Apps:
- `apps/api/package.json`
- `apps/crons/package.json`
- `apps/postgres/package.json`
- `apps/web/package.json`

Libs:
- `libs/account/package.json`
- `libs/admin-pages/package.json`
- `libs/api/package.json` (package name: `@hmcts/blob-ingestion`)
- `libs/auth/package.json`
- `libs/cloud-native-platform/package.json`
- `libs/location/package.json`
- `libs/notification/package.json`
- `libs/notifications/package.json`
- `libs/public-pages/package.json`
- `libs/publication/package.json`
- `libs/redis/package.json`
- `libs/simple-router/package.json`
- `libs/subscriptions/package.json`
- `libs/system-admin-pages/package.json`
- `libs/verified-pages/package.json`
- `libs/web-core/package.json`

List-type sub-packages:
- `libs/list-types/administrative-court-daily-cause-list/package.json`
- `libs/list-types/care-standards-tribunal-weekly-hearing-list/package.json`
- `libs/list-types/civil-and-family-daily-cause-list/package.json`
- `libs/list-types/common/package.json`
- `libs/list-types/court-of-appeal-civil-daily-cause-list/package.json`
- `libs/list-types/london-administrative-court-daily-cause-list/package.json`
- `libs/list-types/rcj-standard-daily-cause-list/package.json`

The script to add in each case:

```json
"typecheck": "tsc --noEmit"
```

**Note on `apps/postgres`**: Its `build` script runs `yarn collate && prisma generate && tsc`. The `typecheck` script should still be `tsc --noEmit` — the Prisma client must already exist (generated during `build` or `yarn db:generate`) for the TypeScript checker to resolve `@prisma/client` imports. Turbo's `dependsOn: ["^build"]` on the `typecheck` task ensures dependencies are built before type-checking runs.

### 2.8 Example final hook file

```
# .husky/pre-push
yarn lint:changed
yarn typecheck:changed
```

No shebang line is needed in Husky v9 — Husky executes hook files directly via `sh`.

---

## 3. Error Handling & Edge Cases

### Bypassing the hook

Developers can bypass the hook when genuinely necessary (e.g. pushing a WIP branch or a fix for CI infrastructure itself):

```bash
git push --no-verify
```

This should be used sparingly and only when the developer understands why the check is failing and has a plan to fix it.

### Performance

Running `yarn lint:changed` and `yarn typecheck:changed` on every push filters to only the packages touched since the previous commit on the branch (`[HEAD^1]`). For a typical feature branch touching 1–3 packages, this should complete in under 30 seconds. Turbo's caching means that if no files have changed in a package since the last run, the result is returned instantly from cache.

If developers find full runs are needed (e.g. to catch cross-package type errors arising from interface changes in a dependency), replace the hook with:

```sh
yarn lint
yarn typecheck
```

### First-time setup after cloning

Running `yarn install` triggers the `prepare` script, which calls `husky` and installs the hooks automatically. No manual step is needed.

### CI environments

CI runners typically skip `prepare` scripts or run in non-interactive mode where git hooks are not triggered. The hooks are a developer-side guard only; the CI pipeline remains the authoritative quality gate.

### Existing TypeScript errors

Before this hook goes live, `yarn typecheck` should be run across the full monorepo and any existing errors resolved. If pre-existing errors are found and cannot be fixed immediately, they must be addressed before the hook is enabled — otherwise every push will be blocked for all developers.

---

## 4. Acceptance Criteria Mapping

| Acceptance Criterion | Implementation |
|---|---|
| No lint errors before pushing to Github | `yarn lint:changed` runs in the `pre-push` hook via Biome, failing the push on any lint violation |
| No TypeScript errors before pushing to Github | `yarn typecheck:changed` runs in the `pre-push` hook via `tsc --noEmit`, failing the push on any type error |

---

## 5. CLARIFICATIONS NEEDED

**Full vs changed-only checks in the hook**

The current plan uses `lint:changed` and `typecheck:changed` (scoped to packages changed since `HEAD^1`). This is fast but has a gap: if package A's types change and package B depends on A, but only A was committed in the last commit, B will not be re-checked.

The safer alternative is to run the full `yarn lint` and `yarn typecheck` on every push. With Turbo caching, subsequent runs on unchanged packages are near-instant, but the first run after a dependency change may take longer.

**Decision needed**: Should the hook run full workspace checks (`yarn lint && yarn typecheck`) or changed-only checks (`yarn lint:changed && yarn typecheck:changed`)?
