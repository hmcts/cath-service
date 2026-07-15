---
description: Watch PR for issues and fix them based on the plan
argument-hint: <branch-name>
allowed-tools:
  - Agent
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
- [ ] Find PR
- [ ] Wait for CI checks to complete
- [ ] Gather all feedback
- [ ] Switch to branch (if fixes needed)
- [ ] Fix identified issues
- [ ] Verify fixes
```

## PHASE 1: Find PR and Check Feedback
*Mark "Find PR" as in_progress*

### Step 1.1: Find PR for Branch

```bash
EXECUTE:
# 1. Find the PR for branch $ARGUMENT
PR_JSON=$(gh pr list --head "$ARGUMENT" --json number,title,url,state)
PR_NUMBER=$(echo "$PR_JSON" | jq -r '.[0].number // empty')

# 2. Fail closed if no PR exists
if [ -z "$PR_NUMBER" ]; then
  echo "❌ No PR found for branch $ARGUMENT. Create a PR first."
  exit 1
fi

# 3. Extract the issue number from the PR title (formats: "#123" or "issue 123")
PR_TITLE=$(echo "$PR_JSON" | jq -r '.[0].title')
ISSUE_NUMBER=$(echo "$PR_TITLE" | grep -oiE '(#|issue )[0-9]+' | grep -oE '[0-9]+' | head -1)

# 4. Fail closed if the issue number cannot be determined — the fixer agent
#    needs docs/tickets/<issue>/ context and must not run without it
if [ -z "$ISSUE_NUMBER" ]; then
  echo "❌ Could not extract an issue number from PR title: \"$PR_TITLE\"."
  echo "   Expected a '#123' or 'issue 123' reference. Fix the PR title and retry."
  exit 1
fi
echo "PR #$PR_NUMBER → issue #$ISSUE_NUMBER (docs/tickets/$ISSUE_NUMBER/)"
```
*Mark "Find PR" as completed*

### Step 1.2: Wait for CI Checks to Complete
*Mark "Wait for CI checks to complete" as in_progress*

Do NOT take a single snapshot — CI checks are usually still in progress when a PR is opened. Block until every check reaches a terminal state, then act on the settled result. `gh pr checks --watch` polls until all checks finish and exits non-zero if any fail.

```bash
EXECUTE:
# Block until all checks complete. --watch re-polls every --interval seconds;
# it exits 0 when all pass, 8 when there are no checks at all, and non-zero
# (e.g. 1) when one or more checks fail.
gh pr checks "$PR_NUMBER" --watch --interval 30
CHECKS_EXIT=$?

if [ "$CHECKS_EXIT" -eq 8 ]; then
  echo "ℹ️  No CI checks are configured on PR #$PR_NUMBER. Nothing for qk-watch to fix."
  CHECKS_FAILED=false
elif [ "$CHECKS_EXIT" -eq 0 ]; then
  echo "✅ All CI checks passed for PR #$PR_NUMBER."
  CHECKS_FAILED=false
else
  echo "❌ One or more CI checks failed for PR #$PR_NUMBER."
  # Capture which checks failed for the fixing phase
  gh pr checks "$PR_NUMBER" | grep -iv -E '\bpass(ed)?\b' || true
  CHECKS_FAILED=true
fi
```
*Mark "Wait for CI checks to complete" as completed*

### Step 1.3: Gather All Feedback
*Mark "Gather all feedback" as in_progress*

Gather failing CI checks plus **human** review feedback. Exclude bot comments (e.g. CodeRabbit) — those are the developer's to triage, not for auto-fixing. Also skip resolved and outdated threads: the raw `pulls/<n>/comments` REST endpoint returns every inline comment ever posted, so counting those makes the command loop forever "fixing" things that no longer apply. Use GraphQL `reviewThreads` so we can filter on `isResolved` / `isOutdated` / author type.

```bash
EXECUTE:
# Aggregate review decision + summary reviews + top-level comments
gh pr view "$PR_NUMBER" --json reviewDecision,reviews,comments,statusCheckRollup > /tmp/qk-watch-pr.json
REVIEW_DECISION=$(jq -r '.reviewDecision // empty' /tmp/qk-watch-pr.json)

# Inline review THREADS via GraphQL so we can see isResolved / isOutdated / author type.
REPO_OWNER=$(gh repo view --json owner --jq '.owner.login')
REPO_NAME=$(gh repo view --json name --jq '.name')
gh api graphql -f query='
  query($owner:String!, $name:String!, $number:Int!) {
    repository(owner:$owner, name:$name) {
      pullRequest(number:$number) {
        reviewThreads(first:100) {
          nodes {
            isResolved
            isOutdated
            comments(first:1) {
              nodes { path line author { login __typename } body }
            }
          }
        }
      }
    }
  }' -F owner="$REPO_OWNER" -F name="$REPO_NAME" -F number="$PR_NUMBER" > /tmp/qk-watch-threads.json

# Actionable = unresolved, not outdated, and authored by a human (not a Bot).
jq '[.data.repository.pullRequest.reviewThreads.nodes[]
     | select(.isResolved == false and .isOutdated == false)
     | .comments.nodes[0]
     | select(.author.__typename != "Bot")]' /tmp/qk-watch-threads.json > /tmp/qk-watch-actionable.json
ACTIONABLE_COUNT=$(jq 'length' /tmp/qk-watch-actionable.json)

echo "Review decision: ${REVIEW_DECISION:-none} | actionable human review threads: $ACTIONABLE_COUNT | CI failed: $CHECKS_FAILED"
```

Collect for the fixing phase:
- Failed CI checks (from `CHECKS_FAILED` / Step 1.2)
- Actionable human review threads ONLY (`/tmp/qk-watch-actionable.json` — unresolved, current, non-bot)
- Aggregate review decision (`REVIEW_DECISION`) and summary/top-level comments (`/tmp/qk-watch-pr.json`), excluding bot authors

Do NOT act on bot comments (CodeRabbit etc.), resolved threads, or outdated comments — leave those for the developer.

**Early exit — only when genuinely clean:**
- STOP with "✅ No issues found in PR #$PR_NUMBER. All checks passing!" ONLY IF all of:
  - `CHECKS_FAILED` is false, AND
  - `ACTIONABLE_COUNT` is 0
- Otherwise continue to the pod-log check and fixing phase.
*Mark "Gather all feedback" as completed*

### Step 1.4: Check Pod Logs for CI/CD Failures [ISOLATED AGENT]

```
IF CHECKS_FAILED is true AND the failure is a deployment/environment check (not a unit-test or lint failure):
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

## PHASE 2: Switch to Branch and Fix Issues
*Mark "Switch to branch (if fixes needed)" as in_progress*

### Step 2.1: Switch to Branch or Worktree

The branch may be checked out in a linked worktree (as created by `/qk-ship` or `/qk-worktree`) or only exist as a normal branch. Detect which and move into the correct working directory — `git checkout` fails if the branch is already checked out in a worktree.

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
  git checkout "$ARGUMENT"
fi

# 2. Guard against a dirty tree in EITHER location. Phase 3 stages everything
#    with `git add -A`, so pre-existing uncommitted changes would be swept into
#    the fix commit. Stashing is unsafe in linked worktrees, so abort instead.
if [ -n "$(git status --porcelain)" ]; then
  echo "❌ Uncommitted changes in $(pwd). Commit, discard, or move them before running qk-watch —"
  echo "   the fix phase stages all changes and would otherwise commit unrelated work."
  exit 1
fi

# 3. Pull latest for the branch (safe now that the tree is clean)
git pull origin "$ARGUMENT"
```
*Mark "Switch to branch (if fixes needed)" as completed*
*Mark "Fix identified issues" as in_progress*

### Step 2.2: Execute Fixes [ISOLATED AGENT]

```
AGENT: full-stack-engineer
TASK: Fix failing CI checks and address actionable human review feedback
INPUT:
  - docs/tickets/<ISSUE_NUMBER>/ticket.md
  - docs/tickets/<ISSUE_NUMBER>/plan.md
  - Failed CI check details (from Step 1.2)
  - Actionable human review threads: /tmp/qk-watch-actionable.json
  - Pod diagnostic summary (if a deployment check failed)

PROMPT FOR AGENT:
"Fix the failing CI checks and address the actionable HUMAN review feedback on PR #<PR_NUMBER> for issue #<ISSUE_NUMBER>. Do NOT act on bot comments (e.g. CodeRabbit), resolved threads, or outdated comments — those are the developer's to triage.

**STEP 1: Review Context**
1. Read docs/tickets/<ISSUE_NUMBER>/ticket.md for original requirements
2. Read docs/tickets/<ISSUE_NUMBER>/plan.md for the technical approach
3. Review the collected work items:
   - Failed CI checks (from Step 1.2)
   - Actionable human review threads (/tmp/qk-watch-actionable.json — file:line specific, unresolved, non-bot)
   - Pod diagnostic summary (if a deployment check failed)

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
3. Verify app still boots — `yarn dev` is a long-running foreground server, so
   run it BOUNDED in the background and always terminate it (never block on it):
   \`\`\`bash
   yarn dev > /tmp/qk-watch-dev.log 2>&1 &
   DEV_PID=$!
   # Give it up to 30s to boot, then tear it down regardless
   sleep 30
   kill "$DEV_PID" 2>/dev/null; wait "$DEV_PID" 2>/dev/null || true
   # Treat a crash/stack trace in the log as a boot failure
   grep -iE 'error|exception|EADDRINUSE|cannot find module' /tmp/qk-watch-dev.log && echo "⚠️ boot issues" || echo "✅ booted"
   \`\`\`
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

```bash
EXECUTE VERIFICATION:
1. Run linting: yarn lint
2. Run tests with coverage: yarn test:coverage
3. Verify >80% coverage maintained
4. Run E2E tests: yarn test:e2e (if they exist)
5. Check the app boots — bound and always terminate the dev server; never
   leave it running or block the step on it:
   yarn dev > /tmp/qk-watch-dev.log 2>&1 &
   DEV_PID=$!
   sleep 30
   kill "$DEV_PID" 2>/dev/null; wait "$DEV_PID" 2>/dev/null || true
   grep -iE 'error|exception|EADDRINUSE|cannot find module' /tmp/qk-watch-dev.log && echo "⚠️ boot issues" || echo "✅ booted"

IF ANY FAILURES:
  - Use full-stack-engineer agent to fix
  - Repeat until all pass (subject to the 3-attempt cap in Step 3.3)
```

### Step 3.2: Commit and Push

```
EXECUTE:
1. Stage changes: git add -A
2. Create commit with references:
   git commit -m "Fix PR feedback for #$ARGUMENT
   
   Addresses review comments and CI failures
   
   Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
   
3. Push to current branch: git push

4. Add comment to PR:
   gh pr comment "$PR_NUMBER" --body "🤖 Addressed review feedback:
   - Fixed review comments
   - Resolved CI failures  
   - Maintained >80% test coverage
   
   Ready for re-review."
```

### Step 3.3: Re-watch CI After Pushing Fixes

Pushing in Step 3.2 triggers a fresh CI run. Do NOT stop here — keep watching until CI settles green, so ongoing check failures introduced (or not fixed) by the last push are caught in the same session.

```bash
EXECUTE:
# Give GitHub a moment to register the new checks, then block on them again.
sleep 15
gh pr checks "$PR_NUMBER" --watch --interval 30
RECHECK_EXIT=$?

if [ "$RECHECK_EXIT" -eq 0 ] || [ "$RECHECK_EXIT" -eq 8 ]; then
  echo "✅ CI is green after fixes for PR #$PR_NUMBER."
  # Fall through to "Output to User" — done.
else
  echo "❌ CI still failing after fixes for PR #$PR_NUMBER."
  # LOOP BACK: return to Step 1.3 (Gather All Feedback) and repeat the
  # gather → fix → push → re-watch cycle against the new failures.
fi
```

**Loop control:** repeat the Phase 1.3 → Phase 3 cycle until CI is green (exit 0/8), with a safety cap of **3 fix attempts**. If still failing after 3 attempts, STOP and report the remaining failures to the user rather than looping indefinitely — a persistent failure usually needs human judgement.

*Mark "Verify fixes" as completed*

## Output to User

Display the following message:

```
PR #<PR_NUMBER> watched to completion for branch $ARGUMENT (issue #<ISSUE_NUMBER>)!

✅ All review comments addressed
✅ CI checks green (watched to terminal state)
✅ Tests passing with >80% coverage
✅ Changes pushed and PR updated

---

The PR is ready for re-review. Use /qk-watch $ARGUMENT again if more feedback comes in.
```

If the safety cap was hit, display instead:

```
⚠️  PR #<PR_NUMBER> still has failing CI after 3 fix attempts.

Remaining failures:
<list failing checks>

This needs a human look — the same checks keep failing after automated fixes.
```
