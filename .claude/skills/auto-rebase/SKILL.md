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
- Print the exact command and wait for confirmation before any history rewrite (`git rebase`,
  `git push --force*`).
- Back up locally before starting (step 3). Never push backup refs.
- `--force-with-lease` with an explicit SHA, never plain `--force`.
- Prefix any rebase command that can open an editor with `GIT_EDITOR=true` — a prompt hangs a
  non-interactive session.
- If the right resolution is unclear, stop and ask. Do not invent product behaviour.

## 1. Identify base and branch

```bash
git branch --show-current
gh repo view --json defaultBranchRef --jq '.defaultBranchRef.name'   # if base not given
git fetch origin
```

Empty output from `--show-current` means detached `HEAD` — it exits 0 either way, so test the
string. Stop and ask which branch to check out: every later step needs a branch name, and the
result would be reachable only through the reflog.

`--update-refs` (step 5) needs Git ≥ 2.38. On older Git, rebase plainly and re-point stacked
branches by hand.

## 2. Preflight

`git status`. Stop and ask if a merge/rebase/cherry-pick is already in progress. If the tree is
dirty, confirm, then stash and record the SHA — `stash@{0}` shifts if anything else stashes, and a
bare `pop` in step 7 would restore someone else's work and drop it:

```bash
git stash push -u -m "pre-rebase stash"
git rev-parse stash@{0}          # record as {stash_sha}
```

Stashing makes step 7 mandatory: the rebase is not done while the user's work is parked.

Check the rebase is needed, then what would conflict:

```bash
git rev-list --left-right --count origin/{base_branch}...HEAD    # behind  ahead
BASE_REF=origin/{base_branch} .claude/skills/auto-rebase/scripts/check-conflicts.sh
```

If `behind` is 0, say so and stop — no tag, no push.

The script exits 0 clean / 1 conflicts / 2 could-not-run, and works entirely in the object
database, so it is safe to run before asking for confirmation. It predicts **one merge** while a
rebase replays each commit, so a clean report can still stop mid-rebase and a conflicted one can
stop on unlisted files. Use it to set expectations. Many files across many commits is the signal
to consider `rerere` (step 5).

Its `--json` mode belongs to `.github/workflows/conflict-check.yml`; keep the two modes' output
separate when editing it.

## 3. Back up

`--update-refs` rewrites every stacked branch, so snapshot all ref positions, not just the tag:

```bash
git tag -a {branch}-rebase-backup-$(date +%Y%m%d-%H%M%S) -m "pre-rebase backup" HEAD
refs_file=$(git rev-parse --git-path pre-rebase-refs.txt)
git for-each-ref --format='%(refname:short) %(objectname)' refs/heads > "$refs_file"
git for-each-ref --format='remote %(refname:short) %(objectname)' refs/remotes/origin >> "$refs_file"
```

Record the tag as `{backup_ref}`; both it and the ref file are needed for Recovery.

- The `remote` lines are what step 9 leases against. Read each `{remote_oid}` from this file, not
  from `origin/<branch>` at push time, which may have moved. Every branch pushed in step 9 needs
  its own value — look up that branch's name, not the one being rebased:

  ```bash
  awk -v b="origin/$br" '$1=="remote" && $2==b {print $3}' "$refs_file"   # -> {remote_oid} for $br
  ```

  Empty output means the branch is not on origin yet. That is not an error: leave the lease value
  empty (`refs/heads/<br>:`), which git reads as "must not exist there" and is exactly right for a
  first push.
- They carry a literal `remote` field rather than being filtered on `origin/` later, because
  `for-each-ref refs/remotes/origin` also emits a bare `origin` line for the remote's `HEAD`.
- `--git-path` keeps the file in the git dir and resolves per-worktree. A fixed `/tmp` path is
  clobbered by a concurrent rebase, and a symlink pre-created there would redirect the truncation.

If the branch contains merge commits, ask whether to preserve (`--rebase-merges`) or flatten them:

```bash
git rev-list --count --merges origin/{base_branch}..HEAD
```

## 4. Detect stacked branches

Local branches sitting on intermediate commits of the rewritten range — common with phased
`NN-description` stacks. A plain rebase orphans them and every PR built on them; `--update-refs`
moves them instead. Report the list before rebasing, substituting the real base branch name:

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

Git refuses to move a branch checked out elsewhere, so `--update-refs` skips those — flag them for
steps 8 and 9. `grep -qxF` matches literally; without `-F`, `a.b` matches a worktree on `axb`.

## 5. Run the rebase (needs confirmation)

```bash
GIT_EDITOR=true git rebase --update-refs origin/{base_branch}
GIT_EDITOR=true git rebase --rebase-merges --update-refs origin/{base_branch}   # preserving merges
```

If the same hunk will conflict on every replayed commit, offer `git config rerere.enabled true`
first — it records each resolution and replays it automatically. It writes repo config, so ask.

## 6. Conflict loop

```bash
git diff --name-only --diff-filter=U
```

Read each file's surrounding code and intent, then prefer minimal mechanical resolutions: keep
upstream unless the branch deliberately supersedes it, and regenerate rather than hand-edit. If
intent is ambiguous, ask one targeted question. Before trusting a generated file's
"regenerate with: X" header, check that `X` still exists — stale headers are common.

**Generated files.** `yarn.lock` has its own resolver; do not hand-merge it. Resolve
`package.json` first (the union of both sides' entries), then:

```bash
corepack yarn install --mode=update-lockfile   # "YN0048: Automatically fixed merge conflicts"
git checkout --merge -- yarn.lock              # to undo a failed run
```

It reads both sides from the index and writes correct `checksum:` lines, and
`--mode=update-lockfile` installs nothing. It needs the registry, and **offline it strips the
conflict markers and then fails** — check the exit status, not just the absence of markers.

For a generated file with no working regeneration command, stop and ask. Anything carrying
checksums or content-addressed identifiers cannot be hand-merged into something equivalent to real
generator output, and a plausible hand merge is worse than an unresolved conflict because it
passes review.

**Decisions disguised as merges.** Stop and ask rather than resolving when:

- The base already provides the branch's capability another way — a branch adding one tool while
  upstream adopted a different one for the same job, or creating a file whose logic upstream put
  elsewhere. Keeping both sides of that `package.json` conflict passes lint and tests and ships two
  competing implementations. Whether to close the branch is the author's call, not a merge decision.
- Modify/delete: upstream deleted the file, this branch changed it. `grep -rn 'theSymbol'` is
  evidence, not the answer — the branch's caller may not be written yet.

Stage only what you resolved, then continue:

```bash
git add -- <file...>
GIT_EDITOR=true git rebase --continue
```

Keep the `--` and quote each path. Conflicted paths come from git, not from you, and a repo can
hold a file called `-p` or `HEAD`.

**Never `--skip` just because the tree looks clean.** A clean tree does not mean the pending commit
is empty: the rebase also stops with no unmerged files when it refuses to apply a commit at all
("Your local changes … would be overwritten by merge"). Skipping there deletes real work and still
reports success. When a replayed commit's changes really are already upstream, the merge backend
drops it for you and carries on — nothing to do. Before ever skipping:

```bash
git log -1 --format='%h %s' REBASE_HEAD              # what is pending
git diff --name-only --diff-filter=U                 # empty => not a conflict stop
git cherry HEAD REBASE_HEAD                          # '-' => already upstream, '+' => not
```

Only a `-` makes `GIT_EDITOR=true git rebase --skip` safe. `git cherry` compares patch-ids, so
filename spelling cannot fool it — do not rebuild the check as a pathspec, where a filename
containing a space splits into two pathspecs matching nothing and `git diff --quiet` then exits 0
and wrongly reports the commit as empty. Any other cause means the commit was rescheduled: fix the
cause and `--continue`.

Repeat until it finishes. `git rebase --abort` is always preferred over `git reset --hard`; if
resolution gets risky, stop and propose aborting.

## 7. Restore the stash

Restore before pushing, so step 8 checks the tree the user actually had. Use `{stash_sha}`, never a
bare `pop`:

```bash
git stash list
git stash apply --index {stash_sha}
```

`--index` restores the staged/unstaged split; without it, work the user deliberately staged comes
back merged in with work they had not. If git answers `conflicts in index. Try without --index`,
retry as plain `git stash apply {stash_sha}` and tell them their staging was flattened.

`apply` can conflict just as `pop` would — resolve as in step 6, `git add`, and then **leave the
entry alone**: unlike `pop`, `apply` never removes it, so a failure here cannot lose the work. If
you cannot resolve it, say so and leave the stash in place. Only once it has applied cleanly, drop
it — `drop` takes an index, not a SHA:

```bash
git stash list --format='%gd %H' | awk -v s={stash_sha} '$2==s{print $1}'   # -> stash@{N}
git stash drop stash@{N}
```

## 8. Verify

```bash
git log --oneline --decorate origin/{base_branch}..HEAD
```

Each stacked branch from step 4 should decorate a rewritten commit, and `--update-refs` prints an
"Updated the following refs" summary. Note any that did not move.

If the rebase touched source files, run `yarn lint` and `yarn test` before pushing. A conflict-free
rebase is not a correct one: when upstream changes a function's signature and the branch adds a
caller using the old one, the two commits touch different files, so Git merges them cleanly with no
markers and the branch only breaks at compile time. Treat failures here as rebase fallout rather
than pre-existing breakage — if you cannot tell, compare against the backup ref.

Prefer the repo's own scripts, which carry the right config. To type-check directly, use the
repo-local binary:

```bash
node_modules/.bin/tsc --noEmit -p tsconfig.json
```

Bare `npx tsc` can fetch an unrelated decoy package, and passing file paths makes `tsc` ignore
`tsconfig.json` entirely and fail with `TS5112`. For files outside any project config, copy them to
a scratch directory and compile with explicit flags (`--strict --target es2022 --module nodenext
--moduleResolution nodenext --lib es2022,dom`).

## 9. Push (needs confirmation)

`--update-refs` moves local refs only, and a push updates the current branch only — each stacked
branch that exists on origin needs its own force-push. Print every command and wait. Lease against
the pre-rebase remote SHA from step 3:

```bash
git push --force-with-lease="refs/heads/{branch}:{remote_oid}" origin "HEAD:{branch}"
```

Then one push per moved stacked branch, each leased against **its own** pre-rebase remote SHA —
reusing the rebased branch's OID leases against the wrong ref and the push is rejected every time:

```bash
for br in {stacked_branch...}; do
  oid=$(awk -v b="origin/$br" '$1=="remote" && $2==b {print $3}' "$refs_file")
  echo "git push --force-with-lease=\"refs/heads/$br:$oid\" origin \"$br\""
done      # print all of them, confirm, then run them
```

Not the bare `--force-with-lease`: it leases against `refs/remotes/origin/{branch}`, a cache of
what the remote looked like at your last fetch, so it protects you only while that cache is stale.
Any fetch in between — an IDE, a `git pull` in another worktree, a background job — updates the
cache to include the very commit you are about to overwrite, and the lease then passes and
discards it silently. The explicit `<ref>:<oid>` form pins the check to the SHA you reasoned about.

Quote the refspecs. Git rejects spaces in branch names but allows `;`, `|`, `&`, backticks and
`$(...)`, which the shell would act on before git sees them.

Branches skipped as checked out elsewhere were never moved — verify before pushing them.

## Recovery

Confirm before anything destructive (`git reset --hard`, branch deletion).

**Mid-rebase** — nothing is lost yet and no backup is needed: `git rebase --abort`.

**After it finished** — `git reset --hard {backup_ref}`.

If `--update-refs` moved stacked branches, restore each from the step 3 ref file. Show the diff
first, then move only what changed. Drop the `remote` lines — they are remote positions, and
diffing them against local heads reports every branch as differing:

```bash
refs_file=$(git rev-parse --git-path pre-rebase-refs.txt)
git for-each-ref --format='%(refname:short) %(objectname)' refs/heads \
  | diff <(grep -v '^remote ' "$refs_file") -
git branch -f -- {stacked_branch} {old_sha}   # repeat per branch, using the recorded SHA
```

If the tag or ref file is gone, the old commits are in the reflog for the gc window —
`git reflog show {branch}`, and take the entry immediately before "rebase (start)".

**Already force-pushed?** Recoverable the same way: re-push the restored refs with
`--force-with-lease`. Confirm first, and note that anyone who pulled the rewritten history will
need to reset too.
