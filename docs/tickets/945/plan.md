# Plan: #945 — Excel download for the Administrative Court hearing lists

## 1. Technical Approach

### Goal
When any of the four regional Administrative Court daily cause lists is published through the non-strategic Excel upload, the subscription email carries a PDF link and an Excel link. The Excel is a cleaned copy of the uploaded workbook, built by the shared allow-list reformatter that #940 (RCJ), #942 (SSCS), #941 (Rolls Building) and #944 (Tribunals) already use. The same file is served by the existing `GET /api/flat-file/:artefactId/download?format=excel`.

### Scope, checked against the working tree (`25364c6f`, on top of #944 / #941 / #942 / #940)

| Ticket name | `listTypeName` (`libs/list-types/common/src/list-type-data.ts`) | Lib | PDF registered | Excel registered today |
|---|---|---|---|---|
| Birmingham Administrative Court Daily Cause List | `BIRMINGHAM_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST` (:252) | `libs/list-types/administrative-court-daily-cause-list` | yes (`service.ts:235`, `adminCourtGenerator`) | no |
| Leeds Administrative Court Daily Cause List | `LEEDS_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST` (:262) | same | yes (`:236`) | no |
| Bristol and Cardiff Administrative Court Daily Cause List | `BRISTOL_AND_CARDIFF_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST` (:272, renamed in §H) | same | yes (`:237`) | no |
| Manchester Administrative Court Daily Cause List | `MANCHESTER_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST` (:282) | same | yes (`:238`) | no |

How the lib is built today (verified):
- One lib serves all four list types. The converter (`src/conversion/administrative-court-daily-cause-list-config.ts`) registers one `createConverter(ADMIN_COURT_EXCEL_CONFIG)` under all four names via `registerConverterByName`. `ADMIN_COURT_EXCEL_CONFIG = RCJ_EXCEL_CONFIG` (7 fields: venue, judge, time, caseNumber, caseDetails, hearingType, additionalInformation), first worksheet only.
- The PDF (`src/pdf/pdf-template.njk`) has one table with exactly those 7 columns, headed by `t.common.tableHeaders.*`. Values come from `renderAdminCourt` → `normaliseHearings` (time `.` → `:` via `normalizeTime`, empty `additionalInformation` → `""`).
- It does **not** use `createMultiListGuardAndRender`; per-court content is looked up by `listTypeName` key in the locale (`translations[listTypeName]`). The web page lives at `libs/list-types/administrative-court-daily-cause-list/src/pages/`.
- `cy.common.tableHeaders` is fully translated (Lleoliad, Barnwr, Amser, Rhif yr achos, Manylion yr achos, Math o wrandawiad, Gwybodaeth ychwanegol). No placeholders in `cy.ts`.

This is structurally identical to `rcj-standard-daily-cause-list` (same config, same `t.common.tableHeaders` shape, same `normaliseHearing` formatting), so the reformatter is a copy of `reformatRcjStandardDailyCauseListExcel` pointed at this lib's config and locales.

### Overlap with #940 (RCJ)
- **London Administrative Court is already done by #940.** `LONDON_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST` is registered with `createUploadedExcelGenerator(reformatLondonAdministrativeCourtDailyCauseListExcel)` (`service.ts:463`). It is a separate lib (two sheets: "Main hearings", "Planning Court") and is not named in #945. Nothing to do for London.
- **The four regional lists were not covered by #940.** #940's scope table lists 10 names (8 rcj-standard, London Admin, CoA Civil); none of the four here. `service.test.ts` `RCJ_LIST_TYPES` asserts length 10 and must stay 10.
- The ticket's spec comment says London is "out of scope … near-copy if wanted". That is now moot: London already has an Excel download.

### Pattern reused (from #940, #942, #941, #944)
- `ProcessPublicationParams.uploadedExcel` is already set by `apps/web/src/pages/(admin)/non-strategic-upload-summary/index.ts:127-137,175` for **every** list type with a converter registered by name. The four admin court names have converters, so the buffer already reaches `generatePublicationExcel`. **No `apps/` change.**
- `createUploadedExcelGenerator(reformat)` (`libs/publication/src/processing/service.ts:392`) saves the reformatted upload as `${artefactId}.xlsx` via `saveExcelToStorage`, and deletes any stale xlsx when there is no upload or reformatting fails.
- `reformatUploadedWorkbook(buffer, sheets)` (`libs/list-types/common/src/excel/uploaded-workbook-reformatter.ts`) copies only the mapped columns of the resolved sheet into a fresh workbook (no hidden sheets, notes, formulas, metadata), writes localised bold headings, applies `formatRow`, sanitises every value and freezes the header row.
- `EXCEL_GENERATOR_REGISTRY` is keyed by `listTypeName`; `listTypeHasExcel` reads it. Never `listTypeId`.
- Notifications need no change: `buildEmailDataWithFiles` probes `${artefactId}.xlsx` and `getSubscriptionTemplateId` picks `GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION_PDF_EXCEL` when both files exist under 2MB.

### Decision: reformat the upload, not a JSON-built workbook
The ticket's spec comment (2026-08-18) proposes a new `generateAdministrativeCourtDailyCauseListExcel` building a two-sheet workbook from JSON (hearings + "Important information", provenance plumbing, new `excelSheetName` locale key). That predates the shared reformatter and is superseded:

| Option | Verdict |
|---|---|
| Raw upload, byte for byte | Rejected (#940 CRITICAL finding: hidden sheets, notes, formulas, metadata reach subscribers) |
| JSON-built two-sheet workbook (spec comment) | Not chosen. Does not reuse the upload (AC2), adds a second Excel builder, needs `provenance` in `GenerateExcelParams`, a new locale key and a Welsh sheet name; inconsistent with every sibling ticket |
| `reformatUploadedWorkbook` with a thin per-lib config | **Chosen.** Same as RCJ, SSCS, Rolls Building and Tribunals. The PDF's 7 table columns are the allow-list |

Legacy parity (checked 2026-10-14): PIP shipped this ticket as **PUB-3307** (`hmcts/pip-data-management` `d8ac8796`, merged 2026-10-13; pip-data-models `2.3.58` sets `hasExcel = true` for all four). `NonStrategicListFileConverter.convertToExcel` re-uses the uploaded workbook and only rewrites the header row with the localised `commonNsDailyCauseListTableHeaders`. All four map to a single sheet, and `NonStrategicListFormatter` applies `formatTimeField` to `Time`. CaTH's reformatter gives the same output, with one deliberate divergence: PIP keeps the uploaded workbook in place and renames headers **by position**, while `reformatUploadedWorkbook` maps by header name and copies only known columns into a fresh workbook. That keeps hidden sheets, notes, formulas and metadata out, as agreed in #940, so CaTH keeps its approach.

Consequences, consistent with #940/#941/#944 resolved decisions and with PIP:
- **Excel uploads only.** JSON published through `POST /publication` has no `uploadedExcel`; the factory deletes any stale xlsx and the email is PDF-only (legacy behaviour). No JSON fallback.
- **Table fields only.** List title, list date, last updated, important information, judgments text, FaCT link, data source and caution notes are not in the Excel (same as #940 for RCJ).
- **One reformatter for all four list types.** Headings and fields are identical across the four courts; only non-table content differs by `listTypeName`, and that is not in the Excel. So the reformatter takes `(buffer, locale)` like every other.

### Superseded artefacts
- `origin/feature/945-admin-court-excel-download` (`2222257b`) holds the JSON-generator plan from the spec comment. Obsolete; leave it alone.
- `libs/list-types/administrative-court-daily-cause-list/dist/excel/excel-generator.*` exists locally from a build of that branch, with no `src/` counterpart. `dist/` is a build output; clean it (`rm -rf dist` then rebuild) so stale exports cannot mask a missing `src` export.

## 2. Implementation Details

TEMPLATE SOURCE: n/a

No new pages, templates, routes, API endpoints, Prisma schema, migrations, locale strings or `list-type-data.ts` entries. No changes to `apps/`, `libs/notifications`, `libs/public-pages` or `libs/list-types/common`. In scope as well: the Welsh PDF title and data-source fix (§F).

### File structure
```
libs/list-types/administrative-court-daily-cause-list/
├── package.json                               CHANGED  devDependencies: "exceljs": "4.4.0" (test fixtures)
└── src/
    ├── index.ts                               CHANGED  export the reformatter
    ├── excel/
    │   ├── excel-reformatter.ts               NEW
    │   └── excel-reformatter.test.ts          NEW
    └── pdf/
        ├── pdf-generator.ts                   CHANGED  Welsh title + data source (§F)
        └── pdf-generator.test.ts              CHANGED

libs/publication/src/processing/
├── service.ts                                 CHANGED  1 import, 1 const, 4 registry entries
└── service.test.ts                            CHANGED  mock + registry/flow tests

e2e-tests/tests/admin/non-strategic-upload.spec.ts   CHANGED  admin court step in the existing @nightly Excel journey
yarn.lock                                      CHANGED
```

### A. Reformatter
```ts
// libs/list-types/administrative-court-daily-cause-list/src/excel/excel-reformatter.ts
import { normaliseHearing, reformatUploadedWorkbook } from "@hmcts/list-types-common";
import { ADMIN_COURT_EXCEL_CONFIG } from "../conversion/administrative-court-daily-cause-list-config.js";
import { cy } from "../locales/cy.js";
import { en } from "../locales/en.js";

export async function reformatAdministrativeCourtDailyCauseListExcel(buffer: Buffer, locale: string): Promise<Buffer> {
  const t = locale === "cy" ? cy : en;

  return reformatUploadedWorkbook(buffer, [
    {
      worksheetIndex: 0,
      fields: ADMIN_COURT_EXCEL_CONFIG.fields,
      headers: t.common.tableHeaders,
      formatRow: normaliseHearing
    }
  ]);
}
```
- `worksheetIndex: 0`, no name: matches `createConverter` → `convertExcelToJson`, which reads the first sheet. Sheet name is kept as uploaded.
- `formatRow: normaliseHearing` is the row-level form of `normaliseHearings` used by `renderAdminCourt`, so times and empty additional information match the PDF.
- Export from `src/index.ts`: `export { reformatAdministrativeCourtDailyCauseListExcel } from "./excel/excel-reformatter.js";`
- Do not import from `@hmcts/rcj-standard-daily-cause-list` to share its reformatter: that would add a cross-lib dependency for 10 lines, and the headings must come from this lib's own locale files.
- No runtime import from `@hmcts/publication` (it depends on this lib).

### B. `libs/publication/src/processing/service.ts`
- Extend line 1: `import { type AdministrativeCourtHearingList, generateAdministrativeCourtDailyCauseListPdf, reformatAdministrativeCourtDailyCauseListExcel } from "@hmcts/administrative-court-daily-cause-list";`
- Next to `rcjStandardUploadedExcelGenerator` (`:417`):
  ```ts
  const adminCourtUploadedExcelGenerator = createUploadedExcelGenerator(reformatAdministrativeCourtDailyCauseListExcel);
  ```
- In `EXCEL_GENERATOR_REGISTRY` (`:423`), after the `LONDON_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST` entry:
  ```ts
  BIRMINGHAM_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST: adminCourtUploadedExcelGenerator,
  LEEDS_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST: adminCourtUploadedExcelGenerator,
  BRISTOL_AND_CARDIFF_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST: adminCourtUploadedExcelGenerator,
  MANCHESTER_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST: adminCourtUploadedExcelGenerator,
  ```
- `generatePublicationExcel` gets `listTypeName` from `generatePublicationPdf`; all four have PDF generators, so the name resolves. No other change.

### C. Unit tests: `src/excel/excel-reformatter.test.ts`
Real ExcelJS round trips, AAA, no mocks of `@hmcts/list-types-common` (pattern: `london-administrative-court-daily-cause-list/src/excel/excel-reformatter.test.ts`). Fixture: first sheet with the 7 template headers, two data rows (one with time `10.30am`, one with empty Additional Information), an extra "Internal notes" column, plus a second sheet repeating the headers.
- English headings equal `en.common.tableHeaders` in PDF order and are bold; Welsh headings equal `cy.common.tableHeaders`.
- **Parity (AC3):** data rows equal `renderAdminCourt(await convertExcelForListTypeName(NAME, upload), opts).hearings` mapped to PDF column order, for `en` and `cy`. Import the lib's converter config so the converter is registered.
- `10.30am` becomes `10:30am`; empty Additional Information is `""`.
- "Internal notes" column and the second sheet are absent; the first sheet keeps its uploaded name; header row frozen.
- A value starting with `=` is sanitised (shared behaviour; one assertion is enough).
- `it.each` over the four names: the same fixture converts for each (shared converter), proving the one reformatter fits all four.

### D. `libs/publication/src/processing/service.test.ts`
- Extend the `vi.mock("@hmcts/administrative-court-daily-cause-list")` block (`:118`) with `reformatAdministrativeCourtDailyCauseListExcel: vi.fn()`.
- New `describe` next to the Tribunal block (`:2348` pattern): `ADMIN_COURT_LIST_TYPES = listTypeData.filter((l) => ADMIN_COURT_URL_PATHS.includes(l.urlPath ?? "")).map((l) => l.name)` for the four `urlPath`s. Assert `[...ADMIN_COURT_LIST_TYPES].sort()` equals the four expected names (non-mutating sort), and `it.each` that `listTypeHasExcel(name)` is true.
- `it.each` with `uploadedExcel`: reformatter called with `(buffer, locale)`, `saveExcelToStorage` stores the result, `{ hasExcel: true }`.
- Without `uploadedExcel`: `deleteBlob("<id>.xlsx", CONTAINER.PUBLICATIONS)` called, reformatter not called, result `{}`.
- Reformatter throws: stale xlsx deleted, `console.warn` payload is `artefactId` + message only.
- `processPublication` for one admin court name with `uploadedExcel`: `excelPath` `${artefactId}.xlsx` is passed to `sendPublicationNotificationsForArtefact`.
- Fixtures use `listTypeId: 999`. Leave `RCJ_LIST_TYPES` at 10.

### E. E2E: `e2e-tests/tests/admin/non-strategic-upload.spec.ts`
Extend the existing `@nightly` journey "RCJ, SSCS, Rolls Building and Tribunal Excel uploads…" (`:496`, rename to include Administrative Court) rather than adding a test:
- Welsh Birmingham Administrative Court upload with time `10.30am` and an "Internal notes" column: download `?format=excel`, assert Welsh headings (`Lleoliad` … `Gwybodaeth ychwanegol`), `10:30am`, the dropped column, and two Notify links (`expectPdfAndExcelLinksInEmail`). English headings are already covered by the KB Division step (identical shape).
- Add the artefact to the `finally` cleanup.
- Stays inside `test.describe.skip` until the SSO specs are re-enabled, as for #940–#944.

### F. Welsh PDF title and data source (`src/pdf/pdf-generator.ts`)
Today a Welsh PDF shows its title (`LIST_TITLE_MAP`) and data source (`PROVENANCE_LABELS` from `@hmcts/publication`) in English. PIP renders both in Welsh (`i18n.listName` and `i18n.dataSource` + `convertDataSourceName(provenance, WELSH)`). Fix it the way #944 fixed the Tribunal libs (`d007f3b0`, e.g. `cic-weekly-hearing-list/src/pdf/pdf-generator.ts`):
- Load `translations` **before** `renderAdminCourt`. Take `court = translations[listTypeName]` and pass `listTitle: court?.pageTitle ?? <generic fallback>`.
- Data source: `t.common.provenanceLabels[provenance] || provenance`. `en.ts`/`cy.ts` already spread `provenanceLabelsEn`/`provenanceLabelsCy` from `@hmcts/list-types-common`.
- Delete `LIST_TITLE_MAP` and the `@hmcts/publication` import. That import was also a runtime cycle (`@hmcts/publication` depends on this lib), so this removes it. Drop `@hmcts/publication` from `package.json` if nothing else uses it.
- The `cy.ts` `pageTitle`s already match PIP's Welsh `listName`s exactly (Birmingham; Leeds; Bryste a Chaerdydd; Manceinion). No locale changes needed.
- Tests (`pdf-generator.test.ts`): `it.each` over the four names. Assert the rendered HTML carries the `cy` `pageTitle` and the Welsh provenance label for `locale: "cy"`, and the English equivalents for `en`. Unknown provenance falls back to the raw value.

### G. Welsh content parity with legacy PIP (`src/locales/cy.ts`)
Checked on 2026-10-14 against pip-data-management (PDF/Excel) and pip-frontend master (web page). Titles, important information, judgments text, table headings, FaCT link, list date and last-updated labels already matched word for word. Changed to match PIP:
- Leeds important information, paragraph 2: "ymholiadau rhestru eraill, cysylltwch … yn y cyfeiriad e-bost uchod."
- `common.cautionNote` / `common.cautionReporting`: PIP's `bottomLegal1` / `bottomLegal2` wording, with straight apostrophes. This is the same text the SIAC, UTIAC JR and UT AAC libs use.
- `common.dataSource`: "Ffynhonnell y Data", PIP's PDF wording (user decision). Most other CaTH list libs still use "Ffynhonnell data".

Kept on purpose:
- English table headings stay Title Case ("Case Number"). The words match PIP; only the capitalisation differs (user decision).
- The Welsh judge heading stays "Barnwr", matching PIP's PDF and Excel. pip-frontend's web page uses "Barnwyr", so legacy is inconsistent here.
- PIP's closing "Thank you for reading this document thoroughly" line is not added to the PDF (out of scope).

### H. Rename to `BRISTOL_AND_CARDIFF_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST` (user decision, 2026-10-14)
This matches pip-data-models and pip-frontend. Only the `name` string changes; the `urlPath` (`bristol-cardiff-administrative-court-daily-cause-list`) and friendly names stay the same, as in #1144.
- Migration `apps/postgres/prisma/migrations/20261014120000_rename_bristol_cardiff_administrative_court_list_type/migration.sql` renames the existing row in place, so its `id`, artefacts and subscriptions are kept. It fails loudly if both names already exist, and changes nothing if the old name is absent.
- #1144 (`20261007120000_rename_list_types_to_shared_model`) contains the same rename. Checked locally: after this migration, replaying #1144's migration SQL succeeds and leaves row 26 unchanged. `yarn db:seed` soft-deletes nothing.
- The code edits match #1144's line for line, so whichever PR merges second should hit few or no conflicts on these lines.

## 3. Error Handling & Edge Cases

| Case | Behaviour |
|---|---|
| Upload fails conversion (missing column, bad time, HTML) | Rejected on the upload page by the existing converter; nothing published |
| Extra sheets | Only the first sheet is copied (the one that fed the PDF) |
| Extra/unknown columns, notes, formulas, hidden rows/columns, metadata | Dropped by the shared allow-list copy (#942) |
| Time typed as `10.30am` or as an Excel time cell | `readCellValue` then `normaliseHearing` → `10:30am`, same as the PDF |
| Empty Additional Information | `""` cell, as in the PDF |
| Values starting `=`, `+`, `-`, `@` | Escaped by `sanitiseCellValue` |
| No recognised header row | Reformatter throws; factory deletes stale xlsx and returns `success: false`; PDF and PDF-only email still go out. Cannot normally happen (converter rejects first) |
| JSON publication via `POST /publication` | No `uploadedExcel`: stale xlsx deleted, PDF-only email |
| Republish by Excel (same `artefactId`) | xlsx overwritten |
| Flat-file republish | Existing `deleteStaleExcel` path in `processPublication` |
| Welsh upload (`language: WELSH`) | Headings from `cy.common.tableHeaders`; sheet name as uploaded |
| Excel 2MB or larger | No-links Notify template (existing); unlikely since uploads are capped at 2MB and output is a subset |
| Notify link text | English-only `excel_link_text` in `govnotify-client.ts`; pre-existing, already raised by #940/#942 |
| Logging | `artefactId` and error message only; no cell content |
| Bristol name differs from legacy | Renamed on this branch to `BRISTOL_AND_CARDIFF_…` with a migration that keeps the existing row (§H). #1144's migration does the same rename and changes nothing if this one runs first, and the reverse is also true |

## 4. Acceptance Criteria Mapping

| AC | How it is met | Verification |
|---|---|---|
| Excel and PDF for all four Administrative Court lists | PDFs already registered. Four new `EXCEL_GENERATOR_REGISTRY` entries keyed on the real `listTypeName`s. Served in email and via `?format=excel` | `service.test.ts`: names found by `urlPath` all have `listTypeHasExcel === true`; flow tests. E2E (skipped until SSO). Lower-environment check |
| The uploaded Excel is re-used | `uploadedExcel` (already passed by the summary page) is reloaded and its first sheet's mapped columns, sheet name, widths, row heights and styles are copied | Reformatter tests (sheet name kept, unknown content dropped); E2E download assertions |
| All PDF data fields are in the Excel | All 7 PDF table columns are converter fields and are mapped; headings from the same `t.common.tableHeaders` as `pdf-template.njk`; values through the same `normaliseHearing` | Parity test against `renderAdminCourt` in `en` and `cy`; UAT row-by-row comparison |
| Links to both files in the email | No change: the xlsx exists, so `GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION_PDF_EXCEL` is selected | `processPublication` passes `excelPath` (`service.test.ts`); existing `template-config` tests; E2E link assertions |

## 5. Clarifications: resolved against PIP (PUB-3307)

No open clarifications remain. Checked against `hmcts/pip-data-management` `d8ac8796` and `hmcts/pip-data-models` master on 2026-10-14. The local pip-data-models checkout is 42 commits behind and still shows `hasExcel = false`, so use the remote.

1. **Table fields only. Resolved: yes.** PIP's Excel for these four is the uploaded single sheet with the 7 localised table headings (Venue … Additional information / Lleoliad … Gwybodaeth ychwanegol). The title, important information, judgments text and data source are not included. AC3 is met the same way as in PIP and #940.
2. **Excel uploads only. Resolved: yes.** PIP's `convertToExcel` returns an empty file when there is no uploaded workbook (`inputExcel == null`), so JSON publications are PDF-only. No fallback.
3. **Welsh PDF title and data source. Resolved: fix in #945** (user decision, 2026-10-14). PIP renders both in Welsh. See §F.
4. **E2E coverage. Unchanged.** This is a CaTH-specific constraint. The journey stays in the skipped describe until SSO is re-enabled, and unit tests plus a lower-environment check are the real verification. PIP's own coverage is one English and one Welsh header test per list type, which the reformatter tests here match.
