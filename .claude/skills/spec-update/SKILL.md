---
name: spec-update
description: Update an existing specification.md to reflect new information — changed acceptance criteria, resolved clarifications, new edge cases, or scope changes discovered during refinement or implementation.
---

## Purpose

Use this skill when an existing spec in `docs/tickets/<issue-number>/specification.md` needs to be updated. This happens when:
- The issue has new comments with clarifications or decisions
- Acceptance criteria have changed
- Scope has been expanded or reduced
- Implementation revealed edge cases not covered in the original spec
- A linked dependency was resolved and the spec needs to reflect the outcome

## Inputs

Provide:
- The issue number (e.g. `#659`)
- A description of what has changed, or a paste of the new comments/decisions to incorporate

## Process

1. **Read the existing spec** from `docs/tickets/<issue-number>/specification.md`.
2. **Read the update checklist** from `resources/update-checklist.md` — use it as a guide for what to check and verify.
3. **Review the change source** (new comments, clarifications, or the description provided) and identify which sections of the spec are affected.
4. **For each affected section**, update it using the Edit tool — one Edit call per section changed.
   - Do not rewrite sections that are not affected.
   - Do not change the structure or section numbering.
5. **Add a change summary** to the end of the file under a `## Change Log` heading (create it if it doesn't exist):
   ```
   ### <date>
   - Section X: [brief description of what changed and why]
   ```
6. **For any new Welsh content**, insert `[TRANSLATE: "English text here"]` markers. Run the `welsh-translation` skill to resolve them.

## Output

Updated `docs/tickets/<issue-number>/specification.md` with targeted edits and a change log entry.

## Notes

- Only update what has changed. Minimal diffs are easier to review.
- If the scope change is large enough that the spec structure itself needs to change, flag this to the user rather than silently restructuring.
- If there is no existing spec, suggest running the `tech-spec` skill first.
