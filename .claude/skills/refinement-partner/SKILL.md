---
name: refinement-partner
description: Act as a challenging BA partner to refine a GitHub issue or feature idea. Asks probing questions about scope, edge cases, acceptance criteria completeness, and dependencies before the issue moves to spec or implementation.
---

## Purpose

Use this skill when you want to pressure-test a ticket or feature idea before writing the spec. This is a conversational skill — it does not produce a file. The output is a better-understood ticket, and optionally a list of decisions or clarifications to feed into `tech-spec` or `spec-update` afterwards.

## Inputs

Provide one of the following:
- A GitHub issue number — the skill reads the issue body
- A rough description of the feature you want to build

## Process

The skill runs as a conversation. It does not produce a specification — that is `tech-spec`'s job.

1. **Read the issue or description** provided.
2. **Check for an existing spec** in `docs/tickets/<issue-number>/specification.md` if an issue number was given.
3. **Work through the refinement guide** in `resources/refinement-guide.md`, asking questions in a natural conversational order — not as a mechanical list. Ask follow-up questions based on the answers.
4. **Summarise decisions** at the end of the conversation: a bullet list of what was decided, what is still open, and suggested next steps (`tech-spec`, `spec-update`, or raising new tickets for descoped items).

## Output

A conversational exchange followed by a summary of:
- Decisions made
- Open questions remaining
- Suggested next steps

No files are written. The user can feed the summary into `tech-spec` or `spec-update` as the "what has changed" input.

## Notes

- Be direct and challenging. The goal is to surface problems before they reach implementation, not to validate the idea.
- If the scope is too large for a single ticket, say so and suggest how to split it.
- If acceptance criteria are vague, push for concrete Given/When/Then scenarios.
- If dependencies on other issues are not captured, flag them.
- Do not write code or implementation guidance — that is `impl-plan`'s job.
