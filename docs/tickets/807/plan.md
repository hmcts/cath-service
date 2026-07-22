# Technical Plan — #807: Intellectual Property and Enterprise Court (ChD) Daily Cause List

## 1. Technical Approach

Add a new **non-strategic, single-table** list type published via the existing Excel upload journey, rendered as an HTML page with PDF and Excel downloads. No new admin/upload route is needed — the upload, conversion, publication, and download pipelines already exist and dispatch by `listTypeName`.

The closest existing implementation is **`libs/list-types/rcj-standard-daily-cause-list`** (a genuine single-table list using `createConverter(RCJ_EXCEL_CONFIG)`, `minRows: 1`, strict time validation). We copy that module's structure.

**Key deviation from the RCJ standard template:** the RCJ config uses fields `venue, judge, time, caseNumber, caseDetails, hearingType, additionalInformation`. IPEC's contract (from the issue JSON) is different — `judge, time, venue, type, caseNumber, caseName, additionalInformation`. Field **names and order differ**, so we cannot reuse `RCJ_EXCEL_CONFIG`, the RCJ schema, the RCJ types, or the RCJ renderer's field mapping directly. We create a **bespoke schema, types, Excel converter config, renderer, and PDF template** for IPEC, while reusing the shared plumbing (`createJsonValidator`, `createConverter`, `registerConverterByName`, `validateNoHtmlTags`, `validateTimeFormatSimple`, `createSimpleListTypeHandler`, `resolveDataSource`, PDF helpers).

### Field mapping (canonical for this ticket)

| Display order (AC) | JSON field | Excel column header | Required |
|---|---|---|---|
| Judge | `judge` | Judge | yes |
| Time | `time` | Time | yes |
| Venue | `venue` | Venue | yes |
| Type | `type` | Type | yes |
| Case Number | `caseNumber` | Case Number | yes |
| Case Name | `caseName` | Case Name | yes |
| Additional Information | `additionalInformation` | Additional Information | no |

> The AC lists "Venue Type" as one field; the JSON has two (`venue`, `type`). This plan follows the JSON (two columns). See Open Questions Q1.

### Canonical identifiers (assumed — confirm in Open Questions)

- **`list_type.name`:** `INTELLECTUAL_PROPERTY_ENTERPRISE_COURT_DAILY_CAUSE_LIST`
- **`urlPath` / route slug:** `intellectual-property-enterprise-court-daily-cause-list`
- **Package name:** `@hmcts/intellectual-property-enterprise-court-daily-cause-list`
- **Provenance:** `CFT_IDAM`
- **Default sensitivity:** `Public`, **`isNonStrategic`: `true`**

> The single name string MUST be identical across all six touch-points (converter registration, `list-type-data.ts`, `PDF_GENERATOR_REGISTRY`, controller guard, `seed-list-types.ts`, DB). The existing Court of Appeal Civil list has a name/url inconsistency (`COURT_OF_APPEAL_CIVIL_DAILY_CAUSE_LIST` vs `..._DIVISION_...` in converter/seed) — do NOT replicate that mistake.

## 2. Implementation Details

### 2.1 New module: `libs/list-types/intellectual-property-enterprise-court-daily-cause-list/`

```
package.json          @hmcts/intellectual-property-enterprise-court-daily-cause-list (copy rcj-standard; . and ./config exports; build:nunjucks + build:schemas)
tsconfig.json         copy rcj-standard
README.md
src/
  config.ts           moduleRoot + schemaPath -> schemas/intellectual-property-enterprise-court-daily-cause-list.json
  index.ts            side-effect import of conversion config; export validate*, locales, renderer, pdf, types
  schemas/intellectual-property-enterprise-court-daily-cause-list.json
  models/types.ts     IpecHearing, IpecHearingList
  validation/json-validator.ts        validateIpecDailyCauseList
  validation/json-validator.test.ts
  conversion/intellectual-property-enterprise-court-daily-cause-list-config.ts   IPEC_EXCEL_CONFIG + registerConverterByName
  conversion/...-config.test.ts
  rendering/renderer.ts               renderIpecDailyCauseList
  rendering/renderer.test.ts
  pdf/pdf-generator.ts                generateIpecDailyCauseListPdf(options incl. listTypeName)
  pdf/pdf-template.njk
  pdf/pdf-generator.test.ts
  locales/en.ts, locales/cy.ts
  email-summary/summary-builder.ts + test   (copy rcj-standard shape)
```

**`models/types.ts`:**
```typescript
export interface IpecHearing {
  judge: string;
  time: string;
  venue: string;
  type: string;
  caseNumber: string;
  caseName: string;
  additionalInformation: string;
}
export type IpecHearingList = IpecHearing[];
```

**Schema** (`root type: "array"`; required = judge, time, venue, type, caseNumber, caseName; `additionalInformation` optional): free-text fields use the no-HTML pattern `^(?!(.|\r|\n)*<[^>]+>)(.|\r|\n)*$`; `time` uses `^\d{1,2}([:.]\d{2})?[ap]m\s*$` (matches `9am`, `10:30pm`). Properties emitted in AC order.

**Validator wrapper** (mandatory — CI guard `libs/list-types/common/src/validation/guard.test.ts` requires an `index.ts` matching `/export\s+.*validate[A-Z]/`):
```typescript
import { createJsonValidator, type ValidationResult } from "@hmcts/list-types-common";
import { schemaPath } from "../config.js";
export function validateIpecDailyCauseList(jsonData: unknown): ValidationResult {
  return createJsonValidator(schemaPath)(jsonData);
}
```
Re-export explicitly from `index.ts`: `export { validateIpecDailyCauseList } from "./validation/json-validator.js";`

**Excel converter** (`conversion/...-config.ts`): a bespoke `ExcelConverterConfig` (do NOT reuse `RCJ_EXCEL_CONFIG` — fields differ). Columns in AC order; `judge/venue/type/caseNumber/caseName` required with `validateNoHtmlTags`; `time` required with `validateTimeFormatSimple` (simple pattern, accepts the issue's `10:30pm`); `additionalInformation` optional; `minRows: 1`. Then:
```typescript
const converter = createConverter(IPEC_EXCEL_CONFIG);
registerConverterByName("INTELLECTUAL_PROPERTY_ENTERPRISE_COURT_DAILY_CAUSE_LIST", converter);
```

**Renderer** (`rendering/renderer.ts`): mirror `renderStandardDailyCauseList` — build `header` (listTitle, listDate via `formatDisplayDate`, lastUpdated via `formatLastUpdatedDateTime`) and `hearings: normaliseHearings(hearingList)`. Single hearings array (no future-judgments tab).

**PDF generator** (`pdf/pdf-generator.ts`): copy `generateRcjStandardDailyCauseListPdf`, rename to `generateIpecDailyCauseListPdf`, accept `listTypeName: string` in options, use a `LIST_TITLE_MAP` keyed by the IPEC name. New `pdf-template.njk` with the 7 IPEC columns in AC order.

### 2.2 Web page controller + templates

`apps/web/src/pages/(list-types)/intellectual-property-enterprise-court-daily-cause-list/`
- `index.ts` — copy the **court-of-appeal-civil** single-list controller (simpler than the multi-list rcj-standard one). Uses `createSimpleListTypeHandler<IpecHearingList>` with `validate = createJsonValidator(schemaPath)`, a `guardArtefact` checking `artefact.listTypeName !== "INTELLECTUAL_PROPERTY_ENTERPRISE_COURT_DAILY_CAUSE_LIST"` (400 → `errors/common`), and `render` calling `renderIpecDailyCauseList` + `resolveDataSource`. `ROUTES = ["/intellectual-property-enterprise-court-daily-cause-list"]`.
- `intellectual-property-enterprise-court-daily-cause-list.njk` — single GOV.UK table, columns in AC order; header (title + location lines), important-information via `details`, client-side case search input with visible label, data-source line, back-to-top anchor, download links. Extend the shared list-type layout used by rcj-standard njk files.
- `index.test.ts` and `...njk.test.ts` (Cheerio) — per testing rules.

### 2.3 Registration touch points

| # | File | Change |
|---|------|--------|
| 1 | `libs/list-types/common/src/list-type-data.ts` | Add `ListTypeData` entry: name, en/cy friendly names, `provenance: "CFT_IDAM"`, `urlPath`, `isNonStrategic: true`, `defaultSensitivity: "Public"`, `subJurisdictionIds: [<see Q2>]` |
| 2 | conversion config | `registerConverterByName("INTELLECTUAL_PROPERTY_ENTERPRISE_COURT_DAILY_CAUSE_LIST", converter)` (loaded via `index.ts` side-effect import) |
| 3 | `libs/publication/src/processing/service.ts` | Import `generateIpecDailyCauseListPdf` + `IpecHearingList`; add `INTELLECTUAL_PROPERTY_ENTERPRISE_COURT_DAILY_CAUSE_LIST: (p) => generateIpecDailyCauseListPdf({ ...p, jsonData: p.jsonData as IpecHearingList })` to `PDF_GENERATOR_REGISTRY` |
| 4 | `libs/publication/package.json` | Add `"@hmcts/intellectual-property-enterprise-court-daily-cause-list": "workspace:*"` |
| 5 | root `tsconfig.json` | Add `paths` entries for the package **and** its `/config` subpath |
| 6 | `apps/web/package.json` | Add workspace dependency |
| 7 | `apps/web/src/app.ts` | Import `moduleRoot as ipecModuleRoot` from `@hmcts/intellectual-property-enterprise-court-daily-cause-list/config`; add to `modulePaths` array (for Nunjucks partial/pdf template discovery) |
| 8 | `e2e-tests/utils/seed-list-types.ts` | Add seed entry with the **same** name + url + flags |

> There is no `apps/web/vite.config.ts` in this repo — asset registration via vite is not applicable. This module ships no CSS/JS assets, so only `modulePaths` needs the module root.

### 2.4 Jurisdiction / region wiring

`ListTypeData` has no direct jurisdiction/region fields — only `subJurisdictionIds: number[]`. Region ("Royal Courts of Justice Group", `regionId: 11`) and jurisdiction ("Civil", `jurisdictionId: 1`) are wired in `libs/location/src/location-data.ts` via each location's `subJurisdictions[]` and the sub-jurisdiction→jurisdiction map. The "Royal Courts of Justice" location already has `subJurisdictions: [1, 4, 5]` (Civil Court, Crown Court, Court of Appeal Civil Division). **There is no "Business and Property Courts" / "Intellectual Property and Enterprise Court" / "Chancery" sub-jurisdiction today** (highest existing id is 30, "Upper Tribunal (Tax and Chancery Chamber)"). See Q2 — either map to an existing Civil sub-jurisdiction id (e.g. `10` High Court or `1` Civil Court) or seed a new one and attach it to the RCJ/Rolls Building location.

## 3. Error Handling & Edge Cases

- **Missing required Excel column / cell** → converter surfaces field + row error in the existing non-strategic upload error summary.
- **Invalid time** → `validateTimeFormatSimple` rejects with row number.
- **HTML/markup in text field** → `validateNoHtmlTags` rejects.
- **Empty file / no rows** → `minRows: 1` fails validation ("does not contain any hearings").
- **Wrong `listTypeName` at view time** → controller guard returns 400 rendering `errors/common`.
- **Missing/expired artefact** → existing not-found handling in `createSimpleListTypeHandler`.
- **`additionalInformation` absent** → optional; template/PDF render blank cell.

## 4. Acceptance Criteria Mapping

| AC | How satisfied | Verified by |
|---|---|---|
| Created under Business and Property Courts (Rolls Building) | `list-type-data.ts` entry + `subJurisdictionIds` wiring to RCJ/Rolls location | manual browse + seed test |
| Linked to Civil jurisdiction & RCJ Group region | sub-jurisdiction (jurisdictionId 1) attached to region-11 location in `location-data.ts` | location-data unit assertion |
| Fields in listed order in schema | Schema properties + Excel config + renderer + templates in AC order | schema/renderer/template tests |
| Published via Excel upload template | `registerConverterByName` + existing upload journey | converter test + E2E |
| PDF & Excel downloadable | `PDF_GENERATOR_REGISTRY` entry (PDF) + converter (Excel) via existing download pipeline | pdf-generator test + E2E |
| Validation schema & style guide created | new schema + validator + njk page matching reference | validator tests, njk tests |
| Style guide follows reference page | header/location/important-info/table/data-source layout copied from reference | njk Cheerio tests |
| JSON format matches issue | `models/types.ts` + schema field names exactly match | schema test |

## 5. Testing

- `validation/json-validator.test.ts` — real schema, fully-hydrated valid fixture, one `it` per required field (judge, time, venue, type, caseNumber, caseName), plus invalid-time and HTML-injection cases. No mocks.
- `conversion/...-config.test.ts` — 7 columns map in order to correct JSON names; `additionalInformation` optional; row-level errors.
- `rendering/renderer.test.ts` — header build + hearing/column order.
- `pdf/pdf-generator.test.ts` — generates for a valid artefact; title map.
- Controller `index.test.ts` — renders template with en/cy/t; 400 on wrong list type; data source resolved.
- `...njk.test.ts` (Cheerio) — column count/order; conditional Additional Information; Welsh headings under `cy`; `Object.keys(en).sort()` === `Object.keys(cy).sort()`.
- CI guard test in `libs/list-types/common` passes.
- One E2E happy-path journey (`@nightly` where appropriate) — public view, Welsh toggle, inline Axe, PDF download.

## 6. CLARIFICATIONS NEEDED

1. **Field naming:** AC says "Venue Type" (one field) but JSON has separate `venue` and `type`. This plan uses **two columns** (Venue, Type) per the JSON. Confirm, or specify a single combined "Venue Type" column.
2. **Sub-jurisdiction wiring:** No "Business and Property Courts"/IPEC/Chancery sub-jurisdiction exists. Seed a new Civil (jurisdictionId 1) sub-jurisdiction and attach it to the Rolls Building/RCJ location, or reuse an existing Civil sub-jurisdiction id (e.g. `10` High Court)? Region is RCJ Group (11).
3. **URL slug:** Reference env uses `intellectual-property-and-enterprise-court-daily-cause-list` (with "and"). This plan assumes the shorter `intellectual-property-enterprise-court-daily-cause-list`. Confirm the canonical slug (must match `urlPath`, route, template name, and seed url).
4. **`list_type.name` constant:** Confirm `INTELLECTUAL_PROPERTY_ENTERPRISE_COURT_DAILY_CAUSE_LIST`.
5. **Time format:** Simple pattern only (`9am`, `10:30pm`) — no 24-hour times? (The issue's `10:30pm` is accepted.)
6. **Important-information / location copy:** Exact static text + address must be lifted from the reference style-guide page before implementation. Is the location "The Rolls Building, 7 Rolls Buildings, Fetter Lane, London, EC4A 1NL" correct?
7. **Excel template:** Single worksheet only (no second "future judgments"/second tab)?
8. **Provenance:** `CFT_IDAM` (consistent with other non-strategic RCJ lists)?
9. **Welsh translations:** Friendly names, page title, important-information, and location lines need official Welsh. Placeholders `[WELSH TRANSLATION REQUIRED: ...]` will be used until provided.
