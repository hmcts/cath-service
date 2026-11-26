# #1366: SJP press list: date of birth is sometimes wrong, swapped or missing

**State:** OPEN
**Assignees:** HarveyMoj
**Author:** HarveyMoj
**Labels:** bug
**Created:** 2026-11-06T16:36:56Z
**Updated:** 2026-11-20T18:15:58Z

## Description

## Problem

On the SJP press lists (`SJP_PRESS_LIST`, `SJP_DELTA_PRESS_LIST`), the accused's date of birth can be shown as the wrong date, with the day and month swapped, or not at all. Some inputs are affected and others are not, depending on how the date is written in the JSON.

The cause is `parseDateOfBirth` in `libs/list-types/common/src/sjp/json-parser.ts:134`. It turns the `dateOfBirth` string into a `Date` before any output sees it. It has three problems:

1. **Dates with dashes are read month-first.** Anything without a `/` goes to `new Date(string)`, which in Node reads `dd-MM-yyyy` the US way, month first. The schema's own example is in this format (`01-01-1901`, `libs/list-types/sjp-press-list/src/schemas/sjp-press-list.json:211`).
2. **Impossible dates roll over silently.** The `dd/MM/yyyy` branch builds the date with `new Date(year, month, day)`, which turns 31 February into 3 March. It never checks the result.
3. **Unreadable values are thrown away.** When parsing fails it returns `null`, so the original text is lost and the output shows an empty cell instead.

The schema doesn't define a format for `dateOfBirth`, so any of these can get through upload validation.

## Current behaviour

Checked by running the real `extractPressCases` on each input:

| `dateOfBirth` in the JSON | Parsed as | Correct? |
|---|---|---|
| `13/01/1990` | 13 January 1990 | Yes |
| `1990-01-13` | 13 January 1990 | Yes |
| `01-01-1901` (schema example) | 1 January 1901 | Only because day and month are the same |
| `01-02-1990` (1 February) | **2 January 1990** | No, day and month swapped |
| `13-01-1990` | **empty** | No, 13 isn't a valid month |
| `31/02/1990` | **3 March 1990** | No, an impossible date rolls over |
| `unknown` | **empty** | No, the original text is lost |

## Where it shows

The parsed date feeds all three SJP press outputs:

- **Web page:** `apps/web/src/pages/(list-types)/sjp-press-list/sjp-press-list.njk:205`
- **PDF:** `libs/list-types/sjp-press-list/src/pdf/pdf-generator.ts:26` (`formatDateOfBirth`)
- **Excel:** `libs/excel-generation/src/excel/sjp-press-list-excel-generator.ts:71` (`formatDateOfBirth`)

The parser also decides whether a list is a press or public list (`determineListType`, `json-parser.ts:193`), but that only checks whether `dateOfBirth` is present, so it isn't affected.

## Acceptance criteria

- [ ] `dd/MM/yyyy`, `d/M/yyyy` and ISO `yyyy-MM-dd` dates of birth are parsed correctly.
- [ ] `dd-MM-yyyy` dates of birth are read day-first (e.g. `01-02-1990` is 1 February 1990), if open question 1 confirms that's the real format.
- [ ] A date that doesn't exist (e.g. `31/02/1990`) is not turned into a different date.
- [ ] A date of birth that can't be read is shown as it was sent, not as an empty cell, on the web page, PDF and Excel.
- [ ] Unit tests in `json-parser.test.ts` cover each row of the table above. The web page, PDF and Excel tests cover the unreadable-value case.

## Implementation notes

- Have the parser keep the original string next to the parsed date (or return the string when parsing fails), so each output can fall back to it. This changes `SjpCasePress.dateOfBirth`, so all three outputs need updating together.
- Reuse the validity check pattern from `validateDateFormat` (`libs/list-types/common/src/conversion/excel-to-json.ts:70`): build the date, then confirm the day, month and year match the input.
- Luxon's `DateTime.fromFormat(value, "dd-MM-yyyy")` / `fromISO` already reject impossible dates and are used elsewhere in `@hmcts/list-types-common`.
- The PDF formats the date differently from the Excel and web page: always English, with a zero-padded day (`01 January 1990`). That is outside this ticket, but worth deciding while these files are open.

## Open questions

1. **What format does the real SJP feed send for `dateOfBirth`?** If it's always `dd/MM/yyyy` or ISO, problems 1 and 2 never happen in practice and this ticket is mostly about the fallback. If it's `dd-MM-yyyy` like the schema example, live press lists are showing wrong or missing dates of birth today.
2. Should the schema define a format for `dateOfBirth`, so bad values are rejected at upload instead?

## Background

Found while working on #1184 (consistent date format in Excel downloads). That ticket is Excel only, and this parser also feeds the web page and PDF, so it was split out.


## Comments

### Comment by HarveyMoj on 2026-11-12T14:24:58Z
The Excel part is done on `feature/1366-sjp-press-dob` (moved out of #1184).

The SJP press Excel now writes the DOB exactly as sent, plus ` (age)`, or `(age)` alone when there's no DOB. This matches PIP's `SjpPressListFileConverter.getAccusedDob`, which never parses the date. `01-02-1990`, `31/02/1990` and `unknown` now come out as sent instead of swapped, rolled over or empty. The parser keeps the original string as `rawDateOfBirth` next to the parsed `dateOfBirth`. The web page and PDF still use the parsed date.

One difference from PIP: the cell goes through `sanitiseCellValue`, so a value starting with `=`, `+`, `-` or `@` gets an apostrophe in front, and that apostrophe will probably be visible in the cell. PIP writes the cell as plain text, and ExcelJS strings are text cells too. Should we keep the sanitising?

Open question 1, about the real feed's format, still decides how urgent the rest of this is.


