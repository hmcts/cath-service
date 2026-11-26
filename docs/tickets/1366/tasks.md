# #1366 Tasks

Work on branch `feature/1366-sjp-press-dob` (worktree `.claude/worktrees/1366-sjp-dob`).

## Implementation Tasks

- [x] Add `rawDateOfBirth: string | null` to `SjpCasePress` and set it in `transformHearingToCase` (363650a2)
- [x] SJP press Excel writes `rawDateOfBirth` as sent plus ` (age)` / `(age)`, through `sanitiseCellValue` (363650a2)
- [x] Excel tests for DOB as sent, Welsh, no age, unreadable, impossible, formula-prefixed and missing DOB (363650a2)
- [x] Answer open question 1 (real feed format) from PIP: almost certainly `dd/MM/yyyy`; keep the day-first `d-M-yyyy` pattern as a defensive extra
- [x] Rewrite `parseDateOfBirth` in `libs/list-types/common/src/sjp/json-parser.ts`: trim, match `d/M/yyyy`, `yyyy-MM-dd`, `d-M-yyyy` (day first), build local-midnight `Date`, round-trip check, `null` otherwise, no `try/catch`
- [x] Trim `rawDateOfBirth` and store `null` for empty or whitespace-only values
- [x] Add a table-driven `it.each` to `json-parser.test.ts` covering every row of the ticket table plus `1/2/1990`, `29/02/1992`, `29/02/1991`, ISO date-time, 2-digit year, padded whitespace, empty and missing
- [x] Add a `json-parser.test.ts` case: a list whose accused has DOB `unknown` is still a press list (`determineListType`)
- [x] Update `sjp-press-list.njk` DOB row: parsed date via `date` filter, else `rawDateOfBirth`, then age suffix; switch `html:` to `text:`
- [x] Add `rawDateOfBirth` to the `sjp-press-list.njk.test.ts` fixture; add tests for an unreadable DOB shown as sent with age and a raw DOB containing markup being escaped
- [x] Move `formatDateOfBirth(rawDateOfBirth, age)` from `sjp-press-list-excel-generator.ts` into `libs/list-types/common/src/sjp/accused-date-of-birth.ts` as `formatAccusedDateOfBirth`, export it from `@hmcts/list-types-common`, and add a co-located test
- [x] Switch the SJP press Excel generator to the shared `formatAccusedDateOfBirth` (existing Excel tests must still pass)
- [x] Replace the PDF's local `formatDateOfBirth` in `libs/list-types/sjp-press-list/src/pdf/pdf-generator.ts` with `formatAccusedDateOfBirth(c.rawDateOfBirth, c.age)`, so the PDF prints the DOB as sent, as PIP did
- [x] Update `pdf-generator.test.ts`: expectations become the value as sent, add cases for an unreadable DOB with age and for `(age)` alone, add `rawDateOfBirth` to fixtures
- [x] Update the `SjpCasePress` fixture in `apps/web/src/pages/(list-types)/sjp-press-list/index.test.ts` if type checking needs it
- [x] Extend the existing `e2e-tests/tests/sjp-press-list.spec.ts` journey with one `dd/MM/yyyy` DOB and one unreadable DOB, and assert both on the page
- [x] Open questions 2–5 answered: 2 → separate ticket (schema format), 3 → keep `sanitiseCellValue`, 4 → English only for now, separate ticket (Welsh month names), 5 → no DOB means an empty cell on every output (age not shown alone)
- [x] Run `yarn test`, `yarn lint` and type checking for `@hmcts/list-types-common`, `@hmcts/sjp-press-list`, `@hmcts/excel-generation` and `apps/web`
