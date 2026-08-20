# Technical Plan — Issue #845

**Title:** Check PDF reporting restriction grey background for all list types, and check the caution message

**Type:** Presentation-consistency defect across the PDF generation layer. No new feature, no new page, no new route, no schema change.

---

## 0. Verification note — corrections to the spec comment

The `@spec` comment on the issue is largely accurate and its audit was re-verified against the working tree at `3c7178c`. Four claims were wrong or incomplete and this plan supersedes the spec on those points.

| Spec claim | Verified reality | Impact on the plan |
|---|---|---|
| "40 PDF templates" | **40 templates across 39 packages.** `utiac-jr-daily-hearing-list` ships two: `pdf-template.njk` **and** `pdf-template-london.njk`. The 5 `*-common` packages ship none. | The guard test must glob `src/pdf/*.njk`, **not** `src/pdf/pdf-template.njk`. Globbing the fixed filename silently skips the London variant. |
| "The identical English and Welsh caution strings are duplicated verbatim in 24 packages" | **English is uniform (24/24). Welsh is not.** There are **six distinct Welsh variants** of `cautionNote` and `cautionReporting`, including **3 packages that ship untranslated English in `cy.ts`**. See §1.3. | Consolidating to one shared Welsh string **changes the rendered Welsh output of 12 of the 24 packages**. This is a content change, not a refactor. It needs Welsh content sign-off — see CLARIFICATIONS NEEDED Q1. It is the one part of this ticket that is genuinely blocked on a decision. |
| The Welsh text quoted in spec §7.2 | The spec's `cautionReporting` Welsh renders HMCTS as **"GLlTEM"**. No file in the repo uses GLlTEM; the repo uses **"GLlTEF"** (the correct Welsh abbreviation). The spec's `cautionNote` Welsh does match the repo plurality variant. | **Do not copy the Welsh from the spec comment.** Copy it from the repo (§1.3, Variant A) — as the spec's own implementation note instructs, contradicting its own quoted text. |
| Locale files live at `src/locales/{en,cy}.ts` | True for 37 packages. **`sjp-press-list` and `sjp-public-list` keep theirs at `src/<package-name>/{en,cy}.ts`, with the caution keys nested under a `common` object**, reached because their generator passes `t = translations.common`. | The shared-caution refactor and the guard test's locale-key check must both resolve the locale file by search, not by a hardcoded `src/locales/` path. |

Two spec claims were confirmed correct and are worth restating because they are the first things a reviewer will doubt:

- **Puppeteer is not the cause.** `printBackground: true` is already set at `libs/pdf-generation/src/generator.ts:12`. Backgrounds render; the CSS is missing.
- **A shared Nunjucks partial is not viable.** `configureNunjucks(templateDir)` (`libs/list-types/common/src/pdf/pdf-utilities.ts:25`) takes a single directory, and each package's `build:pdf-templates` copies only its own `src/pdf/*.njk`. A cross-package `{% include %}` resolves in dev and fails in production. Share content via a locale export and styling via `pdf-styles.ts`; keep the 6-line markup block duplicated and let the guard test prevent drift.

---

## 1. The verified audit

### 1.1 Defect A — restriction background is wrong or absent (9 templates)

`.restriction-row td` is declared **only** in `PDF_CIVIL_FAMILY_STYLES` (`libs/list-types/common/src/pdf/pdf-styles.ts:101`) as `background-color: #fff7e6; font-style: italic;`. That string is composed by 8 sites, so 31 of 40 templates cannot use the class at all.

| Template | Markup | Class | Renders as |
|---|---|---|---|
| `civil-and-family-daily-cause-list:117` | `<tr>` + `<td colspan="9">` | `restriction-row` | cream `#fff7e6` |
| `civil-daily-cause-list:99` | `<tr>` + `<td colspan="7">` | `restriction-row` | cream (styles reach it via `daily-cause-list-common`) |
| `family-daily-cause-list:103` | `<tr>` + `<td colspan="9">` | `restriction-row` | cream (via `daily-cause-list-common`) |
| `crown-daily-list:122` | `<tr>` + `<td colspan="{% if session.hasListingNotes %}6{% else %}5{% endif %}">` | `restriction-row` | cream |
| `crown-firm-list:118` | `<tr>` + `<td colspan="7">` | `restriction-row` | cream |
| `cop-daily-cause-list:93–97` | `<tr>` + `<td colspan="7">` | **none** | white |
| `magistrates-public-list:123–128` | `<tr>` + `<td colspan="2" style="border-right: none;">` + `<td colspan="3" style="border-left: none;">` | **none** | white |
| `magistrates-standard-list:125–127` and `:156` | `<p><span class="label">…</span>…</p>` | **none** | white |
| `sjp-press-list:46–48` | `<p class="restriction-tag">` | `restriction-tag` (red `#d4351c` text, no fill) | white |

`#fff7e6` appears in exactly one place repo-wide (`pdf-styles.ts:102`) and matches no GOV.UK token. The on-screen equivalent is `.restriction-list-section { background-color: #f3f2f1; padding: 20px; }` — so `#f3f2f1` (`govuk-colour("light-grey")`) is the target.

### 1.2 Defect B — three warning classes referenced by 7 templates and defined nowhere

`.warning-row`, `.warning-icon`, `.warning-text` are referenced by `crown-daily-list`, `crown-firm-list`, `crown-warned-list`, `magistrates-standard-list`, `magistrates-public-list`, `magistrates-adult-court-list`, `magistrates-public-adult-court-list`. A repo-wide search finds them in **no** `.ts` or `.scss` file. The `!` renders as a bare unstyled exclamation mark on its own line.

The enclosing panel is `<div class="info-box">` in all seven, and `.info-box` is already `#f3f2f1`. **The top-of-document panel is not broken** — only the icon inside it is.

### 1.3 Defect C — caution box missing from 15 of 40 templates

Verified by counting `caution-box` occurrences in every `src/pdf/*.njk`: 25 have exactly one, 15 have none, none has more than one.

Missing (all 15 have a single `<div class="footer">` with a `{% if dataSource %}` block, so the insertion point is uniform):

`ast-daily-hearing-list`, `cic-weekly-hearing-list`, `civil-daily-cause-list`, `crown-daily-list`, `crown-firm-list`, `crown-warned-list`, `et-daily-list`, `et-fortnightly-list`, `family-daily-cause-list`, `magistrates-adult-court-list`, `magistrates-public-adult-court-list`, `magistrates-public-list`, `magistrates-standard-list`, `send-daily-hearing-list`, `sscs-daily-hearing-list`.

None of the 15 defines `cautionNote` or `cautionReporting` in its locale files, so both the markup and the content must be supplied.

### 1.4 Defect D — Welsh caution text has six variants, three of them untranslated English

English `cautionNote` / `cautionReporting` are byte-identical across all 24 packages that define them. Welsh is not:

| Variant | Distinguishing wording | Packages |
|---|---|---|
| **A** (plurality, 12) | "Noder bod … yn Neddf Gwarchod Data 2018, a elwid gynt … / … Bydd **GLlTEF** yn rhoi'r gorau …" | `care-standards-tribunal-weekly-hearing-list`, `civil-and-family-daily-cause-list`, `cop-daily-cause-list`, `ftt-rpt-weekly-hearing-list`, `grc-weekly-hearing-list`, `pht-weekly-hearing-list`, `upper-tribunal-administrative-appeals-chamber-daily-hearing-list`, `upper-tribunal-lands-chamber-daily-hearing-list`, `upper-tribunal-tax-and-chancery-chamber-daily-hearing-list`, `utiac-jr-daily-hearing-list`, `utiac-statutory-appeal-daily-hearing-list`, `wpafcc-weekly-hearing-list` |
| **A′** (2 of the 12 above) | Variant A but with typographic apostrophes (`’`) instead of `'` | 2 of the above set |
| **C** (1) | "Sylwer bod … gan Ddeddf Diogelu Data 2018, a elwid gynt …" | `iac-daily-list` |
| **D** (6) | "Sylwer bod … a elwir yn ffurfiol yn Ddata Personol Sensitif, a dylid ei **thrin** …" | `administrative-court-daily-cause-list`, `companies-winding-up-chd-daily-cause-list`, `court-of-appeal-civil-daily-cause-list`, `financial-list-chd-kb-daily-cause-list`, `london-administrative-court-daily-cause-list`, `rcj-standard-daily-cause-list` |
| **E — untranslated English (3)** | `cy.ts` contains the English string verbatim | `ftt-lands-registration-tribunal-weekly-hearing-list`, `ftt-tax-chamber-weekly-hearing-list`, `siac-poac-paac-weekly-hearing-list` |
| **F** (2) | "Noder bod … gan Ddeddf Di… / … cynorthwyo adrodd cywir …" | `sjp-press-list`, `sjp-public-list` |

Variant E is a live Welsh-language defect on three PDFs today, independent of this ticket, and CLAUDE.md forbids skipping Welsh translations. Consolidating fixes it. But consolidating also **rewords the Welsh already in production for 9 other packages** (C, D, F). That is the decision in Q1.

### 1.5 Defect E — three locale access paths for the same key

| Path | Templates | Why |
|---|---|---|
| `t.cautionNote` | 22 | flat locale root |
| `t.common.cautionNote` | 2 — `administrative-court-daily-cause-list:62`, `rcj-standard-daily-cause-list:145` | locale is wholly nested under `common` |
| `common.cautionNote` | 1 — `iac-daily-list:77` | works only because its generator injects `common: translations.common` at `pdf-generator.ts:56` |

Note `sjp-press-list` / `sjp-public-list` use `t.cautionNote` in the template but their generator sets `t = translations.common`, so the key is nested in the locale file while the template path is flat. Any locale-key guard must account for this.

### 1.6 No PDF template test coverage exists

`find libs/list-types -name '*.njk.test.ts'` → **0 results**. Generator unit tests assert only that a `pdfStyles` string was passed to `env.render`, never what the markup contains. Nothing stops the next list type repeating all of the above. `libs/list-types/common/src/validation/guard.test.ts` is the established mechanism for exactly this class of problem and is the model to copy.

---

## 2. Technical Approach

Three layers, in dependency order. Layer 1 fixes the majority of the visual defect with a single-file change; layers 2–3 handle what CSS cannot reach.

**Layer 1 — one stylesheet is the single source of truth.** Move `.restriction-row td` out of `PDF_CIVIL_FAMILY_STYLES` into `PDF_BASE_STYLES`, recolour it to `#f3f2f1`, and add the missing `.restriction-block`, `.warning-*` and `.visually-hidden` rules. Every generator already composes `PDF_BASE_STYLES`, so 5 of the 9 restriction templates and all 7 warning-icon templates are fixed with **zero template edits**.

**Layer 2 — bring the outlier markup onto the shared classes.** Four templates need markup changes because they carry no restriction class (`cop-daily-cause-list`, `magistrates-public-list`) or are not table rows (`magistrates-standard-list`, `sjp-press-list`).

**Layer 3 — content: declare the caution text once, add the box to 15 templates.** Add a shared `caution` export to `libs/list-types/common/src/locales/`, spread it into every consuming package's locale object, and insert the 6-line `caution-box` block into the 15 footers.

**Then: a CI guard test.** With 40 templates, per-template assertions do not scale and will not stop regression. The guard test walking `libs/list-types/*/src/pdf/*.njk` is the durable part of this ticket; per-generator tests cover one representative of each of the three rendering shapes.

### 2.1 Sequencing and independence

Layers 1, 2 and the markup half of layer 3 are unblocked and should be delivered first. **Only the Welsh consolidation depends on Q1.** If Q1 is unanswered when the rest is ready, ship the English shared export plus per-package Welsh preserved as-is (each package keeps its existing `cy` string, spreading only the English), and follow up with the Welsh consolidation. That keeps the whole visible fix shipping without waiting on a content decision, and it is why the tasks list separates the two.

### 2.2 Explicitly out of scope

- No backfill of already-published PDFs (see Q4). PDFs are written to blob storage at publication time (`generatePublicationPdf`, `libs/publication/src/processing/service.ts:418`); daily lists turn over naturally.
- No shared `.njk` partial (§0).
- No `throwOnUndefined: true` on `configureNunjucks` (see Q5).
- No unification of the Crown vs magistrates restriction-panel key families — the guidance differs in substance, not wording.
- No PDF tagging / `/Lang` work (see Q6).
- No change to `PDF_GENERATOR_REGISTRY`, Prisma schema, `list-type-data.ts`, or any route. No numeric `listTypeId` is introduced anywhere — this work touches templates, stylesheets and locale files only, so the CLAUDE.md `listTypeName` rule is satisfied by construction.

---

## 3. Implementation Details

**TEMPLATE SOURCE: n/a**

(No new rendered page or list-type view is created. This ticket edits existing PDF `.njk` templates in place. The `migrate-pip-pages` skill does not apply.)

### 3.1 File structure

All changes are inside existing `libs/` packages. No new package, no `apps/` change. This is business logic and shared presentation, so it belongs in `libs/` per CLAUDE.md.

```
libs/list-types/common/src/
├── pdf/
│   ├── pdf-styles.ts          # MODIFY — the single source of truth for PDF colour
│   ├── pdf-styles.test.ts     # NEW    — assert the style contract
│   └── guard.test.ts          # NEW    — CI guard over all 40 templates
├── locales/
│   ├── en.ts                  # MODIFY — add shared `caution`
│   └── cy.ts                  # MODIFY — add shared `caution`
└── index.ts                   # MODIFY — export cautionEn / cautionCy

libs/list-types/<39 packages>/src/
├── locales/{en,cy}.ts         # MODIFY — spread shared caution (37 packages)
│                              #          sjp-* are at src/<pkg>/{en,cy}.ts instead
└── pdf/*.njk                  # MODIFY — 15 gain caution-box; 9 restriction changes
```

### 3.2 `libs/list-types/common/src/pdf/pdf-styles.ts`

Per CLAUDE.md module ordering, these are appended to the existing `PDF_BASE_STYLES` template literal, after `.caution-box`.

Move the restriction rule out of `PDF_CIVIL_FAMILY_STYLES` and into `PDF_BASE_STYLES`, recoloured. Rationale: only 8 sites compose `PDF_CIVIL_FAMILY_STYLES`, which is precisely what lets a template use `restriction-row` and silently get no background. `PDF_CIVIL_FAMILY_STYLES` retains only `.court-section`, `.court-room-section`, `.section-heading`.

```css
/* PDF_BASE_STYLES — reporting restriction, table-row form */
.restriction-row td {
  background-color: #f3f2f1;
}
.restriction-row .no-side-border-right { border-right: none; }
.restriction-row .no-side-border-left  { border-left: none; }

/* reporting restriction, non-table form */
.restriction-block {
  background-color: #f3f2f1;
  padding: 10px;
  margin: 5px 0 10px 0;
  page-break-inside: avoid;
}
.restriction-block p { margin-bottom: 0; }
.restriction-label { font-weight: 700; }

/* GOV.UK warning-text equivalent for print */
.warning-row { display: flex; align-items: center; margin-bottom: 15px; }
.warning-icon {
  flex-shrink: 0;
  width: 26px; height: 26px;
  margin-right: 10px;
  border: 2px solid #0b0c0c;
  border-radius: 50%;
  background-color: #0b0c0c;
  color: #ffffff;
  font-weight: 700; font-size: 20px; line-height: 24px;
  text-align: center;
}
.warning-text { font-weight: 700; }

.visually-hidden {
  position: absolute;
  width: 1px; height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}
```

Also add `page-break-inside: avoid` to the existing `.caution-box` and `.info-box` rules so neither splits across a page.

**Drop `font-style: italic`.** GOV.UK content style discourages italics — they reduce legibility, particularly for dyslexic readers. Emphasis is already carried by the bold label and the grey fill.

Two ordering hazards to check when moving the rule:

1. `sjp-press-list` composes `PDF_BASE_STYLES + SJP_PRESS_LIST_PDF_STYLES`, and its `.restriction-tag { font-weight: 700; color: #d4351c; }` (`libs/list-types/sjp-press-list/src/pdf/pdf-styles.ts:38`) must keep winning on colour. It sets no `background-color`, so there is no conflict — but assert it.
2. After the move, `PDF_BASE_STYLES + PDF_CIVIL_FAMILY_STYLES` must contain **exactly one** `.restriction-row` declaration. Two would make the effective colour cascade-order dependent. This is an explicit assertion in `pdf-styles.test.ts`.

### 3.3 Shared caution content

`libs/list-types/common/src/locales/en.ts` and `cy.ts` currently export only `provenanceLabels`. Add a sibling `caution` object following the same pattern:

```typescript
// libs/list-types/common/src/locales/en.ts
export const caution = {
  cautionNote: "Note this document contains Special Category Data …",
  cautionReporting: "This document contains information intended to assist …"
};
```

Export from `libs/list-types/common/src/index.ts`, mirroring the existing `provenanceLabels` lines:

```typescript
export { caution as cautionCy } from "./locales/cy.js";
export { caution as cautionEn } from "./locales/en.js";
```

**English:** copy verbatim from `libs/list-types/rcj-standard-daily-cause-list/src/locales/en.ts:133–136`. Identical in all 24 packages, so this is a pure de-duplication.

**Welsh:** copy verbatim from `libs/list-types/rcj-standard-daily-cause-list/src/locales/cy.ts:133–136`?  **No** — that is Variant D (6 packages). Use **Variant A** (12 packages, the plurality), taken verbatim from `libs/list-types/cop-daily-cause-list/src/locales/cy.ts`, normalising to straight apostrophes to match the repo majority. **Do not use the Welsh quoted in the spec comment** — its `cautionReporting` says "GLlTEM", which appears nowhere in the repo; the correct abbreviation is "GLlTEF". Pending Q1.

Then in each consuming package:

```typescript
// libs/list-types/crown-daily-list/src/locales/en.ts
import { cautionEn } from "@hmcts/list-types-common";

export const en = {
  title: "Crown Daily List",
  // … existing keys unchanged …
  ...cautionEn
};
```

- 15 packages gain the spread (new keys).
- 22 packages replace their two hardcoded literals with the spread.
- `administrative-court-daily-cause-list` and `rcj-standard-daily-cause-list` spread into their `common` sub-object, since their whole locale is nested there.
- `sjp-press-list` / `sjp-public-list` spread into their `common` sub-object in `src/<pkg>/{en,cy}.ts`.

Check for an import cycle before spreading: `@hmcts/list-types-common` must not import from any leaf list-type package. It does not today (its `index.ts` exports only its own modules), so the direction is safe.

### 3.4 Locale access path

Normalise to `t.cautionNote` for the 37 flat packages. For the 3 nested ones:

- `administrative-court-daily-cause-list`, `rcj-standard-daily-cause-list` — keep the template at `t.common.cautionNote`. Flattening these locales is a larger refactor and out of scope. Record them in the guard's allowlist rather than pretending they conform.
- `iac-daily-list` — change the template from bare `common.cautionNote` to `t.common.cautionNote`. **Leave the `common: translations.common` context injection at `pdf-generator.ts:56` in place** — its template also uses `common.dataSource` at line 74, so removing the injection would break that. See Q7.

Net: two paths, each determined by whether the package's locale is flat or nested — a verifiable property, rather than three arbitrary conventions.

### 3.5 Caution box markup — the 15 templates

Insert as the last child of the existing `<div class="footer">`, byte-for-byte identical to the block already in the other 25 (reference: `libs/list-types/cop-daily-cause-list/src/pdf/pdf-template.njk:109–117`):

```njk
  <div class="footer">
    {% if dataSource %}
    <p>{{ t.dataSource }}: {{ dataSource }}</p>
    {% endif %}
    <div class="caution-box">
      <p>{{ t.cautionNote }}</p>
      <p>{{ t.cautionReporting }}</p>
    </div>
  </div>
```

**Critical:** the block goes **inside** `.footer` but **outside** `{% if dataSource %}`. Putting it inside the conditional reintroduces the bug for manually-uploaded publications that carry no provenance label.

### 3.6 Restriction markup — per file

| File | Change |
|---|---|
| `cop-daily-cause-list/src/pdf/pdf-template.njk:94` | add `class="restriction-row"` to the `<tr>`; `<strong>` → `<span class="restriction-label">` |
| `magistrates-public-list/src/pdf/pdf-template.njk:124–126` | add `class="restriction-row"` to the `<tr>`; replace `style="border-right: none;"` → `class="no-side-border-right"` and `style="border-left: none;"` → `class="no-side-border-left"`; `<strong>` → `restriction-label`. Keep the 2 + 3 two-cell split (see Q3) |
| `magistrates-standard-list/src/pdf/pdf-template.njk:125–127` | wrap the hearing-level restriction `<p>` in `<div class="restriction-block">`; `<span class="label">` → `<span class="restriction-label">` |
| `magistrates-standard-list/src/pdf/pdf-template.njk:156` | same for the offence-level restriction |
| `sjp-press-list/src/pdf/pdf-template.njk:46–48` | wrap `<p class="restriction-tag">` in `<div class="restriction-block">`; keep `.restriction-tag`'s `#d4351c` |
| `civil-daily-cause-list:99`, `civil-and-family-daily-cause-list:117`, `crown-daily-list:122`, `crown-firm-list:118`, `family-daily-cause-list:103` | no structural change — grey arrives from §3.2. `<strong>` → `<span class="restriction-label">` for uniformity |

Prefer `restriction-label` over ad-hoc `<strong>` so weight is controlled by the stylesheet, not by tag choice — and so the guard test can assert it mechanically.

### 3.7 Warning icon — CSS only, plus one new key

The seven templates already emit correct `.warning-row` > `.warning-icon` + `.warning-text` markup; §3.2's CSS fixes all seven with no markup change. The `aria-hidden="true"` already on the glyph stays.

One genuinely new key is needed — a visually-hidden "Warning" label, matching what the on-screen GOV.UK component does (`apps/web/src/pages/(list-types)/crown-daily-cause-list/crown-daily-cause-list.njk:67`):

| Key | English | Welsh |
|---|---|---|
| `warningAssistiveText` | Warning | Rhybudd |

Because the seven packages split across two unrelated key families, add this to a shared `pdfCommon` object in `libs/list-types/common/src/locales/` alongside `caution`, not to seven packages individually. Rendered as `<span class="visually-hidden">{{ t.warningAssistiveText }}</span>` inside `.warning-text`.

"Rhybudd" is the standard Welsh for "Warning" and is used by GOV.UK Frontend's own Welsh content; confirm with the Welsh content reviewer rather than emitting a `[WELSH TRANSLATION REQUIRED: …]` placeholder.

### 3.8 API endpoints

**None.** No new or changed routes. `/hearing-lists/:locationId/:artefactId` already streams the stored blob with `Content-Type: application/pdf`; the blob key stays `<artefactId>.pdf` in the `PUBLICATIONS` container, so no cache keys, links, or subscription-email references change.

Note for testers: a PDF's language is fixed at generation time by the `locale` option, not by the request. `?lng=cy` switches the surrounding page, **not** an already-generated PDF. Verifying the Welsh caution box means generating with `locale: "cy"`.

### 3.9 Database schema changes

**None.**

---

## 4. Error Handling & Edge Cases

### 4.1 Conditional rendering rules

| Block | Condition | When false |
|---|---|---|
| Per-case restriction row | `case.formattedReportingRestriction | length`, or `hearing.reportingRestriction` / `offence.reportingRestriction` truthy | row not emitted at all — **never emit an empty grey row** |
| Top-of-document panel (`.info-box`) | always, in the 7 templates that have one | n/a |
| Caution box | **always, unconditionally, in all 40** | n/a — must never be conditional |
| `dataSource` line | `dataSource` truthy | line omitted; caution box still renders |

### 4.2 The real hazard: silent empty box

Nunjucks here runs with `autoescape: true` and **no** `throwOnUndefined` (`pdf-utilities.ts:25–29`). An unresolvable `t.cautionNote` renders as an empty string — no exception, no log, no failing test. The result is an **empty grey box**. This is exactly how three divergent access paths survived undetected.

Mitigations, in order of reliability:

1. The guard test asserts that every template referencing `cautionNote` belongs to a package whose locale files actually define the key — resolving the locale file by search (`src/locales/{en,cy}.ts` **or** `src/<pkg>/{en,cy}.ts`) and matching the key anywhere in the file, since `sjp-*` nest it under `common`.
2. Generator tests assert the rendered HTML contains the caution **text**, not merely the `caution-box` element. An empty box fails.
3. `throwOnUndefined` stays off — see Q5.

### 4.3 Colspan correctness

A wrong colspan produces grey that stops short of the table edge — visually worse than no fill. Preserve current values exactly:

| Template | Colspan |
|---|---|
| `civil-and-family-daily-cause-list`, `family-daily-cause-list` | 9 |
| `civil-daily-cause-list`, `crown-firm-list`, `cop-daily-cause-list` | 7 |
| `crown-daily-list` | `{% if session.hasListingNotes %}6{% else %}5{% endif %}` — **assert both branches** |
| `magistrates-public-list` | 2 + 3 across two cells with a joined border — preserve; swap inline styles for classes only |

### 4.4 Other edge cases

| Case | Required behaviour |
|---|---|
| Publication with no `dataSource` (manual upload) | caution box still renders |
| Restriction detail text absent but flag true (`magistrates-standard-list`, `sjp-press-list` use a boolean flag plus a separate detail field) | label renders with no detail; must not produce a stray empty grey block. Check each flag/detail pair when wrapping |
| Welsh generation | caution box in Welsh; no English string anywhere in the document |
| Existing published artefacts | keep their old rendering; not regenerated (Q4) |
| PDF size | added markup ≈ 700 bytes text + a few hundred bytes CSS against a 2 MB `MAX_PDF_SIZE_BYTES` ceiling. Background fills grow the compressed page stream slightly. Confirm no previously-compliant list crosses the threshold |
| Monochrome printing | `#f3f2f1` greys out to near-white. The visible text label and adjacency to the case row must carry the meaning on their own — never remove a text label in favour of the fill |
| `utiac-jr-daily-hearing-list` | has **two** templates; both must satisfy the guard |

### 4.5 Regression risk

`pdf-styles.ts` is composed by every generator, so a malformed selector breaks all 40 PDFs at once rather than one. Run the full `yarn test` across all 43 list-type packages, not just the touched ones. The blast radius is wide but the failure mode is loud — the opposite of the silent-empty-box risk above.

---

## 5. Acceptance Criteria Mapping

| Acceptance criterion (issue + spec §3) | How it is satisfied | How it is verified |
|---|---|---|
| Restriction row grey, not cream, in table lists | `.restriction-row td` moved to `PDF_BASE_STYLES` at `#f3f2f1`; italic dropped (§3.2) | `pdf-styles.test.ts` asserts literal `#f3f2f1` and that `#fff7e6` appears in no exported style string |
| Grey applied in **all nine** restriction templates | 5 inherit automatically; 4 gain a shared class (§3.6) | guard test: every restriction block uses `restriction-row` or `restriction-block`; no unclassed restriction markup |
| Unclassed rows brought onto the shared class; no inline styles left | `cop-daily-cause-list` and `magistrates-public-list` per §3.6 | guard test: no `style=` attribute on restriction markup |
| Non-table restrictions get grey | `.restriction-block` wraps `magistrates-standard-list` (×2) and `sjp-press-list` (§3.6) | generator test on `sjp-press-list`: `.restriction-block` present and `#d4351c` label retained |
| Warning icon renders as the GOV.UK icon | `.warning-row` / `.warning-icon` / `.warning-text` defined (§3.2) — CSS only, 7 templates fixed with no markup change | `pdf-styles.test.ts` asserts all three resolve; manual visual check per §6.5 |
| Caution message at the end of **every** PDF | 6-line block added to 15 footers (§3.5) | **guard test counts exactly one `caution-box` per `src/pdf/*.njk`** — this is the mechanical proof the issue is fixed, and it fails today for 15 packages |
| Caution message in Welsh | shared Welsh `caution` export (§3.3), spread into every `cy` object | generator test rendering with `locale: "cy"` asserts Welsh text and absence of the English string |
| Caution text declared once and shared | shared `caution` export; all 24 duplicating packages replaced by the spread (§3.3) | test that no `cy.ts`/`en.ts` in `libs/list-types/*` contains the literal caution string outside `common` |
| Locale access path uniform | 37 × `t.cautionNote`, 3 × `t.common.cautionNote`; bare `common.cautionNote` eliminated (§3.4) | guard test rejects the bare `common.cautionNote` form; allowlists the 2 legitimately-nested packages |
| CI blocks a new list type that omits the caution box | new `libs/list-types/common/src/pdf/guard.test.ts`, modelled on `validation/guard.test.ts` | add a temporary fixture template with no caution box, confirm the guard fails and names the package, then remove it |
| CI blocks a template hardcoding its own restriction background | same guard: no `background-color` for restriction/caution markup in any `.njk` | same |
| No regression to the 25 already-correct PDFs | markup untouched in those 25 beyond the `restriction-label` swap | exactly one `caution-box` per template (not two); full `yarn test` green across all 43 packages |
| PDF stays under the size limit | additions are ~1 KB against a 2 MB ceiling | byte-size check on a large fixture per §6.4 |

---

## 6. Testing Strategy

Weight sits deliberately on the guard test. With 40 templates, per-template assertions do not scale and would not stop the next list type reintroducing the defect.

### 6.1 `libs/list-types/common/src/pdf/pdf-styles.test.ts` (new)

- `PDF_BASE_STYLES` defines `.restriction-row td`, `.restriction-block`, `.restriction-label`, `.caution-box`, `.info-box`, `.warning-row`, `.warning-icon`, `.warning-text`, `.visually-hidden`.
- Every restriction and caution rule uses the literal `#f3f2f1` — asserted on the exact hex, so a future palette edit cannot silently drop contrast.
- `#fff7e6` appears in no exported PDF style string.
- `PDF_CIVIL_FAMILY_STYLES` no longer declares `.restriction-row`.
- `PDF_BASE_STYLES + PDF_CIVIL_FAMILY_STYLES` yields exactly one `.restriction-row` declaration.
- `.caution-box`, `.info-box` and `.restriction-block` carry `page-break-inside: avoid`.
- AAA pattern per `.claude/rules/testing.md`.

### 6.2 `libs/list-types/common/src/pdf/guard.test.ts` (new)

Walks every sibling directory under `libs/list-types/`, skipping `common`, globbing **`src/pdf/*.njk`** (so `pdf-template-london.njk` is included). Collects violations into an array asserted `toEqual([])` — the shape used by `validation/guard.test.ts`. Failure messages name the package and the rule broken, e.g.:

```
crown-daily-list: pdf-template.njk has no caution-box block
sscs-daily-hearing-list: template references t.cautionNote but no locale file defines cautionNote
magistrates-public-list: pdf-template.njk has an inline style= on restriction markup
new-list-type: pdf-template.njk declares its own background-color; use the shared restriction-row class
```

Rules:

- exactly one `caution-box` per `src/pdf/*.njk`;
- no `background-color` declaration for restriction or caution markup inside any `.njk`;
- no inline `style=` on restriction markup;
- every restriction block uses `restriction-row` or `restriction-block`;
- every template referencing `cautionNote` belongs to a package whose locale files define it (resolving `src/locales/` **or** `src/<pkg>/`, matching the key anywhere in the file);
- no template uses the bare `common.cautionNote` form;
- packages legitimately nesting under `common` (`administrative-court-daily-cause-list`, `rcj-standard-daily-cause-list`) are in a named, commented allowlist.

### 6.3 Locale tests

- Shared `caution` and `pdfCommon` provide their keys in both `en` and `cy`.
- `Object.keys(en).sort()` equals `Object.keys(cy).sort()` for the shared objects and for each of the 15 newly-touched package locale pairs.
- No `cy.ts` in any touched package contains the English caution string — this is the assertion that catches Variant E and prevents its return.
- No `[WELSH TRANSLATION REQUIRED: …]` placeholder is introduced.

### 6.4 Generator tests — one per rendering shape, not 40

- **Table-row** (`civil-and-family-daily-cause-list`): restricted case emits `tr.restriction-row` immediately after its case row with `colspan="9"`, the bold label, and the court-supplied detail verbatim; unrestricted case emits **no** row (specifically, no empty grey row); an all-unrestricted list contains zero `restriction-row` elements.
- **Conditional colspan** (`crown-daily-list`): `colspan` is 6 with `session.hasListingNotes` true and 5 with it false — asserted both ways.
- **Two-cell** (`magistrates-public-list`): the 2 + 3 layout and joined border are preserved, and both cells take grey from classes rather than inline styles.
- **Block** (`sjp-press-list`): restricted offence renders inside `.restriction-block` with the `#d4351c` tag intact on grey.
- **Caution box**: for each of the 15, rendered HTML contains `.caution-box` holding both caution **texts**; it is the last block inside `.footer`, after `dataSource`; it still renders when `dataSource` is absent; `locale: "cy"` yields Welsh, not English.
- **Warning icon** (the 7): glyph keeps `aria-hidden="true"` and is accompanied by the visually-hidden label.

### 6.5 Regression, size and manual checks

- Full `yarn test` across all 43 list-type packages — `pdf-styles.ts` reaches every generator.
- Byte-size check: no list type previously under 2 MB crosses it.
- Existing E2E coverage of the PDF download journey must pass unchanged. **No new E2E test** — this is not a new user journey, and `.claude/rules/e2e-testing.md` calls for minimum test count.
- Manual visual check on one PDF per rendering shape (table-row, block, two-cell), in English and Welsh: grey spans the full table width with no gap at the right edge; no cream remains; the warning icon is a styled circle not a bare `!`; the caution box sits at the foot of the last page without splitting; a **monochrome print** keeps restrictions identifiable by label and position.

---

## 7. Accessibility

WCAG 2.2 AA applies to PDFs published by a government service. Three of the current defects are genuine failures, not just cosmetic drift.

| Failure | Criterion | Fix |
|---|---|---|
| Warning icon is an unstyled `!` with no accessible name | **1.1.1 Non-text Content (A)** | define `.warning-icon`; keep `aria-hidden="true"` on the glyph; add the visually-hidden "Warning" label (§3.7) |
| Restriction text visually indistinguishable from ordinary case data in 4 templates | **1.3.1 Info and Relationships (A)** | apply `.restriction-row` / `.restriction-block` and keep the bold label so the relationship is structural, not colour-only |
| Restriction status signalled only by fill in some layouts | **1.4.1 Use of Colour (A)** | every restriction block keeps a visible text label; the fill reinforces, never carries, meaning |

Contrast on `#f3f2f1`: `#0b0c0c` body text ≈ 18.6:1 (pass); `#d4351c` (`sjp-press-list` tag) ≈ 4.7:1 (pass, but **marginal — must not be reduced in weight or size**); `#505a5f` ≈ 6.5:1 (pass). The cream `#fff7e6` was never a contrast failure — it is a palette and consistency failure, matching no GOV.UK token and appearing in none of the on-screen views of the same data.

The caution box is standing advisory text: two `<p>` elements in a static block. It must **not** use `role="alert"`, `aria-live`, or the Notification banner pattern, all of which imply a dynamic announcement.

Pre-existing and out of scope: Puppeteer emits no `/StructTreeRoot` (untagged PDFs) and no `/Lang` (Welsh PDFs do not declare their language). Both affect all 40 list types equally and predate this ticket — see Q6.

The authoritative accessible presentation remains the HTML page, which is Axe-tested and already renders restrictions on `#f3f2f1`. This change brings the PDF into visual agreement with it; it does not make the PDF the accessible alternative.

---

## 8. CLARIFICATIONS NEEDED

**Q1 — BLOCKING for the Welsh consolidation only. Which Welsh caution wording is approved?** The spec asserts one approved Welsh string exists verbatim in 24 files. It does not: there are **six variants**, including three packages shipping untranslated English (§1.4). Consolidating to a single shared string necessarily **changes the Welsh currently rendered by 12 of the 24 packages**. Recommendation: adopt **Variant A** (the 12-package plurality, from `cop-daily-cause-list/src/locales/cy.ts`, straight apostrophes), which also fixes the 3 untranslated packages. This needs a Welsh content reviewer to confirm before merge. Everything else in this ticket ships independently — see §2.1 for the fallback that preserves per-package Welsh if Q1 is still open.

**Q2 — Which grey did the reporter actually observe as missing?** The issue says "grey background for reporting restriction section" without naming a colour or a block. There are two candidate blocks: the top-of-document restriction panel (`.info-box`, **already `#f3f2f1` in all 7 templates that have one**) and the per-case restriction rows (cream or white). This plan fixes both, resolving the ambiguity by covering the superset — but confirming which one prompted the ticket would validate the assumption that `#f3f2f1` is the intended grey.

**Q3 — Was cream `#fff7e6` a deliberate design decision?** *(Non-blocking — proceed with grey unless contradicted.)* If restrictions were intentionally given a warmer fill to distinguish them from the grey `.info-box` and table headers, standardising on grey removes that distinction. The counter-argument is strong: `#fff7e6` matches no GOV.UK token, appears in exactly one rule, and the on-screen views of the same data already use `#f3f2f1`. Recommend proceeding and raising it at design review.

**Q4 — Do the 3 packages that currently render *English* in their Welsh PDFs need a separate ticket?** `ftt-lands-registration-tribunal-weekly-hearing-list`, `ftt-tax-chamber-weekly-hearing-list`, `siac-poac-paac-weekly-hearing-list` (§1.4, Variant E). This is a live Welsh-language defect independent of #845 that the consolidation fixes as a side effect. Flagging it so the fix is not silently absorbed and lost from the record.

**Q5 — Do existing published artefacts need backfilling?** PDFs are written to blob storage at publication time, so artefacts published before this ships keep their old rendering. Recommendation: **do not backfill** — hearing lists are daily and turn over naturally, and a backfill script is disproportionate for a cosmetic and minor-accessibility fix. Needs a product decision if any long-lived list types (weekly, fortnightly, warned lists) are considered material.

**Q6 — Do any list types deliberately omit the caution message for a legal reason?** This plan assumes all 15 omissions are oversight: they span crime, civil, family and tribunals with no distinguishing pattern, and 25 of 40 already have the box. But the guard test will make the caution box **mandatory for every future list type**, so a confirmation from the publishing team is worth having before that lands. No contrary evidence was found.

**Q7 — Should `magistrates-public-list`'s two-cell restriction layout be normalised to one full-width cell?** It is the only template using a 2 + 3 split with a joined border. Keeping it preserves what looks like an intentional design and is what this plan does; normalising it would let one class serve every table template and simplify the guard. Treated as out of scope.

**Q8 — Should `configureNunjucks` set `throwOnUndefined: true`?** It would permanently eliminate the silent-empty-box class of bug (§4.2), but the 40 existing templates reference many legitimately-optional court fields, so enabling it now would break generation for sparse data. Proposed as separate work: audit optional field references, add `| default("")` where needed, then enable. The guard test is the interim mitigation.

**Q9 — Should the PDFs be properly tagged for accessibility?** Puppeteer emits no `/StructTreeRoot` and no `/Lang`, so all 40 PDFs are untagged and the Welsh ones do not declare their language (§7). This is a real WCAG gap affecting every list type and predating this issue. It needs its own ticket and probably a post-processing step or a different generation approach. Flagged, not fixed.
