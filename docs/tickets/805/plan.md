# Technical Plan — #805 Financial List (ChD/KB) Daily Cause List

## 1. Technical Approach

### High-level strategy
Add a new non-strategic list type, **Financial List (ChD/KB) Daily Cause List**, publishable through the existing Excel-upload route in CaTH. An internal user uploads an `.xlsx`, it is converted to JSON, validated against a schema, stored as an artefact, and rendered as a public HTML "style guide" page with downloadable PDF and Excel versions.

### Key architecture decision — reuse `@hmcts/chd-kb-common`, do NOT mirror RCJ
The ticket's technical spec (written 2026-07-22) predates the shared **`@hmcts/chd-kb-common`** package and instructs mirroring `rcj-standard-daily-cause-list` with a bespoke schema, model, Excel config, renderer and PDF generator. That guidance is now out of date.

Verified against the codebase:
- `libs/list-types/chd-kb-common/` already defines the **exact** field set required by this ticket — `judge, time, venue, type, caseNumber, caseName, additionalInformation` — via:
  - `CHD_KB_EXCEL_CONFIG` (7 fields, `minRows: 1`, `validateTimeFormat` on `time`, all `required: true`)
  - `schemas/chd-kb-common.json` (draft schema, `required: [judge, time, venue, type, caseNumber, caseName, additionalInformation]`)
  - `validateChdKbListType` (validator wrapper)
  - `renderChdKbHearingList` (renderer)
  - `ChdKbHearing` / `ChdKbHearingList` models
  - `extractCaseSummary` / `formatCaseSummaryForEmail` (email summary)
- `libs/list-types/companies-winding-up-chd-daily-cause-list/` (added in commit `b53577443`, the most recent list-type work) is the **direct precedent**: it is a "ChD" list that thinly wraps `@hmcts/chd-kb-common`, adding only its own locales, renderer wrapper (injects the list title), PDF generator, page controller and template.

The Financial List (ChD/KB) is the same shape as companies-winding-up. The correct approach is to **replicate the `companies-winding-up-chd-daily-cause-list` module structure** and reuse `@hmcts/chd-kb-common`, NOT to build a bespoke config/schema/model as the original spec text describes. This avoids duplicating the schema/validator/converter and keeps a single source of truth for the ChD/KB shape.

Consequence: this module has **no `src/schemas/` directory and no `src/validation/` directory of its own** (the guard test in `libs/list-types/common/src/validation/guard.test.ts` only fires when a package ships its own schema; the validator export is re-exported from `@hmcts/chd-kb-common`, exactly as companies-winding-up does).

### Key technical considerations
- **Stable `listTypeName` key everywhere** — `FINANCIAL_LIST_CHD_KB_DAILY_CAUSE_LIST`. Never a numeric `listTypeId` (per CLAUDE.md list-type rules).
- **Reference data is code, not SQL** — `libs/list-types/common/src/list-type-data.ts` is the single source of truth. The ticket spec's references to `apps/postgres/prisma/scripts/001_*.sql` and `003_*.sql` are obsolete; those files do not exist. Adding one entry to `list-type-data.ts` is sufficient and is reflected on every environment by the generated seed SQL.
- **Sub-jurisdiction linkage** — the location record `Business and Property Courts Rolls Building` (`locationId: 26`, `libs/location/src/location-data.ts`) is linked to `region 11` (Royal Courts of Justice Group) and `subJurisdiction 10` (High Court → `jurisdictionId 1`, Civil). The sibling `COMPANIES_WINDING_UP_CHD_DAILY_CAUSE_LIST` uses `subJurisdictionIds: [10]`. The AC says "Civil jurisdiction"; sub-jurisdiction 10 (High Court) rolls up to the Civil jurisdiction and matches the court record, so this list should use `subJurisdictionIds: [10]` to appear under that court — **not `[1]` as the ticket spec text states** (see Open Questions).

### Template source (recorded verbatim as instructed)
> migrate from pip-frontend financial-list-chd-kb-daily-cause-list

### Content verified against the live reference page
Verified against `https://pip-frontend.staging.platform.hmcts.net/financial-list-chd-kb-daily-cause-list?artefactId=bb5307f2-e0fd-4d72-8ae8-b72457413eb8`. The rendered structure matches the Companies Winding Up shape (venue/address block, "Search Cases", 7-column table, data-source footer) **except** for these list-specific points, which MUST be reflected in the locale content, `<h1>`, and template — do not blindly copy the Companies Winding Up strings:

- **Page title / `<h1>`** is the full form: `Financial List (Chancery Division/King's Bench Division/Commercial Court) Daily Cause List`. The ticket's "Financial List (ChD/KB)" is shorthand only. (Use the full form for `pageTitle`/`<h1>` and PDF title; keep `FINANCIAL_LIST_CHD_KB_DAILY_CAUSE_LIST` as the stable name and the ChD/KB short form for `shortenedFriendlyName`/`englishFriendlyName` — confirm friendly-name wording, Open Q.)
- **Venue / address:** `Rolls Building`, `Fetter Lane, London`, `EC4A 1NL` (same as Companies Winding Up).
- **Important information** is Financial-List-specific — remote-hearing guidance for **Chancery Division** and **Commercial Court** judges, including contacts `chanceryjudgeslisting@justice.gov.uk` and `comct.listing@justice.gov.uk`. This is NOT the Companies Winding Up "Company Insolvency Pro Bono Scheme" text. Capture the exact wording from the live page during implementation.
- **Data source footer:** `Data Source: Manual Upload`.
- **Download links:** the live reference page shows **no** PDF/Excel links, but ticket AC explicitly requires both — the AC takes precedence, so PDF + Excel downloads are retained.

## 2. Implementation Details

### New library module
`libs/list-types/financial-list-chd-kb-daily-cause-list/` — mirrors `companies-winding-up-chd-daily-cause-list`:

```
libs/list-types/financial-list-chd-kb-daily-cause-list/
├── package.json                # @hmcts/financial-list-chd-kb-daily-cause-list
│                               # deps: @hmcts/chd-kb-common, @hmcts/list-types-common,
│                               #       @hmcts/pdf-generation, @hmcts/postgres-prisma,
│                               #       exceljs, luxon, nunjucks
│                               # build:nunjucks copies src/pdf/*.njk to dist
├── tsconfig.json
├── README.md
└── src/
    ├── config.ts               # moduleRoot, assets
    ├── index.ts                # re-exports from @hmcts/chd-kb-common:
    │                           #   ChdKbHearing/ChdKbHearingList (aliased)
    │                           #   validateChdKbListType as validateFinancialListChdKbDailyCauseList
    │                           #   extractCaseSummary, formatCaseSummaryForEmail, SPECIAL_CATEGORY_DATA_WARNING
    │                           # + local locales, renderer, pdf-generator
    │                           # + side-effect import of conversion config
    ├── conversion/
    │   ├── financial-list-chd-kb-daily-cause-list-config.ts   # = CHD_KB_EXCEL_CONFIG; registerConverterByName("FINANCIAL_LIST_CHD_KB_DAILY_CAUSE_LIST", converter)
    │   └── financial-list-chd-kb-daily-cause-list-config.test.ts
    ├── rendering/
    │   ├── renderer.ts         # renderFinancialListChdKbDailyCauseList → renderChdKbHearingList with local listTitle
    │   └── renderer.test.ts
    ├── locales/
    │   ├── en.ts               # pageTitle, venue/address lines, table headers, search labels, provenanceLabels, cautions
    │   └── cy.ts               # identical keys; Welsh (WELSH TRANSLATION REQUIRED markers where unknown)
    └── pdf/
        ├── pdf-template.njk
        ├── pdf-generator.ts    # generateFinancialListChdKbDailyCauseListPdf
        └── pdf-generator.test.ts
```

Note: **no `schemas/`, no `validation/`, no `models/` directories** — those live in `@hmcts/chd-kb-common` and are re-exported. This matches companies-winding-up exactly.

### Page controller (public style-guide page)
`apps/web/src/pages/(list-types)/financial-list-chd-kb-daily-cause-list/`:
```
├── index.ts                                              # GET via createSimpleListTypeHandler; SUPPORTED_LIST_TYPE guard on listTypeName
├── financial-list-chd-kb-daily-cause-list.njk            # extends layouts/base-template.njk; GOV.UK table, 7 cols in required order, search, details, back-to-top
├── financial-list-chd-kb-daily-cause-list.njk.test.ts    # structural (Cheerio) + Welsh + locale-key parity
└── index.test.ts                                         # GET handler tests (guard, render)
```
- URL: `/financial-list-chd-kb-daily-cause-list?artefactId=<uuid>` (auto-discovered from directory).
- Controller pattern copied from companies-winding-up `index.ts`: `validate = validateFinancialListChdKbDailyCauseList`, `SUPPORTED_LIST_TYPE = "FINANCIAL_LIST_CHD_KB_DAILY_CAUSE_LIST"`, guard renders `errors/common` on mismatch, `render` calls the local renderer + `resolveDataSource`.

### Reference data entry
Append to `libs/list-types/common/src/list-type-data.ts`:
```ts
{
  name: "FINANCIAL_LIST_CHD_KB_DAILY_CAUSE_LIST",
  englishFriendlyName: "Financial List (ChD/KB) Daily Cause List",
  welshFriendlyName: "[WELSH TRANSLATION REQUIRED: \"Financial List (ChD/KB) Daily Cause List\"]",
  shortenedFriendlyName: "Financial List (ChD/KB) Daily Cause List",
  provenance: "CFT_IDAM",
  urlPath: "financial-list-chd-kb-daily-cause-list",
  isNonStrategic: true,
  defaultSensitivity: "Public",
  subJurisdictionIds: [10]   // High Court → Civil jurisdiction; matches Business & Property Courts Rolls Building (locationId 26). See Open Questions.
}
```
No SQL files are hand-written; the generated seed SQL (`apps/postgres/prisma/generate-seed-sql.ts`) picks this up. The `Business and Property Courts Rolls Building` location (`locationId 26`) already links region 11 and sub-jurisdiction 10, so no `location-data.ts` change is required if `[10]` is confirmed.

### Registration points (mirror companies-winding-up, verified line refs)
| File | Change |
|------|--------|
| `libs/publication/src/processing/service.ts` | Import `generateFinancialListChdKbDailyCauseListPdf` + `FinancialListChdKbHearingList`; add `FINANCIAL_LIST_CHD_KB_DAILY_CAUSE_LIST` entry to `PDF_GENERATOR_REGISTRY` (near line 181) |
| `libs/publication/package.json` | Add `"@hmcts/financial-list-chd-kb-daily-cause-list": "workspace:*"` |
| `apps/web/src/app.ts` | `import { moduleRoot as financialListChdModuleRoot } from "@hmcts/financial-list-chd-kb-daily-cause-list/config";` and add to `modulePaths` (near line 140) |
| root `tsconfig.json` | Add `@hmcts/financial-list-chd-kb-daily-cause-list` and `/config` path entries (near line 65) |

No `vite.config.ts` change is needed (companies-winding-up added none; the module ships no bundled frontend assets).

### API endpoints
None new. Publishing uses the existing non-strategic Excel upload route; the converter is discovered via `registerConverterByName`, and the validator via the dynamic dispatcher `validateListTypeJson` (`libs/list-types/common/src/validation/list-type-validator.ts`), which imports `@hmcts/financial-list-chd-kb-daily-cause-list` by kebab-cased name and calls its `validate*` export.

### Database schema changes
None. This uses the existing `artefact` / `list_type` tables; the only data change is the `list-type-data.ts` entry.

## 3. Error Handling & Edge Cases

- **Missing/empty required cell** — `CHD_KB_EXCEL_CONFIG` marks all 7 fields `required: true`; `convertExcelToJson` throws `Missing required field '<Header>'` before any artefact is stored.
- **Missing column** — converter throws `Excel file must contain columns …`.
- **Invalid time** — `validateTimeFormatSimple` on `time`, schema pattern `^\d{1,2}([:.]\d{2})?\s*[ap]m\s*$` (accepts `9am`, `10:30pm`, `10.30am`); same as Companies Winding Up.
- **HTML injection** — text fields validated for HTML tags per the shared config's validators.
- **JSON schema validation** — after conversion, `validateFinancialListChdKbDailyCauseList` (= `validateChdKbListType`) enforces the required array; invalid payloads are rejected and not published.
- **Wrong list type on the render route** — controller guard compares `artefact.listTypeName !== "FINANCIAL_LIST_CHD_KB_DAILY_CAUSE_LIST"` and renders `errors/common` (400).
- **Empty hearing list** — template shows `noHearingsMessage`.
- **PDF failure** — `pdf-generator` returns `createPdfErrorResult` on exception; no throw to caller.
- **Welsh rendering** — `?lng=cy`; locale-key parity enforced by test.

## 4. Acceptance Criteria Mapping

| AC | How satisfied | Verification |
|----|---------------|--------------|
| Created under Business & Property Courts (Rolls Building), Civil jurisdiction, RCJ Group region | `list-type-data.ts` entry with `subJurisdictionIds: [10]`; location 26 already links region 11 + sub-jurisdiction 10 (Civil) | Seed + manual browse; confirm `[10]` (Open Q) |
| Fields in listed order (Judge, Time, Venue, Type, Case Number, Case Name, Additional Information) | Reuses `CHD_KB_EXCEL_CONFIG` + `chd-kb-common` schema, both already in that order | `financial-list-*-config.test.ts` asserts field order/length |
| Published via Excel upload, converted to JSON | `registerConverterByName("FINANCIAL_LIST_CHD_KB_DAILY_CAUSE_LIST", converter)` | conversion test + manual upload |
| Validation schema + style guide created | Validator re-exported as `validateFinancialListChdKbDailyCauseList`; style-guide page + template | validator dispatch resolves; njk test |
| PDF and Excel downloadable | PDF generator registered in `PDF_GENERATOR_REGISTRY`; Excel download handled by existing non-strategic download route | pdf-generator test; manual download |
| Structure follows the reference style guide | Template mirrors companies-winding-up layout (header block, search, table, data source, back-to-top) | njk structural test |
| JSON format matches issue sample | Identical to `ChdKbHearing` shape | model reuse; validator test |

## 5. Decisions & Open Questions

### Resolved (confirmed by product — mirror Companies Winding Up (ChD) exactly)

1. **Schema, validator and Excel config — identical to Companies Winding Up.** Reuse `@hmcts/chd-kb-common` unchanged: both `CHD_KB_EXCEL_CONFIG` (converter) and `schemas/chd-kb-common.json` (JSON schema). The module ships **no** `schemas/`/`validation/`/`models/` of its own. This overrides the ticket spec's obsolete "mirror RCJ / bespoke schema" text.
2. **Mandatory fields — all 7 required.** `CHD_KB_EXCEL_CONFIG` and the shared schema mark all 7 fields (including `additionalInformation` and `caseName`) `required: true`. Same as Companies Winding Up. No change to the shared config.
3. **Time format — follow Companies Winding Up.** Use `validateTimeFormatSimple` (in the config) and the shared schema pattern `^\d{1,2}([:.]\d{2})?\s*[ap]m\s*$`. This pattern **accepts the sample `10:30pm`**. No special-casing needed.

### Still open

1. **Sub-jurisdiction linkage.** The ticket spec text says `subJurisdictionIds: [1]` (Civil Court), but the target court record `Business and Property Courts Rolls Building` (`locationId 26`) links `subJurisdiction 10` (High Court), and the sibling `COMPANIES_WINDING_UP_CHD_DAILY_CAUSE_LIST` uses `[10]`. Both roll up to the Civil jurisdiction. Plan uses **`[10]`** to match the sibling ChD list at the same court. Confirm.
2. **Excel download semantics.** Regenerate a formatted workbook or return the originally uploaded template? (Follow whatever Companies Winding Up does — verify at implementation.)
3. **Court name & address lines — verified against live page** (`Rolls Building` / `Fetter Lane, London` / `EC4A 1NL`; H1 = `Financial List (Chancery Division/King's Bench Division/Commercial Court) Daily Cause List`). Capture the exact "Important information" wording (Chancery Division + Commercial Court remote-hearing guidance and the two `@justice.gov.uk` contacts) during implementation.
4. **Welsh translations.** All `[WELSH TRANSLATION REQUIRED: …]` markers (friendly name, locales) pending sign-off.
