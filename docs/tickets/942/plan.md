# Technical Plan: #942 Excel download for SSCS Daily Hearing Lists

## 1. Technical Approach

### Decision (settled)
#942 builds on #940's uploaded-workbook reformatter. When an SSCS list is published through the non-strategic **Excel** upload, the uploaded workbook is reused. It is reloaded, cleaned and saved as `{artefactId}.xlsx` in `CONTAINER.PUBLICATIONS`. Notifications already pick that file up, so the email offers PDF and Excel links.

Working branch: `feature/942-sscs-excel-download`, stacked on `feature/940-rcj-excel-download` (`969df726`). All file references below are to the working tree.

### User decisions (authoritative)
- **A. JSON fallback is required.** When an SSCS list is published as JSON (no uploaded workbook: the non-strategic upload JSON branch, or `POST /publication`), an Excel **must** be generated from the JSON. When a workbook was uploaded, the reformat-the-upload behaviour stays. This supersedes the earlier "accept the gap" default (old Clarification 2).
- **B. Liverpool is out of scope** pending the user's investigation. No Liverpool list type is added. #942 covers the **7** existing SSCS list types (old Clarification 3).

### What #942 does
1. **SSCS config.** A thin `reformatSscsDailyHearingListExcel` in `libs/list-types/sscs-daily-hearing-list`, the same pattern as `libs/list-types/rcj-standard-daily-cause-list/src/excel/excel-reformatter.ts`. It reuses `SSCS_EXCEL_CONFIG.fields` from the converter and is registered by `listTypeName` for all 7 SSCS list types.
2. **SSCS JSON generator (decision A).** `generateSscsDailyHearingListExcel` builds the workbook from the JSON when there is no upload. See §2.6.
3. **Harden the shared reformatter and conversion.** This fixes the #940 review's CRITICAL and HIGH findings, which SSCS would otherwise inherit. It also applies to the 10 RCJ lists already wired to the reformatter.
4. **Stale-xlsx handling.** Keep #940's delete-on-republish for lists without a JSON fallback (RCJ, London Admin, CoA Civil). For SSCS a JSON republish overwrites the xlsx with a freshly generated one, and a failed generation still deletes the stale file. Close the one other republish route that can reach an SSCS artefact.

### Already in place (from #940 and master)
| Piece | Location |
|---|---|
| Upload buffer passed through | `apps/web/src/pages/(admin)/non-strategic-upload-summary/index.ts:128,138,176`. Set for **any** non-strategic list with a registered converter, so SSCS needs **no `apps/` change** |
| `uploadedExcel` on `ProcessPublicationParams` / `GenerateExcelParams` | `libs/publication/src/processing/service.ts:364,613,643,685` |
| Generator factory: delete stale xlsx when there is no upload or on failure, otherwise reformat and save | `service.ts:735-753` (`createUploadedExcelGenerator`) |
| Reformatter | `libs/list-types/common/src/excel/uploaded-workbook-reformatter.ts` |
| Email finds `{artefactId}.xlsx` for every list type and picks the PDF+Excel template | `libs/notifications/src/notification/notification-service.ts:513`, `libs/notifications/src/govnotify/template-config.ts:38-43` |
| Public download | `GET /api/flat-file/:artefactId/download?format=excel` (`libs/public-pages/src/flat-file/flat-file-service.ts:81-108`) |

### What gets reformatted for SSCS
- **Sheet.** `convertExcelToJson` reads `workbook.worksheets[0]` (`libs/list-types/common/src/conversion/excel-to-json.ts:60`), so the config is `{ worksheetIndex: 0 }` with no name.
- **Fields.** The 9 entries in `SSCS_EXCEL_CONFIG.fields` (`libs/list-types/sscs-daily-hearing-list/src/conversion/sscs-config.ts:3-59`). Uploaded headers are matched case-insensitively against:
  - "Venue"
  - "Appeal Reference Number"
  - "Hearing Type"
  - "Appellant"
  - "Courtroom"
  - "Hearing Time"
  - "Tribunal"
  - "FTA/Respondent"
  - "Additional Information"
- **Headers.** Replaced with `t.tableHeaders[fieldName]` from `src/locales/en.ts` / `cy.ts`, the same object the PDF uses (`src/pdf/pdf-template.njk:30-38`), and made bold.
- **Values.** The SSCS PDF does no value formatting. `renderSscsDailyHearingListData` returns `hearings` unchanged (`src/rendering/renderer.ts:33`) and the template prints the raw strings. So `formatRow` is the identity, and each mapped cell becomes `readCellValue(cell.value)`, the same string the PDF shows:
  - trimmed
  - dates as `dd/mm/yyyy`
  - rich text, hyperlinks and formulas flattened by the fixed `readCellValue` (§2.2)

  This differs from RCJ, where `normaliseHearing` turns `10.30` into `10:30`. No time normalisation is applied for SSCS, because the PDF applies none.
- **Locale.** `uploadData.language === "WELSH"` gives `cy`. Sheet names stay as uploaded. The reformatter never creates or renames sheets. The JSON fallback names its sheet from the new `excelWorksheetName` key (§2.6).

### Defaults for unknown columns and unmapped sheets: drop them
The #940 code keeps every column and sheet it does not recognise. The review (CRITICAL 1) recommends dropping them, and #942 makes that the default for every list on the reformatter:
- **The PDF is an allow-list, and the Excel must not show more.** Court staff keep working notes, internal flags and hidden sheets in these workbooks. Our lists are public and the file is sent to every subscriber.
- **AC2 is still met.** The uploaded file is reused: its sheet names, column order, row order, column widths, row heights and the styling of the known data are kept.
- **AC3 only asks that PDF fields appear in the Excel**, not anything more.
- **If the PO wants unknown columns kept**, the alternative is one switch (`keepUnmappedColumns`): copy them as values, formulas replaced by results, sanitised, never styled as headers. See Clarification 1.

### How the cleaning is done: copy what is allowed into a new workbook
CRITICAL 1 and HIGH 1 are fixed by copying only allowed content from the loaded upload into a **new** `Workbook`, instead of stripping things out of the uploaded one:
- For each config-resolved sheet, in config order, `addWorksheet(sourceSheet.name)`. New sheets are always visible.
- For each source row, copy only mapped columns, packed left in their uploaded order:
  - the cell value (header gets the localised heading, data gets the formatted value through `sanitiseCellValue`)
  - the cell `style`, cloned
  - the column width and the row height
- Never copy:
  - `hidden` on rows or columns
  - `note`
  - formulas
  - merges
  - data validations
  - conditional formats
  - images
  - `headerFooter`
  - defined names
  - workbook properties
  - non-resolved sheets
- Freeze the header row (`views: [{ state: "frozen", ySplit: 1 }]`). This is review suggestion 9, for keyboard and magnifier users.

Why copy rather than strip in place: stripping only removes the things someone remembered to list. It would miss `headerFooter` (which can hold names), defined names, data validations pointing at hidden sheets, and images. ExcelJS `spliceColumns` is also unreliable with merges and shared styles. With a copy, nothing reaches the output unless the code chose to write it.

### SSCS publications that arrive as JSON (decision A)
SSCS lists can also be published without a workbook:
- through the non-strategic upload JSON branch (`non-strategic-upload-summary/index.ts:150-158`, where `uploadedExcel` stays `undefined`)
- through `POST /publication` (`libs/api/src/blob-ingestion/repository/service.ts:25-55` on `origin/master`; the branch still has the pre-#1026 version)

The user decided these **must** get an Excel too (AC1, "all SSCS hearing lists"). With no `uploadedExcel`, the SSCS registry entry falls back to `generateSscsDailyHearingListExcel`, which builds a 9-column workbook from the JSON (§2.6). This is a difference from RCJ, London Admin and CoA Civil, which keep #940's behaviour (no upload: delete any stale xlsx, PDF-only).

### Dependency on PR #1122 and merge order
- #942 is **stacked on #1122**. It needs the reformatter, the `uploadedExcel` passthrough and `createUploadedExcelGenerator`, none of which are on master.
- **Overlap.** The reformatter and `readCellValue` fixes here are #1122's own review follow-ups (CRITICAL 1, HIGH 1, HIGH 2, suggestions 1, 3, 5 and 9). They must be done **once**. Agree with #1122's owner that #1122 does not fix them separately.
- **Exposure window.** If #1122 merges and deploys before #942, RCJ uploads are published with the CRITICAL leak until #942 lands. Build #942 as **two commits**:
  1. `fix(940): harden uploaded-workbook reformatter and cell reading`. List-agnostic, includes the updated RCJ tests.
  2. `feat(942): SSCS Excel download`.

  Preferred: cherry-pick commit 1 into #1122 before it merges. Otherwise merge #942 straight after #1122, with no release in between.
- **Merge order:** #1122 to master, then rebase #942, then merge #942.
- **Rebase after #1122 merges.** If it is squash-merged, drop the #940 commit:
  `git fetch origin && git rebase --onto origin/master 969df726 feature/942-sscs-excel-download`
  If commit 1 was cherry-picked into #1122, it drops out as empty. If #1122 is merge-committed, a plain `git rebase origin/master` is enough.
- **Force-push.** `origin/feature/942-sscs-excel-download` holds only an old docs commit (`0c511850`, the superseded JSON-generation plan). Pushing this branch needs `git push --force-with-lease`, which replaces it. Nothing of value is lost.

### Rebase conflicts with newer master
This branch is based on `56b60967`, 4 commits behind `origin/master`:
- `26c0988b`
- `72c914ff` (Feature-698 provenance)
- `b77e22b4` (#901 no-match)
- `0c5674a9` (#1026 Inbound Publication API)

`git merge-tree origin/master 969df726` reports **no textual conflicts**. Files changed on both sides, and what to check after the rebase:

| File | Master change | Check |
|---|---|---|
| `libs/publication/src/processing/service.ts` | Crown keys renamed to `CROWN_*_PDDA_LIST` (`:206-208`); `displayFrom` / `displayTo` now `Date \| null` in `GeneratePdfParams` / `ProcessPublicationParams`; third-party push no longer defaults them to `new Date()` | Auto-merges next to `uploadedExcel`. Typecheck afterwards |
| `libs/publication/src/processing/service.test.ts` | Crown name updates | Auto-merges. Run the tests |
| `apps/web/src/pages/(admin)/non-strategic-upload-summary/index.ts` | `noMatch: false` removed from `createArtefact` (no_match column dropped) | Auto-merges next to `uploadedExcel`. #940's `index.test.ts` must not expect `noMatch` (verified: it does not) |
| `libs/list-types/common/src/index.ts` | New `assertValidProvenances, PUBLISHER_PROVENANCES` export on the line after `excel-utilities` | Lines next to #940's reformatter export. Keep both |
| `e2e-tests/utils/seed-list-types.ts` | Crown renames | Separate from #940's CoA Civil rename |
| `yarn.lock` | Both sides | Run `yarn install` if it conflicts |
| `libs/publication/src/repository/queries.ts` (not in #940) | `createArtefact` now also supersedes on **provenance** (`:38-49`) | #940's stale-xlsx reasoning still holds, but now only when the API publication uses `MANUAL_UPLOAD`. See §3 |

## 2. Implementation Details

TEMPLATE SOURCE: n/a

No new pages, routes, templates, API endpoints, Prisma schema or migrations. No `apps/` changes. No changes to `libs/notifications`.

### File structure
```
libs/list-types/common/src/
├── conversion/excel-to-json.ts                       CHANGED  readCellValue fix; header row read by column
├── conversion/excel-to-json.test.ts                  CHANGED
└── excel/
    ├── uploaded-workbook-reformatter.ts              CHANGED  allow-list copy into new workbook
    └── uploaded-workbook-reformatter.test.ts         CHANGED

libs/list-types/sscs-daily-hearing-list/
├── package.json                                      CHANGED  dependencies: "exceljs": "4.4.0" (runtime, for the JSON generator)
└── src/
    ├── index.ts                                      CHANGED  export the reformatter and the JSON generator
    ├── locales/en.ts, cy.ts                          CHANGED  excelWorksheetName
    └── excel/
        ├── excel-reformatter.ts                      NEW
        ├── excel-reformatter.test.ts                 NEW
        ├── excel-generator.ts                        NEW      JSON fallback (§2.6)
        └── excel-generator.test.ts                   NEW

libs/list-types/rcj-standard-daily-cause-list/src/excel/excel-reformatter.test.ts          CHANGED  unknown column now dropped
libs/list-types/london-administrative-court-daily-cause-list/src/excel/excel-reformatter.test.ts   CHANGED  if it asserts unmapped content
libs/list-types/court-of-appeal-civil-daily-cause-list/src/excel/excel-reformatter.test.ts        CHANGED  if it asserts unmapped content

libs/publication/src/processing/
├── service.ts                                        CHANGED  register 7 SSCS names; move factory; optional JSON fallback; no-jsonData stale delete
└── service.test.ts                                   CHANGED

e2e-tests/tests/admin/non-strategic-upload.spec.ts    CHANGED  SSCS step in the existing @nightly Excel journey
```

### 2.1 NEW `libs/list-types/sscs-daily-hearing-list/src/excel/excel-reformatter.ts`
```ts
import { reformatUploadedWorkbook } from "@hmcts/list-types-common";
import { SSCS_EXCEL_CONFIG } from "../conversion/sscs-config.js";
import { cy } from "../locales/cy.js";
import { en } from "../locales/en.js";

export async function reformatSscsDailyHearingListExcel(buffer: Buffer, locale: string): Promise<Buffer> {
  const t = locale === "cy" ? cy : en;

  // The SSCS PDF prints the converted values as they are, so rows need no extra formatting
  return reformatUploadedWorkbook(buffer, [
    { worksheetIndex: 0, fields: SSCS_EXCEL_CONFIG.fields, headers: t.tableHeaders, formatRow: (row) => row }
  ]);
}
```
Export it from `src/index.ts` with `export { reformatSscsDailyHearingListExcel } from "./excel/excel-reformatter.js";`.

### 2.2 CHANGED `libs/list-types/common/src/conversion/excel-to-json.ts` (HIGH 2, suggestion 3)
- `readCellValue(value)` (`:24-27`) returns a trimmed string for every ExcelJS value shape:
  - `Date`: `dd/mm/yyyy` (unchanged)
  - `{ richText: [{ text }] }`: the `text` parts joined
  - `{ text, hyperlink }`: `readCellValue(text)`. `text` can itself be rich text
  - `{ formula | sharedFormula, result }`: `readCellValue(result)`. A missing result gives `""`
  - `{ error: "#N/A" }`, and any other object: `""`. A broken formula in a required column then fails the upload with the existing "Missing required field" message, rather than publishing `#REF!` or `[object Object]`
  - primitives: `String(value)`, as now
- Header row (`:69-72`): read with `headers[colNumber - 1] = readCellValue(cell.value)` instead of `headers.push(String(cell.value ?? ""))`. This does two things:
  - Rich-text headers are recognised.
  - A blank header cell no longer shifts later columns. Before, the PDF (positional) and the reformatter (by `colNumber`) disagreed.
- Keep the private helper `formatDateValue` below the exported functions, in the order it is used.

Effect: every Excel-converted list (all non-strategic lists, through `convertExcelToJson` and `convertSheetToJson`) stops writing `"[object Object]"` into the JSON, the PDF and the on-screen list. This is a behaviour fix, covered by tests.

### 2.3 CHANGED `libs/list-types/common/src/excel/uploaded-workbook-reformatter.ts` (CRITICAL 1, HIGH 1)
`reformatUploadedWorkbook(buffer, sheets)` keeps its signature. New algorithm:
```
source = load(buffer)
output = new Workbook()                                  // no properties copied (creator, lastModifiedBy, company, manager,
                                                         // title, subject, keywords, description stay unset)
seen = Set<Worksheet>()
for config in sheets:
  ws = resolveWorksheet(source, config)                  // kept even if the upload hid it: it fed the PDF
  if !ws or seen.has(ws): continue
  fieldByCol = map header cells via findFieldForHeader(config.fields, readCellValue(cell.value))
  if fieldByCol is empty: continue                       // unrecognised or empty sheet: dropped
  seen.add(ws)
  target = output.addWorksheet(ws.name)                  // visible by default
  targetCols = mapped source columns in uploaded order -> 1..n
  copy widths for targetCols; target.views = [{ state: "frozen", ySplit: 1 }]
  header row: heading = config.headers[field] ?? source text; style = clone(source style) + bold
  each data row (ws.eachRow, rowNumber > 1, hidden rows included and so unhidden; the PDF includes them):
    raw = { field: readCellValue(cell.value) } for mapped cols; formatted = config.formatRow(raw)
    target cell = sanitiseCellValue(formatted[field] ?? ""); style = clone(source cell style); row height copied
if output.worksheets.length === 0: throw new Error("No recognised worksheet to reformat")
return Buffer.from(await output.xlsx.writeBuffer())
```
- **Notes, formulas, hyperlinks, merges, validations, conditional formats, images, `headerFooter` and defined names** are never written, because only `value` (a plain string) and a cloned `style` are copied.
- **Every written value goes through `sanitiseCellValue`**, so values starting with `= + - @` get a leading `'`, the same as the other generators. The #940 test "rewritten values starting with formula characters as plain text" changes to expect the `'`.
- **`ReformatSheetConfig` extends the existing `WorksheetLocator`** (`multi-sheet-converter.ts:80-83`) instead of repeating `worksheetName` / `worksheetIndex` (review suggestion 4). Types stay at the bottom of the file.
- **Throwing on an empty output** goes to `createUploadedExcelGenerator`'s catch. The stale xlsx is deleted and the email falls back to PDF-only. A zero-sheet workbook will not open in Excel.

### 2.4 CHANGED `libs/publication/src/processing/service.ts`
1. Add `reformatSscsDailyHearingListExcel` to the existing `@hmcts/sscs-daily-hearing-list` import.
2. Move `createUploadedExcelGenerator` (`:735-753`) up, next to the Excel registry and before its first use (`:381`), as module ordering requires (review suggestion 5).
3. Give `createUploadedExcelGenerator(reformat, generateFromJson?)` an optional JSON fallback. With an upload it reformats and saves; without one it runs `generateFromJson` if given, otherwise returns `{ success: false }`. A thrown error becomes `{ success: false, error }`. Whenever the result is not a success, `${artefactId}.xlsx` is deleted from `CONTAINER.PUBLICATIONS`. RCJ, London Admin and CoA Civil pass no fallback, so their behaviour is unchanged.
   Add `const sscsExcelGenerator = createUploadedExcelGenerator(reformatSscsDailyHearingListExcel, (p) => generateSscsDailyHearingListExcel({ ...p, jsonData: p.jsonData as SscsDailyHearingList }));` and register it for:
   - `SSCS_MIDLANDS_DAILY_HEARING_LIST`
   - `SSCS_SOUTH_EAST_DAILY_HEARING_LIST`
   - `SSCS_WALES_AND_SOUTH_WEST_DAILY_HEARING_LIST`
   - `SSCS_SCOTLAND_DAILY_HEARING_LIST`
   - `SSCS_NORTH_EAST_DAILY_HEARING_LIST`
   - `SSCS_NORTH_WEST_DAILY_HEARING_LIST`
   - `SSCS_LONDON_DAILY_HEARING_LIST`
4. In `processPublication`, when there is no `jsonData` and `isUpdate` is true, delete `${artefactId}.xlsx` from `CONTAINER.PUBLICATIONS`. Log a failure and do not throw. This is review suggestion 1 for the flat-file route; see §3. With no JSON, no Excel generator can run, so any existing xlsx belongs to an earlier publication.

### 2.5 Unchanged
| Area | Reason |
|---|---|
| `apps/web` non-strategic upload | Already passes `uploadedExcel` for every converter-backed list |
| `libs/notifications` | Finds the blob and picks the template already. Covered by `template-config.test.ts:44,51,72` |
| `list-type-data.ts`, seed, converters | No new list type. Liverpool is out of scope pending the user's investigation (decision B) |

### 2.6 NEW `libs/list-types/sscs-daily-hearing-list/src/excel/excel-generator.ts` (decision A)
`generateSscsDailyHearingListExcel({ artefactId, locale, jsonData })` returns `{ success, excelPath?, error? }`, the same shape as the other JSON generators (for example `magistrates-public-list/src/excel/excel-generator.ts`):
- One worksheet named `t.excelWorksheetName`. New locale key: en `"SSCS Daily Hearing List"`, cy `"Rhestr Gwrandawiadau Dyddiol"`. Both are 31 characters or fewer and contain none of `* ? : \ / [ ]`, which ExcelJS rejects; a test enforces this. A `[WELSH TRANSLATION REQUIRED: ...]` placeholder would be rejected, so a real translation is used.
- Header row from `t.tableHeaders` in the PDF table order (`pdf-template.njk:30-38`), bold and frozen.
- One row per hearing. The PDF prints the JSON values unchanged (`renderer.ts:33`), so each value is written as is, through `sanitiseCellValue`.
- An empty hearing list gives a header-only sheet.
- `autoFitColumns`, then `saveExcelToStorage`. Any error is caught and returned as `success: false`, so the factory deletes the stale xlsx.

### API endpoints / Database
None.

## 3. Error Handling & Edge Cases

| Case | Behaviour |
|---|---|
| Republish of an Excel upload (same `artefactId`) | `saveExcelToStorage` overwrites. A reformat or save failure deletes the old xlsx (`createUploadedExcelGenerator`) |
| Republish as JSON (non-strategic JSON branch, or API with `MANUAL_UPLOAD` provenance, same court, date, language and list type) | **SSCS:** no `uploadedExcel`, so the xlsx is regenerated from the JSON and overwrites the old one; if generation fails the stale xlsx is deleted and the email is PDF-only. **RCJ, London Admin, CoA Civil:** the stale xlsx is deleted and the email is PDF-only (#940 behaviour). After the rebase, external provenances never share an `artefactId` with a manual upload, because `origin/master` `queries.ts:38-49` supersedes on provenance. The branch base does not yet |
| SSCS JSON with no hearings | Header-only sheet |
| Republish as a flat file through the API with `MANUAL_UPLOAD` | `processPublication` has no `jsonData` and the Excel step is skipped. Fixed by the no-jsonData stale delete (§2.4 item 4) |
| `no_match` ingestion skips `processPublication` (`origin/master` `blob-ingestion/repository/service.ts:51-55`) | After the rebase this cannot leave an upload-derived xlsx. `MANUAL_UPLOAD` is never NoMatch (`origin/master` `libs/api/src/blob-ingestion/validation.ts:80`), and external provenances get their own artefact. No change. All `libs/api` and `queries.ts` references are to `origin/master`, the state #942 merges into |
| Hidden first sheet in the upload | The converter used it for the PDF, so it is copied as a visible sheet. All other sheets are dropped |
| Hidden rows | The converter includes them in the JSON and PDF, so they are copied and unhidden, keeping the PDF and Excel row-for-row equal |
| Hidden mapped column | Copied and unhidden, because its data is in the PDF. Hidden unmapped columns are dropped with all other unmapped columns |
| Cell notes, workbook properties, header/footer, defined names, images | Not copied |
| Formula cells | Mapped cells hold the cached result through `readCellValue`. Unmapped cells are dropped. With `keepUnmappedColumns` they would be written as `sanitiseCellValue(readCellValue(value))` |
| Rich text, hyperlink, error cells | Flattened by `readCellValue` (§2.2), the same in the JSON, the PDF and the Excel |
| Merged cells | Not copied. Each cell's own value is written |
| No sheet recognised, or invalid buffer | Throws. The generator deletes the stale xlsx and returns `success: false`. PDF and notifications go ahead |
| Welsh publication | `cy.tableHeaders` are used. For an upload the sheet name keeps the uploaded (usually English) text; for the JSON fallback it is `cy.excelWorksheetName`. Notify link text is English-only (`govnotify-client.ts:79,89`); this is existing behaviour |
| Excel 2MB or more | No-links template (existing behaviour, tested) |
| Excel time cells (for example `10:30` formatted as a time) | ExcelJS loads these as a `Date` on 1899-12-30, which `formatDateValue` writes as `30/12/1899`. This affects the PDF too and is not new. Note it for a follow-up and do not fix it here |
| Fast re-uploads finishing out of order (review suggestion 2) | Already affects the PDF. Out of scope |
| Logging | `artefactId` and the error message only |

## 4. Acceptance Criteria Mapping

| AC | How it is met | Verification |
|---|---|---|
| AC1: Excel and PDF for all SSCS lists | PDFs are already registered (`service.ts` SSCS PDF entries). The 7 SSCS names are added to `EXCEL_GENERATOR_REGISTRY` through `createUploadedExcelGenerator` with the JSON fallback. Excel uploads get a reformatted xlsx; JSON publications get a generated one (decision A). Both are served by email and `?format=excel` | Unit: for every `listTypeData` entry with `urlPath === "sscs-daily-hearing-list"`, `listTypeHasExcel(name)` is true. The SSCS generator saves a reformatted buffer when `uploadedExcel` is set, and calls the JSON generator when it is not. A failed JSON generation deletes the stale xlsx. `excel-generator.test.ts` covers headings, sheet names, values and sanitisation |
| AC2: Uploaded Excel reused | The uploaded workbook is reloaded, and its known data (sheet name, column and row order, widths, styling) is copied and reformatted | SSCS reformatter test: sheet name and cell style of the upload are kept |
| AC3: Every PDF field in the Excel | The headers come from the same `tableHeaders` and the values from the same `readCellValue` the PDF data comes from. All 9 fields are mapped. List-level header data is not included (Clarification 3) | Unit: en and cy headings, values equal to `convertExcelForListTypeName` output for the same upload, row count equal. UAT: compare row by row with the PDF |
| AC4: Both links in the email | No change. The blob exists, so the PDF+Excel template is used | Existing notification tests. Nightly E2E (skipped until the SSO specs are re-enabled). Manual check on a lower environment |

### Tests per review finding
| Finding | Fixed in | Test (`uploaded-workbook-reformatter.test.ts` unless stated) |
|---|---|---|
| CRITICAL 1: hidden sheets | Copy only resolved sheets | A hidden extra sheet is not in the output. A hidden first data sheet is output and visible |
| CRITICAL 1: hidden rows and columns | `hidden` not copied | No output row or column has `hidden`. A hidden data row is still present |
| CRITICAL 1: notes | `note` not copied | An A2 note is absent |
| CRITICAL 1: workbook properties | New workbook | `creator`, `lastModifiedBy`, `company`, `manager`, `title`, `subject`, `keywords`, `description` from the upload are absent |
| CRITICAL 1: unknown columns and sheets | Dropped by default | An "Internal notes" column and an unmapped sheet are absent. The mapped columns are packed in uploaded order |
| HIGH 1: formulas | Values only, `sanitiseCellValue` | No output cell has `formula` or `sharedFormula`. `=HYPERLINK(...)` in an unmapped column is absent. A mapped formula shows its cached result |
| HIGH 2: `[object Object]` | `readCellValue` | `excel-to-json.test.ts`: richText, hyperlink (plain and rich), formula result, shared formula, error. Reformatter: a mapped rich-text cell gives readable text |
| Suggestion 3: blank header shift | Header read by `colNumber` | `excel-to-json.test.ts`: a blank header column does not shift later fields |
| Also | `headerFooter`, defined names, images not copied | Header/footer text and defined names are absent from the output |
| Updated #940 tests | | `:112` (unknown columns kept), `:151` (unresolved sheets unchanged), `:179` (no header gives an unchanged sheet), `:231` (no apostrophe), `rcj-standard .../excel-reformatter.test.ts:30` ("keep unknown columns") now assert the drop and sanitise behaviour |

## 5. CLARIFICATIONS NEEDED

Resolved: the former Clarification 2 (JSON-only gap) and Clarification 3 (Liverpool) are settled by user decisions A and B in §1, and have been removed below.

1. **Unknown columns and unmapped sheets: drop (default) or keep?** The default is to drop them, for every list on the reformatter, RCJ included. The PDF is an allow-list, uploads can carry internal notes, and the lists are public. If the PO wants them kept, they would be copied as sanitised values with formulas replaced, and that decision should be recorded, ideally with the DPO.
2. **Download from the email only, or also from the list page?** The default is the email plus the existing `/api/flat-file/:artefactId/download?format=excel`, matching magistrates, civil/family and RCJ. Do not copy SJP's download pages: `sjp-download-shared.ts:26,42` read from the `ARTEFACT` container.
3. **AC3: table fields only?** The default is the 9 table columns. The PDF also shows the list title, "List for" date, "Last updated", important information and data source. #940's review (HIGH 3) asks for the same decision, so record one answer for both tickets.
4. **Welsh email link text.** Confirm that the English-only `pdf_link_text` / `excel_link_text` (`govnotify-client.ts:79,89`) goes to a separate ticket covering all list types.
