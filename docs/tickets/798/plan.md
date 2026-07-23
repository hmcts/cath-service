# Technical Plan: Interim Applications List (ChD) Daily Cause List (#798)

## 1. Technical Approach

This is a **non-strategic** list type published via the CaTH Excel-upload route: an
`.xlsx` workbook is converted to JSON, validated against a JSON schema, stored as an
artefact, and rendered by a dedicated page controller/template with PDF + Excel
downloads. It is greenfield — no `interim-applications-*` code exists yet.

The feature mirrors the two established two-tab RCJ non-strategic list types:
- `libs/list-types/london-administrative-court-daily-cause-list/` (simplest two-tab template)
- `libs/list-types/court-of-appeal-civil-daily-cause-list/` (two-tab converter where the tabs differ)

Reuse the existing infrastructure (`createMultiSheetConverter`, `createJsonValidator`,
`createSimpleListTypeHandler`, `PDF_GENERATOR_REGISTRY`, `registerConverterByName`,
`seedListTypes`). Do **not** introduce new abstractions.

### Canonical JSON format — CONFIRMED from the reference file

Fetched from the pip-data-management reference
(`interimApplicationsChanceryDivisionDailyCauseList.json`). The root is an **object**
with **two arrays**:

```jsonc
{
  "hearingList": [
    {
      "judge": "Judge A",
      "time": "10.30am",
      "venue": "This is a venue name",
      "type": "Case type A",
      "caseNumber": "1234",
      "caseName": "This is a case name",
      "additionalInformation": "This is additional information"
    }
  ],
  "openJusticeStatementDetails": [
    {
      "nameToBeDisplayed": "Judge OpenJusticeTest",
      "email": "Judge.OpenJusticeTest@justice.gov.uk"
    }
  ]
}
```

> **IMPORTANT — this corrects the auto-generated `@spec` comment on the issue.** That
> comment assumed keys `hearings` / `judgeDetails` / `judgeName` / `judgeEmail`. The
> real upstream format is `hearingList` / `openJusticeStatementDetails` with hearing
> keys `type` (not `hearingType`) and `caseName`, and open-justice keys
> `nameToBeDisplayed` / `email`. **Use the confirmed keys above** so CaTH output matches
> pip-data-management. `openJusticeStatementDetails` is an **array** (with a single
> entry in the reference); the schema should allow one entry and the renderer reads
> `[0]`.

### Architecture decisions

- **Custom `ExcelConverterConfig`** for Tab 1 — cannot reuse `RCJ_EXCEL_CONFIG_SIMPLE_TIME`
  verbatim because that config emits `caseDetails`/`hearingType` and a different column
  order. Tab 1 here must map to `judge, time, venue, type, caseNumber, caseName,
  additionalInformation` in the issue's stated column order.
- **Second custom config** for Tab 2 (`openJusticeStatementDetails`) with two fields
  mapping to `nameToBeDisplayed` and `email`.
- **Editable open-justice paragraph**: Tab 2 drives the first paragraph of the
  "Important information" section; it is publisher-supplied per upload and is **not**
  translated. Static open-justice paragraphs that follow live in the locale files.
- **List-type name constant**: `INTERIM_APPLICATIONS_CHD_DAILY_CAUSE_LIST`. Use this
  single string as the `listTypeData.name`, the `registerConverterByName` key, the
  `PDF_GENERATOR_REGISTRY` key, and the controller guard. (Court of Appeal has a
  name/converter-key mismatch — do **not** replicate that; keep all four identical.)

## 2. Implementation Details

### 2.1 New lib: `libs/list-types/interim-applications-chd-daily-cause-list/`

Mirror the London Administrative Court lib layout:

```
libs/list-types/interim-applications-chd-daily-cause-list/
├── package.json          # name @hmcts/interim-applications-chd-daily-cause-list
├── tsconfig.json         # extends ../../../tsconfig.json
├── README.md
└── src/
    ├── config.ts                 # moduleRoot, assets, schemaPath
    ├── config.test.ts
    ├── index.ts                  # side-effect import of conversion config; re-exports locales, models, renderer, pdf-generator, validator
    ├── schemas/
    │   └── interim-applications-chd-daily-cause-list.json   # draft-07
    ├── conversion/
    │   ├── interim-applications-chd-daily-cause-list-config.ts    # two custom configs + createMultiSheetConverter + registerConverterByName
    │   └── interim-applications-chd-daily-cause-list-config.test.ts
    ├── validation/
    │   ├── json-validator.ts     # validateInterimApplicationsChdDailyCauseList
    │   └── json-validator.test.ts
    ├── rendering/
    │   ├── renderer.ts           # renderInterimApplicationsChd
    │   └── renderer.test.ts
    ├── models/
    │   └── types.ts              # InterimApplicationsChdData, InterimHearing, OpenJusticeStatement
    ├── locales/
    │   ├── en.ts
    │   └── cy.ts
    └── pdf/
        ├── pdf-template.njk
        ├── pdf-generator.ts      # generateInterimApplicationsChdPdf
        └── pdf-generator.test.ts
```

`package.json` copies the london-admin one: `"type":"module"`, `exports` for `"."` and
`"./config"`, deps `@hmcts/list-types-common`, `@hmcts/pdf-generation`,
`@hmcts/postgres-prisma`, `exceljs 4.4.0`, `luxon`, `nunjucks`; `build` script runs
`tsc && build:nunjucks && build:schemas` (copies `.njk` and schema into `dist/`).

### 2.2 Models (`src/models/types.ts`)

```ts
export interface InterimHearing {
  judge: string; time: string; venue: string; type: string;
  caseNumber: string; caseName: string; additionalInformation?: string;
}
export interface OpenJusticeStatement { nameToBeDisplayed: string; email: string; }
export interface InterimApplicationsChdData {
  hearingList: InterimHearing[];
  openJusticeStatementDetails: OpenJusticeStatement[];
}
```

### 2.3 Conversion (`src/conversion/…-config.ts`)

Two custom `ExcelConverterConfig`s, wired via `createMultiSheetConverter`:

- **Tab 1 → `hearingList`** (`worksheetIndex: 0`), fields in issue column order:
  `Judge→judge`, `Time→time` (`validateTimeFormatSimple`), `Venue→venue`, `Type→type`,
  `Case Number→caseNumber`, `Case Name→caseName`, `Additional Information→additionalInformation`
  (`required:false`). All text fields use `validateNoHtmlTags`. `minRows: 1`.
- **Tab 2 → `openJusticeStatementDetails`** (`worksheetIndex: 1`), fields:
  `Name→nameToBeDisplayed`, `Email→email`. Both `validateNoHtmlTags`; `minRows: 0`
  (defensive — see open question on whether Tab 2 is mandatory).

`worksheetName` values must match the actual sheet names in the attached `.xlsx`
(index fallback covers mismatch). Register:
`registerConverterByName("INTERIM_APPLICATIONS_CHD_DAILY_CAUSE_LIST", { config, convertExcelToJson })`.

### 2.4 JSON schema (`src/schemas/…json`, draft-07)

Root `type: object`, `required: ["hearingList", "openJusticeStatementDetails"]`.
- `hearingList`: `type: array`, `minItems: 1`, items `required:
  ["judge","time","venue","type","caseNumber","caseName"]` (additionalInformation
  optional); string fields use the no-HTML pattern
  `^(?!(.|\r|\n)*<[^>]+>)(.|\r|\n)*$` (copy exact pattern from an existing schema).
- `openJusticeStatementDetails`: `type: array`, items `required:
  ["nameToBeDisplayed","email"]`.

### 2.5 Validator (`src/validation/json-validator.ts`) — MANDATORY

```ts
import { createJsonValidator, type ValidationResult } from "@hmcts/list-types-common";
import { schemaPath } from "../config.js";
export function validateInterimApplicationsChdDailyCauseList(jsonData: unknown): ValidationResult {
  return createJsonValidator(schemaPath)(jsonData);
}
```
Export from `index.ts` (the CI guard `libs/list-types/common/src/validation/guard.test.ts`
fails otherwise). Test file with one `it` per required field at every nesting level,
using `JSON.parse(JSON.stringify(VALID_DATA))` deep clones.

### 2.6 Renderer (`src/rendering/renderer.ts`)

`renderInterimApplicationsChd(data, { locale, contentDate, lastReceivedDate })` returns:
- `header`: `listTitle`, `listDate`, `lastUpdatedDate`, `lastUpdatedTime`
- `hearings`: normalised `hearingList` rows
- `importantInfoParagraph`: built from `openJusticeStatementDetails[0].nameToBeDisplayed`
  + `.email` (guard against an empty array), followed by the static locale paragraphs.

### 2.7 PDF generator (`src/pdf/pdf-generator.ts`)

`generateInterimApplicationsChdPdf(options)` following the london-admin generator.
Interface accepts `listTypeName: string` (never a numeric id). Include the
important-information paragraph and the hearings table in `pdf-template.njk`.

### 2.8 Page controller

`apps/web/src/pages/(list-types)/interim-applications-chd-daily-cause-list/`:
`index.ts`, `index.njk`, `index.test.ts`, `index.njk.test.ts`.

```ts
export const ROUTES = ["/interim-applications-chd-daily-cause-list"];
const SUPPORTED_LIST_TYPE = "INTERIM_APPLICATIONS_CHD_DAILY_CAUSE_LIST";
const validate = createJsonValidator(schemaPath);
export const GET = createSimpleListTypeHandler<InterimApplicationsChdData>({
  en, cy, validate, logPrefix: "interim-applications-chd-daily-cause-list",
  guardArtefact: (artefact, res) => { /* 400 errors/common if listTypeName !== SUPPORTED_LIST_TYPE */ },
  render: ({ artefact, jsonData, locale, res }) => {
    const { header, hearings, importantInfoParagraph } = renderInterimApplicationsChd(jsonData, {...});
    res.render("interim-applications-chd-daily-cause-list", { en, cy, t, header, hearings, importantInfoParagraph, dataSource });
  }
});
```

Template follows the staging style-guide layout (wireframe in the issue spec): h1,
FaCT link, location lines, list date / last updated, "Important information" GOV.UK
Details (open), case search input, hearings table (Judge, Time, Venue, Type, Case
Number, Case Name, Additional Information), data-source label, download links, back-to-top.

### 2.9 Registrations (edit existing files)

1. **`libs/list-types/common/src/list-type-data.ts`** — add entry:
   ```ts
   { name: "INTERIM_APPLICATIONS_CHD_DAILY_CAUSE_LIST",
     englishFriendlyName: "Interim Applications List (ChD) Daily Cause List",
     welshFriendlyName: "[WELSH TRANSLATION REQUIRED]",
     provenance: "CFT_IDAM",
     urlPath: "interim-applications-chd-daily-cause-list",
     isNonStrategic: true, defaultSensitivity: "Public",
     subJurisdictionIds: [1] /* Civil Court */ }
   ```
   Seeding is automatic via `seedListTypes()`.
2. **`libs/publication/src/processing/service.ts`** — import
   `generateInterimApplicationsChdPdf` + `InterimApplicationsChdData` at top; add to
   `PDF_GENERATOR_REGISTRY`:
   ```ts
   INTERIM_APPLICATIONS_CHD_DAILY_CAUSE_LIST: (p) =>
     generateInterimApplicationsChdPdf({ ...p, jsonData: p.jsonData as InterimApplicationsChdData }),
   ```
3. **Root `tsconfig.json`** `compilerOptions.paths` — add
   `"@hmcts/interim-applications-chd-daily-cause-list": ["libs/list-types/interim-applications-chd-daily-cause-list/src"]`.
4. **`apps/web/src/app.ts`** — import `moduleRoot as interimApplicationsChdModuleRoot`
   from the lib's `/config` and add to the `modulePaths` array (Nunjucks template
   discovery).
5. **`apps/web/package.json`** — add the new package as a dependency (as with other
   list-type packages).
6. **No `vite.config.ts` change** — `apps/web/vite.build.ts` does not reference
   individual list-type packages. Only add the lib `assets` if the lib ships assets
   (it likely does not).
7. **Location reference data — `libs/location/src/location-data.ts`** — see §3.

### 2.10 Location / region reference data

The issue requires the list under **Business and Property Courts (Rolls Building)**,
linked to **Civil** jurisdiction and **Royal Courts of Justice Group** region.

Confirmed current state:
- Region `{ regionId: 11, name: "Royal Courts of Justice Group" }` **exists** but has
  **no** locations attached.
- There is **no** "Business and Property Courts" / "Rolls Building" location. The
  existing "Royal Courts of Justice" location (id 4) is on `regions:[1]`, not 11.

This needs a decision (see Open Questions). Likely work: add a new `Location` for
Business and Property Courts (Rolls Building) with `regions:[11]` and the Civil
sub-jurisdiction, or attach the list to an existing location. This is reference-data
seeding, not schema change.

## 3. Error Handling & Edge Cases

- **Excel conversion errors** (surfaced by existing upload flow, row-referenced):
  missing required Tab 1 field → "Row {n}: {Field} is required"; bad time →
  "Row {n}: Time must be in a valid format, like 10:00am or 2:30pm"; HTML tags →
  "Row {n}: {Field} must not contain HTML tags".
- **Empty `openJusticeStatementDetails`**: renderer must not throw — guard `[0]`
  access and fall back to static text only.
- **Wrong list type on the render route**: `guardArtefact` returns 400 `errors/common`.
- **Time format**: the reference JSON uses `"10.30am"` (dot, not colon). Confirm
  `validateTimeFormatSimple` accepts the sample workbook's format; if not, use a
  matching validator/pattern. (Open question.)
- **No hearings**: schema `minItems: 1` rejects an empty list at validation; the
  template still needs a `noHearingsMessage` for defensive rendering.

## 4. Acceptance Criteria Mapping

| Acceptance criterion | How satisfied | Verification |
|---|---|---|
| Created under Business & Property Courts (Rolls Building), Civil jurisdiction, RCJ Group region | `list-type-data.ts` entry + `location-data.ts` reference data (§2.10) | Seeding test / manual check; location page shows the list |
| Published via Excel upload → JSON | Two-tab `createMultiSheetConverter` + `registerConverterByName` (§2.3) | Converter unit tests |
| Excel has 2 tabs; Tab 1 = Judge, Time, Venue, Type, Case Number, Case Name, Additional Information; Tab 2 = judge name/email editable per upload | Two custom configs; open-justice paragraph rebuilt per render from Tab 2 (§2.6) | Converter + renderer unit tests (editability) |
| Validation schema + style guide created | draft-07 schema + validator (§2.4/2.5); locale content + template (§2.8) | Validator tests, njk template tests |
| PDF + Excel downloadable | PDF generator + registry (§2.7/2.9); Excel served by existing artefact download | PDF generator test; E2E download check |
| Style guide format matches staging | Template mirrors wireframe/staging layout (§2.8) | njk template test, E2E |
| JSON follows pip-data-management format | Confirmed keys `hearingList`/`openJusticeStatementDetails` (§1) | Converter output test vs reference JSON |
| Welsh support | `cy.ts` mirrors `en.ts`; template uses `t` | Template test with `cy`; key-parity test |

## 5. Testing

Per CLAUDE.md and `.claude/rules/testing.md`:
- Converter unit tests (valid two-tab workbook → expected JSON; missing field / bad
  time / HTML each error; empty Tab 2 handled).
- Validator tests: fully-hydrated `VALID_DATA`; one `it` per required field at every
  nesting level (hearingList item fields + openJusticeStatementDetails item fields),
  `JSON.parse(JSON.stringify())` clones, real schema (no mocks).
- Renderer test: `importantInfoParagraph` rebuilt from Tab 2 values each render (proves
  per-upload editability); empty open-justice array falls back gracefully.
- Controller test: renders with `en, cy, t, header, hearings, importantInfoParagraph,
  dataSource`; wrong `listTypeName` → 400 `errors/common`.
- Template (`*.njk.test.ts`) with `@hmcts/test-support`: table headers/rows, search
  field, important-info block, Welsh headings via `cy`, en/cy key parity.
- PDF generator test.
- Registry test: name present in `PDF_GENERATOR_REGISTRY` and `list-type-data.ts`; CI
  guard passes.
- One E2E journey (`@nightly`): navigate from the location, verify hearings + important
  info, case search, Welsh furniture, inline Axe, PDF + Excel downloads available.

## 6. CLARIFICATIONS NEEDED

1. **JSON key names — confirmed, flagging the correction.** The real reference JSON
   uses `hearingList` / `openJusticeStatementDetails` (arrays) with hearing key `type`
   (not `hearingType`) and open-justice keys `nameToBeDisplayed` / `email`. The
   auto-generated `@spec` comment on the issue said `hearings`/`judgeDetails`/
   `judgeName`/`judgeEmail` — the plan uses the confirmed upstream keys. Please confirm
   this is acceptable.
2. **Location / region reference data.** "Business and Property Courts (Rolls Building)"
   does not exist in `location-data.ts`, and region 11 ("Royal Courts of Justice Group")
   currently has no locations. Should we (a) create a new location for Business and
   Property Courts (Rolls Building) under region 11 + Civil sub-jurisdiction, or
   (b) attach to the existing "Royal Courts of Justice" location (id 4)? A location id
   and the exact display/Welsh name are needed.
3. **Sample workbook sheet names & column headers.** Exact Tab 1 / Tab 2 sheet names
   and header row text from the attached `interimApplicationsChanceryDivisionDailyCauseList.xlsx`
   are needed for the `worksheetName` values and header mapping. (Index fallback exists,
   but exact names are preferred.) Can the workbook be made available in-repo or its
   sheet/column layout confirmed?
4. **Time format.** The reference JSON shows `"10.30am"` (dot). Does
   `validateTimeFormatSimple` accept that, or is a different/looser validator required?
5. **Is Tab 2 (open justice) mandatory per upload?** The reference JSON always includes
   one entry. Should the schema require `minItems: 1` for `openJusticeStatementDetails`,
   or allow zero (renderer falls back to static text only)?
6. **Static "Important information" wording.** The exact static paragraphs that follow
   the editable judge paragraph, and the editable-paragraph template wording, must be
   lifted verbatim from the staging style guide. Can that text be provided?
7. **Welsh translations.** `welshFriendlyName` for `list-type-data.ts` and all `cy.ts`
   strings need real translations (marked `[WELSH TRANSLATION REQUIRED]` until provided).
