# Technical Plan: Financial List (ChD/KB) Daily Cause List (#805)

## 1. Technical Approach

Add a new **non-strategic** list type, published via the existing Excel-upload
route: an uploaded `.xlsx` template is converted to JSON, validated against a JSON
schema, stored as an artefact, and rendered as an HTML "style guide" page with
downloadable PDF and Excel versions.

This is a **flat single-table** list (one row per hearing), the same shape as the
RCJ standard daily cause list. It does **not** reuse `RCJ_EXCEL_CONFIG` — the
columns differ (`type` not `hearingType`, `caseName` not `caseDetails`, and both
`caseNumber` and `caseName` are present). It therefore needs its own module,
schema, model, Excel config, renderer, and PDF generator.

**Reference to mirror (verified in-repo):**
- `libs/list-types/rcj-standard-daily-cause-list/`
- Page controller: `apps/web/src/pages/(list-types)/rcj-standard-daily-cause-list/index.ts`
  (uses `createSimpleListTypeHandler` / `createMultiListGuardAndRender` from
  `../list-type-handler.js`).

**Stable identifier (never a numeric id):** `FINANCIAL_LIST_CHD_KB_DAILY_CAUSE_LIST`.
All registries (PDF, Excel, converter, list-type guards) key off this string —
per CLAUDE.md List Type rules, `listTypeId` is autoincrement and differs per
environment.

### Data model
```typescript
// libs/list-types/financial-list-chd-kb-daily-cause-list/src/models/types.ts
export interface FinancialListHearing {
  judge: string;
  time: string;
  venue: string;
  type: string;
  caseNumber: string;
  caseName: string;
  additionalInformation: string;
}

export type FinancialListHearingList = FinancialListHearing[];
```

Column order (required by AC): **Judge, Time, Venue, Type, Case Number, Case Name,
Additional Information.**

## 2. Implementation Details

### New module
```
libs/list-types/financial-list-chd-kb-daily-cause-list/
├── package.json                # @hmcts/financial-list-chd-kb-daily-cause-list
├── tsconfig.json
├── README.md
└── src/
    ├── config.ts               # moduleRoot, schemaPath
    ├── index.ts                # exports; imports conversion config for side-effect registration
    ├── schemas/
    │   └── financial-list-chd-kb-daily-cause-list.json
    ├── models/
    │   └── types.ts
    ├── conversion/
    │   ├── financial-list-chd-kb-daily-cause-list-config.ts   # Excel config + registerConverterByName
    │   └── financial-list-chd-kb-daily-cause-list-config.test.ts
    ├── validation/
    │   ├── json-validator.ts   # validateFinancialListChdKbDailyCauseList
    │   └── json-validator.test.ts
    ├── rendering/
    │   ├── renderer.ts
    │   └── renderer.test.ts
    ├── locales/
    │   ├── en.ts
    │   └── cy.ts
    └── pdf/
        ├── pdf-template.njk
        ├── pdf-generator.ts    # generateFinancialListChdKbDailyCauseListPdf
        └── pdf-generator.test.ts
```

`config.ts` and `index.ts` follow the RCJ pattern exactly:
- `config.ts` exports `moduleRoot` and `schemaPath` (join to
  `schemas/financial-list-chd-kb-daily-cause-list.json`).
- `index.ts` imports the conversion config for side-effect registration, then
  re-exports the model, renderer, PDF generator, locales (`...En`/`...Cy`), and the
  `validateFinancialListChdKbDailyCauseList` wrapper.

### Page controller
```
apps/web/src/pages/(list-types)/financial-list-chd-kb-daily-cause-list/
├── index.ts                    # ROUTES + createSimpleListTypeHandler (single list type)
├── financial-list-chd-kb-daily-cause-list.njk
├── financial-list-chd-kb-daily-cause-list.njk.test.ts
└── index.test.ts
```
Single list type — use `createSimpleListTypeHandler<FinancialListHearingList>` with
a `listTypeName` guard (no id→name mapping). Validate with
`createJsonValidator(schemaPath)`.

### Registration points (verified to exist)
| File | Change |
|------|--------|
| `libs/list-types/common/src/list-type-data.ts` | Add entry: name `FINANCIAL_LIST_CHD_KB_DAILY_CAUSE_LIST`, `urlPath: "financial-list-chd-kb-daily-cause-list"`, `isNonStrategic: true`, `subJurisdictionIds: [1]` (Civil Court), friendly EN/CY names |
| `apps/postgres/prisma/scripts/001_insert_missing_list_types.sql` | Insert row for the new list type |
| `apps/postgres/prisma/scripts/003_upsert_sub_jurisdictions_and_list_type_links.sql` | Link list type → sub-jurisdiction `1` (Civil Court) |
| `libs/publication/src/processing/service.ts` | Add to `PDF_GENERATOR_REGISTRY` (line ~139) and `EXCEL_GENERATOR_REGISTRY` (line ~318) keyed by name; add module dep to `libs/publication/package.json` |
| `apps/web/src/app.ts` | Add `moduleRoot` to `modulePaths` for Nunjucks discovery |
| `apps/web/vite.config.ts` | Add module assets path (only if assets exist) |
| root `tsconfig.json` | Add `@hmcts/financial-list-chd-kb-daily-cause-list` path mapping |
| `libs/list-types/common/src/validation/guard.test.ts` | Passes automatically once the `validate*` export exists |

### JSON Schema (draft-07, root `type: array`)
Required per item: `judge`, `time`, `venue`, `type`, `caseNumber`, `caseName`,
`additionalInformation` — documented in that order. Text fields use the shared
no-HTML pattern `^(?!(.|\r|\n)*<[^>]+>)(.|\r|\n)*$`; `time` uses the 12-hour
pattern `^\d{1,2}([:.]\d{2})?[ap]m\s*$`.

### Excel conversion config
New `ExcelConverterConfig` (not a reuse of RCJ), `minRows: 1`, registered with
`registerConverterByName("FINANCIAL_LIST_CHD_KB_DAILY_CAUSE_LIST", converter)`:

| Header | fieldName | required | validators |
|--------|-----------|----------|------------|
| Judge | `judge` | true | `validateNoHtmlTags` |
| Time | `time` | true | `validateTimeFormat` |
| Venue | `venue` | true | `validateNoHtmlTags` |
| Type | `type` | true | `validateNoHtmlTags` |
| Case Number | `caseNumber` | true | `validateNoHtmlTags` |
| Case Name | `caseName` | true | `validateNoHtmlTags` |
| Additional Information | `additionalInformation` | false | `validateNoHtmlTags` |

### Rendering & PDF
- `renderer.ts`: map `FinancialListHearingList` → header block + normalised rows,
  formatting list date and last-updated date/time for EN and CY.
- Template: GOV.UK Table, seven `<th scope="col">` headers in order; "Search Cases"
  filter, data-source footer, "Back to top" — matching the RCJ standard templates.
- `pdf-generator.ts`: `generateFinancialListChdKbDailyCauseListPdf`, registered in
  `PDF_GENERATOR_REGISTRY` by name; interface takes `listTypeName: string`.

### Excel download
`EXCEL_GENERATOR_REGISTRY` currently only holds SJP generators (verified). The AC
requires an Excel download, so a new generator producing a formatted workbook is
needed — see open question on whether it must regenerate or return the uploaded
template.

## 3. Error Handling & Edge Cases

- **Missing `artefactId` / artefact or blob not found / schema-invalid JSON:**
  rendered via `errors/common` using the shared locale `errorTitle` / `errorMessage`
  (reused from RCJ standard). Controller returns 400 (missing id / invalid JSON) or
  404 (artefact/blob missing).
- **Excel conversion failures** (surfaced at upload, one per problem, from shared
  `list-types-common` validators — do not duplicate strings):
  - Missing required value: `"<Field> is required (row <n>)"`
  - HTML content: `"<Field> must not contain HTML tags (row <n>)"`
  - Invalid time: `"Time must be in a valid format like 9am or 10:30am (row <n>)"`
- `additionalInformation` present-but-empty is accepted; HTML in any text field is
  rejected by the schema pattern.
- List-type guard test uses `listTypeId: 999` to prove id-independence.

## 4. Acceptance Criteria Mapping

| Acceptance criterion | How satisfied | Verified by |
|---|---|---|
| Created under Business & Property Courts (Rolls Building), Civil jurisdiction, RCJ Group region | `list-type-data.ts` entry + SQL link to sub-jurisdiction 1 (Civil Court); court/region via location reference data | reference-data/registry test; manual seed check |
| Fields in listed order in the validation schema | Schema `required` array + Excel config column order: Judge, Time, Venue, Type, Case Number, Case Name, Additional Information | schema validator tests |
| Published via Excel upload → JSON | New Excel converter registered by name; produces the exact JSON shape | conversion config tests |
| Validation schema + style guide created | JSON schema + `validate*` wrapper; rendered `.njk` page mirroring the staging style guide | validator tests, template test, controller test |
| PDF + Excel downloadable | `PDF_GENERATOR_REGISTRY` + `EXCEL_GENERATOR_REGISTRY` entries | pdf-generator test, excel generator test |
| Style guide matches staging structure | Seven-column table + header/footer matching RCJ standard | `.njk.test.ts` |
| JSON format matches issue example | Model + schema exactly match the seven-field object | validator + conversion tests |

## 5. Testing

Follows CLAUDE.md list-type rules (real schema, no mocks; one `it` per required
field; deep-clone fixtures with `JSON.parse(JSON.stringify(...))`):
- Schema validator: valid fixture passes; each of the seven required fields removed
  individually fails; HTML rejected; empty `additionalInformation` accepted.
- Excel conversion: well-formed rows → exact ordered JSON; missing required value →
  row-specific error; invalid `Time` → error.
- Renderer: EN + CY header/row mapping and date formatting.
- Controller: 400 no `artefactId`, 404 missing artefact/blob, 400 invalid JSON,
  success render with `en`/`cy`/`t`; `listTypeName` guard (`listTypeId: 999`).
- Template: seven headers in order, one row per hearing, Welsh headings, EN/CY key
  parity.
- PDF generator: buffer on success, error result on failure.
- Registry wiring: correct `subJurisdictionIds`; PDF/Excel/converter resolve by name.
- E2E `@nightly`: single public-view journey — open a published artefact, verify
  table, switch to Welsh, inline axe scan, confirm PDF/Excel download links.

## 6. CLARIFICATIONS NEEDED

1. **Exact location record.** Confirm the precise location/court record (Business
   and Property Courts / Rolls Building) that Financial List (ChD/KB) artefacts
   attach to. "Royal Courts of Justice Group" is a region/location attribute, not a
   field on the list type — the list type links only to the Civil Court
   sub-jurisdiction (id 1).
2. **Mandatory fields.** The AC and JSON example populate every field. Confirm
   whether `caseName` **and** `caseNumber` are both truly mandatory, and whether
   `additionalInformation` is optional (the RCJ pattern treats the trailing
   info field as optional). Current plan: all seven required in the schema,
   `additionalInformation` optional in the Excel config.
3. **Time format.** The example contains `10:30pm`. Should the validator accept
   12-hour values like `9am` / `10:30am` only, or also 24-hour times? `10:30pm` is
   an unusual value — confirm the intended format so `validateTimeFormat` matches.
4. **Excel download semantics.** `EXCEL_GENERATOR_REGISTRY` currently holds only SJP
   generators. Should the Excel download **regenerate** a formatted workbook (new
   generator, larger scope) or return the **originally uploaded** template? This
   materially affects scope.
5. **Court name & address lines.** Confirm the exact header/PDF court name and
   address lines against the live staging style guide before finalising locale
   content.
6. **Welsh translations.** All `[WELSH TRANSLATION REQUIRED: …]` markers (including
   the friendly Welsh list name) need sign-off / the translation post-processing
   step.
