---
name: auto-rebase
description: Rebase the current branch onto the latest origin/{base_branch}, resolving conflicts deliberately and asking when intent is ambiguous. Takes a backup ref first, confirms before any history rewrite, pushes with --force-with-lease, and moves stacked branches with --update-refs.
disable-model-invocation: true
---

# auto-rebase

Rebase the current branch onto the latest `origin/{base_branch}`, resolving conflicts
deliberately rather than by guesswork.

## Hard rules

- Operate on the current branch. Never create or switch branches unless explicitly asked.
- Before any history-rewriting command (`git rebase`, `git push --force*`), print the exact
  command and wait for confirmation.
- Create a local backup tag before starting. Never push backup refs.
- Use `git push --force-with-lease`, never plain `--force`.
- Prefix every rebase command that can open an editor with `GIT_EDITOR=true` — an editor
  prompt hangs a non-interactive session.
- If the right conflict resolution is unclear, stop and ask. Do not invent product behaviour.

## 1. Identify base and branch

```bash
git branch --show-current
gh repo view --json defaultBranchRef --jq '.defaultBranchRef.name'   # if base not given
git fetch origin
```

`--update-refs` (step 5) needs Git ≥ 2.38 (`git --version`). On older Git, do a plain rebase and
re-point each stacked branch manually afterwards.

## 2. Preflight

Run `git status`. Stop and ask if a merge/rebase/cherry-pick is already in progress (abort vs
continue). If the tree is dirty, confirm before stashing:

```bash
git stash push -u -m "pre-rebase stash"
```

If you stash, you own restoring it — step 7 is not optional, and the rebase is not "done" while
the user's uncommitted work is still parked.

Confirm the rebase is actually needed — `behind  ahead` relative to the base:

```bash
git rev-list --left-right --count origin/{base_branch}...HEAD
```

If `behind` is 0 the branch is already current. Report that and stop — do not tag or force-push
for no reason.

## 3. Back up, then choose the mode

The tag covers the current branch only. `--update-refs` rewrites every stacked branch too, so
also snapshot all local ref positions — without it a mid-rebase failure leaves the stacked
branches recoverable only via reflog:

```bash
git tag -a {branch}-rebase-backup-$(date +%Y%m%d-%H%M%S) -m "pre-rebase backup" HEAD
git for-each-ref --format='%(refname:short) %(objectname)' refs/heads > /tmp/pre-rebase-refs.txt
```

Record the tag as `{backup_ref}` and keep the ref file path — both are needed for Recovery. If
the branch contains merge commits, ask whether to preserve
(`--rebase-merges`) or flatten them:

```bash
git rev-list --count --merges origin/{base_branch}..HEAD
```

## 4. Detect stacked branches

Local branches pointing at intermediate commits in the rewritten range — common with phased
`NN-description` stacks. A plain rebase orphans them (and every PR built on them) on the old
commits; `--update-refs` moves them onto the rewritten ones instead. Report the list before
rebasing.

Substitute the real base branch name for `{base_branch}` before running:

```bash
cur=$(git branch --show-current)
worktreed=$(git worktree list --porcelain | awk '/^branch /{print substr($2, 12)}')
git for-each-ref --format='%(refname:short)' refs/heads | while read -r br; do
  [ "$br" = "$cur" ] && continue
  if git merge-base --is-ancestor "$br" HEAD \
     && ! git merge-base --is-ancestor "$br" origin/{base_branch}; then
    note=""
    grep -qx "$br" <<<"$worktreed" && note=" [checked out in another worktree — will NOT move]"
    echo "stacked: $br ($(git rev-parse --short "$br"))$note"
  fi
done
```

Git refuses to move a branch checked out elsewhere, so `--update-refs` skips those. Flag them
for manual handling in steps 8 and 9.

## 5. Run the rebase (needs confirmation)

Print the exact command, wait for confirmation, then run it. Default to `--update-refs`:

```bash
GIT_EDITOR=true git rebase --update-refs origin/{base_branch}
GIT_EDITOR=true git rebase --rebase-merges --update-refs origin/{base_branch}   # if preserving merges
```

For a long multi-commit rebase where the same hunk will conflict on every replayed commit, offer
`git config rerere.enabled true` first — it records each resolution and replays it automatically.
This writes repo config, so ask before setting it.

## 6. Conflict loop

List conflicted files explicitly rather than eyeballing `git status`:

```bash
git diff --name-only --diff-filter=U
```

For each file, read the surrounding code and intent, then prefer minimal mechanical resolutions:
keep upstream changes unless the feature branch deliberately supersedes them, and regenerate
lockfiles/codegen output instead of hand-editing hunks. If intent is ambiguous, ask one targeted
question ("keep upstream behaviour X or feature behaviour Y?", "is this file generated and safe
to regenerate?").

Before trusting a generated file's own "regenerate with: X" header, check that `X` actually
exists (`grep '"X"' package.json`) — stale headers naming long-gone scripts are common. When
there is no working regeneration command, hand-resolve to what regeneration *would* produce:
take upstream's versions (never revert an upstream bump), re-apply the entries the feature branch
added, and preserve the file's existing ordering and formatting so the next real regeneration
produces no spurious diff.

A modify/delete conflict is a decision, not a merge: upstream deleted the file, this branch
changed it. Check whether anything still references the symbol
(`grep -rn 'theSymbol' <src> --include='*.ts'`) — but treat "no references" as evidence, not as
the answer, since the feature branch's caller may not be written yet. Ask which side wins rather
than inferring it.

Stage only the files you resolved, then continue — `--continue` opens an editor for the commit
message, so suppress it:

```bash
git add <file...>
GIT_EDITOR=true git rebase --continue
```

If resolving leaves nothing to commit — the replayed commit's changes are already upstream —
the merge backend (Git's default) **drops that commit for you** and carries on. Nothing to do.

Never reach for `git rebase --skip` just because the tree looks clean. A clean tree does not
mean the pending commit is empty: the rebase also stops with no unmerged files when it refuses
to apply a commit at all ("Your local changes … would be overwritten by merge", followed by
"Could not execute the todo command"). Skipping there silently deletes real work and the rebase
still reports success. Before ever skipping, confirm the pending commit is genuinely empty:

```bash
git log -1 --format='%h %s' REBASE_HEAD                       # what is pending
git diff --name-only --diff-filter=U                          # empty => not a conflict stop
paths=$(git diff-tree --no-commit-id --name-only -r REBASE_HEAD)
git diff --quiet REBASE_HEAD HEAD -- $paths                    # exit 0 => already upstream
```

Only if that last command exits 0 is `GIT_EDITOR=true git rebase --skip` safe. If it exits
non-zero the rebase stopped for another reason — re-read the rebase output, fix that cause, and
run `GIT_EDITOR=true git rebase --continue`. If the todo command could not be executed at all,
the commit was rescheduled and continuing retries it; do not skip it.

Repeat until the rebase finishes. `git rebase --abort` backs out safely and is always preferred
over `git reset --hard`. If resolution gets too risky, stop and propose aborting.

## 7. Restore the stash

If step 2 stashed anything, restore it now — before pushing, so the checks in step 8 run against
the tree the user actually had:

```bash
git stash list                 # confirm "pre-rebase stash" is still there
git stash pop
```

`pop` replays onto rewritten commits and can conflict itself. If it does, resolve as in step 6
and `git add` the results — but do **not** `git stash drop`: a conflicted `pop` keeps the entry,
which is the only copy of that work. If you cannot resolve it, say so and leave the stash in
place rather than discarding it.

## 8. Verify

```bash
git log --oneline --decorate origin/{base_branch}..HEAD
```

Each stacked branch from step 4 should appear as a decoration on the rewritten commits, and
`--update-refs` prints an "Updated the following refs" summary. Note any that did not move.

If the rebase touched source files, run the repo's checks (`yarn test`, `yarn lint`) before
pushing — a conflict-free rebase is not a correct one. When upstream changes a function's
signature and the feature branch adds a caller using the old one, the two commits touch
different files, so Git merges them cleanly with no markers and the branch only breaks at
compile time. Type errors or test failures here are rebase fallout to fix, not pre-existing
breakage to wave through; if you cannot tell which, check out the backup ref and compare.

Prefer the repo's own script (`yarn lint`, `yarn test`) — it already carries the right config.
To type-check a narrower set of files, call the repo-local binary directly:

```bash
node_modules/.bin/tsc --noEmit -p tsconfig.json          # whole project
```

Two traps when narrowing scope: bare `npx tsc` can fetch an unrelated decoy package instead of
the compiler, and passing file paths on the command line makes `tsc` ignore `tsconfig.json`
entirely and fail with `TS5112`. If you must check files outside any project config, copy them to
a scratch directory and compile there with explicit flags:

```bash
node_modules/.bin/tsc --noEmit --strict --target es2022 \
  --module nodenext --moduleResolution nodenext --lib es2022,dom <files...>
```

## 9. Push (needs confirmation)

`--update-refs` only moves local refs, and a normal push updates the current branch only — each
stacked branch that exists on origin must be force-pushed individually. Print every command and
wait for confirmation.

```bash
git push --force-with-lease origin HEAD:{branch}
git push --force-with-lease origin {stacked_branch}   # repeat per moved stacked branch
```

Branches skipped because they are checked out in another worktree were never moved — verify
before pushing them.

## Recovery

Show the exact command and get confirmation before running anything destructive (`git reset
--hard`, branch deletion).

**Mid-rebase** — nothing is lost yet, and this needs no backup ref:

```bash
git rebase --abort
```

**After the rebase finished**, restore the current branch from the step 3 tag:

```bash
git reset --hard {backup_ref}
```

If `--update-refs` moved stacked branches, each one needs restoring to its recorded position
from `/tmp/pre-rebase-refs.txt`. Show the diff first, then move only the branches that changed:

```bash
git for-each-ref --format='%(refname:short) %(objectname)' refs/heads | diff /tmp/pre-rebase-refs.txt -
git branch -f {stacked_branch} {old_sha}   # repeat per branch, using the recorded SHA
```

If the tag or the ref file is gone, the old commits are still in the reflog for the gc window:

```bash
git reflog show {branch}   # find the entry immediately before "rebase (start)"
```

**Already force-pushed?** The remote is recoverable the same way — re-push the restored refs with
`--force-with-lease`. Confirm before doing so, and note that anyone who pulled the rewritten
history will need to reset too.
