# #563 Technical Plan: Pre-commit Hook for Lint and Type Checking

## Technical Approach

Install `lefthook` as the git hooks manager and configure a pre-commit hook that:
1. Runs Biome in write mode on staged files to auto-fix lint and formatting issues, then re-stages the fixed files
2. Runs a TypeScript type check across all workspaces to catch type errors that Biome cannot fix

### Why lefthook

- Fast: runs commands in parallel by default
- YAML-based configuration - no JavaScript required
- No `postinstall` side-effect scripts of its own; we control installation explicitly
- Works cleanly with Yarn 4 PnP/node_modules setups
- Supports `glob` filtering so the Biome step only runs when relevant files are staged
- Actively maintained and widely adopted in monorepo setups

### Alternative considered: husky

Husky requires a `prepare` script and shell scripts per hook file. It adds more boilerplate and its shell-script approach is harder to maintain than a single YAML file. Lefthook is a better fit here.

---

## Implementation Details

### 1. Add lefthook dev dependency

Add to root `package.json` devDependencies:

```json
"lefthook": "1.11.14"
```

Pin to a specific version per the project's pinned-dependency convention.

### 2. Update postinstall script

The existing `postinstall` in root `package.json` currently runs `yarn db:generate`. Update it to also install the git hooks:

```json
"postinstall": "yarn db:generate && lefthook install"
```

This ensures every developer gets the hooks installed automatically after `yarn install`.

### 3. Create lefthook.yml at repo root

```yaml
pre-commit:
  parallel: false
  commands:
    biome-check:
      glob: "*.{ts,tsx,js,jsx}"
      run: npx @biomejs/biome check --write {staged_files}
      stage_fixed: true
    tsc:
      run: yarn tsc --noEmit --project tsconfig.json
```

Key configuration choices:

- `parallel: false`: Biome must run and re-stage files before the TypeScript check runs. Running them in parallel would risk tsc seeing the pre-fix state.
- `glob`: limits the Biome step to JS/TS file types only; commits touching only `.yml`, `.md`, `.json` etc. skip it entirely.
- `stage_fixed: true`: lefthook automatically re-stages any files that Biome modified. This replaces the need for a manual `git add` step.
- `tsc`: runs a project-wide type check. TypeScript errors cannot be auto-fixed; if tsc exits non-zero the commit is blocked and the developer sees the error output.

### 4. Root tsconfig.json scope

The `tsc --noEmit` command references the root `tsconfig.json`. Confirm it has `references` or `include` patterns that cover all workspaces. If not, a composite project reference setup may be needed - but this is likely already in place given the existing turbo type-check pipeline.

---

## Error Handling and Edge Cases

| Scenario | Behaviour |
|---|---|
| Biome fixes one or more files | Files are auto-staged by lefthook (`stage_fixed: true`); commit proceeds |
| Biome finds an issue it cannot auto-fix | Biome exits non-zero; commit is blocked with Biome's error output |
| TypeScript error exists | `tsc` exits non-zero; commit is blocked with the TS error output |
| No `.ts/.tsx/.js/.jsx` files staged | `biome-check` step is skipped; `tsc` still runs |
| Merge commit | lefthook skips all hooks during `git merge` by default |
| Rebase | lefthook skips hooks during interactive rebase by default |
| Developer has not run `yarn install` | Hooks are not installed; no protection. Mitigated by the `postinstall` script running on every `yarn install` |

---

## Acceptance Criteria Mapping

| Requirement | Implementation |
|---|---|
| Automatically fix any lint issue on commit | Biome `--write` auto-fixes lint and formatting on staged files |
| Automatically fix any TypeScript issue on commit | **Not fully achievable**: TypeScript type errors cannot be auto-fixed by tooling. The hook runs `tsc --noEmit` and blocks the commit if errors exist, forcing the developer to fix them manually before the commit lands. |
| Per-commit hook | Pre-commit hook via lefthook |

---

## Open Questions / Clarifications Needed

**TypeScript errors cannot be silently auto-fixed.** The ticket says "automatically fix any typescript ... issue" but tsc only reports errors - it does not transform code to resolve them. The plan above blocks the commit on TS errors rather than warning and allowing it through. This is the safer default for a shared codebase.

If the intent was only to auto-fix style/formatting issues (which Biome handles) and merely surface TS errors without blocking, the `tsc` command can be changed to `run: yarn tsc --noEmit --project tsconfig.json || true`. Clarification from the ticket author is recommended before implementing.
