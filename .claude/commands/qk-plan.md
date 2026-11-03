---
description: Create technical implementation plan for a GitHub issue
argument-hint: <issue-number>
allowed-tools:
  - Bash
  - Task
  - TodoWrite
  - Read
  - Write
---

# Quick Plan: $ARGUMENT

## Initialize Progress Tracking
Use TodoWrite to create this checklist:
```
- [ ] Create docs folder structure
- [ ] Fetch GitHub issue details
- [ ] Create technical implementation plan
- [ ] Create task list
```

## PHASE 1: Setup Documentation Folder
*Mark "Create docs folder structure" as in_progress*

### Step 1.1: Create Folder Structure
```
EXECUTE:
1. Create directory: docs/tickets/$ARGUMENT

```
*Mark "Create docs folder structure" as completed*

## PHASE 2: Fetch GitHub Issue Data
*Mark "Fetch GitHub issue details" as in_progress*

### Step 2.1: Fetch Issue Details

```
EXECUTE:

TASK 1: Fetch GitHub Issue Details
- Use gh CLI to fetch issue: gh issue view $ARGUMENT --json number,title,body,state,assignees,author,labels,createdAt,updatedAt,comments
- Extract fields using jq or parse JSON directly
- Write to docs/tickets/$ARGUMENT/ticket.md with format:

---
# #$ARGUMENT: [Title]

**State:** [State]
**Assignees:** [Assignees as comma-separated list]
**Author:** [Author]
**Labels:** [Labels as comma-separated list]
**Created:** [Created Date]
**Updated:** [Updated Date]

## Description

[Body content - markdown formatted]

## Comments

[For each comment in the comments array, include:]
### Comment by [author.login] on [createdAt]
[body]

[If no comments, write "No comments on this issue."]
---

```
*Mark "Fetch GitHub issue details" as completed*

## PHASE 3: Technical Planning
*Mark "Create technical implementation plan" as in_progress*

### Step 3.0: Determine ticket format

Read docs/tickets/$ARGUMENT/ticket.md and check for a `## 5. Page Details` heading. That heading is
unique to `templates/new-feature-simplified.md` — the full template says "Page Specifications".

* Present → set TICKET FORMAT to `simplified`. The ticket was written to be refined, so it carries
  no wireframe, accessibility or test-scenario sections. The agent below reconstructs them.
* Absent → set TICKET FORMAT to `full`. The ticket already carries that material; nothing is
  reconstructed.

Pass the value into the prompt below as TICKET FORMAT.

### Step 3.1: Determine template source

Read docs/tickets/$ARGUMENT/ticket.md and set TEMPLATE SOURCE to one of three values:

* `migrate from pip-frontend <path>` — a rendered page or list-type view that exists upstream. This
  is the default for a new page. Locate the candidate in github.com/hmcts/pip-frontend:
  `src/main/routes/routes.ts` maps routes to views, `src/main/controllers/<Name>Controller.ts` names
  the exact view, and views live under `src/main/views/**` (cause lists are often in
  `views/style-guide/`). Record the path only — `/qk-implement` runs the migrate-pip-pages skill.
* `write fresh` — a rendered page with no upstream equivalent. Never name a sibling page as the
  source of a migration. If pip-frontend could not be reached at all, say so and stop rather than
  falling back to this value — "not found" and "could not look" are different answers.
* `n/a` — flat-file / manual-upload list types, or registration-only work.

Pass the resulting value into the prompt below as TEMPLATE SOURCE.

### Step 3.2: Generate Implementation Plan [ISOLATED AGENT]

```
AGENT: full-stack-engineer
TEMPLATE SOURCE: <migrate from pip-frontend <path> | write fresh | n/a>
TICKET FORMAT: <simplified | full>
TASK: Create a technical implementation plan and task list for the issue
INPUT: docs/tickets/$ARGUMENT/ticket.md
OUTPUT: docs/tickets/$ARGUMENT/plan.md AND docs/tickets/$ARGUMENT/tasks.md

PROMPT FOR AGENT:
"Review the GitHub issue details in docs/tickets/$ARGUMENT/ticket.md and create TWO separate files.

IMPORTANT: The ticket.md includes comments from the issue. These comments may contain clarifications, additional requirements, or context from stakeholders - consider them when creating the plan.

IF TICKET FORMAT is `simplified`, the ticket came from `templates/new-feature-simplified.md`. It is
written to be read and refined in one session, so it deliberately omits three sections the full
template carried. Reconstruct them as your first act, from the ticket plus `.claude/rules/design.md`
— the same material that generated them in the first place. They are not gaps the author forgot:

- **Wireframe** — an ASCII sketch of the page, from the `Layout` and `Content` bullets. If the
  `Reference` bullet names an equivalent page or a pip-frontend view, cite that instead of sketching.
  Treat a `Reference` you cannot verify as absent.
- **Accessibility** — from `.claude/rules/design.md` and the layout. Only what is specific to this
  page beyond standard GOV.UK component behaviour; do not restate WCAG boilerplate.
- **Test scenarios** — from the Acceptance Criteria plus the User Journey Flow, covering the error
  paths the AC does not name. Bound by CLAUDE.md's minimise-test-count rule: one test per user
  journey, not one per validation.

Take the ticket's `Validation`, `Navigation`, `Content` and `Error messages` as authoritative and
complete — carry them through, do not re-derive or summarise them. Re-derive the open questions from
your own expansion: an empty 'Assumptions & Open Questions' section means the author saw nothing
obvious in refinement, not that nothing is unclear.

IF TICKET FORMAT is `full`, the ticket already carries all of the above. Use it as written and do
not reconstruct anything.

**FILE 1: docs/tickets/$ARGUMENT/plan.md**
This is the technical specification/plan including:

0. **Specification** (ONLY when TICKET FORMAT is `simplified` - omit this section entirely otherwise)
   - The ASCII wireframe, or the cited reference page it was taken from
   - Accessibility needs specific to this page
   - This section is the reconstructed user-facing spec, not technical approach. Keep it short

1. **Technical Approach**
   - High-level implementation strategy
   - Architecture decisions
   - Key technical considerations

2. **Implementation Details**
   - File structure and organization (following @CLAUDE.md guidelines - use libs/ for features)
   - Components/modules to create
   - Record the TEMPLATE SOURCE decision given to you above, verbatim, under Implementation Details. Do NOT copy the skill's fetch/adapt/verify steps into the plan — implement runs the skill itself.
   - API endpoints (if needed)
   - Database schema changes (if needed)

3. **Error Handling & Edge Cases**
   - Potential error scenarios
   - Validation requirements
   - Edge cases to handle

4. **Acceptance Criteria Mapping**
   - How each acceptance criterion will be satisfied
   - Verification approach for each criterion

5. **Test Scenarios**
   - One scenario per user journey, not one per validation (see CLAUDE.md and `.claude/rules/testing.md`)
   - Include the error paths the acceptance criteria do not name
   - Every scenario here must have a corresponding task in tasks.md

6. **Open Questions**
   - Any ambiguities that need clarification
   - Technical decisions that need input
   - Listed in a 'CLARIFICATIONS NEEDED' section at the end

**FILE 2: docs/tickets/$ARGUMENT/tasks.md**
This is a simple checklist of implementation tasks in order:

## Implementation Tasks
- [ ] Task 1
- [ ] Task 2
- [ ] Task 3

Keep both files focused and practical. Only address concerns directly related to this issue."

WAIT FOR AGENT TO COMPLETE
```
*Mark "Create technical implementation plan" as completed*
*Mark "Create task list" as completed*

## Output to User

Display the following message:

```
Technical planning complete for issue #$ARGUMENT:

Files created:
- docs/tickets/$ARGUMENT/plan.md - Technical specification and implementation approach
- docs/tickets/$ARGUMENT/tasks.md - Implementation task checklist

Review the plan and address any clarifications needed before implementation.

---

Ready to implement? Run: /qk-implement $ARGUMENT
```
