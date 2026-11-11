Bug: Civil and Civil & Family Daily Cause List court house address has extra line breaks

## Problem

Found while planning #1190. #1190 fixes the court house address for the Family Daily Cause List only. The same markup problem exists in two sibling list types.

### 1. Web page: blank line between each address line

These templates wrap every court house address part (each `line`, then `town`, `county`, `postCode`) in its own `<p class="govuk-body">`:

- `apps/web/src/pages/(list-types)/civil-daily-cause-list/civil-daily-cause-list.njk:71-84`
- `apps/web/src/pages/(list-types)/civil-and-family-daily-cause-list/civil-and-family-daily-cause-list.njk:74-87`

`govuk-body` adds a bottom margin, so a gap shows between every line. The venue address in each page header puts all the lines in one block separated by `<br>`, which looks correct.

### 2. PDF: trailing `<br>` when later parts are missing

`libs/list-types/civil-and-family-daily-cause-list/src/pdf/pdf-template.njk:41-45` puts `<br>` after every address part except `postCode`. When `postCode` is missing, the address ends with a blank line. This also happens after `town` when `county` and `postCode` are missing, and after the last `line` when only lines are present.

## Expected behaviour

- On both web pages, the court house address shows as one block with each line directly under the one before, matching the header address.
- The civil-and-family PDF court house address never ends with a `<br>`, whichever parts are missing.
- Empty address parts are still skipped.

## Acceptance criteria

- [ ] `civil-daily-cause-list.njk` shows the court house address as a single `<p class="govuk-body">` with the parts separated by `<br>`.
- [ ] `civil-and-family-daily-cause-list.njk` shows the court house address the same way.
- [ ] The civil-and-family PDF court house address has no trailing `<br>` when `postCode`, `county` or `town` is missing.
- [ ] Template tests cover the address showing as one block, on both web templates and the PDF, and check that the `<br>` count equals the number of parts minus one.

## Implementation notes

- Use the same `addressParts` pattern as #1190: build a list of the non-empty parts, then print it with `{% if not loop.last %}<br>{% endif %}`. Keep values autoescaped, so do not use `join("<br>") | safe`.
- Land this after #1190 so the pattern can be copied from the family templates.
