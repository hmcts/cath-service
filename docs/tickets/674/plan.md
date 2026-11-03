# Plan — Issue #674: Excel — Crown hearing lists

## 1. Technical Approach

The three Crown hearing list types are already fully implemented for on-screen
rendering and PDF generation. This ticket adds the **Excel** half only, for
**email attachment** — there is **no on-page download journey** (scope decision,
2026-09-23). This mirrors the magistrates lists, which generate Excel purely for
email attachment with no on-page download.

- **Excel generators** — follow the sibling PR **#970** (issue #675, Excel for the
  Magistrates adult-court lists, same author) and the `magistrates-standard-list`
  reference, using the shared helpers in `@hmcts/list-types-common`
  (`sanitiseCellValue`, `autoFitColumns`, `saveExcelToStorage`). #970 establishes
  the exact email-only shape: generator + test per lib, an `index.ts` export,
  `excelColumns` locale additions, and `EXCEL_GENERATOR_REGISTRY` entries — no
  journey pages.

Once each Crown artefact has an `.xlsx` blob, the existing notification path
attaches it and shows both file links in the email automatically (see AC 2 below).

### Post-#957 naming — verified against the repo (do NOT use the pre-#957 spec)

#957 has already landed on `feature-674`. The "Crown Warned List" is now
"Crown Advance List". Verified current names on disk:

| List type name (stable `@unique`) | Package | Locale exports | Renderer | Rendered return shape | PDF generator | Data type |
|---|---|---|---|---|---|---|
| `CROWN_DAILY_LIST` | `@hmcts/crown-daily-list` | `crownDailyListEn` / `crownDailyListCy` | `renderCrownDailyListData` | `{ header, openJustice, listData }` (`CrownDailyListRendered`) | `generateCrownDailyListPdf` | `CrownDailyListData` |
| `CROWN_FIRM_LIST` | `@hmcts/crown-firm-list` | `crownFirmListEn` / `crownFirmListCy` | `renderCrownFirmListData` | `{ header, openJustice, listData: null, groupedListData }` (`CrownFirmGroupedDay[]`) | `generateCrownFirmListPdf` | `CrownFirmListData` |
| `CROWN_ADVANCED_PDDA_LIST` | `@hmcts/crown-advanced-pdda-list` | `crownAdvanceListEn` / `crownAdvanceListCy` | `renderCrownAdvanceListData` | `{ header, openJustice, groupedCategories }` (`GroupedHearingCategory[]`) | `generateCrownAdvanceListPdf` | `CrownAdvanceListData` |

Notes verified in code:
- The lib directory `libs/list-types/crown-warned-list/` still exists on disk but
  contains **only untracked `dist/`/`coverage/`/`node_modules/`** — no `src/`, not
  git-tracked. It is a stale build artefact. The live package is
  `@hmcts/crown-advanced-pdda-list` (dir `crown-advanced-pdda-list`).
- All three are registered in `PDF_GENERATOR_REGISTRY`
  (`libs/publication/src/processing/service.ts`) keyed by the stable name;
  `CROWN_ADVANCED_PDDA_LIST → generateCrownAdvanceListPdf`. **No PDF work required.**
- `EXCEL_GENERATOR_REGISTRY` currently holds `MAGISTRATES_PUBLIC_LIST`,
  `MAGISTRATES_STANDARD_LIST`, and the four SJP variants. No Crown entries yet.

### Why reuse the renderers

Each Excel generator calls the list type's existing renderer to get the
already-flattened, locale-aware, name-formatted rows, then writes one row per
leaf (per case/hearing). This keeps Excel and on-screen/PDF output consistent
(AC 3: uniform fields across Excel and PDF) and avoids re-deriving PDDA name /
date / custody formatting.

### Email notifications — no production code (AC 2)

`buildEmailDataWithFiles` already unconditionally attempts
`downloadBlob({artefactId}.xlsx)`. AC 2 ("links to both file types in the email")
is satisfied the moment a Crown artefact has an `.xlsx` blob — i.e. as soon as the
registry entries exist and a Crown artefact is (re)published.

### Sequencing / branch dependency — HARD dependency on #957

`feature-674` is built on top of the **#957** rename commits (`8506ec78`,
`b01224e9`, `17a4258b`), which are **not yet on `master`**. Verified with
`git ls-tree`:

- On **this branch**: `libs/list-types/crown-advanced-pdda-list/` exists;
  `EXCEL_GENERATOR_REGISTRY`/`PDF_GENERATOR_REGISTRY` key is `CROWN_ADVANCED_PDDA_LIST`;
  package `@hmcts/crown-advanced-pdda-list`, generator `generateCrownAdvanceListPdf`,
  type `CrownAdvanceListData`.
- On **`master`**: still `libs/list-types/crown-warned-list/` and
  `CROWN_WARNED_LIST` / `@hmcts/crown-warned-list` / `generateCrownWarnedListPdf` /
  `CrownWarnedListData`.

Therefore the third Crown Excel generator (`crown-advanced-pdda-list`) targets a
package + registry key that **do not exist on `master`**. **#674 must not be
rebased onto a `master` that lacks #957**, and it cannot merge to `master` before
#957 does (or it must carry the #957 commits with it). `crown-daily-list` and
`crown-firm-list` kept their names and exist on both.

The shared Excel helpers (`saveExcelToStorage`, `autoFitColumns`,
`sanitiseCellValue` in `@hmcts/list-types-common`) are already on `master`, so #674
does **not** depend on #970 (issue #675) landing first — #970 is a pattern
reference only.

- `EXCEL_GENERATOR_REGISTRY` currently holds `MAGISTRATES_PUBLIC_LIST`,
  `MAGISTRATES_STANDARD_LIST`, and the four SJP variants. No Crown entries yet.

## 2. Implementation Details

**TEMPLATE SOURCE: n/a** — this ticket adds Excel generators only for email
attachment. No new rendered page and no on-page download journey; the three Crown
rendering pages already exist.

**Direct precedent — PR #970 (issue #675, Excel for Magistrates, same author).**
That PR adds Excel download to the Magistrates adult-court lists with the *exact*
email-only shape this plan targets: no journey pages at all, just per-lib
`src/excel/excel-generator.ts` (+ `.test.ts`), one `index.ts` export line,
`excelColumns` added to `en.ts`/`cy.ts`, and registry entries in
`libs/publication/src/processing/service.ts`. Follow #970 (and
`magistrates-standard-list`) verbatim; the only per-list differences are the
column set and the row-flattening loop.

### 2a. Excel generators (three, one per lib)

Create in each lib, mirroring #970's `magistrates-adult-court-list/src/excel/excel-generator.ts`:

- `libs/list-types/crown-daily-list/src/excel/excel-generator.ts`
  → `export async function generateCrownDailyListExcel(options): Promise<ExcelGenerationResult>`
- `libs/list-types/crown-firm-list/src/excel/excel-generator.ts`
  → `export async function generateCrownFirmListExcel(options)`
- `libs/list-types/crown-advanced-pdda-list/src/excel/excel-generator.ts`
  → `export async function generateCrownAdvanceListExcel(options)`

Each `options` shape (matches #970's `ExcelGenerationOptions` and `GenerateExcelParams`):
`{ artefactId, locationId, contentDate, locale, listTypeName, jsonData }`. Each
returns `{ success: boolean, excelPath?, error? }`. Structure, following #970 exactly:

1. `try { ... } catch (error)` wrapping the whole body; on failure return
   `{ success: false, error: `Failed to generate <List> Excel: ${message}` }`.
2. Import the shared helpers: `import { autoFitColumns, sanitiseCellValue, saveExcelToStorage } from "@hmcts/list-types-common";` and `import ExcelJS from "exceljs";`.
3. Declare `const MAX_SHEET_NAME_LENGTH = 31;` and a `SHEET_NAME` const per list; add
   the worksheet with `workbook.addWorksheet(SHEET_NAME.slice(0, MAX_SHEET_NAME_LENGTH))`
   (matches #970 — guards ExcelJS's 31-char limit rather than relying on manual counting).
4. Select locale content (`const t = locale === "cy" ? cyLocale : enLocale;
   const cols = t.excelColumns;`).
5. `const { listData } = await render<List>Data(jsonData, { locationId, contentDate, locale });`
   (or `groupedListData` / `groupedCategories` per renderer — see §2a column mappings).
6. `const headerRow = worksheet.addRow([ cols.* … ]); headerRow.font = { bold: true };`
7. Nested loops flattening to one row per case; every cell wrapped in
   `sanitiseCellValue(...)`. Coalesce optional strings to `""` at the call site.
8. `autoFitColumns(worksheet);`
9. `const buffer = await workbook.xlsx.writeBuffer();
   const { excelPath } = await saveExcelToStorage(artefactId, Buffer.from(buffer));
   return { success: true, excelPath };`

Worksheet names (all ≤ 31 chars, still `.slice`d defensively per #970): `Crown Daily List`,
`Crown Firm List`, `Crown Advance List`.

**Column mappings (AC 4/5/6 — uniform Excel & PDF fields):**

Crown Daily List (`CrownDailyListRendered`) — one row per
`courtLists[].courtHouse.courtRoom[].session[].sittings[].hearing[].case[]`:
`Court House` (courtHouse.courtHouseName), `Court Room` (courtRoom.courtRoomName),
`Judge` (session.formattedJudiciaries), `Sitting at` (**sitting.time**, from
`SittingAt`), `Hearing Time` (**case.timeMarkingNote**, from `TimeMarkingNote`),
`Case Reference` (case.caseNumber), `Defendant Name(s)` (case.defendants),
`Hearing Type` (hearing.displayHearingType), `Prosecuting Authority`
(case.prosecutingAuthority), `Listing Notes` (case.listingNotes).

> The two time columns are **distinct fields**, confirmed against upstream
> pip-data-management (`CrownPddaListHelper`): `sittingAt` = the sitting start
> time (`formatSittingTime(sitting, SITTING_AT)`), `hearingTime` = the per-hearing
> time-marking note. The cath-service renderer exposes both — `sitting.time`
> (`renderer.ts:108`, from `SittingAt`) and `case.timeMarkingNote`
> (`renderer.ts:126`, from `TimeMarkingNote`). Map them to separate columns; do
> not duplicate `sitting.time` into both.

Crown Firm List (`CrownFirmGroupedDay[]`) — one row per
`groupedListData[].sittings[].hearing[].case[]`:
`Date` (groupedDay.day), `Court House` (groupedDay.courtHouseInfo.name),
`Court Room` (sitting.courtRoomName), `Judge` (sitting.formattedJudiciaries),
`Sitting at` (**sitting.time**, from `SittingAt`), `Hearing Time`
(**case.timeMarkingNote**, from `TimeMarkingNote`), `Case Number` (case.caseNumber),
`Defendant Name(s)` (case.defendants), `Hearing Type` (hearing.displayHearingType),
`Representative` (case.representative), `Prosecuting Authority`
(case.prosecutingAuthority), `Listing Notes` (case.listingNotes). Same two-time-column
distinction as Crown Daily — verified `renderer.ts:147` (`time`) vs `renderer.ts:122`
(`timeMarkingNote`).

Crown Advance List (`GroupedHearingCategory[]`) — one row per
`groupedCategories[].cases[]`:
`Hearing` (category), `Fixed For` (row.fixedFor), `Case Reference`
(row.caseNumber), `Defendant Name(s)` (**`${row.isInCustody ? "*" : ""}${row.defendants}`**),
`Prosecuting Authority` (row.prosecutingAuthority), `Linked Cases` (row.linkedCases),
`Listing Notes` (row.listingNotes).

> **Custody handling — RESOLVED (2026-09-23):** replicate the PDF exactly. The PDF
> prefixes the defendant name with `*` when `case.isInCustody` and explains it in a
> preamble (`pdf-template.njk:97`, locale `preStatementSuffix4:
> "*denotes a defendant in custody"`). The AC lists exactly 7 fields with no custody
> column, and AC 3 requires columns uniform with the PDF — so **do not add an
> "In custody" column**. Emit the `*` prefix on the defendant cell (still passed
> through `sanitiseCellValue`, which prefixes `'` when a value starts with `*`? no —
> `*` is not in the injection set `= + - @`, so the asterisk survives untouched).
> Add the custody legend as a single cell/row beneath the data (reusing
> `preStatementSuffix4`) so the asterisk is explained, since a spreadsheet has no
> preamble. `row.isInCustody` is derived in `renderer.ts:110-129` from
> `CustodyStatus ∈ {"On remand","In custody","In care"}`.

### 2b. Locale additions

Add an `excelColumns` block (as #970 did for the Magistrates adult-court locales)
to both `en.ts` and `cy.ts` in each lib's `src/locales/`. English strings taken
verbatim from the AC field lists. Welsh values placeholder-tagged
`[WELSH TRANSLATION REQUIRED: '...']` per CLAUDE.md until content supplies
translations. `en`/`cy` key parity must hold.

Where a Crown lib exports split Daily/Future-style locale objects (as MACL does
with `enDaily`/`enFuture`), add `excelColumns` to the shared base so both inherit
it. The Crown libs currently export a single `en`/`cy` each — confirm at
implementation time and match whatever the lib already does.

### 2c. Export generators from each lib `index.ts`

Add one export line per lib, alongside the existing exports (exactly as #970 added
`export { generateMagistratesAdultCourtListExcel } from "./excel/excel-generator.js";`):
- `export { generateCrownDailyListExcel } from "./excel/excel-generator.js";`
- `export { generateCrownFirmListExcel } from "./excel/excel-generator.js";`
- `export { generateCrownAdvanceListExcel } from "./excel/excel-generator.js";`

### 2d. Register in EXCEL_GENERATOR_REGISTRY

In `libs/publication/src/processing/service.ts` (verified against current code):
- Extend the three existing Crown imports (lines 10-12, which already import the
  `Crown*Data` types + PDF generators) to also import the Excel generators — exactly
  as #970 extended the two Magistrates adult-court imports. e.g.
  `import { type CrownDailyListData, generateCrownDailyListExcel, generateCrownDailyListPdf } from "@hmcts/crown-daily-list";`
- Add three entries to `EXCEL_GENERATOR_REGISTRY` (line 371 region), keyed by stable
  name:
  ```
  CROWN_DAILY_LIST:          (p) => generateCrownDailyListExcel({ ...p, jsonData: p.jsonData as CrownDailyListData }),
  CROWN_FIRM_LIST:           (p) => generateCrownFirmListExcel({ ...p, jsonData: p.jsonData as CrownFirmListData }),
  CROWN_ADVANCED_PDDA_LIST:  (p) => generateCrownAdvanceListExcel({ ...p, jsonData: p.jsonData as CrownAdvanceListData }),
  ```
- The `{ ...p }` spread carries `listTypeName` (from `GenerateExcelParams`,
  service.ts:342) into each generator, matching #970. The Crown generators each
  serve a single list type, so — unlike MACL, which branches DAILY vs FUTURE on
  `listTypeName` — they accept the param but do not need to branch on it.
- No change to `listTypeHasExcel` / `generatePublicationExcel` / `processPublication`;
  registration alone activates Excel + the PDF+Excel email template for these types.

### 2e. On-page download journey — OUT OF SCOPE

Email-only for now (scope decision, 2026-09-23). No `download.ts`,
`list-download-disclaimer`, or `list-download-files` pages; no `downloadCopy`
button on the render pages; no `disclaimer`/`downloadFiles` locale blocks. The
`.xlsx` is delivered solely as an email attachment via the existing notification
path (2d + AC 2). An on-page journey can be added later by following the SJP
pattern (`apps/web/src/pages/(list-types)/sjp-download-shared.ts`) if required.

### 2f. Files summary

Create:
- `libs/list-types/crown-daily-list/src/excel/excel-generator.ts` (+ `.test.ts`)
- `libs/list-types/crown-firm-list/src/excel/excel-generator.ts` (+ `.test.ts`)
- `libs/list-types/crown-advanced-pdda-list/src/excel/excel-generator.ts` (+ `.test.ts`)

Edit:
- three lib `index.ts` (export generator)
- three lib `locales/en.ts` + `cy.ts` (add `excelColumns` only)
- `libs/publication/src/processing/service.ts` (imports + 3 registry entries)

No changes to the Crown render pages or their templates.

### 2g. API / DB

- **No API endpoints** and no new routes — Excel is generated in the publication
  pipeline (`processPublication`) and delivered by email, not via HTTP.
- **No DB schema changes.** No new Prisma models, no `list_type` changes — the
  three list types already exist and are seeded via `list-type-data.ts`.

## 3. Error Handling & Edge Cases

- **Formula/CSV injection** — every cell wrapped in `sanitiseCellValue`, which
  prefixes `'` when a value starts with `= + - @`. Non-negotiable for all columns,
  including free-text fields (defendant names, listing notes, representative).
- **Empty lists** — a Crown artefact with no court lists/cases produces a workbook
  with only the header row. `autoFitColumns` handles empty columns
  (`worksheet.columns ?? []`). No crash; a header-only spreadsheet is acceptable.
- **Generator failure** — `try/catch` returns `{ success: false, error }`;
  `generatePublicationExcel` logs a warning and returns `{}` so the publication
  pipeline continues (PDF/notifications unaffected). Consistent with MSL/SJP.
- **Custody asterisk (Crown Advance)** — RESOLVED. Replicate the PDF: prefix the
  defendant cell with `*` when `row.isInCustody`, and add the custody legend
  (`preStatementSuffix4`, "*denotes a defendant in custody") as a cell/row beneath
  the data so the asterisk is explained without a preamble. No separate "In custody"
  column — the AC lists 7 fields and AC 3 requires PDF-uniform columns. Note `*` is
  not in `sanitiseCellValue`'s injection set (`= + - @`), so the prefix survives.
- **Missing blob on download** — `handleBlobDownload` returns 404 when
  `downloadBlob` yields null; `getAvailableFiles` omits absent types so the file
  list only shows what exists (empty list → 404 render). Reused verbatim from SJP.
- **Access control** — `requireVerified` gates all journey routes; disclaimer and
  file-list handlers additionally run `checkArtefactDataAccess`
  (ACCESS_DENIED → 403, otherwise not-found). Invalid/absent `artefactId` → 400
  (UUID regex). Reused verbatim from SJP.
- **Locale/Welsh** — a Welsh `.xlsx` is only produced when the artefact is
  published with `locale: "cy"` (same limitation as the PDF). See CLARIFICATION #5.
- **Pre-existing gap (flagged, not fixed here)** — `processPublication` passes
  `listTypeName: pdfResult.listTypeName ?? ""`. If PDF generation throws before
  resolving the list type name, Excel is silently skipped. Affects every
  Excel-enabled list type, not just Crown; out of scope for #674.

## 4. Acceptance Criteria Mapping

| AC | How satisfied | Verification |
|---|---|---|
| Excel + PDF downloadable for Crown lists | PDF already registered; add 3 Excel generators + 3 registry entries; both delivered as email attachments | Unit tests on each generator; manual publish + confirm both files attach to the email |
| Links to both file types in email | No new code — `buildEmailDataWithFiles` picks up the `.xlsx` blob once it exists | Publish a Crown artefact with a subscription; assert email contains PDF + Excel links |
| Uniform fields across Excel and PDF | Generators reuse the same renderers that feed the PDF/on-screen output | Column-mapping review against PDF template; generator unit tests assert header + row values |
| Crown Daily fields (10 listed) | `excelColumns` header + row mapping in 2a | Generator test asserts each column present and populated |
| Crown Firm fields (12 listed) | `excelColumns` header + row mapping in 2a | Generator test asserts each column, incl. `Date` and `Representative` |
| Crown Advance fields (7 listed) | `excelColumns` header + row mapping in 2a | Generator test asserts each column, incl. `Linked Cases` + custody handling |
| Dependent on #957 | #957 already landed; plan targets the post-rename name `CROWN_ADVANCED_PDDA_LIST` | Registry entry uses the stable name; verified against `PDF_GENERATOR_REGISTRY` |

Verification approach overall: Vitest unit tests co-located with each generator
(assert header row, per-row values, Welsh headers via the `cy` locale,
`sanitiseCellValue` applied, empty-list header-only output); registry/pipeline
tests confirming `generatePublicationExcel` dispatches each Crown name to its
generator and `processPublication` still completes when a generator fails; plus a
manual publish of each Crown list type confirming the `.xlsx` attaches to the
subscription email alongside the PDF. No page/controller, `.njk`, or E2E tests —
there is no UI change.

## 5. CLARIFICATIONS

### Resolved

- **Scope: email attachment only** (2026-09-23). No on-page download journey.
  Section 2e is out of scope; the plan covers three Excel generators, three
  registry entries, and `excelColumns` locale additions only.
- **Custody asterisk (Crown Advance)** (2026-09-23, verified against
  pip-data-management + cath-service code). Replicate the PDF: `*` prefix on the
  defendant cell when `row.isInCustody`, plus the `preStatementSuffix4` legend as a
  cell/row beneath the data. No "In custody" column (breaks the 7-field AC list and
  PDF column parity). See §2a and §3.
- **Two time columns for Crown Daily/Firm** (2026-09-23, verified against
  pip-data-management `CrownPddaListHelper`). `Sitting at` and `Hearing Time` are
  genuinely distinct: `sittingAt` (sitting start) vs `hearingTime` (per-hearing
  time-marking note). Map `Sitting at` → `sitting.time` and `Hearing Time` →
  `case.timeMarkingNote`. Both Crown Daily and Crown Firm renderers already expose
  both. See §2a.

### Still open

1. **Crown Firm List layout** — one sheet with a `Date` column (plan default), or
   one worksheet per sitting day?

2. **Welsh spreadsheets.** A Welsh `.xlsx` is only produced when the artefact is
   published with `locale: "cy"` — same limitation as the existing PDF. Confirm
   this is acceptable and no separate Welsh generation is expected.

3. **Notify link text is hardcoded English** (`"Download Excel version"`).
   Pre-existing across every list type — separate ticket, or fold in here?

4. **Audit logging.** Assumed out of scope unless told otherwise.

5. **Backfill.** Crown artefacts published before this change will have no `.xlsx`.
   Plan specifies no backfill (they get one on next publish/republish). Confirm.

6. **Environment config.** Confirm `GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION_PDF_EXCEL`
   is set in every environment — `getSubscriptionTemplateId` throws when it is
   missing, which would break the notification path once Crown `.xlsx` blobs exist.
</content>
</invoke>
