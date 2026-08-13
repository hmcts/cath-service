# Technical Plan — #802: Commercial Court (KB) Daily Cause List

## 1. Technical Approach

Add a new non-strategic list type, `COMMERCIAL_COURT_KB_DAILY_CAUSE_LIST`, published via the
existing CaTH Excel upload route, converted to canonical JSON, and rendered as public HTML with a
PDF download. No generated Excel download is required (see §2.2).

**The correct reference is `companies-winding-up-chd-daily-cause-list`, NOT
`administrative-court-daily-cause-list`.** The shared library `@hmcts/chd-kb-common`
(`libs/list-types/chd-kb-common/`) already defines the exact field set/order this ticket requires:

```
judge, time, venue, type, caseNumber, caseName, additionalInformation
```

`chd-kb-common` already provides, ready to reuse:

- `ChdKbHearing` / `ChdKbHearingList` types (`models/types.ts`) — identical to the ticket's JSON.
- The JSON **schema** (`schemas/chd-kb-common.json`) with those seven fields, the no-HTML pattern
  on every string, and the simple-time pattern on `time`.
- `validateChdKbListType` — the schema validator (`validation/json-validator.ts`).
- `CHD_KB_EXCEL_CONFIG` — the Excel converter field map with headers
  `Judge, Time, Venue, Type, Case Number, Case Name, Additional Information`
  (`conversion/chd-kb-excel-config.ts`).
- `renderChdKbHearingList` — the header + hearings renderer (`rendering/renderer.ts`).
- `extractCaseSummary`, `formatCaseSummaryForEmail`, `SPECIAL_CATEGORY_DATA_WARNING` — email summary.

So the new lib is a **thin per-list-type consumer of `@hmcts/chd-kb-common`**, mirroring
`companies-winding-up-chd-daily-cause-list` almost exactly. We do **not** write a bespoke schema,
Excel config, validator, or renderer. The only genuinely new code is: this list type's own locale
files, its PDF generator + template, the converter registration under its own DB name, the page
controller + template, and the composition-point registrations.

Key architecture decisions:

- **Reuse `@hmcts/chd-kb-common` for schema, validator, Excel config, types, and renderer.** This
  is the whole point of that shared lib — the previous premise (bespoke config because fields differ
  from `RCJ_EXCEL_CONFIG`) does not apply; `chd-kb-common` is the shared home for exactly this field
  set.
- **Route on the stable `listTypeName`** `COMMERCIAL_COURT_KB_DAILY_CAUSE_LIST` everywhere — never a
  numeric `listTypeId` (CLAUDE.md List Type rules). Single supported list type → simple
  `guardArtefact` pattern (as in `companies-winding-up-chd-daily-cause-list/index.ts`).
- **Converter registration stays in the new lib**, keyed on this list type's own DB name:
  `registerConverterByName("COMMERCIAL_COURT_KB_DAILY_CAUSE_LIST", createConverter(CHD_KB_EXCEL_CONFIG))`,
  invoked via a side-effect import in `index.ts` — exactly as
  `companies-winding-up-chd-daily-cause-list-config.ts` does.
- **CI guard satisfied by re-export.** The new lib ships **no** schema file (the schema lives in
  `chd-kb-common`), so it re-exports `validateChdKbListType as validateCommercialCourtKbDailyCauseList`
  from `index.ts`. The `libs/list-types/common` guard test only fails a package that ships a schema
  without a `validate*` export; we ship no schema, and we still export a validator — both conditions
  satisfied.
- **Reference data via TypeScript source of truth only.** Add one entry to
  `libs/list-types/common/src/list-type-data.ts`. Do not hand-write SQL (CLAUDE.md item 7). The court
  location, region, and sub-jurisdiction already exist (see §2), so no new location/region/jurisdiction
  rows are needed.

## 2. Implementation Details

**TEMPLATE SOURCE: migrate from pip-frontend commercial-court-kb-daily-cause-list**

### New lib: `libs/list-types/commercial-court-kb-daily-cause-list/`

Mirror `companies-winding-up-chd-daily-cause-list` (the thin `chd-kb-common` consumer):

```
libs/list-types/commercial-court-kb-daily-cause-list/
├── package.json                # name @hmcts/commercial-court-kb-daily-cause-list;
│                               # deps: @hmcts/chd-kb-common, @hmcts/list-types-common, @hmcts/publication, @hmcts/pdf-generation
├── tsconfig.json
└── src/
    ├── index.ts                # side-effect import of converter config; re-export types/validator/
    │                           # email-summary from @hmcts/chd-kb-common under this list's names;
    │                           # export locales, renderer wrapper, pdf generator
    ├── config.ts               # moduleRoot, assets  (NO schemaPath — schema lives in chd-kb-common)
    ├── conversion/commercial-court-kb-daily-cause-list-config.ts       # CHD_KB_EXCEL_CONFIG + registerConverterByName(this name)
    ├── conversion/commercial-court-kb-daily-cause-list-config.test.ts
    ├── rendering/renderer.ts   # thin wrapper over renderChdKbHearingList, passing listTitle from locales
    ├── rendering/renderer.test.ts
    ├── pdf/pdf-generator.ts     # generateCommercialCourtKbDailyCauseListPdf (mirror companies-winding-up)
    ├── pdf/pdf-generator.test.ts
    ├── pdf/pdf-template.njk
    └── locales/{en.ts,cy.ts}    # pageTitle, venue/address, importantInformation copy, tableHeaders, caution notes
```

**No** `models/types.ts`, `schemas/`, or `validation/` directory in the new lib — those are inherited
from `@hmcts/chd-kb-common`.

`index.ts` mirrors `companies-winding-up-chd-daily-cause-list/src/index.ts`:

```typescript
import "./conversion/commercial-court-kb-daily-cause-list-config.js"; // register converter on load

export type {
  ChdKbHearing as CommercialCourtKbHearing,
  ChdKbHearingList as CommercialCourtKbHearingList
} from "@hmcts/chd-kb-common";
export {
  extractCaseSummary,
  formatCaseSummaryForEmail,
  SPECIAL_CATEGORY_DATA_WARNING,
  validateChdKbListType as validateCommercialCourtKbDailyCauseList
} from "@hmcts/chd-kb-common";
export type { ValidationResult } from "@hmcts/publication";
export { cy as commercialCourtKbDailyCauseListCy } from "./locales/cy.js";
export { en as commercialCourtKbDailyCauseListEn } from "./locales/en.js";
export * from "./pdf/pdf-generator.js";
export * from "./rendering/renderer.js";
```

Converter config (`conversion/commercial-court-kb-daily-cause-list-config.ts`):

```typescript
import { CHD_KB_EXCEL_CONFIG } from "@hmcts/chd-kb-common";
import { createConverter, registerConverterByName } from "@hmcts/list-types-common";

const converter = createConverter(CHD_KB_EXCEL_CONFIG);
registerConverterByName("COMMERCIAL_COURT_KB_DAILY_CAUSE_LIST", converter);
```

Renderer wrapper (`rendering/renderer.ts`) — mirror companies-winding-up: call
`renderChdKbHearingList(hearingList, { ...options, listTitle: t.pageTitle })` with `t` from this
lib's locales.

PDF generator (`pdf/pdf-generator.ts`) — copy `generateCompaniesWindingUpChdDailyCauseListPdf`,
rename to `generateCommercialCourtKbDailyCauseListPdf`, point at this lib's renderer/locales/template.

Locales — copy the companies-winding-up `en.ts`/`cy.ts` shape and change the list-type-specific
copy: `pageTitle: "Commercial Court (KB) Daily Cause List"`, the correct important-information /
caution wording (see CLARIFICATIONS), and Welsh translations. Keep `tableHeaders` keys exactly
`judge, time, venue, type, caseNumber, caseName, additionalInformation`. `en.ts`/`cy.ts` keys must
be identical (parity test).

### New page: `apps/web/src/pages/(list-types)/commercial-court-kb-daily-cause-list/`

```
index.ts                                     # GET via createSimpleListTypeHandler, single-type guard
index.test.ts                                # controller tests (mirror companies-winding-up index.test.ts)
commercial-court-kb-daily-cause-list.njk     # flat GOV.UK table, columns in ticket order
commercial-court-kb-daily-cause-list.njk.test.ts
```

Controller mirrors `companies-winding-up-chd-daily-cause-list/index.ts`:
`validate = validateChdKbListType` (imported from `@hmcts/chd-kb-common`),
`SUPPORTED_LIST_TYPE = "COMMERCIAL_COURT_KB_DAILY_CAUSE_LIST"`, single-type `guardArtefact`,
`render` calling this lib's renderer and resolving the data source via `resolveDataSource`.

Template migrated from pip-frontend `commercial-court-kb-daily-cause-list`, structured like
`companies-winding-up-chd-daily-cause-list.njk`: list title, "List for {date}", "Last updated …",
important-information `govukDetails`, case-search input, a single `govuk-table` with the seven
columns in ticket order, data-source line, back-to-top.

### Registrations (composition points)

1. `libs/publication/src/processing/service.ts` — import `generateCommercialCourtKbDailyCauseListPdf`
   + `CommercialCourtKbHearingList`; register `COMMERCIAL_COURT_KB_DAILY_CAUSE_LIST` in
   `PDF_GENERATOR_REGISTRY` (mirror the `COMPANIES_WINDING_UP_CHD_DAILY_CAUSE_LIST` entry).
2. **No `EXCEL_GENERATOR_REGISTRY` entry.** The "Excel downloadable version" AC is satisfied by the
   Excel-template upload round-trip, consistent with the sibling `companies-winding-up-chd` list
   (which is also absent from `EXCEL_GENERATOR_REGISTRY`). No generated `.xlsx` download is built.
3. `libs/list-types/common/src/list-type-data.ts` — add (mirroring the companies-winding-up entry):
   ```typescript
   {
     name: "COMMERCIAL_COURT_KB_DAILY_CAUSE_LIST",
     englishFriendlyName: "Commercial Court (KB) Daily Cause List",
     welshFriendlyName: "[WELSH TRANSLATION REQUIRED]",
     shortenedFriendlyName: "Commercial Court (KB) Daily Cause List",
     provenance: "CFT_IDAM",
     urlPath: "commercial-court-kb-daily-cause-list",
     isNonStrategic: true,
     defaultSensitivity: "Public",
     subJurisdictionIds: [10]
   }
   ```
   Rationale: `subJurisdictionId: 10` = "High Court" under `jurisdictionId: 1` = "Civil" — the same
   value the sibling companies-winding-up (Rolls Building) list uses. The location "Business and
   Property Courts Rolls Building" (locationId 26) already exists with `regions: [11]` (Royal Courts
   of Justice Group) and `subJurisdictions: [10]`. Satisfies the AC without new
   location/region/jurisdiction rows. Run `yarn db:generate` / `yarn db:seed`.
4. Root `tsconfig.json` — add both path aliases (mirror companies-winding-up):
   `"@hmcts/commercial-court-kb-daily-cause-list": ["libs/list-types/commercial-court-kb-daily-cause-list/src"]`
   and its `/config` variant.
5. `apps/web/package.json` — add `"@hmcts/commercial-court-kb-daily-cause-list": "workspace:*"`
   (dep). `@hmcts/chd-kb-common` is already a dep.
6. `apps/web/src/app.ts` — import `moduleRoot as commercialCourtKbModuleRoot` from
   `@hmcts/commercial-court-kb-daily-cause-list/config` and add to `modulePaths` (Nunjucks discovery
   of the PDF template dir). Page routes are auto-discovered — no manual route registration.

No new database schema/migration (no new Prisma model). No new API endpoints (public read uses the
existing artefact retrieval path).

## 3. Error Handling & Edge Cases

- **Missing `artefactId`** → 400 `errors/common`.
- **Artefact not found / JSON blob missing** → 404 `errors/common`.
- **Wrong `listTypeName`** → 400 `errors/common` ("Invalid List Type") via `guardArtefact`.
- **Schema validation failure** → 400 `errors/common`.
- **Unexpected/server error** → 500 `errors/common`.
  (All handled centrally by `createSimpleListTypeHandler`; tests assert each branch.)
- **Empty list (zero rows)** → renders headers + "no hearings" message (renderer/template handle it).
- **HTML in any field** → rejected at Excel-conversion time (`validateNoHtmlTags` in
  `CHD_KB_EXCEL_CONFIG`) and again by the shared schema no-HTML pattern.
- **Malformed `time`** → rejected by `validateTimeFormatSimple` on upload and the schema `time`
  pattern.
- **`additionalInformation`** → required by the shared `chd-kb-common` schema (all seven fields are
  required there), confirmed as intended; the ticket's sample payload always includes it.
- **Welsh (`?lng=cy`)** → `t = locale === "cy" ? cy : en`; all visible strings from locale files.

## 4. Acceptance Criteria Mapping

| AC | How satisfied | Verification |
|----|---------------|--------------|
| Created under Business & Property Courts Rolls Building, Civil jurisdiction, RCJ Group region | `list-type-data.ts` entry `subJurisdictionIds: [10]`; existing location 26 (region 11, subJurisdiction 10 → Civil) | Seed + inspect; page reachable under that court |
| Fields in order Judge, Time, Venue, Type, Case Number, Case Name, Additional Information | Inherited `chd-kb-common` schema + `CHD_KB_EXCEL_CONFIG` + `ChdKbHearing` type already in this order; locale `tableHeaders` in order | `chd-kb-common` existing schema tests; new `.njk.test.ts` column order |
| Published via Excel upload, converted to JSON | `registerConverterByName("COMMERCIAL_COURT_KB_DAILY_CAUSE_LIST", createConverter(CHD_KB_EXCEL_CONFIG))` | Converter unit test; manual upload journey |
| Validation schema + style guide created | Reuses `chd-kb-common` schema + `validateChdKbListType` re-exported as `validateCommercialCourtKbDailyCauseList`; page/PDF style guide from pip-frontend | CI guard passes; controller/validator tests |
| PDF + Excel downloadable | PDF: `PDF_GENERATOR_REGISTRY` entry. Excel: satisfied by the upload round-trip (no generated `.xlsx`, matching sibling CHD/KB list) | `pdf-generator.test.ts` |
| Style guide follows pip-frontend structure | Template migrated from pip-frontend `commercial-court-kb-daily-cause-list` | `.njk.test.ts`; visual compare vs staging URL |
| JSON matches ticket format | Inherited `ChdKbHearing` keys are exactly `judge,time,venue,type,caseNumber,caseName,additionalInformation` | Reuses `chd-kb-common` validator against the ticket's sample payload |
| CI validator guard passes | `validate*` re-exported from lib `index.ts`; lib ships no schema file | `libs/list-types/common/src/validation/guard.test.ts` |
| Welsh rendering | `en.ts`/`cy.ts` parity; `?lng=cy` | `.njk.test.ts` Welsh render; key-parity assertion |

## 5. CLARIFICATIONS NEEDED

1. **Important-information / caution copy.** The companies-winding-up list uses Chancery-specific
   copy (Company Insolvency Pro Bono Scheme, Special Category Data caution). Confirm the exact
   English (and Welsh) important-information / caution wording for the Commercial Court (KB), or
   whether the pip-frontend staging page's copy should be transcribed verbatim.
2. **Welsh translations.** `welshFriendlyName`, page title, table headers, and body/caution copy
   need official Welsh translations; placeholders used until provided.
3. **Exact Excel template column headers.** `CHD_KB_EXCEL_CONFIG` matches on
   `Judge, Time, Venue, Type, Case Number, Case Name, Additional Information`. Confirm the
   Commercial Court (KB) upload template uses these exact headers.
4. **Default sensitivity.** Assumed `Public` (matches the sibling Rolls Building list). Confirm.

**Resolved:** No generated Excel download (upload round-trip satisfies the AC).
`additionalInformation` is required (all seven `chd-kb-common` fields required).
