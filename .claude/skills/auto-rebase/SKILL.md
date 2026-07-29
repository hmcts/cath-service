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

If `git branch --show-current` prints nothing, `HEAD` is detached — it exits 0 either way, so
check for the empty string rather than the exit status. Stop there: every later step needs a
branch name (the backup tag, the stacked-branch scan, the push, and recovery), and a rebase on a
detached `HEAD` leaves the result reachable only through the reflog. Say so and ask which branch
to check out.

`--update-refs` (step 5) needs Git ≥ 2.38 (`git --version`). On older Git, do a plain rebase and
re-point each stacked branch manually afterwards.

## 2. Preflight

Run `git status`. Stop and ask if a merge/rebase/cherry-pick is already in progress (abort vs
continue). If the tree is dirty, confirm before stashing:

```bash
git stash push -u -m "pre-rebase stash"
git rev-parse stash@{0}          # record this SHA as {stash_sha} for step 7
```

Record the SHA, not `stash@{0}`. Indices shift as entries are added, so if anything else stashes
in between — a `pop` that conflicts, another tool, a second session — `stash@{0}` is no longer
yours and a bare `git stash pop` in step 7 restores someone else's work and drops it. The SHA
keeps pointing at the same entry regardless.

If you stash, you own restoring it — step 7 is not optional, and the rebase is not "done" while
the user's uncommitted work is still parked.

Confirm the rebase is actually needed — `behind  ahead` relative to the base:

```bash
git rev-list --left-right --count origin/{base_branch}...HEAD
```

If `behind` is 0 the branch is already current. Report that and stop — do not tag or force-push
for no reason.

Then find out what will conflict, before rewriting anything:

```bash
BASE_REF=origin/{base_branch} .claude/skills/auto-rebase/scripts/check-conflicts.sh
BASE_REF=origin/{base_branch} .claude/skills/auto-rebase/scripts/check-conflicts.sh {branch}
.claude/skills/auto-rebase/scripts/check-conflicts.sh              # BASE_REF defaults to origin/master
```

It reports the files a merge would conflict in and exits 0 clean / 1 conflicts / 2 if it could
not run. `git merge-tree` does the work in the object database, so nothing is checked out, no ref
moves, and it is safe to run before asking for confirmation.

Use it to set expectations, not as a guarantee. It predicts **one merge**, while a rebase replays
each commit separately — so a branch reported clean can still stop mid-rebase, and a conflicted
one can stop on files the report never listed. Reach for `--rebase-merges` planning and `rerere`
(step 5) when it lists many files across many commits.

The `--json` mode exists for `.github/workflows/conflict-check.yml`, which runs the same script
per open PR after every push to master. Keep the two modes' output separate when editing it.

## 3. Back up, then choose the mode

The tag covers the current branch only. `--update-refs` rewrites every stacked branch too, so
also snapshot all local ref positions — without it a mid-rebase failure leaves the stacked
branches recoverable only via reflog:

```bash
git tag -a {branch}-rebase-backup-$(date +%Y%m%d-%H%M%S) -m "pre-rebase backup" HEAD
refs_file=$(git rev-parse --git-path pre-rebase-refs.txt)
git for-each-ref --format='%(refname:short) %(objectname)' refs/heads > "$refs_file"
git for-each-ref --format='remote %(refname:short) %(objectname)' refs/remotes/origin >> "$refs_file"
```

The `remote` lines record what each branch pointed at on the remote before the rebase. Step 9
leases its force-pushes against those SHAs — read `{remote_oid}` from this file rather than
re-reading `origin/<branch>` at push time, which may have moved:

```bash
awk '$1=="remote" && $2=="origin/{branch}" {print $3}' "$refs_file"   # -> {remote_oid}
```

They are tagged with a leading `remote` field rather than filtered on the `origin/` prefix later,
because `for-each-ref refs/remotes/origin` also emits a bare `origin` line for the remote's `HEAD`
which a `^origin/` pattern does not match.

Write it inside the repo's git dir, not `/tmp/pre-rebase-refs.txt`. A fixed world-writable path
is overwritten by any concurrent rebase, and if something has pre-created it as a symlink the
redirect follows that link and truncates whatever it points at. `--git-path` also resolves
per-worktree (`.git/worktrees/<name>/`), so parallel worktrees each get their own file.

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
    grep -qxF "$br" <<<"$worktreed" && note=" [checked out in another worktree — will NOT move]"
    echo "stacked: $br ($(git rev-parse --short "$br"))$note"
  fi
done
```

Git refuses to move a branch checked out elsewhere, so `--update-refs` skips those. Flag them
for manual handling in steps 8 and 9. `grep -qxF` matches the name literally — without `-F` a
branch called `a.b` matches a worktree on `axb` and gets wrongly reported as immovable.

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
exists (`grep '"X"' package.json`) — stale headers naming long-gone scripts are common.

`yarn.lock` has a dedicated resolver — do not hand-merge it. Resolve `package.json` first (the
union of both sides' dependency entries), then let Yarn rebuild the lock from it:

```bash
corepack yarn install --mode=update-lockfile   # prints "YN0048: Automatically fixed merge conflicts"
```

It reads both sides of the conflict from the index, re-resolves, and writes correct `checksum:`
lines. `--mode=update-lockfile` skips the link step, so nothing is installed into
`node_modules`. It needs the registry: **if it cannot reach the network it still strips the
conflict markers and then fails**, leaving a lockfile that looks resolved but has entries with no
checksum. Check the exit status, not just the absence of markers. To undo a failed run and get the
conflict back:

```bash
git checkout --merge -- yarn.lock
```

For a generated file with no working regeneration command at all, stop and ask rather than
hand-reconstructing it. Files carrying integrity metadata — checksums, hashes, content-addressed
identifiers — cannot be hand-merged into something equivalent to real generator output, and a
plausible-looking hand merge is worse than an unresolved conflict because it passes review.

Some conflicts are mechanical to resolve but mean the branch is obsolete. Before resolving, ask
what capability the branch adds and whether the base now provides it another way — a branch adding
one tool while upstream adopted a different one for the same job, or creating a file whose logic
upstream has put elsewhere. Keeping both sides of such a `package.json` conflict passes lint and
tests and still ships two competing implementations. Say so and ask whether to close the branch
rather than resolving it; that is the author's call, not a merge decision.

A modify/delete conflict is a decision, not a merge: upstream deleted the file, this branch
changed it. Check whether anything still references the symbol
(`grep -rn 'theSymbol' <src> --include='*.ts'`) — but treat "no references" as evidence, not as
the answer, since the feature branch's caller may not be written yet. Ask which side wins rather
than inferring it.

Stage only the files you resolved, then continue — `--continue` opens an editor for the commit
message, so suppress it:

```bash
git add -- <file...>
GIT_EDITOR=true git rebase --continue
```

Keep the `--`. Conflicted paths come from `git diff` output, not from you, and a repo can contain
a file called `-p` or `HEAD`; without `--`, git reads those as an option or a revision instead of
a path. Quote each path too — a filename with a space is one argument, not two.

If resolving leaves nothing to commit — the replayed commit's changes are already upstream —
the merge backend (Git's default) **drops that commit for you** and carries on. Nothing to do.

Never reach for `git rebase --skip` just because the tree looks clean. A clean tree does not
mean the pending commit is empty: the rebase also stops with no unmerged files when it refuses
to apply a commit at all ("Your local changes … would be overwritten by merge", followed by
"Could not execute the todo command"). Skipping there silently deletes real work and the rebase
still reports success. Before ever skipping, confirm the pending commit is genuinely empty:

```bash
git log -1 --format='%h %s' REBASE_HEAD              # what is pending
git diff --name-only --diff-filter=U                 # empty => not a conflict stop
git cherry HEAD REBASE_HEAD                          # '-' prefix => already upstream
```

Only if `git cherry` prefixes the commit with `-` is `GIT_EDITOR=true git rebase --skip` safe. A
`+` means the change is not upstream and skipping would delete it. `git cherry` compares patch-ids
rather than paths, so it is unaffected by how the commit's filenames are spelled — do not
reconstruct this check by collecting paths into a shell variable and passing them as a pathspec,
because a filename containing a space splits into two pathspecs that match nothing, and `git diff
--quiet` then exits 0 and wrongly reports the commit as empty.

If it exits non-zero for another reason, or the todo command could not be executed at all, the
commit was rescheduled — re-read the rebase output, fix that cause, and run
`GIT_EDITOR=true git rebase --continue`. Do not skip it.

Repeat until the rebase finishes. `git rebase --abort` backs out safely and is always preferred
over `git reset --hard`. If resolution gets too risky, stop and propose aborting.

## 7. Restore the stash

If step 2 stashed anything, restore it now — before pushing, so the checks in step 8 run against
the tree the user actually had:

Use the `{stash_sha}` recorded in step 2 — never a bare `git stash pop`, which takes whatever is
at `stash@{0}` and may not be yours:

```bash
git stash list                                     # confirm the entry is still there
git stash apply --index {stash_sha}                # apply the exact entry, keeping it in the list
```

`--index` restores the staged/unstaged split. Without it everything comes back unstaged, so work
the user had deliberately staged is silently merged in with work they had not. If git answers
`conflicts in index. Try without --index`, retry as plain `git stash apply {stash_sha}` and tell
the user their staging was flattened — the content is all there, but they will need to re-stage.

Then, only once it has applied cleanly, drop that same entry. `git stash drop` takes an index
rather than a SHA, so resolve the SHA to its current index instead of assuming it is still 0:

```bash
git stash list --format='%gd %H' | awk -v s={stash_sha} '$2==s{print $1}'   # -> stash@{N}
git stash drop stash@{N}
```

`apply` can conflict, just as `pop` would. If it does, resolve as in step 6 and `git add` the
results, then leave the entry alone — do **not** drop it, because it is the only copy of that
work. `apply` (unlike `pop`) never removes the entry, so a failure here cannot lose it. If you
cannot resolve the conflict, say so and leave the stash in place rather than discarding it.

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

Lease each push against the pre-rebase remote SHA recorded in step 3 (`{remote_oid}`):

```bash
git push --force-with-lease="refs/heads/{branch}:{remote_oid}" origin "HEAD:{branch}"
git push --force-with-lease="refs/heads/{stacked_branch}:{remote_oid}" \
  origin "{stacked_branch}"                         # repeat per moved stacked branch
```

Do not use the bare `--force-with-lease`. It leases against your local
`refs/remotes/origin/{branch}`, which is a cache of what the remote looked like at your last
fetch — so it protects you only while that cache is stale. Any fetch in between (your IDE, a
`git pull` in another worktree, a tooling background job) silently updates the cache to include
the very commit you are about to overwrite, and the lease then passes: verified by fetching
between the rebase and the push, which turned a correctly-refused push into a successful forced
one that discarded a colleague's commit. The explicit `<ref>:<oid>` form pins the check to the
SHA you actually reasoned about, so a concurrent push is rejected regardless of fetch timing.

Quote the refspecs. Git rejects branch names containing spaces, but `;`, `|`, `&`, backticks and
`$(...)` are all legal in a branch name — unquoted, the shell acts on them before git sees them.

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

If `--update-refs` moved stacked branches, each one needs restoring to its recorded position from
the ref file written in step 3. Show the diff first, then move only the branches that changed:

```bash
refs_file=$(git rev-parse --git-path pre-rebase-refs.txt)
git for-each-ref --format='%(refname:short) %(objectname)' refs/heads \
  | diff <(grep -v '^remote ' "$refs_file") -
git branch -f -- {stacked_branch} {old_sha}   # repeat per branch, using the recorded SHA
```

Drop the `remote` lines — they are the pre-rebase remote positions step 9 leases against, and
diffing them against local heads reports every one as a difference.

If the tag or the ref file is gone, the old commits are still in the reflog for the gc window:

```bash
git reflog show {branch}   # find the entry immediately before "rebase (start)"
```

**Already force-pushed?** The remote is recoverable the same way — re-push the restored refs with
`--force-with-lease`. Confirm before doing so, and note that anyone who pulled the rewritten
history will need to reset too.
