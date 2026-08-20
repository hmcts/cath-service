# Tasks — Issue #845

## Phase 1 — Stylesheet contract (fixes 5 of 9 restriction templates and all 7 warning icons with no markup edits)

- [ ] In `libs/list-types/common/src/pdf/pdf-styles.ts`, remove `.restriction-row td` from `PDF_CIVIL_FAMILY_STYLES` (drop `background-color: #fff7e6` and `font-style: italic`)
- [ ] Add `.restriction-row td { background-color: #f3f2f1; }` plus `.no-side-border-left` / `.no-side-border-right` to `PDF_BASE_STYLES`
- [ ] Add `.restriction-block` (grey, padding, `page-break-inside: avoid`) and `.restriction-label` to `PDF_BASE_STYLES`
- [ ] Add `.warning-row`, `.warning-icon`, `.warning-text` to `PDF_BASE_STYLES` (GOV.UK warning-text equivalent for print)
- [ ] Add `.visually-hidden` to `PDF_BASE_STYLES`
- [ ] Add `page-break-inside: avoid` to the existing `.caution-box` and `.info-box` rules
- [ ] Verify `#fff7e6` no longer appears anywhere in the repo
- [ ] Write `libs/list-types/common/src/pdf/pdf-styles.test.ts` — all classes defined, literal `#f3f2f1`, no `#fff7e6`, `PDF_CIVIL_FAMILY_STYLES` no longer declares `.restriction-row`, exactly one `.restriction-row` declaration when the two strings are composed, `page-break-inside` present

## Phase 2 — Restriction markup (the 4 outliers plus 5 label-only tidies)

- [ ] `cop-daily-cause-list/src/pdf/pdf-template.njk:94` — add `class="restriction-row"` to the `<tr>`; `<strong>` → `<span class="restriction-label">`
- [ ] `magistrates-public-list/src/pdf/pdf-template.njk:124–126` — add `class="restriction-row"`; replace both inline `style="border-…: none;"` with `no-side-border-left` / `no-side-border-right`; keep the 2 + 3 two-cell split and joined border
- [ ] `magistrates-standard-list/src/pdf/pdf-template.njk:125–127` — wrap the hearing-level restriction in `<div class="restriction-block">`
- [ ] `magistrates-standard-list/src/pdf/pdf-template.njk:156` — wrap the offence-level restriction in `<div class="restriction-block">`
- [ ] `sjp-press-list/src/pdf/pdf-template.njk:46–48` — wrap `<p class="restriction-tag">` in `<div class="restriction-block">`; keep the `#d4351c` tag colour
- [ ] Swap `<strong>` for `<span class="restriction-label">` in `civil-daily-cause-list:99`, `civil-and-family-daily-cause-list:117`, `crown-daily-list:122`, `crown-firm-list:118`, `family-daily-cause-list:103`
- [ ] Confirm every colspan is unchanged, including `crown-daily-list`'s conditional `{% if session.hasListingNotes %}6{% else %}5{% endif %}`
- [ ] Confirm no template emits an empty grey block when a restriction flag is true but its detail field is empty

## Phase 3 — Shared caution content (English; unblocked)

- [ ] Add a `caution` object to `libs/list-types/common/src/locales/en.ts`, copying the English verbatim from `rcj-standard-daily-cause-list/src/locales/en.ts:133–136`
- [ ] Add a `pdfCommon` object with `warningAssistiveText: "Warning"` to `libs/list-types/common/src/locales/en.ts`
- [ ] Export `cautionEn` / `cautionCy` and `pdfCommonEn` / `pdfCommonCy` from `libs/list-types/common/src/index.ts`, mirroring the existing `provenanceLabels` lines
- [ ] Confirm no import cycle is introduced (`@hmcts/list-types-common` must not import any leaf list-type package)
- [ ] Spread the shared English caution into the 15 packages that lack the keys
- [ ] Replace the hardcoded English literals with the spread in the 22 packages that have them at the locale root
- [ ] Spread into the `common` sub-object for `administrative-court-daily-cause-list` and `rcj-standard-daily-cause-list`
- [ ] Spread into the `common` sub-object for `sjp-press-list` and `sjp-public-list` — note their locale files are at `src/<pkg>/{en,cy}.ts`, **not** `src/locales/`

## Phase 4 — Shared caution content (Welsh; **blocked on Q1**)

- [ ] Get the approved Welsh wording confirmed (recommendation: Variant A, the 12-package plurality, from `cop-daily-cause-list/src/locales/cy.ts`, straight apostrophes). **Do not use the Welsh quoted in the issue's spec comment — it says "GLlTEM"; the repo uses "GLlTEF"**
- [ ] Add the approved `caution` Welsh to `libs/list-types/common/src/locales/cy.ts`
- [ ] Add `warningAssistiveText: "Rhybudd"` to `pdfCommon` in `cy.ts` (confirm with the Welsh content reviewer; do not ship a `[WELSH TRANSLATION REQUIRED: …]` placeholder)
- [ ] Replace all six Welsh variants across the 24 packages with the shared spread — this fixes the 3 packages currently shipping untranslated English (`ftt-lands-registration-tribunal-weekly-hearing-list`, `ftt-tax-chamber-weekly-hearing-list`, `siac-poac-paac-weekly-hearing-list`)
- [ ] If Q1 is still open when Phases 1–3 and 5 are ready, ship those and keep each package's existing Welsh string in place, spreading only the English — do not block the visible fix

## Phase 5 — Caution box markup (15 templates)

- [ ] Insert the 6-line `caution-box` block as the last child of `<div class="footer">`, **outside** `{% if dataSource %}`, byte-for-byte matching `cop-daily-cause-list/src/pdf/pdf-template.njk:113–116`, in each of: `ast-daily-hearing-list`, `cic-weekly-hearing-list`, `civil-daily-cause-list`, `crown-daily-list`, `crown-firm-list`, `crown-warned-list`, `et-daily-list`, `et-fortnightly-list`, `family-daily-cause-list`, `magistrates-adult-court-list`, `magistrates-public-adult-court-list`, `magistrates-public-list`, `magistrates-standard-list`, `send-daily-hearing-list`, `sscs-daily-hearing-list`
- [ ] Change `iac-daily-list/src/pdf/pdf-template.njk:77` from `{{ common.cautionNote }}` to `{{ t.common.cautionNote }}`, leaving the `common: translations.common` injection at `pdf-generator.ts:56` in place (its `common.dataSource` at line 74 still needs it)
- [ ] Add `<span class="visually-hidden">{{ t.warningAssistiveText }}</span>` inside `.warning-text` in the 7 warning-icon templates, keeping `aria-hidden="true"` on the glyph
- [ ] Confirm every `src/pdf/*.njk` now contains exactly one `caution-box` — including `utiac-jr-daily-hearing-list/src/pdf/pdf-template-london.njk`

## Phase 6 — CI guard test

- [ ] Write `libs/list-types/common/src/pdf/guard.test.ts`, modelled on `libs/list-types/common/src/validation/guard.test.ts` (walk siblings, skip `common`, collect violations, `expect(violations).toEqual([])`)
- [ ] Glob `src/pdf/*.njk`, **not** `src/pdf/pdf-template.njk` — otherwise `pdf-template-london.njk` is silently skipped
- [ ] Rule: exactly one `caution-box` per template
- [ ] Rule: no `background-color` declaration for restriction or caution markup in any `.njk`
- [ ] Rule: no inline `style=` on restriction markup
- [ ] Rule: every restriction block uses `restriction-row` or `restriction-block`
- [ ] Rule: every template referencing `cautionNote` belongs to a package whose locale files define it — resolve `src/locales/{en,cy}.ts` **or** `src/<pkg>/{en,cy}.ts`, matching the key anywhere in the file (`sjp-*` nest it under `common`)
- [ ] Rule: no template uses the bare `common.cautionNote` form
- [ ] Add a named, commented allowlist for the two legitimately `common`-nested packages (`administrative-court-daily-cause-list`, `rcj-standard-daily-cause-list`)
- [ ] Make every failure message name the offending package and the rule broken
- [ ] Prove the guard works: temporarily remove a `caution-box`, confirm the test fails and names the package, then restore

## Phase 7 — Tests

- [ ] Locale parity: `Object.keys(en).sort()` equals `Object.keys(cy).sort()` for the shared objects and for the 15 newly-touched packages
- [ ] Assert no `cy.ts` in `libs/list-types/*` contains the English caution string
- [ ] Assert no `[WELSH TRANSLATION REQUIRED: …]` placeholder is introduced
- [ ] Generator test — table-row shape (`civil-and-family-daily-cause-list`): `tr.restriction-row` with `colspan="9"` after the case row; no row at all when unrestricted; zero rows for an all-unrestricted list
- [ ] Generator test — conditional colspan (`crown-daily-list`): 6 with `hasListingNotes` true, 5 with it false
- [ ] Generator test — two-cell (`magistrates-public-list`): 2 + 3 layout and joined border preserved; grey from classes, no inline styles
- [ ] Generator test — block shape (`sjp-press-list`): `.restriction-block` present with the `#d4351c` tag intact
- [ ] Generator test — caution box: both caution **texts** present (not just the element); last block inside `.footer` after `dataSource`; still renders when `dataSource` is absent; `locale: "cy"` yields Welsh with no English string
- [ ] Generator test — warning icon (the 7): glyph keeps `aria-hidden="true"` and carries the visually-hidden label
- [ ] Follow AAA and the naming conventions in `.claude/rules/testing.md`; no new E2E test (not a new user journey)

## Phase 8 — Verification and sign-off

- [ ] `yarn lint:fix` and `yarn format`
- [ ] Full `yarn test` green across all 43 list-type packages — `pdf-styles.ts` reaches every generator, so a broken selector surfaces broadly
- [ ] Byte-size check: no list type previously under `MAX_PDF_SIZE_BYTES` (2 MB) crosses it
- [ ] Existing E2E PDF-download coverage still passes unchanged
- [ ] Manual visual check, English and Welsh, on one PDF per rendering shape (table-row, block, two-cell): grey spans the full table width with no gap at the right edge; no cream anywhere; warning icon is a styled circle not a bare `!`; caution box sits at the foot of the last page without splitting
- [ ] Monochrome print check: restrictions stay identifiable by label and position when the grey greys out
- [ ] Record the answers to Q1–Q9 on the issue before merge
