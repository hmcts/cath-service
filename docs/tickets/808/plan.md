# Technical Plan — #808 Insolvency & Companies Court (ChD) Daily Cause List

**Type:** New non-strategic list type (Excel upload → JSON → rendered bilingual page + PDF/Excel download)

This plan was written after verifying the referenced wiring against the current codebase. Concrete file paths, constants and existing entries are cited so the implementation can copy a proven pattern rather than invent one.

---

## 1. Technical Approach

This is a **non-strategic, RCJ-standard 7-column flat list**. The service already publishes many structurally identical lists, so the work is almost entirely *configuration and registration by copying an existing reference module* — not new machinery.

**Reference module to copy:** `libs/list-types/administrative-court-daily-cause-list/` (single 7-field flat shape, `createConverter`, `createJsonValidator`, `renderAdminCourt`, a PDF generator, bilingual locales).

**Critical divergence from the RCJ standard — field names.** Issue #808 mandates the JSON contract:

```
judge, time, venue, type, caseNumber, caseName, additionalInformation
```

The shared `RCJ_EXCEL_CONFIG` (`libs/list-types/common/src/conversion/rcj-field-configs.ts:9`) and every existing RCJ module use **different** field names and order:

```
venue, judge, time, caseNumber, caseDetails, hearingType, additionalInformation
```

`type` ≠ `hearingType`, `caseName` ≠ `caseDetails`, and the column order differs. Therefore this list type **must NOT reuse `RCJ_EXCEL_CONFIG`, the RCJ schema, or the RCJ model verbatim**. A dedicated Excel config, JSON schema, model interface and renderer are required, all using the issue's exact field names in the issue's order. The RCJ *structure and helpers* (`createConverter`, `createJsonValidator`, `formatDisplayDate`, `formatLastUpdatedDateTime`, `normaliseHearings`, PDF helpers) are reused; the field definitions are bespoke. See §5 Open Questions — this discrepancy needs confirming against the staging reference before build.

### Architecture decisions

- **New lib package:** `libs/list-types/insolvency-and-companies-court-chd-daily-cause-list/` following the exact file layout of `administrative-court-daily-cause-list`.
- **Single list type** (not a multi-variant family like admin court), so the page controller uses the simpler single-guard pattern from `court-of-appeal-civil-daily-cause-list/index.ts` (`createSimpleListTypeHandler` with an inline `guardArtefact`), not `createMultiListGuardAndRender`.
- **List-type name constant:** `INSOLVENCY_AND_COMPANIES_COURT_CHD_DAILY_CAUSE_LIST` (used as the stable key everywhere — converter registry, PDF registry, guard, seed SQL). Never a numeric `listTypeId`.
- **URL path:** `insolvency-and-companies-court-chd-daily-cause-list` (matches the staging reference URL in the issue).
- **Excel download** is the original uploaded flat file (`artefact.isFlatFile`), served by the existing file-serving route — no new export code (assumption, see §5).

---

## 2. Implementation Details

### 2.1 New lib package

Path: `libs/list-types/insolvency-and-companies-court-chd-daily-cause-list/`

```
package.json                 # name: @hmcts/insolvency-and-companies-court-chd-daily-cause-list, exports "." and "./config"
tsconfig.json                # extends ../../../tsconfig.json (copy admin court's)
src/
  config.ts                  # moduleRoot, assets, schemaPath (points at the JSON schema below)
  index.ts                   # side-effect import of the converter config; re-exports locales, model, renderer, pdf, validator
  conversion/
    insolvency-and-companies-court-chd-daily-cause-list-config.ts
  schemas/
    insolvency-and-companies-court-chd-daily-cause-list.json
  validation/
    json-validator.ts
    json-validator.test.ts
  models/
    types.ts
  rendering/
    renderer.ts
  pdf/
    pdf-generator.ts
    pdf-template.njk
  locales/
    en.ts
    cy.ts
  email-summary/
    summary-builder.ts        # only if subscriptions are in scope — see §5
```

**`models/types.ts`** — bespoke field names, in issue order:

```typescript
export interface InsolvencyCompaniesCourtHearing {
  judge: string;
  time: string;
  venue: string;
  type: string;
  caseNumber: string;
  caseName: string;
  additionalInformation: string;
}

export type InsolvencyCompaniesCourtHearingList = InsolvencyCompaniesCourtHearing[];
```

**`conversion/…-config.ts`** — dedicated config (do NOT reuse `RCJ_EXCEL_CONFIG`). Uses `createConverter`, `registerConverterByName`, `validateNoHtmlTags`, `validateTimeFormat` from `@hmcts/list-types-common`. Columns in issue order: Judge, Time, Venue, Type, Case Number, Case Name, Additional Information. All required except Additional Information; `minRows: 1`. Registers:

```typescript
registerConverterByName("INSOLVENCY_AND_COMPANIES_COURT_CHD_DAILY_CAUSE_LIST", converter);
```

**`schemas/…json`** — draft-07, `"type": "array"`, `items.required` = all fields except `additionalInformation`, properties in issue order. Anti-HTML `pattern` on text fields (`^(?!(.|\r|\n)*<[^>]+>)(.|\r|\n)*$` as used in the admin court schema); `time` uses `^\\d{1,2}([:.]\\d{2})?[ap]m\\s*$` (the strict RCJ time pattern — accepts `9am` and `10:30pm` from the issue example). See §5 for the time-format question.

**`validation/json-validator.ts`** — `validateInsolvencyAndCompaniesCourtChdDailyCauseList` wrapping `createJsonValidator(schemaPath)`; exported from `index.ts` (mandatory — the CI guard test at `libs/list-types/common/src/validation/guard.test.ts` fails otherwise).

**`rendering/renderer.ts`** — mirror `renderAdminCourt`: build `header` (listTitle, listDate, lastUpdatedDate/time via `formatDisplayDate`/`formatLastUpdatedDateTime`) and `hearings` via `normaliseHearings`.

**`pdf/pdf-generator.ts`** — mirror the admin court generator: `generateInsolvencyAndCompaniesCourtChdDailyCauseListPdf(options: { …; listTypeName: string })`, `LIST_TITLE_MAP` keyed by the string list-type name, renders `pdf-template.njk`, saves via `savePdfToStorage`.

### 2.2 Page (rendered public view)

Path: `apps/web/src/pages/(list-types)/insolvency-and-companies-court-chd-daily-cause-list/`

```
index.ts                                                        # single-list handler
insolvency-and-companies-court-chd-daily-cause-list.njk         # govukTable, 7 columns in order
index.test.ts                                                   # controller tests
insolvency-and-companies-court-chd-daily-cause-list.njk.test.ts # template tests
```

`index.ts` copies `court-of-appeal-civil-daily-cause-list/index.ts`:
- `export const ROUTES = ["/insolvency-and-companies-court-chd-daily-cause-list"];`
- `const SUPPORTED_LIST_TYPE = "INSOLVENCY_AND_COMPANIES_COURT_CHD_DAILY_CAUSE_LIST";`
- `GET = createSimpleListTypeHandler({ en, cy, validate, logPrefix, guardArtefact, render })` where `guardArtefact` returns 400 "Invalid List Type" when `artefact.listTypeName !== SUPPORTED_LIST_TYPE`.

Template renders a GOV.UK table (`<thead>`, `<th scope="col">`) with columns Judge, Time, Venue, Type, Case Number, Case Name, Additional Information; list date; last-updated date/time; important-information details block; download links; back-to-top anchor.

### 2.3 Central registration (must all be done or the list type is invisible / breaks build)

1. **Root `tsconfig.json`** — add path alias (see existing entries around `tsconfig.json:58-60`):
   `"@hmcts/insolvency-and-companies-court-chd-daily-cause-list": ["libs/list-types/insolvency-and-companies-court-chd-daily-cause-list/src"]`
2. **`apps/web/package.json`** — add `"@hmcts/insolvency-and-companies-court-chd-daily-cause-list": "workspace:*"` (alongside the entries at lines 26/35/39).
3. **`apps/web/src/app.ts`** — import `moduleRoot as insolvencyModuleRoot` from `.../config` and add to the `modulePaths` array (mirrors `rcjStandardModuleRoot` at `app.ts:33,132`). Pages are auto-discovered — no route registration needed. Add the module's `assets` to `apps/web/vite.config.ts` only if the lib ships assets (it need not).
4. **`libs/list-types/common/src/list-type-data.ts`** — add a `ListTypeData` entry: `name`, `englishFriendlyName` = "Insolvency & Companies Court (ChD) Daily Cause List", `welshFriendlyName`, `provenance: "CFT_IDAM"`, `urlPath`, `isNonStrategic: true`, `defaultSensitivity: "Public"`, `subJurisdictionIds: [1]` (Civil Court).
5. **`libs/publication/src/processing/service.ts`** — import `generateInsolvencyAndCompaniesCourtChdDailyCauseListPdf` + type; add an entry to `PDF_GENERATOR_REGISTRY` (line 139) keyed `INSOLVENCY_AND_COMPANIES_COURT_CHD_DAILY_CAUSE_LIST`.
6. **Seed SQL:**
   - `apps/postgres/prisma/scripts/001_insert_missing_list_types.sql` — add an INSERT row (columns: name, friendly_name, welsh_friendly_name, shortened_friendly_name, url, default_sensitivity, allowed_provenance='CFT_IDAM', is_non_strategic=true, NOW()).
   - `apps/postgres/prisma/scripts/003_upsert_sub_jurisdictions_and_list_type_links.sql` — add a mapping row linking the list type to sub_jurisdiction 1 (Civil Court).
7. **Location — `libs/location/src/location-data.ts`:** "Business and Property Courts (Rolls Building)" does **not** currently exist. Add a new `Location` (next free `locationId`) with `regions: [11]` (Royal Courts of Justice Group — verified at `location-data.ts:240`) and `subJurisdictions: [1]` (Civil). Confirm exact canonical name / no duplicate before adding (§5).

### 2.4 Content (`locales/en.ts` + `cy.ts`)

Page-specific content lives in the lib's locale files (identical key structure between `en` and `cy`). Keys: `pageTitle`, `courtName`, and a `common` block with `listFor`, `lastUpdated`, `at`, `searchCasesTitle`, `searchCasesLabel`, `tableHeaders.{judge,time,venue,type,caseNumber,caseName,additionalInformation}`, `importantInfoText`, `dataSource`, `backToTop`, `downloadPdf`, `downloadExcel`.

Verified Welsh strings available in `templates/tech-spec-references/welsh-translations-catalogue.json`:
- Time → `Amser`, Venue → `Lleoliad`, Case Number → `Rhif yr Achos`, Case Name → `Enw'r Achos`, Additional Information → `Gwybodaeth ychwanegol`, List for → `Rhestr ar gyfer`, Back to top → `Yn ôl i frig y dudalen`, Business and Property Courts Rolls Building → `Llysoedd Busnes ac Eiddo â Adeilad Rolls`, Royal Courts of Justice Group → `Grŵp y Llysoedd Barn Brenhinol`, Insolvency & Companies Court (Chancery Division) Daily Cause List → `Rhestr Achosion Dyddiol Llys Cwmnïau ac achosion Ansolfedd (Adran Siawnsri)`.
- **Missing (mark `[WELSH TRANSLATION REQUIRED: "…"]`):** Judge, Type, Last updated, Search cases, Search-cases label, Data source, Download PDF, Download Excel.

---

## 3. Error Handling & Edge Cases

Validation is publisher-facing (on the non-strategic upload page); the public render page has no user input. Two mandatory layers:

- **Excel converter** (upload time) — missing required column, empty required cell, malformed time, HTML tags in a field, no data rows, wrong file type. Errors surface in the GOV.UK error summary via the shared converter, identifying row/column. Nothing is published on failure.
- **JSON schema** (render time / defence-in-depth) — if a stored artefact fails schema validation, `createSimpleListTypeHandler` returns 400 and renders `errors/common`.

Guard outcomes (from `createSimpleListTypeHandler`): missing `artefactId` → 400; artefact not found → 404; no access → 403; wrong `listTypeName` → 400 "Invalid List Type"; publication JSON missing → 404.

Error messages follow GOV.UK style — specific and actionable, sentence case, no "Invalid input".

---

## 4. Acceptance Criteria Mapping

| AC | How satisfied | Verification |
|----|---------------|--------------|
| Created under Business and Property Courts (Rolls Building), Civil jurisdiction, RCJ Group region | New location in `location-data.ts` (region 11, subJurisdiction 1); list-type linked to sub_jurisdiction 1 (Civil) in seed SQL | Reference-data unit test; manual admin check |
| Schema fields in order: Judge, Time, Venue, Type, Case Number, Case Name, Additional Information (all required except Additional Information) | Bespoke JSON schema + Excel config with those exact field names/order | Validator unit tests (one per required field); converter tests |
| Published via Excel upload → converted to JSON | Dedicated Excel converter registered by name; appears in non-strategic upload selector via `list-type-data` | Converter unit tests; E2E publish journey |
| Validation schema + style guide created | Schema + validator wrapper + bilingual template matching the staging reference structure | Guard test; template `.njk` tests |
| PDF and Excel downloadable | PDF generator registered in `PDF_GENERATOR_REGISTRY`; Excel = original flat file via existing download route | PDF generation test; E2E download |
| Style guide follows staging reference URL | Template mirrors the reference render (table columns, important-information, downloads) | Template tests; visual comparison |
| JSON matches issue format | Model + schema use exact issue keys | Converter output test asserts exact shape |

---

## 5. CLARIFICATIONS NEEDED

1. **Field names — the central risk.** The issue JSON uses `type` and `caseName`, but every existing RCJ-standard list uses `hearingType` and `caseDetails`. Does the staging reference page (`…?artefactId=e54a8a97-7fe5-4585-b43a-d1a6a6eb4bba`) actually render/consume `type`/`caseName`, or the RCJ standard `hearingType`/`caseDetails`? If the reference uses the RCJ names, the issue JSON and the reference disagree and the correct contract must be fixed before build. **This plan honours the issue's exact JSON (`type`, `caseName`).**
2. **Time format.** The issue example includes `10:30pm`; the strict RCJ pattern accepts it. Confirm the full accepted set (am/pm only? 24-hour? "Not before"/free-text entries?) before locking the `time` regex — an over-strict pattern will reject legitimate publisher input.
3. **"Excel downloadable version."** Assumed to be the original uploaded flat file (as with other non-strategic lists), not a freshly generated/formatted workbook. Confirm.
4. **Location name & id.** "Business and Property Courts (Rolls Building)" is absent from `location-data.ts`. Confirm the exact canonical court name (issue says "Business and Property Courts Rolls Building" without parentheses) and that no existing location should be reused instead, to avoid duplicates.
5. **Important-information / caution text.** Not specified in the issue — must be taken from the staging reference style guide or content design.
6. **Subscriptions / email summaries.** In scope for #808? Every RCJ lib ships an `email-summary/summary-builder.ts`. If out of scope, the file can be omitted (but confirm the summary machinery doesn't require it).
7. **Sensitivity.** Assumed `Public`. Confirm no restricted classification applies.
8. **List-type name constant.** Assumed `INSOLVENCY_AND_COMPANIES_COURT_CHD_DAILY_CAUSE_LIST`. Confirm it matches the name used on the staging reference artefact so converter/PDF/seed keys align.

---

## 6. Test Scenarios

- **Validator unit tests** (real schema, no mocks): fully-hydrated valid fixture → `isValid: true`; one `it` per required field removed (judge, time, venue, type, caseNumber, caseName) → invalid; `additionalInformation` omitted → still valid.
- **Excel converter tests:** well-formed workbook → exact issue JSON shape; missing column / empty required cell / bad time / HTML-in-field each → specific error; empty workbook rejected.
- **Template `.njk` tests** (`@hmcts/test-support` + Cheerio): 7 columns in correct order; list date + last-updated rendered; each hearing row; important-information block present; Welsh locale renders translated headers; `Object.keys(en).sort()` parity with `cy`.
- **Controller tests:** GET valid artefactId → renders with header/hearings; missing artefactId → 400; wrong list type → 400; not found → 404; unauthorised → 403.
- **PDF test:** generator produces a blob for a sample artefact and resolves from `PDF_GENERATOR_REGISTRY` by name.
- **Reference-data test:** list type present, linked to Civil sub-jurisdiction; location present with region 11.
- **E2E journey (`@nightly`), single test with inlined checks:** publish sample list → open rendered page → assert table content → switch to Welsh → axe-core scan → download PDF and Excel.
