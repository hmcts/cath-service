---
description: Implement GitHub issue with comprehensive quality workflow
argument-hint: <issue-number>
allowed-tools:
  - Bash
  - Read
  - Write
  - Edit
  - Agent
  - TodoWrite
  - Skill
---

# Ship Issue: $ARGUMENT

**Full implementation workflow: plan → implement → review → verify**

## Initialize Progress Tracking

Use TodoWrite to create workflow checklist:
```
- [ ] Create worktree for issue
- [ ] Fetch issue and create checklist
- [ ] Explore codebase for similar patterns
- [ ] Create high-level implementation plan
- [ ] Get developer feedback on plan
- [ ] Implement
- [ ] Simplify code
- [ ] Security review
- [ ] Multi-dimensional review
- [ ] Verify (build/lint/test)
- [ ] Final guards
```

## ═══════════════════════════════════════
## PHASE 0: WORKTREE SETUP
## ═══════════════════════════════════════

## Step 0: Create Worktree [AGENT]

*Mark "Create worktree for issue" as in_progress*

Create isolated git worktree for this issue.

```
AGENT: general-purpose
DESCRIPTION: Create worktree for issue-$ARGUMENT
PROMPT:
"Create git worktree for issue #$ARGUMENT.

**Worktree Setup:**

Branch name: issue-$ARGUMENT
Worktree path: ../cath-$ARGUMENT

**Steps:**

1. Check if branch exists locally or remotely:
   \`\`\`bash
   git branch -a | grep issue-$ARGUMENT
   \`\`\`

2. If branch exists remotely, fetch it:
   \`\`\`bash
   git fetch origin issue-$ARGUMENT:issue-$ARGUMENT
   \`\`\`

3. Create worktree:
   - If branch doesn't exist locally or remotely:
     \`\`\`bash
     git worktree add -b issue-$ARGUMENT ../cath-$ARGUMENT master
     \`\`\`
   - If branch exists:
     \`\`\`bash
     git worktree add ../cath-$ARGUMENT issue-$ARGUMENT
     \`\`\`

4. Verify worktree:
   \`\`\`bash
   cd ../cath-$ARGUMENT && git status
   \`\`\`

5. Add to VS Code:
   \`\`\`bash
   code --add ../cath-$ARGUMENT
   \`\`\`

**Return:**
- Worktree path: ../cath-$ARGUMENT
- Branch: issue-$ARGUMENT
- Status: created/already-exists

**IMPORTANT:** All subsequent work in this session will be done in the worktree at ../cath-$ARGUMENT"

WAIT FOR AGENT
```

*Mark "Create worktree for issue" as completed*

**From this point forward, all commands must be run in the worktree directory: ../cath-$ARGUMENT**

## ═══════════════════════════════════════
## PHASE 1: PLANNING
## ═══════════════════════════════════════

## Step 1: Fetch Issue and Create Checklist [AGENT]

*Mark "Fetch issue and create checklist" as in_progress*

Fetch issue from GitHub and generate checklist based on acceptance criteria.

```
AGENT: general-purpose
DESCRIPTION: Fetch issue and create checklist
PROMPT:
"Fetch GitHub issue #$ARGUMENT and create implementation checklist.

**STEP 1: Fetch Issue**

Use gh CLI:
\`\`\`bash
gh issue view $ARGUMENT --json number,title,body,labels
\`\`\`

Write raw issue to: docs/tickets/$ARGUMENT/ticket.md

**STEP 2: Extract Acceptance Criteria**

[If issue has explicit acceptance criteria section, extract them]
[If not, derive 3-5 specific, measurable ACs from the description]

**STEP 3: Build Checklist**

Write to docs/tickets/$ARGUMENT/checklist.md:

\`\`\`markdown
# Checklist: Issue #$ARGUMENT - [Title]

## Acceptance Criteria (verify each when complete)

- [ ] AC1: [specific, measurable criterion]
- [ ] AC2: [specific, measurable criterion]
- [ ] AC3: [specific, measurable criterion]

## Verification Steps

- [ ] Build passes: \`yarn build\`
- [ ] Lint passes: \`yarn lint\`
- [ ] Tests pass: \`yarn test\`
- [ ] E2E tests pass (if applicable): \`yarn test:e2e\`
- [ ] Coverage >80%: \`yarn test:coverage\`

## Code Quality Checks

- [ ] Self-review: \`git diff\`
- [ ] All acceptance criteria verified
- [ ] No TODO comments left
- [ ] No console.log statements
\`\`\`

Return: 'Issue #$ARGUMENT fetched. Checklist created with [N] acceptance criteria'"

WAIT FOR AGENT
```

*Mark "Fetch issue and create checklist" as completed*

## Step 2: Explore Codebase for Similar Patterns [AGENT]

*Mark "Explore codebase for similar patterns" as in_progress*

Use Explore agent to find similar patterns based on acceptance criteria.

```
AGENT: Explore
DESCRIPTION: Search for similar patterns matching AC
PROMPT:
"Search the codebase for patterns that match the acceptance criteria.

**Read first:**
- Checklist: docs/tickets/$ARGUMENT/checklist.md

**Search breadth: medium**

Based on the acceptance criteria, search for similar existing patterns:
- Similar page controllers (libs/*/src/pages/)
- Similar database models (libs/postgres-prisma/prisma/schema/)
- Similar business logic or services
- Similar integrations (notification service, list processors, etc.)
- Similar GOV.UK component usage

**Write to: docs/tickets/$ARGUMENT/findings.md**

# Codebase Findings: Issue #$ARGUMENT

## Similar Patterns Found

For each similar pattern, document:

### [Pattern Name]
**Location:** [file path]
**What it does:** [brief description]
**Relevant to AC:** [which acceptance criterion this relates to]
**How to apply:** [how this pattern should inform the implementation]

## Integration Patterns

Document how similar features integrate:
- Service registrations (where and how)
- Module registrations (apps/web/src/app.ts patterns)
- Route patterns
- Database schema patterns

## Architecture Notes

- Existing patterns to follow
- Module organization approach
- Common utilities or shared code to reuse

Return: 'Found [N] relevant patterns'"

WAIT FOR AGENT
```

*Mark "Explore codebase for similar patterns" as completed*

## Step 3: Create High-Level Implementation Plan [AGENT]

*Mark "Create high-level implementation plan" as in_progress*

Generate implementation plan based on checklist, findings, and CLAUDE.md architecture.

```
AGENT: full-stack-engineer
DESCRIPTION: Create high-level implementation plan
PROMPT:
"Create a high-level implementation plan for issue #$ARGUMENT.

**Read:**
- Ticket: docs/tickets/$ARGUMENT/ticket.md
- Conflicts: docs/tickets/$ARGUMENT/conflicts.md
- Checklist: docs/tickets/$ARGUMENT/checklist.md
- Codebase Findings: docs/tickets/$ARGUMENT/findings.md
- Architecture: @CLAUDE.md

**Task:**
Create docs/tickets/$ARGUMENT/plan.md that covers EVERY acceptance criteria point from the checklist.

# Implementation Plan: Issue #$ARGUMENT

## Overview
[Brief summary of what needs to be implemented]

## Conflict Mitigation
[Summarize conflicts from conflicts.md and mitigation strategy]

## Acceptance Criteria Coverage

For EACH acceptance criterion in the checklist, describe the implementation approach:

### AC1: [Criterion text]
**Approach:**
- [How this will be satisfied]
- [Which modules/files will be created/modified]
- [Similar pattern reference from findings.md if applicable]

### AC2: [Criterion text]
**Approach:**
- [How this will be satisfied]
- [Which modules/files will be created/modified]
- [Similar pattern reference from findings.md if applicable]

[Continue for ALL acceptance criteria]

## Module Structure (following CLAUDE.md)
- Which libs/ modules to create or modify
- Package structure and dependencies
- Module exports and config.ts setup
- Reference similar patterns from findings.md

## Database Changes (if needed)
- Prisma schema files to modify
- New models or fields
- Migration considerations
- Reference similar schemas from findings.md

## Pages/UI (if applicable)
- Page controllers to create (libs/*/src/pages/)
- Nunjucks templates
- GOV.UK components to use
- Welsh translations required
- Reference similar pages from findings.md

## API Endpoints (if applicable)
- Route definitions
- Request/response formats
- Validation requirements
- Reference similar routes from findings.md

## Integration Points
- Service registrations (notification builders, list processors, etc.)
- App registrations (apps/web/src/app.ts, apps/api/src/app.ts)
- Module path configurations
- Route registrations
- Reference integration patterns from findings.md

## Testing Approach
- Unit tests required
- E2E test scenarios
- Accessibility testing

## Implementation Notes
- Any assumptions or clarifications needed
- Security considerations
- Performance considerations
- Edge cases to handle

**CRITICAL:**
- Every AC must be covered
- Follow @CLAUDE.md architecture patterns
- Reference similar patterns from findings.md
- Be specific about files and integration points
- Make this editable by the developer

Return: 'Plan created covering [N] acceptance criteria, referencing [M] similar patterns'"

WAIT FOR AGENT
```

## Step 4: Present Plan and Get Developer Feedback

Present the plan to developer for review and feedback.

```
ACTION: Present implementation plan

1. Read docs/tickets/$ARGUMENT/plan.md
2. Display the plan to the developer
3. Use AskUserQuestion to ask:
   - Does the plan cover all acceptance criteria correctly?
   - Any changes needed to the approach?
   - Any clarifications or constraints?
   - Approval to proceed with implementation?

Note to developer: You can edit docs/tickets/$ARGUMENT/plan.md directly if you want to adjust the approach.

If developer approves, mark "Create high-level implementation plan" as completed.
If developer requests changes, wait for them to edit the plan, then ask for approval again.
```

*Mark "Create high-level implementation plan" as completed (only after developer approval)*
*Mark "Get developer feedback on plan" as completed*

## ═══════════════════════════════════════
## PHASE 2: IMPLEMENTATION
## ═══════════════════════════════════════

## Step 5: Implementation [AGENT]

*Mark "Implement" as in_progress*

Implementation agent follows the approved plan.

```
AGENT: full-stack-engineer
DESCRIPTION: Implement issue $ARGUMENT with full integration
PROMPT:
"Implement issue #$ARGUMENT with ALL integrations complete.

**CRITICAL: Worktree Isolation**
- You are working in a git worktree at ../worktrees/issue-$ARGUMENT
- This is a separate working directory with its own branch
- The main repository is unaffected by your changes
- Multiple agents can work in parallel in their own worktrees

**Context:**
Read: 
- docs/tickets/$ARGUMENT/conflicts.md
- docs/tickets/$ARGUMENT/checklist.md
- docs/tickets/$ARGUMENT/plan.md
- docs/tickets/$ARGUMENT/findings.md

**BEFORE CODING - Planning Review:**

1. Read the approved plan thoroughly
2. Read the checklist for integration points
3. Read findings for similar patterns to follow
4. For each integration point, understand:
   - WHAT needs to be done
   - WHERE (exact file path)
   - HOW to verify it works

**Implementation Process:**

1. **Follow the approved plan**
   - Implement exactly as described in plan.md
   - Use similar patterns from findings.md
   - Follow CLAUDE.md architecture patterns

2. **Implement core business logic**
   - Library modules in libs/
   - Co-locate tests and translations

3. **Implement EVERY integration point**
   
   ⚠️ CRITICAL: Go through the checklist one by one
   
   For each integration point:
   - Read the 'What' - understand what needs wiring
   - Navigate to the 'Where' file
   - Make the necessary modifications (imports, registrations, configs)
   - Mark [x] when complete

4. **Write tests**
   - Unit tests (AAA pattern, co-located)
   - E2E tests if user journey
   - Test integration points (mock external systems appropriately)
   - Follow testing approach from plan.md

5. **Update checklist** continuously:
   - Mark [x] as you complete each item
   - Don't mark integration points done until you've verified the code exists

6. **Verify against plan:**
   - Every AC from plan.md is satisfied
   - All approaches described in plan.md are implemented
   - All integration points from plan.md are complete

7. **Self-verify before claiming done:**
   - For each integration point: open the file, confirm your changes are there
   - Don't rely on memory - actually check the files
   - If checklist says 'register in X', verify X was modified
   
**CRITICAL - Do NOT return until COMPLETE:**

If you run out of time/context:
- DO NOT return 'Implementation complete' if ANY work remains
- Instead return: 'Implementation INCOMPLETE. Completed: [list]. Remaining: [specific items].'
- This allows the workflow to continue you properly
   
**REMEMBER:** 
- Business logic alone ≠ working feature
- Integration points are REQUIRED, not optional
- Marking checklist [x] doesn't make it true - verify the code

Return: 'Implementation complete. [N] ACs satisfied, [M] integration points wired up, [K] files modified.'"

WAIT FOR AGENT
```

**Post-Implementation Checkpoint:**

Verify completion and loop back if incomplete:

```bash
EXECUTE:
AC_TOTAL=$(grep -c "^- \[ \].*AC\|^- \[x\].*AC" docs/tickets/$ARGUMENT/checklist.md || echo "0")
AC_COMPLETE=$(grep -c "^- \[x\].*AC" docs/tickets/$ARGUMENT/checklist.md || echo "0")
AC_INCOMPLETE=$((AC_TOTAL - AC_COMPLETE))

if [ $AC_INCOMPLETE -gt 0 ]; then
  echo "⚠️  $AC_INCOMPLETE/$AC_TOTAL ACs incomplete - continuing implementation..."
  # Loop back to implementation agent with remaining items
  exit 1  # Signal to re-run implementation
else
  echo "✅ All $AC_TOTAL ACs complete"
fi
```

IF checkpoint fails: Re-run implementation agent with updated prompt focusing on remaining checklist items. Repeat until all ACs complete.

*Mark "Implement" as completed*

## ═══════════════════════════════════════
## PHASE 3: CODE QUALITY & REVIEW
## ═══════════════════════════════════════

## Step 6: Code Simplification

*Mark "Simplify code" as in_progress*

```
SKILL: simplify
```

*Mark "Simplify code" as completed*

## Step 7: Security Review

*Mark "Security review" as in_progress*

```
SKILL: security-review
```

*Mark "Security review" as completed*

## Step 8: Multi-Dimensional Review & Fix [PARALLEL AGENTS]

*Mark "Multi-dimensional review" as in_progress*

```
AGENT: ui-ux-engineer
DESCRIPTION: Fix accessibility and GOV.UK issues
PROMPT:
"Review and FIX accessibility/GOV.UK issues for #$ARGUMENT.

Changes: \`git diff\`

Find and fix: WCAG 2.2 AA violations, keyboard navigation, screen reader issues, GOV.UK component usage, Welsh translations.

Return: 'Fixed [N] issues' or 'No issues found'"

AGENT: code-reviewer  
DESCRIPTION: Fix code quality issues
PROMPT:
"Review and FIX code quality issues for #$ARGUMENT.

Changes: \`git diff\`

Find and fix: TypeScript any types, missing error handling, CLAUDE.md violations, performance issues, unused code.

Return: 'Fixed [N] issues' or 'No issues found'"

AGENT: test-engineer
DESCRIPTION: Fix test gaps
PROMPT:
"Review and FIX test gaps for #$ARGUMENT.

Test files: [find .test.ts and .spec.ts]
Coverage: \`yarn test:coverage\`

Find and fix: Coverage <80%, missing edge cases, non-AAA pattern, missing E2E tests, missing accessibility tests.

Return: 'Added [N] tests, coverage now [%]' or 'Tests adequate'"

WAIT FOR ALL THREE AGENTS
```

*Mark "Multi-dimensional review" as completed*

## ═══════════════════════════════════════
## PHASE 4: VERIFICATION & FINAL GUARDS
## ═══════════════════════════════════════

## Step 9: Verification [CRITICAL]

*Mark "Verify (build/lint/test)" as in_progress*

Run all verification checks after code changes.

```bash
EXECUTE:
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔍 VERIFICATION PHASE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

FAILED=0

echo "1️⃣  Building..."
if yarn build; then
  echo "✅ Build passed"
else
  echo "❌ Build FAILED"
  FAILED=1
fi
echo ""

echo "2️⃣  Linting..."
yarn lint:fix > /dev/null 2>&1
if yarn lint; then
  echo "✅ Lint passed"
else
  echo "❌ Lint FAILED"
  FAILED=1
fi
echo ""

echo "3️⃣  Running unit tests..."
if yarn test; then
  echo "✅ Unit tests passed"
else
  echo "❌ Unit tests FAILED"
  FAILED=1
fi
echo ""

echo "4️⃣  Checking coverage..."
COVERAGE_OUTPUT=$(yarn test:coverage 2>&1)
echo "$COVERAGE_OUTPUT" > /tmp/coverage-$ARGUMENT.txt

COVERAGE_PCT=$(echo "$COVERAGE_OUTPUT" | grep -oE '[0-9]+\.[0-9]+%' | head -1 | tr -d '%' || echo "0")

if [ ! -z "$COVERAGE_PCT" ]; then
  COVERAGE_INT=$(echo "$COVERAGE_PCT" | cut -d'.' -f1)
  if [ "$COVERAGE_INT" -ge 80 ]; then
    echo "✅ Coverage: ${COVERAGE_PCT}% (>80%)"
  else
    echo "⚠️  Coverage: ${COVERAGE_PCT}% (<80%)"
  fi
else
  echo "ℹ️  Coverage report generated"
fi
echo ""

echo "5️⃣  Running E2E tests..."
if yarn test:e2e; then
  echo "✅ E2E tests passed"
else
  echo "⚠️  E2E tests FAILED or skipped"
fi
echo ""

echo "6️⃣  Checking for code smells..."
if git diff | grep -E "^\+.*console\.(log|debug|info)" > /dev/null; then
  echo "⚠️  Found console.log statements"
else
  echo "✅ No console.log statements"
fi
echo ""

if git diff | grep -E "^\+.*TODO" > /dev/null; then
  echo "⚠️  Found TODO comments"
else
  echo "✅ No TODO comments"
fi
echo ""

if [ $FAILED -eq 1 ]; then
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "❌ VERIFICATION FAILED"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  exit 1
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ ALL CHECKS PASSED"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
```

*Mark "Verify (build/lint/test)" as completed*

## Step 10: Final Guards

*Mark "Final guards" as in_progress*

```bash
EXECUTE:
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔄 FINAL VERIFICATION"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

FAILED=0

# Verify all ACs marked complete
echo "1️⃣  Checking acceptance criteria..."
AC_TOTAL=$(grep -c "^- \[ \].*AC\|^- \[x\].*AC" docs/tickets/$ARGUMENT/checklist.md || echo "0")
AC_COMPLETE=$(grep -c "^- \[x\].*AC" docs/tickets/$ARGUMENT/checklist.md || echo "0")
AC_INCOMPLETE=$((AC_TOTAL - AC_COMPLETE))

if [ $AC_INCOMPLETE -gt 0 ]; then
  echo "❌ $AC_INCOMPLETE acceptance criteria not complete"
  FAILED=1
else
  echo "✅ All $AC_TOTAL acceptance criteria complete"
fi
echo ""

# Final build check
echo "2️⃣  Final build check..."
if ! yarn build > /dev/null 2>&1; then
  echo "❌ Build failed"
  FAILED=1
else
  echo "✅ Build passed"
fi
echo ""

# Final test check
echo "3️⃣  Final test check..."
if ! yarn test > /dev/null 2>&1; then
  echo "❌ Tests failed"
  FAILED=1
else
  echo "✅ Tests passed"
fi
echo ""

if [ $FAILED -eq 1 ]; then
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "❌ VERIFICATION FAILED"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  echo "Cannot proceed - fix failures above"
  exit 1
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ 100% COMPLETE - READY FOR COMMIT"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
```

*Mark "Final guards" as completed*

## Step 11: Summary

```bash
EXECUTE:
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ IMPLEMENTATION COMPLETE: Issue #$ARGUMENT"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Status:"
echo "   • Acceptance Criteria ✅"
echo "   • Integration Points ✅"
echo "   • Build ✅"
echo "   • Tests ✅"
echo "   • Security Review ✅"
echo "   • Code Quality ✅"
echo ""
echo "📋 NEXT STEPS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "1. Review changes:"
echo "   git status"
echo "   git diff"
echo ""
echo "2. Commit:"
echo "   git add ."
echo "   git commit -m \"feat: implement issue #$ARGUMENT\""
echo ""
echo "3. Push and create PR:"
echo "   git push"
echo "   gh pr create --title \"Issue #$ARGUMENT\" --body \"Closes #$ARGUMENT\""
echo ""
echo "4. Optional - Monitor CI/CD:"
echo "   Ask: 'Can you watch the CI checks?'"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
```

## ═══════════════════════════════════════
## OPTIONAL STEP: CI/CD MONITORING
## ═══════════════════════════════════════

**Run this step ONLY if the user creates a PR and explicitly asks for CI/CD monitoring.**

If the user says something like:
- "Can you watch the CI checks?"
- "Monitor the PR for failures"
- "Fix any CI/CD issues that come up"

Then proceed with CI/CD monitoring:

### Monitoring Process

1. **Get PR number:**
   Ask user: "What's the PR number?" OR extract from `gh pr list --head issue-$ARGUMENT`

2. **Initial check:**
   ```bash
   PR_NUMBER=$(gh pr list --head issue-$ARGUMENT --json number --jq '.[0].number')
   echo "Monitoring PR #$PR_NUMBER..."
   gh pr view $PR_NUMBER --json statusCheckRollup,url
   ```

3. **Monitor loop:**
   
   While monitoring:
   
   a) **Check status:**
      ```bash
      gh pr checks $PR_NUMBER
      ```
   
   b) **If checks are pending:**
      - Inform user: "CI/CD checks running... (X/Y complete)"
      - Wait 45 seconds
      - Check again
   
   c) **If any check fails:**
      - Get failure details: `gh pr checks $PR_NUMBER --required`
      - Identify issue type (build, test, lint, e2e, coverage, etc.)
      - Fix the issue
      - Commit with message: "fix: resolve [check-name] failure"
      - Push changes to the feature branch
      - Inform user what was fixed
      - Return to monitoring
   
   d) **If all checks pass:**
      - Inform user: "✅ All CI/CD checks passing"
      - List any fixes that were made
      - Exit monitoring

4. **Exit conditions:**
   - ✅ All checks pass
   - User says "stop", "I'll handle it", or similar
   - 5 fix attempts reached without success (ask user for guidance)
   - Issue is clearly environmental/infrastructure (not code)

### Common CI/CD Fixes

| Check Failure | How to Fix |
|---------------|------------|
| **Lint** | `yarn lint:fix`, commit fixes |
| **Build** | Fix TypeScript errors, missing imports, type issues |
| **Unit Tests** | Read error output, fix failing assertions/mocks |
| **E2E Tests** | Check for timing issues, missing test data, selector changes |
| **Coverage** | Add tests for uncovered code paths |
| **Accessibility** | Fix WCAG violations in templates |
| **Security Scan** | Update vulnerable dependencies or fix code issues |

### Example Monitoring Session

```bash
# Get PR number
PR_NUMBER=$(gh pr list --head issue-$ARGUMENT --json number --jq '.[0].number')

# Initial check
echo "Monitoring PR #$PR_NUMBER..."
gh pr checks $PR_NUMBER

# If failures detected:
echo "❌ CI/CD checks failed. Analyzing..."
gh pr checks $PR_NUMBER --required

# After fixing:
git add .
git commit -m "fix: resolve E2E test selector issue"
git push origin issue-$ARGUMENT

# Wait and check again:
sleep 45
gh pr checks $PR_NUMBER
# Repeat until all pass...
```

### Important Notes

- **Do NOT start monitoring unless explicitly asked**
- This is an OPTIONAL step - implement-ticket works without it
- Monitoring can be CPU/time intensive
- Some CI failures need human intervention (infra, credentials, etc.)
- Maximum 5 fix attempts - then ask for help
- Always inform user what you're doing during monitoring
- Fixes are committed to the feature branch (issue-$ARGUMENT)

**If user does NOT create a PR or request monitoring, this step is skipped entirely.**
