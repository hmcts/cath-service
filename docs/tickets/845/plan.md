# Technical Plan — Issue #845: PDF restriction grey background and caution message consistency

> **Scope update (2026-10-20):** Defect C is out of scope. Lists without a caution message must be left alone — do not add a `caution-box` or caution locale keys to them, and the guard test must not require a `caution-box` in every template. Only lists that already have a caution message are in scope, and those already render it grey via `PDF_BASE_STYLES`.

## 0. Re-verification against current `master` (supersedes `b265fb5a` / Aug 20 plan)

The Aug 20 plan was re-derived from scratch against the current working tree (not assumed correct). Findings:

**Holds unchanged (re-verified line-for-line):**
- Defect A (restriction-row cream/missing): still exactly 5 templates with the `restriction-row` class rendering `#fff7e6` cream (`civil-and-family-daily-cause-list`, `civil-daily-cause-list`, `crown-daily-list`, `crown-firm-list`, `family-daily-cause-list`), still exactly 4 with no class at all → white (`cop-daily-cause-list`, `magistrates-public-list`, `magistrates-standard-list` — two occurrences, `sjp-press-list` via `restriction-tag`, red text no background).
- Defect B (undefined `.warning-row`/`.warning-icon`/`.warning-text`): still exactly 7 templates, still genuinely undefined in every PDF stylesheet. Confirmed via `git grep` across all `*.ts`/`*.scss` — the only matches are the 7 `.njk` files themselves plus the unrelated on-screen `.govuk-warning-text*` classes in `apps/web/src/assets/css`.
- Defect C (missing `caution-box`): still exactly the same 15 of 40 templates. Re-ran `git grep -l "caution-box"` across all 40 git-tracked templates — same 15 names as the Aug 20 audit, same insertion point (`{% if dataSource %}...{% endif %}` inside `<div class="footer">`, caution-box added immediately after, unconditionally).
- Defect D locale-access split: still `t.cautionNote` (flat, now 24 templates — see §0.2), `t.common.cautionNote` (`administrative-court-daily-cause-list`, `rcj-standard-daily-cause-list`), bare `common.cautionNote` (`iac-daily-list` only, via its own extra `common: translations.common` injection in `pdf-generator.ts`).
- `PDF_BASE_STYLES` / `PDF_CIVIL_FAMILY_STYLES` exports in `libs/list-types/common/src/pdf/pdf-styles.ts` are unchanged: `.restriction-row td { background-color: #fff7e6; font-style: italic; }` is still live at line 101-104, still only in `PDF_CIVIL_FAMILY_STYLES`.
- Welsh text: still **3 packages ship untranslated English** in `cy.ts` (`ftt-lands-registration-tribunal-weekly-hearing-list`, `ftt-tax-chamber-weekly-hearing-list`, `siac-poac-paac-weekly-hearing-list`) — exact-string byte comparison confirms this. Still exactly **6 byte-distinct Welsh variants** of `cautionNote` (see §0.3). The repo consistently uses **"GLlTEF"**, never "GLlTEM" — the spec comment's quoted Welsh remains wrong and must not be copied.
- `libs/list-types/common/src/validation/guard.test.ts` pattern (walk sibling dirs, build a `violations: string[]`, assert `toEqual([])`) is unchanged and is the correct model for the new guard test.
- `printBackground: true` is still set in `libs/pdf-generation/src/generator.ts` — Puppeteer is still not the cause.

**Changed since Aug 20 — corrections to the prior plan:**

1. **Two new packages exist that the Aug 20 audit never saw**: `business-and-property-division-rolls-building-daily-cause-list` and `interim-applications-daily-cause-list` (added in commit `a4a9ef4d`, "Feature-659", merged after the Aug 20 plan). Both were checked against all three defects:
   - Neither has any `restriction` or `warning` markup at all (their data model has no reporting-restriction field) — Defects A and B do not apply.
   - Both **already** have a correctly-structured `caution-box` using the flat `t.cautionNote` pattern — Defect C does not apply.
   - Both ship the **"Variant B"** Welsh wording (§0.3) and are already internally consistent — no fix needed, but they are now in-scope for the **CI guard test** (§4) and the **Q1 Welsh consolidation** if Q1 is actioned.
   - Total is still **40 templates across 39 packages** (confirmed via `git ls-files 'libs/list-types/*/src/pdf/*.njk'` → 40 results), matching the Aug 20 correction (`utiac-jr-daily-hearing-list` ships both `pdf-template.njk` and `pdf-template-london.njk`) — but the *set* of 39 packages has shifted: three legacy CHD/KB packages (`companies-winding-up-chd-daily-cause-list`, `financial-list-chd-kb-daily-cause-list`, `chd-kb-common`) were deleted from git entirely in the same commit and replaced by the two above. **Stale `dist/`, `coverage/`, and `node_modules/` directories for the deleted packages are still present on local disk** (confirmed via `git ls-files` returning zero tracked files for them) — this is pre-existing repo hygiene debris unrelated to #845, noted here only so it isn't mistaken for a live package during implementation.

2. **§2.8 of the ticket ("zero `*.njk.test.ts` results") is now false.** Three now exist: `civil-daily-cause-list/src/pdf/pdf-template.njk.test.ts`, `civil-and-family-daily-cause-list/src/pdf/pdf-template.njk.test.ts`, `family-daily-cause-list/src/pdf/pdf-template.njk.test.ts` (added in commit `eebb2e48`, fixing an unrelated ticket, #904, about venue address formatting). They assert `.info-box`, `.court-section .address`, and open-justice contact text — **nothing about `.restriction-row` or `.caution-box`**. The substantive claim ("nothing currently tests this markup") still holds, but the implementation must **add `describe` blocks to these three existing files** rather than create new ones for those three packages (co-location convention — one `.njk.test.ts` per template, not one per concern). The other two Defect-A packages (`crown-daily-list`, `crown-firm-list`) still have no `.njk.test.ts` at all and will need one created.

3. **Defect D is not simply "fix three typos" — two of the three access paths are structurally correct for their locale shape, and conflating them would make the fix worse, not better.** This reframes the Aug 20 plan's treatment of Defect D:
   - `administrative-court-daily-cause-list` and `rcj-standard-daily-cause-list` are **multi-list-type-per-package** generators. Their locale files nest *every* shared string (not just caution text) under a `common` key, alongside per-court top-level keys (e.g. `BIRMINGHAM_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST`). Their templates consistently use `t.common.*` for every shared field — `t.common.importantInfoTitle`, `t.common.listFor`, `t.common.dataSource`, etc, not just the caution lines. `t.common.cautionNote` is **internally consistent** with the rest of the file. Rewriting just the caution lines to `t.cautionNote` would make those two files self-inconsistent and would require either flattening the entire locale file (out of scope, large blast radius) or passing a second flattened `t` context var (adds a third pattern, doesn't remove one).
   - `iac-daily-list` is the genuine redundancy: its locale file **also** nests `cautionNote`/`cautionReporting` under `common` (same multi-list-type shape as above, since it serves `IAC_DAILY_LIST` and `IAC_DAILY_LIST_ADDITIONAL_CASES`), so it could use `t.common.cautionNote` exactly like the two packages above. Instead its generator additionally injects a **duplicate top-level `common: translations.common` render variable purely for the caution box**, and the template reads bare `common.cautionNote`. This is pattern debt with no payoff — it is removable without restructuring anything else in the file.
   - **Conclusion: the correct fix is to collapse 3 access patterns to 2, not 1.** `iac-daily-list`'s template changes from `common.cautionNote` / `common.cautionReporting` to `t.common.cautionNote` / `t.common.cautionReporting`, and the redundant `common: translations.common` line is deleted from its `pdf-generator.ts`. The 24 flat-root packages keep `t.cautionNote`. The 2 multi-list-type packages keep `t.common.cautionNote`. The guard test (§4) encodes this as "every template must reference `cautionNote` via exactly one of `t.cautionNote` or `t.common.cautionNote` — never a bare top-level `common.` reference" rather than demanding one single string.

4. **`sjp-press-list` / `sjp-public-list` locale shape also nests under `common`, but their generators flatten it before render** (`t: translations.common as Record<string, string>` in `pdf-generator.ts`), so their templates correctly use flat `t.cautionNote` throughout, consistent with every other `t.*` reference in those two files. No change needed; included here only because it is the third shape (nested-locale-file, flattened-at-generator) that could otherwise be mistaken for a fourth access-path variant — it is not one, from the template's point of view it is indistinguishable from the 24 flat-root packages.

5. **`iac-daily-list`'s Welsh `cautionReporting` uses the literal English acronym "HMCTS"**, not "GLlTEF" like every other package's Welsh `cautionReporting`. This was not called out explicitly in the Aug 20 plan and is folded into the Q1 Welsh-variant count/consolidation below — it is a 7th distinct string once `cautionReporting` (not just `cautionNote`) is compared, but doesn't change the "6 variants" figure quoted for `cautionNote` specifically.

### 0.1 Defect A — current state (verified)

| Package | Markup | Class | Rendered background |
|---|---|---|---|
| `civil-and-family-daily-cause-list` :117 | `<tr class="restriction-row">` | `restriction-row` | `#fff7e6` cream |
| `civil-daily-cause-list` :99 | `<tr class="restriction-row">` | `restriction-row` | `#fff7e6` cream |
| `crown-daily-list` :122 | `<tr class="restriction-row">`, `colspan="{% if session.hasListingNotes %}6{% else %}5{% endif %}"` | `restriction-row` | `#fff7e6` cream |
| `crown-firm-list` :118 | `<tr class="restriction-row">` | `restriction-row` | `#fff7e6` cream |
| `family-daily-cause-list` :103 | `<tr class="restriction-row">` | `restriction-row` | `#fff7e6` cream |
| `cop-daily-cause-list` :94 | `<tr><td colspan="7">` | none | white |
| `magistrates-public-list` :124-126 | `<tr>` + two `<td>`, inline `border-right:none` / `border-left:none` | none | white |
| `magistrates-standard-list` :126, :156 | `<p><span class="label">…</span>…</p>` (not a table row) | none | white |
| `sjp-press-list` :47 | `<p class="restriction-tag">` | `restriction-tag` (red text, no background) | white |

### 0.2 Defect D — current access-path distribution (verified, 25 templates with a caution box)

| Access path | Count | Templates |
|---|---|---|
| `t.cautionNote` (flat root) | 24 | all except the 3 below (incl. the 2 new packages, and `sjp-press-list`/`sjp-public-list` via generator-side flattening) |
| `t.common.cautionNote` (nested, locale-structurally required) | 2 | `administrative-court-daily-cause-list`, `rcj-standard-daily-cause-list` |
| bare `common.cautionNote` (redundant extra context var) | 1 | `iac-daily-list` |

### 0.3 Welsh `cautionNote` text — 6 byte-distinct variants (verified)

| Variant | Packages | Count |
|---|---|---|
| A (straight `'` apostrophe) — *"Noder bod...Neddf Gwarchod Data 2018...a elwid gynt...y ffordd briodol."* | `care-standards-tribunal-weekly-hearing-list`, `ftt-rpt-weekly-hearing-list`, `grc-weekly-hearing-list`, `pht-weekly-hearing-list`, `upper-tribunal-administrative-appeals-chamber-daily-hearing-list`, `upper-tribunal-lands-chamber-daily-hearing-list`, `upper-tribunal-tax-and-chancery-chamber-daily-hearing-list`, `utiac-jr-daily-hearing-list`, `utiac-statutory-appeal-daily-hearing-list`, `wpafcc-weekly-hearing-list` | 10 |
| A′ (identical wording, curly `'` apostrophe — encoding-only difference) | `civil-and-family-daily-cause-list`, `cop-daily-cause-list` | 2 |
| B — *"Sylwer bod...Ddeddf Diogelu Data 2018...a elwir yn ffurfiol...a dylid ei thrin yn briodol."* | `administrative-court-daily-cause-list`, `business-and-property-division-rolls-building-daily-cause-list`, `court-of-appeal-civil-daily-cause-list`, `interim-applications-daily-cause-list`, `london-administrative-court-daily-cause-list`, `rcj-standard-daily-cause-list` | 6 |
| C — untranslated English | `ftt-lands-registration-tribunal-weekly-hearing-list`, `ftt-tax-chamber-weekly-hearing-list`, `siac-poac-paac-weekly-hearing-list` | 3 |
| D — *"Sylwer bod...a elwid gynt...ei drin yn briodol"* (near-B, close but not identical) | `iac-daily-list` | 1 |
| E — *"Noder bod...gan Ddeddf...a elwid yn ffurfiol...ei drin yn briodol"* (near-A, close but not identical) | `sjp-press-list`, `sjp-public-list` | 2 |

A and A′ are the same wording (plurality = 12 if treated as one), consistent with the Aug 20 plan's "Variant A, the 12-package plurality (`cop-daily-cause-list`)" recommendation — the apostrophe-encoding split just explains why a byte-level diff finds 6 groups instead of 5 meaningfully-different wordings.

---

## 1. Technical Approach

This is a **content and stylesheet consistency fix**, not a feature. No new routes, pages, or data models. Three independent, individually-shippable units of work:

1. **Stylesheet fix** (`libs/list-types/common/src/pdf/pdf-styles.ts`): change `.restriction-row td` background from `#fff7e6` to `#f3f2f1`; add `.warning-row` / `.warning-icon` / `.warning-text` definitions (currently absent everywhere). This single file change fixes the 5 cream `restriction-row` templates and all 7 broken warning icons with zero template edits.
2. **Markup fixes** (per-template `.njk` edits): add the `restriction-row` class (or equivalent) to the 4 unclassed Defect-A templates and `sjp-press-list`'s `restriction-tag`; add the missing `<div class="caution-box">` block to the 15 Defect-C templates (plus matching `cautionNote`/`cautionReporting` locale keys in their `en.ts`/`cy.ts`); fix `iac-daily-list`'s access path per §0.2.
3. **CI guard test** (new file in `libs/list-types/common/src/validation/`): a Vitest test, modelled exactly on the existing `guard.test.ts`, that walks every `libs/list-types/*/src/pdf/*.njk` and fails if a template is missing `caution-box`, references `restriction-row`/`warning-row`/`warning-icon`/`warning-text` without those classes being resolvable, or uses a bare `common.` reference. This is the durable part of the fix — it is what stops template #41 from repeating the drift.

**TEMPLATE SOURCE: n/a** (this is a presentation-consistency bug fix across existing PDF Nunjucks templates and shared stylesheets/locales — no new pages or routes are being created, so pip-frontend migration does not apply).

### Architecture decisions

- **No shared Nunjucks partial.** Re-confirmed: `configureNunjucks()` (`libs/list-types/common/src/pdf/pdf-utilities.ts:25`) takes a single `templateDir` and each package's `pdf-generator.ts` calls it with its own `__dirname`. A `{% include %}` across package boundaries is not resolvable by this setup without changing every generator's `configureNunjucks` call to accept multiple search paths — out of scope and higher risk than editing 15+5+7 templates directly, each a small, mechanical, independently-reviewable diff.
- **No new generator contract.** The caution-box insertion and restriction-row class addition are pure template/locale edits. No `pdf-generator.ts` changes are needed except the single `iac-daily-list` fix (remove the redundant `common:` context var).
- **Stylesheet change is additive and backward-compatible.** `.restriction-row` already exists as a selector; only its colour value changes. `.warning-row`/`.warning-icon`/`.warning-text` are net-new selectors with no prior definition, so adding them cannot regress anything that currently renders.
- **No `ListType.id` involvement.** This work touches templates, stylesheets, and locale files only. No registry keys, Prisma queries, or routing logic are touched, so the `listTypeName`-not-`listTypeId` convention is satisfied by construction (confirmed, not just asserted — `git grep -n "listTypeId"` inside the touched directories returns nothing related to this change).

## 2. Implementation Details

### 2.1 File structure (all within `libs/list-types/`, no `apps/` changes)

```
libs/list-types/
├── common/src/pdf/pdf-styles.ts                      # Defect A + B fix (single file)
├── common/src/validation/
│   ├── pdf-template-guard.test.ts                     # NEW — Defect A/B/C/D CI guard
├── civil-and-family-daily-cause-list/src/pdf/
│   ├── pdf-template.njk                               # restriction-row already correct class; style fix covers it
│   └── pdf-template.njk.test.ts                       # ADD describe block: restriction-row background + caution-box
├── civil-daily-cause-list/src/pdf/pdf-template.njk.test.ts        # ADD describe block (same)
├── family-daily-cause-list/src/pdf/pdf-template.njk.test.ts       # ADD describe block (same)
├── crown-daily-list/src/pdf/pdf-template.njk.test.ts              # NEW file
├── crown-firm-list/src/pdf/pdf-template.njk.test.ts               # NEW file
├── cop-daily-cause-list/src/pdf/pdf-template.njk              # ADD restriction-row class
├── magistrates-public-list/src/pdf/pdf-template.njk           # ADD restriction-row class (see §3 edge case)
├── magistrates-standard-list/src/pdf/pdf-template.njk         # ADD restriction-row-equivalent styling (see §3 edge case)
├── sjp-press-list/src/pdf/pdf-template.njk                    # restriction-tag → add restriction-row-style background, keep red text
├── {ast-daily-hearing-list,cic-weekly-hearing-list,civil-daily-cause-list,
│    crown-daily-list,crown-firm-list,crown-warned-list,et-daily-list,
│    et-fortnightly-list,family-daily-cause-list,magistrates-adult-court-list,
│    magistrates-public-adult-court-list,magistrates-public-list,
│    magistrates-standard-list,send-daily-hearing-list,
│    sscs-daily-hearing-list}/src/pdf/pdf-template.njk         # ADD caution-box block (15 templates, Defect C)
├── {same 15 packages}/src/locales/{en,cy}.ts                  # ADD cautionNote/cautionReporting keys
└── iac-daily-list/src/
    ├── pdf/pdf-generator.ts                                   # REMOVE redundant `common: translations.common`
    └── pdf/pdf-template.njk                                   # common.cautionNote → t.common.cautionNote (x2)
```

No `apps/web` or `apps/api` files change. No Prisma schema changes. No new API endpoints.

### 2.2 Stylesheet changes — `libs/list-types/common/src/pdf/pdf-styles.ts`

```ts
// PDF_CIVIL_FAMILY_STYLES — change background only, keep font-style
.restriction-row td {
  background-color: #f3f2f1;   // was #fff7e6
  font-style: italic;
}
```

Add to `PDF_BASE_STYLES` (available to every generator, since all 7 Defect-B templates wrap their warning in `.info-box`, which already composes `PDF_BASE_STYLES`):

```ts
.warning-row {
  display: flex;
  align-items: center;
  margin-bottom: 15px;
}
.warning-icon {
  box-sizing: border-box;
  display: inline-block;
  flex-shrink: 0;
  min-width: 30px;
  min-height: 30px;
  margin-right: 10px;
  border-radius: 50%;
  background-color: #0b0c0c;
  color: #ffffff;
  font-weight: 700;
  font-size: 20px;
  line-height: 30px;
  text-align: center;
}
.warning-text {
  font-weight: 700;
}
```

This is a static-HTML re-implementation of GOV.UK Frontend's `.govuk-warning-text__icon` circle (`node_modules/govuk-frontend/dist/govuk/components/warning-text/_mixin.scss`), using `flexbox` instead of GOV.UK's `position: absolute` trick — simpler and sufficient for a fixed-layout PDF with no responsive breakpoints, and consistent with the `flex` override `apps/web/src/assets/css/web.scss:202` already applies to the on-screen component for the same reason (icon/text vertical alignment when text wraps).

### 2.3 Markup changes — Defect A unclassed templates

- `cop-daily-cause-list/src/pdf/pdf-template.njk:94` — add `class="restriction-row"` to the existing `<tr>`.
- `magistrates-public-list/src/pdf/pdf-template.njk:124-126` — add `class="restriction-row"` to the `<tr>` (the two `<td>`s keep their existing `border-right:none`/`border-left:none` inline styles; the class only changes the row's own background, which inherits down into `td` via `.restriction-row td` regardless of the inline border overrides). **Q7 from the prior plan (normalise the 2+3 split) is intentionally not addressed — out of scope, this ticket is background colour only.**
- `magistrates-standard-list/src/pdf/pdf-template.njk:126, :156` — these are `<p>` blocks, not table rows, so `restriction-row` (a `td`-background selector) does not apply. Wrap the restriction `<p>` in a `<div class="restriction-row-block">` and add a parallel block-level selector (`background-color: #f3f2f1; padding: 10px; margin-bottom: 10px;`) to `PDF_BASE_STYLES`, rather than forcing a table-row class onto non-table markup. **This is a markup-shape fix the Aug 20 plan did not fully specify** — the two occurrences (party-level restriction at :126, offence-level at :156) must both get the wrapper.
- `sjp-press-list/src/pdf/pdf-template.njk:47` — keep `restriction-tag` (its red text is deliberate — reporting restrictions are flagged distinctly from the surrounding grey elsewhere in the on-screen equivalent) and additionally give it a grey background: add `background-color: #f3f2f1; padding: 5px 8px; display: inline-block;` to the existing `.restriction-tag` rule (defined in this package's own PDF styles — confirm during implementation whether `restriction-tag` is defined locally or needs adding; it is currently only referenced in the `.njk`, not styled, same undefined-class failure mode as Defect B).

### 2.4 Markup changes — Defect C (15 templates)

For each of the 15 templates, inside the existing `<div class="footer">`, immediately after the `{% if dataSource %}...{% endif %}` block:

```html
<div class="caution-box">
  <p>{{ t.cautionNote }}</p>
  <p>{{ t.cautionReporting }}</p>
</div>
```

All 15 already pass `t: translations` with a flat locale root (verified: `ast-daily-hearing-list`, `cic-weekly-hearing-list`, `send-daily-hearing-list` via the shared `generateListPdf`/`buildPdfFromRenderedList` helper in `pdf-utilities.ts`; the rest via their own `pdf-generator.ts`, all flat), so `t.cautionNote` requires no generator change — only the two new locale keys per package.

### 2.5 Locale additions — 15 × (`en.ts` + `cy.ts`) = 30 files

Add, using the agreed English wording (unchanged across all 24 existing flat-root packages, so copy verbatim rather than inventing new copy):

```ts
cautionNote:
  "Note this document contains Special Category Data as defined by Data Protection Act 2018, formally known as Sensitive Personal Data, and should be handled appropriately.",
cautionReporting:
  "This document contains information intended to assist the accurate reporting of court proceedings. It is vital you ensure that you safeguard the Special Category Data included and abide by reporting restrictions (for example on victims and children). HMCTS will stop sending the data if there is concern about how it will be used.",
```

Welsh: use **Variant A** (§0.3, the 12-package plurality) **only if Q1 is confirmed** — see Clarifications. If Q1 is not confirmed before implementation, ship the English (which is unambiguous) and placeholder Welsh flagged `[WELSH TRANSLATION REQUIRED]` per the project's own convention for not-yet-translated strings (see `CLAUDE.md` "Court names and other list-type-specific strings" section) — **do not** silently invent/guess new Welsh wording for these 15 packages, and do not copy the spec comment's Welsh verbatim (it contains the wrong "GLlTEM" acronym, confirmed not used anywhere in the real repo).

### 2.6 `iac-daily-list` fix (Defect D)

`pdf-generator.ts`: delete the line `common: translations.common` from the `env.render(...)` call (the surrounding `t: translations` already carries the same data at `t.common`).

`pdf-template.njk`: change
```njk
<p>{{ common.cautionNote }}</p>
<p>{{ common.cautionReporting }}</p>
```
to
```njk
<p>{{ t.common.cautionNote }}</p>
<p>{{ t.common.cautionReporting }}</p>
```

This makes `iac-daily-list` consistent with `administrative-court-daily-cause-list` / `rcj-standard-daily-cause-list` (same locale shape, same access convention), rather than inventing a third pattern.

### 2.7 API / Database

None. No endpoints, no schema changes, no migrations — confirmed, this entire ticket is template/stylesheet/locale-only.

## 3. Error Handling & Edge Cases

- **Silent-empty-box failure mode (the actual root cause of Defect D surviving undetected).** Nunjucks's default `autoescape`/undefined behaviour renders `{{ foo.bar }}` as an empty string, not an error, when `foo.bar` is `undefined`. This is exactly how `t.common.cautionNote` could be typo'd to `t.Common.cautionNote` or similar and ship an empty, but still grey, `caution-box` with no error anywhere in CI or logs — nothing short of a markup-content assertion (the guard test, §4) would catch it. `throwOnUndefined` would fix this permanently but is explicitly out of scope (Q8, carried forward) because the 40 templates reference many legitimately-optional court/session fields and turning it on now would break sparse-data rendering across the board. The guard test is the interim/permanent mitigation for this specific pair of keys.
- **Conditional colspans.** `crown-daily-list`'s restriction row has a conditional `colspan="{% if session.hasListingNotes %}6{% else %}5{% endif %}"`. The colour fix does not touch colspan logic at all (it's a class, not a cell count) — no risk here, called out only because the Aug 20 plan flagged it as something to "handle": there is nothing to handle, it's an unrelated attribute on the same tag.
- **`dataSource`-absent footers.** All 15 Defect-C templates wrap the data-source line in `{% if dataSource %}`. The new `caution-box` must sit **outside** that conditional (it is not provenance-dependent) — getting this wrong would make the caution note disappear for provenance-less artefacts, defeating the point of the fix. Each template edit must be reviewed to confirm the `caution-box` div is a sibling of the `{% if %}` block, not nested inside it (matches the existing 25-template pattern exactly, see §2.4 snippet placement).
- **`magistrates-standard-list`'s non-table restriction markup.** Because this template's restriction info is `<p>` text, not a table cell, `.restriction-row td` cannot apply by class name alone — a block-level sibling selector is needed (§2.3). Edge case: there are **two** occurrences in this one file (party-level and offence-level reporting restrictions) and both must get the wrapper, or the fix will visibly only half-apply within a single rendered PDF.
- **`magistrates-public-list`'s split-cell row.** The existing inline `border-right: none` / `border-left: none` styles create a single visual row from two `<td>`s. Adding `class="restriction-row"` to the parent `<tr>` is sufficient (CSS `tr.restriction-row td` cascades to both cells) and does not conflict with the inline border overrides, which are unrelated properties.
- **`iac-daily-list` regression risk.** Removing `common: translations.common` from the generator is safe only if no *other* part of the same template reads a bare `common.*` reference. Confirmed via grep: the only bare `common.` references in this template are the two caution lines being changed in the same edit — no other usage to miss.
- **Welsh content risk if Q1 is unresolved.** Shipping guessed Welsh for the 15 newly-added caution boxes would be worse than shipping nothing — it would be legally-relevant Special Category Data guidance text in a language users may rely on. The plan explicitly blocks inventing new Welsh (§2.5) and funnels this to Q1.

## 4. Acceptance Criteria Mapping

| Acceptance criterion (from ticket description) | How satisfied | Verification |
|---|---|---|
| Reporting restriction section has a consistent grey background across all list types | §2.2 (stylesheet), §2.3 (markup) | Guard test asserts every template with restriction markup resolves to a grey (`#f3f2f1`) background class, not cream/white/undefined. Manual: render one PDF per previously-broken package locally (`yarn dev` + trigger a publication) and visually confirm grey. |
| Caution/data-handling message present at the end of every PDF | §2.4, §2.5 | Guard test asserts every `pdf-template.njk` contains `caution-box` **and** every corresponding `en.ts`/`cy.ts` (or `common` sub-object) defines `cautionNote` + `cautionReporting`. |
| Fix is consistent — no template-specific one-offs that drift again | §4 guard test (new) | `yarn test` run includes the new guard test in CI; a new 41st list type without a caution box or with an undefined restriction/warning class fails the build, exactly like the existing schema-validator guard. |
| No regression to existing correctly-styled templates | Stylesheet change is a value-only edit to an existing selector (`.restriction-row`); new selectors (`.warning-row` etc.) are additive | Existing 3 `.njk.test.ts` files (`civil-daily-cause-list`, `civil-and-family-daily-cause-list`, `family-daily-cause-list`) continue to pass unmodified (their assertions target `.info-box`/`.address`, unaffected by this change) plus new assertions added to the same files (§2.1). |
| Welsh parity maintained | §2.5, §0.3, Q1 | Locale-key-parity check (`Object.keys(en).sort()` vs `Object.keys(cy).sort()`) added to each new/modified locale test; guard test does not require Welsh *wording* parity (that's Q1, a content decision) but does require the **keys** to exist in both files for every package. |

### CI guard test strategy (`libs/list-types/common/src/validation/pdf-template-guard.test.ts`)

Modelled directly on `libs/list-types/common/src/validation/guard.test.ts`:

```ts
describe("guard: every PDF template has a grey caution box and no undefined restriction/warning classes", () => {
  it("should find no template missing caution-box", () => { /* walk src/pdf/*.njk per package, glob not fixed filename (utiac-jr has 2) */ });
  it("should find no template with an unstyled restriction row (cream #fff7e6, or no background class, on a td/p carrying reporting-restriction text)", () => { /* ... */ });
  it("should find no template referencing warning-row/warning-icon/warning-text without those being defined in PDF_BASE_STYLES or PDF_CIVIL_FAMILY_STYLES", () => { /* ... */ });
  it("should find no template using a bare `common.` context reference for caution text (must be t.cautionNote or t.common.cautionNote)", () => { /* ... */ });
});
```

Glob pattern must be `src/pdf/*.njk` (not the fixed string `pdf-template.njk`) to also catch `utiac-jr-daily-hearing-list`'s second file, `pdf-template-london.njk` — confirmed this is still the only package with two PDF templates.

## 5. CLARIFICATIONS NEEDED

**Q1 (re-raised, updated) — Which Welsh wording is approved, and does it cover the 15 new caution boxes too?**
Still blocking only the Welsh half of the work. Re-verification confirms the "12-package plurality" (Variant A/A′, §0.3) is unchanged by the 18 intervening commits, and the two new packages (`business-and-property-division-rolls-building-daily-cause-list`, `interim-applications-daily-cause-list`) both shipped **Variant B**, not Variant A — so if Variant A is approved as the single standard, the consolidation now touches those 2 new packages too, on top of the original 24. Recommendation unchanged: adopt Variant A. If still unresolved, ship the stylesheet/markup fixes (Defects A, B) immediately, add the 15 missing caution boxes with English + a flagged Welsh placeholder (§2.5), and leave Welsh-wording consolidation across the other 26 packages as a follow-up once a content reviewer signs off.

**Q4 (re-raised, confirmed unchanged) — Separate ticket for the 3 packages rendering English in their Welsh PDFs?**
Re-verified byte-for-byte: `ftt-lands-registration-tribunal-weekly-hearing-list`, `ftt-tax-chamber-weekly-hearing-list`, `siac-poac-paac-weekly-hearing-list` still ship the identical English string in `cy.ts` today, unchanged by the 18 commits. This remains a live Welsh-language defect independent of #845 (these three already have correctly-grey restriction handling and a correctly-structured caution box — the only problem is the Welsh text is English). Recommend raising a dedicated ticket rather than silently fixing as a side effect of Q1, since Q1's scope (if approved) is "pick one Welsh wording for the 24→26 packages missing it" and these 3 are a distinct "wrong language entirely" bug that a reviewer should see named explicitly.

**New: Q1a — Does `iac-daily-list`'s Welsh `cautionReporting` using "HMCTS" instead of "GLlTEF" need correcting as part of this ticket, or is it in scope for whichever ticket resolves Q1?** Found during re-verification (§0, point 5), not present in the Aug 20 plan. Low risk either way since it's a single package, but it's a 7th Welsh string variant that should have an owner.

**Carried forward, still relevant, no new evidence found to change the recommendation:**
- Q2 (which grey was observed missing — per-case rows or top-of-document panel) — still worth a one-line confirmation from the reporter; the plan fixes both regardless.
- Q3 (was cream deliberate?) — non-blocking, proceeding with grey.
- Q5 (backfill already-published PDFs?) — still no backfill recommended; artefacts are written at publish time and turn over naturally.
- Q6 (does any list type deliberately omit the caution message?) — still assumed oversight; worth a nod from the publishing team since the guard test makes it mandatory going forward.
- Q7 (normalise `magistrates-public-list`'s 2+3 split?) — still out of scope, confirmed not touched by this plan (§2.3).
- Q8 (`throwOnUndefined`?) — still proposed as separate work; re-confirmed as the real root cause of Defect D's silent survival (§3).
- Q9 (PDF accessibility tagging / `/Lang`) — still a real, pre-existing, separate WCAG gap. Not fixed here.
