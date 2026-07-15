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
- [ ] Verify ticket status and mark in_progress
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
## PHASE 0: VERIFICATION & WORKTREE SETUP
## ═══════════════════════════════════════

## Step 0: Check Ticket Refinement [AGENT]

*Mark "Verify ticket status" as in_progress*

Verify the GitHub issue has been properly refined and is ready for implementation.

```
AGENT: general-purpose
DESCRIPTION: Verify ticket #$ARGUMENT refinement status
PROMPT:
"Check if GitHub issue #$ARGUMENT is properly refined and ready for implementation.

**Step 1: Fetch issue from GitHub**

\`\`\`bash
gh issue view $ARGUMENT --json number,title,body,labels,comments
\`\`\`

**Step 2: Check refinement indicators**

Review the issue for:

1. **Labels check:**
   - Has 'refinement-done' label OR
   - Has 'ready-for-dev' label OR
   - Explicitly marked as refined in title/body

2. **Acceptance criteria check:**
   - Issue body contains clear acceptance criteria section OR
   - Acceptance criteria are clearly defined OR
   - Requirements are specific and measurable

3. **Outstanding questions check:**
   - Look for unresolved questions in body/comments
   - Check for labels like 'needs-clarification', 'question', 'blocked'
   - Look for recent comments asking for clarification
   - Check if last comment is unanswered question

**Step 3: Decision logic**

If ANY of these are true, STOP with warning:
- Has 'needs-clarification' or 'question' or 'blocked' label
- Comments contain unanswered questions (check timestamps)
- No clear acceptance criteria found
- Issue body says 'TBD', 'TODO', or similar placeholders

If refinement looks good:
- Display summary: title, labels, acceptance criteria count
- Continue to next step

**Step 4: Output**

If NOT ready:
  Return: '❌ Ticket #$ARGUMENT not ready for implementation:
  - [List specific issues found]
  
  Recommendation: Review issue on GitHub and ensure refinement is complete.'

If ready:
  Return: '✅ Ticket #$ARGUMENT refinement verified:
  - Title: [title]
  - Labels: [labels]
  - Acceptance criteria: [count] found
  - No outstanding questions'"

WAIT FOR AGENT
```

*Mark "Verify ticket status" as completed*


## Step 1: Create Worktree

*Mark "Create worktree for issue" as in_progress*

Create isolated git worktree for this issue using direct bash commands (no agent needed - this is a simple 5-command task).

```bash
# Check if worktree already exists
if [ -d ".claude/worktrees/vibe-$ARGUMENT" ]; then
  echo "Worktree already exists at .claude/worktrees/vibe-$ARGUMENT"
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
  
  # Create .devcontainer symlink for isolated dev container testing
  cd .claude/worktrees/vibe-$ARGUMENT
  ln -s ../../../.devcontainer .devcontainer
  echo "✅ Created .devcontainer symlink for isolated container testing"
  
  git status
fi

echo "✅ Worktree ready at .claude/worktrees/vibe-$ARGUMENT"
echo "💡 To test in isolated dev container: code .claude/worktrees/vibe-$ARGUMENT && reopen in container"
```

*Mark "Create worktree for issue" as completed*

**From this point forward, all commands must be run in the worktree directory: .claude/worktrees/vibe-$ARGUMENT**

## ═══════════════════════════════════════
## PHASE 1: PLANNING
## ═══════════════════════════════════════

## Step 2: Fetch Issue and Create Checklist [AGENT]

*Mark "Fetch issue and create checklist" as in_progress*

Fetch issue from GitHub and generate checklist based on acceptance criteria.

After the checklist is created, **assess task complexity** to determine planning approach:
- Count acceptance criteria
- Estimate files to modify (UI/API/DB/config)
- Check for new module creation

**Complexity Assessment:**
- **SIMPLE**: ≤3 ACs, ≤5 files, no new modules, no DB changes → Use Step 3b (concise plan)
- **COMPLEX**: >3 ACs OR >5 files OR new modules OR DB changes → Use Step 3a (full exploration + detailed plan)

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

## Step 3a: Full Planning for Complex Tasks [PARALLEL AGENTS]

**USE THIS PATH IF:** >3 ACs OR >5 files OR new modules OR DB changes

*Mark "Explore codebase for similar patterns" as in_progress*

### Sub-step 3a.1: Explore Codebase for Similar Patterns [AGENT]

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

### Sub-step 3a.2: Create Detailed Implementation Plan [AGENT]

*Mark "Create high-level implementation plan" as in_progress*

Generate comprehensive implementation plan based on checklist, findings, and CLAUDE.md architecture.

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
- Unit tests (co-located *.test.ts files, AAA pattern)
- E2E test scenarios (if user journey - see .claude/rules/e2e-testing.md)
  - Include AxeBuilder accessibility checks INLINE in journey tests
  - NO separate accessibility test files
  - Check Welsh translations within the same journey test

## Implementation Notes
- Any assumptions or clarifications needed
- Security considerations
- Performance considerations
- Edge cases to handle

**Planning Requirements:**
- Every AC must be covered
- Follow @CLAUDE.md architecture patterns
- Reference similar patterns from findings.md
- Be specific about files and integration points
- Make this editable by the developer

Return: 'Plan created covering [N] acceptance criteria, referencing [M] similar patterns'"

WAIT FOR AGENT
```

## Step 5: Present Plan and Get Developer Feedback

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

## Step 3b: Concise Planning for Simple Tasks [AGENT]

*Mark "Explore codebase for similar patterns" as in_progress*
*Mark "Create high-level implementation plan" as in_progress*

Create a concise, actionable plan without separate exploration.

```
AGENT: full-stack-engineer
DESCRIPTION: Create concise implementation plan
PROMPT:
"Create a concise implementation plan for issue #$ARGUMENT.

**Read:**
- Ticket: docs/tickets/$ARGUMENT/ticket.md
- Checklist: docs/tickets/$ARGUMENT/checklist.md

**Task:**
Create a brief plan at docs/tickets/$ARGUMENT/plan.md (target: 50-100 lines).

# Implementation Plan: Issue #$ARGUMENT

## Overview
[1-2 sentences]

## Acceptance Criteria Coverage
For EACH AC:
- **AC[N]**: [How to satisfy - 2-3 bullets]
- Files: [list]

## Implementation Steps
1. [Action]
2. [Action]
3. [Action]

## Testing
- [What to test]

**Keep it concise** - simple task, no exhaustive exploration needed.

Return: 'Concise plan created covering [N] acceptance criteria'"

WAIT FOR AGENT
```

### Present Concise Plan

```
ACTION: Present implementation plan

1. Read docs/tickets/$ARGUMENT/plan.md
2. Display the plan
3. AskUserQuestion:
   - Does plan cover all ACs?
   - Approval to proceed?

If approved, mark exploration and planning completed.
```

*Mark "Explore codebase for similar patterns" as completed*
*Mark "Create high-level implementation plan" as completed (only after approval)*
*Mark "Get developer feedback on plan" as completed*

## ═══════════════════════════════════════
## PHASE 2: IMPLEMENTATION
## ═══════════════════════════════════════

## Step 6: Implementation [AGENT]

*Mark "Implement" as in_progress*

Implementation agent follows the approved plan.

```
AGENT: full-stack-engineer
DESCRIPTION: Implement issue $ARGUMENT with full integration
PROMPT:
"Implement issue #$ARGUMENT with ALL integrations complete.

**CRITICAL: Worktree Isolation**
- You are working in a git worktree at .claude/worktrees/vibe-$ARGUMENT
- This is a separate working directory with its own branch
- The main repository is unaffected by your changes
- Multiple agents can work in parallel in their own worktrees
- **NEVER use `git stash`** - worktree isolation makes stashing unnecessary

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
   
   ⚠️ IMPORTANT: Go through the checklist one by one
   
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

## Step 7: Code Simplification

*Mark "Simplify code" as in_progress*

```
SKILL: simplify
```

*Mark "Simplify code" as completed*

## Step 8: Security Review

*Mark "Security review" as in_progress*

```
SKILL: security-review
```

*Mark "Security review" as completed*

## Step 9: Multi-Dimensional Review & Fix [PARALLEL AGENTS]

*Mark "Multi-dimensional review" as in_progress*

Launch three review agents in parallel. **You MUST actually invoke the Agent tool three times in ONE message block:**

```typescript
// Example of correct invocation (adapt to actual tool syntax):
Agent({ subagent_type: "ui-ux-engineer", description: "Fix accessibility issues", prompt: "..." })
Agent({ subagent_type: "code-reviewer", description: "Fix code quality", prompt: "..." })
Agent({ subagent_type: "test-engineer", description: "Fix test gaps", prompt: "..." })
```

**Agent 1: UI/UX Engineer**
- Review: `git diff`
- Fix: WCAG 2.2 AA violations, keyboard navigation, screen reader issues, GOV.UK component usage, Welsh translations
- Return: 'Fixed [N] issues' or 'No issues found'

**Agent 2: Code Reviewer**
- Review: `git diff`
- Fix: TypeScript any types, missing error handling, CLAUDE.md violations, performance issues, unused code
- Return: 'Fixed [N] issues' or 'No issues found'

**Agent 3: Test Engineer**
- Review: Test files and coverage (`yarn test:coverage`)
- Fix: Coverage <80%, missing edge cases, non-AAA pattern, missing E2E tests, missing accessibility tests
- Return: 'Added [N] tests, coverage now [%]' or 'Tests adequate'

Wait for all three agents to complete before continuing.

*Mark "Multi-dimensional review" as completed*

## ═══════════════════════════════════════
## PHASE 4: VERIFICATION & FINAL GUARDS
## ═══════════════════════════════════════

## Step 10: Verification

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

## Step 11: Final Guards

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

## Step 12: Git Workflow and PR Creation

### 12a: Review Changes

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

# Show git status and diff summary
git status
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 CHANGES SUMMARY"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
git diff --stat
echo ""
```

### 12b: Ask Developer About PR Creation

Use AskUserQuestion to ask if developer wants you to create the PR and monitor it:

```
QUESTION 1:
Header: "PR Creation"
Question: "Would you like me to commit these changes and create a pull request for issue #$ARGUMENT?"
Options:
  1. "Yes, create PR and monitor CI checks" - I'll commit, push, create PR, and monitor CI/CD checks until they pass
  2. "Yes, create PR only" - I'll commit, push, and create the PR but won't monitor CI checks
  3. "No, I'll handle it manually" - You can review and commit the changes yourself

[WAIT FOR USER RESPONSE]
```

### 12c: Execute Based on User Choice

**If "Yes, create PR and monitor CI checks":**

```bash
EXECUTE:
# Commit changes (exclude the .devcontainer symlink created in Step 1)
echo "Committing changes..."
git add . -- ':!.devcontainer'
git commit -m "feat: implement issue #$ARGUMENT

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"

# Push to remote
echo "Pushing to remote..."
git push -u origin vibe-$ARGUMENT

# Create PR
echo "Creating pull request..."
gh pr create --title "Issue #$ARGUMENT" --body "Closes #$ARGUMENT

## Implementation Summary
- Implemented all acceptance criteria
- All tests passing
- Security review completed
- Code quality checks passed

🤖 Generated with [Claude Code](https://claude.com/claude-code)"

# Get PR number
PR_NUMBER=$(gh pr list --head vibe-$ARGUMENT --json number --jq '.[0].number')
echo ""
echo "✅ PR #$PR_NUMBER created"
echo ""
```

**Then proceed to CI/CD Monitoring (see Step 13)**

**If "Yes, create PR only":**

```bash
EXECUTE:
# Commit changes (exclude the .devcontainer symlink created in Step 1)
echo "Committing changes..."
git add . -- ':!.devcontainer'
git commit -m "feat: implement issue #$ARGUMENT

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"

# Push to remote
echo "Pushing to remote..."
git push -u origin vibe-$ARGUMENT

# Create PR
echo "Creating pull request..."
gh pr create --title "Issue #$ARGUMENT" --body "Closes #$ARGUMENT

## Implementation Summary
- Implemented all acceptance criteria
- All tests passing
- Security review completed
- Code quality checks passed

🤖 Generated with [Claude Code](https://claude.com/claude-code)"

# Get PR number
PR_NUMBER=$(gh pr list --head vibe-$ARGUMENT --json number --jq '.[0].number')
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ PR #$PR_NUMBER created successfully"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "CI/CD checks will run automatically."
echo "If you need me to monitor and fix any failures, just ask:"
echo "   'Can you watch PR #$PR_NUMBER?'"
echo ""
```

**DONE - Workflow complete**

**If "No, I'll handle it manually":**

```bash
EXECUTE:
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 MANUAL COMMIT INSTRUCTIONS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "1. Review changes:"
echo "   git status"
echo "   git diff"
echo ""
echo "2. Commit (exclude the .devcontainer symlink created in Step 1):"
echo "   git add . -- ':!.devcontainer'"
echo "   git commit -m \"feat: implement issue #$ARGUMENT\""
echo ""
echo "3. Push and create PR:"
echo "   git push -u origin vibe-$ARGUMENT"
echo "   gh pr create --title \"Issue #$ARGUMENT\" --body \"Closes #$ARGUMENT\""
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
```

**DONE - Workflow complete**

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
   Ask user: "What's the PR number?" OR extract from `gh pr list --head vibe-$ARGUMENT`

2. **Initial check:**
   ```bash
   PR_NUMBER=$(gh pr list --head vibe-$ARGUMENT --json number --jq '.[0].number')
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
PR_NUMBER=$(gh pr list --head vibe-$ARGUMENT --json number --jq '.[0].number')

# Initial check
echo "Monitoring PR #$PR_NUMBER..."
gh pr checks $PR_NUMBER

# If failures detected:
echo "❌ CI/CD checks failed. Analyzing..."
gh pr checks $PR_NUMBER --required

# After fixing (exclude the .devcontainer symlink created in Step 1):
git add . -- ':!.devcontainer'
git commit -m "fix: resolve E2E test selector issue"
git push origin vibe-$ARGUMENT

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
- Fixes are committed to the feature branch (vibe-$ARGUMENT)

**If user does NOT create a PR or request monitoring, this step is skipped entirely.**
