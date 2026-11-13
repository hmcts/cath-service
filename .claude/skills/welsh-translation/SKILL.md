---
name: welsh-translation
description: Resolve [TRANSLATE: "English text"] markers in a document by looking up translations in the Welsh catalogue. Outputs the document with markers replaced by Welsh text, or [WELSH TRANSLATION REQUIRED: "..."] for strings not in the catalogue.
---

## Purpose

Use this skill after `tech-spec` or `spec-update` to resolve Welsh translation markers. Any document containing `[TRANSLATE: "English text here"]` markers can be processed — typically a `specification.md` file.

## Inputs

Provide one of:
- A file path to process (e.g. `docs/tickets/659/specification.md`)
- The document content pasted directly into the conversation

## Process

1. **Run the translation script** using Node.js:
   ```bash
   node .claude/skills/welsh-translation/resources/translate-welsh.mjs < <input-file> > <output-file>
   ```
   The script reads `[TRANSLATE: "..."]` markers and looks each string up in `resources/welsh-translations-catalogue.json`.

2. **Strings found in the catalogue** are replaced with their Welsh equivalent.

3. **Strings not found** are replaced with `[WELSH TRANSLATION REQUIRED: "English text"]` — these need manual translation from the content team.

4. **Write the output** back to the original file, or to a new file if specified.

5. **Report** the count of markers resolved vs. the count requiring manual translation.

## Output

The input document with all `[TRANSLATE: "..."]` markers resolved. A summary of how many were resolved automatically and how many need manual translation.

## Notes

- The catalogue at `resources/welsh-translations-catalogue.json` covers common UI strings used across HMCTS services. Page-specific content (custom headings, body text) will typically need manual translation.
- `[WELSH TRANSLATION REQUIRED: "..."]` markers in the output are intentional — they signal to the content team what still needs translating.
- The catalogue is a snapshot. If a string should be in the catalogue but isn't, the content team can add it.
- This skill does not write Welsh translations itself — it only looks up known translations. Do not attempt to translate text that is not in the catalogue.
