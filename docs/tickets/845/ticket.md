# #845: Check PDF reporting Restriction grey background for all list type and also check caution message

**State:** OPEN
**Assignees:** None
**Author:** junaidiqbalmoj
**Labels:** type:story
**Created:** 2026-07-10T10:26:49Z
**Updated:** 2026-08-20T12:27:41Z

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

## 3. Acceptance Criteria

* **Scenario:** Per-case reporting restriction row has a grey background in a table-based list
    * **Given** a publication of list type `CIVIL_DAILY_CAUSE_LIST` containing a case with a non-empty `formattedReportingRestriction`
    * **When** the PDF is generated and the case's restriction row is rendered
    * **Then** the row's cells have background colour `#f3f2f1` (GOV.UK light grey), not `#fff7e6`, and the restriction text is prefixed with the bold `Reporting restrictions:` label

* **Scenario:** Grey background is applied to every list type that renders a restriction row
    * **Given** any of the nine list types identified in §2.4
    * **When** a PDF is generated for a case carrying a reporting restriction
    * **Then** the restriction block renders on `#f3f2f1` in all nine, using the single shared `restriction-row` (table) or `restriction-block` (non-table) class — no template carries its own background declaration and no template renders the restriction on white

* **Scenario:** Unclassed restriction rows are brought onto the shared class
    * **Given** the templates `cop-daily-cause-list` and `magistrates-public-list`, whose restriction rows currently carry no class
    * **When** their PDFs are generated
    * **Then** each restriction row carries `class="restriction-row"`, renders grey, and the ad-hoc inline `style="border-right: none"` / `style="border-left: none"` attributes in `magistrates-public-list` are replaced by named classes so no inline styles remain in the template

* **Scenario:** Non-table restriction markup also gets the grey treatment
    * **Given** `magistrates-standard-list` (paragraph-based restriction at hearing and offence level) and `sjp-press-list` (restriction tag inside a defendant card)
    * **When** their PDFs are generated for a case with a restriction
    * **Then** the restriction text sits inside a `restriction-block` element with background `#f3f2f1` and padding, and the `sjp-press-list` red `#d4351c` label text is retained inside that grey block

* **Scenario:** GOV.UK warning icon renders correctly inside the restriction panel
    * **Given** any of the seven list types that render `.warning-row` / `.warning-icon` / `.warning-text` inside the top-of-document `.info-box`
    * **When** the PDF is generated
    * **Then** the `!` is rendered as a filled circular black icon with white bold glyph, vertically aligned with bold warning text beside it — visually equivalent to the GOV.UK Warning text component — instead of the current unstyled bare `!` character

* **Scenario:** Caution message appears at the end of every PDF
    * **Given** any of the 40 PDF templates in `libs/list-types/*/src/pdf/`
    * **When** a PDF is generated in English
    * **Then** the final element inside `<div class="footer">` is a `<div class="caution-box">` on `#f3f2f1` containing the Special Category Data note followed by the accurate-reporting note

* **Scenario:** Caution message appears in Welsh
    * **Given** any of the 40 PDF templates
    * **When** a PDF is generated with `locale` = `cy`
    * **Then** the caution box renders the Welsh caution text, and no English fallback string appears anywhere in the document

* **Scenario:** Caution text is defined once and shared
    * **Given** the caution strings are currently duplicated across 24 packages and absent from 15
    * **When** the change is complete
    * **Then** the English and Welsh caution strings are declared exactly once, in `libs/list-types/common/src/locales/en.ts` and `cy.ts`, exported from `libs/list-types/common/src/index.ts`, and every list-type locale file that needs them re-uses that export rather than restating the literal text

* **Scenario:** Locale access path is uniform across templates
    * **Given** the three divergent access paths in §2.7
    * **When** the change is complete
    * **Then** every one of the 40 templates references the caution text through the same path, and `iac-daily-list/src/pdf/pdf-generator.ts` no longer needs to inject a bespoke `common` render-context variable for this purpose

* **Scenario:** CI blocks a new list type that omits the caution box
    * **Given** a developer adds a new package `libs/list-types/new-list/` with a `src/pdf/pdf-template.njk` that has no `caution-box`
    * **When** `yarn test` runs
    * **Then** the guard test in `libs/list-types/common` fails and names `new-list` in the violation list

* **Scenario:** CI blocks a template that hardcodes its own restriction background
    * **Given** a developer adds a `background-color` declaration for a restriction element inside a `pdf-template.njk` or a per-package PDF stylesheet
    * **When** `yarn test` runs
    * **Then** the guard test fails, naming the offending file, so the shared class in `pdf-styles.ts` remains the single source of truth

* **Scenario:** No regression to existing correct PDFs
    * **Given** the 25 templates that already render a caution box correctly
    * **When** their PDFs are regenerated after the change
    * **Then** the caution box still renders exactly one Special Category Data paragraph and one accurate-reporting paragraph — not duplicated — and the existing generator unit tests for all 40 packages still pass

* **Scenario:** PDF stays within the size limit
    * **Given** a large publication that previously generated a PDF close to the 2 MB `MAX_PDF_SIZE_BYTES` ceiling (`libs/list-types/common/src/pdf/pdf-utilities.ts:6`)
    * **When** the caution box and grey backgrounds are added
    * **Then** the generation result's `exceedsMaxSize` flag behaves as before for that publication, and the added markup does not by itself push a previously-compliant list over the limit

---

## 4. User Journey Flow

There is no new user-facing journey. The change alters the artefact produced inside the existing publication pipeline, which the reader then downloads.

### 4.1 Generation flow (where the change takes effect)

```
   Court system / manual upload
              │
              ▼
   ┌──────────────────────────────────┐
   │ processPublication()             │  libs/publication/src/processing/service.ts:588
   └──────────────┬───────────────────┘
                  ▼
   ┌──────────────────────────────────┐
   │ generatePublicationPdf()         │  service.ts:418
   │ lookup PDF_GENERATOR_REGISTRY    │  service.ts:148  (keyed on listTypeName)
   └──────────────┬───────────────────┘
                  ▼
   ┌──────────────────────────────────┐
   │ <list-type>/src/pdf/             │
   │   pdf-generator.ts               │
   │                                  │
   │  loadTranslations(locale)  ──────┼──►  en.ts / cy.ts
   │                                  │      + shared caution strings   ◄── CHANGE
   │                                  │        from @hmcts/list-types-common
   │  configureNunjucks(templateDir)  │
   │  env.render("pdf-template.njk",  │
   │    { …, pdfStyles })  ───────────┼──►  PDF_BASE_STYLES               ◄── CHANGE
   │                                  │      (.restriction-row grey,
   │                                  │       .restriction-block,
   │                                  │       .warning-row/-icon/-text)
   └──────────────┬───────────────────┘
                  ▼
   ┌──────────────────────────────────┐
   │ pdf-template.njk  (×40)          │  ◄── CHANGE: add caution-box to 15,
   │                                  │       add restriction class to 4
   └──────────────┬───────────────────┘
                  ▼
   ┌──────────────────────────────────┐
   │ generatePdfFromHtml()            │  libs/pdf-generation/src/generator.ts:52
   │ Puppeteer, printBackground: true │  (already correct — no change)
   └──────────────┬───────────────────┘
                  ▼
   ┌──────────────────────────────────┐
   │ savePdfToStorage()               │  pdf-utilities.ts:32
   │ blob: <artefactId>.pdf           │
   └──────────────────────────────────┘
```

### 4.2 Reader flow (unchanged)

```
  1. Reader lands on "Find a court or tribunal hearing list"
  2. Selects a court/tribunal            →  /summary-of-publications?locationId=…
  3. Selects a publication               →  the list type's own view page
  4. Selects the PDF download link       →  streams <artefactId>.pdf from blob storage
  5. Opens the PDF
        ├─ sees the grey reporting restriction panel near the top   ← consistent after fix
        ├─ sees grey restriction rows against affected cases        ← consistent after fix
        └─ sees the grey caution box as the last block on the last page  ← present after fix
```

Steps 1–4 involve no code change. Only what the reader sees at step 5 changes.

---

## 5. Low Fidelity Wireframe

### 5.1 Target PDF structure (applies to all 40 list types)

```
┌──────────────────────────────────────────────────────────────────────┐
│                                                                      │
│  Crown Daily List for Cardiff Crown Court            ← h1, 32px      │
│                                                                      │
│  Find contact details and other information about courts and         │
│  tribunals in England and Wales…                     ← FaCT link     │
│                                                                      │
│  Cardiff Crown Court                                                 │
│  The Law Courts, Cathays Park                        ← .address      │
│  Cardiff, CF10 3PG                                                   │
│                                                                      │
│  List for 20 August 2026                             ← bold          │
│  Last updated 20 August 2026 at 9:15am                               │
│ ──────────────────────────────────────────────────── 2px solid ──────│
│                                                                      │
│ ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓ │
│ ┃  ░░░░░░░░░░░  GREY  #f3f2f1  ░░░░░░░░░░░  .info-box  ░░░░░░░░░  ┃ │
│ ┃                                                                  ┃ │
│ ┃  Reporting Restrictions                        ← h3, 18px        ┃ │
│ ┃                                                                  ┃ │
│ ┃  Reporting restrictions may apply to any of the below cases…     ┃ │
│ ┃                                                                  ┃ │
│ ┃   ⬤   Reporting restrictions may apply.        ← .warning-row    ┃ │
│ ┃   !     Check before you publish.                FIXED: was a    ┃ │
│ ┃                                                  bare "!"        ┃ │
│ ┃                                                                  ┃ │
│ ┃  Specific restrictions are noted against the relevant case…      ┃ │
│ ┃  However, this is not a comprehensive list…                      ┃ │
│ ┃  If you are unsure, contact:                                     ┃ │
│ ┃    • the court listed above                                      ┃ │
│ ┃    • the HMCTS press office                                      ┃ │
│ ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛ │
│                                                                      │
│  Cardiff Crown Court                                 ← h2, 24px      │
│                                                                      │
│  ░░░ Courtroom 1, Before Judge Smith ░░░             ← .section-     │
│                                                         heading grey │
│  ┌──────────┬───────────┬──────────────┬───────────┬──────────────┐  │
│  │ Time     │ Case Ref  │ Defendant    │ Hearing   │ Prosecutor   │  │
│  ├══════════┼═══════════┼══════════════┼═══════════┼══════════════┤  │
│  │ 10:00am  │ T2026001  │ SMITH, John  │ Trial     │ CPS Wales    │  │
│  ├──────────┼───────────┼──────────────┼───────────┼──────────────┤  │
│  │░░░░░░░░░░░░░░░░░░░ GREY #f3f2f1 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│  │
│  │░ Reporting restrictions: Section 45 YJCEA 1999 order in force ░│  │
│  │░░░░░░░░░ .restriction-row  — colspan spans full table ░░░░░░░░░│  │
│  ├──────────┼───────────┼──────────────┼───────────┼──────────────┤  │
│  │ 11:30am  │ T2026002  │ JONES, Ann   │ Sentence  │ CPS Wales    │  │
│  └──────────┴───────────┴──────────────┴───────────┴──────────────┘  │
│                                                                      │
│  … further courtrooms / court houses …                               │
│                                                                      │
│  Data Source: Common Platform                        ← .footer 12px  │
│                                                                      │
│ ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓ │
│ ┃  ░░░░░░░░░░  GREY  #f3f2f1  ░░░░░░░░░  .caution-box  ░░░░░░░░░░  ┃ │
│ ┃                                                                  ┃ │
│ ┃  Note this document contains Special Category Data as defined    ┃ │
│ ┃  by Data Protection Act 2018, formally known as Sensitive        ┃ │
│ ┃  Personal Data, and should be handled appropriately.             ┃ │
│ ┃                                                                  ┃ │
│ ┃  This document contains information intended to assist the       ┃ │
│ ┃  accurate reporting of court proceedings. It is vital you        ┃ │
│ ┃  ensure that you safeguard the Special Category Data included    ┃ │
│ ┃  and abide by reporting restrictions (for example on victims     ┃ │
│ ┃  and children). HMCTS will stop sending the data if there is     ┃ │
│ ┃  concern about how it will be used.                              ┃ │
│ ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛ │
│                                              MUST be the last block  │
└──────────────────────────────────────────────────────────────────────┘
```

### 5.2 Before / after — restriction row inside a table

```
BEFORE  (civil-daily-cause-list, crown-daily-list, crown-firm-list,
         family-daily-cause-list, civil-and-family-daily-cause-list)

  ┌──────────┬───────────┬──────────────┬───────────────────────────┐
  │ 10:00am  │ T2026001  │ SMITH, John  │ Trial                     │
  ├──────────┴───────────┴──────────────┴───────────────────────────┤
  │▒▒▒▒▒▒▒▒▒▒▒▒▒ CREAM #fff7e6, italic ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒│  ← wrong colour
  │▒ Reporting restrictions: Section 45 YJCEA 1999 order in force  ▒│
  └─────────────────────────────────────────────────────────────────┘

BEFORE  (cop-daily-cause-list, magistrates-public-list)

  ┌──────────┬───────────┬──────────────┬───────────────────────────┐
  │ 10:00am  │ 12345678  │ P (by his…)  │ Directions                │
  ├──────────┴───────────┴──────────────┴───────────────────────────┤
  │                                                                 │  ← no background
  │  Reporting restrictions: Section 4(2) Contempt of Court Act      │     at all
  └─────────────────────────────────────────────────────────────────┘

AFTER  (all nine, single shared class)

  ┌──────────┬───────────┬──────────────┬───────────────────────────┐
  │ 10:00am  │ T2026001  │ SMITH, John  │ Trial                     │
  ├──────────┴───────────┴──────────────┴───────────────────────────┤
  │░░░░░░░░░░░░░░░░░░░░░ GREY #f3f2f1 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│
  │░ Reporting restrictions: Section 45 YJCEA 1999 order in force  ░│
  └─────────────────────────────────────────────────────────────────┘
      ▲ bold label            ▲ restriction detail, normal weight
```

### 5.3 Before / after — non-table restriction (magistrates-standard-list, sjp-press-list)

```
BEFORE                                  AFTER

  Prosecuting authority: CPS              Prosecuting authority: CPS
  Attendance method: In person            Attendance method: In person
  Reporting restrictions: s.45 order     ┌──────────────────────────────────┐
                              ▲          │░░░░░░ GREY #f3f2f1 ░░░░░░░░░░░░░░│
                     no background       │░ Reporting restrictions:        ░│
                                         │░ s.45 order                     ░│
                                         └──────────────────────────────────┘
                                              .restriction-block
```

### 5.4 Before / after — warning icon inside the restriction panel

```
BEFORE                                  AFTER

  ░░░░░ .info-box grey ░░░░░░░░░          ░░░░░ .info-box grey ░░░░░░░░░
  ░ Reporting Restrictions     ░          ░ Reporting Restrictions     ░
  ░                           ░          ░                           ░
  ░ !                         ░          ░  ⬤     Reporting          ░
  ░ Reporting restrictions     ░          ░  !     restrictions may    ░
  ░ may apply.                 ░          ░        apply.             ░
  ░       ▲                    ░          ░         ▲                 ░
  ░  unstyled bare "!"         ░          ░  black circle, white bold ░
  ░  on its own line           ░          ░  glyph, text aligned      ░
  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░          ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
```

---

## 6. Page Specifications

This section specifies the artefact (the generated PDF), the stylesheet contract, and the per-file changes.

### 6.1 Stylesheet contract — `libs/list-types/common/src/pdf/pdf-styles.ts`

This is the single source of truth. All background colours for restriction and caution blocks are declared here and nowhere else.

**Move and correct the restriction row rule.** Relocate `.restriction-row` from `PDF_CIVIL_FAMILY_STYLES` into `PDF_BASE_STYLES` and change the colour, so every template gets it regardless of which style strings its generator composes:

```css
/* PDF_BASE_STYLES — reporting restriction, table row form */
.restriction-row td {
  background-color: #f3f2f1;
}
.restriction-row td .restriction-label {
  font-weight: 700;
}
.restriction-row .no-side-border { border-left: none; border-right: none; }
```

Rationale for moving it into `PDF_BASE_STYLES`: only 8 of the 40 generators compose `PDF_CIVIL_FAMILY_STYLES`. Leaving the rule there is what allows a template to use `restriction-row` and silently get no background. `PDF_CIVIL_FAMILY_STYLES` retains `.court-section`, `.court-room-section` and `.section-heading` only.

**Drop `font-style: italic`.** GOV.UK content style discourages italics — they reduce legibility, particularly for dyslexic readers. Emphasis is carried by the bold `Reporting restrictions:` label and the grey background, so the italic adds nothing.

**Add a block form for non-table restrictions:**

```css
/* PDF_BASE_STYLES — reporting restriction, non-table form */
.restriction-block {
  background-color: #f3f2f1;
  padding: 10px;
  margin: 5px 0 10px 0;
  page-break-inside: avoid;
}
.restriction-block p { margin-bottom: 0; }
.restriction-block .restriction-label { font-weight: 700; }
```

**Add the missing warning classes.** These three classes are referenced by seven templates and defined nowhere. Values mirror the GOV.UK Warning text component, adapted for a fixed-width print context:

```css
/* PDF_BASE_STYLES — GOV.UK warning text equivalent for print */
.warning-row {
  display: flex;
  align-items: center;
  margin-bottom: 15px;
}
.warning-icon {
  flex-shrink: 0;
  width: 26px;
  height: 26px;
  margin-right: 10px;
  border: 2px solid #0b0c0c;
  border-radius: 50%;
  background-color: #0b0c0c;
  color: #ffffff;
  font-weight: 700;
  font-size: 20px;
  line-height: 24px;
  text-align: center;
}
.warning-text { font-weight: 700; }
```

`.caution-box` and `.info-box` already specify `background-color: #f3f2f1` and need no colour change. Add `page-break-inside: avoid` to `.caution-box` so the caution note is never split across two pages.

### 6.2 Shared caution content — `libs/list-types/common/src/locales/`

Add a `caution` object alongside the existing `provenanceLabels` export, following the pattern already established in that file:

```typescript
// libs/list-types/common/src/locales/en.ts
export const caution = {
  cautionNote: "Note this document contains Special Category Data …",
  cautionReporting: "This document contains information intended to assist …"
};
```

```typescript
// libs/list-types/common/src/locales/cy.ts
export const caution = {
  cautionNote: "…",       // canonical Welsh — see §7.2
  cautionReporting: "…"
};
```

Export from `libs/list-types/common/src/index.ts` mirroring lines 32–33:

```typescript
export { caution as cautionCy } from "./locales/cy.js";
export { caution as cautionEn } from "./locales/en.js";
```

Each of the 15 packages that lacks the keys spreads the shared object into its locale root:

```typescript
// libs/list-types/crown-daily-list/src/locales/en.ts
import { caution } from "@hmcts/list-types-common";

export const en = {
  title: "Crown Daily List",
  // … existing keys unchanged …
  ...caution
};
```

The 24 packages that already declare the literal strings replace their two hardcoded properties with the same spread, so the text exists in exactly one place.

### 6.3 Locale access path — normalise to `t.cautionNote`

All 40 templates reference `{{ t.cautionNote }}` and `{{ t.cautionReporting }}`.

- `administrative-court-daily-cause-list` and `rcj-standard-daily-cause-list` currently use `t.common.cautionNote`. Spread `caution` into their `common` sub-object **and** leave the template path as `t.common.cautionNote` — these two locales are wholly nested under `common`, and flattening them is a larger refactor outside this issue's scope. Document the exception in the guard test's allowlist rather than pretending it does not exist.
- `iac-daily-list` currently uses the bare `common.cautionNote`, which works only because its generator injects `common: translations.common` at `pdf-generator.ts:56`. Change the template to `t.common.cautionNote` for consistency with the two above. Leave the `common` context injection in place — other keys in that template (`common.dataSource` at line 74) also depend on it, so removing it is a separate change.

Net result: two access paths (`t.cautionNote` for 37 templates, `t.common.cautionNote` for 3), determined solely by whether the package's locale file is flat or nested. That is a property of the locale file, verifiable by the guard test, rather than three arbitrary conventions.

### 6.4 Add the caution box to 15 templates

For each of the 15 packages listed in §2.6, insert the block as the last child of the existing `<div class="footer">`:

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

This is byte-for-byte the block already present in the other 25 templates. Every one of the 15 already has the `footer` wrapper and a valid `t.dataSource` key, so no other change is needed in those files.

### 6.5 Restriction markup changes, per file

| File | Change |
|---|---|
| `cop-daily-cause-list/src/pdf/pdf-template.njk` :94 | Add `class="restriction-row"` to the `<tr>`; wrap the label in `<span class="restriction-label">` |
| `magistrates-public-list/src/pdf/pdf-template.njk` :124–126 | Add `class="restriction-row"` to the `<tr>`; replace `style="border-right: none"` and `style="border-left: none"` with `class="no-side-border"` |
| `magistrates-standard-list/src/pdf/pdf-template.njk` :126 | Wrap the hearing-level restriction `<p>` in `<div class="restriction-block">` |
| `magistrates-standard-list/src/pdf/pdf-template.njk` :156 | Wrap the offence-level restriction `<p>` in `<div class="restriction-block">` |
| `sjp-press-list/src/pdf/pdf-template.njk` :47 | Wrap the `<p class="restriction-tag">` in `<div class="restriction-block">`; keep `.restriction-tag`'s red `#d4351c` text (contrast on `#f3f2f1` is 4.6:1 — passes WCAG 2.2 AA for body text) |
| `civil-daily-cause-list` :99, `civil-and-family-daily-cause-list` :117, `crown-daily-list` :122, `crown-firm-list` :118, `family-daily-cause-list` :103 | Markup already correct — no template change. They pick up the grey automatically once the rule moves into `PDF_BASE_STYLES`. Wrap the existing `<strong>` label in `restriction-label` for uniformity |

Also apply `class="restriction-label"` consistently in place of ad-hoc `<strong>` so the label weight is controlled by the stylesheet, not by tag choice.

### 6.6 Warning icon — no template change required

The seven templates listed in §2.5 already emit the correct markup (`.warning-row` > `.warning-icon` + `.warning-text`). Adding the CSS in §6.1 fixes all seven with no template edits. The `aria-hidden="true"` already on `.warning-icon` is retained.

### 6.7 Files changed — summary

| Area | Files | Nature |
|---|---|---|
| `libs/list-types/common/src/pdf/pdf-styles.ts` | 1 | Move `.restriction-row`, correct colour, add `.restriction-block`, add `.warning-*` |
| `libs/list-types/common/src/locales/{en,cy}.ts` | 2 | Add shared `caution` export |
| `libs/list-types/common/src/index.ts` | 1 | Export `cautionEn` / `cautionCy` |
| `libs/list-types/*/src/locales/{en,cy}.ts` | 78 | 15 packages gain the spread; 24 replace literals with the spread |
| `libs/list-types/*/src/pdf/pdf-template.njk` | 15 | Add `caution-box` |
| `libs/list-types/*/src/pdf/pdf-template.njk` | 9 | Restriction class / label changes (4 substantive, 5 label-only) |
| `libs/list-types/iac-daily-list/src/pdf/pdf-template.njk` | 1 | `common.cautionNote` → `t.common.cautionNote` |
| `libs/list-types/common/src/pdf/guard.test.ts` | 1 (new) | CI guard, see §13 |
| `libs/list-types/common/src/pdf/pdf-styles.test.ts` | 1 (new) | Assert the shared style contract |

No changes to: `libs/pdf-generation` (Puppeteer already correct), the web view templates in `apps/web/src/pages/(list-types)/` (already grey), the Prisma schema, or `PDF_GENERATOR_REGISTRY`.

### 6.8 Build considerations

Each list-type package copies only its own templates: `"build:pdf-templates": "mkdir -p dist/pdf && cp src/pdf/*.njk dist/pdf/"`. `configureNunjucks(templateDir)` takes a single directory, so a Nunjucks template search path cannot reach a partial in `@hmcts/list-types-common/dist/views` without changing 40 build scripts and the Nunjucks configuration.

**Therefore: do not extract a shared `.njk` partial for the caution box in this issue.** Share the *content* (via the locale export) and the *styling* (via `pdf-styles.ts`), and keep the six-line markup block duplicated. The guard test, not a partial, is what prevents drift. Extracting a shared partial is a reasonable follow-up but would triple the blast radius of this fix for no user-visible gain.

---

## 7. Content

### 7.1 No new copy is written

Every string this change puts on a page already exists in the repository. The task is to make existing, already-signed-off copy appear where it is currently missing, and to stop duplicating it. **Do not reword any of these strings** — they carry legal weight regarding Special Category Data and reporting restrictions.

### 7.2 Caution message — the two paragraphs added to 15 PDFs

Canonical source: `libs/list-types/rcj-standard-daily-cause-list/src/locales/en.ts:133–136` and `cy.ts:133–136`. Identical text is repeated in 23 other packages; this becomes the single shared `caution` export in `libs/list-types/common/src/locales/`.

**`cautionNote`**

English:
> Note this document contains Special Category Data as defined by Data Protection Act 2018, formally known as Sensitive Personal Data, and should be handled appropriately.

Welsh: Noder bod y ddogfen hon yn cynnwys Data Categori Arbennig fel y'i diffinnir yn Neddf Gwarchod Data 2018, a elwid gynt yn Ddata Personol Sensitif, a dylid ei drin yn y ffordd briodol.

**`cautionReporting`**

English:
> This document contains information intended to assist the accurate reporting of court proceedings. It is vital you ensure that you safeguard the Special Category Data included and abide by reporting restrictions (for example on victims and children). HMCTS will stop sending the data if there is concern about how it will be used.

Welsh: Mae'r ddogfen hon yn cynnwys gwybodaeth a fwriedir i gynorthwyo i roi adroddiad manwl-gywir am achosion llys. Mae'n hanfodol eich bod yn sicrhau eich bod yn gwarchod y Data Categori Arbennig sydd ynddi ac yn cadw at gyfyngiadau adrodd (er enghraifft yn achos dioddefwyr a phlant). Bydd GLlTEM yn rhoi'r gorau i anfon y data os cyfyd pryder ynghylch sut y'i defnyddir.

> **Implementation note:** the approved Welsh for both strings is already present verbatim in 24 `cy.ts` files (e.g. `libs/list-types/rcj-standard-daily-cause-list/src/locales/cy.ts:133–136`). The implementer should copy those existing strings into the shared `caution` export rather than commissioning a new translation. The markers above exist so the translation post-processing step can verify a match against the approved text.

### 7.3 Restriction row label — existing keys, unchanged

The bold label prefixing each per-case restriction is the existing `reportingRestrictions` key, already present in every affected package's locale files in both languages. No new key.

| Key | English | Welsh |
|---|---|---|
| `reportingRestrictions` | Reporting restrictions | Cyfyngiadau riportio |

Rendered as `<span class="restriction-label">{{ t.reportingRestrictions }}:</span> {{ case.formattedReportingRestriction }}`. The colon stays in the template, as it does today, so the label key is reusable in contexts without one.

The restriction *detail* text (`case.formattedReportingRestriction`, `hearing.reportingRestrictionDetails`, `offence.reportingRestrictionDetails`) is court-supplied data from the source JSON. It is not translated and must be rendered exactly as received.

### 7.4 Restriction panel content — existing keys, unchanged

The top-of-document panel already renders in both languages in all seven templates that have it. Two key families exist and neither changes:

| Family | Keys | Used by |
|---|---|---|
| Crown | `reportingRestrictionsTitle`, `reportingRestrictionsBodyIntro`, `reportingRestrictionsWarning`, `reportingRestrictionsBodySpecific`, `reportingRestrictionsBodyHowever`, `reportingRestrictionsBodyContact`, `reportingRestrictionsContactCourt`, `reportingRestrictionsContactHmcts` | `crown-daily-list`, `crown-firm-list`, `crown-warned-list` |
| Magistrates | `restrictionInformationHeading`, `restrictionInformationP1`–`P4`, `restrictionInformationBoldText`, `restrictionBulletPoint1`, `restrictionBulletPoint2` | `magistrates-standard-list`, `magistrates-public-list`, `magistrates-adult-court-list`, `magistrates-public-adult-court-list` |

Unifying these two key families is explicitly **out of scope** — the two jurisdictions' restriction guidance differs in substance, not just wording.

### 7.5 Screen reader text for the warning icon

The `!` glyph is decorative and already marked `aria-hidden="true"` in all seven templates. On the web, GOV.UK pairs it with a visually hidden "Warning" label (`govuk-warning-text__assistive`, see `apps/web/src/pages/(list-types)/crown-daily-cause-list/crown-daily-cause-list.njk:67`). The PDF templates omit this.

Add the assistive label to the seven PDF templates so the warning is announced by PDF screen readers:

| Key | English | Welsh |
|---|---|---|
| `warningAssistiveText` | Warning | [WELSH TRANSLATION REQUIRED: "Warning"] |

Rendered as `<span class="visually-hidden">{{ t.warningAssistiveText }}</span>` inside `.warning-text`, with the supporting rule added to `PDF_BASE_STYLES`:

```css
.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}
```

This is the one genuinely new key in this change. Because the seven affected packages split across two key families (§7.4), add `warningAssistiveText` to the shared `caution` export's sibling — a small shared `pdfCommon` object in `libs/list-types/common/src/locales/` — rather than to seven packages individually.

### 7.6 Locale key parity

Every `cy.ts` touched must remain structurally identical to its `en.ts`. Because the change is a spread of a shared object into both, parity holds by construction. The parity assertion is included in the test scenarios (§13).

---

## 8. URL

**No new routes, and no changes to existing routes.** This change alters the content of a generated artefact, not the routing that serves it.

### 8.1 Routes involved (all unchanged)

| Route | Handler | Role in this change |
|---|---|---|
| `/summary-of-publications?locationId=<id>` | `apps/web/src/pages/(public)/summary-of-publications/index.ts` | Lists publications for a court; the reader picks one |
| `/hearing-lists/:locationId/:artefactId` | `apps/web/src/pages/(public)/hearing-lists/[locationId]/[artefactId]/index.ts` | Serves the stored artefact with `Content-Type: application/pdf` (line 78). **This is the route that returns the fixed PDF.** |
| `/<list-type-url-path>?artefactId=<id>` | `apps/web/src/pages/(list-types)/<name>/index.ts` | The on-screen HTML view of the same list. Already renders restrictions on grey — no change. |
| `/publication/:id` | `apps/web/src/pages/(public)/publication/[id].ts` | Fallback for list types with no dedicated page; returns 501. No change. |

### 8.2 Blob storage key

PDFs are stored as `<artefactId>.pdf` in the `PUBLICATIONS` container (`libs/list-types/common/src/pdf/pdf-utilities.ts:34–36`). The key format is unchanged, so no cache keys, links, or subscription email attachments need updating.

### 8.3 Locale

The PDF's language is fixed at generation time by the `locale` option passed to the generator — it is a property of the stored artefact, not a request parameter. `?lng=cy` switches the surrounding web page but not an already-generated PDF. This matters for testing: verifying the Welsh caution box requires generating a PDF with `locale: "cy"`, not appending a query string to a download link.

---

## 9. Validation

There is no user input in this change — no forms, no query parameters, no request bodies. "Validation" here means the correctness constraints the implementation must satisfy and the conditional-rendering rules that govern when each block appears.

### 9.1 Conditional rendering rules

| Block | Condition | Behaviour when condition is false |
|---|---|---|
| Per-case restriction row | `case.formattedReportingRestriction` is non-empty (`{% if … | length %}`), or `hearing.reportingRestriction` / `offence.reportingRestriction` is truthy | Row is not emitted at all. **Do not emit an empty grey row.** |
| Top-of-document restriction panel | Always, in the 7 templates that have one | n/a |
| Caution box | **Always, unconditionally, in all 40 templates** | n/a — it must never be conditional |
| `dataSource` line | `dataSource` is truthy | Line omitted; the caution box still renders |

The last row is the critical one: the caution box must sit **inside** `<div class="footer">` but **outside** the `{% if dataSource %}` block. Placing it inside the conditional would reintroduce the bug for manually-uploaded publications with no provenance label.

### 9.2 Colour and markup constraints

| Constraint | Value | Enforced by |
|---|---|---|
| Restriction background | `#f3f2f1` exactly — `govuk-colour("light-grey")` | `pdf-styles.test.ts` |
| Caution background | `#f3f2f1` exactly | `pdf-styles.test.ts` |
| No cream background anywhere | `#fff7e6` must not appear in any PDF stylesheet | Guard test |
| No per-template background declarations | No `background-color` for restriction/caution elements inside any `pdf-template.njk` | Guard test |
| No inline `style=` attributes on restriction markup | Named classes only | Guard test |
| `.restriction-row`, `.restriction-block`, `.caution-box`, `.info-box`, `.warning-row`, `.warning-icon`, `.warning-text`, `.visually-hidden` all defined | Present in `PDF_BASE_STYLES` | `pdf-styles.test.ts` |
| Every `src/pdf/*.njk` contains exactly one `caution-box` | Count === 1 | Guard test |

### 9.3 Colspan correctness

Restriction rows span the full width of their table via `colspan`. Getting this wrong produces a grey block that stops short of the table edge — visually worse than no background. Current values must be preserved, including the conditional case:

| Template | Colspan | Note |
|---|---|---|
| `civil-and-family-daily-cause-list` | 9 | |
| `family-daily-cause-list` | 9 | |
| `civil-daily-cause-list` | 7 | |
| `crown-firm-list` | 7 | |
| `cop-daily-cause-list` | 7 | |
| `crown-daily-list` | `{% if session.hasListingNotes %}6{% else %}5{% endif %}` | Conditional — must be asserted both ways |
| `magistrates-public-list` | 2 + 3 across two cells | Two-cell layout with joined border; preserve as-is, only swap inline styles for classes |

### 9.4 PDF size constraint

`MAX_PDF_SIZE_BYTES` is 2 MB (`libs/list-types/common/src/pdf/pdf-utilities.ts:6`); exceeding it sets `exceedsMaxSize: true` on the result rather than failing generation. The added markup is roughly 700 bytes of text per document plus a few hundred bytes of CSS — negligible. Background fills do increase the compressed page stream slightly. The size check in §13 confirms no previously-compliant list crosses the threshold.

### 9.5 Locale integrity

- Every `cy.ts` touched must have a key set identical to its `en.ts`.
- No `cy.ts` may contain an English caution string.
- No `[WELSH TRANSLATION REQUIRED: …]` placeholder may be introduced — the approved Welsh already exists (§7.2).

---

## 10. Error Messages

**No user-facing error messages are added or changed.** This change produces no new failure mode: it adds static markup and CSS to a template that is already rendered on every publication.

### 10.1 Existing failure handling (unchanged)

| Failure | Current behaviour | Location |
|---|---|---|
| Nunjucks render throws (e.g. malformed template) | Caught; returns `{ success: false, error: "Failed to generate PDF: <message>" }`. Logged server-side; no PDF stored. | `createPdfErrorResult()`, `pdf-utilities.ts:46` |
| Puppeteer fails | Returns `{ success: false, error: "PDF generation failed" }` | `pdf-utilities.ts:50–53` |
| PDF exceeds 2 MB | `exceedsMaxSize: true`; PDF is still stored and served | `pdf-utilities.ts:33` |
| Reader requests an artefact with no stored PDF | Redirect to `/404` | `publication/[id].ts:17` |

### 10.2 Silent-failure risk this change must avoid

The real hazard is not an error message but a **missing** one. Nunjucks with `autoescape: true` and no `throwOnUndefined` renders an undefined variable as an empty string. So if `t.cautionNote` is not resolvable in a given template, the caution box renders as an **empty grey box** — no exception, no log line, no failed test. This is precisely how three different locale access paths (§2.7) survived undetected.

Mitigations, in order of reliability:

1. The guard test asserts that every template referencing `t.cautionNote` belongs to a package whose locale root actually defines `cautionNote` (and likewise for the nested `t.common.cautionNote` form). This catches the mismatch at CI time rather than in production output.
2. Generator unit tests assert the rendered HTML contains the caution *text*, not merely the `caution-box` element — an empty box fails.
3. `configureNunjucks()` is **not** switched to `throwOnUndefined: true` in this issue. It would be the strongest guarantee, but the 40 existing templates reference many optional fields and turning it on would break generation for legitimately-absent court data. Flagged in §14.

### 10.3 Developer-facing messages (guard test output)

The new guard test must name the offending package so the failure is self-explanatory. Follow the wording style of `libs/list-types/common/src/validation/guard.test.ts:32,40`:

```
crown-daily-list: pdf-template.njk has no caution-box block
sscs-daily-hearing-list: template references t.cautionNote but locales/en.ts does not define cautionNote
magistrates-public-list: pdf-template.njk contains an inline style= on restriction markup
new-list-type: pdf-template.njk declares its own background-color; use the shared restriction-row class
```

---

## 11. Navigation

**No navigation changes.** No new pages, links, redirects, or back-link behaviour.

### 11.1 Position of each block within the document

Navigation within a PDF is reading order and page breaks. The specification is:

| Block | Position | Page-break rule |
|---|---|---|
| Header (`h1`, FaCT link, address, dates) | First | n/a |
| Restriction / important-information panel (`.info-box`) | Immediately after the header, before any court data | Should not split; add `page-break-inside: avoid` |
| Court and courtroom sections | Body | `.court-section` and `.court-room-section` already set `page-break-inside: avoid` |
| Per-case restriction row | Immediately after the row of the case it applies to | Must not be separated from its case row. `.restriction-block` sets `page-break-inside: avoid`; table rows are handled by the print engine |
| `dataSource` line | Inside `.footer` | n/a |
| Caution box (`.caution-box`) | **Last block in the document**, inside `.footer`, after `dataSource` | `page-break-inside: avoid` so the two paragraphs stay together |

The adjacency rule for restriction rows matters: a restriction that lands at the top of a new page, separated from its case, is ambiguous about which case it restricts. Because `<td>` is a table cell and Puppeteer keeps a row intact by default, no extra rule is needed for the table form — but the non-table `.restriction-block` needs the explicit declaration.

### 11.2 Reader's route to the artefact (unchanged)

```
  Home  →  Find a court or tribunal  →  /summary-of-publications?locationId=…
                                              │
                              ┌───────────────┴───────────────┐
                              ▼                               ▼
                  on-screen list view               /hearing-lists/:locationId/:artefactId
                  (already grey — no change)        (PDF download — fixed by this change)
```

### 11.3 Subscription emails

Publication notification emails reference the artefact and may link to or attach the PDF (`sendPublicationNotificationsForArtefact`, `libs/publication/src/processing/service.ts:468`). Because the blob key and content type are unchanged, no email template or link changes. Subscribers who receive a notification after the fix ships get the corrected PDF.

---

## 12. Accessibility

WCAG 2.2 AA applies to PDFs as well as web pages — a PDF published by a government service falls under the Public Sector Bodies (Websites and Mobile Applications) Accessibility Regulations 2018. The current defects include two genuine accessibility failures, not merely cosmetic inconsistency.

### 12.1 Existing failures this change fixes

| # | Failure | Success criterion | Cause | Fix |
|---|---|---|---|---|
| 1 | The GOV.UK warning icon renders as an unstyled `!` character with no accessible name | **1.1.1 Non-text Content (A)** | `.warning-icon` is undefined, so the `!` is presented as bare text with no context. A screen reader announces "exclamation mark" or nothing useful. | Define `.warning-icon` with `aria-hidden="true"` on the glyph plus a `.visually-hidden` "Warning" label (§7.5), matching the GOV.UK Warning text component |
| 2 | Restriction text is visually indistinguishable from ordinary case data in 4 templates (no background, no emphasis) | **1.3.1 Info and Relationships (A)** | The row carries no class, so the grouping that marks it as a restriction exists only in the author's intent | Apply `.restriction-row` / `.restriction-block`, and keep the bold `<strong>` label so the relationship is conveyed structurally, not only by colour |
| 3 | Where restriction status is signalled *only* by a background fill | **1.4.1 Use of Colour (A)** | Fill with no accompanying text label in some layouts | Every restriction block retains a visible text label ("Reporting restrictions:") — the background reinforces, never carries, the meaning |

### 12.2 Colour contrast

`#f3f2f1` is the GOV.UK `light-grey` token and is designed to carry `#0b0c0c` body text. Contrast must hold for every text colour placed on it.

| Foreground | Background | Ratio | Requirement | Result |
|---|---|---|---|---|
| `#0b0c0c` (GOV.UK body text) | `#f3f2f1` | ≈ 18.6:1 | 4.5:1 | Pass |
| `#0b0c0c` bold label | `#f3f2f1` | ≈ 18.6:1 | 4.5:1 | Pass |
| `#d4351c` (GOV.UK red, used by `.restriction-tag` in `sjp-press-list`) | `#f3f2f1` | ≈ 4.7:1 | 4.5:1 | Pass — marginal; must not be reduced in weight or size |
| `#505a5f` (GOV.UK secondary text) | `#f3f2f1` | ≈ 6.5:1 | 4.5:1 | Pass |
| `#0b0c0c` | `#fff7e6` (current cream — being removed) | ≈ 19.4:1 | 4.5:1 | Passes, but is a non-standard colour outside the GOV.UK palette |

The cream `#fff7e6` is not a contrast failure — it is a **palette and consistency** failure. It corresponds to no GOV.UK Design System token, so it cannot be reasoned about against the rest of the service, and it appears in none of the on-screen views of the same data.

### 12.3 Not relying on colour alone

The grey background must never be the sole indicator that text is a reporting restriction. Every restriction block retains all three signals:

1. **Text label** — "Reporting restrictions:" / Cyfyngiadau riportio in bold
2. **Structural position** — immediately adjacent to the case it applies to
3. **Background fill** — `#f3f2f1`

This matters directly for print. PDFs are frequently printed in monochrome by court staff and press; greyscale reduces `#f3f2f1` to near-white, at which point signals 1 and 2 are all a reader has. It is also why the fix must not *replace* any text label with colour.

### 12.4 Reading order and tagging

Puppeteer's `page.pdf()` produces a PDF whose reading order follows the DOM order of the source HTML. Placing the restriction row immediately after its case row in the markup therefore yields the correct reading order for assistive technology with no additional work.

Two limits of the current approach — both **pre-existing and out of scope** for this issue, recorded because a full PDF accessibility audit will raise them:

- Puppeteer does not emit a tagged PDF (`/StructTreeRoot`), so headings and table structure are not exposed as PDF tags. Screen-reader users get untagged content in reading order.
- No `/Lang` entry is set on the document catalogue, so a screen reader will not switch voice for the Welsh PDFs.

Both affect all 40 list types equally and predate this change. See §14.

### 12.5 The on-screen view remains the accessible route

The authoritative accessible presentation of every list is the HTML page, which is Axe-tested and already renders restrictions on `#f3f2f1` (`apps/web/src/assets/css/list-types/magistrates-public-list.scss:17`). This change brings the PDF into visual agreement with that page; it does not make the PDF the accessible alternative. Every PDF download link sits on a page presenting the same data as HTML.

### 12.6 Semantics of the caution box

The caution box is standing advisory text, not an error or a status change. It must therefore **not** use `role="alert"`, `aria-live`, or the GOV.UK Notification banner pattern — all of which imply a dynamic announcement. It is a static inset block (the PDF equivalent of GOV.UK Inset text): two ordinary `<p>` elements inside `<div class="caution-box">`.

The GOV.UK Warning text component *is* correct for the per-case restriction icon (item 1 above), because a reporting restriction carries legal consequences for the reader — precisely the documented use of Warning text: "warn users about something important, such as legal consequences of an action."

### 12.7 Verification

- Assert the literal `#f3f2f1` in `pdf-styles.test.ts` so a future palette edit cannot silently drop contrast.
- Render each fixed template with a restriction present and confirm the visible text label is in the output independently of the class (proves 1.4.1).
- Confirm `aria-hidden="true"` on the icon glyph and the presence of the visually-hidden "Warning" text in the 7 warning-icon templates.
- Greyscale print check on one representative PDF from each of the three layout families (table-row, block, two-cell) to confirm restrictions stay identifiable without colour.

---

## 13. Test Scenarios

High-level scenario descriptions. The weight sits deliberately on the CI guard test: with 40 templates, per-template assertions do not scale and will not stop the next list type from reintroducing the defect.

### 13.1 Stylesheet unit tests — `libs/list-types/common/src/pdf/pdf-styles.test.ts` (new file)

* `PDF_BASE_STYLES` defines `.restriction-row td`, `.restriction-block`, `.restriction-label`, `.caution-box`, `.info-box`, `.warning-row`, `.warning-icon`, `.warning-text` and `.visually-hidden`.
* Every restriction and caution rule uses the literal `#f3f2f1` — asserted on the exact hex, so a change to any other colour fails.
* The cream `#fff7e6` appears in no exported PDF style string.
* `PDF_CIVIL_FAMILY_STYLES` no longer declares `.restriction-row`, proving the rule moved to the base and is now reachable by all 40 generators.
* Composing `PDF_BASE_STYLES + PDF_CIVIL_FAMILY_STYLES` produces no duplicate `.restriction-row` declaration (which would make the effective colour order-dependent).
* Restriction and caution rules carry `page-break-inside: avoid`.

### 13.2 CI guard test — `libs/list-types/common/src/pdf/guard.test.ts` (new file)

Walks every sibling directory under `libs/list-types/`, skipping `common`, and collects violations into an array asserted `toEqual([])` — the shape used by `libs/list-types/common/src/validation/guard.test.ts`.

* Every package with a `src/pdf/pdf-template.njk` contains exactly one `caution-box` block. This is the test that fails today for 15 packages and is the mechanical proof the issue is fixed.
* No `pdf-template.njk` declares its own `background-color` for restriction or caution markup — all backgrounds come from the shared stylesheet.
* No `pdf-template.njk` carries an inline `style=` attribute on restriction markup.
* Every template that renders a restriction uses one of the two approved class names (`restriction-row` for table rows, `restriction-block` for non-table blocks) — no unclassed restriction markup.
* Every template referencing `t.cautionNote` belongs to a package whose locale root actually exposes `cautionNote`; likewise for the `t.common.cautionNote` form. Catches the silent-empty-box failure in §10.2.
* No template uses the bare `common.cautionNote` form (the `iac-daily-list` pattern that only works because its generator injects an extra context key).
* Failure messages name the offending package and the specific rule broken.

### 13.3 Locale tests

* The shared `caution` export provides `cautionNote` and `cautionReporting` in both `en` and `cy`.
* `Object.keys(en).sort()` equals `Object.keys(cy).sort()` for the shared caution and `pdfCommon` objects, and for each of the 15 newly-touched package locale pairs.
* No `cy.ts` in any touched package contains the English caution string (guards against a copy-paste that drops the Welsh).
* No `[WELSH TRANSLATION REQUIRED: …]` placeholder is introduced by this change.

### 13.4 Per-generator tests — the three layout families

Rather than 40 near-identical test files, cover one representative of each rendering shape and rely on §13.2 for the rest.

**Table-row family** (representative: `civil-and-family-daily-cause-list`)

* Given a case with a non-empty `formattedReportingRestriction`, the rendered HTML contains a `tr.restriction-row` immediately following that case's row, with `colspan="9"`, the bold `reportingRestrictions` label, and the court-supplied detail text verbatim.
* Given a case with an empty or absent `formattedReportingRestriction`, no `restriction-row` is emitted — specifically, no empty grey row.
* Given a list where every case is unrestricted, the document contains zero `restriction-row` elements.

**Conditional-colspan case** (`crown-daily-list`)

* With `session.hasListingNotes` true, the restriction row's `colspan` is 6; with it false, 5. Asserted both ways, because a wrong colspan produces a grey block that stops short of the table edge.

**Two-cell case** (`magistrates-public-list`)

* The two-cell restriction layout is preserved with its joined border, and both cells take the grey background from classes rather than inline styles.

**Block family** (representative: `sjp-press-list`)

* A restricted offence renders inside `.restriction-block`, and the `#d4351c` `.restriction-tag` still renders on the grey background at full weight.

### 13.5 Caution box tests

* For each of the 15 previously-missing packages, the generated HTML contains a `.caution-box` holding both `cautionNote` and `cautionReporting` text.
* The caution box is the last block in the document, inside `.footer`, after the `dataSource` line.
* Given an artefact with **no** `dataSource`, the caution box still renders — the regression that would occur if it were placed inside the `{% if dataSource %}` block.
* Rendering with `locale: "cy"` produces the Welsh caution text, not the English.
* The assertion is on the caution *text*, not merely the presence of the `caution-box` element, so an empty grey box fails.

### 13.6 Warning icon tests (the 7 affected templates)

* The `!` glyph carries `aria-hidden="true"` and is accompanied by a visually-hidden "Warning" label.
* The `warning-icon`, `warning-row` and `warning-text` classes now resolve to declarations in `PDF_BASE_STYLES` (asserted via §13.1 rather than per-template).

### 13.7 End-to-end and regression

* Publish a fixture artefact for one list type from each layout family, download the PDF from `/hearing-lists/:locationId/:artefactId`, and confirm a 200 with `Content-Type: application/pdf`. Existing E2E coverage of the download journey must continue to pass unchanged — no new E2E test is warranted, since the change is not a new user journey.
* Byte-size check: no list type that was previously under `MAX_PDF_SIZE_BYTES` (2 MB) crosses it after the change.
* Full `yarn test` across all 43 list-type packages passes — the shared stylesheet edit touches every generator, so a broken selector surfaces broadly rather than locally.

### 13.8 Manual visual verification

Automated tests confirm markup and CSS; they cannot confirm the rendered PDF *looks* right. Before sign-off, generate and open one PDF per layout family and check:

* Restriction blocks are grey, and the grey spans the full table width with no gap at the right edge.
* No cream fill remains anywhere.
* The warning icon renders as a styled GOV.UK icon, not a bare `!`.
* The caution box sits at the foot of the last page and does not split across a page break.
* A monochrome print keeps restrictions identifiable by label and position.

---

## 14. Assumptions & Open Questions

### 14.1 Assumptions

* **`#f3f2f1` is the intended grey.** The issue says "grey background" without naming a colour. This spec assumes `govuk-colour("light-grey")` = `#f3f2f1`, on the evidence that it is what the on-screen views already use (`apps/web/src/assets/css/list-types/magistrates-public-list.scss:17`) and what the majority of PDF templates already use for `.info-box`, `.caution-box` and `th`. The 8 templates using cream `#fff7e6` are the outliers.
* **The cream `#fff7e6` was not a deliberate design decision.** It appears in exactly one rule, in a stylesheet composed by only 8 of 40 generators, and matches no GOV.UK token. Treated as drift. If a designer intentionally chose it to distinguish restrictions from other grey blocks, this whole change reverses that intent — see open question 1.
* **The caution message is required on every list type without exception.** The issue says "check the caution message at the end of each PDF to make sure it is there." 25 of 40 templates already have it and no pattern distinguishes the 15 that do not (they span crime, civil, family and tribunals), so the omission is read as oversight rather than policy.
* **Both caution paragraphs are required, not just `cautionNote`.** Every template that has a caution box has both. The 15 additions get both.
* **The approved Welsh already exists and is reusable.** The Welsh caution strings are present verbatim in 24 `cy.ts` files (e.g. `libs/list-types/rcj-standard-daily-cause-list/src/locales/cy.ts:133–136`). No new translation is commissioned; the `[TRANSLATE: …]` markers in §7 exist so the post-processing step can confirm a match against that approved text.
* **Puppeteer is not a contributing cause.** `printBackground: true` is already set (`libs/pdf-generation/src/generator.ts:12`), so backgrounds do render — the missing greys are missing CSS, not a suppressed print option. This was verified, not assumed, but is recorded because it is the first thing a reviewer will suspect.
* **`.restriction-row` can move from `PDF_CIVIL_FAMILY_STYLES` to `PDF_BASE_STYLES` without side effects.** The class name is not used for any non-restriction purpose in any of the 40 templates.
* **No shared Nunjucks partial is possible.** Each package's `build:pdf-templates` script copies only its own `src/pdf/*.njk` into its own `dist/pdf/`, and `configureNunjucks(templateDir)` accepts a single directory (`pdf-utilities.ts:25`). A cross-package `{% include %}` would resolve in dev and fail in production. Content is therefore shared via a locale export and styling via `pdf-styles.ts` — not via a partial. Changing this would require altering 40 build scripts and the Nunjucks loader configuration, which is a larger piece of work than this issue.
* **Existing stored PDFs are not regenerated.** PDFs are written to blob storage at publication time (`generatePublicationPdf`, `libs/publication/src/processing/service.ts:418`). Artefacts published before the fix keep their old rendering until they expire or are republished. Given that hearing lists are daily and short-lived, natural turnover resolves this within days — see open question 4.
* **`sjp-press-list` and `sjp-public-list` are in scope.** They have their own stylesheets and dedicated download routes, but they render reporting restrictions and are list types, so they are covered by both the styling fix and the guard test.
* **The two restriction-panel key families stay separate.** Crown and magistrates restriction guidance differs in substance. Unifying the keys is out of scope.
* **No database, migration, seed, or schema change.** Nothing in this change touches `list-type-data.ts`, Prisma schemas, or `PDF_GENERATOR_REGISTRY` keys. No numeric `listTypeId` is introduced anywhere.

### 14.2 Open questions

1. **Was cream `#fff7e6` a deliberate design choice?** *(Needs a designer, blocks nothing — proceed with grey unless contradicted.)* If restrictions were intentionally given a warmer fill to distinguish them from the grey `.info-box` and table headers, standardising on grey removes that distinction. The counter-argument is strong: the on-screen views use grey, so the PDF is currently inconsistent with the web page for the same data. Recommend proceeding with `#f3f2f1` and raising it in design review.

2. **Should the top-of-document restriction panel also be grey?** The 7 templates with a restriction panel use `.info-box`, which is already `#f3f2f1`. The issue's wording — "grey background for reporting restriction section" — could mean this panel rather than the per-case rows. This spec fixes both, so the ambiguity is resolved by covering the superset. Worth confirming with the reporter which they observed.

3. **Should `magistrates-public-list`'s two-cell restriction layout be normalised to a single full-width cell?** It is the only template using a 2 + 3 split with a joined border. Keeping it preserves an intentional-looking design; normalising it would let one class serve all table templates and simplify the guard test. This spec keeps it, treating layout change as out of scope.

4. **Do existing published artefacts need backfilling?** Regenerating stored PDFs for live artefacts would need a one-off script iterating current artefacts and re-invoking the generator. Recommendation: do not backfill. Hearing lists are daily and turn over naturally, and a backfill script is disproportionate for a cosmetic and minor-accessibility fix. Needs a product decision if any long-lived list types (e.g. weekly or warned lists) are considered material.

5. **Should `configureNunjucks` set `throwOnUndefined: true`?** It would eliminate the silent-empty-box class of bug (§10.2) permanently, but the 40 existing templates reference many legitimately-optional court fields, so enabling it now would break generation for sparse data. Proposed as a separate piece of work: audit optional field references, add `| default("")` where appropriate, then enable. Out of scope here; the guard test is the interim mitigation.

6. **Should the PDFs be properly tagged for accessibility?** Puppeteer emits no `/StructTreeRoot` and no `/Lang`, so all 40 PDFs are untagged and the Welsh ones do not declare their language (§12.4). This is a real WCAG gap affecting every list type and predates this issue. It needs its own ticket and probably a different generation approach or a post-processing step. Flagged, not fixed.

7. **Is the `iac-daily-list` context injection safe to remove?** Its generator injects `common: translations.common` into the render context (`libs/list-types/iac-daily-list/src/pdf/pdf-generator.ts:56`), which is the only reason its template's bare `{{ common.cautionNote }}` resolves. Normalising it to `t.common.cautionNote` lets the injection be deleted, but the same `common` key may be relied on elsewhere in that template. Needs a read of the whole template before removal; if in doubt, normalise the caution reference and leave the injection in place.

8. **Do any list types deliberately omit the caution message for a legal reason?** The assumption is that all 15 omissions are oversights. If a specific list type is published under a regime where the Special Category Data wording is inaccurate or misleading, the caution box would be wrong to add there. No evidence of this was found, but it warrants a confirmation from the publishing team before the guard test makes the caution box mandatory for every future list type.

9. **How should the guard test treat future non-list PDF templates?** The test walks all directories under `libs/list-types/`. If a package is ever added that has a `src/pdf/pdf-template.njk` which is not a court list (e.g. a cover sheet), it will fail the caution-box rule. The `validation/guard.test.ts` precedent skips only `common`; an explicit opt-out list may be needed later. Not needed now.


### Comment by OgechiOkelu on 2026-08-20T12:27:40Z

@plan 

