# Technical Plan — #814 Technology and Construction Court (KB) Daily Cause List

## 1. Technical Approach

### Strategy

This is the **second consumer of the shared CHD/KB Rolls Building schema**. `libs/list-types/chd-kb-common/`
was deliberately extracted by #803 (Companies Winding Up (ChD) Daily Cause List) with in-code comments
stating the schema, converter config, renderer and email-summary builder are "shared with future list
types using the same schema". #814 is that future list type.

The work is therefore a **thin wrapper package plus registration**, not a new list-type implementation:

- **No new JSON schema.** `libs/list-types/chd-kb-common/src/schemas/chd-kb-common.json` already
  defines all seven fields with the correct patterns. Verified — see §2.4.
- **No new validator.** `validateChdKbListType` is re-exported under a list-specific alias so the
  dynamic dispatcher in `libs/list-types/common/src/validation/list-type-validator.ts` resolves it.
- **No new Excel converter logic.** `CHD_KB_EXCEL_CONFIG` is registered under this list type's name.
- **No location work.** Location 26 "Business and Property Courts Rolls Building" already exists with
  `regions: [11]`, `subJurisdictions: [10]`. Verified at `libs/location/src/location-data.ts:188`.
- **No database schema change and no hand-written SQL.** One entry in
  `libs/list-types/common/src/list-type-data.ts`; the deploy seed SQL is generated from it.

The reference implementation to copy file-for-file is
`libs/list-types/companies-winding-up-chd-daily-cause-list/` plus
`apps/web/src/pages/(list-types)/companies-winding-up-chd-daily-cause-list/`.

### The one real divergence from the sibling

The TCC (KB) "Important information" panel has **two** heading/body pairs, not one:

| Key | Content |
|---|---|
| `remoteHearingsHighCourtJudgeHeading` | "Remote hearings before a High Court Judge" |
| `importantInformationLine1` | MS Teams / media access / `tcc.listing@justice.gov.uk` |
| `remoteJudgementsHeading` | "Remote judgments" |
| `importantInformationLine2` | Remote hand-down / National Archives / `press.enquiries@judiciary.uk` |

The sibling has only `importantInformationHeading1` + `importantInformationLine1`. So the web `.njk`
and the PDF `.njk` **cannot be verbatim copies** — the `govukDetails` html block and the PDF's
important-information `<div>` each gain a second heading/paragraph pair. Everything else in both
templates is structurally identical to the sibling.

### Architecture decisions

| Decision | Rationale |
|---|---|
| Wrap `@hmcts/chd-kb-common` rather than duplicate the schema/converter/renderer | The package exists precisely for this; duplicating would create two schemas to keep in sync |
| Ship **no** `src/schemas/` and **no** `src/validation/` directory | Schema lives in the shared package. Because no `src/schemas/*.json` is shipped, the CI guard at `libs/list-types/common/src/validation/guard.test.ts` does not apply — same as the sibling |
| Package directory name must be the kebab-case of the list type name | The dynamic validator dispatcher imports `@hmcts/<kebab-cased-list-type-name>`; a mismatch would force a `PACKAGE_ALIASES` entry |
| Route everything on `listTypeName`, never `listTypeId` | Per CLAUDE.md — `ListType.id` is autoincrement and differs per environment |
| Genericise the shared schema's `title` | With two consumers, `"title": "Companies Winding Up (Chancery Division) Daily Cause List"` in `chd-kb-common.json` is misleading. `title` is not validated against, so zero behavioural risk |

### Naming (fixed, must match exactly)

| Thing | Value |
|---|---|
| `ListType.name` | `TECHNOLOGY_AND_CONSTRUCTION_COURT_KB_DAILY_CAUSE_LIST` |
| `urlPath` / page dir | `technology-and-construction-court-kb-daily-cause-list` |
| Package | `@hmcts/technology-and-construction-court-kb-daily-cause-list` |

---

## 2. Implementation Details

### TEMPLATE SOURCE

**migrate from pip-frontend `technology-and-construction-court-kb-daily-cause-list`**

Verified to exist:
- View: `src/main/views/style-guide/technology-and-construction-court-kb-daily-cause-list.njk`
- Locales: `src/main/resources/locales/{en,cy}/technology-and-construction-court-kb-daily-cause-list.json`

Run the `migrate-pip-pages` skill during implementation; do not hand-write the markup or the copy.
The English **and Welsh** copy is complete in pip-frontend (see §2.5) — no `[TRANSLATE: ...]`
placeholders are needed anywhere in this ticket.

### 2.1 New lib package

```
libs/list-types/technology-and-construction-court-kb-daily-cause-list/
├── package.json                  # copy sibling's, change only "name"
├── tsconfig.json                 # copy sibling's verbatim
└── src/
    ├── config.ts                 # moduleRoot, assets — copy verbatim
    ├── index.ts                  # re-exports + side-effect converter import
    ├── conversion/
    │   ├── technology-and-construction-court-kb-daily-cause-list-config.ts
    │   └── technology-and-construction-court-kb-daily-cause-list-config.test.ts
    ├── rendering/
    │   ├── renderer.ts
    │   └── renderer.test.ts
    ├── pdf/
    │   ├── pdf-generator.ts
    │   ├── pdf-generator.test.ts
    │   └── pdf-template.njk      # + second important-information pair
    └── locales/
        ├── en.ts
        └── cy.ts
```

`package.json` dependencies (identical to sibling): `@hmcts/chd-kb-common`,
`@hmcts/list-types-common`, `@hmcts/pdf-generation`, `@hmcts/postgres-prisma`, `exceljs 4.4.0`,
`luxon 3.7.2`, `nunjucks 3.2.4`; devDeps `@types/luxon 3.7.4`, `@types/node 24.10.4`,
`typescript 6.0.3`, `vitest 4.1.10`; peerDep `express ^5.1.0`. **Keep the `build:nunjucks` script**
so `pdf-template.njk` is copied into `dist/pdf/`.

`src/index.ts`:

```typescript
import "./conversion/technology-and-construction-court-kb-daily-cause-list-config.js"; // Register converter on module load

// The hearing shape, schema, validator and email-summary logic live in @hmcts/chd-kb-common and are
// shared with Companies Winding Up (ChD). They are re-exported under this list type's own names so
// libs/publication's PDF registry, libs/notifications' email registry and the dynamic validator
// dispatcher all resolve them by this package's name.
export type {
  ChdKbHearing as TechnologyAndConstructionCourtKbHearing,
  ChdKbHearingList as TechnologyAndConstructionCourtKbHearingList
} from "@hmcts/chd-kb-common";
export {
  extractCaseSummary,
  formatCaseSummaryForEmail,
  SPECIAL_CATEGORY_DATA_WARNING,
  validateChdKbListType as validateTechnologyAndConstructionCourtKbDailyCauseList
} from "@hmcts/chd-kb-common";
export type { ValidationResult } from "@hmcts/publication";
export { cy as technologyAndConstructionCourtKbDailyCauseListCy } from "./locales/cy.js";
export { en as technologyAndConstructionCourtKbDailyCauseListEn } from "./locales/en.js";
export * from "./pdf/pdf-generator.js";
export * from "./rendering/renderer.js";
```

`src/conversion/technology-and-construction-court-kb-daily-cause-list-config.ts`:

```typescript
import { CHD_KB_EXCEL_CONFIG } from "@hmcts/chd-kb-common";
import { createConverter, registerConverterByName } from "@hmcts/list-types-common";

// Field definitions are shared via @hmcts/chd-kb-common. Registration under this list type's own
// DB name must stay here — the converter registry is keyed on the stable listTypeName.
export const TECHNOLOGY_AND_CONSTRUCTION_COURT_KB_EXCEL_CONFIG = CHD_KB_EXCEL_CONFIG;

registerConverterByName(
  "TECHNOLOGY_AND_CONSTRUCTION_COURT_KB_DAILY_CAUSE_LIST",
  createConverter(TECHNOLOGY_AND_CONSTRUCTION_COURT_KB_EXCEL_CONFIG)
);
```

`src/rendering/renderer.ts` — wraps the shared renderer, injecting this list's title:

```typescript
import { type ChdKbHearing, type ChdKbHearingList, renderChdKbHearingList } from "@hmcts/chd-kb-common";
import { cy } from "../locales/cy.js";
import { en } from "../locales/en.js";

export function renderTechnologyAndConstructionCourtKbDailyCauseList(
  hearingList: ChdKbHearingList,
  options: RenderOptions
): RenderedData {
  const t = options.locale === "cy" ? cy : en;
  return renderChdKbHearingList(hearingList, { ...options, listTitle: t.pageTitle });
}
```

(`RenderOptions` = `{ locale: string; contentDate: Date; lastReceivedDate: string }`,
`RenderedData` = `{ header: { listTitle, listDate, lastUpdatedDate, lastUpdatedTime }, hearings: ChdKbHearing[] }`
— types at the bottom of the file per CLAUDE.md module ordering.)

`src/pdf/pdf-generator.ts` — copy the sibling's verbatim, renaming the export to
`generateTechnologyAndConstructionCourtKbDailyCauseListPdf` and swapping the renderer import. It keeps
`BasePdfGenerationOptions<ChdKbHearingList> & { contentDate: Date }`, `configureNunjucks(__dirname)`,
`PDF_BASE_STYLES`, `loadTranslations`, `PROVENANCE_LABELS`, `generatePdfFromHtml`,
`savePdfToStorage` and `createPdfErrorResult`.

`src/pdf/pdf-template.njk` — copy the sibling's, and change the important-information block from:

```njk
<h3>{{ t.importantInformationHeading }}</h3>
<h4>{{ t.importantInformationHeading1 }}</h4>
<p>{{ t.importantInformationLine1 }}</p>
```

to add the second pair (`t.importantInformationHeading2` / `t.importantInformationLine2`).

### 2.2 New page

```
apps/web/src/pages/(list-types)/technology-and-construction-court-kb-daily-cause-list/
├── index.ts
├── technology-and-construction-court-kb-daily-cause-list.njk
├── index.test.ts
└── technology-and-construction-court-kb-daily-cause-list.njk.test.ts
```

`index.ts` uses `createSimpleListTypeHandler` from `../list-type-handler.js`:

```typescript
const SUPPORTED_LIST_TYPE = "TECHNOLOGY_AND_CONSTRUCTION_COURT_KB_DAILY_CAUSE_LIST";

export const GET = createSimpleListTypeHandler<TechnologyAndConstructionCourtKbHearingList>({
  en,
  cy,
  validate,
  logPrefix: "technology-and-construction-court-kb-daily-cause-list",
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
  render: ({ artefact, jsonData, locale, res }) => { /* as sibling */ }
});
```

`createSimpleListTypeHandler` already supplies: missing `artefactId` → 400, unknown artefact → 404,
`canAccessPublicationData` failure → 403 with `no-store`, missing blob → 404, schema failure → 400,
thrown error → 500. Do not reimplement these.

**Template** — copy `companies-winding-up-chd-daily-cause-list.njk`, changing only the
`govukDetails` html argument to render both heading/line pairs. Everything else stays byte-identical:
`{% extends "layouts/base-template.njk" %}`, `{% block page_content %}`, `govuk-grid-column-full`,
`<h1 class="govuk-heading-l" id="top">`, FaCT link paragraph, venue address block, list/last-updated
paragraphs, the `#case-search-input` + `#hearings-table-container` + `.hearings-table` trio that the
global `apps/web/src/assets/js/table-search.ts` auto-wires, seven `<th scope="col">`,
`{% for hearing in hearings %}` / `{% else %}` no-hearings paragraph, data-source line,
back-to-top anchor.

### 2.3 Registration touch-points (existing files to edit)

All eight confirmed present for the sibling by grep — mirror each one.

| # | File | Change |
|---|---|---|
| 1 | `libs/list-types/common/src/list-type-data.ts` | Add one `listTypeData` entry (below) |
| 2 | `libs/publication/src/processing/service.ts` | Import + `PDF_GENERATOR_REGISTRY` entry keyed on the name |
| 3 | `libs/notifications/src/notification/notification-service.ts` | Import + `EMAIL_BUILDER_REGISTRY` entry |
| 4 | `apps/web/src/pages/(admin)/non-strategic-upload/index.ts` | `import "@hmcts/technology-and-construction-court-kb-daily-cause-list";` side-effect (line ~9, alongside sibling) |
| 5 | `apps/web/src/pages/(admin)/non-strategic-upload-summary/index.ts` | Same side-effect import |
| 6 | `apps/web/src/app.ts` | Import `moduleRoot` from `.../config` and push into `modulePaths` for `configureGovuk` |
| 7 | `tsconfig.json` (root) | Two path aliases: package and `/config` |
| 8 | `apps/web/package.json`, `libs/publication/package.json`, `libs/notifications/package.json` | `"@hmcts/technology-and-construction-court-kb-daily-cause-list": "workspace:*"` |

`list-type-data.ts` entry — Welsh name is a **real translation** taken from pip-frontend, not a placeholder:

```typescript
{
  name: "TECHNOLOGY_AND_CONSTRUCTION_COURT_KB_DAILY_CAUSE_LIST",
  englishFriendlyName: "Technology and Construction Court (King's Bench Division) Daily Cause List",
  welshFriendlyName: "Rhestr Achosion Dyddiol Llys Technoleg ac Adeiladu (Adran Mainc y Brenin)",
  shortenedFriendlyName: "Technology and Construction Court (KB) Daily Cause List",
  provenance: "CFT_IDAM",
  urlPath: "technology-and-construction-court-kb-daily-cause-list",
  isNonStrategic: true,
  defaultSensitivity: "Public",
  subJurisdictionIds: [10]
}
```

`subJurisdictionIds: [10]` is `High Court` — the same value the sibling uses and the sub-jurisdiction
already attached to location 26, which is what makes the list type appear under Business and Property
Courts Rolls Building.

`PDF_GENERATOR_REGISTRY`:

```typescript
TECHNOLOGY_AND_CONSTRUCTION_COURT_KB_DAILY_CAUSE_LIST: (p) =>
  generateTechnologyAndConstructionCourtKbDailyCauseListPdf({
    ...p,
    jsonData: p.jsonData as TechnologyAndConstructionCourtKbHearingList
  }),
```

### 2.4 No changes needed (verified)

| Asset | Location | Status |
|---|---|---|
| JSON schema, 7 fields, correct patterns | `libs/list-types/chd-kb-common/src/schemas/chd-kb-common.json` | Exists — reused as-is (only `title` genericised) |
| `validateChdKbListType` | `chd-kb-common/src/validation/json-validator.ts` | Reused |
| `CHD_KB_EXCEL_CONFIG` | `chd-kb-common/src/conversion/chd-kb-excel-config.ts` | Reused |
| `ChdKbHearing` / `ChdKbHearingList` | `chd-kb-common/src/models/types.ts` | Reused via alias |
| `renderChdKbHearingList` | `chd-kb-common/src/rendering/renderer.ts` | Reused via wrapper |
| Email summary builder | `chd-kb-common/src/email-summary/summary-builder.ts` | Reused |
| Location 26 Rolls Building | `libs/location/src/location-data.ts:188` | **Already exists** — no location work |
| Table search JS | `apps/web/src/assets/js/table-search.ts` | Auto-wired by CSS class/id contract |
| `apps/web/vite.config.ts` | — | No change; module ships no `assets/` dir |
| Prisma schema / migrations | — | No change |

### 2.5 Content

Locale keys mirror the sibling, **plus** the second important-information pair. Both `en.ts` and
`cy.ts` are fully populated from the pip-frontend locale JSON — real Welsh, no placeholders.

New/changed keys versus the sibling:

| Key | English | Welsh |
|---|---|---|
| `pageTitle` | Technology and Construction Court (King's Bench Division) Daily Cause List | Rhestr Achosion Dyddiol Llys Technoleg ac Adeiladu (Adran Mainc y Brenin) |
| `importantInformationHeading1` | Remote hearings before a High Court Judge | Gwrandawiadau o bell gerbron Barnwr yr Uchel Lys |
| `importantInformationLine1` | MS Teams / media access, contact `tcc.listing@justice.gov.uk` (full text in pip-frontend JSON) | (full Welsh text in pip-frontend JSON) |
| `importantInformationHeading2` | Remote judgments | Dyfarniadau o bell |
| `importantInformationLine2` | Remote hand-down / National Archives, `press.enquiries@judiciary.uk` | (full Welsh text in pip-frontend JSON) |

Welsh `tableHeaders` from pip-frontend: `Barnwr`, `Amser`, `Leoliad`, `Math`, `Rhif yr achos`,
`Enw'r achos`, `Gwybodaeth ychwanegol`.

Unchanged from the sibling (copy verbatim, both locales): `factLinkText`, `factLinkUrl`,
`factAdditionalText`, `venueName`, `addressLine1`, `addressLine2`, `importantInformationHeading`,
`searchCasesTitle`, `searchCasesLabel`, English `tableHeaders`, `noHearingsMessage`, `dataSource`,
`backToTop`, `listFor`, `lastUpdated`, `at`, `cautionNote`, `cautionReporting`, `provenanceLabels`
(imported from `@hmcts/list-types-common`).

`venueName`, `addressLine1`, `addressLine2` and `factLinkUrl` stay in English in both locales —
matching both the sibling and the pip-frontend Welsh JSON, which also leaves the Rolls Building
address untranslated.

### 2.6 Excel style guide (the uploaded template)

Sheet 1, row 1 headers exactly as below (matched case-insensitively), data from row 2, ≥1 data row:

| Col | Header | Field | Required | Format |
|---|---|---|---|---|
| A | Judge | `judge` | Yes | Free text, no HTML |
| B | Time | `time` | Yes | `9am`, `10:30am`, `2.15pm` |
| C | Venue | `venue` | Yes | Free text, no HTML |
| D | Type | `type` | Yes | Free text, no HTML |
| E | Case Number | `caseNumber` | Yes | Free text, no HTML |
| F | Case Name | `caseName` | Yes | Free text, no HTML |
| G | Additional Information | `additionalInformation` | Yes | Free text, no HTML |

### 2.7 URLs

| Purpose | Path |
|---|---|
| Public list page | `/technology-and-construction-court-kb-daily-cause-list?artefactId=<uuid>` (GET only, auto-discovered; `(list-types)` adds no prefix) |
| Welsh | same + `&lng=cy` |
| PDF | `GET /pdf/:artefactId/download` — existing shared route, no new route |
| Inbound link | `/summary-of-publications?locationId=26`, built from `ListType.urlPath` |
| Admin upload | `/non-strategic-upload` → `/non-strategic-upload-summary` — existing pages, new dropdown option |

### 2.8 API endpoints / database

No new API endpoints. No Prisma model or column changes. No hand-written `.sql`.

---

## 3. Error Handling & Edge Cases

### Layer 1 — Excel → JSON (`CHD_KB_EXCEL_CONFIG`, `minRows: 1`)

| Rule | Applies to | On failure |
|---|---|---|
| Header row contains all 7 headers | Sheet 1 row 1 | File-level error naming the missing header |
| Cell not empty | All 7 fields | Row-numbered error |
| No HTML tags (`validateNoHtmlTags`) | All except `time` | Row-numbered error naming the field |
| Time matches `TIME_PATTERN` (`validateTimeFormatSimple`) | `time` | Row-numbered error |
| ≥1 data row | Sheet | File rejected |

### Layer 2 — JSON schema (`chd-kb-common.json`, draft-07)

Root `array`, items `object`, all seven fields `required`; six text fields carry
`^(?!(.|\r|\n)*<[^>]+>)(.|\r|\n)*$`; `time` carries `^\d{1,2}([:.]\d{2})?\s*[ap]m\s*$`.
Invoked twice — by the upload pipeline via `validateListTypeJson`, and again by the page handler
before rendering (defence against a corrupted blob).

### Layer 3 — page handler guards

| Condition | Result |
|---|---|
| Missing / non-string `artefactId` | 400 `errors/common` |
| Artefact not found | 404 `errors/common` |
| `canAccessPublicationData` false | 403 `errors/403`, `Cache-Control: no-store` |
| `listTypeName !== TECHNOLOGY_AND_CONSTRUCTION_COURT_KB_DAILY_CAUSE_LIST` | 400 `errors/common` |
| Blob missing | 404 `errors/common` |
| Schema invalid | 400 `errors/common` |
| Unexpected throw | 500 `errors/common` |

No numeric `listTypeId` comparison anywhere.

### Edge cases

- **Empty hearings array** — template renders the `noHearingsMessage` paragraph and no table.
- **Long free-text cells** — table scrolls horizontally via the shared responsive styles rather than truncating.
- **JS disabled** — the full table still renders; only client-side filtering is lost.
- **Apostrophe in the list title** — "King's Bench" contains a typographic apostrophe in the
  pip-frontend copy (`King’s`). Keep it consistent between `list-type-data.ts` `englishFriendlyName`
  and the locale `pageTitle`, or the two will render differently.
- **Converter registration timing** — the converter registers as a module side effect, so both admin
  pages need the bare import or upload will fail with "no converter for list type".

---

## 4. Acceptance Criteria Mapping

| AC | How satisfied | Verification |
|---|---|---|
| List created under Business and Property Courts Rolls Building | `listTypeData` entry with `subJurisdictionIds: [10]`, which is already linked to location 26 | Unit test asserts exactly one entry with this name, `urlPath` matches the page dir, `isNonStrategic: true`. Manually: `/non-strategic-upload`, pick the court, confirm the option appears in the dropdown |
| Fields in the listed order (Judge, Time, Venue, Type, Case Number, Case Name, Additional Information) | Shared `CHD_KB_EXCEL_CONFIG` field order + seven `<th>` in that order | Converter test asserts key order; template test asserts seven `th[scope="col"]` in order |
| Published through the Excel upload route as an Excel template | `registerConverterByName(...)` + side-effect imports on both admin pages | `hasConverterForListTypeName("TECHNOLOGY_AND_CONSTRUCTION_COURT_KB_DAILY_CAUSE_LIST")` is `true` after importing the package; manual upload of a 7-column `.xlsx` |
| Validation schema and style guide created | Schema reused from `chd-kb-common` (all 7 fields, patterns); style guide = the bilingual page migrated from pip-frontend | Existing `chd-kb-common` validator suite covers the schema; new page controller + template tests cover the style guide in both locales |
| PDF downloadable version created | `pdf-generator.ts` + `pdf-template.njk`, registered in `PDF_GENERATOR_REGISTRY` | PDF generator unit tests; `GET /pdf/:artefactId/download` returns the PDF after publication. **See Q1 — no visible on-page download link, matching the sibling** |

---

## 5. Test Scenarios

**Lib unit tests**
- Converter registration resolves for the new name. Field-level behaviour is already covered by
  `chd-kb-common`'s suite — do not duplicate it.
- Renderer: returns English `pageTitle` as `header.listTitle` for `locale: "en"` and the Welsh one for
  `"cy"`; formats `listDate` from `contentDate`; splits `lastReceivedDate` into
  `lastUpdatedDate`/`lastUpdatedTime`; passes hearings through without mutating the input.
- PDF generator: renders the template and calls `savePdfToStorage` on success; returns
  `{ success: false, error }` when `generatePdfFromHtml` fails; returns an error result rather than
  throwing when the renderer throws.
- Locale parity: `Object.keys(en).sort()` equals `Object.keys(cy).sort()`, and the same for nested
  `tableHeaders`.

**Page controller tests**
- Renders with `en`, `cy`, `t`, `title`, `header`, `hearings`, `dataSource` for a valid artefact.
- 400 + `errors/common` when `listTypeName` is a different list type — fixture uses
  `listTypeId: 999` to prove routing is ID-independent.
- 400 with no `artefactId`; 404 for missing artefact/blob; 403 on access denied; 400 on schema
  failure; 500 on unexpected throw.
- Welsh content selected when `res.locals.locale === "cy"`.
- Data-source label resolved from provenance via the locale `provenanceLabels`.

**Template tests** (`*.njk.test.ts`, Cheerio, isolated `createTestEnvironment`)
- `h1#top` contains the list title; venue name and both address lines render.
- **Both** important-information heading/line pairs render inside the details component.
- Exactly seven `th[scope="col"]` in the specified order; one `tbody tr` per hearing; cells map to the
  right fields.
- Empty hearings array → no-hearings paragraph and no table.
- `#case-search-input` has an associated `label[for]`; the table carries `hearings-table` inside
  `#hearings-table-container` (the contract the global search JS relies on).
- Rendering with the `cy` locale shows Welsh headings and table headers.
- Data-source line and back-to-top anchor present; anchor href matches the `h1` id.

**Registry integration**
- `PDF_GENERATOR_REGISTRY` and `EMAIL_BUILDER_REGISTRY` both resolve an entry for the new name.
- `validateListTypeJson` resolves a `validate*` export for a row named
  `TECHNOLOGY_AND_CONSTRUCTION_COURT_KB_DAILY_CAUSE_LIST` (confirms the alias is picked up and no
  `PACKAGE_ALIASES` entry is required).

**E2E**
- No new spec file. `e2e-tests/tests/admin/non-strategic-upload.spec.ts` already covers the upload
  journey end to end. Extend it only if this list type needs distinct coverage, and if so reuse the
  single existing journey test (validation, Welsh and axe checks inline). Select the list type by
  visible option text — do not add a hardcoded numeric `selectOption` value.

---

## 6. Accessibility

WCAG 2.2 AA. Structurally identical to the sibling, which already passes the axe checks in the E2E suite.

| Requirement | How met |
|---|---|
| Page title matches `<h1>` | `title: header.listTitle` passed to `res.render`; `<h1>` renders the same value |
| Heading hierarchy | `h1` list title → `h2` "Search Cases". The details summary is a `<summary>`, not a heading, so no level is skipped |
| Table semantics | `<table class="govuk-table hearings-table">` with `<thead>` and seven `<th scope="col">`; `aria-label="{{ t.pageTitle }}"` |
| Search input labelled | Real `<label class="govuk-label govuk-visually-hidden" for="case-search-input">`, not a placeholder |
| Page language | `lang` set to `en`/`cy` by the base layout so Welsh is pronounced correctly |
| Keyboard | Native focusable elements only; no custom widgets, no traps; tab order follows reading order |
| Progressive enhancement | Full table renders without JS; only filtering is lost |
| Contrast / colour | GOV.UK Frontend classes only; no custom colours; no status conveyed by colour alone |
| Reflow | `govuk-grid-column-full` + shared responsive table styles; horizontal scroll, not truncation |

Known pre-existing gap: `table-search.ts` hides rows with `style.display = "none"` and announces no
"N results" to screen readers. Shared across every list using the global search — out of scope here,
worth a separate accessibility ticket.

---

## 7. CLARIFICATIONS NEEDED

**Q1 (needs product answer before build) — Should the page show a visible "Download PDF" link?**
The AC says "A PDF downloadable version of the hearing list is created". The sibling
(Companies Winding Up (ChD)) generates the PDF into storage and serves it from the shared
`/pdf/:artefactId/download` route but renders **no visible link on the page**; only the SJP lists do.
This plan assumes parity with the sibling. If product wants a visible link, that is extra scope in
the template and both locale files.

**Q2 (assumption, low risk) — "Venue Type" in the AC is read as "Venue, Type" (two columns).**
The AC lists six fields; the shared schema has seven, with Venue and Type separate. Three independent
pieces of evidence support the seven-column reading: the pip-frontend TCC (KB) template has seven
`tableHeaders` with Venue and Type separate; the sibling list at the same court on the same schema
uses seven columns; and #803's AC was worded the same way. Proceeding with seven columns. If product
genuinely intends one combined "Venue Type" column, `chd-kb-common` cannot be reused and the estimate
roughly triples — flag before build.

**Q3 (assumption, verify in the environment) — Location reference data needs no change.**
Location 26 already exists in `location-data.ts` with `regions: [11]`, `subJurisdictions: [10]`. This
differs from #803, which had to create it. Confirm with `yarn db:seed` and a query against `location`
rather than assuming every environment is already seeded.

**Resolved during planning (no longer open):**
- The "Important information" copy — the #814 spec comment flagged this as a pre-launch blocker. It is
  **not** blocked: full English *and* Welsh copy exists in pip-frontend
  `src/main/resources/locales/{en,cy}/technology-and-construction-court-kb-daily-cause-list.json`,
  including two heading/body pairs and the Welsh list title and table headers. No `[TRANSLATE: ...]`
  placeholders are needed in this ticket.
