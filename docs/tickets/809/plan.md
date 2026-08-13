# Technical Plan — #809 Revenue List (ChD) daily cause list

## 1. Technical Approach

### Strategy: thin wrapper over the existing shared ChD/KB assets

The Revenue List (ChD) uses the **same seven-field flat hearing row** as
`COMPANIES_WINDING_UP_CHD_DAILY_CAUSE_LIST` (#803). That work was deliberately factored so the
schema, model, converter field config, renderer and email-summary builder live in
`libs/list-types/chd-kb-common/` — its own source comments say "shared with future list types using
the same schema". This ticket is that future list type.

Verified against the codebase, `chd-kb-common` already provides everything the AC needs:

| Concern | Existing asset (verified) |
|---|---|
| JSON schema (7 required fields, no-HTML + time patterns) | `libs/list-types/chd-kb-common/src/schemas/chd-kb-common.json` |
| Validator | `validateChdKbListType` — `chd-kb-common/src/validation/json-validator.ts` |
| Model type | `ChdKbHearing` / `ChdKbHearingList` — `chd-kb-common/src/models/types.ts` |
| Excel column definitions | `CHD_KB_EXCEL_CONFIG` — `chd-kb-common/src/conversion/chd-kb-excel-config.ts` |
| Renderer | `renderChdKbHearingList` — `chd-kb-common/src/rendering/renderer.ts` |
| Email summary | `extractCaseSummary` / `formatCaseSummaryForEmail` — `chd-kb-common/src/email-summary/summary-builder.ts` |
| Page handler | `createSimpleListTypeHandler` — `apps/web/src/pages/(list-types)/list-type-handler.ts` |
| PDF plumbing | `savePdfToStorage`, `configureNunjucks`, `PDF_BASE_STYLES`, `loadTranslations` — `@hmcts/list-types-common` |
| Venue | `locationId: 26` "Business and Property Courts Rolls Building" already in `libs/location/src/location-data.ts` with `regions: [11]`, `subJurisdictions: [10]` |

So the deliverable is: **a new wrapper package + a new page + eight registration edits**. No new schema,
no new model, no new converter logic, no Prisma migration, no new location.

### Architecture decisions

1. **Reuse `chd-kb-common`; do not fork the schema.** The AC field list ("Judge, Time, Venue Type,
   Case Number, Case Name and Additional Information") reads as six fields, but the shared schema and
   the legacy pip-frontend Revenue view both use seven: `Judge, Time, Venue, Type, Case Number,
   Case Name, Additional Information`. This plan assumes "Venue Type" is a transcription of the two
   adjacent columns `Venue` and `Type`. See Open Questions Q1 — if it is genuinely one combined
   column, the reuse collapses and this becomes a full new schema + converter + model + renderer.
2. **No local `src/schemas/` and no local validator.** `index.ts` re-exports `validateChdKbListType`
   aliased as `validateRevenueChdDailyCauseList`, exactly as the sibling does. This satisfies the
   dynamic dispatcher in `libs/list-types/common/src/validation/list-type-validator.ts`, which
   kebab-cases the list type name (`REVENUE_CHD_DAILY_CAUSE_LIST` → `revenue-chd-daily-cause-list`),
   imports `@hmcts/revenue-chd-daily-cause-list` and picks the first export starting with `validate`.
   No `PACKAGE_ALIASES` entry is needed because the kebab-cased name matches the package name.
   The CI guard at `libs/list-types/common/src/validation/guard.test.ts` only fires for packages that
   ship their own `src/schemas/*.json`, so it stays green.
3. **Everything keyed on the stable string name `REVENUE_CHD_DAILY_CAUSE_LIST`.** No numeric
   `listTypeId` anywhere — converter registry, PDF registry, email registry, page guard and Prisma
   queries all use the name, per CLAUDE.md.
4. **Excel *generation* (download) is out of scope.** Verified: `EXCEL_GENERATOR_REGISTRY` in
   `libs/publication/src/processing/service.ts` contains only the Magistrates and SJP list types —
   the sibling ChD list is **not** in it. The AC asks for Excel *upload* (which the converter handles)
   and a PDF *download*. Do not add an Excel generator. (The spec comment on the issue contradicts
   itself here, asking for one in §6.3 and descoping it in §14; the codebase settles it.)
5. **`libs/location/src/location-data.ts` is untouched.** The Rolls Building already exists.
6. **Template source.** See below — migrate from pip-frontend, do not hand-write markup.

### TEMPLATE SOURCE

> **migrate from pip-frontend Revenue List (ChD) daily cause list** (the `.njk` view plus its
> `src/main/resources/locales/{en,cy}/*.json` content for the Revenue ChD list)

Rationale: the page structure is already settled by the in-repo sibling
(`apps/web/src/pages/(list-types)/companies-winding-up-chd-daily-cause-list/`), but the *content* that
the sibling cannot supply — the Revenue-specific `pageTitle` and the "Important information" block in
both English and Welsh — is only authoritative in pip-frontend. Run the `migrate-pip-pages` skill at
implementation time to fetch and adapt the source; take the layout from the sibling `.njk` where the
two differ, since that file is the already-migrated, already-reviewed version of the same shape.

## 2. Implementation Details

### 2.1 New package `libs/list-types/revenue-chd-daily-cause-list/`

Mirror `libs/list-types/companies-winding-up-chd-daily-cause-list/` file for file.

```
libs/list-types/revenue-chd-daily-cause-list/
├── package.json          # @hmcts/revenue-chd-daily-cause-list
│                         # deps: @hmcts/chd-kb-common, @hmcts/list-types-common,
│                         #       @hmcts/pdf-generation, @hmcts/postgres-prisma,
│                         #       exceljs 4.4.0, luxon 3.7.2, nunjucks 3.2.4
│                         # build: "tsc && yarn build:nunjucks"  (copies src/pdf/*.njk → dist/pdf)
├── tsconfig.json         # extends ../../../tsconfig.json (three levels up — nested under list-types/)
└── src/
    ├── config.ts                                        # moduleRoot, assets
    ├── index.ts                                         # re-exports + side-effect converter import
    ├── conversion/
    │   ├── revenue-chd-daily-cause-list-config.ts       # registerConverterByName(...)
    │   └── revenue-chd-daily-cause-list-config.test.ts
    ├── rendering/
    │   ├── renderer.ts                                  # delegates to renderChdKbHearingList
    │   └── renderer.test.ts
    ├── pdf/
    │   ├── pdf-generator.ts
    │   ├── pdf-generator.test.ts
    │   └── pdf-template.njk
    └── locales/
        ├── en.ts                                        # export const en (+ provenanceLabelsEn)
        ├── cy.ts                                        # export const cy (+ provenanceLabelsCy)
        └── locales.test.ts                              # en/cy key parity, recursive
```

`src/index.ts`:

```typescript
import "./conversion/revenue-chd-daily-cause-list-config.js"; // Register converter on module load

// Re-exported under this list type's own name so libs/publication's PDF registry and the web
// controller resolve it. The hearing shape and schema live in @hmcts/chd-kb-common and are shared
// with the other Chancery Division / King's Bench list types.
export type { ChdKbHearing as RevenueChdHearing, ChdKbHearingList as RevenueChdHearingList } from "@hmcts/chd-kb-common";
// Re-exported so the dynamic list-type validator dispatcher (which imports this package by name and
// looks for a validate* export) resolves a validator, and so libs/notifications resolves an email
// summary builder.
export {
  extractCaseSummary,
  formatCaseSummaryForEmail,
  SPECIAL_CATEGORY_DATA_WARNING,
  validateChdKbListType as validateRevenueChdDailyCauseList
} from "@hmcts/chd-kb-common";
export type { ValidationResult } from "@hmcts/publication";
export { cy as revenueChdDailyCauseListCy } from "./locales/cy.js";
export { en as revenueChdDailyCauseListEn } from "./locales/en.js";
export * from "./pdf/pdf-generator.js";
export * from "./rendering/renderer.js";
```

`src/conversion/revenue-chd-daily-cause-list-config.ts`:

```typescript
import { CHD_KB_EXCEL_CONFIG } from "@hmcts/chd-kb-common";
import { createConverter, registerConverterByName } from "@hmcts/list-types-common";

// Field definitions live in @hmcts/chd-kb-common and are shared with the other Chancery Division /
// King's Bench list types. Registration under this list type's own DB name must stay here, since the
// converter registry is keyed on that name.
export const REVENUE_CHD_EXCEL_CONFIG = CHD_KB_EXCEL_CONFIG;

registerConverterByName("REVENUE_CHD_DAILY_CAUSE_LIST", createConverter(REVENUE_CHD_EXCEL_CONFIG));
```

`src/rendering/renderer.ts` — three-line delegation identical to the sibling, exporting
`renderRevenueChdDailyCauseList(hearingList, { locale, contentDate, lastReceivedDate })` and passing
`t.pageTitle` as `listTitle` so the header is locale-correct.

`src/pdf/pdf-generator.ts` + `pdf-template.njk` — copy of the sibling pair, swapping in this
package's renderer and locales. Writes `<artefactId>.pdf` to `CONTAINER.PUBLICATIONS` via
`savePdfToStorage`. `cautionNote` / `cautionReporting` appear in the PDF footer only.

### 2.2 New page `apps/web/src/pages/(list-types)/revenue-chd-daily-cause-list/`

```
├── index.ts                                  # GET via createSimpleListTypeHandler
├── revenue-chd-daily-cause-list.njk
├── index.test.ts
└── revenue-chd-daily-cause-list.njk.test.ts
```

Directory name **must** equal the `urlPath` in `list-type-data.ts` — pages are auto-discovered and
`summary-of-publications/index.njk` builds its link as `/{{ publication.urlPath }}?artefactId=…`.

`index.ts` mirrors the sibling exactly:

```typescript
import { validateChdKbListType } from "@hmcts/chd-kb-common";
import {
  type RevenueChdHearingList,
  renderRevenueChdDailyCauseList,
  revenueChdDailyCauseListCy as cy,
  revenueChdDailyCauseListEn as en
} from "@hmcts/revenue-chd-daily-cause-list";
import { createSimpleListTypeHandler, resolveDataSource } from "../list-type-handler.js";

const SUPPORTED_LIST_TYPE = "REVENUE_CHD_DAILY_CAUSE_LIST";

export const GET = createSimpleListTypeHandler<RevenueChdHearingList>({
  en,
  cy,
  validate: validateChdKbListType,
  logPrefix: "revenue-chd-daily-cause-list",
  guardArtefact: (artefact, res) => {
    if (artefact.listTypeName !== SUPPORTED_LIST_TYPE) {
      res.status(400).render("errors/common", {
        en, cy,
        errorTitle: "Invalid List Type",
        errorMessage: "This list type is not supported by this module"
      });
      return true;
    }
    return false;
  },
  render: ({ artefact, jsonData, locale, res }) => {
    const t = locale === "cy" ? cy : en;
    const { header, hearings } = renderRevenueChdDailyCauseList(jsonData, {
      locale,
      contentDate: artefact.contentDate,
      lastReceivedDate: artefact.lastReceivedDate.toISOString()
    });
    const dataSource = resolveDataSource(artefact.provenance, t as { provenanceLabels?: Record<string, string> });
    res.render("revenue-chd-daily-cause-list", { en, cy, t, title: header.listTitle, header, hearings, dataSource });
  }
});
```

Template regions (from the sibling `.njk`, extends `layouts/base-template.njk`, block `page_content`):

| Region | Markup |
|---|---|
| Heading | `<h1 class="govuk-heading-l" id="top">{{ header.listTitle }}</h1>` |
| FaCT link | `govuk-body` paragraph, guarded by `{% if t.factLinkText %}` |
| Venue block | three `govuk-body` paragraphs (bold venue name, two address lines) |
| Dates | bold "List for …" then "Last updated … at …" |
| Important information | `govukDetails` with `open: true` |
| Search | `<h2 class="govuk-heading-s">` + `#case-search-input` with a `govuk-visually-hidden` `<label for>` |
| Table | `<table class="govuk-table hearings-table" aria-label="{{ t.pageTitle }}">`, seven `<th scope="col">`, one `<tr>` per hearing |
| Empty state | `{% else %}` branch rendering `t.noHearingsMessage` |
| Footer | `{{ t.dataSource }}: {{ dataSource }}` in `govuk-body-s`, then "Back to top" anchor to `#top` |

The search box needs **no bespoke JavaScript** — the global `apps/web/src/assets/js/table-search.ts`
auto-wires any page containing `#case-search-input` and `.hearings-table`. It is progressive
enhancement: without JS the full table still renders.

**No `download.ts` and no downloads block.** Verified: only `sjp-press-list` and `sjp-public-list`
have download routes; the sibling ChD page has none, and `EXCEL_GENERATOR_REGISTRY` excludes it.
See Open Questions Q4 — AC5 is met by PDF *generation*, and adding a user-facing download link would
be a deliberate divergence from the sibling.

### 2.3 Registration touch-points (existing files to edit)

1. **`libs/list-types/common/src/list-type-data.ts`** — one new entry, placed next to the sibling:
   ```typescript
   {
     name: "REVENUE_CHD_DAILY_CAUSE_LIST",
     englishFriendlyName: "Revenue (Chancery Division) Daily Cause List",
     welshFriendlyName: "Rhestr Achosion Dyddiol Refeniw (Adran Siawnsri)",
     shortenedFriendlyName: "Revenue List (ChD) Daily Cause List",
     provenance: "CFT_IDAM",
     urlPath: "revenue-chd-daily-cause-list",
     isNonStrategic: true,
     defaultSensitivity: "Public",
     subJurisdictionIds: [10]
   }
   ```
   This single entry covers every environment — deploy SQL is generated from this file by
   `apps/postgres/prisma/generate-seed-sql.ts`, and local `yarn db:seed` reads the same file.
   **Do not hand-write any `.sql`.** `subJurisdictionIds: [10]` (High Court) is what makes the list
   type appear under the Rolls Building, whose `subJurisdictions` is `[10]`.
2. **`libs/location/src/location-data.ts`** — **no change.** `locationId: 26` already exists.
3. **`libs/publication/src/processing/service.ts`** — add the import and one `PDF_GENERATOR_REGISTRY`
   entry:
   ```typescript
   REVENUE_CHD_DAILY_CAUSE_LIST: (p) =>
     generateRevenueChdDailyCauseListPdf({ ...p, jsonData: p.jsonData as RevenueChdHearingList }),
   ```
   Nothing added to `EXCEL_GENERATOR_REGISTRY`.
4. **`libs/notifications/src/notification/notification-service.ts`** — add to
   `EMAIL_BUILDER_REGISTRY`, using the re-exported shared extractor/formatter, so case-subscription
   digests work:
   ```typescript
   REVENUE_CHD_DAILY_CAUSE_LIST: {
     extract: extractRevenueChdSummary as SummaryExtractor,
     format: formatRevenueChdSummaryForEmail
   },
   ```
5. **`apps/web/src/pages/(admin)/non-strategic-upload/index.ts`** and
   **`.../non-strategic-upload-summary/index.ts`** — add
   `import "@hmcts/revenue-chd-daily-cause-list"; // Register Revenue List (ChD) converter` so the
   converter is registered in those requests' module graphs.
6. **`apps/web/src/app.ts`** — import `moduleRoot` from `@hmcts/revenue-chd-daily-cause-list/config`
   and push it into the `modulePaths` array passed to `configureGovuk`, so Nunjucks resolves the
   PDF template path lookup consistently with the sibling.
7. **`apps/web/package.json`** — add `"@hmcts/revenue-chd-daily-cause-list": "workspace:*"`.
   Also add it to `libs/publication/package.json` and `libs/notifications/package.json`
   dependencies, matching how the sibling is wired into those packages.
8. **Root `tsconfig.json`** — add `paths` for `@hmcts/revenue-chd-daily-cause-list` and
   `@hmcts/revenue-chd-daily-cause-list/config`.

No Prisma schema change and no migration: `list_type`, `location`, `region` and the link tables
already exist.

### 2.4 API endpoints / URLs

| Purpose | Method | Path |
|---|---|---|
| Public list page (new) | GET | `/revenue-chd-daily-cause-list?artefactId=<uuid>` |
| Entry point (existing) | GET | `/summary-of-publications?locationId=26` |
| Admin upload (existing) | GET/POST | `/non-strategic-upload`, `/non-strategic-upload-summary` |

Blob keys: converted JSON artefact under `<artefactId>` in `CONTAINER.ARTEFACT`; generated PDF under
`<artefactId>.pdf` in `CONTAINER.PUBLICATIONS`.

### 2.5 Content

Locale objects live in `libs/list-types/revenue-chd-daily-cause-list/src/locales/{en,cy}.ts`, exported
as `revenueChdDailyCauseListEn` / `revenueChdDailyCauseListCy`. Keys mirror the sibling's exactly.

**Only two values genuinely differ from the sibling** — `pageTitle` and the important-information
block. Everything else (FaCT link text, venue name and address, all seven table headers, search
labels, empty state, data source, back-to-top, date labels, caution notes) already has a reviewed
Welsh translation in `libs/list-types/companies-winding-up-chd-daily-cause-list/src/locales/cy.ts`
and should be copied verbatim rather than marked `[WELSH TRANSLATION REQUIRED]`.

| Key | English | Welsh |
|---|---|---|
| `pageTitle` | Revenue (Chancery Division) Daily Cause List | Rhestr Achosion Dyddiol Refeniw (Adran Siawnsri) |
| `importantInformationHeading` | Important information | Gwybodaeth bwysig |
| `importantInformationHeading1` | *from pip-frontend* | *from pip-frontend* |
| `importantInformationLine1` | *from pip-frontend* | *from pip-frontend* |
| all other keys | copy from sibling `en.ts` | copy from sibling `cy.ts` |

`venueName` "Rolls Building", `addressLine1` "Fetter Lane, London", `addressLine2` "EC4A 1NL" are the
same building as the sibling and are identical in both locales.

Dates and times come from the locale-aware `formatDisplayDate` / `formatLastUpdatedDateTime` helpers
inside `renderChdKbHearingList` — no per-list date strings.

Reference-data friendly names shown on admin screens and the summary of publications go in
`list-type-data.ts` (§2.3 item 1), not in the locale files.

## 3. Error Handling & Edge Cases

### Layer 1 — Excel → JSON conversion (`CHD_KB_EXCEL_CONFIG`, `minRows: 1`)

| Column header (exact, row 1) | JSON field | Rule |
|---|---|---|
| Judge | `judge` | required, non-empty, no HTML tags |
| Time | `time` | required, `validateTimeFormatSimple` — `9am`, `10:30am`, `2.15pm` |
| Venue | `venue` | required, non-empty, no HTML tags |
| Type | `type` | required, non-empty, no HTML tags |
| Case Number | `caseNumber` | required, non-empty, no HTML tags |
| Case Name | `caseName` | required, non-empty, no HTML tags |
| Additional Information | `additionalInformation` | required, non-empty, no HTML tags |

Also enforced by the shared converter: at least one worksheet, every column present in the header
row, at least one data row.

### Layer 2 — JSON schema (`chd-kb-common.json`, draft-07)

Root `type: "array"`; each item requires all seven fields. Every string property carries the no-HTML
pattern `^(?!(.|\r|\n)*<[^>]+>)(.|\r|\n)*$`; `time` additionally carries
`^\d{1,2}([:.]\d{2})?\s*[ap]m\s*$`. `createSimpleListTypeHandler` re-validates on **every page
render**, so a corrupted or hand-edited artefact renders the error page rather than partial data.

### Field order

The AC order is authoritative and is enforced in three places that must stay in step: the `required`
array and `properties` order in the shared schema, the `fields` array in `CHD_KB_EXCEL_CONFIG`, and
the `<th>` order in the page and PDF templates. All three already match; changing any one of them
affects the sibling list type too.

### Upload/conversion error messages (shared converter wording — surfaced in a `govukErrorSummary`)

| Condition | Message |
|---|---|
| Missing column(s) in header row | `Excel file must contain columns: Judge, Time, Venue, Type, Case Number, Case Name, Additional Information. Missing: Case Number` |
| Empty required cell | `Missing required field 'Case Number' in row 4` |
| HTML tags in a cell | `Invalid content in 'Case Name' in row 4: HTML tags are not allowed` |
| Bad time value | `Invalid time format 'quarter past nine' in row 4. Expected format: h:mma (e.g., 9:30am) or ha (e.g., 2pm)` |
| No data rows | `Excel file must contain at least 1 data row` |
| Empty workbook | `Excel file must contain at least one worksheet` |

### Page errors (rendered via `errors/common` by `createSimpleListTypeHandler`)

| Condition | Status | Title / message |
|---|---|---|
| `artefactId` query param missing | 400 | Bad Request / Missing artefactId parameter |
| Artefact not found | 404 | Not Found / The requested list could not be found |
| Caller cannot access the publication | 403 | `errors/403` via `canAccessPublicationData` |
| `listTypeName` ≠ `REVENUE_CHD_DAILY_CAUSE_LIST` | 400 | Invalid List Type / This list type is not supported by this module |
| Blob missing | 404 | Not Found / The requested list could not be found |
| Stored JSON fails schema validation | 400 | Invalid Data / The list data is invalid |
| Unexpected error | 500 | Error / An error occurred while displaying the list |

### Edge cases

- **Empty hearings array** — schema permits `[]`; the template renders `t.noHearingsMessage` and no
  table. Converter `minRows: 1` prevents this arising from an upload, but a directly-ingested
  artefact could produce it.
- **Blank `additionalInformation`** — the shared schema marks it required, so a blank cell **fails
  the upload**. See Q5.
- **PDF generation failure** — `pdf-generator.ts` returns `{ success: false, error }` rather than
  throwing, so publication still succeeds without a PDF. The page has no download link, so there is
  nothing to render conditionally.
- **Wide table at 320px / 400% zoom** — seven columns; horizontal scrolling must stay contained to
  the table region, matching the sibling.
- **Sensitivity above Public** — handled by the existing publication authorisation middleware and
  `filterPublicationsForSummary`; nothing list-type-specific.

## 4. Acceptance Criteria Mapping

| AC | How it is satisfied | Verification |
|---|---|---|
| List created under Business and Property Courts Rolls Building | `list-type-data.ts` entry with `subJurisdictionIds: [10]`, matching `locationId: 26`'s `subJurisdictions: [10]`. No location change. | Unit test asserting exactly one `listTypeData` entry named `REVENUE_CHD_DAILY_CAUSE_LIST`, non-strategic, `urlPath` equal to the page directory name; E2E asserts the option appears for that court on `/non-strategic-upload` |
| Fields in the listed order (Judge, Time, Venue, Type, Case Number, Case Name, Additional Information) | Order already fixed in `chd-kb-common.json` `required`/`properties`, `CHD_KB_EXCEL_CONFIG.fields`, and the `<th>` order copied from the sibling template | Converter test asserts output key order; template test asserts exactly seven `<th>` in that order |
| Published through the Excel upload route as an Excel template | `registerConverterByName("REVENUE_CHD_DAILY_CAUSE_LIST", createConverter(REVENUE_CHD_EXCEL_CONFIG))` plus the two `import` side effects on the upload pages | Converter registration test; E2E upload journey. **See Q6** on whether a downloadable blank template is expected |
| Validation schema and style guide created | Schema and validator reused from `chd-kb-common`, re-exported as `validateRevenueChdDailyCauseList` so the dynamic dispatcher and the CI guard both resolve; page template + locales are the style guide | Validator tests (real schema, one `it` per required field); template tests; guard test stays green |
| PDF downloadable version created | `pdf-generator.ts` + `pdf-template.njk`, registered in `PDF_GENERATOR_REGISTRY`, saved as `<artefactId>.pdf` in `CONTAINER.PUBLICATIONS` | PDF generator unit test (success + failure without throwing); registry resolution test. **See Q4** on the user-facing download link |

## 5. Test Scenarios

**Unit — `libs/list-types/revenue-chd-daily-cause-list`**
- Converter registers under the exact name `REVENUE_CHD_DAILY_CAUSE_LIST` and produces objects whose
  keys are in schema order from a header row plus data rows
- Converter rejects: sheet missing a required column; empty required cell; HTML-bearing cell;
  unparseable time; sheet with no data rows
- Renderer returns the localised list title as `header.listTitle` for `en` and `cy`, formats
  `listDate` / `lastUpdated*` per locale, and passes hearings through unchanged including `[]`
- PDF generator renders the template, uploads to `<artefactId>.pdf`, and returns a failure result
  (without throwing) when HTML-to-PDF generation fails
- Locale key parity: `Object.keys(en).sort()` equals `Object.keys(cy).sort()`, recursively for
  `tableHeaders`
- Re-exported `validateRevenueChdDailyCauseList` accepts a fully populated fixture and rejects a
  fixture with each of the seven required fields removed in turn — real schema, no mocks, deep clone
  via `JSON.parse(JSON.stringify(...))`

**Unit — page controller**
- Renders the template with `header`, `hearings`, `title` and `dataSource` for a matching artefact
- Selects Welsh content when `res.locals.locale` is `cy`
- Returns 400 + `errors/common` when `listTypeName` is a different list type — fixture uses
  `listTypeId: 999` to prove routing is name-driven
- Returns 400 when `artefactId` is absent, 404 when artefact or blob is missing, 400 when the stored
  JSON fails validation, 500 on unexpected error

**Template — `revenue-chd-daily-cause-list.njk.test.ts`** (Cheerio via `@hmcts/test-support`
`createTestEnvironment` / `render`, no AAA comments, layered fixture builders)
- Renders the list title, venue name, both address lines, and the "List for" / "Last updated" lines
- Renders exactly seven `<th scope="col">` in the specified order, and one row per hearing with cells
  in that order
- Renders the empty-state message and no table when `hearings` is `[]`
- Renders Welsh title, headings and table headers when passed the `cy` locale object
- Renders the search input with an associated visually hidden label, and the important-information
  details section

**Unit — registries**
- `PDF_GENERATOR_REGISTRY` resolves a generator for `REVENUE_CHD_DAILY_CAUSE_LIST`
- `EMAIL_BUILDER_REGISTRY` resolves an extractor and formatter for the list type
- `listTypeData` contains exactly one entry named `REVENUE_CHD_DAILY_CAUSE_LIST`, marked
  non-strategic, with `urlPath` matching the page directory

**E2E — one journey test (`@nightly`)** covering publish → view → validate → Welsh → accessibility.
Note the sibling ChD list has **no** E2E test, so this is new ground; keep it to a single spec:
sign in as a CTSC admin, attempt an upload with a deliberately invalid file and assert the specific
converter error, then upload a valid file against the Business and Property Courts Rolls Building and
confirm; as a public user navigate from that venue's summary of publications to the list page; assert
the seven columns and the uploaded rows; filter with the search box; switch to Welsh and assert the
translated title and headers; run an axe-core scan on both locales expecting zero violations.

## 6. Accessibility

WCAG 2.2 AA. Specific to this page:
- `<title>` from `header.listTitle`, matching the `<h1>`. Heading order `h1` → `h2` ("Search Cases");
  no skipped levels. The `govukDetails` summary is a native `<summary>`, not a heading.
- One `<table class="govuk-table">` with `<thead>`, `<th scope="col">` on all seven headers, and
  `aria-label="{{ t.pageTitle }}"`. No layout tables, no merged cells, no empty header cells. Cells
  with no data render empty, not as "-".
- `<label for="case-search-input">` present and `govuk-visually-hidden`. Filtering is progressive
  enhancement; the unfiltered table is fully usable without JavaScript.
- GOV.UK Frontend classes only; no inline styles, no custom colours, nothing conveyed by colour alone.
- Only interactive elements are links, the details disclosure and the search input — all natively
  focusable in reading order with default focus styles. No custom `tabindex`, no keyboard traps.
- Seven-column table must remain usable at 320px width and 400% zoom, with horizontal scrolling
  contained to the table region.
- `<html lang>` is set by the existing i18n middleware; every visible string comes from the locale
  object so the announced language matches the rendered text.
- axe-core scan in English and Welsh inline in the E2E journey, expecting zero violations.

## 7. CLARIFICATIONS NEEDED

**Q1 — "Venue Type" in the AC: one column or two? (blocking the reuse decision)**
The AC lists six fields, but the shared ChD/KB schema and the legacy pip-frontend Revenue view both
use seven: `Judge, Time, Venue, Type, Case Number, Case Name, Additional Information`. This plan
assumes "Venue Type" is a transcription of the two adjacent columns `Venue` and `Type` — that
assumption is what lets the schema, validator, converter config, model and renderer be reused
unchanged. **If it is genuinely one combined column**, `chd-kb-common` cannot be reused: this package
needs its own schema, converter config, model type and renderer, adding roughly a day of work and a
second near-identical schema to maintain. Please confirm before implementation starts.

**Q2 — List type name and URL slug.** This plan uses `REVENUE_CHD_DAILY_CAUSE_LIST` /
`revenue-chd-daily-cause-list`, following the `COMPANIES_WINDING_UP_CHD_DAILY_CAUSE_LIST` precedent.
If the legacy service uses a different name (e.g. `REVENUE_LIST_CHD_DAILY_CAUSE_LIST`), align before
merge — both values are baked into seeded reference data and awkward to change afterwards, and the
name also determines the package name via the kebab-case dispatcher.

**Q3 — Page title wording.** This plan uses "Revenue (Chancery Division) Daily Cause List" for
`pageTitle` / `englishFriendlyName` (matching the sibling's expanded form and the Welsh translation
catalogue) and the ticket's "Revenue List (ChD) Daily Cause List" for `shortenedFriendlyName` (the
admin dropdown label). Confirm with content design.

**Q4 — Is a user-facing PDF download link expected on the page?** AC5 says "A PDF downloadable
version of the hearing list is created." Verified in the codebase: the PDF **is** generated and
stored in blob storage, but the sibling ChD page has no download link, no `download.ts`, and no
`saveListTitle`/`downloadPdfLink` locale keys — only `sjp-press-list` and `sjp-public-list` have
download routes. The generic `/pdf/:artefactId/download` route reads the local
`storage/temp/uploads` directory (flat-file manual uploads), not the blob-stored generated PDF, so
**the generated PDF is currently not reachable by any user for this family of list types**. Options:
(a) mirror the sibling — generate only, AC5 met by generation, no UI change; (b) add a `download.ts`
delegating to the existing `handleBlobDownload` plus a "Save this list" block on the page, ~half a
day, and consider retrofitting the sibling for consistency. Please pick one.

**Q5 — Is `additionalInformation` genuinely always populated?** The shared schema and converter mark
it required, so a blank cell fails the upload. If Revenue lists routinely leave it blank this is a
data-entry burden, and relaxing it means either changing the shared schema (which also affects
Companies Winding Up) or forking the schema. Confirm the expected data before assuming the shared
behaviour is acceptable.

**Q6 — "It is uploaded as an excel template" — is a downloadable blank template wanted?** This plan
reads it as "the admin fills in a spreadsheet whose header row matches the seven columns". No
service feature exists today for hosting a downloadable blank template for admins; if that is the
intent it needs its own ticket.

**Q7 — Authoritative "Important information" copy.** The two Revenue-specific content values
(`importantInformationHeading1`, `importantInformationLine1`) must come from pip-frontend's Revenue
ChD locale files, in both English and Welsh. If the Revenue list has **multiple**
important-information sections (several ChD lists do), the locale objects and both templates need to
iterate an array rather than render single heading/line keys — a small change, but worth settling
before the templates are written. Everything else can be copied verbatim from the sibling's `cy.ts`,
so no new Welsh translation should be needed beyond `pageTitle` and this block.

**Q8 — No design artefacts supplied.** The layout in §2.2 is derived from the sibling Companies
Winding Up page. If a designed layout exists for the Revenue list, it takes precedence.
