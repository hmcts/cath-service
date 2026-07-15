---
description: Create and initialize a git worktree for a GitHub issue
argument-hint: <issue-number>
allowed-tools:
  - Bash
  - Read
  - Write
  - Agent
---

# Create Worktree: Issue $ARGUMENT

## Step 0: Validate Argument

`$ARGUMENT` is substituted literally into every `gh`, git, and path command below, so it must be validated before use to prevent shell injection and malformed branch names.

```bash
EXECUTE:
# Reject anything that is not a plain issue number
if ! [[ "$ARGUMENT" =~ ^[0-9]+$ ]]; then
  echo "❌ Invalid issue number: '$ARGUMENT'. Provide a numeric GitHub issue number, e.g. /qk-worktree 312"
  exit 1
fi
```

## Step 1: Verify GitHub Issue [AGENT]

Verify the GitHub issue exists and is ready for work.

```
AGENT: general-purpose
DESCRIPTION: Verify GitHub issue #$ARGUMENT exists
PROMPT:
"Check if GitHub issue #$ARGUMENT exists, is open, and is refined enough to build before a worktree is created.

**Step 1: Fetch issue from GitHub**

\`\`\`bash
gh issue view \"$ARGUMENT\" --json number,title,body,labels,comments,state
\`\`\`

**Step 2: Verify issue**

If ANY of these are true, the issue is NOT ready — return FAIL:
- Issue not found or command fails
- Issue state is 'closed' (CLOSED)
- Has 'needs-clarification', 'question', or 'blocked' label
- Comments contain an unanswered question (check the last comment)
- No clear acceptance criteria in the body
- Issue body uses 'TBD', 'TODO', or similar placeholders

**Step 3: Return result**

If NOT ready:
  Return exactly: 'RESULT: FAIL — ❌ Issue #$ARGUMENT not ready for a worktree:
- [list specific reasons found]

Refine the issue on GitHub before starting work.'

If ready:
  Return exactly: 'RESULT: PASS — ✅ GitHub Issue #$ARGUMENT verified:
- Title: [title]
- State: [state]
- Labels: [labels or 'none']
- Acceptance criteria: [count] found'"

WAIT FOR AGENT
```

**Gate:** If the agent's result starts with `RESULT: FAIL`, STOP — display the message and do not create a worktree. Only continue to Step 2 when the result starts with `RESULT: PASS`.

## Step 2: Create Worktree Directory

Create isolated git worktree with branch and dev container support.

```bash
EXECUTE:
# Stop immediately if any git operation fails — never fall through to a success message
set -e

BRANCH="vibe-$ARGUMENT"
WORKTREE=".claude/worktrees/$BRANCH"

# Check if worktree already exists
if [ -d "$WORKTREE" ]; then
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "✅ Worktree already exists"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  # Verify the existing directory really is a worktree on the expected branch
  ACTUAL_BRANCH=$(git -C "$WORKTREE" rev-parse --abbrev-ref HEAD)
  if [ "$ACTUAL_BRANCH" != "$BRANCH" ]; then
    echo "❌ $WORKTREE exists but is on branch '$ACTUAL_BRANCH', not '$BRANCH'. Resolve manually."
    exit 1
  fi
  git -C "$WORKTREE" status
else
  # Check if branch exists
  if git show-ref --verify --quiet "refs/heads/$BRANCH"; then
    echo "Branch $BRANCH exists locally, creating worktree..."
    git worktree add "$WORKTREE" "$BRANCH"
  elif git ls-remote --heads origin "$BRANCH" | grep -q "$BRANCH"; then
    echo "Branch $BRANCH exists remotely, fetching and creating worktree..."
    git fetch origin "$BRANCH:$BRANCH"
    git worktree add "$WORKTREE" "$BRANCH"
  else
    echo "Branch $BRANCH doesn't exist, creating new branch and worktree..."
    git worktree add -b "$BRANCH" "$WORKTREE" master
  fi

  git -C "$WORKTREE" status
fi

# Confirm the worktree is registered before declaring success
if ! git worktree list --porcelain | grep -qF "worktree $(cd "$WORKTREE" && pwd)"; then
  echo "❌ Worktree $WORKTREE was not created successfully."
  exit 1
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ WORKTREE READY"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Location: $WORKTREE"
echo "Branch:   $BRANCH"
echo ""
echo "Next steps:"
echo "  1. cd $WORKTREE"
echo "  2. Use /qk-plan $ARGUMENT to create plan"
echo "  3. Use /qk-implement $ARGUMENT to build feature"
echo "  4. Use /qk-review $ARGUMENT before creating PR"
echo ""
echo "💡 To test changes:"
echo "   cd $WORKTREE && yarn dev"
echo "   Run dev from inside the worktree so it serves the branch's code."
echo ""
```

## Step 3: Summary

Display final status and available commands.

```bash
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 WORKTREE CREATED: Issue #$ARGUMENT"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Open new Claude session in worktree:"
echo "  cd .claude/worktrees/vibe-$ARGUMENT"
echo "  claude"
echo ""
echo "Then run QK commands:"
echo "  /qk-plan $ARGUMENT      - Create implementation plan"
echo "  /qk-implement $ARGUMENT - Implement the feature"
echo "  /qk-review $ARGUMENT    - Review the implementation"
echo ""
echo "Worktree commands:"
echo "  git worktree list       - List all worktrees"
echo "  git worktree remove     - Remove worktree when done"
echo ""
```

## Cleanup

When done with a worktree, remove it from the main repository:

```bash
# From main repository — the plain remove refuses to run if there are
# uncommitted changes, protecting unfinished work.
git worktree remove .claude/worktrees/vibe-$ARGUMENT
```

⚠️ **Only use `-f` after confirming there is nothing to keep.** `git worktree remove -f` discards uncommitted changes permanently. Check the status first, and push or stash anything worth keeping:

```bash
# Verify the worktree is clean before forcing removal
git -C .claude/worktrees/vibe-$ARGUMENT status --short
# If — and only if — the output is empty (or you have confirmed the changes are disposable):
git worktree remove -f .claude/worktrees/vibe-$ARGUMENT
```
