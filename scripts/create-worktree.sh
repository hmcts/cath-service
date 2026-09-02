#!/bin/bash
# Create git worktree for a GitHub issue
# Usage: ./scripts/create-worktree.sh <issue-number>

set -e  # Exit on any error

ISSUE_NUM=$1
BRANCH="vibe-${ISSUE_NUM}"
WORKTREE=".claude/worktrees/${BRANCH}"

# Validate argument
if [ -z "$ISSUE_NUM" ]; then
  echo "❌ Usage: $0 <issue-number>"
  exit 1
fi

# Check if worktree already exists
if [ -d "$WORKTREE" ]; then
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "✅ Worktree already exists"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

  # Verify the existing directory is a worktree on the expected branch
  ACTUAL_BRANCH=$(git -C "$WORKTREE" rev-parse --abbrev-ref HEAD 2>/dev/null || echo "")
  if [ "$ACTUAL_BRANCH" != "$BRANCH" ]; then
    echo "❌ $WORKTREE exists but is on branch '$ACTUAL_BRANCH', not '$BRANCH'. Resolve manually."
    exit 1
  fi

  git -C "$WORKTREE" status
  exit 0
fi

# Create worktree based on branch availability
if git show-ref --verify --quiet "refs/heads/$BRANCH"; then
  # Branch exists locally
  echo "Branch $BRANCH exists locally, creating worktree..."
  git worktree add "$WORKTREE" "$BRANCH"
elif git ls-remote --heads origin "$BRANCH" | grep -q "$BRANCH"; then
  # Branch exists remotely
  echo "Branch $BRANCH exists remotely, fetching and creating worktree..."
  git fetch origin "$BRANCH:$BRANCH"
  git worktree add "$WORKTREE" "$BRANCH"
else
  # Create new branch from master
  echo "Branch $BRANCH doesn't exist, creating new branch and worktree..."
  git worktree add -b "$BRANCH" "$WORKTREE" master
fi

# Verify worktree was created successfully
if ! git worktree list --porcelain | grep -qF "worktree $(cd "$WORKTREE" && pwd)"; then
  echo "❌ Worktree $WORKTREE was not created successfully."
  exit 1
fi

# Display status
git -C "$WORKTREE" status

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ WORKTREE READY"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Location: $WORKTREE"
echo "Branch:   $BRANCH"
echo ""
echo "Next steps:"
echo "  1. Open new Claude session in worktree:"
echo "     cd $WORKTREE && claude"
echo ""
echo "  2. Run QK commands:"
echo "     /qk-plan ${ISSUE_NUM}      - Create implementation plan"
echo "     /qk-implement ${ISSUE_NUM} - Implement the feature"
echo "     /qk-review ${ISSUE_NUM}    - Review the implementation"
echo ""
echo "💡 To test changes:"
echo "   cd $WORKTREE && yarn dev"
echo ""
