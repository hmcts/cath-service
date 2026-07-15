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

## Step 1: Verify GitHub Issue [AGENT]

Verify the GitHub issue exists and is ready for work.

```
AGENT: general-purpose
DESCRIPTION: Verify GitHub issue #$ARGUMENT exists
PROMPT:
"Check if GitHub issue #$ARGUMENT exists and display basic information.

**Step 1: Fetch issue from GitHub**

\`\`\`bash
gh issue view $ARGUMENT --json number,title,state,labels
\`\`\`

**Step 2: Verify issue**

If issue not found or command fails:
  Return: '❌ Issue #$ARGUMENT not found in GitHub. Verify the issue number and try again.'

If issue state is 'closed':
  Return: '⚠️  Issue #$ARGUMENT is closed. Consider if this should be reopened before starting work.'

**Step 3: Display issue info**

Return: '✅ GitHub Issue #$ARGUMENT verified:
- Title: [title]
- State: [state]
- Labels: [labels or 'none']'"

WAIT FOR AGENT
```

## Step 2: Create Worktree Directory

Create isolated git worktree with branch and dev container support.

```bash
# Check if worktree already exists
if [ -d ".claude/worktrees/vibe-$ARGUMENT" ]; then
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "✅ Worktree already exists"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  cd .claude/worktrees/vibe-$ARGUMENT && git status
else
  # Check if branch exists
  if git show-ref --verify --quiet refs/heads/vibe-$ARGUMENT; then
    echo "Branch vibe-$ARGUMENT exists locally, creating worktree..."
    git worktree add .claude/worktrees/vibe-$ARGUMENT vibe-$ARGUMENT
  elif git ls-remote --heads origin vibe-$ARGUMENT | grep -q vibe-$ARGUMENT; then
    echo "Branch vibe-$ARGUMENT exists remotely, fetching and creating worktree..."
    git fetch origin vibe-$ARGUMENT:vibe-$ARGUMENT
    git worktree add .claude/worktrees/vibe-$ARGUMENT vibe-$ARGUMENT
  else
    echo "Branch vibe-$ARGUMENT doesn't exist, creating new branch and worktree..."
    git worktree add -b vibe-$ARGUMENT .claude/worktrees/vibe-$ARGUMENT master
  fi
  
  cd .claude/worktrees/vibe-$ARGUMENT
  git status
  cd -
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ WORKTREE READY"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Location: .claude/worktrees/vibe-$ARGUMENT"
echo "Branch:   vibe-$ARGUMENT"
echo ""
echo "Next steps:"
echo "  1. cd .claude/worktrees/vibe-$ARGUMENT"
echo "  2. Use /qk-plan $ARGUMENT to create plan"
echo "  3. Use /qk-implement $ARGUMENT to build feature"
echo "  4. Use /qk-review $ARGUMENT before creating PR"
echo ""
echo "💡 To test changes:"
echo "   Run 'yarn dev' from main repo"
echo "   Your worktree branch changes will be active"
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

When done with a worktree:

```bash
# From main repository
git worktree remove .claude/worktrees/vibe-$ARGUMENT

# Or with force if there are uncommitted changes
git worktree remove -f .claude/worktrees/vibe-$ARGUMENT
```
