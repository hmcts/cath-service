# #290: [VIBE-270] Create hook for lint style check and any typescript errors

**State:** OPEN
**Assignees:** NatashaAlker
**Author:** linusnorton
**Labels:** migrated-from-jira, status:new, priority:3-medium, type:story, jira:VIBE-270
**Created:** 2026-01-20
**Updated:** 2026-03-05

## Description

**As a** developer, I want to integrate lint and TypeScript validation into our pre-merge checks, so that we can identify and fix issues before they trigger a PR build failure.

### Acceptance criteria

Make sure there is no lint and typescript error in code before pushing to Github.

## Comments

### Comment by OgechiOkelu on 2026-02-23
@SPEC new-feature.md

### Comment by hmctsclaudecode on 2026-02-23
Detailed technical specification for pre-push git hook using Husky, adding `typecheck` scripts to all workspaces, and creating a `.husky/pre-push` hook.

### Comment by hmctsclaudecode on 2026-02-23
Clarifying question about full workspace checks vs changed-only checks in the pre-push hook.
