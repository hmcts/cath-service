# #1190: Bug: Family Daily Cause List PDF missing legal advisor, and court house address has extra line breaks

**State:** OPEN
**Assignees:** 
**Author:** HarveyMoj
**Labels:** 
**Created:** 2026-10-21T15:38:44Z
**Updated:** 2026-10-22T12:57:39Z

## Description

## Problem

Two display bugs on the Family Daily Cause List, found while checking #976. The full-names problem from #976 no longer happens: the web page and the PDF build party names through the same `renderCauseListData` -> `processParties()` code path.

### 1. Subscription email PDF leaves out the legal advisor

The web page shows each party with their representative:

`apps/web/src/pages/(list-types)/family-daily-cause-list/family-daily-cause-list.njk:161-170`
```njk
{{ case.applicant }}, {{ t.legalAdvisor }}: {{ case.applicantRepresentative }}
```

The PDF template prints only the party name:

`libs/list-types/family-daily-cause-list/src/pdf/pdf-template.njk:99-100`
```njk
<td>{{ case.applicant }}</td>
<td>{{ case.respondent }}</td>
```

`case.applicantRepresentative` and `case.respondentRepresentative` are already filled in by `processParties()` (`libs/list-types/daily-cause-list-common/src/rendering/renderer.ts`). The PDF template just never prints them.

### 2. Court house address on the web page has a blank line between each line

`family-daily-cause-list.njk:77-90` wraps every address line (each `line`, then `town`, `county`, `postCode`) in its own `<p class="govuk-body">`. `govuk-body` adds a bottom margin, so a gap shows between every line of the address. The venue address in the page header (`family-daily-cause-list.njk:35-37`) and the PDF both put the lines in one block separated by `<br>`, which looks correct.

There is a smaller problem in the PDF too: `pdf-template.njk:41` always adds a `<br>` after `county`, so if `postCode` is empty the address ends with an extra blank line.

## Expected behaviour

- The PDF Applicant and Respondent columns match the web page: `<party>, Legal Advisor: <representative>` when there is a representative, and only `<party>` when there isn't. Welsh uses `t.legalAdvisor` from `cy.ts`.
- The court house address on the web page shows as one block with each line directly under the one before, matching the header address.
- The PDF court house address does not end with a `<br>` when `postCode` is missing.

## Acceptance criteria

- [ ] The PDF shows `Legal Advisor: <name>` after the applicant and respondent when `applicantRepresentative` / `respondentRepresentative` is set.
- [ ] The PDF shows only the party name (no dangling `, Legal Advisor:`) when there is no representative.
- [ ] The Welsh PDF uses the Welsh `legalAdvisor` label.
- [ ] The court house address on the web page shows as one block, with no gap between lines.
- [ ] Empty address parts are still skipped on both the web page and the PDF, with no stray `<br>` at the end.
- [ ] Template tests updated: `libs/list-types/family-daily-cause-list/src/pdf/pdf-template.njk.test.ts` covers a representative being present and absent, and the web `.njk` test covers the court house address rendering as one block.

## Implementation notes

- Copy the web page's representative logic into the PDF template rather than inventing new formatting, so the two stay consistent.
- For the web address, use the same pattern as the header: one `<p class="govuk-body">` with the parts joined by `<br>`. The simplest way is to build the parts list first and use `{% if not loop.last %}<br>{% endif %}`.


## Comments

No comments on this issue.

