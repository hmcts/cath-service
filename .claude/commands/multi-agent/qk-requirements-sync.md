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

1. Reads the live board with `requirements/scripts/fetch_board.sh` — **fails if the
   board cannot be read**, rather than guessing status from issue or PR state.
2. Generates a migration for the delta (new requirements, status moves, priority /
   granularity / impl changes).
3. Infers `requirement_link` dependencies for the new requirements.
4. Verifies the database builds and passes integrity checks.
5. Opens a PR.

This replaces the old nightly `requirements-sync.yml` Action, which ran with a token
that could not read the board and silently substituted "issue closed + merged PR" as
a proxy for board status. That proxy cannot see open issues, so the database fell 126
requirements behind while every run reported success. Board status now comes from the
board or the command stops.

---

# Implementation

## Step 1: Check the board is readable

Read access to the board is the one hard prerequisite. Establish it before doing
anything else so a permission problem surfaces immediately.

```bash
EXECUTE:
set -euo pipefail
requirements/scripts/fetch_board.sh > /tmp/board.jsonl
echo "Board items: $(wc -l < /tmp/board.jsonl)"
```

If this fails, STOP. Report the error verbatim and do not continue — a partial or
absent board must never be reconciled against. The token needs `read:project` on the
`hmcts` org (`gh auth refresh -h github.com -s read:project`).

## Step 2: Build the current database

```bash
EXECUTE:
yarn requirements:build
sqlite3 requirements/requirements.db "SELECT COUNT(*) AS requirements FROM requirement;"
```

## Step 3: Generate the migration

```bash
EXECUTE:
set -euo pipefail
TODAY=$(date -u +%Y-%m-%dT%H:%M:%SZ)
DATESTAMP=$(date -u +%Y_%m_%d)
OUT="requirements/migrations/$(printf '%03d' $(( $(ls requirements/migrations/[0-9]*.sql | sed -E 's#.*/([0-9]+)_.*#\1#' | sort -n | tail -1 | sed 's/^0*//') + 1 )))_reconcile_board_${DATESTAMP}.sql"

if npx tsx requirements/scripts/generate_sync_migration.ts /tmp/board.jsonl requirements/requirements.db "$TODAY" > "/tmp/migration.sql"; then
  mv /tmp/migration.sql "$OUT"
  echo "WROTE=$OUT"
else
  echo "NO_DRIFT"
  rm -f /tmp/migration.sql
fi
```

If the output is `NO_DRIFT`: STOP. Do not scaffold a file, commit, or open a PR.
Report that the database already matches the board. This is the expected outcome most
of the time.

## Step 4: Verify

```bash
EXECUTE:
set -euo pipefail
yarn requirements:build
sqlite3 requirements/requirements.db "PRAGMA integrity_check;"
sqlite3 requirements/requirements.db "PRAGMA foreign_key_check;"
```

`integrity_check` must print `ok` and `foreign_key_check` must print nothing. If
either fails, fix the migration; if you cannot, delete it and stop. Never open a PR
on a database that does not build.

Then confirm the mirror is exact — this is the check the old Action never had:

```bash
EXECUTE:
set -euo pipefail
sqlite3 -json requirements/requirements.db \
  "SELECT issue_number, status FROM requirement WHERE issue_number IS NOT NULL;" > /tmp/db_now.json
jq -s . /tmp/board.jsonl > /tmp/board_arr.json
jq -n --slurpfile b /tmp/board_arr.json --slurpfile d /tmp/db_now.json '
  ($d[0] | map({key: (.issue_number|tostring), value: .status}) | from_entries) as $dbm
  | { mismatched: [ $b[0][]
        | select($dbm[(.issueNumber|tostring)] != null and $dbm[(.issueNumber|tostring)] != .status)
        | {issue: .issueNumber, board: .status, db: $dbm[(.issueNumber|tostring)]} ],
      missing_from_db: [ $b[0][]
        | select($dbm[(.issueNumber|tostring)] == null) | .issueNumber ] }'
```

Both arrays must be empty. If not, the migration is incomplete — investigate before
opening a PR.

## Step 5: Infer links for new requirements

New requirements arrive with no `requirement_link` rows: dependencies are judgement,
not something the board records. Infer them in a separate agent so the mechanical
migration stays independently verifiable.

Only run this if Step 3 wrote a migration containing new requirements.

```text
AGENT: general-purpose
DESCRIPTION: Infer dependency links for newly added requirements
PROMPT:
"Infer traceability links for requirements just added to requirements.db.

**Step 1: Find the new requirements**

The migration file just written is the newest in requirements/migrations/. Read it and
collect the id, ref, issue_number and title of every requirement it INSERTs.

**Step 2: Read their content**

For each new requirement, read its title and statement from the database:

SELECT id, ref, issue_number, title, statement FROM requirement WHERE id IN (...);

Also read the existing requirements they might relate to — match on overlapping
subject matter (same list type, same page, same subsystem):

SELECT id, ref, issue_number, title FROM requirement WHERE issue_number IS NOT NULL;

**Step 3: Establish structural links first — these are facts, not judgement**

Use `gh` to find genuine relationships:
- Sub-issue relationships (parent/child) -> type='refines', origin='github_subissue'
- Issue bodies that reference another issue as a blocker or prerequisite
  (e.g. 'depends on #312', 'blocked by #312') -> type='depends_on',
  origin='issue_reference'

Structural links get confidence=NULL, rationale=NULL, is_suspect=0.

**Step 4: Infer content-based links — these are judgement**

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

**Step 5: Append to the migration**

Add the link INSERTs to the SAME migration file, inside the existing transaction,
immediately before COMMIT. Under a comment header explaining they are inferred:

INSERT INTO requirement_link
  (source_id, target_id, type, origin, confidence, rationale, is_suspect, created_at, created_by)
VALUES
  (<source>, <target>, 'depends_on', 'inferred', 0.8, '<rationale>', 1, '<today ISO>', 'github-actions[bot]');

**Step 6: Verify**

Run `yarn requirements:build`, then
`sqlite3 requirements/requirements.db 'PRAGMA integrity_check; PRAGMA foreign_key_check;'`.
Integrity must be ok and foreign_key_check empty. If a link violates a constraint,
remove it rather than weakening the constraint.

Return: 'Added [N] links ([S] structural, [I] inferred) for [M] new requirements'"

WAIT FOR AGENT
```

## Step 6: Commit and open the PR

```bash
EXECUTE:
set -euo pipefail
BRANCH="chore/requirements-sync-$(date -u +%Y-%m-%d)"

EXISTING=$(gh pr list --state open --search "head:chore/requirements-sync-" --json headRefName --jq '.[0].headRefName // empty')
if [ -n "$EXISTING" ]; then
  echo "Reusing open sync PR branch: $EXISTING"
  git checkout "$EXISTING"
  git pull --ff-only origin "$EXISTING"
else
  git checkout -b "$BRANCH"
fi

git add requirements/migrations/
git status --short
```

Commit only the migration file — `requirements.db` is a gitignored build artefact.
Then push and open the PR (or push to the existing branch, which updates its PR).

The PR body must state:
- Counts: new requirements (with their REQ refs), status changes (`from -> to` with
  the board column), other field changes.
- Any requirement in the database whose issue is **not on the board** — it cannot be
  reconciled and needs a human to decide whether it belongs there.
- The inferred link count, flagged as needing review (`is_suspect=1`).

Report the PR URL.
