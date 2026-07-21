---
description: Create and initialize a git worktree for a GitHub issue
argument-hint: <issue-number>
allowed-tools:
  - Bash
---

# Create Worktree: Issue $ARGUMENT

## Step 1: Validate Argument

`$ARGUMENT` is substituted literally into every command, so it must be validated to prevent shell injection.

```bash
EXECUTE:
if ! [[ "$ARGUMENT" =~ ^[0-9]+$ ]]; then
  echo "❌ Invalid issue number: '$ARGUMENT'. Provide a numeric GitHub issue number, e.g. /qk-worktree 312"
  exit 1
fi
```

## Step 2: Verify GitHub Issue

Verify the issue exists and is ready for work.

```bash
EXECUTE:
ISSUE_DATA=$(gh issue view "$ARGUMENT" --json number,title,state,labels,body 2>&1)

if [ $? -ne 0 ]; then
  echo "❌ Issue #$ARGUMENT not found or gh command failed"
  exit 1
fi

# Extract state
STATE=$(echo "$ISSUE_DATA" | jq -r '.state')
if [ "$STATE" = "CLOSED" ]; then
  echo "❌ Issue #$ARGUMENT is closed"
  exit 1
fi

# Check for blocking labels
LABELS=$(echo "$ISSUE_DATA" | jq -r '.labels[].name' | tr '\n' ' ')
if echo "$LABELS" | grep -qE 'needs-clarification|question|blocked'; then
  echo "❌ Issue #$ARGUMENT has blocking labels: $LABELS"
  exit 1
fi

# Check for placeholders in body
BODY=$(echo "$ISSUE_DATA" | jq -r '.body // ""')
if echo "$BODY" | grep -qiE 'TBD|TODO|FIXME|\[TODO\]|\[TBD\]'; then
  echo "❌ Issue #$ARGUMENT contains placeholder text (TBD/TODO)"
  exit 1
fi

# Check for acceptance criteria
if ! echo "$BODY" | grep -qiE 'acceptance criteria|acceptance:|given.*when.*then'; then
  echo "❌ Issue #$ARGUMENT has no clear acceptance criteria"
  exit 1
fi

# Display success
TITLE=$(echo "$ISSUE_DATA" | jq -r '.title')
echo "✅ GitHub Issue #$ARGUMENT verified:"
echo "   Title: $TITLE"
echo "   State: $STATE"
echo "   Labels: ${LABELS:-none}"
echo ""
```

## Step 3: Create Worktree

Delegate worktree creation to shell script.

```bash
EXECUTE:
./scripts/create-worktree.sh "$ARGUMENT"
```

The script handles:
- Creating git worktree with branch `vibe-$ARGUMENT`
- Checking if worktree/branch already exists
- Fetching from remote if needed
- Verifying successful creation
- Displaying summary and next steps
