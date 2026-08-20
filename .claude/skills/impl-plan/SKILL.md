---
name: impl-plan
description: Create a technical implementation plan and task checklist for a GitHub issue. Produces plan.md and tasks.md in docs/tickets/<issue-number>/, creates a feature branch, and pushes.
---

## Purpose

Use this skill when a GitHub issue is ready for implementation and needs a technical plan. The plan breaks down the work into concrete steps with specific file paths, patterns to follow, and a sequenced task checklist. Engineers pick up `tasks.md` and work through it.

## Inputs

Provide:
- A GitHub issue number (e.g. `#815`)

Optionally, if a spec already exists at `docs/tickets/<issue-number>/specification.md`, the plan should align with it.

## Process

1. **Read the issue** body and title.
2. **Read the spec** from `docs/tickets/<issue-number>/specification.md` if it exists.
3. **Search the codebase** for:
   - The most similar existing implementation to use as a pattern (check `apps/web/src/pages/`, `libs/`, `docs/tickets/` for prior plans)
   - Files that will need to be created or modified
   - Shared utilities, validators, or services that should be reused rather than reimplemented
4. **Write `plan.md`** to `docs/tickets/<issue-number>/plan.md` using the structure in `resources/plan-template.md`:
   - Describe the technical approach in plain terms
   - Name the specific files to create and modify (with paths)
   - Describe patterns to follow, referencing the existing implementation found in step 3
   - Note any constraints or sequencing dependencies
5. **Write `tasks.md`** to `docs/tickets/<issue-number>/tasks.md`:
   - A markdown checkbox list, grouped into phases
   - Each task is a single atomic action (create file, add export, write test, etc.)
   - Sequence tasks so earlier phases unblock later ones
6. **Create a feature branch** named `feature/<issue-number>-<short-description>` and commit the plan files.
7. **Push the branch**.
8. **Post a comment** on the issue summarising the plan and linking to the branch. If posting comments is not available, inform the user of the branch name and file locations.

## Output

- `docs/tickets/<issue-number>/plan.md` — technical approach with file paths and patterns
- `docs/tickets/<issue-number>/tasks.md` — sequenced checkbox task list
- A pushed feature branch containing both files

## Notes

- Plans should be **specific**: name actual file paths, not "create a service file". Vague plans create ambiguity during implementation.
- Reference **existing patterns** rather than inventing new ones. If a similar list type or page already exists, name it explicitly.
- Group tasks into **phases** where earlier phases unblock later ones (e.g. Phase 1: schema/data; Phase 2: business logic; Phase 3: UI; Phase 4: tests).
- If the issue is too large for a single plan, say so and suggest splitting.
- Do not write implementation code — only the plan and task list.
