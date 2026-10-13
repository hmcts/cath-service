---
# #845: Check PDF reporting Restriction grey background for all list type and also check caution message

**State:** OPEN
**Assignees:** alexbottenberg
**Author:** junaidiqbalmoj
**Labels:** type:story
**Created:** 2026-07-10T10:26:49Z
**Updated:** 2026-10-12T14:52:46Z

## Description

Some of list types PDF are missing grey background for reporting restriction section. Check all the list types and make it consistent across all the list with grey background.
Also check the caution message at the end of each PDF to make sure it is there.

## Comments

### Comment by OgechiOkelu on 2026-08-20T12:09:59Z
@spec

### Comment by hmctsclaudecode on 2026-08-20T12:24:02Z

# Technical Specification — Issue #845

**Title:** Check PDF reporting restriction grey background for all list types and check caution message

---

## 0. Contents

1. User Story
2. Background — including the full 40-template audit
3. Acceptance Criteria
4. User Journey Flow
5. Low Fidelity Wireframe
6. Page Specifications
7. Content
8. URL
9. Validation
10. Error Messages
11. Navigation
12. Accessibility
13. Test Scenarios
14. Assumptions & Open Questions

---

## 1. User Story

**As a** member of the press or public who downloads a court or tribunal hearing list as a PDF
**I want to** see reporting restriction information presented in the same visually distinct grey panel in every list type, and the data-handling caution note at the end of every PDF
**So that** I can reliably spot legal restrictions on what I may publish, and I am always reminded of my obligations when handling Special Category Data — regardless of which court's list I downloaded

---

## 2. Background

### 2.1 What is being fixed

This is a **presentation consistency defect across 40 PDF templates**, not a new feature. Two distinct problems are reported:

1. Reporting restriction information does not get a grey background in every list type's PDF.
2. The data-handling caution message is missing from the end of some PDFs.

The audit below establishes exactly which templates are affected and why. Both problems have a single shared root cause: **there is no shared PDF partial or single stylesheet contract for these two blocks**, so each of the 40 templates was hand-written and drifted.

### 2.2 How PDFs are produced

PDFs are generated server-side at publication-processing time, not on request:

- `libs/publication/src/processing/service.ts:148` — `PDF_GENERATOR_REGISTRY`, keyed on the stable `listTypeName` string, dispatches to a per-list-type generator.
- `libs/publication/src/processing/service.ts:418` — `generatePublicationPdf()` invokes the generator.
- Each generator (`libs/list-types/<name>/src/pdf/pdf-generator.ts`) renders `pdf-template.njk` through `configureNunjucks()` and passes a `pdfStyles` string into the template, which inlines it in a `<style>` block.
- `libs/pdf-generation/src/generator.ts:52` calls Puppeteer's `page.pdf(PDF_OPTIONS)`. **`printBackground: true` is already set** (`libs/pdf-generation/src/generator.ts:12`), so background colours *do* render — this is not a Puppeteer configuration problem. The defect is genuinely in the markup and CSS.
- The rendered PDF is uploaded to blob storage under `<artefactId>.pdf` (`libs/list-types/common/src/pdf/pdf-utilities.ts:32`).

Because output is stored at upload time, a template fix only affects **artefacts published after the fix ships**. See §14.

### 2.3 Existing style contract

`libs/list-types/common/src/pdf/pdf-styles.ts` exports two style strings:

| Export | Contains | Consumed by |
|---|---|---|
| `PDF_BASE_STYLES` | `.info-box` (grey `#f3f2f1`), `.caution-box` (grey `#f3f2f1`), `table`, `th` (grey `#f3f2f1`), `.footer` | Every generator |
| `PDF_CIVIL_FAMILY_STYLES` | `.court-section`, `.section-heading`, **`.restriction-row td { background-color: #fff7e6; font-style: italic; }`** | 8 generators only |

The reference implementation for the on-screen (HTML) equivalent is `.restriction-list-section` — `background-color: #f3f2f1; padding: 20px;` — defined in `apps/web/src/assets/css/list-types/magistrates-public-list.scss:17`, `magistrates-standard-list.scss:13`, `magistrates-adult-court-list.scss:17`, and inline in `apps/web/src/pages/(list-types)/crown-daily-cause-list/crown-daily-cause-list.njk:18`. **`#f3f2f1` is `govuk-colour("light-grey")` and is the target value for the PDFs.**

### 2.4 Audit — Defect A: inline per-case restriction rows

Nine templates render a restriction against an individual case. Only five of them have any background at all, and that background is cream, not grey.

| Package (`libs/list-types/…/src/pdf/pdf-template.njk`) | Markup | Class | Rendered background |
|---|---|---|---|
| `civil-and-family-daily-cause-list` :117 | `<tr>` + `<td colspan="9">` | `restriction-row` | `#fff7e6` cream ❌ |
| `civil-daily-cause-list` :99 | `<tr>` + `<td colspan="7">` | `restriction-row` | `#fff7e6` cream ❌ |
| `crown-daily-list` :122 | `<tr>` + `<td colspan="5\|6">` | `restriction-row` | `#fff7e6` cream ❌ |
| `crown-firm-list` :118 | `<tr>` + `<td colspan="7">` | `restriction-row` | `#fff7e6` cream ❌ |
| `family-daily-cause-list` :103 | `<tr>` + `<td colspan="9">` | `restriction-row` | `#fff7e6` cream ❌ |
| `cop-daily-cause-list` :94 | `<tr>` + `<td colspan="7">` | **none** | white ❌ |
| `magistrates-public-list` :124–126 | `<tr>` + two `<td>` with inline `style="border-right: none"` / `style="border-left: none"` | **none** | white ❌ |
| `magistrates-standard-list` :126 and :156 | `<p><span class="label">…</span>…</p>` | **none** | white ❌ |
| `sjp-press-list` :47 | `<p class="restriction-tag">` | `restriction-tag` (red text `#d4351c`, no background) | white ❌ |

### 2.5 Audit — Defect B: undefined warning classes in the restriction panel

Seven templates render a GOV.UK-style warning inside the top-of-document restriction panel using `.warning-row` / `.warning-icon` / `.warning-text`:

`crown-daily-list` :54–57, `crown-firm-list` :54–57, `crown-warned-list` :59–62, `magistrates-standard-list` :76–79, `magistrates-public-list` :63–66, `magistrates-adult-court-list` :75–78, `magistrates-public-adult-court-list` :47–50.

**None of these three classes is defined in `PDF_BASE_STYLES`, `PDF_CIVIL_FAMILY_STYLES`, or any other PDF stylesheet** — a repository-wide search finds them only in the seven PDF templates. The on-screen pages use the GOV.UK `govuk-warning-text` classes instead, which have no equivalent in the PDF stylesheet. Result: the `!` renders as an unstyled bare exclamation mark on its own line rather than the GOV.UK circular warning icon.

The surrounding panel itself is `<div class="info-box">` in all seven, so the **panel background is already correctly grey**. The bug here is the warning icon inside it, not the panel.

### 2.6 Audit — Defect C: caution message missing from 15 of 40 PDFs

25 of the 40 templates end with a `<div class="caution-box">` inside `<div class="footer">`. **These 15 do not** — their footer contains only the `dataSource` line:

| Package | Footer at line | Has caution locale keys? |
|---|---|---|
| `ast-daily-hearing-list` | :59 | No |
| `cic-weekly-hearing-list` | :62 | No |
| `civil-daily-cause-list` | :116 | No |
| `crown-daily-list` | :139 | No |
| `crown-firm-list` | :133 | No |
| `crown-warned-list` | — | No |
| `et-daily-list` | — | No |
| `et-fortnightly-list` | — | No |
| `family-daily-cause-list` | — | No |
| `magistrates-adult-court-list` | :133 | No |
| `magistrates-public-adult-court-list` | :87 | No |
| `magistrates-public-list` | — | No |
| `magistrates-standard-list` | :167 | No |
| `send-daily-hearing-list` | — | No |
| `sscs-daily-hearing-list` | — | No |

All 15 already have the `<div class="footer">` wrapper with the `{% if dataSource %}` block and a working `t.dataSource` key, so the insertion point is uniform. None of the 15 has `cautionNote` / `cautionReporting` in its locale files — those keys must be supplied.

### 2.7 Audit — Defect D: three different locale access paths for the caution text

Among the 25 templates that *do* have the caution box:

| Access path | Templates | Notes |
|---|---|---|
| `t.cautionNote` / `t.cautionReporting` | 22 | Flat locale root |
| `t.common.cautionNote` | `administrative-court-daily-cause-list` :62, `rcj-standard-daily-cause-list` :145 | Locale nests under `common` |
| `common.cautionNote` | `iac-daily-list` :77 | Works only because `iac-daily-list/src/pdf/pdf-generator.ts:56` explicitly injects `common: translations.common` into the render context — a per-generator special case |

The identical English and Welsh caution strings are duplicated verbatim in **24 packages** (48 locale files). This is the DRY violation that allowed 15 packages to ship without the text at all.

### 2.8 No test coverage exists for PDF template markup

`find libs/list-types -name '*.njk.test.ts'` returns **zero** results. The existing generator unit tests assert only that a `pdfStyles` string was passed to `env.render`, not what the markup contains. Nothing prevents the next new list type from repeating this drift.

There is an established pattern for exactly this class of problem: `libs/list-types/common/src/validation/guard.test.ts` walks every sibling package directory and fails CI when a package ships a schema without a validator. A second guard test of the same shape is the correct mechanism here (see §13).

### 2.9 Related project convention

Per `CLAUDE.md`, all list-type routing and registration must key on the stable `listTypeName` string, never the autoincrement `ListType.id`. This work touches templates and stylesheets only — no new registry keys or ID comparisons are introduced, so that constraint is satisfied by construction.

---

(Full acceptance criteria, wireframes, page specs, content, URL, validation, error messages, navigation, accessibility, test scenarios, and assumptions/open questions sections are recorded in the full spec comment on GitHub issue #845 — truncated here for brevity. See https://github.com/hmcts/cath-service/issues/845#issuecomment-5355835443 for the complete specification.)

### Comment by OgechiOkelu on 2026-08-20T12:27:40Z
@plan

### Comment by hmctsclaudecode on 2026-08-20T12:37:12Z

## Plan ready — `docs/tickets/845/`

Branch: [`feature/845-pdf-restriction-grey-caution`](https://github.com/hmcts/cath-service/tree/feature/845-pdf-restriction-grey-caution)

I re-verified the `@spec` audit against the working tree. It holds up on the three defects, and **four of its claims are wrong** — details in `plan.md` §0. The one that matters:

> **The Welsh caution text is not uniform.** The spec says the approved Welsh exists verbatim in 24 files. It doesn't — there are **six distinct Welsh variants**, and **three packages ship untranslated English in `cy.ts`** today. So "de-duplicate the caution text" is not a pure refactor: it **changes the Welsh currently rendered by 12 of the 24 packages**.

Also worth flagging: the Welsh `cautionReporting` quoted in the spec renders HMCTS as **"GLlTEM"**. No file in the repo uses that; the repo uses **"GLlTEF"**. Don't copy the Welsh out of the spec comment.

Two other corrections: there are **40 templates across 39 packages** (`utiac-jr-daily-hearing-list` ships a second `pdf-template-london.njk`, so the guard test must glob `src/pdf/*.njk`, not the fixed filename), and `sjp-press-list` / `sjp-public-list` keep their locales at `src/<pkg>/{en,cy}.ts` with the caution keys nested under `common`.

Confirmed correct, since they're the first things a reviewer will doubt: Puppeteer is **not** the cause (`printBackground: true` is already set), and a shared Nunjucks partial is **not** viable (`configureNunjucks` takes a single directory and each package copies only its own templates).

### What's actually broken

| | Defect | Scale |
|---|---|---|
| A | `.restriction-row td` is declared only in `PDF_CIVIL_FAMILY_STYLES`, at cream `#fff7e6` — and only 8 sites compose that string | 5 templates cream, 4 with no restriction class at all → white |
| B | `.warning-row` / `.warning-icon` / `.warning-text` are referenced by 7 templates and defined in **no** stylesheet — the `!` renders as a bare exclamation mark | 7 templates |
| C | No `caution-box` in the footer | 15 of 40 templates |
| D | Three different locale access paths for the same key | `t.cautionNote`, `t.common.cautionNote`, bare `common.cautionNote` |

The top-of-document restriction panel is `.info-box`, which is **already** `#f3f2f1` in all 7 templates that have one — only the icon inside it is broken. Hence Q2 below.

Root cause for all four: no shared partial or single style contract, so 40 hand-written templates drifted. There is currently **zero** test coverage of PDF template markup (`find libs/list-types -name '*.njk.test.ts'` → 0 results), which is why a CI guard test modelled on `validation/guard.test.ts` is the durable part of this fix.

### Clarifications

**Q1 — Which Welsh caution wording is approved?** *(Blocks the Welsh consolidation only.)* Six variants exist. Recommendation: adopt **Variant A**, the 12-package plurality (`cop-daily-cause-list/src/locales/cy.ts`), which also fixes the 3 untranslated packages. Needs a Welsh content reviewer. Everything else ships independently — if this is still open, we ship the English shared export and leave each package's existing Welsh in place rather than blocking the visible fix.

**Q2 — Which grey did you actually observe as missing, @junaidiqbalmoj?** The per-case restriction rows (cream or white), or the top-of-document panel (already grey)? The plan fixes both so the ambiguity is covered either way, but confirming would validate the assumption that `#f3f2f1` (`govuk-colour("light-grey")`) is the intended grey.

**Q3 — Was cream `#fff7e6` deliberate?** *(Non-blocking — proceeding with grey unless contradicted.)* If restrictions were intentionally given a warmer fill to set them apart from the grey `.info-box` and table headers, standardising removes that distinction. The counter-argument is strong: it matches no GOV.UK token, appears in exactly one rule, and the on-screen views of the same data already use `#f3f2f1`.

**Q4 — Separate ticket for the 3 packages rendering English in their Welsh PDFs?** `ftt-lands-registration-tribunal-weekly-hearing-list`, `ftt-tax-chamber-weekly-hearing-list`, `siac-poac-paac-weekly-hearing-list`. A live Welsh-language defect independent of this issue that the consolidation fixes as a side effect. Raising it so the fix isn't silently absorbed.

**Q5 — Backfill already-published PDFs?** PDFs are written to blob storage at publication time, so artefacts published before this ships keep the old rendering. Recommendation: **no backfill** — daily lists turn over naturally. Needs a product call if long-lived lists (weekly, fortnightly, warned) are considered material.

**Q6 — Does any list type deliberately omit the caution message for a legal reason?** The plan assumes all 15 omissions are oversight (they span crime, civil, family and tribunals with no pattern). Worth a confirmation from the publishing team, because the guard test makes the caution box **mandatory for every future list type**.

**Q7 — Normalise `magistrates-public-list`'s two-cell restriction layout?** It's the only template using a 2 + 3 split with a joined border. Currently treated as out of scope — kept as-is.

**Q8 — Turn on `throwOnUndefined` for PDF Nunjucks?** Would permanently kill the silent-empty-box failure mode (an unresolvable `t.cautionNote` renders an empty grey box with no error — exactly how the three access paths survived undetected), but the 40 templates reference many legitimately-optional court fields, so enabling it now breaks sparse data. Proposed as separate work; the guard test is the interim mitigation.

**Q9 — Tag the PDFs for accessibility?** Puppeteer emits no `/StructTreeRoot` and no `/Lang`, so all 40 PDFs are untagged and the Welsh ones don't declare their language. A real WCAG gap affecting every list type, predating this issue. Needs its own ticket. Flagged, not fixed.

---

Only **Q1** gates any work, and only the Welsh half. Q2 would be useful confirmation; the rest are recommendations that need a nod rather than a decision.

Next: `/qk-implement 845`

🤖 Generated with [Claude Code](https://claude.com/claude-code)

---

**IMPORTANT CONTEXT FOR RE-PLANNING:** A prior plan.md/tasks.md was already drafted and committed to branch `feature/845-pdf-restriction-grey-caution` (commit `b265fb5a`, dated 2026-08-20). Since then, 18 commits have touched `libs/list-types`, `libs/publication`, and `libs/pdf-generation` on `master`. The prior plan's audit (exact line numbers, package list, class names) must be **re-verified against current `master`**, not assumed to still be accurate. Treat the prior plan as a strong starting hypothesis, not a source of truth.
