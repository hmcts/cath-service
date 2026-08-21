---
name: tech-spec
description: Generate a technical specification for a GitHub issue using a structured template. Produces a complete specification.md covering user story, wireframes, acceptance criteria, content, validation, and test scenarios.
---

## Purpose

Use this skill when a GitHub issue needs a full technical specification written up before implementation begins. The spec captures the UX, content, validation rules, and test scenarios so that engineers and BAs share a common understanding of what to build.

## Inputs

Provide one of the following:
- A GitHub issue number (e.g. `#659`) — the skill reads the issue body from the repo
- The raw issue title and body pasted into the conversation

Optionally specify a template type: `new-feature` (default), `technical-task`, `enhancement`, `spike`, or `bug`. Templates are in `resources/templates/`.

## Process

1. **Read the template** from `resources/templates/<type>.md`. Remove all guidance text in round brackets from the output — it is for orientation only.
2. **Read design guidance** from `.claude/rules/design.md` for GOV.UK Design System patterns (components, one-question-per-page, WCAG 2.2 AA requirements).
3. **Search the codebase** for similar existing implementations:
   - Check `apps/web/src/pages/` for existing page controllers and templates that follow the same pattern
   - Check `libs/` for shared components, locale files, or utilities that would be reused
   - Check `docs/tickets/` for prior specs on related issues
4. **Write the specification section by section as a markdown document in the chat**:
   - Output the first section, then continue section by section
   - Never output the entire spec in a single response
   - Confirm each section is written before continuing to the next
5. **For Welsh content**, insert `[TRANSLATE: "English text here"]` markers wherever Welsh text is needed. Do not attempt to write Welsh directly. The `welsh-translation` skill resolves these markers.

### Template selection guide

| Issue type | Template |
|---|---|
| New user-facing page or journey | `new-feature` |
| Backend/infrastructure work with no new UI | `technical-task` |
| Change to existing functionality | `enhancement` |
| Research or proof-of-concept | `spike` |
| Defect report | `bug` |

## Output

A completed specification as a markdown document in the chat, with all template placeholders replaced with real, specific content.

Inform the user that any `[TRANSLATE: "..."]` markers in the output can be resolved by running the `welsh-translation` skill.

## Notes

- Write content that is **specific and actionable**, not generic. Replace every `[placeholder]` with real values derived from the issue and codebase.
- For wireframes (section 5 in `new-feature`), use ASCII art. Keep wireframes to a single screen view, max 40 lines.
- For test scenarios (section 13 in `new-feature`), write **at most 5 high-level scenarios** — no test code, just descriptions.
- For complex tickets covering many list types or variants, **describe the pattern once** and note which variants it applies to. Do not enumerate every permutation separately.
- If the issue depends on other issues, note them in section 14 (Assumptions & Open Questions).
- This skill does **not** post GitHub comments, create branches, or write files. It produces the spec as chat output only.
