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
  --jq '.[] | "#\(.number)  \(.title)  (\(.headRefName), opened \(.createdAt[:10]))"'
```

If there are no open sync PRs, say so and use `master`. Otherwise ask the user to pick
between `master` and one of the listed PRs, then continue with their choice. Do not
guess.

## Step 2: Build the database from that source

Validate the argument before using it in a command.

```bash
EXECUTE:
set -euo pipefail

SOURCE="$1"          # "master" or a PR number
ORIGINAL_REF=$(git rev-parse --abbrev-ref HEAD)

if [ "$SOURCE" = "master" ]; then
  echo "Source: master"
else
  if ! [[ "$SOURCE" =~ ^[0-9]+$ ]]; then
    echo "Invalid PR number: '$SOURCE'"
    exit 1
  fi
  echo "Source: PR #$SOURCE"
fi
```

For **master**: make sure the working tree is clean, then build from the current
checkout of master.

```bash
EXECUTE:
set -euo pipefail
if [ -n "$(git status --porcelain requirements/)" ]; then
  echo "requirements/ has uncommitted changes — the build would not reflect master."
  git status --short requirements/
  exit 1
fi
yarn requirements:build
```

For **pr `<number>`**: fetch only that PR's migration files into the working tree, so
the build is master plus the proposed migration. Do not check the branch out — that
would disturb the user's working tree.

```bash
EXECUTE:
set -euo pipefail
PR="$1"

HEAD_SHA=$(gh pr view "$PR" --json headRefOid --jq '.headRefOid')
echo "PR #$PR head: $HEAD_SHA"

FILES=$(gh pr diff "$PR" --name-only | grep '^requirements/migrations/' || true)
if [ -z "$FILES" ]; then
  echo "PR #$PR adds no migration files — nothing to overlay. Use master instead."
  exit 1
fi

git fetch --quiet origin "$HEAD_SHA"
for f in $FILES; do
  git show "${HEAD_SHA}:${f}" > "$f"
  echo "Overlaid $f"
done

yarn requirements:build
```

Record which files were overlaid — they must be reverted in Step 6.

## Step 3: List approved tickets

```text
AGENT: general-purpose
DESCRIPTION: List available approved tickets
PROMPT:
"Query requirements/requirements.db for approved tickets ready to implement. The
database has already been built — do NOT rebuild it, that would discard the chosen
source.

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
       r2.ref, r2.title, r2.status, r2.issue_number
FROM requirement_link rl
JOIN requirement r2 ON r2.id = rl.target_id
WHERE rl.source_id = [ticket.id];

Incoming (other -> this ticket):

SELECT 'incoming' AS direction, rl.type, rl.origin, rl.is_suspect,
       r1.ref, r1.title, r1.status, r1.issue_number
FROM requirement_link rl
JOIN requirement r1 ON r1.id = rl.source_id
WHERE rl.target_id = [ticket.id];

The valid link types are derives_from, refines, satisfies, depends_on and
conflicts_with. There is no 'blocks' type: an INCOMING depends_on means this ticket
BLOCKS the other one. Show it that way round. derives_from and refines are hierarchical
(parent/child); conflicts_with is symmetric.

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

## Step 4: Restore the working tree

If Step 2 overlaid migration files from a PR, revert them so the user's checkout is
left as it was.

```bash
EXECUTE:
set -euo pipefail
if [ -n "$(git status --porcelain requirements/migrations/)" ]; then
  git checkout -- requirements/migrations/
  echo "Reverted overlaid migration files"
  yarn requirements:build >/dev/null
fi
git status --short requirements/
```

Confirm the working tree is clean before finishing.
