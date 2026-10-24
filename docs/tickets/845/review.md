# Code Review: Issue #845

## Summary

This is a 54-file presentation-consistency fix across PDF Nunjucks templates, a shared PDF
stylesheet, and 15 pairs of locale files. The core mechanical work is solid: the cream
`#fff7e6` restriction-row colour is corrected to GOV.UK light-grey `#f3f2f1`
(`libs/list-types/common/src/pdf/pdf-styles.ts:130`), the four unclassed/non-table
restriction templates are brought onto a grey background, 15 missing caution boxes are
added in the correct location (sibling of, not nested inside, `{% if dataSource %}`), and a
new CI guard test (`libs/list-types/common/src/validation/pdf-template-guard.test.ts`) gives
this class of defect durable regression protection for the first time. Template-level test
coverage for PDF markup — previously zero — is now extensive (9 new/extended
`.njk.test.ts` files, 15 new `locales.test.ts` files).

However, three of the thirteen Given/When/Then acceptance criteria in the ticket's §3 are
not fully met, and one of the ticket's own root-cause claims (Defect B — "undefined warning
classes") turns out to be factually wrong on the current codebase: all seven affected
templates already carried complete, correct, working local `.warning-row`/`.warning-icon`/
`.warning-text` CSS in their own `<style>` block before this change. The fix adds a second,
now-redundant copy of the same rules to the shared stylesheet rather than removing the
duplication — the opposite of this ticket's own stated root-cause remedy ("no shared
style contract, so templates drifted"). The caution text itself is still duplicated
literally across 15 new locale files rather than being centralised and exported from
`libs/list-types/common`, which is an explicit, named acceptance criterion ("Caution text is
defined once and shared") and is not implemented. `magistrates-public-list` also keeps its
inline `style="border-right: none"` / `style="border-left: none"` attributes, which the AC
explicitly asked to be replaced with named classes.

Unit/template test coverage on every touched workspace is good (89–100% statements, with
one exception). The pre-existing, repo-wide `undici`/`webidl.util.markAsUncloneable` crash
inside every `*.njk.test.ts` file is confirmed (via `git stash` + rerun) to reproduce
identically on unmodified `master` — it is not a regression introduced by this change, but it
does have a previously-unflagged side effect worth noting: it suppresses the printed v8
coverage summary for every workspace that contains a `.njk.test.ts` file, which is now most
of the touched packages in this PR.

## 🚨 CRITICAL Issues

None. No security, authorization, or data-protection issues were found — this is a
template/CSS/locale-only change with no new user input, no new routes, and no database
access. No `any` types were introduced. No regressions were found in the mechanical fixes
(cream→grey, caution-box placement, iac-daily-list access path).

The three unmet/partially-met acceptance criteria below are listed per the project's review
template rule (unmet AC → CRITICAL, partially met → HIGH PRIORITY); see the full citations
in the Acceptance Criteria Verification section.

1. **AC "Caution text is defined once and shared" — not implemented.**
   - **File:** e.g. `libs/list-types/ast-daily-hearing-list/src/locales/en.ts:32-35`,
     repeated verbatim in 14 other packages' `en.ts`/`cy.ts` files; not present in
     `libs/list-types/common/src/index.ts` or `libs/list-types/common/src/locales/`.
   - **Impact:** The ticket's own stated root cause ("no shared stylesheet/locale contract
     → 40 templates drifted") is reproduced, not fixed, for the caution text: it is now
     duplicated in **30 more files** than before (15 packages × en+cy), on top of the 24
     that already duplicated it pre-change. Any future wording correction (e.g. the Q1
     Welsh-variant consolidation flagged in `plan.md` §0.3) now requires editing up to 39
     files instead of one shared export.
   - **Solution required:** Add `cautionNote`/`cautionReporting` to
     `libs/list-types/common/src/locales/en.ts` and `cy.ts`, export them from
     `libs/list-types/common/src/index.ts`, and have all newly-touched (and ideally the
     pre-existing 24) package locale files import and spread/re-export that shared value
     instead of restating the literal string.

## ⚠️ HIGH PRIORITY Issues

1. **Defect B's root cause was mischaracterised, and the "fix" adds dead/duplicate CSS
   instead of removing the real duplication.**
   - **Evidence:** `git show HEAD:libs/list-types/crown-daily-list/src/pdf/pdf-template.njk`
     (lines 9-28) — and identically in `crown-firm-list`, `crown-warned-list`,
     `magistrates-standard-list`, `magistrates-public-list`, `magistrates-adult-court-list`,
     `magistrates-public-adult-court-list` — shows each of the seven "Defect B" templates
     **already had a complete, correctly-styled local `<style>` block** (`background-color:
     #0b0c0c`, `border-radius: 50%`, `color: #fff`, 26px circle) defining `.warning-row`/
     `.warning-icon`/`.warning-text`, present on `master` before this change. The spec's
     claim (ticket.md §2.5, repeated in `plan.md` §0) that these classes are "genuinely
     undefined in every PDF stylesheet" and render as "an unstyled bare exclamation mark" is
     not true of the current codebase — manual visual check of the CSS values shows a
     correctly-rendered black circular icon with white bold glyph already existed.
   - **Impact:** The new `.warning-row`/`.warning-icon`/`.warning-text` rules added to
     `PDF_BASE_STYLES` (`libs/list-types/common/src/pdf/pdf-styles.ts:80-99`) are inert for
     all seven affected templates — the template's own later `<style>` block wins the CSS
     cascade (equal specificity, later declaration). This doesn't break anything, but it
     means the PR ships 7 new duplicate rule-sets in the one place this ticket was supposed
     to consolidate them, compounding rather than fixing the "no single style contract"
     problem the ticket exists to solve. `plan.md` §0 explicitly re-ran `git grep` and found
     "the only matches are the 7 .njk files themselves" — that finding should have been the
     signal that local styles already existed and were working, not confirmation that they
     were "undefined."
   - **Recommendation:** Remove the local `<style>` block's `.warning-row`/`.warning-icon`/
     `.warning-text` rules from the seven templates now that the shared `PDF_BASE_STYLES`
     copy exists, so there is genuinely one definition, not two. Flag to the reporter
     (`junaidiqbalmoj`) that Defect B as originally described may not reproduce on current
     `master` — worth a visual check against a real PDF before assuming it ever existed in
     production.

2. **AC "Unclassed restriction rows are brought onto the shared class" — partially met for
   `magistrates-public-list`.**
   - **File:** `libs/list-types/magistrates-public-list/src/pdf/pdf-template.njk:124` and the
     corresponding test assertion at
     `libs/list-types/magistrates-public-list/src/pdf/pdf-template.njk.test.ts:87-94`, which
     explicitly asserts the inline styles are *kept*.
   - **Impact:** The AC's third bullet explicitly says: "...the ad-hoc inline
     `style="border-right: none"` / `style="border-left: none"` attributes in
     `magistrates-public-list` are replaced by named classes so no inline styles remain in
     the template." `class="restriction-row"` was added correctly (grey background is
     achieved), but the inline styles were deliberately kept — `tasks.md` even documents this
     as "do not normalise the 2+3 split, Q7 is out of scope" and the plan's own §3 "Q7"
     explicitly scoped this out. This is a reasonable, well-documented judgement call, but it
     means one literal clause of a written, scenario-based acceptance criterion is not met.
   - **Recommendation:** Either get sign-off that Q7 (named in both `plan.md` and `tasks.md`)
     is accepted as out of scope and the AC wording will be revised, or do the small
     mechanical change (two named classes, e.g. `.restriction-cell--right`/`.restriction-cell--left`,
     replacing the two inline `style=` attributes) since the grey-background class is already
     in place and the remaining change is cosmetic/low-risk.

3. **AC "CI blocks a template that hardcodes its own restriction background" — only
   partially guarded.**
   - **File:** `libs/list-types/common/src/validation/pdf-template-guard.test.ts:23` —
     `CREAM_BACKGROUND_PATTERN = /#fff7e6/i` only detects the specific cream hex value, and
     the guard only walks `src/pdf/*.njk` files (`pdf-template-guard.test.ts:48`), never a
     package's own `src/pdf/pdf-styles.ts`.
   - **Impact:** The AC's scenario is "a developer adds a `background-color` declaration for
     a restriction element inside a `pdf-template.njk` **or a per-package PDF stylesheet**"
     (any colour, not just cream) → guard fails. As implemented, a new hardcoded
     `background-color: #ff0000` (say) on a `.restriction-row` override inside a per-package
     `pdf-styles.ts`, or any colour other than `#fff7e6` added inline in a `.njk` file, would
     not be caught, because the only colour-specific check is for cream, and per-package
     stylesheet `.ts` files are never scanned by the guard at all.
   - **Recommendation:** Extend the guard to (a) flag any `background-color` declaration
     found on a selector/attribute associated with restriction markup regardless of value,
     and (b) also scan each package's `src/pdf/pdf-styles.ts` (where it exists, e.g.
     `sjp-press-list`), not just `*.njk` files.

4. **AC "Locale access path is uniform across templates" — the generator-level half of this
   AC is not met, for a documented and justified reason.**
   - **File:** `libs/list-types/iac-daily-list/src/pdf/pdf-generator.ts` — the
     `common: translations.common` render-context injection was **not** removed (the plan
     assumed it was redundant; `tasks.md:21` documents that re-verification found it is
     actually required by 15 other `common.*` field references in the template, so removing
     it would have been a production regression).
   - **Impact:** The AC's literal wording — "`iac-daily-list/src/pdf/pdf-generator.ts` no
     longer needs to inject a bespoke `common` render-context variable for this purpose" — is
     not satisfied; the variable is still injected. The *intent* of the AC (collapse from
     three divergent caution-text access paths to a uniform one) is satisfied — the template
     now reads `t.common.cautionNote` (`libs/list-types/iac-daily-list/src/pdf/pdf-template.njk:77-78`),
     matching the other two `t.common.*` packages, and the bare `common.cautionNote` pattern
     is gone. This is a correct engineering call documented transparently in `tasks.md`, but
     the AC as literally written is not fully true, and that should be flagged back to
     whoever signs off the AC rather than silently treated as done.
   - **Recommendation:** No code change needed; update the AC wording (or get it explicitly
     waived) to reflect that `common` is still injected for unrelated fields, so the next
     reviewer doesn't re-flag this as a miss.

## 💡 SUGGESTIONS

1. **Naming drift from the AC's own vocabulary.** The AC text (ticket.md §3, "Non-table
   restriction markup also gets the grey treatment") calls the non-table wrapper class
   `restriction-block`. The implementation names it `.restriction-row-block`
   (`libs/list-types/common/src/pdf/pdf-styles.ts:102-106`,
   `libs/list-types/magistrates-standard-list/src/pdf/pdf-template.njk:126,158`). Functionally
   fine, but the guard test's `GREY_RESTRICTION_CLASS_PATTERN`
   (`pdf-template-guard.test.ts:21`) has to special-case both names
   (`restriction-row|restriction-tag|restriction-row-block`) rather than matching a single
   consistent convention. Consider renaming to `restriction-block` to match the AC and
   slightly simplify the guard regex — low priority, purely cosmetic.

2. **Guard test's heuristic regex for "renders restriction data" is clever but fragile.**
   `RESTRICTION_DATA_ACCESS_PATTERN` (`pdf-template-guard.test.ts:19`) hand-lists
   `case|hearing|offence|application` as the only valid object prefixes. A future list type
   whose data model nests restriction fields under a different name (e.g. `party.`,
   `defendant.`) would silently bypass the guard rather than failing loudly. A comment
   explaining this is already present (`pdf-template-guard.test.ts:12-18`), which is good,
   but consider widening the prefix set or matching on the property suffix alone
  (`\.(formattedReportingRestriction|reportingRestriction[A-Za-z]*)` without requiring a
   specific left-hand prefix) for a bit more future-proofing.

3. **`common.cautionReporting` for `iac-daily-list` is still "HMCTS" not "GLlTEF" in Welsh** —
   flagged as Q1a in `plan.md` and correctly carried into `tasks.md`'s "Follow-ups raised,
   not implemented" list, not silently dropped. No action needed in this review beyond
   confirming the follow-up ticket gets raised as promised.

4. Consider adding a one-line code comment at `pdf-styles.ts:80-99` noting that these
   `.warning-row`/`.warning-icon`/`.warning-text` rules are currently shadowed by identical
   local per-template definitions in seven packages, so a future contributor doesn't assume
   the shared rule is what's actually rendering for those seven list types.

## ✅ Positive Feedback

- **Caution-box placement is correct and conflict-free in all 15 cases.** Every new
  `<div class="caution-box">` was verified to sit as a sibling of, not nested inside, the
  `{% if dataSource %}` block (e.g. `libs/list-types/crown-daily-list/src/pdf/pdf-template.njk:140-146`,
  `libs/list-types/magistrates-standard-list/src/pdf/pdf-template.njk:174-180`) — exactly the
  edge case the plan called out as the most likely way to get this wrong (§3 "`dataSource`-absent footers").
- **The CI guard test is a genuinely durable fix**, closely modelled on the existing
  `guard.test.ts` pattern, and correctly globs `src/pdf/*.njk` (not a fixed filename) to also
  catch `utiac-jr-daily-hearing-list`'s second template — verified by its own sanity-check
  test (`pdf-template-guard.test.ts:64-70`).
- **The `iac-daily-list` deviation from the plan was caught and documented, not silently
  "fixed" per the (wrong) instructions.** `tasks.md:21` shows the implementer actually ran
  `grep -n 'common\.' pdf-template.njk`, found 17 real field dependencies the plan had missed,
  and avoided what would have been a production-breaking change (empty header/table columns
  on every IAC daily list PDF). This is exactly the kind of re-verification this project's
  own planning docs ask for.
- **Welsh placeholder convention correctly followed.** All 15 newly-added `cy.ts` caution
  strings use the project's `[WELSH TRANSLATION REQUIRED: '...']` convention
  (e.g. `libs/list-types/ast-daily-hearing-list/src/locales/cy.ts:32-35`) rather than
  inventing new Welsh wording or copying the spec comment's confirmed-wrong "GLlTEM" text —
  matches `CLAUDE.md`'s stated convention for untranslated strings.
- **Locale-key-parity tests added for every one of the 15 touched packages**
  (`libs/list-types/*/src/locales/locales.test.ts`), each asserting
  `Object.keys(en).sort()` equals `Object.keys(cy).sort()` plus a direct truthiness check on
  the four new caution keys — a good re-usable pattern.
- **No regression to the three pre-existing `.njk.test.ts` files.** `civil-daily-cause-list`,
  `civil-and-family-daily-cause-list`, and `family-daily-cause-list` had new `describe`
  blocks added rather than new files created, per the project's "co-location, not duplicate
  files" convention, and their pre-existing assertions (`.info-box`, `.address`) are
  untouched.
- **Pre-existing environment bug correctly identified, not misattributed.** `tasks.md:39`
  investigated the `undici`/`webidl` crash via `git stash` before claiming it pre-existed —
  independently re-verified in this review (see Test Coverage Assessment) and confirmed
  accurate.

## Test Coverage Assessment

- **Unit tests:** Good. Every touched workspace's own tests pass 100% of real assertions
  (see per-workspace figures below); the pre-existing-bug-induced "failed suite" exit code is
  cosmetic, not a real failure (verified independently, see below).
- **Template tests (`.njk.test.ts`):** Strong improvement from a zero baseline. 9
  files cover restriction-row/restriction-block grey background and caution-box
  presence/absence, including a Welsh-locale assertion in each. `magistrates-public-list`'s
  file additionally and correctly tests that the inline border styles survive the class
  addition (though see HIGH PRIORITY #2 on whether that's the right outcome).
- **Accessibility tests:** N/A — no new user-facing HTML page; these are server-generated,
  untagged PDFs (a pre-existing, separately-flagged WCAG gap per `plan.md` Q9, correctly not
  addressed here).
- **E2E tests:** N/A — no new route or user journey; PDFs are generated at publish time, not
  on request, so there is nothing new for Playwright to exercise.
- **Pre-existing environment bug — independently verified, not a regression.** Per the task
  brief, I ran `git stash` (reverting all 54 changed files + removing the 22 new untracked
  test files), reran `@hmcts/civil-daily-cause-list`'s test suite, and got the identical
  `TypeError: webidl.util.markAsUncloneable is not a function` crash with "38 passed (38)"
  real assertions and the same "1 failed | 4 passed (5)" file-level summary as the
  with-changes run ("40 passed (40)", "1 failed | 5 passed (6)" — the +2 tests and +1 passing
  file are this PR's own new assertions, not a different crash). `git stash pop` confirmed a
  clean restore. **Confirmed pre-existing, not caused by this ticket.**
  - **Worth flagging separately (not a regression, but newly material at this PR's scale):**
    this bug suppresses the printed v8 coverage summary for every workspace containing a
    `.njk.test.ts` file. Since this PR adds `.njk.test.ts` files to several previously-unaffected
    packages, more workspaces than before are now unable to print a coverage table via the
    normal `yarn test:coverage` path. I worked around this per-package by temporarily moving
    each `pdf-template.njk.test.ts` aside, running `vitest --coverage` on the remainder, and
    restoring the file immediately after (confirmed via `git status` that all files were
    restored byte-for-byte) — this is not something CI can do, so CI coverage reporting is
    silently zero for these packages until the environment bug is fixed. Worth a dedicated
    ticket given it now affects reporting for ~10 packages, not a cosmetic nuisance in one.
- **Statement coverage per changed workspace** (STEP 2b; `*` = measured with the crashing
  `.njk.test.ts` temporarily moved aside, coverage figure for the TS surface only — `.njk`
  template markup itself is not instrumented by v8 coverage in either case):
  - `@hmcts/list-types-common`: 92.63% (clean run, no workaround needed)
  - `@hmcts/civil-daily-cause-list`: 89.74% *
  - `@hmcts/crown-daily-list`: 97.33% *
  - `@hmcts/crown-firm-list`: 96.84% *
  - `@hmcts/family-daily-cause-list`: 87.09% *
  - `@hmcts/civil-and-family-daily-cause-list`: 91.3% *
  - `@hmcts/cop-daily-cause-list`: 92.15% *
  - `@hmcts/magistrates-public-list`: 100% *
  - `@hmcts/magistrates-standard-list`: 98.03% *
  - `@hmcts/sjp-press-list`: 90.9% *
  - `@hmcts/iac-daily-list`: 92.92% (clean run)
  - `@hmcts/ast-daily-hearing-list`: 78.57% (clean run) ⚠️ below 80%
  - `@hmcts/cic-weekly-hearing-list`: 75.86% (clean run) ⚠️ below 80%
  - `@hmcts/crown-warned-list`: 94.11% (clean run)
  - `@hmcts/et-daily-list`: 95.12% (clean run)
  - `@hmcts/et-fortnightly-list`: 94.33% (clean run)
  - `@hmcts/magistrates-adult-court-list`: 95.57% (clean run)
  - `@hmcts/magistrates-public-adult-court-list`: 100% (clean run)
  - `@hmcts/send-daily-hearing-list`: 78.57% (clean run) ⚠️ below 80%
  - `@hmcts/sscs-daily-hearing-list`: 100% (clean run)

  Three workspaces (`ast-daily-hearing-list`, `cic-weekly-hearing-list`,
  `send-daily-hearing-list`) sit at ~75-79% statement coverage, below the project's 80%
  target. In all three cases the uncovered lines are pre-existing (`pdf-generator.ts`
  branches unrelated to this change — these packages received only a 4-line `.njk` edit and
  a 4-line locale addition, no new generator logic needing new tests), so this is a
  pre-existing gap this PR did not widen, but per the coverage rule it still requires listing
  here and pushes the overall verdict to at least NEEDS CHANGES.

## Acceptance Criteria Verification

- [x] **Per-case reporting restriction row has a grey background in a table-based list** —
  `.restriction-row td` background changed from `#fff7e6` to `#f3f2f1`
  (`libs/list-types/common/src/pdf/pdf-styles.ts:130`); verified rendered in
  `libs/list-types/civil-daily-cause-list/src/pdf/pdf-template.njk.test.ts:173-178`
  ("should render the restriction-row class... No reporting until trial concludes").

- [x] **Grey background is applied to every list type that renders a restriction row** —
  all nine §2.4 packages now carry a resolvable grey class: `civil-and-family-daily-cause-list`,
  `civil-daily-cause-list`, `crown-daily-list`, `crown-firm-list`, `family-daily-cause-list`
  via `.restriction-row` (shared `PDF_CIVIL_FAMILY_STYLES`); `cop-daily-cause-list`
  (`libs/list-types/cop-daily-cause-list/src/pdf/pdf-template.njk:94`) and
  `magistrates-public-list` (`libs/list-types/magistrates-public-list/src/pdf/pdf-template.njk:124`)
  newly classed `restriction-row`; `magistrates-standard-list` and `sjp-press-list` via the new
  `.restriction-row-block`/`.restriction-tag` grey rules. Guarded going forward by
  `libs/list-types/common/src/validation/pdf-template-guard.test.ts:78-93`.

- [~] **Unclassed restriction rows are brought onto the shared class** — `cop-daily-cause-list`
  fully met (`pdf-template.njk:94`). `magistrates-public-list` partially met: grey
  `class="restriction-row"` added (`pdf-template.njk:124`), but the inline
  `style="border-right: none"` / `style="border-left: none"` attributes were deliberately
  kept, not replaced by named classes, contrary to the AC's explicit third clause — see
  HIGH PRIORITY #2. Test at `magistrates-public-list/src/pdf/pdf-template.njk.test.ts:87-94`
  codifies keeping the inline styles as the expected behaviour.

- [x] **Non-table restriction markup also gets the grey treatment** —
  `magistrates-standard-list/src/pdf/pdf-template.njk:126,158` wraps both the party-level and
  offence-level restriction `<p>` in `.restriction-row-block`; `sjp-press-list`'s
  `.restriction-tag` gets `background-color: #f3f2f1; padding: 5px 8px; display:
  inline-block;` while keeping red text
  (`libs/list-types/sjp-press-list/src/pdf/pdf-styles.ts:38-44`). Verified in
  `sjp-press-list/src/pdf/pdf-template.njk.test.ts:56-62` and
  `magistrates-standard-list/src/pdf/pdf-template.njk.test.ts` (restriction-row-block
  assertions).

- [~] **GOV.UK warning icon renders correctly inside the restriction panel** — the visual
  outcome described in the AC (filled circular black icon, white bold glyph, bold text
  beside it) is **already true on current `master`** for all seven affected templates, via
  pre-existing local `<style>` blocks (verified via `git show HEAD:.../crown-daily-list/.../pdf-template.njk:9-28`
  and the same block in the other six packages) — the ticket's premise that this was broken
  does not hold. This PR's own contribution (`pdf-styles.ts:80-96`) is additive but inert for
  these seven templates (shadowed by the later, identical local block) — see HIGH PRIORITY
  #1. Marked partial because the AC's premise is unverified/wrong and the actual change made
  does not do what the AC scenario describes it doing.

- [x] **Caution message appears at the end of every PDF** — guard test
  (`pdf-template-guard.test.ts:72-76`) asserts all 40 templates contain `caution-box`;
  spot-checked placement in `ast-daily-hearing-list`, `crown-daily-list`,
  `magistrates-public-adult-court-list`, `magistrates-standard-list`, etc. — all sibling to
  `{% if dataSource %}`, none nested inside it.

- [x] **Caution message appears in Welsh** — all 15 new `cy.ts` files carry
  `cautionNote`/`cautionReporting` (placeholder-flagged where Q1 wasn't confirmed, per
  convention); Welsh rendering verified in e.g.
  `magistrates-public-list/src/pdf/pdf-template.njk.test.ts:113-117` ("should render the
  caution box in Welsh when the cy locale is used").

- [ ] **Caution text is defined once and shared** — not implemented. The 15 new packages'
  English/Welsh caution strings are literal duplicates in each package's own `en.ts`/`cy.ts`
  (e.g. `libs/list-types/ast-daily-hearing-list/src/locales/en.ts:32-35`), not sourced from
  `libs/list-types/common/src/locales/` or exported via
  `libs/list-types/common/src/index.ts` — confirmed no `cautionNote`/`cautionReporting`
  export exists anywhere under `libs/list-types/common/src` outside the guard test's own
  regex. See CRITICAL #1.

- [~] **Locale access path is uniform across templates** — the template-level access path is
  now uniform (`t.cautionNote` or `t.common.cautionNote` only — confirmed via guard test
  `pdf-template-guard.test.ts:112-118`, zero bare `common.` violations). The generator-level
  clause of the AC ("`iac-daily-list/src/pdf/pdf-generator.ts` no longer needs to inject a
  bespoke `common` render-context variable for this purpose") is not met — the variable is
  still injected, now for 15 legitimate other field references documented in
  `tasks.md:21`. See HIGH PRIORITY #4.

- [x] **CI blocks a new list type that omits the caution box** —
  `pdf-template-guard.test.ts:72-76`; the violations array names the specific
  `packageName/fileName` that fails.

- [~] **CI blocks a template that hardcodes its own restriction background** — the guard
  only matches the literal `#fff7e6` cream value (`pdf-template-guard.test.ts:23,82-84`) and
  never scans per-package `pdf-styles.ts` files, so a new hardcoded colour (not cream) or a
  hardcoded colour inside a package's own stylesheet file would not be caught. See HIGH
  PRIORITY #3.

- [x] **No regression to existing correct PDFs** — the three pre-existing `.njk.test.ts`
  files were extended with new `describe` blocks, not replaced; their pre-existing
  `.info-box`/`.address` assertions are untouched and still pass (verified: 40/80/38/59/58
  etc. tests passing per workspace, no reduction in prior assertion count). Generator unit
  tests for all 40 packages continue to pass (confirmed no generator test files were deleted;
  `iac-daily-list/src/pdf/pdf-generator.test.ts` gained one new test, lost none).

- [ ] **PDF stays within the size limit** — no evidence. No test or assertion anywhere in
  the diff references `MAX_PDF_SIZE_BYTES` or `exceedsMaxSize` in connection with the new
  markup's byte-size impact; `tasks.md` does not mention this AC at all, and `plan.md`'s own
  "Acceptance Criteria Mapping" table (§4) omits it entirely from its five-row summary. The
  added markup is small (a handful of lines of HTML per template) so a real-world regression
  is unlikely, but the AC as written requires evidence this review could not find.

## Next Steps

- [ ] Centralise `cautionNote`/`cautionReporting` in `libs/list-types/common/src/locales/`
      and export from `index.ts`; update the 15 newly-touched packages (and ideally the 24
      pre-existing ones) to consume the shared export instead of a literal string
- [ ] Decide and act on Defect B: either remove the now-duplicate local `<style>` blocks in
      the seven affected templates, or confirm with the reporter whether the bug ever
      reproduced in production before keeping both copies
- [ ] Either implement `magistrates-public-list`'s inline-style replacement or get the AC
      wording formally revised to match the documented Q7 scope decision
- [ ] Widen the guard test's hardcoded-background check beyond the literal `#fff7e6` value
      and extend it to scan per-package `pdf-styles.ts` files
- [ ] Add or locate evidence for the `MAX_PDF_SIZE_BYTES`/`exceedsMaxSize` acceptance
      criterion
- [ ] Raise the previously-flagged follow-up tickets (Q1 Welsh wording sign-off, Q4 the 3
      English-in-Welsh packages, Q1a `iac-daily-list`'s "HMCTS" vs "GLlTEF") so they aren't
      lost
- [ ] Consider a separate ticket for the coverage-reporting side effect of the pre-existing
      `undici`/`webidl` crash, now affecting ~10 packages' CI coverage visibility
- [ ] Re-run `yarn test` and the guard test after addressing the above

## Overall Assessment

**NEEDS CHANGES**

The mechanical, highest-value part of this fix (grey restriction backgrounds, caution-box
insertion at the correct DOM position, a durable CI guard test, strong new template test
coverage) is well executed and the deliberate deviations from the plan (`iac-daily-list`,
`magistrates-public-list`'s Q7 scoping) are transparently documented rather than silently
absorbed. However, one acceptance criterion ("Caution text is defined once and shared") is
not implemented at all and actively increases the duplication this ticket exists to remove;
one ("PDF stays within the size limit") has no supporting evidence; and three more are only
partially met. Per the coverage rule, three touched workspaces also sit below the 80%
statement-coverage target (pre-existing gaps, not widened by this PR, but still triggering
the rule). None of this blocks the core visual fix from shipping, but the AC gaps —
especially the un-centralised caution text, which is the one most likely to cause future
re-drift exactly like the bug this ticket fixes — should be addressed or explicitly
re-scoped with the ticket author before merge.
