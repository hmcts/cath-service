# Technical Plan: Competition List (ChD) Daily Cause List

**GitHub Issue:** #804
**List type name (stable, `@unique`):** `COMPETITION_LIST_CHD_DAILY_CAUSE_LIST`
**URL path:** `/competition-list-chd-daily-cause-list`
**Reference style guide:** `https://pip-frontend.staging.platform.hmcts.net/competition-list-chd-daily-cause-list?artefactId=504b46d6-f6b4-4d13-a145-6bbe3b35f1aa`

> A full spec was generated on the issue via `@spec`. This plan condenses it and reconciles it against the current codebase (verified 2026-07-23).

## 1. Technical Approach

This is a **non-strategic** list type published through the existing Excel-upload route: publisher uploads an Excel template → converted to JSON → validated against a JSON schema → stored as an artefact → rendered to HTML with downloadable PDF and Excel.

The JSON payload is a **flat array** of hearing objects with seven fields in a fixed order:
`judge, time, venue, type, caseNumber, caseName, additionalInformation`.

Structurally this is almost identical to the **RCJ Standard Daily Cause List** family
(`libs/list-types/rcj-standard-daily-cause-list`), which also uses a flat array of hearings. It differs only in two field names and the column order:

| Competition List (ChD) field | Order | Closest RCJ field |
|---|---|---|
| `judge` | 1 | `judge` |
| `time` | 2 | `time` |
| `venue` | 3 | `venue` |
| `type` | 4 | `hearingType` (renamed) |
| `caseNumber` | 5 | `caseNumber` |
| `caseName` | 6 | `caseDetails` (renamed) |
| `additionalInformation` | 7 | `additionalInformation` |

**Decision: a dedicated module + dedicated Excel converter config.** Because the field
names (`type`, `caseName`) and column order differ from `RCJ_EXCEL_CONFIG`, the list cannot
reuse `RCJ_EXCEL_CONFIG` verbatim. The alternative (normalising to the RCJ shape and folding
into the multi-list handler) would break the JSON contract given in the issue, so it is
rejected. `libs/list-types/rcj-standard-daily-cause-list` is the copy-from template.

No new Prisma model — uses the existing `Artefact` / `ListType` tables. All routing/guards
use `listTypeName` (never the autoincrement `ListType.id`), per CLAUDE.md.

## 2. Implementation Details

### 2.1 New business-logic module — `libs/list-types/competition-list-chd-daily-cause-list/`

Mirror the RCJ package (verified structure). It does **not** need the RCJ `email-summary/`
sub-tree unless a subscription email summary is required (see Open Questions).

```
libs/list-types/competition-list-chd-daily-cause-list/
├── package.json          # @hmcts/competition-list-chd-daily-cause-list
│                         #   exports "." and "./config"
│                         #   build = "tsc && yarn build:nunjucks && yarn build:schemas"
├── tsconfig.json         # extends ../../../tsconfig.json
├── README.md
└── src/
    ├── config.ts               # moduleRoot, schemaPath
    ├── index.ts                # side-effect import of conversion config (top of file) + exports
    ├── models/
    │   └── types.ts            # CompetitionHearing, CompetitionHearingList
    ├── schemas/
    │   └── competition-list-chd-daily-cause-list.json
    ├── validation/
    │   ├── json-validator.ts        # validateCompetitionListChdDailyCauseList
    │   └── json-validator.test.ts
    ├── conversion/
    │   ├── competition-list-chd-daily-cause-list-config.ts   # config + registerConverterByName
    │   └── competition-list-chd-daily-cause-list-config.test.ts
    ├── rendering/
    │   ├── renderer.ts              # renderCompetitionListChd (view model)
    │   └── renderer.test.ts
    ├── pdf/
    │   ├── pdf-generator.ts         # generateCompetitionListChdDailyCauseListPdf
    │   ├── pdf-template.njk
    │   └── pdf-generator.test.ts
    └── locales/
        ├── en.ts
        └── cy.ts
```

`package.json` must copy RCJ's `build:nunjucks` (copies `pdf/*.njk` to `dist`) and
`build:schemas` (copies `schemas/*.json` to `dist`) steps so schema + PDF template resolve
in the production build. Depend on `@hmcts/list-types-common`, `@hmcts/pdf-generation`,
`@hmcts/postgres-prisma`, `luxon`, `nunjucks`.

`config.ts`:
```typescript
export const moduleRoot = __dirname;
export const schemaPath = path.join(__dirname, "schemas/competition-list-chd-daily-cause-list.json");
```

`index.ts` must side-effect `import "./conversion/competition-list-chd-daily-cause-list-config.js";`
at the very top (registers the converter on module load), then export the models, renderer,
PDF generator, validator, and `en`/`cy` locales.

`models/types.ts`:
```typescript
export interface CompetitionHearing {
  judge: string;
  time: string;
  venue: string;
  type: string;
  caseNumber: string;
  caseName: string;
  additionalInformation: string;
}
export type CompetitionHearingList = CompetitionHearing[];
```

### 2.2 JSON schema — `schemas/competition-list-chd-daily-cause-list.json`

draft-07, `type: array`. Each item requires
`judge, time, venue, type, caseNumber, caseName` (`additionalInformation` optional).
Reuse the RCJ patterns:
- Text fields: `"pattern": "^(?!(.|\\r|\\n)*<[^>]+>)(.|\\r|\\n)*$"` (rejects embedded HTML tags).
- `time`: `"pattern": "^\\d{1,2}([:.]\\d{2})?[ap]m\\s*$"` (accepts `9am`, `10:30pm`, `2.30pm`).

> Confirm the exact `time` pattern against the real RCJ schema before copying — reuse RCJ's
> verbatim if it already matches these examples, to avoid schema drift.

### 2.3 Validator wrapper (MANDATORY — CI guard)

```typescript
// validation/json-validator.ts
import { createJsonValidator, type ValidationResult } from "@hmcts/list-types-common";
import { schemaPath } from "../config.js";

export function validateCompetitionListChdDailyCauseList(jsonData: unknown): ValidationResult {
  return createJsonValidator(schemaPath)(jsonData);
}
```
Export from `index.ts`. The CI guard test at
`libs/list-types/common/src/validation/guard.test.ts` fails if a schema ships without a
matching `validate*` export.

### 2.4 Excel → JSON converter config

`conversion/competition-list-chd-daily-cause-list-config.ts` — build with
`createConverter(...)` and register with
`registerConverterByName("COMPETITION_LIST_CHD_DAILY_CAUSE_LIST", converter)`
(both from `@hmcts/list-types-common`). Columns in the issue's order:

| Excel header | JSON field | Required | Validators |
|---|---|---|---|
| Judge | `judge` | yes | `validateNoHtmlTags` |
| Time | `time` | yes | `validateTimeFormat` |
| Venue | `venue` | yes | `validateNoHtmlTags` |
| Type | `type` | yes | `validateNoHtmlTags` |
| Case Number | `caseNumber` | yes | `validateNoHtmlTags` |
| Case Name | `caseName` | yes | `validateNoHtmlTags` |
| Additional Information | `additionalInformation` | no | `validateNoHtmlTags` |

`minRows: 1`. Because field names/order differ from `RCJ_EXCEL_CONFIG`, define a dedicated
`COMPETITION_LIST_CHD_EXCEL_CONFIG` (do not alias `RCJ_EXCEL_CONFIG`). Verify the exact
`createConverter` config shape and available validators against
`libs/list-types/common` before writing.

### 2.5 Rendered page — `apps/web/src/pages/(list-types)/competition-list-chd-daily-cause-list/`

- `index.ts` — GET controller. Reuse the shared list-type handler helpers
  (`createSimpleListTypeHandler` + single-list guard/render from `../list-type-handler.js` —
  confirm exact helper names against a sibling `(list-types)` page). Validator via
  `createJsonValidator(schemaPath)`, renderer `renderCompetitionListChd`. Guard on
  `artefact.listTypeName === "COMPETITION_LIST_CHD_DAILY_CAUSE_LIST"`; wrong type → 400 +
  `errors/common`. `listTypeName` is only populated by `getArtefactById` (per CLAUDE.md).
- `index.njk` — extends `layouts/base-template.njk`. Model on the RCJ
  `civil-courts-rcj-daily-cause-list.njk` but with the seven Competition List columns in
  order. Header block, FaCT link, location lines, list date / last-updated, an
  `Important information` `govukDetails`, client-side case-search input, `govukTable` of
  hearings, PDF/Excel download links, data-source line, back-to-top anchor.
- `index.test.ts` — controller unit tests (GET renders; guard rejects wrong list type).
- `competition-list-chd-daily-cause-list.njk.test.ts` — template tests via
  `@hmcts/test-support` (`createTestEnvironment` / `render`): seven headers in order, one
  `<tr>` per hearing, colspan behaviour, Welsh headings, `en`/`cy` key parity.

### 2.6 PDF generation

`pdf/pdf-generator.ts` exports `generateCompetitionListChdDailyCauseListPdf(options)` taking
`listTypeName: string` (never a numeric id) + `pdf/pdf-template.njk`. Register in
`libs/publication/src/processing/service.ts`:
- top-of-file `import { generateCompetitionListChdDailyCauseListPdf, type CompetitionHearingList } from "@hmcts/competition-list-chd-daily-cause-list";`
- a `PdfGenerator` wrapper mirroring line 85's RCJ wrapper
- an entry in `PDF_GENERATOR_REGISTRY` (line 139) keyed `COMPETITION_LIST_CHD_DAILY_CAUSE_LIST`.

Without this registration `generatePublicationPdf` silently produces no PDF.

### 2.7 Excel download

For non-strategic lists the originally uploaded Excel is stored and served (only SJP lists
regenerate via `EXCEL_GENERATOR_REGISTRY`, service.ts line 318). Assume serving the uploaded
file satisfies the AC's "Excel downloadable version" — **confirm** (Open Question).

### 2.8 Reference-data / registration touch-points (existing files to edit)

1. `libs/list-types/common/src/list-type-data.ts` — add a `ListTypeData` entry:
   ```typescript
   {
     name: "COMPETITION_LIST_CHD_DAILY_CAUSE_LIST",
     englishFriendlyName: "Competition List (ChD) Daily Cause List",
     welshFriendlyName: "[WELSH TRANSLATION REQUIRED: \"Competition List (ChD) Daily Cause List\"]",
     provenance: "MANUAL_UPLOAD",   // confirm vs CFT_IDAM — see Open Questions
     urlPath: "competition-list-chd-daily-cause-list",
     isNonStrategic: true,
     defaultSensitivity: "Public",
     subJurisdictionIds: [1]         // Civil Court
   }
   ```
2. `apps/postgres/prisma/scripts/001_insert_missing_list_types.sql` — add the `list_types`
   upsert row (columns: `name, friendly_name, welsh_friendly_name, shortened_friendly_name,
   url, default_sensitivity, allowed_provenance, is_non_strategic, updated_at`), matching the
   `list-type-data.ts` entry.
3. `apps/postgres/prisma/scripts/003_upsert_sub_jurisdictions_and_list_type_links.sql` — add
   `('COMPETITION_LIST_CHD_DAILY_CAUSE_LIST', 1)` (Civil Court sub-jurisdiction).
4. `libs/location/src/location-data.ts` — **the AC names "Business and Property Courts Rolls
   Building" in "Royal Courts of Justice Group" (region 11)**. Currently there is only
   "Royal Courts of Justice" (`locationId: 4`, **region 1 = London**). A new location record
   in region 11 linked to sub-jurisdiction 1 is likely required. See Open Questions.
5. `libs/publication/src/processing/service.ts` — PDF generator import + wrapper + registry
   entry (§2.6).
6. `apps/web/src/pages/(admin)/non-strategic-upload/index.ts` — add
   `import "@hmcts/competition-list-chd-daily-cause-list";` (side-effect converter
   registration). Add the same to any other upload entry point that resolves converters
   (e.g. `manual-upload`). **Easy to miss** — without it `hasConverterForListTypeName`
   returns false and uploads fail.
7. `e2e-tests/utils/seed-list-types.ts` — add the new name to `BASE_LIST_TYPES`.
8. Root `tsconfig.json` `paths` — add
   `"@hmcts/competition-list-chd-daily-cause-list": ["libs/list-types/competition-list-chd-daily-cause-list/src"]`.
   The page template lives in `apps/web`; the PDF template renders internally via
   `configureNunjucks`, so no app-level view/asset registration is needed unless the module
   ships app-discoverable assets.

## 3. Error Handling & Edge Cases

**Excel conversion / upload errors** (surfaced on the existing upload UI):
- Missing required column value — `Row N: Judge is required`
- HTML tags present — `Row N: Type must not contain HTML tags`
- Invalid time format — `Row N: Time must be in a valid format, like 9am, 10:30am or 2:30pm`
- Empty file / no data rows — `The uploaded file does not contain any hearings`

**JSON schema errors** — `createJsonValidator` (AJV, `allErrors: true`) returns
`{ isValid, errors }` with each error as `"<field>: <message>"`; upload rejected, errors
returned to publisher.

**Rendered-page guard** — artefact whose `listTypeName` ≠
`COMPETITION_LIST_CHD_DAILY_CAUSE_LIST` → 400 + `errors/common`. Missing/invalid
`artefactId` → standard not-found handling.

**Edge cases** — empty hearings array renders an empty table (or a "no hearings" message —
match RCJ behaviour); `additionalInformation` blank must not fail validation; long free-text
cells must wrap; Welsh render must keep identical structure.

## 4. Acceptance Criteria Mapping

| Acceptance criterion | How satisfied | Verification |
|---|---|---|
| Created under BPC Rolls Building, linked to Civil jurisdiction + RCJ Group region | `list-type-data.ts` entry (`subJurisdictionIds:[1]`), seed SQL rows, `location-data.ts` location in region 11 | Seed + integration check; manual browse of location list types |
| Fields in listed order in validation schema | `schemas/*.json` `required` + property order; converter config column order | `json-validator.test.ts`, converter config test |
| Published via Excel upload → JSON | Dedicated converter registered by name; side-effect import in upload entry point | Converter test; manual upload |
| Validation schema + style guide created | Schema + validator wrapper + rendered page/template matching staging reference | Validator tests, template tests, visual check vs staging |
| PDF + Excel downloadable | PDF generator registered in `PDF_GENERATOR_REGISTRY`; uploaded Excel served | PDF generation test; manual download |
| Style guide follows staging structure | `index.njk` modelled on RCJ template with the 7 columns | Template tests + visual comparison |
| JSON format matches issue | `models/types.ts` + schema use exact field names | Validator test against the issue's sample payload |

## 5. Testing

- **JSON validator tests** — real schema, no mocks; hydrated valid fixture passes; one `it`
  per required field (`judge, time, venue, type, caseNumber, caseName`) proving individual
  enforcement; a test that `additionalInformation` is optional; a test rejecting an embedded
  HTML tag; a test rejecting a malformed `time`.
- **Converter config tests** — valid workbook → expected JSON array (correct mapping/order);
  missing required value fails with row/field message; invalid time fails; blank Additional
  Information allowed.
- **Renderer tests** — maps hearings to view model, formats header/date fields, handles empty
  list.
- **Controller tests** — GET renders with `en`/`cy`/`t`; guard rejects wrong `listTypeName`
  (400 + `errors/common`).
- **Template tests** (`@hmcts/test-support`) — seven headers in order, one `<tr>` per hearing,
  colspan both ways, Welsh headings, `en`/`cy` key parity.
- **PDF generation test** — produces a buffer for a sample list with the correct title.
- **E2E (Playwright `@nightly`)** — one complete viewing journey: open published artefact,
  assert table/columns, toggle Welsh + assert translated headings, inline Axe scan, exercise
  PDF/Excel download links. Requires the name in `seed-list-types.ts`.
- **CI guard** — `libs/list-types/common` guard test passes (schema has matching `validate*`).

## 6. CLARIFICATIONS NEEDED

1. **Location record.** No "Business and Property Courts Rolls Building" location exists, and
   the existing "Royal Courts of Justice" (`locationId: 4`) is in **region 1 (London)**, not
   **region 11 (Royal Courts of Justice Group)** as the AC requires. Should a **new** location
   record be created in region 11 linked to sub-jurisdiction 1, or should the list attach to
   the existing RCJ location? (Assumption: new location in region 11.)
2. **Sub-jurisdiction.** The 30 seeded sub-jurisdictions include Civil Court (1) but no
   Chancery / Business & Property / Competition sub-jurisdiction. Attach to Civil Court (1),
   or create a new sub-jurisdiction?
3. **Provenance.** `MANUAL_UPLOAD` (non-strategic, like PHT) or `CFT_IDAM` (as the RCJ family
   uses despite `isNonStrategic: true`)? This affects the seed row and `list-type-data.ts`.
4. **Excel download.** Is the AC satisfied by serving the originally uploaded Excel file
   (standard non-strategic behaviour), or must an Excel be regenerated from JSON via an
   `EXCEL_GENERATOR_REGISTRY` entry (as SJP does)?
5. **Static page copy.** The exact "Important information" text, location address lines, and
   any court-specific notices must be lifted from the staging reference page. The copy in the
   spec is a best-effort placeholder based on RCJ conventions and needs verification against
   the reference URL.
6. **Welsh translations & friendly name.** All Welsh strings are placeholder
   `[WELSH TRANSLATION REQUIRED: "..."]`; the reference-data `welshFriendlyName` needs a
   confirmed translation.
7. **Downloadable blank Excel template.** Does a blank Excel template need to be provided to
   publishers, or is that out of scope for this ticket?
8. **Email summary.** Does this list need a subscription email summary builder (RCJ has an
   `email-summary/` sub-tree)? Assumed not required.
