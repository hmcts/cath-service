---
description: Watch PR for issues and fix them based on the plan
argument-hint: <branch-name>
allowed-tools:
  - Task
  - TodoWrite
  - Bash
  - Read
  - Write
  - Edit
  - Glob
  - Grep
---

# Quick Watch: $ARGUMENT

## Initialize Progress Tracking
Use TodoWrite to create this checklist:
```
- [ ] Find PR and check for feedback
- [ ] Switch to branch (if fixes needed)
- [ ] Fix identified issues
- [ ] Verify fixes
```

## PHASE 1: Find PR and Check Feedback
*Mark "Find PR and check for feedback" as in_progress*

### Step 1.1: Find PR for Branch

```
EXECUTE:
1. Find the PR for branch $ARGUMENT:
   gh pr list --head $ARGUMENT --json number,title,url,state
   
2. If no PR found, output error: "No PR found for branch $ARGUMENT. Create a PR first."
3. Store PR number and extract issue number from title (format: "#123" or "issue 123")
4. Store issue number to locate docs/tickets/<issue-number>/ files
```

### Step 1.2: Gather All Feedback

```
EXECUTE:
1. Fetch PR review comments:
   gh pr view <PR_NUMBER> --json reviews,comments,statusCheckRollup
   
2. Collect:
   - Review comments (inline code comments)
   - PR comments (general discussion)
   - Failed CI checks
   - Review status (CHANGES_REQUESTED, APPROVED, etc.)
   
3. If no feedback/issues found:
   - Output: "✅ No issues found in PR #<PR_NUMBER>. All checks passing!"
   - STOP HERE - do not continue to fixing phase
   
4. Otherwise, continue to check pod logs and fixing phase
```

### Step 1.3: Check Pod Logs for CI/CD Failures [ISOLATED AGENT]

```
IF CI/CD CHECKS FAILED:
  AGENT: infrastructure-engineer
  TASK: Diagnose CI/CD failures by checking pod logs
  
  PROMPT FOR AGENT:
  "The CI/CD pipeline failed for PR #<PR_NUMBER>. Investigate pod logs to identify the root cause:
  
  **STEP 1: Identify Failed Deployment**
  1. Determine the environment from CI check (preview/staging/etc)
  2. Find relevant pods for this service
  
  **STEP 2: Collect Pod Logs**
  1. Get pod status: kubectl get pods -n <namespace>
  2. Check recent logs: kubectl logs <pod-name> -n <namespace> --tail=100
  3. Check previous pod if crash loop: kubectl logs <pod-name> -n <namespace> --previous
  4. Check events: kubectl get events -n <namespace> --sort-by='.lastTimestamp'
  
  **STEP 3: Analyze Logs**
  1. Identify error messages and stack traces
  2. Look for startup failures, configuration issues, resource problems
  3. Note any missing environment variables or secrets
  4. Check for port conflicts or readiness probe failures
  
  **STEP 4: Document Findings**
  Write a summary of:
  - Root cause of the failure
  - Relevant error messages from logs
  - Recommended fixes
  
  Return the diagnostic summary to include with other PR feedback."
  
  WAIT FOR AGENT TO COMPLETE
  INCLUDE POD DIAGNOSTIC SUMMARY IN FEEDBACK
```
*Mark "Find PR and check for feedback" as completed*

## PHASE 2: Switch to Branch and Fix Issues
*Mark "Switch to branch (if fixes needed)" as in_progress*

### Step 2.1: Switch to Branch or Worktree

The branch may be checked out in a linked worktree (as created by `/qk-ship` or `/worktree-create`) or only exist as a normal branch. Detect which and move into the correct working directory — `git checkout` fails if the branch is already checked out in a worktree.

```bash
EXECUTE:
# 1. Detect if the branch is already checked out in a linked worktree
WORKTREE_PATH=$(git worktree list --porcelain \
  | awk -v b="refs/heads/$ARGUMENT" '/^worktree /{p=$2} $0=="branch "b{print p}')

if [ -n "$WORKTREE_PATH" ]; then
  # Branch lives in a worktree — work there, do not checkout in the main repo
  echo "Branch $ARGUMENT is checked out in worktree: $WORKTREE_PATH"
  cd "$WORKTREE_PATH"
else
  # Normal branch — check out in the current repo
  # Fail fast if there are uncommitted changes that would block the checkout
  if [ -n "$(git status --porcelain)" ]; then
    echo "❌ Uncommitted changes detected. Commit or stash before switching."
    exit 1
  fi
  git checkout $ARGUMENT
fi

# 2. Pull latest for the branch (safe in either location)
git pull origin $ARGUMENT
```
*Mark "Switch to branch (if fixes needed)" as completed*
*Mark "Fix identified issues" as in_progress*

### Step 2.2: Execute Fixes [ISOLATED AGENT]

```
AGENT: full-stack-engineer
TASK: Address all PR feedback and fix identified issues
INPUT:
  - docs/tickets/<ISSUE_NUMBER>/ticket.md
  - docs/tickets/<ISSUE_NUMBER>/plan.md
  - PR review comments and feedback
  - Failed CI check details
  - Pod diagnostic summary (if CI/CD failed)

PROMPT FOR AGENT:
"Fix all issues identified in PR #<PR_NUMBER> for issue #<ISSUE_NUMBER>:

**STEP 1: Review Context**
1. Read docs/tickets/<ISSUE_NUMBER>/ticket.md for original requirements
2. Read docs/tickets/<ISSUE_NUMBER>/plan.md for the technical approach
3. Review all PR feedback collected:
   - Review comments (file:line specific feedback)
   - General PR comments
   - Failed CI checks
   - Pod diagnostic summary (if CI/CD failed)

**STEP 2: Categorize Issues**
Group feedback into:
- CRITICAL: Security, accessibility, breaking changes
- HIGH: Test failures, coverage gaps, logic errors
- MEDIUM: Code quality, naming, documentation
- LOW: Style, minor refactoring suggestions

**STEP 3: Fix Issues in Priority Order**
For each issue:
1. Understand the feedback in context of the plan
2. Implement the fix following @CLAUDE.md guidelines
3. Add/update tests if needed
4. Verify the fix doesn't break existing functionality

**STEP 4: Address Failed CI Checks**
If tests failed:
1. Run locally: yarn test:coverage
2. Fix failing tests
3. Ensure >80% coverage maintained

If linting failed:
1. Run: yarn lint:fix
2. Address any remaining lint errors

**STEP 5: Verify All Fixes**
1. Run full test suite: yarn test:coverage
2. Run E2E tests: yarn test:e2e
3. Verify app still boots: yarn dev
4. Ensure all originally passing tests still pass

**IMPORTANT:**
- Stay consistent with the original plan's approach
- Don't introduce new features - only fix identified issues
- Maintain or improve test coverage
- Follow all @CLAUDE.md conventions"

WAIT FOR AGENT TO COMPLETE
```
*Mark "Fix identified issues" as completed*

## PHASE 3: Verification and Push
*Mark "Verify fixes" as in_progress*

### Step 3.1: Final Verification

```
EXECUTE VERIFICATION:
1. Run linting: yarn lint
2. Run tests with coverage: yarn test:coverage
3. Verify >80% coverage maintained
4. Run E2E tests: yarn test:e2e (if they exist)
5. Check app boots: yarn dev (verify 10 seconds, then stop)

IF ANY FAILURES:
  - Use full-stack-engineer agent to fix
  - Repeat until all pass
```

### Step 3.2: Commit and Push

```
EXECUTE:
1. Stage changes (exclude the .devcontainer symlink used by worktrees): git add -A -- ':!.devcontainer'
2. Create commit with references:
   git commit -m "Fix PR feedback for #$ARGUMENT
   
   Addresses review comments and CI failures
   
   Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
   
3. Push to current branch: git push

4. Add comment to PR:
   gh pr comment <PR_NUMBER> --body "🤖 Addressed review feedback:
   - Fixed review comments
   - Resolved CI failures  
   - Maintained >80% test coverage
   
   Ready for re-review."
```
*Mark "Verify fixes" as completed*

## Output to User

Display the following message:

```
PR #<PR_NUMBER> issues fixed for branch $ARGUMENT (issue #<ISSUE_NUMBER>)!

✅ All review comments addressed
✅ CI failures resolved
✅ Tests passing with >80% coverage
✅ Changes pushed and PR updated

---

The PR is ready for re-review. Use /qk-watch $ARGUMENT again if more feedback comes in.
```
