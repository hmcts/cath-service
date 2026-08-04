---
description: List approved tickets from requirements.db
argument-hint: "[pr <number> | master]"
allowed-tools:
  - Bash
  - Read
  - Agent
---

# List Available Tickets

Query requirements.db for approved tickets ready to work on, and identify which can be
worked on simultaneously.

## Usage

```text
/qk-tickets              # ask which source to use
/qk-tickets master       # use the committed state on master
/qk-tickets pr 912       # include the migration from an open sync PR
```

## What it does

Builds requirements.db from a chosen source, then lists tickets with
`status='approved'` grouped by priority, with their dependency links, and works out
which are safe to run in parallel.

## Source selection

`/qk-requirements-sync` opens a PR containing a migration; until it merges, `master`
does not yet reflect the board. So the source matters:

- **master** — the committed baseline. Reviewed, but may lag the board.
- **pr `<number>`** — master plus that PR's migration. Reflects the board sooner, but
  the migration has not been reviewed yet.

---

# Implementation

## Step 1: Determine the source

`$ARGUMENTS` may be empty, `master`, or `pr <number>`.

If `$ARGUMENTS` is empty, list the open sync PRs and ask the user which source to use:

```bash
EXECUTE:
gh pr list --state open --search "head:chore/requirements-sync-" \
  --json number,title,headRefName,createdAt \
  --jq '.[]
        | select(.headRefName | test("^chore/requirements-sync-[0-9]{4}-[0-9]{2}-[0-9]{2}$"))
        | "#\(.number)  \(.title)  (\(.headRefName), opened \(.createdAt[:10]))"'
```

If there are no open sync PRs, say so and use `master`. Otherwise ask the user to pick
between `master` and one of the listed PRs, then continue with their choice. Do not
guess.

Normalise the choice to a single value before running anything else: either the literal
string `master`, or the bare PR number with the `pr ` prefix stripped. Substitute that
value for `<SOURCE>` in the blocks below — `$ARGUMENTS` is not a positional parameter,
so `$1` is not set and `pr 912` would otherwise arrive as two words.

## Step 2: Build the database from that source

The database must be built from `master`, or from `master` plus the selected PR's
migrations — never from whatever branch happens to be checked out. Everything below
runs in a temporary worktree at `origin/master`, so the user's working tree is never
touched and there is nothing to restore afterwards.

```bash
EXECUTE:
set -euo pipefail

SOURCE="<SOURCE>"                     # "master" or a bare PR number
if [ "$SOURCE" != "master" ] && ! [[ "$SOURCE" =~ ^[0-9]+$ ]]; then
  echo "Invalid source: '$SOURCE'. Expected 'master' or a numeric PR number."
  exit 1
fi

git fetch --quiet origin master
WORKTREE=$(mktemp -d "${TMPDIR:-/tmp}/qk-tickets.XXXXXX")
git worktree add --quiet --detach "$WORKTREE" origin/master
echo "WORKTREE=$WORKTREE"
echo "Base: origin/master ($(git rev-parse --short origin/master))"
```

Keep `$WORKTREE` — Step 4 removes it.

For **master**, build as-is:

```bash
EXECUTE:
set -euo pipefail
cd "$WORKTREE"
./requirements/scripts/init_db.sh
```

For a **PR**, overlay only that PR's migration files onto the worktree. A failure from
`gh` must not be mistaken for "this PR has no migrations", so capture its exit status
separately from `grep`'s no-match status:

```bash
EXECUTE:
set -euo pipefail
PR="<SOURCE>"

HEAD_SHA=$(gh pr view "$PR" --json headRefOid --jq '.headRefOid')

set +e
DIFF=$(gh pr diff "$PR" --name-only)
gh_rc=$?
set -e
if [ "$gh_rc" -ne 0 ]; then
  echo "gh pr diff failed for #$PR (exit $gh_rc) — cannot determine its migrations."
  exit 1
fi

FILES=$(printf '%s\n' "$DIFF" | grep '^requirements/migrations/' || true)
if [ -z "$FILES" ]; then
  echo "PR #$PR adds no migration files — nothing to overlay. Use master instead."
  exit 1
fi

git fetch --quiet origin "$HEAD_SHA"
for f in $FILES; do
  git show "${HEAD_SHA}:${f}" > "${WORKTREE}/${f}"
  echo "Overlaid $f"
done

cd "$WORKTREE"
./requirements/scripts/init_db.sh
```

The database to query is `$WORKTREE/requirements/requirements.db`.

## Step 3: List approved tickets

```text
AGENT: general-purpose
DESCRIPTION: List available approved tickets
PROMPT:
"Query the requirements database for approved tickets ready to implement.

The database is at <WORKTREE>/requirements/requirements.db — substitute the worktree
path printed by Step 2. Query THAT file, not the one in the main checkout, which
reflects a different source. It has already been built: do NOT rebuild it and do NOT
run `yarn requirements:build`, either would discard the chosen source.

**Step 1: Get approved tickets**

SELECT r.id, r.issue_number, r.ref, r.title, r.statement, r.granularity, r.priority
FROM requirement r
WHERE r.status = 'approved' AND r.issue_number IS NOT NULL
ORDER BY
  CASE r.priority
    WHEN 'highest' THEN 1
    WHEN 'high'    THEN 2
    WHEN 'medium'  THEN 3
    WHEN 'low'     THEN 4
    WHEN 'lowest'  THEN 5
    ELSE 6 END,
  r.issue_number ASC;

**Step 2: Get links in both directions**

Links are directional in the table, but a ticket is constrained by links pointing at
it as much as by links it owns. Query BOTH directions and render each from the current
ticket's perspective.

Outgoing (this ticket -> other):

SELECT 'outgoing' AS direction, rl.type, rl.origin, rl.is_suspect,
       rl.confidence, rl.rationale,
       r2.ref, r2.title, r2.status, r2.issue_number
FROM requirement_link rl
JOIN requirement r2 ON r2.id = rl.target_id
WHERE rl.source_id = [ticket.id];

Incoming (other -> this ticket):

SELECT 'incoming' AS direction, rl.type, rl.origin, rl.is_suspect,
       rl.confidence, rl.rationale,
       r1.ref, r1.title, r1.status, r1.issue_number
FROM requirement_link rl
JOIN requirement r1 ON r1.id = rl.source_id
WHERE rl.target_id = [ticket.id];

The valid link types are derives_from, refines, satisfies, depends_on and
conflicts_with. There is no 'blocks' type: an INCOMING depends_on means this ticket
BLOCKS the other one. Show it that way round. derives_from and refines are hierarchical
(parent/child); conflicts_with is symmetric.

**Step 2b: Get the TRANSITIVE closure, not just adjacent links**

The two queries above only reach directly-linked requirements. A chain such as
approved A -> unapproved X -> unapproved Y -> approved B would be missed, and A and B
wrongly reported as safe to parallelise. Walk the graph with a recursive CTE:

WITH RECURSIVE reachable(root_id, id, depth) AS (
  SELECT r.id, r.id, 0
  FROM requirement r
  WHERE r.status = 'approved' AND r.issue_number IS NOT NULL
  UNION
  SELECT rc.root_id, rl.target_id, rc.depth + 1
  FROM reachable rc
  JOIN requirement mid ON mid.id = rc.id
  JOIN requirement_link rl ON rl.source_id = rc.id
  WHERE rl.type IN ('depends_on', 'derives_from', 'refines')
    AND rc.depth < 20
    AND (rc.depth = 0 OR mid.status <> 'verified')
)
SELECT rc.root_id, rr.ref AS root_ref, rc.id AS reached_id, r.ref AS reached_ref,
       r.status, r.issue_number, rc.depth
FROM reachable rc
JOIN requirement rr ON rr.id = rc.root_id
JOIN requirement r  ON r.id  = rc.id
WHERE rc.root_id <> rc.id;

Two approved tickets are unsafe together if either reaches the other in this closure.

`mid.status <> 'verified'` stops traversal AT a verified requirement rather than
through it: verified work is already done, so it satisfies a dependency instead of
transmitting one. Without that guard, approved A -> verified X -> approved B would
report A and B as mutually blocking when the only thing between them is finished work.
The `rc.depth = 0` exemption keeps the approved roots themselves in play. A verified
requirement still appears as a *directly* reached node, which is what lets Step 3
report the dependency as already satisfied.

The `depth < 20` guard stops a cyclic link set from looping forever; `UNION` (not
`UNION ALL`) already dedupes. Run the same query with source and target swapped to get
the reverse direction, and treat `conflicts_with` as unsafe in both directions at
depth 1 only (a conflict is not transitive).

**Step 3: Work out what can be done simultaneously**

Two approved tickets CANNOT be worked on at the same time if:
- one depends_on the other (directly or transitively), or
- they conflict_with each other, or
- one refines/derives_from the other (the parent's shape may change the child).

Tickets with no path between them CAN be worked on simultaneously. Compute the groups
and list the largest safe parallel set. Only consider dependencies on tickets that are
not yet done — a depends_on pointing at a 'verified' requirement is already satisfied
and does not block.

Flag links with is_suspect=1 or origin='inferred' as unconfirmed: they are judgement,
not fact, and a human should sanity-check them before relying on the grouping.

**Step 4: Display**

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 Available Tickets (status=approved)
Source: [master | PR #N]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔴 HIGHEST / HIGH
─────────────────────
#587 (REQ-0201) - System Admin delete court - complete journey
  Priority: HIGH | Granularity: story
  Links: None

#589 (REQ-0203) - Set payload limit for generation of publications
  Priority: HIGH | Granularity: story
  Links:
    • depends_on #587 (REQ-0201) [approved]
  ⚠️  Blocked by #587

🟡 MEDIUM
─────────────────────
#628 (REQ-0216) - MI Report Download - System Admin Dashboard
  Priority: MEDIUM | Granularity: —
  Links:
    • blocks #659 (REQ-0224) [approved]   (incoming depends_on)
  ⚠️  Finish before #659

⚪ NO PRIORITY SET
─────────────────────
#742 (REQ-0236) - Advisory message for SJP Publishing times
  Links: None
  ℹ️  No priority label on the GitHub issue

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Summary: [N] approved tickets

✅ Safe to work on simultaneously:
  #587, #628, #742   (no dependencies between them)

⛔ Cannot be parallelised:
  #589 depends on #587 — do #587 first
  #659 depends on #628 — do #628 first

⚠️  Unconfirmed links (inferred, is_suspect=1):
  #589 -> #587  'Payload limits apply to the publication flow the delete-court
                 journey modifies.' (confidence 0.7)
  These are judgement, not fact — check before relying on the grouping.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Return: 'Listed [N] approved tickets, [M] safe to parallelise'"

WAIT FOR AGENT
```

## Step 4: Remove the worktree

Everything was built inside the temporary worktree, so cleanup is a removal — there is
nothing to restore in the user's checkout, and no `git checkout --` that could discard
their work.

```bash
EXECUTE:
set -euo pipefail
git worktree remove --force "$WORKTREE"
rmdir "$WORKTREE" 2>/dev/null || true

if git worktree list --porcelain | grep -q "^worktree ${WORKTREE}$"; then
  echo "Worktree $WORKTREE was not removed — clean it up with: git worktree remove --force $WORKTREE"
  exit 1
fi
echo "Removed worktree $WORKTREE"

# The user's own checkout must be exactly as it was found.
if [ -n "$(git status --porcelain requirements/)" ]; then
  echo "requirements/ in the main checkout is unexpectedly dirty:"
  git status --short requirements/
  exit 1
fi
```

Run this even if Step 3 failed, so a stale worktree is never left behind.
