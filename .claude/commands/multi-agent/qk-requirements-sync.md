---
description: Sync requirements.db with the GitHub project board and open a PR
allowed-tools:
  - Bash
  - Read
  - Write
  - Agent
---

# Sync Requirements Database

Reconcile `requirements.db` with GitHub Project #43 (CaTH Kanban), write a migration
for the delta, and open a PR.

## Usage

```text
/qk-requirements-sync
```

## What it does

1. **Refuses to run if a sync PR is already open** — a second migration built on
   `master` would reuse the ids and REQ refs the open one has already assigned.
2. Reads the live board with `requirements/scripts/fetch_board.sh` — **fails if the
   board cannot be read**, rather than guessing status from issue or PR state.
3. Builds the current database from a clean `master` to establish the baseline.
4. Computes the delta — new requirements and changed rows.
5. Writes a migration for the delta (new requirements, status moves, priority /
   granularity / impl changes).
6. Verifies the database builds, passes integrity checks, and mirrors the board exactly.
7. Infers `requirement_link` dependencies for new requirements (steps a–f): finds new
   rows, reads their content, establishes structural links, infers content-based links,
   appends them to the migration, and verifies.
8. Opens a PR.

Only one sync can be in flight at a time. That is deliberate: it keeps ref allocation
single-writer, which is the simplest way to guarantee refs are never handed out twice.

This replaces the old nightly `requirements-sync.yml` Action, which ran with a token
that could not read the board and silently substituted "issue closed + merged PR" as
a proxy for board status. That proxy cannot see open issues, so the database fell 127
requirements behind while every run reported success. Board status now comes from the
board or the command stops.

Deltas are normally a handful of rows, so the migration SQL is written directly. The
one exception was migration 011, a 127-row catch-up generated mechanically.

---

# Implementation

## Step 1: Refuse to run while a sync PR is open

Only one sync may be in flight at a time. An unmerged sync PR is not yet in `master`,
so a second run would rebuild from `master`, re-detect everything the open PR already
added as still missing, and hand out the same `id` and `REQ-NNNN` values a second time.
`id` is the primary key and `ref` is `UNIQUE`, so the two migrations cannot both apply:
`init_db.sh` fails and the database stops building entirely.

Sync branches are always `chore/requirements-sync-<YYYY-MM-DD>`. Match that shape
exactly, so a hand-made branch that merely shares the prefix (say
`chore/requirements-sync-rework`) is not mistaken for a sync in flight.

```bash
EXECUTE:
set -euo pipefail
OPEN_SYNC=$(gh pr list --state open --search "head:chore/requirements-sync-" \
  --json number,title,headRefName \
  --jq '.[]
        | select(.headRefName | test("^chore/requirements-sync-[0-9]{4}-[0-9]{2}-[0-9]{2}$"))
        | "#\(.number)  \(.title)  (\(.headRefName))"')

if [ -n "$OPEN_SYNC" ]; then
  echo "A requirements sync PR is already open:"
  printf '%s\n' "$OPEN_SYNC"
  echo
  echo "Merge or close it before syncing again — a second migration built on master"
  echo "would reuse the ids and REQ refs that PR has already assigned."
  exit 1
fi
echo "No sync PR open — safe to proceed."
```

If this exits non-zero, STOP and report which PR is blocking. Do not attempt to work
around it: extending the open PR would need its migrations overlaid before the delta is
computed, which this command deliberately does not do.

## Step 2: Check the board is readable

Read access to the board is the other hard prerequisite. Establish it before doing any
work so a permission problem surfaces immediately.

```bash
EXECUTE:
set -euo pipefail
requirements/scripts/fetch_board.sh > /tmp/board.jsonl
echo "Board items: $(wc -l < /tmp/board.jsonl)"
```

If this fails, STOP. Report the error verbatim and do not continue — a partial or
absent board must never be reconciled against. The token needs `read:project` on the
`hmcts` org (`gh auth refresh -h github.com -s read:project`).

## Step 3: Build the current database

Build from a clean `master`: the numbering in the new migration is derived from
`MAX(id)` and the highest `REQ-NNNN`, so a stray local migration would shift them.

The check below confirms the current branch HEAD matches `origin/master`. Without
this, a committed migration on a feature branch can be included in the build and
shift the `MAX(id)` / `MAX(ref)` baseline before the new migration is written.

```bash
EXECUTE:
set -euo pipefail
git fetch --quiet origin master
if [ "$(git rev-parse HEAD)" != "$(git rev-parse origin/master)" ]; then
  echo "HEAD is not at origin/master — run from master or use 'git checkout master' first."
  echo "  HEAD:          $(git rev-parse --short HEAD)"
  echo "  origin/master: $(git rev-parse --short origin/master)"
  exit 1
fi
if [ -n "$(git status --porcelain requirements/)" ]; then
  echo "requirements/ has uncommitted changes — commit, stash or revert them first."
  git status --short requirements/
  exit 1
fi
yarn requirements:build
sqlite3 requirements/requirements.db \
  "SELECT COUNT(*) AS requirements, MAX(id) AS max_id FROM requirement;"
```

## Step 4: Compute the delta

Compare the board file against the database. Read `status` from the board file
verbatim — it is already mapped from the board column. Never re-derive it, and never
substitute a proxy such as "the issue is closed" or "it has a merged PR": those cannot
see open issues, which is how the database previously fell 127 requirements behind.

```bash
EXECUTE:
set -euo pipefail
sqlite3 -json requirements/requirements.db \
  "SELECT id, ref, issue_number, status, priority, granularity, impl_commit_sha, impl_paths, version
   FROM requirement WHERE issue_number IS NOT NULL;" > /tmp/db_state.json
sqlite3 requirements/requirements.db \
  "SELECT MAX(id) AS max_id, MAX(CAST(substr(ref, 5) AS INTEGER)) AS max_ref FROM requirement;"
```

Derive each board issue's expected values:

- **status** — the `status` field from the board file, as-is.
- **priority** — from the `priority:*` label suffix: `1-highest`→`highest`, `2-high`→`high`,
  `3-medium`→`medium`, `4-low`→`low`, `5-lowest`→`lowest`. NULL if absent.
- **granularity** — from the `type:*` label: `epic`→`epic`, `story`→`story`, `task`→`task`,
  and `feature`→`epic` (predates the epic/story/task convention; REQ-0001 and REQ-0003
  set that precedent). NULL if absent.
- **kind** — `'functional'` for new rows.
- **statement** — the issue body verbatim, as existing rows do.
- **impl_commit_sha** — `mergeCommitOid` of the highest-numbered entry in `mergedPrs`.
- **impl_paths** — JSON array of the union of `paths` across `mergedPrs`, sorted,
  excluding lockfiles, `.github/**`, `**/helm/**`, `*.md`, `*.yml`/`*.yaml`, and
  `dist`/`build`/`generated`/`coverage` paths.

Then classify:

- **NEW** — board issue whose `issueNumber` is not in the database.
- **CHANGED** — existing row where status, priority, granularity, `impl_commit_sha` or
  `impl_paths` differs. Compare `impl_paths` as sorted sets. NULL-vs-NULL is not a
  change. Do **not** clear an existing `impl_commit_sha` or `impl_paths` just because a
  PR reference has gone missing — only ever set them to a non-NULL value.

**If the delta is empty: STOP.** Do not scaffold a file, commit, or open a PR. Report
that the database already matches the board. This is the expected outcome most of the
time.

## Step 5: Write the migration

Scaffold it, then replace the TODO with the delta SQL inside the existing transaction:

```bash
EXECUTE:
requirements/scripts/new_migration.sh "reconcile board $(date -u +%Y-%m-%d)"
```

Match the conventions in `seed.sql` and migration 011:

- **NEW row** — `INSERT INTO requirement` with `id` = current `MAX(id)` + k and
  `ref` = next `REQ-NNNN` zero-padded to four digits. Sort new issues by
  `issueNumber` before assigning, so the lowest issue number takes the lowest ref.
  `created_at`/`updated_at` from the issue's `createdAt`;
  `created_by`/`updated_by` = `'qk-requirements-sync'`. Then one
  `INSERT INTO requirement_change` with `version=1`, `change_type='created'`,
  `change_summary='imported from GitHub issue'`, `changed_at` = the issue's `createdAt`.
- **CHANGED row** — one `UPDATE` setting every differing field plus
  `version = <old+1>`, `updated_at` = today, `updated_by = 'qk-requirements-sync'`.
  Then one `requirement_change` row per differing field at that same new version:
  `change_type='status_changed'` for status, `'modified'` for the rest,
  `change_summary='reconciled with board'`, with `old_value` and `new_value` set.
  One UPDATE and one version bump per requirement, however many fields changed.
- **Escape single quotes** in every text value by doubling them (`'` → `''`). Issue
  bodies routinely contain apostrophes and an unescaped one will break the migration
  or silently truncate a statement.
- Never `DELETE` a requirement and never reuse a `ref`. Status moving *backwards* is
  fine — tickets move back along the board, and the change row records it.

A requirement in the database whose issue is **not on the board** cannot be reconciled:
leave the row untouched and note it for the PR body.

## Step 6: Verify

```bash
EXECUTE:
set -euo pipefail
yarn requirements:build

# sqlite3 exits 0 even when PRAGMA reports a problem, so capture and assert.
IC=$(sqlite3 requirements/requirements.db "PRAGMA integrity_check;")
if [ "$IC" != "ok" ]; then
  echo "PRAGMA integrity_check failed:"
  printf '%s\n' "$IC"
  exit 1
fi

FKC=$(sqlite3 requirements/requirements.db "PRAGMA foreign_key_check;")
if [ -n "$FKC" ]; then
  echo "PRAGMA foreign_key_check reported violations:"
  printf '%s\n' "$FKC"
  exit 1
fi

echo "integrity_check: ok"
echo "foreign_key_check: clean"
```

If either check fails, fix the migration; if you cannot, delete it and stop. Never
open a PR on a database that does not build.

Then confirm the mirror is exact — this is the check the old Action never had.
The parity check verifies status (the field most critical to mirror correctly)
and fails hard if any mismatch or missing issue is found. Priority, granularity,
and impl fields require re-deriving expected values from labels/mergedPrs and are
verified implicitly by the build passing:

```bash
EXECUTE:
set -euo pipefail
sqlite3 -json requirements/requirements.db \
  "SELECT issue_number, status, priority, granularity, impl_commit_sha, impl_paths
   FROM requirement WHERE issue_number IS NOT NULL;" > /tmp/db_now.json
jq -s . /tmp/board.jsonl > /tmp/board_arr.json
jq -n --slurpfile b /tmp/board_arr.json --slurpfile d /tmp/db_now.json '
  ($d[0] | map({key: (.issue_number|tostring), value: .}) | from_entries) as $dbm
  | { mismatched: [ $b[0][]
        | . as $bi
        | ($dbm[(.issueNumber|tostring)]) as $dr
        | select($dr != null)
        | select($dr.status != $bi.status)
        | {issue: $bi.issueNumber, field: "status", board: $bi.status, db: $dr.status} ],
      missing_from_db: [ $b[0][]
        | select($dbm[(.issueNumber|tostring)] == null) | .issueNumber ] }' \
  > /tmp/parity.json

MISMATCHED=$(jq '.mismatched | length' /tmp/parity.json)
MISSING=$(jq '.missing_from_db | length' /tmp/parity.json)

if [ "$MISMATCHED" -gt 0 ] || [ "$MISSING" -gt 0 ]; then
  echo "Parity check FAILED — migration is incomplete:"
  jq . /tmp/parity.json
  exit 1
fi
echo "Parity check passed — DB mirrors board exactly."
```

## Step 7: Infer links for new requirements

New requirements arrive with no `requirement_link` rows: dependencies are judgement,
not something the board records. Infer them in a separate agent so the mechanical
migration stays independently verifiable.

Only run this if Step 5 wrote a migration containing new requirements.

```text
AGENT: general-purpose
DESCRIPTION: Infer dependency links for newly added requirements
PROMPT:
"Infer traceability links for requirements just added to requirements.db.

**Step a: Find the new requirements**

The migration file just written is the newest in requirements/migrations/. Read it and
collect the id, ref, issue_number and title of every requirement it INSERTs.

**Step b: Read their content**

For each new requirement, read its title and statement from the database:

SELECT id, ref, issue_number, title, statement FROM requirement WHERE id IN (...);

Also read the existing requirements they might relate to — match on overlapping
subject matter (same list type, same page, same subsystem):

SELECT id, ref, issue_number, title FROM requirement WHERE issue_number IS NOT NULL;

**Step c: Establish structural links first — these are facts, not judgement**

Use `gh` to find genuine relationships:
- Sub-issue relationships (parent/child) -> type='refines', origin='github_subissue'
- Issue bodies that reference another issue as a blocker or prerequisite
  (e.g. 'depends on #312', 'blocked by #312') -> type='depends_on',
  origin='issue_reference'

Structural links get confidence=NULL, rationale=NULL, is_suspect=0.

**Step d: Infer content-based links — these are judgement**

Where one requirement clearly cannot be built before another (a page needs its
layout; a download needs the list it downloads; a subscription needs the user table),
propose a link with:
- type: 'depends_on' (needs the other to exist first), 'derives_from' (elaborates a
  broader requirement), or 'refines' (narrows a parent's scope)
- origin='inferred', is_suspect=1, confidence between 0.0 and 1.0
- rationale: one sentence saying WHY, naming both requirements in plain terms.
  Match the style of existing rationales, e.g.
  'Sign-in (6) stores/reads the details of users who sign in, which requires the
  user table (8) to exist.'

Rules:
- Only propose a link you can justify in one sentence. Fewer, well-reasoned links
  beat many speculative ones.
- Valid types are ONLY: derives_from, refines, satisfies, depends_on,
  conflicts_with. There is no 'blocks' or 'related_to' — a blocking relationship is
  recorded as the other requirement's depends_on.
- Never link a requirement to itself; the schema forbids it.
- (source_id, target_id, type) is UNIQUE — check the link does not already exist.
- Skip a requirement entirely rather than invent a relationship for it.

**Step e: Append to the migration**

Add the link INSERTs to the SAME migration file, inside the existing transaction,
immediately before COMMIT. Under a comment header explaining they are inferred:

INSERT INTO requirement_link
  (source_id, target_id, type, origin, confidence, rationale, is_suspect, created_at, created_by)
VALUES
  (<source>, <target>, 'depends_on', 'inferred', 0.8, '<rationale>', 1, '<today ISO>', 'qk-requirements-sync');

**Step f: Verify**

Run `yarn requirements:build`, then
`sqlite3 requirements/requirements.db 'PRAGMA integrity_check; PRAGMA foreign_key_check;'`.
Integrity must be ok and foreign_key_check empty. If a link violates a constraint,
remove it rather than weakening the constraint.

Return: 'Added [N] links ([S] structural, [I] inferred) for [M] new requirements'"

WAIT FOR AGENT
```

## Step 8: Commit and open the PR

Step 1 established that no sync PR is open — this always starts a fresh branch off
`master` — there is no existing branch to reuse.

```bash
EXECUTE:
set -euo pipefail
BRANCH="chore/requirements-sync-$(date -u +%Y-%m-%d)"
# new_migration.sh prints an absolute path; git expects repo-relative paths.
# Convert once here so both the `git add` and the staged-files check use the same form.
MIGRATION_ABS="<path printed by Step 5>"
MIGRATION=$(git rev-parse --show-toplevel | xargs -I{} realpath --relative-to={} "$MIGRATION_ABS")

# Re-check: the guard ran before the board fetch and delta, so a PR could have been
# opened in between. Cheap to repeat, and the alternative is colliding refs.
# Use the same date-shaped regex as Step 1 so rework/manual branches are not mistaken
# for a sync in flight.
RECHECK=$(gh pr list --state open --search "head:chore/requirements-sync-" \
  --json number,headRefName \
  --jq '.[] | select(.headRefName | test("^chore/requirements-sync-[0-9]{4}-[0-9]{2}-[0-9]{2}$")) | .number' \
  | head -1)
if [ -n "$RECHECK" ]; then
  echo "A sync PR was opened while this run was in progress — discarding this migration."
  echo "Remove ${MIGRATION}, then re-run once that PR is merged or closed."
  exit 1
fi

# The migration is untracked, so it survives the branch switch.
git fetch --quiet origin master
git checkout -b "$BRANCH" origin/master

# Stage the one file this run created — `git add requirements/migrations/` would
# sweep in any other local edit or stray file in that directory.
git add -- "$MIGRATION"

# Nothing else may be staged: refuse rather than commit someone's unrelated work.
UNEXPECTED=$(git diff --cached --name-only | grep -vFx "$MIGRATION" || true)
if [ -n "$UNEXPECTED" ]; then
  echo "Refusing to commit — unexpected staged files:"
  printf '%s\n' "$UNEXPECTED"
  exit 1
fi
git status --short
```

Commit only that migration file — `requirements.db` is gitignored and rebuilt from the
SQL. Then push the branch and open the PR against `master`.

The PR body must state:
- Counts: new requirements (with their REQ refs), status changes (`from -> to` with
  the board column), other field changes.
- Any requirement in the database whose issue is **not on the board** — it cannot be
  reconciled and needs a human to decide whether it belongs there.
- The inferred link count, flagged as needing review (`is_suspect=1`).
- That the next sync is blocked until this PR is merged or closed, so it does not sit
  open indefinitely.

Report the PR URL.
